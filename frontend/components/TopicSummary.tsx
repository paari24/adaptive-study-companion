'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLearningSession } from '../context/LearningSessionContext';

const STATE_COLORS: Record<string, string> = {
  engaged: 'bg-green-500',
  struggling: 'bg-amber-500',
  bored: 'bg-blue-500',
  fatigued: 'bg-red-500',
};

export default function TopicSummary() {
  const { state, dispatch } = useLearningSession();
  const router = useRouter();
  const savedRef = useRef(false);

  if (!state.topic) return null;

  const { topic, sectionScores, sectionResults, behavioralState, sessionStartTime, completedSections, totalTimeSpentMs } = state;
  const totalTimeMin = Math.round((Date.now() - sessionStartTime) / 60_000);
  const allScores = Object.values(sectionScores);
  const overallAccuracy = allScores.length
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  const weakSections = topic.sections.filter(
    (s) => (sectionResults[s.sectionId]?.peakStruggleScore ?? 0) >= 40
  );

  // Save session to DB once on mount
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    const peakStruggle = Math.max(0, ...Object.values(sectionResults).map((r) => r.peakStruggleScore));
    const peakBoredom  = Math.max(0, ...Object.values(sectionResults).map((r) => r.peakBoredomScore));
    const peakFatigue  = Math.max(0, ...Object.values(sectionResults).map((r) => r.peakFatigueScore));

    let userMobile: string | null = null;
    try {
      const stored = localStorage.getItem('user_identity');
      if (stored) userMobile = JSON.parse(stored).mobile ?? null;
    } catch {}

    fetch('/api/sessions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: state.sessionId,
        topicId: topic.topicId,
        topicTitle: topic.title,
        sessionStartTime,
        totalTimeSpentMs: totalTimeSpentMs || Date.now() - sessionStartTime,
        completedSections,
        totalSections: topic.sections.length,
        sectionResults: Object.values(sectionResults),
        stateHistory: behavioralState.stateHistory,
        finalState: behavioralState.activeState,
        peakStruggle,
        peakBoredom,
        peakFatigue,
        overallScore: overallAccuracy,
        userMobile,
      }),
    }).catch(() => {}); // fire-and-forget
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">
            {overallAccuracy >= 80 ? '🏆' : overallAccuracy >= 60 ? '👍' : '📚'}
          </div>
          <h1 className="text-3xl font-bold mb-2">Topic Complete!</h1>
          <p className="text-slate-400">{topic.title}</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Overall Accuracy', value: `${overallAccuracy}%` },
            { label: 'Time Spent', value: `${totalTimeMin} min` },
            { label: 'Sections Completed', value: `${state.completedSections.length}/${topic.sections.length}` },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Per-section breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Section Breakdown</h2>
          <div className="space-y-3">
            {topic.sections.map((section) => {
              const score = sectionScores[section.sectionId];
              const result = sectionResults[section.sectionId];
              const done = score !== undefined;
              return (
                <div key={section.sectionId} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-green-400' : 'bg-slate-600'}`} />
                  <span className="text-sm text-slate-300 flex-1">{section.title}</span>
                  {done ? (
                    <div className="flex items-center gap-3">
                      {result && (
                        <>
                          <span className="text-xs text-amber-400">S:{result.peakStruggleScore}</span>
                          <span className="text-xs text-blue-400">B:{result.peakBoredomScore}</span>
                          <span className="text-xs text-red-400">F:{result.peakFatigueScore}</span>
                        </>
                      )}
                      <span className={`text-sm font-semibold ${score >= 70 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {Math.round(score)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">Not completed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* State timeline */}
        {behavioralState.stateHistory.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Learning State Timeline</h2>
            <div className="flex items-end gap-1 h-12">
              {behavioralState.stateHistory.map((snap, i) => (
                <div
                  key={i}
                  title={`${snap.state} at ${new Date(snap.timestamp).toLocaleTimeString()}`}
                  className={`flex-1 rounded-sm ${STATE_COLORS[snap.state] ?? 'bg-slate-600'}`}
                  style={{ height: `${Math.max(20, (i / Math.max(behavioralState.stateHistory.length, 1)) * 100)}%` }}
                />
              ))}
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              {Object.entries(STATE_COLORS).map(([state, color]) => (
                <span key={state} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="capitalize">{state}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weak concepts */}
        {weakSections.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-amber-400 mb-3">Concepts to Review</h2>
            <ul className="space-y-2">
              {weakSections.map((s) => (
                <li key={s.sectionId} className="text-sm text-amber-200">
                  • <span className="font-medium">{s.title}</span> — your struggle score peaked here. Review:{' '}
                  {s.keyConcepts.join(', ')}.
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              localStorage.removeItem(`session_${topic.topicId}`);
              router.push('/');
            }}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Start Another Topic
          </button>
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-medium transition-colors"
          >
            Restart This Topic
          </button>
        </div>
      </div>
    </div>
  );
}
