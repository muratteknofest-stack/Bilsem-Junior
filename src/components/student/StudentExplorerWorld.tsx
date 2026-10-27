import { useId } from 'react';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { sound } from '../../lib/sound';
import './student-explorer-world.css';

/** Decorative, local game scenery. It never represents earned items or saved progress. */
export function StudentExplorerScene() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const paint = (name: string) => `url(#${id}-${name})`;
  return <div className="bj-explorer-scene" aria-hidden="true">
    <div className="bj-explorer-islands">
      <svg viewBox="0 0 600 320" focusable="false">
        <defs>
          <linearGradient id={`${id}-grass`} x2=".2" y2="1"><stop stopColor="#c7fa7c"/><stop offset=".5" stopColor="#73d95c"/><stop offset="1" stopColor="#2eaf79"/></linearGradient>
          <linearGradient id={`${id}-rock`} x2=".2" y2="1"><stop stopColor="#ccabff"/><stop offset=".45" stopColor="#9585db"/><stop offset="1" stopColor="#5f64b1"/></linearGradient>
          <linearGradient id={`${id}-water`} x2=".2" y2="1"><stop stopColor="#d0fbff"/><stop offset=".4" stopColor="#74dcf4"/><stop offset="1" stopColor="#47aee000"/></linearGradient>
          <linearGradient id={`${id}-leaf`} x2=".7" y2="1"><stop stopColor="#c1ff9b"/><stop offset=".6" stopColor="#5dd39d"/><stop offset="1" stopColor="#2ba497"/></linearGradient>
          <linearGradient id={`${id}-roof`} x2=".6" y2="1"><stop stopColor="#dcbaff"/><stop offset="1" stopColor="#9263dd"/></linearGradient>
          <linearGradient id={`${id}-gold`} x2=".5" y2="1"><stop stopColor="#fff5aa"/><stop offset=".5" stopColor="#ffda68"/><stop offset="1" stopColor="#e4aa40"/></linearGradient>
          <linearGradient id={`${id}-gem`} x2=".6" y2="1"><stop stopColor="#e1ffff"/><stop offset=".5" stopColor="#65d9f7"/><stop offset="1" stopColor="#4587d8"/></linearGradient>
        </defs>
        {/* Clouds and distant floating rocks give the scene depth without a WebGL runtime. */}
        <g fill="#fff" opacity=".78"><path d="M33 81c-5-16 16-27 27-17 7-25 46-21 49 4 21-7 32 18 12 23H44Z"/><path d="M431 45c-3-15 15-22 24-13 4-21 35-23 42 0 17-8 29 16 11 21h-65Z"/></g>
        <g fill="#a3c4ec" opacity=".45"><path d="m88 272 20-10 21 10-21 23Z"/><path d="m497 248 20-9 15 9-17 23Z"/></g>
        <ellipse cx="308" cy="293" rx="176" ry="17" fill="#628eb4" opacity=".12"/>
        {/* A layered, beveled main island. */}
        <path d="M128 188c20-48 246-64 307-3l-23 56-78 38-87-7-77-33Z" fill={paint('rock')}/>
        <path d="m143 200 27 39 77 33-23-64Z" fill="#b7a0ee"/>
        <path d="m224 208 23 64 87 7-37-61Z" fill="#8b80cf"/>
        <path d="m297 218 37 61 78-38 23-56Z" fill="#6a75bb"/>
        <path d="m247 272 14-35 36-19 37 61Z" fill="#9e96dc" opacity=".7"/>
        <ellipse cx="281" cy="185" rx="155" ry="56" fill="#248f75"/>
        <ellipse cx="281" cy="176" rx="155" ry="55" fill={paint('grass')}/>
        <path d="M136 168c34-51 232-64 287 1" fill="none" stroke="#deffb3" strokeWidth="5" strokeLinecap="round"/>
        <path d="M148 187c45 6 71-38 109-31s24 44 76 36 58-34 89-34" fill="none" stroke="#53b97c" strokeWidth="28" strokeLinecap="round"/>
        <path d="M148 182c45 6 71-38 109-31s24 44 76 36 58-34 89-34" fill="none" stroke="#ffe9a6" strokeWidth="22" strokeLinecap="round"/>
        <path d="M151 181c48 3 71-36 107-29s24 43 76 34 55-32 85-33" fill="none" stroke="#fff6d3" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 11"/>
        {/* Waterfall, stepping stones and tiny flowers. */}
        <path d="M162 199q18 13 36 2l-3 73q-21 17-38-2Z" fill={paint('water')}/>
        <path d="M171 211v45m14-40v52" stroke="#e0fcff" strokeWidth="3" opacity=".7" strokeLinecap="round"/>
        <g fill="#f3f3cf"><ellipse cx="216" cy="174" rx="10" ry="5"/><ellipse cx="237" cy="167" rx="9" ry="5"/><ellipse cx="356" cy="176" rx="9" ry="5"/></g>
        <g fill="#fff4d1"><circle cx="204" cy="202" r="3"/><circle cx="211" cy="200" r="2"/><circle cx="368" cy="204" r="3"/><circle cx="377" cy="202" r="2"/></g>
        {/* Three dimensional trees. */}
        {[{x:163,y:128,s:1},{x:367,y:128,s:.82},{x:406,y:179,s:.6}].map(({x,y,s})=><g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <ellipse cy="29" rx="23" ry="7" fill="#178c6e" opacity=".2"/>
          <path d="M-4-5h9v33q-4 5-9 0Z" fill="#aa7e5f"/>
          <path d="m1 12 11-9" stroke="#aa7e5f" strokeWidth="5" strokeLinecap="round"/>
          <circle cy="-10" r="27" fill={paint('leaf')}/><circle cx="-11" cy="-19" r="12" fill="#d0ffaf" opacity=".5"/>
          <ellipse cx="18" cy="-1" rx="14" ry="16" fill="#3cbb98"/>
        </g>)}
        {/* A little learning tower on a separate island. */}
        <ellipse cx="95" cy="179" rx="55" ry="16" fill="#7e71bd" opacity=".12"/>
        <path d="m42 142 13 25 41 19 40-27 11-23Z" fill={paint('rock')}/>
        <ellipse cx="95" cy="137" rx="53" ry="21" fill="#349f98"/>
        <ellipse cx="95" cy="131" rx="53" ry="21" fill={paint('grass')}/>
        <path d="m75 94 22-10 22 10v33l-22 12-22-12Z" fill="#e6e8ff"/>
        <path d="m97 84 22 10v33l-22 12Z" fill="#b8b8ef"/>
        <path d="m67 93 29-35 31 34-29 16Z" fill={paint('roof')}/>
        <path d="m96 58 31 34-29 16Z" fill="#9670d9"/>
        <path d="M89 122v-11a8 8 0 0 1 16 0v12l-8 5Z" fill="#8077c2"/>
        <path d="m82 98 5 3v10l-5-3Zm28 1 5-3v10l-5 3Z" fill="#ffeeb1"/>
        <path d="M96 58V38" stroke="#7f6bab" strokeWidth="3"/>
        <path d="m97 38 21 5-21 9Z" fill="#ffbb79"/>
        {/* A glowing game portal on the right island. */}
        <path d="m447 121 17 25 49 17 37-27 9-23Z" fill={paint('rock')}/>
        <ellipse cx="503" cy="115" rx="56" ry="22" fill="#3b9b9c"/>
        <ellipse cx="503" cy="109" rx="56" ry="22" fill={paint('grass')}/>
        <ellipse cx="500" cy="106" rx="29" ry="10" fill="#5cbca3"/>
        <path d="M476 104V72a24 24 0 0 1 48 0v32" stroke="#b092ef" strokeWidth="13" fill="none"/>
        <path d="M476 101V72a24 24 0 0 1 48 0v29" stroke="#ece0ff" strokeWidth="6" fill="none"/>
        <path d="M485 101V74a15 15 0 0 1 30 0v27Z" fill="#bcddff" opacity=".6"/>
        <path d="m500 67 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#fffbe0"/>
        {/* Soft stepping trails connect the scenery; they are not progress indicators. */}
        <path d="m132 141 28 3m263-2 34-16" stroke="#fdf4c4" strokeWidth="6" strokeDasharray="2 10" strokeLinecap="round"/>
        {/* The guide stands on a tangible golden stage. */}
        <ellipse cx="295" cy="171" rx="47" ry="17" fill="#2f9c76" opacity=".3"/>
        <path d="M254 156v13c0 21 83 21 83 0v-13Z" fill="#d3a347"/>
        <ellipse cx="295" cy="156" rx="42" ry="15" fill={paint('gold')}/>
        <ellipse cx="295" cy="154" rx="35" ry="11" fill="#fff7c4" stroke="#efc758" strokeWidth="2"/>
        {/* Faceted, decorative gems. */}
        <g transform="translate(206 78) rotate(-12)"><path d="m0-16 15 9v18L0 20l-15-9V-7Z" fill={paint('gem')}/><path d="M0-16v36L-15-7Z" fill="#a4f3ff"/><path d="M0-16 15-7 0 2-15-7Z" fill="#e1ffff"/><path d="M0 2v18l15-9V-7Z" fill="#58b6e6"/></g>
        <g transform="translate(390 64) rotate(12)"><path d="m0-13 13 7v15L0 16l-13-7V-6Z" fill="#b7a1f5"/><path d="m0-13 13 7L0 2-13-6Z" fill="#ede2ff"/><path d="M0 2v14l13-7V-6Z" fill="#8c73d4"/></g>
        <g fill="#fff5be"><path d="m155 42 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="m427 91 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/><circle cx="352" cy="42" r="3"/></g>
      </svg>
      <img className="bj-explorer-guide" src="/brand/junior-fox.svg" alt="" width={160} height={160} decoding="async"/>
    </div>
    <span className="bj-explorer-orbit bj-explorer-orbit-one">✦</span><span className="bj-explorer-orbit bj-explorer-orbit-two">✧</span>
  </div>;
}

export function StudentExplorerPortal({ onLessons }: { onLessons: () => void }) {
  return <section className="bj-explorer-portal bj-game-lesson-portal" aria-label="Junior ile keşif adası" data-motion-zone>
    <div className="bj-explorer-portal-copy">
      <span className="bj-explorer-eyebrow"><Sparkles size={13} aria-hidden="true"/> JUNIOR'UN KEŞİF ADASI</span>
      <h2>Birlikte keşfedelim!</h2>
      <p>Önce kuralı öğren,<br/>sonra oyunlarda kendini dene.</p>
      <button type="button" className="bj-game-portal-button" onClick={()=>{sound.playClick();onLessons();}}><Play size={15} aria-hidden="true"/>Konu Anlatımları<ArrowRight size={15} aria-hidden="true"/></button>
    </div>
    <StudentExplorerScene/>
    <div className="bj-explorer-route" aria-label="Öğrenme yolculuğu"><span><b>1</b> Öğren</span><i aria-hidden="true"/><span><b>2</b> Dene</span><i aria-hidden="true"/><span><b>3</b> Güçlen</span></div>
  </section>;
}
