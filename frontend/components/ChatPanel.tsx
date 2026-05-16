'use client';

import { useEffect, useRef, useState } from 'react';
import { useLearningSession } from '../context/LearningSessionContext';

export default function ChatPanel() {
  const { state, currentSection, currentMessages, sendChatMessage } = useLearningSession();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || !currentSection) return;
    setInput('');
    setLoading(true);
    try {
      await sendChatMessage(currentSection.sectionId, text);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stateColor = {
    engaged: 'text-green-400',
    struggling: 'text-amber-400',
    bored: 'text-blue-400',
    fatigued: 'text-red-400',
  }[state.behavioralState.activeState];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">AI Study Companion</p>
          <p className="text-xs text-slate-500">Ask anything about this section</p>
        </div>
        <span className={`text-xs font-semibold capitalize ${stateColor}`}>
          {state.behavioralState.activeState}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {currentMessages.length === 0 && (
          <div className="flex flex-col items-center pt-8 pb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-3 text-lg">
              🤖
            </div>
            <p className="text-slate-400 text-sm text-center leading-relaxed">
              Hi! I&apos;m your study companion for this section.
              <br />
              Ask me anything about{' '}
              <span className="text-white font-medium">{currentSection?.title}</span>!
            </p>
          </div>
        )}

        {currentMessages.map((msg, i) => {
          if (msg.isNudge) {
            return (
              <div key={i} className="flex justify-center">
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs px-3 py-2 rounded-full max-w-[90%] text-center">
                  <span>💡</span>
                  <span>{msg.content}</span>
                </div>
              </div>
            );
          }

          const isStudent = msg.role === 'student';
          return (
            <div key={i} className={`flex items-end gap-2 ${isStudent ? 'justify-end' : 'justify-start'}`}>
              {!isStudent && (
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs flex-shrink-0">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[75%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isStudent
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs flex-shrink-0">
              🤖
            </div>
            <div className="bg-slate-800 px-4 py-2.5 rounded-2xl rounded-bl-none">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — pinned to bottom */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-slate-800">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a question about this section..."
            rows={2}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 rounded-xl transition-colors self-stretch flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
