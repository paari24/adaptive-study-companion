'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  BehavioralState,
  LearningEvent,
  Message,
  SessionData,
  SectionResult,
  Topic,
  TopicSection,
  ActiveState,
} from '../engine/types';
import {
  createInitialBehavioralState,
  processEvent,
  decayScores,
  resolveState,
  DECAY_INTERVAL_MS,
} from '../engine/stateDetector';
import {
  ActivityBuffer,
  createActivityBuffer,
  runMonitorCheck,
  getTabReturnNudge,
  getBoredomProbeNudge,
  MONITOR_INTERVAL_MS,
} from '../engine/interactionMonitor';

// ─── State ────────────────────────────────────────────────────────────────────

interface SessionState {
  topic: Topic | null;
  currentSectionIndex: number;
  completedSections: string[];
  sectionScores: Record<string, number>;
  sectionResults: Record<string, SectionResult>;
  behavioralState: BehavioralState;
  eventLog: LearningEvent[];
  chatHistory: Record<string, Message[]>;
  sessionStartTime: number;
  totalTimeSpentMs: number;
  isInAssessment: boolean;
  assessmentCompleted: boolean;
  currentAssessmentSectionId: string | null;
  showSummary: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD_TOPIC'; topic: Topic }
  | { type: 'DISPATCH_EVENT'; event: LearningEvent; sessionStartTime: number }
  | { type: 'DECAY_SCORES' }
  | { type: 'START_ASSESSMENT'; sectionId: string }
  | { type: 'COMPLETE_ASSESSMENT'; sectionId: string; score: number; totalQuestions: number }
  | { type: 'NEXT_SECTION' }
  | { type: 'SEND_CHAT_MESSAGE'; sectionId: string; message: Message }
  | { type: 'RECEIVE_CHAT_RESPONSE'; sectionId: string; message: Message }
  | { type: 'INJECT_NUDGE'; sectionId: string; text: string }
  | { type: 'LOAD_SESSION'; data: SessionData; topic: Topic }
  | { type: 'SHOW_SUMMARY' }
  | { type: 'RESET' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function initialState(): SessionState {
  return {
    topic: null,
    currentSectionIndex: 0,
    completedSections: [],
    sectionScores: {},
    sectionResults: {},
    behavioralState: createInitialBehavioralState(),
    eventLog: [],
    chatHistory: {},
    sessionStartTime: Date.now(),
    totalTimeSpentMs: 0,
    isInAssessment: false,
    assessmentCompleted: false,
    currentAssessmentSectionId: null,
    showSummary: false,
  };
}

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'LOAD_TOPIC': {
      return {
        ...initialState(),
        topic: action.topic,
        sessionStartTime: Date.now(),
      };
    }

    case 'DISPATCH_EVENT': {
      const newBehavioral = processEvent(
        action.event,
        state.behavioralState,
        action.sessionStartTime
      );
      return {
        ...state,
        behavioralState: newBehavioral,
        eventLog: [...state.eventLog, action.event],
      };
    }

    case 'DECAY_SCORES': {
      const decayed = decayScores(state.behavioralState);
      const newState = resolveState(decayed);
      return {
        ...state,
        behavioralState: { ...decayed, activeState: newState },
      };
    }

    case 'START_ASSESSMENT': {
      return {
        ...state,
        isInAssessment: true,
        assessmentCompleted: false,
        currentAssessmentSectionId: action.sectionId,
      };
    }

    case 'COMPLETE_ASSESSMENT': {
      const section = state.topic?.sections[state.currentSectionIndex];
      const result: SectionResult = {
        sectionId: action.sectionId,
        sectionTitle: section?.title ?? '',
        score: action.score,
        totalQuestions: action.totalQuestions,
        timeSpentMs: Date.now() - state.sessionStartTime,
        peakStruggleScore: state.behavioralState.struggleScore,
        peakBoredomScore: state.behavioralState.boredomScore,
        peakFatigueScore: state.behavioralState.fatigueScore,
        stateChanges: state.behavioralState.stateHistory,
      };
      return {
        ...state,
        isInAssessment: false,
        assessmentCompleted: true,
        completedSections: [...state.completedSections, action.sectionId],
        sectionScores: { ...state.sectionScores, [action.sectionId]: action.score },
        sectionResults: { ...state.sectionResults, [action.sectionId]: result },
      };
    }

    case 'NEXT_SECTION': {
      const nextIdx = state.currentSectionIndex + 1;
      const totalSections = state.topic?.sections.length ?? 0;
      if (nextIdx >= totalSections) {
        return { ...state, showSummary: true };
      }
      return {
        ...state,
        currentSectionIndex: nextIdx,
        assessmentCompleted: false,
        currentAssessmentSectionId: null,
        behavioralState: {
          ...state.behavioralState,
          aiInteractedThisSection: false,
          sectionScrollStartTime: null,
          consecutiveCorrect: 0,
          rapidCorrectStreak: 0,
        },
      };
    }

    case 'SEND_CHAT_MESSAGE': {
      const prev = state.chatHistory[action.sectionId] ?? [];
      return {
        ...state,
        chatHistory: {
          ...state.chatHistory,
          [action.sectionId]: [...prev, action.message],
        },
        behavioralState: {
          ...state.behavioralState,
          aiInteractedThisSection: true,
        },
      };
    }

    case 'RECEIVE_CHAT_RESPONSE':
    case 'INJECT_NUDGE': {
      const prev = state.chatHistory[action.sectionId] ?? [];
      const msg: Message =
        action.type === 'INJECT_NUDGE'
          ? {
              role: 'assistant',
              content: action.text,
              timestamp: Date.now(),
              isNudge: true,
            }
          : action.message;
      return {
        ...state,
        chatHistory: {
          ...state.chatHistory,
          [action.sectionId]: [...prev, msg],
        },
      };
    }

    case 'LOAD_SESSION': {
      return {
        ...state,
        topic: action.topic,
        currentSectionIndex: action.data.currentSectionIndex,
        completedSections: action.data.completedSections,
        sectionScores: action.data.sectionScores,
        sectionResults: action.data.sectionResults,
        behavioralState: {
          ...action.data.behavioralState,
          fatigueScore: 0, // reset fatigue on resume
        },
        eventLog: action.data.eventLog,
        chatHistory: action.data.chatHistory,
        sessionStartTime: Date.now(),
        totalTimeSpentMs: action.data.totalTimeSpentMs,
      };
    }

    case 'SHOW_SUMMARY': {
      return { ...state, showSummary: true };
    }

    case 'RESET': {
      return initialState();
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface LearningSessionContextValue {
  state: SessionState;
  dispatch: React.Dispatch<Action>;
  dispatchEvent: (event: Omit<LearningEvent, 'id' | 'sessionElapsedMs'>) => void;
  sendChatMessage: (sectionId: string, content: string) => Promise<void>;
  currentSection: TopicSection | null;
  currentMessages: Message[];
}

const LearningSessionContext = createContext<LearningSessionContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LearningSessionProvider({
  children,
  apiUrl,
  initialTopic,
}: {
  children: React.ReactNode;
  apiUrl: string;
  initialTopic?: Topic;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const s = initialState();
    if (initialTopic) {
      // Check localStorage for saved session
      try {
        const saved = typeof window !== 'undefined'
          ? localStorage.getItem(`session_${initialTopic.topicId}`)
          : null;
        if (saved) {
          const data: SessionData = JSON.parse(saved);
          return {
            ...s,
            topic: initialTopic,
            currentSectionIndex: data.currentSectionIndex,
            completedSections: data.completedSections,
            sectionScores: data.sectionScores,
            sectionResults: data.sectionResults ?? {},
            behavioralState: { ...data.behavioralState, fatigueScore: 0 },
            eventLog: data.eventLog ?? [],
            chatHistory: data.chatHistory ?? {},
            sessionStartTime: Date.now(),
            totalTimeSpentMs: data.totalTimeSpentMs ?? 0,
          };
        }
      } catch {}
      return { ...s, topic: initialTopic, sessionStartTime: Date.now() };
    }
    return s;
  });
  const sessionStartTimeRef = useRef(state.sessionStartTime);
  const activityBufferRef = useRef<ActivityBuffer | null>(null);
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const decayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabHiddenAtRef = useRef<number | null>(null);

  // Keep sessionStartTime in a ref so event callbacks don't stale-close
  useEffect(() => {
    sessionStartTimeRef.current = state.sessionStartTime;
  }, [state.sessionStartTime]);

  // ── Helper: generate event ─────────────────────────────────────────────────
  const dispatchEvent = useCallback(
    (event: Omit<LearningEvent, 'id' | 'sessionElapsedMs'>) => {
      const fullEvent: LearningEvent = {
        ...event,
        id: Math.random().toString(36).slice(2, 9),
        sessionElapsedMs: Date.now() - sessionStartTimeRef.current,
      } as LearningEvent;
      dispatch({
        type: 'DISPATCH_EVENT',
        event: fullEvent,
        sessionStartTime: sessionStartTimeRef.current,
      });
      return fullEvent;
    },
    []
  );

  // ── Score decay timer ──────────────────────────────────────────────────────
  useEffect(() => {
    decayIntervalRef.current = setInterval(() => {
      dispatch({ type: 'DECAY_SCORES' });
    }, DECAY_INTERVAL_MS);
    return () => {
      if (decayIntervalRef.current) clearInterval(decayIntervalRef.current);
    };
  }, []);

  // ── Interaction monitor ────────────────────────────────────────────────────
  const currentSection = state.topic?.sections[state.currentSectionIndex] ?? null;

  useEffect(() => {
    if (!currentSection || state.isInAssessment) {
      // Pause monitor during assessment or when no section
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
      return;
    }

    // Create / reset activity buffer when section changes
    activityBufferRef.current = createActivityBuffer(
      currentSection.sectionId,
      sessionStartTimeRef.current
    );

    // DOM listeners for activity
    const addEvent = (type: string) => {
      if (activityBufferRef.current) {
        activityBufferRef.current.events.push({ type, timestamp: Date.now() });
      }
    };
    const onMouseMove = () => addEvent('mousemove');
    const onScroll = () => addEvent('scroll');
    const onMouseUp = () => {
      if (window.getSelection()?.toString()) addEvent('text_select');
    };
    const onInput = () => addEvent('input');
    const onVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenAtRef.current = Date.now();
        if (activityBufferRef.current) {
          activityBufferRef.current.tabHiddenSince = tabHiddenAtRef.current;
        }
        dispatchEvent({
          eventType: 'tab_hidden',
          sectionId: currentSection.sectionId,
          timestamp: Date.now(),
        });
      } else {
        const hiddenAt = tabHiddenAtRef.current;
        const hiddenDuration = hiddenAt ? Date.now() - hiddenAt : 0;
        tabHiddenAtRef.current = null;
        if (activityBufferRef.current) {
          activityBufferRef.current.tabHiddenSince = null;
        }
        dispatchEvent({
          eventType: 'tab_visible',
          sectionId: currentSection.sectionId,
          timestamp: Date.now(),
          tabHiddenDurationMs: hiddenDuration,
        });
        if (hiddenDuration > 30_000) {
          const nudge = getTabReturnNudge(currentSection.title);
          dispatch({
            type: 'INJECT_NUDGE',
            sectionId: currentSection.sectionId,
            text: nudge,
          });
        }
      }
    };

    const throttledMouseMove = throttle(onMouseMove, 2000);
    document.addEventListener('mousemove', throttledMouseMove);
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('input', onInput, true);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Monitor polling
    monitorIntervalRef.current = setInterval(() => {
      if (!activityBufferRef.current) return;
      const result = runMonitorCheck(activityBufferRef.current);
      if (result.event) {
        dispatch({
          type: 'DISPATCH_EVENT',
          event: { ...result.event, id: Math.random().toString(36).slice(2, 9) },
          sessionStartTime: sessionStartTimeRef.current,
        });
      }
      if (result.nudge) {
        dispatch({
          type: 'INJECT_NUDGE',
          sectionId: currentSection.sectionId,
          text: result.nudge,
        });
      }
    }, MONITOR_INTERVAL_MS);

    return () => {
      document.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
  }, [currentSection?.sectionId, state.isInAssessment, dispatchEvent]);

  // ── Persist to localStorage whenever state changes ─────────────────────────
  useEffect(() => {
    if (!state.topic) return;
    const data: SessionData = {
      topicId: state.topic.topicId,
      currentSectionIndex: state.currentSectionIndex,
      completedSections: state.completedSections,
      sectionScores: state.sectionScores,
      sectionResults: state.sectionResults,
      behavioralState: state.behavioralState,
      eventLog: state.eventLog.slice(-100), // keep last 100 events
      chatHistory: state.chatHistory,
      sessionStartTime: state.sessionStartTime,
      totalTimeSpentMs: Date.now() - state.sessionStartTime,
      lastAccessedAt: Date.now(),
    };
    localStorage.setItem(`session_${state.topic.topicId}`, JSON.stringify(data));
  }, [state]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendChatMessage = useCallback(
    async (sectionId: string, content: string) => {
      if (!state.topic) return;
      const userMsg: Message = {
        role: 'student',
        content,
        timestamp: Date.now(),
      };
      dispatch({ type: 'SEND_CHAT_MESSAGE', sectionId, message: userMsg });

      // Dispatch AI help event for state scoring
      dispatchEvent({
        eventType: 'ai_help_requested',
        sectionId,
        timestamp: Date.now(),
        aiHelpRequested: true,
      });

      const section = state.topic.sections[state.currentSectionIndex];
      const history = state.chatHistory[sectionId] ?? [];

      try {
        const res = await fetch(`${apiUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicId: state.topic.topicId,
            topicName: state.topic.title,
            sectionId,
            sectionContent: section?.content ?? '',
            sectionTitle: section?.title ?? '',
            studentMessage: content,
            conversationHistory: history.map((m) => ({
              role: m.role === 'student' ? 'user' : 'assistant',
              content: m.content,
            })),
            activeState: state.behavioralState.activeState,
          }),
        });
        const data = await res.json();
        const aiMsg: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        };
        dispatch({ type: 'RECEIVE_CHAT_RESPONSE', sectionId, message: aiMsg });
      } catch {
        const errMsg: Message = {
          role: 'assistant',
          content: "I'm having trouble connecting. Let me know if you'd like to try again!",
          timestamp: Date.now(),
        };
        dispatch({ type: 'RECEIVE_CHAT_RESPONSE', sectionId, message: errMsg });
      }
    },
    [state, dispatchEvent, apiUrl]
  );

  const currentMessages = currentSection
    ? (state.chatHistory[currentSection.sectionId] ?? [])
    : [];

  return (
    <LearningSessionContext.Provider
      value={{ state, dispatch, dispatchEvent, sendChatMessage, currentSection, currentMessages }}
    >
      {children}
    </LearningSessionContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLearningSession() {
  const ctx = useContext(LearningSessionContext);
  if (!ctx) throw new Error('useLearningSession must be used within LearningSessionProvider');
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function throttle<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let last = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  }) as T;
}
