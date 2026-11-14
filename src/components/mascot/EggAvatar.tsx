import React from 'react';

interface EggAvatarProps {
  streakDays?: number;
  targetDays?: number;
  size?: number;
  className?: string;
}

/**
 * Phiên bản Ấp Trứng (5 ngày điểm danh đúng/sớm giờ liên tục).
 * Hiển thị quả trứng bí ẩn trong ổ rơm với vết nứt & ánh sáng tăng dần theo từng ngày.
 */
export const EggAvatar: React.FC<EggAvatarProps> = ({
  streakDays = 0,
  targetDays = 5,
  size = 76,
  className = '',
}) => {
  const progress = Math.max(0, Math.min(streakDays, targetDays));
  const animClass =
    progress >= 4
      ? 'animate-capy-celebrate'
      : progress >= 2
      ? 'animate-capy-chill'
      : 'animate-capy-breathe';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${animClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-sm overflow-visible">
        <defs>
          <radialGradient id="eggWarmGlow" cx="50%" cy="48%" r="46%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity={0.25 + progress * 0.14} />
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="eggShellGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="65%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>
        </defs>

        {/* Warm aura */}
        <circle cx="60" cy="58" r="48" fill="url(#eggWarmGlow)" />

        {/* Back straw nest */}
        <ellipse cx="60" cy="93" rx="38" ry="13" fill="#B45309" stroke="#3E2723" strokeWidth="3.2" />
        <ellipse cx="60" cy="91" rx="32" ry="9" fill="#92400E" />

        {/* Mystery Egg body */}
        <path
          d="M60 16 C40 16, 28 45, 28 69 C28 87, 42 96, 60 96 C78 96, 92 87, 92 69 C92 45, 80 16, 60 16 Z"
          fill="url(#eggShellGrad)"
          stroke="#3E2723"
          strokeWidth="3.6"
          strokeLinejoin="round"
        />

        {/* Cute pastel spots */}
        <circle cx="44" cy="44" r="5.5" fill="#FDBA74" fillOpacity="0.65" />
        <circle cx="76" cy="56" r="6.5" fill="#F9A8D4" fillOpacity="0.55" />
        <circle cx="46" cy="74" r="4.5" fill="#A5F3FC" fillOpacity="0.7" />
        <circle cx="71" cy="36" r="3.8" fill="#FDBA74" fillOpacity="0.6" />

        {/* Gloss highlight */}
        <path
          d="M44 28 C38 35, 35 46, 35 55"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />

        {/* Progressive cracks as streakDays increases */}
        {progress >= 1 && (
          <path
            d="M58 44 L53 51 L59 56"
            fill="none"
            stroke="#3E2723"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {progress >= 2 && (
          <path
            d="M59 56 L54 63 L62 68"
            fill="none"
            stroke="#3E2723"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {progress >= 3 && (
          <path
            d="M62 68 L70 63 L75 70 M53 51 L45 49"
            fill="none"
            stroke="#3E2723"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {progress >= 4 && (
          <>
            {/* Glowing crack light peeking through before hatch! */}
            <path
              d="M45 49 L53 51 L59 56 L54 63 L62 68 L70 63 L75 70"
              fill="none"
              stroke="#FACC15"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.65"
            />
            <path
              d="M45 49 L53 51 L59 56 L54 63 L62 68 L70 63 L75 70"
              fill="none"
              stroke="#3E2723"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Front woven straw rim */}
        <path
          d="M23 93 Q60 107 97 93 C95 104, 79 110, 60 110 C41 110, 25 104, 23 93 Z"
          fill="#D97706"
          stroke="#3E2723"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path d="M34 99 Q46 104 56 101" fill="none" stroke="#FEF3C7" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M65 102 Q76 105 86 98" fill="none" stroke="#FEF3C7" strokeWidth="2.2" strokeLinecap="round" />

        {/* Sparkle stars */}
        {progress >= 1 && (
          <path
            d="M95 24 L97 29 L102 31 L97 33 L95 38 L93 33 L88 31 L93 29 Z"
            fill="#FACC15"
            stroke="#3E2723"
            strokeWidth="1.2"
          />
        )}
        {progress >= 3 && (
          <path
            d="M22 30 L23.5 34 L27.5 35.5 L23.5 37 L22 41 L20.5 37 L16.5 35.5 L20.5 34 Z"
            fill="#F472B6"
            stroke="#3E2723"
            strokeWidth="1.2"
          />
        )}
      </svg>
    </div>
  );
};
