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
  const isWorking = expression === 'working' && !isPetting;

  const defs = `<defs>
    <linearGradient id="mochiBodyGrad" x1="30%" y1="15%" x2="70%" y2="95%">
      <stop offset="0%" stop-color="#DEB084" />
      <stop offset="65%" stop-color="#CE9868" />
      <stop offset="100%" stop-color="#BA8252" />
    </linearGradient>
    <linearGradient id="mochiSnoutGrad" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#F5D9BC" />
      <stop offset="100%" stop-color="#E7BF97" />
    </linearGradient>
    <radialGradient id="mochiTangerineGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FED7AA" />
      <stop offset="45%" stop-color="#FB923C" />
      <stop offset="100%" stop-color="#EA580C" />
    </radialGradient>
    <linearGradient id="mochiGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <radialGradient id="mochiBlushGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FB7185" stop-opacity="${isPetting ? '0.68' : '0.45'}" />
      <stop offset="100%" stop-color="#FDA4AF" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="mochiBadgeGrad" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFDF7" />
      <stop offset="100%" stop-color="#FEF3C7" />
    </radialGradient>
  </defs>`;

  const bgCircle = withBadgeBg
    ? `<circle cx="60" cy="60" r="57" fill="url(#mochiBadgeGrad)" stroke="#F59E0B" stroke-width="3.2" />`
    : '';

  const celebratingSparkles = isCelebrating
    ? `<g>
        <path d="M16 28L18 33L23 35L18 37L16 42L14 37L9 35L14 33Z" fill="#F59E0B">
          <animateTransform attributeName="transform" type="rotate" values="0 16 35; 25 16 35; 0 16 35" dur="1.1s" repeatCount="indefinite" />
        </path>
        <path d="M104 26L105.8 30.2L110 32L105.8 33.8L104 38L102.2 33.8L98 32L102.2 30.2Z" fill="#EC4899">
          <animateTransform attributeName="transform" type="rotate" values="0 104 32; -25 104 32; 0 104 32" dur="1s" repeatCount="indefinite" />
        </path>
      </g>`
    : '';

  const alertBadge = isAlert
    ? `<g>
        <circle cx="102" cy="28" r="9.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="2">
          <animate attributeName="r" values="9.5;10.8;9.5" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x="102" y="32.5" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="bold" font-family="sans-serif">!</text>
      </g>`
    : '';

  // Headband fits the wide loaf forehead
  const headband =
    accessory === 'headband'
      ? `<g>
          <path d="M26 48C45 43 75 43 94 48L95 54C75 49 45 49 25 54Z" fill="#EF4444" stroke="#5C3D2E" stroke-width="2.4" stroke-linejoin="round" />
          <path d="M94 50L106 45L103 53Z" fill="#DC2626" stroke="#5C3D2E" stroke-width="2.2" stroke-linejoin="round" />
          <path d="M94 52L105 58L98 61Z" fill="#B91C1C" stroke="#5C3D2E" stroke-width="2.2" stroke-linejoin="round" />
        </g>`
      : '';

  // Iconic "Vô tri" wide-spaced eyes!
  const eyes = isCelebrating
    ? `<g>
        <path d="M32 55Q37 49 42 55" stroke="#5C3D2E" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M78 55Q83 49 88 55" stroke="#5C3D2E" stroke-width="3" stroke-linecap="round" fill="none" />
      </g>`
    : isSleeping
    ? `<g>
        <path d="M32 55Q37 59 42 55" stroke="#5C3D2E" stroke-width="2.8" stroke-linecap="round" fill="none" />
        <path d="M78 55Q83 59 88 55" stroke="#5C3D2E" stroke-width="2.8" stroke-linecap="round" fill="none" />
      </g>`
    : isAlert
    ? `<g>
        <!-- Tiny shocked vô tri dots -->
        <circle cx="37" cy="54" r="3.8" fill="#FFFFFF" stroke="#5C3D2E" stroke-width="2.2" />
        <circle cx="37" cy="54" r="1.5" fill="#3B2314" />
        <circle cx="83" cy="54" r="3.8" fill="#FFFFFF" stroke="#5C3D2E" stroke-width="2.2" />
        <circle cx="83" cy="54" r="1.5" fill="#3B2314" />
        <path d="M95 47C95 47 98.5 51.5 98.5 54C98.5 55.8 97 57 95 57C93 57 91.5 55.8 91.5 54C91.5 51.5 95 47 95 47Z" fill="#60A5FA" stroke="#2563EB" stroke-width="0.9">
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,3; 0,0" dur="1.2s" repeatCount="indefinite" />
        </path>
      </g>`
    : `<g>
        <!-- Classic deadpan chill half-lidded capybara eyes -->
        <ellipse cx="37" cy="54.5" rx="4.2" ry="2.6" fill="#3B2314">
          <animate attributeName="ry" values="2.6;2.6;0.4;2.6;2.6" keyTimes="0;0.88;0.92;0.96;1" dur="4.2s" repeatCount="indefinite" />
        </ellipse>
        <line x1="31.5" y1="52.3" x2="42.5" y2="52.8" stroke="#5C3D2E" stroke-width="2.6" stroke-linecap="round" />
        <circle cx="35.8" cy="53.8" r="0.9" fill="#FFFFFF" fill-opacity="0.85" />

        <ellipse cx="83" cy="54.5" rx="4.2" ry="2.6" fill="#3B2314">
          <animate attributeName="ry" values="2.6;2.6;0.4;2.6;2.6" keyTimes="0;0.88;0.92;0.96;1" dur="4.2s" repeatCount="indefinite" />
        </ellipse>
        <line x1="77.5" y1="52.8" x2="88.5" y2="52.3" stroke="#5C3D2E" stroke-width="2.6" stroke-linecap="round" />
        <circle cx="81.8" cy="53.8" r="0.9" fill="#FFFFFF" fill-opacity="0.85" />
      </g>`;

  // Mouth (tiny deadpan 'w' or happy open mouth)
  const mouth = isCelebrating
    ? `<path d="M55 68Q60 74.5 65 68Z" fill="#F472B6" stroke="#5C3D2E" stroke-width="2" stroke-linejoin="round" />`
    : `<path d="M55.5 68.5Q57.8 71 60 68.2Q62.2 71 64.5 68.5" stroke="#5C3D2E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />`;

  // Wide-spaced glasses for the mochi loaf face
  const glasses =
    accessory === 'glasses'
      ? `<g>
          <circle cx="37" cy="54.5" r="8.8" fill="#FFFFFF" fill-opacity="0.22" stroke="#374151" stroke-width="2.3" />
          <path d="M32 51L36 55" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.7" stroke-linecap="round" />
          <circle cx="83" cy="54.5" r="8.8" fill="#FFFFFF" fill-opacity="0.22" stroke="#374151" stroke-width="2.3" />
          <path d="M78 51L82 55" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.7" stroke-linecap="round" />
          <path d="M45.8 53.5Q60 51.5 74.2 53.5" stroke="#374151" stroke-width="2.3" fill="none" />
        </g>`
      : '';

  const workingLedger = isWorking
    ? `<g transform="translate(42, 86)">
        <rect x="0" y="2" width="36" height="20" rx="3" fill="#FFFBEB" stroke="#5C3D2E" stroke-width="2.2" />
        <line x1="18" y1="2" x2="18" y2="22" stroke="#D97706" stroke-width="1.5" />
        <line x1="5" y1="8" x2="14" y2="8" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <line x1="5" y1="13" x2="13" y2="13" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <line x1="22" y1="8" x2="31" y2="8" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="29" cy="14" r="2" fill="#10B981" />
      </g>`
    : '';

  const coffeeCup =
    accessory === 'coffee' || expression === 'coffee'
      ? `<g transform="translate(83, 72)">
          <path d="M2 9H20L18 28H4L2 9Z" fill="#FEF3C7" stroke="#5C3D2E" stroke-width="2.2" stroke-linejoin="round" />
          <path d="M3.2 16H18.8L18 28H4L3.2 16Z" fill="#78350F" fill-opacity="0.88" />
          <rect x="1" y="6" width="20" height="4" rx="2" fill="#FFFFFF" stroke="#5C3D2E" stroke-width="2" />
          <line x1="14" y1="0" x2="11.5" y2="6" stroke="#EF4444" stroke-width="2.4" stroke-linecap="round" />
        </g>`
      : '';

  // Accessories perched on the flat loaf head (y ~ 34)
  const topHat =
    accessory === 'hardhat'
      ? `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.4; 0,0" dur="2.6s" repeatCount="indefinite" />
          <path d="M35 37C37 20 47 15 60 15C73 15 83 20 85 37Z" fill="#FACC15" stroke="#5C3D2E" stroke-width="2.6" stroke-linejoin="round" />
          <rect x="30" y="34" width="60" height="5.5" rx="2.7" fill="#EAB308" stroke="#5C3D2E" stroke-width="2.3" />
          <circle cx="60" cy="26" r="3.5" fill="#F97316" stroke="#5C3D2E" stroke-width="1.2" />
        </g>`
      : accessory === 'crown'
      ? `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.6; 0,0" dur="2.4s" repeatCount="indefinite" />
          <path d="M43 35L46 19L54 27L60 15L66 27L74 19L77 35Z" fill="url(#mochiGoldGrad)" stroke="#5C3D2E" stroke-width="2.4" stroke-linejoin="round" />
          <circle cx="60" cy="28" r="2.4" fill="#EF4444" />
          <circle cx="51" cy="29.5" r="1.7" fill="#3B82F6" />
          <circle cx="69" cy="29.5" r="1.7" fill="#10B981" />
        </g>`
      : `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.5; 0,0" dur="2.3s" repeatCount="indefinite" />
          <ellipse cx="60" cy="34" rx="8.5" ry="2" fill="#5C3D2E" fill-opacity="0.16" />
          <ellipse cx="60" cy="26.5" rx="10.5" ry="8.2" fill="url(#mochiTangerineGrad)" stroke="#5C3D2E" stroke-width="2.4" />
          <ellipse cx="56" cy="23.8" rx="3" ry="1.6" transform="rotate(-20 56 23.8)" fill="#FFEDD5" fill-opacity="0.88" />
          <path d="M60 19C62 14 68 13.5 70 16.5C67 19.2 63 20 60 19Z" fill="#22C55E" stroke="#5C3D2E" stroke-width="1.7" stroke-linejoin="round" />
        </g>`;

  return `<svg viewBox="0 0 120 120" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    ${bgCircle}
    <!-- Ground shadow -->
    <ellipse cx="60" cy="107" rx="38" ry="6" fill="#5C3D2E" fill-opacity="0.14" />
    ${celebratingSparkles}
    ${alertBadge}

    <!-- Tiny Side Ears (tucked low on the loaf head like real capybara!) -->
    <g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-12 26 43; -19 26 43; -12 26 43" dur="3.6s" repeatCount="indefinite" />
        <ellipse cx="26" cy="43" rx="7.5" ry="9" fill="#B57B4A" stroke="#5C3D2E" stroke-width="2.8" />
        <ellipse cx="26" cy="44" rx="3.8" ry="4.8" fill="#F4A9A0" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="12 94 43; 19 94 43; 12 94 43" dur="3.6s" repeatCount="indefinite" />
        <ellipse cx="94" cy="43" rx="7.5" ry="9" fill="#B57B4A" stroke="#5C3D2E" stroke-width="2.8" />
        <ellipse cx="94" cy="44" rx="3.8" ry="4.8" fill="#F4A9A0" />
      </g>
    </g>

    <!-- Squishy Continuous Mochi Loaf Body (no neck!) -->
    <path
      d="M21 76C21 51 31 35 60 35C89 35 99 51 99 76C99 95 85 104 60 104C35 104 21 95 21 76Z"
      fill="url(#mochiBodyGrad)"
      stroke="#5C3D2E"
      stroke-width="3.2"
      stroke-linejoin="round"
    />

    <!-- Soft top highlight -->
    <path d="M42 40Q60 37.5 78 40" stroke="#F8E1C8" stroke-width="2.2" stroke-opacity="0.6" stroke-linecap="round" />

    <!-- Creamy Mochi Belly Patch -->
    <ellipse cx="60" cy="91" rx="22" ry="10.5" fill="url(#mochiSnoutGrad)" />

    ${headband}

    <!-- Characteristic Wide Capybara Snout -->
    <rect x="42" y="54" width="36" height="24" rx="12" fill="url(#mochiSnoutGrad)" stroke="#5C3D2E" stroke-width="2.4" />
    <!-- Wide Flat Nose -->
    <path d="M53.5 60C53.5 57.5 66.5 57.5 66.5 60C66.5 62.8 63 64.5 60 64.5C57 64.5 53.5 62.8 53.5 60Z" fill="#5C3D2E" />
    <ellipse cx="58" cy="59.2" rx="2" ry="0.8" fill="#FFFFFF" fill-opacity="0.45" />
    <line x1="60" y1="64" x2="60" y2="68.5" stroke="#5C3D2E" stroke-width="2.2" stroke-linecap="round" />
    ${mouth}

    <!-- Mochi Rosy Cheeks -->
    <ellipse cx="30" cy="64" rx="7.5" ry="4.8" fill="url(#mochiBlushGrad)" />
    <ellipse cx="90" cy="64" rx="7.5" ry="4.8" fill="url(#mochiBlushGrad)" />

    ${eyes}
    ${glasses}

    <!-- Stubby Little Tucked Paws -->
    <ellipse cx="38" cy="98" rx="6.5" ry="4.5" fill="#B57B4A" stroke="#5C3D2E" stroke-width="2.6" />
    <ellipse cx="82" cy="98" rx="6.5" ry="4.5" fill="#B57B4A" stroke="#5C3D2E" stroke-width="2.6" />

    ${workingLedger}
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
          className="absolute bottom-[36%] right-[12%] text-xs font-bold text-amber-700 animate-capy-steam pointer-events-none"
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
