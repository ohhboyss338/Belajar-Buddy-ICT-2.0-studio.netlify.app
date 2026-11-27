import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trophy,
  XCircle
} from 'lucide-react';
import type { QuizSubmitResponse } from '../../shared/types.ts';

interface QuizResultsViewProps {
  result: QuizSubmitResponse;
  onBackToLearn: () => void;
  onViewRankings: () => void;
}

export function QuizResultsView({
  result,
  onBackToLearn,
  onViewRankings
}: QuizResultsViewProps) {
  const [filter, setFilter] = useState<'all' | 'incorrect'>('all');

  const mins = Math.floor(result.timeTakenSeconds / 60);
  const secs = result.timeTakenSeconds % 60;
  const formattedDuration = `${mins}m ${String(secs).padStart(2, '0')}s`;

  const visibleItems =
    filter === 'incorrect'
      ? result.results.filter((r) => !r.isCorrect)
      : result.results;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Score Summary Card */}
      <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#98BEB6]">
              <span>Topic {result.topicId} Results</span>
              <span aria-hidden="true">·</span>
              <span>{result.topicTitle}</span>
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-[#E9F5F2] mt-1">
              Assessment Complete
            </h1>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onViewRankings}
              className="px-4 py-2 rounded-lg border border-[#255A54] bg-[#091E1C] hover:bg-[#133633] text-sm font-medium text-[#E9F5F2] flex items-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-[#F59E0B]" />
              <span>View Topic Rankings</span>
            </button>
            <button
              type="button"
              onClick={onBackToLearn}
              className="px-4 py-2 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] text-[#051B19] text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Back to Topics</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#091E1C] border border-[#255A54]">
            <span className="text-xs text-[#98BEB6] block">Total Marks</span>
            <span className="font-mono tabular-nums text-2xl font-bold text-[#E9F5F2] mt-1 block">
              {result.score} / {result.totalQuestions}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#091E1C] border border-[#255A54]">
            <span className="text-xs text-[#98BEB6] block">Percentage</span>
            <span className="font-mono tabular-nums text-2xl font-bold text-[#38BDF8] mt-1 block">
              {result.percentage}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#0D3833] border border-[#1F6B62]">
            <span className="text-xs text-[#5EEAD4] block">Cambridge Grade</span>
            <span className="font-mono tabular-nums text-2xl font-bold text-[#5EEAD4] mt-1 flex items-center gap-2">
              <Award className="w-5 h-5" />
              {result.grade}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#091E1C] border border-[#255A54]">
            <span className="text-xs text-[#98BEB6] block">Time Taken</span>
            <span className="font-mono tabular-nums text-2xl font-bold text-[#E9F5F2] mt-1 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#98BEB6]" />
              {formattedDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Answer Key Breakdown */}
      <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1E4D48] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#E9F5F2]">
              Detailed Marks & Correct Answers
            </h2>
            <p className="text-xs text-[#98BEB6] mt-0.5">
              Review your responses alongside the verified syllabus answers and explanations.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#091E1C] border border-[#1E4D48] rounded-lg">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#16423E] text-[#5EEAD4]'
                  : 'text-[#98BEB6] hover:text-[#E9F5F2]'
              }`}
            >
              All ({result.results.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('incorrect')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                filter === 'incorrect'
                  ? 'bg-[#16423E] text-[#5EEAD4]'
                  : 'text-[#98BEB6] hover:text-[#E9F5F2]'
              }`}
            >
              Incorrect ({result.results.filter((r) => !r.isCorrect).length})
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#1E4D48]">
          {visibleItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#5EEAD4] font-medium">
              Perfect score — zero incorrect answers!
            </div>
          ) : (
            visibleItems.map((item, idx) => (
              <div key={item.questionId} className="p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[#98BEB6] font-mono">
                    Question {idx + 1} · Section {item.subtopicCode}
                  </span>
                  {item.isCorrect ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5EEAD4]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>1 / 1 Mark · Correct</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FB7185]">
                      <XCircle className="w-4 h-4" />
                      <span>0 / 1 Mark · Incorrect</span>
                    </span>
                  )}
                </div>

                <p className="text-base font-medium text-[#E9F5F2]">{item.prompt}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div
                    className={`p-3 rounded-lg border ${
                      item.isCorrect
                        ? 'bg-[#0D3833] border-[#1F6B62] text-[#E9F5F2]'
                        : 'bg-[#2D101B] border-[#881337] text-[#FECDD3]'
                    }`}
                  >
                    <span className="text-xs font-medium opacity-75 block mb-0.5">
                      Your Answer
                    </span>
                    <span className="font-medium">
                      {item.userAnswer || '(No answer submitted)'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border bg-[#0D3833] border-[#1F6B62] text-[#E9F5F2]">
                    <span className="text-xs font-medium text-[#5EEAD4] block mb-0.5">
                      Correct Answer
                    </span>
                    <span className="font-semibold">{item.correctAnswer}</span>
                  </div>
                </div>

                <p className="text-xs text-[#98BEB6] leading-relaxed">
                  <strong className="text-[#E9F5F2]">Explanation: </strong>
                  {item.explanation}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
