/**
 * TANDER Premium Profile Card Component
 * Super Premium iPhone-Quality UI/UX
 *
 * Design Features:
 * - Glassmorphism with blur effects
 * - Premium typography with refined letter-spacing
 * - Elegant multi-layer shadow system
 * - Smooth gradient overlays
 * - iOS-style interaction feedback
 * - Refined badge designs with subtle animations
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius } from '@shared/styles/spacing';
import { FONT_SCALING } from '@shared/styles/fontScaling';
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
// RESPONSIVE HELPER
// ============================================================================
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// ============================================================================
// PREMIUM ICONS (Pure View-Based, Pixel Perfect)
// ============================================================================
interface IconProps {
  size: number;
  color: string;
}

// Premium Checkmark with rounded stroke caps
const CheckIcon: React.FC<IconProps> = ({ size, color }) => {
  const strokeWidth = clamp(size * 0.14, 2, 4);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.32,
        height: size * 0.52,
        borderRightWidth: strokeWidth,
        borderBottomWidth: strokeWidth,
        borderColor: color,
        borderBottomRightRadius: strokeWidth / 2,
        transform: [{ rotate: '45deg' }],
        marginTop: -size * 0.08,
        marginLeft: -size * 0.04,
      }} />
    </View>
  );
};

// Premium Location Pin
const LocationIcon: React.FC<IconProps> = ({ size, color }) => {
  const pinWidth = size * 0.48;
  const pinHeight = size * 0.64;
  const borderW = clamp(size * 0.1, 1.5, 2.5);
  const dotSize = clamp(size * 0.16, 3, 6);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: pinWidth,
        height: pinHeight,
        borderWidth: borderW,
        borderColor: color,
        borderTopLeftRadius: pinWidth / 2,
        borderTopRightRadius: pinWidth / 2,
        borderBottomLeftRadius: pinWidth * 0.15,
        borderBottomRightRadius: pinWidth * 0.15,
        marginTop: -size * 0.06,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: pinHeight * 0.18,
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

// Premium User Placeholder
const UserPlaceholderIcon: React.FC<IconProps> = ({ size, color }) => {
  const headSize = size * 0.32;
  const bodyWidth = size * 0.55;
  const bodyHeight = size * 0.32;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: headSize,
        height: headSize,
        borderRadius: headSize / 2,
        backgroundColor: color,
        marginBottom: size * 0.04,
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

// Chevron Right Icon
const ChevronRightIcon: React.FC<IconProps> = ({ size, color }) => {
  const strokeWidth = clamp(size * 0.12, 1.5, 3);
  const armLength = size * 0.28;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: armLength,
        height: armLength,
        borderRightWidth: strokeWidth,
        borderTopWidth: strokeWidth,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginLeft: -size * 0.08,
      }} />
    </View>
  );
};

// User Outline Icon for View Profile button
const UserOutlineIcon: React.FC<IconProps> = ({ size, color }) => {
  const headSize = size * 0.3;
  const bodyWidth = size * 0.5;
  const bodyHeight = size * 0.25;
  const strokeWidth = clamp(size * 0.08, 1.5, 2.5);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: headSize,
        height: headSize,
        borderRadius: headSize / 2,
        borderWidth: strokeWidth,
        borderColor: color,
        marginBottom: size * 0.04,
      }} />
      <View style={{
        width: bodyWidth,
        height: bodyHeight,
        borderTopLeftRadius: bodyWidth / 2,
        borderTopRightRadius: bodyWidth / 2,
        borderWidth: strokeWidth,
        borderBottomWidth: 0,
        borderColor: color,
      }} />
    </View>
  );
};

// ============================================================================
// PREMIUM PROFILE CARD COMPONENT
// ============================================================================
export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onPress,
  height,
}) => {
  const { isLandscape, isTablet, hp, width } = useResponsive();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // ============================================================================
  // RESPONSIVE VALUES - Premium sizing system
  // ============================================================================
  const cardHeight = useMemo(() => {
    if (height) return height;
    if (isLandscape) return clamp(hp(72), 320, 520);
    if (isTablet) return clamp(hp(58), 480, 840);
    return clamp(hp(56), 400, 560);
  }, [height, isLandscape, isTablet, hp]);

  const textSizes = useMemo(() => {
    const baseScale = Math.min(width / 375, 1.25);

    return {
      name: clamp(
        isLandscape ? 26 : isTablet ? 36 : Math.round(30 * baseScale),
        24,
        isTablet ? 44 : 38
      ),
      age: clamp(
        isLandscape ? 24 : isTablet ? 32 : Math.round(28 * baseScale),
        22,
        isTablet ? 38 : 34
      ),
      location: clamp(
        isLandscape ? 15 : isTablet ? 17 : Math.round(15 * baseScale),
        14,
        isTablet ? 19 : 17
      ),
      bio: clamp(
        isLandscape ? 14 : isTablet ? 16 : Math.round(15 * baseScale),
        14,
        isTablet ? 18 : 16
      ),
      tag: clamp(Math.round(13 * baseScale), 12, 15),
      badge: clamp(Math.round(12 * baseScale), 11, 14),
      viewProfile: clamp(Math.round(14 * baseScale), 13, 16),
    };
  }, [width, isLandscape, isTablet]);

  const layoutValues = useMemo(() => {
    const isSmallPhone = width < 360;
    const paddingBase = isLandscape ? spacing.s : isTablet ? spacing.l : spacing.m;

    return {
      cardPadding: paddingBase,
      overlayPaddingBottom: isLandscape ? spacing.m : isTablet ? spacing.xl : spacing.l,
      iconSize: clamp(textSizes.location * 1.15, 16, 22),
      badgeIconSize: clamp(textSizes.badge * 0.95, 10, 14),
      placeholderIconSize: clamp(width * 0.18, 60, 120),
      photoIndicatorSize: isSmallPhone ? 7 : 8,
      photoIndicatorGap: isSmallPhone ? 7 : 8,
      viewProfileButtonHeight: clamp(44 * Math.min(width / 375, 1.15), 40, 52),
      borderRadius: clamp(24 * Math.min(width / 375, 1.2), 20, 32),
    };
  }, [isLandscape, isTablet, textSizes, width]);

  // Photo state
  const photoUri = profile.photos?.[currentPhotoIndex] || profile.photos?.[0] || '';
  const showPlaceholder = !photoUri || imageError;
  const photoCount = profile.photos?.length || 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          height: cardHeight,
          borderRadius: layoutValues.borderRadius,
        },
        pressed && styles.pressed,
      ]}
      accessible
      accessibilityLabel={`${profile.name}, ${profile.age} years old, ${profile.location}`}
      accessibilityHint="Tap to view full profile"
      accessibilityRole="button"
    >
      {/* Premium multi-layer shadow container */}
      <View style={[styles.shadowLayer1, { borderRadius: layoutValues.borderRadius }]}>
        <View style={[styles.shadowLayer2, { borderRadius: layoutValues.borderRadius }]}>
          <View style={[styles.cardInner, { borderRadius: layoutValues.borderRadius }]}>

            {/* Photo background */}
            <View style={styles.imageContainer}>
              {showPlaceholder ? (
                <LinearGradient
                  colors={['#F8F9FA', '#E9ECEF', '#DEE2E6']}
                  style={styles.placeholderGradient}
                >
                  <UserPlaceholderIcon
                    size={layoutValues.placeholderIconSize}
                    color="#ADB5BD"
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
                      <ActivityIndicator size="large" color={colors.orange[500]} />
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Top section - Badges & Photo indicators */}
            <View style={[styles.topSection, { padding: layoutValues.cardPadding }]}>
              {/* Badges with glassmorphism */}
              <View style={styles.badgeRow}>
                {profile.isVerified && (
                  <View style={styles.premiumBadgeWrapper}>
                    {Platform.OS === 'ios' ? (
                      <BlurView intensity={80} tint="light" style={styles.badgeBlur}>
                        <LinearGradient
                          colors={['#34C759', '#30B350']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.verifiedBadge}
                        >
                          <CheckIcon size={layoutValues.badgeIconSize} color="#FFFFFF" />
                          <Text style={[styles.badgeText, { fontSize: textSizes.badge }]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
                            Verified
                          </Text>
                        </LinearGradient>
                      </BlurView>
                    ) : (
                      <LinearGradient
                        colors={['#34C759', '#30B350']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.verifiedBadgeAndroid}
                      >
                        <CheckIcon size={layoutValues.badgeIconSize} color="#FFFFFF" />
                        <Text style={[styles.badgeText, { fontSize: textSizes.badge }]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
                          Verified
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                )}

                {profile.isOnline && (
                  <View style={styles.onlineBadgeWrapper}>
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlinePulse} />
                      <View style={styles.onlineDot} />
                      <Text style={[styles.onlineBadgeText, { fontSize: textSizes.badge }]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
                        Online
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Premium Photo Indicators */}
              {photoCount > 1 && (
                <View style={[styles.photoIndicators, { gap: layoutValues.photoIndicatorGap }]}>
                  {profile.photos.slice(0, 6).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.photoIndicator,
                        {
                          width: layoutValues.photoIndicatorSize,
                          height: layoutValues.photoIndicatorSize,
                          borderRadius: layoutValues.photoIndicatorSize / 2,
                          backgroundColor: index === currentPhotoIndex
                            ? '#FFFFFF'
                            : 'rgba(255,255,255,0.4)',
                          transform: [{ scale: index === currentPhotoIndex ? 1 : 0.85 }],
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Premium Bottom Gradient Overlay */}
            <LinearGradient
              colors={[
                'transparent',
                'rgba(0,0,0,0.03)',
                'rgba(0,0,0,0.25)',
                'rgba(0,0,0,0.55)',
                'rgba(0,0,0,0.78)',
              ]}
              locations={[0, 0.25, 0.5, 0.75, 1]}
              style={[
                styles.overlay,
                {
                  paddingHorizontal: layoutValues.cardPadding,
                  paddingBottom: layoutValues.overlayPaddingBottom,
                }
              ]}
            >
              <View style={styles.infoContainer}>
                {/* Name and Age Row */}
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.nameText, {
                      fontSize: textSizes.name,
                      letterSpacing: -0.8,
                    }]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={FONT_SCALING.TITLE}
                  >
                    {profile.name}
                  </Text>
                  <Text style={[styles.ageText, { fontSize: textSizes.age }]} maxFontSizeMultiplier={FONT_SCALING.TITLE}>
                    {profile.age}
                  </Text>
                </View>

                {/* Location Row */}
                <View style={styles.locationRow}>
                  <LocationIcon
                    size={layoutValues.iconSize}
                    color="rgba(255,255,255,0.85)"
                  />
                  <Text
                    style={[styles.locationText, {
                      fontSize: textSizes.location,
                      letterSpacing: 0.1,
                    }]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={FONT_SCALING.BODY}
                  >
                    {profile.location}
                    {profile.distance && ` · ${profile.distance}`}
                  </Text>
                </View>

                {/* View Full Profile Button - Premium Glass Style */}
                <Pressable
                  onPress={onPress}
                  style={({ pressed }) => [
                    styles.viewProfileButton,
                    { height: layoutValues.viewProfileButtonHeight },
                    pressed && styles.viewProfilePressed,
                  ]}
                >
                  {Platform.OS === 'ios' ? (
                    <BlurView intensity={25} tint="light" style={styles.viewProfileBlur}>
                      <View style={styles.viewProfileContent}>
                        <UserOutlineIcon
                          size={layoutValues.iconSize * 1.1}
                          color="rgba(255,255,255,0.95)"
                        />
                        <Text style={[styles.viewProfileText, { fontSize: textSizes.viewProfile }]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
                          View Full Profile
                        </Text>
                        <ChevronRightIcon
                          size={layoutValues.iconSize}
                          color="rgba(255,255,255,0.7)"
                        />
                      </View>
                    </BlurView>
                  ) : (
                    <View style={styles.viewProfileContentAndroid}>
                      <UserOutlineIcon
                        size={layoutValues.iconSize * 1.1}
                        color="rgba(255,255,255,0.95)"
                      />
                      <Text style={[styles.viewProfileText, { fontSize: textSizes.viewProfile }]} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
                        View Full Profile
                      </Text>
                      <ChevronRightIcon
                        size={layoutValues.iconSize}
                        color="rgba(255,255,255,0.7)"
                      />
                    </View>
                  )}
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

// ============================================================================
// PREMIUM STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.97,
    transform: [{ scale: 0.992 }],
  },

  // Premium multi-layer shadow system
  shadowLayer1: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  shadowLayer2: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.neutral.background,
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
    backgroundColor: 'rgba(255,255,255,0.92)',
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
    gap: 8,
    flexShrink: 1,
  },

  // Premium Badge Styles
  premiumBadgeWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  verifiedBadgeAndroid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Online Badge
  onlineBadgeWrapper: {
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 199, 89, 0.95)',
    gap: 6,
  },
  onlinePulse: {
    position: 'absolute',
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(144, 238, 144, 0.5)',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  onlineBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Premium Photo indicators
  photoIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoIndicator: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  // Bottom overlay
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 100,
    justifyContent: 'flex-end',
  },
  infoContainer: {
    gap: 8,
  },

  // Name and age
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    flexWrap: 'nowrap',
  },
  nameText: {
    color: '#FFFFFF',
    fontWeight: '700',
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ageText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '300',
    flexShrink: 0,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Premium View Profile Button
  viewProfileButton: {
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  viewProfilePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  viewProfileBlur: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  viewProfileContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  viewProfileContentAndroid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
  },
  viewProfileText: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default ProfileCard;
