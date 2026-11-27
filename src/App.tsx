import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Trophy
} from 'lucide-react';
import type {
  AppSettings,
  PublicUser,
  QuizMode,
  QuizQuestionFilter,
  QuizStartResponse,
  QuizSubmitResponse,
  TopicSummaryForUser
} from '../shared/types.ts';
import { api } from './lib/api.ts';
import { auth, mapFirebaseAuthError } from './lib/firebase.ts';
import { AuthView } from './components/AuthView.tsx';
import { MindMapExplorer } from './components/MindMapExplorer.tsx';
import { QuizSetupPanel } from './components/QuizSetupPanel.tsx';
import { QuizArena } from './components/QuizArena.tsx';
import { QuizResultsView } from './components/QuizResultsView.tsx';
import { RankingsView } from './components/RankingsView.tsx';
import { TeacherAdminView } from './components/TeacherAdminView.tsx';

type AppView = 'learn' | 'rankings' | 'admin';

export default function App() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const authPendingRef = useRef(false);
  const [view, setView] = useState<AppView>('learn');
  const [topics, setTopics] = useState<TopicSummaryForUser[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    enabledTopics: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    requireNotesBeforeQuiz: true,
    enabledGames: [
      'classic',
      'heart_quest',
      'pixel_boss',
      'byte_blaster',
      'circuit_grid',
      'tower_climb'
    ]
  });
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<number>(1);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [activeSession, setActiveSession] = useState<QuizStartResponse | null>(null);
  const [lastResult, setLastResult] = useState<QuizSubmitResponse | null>(null);
  const [rankingsTopicId, setRankingsTopicId] = useState<number | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (authPendingRef.current) {
        return;
      }
      if (!firebaseUser) {
        setUser(null);
        setTopics([]);
        setActiveSession(null);
        setLastResult(null);
        setAuthInitializing(false);
        return;
      }

      void (async () => {
        try {
          const profile = await api.getCurrentUserProfile(firebaseUser);
          if (authPendingRef.current) return;
          if (profile) {
            setUser(profile);
            setView((prev) => (prev === 'learn' && profile.role === 'teacher' ? 'admin' : prev));
          } else {
            await api.logout();
            setUser(null);
          }
        } catch (err) {
          setAppError(mapFirebaseAuthError(err));
          setUser(null);
        } finally {
          setAuthInitializing(false);
        }
      })();
    });

    return () => unsubscribe();
  }, []);

  async function refreshTopics() {
    setLoadingTopics(true);
    setAppError(null);
    try {
      const res = await api.getTopics();
      setTopics(res.topics);
      setSettings(res.settings);
    } catch (err) {
      setAppError(mapFirebaseAuthError(err));
    } finally {
      setLoadingTopics(false);
    }
  }

  useEffect(() => {
    if (user) {
      void refreshTopics();
    }
  }, [user]);

  const activeTopic = useMemo(() => {
    return topics.find((t) => t.id === selectedTopicId) || topics[0] || null;
  }, [topics, selectedTopicId]);

  const completedTopicsCount = useMemo(() => {
    return topics.filter((t) => t.attemptsCount > 0).length;
  }, [topics]);

  const notesCompletedCount = useMemo(() => {
    return topics.filter((t) => t.notesProgress.completed).length;
  }, [topics]);

  async function handleMarkNodeRead(nodeId: string) {
    if (!activeTopic) return;
    try {
      const res = await api.markNoteRead(activeTopic.id, { nodeId });
      setTopics((prev) =>
        prev.map((t) =>
          t.id === activeTopic.id ? { ...t, notesProgress: res.notesProgress } : t
        )
      );
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'Could not update notes progress.');
    }
  }

  async function handleMarkAllRead() {
    if (!activeTopic) return;
    try {
      const res = await api.markNoteRead(activeTopic.id, { markAll: true });
      setTopics((prev) =>
        prev.map((t) =>
          t.id === activeTopic.id ? { ...t, notesProgress: res.notesProgress } : t
        )
      );
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'Could not mark notes complete.');
    }
  }

  async function handleStartQuiz(config: {
    topicId: number;
    questionCount: number;
    questionFilter: QuizQuestionFilter;
    mode: QuizMode;
  }) {
    setStartingQuiz(true);
    setAppError(null);
    try {
      const session = await api.startQuiz(config);
      setLastResult(null);
      setActiveSession(session);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'Unable to start quiz session.');
    } finally {
      setStartingQuiz(false);
    }
  }

  async function handleQuizComplete(result: QuizSubmitResponse) {
    setActiveSession(null);
    setLastResult(result);
    await refreshTopics();
  }

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setTopics([]);
      setActiveSession(null);
      setLastResult(null);
      setView('learn');
    }
  }

  if (authInitializing) {
    return (
      <div className="min-h-screen bg-[#071716] flex items-center justify-center p-6">
        <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl px-8 py-6 text-center space-y-2">
          <div className="font-display text-sm font-semibold text-[#E9F5F2]">
            BelajarBuddy ICT
          </div>
          <div className="text-xs text-[#98BEB6]">Restoring your authenticated session...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthView
        onAuthPendingChange={(pending) => {
          authPendingRef.current = pending;
        }}
        onAuthenticated={(loggedUser) => {
          setUser(loggedUser);
          setView(loggedUser.role === 'teacher' ? 'admin' : 'learn');
          setAuthInitializing(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#071716] flex flex-col text-[#E9F5F2]">
      {/* Three-Zone Top Bar */}
      <header className="border-b border-[#1E4D48] bg-[#0B2220] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect width="32" height="32" rx="8" fill="#14B8A6" />
              <circle cx="16" cy="16" r="4.5" fill="#06201E" />
              <path
                d="M16 6V11.5M16 20.5V26M6 16H11.5M20.5 16H26"
                stroke="#06201E"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-display text-lg font-bold tracking-tight text-[#E9F5F2]">
              BelajarBuddy ICT
            </span>
          </div>

          {/* Zone 2: Concise Navigation Links */}
          <nav className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setView('learn');
                setActiveSession(null);
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'learn'
                  ? 'bg-[#133C38] text-[#5EEAD4]'
                  : 'text-[#98BEB6] hover:bg-[#133633] hover:text-[#E9F5F2]'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Mind Maps & Quiz</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setView('rankings');
                setActiveSession(null);
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'rankings'
                  ? 'bg-[#133C38] text-[#5EEAD4]'
                  : 'text-[#98BEB6] hover:bg-[#133633] hover:text-[#E9F5F2]'
              }`}
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>Rankings</span>
            </button>

            {user.role === 'teacher' && (
              <button
                type="button"
                onClick={() => {
                  setView('admin');
                  setActiveSession(null);
                }}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  view === 'admin'
                    ? 'bg-[#14B8A6] text-[#051B19] font-semibold'
                    : 'text-[#98BEB6] hover:bg-[#133633] hover:text-[#E9F5F2]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Teacher Admin</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Log Out Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-lg border border-[#255A54] bg-[#0E2927] hover:bg-[#153D39] text-sm font-medium text-[#E9F5F2] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0 text-[#5EEAD4]" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {appError && (
          <div className="max-w-7xl mx-auto px-6 pt-6">
            <div
              role="alert"
              className="px-4 py-3 rounded-xl bg-[#2D101B] border border-[#881337] text-[#FECDD3] text-sm"
            >
              {appError}
            </div>
          </div>
        )}

        {view === 'learn' && activeSession && (
          <QuizArena
            session={activeSession}
            onComplete={(res) => void handleQuizComplete(res)}
            onCancel={() => setActiveSession(null)}
          />
        )}

        {view === 'learn' && !activeSession && lastResult && (
          <QuizResultsView
            result={lastResult}
            onBackToLearn={() => setLastResult(null)}
            onViewRankings={() => {
              setRankingsTopicId(lastResult.topicId);
              setLastResult(null);
              setView('rankings');
            }}
          />
        )}

        {view === 'learn' && !activeSession && !lastResult && (
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            {/* Student Profile + Topic 1-11 Dropdown Control Bar */}
            <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#98BEB6]">
                  <span className="font-semibold text-[#E9F5F2]">{user.name}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {user.role === 'teacher' ? 'Teacher / Admin' : `Class ${user.className}`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-[#5EEAD4] font-medium">
                    {notesCompletedCount}/11 Mind Maps Read
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {completedTopicsCount}/11 Topics Quizzed
                  </span>
                </div>
                <h1 className="font-display text-2xl font-bold text-[#E9F5F2] [text-wrap:balance]">
                  Cambridge IGCSE ICT (0417) Revision Workspace
                </h1>
              </div>

              <div className="w-full lg:w-auto lg:min-w-[380px]">
                <label
                  htmlFor="topic-dropdown"
                  className="block text-xs font-semibold text-[#98BEB6] mb-1.5"
                >
                  Select Syllabus Topic (Topics 1–11)
                </label>
                <div className="relative">
                  <select
                    id="topic-dropdown"
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(Number(e.target.value))}
                    className="w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-[#255A54] bg-[#091E1C] text-sm font-medium text-[#E9F5F2] focus:outline-none focus:ring-2 focus:ring-[#14B8A6] cursor-pointer transition-colors"
                  >
                    {topics.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#091E1C] text-[#E9F5F2]">
                        Topic {t.id}: {t.title}
                        {!t.enabled ? ' (Locked by Teacher)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#5EEAD4] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {loadingTopics && topics.length === 0 ? (
              <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-10 text-center text-sm text-[#98BEB6]">
                Loading Cambridge IGCSE ICT topics 1–11...
              </div>
            ) : activeTopic ? (
              <>
                {/* Quiet Topic Snapshot */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-1 text-xs text-[#98BEB6]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        activeTopic.notesProgress.completed
                          ? 'text-[#5EEAD4]'
                          : 'text-[#6FA096]'
                      }`}
                    />
                    <span>
                      Topic {activeTopic.id} Status:{' '}
                      <strong className="text-[#E9F5F2]">
                        {activeTopic.notesProgress.completed
                          ? 'Mind Map Complete (Quiz Unlocked)'
                          : 'Read Mind Map Notes First'}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span>
                      Best Score:{' '}
                      <strong className="text-[#E9F5F2]">
                        {activeTopic.bestScore
                          ? `${activeTopic.bestScore.score}/${activeTopic.bestScore.totalQuestions} (${activeTopic.bestScore.percentage}%)`
                          : 'No attempts yet'}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Bank:{' '}
                      <strong className="text-[#E9F5F2]">
                        {activeTopic.questionCounts.mcq} MCQ /{' '}
                        {activeTopic.questionCounts.fill_blank} Fill Blank
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Step 1: Mind Map Notes Explorer */}
                <MindMapExplorer
                  key={`mindmap-${activeTopic.id}`}
                  topic={activeTopic}
                  requireNotesBeforeQuiz={settings.requireNotesBeforeQuiz}
                  onMarkNodeRead={handleMarkNodeRead}
                  onMarkAllRead={handleMarkAllRead}
                />

                {/* Step 2: Quiz & Fun Games Setup */}
                <QuizSetupPanel
                  topic={activeTopic}
                  settings={settings}
                  userRole={user.role}
                  starting={startingQuiz}
                  onStartQuiz={(cfg) => void handleStartQuiz(cfg)}
                />
              </>
            ) : null}
          </div>
        )}

        {view === 'rankings' && (
          <RankingsView
            currentUser={user}
            topics={topics}
            initialTopicId={rankingsTopicId}
          />
        )}

        {view === 'admin' && user.role === 'teacher' && (
          <TeacherAdminView topics={topics} onDataUpdated={refreshTopics} />
        )}
      </main>
    </div>
  );
}
