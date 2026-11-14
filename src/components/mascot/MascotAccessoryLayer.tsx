import React from 'react';
import type { MascotAccessoryId, MascotVariant } from '../../lib/mascot';

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
    headTop: { x: 43.9, y: 7.5, w: 46 },
    eyes: { x: 43.9, y: 36.5, w: 62 },
    side: { x: 84, y: 74, w: 30 },
  },
  rat: {
    headTop: { x: 49.3, y: 14.0, w: 44 },
    eyes: { x: 49.3, y: 35.4, w: 55 },
    side: { x: 83, y: 74, w: 30 },
  },
  buffalo: {
    headTop: { x: 47.5, y: 11.5, w: 42 },
    eyes: { x: 47.5, y: 35.7, w: 53 },
    side: { x: 84, y: 74, w: 30 },
  },
  tiger: {
    headTop: { x: 43.6, y: 6.5, w: 46 },
    eyes: { x: 43.6, y: 32.6, w: 54 },
    side: { x: 84, y: 74, w: 30 },
  },
  cat: {
    headTop: { x: 47.4, y: 10.5, w: 44 },
    eyes: { x: 47.4, y: 35.6, w: 59 },
    side: { x: 80, y: 74, w: 30 },
  },
  dragon: {
    headTop: { x: 38.3, y: 8.5, w: 44 },
    eyes: { x: 38.3, y: 39.7, w: 52 },
    side: { x: 84, y: 74, w: 30 },
  },
  snake: {
    headTop: { x: 46.8, y: 14.5, w: 44 },
    eyes: { x: 46.8, y: 37.7, w: 62 },
    side: { x: 84, y: 74, w: 32 },
  },
  horse: {
    headTop: { x: 46.1, y: 9.0, w: 42 },
    eyes: { x: 46.1, y: 34.8, w: 54 },
    side: { x: 84, y: 74, w: 30 },
  },
  goat: {
    headTop: { x: 47.6, y: 9.5, w: 40 },
    eyes: { x: 47.6, y: 34.5, w: 54 },
    side: { x: 84, y: 74, w: 30 },
  },
  monkey: {
    headTop: { x: 45.9, y: 7.5, w: 46 },
    eyes: { x: 45.9, y: 39.2, w: 54 },
    side: { x: 78, y: 74, w: 30 },
  },
  rooster: {
    headTop: { x: 42.1, y: 9.5, w: 42 },
    eyes: { x: 42.1, y: 36.1, w: 54 },
    side: { x: 79, y: 74, w: 30 },
  },
  dog: {
    headTop: { x: 46.6, y: 6.5, w: 46 },
    eyes: { x: 46.6, y: 30.3, w: 55 },
    side: { x: 84, y: 74, w: 30 },
  },
  pig: {
    headTop: { x: 41.9, y: 7.5, w: 46 },
    eyes: { x: 41.9, y: 32.8, w: 68 },
    side: { x: 84, y: 74, w: 30 },
  },
  panda: {
    headTop: { x: 45.2, y: 8.0, w: 46 },
    eyes: { x: 45.2, y: 33.2, w: 64 },
    side: { x: 84, y: 74, w: 30 },
  },
  fox: {
    headTop: { x: 36.1, y: 12.0, w: 42 },
    eyes: { x: 36.1, y: 40.0, w: 53 },
    side: { x: 78, y: 74, w: 30 },
  },
  rabbit: {
    headTop: { x: 43.6, y: 17.5, w: 38 },
    eyes: { x: 43.6, y: 42.4, w: 51 },
    side: { x: 78, y: 74, w: 30 },
  },
  penguin: {
    headTop: { x: 44.0, y: 7.0, w: 46 },
    eyes: { x: 44.0, y: 33.9, w: 60 },
    side: { x: 80, y: 74, w: 30 },
  },
  frog: {
    headTop: { x: 49.2, y: 7.0, w: 46 },
    eyes: { x: 49.2, y: 26.1, w: 70 },
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
          <circle cx="36" cy="29" r="23" fill="#E0F2FE" fillOpacity="0.62" stroke="#3E2723" strokeWidth="4.4" />
          {/* Right round thick lens */}
          <circle cx="104" cy="29" r="23" fill="#E0F2FE" fillOpacity="0.62" stroke="#3E2723" strokeWidth="4.4" />
          {/* Bridge */}
          <path d="M59 27 Q70 21 81 27" fill="none" stroke="#3E2723" strokeWidth="4.2" strokeLinecap="round" />
          {/* True spiral swirls ("cận lòi trĩ") */}
          <path
            d="M36.0,29.0 L36.4,29.1 L36.6,29.5 L36.6,30.0 L36.3,30.5 L35.7,30.9 L34.8,31.0 L33.9,30.7 L33.1,30.1 L32.5,29.0 L32.3,27.7 L32.7,26.3 L33.7,25.0 L35.1,24.0 L36.9,23.6 L38.9,23.9 L40.8,25.0 L42.2,26.7 L43.0,29.0 L42.9,31.5 L42.0,34.0 L40.1,36.1 L37.5,37.4 L34.4,37.8 L31.3,37.1 L28.6,35.2 L26.5,32.5 L25.5,29.0 L25.8,25.3 L27.4,21.8 L30.2,18.9 L33.9,17.1 L38.2,16.7 L42.4,17.9 L46.1,20.5 L48.8,24.3 L50.0,29.0 L49.5,33.9 L47.3,38.5 L43.6,42.1 L38.7,44.3 L33.2,44.7 L27.8,43.1 L23.2,39.7 L19.9,34.9 L18.5,29.0"
            fill="none"
            stroke="#3E2723"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M104.0,29.0 L104.4,29.1 L104.6,29.5 L104.6,30.0 L104.3,30.5 L103.7,30.9 L102.8,31.0 L101.9,30.7 L101.1,30.1 L100.5,29.0 L100.3,27.7 L100.7,26.3 L101.7,25.0 L103.1,24.0 L104.9,23.6 L106.9,23.9 L108.8,25.0 L110.2,26.7 L111.0,29.0 L110.9,31.5 L110.0,34.0 L108.1,36.1 L105.5,37.4 L102.4,37.8 L99.3,37.1 L96.6,35.2 L94.5,32.5 L93.5,29.0 L93.8,25.3 L95.4,21.8 L98.2,18.9 L101.9,17.1 L106.2,16.7 L110.4,17.9 L114.1,20.5 L116.8,24.3 L118.0,29.0 L117.5,33.9 L115.3,38.5 L111.6,42.1 L106.7,44.3 L101.2,44.7 L95.8,43.1 L91.2,39.7 L87.9,34.9 L86.5,29.0"
            fill="none"
            stroke="#3E2723"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Tiny lens glints */}
          <circle cx="25" cy="18" r="2.4" fill="#FFFFFF" />
          <circle cx="93" cy="18" r="2.4" fill="#FFFFFF" />
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
  variant?: MascotVariant;
}

export const MascotAccessoryLayer: React.FC<MascotAccessoryLayerProps> = ({
  mascotType,
  accessory = 'none',
  variant = 'default',
}) => {
  const isFeminine = variant === 'feminine';
  const hasAccessory = Boolean(accessory && accessory !== 'none');
  if (!isFeminine && !hasAccessory) return null;

  const anchors = MASCOT_ANCHORS[mascotType] || DEFAULT_ANCHORS;
  const slot: AnchorPoint =
    accessory === 'bucket_hat' || accessory === 'crown'
      ? anchors.headTop
      : accessory === 'sunglasses' || accessory === 'nerd_glasses'
      ? anchors.eyes
      : anchors.side;

  const showLashes = isFeminine && accessory !== 'sunglasses';

  return (
    <>
      {isFeminine && (
        <>
          {/* Eyelashes & rosy cheek glow aligned to the mascot's exact eye centroids */}
          <div
            className="absolute pointer-events-none select-none"
            aria-hidden="true"
            style={{
              left: `${anchors.eyes.x}%`,
              top: `${anchors.eyes.y}%`,
              width: `${anchors.eyes.w}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 8,
            }}
          >
            <svg viewBox="0 0 140 58" className="w-full h-auto overflow-visible">
              {/* Soft rosy cheek blush */}
              <ellipse cx="18" cy="45" rx="11" ry="6" fill="#FB7185" fillOpacity="0.24" />
              <ellipse cx="122" cy="45" rx="11" ry="6" fill="#FB7185" fillOpacity="0.24" />
              {showLashes && (
                <g stroke="#3E2723" strokeWidth="2.6" strokeLinecap="round" fill="none">
                  {/* Left eye outer curved lashes */}
                  <path d="M23 19 Q17 13 13 15" />
                  <path d="M26 15 Q22 9 18 9" />
                  {/* Right eye outer curved lashes */}
                  <path d="M117 19 Q123 13 127 15" />
                  <path d="M114 15 Q118 9 122 9" />
                </g>
              )}
            </svg>
          </div>

          {/* Cute pastel pink ribbon bow beside the right ear/temple (avoids center hat/crown) */}
          <div
            className="absolute pointer-events-none select-none"
            aria-hidden="true"
            style={{
              left: `${anchors.headTop.x + anchors.headTop.w * 0.42}%`,
              top: `${anchors.headTop.y + 4.5}%`,
              width: '24%',
              transform: 'translate(-50%, -50%) rotate(18deg)',
              zIndex: 9,
            }}
          >
            <svg viewBox="0 0 80 56" className="w-full h-auto drop-shadow-sm overflow-visible">
              {/* Left ribbon wing */}
              <path
                d="M38 28 C25 12, 8 11, 8 27 C8 43, 25 42, 38 28 Z"
                fill="#F472B6"
                stroke="#3E2723"
                strokeWidth="3.6"
                strokeLinejoin="round"
              />
              {/* Right ribbon wing */}
              <path
                d="M42 28 C55 12, 72 11, 72 27 C72 43, 55 42, 42 28 Z"
                fill="#F472B6"
                stroke="#3E2723"
                strokeWidth="3.6"
                strokeLinejoin="round"
              />
              {/* Ribbon tails */}
              <path
                d="M36 33 L26 50 L35 46 Z"
                fill="#EC4899"
                stroke="#3E2723"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M44 33 L54 50 L45 46 Z"
                fill="#EC4899"
                stroke="#3E2723"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {/* Polka dots */}
              <circle cx="20" cy="24" r="2.6" fill="#FDF2F8" />
              <circle cx="24" cy="33" r="2.1" fill="#FDF2F8" />
              <circle cx="60" cy="24" r="2.6" fill="#FDF2F8" />
              <circle cx="56" cy="33" r="2.1" fill="#FDF2F8" />
              {/* Center knot */}
              <circle cx="40" cy="28" r="7.5" fill="#FBCFE8" stroke="#3E2723" strokeWidth="3.4" />
              {/* Tiny heart sparkle */}
              <path
                d="M68 8 C68 5.5, 71 4.5, 72.5 6.8 C74 4.5, 77 5.5, 77 8 C77 10.8, 72.5 13.5, 72.5 13.5 C72.5 13.5, 68 10.8, 68 8 Z"
                fill="#FB7185"
                stroke="#FFFFFF"
                strokeWidth="1.4"
              />
            </svg>
          </div>
        </>
      )}

      {hasAccessory && (
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
      )}
    </>
  );
};
