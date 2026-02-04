/**
 * TANDER EliteMatchCard - Premium Photo-First Match Card
 *
 * The ultimate match card design for TANDER dating app.
 *
 * DESIGN PRINCIPLES:
 * 1. PHOTO SUPREMACY - Photos are 100% unobstructed, no overlays
 * 2. CLEAN SEPARATION - Info section clearly separated below photo
 * 3. NO CLIPPING - Fixed heights, proper text truncation, overflow prevention
 * 4. SENIOR-FRIENDLY - Large text (15px+), high contrast (7:1), big touch targets
 * 5. PREMIUM AESTHETICS - Subtle shadows, warm colors, refined spacing
 *
 * VISUAL STRUCTURE:
 * ┌─────────────────────────────────┐
 * │                                 │
 * │      PRISTINE PHOTO AREA        │  Photo height: cardWidth * 1.25
 * │      (No overlays whatsoever)   │
 * │                                 │
 * │                           [●]   │  ← Online dot only (when online)
 * └─────────────────────────────────┘
 * ╔═════════════════════════════════╗
 * ║  Maria, 58      [NEW] [✓]       ║  Row 1: Name + Status strip (24px)
 * ║  📍 Makati City                 ║  Row 2: Location (20px)
 * ║  ⏱ Matched 2h ago               ║  Row 3: Time (16px)
 * ╚═════════════════════════════════╝
 *
 * Total info section height: 80px (fixed)
 *
 * COLOR PALETTE:
 * - Orange #F97316 - Action, NEW badge
 * - Teal #14B8A6 - Trust, Verified badge
 * - Green #10B981 - Online status
 * - Gray scale - Text hierarchy
 */

import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Platform,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import type { Match } from '../types';
import { FONT_SCALING } from '@shared/styles/fontScaling';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const CONFIG = {
  /** Info section fixed height */
  INFO_HEIGHT: 90,

  /** Card border radius */
  BORDER_RADIUS: 14,

  /** Photo aspect ratio (height / width) */
  PHOTO_RATIO: 1.0,

  /** Minimum dimensions */
  MIN_WIDTH: 140,
  MIN_PHOTO_HEIGHT: 130,

  /** Animation timings */
  ENTRANCE_DURATION: 300,
  ENTRANCE_STAGGER: 50,
  MAX_ENTRANCE_DELAY: 200,
  PRESS_FRICTION: 8,
  PRESS_SCALE: 0.97,

  /** Typography sizes (senior-friendly) */
  FONT_NAME: 14,
  FONT_LOCATION: 12,
  FONT_TIME: 11,
  FONT_BADGE: 8,

  /** Online dot size */
  ONLINE_DOT_SIZE: 12,
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface EliteMatchCardProps {
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
 * User placeholder icon for when photo fails to load
 */
const UserPlaceholder: React.FC<{ size: number }> = ({ size }) => (
  <View style={placeholderStyles.container}>
    <View
      style={[
        placeholderStyles.head,
        {
          width: size * 0.38,
          height: size * 0.38,
          borderRadius: (size * 0.38) / 2,
        },
      ]}
    />
    <View
      style={[
        placeholderStyles.body,
        {
          width: size * 0.55,
          height: size * 0.28,
          borderTopLeftRadius: (size * 0.55) / 2,
          borderTopRightRadius: (size * 0.55) / 2,
        },
      ]}
    />
  </View>
);

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  head: {
    backgroundColor: colors.gray[300],
  },
  body: {
    backgroundColor: colors.gray[300],
  },
});

/**
 * Online status indicator dot
 */
const OnlineDot: React.FC = () => (
  <View style={styles.onlineContainer}>
    <View style={styles.onlineDot} />
  </View>
);

/**
 * NEW badge component
 */
const NewBadge: React.FC = () => (
  <LinearGradient
    colors={[colors.orange[500], colors.orange[600]]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.newBadge}
  >
    <Text style={styles.newBadgeText}>NEW</Text>
  </LinearGradient>
);

/**
 * Verified badge component
 */
const VerifiedBadge: React.FC = () => (
  <View style={styles.verifiedBadge}>
    <Text style={styles.verifiedIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✓</Text>
  </View>
);

/**
 * Expiring badge component
 */
const ExpiringBadge: React.FC<{ text: string; isCritical: boolean }> = ({ text, isCritical }) => (
  <View style={[styles.expiringBadge, isCritical && styles.expiringBadgeCritical]}>
    <Text style={styles.expiringBadgeText}>⏱ {text}</Text>
  </View>
);

/**
 * Shimmer loading overlay
 */
const ShimmerOverlay: React.FC = () => (
  <View style={StyleSheet.absoluteFill}>
    <LinearGradient
      colors={[colors.gray[100], colors.gray[200], colors.gray[100]]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={StyleSheet.absoluteFill}
    />
  </View>
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats a date into a human-readable "time ago" string
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
 * Calculates expiration status
 */
const getExpirationStatus = (
  expiresAt: Date | string | undefined,
  hasFirstMessage: boolean | undefined
): { text: string; isExpiring: boolean; isCritical: boolean } | null => {
  // No expiration if already messaged or no expiration date
  if (hasFirstMessage || !expiresAt) return null;

  const now = new Date();
  const expires = new Date(expiresAt);

  if (isNaN(expires.getTime())) return null;

  const diffMs = expires.getTime() - now.getTime();

  // Already expired
  if (diffMs <= 0) {
    return { text: 'Expired', isExpiring: true, isCritical: true };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  // Critical: less than 1 hour
  if (hours < 1) {
    return { text: `${minutes}m left`, isExpiring: true, isCritical: true };
  }

  // Expiring soon: less than 6 hours
  if (hours < 6) {
    return { text: `${hours}h left`, isExpiring: true, isCritical: false };
  }

  // Plenty of time: more than 6 hours
  if (hours < 24) {
    return { text: `${hours}h left`, isExpiring: false, isCritical: false };
  }

  const days = Math.floor(hours / 24);
  return { text: `${days}d left`, isExpiring: false, isCritical: false };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EliteMatchCard: React.FC<EliteMatchCardProps> = memo(
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

    // ========== REFS ==========
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

    // ========== COMPUTED DIMENSIONS ==========
    const dimensions = useMemo(() => {
      const width = Math.max(cardWidth, CONFIG.MIN_WIDTH);
      const photoHeight = Math.max(
        width * CONFIG.PHOTO_RATIO,
        CONFIG.MIN_PHOTO_HEIGHT
      );
      const totalHeight = providedHeight || photoHeight + CONFIG.INFO_HEIGHT;
      const actualPhotoHeight = totalHeight - CONFIG.INFO_HEIGHT;

      return {
        width,
        height: totalHeight,
        photoHeight: actualPhotoHeight,
      };
    }, [cardWidth, providedHeight]);

    // ========== PHOTO URL ==========
    const photoUrl = match.image || match.photoUrl;

    // ========== EFFECTS ==========

    // Reset image state when match changes
    useEffect(() => {
      setImageError(false);
      setImageLoaded(false);
    }, [match.id, photoUrl]);

    // Entrance fade animation
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
        useNativeDriver: true,
      }).start();
    }, [fadeAnim, index, reduceMotion]);

    // ========== PRESS HANDLERS ==========

    const handlePressIn = () => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: CONFIG.PRESS_SCALE,
        useNativeDriver: true,
        friction: CONFIG.PRESS_FRICTION,
      }).start();
    };

    const handlePressOut = () => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: CONFIG.PRESS_FRICTION,
      }).start();
    };

    const handlePress = async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics unavailable
      }
      onPress(match);
    };

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
          accessibilityLabel={[
            `${match.name}, ${match.age} years old`,
            match.location && `from ${match.location}`,
            isOnline && 'online now',
            match.isNew && 'new match',
            match.isVerified && 'verified profile',
          ]
            .filter(Boolean)
            .join(', ')}
          accessibilityHint="Double tap to view profile and start chatting"
        >
          {/* ================================================================ */}
          {/* PHOTO SECTION - Absolutely clean, no overlays                   */}
          {/* ================================================================ */}
          <View style={[styles.photoSection, { height: dimensions.photoHeight }]}>
            {imageError || !photoUrl ? (
              <LinearGradient
                colors={[colors.orange[50], colors.gray[100], colors.teal[50]]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.photoPlaceholder}
              >
                <UserPlaceholder size={dimensions.width * 0.45} />
              </LinearGradient>
            ) : (
              <Image
                source={{ uri: photoUrl }}
                style={styles.photo}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            )}

            {/* Loading shimmer */}
            {!imageLoaded && photoUrl && !imageError && <ShimmerOverlay />}

            {/* Online indicator - ONLY element on photo */}
            {isOnline && <OnlineDot />}
          </View>

          {/* ================================================================ */}
          {/* INFO SECTION - Simple stacked layout                            */}
          {/* ================================================================ */}
          <View style={styles.infoSection}>
            {/* Row 1: Name + Age + Badges */}
            <View style={styles.nameRow}>
              <Text style={styles.nameText} numberOfLines={1}>
                {match.name}, {match.age}
              </Text>
              {match.isNew && <NewBadge />}
              {match.isVerified && <VerifiedBadge />}
            </View>

            {/* Row 2: Location */}
            <Text style={styles.locationText} numberOfLines={1}>
              📍 {match.location || match.distance || 'Nearby'}
            </Text>

            {/* Row 3: Expiration or Match Time */}
            {(() => {
              const expiration = getExpirationStatus(match.expiresAt, match.hasFirstMessage);
              if (expiration) {
                return <ExpiringBadge text={expiration.text} isCritical={expiration.isCritical} />;
              }
              return (
                <Text style={styles.timeText} numberOfLines={1}>
                  Matched {formatTimeAgo(match.matchedAt)}
                </Text>
              );
            })()}
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

EliteMatchCard.displayName = 'EliteMatchCard';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ========== CONTAINER ==========
  container: {
    borderRadius: CONFIG.BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.white,
    // Premium shadow
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
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
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Online indicator
  onlineContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  onlineDot: {
    width: CONFIG.ONLINE_DOT_SIZE,
    height: CONFIG.ONLINE_DOT_SIZE,
    borderRadius: CONFIG.ONLINE_DOT_SIZE / 2,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  // ========== INFO SECTION ==========
  infoSection: {
    height: CONFIG.INFO_HEIGHT,
    padding: 10,
    backgroundColor: colors.white,
    gap: 6,
  },

  // Row 1: Name + badges
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    flex: 1,
    fontSize: CONFIG.FONT_NAME,
    fontWeight: '700',
    color: colors.gray[900],
  },

  // NEW badge
  newBadge: {
    backgroundColor: colors.orange[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: CONFIG.FONT_BADGE,
    fontWeight: '800',
    color: colors.white,
  },

  // Verified badge
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.teal[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
  },

  // Location text
  locationText: {
    fontSize: CONFIG.FONT_LOCATION,
    color: colors.gray[500],
  },

  // Time text
  timeText: {
    fontSize: CONFIG.FONT_TIME,
    color: colors.gray[400],
  },

  // Expiring badge
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  expiringBadgeCritical: {
    backgroundColor: '#FEE2E2', // red-100
  },
  expiringBadgeText: {
    fontSize: CONFIG.FONT_TIME,
    fontWeight: '600',
    color: colors.orange[700],
  },
});

export default EliteMatchCard;
