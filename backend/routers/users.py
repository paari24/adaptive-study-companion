"""
User identity router.
POST /api/users/register  — upsert user by mobile number
GET  /api/users           — all users with aggregate stats
GET  /api/users/{mobile}  — single user + their full session history
"""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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


def ensure_tables():
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                mobile     TEXT PRIMARY KEY,
                name       TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))
        conn.execute(text("""
            ALTER TABLE user_sessions
            ADD COLUMN IF NOT EXISTS user_mobile TEXT REFERENCES users(mobile)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS user_sessions_mobile_idx
            ON user_sessions (user_mobile)
        """))
        conn.commit()


try:
    ensure_tables()
except Exception as e:
    print(f"[Users] Warning: Could not set up users table: {e}")


# ─── Models ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    mobile: str  # treated as string to preserve leading zeros / intl format


class UserResponse(BaseModel):
    mobile: str
    name: str
    createdAt: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/users/register", response_model=UserResponse)
def register_user(req: RegisterRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not req.mobile.strip():
        raise HTTPException(status_code=400, detail="Mobile is required")

    engine = get_engine()
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO users (mobile, name, created_at)
                VALUES (:mobile, :name, now())
                ON CONFLICT (mobile) DO UPDATE SET name = EXCLUDED.name
            """), {"mobile": req.mobile.strip(), "name": req.name.strip()})
            conn.commit()

            row = conn.execute(
                text("SELECT mobile, name, created_at FROM users WHERE mobile = :mobile"),
                {"mobile": req.mobile.strip()}
            ).fetchone()

        return UserResponse(
            mobile=row[0],
            name=row[1],
            createdAt=row[2].isoformat() if row[2] else "",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users")
def list_users():
    engine = get_engine()
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT
                    u.mobile,
                    u.name,
                    u.created_at,
                    COUNT(s.id)                          AS session_count,
                    COALESCE(AVG(s.overall_score), 0)    AS avg_score,
                    COALESCE(MAX(s.peak_fatigue), 0)     AS max_fatigue,
                    COALESCE(MAX(s.peak_struggle), 0)    AS max_struggle,
                    COALESCE(MAX(s.peak_boredom), 0)     AS max_boredom,
                    MAX(s.completed_at)                  AS last_active
                FROM users u
                LEFT JOIN user_sessions s ON s.user_mobile = u.mobile
                GROUP BY u.mobile, u.name, u.created_at
                ORDER BY last_active DESC NULLS LAST
            """)).fetchall()

        return {
            "users": [
                {
                    "mobile": r[0],
                    "name": r[1],
                    "createdAt": r[2].isoformat() if r[2] else None,
                    "sessionCount": r[3],
                    "avgScore": round(float(r[4]), 1),
                    "maxFatigue": r[5],
                    "maxStruggle": r[6],
                    "maxBoredom": r[7],
                    "lastActive": r[8].isoformat() if r[8] else None,
                }
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/{mobile}")
def get_user(mobile: str):
    engine = get_engine()
    try:
        with engine.connect() as conn:
            user = conn.execute(
                text("SELECT mobile, name, created_at FROM users WHERE mobile = :mobile"),
                {"mobile": mobile}
            ).fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            sessions = conn.execute(text("""
                SELECT
                    id, topic_id, topic_title, completed_at,
                    total_sections, completed_sections, overall_score,
                    peak_struggle, peak_boredom, peak_fatigue,
                    final_state, total_time_ms, section_results, state_history
                FROM user_sessions
                WHERE user_mobile = :mobile
                ORDER BY completed_at DESC
            """), {"mobile": mobile}).fetchall()

        return {
            "mobile": user[0],
            "name": user[1],
            "createdAt": user[2].isoformat() if user[2] else None,
            "sessions": [
                {
                    "id": s[0],
                    "topicId": s[1],
                    "topicTitle": s[2],
                    "completedAt": s[3].isoformat() if s[3] else None,
                    "totalSections": s[4],
                    "completedSections": s[5],
                    "overallScore": round(float(s[6]), 1),
                    "peakStruggle": s[7],
                    "peakBoredom": s[8],
                    "peakFatigue": s[9],
                    "finalState": s[10],
                    "totalTimeMs": s[11],
                    "sectionResults": s[12],
                    "stateHistory": s[13],
                }
                for s in sessions
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
