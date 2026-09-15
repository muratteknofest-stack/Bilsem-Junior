import React from 'react';

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
  blue: '#3b82f6',
  indigo: '#6366f1',
  purple: '#a855f7',
  pink: '#ec4899',
  rose: '#f43f5e',
  amber: '#f59e0b',
  orange: '#f97316',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  slate: '#64748b',
  dark: '#1e293b',
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

export interface ShapeSvgProps {
  kind: ShapeKind;
  style?: Partial<ShapeStyle>;
  cx?: number;
  cy?: number;
  size?: number;
}

export const ShapeSvg: React.FC<ShapeSvgProps> = ({ kind, style = {}, cx = 50, cy = 50, size = 70 }) => {
  const s: Partial<ShapeStyle> = style;
  const fill = s.fill || PALETTE.indigo;
  const stroke = s.stroke || PALETTE.dark;
  const strokeWidth = s.strokeWidth ?? 3;
  const rotation = s.rotation || 0;
  const scale = s.scale || 1;
  const marker = s.marker || 'none';
  const markerColor = s.markerColor || PALETTE.white;
  const markerPos = s.markerPos || 'center';
  const dashed = s.dashed || false;

  const r = (size / 2) * scale;
  const half = r;

  const renderBaseShape = () => {
    switch (kind) {
      case 'circle':
        return <circle cx={cx} cy={cy} r={r} />;
      case 'square':
        return (
          <rect
            x={cx - half}
            y={cy - half}
            width={r * 2}
            height={r * 2}
            rx={r * 0.15}
          />
        );
      case 'triangle': {
        const topY = cy - r;
        const botY = cy + r * 0.866;
        const leftX = cx - r;
        const rightX = cx + r;
        return <polygon points={`${cx},${topY} ${rightX},${botY} ${leftX},${botY}`} />;
      }
      case 'diamond':
        return (
          <polygon
            points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
          />
        );
      case 'pentagon': {
        const pts: string[] = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 72 - 90) * (Math.PI / 180);
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return <polygon points={pts.join(' ')} />;
      }
      case 'hexagon': {
        const pts: string[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 30) * (Math.PI / 180);
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return <polygon points={pts.join(' ')} />;
      }
      case 'star': {
        const pts: string[] = [];
        const innerR = r * 0.45;
        for (let i = 0; i < 10; i++) {
          const currR = i % 2 === 0 ? r : innerR;
          const angle = (i * 36 - 90) * (Math.PI / 180);
          pts.push(`${cx + currR * Math.cos(angle)},${cy + currR * Math.sin(angle)}`);
        }
        return <polygon points={pts.join(' ')} />;
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
        return <polygon points={pts.join(' ')} />;
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
        return <polygon points={pts.join(' ')} />;
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
        return <polygon points={pts.join(' ')} />;
      }
      case 'crescent': {
        return (
          <path
            d={`M ${cx - r * 0.7} ${cy - r * 0.7} A ${r} ${r} 0 1 0 ${cx + r * 0.7} ${cy + r * 0.7} A ${r * 0.85} ${r * 0.85} 0 0 1 ${cx - r * 0.7} ${cy - r * 0.7} Z`}
          />
        );
      }
      case 'ring': {
        return (
          <path
            fillRule="evenodd"
            d={`M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z M ${cx} ${cy - r * 0.5} A ${r * 0.5} ${r * 0.5} 0 1 1 ${cx} ${cy + r * 0.5} A ${r * 0.5} ${r * 0.5} 0 1 1 ${cx} ${cy - r * 0.5} Z`}
          />
        );
      }
      case 'trapezoid': {
        const topW = r * 0.6;
        const botW = r;
        return (
          <polygon
            points={`${cx - topW},${cy - r * 0.7} ${cx + topW},${cy - r * 0.7} ${cx + botW},${cy + r * 0.7} ${cx - botW},${cy + r * 0.7}`}
          />
        );
      }
      case 'clover': {
        const petR = r * 0.45;
        return (
          <g>
            <circle cx={cx} cy={cy - petR * 0.9} r={petR} />
            <circle cx={cx + petR * 0.9} cy={cy} r={petR} />
            <circle cx={cx} cy={cy + petR * 0.9} r={petR} />
            <circle cx={cx - petR * 0.9} cy={cy} r={petR} />
            <circle cx={cx} cy={cy} r={petR * 0.6} />
          </g>
        );
      }
      case 'pacman': {
        return (
          <path
            d={`M ${cx} ${cy} L ${cx + r * 0.866} ${cy - r * 0.5} A ${r} ${r} 0 1 0 ${cx + r * 0.866} ${cy + r * 0.5} Z`}
          />
        );
      }
      default:
        return <circle cx={cx} cy={cy} r={r} />;
    }
  };

  const getMarkerCoords = () => {
    const offset = r * 0.55;
    switch (markerPos) {
      case 'top': return { x: cx, y: cy - offset };
      case 'right': return { x: cx + offset, y: cy };
      case 'bottom': return { x: cx, y: cy + offset };
      case 'left': return { x: cx - offset, y: cy };
      case 'center':
      default: return { x: cx, y: cy };
    }
  };

  const renderMarker = () => {
    if (marker === 'none') return null;
    const { x, y } = getMarkerCoords();
    const mr = Math.max(3, r * 0.2);

    switch (marker) {
      case 'dot':
        return <circle cx={x} cy={y} r={mr} fill={markerColor} stroke={PALETTE.dark} strokeWidth={1.5} />;
      case 'plus':
        return (
          <g stroke={markerColor} strokeWidth={strokeWidth} strokeLinecap="round"
      style={{ filter: "drop-shadow(0px 3px 2px rgba(0,0,0,0.2)) drop-shadow(0px 6px 12px rgba(0,0,0,0.1))" }}>
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
        return <polygon points={starPts.join(' ')} fill={markerColor} stroke={PALETTE.dark} strokeWidth={1} />;
      }
      case 'mini_square':
        return (
          <rect
            x={x - mr}
            y={y - mr}
            width={mr * 2}
            height={mr * 2}
            fill={markerColor}
            stroke={PALETTE.dark}
            strokeWidth={1.5}
            rx={2}
          />
        );
      case 'line':
        return (
          <line
            x1={x - mr}
            y1={y}
            x2={x + mr}
            y2={y}
            stroke={markerColor}
            strokeWidth={strokeWidth + 1}
            strokeLinecap="round"
      style={{ filter: "drop-shadow(0px 3px 2px rgba(0,0,0,0.2)) drop-shadow(0px 6px 12px rgba(0,0,0,0.1))" }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <g
      transform={`rotate(${rotation}, ${cx}, ${cy})`}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dashed ? '4 3' : undefined}
      strokeLinejoin="round"
      strokeLinecap="round"
      style={{ filter: "drop-shadow(0px 3px 2px rgba(0,0,0,0.2)) drop-shadow(0px 6px 12px rgba(0,0,0,0.1))" }}
    >
      {renderBaseShape()}
      {renderMarker()}
    </g>
  );
};
