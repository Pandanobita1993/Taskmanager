import React, { useState } from 'react';
import type {
  MascotAccessoryId,
  MascotEggIncubation,
  MascotExpression,
  MascotType,
  MascotVariant,
} from '../../lib/mascot';
import { CapybaraAvatar } from './CapybaraAvatar';
import { EggAvatar } from './EggAvatar';
import { GoatAvatar } from './GoatAvatar';
import { SPRITE_MASCOTS, SpriteAvatar } from './SpriteAvatar';
import { ZodiacAvatar } from './ZodiacAvatar';

interface MascotAvatarProps {
  mascotType?: MascotType;
  expression?: MascotExpression;
  accessory?: MascotAccessoryId;
  variant?: MascotVariant;
  eggIncubation?: MascotEggIncubation;
  size?: number;
  className?: string;
  withBadgeBg?: boolean;
  isPetting?: boolean;
}

export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  mascotType = 'capybara',
  eggIncubation,
  ...props
}) => {
  const [spriteFailed, setSpriteFailed] = useState(false);

  if (eggIncubation && !eggIncubation.hatched) {
    return (
      <EggAvatar
        streakDays={eggIncubation.streakDays}
        targetDays={eggIncubation.targetDays}
        size={props.size}
        className={props.className}
      />
    );
  }

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
