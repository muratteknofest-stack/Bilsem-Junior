import React, { useId } from 'react';

export type ShapeKind =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'arrow'
  | 'cross'
  | 'l_shape'
  | 'crescent'
  | 'ring'
  | 'trapezoid'
  | 'clover'
  | 'pacman';

export type MarkerKind = 'none' | 'dot' | 'plus' | 'star' | 'mini_square' | 'line' | 'stripe';

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth?: number;
  rotation?: number;
  scale?: number;
  marker?: MarkerKind;
  markerColor?: string;
  markerPos?: 'center' | 'top' | 'right' | 'bottom' | 'left';
  dashed?: boolean;
}

export const PALETTE = {
  blue: '#2563eb',
  indigo: '#4f46e5',
  purple: '#9333ea',
  pink: '#db2777',
  rose: '#e11d48',
  amber: '#d97706',
  orange: '#ea580c',
  emerald: '#059669',
  teal: '#0d9488',
  cyan: '#0891b2',
  slate: '#475569',
  dark: '#0f172a',
  white: '#ffffff',
};

export const COLOR_KEYS = [
  'blue',
  'indigo',
  'purple',
  'rose',
  'amber',
  'orange',
  'emerald',
  'teal',
  'cyan',
] as const;

export function getColor(key: string): string {
  return (PALETTE as Record<string, string>)[key] || PALETTE.indigo;
}

// -------------------------------------------------------------
// 3D Color & Lighting Helpers
// -------------------------------------------------------------
function adjustColor(hex: string, percent: number): string {
  if (!hex || typeof hex !== 'string') return '#4f46e5';
  let clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return hex;

  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export interface ShapeSvgProps {
  kind: ShapeKind;
  style?: Partial<ShapeStyle>;
  cx?: number;
  cy?: number;
  size?: number;
}

export const ShapeSvg: React.FC<ShapeSvgProps> = ({ kind, style = {}, cx = 50, cy = 50, size = 70 }) => {
  const reactId = useId().replace(/:/g, '_');
  const s: Partial<ShapeStyle> = style;
  const baseFill = s.fill || PALETTE.indigo;
  const stroke = s.stroke || '#0f172a';
  const strokeWidth = s.strokeWidth ?? 2;
  const rotation = s.rotation || 0;
  const scale = s.scale || 1;
  const marker = s.marker || 'none';
  const markerColor = s.markerColor || PALETTE.white;
  const markerPos = s.markerPos || 'center';
  const dashed = s.dashed || false;

  const r = (size / 2) * scale;
  const half = r;

  // 3D Volumetric Lighting Shades
  const lightTone = adjustColor(baseFill, 32);
  const midTone = baseFill;
  const darkTone = adjustColor(baseFill, -28);
  const deepShadow = adjustColor(baseFill, -45);

  const gradId = `grad3d_${reactId}`;
  const radGradId = `radGrad3d_${reactId}`;
  const specGradId = `specGrad3d_${reactId}`;

  // Pre-calculated coordinates
  const topY = cy - r;
  const botY = cy + r * 0.866;
  const leftX = cx - r;
  const rightX = cx + r;

  const getMarkerCoords = () => {
    const offset = r * 0.52;
    switch (markerPos) {
      case 'top': return { x: cx, y: cy - offset };
      case 'right': return { x: cx + offset, y: cy };
      case 'bottom': return { x: cx, y: cy + offset };
      case 'left': return { x: cx - offset, y: cy };
      case 'center':
      default: return { x: cx, y: cy };
    }
  };

  const render3DShapeBody = () => {
    switch (kind) {
      case 'circle': {
        return (
          <g>
            {/* 3D Sphere / Glossy Disc Body */}
            <circle cx={cx} cy={cy} r={r} fill={`url(#${radGradId})`} />
            {/* Top-Left Curved Specular Highlight Reflection */}
            <ellipse
              cx={cx - r * 0.28}
              cy={cy - r * 0.3}
              rx={r * 0.45}
              ry={r * 0.24}
              transform={`rotate(-28 ${cx - r * 0.28} ${cy - r * 0.3})`}
              fill={`url(#${specGradId})`}
              opacity="0.85"
            />
            {/* Inner Top Bevel Rim */}
            <path
              d={`M ${cx - r * 0.82} ${cy - r * 0.2} A ${r * 0.88} ${r * 0.88} 0 0 1 ${cx + r * 0.4} ${cy - r * 0.8}`}
              fill="none"
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Bottom Occlusion Shade */}
            <path
              d={`M ${cx - r * 0.75} ${cy + r * 0.4} A ${r * 0.88} ${r * 0.88} 0 0 0 ${cx + r * 0.75} ${cy + r * 0.4}`}
              fill="none"
              stroke="rgba(15,23,42,0.35)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        );
      }

      case 'square': {
        const rad = Math.max(3, r * 0.16);
        return (
          <g>
            {/* 3D Chamfered Tile Body */}
            <rect
              x={cx - half}
              y={cy - half}
              width={r * 2}
              height={r * 2}
              rx={rad}
              fill={`url(#${gradId})`}
            />
            {/* Specular Glaze Polygon */}
            <path
              d={`M ${cx - half + rad} ${cy - half + 1} L ${cx + half - rad} ${cy - half + 1} L ${cx - half + 1} ${cy + half - rad} Z`}
              fill="rgba(255,255,255,0.18)"
            />
            {/* Top Chamfer Edge Highlight */}
            <line
              x1={cx - half + rad}
              y1={cy - half + 1.2}
              x2={cx + half - rad}
              y2={cy - half + 1.2}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Left Chamfer Edge Highlight */}
            <line
              x1={cx - half + 1.2}
              y1={cy - half + rad}
              x2={cx - half + 1.2}
              y2={cy + half - rad}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Bottom Bevel Shadow */}
            <line
              x1={cx - half + rad}
              y1={cy + half - 1.2}
              x2={cx + half - rad}
              y2={cy + half - 1.2}
              stroke="rgba(15,23,42,0.4)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Right Bevel Shadow */}
            <line
              x1={cx + half - 1.2}
              y1={cy - half + rad}
              x2={cx + half - 1.2}
              y2={cy + half - rad}
              stroke="rgba(15,23,42,0.3)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        );
      }

      case 'triangle': {
        return (
          <g>
            {/* Base Triangle */}
            <polygon
              points={`${cx},${topY} ${rightX},${botY} ${leftX},${botY}`}
              fill={`url(#${gradId})`}
            />
            {/* Left 3D Facet (Facing Keylight) */}
            <polygon
              points={`${cx},${topY} ${cx},${cy + r * 0.3} ${leftX},${botY}`}
              fill="rgba(255,255,255,0.22)"
            />
            {/* Right 3D Facet (Facing Shadow) */}
            <polygon
              points={`${cx},${topY} ${rightX},${botY} ${cx},${cy + r * 0.3}`}
              fill="rgba(15,23,42,0.18)"
            />
            {/* Left Specular Ridge Highlight */}
            <line
              x1={cx}
              y1={topY + 2}
              x2={leftX + 2}
              y2={botY - 1}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Central Ridge Highlight */}
            <line
              x1={cx}
              y1={topY + 2}
              x2={cx}
              y2={cy + r * 0.3}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1.5"
            />
            {/* Bottom Bevel Shadow */}
            <line
              x1={leftX + 2}
              y1={botY - 1}
              x2={rightX - 2}
              y2={botY - 1}
              stroke="rgba(15,23,42,0.4)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        );
      }

      case 'diamond': {
        return (
          <g>
            {/* Base Diamond */}
            <polygon
              points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
              fill={`url(#${gradId})`}
            />
            {/* Top-Left Facet (Brightest Highlight) */}
            <polygon
              points={`${cx},${cy - r} ${cx},${cy} ${cx - r},${cy}`}
              fill="rgba(255,255,255,0.3)"
            />
            {/* Bottom-Right Facet (Deepest Shade) */}
            <polygon
              points={`${cx},${cy + r} ${cx + r},${cy} ${cx},${cy}`}
              fill="rgba(15,23,42,0.28)"
            />
            {/* Top Bevel Highlight */}
            <line
              x1={cx}
              y1={cy - r + 2}
              x2={cx - r + 2}
              y2={cy}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Central Crest Lines */}
            <line
              x1={cx}
              y1={cy - r}
              x2={cx}
              y2={cy + r}
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.5"
            />
            <line
              x1={cx - r}
              y1={cy}
              x2={cx + r}
              y2={cy}
              stroke="rgba(15,23,42,0.25)"
              strokeWidth="1.5"
            />
          </g>
        );
      }

      case 'star': {
        const starPts: string[] = [];
        const innerR = r * 0.44;
        for (let i = 0; i < 10; i++) {
          const currR = i % 2 === 0 ? r : innerR;
          const angle = (i * 36 - 90) * (Math.PI / 180);
          starPts.push(`${cx + currR * Math.cos(angle)},${cy + currR * Math.sin(angle)}`);
        }
        return (
          <g>
            <polygon points={starPts.join(' ')} fill={`url(#${gradId})`} />
            {/* Faceted Star Shading from Center to Points */}
            {[0, 2, 4, 6, 8].map((i) => {
              const a1 = (i * 36 - 90) * (Math.PI / 180);
              const a2 = ((i + 1) * 36 - 90) * (Math.PI / 180);
              const p1 = `${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`;
              const p2 = `${cx + innerR * Math.cos(a2)},${cy + innerR * Math.sin(a2)}`;
              return (
                <polygon
                  key={i}
                  points={`${cx},${cy} ${p1} ${p2}`}
                  fill={i < 4 ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.22)'}
                />
              );
            })}
          </g>
        );
      }

      case 'pentagon': {
        const pts: string[] = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 72 - 90) * (Math.PI / 180);
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return (
          <g>
            <polygon points={pts.join(' ')} fill={`url(#${gradId})`} />
            <polygon
              points={`${cx},${cy} ${cx + r * Math.cos(-90 * Math.PI / 180)},${cy + r * Math.sin(-90 * Math.PI / 180)} ${cx + r * Math.cos(-18 * Math.PI / 180)},${cy + r * Math.sin(-18 * Math.PI / 180)}`}
              fill="rgba(255,255,255,0.18)"
            />
            <polygon
              points={`${cx},${cy} ${cx + r * Math.cos(126 * Math.PI / 180)},${cy + r * Math.sin(126 * Math.PI / 180)} ${cx + r * Math.cos(54 * Math.PI / 180)},${cy + r * Math.sin(54 * Math.PI / 180)}`}
              fill="rgba(15,23,42,0.25)"
            />
          </g>
        );
      }

      case 'hexagon': {
        const pts: string[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 30) * (Math.PI / 180);
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return (
          <g>
            <polygon points={pts.join(' ')} fill={`url(#${gradId})`} />
            {/* Top Bevel Facet */}
            <polygon
              points={`${cx},${cy} ${cx + r * Math.cos(-30 * Math.PI / 180)},${cy + r * Math.sin(-30 * Math.PI / 180)} ${cx + r * Math.cos(-90 * Math.PI / 180)},${cy + r * Math.sin(-90 * Math.PI / 180)}`}
              fill="rgba(255,255,255,0.24)"
            />
            {/* Bottom Shade Facet */}
            <polygon
              points={`${cx},${cy} ${cx + r * Math.cos(90 * Math.PI / 180)},${cy + r * Math.sin(90 * Math.PI / 180)} ${cx + r * Math.cos(150 * Math.PI / 180)},${cy + r * Math.sin(150 * Math.PI / 180)}`}
              fill="rgba(15,23,42,0.28)"
            />
          </g>
        );
      }

      case 'arrow': {
        const headH = r * 1.1;
        const pts = [
          `${cx},${cy - headH}`,
          `${cx + r * 0.9},${cy}`,
          `${cx + r * 0.4},${cy}`,
          `${cx + r * 0.4},${cy + r * 0.9}`,
          `${cx - r * 0.4},${cy + r * 0.9}`,
          `${cx - r * 0.4},${cy}`,
          `${cx - r * 0.9},${cy}`,
        ];
        return (
          <g>
            <polygon points={pts.join(' ')} fill={`url(#${gradId})`} />
            {/* Left Arrow Edge Specular Highlight */}
            <line
              x1={cx}
              y1={cy - headH + 2}
              x2={cx - r * 0.9 + 2}
              y2={cy}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Bottom Stem Occlusion */}
            <line
              x1={cx - r * 0.4}
              y1={cy + r * 0.9 - 1}
              x2={cx + r * 0.4}
              y2={cy + r * 0.9 - 1}
              stroke="rgba(15,23,42,0.4)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        );
      }

      case 'cross': {
        const w = r * 0.35;
        const pts = [
          `${cx - w},${cy - r}`,
          `${cx + w},${cy - r}`,
          `${cx + w},${cy - w}`,
          `${cx + r},${cy - w}`,
          `${cx + r},${cy + w}`,
          `${cx + w},${cy + w}`,
          `${cx + w},${cy + r}`,
          `${cx - w},${cy + r}`,
          `${cx - w},${cy + w}`,
          `${cx - r},${cy + w}`,
          `${cx - r},${cy - w}`,
          `${cx - w},${cy - w}`,
        ];
        return (
          <g>
            <polygon points={pts.join(' ')} fill={`url(#${gradId})`} />
            {/* Top-facing arm highlights */}
            <line
              x1={cx - w}
              y1={cy - r + 1.5}
              x2={cx + w}
              y2={cy - r + 1.5}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1={cx - r + 1.5}
              y1={cy - w}
              x2={cx - r + 1.5}
              y2={cy + w}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        );
      }

      case 'ring': {
        return (
          <g>
            <path
              fillRule="evenodd"
              d={`M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z M ${cx} ${cy - r * 0.52} A ${r * 0.52} ${r * 0.52} 0 1 1 ${cx} ${cy + r * 0.52} A ${r * 0.52} ${r * 0.52} 0 1 1 ${cx} ${cy - r * 0.52} Z`}
              fill={`url(#${radGradId})`}
            />
            {/* Outer Specular Rim */}
            <path
              d={`M ${cx - r * 0.7} ${cy - r * 0.7} A ${r} ${r} 0 0 1 ${cx + r * 0.7} ${cy - r * 0.7}`}
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1.8"
            />
            {/* Inner Lip Occlusion Rim */}
            <path
              d={`M ${cx - r * 0.36} ${cy - r * 0.36} A ${r * 0.52} ${r * 0.52} 0 0 0 ${cx + r * 0.36} ${cy - r * 0.36}`}
              fill="none"
              stroke="rgba(15,23,42,0.4)"
              strokeWidth="1.8"
            />
          </g>
        );
      }

      case 'crescent': {
        return (
          <g>
            <path
              d={`M ${cx - r * 0.7} ${cy - r * 0.7} A ${r} ${r} 0 1 0 ${cx + r * 0.7} ${cy + r * 0.7} A ${r * 0.85} ${r * 0.85} 0 0 1 ${cx - r * 0.7} ${cy - r * 0.7} Z`}
              fill={`url(#${gradId})`}
            />
            <path
              d={`M ${cx - r * 0.7} ${cy - r * 0.7} A ${r} ${r} 0 0 0 ${cx - r * 0.9} ${cy + r * 0.2}`}
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="2"
            />
          </g>
        );
      }

      case 'l_shape': {
        const w = r * 0.45;
        const pts = [
          `${cx - r},${cy - r}`,
          `${cx - r + w},${cy - r}`,
          `${cx - r + w},${cy + r - w}`,
          `${cx + r},${cy + r - w}`,
          `${cx + r},${cy + r}`,
          `${cx - r},${cy + r}`,
        ];
        return (
          <g>
            <polygon points={pts.join(' ')} fill={`url(#${gradId})`} />
            <line
              x1={cx - r}
              y1={cy - r + 1.5}
              x2={cx - r + w}
              y2={cy - r + 1.5}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="2"
            />
          </g>
        );
      }

      case 'trapezoid': {
        const topW = r * 0.6;
        const botW = r;
        return (
          <g>
            <polygon
              points={`${cx - topW},${cy - r * 0.7} ${cx + topW},${cy - r * 0.7} ${cx + botW},${cy + r * 0.7} ${cx - botW},${cy + r * 0.7}`}
              fill={`url(#${gradId})`}
            />
            <line
              x1={cx - topW}
              y1={cy - r * 0.7 + 1.5}
              x2={cx + topW}
              y2={cy - r * 0.7 + 1.5}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="2"
            />
          </g>
        );
      }

      case 'clover': {
        const petR = r * 0.44;
        return (
          <g fill={`url(#${radGradId})`}>
            <circle cx={cx} cy={cy - petR * 0.9} r={petR} />
            <circle cx={cx + petR * 0.9} cy={cy} r={petR} />
            <circle cx={cx} cy={cy + petR * 0.9} r={petR} />
            <circle cx={cx - petR * 0.9} cy={cy} r={petR} />
            <circle cx={cx} cy={cy} r={petR * 0.6} fill={`url(#${gradId})`} />
          </g>
        );
      }

      case 'pacman': {
        return (
          <g>
            <path
              d={`M ${cx} ${cy} L ${cx + r * 0.866} ${cy - r * 0.5} A ${r} ${r} 0 1 0 ${cx + r * 0.866} ${cy + r * 0.5} Z`}
              fill={`url(#${radGradId})`}
            />
            {/* Specular curved glint */}
            <path
              d={`M ${cx - r * 0.6} ${cy - r * 0.6} A ${r * 0.85} ${r * 0.85} 0 0 1 ${cx + r * 0.3} ${cy - r * 0.8}`}
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="2"
            />
          </g>
        );
      }

      default:
        return <circle cx={cx} cy={cy} r={r} fill={`url(#${radGradId})`} />;
    }
  };

  const render3DMarker = () => {
    if (marker === 'none') return null;
    const { x, y } = getMarkerCoords();
    const mr = Math.max(3.5, r * 0.22);

    switch (marker) {
      case 'dot':
        return (
          <g>
            {/* 3D Enamel Pin Inset */}
            <circle cx={x} cy={y + 1} r={mr} fill="rgba(15,23,42,0.4)" />
            <circle cx={x} cy={y} r={mr} fill={markerColor} stroke="#0f172a" strokeWidth="1.2" />
            <circle cx={x - mr * 0.3} cy={y - mr * 0.3} r={mr * 0.35} fill="rgba(255,255,255,0.85)" />
          </g>
        );

      case 'plus':
        return (
          <g stroke={markerColor} strokeWidth={Math.max(2.5, strokeWidth + 0.5)} strokeLinecap="round">
            {/* Occlusion Shadow */}
            <g stroke="rgba(15,23,42,0.4)" transform="translate(0, 1.5)">
              <line x1={x - mr} y1={y} x2={x + mr} y2={y} />
              <line x1={x} y1={y - mr} x2={x} y2={y + mr} />
            </g>
            {/* Enamel Body */}
            <line x1={x - mr} y1={y} x2={x + mr} y2={y} />
            <line x1={x} y1={y - mr} x2={x} y2={y + mr} />
          </g>
        );

      case 'star': {
        const starPts: string[] = [];
        for (let i = 0; i < 8; i++) {
          const curr = i % 2 === 0 ? mr : mr * 0.45;
          const a = (i * 45 - 90) * (Math.PI / 180);
          starPts.push(`${x + curr * Math.cos(a)},${y + curr * Math.sin(a)}`);
        }
        return (
          <g>
            <polygon points={starPts.join(' ')} fill={markerColor} stroke="#0f172a" strokeWidth="1" />
            <circle cx={x - mr * 0.2} cy={y - mr * 0.2} r={mr * 0.25} fill="rgba(255,255,255,0.9)" />
          </g>
        );
      }

      case 'mini_square':
        return (
          <g>
            <rect
              x={x - mr}
              y={y - mr + 1}
              width={mr * 2}
              height={mr * 2}
              fill="rgba(15,23,42,0.35)"
              rx={2}
            />
            <rect
              x={x - mr}
              y={y - mr}
              width={mr * 2}
              height={mr * 2}
              fill={markerColor}
              stroke="#0f172a"
              strokeWidth="1.2"
              rx={2}
            />
            <line
              x1={x - mr + 1}
              y1={y - mr + 1}
              x2={x + mr - 1}
              y2={y - mr + 1}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1"
            />
          </g>
        );

      case 'line':
        return (
          <g strokeLinecap="round">
            <line
              x1={x - mr}
              y1={y + 1.5}
              x2={x + mr}
              y2={y + 1.5}
              stroke="rgba(15,23,42,0.4)"
              strokeWidth={strokeWidth + 1.5}
            />
            <line
              x1={x - mr}
              y1={y}
              x2={x + mr}
              y2={y}
              stroke={markerColor}
              strokeWidth={strokeWidth + 1.5}
            />
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <g
      transform={`rotate(${rotation}, ${cx}, ${cy})`}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dashed ? '4 3' : undefined}
      strokeLinejoin="round"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      shapeRendering="geometricPrecision"
      style={{
        filter:
          'drop-shadow(0px 3px 4px rgba(15,23,42,0.18)) drop-shadow(0px 8px 16px rgba(15,23,42,0.12))',
      }}
    >
      <defs>
        {/* 3D Diagonal Linear Gradient */}
        <linearGradient id={gradId} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor={lightTone} />
          <stop offset="55%" stopColor={midTone} />
          <stop offset="100%" stopColor={darkTone} />
        </linearGradient>

        {/* 3D Radial Specular Gradient for Spherical Shapes */}
        <radialGradient id={radGradId} cx="36%" cy="30%" r="68%" fx="28%" fy="24%">
          <stop offset="0%" stopColor={lightTone} />
          <stop offset="50%" stopColor={midTone} />
          <stop offset="85%" stopColor={darkTone} />
          <stop offset="100%" stopColor={deepShadow} />
        </radialGradient>

        {/* Specular White Glint Reflection */}
        <linearGradient id={specGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {render3DShapeBody()}
      {render3DMarker()}
    </g>
  );
};
