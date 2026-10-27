import { useId } from 'react';

export type GameArtKind = 'book' | 'cubes' | 'compass' | 'treasure' | 'medal' | 'map' | 'target' | 'puzzle' | 'rocket';

const MATERIALS = {
  blue: ['#c9f5ff', '#36b7ff', '#0872d8', '#084b9a'],
  mint: ['#bdffe7', '#26d4a1', '#039d7b', '#006650'],
  violet: ['#ead6ff', '#a173f5', '#7042cb', '#46218e'],
  gold: ['#fff6c7', '#ffd147', '#e69b15', '#9d5710'],
  pink: ['#ffd6e7', '#ff79b6', '#e63383', '#a51e5b'],
  paper: ['#ffffff', '#f5fbff', '#d2e2f1', '#8aaccb'],
} as const;

/** Local objects with directional light, separate side faces and crisp bevels. */
export function StudentGameArt({ kind, className = '' }: { kind: GameArtKind; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const paint = (name: string) => `url(#${id}-${name})`;
  const cube = (x: number, y: number, color: 'mint' | 'gold' | 'blue') => (
    <g strokeLinejoin="round">
      <path d={`M${x} ${y}l25 14v30l-25-14Z`} fill={paint(color)} />
      <path d={`M${x + 25} ${y + 14}l25-14v30l-25 14Z`} fill={paint(`${color}-side`)} />
      <path d={`M${x} ${y}l25-15 25 15-25 14Z`} fill={MATERIALS[color][0]} />
      <path d={`M${x + 2} ${y}l23-13 23 13-23 13Z`} fill={paint(color)} />
      <path d={`M${x + 1} ${y + 1}l24 13 24-13m-24 13v28`} fill="none" stroke={MATERIALS[color][0]} strokeWidth="1.4" />
      <path d={`M${x + 5} ${y + 7}l4 2v18l-4-2Z`} fill="#fff" opacity=".25" />
    </g>
  );
  return <span className={`bj-game-art ${className}`} data-game-art={kind} aria-hidden="true">
    <svg viewBox="0 0 160 150" focusable="false">
      <defs>
        {Object.entries(MATERIALS).map(([material, colors]) => <g key={material}>
          <radialGradient id={`${id}-${material}`} cx=".28" cy=".16" r=".95"><stop stopColor={colors[0]}/><stop offset=".32" stopColor={colors[1]}/><stop offset=".77" stopColor={colors[2]}/><stop offset="1" stopColor={colors[3]}/></radialGradient>
          <linearGradient id={`${id}-${material}-side`} x1="0" y1="0" x2=".75" y2="1"><stop stopColor={colors[2]}/><stop offset="1" stopColor={colors[3]}/></linearGradient>
        </g>)}
        <linearGradient id={`${id}-metal`} x1=".1" y1="0" x2=".85" y2="1"><stop stopColor="#fff9d6"/><stop offset=".22" stopColor="#ffdc66"/><stop offset=".43" stopColor="#e5a020"/><stop offset=".53" stopColor="#fff3ac"/><stop offset=".7" stopColor="#ffc936"/><stop offset="1" stopColor="#ab6110"/></linearGradient>
        <radialGradient id={`${id}-glass`} cx=".3" cy=".22" r=".9"><stop stopColor="#bceeff"/><stop offset=".3" stopColor="#368cc8"/><stop offset=".7" stopColor="#175483"/><stop offset="1" stopColor="#123855"/></radialGradient>
        <radialGradient id={`${id}-shadow`}><stop stopColor="#15344e" stopOpacity=".28"/><stop offset=".6" stopColor="#15344e" stopOpacity=".13"/><stop offset="1" stopColor="#15344e" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="82" cy="136" rx="67" ry="11" fill={paint('shadow')} />
      {kind === 'cubes' && <>{cube(26, 86, 'mint')}{cube(77, 86, 'gold')}{cube(51, 41, 'blue')}</>}
      {kind === 'book' && <g strokeLinejoin="round">
        <path d="M25 46 77 56 139 35v81l-62 21-52-14Z" fill={paint('blue-side')} />
        <path d="M23 35 77 46 137 28v77l-60 19-54-13Z" fill={paint('blue')} stroke="#79d8ff" strokeWidth="1.5" />
        <path d="m28 42 49 11 55-19v69l-55 19-49-12Z" fill={paint('paper-side')}/>
        <path d="m29 105 48 12 55-18m-102 10 47 12 54-18" fill="none" stroke="#94b2ce" strokeWidth="1.2"/>
        <path d="M30 34q24-10 47 6 24-24 52-16v72q-28-8-52 17-24-17-47-7Z" fill={paint('paper')} />
        <path d="M77 41v70q-5-9-9-12V37Z" fill="#7d9dbf" opacity=".22"/>
        <path d="M77 41v70" stroke="#7d9dbf" strokeWidth="1.8" />
        <path d="m40 53 24 5m-24 9 24 5m-24 9 24 5m25-33 27-8m-27 23 27-8m-27 23 19-6" stroke="#6b94bb" strokeWidth="3" strokeLinecap="round" />
        <path d="m103 29 12-4v38l-6-5-6 9Z" fill={paint('pink')} />
        <path d="m25 117 52 13 61-21" fill="none" stroke="#6ad6ff" strokeWidth="2" strokeLinecap="round"/>
        <path d="m32 29 8-1 14 2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      </g>}
      {kind === 'compass' && <>
        <circle cx="80" cy="25" r="12" fill="none" stroke="#9c6216" strokeWidth="7"/><circle cx="80" cy="23" r="11" fill="none" stroke={paint('metal')} strokeWidth="5"/>
        <circle cx="80" cy="86" r="51" fill={paint('gold-side')} />
        <circle cx="80" cy="78" r="51" fill={paint('metal')} stroke="#ffed9b" strokeWidth="1.5" />
        <circle cx="80" cy="78" r="41" fill={paint('glass')} stroke="#8f5818" strokeWidth="2" />
        <path d="M80 42v8m36 28h-8M80 114v-8M44 78h8m11-24 4 4m46-4-4 4m4 44-4-4m-46 4 4-4" stroke="#c8eaff" strokeWidth="2" strokeLinecap="round" />
        <path d="m100 54-9 37-25 20 9-37Z" fill="#0b2d48" opacity=".45"/>
        <path d="m97 50-9 37-25 20 9-37Z" fill={paint('paper')} />
        <path d="m97 50-9 37-16-17Z" fill={paint('pink')} />
        <circle cx="80" cy="78" r="6" fill={paint('metal')} />
        <path d="M43 66a38 38 0 0 1 42-25" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="4" strokeLinecap="round"/>
        <path d="M36 55a48 48 0 0 1 46-24" fill="none" stroke="#fff7d0" strokeWidth="2.3" strokeLinecap="round"/>
      </>}
      {kind === 'treasure' && <>
        <path d="m25 74 52 10 58-13v48l-58 17-52-11Z" fill={paint('violet-side')}/>
        <path d="m25 69 52 10 58-13v44l-58 17-52-11Z" fill={paint('violet')} stroke="#f4d781" strokeWidth="1.5" />
        <path d="m77 79 58-13v44l-58 17Z" fill={paint('violet-side')}/>
        <path d="m30 83 41 8m-41 7 41 8m14-17 43-11m-43 25 43-11" stroke="#542992" strokeWidth="1.3" opacity=".5"/>
        <path d="M27 62q3-36 49-36 43 0 58 30l-57 17Z" fill={paint('metal')} stroke="#fff0b6" strokeWidth="1.5" />
        <path d="M39 57q9-22 38-21 26 0 42 17l-42 11Z" fill={paint('violet-side')} />
        <path d="M41 53q10-18 35-16 20 0 34 10" fill="none" stroke="#ba8bff" strokeWidth="3"/>
        <path d="m52 54 12-18 17 17-15 21Z" fill={paint('blue')} stroke="#d5f4ff" strokeWidth="2" />
        <path d="m64 36 2 38 15-21Z" fill="#0872d8"/><path d="m64 36-12 18 14 2Z" fill="#bbf4ff"/>
        <ellipse cx="99" cy="55" rx="13" ry="7" fill="#a66b18"/><ellipse cx="99" cy="52" rx="13" ry="7" fill={paint('metal')} stroke="#fff4b7" strokeWidth="1.5" />
        <path d="m77 80 14-3v24l-14 4Z" fill={paint('metal')} /><circle cx="84" cy="89" r="3" fill="#7d5d25" /><path d="M84 90v5" stroke="#7d5d25" strokeWidth="2"/>
        <path d="M44 77v42m69-46v43" stroke={paint('metal')} strokeWidth="7" />
        <path d="m29 70 47 10 55-14m-102 48 46 12" fill="none" stroke="#ffeac0" strokeWidth="1.5"/>
      </>}
      {kind === 'medal' && <>
        <path d="m44 91-5 43 23-11 12 14 8-48m36 3 5 42-22-11-13 14-8-48" fill={paint('mint')} stroke="#c6ffea" strokeWidth="2" />
        <circle cx="80" cy="75" r="48" fill={paint('gold-side')}/><circle cx="80" cy="67" r="48" fill={paint('metal')} stroke="#fff1b1" strokeWidth="1.5" />
        <circle cx="80" cy="67" r="37" fill={paint('gold-side')} stroke="#b97714" strokeWidth="1.2"/><circle cx="80" cy="65" r="35" fill={paint('gold')}/>
        <path d="m80 45 8 16 18 3-13 13 3 18-16-9-16 9 3-18-13-13 18-3Z" fill="#a66a13"/>
        <path d="m80 41 8 16 18 3-13 13 3 18-16-9-16 9 3-18-13-13 18-3Z" fill="#fff0a1" stroke="#d9981f" strokeWidth="1.1" />
        <path d="m80 41 0 26-26-7 18-3Z" fill="#fff9db"/><path d="m80 67 16 24-3-18 13-13Z" fill="#efbe48"/>
        <path d="M37 59a45 45 0 0 1 47-36" fill="none" stroke="#fff9d8" strokeWidth="2.5" strokeLinecap="round"/>
      </>}
      {kind === 'map' && <>
        <path d="m28 32 35 10 34-11 35 10v78l-35-9-34 11-35-10Z" fill={paint('paper-side')} />
        <path d="m28 25 35 10 34-11 35 10v78l-35-9-34 11-35-10Z" fill={paint('paper')} stroke="#fff" strokeWidth="1.4" />
        <path d="m63 35 34-11v79l-34 11Z" fill="#cddfed"/><path d="m66 36 27-8v73l-27 9Z" fill="#e9f3f8"/>
        <path d="M63 35v79m34-90v79" stroke="#8faac3" strokeWidth="1.3" />
        <path d="m34 88 14-30 13 16 15-22 17 25 24-21 11 35-29 8-37 10-28-8Z" fill="#7cd4ae" opacity=".35"/>
        <path d="M40 87c32 15 9-40 37-33 37 9-4 31 29 32" fill="none" stroke="#dc427f" strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" />
        <circle cx="41" cy="87" r="6" fill={paint('mint')} /><path d="m106 68 4 8 9 1-7 6 2 10-8-5-8 5 2-10-7-6 9-1Z" fill={paint('gold')} />
      </>}
      {kind === 'target' && <>
        <path d="m54 103-10 29m62-29 10 29" stroke="#163e64" strokeWidth="9" strokeLinecap="round" /><path d="m52 103-10 26m62-26 10 26" stroke="#6aa5c5" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="84" cy="76" r="49" fill={paint('pink-side')}/><circle cx="80" cy="67" r="49" fill={paint('pink')} stroke="#ffb9da" strokeWidth="1.4" />
        <circle cx="80" cy="67" r="34" fill={paint('paper')} stroke="#bf1c65" strokeOpacity=".5" strokeWidth="1.4"/><circle cx="80" cy="67" r="19" fill={paint('pink')} /><circle cx="80" cy="67" r="7" fill={paint('paper')} />
        <path d="M36 59a46 46 0 0 1 48-37" fill="none" stroke="#ffddeb" strokeWidth="2.3" strokeLinecap="round"/>
        <path d="m84 73 43-39" stroke="#7a154d" strokeOpacity=".3" strokeWidth="5" strokeLinecap="round"/>
        <path d="m81 66 43-39" stroke="#14527f" strokeWidth="5" strokeLinecap="round" /><path d="m82 65 40-36" stroke="#a6eeff" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="m114 24 15-4-1 15-11-1Z" fill={paint('mint')} stroke="#dcfff2" strokeWidth="1.2" /><path d="m117 34 12-14-1 15Z" fill={paint('mint-side')}/>
      </>}
      {kind === 'puzzle' && <>
        <path d="M33 38h35c-8 20 22 20 14 0h37v33c-20-8-20 22 0 14v35H84c8-20-22-20-14 0H33V85c20 8 20-22 0-14Z" fill={paint('violet-side')} transform="translate(5 5)" />
        <path d="M33 34h35c-8 20 22 20 14 0h37v33c-20-8-20 22 0 14v35H84c8-20-22-20-14 0H33V81c20 8 20-22 0-14Z" fill={paint('violet')} stroke="#cea8ff" strokeWidth="1.4" />
        <path d="M37 63V38h25m24 0h29v25M38 87v25h24" fill="none" stroke="#e9d6ff" strokeWidth="2.4" strokeLinecap="round"/>
        <path d="M44 47h15M45 96v9h14" stroke="#fff" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
        <path d="m128 16 3-9 4 9 9 3-9 4-4 9-3-9-9-4Z" fill={paint('gold')} />
      </>}
      {kind === 'rocket' && <g transform="rotate(24 80 77)">
        <path d="M64 102q-9 24 16 36 24-14 15-36" fill={paint('gold')} /><path d="M73 104q-5 15 7 22 12-9 7-22" fill="#fff4c1" />
        <path d="M61 72q-26 9-20 38l24-9m32-29q25 9 20 38l-24-9" fill={paint('pink-side')}/>
        <path d="M61 67q-26 9-20 38l24-9m32-29q25 9 20 38l-24-9" fill={paint('pink')} stroke="#ffc9e1" strokeWidth="1.2" />
        <path d="M82 18q32 27 23 77l-7 16H66l-7-16q-9-50 23-77Z" fill={paint('paper-side')}/>
        <path d="M80 15q32 27 23 77l-7 16H64l-7-16q-9-50 23-77Z" fill={paint('paper')} stroke="#ecfaff" strokeWidth="1.3" />
        <path d="M80 15q17 15 23 34H57q7-19 23-34Z" fill={paint('blue')} />
        <path d="M81 18q27 35 13 87h8l3-11q8-50-24-76Z" fill="#497aab" opacity=".18"/>
        <circle cx="80" cy="67" r="19" fill={paint('blue-side')} stroke="#b8eaff" strokeWidth="1.5"/><circle cx="80" cy="66" r="14" fill={paint('glass')} stroke="#57b7ec" strokeWidth="1.5"/>
        <path d="M70 63a11 11 0 0 1 14-7" fill="none" stroke="#e0fbff" strokeWidth="3" strokeLinecap="round"/>
        <path d="M66 102h28v10H66Z" fill={paint('violet-side')}/><path d="M66 99h28v10H66Z" fill={paint('violet')} />
        <path d="M62 77q-2 9 0 15M68 32q-5 6-7 11" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
      </g>}
    </svg>
  </span>;
}

