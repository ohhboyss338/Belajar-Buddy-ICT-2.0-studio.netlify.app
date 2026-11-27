import React, { useEffect, useState } from 'react';
import { Award, Medal, RefreshCw, Trophy, X } from 'lucide-react';
import type { PublicUser, RankingEntry, TopicSummaryForUser } from '../../shared/types.ts';
import { api } from '../lib/api.ts';
import { mapFirebaseAuthError } from '../lib/firebase.ts';

interface RankingsViewProps {
  currentUser: PublicUser;
  topics: TopicSummaryForUser[];
  initialTopicId?: number | null;
}

export function RankingsView({
  currentUser,
  topics,
  initialTopicId = null
}: RankingsViewProps) {
  const [selectedTopicTab, setSelectedTopicTab] = useState<number | 'all'>(
    initialTopicId ?? 'all'
  );
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchRankings(tab: number | 'all') {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRankings(tab === 'all' ? undefined : tab);
      setRankings(res.rankings);
    } catch (err) {
      setError(mapFirebaseAuthError(err, 'Unable to load rankings.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchRankings(selectedTopicTab);
  }, [selectedTopicTab]);

  function formatMode(mode: RankingEntry['mode']) {
    if (mode === 'heart_quest') return 'Heart Quest';
    if (mode === 'pixel_boss') return 'Cyber Boss';
    if (mode === 'byte_blaster') return 'ByteBlaster';
    if (mode === 'circuit_grid') return 'Circuit Grid';
    if (mode === 'tower_climb') return 'Tower Climb';
    return 'Classic Quiz';
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#98BEB6]">
            <span>Class Leaderboard</span>
            <span aria-hidden="true">·</span>
            <span>Visible to all students & teachers</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#E9F5F2] mt-0.5 flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-[#F59E0B]" />
            <span>Rankings by Topic</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={() => void fetchRankings(selectedTopicTab)}
          className="px-3.5 py-2 rounded-lg border border-[#255A54] bg-[#0E2927] hover:bg-[#133633] text-xs font-medium text-[#E9F5F2] flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Rankings</span>
        </button>
      </div>

      {/* Topic Ranking Tabs */}
      <div className="bg-[#0E2927] border border-[#1E4D48] rounded-xl p-2 flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSelectedTopicTab('all')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            selectedTopicTab === 'all'
              ? 'bg-[#14B8A6] text-[#051B19]'
              : 'text-[#98BEB6] hover:bg-[#133633] hover:text-[#E9F5F2]'
          }`}
        >
          All Topics
        </button>
        {topics.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTopicTab(t.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedTopicTab === t.id
                ? 'bg-[#14B8A6] text-[#051B19]'
                : 'text-[#98BEB6] hover:bg-[#133633] hover:text-[#E9F5F2]'
            }`}
          >
            Topic {t.id}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#2D101B] border border-[#881337] text-[#FECDD3] text-sm flex items-start justify-between gap-3"
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

      {/* Rankings Table */}
      <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1E4D48] flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[#E9F5F2]">
            {selectedTopicTab === 'all'
              ? 'Overall Topic Submissions Leaderboard'
              : `Topic ${selectedTopicTab}: ${
                  topics.find((t) => t.id === selectedTopicTab)?.title || ''
                }`}
          </h2>
          <span className="text-xs text-[#98BEB6] font-mono tabular-nums">
            {rankings.length} recorded attempt{rankings.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-[#98BEB6]">Loading topic rankings...</div>
        ) : rankings.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Award className="w-8 h-8 text-[#658C84] mx-auto" />
            <p className="text-sm font-medium text-[#E9F5F2]">
              No student attempts recorded for this topic yet.
            </p>
            <p className="text-xs text-[#98BEB6]">
              Complete the Mind Map notes and submit a quiz or game to claim Rank #1.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E4D48] bg-[#091E1C] text-xs font-semibold text-[#98BEB6]">
                  <th className="py-3 px-5">Rank</th>
                  <th className="py-3 px-5">Name</th>
                  <th className="py-3 px-5">Class</th>
                  {selectedTopicTab === 'all' && <th className="py-3 px-5">Topic</th>}
                  <th className="py-3 px-5">Score</th>
                  <th className="py-3 px-5">Mode</th>
                  <th className="py-3 px-5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E4D48] text-sm">
                {rankings.map((entry, idx) => {
                  const isMe = entry.userId === currentUser.id;
                  return (
                    <tr
                      key={entry.attemptId}
                      className={isMe ? 'bg-[#123834]' : 'hover:bg-[#133633]'}
                    >
                      <td className="py-3.5 px-5 font-mono tabular-nums font-semibold text-[#E9F5F2]">
                        <span className="inline-flex items-center gap-1.5">
                          {idx < 3 && (
                            <Medal
                              className={`w-4 h-4 ${
                                idx === 0
                                  ? 'text-[#FBBF24]'
                                  : idx === 1
                                    ? 'text-[#98BEB6]'
                                    : 'text-[#F59E0B]'
                              }`}
                            />
                          )}
                          <span>#{idx + 1}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-medium text-[#E9F5F2]">
                        {entry.studentName}
                        {isMe ? ' (You)' : ''}
                      </td>
                      <td className="py-3.5 px-5 text-[#98BEB6]">{entry.className}</td>
                      {selectedTopicTab === 'all' && (
                        <td className="py-3.5 px-5 text-[#E9F5F2]">
                          Topic {entry.topicId}
                        </td>
                      )}
                      <td className="py-3.5 px-5 font-mono tabular-nums">
                        <span className="font-semibold text-[#E9F5F2]">
                          {entry.score}/{entry.totalQuestions}
                        </span>
                        <span className="text-[#5EEAD4] ml-2 font-medium">
                          ({entry.percentage}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-[#98BEB6]">{formatMode(entry.mode)}</td>
                      <td className="py-3.5 px-5 font-mono tabular-nums text-[#98BEB6]">
                        {formatTime(entry.timeTakenSeconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
