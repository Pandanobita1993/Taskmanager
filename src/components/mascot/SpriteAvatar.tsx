import React, { useEffect, useState } from 'react';
import type { MascotAccessoryId, MascotExpression, MascotVariant } from '../../lib/mascot';
import { MascotAccessoryLayer } from './MascotAccessoryLayer';

/** Linh vật đã có bộ ảnh sprite (public/mascot/<id>_open.png + <id>_closed.png). */
export const SPRITE_MASCOTS: ReadonlySet<string> = new Set([
  'capybara',
  'rat',
  'buffalo',
  'tiger',
  'cat',
  'dragon',
  'snake',
  'horse',
  'goat',
  'monkey',
  'rooster',
  'dog',
  'pig',
  'panda',
  'fox',
  'rabbit',
  'penguin',
  'frog',
]);

interface SpriteAvatarProps {
  mascotType: string;
  expression?: MascotExpression;
  accessory?: MascotAccessoryId;
  variant?: MascotVariant;
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
  accessory = 'none',
  variant = 'default',
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
  const isWorking = expression === 'working' && !isPetting;
  const isCoffee = expression === 'coffee' && !isPetting;

  const hasEyeAccessory = accessory === 'sunglasses' || accessory === 'nerd_glasses';
  const [blink, setBlink] = useState(false);
  const [idleHop, setIdleHop] = useState(false);

  useEffect(() => {
    if (hasEyeAccessory || isSleeping || isCelebrating || isChill) return undefined;
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
  }, [hasEyeAccessory, isSleeping, isCelebrating, isChill]);

  useEffect(() => {
    if (isSleeping || isCelebrating || isAlert) return undefined;
    let hopTimer: number;
    let resetTimer: number;
    const scheduleHop = () => {
      hopTimer = window.setTimeout(() => {
        setIdleHop(true);
        resetTimer = window.setTimeout(() => {
          setIdleHop(false);
          scheduleHop();
        }, 700);
      }, 9000 + Math.random() * 7000);
    };
    scheduleHop();
    return () => {
      window.clearTimeout(hopTimer);
      window.clearTimeout(resetTimer);
      setIdleHop(false);
    };
  }, [isSleeping, isCelebrating, isAlert]);

  const eyesClosed = !hasEyeAccessory && (isSleeping || isCelebrating || isChill || blink);
  const base = import.meta.env.BASE_URL || '/';

  const animClass = isCelebrating
    ? 'animate-capy-celebrate'
    : idleHop
    ? 'animate-capy-hop'
    : isSleeping
    ? 'animate-capy-breathe'
    : isAlert
    ? 'animate-capy-alert'
    : isWorking
    ? 'animate-capy-work'
    : isChill || isCoffee
    ? 'animate-capy-chill'
    : 'animate-capy-happy';

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

      <MascotAccessoryLayer mascotType={mascotType} accessory={accessory} variant={variant} />

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

      {isWorking && (
        <span
          className="absolute -top-1 right-1 text-xs animate-capy-float pointer-events-none"
          aria-hidden="true"
        >
          ⚡
        </span>
      )}

      {isCoffee && (
        <span
          className="absolute -top-1 right-1 text-xs animate-capy-steam pointer-events-none"
          aria-hidden="true"
        >
          ☕
        </span>
      )}

      {isChill && (
        <span
          className="absolute -top-1 left-1 text-xs animate-capy-steam pointer-events-none"
          aria-hidden="true"
        >
          🎵
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
