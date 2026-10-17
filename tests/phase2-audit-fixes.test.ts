import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareGeneratedQuestionDraft } from '../server/editorial-validation.ts';
import { activateUnconfirmedStudents } from '../server/student-activation.ts';
import { hydrateStatelessJobRecord } from '../server/ai-queue-state.ts';
import {
  PRACTICE_CATEGORY_OPTIONS,
  resolveTimerPresetSeconds,
  matchesExamModeFilter,
  calculateSessionAccuracy,
} from '../src/features/student/session-helpers.ts';
import type { BaseQuestion } from '../src/types.ts';

test('prepareGeneratedQuestionDraft assigns revision 1 and metadata for atomic save_question RPC', () => {
  const sample: BaseQuestion = {
    id: 'ai-q-101',
    type: 'figure_completion',
    category: 'matrix',
    difficulty: 2,
    targetGrade: 2,
    prompt: 'Eksik parçayı bulun.',
    options: [
      { id: 'A', text: 'A' },
      { id: 'B', text: 'B' },
      { id: 'C', text: 'C' },
      { id: 'D', text: 'D' },
    ],
    correctOptionId: 'A',
    explanation: 'A seçeneği örüntüyü tamamlar.',
  };
  const draft = prepareGeneratedQuestionDraft(sample, 'draft', 'admin-uid-1', '2026-10-17T18:00:00.000Z');
  assert.equal(draft.status, 'draft');
  assert.equal(draft.revision, 1);
  assert.equal(draft.updatedBy, 'admin-uid-1');
  assert.equal(draft.updatedAt, '2026-10-17T18:00:00.000Z');
});

test('activateUnconfirmedStudents activates only unconfirmed children concurrently via Promise.all', async () => {
  const updatedIds: string[] = [];
  const mockAdmin = {
    async getUserById(id: string) {
      if (id === 'child-confirmed') {
        return { data: { user: { email_confirmed_at: '2026-10-01T00:00:00Z' } }, error: null };
      }
      return { data: { user: { email_confirmed_at: null } }, error: null };
    },
    async updateUserById(id: string, attrs: { email_confirm: boolean }) {
      assert.equal(attrs.email_confirm, true);
      updatedIds.push(id);
      return { data: { user: { id } }, error: null };
    },
  };

  const count = await activateUnconfirmedStudents(
    [{ id: 'child-1' }, { id: 'child-confirmed' }, { id: 'child-2' }],
    mockAdmin,
  );
  assert.equal(count, 2);
  assert.deepEqual(updatedIds.sort(), ['child-1', 'child-2']);
});

test('hydrateStatelessJobRecord recovers stateless job state and auto-completes finished counts', () => {
  const hydrated = hydrateStatelessJobRecord('job-stateless-123', {
    adminId: 'admin-1',
    config: { targetGrade: 2, difficulty: 2, count: 3, minQualityScore: 85 },
    status: 'processing',
    progress: { completed: 1, total: 3, approved: 1, rejected: 0, failed: 0 },
    createdAt: 1760000000000,
  });
  assert.ok(hydrated);
  assert.equal(hydrated.jobId, 'job-stateless-123');
  assert.equal(hydrated.status, 'processing');
  assert.equal(hydrated.progress.completed, 1);
  assert.equal(hydrated.progress.total, 3);

  const completedJob = hydrateStatelessJobRecord('job-done-456', {
    adminId: 'admin-1',
    config: { count: 2 },
    status: 'processing',
    progress: { completed: 2, total: 2, approved: 2, rejected: 0, failed: 0 },
  }, 1760000099000);
  assert.ok(completedJob);
  assert.equal(completedJob.status, 'completed');
  assert.equal(completedJob.completedAt, 1760000099000);
});

test('session-helpers resolve timer presets, exam filters, and accuracy deterministically', () => {
  assert.equal(PRACTICE_CATEGORY_OPTIONS.length, 9);
  assert.equal(resolveTimerPresetSeconds('5m'), 300);
  assert.equal(resolveTimerPresetSeconds('10m'), 600);
  assert.equal(resolveTimerPresetSeconds('15m'), 900);
  assert.equal(resolveTimerPresetSeconds('untimed'), 0);

  assert.equal(matchesExamModeFilter({ id: 'warmup' }, 'grade1'), true);
  assert.equal(matchesExamModeFilter({ id: 'grade2_std', grade: 2 }, 'grade1'), false);
  assert.equal(matchesExamModeFilter({ id: 'focus_matrix', category: 'matrix' }, 'focus'), true);

  assert.equal(calculateSessionAccuracy(8, 10), 80);
  assert.equal(calculateSessionAccuracy(0, 0), 0);
});

test('Phase 2 SQL migration defines composite question index, partial session index, and probabilistic rate-limit cleanup', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20261017183500_phase2_indexes_and_rate_limit_optimization.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /questions_published_lookup_idx/);
  assert.match(sql, /learning_sessions_active_student_idx/);
  assert.ok(sql.includes('if pg_catalog.random() < 0.02 then'));
});
