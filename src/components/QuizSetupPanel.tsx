import React, { useState } from 'react';
import {
  Clock,
  Cpu,
  Gamepad2,
  Grid3X3,
  Heart,
  ListChecks,
  Lock,
  Mountain,
  Play,
  Shield,
  Swords
} from 'lucide-react';
import type {
  AppSettings,
  QuizMode,
  QuizQuestionFilter,
  TopicSummaryForUser,
  UserRole
} from '../../shared/types.ts';

interface QuizSetupPanelProps {
  topic: TopicSummaryForUser;
  settings: AppSettings;
  userRole: UserRole;
  starting: boolean;
  onStartQuiz: (config: {
    topicId: number;
    questionCount: number;
    questionFilter: QuizQuestionFilter;
    mode: QuizMode;
  }) => void;
}

const MODE_CARDS: {
  id: QuizMode;
  title: string;
  subtitle: string;
  accent?: 'heart' | 'jade';
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'classic',
    title: 'Classic Study Quiz',
    subtitle: 'Focused exam mode with Next, Previous & Submit review.',
    icon: ListChecks
  },
  {
    id: 'heart_quest',
    title: 'Heart Quest Survival (5 Hearts)',
    subtitle: 'Lose 1 Heart on wrong answers. Reach a 3-streak to heal +1 Heart!',
    accent: 'heart',
    icon: Heart
  },
  {
    id: 'pixel_boss',
    title: 'Cyber Boss Battle (3 Hearts)',
    subtitle: 'Hit the System Boss with right answers; wrong answers cost 1 Heart.',
    accent: 'heart',
    icon: Swords
  },
  {
    id: 'byte_blaster',
    title: 'ByteBlaster Defense',
    subtitle: 'Protect your firewall shield & build 3x streak combos.',
    icon: Shield
  },
  {
    id: 'circuit_grid',
    title: 'Circuit Grid Challenge',
    subtitle: 'Power up logic nodes across an interactive circuit matrix.',
    icon: Grid3X3
  },
  {
    id: 'tower_climb',
    title: 'Data Tower Climb',
    subtitle: 'Scale server tower rungs with a built-in hint lifeline.',
    icon: Mountain
  }
];

export function QuizSetupPanel({
  topic,
  settings,
  userRole,
  starting,
  onStartQuiz
}: QuizSetupPanelProps) {
  const [questionFilter, setQuestionFilter] = useState<QuizQuestionFilter>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [mode, setMode] = useState<QuizMode>('heart_quest');

  const notesLocked =
    userRole !== 'teacher' &&
    settings.requireNotesBeforeQuiz &&
    !topic.notesProgress.completed;

  const topicDisabled = userRole !== 'teacher' && !topic.enabled;

  const availablePool =
    questionFilter === 'mcq'
      ? topic.questionCounts.mcq
      : questionFilter === 'fill_blank'
        ? topic.questionCounts.fill_blank
        : topic.questionCounts.total;

  const maxAllowed = Math.min(55, Math.max(10, availablePool));
  const effectiveCount = Math.min(questionCount, maxAllowed);
  const totalSeconds = effectiveCount * 30;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const formattedTime = `${mins}:${String(secs).padStart(2, '0')}`;

  const enabledModes = MODE_CARDS.filter(
    (m) => userRole === 'teacher' || settings.enabledGames.includes(m.id)
  );

  const selectedModeValid = enabledModes.some((m) => m.id === mode);
  const activeMode = selectedModeValid ? mode : enabledModes[0]?.id || 'classic';

  return (
    <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#98BEB6]">
            <span>Assessment & Games Launcher</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums font-medium text-[#5EEAD4]">
              {availablePool} questions available in pool
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold text-[#E9F5F2] mt-0.5">
            Configure Your Topic {topic.id} Challenge
          </h2>
        </div>

        <div className="flex items-center gap-2 text-sm text-[#E9F5F2] font-mono tabular-nums bg-[#091E1C] px-3.5 py-2 rounded-lg border border-[#255A54]">
          <Clock className="w-4 h-4 text-[#5EEAD4]" />
          <span>Timer: {formattedTime}</span>
          <span className="text-[#98BEB6] text-xs">(5 min / 10 Qs)</span>
        </div>
      </div>

      {topicDisabled && (
        <div className="p-4 rounded-xl bg-[#2D101B] border border-[#881337] text-[#FECDD3] text-sm flex items-center gap-2.5">
          <Lock className="w-4 h-4 shrink-0" />
          <span>This topic is currently locked by your teacher.</span>
        </div>
      )}

      {!topicDisabled && notesLocked && (
        <div className="p-4 rounded-xl bg-[#291E0B] border border-[#785314] text-[#FDE68A] text-sm flex items-center gap-2.5">
          <Lock className="w-4 h-4 shrink-0 text-[#F59E0B]" />
          <span>
            Please read all {topic.branches.length} branches in the Topic {topic.id} Mind Map
            above before starting a quiz or game.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question Type + Count */}
        <div className="lg:col-span-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#E9F5F2] mb-2">
              1. Question Format
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#091E1C] border border-[#1E4D48] rounded-lg">
              {[
                { id: 'mcq' as const, label: 'MCQ' },
                { id: 'fill_blank' as const, label: 'Fill Blank' },
                { id: 'mixed' as const, label: 'Mixed' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setQuestionFilter(opt.id)}
                  className={`py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    questionFilter === opt.id
                      ? 'bg-[#16423E] text-[#5EEAD4]'
                      : 'text-[#98BEB6] hover:text-[#E9F5F2]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="question-count-range"
                className="text-sm font-medium text-[#E9F5F2]"
              >
                2. Number of Questions (10–55)
              </label>
              <span className="font-mono tabular-nums text-sm font-semibold text-[#5EEAD4]">
                {effectiveCount} Questions
              </span>
            </div>

            <input
              id="question-count-range"
              type="range"
              min={10}
              max={maxAllowed}
              step={1}
              value={effectiveCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-[#14B8A6] cursor-pointer"
            />

            <div className="flex flex-wrap gap-2 mt-2.5">
              {[10, 20, 30, 45, 55]
                .filter((n) => n <= maxAllowed)
                .map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuestionCount(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono tabular-nums border transition-colors cursor-pointer ${
                      effectiveCount === preset
                        ? 'bg-[#14B8A6] text-[#051B19] border-[#14B8A6] font-semibold'
                        : 'bg-[#091E1C] text-[#E9F5F2] border-[#255A54] hover:bg-[#133633]'
                    }`}
                  >
                    {preset} Qs
                  </button>
                ))}
            </div>
            <p className="text-xs text-[#98BEB6] mt-2">
              Questions are randomly assigned so other students do not receive your question set.
            </p>
          </div>
        </div>

        {/* Mode / Game Selector */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#E9F5F2] flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-[#5EEAD4]" />
              <span>3. Choose Quiz or Fun Game Mode</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {enabledModes.map((item) => {
              const Icon = item.icon;
              const isSelected = activeMode === item.id;
              const isHeartMode = item.accent === 'heart';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? isHeartMode
                        ? 'border-[#F43F5E] bg-[#2D101B]'
                        : 'border-[#14B8A6] bg-[#133C38]'
                      : 'border-[#255A54] bg-[#0B2220] hover:bg-[#133633]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-display font-semibold text-sm text-[#E9F5F2] flex items-center gap-2">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isHeartMode
                            ? 'text-[#FB7185]'
                            : isSelected
                              ? 'text-[#5EEAD4]'
                              : 'text-[#98BEB6]'
                        }`}
                      />
                      <span>{item.title}</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#98BEB6] leading-relaxed">{item.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#1E4D48] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[#98BEB6]">
          <Cpu className="w-4 h-4 text-[#5EEAD4]" />
          <span>
            Includes Next, Previous, Submit controls, marks summary & full correct answer key.
          </span>
        </div>

        <button
          type="button"
          disabled={notesLocked || topicDisabled || starting || availablePool < 10}
          onClick={() =>
            onStartQuiz({
              topicId: topic.id,
              questionCount: effectiveCount,
              questionFilter,
              mode: activeMode
            })
          }
          className="px-6 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] disabled:bg-[#1E4D48] disabled:text-[#658C84] disabled:cursor-not-allowed text-[#051B19] font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <Play className="w-4 h-4" />
          <span>{starting ? 'Preparing Unique Set...' : 'Start Challenge'}</span>
        </button>
      </div>
    </div>
  );
}
