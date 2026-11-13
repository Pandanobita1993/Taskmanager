import React, { useEffect, useState } from 'react';
import type { MascotAccessoryId, MascotExpression } from '../../lib/mascot';

/** Linh vật đã có bộ ảnh sprite (public/mascot/<id>_open.png + <id>_closed.png). */
export const SPRITE_MASCOTS: ReadonlySet<string> = new Set(['capybara', 'goat', 'dragon']);

interface SpriteAvatarProps {
  mascotType: string;
  expression?: MascotExpression;
  accessory?: MascotAccessoryId;
  size?: number;
  className?: string;
  withBadgeBg?: boolean;
  isPetting?: boolean;
  /** Gọi khi ảnh sprite lỗi để quay lại bản SVG. */
  onError?: () => void;
}

export const SpriteAvatar: React.FC<SpriteAvatarProps> = ({
  mascotType,
  expression = 'happy',
  size = 76,
  className = '',
  withBadgeBg = false,
  isPetting = false,
  onError,
}) => {
  const isCelebrating = expression === 'celebrating' || isPetting;
  const isSleeping = expression === 'sleeping' && !isPetting;
  const isAlert = expression === 'alert' && !isPetting;
  const isChill = expression === 'chill' && !isPetting;

  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (isSleeping || isCelebrating || isChill) return undefined;
    let timer: number;
    let reopen: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setBlink(true);
        reopen = window.setTimeout(() => {
          setBlink(false);
          schedule();
        }, 160);
      }, 2600 + Math.random() * 2600);
    };
    schedule();
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(reopen);
      setBlink(false);
    };
  }, [isSleeping, isCelebrating, isChill]);

  const eyesClosed = isSleeping || isCelebrating || isChill || blink;
  const base = import.meta.env.BASE_URL || '/';

  const animClass = isCelebrating
    ? 'animate-capy-celebrate'
    : isSleeping
    ? ''
    : isAlert
    ? 'animate-capy-alert'
    : 'animate-capy-float';

  const imgStyle: React.CSSProperties = {
    colorScheme: 'only light',
    forcedColorAdjust: 'none',
    filter: 'none',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${animClass} ${className}`}
      style={{
        width: size,
        height: size,
        colorScheme: 'only light',
        forcedColorAdjust: 'none',
        ...(withBadgeBg
          ? { background: '#FFFFFF', borderRadius: '9999px', border: '3px solid #FDE68A' }
          : null),
      }}
    >
      <img
        src={`${base}mascot/${mascotType}_open.png`}
        alt={`Linh vật ${mascotType}`}
        width={size}
        height={size}
        draggable={false}
        data-darkreader-ignore=""
        onError={onError}
        className="absolute inset-0 w-full h-full object-contain block pointer-events-none"
        style={{ ...imgStyle, opacity: eyesClosed ? 0 : 1 }}
      />
      <img
        src={`${base}mascot/${mascotType}_closed.png`}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        draggable={false}
        data-darkreader-ignore=""
        onError={onError}
        className="absolute inset-0 w-full h-full object-contain block pointer-events-none"
        style={{ ...imgStyle, opacity: eyesClosed ? 1 : 0 }}
      />

      {isSleeping && (
        <span
          className="absolute top-1 right-2 text-xs font-extrabold text-indigo-600 animate-capy-zzz pointer-events-none"
          aria-hidden="true"
        >
          Zzz
        </span>
      )}

      {isAlert && (
        <span
          className="absolute top-0 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white pointer-events-none"
          aria-hidden="true"
        >
          !
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
