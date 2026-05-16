import { LearningEvent, IdleReason } from './types';
import { DEMO_MODE } from './stateDetector';

export const MONITOR_INTERVAL_MS = DEMO_MODE ? 10_000 : 30_000;
export const TAB_HIDDEN_THRESHOLD_MS = 15_000;

export interface ActivityBuffer {
  lastCheckTimestamp: number;
  events: Array<{ type: string; timestamp: number }>;
  consecutiveIdleChecks: number;
  tabHiddenSince: number | null;
  sessionStartTime: number;
  sectionId: string;
}

export function createActivityBuffer(sectionId: string, sessionStartTime: number): ActivityBuffer {
  return {
    lastCheckTimestamp: Date.now(),
    events: [],
    consecutiveIdleChecks: 0,
    tabHiddenSince: null,
    sessionStartTime,
    sectionId,
  };
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

export function runMonitorCheck(
  buffer: ActivityBuffer
): { event: LearningEvent | null; nudge: string | null; sectionTitle?: string } {
  const now = Date.now();
  const recentEvents = buffer.events.filter((e) => e.timestamp > buffer.lastCheckTimestamp);
  buffer.events = buffer.events.filter((e) => e.timestamp > now - 60_000); // prune old
  buffer.lastCheckTimestamp = now;

  const base = {
    id: makeId(),
    timestamp: now,
    sectionId: buffer.sectionId,
    sessionElapsedMs: now - buffer.sessionStartTime,
  };

  // Tab hidden for over threshold
  if (buffer.tabHiddenSince && now - buffer.tabHiddenSince > TAB_HIDDEN_THRESHOLD_MS) {
    buffer.consecutiveIdleChecks++;
    const idleDurationMs = now - buffer.tabHiddenSince;
    const event: LearningEvent = {
      ...base,
      eventType: 'idle_detected',
      idleReason: 'tab_hidden' as IdleReason,
      idleDurationMs,
      consecutiveIdleChecks: buffer.consecutiveIdleChecks,
    };
    return { event, nudge: null };
  }

  // Zero activity
  if (recentEvents.length === 0) {
    buffer.consecutiveIdleChecks++;
    const event: LearningEvent = {
      ...base,
      eventType: 'idle_detected',
      idleReason: 'no_interaction' as IdleReason,
      idleDurationMs: MONITOR_INTERVAL_MS,
      consecutiveIdleChecks: buffer.consecutiveIdleChecks,
    };
    const nudge = getNudge(buffer.consecutiveIdleChecks);
    return { event, nudge };
  }

  // Scroll-only, minimal
  const hasOnlyScroll = recentEvents.every((e) => e.type === 'scroll');
  if (hasOnlyScroll && recentEvents.length < 3) {
    const event: LearningEvent = {
      ...base,
      eventType: 'idle_detected',
      idleReason: 'passive_scroll' as IdleReason,
      idleDurationMs: 0,
      consecutiveIdleChecks: 0,
    };
    return { event, nudge: null };
  }

  // Active — reset
  buffer.consecutiveIdleChecks = 0;
  return { event: null, nudge: null };
}

function getNudge(checks: number): string | null {
  if (checks === 2) return "Still with me? Let me know if you'd like me to explain anything about this section!";
  if (checks >= 3) return "Looks like you might need a break. Want a quick recap of what we've covered so far?";
  return null;
}

export function getTabReturnNudge(sectionTitle: string): string {
  return `Welcome back! We were looking at "${sectionTitle}". Want a quick refresher before we continue?`;
}

export function getBoredomProbeNudge(): string {
  return "That was quick! Want me to challenge you with something harder, or are you ready for the assessment?";
}
