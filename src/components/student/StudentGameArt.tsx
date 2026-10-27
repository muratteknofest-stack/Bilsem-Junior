import { useId } from 'react';
import './student-game-world.css';

export type GameArtKind = 'book' | 'cubes' | 'compass' | 'treasure' | 'medal' | 'map' | 'target' | 'puzzle' | 'rocket';

/** Small local vector toys. Labels and real progress belong to the surrounding UI. */
export function StudentGameArt({ kind, className = '' }: { kind: GameArtKind; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const paint = (name: string) => `url(#${id}-${name})`;
  const cube = (x: number, y: number, color: string) => (
    <g stroke="#fff" strokeWidth="1.5" strokeLinejoin="round">
      <path d={`M${x} ${y}l24-14 24 14-24 14Z`} fill={paint(color)} />
      <path d={`M${x} ${y}l24 14v29l-24-14Z`} fill={paint(color)} />
      <path d={`M${x + 24} ${y + 14}l24-14v29l-24 14Z`} fill={paint(color)} opacity=".78" />
    </g>
  );
  return <span className={`bj-game-art ${className}`} data-game-art={kind} aria-hidden="true">
    <svg viewBox="0 0 160 150" focusable="false">
      <defs>
        <linearGradient id={`${id}-blue`} x2=".8" y2="1"><stop stopColor="#bcecff" /><stop offset=".42" stopColor="#4bafff" /><stop offset="1" stopColor="#2866cf" /></linearGradient>
        <linearGradient id={`${id}-mint`} x2=".8" y2="1"><stop stopColor="#bdffe6" /><stop offset=".45" stopColor="#43d6b1" /><stop offset="1" stopColor="#13967f" /></linearGradient>
        <linearGradient id={`${id}-violet`} x2=".8" y2="1"><stop stopColor="#e6d7ff" /><stop offset=".48" stopColor="#b08aee" /><stop offset="1" stopColor="#7850c1" /></linearGradient>
        <linearGradient id={`${id}-gold`} x2=".65" y2="1"><stop stopColor="#fff4b7" /><stop offset=".4" stopColor="#ffd15a" /><stop offset="1" stopColor="#e6a325" /></linearGradient>
        <linearGradient id={`${id}-paper`} x2=".4" y2="1"><stop stopColor="#fff" /><stop offset="1" stopColor="#e1effd" /></linearGradient>
        <linearGradient id={`${id}-pink`} x2=".8" y2="1"><stop stopColor="#ffd5e9" /><stop offset=".5" stopColor="#fa8ab9" /><stop offset="1" stopColor="#ce568b" /></linearGradient>
      </defs>
      <ellipse cx="80" cy="132" rx="54" ry="9" fill="#244c7020" />
      {kind === 'cubes' && <>{cube(32, 84, 'mint')}{cube(80, 84, 'gold')}{cube(56, 42, 'blue')}</>}
      {kind === 'book' && <g strokeLinejoin="round">
        <path d="M25 42 77 52 135 35v77l-58 19-52-13Z" fill="#3b5da7" />
        <path d="M23 35 77 46 137 28v77l-60 19-54-13Z" fill={paint('blue')} stroke="#fff" strokeWidth="2" />
        <path d="M30 34q24-10 47 6 24-24 52-16v72q-28-8-52 17-24-17-47-7Z" fill={paint('paper')} />
        <path d="M77 41v70" stroke="#8eadd3" strokeWidth="3" />
        <path d="m40 53 24 5m-24 9 24 5m-24 9 24 5m25-33 27-8m-27 23 27-8m-27 23 19-6" stroke="#94b3d7" strokeWidth="4" strokeLinecap="round" />
        <path d="m103 29 12-4v38l-6-5-6 9Z" fill={paint('pink')} />
        <path d="m18 24 3-9 4 9 9 3-9 4-4 9-3-9-9-4Z" fill={paint('gold')} />
      </g>}
      {kind === 'compass' && <>
        <circle cx="80" cy="28" r="12" fill="none" stroke="#d8a43b" strokeWidth="8" />
        <circle cx="80" cy="84" r="49" fill="#bd8429" />
        <circle cx="80" cy="78" r="49" fill={paint('gold')} stroke="#fff3c2" strokeWidth="3" />
        <circle cx="80" cy="78" r="38" fill="#235785" stroke="#b9eaff" strokeWidth="3" />
        <path d="M80 42v8m36 28h-8M80 114v-8M44 78h8" stroke="#c8eaff" strokeWidth="3" strokeLinecap="round" />
        <path d="m97 50-9 37-25 20 9-37Z" fill={paint('paper')} />
        <path d="m97 50-9 37-16-17Z" fill={paint('pink')} />
        <circle cx="80" cy="78" r="6" fill={paint('gold')} />
      </>}
      {kind === 'treasure' && <>
        <path d="M30 71h100v48q-48 20-100 0Z" fill="#8055b3" />
        <path d="m25 69 52 10 58-13v44l-58 17-52-11Z" fill={paint('violet')} stroke="#f4d781" strokeWidth="3" />
        <path d="M27 62q3-36 49-36 43 0 58 30l-57 17Z" fill={paint('gold')} stroke="#fff0b6" strokeWidth="3" />
        <path d="M39 57q9-22 38-21 26 0 42 17l-42 11Z" fill="#8156af" />
        <path d="m52 54 12-18 17 17-15 21Z" fill={paint('blue')} stroke="#d5f4ff" strokeWidth="2" />
        <ellipse cx="99" cy="52" rx="13" ry="7" fill={paint('gold')} stroke="#fff4b7" strokeWidth="2" />
        <path d="m77 80 14-3v24l-14 4Z" fill={paint('gold')} /><circle cx="84" cy="89" r="3" fill="#7d5d25" />
        <path d="M44 77v42m69-46v43" stroke="#efbc50" strokeWidth="7" />
        <path d="m135 20 3-9 4 9 9 3-9 4-4 9-3-9-9-4Z" fill={paint('gold')} />
      </>}
      {kind === 'medal' && <>
        <path d="m44 91-5 43 23-11 12 14 8-48m36 3 5 42-22-11-13 14-8-48" fill={paint('mint')} stroke="#c6ffea" strokeWidth="2" />
        <circle cx="80" cy="72" r="47" fill="#c58a24" /><circle cx="80" cy="67" r="47" fill={paint('gold')} stroke="#fff1b1" strokeWidth="3" />
        <circle cx="80" cy="67" r="35" fill="none" stroke="#d99624" strokeWidth="3" />
        <path d="m80 42 8 16 18 3-13 13 3 18-16-9-16 9 3-18-13-13 18-3Z" fill="#fff6ca" stroke="#dba139" strokeWidth="2" />
      </>}
      {kind === 'map' && <>
        <path d="m32 31 31 8 34-10 31 9v78l-31-8-34 11-31-9Z" fill="#b9c9e1" />
        <path d="m28 25 35 10 34-11 35 10v78l-35-9-34 11-35-10Z" fill={paint('paper')} stroke="#fff" strokeWidth="3" />
        <path d="M63 35v79m34-90v79" stroke="#d6e2f0" strokeWidth="3" />
        <path d="M40 87c32 15 9-40 37-33 37 9-4 31 29 32" fill="none" stroke="#8b6dce" strokeWidth="4" strokeDasharray="3 7" strokeLinecap="round" />
        <circle cx="41" cy="87" r="6" fill={paint('mint')} /><path d="m106 68 4 8 9 1-7 6 2 10-8-5-8 5 2-10-7-6 9-1Z" fill={paint('gold')} />
      </>}
      {kind === 'target' && <>
        <path d="m54 103-10 29m62-29 10 29" stroke="#7892b5" strokeWidth="9" strokeLinecap="round" />
        <circle cx="80" cy="72" r="48" fill="#cf5e94" /><circle cx="80" cy="67" r="48" fill={paint('pink')} stroke="#ffe7f1" strokeWidth="3" />
        <circle cx="80" cy="67" r="33" fill={paint('paper')} /><circle cx="80" cy="67" r="18" fill={paint('pink')} /><circle cx="80" cy="67" r="6" fill="#fff" />
        <path d="m81 66 43-39" stroke="#2c6f9e" strokeWidth="6" strokeLinecap="round" /><path d="m114 24 15-4-1 15-11-1Z" fill={paint('mint')} stroke="#dcfff2" strokeWidth="2" />
      </>}
      {kind === 'puzzle' && <>
        <path d="M33 38h35c-8 20 22 20 14 0h37v33c-20-8-20 22 0 14v35H84c8-20-22-20-14 0H33V85c20 8 20-22 0-14Z" fill="#7150a9" transform="translate(0 6)" />
        <path d="M33 34h35c-8 20 22 20 14 0h37v33c-20-8-20 22 0 14v35H84c8-20-22-20-14 0H33V81c20 8 20-22 0-14Z" fill={paint('violet')} stroke="#eee4ff" strokeWidth="2.5" />
        <path d="M44 47h15M45 96v9h14" stroke="#fff" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" />
        <path d="m128 16 3-9 4 9 9 3-9 4-4 9-3-9-9-4Z" fill={paint('gold')} />
      </>}
      {kind === 'rocket' && <g transform="rotate(24 80 77)">
        <path d="M64 102q-9 24 16 36 24-14 15-36" fill={paint('gold')} /><path d="M73 104q-5 15 7 22 12-9 7-22" fill="#fff4c1" />
        <path d="M61 67q-26 9-20 38l24-9m32-29q25 9 20 38l-24-9" fill={paint('pink')} stroke="#ffc9e1" strokeWidth="2" />
        <path d="M80 15q32 27 23 77l-7 16H64l-7-16q-9-50 23-77Z" fill={paint('paper')} stroke="#fff" strokeWidth="2" />
        <path d="M80 15q17 15 23 34H57q7-19 23-34Z" fill={paint('blue')} />
        <circle cx="80" cy="67" r="16" fill={paint('blue')} stroke="#a5d6fa" strokeWidth="5" /><ellipse cx="75" cy="62" rx="7" ry="4" fill="#fff" opacity=".65" />
        <path d="M66 99h28v10H66Z" fill={paint('violet')} />
      </g>}
    </svg>
  </span>;
}

export function StudentGameLandscape({ scene = 'forest' }: { scene?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const night = scene === 'stars' || scene === 'cave';
  const water = scene === 'harbor' || scene === 'sky';
  return <span className="bj-game-landscape" aria-hidden="true"><svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid slice" focusable="false">
    <defs>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor={night ? '#4a4695' : '#a9e3ff'} /><stop offset="1" stopColor={night ? '#b6a3ed' : '#eefcff'} /></linearGradient>
      <linearGradient id={`${id}-grass`} x2="0" y2="1"><stop stopColor={water ? '#71d8d5' : '#a8edb6'} /><stop offset="1" stopColor={water ? '#2ca7bb' : '#47b999'} /></linearGradient>
      <linearGradient id={`${id}-earth`} x2="0" y2="1"><stop stopColor="#8c91b7" /><stop offset="1" stopColor="#5d5e93" /></linearGradient>
    </defs>
    <path d="M0 0h600v220H0Z" fill={`url(#${id}-sky)`} />
    <circle cx="510" cy="42" r="24" fill={night ? '#fff1bd' : '#fff4bf'} />
    <g fill="#fff" opacity=".65"><path d="M31 45q0-15 17-15 8-21 28-9 18-8 27 10 21 0 21 14Z" /><path d="M365 37q0-13 15-13 7-17 24-7 17-7 24 9 19 0 19 12Z" /></g>
    <path d="M0 150 86 62l69 67L246 41l106 108 104-86 144 104v53H0Z" fill={night ? '#8d7dc2' : '#a6cbe8'} opacity=".7" />
    <path d="m204 91 42-50 39 40-25-8-14 13-13-12Z" fill="#fff" opacity=".65" />
    <ellipse cx="307" cy="201" rx="187" ry="13" fill="#476b9b21" />
    <path d="M117 132q174-77 367 0l-30 43-134 36-169-40Z" fill={`url(#${id}-earth)`} />
    <ellipse cx="301" cy="129" rx="184" ry="57" fill={`url(#${id}-grass)`} stroke="#ddfff0" strokeWidth="3" />
    <path d="M198 160c-21-35 68-10 74-35 7-28 50-4 58-25" fill="none" stroke="#fff0c0" strokeWidth="15" strokeLinecap="round" />
    <path d="M198 160c-21-35 68-10 74-35 7-28 50-4 58-25" fill="none" stroke="#dcbf77" strokeWidth="2" strokeDasharray="3 8" />
    {[165, 397, 433].map((x,n) => <g key={x} transform={`translate(${x} ${83+n*7})`}><path d="M0 7v40" stroke="#a18364" strokeWidth="8" strokeLinecap="round" /><circle cy="5" r="24" fill={night ? '#9a8fdf' : '#53bfa4'} /><circle cx="-6" cy="-2" r="17" fill={night ? '#c2adf0' : '#8ae3b9'} /></g>)}
    <path d="M295 58h43v45l-43 7Z" fill="#fef2ce" stroke="#fff" strokeWidth="2" /><path d="m286 60 29-27 34 22-32 8Z" fill="#a580e5" stroke="#e7dbff" strokeWidth="2" /><path d="M310 81q7-13 13-1v25l-13 3Z" fill="#6e72b6" />
    <path d="M359 52v47" stroke="#6679a8" strokeWidth="4" /><path d="m361 52 28 10-28 9Z" fill="#ffbf50" stroke="#fff0b3" strokeWidth="2" />
    <path d="m77 158 22-7 22 7-6 16-18 9-15-12Z" fill={`url(#${id}-earth)`} /><ellipse cx="99" cy="156" rx="22" ry="7" fill="#a3e2c1" />
    <path d="m505 117 21-7 22 7-5 16-17 9-16-13Z" fill={`url(#${id}-earth)`} /><ellipse cx="526" cy="116" rx="21" ry="7" fill="#c3b0ec" />
  </svg></span>;
}

export const GAME_ROUTE_ART: Record<string, GameArtKind> = {
  adaptive: 'rocket', exams: 'target', practice: 'cubes', 'student-tests': 'puzzle',
  'student-topics': 'map', 'student-lessons': 'book', mistakes: 'book',
  'student-plan': 'compass', 'student-skills': 'puzzle', glossary: 'book',
  'student-challenges': 'target', achievements: 'medal', leaderboard: 'rocket', 'student-progress': 'map',
};

export function StudentGameBanner({ title, description, kind, tone = 'blue', headingLevel = 2 }: { title: string; description: string; kind: GameArtKind; tone?: string; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return <header className="bj-game-banner" data-game-tone={tone}>
    <div><span>JUNIOR KAŞİF KULÜBÜ</span><Heading>{title}</Heading><p>{description}</p></div>
    <StudentGameArt kind={kind} />
  </header>;
}
