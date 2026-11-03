import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundEngine } from '../src/lib/sound';
import { MUSIC_THEMES, midiFrequency } from '../src/lib/audio-themes';

function fixture(options: { suspended?: boolean; rejectResume?: boolean } = {}) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalSet = globalThis.setInterval, originalClear = globalThis.clearInterval;
  const timers = new Map<number, () => void>(), storage = new Map<string, string>();
  const contexts: Context[] = [];
  let next = 0;
  class Context {
    state = options.suspended ? 'suspended' : 'running'; currentTime = 0; destination = {};
    resumes = 0; suspends = 0; closed = false; onstatechange?: () => void;
    voices: { stopped: boolean; frequency: number; start: number }[] = [];
    constructor() { contexts.push(this); }
    resume() { this.resumes++; if (options.rejectResume) return Promise.reject(Error('Blocked')); this.state = 'running'; this.onstatechange?.(); return Promise.resolve(); }
    suspend() { this.suspends++; this.state = 'suspended'; this.onstatechange?.(); return Promise.resolve(); }
    close() { this.closed = true; this.state = 'closed'; return Promise.resolve(); }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    createOscillator() {
      const voice = { stopped: false, frequency: 0, start: 0 }; this.voices.push(voice);
      const ended: (() => void)[] = [];
      return { type: '', frequency: { setValueAtTime(value: number) { voice.frequency = value; } }, connect() {}, disconnect() {},
        addEventListener(_name: string, fn: () => void) { ended.push(fn); },
        start(time: number) { voice.start = time; }, stop(time?: number) { if (time === undefined) { voice.stopped = true; ended.forEach(fn => fn()); } } };
    }
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: Context, localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } } });
  globalThis.setInterval = ((fn: () => void) => { timers.set(++next, fn); return next; }) as unknown as typeof setInterval;
  globalThis.clearInterval = ((id: number) => { timers.delete(id); }) as typeof clearInterval;
  const engine = new SoundEngine();
  return { engine, timers, contexts, storage, cleanup() { engine.dispose(); globalThis.setInterval = originalSet; globalThis.clearInterval = originalClear; if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window'); } };
}

test('music waits for interaction, owns one player, and honors outgoing route priority', () => {
  const f = fixture();
  try {
    const lobby = Symbol(), profile = Symbol();
    f.engine.claimScene(lobby, 'lobby');
    assert.equal(f.contexts.length, 0); assert.equal(f.timers.size, 0);
    f.engine.unlock(); assert.equal(f.contexts.length, 1); assert.equal(f.timers.size, 1); assert.ok(f.contexts[0].voices.length > 0);
    f.engine.unlock(); f.engine.claimScene(profile, 'profile', 20);
    assert.equal(f.engine.musicScene, 'profile'); assert.equal(f.timers.size, 1);
    const stopQuestions = f.engine.claimScene(Symbol(), null, 100);
    assert.equal(f.engine.musicScene, null); assert.equal(f.timers.size, 0); assert.ok(f.contexts[0].voices.every(v => v.stopped));
    stopQuestions(); assert.equal(f.engine.musicScene, 'profile'); assert.equal(f.timers.size, 1);
    const stale = f.engine.claimScene(lobby, 'lobby'); f.engine.claimScene(lobby, 'profile', 30); stale();
    assert.equal(f.engine.musicScene, 'profile'); assert.equal(f.contexts.length, 1);
  } finally { f.cleanup(); }
  assert.equal(f.timers.size, 0); assert.equal(f.contexts[0].closed, true);
});

test('separate music mute preserves effects; master mute, zero volume and background stop voices', async () => {
  const f = fixture();
  try {
    f.engine.claimScene(Symbol(), 'lobby'); f.engine.unlock(); const ctx = f.contexts[0];
    f.engine.musicEnabled = false; assert.equal(f.timers.size, 0);
    const count = ctx.voices.length; f.engine.playSuccess(); assert.equal(ctx.voices.length, count + 3);
    f.engine.musicEnabled = true; assert.equal(f.timers.size, 1);
    f.engine.setAppActive(false); assert.equal(f.timers.size, 0); assert.equal(ctx.suspends, 1);
    const hiddenCount = ctx.voices.length; f.engine.playClick(); f.engine.playTransition(); assert.equal(ctx.voices.length, hiddenCount);
    f.engine.setAppActive(true); await Promise.resolve(); assert.equal(f.timers.size, 1); assert.equal(f.contexts.length, 1);
    f.engine.enabled = false; assert.equal(f.timers.size, 0); assert.ok(ctx.voices.every(v => v.stopped || v.start === 0));
    const mutedCount = ctx.voices.length; f.engine.playSuccess(); assert.equal(ctx.voices.length, mutedCount);
    f.engine.enabled = true; f.engine.volume = 0; assert.equal(f.timers.size, 0);
    f.engine.volume = .5; assert.equal(f.timers.size, 1);
    f.engine.musicVolume = 0; assert.equal(f.timers.size, 0);
  } finally { f.cleanup(); }
});

test('music preferences persist, are bounded, and denied resume does not spin', async () => {
  const f = fixture({ suspended: true, rejectResume: true });
  try {
    f.engine.musicVolume = 4; assert.equal(f.engine.musicVolume, 1);
    f.engine.musicVolume = NaN; assert.equal(f.engine.musicVolume, 1);
    f.engine.musicVolume = -2; assert.equal(f.engine.musicVolume, 0);
    f.engine.musicVolume = .25; f.engine.musicEnabled = false;
    const restored = new SoundEngine(); assert.equal(restored.musicVolume, .25); assert.equal(restored.musicEnabled, false); restored.dispose();
    f.engine.musicEnabled = true; f.engine.claimScene(Symbol(), 'lobby'); f.engine.unlock();
    await Promise.resolve(); await Promise.resolve();
    assert.equal(f.contexts[0].resumes, 1); assert.equal(f.timers.size, 0);
    f.engine.unlock(); await Promise.resolve(); assert.equal(f.contexts[0].resumes, 2);
  } finally { f.cleanup(); }
});

test('original scores have distinct tempos, ordered notes, and valid loop boundaries', () => {
  assert.notEqual(MUSIC_THEMES.lobby.bpm, MUSIC_THEMES.profile.bpm);
  assert.equal(midiFrequency(69), 440);
  for (const theme of Object.values(MUSIC_THEMES)) {
    assert.ok(theme.notes.length >= 20);
    for (const [index, note] of theme.notes.entries()) {
      assert.ok(note.beat >= 0 && note.beat + note.length <= theme.beats);
      assert.ok(note.midi >= 45 && note.midi <= 84 && note.length > 0);
      assert.ok(index === 0 || note.beat >= theme.notes[index - 1].beat);
    }
  }
});
