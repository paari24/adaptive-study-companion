'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TopicMeta {
  topicId: string;
  title: string;
  subject: string;
  grade: string;
  sectionCount: number;
  emoji: string;
}

const TOPICS: TopicMeta[] = [
  { topicId: 'photosynthesis', title: 'Photosynthesis', subject: 'Science', grade: 'Class 7', sectionCount: 5, emoji: '🌿' },
  { topicId: 'acids-and-bases', title: 'Acids and Bases', subject: 'Science', grade: 'Class 7', sectionCount: 4, emoji: '🧪' },
  { topicId: 'electric-circuits', title: 'Electric Circuits', subject: 'Science', grade: 'Class 7', sectionCount: 4, emoji: '⚡' },
];

export default function TopicSelectionPage() {
  const router = useRouter();
  const [resumable, setResumable] = useState<Record<string, { sections: number; total: number }>>({});

  useEffect(() => {
    const r: Record<string, { sections: number; total: number }> = {};
    TOPICS.forEach((t) => {
      try {
        const saved = localStorage.getItem(`session_${t.topicId}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.completedSections?.length > 0) {
            r[t.topicId] = { sections: data.completedSections.length, total: t.sectionCount };
          }
        }
      } catch {}
    });
    setResumable(r);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            <span className="text-indigo-300 text-sm font-medium">AI-Powered Adaptive Learning</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Adaptive Study Companion</h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Your personal AI tutor that detects when you&apos;re struggling, bored, or tired — and adapts in real-time.
          </p>
        </div>

        <div className="mb-4">
          <span className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
            Science — Class 7 CBSE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TOPICS.map((topic) => {
            const res = resumable[topic.topicId];
            return (
              <button
                key={topic.topicId}
                onClick={() => router.push(`/learn/${topic.topicId}`)}
                className="relative text-left bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/70 hover:bg-slate-800/80 transition-all group cursor-pointer"
              >
                {res && (
                  <span className="absolute top-4 right-4 bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    Resume
                  </span>
                )}
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-2xl group-hover:border-indigo-500/50 transition-colors">
                  {topic.emoji}
                </div>
                <h2 className="text-lg font-semibold text-white mb-1">{topic.title}</h2>
                <p className="text-sm text-slate-500 mb-3">{topic.sectionCount} sections</p>
                {res ? (
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${(res.sections / res.total) * 100}%` }}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">New</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Struggling', desc: 'Simplifies explanations, adds hints', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
            { label: 'Bored', desc: 'Harder questions, Socratic challenges', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
            { label: 'Fatigued', desc: 'Shorter content, suggests breaks', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <div className={`text-sm font-semibold ${s.color} mb-1`}>{s.label}</div>
              <div className="text-xs text-slate-400">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
