/**
 * TANDER Discovery Screen
 * Premium, accessible dating experience for Filipino Seniors (60+)
 *
 * Features:
 * - Smooth 60fps swipe animations with native driver
 * - Fully responsive: phones, tablets, landscape/portrait
 * - Senior-friendly: 56-64px touch targets, 18px+ fonts
 * - WCAG AA accessible: 4.5:1 contrast minimum
 * - Enhanced ProfileModal with photo carousel, story, interests
 */

import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  memo,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Animated,
  PanResponder,
  Modal,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks';
import { TanderLogoIcon } from '@shared/components/icons';
import { useDiscovery } from '../hooks/useDiscovery';
import { useStoryCommentsStore } from '@/store/storyCommentsStore';
import type { Profile } from '@services/api/discoveryApi';
import type { MainTabParamList, MessagesStackParamList } from '@navigation/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const SWIPE_THRESHOLD = 0.25;
const SWIPE_OUT_DURATION = 250;
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=F97316&color=fff&size=400&bold=true&name=';

// Senior-friendly sizing constants (WCAG AAA + design system compliance)
const TOUCH_TARGET_MINIMUM = 56;      // Comfortable touch target for seniors
const TOUCH_TARGET_COMFORTABLE = 64;  // Primary actions
const FONT_SIZE_MINIMUM = 16;         // Minimum readable font size
const FONT_SIZE_BODY = 18;            // Body text minimum
const LINE_HEIGHT_MULTIPLIER = 1.5;   // WCAG recommended line height

// ============================================================================
// HELPERS
// ============================================================================

const getImageUri = (profile: Profile): string => {
  if (profile.image?.trim()) return profile.image;
  return `${DEFAULT_AVATAR}${encodeURIComponent(profile.name || 'User')}`;
};

const triggerHaptic = async (type: 'light' | 'medium' | 'success' = 'medium') => {
  try {
    if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(
        type === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
      );
    }
  } catch {}
};

// ============================================================================
// SWIPE STAMP - Visual feedback overlay
// ============================================================================

interface StampProps {
  type: 'like' | 'nope';
  opacity: Animated.AnimatedInterpolation<number>;
}

const SwipeStamp = memo<StampProps>(({ type, opacity }) => {
  const isLike = type === 'like';

  return (
    <Animated.View
      style={[
        styles.stamp,
        isLike ? styles.stampLeft : styles.stampRight,
        { opacity },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.stampInner, { borderColor: isLike ? colors.teal[500] : '#FF5A5F' }]}>
        <Text style={[styles.stampText, { color: isLike ? colors.teal[500] : '#FF5A5F' }]}>
          {isLike ? 'LIKE' : 'NOPE'}
        </Text>
      </View>
    </Animated.View>
  );
});

SwipeStamp.displayName = 'SwipeStamp';

// ============================================================================
// PROFILE CARD - Swipeable card component
// ============================================================================

interface CardProps {
  profile: Profile;
  isTop: boolean;
  style: object;
  panHandlers: object;
  width: number;
  height: number;
  likeOpacity: Animated.AnimatedInterpolation<number>;
  nopeOpacity: Animated.AnimatedInterpolation<number>;
  onViewProfile: () => void;
}

const ProfileCard = memo<CardProps>(({
  profile,
  isTop,
  style,
  panHandlers,
  width,
  height,
  likeOpacity,
  nopeOpacity,
  onViewProfile,
}) => {
  const imageUri = getImageUri(profile);
  const name = profile.name || 'Unknown';
  const age = profile.age > 0 && profile.age < 120 ? profile.age : null;
  const location = profile.location || 'Philippines';

  // Responsive sizing based on card dimensions
  // Very compact: height < 300 (landscape phones)
  // Compact: height < 400 (small phones portrait)
  // Normal: height >= 400
  const isVeryCompact = height < 300;
  const isCompact = height < 400;

  // Scale font sizes based on available space
  const nameSize = isVeryCompact ? 22 : (isCompact ? 26 : 34);
  const ageSize = isVeryCompact ? 18 : (isCompact ? 20 : 26);
  const locationSize = isVeryCompact ? 14 : (isCompact ? 15 : 18);
  const tagFontSize = isVeryCompact ? 12 : (isCompact ? 13 : 15);

  return (
    <Animated.View
      style={[styles.card, { width, height }, style]}
      {...(isTop ? panHandlers : {})}
    >
      {/* Profile Photo */}
      <Image
        source={{ uri: imageUri }}
        style={styles.cardImage}
        resizeMode="cover"
        accessibilityLabel={`Photo of ${name}`}
      />

      {/* Gradient overlay for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        locations={[0.4, 0.75, 1]}
        style={styles.cardGradient}
      />

      {/* Verified badge */}
      {profile.verified && (
        <View style={styles.verifiedBadge} accessibilityLabel="Verified profile">
          <Feather name="check-circle" size={14} color="#fff" />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      )}

      {/* Online indicator */}
      {profile.online && (
        <View style={styles.onlineBadge} accessibilityLabel="Currently online">
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      )}

      {/* Swipe stamps */}
      {isTop && (
        <>
          <SwipeStamp type="like" opacity={likeOpacity} />
          <SwipeStamp type="nope" opacity={nopeOpacity} />
        </>
      )}

      {/* Profile info overlay */}
      <View style={[
        styles.cardInfo,
        isCompact && styles.cardInfoCompact,
        isVeryCompact && styles.cardInfoVeryCompact,
      ]}>
        {/* Name & Age */}
        <View style={styles.nameRow}>
          <Text
            style={[styles.nameText, { fontSize: nameSize }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {name}
          </Text>
          {age && (
            <Text style={[styles.ageText, { fontSize: ageSize }]}>{age}</Text>
          )}
        </View>

        {/* Location - hide on very compact */}
        {!isVeryCompact && (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={locationSize} color={colors.orange[400]} />
            <Text style={[styles.locationText, { fontSize: locationSize }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}

        {/* Interests preview - hide on very compact, show max 2 on compact */}
        {!isVeryCompact && profile.interests && profile.interests.length > 0 && (
          <View style={styles.tagsRow}>
            {profile.interests.slice(0, isCompact ? 2 : 3).map((interest, i) => (
              <View key={i} style={[styles.tag, isCompact && styles.tagCompact]}>
                <Text style={[styles.tagText, { fontSize: tagFontSize }]}>{interest}</Text>
              </View>
            ))}
            {profile.interests.length > (isCompact ? 2 : 3) && (
              <View style={[styles.tag, styles.tagMore, isCompact && styles.tagCompact]}>
                <Text style={[styles.tagText, { fontSize: tagFontSize }]}>
                  +{profile.interests.length - (isCompact ? 2 : 3)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* View Full Profile button - responsive sizing */}
        <TouchableOpacity
          style={[
            styles.viewProfileBtn,
            isCompact && styles.viewProfileBtnCompact,
            isVeryCompact && styles.viewProfileBtnVeryCompact,
          ]}
          onPress={onViewProfile}
          activeOpacity={0.8}
          accessibilityLabel="View full profile"
          accessibilityRole="button"
          accessibilityHint="Opens detailed profile view"
        >
          <Feather name="user" size={isVeryCompact ? 16 : 20} color="#fff" />
          <Text style={[styles.viewProfileText, isVeryCompact && { fontSize: 14 }]}>
            {isVeryCompact ? 'View Profile' : 'View Full Profile'}
          </Text>
          <Feather name="chevron-right" size={isVeryCompact ? 16 : 20} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

ProfileCard.displayName = 'ProfileCard';

// ============================================================================
// ACTION BUTTONS - Pass/Like/Undo buttons
// ============================================================================

interface ActionButtonProps {
  icon: 'x' | 'heart' | 'star';
  color: string;
  bgColor: string;
  size: number;
  onPress: () => void;
  disabled?: boolean;
  label: string;
  labelColor?: string;
  isPrimary?: boolean;
}

const ActionButton = memo<ActionButtonProps>(({
  icon,
  color,
  bgColor,
  size,
  onPress,
  disabled,
  label,
  labelColor,
  isPrimary,
}) => {
  const handlePress = useCallback(() => {
    if (!disabled) {
      triggerHaptic(isPrimary ? 'success' : 'medium');
      onPress();
    }
  }, [disabled, isPrimary, onPress]);

  // Use labelColor if provided, otherwise use icon color (but not white)
  const textColor = labelColor || (color === '#fff' ? (isPrimary ? colors.teal[500] : color) : color);

  return (
    <View style={styles.actionBtnWrapper}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={[
          styles.actionBtn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
            opacity: disabled ? 0.5 : 1,
          },
          isPrimary && styles.actionBtnPrimary,
        ]}
      >
        <Feather name={icon} size={size * 0.45} color={color} />
      </TouchableOpacity>
      <Text style={[styles.actionLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
});

ActionButton.displayName = 'ActionButton';

interface ActionButtonsContainerProps {
  onPass: () => void;
  onLike: () => void;
  onUndo: () => void;
  disabled: boolean;
  canUndo: boolean;
  isTablet?: boolean;
  isLandscape?: boolean;
  isSmallPhone?: boolean;
}

const ActionButtonsContainer = memo<ActionButtonsContainerProps>(({
  onPass,
  onLike,
  onUndo,
  disabled,
  canUndo,
  isTablet = false,
  isLandscape = false,
  isSmallPhone = false,
}) => {
  // Responsive button sizes based on device and orientation
  // Landscape phones need smaller buttons to fit in limited height
  // Small phones need slightly smaller buttons to avoid overflow
  const buttonSize = useMemo(() => {
    if (isTablet) return 72;
    if (isLandscape) return 56; // Smaller in landscape
    if (isSmallPhone) return 56; // Smaller on small phones
    return 64;
  }, [isTablet, isLandscape, isSmallPhone]);

  const undoSize = useMemo(() => {
    if (isTablet) return 56;
    if (isLandscape) return 44; // Smaller in landscape
    if (isSmallPhone) return 44; // Smaller on small phones
    return 52;
  }, [isTablet, isLandscape, isSmallPhone]);

  return (
    <View style={[
      styles.actionsContainer,
      isLandscape && !isTablet && styles.actionsContainerLandscape,
      isSmallPhone && !isLandscape && styles.actionsContainerSmallPhone,
    ]}>
      {/* Pass button */}
      <ActionButton
        icon="x"
        color="#FF5A5F"
        bgColor="#fff"
        size={buttonSize}
        onPress={onPass}
        disabled={disabled}
        label="Pass"
      />

      {/* Undo button */}
      <View style={styles.actionBtnWrapper}>
        <TouchableOpacity
          style={[
            styles.undoBtn,
            { width: undoSize, height: undoSize, borderRadius: undoSize / 2 },
            (!canUndo || disabled) && styles.undoBtnDisabled
          ]}
          onPress={onUndo}
          disabled={!canUndo || disabled}
          activeOpacity={0.7}
          accessibilityLabel="Undo last action"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canUndo || disabled }}
        >
          <Feather
            name="rotate-ccw"
            size={isLandscape && !isTablet ? 22 : 24}
            color={canUndo ? colors.orange[500] : colors.gray[400]}
          />
        </TouchableOpacity>
        <Text style={[
          styles.actionLabel,
          { color: canUndo ? colors.orange[500] : colors.gray[400] },
          isLandscape && !isTablet && styles.actionLabelLandscape,
        ]}>Back</Text>
      </View>

      {/* Like button */}
      <ActionButton
        icon="heart"
        color="#fff"
        bgColor={colors.teal[500]}
        size={buttonSize}
        onPress={onLike}
        disabled={disabled}
        label="Like"
        isPrimary
      />
    </View>
  );
});

ActionButtonsContainer.displayName = 'ActionButtonsContainer';

// ============================================================================
// LOADING STATE
// ============================================================================

const LoadingState = memo<{ width: number; height: number }>(({ width, height }) => (
  <View style={[styles.loadingCard, { width, height }]}>
    <ActivityIndicator size="large" color={colors.orange[500]} />
    <Text style={styles.loadingText}>Finding matches...</Text>
  </View>
));

LoadingState.displayName = 'LoadingState';

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  isError: boolean;
  onRetry: () => void;
  message?: string;
}

const EmptyState = memo<EmptyStateProps>(({ isError, onRetry, message }) => (
  <View style={styles.emptyState}>
    <View style={[styles.emptyIcon, isError && styles.emptyIconError]}>
      <Feather
        name={isError ? 'wifi-off' : 'heart'}
        size={48}
        color={isError ? '#FF5A5F' : colors.orange[400]}
      />
    </View>
    <Text style={styles.emptyTitle} accessibilityRole="header">
      {isError ? 'Connection Issue' : 'All Caught Up!'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {isError
        ? message || 'Please check your connection and try again'
        : 'Check back soon for new people nearby'}
    </Text>
    <TouchableOpacity
      style={styles.emptyBtn}
      onPress={onRetry}
      activeOpacity={0.8}
      accessibilityLabel={isError ? 'Try again' : 'Refresh profiles'}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[colors.orange[500], colors.orange[600]]}
        style={styles.emptyBtnGradient}
      >
        <Feather name="refresh-cw" size={20} color="#fff" />
        <Text style={styles.emptyBtnText}>
          {isError ? 'Try Again' : 'Refresh'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
));

EmptyState.displayName = 'EmptyState';

// ============================================================================
// MATCH MODAL
// ============================================================================

interface MatchModalProps {
  visible: boolean;
  name: string;
  photo: string | null;
  onClose: () => void;
  onMessage: () => void;
}

const MatchModal = memo<MatchModalProps>(({
  visible,
  name,
  photo,
  onClose,
  onMessage,
}) => {
  const { isTablet } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={[colors.orange[500], colors.teal[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.modalContent, isTablet && styles.modalContentTablet]}
        >
          <Feather name="heart" size={isTablet ? 64 : 48} color="#fff" style={styles.modalHeart} />

          <Text style={[styles.modalTitle, isTablet && { fontSize: 36 }]}>It's a Match!</Text>
          <Text style={[styles.modalSubtitle, isTablet && { fontSize: 20 }]}>
            You and {name} liked each other
          </Text>

          {photo ? (
            <Image
              source={{ uri: photo }}
              style={[styles.modalAvatar, isTablet && styles.modalAvatarTablet]}
              accessibilityLabel={`Photo of ${name}`}
            />
          ) : (
            <View style={[styles.modalAvatar, styles.modalAvatarPlaceholder, isTablet && styles.modalAvatarTablet]}>
              <Text style={styles.modalInitial}>{name.charAt(0)}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, isTablet && styles.modalPrimaryBtnTablet]}
            onPress={onMessage}
            activeOpacity={0.9}
            accessibilityLabel={`Send message to ${name}`}
            accessibilityRole="button"
          >
            <Feather name="message-circle" size={isTablet ? 28 : 22} color={colors.orange[500]} />
            <Text style={[styles.modalPrimaryText, isTablet && { fontSize: 20 }]}>Say Hello!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalSecondaryBtn}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="Continue swiping"
            accessibilityRole="button"
          >
            <Text style={[styles.modalSecondaryText, isTablet && { fontSize: 18 }]}>Keep Swiping</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
});

MatchModal.displayName = 'MatchModal';

// ============================================================================
// PHOTO CAROUSEL - Premium swipeable photo gallery with smooth animations
// ============================================================================

interface PhotoCarouselProps {
  photos: string[];
  defaultPhoto: string;
  width: number;
  height: number;
  onPhotoChange?: (index: number) => void;
  showVerifiedBadge?: boolean;
  showOnlineBadge?: boolean;
  isTablet?: boolean;
}

const PhotoCarousel = memo<PhotoCarouselProps>(({
  photos,
  defaultPhoto,
  width,
  height,
  onPhotoChange,
  showVerifiedBadge = false,
  showOnlineBadge = false,
  isTablet = false,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Animated values for premium transitions
  const progressAnimations = useRef<Animated.Value[]>([]).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Build unique photos array
  const allPhotos = useMemo(() => {
    const photoList: string[] = [];
    if (defaultPhoto) photoList.push(defaultPhoto);
    if (photos && photos.length > 0) {
      photos.forEach(p => {
        if (p && !photoList.includes(p)) photoList.push(p);
      });
    }
    return photoList.length > 0 ? photoList : [defaultPhoto];
  }, [photos, defaultPhoto]);

  // Initialize progress animations for each photo
  useEffect(() => {
    while (progressAnimations.length < allPhotos.length) {
      progressAnimations.push(new Animated.Value(progressAnimations.length === 0 ? 1 : 0));
    }
  }, [allPhotos.length, progressAnimations]);

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeInAnim, scaleAnim]);

  // Animate progress indicators when index changes
  useEffect(() => {
    progressAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: index === activeIndex ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
  }, [activeIndex, progressAnimations]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== activeIndex && index >= 0 && index < allPhotos.length) {
      setActiveIndex(index);
      onPhotoChange?.(index);
      triggerHaptic('light');
    }
  }, [width, activeIndex, allPhotos.length, onPhotoChange]);

  const goToPhoto = useCallback((index: number) => {
    if (index < 0 || index >= allPhotos.length) return;
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
    triggerHaptic('light');
  }, [allPhotos.length]);

  // Handle tap on left/right side of image to navigate
  const handleImageTap = useCallback((tapX: number) => {
    const isLeftTap = tapX < width * 0.3;
    const isRightTap = tapX > width * 0.7;

    if (isLeftTap && activeIndex > 0) {
      goToPhoto(activeIndex - 1);
    } else if (isRightTap && activeIndex < allPhotos.length - 1) {
      goToPhoto(activeIndex + 1);
    }
  }, [width, activeIndex, allPhotos.length, goToPhoto]);

  const renderPhoto = useCallback(({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      activeOpacity={1}
      onPress={(e) => handleImageTap(e.nativeEvent.locationX)}
      style={{ width, height }}
      accessibilityLabel={`Photo ${index + 1} of ${allPhotos.length}. Tap left or right side to navigate.`}
    >
      <Image
        source={{ uri: item }}
        style={{ width, height }}
        resizeMode="cover"
      />
      {/* Subtle gradient overlay for better badge visibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.4)']}
        locations={[0, 0.15, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
    </TouchableOpacity>
  ), [width, height, allPhotos.length, handleImageTap]);

  // Single photo - no carousel needed
  if (allPhotos.length === 1) {
    return (
      <Animated.View
        style={{
          width,
          height,
          opacity: fadeInAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Image
          source={{ uri: allPhotos[0] }}
          style={{ width, height }}
          resizeMode="cover"
          accessibilityLabel="Profile photo"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.4)']}
          locations={[0, 0.15, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        {/* Verified badge */}
        {showVerifiedBadge && (
          <View style={[styles.carouselVerifiedBadge, isTablet && styles.carouselVerifiedBadgeTablet]}>
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.carouselBadgeGradient}
            >
              <Feather name="check-circle" size={isTablet ? 18 : 14} color="#fff" />
              <Text style={[styles.carouselBadgeText, isTablet && { fontSize: 16 }]}>Verified</Text>
            </LinearGradient>
          </View>
        )}
        {/* Online badge */}
        {showOnlineBadge && (
          <View style={[styles.carouselOnlineBadge, isTablet && styles.carouselOnlineBadgeTablet]}>
            <View style={styles.carouselOnlineDot} />
            <Text style={[styles.carouselOnlineText, isTablet && { fontSize: 16 }]}>Online</Text>
          </View>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={{
        width,
        height,
        opacity: fadeInAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Animated.FlatList
        ref={flatListRef}
        data={allPhotos}
        renderItem={renderPhoto}
        keyExtractor={(_, index) => `photo-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true, listener: handleScroll }
        )}
        scrollEventThrottle={16}
        bounces={false}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      {/* Premium animated progress bars */}
      <View style={[styles.progressBarContainer, isTablet && styles.progressBarContainerTablet]}>
        {allPhotos.map((_, index) => {
          const animatedWidth = progressAnimations[index]?.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }) || '0%';

          return (
            <TouchableOpacity
              key={`progress-${index}`}
              onPress={() => goToPhoto(index)}
              style={[styles.progressBarTouchable, isTablet && styles.progressBarTouchableTablet]}
              activeOpacity={0.7}
              accessibilityLabel={`Go to photo ${index + 1} of ${allPhotos.length}`}
              accessibilityRole="button"
              accessibilityState={{ selected: index === activeIndex }}
            >
              <View style={[styles.progressBar, isTablet && styles.progressBarTablet]}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: animatedWidth },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Enhanced photo counter badge with gradient */}
      <View style={[styles.photoCounter, isTablet && styles.photoCounterTablet]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)']}
          style={styles.photoCounterGradient}
        >
          <Feather name="image" size={isTablet ? 18 : 16} color="#fff" />
          <Text style={[styles.photoCounterText, isTablet && { fontSize: 17 }]}>
            {activeIndex + 1} / {allPhotos.length}
          </Text>
        </LinearGradient>
      </View>

      {/* Verified badge */}
      {showVerifiedBadge && (
        <View style={[styles.carouselVerifiedBadge, isTablet && styles.carouselVerifiedBadgeTablet]}>
          <LinearGradient
            colors={['#22C55E', '#16A34A']}
            style={styles.carouselBadgeGradient}
          >
            <Feather name="check-circle" size={isTablet ? 18 : 14} color="#fff" />
            <Text style={[styles.carouselBadgeText, isTablet && { fontSize: 16 }]}>Verified</Text>
          </LinearGradient>
        </View>
      )}

      {/* Online badge */}
      {showOnlineBadge && (
        <View style={[styles.carouselOnlineBadge, isTablet && styles.carouselOnlineBadgeTablet]}>
          <View style={styles.carouselOnlineDot} />
          <Text style={[styles.carouselOnlineText, isTablet && { fontSize: 16 }]}>Online</Text>
        </View>
      )}

      {/* Premium navigation arrows with glassmorphism */}
      {allPhotos.length > 1 && (
        <>
          {activeIndex > 0 && (
            <TouchableOpacity
              style={[
                styles.carouselArrow,
                styles.carouselArrowLeft,
                isTablet && styles.carouselArrowTablet
              ]}
              onPress={() => goToPhoto(activeIndex - 1)}
              activeOpacity={0.8}
              accessibilityLabel="Previous photo"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                style={styles.carouselArrowGradient}
              >
                <Feather name="chevron-left" size={isTablet ? 32 : 28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
          {activeIndex < allPhotos.length - 1 && (
            <TouchableOpacity
              style={[
                styles.carouselArrow,
                styles.carouselArrowRight,
                isTablet && styles.carouselArrowTablet
              ]}
              onPress={() => goToPhoto(activeIndex + 1)}
              activeOpacity={0.8}
              accessibilityLabel="Next photo"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                style={styles.carouselArrowGradient}
              >
                <Feather name="chevron-right" size={isTablet ? 32 : 28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Swipe hint for first-time users (shows briefly) */}
      <SwipeHint visible={activeIndex === 0 && allPhotos.length > 1} />
    </Animated.View>
  );
});

PhotoCarousel.displayName = 'PhotoCarousel';

// ============================================================================
// SWIPE HINT - Brief animation hint for photo navigation
// ============================================================================

interface SwipeHintProps {
  visible: boolean;
}

const SwipeHint = memo<SwipeHintProps>(({ visible }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show hint briefly then fade out
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(opacity, { toValue: 0.8, duration: 300, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateX, { toValue: 10, duration: 500, useNativeDriver: true }),
            Animated.timing(translateX, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
          { iterations: 2 }
        ),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateX]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.swipeHint,
        { opacity, transform: [{ translateX }] }
      ]}
      pointerEvents="none"
    >
      <Feather name="chevrons-right" size={32} color="#fff" />
      <Text style={styles.swipeHintText}>Swipe for more</Text>
    </Animated.View>
  );
});

SwipeHint.displayName = 'SwipeHint';

// ============================================================================
// COMPATIBILITY SCORE DISPLAY - Premium animated circular progress
// ============================================================================

interface CompatibilityScoreProps {
  score: number;
  isTablet?: boolean;
}

const CompatibilityScore = memo<CompatibilityScoreProps>(({ score, isTablet = false }) => {
  const animatedScore = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [displayScore, setDisplayScore] = useState(0);

  // Animate score counting up
  useEffect(() => {
    animatedScore.setValue(0);
    Animated.timing(animatedScore, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    // Update displayed score during animation
    const listener = animatedScore.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    return () => animatedScore.removeListener(listener);
  }, [score, animatedScore]);

  // Pulse animation for high scores
  useEffect(() => {
    if (score >= 80) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [score, pulseAnim]);

  // Determine color based on score
  const getScoreColor = () => {
    if (score >= 80) return colors.teal[500];
    if (score >= 60) return colors.orange[500];
    return colors.gray[500];
  };

  const getScoreGradient = (): [string, string] => {
    if (score >= 80) return [colors.teal[400], colors.teal[600]];
    if (score >= 60) return [colors.orange[400], colors.orange[600]];
    return [colors.gray[400], colors.gray[500]];
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Great Match!';
    if (score >= 60) return 'Good Match';
    return 'Potential Match';
  };

  const getScoreIcon = () => {
    if (score >= 80) return 'zap';
    if (score >= 60) return 'star';
    return 'heart';
  };

  const getScoreDescription = () => {
    if (score >= 80) return 'You have a lot in common';
    if (score >= 60) return 'Several shared interests';
    return 'Discover your connection';
  };

  return (
    <Animated.View
      style={[
        styles.compatibilityContainer,
        isTablet && styles.compatibilityContainerTablet,
        { transform: [{ scale: pulseAnim }] }
      ]}
    >
      <LinearGradient
        colors={[colors.orange[50], colors.teal[50]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.compatibilityGradient, isTablet && styles.compatibilityGradientTablet]}
      >
        <View style={styles.compatibilityContent}>
          {/* Animated circular score */}
          <View style={styles.compatibilityScoreWrapper}>
            <LinearGradient
              colors={getScoreGradient()}
              style={[
                styles.compatibilityCircle,
                isTablet && styles.compatibilityCircleTablet,
              ]}
            >
              <View style={[styles.compatibilityCircleInner, isTablet && styles.compatibilityCircleInnerTablet]}>
                <Text style={[styles.compatibilityNumber, isTablet && { fontSize: 28 }]}>
                  {displayScore}%
                </Text>
              </View>
            </LinearGradient>
            {/* Sparkle decoration for high scores */}
            {score >= 80 && (
              <View style={styles.compatibilitySparkle}>
                <Feather name="star" size={14} color={colors.teal[400]} />
              </View>
            )}
          </View>

          {/* Info section */}
          <View style={styles.compatibilityInfo}>
            <View style={styles.compatibilityLabelRow}>
              <Feather name={getScoreIcon() as any} size={isTablet ? 20 : 16} color={getScoreColor()} />
              <Text style={[styles.compatibilityLabel, isTablet && { fontSize: 17 }]}>Compatibility</Text>
            </View>
            <Text style={[
              styles.compatibilityStatus,
              { color: getScoreColor() },
              isTablet && { fontSize: 24 }
            ]}>
              {getScoreLabel()}
            </Text>
            <Text style={[styles.compatibilityDescription, isTablet && { fontSize: 16 }]}>
              {getScoreDescription()}
            </Text>
          </View>

          {/* Decorative icon */}
          <View style={[styles.compatibilityIconWrapper, isTablet && styles.compatibilityIconWrapperTablet]}>
            <LinearGradient
              colors={getScoreGradient()}
              style={styles.compatibilityIconBg}
            >
              <Feather name={getScoreIcon() as any} size={isTablet ? 24 : 20} color="#fff" />
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

CompatibilityScore.displayName = 'CompatibilityScore';

// ============================================================================
// INTERESTS SECTION
// ============================================================================

interface InterestsSectionProps {
  interests: string[];
  isTablet?: boolean;
}

const InterestsSection = memo<InterestsSectionProps>(({ interests, isTablet = false }) => {
  if (!interests || interests.length === 0) return null;

  // Interest icons mapping
  const getInterestIcon = (interest: string): string => {
    const iconMap: Record<string, string> = {
      'music': 'music',
      'travel': 'map',
      'reading': 'book-open',
      'cooking': 'coffee',
      'movies': 'film',
      'photography': 'camera',
      'gardening': 'sun',
      'sports': 'activity',
      'dancing': 'headphones',
      'art': 'edit-2',
      'fishing': 'anchor',
      'walking': 'navigation',
    };
    const lowerInterest = interest.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerInterest.includes(key)) return icon;
    }
    return 'heart';
  };

  return (
    <View style={[styles.interestsSection, isTablet && styles.interestsSectionTablet]}>
      <View style={styles.sectionHeaderRow}>
        <Feather name="heart" size={20} color={colors.orange[500]} />
        <Text style={styles.sectionTitle}>Interests</Text>
      </View>
      <View style={[styles.interestsTags, isTablet && styles.interestsTagsTablet]}>
        {interests.map((interest, i) => (
          <View
            key={i}
            style={[styles.interestTag, isTablet && styles.interestTagTablet]}
            accessibilityLabel={`Interest: ${interest}`}
          >
            <Feather
              name={getInterestIcon(interest) as any}
              size={isTablet ? 18 : 16}
              color={colors.orange[500]}
            />
            <Text style={[styles.interestTagText, isTablet && styles.interestTagTextTablet]}>
              {interest}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

InterestsSection.displayName = 'InterestsSection';

// ============================================================================
// REWRITE STORY MODAL - Premium message composer with suggestions
// ============================================================================

interface RewriteStoryModalProps {
  visible: boolean;
  recipientName: string;
  onClose: () => void;
  onSend: (message: string) => void;
  isSending: boolean;
}

// Suggested pickup line with category
interface SuggestedLine {
  text: string;
  category: 'friendly' | 'curious' | 'compliment' | 'connection';
  icon: string;
}

const SUGGESTED_LINES: SuggestedLine[] = [
  { text: "I loved reading your story! Would love to know more about you.", category: 'curious', icon: 'book-open' },
  { text: "Your smile caught my attention. Care to chat?", category: 'compliment', icon: 'smile' },
  { text: "We seem to have a lot in common. Let's connect!", category: 'connection', icon: 'users' },
  { text: "Your story touched my heart. Can we talk?", category: 'friendly', icon: 'heart' },
  { text: "I'd love to hear more about your travels!", category: 'curious', icon: 'map' },
  { text: "You seem like a wonderful person to know.", category: 'compliment', icon: 'star' },
];

const RewriteStoryModal = memo<RewriteStoryModalProps>(({
  visible,
  recipientName,
  onClose,
  onSend,
  isSending,
}) => {
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape, width, height } = useResponsive();
  const [message, setMessage] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const maxLength = 200;

  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Entry animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      setMessage('');
      setSelectedSuggestion(null);
    }
  }, [visible, slideAnim, fadeAnim, scaleAnim]);

  const handleSend = useCallback(() => {
    if (message.trim().length > 0) {
      triggerHaptic('success');
      onSend(message.trim());
      setMessage('');
      setSelectedSuggestion(null);
    }
  }, [message, onSend]);

  const handleSelectSuggestion = useCallback((line: string, index: number) => {
    setMessage(line);
    setSelectedSuggestion(index);
    triggerHaptic('light');
    // Auto-focus input after selection
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleClose = useCallback(() => {
    // Exit animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [fadeAnim, slideAnim, onClose]);

  // Character count color
  const getCharCountColor = () => {
    const remaining = maxLength - message.length;
    if (remaining <= 20) return colors.semantic.error;
    if (remaining <= 50) return colors.orange[500];
    return colors.gray[400];
  };

  // Responsive modal sizing - handles all screen sizes
  // Small phones: full width
  // Landscape phones: constrained width, centered
  // Tablets: constrained width based on orientation
  const isSmallPhone = width < 376;
  const isLandscapePhone = isLandscape && !isTablet;

  const modalWidth = useMemo(() => {
    if (isTablet) {
      return isLandscape ? Math.min(width * 0.55, 600) : Math.min(width * 0.75, 500);
    }
    if (isLandscapePhone) {
      // Landscape phones - constrain width to prevent horizontal overflow
      return Math.min(width * 0.85, 500);
    }
    return width;
  }, [isTablet, isLandscape, isLandscapePhone, width]);

  // Calculate max height based on screen orientation and size
  const modalMaxHeight = useMemo(() => {
    if (isLandscapePhone) {
      // Landscape phones have very limited height - be aggressive
      return height * 0.95;
    }
    if (isSmallPhone) {
      // Small phones - leave room for keyboard
      return height * 0.88;
    }
    if (isTablet) {
      return isLandscape ? height * 0.85 : height * 0.9;
    }
    return height * 0.92;
  }, [isLandscapePhone, isSmallPhone, isTablet, isLandscape, height]);

  // Category icon colors
  const getCategoryColor = (category: SuggestedLine['category']) => {
    switch (category) {
      case 'friendly': return colors.teal[500];
      case 'curious': return colors.orange[500];
      case 'compliment': return colors.romantic.pink;
      case 'connection': return colors.teal[600];
      default: return colors.orange[500];
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.rewriteModalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleClose}
          accessibilityLabel="Close modal"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.rewriteModalKeyboard}
        >
          <Animated.View
            style={[
              styles.rewriteModalContent,
              {
                width: modalWidth,
                maxHeight: modalMaxHeight,
                paddingBottom: Math.max(insets.bottom, isLandscapePhone ? 12 : 24),
                paddingTop: isLandscapePhone ? 12 : 24,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
              isTablet && styles.rewriteModalContentTablet,
              isLandscapePhone && styles.rewriteModalContentLandscapePhone,
            ]}
          >
            {/* Drag handle for mobile - hide in landscape phones */}
            {!isTablet && !isLandscapePhone && (
              <View style={styles.rewriteModalHandle}>
                <View style={styles.rewriteModalHandleBar} />
              </View>
            )}

            {/* Premium Header */}
            <View style={[styles.rewriteModalHeader, isTablet && styles.rewriteModalHeaderTablet]}>
              <View style={styles.rewriteModalHeaderContent}>
                <LinearGradient
                  colors={[colors.orange[500], colors.teal[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.rewriteModalIcon, isTablet && styles.rewriteModalIconTablet]}
                >
                  <Feather name="edit-3" size={isTablet ? 28 : 24} color="#fff" />
                </LinearGradient>
                <View style={styles.rewriteModalTitleContainer}>
                  <Text
                    style={[styles.rewriteModalTitle, isTablet && styles.rewriteModalTitleTablet]}
                    accessibilityRole="header"
                  >
                    Send a Message
                  </Text>
                  <Text style={[styles.rewriteModalSubtitle, isTablet && styles.rewriteModalSubtitleTablet]}>
                    Start a conversation with {recipientName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.rewriteModalClose, isTablet && styles.rewriteModalCloseTablet]}
                activeOpacity={0.7}
                accessibilityLabel="Close message composer"
                accessibilityRole="button"
              >
                <Feather name="x" size={isTablet ? 28 : 24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            {/* Suggested Lines Section */}
            <View style={styles.suggestedSection}>
              <View style={styles.suggestedHeaderRow}>
                <Feather name="zap" size={18} color={colors.orange[500]} />
                <Text style={[styles.suggestedLinesLabel, isTablet && styles.suggestedLinesLabelTablet]}>
                  Quick conversation starters
                </Text>
              </View>
              <Text style={[styles.suggestedHint, isTablet && { fontSize: 15 }]}>
                Tap a suggestion or write your own message below
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestedLinesScroll}
              contentContainerStyle={styles.suggestedLinesContent}
            >
              {SUGGESTED_LINES.map((line, index) => {
                const isSelected = selectedSuggestion === index;
                const categoryColor = getCategoryColor(line.category);

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.suggestedLineChip,
                      isTablet && styles.suggestedLineChipTablet,
                      isSelected && styles.suggestedLineChipSelected,
                      isSelected && { borderColor: categoryColor },
                    ]}
                    onPress={() => handleSelectSuggestion(line.text, index)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Use suggestion: ${line.text}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[styles.suggestedLineIconWrapper, { backgroundColor: `${categoryColor}15` }]}>
                      <Feather name={line.icon as any} size={isTablet ? 18 : 16} color={categoryColor} />
                    </View>
                    <Text
                      style={[
                        styles.suggestedLineText,
                        isTablet && styles.suggestedLineTextTablet,
                        isSelected && { color: colors.gray[900] },
                      ]}
                      numberOfLines={2}
                    >
                      {line.text}
                    </Text>
                    {isSelected && (
                      <View style={[styles.suggestedLineCheck, { backgroundColor: categoryColor }]}>
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Premium Input Area */}
            <View style={[
              styles.rewriteInputContainer,
              isTablet && styles.rewriteInputContainerTablet,
              inputFocused && styles.rewriteInputContainerFocused,
            ]}>
              <View style={styles.rewriteInputHeader}>
                <Text style={[styles.rewriteInputLabel, isTablet && { fontSize: 16 }]}>Your message</Text>
                <Text
                  style={[
                    styles.rewriteCharCount,
                    { color: getCharCountColor() },
                    isTablet && { fontSize: 16 },
                  ]}
                >
                  {message.length}/{maxLength}
                </Text>
              </View>
              <TextInput
                ref={inputRef}
                style={[
                  styles.rewriteInput,
                  isTablet && styles.rewriteInputTablet,
                  isLandscapePhone && styles.rewriteInputLandscapePhone,
                ]}
                value={message}
                onChangeText={(text) => {
                  setMessage(text);
                  setSelectedSuggestion(null);
                }}
                placeholder={`Write something nice to ${recipientName}...`}
                placeholderTextColor={colors.gray[400]}
                multiline
                maxLength={maxLength}
                textAlignVertical="top"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                accessibilityLabel="Message input"
                accessibilityHint={`Write a message to ${recipientName}. Maximum ${maxLength} characters.`}
              />
            </View>

            {/* Action Buttons */}
            <View style={[styles.rewriteModalActions, isTablet && styles.rewriteModalActionsTablet]}>
              <TouchableOpacity
                style={[styles.rewriteCancelBtn, isTablet && styles.rewriteCancelBtnTablet]}
                onPress={handleClose}
                activeOpacity={0.7}
                accessibilityLabel="Cancel and close"
                accessibilityRole="button"
              >
                <Feather name="x" size={20} color={colors.gray[600]} />
                <Text style={[styles.rewriteCancelText, isTablet && styles.rewriteCancelTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rewriteSendBtn,
                  isTablet && styles.rewriteSendBtnTablet,
                  (!message.trim() || isSending) && styles.rewriteSendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={!message.trim() || isSending}
                activeOpacity={0.8}
                accessibilityLabel={`Send message to ${recipientName}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !message.trim() || isSending }}
              >
                <LinearGradient
                  colors={
                    !message.trim() || isSending
                      ? [colors.gray[300], colors.gray[400]]
                      : [colors.orange[500], colors.teal[500]]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.rewriteSendBtnGradient, isTablet && styles.rewriteSendBtnGradientTablet]}
                >
                  {isSending ? (
                    <ActivityIndicator color="#fff" size={isTablet ? 'small' : 'small'} />
                  ) : (
                    <>
                      <Feather name="send" size={isTablet ? 24 : 20} color="#fff" />
                      <Text style={[styles.rewriteSendText, isTablet && styles.rewriteSendTextTablet]}>
                        Send Message
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
});

RewriteStoryModal.displayName = 'RewriteStoryModal';

// ============================================================================
// PROFILE MODAL - Enhanced full profile view
// ============================================================================

interface ProfileModalProps {
  visible: boolean;
  profile: Profile | null;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
}

const ProfileModal = memo<ProfileModalProps>(({
  visible,
  profile,
  onClose,
  onLike,
  onPass,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight, isLandscape, isTablet } = useResponsive();
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const sendComment = useStoryCommentsStore((state) => state.sendComment);

  // Animation for modal appearance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleOpenRewriteModal = useCallback(() => {
    triggerHaptic('light');
    setShowRewriteModal(true);
  }, []);

  const handleCloseRewriteModal = useCallback(() => {
    setShowRewriteModal(false);
  }, []);

  const handleSendComment = useCallback(async (message: string) => {
    if (!profile) return;

    setIsSendingComment(true);
    try {
      // Send comment via API - this automatically creates a RIGHT swipe on the backend
      const response = await sendComment(profile.id.toString(), message);

      if (response.success) {
        triggerHaptic('success');
        setShowRewriteModal(false);
        // Close the modal - the swipe is already recorded by the backend
        onClose();
      } else {
        console.warn('Failed to send comment:', response.message);
        triggerHaptic('medium');
      }
    } catch (error) {
      console.warn('Failed to send comment:', error);
      triggerHaptic('medium');
    } finally {
      setIsSendingComment(false);
    }
  }, [profile, sendComment, onClose]);

  const handleLikeAndClose = useCallback(() => {
    onLike();
    onClose();
  }, [onLike, onClose]);

  const handlePassAndClose = useCallback(() => {
    onPass();
    onClose();
  }, [onPass, onClose]);

  // Responsive photo gallery dimensions - optimized for all screen sizes
  // Small phones (320-375px): constrain height to avoid overflow
  // Landscape phones: significantly reduced height since height is limited
  // Tablets: can afford larger photos
  const isSmallPhone = screenWidth < 376;

  const photoGalleryHeight = useMemo(() => {
    if (isLandscape) {
      // Landscape mode - height is very limited
      if (isTablet) {
        // Tablets in landscape - can use more height
        return Math.min(screenHeight * 0.65, 500);
      }
      // Phones in landscape - height is critical, use most of available space
      // Reserve space for header (56) and actions (100)
      const availableHeight = screenHeight - insets.top - insets.bottom - 160;
      return Math.max(Math.min(availableHeight, screenWidth * 0.5), 200);
    }
    // Portrait mode
    if (isTablet) {
      return Math.min(screenWidth * 0.7, 500);
    }
    if (isSmallPhone) {
      // Small phones - more conservative to avoid overflow
      return Math.min(screenWidth * 0.8, 350);
    }
    return Math.min(screenWidth * 0.85, 400);
  }, [isLandscape, isTablet, screenHeight, screenWidth, insets, isSmallPhone]);

  const photoGalleryWidth = useMemo(() => {
    if (isLandscape) {
      if (isTablet) {
        return screenWidth * 0.45;
      }
      // Landscape phones - photo takes left portion
      return Math.min(screenHeight * 0.8, screenWidth * 0.45);
    }
    return screenWidth;
  }, [isLandscape, isTablet, screenWidth, screenHeight]);

  // Content max width for tablet
  const contentMaxWidth = isTablet ? 600 : screenWidth;

  // Landscape layout: side-by-side for BOTH tablets AND phones in landscape
  // This is critical for landscape phones where vertical space is limited
  const useSideBySideLayout = isLandscape;

  // Calculate proper photo dimensions for landscape layout
  const landscapePhotoWidth = useMemo(() => {
    if (!isLandscape) return screenWidth;
    // In landscape, photo takes 40% of screen width for balanced layout
    return Math.floor(screenWidth * 0.4);
  }, [isLandscape, screenWidth]);

  const landscapePhotoHeight = useMemo(() => {
    if (!isLandscape) return photoGalleryHeight;
    // In landscape, photo takes FULL height (header/actions are on the right side)
    return screenHeight - insets.top - insets.bottom;
  }, [isLandscape, screenHeight, insets, photoGalleryHeight]);

  // Early return AFTER all hooks to comply with Rules of Hooks
  if (!profile) return null;

  const imageUri = getImageUri(profile);
  const name = profile.name || 'Unknown';
  const age = profile.age > 0 && profile.age < 120 ? profile.age : null;
  const location = profile.location || 'Philippines';
  const bio = profile.bio || '';
  const additionalPhotos = profile.additionalPhotos || [];

  return (
    <Modal visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View
        style={[
          styles.profileModal,
          {
            // Only add paddingTop for portrait mode; landscape handles it differently
            paddingTop: useSideBySideLayout ? 0 : insets.top,
            opacity: fadeAnim,
          }
        ]}
      >
        {/* Content - different layout for landscape */}
        {useSideBySideLayout ? (
          // Side-by-side layout for landscape (tablets AND phones)
          <View style={styles.landscapeModalContainer}>
            {/* Left side - Photo fills entire left portion edge-to-edge */}
            <View style={[styles.landscapePhotoSection, { width: landscapePhotoWidth, height: screenHeight }]}>
              <PhotoCarousel
                photos={additionalPhotos}
                defaultPhoto={imageUri}
                width={landscapePhotoWidth}
                height={screenHeight}
                showVerifiedBadge={profile.verified}
                showOnlineBadge={profile.online}
                isTablet={isTablet}
              />
            </View>

            {/* Right side - Header, Profile info, and Actions */}
            <View style={[styles.landscapeRightSection, { paddingTop: insets.top }]}>
              {/* Header inside right section for landscape */}
              <View style={[styles.landscapeModalHeader]}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.profileModalClose}
                  activeOpacity={0.7}
                  accessibilityLabel="Close profile"
                  accessibilityRole="button"
                >
                  <Feather name="x" size={24} color={colors.gray[700]} />
                </TouchableOpacity>
                <Text style={styles.profileModalHeaderTitle}>Profile</Text>
                <View style={[styles.profileModalClose, { opacity: 0 }]} />
              </View>

              {/* Scrollable content */}
              <ScrollView
                style={styles.landscapeInfoSection}
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={[styles.landscapeInfoContent, { paddingBottom: 100 }]}
              >
                <ProfileInfoContent
                  name={name}
                  age={age}
                  location={location}
                  distance={profile.distance}
                  bio={bio}
                  interests={profile.interests || []}
                  compatibilityScore={profile.compatibilityScore}
                  verified={profile.verified}
                  online={profile.online}
                  isTablet={isTablet}
                  onRewriteStory={handleOpenRewriteModal}
                />
              </ScrollView>

              {/* Action buttons inside right section for landscape */}
              <View style={[
                styles.profileModalActionsLandscape,
                { paddingBottom: Math.max(insets.bottom, 12) }
              ]}>
                <TouchableOpacity
                  style={[styles.profileModalBtn, styles.profileModalBtnPass]}
                  onPress={handlePassAndClose}
                  activeOpacity={0.8}
                  accessibilityLabel="Pass on this profile"
                  accessibilityRole="button"
                >
                  <Feather name="x" size={22} color="#FF5A5F" />
                  <Text style={[styles.profileModalBtnText, { color: '#FF5A5F' }]}>Pass</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.profileModalBtn, styles.profileModalBtnLike]}
                  onPress={handleLikeAndClose}
                  activeOpacity={0.8}
                  accessibilityLabel="Like this profile"
                  accessibilityRole="button"
                >
                  <Feather name="heart" size={22} color="#fff" />
                  <Text style={[styles.profileModalBtnText, { color: '#fff' }]}>Like</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          // Standard portrait layout with header, scrollable content, and fixed actions
          <>
            {/* Header for portrait mode */}
            <View style={[styles.profileModalHeader, isTablet && styles.profileModalHeaderTablet]}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.profileModalClose, isTablet && styles.profileModalCloseTablet]}
                activeOpacity={0.7}
                accessibilityLabel="Close profile"
                accessibilityRole="button"
              >
                <Feather name="x" size={isTablet ? 28 : 24} color={colors.gray[700]} />
              </TouchableOpacity>
              <Text style={[styles.profileModalHeaderTitle, isTablet && { fontSize: 24 }]}>Profile</Text>
              <View style={[styles.profileModalClose, isTablet && styles.profileModalCloseTablet, { opacity: 0 }]} />
            </View>

            <Animated.ScrollView
              style={[styles.profileModalScroll, { transform: [{ translateY: slideAnim }] }]}
              showsVerticalScrollIndicator={false}
              bounces={true}
              contentContainerStyle={[
                styles.profileModalScrollContent,
                { paddingBottom: 24 + insets.bottom }
              ]}
            >
              {/* Photo Carousel */}
              <PhotoCarousel
                photos={additionalPhotos}
                defaultPhoto={imageUri}
                width={photoGalleryWidth}
                height={photoGalleryHeight}
                showVerifiedBadge={profile.verified}
                showOnlineBadge={profile.online}
                isTablet={isTablet}
              />

              {/* Info section with max width for tablet */}
              <View style={[
                styles.profileModalInfo,
                isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
              ]}>
                <ProfileInfoContent
                  name={name}
                  age={age}
                  location={location}
                  distance={profile.distance}
                  bio={bio}
                  interests={profile.interests || []}
                  compatibilityScore={profile.compatibilityScore}
                  verified={profile.verified}
                  online={profile.online}
                  isTablet={isTablet}
                  onRewriteStory={handleOpenRewriteModal}
                />
              </View>
            </Animated.ScrollView>

            {/* Fixed action buttons at bottom - portrait only */}
            <View style={[
              styles.profileModalActions,
              { paddingBottom: Math.max(insets.bottom, 16) + 8 },
              isTablet && styles.profileModalActionsTablet,
            ]}>
              <TouchableOpacity
                style={[
                  styles.profileModalBtn,
                  styles.profileModalBtnPass,
                  isTablet && styles.profileModalBtnTablet
                ]}
                onPress={handlePassAndClose}
                activeOpacity={0.8}
                accessibilityLabel="Pass on this profile"
                accessibilityRole="button"
              >
                <Feather name="x" size={isTablet ? 28 : 24} color="#FF5A5F" />
                <Text style={[styles.profileModalBtnText, { color: '#FF5A5F' }, isTablet && { fontSize: 20 }]}>
                  Pass
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.profileModalBtn,
                  styles.profileModalBtnLike,
                  isTablet && styles.profileModalBtnTablet
                ]}
                onPress={handleLikeAndClose}
                activeOpacity={0.8}
                accessibilityLabel="Like this profile"
                accessibilityRole="button"
              >
                <Feather name="heart" size={isTablet ? 28 : 24} color="#fff" />
                <Text style={[styles.profileModalBtnText, { color: '#fff' }, isTablet && { fontSize: 20 }]}>
                  Like
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Rewrite Story Modal - available in both layouts */}
        <RewriteStoryModal
          visible={showRewriteModal}
          recipientName={name}
          onClose={handleCloseRewriteModal}
          onSend={handleSendComment}
          isSending={isSendingComment}
        />
      </Animated.View>
    </Modal>
  );
});

ProfileModal.displayName = 'ProfileModal';

// ============================================================================
// PROFILE INFO CONTENT - Reusable content section
// ============================================================================

interface ProfileInfoContentProps {
  name: string;
  age: number | null;
  location: string;
  distance?: string;
  bio: string;
  interests: string[];
  compatibilityScore?: number;
  verified?: boolean;
  online?: boolean;
  isTablet?: boolean;
  onRewriteStory: () => void;
}

const ProfileInfoContent = memo<ProfileInfoContentProps>(({
  name,
  age,
  location,
  distance,
  bio,
  interests,
  compatibilityScore,
  verified,
  online,
  isTablet = false,
  onRewriteStory,
}) => {
  return (
    <>
      {/* Name, Age & Badges */}
      <View style={[styles.profileModalNameRow, isTablet && styles.profileModalNameRowTablet]}>
        <Text
          style={[styles.profileModalName, isTablet && { fontSize: 38 }]}
          accessibilityRole="header"
        >
          {name}
        </Text>
        {age && <Text style={[styles.profileModalAge, isTablet && { fontSize: 32 }]}>{age}</Text>}
        {verified && (
          <View
            style={[styles.profileModalVerified, isTablet && { width: 36, height: 36, borderRadius: 18 }]}
            accessibilityLabel="Verified profile"
          >
            <Feather name="check-circle" size={isTablet ? 20 : 16} color="#fff" />
          </View>
        )}
      </View>

      {/* Location */}
      <View style={styles.profileModalLocation}>
        <Feather name="map-pin" size={isTablet ? 22 : 18} color={colors.orange[500]} />
        <Text style={[styles.profileModalLocationText, isTablet && { fontSize: 20 }]}>{location}</Text>
      </View>

      {/* Distance & Online status */}
      <View style={styles.profileModalStatusRow}>
        {distance && (
          <View style={styles.profileModalDistance}>
            <Feather name="navigation" size={isTablet ? 18 : 16} color={colors.teal[500]} />
            <Text style={[styles.profileModalDistanceText, isTablet && { fontSize: 17 }]}>{distance} away</Text>
          </View>
        )}
        {online && (
          <View style={styles.profileModalOnline}>
            <View style={styles.onlineDotSmall} />
            <Text style={[styles.profileModalOnlineText, isTablet && { fontSize: 17 }]}>Online now</Text>
          </View>
        )}
      </View>

      {/* Compatibility Score */}
      {compatibilityScore !== undefined && compatibilityScore > 0 && (
        <CompatibilityScore score={compatibilityScore} isTablet={isTablet} />
      )}

      {/* My Story Section */}
      <View style={[styles.storySection, isTablet && styles.storySectionTablet]}>
        <View style={styles.storySectionHeader}>
          <LinearGradient
            colors={[colors.orange[500], colors.teal[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.storyIcon, isTablet && { width: 56, height: 56, borderRadius: 28 }]}
          >
            <Feather name="book-open" size={isTablet ? 26 : 22} color="#fff" />
          </LinearGradient>
          <View style={styles.storyHeaderText}>
            <Text style={[styles.storySectionTitle, isTablet && { fontSize: 24 }]}>My Story</Text>
            <Text style={[styles.storySubtitle, isTablet && { fontSize: 16 }]}>Get to know {name}</Text>
          </View>
        </View>

        {bio ? (
          <View style={[styles.storyContent, isTablet && styles.storyContentTablet]}>
            <Text style={[styles.storyQuote, isTablet && { fontSize: 56 }]}>"</Text>
            <Text style={[styles.storyText, isTablet && { fontSize: 20, lineHeight: 34 }]}>{bio}</Text>
          </View>
        ) : (
          <View style={[styles.noStory, isTablet && styles.noStoryTablet]}>
            <Feather name="edit-3" size={isTablet ? 32 : 28} color={colors.gray[300]} />
            <Text style={[styles.noStoryText, isTablet && { fontSize: 19 }]}>
              {name} hasn't shared their story yet.
            </Text>
            <Text style={[styles.noStoryHint, isTablet && { fontSize: 17 }]}>
              Be the first to start a conversation!
            </Text>
          </View>
        )}

        {/* Rewrite Their Story Button */}
        <TouchableOpacity
          style={[styles.rewriteStoryBtn, isTablet && styles.rewriteStoryBtnTablet]}
          onPress={onRewriteStory}
          activeOpacity={0.85}
          accessibilityLabel={`Send a message to ${name}`}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[colors.orange[500], colors.teal[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.rewriteStoryBtnGradient, isTablet && { minHeight: 68, paddingVertical: 20 }]}
          >
            <Feather name="edit-3" size={isTablet ? 26 : 22} color="#fff" />
            <Text style={[styles.rewriteStoryBtnText, isTablet && { fontSize: 20 }]}>
              Rewrite Their Story
            </Text>
            <Feather name="chevron-right" size={isTablet ? 24 : 20} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Interests */}
      <InterestsSection interests={interests} isTablet={isTablet} />
    </>
  );
});

ProfileInfoContent.displayName = 'ProfileInfoContent';

// ============================================================================
// HEADER
// ============================================================================

interface HeaderProps {
  count: number;
  isTablet?: boolean;
  isLandscape?: boolean;
  isSmallPhone?: boolean;
}

// Premium Filter Icon (View-based)
const FilterIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const barHeight = Math.max(2, size * 0.08);
  const barGap = size * 0.22;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Top bar with dots */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: barGap }}>
        <View style={{ width: size * 0.6, height: barHeight, backgroundColor: color, borderRadius: barHeight / 2 }} />
        <View style={{ position: 'absolute', right: size * 0.15, width: size * 0.15, height: size * 0.15, borderRadius: size * 0.075, backgroundColor: color }} />
      </View>
      {/* Middle bar with dots */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: barGap }}>
        <View style={{ width: size * 0.6, height: barHeight, backgroundColor: color, borderRadius: barHeight / 2 }} />
        <View style={{ position: 'absolute', left: size * 0.05, width: size * 0.15, height: size * 0.15, borderRadius: size * 0.075, backgroundColor: color }} />
      </View>
      {/* Bottom bar with dots */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: size * 0.6, height: barHeight, backgroundColor: color, borderRadius: barHeight / 2 }} />
        <View style={{ position: 'absolute', right: size * 0.25, width: size * 0.15, height: size * 0.15, borderRadius: size * 0.075, backgroundColor: color }} />
      </View>
    </View>
  );
};

const Header = memo<HeaderProps>(({
  count,
  isTablet = false,
  isLandscape = false,
  isSmallPhone = false,
}) => {
  const isLandscapePhone = isLandscape && !isTablet;

  // Premium responsive sizing
  const logoSize = isTablet ? 48 : (isLandscapePhone ? 34 : (isSmallPhone ? 34 : 40));
  const titleSize = isTablet ? 26 : (isLandscapePhone ? 20 : (isSmallPhone ? 20 : 22));
  const subtitleSize = isTablet ? 15 : 14;
  const btnSize = isTablet ? 52 : (isLandscapePhone ? 44 : (isSmallPhone ? 46 : 48));
  const iconSize = isTablet ? 24 : (isLandscapePhone ? 20 : 22);

  return (
    <View style={[
      styles.header,
      styles.headerPremium,
      isTablet && styles.headerTablet,
      isLandscapePhone && styles.headerLandscapePhone,
      isSmallPhone && !isLandscape && styles.headerSmallPhone,
    ]}>
      <View style={styles.headerLeft}>
        <TanderLogoIcon size={logoSize} focused />
        <View style={{ marginLeft: 4 }}>
          <Text style={[styles.headerTitle, styles.headerTitlePremium, { fontSize: titleSize }]}>
            DISCOVER
          </Text>
          {count > 0 && !isLandscapePhone && (
            <Text style={[styles.headerSubtitle, styles.headerSubtitlePremium, { fontSize: subtitleSize }]}>
              {count} people nearby
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.headerBtn,
          styles.headerBtnPremium,
          { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }
        ]}
        activeOpacity={0.85}
        accessibilityLabel="Filters"
        accessibilityRole="button"
        onPress={() => Alert.alert(
          'Filters',
          'Discovery filters coming soon! You\'ll be able to filter by age, distance, interests, and more.',
          [{ text: 'OK', style: 'default' }]
        )}
      >
        <FilterIcon size={iconSize} color={colors.gray[600]} />
      </TouchableOpacity>
    </View>
  );
});

Header.displayName = 'Header';

// ============================================================================
// MAIN SCREEN
// ============================================================================

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'DiscoveryTab'>,
  NativeStackNavigationProp<MessagesStackParamList>
>;

export const DiscoveryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { width, height, isLandscape, isTablet } = useResponsive();

  const {
    profiles,
    currentIndex,
    isLoading,
    error,
    matchInfo,
    showMatchPopup,
    currentProfile,
    hasProfiles,
    loadProfiles,
    swipeRight,
    swipeLeft,
    goToNext,
    goToPrevious,
    reset,
    dismissMatchPopup,
    clearError,
  } = useDiscovery();

  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeHistory, setSwipeHistory] = useState<Array<{ id: number; direction: 'left' | 'right' }>>([]);
  const [swipedProfileIds, setSwipedProfileIds] = useState<Set<number>>(new Set());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const swipeThreshold = width * SWIPE_THRESHOLD;
  // Can undo if we have history AND we're not at the beginning AND not animating
  const canUndo = swipeHistory.length > 0 && currentIndex > 0 && !isAnimating;

  // Responsive card dimensions - optimized for ALL screen sizes
  // Key considerations:
  // - Small phones (320px): cards must fit without clipping
  // - Landscape phones: very limited height, must be compact
  // - Tablets: larger cards with more padding
  const isSmallPhone = width < 376;
  const isLandscapePhone = isLandscape && !isTablet;

  const cardDimensions = useMemo(() => {
    // Responsive header height - smaller on small phones
    const headerHeight = isTablet ? 72 : (isSmallPhone ? 52 : 60);
    // Action buttons - smaller in landscape and small phones
    const actionsHeight = isLandscape
      ? (isTablet ? 120 : 90) // Landscape: more compact
      : (isTablet ? 130 : (isSmallPhone ? 100 : 110)); // Portrait
    // Padding - smaller on small phones
    const padding = isTablet ? 24 : (isSmallPhone ? 12 : 16);

    if (isLandscape) {
      // Landscape: card centered with action buttons to the right
      // Leave space for action buttons (approx 120px for vertical buttons)
      const availableH = height - insets.top - insets.bottom - headerHeight - padding * 2;
      const actionButtonsWidth = 100; // Approximate width of vertical action buttons

      if (isTablet) {
        // Tablets have more room - centered card with proper spacing
        const cardH = Math.min(availableH, 500);
        const cardW = Math.min(cardH * 0.72, (width - actionButtonsWidth - padding * 4) * 0.55);
        return { width: cardW, height: cardH };
      }

      // Landscape phones - card and buttons side by side, centered
      // Height is limited, so maximize card height
      const cardH = Math.min(availableH - 16, 360);
      // Card width should be proportional and leave room for buttons
      const maxCardWidth = (width - actionButtonsWidth - padding * 3) * 0.6;
      const cardW = Math.min(cardH * 0.72, maxCardWidth);
      return { width: cardW, height: cardH };
    }

    // Portrait: full width card
    const availableH = height - insets.top - insets.bottom - headerHeight - actionsHeight - padding * 2;
    const cardW = width - padding * 2;
    const maxW = isTablet ? Math.min(cardW, 480) : cardW;

    // For small phones, use a smaller aspect ratio to prevent overflow
    const aspectRatio = isSmallPhone ? 1.25 : 1.35;
    const cardH = Math.min(availableH, maxW * aspectRatio);

    // Minimum height scales with screen - no fixed 320px that could overflow
    const minHeight = isSmallPhone ? Math.min(250, availableH) : Math.min(320, availableH);

    return { width: maxW, height: Math.max(cardH, minHeight) };
  }, [width, height, isLandscape, isTablet, insets, isSmallPhone, isLandscapePhone]);

  // Animation interpolations
  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, swipeThreshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-swipeThreshold, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextScale = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [1, 0.92, 1],
    extrapolate: 'clamp',
  });

  const nextProfile = profiles[currentIndex + 1] || null;

  // Swipe handler
  const completeSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (!currentProfile) return;

      // Add to swipe history for UI undo
      setSwipeHistory(prev => [...prev.slice(-4), { id: currentProfile.id, direction }]);

      // Only call API if this profile hasn't been swiped before
      // (prevents "already swiped" error when re-swiping after undo)
      if (!swipedProfileIds.has(currentProfile.id)) {
        // Mark as swiped
        setSwipedProfileIds(prev => new Set(prev).add(currentProfile.id));

        // Record swipe on server
        if (direction === 'right') {
          await swipeRight(currentProfile.id);
        } else {
          await swipeLeft(currentProfile.id);
        }
      }

      goToNext();
      position.setValue({ x: 0, y: 0 });
      setIsAnimating(false);
    },
    [currentProfile, swipeRight, swipeLeft, goToNext, position, swipedProfileIds]
  );

  // Undo handler - go back to previous profile
  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    // Go back to previous profile
    const success = goToPrevious();
    if (success) {
      triggerHaptic('medium');
      // Remove the last swipe from history
      setSwipeHistory(prev => prev.slice(0, -1));
      // Reset card position to center
      position.setValue({ x: 0, y: 0 });
    }
  }, [canUndo, goToPrevious, position]);

  // Animate card out
  const animateOut = useCallback(
    (direction: 'left' | 'right') => {
      setIsAnimating(true);
      const toX = direction === 'right' ? width + 100 : -width - 100;

      Animated.timing(position, {
        toValue: { x: toX, y: 0 },
        duration: SWIPE_OUT_DURATION,
        useNativeDriver: true,
      }).start(() => completeSwipe(direction));
    },
    [position, width, completeSwipe]
  );

  // Pan responder with native driver
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isAnimating,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
        onPanResponderMove: Animated.event(
          [null, { dx: position.x, dy: position.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: (_, g) => {
          if (g.dx > swipeThreshold || (g.dx > 50 && g.vx > 0.5)) {
            triggerHaptic('success');
            animateOut('right');
          } else if (g.dx < -swipeThreshold || (g.dx < -50 && g.vx < -0.5)) {
            triggerHaptic('medium');
            animateOut('left');
          } else {
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              friction: 5,
              tension: 100,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [isAnimating, position, swipeThreshold, animateOut]
  );

  // Button handlers
  const handlePass = useCallback(() => {
    if (!hasProfiles || isAnimating) return;
    triggerHaptic('medium');
    animateOut('left');
  }, [hasProfiles, isAnimating, animateOut]);

  const handleLike = useCallback(() => {
    if (!hasProfiles || isAnimating) return;
    triggerHaptic('success');
    animateOut('right');
  }, [hasProfiles, isAnimating, animateOut]);

  const handleMessage = useCallback(() => {
    if (!matchInfo) return;
    dismissMatchPopup();
    navigation.navigate('MessagesTab', {
      screen: 'Chat',
      params: {
        conversationId: `dm_${Math.min(matchInfo.matchedUserId, matchInfo.matchId)}_${Math.max(matchInfo.matchedUserId, matchInfo.matchId)}`,
        userName: matchInfo.matchedUserDisplayName || matchInfo.matchedUsername || 'Match',
        userPhoto: matchInfo.matchedUserProfilePhotoUrl || undefined,
        userId: matchInfo.matchedUserId,
      },
    });
  }, [matchInfo, dismissMatchPopup, navigation]);

  const handleRetry = useCallback(() => {
    clearError();
    loadProfiles(true);
  }, [clearError, loadProfiles]);

  const handleViewProfile = useCallback(() => {
    triggerHaptic('light');
    setShowProfileModal(true);
  }, []);

  const handleCloseProfileModal = useCallback(() => {
    setShowProfileModal(false);
  }, []);

  // Render cards
  const renderCards = () => {
    if (isLoading) {
      return <LoadingState width={cardDimensions.width} height={cardDimensions.height} />;
    }

    if (error && !hasProfiles) {
      return <EmptyState isError onRetry={handleRetry} message={error} />;
    }

    if (!hasProfiles) {
      return <EmptyState isError={false} onRetry={reset} />;
    }

    const topStyle = {
      transform: [
        { translateX: position.x },
        { translateY: position.y },
        { rotate },
      ],
      zIndex: 2,
    };

    const bottomStyle = {
      transform: [{ scale: nextScale }],
      zIndex: 1,
    };

    return (
      <>
        {nextProfile && (
          <ProfileCard
            profile={nextProfile}
            isTop={false}
            style={bottomStyle}
            panHandlers={{}}
            width={cardDimensions.width}
            height={cardDimensions.height}
            likeOpacity={new Animated.Value(0)}
            nopeOpacity={new Animated.Value(0)}
            onViewProfile={() => {}}
          />
        )}
        {currentProfile && (
          <ProfileCard
            profile={currentProfile}
            isTop
            style={topStyle}
            panHandlers={panResponder.panHandlers}
            width={cardDimensions.width}
            height={cardDimensions.height}
            likeOpacity={likeOpacity}
            nopeOpacity={nopeOpacity}
            onViewProfile={handleViewProfile}
          />
        )}
      </>
    );
  };

  // Landscape layout container - use side-by-side for ALL landscape devices (tablets AND phones)
  // This is more space-efficient on landscape phones where vertical space is limited
  const useLandscapeLayout = isLandscape;
  const containerStyle = useLandscapeLayout ? styles.landscapeMainContainer : styles.main;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Header
        count={profiles.length - currentIndex}
        isTablet={isTablet}
        isLandscape={isLandscape}
        isSmallPhone={isSmallPhone}
      />

      <View style={containerStyle}>
        <View style={[
          styles.cardArea,
          isSmallPhone && !isLandscape && styles.cardAreaSmallPhone,
          useLandscapeLayout && styles.cardAreaLandscape,
          // Give explicit dimensions in landscape since card is position:absolute
          useLandscapeLayout && { width: cardDimensions.width, height: cardDimensions.height },
        ]}>
          {renderCards()}
        </View>

        {hasProfiles && currentProfile && !isLoading && (
          <View style={useLandscapeLayout ? styles.actionsLandscapeWrapper : undefined}>
            <ActionButtonsContainer
              onPass={handlePass}
              onLike={handleLike}
              onUndo={handleUndo}
              disabled={isAnimating}
              canUndo={canUndo}
              isTablet={isTablet}
              isLandscape={isLandscape}
              isSmallPhone={isSmallPhone}
            />
          </View>
        )}
      </View>

      <MatchModal
        visible={showMatchPopup}
        name={matchInfo?.matchedUserDisplayName || matchInfo?.matchedUsername || 'Someone'}
        photo={matchInfo?.matchedUserProfilePhotoUrl || null}
        onClose={dismissMatchPopup}
        onMessage={handleMessage}
      />

      <ProfileModal
        visible={showProfileModal}
        profile={currentProfile}
        onClose={handleCloseProfileModal}
        onLike={handleLike}
        onPass={handlePass}
      />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerTablet: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  headerLandscapePhone: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerSmallPhone: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.orange[500],
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE_MINIMUM, // Increased from 13 for senior readability
    color: colors.gray[500],
    marginTop: 2,
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },
  headerBtn: {
    width: TOUCH_TARGET_MINIMUM,
    height: TOUCH_TARGET_MINIMUM,
    borderRadius: TOUCH_TARGET_MINIMUM / 2,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44, // WCAG minimum
    minHeight: 44, // WCAG minimum
  },

  // Premium header styles
  headerPremium: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitlePremium: {
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.orange[500],
  },
  headerSubtitlePremium: {
    color: colors.gray[400],
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  headerBtnPremium: {
    backgroundColor: '#F8F9FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Main layout
  main: {
    flex: 1,
  },
  landscapeMainContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cardAreaSmallPhone: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cardAreaLandscape: {
    // Explicit width/height set inline for landscape
    flex: 0,
    paddingHorizontal: 0,
  },
  actionsLandscapeWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card - Premium styling
  card: {
    position: 'absolute',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    // Premium multi-layer shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  cardInfoCompact: {
    padding: 16,
  },
  cardInfoVeryCompact: {
    padding: 12,
  },

  // Name row
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 6,
  },
  nameText: {
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  ageText: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    flex: 1,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  tagCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagMore: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tagText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // View Profile button
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minHeight: TOUCH_TARGET_MINIMUM,
  },
  viewProfileBtnCompact: {
    paddingVertical: 12,
  },
  viewProfileBtnVeryCompact: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
    minHeight: 44, // Still meets WCAG minimum
    borderRadius: 22,
  },
  viewProfileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Verified badge
  verifiedBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    borderRadius: 24,
    minHeight: 44, // WCAG minimum touch target
  },
  verifiedText: {
    color: '#fff',
    fontSize: FONT_SIZE_MINIMUM, // Increased from 14 for readability
    fontWeight: '600',
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },

  // Online badge
  onlineBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    minHeight: 44, // WCAG minimum touch target
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
  },
  onlineDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    color: '#fff',
    fontSize: FONT_SIZE_MINIMUM, // Increased from 14 for readability
    fontWeight: '600',
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },

  // Swipe stamps
  stamp: {
    position: 'absolute',
    top: 60,
    zIndex: 10,
  },
  stampLeft: {
    left: 20,
    transform: [{ rotate: '-15deg' }],
  },
  stampRight: {
    right: 20,
    transform: [{ rotate: '15deg' }],
  },
  stampInner: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stampText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // Action buttons
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 36,
    paddingVertical: 14,
    paddingHorizontal: 24,
    paddingBottom: 100, // Padding for premium tab bar
    backgroundColor: colors.gray[50],
  },
  actionsContainerLandscape: {
    // Landscape - horizontal layout next to card
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  actionsContainerSmallPhone: {
    // Small phones - reduce spacing but keep tab bar padding
    gap: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 100, // Padding for premium tab bar
  },
  undoBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  undoBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnWrapper: {
    alignItems: 'center',
  },
  actionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  actionBtnPrimary: {
    shadowOpacity: 0.25,
    elevation: 6,
    borderWidth: 0,
  },
  actionLabel: {
    marginTop: 8,
    fontSize: FONT_SIZE_MINIMUM,
    fontWeight: '600',
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },
  actionLabelLandscape: {
    marginTop: 4,
    fontSize: FONT_SIZE_MINIMUM, // Keep 16px minimum even in landscape
  },

  // Loading
  loadingCard: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: FONT_SIZE_BODY,
    color: colors.gray[600],
    fontWeight: '500',
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },

  // Empty state - responsive for all screen sizes
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.orange[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconError: {
    backgroundColor: 'rgba(255, 90, 95, 0.1)',
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 10,
    lineHeight: 26 * LINE_HEIGHT_MULTIPLIER,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE_BODY,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
    paddingHorizontal: 16, // Prevent text from touching edges on small screens
  },
  emptyBtn: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 18,
    minHeight: TOUCH_TARGET_MINIMUM,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE_BODY,
    fontWeight: '700',
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },

  // Match modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
  },
  modalContentTablet: {
    maxWidth: 440,
    padding: 40,
  },
  modalHeart: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#fff',
    marginBottom: 24,
  },
  modalAvatarTablet: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  modalAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInitial: {
    fontSize: 44,
    fontWeight: '700',
    color: '#fff',
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 32,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET_MINIMUM,
  },
  modalPrimaryBtnTablet: {
    minHeight: 64,
    paddingVertical: 18,
  },
  modalPrimaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.orange[500],
  },
  modalSecondaryBtn: {
    paddingVertical: 14,
    minHeight: TOUCH_TARGET_MINIMUM, // Senior-friendly touch target
  },
  modalSecondaryText: {
    fontSize: FONT_SIZE_BODY,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },

  // Profile Modal
  profileModal: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  profileModalHeaderTablet: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  profileModalClose: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalCloseTablet: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileModalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  profileModalScroll: {
    flex: 1,
  },
  profileModalScrollContent: {
    paddingBottom: 24,
  },
  profileModalInfo: {
    padding: 24,
  },

  // Profile Modal Name Row
  profileModalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  profileModalNameRowTablet: {
    gap: 16,
    marginBottom: 18,
  },
  profileModalName: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.gray[900],
  },
  profileModalAge: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.gray[500],
  },
  profileModalVerified: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile Modal Location
  profileModalLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  profileModalLocationText: {
    fontSize: FONT_SIZE_BODY,
    color: colors.gray[600],
    fontWeight: '500',
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },

  // Profile Modal Status Row
  profileModalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  profileModalDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileModalDistanceText: {
    fontSize: FONT_SIZE_MINIMUM,
    color: colors.teal[600],
    fontWeight: '500',
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },
  profileModalOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileModalOnlineText: {
    fontSize: FONT_SIZE_MINIMUM,
    color: '#22C55E',
    fontWeight: '500',
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },

  // Compatibility Score - Premium animated display
  compatibilityContainer: {
    marginBottom: 24,
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderRadius: 24,
  },
  compatibilityContainerTablet: {
    marginBottom: 28,
  },
  compatibilityGradient: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.orange[100],
  },
  compatibilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  compatibilityCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compatibilityNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gray[900],
  },
  compatibilityInfo: {
    flex: 1,
  },
  compatibilityLabel: {
    fontSize: FONT_SIZE_MINIMUM,
    color: colors.gray[500],
    fontWeight: '500',
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },
  compatibilityStatus: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Story Section
  storySection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  storySectionTablet: {
    padding: 28,
    borderRadius: 28,
  },
  storySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  storyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyHeaderText: {
    flex: 1,
  },
  storySectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
  },
  storySubtitle: {
    fontSize: FONT_SIZE_MINIMUM,
    color: colors.gray[500],
    marginTop: 2,
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },
  storyContent: {
    backgroundColor: colors.orange[50],
    borderRadius: 20,
    padding: 24,
    paddingTop: 14,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange[400],
  },
  storyContentTablet: {
    padding: 28,
    paddingTop: 16,
  },
  storyQuote: {
    fontSize: 52,
    fontWeight: '700',
    color: colors.orange[300],
    lineHeight: 52,
    marginBottom: -14,
    marginTop: -8,
  },
  storyText: {
    fontSize: FONT_SIZE_BODY,
    color: colors.gray[800],
    lineHeight: FONT_SIZE_BODY * 1.67, // Slightly higher line height for story readability
    fontStyle: 'italic',
  },
  noStory: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
    padding: 36,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderStyle: 'dashed',
  },
  noStoryTablet: {
    padding: 44,
  },
  noStoryText: {
    fontSize: FONT_SIZE_BODY,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },
  noStoryHint: {
    fontSize: FONT_SIZE_MINIMUM,
    color: colors.gray[400],
    textAlign: 'center',
    marginTop: 8,
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },

  // Rewrite Story Button
  rewriteStoryBtn: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  rewriteStoryBtnTablet: {
    borderRadius: 36,
  },
  rewriteStoryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 28,
    minHeight: 60,
  },
  rewriteStoryBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE_BODY,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },

  // Interests Section
  interestsSection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  interestsSectionTablet: {
    padding: 28,
    borderRadius: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestsTagsTablet: {
    gap: 14,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: colors.orange[50],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.orange[100],
  },
  interestTagTablet: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 28,
  },
  interestTagText: {
    fontSize: FONT_SIZE_MINIMUM,
    fontWeight: '600',
    color: colors.orange[600],
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },
  interestTagTextTablet: {
    fontSize: FONT_SIZE_BODY,
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },

  // Profile Modal Actions
  profileModalActions: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  profileModalActionsTablet: {
    gap: 24,
    padding: 24,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  profileModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 32,
    minHeight: 64,
  },
  profileModalBtnTablet: {
    minHeight: 72,
    borderRadius: 36,
  },
  profileModalBtnPass: {
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#FF5A5F',
    shadowColor: '#FF5A5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  profileModalBtnLike: {
    backgroundColor: colors.teal[500],
    shadowColor: colors.teal[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  profileModalBtnText: {
    fontSize: FONT_SIZE_BODY,
    fontWeight: '700',
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },

  // Landscape layouts for ProfileModal
  landscapeModalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapePhotoSection: {
    // Width is set dynamically in component
    // Photo fills the entire left section with no black bars
    overflow: 'hidden',
  },
  landscapeRightSection: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  landscapeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  landscapeInfoSection: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  landscapeInfoContent: {
    padding: 20,
    paddingBottom: 24,
  },
  profileModalActionsLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },

  // Photo Carousel - Premium styles
  progressBarContainer: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 8,
  },
  progressBarContainerTablet: {
    top: 20,
    left: 24,
    right: 24,
    gap: 10,
  },
  progressBarTouchable: {
    flex: 1,
    height: 44, // WCAG minimum touch target
    justifyContent: 'center',
    minHeight: 44,
  },
  progressBarTouchableTablet: {
    height: TOUCH_TARGET_MINIMUM,
    minHeight: TOUCH_TARGET_MINIMUM,
  },
  progressBar: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarTablet: {
    height: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.orange[500],
    borderRadius: 3,
  },
  photoCounter: {
    position: 'absolute',
    top: 60,
    right: 16,
    overflow: 'hidden',
    borderRadius: 24,
  },
  photoCounterTablet: {
    top: 72,
    right: 20,
  },
  photoCounterGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  photoCounterText: {
    color: '#fff',
    fontSize: FONT_SIZE_MINIMUM,
    fontWeight: '700',
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -32,
    overflow: 'hidden',
    borderRadius: 32,
  },
  carouselArrowTablet: {
    marginTop: -36,
  },
  carouselArrowGradient: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 32,
  },
  carouselArrowLeft: {
    left: 16,
  },
  carouselArrowRight: {
    right: 16,
  },
  carouselVerifiedBadge: {
    position: 'absolute',
    top: 60,
    left: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  carouselVerifiedBadgeTablet: {
    top: 72,
    left: 20,
  },
  carouselBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
  },
  carouselBadgeText: {
    color: '#fff',
    fontSize: FONT_SIZE_MINIMUM, // Increased from 14 for readability
    fontWeight: '700',
  },
  carouselOnlineBadge: {
    position: 'absolute',
    top: 108,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
  },
  carouselOnlineBadgeTablet: {
    top: 124,
    left: 20,
  },
  carouselOnlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  carouselOnlineText: {
    color: '#fff',
    fontSize: FONT_SIZE_MINIMUM, // Increased from 14 for readability
    fontWeight: '600',
  },
  swipeHint: {
    position: 'absolute',
    top: '50%',
    right: 24,
    marginTop: -20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  swipeHintText: {
    color: '#fff',
    fontSize: FONT_SIZE_MINIMUM,
    fontWeight: '600',
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },

  // Compatibility Score - Premium animated styles
  compatibilityGradientTablet: {
    padding: 24,
    borderRadius: 24,
  },
  compatibilityScoreWrapper: {
    position: 'relative',
  },
  compatibilityCircleTablet: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  compatibilityCircleInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compatibilityCircleInnerTablet: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  compatibilitySparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.teal[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  compatibilityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  compatibilityDescription: {
    fontSize: FONT_SIZE_MINIMUM,
    color: colors.gray[500],
    marginTop: 4,
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },
  compatibilityIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  compatibilityIconWrapperTablet: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  compatibilityIconBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Rewrite Modal - Premium styles
  rewriteModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  rewriteModalKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  rewriteModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  rewriteModalContentTablet: {
    borderRadius: 32,
    marginHorizontal: 'auto',
    marginBottom: 40,
    maxHeight: '85%',
  },
  rewriteModalContentLandscapePhone: {
    borderRadius: 24,
    marginHorizontal: 'auto',
    marginVertical: 'auto',
    alignSelf: 'center',
  },
  rewriteModalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: -8,
  },
  rewriteModalHandleBar: {
    width: 48,
    height: 5,
    backgroundColor: colors.gray[300],
    borderRadius: 3,
  },
  rewriteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  rewriteModalHeaderTablet: {
    marginBottom: 28,
  },
  rewriteModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  rewriteModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewriteModalIconTablet: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  rewriteModalTitleContainer: {
    flex: 1,
  },
  rewriteModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
  },
  rewriteModalTitleTablet: {
    fontSize: 26,
  },
  rewriteModalSubtitle: {
    fontSize: FONT_SIZE_MINIMUM,
    color: colors.gray[500],
    marginTop: 4,
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },
  rewriteModalSubtitleTablet: {
    fontSize: 17,
  },
  rewriteModalClose: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewriteModalCloseTablet: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  suggestedSection: {
    marginBottom: 16,
  },
  suggestedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  suggestedLinesLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
  },
  suggestedLinesLabelTablet: {
    fontSize: 20,
  },
  suggestedHint: {
    fontSize: FONT_SIZE_MINIMUM,
    color: colors.gray[500],
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
  },
  suggestedLinesScroll: {
    marginBottom: 24,
  },
  suggestedLinesContent: {
    gap: 14,
    paddingRight: 24,
  },
  suggestedLineChip: {
    backgroundColor: colors.gray[50],
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    maxWidth: 300,
    minWidth: 220,
    minHeight: TOUCH_TARGET_MINIMUM, // Senior-friendly touch target
    borderWidth: 2,
    borderColor: colors.gray[200],
    flexDirection: 'column',
    gap: 10,
  },
  suggestedLineChipTablet: {
    maxWidth: 340,
    minWidth: 260,
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderRadius: 24,
    minHeight: TOUCH_TARGET_COMFORTABLE,
  },
  suggestedLineChipSelected: {
    backgroundColor: '#fff',
    borderWidth: 2,
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestedLineIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestedLineText: {
    fontSize: FONT_SIZE_MINIMUM,
    color: colors.gray[600],
    lineHeight: FONT_SIZE_MINIMUM * LINE_HEIGHT_MULTIPLIER,
    fontWeight: '500',
  },
  suggestedLineTextTablet: {
    fontSize: FONT_SIZE_BODY,
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },
  suggestedLineCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewriteInputContainer: {
    backgroundColor: colors.gray[50],
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.gray[200],
    marginBottom: 24,
    overflow: 'hidden',
  },
  rewriteInputContainerTablet: {
    borderRadius: 24,
  },
  rewriteInputContainerFocused: {
    borderColor: colors.orange[400],
    backgroundColor: '#fff',
  },
  rewriteInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  rewriteInputLabel: {
    fontSize: FONT_SIZE_MINIMUM,
    fontWeight: '600',
    color: colors.gray[600],
  },
  rewriteInput: {
    fontSize: FONT_SIZE_BODY,
    color: colors.gray[900],
    minHeight: 120,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },
  rewriteInputTablet: {
    fontSize: 20,
    minHeight: 140,
    lineHeight: 20 * LINE_HEIGHT_MULTIPLIER,
  },
  rewriteInputLandscapePhone: {
    minHeight: 70,
    paddingBottom: 12,
  },
  rewriteCharCount: {
    fontSize: FONT_SIZE_MINIMUM, // Increased from 14 for readability
    fontWeight: '600',
  },
  rewriteModalActions: {
    flexDirection: 'row',
    gap: 16,
  },
  rewriteModalActionsTablet: {
    gap: 20,
  },
  rewriteCancelBtn: {
    flex: 0.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    backgroundColor: colors.gray[100],
    borderRadius: 32,
    minHeight: 60,
  },
  rewriteCancelBtnTablet: {
    minHeight: 68,
    borderRadius: 34,
  },
  rewriteCancelText: {
    fontSize: FONT_SIZE_BODY,
    fontWeight: '600',
    color: colors.gray[600],
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },
  rewriteCancelTextTablet: {
    fontSize: 20,
  },
  rewriteSendBtn: {
    flex: 0.6,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  rewriteSendBtnTablet: {
    borderRadius: 34,
  },
  rewriteSendBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  rewriteSendBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    minHeight: 60,
  },
  rewriteSendBtnGradientTablet: {
    minHeight: 68,
    gap: 14,
  },
  rewriteSendText: {
    fontSize: FONT_SIZE_BODY,
    fontWeight: '700',
    color: '#fff',
    lineHeight: FONT_SIZE_BODY * LINE_HEIGHT_MULTIPLIER,
  },
  rewriteSendTextTablet: {
    fontSize: 20,
  },
});

export default DiscoveryScreen;
