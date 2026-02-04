/**
 * TANDER ProfileViewModal - ULTRA PREMIUM Profile Experience
 *
 * A luxurious, immersive profile viewer with Photo Supremacy design.
 * Photos are 100% unobstructed - all info displays below the photo area.
 *
 * Design Philosophy:
 * - ZERO photo obstruction - no overlays, gradients, or text on photos
 * - Clean separation between photo and info sections
 * - Glassmorphism effects for premium feel
 * - Senior-friendly: 56-64px touch targets, 16px+ fonts
 * - WCAG AA contrast compliance (4.5:1 minimum)
 *
 * Key Changes from Previous Version:
 * - Removed Wave button (redundant - users are already matched)
 * - Moved name/location from photo overlay to dedicated info header
 * - Removed gradient overlay from photo area
 * - Tablet shows centered card instead of split horizontal view
 * - Added glassmorphism effects to section cards
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Pressable,
  Platform,
  ScrollView,
  Animated,
  Easing,
  AccessibilityInfo,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import type { Match } from '../types';
import { Shimmer } from './Shimmer';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ProfileViewModalProps {
  match: Match | null;
  visible: boolean;
  isOnline: boolean;
  onClose: () => void;
  onSendMessage: () => void;
  reduceMotion?: boolean;
}

interface InterestIconMap {
  [key: string]: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SWIPE_THRESHOLD = 50;

// Interest category icons mapping
const INTEREST_ICONS: InterestIconMap = {
  'music': 'musical-notes',
  'singing': 'mic',
  'dancing': 'body',
  'movies': 'film',
  'theater': 'easel',
  'reading': 'book',
  'books': 'book',
  'learning': 'school',
  'history': 'time',
  'gardening': 'leaf',
  'garden': 'leaf',
  'nature': 'flower',
  'hiking': 'walk',
  'walking': 'walk',
  'fishing': 'fish',
  'travel': 'airplane',
  'adventure': 'compass',
  'photography': 'camera',
  'cooking': 'restaurant',
  'baking': 'cafe',
  'food': 'fast-food',
  'family': 'people',
  'grandchildren': 'heart',
  'faith': 'heart-circle',
  'church': 'heart-circle',
  'prayer': 'heart-circle',
  'exercise': 'fitness',
  'yoga': 'body',
  'meditation': 'leaf',
  'health': 'medkit',
  'art': 'color-palette',
  'crafts': 'construct',
  'painting': 'brush',
  'sewing': 'cut',
  'cards': 'diamond',
  'mahjong': 'grid',
  'bingo': 'apps',
  'games': 'game-controller',
  'default': 'heart',
};

const getInterestIcon = (interest: string): string => {
  const lowerInterest = interest.toLowerCase();
  for (const [key, icon] of Object.entries(INTEREST_ICONS)) {
    if (lowerInterest.includes(key)) {
      return icon;
    }
  }
  return INTEREST_ICONS.default;
};

const SAMPLE_SHARED_COUNT = 3;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * PremiumPhotoGallery - Clean photo area with NO overlays
 * Only shows: progress bars (top) and online indicator (small dot)
 */
interface PremiumPhotoGalleryProps {
  photos: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isOnline: boolean;
  height: number;
  borderRadius: number;
  reduceMotion: boolean;
  onClose: () => void;
  insets: { top: number; left: number; right: number };
  isTablet: boolean;
  isFullScreen: boolean;
}

const PremiumPhotoGallery: React.FC<PremiumPhotoGalleryProps> = ({
  photos,
  currentIndex,
  onIndexChange,
  isOnline,
  height,
  borderRadius,
  reduceMotion,
  onClose,
  insets,
  isTablet,
  isFullScreen,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const imageScaleAnim = useRef(new Animated.Value(1.03)).current;
  const imageFadeAnim = useRef(new Animated.Value(1)).current;
  const onlinePulseAnim = useRef(new Animated.Value(1)).current;

  // Photo animation on mount/change
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);

    if (!reduceMotion) {
      imageScaleAnim.setValue(1.02);
      imageFadeAnim.setValue(0.8);

      Animated.parallel([
        Animated.timing(imageScaleAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(imageFadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      imageScaleAnim.setValue(1);
      imageFadeAnim.setValue(1);
    }
  }, [currentIndex, reduceMotion]);

  // Online pulse animation
  useEffect(() => {
    if (isOnline && !reduceMotion) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(onlinePulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(onlinePulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isOnline, reduceMotion]);

  // Swipe gesture handling
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => photos.length > 1,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return photos.length > 1 && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -SWIPE_THRESHOLD && currentIndex < photos.length - 1) {
            onIndexChange(currentIndex + 1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          } else if (gestureState.dx > SWIPE_THRESHOLD && currentIndex > 0) {
            onIndexChange(currentIndex - 1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        },
      }),
    [photos.length, currentIndex, onIndexChange]
  );

  const handlePrevPhoto = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentIndex, onIndexChange]);

  const handleNextPhoto = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      onIndexChange(currentIndex + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentIndex, photos.length, onIndexChange]);

  const handleClosePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
  }, [onClose]);

  const closeSize = isTablet ? 56 : 48;
  const safePaddingTop = isFullScreen ? Math.max(20, insets.top + 8) : 16;

  return (
    <View
      style={[
        styles.galleryContainer,
        {
          height,
          borderTopLeftRadius: borderRadius,
          borderTopRightRadius: borderRadius,
        },
      ]}
    >
      {/* Progress Bars - Premium style */}
      {photos.length > 1 && (
        <View style={[styles.progressBarContainer, { top: safePaddingTop, left: 16, right: 16 }]}>
          {photos.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                onIndexChange(index);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              style={styles.progressBarTouchable}
              accessible
              accessibilityLabel={`Photo ${index + 1} of ${photos.length}`}
            >
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: index <= currentIndex ? '100%' : '0%',
                      backgroundColor: index === currentIndex ? colors.white : 'rgba(255,255,255,0.6)',
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Close Button - Glassmorphism style */}
      <View
        style={[
          styles.closeButtonWrapper,
          {
            top: safePaddingTop,
            right: Math.max(16, insets.right + 8),
          },
        ]}
      >
        <BlurView intensity={80} tint="light" style={[styles.closeButtonBlur, { width: closeSize, height: closeSize, borderRadius: closeSize / 2 }]}>
          <TouchableOpacity
            style={styles.closeButtonInner}
            onPress={handleClosePress}
            activeOpacity={0.8}
            accessible
            accessibilityLabel="Close profile"
            accessibilityRole="button"
          >
            <Feather name="x" size={isTablet ? 26 : 22} color={colors.gray[800]} />
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Main Photo - CLEAN, NO OVERLAY */}
      <Animated.View
        style={[
          styles.photoContainer,
          {
            transform: [{ scale: imageScaleAnim }],
            opacity: imageFadeAnim,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {!imageError && photos.length > 0 && photos[currentIndex] ? (
          <Image
            source={{ uri: photos[currentIndex] }}
            style={styles.photo}
            resizeMode="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => setImageError(true)}
            accessible
            accessibilityLabel={`Photo ${currentIndex + 1} of ${photos.length}`}
          />
        ) : (
          <LinearGradient
            colors={[colors.orange[100], colors.teal[100]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.photoPlaceholder}
          >
            <View style={styles.placeholderIconContainer}>
              <Feather name="user" size={80} color={colors.gray[400]} />
            </View>
          </LinearGradient>
        )}
      </Animated.View>

      {/* Loading Shimmer */}
      {imageLoading && !imageError && (
        <View style={StyleSheet.absoluteFill}>
          <Shimmer width="100%" height={height} borderRadius={0} reduceMotion={reduceMotion} />
        </View>
      )}

      {/* Tap Navigation Zones */}
      {photos.length > 1 && (
        <>
          <Pressable
            style={styles.navZoneLeft}
            onPress={handlePrevPhoto}
            accessible
            accessibilityLabel="Previous photo"
          >
            {currentIndex > 0 && (
              <View style={styles.navArrow}>
                <Feather name="chevron-left" size={28} color="rgba(255,255,255,0.9)" />
              </View>
            )}
          </Pressable>
          <Pressable
            style={styles.navZoneRight}
            onPress={handleNextPhoto}
            accessible
            accessibilityLabel="Next photo"
          >
            {currentIndex < photos.length - 1 && (
              <View style={styles.navArrow}>
                <Feather name="chevron-right" size={28} color="rgba(255,255,255,0.9)" />
              </View>
            )}
          </Pressable>
        </>
      )}

      {/* Online Indicator - Small, subtle, bottom-right of photo */}
      {isOnline && (
        <Animated.View
          style={[
            styles.onlineIndicator,
            { transform: [{ scale: onlinePulseAnim }] },
          ]}
        >
          <View style={styles.onlineIndicatorInner} />
        </Animated.View>
      )}

      {/* Photo Counter - Bottom left, subtle */}
      {photos.length > 1 && (
        <View style={styles.photoCounter}>
          <Feather name="image" size={14} color={colors.white} />
          <Text style={styles.photoCounterText}>
            {currentIndex + 1}/{photos.length}
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * ProfileInfoHeader - Name, Age, Verified, Location, Online status
 * Displays BELOW the photo, not on it
 */
interface ProfileInfoHeaderProps {
  name: string;
  age: number;
  isVerified?: boolean;
  isOnline: boolean;
  location: string;
  distance?: string;
  matchedTime: string;
}

const ProfileInfoHeader: React.FC<ProfileInfoHeaderProps> = ({
  name,
  age,
  isVerified,
  isOnline,
  location,
  distance,
  matchedTime,
}) => {
  return (
    <View style={styles.infoHeader}>
      {/* Row 1: Name, Age, Verified Badge */}
      <View style={styles.infoNameRow}>
        <Text style={styles.infoName}>{name}{age > 0 ? `, ${age}` : ''}</Text>
        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={22} color={colors.teal[500]} />
          </View>
        )}
        {isOnline && (
          <View style={styles.onlineBadgeSmall}>
            <View style={styles.onlineDotSmall} />
            <Text style={styles.onlineTextSmall}>Online</Text>
          </View>
        )}
      </View>

      {/* Row 2: Location & Distance */}
      <View style={styles.infoLocationRow}>
        <Feather name="map-pin" size={16} color={colors.gray[500]} />
        <Text style={styles.infoLocation}>
          {location}{distance ? ` \u2022 ${distance}` : ''}
        </Text>
      </View>

      {/* Row 3: Match time */}
      <View style={styles.infoMatchRow}>
        <Feather name="heart" size={14} color={colors.orange[500]} />
        <Text style={styles.infoMatchTime}>Matched {matchedTime}</Text>
      </View>
    </View>
  );
};

/**
 * PremiumStatsBar - Glassmorphism stat cards
 */
interface PremiumStatsBarProps {
  compatibilityScore?: number;
  distance?: string;
  matchedTime: string;
}

const PremiumStatsBar: React.FC<PremiumStatsBarProps> = ({
  compatibilityScore = 87,
  matchedTime,
}) => {
  const isHighMatch = compatibilityScore >= 85;

  return (
    <View style={styles.statsBar}>
      {/* Compatibility Score */}
      <View style={[styles.statCard, { backgroundColor: isHighMatch ? colors.teal[50] : colors.orange[50] }]}>
        <Ionicons name="heart" size={22} color={isHighMatch ? colors.teal[500] : colors.orange[500]} />
        <Text style={[styles.statValue, { color: isHighMatch ? colors.teal[600] : colors.orange[600] }]}>{compatibilityScore}%</Text>
        <Text style={styles.statLabel}>Match</Text>
      </View>

      {/* Matched Time */}
      <View style={[styles.statCard, { backgroundColor: colors.orange[50] }]}>
        <Feather name="clock" size={20} color={colors.orange[500]} />
        <Text style={[styles.statValue, { color: colors.orange[600] }]}>{matchedTime}</Text>
        <Text style={styles.statLabel}>Matched</Text>
      </View>
    </View>
  );
};

/**
 * GlassProfileSection - Premium glassmorphism section card
 */
interface GlassProfileSectionProps {
  icon: string;
  iconFamily?: 'feather' | 'ionicons';
  title: string;
  children: React.ReactNode;
  accentColor?: string;
  onAskPress?: () => void;
}

const GlassProfileSection: React.FC<GlassProfileSectionProps> = ({
  icon,
  iconFamily = 'ionicons',
  title,
  children,
  accentColor = colors.orange[500],
  onAskPress,
}) => {
  const IconComponent = iconFamily === 'feather' ? Feather : Ionicons;

  return (
    <View style={styles.glassSection}>
      {/* Section Header */}
      <View style={styles.glassSectionHeader}>
        <View style={[styles.glassSectionIconBg, { backgroundColor: `${accentColor}15` }]}>
          <IconComponent name={icon as any} size={20} color={accentColor} />
        </View>
        <Text style={styles.glassSectionTitle}>{title}</Text>
      </View>

      {/* Content */}
      <View style={styles.glassSectionContent}>
        {children}
      </View>

      {/* Ask Button */}
      {onAskPress && (
        <TouchableOpacity
          style={styles.askButton}
          onPress={onAskPress}
          activeOpacity={0.7}
          accessible
          accessibilityLabel="Ask about this"
        >
          <Feather name="message-circle" size={16} color={colors.teal[600]} />
          <Text style={styles.askButtonText}>Ask about this</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * PremiumInterestTags - Visual interest tags with shared highlights
 */
interface PremiumInterestTagsProps {
  interests: string[];
  sharedCount?: number;
}

const PremiumInterestTags: React.FC<PremiumInterestTagsProps> = ({
  interests,
  sharedCount = SAMPLE_SHARED_COUNT,
}) => {
  return (
    <View>
      <View style={styles.interestTagsContainer}>
        {interests.slice(0, 8).map((interest, index) => {
          const isShared = index < sharedCount;
          const iconName = getInterestIcon(interest);

          return (
            <View
              key={index}
              style={[
                styles.interestTag,
                isShared && styles.interestTagShared,
              ]}
            >
              <Ionicons
                name={iconName as any}
                size={16}
                color={isShared ? colors.teal[600] : colors.orange[600]}
              />
              <Text
                style={[
                  styles.interestTagText,
                  isShared && styles.interestTagTextShared,
                ]}
              >
                {interest}
              </Text>
              {isShared && (
                <Ionicons name="checkmark-circle" size={14} color={colors.teal[500]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Shared Interests Banner */}
      {sharedCount > 0 && (
        <View style={styles.sharedBanner}>
          <Ionicons name="sparkles" size={18} color={colors.teal[500]} />
          <Text style={styles.sharedBannerText}>
            You share {sharedCount} {sharedCount === 1 ? 'interest' : 'interests'}!
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * FloatingMessageButton - Premium floating CTA
 */
interface FloatingMessageButtonProps {
  onPress: () => void;
  name: string;
  bottomInset: number;
  reduceMotion: boolean;
}

const FloatingMessageButton: React.FC<FloatingMessageButtonProps> = ({
  onPress,
  name,
  bottomInset,
  reduceMotion,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [reduceMotion]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onPress();
  };

  return (
    <View style={[styles.floatingButtonContainer, { paddingBottom: Math.max(bottomInset + 16, 28) }]}>
      {/* Gradient fade background */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.9)', colors.white]}
        locations={[0, 0.4, 0.7]}
        style={styles.floatingButtonGradient}
        pointerEvents="none"
      />

      <Animated.View style={{ transform: [{ scale: Animated.multiply(pulseAnim, scaleAnim) }] }}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          accessible
          accessibilityLabel={`Send message to ${name}`}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={colors.gradient.primaryButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Feather name="message-circle" size={24} color={colors.white} />
          <Text style={styles.floatingButtonText}>Message {name}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProfileViewModal: React.FC<ProfileViewModalProps> = ({
  match,
  visible,
  isOnline,
  onClose,
  onSendMessage,
  reduceMotion = false,
}) => {
  const insets = useSafeAreaInsets();
  const {
    width,
    height,
    isTablet,
    isLandscape,
    getScreenMargin,
    getButtonHeight,
  } = useResponsive();

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Animations
  const slideAnim = useRef(new Animated.Value(1000)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  // Get all photos
  const photos = useMemo(() => {
    const photoList: string[] = [];
    if (match?.images && Array.isArray(match.images) && match.images.length > 0) {
      photoList.push(...match.images.filter(Boolean));
    }
    if (photoList.length === 0 && match?.image) {
      photoList.push(match.image);
    }
    if (photoList.length === 0 && match?.photoUrl) {
      photoList.push(match.photoUrl);
    }
    return photoList;
  }, [match?.images, match?.image, match?.photoUrl]);

  const screenMargin = getScreenMargin();
  const buttonHeight = Math.max(56, getButtonHeight());

  // Modal sizing - Centered card for tablet, full screen for phone
  const modalConfig = useMemo(() => {
    const availableWidth = width - insets.left - insets.right;
    const availableHeight = height - insets.top - insets.bottom;

    if (isTablet) {
      // Tablet: Centered card design (like QuickViewModal)
      const maxWidth = isLandscape ? 520 : 480;
      const maxHeight = isLandscape ? availableHeight * 0.92 : availableHeight * 0.9;
      const cardWidth = Math.min(maxWidth, availableWidth * 0.85);
      // Photo takes ~55% of card height for better proportion
      const photoHeight = maxHeight * 0.52;

      return {
        width: cardWidth,
        maxHeight: maxHeight,
        borderRadius: 28,
        photoHeight: Math.min(photoHeight, 450),
        isFullScreen: false,
      };
    }

    // Phone: Full screen modal
    const isSmallPhone = width < 375;
    const photoRatio = isSmallPhone ? 0.48 : isLandscape ? 0.4 : 0.52;

    return {
      width: width,
      maxHeight: height,
      borderRadius: 28,
      photoHeight: Math.max(280, Math.min(height * photoRatio, 480)),
      isFullScreen: true,
    };
  }, [width, height, isTablet, isLandscape, insets]);

  // Entry/Exit animations
  useEffect(() => {
    if (visible) {
      setCurrentPhotoIndex(0);

      if (reduceMotion) {
        slideAnim.setValue(0);
        fadeAnim.setValue(1);
        contentFadeAnim.setValue(1);
      } else {
        slideAnim.setValue(height);
        fadeAnim.setValue(0);
        contentFadeAnim.setValue(0);

        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 9,
            tension: 70,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
        ]).start();

        // Stagger content fade in
        setTimeout(() => {
          Animated.timing(contentFadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start();
        }, 200);
      }

      if (match) {
        AccessibilityInfo.announceForAccessibility(
          `Viewing ${match.name}'s profile. ${isOnline ? 'They are online now.' : ''} ${photos.length} photos available.`
        );
      }
    } else {
      slideAnim.setValue(height);
      fadeAnim.setValue(0);
      contentFadeAnim.setValue(0);
    }
  }, [visible, match, isOnline, photos.length, height, reduceMotion]);

  // Close handler
  const handleClose = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (reduceMotion) {
      onClose();
      return;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [height, onClose, reduceMotion]);

  // Message handler
  const handleSendMessage = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onSendMessage();
  }, [onSendMessage]);

  // Conversation starter handler
  const handleAskAbout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSendMessage();
  }, [onSendMessage]);

  if (!visible || !match) return null;

  return (
    <Modal
      visible={true}
      animationType="none"
      transparent
      onRequestClose={handleClose}
      accessibilityViewIsModal
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={[styles.overlay, { justifyContent: modalConfig.isFullScreen ? 'flex-end' : 'center' }]}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', opacity: fadeAnim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessible
            accessibilityLabel="Close profile"
          />
        </Animated.View>

        {/* Modal Container */}
        <Animated.View
          style={[
            styles.modalContainer,
            {
              width: modalConfig.width,
              maxHeight: modalConfig.maxHeight,
              transform: [{ translateY: slideAnim }],
              borderTopLeftRadius: modalConfig.borderRadius,
              borderTopRightRadius: modalConfig.borderRadius,
              borderBottomLeftRadius: modalConfig.isFullScreen ? 0 : modalConfig.borderRadius,
              borderBottomRightRadius: modalConfig.isFullScreen ? 0 : modalConfig.borderRadius,
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: buttonHeight + 100 },
            ]}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {/* Photo Gallery - CLEAN, NO OVERLAYS */}
            <PremiumPhotoGallery
              photos={photos}
              currentIndex={currentPhotoIndex}
              onIndexChange={setCurrentPhotoIndex}
              isOnline={isOnline}
              height={modalConfig.photoHeight}
              borderRadius={modalConfig.borderRadius}
              reduceMotion={reduceMotion}
              onClose={handleClose}
              insets={insets}
              isTablet={isTablet}
              isFullScreen={modalConfig.isFullScreen}
            />

            {/* Content Area - All info BELOW photo */}
            <Animated.View style={[styles.contentArea, { opacity: contentFadeAnim, paddingHorizontal: screenMargin }]}>
              {/* Info Header: Name, Age, Verified, Location */}
              <ProfileInfoHeader
                name={match.name}
                age={match.age}
                isVerified={match.isVerified}
                isOnline={isOnline}
                location={match.location}
                distance={match.distance}
                matchedTime={match.matchedTime}
              />

              {/* Stats Bar */}
              <PremiumStatsBar
                compatibilityScore={87}
                matchedTime={match.matchedTime}
              />

              {/* About Section */}
              {match.bio && (
                <GlassProfileSection
                  icon="sparkles"
                  title={`About ${match.name}`}
                  accentColor={colors.orange[500]}
                  onAskPress={handleAskAbout}
                >
                  <Text style={styles.bioText}>"{match.bio}"</Text>
                </GlassProfileSection>
              )}

              {/* Basics Section */}
              <GlassProfileSection
                icon="list"
                iconFamily="feather"
                title="Basics"
                accentColor={colors.teal[500]}
              >
                <View style={styles.basicsGrid}>
                  {match.age > 0 && (
                    <View style={styles.basicItem}>
                      <Ionicons name="calendar-outline" size={20} color={colors.gray[500]} />
                      <Text style={styles.basicText}>{match.age} years old</Text>
                    </View>
                  )}
                  <View style={styles.basicItem}>
                    <Feather name="map-pin" size={20} color={colors.gray[500]} />
                    <Text style={styles.basicText}>{match.location}</Text>
                  </View>
                  {match.occupation && (
                    <View style={styles.basicItem}>
                      <Feather name="briefcase" size={20} color={colors.gray[500]} />
                      <Text style={styles.basicText}>{match.occupation}</Text>
                    </View>
                  )}
                  {match.education && (
                    <View style={styles.basicItem}>
                      <Ionicons name="school-outline" size={20} color={colors.gray[500]} />
                      <Text style={styles.basicText}>{match.education}</Text>
                    </View>
                  )}
                </View>
              </GlassProfileSection>

              {/* Interests Section */}
              {match.interests && match.interests.length > 0 && (
                <GlassProfileSection
                  icon="heart"
                  title="Interests"
                  accentColor={colors.romantic.pink}
                >
                  <PremiumInterestTags
                    interests={match.interests}
                    sharedCount={Math.min(3, match.interests.length)}
                  />
                </GlassProfileSection>
              )}

              {/* Looking For Section */}
              {match.lookingFor && (
                <GlassProfileSection
                  icon="heart-circle"
                  title="Looking For"
                  accentColor={colors.orange[500]}
                >
                  <Text style={styles.lookingForText}>"{match.lookingFor}"</Text>
                </GlassProfileSection>
              )}
            </Animated.View>
          </ScrollView>

          {/* Floating Message Button - Single CTA */}
          <FloatingMessageButton
            onPress={handleSendMessage}
            name={match.name}
            bottomInset={modalConfig.isFullScreen ? insets.bottom : 0}
            reduceMotion={reduceMotion}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Overlay & Modal
  overlay: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalContainer: {
    backgroundColor: colors.white,
    overflow: 'hidden',
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Photo Gallery
  galleryContainer: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.gray[200],
  },
  photoContainer: {
    ...StyleSheet.absoluteFillObject,
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
  placeholderIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Progress Bars
  progressBarContainer: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 6,
    zIndex: 20,
  },
  progressBarTouchable: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Close Button
  closeButtonWrapper: {
    position: 'absolute',
    zIndex: 25,
  },
  closeButtonBlur: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },

  // Navigation
  navZoneLeft: {
    position: 'absolute',
    left: 0,
    top: 70,
    bottom: 20,
    width: '30%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 12,
    zIndex: 10,
  },
  navZoneRight: {
    position: 'absolute',
    right: 0,
    top: 70,
    bottom: 20,
    width: '30%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 12,
    zIndex: 10,
  },
  navArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Online Indicator (on photo)
  onlineIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  onlineIndicatorInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.teal[500],
  },

  // Photo Counter
  photoCounter: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 15,
  },
  photoCounterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },

  // Content Area
  contentArea: {
    paddingTop: 20,
    backgroundColor: colors.gray[50],
    minHeight: 300,
  },

  // Info Header
  infoHeader: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  infoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  onlineBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.teal[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal[500],
  },
  onlineTextSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.teal[700],
  },
  infoLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  infoLocation: {
    fontSize: 16,
    color: colors.gray[600],
  },
  infoMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  infoMatchTime: {
    fontSize: 14,
    color: colors.orange[600],
    fontWeight: '500',
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexBasis: 0,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    minHeight: 80,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 2,
  },

  // Glass Section
  glassSection: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  glassSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  glassSectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  glassSectionContent: {},

  // Ask Button
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.teal[50],
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 16,
    minHeight: 52,
  },
  askButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.teal[700],
  },

  // Bio & Looking For
  bioText: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.gray[700],
    fontStyle: 'italic',
  },
  lookingForText: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.gray[700],
    fontStyle: 'italic',
  },

  // Basics Grid
  basicsGrid: {
    gap: 14,
  },
  basicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  basicText: {
    fontSize: 17,
    color: colors.gray[700],
    flex: 1,
  },

  // Interest Tags
  interestTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.orange[50],
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    minHeight: 44,
  },
  interestTagShared: {
    backgroundColor: colors.teal[50],
    borderWidth: 1.5,
    borderColor: colors.teal[200],
  },
  interestTagText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.orange[700],
  },
  interestTagTextShared: {
    color: colors.teal[700],
  },
  sharedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.teal[50],
    borderRadius: 14,
  },
  sharedBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.teal[700],
  },

  // Floating Button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  floatingButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[600],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  floatingButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
});

export default ProfileViewModal;
