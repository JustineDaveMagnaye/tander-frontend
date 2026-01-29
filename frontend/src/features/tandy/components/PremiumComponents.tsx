/**
 * TANDER Tandy Premium UI Components
 * Super premium iPhone-like components with glassmorphism, spring animations,
 * and premium visual effects
 */

import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';

// ============================================================================
// PREMIUM COLORS - Sophisticated palette for premium feel
// ============================================================================

export const PREMIUM_COLORS = {
  // Glassmorphism
  glass: {
    white: 'rgba(255, 255, 255, 0.85)',
    whiteMedium: 'rgba(255, 255, 255, 0.65)',
    whiteLight: 'rgba(255, 255, 255, 0.45)',
    dark: 'rgba(0, 0, 0, 0.35)',
    teal: 'rgba(20, 184, 166, 0.12)',
    orange: 'rgba(249, 115, 22, 0.12)',
    pink: 'rgba(255, 107, 138, 0.12)',
  },

  // Premium gradients
  gradient: {
    // Aurora-like ambient
    aurora: ['#F0FDFA', '#FFF7ED', '#FDF2F8', '#F0FDFA'],
    auroraAnimated: ['#CCFBF1', '#FFEDD5', '#FCE7F3', '#CCFBF1'],

    // Premium cards
    premiumCard: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)'],
    premiumCardHover: ['rgba(255,255,255,1)', 'rgba(255,255,255,0.95)'],

    // Premium buttons
    tealPremium: ['#14B8A6', '#0D9488', '#0F766E'],
    orangePremium: ['#FB923C', '#F97316', '#EA580C'],
    romanticPremium: ['#FF6B8A', '#F97316'],

    // Background
    screenBg: ['#FEFEFE', '#F8FAFC', '#F0FDFA'],
    warmBg: ['#FFF9F5', '#FFFFFF', '#FFF0F3'],
  },

  // Glow effects
  glow: {
    teal: 'rgba(20, 184, 166, 0.4)',
    orange: 'rgba(249, 115, 22, 0.4)',
    pink: 'rgba(255, 107, 138, 0.3)',
    white: 'rgba(255, 255, 255, 0.8)',
  },

  // Text
  text: {
    primary: '#1E293B',
    secondary: '#475569',
    muted: '#94A3B8',
    white: '#FFFFFF',
    teal: '#0D9488',
    orange: '#EA580C',
  },

  // Borders
  border: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.08)',
    teal: 'rgba(20, 184, 166, 0.2)',
    orange: 'rgba(249, 115, 22, 0.2)',
  },
};

// ============================================================================
// ANIMATED SPRING BUTTON - Premium press feedback
// ============================================================================

interface AnimatedSpringButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
  haptic?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export const AnimatedSpringButton: React.FC<AnimatedSpringButtonProps> = ({
  onPress,
  children,
  style,
  disabled,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(shadowAnim, {
        toValue: 0.6,
        useNativeDriver: false,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
      Animated.spring(shadowAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 200,
        friction: 8,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

// ============================================================================
// GLASS CARD - Premium frosted glass effect
// ============================================================================

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderColor?: string;
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 60,
  tint = 'light',
  borderColor = PREMIUM_COLORS.border.light,
  glowColor,
}) => {
  return (
    <View style={[glassStyles.container, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={intensity}
          tint={tint}
          style={[
            glassStyles.blurView,
            { borderColor },
            glowColor && {
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            },
          ]}
        >
          {children}
        </BlurView>
      ) : (
        <View
          style={[
            glassStyles.fallbackView,
            { borderColor },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
};

const glassStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 28,
  },
  blurView: {
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: PREMIUM_COLORS.glass.whiteLight,
  },
  fallbackView: {
    backgroundColor: PREMIUM_COLORS.glass.white,
    borderRadius: 28,
    borderWidth: 1,
  },
});

// ============================================================================
// FLOATING ORB - Ambient decorative element
// ============================================================================

interface FloatingOrbProps {
  size: number;
  color: string;
  x: number;
  y: number;
  delay?: number;
  duration?: number;
  opacity?: number;
}

export const FloatingOrb: React.FC<FloatingOrbProps> = ({
  size,
  color,
  x,
  y,
  delay = 0,
  duration = 8000,
  opacity = 0.6,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacityAnim, {
      toValue: opacity,
      duration: 2000,
      delay,
      useNativeDriver: true,
    }).start();

    // Scale up
    Animated.spring(scale, {
      toValue: 1,
      delay,
      useNativeDriver: true,
      tension: 20,
      friction: 7,
    }).start();

    // Float animation
    const floatY = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -30,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 30,
          duration: duration * 1.2,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
      ])
    );

    const floatX = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 20,
          duration: duration * 1.1,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -20,
          duration: duration * 1.3,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: duration * 0.9,
          useNativeDriver: true,
        }),
      ])
    );

    setTimeout(() => {
      floatY.start();
      floatX.start();
    }, delay);

    return () => {
      floatY.stop();
      floatX.stop();
    };
  }, [delay, duration, opacity, translateY, translateX, scale, opacityAnim]);

  return (
    <Animated.View
      style={[
        orbStyles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: `${x}%`,
          top: `${y}%`,
          opacity: opacityAnim,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
      pointerEvents="none"
    />
  );
};

const orbStyles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});

// ============================================================================
// AMBIENT BACKGROUND - Premium floating orbs background
// ============================================================================

interface AmbientBackgroundProps {
  variant?: 'teal' | 'orange' | 'romantic' | 'mixed';
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  variant = 'mixed',
}) => {
  const orbs = useMemo(() => {
    const getColors = () => {
      switch (variant) {
        case 'teal':
          return [
            PREMIUM_COLORS.glass.teal,
            'rgba(94, 234, 212, 0.08)',
            'rgba(45, 212, 191, 0.06)',
          ];
        case 'orange':
          return [
            PREMIUM_COLORS.glass.orange,
            'rgba(251, 146, 60, 0.08)',
            'rgba(253, 186, 116, 0.06)',
          ];
        case 'romantic':
          return [
            PREMIUM_COLORS.glass.pink,
            'rgba(255, 180, 198, 0.08)',
            PREMIUM_COLORS.glass.orange,
          ];
        default:
          return [
            PREMIUM_COLORS.glass.teal,
            PREMIUM_COLORS.glass.orange,
            PREMIUM_COLORS.glass.pink,
            'rgba(94, 234, 212, 0.06)',
          ];
      }
    };

    const colorPalette = getColors();

    return [
      // Large background orbs
      { size: 200, color: colorPalette[0], x: 5, y: 5, delay: 0, duration: 12000, opacity: 0.4 },
      { size: 180, color: colorPalette[1], x: 70, y: 10, delay: 1000, duration: 14000, opacity: 0.35 },
      { size: 160, color: colorPalette[2], x: 85, y: 55, delay: 2000, duration: 11000, opacity: 0.4 },
      { size: 140, color: colorPalette[0], x: -5, y: 70, delay: 500, duration: 13000, opacity: 0.35 },

      // Medium orbs
      { size: 100, color: colorPalette[1], x: 30, y: 25, delay: 1500, duration: 9000, opacity: 0.3 },
      { size: 90, color: colorPalette[2], x: 55, y: 40, delay: 800, duration: 10000, opacity: 0.3 },
      { size: 85, color: colorPalette[0], x: 15, y: 85, delay: 2500, duration: 8500, opacity: 0.35 },

      // Small accent orbs
      { size: 60, color: colorPalette[1], x: 75, y: 80, delay: 300, duration: 7000, opacity: 0.25 },
      { size: 50, color: colorPalette[2], x: 45, y: 15, delay: 1800, duration: 7500, opacity: 0.25 },
    ];
  }, [variant]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {orbs.map((orb, index) => (
        <FloatingOrb key={index} {...orb} />
      ))}
    </View>
  );
};

// ============================================================================
// PREMIUM GRADIENT BUTTON - High-end CTA button
// ============================================================================

interface PremiumGradientButtonProps {
  onPress: () => void;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'primary' | 'secondary' | 'teal' | 'romantic';
  size?: 'medium' | 'large' | 'xlarge';
  fullWidth?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

export const PremiumGradientButton: React.FC<PremiumGradientButtonProps> = ({
  onPress,
  label,
  icon,
  variant = 'primary',
  size = 'large',
  fullWidth = false,
  disabled,
  accessibilityHint,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Subtle pulsing glow effect
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return PREMIUM_COLORS.gradient.orangePremium;
      case 'secondary':
        return ['#F1F5F9', '#E2E8F0', '#CBD5E1'];
      case 'teal':
        return PREMIUM_COLORS.gradient.tealPremium;
      case 'romantic':
        return PREMIUM_COLORS.gradient.romanticPremium;
      default:
        return PREMIUM_COLORS.gradient.orangePremium;
    }
  };

  const getGlowColor = () => {
    switch (variant) {
      case 'primary':
        return PREMIUM_COLORS.glow.orange;
      case 'teal':
        return PREMIUM_COLORS.glow.teal;
      case 'romantic':
        return PREMIUM_COLORS.glow.pink;
      default:
        return 'transparent';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'medium':
        return { height: 56, fontSize: 17, iconSize: 20, borderRadius: 16 };
      case 'large':
        return { height: 64, fontSize: 18, iconSize: 22, borderRadius: 20 };
      case 'xlarge':
        return { height: 72, fontSize: 20, iconSize: 24, borderRadius: 24 };
    }
  };

  const sizeConfig = getSize();
  const textColor = variant === 'secondary' ? PREMIUM_COLORS.text.primary : PREMIUM_COLORS.text.white;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={fullWidth ? { width: '100%' } : undefined}
    >
      <Animated.View
        style={[
          premiumButtonStyles.container,
          {
            height: sizeConfig.height,
            borderRadius: sizeConfig.borderRadius,
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
          fullWidth && { width: '100%' },
        ]}
      >
        {/* Glow effect */}
        <Animated.View
          style={[
            premiumButtonStyles.glow,
            {
              backgroundColor: getGlowColor(),
              opacity: glowAnim,
              borderRadius: sizeConfig.borderRadius + 8,
            },
          ]}
        />

        <LinearGradient
          colors={getGradientColors() as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            premiumButtonStyles.gradient,
            { borderRadius: sizeConfig.borderRadius },
          ]}
        >
          {icon && (
            <Feather
              name={icon}
              size={sizeConfig.iconSize}
              color={textColor}
              style={{ marginRight: 10 }}
            />
          )}
          <Text
            style={[
              premiumButtonStyles.label,
              {
                fontSize: sizeConfig.fontSize,
                color: textColor,
              },
            ]}
          >
            {label}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const premiumButtonStyles = StyleSheet.create({
  container: {
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  glow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

// ============================================================================
// PREMIUM ICON BUTTON - Circular icon button with glow
// ============================================================================

interface PremiumIconButtonProps {
  onPress: () => void;
  icon: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
  backgroundColor?: string;
  glowColor?: string;
  accessibilityLabel: string;
}

export const PremiumIconButton: React.FC<PremiumIconButtonProps> = ({
  onPress,
  icon,
  size = 56,
  color = colors.teal[600],
  backgroundColor = colors.teal[50],
  glowColor = PREMIUM_COLORS.glow.teal,
  accessibilityLabel,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          iconButtonStyles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            transform: [{ scale: scaleAnim }],
          },
          Platform.OS === 'ios' && {
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
          },
        ]}
      >
        <Feather name={icon} size={size * 0.45} color={color} />
      </Animated.View>
    </Pressable>
  );
};

const iconButtonStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ============================================================================
// SHIMMER EFFECT - Loading/highlight animation
// ============================================================================

interface ShimmerEffectProps {
  width: number;
  height: number;
  borderRadius?: number;
}

export const ShimmerEffect: React.FC<ShimmerEffectProps> = ({
  width,
  height,
  borderRadius = 12,
}) => {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width],
  });

  return (
    <View
      style={[
        shimmerStyles.container,
        { width, height, borderRadius },
      ]}
    >
      <Animated.View
        style={[
          shimmerStyles.shimmer,
          {
            width: width * 0.5,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const shimmerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  shimmer: {
    height: '100%',
  },
});

// ============================================================================
// PREMIUM BADGE - Status/feature badge with gradient
// ============================================================================

interface PremiumBadgeProps {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'teal' | 'orange' | 'pink' | 'neutral';
  size?: 'small' | 'medium';
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  label,
  icon,
  variant = 'teal',
  size = 'medium',
}) => {
  const getColors = () => {
    switch (variant) {
      case 'teal':
        return { bg: colors.teal[50], text: colors.teal[700], icon: colors.teal[600] };
      case 'orange':
        return { bg: colors.orange[50], text: colors.orange[700], icon: colors.orange[600] };
      case 'pink':
        return { bg: '#FDF2F8', text: '#BE185D', icon: '#DB2777' };
      case 'neutral':
        return { bg: colors.gray[100], text: colors.gray[700], icon: colors.gray[600] };
    }
  };

  const colorConfig = getColors();
  const sizeConfig = size === 'small'
    ? { paddingH: 10, paddingV: 4, fontSize: 12, iconSize: 12, gap: 4, borderRadius: 8 }
    : { paddingH: 14, paddingV: 6, fontSize: 14, iconSize: 14, gap: 6, borderRadius: 12 };

  return (
    <View
      style={[
        badgeStyles.container,
        {
          backgroundColor: colorConfig.bg,
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
          borderRadius: sizeConfig.borderRadius,
          gap: sizeConfig.gap,
        },
      ]}
    >
      {icon && <Feather name={icon} size={sizeConfig.iconSize} color={colorConfig.icon} />}
      <Text
        style={[
          badgeStyles.label,
          { fontSize: sizeConfig.fontSize, color: colorConfig.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
  },
});

// ============================================================================
// ANIMATED ENTRANCE - Fade/slide entrance animation
// ============================================================================

interface AnimatedEntranceProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  style?: ViewStyle;
}

export const AnimatedEntrance: React.FC<AnimatedEntranceProps> = ({
  children,
  delay = 0,
  direction = 'up',
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(direction === 'scale' ? 0 : 40)).current;
  const scale = useRef(new Animated.Value(direction === 'scale' ? 0.9 : 1)).current;

  useEffect(() => {
    const animations = [
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ];

    if (direction === 'scale') {
      animations.push(
        Animated.spring(scale, {
          toValue: 1,
          delay,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        })
      );
    } else {
      animations.push(
        Animated.spring(translate, {
          toValue: 0,
          delay,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        })
      );
    }

    Animated.parallel(animations).start();
  }, [delay, direction, opacity, translate, scale]);

  const getTransformStyle = () => {
    switch (direction) {
      case 'up':
        return { transform: [{ translateY: translate }, { scale }], opacity };
      case 'down':
        return { transform: [{ translateY: Animated.multiply(translate, -1) }, { scale }], opacity };
      case 'left':
        return { transform: [{ translateX: translate }, { scale }], opacity };
      case 'right':
        return { transform: [{ translateX: Animated.multiply(translate, -1) }, { scale }], opacity };
      case 'scale':
        return { transform: [{ scale }], opacity };
    }
  };

  return (
    <Animated.View style={[style, getTransformStyle()]}>
      {children}
    </Animated.View>
  );
};

export default {
  PREMIUM_COLORS,
  AnimatedSpringButton,
  GlassCard,
  FloatingOrb,
  AmbientBackground,
  PremiumGradientButton,
  PremiumIconButton,
  ShimmerEffect,
  PremiumBadge,
  AnimatedEntrance,
};
