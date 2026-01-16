/**
 * TANDER Profile Card Component
 * 100% Recoded following LoginScreen & ProfileScreen patterns
 *
 * Design Patterns:
 * - clamp() helper for responsive sizing
 * - useMemo for computed responsive values
 * - View-based icons using geometric shapes
 * - Design system colors and spacing
 *
 * Senior-friendly: Large text (min 16px), high contrast, clear visual hierarchy
 * Responsive: Adapts to phone/tablet, portrait/landscape
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, shadows, borderRadius } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

// ============================================================================
// TYPES
// ============================================================================
export interface ProfileData {
  id: string;
  name: string;
  age: number;
  location: string;
  bio?: string;
  distance?: string;
  photos: string[];
  interests?: string[];
  isVerified?: boolean;
  isOnline?: boolean;
}

interface ProfileCardProps {
  profile: ProfileData;
  onPress?: () => void;
  height?: number;
}

// ============================================================================
// RESPONSIVE HELPER - Clamps values for all screen sizes
// ============================================================================
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// ============================================================================
// VIEW-BASED ICONS (matching ProfileScreen style)
// ============================================================================
interface IconProps {
  size: number;
  color: string;
}

// Checkmark Icon for Verified Badge
const CheckIcon: React.FC<IconProps> = ({ size, color }) => {
  const strokeWidth = clamp(size * 0.12, 1.5, 4);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.35,
        height: size * 0.55,
        borderRightWidth: strokeWidth,
        borderBottomWidth: strokeWidth,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginTop: -size * 0.1,
        marginLeft: -size * 0.05,
      }} />
    </View>
  );
};

// Location Pin Icon
const LocationIcon: React.FC<IconProps> = ({ size, color }) => {
  const pinWidth = size * 0.5;
  const pinHeight = size * 0.7;
  const borderW = clamp(size * 0.08, 1.5, 3);
  const dotSize = clamp(size * 0.15, 3, 8);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: pinWidth,
        height: pinHeight,
        borderWidth: borderW,
        borderColor: color,
        borderTopLeftRadius: pinWidth / 2,
        borderTopRightRadius: pinWidth / 2,
        borderBottomLeftRadius: pinWidth * 0.1,
        borderBottomRightRadius: pinWidth * 0.1,
        marginTop: -size * 0.1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: pinHeight * 0.15,
      }}>
        <View style={{
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
        }} />
      </View>
    </View>
  );
};

// User Placeholder Icon
const UserPlaceholderIcon: React.FC<IconProps> = ({ size, color }) => {
  const headSize = size * 0.35;
  const bodyWidth = size * 0.6;
  const bodyHeight = size * 0.35;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Head */}
      <View style={{
        width: headSize,
        height: headSize,
        borderRadius: headSize / 2,
        backgroundColor: color,
        marginBottom: size * 0.05,
      }} />
      {/* Body */}
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

// ============================================================================
// PROFILE CARD COMPONENT
// ============================================================================
export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onPress,
  height,
}) => {
  const { isLandscape, isTablet, hp, width } = useResponsive();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // ============================================================================
  // RESPONSIVE VALUES (using useMemo like ProfileScreen)
  // ============================================================================
  const cardHeight = useMemo(() => {
    if (height) return height;
    if (isLandscape) return clamp(hp(72), 300, 500); // Increased min for better usability
    // Fixed: Increased max height for large tablets (12.9" iPad Pro)
    if (isTablet) return clamp(hp(58), 450, 800);
    return clamp(hp(55), 380, 520);
  }, [height, isLandscape, isTablet, hp]);

  const textSizes = useMemo(() => {
    const baseScale = Math.min(width / 375, 1.2);

    // Senior-friendly: All fonts minimum 16px per design_system2.md
    return {
      name: clamp(
        isLandscape ? 24 : isTablet ? 32 : Math.round(28 * baseScale),
        22,
        isTablet ? 40 : 36
      ),
      age: clamp(
        isLandscape ? 22 : isTablet ? 28 : Math.round(24 * baseScale),
        20,
        isTablet ? 34 : 30
      ),
      location: clamp(
        isLandscape ? 16 : isTablet ? 18 : Math.round(16 * baseScale),
        16, // Fixed: was 14, below 16px minimum
        isTablet ? 20 : 18
      ),
      bio: clamp(
        isLandscape ? 16 : isTablet ? 17 : Math.round(16 * baseScale),
        16, // Fixed: was 13, below 16px minimum
        isTablet ? 18 : 17
      ),
      tag: clamp(Math.round(16 * baseScale), 16, 18), // Fixed: was min 11, below 16px minimum
      badge: clamp(Math.round(16 * baseScale), 16, 18), // Fixed: was min 10, below 16px minimum
    };
  }, [width, isLandscape, isTablet]);

  const layoutValues = useMemo(() => {
    const isSmallPhone = width < 360;
    return {
      cardPadding: isLandscape ? spacing.s : isTablet ? spacing.l : spacing.m,
      overlayPaddingBottom: isLandscape ? spacing.s : isTablet ? spacing.l : spacing.m,
      iconSize: clamp(textSizes.location * 1.1, 16, 22),
      badgeIconSize: clamp(textSizes.badge * 1.1, 12, 16),
      placeholderIconSize: clamp(width * 0.15, 50, 100),
      // Photo indicators - larger on small screens for better visibility
      photoIndicatorHeight: isSmallPhone ? 4 : 3,
      photoIndicatorActiveWidth: isSmallPhone ? 28 : 24,
      photoIndicatorInactiveWidth: isSmallPhone ? 20 : 16,
      photoIndicatorGap: isSmallPhone ? 6 : 4,
    };
  }, [isLandscape, isTablet, textSizes, width]);

  // Photo state
  const photoUri = profile.photos?.[0] || '';
  const showPlaceholder = !photoUri || imageError;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { height: cardHeight },
        pressed && styles.pressed,
      ]}
      accessible
      accessibilityLabel={`${profile.name}, ${profile.age} years old, ${profile.location}`}
      accessibilityHint="Tap to view full profile"
      accessibilityRole="button"
    >
      {/* Photo background */}
      <View style={styles.imageContainer}>
        {showPlaceholder ? (
          <LinearGradient
            colors={[colors.neutral.background, colors.neutral.border]}
            style={styles.placeholderGradient}
          >
            <UserPlaceholderIcon
              size={layoutValues.placeholderIconSize}
              color={colors.neutral.disabled}
            />
          </LinearGradient>
        ) : (
          <>
            <Image
              source={{ uri: photoUri }}
              style={styles.image}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
            {imageLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.orange.primary} />
              </View>
            )}
          </>
        )}
      </View>

      {/* Top badges */}
      <View style={[styles.topSection, { padding: layoutValues.cardPadding }]}>
        <View style={styles.badgeRow}>
          {profile.isVerified && (
            <LinearGradient
              colors={colors.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verifiedBadge}
            >
              <CheckIcon size={layoutValues.badgeIconSize} color={colors.white} />
              <Text style={[styles.badgeText, { fontSize: textSizes.badge }]}>
                Verified
              </Text>
            </LinearGradient>
          )}
          {profile.isOnline && (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={[styles.badgeText, { fontSize: textSizes.badge }]}>
                Online
              </Text>
            </View>
          )}
        </View>

        {/* Photo indicators - responsive for small screens */}
        {profile.photos.length > 1 && (
          <View style={[styles.photoIndicators, { gap: layoutValues.photoIndicatorGap }]}>
            {profile.photos.slice(0, 6).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.photoIndicator,
                  {
                    height: layoutValues.photoIndicatorHeight,
                    width: index === 0
                      ? layoutValues.photoIndicatorActiveWidth
                      : layoutValues.photoIndicatorInactiveWidth,
                    backgroundColor: index === 0
                      ? colors.white
                      : 'rgba(255,255,255,0.5)',
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Bottom info overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.4, 1]}
        style={[
          styles.overlay,
          {
            paddingHorizontal: layoutValues.cardPadding,
            paddingBottom: layoutValues.overlayPaddingBottom,
          }
        ]}
      >
        <View style={styles.infoContainer}>
          {/* Name and age */}
          <View style={styles.nameRow}>
            <Text
              style={[styles.nameText, { fontSize: textSizes.name }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {profile.name}
            </Text>
            <Text style={[styles.ageText, { fontSize: textSizes.age }]}>
              {profile.age}
            </Text>
          </View>

          {/* Location and distance */}
          <View style={styles.locationRow}>
            <LocationIcon
              size={layoutValues.iconSize}
              color="rgba(255,255,255,0.9)"
            />
            <Text
              style={[styles.locationText, { fontSize: textSizes.location }]}
              numberOfLines={1}
            >
              {profile.location}
              {profile.distance && ` · ${profile.distance}`}
            </Text>
          </View>

          {/* Bio */}
          {profile.bio && (
            <Text
              style={[
                styles.bioText,
                {
                  fontSize: textSizes.bio,
                  lineHeight: textSizes.bio * 1.4,
                }
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {profile.bio}
            </Text>
          )}

          {/* Interest tags */}
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.tagsContainer}>
              {profile.interests.slice(0, isLandscape ? 3 : 4).map((interest, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={[styles.tagText, { fontSize: textSizes.tag }]}>
                    {interest}
                  </Text>
                </View>
              ))}
              {profile.interests.length > (isLandscape ? 3 : 4) && (
                <LinearGradient
                  colors={colors.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.moreTag}
                >
                  <Text style={[styles.moreTagText, { fontSize: textSizes.tag }]}>
                    +{profile.interests.length - (isLandscape ? 3 : 4)}
                  </Text>
                </LinearGradient>
              )}
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.neutral.background,
    borderRadius: borderRadius.large,
    ...shadows.large,
  },
  pressed: {
    opacity: 0.98,
    transform: [{ scale: 0.995 }],
  },

  // Image
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
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
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Top section
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    gap: 4,
    ...shadows.small,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    gap: 4,
    backgroundColor: colors.semantic.success,
    ...shadows.small,
  },
  badgeText: {
    color: colors.white,
    fontWeight: '600',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#90EE90',
  },

  // Photo indicators
  photoIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  photoIndicator: {
    height: 3,
    borderRadius: 2,
  },
  photoIndicatorActive: {
    width: 24,
    backgroundColor: colors.white,
  },
  photoIndicatorInactive: {
    width: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  // Bottom overlay
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
  },
  infoContainer: {
    gap: 4,
  },

  // Name and age
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.s,
    flexWrap: 'nowrap',
  },
  nameText: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  ageText: {
    color: colors.white,
    fontWeight: '300',
    flexShrink: 0,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  locationText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  // Bio
  bioText: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.s,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tagText: {
    color: colors.white,
    fontWeight: '500',
  },
  moreTag: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
  },
  moreTagText: {
    color: colors.white,
    fontWeight: '600',
  },
});

export default ProfileCard;
