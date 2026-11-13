import React, { useMemo } from 'react';
import type { MascotAccessoryId, MascotExpression } from '../../lib/mascot';

interface CapybaraAvatarProps {
  expression?: MascotExpression;
  accessory?: MascotAccessoryId;
  size?: number;
  className?: string;
  withBadgeBg?: boolean;
}

function buildCapybaraSvg(
  expression: MascotExpression,
  accessory: MascotAccessoryId,
  withBadgeBg: boolean
): string {
  const isCelebrating = expression === 'celebrating';
  const isSleeping = expression === 'sleeping';
  const isAlert = expression === 'alert';
  const isChill = expression === 'chill';

  const bgCircle = withBadgeBg
    ? `<circle cx="60" cy="60" r="57" fill="#FFFBEB" stroke="#F59E0B" stroke-width="4" />`
    : '';

  const celebratingSparkles = isCelebrating
    ? `<g>
        <circle cx="16" cy="30" r="3.5" fill="#F59E0B" />
        <circle cx="104" cy="28" r="3" fill="#EC4899" />
        <path d="M22 16L24 21L29 23L24 25L22 30L20 25L15 23L20 21Z" fill="#10B981" />
        <path d="M98 44L99.5 47.5L103 49L99.5 50.5L98 54L96.5 50.5L93 49L96.5 47.5Z" fill="#3B82F6" />
      </g>`
    : '';

  const alertBadge = isAlert
    ? `<g>
        <circle cx="100" cy="26" r="10" fill="#EF4444" stroke="#FFFFFF" stroke-width="2" />
        <text x="100" y="30.5" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="bold" font-family="sans-serif">!</text>
      </g>`
    : '';

  const headband =
    accessory === 'headband'
      ? `<g>
          <path d="M27 45C42 38 78 38 93 45L94 52C78 46 42 46 26 52Z" fill="#EF4444" stroke="#5A3821" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M92 48L104 43L101 51Z" fill="#DC2626" stroke="#5A3821" stroke-width="2" stroke-linejoin="round" />
          <path d="M92 50L103 56L96 59Z" fill="#DC2626" stroke="#5A3821" stroke-width="2" stroke-linejoin="round" />
        </g>`
      : '';

  const mouth = isCelebrating
    ? `<path d="M53 65Q60 73 67 65Z" fill="#E06D75" stroke="#5A3821" stroke-width="2.2" stroke-linejoin="round" />`
    : `<path d="M54 66Q57 69 60 66Q63 69 66 66" stroke="#5A3821" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;

  const eyes = isCelebrating
    ? `<g>
        <path d="M37 51Q42 45 47 51" stroke="#5A3821" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M73 51Q78 45 83 51" stroke="#5A3821" stroke-width="3" stroke-linecap="round" fill="none" />
      </g>`
    : isSleeping
    ? `<g>
        <path d="M37 50Q42 54 47 50" stroke="#5A3821" stroke-width="2.8" stroke-linecap="round" fill="none" />
        <path d="M73 50Q78 54 83 50" stroke="#5A3821" stroke-width="2.8" stroke-linecap="round" fill="none" />
      </g>`
    : isChill
    ? `<g>
        <line x1="36" y1="50" x2="47" y2="50" stroke="#5A3821" stroke-width="3" stroke-linecap="round" />
        <line x1="73" y1="50" x2="84" y2="50" stroke="#5A3821" stroke-width="3" stroke-linecap="round" />
      </g>`
    : `<g>
        <circle cx="42" cy="50" r="4.5" fill="#3B2314" />
        <circle cx="40.5" cy="48.5" r="1.6" fill="#FFFFFF" />
        <circle cx="78" cy="50" r="4.5" fill="#3B2314" />
        <circle cx="76.5" cy="48.5" r="1.6" fill="#FFFFFF" />
        ${
          isAlert
            ? `<path d="M89 45C89 45 93 50 93 53C93 55 91.2 56.5 89 56.5C86.8 56.5 85 55 85 53C85 50 89 45 89 45Z" fill="#60A5FA" />`
            : ''
        }
      </g>`;

  const glasses =
    accessory === 'glasses'
      ? `<g>
          <circle cx="42" cy="50" r="9.5" fill="#FFFFFF" fill-opacity="0.22" stroke="#374151" stroke-width="2.5" />
          <circle cx="78" cy="50" r="9.5" fill="#FFFFFF" fill-opacity="0.22" stroke="#374151" stroke-width="2.5" />
          <path d="M51.5 49.5Q60 47.5 68.5 49.5" stroke="#374151" stroke-width="2.5" fill="none" />
          <line x1="27" y1="48" x2="32.5" y2="49.5" stroke="#374151" stroke-width="2.2" />
          <line x1="87.5" y1="49.5" x2="93" y2="48" stroke="#374151" stroke-width="2.2" />
        </g>`
      : '';

  const coffeeCup =
    accessory === 'coffee' || expression === 'coffee'
      ? `<g transform="translate(78, 70)">
          <path d="M3 10H21L19 29H5L3 10Z" fill="#FDE68A" stroke="#5A3821" stroke-width="2.2" stroke-linejoin="round" />
          <path d="M4 16H20L19 29H5L4 16Z" fill="#92400E" fill-opacity="0.85" />
          <rect x="2" y="7" width="20" height="4" rx="2" fill="#FFFFFF" stroke="#5A3821" stroke-width="2" />
          <line x1="14" y1="1" x2="12" y2="7" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" />
        </g>`
      : '';

  const topHat =
    accessory === 'hardhat'
      ? `<g>
          <path d="M32 32C34 15 46 10 60 10C74 10 86 15 88 32Z" fill="#FACC15" stroke="#5A3821" stroke-width="2.8" stroke-linejoin="round" />
          <rect x="27" y="29" width="66" height="6" rx="3" fill="#EAB308" stroke="#5A3821" stroke-width="2.5" />
          <path d="M55 12V29M65 12V29" stroke="#FEF08A" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="60" cy="21" r="4" fill="#F97316" />
        </g>`
      : accessory === 'crown'
      ? `<g>
          <path d="M42 29L45 13L54 21L60 9L66 21L75 13L78 29Z" fill="#FBBF24" stroke="#5A3821" stroke-width="2.5" stroke-linejoin="round" />
          <circle cx="60" cy="22" r="2.5" fill="#EF4444" />
          <circle cx="50" cy="24" r="1.8" fill="#3B82F6" />
          <circle cx="70" cy="24" r="1.8" fill="#10B981" />
        </g>`
      : `<g>
          <ellipse cx="60" cy="20" rx="10.5" ry="8.5" fill="#FB923C" stroke="#5A3821" stroke-width="2.5" />
          <ellipse cx="56.5" cy="17.5" rx="3" ry="1.8" transform="rotate(-20 56.5 17.5)" fill="#FED7AA" />
          <path d="M60 12C62 7 68 6 70 9C67 12 63 13 60 12Z" fill="#22C55E" stroke="#5A3821" stroke-width="1.8" stroke-linejoin="round" />
        </g>`;

  return `<svg viewBox="0 0 120 120" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${bgCircle}
    <ellipse cx="60" cy="108" rx="32" ry="5.5" fill="#5A3821" fill-opacity="0.14" />
    ${celebratingSparkles}
    ${alertBadge}
    <g>
      <ellipse cx="30" cy="36" rx="10" ry="11" transform="rotate(-18 30 36)" fill="#B57445" stroke="#5A3821" stroke-width="3" />
      <ellipse cx="30" cy="37" rx="5.5" ry="6" transform="rotate(-18 30 37)" fill="#F3B1A7" />
      <ellipse cx="90" cy="36" rx="10" ry="11" transform="rotate(18 90 36)" fill="#B57445" stroke="#5A3821" stroke-width="3" />
      <ellipse cx="90" cy="37" rx="5.5" ry="6" transform="rotate(18 90 37)" fill="#F3B1A7" />
    </g>
    <path d="M25 84C25 65 40 56 60 56C80 56 95 65 95 84C95 99 83 107 60 107C37 107 25 99 25 84Z" fill="#C98A5B" stroke="#5A3821" stroke-width="3" />
    <ellipse cx="60" cy="89" rx="21" ry="13" fill="#E8C19A" />
    <path d="M24 56C24 37 39 27 60 27C81 27 96 37 96 56C96 73 83 82 60 82C37 82 24 73 24 56Z" fill="#D09263" stroke="#5A3821" stroke-width="3" />
    ${headband}
    <ellipse cx="60" cy="64" rx="19" ry="13.5" fill="#E8C19A" stroke="#5A3821" stroke-width="2.5" />
    <ellipse cx="60" cy="58.5" rx="6.5" ry="4.2" fill="#5A3821" />
    <ellipse cx="58.5" cy="57.3" rx="2" ry="1" fill="#FFFFFF" fill-opacity="0.45" />
    ${mouth}
    <line x1="60" y1="62.5" x2="60" y2="66" stroke="#5A3821" stroke-width="2.4" stroke-linecap="round" />
    <ellipse cx="35" cy="61" rx="6" ry="3.8" fill="#F89898" fill-opacity="0.7" />
    <ellipse cx="85" cy="61" rx="6" ry="3.8" fill="#F89898" fill-opacity="0.7" />
    ${eyes}
    ${glasses}
    <ellipse cx="41" cy="87" rx="7" ry="5.5" transform="rotate(-15 41 87)" fill="#B57445" stroke="#5A3821" stroke-width="2.5" />
    <ellipse cx="79" cy="87" rx="7" ry="5.5" transform="rotate(15 79 87)" fill="#B57445" stroke="#5A3821" stroke-width="2.5" />
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
}) => {
  const isCelebrating = expression === 'celebrating';
  const isSleeping = expression === 'sleeping';

  const svgSrc = useMemo(() => {
    const svg = buildCapybaraSvg(expression, accessory, withBadgeBg);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [expression, accessory, withBadgeBg]);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        isCelebrating ? 'animate-capy-celebrate' : isSleeping ? '' : 'animate-capy-float'
      } ${className}`}
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
          className="absolute -top-1 right-0 text-xs font-extrabold text-indigo-600 animate-capy-zzz pointer-events-none"
          aria-hidden="true"
        >
          Zzz
        </span>
      )}
    </div>
  );
};
