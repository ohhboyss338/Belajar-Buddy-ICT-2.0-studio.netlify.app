import React, { useMemo, useState } from 'react';
import { BookCheck, CheckCircle2, CircleDot, Lightbulb, Lock, Unlock } from 'lucide-react';
import type { TopicSummaryForUser } from '../../shared/types.ts';

interface MindMapExplorerProps {
  topic: TopicSummaryForUser;
  requireNotesBeforeQuiz: boolean;
  onMarkNodeRead: (nodeId: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}

export function MindMapExplorer({
  topic,
  requireNotesBeforeQuiz,
  onMarkNodeRead,
  onMarkAllRead
}: MindMapExplorerProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    topic.branches[0]?.id || ''
  );
  const [marking, setMarking] = useState(false);

  // Sync selected branch when topic changes
  const activeBranch = useMemo(() => {
    return (
      topic.branches.find((b) => b.id === selectedBranchId) || topic.branches[0]
    );
  }, [topic, selectedBranchId]);

  const readSet = new Set(topic.notesProgress.readNodeIds);
  const readCount = topic.branches.filter((b) => readSet.has(b.id)).length;
  const totalCount = topic.branches.length;
  const isCompleted = topic.notesProgress.completed;

  async function handleSelectBranch(branchId: string) {
    setSelectedBranchId(branchId);
    if (!readSet.has(branchId)) {
      await onMarkNodeRead(branchId);
    }
  }

  async function handleMarkAll() {
    setMarking(true);
    try {
      await onMarkAllRead();
    } finally {
      setMarking(false);
    }
  }

  // Compute radial coordinates around center (320, 210) in a 640x420 SVG canvas
  const centerX = 320;
  const centerY = 210;
  const nodePositions = useMemo(() => {
    const count = topic.branches.length;
    return topic.branches.map((branch, i) => {
      // Spread nicely around the central hub
      const angle = ((2 * Math.PI) / count) * i - Math.PI / 2;
      const rx = count <= 2 ? 195 : count === 3 ? 205 : 215;
      const ry = count <= 2 ? 95 : 142;
      return {
        branch,
        x: centerX + Math.cos(angle) * rx,
        y: centerY + Math.sin(angle) * ry
      };
    });
  }, [topic.branches]);

  return (
    <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl overflow-hidden">
      {/* Section Header */}
      <div className="px-6 py-5 border-b border-[#1E4D48] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#98BEB6]">
            <span>Topic {topic.id} Mind Map</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums font-medium text-[#5EEAD4]">
              {readCount}/{totalCount} branches read
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold text-[#E9F5F2] mt-0.5">
            {topic.title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {isCompleted ? (
            <div className="flex items-center gap-1.5 text-sm font-medium text-[#5EEAD4]">
              <Unlock className="w-4 h-4" />
              <span>Notes Complete · Quiz Unlocked</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm font-medium text-[#FBBF24]">
                <Lock className="w-4 h-4" />
                <span>
                  {requireNotesBeforeQuiz
                    ? 'Click all branches to unlock quiz'
                    : 'Reading recommended'}
                </span>
              </div>
              <button
                type="button"
                disabled={marking}
                onClick={handleMarkAll}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#14B8A6] hover:bg-[#0D9488] text-[#051B19] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {marking ? 'Saving...' : 'Mark All Read'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Two-zone Educational Sandbox Layout: Mind Map Canvas (left) + Concept Deck (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Zone: Interactive SVG Mind Map */}
        <div className="lg:col-span-7 p-6 bg-[#091E1C] border-b lg:border-b-0 lg:border-r border-[#1E4D48] flex flex-col justify-between">
          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 640 420"
              className="w-full h-auto min-w-[460px] select-none"
              role="img"
              aria-label={`Interactive mind map for Topic ${topic.id}: ${topic.title}`}
            >
              <defs>
                <filter id="nodeShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#030D0C" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* Curved Connector Branches */}
              {nodePositions.map(({ branch, x, y }) => {
                const isSelected = activeBranch?.id === branch.id;
                const isRead = readSet.has(branch.id);
                const ctrlX = (centerX + x) / 2;
                const ctrlY = centerY;
                return (
                  <path
                    key={`edge-${branch.id}`}
                    d={`M ${centerX} ${centerY} Q ${ctrlX} ${ctrlY} ${x} ${y}`}
                    fill="none"
                    stroke={isSelected ? '#38BDF8' : isRead ? '#14B8A6' : '#2D6059'}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={isRead || isSelected ? undefined : '5 4'}
                  />
                );
              })}

              {/* Central Topic Hub */}
              <g transform={`translate(${centerX}, ${centerY})`}>
                <rect
                  x="-96"
                  y="-40"
                  width="192"
                  height="80"
                  rx="16"
                  fill="#123C38"
                  stroke="#2DD4BF"
                  strokeWidth="2"
                  filter="url(#nodeShadow)"
                />
                <text
                  x="0"
                  y="-12"
                  textAnchor="middle"
                  fill="#5EEAD4"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  TOPIC {topic.id}
                </text>
                <text
                  x="0"
                  y="10"
                  textAnchor="middle"
                  fill="#E9F5F2"
                  fontSize="12.5"
                  fontWeight="600"
                  fontFamily="Outfit, sans-serif"
                >
                  {topic.title.length > 26
                    ? `${topic.title.slice(0, 24)}…`
                    : topic.title}
                </text>
              </g>

              {/* Branch Nodes */}
              {nodePositions.map(({ branch, x, y }) => {
                const isSelected = activeBranch?.id === branch.id;
                const isRead = readSet.has(branch.id);
                const boxW = 164;
                const boxH = 58;
                return (
                  <g
                    key={branch.id}
                    transform={`translate(${x}, ${y})`}
                    onClick={() => handleSelectBranch(branch.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectBranch(branch.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    className="cursor-pointer focus:outline-none"
                  >
                    <rect
                      x={-boxW / 2}
                      y={-boxH / 2}
                      width={boxW}
                      height={boxH}
                      rx="12"
                      fill={isSelected ? '#0E2E47' : isRead ? '#113A36' : '#13312E'}
                      stroke={isSelected ? '#38BDF8' : isRead ? '#14B8A6' : '#285B55'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter="url(#nodeShadow)"
                    />
                    <text
                      x={-boxW / 2 + 12}
                      y={-8}
                      fill={isSelected ? '#7DD3FC' : isRead ? '#5EEAD4' : '#98BEB6'}
                      fontSize="10.5"
                      fontWeight="600"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      {branch.code} {isRead ? '· READ' : '· UNREAD'}
                    </text>
                    <text
                      x={-boxW / 2 + 12}
                      y={12}
                      fill="#E9F5F2"
                      fontSize="12"
                      fontWeight="600"
                      fontFamily="DM Sans, sans-serif"
                    >
                      {branch.title.length > 21
                        ? `${branch.title.slice(0, 19)}…`
                        : branch.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Quick Branch Selector Buttons for Keyboard / Mobile Ease */}
          <div className="pt-4 mt-4 border-t border-[#1E4D48] flex flex-wrap gap-2">
            {topic.branches.map((b) => {
              const isSelected = activeBranch?.id === b.id;
              const isRead = readSet.has(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBranch(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0E2E47] text-[#E0F2FE] border-[#38BDF8]'
                      : isRead
                        ? 'bg-[#113A36] text-[#5EEAD4] border-[#1F6B62] hover:bg-[#164A45]'
                        : 'bg-[#0E2927] text-[#98BEB6] border-[#255A54] hover:bg-[#143633] hover:text-[#E9F5F2]'
                  }`}
                >
                  {isRead ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <CircleDot className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="whitespace-nowrap">
                    {b.code} {b.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Zone: Active Branch Concept Deck */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between bg-[#0E2927]">
          {activeBranch && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#98BEB6]">
                  <span className="font-mono font-semibold text-[#38BDF8]">
                    Section {activeBranch.code}
                  </span>
                  <span className="flex items-center gap-1 text-[#5EEAD4] font-medium">
                    <BookCheck className="w-3.5 h-3.5" />
                    <span>{readSet.has(activeBranch.id) ? 'Reviewed' : 'Reading now'}</span>
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#E9F5F2] mt-1">
                  {activeBranch.title}
                </h3>
                <p className="text-sm text-[#B5D5CE] leading-relaxed mt-2">
                  {activeBranch.summary}
                </p>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-[#98BEB6] tracking-wide">
                  Syllabus Key Points
                </h4>
                <ul className="space-y-2">
                  {activeBranch.keyPoints.map((point, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-[#E9F5F2] leading-relaxed flex items-start gap-2.5"
                    >
                      <span className="font-mono text-xs text-[#5EEAD4] font-semibold mt-1 shrink-0">
                        0{idx + 1}.
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#291E0B] border border-[#785314]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FCD34D] mb-1">
                  <Lightbulb className="w-4 h-4 text-[#F59E0B] shrink-0" />
                  <span>Cambridge 0417 Exam Tip</span>
                </div>
                <p className="text-sm text-[#FDE68A] leading-relaxed">
                  {activeBranch.examTip}
                </p>
              </div>

              <div className="pt-2 text-xs text-[#98BEB6]">
                <span className="font-medium text-[#E9F5F2]">Key terms: </span>
                {activeBranch.keywords.join(' · ')}
              </div>
            </div>
          )}

          <div className="pt-5 mt-6 border-t border-[#1E4D48] flex items-center justify-between gap-4">
            <span className="text-xs text-[#98BEB6]">
              {isCompleted
                ? 'All branches read — ready to launch quiz or games below.'
                : `Read remaining ${totalCount - readCount} branch${totalCount - readCount === 1 ? '' : 'es'} to unlock quiz.`}
            </span>
            {!readSet.has(activeBranch?.id || '') && activeBranch && (
              <button
                type="button"
                onClick={() => handleSelectBranch(activeBranch.id)}
                className="px-3.5 py-2 text-xs font-semibold bg-[#14B8A6] hover:bg-[#0D9488] text-[#051B19] rounded-lg cursor-pointer whitespace-nowrap"
              >
                Mark Branch Read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
