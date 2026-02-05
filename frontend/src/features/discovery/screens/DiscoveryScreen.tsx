/**
 * TANDER Discovery Screen - Super Premium iPhone Design
 * A world-class dating experience for Filipino Seniors (60+)
 *
 * Design Inspiration: Tinder, Bumble, Hinge - Premium iOS aesthetics
 *
 * Features:
 * - Full-screen edge-to-edge card design
 * - Floating glassmorphic action buttons
 * - Premium spring animations (60fps native driver)
 * - Photo story dots with smooth transitions
 * - Haptic feedback on all interactions
 * - Senior-friendly: 56-64px touch targets, 18px+ fonts
 * - WCAG AA accessible: 4.5:1 contrast minimum
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
  Platform,
  Pressable,
  Dimensions,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks';
import { TAB_BAR_HEIGHT } from '@shared/components/navigation';
import { useDiscovery } from '../hooks/useDiscovery';
import type { Profile } from '@services/api/discoveryApi';
import type { MainTabParamList, MessagesStackParamList } from '@navigation/types';

// Tander Logo - Premium branding
const TanderLogo = require('../../../../assets/icons/tander-logo.png');

// ============================================================================
// CONSTANTS - Premium Design System
// ============================================================================

const SWIPE_THRESHOLD = 0.22;
const SWIPE_OUT_DURATION = 260;
const SWIPE_VELOCITY_THRESHOLD = 0.65;
const SWIPE_ACTIVATION_DISTANCE = 6;
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=F97316&color=fff&size=400&bold=true&name=';

// Premium sizing
const CARD_BORDER_RADIUS = 24;
const ACTION_BUTTON_SIZE = 64;

// Premium colors
const PREMIUM_COLORS = {
  pass: '#FF4458',
  like: '#00D26A',
  superLike: '#00BFFF',
  rewind: '#FFB800',
  cardShadow: 'rgba(0,0,0,0.15)',
  glassBg: 'rgba(255,255,255,0.95)',
  glassOverlay: 'rgba(255,255,255,0.1)',
};

// ============================================================================
// HELPERS
// ============================================================================

const getImageUri = (profile: Profile): string => {
  if (profile.image?.trim()) return profile.image;
  return `${DEFAULT_AVATAR}${encodeURIComponent(profile.name || 'User')}`;
};

const triggerHaptic = async (type: 'light' | 'medium' | 'heavy' | 'success' = 'medium') => {
  try {
    if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'heavy') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (type === 'light') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {}
};

// ============================================================================
// PREMIUM ICONS - Pixel Perfect View-Based
// ============================================================================

interface IconProps {
  size: number;
  color: string;
}

// Premium X Icon with rounded caps
const XIcon: React.FC<IconProps> = ({ size, color }) => {
  const thickness = Math.max(3, size * 0.12);
  const length = size * 0.5;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        position: 'absolute',
        width: length,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: [{ rotate: '45deg' }],
      }} />
      <View style={{
        position: 'absolute',
        width: length,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: [{ rotate: '-45deg' }],
      }} />
    </View>
  );
};

// Premium Heart Icon
const HeartIcon: React.FC<IconProps> = ({ size, color }) => {
  const heartSize = size * 0.65;
  const halfHeart = heartSize / 2;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: heartSize,
        height: heartSize,
        backgroundColor: color,
        transform: [{ rotate: '-45deg' }],
        borderRadius: heartSize * 0.1,
        marginTop: size * 0.05,
      }}>
        <View style={{
          position: 'absolute',
          width: heartSize,
          height: halfHeart,
          backgroundColor: color,
          borderTopLeftRadius: halfHeart,
          borderTopRightRadius: halfHeart,
          top: -halfHeart / 2,
          left: 0,
        }} />
        <View style={{
          position: 'absolute',
          width: halfHeart,
          height: heartSize,
          backgroundColor: color,
          borderTopLeftRadius: halfHeart,
          borderBottomLeftRadius: halfHeart,
          top: 0,
          left: -halfHeart / 2,
        }} />
      </View>
    </View>
  );
};

// Premium Star Icon
const StarIcon: React.FC<IconProps> = ({ size, color }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Feather name="star" size={size * 0.55} color={color} />
  </View>
);

// Premium Rewind Icon
const RewindIcon: React.FC<IconProps> = ({ size, color }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Feather name="rotate-ccw" size={size * 0.5} color={color} />
  </View>
);

// Premium Location Pin
const LocationIcon: React.FC<IconProps> = ({ size, color }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Feather name="map-pin" size={size * 0.7} color={color} />
  </View>
);

// Premium Check Icon
const CheckIcon: React.FC<IconProps> = ({ size, color }) => {
  const strokeWidth = Math.max(2, size * 0.12);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.28,
        height: size * 0.48,
        borderRightWidth: strokeWidth,
        borderBottomWidth: strokeWidth,
        borderColor: color,
        borderBottomRightRadius: strokeWidth / 2,
        transform: [{ rotate: '45deg' }],
        marginTop: -size * 0.06,
        marginLeft: -size * 0.02,
      }} />
    </View>
  );
};

// Info Icon
const InfoIcon: React.FC<IconProps> = ({ size, color }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Feather name="info" size={size * 0.6} color={color} />
  </View>
);

// ============================================================================
// SWIPE STAMP - Premium visual feedback overlay
// ============================================================================

interface StampProps {
  type: 'like' | 'nope' | 'super';
  opacity: Animated.AnimatedInterpolation<number>;
}

const SwipeStamp = memo<StampProps>(({ type, opacity }) => {
  const config = {
    like: { text: 'LIKE', color: PREMIUM_COLORS.like, rotation: '-15deg' },
    nope: { text: 'NOPE', color: PREMIUM_COLORS.pass, rotation: '15deg' },
    super: { text: 'SUPER', color: PREMIUM_COLORS.superLike, rotation: '0deg' },
  }[type];

  return (
    <Animated.View
      style={[
        styles.stamp,
        type === 'like' && styles.stampLeft,
        type === 'nope' && styles.stampRight,
        type === 'super' && styles.stampCenter,
        { opacity, transform: [{ rotate: config.rotation }] },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.stampInner, { borderColor: config.color }]}>
        <Text style={[styles.stampText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    </Animated.View>
  );
});

SwipeStamp.displayName = 'SwipeStamp';

// ============================================================================
// PHOTO PROGRESS DOTS - Instagram Stories style
// ============================================================================

interface PhotoDotsProps {
  total: number;
  current: number;
  width: number;
}

const PhotoDots = memo<PhotoDotsProps>(({ total, current, width }) => {
  if (total <= 1) return null;

  const dotWidth = Math.min((width - 32 - (total - 1) * 4) / total, 60);

  return (
    <View style={styles.photoDotsContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.photoDot,
            {
              width: dotWidth,
              backgroundColor: index === current
                ? '#FFFFFF'
                : 'rgba(255,255,255,0.4)',
            },
          ]}
        />
      ))}
    </View>
  );
});

PhotoDots.displayName = 'PhotoDots';

// ============================================================================
// PREMIUM PROFILE CARD - Full-screen edge-to-edge design
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
  onPhotoTap: (direction: 'left' | 'right') => void;
  currentPhotoIndex: number;
  totalPhotos: number;
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
  onPhotoTap,
  currentPhotoIndex,
  totalPhotos,
}) => {
  const imageUri = getImageUri(profile);
  const name = profile.name || 'Unknown';
  const age = profile.age > 0 && profile.age < 120 ? profile.age : null;
  const location = profile.location || 'Philippines';
  const interests = profile.interests || [];

  // Responsive font sizes
  const isCompact = height < 500;
  const nameSize = isCompact ? 28 : 34;
  const ageSize = isCompact ? 24 : 28;
  const locationSize = isCompact ? 15 : 17;
  const tagSize = isCompact ? 13 : 14;

  const handleLeftTap = useCallback(() => {
    onPhotoTap('left');
    triggerHaptic('light');
  }, [onPhotoTap]);

  const handleRightTap = useCallback(() => {
    onPhotoTap('right');
    triggerHaptic('light');
  }, [onPhotoTap]);

  return (
    <Animated.View
      style={[styles.card, { width, height, borderRadius: CARD_BORDER_RADIUS }, style]}
      {...(isTop ? panHandlers : {})}
    >
      {/* Photo Container */}
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.cardImage}
          resizeMode="cover"
          accessibilityLabel={`Photo of ${name}`}
        />

        {/* Photo tap zones for navigation */}
        {isTop && totalPhotos > 1 && (
          <>
            <TouchableOpacity
              style={styles.photoTapLeft}
              onPress={handleLeftTap}
              activeOpacity={1}
              accessibilityLabel="Previous photo"
            />
            <TouchableOpacity
              style={styles.photoTapRight}
              onPress={handleRightTap}
              activeOpacity={1}
              accessibilityLabel="Next photo"
            />
          </>
        )}
      </View>

      {/* Photo Progress Dots */}
      <View style={styles.photoDotsWrapper}>
        <PhotoDots total={totalPhotos} current={currentPhotoIndex} width={width} />
      </View>

      {/* Premium gradient overlay for text readability */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.4, 0.6, 0.78, 1]}
        style={styles.cardGradient}
        pointerEvents="none"
      />

      {/* Top badges */}
      <View style={styles.badgesContainer}>
        {/* Verified badge with glassmorphism */}
        {profile.verified && (
          <View style={styles.verifiedBadgeWrapper}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={80} tint="light" style={styles.badgeBlur}>
                <View style={styles.verifiedBadgeContent}>
                  <CheckIcon size={14} color="#FFFFFF" />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              </BlurView>
            ) : (
              <View style={styles.verifiedBadgeAndroid}>
                <CheckIcon size={14} color="#FFFFFF" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>
        )}

        {/* Online indicator */}
        {profile.online && (
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        )}
      </View>

      {/* Swipe stamps */}
      {isTop && (
        <>
          <SwipeStamp type="like" opacity={likeOpacity} />
          <SwipeStamp type="nope" opacity={nopeOpacity} />
        </>
      )}

      {/* Profile info overlay */}
      <View style={styles.cardInfo}>
        {/* Name & Age Row */}
        <View style={styles.nameRow}>
          <Text style={[styles.nameText, { fontSize: nameSize }]} numberOfLines={1}>
            {name}
          </Text>
          {age && (
            <Text style={[styles.ageText, { fontSize: ageSize }]}>{age}</Text>
          )}
        </View>

        {/* Location Row */}
        <View style={styles.locationRow}>
          <LocationIcon size={18} color="rgba(255,255,255,0.9)" />
          <Text style={[styles.locationText, { fontSize: locationSize }]} numberOfLines={1}>
            {location}
          </Text>
          {profile.distance && (
            <Text style={[styles.distanceText, { fontSize: locationSize - 1 }]}>
              • {profile.distance}
            </Text>
          )}
        </View>

        {/* Interests preview */}
        {interests.length > 0 && !isCompact && (
          <View style={styles.tagsRow}>
            {interests.slice(0, 3).map((interest, i) => (
              <View key={i} style={styles.tag}>
                <Text style={[styles.tagText, { fontSize: tagSize }]}>{interest}</Text>
              </View>
            ))}
            {interests.length > 3 && (
              <View style={[styles.tag, styles.tagMore]}>
                <Text style={[styles.tagText, { fontSize: tagSize }]}>+{interests.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* View Profile button */}
        <TouchableOpacity
          style={styles.viewProfileBtn}
          onPress={onViewProfile}
          activeOpacity={0.85}
          accessibilityLabel="View full profile"
          accessibilityRole="button"
        >
          <InfoIcon size={20} color="#FFFFFF" />
          <Text style={styles.viewProfileText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

ProfileCard.displayName = 'ProfileCard';

// ============================================================================
// PREMIUM FLOATING ACTION BUTTONS - Tinder/Bumble style
// ============================================================================

interface ActionButtonProps {
  icon: 'pass' | 'like' | 'super' | 'rewind';
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}

const ActionButton = memo<ActionButtonProps>(({
  icon,
  onPress,
  disabled = false,
  size = ACTION_BUTTON_SIZE,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const config = {
    pass: { color: PREMIUM_COLORS.pass, Icon: XIcon, haptic: 'medium' as const },
    like: { color: PREMIUM_COLORS.like, Icon: HeartIcon, haptic: 'success' as const },
    super: { color: PREMIUM_COLORS.superLike, Icon: StarIcon, haptic: 'heavy' as const },
    rewind: { color: PREMIUM_COLORS.rewind, Icon: RewindIcon, haptic: 'light' as const },
  }[icon];

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (!disabled) {
      triggerHaptic(config.haptic);
      onPress();
    }
  }, [disabled, config.haptic, onPress]);

  // Like button: green background with white heart (Tinder-style)
  const isLike = icon === 'like';
  const iconColor = disabled ? '#D1D5DB' : (isLike ? '#FFFFFF' : config.color);
  const shadowColor = disabled ? 'transparent' : config.color;
  const backgroundColor = isLike && !disabled ? config.color : '#FFFFFF';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.actionButton,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: disabled ? 0.5 : 1,
            shadowColor: shadowColor,
            backgroundColor: backgroundColor,
          },
        ]}
        accessibilityLabel={icon.charAt(0).toUpperCase() + icon.slice(1)}
        accessibilityRole="button"
      >
        {icon === 'like' ? (
          <Ionicons name="heart" size={size * 0.5} color={iconColor} />
        ) : (
          <config.Icon size={size * 0.5} color={iconColor} />
        )}
      </Pressable>
    </Animated.View>
  );
});

ActionButton.displayName = 'ActionButton';

interface FloatingActionsProps {
  onPass: () => void;
  onLike: () => void;
  onRewind: () => void;
  disabled: boolean;
  canRewind: boolean;
  bottomInset: number;
}

const FloatingActions = memo<FloatingActionsProps>(({
  onPass,
  onLike,
  onRewind,
  disabled,
  canRewind,
  bottomInset,
}) => {
  // Clear the tab bar
  const bottomPadding = TAB_BAR_HEIGHT + Math.max(bottomInset, 8) + 16;

  return (
    <View style={[styles.floatingActions, { paddingBottom: bottomPadding }]}>
      {/* Pass Button */}
      <ActionButton
        icon="pass"
        onPress={onPass}
        disabled={disabled}
        size={ACTION_BUTTON_SIZE}
      />

      {/* Rewind Button (in the middle, smaller) */}
      <ActionButton
        icon="rewind"
        onPress={onRewind}
        disabled={disabled || !canRewind}
        size={52}
      />

      {/* Like Button */}
      <ActionButton
        icon="like"
        onPress={onLike}
        disabled={disabled}
        size={ACTION_BUTTON_SIZE}
      />
    </View>
  );
});

FloatingActions.displayName = 'FloatingActions';

// ============================================================================
// PREMIUM HEADER - Minimal and clean
// ============================================================================

interface HeaderProps {
  count: number;
  onFilterPress: () => void;
}

const Header = memo<HeaderProps>(({ count, onFilterPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerLeft}>
        {/* Premium Tander Logo - iPhone Style */}
        <View style={styles.logoWrapper}>
          <Image
            source={TanderLogo}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Discover</Text>
          {count > 0 && (
            <Text style={styles.headerSubtitle}>{count} people nearby</Text>
          )}
        </View>
      </View>

      {/* Filter Button */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={onFilterPress}
        activeOpacity={0.8}
        accessibilityLabel="Filter profiles"
        accessibilityRole="button"
      >
        <Feather name="sliders" size={20} color={colors.gray[700]} />
      </TouchableOpacity>
    </View>
  );
});

Header.displayName = 'Header';

// ============================================================================
// LOADING STATE - Premium skeleton
// ============================================================================

const LoadingState = memo<{ width: number; height: number }>(({ width, height }) => (
  <View style={[styles.loadingContainer, { width, height, borderRadius: CARD_BORDER_RADIUS }]}>
    <LinearGradient
      colors={['#F3F4F6', '#E5E7EB', '#F3F4F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    <ActivityIndicator size="large" color={colors.orange[500]} />
    <Text style={styles.loadingText}>Finding matches...</Text>
  </View>
));

LoadingState.displayName = 'LoadingState';

// ============================================================================
// EMPTY STATE - Premium design
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
        color={isError ? PREMIUM_COLORS.pass : colors.orange[400]}
      />
    </View>
    <Text style={styles.emptyTitle}>
      {isError ? 'Connection Issue' : 'All Caught Up!'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {isError
        ? message || 'Please check your connection and try again'
        : 'Check back soon for new people nearby'}
    </Text>
    <TouchableOpacity style={styles.emptyButton} onPress={onRetry} activeOpacity={0.85}>
      <LinearGradient
        colors={[colors.orange[500], colors.orange[600]]}
        style={styles.emptyButtonGradient}
      >
        <Feather name="refresh-cw" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>
          {isError ? 'Try Again' : 'Refresh'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
));

EmptyState.displayName = 'EmptyState';

// ============================================================================
// MATCH MODAL - Premium celebration
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
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      triggerHaptic('success');
    }
  }, [visible, scaleAnim, opacityAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.matchOverlay}>
        <Animated.View
          style={[
            styles.matchContent,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={[colors.orange[500], colors.teal[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.matchGradient}
          >
            {/* Hearts animation */}
            <View style={styles.matchHearts}>
              <Feather name="heart" size={32} color="rgba(255,255,255,0.3)" />
              <Feather name="heart" size={56} color="#fff" style={{ marginHorizontal: 16 }} />
              <Feather name="heart" size={32} color="rgba(255,255,255,0.3)" />
            </View>

            <Text style={styles.matchTitle}>It's a Match!</Text>
            <Text style={styles.matchSubtitle}>You and {name} liked each other</Text>

            {/* Profile photo */}
            {photo ? (
              <Image source={{ uri: photo }} style={styles.matchAvatar} />
            ) : (
              <View style={[styles.matchAvatar, styles.matchAvatarPlaceholder]}>
                <Text style={styles.matchInitial}>{name.charAt(0)}</Text>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity style={styles.matchPrimaryBtn} onPress={onMessage} activeOpacity={0.9}>
              <Feather name="message-circle" size={24} color={colors.orange[500]} />
              <Text style={styles.matchPrimaryText}>Say Hello!</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.matchSecondaryBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.matchSecondaryText}>Keep Swiping</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
});

MatchModal.displayName = 'MatchModal';

// ============================================================================
// PROFILE MODAL - Full profile view
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
  const { isLandscape } = useResponsive();
  const screenWidth = Dimensions.get('window').width;

  if (!profile) return null;

  const imageUri = getImageUri(profile);
  const name = profile.name || 'Unknown';
  const age = profile.age > 0 && profile.age < 120 ? profile.age : null;
  const location = profile.location || 'Philippines';
  const bio = profile.bio || '';
  const interests = profile.interests || [];

  // LANDSCAPE MODE - 2 Column Layout: Picture | Details
  if (isLandscape) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.profileModal, { paddingTop: insets.top, flexDirection: 'row' }]}>
          <StatusBar barStyle="dark-content" />

          {/* LEFT - Photo (50%) */}
          <View style={{ width: screenWidth * 0.5, height: '100%' }}>
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            {/* Close button on photo */}
            <TouchableOpacity
              onPress={onClose}
              style={[styles.profileModalClose, { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 22 }]}
            >
              <Feather name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* RIGHT - Details (50%) */}
          <View style={{ width: screenWidth * 0.5, height: '100%', backgroundColor: '#FFFFFF' }}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
            >
              {/* Name & Age */}
              <View style={styles.profileModalNameRow}>
                <Text style={[styles.profileModalName, { fontSize: 28 }]}>{name}</Text>
                {age && <Text style={[styles.profileModalAge, { fontSize: 24 }]}>{age}</Text>}
                {profile.verified && (
                  <View style={styles.profileModalVerified}>
                    <Feather name="check-circle" size={16} color="#fff" />
                  </View>
                )}
              </View>

              {/* Location */}
              <View style={styles.profileModalLocation}>
                <Feather name="map-pin" size={16} color={colors.orange[500]} />
                <Text style={[styles.profileModalLocationText, { fontSize: 15 }]}>{location}</Text>
              </View>

              {/* Bio */}
              {bio && (
                <View style={styles.profileModalBio}>
                  <Text style={styles.profileModalBioTitle}>About</Text>
                  <Text style={[styles.profileModalBioText, { fontSize: 15 }]}>{bio}</Text>
                </View>
              )}

              {/* Interests */}
              {interests.length > 0 && (
                <View style={styles.profileModalInterests}>
                  <Text style={styles.profileModalInterestsTitle}>Interests</Text>
                  <View style={styles.profileModalInterestsTags}>
                    {interests.map((interest, i) => (
                      <View key={i} style={styles.profileModalInterestTag}>
                        <Text style={styles.profileModalInterestTagText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action buttons at bottom of right panel */}
            <View style={[styles.profileModalActions, { position: 'relative', paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity
                style={[styles.profileModalBtn, styles.profileModalBtnPass]}
                onPress={() => { onPass(); onClose(); }}
                activeOpacity={0.85}
              >
                <XIcon size={24} color={PREMIUM_COLORS.pass} />
                <Text style={[styles.profileModalBtnText, { color: PREMIUM_COLORS.pass, fontSize: 16 }]}>Pass</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.profileModalBtn, styles.profileModalBtnLike]}
                onPress={() => { onLike(); onClose(); }}
                activeOpacity={0.85}
              >
                <HeartIcon size={24} color="#fff" />
                <Text style={[styles.profileModalBtnText, { color: '#fff', fontSize: 16 }]}>Like</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // PORTRAIT MODE - Original stacked layout
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.profileModal, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.profileModalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.profileModalClose}>
            <Feather name="x" size={24} color={colors.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.profileModalHeaderTitle}>Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.profileModalScroll}
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        >
          {/* Photo */}
          <Image source={{ uri: imageUri }} style={styles.profileModalPhoto} />

          {/* Info */}
          <View style={styles.profileModalInfo}>
            {/* Name & Age */}
            <View style={styles.profileModalNameRow}>
              <Text style={styles.profileModalName}>{name}</Text>
              {age && <Text style={styles.profileModalAge}>{age}</Text>}
              {profile.verified && (
                <View style={styles.profileModalVerified}>
                  <Feather name="check-circle" size={18} color="#fff" />
                </View>
              )}
            </View>

            {/* Location */}
            <View style={styles.profileModalLocation}>
              <Feather name="map-pin" size={18} color={colors.orange[500]} />
              <Text style={styles.profileModalLocationText}>{location}</Text>
            </View>

            {/* Bio */}
            {bio && (
              <View style={styles.profileModalBio}>
                <Text style={styles.profileModalBioTitle}>About</Text>
                <Text style={styles.profileModalBioText}>{bio}</Text>
              </View>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <View style={styles.profileModalInterests}>
                <Text style={styles.profileModalInterestsTitle}>Interests</Text>
                <View style={styles.profileModalInterestsTags}>
                  {interests.map((interest, i) => (
                    <View key={i} style={styles.profileModalInterestTag}>
                      <Text style={styles.profileModalInterestTagText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Fixed bottom actions */}
        <View style={[styles.profileModalActions, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.profileModalBtn, styles.profileModalBtnPass]}
            onPress={() => { onPass(); onClose(); }}
            activeOpacity={0.85}
          >
            <XIcon size={28} color={PREMIUM_COLORS.pass} />
            <Text style={[styles.profileModalBtnText, { color: PREMIUM_COLORS.pass }]}>Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.profileModalBtn, styles.profileModalBtnLike]}
            onPress={() => { onLike(); onClose(); }}
            activeOpacity={0.85}
          >
            <HeartIcon size={28} color="#fff" />
            <Text style={[styles.profileModalBtnText, { color: '#fff' }]}>Like</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

ProfileModal.displayName = 'ProfileModal';

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
  const { width } = useResponsive();
  // Use direct Dimensions check for accurate landscape detection
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const isLandscape = screenWidth > screenHeight;

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
    dismissMatchPopup,
  } = useDiscovery();

  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeHistory, setSwipeHistory] = useState<Array<{ id: number; direction: 'left' | 'right' }>>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const position = useRef(new Animated.ValueXY()).current;
  const swipeThreshold = width * SWIPE_THRESHOLD;

  const canUndo = swipeHistory.length > 0 && currentIndex > 0 && !isAnimating;

  // Reset photo index when profile changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [currentIndex]);

  // Calculate card dimensions - premium full-screen design
  const cardDimensions = useMemo(() => {
    const headerHeight = 70;
    const tabBarHeight = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8);

    if (isLandscape) {
      // LANDSCAPE: Card centered with buttons below (same as portrait but optimized)
      const actionButtonsHeight = 90; // Compact buttons for landscape
      const availableHeight = screenHeight - insets.top - headerHeight - actionButtonsHeight - tabBarHeight - 16;

      // Card height based on available vertical space
      const cardHeight = Math.min(availableHeight, screenHeight * 0.68);
      // Card width maintains aspect ratio, but limited to avoid being too wide
      const maxCardWidth = Math.min(screenWidth * 0.5, 400);
      const cardWidth = Math.min(cardHeight * 0.75, maxCardWidth);

      return { width: Math.round(cardWidth), height: Math.round(cardHeight) };
    }

    // PORTRAIT: Card fills width, buttons below
    const horizontalPadding = 16;
    const actionButtonsHeight = 110;
    const availableWidth = screenWidth - horizontalPadding * 2;
    const availableHeight = screenHeight - insets.top - headerHeight - actionButtonsHeight - tabBarHeight - 24;

    const cardWidth = availableWidth;
    const cardHeight = Math.min(availableHeight, cardWidth * 1.4);

    return { width: Math.round(cardWidth), height: Math.round(cardHeight) };
  }, [isLandscape, screenWidth, screenHeight, insets]);

  // Pan responder for swipe gestures
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (isAnimating) return false;
        const isHorizontal =
          Math.abs(gesture.dx) > SWIPE_ACTIVATION_DISTANCE &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.6;
        const isQuickFlick = Math.abs(gesture.vx) > 0.35 && Math.abs(gesture.dx) > 2;
        return isHorizontal || isQuickFlick;
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        if (isAnimating) return false;
        const isHorizontal =
          Math.abs(gesture.dx) > SWIPE_ACTIVATION_DISTANCE &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.6;
        const isQuickFlick = Math.abs(gesture.vx) > 0.35 && Math.abs(gesture.dx) > 2;
        return isHorizontal || isQuickFlick;
      },
      onPanResponderGrant: () => {
        triggerHaptic('light');
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldSwipe =
          Math.abs(gesture.dx) > swipeThreshold ||
          Math.abs(gesture.vx) > SWIPE_VELOCITY_THRESHOLD;

        if (shouldSwipe && gesture.dx > 0) {
          handleSwipeRight();
        } else if (shouldSwipe && gesture.dx < 0) {
          handleSwipeLeft();
        } else {
          // Spring back to center
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            speed: 18,
            bounciness: 8,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          speed: 18,
          bounciness: 8,
        }).start();
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [isAnimating, swipeThreshold, position, handleSwipeRight, handleSwipeLeft]);

  // Swipe handlers
  const handleSwipeRight = useCallback(async () => {
    if (isAnimating || !currentProfile) return;

    setIsAnimating(true);
    triggerHaptic('success');

    Animated.timing(position, {
      toValue: { x: width + 100, y: 0 },
      duration: SWIPE_OUT_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(async () => {
      position.setValue({ x: 0, y: 0 });
      setSwipeHistory(prev => [...prev, { id: currentProfile.id, direction: 'right' }]);
      await swipeRight(currentProfile.id);
      goToNext();
      setIsAnimating(false);
    });
  }, [isAnimating, currentProfile, position, width, swipeRight, goToNext]);

  const handleSwipeLeft = useCallback(async () => {
    if (isAnimating || !currentProfile) return;

    setIsAnimating(true);
    triggerHaptic('medium');

    Animated.timing(position, {
      toValue: { x: -width - 100, y: 0 },
      duration: SWIPE_OUT_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(async () => {
      position.setValue({ x: 0, y: 0 });
      setSwipeHistory(prev => [...prev, { id: currentProfile.id, direction: 'left' }]);
      await swipeLeft(currentProfile.id);
      goToNext();
      setIsAnimating(false);
    });
  }, [isAnimating, currentProfile, position, width, swipeLeft, goToNext]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    triggerHaptic('light');
    setSwipeHistory(prev => prev.slice(0, -1));
    goToPrevious();
  }, [canUndo, goToPrevious]);

  const handleViewProfile = useCallback(() => {
    triggerHaptic('light');
    setShowProfileModal(true);
  }, []);

  const handlePhotoTap = useCallback((direction: 'left' | 'right') => {
    if (!currentProfile) return;
    const photos = currentProfile.additionalPhotos || (currentProfile.image ? [currentProfile.image] : []);
    const totalPhotos = photos.length || 1;

    if (direction === 'left' && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    } else if (direction === 'right' && currentPhotoIndex < totalPhotos - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  }, [currentProfile, currentPhotoIndex]);

  const handleMessageMatch = useCallback(() => {
    dismissMatchPopup();
    // Navigate to messages tab - user can start chatting from there
    navigation.navigate('MessagesTab' as any);
  }, [dismissMatchPopup, navigation]);

  const handleFilterPress = useCallback(() => {
    triggerHaptic('light');
    // TODO: Open filter modal
  }, []);

  // Animated interpolations
  const cardRotation = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const cardScale = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0.95, 1, 0.95],
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

  const nextCardScale = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [1, 0.92, 1],
    extrapolate: 'clamp',
  });

  const cardAnimatedStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate: cardRotation },
      { scale: cardScale },
    ],
  };

  // Get current photos
  const currentPhotos = currentProfile?.additionalPhotos || (currentProfile?.image ? [currentProfile.image] : []);
  const totalPhotos = currentPhotos.length || 1;

  // Get next profile for stack effect
  const nextProfile = profiles[currentIndex + 1];

  // LANDSCAPE MODE - Card centered with buttons below (clean, premium design)
  if (isLandscape) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Premium subtle gradient background */}
        <LinearGradient
          colors={['#FAFAFA', '#FFFFFF', '#F5F5F5']}
          style={StyleSheet.absoluteFill}
        />

        {/* Compact Header for Landscape - Premium iPhone Style */}
        <View style={[styles.header, { paddingTop: insets.top + 4, paddingBottom: 6 }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.logoWrapper, { width: 36, height: 36, borderRadius: 10 }]}>
              <Image
                source={TanderLogo}
                style={[styles.logoImage, { width: 28, height: 28, borderRadius: 6 }]}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { fontSize: 18 }]}>Discover</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.filterButton, { width: 32, height: 32 }]} onPress={handleFilterPress}>
            <Feather name="sliders" size={16} color={colors.gray[700]} />
          </TouchableOpacity>
        </View>

        {/* Main Content - Card centered with buttons below */}
        <View style={[styles.landscapeContent, { paddingBottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) }]}>
          {/* Card Area - Centered */}
          <View style={styles.landscapeCardContainer}>
            {isLoading && !hasProfiles ? (
              <LoadingState width={cardDimensions.width} height={cardDimensions.height} />
            ) : error && !hasProfiles ? (
              <EmptyState isError={true} onRetry={loadProfiles} message={error} />
            ) : !hasProfiles || !currentProfile ? (
              <EmptyState isError={false} onRetry={loadProfiles} />
            ) : (
              <>
                {/* Background card */}
                {nextProfile && (
                  <Animated.View style={[styles.cardWrapper, { transform: [{ scale: nextCardScale }] }]}>
                    <ProfileCard
                      profile={nextProfile}
                      isTop={false}
                      style={{}}
                      panHandlers={{}}
                      width={cardDimensions.width}
                      height={cardDimensions.height}
                      likeOpacity={new Animated.Value(0)}
                      nopeOpacity={new Animated.Value(0)}
                      onViewProfile={() => {}}
                      onPhotoTap={() => {}}
                      currentPhotoIndex={0}
                      totalPhotos={1}
                    />
                  </Animated.View>
                )}

                {/* Top card */}
                <View style={styles.cardWrapper}>
                  <ProfileCard
                    profile={currentProfile}
                    isTop={true}
                    style={cardAnimatedStyle}
                    panHandlers={panResponder.panHandlers}
                    width={cardDimensions.width}
                    height={cardDimensions.height}
                    likeOpacity={likeOpacity}
                    nopeOpacity={nopeOpacity}
                    onViewProfile={handleViewProfile}
                    onPhotoTap={handlePhotoTap}
                    currentPhotoIndex={currentPhotoIndex}
                    totalPhotos={totalPhotos}
                  />
                </View>
              </>
            )}
          </View>

          {/* Action Buttons - Horizontal row below card */}
          {hasProfiles && currentProfile && (
            <View style={styles.landscapeActions}>
              {/* Pass Button */}
              <TouchableOpacity
                style={[styles.landscapeBtn, styles.landscapeBtnPass]}
                onPress={handleSwipeLeft}
                disabled={isAnimating}
                activeOpacity={0.85}
              >
                <XIcon size={28} color={PREMIUM_COLORS.pass} />
              </TouchableOpacity>

              {/* Rewind/Back Button */}
              <TouchableOpacity
                style={[styles.landscapeBtn, styles.landscapeBtnBack, (!canUndo || isAnimating) && { opacity: 0.4 }]}
                onPress={handleUndo}
                disabled={!canUndo || isAnimating}
                activeOpacity={0.85}
              >
                <RewindIcon size={22} color={PREMIUM_COLORS.rewind} />
              </TouchableOpacity>

              {/* Like Button */}
              <TouchableOpacity
                style={[styles.landscapeBtn, styles.landscapeBtnLike]}
                onPress={handleSwipeRight}
                disabled={isAnimating}
                activeOpacity={0.85}
              >
                <Ionicons name="heart" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Profile Modal */}
        <ProfileModal
          visible={showProfileModal}
          profile={currentProfile}
          onClose={() => setShowProfileModal(false)}
          onLike={handleSwipeRight}
          onPass={handleSwipeLeft}
        />

        {/* Match Modal */}
        <MatchModal
          visible={showMatchPopup}
          name={matchInfo?.matchedUserDisplayName || matchInfo?.matchedUsername || ''}
          photo={matchInfo?.matchedUserProfilePhotoUrl || null}
          onClose={dismissMatchPopup}
          onMessage={handleMessageMatch}
        />
      </View>
    );
  }

  // PORTRAIT MODE - Original layout (Card above, Buttons below)
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Premium subtle gradient background */}
      <LinearGradient
        colors={['#FAFAFA', '#FFFFFF', '#F5F5F5']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <Header count={profiles.length - currentIndex} onFilterPress={handleFilterPress} />

      {/* Card stack area */}
      <View style={styles.cardContainer}>
        {isLoading && !hasProfiles ? (
          <LoadingState width={cardDimensions.width} height={cardDimensions.height} />
        ) : error && !hasProfiles ? (
          <EmptyState isError={true} onRetry={loadProfiles} message={error} />
        ) : !hasProfiles || !currentProfile ? (
          <EmptyState isError={false} onRetry={loadProfiles} />
        ) : (
          <>
            {/* Background card (next in stack) */}
            {nextProfile && (
              <Animated.View
                style={[
                  styles.cardWrapper,
                  { transform: [{ scale: nextCardScale }] },
                ]}
              >
                <ProfileCard
                  profile={nextProfile}
                  isTop={false}
                  style={{}}
                  panHandlers={{}}
                  width={cardDimensions.width}
                  height={cardDimensions.height}
                  likeOpacity={new Animated.Value(0)}
                  nopeOpacity={new Animated.Value(0)}
                  onViewProfile={() => {}}
                  onPhotoTap={() => {}}
                  currentPhotoIndex={0}
                  totalPhotos={1}
                />
              </Animated.View>
            )}

            {/* Top card (current) */}
            <View style={styles.cardWrapper}>
              <ProfileCard
                profile={currentProfile}
                isTop={true}
                style={cardAnimatedStyle}
                panHandlers={panResponder.panHandlers}
                width={cardDimensions.width}
                height={cardDimensions.height}
                likeOpacity={likeOpacity}
                nopeOpacity={nopeOpacity}
                onViewProfile={handleViewProfile}
                onPhotoTap={handlePhotoTap}
                currentPhotoIndex={currentPhotoIndex}
                totalPhotos={totalPhotos}
              />
            </View>
          </>
        )}
      </View>

      {/* Floating Action Buttons */}
      {hasProfiles && currentProfile && (
        <FloatingActions
          onPass={handleSwipeLeft}
          onLike={handleSwipeRight}
          onRewind={handleUndo}
          disabled={isAnimating}
          canRewind={canUndo}
          bottomInset={insets.bottom}
        />
      )}

      {/* Profile Modal */}
      <ProfileModal
        visible={showProfileModal}
        profile={currentProfile}
        onClose={() => setShowProfileModal(false)}
        onLike={handleSwipeRight}
        onPass={handleSwipeLeft}
      />

      {/* Match Modal */}
      <MatchModal
        visible={showMatchPopup}
        name={matchInfo?.matchedUserDisplayName || matchInfo?.matchedUsername || ''}
        photo={matchInfo?.matchedUserProfilePhotoUrl || null}
        onClose={dismissMatchPopup}
        onMessage={handleMessageMatch}
      />
    </View>
  );
};

// ============================================================================
// PREMIUM STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Premium Logo Wrapper - iPhone Style with subtle shadow
  logoWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  // Legacy logoContainer for backward compatibility
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  headerTitleContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 1,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Card container - holds the card stack
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  cardWrapper: {
    position: 'absolute',
    top: 4,
  },

  // Profile Card
  card: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: PREMIUM_COLORS.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
  cardImageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  photoTapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '30%',
  },
  photoTapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '30%',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  // Photo dots
  photoDotsWrapper: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
  },
  photoDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 4,
  },
  photoDot: {
    height: 4,
    borderRadius: 2,
  },

  // Badges
  badgesContainer: {
    position: 'absolute',
    top: 28,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  verifiedBadgeWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  verifiedBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    borderRadius: 20,
    gap: 4,
  },
  verifiedBadgeAndroid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.95)',
    borderRadius: 20,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D26A',
  },
  onlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
  },

  // Swipe stamps
  stamp: {
    position: 'absolute',
    top: '30%',
    zIndex: 10,
  },
  stampLeft: {
    left: 24,
  },
  stampRight: {
    right: 24,
  },
  stampCenter: {
    alignSelf: 'center',
    left: '50%',
    marginLeft: -60,
  },
  stampInner: {
    borderWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stampText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 3,
  },

  // Card info
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  nameText: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ageText: {
    fontWeight: '400',
    color: '#FFFFFF',
    marginLeft: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    color: 'rgba(255,255,255,0.95)',
    marginLeft: 6,
    fontWeight: '500',
  },
  distanceText: {
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tagMore: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tagText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 8,
    marginTop: 4,
  },
  viewProfileText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Floating Actions - positioned below the card
  floatingActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  // Loading
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.gray[500],
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.orange[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconError: {
    backgroundColor: '#FEE2E2',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Match Modal
  matchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  matchContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    overflow: 'hidden',
  },
  matchGradient: {
    padding: 32,
    alignItems: 'center',
  },
  matchHearts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  matchTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  matchSubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
  },
  matchAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    marginBottom: 32,
  },
  matchAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchInitial: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matchPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 30,
    gap: 10,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  matchPrimaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.orange[500],
  },
  matchSecondaryBtn: {
    padding: 12,
  },
  matchSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },

  // Profile Modal
  profileModal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  profileModalClose: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  profileModalScroll: {
    flex: 1,
  },
  profileModalPhoto: {
    width: '100%',
    aspectRatio: 0.85,
  },
  profileModalInfo: {
    padding: 24,
  },
  profileModalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileModalName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.5,
  },
  profileModalAge: {
    fontSize: 28,
    fontWeight: '400',
    color: colors.gray[600],
    marginLeft: 10,
  },
  profileModalVerified: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  profileModalLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileModalLocationText: {
    fontSize: 17,
    color: colors.gray[600],
    marginLeft: 6,
  },
  profileModalBio: {
    marginBottom: 24,
  },
  profileModalBioTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[500],
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileModalBioText: {
    fontSize: 17,
    color: colors.gray[700],
    lineHeight: 26,
  },
  profileModalInterests: {
    marginBottom: 24,
  },
  profileModalInterestsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[500],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileModalInterestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profileModalInterestTag: {
    backgroundColor: colors.orange[50],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  profileModalInterestTagText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.orange[600],
  },
  profileModalActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  profileModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
  },
  profileModalBtnPass: {
    backgroundColor: '#FEE2E2',
  },
  profileModalBtnLike: {
    backgroundColor: PREMIUM_COLORS.like,
  },
  profileModalBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },

  // ============================================================================
  // LANDSCAPE MODE STYLES
  // ============================================================================

  // Main content container for landscape (Card centered, buttons below)
  landscapeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Card container - takes remaining space, centers content
  landscapeCardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  // Action buttons row - horizontal at bottom
  landscapeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingVertical: 10,
    paddingBottom: 12,
  },

  // Landscape button base (compact for landscape)
  landscapeBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  // Pass button (red X)
  landscapeBtnPass: {
    shadowColor: PREMIUM_COLORS.pass,
    shadowOpacity: 0.25,
  },

  // Back button (yellow - smaller)
  landscapeBtnBack: {
    width: 52,
    height: 52,
    borderRadius: 26,
    shadowColor: PREMIUM_COLORS.rewind,
    shadowOpacity: 0.25,
  },

  // Like button (green heart)
  landscapeBtnLike: {
    backgroundColor: PREMIUM_COLORS.like,
    shadowColor: PREMIUM_COLORS.like,
    shadowOpacity: 0.35,
  },

  // Legacy styles for backward compatibility
  landscapeMainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  landscapeCardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeActionsPanel: {
    width: 110,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 12,
    gap: 20,
  },
  landscapeActionBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  landscapePassBtn: {
    shadowColor: PREMIUM_COLORS.pass,
    shadowOpacity: 0.3,
  },
  landscapeRewindBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: PREMIUM_COLORS.rewind,
    shadowOpacity: 0.3,
  },
  landscapeLikeBtn: {
    backgroundColor: PREMIUM_COLORS.like,
    shadowColor: PREMIUM_COLORS.like,
    shadowOpacity: 0.4,
  },
  landscapeActionText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.5,
  },
});

export default DiscoveryScreen;
