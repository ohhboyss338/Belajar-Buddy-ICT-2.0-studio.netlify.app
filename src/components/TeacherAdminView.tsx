import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  FileCheck2,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sliders,
  Trash2,
  Unlock,
  Users,
  X,
  XCircle
} from 'lucide-react';
import type {
  AdminOverviewResponse,
  AppSettings,
  QuestionItem,
  QuestionType,
  QuizMode,
  StudentCompletionRow,
  TopicSummaryForUser
} from '../../shared/types.ts';
import { api } from '../lib/api.ts';

interface TeacherAdminViewProps {
  topics: TopicSummaryForUser[];
  onDataUpdated: () => Promise<void>;
}

type AdminTab = 'tracker' | 'questions' | 'controls';
type StatusFilter = 'all' | 'completed' | 'notes_only' | 'not_started';

const GAME_OPTIONS: { id: QuizMode; label: string; description: string }[] = [
  {
    id: 'classic',
    label: 'Classic Study Quiz',
    description: 'Standard timed assessment with Next, Previous & Submit review.'
  },
  {
    id: 'heart_quest',
    label: 'Heart Quest Survival (5 Hearts)',
    description: 'Lose 1 Heart on wrong answers; 3-answer streak heals +1 Heart.'
  },
  {
    id: 'pixel_boss',
    label: 'Cyber Boss Battle (3 Hearts)',
    description: 'Fight the System Boss; wrong answers trigger counter-attacks (-1 Heart).'
  },
  {
    id: 'byte_blaster',
    label: 'ByteBlaster Defense',
    description: 'Firewall shield defense game with streak multipliers.'
  },
  {
    id: 'circuit_grid',
    label: 'Circuit Grid Challenge',
    description: 'Interactive logic-node grid unlocked question by question.'
  },
  {
    id: 'tower_climb',
    label: 'Data Tower Climb',
    description: 'Server tower ascent with syllabus clue lifelines.'
  }
];

export function TeacherAdminView({ topics, onDataUpdated }: TeacherAdminViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('tracker');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // Student tracker filters
  const [studentSearch, setStudentSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [confirmActionKey, setConfirmActionKey] = useState<string | null>(null);
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);

  // Question bank manager state
  const [qTopicFilter, setQTopicFilter] = useState<number>(1);
  const [qTypeFilter, setQTypeFilter] = useState<'all' | QuestionType>('all');
  const [qSearch, setQSearch] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(25);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [confirmDeleteQId, setConfirmDeleteQId] = useState<string | null>(null);

  // Add / Edit Question Form fields
  const [formTopicId, setFormTopicId] = useState<number>(1);
  const [formSubtopic, setFormSubtopic] = useState('1.1');
  const [formType, setFormType] = useState<QuestionType>('mcq');
  const [formPrompt, setFormPrompt] = useState('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('');
  const [formAcceptedExtras, setFormAcceptedExtras] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Settings draft
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  async function loadOverview() {
    setLoadingOverview(true);
    setBannerError(null);
    try {
      const res = await api.getAdminOverview();
      setOverview(res);
      setSettingsDraft(res.settings);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Unable to load teacher overview.');
    } finally {
      setLoadingOverview(false);
    }
  }

  async function loadQuestions() {
    setLoadingQuestions(true);
    setBannerError(null);
    try {
      const res = await api.getAdminQuestions({
        topicId: qTopicFilter,
        type: qTypeFilter,
        search: qSearch.trim() || undefined
      });
      setQuestions(res.questions);
      setVisibleLimit(25);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Unable to load questions.');
    } finally {
      setLoadingQuestions(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'questions') {
      void loadQuestions();
    }
  }, [activeTab, qTopicFilter, qTypeFilter]);

  const distinctClasses = useMemo(() => {
    if (!overview) return [];
    const set = new Set(overview.students.map((s) => s.className).filter(Boolean));
    return Array.from(set).sort();
  }, [overview]);

  const filteredStudents = useMemo(() => {
    if (!overview) return [];
    return overview.students.filter((stu) => {
      if (classFilter !== 'all' && stu.className !== classFilter) return false;
      if (
        studentSearch.trim() &&
        !stu.name.toLowerCase().includes(studentSearch.trim().toLowerCase()) &&
        !stu.className.toLowerCase().includes(studentSearch.trim().toLowerCase())
      ) {
        return false;
      }
      if (statusFilter !== 'all') {
        if (topicFilter === 'all') {
          if (statusFilter === 'completed' && stu.topicsCompletedCount === 0) return false;
          if (
            statusFilter === 'notes_only' &&
            (stu.notesReadCount === 0 || stu.topicsCompletedCount > 0)
          ) {
            return false;
          }
          if (
            statusFilter === 'not_started' &&
            (stu.notesReadCount > 0 || stu.topicsCompletedCount > 0)
          ) {
            return false;
          }
        } else {
          const ts = stu.topicStatus[topicFilter];
          if (!ts) return false;
          if (statusFilter === 'completed' && !ts.attempted) return false;
          if (statusFilter === 'notes_only' && (!ts.notesCompleted || ts.attempted)) return false;
          if (statusFilter === 'not_started' && (ts.notesCompleted || ts.attempted)) return false;
        }
      }
      return true;
    });
  }, [overview, classFilter, studentSearch, statusFilter, topicFilter]);

  const overallStats = useMemo(() => {
    if (!overview) {
      return { totalStudents: 0, activeStudents: 0, avgScore: '-', totalAttempts: 0 };
    }
    const totalStudents = overview.students.length;
    const withScores = overview.students.filter((s) => s.averagePercentage !== null);
    const avgScore =
      withScores.length > 0
        ? `${Math.round(
            withScores.reduce((acc, s) => acc + (s.averagePercentage || 0), 0) /
              withScores.length
          )}%`
        : '-';
    const activeStudents = overview.students.filter(
      (s) => s.topicsCompletedCount > 0 || s.notesReadCount > 0
    ).length;
    return {
      totalStudents,
      activeStudents,
      avgScore,
      totalAttempts: overview.recentAttempts.length
    };
  }, [overview]);

  function openAddQuestionForm() {
    setEditingQuestion(null);
    setFormTopicId(qTopicFilter);
    setFormSubtopic(`${qTopicFilter}.1`);
    setFormType(qTypeFilter === 'fill_blank' ? 'fill_blank' : 'mcq');
    setFormPrompt('');
    setFormOptions(['', '', '', '']);
    setFormCorrectAnswer('');
    setFormAcceptedExtras('');
    setFormExplanation('');
    setShowAddForm(true);
    setBannerError(null);
    setBannerSuccess(null);
  }

  function openEditQuestionForm(q: QuestionItem) {
    setShowAddForm(false);
    setEditingQuestion(q);
    setFormTopicId(q.topicId);
    setFormSubtopic(q.subtopicCode);
    setFormType(q.type);
    setFormPrompt(q.prompt);
    const opts = q.options ? [...q.options] : ['', '', '', ''];
    while (opts.length < 4) opts.push('');
    setFormOptions(opts.slice(0, 4));
    setFormCorrectAnswer(q.correctAnswer);
    setFormAcceptedExtras(
      (q.acceptedAnswers || [])
        .filter((a) => a.toLowerCase() !== q.correctAnswer.toLowerCase())
        .join(', ')
    );
    setFormExplanation(q.explanation);
    setBannerError(null);
    setBannerSuccess(null);
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault();
    setBannerError(null);
    setBannerSuccess(null);
    setSavingQuestion(true);
    try {
      const cleanedOpts = formOptions.map((o) => o.trim()).filter(Boolean);
      const payload = {
        topicId: formTopicId,
        subtopicCode: formSubtopic.trim() || `${formTopicId}.1`,
        type: formType,
        prompt: formPrompt.trim(),
        options: formType === 'mcq' ? cleanedOpts : undefined,
        correctAnswer: formCorrectAnswer.trim(),
        acceptedAnswers:
          formType === 'fill_blank'
            ? formAcceptedExtras
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
        explanation: formExplanation.trim() || 'Verified syllabus answer.'
      };

      if (editingQuestion) {
        await api.updateAdminQuestion(editingQuestion.id, payload);
        setEditingQuestion(null);
        setBannerSuccess('Question updated in syllabus bank.');
      } else {
        await api.createAdminQuestion(payload);
        setShowAddForm(false);
        setBannerSuccess('New question added to syllabus bank.');
      }
      await Promise.all([loadQuestions(), loadOverview(), onDataUpdated()]);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Unable to save question.');
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleDeleteQuestion(id: string) {
    setBannerError(null);
    setBannerSuccess(null);
    try {
      await api.deleteAdminQuestion(id);
      setConfirmDeleteQId(null);
      setBannerSuccess('Question removed.');
      await Promise.all([loadQuestions(), loadOverview(), onDataUpdated()]);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Unable to delete question.');
    }
  }

  async function handleStudentAction(
    userId: string,
    action: 'reset_progress' | 'remove_account'
  ) {
    setBusyStudentId(userId);
    setBannerError(null);
    setBannerSuccess(null);
    try {
      await api.resetStudent(userId, action);
      setConfirmActionKey(null);
      setBannerSuccess(
        action === 'remove_account'
          ? 'Student account and history removed.'
          : 'Student progress reset.'
      );
      await loadOverview();
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusyStudentId(null);
    }
  }

  async function handleUpdateSettings(next: AppSettings) {
    setSettingsDraft(next);
    setSavingSettings(true);
    setBannerError(null);
    setBannerSuccess(null);
    try {
      const res = await api.updateAdminSettings(next);
      setSettingsDraft(res.settings);
      setBannerSuccess('App controls saved and applied immediately.');
      await onDataUpdated();
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSavingSettings(false);
    }
  }

  function exportCsv() {
    if (!overview) return;
    const headers = [
      'Name',
      'Class',
      'Email',
      'Notes Read (of 11)',
      'Topics Completed (of 11)',
      'Average %',
      ...topics.map((t) => `T${t.id} Status`)
    ];
    const escapeCell = (val: string | number) =>
      `"${String(val).replace(/"/g, '""')}"`;

    const rows = filteredStudents.map((stu) => {
      const topicCols = topics.map((t) => {
        const ts = stu.topicStatus[t.id];
        if (!ts) return 'Not Started';
        if (ts.attempted) return `Done (${ts.bestPercentage}%)`;
        if (ts.notesCompleted) return 'Notes Read Only';
        return 'Not Started';
      });
      return [
        stu.name,
        stu.className,
        stu.email,
        stu.notesReadCount,
        stu.topicsCompletedCount,
        stu.averagePercentage !== null ? `${stu.averagePercentage}%` : 'N/A',
        ...topicCols
      ]
        .map(escapeCell)
        .join(',');
    });

    const csvContent = [headers.map(escapeCell).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `belajarbuddy-student-progress-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderTopicStatusLabel(stu: StudentCompletionRow) {
    if (topicFilter === 'all') {
      return (
        <span className="text-xs text-[#98BEB6] font-mono tabular-nums">
          {stu.topicsCompletedCount}/11 quizzed · {stu.notesReadCount}/11 notes
        </span>
      );
    }
    const ts = stu.topicStatus[topicFilter];
    if (!ts) {
      return <span className="text-xs text-[#98BEB6]">Not started</span>;
    }
    if (ts.attempted) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5EEAD4]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono tabular-nums">
            Completed · {ts.bestScore}/{ts.bestTotal} ({ts.bestPercentage}%)
          </span>
        </span>
      );
    }
    if (ts.notesCompleted) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#38BDF8]">
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span>Notes Read · Quiz Pending</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[#98BEB6]">
        <XCircle className="w-3.5 h-3.5 shrink-0 text-[#658C84]" />
        <span>Not Started ({ts.readNodesCount}/{ts.totalNodesCount} notes)</span>
      </span>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#98BEB6]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Teacher Administration</span>
            <span aria-hidden="true">·</span>
            <span>Restricted Staff Console</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#E9F5F2] mt-0.5">
            BelajarBuddy Control Center
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#091E1C] border border-[#1E4D48] rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('tracker')}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'tracker'
                ? 'bg-[#16423E] text-[#5EEAD4]'
                : 'text-[#98BEB6] hover:text-[#E9F5F2]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Tracker</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'questions'
                ? 'bg-[#16423E] text-[#5EEAD4]'
                : 'text-[#98BEB6] hover:text-[#E9F5F2]'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Question Bank</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'controls'
                ? 'bg-[#16423E] text-[#5EEAD4]'
                : 'text-[#98BEB6] hover:text-[#E9F5F2]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>App Controls</span>
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0E2927] border border-[#1E4D48] rounded-xl p-4">
          <span className="text-xs text-[#98BEB6] block">Registered Students</span>
          <span className="font-mono tabular-nums text-2xl font-bold text-[#E9F5F2] mt-1 block">
            {overallStats.totalStudents}
          </span>
        </div>
        <div className="bg-[#0E2927] border border-[#1E4D48] rounded-xl p-4">
          <span className="text-xs text-[#98BEB6] block">Active Learners</span>
          <span className="font-mono tabular-nums text-2xl font-bold text-[#38BDF8] mt-1 block">
            {overallStats.activeStudents}
          </span>
        </div>
        <div className="bg-[#0E2927] border border-[#1E4D48] rounded-xl p-4">
          <span className="text-xs text-[#98BEB6] block">Class Avg Score</span>
          <span className="font-mono tabular-nums text-2xl font-bold text-[#5EEAD4] mt-1 block">
            {overallStats.avgScore}
          </span>
        </div>
        <div className="bg-[#0E2927] border border-[#1E4D48] rounded-xl p-4">
          <span className="text-xs text-[#98BEB6] block">Total Questions in Bank</span>
          <span className="font-mono tabular-nums text-2xl font-bold text-[#E9F5F2] mt-1 block">
            {overview?.totalQuestions ?? 0}
          </span>
        </div>
      </div>

      {bannerError && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-[#2D101B] border border-[#881337] text-[#FECDD3] text-sm flex items-center justify-between"
        >
          <span>{bannerError}</span>
          <button
            type="button"
            onClick={() => setBannerError(null)}
            className="text-[#FDA4AF] hover:text-[#FFF1F2] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {bannerSuccess && (
        <div className="px-4 py-3 rounded-xl bg-[#0D3833] border border-[#1F6B62] text-[#99F6E4] text-sm flex items-center justify-between">
          <span>{bannerSuccess}</span>
          <button
            type="button"
            onClick={() => setBannerSuccess(null)}
            className="text-[#5EEAD4] hover:text-[#E9F5F2] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: STUDENT TRACKER */}
      {activeTab === 'tracker' && (
        <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-[#1E4D48] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-4 h-4 text-[#658C84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student or class..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#255A54] bg-[#091E1C] focus:bg-[#0B2220] rounded-lg text-[#E9F5F2] placeholder-[#658C84] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                aria-label="Filter by class"
                className="px-3 py-2 text-sm border border-[#255A54] rounded-lg bg-[#091E1C] text-[#E9F5F2]"
              >
                <option value="all" className="bg-[#091E1C] text-[#E9F5F2]">All Classes</option>
                {distinctClasses.map((cls) => (
                  <option key={cls} value={cls} className="bg-[#091E1C] text-[#E9F5F2]">
                    Class {cls}
                  </option>
                ))}
              </select>

              <select
                value={topicFilter === 'all' ? 'all' : String(topicFilter)}
                onChange={(e) =>
                  setTopicFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                aria-label="Filter by topic"
                className="px-3 py-2 text-sm border border-[#255A54] rounded-lg bg-[#091E1C] text-[#E9F5F2] max-w-xs"
              >
                <option value="all" className="bg-[#091E1C] text-[#E9F5F2]">All Topics (1–11 Overview)</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#091E1C] text-[#E9F5F2]">
                    Topic {t.id}: {t.title}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                aria-label="Filter by completion status"
                className="px-3 py-2 text-sm border border-[#255A54] rounded-lg bg-[#091E1C] text-[#E9F5F2]"
              >
                <option value="all" className="bg-[#091E1C] text-[#E9F5F2]">All Statuses</option>
                <option value="completed" className="bg-[#091E1C] text-[#E9F5F2]">Completed Quiz</option>
                <option value="notes_only" className="bg-[#091E1C] text-[#E9F5F2]">Notes Read Only</option>
                <option value="not_started" className="bg-[#091E1C] text-[#E9F5F2]">Not Started</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadOverview()}
                className="px-3 py-2 rounded-lg border border-[#255A54] bg-[#091E1C] hover:bg-[#133633] text-xs font-medium text-[#E9F5F2] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                disabled={filteredStudents.length === 0}
                onClick={exportCsv}
                className="px-3.5 py-2 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] disabled:opacity-40 text-[#051B19] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {loadingOverview ? (
            <div className="p-10 text-center text-sm text-[#98BEB6]">
              Loading student completion matrix...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Users className="w-8 h-8 text-[#658C84] mx-auto" />
              <p className="text-sm font-medium text-[#E9F5F2]">
                No matching student accounts found.
              </p>
              <p className="text-xs text-[#98BEB6]">
                When students sign up and explore Mind Maps or submit quizzes, their real-time
                completion status appears here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1E4D48] bg-[#091E1C] text-xs font-semibold text-[#98BEB6]">
                    <th className="py-3 px-5">Student</th>
                    <th className="py-3 px-5">Class</th>
                    <th className="py-3 px-5">Progress</th>
                    <th className="py-3 px-5">Avg Score</th>
                    <th className="py-3 px-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E4D48] text-sm">
                  {filteredStudents.map((stu) => {
                    const isExpanded = expandedStudentId === stu.userId;
                    const resetKey = `reset:${stu.userId}`;
                    const removeKey = `remove:${stu.userId}`;
                    return (
                      <React.Fragment key={stu.userId}>
                        <tr className="hover:bg-[#133633]">
                          <td className="py-3.5 px-5">
                            <div className="font-medium text-[#E9F5F2]">{stu.name}</div>
                            <div className="text-xs text-[#98BEB6]">{stu.email}</div>
                          </td>
                          <td className="py-3.5 px-5 text-[#98BEB6]">{stu.className}</td>
                          <td className="py-3.5 px-5">{renderTopicStatusLabel(stu)}</td>
                          <td className="py-3.5 px-5 font-mono tabular-nums font-semibold text-[#E9F5F2]">
                            {stu.averagePercentage !== null ? `${stu.averagePercentage}%` : '—'}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedStudentId(isExpanded ? null : stu.userId)
                                }
                                className="px-2.5 py-1.5 rounded-md border border-[#255A54] bg-[#091E1C] hover:bg-[#16423E] text-xs font-medium text-[#E9F5F2] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                                <span>Topics 1–11</span>
                              </button>

                              {confirmActionKey === resetKey ? (
                                <button
                                  type="button"
                                  disabled={busyStudentId === stu.userId}
                                  onClick={() =>
                                    void handleStudentAction(stu.userId, 'reset_progress')
                                  }
                                  className="px-2.5 py-1.5 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-[#1F1303] text-xs font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  Confirm Reset
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmActionKey(resetKey)}
                                  className="px-2.5 py-1.5 rounded-md border border-[#255A54] bg-[#091E1C] hover:bg-[#291E0B] hover:border-[#785314] text-xs font-medium text-[#FBBF24] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Reset</span>
                                </button>
                              )}

                              {confirmActionKey === removeKey ? (
                                <button
                                  type="button"
                                  disabled={busyStudentId === stu.userId}
                                  onClick={() =>
                                    void handleStudentAction(stu.userId, 'remove_account')
                                  }
                                  className="px-2.5 py-1.5 rounded-md bg-[#E11D48] hover:bg-[#BE123C] text-[#FFF1F2] text-xs font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  Confirm Remove
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmActionKey(removeKey)}
                                  className="px-2.5 py-1.5 rounded-md border border-[#255A54] bg-[#091E1C] hover:bg-[#2D101B] hover:border-[#881337] text-xs font-medium text-[#FB7185] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[#091E1C]">
                            <td colSpan={5} className="p-5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {topics.map((t) => {
                                  const ts = stu.topicStatus[t.id];
                                  return (
                                    <div
                                      key={t.id}
                                      className="p-3.5 rounded-xl bg-[#0E2927] border border-[#1E4D48] space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-[#E9F5F2]">
                                          Topic {t.id}: {t.title}
                                        </span>
                                      </div>
                                      <div className="text-xs text-[#98BEB6] flex items-center justify-between">
                                        <span>Mind Map Notes</span>
                                        <span
                                          className={
                                            ts?.notesCompleted
                                              ? 'font-medium text-[#5EEAD4]'
                                              : 'text-[#98BEB6]'
                                          }
                                        >
                                          {ts?.notesCompleted
                                            ? 'Complete'
                                            : `${ts?.readNodesCount || 0}/${ts?.totalNodesCount || t.branches.length} read`}
                                        </span>
                                      </div>
                                      <div className="text-xs text-[#98BEB6] flex items-center justify-between">
                                        <span>Quiz / Game</span>
                                        <span
                                          className={`font-mono tabular-nums ${
                                            ts?.attempted
                                              ? 'font-semibold text-[#38BDF8]'
                                              : 'text-[#658C84]'
                                          }`}
                                        >
                                          {ts?.attempted
                                            ? `${ts.bestScore}/${ts.bestTotal} (${ts.bestPercentage}%)`
                                            : 'Not Done'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUESTION BANK MANAGER */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <select
                value={qTopicFilter}
                onChange={(e) => setQTopicFilter(Number(e.target.value))}
                aria-label="Question Topic Filter"
                className="px-3 py-2 text-sm border border-[#255A54] rounded-lg bg-[#091E1C] text-[#E9F5F2] max-w-xs"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#091E1C] text-[#E9F5F2]">
                    Topic {t.id}: {t.title}
                  </option>
                ))}
              </select>

              <select
                value={qTypeFilter}
                onChange={(e) => setQTypeFilter(e.target.value as 'all' | QuestionType)}
                aria-label="Question Type Filter"
                className="px-3 py-2 text-sm border border-[#255A54] rounded-lg bg-[#091E1C] text-[#E9F5F2]"
              >
                <option value="all" className="bg-[#091E1C] text-[#E9F5F2]">All Types</option>
                <option value="mcq" className="bg-[#091E1C] text-[#E9F5F2]">Multiple Choice (MCQ)</option>
                <option value="fill_blank" className="bg-[#091E1C] text-[#E9F5F2]">Fill in the Blank</option>
              </select>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void loadQuestions();
                }}
                className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#658C84] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={qSearch}
                    onChange={(e) => setQSearch(e.target.value)}
                    placeholder="Search prompt or answer..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#255A54] bg-[#091E1C] focus:bg-[#0B2220] rounded-lg text-[#E9F5F2] placeholder-[#658C84]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg border border-[#255A54] bg-[#091E1C] hover:bg-[#133633] text-xs font-medium text-[#E9F5F2] cursor-pointer"
                >
                  Filter
                </button>
              </form>
            </div>

            <button
              type="button"
              onClick={openAddQuestionForm}
              className="px-4 py-2 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] text-[#051B19] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>

          {(showAddForm || editingQuestion) && (
            <form
              onSubmit={(e) => void handleSaveQuestion(e)}
              className="bg-[#0E2927] border border-[#14B8A6] rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-[#E9F5F2]">
                  {editingQuestion ? 'Edit Question' : 'Add New Syllabus Question'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingQuestion(null);
                  }}
                  className="text-[#98BEB6] hover:text-[#E9F5F2] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#E9F5F2] mb-1">Topic</label>
                  <select
                    value={formTopicId}
                    disabled={Boolean(editingQuestion)}
                    onChange={(e) => setFormTopicId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-[#255A54] rounded-lg bg-[#091E1C] text-[#E9F5F2] disabled:opacity-60"
                  >
                    {topics.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#091E1C] text-[#E9F5F2]">
                        Topic {t.id}: {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#E9F5F2] mb-1">
                    Format
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 text-sm border border-[#255A54] rounded-lg bg-[#091E1C] text-[#E9F5F2]"
                  >
                    <option value="mcq" className="bg-[#091E1C] text-[#E9F5F2]">Multiple Choice (MCQ)</option>
                    <option value="fill_blank" className="bg-[#091E1C] text-[#E9F5F2]">Fill in the Blank</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#E9F5F2] mb-1">
                    Subtopic Code
                  </label>
                  <input
                    type="text"
                    value={formSubtopic}
                    onChange={(e) => setFormSubtopic(e.target.value)}
                    placeholder="e.g. 1.2"
                    className="w-full px-3 py-2 text-sm border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#E9F5F2] mb-1">
                  Question Prompt
                </label>
                <textarea
                  rows={2}
                  required
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Enter the question (use _____ for blanks)..."
                  className="w-full px-3 py-2 text-sm border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] rounded-lg"
                />
              </div>

              {formType === 'mcq' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formOptions.map((opt, idx) => (
                      <div key={idx}>
                        <label className="block text-xs font-medium text-[#E9F5F2] mb-1">
                          Option {idx + 1}
                        </label>
                        <input
                          type="text"
                          required={idx < 2}
                          value={opt}
                          onChange={(e) => {
                            const next = [...formOptions];
                            next[idx] = e.target.value;
                            setFormOptions(next);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          className="w-full px-3 py-2 text-sm border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E9F5F2] mb-1">
                      Correct Answer (must match one option above)
                    </label>
                    <select
                      required
                      value={formCorrectAnswer}
                      onChange={(e) => setFormCorrectAnswer(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#255A54] rounded-lg bg-[#091E1C] text-[#E9F5F2]"
                    >
                      <option value="" className="bg-[#091E1C] text-[#E9F5F2]">-- Select exact correct option --</option>
                      {formOptions
                        .map((o) => o.trim())
                        .filter(Boolean)
                        .map((o, idx) => (
                          <option key={idx} value={o} className="bg-[#091E1C] text-[#E9F5F2]">
                            {o}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#E9F5F2] mb-1">
                      Primary Correct Answer
                    </label>
                    <input
                      type="text"
                      required
                      value={formCorrectAnswer}
                      onChange={(e) => setFormCorrectAnswer(e.target.value)}
                      placeholder="Exact answer word or phrase"
                      className="w-full px-3 py-2 text-sm border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E9F5F2] mb-1">
                      Alternate Accepted Answers (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formAcceptedExtras}
                      onChange={(e) => setFormAcceptedExtras(e.target.value)}
                      placeholder="e.g. ram, random access memory"
                      className="w-full px-3 py-2 text-sm border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#E9F5F2] mb-1">
                  Syllabus Explanation
                </label>
                <input
                  type="text"
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Why this answer is correct..."
                  className="w-full px-3 py-2 text-sm border border-[#255A54] bg-[#091E1C] text-[#E9F5F2] placeholder-[#658C84] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingQuestion(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#255A54] bg-[#091E1C] hover:bg-[#133633] text-xs font-medium text-[#E9F5F2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="px-5 py-2 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] text-[#051B19] text-xs font-semibold cursor-pointer"
                >
                  {savingQuestion ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1E4D48] flex items-center justify-between">
              <span className="text-sm font-semibold text-[#E9F5F2]">
                Topic {qTopicFilter} Questions
              </span>
              <span className="text-xs font-mono tabular-nums text-[#98BEB6]">
                Showing {Math.min(visibleLimit, questions.length)} of {questions.length}
              </span>
            </div>

            {loadingQuestions ? (
              <div className="p-8 text-center text-sm text-[#98BEB6]">
                Loading Topic {qTopicFilter} question bank...
              </div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#98BEB6]">
                No questions matched your filter.
              </div>
            ) : (
              <div className="divide-y divide-[#1E4D48]">
                {questions.slice(0, visibleLimit).map((q) => (
                  <div
                    key={q.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 text-xs text-[#98BEB6] font-mono">
                        <span>Section {q.subtopicCode}</span>
                        <span aria-hidden="true">·</span>
                        <span>{q.type === 'mcq' ? 'MCQ' : 'Fill Blank'}</span>
                      </div>
                      <p className="text-sm font-medium text-[#E9F5F2]">{q.prompt}</p>
                      <p className="text-xs text-[#5EEAD4] font-medium">
                        Answer: {q.correctAnswer}
                        {q.acceptedAnswers && q.acceptedAnswers.length > 1
                          ? ` (Also: ${q.acceptedAnswers
                              .filter((a) => a !== q.correctAnswer)
                              .join(', ')})`
                          : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditQuestionForm(q)}
                        className="px-3 py-1.5 rounded-lg border border-[#255A54] bg-[#091E1C] hover:bg-[#133633] text-xs font-medium text-[#E9F5F2] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {confirmDeleteQId === q.id ? (
                        <button
                          type="button"
                          onClick={() => void handleDeleteQuestion(q.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-[#FFF1F2] text-xs font-semibold cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteQId(q.id)}
                          className="px-3 py-1.5 rounded-lg border border-[#255A54] bg-[#091E1C] hover:bg-[#2D101B] hover:border-[#881337] text-xs font-medium text-[#FB7185] flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {visibleLimit < questions.length && (
                  <div className="p-4 text-center bg-[#091E1C]">
                    <button
                      type="button"
                      onClick={() => setVisibleLimit((v) => v + 25)}
                      className="px-4 py-2 rounded-lg border border-[#255A54] bg-[#0E2927] hover:bg-[#133633] text-xs font-medium text-[#E9F5F2] cursor-pointer"
                    >
                      Show 25 More Questions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: APP CONTROLS */}
      {activeTab === 'controls' && settingsDraft && (
        <div className="space-y-6">
          {/* Notes Gate Rule */}
          <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#E9F5F2]">
                <Settings className="w-4 h-4 text-[#5EEAD4]" />
                <span>Require Mind Map Notes Reading Before Quiz</span>
              </div>
              <p className="text-xs text-[#98BEB6] leading-relaxed">
                When enabled, students must read every branch of a topic’s Mind Map before
                unlocking quizzes and arcade games for that topic.
              </p>
            </div>

            <button
              type="button"
              disabled={savingSettings}
              onClick={() =>
                void handleUpdateSettings({
                  ...settingsDraft,
                  requireNotesBeforeQuiz: !settingsDraft.requireNotesBeforeQuiz
                })
              }
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                settingsDraft.requireNotesBeforeQuiz
                  ? 'bg-[#14B8A6] text-[#051B19] hover:bg-[#0D9488]'
                  : 'bg-[#091E1C] border border-[#255A54] text-[#98BEB6] hover:bg-[#133633] hover:text-[#E9F5F2]'
              }`}
            >
              {settingsDraft.requireNotesBeforeQuiz ? 'Enabled (Mandatory)' : 'Optional'}
            </button>
          </div>

          {/* Topic Locks */}
          <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-[#E9F5F2]">
                  Topic Availability (Topics 1–11)
                </h2>
                <p className="text-xs text-[#98BEB6] mt-0.5">
                  Enable or lock specific Cambridge 0417 topics for students across the platform.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingSettings}
                  onClick={() =>
                    void handleUpdateSettings({
                      ...settingsDraft,
                      enabledTopics: topics.map((t) => t.id)
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-[#255A54] bg-[#091E1C] hover:bg-[#133633] text-xs font-medium text-[#E9F5F2] cursor-pointer"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  disabled={savingSettings}
                  onClick={() =>
                    void handleUpdateSettings({
                      ...settingsDraft,
                      enabledTopics: []
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-[#881337] bg-[#2D101B] hover:bg-[#3B1524] text-xs font-medium text-[#FDA4AF] cursor-pointer"
                >
                  Lock All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topics.map((t) => {
                const isEnabled = settingsDraft.enabledTopics.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={savingSettings}
                    onClick={() => {
                      const nextTopics = isEnabled
                        ? settingsDraft.enabledTopics.filter((id) => id !== t.id)
                        : [...settingsDraft.enabledTopics, t.id];
                      void handleUpdateSettings({
                        ...settingsDraft,
                        enabledTopics: nextTopics
                      });
                    }}
                    className={`p-4 rounded-xl border text-left transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                      isEnabled
                        ? 'border-[#1F6B62] bg-[#0D3833] text-[#E9F5F2]'
                        : 'border-[#255A54] bg-[#091E1C] text-[#98BEB6]'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-mono font-semibold text-[#5EEAD4] block">
                        Topic {t.id}
                      </span>
                      <span className="text-sm font-medium">{t.title}</span>
                    </div>
                    {isEnabled ? (
                      <Unlock className="w-4 h-4 text-[#5EEAD4] shrink-0 mt-0.5" />
                    ) : (
                      <Lock className="w-4 h-4 text-[#658C84] shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quiz & Game Modes Toggle */}
          <div className="bg-[#0E2927] border border-[#1E4D48] rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#E9F5F2]">
                Enabled Quiz & Arcade Game Modes
              </h2>
              <p className="text-xs text-[#98BEB6] mt-0.5">
                Control which game modes students can launch (at least one mode must stay enabled).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GAME_OPTIONS.map((g) => {
                const isEnabled = settingsDraft.enabledGames.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    disabled={
                      savingSettings ||
                      (isEnabled && settingsDraft.enabledGames.length <= 1)
                    }
                    onClick={() => {
                      const nextGames = isEnabled
                        ? settingsDraft.enabledGames.filter((id) => id !== g.id)
                        : [...settingsDraft.enabledGames, g.id];
                      if (nextGames.length === 0) return;
                      void handleUpdateSettings({
                        ...settingsDraft,
                        enabledGames: nextGames
                      });
                    }}
                    className={`p-4 rounded-xl border text-left transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                      isEnabled
                        ? 'border-[#14B8A6] bg-[#0D3833] text-[#E9F5F2]'
                        : 'border-[#255A54] bg-[#091E1C] text-[#98BEB6]'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-semibold block">{g.label}</span>
                      <span className="text-xs opacity-80">{g.description}</span>
                    </div>
                    <span
                      className={`text-xs font-semibold shrink-0 ${
                        isEnabled ? 'text-[#5EEAD4]' : 'text-[#658C84]'
                      }`}
                    >
                      {isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
