import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnswerFeedbackLedger } from '../src/features/student/answer-feedback';
import { LearningAnswerFeedback } from '../src/components/student/LearningAnswerFeedback';
import { saveAndAdvance } from '../src/features/student/answer-progression';
import { SoundEngine } from '../src/lib/sound';
import type { LearningSessionView } from '../src/features/student/learning-contract';

const session = (correct?: boolean, mode: LearningSessionView['mode'] = 'practice'): LearningSessionView => ({
  id: 'fixture-session', mode, title: 'Fixture', expiresAt: new Date(Date.now() + 600000).toISOString(), questions: [{ id: 'q' } as any],
  answers: correct === undefined ? {} : { '0': { response: { mode: 'choice', optionId: 'A' }, correct, xp: correct ? 15 : 0 } }, result: null,
});
test('only server-acknowledged correct/wrong answers produce one celebration and a truthful streak', () => {
  const ledger = new AnswerFeedbackLedger();
  assert.equal(ledger.take(session(), 0), null);
  const first = ledger.take(session(true), 0)!;
  assert.equal(first.kind, 'correct'); assert.equal(first.xp, 15); assert.equal(first.streak, 1);
  assert.equal(ledger.take(session(true), 0), null);
  assert.equal(ledger.take({ ...session(true), id: 'second' }, 0)?.streak, 2);
  assert.equal(ledger.take({ ...session(false), id: 'wrong' }, 0)?.streak, 0);
  assert.equal(ledger.take({ ...session(true), id: 'next' }, 0)?.streak, 1);
  ledger.reset(); assert.equal(ledger.take(session(true), 0)?.streak, 1);
});
test('exam feedback never reveals correctness or XP, even with an unexpected answer DTO', () => {
  for (const correct of [true, false]) {
    const feedback = new AnswerFeedbackLedger().take(session(correct, 'exam'), 0)!;
    assert.equal(feedback.kind, 'saved'); assert.equal(feedback.xp, 0); assert.equal(feedback.streak, 0);
    const html = renderToStaticMarkup(<LearningAnswerFeedback feedback={feedback} />);
    assert.ok(html.includes('Cevabın kaydedildi!')); assert.ok(!html.includes('Doğru cevap!'));
  }
});
test('awaited feedback holds advancement after the saved answer without delaying acknowledgement', async () => {
  let release!: () => void, acknowledged = false, finishes = 0;
  const before = session(), saved = session(true);
  const pending = saveAndAdvance(before, 0, { mode: 'choice', optionId: 'A' }, {
    answer: async () => saved,
    finish: async () => { finishes++; return { ...saved, result: {} as any }; },
  }, async value => { acknowledged = value === saved; await new Promise<void>(resolve => { release = resolve; }); });
  await Promise.resolve(); assert.equal(acknowledged, true); assert.equal(finishes, 0);
  release(); await pending; assert.equal(finishes, 1);
});
test('sound activation precedes async feedback; mute stops new tones and unavailable audio is harmless', () => {
  const prior = (globalThis as any).window;
  let oscillators = 0, resumes = 0, suspends = 0; const gainLevels: number[] = [];
  class Context {
    state = 'suspended'; currentTime = 0; destination = {};
    resume() { resumes++; this.state = 'running'; return Promise.resolve(); }
    suspend() { suspends++; this.state = 'suspended'; return Promise.resolve(); }
    createOscillator() { oscillators++; return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime(value: number) { gainLevels.push(value); }, exponentialRampToValueAtTime() {} }, connect() {} }; }
  }
  try {
    (globalThis as any).window = { AudioContext: Context, localStorage: { getItem: () => null, setItem() {} } };
    const engine = new SoundEngine(); let notifications = 0;
    const stop = engine.subscribe(() => notifications++);
    engine.unlock(); assert.equal(resumes, 1); assert.equal(oscillators, 0);
    engine.playSuccess(); engine.playError(); assert.ok(oscillators > 0);
    engine.enabled = false; const count = oscillators; engine.playSuccess(); engine.playError(); engine.playTransition(); assert.equal(oscillators, count); assert.equal(suspends, 0); assert.equal(gainLevels.at(-1), 0);
    engine.enabled = true; engine.unlock(); engine.playTransition(); assert.ok(oscillators > count); assert.equal(notifications, 2); stop();
    (globalThis as any).window = { AudioContext: class { constructor() { throw Error('Denied'); } } };
    const unavailable = new SoundEngine(); assert.doesNotThrow(() => { unavailable.unlock(); unavailable.playSuccess(); });
  } finally { if (prior === undefined) delete (globalThis as any).window; else (globalThis as any).window = prior; }
});

test('saved volume is bounded, notifies controls, and zero volume produces no audio', () => {
  const prior = (globalThis as any).window;
  const storage = new Map([['zekapark-sound-volume-v1', '0.25']]);
  let oscillators = 0, stopped = 0;
  const master: number[] = [];
  class Context {
    state = 'running'; currentTime = 0; destination = {};
    createGain() { return { gain: { setValueAtTime(value: number) { master.push(value); }, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    createOscillator() { oscillators++; return { frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stop() { stopped++; } }; }
  }
  try {
    (globalThis as any).window = { AudioContext: Context, localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } };
    const engine = new SoundEngine(); assert.equal(engine.volume, .25);
    let updates = 0; const unsubscribe = engine.subscribe(() => updates++);
    engine.volume = 4; assert.equal(engine.volume, 1);
    engine.volume = NaN; assert.equal(engine.volume, 1); assert.equal(updates, 1);
    engine.volume = -2; engine.playSuccess(); assert.equal(engine.volume, 0); assert.equal(oscillators, 0);
    engine.volume = .5; engine.playSuccess(); assert.equal(oscillators, 3);
    const beforeMute = stopped; engine.enabled = false;
    assert.equal(master.at(-1), 0); assert.equal(stopped, beforeMute + 3);
    engine.enabled = true; assert.equal(master.at(-1), .5); assert.equal(oscillators, 3, 'unmuting cannot restart an old cue');
    assert.equal(new SoundEngine().volume, .5); assert.equal(updates, 5); unsubscribe();
    storage.set('zekapark-sound-volume-v1', 'broken'); assert.equal(new SoundEngine().volume, .45);
  } finally { if (prior === undefined) delete (globalThis as any).window; else (globalThis as any).window = prior; }
});
