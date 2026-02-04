/**
 * TANDER QuickViewModal - ULTRA PREMIUM iPhone UI/UX
 *
 * A stunning, cinematic modal inspired by iOS design language.
 * Features glassmorphism, smooth spring animations, and premium aesthetics.
 *
 * DESIGN PHILOSOPHY:
 * - Floating card design with premium shadows
 * - Glassmorphism effects for modern iOS feel
 * - Large, comfortable touch targets (56-64px)
 * - Smooth spring animations with haptic feedback
 * - Portrait: Beautiful floating card with hero photo
 * - Tablet Landscape: Cinematic split-view with rich info panel
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
  Platform,
  StatusBar,
  Easing,
  PanResponder,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import type { Match } from '../types';

// =============================================================================
// TYPES & CONSTANTS
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

const SWIPE_THRESHOLD = 50;
const PHOTO_TRANSITION_MS = 280;

// =============================================================================
// HELPER: Format time ago
// =============================================================================

const formatTimeAgo = (date: Date | string | undefined): string => {
  if (!date) return 'Recently';
  const now = new Date();
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return 'Recently';

  const diffMs = now.getTime() - parsed.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
};

// =============================================================================
// SUB-COMPONENT: Premium Progress Bars (iOS Stories Style)
// =============================================================================

const ProgressBars: React.FC<{
  total: number;
  current: number;
  onSelect: (index: number) => void;
}> = ({ total, current, onSelect }) => {
  if (total <= 1) return null;

  return (
    <View style={styles.progressBarsContainer}>
      {Array.from({ length: total }).map((_, idx) => (
        <TouchableOpacity
          key={idx}
          style={styles.progressBarTouch}
          onPress={() => {
            onSelect(idx);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }}
          activeOpacity={0.8}
          accessibilityLabel={`Photo ${idx + 1} of ${total}`}
        >
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: idx <= current ? '100%' : '0%',
                  backgroundColor: idx === current ? colors.white : 'rgba(255,255,255,0.5)',
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
// SUB-COMPONENT: Premium Close Button
// =============================================================================

const CloseButton: React.FC<{
  onPress: () => void;
  variant?: 'blur' | 'solid' | 'glass';
  size?: number;
}> = ({ onPress, variant = 'blur', size = 44 }) => (
  <TouchableOpacity
    style={[styles.closeButton, { width: size, height: size, borderRadius: size / 2 }]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityLabel="Close"
    accessibilityRole="button"
    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  >
    {variant === 'blur' ? (
      <BlurView intensity={80} tint="dark" style={styles.closeButtonBlur}>
        <Feather name="x" size={22} color={colors.white} />
      </BlurView>
    ) : variant === 'glass' ? (
      <BlurView intensity={60} tint="light" style={styles.closeButtonGlass}>
        <Feather name="x" size={20} color={colors.gray[700]} />
      </BlurView>
    ) : (
      <View style={styles.closeButtonSolid}>
        <Feather name="x" size={22} color={colors.gray[600]} />
      </View>
    )}
  </TouchableOpacity>
);

// =============================================================================
// SUB-COMPONENT: Online Status Badge (Premium Pulsing)
// =============================================================================

const OnlineBadge: React.FC<{
  isOnline: boolean;
  reduceMotion?: boolean;
  variant?: 'default' | 'large';
}> = ({ isOnline, reduceMotion, variant = 'default' }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isOnline || reduceMotion) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
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
    pulse.start();
    return () => pulse.stop();
  }, [isOnline, reduceMotion]);

  if (!isOnline) return null;

  const isLarge = variant === 'large';

  return (
    <View style={[styles.onlineBadgeContainer, isLarge && styles.onlineBadgeContainerLarge]}>
      <Animated.View
        style={[
          styles.onlinePulseRing,
          isLarge && styles.onlinePulseRingLarge,
          { transform: [{ scale: pulseAnim }] }
        ]}
      />
      <View style={[styles.onlineBadge, isLarge && styles.onlineBadgeLarge]}>
        <View style={[styles.onlineDot, isLarge && styles.onlineDotLarge]} />
        <Text style={[styles.onlineText, isLarge && styles.onlineTextLarge]}>Online Now</Text>
      </View>
    </View>
  );
};

// =============================================================================
// SUB-COMPONENT: Verified Badge
// =============================================================================

const VerifiedBadge: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <View style={styles.verifiedBadge}>
    <MaterialCommunityIcons name="check-decagram" size={size} color={colors.teal[500]} />
  </View>
);

// =============================================================================
// SUB-COMPONENT: Photo Counter Pill
// =============================================================================

const PhotoCounterPill: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  if (total <= 1) return null;

  return (
    <View style={styles.photoCounterPill}>
      <Feather name="image" size={12} color={colors.white} />
      <Text style={styles.photoCounterText}>{current + 1}/{total}</Text>
    </View>
  );
};

// =============================================================================
// SUB-COMPONENT: Navigation Arrow (Glassmorphism)
// =============================================================================

const NavArrow: React.FC<{
  direction: 'left' | 'right';
  onPress: () => void;
  visible: boolean;
}> = ({ direction, onPress, visible }) => {
  if (!visible) return null;

  return (
    <Pressable
      style={[styles.navArrow, direction === 'left' ? styles.navArrowLeft : styles.navArrowRight]}
      onPress={onPress}
    >
      <BlurView intensity={70} tint="dark" style={styles.navArrowBlur}>
        <Feather
          name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
          size={28}
          color="rgba(255,255,255,0.95)"
        />
      </BlurView>
    </Pressable>
  );
};

// =============================================================================
// SUB-COMPONENT: Premium Stat Card (Tablet)
// =============================================================================

const StatCard: React.FC<{
  icon: string;
  iconFamily?: 'ionicons' | 'feather';
  label: string;
  value: string;
  color: string;
  bgColor: string;
}> = ({ icon, iconFamily = 'ionicons', label, value, color, bgColor }) => {
  const IconComponent = iconFamily === 'feather' ? Feather : Ionicons;

  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={[styles.statCardIconBg, { backgroundColor: color }]}>
        <IconComponent name={icon as any} size={18} color={colors.white} />
      </View>
      <View style={styles.statCardContent}>
        <Text style={styles.statCardLabel} numberOfLines={1}>{label}</Text>
        <Text style={[styles.statCardValue, { color }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
};

// =============================================================================
// SUB-COMPONENT: Interest Tag
// =============================================================================

const InterestTag: React.FC<{ interest: string; isShared?: boolean }> = ({ interest, isShared }) => (
  <View style={[styles.interestTag, isShared && styles.interestTagShared]}>
    <Ionicons
      name="heart"
      size={12}
      color={isShared ? colors.teal[600] : colors.gray[500]}
    />
    <Text style={[styles.interestTagText, isShared && styles.interestTagTextShared]}>
      {interest}
    </Text>
    {isShared && (
      <Ionicons name="checkmark-circle" size={12} color={colors.teal[500]} />
    )}
  </View>
);

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
  const { width: screenWidth, height: screenHeight, isTablet, isLandscape, wp, hp } = useResponsive();

  // State
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Animation refs
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  const photoFadeAnim = useRef(new Animated.Value(1)).current;
  const photoScaleAnim = useRef(new Animated.Value(1)).current;

  // Layout mode
  const isHorizontalLayout = isTablet && isLandscape;

  // Get photos array
  const photos = useMemo(() => {
    if (!match) return [];
    const list: string[] = [];
    if (match.images?.length) list.push(...match.images.filter(Boolean));
    else if (match.image) list.push(match.image);
    else if (match.photoUrl) list.push(match.photoUrl);
    return list;
  }, [match]);

  const hasMultiplePhotos = photos.length > 1;
  const currentPhoto = photos[currentPhotoIndex] || '';

  // Compatibility percentage (mock)
  const compatibility = useMemo(() => {
    if (!match?.id) return 78;
    const hash = match.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return 65 + (hash % 31);
  }, [match?.id]);

  // Sample interests for display
  const displayInterests = useMemo(() => {
    if (!match?.interests?.length) return ['Travel', 'Music', 'Cooking'];
    return match.interests.slice(0, 4);
  }, [match?.interests]);

  // Navigate photos with animation
  const navigatePhoto = useCallback(
    (direction: 'prev' | 'next') => {
      if (!hasMultiplePhotos) return;

      const newIndex =
        direction === 'next'
          ? Math.min(currentPhotoIndex + 1, photos.length - 1)
          : Math.max(currentPhotoIndex - 1, 0);

      if (newIndex === currentPhotoIndex) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      if (reduceMotion) {
        setCurrentPhotoIndex(newIndex);
        return;
      }

      Animated.parallel([
        Animated.timing(photoFadeAnim, {
          toValue: 0.6,
          duration: PHOTO_TRANSITION_MS / 2,
          useNativeDriver: true,
        }),
        Animated.timing(photoScaleAnim, {
          toValue: 0.98,
          duration: PHOTO_TRANSITION_MS / 2,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentPhotoIndex(newIndex);
        setImageLoaded(false);
        Animated.parallel([
          Animated.timing(photoFadeAnim, {
            toValue: 1,
            duration: PHOTO_TRANSITION_MS / 2,
            useNativeDriver: true,
          }),
          Animated.spring(photoScaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [currentPhotoIndex, photos.length, hasMultiplePhotos, reduceMotion]
  );

  // Swipe gesture
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => hasMultiplePhotos,
        onMoveShouldSetPanResponder: (_, gs) => hasMultiplePhotos && Math.abs(gs.dx) > 15,
        onPanResponderRelease: (_, gs) => {
          if (gs.dx < -SWIPE_THRESHOLD) {
            navigatePhoto('next');
          } else if (gs.dx > SWIPE_THRESHOLD) {
            navigatePhoto('prev');
          }
        },
      }),
    [hasMultiplePhotos, navigatePhoto]
  );

  // Photo tap zones
  const handlePhotoTap = useCallback(
    (side: 'left' | 'right') => {
      navigatePhoto(side === 'left' ? 'prev' : 'next');
    },
    [navigatePhoto]
  );

  // Entry/Exit animations
  useEffect(() => {
    if (visible && match) {
      setCurrentPhotoIndex(0);
      setImageLoaded(false);

      if (reduceMotion) {
        backdropAnim.setValue(1);
        modalScaleAnim.setValue(1);
        modalOpacityAnim.setValue(1);
        return;
      }

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(modalScaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropAnim.setValue(0);
      modalScaleAnim.setValue(0.9);
      modalOpacityAnim.setValue(0);
    }
  }, [visible, match, reduceMotion]);

  // Handle close
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (reduceMotion) {
      onClose();
      return;
    }

    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(modalScaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [onClose, reduceMotion]);

  // Handle actions
  const handleMessage = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSendMessage();
  }, [onSendMessage]);

  const handleProfile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onViewProfile();
  }, [onViewProfile]);

  if (!visible || !match) return null;

  // ==========================================================================
  // RENDER: TABLET LANDSCAPE - Premium Cinematic Split View
  // ==========================================================================
  if (isHorizontalLayout) {
    const modalWidth = Math.min(1200, screenWidth * 0.92);
    const modalHeight = Math.min(720, screenHeight * 0.88);
    const photoWidth = modalWidth * 0.58;
    const infoWidth = modalWidth * 0.42;

    return (
      <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <View style={styles.container}>
          {/* Cinematic Backdrop */}
          <Animated.View style={[styles.backdrop, styles.backdropCinematic, { opacity: backdropAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          </Animated.View>

          {/* Modal Card */}
          <Animated.View
            style={[
              styles.modalHorizontal,
              {
                width: modalWidth,
                height: modalHeight,
                opacity: modalOpacityAnim,
                transform: [{ scale: modalScaleAnim }],
              },
            ]}
          >
            {/* === PHOTO SECTION (Left) === */}
            <View style={[styles.photoSectionH, { width: photoWidth }]} {...panResponder.panHandlers}>
              {/* Photo */}
              <Animated.View
                style={[
                  styles.photoWrapper,
                  {
                    opacity: photoFadeAnim,
                    transform: [{ scale: photoScaleAnim }],
                  },
                ]}
              >
                {currentPhoto ? (
                  <Image
                    source={{ uri: currentPhoto }}
                    style={styles.photoImage}
                    resizeMode="cover"
                    onLoad={() => setImageLoaded(true)}
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.gray[200], colors.gray[300]]}
                    style={styles.photoPlaceholder}
                  >
                    <Feather name="user" size={100} color={colors.gray[400]} />
                  </LinearGradient>
                )}
              </Animated.View>

              {/* Top Gradient for progress bars */}
              <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'transparent']}
                style={styles.topGradientH}
                pointerEvents="none"
              />

              {/* Progress Bars */}
              {hasMultiplePhotos && (
                <View style={styles.progressBarsH}>
                  <ProgressBars
                    total={photos.length}
                    current={currentPhotoIndex}
                    onSelect={setCurrentPhotoIndex}
                  />
                </View>
              )}

              {/* Navigation Arrows */}
              <NavArrow
                direction="left"
                visible={hasMultiplePhotos && currentPhotoIndex > 0}
                onPress={() => handlePhotoTap('left')}
              />
              <NavArrow
                direction="right"
                visible={hasMultiplePhotos && currentPhotoIndex < photos.length - 1}
                onPress={() => handlePhotoTap('right')}
              />

              {/* Photo Tap Zones (invisible) */}
              {hasMultiplePhotos && (
                <>
                  <Pressable style={[styles.tapZone, styles.tapZoneLeft]} onPress={() => handlePhotoTap('left')} />
                  <Pressable style={[styles.tapZone, styles.tapZoneRight]} onPress={() => handlePhotoTap('right')} />
                </>
              )}

              {/* Photo Counter */}
              <View style={styles.photoCounterH}>
                <PhotoCounterPill current={currentPhotoIndex} total={photos.length} />
              </View>

              {/* Online Badge on Photo */}
              {isOnline && (
                <View style={styles.onlineBadgePhoto}>
                  <View style={styles.onlineBadgePhotoInner}>
                    <View style={styles.onlineDotPhoto} />
                    <Text style={styles.onlineTextPhoto}>Online</Text>
                  </View>
                </View>
              )}
            </View>

            {/* === INFO SECTION (Right) === */}
            <View style={[styles.infoSectionH, { width: infoWidth }]}>
              {/* Header with Close Button */}
              <View style={styles.infoHeaderH}>
                <View style={styles.infoHeaderLeft}>
                  <Text style={styles.quickViewLabel}>Quick View</Text>
                </View>
                <CloseButton onPress={handleClose} variant="glass" size={40} />
              </View>

              {/* Scrollable Content */}
              <ScrollView
                style={styles.infoScrollH}
                contentContainerStyle={styles.infoScrollContentH}
                showsVerticalScrollIndicator={false}
              >
                {/* Name & Age Section */}
                <View style={styles.nameSectionH}>
                  <View style={styles.nameRowH}>
                    <Text style={styles.nameTextH} numberOfLines={1}>
                      {match.name}
                    </Text>
                    {match.isVerified && <VerifiedBadge size={26} />}
                  </View>
                  {match.age > 0 && (
                    <Text style={styles.ageTextH}>{match.age} years old</Text>
                  )}
                </View>

                {/* Location */}
                <View style={styles.locationRowH}>
                  <View style={styles.locationIconBg}>
                    <Feather name="map-pin" size={14} color={colors.orange[500]} />
                  </View>
                  <Text style={styles.locationTextH}>
                    {match.location || match.distance || 'Philippines'}
                  </Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGridH}>
                  <StatCard
                    icon="heart"
                    label="Matched"
                    value={match.matchedTime || formatTimeAgo(match.matchedAt)}
                    color={colors.romantic.pink}
                    bgColor={colors.romantic.blush}
                  />
                  <StatCard
                    icon="sparkles"
                    label="Compat."
                    value={`${compatibility}%`}
                    color={colors.teal[500]}
                    bgColor={colors.teal[50]}
                  />
                </View>

                {/* Bio Section */}
                {match.bio && (
                  <View style={styles.bioSectionH}>
                    <View style={styles.bioHeaderH}>
                      <Ionicons name="chatbubble-ellipses" size={16} color={colors.orange[500]} />
                      <Text style={styles.bioLabelH}>About {match.name}</Text>
                    </View>
                    <Text style={styles.bioTextH} numberOfLines={3}>
                      "{match.bio}"
                    </Text>
                  </View>
                )}

                {/* Interests Section */}
                <View style={styles.interestsSectionH}>
                  <View style={styles.interestsHeaderH}>
                    <Ionicons name="heart-circle" size={16} color={colors.romantic.pink} />
                    <Text style={styles.interestsLabelH}>Interests</Text>
                  </View>
                  <View style={styles.interestsRowH}>
                    {displayInterests.map((interest, idx) => (
                      <InterestTag key={idx} interest={interest} isShared={idx < 2} />
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons - Fixed at bottom */}
              <View style={styles.actionsH}>
                <TouchableOpacity
                  style={styles.primaryButtonH}
                  onPress={handleMessage}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[colors.orange[500], colors.orange[600]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name="chatbubble" size={20} color={colors.white} />
                  <Text style={styles.primaryButtonTextH}>Send Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButtonH}
                  onPress={handleProfile}
                  activeOpacity={0.8}
                >
                  <Feather name="user" size={18} color={colors.orange[600]} />
                  <Text style={styles.secondaryButtonTextH}>View Full Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ==========================================================================
  // RENDER: PORTRAIT / PHONE - Premium Floating Card Experience
  // ==========================================================================

  // Card dimensions - Premium floating card design
  const cardWidth = Math.min(screenWidth - 32, 420);
  const photoHeight = Math.min(screenHeight * 0.52, 480);

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.container}>
        {/* Premium Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Floating Card Modal */}
        <Animated.View
          style={[
            styles.modalCard,
            {
              width: cardWidth,
              opacity: modalOpacityAnim,
              transform: [{ scale: modalScaleAnim }],
            },
          ]}
        >
          {/* ====== PHOTO SECTION ====== */}
          <View style={[styles.photoSection, { height: photoHeight }]} {...panResponder.panHandlers}>
            {/* Photo */}
            <Animated.View
              style={[
                styles.photoWrapper,
                {
                  opacity: photoFadeAnim,
                  transform: [{ scale: photoScaleAnim }],
                },
              ]}
            >
              {currentPhoto ? (
                <Image
                  source={{ uri: currentPhoto }}
                  style={styles.photoImage}
                  resizeMode="cover"
                  onLoad={() => setImageLoaded(true)}
                />
              ) : (
                <LinearGradient
                  colors={[colors.gray[100], colors.gray[200]]}
                  style={styles.photoPlaceholder}
                >
                  <Feather name="user" size={80} color={colors.gray[400]} />
                </LinearGradient>
              )}
            </Animated.View>

            {/* Top Gradient for progress bars */}
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.25)', 'transparent']}
              style={styles.topGradient}
              pointerEvents="none"
            />

            {/* Progress Bars */}
            {hasMultiplePhotos && (
              <View style={[styles.progressBarsVertical, { top: insets.top > 20 ? 16 : 20 }]}>
                <ProgressBars
                  total={photos.length}
                  current={currentPhotoIndex}
                  onSelect={setCurrentPhotoIndex}
                />
              </View>
            )}

            {/* Close Button */}
            <View style={[styles.closeButtonPosition, { top: insets.top > 20 ? 12 : 16 }]}>
              <CloseButton onPress={handleClose} variant="blur" size={40} />
            </View>

            {/* Photo Counter */}
            {hasMultiplePhotos && (
              <View style={[styles.photoCounterVertical, { top: insets.top > 20 ? 18 : 22 }]}>
                <PhotoCounterPill current={currentPhotoIndex} total={photos.length} />
              </View>
            )}

            {/* Photo Tap Zones */}
            {hasMultiplePhotos && (
              <>
                <Pressable style={[styles.tapZone, styles.tapZoneLeft]} onPress={() => handlePhotoTap('left')} />
                <Pressable style={[styles.tapZone, styles.tapZoneRight]} onPress={() => handlePhotoTap('right')} />
              </>
            )}

            {/* Online Badge - Floating on photo */}
            {isOnline && (
              <View style={styles.onlineBadgeFloating}>
                <View style={styles.onlineBadgeInner}>
                  <View style={styles.onlineDotSmall} />
                  <Text style={styles.onlineTextSmall}>Online</Text>
                </View>
              </View>
            )}
          </View>

          {/* ====== INFO SECTION ====== */}
          <View style={styles.infoSection}>
            {/* Name Row */}
            <View style={styles.nameRowPortrait}>
              <View style={styles.nameAndAge}>
                <Text style={styles.nameTextPortrait} numberOfLines={1}>
                  {match.name}
                </Text>
                {match.age > 0 && (
                  <Text style={styles.ageTextPortrait}>, {match.age}</Text>
                )}
              </View>
              {match.isVerified && <VerifiedBadge />}
            </View>

            {/* Location */}
            <View style={styles.locationRowPortrait}>
              <Feather name="map-pin" size={15} color={colors.gray[400]} />
              <Text style={styles.locationTextPortrait}>
                {match.location || match.distance || 'Philippines'}
              </Text>
            </View>

            {/* Match Info Pills */}
            <View style={styles.infoPillsRow}>
              <View style={[styles.infoPill, { backgroundColor: colors.romantic.pinkLight }]}>
                <Ionicons name="heart" size={14} color={colors.romantic.pink} />
                <Text style={[styles.infoPillText, { color: colors.romantic.pinkDark }]}>
                  Matched {match.matchedTime || formatTimeAgo(match.matchedAt)}
                </Text>
              </View>
              <View style={[styles.infoPill, { backgroundColor: colors.teal[50] }]}>
                <Ionicons name="sparkles" size={14} color={colors.teal[500]} />
                <Text style={[styles.infoPillText, { color: colors.teal[600] }]}>
                  {compatibility}% Match
                </Text>
              </View>
            </View>
          </View>

          {/* ====== ACTION SECTION ====== */}
          <View style={styles.actionSection}>
            {/* Primary CTA - Send Message */}
            <TouchableOpacity
              style={styles.primaryButtonPortrait}
              onPress={handleMessage}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.orange[500], colors.orange[600]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="chatbubble" size={20} color={colors.white} />
              <Text style={styles.primaryButtonTextPortrait}>Send Message</Text>
            </TouchableOpacity>

            {/* Secondary CTA - View Profile */}
            <TouchableOpacity
              style={styles.secondaryButtonPortrait}
              onPress={handleProfile}
              activeOpacity={0.8}
            >
              <Feather name="user" size={18} color={colors.orange[500]} />
              <Text style={styles.secondaryButtonTextPortrait}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===================
  // Backdrop
  // ===================
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  backdropCinematic: {
    backgroundColor: 'rgba(0,0,0,0.92)',
  },

  // ===================
  // Progress Bars
  // ===================
  progressBarsContainer: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
  },
  progressBarTouch: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },

  // ===================
  // Close Button
  // ===================
  closeButton: {
    overflow: 'hidden',
    zIndex: 100,
  },
  closeButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButtonGlass: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  closeButtonSolid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 22,
  },

  // ===================
  // Navigation Arrows
  // ===================
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    zIndex: 20,
  },
  navArrowLeft: {
    left: 16,
  },
  navArrowRight: {
    right: 16,
  },
  navArrowBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // ===================
  // Online Badge
  // ===================
  onlineBadgeContainer: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  onlineBadgeContainerLarge: {
    marginBottom: 20,
  },
  onlinePulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: colors.teal[100],
    borderRadius: 20,
    opacity: 0.5,
  },
  onlinePulseRingLarge: {
    borderRadius: 24,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.teal[50],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.teal[200],
  },
  onlineBadgeLarge: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal[500],
  },
  onlineDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.teal[700],
  },
  onlineTextLarge: {
    fontSize: 15,
  },
  onlineBadgeFloating: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
  onlineBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
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
  // Online badge on photo (tablet)
  onlineBadgePhoto: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 15,
  },
  onlineBadgePhotoInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  onlineDotPhoto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal[500],
  },
  onlineTextPhoto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.teal[700],
  },

  // ===================
  // Verified Badge
  // ===================
  verifiedBadge: {
    marginLeft: 6,
  },

  // ===================
  // Photo Counter Pill
  // ===================
  photoCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  photoCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },

  // ===================
  // Stat Card (Tablet)
  // ===================
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  statCardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardContent: {
    flex: 1,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray[500],
    marginBottom: 2,
    flexShrink: 0,
  },
  statCardValue: {
    fontSize: 17,
    fontWeight: '700',
  },

  // ===================
  // Interest Tag
  // ===================
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  interestTagShared: {
    backgroundColor: colors.teal[50],
    borderWidth: 1,
    borderColor: colors.teal[200],
  },
  interestTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[600],
  },
  interestTagTextShared: {
    color: colors.teal[700],
  },

  // ===================
  // Tap Zones
  // ===================
  tapZone: {
    position: 'absolute',
    top: 60,
    bottom: 60,
    width: '30%',
  },
  tapZoneLeft: {
    left: 0,
  },
  tapZoneRight: {
    right: 0,
  },

  // ===================
  // Photo Common
  // ===================
  photoWrapper: {
    flex: 1,
    backgroundColor: colors.gray[200],
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===================
  // HORIZONTAL LAYOUT (Tablet Landscape)
  // ===================
  modalHorizontal: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 32,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 30 },
        shadowOpacity: 0.5,
        shadowRadius: 60,
      },
      android: {
        elevation: 30,
      },
    }),
  },
  photoSectionH: {
    position: 'relative',
    backgroundColor: colors.gray[900],
    overflow: 'hidden',
  },
  topGradientH: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 5,
  },
  progressBarsH: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 15,
  },
  photoCounterH: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    zIndex: 10,
  },
  infoSectionH: {
    backgroundColor: colors.white,
    paddingTop: 20,
    paddingBottom: 24,
  },
  infoHeaderH: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  infoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickViewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoScrollH: {
    flex: 1,
  },
  infoScrollContentH: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  nameSectionH: {
    marginBottom: 12,
  },
  nameRowH: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameTextH: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.5,
  },
  ageTextH: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.gray[500],
    marginTop: 4,
  },
  locationRowH: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  locationIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.orange[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTextH: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray[600],
  },
  statsGridH: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  bioSectionH: {
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  bioHeaderH: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  bioLabelH: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  bioTextH: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.gray[600],
    fontStyle: 'italic',
  },
  interestsSectionH: {
    marginBottom: 8,
  },
  interestsHeaderH: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  interestsLabelH: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  interestsRowH: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionsH: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  primaryButtonH: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[600],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  primaryButtonTextH: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryButtonH: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    gap: 8,
    backgroundColor: colors.orange[50],
    borderWidth: 1.5,
    borderColor: colors.orange[200],
  },
  secondaryButtonTextH: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.orange[600],
  },

  // ===================
  // PORTRAIT LAYOUT - Premium Floating Card
  // ===================
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 40,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  photoSection: {
    position: 'relative',
    backgroundColor: colors.gray[200],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 5,
  },
  progressBarsVertical: {
    position: 'absolute',
    left: 12,
    right: 56,
    zIndex: 15,
  },
  closeButtonPosition: {
    position: 'absolute',
    right: 12,
    zIndex: 100,
  },
  photoCounterVertical: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
  },

  // Info Section - Portrait
  infoSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  nameRowPortrait: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameAndAge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  nameTextPortrait: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  ageTextPortrait: {
    fontSize: 28,
    fontWeight: '500',
    color: colors.gray[500],
  },
  locationRowPortrait: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  locationTextPortrait: {
    fontSize: 15,
    color: colors.gray[500],
    fontWeight: '500',
  },
  infoPillsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  infoPillText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Action Section - Portrait
  actionSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  primaryButtonPortrait: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[600],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  primaryButtonTextPortrait: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },
  secondaryButtonPortrait: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    gap: 8,
    backgroundColor: colors.orange[50],
    borderWidth: 1.5,
    borderColor: colors.orange[200],
  },
  secondaryButtonTextPortrait: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.orange[600],
  },
});

export default QuickViewModal;
