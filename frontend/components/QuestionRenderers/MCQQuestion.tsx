'use client';

import { useState } from 'react';
import { Assessment } from '../../engine/types';

interface Props {
  question: Assessment;
  optionCount: number;
  onAnswer: (answer: string, changes: number) => void;
  answered: boolean;
  correctAnswer: string;
  selectedAnswer?: string;
}

export default function MCQQuestion({ question, optionCount, onAnswer, answered, correctAnswer, selectedAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [changesCount, setChangesCount] = useState(0);

  const options = (question.options ?? []).slice(0, optionCount);

  const handleSelect = (opt: string) => {
    if (answered) return;
    if (selected !== null && selected !== opt) setChangesCount((c) => c + 1);
    setSelected(opt);
  };

  const handleSubmit = () => {
    if (!selected || answered) return;
    onAnswer(selected, changesCount);
  };

  return (
    <div>
      <p className="text-white font-medium text-lg mb-6 leading-relaxed">{question.question}</p>
      <div className="space-y-3">
        {options.map((opt) => {
          const isSelected = selected === opt || selectedAnswer === opt;
          const isCorrect = opt === correctAnswer;
          const isWrong = answered && isSelected && !isCorrect;
          const showCorrect = answered && isCorrect;
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={answered}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                showCorrect
                  ? 'border-green-500 bg-green-500/10 text-green-300'
                  : isWrong
                  ? 'border-red-500 bg-red-500/10 text-red-300'
                  : isSelected && !answered
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-xs ${
                  isSelected || showCorrect ? 'border-current' : 'border-slate-600'
                }`}>
                  {showCorrect ? '✓' : isWrong ? '✗' : isSelected && !answered ? '●' : ''}
                </span>
                {opt}
              </span>
            </button>
          );
        })}
      </div>
      {!answered && selected && (
        <button
          onClick={handleSubmit}
          className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors"
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}
