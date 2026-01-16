/**
 * TANDER QuickViewModal - Premium Profile Quick View
 *
 * A responsive, flex-based modal for viewing match profiles.
 * Designed for Filipino seniors (50+) with:
 * - FLEX-BASED layout (no fixed pixel positioning)
 * - Responsive design for ALL devices (iPhone SE to iPad Pro)
 * - Portrait and Landscape orientation support
 * - Large touch targets (56px+) for seniors
 * - High contrast text with elegant shadows
 * - Smooth animations with reduce motion support
 * - Haptic feedback for tactile experience
 * - Instagram/Tinder-style photo carousel with progress bars
 *
 * Layout Modes:
 * - Phone Portrait: Bottom sheet style, vertical layout
 * - Phone Landscape: Centered card, vertical layout (compact)
 * - Tablet Portrait: Centered card, vertical layout
 * - Tablet Landscape: Horizontal split layout (photo left, info right)
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Pressable,
  Animated,
  AccessibilityInfo,
  Platform,
  StatusBar,
  ScrollView,
  Easing,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import type { Match } from '../types';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface QuickViewModalProps {
  match: Match | null;
  visible: boolean;
  isOnline: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onSendMessage: () => void;
  reduceMotion?: boolean;
}

interface ModalConfig {
  width: number | string;
  maxWidth: number;
  maxHeight: number;
  photoHeight: number;
  photoWidth: string;
  layout: 'vertical' | 'horizontal';
  position: 'bottom' | 'center';
  borderRadius: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ANIMATION_DURATION = 250;
const DRAG_HANDLE_HEIGHT = 4;
const CLOSE_BUTTON_SIZE = 56;
const MIN_TOUCH_TARGET = 56;
const SWIPE_THRESHOLD = 50;

// =============================================================================
// HELPER: Get compatibility color based on percentage
// =============================================================================

const getCompatibilityColor = (percent: number) => {
  if (percent >= 80) {
    return {
      bg: 'rgba(20, 184, 166, 0.2)',
      text: colors.teal[500],
      border: colors.teal[400],
    };
  } else if (percent >= 70) {
    return {
      bg: 'rgba(249, 115, 22, 0.2)',
      text: colors.orange[500],
      border: colors.orange[400],
    };
  }
  return {
    bg: 'rgba(249, 115, 22, 0.15)',
    text: colors.orange[400],
    border: colors.orange[300],
  };
};

// =============================================================================
// HELPER: Calculate responsive modal configuration
// =============================================================================

const getModalConfig = (
  width: number,
  height: number,
  isTablet: boolean,
  isLandscape: boolean
): ModalConfig => {
  // Tablet Landscape: Horizontal layout
  if (isTablet && isLandscape) {
    const modalHeight = Math.min(height * 0.75, 500);
    return {
      width: Math.min(width * 0.75, 800),
      maxWidth: 800,
      maxHeight: modalHeight,
      photoHeight: modalHeight, // Full height for horizontal layout
      photoWidth: '45%',
      layout: 'horizontal',
      position: 'center',
      borderRadius: 24,
    };
  }

  // Tablet Portrait: Centered card (larger for better visibility)
  if (isTablet) {
    return {
      width: width * 0.92,
      maxWidth: 750,
      maxHeight: height * 0.9,
      photoHeight: height * 0.55, // Increased photo height for better prominence
      photoWidth: '100%',
      layout: 'vertical',
      position: 'center',
      borderRadius: 32,
    };
  }

  // Phone Landscape: Compact centered card
  if (isLandscape) {
    return {
      width: Math.min(width * 0.8, 500),
      maxWidth: 500,
      maxHeight: height * 0.92,
      photoHeight: Math.min(height * 0.5, 220),
      photoWidth: '100%',
      layout: 'vertical',
      position: 'center',
      borderRadius: 20,
    };
  }

  // Phone Portrait: Bottom sheet - Photo focused
  return {
    width: '100%',
    maxWidth: width,
    maxHeight: height * 0.88,
    photoHeight: Math.min(height * 0.5, 380), // Increased for photo prominence
    photoWidth: '100%',
    layout: 'vertical',
    position: 'bottom',
    borderRadius: 24,
  };
};

// =============================================================================
// SUB-COMPONENT: Progress Bars (Instagram-style)
// =============================================================================

interface ProgressBarsProps {
  totalPhotos: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

const ProgressBars: React.FC<ProgressBarsProps> = ({
  totalPhotos,
  currentIndex,
  onIndexChange,
}) => {
  if (totalPhotos <= 1) return null;

  return (
    <View style={styles.progressBarsContainer}>
      {Array.from({ length: totalPhotos }).map((_, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => {
            onIndexChange(index);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }}
          style={styles.progressBarTouchable}
          accessible
          accessibilityLabel={`Go to photo ${index + 1} of ${totalPhotos}`}
          accessibilityRole="button"
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
  );
};

// =============================================================================
// SUB-COMPONENT: Drag Handle (Phone Bottom Sheet)
// =============================================================================

interface DragHandleProps {
  visible: boolean;
}

const DragHandle: React.FC<DragHandleProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.dragHandleContainer}>
      <View style={styles.dragHandle} />
    </View>
  );
};

// =============================================================================
// SUB-COMPONENT: Close Button
// =============================================================================

interface CloseButtonProps {
  onPress: () => void;
  style?: any;
}

const CloseButton: React.FC<CloseButtonProps> = ({ onPress, style }) => {
  return (
    <TouchableOpacity
      style={[styles.closeButton, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel="Close profile preview"
      accessibilityRole="button"
      accessibilityHint="Returns to matches list"
      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
    >
      <View style={styles.closeButtonInner}>
        <Feather name="x" size={24} color={colors.white} />
      </View>
    </TouchableOpacity>
  );
};

// =============================================================================
// SUB-COMPONENT: Online Badge
// =============================================================================

interface OnlineBadgeProps {
  visible: boolean;
  pulseAnim: Animated.Value;
  size?: 'small' | 'large';
}

const OnlineBadge: React.FC<OnlineBadgeProps> = ({ visible, pulseAnim, size = 'small' }) => {
  if (!visible) return null;

  const isLarge = size === 'large';

  return (
    <View style={[styles.onlineBadge, isLarge && styles.onlineBadgeLarge]}>
      <Animated.View
        style={[
          styles.onlineDot,
          isLarge && styles.onlineDotLarge,
          { transform: [{ scale: pulseAnim }] },
        ]}
      />
      <Text style={[styles.onlineText, isLarge && styles.onlineTextLarge]}>Online</Text>
    </View>
  );
};

// =============================================================================
// SUB-COMPONENT: Photo Carousel Section
// =============================================================================

interface PhotoCarouselProps {
  photos: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  name: string;
  isOnline: boolean;
  pulseAnim: Animated.Value;
  photoHeight: number;
  photoWidth: string;
  isHorizontalLayout: boolean;
  reduceMotion: boolean;
}

const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
  photos,
  currentIndex,
  onIndexChange,
  name,
  isOnline,
  pulseAnim,
  photoHeight,
  photoWidth,
  isHorizontalLayout,
  reduceMotion,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  // Animate photo transition
  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      return;
    }

    fadeAnim.setValue(0.7);
    scaleAnim.setValue(1.02);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex, reduceMotion]);

  const handleTapLeft = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentIndex, onIndexChange]);

  const handleTapRight = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      onIndexChange(currentIndex + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentIndex, photos.length, onIndexChange]);

  const photoContainerStyle = isHorizontalLayout
    ? [styles.photoSectionHorizontal, { width: photoWidth }]
    : [styles.photoSectionVertical, { height: photoHeight }];

  const currentPhoto = photos[currentIndex] || '';

  return (
    <View style={photoContainerStyle}>
      {/* Photo with gesture handling */}
      <Animated.View
        style={[
          styles.photoAnimatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {currentPhoto ? (
          <Image
            source={{ uri: currentPhoto }}
            style={styles.photo}
            resizeMode="cover"
            onLoad={() => setImageLoaded(true)}
            accessibilityLabel={`${name}'s photo ${currentIndex + 1} of ${photos.length}`}
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <LinearGradient
              colors={[colors.gray[200], colors.gray[300]]}
              style={StyleSheet.absoluteFill}
            />
            <Feather name="user" size={64} color={colors.gray[400]} />
          </View>
        )}
      </Animated.View>

      {/* Subtle gradient overlay at bottom only - for text readability */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.5, 1]}
        style={styles.photoGradient}
        pointerEvents="none"
      />

      {/* Progress Bars */}
      <View style={styles.progressBarsWrapper}>
        <ProgressBars
          totalPhotos={photos.length}
          currentIndex={currentIndex}
          onIndexChange={onIndexChange}
        />
      </View>

      {/* Tap Navigation Zones */}
      {photos.length > 1 && (
        <>
          <Pressable
            style={styles.tapZoneLeft}
            onPress={handleTapLeft}
            accessible
            accessibilityLabel="Previous photo"
            accessibilityRole="button"
          >
            {currentIndex > 0 && (
              <View style={styles.navHint}>
                <Feather name="chevron-left" size={20} color="rgba(255,255,255,0.8)" />
              </View>
            )}
          </Pressable>
          <Pressable
            style={styles.tapZoneRight}
            onPress={handleTapRight}
            accessible
            accessibilityLabel="Next photo"
            accessibilityRole="button"
          >
            {currentIndex < photos.length - 1 && (
              <View style={styles.navHint}>
                <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
              </View>
            )}
          </Pressable>
        </>
      )}

      {/* Online Badge on Photo */}
      <View style={styles.onlineBadgeOnPhoto}>
        <OnlineBadge visible={isOnline} pulseAnim={pulseAnim} size="small" />
      </View>

      {/* Photo Counter Badge */}
      {photos.length > 1 && (
        <View style={styles.photoCountBadge}>
          <Text style={styles.photoCountText}>
            {currentIndex + 1}/{photos.length}
          </Text>
        </View>
      )}

      {/* Loading shimmer */}
      {!imageLoaded && currentPhoto && (
        <View style={styles.shimmerOverlay}>
          <LinearGradient
            colors={[colors.gray[200], colors.gray[100], colors.gray[200]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}
    </View>
  );
};

// =============================================================================
// SUB-COMPONENT: Info Panel
// =============================================================================

interface InfoPanelProps {
  match: Match;
  isOnline: boolean;
  compatibility: number;
  isHorizontalLayout: boolean;
  isTablet: boolean;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  match,
  isOnline,
  compatibility,
  isHorizontalLayout,
  isTablet,
}) => {
  const compatColors = getCompatibilityColor(compatibility);

  // Responsive font sizes
  const nameFontSize = isTablet ? 28 : 24;
  const metaFontSize = isTablet ? 16 : 15;

  return (
    <View style={[styles.infoPanel, isHorizontalLayout && styles.infoPanelHorizontal]}>
      {/* Name Row with Compatibility Badge */}
      <View style={styles.nameRow}>
        <View style={styles.nameContainer}>
          <Text
            style={[styles.nameText, { fontSize: nameFontSize }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {match.name}, {match.age}
          </Text>

          {/* Verified Badge */}
          {match.isVerified && (
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={12} color={colors.white} />
            </View>
          )}
        </View>

        {/* Compatibility Badge */}
        <View
          style={[
            styles.compatibilityBadge,
            { backgroundColor: compatColors.bg, borderColor: compatColors.border },
          ]}
          accessibilityLabel={`${compatibility}% compatibility match`}
        >
          <Ionicons name="heart" size={14} color={compatColors.text} />
          <Text style={[styles.compatibilityText, { color: compatColors.text }]}>
            {compatibility}%
          </Text>
        </View>
      </View>

      {/* Location */}
      <View style={styles.metaRow}>
        <Feather name="map-pin" size={14} color={colors.gray[500]} />
        <Text style={[styles.metaText, { fontSize: metaFontSize }]} numberOfLines={1}>
          {match.location || match.distance || 'Philippines'}
        </Text>
      </View>

      {/* Match Time */}
      <View style={styles.metaRow}>
        <Ionicons name="heart" size={14} color={colors.orange[400]} />
        <Text style={[styles.metaText, { fontSize: metaFontSize }]}>
          Matched {match.matchedTime}
        </Text>
      </View>
    </View>
  );
};

// =============================================================================
// SUB-COMPONENT: Action Buttons
// =============================================================================

interface ActionButtonsProps {
  match: Match;
  onSendMessage: () => void;
  onViewProfile: () => void;
  reduceMotion: boolean;
  isHorizontalLayout: boolean;
  isTablet: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  match,
  onSendMessage,
  onViewProfile,
  reduceMotion,
  isHorizontalLayout,
  isTablet,
}) => {
  const messageAnim = useRef(new Animated.Value(1)).current;
  const profileAnim = useRef(new Animated.Value(1)).current;

  const animatePress = useCallback(
    (anim: Animated.Value, callback: () => void) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      if (reduceMotion) {
        callback();
        return;
      }

      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.95,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.spring(anim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(callback, 60);
    },
    [reduceMotion]
  );

  // Responsive button sizing
  const buttonHeight = isTablet ? 60 : 56;
  const iconSize = isTablet ? 22 : 20;
  const fontSize = isTablet ? 17 : 16;

  return (
    <View style={[styles.actionButtons, isHorizontalLayout && styles.actionButtonsHorizontal]}>
      {/* Message Button (Primary) */}
      <Animated.View
        style={[styles.messageButtonWrapper, { transform: [{ scale: messageAnim }] }]}
      >
        <TouchableOpacity
          style={[styles.messageButton, { height: buttonHeight }]}
          onPress={() => animatePress(messageAnim, onSendMessage)}
          activeOpacity={0.9}
          accessibilityLabel={`Send message to ${match.name}`}
          accessibilityRole="button"
          accessibilityHint="Opens the chat conversation"
        >
          <LinearGradient
            colors={[colors.orange[500], colors.orange[600]]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Feather name="message-circle" size={iconSize} color={colors.white} />
          <Text style={[styles.messageButtonText, { fontSize }]}>Message</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* View Profile Button (Secondary) */}
      <Animated.View
        style={[styles.profileButtonWrapper, { transform: [{ scale: profileAnim }] }]}
      >
        <TouchableOpacity
          style={[styles.profileButton, { height: buttonHeight }]}
          onPress={() => animatePress(profileAnim, onViewProfile)}
          activeOpacity={0.9}
          accessibilityLabel={`View ${match.name}'s full profile`}
          accessibilityRole="button"
          accessibilityHint="Opens the complete profile"
        >
          <Feather name="user" size={iconSize} color={colors.gray[700]} />
          <Text style={[styles.profileButtonText, { fontSize }]}>Profile</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT: QuickViewModal
// =============================================================================

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  match,
  visible,
  isOnline,
  onClose,
  onViewProfile,
  onSendMessage,
  reduceMotion = false,
}) => {
  const insets = useSafeAreaInsets();
  const { width, height, isTablet, isLandscape, wp, hp } = useResponsive();

  // State
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Calculate modal configuration based on device/orientation
  const config = useMemo(
    () => getModalConfig(width, height, isTablet, isLandscape),
    [width, height, isTablet, isLandscape]
  );

  // Get all photos - support single photo or array
  const photos = useMemo(() => {
    if (!match) return [];
    const photoList: string[] = [];

    // First try images array
    if (match.images && Array.isArray(match.images) && match.images.length > 0) {
      photoList.push(...match.images.filter(Boolean));
    }

    // If no images, try single image property
    if (photoList.length === 0 && match.image) {
      photoList.push(match.image);
    }

    // Fallback to photoUrl
    if (photoList.length === 0 && match.photoUrl) {
      photoList.push(match.photoUrl);
    }

    return photoList;
  }, [match?.images, match?.image, match?.photoUrl]);

  // Calculate compatibility percentage (65-95% based on match ID)
  const compatibility = useMemo(() => {
    if (!match?.id) return 75;
    const hash = match.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 65 + (hash % 31);
  }, [match?.id]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible && match) {
      setCurrentPhotoIndex(0);
    }
  }, [visible, match?.id]);

  // Entry/Exit animations
  useEffect(() => {
    if (visible && match) {
      if (reduceMotion) {
        backdropAnim.setValue(1);
        modalAnim.setValue(1);
        return;
      }

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(modalAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Announce to screen readers
      AccessibilityInfo.announceForAccessibility(
        `Viewing ${match.name}'s profile. ${photos.length} photos available. ${isOnline ? 'Currently online.' : ''}`
      );
    } else {
      backdropAnim.setValue(0);
      modalAnim.setValue(0);
    }
  }, [visible, match, reduceMotion, isOnline, photos.length]);

  // Online pulse animation
  useEffect(() => {
    if (!visible || !isOnline || reduceMotion) {
      pulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [visible, isOnline, reduceMotion]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (reduceMotion) {
      onClose();
      return;
    }

    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [onClose, reduceMotion]);

  // Don't render if not visible or no match
  if (!visible || !match) return null;

  const isHorizontalLayout = config.layout === 'horizontal';
  const isBottomSheet = config.position === 'bottom';

  // Calculate modal positioning styles
  const getModalPositionStyle = () => {
    if (isBottomSheet) {
      // Bottom sheet for phones in portrait
      return {
        position: 'absolute' as const,
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: config.maxHeight,
        borderTopLeftRadius: config.borderRadius,
        borderTopRightRadius: config.borderRadius,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      };
    }

    // Horizontal layout (tablet landscape)
    if (isHorizontalLayout) {
      return {
        width: config.width,
        maxWidth: config.maxWidth,
        height: config.maxHeight,
        borderRadius: config.borderRadius,
      };
    }

    // Centered vertical modal for tablets and phone landscape
    // Calculate appropriate height based on content
    const estimatedContentHeight = config.photoHeight + 220; // photo + info + buttons + padding
    const modalHeight = Math.min(estimatedContentHeight, config.maxHeight);

    return {
      width: config.width,
      maxWidth: config.maxWidth,
      minHeight: modalHeight,
      height: modalHeight,
      maxHeight: config.maxHeight,
      borderRadius: config.borderRadius,
    };
  };

  // Calculate animation transforms
  const getModalAnimatedStyle = () => {
    if (isBottomSheet) {
      // Slide up from bottom
      return {
        transform: [
          {
            translateY: modalAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [300, 0],
            }),
          },
        ],
      };
    }

    // Scale and fade for centered modals
    return {
      opacity: modalAnim,
      transform: [
        {
          scale: modalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
      ],
    };
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      accessibilityViewIsModal
      statusBarTranslucent
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.6],
              }),
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Modal Card */}
        <Animated.View
          style={[
            styles.modalCard,
            getModalPositionStyle(),
            getModalAnimatedStyle(),
          ]}
        >
          {/* Drag Handle (phone portrait only) */}
          <DragHandle visible={isBottomSheet} />

          {/* Close Button */}
          <CloseButton
            onPress={handleClose}
            style={[
              styles.closeButtonPositioned,
              {
                top: isBottomSheet ? 16 : insets.top + 8,
                right: isBottomSheet ? 16 : 16,
              },
            ]}
          />

          {/* Content Layout */}
          {isHorizontalLayout ? (
            // HORIZONTAL LAYOUT (Tablet Landscape)
            <View style={styles.horizontalLayout}>
              {/* Left: Photo Carousel */}
              <PhotoCarousel
                photos={photos}
                currentIndex={currentPhotoIndex}
                onIndexChange={setCurrentPhotoIndex}
                name={match.name}
                isOnline={isOnline}
                pulseAnim={pulseAnim}
                photoHeight={config.photoHeight}
                photoWidth={config.photoWidth}
                isHorizontalLayout={true}
                reduceMotion={reduceMotion}
              />

              {/* Right: Info & Actions */}
              <View
                style={[
                  styles.horizontalInfoContainer,
                  {
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom + 16,
                    paddingRight: insets.right + 16,
                  },
                ]}
              >
                <ScrollView
                  style={styles.horizontalInfoScroll}
                  contentContainerStyle={styles.horizontalInfoContent}
                  showsVerticalScrollIndicator={false}
                >
                  <InfoPanel
                    match={match}
                    isOnline={isOnline}
                    compatibility={compatibility}
                    isHorizontalLayout={true}
                    isTablet={isTablet}
                  />
                </ScrollView>

                <ActionButtons
                  match={match}
                  onSendMessage={onSendMessage}
                  onViewProfile={onViewProfile}
                  reduceMotion={reduceMotion}
                  isHorizontalLayout={true}
                  isTablet={isTablet}
                />
              </View>
            </View>
          ) : (
            // VERTICAL LAYOUT (Phones & Tablet Portrait)
            <ScrollView
              style={styles.verticalLayout}
              contentContainerStyle={[
                styles.verticalContent,
                { paddingBottom: insets.bottom + 16 },
              ]}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Photo Carousel */}
              <PhotoCarousel
                photos={photos}
                currentIndex={currentPhotoIndex}
                onIndexChange={setCurrentPhotoIndex}
                name={match.name}
                isOnline={isOnline}
                pulseAnim={pulseAnim}
                photoHeight={config.photoHeight}
                photoWidth={config.photoWidth}
                isHorizontalLayout={false}
                reduceMotion={reduceMotion}
              />

              {/* Info Panel */}
              <InfoPanel
                match={match}
                isOnline={isOnline}
                compatibility={compatibility}
                isHorizontalLayout={false}
                isTablet={isTablet}
              />

              {/* Action Buttons */}
              <ActionButtons
                match={match}
                onSendMessage={onSendMessage}
                onViewProfile={onViewProfile}
                reduceMotion={reduceMotion}
                isHorizontalLayout={false}
                isTablet={isTablet}
              />
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Container & Backdrop
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
    zIndex: 1,
  },

  // Modal Card
  modalCard: {
    backgroundColor: colors.white,
    overflow: 'hidden',
    zIndex: 10,
    // Shadow
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },

  // Drag Handle
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: DRAG_HANDLE_HEIGHT,
    backgroundColor: colors.gray[300],
    borderRadius: DRAG_HANDLE_HEIGHT / 2,
  },

  // Close Button
  closeButton: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  closeButtonPositioned: {
    position: 'absolute',
    zIndex: 100,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Progress Bars
  progressBarsContainer: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
  },
  progressBarsWrapper: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
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

  // Photo Section - Vertical Layout
  photoSectionVertical: {
    width: '100%',
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'relative',
    backgroundColor: colors.gray[200],
  },

  // Photo Section - Horizontal Layout
  photoSectionHorizontal: {
    height: '100%',
    minHeight: '100%',
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    position: 'relative',
    backgroundColor: colors.gray[200],
  },

  photoAnimatedContainer: {
    width: '100%',
    height: '100%',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoGradient: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },

  // Tap Navigation Zones
  tapZoneLeft: {
    position: 'absolute',
    left: 0,
    top: 60,
    bottom: 40,
    width: '35%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 12,
    zIndex: 15,
  },
  tapZoneRight: {
    position: 'absolute',
    right: 0,
    top: 60,
    bottom: 40,
    width: '35%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 12,
    zIndex: 15,
  },
  navHint: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Photo Count Badge
  photoCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 15,
  },
  photoCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },

  // Online Badge on Photo
  onlineBadgeOnPhoto: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    zIndex: 15,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  onlineBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  onlineDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  onlineTextLarge: {
    fontSize: 14,
  },

  // Layouts
  horizontalLayout: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  horizontalInfoContainer: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'space-between',
  },
  horizontalInfoScroll: {
    flex: 1,
  },
  horizontalInfoContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },

  verticalLayout: {
    flex: 1,
    width: '100%',
  },
  verticalContent: {
    flexGrow: 1,
    minHeight: '100%',
  },

  // Info Panel
  infoPanel: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  infoPanelHorizontal: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },

  // Name Row
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  nameText: {
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.3,
  },

  // Verified Badge
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Compatibility Badge
  compatibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  compatibilityText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Meta Row (Location, Match Time)
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metaText: {
    color: colors.gray[600],
    fontWeight: '500',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  actionButtonsHorizontal: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 0,
  },

  // Message Button (Primary)
  messageButtonWrapper: {
    flex: 1.2,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    gap: 8,
    overflow: 'hidden',
    minHeight: MIN_TOUCH_TARGET,
    // Shadow
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  messageButtonText: {
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },

  // Profile Button (Secondary)
  profileButtonWrapper: {
    flex: 1,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    gap: 6,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
    minHeight: MIN_TOUCH_TARGET,
  },
  profileButtonText: {
    fontWeight: '600',
    color: colors.gray[700],
    letterSpacing: 0.1,
  },
});

export default QuickViewModal;
