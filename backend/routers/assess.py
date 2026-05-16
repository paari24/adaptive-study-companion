import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from models.schemas import EvaluateRequest, EvaluateResponse
from services import claude_service
from lib.prompts import build_evaluate_prompt

router = APIRouter()

TOPICS_DIR = Path(__file__).parent.parent.parent / "frontend" / "data" / "topics"


@router.get("/topics")
async def list_topics():
    topics = []
    for f in TOPICS_DIR.glob("*.json"):
        with open(f, "r", encoding="utf-8") as fh:
            data = json.load(fh)
            topics.append({
                "topicId": data["topicId"],
                "title": data["title"],
                "subject": data["subject"],
                "grade": data["grade"],
                "sectionCount": len(data.get("sections", [])),
            })
    return topics


@router.get("/topics/{topic_id}")
async def get_topic(topic_id: str):
    topic_file = TOPICS_DIR / f"{topic_id}.json"
    if not topic_file.exists():
        raise HTTPException(status_code=404, detail="Topic not found")
    with open(topic_file, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/evaluate-answer", response_model=EvaluateResponse)
async def evaluate_answer(req: EvaluateRequest) -> EvaluateResponse:
    # Get topic title for prompt
    topic_title = req.topicId.replace("-", " ").title()
    topic_file = TOPICS_DIR / f"{req.topicId}.json"
    section_title = req.sectionId
    if topic_file.exists():
        with open(topic_file, "r", encoding="utf-8") as f:
            topic_data = json.load(f)
            topic_title = topic_data.get("title", topic_title)
            for s in topic_data.get("sections", []):
                if s["sectionId"] == req.sectionId:
                    section_title = s["title"]
                    break

    prompt = build_evaluate_prompt(
        topic=topic_title,
        section_title=section_title,
        key_concepts=req.keyConcepts,
        question=req.question,
        student_answer=req.studentAnswer,
    )

    result = claude_service.evaluate(prompt)
    return EvaluateResponse(
        score=result.get("score", 0),
        isCorrect=result.get("isCorrect", False),
        feedback=result.get("feedback", "Please try again with a proper answer."),
        conceptsCovered=result.get("conceptsCovered", []),
        conceptsMissing=result.get("conceptsMissing", []),
    )
