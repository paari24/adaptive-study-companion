import {
  LearningEvent,
  BehavioralState,
  ActiveState,
  StateSnapshot,
} from './types';

export const DEMO_MODE = true;
const THRESHOLD = DEMO_MODE ? 30 : 60;
const SESSION_FATIGUE_START_MS = DEMO_MODE ? 5 * 60 * 1000 : 20 * 60 * 1000;
const DECAY_INTERVAL_MS = DEMO_MODE ? 30_000 : 60_000;

export { THRESHOLD, SESSION_FATIGUE_START_MS, DECAY_INTERVAL_MS };

export function createInitialBehavioralState(): BehavioralState {
  return {
    struggleScore: 0,
    boredomScore: 0,
    fatigueScore: 0,
    activeState: 'engaged',
    stateHistory: [],
    consecutiveCorrect: 0,
    rapidCorrectStreak: 0,
    lastFreeTextLength: -1,
    responseTimes: [],
    sectionAccuracies: [],
    aiInteractedThisSection: false,
    sectionScrollStartTime: null,
  };
}

function clamp(val: number): number {
  return Math.max(0, Math.min(100, val));
}

export function resolveState(s: BehavioralState): ActiveState {
  if (s.fatigueScore >= THRESHOLD) return 'fatigued';
  if (s.struggleScore >= THRESHOLD) return 'struggling';
  if (s.boredomScore >= THRESHOLD) return 'bored';
  return 'engaged';
}

export function processEvent(
  event: LearningEvent,
  prev: BehavioralState,
  sessionStartTime: number
): BehavioralState {
  let s = { ...prev };
  const now = event.timestamp;
  const sessionMs = now - sessionStartTime;

  // ── Struggle ──────────────────────────────────────────────────────────────
  if (event.eventType === 'answer_submitted') {
    if (event.isCorrect === false) {
      s.struggleScore += event.difficultyLevel === 'easy' ? 25 : 15;
      s.consecutiveCorrect = 0;
      s.rapidCorrectStreak = 0;
    } else if (event.isCorrect === true) {
      s.struggleScore += -10;
      s.consecutiveCorrect += 1;
      if (event.attemptNumber === 1 && !event.aiHelpRequested) {
        s.struggleScore += -5; // total -15
      }
      if (s.consecutiveCorrect >= 3) {
        s.struggleScore += -20;
        s.consecutiveCorrect = 0;
      }

      // ── Boredom: rapid correct ────────────────────────────────────────────
      if (event.timeTakenMs !== undefined && event.timeTakenMs < 3000) {
        s.boredomScore += 10;
        s.rapidCorrectStreak += 1;
        if (s.rapidCorrectStreak >= 3) {
          s.boredomScore += 20;
          s.rapidCorrectStreak = 0;
        }
      } else {
        s.rapidCorrectStreak = 0;
      }
    }

    if ((event.attemptNumber ?? 1) > 1) s.struggleScore += 10;
    if (event.aiHelpRequested) s.struggleScore += 10;
    if ((event.answerChangesCount ?? 0) >= 3) s.struggleScore += 5;

    // ── Fatigue: response time trend ──────────────────────────────────────
    if (event.timeTakenMs !== undefined) {
      s.responseTimes = [...s.responseTimes.slice(-4), event.timeTakenMs];
      if (s.responseTimes.length >= 3) {
        const trending = s.responseTimes.every(
          (t, i) => i === 0 || t >= s.responseTimes[i - 1]
        );
        if (trending) s.fatigueScore += 5;
        else s.fatigueScore += -5;
      }
    }

    // ── Fatigue: accuracy dropping ────────────────────────────────────────
    s.sectionAccuracies = [...s.sectionAccuracies.slice(-4), !!event.isCorrect];
    if (s.sectionAccuracies.length >= 5) {
      const recent = s.sectionAccuracies.slice(-5);
      const dropping =
        recent.filter(Boolean).length < s.sectionAccuracies.slice(-10, -5).filter(Boolean).length;
      if (dropping) s.fatigueScore += 10;
    }

    // ── Boredom: free-text ────────────────────────────────────────────────
    if (event.freeTextLength !== undefined) {
      if (event.freeTextLength < 20) s.boredomScore += 10;
      if (event.freeTextLength >= 50) s.boredomScore += -15;

      // Fatigue: shrinking free-text
      if (s.lastFreeTextLength > 0 && event.freeTextLength < s.lastFreeTextLength) {
        s.fatigueScore += 10;
      }
      s.lastFreeTextLength = event.freeTextLength;
    }

    // Per-question decay
    s.struggleScore = clamp(s.struggleScore - 1);
    s.boredomScore = clamp(s.boredomScore - 1);
    s.fatigueScore = clamp(s.fatigueScore - 1);
  }

  // ── AI interaction ─────────────────────────────────────────────────────────
  if (event.eventType === 'ai_help_requested') {
    s.boredomScore += -10;
    s.aiInteractedThisSection = true;
  }

  // ── Content scrolled / rapid scroll ───────────────────────────────────────
  if (event.eventType === 'content_scrolled') {
    if (s.sectionScrollStartTime === null) {
      s.sectionScrollStartTime = event.timestamp;
    }
  }

  if (event.eventType === 'rapid_scroll') {
    s.boredomScore += 20; // scrolled to bottom <10s
  }

  // ── Section started: reset per-section trackers ───────────────────────────
  if (event.eventType === 'section_started') {
    s.aiInteractedThisSection = false;
    s.sectionScrollStartTime = event.timestamp;
    s.rapidCorrectStreak = 0;
    s.consecutiveCorrect = 0;
  }

  // ── Section completed ─────────────────────────────────────────────────────
  if (event.eventType === 'section_completed') {
    // Zero AI interaction all section
    if (!s.aiInteractedThisSection) s.boredomScore += 15;

    // Scroll-through speed
    if (s.sectionScrollStartTime !== null) {
      const scrollDuration = event.timestamp - s.sectionScrollStartTime;
      if (scrollDuration < 10_000) {
        s.boredomScore += 20; // already covered by rapid_scroll, keep idempotent via rapid_scroll
      } else if (scrollDuration < 30_000) {
        s.boredomScore += 20;
      }
      // Reasonable read time
      if (scrollDuration >= 60_000 * 0.7 && scrollDuration <= 60_000 * 1.3) {
        s.boredomScore += -10;
      }
    }
  }

  // ── Fatigue: session duration ──────────────────────────────────────────────
  if (sessionMs > SESSION_FATIGUE_START_MS) {
    const extraMinutes = Math.floor((sessionMs - SESSION_FATIGUE_START_MS) / 60_000);
    s.fatigueScore += extraMinutes * 2;
  }

  // ── Idle events (from interaction monitor) ─────────────────────────────────
  if (event.eventType === 'idle_detected') {
    const checks = event.consecutiveIdleChecks ?? 1;
    switch (event.idleReason) {
      case 'tab_hidden':
        s.fatigueScore += 10;
        s.boredomScore += 10;
        break;
      case 'no_interaction':
        s.fatigueScore += checks === 1 ? 10 : checks === 2 ? 15 : 20;
        s.boredomScore += checks === 1 ? 5 : checks === 2 ? 10 : 15;
        if (checks >= 3) s.fatigueScore += 15; // 3+ consecutive
        break;
      case 'passive_scroll':
        s.fatigueScore += 5;
        s.boredomScore += 10;
        break;
    }
    // Long idle = break taken → fatigue reset
    if (event.idleDurationMs !== undefined && event.idleDurationMs > 120_000) {
      s.fatigueScore += -30;
    }
  }

  if (event.eventType === 'tab_hidden') {
    s.boredomScore += 10;
    s.fatigueScore += 10;
  }

  if (event.eventType === 'tab_visible') {
    if (event.tabHiddenDurationMs !== undefined && event.tabHiddenDurationMs > 120_000) {
      s.fatigueScore += -15;
    }
  }

  // ── Clamp all scores ───────────────────────────────────────────────────────
  s.struggleScore = clamp(s.struggleScore);
  s.boredomScore = clamp(s.boredomScore);
  s.fatigueScore = clamp(s.fatigueScore);

  // ── Resolve new state ──────────────────────────────────────────────────────
  const newState = resolveState(s);
  if (newState !== prev.activeState) {
    s.stateHistory = [
      ...prev.stateHistory,
      {
        state: newState,
        timestamp: now,
        scores: {
          struggle: s.struggleScore,
          boredom: s.boredomScore,
          fatigue: s.fatigueScore,
        },
      } satisfies StateSnapshot,
    ];
  }
  s.activeState = newState;

  return s;
}

export function decayScores(prev: BehavioralState): BehavioralState {
  return {
    ...prev,
    struggleScore: clamp(prev.struggleScore - 2),
    boredomScore: clamp(prev.boredomScore - 2),
    fatigueScore: clamp(prev.fatigueScore - 2),
  };
}
