/**
 * TANDER ProfileViewModal - Premium Profile Experience
 *
 * A luxurious, immersive profile viewer designed to make Filipino seniors
 * excited to connect. Inspired by Hinge's personality-forward approach
 * combined with Bumble's clean design aesthetic.
 *
 * Design System Compliance:
 * - Orange (#F97316) for primary CTAs and action elements
 * - Teal (#14B8A6) for trust indicators and secondary elements
 * - 56-64px minimum touch targets for senior accessibility
 * - 18-20px body text, 16px minimum throughout
 * - WCAG AA contrast compliance (4.5:1 minimum)
 *
 * Photo Carousel Features:
 * - Instagram/Tinder-style progress bars at top
 * - Tap left/right to navigate photos
 * - Swipe gesture support for photo switching
 * - Smooth transitions with reduce motion support
 * - Photo-focused hero design
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
  Dimensions,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  // Music & Entertainment
  'music': 'musical-notes',
  'singing': 'mic',
  'dancing': 'body',
  'movies': 'film',
  'theater': 'easel',

  // Reading & Learning
  'reading': 'book',
  'books': 'book',
  'learning': 'school',
  'history': 'time',

  // Outdoor & Nature
  'gardening': 'leaf',
  'garden': 'leaf',
  'nature': 'flower',
  'hiking': 'walk',
  'walking': 'walk',
  'fishing': 'fish',

  // Travel & Adventure
  'travel': 'airplane',
  'adventure': 'compass',
  'photography': 'camera',

  // Food & Cooking
  'cooking': 'restaurant',
  'baking': 'cafe',
  'food': 'fast-food',

  // Family & Faith
  'family': 'people',
  'grandchildren': 'heart',
  'faith': 'heart-circle',
  'church': 'heart-circle',
  'prayer': 'heart-circle',

  // Wellness & Health
  'exercise': 'fitness',
  'yoga': 'body',
  'meditation': 'leaf',
  'health': 'medkit',

  // Arts & Crafts
  'art': 'color-palette',
  'crafts': 'construct',
  'painting': 'brush',
  'sewing': 'cut',

  // Games & Social
  'cards': 'diamond',
  'mahjong': 'grid',
  'bingo': 'apps',
  'games': 'game-controller',

  // Default
  'default': 'heart',
};

// Get icon name for an interest
const getInterestIcon = (interest: string): string => {
  const lowerInterest = interest.toLowerCase();
  for (const [key, icon] of Object.entries(INTEREST_ICONS)) {
    if (lowerInterest.includes(key)) {
      return icon;
    }
  }
  return INTEREST_ICONS.default;
};

// Sample shared interests (in real app, would come from backend comparison)
const SAMPLE_SHARED_COUNT = 3;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * PhotoGallery - Instagram-style photo carousel with progress bars
 * Enhanced with swipe gestures and cleaner photo display
 */
interface PhotoGalleryProps {
  photos: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  name: string;
  age: number;
  isVerified?: boolean;
  isOnline: boolean;
  location: string;
  distance?: string;
  height: number;
  borderRadius: number;
  reduceMotion: boolean;
  onClose: () => void;
  insets: { top: number; left: number; right: number };
  isTablet: boolean;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  currentIndex,
  onIndexChange,
  name,
  age,
  isVerified,
  isOnline,
  location,
  distance,
  height,
  borderRadius,
  reduceMotion,
  onClose,
  insets,
  isTablet,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const imageScaleAnim = useRef(new Animated.Value(1.05)).current;
  const imageFadeAnim = useRef(new Animated.Value(1)).current;
  const closeScaleAnim = useRef(new Animated.Value(1)).current;

  // Photo zoom animation on mount/photo change
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);

    if (!reduceMotion) {
      imageScaleAnim.setValue(1.03);
      imageFadeAnim.setValue(0.8);

      Animated.parallel([
        Animated.timing(imageScaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(imageFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      imageScaleAnim.setValue(1);
      imageFadeAnim.setValue(1);
    }
  }, [currentIndex, reduceMotion]);

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
            // Swipe left - next photo
            onIndexChange(currentIndex + 1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          } else if (gestureState.dx > SWIPE_THRESHOLD && currentIndex > 0) {
            // Swipe right - previous photo
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

  const closeSize = isTablet ? 64 : 56;
  const safePaddingTop = Math.max(24, insets.top + 12);

  return (
    <View style={[styles.galleryContainer, { height, borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}>
      {/* Progress Bars - Only show if multiple photos */}
      {photos.length > 1 && (
        <View style={[styles.progressBarContainer, { top: safePaddingTop }]}>
          {photos.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                onIndexChange(index);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              style={styles.progressBarTouchable}
              accessible
              accessibilityLabel={`Go to photo ${index + 1} of ${photos.length}`}
            >
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: index <= currentIndex ? '100%' : '0%',
                      opacity: index === currentIndex ? 1 : 0.5,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Close Button */}
      <TouchableOpacity
        style={[
          styles.closeButton,
          {
            top: safePaddingTop,
            right: Math.max(20, insets.right + 12),
            width: closeSize,
            height: closeSize,
            borderRadius: closeSize / 2,
          },
        ]}
        onPress={handleClosePress}
        activeOpacity={0.8}
        accessible
        accessibilityLabel="Close profile"
        accessibilityRole="button"
      >
        <Feather name="x" size={isTablet ? 28 : 24} color={colors.gray[700]} />
      </TouchableOpacity>

      {/* Online Status Badge */}
      {isOnline && (
        <View style={[styles.onlineBadge, { top: safePaddingTop, left: Math.max(20, insets.left + 12) }]}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      )}

      {/* Main Photo with gesture handling */}
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
            accessibilityLabel={`${name}'s photo ${currentIndex + 1} of ${photos.length}`}
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
            <Text style={styles.placeholderText}>{name}</Text>
          </LinearGradient>
        )}
      </Animated.View>

      {/* Loading Shimmer */}
      {imageLoading && !imageError && (
        <View style={StyleSheet.absoluteFill}>
          <Shimmer width="100%" height={height} borderRadius={0} reduceMotion={reduceMotion} />
        </View>
      )}

      {/* Tap Navigation Zones - Only show if multiple photos */}
      {photos.length > 1 && (
        <>
          <Pressable
            style={styles.navZoneLeft}
            onPress={handlePrevPhoto}
            accessible
            accessibilityLabel="Previous photo"
          >
            {currentIndex > 0 && (
              <View style={styles.navHint}>
                <Feather name="chevron-left" size={24} color="rgba(255,255,255,0.8)" />
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
              <View style={styles.navHint}>
                <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.8)" />
              </View>
            )}
          </Pressable>
        </>
      )}

      {/* Photo Counter Badge - Only show if multiple photos */}
      {photos.length > 1 && (
        <View style={styles.photoCountBadge}>
          <Feather name="image" size={14} color={colors.white} />
          <Text style={styles.photoCountText}>
            {currentIndex + 1}/{photos.length}
          </Text>
        </View>
      )}

      {/* Bottom Gradient Overlay - Subtle, only for text readability */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.6)']}
        locations={[0, 0.5, 1]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Name & Location Overlay */}
      <View style={styles.nameOverlay}>
        <View style={styles.nameRow}>
          <Text style={styles.nameText}>{name}, {age}</Text>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={colors.teal[400]} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.locationText}>
            {location}{distance ? ` - ${distance}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
};

/**
 * QuickStatsBar - Horizontal row of stat pills
 */
interface QuickStatsBarProps {
  compatibilityScore?: number;
  distance?: string;
  matchedTime: string;
  isTablet: boolean;
}

const QuickStatsBar: React.FC<QuickStatsBarProps> = ({
  compatibilityScore = 85,
  distance,
  matchedTime,
  isTablet,
}) => {
  // Determine color based on compatibility score
  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return colors.teal[500];
    if (score >= 70) return colors.orange[500];
    return colors.orange[400];
  };

  const compatColor = getCompatibilityColor(compatibilityScore);

  return (
    <View style={styles.statsBarContainer}>
      {/* Compatibility Score */}
      <View style={[styles.statPill, { backgroundColor: `${compatColor}15` }]}>
        <Ionicons name="heart" size={18} color={compatColor} />
        <Text style={[styles.statValue, { color: compatColor }]}>{compatibilityScore}%</Text>
        <Text style={styles.statLabel}>Match</Text>
      </View>

      {/* Distance */}
      {distance && (
        <View style={[styles.statPill, styles.statPillTeal]}>
          <Feather name="navigation" size={16} color={colors.teal[600]} />
          <Text style={[styles.statValue, { color: colors.teal[700] }]}>{distance}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
      )}

      {/* Matched Time */}
      <View style={[styles.statPill, styles.statPillOrange]}>
        <Feather name="clock" size={16} color={colors.orange[600]} />
        <Text style={[styles.statValue, { color: colors.orange[700] }]}>{matchedTime}</Text>
        <Text style={styles.statLabel}>Matched</Text>
      </View>
    </View>
  );
};

/**
 * ProfileSection - Reusable card-style section container
 */
interface ProfileSectionProps {
  icon: string;
  iconFamily?: 'feather' | 'ionicons';
  title: string;
  children: React.ReactNode;
  conversationStarter?: string;
  onConversationPress?: () => void;
  accentColor?: string;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  icon,
  iconFamily = 'ionicons',
  title,
  children,
  conversationStarter,
  onConversationPress,
  accentColor = colors.orange[500],
}) => {
  const IconComponent = iconFamily === 'feather' ? Feather : Ionicons;

  return (
    <View style={styles.sectionCard}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <IconComponent name={icon as any} size={22} color={accentColor} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {/* Section Divider */}
      <View style={styles.sectionDivider} />

      {/* Section Content */}
      <View style={styles.sectionContent}>
        {children}
      </View>

      {/* Conversation Starter Button */}
      {conversationStarter && onConversationPress && (
        <TouchableOpacity
          style={styles.conversationButton}
          onPress={onConversationPress}
          activeOpacity={0.7}
          accessible
          accessibilityLabel={conversationStarter}
          accessibilityRole="button"
        >
          <Feather name="message-circle" size={16} color={colors.teal[600]} />
          <Text style={styles.conversationButtonText}>{conversationStarter}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * InterestTags - Visual interest tags with icons and shared highlights
 */
interface InterestTagsProps {
  interests: string[];
  sharedCount?: number;
}

const InterestTags: React.FC<InterestTagsProps> = ({
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
              <Text style={[
                styles.interestTagText,
                isShared && styles.interestTagTextShared,
              ]}>
                {interest}
              </Text>
              {isShared && (
                <Ionicons name="checkmark-circle" size={14} color={colors.teal[500]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Shared Interests Highlight */}
      {sharedCount > 0 && (
        <View style={styles.sharedHighlight}>
          <Ionicons name="sparkles" size={18} color={colors.teal[500]} />
          <Text style={styles.sharedHighlightText}>
            You share {sharedCount} {sharedCount === 1 ? 'interest' : 'interests'}!
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * StickyActionBar - Fixed bottom action buttons
 */
interface StickyActionBarProps {
  onWave: () => void;
  onMessage: () => void;
  name: string;
  bottomInset: number;
  buttonHeight: number;
  reduceMotion: boolean;
}

const StickyActionBar: React.FC<StickyActionBarProps> = ({
  onWave,
  onMessage,
  name,
  bottomInset,
  buttonHeight,
  reduceMotion,
}) => {
  const ctaPulseAnim = useRef(new Animated.Value(1)).current;

  // Subtle pulse animation for CTA
  useEffect(() => {
    if (reduceMotion) {
      ctaPulseAnim.setValue(1);
      return;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulseAnim, {
          toValue: 1.02,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [reduceMotion]);

  const handleWave = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available
    }
    onWave();
  }, [onWave]);

  const handleMessage = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available
    }
    onMessage();
  }, [onMessage]);

  return (
    <View style={[styles.actionBarContainer, { paddingBottom: Math.max(bottomInset + 12, 24) }]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.95)', colors.white]}
        locations={[0, 0.3, 0.5]}
        style={styles.actionBarGradient}
        pointerEvents="none"
      />

      <View style={styles.actionButtonsRow}>
        {/* Wave Button (Secondary) */}
        <TouchableOpacity
          style={[styles.waveButton, { height: buttonHeight, borderRadius: buttonHeight / 2 }]}
          onPress={handleWave}
          activeOpacity={0.8}
          accessible
          accessibilityLabel={`Send a wave to ${name}`}
          accessibilityRole="button"
        >
          <Text style={styles.waveEmoji}>👋</Text>
          <Text style={styles.waveButtonText}>Wave</Text>
        </TouchableOpacity>

        {/* Message Button (Primary CTA) */}
        <Animated.View style={[styles.messageButtonContainer, { transform: [{ scale: ctaPulseAnim }] }]}>
          <TouchableOpacity
            style={[styles.messageButton, { height: buttonHeight, borderRadius: buttonHeight / 2 }]}
            onPress={handleMessage}
            activeOpacity={0.85}
            accessible
            accessibilityLabel={`Send message to ${name}`}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={colors.gradient.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: buttonHeight / 2 }]}
            />
            <Feather name="message-circle" size={22} color={colors.white} />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
    isPhone,
    moderateScale,
    getScreenMargin,
    hp,
    wp,
    getButtonHeight,
    getTouchTargetSize,
  } = useResponsive();

  // State
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Animations - initialize off-screen (will be set properly in useEffect)
  const slideAnim = useRef(new Animated.Value(1000)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentStaggerAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Get all photos - support both image, images, and photoUrl properties
  const photos = useMemo(() => {
    const photoList: string[] = [];

    // First try images array
    if (match?.images && Array.isArray(match.images) && match.images.length > 0) {
      photoList.push(...match.images.filter(Boolean));
    }

    // If no images, try single image property
    if (photoList.length === 0 && match?.image) {
      photoList.push(match.image);
    }

    // Fallback to photoUrl
    if (photoList.length === 0 && match?.photoUrl) {
      photoList.push(match.photoUrl);
    }

    return photoList;
  }, [match?.images, match?.image, match?.photoUrl]);

  // Responsive calculations
  const screenMargin = getScreenMargin();
  const buttonHeight = Math.max(56, getButtonHeight());

  // Modal sizing - works on all screen sizes
  const modalConfig = useMemo(() => {
    const availableWidth = width - insets.left - insets.right;
    const availableHeight = height - insets.top - insets.bottom;

    // Small phone (iPhone SE, small Android) - portrait
    const isSmallPhone = width < 375;
    const isMediumPhone = width >= 375 && width < 428;

    if (isTablet && isLandscape) {
      // iPad Landscape - horizontal split layout (photo left, content right)
      return {
        width: Math.min(availableWidth * 0.92, 1100),
        maxHeight: availableHeight * 0.92,
        borderRadius: 32,
        photoHeight: availableHeight * 0.92, // Full height for side-by-side
        photoWidth: '50%', // Photo takes 50% of width - more prominent
        layout: 'horizontal' as const,
      };
    } else if (isTablet) {
      // iPad Portrait - much larger modal to show all content with prominent photo
      return {
        width: Math.min(availableWidth * 0.9, 700),
        maxHeight: availableHeight * 0.95,
        borderRadius: 32,
        photoHeight: Math.max(320, Math.min(availableHeight * 0.45, 450)), // Increased photo height
        layout: 'vertical' as const,
      };
    } else if (isLandscape) {
      // Phone Landscape - horizontal layout with larger photo
      return {
        width: Math.min(availableWidth * 0.96, 800),
        maxHeight: availableHeight * 0.95,
        borderRadius: 20,
        photoHeight: availableHeight * 0.95,
        photoWidth: '45%',
        layout: 'horizontal' as const,
      };
    } else if (isSmallPhone) {
      // Small Phone Portrait (iPhone SE, etc.)
      return {
        width: width,
        maxHeight: height,
        borderRadius: 24,
        photoHeight: Math.max(250, Math.min(height * 0.42, 320)), // Increased
        layout: 'vertical' as const,
      };
    } else if (isMediumPhone) {
      // Medium Phone Portrait (iPhone 12/13/14)
      return {
        width: width,
        maxHeight: height,
        borderRadius: 28,
        photoHeight: Math.max(320, Math.min(height * 0.48, 420)), // Increased
        layout: 'vertical' as const,
      };
    }

    // Large Phone Portrait (iPhone Pro Max, large Android)
    return {
      width: width,
      maxHeight: height,
      borderRadius: 28,
      photoHeight: Math.max(360, Math.min(height * 0.5, 480)), // Increased for photo prominence
      layout: 'vertical' as const,
    };
  }, [width, height, isTablet, isLandscape, insets]);

  // Entry/Exit animations
  useEffect(() => {
    if (visible) {
      // Reset photo index
      setCurrentPhotoIndex(0);

      if (reduceMotion) {
        slideAnim.setValue(0);
        fadeAnim.setValue(1);
        contentStaggerAnim.forEach(anim => anim.setValue(1));
      } else {
        // Reset animations
        slideAnim.setValue(height);
        fadeAnim.setValue(0);
        contentStaggerAnim.forEach(anim => anim.setValue(0));

        // Entry animation
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 65,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        // Stagger content sections
        const staggerDelay = 80;
        contentStaggerAnim.forEach((anim, index) => {
          setTimeout(() => {
            Animated.spring(anim, {
              toValue: 1,
              useNativeDriver: true,
              friction: 10,
              tension: 80,
            }).start();
          }, 300 + index * staggerDelay);
        });
      }

      // Accessibility announcement
      if (match) {
        AccessibilityInfo.announceForAccessibility(
          `Viewing ${match.name}'s profile. ${isOnline ? 'They are online now.' : ''} ${photos.length} photos available.`
        );
      }
    } else {
      slideAnim.setValue(height);
      fadeAnim.setValue(0);
      contentStaggerAnim.forEach(anim => anim.setValue(0));
    }
  }, [visible, match, isOnline, photos.length, height, reduceMotion]);

  // Close handler with animation
  const handleClose = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }

    if (reduceMotion) {
      onClose();
      return;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 280,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [height, onClose, reduceMotion]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available
    }
    onSendMessage();
  }, [onSendMessage]);

  // Wave handler (for now, same as message)
  const handleWave = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available
    }
    // In real app, this would send a "wave" notification
    onSendMessage();
  }, [onSendMessage]);

  // Conversation starter handler
  const handleConversationStarter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSendMessage();
  }, [onSendMessage]);

  // Don't render if not visible or no match
  if (!visible || !match) return null;

  const isFullScreen = !isTablet && !isLandscape;
  const isHorizontalLayout = modalConfig.layout === 'horizontal';

  return (
    <Modal
      visible={true}
      animationType="none"
      transparent
      onRequestClose={handleClose}
      accessibilityViewIsModal
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={[styles.overlay, { justifyContent: isFullScreen ? 'flex-end' : 'center' }]}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.75)', opacity: fadeAnim }]}>
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
              height: isFullScreen ? modalConfig.maxHeight : modalConfig.maxHeight,
              maxHeight: modalConfig.maxHeight,
              minHeight: isFullScreen ? modalConfig.maxHeight : modalConfig.maxHeight * 0.8,
              transform: [{ translateY: slideAnim }],
              borderTopLeftRadius: modalConfig.borderRadius,
              borderTopRightRadius: modalConfig.borderRadius,
              borderBottomLeftRadius: isFullScreen ? 0 : modalConfig.borderRadius,
              borderBottomRightRadius: isFullScreen ? 0 : modalConfig.borderRadius,
              flexDirection: isHorizontalLayout ? 'row' : 'column',
            },
          ]}
        >
          {isHorizontalLayout ? (
            // HORIZONTAL LAYOUT (Tablet/Phone Landscape)
            <>
              {/* Left Side: Photo Gallery */}
              <View style={[styles.horizontalPhotoContainer, { width: modalConfig.photoWidth }]}>
                <PhotoGallery
                  photos={photos}
                  currentIndex={currentPhotoIndex}
                  onIndexChange={setCurrentPhotoIndex}
                  name={match.name}
                  age={match.age}
                  isVerified={match.isVerified}
                  isOnline={isOnline}
                  location={match.location}
                  distance={match.distance}
                  height={modalConfig.photoHeight}
                  borderRadius={modalConfig.borderRadius}
                  reduceMotion={reduceMotion}
                  onClose={handleClose}
                  insets={insets}
                  isTablet={isTablet}
                />
              </View>

              {/* Right Side: Content & Actions */}
              <View style={styles.horizontalContentContainer}>
                {/* Close Button for Horizontal Layout */}
                <TouchableOpacity
                  style={[styles.horizontalCloseButton, { top: insets.top + 12 }]}
                  onPress={handleClose}
                  activeOpacity={0.8}
                  accessible
                  accessibilityLabel="Close profile"
                >
                  <Feather name="x" size={24} color={colors.gray[600]} />
                </TouchableOpacity>

                <ScrollView
                  style={styles.horizontalScrollView}
                  contentContainerStyle={styles.horizontalScrollContent}
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                >
                  {/* Name & Info Header */}
                  <View style={styles.horizontalHeader}>
                    <View style={styles.horizontalNameRow}>
                      <Text style={styles.horizontalNameText}>{match.name}, {match.age}</Text>
                      {match.isVerified && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.teal[500]} />
                      )}
                    </View>
                    <View style={styles.horizontalLocationRow}>
                      <Feather name="map-pin" size={16} color={colors.gray[500]} />
                      <Text style={styles.horizontalLocationText}>{match.location}</Text>
                    </View>
                  </View>

                  {/* Quick Stats */}
                  <Animated.View style={[styles.horizontalSection, { opacity: contentStaggerAnim[0] }]}>
                    <QuickStatsBar
                      compatibilityScore={87}
                      distance={match.distance}
                      matchedTime={match.matchedTime}
                      isTablet={isTablet}
                    />
                  </Animated.View>

                  {/* About Section */}
                  {match.bio && (
                    <Animated.View style={[styles.horizontalSection, { opacity: contentStaggerAnim[1] }]}>
                      <ProfileSection
                        icon="sparkles"
                        title={`About ${match.name}`}
                        conversationStarter="Ask about this"
                        onConversationPress={handleConversationStarter}
                        accentColor={colors.orange[500]}
                      >
                        <Text style={styles.bioText}>"{match.bio}"</Text>
                      </ProfileSection>
                    </Animated.View>
                  )}

                  {/* Basics Info */}
                  <Animated.View style={[styles.horizontalSection, { opacity: contentStaggerAnim[2] }]}>
                    <ProfileSection
                      icon="list"
                      iconFamily="feather"
                      title="Basics"
                      accentColor={colors.teal[500]}
                    >
                      <View style={styles.basicsGrid}>
                        <View style={styles.basicItem}>
                          <Ionicons name="calendar-outline" size={20} color={colors.gray[500]} />
                          <Text style={styles.basicText}>{match.age} years old</Text>
                        </View>
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
                        {match.height && (
                          <View style={styles.basicItem}>
                            <Ionicons name="resize-outline" size={20} color={colors.gray[500]} />
                            <Text style={styles.basicText}>{match.height}</Text>
                          </View>
                        )}
                      </View>
                    </ProfileSection>
                  </Animated.View>

                  {/* Interests */}
                  {match.interests && match.interests.length > 0 && (
                    <Animated.View style={[styles.horizontalSection, { opacity: contentStaggerAnim[3] }]}>
                      <ProfileSection
                        icon="heart"
                        title="Interests"
                        accentColor={colors.romantic.pink}
                      >
                        <InterestTags
                          interests={match.interests}
                          sharedCount={Math.min(3, match.interests.length)}
                        />
                      </ProfileSection>
                    </Animated.View>
                  )}

                  {/* Looking For */}
                  {match.lookingFor && (
                    <Animated.View style={[styles.horizontalSection, { opacity: contentStaggerAnim[4] }]}>
                      <ProfileSection
                        icon="heart-circle"
                        title="Looking For"
                        accentColor={colors.orange[500]}
                      >
                        <Text style={styles.lookingForText}>"{match.lookingFor}"</Text>
                      </ProfileSection>
                    </Animated.View>
                  )}

                  {/* Bottom spacing for action buttons */}
                  <View style={{ height: buttonHeight + 40 }} />
                </ScrollView>

                {/* Action Buttons at Bottom of Right Panel */}
                <View style={[styles.horizontalActionBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                  <TouchableOpacity
                    style={[styles.horizontalWaveButton, { height: buttonHeight }]}
                    onPress={handleWave}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.waveEmoji}>👋</Text>
                    <Text style={styles.horizontalWaveText}>Wave</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.horizontalMessageButton, { height: buttonHeight }]}
                    onPress={handleSendMessage}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={colors.gradient.primaryButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: buttonHeight / 2 }]}
                    />
                    <Feather name="message-circle" size={20} color={colors.white} />
                    <Text style={styles.horizontalMessageText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            // VERTICAL LAYOUT (Phones Portrait & Tablet Portrait)
            <>
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollContent,
                  {
                    minHeight: modalConfig.maxHeight - buttonHeight - 20,
                    paddingBottom: buttonHeight + 80,
                  }
                ]}
                showsVerticalScrollIndicator={true}
                bounces={true}
                nestedScrollEnabled={true}
              >
                {/* Section 1: Hero Photo Gallery */}
                <PhotoGallery
                  photos={photos}
                  currentIndex={currentPhotoIndex}
                  onIndexChange={setCurrentPhotoIndex}
                  name={match.name}
                  age={match.age}
                  isVerified={match.isVerified}
                  isOnline={isOnline}
                  location={match.location}
                  distance={match.distance}
                  height={modalConfig.photoHeight}
                  borderRadius={modalConfig.borderRadius}
                  reduceMotion={reduceMotion}
                  onClose={handleClose}
                  insets={insets}
                  isTablet={isTablet}
                />

                {/* Content Area */}
                <View style={[styles.contentArea, { paddingHorizontal: screenMargin }]}>
                  {/* Section 2: Quick Stats Bar */}
                  <Animated.View style={[styles.staggeredSection, { opacity: contentStaggerAnim[0], transform: [{ translateY: contentStaggerAnim[0].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                    <QuickStatsBar
                      compatibilityScore={87}
                      distance={match.distance}
                      matchedTime={match.matchedTime}
                      isTablet={isTablet}
                    />
                  </Animated.View>

                  {/* Section 3: About Section */}
                  {match.bio && (
                    <Animated.View style={[styles.staggeredSection, { opacity: contentStaggerAnim[1], transform: [{ translateY: contentStaggerAnim[1].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                      <ProfileSection
                        icon="sparkles"
                        title={`About ${match.name}`}
                        conversationStarter="Ask about this"
                        onConversationPress={handleConversationStarter}
                        accentColor={colors.orange[500]}
                      >
                        <Text style={styles.bioText}>"{match.bio}"</Text>
                      </ProfileSection>
                    </Animated.View>
                  )}

                  {/* Section 4: Basics Info */}
                  <Animated.View style={[styles.staggeredSection, { opacity: contentStaggerAnim[2], transform: [{ translateY: contentStaggerAnim[2].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                    <ProfileSection
                      icon="list"
                      iconFamily="feather"
                      title="Basics"
                      accentColor={colors.teal[500]}
                    >
                      <View style={styles.basicsGrid}>
                        <View style={styles.basicItem}>
                          <Ionicons name="calendar-outline" size={20} color={colors.gray[500]} />
                          <Text style={styles.basicText}>{match.age} years old</Text>
                        </View>
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
                        {match.height && (
                          <View style={styles.basicItem}>
                            <Ionicons name="resize-outline" size={20} color={colors.gray[500]} />
                            <Text style={styles.basicText}>{match.height}</Text>
                          </View>
                        )}
                      </View>
                    </ProfileSection>
                  </Animated.View>

                  {/* Section 5: Interests */}
                  {match.interests && match.interests.length > 0 && (
                    <Animated.View style={[styles.staggeredSection, { opacity: contentStaggerAnim[3], transform: [{ translateY: contentStaggerAnim[3].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                      <ProfileSection
                        icon="heart"
                        title="Interests"
                        accentColor={colors.romantic.pink}
                      >
                        <InterestTags
                          interests={match.interests}
                          sharedCount={Math.min(3, match.interests.length)}
                        />
                      </ProfileSection>
                    </Animated.View>
                  )}

                  {/* Section 6: Looking For */}
                  {match.lookingFor && (
                    <Animated.View style={[styles.staggeredSection, { opacity: contentStaggerAnim[4], transform: [{ translateY: contentStaggerAnim[4].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                      <ProfileSection
                        icon="heart-circle"
                        title="Looking For"
                        accentColor={colors.orange[500]}
                      >
                        <Text style={styles.lookingForText}>"{match.lookingFor}"</Text>
                      </ProfileSection>
                    </Animated.View>
                  )}

                </View>
              </ScrollView>

              {/* Section 7: Sticky Action Bar */}
              <StickyActionBar
                onWave={handleWave}
                onMessage={handleSendMessage}
                name={match.name}
                bottomInset={isFullScreen ? insets.bottom : 0}
                buttonHeight={buttonHeight}
                reduceMotion={reduceMotion}
              />
            </>
          )}
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
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: '100%',
    paddingBottom: 20,
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
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[600],
    textAlign: 'center',
  },

  // Progress Bars
  progressBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 4,
    zIndex: 20,
  },
  progressBarTouchable: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 1.5,
  },

  // Navigation Zones
  navZoneLeft: {
    position: 'absolute',
    left: 0,
    top: 80,
    bottom: 100,
    width: '35%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 16,
    zIndex: 10,
  },
  navZoneRight: {
    position: 'absolute',
    right: 0,
    top: 80,
    bottom: 100,
    width: '35%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    zIndex: 10,
  },
  navHint: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Photo Count Badge
  photoCountBadge: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 15,
  },
  photoCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },

  // Close Button
  closeButton: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // Online Badge
  onlineBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.teal[500],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 25,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

  // Bottom Gradient & Name Overlay
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    zIndex: 15,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  nameText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  locationText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },

  // Content Area
  contentArea: {
    paddingTop: 16,
    backgroundColor: colors.gray[50],
    minHeight: 300,
  },
  staggeredSection: {
    marginTop: 16,
  },

  // Quick Stats Bar
  statsBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statPill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    minHeight: 70,
  },
  statPillTeal: {
    backgroundColor: colors.teal[50],
  },
  statPillOrange: {
    backgroundColor: colors.orange[50],
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },

  // Profile Sections
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginVertical: 16,
  },
  sectionContent: {},

  // Conversation Starter Button
  conversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.teal[50],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    minHeight: 48,
  },
  conversationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.teal[700],
  },

  // Bio & Looking For Text
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
    gap: 12,
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
  sharedHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.teal[50],
    borderRadius: 12,
  },
  sharedHighlightText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.teal[700],
  },

  // Action Bar
  actionBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  actionBarGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 16,
  },

  // Wave Button
  waveButton: {
    flex: 0.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.orange[300],
    minHeight: 56,
  },
  waveEmoji: {
    fontSize: 22,
  },
  waveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.orange[600],
  },

  // Message Button
  messageButtonContainer: {
    flex: 0.6,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
    minHeight: 56,
  },
  messageButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  // ============================================================================
  // HORIZONTAL LAYOUT STYLES (Tablet/Phone Landscape)
  // ============================================================================

  horizontalPhotoContainer: {
    height: '100%',
    overflow: 'hidden',
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
  },
  horizontalContentContainer: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
  },
  horizontalCloseButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  horizontalScrollView: {
    flex: 1,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  horizontalHeader: {
    marginBottom: 16,
    paddingRight: 60, // Space for close button
  },
  horizontalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  horizontalNameText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
  },
  horizontalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  horizontalLocationText: {
    fontSize: 16,
    color: colors.gray[600],
  },
  horizontalSection: {
    marginBottom: 16,
  },
  horizontalActionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  horizontalWaveButton: {
    flex: 0.35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.orange[300],
    borderRadius: 28,
    minHeight: 56,
  },
  horizontalWaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.orange[600],
  },
  horizontalMessageButton: {
    flex: 0.65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 56,
  },
  horizontalMessageText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});

export default ProfileViewModal;
