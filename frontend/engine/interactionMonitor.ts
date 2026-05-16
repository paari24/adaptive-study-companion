import { LearningEvent, IdleReason } from './types';
import { DEMO_MODE } from './stateDetector';

export const MONITOR_INTERVAL_MS = DEMO_MODE ? 10_000 : 30_000;
export const TAB_HIDDEN_THRESHOLD_MS = 15_000;
const IDLE_NUDGE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
// Reading content without interaction is normal — don't fire idle events for this many checks
const IDLE_GRACE_CHECKS = DEMO_MODE ? 6 : 10; // 60s grace in demo, 5 min in prod

export interface ActivityBuffer {
  lastCheckTimestamp: number;
  lastActivityTimestamp: number;
  events: Array<{ type: string; timestamp: number }>;
  consecutiveIdleChecks: number;
  areYouThereNudgeSent: boolean;
  tabHiddenSince: number | null;
  sessionStartTime: number;
  sectionId: string;
}

export function createActivityBuffer(sectionId: string, sessionStartTime: number): ActivityBuffer {
  return {
    lastCheckTimestamp: Date.now(),
    lastActivityTimestamp: Date.now(),
    events: [],
    consecutiveIdleChecks: 0,
    areYouThereNudgeSent: false,
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
): { event: LearningEvent | null; nudge: string | null } {
  const now = Date.now();
  const recentEvents = buffer.events.filter((e) => e.timestamp > buffer.lastCheckTimestamp);
  buffer.events = buffer.events.filter((e) => e.timestamp > now - 60_000);
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

  // Active — real events present
  if (recentEvents.length > 0) {
    const hasOnlyScroll = recentEvents.every((e) => e.type === 'scroll');
    const isPassive = hasOnlyScroll && recentEvents.length < 3;

    if (!isPassive) {
      // Genuine activity — reset idle tracking
      buffer.consecutiveIdleChecks = 0;
      buffer.lastActivityTimestamp = now;
      buffer.areYouThereNudgeSent = false;
      return { event: null, nudge: null };
    }

    // Passive scroll only — don't reset idle timer
    const event: LearningEvent = {
      ...base,
      eventType: 'idle_detected',
      idleReason: 'passive_scroll' as IdleReason,
      idleDurationMs: 0,
      consecutiveIdleChecks: 0,
    };
    return { event, nudge: null };
  }

  // No activity
  buffer.consecutiveIdleChecks++;
  const idleDurationMs = now - buffer.lastActivityTimestamp;

  // Fire "Are you there?" nudge once after 3 minutes of no interaction
  let nudge: string | null = null;
  if (idleDurationMs >= IDLE_NUDGE_THRESHOLD_MS && !buffer.areYouThereNudgeSent) {
    nudge = "Are you there? 👋 Let me know if you'd like me to explain anything!";
    buffer.areYouThereNudgeSent = true;
  }

  // Grace period: reading content without moving the mouse is normal — don't penalize yet
  if (buffer.consecutiveIdleChecks <= IDLE_GRACE_CHECKS) {
    return { event: null, nudge };
  }

  const event: LearningEvent = {
    ...base,
    eventType: 'idle_detected',
    idleReason: 'no_interaction' as IdleReason,
    idleDurationMs,
    consecutiveIdleChecks: buffer.consecutiveIdleChecks,
  };

  return { event, nudge };
}

export function getTabReturnNudge(sectionTitle: string): string {
  return `Welcome back! We were looking at "${sectionTitle}". Want a quick refresher before we continue?`;
}

export function getBoredomProbeNudge(): string {
  return "That was quick! Want me to challenge you with something harder, or are you ready for the assessment?";
}
