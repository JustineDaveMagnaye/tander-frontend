/**
 * TANDER Premium Action Buttons Component
 * Super Premium iPhone-Quality UI/UX
 *
 * Design Features:
 * - Three premium buttons: Pass, Back, Like
 * - iOS-style colored glow shadows
 * - Multi-layer shadow system for depth
 * - Refined haptic feedback
 * - Premium press animations
 * - Labels underneath buttons
 */

import React, { useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { useResponsive } from '@shared/hooks/useResponsive';

// ============================================================================
// RESPONSIVE HELPER
// ============================================================================
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// ============================================================================
// TYPES
// ============================================================================
type ButtonVariant = 'pass' | 'back' | 'like';

interface ActionButtonsProps {
  onPass: () => void;
  onLike: () => void;
  onBack?: () => void;
  disabled?: boolean;
  disableBack?: boolean;
  style?: ViewStyle;
  showLabels?: boolean;
}

interface ActionButtonProps {
  variant: ButtonVariant;
  onPress: () => void;
  size: number;
  disabled?: boolean;
  showLabel?: boolean;
}

interface IconProps {
  size: number;
  color: string;
}

// ============================================================================
// PREMIUM ICONS (Pixel Perfect, View-Based)
// ============================================================================

// Premium X Icon
const XIcon: React.FC<IconProps> = ({ size, color }) => {
  const thickness = clamp(size * 0.11, 3, 5);
  const length = size * 0.42;

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

// Premium Rewind/Back Icon
const RewindIcon: React.FC<IconProps> = ({ size, color }) => {
  const thickness = clamp(size * 0.1, 2, 4);
  const arrowSize = size * 0.3;
  const arcSize = size * 0.45;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Curved arrow body */}
      <View style={{
        width: arcSize,
        height: arcSize,
        borderWidth: thickness,
        borderColor: color,
        borderRadius: arcSize / 2,
        borderBottomColor: 'transparent',
        borderRightColor: 'transparent',
        transform: [{ rotate: '-45deg' }],
        marginLeft: size * 0.05,
      }} />
      {/* Arrow head */}
      <View style={{
        position: 'absolute',
        top: size * 0.18,
        left: size * 0.2,
        width: arrowSize * 0.5,
        height: arrowSize * 0.5,
        borderLeftWidth: thickness,
        borderTopWidth: thickness,
        borderColor: color,
        transform: [{ rotate: '-45deg' }],
      }} />
    </View>
  );
};

// Premium Heart Icon (Solid) - Large and visible
const HeartIcon: React.FC<IconProps> = ({ size, color }) => {
  const heartSize = size * 0.52;
  const halfHeart = heartSize / 2;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: heartSize,
        height: heartSize,
        backgroundColor: color,
        transform: [{ rotate: '-45deg' }],
        borderRadius: heartSize * 0.15,
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
          top: -halfHeart / 2 + 1,
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
          left: -halfHeart / 2 + 1,
        }} />
      </View>
    </View>
  );
};

// ============================================================================
// PREMIUM BUTTON CONFIG
// ============================================================================
const BUTTON_CONFIG: Record<ButtonVariant, {
  iconColor: string;
  bgColor: string;
  glowColor: string;
  pressedBg: string;
  hapticType: 'light' | 'medium' | 'success';
  label: string;
  labelColor: string;
}> = {
  pass: {
    iconColor: '#FF4458',
    bgColor: '#FFFFFF',
    glowColor: '#FF4458',
    pressedBg: '#FFF5F5',
    hapticType: 'medium',
    label: 'Pass',
    labelColor: '#FF4458',
  },
  back: {
    iconColor: '#FFB800',
    bgColor: '#FFFFFF',
    glowColor: '#FFB800',
    pressedBg: '#FFFBF0',
    hapticType: 'light',
    label: 'Back',
    labelColor: '#E5A600',
  },
  like: {
    iconColor: '#00D26A',
    bgColor: '#FFFFFF',
    glowColor: '#00D26A',
    pressedBg: '#F0FFF5',
    hapticType: 'success',
    label: 'Like',
    labelColor: '#00D26A',
  },
};

// ============================================================================
// ANIMATED PREMIUM BUTTON
// ============================================================================
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ActionButton: React.FC<ActionButtonProps> = ({
  variant,
  onPress,
  size,
  disabled = false,
  showLabel = true,
}) => {
  const config = BUTTON_CONFIG[variant];
  const iconSize = size * 0.48;
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  const handlePress = async () => {
    if (disabled) return;

    try {
      if (config.hapticType === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (config.hapticType === 'light') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderIcon = () => {
    const iconColor = disabled ? '#D1D5DB' : config.iconColor;

    switch (variant) {
      case 'pass':
        return <XIcon size={iconSize} color={iconColor} />;
      case 'back':
        return <RewindIcon size={iconSize} color={iconColor} />;
      case 'like':
        return <HeartIcon size={iconSize} color={iconColor} />;
    }
  };

  // Premium glow shadow
  const glowShadow = disabled ? {} : {
    shadowColor: config.glowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: size * 0.2,
    elevation: 8,
  };

  return (
    <View style={styles.buttonContainer}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessible
        accessibilityRole="button"
        accessibilityLabel={config.label}
        accessibilityHint={`${config.label} this profile`}
        accessibilityState={{ disabled }}
        style={[animatedStyle]}
      >
        {/* Outer glow layer */}
        <View style={[styles.glowWrapper, { borderRadius: size / 2 }, glowShadow]}>
          {/* Main button with depth shadow */}
          <View
            style={[
              styles.button,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: disabled ? '#F3F4F6' : config.bgColor,
              },
              !disabled && styles.buttonShadow,
            ]}
          >
            {/* Inner gradient effect for premium feel */}
            <View style={[
              styles.buttonInner,
              {
                width: size - 4,
                height: size - 4,
                borderRadius: (size - 4) / 2,
              }
            ]}>
              {renderIcon()}
            </View>
          </View>
        </View>
      </AnimatedPressable>

      {/* Label */}
      {showLabel && (
        <Text style={[
          styles.buttonLabel,
          {
            color: disabled ? '#9CA3AF' : config.labelColor,
            marginTop: size * 0.15,
          }
        ]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

// ============================================================================
// ACTION BUTTONS COMPONENT
// ============================================================================
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onPass,
  onLike,
  onBack,
  disabled = false,
  disableBack = false,
  style,
  showLabels = true,
}) => {
  const { isLandscape, isTablet, hp, wp, width } = useResponsive();

  // ============================================================================
  // RESPONSIVE VALUES
  // ============================================================================
  const sizes = useMemo(() => {
    const baseScale = Math.min(width / 375, 1.25);
    const isSmallPhone = width < 360;

    // Main buttons (Pass, Like) - larger
    const mainButtonSize = clamp(
      isLandscape
        ? Math.min(hp(14), wp(8))
        : isTablet
          ? Math.round(76 * baseScale)
          : isSmallPhone
            ? 60
            : Math.round(68 * baseScale),
      56,
      isLandscape ? 72 : isTablet ? 92 : 80
    );

    // Back button - smaller
    const backButtonSize = clamp(
      isLandscape
        ? Math.min(hp(10), wp(6))
        : isTablet
          ? Math.round(56 * baseScale)
          : isSmallPhone
            ? 48
            : Math.round(52 * baseScale),
      44,
      isLandscape ? 56 : isTablet ? 68 : 64
    );

    return {
      mainButton: mainButtonSize,
      backButton: backButtonSize,
    };
  }, [width, isLandscape, isTablet, hp, wp]);

  const buttonGap = useMemo(() => {
    const baseScale = Math.min(width / 375, 1.2);
    const isSmallPhone = width < 360;

    return clamp(
      isLandscape
        ? Math.min(hp(3), 20)
        : isTablet
          ? Math.round(36 * baseScale)
          : isSmallPhone
            ? 20
            : Math.round(28 * baseScale),
      16,
      48
    );
  }, [width, isLandscape, isTablet, hp]);

  return (
    <View style={[styles.container, { gap: buttonGap }, style]}>
      {/* Pass Button */}
      <ActionButton
        variant="pass"
        onPress={onPass}
        size={sizes.mainButton}
        disabled={disabled}
        showLabel={showLabels}
      />

      {/* Back Button - Only show if onBack provided */}
      {onBack && (
        <ActionButton
          variant="back"
          onPress={onBack}
          size={sizes.backButton}
          disabled={disabled || disableBack}
          showLabel={showLabels}
        />
      )}

      {/* Like Button */}
      <ActionButton
        variant="like"
        onPress={onLike}
        size={sizes.mainButton}
        disabled={disabled}
        showLabel={showLabels}
      />
    </View>
  );
};

// ============================================================================
// PREMIUM STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  glowWrapper: {
    // Glow shadow applied dynamically
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  buttonShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonInner: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default ActionButtons;
