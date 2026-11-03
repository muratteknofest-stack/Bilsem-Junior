/** Original, small offline scores; no recordings, network requests or third-party music. */
export type MusicScene = 'lobby' | 'profile';
export interface MusicNote { beat: number; midi: number; length: number; bass?: boolean; }
export interface MusicTheme { bpm: number; beats: number; notes: readonly MusicNote[]; }
const score = (bpm: number, melody: readonly [number, number, number][], bass: readonly number[]): MusicTheme => ({
  bpm, beats: 32,
  notes: [...melody.map(([beat,midi,length])=>({beat,midi,length})), ...bass.map((midi,i)=>({beat:i*4,midi,length:2.8,bass:true}))].sort((a,b)=>a.beat-b.beat),
});
export const MUSIC_THEMES: Readonly<Record<MusicScene, MusicTheme>> = {
  lobby: score(96, [
    [0,72,.6],[1,76,.5],[1.75,79,.7],[3,76,.5],[4,74,.6],[5,76,.5],[6,81,1],
    [8,79,.7],[9.5,76,.5],[10.5,74,.6],[12,72,1],[14,67,.7],
    [16,72,.5],[17,76,.5],[18,79,.6],[19,84,.7],[20,81,.7],[21.5,79,.6],[23,76,.5],
    [24,74,.7],[25.5,76,.5],[26.5,74,.6],[28,72,1.6],[31,67,.5],
  ], [48,45,53,55,48,45,53,55]),
  profile: score(78, [
    [0,69,1.2],[2,72,.8],[4,76,1.3],[6,72,.8],[8,67,1.2],[10,71,.8],[12,74,1.7],
    [16,69,1],[18,72,1],[20,77,1.3],[22,76,.8],[24,74,1],[26,72,1],[28,69,2],
  ], [53,50,55,48,53,50,55,53]),
};
export const midiFrequency = (midi: number) => 440 * 2 ** ((midi-69)/12);

/** Also usable with OfflineAudioContext to measure the real rendered signal. */
export function scheduleMusicNote(ctx: BaseAudioContext, output: AudioNode, note: MusicNote, start: number, beatSeconds: number, track: (voice: OscillatorNode) => void) {
  const duration=Math.max(.12,note.length*beatSeconds), frequency=midiFrequency(note.midi);
  for(const [ratio,peak] of (note.bass ? [[1,.045]] : [[1,.11],[2,.018]])) {
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(frequency*ratio,start);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(peak,start+.018);
    gain.gain.exponentialRampToValueAtTime(peak*.3,start+Math.min(.18,duration*.5));
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration+.22);
    osc.connect(gain);gain.connect(output);track(osc);
    osc.addEventListener('ended',()=>{osc.disconnect();gain.disconnect();},{once:true});
    osc.start(start);osc.stop(start+duration+.24);
  }
}
