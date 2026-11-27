import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Grid3X3,
  Heart,
  HeartCrack,
  Lightbulb,
  Mountain,
  Send,
  Shield,
  Swords,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Zap
} from 'lucide-react';
import type { QuizStartResponse, QuizSubmitResponse } from '../../shared/types.ts';
import { api } from '../lib/api.ts';
import { mapFirebaseAuthError } from '../lib/firebase.ts';
import { playGameSound } from '../lib/sound.ts';

interface QuizArenaProps {
  session: QuizStartResponse;
  onComplete: (result: QuizSubmitResponse) => void;
  onCancel: () => void;
}

interface CheckedStepInfo {
  lockedAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

export function QuizArena({ session, onComplete, onCancel }: QuizArenaProps) {
  const isHeartQuest = session.mode === 'heart_quest';
  const isBossBattle = session.mode === 'pixel_boss';
  const isHeartGame = isHeartQuest || isBossBattle;
  const maxHearts = isHeartQuest ? 5 : isBossBattle ? 3 : 0;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<string, CheckedStepInfo>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(session.durationSeconds);
  const [submitting, setSubmitting] = useState(false);
  const [checkingStep, setCheckingStep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game-specific states
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [arcadePoints, setArcadePoints] = useState(0);
  const [shieldHp, setShieldHp] = useState(100);
  const [heartsLeft, setHeartsLeft] = useState(maxHearts);
  const [heartPulse, setHeartPulse] = useState<'loss' | 'gain' | null>(null);
  const [heartBannerNote, setHeartBannerNote] = useState<string | null>(null);
  const [bossHp, setBossHp] = useState(100);
  const [lifelinesLeft, setLifelinesLeft] = useState(3);
  const [hintRevealedByQ, setHintRevealedByQ] = useState<Record<string, string>>({});

  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const isGameMode = session.mode !== 'classic';
  const isHeartDepleted = isHeartGame && heartsLeft <= 0;
  const currentQ = session.questions[currentIdx];
  const currentChecked = currentQ ? checkedSteps[currentQ.id] : undefined;

  // Countdown timer
  useEffect(() => {
    const endAt = Date.now() + session.durationSeconds * 1000;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !submittedRef.current) {
        window.clearInterval(interval);
        void handleSubmit(true);
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [session.sessionId, session.durationSeconds]);

  function formatTimer(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function triggerHeartFeedback(kind: 'loss' | 'gain', note: string) {
    setHeartPulse(kind);
    setHeartBannerNote(note);
    window.setTimeout(() => {
      setHeartPulse(null);
    }, 500);
  }

  function handleAnswerChange(questionId: string, val: string) {
    if (checkedSteps[questionId] || isHeartDepleted) return;
    setError(null);
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  }

  async function handleLockAndCheckStep() {
    if (!currentQ || currentChecked || isHeartDepleted) return;
    const userAns = (answers[currentQ.id] || '').trim();
    if (!userAns) {
      setError('Select or enter an answer before firing.');
      return;
    }
    setError(null);
    setCheckingStep(true);
    try {
      const res = await api.checkQuizStep({
        sessionId: session.sessionId,
        questionId: currentQ.id,
        answer: userAns
      });
      setCheckedSteps((prev) => ({
        ...prev,
        [currentQ.id]: {
          lockedAnswer: res.lockedAnswer,
          isCorrect: res.isCorrect,
          correctAnswer: res.correctAnswer,
          explanation: res.explanation
        }
      }));

      if (res.isCorrect) {
        const nextStreak = streak + 1;
        const mult = nextStreak >= 5 ? 3 : nextStreak >= 2 ? 2 : 1;
        setStreak(nextStreak);
        setBestStreak((prev) => Math.max(prev, nextStreak));
        setArcadePoints((prev) => prev + 100 * mult);
        setShieldHp((prev) => Math.min(100, prev + 4));

        if (isHeartQuest) {
          if (nextStreak % 3 === 0 && heartsLeft < maxHearts) {
            setHeartsLeft((prev) => Math.min(maxHearts, prev + 1));
            playGameSound('heart_gain', soundEnabled);
            triggerHeartFeedback('gain', '+1 Heart restored from 3-answer streak!');
          } else {
            playGameSound('correct', soundEnabled);
            setHeartBannerNote(`Direct hit! ${nextStreak}x combo streak active.`);
          }
        } else if (isBossBattle) {
          const damage = Math.max(
            8,
            Math.ceil(100 / Math.max(4, Math.round(session.questions.length * 0.7)))
          );
          const nextBossHp = Math.max(0, bossHp - damage);
          setBossHp(nextBossHp);
          playGameSound('correct', soundEnabled);
          setHeartBannerNote(
            nextBossHp === 0
              ? 'System Boss defeated! Finish remaining questions or submit now.'
              : `Laser strike dealt -${damage}% damage to System Boss!`
          );
        } else {
          playGameSound('correct', soundEnabled);
        }
      } else {
        setStreak(0);
        setShieldHp((prev) => Math.max(10, prev - 15));

        if (isHeartGame) {
          const nextHearts = Math.max(0, heartsLeft - 1);
          setHeartsLeft(nextHearts);
          playGameSound('heart_loss', soundEnabled);
          triggerHeartFeedback(
            'loss',
            nextHearts === 0
              ? '0 Hearts remaining — click Submit Quiz to view marks and answers!'
              : isBossBattle
                ? `Boss counter-attack! Lost 1 Heart (${nextHearts}/${maxHearts} left).`
                : `Wrong answer! Lost 1 Heart (${nextHearts}/${maxHearts} left).`
          );
        } else {
          playGameSound('wrong', soundEnabled);
        }
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err, 'Unable to check answer.'));
    } finally {
      setCheckingStep(false);
    }
  }

  function handleUseLifeline() {
    if (!currentQ || lifelinesLeft <= 0 || currentChecked || isHeartDepleted) return;
    if (hintRevealedByQ[currentQ.id]) return;
    setHintRevealedByQ((prev) => ({
      ...prev,
      [currentQ.id]:
        currentQ.type === 'mcq'
          ? `Syllabus section ${currentQ.subtopicCode} — look closely at the core ICT definition.`
          : `Check syllabus section ${currentQ.subtopicCode}. Keep spelling concise and singular/exact.`
    }));
    setLifelinesLeft((prev) => prev - 1);
    playGameSound('click', soundEnabled);
  }

  async function handleSubmit(auto = false) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const merged: Record<string, string> = { ...answersRef.current };
      for (const [qId, info] of Object.entries(checkedSteps)) {
        merged[qId] = info.lockedAnswer;
      }
      const res = await api.submitQuiz({
        sessionId: session.sessionId,
        answers: merged
      });
      playGameSound('complete', soundEnabled);
      onComplete(res);
    } catch (err) {
      if (!auto) {
        submittedRef.current = false;
        setError(mapFirebaseAuthError(err, 'Failed to submit quiz.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = useMemo(() => {
    return session.questions.filter(
      (q) => Boolean((answers[q.id] || '').trim()) || Boolean(checkedSteps[q.id])
    ).length;
  }, [session.questions, answers, checkedSteps]);

  const correctCheckedCount = useMemo(() => {
    return Object.values(checkedSteps).filter((c) => c.isCorrect).length;
  }, [checkedSteps]);

  const modeTitle =
    session.mode === 'heart_quest'
      ? 'Heart Quest Survival'
      : session.mode === 'pixel_boss'
        ? 'Cyber Boss Battle'
        : session.mode === 'byte_blaster'
          ? 'ByteBlaster Defense'
          : session.mode === 'circuit_grid'
            ? 'Circuit Grid Challenge'
            : session.mode === 'tower_climb'
              ? 'Data Tower Climb'
              : 'Classic Study Quiz';

  const towerProgress = Math.round(
    (correctCheckedCount / Math.max(1, session.questions.length)) * 100
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Top Arena HUD */}
      <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#98BEB6]">
            <span>Topic {session.topicId}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-[#5EEAD4]">{modeTitle}</span>
            <span aria-hidden="true">·</span>
            <span>{session.uniqueGuaranteeCount} unique Qs assigned</span>
          </div>
          <h1 className="font-display text-lg font-semibold text-[#E9F5F2] mt-0.5">
            {session.topicTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="text-sm text-[#98BEB6] font-mono tabular-nums">
            Answered: <span className="font-semibold text-[#E9F5F2]">{answeredCount}</span>/
            {session.questions.length}
          </div>

          <div
            className={`px-3.5 py-2 rounded-lg font-mono tabular-nums text-sm font-semibold flex items-center gap-2 border ${
              secondsLeft <= 60
                ? 'bg-[#2D101B] text-[#FDA4AF] border-[#881337]'
                : 'bg-[#091E1C] text-[#E9F5F2] border-[#255A54]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(secondsLeft)}</span>
          </div>

          {isGameMode && (
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              className="p-2 rounded-lg border border-[#255A54] bg-[#091E1C] text-[#98BEB6] hover:bg-[#133633] hover:text-[#E9F5F2] cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-xs font-medium text-[#98BEB6] hover:text-[#E9F5F2] border border-[#255A54] bg-[#091E1C] hover:bg-[#133633] rounded-lg cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Mode-Specific Interactive Game Canvas: HEART QUEST SURVIVAL (5 Hearts) */}
      {isHeartQuest && (
        <div className="bg-[#0B2220] border border-[#1E4D48] text-[#E9F5F2] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-6 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-medium text-[#FDA4AF]">
              <Heart className="w-4 h-4 fill-[#E11D48] text-[#E11D48]" />
              <span>Heart Quest Survival · Wrong Answer = -1 Heart · 3-Streak = +1 Heart</span>
            </div>

            <div
              className={`flex items-center gap-2.5 ${
                heartPulse === 'loss' ? 'animate-heart-break' : ''
              }`}
              aria-label={`${heartsLeft} of ${maxHearts} hearts remaining`}
            >
              {Array.from({ length: maxHearts }).map((_, idx) => {
                const alive = idx < heartsLeft;
                return (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                      alive
                        ? 'bg-[#2D101B] border-[#E11D48] text-[#FB7185]'
                        : 'bg-[#091E1C] border-[#255A54] text-[#658C84]'
                    }`}
                  >
                    {alive ? (
                      <Heart className="w-5 h-5 fill-[#E11D48] text-[#FB7185]" />
                    ) : (
                      <HeartCrack className="w-5 h-5 text-[#658C84]" />
                    )}
                  </div>
                );
              })}
              <span className="font-mono tabular-nums text-sm font-semibold text-[#E9F5F2] ml-2">
                {heartsLeft}/{maxHearts} Hearts
              </span>
            </div>

            {heartBannerNote && (
              <p
                className={`text-xs ${
                  heartsLeft === 0
                    ? 'text-[#FDA4AF] font-medium'
                    : heartPulse === 'gain'
                      ? 'text-[#5EEAD4] font-medium'
                      : 'text-[#98BEB6]'
                }`}
              >
                {heartBannerNote}
              </p>
            )}
          </div>

          <div className="md:col-span-6 flex flex-wrap items-center justify-start md:justify-end gap-6 font-mono tabular-nums text-sm">
            <div>
              <span className="text-[#98BEB6] text-xs block">Survival Points</span>
              <span className="text-lg font-semibold text-[#E9F5F2]">{arcadePoints}</span>
            </div>
            <div>
              <span className="text-[#98BEB6] text-xs block">Heal Streak</span>
              <span className="text-lg font-semibold text-[#FBBF24] flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {streak % 3}/3 ({streak}x)
              </span>
            </div>
            <div>
              <span className="text-[#98BEB6] text-xs block">Best Streak</span>
              <span className="text-lg font-semibold text-[#5EEAD4]">{bestStreak}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mode-Specific Interactive Game Canvas: CYBER BOSS BATTLE (3 Hearts vs Boss HP) */}
      {isBossBattle && (
        <div className="bg-[#0B2220] border border-[#1E4D48] text-[#E9F5F2] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Player Rig & Hearts */}
          <div className="md:col-span-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-medium text-[#99F6E4]">
              <Swords className="w-4 h-4 text-[#FB7185]" />
              <span>Your Rig Hearts (Wrong Answer = Boss Counter-Attack)</span>
            </div>

            <div
              className={`flex items-center gap-2 ${
                heartPulse === 'loss' ? 'animate-heart-break' : ''
              }`}
              aria-label={`${heartsLeft} of ${maxHearts} player hearts remaining`}
            >
              {Array.from({ length: maxHearts }).map((_, idx) => {
                const alive = idx < heartsLeft;
                return (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                      alive
                        ? 'bg-[#2D101B] border-[#E11D48] text-[#FB7185]'
                        : 'bg-[#091E1C] border-[#255A54] text-[#658C84]'
                    }`}
                  >
                    {alive ? (
                      <Heart className="w-5 h-5 fill-[#E11D48] text-[#FB7185]" />
                    ) : (
                      <HeartCrack className="w-5 h-5 text-[#658C84]" />
                    )}
                  </div>
                );
              })}
              <span className="font-mono tabular-nums text-sm font-semibold ml-2 text-[#E9F5F2]">
                {heartsLeft}/{maxHearts} Hearts
              </span>
            </div>

            {heartBannerNote && (
              <p className="text-xs text-[#98BEB6]">{heartBannerNote}</p>
            )}
          </div>

          {/* 2D SVG Cyber Boss & HP Bar */}
          <div className="md:col-span-7 flex flex-wrap items-center justify-between md:justify-end gap-5">
            <div className="flex items-center gap-4">
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
                <rect
                  x="6"
                  y="10"
                  width="52"
                  height="44"
                  rx="12"
                  fill={bossHp === 0 ? '#0D3833' : '#2D101B'}
                  stroke={bossHp === 0 ? '#5EEAD4' : '#FB7185'}
                  strokeWidth="2.5"
                />
                <circle
                  cx="23"
                  cy="28"
                  r="4.5"
                  fill={bossHp === 0 ? '#5EEAD4' : '#E11D48'}
                />
                <circle
                  cx="41"
                  cy="28"
                  r="4.5"
                  fill={bossHp === 0 ? '#5EEAD4' : '#E11D48'}
                />
                <path
                  d={bossHp === 0 ? 'M22 42 Q32 47 42 42' : 'M20 43 L26 39 L32 43 L38 39 L44 43'}
                  fill="none"
                  stroke={bossHp === 0 ? '#5EEAD4' : '#FDA4AF'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>

              <div>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="font-medium text-[#FDA4AF]">System Boss HP</span>
                  <span className="font-mono tabular-nums font-semibold text-[#E9F5F2]">
                    {bossHp}%
                  </span>
                </div>
                <div className="w-48 h-2.5 bg-[#091E1C] rounded-full overflow-hidden mt-2 border border-[#255A54]">
                  <div
                    className={`h-full transition-all duration-200 ${
                      bossHp === 0 ? 'bg-[#5EEAD4]' : 'bg-[#E11D48]'
                    }`}
                    style={{ width: `${bossHp}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="font-mono tabular-nums text-right">
              <span className="text-[#98BEB6] text-xs block">Battle Score</span>
              <span className="text-lg font-semibold text-[#5EEAD4]">{arcadePoints}</span>
            </div>
          </div>
        </div>
      )}

      {/* Zero Hearts Depleted Banner */}
      {isHeartDepleted && (
        <div
          role="alert"
          className="p-5 rounded-2xl bg-[#2D101B] border border-[#881337] flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E11D48] text-[#FFF1F2] flex items-center justify-center shrink-0">
              <HeartCrack className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-[#E9F5F2]">
                0 Hearts Remaining — Round Ended
              </h2>
              <p className="text-xs text-[#FECDD3]">
                Submit your attempt now to view your final marks, grade, and the verified answer key.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit(false)}
            className="px-5 py-2.5 rounded-lg bg-[#F43F5E] hover:bg-[#E11D48] text-[#FFF1F2] text-sm font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : 'Submit & View Correct Answers'}</span>
          </button>
        </div>
      )}

      {/* Mode-Specific Interactive Game Canvas: BYTE BLASTER */}
      {session.mode === 'byte_blaster' && (
        <div className="bg-[#0B2220] border border-[#1E4D48] text-[#E9F5F2] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-5 flex items-center gap-4">
            <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" className="shrink-0">
              <circle cx="36" cy="36" r="32" fill="#091E1C" stroke="#5EEAD4" strokeWidth="2.5" />
              <path
                d="M36 14L52 22V35C52 46 45 54 36 58C27 54 20 46 20 35V22L36 14Z"
                fill={shieldHp > 45 ? '#0D9488' : '#E11D48'}
                fillOpacity="0.9"
                stroke="#99F6E4"
                strokeWidth="2"
              />
              <text
                x="36"
                y="40"
                textAnchor="middle"
                fill="#E9F5F2"
                fontSize="13"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
              >
                {shieldHp}%
              </text>
            </svg>
            <div>
              <div className="text-xs text-[#99F6E4] font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Firewall Shield Integrity</span>
              </div>
              <div className="w-44 h-2.5 bg-[#091E1C] border border-[#255A54] rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-200 ${
                    shieldHp > 45 ? 'bg-[#5EEAD4]' : 'bg-[#E11D48]'
                  }`}
                  style={{ width: `${shieldHp}%` }}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-7 flex flex-wrap items-center justify-end gap-6 font-mono tabular-nums text-sm">
            <div>
              <span className="text-[#98BEB6] text-xs block">Arcade Points</span>
              <span className="text-lg font-semibold text-[#E9F5F2]">{arcadePoints}</span>
            </div>
            <div>
              <span className="text-[#98BEB6] text-xs block">Active Combo</span>
              <span className="text-lg font-semibold text-[#FBBF24] flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {streak}x ({streak >= 5 ? '3x' : streak >= 2 ? '2x' : '1x'} bonus)
              </span>
            </div>
            <div>
              <span className="text-[#98BEB6] text-xs block">Best Streak</span>
              <span className="text-lg font-semibold text-[#5EEAD4]">{bestStreak}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mode-Specific Interactive Game Canvas: CIRCUIT GRID */}
      {session.mode === 'circuit_grid' && (
        <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#E9F5F2]">
              <Grid3X3 className="w-4 h-4 text-[#5EEAD4]" />
              <span>Circuit Grid Matrix — Click any node to jump & power it up</span>
            </div>
            <div className="text-xs text-[#98BEB6] font-mono tabular-nums">
              Powered: {correctCheckedCount} · Tripped:{' '}
              {Object.values(checkedSteps).filter((c) => !c.isCorrect).length} · Points:{' '}
              {arcadePoints}
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-11 gap-2">
            {session.questions.map((q, idx) => {
              const checked = checkedSteps[q.id];
              const isCurrent = idx === currentIdx;
              const hasDraft = Boolean((answers[q.id] || '').trim());
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 rounded-lg font-mono tabular-nums text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center ${
                    isCurrent
                      ? 'ring-2 ring-[#38BDF8] border-[#38BDF8] bg-[#38BDF8] text-[#06201E]'
                      : checked?.isCorrect
                        ? 'bg-[#0D3833] border-[#1F6B62] text-[#5EEAD4]'
                        : checked && !checked.isCorrect
                          ? 'bg-[#2D101B] border-[#881337] text-[#FDA4AF]'
                          : hasDraft
                            ? 'bg-[#0E2E47] border-[#0284C7] text-[#7DD3FC]'
                            : 'bg-[#091E1C] border-[#255A54] text-[#98BEB6] hover:bg-[#133633]'
                  }`}
                >
                  N{idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode-Specific Interactive Game Canvas: DATA TOWER CLIMB */}
      {session.mode === 'tower_climb' && (
        <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0D3833] border border-[#1F6B62] flex items-center justify-center text-[#5EEAD4]">
              <Mountain className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#E9F5F2]">
                Data Tower Ascent — {towerProgress}% Climbed
              </div>
              <div className="w-56 h-2.5 bg-[#091E1C] border border-[#255A54] rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-[#14B8A6] transition-all duration-200"
                  style={{ width: `${towerProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-mono tabular-nums text-[#98BEB6]">
              Score: <strong className="text-[#E9F5F2]">{arcadePoints}</strong>
            </span>
            <button
              type="button"
              disabled={lifelinesLeft <= 0 || Boolean(currentChecked)}
              onClick={handleUseLifeline}
              className="px-3.5 py-2 rounded-lg border border-[#785314] bg-[#291E0B] hover:bg-[#3A2A0F] disabled:opacity-50 text-[#FDE68A] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Syllabus Clue ({lifelinesLeft} left)</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-[#2D101B] border border-[#881337] text-[#FECDD3] text-sm flex items-start justify-between gap-3"
        >
          <span className="break-words">{error}</span>
          <button
            type="button"
            aria-label="Dismiss error message"
            onClick={() => setError(null)}
            className="text-[#FDA4AF] hover:text-[#FFF1F2] shrink-0 cursor-pointer mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Question Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-6 lg:p-8 flex flex-col justify-between space-y-6">
          {currentQ && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 text-xs text-[#98BEB6]">
                <span className="font-mono tabular-nums font-semibold text-[#5EEAD4]">
                  Question {currentIdx + 1} of {session.questions.length}
                </span>
                <span>
                  Section {currentQ.subtopicCode} ·{' '}
                  {currentQ.type === 'mcq' ? 'Multiple Choice' : 'Fill in the Blank'}
                </span>
              </div>

              <h2 className="font-display text-xl font-semibold text-[#E9F5F2] leading-snug">
                {currentQ.prompt}
              </h2>

              {hintRevealedByQ[currentQ.id] && (
                <div className="p-3.5 rounded-lg bg-[#291E0B] border border-[#785314] text-xs text-[#FDE68A]">
                  {hintRevealedByQ[currentQ.id]}
                </div>
              )}

              {currentQ.type === 'mcq' && currentQ.options ? (
                <div className="space-y-2.5">
                  {currentQ.options.map((opt, oIdx) => {
                    const selected = (answers[currentQ.id] || '') === opt;
                    const isLockedCorrect =
                      currentChecked && currentChecked.correctAnswer === opt;
                    const isLockedWrongPick =
                      currentChecked &&
                      currentChecked.lockedAnswer === opt &&
                      !currentChecked.isCorrect;

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={Boolean(currentChecked) || isHeartDepleted}
                        onClick={() => handleAnswerChange(currentQ.id, opt)}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-colors flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${
                          isLockedCorrect
                            ? 'bg-[#0D3833] border-[#14B8A6] text-[#99F6E4] font-medium'
                            : isLockedWrongPick
                              ? 'bg-[#2D101B] border-[#F43F5E] text-[#FECDD3]'
                              : selected
                                ? 'bg-[#0E2E47] border-[#38BDF8] text-[#E0F2FE] font-medium'
                                : 'bg-[#091E1C] border-[#255A54] text-[#E9F5F2] hover:bg-[#133633]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md border border-[#255A54] bg-[#133633] text-xs font-mono flex items-center justify-center shrink-0 text-[#98BEB6]">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isLockedCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                        )}
                        {isLockedWrongPick && (
                          <XCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <label
                    htmlFor={`fill-${currentQ.id}`}
                    className="block text-sm font-medium text-[#E9F5F2]"
                  >
                    Type your exact ICT term or answer:
                  </label>
                  <input
                    id={`fill-${currentQ.id}`}
                    type="text"
                    disabled={Boolean(currentChecked) || isHeartDepleted}
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isGameMode && !currentChecked && !isHeartDepleted) {
                        e.preventDefault();
                        void handleLockAndCheckStep();
                      }
                    }}
                    placeholder="Type answer for the blank..."
                    className="w-full px-4 py-3 rounded-xl border border-[#255A54] bg-[#091E1C] focus:bg-[#0B2220] text-[#E9F5F2] placeholder-[#658C84] text-base focus:outline-none focus:ring-2 focus:ring-[#14B8A6] disabled:opacity-70"
                  />
                </div>
              )}

              {currentChecked && (
                <div
                  className={`p-4 rounded-xl border text-sm space-y-1 ${
                    currentChecked.isCorrect
                      ? 'bg-[#0D3833] border-[#1F6B62] text-[#E9F5F2]'
                      : 'bg-[#2D101B] border-[#881337] text-[#FECDD3]'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    {currentChecked.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#5EEAD4]" />
                        <span>Correct! Power boost earned.</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-[#FB7185]" />
                        <span>
                          {isHeartGame ? 'Incorrect (-1 Heart)' : 'Incorrect'} — Correct Answer:{' '}
                          {currentChecked.correctAnswer}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {currentChecked.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mandatory Previous / Action / Next / Submit Controls */}
          <div className="pt-5 border-t border-[#1E4D48] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="px-4 py-2.5 rounded-lg border border-[#255A54] bg-[#091E1C] hover:bg-[#133633] disabled:opacity-40 text-sm font-medium text-[#E9F5F2] flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              {isGameMode && !currentChecked && !isHeartDepleted && (
                <button
                  type="button"
                  disabled={checkingStep}
                  onClick={() => void handleLockAndCheckStep()}
                  className="px-4 py-2.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#1F1303] text-sm font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-4 h-4" />
                  <span>{checkingStep ? 'Checking...' : 'Lock & Fire Answer'}</span>
                </button>
              )}

              {currentIdx < session.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIdx((i) => Math.min(session.questions.length - 1, i + 1))
                  }
                  className="px-4 py-2.5 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] text-[#051B19] text-sm font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : null}

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit(false)}
                className="px-5 py-2.5 rounded-lg bg-[#164E63] hover:bg-[#155E75] border border-[#38BDF8]/40 disabled:opacity-50 text-[#E0F2FE] text-sm font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Submit Quiz'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Navigator Sidebar */}
        <aside className="lg:col-span-4 bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-[#E9F5F2]">
                Question Navigator
              </h3>
              <p className="text-xs text-[#98BEB6] mt-0.5">
                Jump between questions or check unanswered items before clicking Submit.
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {session.questions.map((q, idx) => {
                const isCurrent = idx === currentIdx;
                const checked = checkedSteps[q.id];
                const isAnswered = Boolean((answers[q.id] || '').trim());
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-lg font-mono tabular-nums text-xs font-medium border transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#38BDF8] text-[#06201E] border-[#38BDF8] font-semibold'
                        : checked?.isCorrect
                          ? 'bg-[#0D3833] text-[#5EEAD4] border-[#1F6B62]'
                          : checked && !checked.isCorrect
                            ? 'bg-[#2D101B] text-[#FDA4AF] border-[#881337]'
                            : isAnswered
                              ? 'bg-[#0E2E47] text-[#7DD3FC] border-[#0284C7]'
                              : 'bg-[#091E1C] text-[#98BEB6] border-[#255A54] hover:bg-[#133633]'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E4D48] space-y-2 text-xs text-[#98BEB6]">
            <div className="flex items-center justify-between">
              <span>Answered</span>
              <span className="font-mono tabular-nums font-semibold text-[#E9F5F2]">
                {answeredCount} / {session.questions.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Unanswered</span>
              <span className="font-mono tabular-nums font-semibold text-[#E9F5F2]">
                {session.questions.length - answeredCount}
              </span>
            </div>
            {isHeartGame && (
              <div className="flex items-center justify-between">
                <span>Hearts Left</span>
                <span className="font-mono tabular-nums font-semibold text-[#FB7185]">
                  {heartsLeft} / {maxHearts}
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
