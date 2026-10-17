/** Soft offline Web Audio cues, with no music or audio downloads. */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private active = true;
  private level = .45;
  private listeners = new Set<() => void>();
  private voices = new Set<OscillatorNode>();
  private lastClick = -Infinity;
  constructor() {
    try {
      if (typeof window !== 'undefined') {
        this.active = window.localStorage.getItem('zekapark-sound-enabled-v1') !== 'false';
        const saved = window.localStorage.getItem('zekapark-sound-volume-v1');
        if (saved !== null && saved.trim() !== '' && Number.isFinite(Number(saved))) this.level = Math.min(1, Math.max(0, Number(saved)));
      }
    } catch {}
  }
  private persist(key: string, value: string) { try { window.localStorage.setItem(key, value); } catch {} }
  private notify() { for (const listener of this.listeners) listener(); }
  private applyOutput() { try { this.output?.gain.setValueAtTime(this.active ? this.level : 0, this.ctx?.currentTime || 0); } catch {} }
  private stopVoices() { for (const voice of this.voices) { try { voice.stop(); voice.disconnect?.(); } catch {} } this.voices.clear(); }
  get enabled() { return this.active; }
  set enabled(value: boolean) {
    this.active = Boolean(value); if (!this.active) this.stopVoices();
    this.persist('zekapark-sound-enabled-v1', String(this.active)); this.applyOutput(); this.notify();
  }
  get volume() { return this.level; }
  set volume(value: number) {
    if (!Number.isFinite(value)) return;
    this.level = Math.min(1, Math.max(0, value)); if (this.level === 0) this.stopVoices();
    this.persist('zekapark-sound-volume-v1', String(this.level)); this.applyOutput(); this.notify();
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.enabled;
  getServerSnapshot = () => true;
  getVolumeSnapshot = () => this.volume;
  getServerVolumeSnapshot = () => .45;
  /** Invoke during a tap, before awaiting the answer save on mobile. */
  unlock() { this.getContext(); }
  private getContext(): AudioContext | null {
    if (!this.active || this.level === 0) return null;
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) { this.ctx = new AudioCtx(); this.output = this.ctx.createGain(); this.output.connect(this.ctx.destination); this.applyOutput(); }
      }
      if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {});
      return this.ctx;
    } catch { return null; }
  }
  private melody(notes: number[], spacing: number, duration: number, peak = .1) {
    const ctx = this.getContext(); if (!ctx) return;
    try {
      if (this.voices.size + notes.length > 24) this.stopVoices();
      notes.forEach((frequency, i) => {
        const start = ctx.currentTime + i * spacing, osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(.001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + .012);
        gain.gain.exponentialRampToValueAtTime(.001, start + duration);
        osc.connect(gain); gain.connect(this.output || ctx.destination); this.voices.add(osc);
        osc.onended = () => { this.voices.delete(osc); osc.disconnect(); gain.disconnect(); };
        osc.start(start); osc.stop(start + duration + .015);
      });
    } catch {}
  }
  playSuccess() { this.melody([523.25, 659.25, 783.99], .07, .24, .09); }
  playError() { this.melody([261.63, 220], .085, .2, .065); }
  playClick() {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastClick < 60) return;
    this.lastClick = now; this.melody([800], 0, .045, .045);
  }
  playTransition() { this.melody([392, 523.25], .045, .12, .035); }
  playLevelUp() { this.melody([440, 554.37, 659.25, 880], .09, .3, .1); }
  playCombo(comboCount: number) {
    const count = Number.isFinite(comboCount) ? Math.min(12, Math.max(0, comboCount)) : 0, base = 440 + count * 30;
    this.melody([base, base * 1.25, base * 1.5], .055, .2, .08);
  }
  playComboMilestone(_comboCount: number) { this.melody([523.25, 659.25, 783.99, 1046.5], .075, .3, .09); }
  playReminderChime() { this.melody([659.25, 880, 1108.73], .16, .5, .065); }
}
export const sound = new SoundEngine();
