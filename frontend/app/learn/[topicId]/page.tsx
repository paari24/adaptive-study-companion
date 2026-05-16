'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LearningSessionProvider, useLearningSession } from '../../../context/LearningSessionContext';
import { Topic } from '../../../engine/types';
import ContentPanel from '../../../components/ContentPanel';
import ChatPanel from '../../../components/ChatPanel';
import AssessmentModal from '../../../components/AssessmentModal';
import StateIndicator from '../../../components/StateIndicator';
import TopicSummary from '../../../components/TopicSummary';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function LearnPageInner() {
  const { state, dispatch } = useLearningSession();
  const router = useRouter();

  if (!state.topic) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading topic...</p>
        </div>
      </div>
    );
  }

  if (state.showSummary) {
    return <TopicSummary />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900">
        <button
          onClick={() => router.push('/')}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-white font-semibold">{state.topic.title}</h1>
        <span className="text-slate-400 text-sm">
          Section {state.currentSectionIndex + 1} of {state.topic.sections.length}
        </span>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[55%] border-r border-slate-800 overflow-y-auto">
          <ContentPanel />
        </div>
        <div className="w-[45%] flex flex-col">
          <ChatPanel />
        </div>
      </div>

      {/* State indicator */}
      <StateIndicator />

      {/* Assessment modal */}
      {state.isInAssessment && <AssessmentModal />}
    </div>
  );
}

export default function LearnPage() {
  const params = useParams();
  const topicId = params?.topicId as string;
  const [topic, setTopic] = useState<Topic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) return;
    import(`../../../data/topics/${topicId}.json`)
      .then((mod) => setTopic(mod.default as Topic))
      .catch(() => setError('Topic not found'));
  }, [topicId]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p>{error}</p>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <LearningSessionProvider apiUrl={API_URL} initialTopic={topic}>
      <LearnPageInner />
    </LearningSessionProvider>
  );
}
