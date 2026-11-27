# BelajarBuddy ICT — Firestore Security Specification

## 1. Data Invariants
1. **Identity Integrity & PII Isolation**:
   - Every `/users/{userId}` document contains PII (`email`). Only the document owner (`request.auth.uid == userId`) or a verified teacher (`isAdmin()`) may read it.
   - `uid` inside `/users/{userId}`, `/users/{userId}/notesProgress/{topicId}`, `/users/{userId}/assignments/{topicId}`, and `userId` inside `/rankings/{attemptId}` must equal the authenticated owner's UID.
2. **No Self-Assigned Teacher Privileges**:
   - Creating a `/users/{userId}` document with `role == 'teacher'` requires an atomic `/admins/{userId}` creation in the same batch (or existing `isAdmin()`), and `/admins/{userId}` creation strictly requires either a verified bootstrapped admin email (`email_verified == true`) or the exact SHA-256 digest of the teacher verification code.
   - Students cannot update their own `role` or `uid` or `createdAt` fields.
3. **Quiz & Score Integrity**:
   - A student may create a `/rankings/{attemptId}` entry only for their own `userId`, with valid bounds (`score >= 0`, `score <= totalQuestions`, `totalQuestions >= 1 && totalQuestions <= 55`, `percentage >= 0 && percentage <= 100`).
   - Students cannot edit or delete submitted `/rankings/{attemptId}` scores; only verified teachers (`isAdmin()`) may update or remove attempts.
4. **Teacher-Only Question Bank & App Settings**:
   - Only verified teachers (`isAdmin()`) may create, update, or delete `/questions/{questionId}` or modify `/settings/app`.
5. **Temporal Integrity & Path Hardening**:
   - All document IDs are validated against `^[a-zA-Z0-9_-]+$` (`<= 128` chars) and topic IDs against `^([1-9]|1[0-1])$`.
   - `createdAt` / `updatedAt` timestamps on write must equal `request.time`.

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Privilege Escalation on Signup**: Student signs up and writes `/users/{uid}` with `role: 'teacher'` without a valid `/admins/{uid}` batch document.
2. **Teacher Code Brute-Bypass on `/admins/{uid}`**: Authenticated student writes `/admins/{uid}` with an invalid `codeDigest` (e.g. `"0000...0000"`).
3. **PII Snooping (`get`)**: Student A reads `/users/{studentB_uid}` to steal Student B's email address.
4. **PII Scraping (`list`)**: Student A runs a `list` query on `/users` to dump all registered users and emails.
5. **Admin Email Spoofing**: Unverified user (`email_verified: false`) with email matching bootstrapped admin attempts to write `/settings/app`.
6. **Shadow Field Injection**: Student A writes `/users/{uid}` update with extra shadow field `{ isAdmin: true }` or `{ role: 'teacher' }`.
7. **Rankings Score Forgery (Other Student)**: Student A attempts to create `/rankings/attempt_1` with `userId: studentB_uid`.
8. **Rankings Post-Submit Tampering**: Student A attempts to `update` their own `/rankings/attempt_1` to change `score` from `5` to `10`.
9. **Rankings Score Out-of-Bounds**: Student A attempts to create `/rankings/attempt_1` with `score: 999` and `totalQuestions: 10`.
10. **Unauthorized Question Bank Mutation**: Student A attempts to `create` or `update` `/questions/q_hack` to alter correct answers.
11. **Unauthorized App Settings Mutation**: Student A attempts to update `/settings/app` to disable `requireNotesBeforeQuiz`.
12. **ID Poisoning / Resource Exhaustion**: Authenticated user attempts to write `/rankings/{2KB_junk_id}` or inject a `>1000`-char prompt or >30 items into `readNodeIds`.
