import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectLocalReelQuestion } from '../src/features/reels/browser-reel';
import { independentlyMatchesPerceptual } from '../src/features/questions/perceptual-solver';

test('browser manual Reels use original solver-verified questions at each level', async () => {
  for (const request of [
    { grade: 1 as const, difficulty: 1, mechanic: 'auto' as const },
    { grade: 2 as const, difficulty: 2, mechanic: 'matrix-attributes' as const },
    { grade: 4 as const, difficulty: 3, mechanic: 'interleaved-sequence' as const },
  ]) {
    const question = await selectLocalReelQuestion(request);
    assert.equal(question.grade, request.grade);
    assert.equal(question.board.mechanic, question.mechanic);
    assert.equal(question.board.grade, request.grade);
    assert.equal(question.options.length, 4);
    const matches = question.options.filter(option => independentlyMatchesPerceptual(question.board, option.card));
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, question.correctId);
    assert.equal(new Set(question.options.map(option => option.id)).size, 4);
  }
});

test('browser fallback never publishes, uploads or embeds credentials', () => {
  const recorder = readFileSync(new URL('../src/features/reels/browser-reel.ts', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../src/components/admin/AdminReelsStudio.tsx', import.meta.url), 'utf8');
  assert.match(recorder, /MediaRecorder/);
  assert.match(recorder, /canvas\.captureStream/);
  assert.match(recorder, /validatePerceptualBoard/);
  assert.match(recorder, /auditQuestion/);
  assert.match(recorder, /solveQuestion/);
  assert.match(panel, /createBrowserReel/);
  assert.match(panel, /Şimdi Video Oluştur \(Cihazda\)/);
  assert.match(panel, /download=\{/);
  assert.doesNotMatch(recorder, /INSTAGRAM_ACCESS_TOKEN|SERVICE_ROLE_KEY|media_publish|fetch\(/);
});
