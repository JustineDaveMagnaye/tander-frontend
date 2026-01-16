/**
 * TANDER Action Buttons Component
 * 100% Recoded following LoginScreen & ProfileScreen patterns
 *
 * Design Patterns:
 * - clamp() helper for responsive sizing
 * - useMemo for computed responsive values
 * - View-based icons using geometric shapes
 * - Design system colors and spacing
 *
 * Senior-friendly: Large touch targets (56-72px), clear icons, haptic feedback
 * Responsive: Adapts to all screen sizes and orientations
 */

import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

// ============================================================================
// RESPONSIVE HELPER - Clamps values for all screen sizes
// ============================================================================
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// ============================================================================
// TYPES
// ============================================================================
type ButtonVariant = 'pass' | 'like';

interface ActionButtonsProps {
  onPass: () => void;
  onLike: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  layout?: 'horizontal' | 'vertical';
}

interface ActionButtonProps {
  variant: ButtonVariant;
  onPress: () => void;
  size: number;
  disabled?: boolean;
}

interface IconProps {
  size: number;
  color: string;
}

// ============================================================================
// VIEW-BASED ICONS (matching ProfileScreen style)
// ============================================================================

// X Icon for Pass
const XIcon: React.FC<IconProps> = ({ size, color }) => {
  const thickness = clamp(size * 0.12, 3, 5);
  const length = size * 0.5;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        position: 'absolute',
        width: length,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: [{ rotate: '45deg' }],
      }} />
      <View style={{
        position: 'absolute',
        width: length,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: [{ rotate: '-45deg' }],
      }} />
    </View>
  );
};

// Heart Icon for Like (solid filled)
const HeartIcon: React.FC<IconProps> = ({ size, color }) => {
  const heartSize = size * 0.5;
  const halfHeart = heartSize / 2;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: heartSize,
        height: heartSize,
        backgroundColor: color,
        transform: [{ rotate: '-45deg' }],
        borderRadius: heartSize * 0.1,
        marginTop: size * 0.08,
      }}>
        {/* Top bump */}
        <View style={{
          position: 'absolute',
          width: heartSize,
          height: halfHeart,
          backgroundColor: color,
          borderTopLeftRadius: halfHeart,
          borderTopRightRadius: halfHeart,
          top: -halfHeart / 2,
          left: 0,
        }} />
        {/* Left bump */}
        <View style={{
          position: 'absolute',
          width: halfHeart,
          height: heartSize,
          backgroundColor: color,
          borderTopLeftRadius: halfHeart,
          borderBottomLeftRadius: halfHeart,
          top: 0,
          left: -halfHeart / 2,
        }} />
      </View>
    </View>
  );
};

// ============================================================================
// BUTTON CONFIG
// ============================================================================
const BUTTON_CONFIG: Record<ButtonVariant, {
  color: string;
  bgColor: string;
  borderColor: string;
  hapticType: 'success' | 'medium';
  label: string;
}> = {
  pass: {
    color: colors.romantic.passRed,
    bgColor: colors.white,
    borderColor: colors.romantic.passRed,
    hapticType: 'medium',
    label: 'Pass',
  },
  like: {
    color: colors.romantic.likeGreen,
    bgColor: colors.white,
    borderColor: colors.romantic.likeGreen,
    hapticType: 'success',
    label: 'Like',
  },
};

// ============================================================================
// ACTION BUTTON COMPONENT
// ============================================================================
const ActionButton: React.FC<ActionButtonProps> = ({
  variant,
  onPress,
  size,
  disabled = false,
}) => {
  const config = BUTTON_CONFIG[variant];
  const iconSize = size * 0.4;

  const handlePress = async () => {
    if (disabled) return;

    try {
      if (config.hapticType === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      // Haptics not available on this device
    }
    onPress();
  };

  const renderIcon = () => {
    const iconColor = disabled ? colors.neutral.disabled : config.color;

    switch (variant) {
      case 'pass':
        return <XIcon size={iconSize} color={iconColor} />;
      case 'like':
        return <HeartIcon size={iconSize} color={iconColor} />;
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={config.label}
      accessibilityHint={`${config.label} this profile`}
      accessibilityState={{ disabled }}
    >
      <View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: disabled ? colors.neutral.background : config.bgColor,
            borderColor: disabled ? colors.neutral.disabled : config.borderColor,
          },
          disabled && styles.disabled,
        ]}
      >
        {renderIcon()}
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// ACTION BUTTONS COMPONENT
// ============================================================================
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onPass,
  onLike,
  disabled = false,
  style,
  layout = 'horizontal',
}) => {
  const { isLandscape, isTablet, hp, wp, width } = useResponsive();

  // ============================================================================
  // RESPONSIVE VALUES (using useMemo like ProfileScreen)
  // ============================================================================
  const buttonSize = useMemo(() => {
    const baseScale = Math.min(width / 375, 1.2);
    const isSmallPhone = width < 360;

    // Primary buttons (Pass, Like) - 56px minimum for senior accessibility
    return clamp(
      isLandscape
        ? Math.min(hp(12), wp(7))
        : isTablet
          ? Math.round(80 * baseScale)
          : isSmallPhone
            ? 56 // Fixed 56px on tiny screens to ensure fit
            : Math.round(64 * baseScale),
      56,
      isLandscape ? 64 : isTablet ? 88 : 72
    );
  }, [width, isLandscape, isTablet, hp, wp]);

  const buttonGap = useMemo(() => {
    const baseScale = Math.min(width / 375, 1.2);
    const isSmallPhone = width < 360;

    return clamp(
      isLandscape
        ? Math.min(hp(2), 16)
        : isTablet
          ? Math.round(32 * baseScale)
          : isSmallPhone
            ? 12 // Reduced gap on tiny screens
            : Math.round(24 * baseScale),
      isSmallPhone ? 8 : 16, // Allow smaller minimum on tiny screens
      40
    );
  }, [width, isLandscape, isTablet, hp]);

  const isVertical = layout === 'vertical';

  return (
    <View
      style={[
        styles.container,
        isVertical ? styles.vertical : styles.horizontal,
        { gap: buttonGap },
        style,
      ]}
    >
      {/* Pass Button */}
      <ActionButton
        variant="pass"
        onPress={onPass}
        size={buttonSize}
        disabled={disabled}
      />

      {/* Like Button */}
      <ActionButton
        variant="like"
        onPress={onLike}
        size={buttonSize}
        disabled={disabled}
      />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontal: {
    flexDirection: 'row',
  },
  vertical: {
    flexDirection: 'column-reverse',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    ...shadows.medium,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ActionButtons;
