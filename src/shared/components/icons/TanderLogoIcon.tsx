/**
 * Tander Logo Icon Component
 *
 * Uses the official Tander logo PNG image:
 * - Orange outer heart (thick outlined)
 * - Teal inner shapes (two comma shapes meeting at bottom)
 */

import React from 'react';
import { Image } from 'react-native';

// Import the official logo PNG
const TanderLogoPNG = require('../../../../assets/icons/tander-logo.png');

interface TanderLogoIconProps {
  size?: number;
  focused?: boolean;
}

export const TanderLogoIcon: React.FC<TanderLogoIconProps> = ({
  size = 28,
  focused = false,
}) => {
  return (
    <Image
      source={TanderLogoPNG}
      style={{
        width: size,
        height: size,
        opacity: focused ? 1 : 0.4,
      }}
      resizeMode="contain"
    />
  );
};

export default TanderLogoIcon;
