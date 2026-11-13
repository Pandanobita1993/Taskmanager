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
  const hasBobaCup = accessory === 'coffee' || expression === 'coffee';

  const defs = `<defs>
    <radialGradient id="capyFurGrad" cx="42%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#EED0B6" />
      <stop offset="68%" stop-color="#E5BC9A" />
      <stop offset="100%" stop-color="#D7A782" />
    </radialGradient>
    <radialGradient id="capyTangerineGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FED7AA" />
      <stop offset="45%" stop-color="#FB923C" />
      <stop offset="100%" stop-color="#EA580C" />
    </radialGradient>
    <linearGradient id="capyGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <radialGradient id="capyBadgeGrad" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFDF9" />
      <stop offset="100%" stop-color="#FEF3C7" />
    </radialGradient>
  </defs>`;

  const bgCircle = withBadgeBg
    ? `<circle cx="60" cy="60" r="57" fill="url(#capyBadgeGrad)" stroke="#F59E0B" stroke-width="3" />`
    : '';

  const celebratingSparkles = isCelebrating
    ? `<g>
        <path d="M14 26L16 31L21 33L16 35L14 40L12 35L7 33L12 31Z" fill="#F59E0B">
          <animateTransform attributeName="transform" type="rotate" values="0 14 33; 25 14 33; 0 14 33" dur="1.1s" repeatCount="indefinite" />
        </path>
        <path d="M106 24L107.8 28.2L112 30L107.8 31.8L106 36L104.2 31.8L100 30L104.2 28.2Z" fill="#EC4899">
          <animateTransform attributeName="transform" type="rotate" values="0 106 30; -25 106 30; 0 106 30" dur="1s" repeatCount="indefinite" />
        </path>
      </g>`
    : '';

  const alertBadge = isAlert
    ? `<g>
        <circle cx="102" cy="24" r="9.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="2">
          <animate attributeName="r" values="9.5;10.8;9.5" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x="102" y="28.5" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="bold" font-family="sans-serif">!</text>
      </g>`
    : '';

  // Cute curved happy eyes (like the reference!), deadpan chill, or shiny dots
  const eyes = isCelebrating
    ? `<g>
        <path d="M32 50Q38 43 44 50" stroke="#3E2723" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M76 50Q82 43 88 50" stroke="#3E2723" stroke-width="3" stroke-linecap="round" fill="none" />
      </g>`
    : isSleeping
    ? `<g>
        <path d="M32 49Q38 54 44 49" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" fill="none" />
        <path d="M76 49Q82 54 88 49" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" fill="none" />
      </g>`
    : isChill
    ? `<g>
        <line x1="32" y1="49.5" x2="44" y2="49.5" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" />
        <line x1="76" y1="49.5" x2="88" y2="49.5" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" />
      </g>`
    : isAlert
    ? `<g>
        <circle cx="38" cy="49" r="4.2" fill="#FFFFFF" stroke="#3E2723" stroke-width="2.2" />
        <circle cx="38" cy="49" r="1.7" fill="#3E2723" />
        <circle cx="82" cy="49" r="4.2" fill="#FFFFFF" stroke="#3E2723" stroke-width="2.2" />
        <circle cx="82" cy="49" r="1.7" fill="#3E2723" />
        <path d="M94 42C94 42 97.5 46.5 97.5 49C97.5 50.8 96 52 94 52C92 52 90.5 50.8 90.5 49C90.5 46.5 94 42 94 42Z" fill="#60A5FA" stroke="#2563EB" stroke-width="0.9">
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,3; 0,0" dur="1.2s" repeatCount="indefinite" />
        </path>
      </g>`
    : `<g>
        <!-- Soft kawaii oval eyes with gentle blink -->
        <ellipse cx="38" cy="49.5" rx="3.4" ry="3.6" fill="#3E2723">
          <animate attributeName="ry" values="3.6;3.6;0.4;3.6;3.6" keyTimes="0;0.88;0.92;0.96;1" dur="4.2s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="36.8" cy="48.2" r="1.2" fill="#FFFFFF" />
        <ellipse cx="82" cy="49.5" rx="3.4" ry="3.6" fill="#3E2723">
          <animate attributeName="ry" values="3.6;3.6;0.4;3.6;3.6" keyTimes="0;0.88;0.92;0.96;1" dur="4.2s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="80.8" cy="48.2" r="1.2" fill="#FFFFFF" />
      </g>`;

  const headband =
    accessory === 'headband'
      ? `<g>
          <path d="M29 38C45 33 75 33 91 38L92 43.5C75 38.5 45 38.5 28 43.5Z" fill="#EF4444" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
          <path d="M91 40L103 35L100 43Z" fill="#DC2626" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />
          <path d="M91 42L102 48L95 51Z" fill="#B91C1C" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />
        </g>`
      : '';

  const glasses =
    accessory === 'glasses'
      ? `<g>
          <circle cx="38" cy="49.5" r="8.5" fill="#FFFFFF" fill-opacity="0.22" stroke="#374151" stroke-width="2.2" />
          <path d="M33 46L37 50" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.75" stroke-linecap="round" />
          <circle cx="82" cy="49.5" r="8.5" fill="#FFFFFF" fill-opacity="0.22" stroke="#374151" stroke-width="2.2" />
          <path d="M77 46L81 50" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.75" stroke-linecap="round" />
          <path d="M46.5 48.5Q60 46.5 73.5 48.5" stroke="#374151" stroke-width="2.2" fill="none" />
        </g>`
      : '';

  // Boba Milk Tea cup held between paws (just like the reference image!)
  const bobaCup = hasBobaCup
    ? `<g>
        <!-- White Straw going to mouth -->
        <rect x="57.8" y="61" width="4.4" height="14" rx="1.5" fill="#FFFFFF" stroke="#3E2723" stroke-width="2" />
        <!-- Clear Cup Body -->
        <path d="M47 75H73L70.5 98C70.3 99.8 68.5 101 60 101C51.5 101 49.7 99.8 49.5 98L47 75Z" fill="#FDF2E9" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
        <!-- Milk Tea Fill -->
        <path d="M48 80H72L70.2 97.5C70 99 68 100 60 100C52 100 50 99 49.8 97.5L48 80Z" fill="#F2D7C4" />
        <!-- Boba Tapioca Pearls -->
        <circle cx="53.5" cy="95.5" r="2.1" fill="#3E2723" />
        <circle cx="58" cy="96.5" r="2.1" fill="#3E2723" />
        <circle cx="62.5" cy="96.5" r="2.1" fill="#3E2723" />
        <circle cx="66.5" cy="95.2" r="2.1" fill="#3E2723" />
        <circle cx="55.8" cy="91.5" r="1.9" fill="#4A2C18" />
        <circle cx="60.5" cy="92.2" r="1.9" fill="#4A2C18" />
        <circle cx="64.8" cy="91.2" r="1.9" fill="#4A2C18" />
        <!-- Cup Dome Lid -->
        <path d="M45.5 75C46 69.5 52 67.5 60 67.5C68 67.5 74 69.5 74.5 75Z" fill="#FFFFFF" fill-opacity="0.88" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />
        <rect x="45" y="73.5" width="30" height="3.2" rx="1.6" fill="#FFFFFF" stroke="#3E2723" stroke-width="1.8" />
      </g>`
    : isWorking
    ? `<g transform="translate(42, 78)">
        <rect x="0" y="2" width="36" height="20" rx="3" fill="#FFFBEB" stroke="#3E2723" stroke-width="2.2" />
        <line x1="18" y1="2" x2="18" y2="22" stroke="#D97706" stroke-width="1.5" />
        <line x1="5" y1="8" x2="14" y2="8" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <line x1="5" y1="13" x2="13" y2="13" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <line x1="22" y1="8" x2="31" y2="8" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="29" cy="14" r="2" fill="#10B981" />
      </g>`
    : '';

  // Top-of-head accessories
  const topAccessory =
    accessory === 'hardhat'
      ? `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.2; 0,0" dur="2.6s" repeatCount="indefinite" />
          <path d="M36 29C38 14 48 10 60 10C72 10 82 14 84 29Z" fill="#FACC15" stroke="#3E2723" stroke-width="2.4" stroke-linejoin="round" />
          <rect x="31" y="26.5" width="58" height="5" rx="2.5" fill="#EAB308" stroke="#3E2723" stroke-width="2.2" />
          <circle cx="60" cy="19.5" r="3.2" fill="#F97316" stroke="#3E2723" stroke-width="1.2" />
        </g>`
      : accessory === 'crown'
      ? `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.4; 0,0" dur="2.4s" repeatCount="indefinite" />
          <path d="M44 27L47 12L54.5 19.5L60 8.5L65.5 19.5L73 12L76 27Z" fill="url(#capyGoldGrad)" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
          <circle cx="60" cy="20.5" r="2.2" fill="#EF4444" />
          <circle cx="51.5" cy="22" r="1.6" fill="#3B82F6" />
          <circle cx="68.5" cy="22" r="1.6" fill="#10B981" />
        </g>`
      : `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.3; 0,0" dur="2.3s" repeatCount="indefinite" />
          <ellipse cx="60" cy="24" rx="7.5" ry="1.8" fill="#3E2723" fill-opacity="0.14" />
          <ellipse cx="60" cy="17.5" rx="9.5" ry="7.4" fill="url(#capyTangerineGrad)" stroke="#3E2723" stroke-width="2.2" />
          <ellipse cx="56.5" cy="15" rx="2.8" ry="1.5" transform="rotate(-20 56.5 15)" fill="#FFEDD5" fill-opacity="0.88" />
          <path d="M60 10.5C61.8 6 67.5 5.5 69.2 8.2C66.5 10.8 62.5 11.5 60 10.5Z" fill="#22C55E" stroke="#3E2723" stroke-width="1.6" stroke-linejoin="round" />
        </g>`;

  return `<svg viewBox="0 0 120 120" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    ${bgCircle}

    <!-- Soft pastel floor shadow -->
    <ellipse cx="60" cy="109" rx="37" ry="5.5" fill="#94A3B8" fill-opacity="0.22" />
    ${celebratingSparkles}
    ${alertBadge}

    <!-- Cute Rounded Dark-Brown Ears (like reference!) -->
    <g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-14 34 27; -20 34 27; -14 34 27" dur="3.5s" repeatCount="indefinite" />
        <ellipse cx="34" cy="27" rx="8.5" ry="9" fill="#8C6653" stroke="#3E2723" stroke-width="2.8" />
        <ellipse cx="34.5" cy="28" rx="4.2" ry="4.5" fill="#6D4C3D" fill-opacity="0.45" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="14 86 27; 20 86 27; 14 86 27" dur="3.5s" repeatCount="indefinite" />
        <ellipse cx="86" cy="27" rx="8.5" ry="9" fill="#8C6653" stroke="#3E2723" stroke-width="2.8" />
        <ellipse cx="85.5" cy="28" rx="4.2" ry="4.5" fill="#6D4C3D" fill-opacity="0.45" />
      </g>
    </g>

    <!-- Plump Pear-Shaped Sitting Capybara Body & Chubby Cheeks -->
    <path
      d="M60 22
         C79 22 92 33 93 48
         C95 54 94 60 90 64
         C96 73 98 86 92 96
         C86 104 75 107 60 107
         C45 107 34 104 28 96
         C22 86 24 73 30 64
         C26 60 25 54 27 48
         C28 33 41 22 60 22 Z"
      fill="url(#capyFurGrad)"
      stroke="#3E2723"
      stroke-width="3"
      stroke-linejoin="round"
    />

    <!-- Cute Tiny Head Hair Tuft -->
    <path d="M56 22.5L58.5 18L60.5 21.5L63.5 18.5L64 22.5" fill="#EED0B6" stroke="#3E2723" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Soft Right-Side Cel Shadow -->
    <path
      d="M84 65C91 74 92 87 86 96C81 102 72 104 61 104.5C75 102 83 96 85 86C87 77 85 70 84 65Z"
      fill="#C5926E"
      fill-opacity="0.45"
    />

    ${headband}

    <!-- Iconic Dark-Brown Oval Snout Patch (no harsh border) -->
    <ellipse cx="60" cy="57.5" rx="14.5" ry="12" fill="#9A725E" />
    <!-- Classic Y Nose & Mouth -->
    <path d="M55.5 52.5L60 56.5L64.5 52.5" stroke="#3E2723" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="60" y1="56.5" x2="60" y2="63" stroke="#3E2723" stroke-width="2.5" stroke-linecap="round" />

    <!-- Pastel Pink Cheeks with cute white // shine! -->
    <g opacity="${isPetting ? '1' : '0.9'}">
      <ellipse cx="33.5" cy="58.5" rx="5.8" ry="3.8" fill="#F9B4BC" />
      <line x1="31.5" y1="59.5" x2="33" y2="57.2" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
      <line x1="34.2" y1="59.5" x2="35.7" y2="57.2" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />

      <ellipse cx="86.5" cy="58.5" rx="5.8" ry="3.8" fill="#F9B4BC" />
      <line x1="84.3" y1="59.5" x2="85.8" y2="57.2" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
      <line x1="87" y1="59.5" x2="88.5" y2="57.2" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
    </g>

    ${eyes}
    ${glasses}

    <!-- Cup / Ledger between paws -->
    ${bobaCup}

    <!-- Stubby Front Paws curving inward with dark-brown tips -->
    <g>
      <path d="M29 73C35 71 46 73 49 78C50.5 81 47 85 41 84C35 83 30 79 29 73Z" fill="#E5BC9A" stroke="#3E2723" stroke-width="2.6" stroke-linejoin="round" />
      <path d="M42 74.2C45.5 74.8 48.2 76.2 49 78C50.2 80.8 47.2 84.5 42 84C40.5 81 40.5 77 42 74.2Z" fill="#8C6653" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />

      <path d="M91 73C85 71 74 73 71 78C69.5 81 73 85 79 84C85 83 90 79 91 73Z" fill="#E5BC9A" stroke="#3E2723" stroke-width="2.6" stroke-linejoin="round" />
      <path d="M78 74.2C74.5 74.8 71.8 76.2 71 78C69.8 80.8 72.8 84.5 78 84C79.5 81 79.5 77 78 74.2Z" fill="#8C6653" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
    </g>

    <!-- Cute Round Dark-Brown Sitting Feet Pads -->
    <ellipse cx="37" cy="100" rx="8" ry="9.5" transform="rotate(-14 37 100)" fill="#8C6653" stroke="#3E2723" stroke-width="2.8" />
    <ellipse cx="83" cy="100" rx="8" ry="9.5" transform="rotate(14 83 100)" fill="#8C6653" stroke="#3E2723" stroke-width="2.8" />

    ${topAccessory}
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
