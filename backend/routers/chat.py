from fastapi import APIRouter
from models.schemas import ChatRequest, ChatResponse
from services import claude_service, rag_service
from lib.prompts import build_system_prompt

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest) -> ChatResponse:
    # Retrieve relevant content chunks via RAG
    rag_context = rag_service.query(req.topicId, req.studentMessage)
    # Use RAG context if available, otherwise use provided section content
    section_content = rag_context if rag_context.strip() else req.sectionContent

    system_prompt = build_system_prompt(
        topic_name=req.topicName,
        section_title=req.sectionTitle,
        section_content=section_content,
        active_state=req.activeState,
    )

    # Build messages list
    messages = [
        {"role": m.role if m.role == "assistant" else "user", "content": m.content}
        for m in req.conversationHistory
    ]
    messages.append({"role": "user", "content": req.studentMessage})

    response_text = claude_service.chat(messages, system_prompt)
    return ChatResponse(response=response_text)
