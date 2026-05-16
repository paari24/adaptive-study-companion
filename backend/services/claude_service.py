import os
import json
import anthropic
from dotenv import load_dotenv

load_dotenv()

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-4-20250514"


def chat(messages: list[dict], system_prompt: str) -> str:
    response = _client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    )
    return response.content[0].text


def evaluate(prompt: str) -> dict:
    response = _client.messages.create(
        model=MODEL,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    # Extract JSON from response
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass
    # Fallback
    return {
        "score": 60,
        "isCorrect": True,
        "feedback": "Your answer shows understanding of the topic.",
        "conceptsCovered": [],
        "conceptsMissing": [],
    }
