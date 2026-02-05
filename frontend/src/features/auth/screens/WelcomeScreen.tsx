/**
 * TANDER WelcomeScreen - Super Premium iPhone UI/UX
 * Inspired by Apple's design language with refined glassmorphism
 *
 * Design Principles:
 * - Clean, minimal iOS aesthetic with SF-style typography
 * - Refined glassmorphism with subtle depth
 * - Smooth, delightful micro-interactions
 * - Senior-friendly (56-64px touch targets, 18px+ fonts)
 * - Fully responsive portrait & landscape layouts
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  ScrollView,
  AccessibilityInfo,
  Animated,
  Image,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';
import { useResponsive } from '@shared/hooks/useResponsive';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { getVerificationConfig } from '@/services/api/authApi';

const TanderLogo = require('../../../../assets/icons/tander-logo.png');

// ============================================================================
// PREMIUM iOS DESIGN SYSTEM
// ============================================================================

const iOS = {
  // Refined warm sunset to ocean gradient
  gradient: {
    colors: ['#FF9466', '#FF7849', '#FF5C35', '#20C997', '#12B886'] as const,
    locations: [0, 0.22, 0.42, 0.72, 1] as const,
  },

  // Glass effects
  glass: {
    white: 'rgba(255, 255, 255, 0.92)',
    whiteBorder: 'rgba(255, 255, 255, 0.6)',
    tint: 'rgba(255, 255, 255, 0.15)',
    overlay: 'rgba(255, 255, 255, 0.08)',
  },

  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.9)',
    muted: 'rgba(255, 255, 255, 0.7)',
    dark: '#1C1C1E',
    darkSecondary: '#3C3C43',
    darkMuted: '#8E8E93',
  },

  // Feature card colors
  feature: {
    heart: { bg: 'rgba(255, 107, 138, 0.12)', icon: '#FF6B8A' },
    users: { bg: 'rgba(32, 201, 151, 0.12)', icon: '#20C997' },
    phone: { bg: 'rgba(255, 148, 102, 0.12)', icon: '#FF9466' },
  },

  // Spacing (8pt grid)
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Border radius
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    pill: 100,
  },

  // Typography - SF Pro inspired
  type: {
    largeTitle: { fontSize: 42, fontWeight: '800' as const, letterSpacing: 1.5 },
    title1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: 0.5 },
    title2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: 0.3 },
    headline: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.2 },
    body: { fontSize: 18, fontWeight: '500' as const, letterSpacing: 0.1 },
    callout: { fontSize: 16, fontWeight: '500' as const, letterSpacing: 0 },
    subhead: { fontSize: 15, fontWeight: '400' as const, letterSpacing: 0 },
    footnote: { fontSize: 14, fontWeight: '400' as const, letterSpacing: 0 },
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface WelcomeScreenProps {
  navigation: WelcomeScreenNavigationProp;
}

interface FeatureItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  colors: { bg: string; icon: string };
  title: string;
  subtitle: string;
}

// ============================================================================
// FEATURE DATA
// ============================================================================

const FEATURES: FeatureItem[] = [
  {
    id: 'heart',
    icon: 'heart',
    colors: iOS.feature.heart,
    title: 'Genuine Connection',
    subtitle: 'Find meaningful companionship',
  },
  {
    id: 'users',
    icon: 'users',
    colors: iOS.feature.users,
    title: 'Lasting Bonds',
    subtitle: 'Build real friendships that matter',
  },
  {
    id: 'phone',
    icon: 'smartphone',
    colors: iOS.feature.phone,
    title: 'Simple to Use',
    subtitle: 'Designed for comfort and ease',
  },
];

// ============================================================================
// ANIMATED ORB COMPONENT - Floating background elements
// ============================================================================

interface AnimatedOrbProps {
  size: number;
  initialX: number;
  initialY: number;
  duration: number;
  delay: number;
  reduceMotion: boolean;
}

const AnimatedOrb: React.FC<AnimatedOrbProps> = ({
  size,
  initialX,
  initialY,
  duration,
  delay,
  reduceMotion,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 1000,
      delay,
      useNativeDriver: true,
    }).start();

    if (reduceMotion) return;

    // Float animation
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -20,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const timer = setTimeout(() => float.start(), delay);
    return () => {
      clearTimeout(timer);
      float.stop();
    };
  }, [reduceMotion, delay, duration, translateY, opacity]);

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: `${initialX}%`,
          top: `${initialY}%`,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

// ============================================================================
// FEATURE CARD COMPONENT
// ============================================================================

interface FeatureCardProps {
  feature: FeatureItem;
  animValue: Animated.Value;
  compact?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, animValue, compact }) => {
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const iconSize = compact ? 22 : 28;
  const containerSize = compact ? 48 : 56;

  return (
    <Animated.View
      style={[
        compact ? styles.featureCardCompact : styles.featureCard,
        {
          opacity: animValue,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.featureIconContainer,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize * 0.28,
            backgroundColor: feature.colors.bg,
          },
        ]}
      >
        <Feather name={feature.icon} size={iconSize} color={feature.colors.icon} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text
          style={[styles.featureTitle, compact && styles.featureTitleCompact]}
          maxFontSizeMultiplier={FONT_SCALING.BODY}
        >
          {feature.title}
        </Text>
        <Text
          style={[styles.featureSubtitle, compact && styles.featureSubtitleCompact]}
          maxFontSizeMultiplier={FONT_SCALING.CAPTION}
        >
          {feature.subtitle}
        </Text>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// PREMIUM BUTTON COMPONENT
// ============================================================================

interface PremiumButtonProps {
  onPress: () => void;
  title: string;
  variant: 'primary' | 'secondary';
  animValue?: Animated.Value;
  style?: object;
}

const PremiumButton: React.FC<PremiumButtonProps> = ({
  onPress,
  title,
  variant,
  animValue,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const isPrimary = variant === 'primary';

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const translateY = animValue?.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <Animated.View
      style={[
        {
          opacity: animValue,
          transform: [
            { scale },
            ...(translateY ? [{ translateY }] : []),
          ],
        },
        style,
      ]}
    >
      {isPrimary ? (
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.primaryButton}
        >
          <LinearGradient
            colors={['#FF7849', '#FF5C35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonGradient}
          >
            <Text
              style={styles.primaryButtonText}
              maxFontSizeMultiplier={FONT_SCALING.BUTTON}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Feather name="arrow-right" size={22} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      ) : (
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.secondaryButton}
        >
          <Text
            style={styles.secondaryButtonText}
            maxFontSizeMultiplier={FONT_SCALING.BUTTON}
            numberOfLines={1}
          >
            {title}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet, wp, hp } = useResponsive();

  // State
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const isNavigating = useRef(false);

  // Animation values
  const logoAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Check reduce motion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove();
  }, []);

  // Reset on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      isNavigating.current = false;
      setShowContent(false);
      logoAnim.setValue(0);
      titleAnim.setValue(0);
      subtitleAnim.setValue(0);
      featureAnims.forEach(a => a.setValue(0));
      buttonsAnim.setValue(0);
      pulseAnim.setValue(1);

      // Start animations
      startAnimations();
    });
    return unsubscribe;
  }, [navigation]);

  // Start animation sequence
  const startAnimations = useCallback(() => {
    if (reduceMotion) {
      logoAnim.setValue(1);
      titleAnim.setValue(1);
      subtitleAnim.setValue(1);
      featureAnims.forEach(a => a.setValue(1));
      buttonsAnim.setValue(1);
      setShowContent(true);
      return;
    }

    // Logo entrance
    Animated.spring(logoAnim, {
      toValue: 1,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
      delay: 200,
    }).start();

    // Title
    Animated.timing(titleAnim, {
      toValue: 1,
      duration: 600,
      delay: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Subtitle
    Animated.timing(subtitleAnim, {
      toValue: 1,
      duration: 600,
      delay: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Features staggered
    featureAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 900 + i * 120,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }).start();
    });

    // Buttons after 2.5s
    setTimeout(() => {
      setShowContent(true);
      Animated.spring(buttonsAnim, {
        toValue: 1,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }).start();
    }, 2500);
  }, [reduceMotion, logoAnim, titleAnim, subtitleAnim, featureAnims, buttonsAnim]);

  // Initial animation
  useEffect(() => {
    startAnimations();
  }, []);

  // Logo pulse
  useEffect(() => {
    if (reduceMotion) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
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
    const timer = setTimeout(() => pulse.start(), 1500);
    return () => {
      clearTimeout(timer);
      pulse.stop();
    };
  }, [reduceMotion, pulseAnim]);

  // Navigation handlers
  const handleGetStarted = useCallback(async () => {
    if (isNavigating.current || !showContent || isConnecting) return;
    isNavigating.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Show connecting state while fetching verification config
    setIsConnecting(true);

    try {
      const config = await getVerificationConfig();
      const minimumAge = config.data?.minimumAge ?? 60;

      console.log('[Welcome] Loaded verification config - Minimum age:', minimumAge);

      // Navigate with config
      navigation.navigate('IDScanner', { minimumAge });
    } catch (error: any) {
      console.error('[Welcome] Failed to load verification config:', error);

      // Show error but still allow navigation with default
      Alert.alert(
        'Connection Issue',
        'Could not connect to server. Using default settings.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('IDScanner', { minimumAge: 60 }),
          },
          {
            text: 'Retry',
            onPress: () => {
              isNavigating.current = false;
              setIsConnecting(false);
              handleGetStarted();
            },
          },
        ]
      );
      return;
    } finally {
      setIsConnecting(false);
    }
  }, [navigation, showContent, isConnecting]);

  const handleSignIn = useCallback(() => {
    if (isNavigating.current || !showContent) return;
    isNavigating.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Login');
  }, [navigation, showContent]);

  // Animation interpolations
  const logoScale = Animated.multiply(
    logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
    pulseAnim
  );

  const titleTranslate = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  const subtitleTranslate = subtitleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  // Responsive sizes
  const logoSize = isLandscape
    ? Math.min(hp(30), wp(15), 140)
    : isTablet
    ? 180
    : Math.min(wp(38), 160);

  const logoContainerSize = logoSize + 32;

  // ============================================================================
  // PORTRAIT LAYOUT
  // ============================================================================

  const renderPortrait = () => (
    <ScrollView
      contentContainerStyle={[
        styles.portraitContent,
        {
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: isTablet ? 48 : 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={[styles.portraitInner, isTablet && { maxWidth: 520, alignSelf: 'center' }]}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.logoGlow,
              {
                width: logoContainerSize + 80,
                height: logoContainerSize + 80,
                borderRadius: (logoContainerSize + 80) / 2,
                opacity: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
              },
            ]}
          />

          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                width: logoContainerSize,
                height: logoContainerSize,
                borderRadius: logoContainerSize / 2,
                opacity: logoAnim,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={TanderLogo}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Title */}
          <Animated.Text
            style={[
              styles.title,
              {
                fontSize: isTablet ? 56 : 46,
                opacity: titleAnim,
                transform: [{ translateY: titleTranslate }],
              },
            ]}
            maxFontSizeMultiplier={FONT_SCALING.TITLE}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            TANDER
          </Animated.Text>

          {/* Tagline */}
          <Animated.Text
            style={[
              styles.tagline,
              {
                fontSize: isTablet ? 22 : 19,
                opacity: subtitleAnim,
                transform: [{ translateY: subtitleTranslate }],
              },
            ]}
            maxFontSizeMultiplier={FONT_SCALING.BODY}
          >
            Where Meaningful Connections Begin
          </Animated.Text>

          {/* Sub-tagline */}
          <Animated.Text
            style={[
              styles.subTagline,
              {
                fontSize: isTablet ? 17 : 15,
                opacity: subtitleAnim,
                transform: [{ translateY: subtitleTranslate }],
              },
            ]}
            maxFontSizeMultiplier={FONT_SCALING.CAPTION}
          >
            Made for Filipino seniors 60+
          </Animated.Text>
        </View>

        {/* Features Section */}
        <View style={[styles.featuresSection, { marginVertical: isTablet ? 48 : 36 }]}>
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
                            animValue={featureAnims[index]}
            />
          ))}
        </View>

        {/* Buttons Section */}
        <View style={styles.buttonsSection} pointerEvents={showContent ? 'auto' : 'none'}>
          <PremiumButton
            onPress={handleGetStarted}
            title="Get Started"
            variant="primary"
            animValue={buttonsAnim}
          />

          <PremiumButton
            onPress={handleSignIn}
            title="I Already Have an Account"
            variant="secondary"
            animValue={buttonsAnim}
            style={{ marginTop: 16 }}
          />

          {/* Trust badge */}
          <Animated.View style={[styles.trustBadge, { opacity: buttonsAnim }]}>
            <View style={styles.trustBadgeIcon}>
              <Feather name="shield" size={18} color="#20C997" />
            </View>
            <Text
              style={styles.trustBadgeText}
              maxFontSizeMultiplier={FONT_SCALING.CAPTION}
            >
              Your privacy and safety are our top priority
            </Text>
          </Animated.View>
        </View>
      </View>
    </ScrollView>
  );

  // ============================================================================
  // LANDSCAPE LAYOUT
  // ============================================================================

  const renderLandscape = () => {
    const leftPadding = Math.max(insets.left, 24) + 24;
    const rightPadding = Math.max(insets.right, 24) + 24;
    const topPadding = Math.max(insets.top, 16) + 16;
    const bottomPadding = Math.max(insets.bottom, 16) + 16;

    return (
      <View
        style={[
          styles.landscapeContainer,
          {
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
            paddingLeft: leftPadding,
            paddingRight: rightPadding,
          },
        ]}
      >
        {/* Left Side - Branding */}
        <View style={styles.landscapeLeft}>
          {/* Logo glow */}
          <Animated.View
            style={[
              styles.logoGlow,
              {
                width: logoContainerSize + 60,
                height: logoContainerSize + 60,
                borderRadius: (logoContainerSize + 60) / 2,
                opacity: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.4],
                }),
              },
            ]}
          />

          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                width: logoContainerSize,
                height: logoContainerSize,
                borderRadius: logoContainerSize / 2,
                opacity: logoAnim,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={TanderLogo}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Title */}
          <Animated.Text
            style={[
              styles.title,
              {
                fontSize: Math.min(hp(12), 42),
                marginTop: 16,
                opacity: titleAnim,
                transform: [{ translateY: titleTranslate }],
              },
            ]}
            maxFontSizeMultiplier={FONT_SCALING.TITLE}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            TANDER
          </Animated.Text>

          {/* Tagline */}
          <Animated.Text
            style={[
              styles.tagline,
              {
                fontSize: Math.min(hp(4.5), 18),
                marginTop: 8,
                opacity: subtitleAnim,
                transform: [{ translateY: subtitleTranslate }],
              },
            ]}
            maxFontSizeMultiplier={FONT_SCALING.BODY}
          >
            Where Meaningful{'\n'}Connections Begin
          </Animated.Text>

          {/* Features - Compact */}
          <View style={styles.landscapeFeatures}>
            {FEATURES.map((feature, index) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                                animValue={featureAnims[index]}
                compact
              />
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.landscapeDivider}>
          <View style={styles.landscapeDividerLine} />
          <View style={styles.landscapeDividerDot} />
          <View style={styles.landscapeDividerLine} />
        </View>

        {/* Right Side - Actions */}
        <Animated.View
          style={[
            styles.landscapeRight,
            { opacity: buttonsAnim },
          ]}
          pointerEvents={showContent ? 'auto' : 'none'}
        >
          <Text
            style={styles.landscapeHeading}
            maxFontSizeMultiplier={FONT_SCALING.TITLE}
          >
            Ready to find{'\n'}your connection?
          </Text>

          <PremiumButton
            onPress={handleGetStarted}
            title="Get Started"
            variant="primary"
            animValue={buttonsAnim}
            style={{ width: '100%', marginBottom: 14 }}
          />

          <PremiumButton
            onPress={handleSignIn}
            title="Sign In"
            variant="secondary"
            animValue={buttonsAnim}
            style={{ width: '100%' }}
          />

          <View style={[styles.trustBadge, { marginTop: 24 }]}>
            <View style={styles.trustBadgeIcon}>
              <Feather name="shield" size={16} color="#20C997" />
            </View>
            <Text
              style={[styles.trustBadgeText, { fontSize: 13 }]}
              maxFontSizeMultiplier={FONT_SCALING.CAPTION}
            >
              Privacy & safety first
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Premium Gradient */}
      <LinearGradient
        colors={iOS.gradient.colors as unknown as string[]}
        locations={iOS.gradient.locations as unknown as number[]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating orbs */}
      <AnimatedOrb
        size={isTablet ? 300 : 220}
        initialX={-15}
        initialY={-8}
        duration={6000}
        delay={0}
        reduceMotion={reduceMotion}
      />
      <AnimatedOrb
        size={isTablet ? 200 : 150}
        initialX={75}
        initialY={35}
        duration={7000}
        delay={500}
        reduceMotion={reduceMotion}
      />
      <AnimatedOrb
        size={isTablet ? 160 : 120}
        initialX={-10}
        initialY={70}
        duration={5500}
        delay={1000}
        reduceMotion={reduceMotion}
      />

      {/* Content */}
      {isLandscape ? renderLandscape() : renderPortrait()}

      {/* Connecting Overlay */}
      {isConnecting && (
        <View style={styles.connectingOverlay}>
          <View style={styles.connectingCard}>
            <ActivityIndicator size="large" color="#FF7849" />
            <Text style={styles.connectingText}>Connecting...</Text>
            <Text style={styles.connectingSubtext}>Setting up your experience</Text>
          </View>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Floating orbs
  orb: {
    position: 'absolute',
    backgroundColor: iOS.glass.overlay,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // ============================================================================
  // PORTRAIT STYLES
  // ============================================================================

  portraitContent: {
    flexGrow: 1,
  },
  portraitInner: {
    flex: 1,
    width: '100%',
  },

  // Logo section
  logoSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 200, 150, 0.35)',
  },
  logoContainer: {
    backgroundColor: iOS.glass.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 25,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  title: {
    fontWeight: '800',
    color: iOS.text.primary,
    letterSpacing: 3,
    marginTop: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    color: iOS.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subTagline: {
    color: iOS.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },

  // Features section
  featuresSection: {
    gap: 14,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iOS.glass.white,
    borderRadius: iOS.radius.lg,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: iOS.glass.whiteBorder,
  },
  featureCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iOS.glass.white,
    borderRadius: iOS.radius.md,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: iOS.glass.whiteBorder,
  },
  featureIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: iOS.text.dark,
    marginBottom: 3,
  },
  featureTitleCompact: {
    fontSize: 15,
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: iOS.text.darkMuted,
    lineHeight: 20,
  },
  featureSubtitleCompact: {
    fontSize: 13,
    lineHeight: 17,
  },

  // Buttons section
  buttonsSection: {
    marginTop: 'auto',
  },
  primaryButton: {
    minHeight: 64,
    borderRadius: iOS.radius.pill,
    overflow: 'hidden',
    shadowColor: '#FF5C35',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  primaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    minHeight: 60,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: iOS.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: iOS.text.primary,
    letterSpacing: 0.3,
  },

  // Trust badge
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 10,
  },
  trustBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: iOS.text.secondary,
  },

  // ============================================================================
  // LANDSCAPE STYLES
  // ============================================================================

  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  landscapeLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '50%',
  },
  landscapeRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 380,
    paddingHorizontal: 24,
  },
  landscapeDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '55%',
    marginHorizontal: 28,
  },
  landscapeDividerLine: {
    flex: 1,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  landscapeDividerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginVertical: 10,
  },
  landscapeFeatures: {
    width: '100%',
    maxWidth: 320,
    marginTop: 20,
    gap: 10,
  },
  landscapeHeading: {
    fontSize: 26,
    fontWeight: '700',
    color: iOS.text.primary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 34,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Connecting overlay
  connectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  connectingCard: {
    backgroundColor: iOS.glass.white,
    borderRadius: iOS.radius.xl,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 30,
  },
  connectingText: {
    fontSize: 20,
    fontWeight: '700',
    color: iOS.text.dark,
    marginTop: 20,
  },
  connectingSubtext: {
    fontSize: 15,
    fontWeight: '500',
    color: iOS.text.darkMuted,
    marginTop: 8,
  },
});

export default WelcomeScreen;
