import React, { useState } from 'react';
import type { MascotAccessoryId, MascotExpression, MascotType, MascotVariant } from '../../lib/mascot';
import { CapybaraAvatar } from './CapybaraAvatar';
import { GoatAvatar } from './GoatAvatar';
import { SPRITE_MASCOTS, SpriteAvatar } from './SpriteAvatar';
import { ZodiacAvatar } from './ZodiacAvatar';

interface MascotAvatarProps {
  mascotType?: MascotType;
  expression?: MascotExpression;
  accessory?: MascotAccessoryId;
  variant?: MascotVariant;
  size?: number;
  className?: string;
  withBadgeBg?: boolean;
  isPetting?: boolean;
}

export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  mascotType = 'capybara',
  ...props
}) => {
  const [spriteFailed, setSpriteFailed] = useState(false);

  if (SPRITE_MASCOTS.has(mascotType) && !spriteFailed) {
    return <SpriteAvatar mascotType={mascotType} {...props} onError={() => setSpriteFailed(true)} />;
  }
  if (mascotType === 'capybara') {
    return <CapybaraAvatar {...props} />;
  }
  if (mascotType === 'goat') {
    return <GoatAvatar {...props} />;
  }
  return <ZodiacAvatar species={mascotType} {...props} />;
};
