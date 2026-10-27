import { useId } from 'react';
import './student-game-world.css';

import { StudentGameArt, type GameArtKind } from './StudentToyArt';
export { StudentGameArt };
export type { GameArtKind };

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
