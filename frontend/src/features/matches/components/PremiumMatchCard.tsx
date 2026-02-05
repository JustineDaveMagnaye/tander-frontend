/**
 * TANDER PremiumMatchCard - Photo-First Match Card
 *
 * FIXED VERSION - Proper layout with no clipping/overflow issues
 *
 * Key Fixes:
 * - Fixed info section height (not percentage based)
 * - Proper text truncation with ellipsis
 * - No overlapping elements
 * - Warm orange/teal color theme
 */

import React, { memo, useState, useEffect, useRef } from 'react';
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
// CONSTANTS
// ============================================================================

// Fixed height for info section
const INFO_SECTION_HEIGHT = 115;
const BORDER_RADIUS = 16;

// ============================================================================
// TYPES
// ============================================================================

interface PremiumMatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
  cardWidth: number;
  cardHeight: number;
  isOnline?: boolean;
  index?: number;
  reduceMotion?: boolean;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const UserPlaceholder: React.FC<{ size: number }> = ({ size }) => (
  <View style={placeholderStyles.container}>
    <View style={[placeholderStyles.head, { width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2 }]} />
    <View style={[placeholderStyles.body, { width: size * 0.6, height: size * 0.3, borderTopLeftRadius: size * 0.3, borderTopRightRadius: size * 0.3 }]} />
  </View>
);

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
// MAIN COMPONENT
// ============================================================================

export const PremiumMatchCard: React.FC<PremiumMatchCardProps> = memo(({
  match,
  onPress,
  cardWidth,
  cardHeight,
  isOnline = false,
  index = 0,
  reduceMotion = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Calculate photo height: total card height minus fixed info section
  const photoHeight = cardHeight - INFO_SECTION_HEIGHT;
  const photoUrl = match.image || match.photoUrl;

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

  // Press animations
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
    } catch {}
    onPress(match);
  };

  // Format time since match
  const getTimeAgo = (date: Date): string => {
    if (!date) return 'Recently';
    const now = new Date();
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return 'Recently';

    const diff = now.getTime() - parsedDate.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: cardWidth,
          height: cardHeight,
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
        accessibilityLabel={`${match.name}, ${match.age} years old${isOnline ? ', online now' : ''}`}
        accessibilityHint="Double tap to view profile"
      >
        {/* ============ PHOTO SECTION - CLEAN, NO OVERLAYS ============ */}
        <View style={[styles.photoSection, { height: photoHeight }]}>
          {imageError || !photoUrl ? (
            <LinearGradient
              colors={[colors.orange[50], colors.teal[50]]}
              style={styles.placeholderGradient}
            >
              <UserPlaceholder size={cardWidth * 0.5} />
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

          {/* Loading Shimmer */}
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
        </View>

        {/* ============ INFO SECTION - FIXED HEIGHT ============ */}
        <View style={styles.infoSection}>
          {/* Top Row: Name + Age */}
          <Text style={styles.nameText} numberOfLines={1} ellipsizeMode="tail">
            {match.name}, {match.age}
          </Text>

          {/* Middle Row: Location */}
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
              {match.location || match.distance || 'Nearby'}
            </Text>
          </View>

          {/* Bottom Row: Status Badges */}
          <View style={styles.statusRow}>
            {/* Online Status */}
            {isOnline && (
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            )}

            {/* NEW Badge */}
            {match.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}

            {/* Verified Badge */}
            {match.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedCheck} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✓</Text>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}

            {/* Spacer */}
            <View style={styles.statusSpacer} />

            {/* Matched Time */}
            <Text style={styles.matchedTime} numberOfLines={1}>
              {getTimeAgo(match.matchedAt)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

PremiumMatchCard.displayName = 'PremiumMatchCard';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[900],
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

  // Photo Section - Clean, no overlays
  photoSection: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
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

  // Info Section - Fixed Height
  infoSection: {
    height: INFO_SECTION_HEIGHT,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.romantic.warmWhite,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.orange[50],
    overflow: 'hidden',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.gray[500],
    flex: 1,
  },

  // Status Row - Bottom of info section
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusSpacer: {
    flex: 1,
  },

  // Online Badge
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teal[50],
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal[500],
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.teal[700],
  },

  // NEW Badge
  newBadge: {
    backgroundColor: colors.orange[500],
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.3,
  },

  // Verified Badge
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teal[500],
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  verifiedCheck: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  verifiedText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '600',
  },

  // Matched Time
  matchedTime: {
    fontSize: 10,
    color: colors.gray[400],
  },
});

export default PremiumMatchCard;
