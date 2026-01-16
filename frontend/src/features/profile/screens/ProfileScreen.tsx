/**
 * TANDER Profile Screen - Fully Responsive Layout
 * Senior-Friendly Profile Management for Filipino Seniors (50+)
 *
 * Design Philosophy:
 * - Maximum accessibility with WCAG AAA compliance
 * - Premium, modern UI matching mockup design
 * - Large touch targets (56-64px minimum) for elderly users
 * - High contrast text (7:1 ratio) for readability
 * - Clear visual hierarchy and intuitive navigation
 * - Consistent orange/teal brand identity
 *
 * Responsive Design:
 * - Fully responsive across ALL device sizes and orientations
 * - Breakpoints: xs (320px), sm (480px), md (768px), lg (1024px), xl (1280px)
 * - Adaptive layouts: single column (phone) to multi-column (tablet)
 * - Landscape-optimized with horizontal scroll prevention
 * - Foldable device support (Galaxy Fold, Pixel Fold)
 * - Safe area handling for notches, home indicators, camera cutouts
 *
 * Target Devices:
 * - Android phones: small (320-375px), medium (376-414px), large (415-480px)
 * - Android tablets: 7" to 12.9" in both orientations
 * - iPhones: SE, Mini, standard, Plus, Pro Max
 * - iPads: Mini, Air, Pro 11", Pro 12.9"
 * - Foldables: inner display 600-900px width
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  AccessibilityInfo,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows, touchTargets } from '@shared/styles/spacing';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import { useAuthStore } from '@/store/authStore';
import { useStoryCommentsStore, selectReceivedComments, selectUnreadCount } from '@/store/storyCommentsStore';
import { StoryComment } from '@shared/types';
import { SettingsScreen } from './SettingsScreen';
import { InterestsModal } from '../components/InterestsModal';
import { TanderLogoIcon } from '@shared/components/icons';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  uploadAdditionalPhotos,
  deletePhoto,
  deleteProfilePhoto,
} from '@/services/api/profileApi';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface ProfileData {
  name: string;
  age: string;
  location: string;
  bio: string;
  photos: string[];
  interests: string[];
  gender: string;
  lookingFor: string;
  job: string;
  education: string;
  height: string;
  religion: string;
  children: string;
  languages: string[];
}

interface ProfileScreenProps {
  onNavigateToSettings?: () => void;
  onNavigateToStoryAdmirers?: () => void;
}

// =============================================================================
// CONSTANTS - Responsive Breakpoints & Layout Configuration
// =============================================================================

// NOTE: All responsive calculations use the useResponsive hook which updates
// automatically on orientation changes and device rotations.
// Static Dimensions.get() is only used for StyleSheet fallbacks.

/**
 * Maximum content widths for different layout scenarios
 * Prevents content from becoming too wide on large displays
 */
const LAYOUT_CONFIG = {
  // Maximum content width for single-column layouts (phones, small tablets)
  MAX_CONTENT_WIDTH_SINGLE: 540,
  // Maximum content width for standard tablet layouts
  MAX_CONTENT_WIDTH_TABLET: 680,
  // Maximum content width for two-column layouts (large tablets in landscape)
  MAX_CONTENT_WIDTH_TWO_COLUMN: 960,
  // Maximum width for photo grid to maintain good proportions
  MAX_PHOTO_GRID_WIDTH: 600,
  // Maximum width for modals on tablets (centered dialog style)
  MAX_MODAL_WIDTH: 560,
  // Maximum width for wide modals (details modal)
  MAX_MODAL_WIDTH_WIDE: 720,
} as const;

/**
 * Layout breakpoints for responsive behavior
 * Based on design_system2.md specifications
 */
const LAYOUT_BREAKPOINTS = {
  // Switch to two-column layout (tablets in landscape)
  TWO_COLUMN: 768,
  // Switch to three-column photo grid
  THREE_COLUMN_PHOTOS: 600,
  // Foldable inner display minimum
  FOLDABLE_MIN: 600,
  // Large tablet threshold
  LARGE_TABLET: 1024,
} as const;

/**
 * Photo grid configuration for different screen sizes
 */
const PHOTO_GRID_CONFIG = {
  // Consistent 2-column grid for all devices
  COLUMNS_PHONE_PORTRAIT: 2,
  COLUMNS_PHONE_LANDSCAPE: 2,
  COLUMNS_TABLET_PORTRAIT: 2,
  COLUMNS_TABLET_LANDSCAPE: 2,
  // Maximum photos allowed
  MAX_PHOTOS: 6,
  // Aspect ratio for photo items (1:1 square for clean grid)
  ASPECT_RATIO: 1,
} as const;

// Interests organized by category for better organization
const INTERESTS_BY_CATEGORY = {
  'Quick Picks': ['Reading', 'Travel', 'Music', 'Walking', 'Church Activities', 'Cooking'],
  'Hobbies': ['Reading', 'Gardening', 'Photography', 'Crafts', 'Baking', 'Sewing', 'Crossword Puzzles'],
  'Activities': ['Travel', 'Walking', 'Dancing', 'Yoga', 'Swimming', 'Golf', 'Tennis', 'Fishing'],
  'Social': ['Movies', 'Theater', 'Board Games', 'Cards', 'Karaoke', 'Mahjong', 'Volunteering'],
  'Creative & Spiritual': ['Music', 'Art', 'Bird Watching', 'Church Activities', 'Cooking'],
};

// GENDER_OPTIONS moved to VisualGenderButton component
const LOOKING_FOR_OPTIONS = ['Men', 'Women', 'Both'];
const RELIGION_OPTIONS = [
  'Catholic', 'Christian', 'Iglesia ni Cristo', 'Islam',
  'Buddhist', 'Other', 'Prefer not to say'
];
const LANGUAGE_OPTIONS = [
  'Tagalog', 'English', 'Cebuano', 'Ilocano', 'Bisaya',
  'Hiligaynon', 'Bicolano', 'Waray', 'Kapampangan', 'Pangasinan'
];

// Common Philippines locations for quick selection
const PHILIPPINES_LOCATIONS = [
  'Metro Manila', 'Cebu City', 'Davao City', 'Quezon City',
  'Makati', 'Pasig', 'Taguig', 'Baguio', 'Iloilo City',
  'Bacolod', 'Cagayan de Oro', 'Zamboanga City'
];

// Story templates for seniors to easily create their bio
const STORY_TEMPLATES = [
  {
    id: 'family',
    title: 'Family Person',
    icon: 'heart',
    template: 'I am a devoted family person who loves spending quality time with my children and grandchildren. Looking for someone who values family as much as I do.',
  },
  {
    id: 'retired',
    title: 'Enjoying Retirement',
    icon: 'sun',
    template: 'After a fulfilling career, I am now enjoying my retirement and exploring new interests. Seeking a companion to share this wonderful chapter of life.',
  },
  {
    id: 'adventurer',
    title: 'Life Adventurer',
    icon: 'compass',
    template: 'I believe life is meant to be lived fully at any age. I enjoy traveling, trying new experiences, and making beautiful memories.',
  },
  {
    id: 'simple',
    title: 'Simple Joys',
    icon: 'coffee',
    template: 'I find happiness in life\'s simple pleasures - a good book, a warm cup of coffee, and meaningful conversations with loved ones.',
  },
  {
    id: 'social',
    title: 'Social Butterfly',
    icon: 'users',
    template: 'I love meeting new people and making friends. Whether it\'s community events, church gatherings, or social clubs, I enjoy being around others.',
  },
  {
    id: 'faith',
    title: 'Faith & Values',
    icon: 'book',
    template: 'My faith guides my life and brings me peace. I\'m looking for someone who shares similar values and wants to walk this journey together.',
  },
];

// Categorized clickable options for building bio
const BIO_ABOUT_ME = [
  { text: 'Kind & caring', icon: 'heart' },
  { text: 'Good listener', icon: 'headphones' },
  { text: 'Easy-going', icon: 'smile' },
  { text: 'Honest & loyal', icon: 'shield' },
  { text: 'Young at heart', icon: 'zap' },
  { text: 'Romantic', icon: 'heart' },
  { text: 'Fun & playful', icon: 'star' },
  { text: 'Thoughtful', icon: 'gift' },
];

const BIO_LOOKING_FOR = [
  { text: 'Genuine connection', icon: 'link' },
  { text: 'Companionship', icon: 'users' },
  { text: 'Someone to laugh with', icon: 'smile' },
  { text: 'Travel partner', icon: 'map-pin' },
  { text: 'Best friend', icon: 'heart' },
  { text: 'Life partner', icon: 'home' },
  { text: 'Someone caring', icon: 'heart' },
  { text: 'Good conversation', icon: 'message-circle' },
];

const BIO_HOBBIES = [
  { text: 'Cooking', icon: 'coffee' },
  { text: 'Gardening', icon: 'sun' },
  { text: 'Reading', icon: 'book' },
  { text: 'Walking', icon: 'map' },
  { text: 'Music', icon: 'music' },
  { text: 'Dancing', icon: 'music' },
  { text: 'Travel', icon: 'globe' },
  { text: 'Movies', icon: 'film' },
  { text: 'Church', icon: 'home' },
  { text: 'Family time', icon: 'users' },
  { text: 'Photography', icon: 'camera' },
  { text: 'Fishing', icon: 'anchor' },
];

// Suggested phrases for bio (legacy, keeping for compatibility)
const BIO_PHRASES = [
  'Family is everything to me',
  'Love to travel',
  'Enjoy cooking and sharing meals',
  'Looking for genuine connection',
  'Active and healthy lifestyle',
  'Faith is important to me',
  'Love music and dancing',
  'Enjoy quiet evenings at home',
];

const INITIAL_PROFILE: ProfileData = {
  name: '',
  age: '',
  location: '',
  bio: '',
  photos: [],
  interests: [],
  gender: '',
  lookingFor: '',
  job: '',
  education: '',
  height: '',
  religion: '',
  children: '',
  languages: [],
};

// =============================================================================
// TOAST NOTIFICATION TYPES
// =============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

// =============================================================================
// TOAST NOTIFICATION COMPONENT
// =============================================================================

interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({ visible, message, type, onHide }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  }, [translateY, opacity, onHide]);

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        hideToast();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, translateY, opacity, hideToast]);

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          colors: ['#349E92', '#2E8B7F'] as [string, string],
          icon: 'check-circle' as const,
        };
      case 'error':
        return {
          colors: [colors.semantic.error, '#DC2626'] as [string, string],
          icon: 'alert-circle' as const,
        };
      case 'warning':
        return {
          colors: ['#FF7B51', '#E85A36'] as [string, string],
          icon: 'alert-triangle' as const,
        };
      case 'info':
      default:
        return {
          colors: ['#FF7B51', '#349E92'] as [string, string],
          icon: 'info' as const,
        };
    }
  };

  if (!visible) return null;

  const config = getToastConfig();

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${type} notification: ${message}`}
    >
      <LinearGradient
        colors={config.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.toastGradient}
      >
        <Feather name={config.icon} size={24} color={colors.white} />
        <Text style={styles.toastMessage}>{message}</Text>
        <TouchableOpacity
          onPress={hideToast}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
        >
          <Feather name="x" size={20} color={colors.white} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

// =============================================================================
// SKELETON LOADING COMPONENT
// =============================================================================

/**
 * Skeleton Placeholder Component
 * Creates smooth shimmer animation for loading states
 */
const SkeletonPlaceholder: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}> = ({ width, height, borderRadius = 8, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.gray[200],
          opacity,
        },
        style,
      ]}
    />
  );
};

// =============================================================================
// ANIMATED PROGRESS BAR COMPONENT
// =============================================================================

/**
 * Animated Progress Bar Component
 * Smooth animation with gradient fill and glow effect
 */
const AnimatedProgressBar: React.FC<{
  progress: number;
  height?: number;
  showGlow?: boolean;
}> = ({ progress, height = 12, showGlow = true }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate progress bar fill
    Animated.spring(progressAnim, {
      toValue: progress,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();

    // Subtle glow pulse for incomplete profiles
    if (progress < 100 && showGlow) {
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      glowLoop.start();
      return () => glowLoop.stop();
    }
    return undefined;
  }, [progress, progressAnim, glowAnim, showGlow]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <View style={[styles.animatedProgressContainer, { height }]}>
      <Animated.View
        style={[
          styles.animatedProgressGlow,
          {
            opacity: glowOpacity,
            height: height + 8,
            borderRadius: (height + 8) / 2,
          },
        ]}
      />
      <View style={[styles.animatedProgressTrack, { height, borderRadius: height / 2 }]}>
        <Animated.View style={{ width: animatedWidth, height: '100%' }}>
          <LinearGradient
            colors={['#FF7B51', '#8B7355', '#349E92']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.animatedProgressFill, { borderRadius: height / 2 }]}
          />
        </Animated.View>
      </View>
      {progress >= 100 && (
        <View style={styles.progressCompleteIcon}>
          <Feather name="check" size={10} color={colors.white} />
        </View>
      )}
    </View>
  );
};

// =============================================================================
// ENHANCED PHOTO ITEM COMPONENT
// =============================================================================

/**
 * Enhanced Photo Item Component
 * With press feedback, badges, and visual polish
 */
const EnhancedPhotoItem: React.FC<{
  photo: string;
  index: number;
  isMain: boolean;
  borderRadius: number;
  onPress: () => void;
  isTablet: boolean;
}> = ({ photo, index, isMain, borderRadius, onPress, isTablet }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  // Badge sizes for senior visibility
  const mainBadgeSize = isTablet ? 36 : 32;
  const numberBadgeSize = isTablet ? 30 : 26;

  return (
    <Animated.View
      style={[
        styles.photoGridItemWrapper,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.photoGridItemContainer,
          {
            borderRadius,
            // Subtle shadow for depth
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
        accessibilityLabel={isMain ? 'Main profile photo, tap to view gallery' : `Photo ${index + 1}, tap to view gallery`}
        accessibilityRole="button"
        accessibilityHint="Opens photo gallery"
      >
        <Image
          source={{ uri: photo }}
          style={[styles.photoGridImage, { borderRadius }]}
          resizeMode="cover"
        />
        {/* Subtle gradient overlay for visual depth */}
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(0,0,0,0.15)']}
          locations={[0, 0.6, 1]}
          style={[styles.photoGridOverlay, { borderRadius }]}
        />
        {/* Main photo star badge - top right */}
        {isMain && (
          <View style={[styles.mainPhotoBadgeContainer, { top: 8, right: 8 }]}>
            <LinearGradient
              colors={['#FF7B51', '#E85A36']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.mainPhotoBadgeGradient,
                {
                  width: mainBadgeSize,
                  height: mainBadgeSize,
                  borderRadius: mainBadgeSize / 2,
                },
              ]}
            >
              <Feather name="star" size={isTablet ? 18 : 16} color={colors.white} />
            </LinearGradient>
          </View>
        )}
        {/* Photo number badge - bottom left */}
        <View
          style={[
            styles.photoNumberBadge,
            {
              width: numberBadgeSize,
              height: numberBadgeSize,
              borderRadius: numberBadgeSize / 2,
              bottom: 8,
              left: 8,
            },
          ]}
        >
          <Text style={[styles.photoNumberText, { fontSize: isTablet ? 15 : 13 }]}>
            {index + 1}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// =============================================================================
// ENHANCED ADD PHOTO BUTTON
// =============================================================================

/**
 * Enhanced Add Photo Button Component
 * With animated border, visual feedback, and senior-friendly sizing
 */
const EnhancedAddPhotoButton: React.FC<{
  borderRadius: number;
  onPress: () => void;
  isFirst: boolean;
  isTablet: boolean;
}> = ({ borderRadius, onPress, isFirst, isTablet }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFirst) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    return undefined;
  }, [isFirst, pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const borderOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  });

  const iconCircleSize = isTablet ? 64 : 56;

  return (
    <Animated.View
      style={[
        styles.photoGridItemWrapper,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.addPhotoButtonContainer,
          { borderRadius },
        ]}
        accessibilityLabel={isFirst ? 'Add your first profile photo' : 'Add another photo'}
        accessibilityRole="button"
        accessibilityHint="Opens camera or photo library"
      >
        {/* Animated dashed border */}
        <Animated.View
          style={[
            styles.addPhotoButtonBorder,
            {
              borderRadius,
              opacity: isFirst ? borderOpacity : 1,
            },
          ]}
        />
        {/* Content */}
        <View style={styles.addPhotoButtonContent}>
          {/* Icon circle with gradient background on hover feel */}
          <LinearGradient
            colors={['#FFF5F2', '#FFEEE8']}
            style={[
              styles.addPhotoIconCircle,
              {
                width: iconCircleSize,
                height: iconCircleSize,
                borderRadius: iconCircleSize / 2,
              },
            ]}
          >
            <Feather name="plus" size={isTablet ? 32 : 28} color="#FF7B51" />
          </LinearGradient>
          {/* Text label */}
          <Text style={[styles.addPhotoButtonText, { fontSize: isTablet ? 18 : 16 }]}>
            {isFirst ? 'Add Photo' : 'Add More'}
          </Text>
          {/* Subtle hint text */}
          {isFirst && (
            <Text style={[styles.addPhotoButtonHint, { fontSize: isTablet ? 14 : 13 }]}>
              Tap to start
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

// =============================================================================
// PROFILE STRENGTH TIP COMPONENT
// =============================================================================

/**
 * Profile Strength Tip Component
 * Actionable suggestion with icon and tap feedback
 */
const ProfileStrengthTip: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  message: string;
  action: string;
  onPress: () => void;
}> = ({ icon, message, action, onPress }) => (
  <TouchableOpacity
    style={styles.strengthTipButton}
    onPress={onPress}
    accessibilityLabel={`${message}. ${action}`}
    accessibilityRole="button"
  >
    <View style={styles.strengthTipIconContainer}>
      <Feather name={icon} size={18} color={'#FF7B51'} />
    </View>
    <View style={styles.strengthTipContent}>
      <Text style={styles.strengthTipMessage}>{message}</Text>
      <Text style={styles.strengthTipAction}>{action}</Text>
    </View>
    <Feather name="chevron-right" size={20} color={'#F68562'} />
  </TouchableOpacity>
);

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Interest Chip Component
 * Displays a single interest with gradient background
 */
const InterestChip: React.FC<{ interest: string }> = ({ interest }) => (
  <LinearGradient
    colors={['#FF7B51', '#349E92']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.interestChip}
  >
    <Text style={styles.interestChipText}>{interest}</Text>
  </LinearGradient>
);

/**
 * Full-Screen Photo Viewer with Zoom
 * Senior-friendly photo viewing with pinch-to-zoom and swipe navigation
 */
interface PhotoViewerProps {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
  onSetMain?: (index: number) => void;
  onDelete?: (index: number) => void;
}

const PhotoViewer: React.FC<PhotoViewerProps> = ({
  visible,
  photos,
  initialIndex,
  onClose,
  onSetMain,
  onDelete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const positionX = useRef(new Animated.Value(0)).current;
  const positionY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastPositionX = useRef(0);
  const lastPositionY = useRef(0);
  const insets = useSafeAreaInsets();
  const {
    width: screenWidth,
    height: screenHeight,
    isTablet,
    isLandscape,
    isSmallScreen,
  } = useResponsive();

  // =========================================================================
  // RESPONSIVE CALCULATIONS FOR PHOTO VIEWER
  // Supports all devices: phones, tablets, foldables in portrait & landscape
  // =========================================================================

  // Detect foldable devices (inner display typically 600-900px)
  const isFoldable = screenWidth >= 600 && screenWidth < 900 && isLandscape;

  // Navigation button sizing - larger on tablets for better touch targets
  // Minimum 48px for senior-friendly touch targets
  const navButtonSize = isTablet ? 64 : isFoldable ? 56 : isLandscape ? 52 : 56;
  const navButtonIconSize = isTablet ? 36 : isFoldable ? 30 : isLandscape ? 28 : 32;

  // Header/footer padding with safe area consideration
  const headerPaddingTop = insets.top + (isLandscape ? spacing.s : spacing.m);
  const headerPaddingHorizontal = isTablet ? spacing.xl : isFoldable ? spacing.l : spacing.l;
  const footerPaddingBottom = insets.bottom + (isLandscape ? spacing.s : spacing.l);

  // Close button sizing - senior-friendly touch targets (minimum 48px)
  const closeButtonSize = isTablet ? 56 : isFoldable ? 52 : isLandscape ? 48 : 52;
  const closeIconSize = isTablet ? 28 : isFoldable ? 26 : isLandscape ? 24 : 26;

  // Thumbnail sizing - responsive for all devices
  const thumbnailSize = isTablet ? 72 : isFoldable ? 64 : isLandscape ? 56 : 64;
  const thumbnailBorderRadius = isTablet ? 12 : isFoldable ? 10 : 8;

  // Action button dimensions - larger touch targets for seniors (minimum 48px height)
  const actionButtonHeight = isTablet ? 56 : isFoldable ? 52 : isLandscape ? 48 : 52;
  const actionButtonMinWidth = isTablet ? 160 : isFoldable ? 140 : isLandscape ? 120 : 140;
  const actionButtonFontSize = isTablet ? 18 : isFoldable ? 16 : isLandscape ? 14 : 16;
  const actionButtonIconSize = isTablet ? 22 : isFoldable ? 20 : isLandscape ? 18 : 20;

  // Image display area - maximize viewing while respecting safe areas
  const imageMaxHeight = isLandscape
    ? screenHeight - headerPaddingTop - footerPaddingBottom - (photos.length > 1 ? thumbnailSize + spacing.l : 0) - 120
    : screenHeight * 0.6;
  const imageMaxWidth = isLandscape
    ? screenWidth - (navButtonSize * 2) - spacing.xl
    : screenWidth;

  // Counter text sizing
  const counterFontSize = isTablet ? 18 : isLandscape ? 14 : 16;

  // Zoom hint styling
  const zoomHintFontSize = isTablet ? 16 : isLandscape ? 12 : 14;

  // Reset zoom function - memoized to prevent unnecessary re-renders
  const resetZoom = useCallback(() => {
    setScale(1);
    lastScale.current = 1;
    lastPositionX.current = 0;
    lastPositionY.current = 0;
    scaleAnim.setValue(1);
    positionX.setValue(0);
    positionY.setValue(0);
  }, [scaleAnim, positionX, positionY]);

  // Reset when opening or changing photos
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      resetZoom();
    }
  }, [visible, initialIndex, resetZoom]);

  // Pan responder for zoom and pan gestures
  const panResponder = useMemo(() => {
    let initialDistance = 0;
    let initialScale = 1;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          // Pinch gesture start
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          initialDistance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          initialScale = lastScale.current;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (evt.nativeEvent.touches.length === 2) {
          // Pinch to zoom
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const currentDistance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          const newScale = Math.max(1, Math.min(4, initialScale * (currentDistance / initialDistance)));
          setScale(newScale);
          scaleAnim.setValue(newScale);
        } else if (lastScale.current > 1) {
          // Pan when zoomed in
          const newX = lastPositionX.current + gestureState.dx;
          const newY = lastPositionY.current + gestureState.dy;
          positionX.setValue(newX);
          positionY.setValue(newY);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        lastScale.current = scale;
        lastPositionX.current = lastPositionX.current + gestureState.dx;
        lastPositionY.current = lastPositionY.current + gestureState.dy;

        // Snap back if scale is less than 1
        if (scale <= 1) {
          resetZoom();
        }
      },
    });
  }, [scale, positionX, positionY, scaleAnim]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetZoom();
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetZoom();
    }
  };

  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      // Zoom out
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        Animated.spring(positionX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(positionY, { toValue: 0, useNativeDriver: true }),
      ]).start(() => {
        setScale(1);
        lastScale.current = 1;
        lastPositionX.current = 0;
        lastPositionY.current = 0;
      });
    } else {
      // Zoom in to 2x
      Animated.spring(scaleAnim, { toValue: 2, useNativeDriver: true }).start(() => {
        setScale(2);
        lastScale.current = 2;
      });
    }
  }, [scale, scaleAnim, positionX, positionY]);

  // Double tap detection
  const lastTap = useRef<number>(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleDoubleTap();
    }
    lastTap.current = now;
  };

  if (!visible || photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.photoViewerContainer}>
        {/* Header - Responsive with safe area */}
        <View style={[
          styles.photoViewerHeader,
          {
            paddingTop: headerPaddingTop,
            paddingHorizontal: headerPaddingHorizontal,
            paddingBottom: isLandscape ? spacing.xs : spacing.s,
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.photoViewerCloseButton,
              {
                width: closeButtonSize,
                height: closeButtonSize,
                borderRadius: closeButtonSize / 2,
              }
            ]}
            onPress={onClose}
            accessibilityLabel="Close photo viewer"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={closeIconSize} color={colors.white} />
          </TouchableOpacity>

          <View style={[
            styles.photoViewerCounter,
            isLandscape && { paddingHorizontal: spacing.m, paddingVertical: spacing.xs }
          ]}>
            <Text style={[styles.photoViewerCounterText, { fontSize: counterFontSize }]}>
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>

          <View style={[
            styles.photoViewerHeaderRight,
            { minWidth: closeButtonSize }
          ]}>
            {scale > 1 && (
              <TouchableOpacity
                style={[
                  styles.photoViewerZoomReset,
                  {
                    width: closeButtonSize,
                    height: closeButtonSize,
                    borderRadius: closeButtonSize / 2,
                  }
                ]}
                onPress={resetZoom}
                accessibilityLabel="Reset zoom"
                accessibilityRole="button"
                accessibilityHint="Returns image to normal size"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="minimize-2" size={closeIconSize - 2} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Photo Container with Zoom - Responsive image sizing */}
        <View style={styles.photoViewerContent} {...panResponder.panHandlers}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleTap}
            style={styles.photoViewerTouchable}
          >
            <Animated.Image
              source={{ uri: photos[currentIndex] }}
              style={[
                styles.photoViewerImage,
                {
                  width: imageMaxWidth,
                  height: imageMaxHeight,
                  maxWidth: screenWidth,
                  transform: [
                    { scale: scaleAnim },
                    { translateX: positionX },
                    { translateY: positionY },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Navigation Arrows - Responsive sizing */}
        {photos.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[
                  styles.photoViewerNavButton,
                  styles.photoViewerNavLeft,
                  isLandscape && { left: spacing.s },
                ]}
                onPress={goToPrevious}
                accessibilityLabel="Previous photo"
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View style={[
                  styles.photoViewerNavButtonInner,
                  {
                    width: navButtonSize,
                    height: navButtonSize,
                    borderRadius: navButtonSize / 2,
                  }
                ]}>
                  <Feather name="chevron-left" size={navButtonIconSize} color={colors.white} />
                </View>
              </TouchableOpacity>
            )}
            {currentIndex < photos.length - 1 && (
              <TouchableOpacity
                style={[
                  styles.photoViewerNavButton,
                  styles.photoViewerNavRight,
                  isLandscape && { right: spacing.s },
                ]}
                onPress={goToNext}
                accessibilityLabel="Next photo"
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View style={[
                  styles.photoViewerNavButtonInner,
                  {
                    width: navButtonSize,
                    height: navButtonSize,
                    borderRadius: navButtonSize / 2,
                  }
                ]}>
                  <Feather name="chevron-right" size={navButtonIconSize} color={colors.white} />
                </View>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Thumbnail Strip - Responsive sizing */}
        {photos.length > 1 && (
          <View style={[
            styles.photoViewerThumbnails,
            {
              paddingBottom: footerPaddingBottom,
              paddingHorizontal: headerPaddingHorizontal,
            }
          ]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.photoViewerThumbnailsContent,
                { gap: isTablet ? spacing.m : spacing.s }
              ]}
            >
              {photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.photoViewerThumbnail,
                    {
                      width: thumbnailSize,
                      height: thumbnailSize,
                      borderRadius: thumbnailBorderRadius,
                    },
                    currentIndex === index && styles.photoViewerThumbnailActive,
                    currentIndex === index && { borderWidth: isTablet ? 4 : 3 },
                  ]}
                  onPress={() => {
                    setCurrentIndex(index);
                    resetZoom();
                  }}
                  accessibilityLabel={`View photo ${index + 1}`}
                  accessibilityRole="button"
                >
                  <Image
                    source={{ uri: photo }}
                    style={[
                      styles.photoViewerThumbnailImage,
                      { borderRadius: thumbnailBorderRadius - 2 }
                    ]}
                  />
                  {index === 0 && (
                    <View style={[
                      styles.photoViewerThumbnailBadge,
                      {
                        width: isTablet ? 24 : 20,
                        height: isTablet ? 24 : 20,
                        borderRadius: isTablet ? 12 : 10,
                      }
                    ]}>
                      <Feather name="star" size={isTablet ? 12 : 10} color={colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom Actions - Responsive button sizing */}
        <View style={[
          styles.photoViewerActions,
          {
            paddingBottom: photos.length > 1 ? spacing.s : footerPaddingBottom,
            paddingHorizontal: headerPaddingHorizontal,
            gap: isTablet ? spacing.l : spacing.m,
            flexDirection: isLandscape ? 'row' : 'row',
            justifyContent: 'center',
          }
        ]}>
          {currentIndex !== 0 && onSetMain && (
            <TouchableOpacity
              style={styles.photoViewerActionButton}
              onPress={() => onSetMain(currentIndex)}
              accessibilityLabel="Set as main photo"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['#FF7B51', '#E85A36']}
                style={[
                  styles.photoViewerActionButtonGradient,
                  {
                    height: actionButtonHeight,
                    minWidth: actionButtonMinWidth,
                    paddingHorizontal: isTablet ? spacing.l : spacing.m,
                  }
                ]}
              >
                <Feather name="star" size={actionButtonIconSize} color={colors.white} />
                <Text style={[
                  styles.photoViewerActionButtonText,
                  { fontSize: actionButtonFontSize }
                ]}>
                  Set as Main
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.photoViewerActionButton}
              onPress={() => {
                onDelete(currentIndex);
                if (photos.length === 1) {
                  onClose();
                } else if (currentIndex >= photos.length - 1) {
                  setCurrentIndex(Math.max(0, currentIndex - 1));
                }
              }}
              accessibilityLabel="Delete photo"
              accessibilityRole="button"
            >
              <View style={[
                styles.photoViewerDeleteButton,
                {
                  height: actionButtonHeight,
                  minWidth: actionButtonMinWidth,
                  paddingHorizontal: isTablet ? spacing.l : spacing.m,
                }
              ]}>
                <Feather name="trash-2" size={actionButtonIconSize} color="#DC2626" />
                <Text style={[
                  styles.photoViewerDeleteButtonText,
                  { fontSize: actionButtonFontSize }
                ]}>
                  Delete
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Zoom Hint - Responsive text */}
        {scale === 1 && (
          <View style={[
            styles.photoViewerZoomHint,
            {
              paddingHorizontal: isTablet ? spacing.l : spacing.m,
              paddingVertical: isLandscape ? spacing.xs : spacing.s,
            }
          ]}>
            <Feather
              name="zoom-in"
              size={isTablet ? 18 : 16}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={[
              styles.photoViewerZoomHintText,
              { fontSize: zoomHintFontSize }
            ]}>
              Pinch to zoom {isSmallScreen ? '' : '• Double-tap to zoom'}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

/**
 * Enhanced Modal Header Component - Senior-Friendly Design
 * Features: Gradient accent line, icon support, larger touch targets
 * Consistent header for all modals - fully responsive across all devices
 * Supports: phones (portrait/landscape), tablets, foldables
 */
const ModalHeader: React.FC<{
  title: string;
  onClose: () => void;
  isTablet?: boolean;
  isLandscape?: boolean;
  fontSize?: number;
  touchTargetSize?: number;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
}> = ({ title, onClose, isTablet = false, isLandscape = false, fontSize: customFontSize, touchTargetSize, subtitle, icon, iconColor }) => {
  // Responsive values with smart defaults - senior-friendly sizing
  const titleFontSize = customFontSize || (isTablet ? 28 : isLandscape ? 22 : 24);
  const closeButtonSize = touchTargetSize || (isTablet ? 64 : 56);
  const headerIconSize = isTablet ? 28 : 24;
  const closeIconSize = isTablet ? 28 : 24;
  const paddingHorizontal = isTablet ? spacing.xl : spacing.l;
  const paddingVertical = isLandscape ? spacing.m : spacing.l;

  return (
    <View style={styles.enhancedModalHeaderWrapper}>
      {/* Gradient Accent Line */}
      <LinearGradient
        colors={['#FF7B51', '#349E92']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.modalHeaderGradientAccent}
      />
      <View style={[
        styles.enhancedModalHeader,
        {
          paddingHorizontal,
          paddingVertical,
          minHeight: closeButtonSize + paddingVertical * 2,
        },
      ]}>
        <View style={styles.modalHeaderLeftSection}>
          {/* Optional Icon with Gradient Background */}
          {icon && (
            <View style={[
              styles.modalHeaderIconContainer,
              {
                width: isTablet ? 52 : 44,
                height: isTablet ? 52 : 44,
                borderRadius: isTablet ? 26 : 22
              }
            ]}>
              <LinearGradient
                colors={['#FF7B51', '#349E92']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalHeaderIconGradient}
              >
                <Feather
                  name={icon}
                  size={headerIconSize}
                  color={iconColor || colors.white}
                />
              </LinearGradient>
            </View>
          )}
          <View style={styles.modalHeaderTextContainer}>
            <Text
              style={[
                styles.enhancedModalTitle,
                { fontSize: titleFontSize }
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={isLandscape}
              minimumFontScale={0.8}
              accessibilityRole="header"
            >
              {title}
            </Text>
            {subtitle && (
              <Text style={[
                styles.enhancedModalSubtitle,
                { fontSize: isTablet ? 16 : 14 }
              ]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {/* Enhanced Close Button */}
        <TouchableOpacity
          style={[
            styles.enhancedModalCloseButton,
            {
              width: closeButtonSize,
              height: closeButtonSize,
              borderRadius: closeButtonSize / 2,
            }
          ]}
          onPress={onClose}
          accessibilityLabel="Close modal"
          accessibilityRole="button"
          accessibilityHint="Closes this dialog without saving changes"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={closeIconSize} color={colors.gray[600]} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Outline Button Component
 * Orange outline button style for section actions
 */
const OutlineButton: React.FC<{
  label: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
}> = ({ label, onPress, icon }) => (
  <TouchableOpacity
    style={styles.outlineButton}
    onPress={onPress}
    accessibilityLabel={label}
    accessibilityRole="button"
  >
    {icon && <Feather name={icon} size={18} color={'#FF7B51'} />}
    <Text style={styles.outlineButtonText}>{label}</Text>
  </TouchableOpacity>
);

/**
 * Age Stepper Component
 * Large +/- buttons for selecting age (senior-friendly)
 * Fully responsive with proper touch targets for all devices
 */
const AgeStepper: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  isTablet?: boolean;
  isLandscape?: boolean;
}> = ({ value, onChange, min = 50, max = 99, isTablet = false, isLandscape = false }) => {
  const decrease = () => {
    if (value > min) onChange(value - 1);
  };
  const increase = () => {
    if (value < max) onChange(value + 1);
  };

  // Responsive button size: larger on tablets, smaller in landscape
  const buttonSize = isTablet ? 72 : isLandscape ? 56 : 64;
  const iconSize = isTablet ? 32 : 28;
  const valueSize = isTablet ? 56 : isLandscape ? 40 : 48;
  const labelSize = isTablet ? 18 : 16;

  return (
    <View style={[
      styles.ageStepperContainer,
      isLandscape && { paddingVertical: spacing.s },
    ]}>
      <TouchableOpacity
        style={[
          styles.ageStepperButton,
          { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
          value <= min && styles.ageStepperButtonDisabled,
        ]}
        onPress={decrease}
        disabled={value <= min}
        accessibilityLabel={`Decrease age to ${value - 1}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: value <= min }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="minus" size={iconSize} color={value <= min ? colors.gray[400] : '#FF7B51'} />
      </TouchableOpacity>

      <View style={styles.ageStepperValueContainer}>
        <Text
          style={[styles.ageStepperValue, { fontSize: valueSize }]}
          accessibilityLabel={`${value} years old`}
          accessibilityRole="text"
        >
          {value}
        </Text>
        <Text style={[styles.ageStepperLabel, { fontSize: labelSize }]}>years old</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.ageStepperButton,
          { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
          value >= max && styles.ageStepperButtonDisabled,
        ]}
        onPress={increase}
        disabled={value >= max}
        accessibilityLabel={`Increase age to ${value + 1}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: value >= max }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="plus" size={iconSize} color={value >= max ? colors.gray[400] : '#FF7B51'} />
      </TouchableOpacity>
    </View>
  );
};

/**
 * Location Chip Component
 * Tappable location chip for quick selection
 */
const LocationChip: React.FC<{
  location: string;
  selected: boolean;
  onPress: () => void;
}> = ({ location, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.locationChip, selected && styles.locationChipSelected]}
    onPress={onPress}
    accessibilityLabel={location}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
  >
    {selected && <Feather name="check" size={16} color={colors.white} />}
    <Text style={[styles.locationChipText, selected && styles.locationChipTextSelected]}>
      {location}
    </Text>
  </TouchableOpacity>
);

/**
 * Story Template Card Component
 * Tappable card for selecting a bio template
 */
const StoryTemplateCard: React.FC<{
  title: string;
  template: string;
  onPress: () => void;
}> = ({ title, template, onPress }) => (
  <TouchableOpacity
    style={styles.storyTemplateCard}
    onPress={onPress}
    accessibilityLabel={`Use ${title} template`}
    accessibilityRole="button"
  >
    <LinearGradient
      colors={['#FFF0EB', '#E8F7F5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.storyTemplateCardGradient}
    >
      <View style={styles.storyTemplateCardHeader}>
        <Feather name="file-text" size={20} color={'#FF7B51'} />
        <Text style={styles.storyTemplateCardTitle}>{title}</Text>
      </View>
      <Text style={styles.storyTemplateCardPreview} numberOfLines={2}>
        {template}
      </Text>
      <View style={styles.storyTemplateCardAction}>
        <Text style={styles.storyTemplateCardActionText}>Tap to use</Text>
        <Feather name="chevron-right" size={18} color={'#FF7B51'} />
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

/**
 * Bio Phrase Chip Component
 * Tappable chip to add phrases to bio
 */
const BioPhraseChip: React.FC<{
  phrase: string;
  onPress: () => void;
}> = ({ phrase, onPress }) => (
  <TouchableOpacity
    style={styles.bioPhraseChip}
    onPress={onPress}
    accessibilityLabel={`Add: ${phrase}`}
    accessibilityRole="button"
  >
    <Feather name="plus" size={14} color={'#2E8B7F'} />
    <Text style={styles.bioPhraseChipText}>{phrase}</Text>
  </TouchableOpacity>
);

/**
 * Interest Category Section Component
 * Groups interests by category with a header
 */
const InterestCategorySection: React.FC<{
  category: string;
  interests: string[];
  selectedInterests: string[];
  onToggleInterest: (interest: string) => void;
  isQuickPicks?: boolean;
}> = ({ category, interests, selectedInterests, onToggleInterest, isQuickPicks }) => (
  <View style={styles.interestCategorySection}>
    <View style={styles.interestCategoryChips}>
      {interests.map((interest) => {
        const isSelected = selectedInterests.includes(interest);
        return (
          <TouchableOpacity
            key={`${category}-${interest}`}
            style={styles.interestSelectionItemLarge}
            onPress={() => onToggleInterest(interest)}
            accessibilityLabel={interest}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            {isSelected ? (
              <LinearGradient
                colors={['#FF7B51', '#349E92']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.interestSelectedLarge}
              >
                <Feather name="check" size={20} color={colors.white} />
                <Text style={styles.interestSelectedTextLarge}>{interest}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.interestUnselectedLarge}>
                <Text style={styles.interestUnselectedTextLarge}>{interest}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

/**
 * Visual Gender Button Component
 * Large visual button with icon for gender selection
 */
const VisualGenderButton: React.FC<{
  gender: 'Male' | 'Female';
  selected: boolean;
  onPress: () => void;
}> = ({ gender, selected, onPress }) => (
  <TouchableOpacity
    style={styles.visualGenderButtonWrapper}
    onPress={onPress}
    accessibilityLabel={gender}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
  >
    {selected ? (
      <LinearGradient
        colors={['#FF7B51', '#349E92']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.visualGenderButtonSelected}
      >
        <View style={styles.visualGenderIconContainer}>
          <Feather
            name={gender === 'Male' ? 'user' : 'user'}
            size={36}
            color={colors.white}
          />
          {gender === 'Male' ? (
            <Text style={styles.visualGenderSymbol}>male</Text>
          ) : (
            <Text style={styles.visualGenderSymbol}>female</Text>
          )}
        </View>
        <Text style={styles.visualGenderTextSelected}>{gender}</Text>
        <Feather name="check-circle" size={24} color={colors.white} />
      </LinearGradient>
    ) : (
      <View style={styles.visualGenderButtonUnselected}>
        <View style={styles.visualGenderIconContainerUnselected}>
          <Feather
            name={gender === 'Male' ? 'user' : 'user'}
            size={36}
            color={colors.gray[500]}
          />
          {gender === 'Male' ? (
            <Text style={styles.visualGenderSymbolUnselected}>male</Text>
          ) : (
            <Text style={styles.visualGenderSymbolUnselected}>female</Text>
          )}
        </View>
        <Text style={styles.visualGenderTextUnselected}>{gender}</Text>
        <View style={styles.visualGenderCheckPlaceholder} />
      </View>
    )}
  </TouchableOpacity>
);

/**
 * Visual Looking For Button Component
 * Large visual button for "Looking For" selection
 */
const VisualLookingForButton: React.FC<{
  option: string;
  selected: boolean;
  onPress: () => void;
}> = ({ option, selected, onPress }) => {
  const getIcon = () => {
    switch (option) {
      case 'Men': return 'user';
      case 'Women': return 'user';
      case 'Both': return 'users';
      default: return 'user';
    }
  };

  return (
    <TouchableOpacity
      style={styles.visualLookingForWrapper}
      onPress={onPress}
      accessibilityLabel={`Looking for ${option}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {selected ? (
        <LinearGradient
          colors={['#349E92', '#FF7B51']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.visualLookingForSelected}
        >
          <Feather name={getIcon()} size={28} color={colors.white} />
          <Text style={styles.visualLookingForTextSelected}>{option}</Text>
          <Feather name="check" size={20} color={colors.white} />
        </LinearGradient>
      ) : (
        <View style={styles.visualLookingForUnselected}>
          <Feather name={getIcon()} size={28} color={colors.gray[500]} />
          <Text style={styles.visualLookingForTextUnselected}>{option}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

/**
 * Detail Row Component
 * Expandable row for personal details section
 */
const DetailRow: React.FC<{
  label: string;
  value: string;
  onPress: () => void;
}> = ({ label, value, onPress }) => (
  <TouchableOpacity
    style={styles.detailRow}
    onPress={onPress}
    accessibilityLabel={`${label}: ${value || 'Not set'}`}
    accessibilityRole="button"
  >
    <View style={styles.detailRowContent}>
      <Text style={styles.detailRowLabel}>{label}:</Text>
      <Text style={styles.detailRowValue} numberOfLines={1}>
        {value || 'Not set'}
      </Text>
    </View>
    <Feather name="chevron-right" size={24} color={colors.gray[400]} />
  </TouchableOpacity>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigateToSettings,
  onNavigateToStoryAdmirers,
}) => {
  const insets = useSafeAreaInsets();
  const {
    isTablet,
    isPhone,
    isLandscape,
    isPortrait,
    isSmallScreen,
    isLargeScreen,
    width: screenWidth,
    height: screenHeight,
    hp,
    wp,
    moderateScale,
    getScreenMargin,
    getResponsiveFontSize,
    getTouchTargetSize,
    getInputHeight,
    getButtonHeight,
    screenSize,
    isIOS,
    isAndroid,
  } = useResponsive();

  // ==========================================================================
  // RESPONSIVE CALCULATIONS - Comprehensive Device Support
  // ==========================================================================

  /**
   * Memoized responsive values that update on dimension changes
   * This ensures smooth transitions during rotation and resizing
   */
  const responsiveLayout = useMemo(() => {
    // Dynamic screen margin based on device size (24/32/40px)
    const screenMargin = getScreenMargin();

    // Detect foldable devices (inner display typically 600-900px)
    const isFoldable = screenWidth >= LAYOUT_BREAKPOINTS.FOLDABLE_MIN && screenWidth < BREAKPOINTS.tablet && isLandscape;

    // Detect large tablets (iPad Pro, large Android tablets)
    const isLargeTablet = screenWidth >= LAYOUT_BREAKPOINTS.LARGE_TABLET;

    // Determine if we should use two-column layout
    // Two-column: tablets in landscape OR large tablets in portrait OR foldables
    const useTwoColumnLayout = (isTablet && isLandscape) || isLargeTablet || isFoldable;

    // Calculate maximum content width based on device type
    const maxContentWidth = useTwoColumnLayout
      ? LAYOUT_CONFIG.MAX_CONTENT_WIDTH_TWO_COLUMN
      : isTablet
        ? LAYOUT_CONFIG.MAX_CONTENT_WIDTH_TABLET
        : LAYOUT_CONFIG.MAX_CONTENT_WIDTH_SINGLE;

    // Content width with max constraint and safe area consideration
    const horizontalSafeArea = insets.left + insets.right;
    const availableWidth = screenWidth - horizontalSafeArea;
    const contentWidth = Math.min(availableWidth - screenMargin * 2, maxContentWidth);

    // Calculate photo grid columns based on device and orientation
    const getPhotoGridColumns = (): number => {
      if (isTablet && isLandscape) return PHOTO_GRID_CONFIG.COLUMNS_TABLET_LANDSCAPE;
      if (isTablet) return PHOTO_GRID_CONFIG.COLUMNS_TABLET_PORTRAIT;
      if (isLandscape || isFoldable) return PHOTO_GRID_CONFIG.COLUMNS_PHONE_LANDSCAPE;
      return PHOTO_GRID_CONFIG.COLUMNS_PHONE_PORTRAIT;
    };

    const photoGridColumns = getPhotoGridColumns();

    // Photo grid item calculations - consistent gap for 2-column layout
    const photoGridGap = isTablet ? spacing.m : spacing.m;
    // Card padding is applied by sectionCardContent container
    const cardPadding = isTablet ? spacing.l : spacing.l;

    // For tablets/foldables in landscape, limit photo grid width
    const effectivePhotoGridWidth = (isTablet && isLandscape) || isFoldable
      ? Math.min(contentWidth, LAYOUT_CONFIG.MAX_PHOTO_GRID_WIDTH)
      : contentWidth;

    // Calculate available width inside the section card content (after padding)
    // Note: sectionCardContent applies cardPadding on all sides
    const availableGridWidth = effectivePhotoGridWidth - (cardPadding * 2);

    // Calculate individual photo item width
    // Only subtract gaps between items, not padding (padding is handled by container)
    const photoItemWidth = Math.floor(
      (availableGridWidth - photoGridGap * (photoGridColumns - 1)) / photoGridColumns
    );

    return {
      screenMargin,
      isFoldable,
      isLargeTablet,
      useTwoColumnLayout,
      contentWidth,
      photoGridColumns,
      photoGridGap,
      cardPadding,
      effectivePhotoGridWidth,
      photoItemWidth,
      horizontalSafeArea,
    };
  }, [screenWidth, screenHeight, isTablet, isLandscape, insets.left, insets.right, getScreenMargin]);

  // Destructure for easier access
  const {
    screenMargin,
    isFoldable,
    isLargeTablet,
    useTwoColumnLayout,
    contentWidth,
    photoGridColumns,
    photoGridGap,
    cardPadding,
    effectivePhotoGridWidth,
    photoItemWidth,
  } = responsiveLayout;

  /**
   * Responsive font sizes for better readability on all devices
   * Senior-friendly: 18px minimum for body text, 20px+ for headings
   * Uses moderateScale for controlled scaling that caps on large displays
   */
  const fontSize = useMemo(() => {
    // Base sizes that scale appropriately
    const baseHeading = isTablet ? 28 : isSmallScreen ? 22 : 24;
    const baseSectionTitle = isTablet ? 24 : isSmallScreen ? 18 : 20;
    const baseBody = isTablet ? 20 : 18;
    const baseSmall = isTablet ? 18 : 16;
    const baseHint = isTablet ? 16 : 14;
    const baseButton = isTablet ? 20 : 18;

    return {
      // Headings: 22-32px depending on device
      heading: moderateScale(baseHeading, 0.3),
      // Section titles: 18-24px
      sectionTitle: moderateScale(baseSectionTitle, 0.3),
      // Body text: 18-20px (senior-friendly minimum)
      body: moderateScale(baseBody, 0.2),
      // Small text: 16-18px
      small: moderateScale(baseSmall, 0.2),
      // Hint/caption text: 14-16px
      hint: moderateScale(baseHint, 0.2),
      // Button text: 18-20px
      button: moderateScale(baseButton, 0.2),
      // Large heading for special cases
      largeHeading: moderateScale(isTablet ? 32 : 28, 0.3),
    };
  }, [isTablet, isSmallScreen, moderateScale]);

  /**
   * Touch target sizes for senior-friendly interactions
   * Tablets and foldables get larger touch targets for comfort
   * All targets meet WCAG AAA guidelines (44px minimum, 56px recommended)
   */
  const touchTarget = useMemo(() => {
    const isEnhancedDevice = isTablet || isFoldable;
    return {
      // Standard comfortable size: 56px (phones) / 64px (tablets)
      comfortable: isEnhancedDevice ? getTouchTargetSize('large') : getTouchTargetSize('comfortable'),
      // Large size for primary actions: 64px (phones) / 72px (tablets)
      large: isEnhancedDevice ? 72 : getTouchTargetSize('large'),
      // Minimum size (never below 56px for seniors)
      minimum: getTouchTargetSize('comfortable'),
      // Icon button size
      iconButton: isEnhancedDevice ? 64 : 56,
    };
  }, [isTablet, isFoldable, getTouchTargetSize]);

  /**
   * Responsive spacing for different layout contexts
   * Adapts to device type, orientation, and screen size
   */
  const responsiveSpacing = useMemo(() => {
    // Reduce spacing in landscape to maximize vertical space
    const landscapeReduction = isLandscape ? 0.75 : 1;

    return {
      // Section spacing between major content areas
      section: Math.round((isTablet ? spacing.xl : spacing.l) * landscapeReduction),
      // Card internal padding
      card: isTablet ? spacing.xl : spacing.l,
      // Item spacing within lists
      item: isTablet ? spacing.l : spacing.m,
      // Gap between form fields
      formGap: isTablet ? spacing.l : spacing.m,
      // Header padding
      header: isTablet ? spacing.xl : spacing.l,
      // Modal padding
      modal: isTablet ? spacing.xl : spacing.l,
    };
  }, [isTablet, isLandscape]);

  /**
   * Calculate header photo size based on device type and orientation
   * Larger on tablets, smaller in landscape to fit content
   */
  const headerPhotoSize = useMemo(() => {
    if (isTablet) {
      return isLandscape ? 110 : 130;
    }
    if (isLandscape) {
      return Math.min(hp(25), 80); // Constrained in landscape
    }
    return isSmallScreen ? 88 : 100;
  }, [isTablet, isLandscape, isSmallScreen, hp]);

  /**
   * Comprehensive responsive styles object
   * All values computed dynamically for current screen dimensions
   */
  const responsiveStyles = useMemo(() => ({
    // Main container for tablet/landscape centering with maxWidth constraint
    contentWrapper: {
      maxWidth: contentWidth,
      alignSelf: 'center' as const,
      width: '100%' as const,
    },

    // Scroll content with responsive padding - landscape-safe with hp/wp
    scrollContent: {
      paddingHorizontal: screenMargin,
      paddingTop: isLandscape ? Math.min(hp(2), spacing.m) : spacing.m,
      // Landscape: smaller bottom padding, constrained by hp
      paddingBottom: insets.bottom + (isLandscape ? Math.min(hp(6), 48) : Math.min(hp(12), 100)),
      gap: isLandscape ? responsiveSpacing.item : responsiveSpacing.section,
    },

    // Header section responsive layout
    headerSection: {
      padding: responsiveSpacing.card,
      paddingVertical: isLandscape ? spacing.m : responsiveSpacing.card,
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
    },

    // Header photo container - responsive sizing
    headerPhotoContainer: {
      width: headerPhotoSize,
      height: headerPhotoSize,
      borderRadius: headerPhotoSize / 2,
      borderWidth: isTablet ? 4 : 3,
    },

    // Header info section - flex for proper spacing
    headerInfo: {
      marginLeft: isTablet ? spacing.xl : spacing.l,
      paddingRight: touchTarget.comfortable + spacing.s, // Account for settings button
    },

    // Header name - larger on tablets
    headerName: {
      fontSize: fontSize.heading,
      lineHeight: fontSize.heading * 1.2,
    },

    // Header location - responsive size
    headerLocation: {
      fontSize: fontSize.small,
    },

    // Section card responsive styling
    sectionCard: {
      padding: responsiveSpacing.card,
      borderRadius: isTablet ? borderRadius.xlarge + 4 : borderRadius.xlarge,
    },

    // Section card header - larger text on tablets
    sectionCardTitle: {
      fontSize: fontSize.sectionTitle,
    },

    // Photo grid item - responsive width
    photoItem: {
      width: photoItemWidth,
      aspectRatio: PHOTO_GRID_CONFIG.ASPECT_RATIO,
      borderRadius: isTablet ? borderRadius.xlarge : borderRadius.large,
    },

    // Photo grid container - responsive gap and alignment
    photosGrid: {
      gap: photoGridGap,
      justifyContent: 'flex-start' as const,
    },

    // Story text - larger and more readable on tablets
    storyText: {
      fontSize: fontSize.body,
      lineHeight: fontSize.body * 1.6,
    },

    // Interest chips - larger on tablets
    interestChip: {
      paddingHorizontal: isTablet ? spacing.l : spacing.m,
      paddingVertical: isTablet ? spacing.m : spacing.s + 2,
      minHeight: touchTarget.minimum,
    },

    // Interest chip text
    interestChipText: {
      fontSize: fontSize.small,
    },

    // Detail row - larger touch target
    detailRow: {
      minHeight: touchTarget.comfortable,
      paddingVertical: isTablet ? spacing.l : spacing.m,
    },

    // Detail row text
    detailRowLabel: {
      fontSize: fontSize.small,
    },
    detailRowValue: {
      fontSize: fontSize.small,
    },

    // =========================================================================
    // FULLY RESPONSIVE MODAL STYLES - All Device Sizes & Orientations
    // Supports: iPhone SE to iPad Pro 12.9", Android phones/tablets, Foldables
    // =========================================================================

    // Base modal dimensions - calculated dynamically for all devices
    modalDimensions: {
      // Width calculations
      width: isTablet
        ? Math.min(wp(80), LAYOUT_CONFIG.MAX_MODAL_WIDTH)
        : isLandscape
          ? Math.min(wp(85), 600)
          : wp(100),
      maxWidth: isTablet
        ? LAYOUT_CONFIG.MAX_MODAL_WIDTH
        : isLandscape
          ? 600
          : undefined,
      // Height calculations - account for safe areas
      maxHeight: isLandscape
        ? screenHeight - insets.top - insets.bottom - spacing.l
        : isTablet
          ? hp(85)
          : hp(92),
      // Border radius
      borderRadius: isTablet ? borderRadius.xlarge + 8 : borderRadius.xlarge + 12,
      borderTopLeftRadius: isTablet ? borderRadius.xlarge + 8 : borderRadius.xlarge + 12,
      borderTopRightRadius: isTablet ? borderRadius.xlarge + 8 : borderRadius.xlarge + 12,
      // Positioning
      alignSelf: isTablet || isLandscape ? 'center' as const : undefined,
      marginBottom: isTablet ? spacing.xl : 0,
      marginTop: isLandscape ? insets.top + spacing.s : 0,
    },

    // Modal container styles - adaptive for all devices
    modalContainer: {
      maxHeight: isLandscape
        ? screenHeight - insets.top - insets.bottom - spacing.l
        : isTablet
          ? hp(85)
          : hp(92),
      maxWidth: isTablet
        ? LAYOUT_CONFIG.MAX_MODAL_WIDTH
        : isLandscape
          ? 600
          : undefined,
      alignSelf: isTablet || isLandscape ? 'center' as const : undefined,
      width: isTablet
        ? Math.min(wp(80), LAYOUT_CONFIG.MAX_MODAL_WIDTH)
        : isLandscape
          ? Math.min(wp(85), 600)
          : '100%',
      borderRadius: isTablet ? borderRadius.xlarge + 8 : undefined,
      borderTopLeftRadius: isTablet ? borderRadius.xlarge + 8 : borderRadius.xlarge + 12,
      borderTopRightRadius: isTablet ? borderRadius.xlarge + 8 : borderRadius.xlarge + 12,
      marginBottom: isTablet ? spacing.xl : 0,
    },

    // Tall modal variant (for modals with lots of content)
    modalContainerTall: {
      maxHeight: isLandscape
        ? screenHeight - insets.top - insets.bottom - spacing.m
        : isTablet
          ? hp(88)
          : hp(94),
    },

    // Wide modal for details (needs more horizontal space)
    modalContainerWide: {
      maxWidth: isTablet
        ? LAYOUT_CONFIG.MAX_MODAL_WIDTH_WIDE
        : isLandscape
          ? 700
          : undefined,
      width: isTablet
        ? Math.min(wp(85), LAYOUT_CONFIG.MAX_MODAL_WIDTH_WIDE)
        : isLandscape
          ? Math.min(wp(90), 700)
          : '100%',
    },

    // Photo Gallery Modal - optimized for viewing photos
    photoGalleryModal: {
      maxHeight: isLandscape
        ? screenHeight - insets.top - insets.bottom
        : isTablet
          ? hp(90)
          : hp(95),
      maxWidth: isTablet
        ? Math.min(wp(85), 700)
        : isLandscape
          ? Math.min(wp(90), 650)
          : undefined,
      width: isTablet
        ? Math.min(wp(85), 700)
        : isLandscape
          ? Math.min(wp(90), 650)
          : '100%',
      alignSelf: isTablet || isLandscape ? 'center' as const : undefined,
      borderRadius: isTablet ? borderRadius.xlarge + 8 : borderRadius.xlarge + 12,
      marginBottom: isTablet ? spacing.xl : 0,
    },

    // Delete Confirmation Modal - centered dialog
    deleteConfirmModal: {
      maxWidth: isTablet
        ? 480
        : isLandscape
          ? 420
          : Math.min(screenWidth * 0.9, 380),
      width: isTablet
        ? Math.min(wp(70), 480)
        : isLandscape
          ? Math.min(wp(60), 420)
          : Math.min(wp(90), 380),
      padding: isTablet ? spacing.xxl : isLandscape ? spacing.xl : spacing.xl,
      borderRadius: borderRadius.xlarge + 8,
    },

    // PhotoViewer Modal - fullscreen with safe areas
    photoViewerModal: {
      // Header padding for safe area
      headerPaddingTop: insets.top + spacing.m,
      headerPaddingHorizontal: isTablet ? spacing.xl : spacing.l,
      // Footer padding for safe area
      footerPaddingBottom: insets.bottom + spacing.l,
      footerPaddingHorizontal: isTablet ? spacing.xl : spacing.l,
      // Navigation button sizes
      navButtonSize: isTablet ? 64 : 56,
      navButtonIconSize: isTablet ? 36 : 28,
      // Thumbnail sizes
      thumbnailSize: isTablet ? 72 : 60,
      thumbnailBorderRadius: isTablet ? 12 : 8,
      // Action button dimensions
      actionButtonHeight: isTablet ? 56 : 48,
      actionButtonMinWidth: isTablet ? 160 : 140,
      // Image constraints
      imageMaxHeight: isLandscape
        ? screenHeight * 0.65
        : screenHeight * 0.6,
    },

    // Modal content padding - responsive
    modalContent: {
      paddingHorizontal: isTablet
        ? spacing.xl
        : isLandscape
          ? spacing.l
          : responsiveSpacing.modal,
      paddingTop: isLandscape ? spacing.m : spacing.l,
      paddingBottom: spacing.l,
    },

    // Modal scroll content with proper safe area padding
    modalScrollContent: {
      paddingHorizontal: isTablet ? spacing.xl : responsiveSpacing.modal,
      paddingTop: isLandscape ? spacing.m : spacing.l,
      paddingBottom: Math.max(spacing.l, insets.bottom + spacing.m),
    },

    // Modal action buttons container
    modalActions: {
      paddingHorizontal: isTablet ? spacing.xl : responsiveSpacing.modal,
      paddingTop: spacing.m,
      paddingBottom: Math.max(spacing.l, insets.bottom + spacing.m),
      gap: isTablet ? spacing.l : spacing.m,
    },

    // Responsive button dimensions for modals
    modalButton: {
      height: isTablet ? 72 : isLandscape ? 56 : 64,
      minHeight: touchTarget.comfortable,
      borderRadius: borderRadius.large,
      paddingHorizontal: isTablet ? spacing.xl : spacing.l,
    },

    // Modal typography - senior-friendly scaling
    modalTypography: {
      title: isTablet ? 28 : isLandscape ? 22 : 24,
      subtitle: isTablet ? 18 : isLandscape ? 14 : 16,
      body: isTablet ? 20 : 18,
      label: isTablet ? 20 : 18,
      hint: isTablet ? 16 : 14,
      button: isTablet ? 20 : 18,
    },

    // Modal icon sizes
    modalIconSize: {
      header: isTablet ? 28 : 24,
      section: isTablet ? 24 : 20,
      button: isTablet ? 24 : 20,
      close: isTablet ? 28 : 24,
    },

    // Outline button - larger touch target
    outlineButton: {
      minHeight: touchTarget.comfortable,
      paddingVertical: isTablet ? spacing.l : spacing.m,
    },

    // Outline button text
    outlineButtonText: {
      fontSize: fontSize.small,
    },

    // Profile strength section
    profileStrengthLabel: {
      fontSize: fontSize.body,
    },
    profileStrengthPercentage: {
      fontSize: fontSize.sectionTitle,
    },
    profileStrengthHelper: {
      fontSize: fontSize.hint,
      lineHeight: fontSize.hint * 1.5,
    },

    // Progress bar - taller on tablets
    progressBarContainer: {
      height: isTablet ? 16 : 12,
      borderRadius: isTablet ? 8 : 6,
    },

    // Settings button - larger on tablets
    settingsButton: {
      width: touchTarget.iconButton,
      height: touchTarget.iconButton,
      borderRadius: touchTarget.iconButton / 2,
    },

    // Add photo placeholder - responsive
    addPhotoPlaceholder: {
      borderRadius: isTablet ? borderRadius.xlarge : borderRadius.large,
    },

    // Add photo text
    addPhotoText: {
      fontSize: fontSize.hint,
    },

    // Icon sizes for different contexts
    iconSize: {
      small: isTablet ? 20 : 18,
      medium: isTablet ? 26 : 22,
      large: isTablet ? 32 : 28,
      xlarge: isTablet ? 40 : 32,
    },

    // Input field height
    inputHeight: {
      standard: getInputHeight(),
      large: isTablet ? 72 : 64,
    },

    // Button heights
    buttonHeight: {
      standard: getButtonHeight(),
      large: touchTarget.large,
    },

    // Safe area padding for bottom sheets/modals
    safeAreaBottom: Math.max(insets.bottom, isLandscape ? 12 : 20),
  }), [
    contentWidth,
    screenMargin,
    screenWidth,
    screenHeight,
    isLandscape,
    isTablet,
    isSmallScreen,
    hp,
    wp,
    insets.top,
    insets.bottom,
    responsiveSpacing,
    fontSize,
    touchTarget,
    headerPhotoSize,
    photoItemWidth,
    photoGridGap,
    getInputHeight,
    getButtonHeight,
  ]);

  const logout = useAuthStore((state) => state.logout);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Accessibility: Reduced motion preference
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const checkReduceMotion = async () => {
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReduceMotion(isReduceMotionEnabled);
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => setReduceMotion(isEnabled)
    );

    return () => subscription?.remove();
  }, []);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Screen state
  const [showSettings, setShowSettings] = useState(false);

  // Profile data
  const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE);

  // Modal states
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState(0);
  const [showBasicModal, setShowBasicModal] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editLookingFor, setEditLookingFor] = useState('');
  const [editJob, setEditJob] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editReligion, setEditReligion] = useState('');
  const [editChildren, setEditChildren] = useState('');
  const [editLanguages, setEditLanguages] = useState<string[]>([]);

  // Additional state for improved modals
  const [showOtherLocation, setShowOtherLocation] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);

  // Toast notification state
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    photoIndex: number;
    isMainPhoto: boolean;
  }>({
    visible: false,
    photoIndex: -1,
    isMainPhoto: false,
  });

  // Story Responses state
  const storyComments = useStoryCommentsStore(selectReceivedComments);
  const unreadCommentCount = useStoryCommentsStore(selectUnreadCount);
  const { markAsRead, markAsReplied, likeBack, declineComment, fetchReceivedComments } = useStoryCommentsStore();
  const [showStoryResponsesModal, setShowStoryResponsesModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<StoryComment | null>(null);
  const [likingBackCommentId, setLikingBackCommentId] = useState<string | null>(null);
  const [decliningCommentId, setDecliningCommentId] = useState<string | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedUserInfo, setMatchedUserInfo] = useState<{
    name: string;
    photo?: string | null;
    matchId?: number;
  } | null>(null);

  // =============================================================================
  // TOAST HELPER
  // =============================================================================

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const calculateProfileCompletion = useCallback((): number => {
    let score = 0;
    const weights = {
      name: 10,
      age: 10,
      location: 10,
      bio: 15,
      photoMin: 15,
      photoExtra: 10,
      interests: 15,
      gender: 10,
      lookingFor: 5,
    };

    if (profile.name) score += weights.name;
    if (profile.age && parseInt(profile.age) >= 50) score += weights.age;
    if (profile.location) score += weights.location;
    if (profile.bio && profile.bio.length > 50) score += weights.bio;
    if (profile.photos.length >= 1) score += weights.photoMin;
    if (profile.photos.length >= 3) score += weights.photoExtra;
    if (profile.interests.length >= 3) score += weights.interests;
    if (profile.gender) score += weights.gender;
    if (profile.lookingFor) score += weights.lookingFor;

    return Math.min(score, 100);
  }, [profile]);

  const profileCompletion = calculateProfileCompletion();

  const getProfileStrengthMessage = () => {
    if (profileCompletion >= 100) return 'Your profile is complete! You are ready to find matches.';
    if (profileCompletion >= 80) return 'Almost there! Add a few more photos to get noticed.';
    if (profileCompletion >= 50) return 'Looking good! Complete your bio for better matches.';
    return 'Get started by adding a photo and filling out your profile.';
  };

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    loadProfile();
    // Fetch story comments when screen mounts
    fetchReceivedComments();
  }, [fetchReceivedComments]);

  // =============================================================================
  // API HANDLERS
  // =============================================================================

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await getProfile();

      // Parse looking for preference
      let lookingForDisplay = '';
      if (data.interestedIn) {
        try {
          const arr = JSON.parse(data.interestedIn);
          if (arr.includes('male') && arr.includes('female')) {
            lookingForDisplay = 'Both';
          } else if (arr.includes('male')) {
            lookingForDisplay = 'Men';
          } else if (arr.includes('female')) {
            lookingForDisplay = 'Women';
          }
        } catch {
          // Silent fail for parsing
        }
      }

      // Parse languages
      let languagesArray: string[] = [];
      if (data.languages) {
        try {
          languagesArray = JSON.parse(data.languages);
        } catch {
          // Silent fail for parsing
        }
      }

      // Build photos array with profile photo first
      const photosArray: string[] = [];
      if (data.profilePhotoUrl) {
        photosArray.push(data.profilePhotoUrl);
      }
      if (data.additionalPhotos) {
        photosArray.push(...(data.additionalPhotos as string[]));
      }

      setProfile({
        name: data.firstName || '',
        age: data.age?.toString() || '',
        location: data.city
          ? `${data.city}${data.country ? `, ${data.country}` : ''}`
          : '',
        bio: data.bio || '',
        photos: photosArray,
        interests: typeof data.interests === 'string'
          ? JSON.parse(data.interests || '[]')
          : (data.interests || []),
        gender: data.gender
          ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1)
          : '',
        lookingFor: lookingForDisplay,
        job: data.hobby || '',
        education: data.education || '',
        height: data.height || '',
        religion: data.religion || '',
        children: data.numberOfChildren?.toString() || '',
        languages: languagesArray,
      });

      // Animate content in (respects reduced motion preference)
      if (reduceMotion) {
        // Skip animation for users who prefer reduced motion
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      showToast('Unable to load your profile. Please check your connection.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // =============================================================================
  // BASIC INFO HANDLERS
  // =============================================================================

  const openBasicInfoEditor = useCallback(() => {
    setEditName(profile.name);
    setEditAge(profile.age || '50');
    setEditLocation(profile.location);
    // Check if location is a predefined one or custom
    const isCustomLocation = profile.location ? !PHILIPPINES_LOCATIONS.some(
      loc => profile.location.toLowerCase().includes(loc.toLowerCase())
    ) : false;
    setShowOtherLocation(isCustomLocation);
    setShowBasicModal(true);
  }, [profile]);

  const saveBasicInfo = useCallback(async () => {
    // Validation
    if (!editName.trim()) {
      showToast('Please enter your name to continue.', 'warning');
      return;
    }

    const ageNumber = parseInt(editAge, 10);
    if (isNaN(ageNumber) || ageNumber < 50 || ageNumber > 120) {
      showToast('Please enter your age between 50 and 120 years.', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      const locationParts = editLocation.split(',').map((s) => s.trim());

      await updateProfile({
        firstName: editName.trim(),
        age: ageNumber,
        city: locationParts[0] || '',
        country: locationParts[1] || '',
      });

      setProfile((prev) => ({
        ...prev,
        name: editName.trim(),
        age: editAge,
        location: editLocation,
      }));

      setShowBasicModal(false);
      showToast('Your basic information has been updated.', 'success');
    } catch (error) {
      console.error('Failed to save basic info:', error);
      showToast('Unable to save your information. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [editName, editAge, editLocation, showToast]);

  // =============================================================================
  // BIO HANDLERS
  // =============================================================================

  const openBioEditor = useCallback(() => {
    setEditBio(profile.bio);
    setShowTemplates(!profile.bio); // Show templates if bio is empty
    setShowBioModal(true);
  }, [profile.bio]);

  // Add a phrase to the bio
  const addPhraseToBio = useCallback((phrase: string) => {
    setEditBio((prev) => {
      if (prev.trim()) {
        // Add phrase with proper punctuation
        const lastChar = prev.trim().slice(-1);
        const needsPunctuation = !['.', '!', '?', ','].includes(lastChar);
        return prev.trim() + (needsPunctuation ? '. ' : ' ') + phrase;
      }
      return phrase;
    });
  }, []);

  // Apply a story template
  const applyStoryTemplate = useCallback((template: string) => {
    setEditBio(template);
    setShowTemplates(false);
  }, []);

  const saveBio = useCallback(async () => {
    try {
      setIsSaving(true);
      await updateProfile({ bio: editBio });

      setProfile((prev) => ({ ...prev, bio: editBio }));
      setShowBioModal(false);
      showToast('Your story has been updated.', 'success');
    } catch (error) {
      console.error('Failed to save bio:', error);
      showToast('Unable to save your story. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [editBio, showToast]);

  // =============================================================================
  // INTERESTS HANDLERS
  // =============================================================================

  const openInterestsEditor = useCallback(() => {
    setShowInterestsModal(true);
  }, []);

  // =============================================================================
  // PREFERENCES HANDLERS
  // =============================================================================

  const openPreferencesEditor = useCallback(() => {
    setEditGender(profile.gender);
    setEditLookingFor(profile.lookingFor);
    setShowPreferencesModal(true);
  }, [profile]);

  const savePreferences = useCallback(async () => {
    if (!editGender) {
      showToast('Please select your gender to continue.', 'warning');
      return;
    }

    try {
      setIsSaving(true);

      let interestedInJson = '["male"]';
      if (editLookingFor === 'Women') {
        interestedInJson = '["female"]';
      } else if (editLookingFor === 'Both') {
        interestedInJson = '["male","female"]';
      }

      await updateProfile({
        gender: editGender.toLowerCase() as 'male' | 'female',
        interestedIn: interestedInJson,
      });

      setProfile((prev) => ({
        ...prev,
        gender: editGender,
        lookingFor: editLookingFor,
      }));

      setShowPreferencesModal(false);
      showToast('Your preferences have been updated.', 'success');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      showToast('Unable to save your preferences. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [editGender, editLookingFor, showToast]);

  // =============================================================================
  // DETAILS HANDLERS
  // =============================================================================

  const openDetailsEditor = useCallback(() => {
    setEditJob(profile.job);
    setEditEducation(profile.education);
    setEditHeight(profile.height);
    setEditReligion(profile.religion);
    setEditChildren(profile.children);
    setEditLanguages([...profile.languages]);
    setShowDetailsModal(true);
  }, [profile]);

  const toggleLanguage = useCallback((language: string) => {
    setEditLanguages((prev) =>
      prev.includes(language)
        ? prev.filter((l) => l !== language)
        : [...prev, language]
    );
  }, []);

  const saveDetails = useCallback(async () => {
    try {
      setIsSaving(true);

      const languagesJson = editLanguages.length > 0
        ? JSON.stringify(editLanguages)
        : undefined;

      await updateProfile({
        hobby: editJob,
        education: editEducation,
        height: editHeight,
        religion: editReligion || undefined,
        numberOfChildren: editChildren ? parseInt(editChildren, 10) : undefined,
        languages: languagesJson,
      });

      setProfile((prev) => ({
        ...prev,
        job: editJob,
        education: editEducation,
        height: editHeight,
        religion: editReligion,
        children: editChildren,
        languages: editLanguages,
      }));

      setShowDetailsModal(false);
      showToast('Your details have been updated.', 'success');
    } catch (error) {
      console.error('Failed to save details:', error);
      showToast('Unable to save your details. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [editJob, editEducation, editHeight, editReligion, editChildren, editLanguages, showToast]);

  // =============================================================================
  // STORY RESPONSES HANDLERS
  // =============================================================================

  const openStoryResponse = useCallback((comment: StoryComment) => {
    setSelectedComment(comment);
    if (!comment.isRead) {
      markAsRead(comment.id);
    }
    setShowStoryResponsesModal(true);
  }, [markAsRead]);

  const handleReplyToComment = useCallback((comment: StoryComment) => {
    // TODO: Navigate to chat or create new conversation
    // For now, just mark as replied with a placeholder conversation ID
    markAsReplied(comment.id, `conv_${Date.now()}`);
    setShowStoryResponsesModal(false);
    setSelectedComment(null);
    showToast('Starting a conversation...', 'info');
  }, [markAsReplied, showToast]);

  const handleLikeBack = useCallback(async (comment: StoryComment) => {
    if (likingBackCommentId) return; // Prevent double-tap

    setLikingBackCommentId(comment.id);
    try {
      const response = await likeBack(comment.id);

      if (response.success && response.isMatch) {
        // Show match celebration modal
        setMatchedUserInfo({
          name: comment.senderName,
          photo: comment.senderPhoto,
          matchId: response.match?.id,
        });
        setShowMatchModal(true);
        showToast(`It's a match with ${comment.senderName}!`, 'success');
      } else {
        showToast(response.message || 'Failed to like back', 'error');
      }
    } catch (error) {
      console.error('Failed to like back:', error);
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLikingBackCommentId(null);
    }
  }, [likeBack, likingBackCommentId, showToast]);

  const handleDeclineComment = useCallback(async (comment: StoryComment) => {
    if (decliningCommentId) return; // Prevent double-tap

    setDecliningCommentId(comment.id);
    try {
      const success = await declineComment(comment.id);

      if (success) {
        showToast('Comment declined', 'info');
      } else {
        showToast('Failed to decline comment', 'error');
      }
    } catch (error) {
      console.error('Failed to decline comment:', error);
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setDecliningCommentId(null);
    }
  }, [declineComment, decliningCommentId, showToast]);

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  }, []);

  // =============================================================================
  // PHOTO HANDLERS - Enhanced with Gallery + Camera Options
  // =============================================================================

  // Show the photo picker modal (Gallery or Camera choice)
  const openPhotoPickerModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPhotoPickerModal(true);
  }, []);

  // Process the selected/captured image and upload it
  const processAndUploadPhoto = useCallback(async (imageUri: string) => {
    try {
      setIsSaving(true);

      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      const fileName = `photo-${Date.now()}.${fileExtension}`;

      const imageFile = {
        uri: imageUri,
        type: mimeType,
        name: fileName
      };

      if (profile.photos.length === 0) {
        // First photo becomes profile photo
        const uploadResult = await uploadProfilePhoto(imageFile);
        setProfile((prev) => ({
          ...prev,
          photos: [uploadResult.profilePhotoUrl],
        }));
        showToast('Your profile photo has been set!', 'success');
      } else {
        // Additional photos
        const uploadResult = await uploadAdditionalPhotos([imageFile]);
        if (uploadResult.additionalPhotoUrls && uploadResult.additionalPhotoUrls.length > 0) {
          setProfile((prev) => ({
            ...prev,
            photos: [...prev.photos, uploadResult.additionalPhotoUrls[0]],
          }));
          showToast('Photo added to your profile!', 'success');
        }
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      showToast('Unable to upload photo. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [profile.photos.length, showToast]);

  // Choose from Photo Gallery
  const pickFromGallery = useCallback(async () => {
    setShowPhotoPickerModal(false);

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select photos for your profile.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On iOS, this would open settings, on Android it does nothing useful
              // so we just show a toast
              showToast('Please enable photo access in your device settings.', 'warning');
            }}
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      await processAndUploadPhoto(result.assets[0].uri);
    } catch (error) {
      console.error('Failed to pick photo from gallery:', error);
      showToast('Unable to access your photos. Please try again.', 'error');
    }
  }, [processAndUploadPhoto, showToast]);

  // Take a Photo with Camera
  const takePhotoWithCamera = useCallback(async () => {
    setShowPhotoPickerModal(false);

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to take photos for your profile.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              showToast('Please enable camera access in your device settings.', 'warning');
            }}
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      await processAndUploadPhoto(result.assets[0].uri);
    } catch (error) {
      console.error('Failed to take photo:', error);
      showToast('Unable to access your camera. Please try again.', 'error');
    }
  }, [processAndUploadPhoto, showToast]);

  // Legacy addPhoto function that now opens the picker modal
  const addPhoto = useCallback(() => {
    openPhotoPickerModal();
  }, [openPhotoPickerModal]);

  // Show delete confirmation
  const handleDeletePhoto = useCallback((index: number) => {
    setDeleteConfirm({
      visible: true,
      photoIndex: index,
      isMainPhoto: index === 0,
    });
  }, []);

  // Actually delete the photo after confirmation
  const confirmDeletePhoto = useCallback(async () => {
    const { photoIndex, isMainPhoto } = deleteConfirm;
    setDeleteConfirm({ visible: false, photoIndex: -1, isMainPhoto: false });

    try {
      setIsSaving(true);

      if (isMainPhoto) {
        await deleteProfilePhoto();
      } else {
        await deletePhoto(photoIndex - 1);
      }

      setProfile((prev) => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== photoIndex),
      }));

      showToast('Photo has been removed.', 'success');
    } catch (error) {
      console.error('Failed to delete photo:', error);
      showToast('Unable to delete photo. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [deleteConfirm, showToast]);

  // Cancel delete
  const cancelDeletePhoto = useCallback(() => {
    setDeleteConfirm({ visible: false, photoIndex: -1, isMainPhoto: false });
  }, []);

  // =============================================================================
  // RENDER: SETTINGS SCREEN
  // =============================================================================

  if (showSettings) {
    return (
      <SettingsScreen
        onBack={() => setShowSettings(false)}
        onLogout={async () => {
          try {
            await logout();
          } catch (error) {
            console.error('Logout failed:', error);
            showToast('Unable to log out. Please try again.', 'error');
          }
        }}
      />
    );
  }

  // =============================================================================
  // RENDER: LOADING STATE - Enhanced Skeleton Loading
  // =============================================================================

  if (isLoading) {
    const skeletonPhotoSize = isTablet ? 130 : (isLandscape ? 80 : 100);
    const skeletonCardRadius = isTablet ? borderRadius.xlarge + 4 : borderRadius.xlarge;

    return (
      <View
        style={[
          styles.skeletonContainer,
          {
            paddingTop: insets.top + spacing.m,
            paddingLeft: insets.left + screenMargin,
            paddingRight: insets.right + screenMargin,
          }
        ]}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading your profile"
        accessibilityLiveRegion="polite"
      >
        <StatusBar barStyle="dark-content" backgroundColor={colors.gray[50]} />

        {/* Skeleton Header Card */}
        <View style={[styles.skeletonCard, { borderRadius: skeletonCardRadius }]}>
          <View style={styles.skeletonHeaderRow}>
            <SkeletonPlaceholder
              width={skeletonPhotoSize}
              height={skeletonPhotoSize}
              borderRadius={skeletonPhotoSize / 2}
            />
            <View style={styles.skeletonHeaderInfo}>
              <SkeletonPlaceholder width="70%" height={24} borderRadius={6} />
              <SkeletonPlaceholder width="50%" height={18} borderRadius={4} style={{ marginTop: 8 }} />
              <SkeletonPlaceholder width="40%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
          </View>
        </View>

        {/* Skeleton Profile Strength Card */}
        <View style={[styles.skeletonCard, { borderRadius: skeletonCardRadius, marginTop: spacing.l }]}>
          <View style={styles.skeletonStrengthRow}>
            <SkeletonPlaceholder width="40%" height={20} borderRadius={4} />
            <SkeletonPlaceholder width={50} height={24} borderRadius={4} />
          </View>
          <SkeletonPlaceholder width="100%" height={14} borderRadius={7} style={{ marginTop: 12 }} />
          <SkeletonPlaceholder width="80%" height={16} borderRadius={4} style={{ marginTop: 12 }} />
        </View>

        {/* Skeleton Story Card */}
        <View style={[styles.skeletonCard, { borderRadius: skeletonCardRadius, marginTop: spacing.l }]}>
          <View style={styles.skeletonSectionHeader}>
            <SkeletonPlaceholder width={24} height={24} borderRadius={12} />
            <SkeletonPlaceholder width={100} height={22} borderRadius={4} style={{ marginLeft: 8 }} />
          </View>
          <View style={{ padding: spacing.l }}>
            <SkeletonPlaceholder width="100%" height={18} borderRadius={4} />
            <SkeletonPlaceholder width="90%" height={18} borderRadius={4} style={{ marginTop: 8 }} />
            <SkeletonPlaceholder width="60%" height={18} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        </View>

        {/* Skeleton Interests Card */}
        <View style={[styles.skeletonCard, { borderRadius: skeletonCardRadius, marginTop: spacing.l }]}>
          <View style={styles.skeletonSectionHeader}>
            <SkeletonPlaceholder width={24} height={24} borderRadius={12} />
            <SkeletonPlaceholder width={120} height={22} borderRadius={4} style={{ marginLeft: 8 }} />
          </View>
          <View style={styles.skeletonChipsRow}>
            <SkeletonPlaceholder width={80} height={36} borderRadius={18} />
            <SkeletonPlaceholder width={100} height={36} borderRadius={18} />
            <SkeletonPlaceholder width={70} height={36} borderRadius={18} />
            <SkeletonPlaceholder width={90} height={36} borderRadius={18} />
          </View>
        </View>

        {/* Loading indicator with message */}
        <View style={styles.skeletonLoadingMessage}>
          <ActivityIndicator size="small" color={'#FF7B51'} />
          <Text style={styles.skeletonLoadingText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  // =============================================================================
  // PREMIUM GRADIENT THEME COLORS
  // =============================================================================
  const PREMIUM_GRADIENT = {
    top: '#FF7B51',      // Warm coral/orange
    topAlt: '#F68562',   // Lighter coral
    mid: '#8B7355',      // Muted olive-brown
    midAlt: '#A08060',   // Lighter olive
    bottom: '#349E92',   // Teal/sea-green
    bottomAlt: '#34A296', // Lighter teal
  };

  // =============================================================================
  // RENDER: MAIN CONTENT
  // =============================================================================

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}
      accessibilityLabel="Profile Screen"
      accessibilityRole="none"
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* ===== SCROLLABLE CONTENT ===== */}
      <Animated.ScrollView
        style={[
          styles.scrollView,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          responsiveStyles.scrollContent,
          isTablet && responsiveStyles.contentWrapper,
        ]}
        showsVerticalScrollIndicator={false}
        accessibilityRole="scrollbar"
        accessibilityLabel="Profile content, scroll to see more"
      >
        {/* ===== PREMIUM GLASSMORPHISM HEADER ===== */}
        <View style={[styles.premiumHeaderWrapper, { borderRadius: isTablet ? 32 : 28 }]}>
          {/* Glass Card with Inner Gradient */}
          <View style={[styles.premiumGlassCard, { borderRadius: isTablet ? 32 : 28 }]}>
            {/* Subtle inner gradient glow */}
            <LinearGradient
              colors={['rgba(255,123,81,0.15)', 'rgba(52,158,146,0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: isTablet ? 32 : 28 }]}
            />

            {/* Header Top Row: Logo + Settings */}
            <View style={styles.premiumHeaderTopRow}>
              <View style={styles.premiumBrandRow}>
                <View style={styles.premiumLogoCircle}>
                  <TanderLogoIcon size={isTablet ? 32 : 26} focused />
                </View>
                <View>
                  <Text style={[styles.premiumBrandText, { fontSize: isTablet ? 22 : 18 }]}>
                    My Profile
                  </Text>
                  <Text style={styles.premiumBrandSubtext}>
                    {profile.name ? `Welcome back, ${profile.name.split(' ')[0]}!` : 'Complete your profile'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.premiumSettingsButton, { width: isTablet ? 56 : 48, height: isTablet ? 56 : 48 }]}
                onPress={() => setShowSettings(true)}
                accessibilityLabel="Open Settings"
                accessibilityRole="button"
                accessibilityHint="Opens the settings menu"
              >
                <LinearGradient
                  colors={[PREMIUM_GRADIENT.top, PREMIUM_GRADIENT.bottom]}
                  style={styles.premiumSettingsGradient}
                >
                  <Feather name="settings" size={isTablet ? 24 : 20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Profile Content Row */}
            <View style={styles.premiumHeaderContent}>
              {/* Profile Photo with Premium Gradient Border */}
              <TouchableOpacity
                style={[
                  styles.premiumPhotoWrapper,
                  {
                    width: isTablet ? 140 : (isLandscape ? 100 : 120),
                    height: isTablet ? 140 : (isLandscape ? 100 : 120),
                    borderRadius: isTablet ? 70 : (isLandscape ? 50 : 60),
                  }
                ]}
                onPress={() => profile.photos.length > 0 ? setShowPhotoGallery(true) : openPhotoPickerModal()}
                accessibilityLabel={profile.photos.length > 0 ? 'View profile photo, tap to see all photos' : 'Add your profile photo'}
                accessibilityRole="button"
              >
                {/* Gradient border ring */}
                <LinearGradient
                  colors={[PREMIUM_GRADIENT.top, PREMIUM_GRADIENT.mid, PREMIUM_GRADIENT.bottom]}
                  style={[
                    styles.premiumPhotoBorderGradient,
                    {
                      width: isTablet ? 140 : (isLandscape ? 100 : 120),
                      height: isTablet ? 140 : (isLandscape ? 100 : 120),
                      borderRadius: isTablet ? 70 : (isLandscape ? 50 : 60),
                    }
                  ]}
                >
                  <View style={[
                    styles.premiumPhotoContainer,
                    {
                      width: isTablet ? 128 : (isLandscape ? 88 : 108),
                      height: isTablet ? 128 : (isLandscape ? 88 : 108),
                      borderRadius: isTablet ? 64 : (isLandscape ? 44 : 54),
                    }
                  ]}>
                    {profile.photos.length > 0 ? (
                      <Image
                        source={{ uri: profile.photos[0] }}
                        style={styles.premiumPhotoImage}
                      />
                    ) : (
                      <View style={styles.premiumPhotoPlaceholder}>
                        <Feather name="camera" size={isTablet ? 44 : 36} color={PREMIUM_GRADIENT.top} />
                        <Text style={[styles.premiumPhotoPlaceholderText, { color: PREMIUM_GRADIENT.top }]}>Add Photo</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
                {/* Photo Count Badge */}
                {profile.photos.length > 0 && (
                  <View style={styles.premiumPhotoBadge}>
                    <LinearGradient
                      colors={[PREMIUM_GRADIENT.top, PREMIUM_GRADIENT.bottom]}
                      style={styles.premiumPhotoBadgeGradient}
                    >
                      <Feather name="image" size={12} color="#fff" />
                      <Text style={styles.premiumPhotoBadgeText}>{profile.photos.length}</Text>
                    </LinearGradient>
                  </View>
                )}
              </TouchableOpacity>

              {/* Profile Info */}
              <View style={styles.premiumInfoContainer}>
                <TouchableOpacity
                  onPress={openBasicInfoEditor}
                  accessibilityLabel="Edit name and age"
                  accessibilityRole="button"
                  style={{ minHeight: touchTarget.minimum }}
                >
                  <Text style={[styles.premiumName, { fontSize: isTablet ? 28 : (isLandscape ? 22 : 26) }]}>
                    {profile.name || 'Your Name'}
                  </Text>
                  {profile.age && (
                    <Text style={[styles.premiumAge, { fontSize: isTablet ? 20 : 17 }]}>
                      {profile.age} years young
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={styles.premiumLocationRow}>
                  <View style={styles.premiumLocationIcon}>
                    <Feather name="map-pin" size={isTablet ? 16 : 14} color="#fff" />
                  </View>
                  <Text style={[styles.premiumLocation, { fontSize: isTablet ? 16 : 14 }]}>
                    {profile.location || 'Add your location'}
                  </Text>
                </View>

                {/* Quick Action Buttons */}
                <View style={styles.premiumQuickActions}>
                  <TouchableOpacity
                    style={styles.premiumQuickButton}
                    onPress={openPhotoPickerModal}
                    accessibilityLabel="Add a new photo"
                    accessibilityRole="button"
                  >
                    <LinearGradient
                      colors={[PREMIUM_GRADIENT.top, '#FF9068']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.premiumQuickButtonGradient}
                    >
                      <Feather name="camera" size={isTablet ? 18 : 16} color="#fff" />
                      <Text style={[styles.premiumQuickButtonText, { fontSize: isTablet ? 14 : 13 }]}>Add Photo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.premiumQuickButton}
                    onPress={openBioEditor}
                    accessibilityLabel="Edit your story"
                    accessibilityRole="button"
                  >
                    <LinearGradient
                      colors={[PREMIUM_GRADIENT.bottom, '#3DB8A8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.premiumQuickButtonGradient}
                    >
                      <Feather name="edit-3" size={isTablet ? 18 : 16} color="#fff" />
                      <Text style={[styles.premiumQuickButtonText, { fontSize: isTablet ? 14 : 13 }]}>Edit Story</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ===== SECTION 2: PROFILE STRENGTH - Premium Enhanced ===== */}
        <View style={[styles.enhancedProfileStrengthSection, { padding: responsiveSpacing.card }]}>
          {/* Header with icon and status badge */}
          <View style={styles.enhancedStrengthHeader}>
            <View style={styles.enhancedStrengthHeaderLeft}>
              <View style={styles.strengthIconContainer}>
                <LinearGradient
                  colors={profileCompletion >= 100 ? [PREMIUM_GRADIENT.bottom, '#3DB8A8'] : [PREMIUM_GRADIENT.top, '#FF9068']}
                  style={styles.strengthIconGradient}
                >
                  <Feather
                    name={profileCompletion >= 100 ? 'check-circle' : 'trending-up'}
                    size={isTablet ? 22 : 18}
                    color="#fff"
                  />
                </LinearGradient>
              </View>
              <Text style={[styles.enhancedStrengthLabel, responsiveStyles.profileStrengthLabel]}>
                Profile Strength
              </Text>
            </View>
            <View style={[
              styles.strengthPercentageBadge,
              profileCompletion >= 100 && styles.strengthPercentageBadgeComplete,
            ]}>
              <Text style={[
                styles.enhancedStrengthPercentage,
                responsiveStyles.profileStrengthPercentage,
                profileCompletion >= 100 && styles.strengthPercentageComplete,
              ]}>
                {profileCompletion}%
              </Text>
            </View>
          </View>

          {/* Animated Progress Bar */}
          <AnimatedProgressBar
            progress={profileCompletion}
            height={isTablet ? 16 : 14}
            showGlow={profileCompletion < 100}
          />

          {/* Status message with icon */}
          <View style={styles.strengthStatusContainer}>
            <Feather
              name={profileCompletion >= 100 ? 'award' : profileCompletion >= 80 ? 'star' : 'info'}
              size={isTablet ? 18 : 16}
              color={profileCompletion >= 100 ? PREMIUM_GRADIENT.bottom : PREMIUM_GRADIENT.top}
            />
            <Text style={[styles.enhancedStrengthHelper, responsiveStyles.profileStrengthHelper]}>
              {getProfileStrengthMessage()}
            </Text>
          </View>

          {/* Actionable tips for incomplete profiles */}
          {profileCompletion < 100 && (
            <View style={styles.strengthTipsContainer}>
              {profile.photos.length < 3 && (
                <ProfileStrengthTip
                  icon="camera"
                  message="Add more photos"
                  action="Profiles with 3+ photos get more matches"
                  onPress={() => setShowPhotoGallery(true)}
                />
              )}
              {!profile.bio && (
                <ProfileStrengthTip
                  icon="edit-3"
                  message="Write your story"
                  action="Help others know the real you"
                  onPress={openBioEditor}
                />
              )}
              {profile.interests.length < 3 && (
                <ProfileStrengthTip
                  icon="heart"
                  message="Add more interests"
                  action="Find people who share your passions"
                  onPress={openInterestsEditor}
                />
              )}
            </View>
          )}
        </View>

        {/* ===== SECTION 3: MY STORY - Enhanced ===== */}
        <View
          style={[styles.enhancedSectionCard, { borderRadius: responsiveStyles.sectionCard.borderRadius }]}
          accessible={true}
          accessibilityLabel="My Story section"
        >
          {/* Gradient accent bar at top - Premium Theme */}
          <LinearGradient
            colors={[PREMIUM_GRADIENT.top, PREMIUM_GRADIENT.mid, PREMIUM_GRADIENT.bottom]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.sectionAccentBar, { borderTopLeftRadius: responsiveStyles.sectionCard.borderRadius, borderTopRightRadius: responsiveStyles.sectionCard.borderRadius }]}
          />
          <View style={[styles.enhancedSectionHeader, { paddingHorizontal: responsiveSpacing.card }]}>
            <View style={styles.enhancedSectionHeaderLeft}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#FFF0EB' }]}>
                <Feather name="feather" size={isTablet ? 24 : 20} color={PREMIUM_GRADIENT.top} accessibilityElementsHidden />
              </View>
              <Text
                style={[styles.enhancedSectionTitle, responsiveStyles.sectionCardTitle]}
                accessibilityRole="header"
              >
                My Story
              </Text>
            </View>
            {profile.bio && (
              <View style={styles.sectionCompleteBadge}>
                <Feather name="check" size={14} color={'#2E8B7F'} />
              </View>
            )}
          </View>
          <View style={[styles.enhancedSectionContent, { padding: responsiveSpacing.card }]}>
            {profile.bio ? (
              <View style={styles.storyContentContainer}>
                <Text style={[styles.enhancedStoryText, responsiveStyles.storyText]}>{profile.bio}</Text>
                <View style={styles.storyQuoteDecoration}>
                  <Feather name="message-circle" size={16} color={'#FFD4C7'} />
                </View>
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIconCircle}>
                  <Feather name="edit-3" size={isTablet ? 32 : 28} color={'#F68562'} />
                </View>
                <Text style={[styles.emptyStateTitle, { fontSize: fontSize.body }]}>
                  Share your story
                </Text>
                <Text style={[styles.emptyStateDescription, { fontSize: fontSize.small, lineHeight: fontSize.small * 1.5 }]}>
                  Tell others what brings you joy, your journey, and what you are looking for in a companion.
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.enhancedSectionFooter, { paddingHorizontal: responsiveSpacing.card }]}>
            <TouchableOpacity
              style={[styles.enhancedOutlineButton, responsiveStyles.outlineButton]}
              onPress={openBioEditor}
              accessibilityLabel={profile.bio ? 'Edit My Story' : 'Write My Story'}
              accessibilityRole="button"
            >
              <Feather name={profile.bio ? 'edit-2' : 'plus'} size={isTablet ? 22 : 18} color={'#FF7B51'} />
              <Text style={[styles.enhancedOutlineButtonText, responsiveStyles.outlineButtonText]}>
                {profile.bio ? 'Edit My Story' : 'Write My Story'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== SECTION 4: MY INTERESTS - Enhanced ===== */}
        <View
          style={[styles.enhancedSectionCard, { borderRadius: responsiveStyles.sectionCard.borderRadius }]}
          accessible={true}
          accessibilityLabel="My Interests section"
        >
          {/* Gradient accent bar at top - Premium Theme */}
          <LinearGradient
            colors={[PREMIUM_GRADIENT.bottom, PREMIUM_GRADIENT.mid, PREMIUM_GRADIENT.top]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.sectionAccentBar, { borderTopLeftRadius: responsiveStyles.sectionCard.borderRadius, borderTopRightRadius: responsiveStyles.sectionCard.borderRadius }]}
          />
          <View style={[styles.enhancedSectionHeader, { paddingHorizontal: responsiveSpacing.card }]}>
            <View style={styles.enhancedSectionHeaderLeft}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#E8F7F5' }]}>
                <Feather name="heart" size={isTablet ? 24 : 20} color={PREMIUM_GRADIENT.bottom} accessibilityElementsHidden />
              </View>
              <Text
                style={[styles.enhancedSectionTitle, responsiveStyles.sectionCardTitle]}
                accessibilityRole="header"
              >
                My Interests
              </Text>
            </View>
            {profile.interests.length >= 3 && (
              <View style={styles.sectionCompleteBadge}>
                <Feather name="check" size={14} color={'#2E8B7F'} />
              </View>
            )}
            {profile.interests.length > 0 && (
              <View style={styles.interestCountBadge}>
                <Text style={styles.interestCountText}>{profile.interests.length}</Text>
              </View>
            )}
          </View>
          <View style={[styles.enhancedSectionContent, { padding: responsiveSpacing.card }]}>
            {profile.interests.length > 0 ? (
              <View
                style={[styles.enhancedInterestsGrid, { gap: isTablet ? spacing.m : spacing.s }]}
                accessibilityRole="list"
                accessibilityLabel={`Your interests: ${profile.interests.join(', ')}`}
              >
                {profile.interests.map((interest, index) => (
                  <View key={interest} style={styles.enhancedInterestChipContainer}>
                    <LinearGradient
                      colors={index % 2 === 0 ? ['#F68562', '#FF7B51'] : ['#34A296', '#349E92']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.enhancedInterestChip, responsiveStyles.interestChip]}
                    >
                      <Feather
                        name="heart"
                        size={isTablet ? 16 : 14}
                        color="rgba(255,255,255,0.8)"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.enhancedInterestChipText, responsiveStyles.interestChipText]}>{interest}</Text>
                    </LinearGradient>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <View style={[styles.emptyStateIconCircle, { backgroundColor: '#E8F7F5' }]}>
                  <Feather name="heart" size={isTablet ? 32 : 28} color={'#34A296'} />
                </View>
                <Text style={[styles.emptyStateTitle, { fontSize: fontSize.body }]}>
                  Add your interests
                </Text>
                <Text style={[styles.emptyStateDescription, { fontSize: fontSize.small, lineHeight: fontSize.small * 1.5 }]}>
                  Share your hobbies and passions to connect with like-minded people.
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.enhancedSectionFooter, { paddingHorizontal: responsiveSpacing.card }]}>
            <TouchableOpacity
              style={[styles.enhancedOutlineButton, responsiveStyles.outlineButton]}
              onPress={openInterestsEditor}
              accessibilityLabel={profile.interests.length > 0 ? 'Edit Interests' : 'Add Interests'}
              accessibilityRole="button"
            >
              <Feather name={profile.interests.length > 0 ? 'edit-2' : 'plus'} size={isTablet ? 22 : 18} color={'#FF7B51'} />
              <Text style={[styles.enhancedOutlineButtonText, responsiveStyles.outlineButtonText]}>
                {profile.interests.length > 0 ? 'Edit Interests' : 'Add Interests'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== SECTION 5: MY PHOTOS - Enhanced ===== */}
        <View
          style={[styles.enhancedSectionCard, { borderRadius: responsiveStyles.sectionCard.borderRadius }]}
          accessible={true}
          accessibilityLabel={`My Photos section, ${profile.photos.length} of 6 photos added`}
        >
          {/* Gradient accent bar at top */}
          <LinearGradient
            colors={['#F68562', '#FF7B51']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.sectionAccentBar, { borderTopLeftRadius: responsiveStyles.sectionCard.borderRadius, borderTopRightRadius: responsiveStyles.sectionCard.borderRadius }]}
          />
          <View style={[styles.enhancedSectionHeader, { paddingHorizontal: responsiveSpacing.card }]}>
            <View style={styles.enhancedSectionHeaderLeft}>
              <View style={styles.sectionIconContainer}>
                <Feather name="camera" size={isTablet ? 24 : 20} color={'#FF7B51'} accessibilityElementsHidden />
              </View>
              <Text
                style={[styles.enhancedSectionTitle, responsiveStyles.sectionCardTitle]}
                accessibilityRole="header"
              >
                My Photos
              </Text>
            </View>
            {/* Photo count indicator */}
            <View style={styles.photoCountIndicator}>
              <Text style={styles.photoCountCurrent}>{profile.photos.length}</Text>
              <Text style={styles.photoCountDivider}>/</Text>
              <Text style={styles.photoCountMax}>6</Text>
            </View>
          </View>

          {/* Photo progress dots */}
          <View style={[styles.photoProgressDots, { paddingHorizontal: responsiveSpacing.card }]}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.photoProgressDot,
                  i < profile.photos.length && styles.photoProgressDotFilled,
                  isTablet && { width: 10, height: 10 },
                ]}
              />
            ))}
          </View>

          <View style={[styles.enhancedSectionContent, { padding: responsiveSpacing.card }]}>
            {/* Enhanced Photo Grid - Clean 2-column layout */}
            <View style={styles.photoGridContainer}>
              {/* Add Photo Button - Always First when less than 6 photos */}
              {profile.photos.length < 6 && (
                <EnhancedAddPhotoButton
                  borderRadius={isTablet ? borderRadius.xlarge : borderRadius.large}
                  onPress={addPhoto}
                  isFirst={profile.photos.length === 0}
                  isTablet={isTablet}
                />
              )}

              {/* Photo Items with enhanced feedback */}
              {profile.photos.map((photo, index) => (
                <EnhancedPhotoItem
                  key={`photo-${index}`}
                  photo={photo}
                  index={index}
                  isMain={index === 0}
                  borderRadius={isTablet ? borderRadius.xlarge : borderRadius.large}
                  onPress={() => setShowPhotoGallery(true)}
                  isTablet={isTablet}
                />
              ))}
            </View>

            {/* Photo tips for empty state - senior-friendly sizing */}
            {profile.photos.length === 0 && (
              <View style={styles.photoTipsContainer}>
                <Text style={[styles.photoTipsTitle, { fontSize: isTablet ? 16 : 15 }]}>
                  Tips for great photos:
                </Text>
                <View style={styles.photoTipItem}>
                  <View style={styles.photoTipIconWrapper}>
                    <Feather name="check-circle" size={isTablet ? 18 : 16} color="#349E92" />
                  </View>
                  <Text style={[styles.photoTipItemText, { fontSize: isTablet ? 16 : 15 }]}>
                    Show your face clearly
                  </Text>
                </View>
                <View style={styles.photoTipItem}>
                  <View style={styles.photoTipIconWrapper}>
                    <Feather name="check-circle" size={isTablet ? 18 : 16} color="#349E92" />
                  </View>
                  <Text style={[styles.photoTipItemText, { fontSize: isTablet ? 16 : 15 }]}>
                    Use recent photos
                  </Text>
                </View>
                <View style={styles.photoTipItem}>
                  <View style={styles.photoTipIconWrapper}>
                    <Feather name="check-circle" size={isTablet ? 18 : 16} color="#349E92" />
                  </View>
                  <Text style={[styles.photoTipItemText, { fontSize: isTablet ? 16 : 15 }]}>
                    Include hobbies and activities
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ===== SECTION 6: PERSONAL DETAILS ===== */}
        <View
          style={[styles.sectionCard, { borderRadius: responsiveStyles.sectionCard.borderRadius }]}
          accessible={true}
          accessibilityLabel="Personal Details section"
        >
          <View style={[styles.sectionCardHeader, { paddingHorizontal: responsiveSpacing.card }]}>
            <View style={styles.sectionCardHeaderLeft}>
              <Feather name="user" size={isTablet ? 26 : 22} color={'#FF7B51'} accessibilityElementsHidden />
              <Text
                style={[styles.sectionCardTitle, responsiveStyles.sectionCardTitle]}
                accessibilityRole="header"
              >
                Personal Details
              </Text>
            </View>
          </View>
          <View style={styles.detailsListContent}>
            <TouchableOpacity
              style={[styles.detailRow, responsiveStyles.detailRow]}
              onPress={openDetailsEditor}
              accessibilityLabel={`Religion: ${profile.religion || 'Not set'}`}
              accessibilityRole="button"
            >
              <View style={styles.detailRowContent}>
                <Text style={[styles.detailRowLabel, responsiveStyles.detailRowLabel]}>Religion:</Text>
                <Text style={[styles.detailRowValue, responsiveStyles.detailRowValue]} numberOfLines={1}>
                  {profile.religion || 'Not set'}
                </Text>
              </View>
              <Feather name="chevron-right" size={isTablet ? 28 : 24} color={colors.gray[400]} />
            </TouchableOpacity>
            <View style={styles.detailDivider} />
            <TouchableOpacity
              style={[styles.detailRow, responsiveStyles.detailRow]}
              onPress={openDetailsEditor}
              accessibilityLabel={`Job: ${profile.job || 'Not set'}`}
              accessibilityRole="button"
            >
              <View style={styles.detailRowContent}>
                <Text style={[styles.detailRowLabel, responsiveStyles.detailRowLabel]}>Job:</Text>
                <Text style={[styles.detailRowValue, responsiveStyles.detailRowValue]} numberOfLines={1}>
                  {profile.job || 'Not set'}
                </Text>
              </View>
              <Feather name="chevron-right" size={isTablet ? 28 : 24} color={colors.gray[400]} />
            </TouchableOpacity>
            <View style={styles.detailDivider} />
            <TouchableOpacity
              style={[styles.detailRow, responsiveStyles.detailRow]}
              onPress={openDetailsEditor}
              accessibilityLabel={`Languages: ${profile.languages.join(', ') || 'Not set'}`}
              accessibilityRole="button"
            >
              <View style={styles.detailRowContent}>
                <Text style={[styles.detailRowLabel, responsiveStyles.detailRowLabel]}>Languages:</Text>
                <Text style={[styles.detailRowValue, responsiveStyles.detailRowValue]} numberOfLines={1}>
                  {profile.languages.join(', ') || 'Not set'}
                </Text>
              </View>
              <Feather name="chevron-right" size={isTablet ? 28 : 24} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== SECTION 7: STORY RESPONSES - Senior-Friendly ===== */}
        <View style={[styles.sectionCard, { borderRadius: responsiveStyles.sectionCard.borderRadius }]}>
          <View style={[styles.sectionCardHeader, { paddingHorizontal: responsiveSpacing.card }]}>
            <View style={styles.sectionCardHeaderLeft}>
              <Feather name="heart" size={isTablet ? 28 : 24} color={colors.romantic.pink} />
              <Text style={[styles.sectionCardTitle, responsiveStyles.sectionCardTitle]}>Story Responses</Text>
              {unreadCommentCount > 0 && (
                <View style={[styles.unreadBadge, isTablet && { minWidth: 32, height: 32, borderRadius: 16 }]}>
                  <Text style={[styles.unreadBadgeText, { fontSize: isTablet ? 17 : 15 }]}>{unreadCommentCount}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.sectionCardContent, { padding: responsiveSpacing.card }]}>
            {storyComments.length > 0 ? (
              <View style={styles.storyResponsesList}>
                {storyComments.slice(0, 3).map((comment) => (
                  <View
                    key={comment.id}
                    style={[
                      styles.storyResponseItem,
                      !comment.isRead && styles.storyResponseItemUnread,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.storyResponseMainContent}
                      onPress={() => openStoryResponse(comment)}
                      activeOpacity={0.7}
                      accessibilityLabel={`${!comment.isRead ? 'New message' : 'Message'} from ${comment.senderName}${comment.senderAge ? `, age ${comment.senderAge}` : ''}: ${comment.message.substring(0, 50)}`}
                      accessibilityRole="button"
                      accessibilityHint="Opens the full message"
                    >
                      <View style={styles.storyResponseAvatar}>
                        {comment.senderPhoto ? (
                          <Image
                            source={{ uri: comment.senderPhoto }}
                            style={styles.storyResponseAvatarImage}
                            accessibilityLabel={`Photo of ${comment.senderName}`}
                          />
                        ) : (
                          <View style={styles.storyResponseAvatarPlaceholder}>
                            <Feather name="user" size={28} color={colors.romantic.pink} />
                          </View>
                        )}
                        {!comment.isRead && <View style={styles.unreadDot} />}
                      </View>
                      <View style={styles.storyResponseContent}>
                        <View style={styles.storyResponseHeader}>
                          <Text style={styles.storyResponseName} numberOfLines={1}>
                            {comment.senderName}{comment.senderAge ? `, ${comment.senderAge}` : ''}
                          </Text>
                          <Text style={styles.storyResponseTime}>
                            {formatTimeAgo(comment.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.storyResponseMessage} numberOfLines={2}>
                          {comment.message}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Like Back / Pass buttons for PENDING comments, Matched badge for LIKED_BACK */}
                    {comment.status === 'LIKED_BACK' ? (
                      <View style={styles.matchedBadge}>
                        <Feather name="heart" size={16} color={colors.white} />
                        <Text style={styles.matchedBadgeText}>Matched!</Text>
                      </View>
                    ) : comment.status === 'PENDING' ? (
                      <View style={styles.likeBackActions}>
                        <TouchableOpacity
                          style={[
                            styles.passButton,
                            decliningCommentId === comment.id && styles.buttonDisabled,
                          ]}
                          onPress={() => handleDeclineComment(comment)}
                          disabled={decliningCommentId === comment.id || likingBackCommentId === comment.id}
                          activeOpacity={0.7}
                          accessibilityLabel={`Pass on ${comment.senderName}`}
                          accessibilityRole="button"
                        >
                          {decliningCommentId === comment.id ? (
                            <ActivityIndicator size="small" color={colors.gray[500]} />
                          ) : (
                            <Feather name="x" size={20} color={colors.gray[500]} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.likeBackButton,
                            likingBackCommentId === comment.id && styles.buttonDisabled,
                          ]}
                          onPress={() => handleLikeBack(comment)}
                          disabled={likingBackCommentId === comment.id || decliningCommentId === comment.id}
                          activeOpacity={0.7}
                          accessibilityLabel={`Like back ${comment.senderName} to match`}
                          accessibilityRole="button"
                        >
                          {likingBackCommentId === comment.id ? (
                            <ActivityIndicator size="small" color={colors.white} />
                          ) : (
                            <>
                              <Feather name="heart" size={18} color={colors.white} />
                              <Text style={styles.likeBackButtonText}>Like Back</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ))}
                {storyComments.length > 3 && onNavigateToStoryAdmirers && (
                  <TouchableOpacity
                    style={styles.viewAllResponsesButton}
                    onPress={onNavigateToStoryAdmirers}
                    activeOpacity={0.7}
                    accessibilityLabel={`View all ${storyComments.length} story responses`}
                    accessibilityRole="button"
                    accessibilityHint="Opens a list of all messages people have sent about your story"
                  >
                    <Text style={styles.viewAllResponsesText}>
                      View all {storyComments.length} responses
                    </Text>
                    <Feather name="arrow-right" size={22} color={'#E85A36'} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.emptyStoryResponses}>
                <Feather name="heart" size={56} color={colors.romantic.pinkLight} />
                <Text style={styles.emptyStoryResponsesTitle}>No responses yet</Text>
                <Text style={styles.emptyStoryResponsesText}>
                  When someone is touched by your story, their heartfelt messages will appear here.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* ===================================================================== */}
      {/* MODALS                                                                 */}
      {/* ===================================================================== */}

      {/* ----- Match Celebration Modal ----- */}
      {/* RESPONSIVE: Works on all phones, tablets, foldables in portrait & landscape */}
      <Modal
        visible={showMatchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMatchModal(false)}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={styles.matchModalBackdrop}>
          <View style={[
            styles.matchModalContainer,
            isTablet && styles.matchModalContainerTablet,
            // Apply responsive styles for match modal (centered dialog like delete confirm)
            {
              width: responsiveStyles.deleteConfirmModal.width,
              maxWidth: responsiveStyles.deleteConfirmModal.maxWidth,
            },
          ]}>
            <LinearGradient
              colors={['#FF7B51', '#349E92']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.matchModalGradient}
            >
              {/* Celebration Icon */}
              <View style={styles.matchModalIcon}>
                <Feather name="heart" size={56} color={colors.white} />
              </View>

              {/* Matched User Photo */}
              {matchedUserInfo?.photo ? (
                <Image
                  source={{ uri: matchedUserInfo.photo }}
                  style={styles.matchModalPhoto}
                />
              ) : (
                <View style={styles.matchModalPhotoPlaceholder}>
                  <Feather name="user" size={48} color={colors.white} />
                </View>
              )}

              {/* Match Text */}
              <Text style={styles.matchModalTitle}>It's a Match!</Text>
              <Text style={styles.matchModalSubtitle}>
                You and {matchedUserInfo?.name || 'your admirer'} liked each other
              </Text>

              {/* Action Buttons */}
              <View style={styles.matchModalActions}>
                <TouchableOpacity
                  style={styles.matchModalButtonPrimary}
                  onPress={() => {
                    setShowMatchModal(false);
                    setMatchedUserInfo(null);
                    // TODO: Navigate to conversation
                    showToast('Opening chat...', 'info');
                  }}
                  activeOpacity={0.8}
                  accessibilityLabel={`Send a message to ${matchedUserInfo?.name || 'your match'}`}
                  accessibilityRole="button"
                >
                  <Feather name="message-circle" size={22} color={'#E85A36'} />
                  <Text style={styles.matchModalButtonPrimaryText}>Send Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.matchModalButtonSecondary}
                  onPress={() => {
                    setShowMatchModal(false);
                    setMatchedUserInfo(null);
                  }}
                  activeOpacity={0.8}
                  accessibilityLabel="Continue browsing profiles"
                  accessibilityRole="button"
                >
                  <Text style={styles.matchModalButtonSecondaryText}>Keep Browsing</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* BASIC INFO MODAL - Fully Responsive for ALL Devices                     */}
      {/* Supports: iPhone SE to iPad Pro 12.9", Android phones/tablets, Foldables */}
      {/* ========================================================================= */}
      <Modal
        visible={showBasicModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBasicModal(false)}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: isTablet || isLandscape ? 'center' : 'flex-end',
            alignItems: 'center',
            paddingHorizontal: isTablet ? 40 : 0,
            paddingVertical: isTablet ? 40 : 0,
          }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={{
            flex: 1,
            backgroundColor: colors.white,
            width: isTablet ? Math.min(screenWidth * 0.85, 560) : '100%',
            maxWidth: isTablet ? 560 : undefined,
            maxHeight: isLandscape
              ? screenHeight - insets.top - insets.bottom - 40
              : isTablet
                ? screenHeight * 0.85
                : screenHeight * 0.92,
            borderRadius: isTablet || isLandscape ? 24 : 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            ...shadows.large,
          }}>
            {/* Modal Header */}
            <ModalHeader
              title="Basic Information"
              subtitle="Tell us about yourself"
              icon="user"
              onClose={() => setShowBasicModal(false)}
              isTablet={isTablet}
              isLandscape={isLandscape}
              fontSize={isTablet ? 26 : 22}
              touchTargetSize={isTablet ? 64 : 56}
            />

            {/* Scrollable Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: isTablet ? 32 : 20,
                paddingTop: isLandscape ? 12 : 20,
                paddingBottom: 24,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Name Input */}
              <View style={{ marginBottom: isLandscape ? 16 : 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{
                    width: isTablet ? 44 : 36,
                    height: isTablet ? 44 : 36,
                    borderRadius: isTablet ? 22 : 18,
                    backgroundColor: '#FFF0EB',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Feather name="user" size={isTablet ? 22 : 18} color={'#FF7B51'} />
                  </View>
                  <Text style={{
                    fontSize: isTablet ? 20 : 18,
                    fontWeight: '600',
                    color: colors.gray[800],
                  }}>
                    Your Name <Text style={{ color: colors.semantic.error }}>*</Text>
                  </Text>
                </View>
                <TextInput
                  style={{
                    height: isTablet ? 64 : 56,
                    backgroundColor: colors.gray[50],
                    borderRadius: 16,
                    paddingHorizontal: 20,
                    fontSize: isTablet ? 20 : 18,
                    color: colors.gray[900],
                    borderWidth: 2,
                    borderColor: colors.gray[200],
                  }}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.gray[500]}
                  autoCapitalize="words"
                  accessibilityLabel="Name input"
                  accessibilityHint="Enter your first name as you would like it displayed"
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Feather name="mic" size={isTablet ? 16 : 14} color={'#349E92'} />
                  <Text style={{
                    fontSize: isTablet ? 16 : 14,
                    color: colors.gray[500],
                    marginLeft: 6,
                  }}>
                    Tip: Use voice-to-text on your keyboard
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={{
                height: 1,
                backgroundColor: colors.gray[200],
                marginVertical: isLandscape ? 12 : 20,
              }} />

              {/* Age Stepper */}
              <View style={{ marginBottom: isLandscape ? 16 : 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{
                    width: isTablet ? 44 : 36,
                    height: isTablet ? 44 : 36,
                    borderRadius: isTablet ? 22 : 18,
                    backgroundColor: '#FFF0EB',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Feather name="calendar" size={isTablet ? 22 : 18} color={'#FF7B51'} />
                  </View>
                  <Text style={{
                    fontSize: isTablet ? 20 : 18,
                    fontWeight: '600',
                    color: colors.gray[800],
                  }}>
                    Your Age <Text style={{ color: colors.semantic.error }}>*</Text>
                  </Text>
                </View>
                <Text style={{
                  fontSize: isTablet ? 16 : 14,
                  color: colors.gray[500],
                  marginBottom: 16,
                  marginLeft: isTablet ? 56 : 48,
                }}>
                  Tap the - or + buttons to adjust your age
                </Text>
                <View style={{
                  backgroundColor: colors.gray[50],
                  borderRadius: 20,
                  padding: isTablet ? 24 : 20,
                  borderWidth: 2,
                  borderColor: colors.gray[200],
                }}>
                  <AgeStepper
                    value={parseInt(editAge, 10) || 50}
                    onChange={(value) => setEditAge(value.toString())}
                    min={50}
                    max={99}
                    isTablet={isTablet}
                    isLandscape={isLandscape}
                  />
                </View>
              </View>

              {/* Divider */}
              <View style={{
                height: 1,
                backgroundColor: colors.gray[200],
                marginVertical: isLandscape ? 12 : 20,
              }} />

              {/* Location Selection */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{
                    width: isTablet ? 44 : 36,
                    height: isTablet ? 44 : 36,
                    borderRadius: isTablet ? 22 : 18,
                    backgroundColor: '#FFF0EB',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Feather name="map-pin" size={isTablet ? 22 : 18} color={'#FF7B51'} />
                  </View>
                  <Text style={{
                    fontSize: isTablet ? 20 : 18,
                    fontWeight: '600',
                    color: colors.gray[800],
                  }}>
                    Your Location
                  </Text>
                </View>
                <Text style={{
                  fontSize: isTablet ? 16 : 14,
                  color: colors.gray[500],
                  marginBottom: 16,
                  marginLeft: isTablet ? 56 : 48,
                }}>
                  Tap to select your city or choose "Other"
                </Text>

                {/* Location Chips */}
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: isTablet ? 12 : 10,
                }}>
                  {PHILIPPINES_LOCATIONS.map((location) => {
                    const isSelected = editLocation === `${location}, Philippines` && !showOtherLocation;
                    return (
                      <TouchableOpacity
                        key={location}
                        style={{
                          minHeight: isTablet ? 56 : 48,
                          borderRadius: 24,
                          overflow: 'hidden',
                        }}
                        onPress={() => {
                          setEditLocation(`${location}, Philippines`);
                          setShowOtherLocation(false);
                        }}
                        accessibilityLabel={location}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        {isSelected ? (
                          <LinearGradient
                            colors={['#FF7B51', '#349E92']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: isTablet ? 20 : 16,
                              paddingVertical: isTablet ? 14 : 12,
                              gap: 8,
                            }}
                          >
                            <Feather name="check" size={16} color={colors.white} />
                            <Text style={{
                              fontSize: isTablet ? 16 : 15,
                              fontWeight: '600',
                              color: colors.white,
                            }}>{location}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: isTablet ? 20 : 16,
                            paddingVertical: isTablet ? 14 : 12,
                            backgroundColor: colors.gray[100],
                            borderRadius: 24,
                          }}>
                            <Text style={{
                              fontSize: isTablet ? 16 : 15,
                              color: colors.gray[700],
                            }}>{location}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Other Option */}
                  <TouchableOpacity
                    style={{
                      minHeight: isTablet ? 56 : 48,
                      borderRadius: 24,
                      overflow: 'hidden',
                    }}
                    onPress={() => {
                      setShowOtherLocation(true);
                      setEditLocation('');
                    }}
                    accessibilityLabel="Other location"
                    accessibilityRole="radio"
                    accessibilityState={{ selected: showOtherLocation }}
                  >
                    {showOtherLocation ? (
                      <LinearGradient
                        colors={['#349E92', '#FF7B51']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: isTablet ? 20 : 16,
                          paddingVertical: isTablet ? 14 : 12,
                          gap: 8,
                        }}
                      >
                        <Feather name="edit-2" size={16} color={colors.white} />
                        <Text style={{
                          fontSize: isTablet ? 16 : 15,
                          fontWeight: '600',
                          color: colors.white,
                        }}>Other</Text>
                      </LinearGradient>
                    ) : (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: isTablet ? 20 : 16,
                        paddingVertical: isTablet ? 14 : 12,
                        backgroundColor: '#E8F7F5',
                        borderRadius: 24,
                        borderWidth: 2,
                        borderColor: '#B5E3DD',
                        borderStyle: 'dashed',
                        gap: 8,
                      }}>
                        <Feather name="edit-2" size={16} color={'#2E8B7F'} />
                        <Text style={{
                          fontSize: isTablet ? 16 : 15,
                          color: '#277568',
                          fontWeight: '500',
                        }}>Other</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Custom Location Input */}
                {showOtherLocation && (
                  <View style={{ marginTop: 16 }}>
                    <TextInput
                      style={{
                        height: isTablet ? 64 : 56,
                        backgroundColor: colors.gray[50],
                        borderRadius: 16,
                        paddingHorizontal: 20,
                        fontSize: isTablet ? 20 : 18,
                        color: colors.gray[900],
                        borderWidth: 2,
                        borderColor: '#6DBFB5',
                      }}
                      value={editLocation}
                      onChangeText={setEditLocation}
                      placeholder="Type your city, country"
                      placeholderTextColor={colors.gray[500]}
                      accessibilityLabel="Custom location input"
                      accessibilityHint="Enter your city and country"
                      autoFocus
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 16,
              paddingHorizontal: isTablet ? 32 : 20,
              paddingTop: 16,
              paddingBottom: Math.max(24, insets.bottom + 16),
              borderTopWidth: 1,
              borderTopColor: colors.gray[100],
              backgroundColor: colors.white,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: isTablet ? 64 : 56,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: colors.gray[200],
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: colors.white,
                }}
                onPress={() => setShowBasicModal(false)}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Feather name="x" size={isTablet ? 22 : 20} color={colors.gray[600]} />
                <Text style={{
                  fontSize: isTablet ? 18 : 16,
                  fontWeight: '600',
                  color: colors.gray[600],
                }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1.5,
                  opacity: isSaving || !editName.trim() ? 0.6 : 1,
                }}
                onPress={saveBasicInfo}
                disabled={isSaving || !editName.trim()}
                accessibilityLabel="Save changes"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={isSaving || !editName.trim()
                    ? [colors.gray[300], colors.gray[400]]
                    : ['#FF7B51', '#349E92']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: isTablet ? 64 : 56,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={isTablet ? 24 : 20} color={colors.white} />
                      <Text style={{
                        fontSize: isTablet ? 18 : 16,
                        fontWeight: '700',
                        color: colors.white,
                      }}>Save</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* BIO/STORY MODAL - Fully Responsive for ALL Devices                      */}
      {/* Supports: iPhone SE to iPad Pro 12.9", Android phones/tablets, Foldables */}
      {/* ========================================================================= */}
      <Modal
        visible={showBioModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBioModal(false)}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: isTablet || isLandscape ? 'center' : 'flex-end',
            alignItems: 'center',
            paddingHorizontal: isTablet ? 40 : 0,
            paddingVertical: isTablet ? 40 : 0,
          }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={{
            flex: 1,
            backgroundColor: colors.white,
            width: isTablet ? Math.min(screenWidth * 0.85, 560) : '100%',
            maxWidth: isTablet ? 560 : undefined,
            maxHeight: isLandscape
              ? screenHeight - insets.top - insets.bottom - 40
              : isTablet
                ? screenHeight * 0.85
                : screenHeight * 0.92,
            borderRadius: isTablet || isLandscape ? 24 : 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            ...shadows.large,
          }}>
            {/* Modal Header */}
            <ModalHeader
              title="My Story"
              subtitle="Share what makes you special"
              icon="feather"
              onClose={() => setShowBioModal(false)}
              isTablet={isTablet}
              isLandscape={isLandscape}
              fontSize={isTablet ? 26 : 22}
              touchTargetSize={isTablet ? 64 : 56}
            />

            {/* Scrollable Content - Simple Story Builder */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: isTablet ? 28 : 20,
                paddingTop: 20,
                paddingBottom: 24,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Section Title */}
              <Text style={{
                fontSize: isTablet ? 17 : 16,
                fontWeight: '600',
                color: colors.gray[600],
                marginBottom: 16,
                textAlign: 'center',
              }}>
                Tap a story that fits you
              </Text>

              {/* Simple Template Cards - Vertical List */}
              <View style={{ gap: 12 }}>
                {STORY_TEMPLATES.map((item) => {
                  const isSelected = editBio === item.template;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: isTablet ? 20 : 16,
                        borderRadius: 16,
                        backgroundColor: isSelected ? '#FFF0EB' : colors.white,
                        borderWidth: 2,
                        borderColor: isSelected ? '#F68562' : colors.gray[200],
                        gap: 16,
                        minHeight: isTablet ? 80 : 72,
                      }}
                      onPress={() => setEditBio(item.template)}
                      accessibilityLabel={`Select ${item.title}`}
                    >
                      {/* Icon */}
                      <View style={{
                        width: isTablet ? 56 : 48,
                        height: isTablet ? 56 : 48,
                        borderRadius: isTablet ? 28 : 24,
                        backgroundColor: isSelected ? '#FF7B51' : '#FFE5DD',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        {isSelected ? (
                          <Feather name="check" size={isTablet ? 28 : 24} color={colors.white} />
                        ) : (
                          <Feather name={item.icon as React.ComponentProps<typeof Feather>['name']} size={isTablet ? 26 : 22} color={'#FF7B51'} />
                        )}
                      </View>

                      {/* Title */}
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: isTablet ? 18 : 17,
                          fontWeight: '600',
                          color: isSelected ? '#E85A36' : colors.gray[800],
                        }}>
                          {item.title}
                        </Text>
                        <Text style={{
                          fontSize: isTablet ? 14 : 13,
                          color: colors.gray[500],
                          marginTop: 2,
                        }} numberOfLines={1}>
                          {item.template.substring(0, 40)}...
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Divider */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 24,
                gap: 12,
              }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.gray[200] }} />
                <Text style={{ fontSize: 14, color: colors.gray[400], fontWeight: '500' }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.gray[200] }} />
              </View>

              {/* Custom Text Input */}
              <Text style={{
                fontSize: isTablet ? 16 : 15,
                fontWeight: '600',
                color: colors.gray[700],
                marginBottom: 12,
              }}>
                Write your own
              </Text>
              <View style={{
                backgroundColor: colors.gray[50],
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.gray[200],
                padding: 4,
              }}>
                <TextInput
                  style={{
                    fontSize: isTablet ? 17 : 16,
                    color: colors.gray[800],
                    minHeight: isTablet ? 120 : 100,
                    padding: isTablet ? 16 : 12,
                    textAlignVertical: 'top',
                  }}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell others about yourself..."
                  placeholderTextColor={colors.gray[500]}
                  multiline
                  maxLength={500}
                />
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingBottom: 8,
                }}>
                  {editBio.length > 0 ? (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: colors.gray[200],
                        borderRadius: 12,
                        gap: 4,
                      }}
                      onPress={() => setEditBio('')}
                    >
                      <Feather name="x" size={14} color={colors.gray[600]} />
                      <Text style={{ fontSize: 13, color: colors.gray[600] }}>Clear</Text>
                    </TouchableOpacity>
                  ) : (
                    <View />
                  )}
                  <Text style={{
                    fontSize: 13,
                    color: editBio.length > 450 ? '#FF7B51' : colors.gray[400],
                  }}>
                    {editBio.length}/500
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 16,
              paddingHorizontal: isTablet ? 32 : 20,
              paddingTop: 16,
              paddingBottom: Math.max(24, insets.bottom + 16),
              borderTopWidth: 1,
              borderTopColor: colors.gray[100],
              backgroundColor: colors.white,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: isTablet ? 64 : 56,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: colors.gray[200],
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: colors.white,
                }}
                onPress={() => setShowBioModal(false)}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Feather name="x" size={isTablet ? 22 : 20} color={colors.gray[600]} />
                <Text style={{
                  fontSize: isTablet ? 18 : 16,
                  fontWeight: '600',
                  color: colors.gray[600],
                }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1.5,
                  opacity: isSaving ? 0.6 : 1,
                }}
                onPress={saveBio}
                disabled={isSaving}
                accessibilityLabel="Save my story"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={isSaving
                    ? [colors.gray[300], colors.gray[400]]
                    : ['#FF7B51', '#349E92']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: isTablet ? 64 : 56,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={isTablet ? 24 : 20} color={colors.white} />
                      <Text style={{
                        fontSize: isTablet ? 18 : 16,
                        fontWeight: '700',
                        color: colors.white,
                      }}>Save Story</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* INTERESTS MODAL - Enhanced UI/UX Component                              */}
      {/* Features: Visual icons, search, animated chips, selected bar            */}
      {/* ========================================================================= */}
      <InterestsModal
        visible={showInterestsModal}
        onClose={() => setShowInterestsModal(false)}
        selectedInterests={profile.interests || []}
        onSave={async (interests) => {
          setIsSaving(true);
          try {
            await updateProfile({ interests: JSON.stringify(interests) });
            setProfile((prev) => ({ ...prev, interests }));
            setShowInterestsModal(false);
            showToast('Your interests have been updated.', 'success');
          } catch (error) {
            console.error('Failed to save interests:', error);
            showToast('Failed to save interests. Please try again.', 'error');
          } finally {
            setIsSaving(false);
          }
        }}
        isSaving={isSaving}
      />

      {/* ========================================================================= */}
      {/* PREFERENCES MODAL - Fully Responsive for ALL Devices                    */}
      {/* Supports: iPhone SE to iPad Pro 12.9", Android phones/tablets, Foldables */}
      {/* ========================================================================= */}
      <Modal
        visible={showPreferencesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreferencesModal(false)}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: isTablet || isLandscape ? 'center' : 'flex-end',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 40 : 0,
          paddingVertical: isTablet ? 40 : 0,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: colors.white,
            width: isTablet ? Math.min(screenWidth * 0.85, 560) : '100%',
            maxWidth: isTablet ? 560 : undefined,
            maxHeight: isLandscape
              ? screenHeight - insets.top - insets.bottom - 40
              : isTablet
                ? screenHeight * 0.85
                : screenHeight * 0.92,
            borderRadius: isTablet || isLandscape ? 24 : 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            ...shadows.large,
          }}>
            {/* Modal Header */}
            <ModalHeader
              title="Dating Preferences"
              subtitle="Who are you looking for?"
              icon="users"
              onClose={() => setShowPreferencesModal(false)}
              isTablet={isTablet}
              isLandscape={isLandscape}
              fontSize={isTablet ? 26 : 22}
              touchTargetSize={isTablet ? 64 : 56}
            />

            {/* Scrollable Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: isTablet ? 32 : 20,
                paddingTop: isLandscape ? 12 : 20,
                paddingBottom: 24,
              }}
              showsVerticalScrollIndicator={false}
            >
              {/* Gender Selection */}
              <View style={{ marginBottom: isLandscape ? 16 : 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{
                    width: isTablet ? 48 : 40,
                    height: isTablet ? 48 : 40,
                    borderRadius: isTablet ? 24 : 20,
                    overflow: 'hidden',
                    marginRight: 12,
                  }}>
                    <LinearGradient
                      colors={['#FF7B51', '#F68562']}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Feather name="user" size={isTablet ? 22 : 18} color={colors.white} />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text style={{
                      fontSize: isTablet ? 20 : 18,
                      fontWeight: '700',
                      color: colors.gray[800],
                    }}>
                      I am <Text style={{ color: colors.semantic.error }}>*</Text>
                    </Text>
                    <Text style={{
                      fontSize: isTablet ? 15 : 14,
                      color: colors.gray[500],
                      marginTop: 2,
                    }}>
                      Tap to select your gender
                    </Text>
                  </View>
                </View>

                {/* Gender Buttons */}
                <View style={{
                  flexDirection: 'row',
                  gap: isTablet ? 16 : 12,
                }}>
                  <VisualGenderButton
                    gender="Male"
                    selected={editGender === 'Male'}
                    onPress={() => setEditGender('Male')}
                  />
                  <VisualGenderButton
                    gender="Female"
                    selected={editGender === 'Female'}
                    onPress={() => setEditGender('Female')}
                  />
                </View>
              </View>

              {/* Divider */}
              <View style={{
                height: 1,
                backgroundColor: colors.gray[200],
                marginVertical: isLandscape ? 12 : 20,
              }} />

              {/* Looking For Selection */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{
                    width: isTablet ? 48 : 40,
                    height: isTablet ? 48 : 40,
                    borderRadius: isTablet ? 24 : 20,
                    overflow: 'hidden',
                    marginRight: 12,
                  }}>
                    <LinearGradient
                      colors={['#349E92', '#34A296']}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Feather name="heart" size={isTablet ? 22 : 18} color={colors.white} />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text style={{
                      fontSize: isTablet ? 20 : 18,
                      fontWeight: '700',
                      color: colors.gray[800],
                    }}>
                      Looking for
                    </Text>
                    <Text style={{
                      fontSize: isTablet ? 15 : 14,
                      color: colors.gray[500],
                      marginTop: 2,
                    }}>
                      Who would you like to meet?
                    </Text>
                  </View>
                </View>

                {/* Looking For Options */}
                <View style={{ gap: isTablet ? 12 : 10 }}>
                  {LOOKING_FOR_OPTIONS.map((option) => (
                    <VisualLookingForButton
                      key={option}
                      option={option}
                      selected={editLookingFor === option}
                      onPress={() => setEditLookingFor(option)}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Footer Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 16,
              paddingHorizontal: isTablet ? 32 : 20,
              paddingTop: 16,
              paddingBottom: Math.max(24, insets.bottom + 16),
              borderTopWidth: 1,
              borderTopColor: colors.gray[100],
              backgroundColor: colors.white,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: isTablet ? 64 : 56,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: colors.gray[200],
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: colors.white,
                }}
                onPress={() => setShowPreferencesModal(false)}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Feather name="x" size={isTablet ? 22 : 20} color={colors.gray[600]} />
                <Text style={{
                  fontSize: isTablet ? 18 : 16,
                  fontWeight: '600',
                  color: colors.gray[600],
                }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1.5,
                  opacity: isSaving || !editGender ? 0.6 : 1,
                }}
                onPress={savePreferences}
                disabled={isSaving || !editGender}
                accessibilityLabel="Save preferences"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={isSaving || !editGender
                    ? [colors.gray[300], colors.gray[400]]
                    : ['#FF7B51', '#349E92']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: isTablet ? 64 : 56,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={isTablet ? 24 : 20} color={colors.white} />
                      <Text style={{
                        fontSize: isTablet ? 18 : 16,
                        fontWeight: '700',
                        color: colors.white,
                      }}>Save Preferences</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* DETAILS MODAL - Fully Responsive for ALL Devices                        */}
      {/* Supports: iPhone SE to iPad Pro 12.9", Android phones/tablets, Foldables */}
      {/* ========================================================================= */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: isTablet || isLandscape ? 'center' : 'flex-end',
            alignItems: 'center',
            paddingHorizontal: isTablet ? 40 : 0,
            paddingVertical: isTablet ? 40 : 0,
          }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={{
            flex: 1,
            backgroundColor: colors.white,
            width: isTablet ? Math.min(screenWidth * 0.9, 640) : '100%',
            maxWidth: isTablet ? 640 : undefined,
            maxHeight: isLandscape
              ? screenHeight - insets.top - insets.bottom - 40
              : isTablet
                ? screenHeight * 0.9
                : screenHeight * 0.92,
            borderRadius: isTablet || isLandscape ? 24 : 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            ...shadows.large,
          }}>
            {/* Modal Header */}
            <ModalHeader
              title="Personal Details"
              subtitle="Tell us more about yourself"
              icon="clipboard"
              onClose={() => setShowDetailsModal(false)}
              isTablet={isTablet}
              isLandscape={isLandscape}
              fontSize={isTablet ? 26 : 22}
              touchTargetSize={isTablet ? 64 : 56}
            />

            {/* Scrollable Form Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: isTablet ? 32 : 20,
                paddingTop: isLandscape ? 12 : 20,
                paddingBottom: 24,
              }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Two-Column Layout for Landscape/Tablet */}
              <View style={{
                flexDirection: isLandscape || isTablet ? 'row' : 'column',
                gap: isLandscape || isTablet ? 24 : 0,
              }}>
                {/* Left Column */}
                <View style={{ flex: isLandscape || isTablet ? 1 : undefined }}>
                  {/* Career/Work */}
                  <View style={{ marginBottom: isLandscape ? 12 : 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                      <Feather name="briefcase" size={isTablet ? 20 : 18} color={colors.gray[500]} />
                      <Text style={{
                        fontSize: isTablet ? 17 : 16,
                        fontWeight: '600',
                        color: colors.gray[700],
                      }}>Career / Work</Text>
                    </View>
                    <TextInput
                      style={{
                        height: isTablet ? 60 : 52,
                        backgroundColor: colors.gray[50],
                        borderRadius: 14,
                        paddingHorizontal: 16,
                        fontSize: isTablet ? 18 : 16,
                        color: colors.gray[900],
                        borderWidth: 2,
                        borderColor: colors.gray[200],
                      }}
                      value={editJob}
                      onChangeText={setEditJob}
                      placeholder="e.g., Retired Teacher"
                      placeholderTextColor={colors.gray[500]}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* Education */}
                  <View style={{ marginBottom: isLandscape ? 12 : 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                      <Feather name="book-open" size={isTablet ? 20 : 18} color={colors.gray[500]} />
                      <Text style={{
                        fontSize: isTablet ? 17 : 16,
                        fontWeight: '600',
                        color: colors.gray[700],
                      }}>Education</Text>
                    </View>
                    <TextInput
                      style={{
                        height: isTablet ? 60 : 52,
                        backgroundColor: colors.gray[50],
                        borderRadius: 14,
                        paddingHorizontal: 16,
                        fontSize: isTablet ? 18 : 16,
                        color: colors.gray[900],
                        borderWidth: 2,
                        borderColor: colors.gray[200],
                      }}
                      value={editEducation}
                      onChangeText={setEditEducation}
                      placeholder="e.g., University Graduate"
                      placeholderTextColor={colors.gray[500]}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* Height and Children Row */}
                  <View style={{
                    flexDirection: 'row',
                    gap: 16,
                    marginBottom: isLandscape ? 12 : 20,
                  }}>
                    {/* Height */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                        <Feather name="maximize-2" size={isTablet ? 20 : 18} color={colors.gray[500]} />
                        <Text style={{
                          fontSize: isTablet ? 17 : 16,
                          fontWeight: '600',
                          color: colors.gray[700],
                        }}>Height</Text>
                      </View>
                      <TextInput
                        style={{
                          height: isTablet ? 60 : 52,
                          backgroundColor: colors.gray[50],
                          borderRadius: 14,
                          paddingHorizontal: 16,
                          fontSize: isTablet ? 18 : 16,
                          color: colors.gray[900],
                          borderWidth: 2,
                          borderColor: colors.gray[200],
                        }}
                        value={editHeight}
                        onChangeText={setEditHeight}
                        placeholder="5'6 or 168cm"
                        placeholderTextColor={colors.gray[500]}
                      />
                    </View>

                    {/* Children */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                        <Feather name="users" size={isTablet ? 20 : 18} color={colors.gray[500]} />
                        <Text style={{
                          fontSize: isTablet ? 17 : 16,
                          fontWeight: '600',
                          color: colors.gray[700],
                        }}>Children</Text>
                      </View>
                      <TextInput
                        style={{
                          height: isTablet ? 60 : 52,
                          backgroundColor: colors.gray[50],
                          borderRadius: 14,
                          paddingHorizontal: 16,
                          fontSize: isTablet ? 18 : 16,
                          color: colors.gray[900],
                          borderWidth: 2,
                          borderColor: colors.gray[200],
                          textAlign: 'center',
                        }}
                        value={editChildren}
                        onChangeText={(text) => setEditChildren(text.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        placeholderTextColor={colors.gray[500]}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                  </View>
                </View>

                {/* Right Column */}
                <View style={{ flex: isLandscape || isTablet ? 1 : undefined }}>
                  {/* Religion */}
                  <View style={{ marginBottom: isLandscape ? 12 : 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                      <Feather name="heart" size={isTablet ? 20 : 18} color={colors.gray[500]} />
                      <Text style={{
                        fontSize: isTablet ? 17 : 16,
                        fontWeight: '600',
                        color: colors.gray[700],
                      }}>Religion</Text>
                    </View>
                    <Text style={{
                      fontSize: isTablet ? 14 : 13,
                      color: colors.gray[500],
                      marginBottom: 12,
                    }}>
                      Tap to select (optional)
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: isTablet ? 10 : 8,
                    }}>
                      {RELIGION_OPTIONS.map((option) => {
                        const isSelected = editReligion === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: isTablet ? 16 : 14,
                              paddingVertical: isTablet ? 12 : 10,
                              borderRadius: 20,
                              backgroundColor: isSelected ? '#FF7B51' : colors.gray[100],
                              gap: 6,
                              minHeight: isTablet ? 48 : 44,
                            }}
                            onPress={() => setEditReligion(isSelected ? '' : option)}
                            accessibilityLabel={option}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isSelected }}
                          >
                            {isSelected && <Feather name="check" size={14} color={colors.white} />}
                            <Text style={{
                              fontSize: isTablet ? 15 : 14,
                              color: isSelected ? colors.white : colors.gray[700],
                              fontWeight: isSelected ? '600' : '400',
                            }}>
                              {option}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Languages */}
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                      <Feather name="globe" size={isTablet ? 20 : 18} color={colors.gray[500]} />
                      <Text style={{
                        fontSize: isTablet ? 17 : 16,
                        fontWeight: '600',
                        color: colors.gray[700],
                      }}>Languages</Text>
                      {editLanguages.length > 0 && (
                        <View style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 12,
                          backgroundColor: '#D1EDE9',
                        }}>
                          <Text style={{
                            fontSize: 12,
                            color: '#277568',
                            fontWeight: '600',
                          }}>
                            {editLanguages.length} selected
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{
                      fontSize: isTablet ? 14 : 13,
                      color: colors.gray[500],
                      marginBottom: 12,
                    }}>
                      Tap all languages you speak
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: isTablet ? 10 : 8,
                    }}>
                      {LANGUAGE_OPTIONS.map((language) => {
                        const isSelected = editLanguages.includes(language);
                        return (
                          <TouchableOpacity
                            key={language}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: isTablet ? 16 : 14,
                              paddingVertical: isTablet ? 12 : 10,
                              borderRadius: 20,
                              backgroundColor: isSelected ? '#349E92' : colors.gray[100],
                              gap: 6,
                              minHeight: isTablet ? 48 : 44,
                            }}
                            onPress={() => toggleLanguage(language)}
                            accessibilityLabel={language}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: isSelected }}
                          >
                            {isSelected && <Feather name="check" size={14} color={colors.white} />}
                            <Text style={{
                              fontSize: isTablet ? 15 : 14,
                              color: isSelected ? colors.white : colors.gray[700],
                              fontWeight: isSelected ? '600' : '400',
                            }}>
                              {language}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 16,
              paddingHorizontal: isTablet ? 32 : 20,
              paddingTop: 16,
              paddingBottom: Math.max(24, insets.bottom + 16),
              borderTopWidth: 1,
              borderTopColor: colors.gray[100],
              backgroundColor: colors.white,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: isTablet ? 64 : 56,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: colors.gray[200],
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: colors.white,
                }}
                onPress={() => setShowDetailsModal(false)}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Feather name="x" size={isTablet ? 22 : 20} color={colors.gray[600]} />
                <Text style={{
                  fontSize: isTablet ? 18 : 16,
                  fontWeight: '600',
                  color: colors.gray[600],
                }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1.5,
                  opacity: isSaving ? 0.6 : 1,
                }}
                onPress={saveDetails}
                disabled={isSaving}
                accessibilityLabel="Save personal details"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={isSaving
                    ? [colors.gray[300], colors.gray[400]]
                    : ['#FF7B51', '#349E92']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: isTablet ? 64 : 56,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={isTablet ? 24 : 20} color={colors.white} />
                      <Text style={{
                        fontSize: isTablet ? 18 : 16,
                        fontWeight: '700',
                        color: colors.white,
                      }}>Save Details</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* PHOTO GALLERY MODAL - Fully Responsive for ALL Devices                  */}
      {/* Supports: iPhone SE to iPad Pro 12.9", Android phones/tablets, Foldables */}
      {/* ========================================================================= */}
      <Modal
        visible={showPhotoGallery}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoGallery(false)}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: isTablet || isLandscape ? 'center' : 'flex-end',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 40 : 0,
          paddingVertical: isTablet ? 40 : 0,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: colors.white,
            width: isTablet ? Math.min(screenWidth * 0.9, 640) : '100%',
            maxWidth: isTablet ? 640 : undefined,
            maxHeight: isLandscape
              ? screenHeight - insets.top - insets.bottom - 40
              : isTablet
                ? screenHeight * 0.9
                : screenHeight * 0.92,
            borderRadius: isTablet || isLandscape ? 24 : 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            ...shadows.large,
          }}>
            {/* Premium Header with Gradient */}
            <LinearGradient
              colors={['#FF7B51', '#E85A36']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: isTablet ? 32 : 20,
                paddingTop: isLandscape ? 16 : 20,
                paddingBottom: isLandscape ? 12 : 16,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: isTablet ? 52 : 44,
                    height: isTablet ? 52 : 44,
                    borderRadius: isTablet ? 26 : 22,
                    backgroundColor: colors.white,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Feather name="image" size={isTablet ? 26 : 22} color={'#FF7B51'} />
                  </View>
                  <View>
                    <Text style={{
                      fontSize: isTablet ? 26 : 22,
                      fontWeight: '700',
                      color: colors.white,
                    }}>
                      My Photos
                    </Text>
                    <Text style={{
                      fontSize: isTablet ? 15 : 14,
                      color: 'rgba(255,255,255,0.9)',
                    }}>
                      Add up to 6 photos
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={{
                    width: isTablet ? 56 : 48,
                    height: isTablet ? 56 : 48,
                    borderRadius: isTablet ? 28 : 24,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => setShowPhotoGallery(false)}
                  accessibilityLabel="Close photo gallery"
                  accessibilityRole="button"
                  accessibilityHint="Closes the photo gallery"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={isTablet ? 28 : 24} color={colors.white} />
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  flex: 1,
                  height: 8,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    width: `${(profile.photos.length / 6) * 100}%`,
                    height: '100%',
                    backgroundColor: colors.white,
                    borderRadius: 4,
                  }} />
                </View>
                <Text style={{
                  fontSize: isTablet ? 15 : 14,
                  color: colors.white,
                  fontWeight: '600',
                }}>
                  {profile.photos.length}/6
                </Text>
              </View>
            </LinearGradient>

            {/* Photo Tips (only in portrait, when < 3 photos) */}
            {!isLandscape && profile.photos.length < 3 && (
              <View style={{
                marginHorizontal: isTablet ? 32 : 20,
                marginTop: 16,
                padding: 16,
                backgroundColor: '#E8F7F5',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#B5E3DD',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <View style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: '#D1EDE9',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Feather name="zap" size={14} color={'#2E8B7F'} />
                  </View>
                  <Text style={{
                    fontSize: isTablet ? 16 : 15,
                    fontWeight: '600',
                    color: '#277568',
                  }}>
                    Tips for Great Photos
                  </Text>
                </View>
                <View style={{ gap: 6 }}>
                  {['Use clear, recent photos', 'Show your face clearly', 'Include hobbies'].map((tip) => (
                    <View key={tip} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: '#349E92',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Feather name="check" size={10} color={colors.white} />
                      </View>
                      <Text style={{
                        fontSize: isTablet ? 14 : 13,
                        color: '#277568',
                      }}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Photo Slots Indicator */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: isTablet ? 32 : 20,
              paddingVertical: isLandscape ? 10 : 14,
            }}>
              <Text style={{
                fontSize: isTablet ? 15 : 14,
                fontWeight: '600',
                color: colors.gray[600],
              }}>
                Photo Slots
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={{
                      width: isTablet ? 32 : 28,
                      height: isTablet ? 32 : 28,
                      borderRadius: isTablet ? 16 : 14,
                      backgroundColor: i < profile.photos.length
                        ? (i === 0 ? '#FF7B51' : '#349E92')
                        : colors.gray[200],
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {i < profile.photos.length ? (
                      <Feather
                        name={i === 0 ? 'star' : 'check'}
                        size={isTablet ? 14 : 12}
                        color={colors.white}
                      />
                    ) : (
                      <Text style={{
                        fontSize: isTablet ? 13 : 12,
                        color: colors.gray[500],
                        fontWeight: '600',
                      }}>{i + 1}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Photo Grid */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: isTablet ? 32 : 20,
                paddingVertical: isLandscape ? 10 : 16,
                paddingBottom: 24,
              }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: isTablet ? 16 : 12,
              }}>
                {/* Add Photo Card */}
                {profile.photos.length < 6 && (
                  <TouchableOpacity
                    style={{
                      width: photoItemWidth,
                      aspectRatio: 0.8,
                      borderRadius: 16,
                      overflow: 'hidden',
                    }}
                    onPress={addPhoto}
                    activeOpacity={0.8}
                    accessibilityLabel="Add new photo"
                    accessibilityRole="button"
                  >
                    <LinearGradient
                      colors={profile.photos.length === 0
                        ? ['#F68562', '#E85A36']
                        : [colors.gray[100], colors.gray[200]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: profile.photos.length === 0 ? 'transparent' : colors.gray[300],
                        borderStyle: 'dashed',
                        borderRadius: 16,
                        padding: 16,
                      }}
                    >
                      <View style={{
                        width: isTablet ? 64 : 56,
                        height: isTablet ? 64 : 56,
                        borderRadius: isTablet ? 32 : 28,
                        backgroundColor: profile.photos.length === 0
                          ? 'rgba(255,255,255,0.3)'
                          : colors.white,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}>
                        <Feather
                          name="plus"
                          size={isTablet ? 32 : 28}
                          color={profile.photos.length === 0 ? colors.white : '#FF7B51'}
                        />
                      </View>
                      <Text style={{
                        fontSize: isTablet ? 16 : 15,
                        fontWeight: '600',
                        color: profile.photos.length === 0 ? colors.white : colors.gray[700],
                        textAlign: 'center',
                      }}>
                        {profile.photos.length === 0 ? 'Add Main Photo' : 'Add Photo'}
                      </Text>
                      <Text style={{
                        fontSize: isTablet ? 13 : 12,
                        color: profile.photos.length === 0 ? 'rgba(255,255,255,0.8)' : colors.gray[500],
                        textAlign: 'center',
                        marginTop: 4,
                      }}>
                        {profile.photos.length === 0
                          ? 'This will be shown first'
                          : `${6 - profile.photos.length} slots remaining`}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* Photo Cards */}
                {profile.photos.map((photo, index) => (
                  <TouchableOpacity
                    key={`gallery-photo-${index}`}
                    style={{
                      width: photoItemWidth,
                      aspectRatio: 0.8,
                      borderRadius: 16,
                      overflow: 'hidden',
                      backgroundColor: colors.gray[200],
                    }}
                    onPress={() => {
                      setViewingPhotoIndex(index);
                      setShowPhotoViewer(true);
                    }}
                    activeOpacity={0.9}
                    accessibilityLabel={`View photo ${index + 1} full screen`}
                  >
                    <Image
                      source={{ uri: photo }}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 16,
                      }}
                    />

                    {/* Gradient Overlay */}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.4)']}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '40%',
                        borderBottomLeftRadius: 16,
                        borderBottomRightRadius: 16,
                      }}
                    />

                    {/* Main Photo Badge */}
                    {index === 0 && (
                      <View style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        borderRadius: 12,
                        overflow: 'hidden',
                      }}>
                        <LinearGradient
                          colors={['#F68562', '#E85A36']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            gap: 4,
                          }}
                        >
                          <Feather name="star" size={12} color={colors.white} />
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: colors.white,
                          }}>Main</Text>
                        </LinearGradient>
                      </View>
                    )}

                    {/* Photo Number */}
                    <View style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 10,
                      width: isTablet ? 32 : 28,
                      height: isTablet ? 32 : 28,
                      borderRadius: isTablet ? 16 : 14,
                      backgroundColor: index === 0 ? '#FF7B51' : 'rgba(0,0,0,0.5)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{
                        fontSize: isTablet ? 14 : 12,
                        fontWeight: '700',
                        color: colors.white,
                      }}>{index + 1}</Text>
                    </View>

                    {/* Delete Button */}
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        bottom: 10,
                        right: 10,
                        borderRadius: 16,
                        overflow: 'hidden',
                      }}
                      onPress={() => handleDeletePhoto(index)}
                      disabled={isSaving}
                      activeOpacity={0.8}
                      accessibilityLabel={`Delete photo ${index + 1}`}
                      accessibilityRole="button"
                    >
                      <LinearGradient
                        colors={['#EF4444', '#DC2626']}
                        style={{
                          width: isTablet ? 40 : 36,
                          height: isTablet ? 40 : 36,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Feather name="trash-2" size={isTablet ? 18 : 16} color={colors.white} />
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Set as Main Button (non-main photos) */}
                    {index !== 0 && (
                      <TouchableOpacity
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: isTablet ? 40 : 36,
                          height: isTablet ? 40 : 36,
                          borderRadius: isTablet ? 20 : 18,
                          backgroundColor: colors.white,
                          justifyContent: 'center',
                          alignItems: 'center',
                          ...shadows.small,
                        }}
                        onPress={() => {
                          // Note: Backend doesn't support photo reordering yet
                          // This updates locally for preview, but won't persist
                          const newPhotos = [...profile.photos];
                          const [removed] = newPhotos.splice(index, 1);
                          newPhotos.unshift(removed);
                          setProfile(prev => ({ ...prev, photos: newPhotos }));
                          showToast('Photo set as main! Changes are temporary until you re-upload.', 'info');
                        }}
                        activeOpacity={0.8}
                        accessibilityLabel={`Set photo ${index + 1} as main photo`}
                      >
                        <Feather name="star" size={isTablet ? 18 : 16} color={'#FF7B51'} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Empty State */}
              {profile.photos.length === 0 && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  marginTop: 8,
                  backgroundColor: colors.gray[50],
                  borderRadius: 12,
                  gap: 10,
                }}>
                  <Feather name="info" size={18} color={colors.gray[400]} />
                  <Text style={{
                    fontSize: isTablet ? 15 : 14,
                    color: colors.gray[500],
                    flex: 1,
                  }}>
                    Photos help you get more matches. Add your first photo!
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Footer Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 16,
              paddingHorizontal: isTablet ? 32 : 20,
              paddingTop: 16,
              paddingBottom: Math.max(24, insets.bottom + 16),
              borderTopWidth: 1,
              borderTopColor: colors.gray[100],
              backgroundColor: colors.white,
            }}>
              {profile.photos.length > 0 && profile.photos.length < 6 && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 16,
                    height: isTablet ? 56 : 48,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: '#FFD4C7',
                    backgroundColor: '#FFF0EB',
                    gap: 8,
                  }}
                  onPress={addPhoto}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={isTablet ? 20 : 18} color={'#FF7B51'} />
                  <Text style={{
                    fontSize: isTablet ? 15 : 14,
                    fontWeight: '600',
                    color: '#E85A36',
                  }}>
                    Add More
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{
                  flex: 1,
                  opacity: profile.photos.length === 0 ? 0.6 : 1,
                }}
                onPress={() => setShowPhotoGallery(false)}
                activeOpacity={0.8}
                accessibilityLabel="Done managing photos"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={profile.photos.length > 0
                    ? ['#FF7B51', '#349E92']
                    : [colors.gray[300], colors.gray[400]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: isTablet ? 64 : 56,
                    borderRadius: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  <Feather name="check" size={isTablet ? 24 : 20} color={colors.white} />
                  <Text style={{
                    fontSize: isTablet ? 18 : 16,
                    fontWeight: '700',
                    color: colors.white,
                  }}>
                    {profile.photos.length === 0 ? 'Skip for Now' : 'Done'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== FULL SCREEN PHOTO VIEWER ===== */}
      <PhotoViewer
        visible={showPhotoViewer}
        photos={profile.photos}
        initialIndex={viewingPhotoIndex}
        onClose={() => setShowPhotoViewer(false)}
        onSetMain={(index) => {
          // Note: Backend doesn't support photo reordering yet
          // This updates locally for preview, but won't persist
          const newPhotos = [...profile.photos];
          const [removed] = newPhotos.splice(index, 1);
          newPhotos.unshift(removed);
          setProfile(prev => ({ ...prev, photos: newPhotos }));
          setViewingPhotoIndex(0);
          showToast('Photo set as main! Changes are temporary until you re-upload.', 'info');
        }}
        onDelete={(index) => {
          handleDeletePhoto(index);
          if (profile.photos.length <= 1) {
            setShowPhotoViewer(false);
          }
        }}
      />

      {/* ===== SAVING OVERLAY ===== */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={'#FF7B51'} />
        </View>
      )}

      {/* ========================================================================= */}
      {/* PHOTO PICKER MODAL - Gallery or Camera Selection                         */}
      {/* Senior-friendly with large touch targets (64px) and clear icons          */}
      {/* ========================================================================= */}
      <Modal
        visible={showPhotoPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoPickerModal(false)}
        accessibilityViewIsModal
        accessibilityLabel="Choose how to add a photo"
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowPhotoPickerModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: Math.max(insets.bottom + 16, 32),
              ...shadows.large,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <View style={{
              alignItems: 'center',
              paddingTop: 12,
              paddingBottom: 8,
            }}>
              <View style={{
                width: 40,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.gray[300],
              }} />
            </View>

            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: isTablet ? 20 : 16,
              paddingHorizontal: isTablet ? 32 : 24,
              borderBottomWidth: 1,
              borderBottomColor: colors.gray[100],
              gap: 12,
            }}>
              <LinearGradient
                colors={['#FF7B51', '#349E92']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: isTablet ? 56 : 48,
                  height: isTablet ? 56 : 48,
                  borderRadius: isTablet ? 28 : 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Feather name="image" size={isTablet ? 28 : 24} color={colors.white} />
              </LinearGradient>
              <View>
                <Text style={{
                  fontSize: isTablet ? 24 : 20,
                  fontWeight: '700',
                  color: colors.gray[900],
                }}>
                  Add a Photo
                </Text>
                <Text style={{
                  fontSize: isTablet ? 16 : 14,
                  color: colors.gray[500],
                  marginTop: 2,
                }}>
                  Choose how you would like to add your photo
                </Text>
              </View>
            </View>

            {/* Options */}
            <View style={{
              paddingHorizontal: isTablet ? 32 : 20,
              paddingTop: isTablet ? 24 : 20,
              gap: isTablet ? 16 : 12,
            }}>
              {/* Choose from Gallery Option */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: isTablet ? 20 : 16,
                  backgroundColor: '#FFF0EB',
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: '#FFD4C7',
                  minHeight: isTablet ? 80 : 72,
                  gap: 16,
                }}
                onPress={pickFromGallery}
                accessibilityLabel="Choose from photo gallery"
                accessibilityRole="button"
                accessibilityHint="Opens your photo library to select a photo"
              >
                <View style={{
                  width: isTablet ? 64 : 56,
                  height: isTablet ? 64 : 56,
                  borderRadius: isTablet ? 32 : 28,
                  backgroundColor: colors.white,
                  justifyContent: 'center',
                  alignItems: 'center',
                  ...shadows.small,
                }}>
                  <Feather name="image" size={isTablet ? 32 : 28} color={'#FF7B51'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: isTablet ? 20 : 18,
                    fontWeight: '700',
                    color: colors.gray[900],
                  }}>
                    Choose from Gallery
                  </Text>
                  <Text style={{
                    fontSize: isTablet ? 16 : 14,
                    color: colors.gray[500],
                    marginTop: 4,
                  }}>
                    Select a photo from your library
                  </Text>
                </View>
                <Feather name="chevron-right" size={isTablet ? 28 : 24} color={'#F68562'} />
              </TouchableOpacity>

              {/* Take a Photo Option */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: isTablet ? 20 : 16,
                  backgroundColor: '#E8F7F5',
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: '#B5E3DD',
                  minHeight: isTablet ? 80 : 72,
                  gap: 16,
                }}
                onPress={takePhotoWithCamera}
                accessibilityLabel="Take a photo with camera"
                accessibilityRole="button"
                accessibilityHint="Opens your camera to take a new photo"
              >
                <View style={{
                  width: isTablet ? 64 : 56,
                  height: isTablet ? 64 : 56,
                  borderRadius: isTablet ? 32 : 28,
                  backgroundColor: colors.white,
                  justifyContent: 'center',
                  alignItems: 'center',
                  ...shadows.small,
                }}>
                  <Feather name="camera" size={isTablet ? 32 : 28} color={'#349E92'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: isTablet ? 20 : 18,
                    fontWeight: '700',
                    color: colors.gray[900],
                  }}>
                    Take a Photo
                  </Text>
                  <Text style={{
                    fontSize: isTablet ? 16 : 14,
                    color: colors.gray[500],
                    marginTop: 4,
                  }}>
                    Use your camera for a new picture
                  </Text>
                </View>
                <Feather name="chevron-right" size={isTablet ? 28 : 24} color={'#34A296'} />
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={{
                  height: isTablet ? 64 : 56,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: colors.gray[200],
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: colors.white,
                  marginTop: isTablet ? 8 : 4,
                }}
                onPress={() => setShowPhotoPickerModal(false)}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Feather name="x" size={isTablet ? 22 : 20} color={colors.gray[600]} />
                <Text style={{
                  fontSize: isTablet ? 18 : 16,
                  fontWeight: '600',
                  color: colors.gray[600],
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>

            {/* Photo Tips */}
            <View style={{
              marginTop: isTablet ? 20 : 16,
              marginHorizontal: isTablet ? 32 : 20,
              padding: isTablet ? 16 : 14,
              backgroundColor: colors.gray[50],
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.gray[200],
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <Feather name="info" size={16} color={'#2E8B7F'} />
                <Text style={{
                  fontSize: isTablet ? 15 : 14,
                  fontWeight: '600',
                  color: '#277568',
                }}>
                  Photo Tips for Better Matches
                </Text>
              </View>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="check" size={14} color={'#349E92'} />
                  <Text style={{ fontSize: isTablet ? 14 : 13, color: colors.gray[600] }}>
                    Show your face clearly and smile naturally
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="check" size={14} color={'#349E92'} />
                  <Text style={{ fontSize: isTablet ? 14 : 13, color: colors.gray[600] }}>
                    Use recent photos from the last year
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="check" size={14} color={'#349E92'} />
                  <Text style={{ fontSize: isTablet ? 14 : 13, color: colors.gray[600] }}>
                    Include photos of your hobbies and activities
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL - Fully Responsive for ALL Devices            */}
      {/* Supports: iPhone SE to iPad Pro 12.9", Android phones/tablets, Foldables */}
      {/* ========================================================================= */}
      <Modal
        visible={deleteConfirm.visible}
        transparent
        animationType="fade"
        onRequestClose={cancelDeletePhoto}
        accessibilityViewIsModal
        accessibilityLabel="Delete photo confirmation"
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: isLandscape ? 40 : 24,
          paddingVertical: isLandscape ? 20 : 0,
        }}>
          <View style={{
            backgroundColor: colors.white,
            width: isTablet
              ? Math.min(screenWidth * 0.7, 440)
              : isLandscape
                ? Math.min(screenWidth * 0.6, 420)
                : '100%',
            maxWidth: isTablet ? 440 : isLandscape ? 420 : 360,
            maxHeight: isLandscape ? screenHeight - insets.top - insets.bottom - 40 : undefined,
            borderRadius: 24,
            overflow: 'hidden',
            ...shadows.large,
          }}>
            {/* Red Accent Bar */}
            <View style={{
              height: 6,
              overflow: 'hidden',
            }}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: '100%' }}
              />
            </View>

            {/* Content */}
            <View style={{
              padding: isTablet ? 32 : isLandscape ? 20 : 24,
              alignItems: 'center',
            }}>
              {/* Warning Icon */}
              <View style={{
                width: isTablet ? 88 : isLandscape ? 64 : 72,
                height: isTablet ? 88 : isLandscape ? 64 : 72,
                borderRadius: isTablet ? 44 : isLandscape ? 32 : 36,
                backgroundColor: '#FEE2E2',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: isLandscape ? 12 : 20,
              }}>
                <View style={{
                  width: isTablet ? 64 : isLandscape ? 48 : 52,
                  height: isTablet ? 64 : isLandscape ? 48 : 52,
                  borderRadius: isTablet ? 32 : isLandscape ? 24 : 26,
                  backgroundColor: '#FEF2F2',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Feather
                    name="alert-triangle"
                    size={isTablet ? 36 : isLandscape ? 24 : 28}
                    color="#DC2626"
                  />
                </View>
              </View>

              <Text
                style={{
                  fontSize: isTablet ? 24 : isLandscape ? 18 : 20,
                  fontWeight: '700',
                  color: colors.gray[900],
                  marginBottom: isLandscape ? 8 : 12,
                  textAlign: 'center',
                }}
                accessibilityRole="header"
              >
                Delete Photo?
              </Text>

              <Text style={{
                fontSize: isTablet ? 17 : isLandscape ? 15 : 16,
                color: colors.gray[600],
                textAlign: 'center',
                lineHeight: isTablet ? 26 : isLandscape ? 22 : 24,
                marginBottom: isLandscape ? 10 : 16,
                paddingHorizontal: isTablet ? 16 : 8,
              }}>
                {deleteConfirm.isMainPhoto
                  ? 'This is your main profile photo. Deleting it will make your next photo the main one.'
                  : 'This action cannot be undone. Are you sure you want to remove this photo?'}
              </Text>

              {/* Main Photo Warning Badge */}
              {deleteConfirm.isMainPhoto && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: '#FFF0EB',
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#FFD4C7',
                  gap: 8,
                  marginBottom: 8,
                }}>
                  <Feather name="star" size={16} color={'#E85A36'} />
                  <Text style={{
                    fontSize: isTablet ? 14 : 13,
                    color: '#C94A27',
                    fontWeight: '500',
                  }}>
                    This is your main photo
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: isTablet ? 32 : isLandscape ? 20 : 24,
              paddingBottom: isTablet ? 32 : isLandscape ? 16 : 24,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: isTablet ? 60 : isLandscape ? 48 : 56,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: colors.gray[200],
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: colors.white,
                }}
                onPress={cancelDeletePhoto}
                accessibilityLabel="Cancel deletion"
                accessibilityRole="button"
                accessibilityHint="Keeps the photo and closes this dialog"
              >
                <Feather name="x" size={isTablet ? 20 : 18} color={colors.gray[600]} />
                <Text style={{
                  fontSize: isTablet ? 17 : isLandscape ? 15 : 16,
                  fontWeight: '600',
                  color: colors.gray[600],
                }}>
                  Keep Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  height: isTablet ? 60 : isLandscape ? 48 : 56,
                  borderRadius: 14,
                  backgroundColor: '#DC2626',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }}
                onPress={confirmDeletePhoto}
                accessibilityLabel="Confirm delete photo"
                accessibilityRole="button"
                accessibilityHint="Permanently removes this photo from your profile"
              >
                <Feather name="trash-2" size={isTablet ? 20 : 18} color={colors.white} />
                <Text style={{
                  fontSize: isTablet ? 17 : isLandscape ? 15 : 16,
                  fontWeight: '700',
                  color: colors.white,
                }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ----- Story Response Detail Modal - Senior-Friendly ----- */}
      <Modal
        visible={showStoryResponsesModal && selectedComment !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowStoryResponsesModal(false);
          setSelectedComment(null);
        }}
        accessibilityViewIsModal
        accessibilityLabel="Story response detail"
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={[
          styles.modalBackdrop,
          isTablet && { justifyContent: 'center' },
          isLandscape && !isTablet && { justifyContent: 'center' },
        ]}>
          <View style={[
            styles.modalContainer,
            styles.storyResponseModalContainer,
            {
              width: responsiveStyles.modalContainer.width,
              maxWidth: responsiveStyles.modalContainer.maxWidth,
              maxHeight: responsiveStyles.modalContainer.maxHeight,
              alignSelf: responsiveStyles.modalContainer.alignSelf,
              borderTopLeftRadius: responsiveStyles.modalContainer.borderTopLeftRadius,
              borderTopRightRadius: responsiveStyles.modalContainer.borderTopRightRadius,
              marginBottom: responsiveStyles.modalContainer.marginBottom,
            },
          ]}>
            <ModalHeader
              title="Someone Reached Out"
              onClose={() => {
                setShowStoryResponsesModal(false);
                setSelectedComment(null);
              }}
              isTablet={isTablet}
              isLandscape={isLandscape}
              fontSize={fontSize.heading}
              touchTargetSize={touchTarget.comfortable}
            />

            {selectedComment && (
              <View style={styles.storyResponseModalContent}>
                {/* Sender Info */}
                <View style={styles.storyResponseSenderSection}>
                  <View style={styles.storyResponseSenderAvatar}>
                    {selectedComment.senderPhoto ? (
                      <Image
                        source={{ uri: selectedComment.senderPhoto }}
                        style={styles.storyResponseSenderAvatarImage}
                        accessibilityLabel={`Photo of ${selectedComment.senderName}`}
                      />
                    ) : (
                      <LinearGradient
                        colors={[colors.romantic.pink, '#FF7B51']}
                        style={styles.storyResponseSenderAvatarPlaceholder}
                      >
                        <Text style={styles.storyResponseSenderInitial}>
                          {selectedComment.senderName.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.storyResponseSenderInfo}>
                    <Text
                      style={styles.storyResponseSenderName}
                      accessibilityRole="header"
                    >
                      {selectedComment.senderName}{selectedComment.senderAge ? `, ${selectedComment.senderAge}` : ''}
                    </Text>
                    <Text style={styles.storyResponseSenderTime}>
                      {formatTimeAgo(selectedComment.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* Message */}
                <View style={styles.storyResponseMessageSection}>
                  <Text style={styles.storyResponseMessageLabel}>Their heartfelt message:</Text>
                  <View style={styles.storyResponseMessageBubble}>
                    <Text
                      style={styles.storyResponseMessageText}
                      accessibilityLabel={`Message: ${selectedComment.message}`}
                    >
                      {selectedComment.message}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.storyResponseActions}>
                  {selectedComment.hasReplied ? (
                    <View
                      style={styles.alreadyRepliedContainer}
                      accessibilityLabel="You have already replied to this message"
                    >
                      <Feather name="check-circle" size={28} color={'#2E8B7F'} />
                      <Text style={styles.alreadyRepliedText}>
                        You've replied to this message
                      </Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.replyButton}
                        onPress={() => handleReplyToComment(selectedComment)}
                        activeOpacity={0.8}
                        accessibilityLabel={`Start a conversation with ${selectedComment.senderName}`}
                        accessibilityRole="button"
                        accessibilityHint="This will open a new chat where you can talk with this person"
                      >
                        <LinearGradient
                          colors={[colors.romantic.pink, '#FF7B51']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.replyButtonGradient}
                        >
                          <Feather name="heart" size={24} color={colors.white} />
                          <Text style={styles.replyButtonText}>Start Chatting</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <Text style={styles.replyHintText}>
                        Tap above to begin a conversation with {selectedComment.senderName}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ===== TOAST NOTIFICATION ===== */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const SHADOW_MARGIN = 16;

const styles = StyleSheet.create({
  // =========================================================================
  // Container & Layout
  // =========================================================================
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.m,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.l,
    gap: spacing.l,
  },

  // =========================================================================
  // Loading State
  // =========================================================================
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    padding: spacing.xl,
  },
  loadingIconContainer: {
    // Base dimensions - responsive sizes applied inline for tablets/landscape
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.l,
    ...shadows.large,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 18,
    color: colors.gray[500],
    textAlign: 'center',
  },

  // =========================================================================
  // Skeleton Loading States
  // =========================================================================
  skeletonContainer: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  skeletonCard: {
    backgroundColor: colors.white,
    padding: spacing.l,
    ...shadows.medium,
  },
  skeletonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonHeaderInfo: {
    flex: 1,
    marginLeft: spacing.l,
  },
  skeletonStrengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  skeletonChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    padding: spacing.l,
  },
  skeletonLoadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    marginTop: spacing.xl,
    paddingVertical: spacing.m,
  },
  skeletonLoadingText: {
    fontSize: 16,
    color: colors.gray[500],
    fontWeight: '500',
  },

  // =========================================================================
  // Animated Progress Bar
  // =========================================================================
  animatedProgressContainer: {
    position: 'relative',
    marginVertical: spacing.m,
  },
  animatedProgressGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    backgroundColor: '#FFDACF', // Premium coral glow
  },
  animatedProgressTrack: {
    backgroundColor: colors.gray[200],
    overflow: 'hidden',
  },
  animatedProgressFill: {
    height: '100%',
  },
  progressCompleteIcon: {
    position: 'absolute',
    right: -6,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#349E92',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },

  // =========================================================================
  // Enhanced Photo Grid Components - Clean 2-column responsive layout
  // =========================================================================

  // Main grid container - uses flexbox row wrap
  photoGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Individual grid item wrapper - fixed 2-column layout (48% width each)
  photoGridItemWrapper: {
    width: '48%',
    marginBottom: 12,
  },

  // Photo item container - 1:1 aspect ratio square
  photoGridItemContainer: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
  },

  // Photo image - fills container
  photoGridImage: {
    width: '100%',
    height: '100%',
  },

  // Gradient overlay for visual depth
  photoGridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // Main photo star badge container
  mainPhotoBadgeContainer: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  // Main photo badge gradient background
  mainPhotoBadgeGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Photo number badge - bottom left
  photoNumberBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Photo number text
  photoNumberText: {
    fontWeight: '700',
    color: colors.white,
  },

  // Add photo button container
  addPhotoButtonContainer: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Add photo dashed border
  addPhotoButtonBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF7B51',
  },

  // Add photo content wrapper
  addPhotoButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },

  // Add photo icon circle
  addPhotoIconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF7B51',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },

  // Add photo button text
  addPhotoButtonText: {
    fontWeight: '600',
    color: '#E85A36',
  },

  // Add photo hint text
  addPhotoButtonHint: {
    color: '#F68562',
    opacity: 0.8,
  },

  // Photo tips container
  photoTipsContainer: {
    marginTop: spacing.l,
    padding: spacing.m,
    backgroundColor: '#E8F7F5',
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: '#C5EDE8',
  },

  // Photo tips title
  photoTipsTitle: {
    fontWeight: '600',
    color: '#277568',
    marginBottom: spacing.s,
  },

  // Photo tip item row
  photoTipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  // Photo tip icon wrapper
  photoTipIconWrapper: {
    width: 24,
    marginRight: spacing.s,
  },

  // Photo tip text
  photoTipItemText: {
    color: '#2E8B7F',
    flex: 1,
  },

  // =========================================================================
  // Enhanced Profile Strength Section - Premium Glassmorphism
  // =========================================================================
  enhancedProfileStrengthSection: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: borderRadius.xlarge,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  enhancedStrengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enhancedStrengthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  strengthIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  strengthIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedStrengthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
  },
  strengthPercentageBadge: {
    backgroundColor: '#FFF0EB', // Premium coral background
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.large,
  },
  strengthPercentageBadgeComplete: {
    backgroundColor: '#E8F7F5', // Premium teal background
  },
  enhancedStrengthPercentage: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF7B51', // Premium coral
  },
  strengthPercentageComplete: {
    color: '#349E92', // Premium teal
  },
  strengthStatusContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginTop: spacing.s,
    backgroundColor: colors.gray[50],
    padding: spacing.m,
    borderRadius: borderRadius.medium,
  },
  enhancedStrengthHelper: {
    flex: 1,
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
  },
  strengthTipsContainer: {
    marginTop: spacing.m,
    gap: spacing.s,
  },
  strengthTipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    backgroundColor: '#FFF0EB', // Premium coral background
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: '#FFD4C7', // Premium coral border
    gap: spacing.m,
  },
  strengthTipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthTipContent: {
    flex: 1,
  },
  strengthTipMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  strengthTipAction: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  // =========================================================================
  // Enhanced Section Cards - Premium Glassmorphism
  // =========================================================================
  enhancedSectionCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  sectionAccentBar: {
    height: 4,
  },
  enhancedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  enhancedSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  sectionCompleteBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.s,
  },
  enhancedSectionContent: {
    // padding applied via inline style
  },
  enhancedSectionFooter: {
    paddingBottom: spacing.l,
  },
  enhancedOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderWidth: 2,
    borderColor: '#FF7B51', // Premium coral
    borderRadius: borderRadius.large,
    backgroundColor: '#FFF0EB', // Premium coral background
    minHeight: touchTargets.comfortable,
  },
  enhancedOutlineButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E85A36', // Darker premium coral
  },

  // =========================================================================
  // Enhanced Story Section
  // =========================================================================
  storyContentContainer: {
    position: 'relative',
    backgroundColor: colors.gray[50],
    padding: spacing.l,
    borderRadius: borderRadius.large,
    borderLeftWidth: 4,
    borderLeftColor: '#F68562',
  },
  enhancedStoryText: {
    fontSize: 18,
    color: colors.gray[700],
    lineHeight: 28,
  },
  storyQuoteDecoration: {
    position: 'absolute',
    top: spacing.s,
    right: spacing.s,
    opacity: 0.5,
  },

  // =========================================================================
  // Empty State Components
  // =========================================================================
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.l,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray[200],
  },
  emptyStateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },

  // =========================================================================
  // Enhanced Interests Section
  // =========================================================================
  interestCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE5DD',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
  },
  interestCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E85A36',
  },
  enhancedInterestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  enhancedInterestChipContainer: {
    marginBottom: spacing.xs,
  },
  enhancedInterestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
    ...shadows.small,
  },
  enhancedInterestChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },

  // =========================================================================
  // Enhanced Photos Section
  // =========================================================================
  photoCountIndicator: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  photoCountCurrent: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF7B51',
  },
  photoCountDivider: {
    fontSize: 18,
    color: colors.gray[400],
    marginHorizontal: 2,
  },
  photoCountMax: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[400],
  },
  photoProgressDots: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.s,
    paddingBottom: 0,
  },
  photoProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray[200],
  },
  photoProgressDotFilled: {
    backgroundColor: '#FF7B51',
  },
  // Note: Photo grid styles moved to "Enhanced Photo Grid Components" section above

  // =========================================================================
  // Premium Header Section (New Enhanced Design)
  // =========================================================================
  premiumHeaderWrapper: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  premiumGlassCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    padding: spacing.l,
    paddingTop: spacing.m,
    overflow: 'hidden',
  },
  premiumHeaderGradient: {
    padding: spacing.l,
    paddingTop: spacing.m,
  },
  premiumHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  premiumBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  premiumLogoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF7B51',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumBrandText: {
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  premiumBrandSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  premiumSettingsButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#FF7B51',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumSettingsGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  premiumHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumPhotoWrapper: {
    shadowColor: '#FF7B51',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  premiumPhotoBorderGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  premiumPhotoContainer: {
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  premiumPhotoImage: {
    width: '100%',
    height: '100%',
  },
  premiumPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    gap: 4,
  },
  premiumPhotoPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  premiumPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  premiumPhotoBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  premiumPhotoBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  premiumInfoContainer: {
    flex: 1,
    marginLeft: spacing.l,
  },
  premiumName: {
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  premiumAge: {
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: spacing.s,
  },
  premiumLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.m,
  },
  premiumLocationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#349E92',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumLocation: {
    color: '#4B5563',
    fontWeight: '600',
  },
  premiumQuickActions: {
    flexDirection: 'row',
    gap: spacing.s,
    flexWrap: 'wrap',
  },
  premiumQuickButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  premiumQuickButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  premiumQuickButtonText: {
    fontWeight: '700',
    color: '#fff',
  },

  // =========================================================================
  // Section 1: Header Section (Legacy - kept for backward compatibility)
  // =========================================================================
  headerSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge,
    padding: spacing.l,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    ...shadows.medium,
  },
  headerPhotoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FF7B51',
    backgroundColor: colors.gray[100],
  },
  headerPhoto: {
    width: '100%',
    height: '100%',
  },
  headerPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.l,
    // paddingRight is now applied dynamically via inline style for responsiveness
    // Small phones need more space, tablets need proportionally larger padding
  },
  headerName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  headerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.m,
  },
  headerLocation: {
    fontSize: 16,
    color: colors.gray[500],
  },
  headerPhotoThumbnailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  headerPhotoThumbnail: {
    // Base size - responsive inline sizing for tablets (56-64px)
    width: 48,
    height: 48,
    borderRadius: borderRadius.medium,
  },
  headerPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 48,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderBottomLeftRadius: borderRadius.medium,
    borderBottomRightRadius: borderRadius.medium,
  },
  headerPhotoName: {
    fontSize: 14, // Senior-friendly minimum for overlay text (increased from 12)
    color: colors.white,
    fontWeight: '600',
  },
  changePhotoLink: {
    fontSize: 16, // Senior-friendly minimum font size
    color: '#FF7B51',
    fontWeight: '600',
  },
  settingsButton: {
    position: 'absolute',
    top: spacing.m,
    right: spacing.m,
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    borderRadius: touchTargets.comfortable / 2,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // =========================================================================
  // Section 2: Profile Strength
  // =========================================================================
  profileStrengthSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge,
    padding: spacing.l,
    ...shadows.medium,
  },
  profileStrengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  profileStrengthLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[700],
  },
  profileStrengthPercentage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF7B51',
  },
  progressBarContainer: {
    // Base height - responsive height applied inline (14px on tablets)
    height: 12,
    backgroundColor: colors.gray[200],
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.s,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  profileStrengthHelper: {
    fontSize: 14,
    color: colors.gray[500],
    lineHeight: 20,
  },

  // =========================================================================
  // Section Card (My Story, Interests, Photos, Details)
  // =========================================================================
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge,
    ...shadows.medium,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  sectionCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  sectionCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  sectionCardContent: {
    padding: spacing.l,
  },
  sectionCardFooter: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.l,
  },

  // =========================================================================
  // My Story Section
  // =========================================================================
  storyText: {
    fontSize: 18,
    color: colors.gray[700],
    lineHeight: 28,
  },
  storyPlaceholder: {
    fontSize: 16,
    color: colors.gray[400],
    lineHeight: 24,
    fontStyle: 'italic',
  },

  // =========================================================================
  // Outline Button
  // =========================================================================
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderWidth: 2,
    borderColor: '#FF7B51',
    borderRadius: borderRadius.large,
    minHeight: touchTargets.comfortable,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF7B51',
  },

  // =========================================================================
  // Interests Grid
  // =========================================================================
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  interestChip: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
  },
  interestChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  emptyPlaceholder: {
    fontSize: 16,
    color: colors.gray[400],
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.m,
  },

  // =========================================================================
  // Legacy Photos Grid (kept for backwards compatibility)
  // New photo grid styles are in "Enhanced Photo Grid Components" section
  // =========================================================================
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  addPhotoPlaceholder: {
    aspectRatio: 1,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF7B51',
    backgroundColor: '#FFF0EB',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF7B51',
  },
  mainPhotoBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF7B51',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // =========================================================================
  // Personal Details Section
  // =========================================================================
  detailsListContent: {
    paddingVertical: spacing.s,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    minHeight: touchTargets.comfortable,
  },
  detailRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailRowLabel: {
    fontSize: 16,
    color: colors.gray[500],
  },
  detailRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    flex: 1,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginLeft: spacing.l,
  },

  // =========================================================================
  // Modal Base
  // =========================================================================
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xlarge + 8,
    borderTopRightRadius: borderRadius.xlarge + 8,
    maxHeight: '85%',
    ...shadows.large,
  },
  modalContainerTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    maxHeight: '80%',
  },
  modalContainerTall: {
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalHeaderTextContainer: {
    flex: 1,
    marginRight: spacing.m,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: spacing.xxs,
  },
  modalCloseButton: {
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    borderRadius: touchTargets.comfortable / 2,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.l,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.l,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  modalCancelButton: {
    flex: 1,
    height: touchTargets.large,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[600],
  },
  modalSaveButtonWrapper: {
    flex: 1,
    borderRadius: borderRadius.large,
  },
  modalSaveButton: {
    height: touchTargets.large,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.large,
  },
  modalSaveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  // =========================================================================
  // Enhanced Modal Styles - Senior-Friendly UI/UX Improvements
  // =========================================================================
  enhancedModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  enhancedModalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xlarge + 12,
    borderTopRightRadius: borderRadius.xlarge + 12,
    maxHeight: '88%',
    ...shadows.large,
  },
  enhancedModalContainerTablet: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '95%',
    maxHeight: '82%',
    borderRadius: borderRadius.xlarge + 8,
    marginBottom: spacing.xl,
  },

  // Enhanced Modal Header
  enhancedModalHeaderWrapper: {
    borderTopLeftRadius: borderRadius.xlarge + 12,
    borderTopRightRadius: borderRadius.xlarge + 12,
    overflow: 'hidden',
  },
  modalHeaderGradientAccent: {
    height: 4,
  },
  enhancedModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.l,
    backgroundColor: colors.white,
  },
  modalHeaderLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    flex: 1,
  },
  modalHeaderIconContainer: {
    overflow: 'hidden',
  },
  modalHeaderIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  enhancedModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  enhancedModalSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: spacing.xxs,
    letterSpacing: 0.1,
  },
  enhancedModalCloseButton: {
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[200],
  },

  // Enhanced Modal ScrollView
  enhancedModalScrollView: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.l,
  },

  // Enhanced Modal Actions
  enhancedModalActions: {
    flexDirection: 'row',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.l,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    backgroundColor: colors.white,
  },
  enhancedModalCancelButton: {
    flex: 1,
    height: touchTargets.large,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  enhancedModalCancelButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[600],
  },
  enhancedModalSaveButtonWrapper: {
    flex: 1.2,
    borderRadius: borderRadius.large,
    ...shadows.medium,
  },
  enhancedModalSaveButton: {
    height: touchTargets.large,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.large,
    gap: spacing.xs,
  },
  enhancedModalSaveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  // Modal Section Divider
  modalSectionDivider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginVertical: spacing.l,
    marginHorizontal: -spacing.l,
    paddingHorizontal: spacing.l,
  },

  // =========================================================================
  // Enhanced Form Inputs
  // =========================================================================
  enhancedInputGroup: {
    marginBottom: spacing.m,
  },
  enhancedInputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.xs,
  },
  inputLabelIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF0EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedInputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
    letterSpacing: -0.2,
  },
  enhancedInputSubLabel: {
    fontSize: 14,
    color: colors.gray[500],
    marginBottom: spacing.s,
    marginLeft: 40,
    lineHeight: 20,
  },
  enhancedInputWrapper: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
  },
  enhancedTextInput: {
    height: touchTargets.large + 4,
    paddingHorizontal: spacing.m,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.large,
    fontSize: 18,
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
  },
  enhancedInputHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.s,
  },
  enhancedInputHint: {
    fontSize: 14,
    color: colors.gray[500],
    flex: 1,
  },
  ageStepperCard: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.large,
    padding: spacing.m,
    borderWidth: 2,
    borderColor: colors.gray[100],
  },

  // =========================================================================
  // Enhanced Location Chips
  // =========================================================================
  enhancedLocationChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: spacing.s,
  },
  enhancedLocationChip: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
  },
  enhancedLocationChipSelected: {
    ...shadows.small,
  },
  enhancedLocationChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
  },
  enhancedLocationChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.large,
  },
  enhancedLocationChipText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[700],
  },
  enhancedLocationChipTextSelected: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  enhancedLocationChipOther: {
    borderStyle: 'dashed',
  },
  enhancedLocationChipInnerOther: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: '#E8F7F5',
    borderWidth: 2,
    borderColor: '#B5E3DD',
    borderRadius: borderRadius.large,
  },
  enhancedLocationChipTextOther: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8B7F',
  },
  enhancedOtherLocationContainer: {
    marginTop: spacing.m,
  },

  // =========================================================================
  // Enhanced Story/Bio Modal Styles
  // =========================================================================
  enhancedStoryTemplatesSection: {
    padding: spacing.l,
  },
  enhancedStoryTemplatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginBottom: spacing.m,
  },
  storyTemplatesIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  storyTemplatesIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyTemplatesTextContainer: {
    flex: 1,
  },
  enhancedStoryTemplatesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  enhancedStoryTemplatesSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 2,
  },
  enhancedStoryTemplatesGrid: {
    gap: spacing.m,
    marginBottom: spacing.l,
  },
  enhancedStoryTemplateCard: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...shadows.small,
  },
  enhancedStoryTemplateGradient: {
    padding: spacing.m,
    borderRadius: borderRadius.large,
  },
  enhancedStoryTemplateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  storyTemplateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  enhancedStoryTemplateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[800],
    flex: 1,
  },
  enhancedStoryTemplatePreview: {
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
    marginBottom: spacing.s,
  },
  enhancedStoryTemplateAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xxs,
  },
  enhancedStoryTemplateActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7B51',
  },
  enhancedWriteOwnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    borderWidth: 2,
    borderColor: '#B5E3DD',
    borderRadius: borderRadius.large,
    backgroundColor: '#E8F7F5',
  },
  enhancedWriteOwnButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8B7F',
  },
  enhancedStoryWritingSection: {
    padding: spacing.l,
  },
  enhancedTextAreaWrapper: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...shadows.small,
  },
  enhancedTextAreaLarge: {
    minHeight: 180,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.large,
    fontSize: 18,
    color: colors.gray[900],
    backgroundColor: colors.white,
    textAlignVertical: 'top',
    lineHeight: 26,
  },
  enhancedBioFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.m,
  },
  enhancedCharCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  enhancedCharCounter: {
    fontSize: 14,
    color: colors.gray[500],
  },
  charCounterWarning: {
    color: '#FF7B51',
  },
  charCounterSuccess: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D1EDE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedClearBioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.gray[100],
  },
  enhancedClearBioButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },
  enhancedBioPhrasesSection: {
    marginTop: spacing.m,
  },
  enhancedBioPhrasesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.s,
  },
  bioPhraseIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F7F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedBioPhrasesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  enhancedBioPhrasesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  enhancedBioPhraseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
    backgroundColor: '#E8F7F5',
    borderWidth: 1.5,
    borderColor: '#B5E3DD',
  },
  enhancedBioPhraseChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#277568',
  },

  // =========================================================================
  // Enhanced Interests Modal Styles
  // =========================================================================
  enhancedInterestsHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  enhancedSelectionCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  selectionCountIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCountIconContainerSuccess: {
    backgroundColor: '#E8F7F5',
  },
  selectionCountTextContainer: {
    flexDirection: 'column',
  },
  enhancedSelectionCountText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  enhancedSelectionRequirement: {
    fontSize: 14,
    color: colors.gray[500],
  },
  selectionRequirementMet: {
    color: '#2E8B7F',
    fontWeight: '600',
  },
  interestsProgressDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  interestProgressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gray[200],
  },
  interestProgressDotFilled: {
    backgroundColor: '#349E92',
  },
  enhancedCategoryTabsContainer: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  enhancedCategoryTabsContent: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    gap: spacing.s,
  },
  enhancedCategoryTab: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
  },
  enhancedCategoryTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
  },
  enhancedCategoryTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.large,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
  },
  enhancedCategoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },
  enhancedCategoryTabTextSelected: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  enhancedSelectedInterestsPreview: {
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    backgroundColor: '#FFF0EB',
  },
  enhancedSelectedInterestsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
    marginBottom: spacing.s,
  },
  enhancedSelectedInterestsScroll: {
    gap: spacing.s,
  },
  enhancedSelectedInterestChip: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...shadows.small,
  },
  enhancedSelectedInterestChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
  },
  enhancedSelectedInterestChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  enhancedInterestsScrollView: {
    flex: 1,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
  },

  // =========================================================================
  // Enhanced Preferences Modal Styles
  // =========================================================================
  enhancedPreferencesSection: {
    marginBottom: spacing.m,
  },
  enhancedPreferencesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
    marginBottom: spacing.m,
  },
  preferenceSectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.small,
  },
  preferenceSectionIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferenceSectionTextContainer: {
    flex: 1,
    paddingTop: 4,
  },
  enhancedPreferencesSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 2,
  },
  enhancedPreferencesSectionHint: {
    fontSize: 14,
    color: colors.gray[500],
    lineHeight: 20,
  },
  enhancedVisualGenderRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  enhancedVisualLookingForColumn: {
    gap: spacing.s,
  },

  // =========================================================================
  // Enhanced Delete Confirmation Modal Styles
  // =========================================================================
  enhancedDeleteConfirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
  },
  enhancedDeleteConfirmContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge + 4,
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.large,
  },
  deleteConfirmHeaderAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  deleteConfirmGradientAccent: {
    width: '100%',
    height: '100%',
  },
  enhancedDeleteConfirmIconContainer: {
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.l,
    marginTop: spacing.m,
    borderWidth: 4,
    borderColor: '#FECACA',
  },
  deleteConfirmIconInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedDeleteConfirmTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  enhancedDeleteConfirmMessage: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.m,
    lineHeight: 24,
  },
  mainPhotoWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF0EB',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
    marginBottom: spacing.l,
    borderWidth: 1.5,
    borderColor: '#FFD4C7',
  },
  mainPhotoWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C94A27',
  },
  enhancedDeleteConfirmButtons: {
    flexDirection: 'row',
    gap: spacing.m,
    width: '100%',
    marginTop: spacing.s,
  },
  enhancedDeleteConfirmCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  enhancedDeleteConfirmCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[600],
  },
  enhancedDeleteConfirmDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.large,
    backgroundColor: '#DC2626',
    ...shadows.small,
  },
  enhancedDeleteConfirmDeleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },

  // =========================================================================
  // Form Inputs
  // =========================================================================
  inputGroup: {
    marginBottom: spacing.l,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.s,
  },
  requiredStar: {
    color: colors.semantic.error,
  },
  textInput: {
    height: touchTargets.large,
    paddingHorizontal: spacing.m,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.large,
    fontSize: 18,
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
  },
  textInputShort: {
    width: 140,
  },
  inputHint: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  textArea: {
    height: 180,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.large,
    fontSize: 18,
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // =========================================================================
  // Search
  // =========================================================================
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    height: touchTargets.comfortable,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.large,
    marginHorizontal: spacing.l,
    marginTop: spacing.m,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: colors.gray[900],
  },

  // =========================================================================
  // Selection Count
  // =========================================================================
  selectionCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
  },
  selectionCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF7B51',
  },
  selectionCountHint: {
    fontSize: 14,
    color: colors.gray[500],
  },

  // =========================================================================
  // Interests Selection
  // =========================================================================
  interestsScrollView: {
    maxHeight: 400,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
  },
  interestsSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    paddingBottom: spacing.l,
  },
  interestSelectionItem: {
    minHeight: touchTargets.standard,
  },
  interestSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
    minHeight: touchTargets.standard,
  },
  interestSelectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  interestUnselected: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[200],
    minHeight: touchTargets.standard,
    justifyContent: 'center',
  },
  interestUnselectedText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[700],
  },

  // =========================================================================
  // Selection Buttons (Gender, Looking For)
  // =========================================================================
  selectionRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  selectionButtonWrapper: {
    flex: 1,
    minHeight: touchTargets.comfortable,
  },
  selectionButtonSelected: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.m,
    minHeight: touchTargets.comfortable,
  },
  selectionButtonTextSelected: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  selectionButtonUnselected: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[200],
    paddingVertical: spacing.m,
    minHeight: touchTargets.comfortable,
  },
  selectionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[700],
  },

  // =========================================================================
  // Selection Chips (Religion, Languages)
  // =========================================================================
  selectionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  selectionChip: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[200],
    minHeight: touchTargets.minimum,
    justifyContent: 'center',
  },
  selectionChipSelected: {
    backgroundColor: '#FF7B51',
    borderColor: '#FF7B51',
  },
  selectionChipText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[700],
  },
  selectionChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },

  // =========================================================================
  // Photo Gallery Modal (responsive - width calculated dynamically)
  // =========================================================================
  photoGalleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
    paddingBottom: spacing.l,
    paddingHorizontal: SHADOW_MARGIN / 2,
  },
  galleryPhotoItem: {
    // width is now applied dynamically via inline style using photoItemWidth
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.large,
    position: 'relative',
    backgroundColor: colors.gray[200],
    ...shadows.medium,
  },
  galleryPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.large,
  },
  galleryMainBadge: {
    position: 'absolute',
    top: spacing.s,
    left: spacing.s,
  },
  galleryMainBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.medium,
  },
  galleryMainBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  galleryDeleteButton: {
    position: 'absolute',
    top: spacing.s,
    right: spacing.s,
  },
  galleryDeleteButtonInner: {
    width: touchTargets.comfortable, // 56px - senior-friendly touch target
    height: touchTargets.comfortable,
    borderRadius: touchTargets.comfortable / 2,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryAddPhotoItem: {
    // width is now applied dynamically via inline style using photoItemWidth
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.large,
  },
  galleryAddPhotoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
    borderRadius: borderRadius.large,
  },
  galleryAddPhotoText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  photoGalleryFooter: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.l,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  photoGalleryFooterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  photoGalleryFooterText: {
    flex: 1,
    fontSize: 14,
    color: colors.gray[500],
    lineHeight: 20,
  },
  photoGalleryDoneButton: {
    height: touchTargets.comfortable,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoGalleryDoneText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[600],
  },

  // =========================================================================
  // Saving Overlay
  // =========================================================================
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  // =========================================================================
  // Personal Details Modal - Responsive & Landscape-Friendly
  // Supports: Small phones (320px), Regular phones (375-414px),
  //           Large phones (428px+), Tablets (768px+), iPads (all sizes)
  // =========================================================================

  // Modal Container - Base (Portrait Phone)
  detailsModalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xlarge + 8,
    borderTopRightRadius: borderRadius.xlarge + 8,
    maxHeight: '92%',
    minHeight: '50%',
    ...shadows.large,
  },

  // Modal Container - Landscape Phone
  detailsModalContainerLandscape: {
    maxHeight: '95%',
    minHeight: '80%',
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
  },

  // Modal Container - Tablet Portrait
  detailsModalContainerTablet: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '90%',
    maxHeight: '85%',
    borderRadius: borderRadius.xlarge,
    marginBottom: spacing.xl,
  },

  // Modal Container - Tablet Landscape
  detailsModalContainerTabletLandscape: {
    maxWidth: 900,
    maxHeight: '90%',
    width: '85%',
  },

  // Modal Header - Base
  detailsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    minHeight: touchTargets.large,
  },

  // Modal Header - Landscape (more compact)
  detailsModalHeaderLandscape: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    minHeight: touchTargets.comfortable,
  },

  // Header Content Container
  detailsModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    flex: 1,
  },

  // Modal Title - Base
  detailsModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.5,
  },

  // Modal Title - Landscape (smaller)
  detailsModalTitleLandscape: {
    fontSize: 20,
  },

  // Close Button - Base
  detailsModalCloseButton: {
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    borderRadius: touchTargets.comfortable / 2,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Close Button - Landscape (smaller)
  detailsModalCloseButtonLandscape: {
    width: touchTargets.standard,
    height: touchTargets.standard,
    borderRadius: touchTargets.standard / 2,
  },

  // ScrollView Container
  detailsModalScrollView: {
    flex: 1,
  },

  // ScrollView Content - Base
  detailsModalScrollContent: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
  },

  // ScrollView Content - Landscape (less vertical padding)
  detailsModalScrollContentLandscape: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
  },

  // ScrollView Content - Tablet (more horizontal padding)
  detailsModalScrollContentTablet: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.l,
  },

  // Form Container - Base (Single Column Portrait)
  detailsFormContainer: {
    flexDirection: 'column',
    gap: spacing.s,
  },

  // Form Container - Landscape (Two Columns)
  detailsFormContainerLandscape: {
    flexDirection: 'row',
    gap: spacing.l,
  },

  // Form Container - Tablet (More spacing)
  detailsFormContainerTablet: {
    gap: spacing.m,
  },

  // Form Column - Base (Full Width)
  detailsFormColumn: {
    flex: 1,
    gap: spacing.xs,
  },

  // Form Column - Landscape (Half Width)
  detailsFormColumnLandscape: {
    flex: 1,
  },

  // Input Group - Base
  detailsInputGroup: {
    marginBottom: spacing.m,
  },

  // Input Group - Half Width (for side-by-side in landscape)
  detailsInputGroupHalf: {
    flex: 1,
  },

  // Row Group - Base (stacked in portrait)
  detailsRowGroup: {
    flexDirection: 'column',
    gap: spacing.m,
  },

  // Row Group - Landscape (side by side)
  detailsRowGroupLandscape: {
    flexDirection: 'row',
    gap: spacing.m,
  },

  // Label Row with Icon
  detailsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },

  // Input Label - Senior-Friendly (18px minimum)
  detailsInputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[700],
    lineHeight: 24,
  },

  // Hint Text for Selection Fields
  detailsHintText: {
    fontSize: 14,
    color: colors.gray[500],
    marginBottom: spacing.s,
    lineHeight: 20,
  },

  // Text Input - Base (56-64px height for seniors)
  detailsTextInput: {
    height: touchTargets.comfortable + 4, // 60px
    paddingHorizontal: spacing.m,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.medium,
    fontSize: 18,
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
  },

  // Text Input - Tablet (larger)
  detailsTextInputTablet: {
    height: touchTargets.large, // 64px
    fontSize: 20,
  },

  // Text Input - Short (for Height, Children)
  detailsTextInputShort: {
    maxWidth: 180,
  },

  // Chip Container - Base
  detailsChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },

  // Chip Container - Tablet (larger gaps)
  detailsChipContainerTablet: {
    gap: spacing.m,
  },

  // Selection Chip - Base (56px minimum touch target)
  detailsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 2, // Extra padding for larger touch target
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[200],
    minHeight: touchTargets.comfortable, // 56px minimum
  },

  // Chip - Selected (Orange for Religion)
  detailsChipSelected: {
    backgroundColor: '#FF7B51',
    borderColor: '#FF7B51',
  },

  // Chip - Selected (Teal for Languages - visual distinction)
  detailsChipSelectedTeal: {
    backgroundColor: '#349E92',
    borderColor: '#349E92',
  },

  // Chip - Tablet (larger)
  detailsChipTablet: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    minHeight: touchTargets.large, // 64px on tablets
  },

  // Chip Text - Base
  detailsChipText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[700],
  },

  // Chip Text - Selected
  detailsChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },

  // Language Count Badge
  detailsLanguageCount: {
    backgroundColor: '#D1EDE9',
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
    marginLeft: spacing.xs,
  },

  // Language Count Text
  detailsLanguageCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E8B7F',
  },

  // Modal Footer - Base
  detailsModalFooter: {
    flexDirection: 'row',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    paddingBottom: spacing.l,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    backgroundColor: colors.white,
  },

  // Modal Footer - Landscape (more compact)
  detailsModalFooterLandscape: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.m,
  },

  // Cancel Button - Base
  detailsCancelButton: {
    flex: 1,
    height: touchTargets.large, // 64px
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[200],
  },

  // Cancel Button - Landscape (smaller)
  detailsCancelButtonLandscape: {
    height: touchTargets.comfortable, // 56px
    flex: 0.4,
  },

  // Cancel Button Text - Base
  detailsCancelButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[600],
  },

  // Cancel Button Text - Landscape (smaller)
  detailsCancelButtonTextLandscape: {
    fontSize: 16,
  },

  // Save Button Wrapper - Base
  detailsSaveButtonWrapper: {
    flex: 1,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
  },

  // Save Button Wrapper - Landscape
  detailsSaveButtonWrapperLandscape: {
    flex: 0.6,
  },

  // Save Button (Gradient) - Base
  detailsSaveButton: {
    height: touchTargets.large, // 64px
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
    borderRadius: borderRadius.large,
  },

  // Save Button - Landscape (smaller)
  detailsSaveButtonLandscape: {
    height: touchTargets.comfortable, // 56px
  },

  // Save Button Text - Base
  detailsSaveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  // Save Button Text - Landscape (smaller)
  detailsSaveButtonTextLandscape: {
    fontSize: 16,
  },

  // =========================================================================
  // NEW SENIOR-FRIENDLY MODAL STYLES
  // =========================================================================

  // Input Label Row (with icon)
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.xs,
  },

  // Input Sub Label
  inputSubLabel: {
    fontSize: 14,
    color: colors.gray[500],
    marginBottom: spacing.m,
    lineHeight: 20,
  },

  // =========================================================================
  // Age Stepper Styles
  // =========================================================================
  ageStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.xlarge,
    padding: spacing.m,
    gap: spacing.l,
  },
  ageStepperButton: {
    // Base size 64px - landscape uses 56px inline for better fit
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF7B51',
    ...shadows.medium,
  },
  ageStepperButtonDisabled: {
    borderColor: colors.gray[300],
    opacity: 0.5,
  },
  ageStepperValueContainer: {
    alignItems: 'center',
    minWidth: 100,
  },
  ageStepperValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FF7B51',
  },
  ageStepperLabel: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: -4,
  },

  // =========================================================================
  // Location Chips Styles
  // =========================================================================
  locationChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 4,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[200],
    minHeight: touchTargets.comfortable,
  },
  locationChipSelected: {
    backgroundColor: '#FF7B51',
    borderColor: '#FF7B51',
  },
  locationChipOther: {
    borderColor: '#34A296',
    borderStyle: 'dashed',
  },
  locationChipText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[700],
  },
  locationChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  locationChipTextOther: {
    color: '#2E8B7F',
    fontWeight: '600',
  },
  otherLocationInputContainer: {
    marginTop: spacing.m,
  },

  // =========================================================================
  // Story Templates Styles
  // =========================================================================
  storyTemplatesSection: {
    marginBottom: spacing.l,
  },
  storyTemplatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.xs,
  },
  storyTemplatesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  storyTemplatesSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
    marginBottom: spacing.m,
  },
  storyTemplatesGrid: {
    gap: spacing.m,
  },
  storyTemplateCard: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...shadows.medium,
  },
  storyTemplateCardGradient: {
    padding: spacing.m,
  },
  storyTemplateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  storyTemplateCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  storyTemplateCardPreview: {
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
    marginBottom: spacing.s,
  },
  storyTemplateCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storyTemplateCardActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7B51',
  },
  writeOwnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    marginTop: spacing.m,
    borderWidth: 2,
    borderColor: '#34A296',
    borderRadius: borderRadius.large,
    borderStyle: 'dashed',
    minHeight: touchTargets.comfortable,
  },
  writeOwnButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8B7F',
  },

  // Story Writing Section
  storyWritingSection: {
    flex: 1,
  },
  textAreaLarge: {
    minHeight: 200,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.large,
    fontSize: 18,
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
    textAlignVertical: 'top',
    lineHeight: 26,
  },
  bioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  clearBioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: spacing.xs,
  },
  clearBioButtonText: {
    fontSize: 14,
    color: colors.gray[500],
  },

  // Bio Phrases
  bioPhrasesSection: {
    marginTop: spacing.l,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  bioPhrasesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.s,
  },
  bioPhrasesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  bioPhraseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
    backgroundColor: '#E8F7F5',
    borderWidth: 1,
    borderColor: '#B5E3DD',
    minHeight: 44,
  },
  bioPhraseChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#277568',
  },

  // =========================================================================
  // Interest Categories Styles
  // =========================================================================
  interestsHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  selectionCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  selectionCountTextLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  selectionRequirement: {
    fontSize: 14,
    color: colors.gray[500],
  },
  // Note: selectionRequirementMet is defined in Enhanced Modal Styles section

  // Category Tabs
  categoryTabsContainer: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  categoryTabsContent: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    gap: spacing.s,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    minHeight: 44,
  },
  categoryTabSelected: {
    backgroundColor: '#FF7B51',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },
  categoryTabTextSelected: {
    color: colors.white,
  },

  // Selected Interests Preview
  selectedInterestsPreview: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    backgroundColor: colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  selectedInterestsLabel: {
    fontSize: 12,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  selectedInterestsScroll: {
    gap: spacing.xs,
  },
  selectedInterestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    borderRadius: borderRadius.medium,
    backgroundColor: '#FF7B51',
    marginRight: spacing.xs,
  },
  selectedInterestChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },

  // Interest Category Section
  interestCategorySection: {
    paddingBottom: spacing.l,
  },
  interestCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.m,
    paddingTop: spacing.m,
  },
  interestCategoryHeaderQuickPicks: {
    backgroundColor: '#FFF0EB',
    marginHorizontal: -spacing.l,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
  },
  interestCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
  },
  interestCategoryTitleQuickPicks: {
    color: '#E85A36',
    fontWeight: '700',
  },
  interestCategoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  interestSelectionItemLarge: {
    minHeight: touchTargets.comfortable,
  },
  interestSelectedLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 4,
    borderRadius: borderRadius.large,
    minHeight: touchTargets.comfortable,
  },
  interestSelectedTextLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  interestUnselectedLarge: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 4,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[200],
    minHeight: touchTargets.comfortable,
    justifyContent: 'center',
  },
  interestUnselectedTextLarge: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[700],
  },

  // =========================================================================
  // Visual Gender/Preferences Buttons
  // =========================================================================
  preferencesSection: {
    marginBottom: spacing.l,
  },
  preferencesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.xs,
  },
  preferencesSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  preferencesSectionHint: {
    fontSize: 14,
    color: colors.gray[500],
    marginBottom: spacing.m,
  },

  // Visual Gender Buttons
  visualGenderRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  visualGenderButtonWrapper: {
    flex: 1,
  },
  visualGenderButtonSelected: {
    flex: 1,
    borderRadius: borderRadius.xlarge,
    padding: spacing.l,
    alignItems: 'center',
    gap: spacing.s,
    minHeight: 140,
  },
  visualGenderButtonUnselected: {
    flex: 1,
    borderRadius: borderRadius.xlarge,
    padding: spacing.l,
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.gray[100],
    borderWidth: 3,
    borderColor: colors.gray[200],
    minHeight: 140,
  },
  visualGenderIconContainer: {
    alignItems: 'center',
  },
  visualGenderIconContainerUnselected: {
    alignItems: 'center',
    opacity: 0.7,
  },
  visualGenderSymbol: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  visualGenderSymbolUnselected: {
    fontSize: 12,
    color: colors.gray[500],
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  visualGenderTextSelected: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  visualGenderTextUnselected: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[600],
  },
  visualGenderCheckPlaceholder: {
    height: 24,
  },

  // Visual Looking For Buttons
  visualLookingForColumn: {
    gap: spacing.m,
  },
  visualLookingForWrapper: {
    minHeight: touchTargets.large,
  },
  visualLookingForSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.m,
    borderRadius: borderRadius.xlarge,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    minHeight: touchTargets.large,
  },
  visualLookingForUnselected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.m,
    borderRadius: borderRadius.xlarge,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    backgroundColor: colors.gray[100],
    borderWidth: 3,
    borderColor: colors.gray[200],
    minHeight: touchTargets.large,
  },
  visualLookingForTextSelected: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  visualLookingForTextUnselected: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[600],
    flex: 1,
  },

  // =========================================================================
  // Photo Gallery Modal - Premium Design Styles
  // =========================================================================
  photoGalleryModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  photoGalleryModalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  photoGalleryModalContainerTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '90%',
    marginBottom: spacing.xl,
    borderRadius: 28,
  },
  photoGalleryModalHeader: {
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
    paddingHorizontal: spacing.l,
  },
  photoGalleryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoGalleryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    flex: 1,
  },
  photoGalleryHeaderIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoGalleryHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  photoGalleryHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  photoGalleryCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginTop: spacing.m,
  },
  photoProgressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  photoProgressBarFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 4,
  },
  photoProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },

  // Photo Tips Card
  photoTipsCard: {
    backgroundColor: '#E8F7F5',
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginTop: spacing.m,
    borderWidth: 1,
    borderColor: '#D1EDE9',
  },
  photoTipsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  photoTipsCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1EDE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTipsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#277568',
  },
  photoTipsCardContent: {
    gap: spacing.xs,
  },
  photoTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  photoTipCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#349E92',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTipText: {
    fontSize: 14,
    color: colors.gray[700],
    flex: 1,
  },

  // Photo Slots Indicator
  photoSlotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  photoSlotsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
  },
  photoSlotsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  photoSlotIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoSlotEmpty: {
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderStyle: 'dashed',
  },
  photoSlotFilled: {
    backgroundColor: '#349E92',
  },
  photoSlotMain: {
    backgroundColor: '#FF7B51',
  },
  photoSlotNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[400],
  },

  // Photo Gallery Scroll
  photoGalleryScrollView: {
    flex: 1,
  },
  photoGalleryScrollContent: {
    paddingBottom: spacing.m,
  },

  // Add Photo Card
  photoGalleryAddCard: {
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.xlarge,
    overflow: 'hidden',
  },
  photoGalleryAddCardGradient: {
    flex: 1,
    borderRadius: borderRadius.xlarge,
  },
  photoGalleryAddCardBorder: {
    flex: 1,
    margin: 3,
    borderRadius: borderRadius.xlarge - 2,
    borderWidth: 2,
    borderColor: '#FFBEA8',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
  },
  photoGalleryAddCardBorderMain: {
    borderColor: 'rgba(255,255,255,0.5)',
  },
  photoGalleryAddCardIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE5DD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoGalleryAddCardIconCircleMain: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  photoGalleryAddCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E85A36',
    textAlign: 'center',
  },
  photoGalleryAddCardTitleMain: {
    color: colors.white,
  },
  photoGalleryAddCardHint: {
    fontSize: 14,
    color: '#F68562',
    textAlign: 'center',
  },
  photoGalleryAddCardHintMain: {
    color: 'rgba(255,255,255,0.8)',
  },

  // Photo Card
  photoGalleryPhotoCard: {
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.xlarge,
    overflow: 'hidden',
    position: 'relative',
  },
  photoGalleryPhotoImage: {
    width: '100%',
    height: '100%',
  },
  photoGalleryPhotoOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  photoGalleryMainBadge: {
    position: 'absolute',
    top: spacing.s,
    left: spacing.s,
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },
  photoGalleryMainBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
  },
  photoGalleryMainBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  photoGalleryPhotoBadge: {
    position: 'absolute',
    bottom: spacing.s,
    left: spacing.s,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoGalleryPhotoBadgeMain: {
    backgroundColor: '#FF7B51',
  },
  photoGalleryPhotoBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  photoGalleryDeleteButton: {
    position: 'absolute',
    top: spacing.s,
    right: spacing.s,
    borderRadius: 20,
    overflow: 'hidden',
  },
  photoGalleryDeleteButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoGallerySetMainButton: {
    position: 'absolute',
    bottom: spacing.s,
    right: spacing.s,
  },
  photoGallerySetMainButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  // Empty Message
  photoGalleryEmptyMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.gray[50],
    padding: spacing.m,
    borderRadius: borderRadius.medium,
    marginTop: spacing.m,
  },
  photoGalleryEmptyText: {
    fontSize: 14,
    color: colors.gray[500],
    flex: 1,
    lineHeight: 20,
  },

  // Footer
  photoGalleryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.l,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    backgroundColor: colors.white,
  },
  photoGalleryAddMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.round,
    borderWidth: 2,
    borderColor: '#FF7B51',
    backgroundColor: '#FFF0EB',
  },
  photoGalleryAddMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF7B51',
  },
  photoGalleryDoneButton: {
    flex: 1,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  photoGalleryDoneButtonDisabled: {
    opacity: 0.7,
  },
  photoGalleryDoneButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    height: 56,
  },
  photoGalleryDoneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  // Legacy styles (keeping for backward compatibility)
  photoTipsHeader: {
    backgroundColor: '#FFF0EB',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5DD',
  },
  photoTipsIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.xs,
  },
  photoTipsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C94A27',
  },
  photoTipsList: {
    gap: 4,
  },
  photoTipItem: {
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
  },

  // Photo Count Bar
  photoCountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  photoCountInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  photoCountNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF7B51',
  },
  photoCountLabel: {
    fontSize: 16,
    color: colors.gray[500],
  },
  photoCountDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  photoCountDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gray[200],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  photoCountDotFilled: {
    backgroundColor: '#FF7B51',
    borderColor: '#E85A36',
  },

  // Gallery Items - Larger
  // Width is now calculated dynamically in component using photoItemWidth for proper rotation support
  galleryAddPhotoItemLarge: {
    // width applied inline via responsiveStyles.galleryPhotoItem
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.xlarge,
  },
  galleryAddPhotoGradientLarge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
    borderRadius: borderRadius.xlarge,
    padding: spacing.m,
  },
  galleryAddPhotoIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  galleryAddPhotoTextLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  galleryAddPhotoHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  galleryPhotoItemLarge: {
    // width applied inline via responsiveStyles.galleryPhotoItem for proper rotation/orientation support
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.xlarge,
    position: 'relative',
    backgroundColor: colors.gray[200],
    ...shadows.medium,
  },
  galleryMainBadgeLarge: {
    position: 'absolute',
    top: spacing.s,
    left: spacing.s,
  },
  galleryMainBadgeGradientLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.medium,
  },
  galleryMainBadgeTextLarge: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  photoNumberBadge: {
    position: 'absolute',
    bottom: spacing.s,
    left: spacing.s,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  galleryDeleteButtonLarge: {
    position: 'absolute',
    top: spacing.s,
    right: spacing.s,
  },
  galleryDeleteButtonInnerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.large,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    minWidth: 80,
    justifyContent: 'center',
  },
  galleryDeleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  photoGalleryFooterImproved: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.l,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  photoGalleryDoneButtonLarge: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
  },
  photoGalleryDoneButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    height: touchTargets.large,
    borderRadius: borderRadius.large,
  },
  photoGalleryDoneTextLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },

  // =========================================================================
  // Toast Notification
  // =========================================================================
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: spacing.l,
    right: spacing.l,
    zIndex: 9999,
  },
  toastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.large,
    gap: spacing.m,
    ...shadows.large,
  },
  toastMessage: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 22,
  },

  // =========================================================================
  // Delete Confirmation Modal
  // =========================================================================
  deleteConfirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  deleteConfirmContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge,
    padding: spacing.xl,
    width: '90%',
    // maxWidth is now applied dynamically - Math.min(400, screenWidth * 0.9) for all screen sizes
    alignItems: 'center',
    ...shadows.large,
  },
  deleteConfirmIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFEBEE', // Light error/red background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  deleteConfirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  deleteConfirmMessage: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: spacing.m,
    width: '100%',
  },
  deleteConfirmCancelButton: {
    flex: 1,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    minHeight: touchTargets.comfortable,
    justifyContent: 'center',
  },
  deleteConfirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
  },
  deleteConfirmDeleteButton: {
    flex: 1,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    backgroundColor: colors.semantic.error,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    minHeight: touchTargets.comfortable,
    justifyContent: 'center',
  },
  deleteConfirmDeleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },

  // =========================================================================
  // Story Responses Section - Senior-Friendly (50+)
  // All touch targets 56-64px, fonts 18px+, high contrast
  // =========================================================================
  unreadBadge: {
    backgroundColor: '#FF7B51',
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    paddingHorizontal: spacing.s,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.s,
  },
  unreadBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  storyResponsesList: {
    gap: spacing.m,
  },
  storyResponseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    paddingVertical: spacing.m + 4, // Extra vertical padding for better touch target
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderColor: colors.gray[200],
    gap: spacing.m,
    minHeight: touchTargets.large, // 64px minimum
  },
  storyResponseItemUnread: {
    backgroundColor: colors.romantic.warmWhite,
    borderColor: '#FFBEA8',
    borderWidth: 2,
  },
  storyResponseAvatar: {
    position: 'relative',
  },
  storyResponseAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFD4C7',
  },
  storyResponseAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.romantic.blush,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.romantic.pinkLight,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF7B51',
    borderWidth: 3,
    borderColor: colors.white,
  },
  storyResponseContent: {
    flex: 1,
    gap: spacing.xs,
  },
  storyResponseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.s,
  },
  storyResponseName: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.gray[900],
    flex: 1,
  },
  storyResponseTime: {
    fontSize: 16,
    color: colors.gray[500],
    fontWeight: '500',
  },
  storyResponseMessage: {
    fontSize: 17,
    color: colors.gray[700],
    lineHeight: 26,
  },
  repliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    backgroundColor: '#E8F7F5',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
  },
  repliedBadgeText: {
    fontSize: 15,
    color: '#2E8B7F',
    fontWeight: '600',
  },
  tapToReplyText: {
    fontSize: 16,
    color: '#E85A36',
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  // New styles for Like Back feature
  storyResponseMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.m,
  },
  likeBackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginLeft: spacing.s,
  },
  likeBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#FF7B51',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 2,
    borderRadius: borderRadius.large,
    minHeight: 44,
    minWidth: 100,
  },
  likeBackButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  passButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#349E92',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.round,
    marginLeft: spacing.s,
  },
  matchedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Match modal styles
  matchModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  matchModalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xlarge,
    overflow: 'hidden',
    ...shadows.large,
  },
  matchModalContainerTablet: {
    maxWidth: 450,
  },
  matchModalGradient: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  matchModalIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  matchModalPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.white,
    marginBottom: spacing.l,
  },
  matchModalPhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  matchModalTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  matchModalSubtitle: {
    fontSize: 18,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 26,
  },
  matchModalActions: {
    width: '100%',
    gap: spacing.m,
  },
  matchModalButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    backgroundColor: colors.white,
    paddingVertical: spacing.m + 4,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.large,
    minHeight: touchTargets.comfortable,
  },
  matchModalButtonPrimaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E85A36',
  },
  matchModalButtonSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
    minHeight: touchTargets.medium,
  },
  matchModalButtonSecondaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.white,
    opacity: 0.9,
  },
  viewAllResponsesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    marginTop: spacing.s,
    minHeight: touchTargets.comfortable, // 56px touch target
    backgroundColor: '#FFF0EB',
    borderRadius: borderRadius.large,
  },
  viewAllResponsesText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E85A36',
  },
  emptyStoryResponses: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.l,
    backgroundColor: colors.romantic.warmWhite,
    borderRadius: borderRadius.large,
  },
  emptyStoryResponsesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[700],
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  emptyStoryResponsesText: {
    fontSize: 17,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 26,
  },

  // =========================================================================
  // Story Response Modal - Senior-Friendly (50+)
  // Warm, inviting design with large touch targets
  // =========================================================================
  storyResponseModalContainer: {
    maxHeight: '75%',
  },
  storyResponseModalContent: {
    padding: spacing.l,
    gap: spacing.l,
  },
  storyResponseSenderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingBottom: spacing.m,
    borderBottomWidth: 2,
    borderBottomColor: colors.romantic.blush,
  },
  storyResponseSenderAvatar: {},
  storyResponseSenderAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFBEA8',
  },
  storyResponseSenderAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyResponseSenderInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  storyResponseSenderInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  storyResponseSenderName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
  },
  storyResponseSenderTime: {
    fontSize: 17,
    color: colors.gray[500],
    fontWeight: '500',
  },
  storyResponseMessageSection: {
    gap: spacing.s,
  },
  storyResponseMessageLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[600],
    letterSpacing: 0.3,
  },
  storyResponseMessageBubble: {
    backgroundColor: colors.romantic.warmWhite,
    borderWidth: 2,
    borderColor: colors.romantic.blush,
    borderRadius: borderRadius.large,
    padding: spacing.l,
  },
  storyResponseMessageText: {
    fontSize: 19,
    color: colors.gray[800],
    lineHeight: 30,
  },
  storyResponseActions: {
    gap: spacing.m,
    marginTop: spacing.m,
  },
  alreadyRepliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingVertical: spacing.l,
    backgroundColor: '#E8F7F5',
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderColor: '#B5E3DD',
    minHeight: touchTargets.large,
  },
  alreadyRepliedText: {
    fontSize: 18,
    color: '#277568',
    fontWeight: '600',
  },
  replyButton: {
    overflow: 'hidden',
    borderRadius: borderRadius.xlarge,
  },
  replyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xl,
    minHeight: touchTargets.large, // 64px for senior-friendly touch target
  },
  replyButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
  replyHintText: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.xs,
  },

  // =========================================================================
  // ENHANCED Story Responses Styles - Senior-Friendly UI/UX Improvements
  // Touch targets: 56-64px minimum, Fonts: 18px+ body, WCAG AA contrast
  // Responsive: Works on phones, tablets, foldables in portrait & landscape
  // =========================================================================

  // Section Card Enhancements
  storyResponsesSectionCard: {
    borderWidth: 2,
    borderColor: colors.romantic.pinkLight,
    overflow: 'hidden',
  },
  storyResponsesHeader: {
    backgroundColor: colors.romantic.blush,
    paddingVertical: spacing.m,
  },
  storyResponsesIconContainer: {
    marginRight: spacing.xs,
  },
  storyResponsesIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyResponsesTitleContainer: {
    flex: 1,
    gap: 2,
  },
  storyResponsesSubtitle: {
    fontSize: 14,
    color: '#E85A36',
    fontWeight: '600',
  },

  // Enhanced Unread Badge with animation support
  unreadBadgeEnhanced: {
    backgroundColor: '#FF7B51',
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    ...shadows.small,
  },

  // Story Responses List - Tablet/Landscape variants
  storyResponsesListTablet: {
    gap: spacing.l,
  },
  storyResponsesListLandscape: {
    gap: spacing.m,
  },

  // Enhanced Response Item
  storyResponseItemEnhanced: {
    position: 'relative',
    overflow: 'hidden',
    ...shadows.small,
  },
  storyResponseItemUnreadEnhanced: {
    backgroundColor: colors.romantic.warmWhite,
    borderColor: '#F68562',
    borderWidth: 2,
    ...shadows.medium,
  },
  storyResponseItemPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  storyResponseItemTablet: {
    padding: spacing.l,
    paddingVertical: spacing.l,
    minHeight: touchTargets.large + 16, // 80px for tablet
  },

  // Unread indicator bar (left edge accent)
  unreadIndicatorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#FF7B51',
    borderTopLeftRadius: borderRadius.large,
    borderBottomLeftRadius: borderRadius.large,
  },

  // Enhanced Avatar styles
  storyResponseAvatarUnread: {
    // Add subtle glow effect for unread
  },
  storyResponseAvatarImageEnhanced: {
    borderWidth: 3,
    borderColor: '#FFBEA8',
  },
  storyResponseAvatarImageUnread: {
    borderColor: '#FF7B51',
    borderWidth: 3,
  },
  storyResponseAvatarImageTablet: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  storyResponseAvatarPlaceholderEnhanced: {
    borderWidth: 0,
  },
  storyResponseAvatarPlaceholderTablet: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  storyResponseAvatarInitial: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
  },

  // Unread dot with glow effect
  unreadDotContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  unreadDotGlow: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD4C7',
    opacity: 0.5,
    top: -5,
    left: -5,
  },

  // Enhanced name styles for unread
  storyResponseNameUnread: {
    color: colors.gray[900],
    fontWeight: '800',
  },
  storyResponseNameTablet: {
    fontSize: 21,
  },

  // Time container with NEW badge
  storyResponseTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  storyResponseTimeUnread: {
    color: '#E85A36',
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: '#FF7B51',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },

  // Enhanced message styles
  storyResponseMessageUnread: {
    color: colors.gray[800],
    fontWeight: '500',
  },
  storyResponseMessageTablet: {
    fontSize: 18,
    lineHeight: 28,
  },

  // Enhanced Matched Badge
  matchedBadgeEnhanced: {
    overflow: 'hidden',
    borderRadius: borderRadius.round,
    marginLeft: spacing.s,
  },
  matchedBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 2,
  },

  // Enhanced Like Back Actions
  likeBackActionsEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginLeft: spacing.m,
  },
  likeBackActionsTablet: {
    gap: spacing.l,
  },

  // Enhanced Pass Button - Larger touch target
  passButtonEnhanced: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[300],
  },
  passButtonTablet: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  // Enhanced Like Back Button with gradient
  likeBackButtonEnhanced: {
    overflow: 'hidden',
    borderRadius: borderRadius.large,
    minHeight: 52,
    minWidth: 120,
    ...shadows.small,
  },
  likeBackButtonTablet: {
    minHeight: 56,
    minWidth: 140,
  },
  likeBackButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.m + 4,
    paddingVertical: spacing.m,
    minHeight: 52,
  },
  likeBackButtonTextEnhanced: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  likeBackButtonTextTablet: {
    fontSize: 18,
  },

  // Enhanced View All Button
  viewAllResponsesButtonEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m + 4,
    minHeight: touchTargets.comfortable + 4, // 60px
    backgroundColor: '#FFF0EB',
    borderWidth: 2,
    borderColor: '#FFD4C7',
    borderRadius: borderRadius.large,
  },
  viewAllResponsesButtonTablet: {
    paddingVertical: spacing.l,
    minHeight: touchTargets.large, // 64px
  },
  viewAllResponsesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  viewAllResponsesArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllResponsesTextTablet: {
    fontSize: 20,
  },

  // Enhanced Empty State
  emptyStoryResponsesEnhanced: {
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.romantic.warmWhite,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderColor: colors.romantic.blush,
    gap: spacing.m,
  },
  emptyStoryResponsesTablet: {
    paddingVertical: spacing.xxxl + 16,
    paddingHorizontal: spacing.xxl,
  },
  emptyStoryResponsesIconContainer: {
    marginBottom: spacing.s,
  },
  emptyStoryResponsesIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStoryResponsesTitleEnhanced: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[800],
    marginTop: spacing.s,
  },
  emptyStoryResponsesTitleTablet: {
    fontSize: 24,
  },
  emptyStoryResponsesTextEnhanced: {
    fontSize: 18,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 28,
  },
  emptyStoryResponsesTextTablet: {
    fontSize: 19,
    lineHeight: 30,
    maxWidth: 400,
  },
  emptyStoryResponsesHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: '#E8F7F5',
    borderRadius: borderRadius.medium,
  },
  emptyStoryResponsesHintText: {
    fontSize: 15,
    color: '#277568',
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },

  // =========================================================================
  // ENHANCED Story Response Modal Styles
  // =========================================================================

  storyResponseModalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  storyResponseModalContainerEnhanced: {
    overflow: 'hidden',
  },
  storyResponseModalContainerTablet: {
    maxWidth: 520,
  },

  // Modal Header
  storyResponseModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.romantic.pinkLight,
  },
  storyResponseModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  storyResponseModalHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.romantic.pinkLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyResponseModalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  storyResponseModalHeaderTitleTablet: {
    fontSize: 22,
  },
  storyResponseModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyResponseModalCloseButtonTablet: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  // Modal Content
  storyResponseModalContentEnhanced: {
    padding: spacing.l,
    gap: spacing.l,
  },
  storyResponseModalContentTablet: {
    padding: spacing.xl,
    gap: spacing.xl,
  },

  // Enhanced Sender Section
  storyResponseSenderSectionEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
    paddingBottom: spacing.l,
    borderBottomWidth: 0,
  },
  storyResponseSenderSectionTablet: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  storyResponseSenderAvatarWrapper: {
    // Wrapper for gradient border effect
  },
  storyResponseSenderAvatarBorder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyResponseSenderAvatarBorderTablet: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 4,
  },
  storyResponseSenderAvatarInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  storyResponseSenderAvatarInnerTablet: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  storyResponseSenderAvatarImageEnhanced: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 0,
  },
  storyResponseSenderAvatarImageTablet: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  storyResponseSenderAvatarPlaceholderEnhanced: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyResponseSenderAvatarPlaceholderTablet: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  storyResponseSenderInitialTablet: {
    fontSize: 38,
  },
  storyResponseSenderInfoEnhanced: {
    flex: 1,
    gap: spacing.xs,
  },
  storyResponseSenderNameEnhanced: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.gray[900],
    lineHeight: 32,
  },
  storyResponseSenderNameTablet: {
    fontSize: 28,
    lineHeight: 36,
  },
  storyResponseSenderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  storyResponseSenderTimeEnhanced: {
    fontSize: 16,
    color: colors.gray[500],
    fontWeight: '500',
  },

  // Enhanced Message Section
  storyResponseMessageSectionEnhanced: {
    gap: spacing.m,
  },
  storyResponseMessageLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  storyResponseMessageLabelEnhanced: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
  },
  storyResponseMessageBubbleEnhanced: {
    backgroundColor: colors.romantic.warmWhite,
    borderWidth: 2,
    borderColor: colors.romantic.blush,
    borderRadius: borderRadius.large,
    padding: spacing.l,
    position: 'relative',
  },
  storyResponseMessageBubbleTablet: {
    padding: spacing.xl,
  },
  storyResponseQuoteDecoration: {
    position: 'absolute',
    top: spacing.m,
    left: spacing.m,
    opacity: 0.5,
  },
  storyResponseMessageTextEnhanced: {
    fontSize: 20,
    color: colors.gray[800],
    lineHeight: 32,
    paddingLeft: spacing.l + 4,
  },
  storyResponseMessageTextTablet: {
    fontSize: 21,
    lineHeight: 34,
  },

  // Enhanced Actions Section
  storyResponseActionsEnhanced: {
    gap: spacing.m,
    marginTop: spacing.s,
  },

  // Enhanced Already Replied State
  alreadyRepliedContainerEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.l,
    backgroundColor: '#E8F7F5',
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderColor: '#B5E3DD',
    minHeight: touchTargets.large,
  },
  alreadyRepliedContainerTablet: {
    paddingVertical: spacing.l + 4,
    paddingHorizontal: spacing.xl,
  },
  alreadyRepliedIconContainer: {
    // Container for icon with gradient bg
  },
  alreadyRepliedIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alreadyRepliedTextContainer: {
    flex: 1,
    gap: 2,
  },
  alreadyRepliedTextEnhanced: {
    fontSize: 18,
    color: '#277568',
    fontWeight: '700',
  },
  alreadyRepliedSubtext: {
    fontSize: 15,
    color: '#2E8B7F',
    fontWeight: '500',
  },

  // Enhanced Reply Button
  replyActionContainer: {
    gap: spacing.m,
  },
  replyButtonEnhanced: {
    overflow: 'hidden',
    borderRadius: borderRadius.xlarge,
    ...shadows.medium,
  },
  replyButtonTablet: {
    borderRadius: borderRadius.xlarge + 4,
  },
  replyButtonGradientEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m + 4,
    paddingHorizontal: spacing.xxl,
    minHeight: touchTargets.large, // 64px
  },
  replyButtonGradientTablet: {
    paddingVertical: spacing.l,
    minHeight: touchTargets.large + 8, // 72px
  },
  replyButtonTextEnhanced: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  replyButtonTextTablet: {
    fontSize: 22,
  },
  replyHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  replyHintTextEnhanced: {
    fontSize: 15,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
  },

  // =========================================================================
  // Photo Viewer - Full Screen with Zoom
  // =========================================================================
  photoViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  photoViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  photoViewerCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerCounter: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  photoViewerCounterText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  photoViewerHeaderRight: {
    width: 48,
    alignItems: 'flex-end',
  },
  photoViewerZoomReset: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerImage: {
    flex: 1,
  },
  photoViewerNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    zIndex: 5,
  },
  photoViewerNavLeft: {
    left: spacing.s,
  },
  photoViewerNavRight: {
    right: spacing.s,
  },
  photoViewerNavButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerThumbnails: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
  },
  photoViewerThumbnailsContent: {
    paddingHorizontal: spacing.l,
    gap: spacing.s,
  },
  photoViewerThumbnail: {
    width: 60,
    height: 80,
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  photoViewerThumbnailActive: {
    borderColor: '#FF7B51',
  },
  photoViewerThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  photoViewerThumbnailBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF7B51',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  photoViewerActionButton: {
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  photoViewerActionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  photoViewerActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  photoViewerDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  photoViewerDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  photoViewerZoomHint: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoViewerZoomHintText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});

export default ProfileScreen;
