# PRD: The Adaptive Study Companion

## Problem Statement (PS 09)

Generic study apps treat all students the same, ignoring how individuals learn differently under pressure, time constraints, and emotional states. Build a study assistant that adapts in real-time to a student's performance patterns — detecting when they're struggling, bored, or fatigued based on response speed and error types — and dynamically switches between explanation styles, difficulty levels, and formats (text, quiz, analogy) accordingly.

---

## Product Summary

An adaptive learning platform where a student studies topic-wise content while an AI-powered behavioral intelligence engine continuously monitors interaction signals (response time, accuracy, error patterns, engagement depth) to detect cognitive states (struggling, bored, fatigued) and dynamically adjusts teaching style, difficulty, and content format in real-time.

### One-Line Pitch

> We detect if a student is struggling, bored, or fatigued in real-time from their interaction patterns, and dynamically adapt the teaching style, difficulty, and content format — turning passive studying into an actively responsive learning experience.

---

## Architecture Overview

### Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS | Fast SPA, good DX, SSR not needed but nice to have |
| State Management | React Context + useReducer | Centralized state for behavioral scoring engine |
| Backend | FastAPI (Python) | Lightweight, async, fast to build |
| AI | Claude API (claude-sonnet-4-20250514) | Adaptive companion + assessment evaluation + free-text scoring |
| Content Storage | Static JSON files | Pre-chunked topic content, no DB needed for demo |
| Vector DB | ChromaDB (local) | RAG for AI companion grounding to current section |
| Session Storage | localStorage | Session persistence for demo |

### Project Structure

```
adaptive-study-companion/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                  # Topic selection (entry point)
│   │   │   └── learn/[topicId]/
│   │   │       └── page.tsx              # Main learning screen
│   │   ├── components/
│   │   │   ├── ContentPanel.tsx           # Left panel: topic content viewer
│   │   │   ├── ChatPanel.tsx             # Right panel: AI companion
│   │   │   ├── AssessmentModal.tsx        # Micro-assessment overlay
│   │   │   ├── StateIndicator.tsx         # Real-time state dashboard strip
│   │   │   ├── TopicSummary.tsx           # Final topic summary screen
│   │   │   └── QuestionRenderers/
│   │   │       ├── MCQQuestion.tsx
│   │   │       ├── FillBlankQuestion.tsx
│   │   │       ├── ExplainQuestion.tsx
│   │   │       ├── MatchQuestion.tsx
│   │   │       └── ScenarioQuestion.tsx
│   │   ├── engine/
│   │   │   ├── stateDetector.ts           # Core: behavioral scoring engine
│   │   │   ├── adaptationEngine.ts        # Maps states to adaptations
│   │   │   ├── eventCapture.ts            # Interaction event logger
│   │   │   └── types.ts                   # Shared types for engine
│   │   ├── context/
│   │   │   └── LearningSessionContext.tsx  # Global session state
│   │   ├── hooks/
│   │   │   ├── useStateDetection.ts       # Hook wrapping stateDetector
│   │   │   ├── useAdaptation.ts           # Hook wrapping adaptationEngine
│   │   │   └── useEventCapture.ts         # Hook wrapping event logger
│   │   ├── data/
│   │   │   └── topics/
│   │   │       ├── photosynthesis.json
│   │   │       ├── acids-and-bases.json
│   │   │       └── electric-circuits.json
│   │   └── lib/
│   │       ├── claude.ts                  # Claude API wrapper
│   │       └── prompts.ts                 # Prompt templates per state
│   └── package.json
├── backend/
│   ├── main.py                            # FastAPI entry point
│   ├── routers/
│   │   ├── chat.py                        # AI companion endpoint
│   │   ├── assess.py                      # Assessment generation + evaluation
│   │   └── session.py                     # Session persistence endpoints
│   ├── services/
│   │   ├── claude_service.py              # Claude API integration
│   │   ├── rag_service.py                 # ChromaDB RAG for content grounding
│   │   └── assessment_generator.py        # Question generation logic
│   ├── models/
│   │   └── schemas.py                     # Pydantic models
│   └── requirements.txt
└── README.md
```

---

## Screens

### Screen 1: Topic Selection (Entry Point)

**Route:** `/`

**Purpose:** Zero-friction entry. Student picks a topic and starts learning immediately.

**UI Elements:**
- App title: "Adaptive Study Companion"
- Subject cards (e.g., Science — Class 7 CBSE)
- Under each subject, topic tiles with title and section count
- No login. No registration. No forms.

**Behavior:**
- Clicking a topic navigates to `/learn/[topicId]`
- If a previous session exists in localStorage for that topic, show a "Resume" badge on the tile

**Hardcoded Topics for Demo:**
1. Photosynthesis (5 sections)
2. Acids and Bases (4 sections)
3. Electric Circuits (4 sections)

---

### Screen 2: Learning Screen (Core Product)

**Route:** `/learn/[topicId]`

**Purpose:** This is the entire product. Content consumption + AI companion + assessment + adaptation — all on one screen.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Topic Title                        [Section 2 of 5]    │
├───────────────────────────┬─────────────────────────────┤
│                           │                             │
│   CONTENT PANEL           │   AI COMPANION PANEL        │
│   (Left 55%)              │   (Right 45%)               │
│                           │                             │
│   Section content in      │   Chat interface            │
│   structured HTML/MD      │   - Student asks doubts     │
│                           │   - AI responds adaptively  │
│   [Continue to Assessment]│   - Grounded to section     │
│                           │                             │
├───────────────────────────┴─────────────────────────────┤
│  STATE INDICATOR BAR                                    │
│  State: Engaged | Struggle: 15 | Boredom: 8 | Fatigue: 22  │
│  Adaptations: Difficulty=Medium | Style=Standard        │
└─────────────────────────────────────────────────────────┘
```

**Components:**

#### Content Panel (Left)
- Renders current section content (from JSON)
- Section navigation: previous/current/next indicators
- "Continue to Assessment" button appears after minimum read time (calculated as word_count / 200 * 60 seconds)
- Next sections are visible but greyed out until current section assessment is passed
- Tracks: scroll events, time spent on section, whether student scrolled to bottom

#### AI Companion Panel (Right)
- Chat interface with message bubbles
- Student can type questions
- AI responds based on:
  - Current section content (RAG grounded)
  - Current detected state (prompt changes per state)
  - Current topic only (rejects off-topic questions)
- Shows typing indicator during API call
- Conversation history persists within session

#### State Indicator Bar (Bottom)
- Real-time display of detected state: `Engaged` | `Struggling` | `Bored` | `Fatigued`
- Raw scores: Struggle (0-100), Boredom (0-100), Fatigue (0-100)
- Active adaptations: current difficulty level, explanation style, cognitive load setting
- Session stats: elapsed time, questions answered, current accuracy %
- NOTE: This is for demo/judges. In production, this would be hidden.

---

### Screen 3: Assessment Modal

**Trigger:** Student clicks "Continue to Assessment" after reading a section.

**Purpose:** Micro-assessment that serves dual purpose — validate comprehension AND collect behavioral signals for state detection.

**UI Elements:**
- Overlay modal on the learning screen (not a separate page)
- Progress indicator: "Question 2 of 4"
- Question rendered based on type (MCQ, fill-blank, explain, match, scenario)
- Submit button per question
- No skip button. No back button. Student must answer every question.
- After all questions: score summary + "Continue to Next Section" or "Review with AI" button

**Question Types and Their Rendering:**

| Type | UI | Signal Captured |
|------|-----|----------------|
| MCQ | 4 radio options (3 if struggling) | Speed + accuracy + option changes |
| Fill in the blank | Text input with sentence context | Recall accuracy + typing speed |
| Explain in your own words | Textarea (min 20 chars) | Response depth + time taken |
| Match the following | Drag-and-drop pairs | Concept linking accuracy + speed |
| Scenario-based | Paragraph + MCQ | Application-level understanding |

**Adaptive Behavior:**
- Number of questions: 4-5 (default), 2-3 (fatigued state)
- Difficulty: Easy/Medium/Hard based on current state
- Question types: Removes free-text when fatigued, adds scenario-based when bored
- Hints: Appear after 15 seconds when struggling

---

### Screen 4: Topic Summary

**Trigger:** After completing all section assessments.

**Purpose:** Show learning outcome and behavioral insights.

**UI Elements:**
- Overall accuracy % across all sections
- Per-section breakdown: accuracy, time spent, state changes
- Learning behavior timeline: visual graph showing state transitions over time
- Weak concepts highlighted (sections where struggle score spiked above threshold)
- Recommendation: "Review Section 3 — your recall on [concept] was low"
- "Start Another Topic" button

---

## Core Engine: State Detection

This is the primary differentiator. Everything below runs on the frontend in real-time.

### Event Schema

Every student interaction produces an event:

```typescript
interface LearningEvent {
  id: string;
  timestamp: number;                    // Date.now()
  eventType: 'answer_submitted' | 'answer_changed' | 'ai_help_requested' |
             'content_scrolled' | 'section_started' | 'section_completed' |
             'idle_detected' | 'assessment_started' |
             'tab_hidden' | 'tab_visible' | 'rapid_scroll';
  sectionId: string;
  questionId?: string;
  questionType?: 'mcq' | 'fill_blank' | 'explain' | 'match' | 'scenario';
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  displayedAtMs?: number;               // When question appeared on screen
  answeredAtMs?: number;                 // When student submitted
  timeTakenMs?: number;                  // answeredAtMs - displayedAtMs
  selectedAnswer?: string;
  isCorrect?: boolean;
  attemptNumber?: number;               // 1 = first attempt
  answerChangesCount?: number;           // Times student switched before submit
  aiHelpRequested?: boolean;            // Did they ask companion before answering
  freeTextLength?: number;              // Character count for explain questions
  sessionElapsedMs: number;             // Time since session started
  idleReason?: 'tab_hidden' | 'no_interaction' | 'passive_scroll';
  idleDurationMs?: number;
  consecutiveIdleChecks?: number;
  scrollVelocity?: number;          // pixels per second on content panel
  tabHiddenDurationMs?: number;
}
```

### Behavioral Scores

Three scores maintained in React state, updated after every event:

```typescript
interface BehavioralState {
  struggleScore: number;    // 0-100
  boredomScore: number;     // 0-100
  fatigueScore: number;     // 0-100
  activeState: 'engaged' | 'struggling' | 'bored' | 'fatigued';
  stateHistory: Array<{ state: string; timestamp: number; scores: object }>;
}
```

### Scoring Rules

#### Struggle Score

| Trigger | Score Change |
|---------|-------------|
| Wrong answer | +15 |
| Wrong answer on easy question | +25 |
| Multiple attempts on same question (per retry) | +10 |
| AI help requested before answering | +10 |
| Answer changed 3+ times before submitting | +5 |
| Correct answer | -10 |
| Correct on first attempt without AI help | -15 |
| 3 consecutive correct answers | -20 |

#### Boredom Score

| Trigger | Score Change |
|---------|-------------|
| Correct answer in under 3 seconds | +10 |
| Streak of 3+ rapid correct answers (each under 5s) | +20 |
| Zero AI companion interaction for entire section | +15 |
| Content section scroll-through in under 30 seconds | +20 |
| Free-text answer under 20 characters | +10 |
| Student asks AI a genuine question | -10 |
| Reasonable time spent on content (word_count/200*60 ±30%) | -10 |
| Detailed free-text answer (50+ characters, evaluated by AI) | -15 |
| Content scrolled to bottom in under 10 seconds | +20 |
| Tab hidden for 15+ seconds (switched away) | +10 |

#### Fatigue Score

| Trigger | Score Change |
|---------|-------------|
| Response time trending upward over last 5 questions | +5 per question in trend |
| Idle gap over 30 seconds between interactions | +10 |
| Session duration beyond 20 minutes | +2 per additional minute |
| Accuracy dropping on same difficulty over last 5 questions | +10 |
| Free-text answer quality declining (shorter than previous) | +10 |
| Student returns from idle gap > 2 minutes (break taken) | -30 |
| Response speed stabilizes or improves | -5 |
| Tab hidden then returned after 2+ minutes | -15 (treated as micro-break) |
| 3+ consecutive idle checks during content reading | +15 |

### State Resolution

```typescript
function resolveState(scores: BehavioralState): ActiveState {
  const THRESHOLD = 60;

  // Priority: Fatigue > Struggling > Bored
  // Fatigue wins because a tired student cannot learn regardless
  if (scores.fatigueScore >= THRESHOLD) return 'fatigued';
  if (scores.struggleScore >= THRESHOLD) return 'struggling';
  if (scores.boredomScore >= THRESHOLD) return 'bored';
  return 'engaged';
}
```

### Score Decay

To prevent scores from permanently staying high after a brief spike:
- All scores decay by -2 every 60 seconds passively
- All scores decay by -1 after each answered question (natural engagement signal)
- Minimum score is 0, maximum is 100

---

### Interaction Monitor (Passive Engagement Tracker)

The state detection engine only fires during assessments. The interaction monitor fills the gap — it tracks engagement continuously during content reading, idle periods, and transitions.

#### Activity Signals Captured

| Signal | DOM Event | Weight |
|--------|-----------|--------|
| Mouse movement | mousemove (throttled to 1 per 2s) | Light activity |
| Scrolling | scroll on content panel | Active reading |
| Text selection | mouseup + getSelection() | Deep reading |
| Chat typing | input on chat textarea | Active engagement |
| Chat message sent | submit on chat form | Strong engagement |
| Tab visible | visibilitychange (visible) | Present |
| Tab hidden | visibilitychange (hidden) | Disengaged |

#### Monitor Logic

```typescript
interface ActivityBuffer {
  lastCheckTimestamp: number;
  events: Array<{ type: string; timestamp: number }>;
  consecutiveIdleChecks: number;
  tabHiddenSince: number | null;
}

const MONITOR_INTERVAL_MS = 30_000; // Check every 30 seconds
const TAB_HIDDEN_THRESHOLD_MS = 15_000; // 15 seconds on another tab

function runMonitorCheck(buffer: ActivityBuffer): LearningEvent | null {
  const now = Date.now();
  const recentEvents = buffer.events.filter(
    e => e.timestamp > buffer.lastCheckTimestamp
  );

  buffer.lastCheckTimestamp = now;

  // Tab hidden for over 15 seconds — strong disengagement
  if (buffer.tabHiddenSince && (now - buffer.tabHiddenSince) > TAB_HIDDEN_THRESHOLD_MS) {
    buffer.consecutiveIdleChecks++;
    return {
      eventType: 'idle_detected',
      idleReason: 'tab_hidden',
      idleDurationMs: now - buffer.tabHiddenSince,
      consecutiveIdleChecks: buffer.consecutiveIdleChecks
    };
  }

  // Zero activity in last 30 seconds
  if (recentEvents.length === 0) {
    buffer.consecutiveIdleChecks++;
    return {
      eventType: 'idle_detected',
      idleReason: 'no_interaction',
      idleDurationMs: MONITOR_INTERVAL_MS,
      consecutiveIdleChecks: buffer.consecutiveIdleChecks
    };
  }

  // Scroll-only activity (scrolled but nothing else) — passive reading or skimming
  const hasOnlyScroll = recentEvents.every(e => e.type === 'scroll');
  if (hasOnlyScroll && recentEvents.length < 3) {
    // Minimal scroll, no other engagement — borderline idle
    return {
      eventType: 'idle_detected',
      idleReason: 'passive_scroll',
      idleDurationMs: 0,
      consecutiveIdleChecks: 0
    };
  }

  // Active engagement detected — reset idle counter
  buffer.consecutiveIdleChecks = 0;
  return null;
}
```

#### Score Impact from Monitor Events

| Idle Reason | Fatigue Score | Boredom Score | Struggle Score |
|-------------|--------------|---------------|----------------|
| tab_hidden | +10 | +10 | 0 |
| no_interaction (1st consecutive) | +10 | +5 | 0 |
| no_interaction (2nd consecutive) | +15 | +10 | 0 |
| no_interaction (3rd+ consecutive) | +20 | +15 | 0 |
| passive_scroll | +5 | +10 | 0 |

#### AI Companion Nudge Triggers

| Condition | AI Action |
|-----------|-----------|
| 1 idle check (30s no activity) | No action — could be reading |
| 2 consecutive idle checks (60s) | Nudge: "Still with me? Want me to explain something about this section?" |
| 3 consecutive idle checks (90s) | Stronger: "Looks like you might need a break. Want a quick recap of what we covered?" |
| Tab hidden for 30+ seconds then returns | Welcome back: "Welcome back! Here's a quick refresher — we were looking at {section_title}." |
| Content scrolled to bottom in under 10 seconds | Boredom probe: "That was quick! Want me to challenge you with something harder, or are you ready for the assessment?" |

#### Implementation Notes

- Mount the monitor as a `useEffect` in the LearningSessionContext — it runs globally across content and assessment phases
- Throttle mousemove to 1 event per 2 seconds (prevent flooding the buffer)
- Clear the activity buffer when a new section starts
- Pause the monitor during assessments (assessments have their own per-question event capture)
- Resume the monitor when assessment completes and next section content loads
- The monitor interval should be configurable via a constant so you can lower it to 10 seconds for demo

---

## Adaptation System

When the active state changes, the following adaptations trigger immediately.

### Engaged State (Default)

| Dimension | Setting |
|-----------|---------|
| Content delivery | Full section text as written |
| Difficulty | Medium |
| Question count | 4-5 per section |
| Question types | All types included |
| AI companion tone | Neutral, informative |
| AI prompt modifier | Standard explanation |
| Hints | Not shown |

### Struggling State

| Dimension | Setting |
|-----------|---------|
| Content delivery | AI proactively offers simplified re-explanation |
| Difficulty | Easy |
| Question count | 4-5 (same, but easier) |
| Question types | MCQ options reduced from 4 to 3, no scenario-based |
| AI companion tone | Encouraging, patient, uses analogies |
| AI prompt modifier | "Explain like the student is 10 years old. Use everyday analogies. Break into small steps. Be encouraging." |
| Hints | Shown after 15 seconds on each question |

**Example adaptation:**
- Default: "Photosynthesis converts light energy into chemical energy stored in glucose."
- Struggling: "Think of a plant like a tiny kitchen. Sunlight is the stove, water and CO2 are ingredients, and glucose (sugar) is the food it cooks. The plant makes its own lunch using sunlight!"

### Bored State

| Dimension | Setting |
|-----------|---------|
| Content delivery | Skip basic recap, jump to advanced applications |
| Difficulty | Hard |
| Question count | 5 with time pressure (countdown timer) |
| Question types | Scenario-based + explain in own words heavy |
| AI companion tone | Challenging, Socratic, asks counter-questions |
| AI prompt modifier | "The student is bored. Challenge them. Ask thought-provoking questions. Introduce advanced concepts. Use Socratic method — don't give answers, ask questions that make them think deeper." |
| Hints | Disabled |

**Example adaptation:**
- Default: "Chlorophyll absorbs light for photosynthesis."
- Bored: "If chlorophyll only absorbs red and blue light, why don't plants appear cyan? And here's a harder question — why are most deep-sea plants red, not green? Think about it before I explain."

### Fatigued State

| Dimension | Setting |
|-----------|---------|
| Content delivery | Condensed to 3-line key takeaway bullets |
| Difficulty | Easy-Medium |
| Question count | 2-3 only |
| Question types | MCQ and match only (lowest cognitive load) |
| AI companion tone | Brief, supportive, suggests breaks |
| AI prompt modifier | "The student is fatigued. Keep responses under 3 sentences. Suggest a break. If they continue, give only the essential point. No lengthy explanations." |
| Hints | Pre-loaded with each question |

**Example adaptation:**
- Default: Full 200-word explanation of the photosynthesis equation.
- Fatigued: "Quick recap: 6CO2 + 6H2O + light → C6H12O6 + 6O2. Plants take in carbon dioxide and water, use sunlight, and produce glucose and oxygen. That's the core equation."
- AI also says: "You've been studying for 28 minutes. Want to take a 5-minute break? Your brain consolidates learning during rest."

---

## AI Companion Specification

### Grounding Rules

The AI companion MUST be grounded to:
1. **Current topic only** — refuses off-topic questions
2. **Current section content** — uses RAG on section text, not entire topic
3. **Current student state** — prompt dynamically includes state-specific instructions

### System Prompt Template

```
You are a study companion for a Class 7 student studying {topic_name}.

CURRENT SECTION: {section_title}
SECTION CONTENT: {section_text}

STUDENT STATE: {active_state}
STATE-SPECIFIC INSTRUCTIONS: {state_prompt_modifier}

RULES:
- Answer ONLY questions related to the current topic and section.
- If the student asks off-topic questions, gently redirect: "Let's stay focused on {topic_name} — what part of {section_title} would you like to explore?"
- Use the section content as your primary source of truth.
- Do not make up facts not present in the section content.
- Adapt your explanation style based on the state instructions above.
- If the student is in an assessment, give hints, not answers.
- Use examples, analogies, and comparisons appropriate for a Class 7 student.
```

### Interaction Types

| Student Action | AI Response |
|---------------|-------------|
| Asks a doubt about current section | Explains based on current state style |
| Asks off-topic question | Redirects politely to current topic |
| Stuck on assessment question | Gives a hint, never the answer |
| Completes section with high score (>80%) | Congratulates briefly, suggests moving forward |
| Completes section with low score (<50%) | Offers to re-explain weak concepts before proceeding |
| Idle for 2+ minutes | Sends a gentle nudge: "Still there? Want to talk through this section?" |

### API Call Structure

```typescript
// POST /api/chat
{
  topicId: string,
  sectionId: string,
  sectionContent: string,       // RAG-retrieved or full section text
  studentMessage: string,
  conversationHistory: Message[],
  activeState: 'engaged' | 'struggling' | 'bored' | 'fatigued',
  currentAssessmentQuestion?: string  // If student is mid-assessment
}
```

---

## Assessment Generation

### Approach

Assessments are pre-generated per section in the topic JSON files. For the hackathon demo, questions are authored manually to ensure quality. The AI evaluates free-text responses at runtime.

### Topic JSON Schema

```json
{
  "topicId": "photosynthesis",
  "title": "Photosynthesis",
  "subject": "Science",
  "grade": "Class 7",
  "sections": [
    {
      "sectionId": "section-1",
      "title": "What is Photosynthesis",
      "content": "Photosynthesis is the process by which green plants...",
      "keyConcepts": ["photosynthesis", "chlorophyll", "sunlight", "glucose"],
      "wordCount": 280,
      "assessments": {
        "easy": [
          {
            "questionId": "s1-e1",
            "type": "mcq",
            "difficulty": "easy",
            "question": "What do plants need to make food?",
            "options": ["Sunlight, water, and CO2", "Oxygen and sugar", "Soil and fertilizer", "Wind and rain"],
            "correctAnswer": "Sunlight, water, and CO2",
            "explanation": "Plants use sunlight, water from soil, and carbon dioxide from air to make glucose."
          }
        ],
        "medium": [...],
        "hard": [...]
      }
    }
  ]
}
```

### Assessment Selection Logic

```typescript
function selectAssessment(
  section: Section,
  activeState: ActiveState,
  fatigueScore: number
): Assessment[] {

  // Determine difficulty based on state
  const difficulty = activeState === 'struggling' ? 'easy'
                   : activeState === 'bored' ? 'hard'
                   : 'medium';

  // Determine question count based on fatigue
  const count = activeState === 'fatigued' ? 3 : 5;

  // Select questions from appropriate difficulty pool
  const pool = section.assessments[difficulty];
  return selectRandom(pool, count);
}
```

### Free-Text Evaluation

For "explain in your own words" questions, use Claude API to evaluate:

```
Evaluate this student's explanation.

TOPIC: {topic}
SECTION: {section_title}
KEY CONCEPTS EXPECTED: {keyConcepts}
QUESTION: {question}
STUDENT ANSWER: "{studentAnswer}"

Evaluate on:
1. Conceptual accuracy (are the key concepts present and correct?)
2. Depth (surface-level vs. genuine understanding?)
3. Own words (parroting the text vs. actual comprehension?)

Respond with JSON:
{
  "score": 0-100,
  "isCorrect": true/false (threshold: 60),
  "feedback": "One sentence feedback for the student",
  "conceptsCovered": ["list of concepts the student demonstrated"],
  "conceptsMissing": ["list of concepts not addressed"]
}
```

---

## Session Persistence

### What Is Stored (localStorage)

```typescript
interface SessionData {
  topicId: string;
  currentSectionIndex: number;
  completedSections: string[];
  sectionScores: Record<string, number>;
  behavioralState: BehavioralState;
  eventLog: LearningEvent[];
  chatHistory: Record<string, Message[]>;  // Per section
  sessionStartTime: number;
  totalTimeSpentMs: number;
  lastAccessedAt: number;
}
```

### Resume Logic

When student returns to a topic with existing session data:
1. Load session from localStorage
2. Show brief recap: "You completed 2 of 5 sections last time. Your score was 75% on Section 2."
3. Reset fatigue score to 0 (fresh session)
4. Preserve struggle/boredom scores (these reflect understanding, not tiredness)
5. Continue from next incomplete section

---

## API Endpoints

### Backend (FastAPI)

```
POST /api/chat
  Body: { topicId, sectionId, sectionContent, studentMessage, conversationHistory, activeState }
  Returns: { response: string }

POST /api/evaluate-answer
  Body: { topicId, sectionId, question, studentAnswer, keyConcepts }
  Returns: { score, isCorrect, feedback, conceptsCovered, conceptsMissing }

GET  /api/topics
  Returns: List of available topics with metadata

GET  /api/topics/{topicId}
  Returns: Full topic JSON with sections and assessments
```

---

## Demo Script (For Judges)

### Setup
- Open app. Show topic selection. Pick Photosynthesis.

### Show Normal Flow (30 seconds)
- Read Section 1. Answer assessment correctly at normal pace.
- Point out: State Indicator shows "Engaged", all scores low.

### Trigger Struggling State (60 seconds)
- Move to Section 2. Deliberately answer wrong. Answer wrong again. Ask AI for help.
- Point out: Struggle score climbing. Once it crosses 60, state flips to "Struggling."
- Show adaptation: AI companion language simplifies. Difficulty drops. Hints appear.

### Trigger Bored State (60 seconds)
- Move to Section 3. Answer everything correctly in under 3 seconds. Don't interact with AI.
- Point out: Boredom score climbing. State flips to "Bored."
- Show adaptation: Difficulty jumps to hard. AI asks challenging counter-questions.

### Trigger Fatigued State (30 seconds)
- Explain: "In a real session, fatigue builds over 20+ minutes. For demo, we've lowered the threshold."
- Show the fatigued adaptations: shorter content, fewer questions, break suggestion.

### Show Topic Summary (30 seconds)
- Show final screen with per-section breakdown and behavioral timeline.
- Highlight: "The system correctly detected three different cognitive states and adapted each time."

### Key Talking Points for Judges
1. "Every answer generates a behavioral event with 12 data points."
2. "Three independent scoring engines run simultaneously — struggle, boredom, fatigue."
3. "Adaptations are not cosmetic — they change difficulty, question types, AI personality, and content depth."
4. "The AI companion is RAG-grounded to the current section — it cannot hallucinate outside the topic."
5. "No ML. Pure rule-based behavioral intelligence. Transparent, explainable, and debuggable."

---

## Build Priority

### Phase 1: Skeleton (Day 1)

- [ ] Next.js project setup with Tailwind
- [ ] Topic selection page with hardcoded topics
- [ ] Learning screen layout: ContentPanel + ChatPanel
- [ ] Load and render first topic from JSON
- [ ] Section navigation (next/previous)
- [ ] Basic chat interface (UI only, no AI yet)

### Phase 2: Assessment + Event Capture (Day 1)

- [ ] AssessmentModal component with MCQ renderer
- [ ] Event capture: log every interaction with full schema
- [ ] Wire "Continue to Assessment" flow
- [ ] Assessment scoring and section unlock logic
- [ ] Add fill-blank and match question renderers

### Phase 3: State Detection Engine (Day 2)

- [ ] Implement stateDetector.ts with all scoring rules
- [ ] Wire event stream to score updates
- [ ] State resolution with priority logic
- [ ] Score decay timer
- [ ] StateIndicator component showing live scores
- [ ] State history logging for timeline

### Phase 4: AI Companion (Day 2)

- [ ] FastAPI backend with /api/chat endpoint
- [ ] Claude API integration with state-aware prompts
- [ ] Prompt template switching per state
- [ ] Off-topic rejection logic
- [ ] /api/evaluate-answer for free-text questions
- [ ] Connect ChatPanel to backend

### Phase 5: Adaptation Layer (Day 2-3)

- [ ] adaptationEngine.ts mapping states to UI changes
- [ ] Difficulty switching in assessment selection
- [ ] Question count adjustment for fatigue
- [ ] Hint system for struggling state
- [ ] AI companion tone changes per state
- [ ] Content condensation for fatigued state

### Phase 6: Polish + Demo (Day 3)

- [ ] Topic summary screen with per-section breakdown
- [ ] Behavioral timeline visualization
- [ ] Session persistence via localStorage
- [ ] Add remaining question types (explain, scenario)
- [ ] Demo threshold tuning (lower thresholds for live demo)
- [ ] Rehearse demo script

---

## Out of Scope (Do NOT Build)

- Parent registration or dashboard
- Role-based login (parent vs student)
- PDF upload or processing
- Multiple curriculum/board support
- Emotion detection via camera/mic
- Voice assistant
- Image generation
- Smart resume with recall assessment
- Leaderboards or gamification
- Mobile responsive design (desktop demo only)
- User authentication of any kind

---

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

---

## Content Authoring Guide

Each topic JSON must include:

1. **4-6 sections** per topic, logically chunked
2. **Key concepts** per section (3-5 terms)
3. **Word count** per section (for minimum read time calculation)
4. **3 difficulty pools** per section: easy (4 questions), medium (5 questions), hard (4 questions)
5. **Question type mix** per pool: at least 1 MCQ, 1 fill-blank, 1 explain — match and scenario optional
6. **Correct answer + explanation** for every question
7. **Distractor options** for MCQ that test common misconceptions, not random wrong answers

---

## Success Criteria

The demo is successful if judges can observe:

1. A student interaction produces visible state detection (scores updating in real-time)
2. Crossing the threshold triggers visible, meaningful adaptations (not just color changes)
3. The AI companion demonstrably changes behavior per state (compare responses in engaged vs struggling)
4. The system correctly differentiates between struggling (slow + wrong), bored (fast + right), and fatigued (progressively slower)
5. The entire flow from topic selection to summary works end-to-end without manual intervention
