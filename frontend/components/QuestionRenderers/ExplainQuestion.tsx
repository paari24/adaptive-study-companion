'use client';

import { useState } from 'react';
import { Assessment } from '../../engine/types';

interface Props {
  question: Assessment;
  onAnswer: (answer: string) => void;
  answered: boolean;
  isCorrect?: boolean;
}

const MIN_CHARS = 20;

export default function ExplainQuestion({ question, onAnswer, answered, isCorrect }: Props) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (value.trim().length < MIN_CHARS || answered || submitting) return;
    setSubmitting(true);
    await onAnswer(value.trim());
    setSubmitting(false);
  };

  const charCount = value.length;
  const ready = charCount >= MIN_CHARS;

  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-4">Explain in your own words</p>
      <p className="text-white font-medium text-lg mb-5 leading-relaxed">{question.question}</p>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={answered || submitting}
          rows={5}
          placeholder="Write your explanation here..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <div className={`absolute bottom-3 right-3 text-xs ${ready ? 'text-green-400' : 'text-slate-500'}`}>
          {charCount}/{MIN_CHARS}
        </div>
      </div>
      {!ready && !answered && (
        <p className="text-xs text-slate-500 mt-2">Write at least {MIN_CHARS} characters to submit.</p>
      )}
      {answered && (
        <div className={`mt-3 text-sm font-medium ${isCorrect ? 'text-green-400' : 'text-amber-400'}`}>
          {isCorrect ? '✓ Good answer — key concepts covered!' : '⚠ Partially correct — see explanation below.'}
        </div>
      )}
      {!answered && (
        <button
          onClick={handleSubmit}
          disabled={!ready || submitting}
          className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition-colors"
        >
          {submitting ? 'Evaluating...' : 'Submit Answer'}
        </button>
      )}
    </div>
  );
}
