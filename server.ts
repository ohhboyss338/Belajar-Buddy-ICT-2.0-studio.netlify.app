import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import type {
  AdminOverviewResponse,
  ClientQuestion,
  GradedQuestionResult,
  QuestionItem,
  QuizMode,
  QuizQuestionFilter,
  QuizStartResponse,
  QuizSubmitResponse,
  StudentCompletionRow,
  TopicSummaryForUser
} from './shared/types.ts';
import { SYLLABUS_TOPICS } from './server/data/syllabusNotes.ts';
import {
  assignUniqueRandomQuestions,
  calculateCambridgeGrade,
  getDb,
  gradeAnswer,
  hashPassword,
  saveDb,
  sha256Hex,
  shuffleArray,
  signAuthToken,
  toPublicUser,
  verifyAuthToken,
  verifyPassword,
  verifyTeacherCode
} from './server/store.ts';

interface ActiveQuizSession {
  sessionId: string;
  userId: string;
  topicId: number;
  mode: QuizMode;
  questionFilter: QuizQuestionFilter;
  questionIds: string[];
  optionOrderByQuestion: Record<string, string[]>;
  checkedAnswers: Record<string, string>;
  startedAtMs: number;
  startedAtIso: string;
  durationSeconds: number;
}

const activeQuizSessions = new Map<string, ActiveQuizSession>();

function getBearerUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  return verifyAuthToken(token);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const body = req.body || {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const role: 'student' | 'teacher' =
        body.role === 'teacher' ? 'teacher' : 'student';
      const className = typeof body.className === 'string' ? body.className.trim() : '';
      const teacherCode = typeof body.teacherCode === 'string' ? body.teacherCode : '';

      if (name.length < 2 || name.length > 60) {
        res.status(400).json({ error: 'Name must be between 2 and 60 characters.' });
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Please provide a valid email address for password recovery.' });
        return;
      }
      if (password.length < 4 || password.length > 128) {
        res.status(400).json({ error: 'Password must be at least 4 characters.' });
        return;
      }
      if (role === 'student' && (className.length < 1 || className.length > 30)) {
        res.status(400).json({ error: 'Students must enter their class (e.g. 4A or 10 ICT).' });
        return;
      }
      if (role === 'teacher' && !verifyTeacherCode(teacherCode)) {
        res.status(403).json({ error: 'Invalid teacher verification code.' });
        return;
      }

      const db = getDb();
      const nameConflict = db.users.find(
        (u) => u.name.toLowerCase() === name.toLowerCase()
      );
      if (nameConflict) {
        res.status(409).json({ error: 'An account with this name already exists. Please log in.' });
        return;
      }
      const emailConflict = db.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (emailConflict) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }

      const { hash, salt } = hashPassword(password);
      const newUser = {
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash: hash,
        passwordSalt: salt,
        role,
        className: role === 'teacher' ? 'Teacher / Admin' : className,
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      await saveDb();

      const token = signAuthToken(newUser);
      res.status(201).json({ token, user: toPublicUser(newUser) });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Unable to create account right now.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const body = req.body || {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const adminOnly = Boolean(body.adminOnly);
      const teacherCode = typeof body.teacherCode === 'string' ? body.teacherCode : '';

      if (!name || !password) {
        res.status(400).json({ error: 'Please enter both your name and password.' });
        return;
      }

      const db = getDb();
      const user = db.users.find(
        (u) =>
          u.name.toLowerCase() === name.toLowerCase() ||
          u.email.toLowerCase() === name.toLowerCase()
      );

      if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
        res.status(401).json({ error: 'Incorrect name or password.' });
        return;
      }

      if (adminOnly) {
        if (user.role !== 'teacher') {
          res.status(403).json({ error: 'Admin access is strictly restricted to teacher accounts.' });
          return;
        }
        if (teacherCode && !verifyTeacherCode(teacherCode)) {
          res.status(403).json({ error: 'Incorrect teacher access code.' });
          return;
        }
      }

      const token = signAuthToken(user);
      res.json({ token, user: toPublicUser(user) });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Unable to log in right now.' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const body = req.body || {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

      if (!name || !email) {
        res.status(400).json({ error: 'Enter both your account name and recovery email.' });
        return;
      }

      const db = getDb();
      const user = db.users.find(
        (u) =>
          u.name.toLowerCase() === name.toLowerCase() &&
          u.email.toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        res.status(404).json({ error: 'No account matched that name and recovery email.' });
        return;
      }

      const code = String(crypto.randomInt(100000, 999999));
      db.resetTokens[user.id] = {
        userId: user.id,
        codeHash: sha256Hex(code),
        expiresAt: Date.now() + 15 * 60 * 1000
      };
      await saveDb();

      res.json({
        message: `Recovery verification email prepared for ${maskEmail(user.email)}.`,
        emailPreview: {
          to: user.email,
          subject: 'BelajarBuddy ICT — Password Recovery Code',
          code,
          expiresInMinutes: 15
        }
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Unable to initiate password recovery.' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const body = req.body || {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

      if (!name || !email || !code || newPassword.length < 4) {
        res.status(400).json({ error: 'Provide name, email, 6-digit recovery code, and a new password (min 4 chars).' });
        return;
      }

      const db = getDb();
      const user = db.users.find(
        (u) =>
          u.name.toLowerCase() === name.toLowerCase() &&
          u.email.toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        res.status(404).json({ error: 'Account not found.' });
        return;
      }

      const tokenEntry = db.resetTokens[user.id];
      if (!tokenEntry || Date.now() > tokenEntry.expiresAt) {
        res.status(400).json({ error: 'Recovery code has expired or was not requested.' });
        return;
      }

      const a = Buffer.from(sha256Hex(code), 'hex');
      const b = Buffer.from(tokenEntry.codeHash, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(400).json({ error: 'Invalid 6-digit recovery code.' });
        return;
      }

      const { hash, salt } = hashPassword(newPassword);
      user.passwordHash = hash;
      user.passwordSalt = salt;
      delete db.resetTokens[user.id];
      await saveDb();

      res.json({ message: 'Password updated successfully. You can now log in.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Unable to reset password.' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getBearerUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  });

  // Topics & Mind Map Notes
  app.get('/api/topics', (req, res) => {
    const user = getBearerUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const db = getDb();
    const userNotes = db.notesProgress[user.id] || {};
    const userAttempts = db.attempts.filter((a) => a.userId === user.id);

    const topics: TopicSummaryForUser[] = SYLLABUS_TOPICS.map((topic) => {
      const topicQuestions = db.questions.filter((q) => q.topicId === topic.id);
      const mcqCount = topicQuestions.filter((q) => q.type === 'mcq').length;
      const fillCount = topicQuestions.filter((q) => q.type === 'fill_blank').length;
      const progress = userNotes[topic.id] || { readNodeIds: [], completed: false };
      const topicAttempts = userAttempts.filter((a) => a.topicId === topic.id);
      const best = topicAttempts.reduce<typeof topicAttempts[number] | undefined>((acc, cur) => {
        if (!acc || cur.percentage > acc.percentage) return cur;
        return acc;
      }, undefined);

      return {
        ...topic,
        enabled: db.settings.enabledTopics.includes(topic.id),
        questionCounts: {
          mcq: mcqCount,
          fill_blank: fillCount,
          total: topicQuestions.length
        },
        notesProgress: progress,
        bestScore: best
          ? {
              score: best.score,
              totalQuestions: best.totalQuestions,
              percentage: best.percentage,
              mode: best.mode,
              completedAt: best.completedAt
            }
          : undefined,
        attemptsCount: topicAttempts.length
      };
    });

    res.json({ topics, settings: db.settings });
  });

  app.post('/api/topics/:topicId/notes-read', async (req, res) => {
    try {
      const user = getBearerUser(req);
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const topicId = Number(req.params.topicId);
      const topic = SYLLABUS_TOPICS.find((t) => t.id === topicId);
      if (!topic) {
        res.status(404).json({ error: 'Topic not found.' });
        return;
      }

      const body = req.body || {};
      const nodeId = typeof body.nodeId === 'string' ? body.nodeId : '';
      const markAll = Boolean(body.markAll);

      const db = getDb();
      if (!db.notesProgress[user.id]) {
        db.notesProgress[user.id] = {};
      }
      const current = db.notesProgress[user.id][topicId] || {
        readNodeIds: [],
        completed: false
      };

      const validBranchIds = new Set(topic.branches.map((b) => b.id));
      const updatedSet = new Set(current.readNodeIds.filter((id) => validBranchIds.has(id)));

      if (markAll) {
        for (const b of topic.branches) {
          updatedSet.add(b.id);
        }
      } else if (nodeId && validBranchIds.has(nodeId)) {
        updatedSet.add(nodeId);
      }

      const allRead = topic.branches.every((b) => updatedSet.has(b.id));
      const updatedEntry = {
        readNodeIds: Array.from(updatedSet),
        completed: current.completed || allRead,
        completedAt:
          current.completedAt || (allRead ? new Date().toISOString() : undefined)
      };

      db.notesProgress[user.id][topicId] = updatedEntry;
      await saveDb();

      res.json({ notesProgress: updatedEntry });
    } catch (err) {
      console.error('Notes progress error:', err);
      res.status(500).json({ error: 'Could not save reading progress.' });
    }
  });

  // Quiz & Game Session Routes
  app.post('/api/quiz/start', async (req, res) => {
    try {
      const user = getBearerUser(req);
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const body = req.body || {};
      const topicId = Number(body.topicId);
      const questionCount = Number(body.questionCount);
      const questionFilter: QuizQuestionFilter =
        body.questionFilter === 'mcq' ||
        body.questionFilter === 'fill_blank' ||
        body.questionFilter === 'mixed'
          ? body.questionFilter
          : 'mixed';
      const mode: QuizMode =
        body.mode === 'byte_blaster' ||
        body.mode === 'circuit_grid' ||
        body.mode === 'tower_climb' ||
        body.mode === 'heart_quest' ||
        body.mode === 'pixel_boss' ||
        body.mode === 'classic'
          ? body.mode
          : 'classic';

      const topic = SYLLABUS_TOPICS.find((t) => t.id === topicId);
      if (!topic) {
        res.status(404).json({ error: 'Invalid topic selected.' });
        return;
      }

      const db = getDb();
      if (user.role !== 'teacher' && !db.settings.enabledTopics.includes(topicId)) {
        res.status(403).json({ error: 'This topic has been locked by your teacher.' });
        return;
      }

      if (user.role !== 'teacher' && !db.settings.enabledGames.includes(mode)) {
        res.status(403).json({ error: 'This quiz/game mode is currently disabled by your teacher.' });
        return;
      }

      if (db.settings.requireNotesBeforeQuiz && user.role !== 'teacher') {
        const notesEntry = db.notesProgress[user.id]?.[topicId];
        if (!notesEntry?.completed) {
          res.status(403).json({
            error: 'Please read all Mind Map notes for this topic first to unlock the quiz.'
          });
          return;
        }
      }

      if (!Number.isInteger(questionCount) || questionCount < 10 || questionCount > 55) {
        res.status(400).json({ error: 'Question count must be between 10 and 55.' });
        return;
      }

      const availableCount = db.questions.filter((q) => {
        if (q.topicId !== topicId) return false;
        if (questionFilter === 'mixed') return true;
        return q.type === questionFilter;
      }).length;

      if (availableCount < questionCount) {
        res.status(400).json({
          error: `Only ${availableCount} ${questionFilter} questions are currently available in Topic ${topicId}.`
        });
        return;
      }

      const { selected, uniqueCount } = assignUniqueRandomQuestions(
        user.id,
        topicId,
        questionFilter,
        questionCount
      );
      await saveDb();

      // Timer rule: 5 minutes (300s) for each 10 questions => 30 seconds per question
      const durationSeconds = selected.length * 30;
      const sessionId = crypto.randomUUID();
      const startedAtMs = Date.now();
      const startedAtIso = new Date(startedAtMs).toISOString();

      const optionOrderByQuestion: Record<string, string[]> = {};
      const clientQuestions: ClientQuestion[] = selected.map((q) => {
        const shuffledOptions = q.options ? shuffleArray(q.options) : undefined;
        if (shuffledOptions) {
          optionOrderByQuestion[q.id] = shuffledOptions;
        }
        return {
          id: q.id,
          topicId: q.topicId,
          type: q.type,
          subtopicCode: q.subtopicCode,
          prompt: q.prompt,
          options: shuffledOptions
        };
      });

      activeQuizSessions.set(sessionId, {
        sessionId,
        userId: user.id,
        topicId,
        mode,
        questionFilter,
        questionIds: selected.map((q) => q.id),
        optionOrderByQuestion,
        checkedAnswers: {},
        startedAtMs,
        startedAtIso,
        durationSeconds
      });

      const response: QuizStartResponse = {
        sessionId,
        topicId,
        topicTitle: topic.title,
        mode,
        questionFilter,
        durationSeconds,
        startedAt: startedAtIso,
        uniqueGuaranteeCount: uniqueCount,
        questions: clientQuestions
      };

      res.json(response);
    } catch (err) {
      console.error('Quiz start error:', err);
      res.status(500).json({ error: 'Unable to start quiz session.' });
    }
  });

  app.post('/api/quiz/check-step', (req, res) => {
    const user = getBearerUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const body = req.body || {};
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    const questionId = typeof body.questionId === 'string' ? body.questionId : '';
    const answer = typeof body.answer === 'string' ? body.answer : '';

    const session = activeQuizSessions.get(sessionId);
    if (!session || session.userId !== user.id) {
      res.status(404).json({ error: 'Quiz session not found.' });
      return;
    }
    if (!session.questionIds.includes(questionId)) {
      res.status(400).json({ error: 'Question does not belong to this session.' });
      return;
    }

    const db = getDb();
    const question = db.questions.find((q) => q.id === questionId);
    if (!question) {
      res.status(404).json({ error: 'Question not found.' });
      return;
    }

    if (!(questionId in session.checkedAnswers)) {
      session.checkedAnswers[questionId] = answer;
    }
    const lockedAnswer = session.checkedAnswers[questionId];
    const isCorrect = gradeAnswer(question, lockedAnswer);

    res.json({
      questionId,
      lockedAnswer,
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    });
  });

  app.post('/api/quiz/submit', async (req, res) => {
    try {
      const user = getBearerUser(req);
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const body = req.body || {};
      const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
      const rawAnswers =
        body.answers && typeof body.answers === 'object' ? (body.answers as Record<string, string>) : {};

      const session = activeQuizSessions.get(sessionId);
      if (!session || session.userId !== user.id) {
        res.status(404).json({ error: 'Active quiz session not found or already submitted.' });
        return;
      }

      const db = getDb();
      const topic = SYLLABUS_TOPICS.find((t) => t.id === session.topicId);
      const elapsed = Math.min(
        session.durationSeconds,
        Math.max(1, Math.round((Date.now() - session.startedAtMs) / 1000))
      );

      let score = 0;
      const results: GradedQuestionResult[] = [];

      for (const qId of session.questionIds) {
        const q = db.questions.find((item) => item.id === qId);
        if (!q) continue;
        // Preserve game-checked locked answers if present
        const userAns =
          qId in session.checkedAnswers
            ? session.checkedAnswers[qId]
            : typeof rawAnswers[qId] === 'string'
              ? rawAnswers[qId]
              : '';
        const isCorrect = gradeAnswer(q, userAns);
        if (isCorrect) score += 1;
        results.push({
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          subtopicCode: q.subtopicCode,
          options: session.optionOrderByQuestion[q.id] || q.options,
          userAnswer: userAns,
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation
        });
      }

      const totalQuestions = results.length;
      const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
      const grade = calculateCambridgeGrade(percentage);
      const attemptId = crypto.randomUUID();
      const completedAt = new Date().toISOString();

      db.attempts.push({
        attemptId,
        userId: user.id,
        studentName: user.name,
        className: user.className,
        topicId: session.topicId,
        topicTitle: topic ? topic.title : `Topic ${session.topicId}`,
        mode: session.mode,
        questionFilter: session.questionFilter,
        score,
        totalQuestions,
        percentage,
        timeTakenSeconds: elapsed,
        completedAt
      });

      activeQuizSessions.delete(sessionId);
      await saveDb();

      const payload: QuizSubmitResponse = {
        attemptId,
        topicId: session.topicId,
        topicTitle: topic ? topic.title : `Topic ${session.topicId}`,
        mode: session.mode,
        score,
        totalQuestions,
        percentage,
        grade,
        timeTakenSeconds: elapsed,
        completedAt,
        results
      };

      res.json(payload);
    } catch (err) {
      console.error('Quiz submit error:', err);
      res.status(500).json({ error: 'Unable to submit quiz.' });
    }
  });

  // Rankings (Public to authenticated users)
  app.get('/api/rankings', (req, res) => {
    const user = getBearerUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const db = getDb();
    const topicParam = req.query.topicId ? Number(req.query.topicId) : null;

    // Best attempt per student per topic (or all attempts sorted by percentage desc, score desc, time asc)
    const studentAttempts = db.attempts.filter((a) => {
      const owner = db.users.find((u) => u.id === a.userId);
      if (owner && owner.role === 'teacher') return false;
      if (topicParam && topicParam >= 1 && topicParam <= 11) {
        return a.topicId === topicParam;
      }
      return true;
    });

    const sorted = [...studentAttempts].sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.score !== a.score) return b.score - a.score;
      return a.timeTakenSeconds - b.timeTakenSeconds;
    });

    res.json({ rankings: sorted });
  });

  // Teacher / Admin Routes
  function requireTeacher(req: express.Request, res: express.Response) {
    const user = getBearerUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return null;
    }
    if (user.role !== 'teacher') {
      res.status(403).json({ error: 'Forbidden: Teacher/Admin privileges required.' });
      return null;
    }
    return user;
  }

  app.get('/api/admin/overview', (req, res) => {
    const teacher = requireTeacher(req, res);
    if (!teacher) return;

    const db = getDb();
    const studentsOnly = db.users.filter((u) => u.role === 'student');

    const studentRows: StudentCompletionRow[] = studentsOnly.map((stu) => {
      const stuNotes = db.notesProgress[stu.id] || {};
      const stuAttempts = db.attempts.filter((a) => a.userId === stu.id);
      const topicStatus: StudentCompletionRow['topicStatus'] = {};
      let topicsCompletedCount = 0;
      let notesReadCount = 0;
      const bestPercentages: number[] = [];

      for (const t of SYLLABUS_TOPICS) {
        const noteEntry = stuNotes[t.id];
        const tAttempts = stuAttempts.filter((a) => a.topicId === t.id);
        const notesCompleted = Boolean(noteEntry?.completed);
        if (notesCompleted) notesReadCount += 1;

        const bestAttempt = tAttempts.reduce<typeof tAttempts[number] | undefined>(
          (best, cur) => (!best || cur.percentage > best.percentage ? cur : best),
          undefined
        );
        const lastAttempt = tAttempts[tAttempts.length - 1];
        if (tAttempts.length > 0) {
          topicsCompletedCount += 1;
          if (bestAttempt) bestPercentages.push(bestAttempt.percentage);
        }

        topicStatus[t.id] = {
          notesCompleted,
          readNodesCount: noteEntry ? noteEntry.readNodeIds.length : 0,
          totalNodesCount: t.branches.length,
          attempted: tAttempts.length > 0,
          attemptsCount: tAttempts.length,
          bestScore: bestAttempt ? bestAttempt.score : null,
          bestTotal: bestAttempt ? bestAttempt.totalQuestions : null,
          bestPercentage: bestAttempt ? bestAttempt.percentage : null,
          lastMode: lastAttempt ? lastAttempt.mode : null,
          lastAttemptAt: lastAttempt ? lastAttempt.completedAt : null
        };
      }

      const averagePercentage =
        bestPercentages.length > 0
          ? Math.round(bestPercentages.reduce((a, b) => a + b, 0) / bestPercentages.length)
          : null;

      const latestAttempt = stuAttempts[stuAttempts.length - 1];

      return {
        userId: stu.id,
        name: stu.name,
        email: stu.email,
        className: stu.className,
        createdAt: stu.createdAt,
        topicsCompletedCount,
        notesReadCount,
        averagePercentage,
        lastActiveAt: latestAttempt ? latestAttempt.completedAt : null,
        topicStatus
      };
    });

    const recentAttempts = [...db.attempts]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 100);

    const payload: AdminOverviewResponse = {
      settings: db.settings,
      students: studentRows,
      recentAttempts,
      totalQuestions: db.questions.length
    };

    res.json(payload);
  });

  app.put('/api/admin/settings', async (req, res) => {
    try {
      const teacher = requireTeacher(req, res);
      if (!teacher) return;

      const body = req.body || {};
      const db = getDb();

      if (Array.isArray(body.enabledTopics)) {
        const validIds = body.enabledTopics
          .map(Number)
          .filter((id: number) => Number.isInteger(id) && id >= 1 && id <= 11);
        db.settings.enabledTopics = Array.from(new Set(validIds));
      }

      if (typeof body.requireNotesBeforeQuiz === 'boolean') {
        db.settings.requireNotesBeforeQuiz = body.requireNotesBeforeQuiz;
      }

      if (Array.isArray(body.enabledGames)) {
        const allowed: QuizMode[] = [
          'classic',
          'byte_blaster',
          'circuit_grid',
          'tower_climb',
          'heart_quest',
          'pixel_boss'
        ];
        const filtered = body.enabledGames.filter((g: unknown): g is QuizMode =>
          typeof g === 'string' && allowed.includes(g as QuizMode)
        );
        if (filtered.length > 0) {
          db.settings.enabledGames = Array.from(new Set(filtered));
        }
      }

      await saveDb();
      res.json({ settings: db.settings });
    } catch (err) {
      console.error('Update settings error:', err);
      res.status(500).json({ error: 'Could not update settings.' });
    }
  });

  app.get('/api/admin/questions', (req, res) => {
    const teacher = requireTeacher(req, res);
    if (!teacher) return;

    const db = getDb();
    const topicId = req.query.topicId ? Number(req.query.topicId) : null;
    const type = typeof req.query.type === 'string' ? req.query.type : 'all';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    const filtered = db.questions.filter((q) => {
      if (topicId && q.topicId !== topicId) return false;
      if (type !== 'all' && q.type !== type) return false;
      if (
        search &&
        !q.prompt.toLowerCase().includes(search) &&
        !q.correctAnswer.toLowerCase().includes(search) &&
        !q.subtopicCode.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    res.json({ questions: filtered, total: filtered.length });
  });

  app.post('/api/admin/questions', async (req, res) => {
    try {
      const teacher = requireTeacher(req, res);
      if (!teacher) return;

      const body = req.body || {};
      const topicId = Number(body.topicId);
      const type = body.type === 'fill_blank' ? 'fill_blank' : 'mcq';
      const subtopicCode =
        typeof body.subtopicCode === 'string' && body.subtopicCode.trim()
          ? body.subtopicCode.trim()
          : `${topicId}.1`;
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      const correctAnswer = typeof body.correctAnswer === 'string' ? body.correctAnswer.trim() : '';
      const explanation = typeof body.explanation === 'string' ? body.explanation.trim() : '';

      if (!Number.isInteger(topicId) || topicId < 1 || topicId > 11) {
        res.status(400).json({ error: 'Topic ID must be between 1 and 11.' });
        return;
      }
      if (!prompt || !correctAnswer) {
        res.status(400).json({ error: 'Question prompt and correct answer are required.' });
        return;
      }

      let options: string[] | undefined;
      let acceptedAnswers: string[] | undefined;

      if (type === 'mcq') {
        if (!Array.isArray(body.options) || body.options.length < 2) {
          res.status(400).json({ error: 'MCQ questions require at least 2 options.' });
          return;
        }
        const cleanedOptions: string[] = body.options
          .map((o: unknown) => String(o).trim())
          .filter(Boolean);
        if (!cleanedOptions.includes(correctAnswer)) {
          res.status(400).json({ error: 'Correct answer must exactly match one of the options.' });
          return;
        }
        options = cleanedOptions;
      } else {
        const extra = Array.isArray(body.acceptedAnswers)
          ? body.acceptedAnswers.map((a: unknown) => String(a).trim()).filter(Boolean)
          : [];
        acceptedAnswers = Array.from(new Set([correctAnswer, ...extra]));
      }

      const newQuestion: QuestionItem = {
        id: `custom-t${topicId}-${crypto.randomUUID().slice(0, 8)}`,
        topicId,
        type,
        subtopicCode,
        prompt,
        options,
        correctAnswer,
        acceptedAnswers,
        explanation: explanation || 'Added by teacher.'
      };

      const db = getDb();
      db.questions.unshift(newQuestion);
      await saveDb();

      res.status(201).json({ question: newQuestion });
    } catch (err) {
      console.error('Create question error:', err);
      res.status(500).json({ error: 'Could not add question.' });
    }
  });

  app.put('/api/admin/questions/:id', async (req, res) => {
    try {
      const teacher = requireTeacher(req, res);
      if (!teacher) return;

      const db = getDb();
      const idx = db.questions.findIndex((q) => q.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Question not found.' });
        return;
      }

      const existing = db.questions[idx];
      const body = req.body || {};

      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : existing.prompt;
      const correctAnswer =
        typeof body.correctAnswer === 'string' ? body.correctAnswer.trim() : existing.correctAnswer;
      const explanation =
        typeof body.explanation === 'string' ? body.explanation.trim() : existing.explanation;
      const subtopicCode =
        typeof body.subtopicCode === 'string' ? body.subtopicCode.trim() : existing.subtopicCode;
      const type =
        body.type === 'mcq' || body.type === 'fill_blank' ? body.type : existing.type;

      let options = existing.options;
      let acceptedAnswers = existing.acceptedAnswers;

      if (type === 'mcq') {
        if (Array.isArray(body.options)) {
          options = body.options.map((o: unknown) => String(o).trim()).filter(Boolean);
        }
        if (!options || !options.includes(correctAnswer)) {
          res.status(400).json({ error: 'Correct answer must match one of the MCQ options.' });
          return;
        }
        acceptedAnswers = undefined;
      } else {
        options = undefined;
        const extra = Array.isArray(body.acceptedAnswers)
          ? body.acceptedAnswers.map((a: unknown) => String(a).trim()).filter(Boolean)
          : existing.acceptedAnswers || [];
        acceptedAnswers = Array.from(new Set([correctAnswer, ...extra]));
      }

      db.questions[idx] = {
        ...existing,
        type,
        subtopicCode,
        prompt,
        options,
        correctAnswer,
        acceptedAnswers,
        explanation
      };

      await saveDb();
      res.json({ question: db.questions[idx] });
    } catch (err) {
      console.error('Update question error:', err);
      res.status(500).json({ error: 'Could not update question.' });
    }
  });

  app.delete('/api/admin/questions/:id', async (req, res) => {
    try {
      const teacher = requireTeacher(req, res);
      if (!teacher) return;

      const db = getDb();
      const idx = db.questions.findIndex((q) => q.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Question not found.' });
        return;
      }

      db.questions.splice(idx, 1);
      await saveDb();
      res.json({ deletedId: req.params.id });
    } catch (err) {
      console.error('Delete question error:', err);
      res.status(500).json({ error: 'Could not delete question.' });
    }
  });

  app.post('/api/admin/reset-student', async (req, res) => {
    try {
      const teacher = requireTeacher(req, res);
      if (!teacher) return;

      const body = req.body || {};
      const userId = typeof body.userId === 'string' ? body.userId : '';
      const action = body.action === 'remove_account' ? 'remove_account' : 'reset_progress';

      const db = getDb();
      const student = db.users.find((u) => u.id === userId && u.role === 'student');
      if (!student) {
        res.status(404).json({ error: 'Student not found.' });
        return;
      }

      if (action === 'remove_account') {
        db.users = db.users.filter((u) => u.id !== userId);
      }
      delete db.notesProgress[userId];
      db.attempts = db.attempts.filter((a) => a.userId !== userId);
      for (const topicMap of Object.values(db.assignedByTopic)) {
        for (const qId of Object.keys(topicMap)) {
          topicMap[qId] = topicMap[qId].filter((id) => id !== userId);
        }
      }

      await saveDb();
      res.json({ ok: true });
    } catch (err) {
      console.error('Reset student error:', err);
      res.status(500).json({ error: 'Could not update student record.' });
    }
  });

  // Vite dev middleware or production static assets
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BelajarBuddy ICT server listening on http://localhost:${PORT}`);
  });
}

startServer();
