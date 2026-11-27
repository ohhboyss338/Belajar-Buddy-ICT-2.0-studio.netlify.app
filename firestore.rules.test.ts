import assert from 'node:assert/strict';

export interface RuleTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: RuleTestCase[] = [
  {
    id: 1,
    name: 'Privilege escalation on signup without valid /admins/{uid}',
    collectionPath: 'users/studentA',
    operation: 'create',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: false },
    payload: {
      uid: 'studentA',
      name: 'Student A',
      email: 'a@school.edu',
      role: 'teacher',
      className: 'Teacher',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Invalid teacher codeDigest when creating /admins/{uid}',
    collectionPath: 'admins/studentA',
    operation: 'create',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: false },
    payload: {
      uid: 'studentA',
      codeDigest: '0000000000000000000000000000000000000000000000000000000000000000',
      createdAt: 'REQUEST_TIME'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'PII snooping via get on another user profile',
    collectionPath: 'users/studentB',
    operation: 'get',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: true },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'PII scraping via list on /users collection as student',
    collectionPath: 'users',
    operation: 'list',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: true },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Spoofed bootstrapped admin with email_verified=false',
    collectionPath: 'settings/app',
    operation: 'update',
    auth: { uid: 'attacker1', email: 'ohhboyss338@gmail.com', email_verified: false },
    payload: {
      enabledTopics: [1],
      requireNotesBeforeQuiz: false,
      enabledGames: ['classic'],
      updatedAt: 'REQUEST_TIME'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Shadow field injection + role mutation on user update',
    collectionPath: 'users/studentA',
    operation: 'update',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: true },
    payload: {
      role: 'teacher',
      isAdmin: true,
      updatedAt: 'REQUEST_TIME'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Ranking score forgery impersonating another userId',
    collectionPath: 'rankings/attempt_spoof_1',
    operation: 'create',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: true },
    payload: {
      attemptId: 'attempt_spoof_1',
      userId: 'studentB',
      studentName: 'Student B',
      className: '10A',
      topicId: 1,
      topicTitle: 'Types and components of computer systems',
      mode: 'classic',
      questionFilter: 'mcq',
      score: 10,
      totalQuestions: 10,
      percentage: 100,
      timeTakenSeconds: 120,
      completedAt: '2026-11-27T00:00:00.000Z',
      isPublicRanking: true,
      createdAt: 'REQUEST_TIME'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Post-submission score tampering on /rankings/{attemptId}',
    collectionPath: 'rankings/attempt_1',
    operation: 'update',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: true },
    payload: {
      score: 10,
      percentage: 100
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Score exceeds totalQuestions boundary on /rankings create',
    collectionPath: 'rankings/attempt_overflow',
    operation: 'create',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: true },
    payload: {
      attemptId: 'attempt_overflow',
      userId: 'studentA',
      studentName: 'Student A',
      className: '10A',
      topicId: 1,
      topicTitle: 'Types and components of computer systems',
      mode: 'classic',
      questionFilter: 'mcq',
      score: 999,
      totalQuestions: 10,
      percentage: 100,
      timeTakenSeconds: 60,
      completedAt: '2026-11-27T00:00:00.000Z',
      isPublicRanking: true,
      createdAt: 'REQUEST_TIME'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Student attempting to modify /questions/{questionId}',
    collectionPath: 'questions/q_tamper',
    operation: 'create',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: true },
    payload: {
      id: 'q_tamper',
      topicId: 1,
      type: 'mcq',
      subtopicCode: '1.1',
      prompt: 'Tampered?',
      options: ['A', 'B'],
      correctAnswer: 'A',
      acceptedAnswers: [],
      explanation: 'Tampered',
      status: 'active',
      updatedAt: 'REQUEST_TIME'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Student attempting to disable notes gate in /settings/app',
    collectionPath: 'settings/app',
    operation: 'update',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: true },
    payload: {
      enabledTopics: [1, 2, 3],
      requireNotesBeforeQuiz: false,
      enabledGames: ['classic'],
      updatedAt: 'REQUEST_TIME'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'ID poisoning with oversized invalid document ID',
    collectionPath: `rankings/${'x'.repeat(256)}`,
    operation: 'create',
    auth: { uid: 'studentA', email: 'a@school.edu', email_verified: true },
    payload: {},
    expected: 'PERMISSION_DENIED'
  }
];

assert.equal(DIRTY_DOZEN_PAYLOADS.length, 12);
