export type QuestionType = 'mcq' | 'fill_blank' | 'explain' | 'match' | 'scenario';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ActiveState = 'engaged' | 'struggling' | 'bored' | 'fatigued';
export type ContentStyle = 'full' | 'condensed' | 'advanced';
export type IdleReason = 'tab_hidden' | 'no_interaction' | 'passive_scroll';

export type EventType =
  | 'answer_submitted'
  | 'answer_changed'
  | 'ai_help_requested'
  | 'content_scrolled'
  | 'section_started'
  | 'section_completed'
  | 'idle_detected'
  | 'assessment_started'
  | 'tab_hidden'
  | 'tab_visible'
  | 'rapid_scroll';

export interface LearningEvent {
  id: string;
  timestamp: number;
  eventType: EventType;
  sectionId: string;
  questionId?: string;
  questionType?: QuestionType;
  difficultyLevel?: DifficultyLevel;
  displayedAtMs?: number;
  answeredAtMs?: number;
  timeTakenMs?: number;
  selectedAnswer?: string;
  isCorrect?: boolean;
  attemptNumber?: number;
  answerChangesCount?: number;
  aiHelpRequested?: boolean;
  freeTextLength?: number;
  sessionElapsedMs: number;
  idleReason?: IdleReason;
  idleDurationMs?: number;
  consecutiveIdleChecks?: number;
  scrollVelocity?: number;
  tabHiddenDurationMs?: number;
}

export interface StateSnapshot {
  state: ActiveState;
  timestamp: number;
  scores: { struggle: number; boredom: number; fatigue: number };
}

export interface BehavioralState {
  struggleScore: number;
  boredomScore: number;
  fatigueScore: number;
  activeState: ActiveState;
  stateHistory: StateSnapshot[];
  consecutiveCorrect: number;
  rapidCorrectStreak: number;
  lastFreeTextLength: number;
  responseTimes: number[];
  sectionAccuracies: boolean[];
  aiInteractedThisSection: boolean;
  sectionScrollStartTime: number | null;
}

export interface AdaptationConfig {
  difficulty: DifficultyLevel;
  questionCount: number;
  hintsEnabled: boolean;
  hintsPreloaded: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
  allowedQuestionTypes: QuestionType[];
  mcqOptionCount: number;
  aiPromptModifier: string;
  contentStyle: ContentStyle;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface Assessment {
  questionId: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  question: string;
  options?: string[];
  pairs?: MatchPair[];
  correctAnswer: string;
  hint?: string;
  explanation: string;
  scenarioParagraph?: string;
}

export interface TopicSection {
  sectionId: string;
  title: string;
  content: string;
  keyConcepts: string[];
  wordCount: number;
  assessments: {
    easy: Assessment[];
    medium: Assessment[];
    hard: Assessment[];
  };
}

export interface Topic {
  topicId: string;
  title: string;
  subject: string;
  grade: string;
  sections: TopicSection[];
}

export interface Message {
  role: 'student' | 'assistant';
  content: string;
  timestamp: number;
  isNudge?: boolean;
}

export interface SectionResult {
  sectionId: string;
  sectionTitle: string;
  score: number;
  totalQuestions: number;
  timeSpentMs: number;
  peakStruggleScore: number;
  peakBoredomScore: number;
  peakFatigueScore: number;
  stateChanges: StateSnapshot[];
}

export interface SessionData {
  topicId: string;
  currentSectionIndex: number;
  completedSections: string[];
  sectionScores: Record<string, number>;
  sectionResults: Record<string, SectionResult>;
  behavioralState: BehavioralState;
  eventLog: LearningEvent[];
  chatHistory: Record<string, Message[]>;
  sessionStartTime: number;
  totalTimeSpentMs: number;
  lastAccessedAt: number;
}
