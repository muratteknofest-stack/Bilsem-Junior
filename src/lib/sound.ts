import { MUSIC_THEMES, scheduleMusicNote, type MusicScene } from './audio-themes';

/** Shared offline effects and quiet, gesture-started lobby/profile scores. */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private active = true;
  private level = .45;
  private listeners = new Set<() => void>();
  private voices = new Set<OscillatorNode>();
  private lastClick = -Infinity;
  private lastEffect = -Infinity;
  private lastTransition = -Infinity;
  private musicOn = true;
  private musicLevel = .3;
  private musicOutput: GainNode | null = null;
  private musicVoices = new Set<OscillatorNode>();
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private currentScene: MusicScene | null = null;
  private sceneOwners = new Map<symbol, { scene: MusicScene | null; priority: number; order: number }>();
  private sceneOrder = 0;
  private activated = false;
  private appActive = true;
  private resuming: Promise<void> | null = null;

  constructor() {
    try {
      if (typeof window !== 'undefined') {
        this.active = window.localStorage.getItem('zekapark-sound-enabled-v1') !== 'false';
        const saved = window.localStorage.getItem('zekapark-sound-volume-v1');
        if (saved !== null && saved.trim() !== '' && Number.isFinite(Number(saved))) this.level = Math.min(1, Math.max(0, Number(saved)));
        this.musicOn = window.localStorage.getItem('bilsem-music-enabled-v1') !== 'false';
        const musicSaved = window.localStorage.getItem('bilsem-music-volume-v1');
        if (musicSaved !== null && musicSaved.trim() !== '' && Number.isFinite(Number(musicSaved))) this.musicLevel = Math.min(1, Math.max(0, Number(musicSaved)));
      }
    } catch {}
  }

  private persist(key: string, value: string) { try { window.localStorage.setItem(key, value); } catch {} }
  private notify() { for (const listener of this.listeners) listener(); }
  private applyOutput() { try {
    this.musicOutput?.gain.setValueAtTime(this.active && this.appActive && this.musicOn ? this.level*this.musicLevel : 0, this.ctx?.currentTime || 0);
    this.output?.gain.setValueAtTime(this.active && this.appActive ? this.level : 0, this.ctx?.currentTime || 0);
  } catch {} }
  private stopVoices() { for (const voice of this.voices) { try { voice.stop(); voice.disconnect?.(); } catch {} } this.voices.clear(); }

  get enabled() { return this.active; }
  set enabled(value: boolean) {
    this.active = Boolean(value); if (!this.active) { this.stopVoices(); this.stopMusic(); }
    this.persist('zekapark-sound-enabled-v1', String(this.active)); this.applyOutput(); this.syncMusic(); this.notify();
  }
  get volume() { return this.level; }
  set volume(value: number) {
    if (!Number.isFinite(value)) return;
    this.level = Math.min(1, Math.max(0, value)); if (this.level === 0) { this.stopVoices(); this.stopMusic(); }
    this.persist('zekapark-sound-volume-v1', String(this.level)); this.applyOutput(); this.syncMusic(); this.notify();
  }

  get musicEnabled() { return this.musicOn; }
  set musicEnabled(value: boolean) { this.musicOn=Boolean(value);this.persist('bilsem-music-enabled-v1',String(this.musicOn));this.applyOutput();this.syncMusic();this.notify(); }
  get musicVolume() { return this.musicLevel; }
  set musicVolume(value: number) { if(!Number.isFinite(value))return;this.musicLevel=Math.min(1,Math.max(0,value));this.persist('bilsem-music-volume-v1',String(this.musicLevel));this.applyOutput();this.syncMusic();this.notify(); }
  get unlocked() { return this.activated; }
  get musicScene() { return this.currentScene; }
  get musicPlaying() { return this.musicTimer!==null; }
  getMusicSnapshot = () => this.musicEnabled;
  getServerMusicSnapshot = () => true;
  getMusicVolumeSnapshot = () => this.musicVolume;
  getServerMusicVolumeSnapshot = () => .3;
  getSceneSnapshot = () => this.musicScene;
  getServerSceneSnapshot = () => null;

  claimScene(owner: symbol, scene: MusicScene | null, priority=10) {
    const claim={scene,priority,order:++this.sceneOrder};this.sceneOwners.set(owner,claim);this.resolveScene();
    return ()=>{if(this.sceneOwners.get(owner)===claim){this.sceneOwners.delete(owner);this.resolveScene();}};
  }
  private resolveScene() {
    const selected=[...this.sceneOwners.values()].sort((a,b)=>b.priority-a.priority||b.order-a.order)[0]?.scene??null;
    if(selected===this.currentScene)return;
    this.stopMusic();this.currentScene=selected;this.syncMusic();this.notify();
  }
  setAppActive(value: boolean) {
    if(this.appActive===value)return;this.appActive=value;
    if(!value){this.stopVoices();this.stopMusic();try{void this.ctx?.suspend().catch(()=>{});}catch{}}
    this.applyOutput();this.syncMusic();this.notify();
  }
  private stopMusic() {
    if(this.musicTimer!==null){clearInterval(this.musicTimer);this.musicTimer=null;}
    for(const voice of this.musicVoices){try{voice.stop();voice.disconnect();}catch{}}
    this.musicVoices.clear();
  }
  private syncMusic() {
    if(!this.active||!this.appActive||!this.musicOn||this.level===0||this.musicLevel===0||!this.currentScene||!this.activated){this.stopMusic();return;}
    if(this.musicTimer!==null)return;
    const ctx=this.getContext();if(!ctx||ctx.state!=='running'||this.musicTimer!==null)return;
    try {
      if(!this.musicOutput){this.musicOutput=ctx.createGain();this.musicOutput.connect(this.limiter||ctx.destination);this.applyOutput();}
      const theme=MUSIC_THEMES[this.currentScene],beat=60/theme.bpm;
      let phraseStart=ctx.currentTime+.06,index=0;
      const tick=()=>{
        if(ctx.state!=='running')return;
        // Never catch up a throttled tab by playing a backlog of notes at once.
        if(ctx.currentTime>phraseStart+theme.notes[index].beat*beat+.75){phraseStart=ctx.currentTime+.06;index=0;}
        while(phraseStart+theme.notes[index].beat*beat<ctx.currentTime+.4){
          const note=theme.notes[index],start=Math.max(ctx.currentTime+.012,phraseStart+note.beat*beat);
          if(this.musicVoices.size<20)scheduleMusicNote(ctx,this.musicOutput!,note,start,beat,voice=>{
            this.musicVoices.add(voice);voice.addEventListener('ended',()=>this.musicVoices.delete(voice),{once:true});
          });
          if(++index===theme.notes.length){index=0;phraseStart+=theme.beats*beat;}
        }
      };
      this.musicTimer=setInterval(tick,200);tick();
    } catch { this.stopMusic(); }
  }
  /** Release timers/voices when an owning test or app root is discarded. */
  dispose() { this.sceneOwners.clear();this.currentScene=null;this.stopMusic();this.stopVoices();try{void this.ctx?.close().catch(()=>{});}catch{}this.ctx=null;this.output=null;this.musicOutput=null;this.limiter=null; }

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.enabled;
  getServerSnapshot = () => true;
  getVolumeSnapshot = () => this.volume;
  getServerVolumeSnapshot = () => .45;

  /** Invoke during a tap, before awaiting the answer save on mobile. */
  unlock() { this.activated=true;this.getContext();this.syncMusic(); }
  private getContext(): AudioContext | null {
    if (!this.active || !this.appActive || this.level === 0) return null;
    try {
      if(this.ctx?.state==='closed'){this.stopVoices();this.stopMusic();this.ctx=null;this.output=null;this.musicOutput=null;this.limiter=null;}
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          if(typeof this.ctx.createDynamicsCompressor==='function') {
            this.limiter=this.ctx.createDynamicsCompressor();
            this.limiter.threshold.value=-12;this.limiter.knee.value=10;this.limiter.ratio.value=8;this.limiter.attack.value=.005;this.limiter.release.value=.15;
            this.limiter.connect(this.ctx.destination);
          }
          this.output = this.ctx.createGain(); this.output.connect(this.limiter||this.ctx.destination); this.applyOutput();
          this.ctx.onstatechange=()=>{if(this.ctx?.state==='running')this.syncMusic();else this.stopMusic();};
        }
      }
      if (this.ctx && this.ctx.state !== 'running' && !this.resuming) {
        this.resuming=this.ctx.resume().then(()=>{this.resuming=null;if(this.ctx?.state==='running')this.syncMusic();},()=>{this.resuming=null;});
      }
      return this.ctx;
    } catch { return null; }
  }
  private melody(notes: number[], spacing: number, duration: number, peak = .1, wave: OscillatorType='sine') {
    const ctx = this.getContext(); if (!ctx) return;
    this.lastEffect=typeof performance!=='undefined'?performance.now():Date.now();
    try {
      if (this.voices.size + notes.length > 24) this.stopVoices();
      notes.forEach((frequency, i) => {
        const start = ctx.currentTime + i * spacing, osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = wave; osc.frequency.setValueAtTime(frequency, start);
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
    this.lastClick = now; this.melody([880,1174.66], .018, .065, .038, 'triangle');
  }
  playInterfaceClick(checked?: boolean) {
    const now=typeof performance!=='undefined'?performance.now():Date.now();
    if(now-this.lastEffect<100)return;
    if(checked===undefined)this.playClick();else this.playToggle(checked);
  }
  playToggle(on: boolean) { this.melody(on?[659.25,880]:[587.33,440],.035,.12,.035,'triangle'); }
  playTransition() {
    const now=typeof performance!=='undefined'?performance.now():Date.now();
    if(!this.active||!this.appActive||this.level===0||now-this.lastTransition<120)return;
    this.lastTransition=now;this.melody([392,523.25,659.25],.035,.16,.035,'triangle');
  }
  playLevelUp() { this.melody([440, 554.37, 659.25, 880], .09, .3, .1); }
  playCombo(comboCount: number) {
    const count = Number.isFinite(comboCount) ? Math.min(12, Math.max(0, comboCount)) : 0, base = 440 + count * 30;
    this.melody([base, base * 1.25, base * 1.5], .055, .2, .08);
  }
  playComboMilestone(_comboCount: number) { this.melody([523.25, 659.25, 783.99, 1046.5], .075, .3, .09); }
  playReminderChime() { this.melody([659.25, 880, 1108.73], .16, .5, .065); }
  playMapStep(stepIndex = 0) {
    const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
    const base = scale[Math.abs(stepIndex) % scale.length];
    this.melody([base, base * 1.25], .045, .16, .085);
  }
  playMascotCheer() {
    this.melody([587.33, 739.99, 880, 1174.66], .065, .22, .09);
  }
}

export const sound = new SoundEngine();
