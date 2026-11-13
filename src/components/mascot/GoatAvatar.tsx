import React, { useMemo } from 'react';
import type { MascotAccessoryId, MascotExpression } from '../../lib/mascot';

interface GoatAvatarProps {
  expression?: MascotExpression;
  accessory?: MascotAccessoryId;
  size?: number;
  className?: string;
  withBadgeBg?: boolean;
  isPetting?: boolean;
}

function buildGoatSvg(
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
    <radialGradient id="goatFurGrad" cx="42%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFDF7" />
      <stop offset="65%" stop-color="#FDF3E1" />
      <stop offset="100%" stop-color="#F2DFC2" />
    </radialGradient>
    <linearGradient id="goatHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="55%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="goatGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <radialGradient id="goatBadgeGrad" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFDF9" />
      <stop offset="100%" stop-color="#ECFDF5" />
    </radialGradient>
  </defs>`;

  const bgCircle = withBadgeBg
    ? `<circle cx="60" cy="60" r="57" fill="url(#goatBadgeGrad)" stroke="#10B981" stroke-width="3" />`
    : '';

  const celebratingSparkles = isCelebrating
    ? `<g>
        <path d="M14 25L16 30L21 32L16 34L14 39L12 34L7 32L12 30Z" fill="#10B981">
          <animateTransform attributeName="transform" type="rotate" values="0 14 32; 25 14 32; 0 14 32" dur="1.1s" repeatCount="indefinite" />
        </path>
        <path d="M106 24L107.8 28.2L112 30L107.8 31.8L106 36L104.2 31.8L100 30L104.2 28.2Z" fill="#F59E0B">
          <animateTransform attributeName="transform" type="rotate" values="0 106 30; -25 106 30; 0 106 30" dur="1s" repeatCount="indefinite" />
        </path>
      </g>`
    : '';

  const alertBadge = isAlert
    ? `<g>
        <circle cx="102" cy="23" r="9.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="2">
          <animate attributeName="r" values="9.5;10.8;9.5" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x="102" y="27.5" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="bold" font-family="sans-serif">!</text>
      </g>`
    : '';

  const eyes = isCelebrating
    ? `<g>
        <path d="M35 47Q41 40 47 47" stroke="#3E2723" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M73 47Q79 40 85 47" stroke="#3E2723" stroke-width="3" stroke-linecap="round" fill="none" />
      </g>`
    : isSleeping
    ? `<g>
        <path d="M35 46Q41 51 47 46" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" fill="none" />
        <path d="M73 46Q79 51 85 46" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" fill="none" />
      </g>`
    : isChill
    ? `<g>
        <line x1="35" y1="46.5" x2="47" y2="46.5" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" />
        <line x1="73" y1="46.5" x2="85" y2="46.5" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" />
      </g>`
    : isAlert
    ? `<g>
        <circle cx="41" cy="46" r="5" fill="#FFFFFF" stroke="#3E2723" stroke-width="2.2" />
        <circle cx="41" cy="46" r="2" fill="#3E2723" />
        <circle cx="79" cy="46" r="5" fill="#FFFFFF" stroke="#3E2723" stroke-width="2.2" />
        <circle cx="79" cy="46" r="2" fill="#3E2723" />
        <path d="M93 39C93 39 96.5 43.5 96.5 46C96.5 47.8 95 49 93 49C91 49 89.5 47.8 89.5 46C89.5 43.5 93 39 93 39Z" fill="#60A5FA" stroke="#2563EB" stroke-width="0.9">
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,3; 0,0" dur="1.2s" repeatCount="indefinite" />
        </path>
      </g>`
    : `<g>
        <!-- Big sparkly kawaii goat eyes with natural blink -->
        <ellipse cx="41" cy="46.5" rx="5.5" ry="5.8" fill="#3E2723">
          <animate attributeName="ry" values="5.8;5.8;0.5;5.8;5.8" keyTimes="0;0.88;0.92;0.96;1" dur="4s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="39" cy="44.3" r="2" fill="#FFFFFF" />
        <circle cx="43.2" cy="48.5" r="0.9" fill="#FFFFFF" fill-opacity="0.85" />
        <ellipse cx="79" cy="46.5" rx="5.5" ry="5.8" fill="#3E2723">
          <animate attributeName="ry" values="5.8;5.8;0.5;5.8;5.8" keyTimes="0;0.88;0.92;0.96;1" dur="4s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="77" cy="44.3" r="2" fill="#FFFFFF" />
        <circle cx="81.2" cy="48.5" r="0.9" fill="#FFFFFF" fill-opacity="0.85" />
      </g>`;

  const headband =
    accessory === 'headband'
      ? `<g>
          <path d="M31 35C45 30 75 30 89 35L90 40.5C75 35.5 45 35.5 30 40.5Z" fill="#EF4444" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
          <path d="M89 37L101 32L98 40Z" fill="#DC2626" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />
          <path d="M89 39L100 45L93 48Z" fill="#B91C1C" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />
        </g>`
      : '';

  const glasses =
    accessory === 'glasses'
      ? `<g>
          <circle cx="41" cy="46.5" r="8.8" fill="#FFFFFF" fill-opacity="0.22" stroke="#374151" stroke-width="2.2" />
          <path d="M36 43L40 47" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.75" stroke-linecap="round" />
          <circle cx="79" cy="46.5" r="8.8" fill="#FFFFFF" fill-opacity="0.22" stroke="#374151" stroke-width="2.2" />
          <path d="M74 43L78 47" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.75" stroke-linecap="round" />
          <path d="M49.8 45.8Q60 44 70.2 45.8" stroke="#374151" stroke-width="2.2" fill="none" />
        </g>`
      : '';

  const prop = hasBobaCup
    ? `<g>
        <rect x="57.8" y="61" width="4.4" height="14" rx="1.5" fill="#FFFFFF" stroke="#3E2723" stroke-width="2" />
        <path d="M47 75H73L70.5 98C70.3 99.8 68.5 101 60 101C51.5 101 49.7 99.8 49.5 98L47 75Z" fill="#FDF2E9" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
        <path d="M48 80H72L70.2 97.5C70 99 68 100 60 100C52 100 50 99 49.8 97.5L48 80Z" fill="#F2D7C4" />
        <circle cx="53.5" cy="95.5" r="2.1" fill="#3E2723" />
        <circle cx="58" cy="96.5" r="2.1" fill="#3E2723" />
        <circle cx="62.5" cy="96.5" r="2.1" fill="#3E2723" />
        <circle cx="66.5" cy="95.2" r="2.1" fill="#3E2723" />
        <path d="M45.5 75C46 69.5 52 67.5 60 67.5C68 67.5 74 69.5 74.5 75Z" fill="#FFFFFF" fill-opacity="0.88" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />
        <rect x="45" y="73.5" width="30" height="3.2" rx="1.6" fill="#FFFFFF" stroke="#3E2723" stroke-width="1.8" />
      </g>`
    : isWorking
    ? `<g transform="translate(42, 79)">
        <rect x="0" y="2" width="36" height="20" rx="3" fill="#FFFBEB" stroke="#3E2723" stroke-width="2.2" />
        <line x1="18" y1="2" x2="18" y2="22" stroke="#D97706" stroke-width="1.5" />
        <line x1="5" y1="8" x2="14" y2="8" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <line x1="5" y1="13" x2="13" y2="13" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <line x1="22" y1="8" x2="31" y2="8" stroke="#92400E" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="29" cy="14" r="2" fill="#10B981" />
      </g>`
    : `<g>
        <!-- Cute Four-Leaf Clover held by paws! -->
        <path d="M56 96Q52 84 46 76" stroke="#15803D" stroke-width="2.8" stroke-linecap="round" />
        <g transform="translate(45, 74)">
          <circle cx="-4.5" cy="-4" r="4.5" fill="#4ADE80" stroke="#3E2723" stroke-width="1.8" />
          <circle cx="4.5" cy="-4" r="4.5" fill="#22C55E" stroke="#3E2723" stroke-width="1.8" />
          <circle cx="-4.5" cy="4" r="4.5" fill="#22C55E" stroke="#3E2723" stroke-width="1.8" />
          <circle cx="4.5" cy="4" r="4.5" fill="#4ADE80" stroke="#3E2723" stroke-width="1.8" />
          <circle cx="0" cy="0" r="2" fill="#16A34A" />
        </g>
      </g>`;

  const topAccessory =
    accessory === 'hardhat'
      ? `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.2; 0,0" dur="2.6s" repeatCount="indefinite" />
          <path d="M36 27C38 13 48 9 60 9C72 9 82 13 84 27Z" fill="#FACC15" stroke="#3E2723" stroke-width="2.4" stroke-linejoin="round" />
          <rect x="31" y="24.5" width="58" height="5" rx="2.5" fill="#EAB308" stroke="#3E2723" stroke-width="2.2" />
          <circle cx="60" cy="18" r="3.2" fill="#F97316" stroke="#3E2723" stroke-width="1.2" />
        </g>`
      : accessory === 'crown'
      ? `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.4; 0,0" dur="2.4s" repeatCount="indefinite" />
          <path d="M44 25L47 11L54.5 18.5L60 7.5L65.5 18.5L73 11L76 25Z" fill="url(#goatGoldGrad)" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
          <circle cx="60" cy="19" r="2.2" fill="#EF4444" />
          <circle cx="51.5" cy="20.5" r="1.6" fill="#3B82F6" />
          <circle cx="68.5" cy="20.5" r="1.6" fill="#10B981" />
        </g>`
      : '';

  return `<svg viewBox="0 0 120 120" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    ${bgCircle}

    <!-- Soft ground shadow -->
    <ellipse cx="60" cy="109" rx="35" ry="5.5" fill="#94A3B8" fill-opacity="0.22" />
    ${celebratingSparkles}
    ${alertBadge}

    <!-- Cute Little Tail on the right -->
    <path d="M87 89C95 85 98 92 93 96C90 98 86 96 86 93Z" fill="url(#goatFurGrad)" stroke="#3E2723" stroke-width="2.6" stroke-linejoin="round" />

    <!-- Floppy Goat Ears (wiggling gently!) -->
    <g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 28 38; -6 28 38; 0 28 38" dur="3.2s" repeatCount="indefinite" />
        <path d="M31 35C21 34 14 40 16 46C18 50 26 48 32 42Z" fill="url(#goatFurGrad)" stroke="#3E2723" stroke-width="2.8" stroke-linejoin="round" />
        <path d="M28 38C22 38 18 42 19.5 44.5C21 46.5 26 44.5 29 41Z" fill="#F9A8B4" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 92 38; 6 92 38; 0 92 38" dur="3.2s" repeatCount="indefinite" />
        <path d="M89 35C99 34 106 40 104 46C102 50 94 48 88 42Z" fill="url(#goatFurGrad)" stroke="#3E2723" stroke-width="2.8" stroke-linejoin="round" />
        <path d="M92 38C98 38 102 42 100.5 44.5C99 46.5 94 44.5 91 41Z" fill="#F9A8B4" />
      </g>
    </g>

    <!-- Plump Sitting Goat Body -->
    <path
      d="M60 61C78 61 91 71 91 88C91 101 79 107 60 107C41 107 29 101 29 88C29 71 42 61 60 61Z"
      fill="url(#goatFurGrad)"
      stroke="#3E2723"
      stroke-width="3"
      stroke-linejoin="round"
    />

    <!-- Mint Collar & Golden Bell -->
    <path d="M38 64Q60 72 82 64L80 69Q60 77 40 69Z" fill="#7ED4C8" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
    <g>
      <animateTransform attributeName="transform" type="rotate" values="-4 60 70; 4 60 70; -4 60 70" dur="2.5s" repeatCount="indefinite" />
      <path d="M55 72C55 68.5 65 68.5 65 72L67 78H53Z" fill="#FBBF24" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />
      <circle cx="60" cy="79" r="2" fill="#D97706" stroke="#3E2723" stroke-width="1.3" />
    </g>

    <!-- Chubby Goat Head -->
    <path
      d="M60 22C78 22 92 32 92 47C92 60 79 67 60 67C41 67 28 60 28 47C28 32 42 22 60 22Z"
      fill="url(#goatFurGrad)"
      stroke="#3E2723"
      stroke-width="3"
      stroke-linejoin="round"
    />

    <!-- Fluffy Top Hair Tuft -->
    <path d="M55 22.5L57.5 16L60.5 20L64 17L65 22.5" fill="#FFFDF7" stroke="#3E2723" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Two Little Golden Horns -->
    <path d="M40 28C37 21 39 15 44 16C47 17 48 22 46 26Z" fill="url(#goatHornGrad)" stroke="#3E2723" stroke-width="2.4" stroke-linejoin="round" />
    <path d="M80 28C83 21 81 15 76 16C73 17 72 22 74 26Z" fill="url(#goatHornGrad)" stroke="#3E2723" stroke-width="2.4" stroke-linejoin="round" />

    ${headband}

    <!-- Tiny Eyebrow Dots -->
    <ellipse cx="42" cy="36" rx="2.5" ry="1.2" fill="#D4B499" />
    <ellipse cx="78" cy="36" rx="2.5" ry="1.2" fill="#D4B499" />

    <!-- Pastel Pink Cheeks with /// shine -->
    <g opacity="${isPetting ? '1' : '0.9'}">
      <ellipse cx="35.5" cy="54" rx="5.8" ry="3.6" fill="#F9B4BC" />
      <line x1="33.5" y1="55" x2="35" y2="52.8" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
      <line x1="36.2" y1="55" x2="37.7" y2="52.8" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
      <ellipse cx="84.5" cy="54" rx="5.8" ry="3.6" fill="#F9B4BC" />
      <line x1="82.3" y1="55" x2="83.8" y2="52.8" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
      <line x1="85" y1="55" x2="86.5" y2="52.8" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
    </g>

    <!-- Cute Pink Nose & W Smile -->
    <ellipse cx="60" cy="51.5" rx="2.8" ry="2" fill="#F4A9A8" />
    <path d="M55 55.5Q57.5 58.5 60 55.5Q62.5 58.5 65 55.5" stroke="#3E2723" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="60" y1="53.2" x2="60" y2="55.8" stroke="#3E2723" stroke-width="2.1" stroke-linecap="round" />

    ${eyes}
    ${glasses}
    ${prop}

    <!-- Cute Front Hooves -->
    <path d="M36 78C42 76 50 79 52 84C53 87 49 90 44 88C39 86 36 82 36 78Z" fill="url(#goatFurGrad)" stroke="#3E2723" stroke-width="2.4" stroke-linejoin="round" />
    <path d="M46 80.5C49 81.5 51.5 82.5 52 84C52.8 86.5 49.5 89.5 45 88.5C44 86 44.2 82.5 46 80.5Z" fill="#B5896E" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />

    <path d="M84 78C78 76 70 79 68 84C67 87 71 90 76 88C81 86 84 82 84 78Z" fill="url(#goatFurGrad)" stroke="#3E2723" stroke-width="2.4" stroke-linejoin="round" />
    <path d="M74 80.5C71 81.5 68.5 82.5 68 84C67.2 86.5 70.5 89.5 75 88.5C76 86 75.8 82.5 74 80.5Z" fill="#B5896E" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />

    <!-- Sitting Bottom Hooves -->
    <ellipse cx="40" cy="100.5" rx="7.2" ry="8.5" transform="rotate(-14 40 100.5)" fill="#B5896E" stroke="#3E2723" stroke-width="2.6" />
    <ellipse cx="80" cy="100.5" rx="7.2" ry="8.5" transform="rotate(14 80 100.5)" fill="#B5896E" stroke="#3E2723" stroke-width="2.6" />

    ${topAccessory}
  </svg>`;
}

export const GoatAvatar: React.FC<GoatAvatarProps> = ({
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
    const svg = buildGoatSvg(expression, accessory, withBadgeBg, isPetting);
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
        alt="Linh vật Bé Dê"
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
            💚
          </span>
          <span
            className="absolute -top-1 right-3 text-xs animate-capy-heart pointer-events-none"
            style={{ animationDelay: '0.35s' }}
            aria-hidden="true"
          >
            🍀
          </span>
        </>
      )}
    </div>
  );
};
