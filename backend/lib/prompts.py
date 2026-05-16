STATE_MODIFIERS = {
    "engaged": (
        "Be clear, informative, and engaging. Use well-chosen examples. "
        "Explain at an appropriate level for a Class 7 student without being condescending."
    ),
    "struggling": (
        "The student is struggling. Explain like the student is 10 years old. "
        "Use everyday analogies and simple metaphors. Break concepts into tiny steps. "
        "Be warm, patient, and encouraging. Never make the student feel bad for not knowing. "
        "Start your response with a reassuring phrase."
    ),
    "bored": (
        "The student is bored and needs a challenge. Use the Socratic method — ask thought-provoking "
        "questions rather than directly giving answers. Introduce advanced applications and edge cases. "
        "Do NOT give easy explanations. Push the student to think deeper."
    ),
    "fatigued": (
        "The student is tired. Keep your entire response under 3 sentences. "
        "Focus only on the single most important point. "
        "At the end, gently suggest they take a short 5-minute break."
    ),
}

SYSTEM_PROMPT_TEMPLATE = """You are a study companion for a Class 7 student studying {topic_name}.

CURRENT SECTION: {section_title}
SECTION CONTENT:
{section_content}

STUDENT STATE: {active_state}
STATE-SPECIFIC INSTRUCTIONS: {state_modifier}

RULES:
- Answer ONLY questions related to the current topic ({topic_name}) and section ({section_title}).
- If the student asks off-topic questions, gently redirect: "Let's stay focused on {topic_name} — what part of {section_title} would you like to explore?"
- Use the section content above as your primary source of truth.
- Do not invent facts not present in the section content.
- Adapt your explanation style based on the STATE-SPECIFIC INSTRUCTIONS above.
- If the student is mid-assessment, give hints only — never the direct answer.
- Use examples, analogies, and comparisons appropriate for a Class 7 student.
- Keep responses concise and conversational."""


def build_system_prompt(
    topic_name: str,
    section_title: str,
    section_content: str,
    active_state: str,
) -> str:
    modifier = STATE_MODIFIERS.get(active_state, STATE_MODIFIERS["engaged"])
    return SYSTEM_PROMPT_TEMPLATE.format(
        topic_name=topic_name,
        section_title=section_title,
        section_content=section_content[:3000],  # truncate for token budget
        active_state=active_state,
        state_modifier=modifier,
    )


EVALUATE_PROMPT_TEMPLATE = """Evaluate this student's explanation.

TOPIC: {topic}
SECTION: {section_title}
KEY CONCEPTS EXPECTED: {key_concepts}
QUESTION: {question}
STUDENT ANSWER: "{student_answer}"

Evaluate on:
1. Conceptual accuracy (are the key concepts present and correct?)
2. Depth (surface-level vs. genuine understanding?)
3. Own words (parroting the text vs. actual comprehension?)

Respond ONLY with valid JSON in exactly this format:
{{
  "score": <integer 0-100>,
  "isCorrect": <true if score >= 60, false otherwise>,
  "feedback": "<one sentence feedback for the student>",
  "conceptsCovered": ["<concept1>", "<concept2>"],
  "conceptsMissing": ["<concept3>"]
}}"""


def build_evaluate_prompt(
    topic: str,
    section_title: str,
    key_concepts: list[str],
    question: str,
    student_answer: str,
) -> str:
    return EVALUATE_PROMPT_TEMPLATE.format(
        topic=topic,
        section_title=section_title,
        key_concepts=", ".join(key_concepts),
        question=question,
        student_answer=student_answer,
    )
