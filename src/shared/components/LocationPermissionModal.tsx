/**
 * TANDER Location Permission Modal - Super Premium iPhone Animations
 *
 * Apple-level animations:
 * - Staggered entrance with spring physics
 * - Parallax depth effects
 * - Micro-interactions on every element
 * - Smooth 60fps native driver animations
 * - iOS-style easing curves
 */

import React, { useCallback, memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  BackHandler,
  AccessibilityInfo,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { useResponsive } from '@shared/hooks/useResponsive';

// ============================================================================
// TYPES
// ============================================================================

export interface LocationPermissionModalProps {
  visible: boolean;
  isFirstTimeAsking?: boolean;
  dismissalCount?: number;
  showDontAskOption?: boolean;
  onOpenSettings: () => void;
  onRequestPermission: () => void;
  onDismiss?: () => void;
  onDontAskAgain?: () => void;
}

// iOS-style spring config
const SPRING_CONFIG = {
  tension: 50,
  friction: 7,
  useNativeDriver: true,
};

// ============================================================================
// PREMIUM ANIMATED ILLUSTRATION
// ============================================================================

interface IllustrationProps {
  size: number;
  reduceMotion: boolean;
  delay: number;
}

const PremiumIllustration: React.FC<IllustrationProps> = memo(({ size, reduceMotion, delay }) => {
  // Entrance animations
  const entranceScale = useRef(new Animated.Value(0.3)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceRotate = useRef(new Animated.Value(-0.1)).current;

  // Continuous animations
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const ring1Scale = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.8)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const outerRingRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    const entranceAnim = Animated.parallel([
      Animated.spring(entranceScale, {
        toValue: 1,
        ...SPRING_CONFIG,
        delay,
      }),
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(entranceRotate, {
        toValue: 0,
        ...SPRING_CONFIG,
        delay,
      }),
    ]);

    entranceAnim.start();

    if (reduceMotion) return;

    // Continuous breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.02,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Ring 1 ripple
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring1Scale, {
            toValue: 1.3,
            duration: 2500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ring1Opacity, {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(ring1Opacity, {
              toValue: 0,
              duration: 2200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(ring1Scale, {
          toValue: 0.8,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Ring 2 ripple (delayed)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring2Scale, {
              toValue: 1.2,
              duration: 2500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(ring2Opacity, {
                toValue: 0.4,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(ring2Opacity, {
                toValue: 0,
                duration: 2200,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.timing(ring2Scale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1200);

    // Slow outer ring rotation
    Animated.loop(
      Animated.timing(outerRingRotate, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [reduceMotion, delay]);

  const iconSize = size * 0.22;
  const coreSize = size * 0.42;
  const middleSize = size * 0.58;
  const outerSize = size * 0.74;

  const rotateInterpolate = outerRingRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const entranceRotateInterpolate = entranceRotate.interpolate({
    inputRange: [-0.1, 0],
    outputRange: ['-10deg', '0deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: entranceOpacity,
        transform: [
          { scale: entranceScale },
          { rotate: entranceRotateInterpolate },
        ],
      }}
    >
      {/* Animated ripple rings */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: size,
          borderWidth: 2,
          borderColor: colors.orange[400],
          opacity: ring1Opacity,
          transform: [{ scale: ring1Scale }],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: size,
          borderWidth: 2,
          borderColor: colors.teal[400],
          opacity: ring2Opacity,
          transform: [{ scale: ring2Scale }],
        }}
      />

      {/* Rotating outer decoration */}
      <Animated.View
        style={{
          position: 'absolute',
          width: outerSize + 10,
          height: outerSize + 10,
          borderRadius: (outerSize + 10) / 2,
          borderWidth: 1,
          borderColor: 'rgba(249, 115, 22, 0.15)',
          borderStyle: 'dashed',
          transform: [{ rotate: rotateInterpolate }],
        }}
      />

      {/* Outer frosted ring */}
      <View
        style={{
          position: 'absolute',
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
          backgroundColor: 'rgba(255,255,255,0.6)',
        }}
      />

      {/* Middle white ring */}
      <View
        style={{
          position: 'absolute',
          width: middleSize,
          height: middleSize,
          borderRadius: middleSize / 2,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 6,
        }}
      />

      {/* Core icon with animations */}
      <Animated.View
        style={{
          transform: [
            { translateY: reduceMotion ? 0 : floatAnim },
            { scale: reduceMotion ? 1 : breatheAnim },
          ],
        }}
      >
        <LinearGradient
          colors={['#FB923C', '#F97316', '#EA580C']}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.8, y: 0.8 }}
          style={{
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.orange[500],
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          <Feather name="map-pin" size={iconSize} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
});

// ============================================================================
// ANIMATED FEATURE ROW
// ============================================================================

interface FeatureRowProps {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  delay: number;
  index: number;
}

const FeatureRow: React.FC<FeatureRowProps> = memo(({ icon, iconBg, iconColor, title, subtitle, delay, index }) => {
  const translateX = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 16,
        marginBottom: 12,
        opacity,
        transform: [{ translateX }, { scale }],
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        <Feather name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#1C1C1E', marginBottom: 2 }} maxFontSizeMultiplier={FONT_SCALING.BODY}>
          {title}
        </Text>
        <Text style={{ fontSize: 15, color: '#8E8E93', lineHeight: 20 }} maxFontSizeMultiplier={FONT_SCALING.BODY}>
          {subtitle}
        </Text>
      </View>
    </Animated.View>
  );
});

// ============================================================================
// ANIMATED PREMIUM BUTTON
// ============================================================================

interface PremiumButtonProps {
  onPress: () => void;
  reduceMotion: boolean;
  delay: number;
}

const PremiumButton: React.FC<PremiumButtonProps> = memo(({ onPress, reduceMotion, delay }) => {
  const entranceY = useRef(new Animated.Value(30)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceScale = useRef(new Animated.Value(0.9)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(entranceY, {
        toValue: 0,
        ...SPRING_CONFIG,
        delay,
      }),
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(entranceScale, {
        toValue: 1,
        ...SPRING_CONFIG,
        delay,
      }),
    ]).start();

    if (reduceMotion) return;

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.5,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1.02,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [reduceMotion, delay]);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(pressScale, {
      toValue: 0.96,
      tension: 400,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      tension: 400,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View
      style={{
        width: '100%',
        opacity: entranceOpacity,
        transform: [
          { translateY: entranceY },
          { scale: entranceScale },
        ],
      }}
    >
      {/* Animated glow */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 6,
          left: 16,
          right: 16,
          height: 56,
          borderRadius: 18,
          backgroundColor: colors.orange[400],
          opacity: glowOpacity,
          transform: [{ scaleY: 0.5 }, { scale: glowScale }],
        }}
      />

      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel="Enable Location"
        >
          <LinearGradient
            colors={['#FB923C', '#F97316', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 58,
              borderRadius: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.orange[600],
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Feather name="navigation" size={20} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#FFF', letterSpacing: 0.3 }} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
              Enable Location
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});

// ============================================================================
// ANIMATED TEXT COMPONENTS
// ============================================================================

interface AnimatedTextProps {
  children: React.ReactNode;
  style?: any;
  delay: number;
}

const AnimatedTitle: React.FC<AnimatedTextProps> = memo(({ children, style, delay }) => {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        ...SPRING_CONFIG,
        delay,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        ...SPRING_CONFIG,
        delay,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.Text
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      maxFontSizeMultiplier={FONT_SCALING.TITLE}
    >
      {children}
    </Animated.Text>
  );
});

const AnimatedSubtitle: React.FC<AnimatedTextProps> = memo(({ children, style, delay }) => {
  const translateY = useRef(new Animated.Value(15)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 60,
        friction: 10,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.Text
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
      maxFontSizeMultiplier={FONT_SCALING.BODY}
    >
      {children}
    </Animated.Text>
  );
});

// ============================================================================
// ANIMATED BACKGROUND
// ============================================================================

const AnimatedBackground: React.FC<{ reduceMotion: boolean }> = memo(({ reduceMotion }) => {
  const orb1Scale = useRef(new Animated.Value(0.8)).current;
  const orb1Opacity = useRef(new Animated.Value(0)).current;
  const orb2Scale = useRef(new Animated.Value(0.8)).current;
  const orb2Opacity = useRef(new Animated.Value(0)).current;
  const orb1Float = useRef(new Animated.Value(0)).current;
  const orb2Float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations for orbs
    Animated.parallel([
      Animated.spring(orb1Scale, {
        toValue: 1,
        tension: 30,
        friction: 10,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(orb1Opacity, {
        toValue: 1,
        duration: 800,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.spring(orb2Scale, {
        toValue: 1,
        tension: 30,
        friction: 10,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(orb2Opacity, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (reduceMotion) return;

    // Floating animations for orbs
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Float, {
          toValue: 15,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orb1Float, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Float, {
          toValue: -12,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orb2Float, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [reduceMotion]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#FAFBFC', '#F5F7F8', '#EEF7F6', '#FAFBFC']}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated orb 1 */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: 'rgba(249, 115, 22, 0.08)',
          opacity: orb1Opacity,
          transform: [{ scale: orb1Scale }, { translateY: orb1Float }],
        }}
      />

      {/* Animated orb 2 */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: -40,
          left: -50,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(20, 184, 166, 0.06)',
          opacity: orb2Opacity,
          transform: [{ scale: orb2Scale }, { translateY: orb2Float }],
        }}
      />
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = memo(
  ({ visible, onRequestPermission }) => {
    const insets = useSafeAreaInsets();
    const { isTablet, isLandscape, moderateScale, getScreenMargin, width, height } = useResponsive();
    const [reduceMotion, setReduceMotion] = React.useState(false);

    useEffect(() => {
      AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
      const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
      return () => sub.remove();
    }, []);

    const handleBackPress = useCallback(() => true, []);

    useEffect(() => {
      if (visible && Platform.OS === 'android') {
        const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => sub.remove();
      }
    }, [visible, handleBackPress]);

    const screenMargin = getScreenMargin();
    const illustrationSize = isTablet ? 200 : isLandscape ? Math.min(height * 0.4, 160) : moderateScale(180);
    const maxWidth = isTablet ? 520 : width - screenMargin * 2;

    // Staggered animation delays
    const DELAYS = {
      illustration: 0,
      title: 150,
      subtitle: 250,
      feature1: 350,
      feature2: 450,
      button: 550,
      helper: 650,
    };

    return (
      <Modal
        visible={visible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => {}}
        statusBarTranslucent
      >
        <AnimatedBackground reduceMotion={reduceMotion} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            alignItems: 'center',
            paddingTop: insets.top + (isLandscape ? spacing.m : spacing.xl),
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: screenMargin,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', maxWidth, alignItems: 'center' }}>
            {/* Illustration */}
            <View style={{ marginBottom: spacing.xl }}>
              <PremiumIllustration
                size={illustrationSize}
                reduceMotion={reduceMotion}
                delay={DELAYS.illustration}
              />
            </View>

            {/* Title */}
            <AnimatedTitle
              delay={DELAYS.title}
              style={{
                fontSize: isTablet ? 34 : 30,
                fontWeight: '700',
                color: '#1C1C1E',
                textAlign: 'center',
                marginBottom: 12,
                letterSpacing: -0.5,
              }}
            >
              Find Love Nearby
            </AnimatedTitle>

            {/* Subtitle */}
            <AnimatedSubtitle
              delay={DELAYS.subtitle}
              style={{
                fontSize: isTablet ? 17 : 16,
                color: '#8E8E93',
                textAlign: 'center',
                marginBottom: spacing.xl,
                lineHeight: 24,
                paddingHorizontal: 16,
              }}
            >
              TANDER uses your location to show you{'\n'}compatible people in your area.
            </AnimatedSubtitle>

            {/* Feature rows */}
            <View style={{ width: '100%', marginBottom: spacing.xl }}>
              <FeatureRow
                icon="users"
                iconBg="rgba(249, 115, 22, 0.12)"
                iconColor={colors.orange[600]}
                title="Nearby Matches"
                subtitle="See people close to you"
                delay={DELAYS.feature1}
                index={0}
              />
              <FeatureRow
                icon="shield"
                iconBg="rgba(20, 184, 166, 0.12)"
                iconColor={colors.teal[600]}
                title="Privacy Protected"
                subtitle="Exact location never shared"
                delay={DELAYS.feature2}
                index={1}
              />
            </View>

            {/* Button */}
            <PremiumButton
              onPress={onRequestPermission}
              reduceMotion={reduceMotion}
              delay={DELAYS.button}
            />

            {/* Helper text */}
            <AnimatedSubtitle
              delay={DELAYS.helper}
              style={{
                marginTop: 18,
                fontSize: 13,
                color: '#AEAEB2',
                textAlign: 'center',
              }}
            >
              You can change this in device settings
            </AnimatedSubtitle>
          </View>
        </ScrollView>
      </Modal>
    );
  }
);

LocationPermissionModal.displayName = 'LocationPermissionModal';

export default LocationPermissionModal;
