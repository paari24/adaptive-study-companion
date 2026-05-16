# Adaptive Study Companion

**Hackathon PS 09** — An AI-powered learning platform that detects student cognitive states (struggling, bored, fatigued) from real-time behavioural signals and adapts the experience accordingly. Includes a teacher analytics dashboard.

---

## What It Does

| Feature | Description |
|---|---|
| **Behavioural Engine** | Tracks Struggle / Boredom / Fatigue scores (0–100) from interaction signals |
| **Adaptive AI Tutor** | Changes tone and depth based on detected state — simpler when fatigued, Socratic when bored |
| **Section Assessments** | AI-graded MCQ + free-text quizzes after every section, with gibberish detection |
| **Auto-Save Sessions** | Session data saved to PostgreSQL after every completed section (not just at the end) |
| **Teacher Dashboard** | Per-student analytics — session history, behavioural peaks, final state, scores |
| **User Identity** | Students register with name + mobile; all sessions linked and tracked |
| **RAG-Powered Context** | Topic content embedded in pgvector for semantically grounded AI responses |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL with `pgvector` extension enabled
- Anthropic API key

### 1. Backend

```bash
cd backend

# Copy and fill in your keys
cp .env.example .env
# Set DATABASE_URL and ANTHROPIC_API_KEY in .env

# Create and activate virtualenv
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Mac/Linux

pip install -r requirements.txt

# Embed topic content into pgvector (run once)
python init_rag.py

# Start server
uvicorn main:app --reload --port 8000
```

### 2. Database Setup

```sql
-- Run in your PostgreSQL instance
CREATE DATABASE studycompanion;
\c studycompanion
CREATE EXTENSION IF NOT EXISTS vector;
```

Tables are created automatically on first startup:
- `users` — student identity (mobile as primary key)
- `user_sessions` — session records with JSONB behavioural history
- `section_embeddings` — pgvector RAG store

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** The frontend proxies `/api/*` to `http://localhost:8000` via Next.js rewrites — no CORS config needed for local dev.

---

## Architecture

```
frontend/
  app/
    page.tsx              ← Home — topic picker, user identity gate
    dashboard/page.tsx    ← Teacher analytics dashboard
    learn/[topicId]/      ← Learning session layout
  components/
    ContentPanel.tsx      ← Section reading UI, navigation, fatigue/boredom gate
    ChatPanel.tsx         ← AI tutor chat with nudge rendering
    AssessmentPanel.tsx   ← Quiz modal (MCQ + free-text)
    TopicSummary.tsx      ← Completion screen, session save
    UserIdentityModal.tsx ← Name + mobile registration gate
    StateIndicator.tsx    ← Real-time S/B/F score display
  context/
    LearningSessionContext.tsx  ← Global reducer, auto-save effect, chat logic
  engine/
    stateDetector.ts      ← Scoring functions: processEvent, decayScores, resolveState
    interactionMonitor.ts ← Idle detection, nudge triggers, activity buffer
    types.ts              ← All shared TypeScript types
  data/topics/            ← JSON topic files (photosynthesis, electric-circuits, acids-and-bases)

backend/
  main.py                 ← FastAPI app, CORS, router registration
  routers/
    assess.py             ← GET /api/topics, POST /api/evaluate-answer
    chat.py               ← POST /api/chat
    sessions.py           ← POST /api/sessions/save (upsert), GET /api/sessions
    users.py              ← POST /api/users/register, GET /api/users, GET /api/users/{mobile}
  services/
    claude_service.py     ← Anthropic API wrapper (chat + evaluate)
    rag_service.py        ← pgvector embed + semantic search
  lib/
    prompts.py            ← State-adaptive system prompt builder, evaluation prompt
  models/
    schemas.py            ← Pydantic request/response models
```

---

## Behavioural Engine

Three independent scores run in parallel:

| Score | Signals that increase it | Signals that reduce it |
|---|---|---|
| **Struggle** | Wrong answers, retries, AI help requests, slow response trend | Correct answers, consecutive correct streak |
| **Boredom** | Rapid correct answers (<3s), no AI interaction, quick scrolling | Asking AI questions, long thoughtful answers |
| **Fatigue** | Idle periods (>60s grace), long session duration, declining accuracy | Completing assessments, asking AI questions |

**State resolution** (first match wins):
```
fatigueScore >= 30  →  fatigued
struggleScore >= 30 →  struggling
boredomScore >= 30  →  bored
else                →  engaged
```

Scores decay by **−2 every 30 seconds**. Session fatigue adds **+1/tick** after 5 minutes of study.

---

## AI Adaptation by State

| State | AI Behaviour |
|---|---|
| **Engaged** | Clear, detailed explanations with examples |
| **Struggling** | Simpler language, everyday analogies, warm tone, step-by-step |
| **Bored** | Socratic questions, advanced applications, no easy answers |
| **Fatigued** | Max 3 sentences, most important point only, break suggestion |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/topics` | List all available topics |
| `GET` | `/api/topics/{id}` | Full topic JSON with sections + questions |
| `POST` | `/api/chat` | AI tutor response (state-aware) |
| `POST` | `/api/evaluate-answer` | Grade a student's free-text or MCQ answer |
| `POST` | `/api/sessions/save` | Upsert session record (called after each section) |
| `GET` | `/api/sessions` | All sessions with user info |
| `POST` | `/api/users/register` | Register / update student by mobile |
| `GET` | `/api/users` | All users with aggregate stats |
| `GET` | `/api/users/{mobile}` | Single user + full session history |

---

## Demo Mode

`frontend/engine/stateDetector.ts` — `DEMO_MODE = true` speeds everything up for presentations:

| Setting | Normal | Demo |
|---|---|---|
| State threshold | 60 | **30** |
| Fatigue timer start | 20 min | **5 min** |
| Monitor interval | 30s | **10s** |
| Score decay | 60s | **30s** |
| Idle grace period | 100s | **60s** |

---

## Demo Script (Judges)

1. **Register** — Enter name + mobile on the home page
2. **Pick Photosynthesis** → Read section 1 → state shows **Engaged**
3. **Section 2** → Answer wrong ×2, then ask AI for help → state flips to **Struggling**
4. **Section 3** → Answer everything in <3s without AI → state flips to **Bored**
5. **Go idle** for 60s → "Are you there? 👋" nudge appears in chat
6. **Complete all sections** → Topic Summary screen shows timeline + weak concepts
7. **Open `/dashboard`** → See session recorded with full behavioural breakdown

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, React Markdown
- **Backend:** FastAPI, SQLAlchemy, Pydantic
- **Database:** PostgreSQL + pgvector
- **AI:** Claude claude-sonnet-4-20250514 (Anthropic) — chat + answer evaluation
- **Session persistence:** localStorage (resume mid-topic on refresh) + PostgreSQL (analytics)
