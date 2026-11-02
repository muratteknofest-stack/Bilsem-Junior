import React, { useId } from 'react';
import type { QuestionType } from '../../types';

interface LessonIcon3DProps {
  id: QuestionType;
  fallback?: string;
}

export function LessonIcon3D({ id, fallback }: LessonIcon3DProps) {
  const rawId = useId();
  const uid = `i3d-${id}-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <defs>
        {/* Core Drop Shadow Filter */}
        <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#11293d" floodOpacity="0.22" />
        </filter>
        <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#fca311" floodOpacity="0.6" />
        </filter>

        {/* 3D Palette Gradients */}
        {/* Sapphire Sphere */}
        <radialGradient id={`${uid}-blue-sphere`} cx="30%" cy="26%" r="70%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="42%" stopColor="#257bf4" />
          <stop offset="90%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#11293d" />
        </radialGradient>

        {/* Solar Gold / Amber Sphere */}
        <radialGradient id={`${uid}-yellow-sphere`} cx="30%" cy="26%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="42%" stopColor="#fca311" />
          <stop offset="88%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>

        {/* Emerald Sphere */}
        <radialGradient id={`${uid}-green-sphere`} cx="30%" cy="26%" r="70%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="45%" stopColor="#10b981" />
          <stop offset="90%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>

        {/* Ruby / Coral Sphere */}
        <radialGradient id={`${uid}-pink-sphere`} cx="30%" cy="26%" r="70%">
          <stop offset="0%" stopColor="#fecdd3" />
          <stop offset="42%" stopColor="#f43f7a" />
          <stop offset="88%" stopColor="#be123c" />
          <stop offset="100%" stopColor="#4c0519" />
        </radialGradient>

        {/* Amethyst Sphere */}
        <radialGradient id={`${uid}-violet-sphere`} cx="30%" cy="26%" r="70%">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="42%" stopColor="#8b5cf6" />
          <stop offset="88%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#3b0764" />
        </radialGradient>

        {/* Cyan Sphere */}
        <radialGradient id={`${uid}-cyan-sphere`} cx="30%" cy="26%" r="70%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="42%" stopColor="#06b6d4" />
          <stop offset="88%" stopColor="#0e7490" />
          <stop offset="100%" stopColor="#164e63" />
        </radialGradient>

        {/* Linear Facet Gradients for 3D Polyhedrons */}
        <linearGradient id={`${uid}-yellow-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id={`${uid}-yellow-left`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={`${uid}-yellow-right`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        <linearGradient id={`${uid}-blue-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id={`${uid}-blue-left`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id={`${uid}-blue-right`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>

        <linearGradient id={`${uid}-green-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id={`${uid}-green-left`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id={`${uid}-green-right`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>

        <linearGradient id={`${uid}-pink-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fecdd3" />
          <stop offset="100%" stopColor="#f43f7a" />
        </linearGradient>
        <linearGradient id={`${uid}-pink-left`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <linearGradient id={`${uid}-pink-right`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9f1239" />
          <stop offset="100%" stopColor="#4c0519" />
        </linearGradient>

        <linearGradient id={`${uid}-violet-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={`${uid}-violet-left`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={`${uid}-violet-right`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>

      {render3DIcon(id, uid, fallback)}
    </svg>
  );
}

function render3DIcon(id: QuestionType, uid: string, fallback?: string): React.ReactNode {
  switch (id) {
    // 1. Örüntü Dedektifi (Repeating 3D Sphere & Prism)
    case 'visual_sequence':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          {/* Ground Shadows */}
          <ellipse cx="20" cy="49" rx="12" ry="3.5" fill="#11293d" opacity="0.22" />
          <ellipse cx="44" cy="49" rx="14" ry="4" fill="#11293d" opacity="0.25" />

          {/* 3D Sapphire Sphere */}
          <circle cx="20" cy="35" r="13" fill={`url(#${uid}-blue-sphere)`} />
          {/* Sphere specular crescent */}
          <path
            d="M 11 31 A 9 9 0 0 1 23 23 A 12 12 0 0 0 13 35 Z"
            fill="#ffffff"
            opacity="0.65"
          />

          {/* 3D Amber Pyramid / Prism */}
          <g>
            {/* Left lit face */}
            <polygon points="44,14 31,43 44,45" fill={`url(#${uid}-yellow-top)`} />
            {/* Right shaded face */}
            <polygon points="44,14 44,45 57,43" fill={`url(#${uid}-yellow-right)`} />
            {/* Specular edge line */}
            <line x1="44" y1="14" x2="44" y2="45" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
          </g>

          {/* Playful Floating Spark */}
          <path
            d="M 33 13 Q 33 19 39 19 Q 33 19 33 25 Q 33 19 27 19 Q 33 19 33 13 Z"
            fill="#f43f7a"
          />
        </g>
      );

    // 2. Şekillerin İlişkisi (3D Transform Arrow between Cube and Prism)
    case 'visual_analogy':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="18" cy="48" rx="11" ry="3.5" fill="#11293d" opacity="0.22" />
          <ellipse cx="46" cy="33" rx="12" ry="3.5" fill="#11293d" opacity="0.25" />

          {/* Starting Cyan 3D Cube */}
          <g transform="translate(4, 16)">
            <polygon points="14,14 24,9 34,14 24,19" fill={`url(#${uid}-blue-top)`} />
            <polygon points="14,14 24,19 24,31 14,26" fill={`url(#${uid}-blue-left)`} />
            <polygon points="24,19 34,14 34,26 24,31" fill={`url(#${uid}-blue-right)`} />
          </g>

          {/* Curving 3D Transform Arrow */}
          <path
            d="M 23 27 C 28 17 36 17 41 21"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <polygon points="44,17 46,24 38,23" fill="#f59e0b" />

          {/* Target Vivid Coral 3D Diamond / Star */}
          <circle cx="46" cy="22" r="10" fill={`url(#${uid}-pink-sphere)`} />
          <path
            d="M 46 14 Q 46 22 54 22 Q 46 22 46 30 Q 46 22 38 22 Q 46 22 46 14 Z"
            fill="#ffffff"
            opacity="0.8"
          />
        </g>
      );

    // 3. Küpü Keşfet (Chunky 3D Isometric Die with Shaded Pip Faces)
    case 'dice_unfold':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="54" rx="20" ry="5.5" fill="#11293d" opacity="0.25" />

          {/* Top Face (Electric Blue) */}
          <polygon points="32,9 52,19 32,29 12,19" fill={`url(#${uid}-blue-top)`} stroke="#ffffff" strokeWidth="0.8" />
          {/* Left Face (Emerald Green) */}
          <polygon points="12,19 32,29 32,49 12,39" fill={`url(#${uid}-green-left)`} stroke="#ffffff" strokeWidth="0.8" />
          {/* Right Face (Amethyst Violet) */}
          <polygon points="32,29 52,19 52,39 32,49" fill={`url(#${uid}-violet-right)`} stroke="#ffffff" strokeWidth="0.8" />

          {/* White Pip Dots with Depth */}
          {/* Top Face: 1 central dot */}
          <ellipse cx="32" cy="19" rx="3.2" ry="2" fill="#ffffff" />

          {/* Left Face: 2 diagonal dots */}
          <circle cx="20" cy="31" r="2.4" fill="#ffffff" />
          <circle cx="26" cy="40" r="2.4" fill="#ffffff" />

          {/* Right Face: 3 diagonal dots */}
          <circle cx="38" cy="40" r="2.4" fill="#ffffff" />
          <circle cx="42" cy="34" r="2.4" fill="#ffffff" />
          <circle cx="46" cy="28" r="2.4" fill="#ffffff" />

          {/* Bevel Sparkle */}
          <circle cx="32" cy="29" r="1.5" fill="#ffffff" opacity="0.9" />
        </g>
      );

    // 4. Görsel Matris (2x2 3D Puzzle Grid with Glowing Mystery Tile)
    case 'matrix_2x2':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <rect x="7" y="7" width="50" height="50" rx="14" fill="#ffffff" stroke="#cde3f3" strokeWidth="1.5" />
          
          {/* Top-Left: Sapphire Sphere Tile */}
          <rect x="11" y="11" width="19" height="19" rx="6" fill={`url(#${uid}-blue-top)`} />
          <circle cx="20.5" cy="20.5" r="5" fill="#ffffff" />

          {/* Top-Right: Emerald Triangle Tile */}
          <rect x="34" y="11" width="19" height="19" rx="6" fill={`url(#${uid}-green-top)`} />
          <polygon points="43.5,14 49,24 38,24" fill="#ffffff" />

          {/* Bottom-Left: Ruby Diamond Tile */}
          <rect x="11" y="34" width="19" height="19" rx="6" fill={`url(#${uid}-pink-top)`} />
          <polygon points="20.5,37 26,43.5 20.5,50 15,43.5" fill="#ffffff" />

          {/* Bottom-Right: Glowing Golden ? Tile */}
          <rect x="34" y="34" width="19" height="19" rx="6" fill={`url(#${uid}-yellow-top)`} stroke="#f59e0b" strokeWidth="1.2" />
          <text x="43.5" y="49" fontSize="17" fontWeight="900" fill="#78350f" textAnchor="middle">
            ?
          </text>
        </g>
      );

    // 5. Aynanın Öteki Yanı (Symmetrical 3D Butterfly / Gem Wings)
    case 'symmetry_completion':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="52" rx="22" ry="4" fill="#11293d" opacity="0.2" />

          {/* Glowing Mirror Axis Line in Center */}
          <line x1="32" y1="8" x2="32" y2="52" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3 2" />

          {/* Left Wing (Ruby Coral) */}
          <path
            d="M 31 16 C 14 10 9 26 19 33 C 10 39 15 50 31 44 Z"
            fill={`url(#${uid}-pink-sphere)`}
          />
          <circle cx="22" cy="24" r="3.5" fill="#ffffff" opacity="0.75" />

          {/* Right Wing (Sapphire Blue) */}
          <path
            d="M 33 16 C 50 10 55 26 45 33 C 54 39 49 50 33 44 Z"
            fill={`url(#${uid}-blue-sphere)`}
          />
          <circle cx="42" cy="24" r="3.5" fill="#ffffff" opacity="0.75" />

          {/* Center Mirror Glints */}
          <polygon points="32,24 35,27 32,30 29,27" fill="#ffffff" />
          <polygon points="32,38 34,40 32,42 30,40" fill="#ffffff" />
        </g>
      );

    // 6. Dikkatli Gözler (3D Magnifying Glass Examining a Sparkling Gem)
    case 'visual_attention':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          {/* Background Gem Being Examined */}
          <ellipse cx="28" cy="46" rx="14" ry="4" fill="#11293d" opacity="0.2" />
          <circle cx="28" cy="28" r="10" fill={`url(#${uid}-yellow-sphere)`} />
          <path
            d="M 28 19 Q 28 28 37 28 Q 28 28 28 37 Q 28 28 19 28 Q 28 28 28 19 Z"
            fill="#ffffff"
          />

          {/* 3D Magnifying Glass Rim & Lens */}
          <g>
            {/* Chunky Glass Lens */}
            <circle cx="30" cy="27" r="17" fill="#93c5fd" opacity="0.35" />
            <circle cx="30" cy="27" r="17" stroke="#38bdf8" strokeWidth="4.5" />
            {/* White Lens Highlight Crescent */}
            <path
              d="M 17 25 A 13 13 0 0 1 30 14 A 16 16 0 0 0 17 31 Z"
              fill="#ffffff"
              opacity="0.75"
            />
            {/* 3D Ergonomic Handle */}
            <rect
              x="42"
              y="39"
              width="8"
              height="18"
              rx="4"
              transform="rotate(-45 42 39)"
              fill={`url(#${uid}-yellow-left)`}
              stroke="#b45309"
              strokeWidth="1.2"
            />
          </g>
        </g>
      );

    // 7. Haritada Adım Adım (Isometric Stepping Stone with Goal Flag)
    case 'direction_path':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="54" rx="22" ry="5.5" fill="#11293d" opacity="0.25" />

          {/* Stepping Diamond Tile (Green Top) */}
          <polygon points="32,22 56,34 32,46 8,34" fill={`url(#${uid}-green-top)`} stroke="#ffffff" strokeWidth="1" />
          {/* Side Extrusions */}
          <polygon points="8,34 32,46 32,53 8,41" fill={`url(#${uid}-green-left)`} />
          <polygon points="32,46 56,34 56,41 32,53" fill={`url(#${uid}-green-right)`} />

          {/* Direction Arrow on Tile */}
          <path
            d="M 18 36 L 30 30 L 28 34 L 38 29"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 3D Goal Flag at Target */}
          <g transform="translate(36, 12)">
            <line x1="6" y1="2" x2="6" y2="24" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
            <polygon points="6,3 20,8 6,14" fill={`url(#${uid}-pink-top)`} />
            <circle cx="6" cy="2" r="2.2" fill="#fca311" />
          </g>
        </g>
      );

    // 8. Şifre Atölyesi (3D Golden Key & Encrypted Tablet)
    case 'symbol_coding':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="52" rx="20" ry="4.5" fill="#11293d" opacity="0.2" />

          {/* Sapphire Cipher Tablet */}
          <rect
            x="10"
            y="16"
            width="34"
            height="34"
            rx="10"
            fill={`url(#${uid}-blue-sphere)`}
            stroke="#93c5fd"
            strokeWidth="1.5"
          />
          <text x="27" y="38" fontSize="20" fontWeight="900" fill="#ffffff" textAnchor="middle">
            #
          </text>

          {/* Intersecting 3D Golden Key */}
          <g transform="translate(18, 8) rotate(22 20 20)">
            {/* Key Ring Bow */}
            <circle cx="28" cy="12" r="9" fill="none" stroke={`url(#${uid}-yellow-left)`} strokeWidth="4.5" />
            <circle cx="28" cy="12" r="4.5" fill="#ffffff" />
            {/* Key Shaft */}
            <rect x="9" y="10" width="15" height="4" rx="2" fill={`url(#${uid}-yellow-top)`} />
            {/* Key Notched Teeth */}
            <rect x="11" y="14" width="3.5" height="5" rx="1" fill={`url(#${uid}-yellow-left)`} />
            <rect x="17" y="14" width="3" height="4" rx="1" fill={`url(#${uid}-yellow-left)`} />
          </g>
        </g>
      );

    // 9. Gölge Avcısı (3D Glowing Bulb & Cast Silhouette)
    case 'shadow_matching':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          {/* Ground Shadow Silhouette of Shape */}
          <ellipse cx="38" cy="48" rx="18" ry="5" fill="#11293d" opacity="0.32" />

          {/* 3D Shining Bulb / Sun */}
          <circle cx="18" cy="20" r="10" fill={`url(#${uid}-yellow-sphere)`} filter={`url(#${uid}-glow)`} />
          {/* Light Rays */}
          <line x1="7" y1="20" x2="2" y2="20" stroke="#fca311" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="18" y1="9" x2="18" y2="4" stroke="#fca311" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="10" y1="12" x2="6" y2="8" stroke="#fca311" strokeWidth="2.5" strokeLinecap="round" />

          {/* Colorful Toy Shape Casting Shadow */}
          <g transform="translate(24, 18)">
            <polygon
              points="14,2 18,11 28,12 20,18 23,28 14,22 5,28 8,18 0,12 10,11"
              fill={`url(#${uid}-pink-top)`}
              stroke="#ffffff"
              strokeWidth="1.2"
            />
            <circle cx="14" cy="14" r="3" fill="#ffffff" opacity="0.8" />
          </g>
        </g>
      );

    // 10. Katmanların Sırrı (Cascading Overlapping 3D Acrylic Cards)
    case 'spatial_relationship':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="54" rx="22" ry="4.5" fill="#11293d" opacity="0.22" />

          {/* Layer 1 (Bottom): Deep Sapphire Card */}
          <g transform="translate(8, 20)">
            <rect x="0" y="0" width="34" height="24" rx="7" fill={`url(#${uid}-blue-left)`} />
            <rect x="0" y="0" width="34" height="24" rx="7" stroke="#93c5fd" strokeWidth="1" />
          </g>

          {/* Layer 2 (Middle): Solar Amber Card */}
          <g transform="translate(18, 14)">
            <rect x="0" y="0" width="34" height="24" rx="7" fill={`url(#${uid}-yellow-top)`} />
            <rect x="0" y="0" width="34" height="24" rx="7" stroke="#fde047" strokeWidth="1" />
          </g>

          {/* Layer 3 (Top): Emerald Green Card with Star */}
          <g transform="translate(26, 8)">
            <rect x="0" y="0" width="30" height="22" rx="7" fill={`url(#${uid}-green-top)`} />
            <rect x="0" y="0" width="30" height="22" rx="7" stroke="#ffffff" strokeWidth="1.2" />
            <circle cx="15" cy="11" r="4.5" fill="#ffffff" />
          </g>
        </g>
      );

    // 11. Sözcük Köprüleri (3D Infinity Rainbow Ribbon with Letter Cubes)
    case 'verbal_analogy':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="52" rx="24" ry="4.5" fill="#11293d" opacity="0.2" />

          {/* 3D Infinity Loop Arch */}
          <path
            d="M 16 32 C 16 22 28 22 32 32 C 36 42 48 42 48 32 C 48 22 36 22 32 32 C 28 42 16 42 16 32 Z"
            fill="none"
            stroke={`url(#${uid}-violet-sphere)`}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 16 32 C 16 22 28 22 32 32 C 36 42 48 42 48 32"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Toy Cube 'A' (Turquoise) */}
          <g transform="translate(8, 14)">
            <rect x="0" y="0" width="16" height="16" rx="4" fill={`url(#${uid}-cyan-sphere)`} stroke="#ffffff" strokeWidth="1" />
            <text x="8" y="12" fontSize="10" fontWeight="900" fill="#ffffff" textAnchor="middle">
              A
            </text>
          </g>

          {/* Toy Cube 'B' (Warm Coral) */}
          <g transform="translate(40, 30)">
            <rect x="0" y="0" width="16" height="16" rx="4" fill={`url(#${uid}-pink-sphere)`} stroke="#ffffff" strokeWidth="1" />
            <text x="8" y="12" fontSize="10" fontWeight="900" fill="#ffffff" textAnchor="middle">
              B
            </text>
          </g>
        </g>
      );

    // 12. Yukarıdan Bak (3D Stepped Architectural Tower seen from Top-3/4)
    case 'top_view':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="55" rx="22" ry="5.5" fill="#11293d" opacity="0.25" />

          {/* Base Level: Deep Sapphire Isometric Block */}
          <polygon points="32,22 54,32 32,42 10,32" fill={`url(#${uid}-blue-top)`} />
          <polygon points="10,32 32,42 32,50 10,40" fill={`url(#${uid}-blue-left)`} />
          <polygon points="32,42 54,32 54,40 32,50" fill={`url(#${uid}-blue-right)`} />

          {/* Middle Level: Emerald Stepped Block */}
          <polygon points="32,15 47,22 32,29 17,22" fill={`url(#${uid}-green-top)`} />
          <polygon points="17,22 32,29 32,36 17,29" fill={`url(#${uid}-green-left)`} />
          <polygon points="32,29 47,22 47,29 32,36" fill={`url(#${uid}-green-right)`} />

          {/* Top Level: Golden Penthouse Cube */}
          <polygon points="32,8 41,12 32,16 23,12" fill={`url(#${uid}-yellow-top)`} />
          <polygon points="23,12 32,16 32,22 23,18" fill={`url(#${uid}-yellow-left)`} />
          <polygon points="32,16 41,12 41,18 32,22" fill={`url(#${uid}-yellow-right)`} />

          {/* Perspective Beacon Point */}
          <circle cx="32" cy="8" r="2.2" fill="#ffffff" />
        </g>
      );

    // 13. Parçadan Bütüne (3D Interlocking Jigsaw Puzzle Pieces)
    case 'shape_combination':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="52" rx="20" ry="4.5" fill="#11293d" opacity="0.2" />

          {/* Left Piece (Cyan Blue) */}
          <path
            d="M 12 16 H 26 C 26 20 31 20 31 25 C 31 30 26 30 26 34 H 12 V 16 Z"
            fill={`url(#${uid}-cyan-sphere)`}
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <circle cx="19" cy="25" r="3" fill="#ffffff" opacity="0.8" />

          {/* Right Piece (Ruby Coral) Interlocking */}
          <path
            d="M 28 34 C 28 30 33 30 33 25 C 33 20 28 20 28 16 H 48 V 48 H 28 V 34 Z"
            fill={`url(#${uid}-pink-sphere)`}
            stroke="#ffffff"
            strokeWidth="1.2"
          />

          {/* Snapping Magic Sparks */}
          <polygon points="32,14 34,17 32,20 30,17" fill="#fca311" />
          <polygon points="34,35 36,37 34,39 32,37" fill="#fca311" />
        </g>
      );

    // 14. Eksik Parçayı Bul (3D Disc with Floating Key Wedge)
    case 'figure_completion':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="30" cy="52" rx="20" ry="4.5" fill="#11293d" opacity="0.2" />

          {/* Main 3D Disc with Missing Cutout at Top-Right */}
          <path
            d="M 28 30 L 44 30 A 18 18 0 1 1 28 12 Z"
            fill={`url(#${uid}-violet-sphere)`}
            stroke="#ffffff"
            strokeWidth="1.2"
          />

          {/* The Floating Matching Golden Wedge */}
          <g transform="translate(35, 10)">
            <path
              d="M 0 15 L 14 15 A 16 16 0 0 0 0 1 Z"
              fill={`url(#${uid}-yellow-top)`}
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
            {/* Action sparks */}
            <circle cx="10" cy="6" r="1.8" fill="#ffffff" />
            <line x1="2" y1="18" x2="2" y2="22" stroke="#fca311" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
      );

    // 15. Hangisi Daha Ağır? (3D Tilted Fulcrum Balance Scale)
    case 'weight_comparison':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="54" rx="24" ry="4.5" fill="#11293d" opacity="0.2" />

          {/* Triangular Golden Fulcrum Stand */}
          <polygon points="32,32 37,49 27,49" fill={`url(#${uid}-yellow-left)`} stroke="#b45309" strokeWidth="1" />
          <circle cx="32" cy="32" r="3" fill="#fef08a" />

          {/* Tilted Balance Beam (Left tilted down = heavier) */}
          <line x1="10" y1="40" x2="54" y2="24" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          <line x1="10" y1="40" x2="54" y2="24" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

          {/* Left Pan (Heavy) with Solid Sapphire Sphere */}
          <circle cx="12" cy="33" r="9" fill={`url(#${uid}-blue-sphere)`} />

          {/* Right Pan (Light) with Small Feather/Sphere */}
          <circle cx="52" cy="18" r="4.5" fill={`url(#${uid}-pink-sphere)`} />
        </g>
      );

    // 16. Terazide Eşitlik (Level Scale with Golden '=' and Balanced Solids)
    case 'shape_equation':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="53" rx="24" ry="4.5" fill="#11293d" opacity="0.2" />

          {/* Central Fulcrum Pedestal */}
          <rect x="29" y="30" width="6" height="20" rx="3" fill={`url(#${uid}-green-left)`} />

          {/* Level Crossbeam */}
          <rect x="6" y="27" width="52" height="4.5" rx="2.2" fill="#334155" />
          <rect x="6" y="27" width="52" height="2" rx="1" fill="#64748b" />

          {/* Left Side: 3D Blue Cube */}
          <g transform="translate(10, 14)">
            <rect x="0" y="0" width="12" height="12" rx="3" fill={`url(#${uid}-blue-sphere)`} stroke="#ffffff" strokeWidth="1" />
          </g>

          {/* Right Side: Two 3D Golden Spheres */}
          <circle cx="46" cy="20" r="5.5" fill={`url(#${uid}-yellow-sphere)`} />
          <circle cx="55" cy="20" r="5.5" fill={`url(#${uid}-yellow-sphere)`} />

          {/* Center: Glowing 3D '=' Sign */}
          <g transform="translate(25, 10)">
            <rect x="0" y="0" width="14" height="4" rx="2" fill="#10b981" />
            <rect x="0" y="6" width="14" height="4" rx="2" fill="#10b981" />
          </g>
        </g>
      );

    // 17. Hafıza Bahçesi (Vibrant 3D Flower with Sparkling Diamond Center)
    case 'visual_memory':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="54" rx="20" ry="4.5" fill="#11293d" opacity="0.2" />

          {/* 5 Plump 3D Petals in Vivid Playful Hues */}
          {/* Top Petal (Coral) */}
          <circle cx="32" cy="18" r="9" fill={`url(#${uid}-pink-sphere)`} />
          {/* Right Petal (Solar Gold) */}
          <circle cx="44" cy="28" r="9" fill={`url(#${uid}-yellow-sphere)`} />
          {/* Bottom-Right Petal (Emerald) */}
          <circle cx="39" cy="41" r="9" fill={`url(#${uid}-green-sphere)`} />
          {/* Bottom-Left Petal (Sapphire) */}
          <circle cx="25" cy="41" r="9" fill={`url(#${uid}-blue-sphere)`} />
          {/* Left Petal (Amethyst) */}
          <circle cx="20" cy="28" r="9" fill={`url(#${uid}-violet-sphere)`} />

          {/* Center Sparkling 3D Diamond Gem */}
          <circle cx="32" cy="30" r="8" fill="#ffffff" />
          <polygon
            points="32,23 37,28 32,37 27,28"
            fill={`url(#${uid}-yellow-top)`}
            stroke="#f59e0b"
            strokeWidth="0.8"
          />
          <polygon points="32,23 37,28 32,30 27,28" fill="#ffffff" opacity="0.9" />

          {/* Memory Gleam Star */}
          <polygon points="46,14 48,17 46,20 44,17" fill="#fca311" />
        </g>
      );

    // 18. Sayıların Ritmi (3D Stepping Cylinders + Jumping Star with +2)
    case 'number_pattern':
      return (
        <g filter={`url(#${uid}-shadow)`}>
          <ellipse cx="32" cy="54" rx="24" ry="4.5" fill="#11293d" opacity="0.2" />

          {/* Step 1: Low Cylinder (Blue) */}
          <g transform="translate(6, 34)">
            <ellipse cx="9" cy="12" rx="9" ry="3.5" fill={`url(#${uid}-blue-left)`} />
            <rect x="0" y="3.5" width="18" height="8.5" fill={`url(#${uid}-blue-left)`} />
            <ellipse cx="9" cy="3.5" rx="9" ry="3.5" fill={`url(#${uid}-blue-top)`} stroke="#ffffff" strokeWidth="0.8" />
          </g>

          {/* Step 2: Medium Cylinder (Green) */}
          <g transform="translate(23, 26)">
            <ellipse cx="9" cy="20" rx="9" ry="3.5" fill={`url(#${uid}-green-left)`} />
            <rect x="0" y="3.5" width="18" height="16.5" fill={`url(#${uid}-green-left)`} />
            <ellipse cx="9" cy="3.5" rx="9" ry="3.5" fill={`url(#${uid}-green-top)`} stroke="#ffffff" strokeWidth="0.8" />
          </g>

          {/* Step 3: High Cylinder (Gold) */}
          <g transform="translate(40, 18)">
            <ellipse cx="9" cy="28" rx="9" ry="3.5" fill={`url(#${uid}-yellow-right)`} />
            <rect x="0" y="3.5" width="18" height="24.5" fill={`url(#${uid}-yellow-left)`} />
            <ellipse cx="9" cy="3.5" rx="9" ry="3.5" fill={`url(#${uid}-yellow-top)`} stroke="#ffffff" strokeWidth="0.8" />
          </g>

          {/* Jumping Star with +2 Arc */}
          <path
            d="M 15 28 Q 32 8 49 14"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="3 3"
          />
          <polygon
            points="32,4 34,9 39,10 35,14 36,19 32,16 28,19 29,14 25,10 30,9"
            fill="#f43f7a"
            stroke="#ffffff"
            strokeWidth="1"
          />
        </g>
      );

    default:
      return fallback ? (
        <text x="32" y="38" fontSize="22" fontWeight="800" textAnchor="middle" fill="#11293d">
          {fallback}
        </text>
      ) : null;
  }
}
