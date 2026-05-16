'use client';

import { Assessment } from '../../engine/types';
import MCQQuestion from './MCQQuestion';

interface Props {
  question: Assessment;
  optionCount: number;
  onAnswer: (answer: string, changes: number) => void;
  answered: boolean;
  correctAnswer: string;
  selectedAnswer?: string;
}

export default function ScenarioQuestion(props: Props) {
  const { question } = props;
  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Scenario-based question</p>
      {question.scenarioParagraph && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5 text-sm text-slate-300 leading-relaxed">
          {question.scenarioParagraph}
        </div>
      )}
      <MCQQuestion {...props} />
    </div>
  );
}
