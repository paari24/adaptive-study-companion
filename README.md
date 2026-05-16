# Adaptive Study Companion

**PS 09** — AI-powered study assistant that detects struggling / bored / fatigued cognitive states from behavioral signals and adapts in real-time.

---

## Quick Start

### 1. Backend

```bash
cd backend
# Copy and fill in your keys
cp .env.example .env

# Activate venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Mac/Linux

# Start server
uvicorn main:app --reload --port 8000
```

### 2. PostgreSQL (for RAG)

```sql
CREATE DATABASE studycompanion;
\c studycompanion
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

```
frontend/
  engine/           ← State detection, adaptation, interaction monitor
  context/          ← LearningSessionContext (global reducer)
  components/       ← ContentPanel, ChatPanel, AssessmentModal, StateIndicator
  data/topics/      ← 3 pre-authored topic JSONs with full assessment pools

backend/
  routers/          ← /api/chat, /api/evaluate-answer, /api/topics
  services/         ← Claude API + pgvector RAG
  lib/prompts.py    ← State-adaptive system prompt builder
```

## Demo Tuning

`frontend/engine/stateDetector.ts` — `DEMO_MODE = true` lowers:
- State threshold: 60 → **30** (states trigger faster)
- Fatigue timer: 20 min → **5 min**
- Monitor interval: 30s → **10s**
- Score decay: 60s → **30s**

---

## Demo Script (Judges)

1. Pick **Photosynthesis** → read section 1 at normal pace → **Engaged**
2. Section 2 → answer wrong × 2, ask AI for help → **Struggling** (score bar hits 30)
3. Section 3 → answer everything correctly in <3s, don't use AI → **Bored**
4. Tab away for 15s → idle event fires, nudge appears in chat
5. Run through all sections → **Topic Summary** shows timeline + weak concepts

Key talking points:
- Every interaction produces a behavioral event with 17 data points
- Three independent scoring engines (struggle / boredom / fatigue) run simultaneously
- Adaptations are not cosmetic: difficulty, question count, AI tone, hints all change
- AI companion is RAG-grounded: cannot hallucinate outside the section
- Pure rule-based engine — transparent, debuggable, no ML required
