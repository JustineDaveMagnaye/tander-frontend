/**
 * TANDER Profile Card Component
 * Bumble-inspired minimalist profile card design
 *
 * Key Bumble design principles applied:
 * - Clean, minimalist card showing photo, name, age
 * - Yellow/gold accent colors (Bumble signature)
 * - Large readable text with clear hierarchy
 * - Subtle info overlay at bottom
 *
 * Senior-friendly: Large text (min 16px), high contrast, clear visual hierarchy
 * Responsive: Adapts to phone/tablet, portrait/landscape, old Android/iOS
 *
 * OLD ANDROID/iOS COMPATIBILITY FIXES:
 * - Replaced all 'gap' properties with margin-based spacing
 * - Compatible with Android API 24+ (Android 7.0+) and iOS 13+
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@shared/components';
import { spacing, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

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

// Bumble-inspired gold/yellow color
const BUMBLE_YELLOW = '#FFC629';

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onPress,
  height,
}) => {
  const { isLandscape, isTablet, hp, width } = useResponsive();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Calculate responsive card height - optimized for all orientations
  // Design system Section 6.4: Profile cards should use majority of screen
  const cardHeight = height || (
    isLandscape
      ? Math.min(hp(70), 420)  // Reduced from hp(78) to ensure fits in available space
      : isTablet
        ? Math.min(hp(68), 680) // Increased for tablet portrait to match parent container (680px)
        : Math.min(hp(60), 520)
  );

  // Responsive text sizes - scale based on screen width for consistency
  // Design system: cap baseScale at 1.2 for consistency across app
  const baseScale = Math.min(width / 375, 1.2); // 375 is iPhone standard width, capped at 1.2x

  const nameSize = Math.min(
    Math.max(
      isLandscape ? 24 : isTablet ? 32 : 28,
      Math.round(28 * baseScale)
    ),
    isTablet ? 40 : 36 // Maximum constraint to prevent too-large text
  );

  const ageSize = Math.min(
    Math.max(
      isLandscape ? 22 : isTablet ? 28 : 24,
      Math.round(24 * baseScale)
    ),
    isTablet ? 34 : 30 // Maximum constraint
  );

  const locationSize = Math.min(
    Math.max(
      isLandscape ? 15 : isTablet ? 17 : 16,
      Math.round(15 * baseScale)
    ),
    isTablet ? 20 : 18 // Maximum constraint
  );

  const bioSize = Math.min(
    Math.max(
      isLandscape ? 14 : isTablet ? 16 : 15,
      Math.round(14 * baseScale)
    ),
    isTablet ? 18 : 16 // Maximum constraint
  );

  const tagSize = Math.min(Math.max(11, Math.round(12 * baseScale)), 14); // Min 11px, max 14px
  const badgeSize = Math.min(Math.max(10, Math.round(11 * baseScale)), 13); // Min 10px, max 13px

  // Responsive spacing per design system Section 4.3
  // Tablets use larger padding (32-40px) for better spacing and senior-friendly touch targets
  const cardPadding = isLandscape ? spacing.xs : isTablet ? spacing.xl : spacing.m;
  const overlayPaddingBottom = isLandscape ? spacing.xs : isTablet ? spacing.l : spacing.m;

  // Photo URL
  const photoUri = profile.photos?.[0] || '';
  const showPlaceholder = !photoUri || imageError;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          height: cardHeight,
          borderRadius: isLandscape ? 12 : 16,
        },
        pressed && styles.pressed,
      ]}
      accessible
      accessibilityLabel={`${profile.name}, ${profile.age}, ${profile.location}`}
      accessibilityHint="Tap to view full profile"
      accessibilityRole="button"
    >
      {/* Photo background */}
      <View style={styles.imageContainer}>
        {showPlaceholder ? (
          <LinearGradient
            colors={['#F5F5F5', '#E0E0E0']}
            style={styles.placeholderGradient}
          >
            <Text style={[styles.placeholderEmoji, { fontSize: Math.min(Math.max(48, nameSize * 2), 80) }]}>👤</Text>
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
                <ActivityIndicator size="large" color={BUMBLE_YELLOW} />
              </View>
            )}
          </>
        )}
      </View>

      {/* Top badges - Bumble style with yellow accent */}
      <View style={[styles.topSection, { padding: cardPadding }]}>
        <View style={styles.badgeRow}>
          {profile.isVerified && (
            <View style={[styles.badge, styles.verifiedBadge, styles.badgeMargin]}>
              <Text style={[styles.badgeText, { fontSize: badgeSize }]}>✓ Verified</Text>
            </View>
          )}
          {profile.isOnline && (
            <View style={[styles.badge, styles.onlineBadge]}>
              <View style={[styles.onlineDot, styles.badgeChildMargin]} />
              <Text style={[styles.badgeText, { fontSize: badgeSize }]}>Online</Text>
            </View>
          )}
        </View>

        {/* Photo indicators */}
        {profile.photos.length > 1 && (
          <View style={styles.photoIndicators}>
            {profile.photos.slice(0, 6).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.photoIndicator,
                  index === 0 ? styles.photoIndicatorActive : styles.photoIndicatorInactive,
                  index < 5 && styles.photoIndicatorMargin,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Bottom info overlay - Bumble style gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.4, 1]}
        style={[styles.overlay, { paddingHorizontal: cardPadding, paddingBottom: overlayPaddingBottom }]}
      >
        <View style={styles.infoContainer}>
          {/* Name and age - Bumble style */}
          <View style={[styles.nameRow, styles.infoChildMargin]}>
            <Text
              style={[
                styles.nameText,
                styles.nameRowMargin,
                { fontSize: nameSize }
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {profile.name}
            </Text>
            <Text style={[styles.ageText, { fontSize: ageSize }]}>
              {profile.age}
            </Text>
          </View>

          {/* Location and distance */}
          <View style={[styles.locationRow, styles.infoChildMargin]}>
            <Text
              style={[styles.locationText, { fontSize: locationSize }]}
              numberOfLines={1}
            >
              📍 {profile.location}
              {profile.distance && ` · ${profile.distance}`}
            </Text>
          </View>

          {/* Bio - limited lines with ellipsis */}
          {profile.bio && (
            <Text
              style={[styles.bioText, styles.infoChildMargin, { fontSize: bioSize, lineHeight: bioSize * 1.4 }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {profile.bio}
            </Text>
          )}

          {/* Interest tags - Bumble pill style */}
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.tagsContainer}>
              {profile.interests.slice(0, isLandscape ? 3 : 4).map((interest, index) => (
                <View key={index} style={[styles.tag, styles.tagMargin]}>
                  <Text style={[styles.tagText, { fontSize: tagSize }]}>
                    {interest}
                  </Text>
                </View>
              ))}
              {profile.interests.length > (isLandscape ? 3 : 4) && (
                <View style={[styles.tag, styles.moreTag, styles.tagMargin]}>
                  <Text style={[styles.tagText, styles.moreTagText, { fontSize: tagSize }]}>
                    +{profile.interests.length - (isLandscape ? 3 : 4)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#F8F8F8',
    ...shadows.large,
  },
  pressed: {
    opacity: 0.98,
    transform: [{ scale: 0.995 }],
  },
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
  // Note: placeholderEmoji fontSize is now responsive, set inline in component
  placeholderEmoji: {
    opacity: 0.4,
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
  // OLD ANDROID/iOS COMPATIBLE: Use margin instead of gap (gap not supported on Android API < 28, iOS < 14)
  badgeRow: {
    flexDirection: 'row',
    flexShrink: 1,
  },
  badgeMargin: {
    marginRight: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeChildMargin: {
    marginRight: 4,
  },
  verifiedBadge: {
    backgroundColor: BUMBLE_YELLOW,
  },
  onlineBadge: {
    backgroundColor: '#34C759',
  },
  badgeText: {
    color: '#000',
    fontWeight: '600',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#90EE90',
  },

  // Photo indicators
  // OLD ANDROID/iOS COMPATIBLE: Use margin instead of gap
  photoIndicators: {
    flexDirection: 'row',
  },
  photoIndicatorMargin: {
    marginRight: 4,
  },
  photoIndicator: {
    height: 3,
    borderRadius: 2,
  },
  photoIndicatorActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
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
  // OLD ANDROID/iOS COMPATIBLE: Use margin instead of gap
  infoContainer: {
  },
  infoChildMargin: {
    marginBottom: 4,
  },

  // Name and age
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
  },
  nameRowMargin: {
    marginRight: 8,
  },
  nameText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  ageText: {
    color: '#FFFFFF',
    fontWeight: '300',
    flexShrink: 0,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  // Bio
  bioText: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },

  // Tags
  // OLD ANDROID/iOS COMPATIBLE: Use margin instead of gap
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginRight: -6,
    marginBottom: -6,
  },
  tagMargin: {
    marginRight: 6,
    marginBottom: 6,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tagText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  moreTag: {
    backgroundColor: BUMBLE_YELLOW,
    borderColor: BUMBLE_YELLOW,
  },
  moreTagText: {
    color: '#000000',
    fontWeight: '600',
  },
});

export default ProfileCard;
