import { ActiveState, AdaptationConfig, Assessment, DifficultyLevel, QuestionType, TopicSection } from './types';

const ALL_TYPES: QuestionType[] = ['mcq', 'fill_blank', 'explain', 'match', 'scenario'];
const LOW_LOAD_TYPES: QuestionType[] = ['mcq', 'match'];
const CHALLENGE_TYPES: QuestionType[] = ['scenario', 'explain', 'mcq'];

export const STATE_PROMPT_MODIFIERS: Record<ActiveState, string> = {
  engaged:
    'Be clear, informative, and engaging. Use examples appropriate for a Class 7 student.',
  struggling:
    'Explain like the student is 10 years old. Use everyday analogies and metaphors. Break concepts into very small steps. Be warm and encouraging. Never make the student feel bad for not knowing.',
  bored:
    'The student is bored and needs a challenge. Use the Socratic method — ask thought-provoking questions instead of giving answers. Introduce advanced applications and edge cases. Do NOT give easy explanations.',
  fatigued:
    'The student is tired. Keep every response under 3 sentences. Focus only on the single most important point. Gently suggest taking a short break.',
};

export const ADAPTATIONS: Record<ActiveState, AdaptationConfig> = {
  engaged: {
    difficulty: 'medium',
    questionCount: 5,
    hintsEnabled: false,
    hintsPreloaded: false,
    timerEnabled: false,
    timerSeconds: 0,
    allowedQuestionTypes: ALL_TYPES,
    mcqOptionCount: 4,
    aiPromptModifier: STATE_PROMPT_MODIFIERS.engaged,
    contentStyle: 'full',
  },
  struggling: {
    difficulty: 'easy',
    questionCount: 5,
    hintsEnabled: true,
    hintsPreloaded: false,
    timerEnabled: false,
    timerSeconds: 0,
    allowedQuestionTypes: ['mcq', 'fill_blank', 'explain', 'match'],
    mcqOptionCount: 3,
    aiPromptModifier: STATE_PROMPT_MODIFIERS.struggling,
    contentStyle: 'full',
  },
  bored: {
    difficulty: 'hard',
    questionCount: 5,
    hintsEnabled: false,
    hintsPreloaded: false,
    timerEnabled: true,
    timerSeconds: 30,
    allowedQuestionTypes: CHALLENGE_TYPES,
    mcqOptionCount: 4,
    aiPromptModifier: STATE_PROMPT_MODIFIERS.bored,
    contentStyle: 'advanced',
  },
  fatigued: {
    difficulty: 'medium',
    questionCount: 3,
    hintsEnabled: true,
    hintsPreloaded: true,
    timerEnabled: false,
    timerSeconds: 0,
    allowedQuestionTypes: LOW_LOAD_TYPES,
    mcqOptionCount: 4,
    aiPromptModifier: STATE_PROMPT_MODIFIERS.fatigued,
    contentStyle: 'condensed',
  },
};

export function getAdaptation(state: ActiveState): AdaptationConfig {
  return ADAPTATIONS[state];
}

function selectRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

export function selectAssessment(
  section: TopicSection,
  activeState: ActiveState
): Assessment[] {
  const config = ADAPTATIONS[activeState];
  const diff: DifficultyLevel = config.difficulty;
  const pool = section.assessments[diff] ?? section.assessments.medium;

  // Filter by allowed question types
  const filtered = pool.filter((q) => config.allowedQuestionTypes.includes(q.type));
  const source = filtered.length >= config.questionCount ? filtered : pool;

  return selectRandom(source, config.questionCount);
}
