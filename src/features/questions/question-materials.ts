/** Bilsem Junior's physical puzzle pieces: vivid faces, quiet edges, readable marks. */
export const PUZZLE_COLORS = ['#D93450','#2456D8','#F2BB35','#007F70','#7846CE','#EC7027'] as const;
export const PUZZLE_INK = '#152D46';
type RGB = [number, number, number];
function rgb(color: string): RGB {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Puzzle materials require a six-digit colour.');
  return [1,3,5].map(i=>parseInt(color.slice(i,i+2),16)) as RGB;
}
export function mixColor(color: string, withColor: string, amount: number) {
  const a=rgb(color),b=rgb(withColor);
  return '#'+a.map((n,i)=>Math.round(n+(b[i]-n)*amount).toString(16).padStart(2,'0')).join('');
}
function luminance(color: string) {
  const channels=rgb(color).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
export function contrastRatio(a: string,b: string) {
  const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function materialFor(face: string) {
  return {face, light:mixColor(face,'#FFFFFF',.23),edge:mixColor(face,PUZZLE_INK,.52),
    shade:mixColor(face,PUZZLE_INK,.18),ink:contrastRatio(face,'#FFFFFF')>=contrastRatio(face,PUZZLE_INK)?'#FFFFFF':PUZZLE_INK};
}
