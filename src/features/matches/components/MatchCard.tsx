/**
 * TANDER Match Card Component
 * Bumble/Tinder-inspired design with circular photos, gradient accents,
 * and 24-hour expiration countdown timer
 *
 * Design System Compliance (design_system2.md):
 * - 64px minimum touch target for senior-friendly interaction
 * - Rounded corners (16px) per design specs
 * - Orange/Teal gradient accents
 * - Accessible labels and hints
 * - Responsive sizing with hp(), wp(), Math.min()
 *
 * 24-Hour Match Feature:
 * - Colored border showing time remaining urgency
 * - Urgency colors (green > yellow > red)
 * - Match expires silently if no message sent within 24 hours
 *
 * Backward Compatibility:
 * - Uses basic React Native components (no native modules)
 * - Avoids newer APIs not available on Android API 24 / iOS 13
 * - Safe fallbacks for all animations
 */

import React, { memo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows, touchTargets } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import { Match, ExpirationTime } from '../types';
import { FONT_SCALING } from '@shared/styles/fontScaling';

export type MatchCardVariant = 'circle' | 'grid' | 'list';

// Minimum font size for senior accessibility (WCAG compliance - design_system2.md requires 16px)
const MIN_FONT_SIZE = 16;

interface MatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
  variant?: MatchCardVariant;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  showExpirationTimer?: boolean;
  expirationTime?: ExpirationTime | null;
  style?: ViewStyle;
  cardWidth?: number;
}

// Get urgency colors for expiration with romantic styling
const getExpirationColors = (expTime: ExpirationTime | null | undefined): string[] => {
  if (!expTime || expTime.isExpired) {
    return [colors.neutral.disabled, colors.neutral.disabled];
  }
  if (expTime.isCritical) {
    return [colors.romantic.heartRed, colors.romantic.rose];
  }
  if (expTime.isExpiringSoon) {
    return [colors.romantic.coral, colors.orange.primary];
  }
  return [colors.romantic.pink, colors.teal.primary];
};

// Get romantic gradient for new matches
const getNewMatchGradient = (): string[] => {
  return [colors.romantic.pink, colors.orange.primary];
};

// Placeholder icon for when image fails to load
interface IconProps {
  size: number;
  color: string;
}

const UserPlaceholderIcon: React.FC<IconProps> = ({ size, color }) => {
  const headSize = size * 0.35;
  const bodyWidth = size * 0.5;
  const bodyHeight = size * 0.3;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Head */}
      <View style={{
        width: headSize,
        height: headSize,
        borderRadius: headSize / 2,
        backgroundColor: color,
        marginBottom: size * 0.02,
      }} />
      {/* Body/shoulders */}
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

// Image with fallback placeholder
interface ProfileImageProps {
  uri: string;
  size: number;
  borderRadius: number;
  onError?: () => void;
  hasError?: boolean;
}

const ProfileImage: React.FC<ProfileImageProps> = ({ uri, size, borderRadius, onError, hasError }) => {
  const [localError, setLocalError] = useState(false);
  const showPlaceholder = hasError || localError || !uri;

  // Reset error state when URI changes
  useEffect(() => {
    setLocalError(false);
  }, [uri]);

  const handleError = () => {
    setLocalError(true);
    onError?.();
  };

  if (showPlaceholder) {
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: borderRadius,
        backgroundColor: colors.neutral.border,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <UserPlaceholderIcon size={size * 0.5} color={colors.neutral.placeholder} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: borderRadius, backgroundColor: colors.neutral.border }}
      resizeMode="cover"
      onError={handleError}
    />
  );
};

export const MatchCard: React.FC<MatchCardProps> = memo(({
  match,
  onPress,
  variant = 'grid',
  size = 'medium',
  showName = true,
  showExpirationTimer = true,
  expirationTime,
  style,
  cardWidth: _cardWidth, // Used for external width control, internally we use sizeConfig
}) => {
  const { isLandscape, isTablet, hp, wp } = useResponsive();
  const [imageError, setImageError] = useState(false);

  // Reset image error state when match changes (fixes image not reloading)
  useEffect(() => {
    setImageError(false);
  }, [match.id, match.photoUrl]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available on older devices
    }
    onPress(match);
  };

  // Format time since match with invalid date handling
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const parsedDate = new Date(date);

    // Handle invalid dates
    if (isNaN(parsedDate.getTime())) {
      return 'Recently';
    }

    const diff = now.getTime() - parsedDate.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'Now';
  };

  // Whether to show expiration UI
  const shouldShowExpiration = showExpirationTimer && !match.hasFirstMessage && expirationTime && !expirationTime.isExpired;

  // Responsive sizing based on variant and screen
  // Font sizes use Math.max to ensure minimum accessibility size
  const getSizeConfig = () => {
    const baseSize = {
      small: {
        circle: isLandscape ? Math.min(hp(16), wp(9), 64) : isTablet ? 68 : 60,
        grid: isLandscape ? Math.min(hp(35), wp(18), 150) : isTablet ? 150 : 130,
        nameSize: Math.max(MIN_FONT_SIZE, isLandscape ? 14 : isTablet ? 14 : 14),
        timeSize: Math.max(MIN_FONT_SIZE, isLandscape ? 14 : isTablet ? 14 : 14),
      },
      medium: {
        circle: isLandscape ? Math.min(hp(20), wp(11), 76) : isTablet ? 80 : 68,
        grid: isLandscape ? Math.min(hp(45), wp(22), 180) : isTablet ? 180 : 160,
        nameSize: Math.max(MIN_FONT_SIZE, isLandscape ? 14 : isTablet ? 15 : 14),
        timeSize: Math.max(MIN_FONT_SIZE, isLandscape ? 14 : isTablet ? 14 : 14),
      },
      large: {
        circle: isLandscape ? Math.min(hp(24), wp(13), 88) : isTablet ? 92 : 80,
        grid: isLandscape ? Math.min(hp(55), wp(28), 220) : isTablet ? 220 : 200,
        nameSize: Math.max(MIN_FONT_SIZE, isLandscape ? 15 : isTablet ? 16 : 15),
        timeSize: Math.max(MIN_FONT_SIZE, isLandscape ? 14 : isTablet ? 14 : 14),
      },
    };
    return baseSize[size];
  };

  const sizeConfig = getSizeConfig();

  // Badge and indicator sizes - increased for better readability
  const badgeSize = Math.max(MIN_FONT_SIZE, isLandscape ? 14 : isTablet ? 14 : 14);
  const onlineDotSize = isLandscape ? 10 : isTablet ? 12 : 10;

  // CIRCLE VARIANT - Bumble-style circular thumbnails
  if (variant === 'circle') {
    const circleSize = sizeConfig.circle;
    const borderWidth = shouldShowExpiration ? 3 : match.hasNewMessage ? 3 : 2;
    const imageSize = circleSize - borderWidth * 2;
    const containerWidth = circleSize + 8;

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${match.name}${match.isOnline ? ', online now' : ''}${shouldShowExpiration ? `, expires in ${expirationTime?.displayText}` : ''}`}
        accessibilityHint="Double tap to view profile and chat"
        style={[styles.circleContainer, { width: containerWidth }, style]}
      >
        {/* Circle with colored border */}
        <View style={[styles.circleWrapper, { width: circleSize, height: circleSize }]}>
          {shouldShowExpiration ? (
            <LinearGradient
              colors={getExpirationColors(expirationTime)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.gradientBorder, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, padding: borderWidth }]}
            >
              <ProfileImage
                uri={match.photoUrl}
                size={imageSize}
                borderRadius={imageSize / 2}
                hasError={imageError}
                onError={handleImageError}
              />
            </LinearGradient>
          ) : match.hasNewMessage ? (
            <LinearGradient
              colors={getNewMatchGradient()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.gradientBorder, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, padding: borderWidth }]}
            >
              <ProfileImage
                uri={match.photoUrl}
                size={imageSize}
                borderRadius={imageSize / 2}
                hasError={imageError}
                onError={handleImageError}
              />
            </LinearGradient>
          ) : (
            <View style={[styles.plainBorder, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, padding: borderWidth }]}>
              <ProfileImage
                uri={match.photoUrl}
                size={imageSize}
                borderRadius={imageSize / 2}
                hasError={imageError}
                onError={handleImageError}
              />
            </View>
          )}

          {/* Online indicator */}
          {match.isOnline && (
            <View
              style={[
                styles.onlineDot,
                {
                  width: onlineDotSize,
                  height: onlineDotSize,
                  borderRadius: onlineDotSize / 2,
                  bottom: 0,
                  right: 0,
                },
              ]}
            />
          )}
        </View>

        {/* Name and expiration time */}
        {showName && (
          <View style={[styles.circleNameContainer, { width: containerWidth }]}>
            <Text
              variant="caption"
              center
              numberOfLines={1}
              style={[styles.circleName, { fontSize: sizeConfig.nameSize }]}
            >
              {match.name}
            </Text>
            {shouldShowExpiration && (
              <Text
                variant="caption"
                center
                numberOfLines={1}
                color={expirationTime?.isCritical ? colors.semantic.error : expirationTime?.isExpiringSoon ? colors.orange.primary : colors.teal.primary}
                style={[styles.expirationText, { fontSize: sizeConfig.timeSize }]}
              >
                {expirationTime?.displayText}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // LIST VARIANT - Horizontal list item with expiration
  if (variant === 'list') {
    const listHeight = isLandscape ? Math.min(hp(18), 80) : isTablet ? 88 : 80;
    const imageSize = listHeight - 16;

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${match.name}, ${match.age} years old, ${match.location}${shouldShowExpiration ? `, expires in ${expirationTime?.displayText}` : ''}`}
        accessibilityHint="Double tap to view profile"
        style={[styles.listCard, { height: listHeight, minHeight: touchTargets.comfortable }, style]}
      >
        {/* Photo with border */}
        <View style={styles.listImageContainer}>
          {shouldShowExpiration ? (
            <LinearGradient
              colors={getExpirationColors(expirationTime)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.listGradientBorder, { width: imageSize, height: imageSize, borderRadius: imageSize / 2, padding: 2 }]}
            >
              <ProfileImage
                uri={match.photoUrl}
                size={imageSize - 4}
                borderRadius={(imageSize - 4) / 2}
                hasError={imageError}
                onError={handleImageError}
              />
            </LinearGradient>
          ) : match.hasNewMessage ? (
            <LinearGradient
              colors={getNewMatchGradient()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.listGradientBorder, { width: imageSize, height: imageSize, borderRadius: borderRadius.medium, padding: 2 }]}
            >
              <ProfileImage
                uri={match.photoUrl}
                size={imageSize - 4}
                borderRadius={borderRadius.medium - 2}
                hasError={imageError}
                onError={handleImageError}
              />
            </LinearGradient>
          ) : (
            <ProfileImage
              uri={match.photoUrl}
              size={imageSize}
              borderRadius={borderRadius.medium}
              hasError={imageError}
              onError={handleImageError}
            />
          )}
          {match.isOnline && !shouldShowExpiration && (
            <View style={[styles.listOnlineBadge, { width: onlineDotSize, height: onlineDotSize, borderRadius: onlineDotSize / 2 }]} />
          )}
        </View>

        {/* Content */}
        <View style={styles.listContent}>
          <View style={styles.listHeader}>
            <Text
              variant="body"
              numberOfLines={1}
              style={[styles.listName, { fontSize: sizeConfig.nameSize + 1 }]}
            >
              {match.name}, {match.age}
            </Text>
            {shouldShowExpiration ? (
              <View style={[
                styles.expirationBadge,
                expirationTime?.isCritical && styles.expirationBadgeCritical,
                expirationTime?.isExpiringSoon && !expirationTime?.isCritical && styles.expirationBadgeWarning,
              ]}>
                <Text
                  variant="caption"
                  color={expirationTime?.isCritical || expirationTime?.isExpiringSoon ? colors.white : colors.neutral.textSecondary}
                  style={{ fontSize: badgeSize, fontWeight: '600' }}
                >
                  {expirationTime?.displayText}
                </Text>
              </View>
            ) : (
              <Text
                variant="caption"
                color={colors.neutral.textSecondary}
                style={{ fontSize: badgeSize }}
              >
                {getTimeAgo(match.matchedAt)}
              </Text>
            )}
          </View>

          <Text
            variant="caption"
            color={colors.neutral.textSecondary}
            numberOfLines={1}
            style={{ fontSize: sizeConfig.nameSize - 1 }}
          >
            {match.location}
          </Text>

          {match.bio && (
            <Text
              variant="caption"
              color={colors.neutral.placeholder}
              numberOfLines={1}
              style={{ fontSize: sizeConfig.nameSize - 2, marginTop: 2 }}
            >
              {match.bio}
            </Text>
          )}
        </View>

        {/* Action indicator */}
        <View style={styles.listAction}>
          {match.hasNewMessage ? (
            <View style={styles.newMessageDot} />
          ) : (
            <Text variant="caption" color={colors.neutral.disabled} style={{ fontSize: 16 }}>
              ›
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // GRID VARIANT - Modern dating app card with romantic styling
  const gridWidth = sizeConfig.grid;
  const gridHeight = gridWidth * 1.35; // Slightly taller for better proportions

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.95}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${match.name}, ${match.age} years old${match.isOnline ? ', online now' : ''}${shouldShowExpiration ? `, expires in ${expirationTime?.displayText}` : ''}`}
      accessibilityHint="Double tap to view profile and start chatting"
      style={[
        styles.gridCard,
        {
          width: gridWidth,
          height: gridHeight,
          minHeight: touchTargets.large,
        },
        style,
      ]}
    >
      {/* Photo */}
      {imageError || !match.photoUrl ? (
        <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
          <UserPlaceholderIcon size={gridWidth * 0.35} color={colors.neutral.placeholder} />
        </View>
      ) : (
        <Image
          source={{ uri: match.photoUrl }}
          style={styles.gridImage}
          resizeMode="cover"
          onError={handleImageError}
        />
      )}

      {/* Romantic gradient overlay - deeper and more stylish */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.5, 1]}
        style={styles.gridGradient}
      />

      {/* Top subtle gradient for badges readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent']}
        style={styles.gridTopGradient}
      />

      {/* Top badges */}
      <View style={styles.gridTopBadges}>
        {match.isOnline && (
          <View style={styles.gridOnlineBadge}>
            <View style={[styles.onlineDotSmall, { width: 7, height: 7, borderRadius: 3.5 }]} />
            <Text variant="caption" color={colors.white} style={{ fontSize: badgeSize, marginLeft: 4, fontWeight: '600' }}>
              Online
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {shouldShowExpiration ? (
          <LinearGradient
            colors={getExpirationColors(expirationTime)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gridExpirationBadge]}
          >
            <Text variant="caption" color={colors.white} style={{ fontSize: badgeSize, fontWeight: '700' }}>
              {expirationTime?.displayText}
            </Text>
          </LinearGradient>
        ) : match.hasNewMessage ? (
          <LinearGradient
            colors={getNewMatchGradient()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gridNewBadge}
          >
            <Text variant="caption" color={colors.white} style={{ fontSize: badgeSize, fontWeight: '700' }}>
              NEW
            </Text>
          </LinearGradient>
        ) : null}
      </View>

      {/* Bottom info with improved styling */}
      <View style={styles.gridInfo}>
        <View style={styles.gridNameRow}>
          <Text
            variant="body"
            color={colors.white}
            numberOfLines={1}
            style={{ fontSize: sizeConfig.nameSize + 2, fontWeight: '700', flex: 1 }}
            maxFontSizeMultiplier={FONT_SCALING.TITLE}
          >
            {match.name}, {match.age}
          </Text>
          {match.hasNewMessage && !shouldShowExpiration && (
            <View style={styles.gridHeartBadge}>
              <Text style={{ fontSize: 10 }} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>💕</Text>
            </View>
          )}
        </View>
        <View style={styles.gridLocationRow}>
          <Text style={styles.gridLocationIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>📍</Text>
          <Text
            variant="caption"
            color={colors.white}
            numberOfLines={1}
            style={{ fontSize: sizeConfig.nameSize - 1, opacity: 0.95, flex: 1 }}
            maxFontSizeMultiplier={FONT_SCALING.BODY}
          >
            {match.location}
          </Text>
        </View>
        <Text
          variant="caption"
          color={colors.white}
          style={{ fontSize: badgeSize, opacity: 0.75, marginTop: 3 }}
          maxFontSizeMultiplier={FONT_SCALING.CAPTION}
        >
          Matched {getTimeAgo(match.matchedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

MatchCard.displayName = 'MatchCard';

const styles = StyleSheet.create({
  // CIRCLE VARIANT
  circleContainer: {
    alignItems: 'center',
  },
  circleWrapper: {
    position: 'relative',
  },
  gradientBorder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  plainBorder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.border,
  },
  circleImageInner: {
    backgroundColor: colors.neutral.surface,
  },
  circleNameContainer: {
    marginTop: 4,
    alignItems: 'center',
  },
  circleName: {
    fontWeight: '600',
    color: colors.neutral.textPrimary,
  },
  expirationText: {
    marginTop: 1,
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: colors.semantic.success,
    borderWidth: 2,
    borderColor: colors.white,
  },

  // LIST VARIANT
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    ...shadows.small,
  },
  listImageContainer: {
    position: 'relative',
  },
  listGradientBorder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listImage: {
    backgroundColor: colors.neutral.border,
  },
  listImageRound: {
    backgroundColor: colors.neutral.border,
  },
  listOnlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.semantic.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  listContent: {
    flex: 1,
    marginLeft: spacing.s,
    justifyContent: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  listName: {
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.xs,
  },
  listAction: {
    paddingLeft: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  newMessageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange.primary,
  },
  expirationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
    backgroundColor: colors.neutral.border,
  },
  expirationBadgeWarning: {
    backgroundColor: colors.orange.primary,
  },
  expirationBadgeCritical: {
    backgroundColor: colors.semantic.error,
  },

  // GRID VARIANT - Enhanced modern dating app styling
  gridCard: {
    borderRadius: borderRadius.large + 4,
    overflow: 'hidden',
    backgroundColor: colors.neutral.surface,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: colors.romantic.pink,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        }
      : { elevation: 6 }),
  },
  gridImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gridImagePlaceholder: {
    backgroundColor: colors.neutral.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  gridTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  gridTopBadges: {
    position: 'absolute',
    top: spacing.s,
    left: spacing.s,
    right: spacing.s,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gridOnlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  onlineDotSmall: {
    backgroundColor: colors.semantic.success,
  },
  gridNewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  gridExpirationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  gridExpirationWarning: {
    backgroundColor: colors.orange.primary,
  },
  gridExpirationCritical: {
    backgroundColor: colors.romantic.heartRed,
  },
  gridInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.m,
    paddingBottom: spacing.s + 2,
  },
  gridNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  gridHeartBadge: {
    marginLeft: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  gridLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLocationIcon: {
    fontSize: 10,
    marginRight: 3,
  },
});

export default MatchCard;
