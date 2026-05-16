'use client';

import { useState } from 'react';
import { Assessment } from '../../engine/types';

interface Props {
  question: Assessment;
  onAnswer: (answer: string) => void;
  answered: boolean;
  correctAnswer: string;
}

export default function FillBlankQuestion({ question, onAnswer, answered, correctAnswer }: Props) {
  const [value, setValue] = useState('');

  const parts = question.question.split('___');

  const handleSubmit = () => {
    if (!value.trim() || answered) return;
    onAnswer(value.trim());
  };

  const isCorrect = answered && value.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-4">Fill in the blank</p>
      <div className="flex flex-wrap items-center gap-2 text-lg text-white font-medium leading-relaxed mb-6">
        {parts.map((part, i) => (
          <span key={i} className="flex items-center gap-2 flex-wrap">
            <span>{part}</span>
            {i < parts.length - 1 && (
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={answered}
                placeholder="type here..."
                className={`border-b-2 bg-transparent px-2 py-1 text-lg focus:outline-none transition-colors min-w-[140px] ${
                  answered
                    ? isCorrect
                      ? 'border-green-500 text-green-300'
                      : 'border-red-500 text-red-300'
                    : 'border-indigo-500 text-white placeholder-slate-600'
                }`}
              />
            )}
          </span>
        ))}
      </div>
      {answered && (
        <div className={`text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {isCorrect ? '✓ Correct!' : `✗ Correct answer: ${correctAnswer}`}
        </div>
      )}
      {!answered && (
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition-colors"
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}
