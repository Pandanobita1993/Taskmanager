import React from 'react';
import type { MascotAccessoryId } from '../../lib/mascot';

interface AnchorPoint {
  /** Horizontal center in % of sprite box */
  x: number;
  /** Vertical center in % of sprite box */
  y: number;
  /** Width in % of sprite box */
  w: number;
  /** Optional rotation in degrees */
  rotate?: number;
}

interface MascotAnchors {
  headTop: AnchorPoint;
  eyes: AnchorPoint;
  side: AnchorPoint;
}

/**
 * Per-species anchor coordinates (% of 512x512 sprite) measured from each
 * *_open.png sprite so one shared accessory set fits all 18 mascots cleanly.
 */
const DEFAULT_ANCHORS: MascotAnchors = {
  headTop: { x: 50, y: 10, w: 46 },
  eyes: { x: 50, y: 38, w: 46 },
  side: { x: 83, y: 74, w: 32 },
};

const MASCOT_ANCHORS: Record<string, MascotAnchors> = {
  capybara: {
    headTop: { x: 49.3, y: 8.5, w: 42 },
    eyes: { x: 49.3, y: 35.0, w: 48 },
    side: { x: 84, y: 74, w: 30 },
  },
  rat: {
    headTop: { x: 47.8, y: 14.0, w: 40 },
    eyes: { x: 47.8, y: 34.5, w: 44 },
    side: { x: 83, y: 74, w: 30 },
  },
  buffalo: {
    headTop: { x: 48.5, y: 12.0, w: 40 },
    eyes: { x: 48.5, y: 36.5, w: 44 },
    side: { x: 84, y: 74, w: 30 },
  },
  tiger: {
    headTop: { x: 47.3, y: 11.0, w: 42 },
    eyes: { x: 47.3, y: 33.5, w: 45 },
    side: { x: 84, y: 74, w: 30 },
  },
  cat: {
    headTop: { x: 47.8, y: 14.5, w: 40 },
    eyes: { x: 47.8, y: 34.5, w: 44 },
    side: { x: 84, y: 74, w: 30 },
  },
  dragon: {
    headTop: { x: 43.0, y: 12.5, w: 42 },
    eyes: { x: 42.8, y: 39.0, w: 41 },
    side: { x: 84, y: 74, w: 30 },
  },
  snake: {
    headTop: { x: 46.5, y: 17.0, w: 42 },
    eyes: { x: 46.5, y: 37.5, w: 47 },
    side: { x: 84, y: 74, w: 32 },
  },
  horse: {
    headTop: { x: 48.5, y: 11.0, w: 40 },
    eyes: { x: 48.3, y: 34.0, w: 43 },
    side: { x: 84, y: 74, w: 30 },
  },
  goat: {
    headTop: { x: 47.8, y: 11.5, w: 40 },
    eyes: { x: 47.8, y: 35.0, w: 43 },
    side: { x: 84, y: 74, w: 30 },
  },
  monkey: {
    headTop: { x: 45.5, y: 11.0, w: 42 },
    eyes: { x: 45.5, y: 38.5, w: 42 },
    side: { x: 84, y: 74, w: 30 },
  },
  rooster: {
    headTop: { x: 44.0, y: 11.0, w: 38 },
    eyes: { x: 43.5, y: 37.5, w: 40 },
    side: { x: 83, y: 74, w: 30 },
  },
  dog: {
    headTop: { x: 48.8, y: 10.0, w: 42 },
    eyes: { x: 48.8, y: 32.5, w: 43 },
    side: { x: 84, y: 74, w: 30 },
  },
  pig: {
    headTop: { x: 46.0, y: 12.0, w: 42 },
    eyes: { x: 45.8, y: 34.0, w: 42 },
    side: { x: 84, y: 74, w: 30 },
  },
  panda: {
    headTop: { x: 46.3, y: 11.0, w: 42 },
    eyes: { x: 46.3, y: 34.0, w: 45 },
    side: { x: 84, y: 74, w: 30 },
  },
  fox: {
    headTop: { x: 41.0, y: 14.0, w: 40 },
    eyes: { x: 41.0, y: 42.0, w: 42 },
    side: { x: 85, y: 74, w: 30 },
  },
  rabbit: {
    headTop: { x: 43.5, y: 19.0, w: 38 },
    eyes: { x: 43.3, y: 40.5, w: 41 },
    side: { x: 83, y: 74, w: 30 },
  },
  penguin: {
    headTop: { x: 45.5, y: 11.0, w: 42 },
    eyes: { x: 45.3, y: 34.5, w: 41 },
    side: { x: 83, y: 74, w: 30 },
  },
  frog: {
    headTop: { x: 49.0, y: 9.0, w: 42 },
    eyes: { x: 48.8, y: 27.5, w: 56 },
    side: { x: 84, y: 74, w: 30 },
  },
};

function renderAccessorySvg(accessory: MascotAccessoryId): React.ReactNode {
  switch (accessory) {
    case 'bucket_hat':
      return (
        <svg viewBox="0 0 120 72" className="w-full h-auto drop-shadow-sm overflow-visible">
          {/* Crown of TNXP green bucket hat */}
          <path
            d="M28 44 C30 16, 42 10, 60 10 C78 10, 90 16, 92 44 Z"
            fill="#3D7A52"
            stroke="#3E2723"
            strokeWidth="4.2"
            strokeLinejoin="round"
          />
          {/* Subtle top highlight */}
          <path
            d="M39 20 C47 15, 65 15, 75 19"
            fill="none"
            stroke="#66A87A"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Hat band */}
          <path
            d="M28 39 Q60 45 92 39"
            fill="none"
            stroke="#2B593B"
            strokeWidth="4.5"
          />
          {/* Soft drooping bucket brim */}
          <path
            d="M10 53 C20 40, 40 37, 60 37 C80 37, 100 40, 110 53 C106 60, 88 58, 60 58 C32 58, 14 60, 10 53 Z"
            fill="#4E9466"
            stroke="#3E2723"
            strokeWidth="4.2"
            strokeLinejoin="round"
          />
          {/* Stitching line on brim */}
          <path
            d="M19 52 C34 45, 86 45, 101 52"
            fill="none"
            stroke="#2B593B"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
          {/* Mini Vietnamese Flag Badge */}
          <g transform="translate(49, 19)">
            <rect
              x="0"
              y="0"
              width="22"
              height="15"
              rx="2.5"
              fill="#DA251D"
              stroke="#3E2723"
              strokeWidth="2.4"
            />
            <polygon
              points="11,2.6 12.4,6.4 16.4,6.4 13.2,8.8 14.4,12.6 11,10.2 7.6,12.6 8.8,8.8 5.6,6.4 9.6,6.4"
              fill="#FFFF00"
            />
          </g>
        </svg>
      );

    case 'crown':
      return (
        <svg viewBox="0 0 120 74" className="w-full h-auto drop-shadow-sm overflow-visible">
          <defs>
            <linearGradient id="princessCrownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#EAB308" />
            </linearGradient>
          </defs>
          {/* Crown body */}
          <path
            d="M22 56 L16 24 L39 38 L60 12 L81 38 L104 24 L98 56 C82 61, 38 61, 22 56 Z"
            fill="url(#princessCrownGrad)"
            stroke="#3E2723"
            strokeWidth="4.2"
            strokeLinejoin="round"
          />
          {/* Base rim */}
          <path
            d="M22 52 Q60 58 98 52"
            fill="none"
            stroke="#CA8A04"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Pearl tips */}
          <circle cx="15" cy="21" r="4.8" fill="#FFFDF7" stroke="#3E2723" strokeWidth="2.8" />
          <circle cx="60" cy="10" r="5.8" fill="#FFFDF7" stroke="#3E2723" strokeWidth="2.8" />
          <circle cx="105" cy="21" r="4.8" fill="#FFFDF7" stroke="#3E2723" strokeWidth="2.8" />
          {/* Princess gems */}
          <path
            d="M60 31 L67 41 L60 49 L53 41 Z"
            fill="#F472B6"
            stroke="#3E2723"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <circle cx="38" cy="45" r="4.2" fill="#38BDF8" stroke="#3E2723" strokeWidth="2.2" />
          <circle cx="82" cy="45" r="4.2" fill="#38BDF8" stroke="#3E2723" strokeWidth="2.2" />
          {/* Gem sparkle */}
          <circle cx="58.5" cy="38" r="1.6" fill="#FFFFFF" />
        </svg>
      );

    case 'sunglasses':
      return (
        <svg viewBox="0 0 140 52" className="w-full h-auto drop-shadow-sm overflow-visible">
          {/* Temple arms */}
          <line x1="4" y1="16" x2="14" y2="18" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
          <line x1="126" y1="18" x2="136" y2="16" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
          {/* Left dark lens */}
          <path
            d="M11 12 H61 C62 29, 55 43, 37 43 C19 43, 12 31, 11 12 Z"
            fill="#18181B"
            stroke="#09090B"
            strokeWidth="4.2"
            strokeLinejoin="round"
          />
          {/* Right dark lens */}
          <path
            d="M79 12 H129 C128 31, 121 43, 103 43 C85 43, 78 29, 79 12 Z"
            fill="#18181B"
            stroke="#09090B"
            strokeWidth="4.2"
            strokeLinejoin="round"
          />
          {/* Bridge */}
          <path d="M59 15 Q70 11 81 15" fill="none" stroke="#09090B" strokeWidth="5" strokeLinecap="round" />
          {/* Cool glossy white reflections */}
          <line x1="22" y1="19" x2="31" y2="33" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.82" />
          <line x1="31" y1="18" x2="37" y2="27" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.65" />
          <line x1="90" y1="19" x2="99" y2="33" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.82" />
          <line x1="99" y1="18" x2="105" y2="27" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.65" />
        </svg>
      );

    case 'nerd_glasses':
      return (
        <svg viewBox="0 0 140 58" className="w-full h-auto drop-shadow-sm overflow-visible">
          {/* Left round thick lens */}
          <circle cx="36" cy="29" r="23" fill="#E0F2FE" fillOpacity="0.68" stroke="#3E2723" strokeWidth="4.4" />
          {/* Right round thick lens */}
          <circle cx="104" cy="29" r="23" fill="#E0F2FE" fillOpacity="0.68" stroke="#3E2723" strokeWidth="4.4" />
          {/* Bridge */}
          <path d="M59 27 Q70 21 81 27" fill="none" stroke="#3E2723" strokeWidth="4.2" strokeLinecap="round" />
          {/* Swirl concentric rings ("cận lòi trĩ") */}
          <circle cx="36" cy="29" r="15.5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeOpacity="0.85" />
          <circle cx="36" cy="29" r="9.5" fill="none" stroke="#7DD3FC" strokeWidth="2.4" strokeOpacity="0.9" />
          <circle cx="36" cy="29" r="4" fill="#3E2723" />
          <circle cx="104" cy="29" r="15.5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeOpacity="0.85" />
          <circle cx="104" cy="29" r="9.5" fill="none" stroke="#7DD3FC" strokeWidth="2.4" strokeOpacity="0.9" />
          <circle cx="104" cy="29" r="4" fill="#3E2723" />
          {/* Tiny lens glints */}
          <circle cx="27" cy="20" r="2.6" fill="#FFFFFF" />
          <circle cx="95" cy="20" r="2.6" fill="#FFFFFF" />
        </svg>
      );

    case 'boba_tea':
      return (
        <svg viewBox="0 0 90 120" className="w-full h-auto drop-shadow-sm overflow-visible">
          {/* Curved straw bending left toward the mascot */}
          <path
            d="M46 42 L46 22 Q46 9 25 8"
            fill="none"
            stroke="#3E2723"
            strokeWidth="9.5"
            strokeLinecap="round"
          />
          <path
            d="M46 42 L46 22 Q46 9 25 8"
            fill="none"
            stroke="#FFFDF9"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Dome lid */}
          <path
            d="M20 47 C22 31, 34 27, 46 27 C58 27, 70 31, 72 47 Z"
            fill="#FFFFFF"
            fillOpacity="0.92"
            stroke="#3E2723"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
          {/* Cup body */}
          <path
            d="M20 49 H72 L65 107 C64.5 111, 60 113, 46 113 C32 113, 27.5 111, 27 107 Z"
            fill="#FDF2E9"
            stroke="#3E2723"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Milk tea fill */}
          <path
            d="M22.5 58 H69.5 L63.5 106 C63 109.5, 59 111, 46 111 C33 111, 29 109.5, 28.5 106 Z"
            fill="#E8BE96"
          />
          {/* Brown sugar swirl */}
          <path
            d="M26 76 Q38 84 48 77 T66 82"
            fill="none"
            stroke="#9A5B25"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
          {/* Tapioca pearls */}
          <circle cx="35" cy="103" r="4.2" fill="#3E2723" />
          <circle cx="44" cy="105" r="4.2" fill="#3E2723" />
          <circle cx="53" cy="104" r="4.2" fill="#3E2723" />
          <circle cx="59" cy="99" r="3.8" fill="#4A2C18" />
          <circle cx="39" cy="95" r="3.8" fill="#4A2C18" />
          <circle cx="49" cy="96" r="3.8" fill="#4A2C18" />
          {/* Lid rim */}
          <rect
            x="17"
            y="45"
            width="58"
            height="7"
            rx="3.5"
            fill="#FFFFFF"
            stroke="#3E2723"
            strokeWidth="3.6"
          />
          {/* Gloss highlight */}
          <line x1="29" y1="62" x2="32" y2="92" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.65" />
        </svg>
      );

    default:
      return null;
  }
}

interface MascotAccessoryLayerProps {
  mascotType: string;
  accessory?: MascotAccessoryId;
}

export const MascotAccessoryLayer: React.FC<MascotAccessoryLayerProps> = ({
  mascotType,
  accessory = 'none',
}) => {
  if (!accessory || accessory === 'none') return null;

  const anchors = MASCOT_ANCHORS[mascotType] || DEFAULT_ANCHORS;
  const slot: AnchorPoint =
    accessory === 'bucket_hat' || accessory === 'crown'
      ? anchors.headTop
      : accessory === 'sunglasses' || accessory === 'nerd_glasses'
      ? anchors.eyes
      : anchors.side;

  return (
    <div
      className="absolute pointer-events-none select-none"
      aria-hidden="true"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        width: `${slot.w}%`,
        transform: `translate(-50%, -50%)${slot.rotate ? ` rotate(${slot.rotate}deg)` : ''}`,
        zIndex: 10,
      }}
    >
      {renderAccessorySvg(accessory)}
    </div>
  );
};
