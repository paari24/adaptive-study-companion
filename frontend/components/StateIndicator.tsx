'use client';

import { useLearningSession } from '../context/LearningSessionContext';
import { getAdaptation } from '../engine/adaptationEngine';

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <span className="text-xs text-slate-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-6 text-right">{value}</span>
    </div>
  );
}

export default function StateIndicator() {
  const { state } = useLearningSession();
  const { behavioralState, sessionStartTime } = state;
  const { activeState, struggleScore, boredomScore, fatigueScore } = behavioralState;

  const adaptation = getAdaptation(activeState);
  const elapsedMin = Math.floor((Date.now() - sessionStartTime) / 60_000);
  const accuracy = state.completedSections.length > 0
    ? Math.round(
        Object.values(state.sectionScores).reduce((a, b) => a + b, 0) /
          state.completedSections.length
      )
    : null;

  const stateConfig = {
    engaged: { label: 'Engaged', bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-400' },
    struggling: { label: 'Struggling', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400' },
    bored: { label: 'Bored', bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
    fatigued: { label: 'Fatigued', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
  }[activeState];

  return (
    <div className="border-t border-slate-800 bg-slate-900 px-4 py-2.5">
      <div className="flex items-center gap-6 flex-wrap">
        {/* State chip */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${stateConfig.bg} ${stateConfig.border}`}>
          <span className={`w-2 h-2 rounded-full ${stateConfig.dot} animate-pulse`} />
          <span className={`text-xs font-semibold ${stateConfig.text}`}>{stateConfig.label}</span>
        </div>

        {/* Score bars */}
        <div className="flex gap-4 flex-wrap">
          <ScoreBar label="Struggle" value={struggleScore} color="bg-amber-500" />
          <ScoreBar label="Boredom" value={boredomScore} color="bg-blue-500" />
          <ScoreBar label="Fatigue" value={fatigueScore} color="bg-red-500" />
        </div>

        {/* Adaptation */}
        <div className="flex items-center gap-3 text-xs text-slate-500 border-l border-slate-700 pl-4 ml-auto">
          <span>Diff: <span className="text-slate-300 capitalize">{adaptation.difficulty}</span></span>
          <span>Q: <span className="text-slate-300">{adaptation.questionCount}</span></span>
          <span>Hints: <span className="text-slate-300">{adaptation.hintsEnabled ? 'On' : 'Off'}</span></span>
          <span>⏱ {elapsedMin}m</span>
          {accuracy !== null && <span>Accuracy: <span className="text-slate-300">{accuracy}%</span></span>}
        </div>
      </div>
    </div>
  );
}
