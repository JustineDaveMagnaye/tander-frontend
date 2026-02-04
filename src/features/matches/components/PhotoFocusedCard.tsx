/**
 * TANDER PhotoFocusedCard - Premium Photo-First Match Card
 *
 * Design Philosophy:
 * - Photos are the HERO - minimal overlay, maximum visibility
 * - User info displayed BELOW the photo, not blocking it
 * - Premium glassmorphism effects for badges
 * - Subtle shadows and refined aesthetics
 * - Senior-friendly touch targets (64px minimum)
 * - WCAG AA contrast compliance
 *
 * Inspired by: Hinge's premium card design, Instagram profiles
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import type { Match, ExpirationTime } from '../types';
import { FONT_SCALING } from '@shared/styles/fontScaling';

interface PhotoFocusedCardProps {
  match: Match;
  onPress: (match: Match) => void;
  cardWidth: number;
  cardHeight: number;
  isOnline?: boolean;
  expirationTime?: ExpirationTime | null;
  index?: number;
  reduceMotion?: boolean;
}

// Placeholder icon for when image fails to load
const UserPlaceholderIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const headSize = size * 0.35;
  const bodyWidth = size * 0.5;
  const bodyHeight = size * 0.3;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: headSize,
        height: headSize,
        borderRadius: headSize / 2,
        backgroundColor: color,
        marginBottom: size * 0.02,
      }} />
      <View style={{
        width: bodyWidth,
        height: bodyHeight,
        borderTopLeftRadius: bodyWidth / 2,
        borderTopRightRadius: bodyWidth / 2,
        backgroundColor: color,
      }} />
    </View>
  );
};

// Get expiration urgency level
const getExpirationUrgency = (expTime: ExpirationTime | null | undefined) => {
  if (!expTime || expTime.isExpired) return 'expired';
  if (expTime.isCritical) return 'critical';
  if (expTime.isExpiringSoon) return 'warning';
  return 'normal';
};

export const PhotoFocusedCard: React.FC<PhotoFocusedCardProps> = memo(({
  match,
  onPress,
  cardWidth,
  cardHeight,
  isOnline = false,
  expirationTime,
  index = 0,
  reduceMotion = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Photo takes ~75% of card, info section takes 25%
  const photoHeight = cardHeight * 0.72;
  const infoHeight = cardHeight * 0.28;
  const photoUrl = match.image || match.photoUrl;
  const showExpiration = !match.hasFirstMessage && expirationTime && !expirationTime.isExpired;
  const urgency = getExpirationUrgency(expirationTime);

  // Reset image error when match changes
  useEffect(() => {
    setImageError(false);
  }, [match.id, photoUrl]);

  // Entrance animation
  useEffect(() => {
    if (!reduceMotion) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [fadeAnim, index, reduceMotion]);

  const handlePressIn = () => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        friction: 8,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    }
  };

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }
    onPress(match);
  };

  // Format time since match
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return 'Recently';

    const diff = now.getTime() - parsedDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
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
        accessibilityLabel={`${match.name}, ${match.age} years old${isOnline ? ', online now' : ''}${showExpiration ? `, expires in ${expirationTime?.displayText}` : ''}`}
        accessibilityHint="Double tap to view profile and start chatting"
      >
        {/* PHOTO SECTION - Clean, unobstructed */}
        <View style={[styles.photoSection, { height: photoHeight }]}>
          {imageError || !photoUrl ? (
            <View style={styles.placeholderContainer}>
              <LinearGradient
                colors={[colors.gray[100], colors.gray[200]]}
                style={StyleSheet.absoluteFill}
              />
              <UserPlaceholderIcon size={cardWidth * 0.3} color={colors.gray[400]} />
            </View>
          ) : (
            <Image
              source={{ uri: photoUrl }}
              style={styles.photo}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          )}

          {/* Subtle top gradient for status badges - only 15% opacity */}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'transparent']}
            style={styles.topGradient}
          />

          {/* Status badges - minimal, floating design */}
          <View style={styles.badgeContainer}>
            {/* Online indicator - subtle pill */}
            {isOnline && (
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            )}

            <View style={{ flex: 1 }} />

            {/* Expiration badge - only if needed */}
            {showExpiration && (
              <View style={[
                styles.expirationBadge,
                urgency === 'critical' && styles.expirationCritical,
                urgency === 'warning' && styles.expirationWarning,
              ]}>
                <Text style={styles.expirationText}>
                  {expirationTime?.displayText}
                </Text>
              </View>
            )}

            {/* New match indicator */}
            {match.isNew && !showExpiration && (
              <LinearGradient
                colors={[colors.romantic.pink, colors.orange[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newBadge}
              >
                <Text style={styles.newBadgeText}>NEW</Text>
              </LinearGradient>
            )}
          </View>

          {/* Verified badge - bottom left corner */}
          {match.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✓</Text>
            </View>
          )}
        </View>

        {/* INFO SECTION - Below the photo, clean white card */}
        <View style={[styles.infoSection, { height: infoHeight }]}>
          {/* Name and age row */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {match.name}, {match.age}
            </Text>
            {match.hasNewMessage && (
              <View style={styles.messageDot} />
            )}
          </View>

          {/* Location row */}
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>📍</Text>
            <Text style={styles.location} numberOfLines={1}>
              {match.location || match.distance || 'Nearby'}
            </Text>
          </View>

          {/* Matched time - subtle footer */}
          <Text style={styles.matchedTime}>
            Matched {getTimeAgo(match.matchedAt)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

PhotoFocusedCard.displayName = 'PhotoFocusedCard';

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pressable: {
    flex: 1,
  },

  // Photo Section
  photoSection: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },

  // Badges
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.semantic.success,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
  },
  expirationBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  expirationWarning: {
    backgroundColor: colors.orange[500],
  },
  expirationCritical: {
    backgroundColor: colors.romantic.heartRed,
  },
  expirationText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[700],
  },
  newBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  newBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.teal[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[700],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  verifiedIcon: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },

  // Info Section
  infoSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray[900],
    flex: 1,
  },
  messageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.orange[500],
    marginLeft: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  location: {
    fontSize: 14,
    color: colors.gray[500],
    flex: 1,
  },
  matchedTime: {
    fontSize: 12,
    color: colors.gray[400],
    marginTop: 2,
  },
});

export default PhotoFocusedCard;
