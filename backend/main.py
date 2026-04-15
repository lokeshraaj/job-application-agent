import os
import json
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from hindsight_client import Hindsight
import groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AutoApply AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration from env
HINDSIGHT_URL = os.getenv("HINDSIGHT_URL", "http://localhost:8888")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Initialize clients
try:
    hs_client = Hindsight(base_url=HINDSIGHT_URL)
except Exception as e:
    print(f"Failed to initialize Hindsight client: {e}")
    hs_client = None

if GROQ_API_KEY:
    groq_client = groq.Groq(api_key=GROQ_API_KEY)
else:
    groq_client = None

BANK_ID = "autoapply-bank"

try:
    if hs_client:
        hs_client.create_bank(
            bank_id=BANK_ID,
            name="AutoApply AI",
            mission="You are an autonomous agent tracking job applications and cold emails to HRs. You must remember who we have contacted, for what role, and at what company.",
        )
except Exception as e:
    print(f"Error creating bank (maybe it already exists): {e}")

class ApplicationRequest(BaseModel):
    candidateName: str
    targetRole: str
    companyName: str
    hrName: str
    jobDescription: str
    resumeText: str

class ApplicationResponse(BaseModel):
    status: str
    message: str
    emailBody: str = ""

@app.post("/api/apply", response_model=ApplicationResponse)
async def apply_for_job(req: ApplicationRequest):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API key not configured.")
    if not hs_client:
         raise HTTPException(status_code=500, detail="Hindsight Engine not configured.")

    # 1. Memory Check
    query = f"Have I already contacted {req.hrName} at {req.companyName} for the {req.targetRole} role or a similar role?"
    try:
        recall_results = hs_client.recall(
            bank_id=BANK_ID,
            query=query,
            types=["world", "experience", "observation"]
        )
        
        memory_context = ""
        # Handle the structure of recall_results
        try:
            if hasattr(recall_results, 'results'):
                items = recall_results.results
            elif hasattr(recall_results, 'data'):
                items = recall_results.data
            elif isinstance(recall_results, list):
                items = recall_results
            else:
                items = []

            for r in items:
                text_content = ""
                if hasattr(r, 'text'):
                    text_content = r.text
                elif hasattr(r, 'content'):
                    text_content = r.content
                elif isinstance(r, dict) and 'text' in r:
                    text_content = r['text']
                elif isinstance(r, str):
                    text_content = r
                
                if text_content:
                    memory_context += text_content + "\n"
        except Exception as e:
             print("Could not parse recall results directly:", e)

        if memory_context.strip():
            # Let LLM decide if we contacted them based on memory context
            evaluation_prompt = f"""
Given the following context from your memory bank about past interactions (which might be empty):
<memory>
{memory_context}
</memory>

Question: Based strictly on the context above, have we ALREADY sent an application/contacted {req.hrName} at {req.companyName} for the '{req.targetRole}' position or a similar role?
Return a JSON object with exactly one boolean property `contacted`: true or false. If the memory provides no evidence of contact, return false.
"""
            eval_resp = groq_client.chat.completions.create(
                model="qwen/qwen3-32b",
                messages=[{"role": "user", "content": evaluation_prompt}],
                response_format={"type": "json_object"}
            )
            
            eval_json = json.loads(eval_resp.choices[0].message.content)
            if eval_json.get("contacted") is True:
                return ApplicationResponse(
                    status="skipped", 
                    message=f"Agent memory indicates we already contacted {req.hrName} at {req.companyName} for a similar role.",
                    emailBody=""
                )
            
    except Exception as e:
        print(f"Error in memory check: {e}")

    # 2. Email Generation
    try:
        sys_prompt = "You are an expert cold-email copywriter. Generate a brief, highly personalized, and professional cold email to the HR representative. Be direct and avoid generic templates. Do not include subject lines, just the body."
        user_prompt = f"""
Candidate Name: {req.candidateName}
Resume Summary: {req.resumeText}

Target Role: {req.targetRole}
Company Name: {req.companyName}
HR Name: {req.hrName}

Job Description:
{req.jobDescription}

Generate the email body now:
"""
        email_resp = groq_client.chat.completions.create(
            model="qwen/qwen3-32b",
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        email_body = email_resp.choices[0].message.content.strip()
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Email generation failed: {e}")

    # 3. Action Execution
    print("-" * 40)
    print(f"SENDING EMAIL TO {req.hrName} @ {req.companyName}")
    print(email_body)
    print("-" * 40)

    # 4. Learning/Updating Memory
    try:
        content_log = f"Contacted HR {req.hrName} at {req.companyName} regarding the '{req.targetRole}' position for candidate {req.candidateName}. Action: Sent cold email. Outcome: Sent successfully."
        hs_client.retain(
            bank_id=BANK_ID,
            content=content_log,
            context="Job Application Cold Email",
        )
    except Exception as e:
         print(f"Error storing memory: {e}")

    return ApplicationResponse(
        status="sent",
        message="Email successfully generated and sent.",
        emailBody=email_body
    )

@app.get("/api/logs")
async def get_logs():
    if not hs_client:
        return {"logs": []}
    try:
        mems = hs_client.list_memories(bank_id=BANK_ID, limit=100)
        
        items = []
        if hasattr(mems, 'results'):
            items = mems.results
        elif hasattr(mems, 'data'):
             items = mems.data
        elif isinstance(mems, list):
             items = mems
             
        log_list = []
        for memory in items:
            
            # Safe property access
            mem_id = getattr(memory, 'id', str(getattr(memory, '_id', '')))
            
            text = ""
            if hasattr(memory, 'text'): text = memory.text
            elif hasattr(memory, 'content'): text = memory.content
            
            mem_type = getattr(memory, 'type', 'general')

            log_list.append({
                "id": mem_id,
                "content": text,
                "type": mem_type,
            })
        return {"logs": log_list}
    except Exception as e:
        print("Error getting logs", e)
        return {"logs": []}
