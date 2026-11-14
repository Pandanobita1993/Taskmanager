import React, { useMemo } from 'react';
import type { MascotAccessoryId, MascotExpression, MascotType } from '../../lib/mascot';

export type ZodiacSpeciesId = Exclude<MascotType, 'capybara' | 'goat'>;

interface ZodiacAvatarProps {
  species: ZodiacSpeciesId;
  expression?: MascotExpression;
  accessory?: MascotAccessoryId;
  size?: number;
  className?: string;
  withBadgeBg?: boolean;
  isPetting?: boolean;
}

interface SpeciesTheme {
  furLight: string;
  furMid: string;
  furDark: string;
  pawColor: string;
  badgeBg: string;
  badgeBorder: string;
  noseColor: string;
  bellyColor?: string;
}

const SPECIES_THEMES: Record<ZodiacSpeciesId, SpeciesTheme> = {
  rat: {
    furLight: '#F3F4F6',
    furMid: '#E5E7EB',
    furDark: '#D1D5DB',
    pawColor: '#FDA4AF',
    badgeBg: '#F3F4F6',
    badgeBorder: '#9CA3AF',
    noseColor: '#FB7185',
    bellyColor: '#FFFFFF',
  },
  buffalo: {
    furLight: '#A8A29E',
    furMid: '#78716C',
    furDark: '#57534E',
    pawColor: '#44403C',
    badgeBg: '#F5F5F4',
    badgeBorder: '#78716C',
    noseColor: '#D6D3D1',
    bellyColor: '#D6D3D1',
  },
  tiger: {
    furLight: '#FED7AA',
    furMid: '#FDBA74',
    furDark: '#FB923C',
    pawColor: '#FFF7ED',
    badgeBg: '#FFF7ED',
    badgeBorder: '#F97316',
    noseColor: '#FB7185',
    bellyColor: '#FFFBEB',
  },
  cat: {
    furLight: '#FFFDF7',
    furMid: '#FEF3C7',
    furDark: '#FDE68A',
    pawColor: '#FDBA74',
    badgeBg: '#FFFBEB',
    badgeBorder: '#F59E0B',
    noseColor: '#FB7185',
    bellyColor: '#FFFFFF',
  },
  dragon: {
    furLight: '#A7F3D0',
    furMid: '#6EE7B7',
    furDark: '#10B981',
    pawColor: '#FDE047',
    badgeBg: '#ECFDF5',
    badgeBorder: '#10B981',
    noseColor: '#059669',
    bellyColor: '#FEF3C7',
  },
  snake: {
    furLight: '#DCFCE7',
    furMid: '#86EFAC',
    furDark: '#4ADE80',
    pawColor: '#22C55E',
    badgeBg: '#F0FDF4',
    badgeBorder: '#22C55E',
    noseColor: '#15803D',
    bellyColor: '#FEF9C3',
  },
  horse: {
    furLight: '#FDE68A',
    furMid: '#E6B88A',
    furDark: '#C9966B',
    pawColor: '#5C3D2E',
    badgeBg: '#FFFBEB',
    badgeBorder: '#D97706',
    noseColor: '#F5D0C5',
    bellyColor: '#FFF7ED',
  },
  monkey: {
    furLight: '#D9A066',
    furMid: '#C0824B',
    furDark: '#9C6234',
    pawColor: '#FDE6C4',
    badgeBg: '#FFFBEB',
    badgeBorder: '#D97706',
    noseColor: '#7C4421',
    bellyColor: '#FDE6C4',
  },
  rooster: {
    furLight: '#FFFDF7',
    furMid: '#FEF9C3',
    furDark: '#FDE047',
    pawColor: '#FB923C',
    badgeBg: '#FEFCE8',
    badgeBorder: '#EAB308',
    noseColor: '#F97316',
    bellyColor: '#FFFFFF',
  },
  dog: {
    furLight: '#FDE68A',
    furMid: '#FCD34D',
    furDark: '#F59E0B',
    pawColor: '#FFFBEB',
    badgeBg: '#FFFBEB',
    badgeBorder: '#F59E0B',
    noseColor: '#3E2723',
    bellyColor: '#FFFBEB',
  },
  pig: {
    furLight: '#FFE4E6',
    furMid: '#FECDD3',
    furDark: '#FDA4AF',
    pawColor: '#FB7185',
    badgeBg: '#FFF1F2',
    badgeBorder: '#FB7185',
    noseColor: '#F43F5E',
    bellyColor: '#FFF1F2',
  },
  panda: {
    furLight: '#FFFFFF',
    furMid: '#F3F4F6',
    furDark: '#374151',
    pawColor: '#1F2937',
    badgeBg: '#F9FAFB',
    badgeBorder: '#6B7280',
    noseColor: '#1F2937',
    bellyColor: '#FFFFFF',
  },
  fox: {
    furLight: '#FFEDD5',
    furMid: '#FDBA74',
    furDark: '#EA580C',
    pawColor: '#7C2D12',
    badgeBg: '#FFF7ED',
    badgeBorder: '#F97316',
    noseColor: '#3E2723',
    bellyColor: '#FFFBEB',
  },
  rabbit: {
    furLight: '#FFFDF9',
    furMid: '#FEF3C7',
    furDark: '#FDE68A',
    pawColor: '#FDA4AF',
    badgeBg: '#FFFBEB',
    badgeBorder: '#F59E0B',
    noseColor: '#FB7185',
    bellyColor: '#FFFFFF',
  },
  penguin: {
    furLight: '#E0F2FE',
    furMid: '#94A3B8',
    furDark: '#475569',
    pawColor: '#FBBF24',
    badgeBg: '#F0F9FF',
    badgeBorder: '#38BDF8',
    noseColor: '#F59E0B',
    bellyColor: '#FFFFFF',
  },
  frog: {
    furLight: '#DCFCE7',
    furMid: '#86EFAC',
    furDark: '#22C55E',
    pawColor: '#4ADE80',
    badgeBg: '#F0FDF4',
    badgeBorder: '#22C55E',
    noseColor: '#15803D',
    bellyColor: '#FEF9C3',
  },
};

function buildSpeciesBack(species: ZodiacSpeciesId, theme: SpeciesTheme): string {
  switch (species) {
    case 'rat':
      return `<path d="M84 93C98 92 104 80 96 73" stroke="#FDA4AF" stroke-width="4" stroke-linecap="round" fill="none" />
              <path d="M84 93C98 92 104 80 96 73" stroke="#3E2723" stroke-width="1.5" stroke-linecap="round" fill="none" stroke-opacity="0.35" />`;
    case 'buffalo':
      return `<path d="M87 90C96 90 100 84 98 78" stroke="#57534E" stroke-width="3" stroke-linecap="round" fill="none" />
              <ellipse cx="98" cy="76" rx="3" ry="4" fill="#3E2723" />`;
    case 'tiger':
      return `<path d="M86 92C98 91 104 79 97 72" stroke="#FB923C" stroke-width="6" stroke-linecap="round" fill="none" />
              <path d="M86 92C98 91 104 79 97 72" stroke="#3E2723" stroke-width="6.5" stroke-linecap="round" stroke-dasharray="2 7" fill="none" opacity="0.45" />`;
    case 'cat':
      return `<path d="M86 93C99 92 105 76 96 70" stroke="${theme.furDark}" stroke-width="6" stroke-linecap="round" fill="none" />
              <path d="M86 93C99 92 105 76 96 70" stroke="#3E2723" stroke-width="2.4" stroke-linecap="round" fill="none" />`;
    case 'horse':
      return `<path d="M88 86C98 85 103 94 98 102C94 97 92 94 88 94Z" fill="#78350F" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />`;
    case 'monkey':
      return `<path d="M86 92C100 91 107 75 98 67C93 63 89 69 94 73" stroke="#9C6234" stroke-width="4.5" stroke-linecap="round" fill="none" />`;
    case 'rooster':
      return `<path d="M85 88C95 82 102 84 100 91C97 96 90 94 86 93Z" fill="#EF4444" stroke="#3E2723" stroke-width="2.2" />
              <path d="M86 91C96 89 102 93 97 98C93 100 88 97 86 95Z" fill="#F59E0B" stroke="#3E2723" stroke-width="2.2" />`;
    case 'dog':
      return `<path d="M87 91C95 87 100 80 95 75" stroke="#F59E0B" stroke-width="5.5" stroke-linecap="round" fill="none">
                <animateTransform attributeName="transform" type="rotate" values="-8 87 91; 8 87 91; -8 87 91" dur="0.9s" repeatCount="indefinite" />
              </path>`;
    case 'pig':
      return `<path d="M88 90C94 88 98 83 94 81C91 80 91 85 96 86" stroke="#FB7185" stroke-width="3" stroke-linecap="round" fill="none" />`;
    default:
      return '';
  }
}

function buildSpeciesEarsAndHeadTop(species: ZodiacSpeciesId, theme: SpeciesTheme): string {
  switch (species) {
    case 'rat':
      return `<g>
        <circle cx="32" cy="27" r="12" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.6" />
        <circle cx="32" cy="27" r="7" fill="#FDA4AF" />
        <circle cx="88" cy="27" r="12" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.6" />
        <circle cx="88" cy="27" r="7" fill="#FDA4AF" />
      </g>`;
    case 'buffalo':
      return `<g>
        <path d="M35 30C21 26 17 15 24 12C29 18 33 23 41 26Z" fill="#FEF3C7" stroke="#3E2723" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M85 30C99 26 103 15 96 12C91 18 87 23 79 26Z" fill="#FEF3C7" stroke="#3E2723" stroke-width="2.5" stroke-linejoin="round" />
        <ellipse cx="26" cy="36" rx="7" ry="4.5" transform="rotate(-20 26 36)" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.4" />
        <ellipse cx="94" cy="36" rx="7" ry="4.5" transform="rotate(20 94 36)" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.4" />
      </g>`;
    case 'tiger':
      return `<g>
        <circle cx="33" cy="27" r="8.5" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.6" />
        <circle cx="33" cy="27.5" r="4.2" fill="#FFF7ED" />
        <circle cx="87" cy="27" r="8.5" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.6" />
        <circle cx="87" cy="27.5" r="4.2" fill="#FFF7ED" />
      </g>`;
    case 'cat':
      return `<g>
        <path d="M29 36L27 16L45 25Z" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.8" stroke-linejoin="round" />
        <path d="M31 33L30 21L41 26Z" fill="#F9A8B4" />
        <path d="M91 36L93 16L75 25Z" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.8" stroke-linejoin="round" />
        <path d="M89 33L90 21L79 26Z" fill="#F9A8B4" />
      </g>`;
    case 'dragon':
      return `<g>
        <!-- Ly Dynasty Dragon: S-curved flame crest (mào lửa chữ S) & flowing side mane fins, no rigid antlers -->
        <path d="M58 23C53 15 62 11 58 4C64 8 67 15 62 23Z" fill="#FBBF24" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
        <path d="M47 24C43 17 47 13 51 16C50 19 49 22 50 24Z" fill="#FDE047" stroke="#3E2723" stroke-width="1.8" stroke-linejoin="round" />
        <path d="M73 24C77 17 73 13 69 16C70 19 71 22 70 24Z" fill="#FDE047" stroke="#3E2723" stroke-width="1.8" stroke-linejoin="round" />
        <!-- Flowing ear fins / bờm mang uốn lượn -->
        <path d="M30 38C18 35 16 25 24 24C28 24 30 29 33 32Z" fill="#FBBF24" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
        <path d="M90 38C102 35 104 25 96 24C92 24 90 29 87 32Z" fill="#FBBF24" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
      </g>`;
    case 'horse':
      return `<g>
        <path d="M34 32L32 14L44 24Z" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M86 32L88 14L76 24Z" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M52 23C55 13 66 13 69 23C65 25 56 25 52 23Z" fill="#78350F" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
      </g>`;
    case 'monkey':
      return `<g>
        <circle cx="25" cy="43" r="8.5" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.6" />
        <circle cx="25" cy="43" r="4.8" fill="#FDE6C4" />
        <circle cx="95" cy="43" r="8.5" fill="${theme.furMid}" stroke="#3E2723" stroke-width="2.6" />
        <circle cx="95" cy="43" r="4.8" fill="#FDE6C4" />
      </g>`;
    case 'rooster':
      return `<g>
        <path d="M49 23C47 13 54 11 57 17C59 10 66 11 66 18C70 14 74 17 70 23Z" fill="#EF4444" stroke="#3E2723" stroke-width="2.3" stroke-linejoin="round" />
      </g>`;
    case 'dog':
      return `<g>
        <path d="M31 32C20 35 16 49 23 55C28 57 32 50 32 41Z" fill="#D97706" stroke="#3E2723" stroke-width="2.6" stroke-linejoin="round" />
        <path d="M89 32C100 35 104 49 97 55C92 57 88 50 88 41Z" fill="#D97706" stroke="#3E2723" stroke-width="2.6" stroke-linejoin="round" />
      </g>`;
    case 'pig':
      return `<g>
        <path d="M32 34C24 23 30 16 42 24Z" fill="${theme.furDark}" stroke="#3E2723" stroke-width="2.6" stroke-linejoin="round" />
        <path d="M88 34C96 23 90 16 78 24Z" fill="${theme.furDark}" stroke="#3E2723" stroke-width="2.6" stroke-linejoin="round" />
      </g>`;
    case 'snake':
      return `<g>
        <!-- Cute little leaf sprout on top of snake head -->
        <path d="M60 22.5Q60 15 65 13" stroke="#15803D" stroke-width="2.2" stroke-linecap="round" />
        <path d="M60 17C54 12 49 15 52 19C54 21 58 20 60 17Z" fill="#4ADE80" stroke="#3E2723" stroke-width="1.8" stroke-linejoin="round" />
        <path d="M61 16C66 10 72 13 69 17.5C67 20 63 19 61 16Z" fill="#22C55E" stroke="#3E2723" stroke-width="1.8" stroke-linejoin="round" />
      </g>`;
    default:
      return '';
  }
}

function buildSpeciesFaceDetails(species: ZodiacSpeciesId, theme: SpeciesTheme): string {
  switch (species) {
    case 'tiger':
      return `<g stroke="#5C3D2E" stroke-width="2.2" stroke-linecap="round">
        <line x1="60" y1="25" x2="60" y2="33" />
        <line x1="54" y1="28" x2="66" y2="28" />
        <line x1="55" y1="32" x2="65" y2="32" />
        <line x1="29" y1="45" x2="34" y2="46" />
        <line x1="91" y1="45" x2="86" y2="46" />
      </g>`;
    case 'cat':
      return `<g stroke="#5C3D2E" stroke-width="1.6" stroke-linecap="round" opacity="0.65">
        <line x1="25" y1="49" x2="32" y2="50" />
        <line x1="25" y1="53" x2="32" y2="53" />
        <line x1="95" y1="49" x2="88" y2="50" />
        <line x1="95" y1="53" x2="88" y2="53" />
      </g>`;
    case 'monkey':
      return `<path d="M60 32C68 32 72 37 73 41C81 41 85 48 82 56C78 63 68 65 60 65C52 65 42 63 38 56C35 48 39 41 47 41C48 37 52 32 60 32Z" fill="#FDE6C4" />`;
    case 'buffalo':
      return `<ellipse cx="60" cy="56" rx="14" ry="9" fill="#D6D3D1" stroke="#3E2723" stroke-width="2" />
              <circle cx="55" cy="54.5" r="1.5" fill="#3E2723" />
              <circle cx="65" cy="54.5" r="1.5" fill="#3E2723" />
              <path d="M55 60Q60 64 65 60" stroke="#FBBF24" stroke-width="2.2" fill="none" />`;
    case 'pig':
      return `<ellipse cx="60" cy="53" rx="9" ry="6.2" fill="${theme.noseColor}" stroke="#3E2723" stroke-width="2" />
              <circle cx="57" cy="53" r="1.5" fill="#3E2723" />
              <circle cx="63" cy="53" r="1.5" fill="#3E2723" />`;
    case 'rooster':
      return `<path d="M55 50L60 56L65 50Z" fill="#F59E0B" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />
              <ellipse cx="60" cy="59" rx="3.5" ry="3" fill="#EF4444" />`;
    case 'dragon':
      return `<g>
        <!-- Flowing Ly-style dragon whiskers & forehead pearl mark -->
        <circle cx="60" cy="30" r="2.3" fill="#FBBF24" stroke="#3E2723" stroke-width="1.4" />
        <path d="M33 52C23 51 18 56 15 52" stroke="#FBBF24" stroke-width="2.4" stroke-linecap="round" fill="none" />
        <path d="M33 52C23 51 18 56 15 52" stroke="#3E2723" stroke-width="0.9" stroke-linecap="round" fill="none" />
        <path d="M87 52C97 51 102 56 105 52" stroke="#FBBF24" stroke-width="2.4" stroke-linecap="round" fill="none" />
        <path d="M87 52C97 51 102 56 105 52" stroke="#3E2723" stroke-width="0.9" stroke-linecap="round" fill="none" />
      </g>`;
    case 'snake':
      return `<g>
        <!-- Tiny cute nostrils & playful side-peeking pink tongue -->
        <circle cx="56.5" cy="49.5" r="1.2" fill="#15803D" />
        <circle cx="63.5" cy="49.5" r="1.2" fill="#15803D" />
        <path d="M54 55.5Q57 58.5 60 55.5Q63 58.5 66 55.5" stroke="#3E2723" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M64.5 56.5Q68.5 59 69.5 63.5L67 62L65.5 64.5Q65 60 63 57Z" fill="#FB7185" stroke="#3E2723" stroke-width="1.3" stroke-linejoin="round" />
      </g>`;
    default:
      return '';
  }
}

function buildSpeciesProp(species: ZodiacSpeciesId): string {
  switch (species) {
    case 'rat':
      return `<g transform="translate(47, 77)">
        <path d="M2 16L24 16L22 5L2 16Z" fill="#FACC15" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />
        <circle cx="14" cy="13" r="1.8" fill="#CA8A04" />
        <circle cx="19" cy="11" r="1.3" fill="#CA8A04" />
      </g>`;
    case 'monkey':
      return `<path d="M48 76C54 88 68 89 74 77C68 82 56 82 48 76Z" fill="#FACC15" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />`;
    case 'cat':
      return `<g transform="translate(47, 79)">
        <ellipse cx="13" cy="9" rx="9" ry="5" fill="#60A5FA" stroke="#3E2723" stroke-width="2" />
        <path d="M21 9L26 5V13Z" fill="#60A5FA" stroke="#3E2723" stroke-width="2" stroke-linejoin="round" />
      </g>`;
    case 'dog':
      return `<g transform="translate(46, 79)">
        <rect x="6" y="6" width="16" height="5" rx="2" fill="#FFFBEB" stroke="#3E2723" stroke-width="1.8" />
        <circle cx="5" cy="6.5" r="3" fill="#FFFBEB" stroke="#3E2723" stroke-width="1.8" />
        <circle cx="5" cy="10.5" r="3" fill="#FFFBEB" stroke="#3E2723" stroke-width="1.8" />
        <circle cx="23" cy="6.5" r="3" fill="#FFFBEB" stroke="#3E2723" stroke-width="1.8" />
        <circle cx="23" cy="10.5" r="3" fill="#FFFBEB" stroke="#3E2723" stroke-width="1.8" />
      </g>`;
    case 'dragon':
      return `<circle cx="60" cy="84" r="7" fill="#38BDF8" stroke="#3E2723" stroke-width="2" />
              <circle cx="58" cy="82" r="2" fill="#FFFFFF" fill-opacity="0.75" />`;
    default:
      return '';
  }
}

function buildZodiacSvg(
  species: ZodiacSpeciesId,
  expression: MascotExpression,
  accessory: MascotAccessoryId,
  withBadgeBg: boolean,
  isPetting: boolean
): string {
  const theme = SPECIES_THEMES[species];
  const isCelebrating = expression === 'celebrating' || isPetting;
  const isSleeping = expression === 'sleeping' && !isPetting;
  const isAlert = expression === 'alert' && !isPetting;
  const isChill = expression === 'chill' && !isPetting;
  const isWorking = expression === 'working' && !isPetting;
  const hasBobaCup = accessory === 'boba_tea' || expression === 'coffee';

  const defs = `<defs>
    <radialGradient id="zFurGrad" cx="42%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${theme.furLight}" />
      <stop offset="68%" stop-color="${theme.furMid}" />
      <stop offset="100%" stop-color="${theme.furDark}" />
    </radialGradient>
    <linearGradient id="zGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <radialGradient id="zBadgeGrad" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="${theme.badgeBg}" />
    </radialGradient>
  </defs>`;

  const bgCircle = withBadgeBg
    ? `<circle cx="60" cy="60" r="57" fill="url(#zBadgeGrad)" stroke="${theme.badgeBorder}" stroke-width="3" />`
    : '';

  const celebratingSparkles = isCelebrating
    ? `<g>
        <path d="M14 25L16 30L21 32L16 34L14 39L12 34L7 32L12 30Z" fill="#F59E0B">
          <animateTransform attributeName="transform" type="rotate" values="0 14 32; 25 14 32; 0 14 32" dur="1.1s" repeatCount="indefinite" />
        </path>
        <path d="M106 24L107.8 28.2L112 30L107.8 31.8L106 36L104.2 31.8L100 30L104.2 28.2Z" fill="#EC4899">
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
        <path d="M35 46Q41 39 47 46" stroke="#3E2723" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M73 46Q79 39 85 46" stroke="#3E2723" stroke-width="3" stroke-linecap="round" fill="none" />
      </g>`
    : isSleeping
    ? `<g>
        <path d="M35 45Q41 50 47 45" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" fill="none" />
        <path d="M73 45Q79 50 85 45" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" fill="none" />
      </g>`
    : isChill
    ? `<g>
        <line x1="35" y1="45.5" x2="47" y2="45.5" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" />
        <line x1="73" y1="45.5" x2="85" y2="45.5" stroke="#3E2723" stroke-width="2.8" stroke-linecap="round" />
      </g>`
    : isAlert
    ? `<g>
        <circle cx="41" cy="45" r="4.8" fill="#FFFFFF" stroke="#3E2723" stroke-width="2.2" />
        <circle cx="41" cy="45" r="1.9" fill="#3E2723" />
        <circle cx="79" cy="45" r="4.8" fill="#FFFFFF" stroke="#3E2723" stroke-width="2.2" />
        <circle cx="79" cy="45" r="1.9" fill="#3E2723" />
        <path d="M93 38C93 38 96.5 42.5 96.5 45C96.5 46.8 95 48 93 48C91 48 89.5 46.8 89.5 45C89.5 42.5 93 38 93 38Z" fill="#60A5FA" stroke="#2563EB" stroke-width="0.9">
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,3; 0,0" dur="1.2s" repeatCount="indefinite" />
        </path>
      </g>`
    : `<g>
        <ellipse cx="41" cy="45.5" rx="4.6" ry="4.9" fill="#3E2723">
          <animate attributeName="ry" values="4.9;4.9;0.5;4.9;4.9" keyTimes="0;0.88;0.92;0.96;1" dur="4s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="39.3" cy="43.7" r="1.7" fill="#FFFFFF" />
        <ellipse cx="79" cy="45.5" rx="4.6" ry="4.9" fill="#3E2723">
          <animate attributeName="ry" values="4.9;4.9;0.5;4.9;4.9" keyTimes="0;0.88;0.92;0.96;1" dur="4s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="77.3" cy="43.7" r="1.7" fill="#FFFFFF" />
      </g>`;

  const headband = '';

  const glasses =
    accessory === 'sunglasses' || accessory === 'nerd_glasses'
      ? `<g>
          <circle cx="41" cy="45.5" r="8.6" fill="#FFFFFF" fill-opacity="0.22" stroke="#374151" stroke-width="2.2" />
          <path d="M36 42L40 46" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.75" stroke-linecap="round" />
          <circle cx="79" cy="45.5" r="8.6" fill="#FFFFFF" fill-opacity="0.22" stroke="#374151" stroke-width="2.2" />
          <path d="M74 42L78 46" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.75" stroke-linecap="round" />
          <path d="M49.6 44.8Q60 43 70.4 44.8" stroke="#374151" stroke-width="2.2" fill="none" />
        </g>`
      : '';

  const topAccessory =
    accessory === 'bucket_hat'
      ? `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.2; 0,0" dur="2.6s" repeatCount="indefinite" />
          <path d="M36 27C38 13 48 9 60 9C72 9 82 13 84 27Z" fill="#FACC15" stroke="#3E2723" stroke-width="2.4" stroke-linejoin="round" />
          <rect x="31" y="24.5" width="58" height="5" rx="2.5" fill="#EAB308" stroke="#3E2723" stroke-width="2.2" />
          <circle cx="60" cy="18" r="3.2" fill="#F97316" stroke="#3E2723" stroke-width="1.2" />
        </g>`
      : accessory === 'crown'
      ? `<g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1.4; 0,0" dur="2.4s" repeatCount="indefinite" />
          <path d="M44 25L47 11L54.5 18.5L60 7.5L65.5 18.5L73 11L76 25Z" fill="url(#zGoldGrad)" stroke="#3E2723" stroke-width="2.2" stroke-linejoin="round" />
          <circle cx="60" cy="19" r="2.2" fill="#EF4444" />
          <circle cx="51.5" cy="20.5" r="1.6" fill="#3B82F6" />
          <circle cx="68.5" cy="20.5" r="1.6" fill="#10B981" />
        </g>`
      : '';

  const centerProp = hasBobaCup
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
    : buildSpeciesProp(species);

  const isSnake = species === 'snake';
  const isDragon = species === 'dragon';
  const bodySection = isSnake
    ? `<g>
        <!-- Wiggling cute snake tail tip on the right -->
        <path d="M84 95C96 95 104 86 101 76C99 71 94 74 95 79C96 84 91 88 83 88Z" fill="url(#zFurGrad)" stroke="#3E2723" stroke-width="2.6" stroke-linejoin="round">
          <animateTransform attributeName="transform" type="rotate" values="-4 85 92; 5 85 92; -4 85 92" dur="2.2s" repeatCount="indefinite" />
        </path>
        <!-- Plump Bottom Coil -->
        <path
          d="M27 89C27 77 41 72 60 72C79 72 93 77 93 89C93 101 79 106 60 106C41 106 27 101 27 89Z"
          fill="url(#zFurGrad)"
          stroke="#3E2723"
          stroke-width="3"
        />
        <!-- Soft Cream Belly Patch on Bottom Coil -->
        <ellipse cx="60" cy="96" rx="22" ry="7.5" fill="${theme.bellyColor || '#FEF9C3'}" />
        <path d="M44 96H76" stroke="#EAB308" stroke-width="1.3" stroke-opacity="0.45" stroke-linecap="round" />
        <!-- Smooth Neck Rising into Head -->
        <path
          d="M44 82C43 72 45 62 50 58L70 58C75 62 77 72 76 82C71 86 49 86 44 82Z"
          fill="url(#zFurGrad)"
          stroke="#3E2723"
          stroke-width="2.8"
          stroke-linejoin="round"
        />
        <!-- Cream Belly Stripes on Neck -->
        <path d="M51 66C55 69 65 69 69 66L68 82C64 84 56 84 52 82Z" fill="${theme.bellyColor || '#FEF9C3'}" />
        <line x1="53" y1="71.5" x2="67" y2="71.5" stroke="#EAB308" stroke-width="1.3" stroke-opacity="0.45" stroke-linecap="round" />
        <line x1="52.5" y1="77" x2="67.5" y2="77" stroke="#EAB308" stroke-width="1.3" stroke-opacity="0.45" stroke-linecap="round" />
      </g>`
    : isDragon
    ? `<g>
        <!-- Serpentine Ly-Dynasty Dragon S-curve tail with golden flame fins -->
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-3 85 90; 4 85 90; -3 85 90" dur="2.4s" repeatCount="indefinite" />
          <path d="M84 95C98 95 108 86 104 74C102 68 96 66 98 59C94 64 91 69 94 76C97 82 91 87 82 87Z" fill="url(#zFurGrad)" stroke="#3E2723" stroke-width="2.6" stroke-linejoin="round" />
          <!-- Golden dorsal flame fins along tail -->
          <path d="M98 59C102 55 106 58 103 63Z" fill="#FBBF24" stroke="#3E2723" stroke-width="1.6" stroke-linejoin="round" />
          <path d="M104 74C109 71 111 75 106 79Z" fill="#FBBF24" stroke="#3E2723" stroke-width="1.6" stroke-linejoin="round" />
          <path d="M101 87C106 88 105 93 99 92Z" fill="#FBBF24" stroke="#3E2723" stroke-width="1.6" stroke-linejoin="round" />
        </g>
        <!-- Left S-curve body loop -->
        <path d="M29 94C21 90 20 79 29 75C35 72 42 75 45 81L40 97C35 97 32 96 29 94Z" fill="url(#zFurGrad)" stroke="#3E2723" stroke-width="2.6" stroke-linejoin="round" />
        <path d="M23 82L18 79L24 76Z" fill="#FBBF24" stroke="#3E2723" stroke-width="1.6" stroke-linejoin="round" />
        <!-- Serpentine coiled lower body -->
        <path
          d="M31 91C31 79 44 74 60 74C76 74 89 79 89 91C89 101 76 106 60 106C44 106 31 101 31 91Z"
          fill="url(#zFurGrad)"
          stroke="#3E2723"
          stroke-width="2.9"
        />
        <ellipse cx="60" cy="97" rx="20" ry="6.8" fill="${theme.bellyColor || '#FEF3C7'}" />
        <!-- Graceful serpentine neck rising into head -->
        <path
          d="M45 83C44 73 46 62 51 58L69 58C74 62 76 73 75 83C70 87 50 87 45 83Z"
          fill="url(#zFurGrad)"
          stroke="#3E2723"
          stroke-width="2.8"
          stroke-linejoin="round"
        />
        <!-- Segmented cream-gold dragon belly scales -->
        <path d="M51.5 66C55 68.5 65 68.5 68.5 66L67.5 82C64 84 56 84 52.5 82Z" fill="${theme.bellyColor || '#FEF3C7'}" />
        <line x1="53" y1="71.5" x2="67" y2="71.5" stroke="#D97706" stroke-width="1.2" stroke-opacity="0.4" stroke-linecap="round" />
        <line x1="52.5" y1="77" x2="67.5" y2="77" stroke="#D97706" stroke-width="1.2" stroke-opacity="0.4" stroke-linecap="round" />
      </g>`
    : `<g>
        ${buildSpeciesBack(species, theme)}
        <!-- Plump Sitting Body -->
        <path
          d="M60 60C78 60 91 70 91 88C91 101 79 107 60 107C41 107 29 101 29 88C29 70 42 60 60 60Z"
          fill="url(#zFurGrad)"
          stroke="#3E2723"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <ellipse cx="60" cy="88" rx="16" ry="12" fill="${theme.bellyColor || '#FFFFFF'}" fill-opacity="0.7" />
      </g>`;

  const pawsSection = isSnake
    ? ''
    : isDragon
    ? `<g>
        <!-- Tiny dragon front claws hugging the pearl / prop -->
        <path d="M39 76C44 74 50 77 52 81C52 84 48 86 44 84C40 82 38 79 39 76Z" fill="${theme.pawColor}" stroke="#3E2723" stroke-width="2.1" stroke-linejoin="round" />
        <path d="M81 76C76 74 70 77 68 81C68 84 72 86 76 84C80 82 82 79 81 76Z" fill="${theme.pawColor}" stroke="#3E2723" stroke-width="2.1" stroke-linejoin="round" />
      </g>`
    : `<g>
        <path d="M36 77C42 75 50 78 52 83C53 86 49 89 44 87C39 85 36 81 36 77Z" fill="${theme.pawColor}" stroke="#3E2723" stroke-width="2.3" stroke-linejoin="round" />
        <path d="M84 77C78 75 70 78 68 83C67 86 71 89 76 87C81 85 84 81 84 77Z" fill="${theme.pawColor}" stroke="#3E2723" stroke-width="2.3" stroke-linejoin="round" />
        <ellipse cx="40" cy="100.5" rx="7.2" ry="8.5" transform="rotate(-14 40 100.5)" fill="${theme.pawColor}" stroke="#3E2723" stroke-width="2.5" />
        <ellipse cx="80" cy="100.5" rx="7.2" ry="8.5" transform="rotate(14 80 100.5)" fill="${theme.pawColor}" stroke="#3E2723" stroke-width="2.5" />
      </g>`;

  const standardNoseAndSmile =
    species === 'buffalo' || species === 'pig' || species === 'rooster' || species === 'snake'
      ? ''
      : `<ellipse cx="60" cy="51.5" rx="3" ry="2.1" fill="${theme.noseColor}" />
         <path d="M55 55.5Q57.5 58.5 60 55.5Q62.5 58.5 65 55.5" stroke="#3E2723" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
         <line x1="60" y1="53.3" x2="60" y2="55.8" stroke="#3E2723" stroke-width="2" stroke-linecap="round" />`;

  return `<svg viewBox="0 0 120 120" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    ${bgCircle}
    <ellipse cx="60" cy="109" rx="35" ry="5.5" fill="#94A3B8" fill-opacity="0.22" />
    ${celebratingSparkles}
    ${alertBadge}
    ${bodySection}
    ${buildSpeciesEarsAndHeadTop(species, theme)}

    <!-- Chubby Head -->
    <path
      d="M60 22C78 22 92 32 92 47C92 60 79 67 60 67C41 67 28 60 28 47C28 32 42 22 60 22Z"
      fill="url(#zFurGrad)"
      stroke="#3E2723"
      stroke-width="3"
      stroke-linejoin="round"
    />

    ${buildSpeciesFaceDetails(species, theme)}
    ${headband}

    <!-- Pastel Pink Cheeks with /// shine -->
    <g opacity="${isPetting ? '1' : '0.9'}">
      <ellipse cx="35.5" cy="53.5" rx="5.6" ry="3.5" fill="#F9B4BC" />
      <line x1="33.5" y1="54.5" x2="35" y2="52.3" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
      <line x1="36.2" y1="54.5" x2="37.7" y2="52.3" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
      <ellipse cx="84.5" cy="53.5" rx="5.6" ry="3.5" fill="#F9B4BC" />
      <line x1="82.3" y1="54.5" x2="83.8" y2="52.3" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
      <line x1="85" y1="54.5" x2="86.5" y2="52.3" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
    </g>

    ${standardNoseAndSmile}
    ${eyes}
    ${glasses}
    ${centerProp}
    ${pawsSection}
    ${topAccessory}
  </svg>`;
}

export const ZodiacAvatar: React.FC<ZodiacAvatarProps> = ({
  species,
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
  const hasCoffee = (expression === 'coffee' || accessory === 'boba_tea') && !isSleeping;

  const svgSrc = useMemo(() => {
    const svg = buildZodiacSvg(species, expression, accessory, withBadgeBg, isPetting);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [species, expression, accessory, withBadgeBg, isPetting]);

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
        alt={`Linh vật ${species}`}
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
            ✨
          </span>
        </>
      )}
    </div>
  );
};
