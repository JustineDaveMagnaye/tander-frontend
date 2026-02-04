/**
 * PremiumChatHeader Component
 * Ultra-premium iOS-style chat header with glassmorphism, animations, and elegant design
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useResponsive } from '@/shared/hooks/useResponsive';
import { colors } from '@/shared/styles/colors';
import {
  premiumColors,
  premiumTypography,
  premiumSpacing,
  premiumRadius,
  premiumShadows,
  premiumAnimations,
  getRelativeTime,
} from '../styles/premiumStyles';
import type { ChatUser } from '../types';
import { FONT_SCALING } from '@/shared/styles/fontScaling';

// ============================================================================
// TYPES
// ============================================================================

interface PremiumChatHeaderProps {
  user: ChatUser;
  isTyping?: boolean;
  isConnected?: boolean;
  onBackPress: () => void;
  onProfilePress?: () => void;
  onVoiceCallPress?: () => void;
  onVideoCallPress?: () => void;
  onMenuPress?: () => void;
  showCallButtons?: boolean;
  scrollProgress?: Animated.SharedValue<number>;
}

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Back Button
const BackButton = memo(({
  onPress,
}: {
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, premiumAnimations.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, premiumAnimations.spring.gentle);
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.backButton, animatedStyle]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Text style={styles.backIcon}>‹</Text>
      <Text style={styles.backText}>Back</Text>
    </AnimatedPressable>
  );
});

// Action Button (for calls)
const ActionButton = memo(({
  icon,
  label,
  onPress,
  variant = 'default',
}: {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'secondary';
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, premiumAnimations.spring.snappy);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, premiumAnimations.spring.gentle);
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.actionButton,
        variant === 'primary' && styles.actionButtonPrimary,
        animatedStyle,
      ]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text style={[styles.actionIcon, variant === 'primary' && styles.actionIconPrimary]} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>
        {icon}
      </Text>
    </AnimatedPressable>
  );
});

// User Avatar with Online Status
const UserAvatar = memo(({
  user,
  onPress,
}: {
  user: ChatUser;
  onPress?: () => void;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, premiumAnimations.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, premiumAnimations.spring.gentle);
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.avatarContainer, animatedStyle]}
      disabled={!onPress}
    >
      {user.profilePhoto ? (
        <Image
          source={{ uri: user.profilePhoto }}
          style={styles.avatar}
        />
      ) : (
        <LinearGradient
          colors={colors.gradient.romantic}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>
            {user.firstName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </LinearGradient>
      )}
      {user.isOnline && (
        <View style={styles.onlineIndicator} />
      )}
    </AnimatedPressable>
  );
});

// User Status Text
const UserStatus = memo(({
  user,
  isTyping,
  isConnected,
}: {
  user: ChatUser;
  isTyping?: boolean;
  isConnected?: boolean;
}) => {
  const statusText = useMemo(() => {
    if (!isConnected) return 'Connecting...';
    if (isTyping) return 'typing...';
    if (user.isOnline) return 'Online';
    if (user.lastSeen) return `Last seen ${getRelativeTime(user.lastSeen)}`;
    return 'Offline';
  }, [isTyping, isConnected, user.isOnline, user.lastSeen]);

  const statusColor = useMemo(() => {
    if (!isConnected) return premiumColors.brand.orange;
    if (isTyping) return premiumColors.brand.teal;
    if (user.isOnline) return premiumColors.status.online;
    return premiumColors.system.gray;
  }, [isTyping, isConnected, user.isOnline]);

  return (
    <Animated.View entering={FadeIn}>
      <Text style={[styles.statusText, { color: statusColor }]}>
        {statusText}
      </Text>
    </Animated.View>
  );
});

// Typing Indicator Dots (inline version)
const TypingDots = memo(() => {
  return (
    <View style={styles.typingDotsContainer}>
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          entering={FadeIn.delay(index * 100)}
          style={styles.typingDot}
        />
      ))}
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PremiumChatHeader = memo(({
  user,
  isTyping = false,
  isConnected = true,
  onBackPress,
  onProfilePress,
  onVoiceCallPress,
  onVideoCallPress,
  onMenuPress,
  showCallButtons = true,
  scrollProgress,
}: PremiumChatHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { moderateScale, isLandscape, isTablet, wp } = useResponsive();

  // Calculate header height
  const headerHeight = useMemo(() => {
    const baseHeight = isLandscape ? 52 : 56;
    return baseHeight + insets.top;
  }, [isLandscape, insets.top]);

  // Animated header style based on scroll
  const headerAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollProgress) return {};

    const backgroundOpacity = interpolate(
      scrollProgress.value,
      [0, 50],
      [0.7, 0.95],
      Extrapolation.CLAMP
    );

    return {
      backgroundColor: `rgba(255, 255, 255, ${backgroundOpacity})`,
    };
  });

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(15)}
      style={[
        styles.container,
        { paddingTop: insets.top, minHeight: headerHeight },
        headerAnimatedStyle,
      ]}
    >
      {/* Blur background */}
      {Platform.OS === 'ios' ? (
        <AnimatedBlurView
          intensity={80}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBackground]} />
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Left section: Back button */}
        <View style={styles.leftSection}>
          <BackButton onPress={onBackPress} />
        </View>

        {/* Center section: Avatar + User info */}
        <Pressable
          style={styles.centerSection}
          onPress={onProfilePress}
          disabled={!onProfilePress}
        >
          <UserAvatar user={user} onPress={onProfilePress} />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.userName, { fontSize: moderateScale(16, 0.3) }]}
                numberOfLines={1}
              >
                {user.firstName} {user.lastName}
              </Text>
              {user.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✓</Text>
                </View>
              )}
            </View>
            <UserStatus user={user} isTyping={isTyping} isConnected={isConnected} />
          </View>
        </Pressable>

        {/* Right section: Action buttons */}
        <View style={styles.rightSection}>
          {showCallButtons && (
            <>
              {onVoiceCallPress && (
                <ActionButton
                  icon="📞"
                  label="Voice call"
                  onPress={onVoiceCallPress}
                />
              )}
              {onVideoCallPress && (
                <ActionButton
                  icon="📹"
                  label="Video call"
                  onPress={onVideoCallPress}
                />
              )}
            </>
          )}
          {onMenuPress && (
            <ActionButton
              icon="•••"
              label="More options"
              onPress={onMenuPress}
            />
          )}
        </View>
      </View>

      {/* Bottom border */}
      <View style={styles.bottomBorder} />
    </Animated.View>
  );
});

PremiumChatHeader.displayName = 'PremiumChatHeader';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: premiumColors.glass.light,
    zIndex: 100,
  },
  androidBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },

  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: premiumSpacing.sm,
  },

  // Left section
  leftSection: {
    minWidth: 70,
    alignItems: 'flex-start',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: premiumSpacing.sm,
    paddingRight: premiumSpacing.sm,
  },
  backIcon: {
    fontSize: 32,
    color: premiumColors.brand.teal,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -2,
  },
  backText: {
    fontSize: premiumTypography.sizes.body,
    color: premiumColors.brand.teal,
    marginLeft: -4,
  },

  // Center section
  centerSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: premiumSpacing.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: premiumSpacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: premiumColors.system.gray5,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: premiumColors.status.online,
    borderWidth: 2,
    borderColor: colors.white,
  },
  userInfo: {
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: premiumTypography.sizes.headline,
    fontWeight: '600',
    color: colors.gray[900],
    maxWidth: 150,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: premiumColors.brand.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: premiumSpacing.xxs,
  },
  verifiedIcon: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '700',
  },
  statusText: {
    fontSize: premiumTypography.sizes.footnote,
    fontWeight: '400',
    marginTop: 1,
  },

  // Typing dots
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: premiumColors.brand.teal,
    marginHorizontal: 1,
  },

  // Right section
  rightSection: {
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: premiumSpacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  actionButtonPrimary: {
    backgroundColor: premiumColors.brand.teal,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionIconPrimary: {
    color: colors.white,
  },

  // Bottom border
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: premiumColors.system.separator,
  },
});

export default PremiumChatHeader;
