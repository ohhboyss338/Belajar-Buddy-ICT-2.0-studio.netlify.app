import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  AppSettings,
  NotesProgressEntry,
  PublicUser,
  QuestionItem,
  QuizMode,
  QuizQuestionFilter,
  RankingEntry
} from '../shared/types.ts';
import { DEFAULT_QUESTIONS } from './data/questionBank.ts';
import { SYLLABUS_TOPICS } from './data/syllabusNotes.ts';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: 'student' | 'teacher';
  className: string;
  createdAt: string;
}

export interface StoredAttempt extends RankingEntry {}

export interface ResetTokenEntry {
  userId: string;
  codeHash: string;
  expiresAt: number;
}

export interface DatabaseState {
  users: StoredUser[];
  questions: QuestionItem[];
  notesProgress: Record<string, Record<number, NotesProgressEntry>>;
  assignedByTopic: Record<number, Record<string, string[]>>;
  attempts: StoredAttempt[];
  settings: AppSettings;
  resetTokens: Record<string, ResetTokenEntry>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// SHA-256 digest of the configured teacher registration code when env var is unset
const DEFAULT_TEACHER_CODE_DIGEST =
  '78ebd19b11ac5f31df75eda86b70aa1feb9a7b361e020ce4f183697faa348321';

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

function createDefaultState(): DatabaseState {
  return {
    users: [],
    questions: DEFAULT_QUESTIONS.map((q) => ({ ...q })),
    notesProgress: {},
    assignedByTopic: {},
    attempts: [],
    settings: {
      enabledTopics: SYLLABUS_TOPICS.map((t) => t.id),
      requireNotesBeforeQuiz: true,
      enabledGames: [
        'classic',
        'byte_blaster',
        'circuit_grid',
        'tower_climb',
        'heart_quest',
        'pixel_boss'
      ]
    },
    resetTokens: {}
  };
}

let dbState: DatabaseState = loadDatabase();
let writeChain: Promise<void> = Promise.resolve();

function loadDatabase(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = createDefaultState();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    const fallback = createDefaultState();
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      questions:
        Array.isArray(parsed.questions) && parsed.questions.length > 0
          ? parsed.questions
          : fallback.questions,
      notesProgress: parsed.notesProgress || {},
      assignedByTopic: parsed.assignedByTopic || {},
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      settings: parsed.settings
        ? {
            enabledTopics: Array.isArray(parsed.settings.enabledTopics)
              ? parsed.settings.enabledTopics
              : fallback.settings.enabledTopics,
            requireNotesBeforeQuiz:
              typeof parsed.settings.requireNotesBeforeQuiz === 'boolean'
                ? parsed.settings.requireNotesBeforeQuiz
                : true,
            enabledGames: Array.isArray(parsed.settings.enabledGames)
              ? (parsed.settings.enabledGames as QuizMode[])
              : fallback.settings.enabledGames
          }
        : fallback.settings,
      resetTokens: parsed.resetTokens || {}
    };
  } catch (err) {
    console.error('Failed to load database, initializing fresh store:', err);
    return createDefaultState();
  }
}

export function getDb(): DatabaseState {
  return dbState;
}

export function saveDb(): Promise<void> {
  const snapshot = JSON.stringify(dbState, null, 2);
  writeChain = writeChain.then(async () => {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    await fs.promises.writeFile(tmpFile, snapshot, 'utf8');
    await fs.promises.rename(tmpFile, DB_FILE);
  });
  return writeChain;
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    className: user.className,
    createdAt: user.createdAt
  };
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function verifyTeacherCode(submittedCode: string): boolean {
  const trimmed = submittedCode.trim();
  if (!trimmed) return false;
  const envCode = process.env.TEACHER_ACCESS_CODE?.trim();
  const expectedDigest = envCode ? sha256Hex(envCode) : DEFAULT_TEACHER_CODE_DIGEST;
  const submittedDigest = sha256Hex(trimmed);
  const a = Buffer.from(expectedDigest, 'hex');
  const b = Buffer.from(submittedDigest, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signAuthToken(user: StoredUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAuthToken(token: string): StoredUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub: string;
      exp: number;
    };
    if (!decoded.sub || Date.now() > decoded.exp) return null;
    return dbState.users.find((u) => u.id === decoded.sub) || null;
  } catch {
    return null;
  }
}

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function normalizeAnswer(val: string): string {
  return val
    .trim()
    .toLowerCase()
    .replace(/^[.]+/, '')
    .replace(/[.,!?;:'"]+$/g, '')
    .replace(/\s+/g, ' ');
}

export function gradeAnswer(question: QuestionItem, rawUserAnswer: string): boolean {
  const userAns = (rawUserAnswer || '').trim();
  if (!userAns) return false;
  if (question.type === 'mcq') {
    return userAns.toLowerCase() === question.correctAnswer.trim().toLowerCase();
  }
  const normalizedUser = normalizeAnswer(userAns);
  const candidates = [
    question.correctAnswer,
    ...(question.acceptedAnswers || [])
  ].map(normalizeAnswer);
  return candidates.includes(normalizedUser);
}

export function calculateCambridgeGrade(percentage: number): string {
  if (percentage >= 90) return 'A*';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  if (percentage >= 30) return 'F';
  if (percentage >= 20) return 'G';
  return 'U';
}

export function assignUniqueRandomQuestions(
  userId: string,
  topicId: number,
  questionFilter: QuizQuestionFilter,
  count: number
): { selected: QuestionItem[]; uniqueCount: number } {
  const pool = dbState.questions.filter((q) => {
    if (q.topicId !== topicId) return false;
    if (questionFilter === 'mixed') return true;
    return q.type === questionFilter;
  });

  if (!dbState.assignedByTopic[topicId]) {
    dbState.assignedByTopic[topicId] = {};
  }
  const topicAssignments = dbState.assignedByTopic[topicId];

  const neverAssignedToAnyone: QuestionItem[] = [];
  const unseenByThisStudent: { q: QuestionItem; otherCount: number }[] = [];
  const seenByThisStudent: { q: QuestionItem; totalCount: number }[] = [];

  for (const q of pool) {
    const users = topicAssignments[q.id] || [];
    if (users.length === 0) {
      neverAssignedToAnyone.push(q);
    } else if (!users.includes(userId)) {
      unseenByThisStudent.push({ q, otherCount: users.length });
    } else {
      seenByThisStudent.push({ q, totalCount: users.length });
    }
  }

  // Shuffle within each priority tier so question order & selection is random
  const tier0 = shuffleArray(neverAssignedToAnyone);

  // Group tier1 by otherCount ascending and shuffle within each bucket
  unseenByThisStudent.sort((a, b) => a.otherCount - b.otherCount);
  const tier1Grouped: QuestionItem[] = [];
  let idx = 0;
  while (idx < unseenByThisStudent.length) {
    const currentCount = unseenByThisStudent[idx].otherCount;
    const bucket: QuestionItem[] = [];
    while (idx < unseenByThisStudent.length && unseenByThisStudent[idx].otherCount === currentCount) {
      bucket.push(unseenByThisStudent[idx].q);
      idx++;
    }
    tier1Grouped.push(...shuffleArray(bucket));
  }

  // Group tier2 by totalCount ascending and shuffle within each bucket
  seenByThisStudent.sort((a, b) => a.totalCount - b.totalCount);
  const tier2Grouped: QuestionItem[] = [];
  idx = 0;
  while (idx < seenByThisStudent.length) {
    const currentCount = seenByThisStudent[idx].totalCount;
    const bucket: QuestionItem[] = [];
    while (idx < seenByThisStudent.length && seenByThisStudent[idx].totalCount === currentCount) {
      bucket.push(seenByThisStudent[idx].q);
      idx++;
    }
    tier2Grouped.push(...shuffleArray(bucket));
  }

  const orderedCandidates = [...tier0, ...tier1Grouped, ...tier2Grouped];
  const chosen = orderedCandidates.slice(0, Math.min(count, orderedCandidates.length));
  const uniqueCount = chosen.filter((q) => (topicAssignments[q.id] || []).length === 0).length;

  for (const q of chosen) {
    if (!topicAssignments[q.id]) {
      topicAssignments[q.id] = [];
    }
    if (!topicAssignments[q.id].includes(userId)) {
      topicAssignments[q.id].push(userId);
    }
  }

  // Shuffle final chosen array so question sequence is randomized
  return { selected: shuffleArray(chosen), uniqueCount };
}
