import test from 'node:test';
import assert from 'node:assert/strict';
import { fromSupabaseRow, toSupabaseRow } from '../src/lib/supabase-shape';

const id = 'a6d8d44c-66e0-4f4e-8a29-e873b874802e';
test('student profile keeps family links, consent, and progress fields', () => {
  const profile = {
    id, email: 'student@example.com', role: 'student', name: 'Student',
    linkedParentId: id, linkedStudentIds: [], xp: 120, streak: 2,
    dailyGoalMinutes: 15, soundEnabled: true,
    consent: { actorRole: 'parent', acceptedAt: 1, kvkkVersion: '2026.1', termsVersion: '2026.1' },
  };
  const row = toSupabaseRow('profiles', id, profile);
  assert.equal(row.linked_parent_id, id);
  assert.equal(row.daily_goal_minutes, 15);
  assert.deepEqual(fromSupabaseRow('profiles', row), profile);
});
test('question status is derived from the full question document', () => {
  const question = { id: 'q1', status: 'published', prompt: 'Test', revision: 2 };
  const row = toSupabaseRow('questions', 'q1', question);
  assert.deepEqual(row, { id: 'q1', data: question });
  assert.deepEqual(fromSupabaseRow('questions', row), question);
});
test('private progress keeps its serialized values', () => {
  const values = { mastery: '{"score":2}', exams: '[]' };
  const row = toSupabaseRow('user_private_state', id, { values });
  assert.deepEqual(fromSupabaseRow('user_private_state', row).values, values);
});
