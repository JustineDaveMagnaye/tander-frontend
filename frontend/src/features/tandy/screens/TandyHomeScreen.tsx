/**
 * TANDER TandyHomeScreen - Tandy Landing Page
 *
 * Shows tab bar. User taps "Chat with Tandy" to go full-screen chat.
 * Pattern matches MessagesScreen -> ChatScreen flow.
 *
 * UI/UX Enhancements:
 * - Card shadows for visual depth
 * - Avatar gradient ring with subtle glow effect
 * - Press feedback animations on all interactive elements
 * - Enhanced feature list with better iconography
 * - Improved sponsor cards with press states
 * - Floating action button style for primary CTA
 * - Comprehensive accessibility labels and hints
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  Linking,
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { TanderLogoIcon } from '@shared/components/icons/TanderLogoIcon';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TandyStackParamList } from '@navigation/types';
import { useResponsive } from '@shared/hooks/useResponsive';

// =============================================================================
// ANIMATED PRESSABLE BUTTON COMPONENT
// =============================================================================

interface AnimatedPressableProps {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  onPress,
  style,
  children,
  accessibilityLabel,
  accessibilityHint,
  disabled,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    // TODO: Add haptic feedback - Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 100,
    }).start();
  };

  // Extract flex property to apply to Pressable for proper sizing
  const flatStyle = StyleSheet.flatten(style) || {};
  const pressableStyle = {
    flex: flatStyle.flex,
    flexGrow: flatStyle.flexGrow,
    flexShrink: flatStyle.flexShrink,
    alignSelf: flatStyle.alignSelf,
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
      style={pressableStyle}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// =============================================================================
// AVATAR WITH GLOW COMPONENT
// =============================================================================

interface AvatarWithGlowProps {
  size: number;
  isPhoneLandscape: boolean;
  isTablet: boolean;
}

const AvatarWithGlow: React.FC<AvatarWithGlowProps> = ({ size, isPhoneLandscape, isTablet }) => {
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Subtle pulsing glow animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.7,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim]);

  const iconSize = isPhoneLandscape ? 32 : (isTablet ? 56 : 48);

  return (
    <View style={[styles.avatarGlowContainer, { width: size + 20, height: size + 20 }]}>
      {/* Outer glow layer */}
      <Animated.View
        style={[
          styles.avatarGlow,
          {
            width: size + 16,
            height: size + 16,
            borderRadius: (size + 16) / 2,
            opacity: glowAnim,
          },
        ]}
      />
      {/* Main gradient ring */}
      <LinearGradient
        colors={[colors.orange[500], colors.teal[500]]}
        style={[
          styles.avatarGradient,
          { width: size, height: size, borderRadius: size / 2 }
        ]}
      >
        <View style={[styles.avatarInner, { borderRadius: (size - 8) / 2 }]}>
          <TanderLogoIcon size={iconSize} focused />
        </View>
      </LinearGradient>
    </View>
  );
};

// =============================================================================
// SPONSORS DATA
// =============================================================================

interface Sponsor {
  id: string;
  name: string;
  tagline: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  url?: string;
}

const SPONSORS: Sponsor[] = [
  {
    id: 'wellness-ph',
    name: 'Wellness PH',
    tagline: 'Your health partner',
    icon: 'heart',
    color: colors.teal[500],
    url: 'https://wellness.ph',
  },
  {
    id: 'mindcare',
    name: 'MindCare',
    tagline: 'Mental wellness support',
    icon: 'sun',
    color: colors.orange[500],
    url: 'https://mindcare.com',
  },
  {
    id: 'senior-health',
    name: 'Senior Health Plus',
    tagline: 'Care for golden years',
    icon: 'shield',
    color: '#8B5CF6',
    url: 'https://seniorhealthplus.com',
  },
];

// =============================================================================
// FEATURE ITEM COMPONENT
// =============================================================================

interface FeatureItemProps {
  text: string;
  index: number;
  isSmallDevice: boolean;
  isTablet: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ text, index, isSmallDevice, isTablet }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * 100;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        styles.featureItem,
        isTablet && styles.featureItemTablet,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
      accessibilityLabel={text}
    >
      <View style={styles.featureIconContainer}>
        <Feather name="check-circle" size={20} color={colors.teal[500]} />
      </View>
      <Text style={[styles.featureText, isSmallDevice && styles.featureTextSmall]}>{text}</Text>
    </Animated.View>
  );
};

// =============================================================================
// SPONSOR CARD COMPONENT
// =============================================================================

interface SponsorCardProps {
  sponsor: Sponsor;
  onPress: () => void;
  isTablet: boolean;
  isHorizontal?: boolean;
  index: number;
}

const SponsorCard: React.FC<SponsorCardProps> = ({ sponsor, onPress, isTablet, isHorizontal, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  // Determine width style for the wrapper
  const wrapperStyle = isHorizontal
    ? { width: 260 }
    : isTablet
    ? { width: '48%' as const }
    : { width: '100%' as const };

  return (
    <Animated.View
      style={[
        wrapperStyle,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`${sponsor.name} - ${sponsor.tagline}`}
        accessibilityHint="Opens sponsor website"
        accessibilityRole="button"
      >
        <View style={styles.sponsorCard}>
          <View style={[styles.sponsorIcon, { backgroundColor: `${sponsor.color}15` }]}>
            <Feather name={sponsor.icon} size={24} color={sponsor.color} />
          </View>
          <View style={styles.sponsorInfo}>
            <Text style={styles.sponsorName}>{sponsor.name}</Text>
            <Text style={styles.sponsorTagline}>{sponsor.tagline}</Text>
          </View>
          <View style={styles.sponsorArrowContainer}>
            <Feather name="external-link" size={16} color={colors.gray[400]} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

type TandyHomeNavigationProp = NativeStackNavigationProp<TandyStackParamList, 'TandyHome'>;

export const TandyHomeScreen: React.FC = () => {
  const navigation = useNavigation<TandyHomeNavigationProp>();
  const insets = useSafeAreaInsets();
  const { width, isLandscape, isTablet, getScreenMargin } = useResponsive();

  const isSmallDevice = width <= 375;
  const isPhoneLandscape = isLandscape && !isTablet;

  // Responsive padding
  const horizontalPadding = useMemo(() => {
    if (isPhoneLandscape) return Math.max(insets.left + 16, 24);
    return getScreenMargin();
  }, [isPhoneLandscape, insets.left, getScreenMargin]);

  // Avatar size responsive to device and orientation
  const avatarSize = useMemo(() => {
    if (isPhoneLandscape) return 70;
    if (isTablet) return 120;
    return 100;
  }, [isPhoneLandscape, isTablet]);

  // Show 2-column layout for quick actions on tablets
  const showTwoColumnSponsors = isTablet;

  const handleStartChat = () => {
    navigation.navigate('TandyChat');
  };

  const handleStartBreathing = () => {
    navigation.navigate('TandyBreathing');
  };

  const handleStartMeditation = () => {
    navigation.navigate('TandyMeditation');
  };

  const handleContactPsychiatrist = () => {
    // Navigate to the psychiatrist list screen
    navigation.navigate('PsychiatristList');
  };

  const handleSponsorPress = (sponsor: Sponsor) => {
    if (sponsor.url) {
      Linking.openURL(sponsor.url).catch(() => {
        // Handle error silently
      });
    }
  };

  // Feature list items
  const FEATURES = [
    'Friendly conversation & emotional support',
    'Guided breathing exercises',
    'Timed meditation sessions',
    'Relaxation & stress relief tips',
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: horizontalPadding,
            paddingLeft: Math.max(horizontalPadding, insets.left + 16),
            paddingRight: Math.max(horizontalPadding, insets.right + 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main content wrapper for landscape layout */}
        <View style={[isPhoneLandscape && styles.landscapeContentRow]}>
          {/* Left column in landscape: Avatar + Header */}
          <View style={[isPhoneLandscape && styles.landscapeLeftColumn]}>
            {/* Header */}
            <View style={[styles.header, isPhoneLandscape && styles.headerLandscape]}>
              <Text
                style={[styles.headerTitle, isPhoneLandscape && styles.headerTitleLandscape]}
                accessibilityRole="header"
              >
                Tandy
              </Text>
              <Text style={[styles.headerSubtitle, isPhoneLandscape && styles.headerSubtitleLandscape]}>
                Your Wellness Companion
              </Text>
            </View>

            {/* Tandy Avatar with Glow */}
            <View style={[styles.avatarSection, isPhoneLandscape && styles.avatarSectionLandscape]}>
              <AvatarWithGlow
                size={avatarSize}
                isPhoneLandscape={isPhoneLandscape}
                isTablet={isTablet}
              />
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>

          {/* Right column in landscape: Welcome + Actions */}
          <View style={[isPhoneLandscape && styles.landscapeRightColumn]}>

            {/* Welcome Message */}
            <View style={[styles.welcomeCard, isPhoneLandscape && styles.welcomeCardLandscape]}>
              <Text style={[styles.welcomeTitle, isPhoneLandscape && styles.welcomeTitleLandscape]}>
                Hi there!
              </Text>
              <Text style={[styles.welcomeText, isPhoneLandscape && styles.welcomeTextLandscape]}>
                I'm Tandy, your personal wellness companion. I'm here to chat, listen, and help you relax whenever you need support.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={[styles.actionsContainer, isPhoneLandscape && styles.actionsContainerLandscape]}>
              {/* Chat Button - Primary CTA with floating style */}
              <AnimatedPressable
                onPress={handleStartChat}
                style={styles.primaryButtonContainer}
                accessibilityLabel="Chat with Tandy"
                accessibilityHint="Opens a conversation with Tandy"
              >
                <LinearGradient
                  colors={[colors.orange[500], colors.teal[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.primaryButtonGradient, isPhoneLandscape && styles.primaryButtonGradientLandscape]}
                >
                  <Feather name="message-circle" size={isPhoneLandscape ? 20 : 24} color={colors.white} />
                  <Text style={[styles.primaryButtonText, isPhoneLandscape && styles.primaryButtonTextLandscape]}>
                    Chat with Tandy
                  </Text>
                </LinearGradient>
              </AnimatedPressable>

              {/* Quick Actions */}
              <View style={[styles.quickActions, isPhoneLandscape && styles.quickActionsLandscape]}>
                <AnimatedPressable
                  onPress={handleStartBreathing}
                  style={[styles.quickActionBtn, isPhoneLandscape && styles.quickActionBtnLandscape]}
                  accessibilityLabel="Breathing exercise"
                  accessibilityHint="Opens guided breathing exercise"
                >
                  <LinearGradient
                    colors={[colors.teal[100], colors.teal[50]]}
                    style={[styles.quickActionGradient, isPhoneLandscape && styles.quickActionGradientLandscape]}
                  >
                    <Feather name="wind" size={isPhoneLandscape ? 20 : 28} color={colors.teal[600]} />
                    <Text style={[styles.quickActionText, { color: colors.teal[700] }, isPhoneLandscape && styles.quickActionTextLandscape]}>
                      Breathing
                    </Text>
                  </LinearGradient>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={handleStartMeditation}
                  style={[styles.quickActionBtn, isPhoneLandscape && styles.quickActionBtnLandscape]}
                  accessibilityLabel="Meditation"
                  accessibilityHint="Opens guided meditation session"
                >
                  <LinearGradient
                    colors={[colors.orange[100], colors.orange[50]]}
                    style={[styles.quickActionGradient, isPhoneLandscape && styles.quickActionGradientLandscape]}
                  >
                    <Feather name="heart" size={isPhoneLandscape ? 20 : 28} color={colors.orange[600]} />
                    <Text style={[styles.quickActionText, { color: colors.orange[700] }, isPhoneLandscape && styles.quickActionTextLandscape]}>
                      Meditation
                    </Text>
                  </LinearGradient>
                </AnimatedPressable>
              </View>

              {/* Contact Psychiatrist Button */}
              <AnimatedPressable
                onPress={handleContactPsychiatrist}
                style={styles.psychiatristButtonContainer}
                accessibilityLabel="Contact our psychiatrist"
                accessibilityHint="Opens phone dialer to call our mental health professional"
              >
                <View style={[styles.psychiatristButton, isPhoneLandscape && styles.psychiatristButtonLandscape]}>
                  <View style={styles.psychiatristIconContainer}>
                    <Feather name="phone" size={isPhoneLandscape ? 18 : 22} color="#7C3AED" />
                  </View>
                  <View style={styles.psychiatristTextContainer}>
                    <Text style={[styles.psychiatristTitle, isPhoneLandscape && styles.psychiatristTitleLandscape]}>
                      Contact Our Psychiatrist
                    </Text>
                    <Text style={[styles.psychiatristSubtitle, isPhoneLandscape && styles.psychiatristSubtitleLandscape]}>
                      Professional mental health support available
                    </Text>
                  </View>
                  <View style={styles.psychiatristArrow}>
                    <Feather name="chevron-right" size={20} color="#7C3AED" />
                  </View>
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </View>

        {/* Features List */}
        <View style={[
          styles.featuresContainer,
          isTablet && styles.featuresContainerTablet
        ]}>
          <Text
            style={[styles.featuresTitle, isSmallDevice && styles.featuresTitleSmall]}
            accessibilityRole="header"
          >
            What I can help with:
          </Text>
          <View style={[styles.featuresGrid, isTablet && styles.featuresGridTablet]}>
            {FEATURES.map((feature, index) => (
              <FeatureItem
                key={index}
                text={feature}
                index={index}
                isSmallDevice={isSmallDevice}
                isTablet={isTablet}
              />
            ))}
          </View>
        </View>

        {/* Sponsors Card */}
        <View style={[styles.sponsorsContainer, isTablet && styles.sponsorsContainerTablet]}>
          <View style={styles.sponsorsHeader}>
            <Feather name="award" size={18} color={colors.gray[500]} />
            <Text style={styles.sponsorsTitle}>Powered by Our Partners</Text>
          </View>

          {/* Horizontal scrollable on tablet landscape, vertical list otherwise */}
          {showTwoColumnSponsors && isLandscape ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sponsorsHorizontalList}
              accessibilityLabel="Sponsor partners"
            >
              {SPONSORS.map((sponsor, index) => (
                <SponsorCard
                  key={sponsor.id}
                  sponsor={sponsor}
                  onPress={() => handleSponsorPress(sponsor)}
                  isTablet={isTablet}
                  isHorizontal
                  index={index}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.sponsorsList, showTwoColumnSponsors && styles.sponsorsListTablet]}>
              {SPONSORS.map((sponsor, index) => (
                <SponsorCard
                  key={sponsor.id}
                  sponsor={sponsor}
                  onPress={() => handleSponsorPress(sponsor)}
                  isTablet={showTwoColumnSponsors}
                  index={index}
                />
              ))}
            </View>
          )}

          <Text style={styles.sponsorsDisclaimer}>
            These partners help make Tandy possible
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Landscape layout styles
  landscapeContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    marginBottom: 16,
  },
  landscapeLeftColumn: {
    alignItems: 'center',
    width: 140,
  },
  landscapeRightColumn: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLandscape: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: 0.5,
  },
  headerTitleLandscape: {
    fontSize: 22,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 4,
  },
  headerSubtitleLandscape: {
    fontSize: 13,
    marginTop: 2,
  },

  // Avatar with Glow
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarSectionLandscape: {
    marginBottom: 12,
  },
  avatarGlowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    backgroundColor: colors.orange[300],
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        // Android doesn't support shadow well, using a subtle background instead
      },
    }),
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avatarInner: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.teal[50],
    borderRadius: 16,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal[500],
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.teal[700],
  },

  // Welcome
  welcomeCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  welcomeCardLandscape: {
    padding: 16,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 8,
  },
  welcomeTitleLandscape: {
    fontSize: 18,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.gray[600],
  },
  welcomeTextLandscape: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Actions
  actionsContainer: {
    marginBottom: 24,
  },
  actionsContainerLandscape: {
    marginBottom: 16,
  },
  primaryButtonContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[600],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    minHeight: 56, // Senior-friendly touch target
  },
  primaryButtonGradientLandscape: {
    paddingVertical: 12,
    minHeight: 48,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.3,
  },
  primaryButtonTextLandscape: {
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionsLandscape: {
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray[200],
    minHeight: 70, // Senior-friendly touch target
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  quickActionBtnLandscape: {
    minHeight: 52,
  },
  quickActionGradient: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickActionGradientLandscape: {
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionTextLandscape: {
    fontSize: 13,
  },

  // Psychiatrist Button
  psychiatristButtonContainer: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  psychiatristButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    minHeight: 76,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  psychiatristButtonLandscape: {
    padding: 12,
    minHeight: 60,
    gap: 10,
  },
  psychiatristIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  psychiatristTextContainer: {
    flex: 1,
  },
  psychiatristTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5B21B6',
    marginBottom: 2,
  },
  psychiatristTitleLandscape: {
    fontSize: 14,
  },
  psychiatristSubtitle: {
    fontSize: 13,
    color: '#7C3AED',
    lineHeight: 18,
  },
  psychiatristSubtitleLandscape: {
    fontSize: 12,
    lineHeight: 16,
  },
  psychiatristArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Features
  featuresContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  featuresContainerTablet: {
    padding: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  featuresTitleSmall: {
    fontSize: 15,
  },
  featuresGrid: {
    // Default: single column
  },
  featuresGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    minHeight: 44, // Touch target for seniors
  },
  featureItemTablet: {
    width: '50%',
    paddingRight: 12,
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.teal[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    color: colors.gray[600],
    flex: 1,
    lineHeight: 22, // Better readability for seniors
  },
  featureTextSmall: {
    fontSize: 14,
  },

  // Sponsors
  sponsorsContainer: {
    marginTop: 24,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sponsorsContainerTablet: {
    padding: 24,
  },
  sponsorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sponsorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sponsorsList: {
    gap: 12,
  },
  sponsorsListTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sponsorsHorizontalList: {
    paddingVertical: 4,
    gap: 12,
  },
  sponsorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 14,
    padding: 14,
    gap: 12,
    minHeight: 76, // Senior-friendly touch target
    width: '100%', // Fill the wrapper
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  sponsorCardTablet: {
    width: '48%',
  },
  sponsorCardHorizontal: {
    width: 260,
    marginRight: 12,
  },
  sponsorIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsorInfo: {
    flex: 1,
  },
  sponsorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  sponsorTagline: {
    fontSize: 13,
    color: colors.gray[500],
    lineHeight: 18,
  },
  sponsorArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsorsDisclaimer: {
    fontSize: 12,
    color: colors.gray[400],
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default TandyHomeScreen;
