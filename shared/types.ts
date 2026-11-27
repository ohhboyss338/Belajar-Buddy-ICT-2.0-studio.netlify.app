export type UserRole = 'student' | 'teacher';

export type QuizMode =
  | 'classic'
  | 'byte_blaster'
  | 'circuit_grid'
  | 'tower_climb'
  | 'heart_quest'
  | 'pixel_boss';

export type QuizQuestionFilter = 'mcq' | 'fill_blank' | 'mixed';

export type QuestionType = 'mcq' | 'fill_blank';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  className: string;
  createdAt: string;
}

export interface MindMapBranch {
  id: string;
  code: string;
  title: string;
  summary: string;
  keyPoints: string[];
  examTip: string;
  keywords: string[];
}

export interface SyllabusTopic {
  id: number;
  title: string;
  subtitle?: string;
  branches: MindMapBranch[];
}

export interface NotesProgressEntry {
  readNodeIds: string[];
  completed: boolean;
  completedAt?: string;
}

export interface TopicSummaryForUser extends SyllabusTopic {
  enabled: boolean;
  questionCounts: {
    mcq: number;
    fill_blank: number;
    total: number;
  };
  notesProgress: NotesProgressEntry;
  bestScore?: {
    score: number;
    totalQuestions: number;
    percentage: number;
    mode: QuizMode;
    completedAt: string;
  };
  attemptsCount: number;
}

export interface AppSettings {
  enabledTopics: number[];
  requireNotesBeforeQuiz: boolean;
  enabledGames: QuizMode[];
}

export interface QuestionItem {
  id: string;
  topicId: number;
  type: QuestionType;
  subtopicCode: string;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation: string;
}

export interface ClientQuestion {
  id: string;
  topicId: number;
  type: QuestionType;
  subtopicCode: string;
  prompt: string;
  options?: string[];
}

export interface QuizStartResponse {
  sessionId: string;
  topicId: number;
  topicTitle: string;
  mode: QuizMode;
  questionFilter: QuizQuestionFilter;
  durationSeconds: number;
  startedAt: string;
  uniqueGuaranteeCount: number;
  questions: ClientQuestion[];
}

export interface GradedQuestionResult {
  questionId: string;
  prompt: string;
  type: QuestionType;
  subtopicCode: string;
  options?: string[];
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizSubmitResponse {
  attemptId: string;
  topicId: number;
  topicTitle: string;
  mode: QuizMode;
  score: number;
  totalQuestions: number;
  percentage: number;
  grade: string;
  timeTakenSeconds: number;
  completedAt: string;
  results: GradedQuestionResult[];
}

export interface RankingEntry {
  attemptId: string;
  userId: string;
  studentName: string;
  className: string;
  topicId: number;
  topicTitle: string;
  mode: QuizMode;
  questionFilter: QuizQuestionFilter;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTakenSeconds: number;
  completedAt: string;
}

export interface StudentTopicStatus {
  notesCompleted: boolean;
  readNodesCount: number;
  totalNodesCount: number;
  attempted: boolean;
  attemptsCount: number;
  bestScore: number | null;
  bestTotal: number | null;
  bestPercentage: number | null;
  lastMode: QuizMode | null;
  lastAttemptAt: string | null;
}

export interface StudentCompletionRow {
  userId: string;
  name: string;
  email: string;
  className: string;
  createdAt: string;
  topicsCompletedCount: number;
  notesReadCount: number;
  averagePercentage: number | null;
  lastActiveAt: string | null;
  topicStatus: Record<number, StudentTopicStatus>;
}

export interface AdminOverviewResponse {
  settings: AppSettings;
  students: StudentCompletionRow[];
  recentAttempts: RankingEntry[];
  totalQuestions: number;
}
