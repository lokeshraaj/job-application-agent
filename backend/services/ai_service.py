import os
import json
import logging
from groq import Groq
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "mock_key_for_testing":
        return None
    return Groq(api_key=api_key)

def analyze_resume(text: str) -> str:
    """
    Prompts Groq to extract structured data (skills, experience, summary) from the resume.
    Returns JSON formatted string.
    """
    client = get_groq_client()
    if not client:
        raise ValueError("GROQ_API_KEY missing from environment variables.")

    messages = [
        {
            "role": "system",
            "content": "You are a brutally honest Senior Technical Recruiter evaluating a resume. Extract exact information and evaluate strictly. Deduct points heavily for: 1. Lack of quantifiable metrics. 2. Missing core technologies. 3. Poorly structured summaries. Also analyze for 'Good' traits (e.g. Action Verbs, Tech Stack Depth) and 'Bad' traits (e.g. Vague bullet points, Missing Contact Info, Weak Summary). Output ONLY valid JSON following this schema: {\"skills\": [], \"experience_years\": int, \"professional_summary\": \"string\", \"format_score\": int (0-100), \"keyword_score\": int (0-100), \"impact_score\": int (0-100), \"total_ats_score\": int (0-100), \"strengths\": [\"strings\"], \"improvements\": [\"strings\"]}. Do not write Markdown wrappers like ```json"
        },
        {
            "role": "user",
            "content": f"Analyze the following resume text and provide the structured JSON Output:\n\n{text[:5000]}"
        }
    ]
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        
        # Enforce strict schema bounds so frontend React doesn't crash on undefined
        if not isinstance(data.get("skills"), list):
            data["skills"] = []
        if not isinstance(data.get("experience_years"), (int, float)):
            data["experience_years"] = 0
        if not isinstance(data.get("professional_summary"), str):
            data["professional_summary"] = "Summary unavailable due to LLM format error."
        if not isinstance(data.get("format_score"), (int, float)):
            data["format_score"] = 0
        if not isinstance(data.get("keyword_score"), (int, float)):
            data["keyword_score"] = 0
        if not isinstance(data.get("impact_score"), (int, float)):
            data["impact_score"] = 0
        if not isinstance(data.get("total_ats_score"), (int, float)):
            data["total_ats_score"] = data.get("ats_score", 0)
        if not isinstance(data.get("strengths"), list):
            data["strengths"] = []
        if not isinstance(data.get("improvements"), list):
            data["improvements"] = []
        
        # Ensure backward compatibility with existing ats_score reference
        data["ats_score"] = data["total_ats_score"]
            
        return json.dumps(data)
        
    except json.JSONDecodeError:
        print("Groq JSON parsing failed.")
        return json.dumps({"skills": [], "experience_years": 0, "professional_summary": "LLM failed to return a correct JSON structure.", "format_score": 0, "keyword_score": 0, "impact_score": 0, "total_ats_score": 0, "strengths": [], "improvements": [], "ats_score": 0})
    except Exception as e:
        print(f"Groq API Error in analyze_resume: {str(e)}")
        raise ValueError(f"Groq API connection or processing error: {str(e)}")

def generate_match_score(resume_text: str, job_description: str) -> dict:
    """
    Calculates an ATS score out of 100 and returns 3 suggestions for improvement.
    """
    client = get_groq_client()
    if not client:
        return {"ats_score": 0, "suggestions": ["Provide GROQ_API_KEY in backend .env to enable the agent."]}

    logger.info("Generating match score for resume")

    messages = [
        {
            "role": "system",
            "content": "You are a senior technical recruiter matching a resume against a job description. Return your analysis as a JSON object with strictly these keys: {\"ats_score\": number_0_to_100, \"suggestions\": [\"suggestion 1\", \"suggestion 2\", \"suggestion 3\"]}. Do not wrap the JSON in Markdown."
        },
        {
            "role": "user",
            "content": f"JOB DESCRIPTION:\n{job_description[:2000]}\n\nRESUME:\n{resume_text[:5000]}"
        }
    ]

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        
        # Enforce schema bounds
        if not isinstance(data.get("ats_score"), (int, float)):
            data["ats_score"] = 0
        if not isinstance(data.get("suggestions"), list):
            data["suggestions"] = ["Make sure your resume matches the job description closer."]
            
        return data
    except Exception as e:
        logger.warning(f"Groq API Error / 500 error in generate_match_score: {str(e)}")
        return {"ats_score": 0, "suggestions": ["Error connecting to AI service."]}

def generate_pitch(resume_text: str, job_description: str) -> str:
    """
    Acts as an expert recruiter to generate a cold email / pitch under 150 words.
    """
    client = get_groq_client()
    if not client:
        return "Configure GROQ_API_KEY in the backend to enable AI Pitch generation."
        
    logger.info("Generating AI Outreach Pitch")

    messages = [
        {
            "role": "system",
            "content": "You are an elite Silicon Valley recruiter software. Your sole purpose is to write a highly persuasive, concise cold email or pitch (under 150 words) from the candidate to the hiring manager. Blend the candidate's skills with the job requirements. Keep it professional, punchy, and confident. Do NOT use placeholders like [Insert Date], use the best available information."
        },
        {
            "role": "user",
            "content": f"JOB DESCRIPTION:\n{job_description[:2000]}\n\nRESUME:\n{resume_text[:5000]}\n\nWrite the pitch:"
        }
    ]

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.warning(f"Groq API Error/500 code in generate_pitch: {str(e)}")
        return "We encountered an error generating the pitch. Please try again."
