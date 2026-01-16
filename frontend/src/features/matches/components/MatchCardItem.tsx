/**
 * TANDER MatchCardItem - PREMIUM REDESIGN
 * Photo-forward premium match card with glassmorphism and expiration timer
 *
 * Design Inspiration: Bumble/Hinge premium profile cards
 *
 * Features:
 * - Large photo-forward design with elegant overlays
 * - Glassmorphism info panel at bottom
 * - Online status pulse animation
 * - 24-hour match expiration timer with visual ring
 * - Compatibility/shared interests preview
 * - Premium shadows and gradients
 * - Senior-friendly touch targets (56-64px)
 * - WCAG AA contrast compliance
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import type { Match } from '../types';
import type { MatchesFontSizes, MatchesSpacing } from '../hooks/useMatchesResponsive';
import { Shimmer } from './Shimmer';

interface MatchCardItemProps {
  match: Match;
  cardWidth: number;
  cardHeight: number;
  onPress: () => void;
  isOnline: boolean;
  fontSizes: MatchesFontSizes;
  spacing: MatchesSpacing;
  isCompactMode?: boolean;
  isVerySmallScreen?: boolean;
  reduceMotion?: boolean;
  index?: number;
}

/**
 * Online Status Badge with Pulse Animation
 */
const OnlineStatusBadge: React.FC<{
  isOnline: boolean;
  isCompact: boolean;
  reduceMotion: boolean;
}> = ({ isOnline, isCompact, reduceMotion }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!isOnline || reduceMotion) {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.5);
      return;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 1000,
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
  }, [isOnline, pulseAnim, glowAnim, reduceMotion]);

  if (!isOnline) return null;

  return (
    <View style={styles.onlineBadge}>
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.onlineGlow,
          {
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      {/* Core dot */}
      <View style={styles.onlineDot} />
      {!isCompact && (
        <Text style={styles.onlineText}>Online</Text>
      )}
    </View>
  );
};

/**
 * Expiration Timer Ring (24hr countdown for new matches)
 */
const ExpirationTimer: React.FC<{
  expiresAt: Date;
  hasFirstMessage: boolean;
  size: number;
  reduceMotion: boolean;
}> = ({ expiresAt, hasFirstMessage, size, reduceMotion }) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    percentage: number;
    isExpiringSoon: boolean;
    isCritical: boolean;
  } | null>(null);

  useEffect(() => {
    if (hasFirstMessage) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const remaining = expires - now;

      if (remaining <= 0) {
        return null;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const totalMs = 24 * 60 * 60 * 1000;
      const percentage = Math.min(100, Math.max(0, (remaining / totalMs) * 100));
      const isExpiringSoon = hours < 6;
      const isCritical = hours < 2;

      return { hours, minutes, percentage, isExpiringSoon, isCritical };
    };

    setTimeLeft(calculateTime());
    const interval = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 60000);

    return () => clearInterval(interval);
  }, [expiresAt, hasFirstMessage]);

  if (!timeLeft) return null;

  // Determine color based on time remaining - Orange/Teal Theme
  const ringColor = timeLeft.isCritical
    ? colors.orange[600] // Critical: darker orange
    : timeLeft.isExpiringSoon
      ? colors.orange[500] // Expiring soon: primary orange
      : colors.teal[500]; // Normal: teal

  return (
    <View style={[styles.timerContainer, { width: size, height: size }]}>
      {/* Background ring */}
      <View style={[styles.timerRingBg, { width: size, height: size, borderRadius: size / 2 }]} />

      {/* Progress ring (simplified visual) */}
      <View
        style={[
          styles.timerRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
            borderTopColor: 'transparent',
            transform: [{ rotate: `${(timeLeft.percentage / 100) * 360}deg` }],
          },
        ]}
      />

      {/* Timer text */}
      <View style={styles.timerContent}>
        <Feather name="clock" size={12} color={ringColor} />
        <Text style={[styles.timerText, { color: ringColor }]}>
          {timeLeft.hours}h
        </Text>
      </View>
    </View>
  );
};

/**
 * NEW Badge for recent matches
 */
const NewBadge: React.FC<{
  fontSize: number;
  reduceMotion: boolean;
}> = ({ fontSize, reduceMotion }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim, reduceMotion]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  });

  return (
    <View style={styles.newBadge}>
      <LinearGradient
        colors={colors.gradient.primaryButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Shimmer effect */}
      {!reduceMotion && (
        <Animated.View
          style={[
            styles.newBadgeShimmer,
            { transform: [{ translateX }] },
          ]}
        />
      )}
      <Feather name="star" size={Math.max(fontSize - 4, 12)} color={colors.white} />
      <Text style={[styles.newBadgeText, { fontSize: Math.max(fontSize - 2, 14) }]}>
        NEW
      </Text>
    </View>
  );
};

/**
 * Verified Badge
 */
const VerifiedBadge: React.FC = () => (
  <View style={styles.verifiedBadge}>
    <Feather name="check-circle" size={14} color={colors.teal[500]} />
  </View>
);

export const MatchCardItem = React.memo<MatchCardItemProps>(
  ({
    match,
    cardWidth,
    cardHeight,
    onPress,
    isOnline,
    fontSizes,
    spacing,
    isCompactMode = false,
    isVerySmallScreen = false,
    reduceMotion = false,
    index = 0,
  }) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const entryAnim = useRef(new Animated.Value(0)).current;

    // Staggered entry animation
    useEffect(() => {
      if (reduceMotion) {
        entryAnim.setValue(1);
        return;
      }

      const delay = Math.min(index * 80, 400);
      const timeout = setTimeout(() => {
        Animated.spring(entryAnim, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }).start();
      }, delay);

      return () => clearTimeout(timeout);
    }, [index, entryAnim, reduceMotion]);

    const handlePressIn = useCallback(() => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 0.97,
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
      onPress();
    }, [onPress]);

    // Calculate dimensions
    const infoHeight = isCompactMode ? 85 : isVerySmallScreen ? 95 : cardWidth > 190 ? 110 : 100;
    const imageHeight = cardHeight - infoHeight;
    const borderRadius = Math.min(isCompactMode ? 18 : 24, cardWidth * 0.1);

    // Shared interests preview (max 2)
    const sharedInterests = useMemo(() => {
      if (!match.interests || match.interests.length === 0) return [];
      return match.interests.slice(0, 2);
    }, [match.interests]);

    // Entry animation interpolation
    const entryScale = entryAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1],
    });
    const entryOpacity = entryAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, entryScale) },
            ],
            opacity: entryOpacity,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.card,
            {
              width: cardWidth,
              height: cardHeight,
              borderRadius,
            },
          ]}
          accessible
          accessibilityLabel={`${match.name}, ${match.age} years old, from ${match.location}. ${isOnline ? 'Online now' : 'Offline'}. Matched ${match.matchedTime} ago.`}
          accessibilityRole="button"
          accessibilityHint="Double tap to see profile details and send a message"
        >
          {/* Image Section */}
          <View
            style={[
              styles.imageContainer,
              {
                height: imageHeight,
                borderTopLeftRadius: borderRadius,
                borderTopRightRadius: borderRadius,
              },
            ]}
          >
            {!imageError ? (
              <Image
                source={{ uri: match.image || match.photoUrl }}
                style={styles.image}
                resizeMode="cover"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => setImageError(true)}
              />
            ) : (
              <LinearGradient
                colors={[colors.gray[200], colors.gray[300]]}
                style={styles.imagePlaceholder}
              >
                <Feather name="user" size={Math.min(48, imageHeight * 0.3)} color={colors.gray[400]} />
              </LinearGradient>
            )}

            {/* Loading shimmer */}
            {imageLoading && !imageError && (
              <View style={styles.imageLoading}>
                <Shimmer
                  width="100%"
                  height={imageHeight}
                  borderRadius={0}
                  reduceMotion={reduceMotion}
                />
              </View>
            )}

            {/* Premium gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)']}
              locations={[0, 0.5, 1]}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderTopLeftRadius: borderRadius,
                  borderTopRightRadius: borderRadius,
                },
              ]}
            />

            {/* Top left: Online Badge */}
            <View style={[styles.badgeTopLeft, { top: spacing.s, left: spacing.s }]}>
              <OnlineStatusBadge
                isOnline={isOnline}
                isCompact={isCompactMode || isVerySmallScreen}
                reduceMotion={reduceMotion}
              />
            </View>

            {/* Top right: Expiration Timer or NEW Badge */}
            <View style={[styles.badgeTopRight, { top: spacing.s, right: spacing.s }]}>
              {match.isNew && !match.hasFirstMessage ? (
                <ExpirationTimer
                  expiresAt={match.expiresAt}
                  hasFirstMessage={match.hasFirstMessage}
                  size={40}
                  reduceMotion={reduceMotion}
                />
              ) : match.isNew ? (
                <NewBadge fontSize={fontSizes.badge} reduceMotion={reduceMotion} />
              ) : null}
            </View>

            {/* Bottom: Shared Interests */}
            {sharedInterests.length > 0 && !isVerySmallScreen && (
              <View style={[styles.interestsContainer, { bottom: spacing.s, left: spacing.s }]}>
                <View style={styles.interestsBadge}>
                  <Feather name="zap" size={12} color={colors.orange[400]} />
                  <Text style={styles.interestsText}>
                    {sharedInterests.length} {sharedInterests.length === 1 ? 'interest' : 'interests'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Info Section with Glassmorphism effect */}
          <View
            style={[
              styles.infoContainer,
              {
                paddingHorizontal: isCompactMode ? spacing.s : spacing.m,
                paddingTop: isCompactMode ? 10 : 14,
                paddingBottom: isCompactMode ? 12 : 16,
                height: infoHeight,
                borderBottomLeftRadius: borderRadius,
                borderBottomRightRadius: borderRadius,
              },
            ]}
          >
            {/* Name Row */}
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.name,
                  {
                    fontSize: Math.max(Math.min(fontSizes.cardName, 20), 16),
                    lineHeight: Math.max(Math.min(fontSizes.cardName, 20), 16) * 1.25,
                  },
                ]}
                numberOfLines={1}
              >
                {match.name}, {match.age}
              </Text>
              {match.isVerified && <VerifiedBadge />}
            </View>

            {/* Location */}
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <Feather name="map-pin" size={Math.max(13, fontSizes.caption - 3)} color={colors.teal[500]} />
              </View>
              <Text
                style={[
                  styles.location,
                  {
                    fontSize: Math.max(isCompactMode ? 13 : 14, fontSizes.caption - 1),
                  },
                ]}
                numberOfLines={1}
              >
                {match.location}
              </Text>
            </View>

            {/* Match time */}
            <View style={styles.timeRow}>
              <Feather name="heart" size={Math.max(12, fontSizes.caption - 3)} color={colors.orange[500]} />
              <Text
                style={[
                  styles.time,
                  {
                    fontSize: Math.max(isCompactMode ? 12 : 13, fontSizes.caption - 3),
                  },
                ]}
                numberOfLines={1}
              >
                Matched {match.matchedTime}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

MatchCardItem.displayName = 'MatchCardItem';

const styles = StyleSheet.create({
  cardWrapper: {
    // Wrapper for animations
  },
  card: {
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },

  // Image Section
  imageContainer: {
    backgroundColor: colors.gray[200],
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Badge Positioning
  badgeTopLeft: {
    position: 'absolute',
    zIndex: 10,
  },
  badgeTopRight: {
    position: 'absolute',
    zIndex: 10,
  },

  // Online Badge
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 184, 166, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  onlineGlow: {
    position: 'absolute',
    left: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.teal[300],
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
    zIndex: 1,
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

  // Timer
  timerContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerRingBg: {
    position: 'absolute',
    backgroundColor: colors.gray[100],
    borderWidth: 3,
    borderColor: colors.gray[200],
  },
  timerRing: {
    position: 'absolute',
    borderWidth: 3,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // NEW Badge
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  newBadgeShimmer: {
    position: 'absolute',
    width: 30,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  newBadgeText: {
    fontWeight: '800',
    color: colors.white,
  },

  // Verified Badge
  verifiedBadge: {
    marginLeft: 4,
  },

  // Interests
  interestsContainer: {
    position: 'absolute',
  },
  interestsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  interestsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
  },

  // Info Section
  infoContainer: {
    backgroundColor: colors.white,
    justifyContent: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontWeight: '700',
    color: colors.gray[900],
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  locationIcon: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  location: {
    color: colors.gray[600],
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  time: {
    color: colors.gray[500],
  },
});

export default MatchCardItem;
