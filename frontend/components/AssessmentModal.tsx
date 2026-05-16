'use client';

import { useEffect, useRef, useState } from 'react';
import { useLearningSession } from '../context/LearningSessionContext';
import { selectAssessment, getAdaptation } from '../engine/adaptationEngine';
import { Assessment } from '../engine/types';
import MCQQuestion from './QuestionRenderers/MCQQuestion';
import FillBlankQuestion from './QuestionRenderers/FillBlankQuestion';
import ExplainQuestion from './QuestionRenderers/ExplainQuestion';
import MatchQuestion from './QuestionRenderers/MatchQuestion';
import ScenarioQuestion from './QuestionRenderers/ScenarioQuestion';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function AssessmentModal() {
  const { state, dispatch, dispatchEvent, currentSection } = useLearningSession();
  const { behavioralState } = state;
  const adaptation = getAdaptation(behavioralState.activeState);

  const [questions, setQuestions] = useState<Assessment[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string; correct: boolean; timeTakenMs: number; changes: number }>>({});
  const [showResult, setShowResult] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintTimer, setHintTimer] = useState(15);
  const [timerValue, setTimerValue] = useState(adaptation.timerSeconds);
  const [timerExpired, setTimerExpired] = useState(false);
  const questionStartRef = useRef<number>(Date.now());

  // Initialize questions
  useEffect(() => {
    if (!currentSection) return;
    const qs = selectAssessment(currentSection, behavioralState.activeState);
    setQuestions(qs);
    setCurrentIdx(0);
    setAnswers({});
    setShowResult(false);

    dispatchEvent({
      eventType: 'assessment_started',
      sectionId: currentSection.sectionId,
      timestamp: Date.now(),
    });
  }, [currentSection?.sectionId]);

  const currentQ = questions[currentIdx];

  // Reset per-question state
  useEffect(() => {
    questionStartRef.current = Date.now();
    setHintVisible(adaptation.hintsPreloaded);
    setHintTimer(15);
    setTimerValue(adaptation.timerSeconds);
    setTimerExpired(false);
  }, [currentIdx, currentSection?.sectionId]);

  // Hint timer (show after 15s if struggling)
  useEffect(() => {
    if (!adaptation.hintsEnabled || adaptation.hintsPreloaded || hintVisible) return;
    if (!currentQ) return;
    const interval = setInterval(() => {
      setHintTimer((t) => {
        if (t <= 1) { setHintVisible(true); clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIdx, currentQ?.questionId, adaptation.hintsEnabled, adaptation.hintsPreloaded, hintVisible]);

  // Countdown timer (bored state)
  useEffect(() => {
    if (!adaptation.timerEnabled || !currentQ) return;
    const interval = setInterval(() => {
      setTimerValue((t) => {
        if (t <= 1) { setTimerExpired(true); clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIdx, currentQ?.questionId, adaptation.timerEnabled]);

  const handleAnswer = async (answer: string, changes = 0) => {
    if (!currentQ || !currentSection || answers[currentQ.questionId]) return;
    const now = Date.now();
    const timeTakenMs = now - questionStartRef.current;

    let isCorrect = false;
    let freeTextLength: number | undefined;

    if (currentQ.type === 'explain') {
      freeTextLength = answer.length;
      // Evaluate via API
      try {
        const res = await fetch(`${API_URL}/api/evaluate-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicId: state.topic?.topicId,
            sectionId: currentSection.sectionId,
            question: currentQ.question,
            studentAnswer: answer,
            keyConcepts: currentSection.keyConcepts,
          }),
        });
        const data = await res.json();
        isCorrect = data.isCorrect ?? answer.length >= 20;
      } catch {
        isCorrect = answer.length >= 30;
      }
    } else if (currentQ.type === 'match') {
      isCorrect = answer === currentQ.correctAnswer;
    } else {
      isCorrect = answer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();
    }

    dispatchEvent({
      eventType: 'answer_submitted',
      sectionId: currentSection.sectionId,
      questionId: currentQ.questionId,
      questionType: currentQ.type,
      difficultyLevel: currentQ.difficulty,
      displayedAtMs: questionStartRef.current,
      answeredAtMs: now,
      timeTakenMs,
      selectedAnswer: answer,
      isCorrect,
      attemptNumber: 1,
      answerChangesCount: changes,
      aiHelpRequested: hintVisible && !adaptation.hintsPreloaded,
      freeTextLength,
      timestamp: now,
    });

    setAnswers((prev) => ({
      ...prev,
      [currentQ.questionId]: { answer, correct: isCorrect, timeTakenMs, changes },
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleComplete = () => {
    if (!currentSection) return;
    const total = questions.length;
    const correct = Object.values(answers).filter((a) => a.correct).length;
    const score = Math.round((correct / total) * 100);
    dispatch({
      type: 'COMPLETE_ASSESSMENT',
      sectionId: currentSection.sectionId,
      score,
      totalQuestions: total,
    });
  };

  if (!currentQ || questions.length === 0) return null;

  const answered = !!answers[currentQ.questionId];
  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const totalAnswered = Object.keys(answers).length;

  if (showResult) {
    const score = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center">
          <div className={`text-5xl mb-4 ${score >= 70 ? '✅' : score >= 50 ? '🟡' : '❌'}`}>
            {score >= 70 ? '🎉' : score >= 50 ? '👍' : '📚'}
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{score}%</h3>
          <p className="text-slate-400 mb-1">
            {correctCount} of {questions.length} correct
          </p>
          <p className="text-slate-500 text-sm mb-8">
            {score >= 80 ? 'Excellent work!' : score >= 60 ? 'Good effort!' : 'Keep reviewing this section!'}
          </p>
          <button
            onClick={handleComplete}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Assessment</p>
            <p className="text-sm text-white font-medium mt-0.5">
              Question {currentIdx + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {adaptation.timerEnabled && !answered && (
              <div className={`text-sm font-mono font-bold ${timerValue <= 10 ? 'text-red-400' : 'text-amber-400'}`}>
                ⏱ {timerValue}s
              </div>
            )}
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < currentIdx
                      ? answers[questions[i].questionId]?.correct ? 'bg-green-500' : 'bg-red-500'
                      : i === currentIdx
                      ? 'bg-indigo-400'
                      : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="px-6 py-6">
          {currentQ.type === 'mcq' && (
            <MCQQuestion
              question={currentQ}
              optionCount={adaptation.mcqOptionCount}
              onAnswer={handleAnswer}
              answered={answered}
              correctAnswer={currentQ.correctAnswer}
              selectedAnswer={answers[currentQ.questionId]?.answer}
            />
          )}
          {currentQ.type === 'fill_blank' && (
            <FillBlankQuestion
              question={currentQ}
              onAnswer={handleAnswer}
              answered={answered}
              correctAnswer={currentQ.correctAnswer}
            />
          )}
          {currentQ.type === 'explain' && (
            <ExplainQuestion
              question={currentQ}
              onAnswer={handleAnswer}
              answered={answered}
              isCorrect={answers[currentQ.questionId]?.correct}
            />
          )}
          {currentQ.type === 'match' && (
            <MatchQuestion
              question={currentQ}
              onAnswer={handleAnswer}
              answered={answered}
              isCorrect={answers[currentQ.questionId]?.correct}
            />
          )}
          {currentQ.type === 'scenario' && (
            <ScenarioQuestion
              question={currentQ}
              optionCount={adaptation.mcqOptionCount}
              onAnswer={handleAnswer}
              answered={answered}
              correctAnswer={currentQ.correctAnswer}
              selectedAnswer={answers[currentQ.questionId]?.answer}
            />
          )}

          {/* Hint */}
          {(hintVisible || timerExpired) && currentQ.hint && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-xs font-semibold text-amber-400 mb-1">Hint</p>
              <p className="text-sm text-amber-200">{currentQ.hint}</p>
            </div>
          )}

          {/* Explanation after answer */}
          {answered && (
            <div className="mt-4 p-3 bg-slate-800 border border-slate-600 rounded-xl">
              <p className="text-xs font-semibold text-slate-400 mb-1">Explanation</p>
              <p className="text-sm text-slate-300">{currentQ.explanation}</p>
            </div>
          )}

          {/* Hint trigger for non-preloaded */}
          {adaptation.hintsEnabled && !adaptation.hintsPreloaded && !hintVisible && !answered && (
            <div className="mt-3 text-xs text-slate-600 text-center">
              Hint appears in {hintTimer}s
            </div>
          )}
        </div>

        {/* Footer */}
        {answered && (
          <div className="px-6 pb-6">
            <button
              onClick={handleNext}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {currentIdx < questions.length - 1 ? 'Next Question →' : 'See Results →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
