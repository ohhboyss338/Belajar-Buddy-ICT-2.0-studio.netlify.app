import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import type {
  AdminOverviewResponse,
  AppSettings,
  GradedQuestionResult,
  NotesProgressEntry,
  PublicUser,
  QuestionItem,
  QuizMode,
  QuizQuestionFilter,
  QuizStartResponse,
  QuizSubmitResponse,
  RankingEntry,
  StudentCompletionRow,
  StudentTopicStatus,
  TopicSummaryForUser
} from '../../shared/types.ts';
import { DEFAULT_QUESTIONS } from '../../server/data/questionBank.ts';
import { SYLLABUS_TOPICS } from '../../server/data/syllabusNotes.ts';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  DEFAULT_TEACHER_CODE_DIGEST,
  handleFirestoreError,
  mapFirebaseAuthError,
  OperationType,
  sha256Hex
} from './firebase.ts';

export interface AuthResponse {
  user: PublicUser;
}

export interface ForgotPasswordResponse {
  message: string;
}

const DEFAULT_SETTINGS: AppSettings = {
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
};

interface ActiveQuizSession {
  sessionId: string;
  userId: string;
  studentName: string;
  className: string;
  topicId: number;
  topicTitle: string;
  mode: QuizMode;
  questionFilter: QuizQuestionFilter;
  durationSeconds: number;
  startedAtMs: number;
  questions: QuestionItem[];
}

const activeSessions = new Map<string, ActiveQuizSession>();

function generateId(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${Date.now()}_${hex}`;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const rand = new Uint32Array(1);
    crypto.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeAnswer(val: string): string {
  return val
    .trim()
    .toLowerCase()
    .replace(/^[.]+/, '')
    .replace(/[.,!?;:'"]+$/g, '')
    .replace(/\s+/g, ' ');
}

function gradeAnswer(question: QuestionItem, rawUserAnswer: string): boolean {
  const userAns = (rawUserAnswer || '').trim();
  if (!userAns) return false;
  if (question.type === 'mcq') {
    return userAns.toLowerCase() === question.correctAnswer.trim().toLowerCase();
  }
  const normalizedUser = normalizeAnswer(userAns);
  const candidates = [question.correctAnswer, ...(question.acceptedAnswers || [])].map(
    normalizeAnswer
  );
  return candidates.includes(normalizedUser);
}

function calculateCambridgeGrade(percentage: number): string {
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

function requireCurrentUser(): FirebaseUser {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Your session has expired. Please log in again.');
  }
  return current;
}

function sanitizePublicUser(data: Record<string, unknown>, fallbackUid: string): PublicUser {
  return {
    id: typeof data.uid === 'string' ? data.uid : fallbackUid,
    name: typeof data.name === 'string' ? data.name.slice(0, 100) : 'Student',
    email: typeof data.email === 'string' ? data.email.slice(0, 254) : '',
    role: data.role === 'teacher' ? 'teacher' : 'student',
    className: typeof data.className === 'string' ? data.className.slice(0, 64) : 'Unassigned',
    createdAt:
      typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()
  };
}

async function fetchUserProfile(uid: string): Promise<PublicUser | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return sanitizePublicUser(snap.data(), uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

async function fetchSettings(): Promise<AppSettings> {
  const path = 'settings/app';
  try {
    const snap = await getDoc(doc(db, 'settings', 'app'));
    if (!snap.exists()) {
      return { ...DEFAULT_SETTINGS };
    }
    const data = snap.data();
    return {
      enabledTopics: Array.isArray(data.enabledTopics)
        ? data.enabledTopics.filter((n): n is number => typeof n === 'number')
        : DEFAULT_SETTINGS.enabledTopics,
      requireNotesBeforeQuiz:
        typeof data.requireNotesBeforeQuiz === 'boolean'
          ? data.requireNotesBeforeQuiz
          : DEFAULT_SETTINGS.requireNotesBeforeQuiz,
      enabledGames: Array.isArray(data.enabledGames)
        ? (data.enabledGames.filter((g): g is QuizMode => typeof g === 'string') as QuizMode[])
        : DEFAULT_SETTINGS.enabledGames
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

async function fetchMergedQuestions(): Promise<QuestionItem[]> {
  const merged = new Map<string, QuestionItem>();
  for (const q of DEFAULT_QUESTIONS) {
    merged.set(q.id, { ...q });
  }

  const path = 'questions';
  try {
    const qRef = query(
      collection(db, 'questions'),
      where('topicId', '>=', 1),
      where('topicId', '<=', 11)
    );
    const snap = await getDocs(qRef);
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.status === 'deleted') {
        merged.delete(docSnap.id);
        continue;
      }
      merged.set(docSnap.id, {
        id: docSnap.id,
        topicId: Number(data.topicId),
        type: data.type === 'fill_blank' ? 'fill_blank' : 'mcq',
        subtopicCode: String(data.subtopicCode || `${data.topicId}.1`),
        prompt: String(data.prompt || ''),
        options:
          data.type === 'mcq' && Array.isArray(data.options)
            ? data.options.map(String)
            : undefined,
        correctAnswer: String(data.correctAnswer || ''),
        acceptedAnswers:
          data.type === 'fill_blank' && Array.isArray(data.acceptedAnswers)
            ? data.acceptedAnswers.map(String)
            : undefined,
        explanation: String(data.explanation || 'Verified syllabus answer.')
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }

  return Array.from(merged.values());
}

async function fetchUserNotesMap(uid: string): Promise<Record<number, NotesProgressEntry>> {
  const path = `users/${uid}/notesProgress`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'notesProgress'));
    const map: Record<number, NotesProgressEntry> = {};
    for (const d of snap.docs) {
      const data = d.data();
      const topicId = Number(data.topicId || d.id);
      map[topicId] = {
        readNodeIds: Array.isArray(data.readNodeIds) ? data.readNodeIds.map(String) : [],
        completed: Boolean(data.completed),
        completedAt: typeof data.completedAt === 'string' ? data.completedAt : undefined
      };
    }
    return map;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

async function fetchPublicRankings(topicId?: number): Promise<RankingEntry[]> {
  const path = 'rankings';
  try {
    const qRef =
      typeof topicId === 'number'
        ? query(
            collection(db, 'rankings'),
            where('isPublicRanking', '==', true),
            where('topicId', '==', topicId)
          )
        : query(collection(db, 'rankings'), where('isPublicRanking', '==', true));

    const snap = await getDocs(qRef);
    const list: RankingEntry[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        attemptId: String(data.attemptId || d.id),
        userId: String(data.userId || ''),
        studentName: String(data.studentName || 'Student'),
        className: String(data.className || ''),
        topicId: Number(data.topicId || 1),
        topicTitle: String(data.topicTitle || ''),
        mode: (data.mode as QuizMode) || 'classic',
        questionFilter: (data.questionFilter as QuizQuestionFilter) || 'mcq',
        score: Number(data.score || 0),
        totalQuestions: Number(data.totalQuestions || 0),
        percentage: Number(data.percentage || 0),
        timeTakenSeconds: Number(data.timeTakenSeconds || 0),
        completedAt: String(data.completedAt || new Date().toISOString())
      };
    });

    list.sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.score !== a.score) return b.score - a.score;
      if (a.timeTakenSeconds !== b.timeTakenSeconds) {
        return a.timeTakenSeconds - b.timeTakenSeconds;
      }
      return b.completedAt.localeCompare(a.completedAt);
    });

    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export const api = {
  async getCurrentUserProfile(firebaseUser: FirebaseUser): Promise<PublicUser | null> {
    const existing = await fetchUserProfile(firebaseUser.uid);
    if (existing) return existing;

    if (
      firebaseUser.email &&
      firebaseUser.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL &&
      firebaseUser.emailVerified
    ) {
      const nowIso = new Date().toISOString();
      const batch = writeBatch(db);
      batch.set(doc(db, 'admins', firebaseUser.uid), {
        uid: firebaseUser.uid,
        codeDigest: DEFAULT_TEACHER_CODE_DIGEST,
        createdAt: serverTimestamp()
      });
      const adminProfile: PublicUser = {
        id: firebaseUser.uid,
        name: (firebaseUser.displayName || 'Teacher Admin').slice(0, 100),
        email: firebaseUser.email.toLowerCase(),
        role: 'teacher',
        className: 'Teacher',
        createdAt: nowIso
      };
      batch.set(doc(db, 'users', firebaseUser.uid), {
        uid: adminProfile.id,
        name: adminProfile.name,
        email: adminProfile.email,
        role: 'teacher',
        className: 'Teacher',
        createdAt: nowIso,
        updatedAt: serverTimestamp()
      });
      try {
        await batch.commit();
        return adminProfile;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
      }
    }

    return null;
  },

  async signup(payload: {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'teacher';
    className?: string;
    teacherCode?: string;
  }): Promise<AuthResponse> {
    const name = payload.name.trim().slice(0, 100);
    const email = payload.email.trim().toLowerCase().slice(0, 254);
    const password = payload.password;
    const role = payload.role;
    const className =
      role === 'teacher' ? 'Teacher' : (payload.className || '').trim().slice(0, 64);

    if (name.length < 2) {
      throw new Error('Full name must be at least 2 characters.');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    if (role === 'student' && !className) {
      throw new Error('Please enter your class (e.g. 10A).');
    }

    let teacherDigest = '';
    if (role === 'teacher') {
      const rawCode = (payload.teacherCode || '').trim();
      if (!rawCode) {
        throw new Error('Teacher Verification Code is required for teacher accounts.');
      }
      teacherDigest = await sha256Hex(rawCode);
      if (teacherDigest !== DEFAULT_TEACHER_CODE_DIGEST) {
        throw new Error('Invalid Teacher Verification Code.');
      }
    }

    let createdUser: FirebaseUser | null = null;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      createdUser = cred.user;
      await updateProfile(cred.user, { displayName: name });

      const nowIso = new Date().toISOString();
      const batch = writeBatch(db);
      if (role === 'teacher') {
        batch.set(doc(db, 'admins', cred.user.uid), {
          uid: cred.user.uid,
          codeDigest: teacherDigest,
          createdAt: serverTimestamp()
        });
      }
      batch.set(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name,
        email,
        role,
        className,
        createdAt: nowIso,
        updatedAt: serverTimestamp()
      });

      try {
        await batch.commit();
      } catch (fsErr) {
        await cred.user.delete().catch(() => {});
        handleFirestoreError(fsErr, OperationType.WRITE, `users/${cred.user.uid}`);
      }

      return {
        user: {
          id: cred.user.uid,
          name,
          email,
          role,
          className,
          createdAt: nowIso
        }
      };
    } catch (err) {
      if (createdUser && err instanceof Error && err.message.startsWith('{')) {
        throw new Error(mapFirebaseAuthError(err));
      }
      throw new Error(mapFirebaseAuthError(err));
    }
  },

  async login(payload: {
    email: string;
    password: string;
    adminOnly?: boolean;
    teacherCode?: string;
  }): Promise<AuthResponse> {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password;

    if (!email || !password) {
      throw new Error('Please enter both your email address and password.');
    }

    if (payload.adminOnly) {
      const rawCode = (payload.teacherCode || '').trim();
      if (!rawCode) {
        throw new Error('Teacher Access Code is required for Teacher Admin login.');
      }
      const submittedDigest = await sha256Hex(rawCode);
      if (submittedDigest !== DEFAULT_TEACHER_CODE_DIGEST) {
        throw new Error('Invalid Teacher Access Code.');
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await this.getCurrentUserProfile(cred.user);

      if (!profile) {
        await signOut(auth).catch(() => {});
        throw new Error(
          'Your account profile was not found. Please sign up first or contact your teacher.'
        );
      }

      if (payload.adminOnly && profile.role !== 'teacher') {
        await signOut(auth).catch(() => {});
        throw new Error('Access denied: this account does not have Teacher Admin privileges.');
      }

      return { user: profile };
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  },

  async forgotPassword(payload: { email: string }): Promise<ForgotPasswordResponse> {
    const email = payload.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid registered email address.');
    }
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        message: `Password reset email sent to ${email}. Check your inbox (and spam folder) and follow the link to set a new password.`
      };
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  },

  async logout(): Promise<void> {
    activeSessions.clear();
    await signOut(auth);
  },

  async getTopics(): Promise<{ topics: TopicSummaryForUser[]; settings: AppSettings }> {
    const current = requireCurrentUser();
    const [settings, mergedQuestions, notesMap, allRankings] = await Promise.all([
      fetchSettings(),
      fetchMergedQuestions(),
      fetchUserNotesMap(current.uid),
      fetchPublicRankings()
    ]);

    const myAttempts = allRankings.filter((r) => r.userId === current.uid);

    const topics: TopicSummaryForUser[] = SYLLABUS_TOPICS.map((topic) => {
      const topicQs = mergedQuestions.filter((q) => q.topicId === topic.id);
      const mcqCount = topicQs.filter((q) => q.type === 'mcq').length;
      const fbCount = topicQs.filter((q) => q.type === 'fill_blank').length;
      const notesEntry = notesMap[topic.id] || { readNodeIds: [], completed: false };
      const topicAttempts = myAttempts.filter((a) => a.topicId === topic.id);

      let bestScore: TopicSummaryForUser['bestScore'];
      if (topicAttempts.length > 0) {
        const sorted = [...topicAttempts].sort((a, b) => {
          if (b.percentage !== a.percentage) return b.percentage - a.percentage;
          return b.score - a.score;
        });
        const best = sorted[0];
        bestScore = {
          score: best.score,
          totalQuestions: best.totalQuestions,
          percentage: best.percentage,
          mode: best.mode,
          completedAt: best.completedAt
        };
      }

      return {
        ...topic,
        enabled: settings.enabledTopics.includes(topic.id),
        questionCounts: {
          mcq: mcqCount,
          fill_blank: fbCount,
          total: topicQs.length
        },
        notesProgress: notesEntry,
        bestScore,
        attemptsCount: topicAttempts.length
      };
    });

    return { topics, settings };
  },

  async markNoteRead(
    topicId: number,
    payload: { nodeId?: string; markAll?: boolean }
  ): Promise<{ notesProgress: NotesProgressEntry }> {
    const current = requireCurrentUser();
    const topic = SYLLABUS_TOPICS.find((t) => t.id === topicId);
    if (!topic) {
      throw new Error('Topic not found.');
    }

    const docPath = `users/${current.uid}/notesProgress/${topicId}`;
    const docRef = doc(db, 'users', current.uid, 'notesProgress', String(topicId));
    let existingSnap;
    try {
      existingSnap = await getDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }

    const existingData = existingSnap.exists() ? existingSnap.data() : null;
    const prevIds: string[] = Array.isArray(existingData?.readNodeIds)
      ? existingData.readNodeIds.map(String)
      : [];

    const validBranchIds = topic.branches.map((b) => b.id);
    const nextSet = new Set(prevIds.filter((id) => validBranchIds.includes(id)));

    if (payload.markAll) {
      for (const bId of validBranchIds) {
        nextSet.add(bId);
      }
    } else if (payload.nodeId && validBranchIds.includes(payload.nodeId)) {
      nextSet.add(payload.nodeId);
    }

    const nextIds = Array.from(nextSet).slice(0, 30);
    const completed = validBranchIds.every((id) => nextSet.has(id));
    const completedAt =
      completed
        ? typeof existingData?.completedAt === 'string'
          ? existingData.completedAt
          : new Date().toISOString()
        : undefined;

    const writePayload: Record<string, unknown> = {
      uid: current.uid,
      topicId,
      readNodeIds: nextIds,
      completed,
      updatedAt: serverTimestamp()
    };
    if (completedAt) {
      writePayload.completedAt = completedAt;
    }

    try {
      if (existingSnap.exists()) {
        await updateDoc(docRef, {
          readNodeIds: nextIds,
          completed,
          ...(completedAt ? { completedAt } : {}),
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(docRef, writePayload);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }

    return {
      notesProgress: {
        readNodeIds: nextIds,
        completed,
        completedAt
      }
    };
  },

  async startQuiz(payload: {
    topicId: number;
    questionCount: number;
    questionFilter: QuizQuestionFilter;
    mode: QuizMode;
  }): Promise<QuizStartResponse> {
    const current = requireCurrentUser();
    const profile = await fetchUserProfile(current.uid);
    if (!profile) {
      throw new Error('User profile not found.');
    }

    const topic = SYLLABUS_TOPICS.find((t) => t.id === payload.topicId);
    if (!topic) {
      throw new Error('Invalid topic selected.');
    }

    const [settings, mergedQuestions, notesMap] = await Promise.all([
      fetchSettings(),
      fetchMergedQuestions(),
      fetchUserNotesMap(current.uid)
    ]);

    if (!settings.enabledTopics.includes(topic.id) && profile.role !== 'teacher') {
      throw new Error('This topic is currently locked by your teacher.');
    }
    if (!settings.enabledGames.includes(payload.mode) && profile.role !== 'teacher') {
      throw new Error('This game mode is currently disabled by your teacher.');
    }

    const notesProgress = notesMap[topic.id];
    if (
      settings.requireNotesBeforeQuiz &&
      profile.role !== 'teacher' &&
      !notesProgress?.completed
    ) {
      throw new Error(
        'Please read all Mind Map branches for this topic first before starting the quiz.'
      );
    }

    const count = Math.max(10, Math.min(55, Math.floor(payload.questionCount)));
    const pool = mergedQuestions.filter((q) => {
      if (q.topicId !== topic.id) return false;
      if (payload.questionFilter === 'mixed') return true;
      return q.type === payload.questionFilter;
    });

    if (pool.length < count) {
      throw new Error(
        `Only ${pool.length} questions available for that filter. Reduce count or choose Mixed.`
      );
    }

    const usageRef = doc(db, 'questionUsage', String(topic.id));
    const assignRef = doc(db, 'users', current.uid, 'assignments', String(topic.id));

    let globalUsedIds: string[] = [];
    let usageExists = false;
    try {
      const usageSnap = await getDoc(usageRef);
      if (usageSnap.exists()) {
        usageExists = true;
        const d = usageSnap.data();
        globalUsedIds = Array.isArray(d.usedIds) ? d.usedIds.map(String) : [];
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `questionUsage/${topic.id}`);
    }

    let seenByStudentIds: string[] = [];
    let assignExists = false;
    try {
      const assignSnap = await getDoc(assignRef);
      if (assignSnap.exists()) {
        assignExists = true;
        const d = assignSnap.data();
        seenByStudentIds = Array.isArray(d.questionIds) ? d.questionIds.map(String) : [];
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.GET,
        `users/${current.uid}/assignments/${topic.id}`
      );
    }

    const globalSet = new Set(globalUsedIds);
    const seenSet = new Set(seenByStudentIds);

    const tier0 = shuffleArray(pool.filter((q) => !globalSet.has(q.id)));
    const tier1 = shuffleArray(pool.filter((q) => globalSet.has(q.id) && !seenSet.has(q.id)));
    const tier2 = shuffleArray(pool.filter((q) => seenSet.has(q.id)));

    const orderedCandidates = [...tier0, ...tier1, ...tier2];
    const chosen = shuffleArray(orderedCandidates.slice(0, count));
    const uniqueGuaranteeCount = chosen.filter((q) => !globalSet.has(q.id)).length;
    const chosenIds = chosen.map((q) => q.id);

    // Update global non-overlapping question pool (cycle cleanly if pool exhausted)
    const nextGlobalSet =
      tier0.length === 0
        ? new Set(chosenIds)
        : new Set([...globalUsedIds, ...chosenIds]);
    const nextGlobalIds = Array.from(nextGlobalSet).slice(-1900);

    try {
      if (usageExists) {
        await updateDoc(usageRef, {
          usedIds: nextGlobalIds,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(usageRef, {
          topicId: topic.id,
          usedIds: nextGlobalIds,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `questionUsage/${topic.id}`);
    }

    const nextStudentIds = Array.from(new Set([...seenByStudentIds, ...chosenIds])).slice(-480);
    try {
      if (assignExists) {
        await updateDoc(assignRef, {
          questionIds: nextStudentIds,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(assignRef, {
          uid: current.uid,
          topicId: topic.id,
          questionIds: nextStudentIds,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `users/${current.uid}/assignments/${topic.id}`
      );
    }

    const sessionId = generateId('sess');
    const durationSeconds = Math.ceil((chosen.length / 10) * 5 * 60);
    const startedAtMs = Date.now();

    activeSessions.set(sessionId, {
      sessionId,
      userId: current.uid,
      studentName: profile.name,
      className: profile.className,
      topicId: topic.id,
      topicTitle: topic.title,
      mode: payload.mode,
      questionFilter: payload.questionFilter,
      durationSeconds,
      startedAtMs,
      questions: chosen
    });

    return {
      sessionId,
      topicId: topic.id,
      topicTitle: topic.title,
      mode: payload.mode,
      questionFilter: payload.questionFilter,
      durationSeconds,
      startedAt: new Date(startedAtMs).toISOString(),
      uniqueGuaranteeCount,
      questions: chosen.map((q) => ({
        id: q.id,
        topicId: q.topicId,
        type: q.type,
        subtopicCode: q.subtopicCode,
        prompt: q.prompt,
        options: q.options
      }))
    };
  },

  async checkQuizStep(payload: {
    sessionId: string;
    questionId: string;
    answer: string;
  }): Promise<{
    questionId: string;
    lockedAnswer: string;
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  }> {
    requireCurrentUser();
    const session = activeSessions.get(payload.sessionId);
    if (!session) {
      throw new Error('Active quiz session not found.');
    }
    const question = session.questions.find((q) => q.id === payload.questionId);
    if (!question) {
      throw new Error('Question not found in active session.');
    }

    const isCorrect = gradeAnswer(question, payload.answer);
    return {
      questionId: question.id,
      lockedAnswer: payload.answer,
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    };
  },

  async submitQuiz(payload: {
    sessionId: string;
    answers: Record<string, string>;
  }): Promise<QuizSubmitResponse> {
    const current = requireCurrentUser();
    const session = activeSessions.get(payload.sessionId);
    if (!session || session.userId !== current.uid) {
      throw new Error('Quiz session expired or not found.');
    }

    let score = 0;
    const results: GradedQuestionResult[] = session.questions.map((q) => {
      const userAnswer = String(payload.answers[q.id] || '').trim();
      const isCorrect = gradeAnswer(q, userAnswer);
      if (isCorrect) score++;
      return {
        questionId: q.id,
        prompt: q.prompt,
        type: q.type,
        subtopicCode: q.subtopicCode,
        options: q.options,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation
      };
    });

    const totalQuestions = session.questions.length;
    const percentage = Math.round((score / Math.max(1, totalQuestions)) * 100);
    const grade = calculateCambridgeGrade(percentage);
    const timeTakenSeconds = Math.max(
      1,
      Math.min(7200, Math.round((Date.now() - session.startedAtMs) / 1000))
    );
    const completedAt = new Date().toISOString();
    const attemptId = generateId('att');

    const path = `rankings/${attemptId}`;
    try {
      await setDoc(doc(db, 'rankings', attemptId), {
        attemptId,
        userId: current.uid,
        studentName: session.studentName.slice(0, 100),
        className: session.className.slice(0, 64),
        topicId: session.topicId,
        topicTitle: session.topicTitle.slice(0, 160),
        mode: session.mode,
        questionFilter: session.questionFilter,
        score,
        totalQuestions,
        percentage,
        timeTakenSeconds,
        completedAt,
        isPublicRanking: true,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }

    activeSessions.delete(payload.sessionId);

    return {
      attemptId,
      topicId: session.topicId,
      topicTitle: session.topicTitle,
      mode: session.mode,
      score,
      totalQuestions,
      percentage,
      grade,
      timeTakenSeconds,
      completedAt,
      results
    };
  },

  async getRankings(topicId?: number): Promise<{ rankings: RankingEntry[] }> {
    requireCurrentUser();
    const rankings = await fetchPublicRankings(topicId);
    return { rankings };
  },

  async getAdminOverview(): Promise<AdminOverviewResponse> {
    requireCurrentUser();
    const [settings, mergedQuestions, allRankings] = await Promise.all([
      fetchSettings(),
      fetchMergedQuestions(),
      fetchPublicRankings()
    ]);

    let studentDocs: PublicUser[] = [];
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      studentDocs = usersSnap.docs
        .map((d) => sanitizePublicUser(d.data(), d.id))
        .filter((u) => u.role === 'student');
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }

    const students: StudentCompletionRow[] = await Promise.all(
      studentDocs.map(async (stu) => {
        const notesMap = await fetchUserNotesMap(stu.id);
        const stuAttempts = allRankings.filter((a) => a.userId === stu.id);

        const topicStatus: Record<number, StudentTopicStatus> = {};
        let topicsCompletedCount = 0;
        let notesReadCount = 0;
        const bestPercentages: number[] = [];
        let lastActiveAt: string | null = null;

        for (const t of SYLLABUS_TOPICS) {
          const np = notesMap[t.id];
          const tAttempts = stuAttempts.filter((a) => a.topicId === t.id);
          const notesCompleted = Boolean(np?.completed);
          if (notesCompleted) notesReadCount++;

          if (np?.completedAt && (!lastActiveAt || np.completedAt > lastActiveAt)) {
            lastActiveAt = np.completedAt;
          }

          let bestScore: number | null = null;
          let bestTotal: number | null = null;
          let bestPercentage: number | null = null;
          let lastMode: QuizMode | null = null;
          let lastAttemptAt: string | null = null;

          if (tAttempts.length > 0) {
            topicsCompletedCount++;
            const sortedBest = [...tAttempts].sort((a, b) => b.percentage - a.percentage);
            bestScore = sortedBest[0].score;
            bestTotal = sortedBest[0].totalQuestions;
            bestPercentage = sortedBest[0].percentage;
            bestPercentages.push(bestPercentage);

            const sortedRecent = [...tAttempts].sort((a, b) =>
              b.completedAt.localeCompare(a.completedAt)
            );
            lastMode = sortedRecent[0].mode;
            lastAttemptAt = sortedRecent[0].completedAt;
            if (!lastActiveAt || lastAttemptAt > lastActiveAt) {
              lastActiveAt = lastAttemptAt;
            }
          }

          topicStatus[t.id] = {
            notesCompleted,
            readNodesCount: np?.readNodeIds.length || 0,
            totalNodesCount: t.branches.length,
            attempted: tAttempts.length > 0,
            attemptsCount: tAttempts.length,
            bestScore,
            bestTotal,
            bestPercentage,
            lastMode,
            lastAttemptAt
          };
        }

        const averagePercentage =
          bestPercentages.length > 0
            ? Math.round(
                bestPercentages.reduce((acc, v) => acc + v, 0) / bestPercentages.length
              )
            : null;

        return {
          userId: stu.id,
          name: stu.name,
          email: stu.email,
          className: stu.className,
          createdAt: stu.createdAt,
          topicsCompletedCount,
          notesReadCount,
          averagePercentage,
          lastActiveAt,
          topicStatus
        };
      })
    );

    students.sort((a, b) => a.name.localeCompare(b.name));

    const recentAttempts = [...allRankings]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 40);

    return {
      settings,
      students,
      recentAttempts,
      totalQuestions: mergedQuestions.length
    };
  },

  async updateAdminSettings(settingsPatch: Partial<AppSettings>): Promise<{ settings: AppSettings }> {
    requireCurrentUser();
    const current = await fetchSettings();
    const next: AppSettings = {
      enabledTopics: Array.isArray(settingsPatch.enabledTopics)
        ? settingsPatch.enabledTopics
        : current.enabledTopics,
      requireNotesBeforeQuiz:
        typeof settingsPatch.requireNotesBeforeQuiz === 'boolean'
          ? settingsPatch.requireNotesBeforeQuiz
          : current.requireNotesBeforeQuiz,
      enabledGames: Array.isArray(settingsPatch.enabledGames)
        ? settingsPatch.enabledGames
        : current.enabledGames
    };

    const path = 'settings/app';
    try {
      await setDoc(doc(db, 'settings', 'app'), {
        enabledTopics: next.enabledTopics,
        requireNotesBeforeQuiz: next.requireNotesBeforeQuiz,
        enabledGames: next.enabledGames,
        updatedAt: serverTimestamp()
      });
      return { settings: next };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getAdminQuestions(params: {
    topicId?: number;
    type?: string;
    search?: string;
  }): Promise<{ questions: QuestionItem[]; total: number }> {
    requireCurrentUser();
    let list = await fetchMergedQuestions();
    if (params.topicId) {
      list = list.filter((q) => q.topicId === params.topicId);
    }
    if (params.type && params.type !== 'all') {
      list = list.filter((q) => q.type === params.type);
    }
    if (params.search && params.search.trim()) {
      const term = params.search.trim().toLowerCase();
      list = list.filter(
        (q) =>
          q.prompt.toLowerCase().includes(term) ||
          q.correctAnswer.toLowerCase().includes(term) ||
          q.subtopicCode.toLowerCase().includes(term)
      );
    }
    return { questions: list, total: list.length };
  },

  async createAdminQuestion(
    payload: Omit<QuestionItem, 'id'>
  ): Promise<{ question: QuestionItem }> {
    requireCurrentUser();
    const id = generateId(`custom_t${payload.topicId}`);
    const options =
      payload.type === 'mcq' ? (payload.options || []).map((o) => o.trim()).filter(Boolean) : [];
    const acceptedAnswers =
      payload.type === 'fill_blank'
        ? Array.from(
            new Set([
              payload.correctAnswer.trim(),
              ...((payload.acceptedAnswers || []).map((a) => a.trim()).filter(Boolean))
            ])
          )
        : [];

    const question: QuestionItem = {
      id,
      topicId: payload.topicId,
      type: payload.type,
      subtopicCode: (payload.subtopicCode || `${payload.topicId}.1`).trim().slice(0, 24),
      prompt: payload.prompt.trim().slice(0, 1000),
      options: payload.type === 'mcq' ? options.slice(0, 6) : undefined,
      correctAnswer: payload.correctAnswer.trim().slice(0, 300),
      acceptedAnswers: payload.type === 'fill_blank' ? acceptedAnswers.slice(0, 20) : undefined,
      explanation: (payload.explanation || 'Verified syllabus answer.').trim().slice(0, 1000)
    };

    const path = `questions/${id}`;
    try {
      await setDoc(doc(db, 'questions', id), {
        id,
        topicId: question.topicId,
        type: question.type,
        subtopicCode: question.subtopicCode,
        prompt: question.prompt,
        options: question.options || [],
        correctAnswer: question.correctAnswer,
        acceptedAnswers: question.acceptedAnswers || [],
        explanation: question.explanation,
        status: 'active',
        updatedAt: serverTimestamp()
      });
      return { question };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateAdminQuestion(
    id: string,
    payload: Partial<QuestionItem>
  ): Promise<{ question: QuestionItem }> {
    requireCurrentUser();
    const all = await fetchMergedQuestions();
    const existing = all.find((q) => q.id === id);
    if (!existing) {
      throw new Error('Question not found.');
    }

    const type = payload.type || existing.type;
    const correctAnswer = (payload.correctAnswer ?? existing.correctAnswer).trim().slice(0, 300);
    const options =
      type === 'mcq'
        ? ((payload.options ?? existing.options) || []).map((o) => o.trim()).filter(Boolean).slice(0, 6)
        : [];
    const acceptedAnswers =
      type === 'fill_blank'
        ? Array.from(
            new Set([
              correctAnswer,
              ...(((payload.acceptedAnswers ?? existing.acceptedAnswers) || [])
                .map((a) => a.trim())
                .filter(Boolean))
            ])
          ).slice(0, 20)
        : [];

    const updated: QuestionItem = {
      id,
      topicId: payload.topicId ?? existing.topicId,
      type,
      subtopicCode: (payload.subtopicCode ?? existing.subtopicCode).trim().slice(0, 24),
      prompt: (payload.prompt ?? existing.prompt).trim().slice(0, 1000),
      options: type === 'mcq' ? options : undefined,
      correctAnswer,
      acceptedAnswers: type === 'fill_blank' ? acceptedAnswers : undefined,
      explanation: (payload.explanation ?? existing.explanation).trim().slice(0, 1000)
    };

    const path = `questions/${id}`;
    try {
      await setDoc(doc(db, 'questions', id), {
        id,
        topicId: updated.topicId,
        type: updated.type,
        subtopicCode: updated.subtopicCode,
        prompt: updated.prompt,
        options: updated.options || [],
        correctAnswer: updated.correctAnswer,
        acceptedAnswers: updated.acceptedAnswers || [],
        explanation: updated.explanation,
        status: 'active',
        updatedAt: serverTimestamp()
      });
      return { question: updated };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteAdminQuestion(id: string): Promise<{ deletedId: string }> {
    requireCurrentUser();
    const isDefault = DEFAULT_QUESTIONS.some((q) => q.id === id);
    const path = `questions/${id}`;
    try {
      if (isDefault) {
        const base = DEFAULT_QUESTIONS.find((q) => q.id === id)!;
        await setDoc(doc(db, 'questions', id), {
          id,
          topicId: base.topicId,
          type: base.type,
          subtopicCode: base.subtopicCode,
          prompt: base.prompt,
          options: base.options || [],
          correctAnswer: base.correctAnswer,
          acceptedAnswers: base.acceptedAnswers || [],
          explanation: base.explanation,
          status: 'deleted',
          updatedAt: serverTimestamp()
        });
      } else {
        await deleteDoc(doc(db, 'questions', id));
      }
      return { deletedId: id };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async resetStudent(
    userId: string,
    action: 'reset_progress' | 'remove_account'
  ): Promise<{ ok: boolean }> {
    requireCurrentUser();
    try {
      const [notesSnap, assignSnap, rankSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'notesProgress')),
        getDocs(collection(db, 'users', userId, 'assignments')),
        getDocs(query(collection(db, 'rankings'), where('isPublicRanking', '==', true)))
      ]);

      const batch = writeBatch(db);
      for (const d of notesSnap.docs) {
        batch.delete(d.ref);
      }
      for (const d of assignSnap.docs) {
        batch.delete(d.ref);
      }
      for (const d of rankSnap.docs) {
        if (d.data().userId === userId) {
          batch.delete(d.ref);
        }
      }
      if (action === 'remove_account') {
        batch.delete(doc(db, 'users', userId));
      }
      await batch.commit();
      return { ok: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  }
};
