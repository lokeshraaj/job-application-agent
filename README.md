# AutoApply AI — Hindsight-Powered Career Agent

An AI-powered career automation platform for experienced software engineers. It learns from your edits, tailors every resume to match job descriptions, and writes cold-email pitches that land interviews — improving with every interaction.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-orange)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase)
![Hindsight](https://img.shields.io/badge/Vectorize-Hindsight_Memory-blue)

---

## Features

### 🧠 Hindsight Memory (Agentic Learning)
- Every time you edit a pitch or resume, the agent **learns your style preferences** via [Vectorize Hindsight](https://hindsight.vectorize.io)
- Memories are recalled and injected into future Groq prompts, so the AI gets smarter over time
- Real-time **Agent Memory Log** panel shows what the agent has learned

### 📄 Dynamic Resume Tailoring
- When you click "Quick Apply," the backend generates a **JD-tailored resume** alongside the pitch
- Bullet points are rewritten to mirror the exact vocabulary of the target job description
- Skills are re-ordered by relevance; achievements are reframed with quantifiable metrics
- Edit the resume → the agent learns your bullet-point phrasing preferences

### ✉️ AI-Generated Cold Email Pitches
- Groq (Llama 3.3 70B) generates personalized cold-email pitches
- Memory-enhanced: pitches incorporate learned tone, length, and format preferences
- A/B testing loop: when a pitch leads to an interview, the agent memorizes the winning format

### 📊 Kanban Application Tracker
- Drag-and-drop Kanban board to track application status
- Status transitions trigger Hindsight learning (e.g., "Interview Scheduled" = high-weight success signal)

### 🔐 Firebase Authentication
- Google SSO (one-click sign-in)
- Email/Password with confirm-password validation
- Unified login/signup page with "Space-Glass" design

### 📈 Resume Analyzer
- Upload PDF/DOCX resumes for AI-powered evaluation
- ATS score, format score, keyword match, and business impact breakdown
- Strengths and improvement suggestions

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Lucide Icons |
| **Backend** | FastAPI, SQLAlchemy, SQLite, Python 3.14 |
| **AI** | Groq Cloud (Llama 3.3 70B Versatile) |
| **Memory** | Vectorize Hindsight (agentic memory SDK) |
| **Auth** | Firebase Authentication (Google SSO + Email) |
| **Analytics** | PostHog, Vercel Analytics |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- [Groq API Key](https://console.groq.com)
- [Vectorize Hindsight API Key](https://hindsight.vectorize.io)
- [Firebase Project](https://console.firebase.google.com) (for auth)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your actual API keys

# Run the server
python -m uvicorn main:app --reload --port 8080
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure Firebase
# Create .env.local with your Firebase keys:
# NEXT_PUBLIC_FIREBASE_API_KEY=...
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# NEXT_PUBLIC_FIREBASE_APP_ID=...

# Run the dev server
npm run dev
```

### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable **Authentication** → Sign-in method → Enable **Google** and **Email/Password**
4. Go to Project Settings → General → Your apps → Web app → Copy config keys
5. Add keys to `frontend/.env.local`

---

## Project Structure

```
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── models.py               # SQLAlchemy models (User, Resume, Job, Application)
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── database.py             # SQLite database connection
│   ├── routers/
│   │   ├── apply.py            # Application + pitch + resume endpoints
│   │   ├── auth.py             # Login, signup, Firebase verify
│   │   ├── hindsight.py        # Memory log + preferences endpoints
│   │   ├── jobs.py             # Job listings CRUD
│   │   └── resumes.py          # Resume upload + parsing
│   └── services/
│       ├── ai_service.py       # Groq integration (pitch + resume generation)
│       └── hindsight_service.py # Vectorize Hindsight SDK (retain + recall)
│
├── frontend/
│   ├── src/app/
│   │   ├── login/page.tsx      # Unified auth (Google SSO + Email)
│   │   ├── dashboard/page.tsx  # Overview dashboard
│   │   ├── resume-analyzer/    # Resume upload + AI analysis
│   │   ├── job-matches/        # Job listings with Quick Apply
│   │   └── tracker/page.tsx    # Kanban board + tabbed Pitch/Resume modal
│   ├── src/components/
│   │   └── Sidebar.tsx         # Navigation with sign-out
│   └── src/lib/
│       ├── api.ts              # Axios API client
│       └── firebase.ts         # Firebase config (graceful fallback)
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register new user |
| `POST` | `/api/auth/login` | Email/password login |
| `POST` | `/api/auth/verify` | Firebase token sync |
| `POST` | `/api/resumes/upload` | Upload + AI-parse resume |
| `GET` | `/api/jobs` | List job matches |
| `POST` | `/api/apply` | Quick apply (generates match score) |
| `POST` | `/api/apply/{id}/pitch` | Generate pitch + tailored resume |
| `PUT` | `/api/apply/{id}/edit-pitch` | Save pitch edit → Hindsight learns |
| `PUT` | `/api/apply/{id}/edit-resume` | Save resume edit → Hindsight learns |
| `PATCH` | `/api/apply/{id}` | Update Kanban status |
| `GET` | `/api/hindsight/memory-log/{id}` | Get agent memory log |

---

## How the Learning Loop Works

```
User edits pitch/resume
        ↓
Frontend saves edit via API
        ↓
Backend computes diff (difflib)
        ↓
Hindsight retains the preference
  (e.g., "User prefers cost-saving metrics")
        ↓
Next pitch/resume generation:
  → recall_preferences() pulls memories
  → Injected into Groq system prompt
  → AI applies learned style automatically
```

---

## License

MIT

---

Built with Groq, Vectorize Hindsight, Firebase, and Next.js.
