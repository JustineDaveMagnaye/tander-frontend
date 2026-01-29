/**
 * TANDER UltraPremiumMatchCard - Photo Supremacy Design
 *
 * THE ULTIMATE PHOTO-FIRST MATCH CARD
 *
 * DESIGN PHILOSOPHY: "Photo Supremacy"
 * - Photos are 100% UNOBSTRUCTED - NO overlays, gradients, badges on photos
 * - All information displayed BELOW the photo in a clean info section
 * - Maximum photo real estate (85% of card height)
 * - Premium micro-interactions with haptic feedback
 * - Senior-friendly: Large fonts (16px+), high contrast, big touch targets
 *
 * VISUAL STRUCTURE:
 * ┌─────────────────────────────────────────┐
 * │                                         │
 * │                                         │
 * │         PRISTINE PHOTO AREA             │
 * │         (No overlays at all)            │
 * │         Height: 85% of card             │
 * │                                         │
 * │                                    ●    │  ← Only element: subtle online dot
 * └─────────────────────────────────────────┘
 * ┌─────────────────────────────────────────┐
 * │  ┌────┐  Maria, 58  [NEW] [✓]          │
 * │  │mini│  📍 Makati City                 │
 * │  │foto│  ❤️ Matched 2h ago          →   │
 * │  └────┘                                 │
 * └─────────────────────────────────────────┘
 *          Info Section (95px fixed)
 *
 * ACCESSIBILITY:
 * - Touch targets: Full card is tappable (56px+ minimum)
 * - Contrast: WCAG AA compliant (4.5:1+)
 * - Reduce motion: All animations respect system preference
 * - Screen reader: Comprehensive accessibility labels
 */

import React, { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Platform,
  ViewStyle,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import type { Match } from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Layout
  INFO_SECTION_HEIGHT: 115, // Increased from 95 to prevent clipping
  MINI_AVATAR_SIZE: 38, // Reduced from 44 to give more space for name
  BORDER_RADIUS: 20,
  PHOTO_ASPECT_RATIO: 1.25, // 4:5 portrait (height = width * 1.25)

  // Minimum dimensions
  MIN_CARD_WIDTH: 150,
  MIN_PHOTO_HEIGHT: 160, // Reduced to accommodate larger info section

  // Animation timings
  ENTRANCE_DURATION: 300,
  ENTRANCE_STAGGER: 60,
  MAX_ENTRANCE_DELAY: 300,
  PRESS_SCALE: 0.97,
  IMAGE_FADE_DURATION: 300,

  // Online indicator
  ONLINE_DOT_SIZE: 14,
  ONLINE_PULSE_DURATION: 1200,

  // Typography (Senior-optimized)
  FONT: {
    NAME: 16, // Slightly reduced to fit better on small cards
    LOCATION: 14,
    TIME: 13,
    BADGE: 10,
  },

  // Spacing
  SPACING: {
    INFO_PADDING: 10,
    ROW_GAP: 4,
    BADGE_GAP: 5,
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface UltraPremiumMatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
  cardWidth: number;
  cardHeight?: number;
  isOnline?: boolean;
  index?: number;
  reduceMotion?: boolean;
  style?: ViewStyle;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * User silhouette placeholder for failed/loading images
 */
const UserPlaceholder: React.FC<{ size: number }> = ({ size }) => {
  const iconSize = Math.min(size * 0.4, 48);
  return (
    <View style={placeholderStyles.container}>
      <Feather name="user" size={iconSize} color={colors.gray[400]} />
    </View>
  );
};

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * Subtle online status dot with optional pulse animation
 */
const OnlineIndicator: React.FC<{
  reduceMotion: boolean;
}> = memo(({ reduceMotion }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reduceMotion) {
      pulseAnim.setValue(1);
      glowOpacity.setValue(0.4);
      return;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: CONFIG.ONLINE_PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: CONFIG.ONLINE_PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.7,
          duration: CONFIG.ONLINE_PULSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.4,
          duration: CONFIG.ONLINE_PULSE_DURATION,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [reduceMotion, pulseAnim, glowOpacity]);

  return (
    <View style={styles.onlineContainer}>
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.onlineGlow,
          {
            opacity: glowOpacity,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      {/* Core dot */}
      <View style={styles.onlineDot} />
    </View>
  );
});

OnlineIndicator.displayName = 'OnlineIndicator';

/**
 * NEW badge with orange gradient
 */
const NewBadge: React.FC = memo(() => (
  <LinearGradient
    colors={colors.gradient.primaryButton}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.newBadge}
  >
    <Feather name="star" size={10} color={colors.white} />
    <Text style={styles.newBadgeText}>NEW</Text>
  </LinearGradient>
));

NewBadge.displayName = 'NewBadge';

/**
 * Verified badge with teal checkmark
 */
const VerifiedBadge: React.FC = memo(() => (
  <View style={styles.verifiedBadge}>
    <Feather name="check" size={11} color={colors.white} />
  </View>
));

VerifiedBadge.displayName = 'VerifiedBadge';

/**
 * Expiration indicator for new matches
 */
const ExpirationIndicator: React.FC<{
  expiresAt: Date | string;
  isCritical: boolean;
}> = memo(({ expiresAt, isCritical }) => {
  const timeText = useMemo(() => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 1) return `${minutes}m left`;
    if (hours < 24) return `${hours}h left`;
    return `${Math.floor(hours / 24)}d left`;
  }, [expiresAt]);

  return (
    <View style={[styles.expirationBadge, isCritical && styles.expirationCritical]}>
      <Feather
        name="clock"
        size={12}
        color={isCritical ? colors.orange[700] : colors.orange[600]}
      />
      <Text
        style={[
          styles.expirationText,
          isCritical && styles.expirationTextCritical,
        ]}
      >
        {timeText}
      </Text>
    </View>
  );
});

ExpirationIndicator.displayName = 'ExpirationIndicator';

/**
 * Shimmer loading placeholder
 */
const ShimmerPlaceholder: React.FC<{ width: number; height: number }> = memo(
  ({ width, height }) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => animation.stop();
    }, [shimmerAnim]);

    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-width, width],
    });

    return (
      <View style={[styles.shimmerContainer, { width, height }]}>
        <LinearGradient
          colors={[colors.gray[100], colors.gray[200], colors.gray[100]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.shimmerHighlight,
            { transform: [{ translateX }] },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: width * 0.5, height: '100%' }}
          />
        </Animated.View>
      </View>
    );
  }
);

ShimmerPlaceholder.displayName = 'ShimmerPlaceholder';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a date into human-readable "time ago" string
 */
const formatTimeAgo = (date: Date | string | undefined): string => {
  if (!date) return 'Recently';

  const now = new Date();
  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) return 'Recently';

  const diffMs = now.getTime() - parsed.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

/**
 * Calculate expiration status for a match
 */
const getExpirationStatus = (
  expiresAt: Date | string | undefined,
  hasFirstMessage: boolean | undefined
): { shouldShow: boolean; isCritical: boolean } => {
  if (hasFirstMessage || !expiresAt) return { shouldShow: false, isCritical: false };

  const now = new Date();
  const expires = new Date(expiresAt);

  if (isNaN(expires.getTime())) return { shouldShow: false, isCritical: false };

  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return { shouldShow: true, isCritical: true };

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const isCritical = hours < 2;

  // Only show if expiring within 24 hours
  return { shouldShow: hours < 24, isCritical };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const UltraPremiumMatchCard: React.FC<UltraPremiumMatchCardProps> = memo(
  ({
    match,
    onPress,
    cardWidth,
    cardHeight: providedHeight,
    isOnline = false,
    index = 0,
    reduceMotion = false,
    style,
  }) => {
    // ========== STATE ==========
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // ========== ANIMATION REFS ==========
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
    const imageOpacity = useRef(new Animated.Value(0)).current;

    // ========== COMPUTED DIMENSIONS ==========
    const dimensions = useMemo(() => {
      const width = Math.max(cardWidth, CONFIG.MIN_CARD_WIDTH);
      const photoHeight = Math.max(
        width * CONFIG.PHOTO_ASPECT_RATIO,
        CONFIG.MIN_PHOTO_HEIGHT
      );
      const totalHeight = providedHeight || photoHeight + CONFIG.INFO_SECTION_HEIGHT;
      const actualPhotoHeight = totalHeight - CONFIG.INFO_SECTION_HEIGHT;

      return {
        width,
        height: totalHeight,
        photoHeight: actualPhotoHeight,
      };
    }, [cardWidth, providedHeight]);

    // ========== PHOTO URL ==========
    const photoUrl = match.image || match.photoUrl;

    // ========== EXPIRATION STATUS ==========
    const expiration = useMemo(
      () => getExpirationStatus(match.expiresAt, match.hasFirstMessage),
      [match.expiresAt, match.hasFirstMessage]
    );

    // ========== EFFECTS ==========

    // Reset image state when match changes
    useEffect(() => {
      setImageError(false);
      setImageLoaded(false);
      imageOpacity.setValue(0);
    }, [match.id, photoUrl, imageOpacity]);

    // Card entrance animation
    useEffect(() => {
      if (reduceMotion) {
        fadeAnim.setValue(1);
        return;
      }

      fadeAnim.setValue(0);
      const delay = Math.min(index * CONFIG.ENTRANCE_STAGGER, CONFIG.MAX_ENTRANCE_DELAY);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: CONFIG.ENTRANCE_DURATION,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, [fadeAnim, index, reduceMotion]);

    // Image load fade-in
    useEffect(() => {
      if (imageLoaded && !reduceMotion) {
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: CONFIG.IMAGE_FADE_DURATION,
          useNativeDriver: true,
        }).start();
      } else if (imageLoaded) {
        imageOpacity.setValue(1);
      }
    }, [imageLoaded, imageOpacity, reduceMotion]);

    // ========== HANDLERS ==========

    const handlePressIn = useCallback(() => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: CONFIG.PRESS_SCALE,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }).start();
    }, [scaleAnim, reduceMotion]);

    const handlePressOut = useCallback(() => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }).start();
    }, [scaleAnim, reduceMotion]);

    const handlePress = useCallback(async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics not available
      }
      onPress(match);
    }, [onPress, match]);

    const handleImageLoad = useCallback(() => {
      setImageLoaded(true);
    }, []);

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    // ========== ACCESSIBILITY LABEL ==========
    const accessibilityLabel = useMemo(() => {
      const parts = [
        match.age > 0 ? `${match.name}, ${match.age} years old` : match.name,
        match.location && `from ${match.location}`,
        isOnline && 'currently online',
        match.isNew && 'new match',
        match.isVerified && 'verified profile',
        expiration.shouldShow && (expiration.isCritical ? 'expiring soon' : 'expires in 24 hours'),
      ].filter(Boolean);
      return parts.join(', ');
    }, [match, isOnline, expiration]);

    // ========== RENDER ==========

    return (
      <Animated.View
        style={[
          styles.container,
          {
            width: dimensions.width,
            height: dimensions.height,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
          style,
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
          accessible
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Double tap to view full profile and start chatting"
        >
          {/* ================================================================ */}
          {/* PHOTO SECTION - 100% CLEAN, NO OVERLAYS                         */}
          {/* ================================================================ */}
          <View style={[styles.photoSection, { height: dimensions.photoHeight }]}>
            {/* Photo or placeholder */}
            {imageError || !photoUrl ? (
              <LinearGradient
                colors={[colors.orange[50], colors.gray[100], colors.teal[50]]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.photoPlaceholder}
              >
                <UserPlaceholder size={dimensions.width * 0.5} />
              </LinearGradient>
            ) : (
              <>
                {/* Shimmer loading state */}
                {!imageLoaded && (
                  <ShimmerPlaceholder
                    width={dimensions.width}
                    height={dimensions.photoHeight}
                  />
                )}

                {/* Actual photo with fade-in */}
                <Animated.Image
                  source={{ uri: photoUrl }}
                  style={[
                    styles.photo,
                    {
                      opacity: imageOpacity,
                    },
                  ]}
                  resizeMode="cover"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </>
            )}

            {/* ONLY ELEMENT ON PHOTO: Subtle online indicator */}
            {isOnline && <OnlineIndicator reduceMotion={reduceMotion} />}
          </View>

          {/* ================================================================ */}
          {/* INFO SECTION - Clean footer with all badges/info                */}
          {/* ================================================================ */}
          <View style={styles.infoSection}>
            {/* Row 1: Mini avatar + Name/Age + Badges */}
            <View style={styles.primaryRow}>
              {/* Mini avatar */}
              <View style={styles.miniAvatarContainer}>
                {photoUrl && !imageError ? (
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.miniAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.miniAvatarPlaceholder}>
                    <Feather name="user" size={18} color={colors.gray[400]} />
                  </View>
                )}
              </View>

              {/* Name and Age (hide age if 0 or not provided) */}
              <View style={styles.nameContainer}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {match.name}{match.age > 0 ? `, ${match.age}` : ''}
                </Text>
              </View>

              {/* Badge strip */}
              <View style={styles.badgeStrip}>
                {match.isNew && <NewBadge />}
                {match.isVerified && <VerifiedBadge />}
              </View>
            </View>

            {/* Row 2: Location */}
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={colors.teal[500]} />
              <Text style={styles.locationText} numberOfLines={1}>
                {match.location || match.distance || 'Nearby'}
              </Text>
            </View>

            {/* Row 3: Match time OR Expiration + Action hint */}
            <View style={styles.metaRow}>
              {expiration.shouldShow ? (
                <ExpirationIndicator
                  expiresAt={match.expiresAt!}
                  isCritical={expiration.isCritical}
                />
              ) : (
                <View style={styles.matchTimeContainer}>
                  <Feather name="heart" size={12} color={colors.orange[400]} />
                  <Text style={styles.matchTimeText} numberOfLines={1}>
                    Matched {formatTimeAgo(match.matchedAt)}
                  </Text>
                </View>
              )}

              {/* Action hint chevron */}
              <Feather
                name="chevron-right"
                size={18}
                color={colors.gray[300]}
                style={styles.actionHint}
              />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

UltraPremiumMatchCard.displayName = 'UltraPremiumMatchCard';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ========== CONTAINER ==========
  container: {
    borderRadius: CONFIG.BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[100], // Subtle border for definition
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pressable: {
    flex: 1,
  },

  // ========== PHOTO SECTION ==========
  photoSection: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
    borderTopLeftRadius: CONFIG.BORDER_RADIUS,
    borderTopRightRadius: CONFIG.BORDER_RADIUS,
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Loading shimmer
  shimmerContainer: {
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
  },
  shimmerHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },

  // Online indicator - ONLY element on photo
  onlineContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: CONFIG.ONLINE_DOT_SIZE + 8,
    height: CONFIG.ONLINE_DOT_SIZE + 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineGlow: {
    position: 'absolute',
    width: CONFIG.ONLINE_DOT_SIZE + 6,
    height: CONFIG.ONLINE_DOT_SIZE + 6,
    borderRadius: (CONFIG.ONLINE_DOT_SIZE + 6) / 2,
    backgroundColor: colors.teal[400],
  },
  onlineDot: {
    width: CONFIG.ONLINE_DOT_SIZE,
    height: CONFIG.ONLINE_DOT_SIZE,
    borderRadius: CONFIG.ONLINE_DOT_SIZE / 2,
    backgroundColor: colors.teal[500],
    borderWidth: 2.5,
    borderColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  // ========== INFO SECTION ==========
  infoSection: {
    height: CONFIG.INFO_SECTION_HEIGHT,
    paddingHorizontal: CONFIG.SPACING.INFO_PADDING,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.white,
    justifyContent: 'flex-start',
    gap: 6,
  },

  // Row 1: Primary (Avatar + Name + Badges)
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniAvatarContainer: {
    width: CONFIG.MINI_AVATAR_SIZE,
    height: CONFIG.MINI_AVATAR_SIZE,
    borderRadius: CONFIG.MINI_AVATAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: colors.orange[400],
    backgroundColor: colors.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[500],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  miniAvatar: {
    width: '100%',
    height: '100%',
  },
  miniAvatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  nameText: {
    fontSize: CONFIG.FONT.NAME,
    fontWeight: '700',
    color: colors.gray[900],
    lineHeight: CONFIG.FONT.NAME * 1.3,
  },

  // Badge strip
  badgeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CONFIG.SPACING.BADGE_GAP,
    flexShrink: 0,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[600],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  newBadgeText: {
    fontSize: CONFIG.FONT.BADGE,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.teal[500],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Row 2: Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: CONFIG.MINI_AVATAR_SIZE + 8, // Align with name
  },
  locationText: {
    flex: 1,
    fontSize: CONFIG.FONT.LOCATION,
    fontWeight: '500',
    color: colors.gray[600],
    lineHeight: CONFIG.FONT.LOCATION * 1.3,
  },

  // Row 3: Meta (Time/Expiration + Action hint)
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: CONFIG.MINI_AVATAR_SIZE + 8, // Align with name
    minHeight: 24, // Ensure minimum height for expiration badge
  },
  matchTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  matchTimeText: {
    fontSize: CONFIG.FONT.TIME,
    fontWeight: '400',
    color: colors.gray[500],
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.orange[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  expirationCritical: {
    backgroundColor: '#FEE2E2', // red-100
  },
  expirationText: {
    fontSize: CONFIG.FONT.TIME,
    fontWeight: '600',
    color: colors.orange[600],
  },
  expirationTextCritical: {
    color: colors.orange[700],
  },
  actionHint: {
    marginLeft: 'auto',
  },
});

export default UltraPremiumMatchCard;
