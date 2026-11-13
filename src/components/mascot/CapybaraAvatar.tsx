import React, { useMemo } from 'react';
import type { MascotAccessoryId, MascotExpression } from '../../lib/mascot';

interface CapybaraAvatarProps {
  expression?: MascotExpression;
  accessory?: MascotAccessoryId;
  size?: number;
  className?: string;
  withBadgeBg?: boolean;
  isPetting?: boolean;
}

function buildCapybaraSvg(
  expression: MascotExpression,
  accessory: MascotAccessoryId,
  withBadgeBg: boolean,
  isPetting: boolean
): string {
  const isCelebrating = expression === 'celebrating' || isPetting;
  const isSleeping = expression === 'sleeping' && !isPetting;
  const isAlert = expression === 'alert' && !isPetting;
  const isChill = expression === 'chill' && !isPetting;
  const isWorking = expression === 'working' && !isPetting;

  const defs = `<defs>
    <radialGradient id="capyHeadGrad" cx="45%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#E4AA7B" />
      <stop offset="55%" stop-color="#CC8B59" />
      <stop offset="100%" stop-color="#AD6C3E" />
    </radialGradient>
    <radialGradient id="capyBodyGrad" cx="48%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#DA9C6B" />
      <stop offset="65%" stop-color="#BF7F50" />
      <stop offset="100%" stop-color="#9E6036" />
    </radialGradient>
    <radialGradient id="capySnoutGrad" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#F6D7B8" />
      <stop offset="70%" stop-color="#E6BA90" />
      <stop offset="100%" stop-color="#D49F70" />
    </radialGradient>
    <radialGradient id="capyTangerineGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FDBA74" />
      <stop offset="45%" stop-color="#FB923C" />
      <stop offset="100%" stop-color="#EA580C" />
    </radialGradient>
    <linearGradient id="capyGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="capyHelmetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="55%" stop-color="#FACC15" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>
    <radialGradient id="capyCheekGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FB7185" stop-opacity="${isPetting ? '0.68' : '0.48'}" />
      <stop offset="100%" stop-color="#FDA4AF" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="capyBadgeGrad" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFDF5" />
      <stop offset="100%" stop-color="#FEF3C7" />
    </radialGradient>
  </defs>`;

  const bgCircle = withBadgeBg
    ? `<circle cx="60" cy="60" r="57" fill="url(#capyBadgeGrad)" stroke="#F59E0B" stroke-width="3.5" />`
    : '';

  const celebratingSparkles = isCelebrating
    ? `<g>
        <path d="M18 24L20 29L25 31L20 33L18 38L16 33L11 31L16 29Z" fill="#F59E0B">
          <animateTransform attributeName="transform" type="rotate" values="0 18 31; 25 18 31; 0 18 31" dur="1.1s" repeatCount="indefinite" />
        </path>
        <path d="M102 22L103.8 26.2L108 28L103.8 29.8L102 34L100.2 29.8L96 28L100.2 26.2Z" fill="#EC4899">
          <animateTransform attributeName="transform" type="rotate" values="0 102 28; -25 102 28; 0 102 28" dur="1s" repeatCount="indefinite" />
        </path>
        <circle cx="14" cy="52" r="2.8" fill="#10B981">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.75s" repeatCount="indefinite" />
        </circle>
        <circle cx="106" cy="48" r="2.8" fill="#3B82F6">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="0.75s" repeatCount="indefinite" />
        </circle>
      </g>`
    : '';

  const alertBadge = isAlert
    ? `<g>
        <circle cx="101" cy="25" r="10" fill="#EF4444" stroke="#FFFFFF" stroke-width="2">
          <animate attributeName="r" values="10;11;10" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x="101" y="29.5" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="bold" font-family="sans-serif">!</text>
      </g>`
    : '';

  const headband =
    accessory === 'headband'
      ? `<g>
          <path d="M27 45C42 38 78 38 93 45L94 51.5C78 45.5 42 45.5 26 51.5Z" fill="#EF4444" stroke="#4A2C18" stroke-width="2.2" stroke-linejoin="round" />
          <path d="M35 43.5C50 40.5 70 40.5 85 43.5" stroke="#FCA5A5" stroke-width="1.3" stroke-linecap="round" />
          <path d="M92 48L104 43L101 51Z" fill="#DC2626" stroke="#4A2C18" stroke-width="2" stroke-linejoin="round" />
          <path d="M92 50L103 56L96 59Z" fill="#B91C1C" stroke="#4A2C18" stroke-width="2" stroke-linejoin="round" />
        </g>`
      : '';

  const mouth = isCelebrating
    ? `<path d="M53 66Q60 74.5 67 66Z" fill="#F472B6" stroke="#4A2C18" stroke-width="2" stroke-linejoin="round" />
       <ellipse cx="60" cy="69.5" rx="3.5" ry="1.8" fill="#FDA4AF" />`
    : `<path d="M53.5 67Q56.8 70 60 66.8Q63.2 70 66.5 67" stroke="#4A2C18" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />`;

  const eyes = isCelebrating
    ? `<g>
        <path d="M36.5 51.5Q42 44.5 47.5 51.5" stroke="#4A2C18" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M72.5 51.5Q78 44.5 83.5 51.5" stroke="#4A2C18" stroke-width="3" stroke-linecap="round" fill="none" />
      </g>`
    : isSleeping
    ? `<g>
        <path d="M36.5 50.5Q42 55 47.5 50.5" stroke="#4A2C18" stroke-width="2.6" stroke-linecap="round" fill="none" />
        <path d="M72.5 50.5Q78 55 83.5 50.5" stroke="#4A2C18" stroke-width="2.6" stroke-linecap="round" fill="none" />
      </g>`
    : isChill
    ? `<g>
        <line x1="35.5" y1="50" x2="47.5" y2="50" stroke="#4A2C18" stroke-width="2.8" stroke-linecap="round" />
        <line x1="72.5" y1="50" x2="84.5" y2="50" stroke="#4A2C18" stroke-width="2.8" stroke-linecap="round" />
      </g>`
    : `<g>
        <ellipse cx="42" cy="50" rx="4.7" ry="4.9" fill="#2B1810">
          <animate attributeName="ry" values="4.9;4.9;0.5;4.9;4.9" keyTimes="0;0.88;0.92;0.96;1" dur="4s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="40.3" cy="48.1" r="1.7" fill="#FFFFFF" />
        <circle cx="43.8" cy="51.8" r="0.8" fill="#FFFFFF" fill-opacity="0.85" />
        <ellipse cx="78" cy="50" rx="4.7" ry="4.9" fill="#2B1810">
          <animate attributeName="ry" values="4.9;4.9;0.5;4.9;4.9" keyTimes="0;0.88;0.92;0.96;1" dur="4s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="76.3" cy="48.1" r="1.7" fill="#FFFFFF" />
        <circle cx="79.8" cy="51.8" r="0.8" fill="#FFFFFF" fill-opacity="0.85" />
        ${
          isAlert
            ? `<path d="M89.5 44C89.5 44 93.5 49 93.5 52C93.5 54 91.7 55.5 89.5 55.5C87.3 55.5 85.5 54 85.5 52C85.5 49 89.5 44 89.5 44Z" fill="#60A5FA" stroke="#2563EB" stroke-width="0.8">
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,3; 0,0" dur="1.2s" repeatCount="indefinite" />
              </path>`
            : ''
        }
      </g>`;

  const glasses =
    accessory === 'glasses'
      ? `<g>
          <circle cx="42" cy="50" r="9.6" fill="#FFFFFF" fill-opacity="0.2" stroke="#374151" stroke-width="2.2" />
          <path d="M36 46L41 51" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.7" stroke-linecap="round" />
          <circle cx="78" cy="50" r="9.6" fill="#FFFFFF" fill-opacity="0.2" stroke="#374151" stroke-width="2.2" />
          <path d="M72 46L77 51" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.7" stroke-linecap="round" />
          <path d="M51.6 49.5Q60 47.5 68.4 49.5" stroke="#374151" stroke-width="2.2" fill="none" />
          <line x1="27" y1="48" x2="32.4" y2="49.5" stroke="#374151" stroke-width="2" />
          <line x1="87.6" y1="49.5" x2="93" y2="48" stroke="#374151" stroke-width="2" />
        </g>`
      : '';

  const workingLedger = isWorking
    ? `<g transform="translate(41, 84)">
        <rect x="0" y="2" width="38" height="22" rx="3.5" fill="#FFFBEB" stroke="#4A2C18" stroke-width="2" />
        <rect x="0" y="2" width="19" height="22" rx="2.5" fill="#FEF3C7" stroke="#4A2C18" stroke-width="1.6" />
        <line x1="19" y1="2" x2="19" y2="24" stroke="#D97706" stroke-width="1.5" />
        <line x1="4.5" y1="8.5" x2="14.5" y2="8.5" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <line x1="4.5" y1="13.5" x2="14.5" y2="13.5" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <line x1="4.5" y1="18.5" x2="11" y2="18.5" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <line x1="23.5" y1="8.5" x2="33.5" y2="8.5" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <line x1="23.5" y1="13.5" x2="33.5" y2="13.5" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="31" cy="18.5" r="2" fill="#10B981" />
      </g>`
    : '';

  const coffeeCup =
    accessory === 'coffee' || expression === 'coffee'
      ? `<g transform="translate(79, 69)">
          <path d="M3 10H21L18.8 30H5.2L3 10Z" fill="#FEF3C7" stroke="#4A2C18" stroke-width="2.1" stroke-linejoin="round" />
          <path d="M4.2 17H19.8L18.8 30H5.2L4.2 17Z" fill="#78350F" fill-opacity="0.88" />
          <rect x="6.5" y="13" width="4" height="4" rx="1" fill="#FFFFFF" fill-opacity="0.55" transform="rotate(-10 8.5 15)" />
          <rect x="12" y="14" width="3.5" height="3.5" rx="1" fill="#FFFFFF" fill-opacity="0.55" transform="rotate(12 13.7 15.7)" />
          <rect x="1.8" y="7" width="20.4" height="4" rx="2" fill="#FFFFFF" stroke="#4A2C18" stroke-width="1.9" />
          <line x1="14.5" y1="0.5" x2="12" y2="7" stroke="#EF4444" stroke-width="2.4" stroke-linecap="round" />
        </g>`
      : '';

  const topHat =
    accessory === 'hardhat'
      ? `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.5; 0,0" dur="2.6s" repeatCount="indefinite" />
          <path d="M32 32C34 15 46 10 60 10C74 10 86 15 88 32Z" fill="url(#capyHelmetGrad)" stroke="#4A2C18" stroke-width="2.4" stroke-linejoin="round" />
          <rect x="27" y="29" width="66" height="6" rx="3" fill="#EAB308" stroke="#4A2C18" stroke-width="2.2" />
          <path d="M55 12V29M65 12V29" stroke="#FEF9C3" stroke-width="2.2" stroke-linecap="round" />
          <circle cx="60" cy="21" r="4" fill="#F97316" stroke="#4A2C18" stroke-width="1.3" />
        </g>`
      : accessory === 'crown'
      ? `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.8; 0,0" dur="2.4s" repeatCount="indefinite" />
          <path d="M41 30L44.5 13L53.5 21.5L60 9L66.5 21.5L75.5 13L79 30Z" fill="url(#capyGoldGrad)" stroke="#4A2C18" stroke-width="2.3" stroke-linejoin="round" />
          <circle cx="60" cy="22.5" r="2.7" fill="#EF4444" stroke="#4A2C18" stroke-width="1" />
          <circle cx="50" cy="24.5" r="1.9" fill="#3B82F6" stroke="#4A2C18" stroke-width="0.9" />
          <circle cx="70" cy="24.5" r="1.9" fill="#10B981" stroke="#4A2C18" stroke-width="0.9" />
        </g>`
      : `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.6; 0,0" dur="2.3s" repeatCount="indefinite" />
          <ellipse cx="60" cy="28" rx="9" ry="2.2" fill="#4A2C18" fill-opacity="0.16" />
          <ellipse cx="60" cy="20" rx="11" ry="8.8" fill="url(#capyTangerineGrad)" stroke="#4A2C18" stroke-width="2.2" />
          <ellipse cx="56" cy="17" rx="3.2" ry="1.8" transform="rotate(-22 56 17)" fill="#FFEDD5" fill-opacity="0.85" />
          <circle cx="65" cy="21" r="0.7" fill="#9A3412" fill-opacity="0.45" />
          <circle cx="63" cy="23.5" r="0.6" fill="#9A3412" fill-opacity="0.45" />
          <path d="M60 12C62 6.8 68.5 6 70.5 9.2C67.5 12.2 63 13.2 60 12Z" fill="#22C55E" stroke="#4A2C18" stroke-width="1.6" stroke-linejoin="round" />
          <path d="M61 11.5Q65 9.5 68 9.2" stroke="#BBF7D0" stroke-width="1" stroke-linecap="round" />
        </g>`;

  return `<svg viewBox="0 0 120 120" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    ${bgCircle}
    <ellipse cx="60" cy="108.5" rx="33" ry="5.5" fill="#4A2C18" fill-opacity="0.15" />
    ${celebratingSparkles}
    ${alertBadge}
    <g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-18 30 36; -24 30 36; -18 30 36" dur="3.4s" repeatCount="indefinite" />
        <ellipse cx="30" cy="36" rx="10" ry="11.2" fill="#AD6C3E" stroke="#4A2C18" stroke-width="2.5" />
        <ellipse cx="30" cy="37" rx="5.5" ry="6.2" fill="#F4A9A0" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="18 90 36; 24 90 36; 18 90 36" dur="3.4s" repeatCount="indefinite" />
        <ellipse cx="90" cy="36" rx="10" ry="11.2" fill="#AD6C3E" stroke="#4A2C18" stroke-width="2.5" />
        <ellipse cx="90" cy="37" rx="5.5" ry="6.2" fill="#F4A9A0" />
      </g>
    </g>
    <!-- Plump Body -->
    <path d="M24.5 84C24.5 64 40 55 60 55C80 55 95.5 64 95.5 84C95.5 99.5 83 107.5 60 107.5C37 107.5 24.5 99.5 24.5 84Z" fill="url(#capyBodyGrad)" stroke="#4A2C18" stroke-width="2.6" />
    <!-- Creamy Belly -->
    <ellipse cx="60" cy="89.5" rx="21.5" ry="13.5" fill="url(#capySnoutGrad)" />
    <!-- Subtle Chin Shadow -->
    <ellipse cx="60" cy="79" rx="24" ry="6" fill="#7C4421" fill-opacity="0.18" />
    <!-- Chubby Head -->
    <path d="M23.5 56C23.5 36.5 39 26.5 60 26.5C81 26.5 96.5 36.5 96.5 56C96.5 73.5 83.5 82.5 60 82.5C36.5 82.5 23.5 73.5 23.5 56Z" fill="url(#capyHeadGrad)" stroke="#4A2C18" stroke-width="2.6" />
    <!-- Top Head Highlight -->
    <path d="M40 32.5Q60 28.5 80 32.5" stroke="#F6D7B8" stroke-width="2.2" stroke-opacity="0.55" stroke-linecap="round" />
    ${headband}
    <!-- Snout -->
    <ellipse cx="60" cy="64.5" rx="19.5" ry="13.8" fill="url(#capySnoutGrad)" stroke="#4A2C18" stroke-width="2.2" />
    <!-- Nose -->
    <ellipse cx="60" cy="58.5" rx="6.8" ry="4.3" fill="#4A2C18" />
    <ellipse cx="58.2" cy="57.2" rx="2.2" ry="1" fill="#FFFFFF" fill-opacity="0.45" />
    ${mouth}
    <line x1="60" y1="62.5" x2="60" y2="66.5" stroke="#4A2C18" stroke-width="2.2" stroke-linecap="round" />
    <!-- Soft Blended Rosy Cheeks -->
    <ellipse cx="34.5" cy="61" rx="7.5" ry="5" fill="url(#capyCheekGrad)" />
    <ellipse cx="85.5" cy="61" rx="7.5" ry="5" fill="url(#capyCheekGrad)" />
    ${eyes}
    ${glasses}
    ${workingLedger}
    <!-- Cute Little Paws -->
    <ellipse cx="40.5" cy="87.5" rx="7.2" ry="5.5" transform="rotate(-15 40.5 87.5)" fill="#AD6C3E" stroke="#4A2C18" stroke-width="2.2" />
    <ellipse cx="79.5" cy="87.5" rx="7.2" ry="5.5" transform="rotate(15 79.5 87.5)" fill="#AD6C3E" stroke="#4A2C18" stroke-width="2.2" />
    ${coffeeCup}
    ${topHat}
  </svg>`;
}

export const CapybaraAvatar: React.FC<CapybaraAvatarProps> = ({
  expression = 'happy',
  accessory = 'none',
  size = 76,
  className = '',
  withBadgeBg = false,
  isPetting = false,
}) => {
  const isCelebrating = expression === 'celebrating' || isPetting;
  const isSleeping = expression === 'sleeping' && !isPetting;
  const isAlert = expression === 'alert' && !isPetting;
  const hasCoffee = (expression === 'coffee' || accessory === 'coffee') && !isSleeping;

  const svgSrc = useMemo(() => {
    const svg = buildCapybaraSvg(expression, accessory, withBadgeBg, isPetting);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [expression, accessory, withBadgeBg, isPetting]);

  const animClass = isCelebrating
    ? 'animate-capy-celebrate'
    : isSleeping
    ? ''
    : isAlert
    ? 'animate-capy-alert'
    : 'animate-capy-float';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${animClass} ${className}`}
      style={{
        width: size,
        height: size,
        colorScheme: 'only light',
        forcedColorAdjust: 'none',
      }}
    >
      <img
        src={svgSrc}
        alt="Linh vật Capybara"
        width={size}
        height={size}
        draggable={false}
        data-darkreader-ignore=""
        className="w-full h-full object-contain block pointer-events-none"
        style={{
          colorScheme: 'only light',
          forcedColorAdjust: 'none',
          filter: 'none',
        }}
      />

      {isSleeping && (
        <span
          className="absolute top-1 right-2 text-xs font-extrabold text-indigo-600 animate-capy-zzz pointer-events-none"
          aria-hidden="true"
        >
          Zzz
        </span>
      )}

      {hasCoffee && (
        <span
          className="absolute bottom-[36%] right-[14%] text-xs font-bold text-amber-700 animate-capy-steam pointer-events-none"
          aria-hidden="true"
        >
          ~
        </span>
      )}

      {isPetting && (
        <>
          <span
            className="absolute -top-2 left-2 text-sm animate-capy-heart pointer-events-none"
            aria-hidden="true"
          >
            🧡
          </span>
          <span
            className="absolute -top-1 right-3 text-xs animate-capy-heart pointer-events-none"
            style={{ animationDelay: '0.35s' }}
            aria-hidden="true"
          >
            💛
          </span>
        </>
      )}
    </div>
  );
};
