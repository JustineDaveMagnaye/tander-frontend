/**
 * TANDER QuickViewModal - ULTRA PREMIUM Profile Quick View
 *
 * A stunning, photo-first modal for previewing MATCHED profiles.
 * Since users are already matched, we focus on:
 * - Message (primary action)
 * - View Full Profile (secondary action)
 *
 * DESIGN PHILOSOPHY:
 * - Photo is the HERO - immersive experience
 * - Glassmorphism floating info card
 * - Premium action buttons (Message + Profile only)
 * - Phone: Full-screen modal
 * - Tablet: Centered card with elegant proportions
 * - Multi-photo carousel with clear indicators
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
  Easing,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
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

const ANIMATION_DURATION = 300;
const SWIPE_THRESHOLD = 50;

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
// SUB-COMPONENT: Premium Close Button
// =============================================================================

const PremiumCloseButton: React.FC<{ onPress: () => void; isTablet?: boolean }> = ({
  onPress,
  isTablet = false
}) => (
  <TouchableOpacity
    style={[styles.closeButton, isTablet && styles.closeButtonTablet]}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityLabel="Close profile preview"
    accessibilityRole="button"
  >
    <BlurView intensity={80} tint="dark" style={styles.closeButtonBlur}>
      <Feather name="x" size={isTablet ? 24 : 22} color={colors.white} />
    </BlurView>
  </TouchableOpacity>
);

// =============================================================================
// SUB-COMPONENT: Photo Progress Bars (Instagram-style)
// =============================================================================

const PhotoProgressBars: React.FC<{
  total: number;
  current: number;
  onSelect: (index: number) => void;
}> = ({ total, current, onSelect }) => {
  if (total <= 1) return null;

  return (
    <View style={styles.progressBarsContainer}>
      {Array.from({ length: total }).map((_, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => {
            onSelect(i);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }}
          style={styles.progressBarTouchable}
          accessibilityLabel={`Photo ${i + 1} of ${total}`}
        >
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: i < current ? '100%' : i === current ? '100%' : '0%',
                  opacity: i === current ? 1 : i < current ? 0.7 : 0.4,
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
// SUB-COMPONENT: Photo Navigation Arrows
// =============================================================================

const PhotoNavArrows: React.FC<{
  showLeft: boolean;
  showRight: boolean;
  onLeft: () => void;
  onRight: () => void;
}> = ({ showLeft, showRight, onLeft, onRight }) => (
  <>
    {showLeft && (
      <TouchableOpacity
        style={[styles.navArrow, styles.navArrowLeft]}
        onPress={onLeft}
        activeOpacity={0.8}
        accessibilityLabel="Previous photo"
      >
        <View style={styles.navArrowBg}>
          <Feather name="chevron-left" size={24} color={colors.white} />
        </View>
      </TouchableOpacity>
    )}
    {showRight && (
      <TouchableOpacity
        style={[styles.navArrow, styles.navArrowRight]}
        onPress={onRight}
        activeOpacity={0.8}
        accessibilityLabel="Next photo"
      >
        <View style={styles.navArrowBg}>
          <Feather name="chevron-right" size={24} color={colors.white} />
        </View>
      </TouchableOpacity>
    )}
  </>
);

// =============================================================================
// SUB-COMPONENT: Online Status Badge
// =============================================================================

const OnlineStatusBadge: React.FC<{
  isOnline: boolean;
  pulseAnim: Animated.Value;
}> = ({ isOnline, pulseAnim }) => {
  if (!isOnline) return null;

  return (
    <View style={styles.onlineBadgeWrapper}>
      <Animated.View
        style={[
          styles.onlineGlow,
          {
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.4],
              outputRange: [0.6, 0],
            }),
          },
        ]}
      />
      <View style={styles.onlineBadge}>
        <View style={styles.onlineDot} />
        <Text style={styles.onlineText}>Online now</Text>
      </View>
    </View>
  );
};

// =============================================================================
// SUB-COMPONENT: Action Buttons (Message + Profile only - no Like since matched)
// =============================================================================

const ActionButtons: React.FC<{
  onMessage: () => void;
  onProfile: () => void;
  reduceMotion: boolean;
  isTablet: boolean;
}> = ({ onMessage, onProfile, reduceMotion, isTablet }) => {
  const messageScale = useRef(new Animated.Value(1)).current;
  const profileScale = useRef(new Animated.Value(1)).current;

  const animateButton = (anim: Animated.Value, callback: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    if (reduceMotion) {
      callback();
      return;
    }

    Animated.sequence([
      Animated.spring(anim, { toValue: 0.92, useNativeDriver: true, friction: 5 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();

    setTimeout(callback, 80);
  };

  const buttonHeight = isTablet ? 60 : 56;
  const iconSize = isTablet ? 22 : 20;
  const fontSize = isTablet ? 17 : 16;

  return (
    <View style={styles.actionButtonsContainer}>
      {/* Message Button - Primary */}
      <Animated.View style={[styles.messageButtonWrapper, { transform: [{ scale: messageScale }] }]}>
        <TouchableOpacity
          style={[styles.messageButton, { height: buttonHeight }]}
          onPress={() => animateButton(messageScale, onMessage)}
          activeOpacity={0.9}
          accessibilityLabel="Send message"
        >
          <LinearGradient
            colors={[colors.orange[500], colors.orange[600]]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Feather name="message-circle" size={iconSize} color={colors.white} />
          <Text style={[styles.messageButtonText, { fontSize }]}>Send Message</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Profile Button - Secondary */}
      <Animated.View style={[styles.profileButtonWrapper, { transform: [{ scale: profileScale }] }]}>
        <TouchableOpacity
          style={[styles.profileButton, { height: buttonHeight }]}
          onPress={() => animateButton(profileScale, onProfile)}
          activeOpacity={0.9}
          accessibilityLabel="View full profile"
        >
          <Feather name="user" size={iconSize} color={colors.gray[700]} />
          <Text style={[styles.profileButtonText, { fontSize }]}>Full Profile</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// =============================================================================
// SUB-COMPONENT: Glassmorphism Info Card
// =============================================================================

const GlassInfoCard: React.FC<{
  match: Match;
  isOnline: boolean;
  pulseAnim: Animated.Value;
  compatibility: number;
  isTablet: boolean;
}> = ({ match, isOnline, pulseAnim, compatibility, isTablet }) => {
  const nameFontSize = isTablet ? 30 : 26;
  const metaFontSize = isTablet ? 16 : 15;

  const interests = match.interests?.slice(0, 3) || [];

  return (
    <View style={[styles.glassCardContainer, isTablet && styles.glassCardContainerTablet]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 100}
        tint="light"
        style={styles.glassCard}
      >
        <View style={[styles.glassCardInner, isTablet && styles.glassCardInnerTablet]}>
          {/* Name Row with Compatibility */}
          <View style={styles.nameRow}>
            <View style={styles.nameSection}>
              <Text style={[styles.nameText, { fontSize: nameFontSize }]} numberOfLines={1}>
                {match.name}{match.age > 0 ? `, ${match.age}` : ''}
              </Text>
              {match.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Feather name="check" size={12} color={colors.white} />
                </View>
              )}
            </View>

            <View style={styles.compatBadge}>
              <Ionicons name="heart" size={14} color={colors.teal[500]} />
              <Text style={styles.compatText}>{compatibility}%</Text>
            </View>
          </View>

          {/* Location + Match Time */}
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={14} color={colors.gray[500]} />
            <Text style={[styles.metaText, { fontSize: metaFontSize }]} numberOfLines={1}>
              {match.location || match.distance || 'Philippines'}
            </Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={[styles.metaText, { fontSize: metaFontSize - 1 }]}>
              Matched {match.matchedTime || formatTimeAgo(match.matchedAt)}
            </Text>
          </View>

          {/* Online Status */}
          <OnlineStatusBadge isOnline={isOnline} pulseAnim={pulseAnim} />

          {/* Bio Preview */}
          {match.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioText} numberOfLines={2}>
                "{match.bio}"
              </Text>
            </View>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <View style={styles.interestsRow}>
              {interests.map((interest, idx) => (
                <View key={idx} style={styles.interestChip}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </BlurView>
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
  const { width: screenWidth, height: screenHeight, isTablet, isLandscape } = useResponsive();

  // State
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Animation refs
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const photoFadeAnim = useRef(new Animated.Value(1)).current;

  // Calculate modal dimensions for tablet
  const modalDimensions = useMemo(() => {
    if (!isTablet) {
      return { width: screenWidth, height: screenHeight, isFullScreen: true };
    }

    // Tablet: Centered card with elegant proportions
    const maxWidth = isLandscape ? 550 : 480;
    const maxHeight = isLandscape ? screenHeight * 0.85 : screenHeight * 0.8;
    const aspectRatio = 0.7; // Width to height ratio for portrait-style card

    let cardWidth = Math.min(maxWidth, screenWidth * 0.6);
    let cardHeight = cardWidth / aspectRatio;

    if (cardHeight > maxHeight) {
      cardHeight = maxHeight;
      cardWidth = cardHeight * aspectRatio;
    }

    return {
      width: cardWidth,
      height: cardHeight,
      isFullScreen: false,
    };
  }, [isTablet, isLandscape, screenWidth, screenHeight]);

  // Get photos array
  const photos = useMemo(() => {
    if (!match) return [];
    const list: string[] = [];
    if (match.images?.length) list.push(...match.images.filter(Boolean));
    else if (match.image) list.push(match.image);
    else if (match.photoUrl) list.push(match.photoUrl);
    return list;
  }, [match]);

  // Compatibility percentage
  const compatibility = useMemo(() => {
    if (!match?.id) return 78;
    const hash = match.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return 65 + (hash % 31);
  }, [match?.id]);

  // Swipe gesture for photo carousel
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => photos.length > 1,
        onMoveShouldSetPanResponder: (_, gs) => photos.length > 1 && Math.abs(gs.dx) > 10,
        onPanResponderRelease: (_, gs) => {
          if (gs.dx < -SWIPE_THRESHOLD && currentPhotoIndex < photos.length - 1) {
            setCurrentPhotoIndex(prev => prev + 1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          } else if (gs.dx > SWIPE_THRESHOLD && currentPhotoIndex > 0) {
            setCurrentPhotoIndex(prev => prev - 1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        },
      }),
    [photos.length, currentPhotoIndex]
  );

  // Photo navigation handlers
  const handlePrevPhoto = useCallback(() => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentPhotoIndex]);

  const handleNextPhoto = useCallback(() => {
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentPhotoIndex, photos.length]);

  // Photo transition animation
  useEffect(() => {
    if (reduceMotion) return;

    photoFadeAnim.setValue(0.7);
    Animated.timing(photoFadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [currentPhotoIndex, reduceMotion]);

  // Entry/Exit animations
  useEffect(() => {
    if (visible && match) {
      setCurrentPhotoIndex(0);

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
          tension: 50,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();

      AccessibilityInfo.announceForAccessibility(
        `Viewing ${match.name}'s profile. ${photos.length} photo${photos.length !== 1 ? 's' : ''} available.`
      );
    } else {
      backdropAnim.setValue(0);
      modalAnim.setValue(0);
    }
  }, [visible, match, reduceMotion, photos.length]);

  // Online pulse animation
  useEffect(() => {
    if (!visible || !isOnline || reduceMotion) {
      pulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [visible, isOnline, reduceMotion]);

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
        useNativeDriver: true,
      }),
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [onClose, reduceMotion]);

  if (!visible || !match) return null;

  const currentPhoto = photos[currentPhotoIndex] || '';
  const hasMultiplePhotos = photos.length > 1;

  // Modal animation styles
  const modalAnimStyle = modalDimensions.isFullScreen
    ? {
        opacity: modalAnim,
        transform: [
          {
            translateY: modalAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0],
            }),
          },
        ],
      }
    : {
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

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, isTablet ? 0.7 : 0.9],
              }),
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Modal Content */}
        <View style={[styles.modalWrapper, !modalDimensions.isFullScreen && styles.modalWrapperCentered]}>
          <Animated.View
            style={[
              styles.modalCard,
              modalDimensions.isFullScreen
                ? styles.modalCardFullScreen
                : [
                    styles.modalCardCentered,
                    {
                      width: modalDimensions.width,
                      height: modalDimensions.height,
                    },
                  ],
              modalAnimStyle,
            ]}
          >
            {/* Photo Section */}
            <View style={styles.photoSection} {...panResponder.panHandlers}>
              {/* Photo */}
              <Animated.View style={[styles.photoWrapper, { opacity: photoFadeAnim }]}>
                {currentPhoto ? (
                  <Image
                    source={{ uri: currentPhoto }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.gray[200], colors.gray[300]]}
                    style={[styles.photo, styles.photoPlaceholder]}
                  >
                    <Feather name="user" size={80} color={colors.gray[400]} />
                  </LinearGradient>
                )}
              </Animated.View>

              {/* Top Gradient */}
              <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'transparent']}
                style={styles.topGradient}
                pointerEvents="none"
              />

              {/* Bottom Gradient */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.bottomGradient}
                pointerEvents="none"
              />

              {/* Progress Bars */}
              <View style={[styles.progressBarsWrapper, { top: insets.top + 16 }]}>
                <PhotoProgressBars
                  total={photos.length}
                  current={currentPhotoIndex}
                  onSelect={setCurrentPhotoIndex}
                />
              </View>

              {/* Photo Counter Badge */}
              {hasMultiplePhotos && (
                <View style={[styles.photoCounterBadge, { top: insets.top + 16 }]}>
                  <Text style={styles.photoCounterText}>
                    {currentPhotoIndex + 1}/{photos.length}
                  </Text>
                </View>
              )}

              {/* Close Button */}
              <View style={[styles.closeButtonWrapper, { top: insets.top + 12 }]}>
                <PremiumCloseButton onPress={handleClose} isTablet={isTablet} />
              </View>

              {/* Navigation Arrows (visible on tablet or when hovering) */}
              {hasMultiplePhotos && (
                <PhotoNavArrows
                  showLeft={currentPhotoIndex > 0}
                  showRight={currentPhotoIndex < photos.length - 1}
                  onLeft={handlePrevPhoto}
                  onRight={handleNextPhoto}
                />
              )}

              {/* Tap Zones for Navigation */}
              {hasMultiplePhotos && (
                <>
                  <Pressable style={styles.tapZoneLeft} onPress={handlePrevPhoto} />
                  <Pressable style={styles.tapZoneRight} onPress={handleNextPhoto} />
                </>
              )}

              {/* Glass Info Card - Positioned over photo bottom */}
              <View style={styles.infoCardWrapper}>
                <GlassInfoCard
                  match={match}
                  isOnline={isOnline}
                  pulseAnim={pulseAnim}
                  compatibility={compatibility}
                  isTablet={isTablet}
                />
              </View>
            </View>

            {/* Action Buttons - Below photo section */}
            <View
              style={[
                styles.actionButtonsWrapper,
                {
                  paddingBottom: modalDimensions.isFullScreen
                    ? Math.max(insets.bottom, 16) + 8
                    : 20,
                },
              ]}
            >
              <ActionButtons
                onMessage={onSendMessage}
                onProfile={onViewProfile}
                reduceMotion={reduceMotion}
                isTablet={isTablet}
              />
            </View>
          </Animated.View>
        </View>
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
  },

  // Modal Wrapper
  modalWrapper: {
    flex: 1,
  },
  modalWrapperCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Card
  modalCard: {
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  modalCardFullScreen: {
    flex: 1,
  },
  modalCardCentered: {
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: {
        elevation: 24,
      },
    }),
  },

  // Photo Section
  photoSection: {
    flex: 1,
    backgroundColor: colors.gray[900],
    position: 'relative',
  },
  photoWrapper: {
    flex: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Gradients
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
  },

  // Progress Bars
  progressBarsWrapper: {
    position: 'absolute',
    left: 16,
    right: 70,
    zIndex: 20,
  },
  progressBarsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  progressBarTouchable: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 2,
  },

  // Photo Counter
  photoCounterBadge: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    zIndex: 20,
  },
  photoCounterText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },

  // Close Button
  closeButtonWrapper: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  closeButtonTablet: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  closeButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // Navigation Arrows
  navArrow: {
    position: 'absolute',
    top: '45%',
    zIndex: 25,
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  navArrowBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tap Zones
  tapZoneLeft: {
    position: 'absolute',
    left: 0,
    top: 120,
    bottom: 200,
    width: '25%',
  },
  tapZoneRight: {
    position: 'absolute',
    right: 0,
    top: 120,
    bottom: 200,
    width: '25%',
  },

  // Glass Info Card
  infoCardWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 30,
  },
  glassCardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  glassCardContainerTablet: {
    borderRadius: 24,
  },
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  glassCardInner: {
    padding: 16,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.88)',
  },
  glassCardInnerTablet: {
    padding: 20,
  },

  // Name Row
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  nameText: {
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.teal[500],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Compatibility Badge
  compatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.teal[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.teal[200],
  },
  compatText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.teal[600],
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  metaText: {
    color: colors.gray[600],
    fontWeight: '500',
  },
  dotSeparator: {
    fontSize: 10,
    color: colors.gray[400],
  },

  // Online Badge
  onlineBadgeWrapper: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  onlineGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.teal[400],
    borderRadius: 14,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.teal[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  onlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },

  // Bio Section
  bioSection: {
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  bioText: {
    fontSize: 14,
    color: colors.gray[700],
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Interests
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: colors.orange[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.orange[200],
  },
  interestText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.orange[600],
  },

  // Action Buttons
  actionButtonsWrapper: {
    backgroundColor: colors.white,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  messageButtonWrapper: {
    flex: 1.3,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    gap: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  messageButtonText: {
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },
  profileButtonWrapper: {
    flex: 1,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    gap: 8,
    backgroundColor: colors.gray[100],
    borderWidth: 1.5,
    borderColor: colors.gray[200],
  },
  profileButtonText: {
    fontWeight: '600',
    color: colors.gray[700],
  },
});

export default QuickViewModal;
