'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLearningSession } from '../context/LearningSessionContext';

const MIN_READ_SPEED_WPM = 200;

export default function ContentPanel() {
  const { state, dispatch, dispatchEvent, currentSection } = useLearningSession();
  const { behavioralState, completedSections, isInAssessment, assessmentCompleted } = state;
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionStartRef = useRef<number>(Date.now());
  const scrollStartRef = useRef<number | null>(null);
  const reachedBottomRef = useRef(false);

  const [readTimeElapsed, setReadTimeElapsed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  if (!state.topic || !currentSection) return null;

  const section = currentSection;
  const minReadMs = (section.wordCount / MIN_READ_SPEED_WPM) * 60 * 1000;
  const isCompleted = completedSections.includes(section.sectionId);

  // Reset when section changes
  useEffect(() => {
    sectionStartRef.current = Date.now();
    scrollStartRef.current = Date.now();
    reachedBottomRef.current = false;
    setReadTimeElapsed(false);
    setTimeLeft(Math.ceil(minReadMs / 1000));

    dispatchEvent({
      eventType: 'section_started',
      sectionId: section.sectionId,
      timestamp: Date.now(),
    });

    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [section.sectionId]);

  // Read time countdown
  useEffect(() => {
    if (readTimeElapsed || isCompleted) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - sectionStartRef.current;
      const remaining = Math.max(0, Math.ceil((minReadMs - elapsed) / 1000));
      setTimeLeft(remaining);
      if (elapsed >= minReadMs) {
        setReadTimeElapsed(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [section.sectionId, readTimeElapsed, isCompleted, minReadMs]);

  // Scroll tracking
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    dispatchEvent({
      eventType: 'content_scrolled',
      sectionId: section.sectionId,
      timestamp: Date.now(),
    });

    // Detect rapid scroll to bottom
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    if (atBottom && !reachedBottomRef.current) {
      reachedBottomRef.current = true;
      const elapsed = scrollStartRef.current ? Date.now() - scrollStartRef.current : Infinity;
      if (elapsed < 10_000) {
        dispatchEvent({ eventType: 'rapid_scroll', sectionId: section.sectionId, timestamp: Date.now() });
      }
    }
  };

  const handleContinue = () => {
    dispatch({ type: 'START_ASSESSMENT', sectionId: section.sectionId });
  };

  const handleNextSection = () => {
    dispatch({ type: 'NEXT_SECTION' });
  };

  const sections = state.topic.sections;

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-slate-800 overflow-x-auto">
        {sections.map((s, idx) => {
          const done = completedSections.includes(s.sectionId);
          const active = idx === state.currentSectionIndex;
          const locked = idx > state.currentSectionIndex && !done;
          return (
            <div
              key={s.sectionId}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : done
                  ? 'bg-slate-700 text-slate-300'
                  : locked
                  ? 'bg-slate-900 text-slate-600'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {done ? '✓ ' : ''}{idx + 1}. {s.title}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <h2 className="text-2xl font-bold text-white mb-6">{section.title}</h2>
        <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-headings:text-white prose-strong:text-white prose-li:text-slate-300">
          <ReactMarkdown>{section.content}</ReactMarkdown>
        </div>

        {/* Key concepts */}
        <div className="mt-8 p-4 bg-slate-900 rounded-xl border border-slate-700">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Key Concepts</p>
          <div className="flex flex-wrap gap-2">
            {section.keyConcepts.map((c) => (
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
          <div className="flex items-center justify-between">
            <span className="text-green-400 text-sm font-medium">
              ✓ Section complete — Score: {Math.round((state.sectionScores[section.sectionId] ?? 0))}%
            </span>
            {state.currentSectionIndex < sections.length - 1 && (
              <button
                onClick={handleNextSection}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Next Section →
              </button>
            )}
          </div>
        ) : !readTimeElapsed ? (
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
            <span>Read for {timeLeft}s more before assessment...</span>
          </div>
        ) : (
          <button
            onClick={handleContinue}
            disabled={isInAssessment}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Continue to Assessment →
          </button>
        )}
      </div>
    </div>
  );
}
