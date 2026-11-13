import React from 'react';
import type { MascotAccessoryId, MascotExpression, MascotType } from '../../lib/mascot';
import { CapybaraAvatar } from './CapybaraAvatar';
import { GoatAvatar } from './GoatAvatar';

interface MascotAvatarProps {
  mascotType?: MascotType;
  expression?: MascotExpression;
  accessory?: MascotAccessoryId;
  size?: number;
  className?: string;
  withBadgeBg?: boolean;
  isPetting?: boolean;
}

export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  mascotType = 'capybara',
  ...props
}) => {
  if (mascotType === 'goat') {
    return <GoatAvatar {...props} />;
  }
  return <CapybaraAvatar {...props} />;
};
