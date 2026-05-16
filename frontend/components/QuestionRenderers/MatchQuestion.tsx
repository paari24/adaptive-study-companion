'use client';

import { useState } from 'react';
import { Assessment, MatchPair } from '../../engine/types';

interface Props {
  question: Assessment;
  onAnswer: (answer: string) => void;
  answered: boolean;
  isCorrect?: boolean;
}

export default function MatchQuestion({ question, onAnswer, answered, isCorrect }: Props) {
  const pairs: MatchPair[] = question.pairs ?? [];
  const lefts = pairs.map((p) => p.left);
  const rights = [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5);
  const [rights_state] = useState(rights);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const handleLeftClick = (left: string) => {
    if (answered) return;
    setSelectedLeft(left === selectedLeft ? null : left);
  };

  const handleRightClick = (right: string) => {
    if (answered || !selectedLeft) return;
    setMatches((prev) => {
      const next = { ...prev };
      // Remove existing mapping for this right
      Object.keys(next).forEach((k) => { if (next[k] === right) delete next[k]; });
      next[selectedLeft] = right;
      return next;
    });
    setSelectedLeft(null);
  };

  const handleSubmit = () => {
    if (answered || Object.keys(matches).length < pairs.length) return;
    const answerStr = pairs.map((p) => `${p.left}=${matches[p.left]}`).join(',');
    onAnswer(answerStr);
  };

  const allMatched = Object.keys(matches).length === pairs.length;

  const getPairStatus = (left: string) => {
    if (!answered) return null;
    const expectedRight = pairs.find((p) => p.left === left)?.right;
    return matches[left] === expectedRight ? 'correct' : 'wrong';
  };

  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-4">Match the following</p>
      <p className="text-white font-medium text-base mb-6">{question.question}</p>

      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500 mb-2">Click to select:</p>
          {lefts.map((left) => {
            const status = getPairStatus(left);
            return (
              <button
                key={left}
                onClick={() => handleLeftClick(left)}
                disabled={answered}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                  status === 'correct'
                    ? 'border-green-500 bg-green-500/10 text-green-300'
                    : status === 'wrong'
                    ? 'border-red-500 bg-red-500/10 text-red-300'
                    : selectedLeft === left
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : matches[left]
                    ? 'border-slate-600 bg-slate-700 text-slate-200'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                {left}
                {matches[left] && !answered && (
                  <span className="text-xs text-slate-500 block mt-0.5">→ {matches[left]}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500 mb-2">Then click to match:</p>
          {rights_state.map((right) => {
            const isUsed = Object.values(matches).includes(right);
            const isSelectedTarget = selectedLeft !== null;
            return (
              <button
                key={right}
                onClick={() => handleRightClick(right)}
                disabled={answered}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                  answered
                    ? 'border-slate-700 bg-slate-800 text-slate-400'
                    : isUsed
                    ? 'border-slate-600 bg-slate-700/50 text-slate-400'
                    : isSelectedTarget
                    ? 'border-indigo-400/50 bg-indigo-500/5 text-white hover:border-indigo-400'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                {right}
              </button>
            );
          })}
        </div>
      </div>

      {answered && (
        <div className={`mt-4 text-sm font-medium ${isCorrect ? 'text-green-400' : 'text-amber-400'}`}>
          {isCorrect ? '✓ All matched correctly!' : '⚠ Some matches were wrong — see correct pairs below.'}
        </div>
      )}

      {!answered && (
        <button
          onClick={handleSubmit}
          disabled={!allMatched}
          className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition-colors"
        >
          Submit Matches
        </button>
      )}
    </div>
  );
}
