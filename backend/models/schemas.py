from pydantic import BaseModel
from typing import Optional


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    topicId: str
    topicName: str
    sectionId: str
    sectionContent: str
    sectionTitle: str
    studentMessage: str
    conversationHistory: list[ChatMessage] = []
    activeState: str  # engaged | struggling | bored | fatigued
    currentAssessmentQuestion: Optional[str] = None


class ChatResponse(BaseModel):
    response: str


class EvaluateRequest(BaseModel):
    topicId: str
    sectionId: str
    question: str
    studentAnswer: str
    keyConcepts: list[str]


class EvaluateResponse(BaseModel):
    score: int
    isCorrect: bool
    feedback: str
    conceptsCovered: list[str]
    conceptsMissing: list[str]
