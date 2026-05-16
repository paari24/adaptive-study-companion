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
  const parts = question.question.split('___');
  const blankCount = parts.length - 1;
  const [values, setValues] = useState<string[]>(() => new Array(blankCount).fill(''));

  const correctParts = correctAnswer.split(/,\s*/);

  const handleChange = (index: number, text: string) => {
    setValues((prev) => prev.map((v, i) => (i === index ? text : v)));
  };

  const handleSubmit = () => {
    if (values.some((v) => !v.trim()) || answered) return;
    onAnswer(values.map((v) => v.trim()).join(', '));
  };

  const allCorrect = answered && values.every((v, i) =>
    v.toLowerCase().trim() === (correctParts[i] ?? '').toLowerCase().trim()
  );

  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-4">Fill in the blank</p>
      <div className="flex flex-wrap items-center gap-2 text-lg text-white font-medium leading-relaxed mb-6">
        {parts.map((part, i) => {
          const blankCorrect = answered &&
            (values[i] ?? '').toLowerCase().trim() === (correctParts[i] ?? '').toLowerCase().trim();
          return (
            <span key={i} className="flex items-center gap-2 flex-wrap">
              <span>{part}</span>
              {i < blankCount && (
                <input
                  type="text"
                  value={values[i]}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  disabled={answered}
                  placeholder="type here..."
                  className={`border-b-2 bg-transparent px-2 py-1 text-lg focus:outline-none transition-colors min-w-[140px] ${
                    answered
                      ? blankCorrect
                        ? 'border-green-500 text-green-300'
                        : 'border-red-500 text-red-300'
                      : 'border-indigo-500 text-white placeholder-slate-600'
                  }`}
                />
              )}
            </span>
          );
        })}
      </div>
      {answered && (
        <div className={`text-sm ${allCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {allCorrect ? '✓ Correct!' : `✗ Correct answer: ${correctParts.join(', ')}`}
        </div>
      )}
      {!answered && (
        <button
          onClick={handleSubmit}
          disabled={values.some((v) => !v.trim())}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition-colors"
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}
