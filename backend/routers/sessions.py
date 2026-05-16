"""
Session analytics router.
POST /api/sessions/save  — persist a completed session to postgres
GET  /api/sessions       — return all recorded sessions (newest first)
"""
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Optional
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

_engine = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(os.getenv("DATABASE_URL"), pool_pre_ping=True)
    return _engine


def ensure_table():
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                topic_title TEXT NOT NULL,
                started_at TIMESTAMPTZ NOT NULL,
                completed_at TIMESTAMPTZ NOT NULL,
                total_sections INT NOT NULL,
                completed_sections INT NOT NULL,
                overall_score FLOAT NOT NULL,
                peak_struggle INT NOT NULL,
                peak_boredom INT NOT NULL,
                peak_fatigue INT NOT NULL,
                final_state TEXT NOT NULL,
                total_time_ms BIGINT NOT NULL,
                state_history JSONB NOT NULL DEFAULT '[]',
                section_results JSONB NOT NULL DEFAULT '[]',
                event_summary JSONB NOT NULL DEFAULT '{}'
            )
        """))
        conn.commit()


# Run on import
try:
    ensure_table()
except Exception as e:
    print(f"[Sessions] Warning: Could not create user_sessions table: {e}")


# ─── Request / Response models ────────────────────────────────────────────────

class SectionResultPayload(BaseModel):
    sectionId: str
    sectionTitle: str
    score: float
    totalQuestions: int
    timeSpentMs: int
    peakStruggleScore: int
    peakBoredomScore: int
    peakFatigueScore: int

class StateSnapshotPayload(BaseModel):
    state: str
    timestamp: int
    scores: dict[str, Any]

class SaveSessionRequest(BaseModel):
    sessionId: Optional[str] = None  # if provided, upsert instead of insert
    topicId: str
    topicTitle: str
    sessionStartTime: int          # epoch ms
    totalTimeSpentMs: int
    completedSections: list[str]
    totalSections: int
    sectionResults: list[SectionResultPayload]
    stateHistory: list[StateSnapshotPayload]
    finalState: str
    peakStruggle: int
    peakBoredom: int
    peakFatigue: int
    overallScore: float            # 0-100
    userMobile: Optional[str] = None

class SaveSessionResponse(BaseModel):
    sessionId: str
    message: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/sessions/save", response_model=SaveSessionResponse)
def save_session(req: SaveSessionRequest):
    session_id = req.sessionId or str(uuid.uuid4())
    started_at = datetime.fromtimestamp(req.sessionStartTime / 1000, tz=timezone.utc)
    completed_at = datetime.now(tz=timezone.utc)

    event_summary = {
        "stateTransitions": len(req.stateHistory),
        "sectionsCompleted": len(req.completedSections),
        "averageScore": req.overallScore,
    }

    try:
        engine = get_engine()
        with engine.connect() as conn:
            # Verify user_mobile exists — if not, save without it to avoid FK violation
            user_mobile = req.userMobile
            if user_mobile:
                exists = conn.execute(
                    text("SELECT 1 FROM users WHERE mobile = :m"), {"m": user_mobile}
                ).fetchone()
                if not exists:
                    user_mobile = None

            conn.execute(text("""
                INSERT INTO user_sessions (
                    id, topic_id, topic_title, started_at, completed_at,
                    total_sections, completed_sections, overall_score,
                    peak_struggle, peak_boredom, peak_fatigue, final_state,
                    total_time_ms, state_history, section_results, event_summary,
                    user_mobile
                ) VALUES (
                    :id, :topic_id, :topic_title, :started_at, :completed_at,
                    :total_sections, :completed_sections, :overall_score,
                    :peak_struggle, :peak_boredom, :peak_fatigue, :final_state,
                    :total_time_ms,
                    CAST(:state_history AS jsonb),
                    CAST(:section_results AS jsonb),
                    CAST(:event_summary AS jsonb),
                    :user_mobile
                )
                ON CONFLICT (id) DO UPDATE SET
                    completed_at      = EXCLUDED.completed_at,
                    completed_sections= EXCLUDED.completed_sections,
                    overall_score     = EXCLUDED.overall_score,
                    peak_struggle     = EXCLUDED.peak_struggle,
                    peak_boredom      = EXCLUDED.peak_boredom,
                    peak_fatigue      = EXCLUDED.peak_fatigue,
                    final_state       = EXCLUDED.final_state,
                    total_time_ms     = EXCLUDED.total_time_ms,
                    state_history     = EXCLUDED.state_history,
                    section_results   = EXCLUDED.section_results,
                    event_summary     = EXCLUDED.event_summary,
                    user_mobile       = EXCLUDED.user_mobile
            """), {
                "id": session_id,
                "topic_id": req.topicId,
                "topic_title": req.topicTitle,
                "started_at": started_at,
                "completed_at": completed_at,
                "total_sections": req.totalSections,
                "completed_sections": len(req.completedSections),
                "overall_score": req.overallScore,
                "peak_struggle": req.peakStruggle,
                "peak_boredom": req.peakBoredom,
                "peak_fatigue": req.peakFatigue,
                "final_state": req.finalState,
                "total_time_ms": req.totalTimeSpentMs,
                "state_history": json.dumps([s.model_dump() for s in req.stateHistory]),
                "section_results": json.dumps([r.model_dump() for r in req.sectionResults]),
                "event_summary": json.dumps(event_summary),
                "user_mobile": user_mobile,
            })
            conn.commit()
        return SaveSessionResponse(sessionId=session_id, message="Session saved")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
def list_sessions(limit: int = 100):
    try:
        engine = get_engine()
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT s.id, s.topic_id, s.topic_title, s.started_at, s.completed_at,
                       s.total_sections, s.completed_sections, s.overall_score,
                       s.peak_struggle, s.peak_boredom, s.peak_fatigue, s.final_state,
                       s.total_time_ms, s.user_mobile, u.name
                FROM user_sessions s
                LEFT JOIN users u ON u.mobile = s.user_mobile
                ORDER BY s.completed_at DESC
                LIMIT :limit
            """), {"limit": limit}).fetchall()

        sessions = []
        for r in rows:
            sessions.append({
                "id": r[0],
                "topicId": r[1],
                "topicTitle": r[2],
                "startedAt": r[3].isoformat() if r[3] else None,
                "completedAt": r[4].isoformat() if r[4] else None,
                "totalSections": r[5],
                "completedSections": r[6],
                "overallScore": round(r[7], 1),
                "peakStruggle": r[8],
                "peakBoredom": r[9],
                "peakFatigue": r[10],
                "finalState": r[11],
                "totalTimeMs": r[12],
                "userMobile": r[13],
                "userName": r[14],
            })
        return {"sessions": sessions, "count": len(sessions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
