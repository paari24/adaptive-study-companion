'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLearningSession } from '../context/LearningSessionContext';

export default function ContentPanel() {
  const { state, dispatch, dispatchEvent, currentSection } = useLearningSession();
  const { completedSections, isInAssessment } = state;
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionStartRef = useRef<number>(Date.now());
  const scrollStartRef = useRef<number | null>(null);
  const reachedBottomRef = useRef(false);

  const section = currentSection;
  const isCompleted = section ? completedSections.includes(section.sectionId) : false;

  // Reset when section changes — before any early return
  useEffect(() => {
    if (!section) return;
    sectionStartRef.current = Date.now();
    scrollStartRef.current = Date.now();
    reachedBottomRef.current = false;

    dispatchEvent({
      eventType: 'section_started',
      sectionId: section.sectionId,
      timestamp: Date.now(),
    });

    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.sectionId]);

  if (!state.topic || !currentSection) return null;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    dispatchEvent({
      eventType: 'content_scrolled',
      sectionId: section!.sectionId,
      timestamp: Date.now(),
    });

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    if (atBottom && !reachedBottomRef.current) {
      reachedBottomRef.current = true;
      const elapsed = scrollStartRef.current ? Date.now() - scrollStartRef.current : Infinity;
      if (elapsed < 10_000) {
        dispatchEvent({ eventType: 'rapid_scroll', sectionId: section!.sectionId, timestamp: Date.now() });
      }
    }
  };

  const handleNextSection = () => {
    if (!isCompleted) {
      dispatch({ type: 'START_ASSESSMENT', sectionId: section!.sectionId });
    } else {
      dispatch({ type: 'NEXT_SECTION' });
    }
  };

  const handlePrevSection = () => {
    if (state.currentSectionIndex > 0) {
      dispatch({ type: 'GO_TO_SECTION', index: state.currentSectionIndex - 1 });
    }
  };

  const sections = state.topic.sections;
  const isLastSection = state.currentSectionIndex >= sections.length - 1;
  const isFirstSection = state.currentSectionIndex === 0;
  const activeState = state.behavioralState.activeState;
  const isBlocked = !isCompleted && (activeState === 'fatigued' || activeState === 'bored');

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Section tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-slate-800 overflow-x-auto">
        {sections.map((s, idx) => {
          const done = completedSections.includes(s.sectionId);
          const active = idx === state.currentSectionIndex;
          const locked = idx > state.currentSectionIndex && !done;
          const clickable = !active && !locked;
          return (
            <button
              key={s.sectionId}
              disabled={!clickable}
              onClick={() => clickable && dispatch({ type: 'GO_TO_SECTION', index: idx })}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : done
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer'
                  : locked
                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {done ? '✓ ' : ''}{idx + 1}. {s.title}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <h2 className="text-2xl font-bold text-white mb-6">{section!.title}</h2>
        <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-headings:text-white prose-strong:text-white prose-li:text-slate-300">
          <ReactMarkdown>{section!.content}</ReactMarkdown>
        </div>

        {/* Key concepts */}
        <div className="mt-8 p-4 bg-slate-900 rounded-xl border border-slate-700">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Key Concepts</p>
          <div className="flex flex-wrap gap-2">
            {section!.keyConcepts.map((c) => (
              <span key={c} className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm px-3 py-1 rounded-full">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action area */}
      <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50">
        {isCompleted ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {!isFirstSection && (
                <button
                  onClick={handlePrevSection}
                  className="text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  ← Previous
                </button>
              )}
              <span className="text-green-400 text-sm font-medium">
                ✓ Score: {Math.round(state.sectionScores[section!.sectionId] ?? 0)}%
              </span>
            </div>
            {!isLastSection && (
              <button
                onClick={handleNextSection}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Next Section →
              </button>
            )}
          </div>
        ) : isBlocked ? (
          <div className={`w-full px-4 py-3 rounded-xl text-sm border ${
            activeState === 'fatigued'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
          }`}>
            <p className="text-center font-medium mb-2">
              {activeState === 'fatigued'
                ? '😴 You seem fatigued. Take a short break before continuing — your score will thank you!'
                : '😶 You seem disengaged. Try reading the content or asking the AI a question before moving on.'}
            </p>
            <button
              onClick={handleNextSection}
              className="w-full mt-1 py-1.5 rounded-lg text-xs font-semibold border border-current opacity-60 hover:opacity-100 transition-opacity"
            >
              I&apos;m ready now →
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {!isFirstSection && (
              <button
                onClick={handlePrevSection}
                className="text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
              >
                ← Previous
              </button>
            )}
            <button
              onClick={handleNextSection}
              disabled={isInAssessment}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Next Section →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
