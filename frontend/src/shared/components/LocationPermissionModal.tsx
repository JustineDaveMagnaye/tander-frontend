/**
 * TANDER Location Permission Modal
 * A premium, mandatory, senior-friendly modal that explains why location is needed
 *
 * Design Principles:
 * - Premium visual design with subtle animations
 * - Large touch targets (56-64px minimum) for seniors
 * - High contrast text (WCAG AAA compliant)
 * - Clear, simple language for users 50+
 * - Beautiful custom illustration with animated elements
 * - MANDATORY: Users must enable location or leave the app
 * - No dismiss, skip, or close options
 * - Reduced motion support for accessibility
 *
 * Orange (#F97316) + Teal (#14B8A6) Design System
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
import { spacing, borderRadius, shadows, touchTargets } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LocationPermissionModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Whether this is the first time asking (unused now, kept for compatibility) */
  isFirstTimeAsking?: boolean;
  /** Number of times user has dismissed (unused now, kept for compatibility) */
  dismissalCount?: number;
  /** Whether to show "Don't ask again" option (unused now, kept for compatibility) */
  showDontAskOption?: boolean;
  /** Called when user taps primary CTA (Open Settings) */
  onOpenSettings: () => void;
  /** Called when user taps to request permission directly */
  onRequestPermission: () => void;
  /** Called when user dismisses the modal (unused now, kept for compatibility) */
  onDismiss?: () => void;
  /** Called when user selects "Don't ask again" (unused now, kept for compatibility) */
  onDontAskAgain?: () => void;
}

// ============================================================================
// ANIMATED ILLUSTRATION COMPONENT
// ============================================================================

interface IllustrationProps {
  size: number;
  reduceMotion: boolean;
}

const LocationIllustration: React.FC<IllustrationProps> = memo(({ size, reduceMotion }) => {
  const iconSize = size * 0.35;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heart1Anim = useRef(new Animated.Value(0)).current;
  const heart2Anim = useRef(new Animated.Value(0)).current;
  const heart3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    // Gentle pulse animation for the main pin
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Slow rotation for decorative ring
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Heart float animations with staggered timing
    const createHeartAnimation = (animValue: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(animValue, {
              toValue: 1,
              duration: 2500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    pulseAnimation.start();
    floatAnimation.start();
    rotateAnimation.start();
    createHeartAnimation(heart1Anim, 0).start();
    createHeartAnimation(heart2Anim, 800).start();
    createHeartAnimation(heart3Anim, 1600).start();

    return () => {
      pulseAnimation.stop();
      floatAnimation.stop();
      rotateAnimation.stop();
    };
  }, [reduceMotion, pulseAnim, floatAnim, rotateAnim, heart1Anim, heart2Anim, heart3Anim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const heartOpacity1 = heart1Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 1, 0.4],
  });

  const heartOpacity2 = heart2Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.9, 0.3],
  });

  const heartOpacity3 = heart3Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 1, 0.5],
  });

  const heartScale1 = heart1Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.9, 1.1, 0.9],
  });

  const heartScale2 = heart2Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.85, 1.05, 0.85],
  });

  const heartScale3 = heart3Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.9, 1.15, 0.9],
  });

  return (
    <View
      style={[styles.illustrationContainer, { width: size, height: size }]}
      accessibilityLabel="Illustration showing a location pin with hearts, representing finding love nearby"
      accessibilityRole="image"
    >
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            width: size * 1.1,
            height: size * 1.1,
            borderRadius: size * 0.55,
            transform: [{ rotate: rotateInterpolate }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(249, 115, 22, 0.15)', 'rgba(20, 184, 166, 0.15)', 'rgba(249, 115, 22, 0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.outerGlowGradient, { borderRadius: size * 0.55 }]}
        />
      </Animated.View>

      {/* Background circle with gradient */}
      <LinearGradient
        colors={[colors.orange[50], colors.teal[50]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.illustrationBackground,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />

      {/* Inner decorative ring */}
      <Animated.View
        style={[
          styles.decorativeRing,
          {
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: size * 0.425,
            transform: [{ rotate: rotateInterpolate }],
          },
        ]}
      />

      {/* Main location pin with floating animation */}
      <Animated.View
        style={[
          styles.illustrationIconContainer,
          {
            transform: [
              { translateY: reduceMotion ? 0 : floatAnim },
              { scale: reduceMotion ? 1 : pulseAnim },
            ],
          },
        ]}
      >
        {/* Pin shadow */}
        <View
          style={[
            styles.pinShadow,
            {
              width: iconSize + 32,
              height: iconSize + 32,
              borderRadius: (iconSize + 32) / 2,
            },
          ]}
        />
        {/* Pin background with gradient */}
        <LinearGradient
          colors={colors.gradient.ctaButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.pinBackground,
            {
              width: iconSize + 28,
              height: iconSize + 28,
              borderRadius: (iconSize + 28) / 2,
            },
          ]}
        >
          <View style={styles.pinInnerGlow}>
            <Feather name="map-pin" size={iconSize} color={colors.white} />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Decorative hearts with animations */}
      <Animated.View
        style={[
          styles.decorativeHeart,
          {
            top: size * 0.08,
            right: size * 0.12,
            opacity: reduceMotion ? 0.8 : heartOpacity1,
            transform: [{ scale: reduceMotion ? 1 : heartScale1 }],
          },
        ]}
      >
        <View style={styles.heartGlow}>
          <Feather name="heart" size={size * 0.15} color={colors.romantic.pink} />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.decorativeHeart,
          {
            bottom: size * 0.12,
            left: size * 0.08,
            opacity: reduceMotion ? 0.7 : heartOpacity2,
            transform: [{ scale: reduceMotion ? 1 : heartScale2 }],
          },
        ]}
      >
        <View style={styles.heartGlow}>
          <Feather name="heart" size={size * 0.12} color={colors.romantic.pinkLight} />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.decorativeHeart,
          {
            top: size * 0.18,
            left: size * 0.1,
            opacity: reduceMotion ? 0.6 : heartOpacity3,
            transform: [{ scale: reduceMotion ? 1 : heartScale3 }],
          },
        ]}
      >
        <View style={styles.heartGlow}>
          <Feather name="heart" size={size * 0.1} color={colors.teal[400]} />
        </View>
      </Animated.View>

      {/* Additional accent hearts */}
      <Animated.View
        style={[
          styles.decorativeHeart,
          {
            bottom: size * 0.2,
            right: size * 0.08,
            opacity: reduceMotion ? 0.5 : heartOpacity2,
            transform: [{ scale: reduceMotion ? 1 : heartScale3 }],
          },
        ]}
      >
        <Feather name="heart" size={size * 0.08} color={colors.orange[300]} />
      </Animated.View>
    </View>
  );
});

LocationIllustration.displayName = 'LocationIllustration';

// ============================================================================
// FEATURE ITEM COMPONENT
// ============================================================================

interface FeatureItemProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  description: string;
  moderateScale: (size: number, factor?: number) => number;
  isLandscape: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = memo(
  ({ icon, iconColor, iconBgColor, title, description, moderateScale, isLandscape }) => {
    const iconContainerSize = isLandscape ? 44 : moderateScale(52);
    const iconSize = isLandscape ? 20 : moderateScale(24);
    const titleSize = isLandscape ? 16 : moderateScale(18);
    const descSize = isLandscape ? 14 : moderateScale(16);

    return (
      <View
        style={styles.featureItem}
        accessible
        accessibilityLabel={`${title}: ${description}`}
      >
        <View
          style={[
            styles.featureIconContainer,
            {
              width: iconContainerSize,
              height: iconContainerSize,
              borderRadius: iconContainerSize / 2,
              backgroundColor: iconBgColor,
            },
          ]}
        >
          <Feather name={icon} size={iconSize} color={iconColor} />
        </View>
        <View style={styles.featureTextContainer}>
          <Text
            style={[
              styles.featureTitle,
              { fontSize: titleSize, lineHeight: titleSize * 1.3 },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.featureDescription,
              { fontSize: descSize, lineHeight: descSize * 1.5 },
            ]}
          >
            {description}
          </Text>
        </View>
      </View>
    );
  }
);

FeatureItem.displayName = 'FeatureItem';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = memo(
  ({ visible, onRequestPermission }) => {
    const insets = useSafeAreaInsets();
    const {
      isTablet,
      isLandscape,
      moderateScale,
      getScreenMargin,
      width,
      height,
      hp,
      wp,
    } = useResponsive();

    const [reduceMotion, setReduceMotion] = React.useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const buttonScaleAnim = useRef(new Animated.Value(1)).current;

    // Check for reduced motion preference
    useEffect(() => {
      AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
      const subscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setReduceMotion
      );
      return () => subscription.remove();
    }, []);

    // Entrance animation
    useEffect(() => {
      if (visible) {
        if (reduceMotion) {
          fadeAnim.setValue(1);
          slideAnim.setValue(0);
        } else {
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
              toValue: 0,
              tension: 50,
              friction: 8,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
    }, [visible, reduceMotion, fadeAnim, slideAnim]);

    // Calculate responsive sizes
    const screenMargin = getScreenMargin();
    const illustrationSize = isTablet
      ? moderateScale(180)
      : isLandscape
      ? Math.min(height * 0.35, 140)
      : moderateScale(160);

    const modalMaxWidth = isTablet ? 580 : width - screenMargin * 2;

    // Button press animation
    const handlePressIn = useCallback(() => {
      if (!reduceMotion) {
        Animated.spring(buttonScaleAnim, {
          toValue: 0.97,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }).start();
      }
    }, [reduceMotion, buttonScaleAnim]);

    const handlePressOut = useCallback(() => {
      if (!reduceMotion) {
        Animated.spring(buttonScaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }).start();
      }
    }, [reduceMotion, buttonScaleAnim]);

    // Button handler with haptic feedback
    const handleEnablePress = useCallback(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRequestPermission();
    }, [onRequestPermission]);

    // Handle Android back button - do nothing (don't allow dismissing)
    const handleBackPress = useCallback(() => {
      return true;
    }, []);

    // Set up back handler when modal is visible
    useEffect(() => {
      if (visible && Platform.OS === 'android') {
        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => {
          subscription.remove();
        };
      }
    }, [visible, handleBackPress]);

    // Responsive text sizes
    const titleSize = isTablet ? 36 : isLandscape ? Math.min(hp(7), 28) : moderateScale(32);
    const subtitleSize = isTablet ? 20 : isLandscape ? Math.min(hp(4), 16) : moderateScale(18);
    const buttonTextSize = isTablet ? 22 : isLandscape ? Math.min(hp(4.5), 18) : moderateScale(20);
    const buttonHeight = isTablet ? 72 : isLandscape ? Math.min(hp(14), 56) : touchTargets.large + 4;

    // Landscape layout
    const renderLandscapeContent = () => (
      <View style={styles.landscapeContainer}>
        {/* Left side - Illustration */}
        <View style={styles.landscapeLeft}>
          <LocationIllustration size={illustrationSize} reduceMotion={reduceMotion} />
        </View>

        {/* Right side - Content */}
        <ScrollView
          style={styles.landscapeRight}
          contentContainerStyle={styles.landscapeRightContent}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.2 }]}
            accessible
            accessibilityRole="header"
          >
            Find Love Nearby
          </Text>

          <Text
            style={[styles.subtitle, { fontSize: subtitleSize, lineHeight: subtitleSize * 1.5 }]}
          >
            TANDER uses your location to show you compatible people in your area.
          </Text>

          <View style={styles.featureListCompact}>
            <FeatureItem
              icon="users"
              iconColor={colors.orange[600]}
              iconBgColor={colors.orange[50]}
              title="Nearby Matches"
              description="See people close to you"
              moderateScale={moderateScale}
              isLandscape
            />
            <FeatureItem
              icon="shield"
              iconColor={colors.teal[600]}
              iconBgColor={colors.teal[50]}
              title="Privacy Protected"
              description="Exact location never shared"
              moderateScale={moderateScale}
              isLandscape
            />
          </View>

          {/* CTA Button */}
          <Animated.View
            style={[
              styles.buttonWrapper,
              { transform: [{ scale: buttonScaleAnim }] },
            ]}
          >
            <TouchableOpacity
              style={[styles.primaryButton, { height: buttonHeight }]}
              onPress={handleEnablePress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Enable Location"
              accessibilityHint="Tap to enable location access and start finding matches near you"
            >
              <LinearGradient
                colors={colors.gradient.ctaButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Feather name="map-pin" size={24} color={colors.white} />
                <Text style={[styles.primaryButtonText, { fontSize: buttonTextSize }]}>
                  Enable Location
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.infoTextCompact}>
            You can change this in device settings
          </Text>
        </ScrollView>
      </View>
    );

    // Portrait layout
    const renderPortraitContent = () => (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <Animated.View
          style={[
            styles.illustrationWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LocationIllustration size={illustrationSize} reduceMotion={reduceMotion} />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            {
              fontSize: titleSize,
              lineHeight: titleSize * 1.2,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          accessible
          accessibilityRole="header"
        >
          Find Love Nearby
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              fontSize: subtitleSize,
              lineHeight: subtitleSize * 1.6,
              opacity: fadeAnim,
            },
          ]}
        >
          TANDER uses your location to help you discover meaningful connections with people in your area.
        </Animated.Text>

        {/* Feature List */}
        <Animated.View
          style={[styles.featureList, { opacity: fadeAnim }]}
        >
          <FeatureItem
            icon="users"
            iconColor={colors.orange[600]}
            iconBgColor={colors.orange[50]}
            title="Discover Nearby People"
            description="Find compatible matches who are close enough to meet in person"
            moderateScale={moderateScale}
            isLandscape={false}
          />
          <FeatureItem
            icon="navigation"
            iconColor={colors.teal[600]}
            iconBgColor={colors.teal[50]}
            title="See Approximate Distances"
            description="Know how far away each person is, like '5 km away'"
            moderateScale={moderateScale}
            isLandscape={false}
          />
          <FeatureItem
            icon="heart"
            iconColor={colors.romantic.pink}
            iconBgColor={colors.romantic.blush}
            title="Better Match Suggestions"
            description="Get matched with people you can realistically meet"
            moderateScale={moderateScale}
            isLandscape={false}
          />
        </Animated.View>

        {/* Privacy Guarantee Card */}
        <Animated.View
          style={[styles.privacyCard, { opacity: fadeAnim }]}
        >
          <LinearGradient
            colors={[colors.teal[50], 'rgba(20, 184, 166, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.privacyCardGradient}
          >
            <View style={styles.privacyHeader}>
              <View style={styles.privacyIconContainer}>
                <Feather name="shield" size={moderateScale(22)} color={colors.teal[600]} />
              </View>
              <Text style={[styles.privacyTitle, { fontSize: moderateScale(18) }]}>
                Your Privacy is Protected
              </Text>
            </View>
            <Text style={[styles.privacyText, { fontSize: moderateScale(16) }]}>
              Your exact location is{' '}
              <Text style={styles.privacyBold}>never shared</Text> with other users.
              They only see approximate distances like "5 km away".
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Enable Location Button */}
        <Animated.View
          style={[
            styles.buttonWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: buttonScaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.primaryButton, { height: buttonHeight }]}
            onPress={handleEnablePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Enable Location"
            accessibilityHint="Tap to enable location access and start finding matches near you"
          >
            <LinearGradient
              colors={colors.gradient.ctaButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <View style={styles.buttonIconContainer}>
                <Feather name="map-pin" size={moderateScale(24)} color={colors.white} />
              </View>
              <Text style={[styles.primaryButtonText, { fontSize: buttonTextSize }]}>
                Enable Location
              </Text>
              <View style={styles.buttonChevron}>
                <Feather name="chevron-right" size={moderateScale(22)} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Info text */}
        <Animated.Text
          style={[styles.infoText, { opacity: fadeAnim }]}
        >
          You can change this later in your device settings
        </Animated.Text>
      </ScrollView>
    );

    return (
      <Modal
        visible={visible}
        animationType={reduceMotion ? 'fade' : 'slide'}
        presentationStyle="fullScreen"
        transparent={false}
        onRequestClose={() => {}}
        statusBarTranslucent
      >
        {/* Background gradient */}
        <LinearGradient
          colors={['#FFFFFF', colors.orange[50], colors.teal[50], '#FFFFFF']}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative background pattern */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.patternCircle, styles.patternCircle1]} />
          <View style={[styles.patternCircle, styles.patternCircle2]} />
          <View style={[styles.patternCircle, styles.patternCircle3]} />
        </View>

        <View
          style={[
            styles.modalContainer,
            {
              paddingTop: insets.top + (isLandscape ? spacing.m : spacing.l),
              paddingBottom: isLandscape ? spacing.m : 0,
              paddingLeft: insets.left + (isLandscape ? wp(3) : screenMargin),
              paddingRight: insets.right + (isLandscape ? wp(3) : screenMargin),
            },
          ]}
        >
          <View style={[styles.contentContainer, { maxWidth: modalMaxWidth }]}>
            {isLandscape ? renderLandscapeContent() : renderPortraitContent()}
          </View>
        </View>
      </Modal>
    );
  }
);

LocationPermissionModal.displayName = 'LocationPermissionModal';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    alignItems: 'center',
  },

  contentContainer: {
    flex: 1,
    width: '100%',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    alignItems: 'center',
    paddingTop: spacing.m,
  },

  // Background pattern
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },

  patternCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.4,
  },

  patternCircle1: {
    width: 300,
    height: 300,
    backgroundColor: colors.orange[100],
    top: -100,
    right: -100,
  },

  patternCircle2: {
    width: 250,
    height: 250,
    backgroundColor: colors.teal[100],
    bottom: -50,
    left: -80,
  },

  patternCircle3: {
    width: 180,
    height: 180,
    backgroundColor: colors.romantic.blush,
    top: '40%',
    right: -60,
  },

  // Landscape layout
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  landscapeLeft: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  landscapeRight: {
    flex: 0.6,
    paddingLeft: spacing.l,
  },

  landscapeRightContent: {
    paddingVertical: spacing.m,
  },

  // Illustration
  illustrationWrapper: {
    marginBottom: spacing.l,
    alignItems: 'center',
  },

  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  outerGlow: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  outerGlowGradient: {
    width: '100%',
    height: '100%',
  },

  illustrationBackground: {
    position: 'absolute',
  },

  decorativeRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    borderStyle: 'dashed',
  },

  illustrationIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  pinShadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    transform: [{ translateY: 4 }],
  },

  pinBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.large,
  },

  pinInnerGlow: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  decorativeHeart: {
    position: 'absolute',
  },

  heartGlow: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Title & Subtitle
  title: {
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.s,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontWeight: '400',
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.l,
    paddingHorizontal: spacing.s,
    maxWidth: 400,
  },

  // Feature List
  featureList: {
    width: '100%',
    gap: spacing.m,
    marginBottom: spacing.l,
  },

  featureListCompact: {
    width: '100%',
    gap: spacing.s,
    marginBottom: spacing.m,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: borderRadius.medium,
    padding: spacing.s,
  },

  featureIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },

  featureTextContainer: {
    flex: 1,
  },

  featureTitle: {
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 2,
  },

  featureDescription: {
    fontWeight: '400',
    color: colors.gray[600],
  },

  // Privacy Card
  privacyCard: {
    width: '100%',
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...shadows.small,
  },

  privacyCardGradient: {
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.teal[200],
    borderRadius: borderRadius.large,
  },

  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.xs,
  },

  privacyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.teal[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  privacyTitle: {
    fontWeight: '600',
    color: colors.teal[700],
    flex: 1,
  },

  privacyText: {
    fontWeight: '400',
    color: colors.teal[700],
    lineHeight: 24,
    marginLeft: 52,
  },

  privacyBold: {
    fontWeight: '700',
    color: colors.teal[800],
  },

  // Spacer
  spacer: {
    flex: 1,
    minHeight: spacing.l,
  },

  // Button
  buttonWrapper: {
    width: '100%',
  },

  primaryButton: {
    width: '100%',
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    ...shadows.large,
    shadowColor: colors.orange[500],
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  primaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.l,
  },

  buttonIconContainer: {
    marginRight: spacing.xs,
  },

  buttonChevron: {
    marginLeft: spacing.xs,
  },

  primaryButtonText: {
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // Info text
  infoText: {
    marginTop: spacing.m,
    fontSize: 15,
    fontWeight: '400',
    color: colors.gray[500],
    textAlign: 'center',
    paddingBottom: spacing.m,
  },

  infoTextCompact: {
    marginTop: spacing.s,
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray[500],
    textAlign: 'center',
  },
});

export default LocationPermissionModal;
