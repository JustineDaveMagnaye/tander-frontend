/**
 * TANDER PremiumMatchCardV2 - Photo-First Match Card
 *
 * DESIGN PHILOSOPHY:
 * - Photos are the HERO - absolutely NO overlays on the photo
 * - All info displayed BELOW the photo in a clean white section
 * - Badges use a horizontal strip design that never clips
 * - Senior-friendly: large fonts, high contrast, clear hierarchy
 *
 * LAYOUT STRUCTURE:
 * ┌─────────────────────────┐
 * │                         │
 * │     CLEAN PHOTO         │  ← No overlays, only online dot
 * │     (4:5 ratio)         │
 * │                     ●   │  ← Online indicator (subtle)
 * └─────────────────────────┘
 * ┌─────────────────────────┐
 * │ Name, Age    [badges]   │  ← Row 1: Identity + status badges
 * │ 📍 Location             │  ← Row 2: Location
 * │ Matched 2h ago          │  ← Row 3: Time
 * └─────────────────────────┘
 *
 * CLIPPING PREVENTION:
 * - Fixed info section height (80px)
 * - All text uses numberOfLines={1} + ellipsizeMode
 * - Badge strip uses flexShrink to prevent overflow
 * - No percentage-based heights that could cause issues
 */

import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import type { Match } from '../types';
import { FONT_SCALING } from '@shared/styles/fontScaling';

// ============================================================================
// CONSTANTS - Fixed values to prevent clipping
// ============================================================================

/** Fixed height for the info section - ensures consistent layout */
const INFO_SECTION_HEIGHT = 80;

/** Card border radius for premium rounded corners */
const BORDER_RADIUS = 16;

/** Photo aspect ratio (4:5 portrait orientation) */
const PHOTO_ASPECT_RATIO = 5 / 4; // height = width * 1.25

/** Minimum card dimensions */
const MIN_CARD_WIDTH = 140;
const MIN_PHOTO_HEIGHT = 175;

// ============================================================================
// TYPES
// ============================================================================

interface PremiumMatchCardV2Props {
  match: Match;
  onPress: (match: Match) => void;
  cardWidth: number;
  cardHeight?: number; // Optional - will be calculated if not provided
  isOnline?: boolean;
  index?: number;
  reduceMotion?: boolean;
}

// ============================================================================
// HELPER: User Placeholder Icon
// ============================================================================

const UserPlaceholder: React.FC<{ size: number }> = ({ size }) => {
  const headSize = size * 0.4;
  const bodyWidth = size * 0.6;
  const bodyHeight = size * 0.3;

  return (
    <View style={placeholderStyles.container}>
      <View
        style={[
          placeholderStyles.head,
          {
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
          },
        ]}
      />
      <View
        style={[
          placeholderStyles.body,
          {
            width: bodyWidth,
            height: bodyHeight,
            borderTopLeftRadius: bodyWidth / 2,
            borderTopRightRadius: bodyWidth / 2,
          },
        ]}
      />
    </View>
  );
};

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  head: {
    backgroundColor: colors.gray[300],
    marginBottom: 4,
  },
  body: {
    backgroundColor: colors.gray[300],
  },
});

// ============================================================================
// HELPER: Format time ago
// ============================================================================

const formatTimeAgo = (date: Date | string | undefined): string => {
  if (!date) return 'Recently';

  const now = new Date();
  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) return 'Recently';

  const diffMs = now.getTime() - parsedDate.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PremiumMatchCardV2: React.FC<PremiumMatchCardV2Props> = memo(
  ({
    match,
    onPress,
    cardWidth,
    cardHeight: providedCardHeight,
    isOnline = false,
    index = 0,
    reduceMotion = false,
  }) => {
    // ========== STATE ==========
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // ========== ANIMATIONS ==========
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

    // ========== COMPUTED DIMENSIONS ==========
    const dimensions = useMemo(() => {
      const safeWidth = Math.max(cardWidth, MIN_CARD_WIDTH);
      const photoHeight = Math.max(safeWidth * PHOTO_ASPECT_RATIO, MIN_PHOTO_HEIGHT);
      const totalHeight = providedCardHeight || photoHeight + INFO_SECTION_HEIGHT;

      return {
        cardWidth: safeWidth,
        cardHeight: totalHeight,
        photoHeight: totalHeight - INFO_SECTION_HEIGHT,
      };
    }, [cardWidth, providedCardHeight]);

    // ========== PHOTO URL ==========
    const photoUrl = match.image || match.photoUrl;

    // ========== EFFECTS ==========

    // Reset state when match changes
    useEffect(() => {
      setImageError(false);
      setImageLoaded(false);
    }, [match.id, photoUrl]);

    // Entrance animation
    useEffect(() => {
      if (reduceMotion) {
        fadeAnim.setValue(1);
        return;
      }

      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index * 50, 200),
        useNativeDriver: true,
      }).start();
    }, [fadeAnim, index, reduceMotion]);

    // ========== HANDLERS ==========

    const handlePressIn = () => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        friction: 8,
      }).start();
    };

    const handlePressOut = () => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    };

    const handlePress = async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics not available
      }
      onPress(match);
    };

    // ========== RENDER ==========

    return (
      <Animated.View
        style={[
          styles.container,
          {
            width: dimensions.cardWidth,
            height: dimensions.cardHeight,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${match.name}, ${match.age} years old${isOnline ? ', online now' : ''}${match.isVerified ? ', verified' : ''}`}
          accessibilityHint="Double tap to view profile"
        >
          {/* ============================================================ */}
          {/* PHOTO SECTION - Completely clean, no overlays               */}
          {/* ============================================================ */}
          <View style={[styles.photoSection, { height: dimensions.photoHeight }]}>
            {imageError || !photoUrl ? (
              // Placeholder when no image
              <LinearGradient
                colors={[colors.orange[50], colors.teal[50]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.placeholderGradient}
              >
                <UserPlaceholder size={dimensions.cardWidth * 0.4} />
              </LinearGradient>
            ) : (
              // Actual photo
              <Image
                source={{ uri: photoUrl }}
                style={styles.photo}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            )}

            {/* Loading shimmer overlay */}
            {!imageLoaded && photoUrl && !imageError && (
              <View style={styles.loadingOverlay}>
                <LinearGradient
                  colors={[colors.gray[100], colors.gray[200], colors.gray[100]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            )}

            {/* Online indicator - ONLY element on photo, positioned subtly */}
            {isOnline && (
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
              </View>
            )}
          </View>

          {/* ============================================================ */}
          {/* INFO SECTION - Fixed height, below photo                    */}
          {/* ============================================================ */}
          <View style={styles.infoSection}>
            {/* Row 1: Name, Age + Badge Strip */}
            <View style={styles.row1}>
              {/* Name and Age - takes available space */}
              <View style={styles.nameContainer}>
                <Text
                  style={styles.nameText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {match.name}, {match.age}
                </Text>
              </View>

              {/* Badge Strip - flexes but doesn't overflow */}
              <View style={styles.badgeStrip}>
                {/* NEW Badge */}
                {match.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}

                {/* Verified Badge */}
                {match.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✓</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Row 2: Location */}
            <View style={styles.row2}>
              <Text style={styles.locationIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>📍</Text>
              <Text
                style={styles.locationText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {match.location || match.distance || 'Nearby'}
              </Text>
            </View>

            {/* Row 3: Match Time */}
            <View style={styles.row3}>
              <Text
                style={styles.timeText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Matched {formatTimeAgo(match.matchedAt)}
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

PremiumMatchCardV2.displayName = 'PremiumMatchCardV2';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
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
    // Only round top corners - bottom meets info section
    borderTopLeftRadius: BORDER_RADIUS,
    borderTopRightRadius: BORDER_RADIUS,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholderGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // Online indicator - subtle, bottom-right of photo
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981', // Green
    borderWidth: 2,
    borderColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // ========== INFO SECTION ==========
  infoSection: {
    height: INFO_SECTION_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    justifyContent: 'space-between',
    // Subtle top border for visual separation
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },

  // Row 1: Name + Badges
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0, // Critical for text truncation to work
    marginRight: 8,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
    lineHeight: 20,
  },

  // Badge strip - prevents overflow
  badgeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0, // Badges keep their size
  },
  newBadge: {
    backgroundColor: colors.orange[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
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

  // Row 2: Location
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 18,
  },
  locationIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: colors.gray[500],
    lineHeight: 16,
  },

  // Row 3: Time
  row3: {
    minHeight: 16,
  },
  timeText: {
    fontSize: 11,
    color: colors.gray[400],
    lineHeight: 14,
  },
});

export default PremiumMatchCardV2;
