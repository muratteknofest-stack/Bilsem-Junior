import { useId } from 'react';

export const STORY_SCENE_TITLES: Record<string, string> = {
  forest: 'Orman rotası', valley: 'Rüzgâr vadisi', sky: 'Bulut adaları',
  cave: 'Kristal mağara', harbor: 'Keşif limanı', stars: 'Yıldız üssü',
};

const PALETTES: Record<string, { sky: string; horizon: string; ground: string; edge: string; leaf: string; light: string }> = {
  forest: { sky:'#a3e6f4',horizon:'#e8fcf1',ground:'#9de779',edge:'#3eb289',leaf:'#65cfa4',light:'#e2ffb0' },
  valley: { sky:'#c4dcff',horizon:'#fff0dc',ground:'#c6e998',edge:'#66b38e',leaf:'#a5d88b',light:'#f5ffcf' },
  sky: { sky:'#a7d6ff',horizon:'#eef3ff',ground:'#b1e9ef',edge:'#5ba8d0',leaf:'#a0d8ee',light:'#edfcff' },
  cave: { sky:'#514387',horizon:'#a79acd',ground:'#b4a2ed',edge:'#7164b3',leaf:'#bca5f1',light:'#e6d5ff' },
  harbor: { sky:'#9ddde9',horizon:'#edfff1',ground:'#b0e8d2',edge:'#41a5ae',leaf:'#75cebc',light:'#e7ffcb' },
  stars: { sky:'#31396f',horizon:'#8078b5',ground:'#acb5ee',edge:'#6977be',leaf:'#aba5e8',light:'#e0e3ff' },
};

/** Original vector scenery, with six biomes; decorative rather than a progress map. */
export function StudentStoryScene({ scene = 'forest' }: { scene?: string }) {
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const paint=(name:string)=>`url(#${id}-${name})`;
  const colors=PALETTES[scene]||PALETTES.forest;
  const night=scene==='stars'||scene==='cave';
  return <span className="bj-game-landscape bj-story-scene" data-story-biome={scene} aria-hidden="true"><svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid slice" focusable="false">
    <defs>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor={colors.sky}/><stop offset="1" stopColor={colors.horizon}/></linearGradient>
      <linearGradient id={`${id}-grass`} x2=".4" y2="1"><stop stopColor={colors.light}/><stop offset=".5" stopColor={colors.ground}/><stop offset="1" stopColor={colors.edge}/></linearGradient>
      <linearGradient id={`${id}-rock`} x2=".4" y2="1"><stop stopColor="#c4acec"/><stop offset=".5" stopColor="#9b8ac7"/><stop offset="1" stopColor="#626ea8"/></linearGradient>
      <linearGradient id={`${id}-leaf`} x2=".7" y2="1"><stop stopColor={colors.light}/><stop offset=".6" stopColor={colors.leaf}/><stop offset="1" stopColor={colors.edge}/></linearGradient>
      <linearGradient id={`${id}-water`} x2="0" y2="1"><stop stopColor="#c2ffff"/><stop offset=".5" stopColor="#71d7ee"/><stop offset="1" stopColor="#54b3dc00"/></linearGradient>
      <linearGradient id={`${id}-roof`} x2=".4" y2="1"><stop stopColor="#e5b8ff"/><stop offset="1" stopColor="#9874d4"/></linearGradient>
      <linearGradient id={`${id}-gem`} x2=".5" y2="1"><stop stopColor="#effbff"/><stop offset=".5" stopColor="#a5dcff"/><stop offset="1" stopColor="#8d8be8"/></linearGradient>
    </defs>
    <path d="M0 0h600v220H0Z" fill={paint('sky')}/>
    {night?<g fill="#fff0c0"><path d="M522 23a23 23 0 1 0 19 36 23 23 0 0 1-19-36Z"/>{[80,138,205,318,408,465,563].map((x,n)=><path key={x} d={`m${x} ${15+(n%3)*18} 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z`} opacity={n%2?.5:1}/>)}</g>:<circle cx="522" cy="32" r="21" fill="#fff3c5"/>}
    <g fill="#fff" opacity={night?.15:.7}><path d="M39 57c-4-16 15-22 25-13 6-22 37-21 43 1 17-4 25 15 9 20H47Z"/><path d="M415 39c-4-12 11-20 20-12 8-21 34-18 38 2 15-5 25 12 10 18h-59Z"/></g>
    <path d="M0 143 86 69l66 48 96-79 87 78 109-61 156 96v69H0Z" fill={night?'#7b70a8':'#acd0de'} opacity=".55"/>
    <path d="m213 67 35-29 37 33-26-8-12 12-12-12Z" fill="#fff" opacity=".6"/>
    <ellipse cx="357" cy="207" rx="166" ry="10" fill="#5373a6" opacity=".17"/>
    <path d="M185 142c32-39 259-50 334-8l-20 42-79 32-111-3-96-32Z" fill={paint('rock')}/>
    <path d="m195 145 18 28 96 32-19-54Z" fill="#b5a0df"/>
    <path d="m290 151 19 54 111 3-36-48Z" fill="#9083c2"/>
    <path d="m384 160 36 48 79-32 20-42Z" fill="#6676ad"/>
    <ellipse cx="351" cy="135" rx="169" ry="48" fill={colors.edge}/>
    <ellipse cx="351" cy="128" rx="169" ry="47" fill={paint('grass')}/>
    <path d="M197 115c55-41 236-39 308 2" stroke={colors.light} strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M234 149c27-33 87 16 116-16s91-4 116-28" fill="none" stroke={colors.edge} strokeWidth="23" opacity=".4" strokeLinecap="round"/>
    <path d="M234 145c27-33 87 16 116-16s91-4 116-28" fill="none" stroke="#ffebbb" strokeWidth="17" strokeLinecap="round"/>
    <path d="M234 145c27-33 87 16 116-16s91-4 116-28" fill="none" stroke="#fff9df" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round"/>
    <path d="m218 159 28 4-3 47q-16 8-29-4Z" fill={paint('water')}/><path d="m226 169-1 25m12-22-1 31" stroke="#e4ffff" strokeWidth="2" opacity=".7" strokeLinecap="round"/>
    {[{x:230,y:98,s:.8},{x:466,y:113,s:.83},{x:493,y:132,s:.55}].map(({x,y,s})=><g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cy="20" rx="22" ry="6" fill={colors.edge} opacity=".3"/><path d="M-3-4h7v25l-7 2Z" fill="#ad8b70"/>
      <circle cy="-10" r="23" fill={paint('leaf')}/><ellipse cx="-7" cy="-18" rx="11" ry="9" fill={colors.light} opacity=".6"/>
    </g>)}
    <g fill={colors.light}><ellipse cx="309" cy="158" rx="7" ry="3"/><ellipse cx="403" cy="149" rx="9" ry="3"/><circle cx="270" cy="123" r="3"/><circle cx="279" cy="121" r="2"/></g>
    {scene==='cave'?<g>
      <path d="m334 102 12-52 17 8 12 53-19 10Z" fill={paint('gem')} stroke="#e6dcff" strokeWidth="2"/><path d="m346 50 10 71 7-63Z" fill="#d9bdff"/>
      <path d="m382 116 8-39 15-9 19 46-20 9Z" fill="#c7a7f1" stroke="#f1e3ff" strokeWidth="2"/><path d="m390 77 14 46 1-55Z" fill="#9d8be1"/>
      <path d="m302 119 7-28 12-5 10 34-15 6Z" fill="#b8e6ff" stroke="#e4fbff" strokeWidth="2"/>
      <path d="m351 34 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#fff3c5"/>
    </g>:scene==='stars'?<g>
      <ellipse cx="367" cy="122" rx="44" ry="13" fill="#727cc1"/><ellipse cx="367" cy="117" rx="44" ry="13" fill="#e5defb"/>
      <path d="m346 113 8-22h28l7 22Z" fill="#a8badc"/><path d="M370 94V64" stroke="#e5ebff" strokeWidth="6" strokeLinecap="round"/>
      <g transform="rotate(-25 370 64)"><path d="M346 51h47v22h-47Z" fill={paint('gem')} stroke="#e2ecff" strokeWidth="2"/><ellipse cx="393" cy="62" rx="6" ry="11" fill="#6b80bb"/><path d="M346 56h-11v12h11Z" fill="#c9b3e7"/></g>
      <path d="m363 92-19 29m29-27 20 26" stroke="#e6e2fa" strokeWidth="4" strokeLinecap="round"/>
      <path d="m409 58 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#fff0bb"/>
    </g>:scene==='harbor'?<g>
      <path d="m354 120 6-53h25l7 52-19 8Z" fill="#fff3d3"/><path d="m360 67 25 0-1 12h-25Zm-4 28h32l2 12h-35Z" fill="#f19c93"/>
      <path d="M355 64h35l-17-17Z" fill={paint('roof')}/><path d="M363 64v-8h20v8Z" fill="#ffeb9e"/>
      <path d="m411 137 12 10 32-5 13-17Z" fill="#8c88c2"/><path d="M439 127V89" stroke="#e9e8dc" strokeWidth="3"/><path d="m442 91 23 29-23 4Z" fill="#fff3c6"/><path d="m436 98-18 26 18 1Z" fill="#c7edff"/>
      <path d="m405 151 52-4m-36 10 32-2" stroke="#ccf8ff" strokeWidth="3" strokeLinecap="round"/>
    </g>:scene==='valley'?<g>
      <path d="m349 120 7-48h34l8 48-24 10Z" fill="#fff1d5"/><path d="m349 72 23-23 26 22-25 10Z" fill={paint('roof')}/>
      <path d="M365 120v-13a8 8 0 0 1 16 0v17Z" fill="#ac8eb7"/>
      <g transform="translate(373 74) rotate(-18)"><path d="M-3-33h9v27h-9Zm8 29h27v9H5ZM-5 4h9v28h-9ZM-33-5h27v9h-27Z" fill="#fff9de" stroke="#dbbdae" strokeWidth="1.5"/><circle r="6" fill="#c59ad8" stroke="#f7deed" strokeWidth="2"/></g>
    </g>:scene==='sky'?<g>
      <ellipse cx="370" cy="119" rx="38" ry="11" fill="#7ba4cc"/><path d="M338 112V91a32 32 0 0 1 64 0v21l-32 14Z" fill="#e5e8ff"/>
      <path d="M338 91a32 32 0 0 1 64 0Z" fill={paint('roof')} stroke="#efdaff" strokeWidth="2"/><path d="M365 69h10v20h-10Z" fill="#f7e8ff"/>
      <path d="M362 120v-15a8 8 0 0 1 16 0v16Z" fill="#9aa4d5"/>
      <g transform="translate(480 41)"><path d="M-17 0a18 18 0 1 1 34 0L7 17H-7Z" fill="#ffd996"/><path d="M0-25c-11 8-12 26-4 42h8C12 0 11-17 0-25Z" fill="#ffb8b3"/><path d="M-6 23h12v8h-12Z" fill="#b49ac8"/><path d="m-7 16 1 7m13-7-1 7" stroke="#987eab" strokeWidth="2"/></g>
    </g>:<g>
      <path d="M346 87h49v34l-23 10-26-10Z" fill="#fff0d0"/><path d="m372 93 23-6v34l-23 10Z" fill="#ead4bb"/>
      <path d="m337 88 33-30 34 28-32 13Z" fill={paint('roof')} stroke="#eddaff" strokeWidth="2"/>
      <path d="M364 124v-14a8 8 0 0 1 16 0v17Z" fill="#a58ac4"/>
      <path d="m352 95 7 3v10l-7-3Zm33 4 6-3v10l-6 3Z" fill="#fff7b1"/>
      <path d="M405 75v42" stroke="#b39bc8" strokeWidth="3"/><path d="m407 76 22 8-22 7Z" fill="#ffcf7e"/>
    </g>}
    <path d="m121 164 23-8 23 8-5 18-20 11-16-13Z" fill={paint('rock')}/><ellipse cx="144" cy="161" rx="24" ry="8" fill={paint('grass')}/>
    <path d="m542 128 18-7 20 7-4 15-16 8-14-10Z" fill={paint('rock')}/><ellipse cx="560" cy="125" rx="19" ry="7" fill={paint('grass')}/>
    <path d="m540 76 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#fff3be"/>
  </svg></span>;
}
