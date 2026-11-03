import React, { createContext, useContext, useId } from 'react';
import type { QuestionType } from '../../types';

// Vivid, high-contrast, crystal-clear 3D studio palette
export const C = {
  blue: '#257bf4',
  blueLight: '#8ec0ff',
  blueDark: '#0e46a8',
  yellow: '#fca311',
  yellowLight: '#fed976',
  yellowDark: '#b86200',
  pink: '#f43f7a',
  pinkLight: '#ffa5c5',
  pinkDark: '#a31045',
  green: '#10b981',
  greenLight: '#8df4ce',
  greenDark: '#046c4e',
  purple: '#8b5cf6',
  purpleLight: '#d2baff',
  purpleDark: '#4f1ca8',
  cyan: '#06b6d4',
  cyanLight: '#8cf1ff',
  cyanDark: '#0c667a',
  ice: '#e8f3fc',
  ink: '#11293d',
  gold: '#ffb703',
  white: '#ffffff'
};

const ScenePaint = createContext('lesson');
const tones: Array<[string, string, string, string]> = [
  ['blue', C.blue, C.blueLight, C.blueDark],
  ['yellow', C.yellow, C.yellowLight, C.yellowDark],
  ['pink', C.pink, C.pinkLight, C.pinkDark],
  ['green', C.green, C.greenLight, C.greenDark],
  ['purple', C.purple, C.purpleLight, C.purpleDark],
  ['cyan', C.cyan, C.cyanLight, C.cyanDark],
  ['ice', C.ice, '#ffffff', '#c5d9e8'],
  ['ink', C.ink, '#2b506e', '#091824'],
];

function shade(color: string, amount: number) {
  return /^#[0-9a-f]{6}$/i.test(color)
    ? '#' + [1, 3, 5].map(n => Math.max(0, Math.min(255, Math.round(parseInt(color.slice(n, n + 2), 16) * amount))).toString(16).padStart(2, '0')).join('')
    : C.ink;
}

/** 3D materials with directional studio lighting, specular shine, rim reflection, and soft drop shadows */
function SceneMaterials({ prefix }: { prefix: string }) {
  return (
    <defs>
      {/* 3D Drop Shadow Filter */}
      <filter id={prefix + '-shadow-3d'} x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor={C.ink} floodOpacity="0.22" />
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor={C.ink} floodOpacity="0.14" />
      </filter>

      {/* 3D Floating Glow Filter */}
      <filter id={prefix + '-glow-3d'} x="-35%" y="-35%" width="170%" height="170%">
        <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#38bdf8" floodOpacity="0.45" />
      </filter>

      {/* Primary Tonal Gradients */}
      {tones.map(([name, base, light, dark]) => (
        <React.Fragment key={name}>
          {/* Radial Sphere with 3D Specular Highlight and Ground Bounce */}
          <radialGradient id={prefix + '-' + name + '-sphere'} cx="32%" cy="28%" r="68%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="18%" stopColor={light} />
            <stop offset="55%" stopColor={base} />
            <stop offset="88%" stopColor={dark} />
            <stop offset="100%" stopColor={shade(dark, 0.75)} />
          </radialGradient>

          {/* 3D Bevel / Cylinder Linear Gradient */}
          <linearGradient id={prefix + '-' + name + '-facet'} x1="0%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor={light} />
            <stop offset="35%" stopColor={base} />
            <stop offset="85%" stopColor={dark} />
            <stop offset="100%" stopColor={shade(dark, 0.72)} />
          </linearGradient>

          {/* Top Horizontal Highlight */}
          <linearGradient id={prefix + '-' + name + '-top'} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="40%" stopColor={light} />
            <stop offset="100%" stopColor={base} />
          </linearGradient>
        </React.Fragment>
      ))}

      {/* Ground Grid Pattern for 3D Studio Space */}
      <pattern id={prefix + '-grid'} width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#2563eb" strokeOpacity="0.05" strokeWidth="1" />
      </pattern>
    </defs>
  );
}

/** 3D Realistic Sphere with specular reflection, 3D gradient, and soft contact shadow */
function Sphere3D({ x, y, r = 24, color = C.blue }: { x: number; y: number; r?: number; color?: string }) {
  const prefix = useContext(ScenePaint);
  const tone = tones.find(([, value]) => value === color)?.[0] || 'blue';
  return (
    <g className="bj-3d-sphere" data-solid="sphere">
      {/* Contact ground shadow */}
      <ellipse cx={x} cy={y + r * 1.08} rx={r * 0.92} ry={Math.max(4, r * 0.26)} fill={C.ink} opacity={0.22} />
      {/* Sphere body */}
      <circle cx={x} cy={y} r={r} fill={`url(#${prefix}-${tone}-sphere)`} />
      {/* Glossy specular crescent highlight */}
      <ellipse
        cx={x - r * 0.3}
        cy={y - r * 0.34}
        rx={r * 0.36}
        ry={r * 0.18}
        fill="#ffffff"
        opacity={0.7}
        transform={`rotate(-28 ${x - r * 0.3} ${y - r * 0.34})`}
      />
      {/* Delicate outer specular edge */}
      <circle cx={x} cy={y} r={r} fill="none" stroke="#ffffff" strokeOpacity={0.4} strokeWidth={1} />
    </g>
  );
}

/** 3D Isometric Cube with beveled top, front-left, and front-right facets */
function IsoCube3D({
  x,
  y,
  size = 36,
  h = 36,
  color = C.blue
}: {
  x: number;
  y: number;
  size?: number;
  h?: number;
  color?: string;
}) {
  const prefix = useContext(ScenePaint);
  const tone = tones.find(([, value]) => value === color)?.[0] || 'blue';
  const dx = size;
  const dy = size * 0.54;

  const top = `${x},${y - h} ${x + dx},${y - h + dy} ${x},${y - h + dy * 2} ${x - dx},${y - h + dy}`;
  const left = `${x - dx},${y - h + dy} ${x},${y - h + dy * 2} ${x},${y + dy * 2} ${x - dx},${y + dy}`;
  const right = `${x},${y - h + dy * 2} ${x + dx},${y - h + dy} ${x + dx},${y + dy} ${x},${y + dy * 2}`;

  return (
    <g className="bj-3d-cube" data-solid="cube">
      {/* Floor shadow */}
      <polygon
        points={`${x},${y + dy * 2 + 8} ${x + dx + 6},${y + dy + 8} ${x},${y + 4} ${x - dx - 6},${y + dy + 8}`}
        fill={C.ink}
        opacity={0.2}
      />
      {/* Left Face (Midtone) */}
      <polygon points={left} fill={`url(#${prefix}-${tone}-facet)`} stroke={shade(color, 0.8)} strokeWidth={1} />
      {/* Right Face (Deep Shadow) */}
      <polygon points={right} fill={shade(color, 0.65)} stroke={shade(color, 0.55)} strokeWidth={1} />
      {/* Top Face (Bright Highlight) */}
      <polygon points={top} fill={`url(#${prefix}-${tone}-top)`} stroke="#ffffff" strokeOpacity={0.8} strokeWidth={1.5} />
      {/* Top Ridge Bevel */}
      <line x1={x - dx + 4} y1={y - h + dy} x2={x} y2={y - h + 2} stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" strokeOpacity={0.8} />
    </g>
  );
}

/** 3D Faceted Crystal Star with dimensional ridges and specular highlights */
function Star3D({ x, y, size = 26, color = C.yellow }: { x: number; y: number; size?: number; color?: string }) {
  const prefix = useContext(ScenePaint);
  const tone = tones.find(([, value]) => value === color)?.[0] || 'yellow';
  const s = size / 24;
  return (
    <g className="bj-3d-star" data-solid="star">
      {/* Ground shadow */}
      <ellipse cx={x} cy={y + size * 1.15} rx={size * 0.85} ry={size * 0.25} fill={C.ink} opacity={0.22} />
      {/* Star outer with 3D drop shadow filter */}
      <g filter={`url(#${prefix}-shadow-3d)`}>
        {/* Base Star Silhouette */}
        <path
          d="M0 -30 L9 -10 L30 -9 L14 6 L19 29 L0 18 L-19 29 L-14 6 L-30 -9 L-9 -10 Z"
          fill={`url(#${prefix}-${tone}-facet)`}
          stroke={shade(color, 0.7)}
          strokeWidth={1.5}
          transform={`translate(${x} ${y}) scale(${s})`}
        />
        {/* Faceted Light Crest (Left Rays) */}
        <path
          d="M0 0 L0 -30 L9 -10 Z M0 0 L30 -9 L14 6 Z M0 0 L19 29 L0 18 Z M0 0 L-19 29 L-14 6 Z M0 0 L-30 -9 L-9 -10 Z"
          fill={`url(#${prefix}-${tone}-top)`}
          opacity={0.85}
          transform={`translate(${x} ${y}) scale(${s})`}
        />
        {/* Faceted Shadow Crest (Right Rays) */}
        <path
          d="M0 0 L0 -30 L-9 -10 Z M0 0 L-30 -9 L-14 6 Z M0 0 L-19 29 L0 18 Z"
          fill={shade(color, 0.65)}
          opacity={0.35}
          transform={`translate(${x} ${y}) scale(${s})`}
        />
        {/* Central Brilliant Sparkle */}
        <circle cx={x} cy={y - 2} r={Math.max(2, size * 0.12)} fill="#ffffff" opacity={0.85} />
      </g>
    </g>
  );
}

/** 3D Extruded Cylinder with metallic curve shading and circular cap */
function Cylinder3D({
  x,
  y,
  r = 24,
  h = 32,
  color = C.yellow
}: {
  x: number;
  y: number;
  r?: number;
  h?: number;
  color?: string;
}) {
  const prefix = useContext(ScenePaint);
  const tone = tones.find(([, value]) => value === color)?.[0] || 'yellow';
  const ry = r * 0.38;
  return (
    <g className="bj-3d-cylinder" data-solid="cylinder">
      {/* Ground shadow */}
      <ellipse cx={x} cy={y + h + ry + 4} rx={r * 1.05} ry={ry * 1.15} fill={C.ink} opacity={0.2} />
      {/* Cylinder body */}
      <path
        d={`M ${x - r} ${y} v ${h} a ${r} ${ry} 0 0 0 ${r * 2} 0 v -${h} Z`}
        fill={`url(#${prefix}-${tone}-facet)`}
        stroke={shade(color, 0.75)}
        strokeWidth={1}
      />
      {/* Lower rim curve */}
      <path
        d={`M ${x - r} ${y + h} a ${r} ${ry} 0 0 0 ${r * 2} 0`}
        fill="none"
        stroke={shade(color, 0.6)}
        strokeWidth={1.5}
      />
      {/* Top cap ellipse */}
      <ellipse
        cx={x}
        cy={y}
        rx={r}
        ry={ry}
        fill={`url(#${prefix}-${tone}-top)`}
        stroke="#ffffff"
        strokeOpacity={0.8}
        strokeWidth={1.5}
      />
      {/* Specular highlight on cap */}
      <ellipse cx={x - r * 0.28} cy={y - ry * 0.2} rx={r * 0.38} ry={ry * 0.32} fill="#ffffff" opacity={0.65} />
    </g>
  );
}

/** 3D Triangular Wedge / Prism */
function Prism3D({ x, y, size = 26, color = C.pink }: { x: number; y: number; size?: number; color?: string }) {
  const prefix = useContext(ScenePaint);
  const tone = tones.find(([, value]) => value === color)?.[0] || 'pink';
  const s = size;
  return (
    <g className="bj-3d-prism" data-solid="prism">
      {/* Ground shadow */}
      <ellipse cx={x} cy={y + s + 8} rx={s * 0.95} ry={s * 0.28} fill={C.ink} opacity={0.22} />
      {/* Extruded bottom facet */}
      <polygon
        points={`${x},${y - s} ${x + s},${y + s} ${x - s},${y + s}`}
        fill={shade(color, 0.62)}
        transform="translate(0 6)"
      />
      {/* Front Face with 3D gradient */}
      <polygon
        points={`${x},${y - s} ${x + s},${y + s} ${x - s},${y + s}`}
        fill={`url(#${prefix}-${tone}-facet)`}
        stroke="#ffffff"
        strokeOpacity={0.7}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Crest highlight line */}
      <line x1={x - s * 0.6} y1={y + s * 0.55} x2={x} y2={y - s * 0.75} stroke="#ffffff" strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}

/** 3D Beveled Floating Pedestal / Card */
function Panel3D({
  x,
  y,
  w,
  h,
  rx = 16,
  fill = '#ffffff',
  accent,
  filterId
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
  fill?: string;
  accent?: string;
  filterId?: string;
}) {
  return (
    <g className="bj-3d-panel" filter={filterId ? `url(#${filterId})` : undefined}>
      {/* Bottom extrusion depth */}
      <rect x={x} y={y + 5} width={w} height={h} rx={rx} fill="#c8dceb" opacity={0.7} />
      {/* Top glossy card face */}
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={accent || '#e2edf5'} strokeWidth={2} />
      {/* Subtle top rim specular */}
      <rect x={x + 3} y={y + 2} width={w - 6} height={h * 0.38} rx={rx - 2} fill="#ffffff" opacity={0.4} />
    </g>
  );
}

/** Unified shape dispatcher */
function shape(kind: string, x: number, y: number, color = C.blue, size = 24) {
  if (kind === 'circle') return <Sphere3D key={`${x}-${y}`} x={x} y={y} r={size} color={color} />;
  if (kind === 'triangle') return <Prism3D key={`${x}-${y}`} x={x} y={y} size={size} color={color} />;
  if (kind === 'star') return <Star3D key={`${x}-${y}`} x={x} y={y} size={size} color={color} />;
  if (kind === 'cube' || kind === 'square') return <IsoCube3D key={`${x}-${y}`} x={x} y={y} size={size * 0.9} color={color} />;
  if (kind === 'cylinder') return <Cylinder3D key={`${x}-${y}`} x={x} y={y} r={size * 0.85} color={color} />;
  return <Sphere3D key={`${x}-${y}`} x={x} y={y} r={size} color={color} />;
}

/** Enhanced typography label with embossed 3D pill badge or crisp text */
const label = (text: string, x: number, y: number, size = 20, badge = false) => {
  if (badge) {
    const pad = text.length * 6 + 18;
    return (
      <g key={`badge-${x}-${y}`} className="bj-3d-badge">
        <rect x={x - pad} y={y - size * 0.9} width={pad * 2} height={size * 1.55} rx={size * 0.75} fill="#ffffff" stroke="#cde3f3" strokeWidth={1.5} filter="drop-shadow(0 3px 6px rgba(17,41,61,0.08))" />
        <text x={x} y={y + size * 0.22} fontSize={size} textAnchor="middle" fill={C.ink} fontWeight={800} letterSpacing="-0.3px">
          {text}
        </text>
      </g>
    );
  }
  return (
    <text key={`lbl-${x}-${y}`} x={x} y={y} fontSize={size} textAnchor="middle" fill={C.ink} fontWeight={800} letterSpacing="-0.2px">
      {text}
    </text>
  );
};

export function LessonScene({
  id,
  step,
  playing,
  title
}: {
  id: QuestionType;
  step: number;
  playing: boolean;
  title: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const revealed = step >= 2;
  const paint = (color: string) => {
    const tone = tones.find(([, value]) => value === color)?.[0];
    return tone ? `url(#${uid}-${tone}-facet)` : color;
  };

  let content: React.ReactNode;

  switch (id) {
    // 1. Örüntü Dedektifi (Pattern Detective)
    case 'visual_sequence':
      content = (
        <>
          {/* Floating studio platform shadow */}
          <ellipse cx="230" cy="180" rx="195" ry="38" fill={C.ink} opacity={0.06} />

          {/* Sequence items in 3D */}
          {[0, 1, 2, 3, 4, 5].map(n => {
            const posX = 52 + n * 68;
            const posY = 118;
            const isUnknown = n === 5 && !revealed;
            const isCircle = n % 2 === 0;
            return (
              <g key={n} className="bj-lesson-pop" style={{ animationDelay: `${n * 0.12}s` }}>
                {isUnknown ? (
                  <g className="bj-3d-mystery" filter={`url(#${uid}-glow-3d)`}>
                    <ellipse cx={posX} cy={posY + 26} rx={22} ry={7} fill={C.ink} opacity={0.25} />
                    <circle cx={posX} cy={posY} r={24} fill={`url(#${uid}-yellow-sphere)`} stroke="#ffffff" strokeWidth={2} />
                    {label('?', posX, posY + 9, 32)}
                  </g>
                ) : (
                  shape(isCircle ? 'circle' : 'triangle', posX, posY, isCircle ? C.blue : C.yellow, 22)
                )}
              </g>
            );
          })}

          {/* Pattern group brackets */}
          <g className="bj-3d-brackets" stroke={C.green} strokeWidth={4} strokeLinecap="round" fill="none">
            <path d="M 32 168 h 105" />
            <path d="M 168 168 h 105" />
            <path d="M 304 168 h 105" strokeDasharray={revealed ? 'none' : '6 6'} />
          </g>

          {label('Tekrar eden grup: ● ▲', 230, 224, 19, true)}
        </>
      );
      break;

    // 2. Şekillerin İlişkisi (Shape Analogy / Relations)
    case 'visual_analogy':
      content = (
        <>
          {/* Card 1 Pair */}
          <Panel3D x={40} y={48} w={150} h={95} rx={18} fill="#ffffff" accent="#cfe1ee" filterId={`${uid}-shadow-3d`} />
          <Panel3D x={270} y={48} w={150} h={95} rx={18} fill="#ffffff" accent="#cfe1ee" filterId={`${uid}-shadow-3d`} />
          {label('1. ÇİFT', 115, 38, 12, true)}
          {label('90° Sağa Dönüş', 345, 38, 12, true)}

          <g className="bj-3d-arrow-up">
            <path d="M 115 120 V 74 M 98 90 L 115 72 L 132 90" stroke={C.blue} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {label('➔', 230, 102, 32)}
          <g className="bj-3d-arrow-right">
            <path d="M 322 95 H 368 M 352 78 L 370 95 L 352 112" stroke={C.blue} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Card 2 Pair */}
          <Panel3D x={40} y={170} w={150} h={95} rx={18} fill="#ffffff" accent="#cfe1ee" filterId={`${uid}-shadow-3d`} />
          <Panel3D x={270} y={170} w={150} h={95} rx={18} fill={revealed ? '#f0fdf4' : '#fff'} accent={revealed ? C.green : '#cfe1ee'} filterId={`${uid}-shadow-3d`} />
          {label('2. ÇİFT', 115, 160, 12, true)}
          {label('Yeni Kural', 345, 160, 12, true)}

          <g className="bj-3d-arrow-right">
            <path d="M 92 218 H 138 M 122 201 L 140 218 L 122 235" stroke={C.pink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {label('➔', 230, 224, 32)}

          {revealed ? (
            <g className="bj-3d-arrow-down bj-lesson-pop">
              <path d="M 345 195 V 241 M 328 225 L 345 243 L 362 225" stroke={C.green} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ) : (
            label('?', 345, 230, 36)
          )}
        </>
      );
      break;

    // 3. Küpü Keşfet (Explore the 3D Cube)
    case 'dice_unfold':
      return (
        <figure className="bj-lesson-stage bj-cube-stage" aria-label={title} data-playing={playing} data-scene-step={step}>
          <div className="bj-cube-pedestal" aria-hidden="true" />
          <div className="bj-teaching-cube">
            {['1', '2', '6', '5', '3', '4'].map((n, i) => (
              <span key={n} className={`bj-cube-face bj-cube-face-${i}`}>
                <span>{n}</span>
                <i aria-hidden="true" />
              </span>
            ))}
          </div>
          <figcaption>
            <span>✦ 6 Yüz</span>
            <span>✦ 12 Ayrıt</span>
            <span>✦ 8 Köşe</span>
          </figcaption>
        </figure>
      );

    // 4. Görsel Matris (2x2 Matrix)
    case 'matrix_2x2':
      content = (
        <>
          {[0, 1, 2, 3].map(n => {
            const posX = 85 + (n % 2) * 165;
            const posY = 45 + Math.floor(n / 2) * 115;
            const isUnknown = n === 3 && !revealed;
            return (
              <g key={n} className="bj-matrix-slot">
                <Panel3D
                  x={posX}
                  y={posY}
                  w={125}
                  h={95}
                  rx={18}
                  fill={isUnknown ? '#fffef5' : '#ffffff'}
                  accent={isUnknown ? C.yellow : '#cce2f0'}
                  filterId={`${uid}-shadow-3d`}
                />
                {isUnknown ? (
                  label('?', posX + 62, posY + 58, 42)
                ) : (
                  <>
                    {shape(n < 2 ? 'circle' : 'triangle', posX + (n % 2 ? 40 : 62), posY + 48, n < 2 ? C.cyan : C.pink, 19)}
                    {n % 2 === 1 &&
                      shape(n < 2 ? 'circle' : 'triangle', posX + 84, posY + 48, n < 2 ? C.cyan : C.pink, 19)}
                  </>
                )}
              </g>
            );
          })}
          {label('Kural: 1 nesne ➔ 2 nesne', 230, 275, 17, true)}
        </>
      );
      break;

    // 5. Aynanın Öteki Yanı (Symmetry Completion)
    case 'symmetry_completion':
      content = (
        <>
          {/* Studio floor reflection line */}
          <ellipse cx="230" cy="235" rx="180" ry="24" fill={C.ink} opacity={0.06} />

          {/* Central 3D Glass Mirror Beam */}
          <line x1="230" y1="25" x2="230" y2="235" stroke={C.cyan} strokeWidth={6} strokeLinecap="round" />
          <line x1="230" y1="25" x2="230" y2="235" stroke="#ffffff" strokeWidth={2} strokeDasharray="8 6" />

          {/* Left Figure (Faceted Castle Block) */}
          <g className="bj-3d-left-symmetry" filter={`url(#${uid}-shadow-3d)`}>
            <path d="M 205 60 H 115 V 135 H 165 V 210 H 205 Z" fill={`url(#${uid}-purple-facet)`} stroke="#ffffff" strokeWidth={2} strokeLinejoin="round" />
            <path d="M 205 60 H 125 V 80 H 205 Z" fill="#ffffff" opacity={0.35} />
          </g>

          {/* Right Symmetrical Figure */}
          <g
            className="bj-3d-right-symmetry bj-lesson-reveal"
            filter={`url(#${uid}-shadow-3d)`}
            opacity={revealed ? 1 : 0.16}
          >
            <path d="M 255 60 H 345 V 135 H 295 V 210 H 255 Z" fill={`url(#${uid}-purple-facet)`} stroke="#ffffff" strokeWidth={2} strokeLinejoin="round" />
            <path d="M 255 60 H 335 V 80 H 255 Z" fill="#ffffff" opacity={0.35} />
          </g>

          {/* Equal distance arrow */}
          <g stroke={C.green} strokeWidth={3} strokeLinecap="round">
            <line x1="165" y1="245" x2="295" y2="245" />
            <line x1="165" y1="240" x2="165" y2="250" />
            <line x1="295" y1="240" x2="295" y2="250" />
          </g>
          {label('Ayna çizgisine eşit uzaklık', 230, 275, 17, true)}
        </>
      );
      break;

    // 6. Dikkatli Gözler (Visual Attention & Detail)
    case 'visual_attention':
      content = (
        <>
          {/* Target Pedestal */}
          <Panel3D x={35} y={55} w={115} h={150} rx={18} fill="#ffffff" accent={C.blue} filterId={`${uid}-shadow-3d`} />
          {label('HEDEF', 92, 45, 13, true)}
          <Sphere3D x={92} y={120} r={36} color={C.ice} />
          <Sphere3D x={92} y={120} r={12} color={C.blue} />

          {label('Hangisi birebir aynı?', 295, 45, 13, true)}

          {/* 4 Test Options */}
          {[0, 1, 2, 3].map(n => {
            const posX = 215 + (n % 2) * 115;
            const posY = 75 + Math.floor(n / 2) * 95;
            const isMatch = n === 2;
            const shiftX = n === 0 ? 15 : n === 3 ? -15 : 0;
            const shiftY = n === 1 ? 15 : 0;
            return (
              <g key={n} className="bj-attention-item">
                <ellipse cx={posX} cy={posY + 32} rx={28} ry={8} fill={C.ink} opacity={0.16} />
                <Sphere3D x={posX} y={posY} r={28} color={revealed && isMatch ? C.green : C.ice} />
                <Sphere3D x={posX + shiftX} y={posY + shiftY} r={9} color={revealed && isMatch ? C.greenDark : C.blue} />
                {revealed && isMatch && (
                  <circle cx={posX} cy={posY} r={34} fill="none" stroke={C.green} strokeWidth={3} strokeDasharray="4 3" />
                )}
              </g>
            );
          })}
        </>
      );
      break;

    // 7. Haritada Adım Adım (Isometric Direction Path)
    case 'direction_path': {
      const stepIdx = Math.min(step, 3);
      const moves = [
        [0, 2], // Start
        [1, 2], // 1 Right
        [2, 2], // 2 Right
        [2, 0], // 2 Up (Goal)
      ];
      const cur = moves[stepIdx];
      content = (
        <>
          {/* Isometric Tile Grid (5 cols x 3 rows) */}
          <g className="bj-3d-iso-grid" transform="translate(10, 25)">
            {Array.from({ length: 15 }, (_, n) => {
              const col = n % 5;
              const row = Math.floor(n / 5);
              const tileX = 75 + col * 55 - row * 22;
              const tileY = 70 + row * 45 + col * 12;
              const isGoal = col === 2 && row === 0;
              const isStart = col === 0 && row === 2;
              return (
                <g key={n}>
                  {/* Top diamond */}
                  <polygon
                    points={`${tileX},${tileY} ${tileX + 32},${tileY + 16} ${tileX},${tileY + 32} ${tileX - 32},${tileY + 16}`}
                    fill={isGoal ? '#fef3c7' : isStart ? '#dcfce7' : '#ffffff'}
                    stroke={isGoal ? C.yellow : isStart ? C.green : '#cbdde8'}
                    strokeWidth={1.5}
                  />
                  {/* Side extrusion */}
                  <polygon
                    points={`${tileX - 32},${tileY + 16} ${tileX},${tileY + 32} ${tileX},${tileY + 40} ${tileX - 32},${tileY + 24}`}
                    fill="#b2c9d9"
                  />
                  <polygon
                    points={`${tileX},${tileY + 32} ${tileX + 32},${tileY + 16} ${tileX + 32},${tileY + 24} ${tileX},${tileY + 40}`}
                    fill="#9ab5c7"
                  />
                  {isGoal && (
                    <text x={tileX} y={tileY + 20} fontSize={16} textAnchor="middle" fill={C.yellowDark}>
                      🚩
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Stepping 3D Star Token */}
          {(() => {
            const tokenX = 85 + cur[0] * 55 - cur[1] * 22;
            const tokenY = 85 + cur[1] * 45 + cur[0] * 12;
            return (
              <g className="bj-lesson-travel" key={stepIdx} style={{ transform: `translate(${tokenX}px, ${tokenY}px)` }}>
                <Star3D x={0} y={-10} size={28} color={C.yellow} />
              </g>
            );
          })()}

          {label('➔  ➔  ⬆  ⬆', 230, 275, 22, true)}
        </>
      );
      break;
    }

    // 8. Şifre Atölyesi (Symbol Coding / Cipher)
    case 'symbol_coding':
      content = (
        <>
          {/* Top Decoder Key Header */}
          <Panel3D x={40} y={35} w={380} h={85} rx={20} fill="#ffffff" accent="#cfe1ee" filterId={`${uid}-shadow-3d`} />
          {['circle', 'triangle', 'square'].map((s, n) => {
            const posX = 100 + n * 130;
            const letters = ['A', 'B', 'C'];
            const colors = [C.blue, C.yellow, C.pink];
            return (
              <g key={s}>
                {shape(s, posX, 65, colors[n], 20)}
                {label(letters[n], posX, 105, 22)}
              </g>
            );
          })}

          {/* Message Row */}
          <line x1="50" y1="145" x2="410" y2="145" stroke="#cbdde8" strokeWidth={2} strokeDasharray="6 6" />

          {['circle', 'triangle', 'circle'].map((s, n) => {
            const posX = 100 + n * 130;
            const letters = ['A', 'B', 'A'];
            const colors = [C.blue, C.yellow, C.blue];
            return (
              <g key={n} className="bj-cipher-item">
                <Panel3D x={posX - 40} y={160} w={80} h={95} rx={16} fill="#ffffff" accent="#cfe1ee" filterId={`${uid}-shadow-3d`} />
                {shape(s, posX, 195, colors[n], 20)}
                {revealed ? (
                  <g className="bj-lesson-pop">
                    {label(letters[n], posX, 240, 24, true)}
                  </g>
                ) : (
                  label('?', posX, 242, 22)
                )}
              </g>
            );
          })}
        </>
      );
      break;

    // 9. Gölge Avcısı (Shadow Matching)
    case 'shadow_matching':
      content = (
        <>
          {/* Light projection beams */}
          <polygon points="120,70 330,85 330,195 120,195" fill="url(#light-beam)" opacity={0.12} />

          {/* Left: 3D Vivid Golden Star */}
          <Panel3D x={45} y={55} w={150} h={150} rx={22} fill="#ffffff" accent={C.yellow} filterId={`${uid}-shadow-3d`} />
          <Star3D x={120} y={130} size={46} color={C.yellow} />
          {label('3D ŞEKİL', 120, 45, 12, true)}

          {/* Light Arrow */}
          {label('IŞIK ➔', 230, 135, 18, true)}

          {/* Right: Cast 3D Silhouette */}
          <Panel3D x={265} y={55} w={150} h={150} rx={22} fill={revealed ? '#f0fdf4' : '#fff'} accent={revealed ? C.green : '#cfe1ee'} filterId={`${uid}-shadow-3d`} />
          <g filter={`url(#${uid}-shadow-3d)`}>
            <path
              d="M0 -30 L9 -10 L30 -9 L14 6 L19 29 L0 18 L-19 29 L-14 6 L-30 -9 L-9 -10 Z"
              fill={revealed ? C.ink : '#cfdbe3'}
              transform="translate(340 130) scale(1.92)"
            />
          </g>
          {label('GÖLGE', 340, 45, 12, true)}

          {label('Dış çizgi ve kenarlar aynı kalır', 230, 255, 18, true)}
        </>
      );
      break;

    // 10. Katmanların Sırrı (Layers & Spatial Depth)
    case 'spatial_relationship':
      content = (
        <>
          {/* Studio floor shadow */}
          <ellipse cx="230" cy="240" rx="170" ry="24" fill={C.ink} opacity={0.08} />

          {/* Bottom Layer 3 (Pink) */}
          <g filter={`url(#${uid}-shadow-3d)`}>
            <rect x="90" y="55" width="170" height="135" rx={24} fill={`url(#${uid}-pink-facet)`} stroke="#ffffff" strokeWidth={2} />
          </g>

          {/* Middle Layer 2 (Blue) */}
          <g filter={`url(#${uid}-shadow-3d)`}>
            <rect x="150" y="90" width="170" height="135" rx={24} fill={`url(#${uid}-blue-facet)`} stroke="#ffffff" strokeWidth={2} />
          </g>

          {/* Top Layer 1 (Yellow) */}
          <g filter={`url(#${uid}-shadow-3d)`}>
            <rect x="205" y="130" width="170" height="110" rx={24} fill={`url(#${uid}-yellow-facet)`} stroke="#ffffff" strokeWidth={2} />
          </g>

          {revealed && (
            <g className="bj-lesson-pop">
              {/* Depth order badges */}
              {label('1 (En Üstte)', 305, 190, 16, true)}
              {label('2 (Ortada)', 195, 125, 16, true)}
              {label('3 (En Altta)', 125, 80, 16, true)}
            </g>
          )}
        </>
      );
      break;

    // 11. Sözcük Köprüleri (Verbal Analogy)
    case 'verbal_analogy':
      content = (
        <>
          {/* Row 1: Kuş -> Yuva */}
          <Panel3D x={45} y={45} w={140} h={80} rx={18} fill="#ffffff" filterId={`${uid}-shadow-3d`} />
          {label('Kuş 🐦', 115, 92, 22)}

          <path d="M 195 85 H 255" stroke={C.blue} strokeWidth={6} strokeLinecap="round" strokeDasharray="8 6" />
          {label('➔', 225, 80, 24)}

          <Panel3D x={265} y={45} w={150} h={80} rx={18} fill="#ffffff" filterId={`${uid}-shadow-3d`} />
          {label('Yuva 🪹', 340, 92, 22)}

          {/* Row 2: Arı -> Kovan */}
          <Panel3D x={45} y={160} w={140} h={80} rx={18} fill="#ffffff" filterId={`${uid}-shadow-3d`} />
          {label('Arı 🐝', 115, 207, 22)}

          <path d="M 195 200 H 255" stroke={C.yellow} strokeWidth={6} strokeLinecap="round" strokeDasharray="8 6" />
          {label('➔', 225, 195, 24)}

          <Panel3D
            x={265}
            y={160}
            w={150}
            h={80}
            rx={18}
            fill={revealed ? '#f0fdf4' : '#ffffff'}
            accent={revealed ? C.green : '#cfe1ee'}
            filterId={`${uid}-shadow-3d`}
          />
          {revealed ? (
            <g className="bj-lesson-pop">{label('Kovan 🍯', 340, 207, 22)}</g>
          ) : (
            label('?', 340, 209, 32)
          )}
        </>
      );
      break;

    // 12. Yukarıdan Bak (Top View / Isometric Voxel Projection)
    case 'top_view':
      content =
        step < 2 ? (
          <>
            {/* Isometric Tower View */}
            <ellipse cx="230" cy="245" rx="140" ry="24" fill={C.ink} opacity={0.12} />
            {/* 3 Blue cubes stacked */}
            <IsoCube3D x={190} y={200} size={36} color={C.blue} />
            <IsoCube3D x={190} y={150} size={36} color={C.blue} />
            <IsoCube3D x={190} y={100} size={36} color={C.blue} />
            {/* 1 Yellow cube on the side */}
            <IsoCube3D x={245} y={225} size={36} color={C.yellow} />

            {/* Camera arrow looking from top */}
            <g className="bj-3d-camera" stroke={C.ink} strokeWidth={3} fill="none">
              <path d="M 190 25 V 55 M 180 45 L 190 58 L 200 45" strokeLinecap="round" />
            </g>
            {label('Bakış açını yukarı taşı ⬇', 230, 20, 16, true)}
          </>
        ) : (
          <>
            {/* Orthogonal 2D Top Blueprint View */}
            <Panel3D x={110} y={70} w={240} h={140} rx={22} fill="#ffffff" filterId={`${uid}-shadow-3d`} />
            <rect x={145} y={95} width={75} height={75} rx={14} fill={`url(#${uid}-blue-facet)`} stroke="#ffffff" strokeWidth={2} />
            <rect x={235} y={95} width={75} height={75} rx={14} fill={`url(#${uid}-yellow-facet)`} stroke="#ffffff" strokeWidth={2} />
            {label('Mavi', 182, 140, 16)}
            {label('Sarı', 272, 140, 16)}
            {label('Üstten bakış: Yalnızca en üst yüzeyler görünür', 230, 255, 17, true)}
          </>
        );
      break;

    // 13. Parçadan Bütüne (Shape Combination)
    case 'shape_combination':
      content = (
        <>
          {/* Joining pieces */}
          <g
            className="bj-lesson-slide"
            style={
              {
                transform: `translateX(${revealed ? 25 : -20}px)`,
                '--join-from': revealed ? '-30px' : '0px',
              } as React.CSSProperties
            }
          >
            {/* Left 3D Prism Wedge */}
            <polygon points="120,60 120,210 270,210" fill={`url(#${uid}-blue-facet)`} stroke="#ffffff" strokeWidth={2} filter={`url(#${uid}-shadow-3d)`} />
          </g>

          <g
            className="bj-lesson-slide"
            style={
              {
                transform: `translateX(${revealed ? -25 : 40}px)`,
                '--join-from': revealed ? '60px' : '0px',
              } as React.CSSProperties
            }
          >
            {/* Right 3D Prism Wedge */}
            <polygon points="170,60 320,60 320,210" fill={`url(#${uid}-yellow-facet)`} stroke="#ffffff" strokeWidth={2} filter={`url(#${uid}-shadow-3d)`} />
          </g>

          {label(revealed ? 'İki yarım birleşti ➔ Tam kare oluştu!' : 'Kenarları eşleştirip yaklaştır', 230, 260, 18, true)}
        </>
      );
      break;

    // 14. Eksik Parçayı Bul (Figure & Pattern Completion)
    case 'figure_completion':
      content = (
        <>
          {/* Circular Mosaic Tile Board */}
          <g filter={`url(#${uid}-shadow-3d)`} transform="translate(130, 35)">
            {/* 4 Quadrants */}
            <rect x="0" y="0" width="95" height="95" rx={14} fill={`url(#${uid}-blue-facet)`} stroke="#ffffff" strokeWidth={2} />
            <rect x="105" y="0" width="95" height="95" rx={14} fill={`url(#${uid}-yellow-facet)`} stroke="#ffffff" strokeWidth={2} />
            <rect x="0" y="105" width="95" height="95" rx={14} fill={`url(#${uid}-yellow-facet)`} stroke="#ffffff" strokeWidth={2} />

            {/* Quadrant 4 (Target) */}
            <rect
              x="105"
              y="105"
              width="95"
              height="95"
              rx={14}
              fill={revealed ? `url(#${uid}-blue-facet)` : '#ffffff'}
              stroke={revealed ? '#ffffff' : C.yellow}
              strokeWidth={2}
              strokeDasharray={revealed ? 'none' : '6 6'}
            />
            {!revealed && label('?', 152, 162, 38)}
          </g>

          {label('Desenin çapraz simetrisini izle', 230, 275, 18, true)}
        </>
      );
      break;

    // 15. Hangisi Daha Ağır? (Weight Comparison on 3D Scale)
    case 'weight_comparison':
      content = (
        <>
          {/* 3D Scale Base Fulcrum Stand */}
          <polygon points="230,120 185,245 275,245" fill={shade(C.ice, 0.8)} stroke="#b8cfdf" strokeWidth={2} />
          <ellipse cx="230" cy="245" rx="55" ry="12" fill={C.ink} opacity={0.2} />
          <circle cx="230" cy="120" r="14" fill={`url(#${uid}-yellow-sphere)`} />

          {/* Tilting 3D Lever Beam */}
          <g transform="rotate(-12 230 120)">
            <rect x="60" y="114" width="340" height="12" rx={6} fill={`url(#${uid}-ink-facet)`} stroke="#ffffff" strokeWidth={1} />
            {/* Hanging chain lines */}
            <line x1="85" y1="120" x2="85" y2="185" stroke={C.ink} strokeWidth={2} />
            <line x1="125" y1="120" x2="125" y2="185" stroke={C.ink} strokeWidth={2} />
            <line x1="335" y1="120" x2="335" y2="155" stroke={C.ink} strokeWidth={2} />
            <line x1="375" y1="120" x2="375" y2="155" stroke={C.ink} strokeWidth={2} />

            {/* Left Pan (Lower - Heavy) */}
            <path d="M 70 185 Q 105 210 140 185 Z" fill={`url(#${uid}-pink-facet)`} stroke="#ffffff" strokeWidth={1.5} />
            {/* Right Pan (Higher - Light) */}
            <path d="M 320 155 Q 355 180 390 155 Z" fill={`url(#${uid}-blue-facet)`} stroke="#ffffff" strokeWidth={1.5} />
          </g>

          {/* Objects in pans */}
          <Sphere3D x={110} y={175} r={22} color={C.pink} />
          <Sphere3D x={350} y={125} r={14} color={C.blue} />

          {revealed && label('Ağır olan taraf alçalır ⬇', 230, 275, 18, true)}
        </>
      );
      break;

    // 16. Terazide Eşitlik (Shape Algebra on 3D Scale)
    case 'shape_equation':
      content =
        step < 2 ? (
          <>
            <Panel3D x={45} y={75} w={370} h={115} rx={22} fill="#ffffff" filterId={`${uid}-shadow-3d`} />
            <Star3D x={95} y={130} size={28} color={C.yellow} />
            {label('+', 155, 138, 36)}
            <Star3D x={215} y={130} size={28} color={C.yellow} />
            {label('=', 275, 138, 36)}
            {/* Number 6 3D block */}
            <rect x="315" y="100" width="60" height="60" rx={14} fill={`url(#${uid}-blue-facet)`} stroke="#ffffff" strokeWidth={2} />
            <text x="345" y="142" fontSize={36} textAnchor="middle" fill="#ffffff" fontWeight={850}>
              6
            </text>
            {label('İki eşit yıldızın toplamı 6 eder', 230, 245, 18, true)}
          </>
        ) : (
          <>
            <Panel3D x={95} y={75} w={270} h={115} rx={22} fill="#ffffff" filterId={`${uid}-shadow-3d`} />
            <Star3D x={155} y={130} size={32} color={C.yellow} />
            {label('=', 225, 138, 36)}
            <rect x="255" y="100" width="60" height="60" rx={14} fill={`url(#${uid}-green-facet)`} stroke="#ffffff" strokeWidth={2} />
            <text x="285" y="142" fontSize={36} textAnchor="middle" fill="#ffffff" fontWeight={850}>
              3
            </text>
            {label('1 Yıldız = 3 eder (3 + 3 = 6)', 230, 245, 18, true)}
          </>
        );
      break;

    // 17. Hafıza Bahçesi (Visual Memory Cards)
    case 'visual_memory':
      content = (
        <>
          {['circle', 'star', 'square'].map((s, n) => {
            const posX = 75 + n * 135;
            const colors = [C.cyan, C.yellow, C.pink];
            const isHidden = step === 2 && n === 1;
            return (
              <g key={s} className="bj-memory-card">
                <Panel3D
                  x={posX - 45}
                  y={60}
                  w={110}
                  h={140}
                  rx={20}
                  fill={isHidden ? '#183c59' : '#ffffff'}
                  accent={isHidden ? C.yellow : '#cfe1ee'}
                  filterId={`${uid}-shadow-3d`}
                />
                {isHidden ? (
                  <text x={posX + 10} y={145} fontSize={48} textAnchor="middle" fill="#ffffff" fontWeight={850}>
                    ?
                  </text>
                ) : (
                  shape(s, posX + 10, 130, colors[n], 26)
                )}
              </g>
            );
          })}
          {label(step === 2 ? 'Ortadaki kartta hangi şekil vardı?' : 'Gör · Gruplandır · Hatırla ✦', 230, 255, 18, true)}
        </>
      );
      break;

    // 18. Sayıların Ritmi (Number Steps in 3D)
    case 'number_pattern':
      content = (
        <>
          {/* Stepping stone 3D discs */}
          {[2, 4, 6, 8, 10].map((num, i) => {
            const posX = 52 + i * 88;
            const posY = 135;
            const isUnknown = i === 4 && !revealed;
            return (
              <g key={num} className="bj-number-stone">
                <ellipse cx={posX} cy={posY + 26} rx={34} ry={11} fill={C.ink} opacity={0.18} />
                <Cylinder3D x={posX} y={posY} r={32} h={18} color={isUnknown ? C.ice : i === 4 ? C.green : C.blue} />
                <text x={posX} y={posY + 5} fontSize={26} textAnchor="middle" fill={i === 4 && !isUnknown ? '#ffffff' : C.ink} fontWeight={850}>
                  {isUnknown ? '?' : String(num)}
                </text>
                {i < 4 && (
                  <g className="bj-3d-arc">
                    <path
                      d={`M ${posX + 24} ${posY - 12} Q ${posX + 44} ${posY - 48} ${posX + 64} ${posY - 12}`}
                      fill="none"
                      stroke={C.green}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    {label('+2', posX + 44, posY - 42, 14, true)}
                  </g>
                )}
              </g>
            );
          })}
          {label('Her adımda aynı miktar artar (+2)', 230, 245, 18, true)}
        </>
      );
      break;

    default:
      content = null;
  }

  return (
    <ScenePaint.Provider value={uid}>
      <figure className="bj-lesson-stage" data-playing={playing} data-scene-step={step}>
        <svg viewBox="0 0 460 300" role="img" aria-labelledby={uid}>
          <title id={uid}>{title}</title>
          <SceneMaterials prefix={uid} />
          {/* Subtle 3D Floor Grid */}
          <rect x="0" y="0" width="460" height="300" fill={`url(#${uid}-grid)`} pointerEvents="none" />
          <g className="bj-lesson-scene-content">{content}</g>
        </svg>
      </figure>
    </ScenePaint.Provider>
  );
}
