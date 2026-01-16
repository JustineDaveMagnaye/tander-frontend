/**
 * TANDER Settings Screen - Comprehensive Senior-Friendly Design
 *
 * Optimized for Filipino seniors (50+) with maximum accessibility across:
 * - All iOS devices: iPhone SE (320pt) to iPad Pro 12.9" (1024pt)
 * - All Android devices: Small phones (360dp) to Samsung Tab S8 (800dp)
 * - All orientations: Portrait and Landscape with smooth transitions
 * - iOS 13+ and Android API 24+ (Android 7.0+)
 *
 * Key Features:
 * - Extra large touch targets (56-64px) for seniors
 * - High contrast WCAG AAA compliant colors
 * - Large readable text (18px+ minimum, 20px+ for body)
 * - Card-based sections with clear visual hierarchy
 * - Responsive layout using Math.min(hp(), wp()) pattern for landscape
 * - Safe area support for all edges
 * - Large accessible sliders with 56px thumbs
 * - Auto-save with visual feedback
 * - Haptic feedback on interactions
 * - Smooth animations with reduced motion support
 *
 * Design System Compliance:
 * - Orange (#F97316) for primary actions
 * - Teal (#14B8A6) for secondary actions and trust indicators
 * - 8pt grid spacing system
 * - Senior-friendly typography scale
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
  AccessibilityInfo,
  Vibration,
} from 'react-native';
import { toast } from '@store/toastStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Slider } from '@miblanchard/react-native-slider';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows, touchTargets, componentSpacing } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import { NotificationsScreen } from './NotificationsScreen';
import { ShowMeScreen } from './ShowMeScreen';
import { LocationScreen } from './LocationScreen';
import { HelpSupportScreen } from './HelpSupportScreen';
import { PrivacyScreen } from './PrivacyScreen';
import { SecurityScreen } from './SecurityScreen';
import { IDVerificationSettingsScreen } from './IDVerificationSettingsScreen';
import { CallHistoryScreen } from '@features/messaging/screens';
import { CallSettingsScreen } from './CallSettingsScreen';
import {
  getDiscoverySettings,
  deleteAccount,
  updateDistancePreference,
  updateAgeRange,
} from '@/services/api/profileApi';

// =============================================================================
// TYPES
// =============================================================================

type SubSettingType =
  | 'notifications'
  | 'privacy'
  | 'security'
  | 'showme'
  | 'location'
  | 'help'
  | 'idverification'
  | 'callhistory'
  | 'callsettings'
  | null;

interface SettingsScreenProps {
  onBack: () => void;
  onNavigateToSubSetting?: (setting: SubSettingType) => void;
  onLogout?: () => void;
}

interface SettingItemProps {
  icon: keyof typeof Feather.glyphMap;
  iconBackgroundColor: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  showBorder?: boolean;
  accessibilityHint?: string;
  responsiveStyles: ResponsiveStyleValues;
  badge?: string;
  badgeColor?: string;
}

interface SectionHeaderProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  responsiveStyles: ResponsiveStyleValues;
  gradientColors?: readonly [string, string];
}

interface ResponsiveStyleValues {
  screenMargin: number;
  sectionGap: number;
  maxContentWidth: number | undefined;
  headerTitleSize: number;
  sectionTitleSize: number;
  bodyTextSize: number;
  smallTextSize: number;
  iconSize: number;
  chevronSize: number;
  settingItemHeight: number;
  sliderThumbSize: number;
  sliderTrackHeight: number;
  sliderHeight: number;
  buttonHeight: number;
  inputHeight: number;
  touchTargetSize: number;
  isLandscape: boolean;
  isTablet: boolean;
  cardPadding: number;
  sectionHeaderPadding: number;
  modalMaxWidth: number;
  gridColumns: number;
  sectionIconSize: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_AGE = 60;
const MAX_AGE = 100;
const MIN_DISTANCE = 1;
const MAX_DISTANCE = 100;
const DEBOUNCE_DELAY = 800;
const SAVE_INDICATOR_DURATION = 2000;

// Content max widths by device type
const CONTENT_MAX_WIDTH = {
  phonePortrait: undefined,
  phoneLandscape: 580,
  tabletPortrait: 640,
  tabletLandscape: 720,
} as const;

// Haptic feedback patterns
const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'warning' = 'light') => {
  if (Platform.OS === 'ios') {
    // iOS uses Vibration with specific patterns for haptics
    switch (type) {
      case 'light':
        Vibration.vibrate(10);
        break;
      case 'medium':
        Vibration.vibrate(20);
        break;
      case 'success':
        Vibration.vibrate([0, 30, 50, 30]);
        break;
      case 'warning':
        Vibration.vibrate([0, 50, 100, 50]);
        break;
    }
  } else if (Platform.OS === 'android') {
    Vibration.vibrate(type === 'success' ? 50 : type === 'warning' ? 100 : 20);
  }
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Save Status Indicator - Shows auto-save feedback
 */
const SaveIndicator: React.FC<{
  visible: boolean;
  saving: boolean;
  responsiveStyles: ResponsiveStyleValues;
}> = React.memo(({ visible, saving, responsiveStyles }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.saveIndicator,
        {
          opacity: fadeAnim,
          paddingHorizontal: responsiveStyles.isLandscape ? spacing.s : spacing.m,
          paddingVertical: responsiveStyles.isLandscape ? spacing.xxs : spacing.xs,
        },
      ]}
    >
      {saving ? (
        <>
          <ActivityIndicator size="small" color={colors.orange[500]} />
          <Text
            style={[
              styles.saveIndicatorText,
              { fontSize: responsiveStyles.smallTextSize - 2 },
            ]}
          >
            Saving...
          </Text>
        </>
      ) : (
        <>
          <Feather name="check-circle" size={16} color={colors.teal[500]} />
          <Text
            style={[
              styles.saveIndicatorTextSuccess,
              { fontSize: responsiveStyles.smallTextSize - 2 },
            ]}
          >
            Saved
          </Text>
        </>
      )}
    </Animated.View>
  );
});

SaveIndicator.displayName = 'SaveIndicator';

/**
 * Enhanced Section Header with gradient icon
 */
const SectionHeader: React.FC<SectionHeaderProps> = React.memo(({
  icon,
  title,
  subtitle,
  responsiveStyles,
  gradientColors = colors.gradient.primary,
}) => {
  const headerIconSize = responsiveStyles.sectionIconSize;
  const iconInnerSize = responsiveStyles.isLandscape
    ? Math.min(headerIconSize * 0.5, 20)
    : responsiveStyles.isTablet ? 24 : 22;

  return (
    <View
      style={[
        styles.sectionHeader,
        {
          padding: responsiveStyles.sectionHeaderPadding,
          paddingVertical: responsiveStyles.isLandscape
            ? Math.min(responsiveStyles.sectionHeaderPadding, 12)
            : responsiveStyles.sectionHeaderPadding,
        },
      ]}
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    >
      <View style={styles.sectionHeaderIconWrapper}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.sectionHeaderIcon,
            {
              width: headerIconSize,
              height: headerIconSize,
              borderRadius: headerIconSize / 2,
            },
          ]}
        >
          <Feather
            name={icon}
            size={iconInnerSize}
            color={colors.white}
          />
        </LinearGradient>
      </View>
      <View style={styles.sectionHeaderTextContainer}>
        <Text
          style={[
            styles.sectionHeaderTitle,
            {
              fontSize: responsiveStyles.sectionTitleSize,
              lineHeight: responsiveStyles.sectionTitleSize * 1.2,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.sectionHeaderSubtitle,
              {
                fontSize: responsiveStyles.smallTextSize,
                lineHeight: responsiveStyles.smallTextSize * 1.4,
              },
            ]}
            numberOfLines={responsiveStyles.isLandscape ? 1 : 2}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
});

SectionHeader.displayName = 'SectionHeader';

/**
 * Enhanced Setting Item with badge support
 */
const SettingItem: React.FC<SettingItemProps> = React.memo(({
  icon,
  iconBackgroundColor,
  iconColor,
  title,
  subtitle,
  onPress,
  showBorder = true,
  accessibilityHint,
  responsiveStyles,
  badge,
  badgeColor = colors.orange[500],
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const iconContainerSize = responsiveStyles.touchTargetSize;

  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    triggerHaptic('light');
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          styles.settingItem,
          {
            minHeight: responsiveStyles.settingItemHeight,
            paddingHorizontal: responsiveStyles.cardPadding,
            paddingVertical: responsiveStyles.isLandscape
              ? Math.min(spacing.s, 14)
              : spacing.m,
          },
          showBorder && styles.settingItemBorder,
          isPressed && styles.settingItemPressed,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible={true}
        accessibilityLabel={`${title}. ${subtitle}`}
        accessibilityHint={accessibilityHint || `Double tap to open ${title} settings`}
        accessibilityRole="button"
      >
        <View style={styles.settingItemContent}>
          <View
            style={[
              styles.settingItemIcon,
              {
                backgroundColor: iconBackgroundColor,
                width: iconContainerSize,
                height: iconContainerSize,
                borderRadius: iconContainerSize / 2,
              },
            ]}
          >
            <Feather
              name={icon}
              size={responsiveStyles.iconSize}
              color={iconColor}
            />
          </View>
          <View style={styles.settingItemTextContainer}>
            <View style={styles.settingItemTitleRow}>
              <Text
                style={[
                  styles.settingItemTitle,
                  { fontSize: responsiveStyles.bodyTextSize },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {badge && (
                <View style={[styles.settingItemBadge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.settingItemBadgeText}>{badge}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.settingItemSubtitle,
                {
                  fontSize: responsiveStyles.smallTextSize,
                  lineHeight: responsiveStyles.smallTextSize * 1.4,
                },
              ]}
              numberOfLines={responsiveStyles.isLandscape ? 1 : 2}
            >
              {subtitle}
            </Text>
          </View>
        </View>
        <View style={styles.settingItemChevronContainer}>
          <View style={styles.chevronBackground}>
            <Feather
              name="chevron-right"
              size={responsiveStyles.chevronSize}
              color={colors.gray[400]}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

SettingItem.displayName = 'SettingItem';

/**
 * Enhanced Value Display Badge for sliders with gradient
 */
const SliderValueBadge: React.FC<{
  value: string;
  responsiveStyles: ResponsiveStyleValues;
  color?: 'orange' | 'teal';
}> = React.memo(({ value, responsiveStyles, color = 'orange' }) => {
  const badgeFontSize = responsiveStyles.isLandscape
    ? Math.min(responsiveStyles.bodyTextSize, 18)
    : responsiveStyles.isTablet ? 24 : 22;

  const gradientColors = color === 'orange'
    ? colors.gradient.primaryButton
    : colors.gradient.likeButton;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.sliderValueBadge,
        {
          paddingHorizontal: responsiveStyles.isLandscape ? spacing.m : spacing.l,
          paddingVertical: responsiveStyles.isLandscape ? spacing.xs : spacing.s,
        },
      ]}
    >
      <Text
        style={[
          styles.sliderValueBadgeText,
          { fontSize: badgeFontSize },
        ]}
        accessibilityRole="text"
      >
        {value}
      </Text>
    </LinearGradient>
  );
});

SliderValueBadge.displayName = 'SliderValueBadge';

/**
 * Enhanced Slider Label with better visual hierarchy
 */
const SliderLabel: React.FC<{
  label: string;
  value: number;
  unit?: string;
  color?: string;
  fontSize: number;
}> = React.memo(({ label, value, unit = '', color = colors.orange[500], fontSize }) => (
  <View style={styles.sliderLabelContainer}>
    <Text style={[styles.sliderLabelText, { fontSize }]}>
      {label}:{' '}
      <Text style={[styles.sliderLabelValue, { color }]}>
        {value}{unit}
      </Text>
    </Text>
  </View>
));

SliderLabel.displayName = 'SliderLabel';

/**
 * About Modal Component - Better than just a toast
 */
const AboutModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  responsiveStyles: ResponsiveStyleValues;
}> = React.memo(({ visible, onClose, responsiveStyles }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View
          style={[
            styles.aboutModalContent,
            {
              maxWidth: responsiveStyles.modalMaxWidth,
              padding: responsiveStyles.isLandscape
                ? Math.min(spacing.l, 24)
                : spacing.xl,
              marginHorizontal: responsiveStyles.screenMargin,
            },
          ]}
        >
          {/* App Logo/Icon */}
          <LinearGradient
            colors={colors.gradient.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.aboutLogoContainer,
              {
                width: responsiveStyles.isLandscape ? 72 : 96,
                height: responsiveStyles.isLandscape ? 72 : 96,
                borderRadius: responsiveStyles.isLandscape ? 24 : 28,
              },
            ]}
          >
            <Feather
              name="heart"
              size={responsiveStyles.isLandscape ? 36 : 48}
              color={colors.white}
            />
          </LinearGradient>

          {/* App Name */}
          <Text
            style={[
              styles.aboutTitle,
              { fontSize: responsiveStyles.headerTitleSize },
            ]}
          >
            TANDER
          </Text>

          {/* Version */}
          <View style={styles.aboutVersionBadge}>
            <Text style={[styles.aboutVersionText, { fontSize: responsiveStyles.smallTextSize }]}>
              Version 1.0.0
            </Text>
          </View>

          {/* Description */}
          <Text
            style={[
              styles.aboutDescription,
              {
                fontSize: responsiveStyles.bodyTextSize - 2,
                lineHeight: (responsiveStyles.bodyTextSize - 2) * 1.6,
              },
            ]}
          >
            A dating app designed for Filipino seniors seeking meaningful connections
            and lasting companionship. Built with love and care for the 50+ community.
          </Text>

          {/* Tagline */}
          <Text
            style={[
              styles.aboutTagline,
              { fontSize: responsiveStyles.smallTextSize },
            ]}
          >
            Where Meaningful Connections Begin
          </Text>

          {/* Close Button */}
          <TouchableOpacity
            style={[
              styles.aboutCloseButton,
              { minHeight: responsiveStyles.touchTargetSize },
            ]}
            onPress={onClose}
            accessible={true}
            accessibilityLabel="Close about dialog"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={colors.gradient.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.aboutCloseButtonGradient}
            >
              <Text
                style={[
                  styles.aboutCloseButtonText,
                  { fontSize: responsiveStyles.bodyTextSize },
                ]}
              >
                Got It
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
});

AboutModal.displayName = 'AboutModal';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onNavigateToSubSetting,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const {
    width,
    height,
    isTablet,
    isLandscape,
    isPhone,
    hp,
    wp,
    moderateScale,
    getScreenMargin,
    getButtonHeight,
    getInputHeight,
    getTouchTargetSize,
    getResponsiveFontSize,
  } = useResponsive();

  // Loading & animation states
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Settings state
  const [distancePreference, setDistancePreference] = useState(50);
  const [minAge, setMinAge] = useState(60);
  const [maxAge, setMaxAge] = useState(80);

  // Save indicator states
  const [isSavingDistance, setIsSavingDistance] = useState(false);
  const [isSavingAge, setIsSavingAge] = useState(false);
  const [showDistanceSaved, setShowDistanceSaved] = useState(false);
  const [showAgeSaved, setShowAgeSaved] = useState(false);

  // Debounce refs for API calls
  const distanceDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const ageDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const distanceSavedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ageSavedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active sub-screen navigation
  const [activeSubScreen, setActiveSubScreen] = useState<SubSettingType>(null);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Previous values for rollback on error
  const previousDistanceRef = useRef(distancePreference);
  const previousMinAgeRef = useRef(minAge);
  const previousMaxAgeRef = useRef(maxAge);

  // Reduced motion preference
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  // =============================================================================
  // RESPONSIVE STYLE CALCULATIONS
  // =============================================================================

  const responsiveStyles = useMemo((): ResponsiveStyleValues => {
    const screenMargin = getScreenMargin();

    // Determine max content width based on device/orientation
    let maxContentWidth: number | undefined;
    if (isTablet) {
      maxContentWidth = isLandscape
        ? CONTENT_MAX_WIDTH.tabletLandscape
        : CONTENT_MAX_WIDTH.tabletPortrait;
    } else if (isLandscape) {
      maxContentWidth = CONTENT_MAX_WIDTH.phoneLandscape;
    }

    // Font sizes using Math.min pattern for landscape safety
    const headerTitleSize = isLandscape
      ? Math.min(hp(4), 26)
      : isTablet ? 30 : 28;

    const sectionTitleSize = isLandscape
      ? Math.min(hp(3), 19)
      : isTablet ? 23 : 21;

    const bodyTextSize = isLandscape
      ? Math.min(hp(2.5), 18)
      : isTablet ? 21 : 19;

    const smallTextSize = isLandscape
      ? Math.min(hp(2.2), 16)
      : isTablet ? 18 : 16;

    // Icon sizes - larger for better visibility
    const iconSize = isLandscape
      ? Math.min(hp(3.5), 26)
      : isTablet ? 30 : 28;

    const chevronSize = isLandscape
      ? Math.min(hp(3.5), 28)
      : isTablet ? 32 : 30;

    // Section header icon - prominent and visible
    const sectionIconSize = isLandscape
      ? Math.min(hp(6), 44)
      : isTablet ? 52 : 48;

    // Touch targets and component heights
    const touchTargetSize = getTouchTargetSize('comfortable');
    const settingItemHeight = isLandscape
      ? Math.min(hp(14), 76)
      : isTablet ? 92 : 84;

    // Slider dimensions - large for seniors
    const sliderThumbSize = isLandscape
      ? Math.min(hp(8), 52)
      : 60;

    const sliderTrackHeight = isLandscape
      ? Math.min(hp(1.5), 10)
      : 12;

    const sliderHeight = isLandscape
      ? Math.min(hp(8), 52)
      : 60;

    // Button and input heights
    const buttonHeight = getButtonHeight();
    const inputHeight = getInputHeight();

    // Card padding
    const cardPadding = isLandscape
      ? Math.min(hp(3), spacing.m)
      : isTablet ? spacing.xl : spacing.l;

    const sectionHeaderPadding = isLandscape
      ? Math.min(hp(2.5), spacing.m)
      : isTablet ? spacing.l : spacing.m;

    // Modal max width
    const modalMaxWidth = isTablet
      ? 520
      : isLandscape
        ? Math.min(wp(70), 440)
        : 440;

    // Grid columns for tablet layout
    const gridColumns = isTablet && !isLandscape ? 2 : 1;

    return {
      screenMargin,
      sectionGap: isLandscape
        ? Math.min(hp(2), spacing.m)
        : isTablet ? spacing.l : spacing.m,
      maxContentWidth,
      headerTitleSize,
      sectionTitleSize,
      bodyTextSize,
      smallTextSize,
      iconSize,
      chevronSize,
      sectionIconSize,
      settingItemHeight,
      sliderThumbSize,
      sliderTrackHeight,
      sliderHeight,
      buttonHeight,
      inputHeight,
      touchTargetSize,
      isLandscape,
      isTablet,
      cardPadding,
      sectionHeaderPadding,
      modalMaxWidth,
      gridColumns,
    };
  }, [
    width,
    height,
    isTablet,
    isLandscape,
    hp,
    wp,
    getScreenMargin,
    getButtonHeight,
    getInputHeight,
    getTouchTargetSize,
  ]);

  // =============================================================================
  // LOAD SETTINGS ON MOUNT
  // =============================================================================

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await getDiscoverySettings();
        setDistancePreference(settings.distancePreference);
        setMinAge(settings.minAge);
        setMaxAge(settings.maxAge);

        // Store initial values for rollback
        previousDistanceRef.current = settings.distancePreference;
        previousMinAgeRef.current = settings.minAge;
        previousMaxAgeRef.current = settings.maxAge;

        // Fade in animation
        if (!reduceMotion) {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start();
        } else {
          fadeAnim.setValue(1);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        toast.error(
          'Unable to Load Settings',
          'Please check your internet connection and try again.'
        );
        // Still show the screen with default values
        fadeAnim.setValue(1);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();

    // Cleanup debounce timers on unmount
    return () => {
      if (distanceDebounceRef.current) clearTimeout(distanceDebounceRef.current);
      if (ageDebounceRef.current) clearTimeout(ageDebounceRef.current);
      if (distanceSavedTimeoutRef.current) clearTimeout(distanceSavedTimeoutRef.current);
      if (ageSavedTimeoutRef.current) clearTimeout(ageSavedTimeoutRef.current);
    };
  }, [fadeAnim, reduceMotion]);

  // =============================================================================
  // NAVIGATION HANDLERS
  // =============================================================================

  const handleNavigateToSubSetting = useCallback(
    (setting: SubSettingType) => {
      triggerHaptic('light');
      setActiveSubScreen(setting);
      onNavigateToSubSetting?.(setting);
    },
    [onNavigateToSubSetting]
  );

  const handleBackFromSubScreen = useCallback(() => {
    setActiveSubScreen(null);
  }, []);

  // =============================================================================
  // LOGOUT HANDLER
  // =============================================================================

  const handleLogout = useCallback(() => {
    triggerHaptic('medium');
    Alert.alert(
      'Log Out of TANDER',
      'Are you sure you want to log out? You will need to sign in again to use the app.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('success');
            onLogout?.();
          },
        },
      ],
      { cancelable: true }
    );
  }, [onLogout]);

  // =============================================================================
  // DELETE ACCOUNT HANDLERS
  // =============================================================================

  const handleDeleteAccountPress = useCallback(() => {
    triggerHaptic('warning');
    Alert.alert(
      'Delete Your Account?',
      'This will permanently delete:\n\n' +
      '- Your profile and photos\n' +
      '- All your matches\n' +
      '- All your messages\n' +
      '- Your account settings\n\n' +
      'This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'I Understand, Continue',
          style: 'destructive',
          onPress: () => {
            setDeletePassword('');
            setShowPassword(false);
            setShowDeleteModal(true);
          },
        },
      ],
      { cancelable: true }
    );
  }, []);

  const handleConfirmDeleteAccount = useCallback(async () => {
    if (!deletePassword.trim()) {
      triggerHaptic('warning');
      toast.warning(
        'Password Required',
        'Please enter your password to confirm account deletion.'
      );
      return;
    }

    try {
      setIsDeletingAccount(true);
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
      setDeletePassword('');
      triggerHaptic('success');
      toast.success(
        'Account Deleted',
        'Your account has been permanently deleted. We are sorry to see you go.'
      );
      // Logout after a brief delay to let user see the toast
      setTimeout(() => onLogout?.(), 1500);
    } catch (err) {
      console.error('Failed to delete account:', err);
      triggerHaptic('warning');
      toast.error(
        'Unable to Delete Account',
        'Please check your password and try again.'
      );
    } finally {
      setIsDeletingAccount(false);
    }
  }, [deletePassword, onLogout]);

  const handleCancelDeleteAccount = useCallback(() => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setShowPassword(false);
  }, []);

  // =============================================================================
  // SLIDER HANDLERS WITH DEBOUNCED API CALLS & SAVE INDICATORS
  // =============================================================================

  const handleDistanceChange = useCallback((value: number[]) => {
    const newValue = Math.round(value[0]);
    setDistancePreference(newValue);
    setShowDistanceSaved(false);
    setIsSavingDistance(true);

    if (distanceDebounceRef.current) {
      clearTimeout(distanceDebounceRef.current);
    }
    if (distanceSavedTimeoutRef.current) {
      clearTimeout(distanceSavedTimeoutRef.current);
    }

    distanceDebounceRef.current = setTimeout(async () => {
      try {
        await updateDistancePreference(newValue);
        previousDistanceRef.current = newValue;
        setIsSavingDistance(false);
        setShowDistanceSaved(true);
        triggerHaptic('success');

        // Hide saved indicator after delay
        distanceSavedTimeoutRef.current = setTimeout(() => {
          setShowDistanceSaved(false);
        }, SAVE_INDICATOR_DURATION);
      } catch (err) {
        console.error('Failed to update distance:', err);
        setDistancePreference(previousDistanceRef.current);
        setIsSavingDistance(false);
        triggerHaptic('warning');
        toast.error(
          'Update Failed',
          'Could not save your distance preference. Please try again.'
        );
      }
    }, DEBOUNCE_DELAY);
  }, []);

  const handleMinAgeChange = useCallback((value: number[]) => {
    const newValue = Math.round(value[0]);
    // Ensure min is always less than max with 1 year gap
    if (newValue >= maxAge) return;

    setMinAge(newValue);
    setShowAgeSaved(false);
    setIsSavingAge(true);

    if (ageDebounceRef.current) {
      clearTimeout(ageDebounceRef.current);
    }
    if (ageSavedTimeoutRef.current) {
      clearTimeout(ageSavedTimeoutRef.current);
    }

    ageDebounceRef.current = setTimeout(async () => {
      try {
        await updateAgeRange(newValue, maxAge);
        previousMinAgeRef.current = newValue;
        setIsSavingAge(false);
        setShowAgeSaved(true);
        triggerHaptic('success');

        ageSavedTimeoutRef.current = setTimeout(() => {
          setShowAgeSaved(false);
        }, SAVE_INDICATOR_DURATION);
      } catch (err) {
        console.error('Failed to update age range:', err);
        setMinAge(previousMinAgeRef.current);
        setIsSavingAge(false);
        triggerHaptic('warning');
        toast.error(
          'Update Failed',
          'Could not save your age preference. Please try again.'
        );
      }
    }, DEBOUNCE_DELAY);
  }, [maxAge]);

  const handleMaxAgeChange = useCallback((value: number[]) => {
    const newValue = Math.round(value[0]);
    // Ensure max is always greater than min with 1 year gap
    if (newValue <= minAge) return;

    setMaxAge(newValue);
    setShowAgeSaved(false);
    setIsSavingAge(true);

    if (ageDebounceRef.current) {
      clearTimeout(ageDebounceRef.current);
    }
    if (ageSavedTimeoutRef.current) {
      clearTimeout(ageSavedTimeoutRef.current);
    }

    ageDebounceRef.current = setTimeout(async () => {
      try {
        await updateAgeRange(minAge, newValue);
        previousMaxAgeRef.current = newValue;
        setIsSavingAge(false);
        setShowAgeSaved(true);
        triggerHaptic('success');

        ageSavedTimeoutRef.current = setTimeout(() => {
          setShowAgeSaved(false);
        }, SAVE_INDICATOR_DURATION);
      } catch (err) {
        console.error('Failed to update age range:', err);
        setMaxAge(previousMaxAgeRef.current);
        setIsSavingAge(false);
        triggerHaptic('warning');
        toast.error(
          'Update Failed',
          'Could not save your age preference. Please try again.'
        );
      }
    }, DEBOUNCE_DELAY);
  }, [minAge]);

  // =============================================================================
  // ABOUT HANDLER
  // =============================================================================

  const handleAboutPress = useCallback(() => {
    triggerHaptic('light');
    setShowAboutModal(true);
  }, []);

  // =============================================================================
  // SLIDER STYLES (memoized for performance)
  // Must be defined BEFORE any conditional returns to satisfy React hooks rules
  // =============================================================================

  const sliderThumbStyle = useMemo(() => ({
    width: responsiveStyles.sliderThumbSize,
    height: responsiveStyles.sliderThumbSize,
    borderRadius: responsiveStyles.sliderThumbSize / 2,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: colors.white,
    ...shadows.large,
  }), [responsiveStyles.sliderThumbSize]);

  const sliderTrackStyle = useMemo(() => ({
    height: responsiveStyles.sliderTrackHeight,
    borderRadius: responsiveStyles.sliderTrackHeight / 2,
  }), [responsiveStyles.sliderTrackHeight]);

  // =============================================================================
  // RENDER SUB-SCREENS
  // =============================================================================

  if (activeSubScreen === 'notifications') {
    return <NotificationsScreen onBack={handleBackFromSubScreen} />;
  }
  if (activeSubScreen === 'showme') {
    return <ShowMeScreen onBack={handleBackFromSubScreen} />;
  }
  if (activeSubScreen === 'location') {
    return <LocationScreen onBack={handleBackFromSubScreen} />;
  }
  if (activeSubScreen === 'help') {
    return <HelpSupportScreen onBack={handleBackFromSubScreen} />;
  }
  if (activeSubScreen === 'privacy') {
    return <PrivacyScreen onBack={handleBackFromSubScreen} />;
  }
  if (activeSubScreen === 'security') {
    return <SecurityScreen onBack={handleBackFromSubScreen} />;
  }
  if (activeSubScreen === 'idverification') {
    return <IDVerificationSettingsScreen onBack={handleBackFromSubScreen} />;
  }
  if (activeSubScreen === 'callhistory') {
    return <CallHistoryScreen onBack={handleBackFromSubScreen} />;
  }
  if (activeSubScreen === 'callsettings') {
    return <CallSettingsScreen onBack={handleBackFromSubScreen} />;
  }

  // =============================================================================
  // RENDER LOADING STATE
  // =============================================================================

  if (isLoading) {
    const loadingIconSize = responsiveStyles.isLandscape
      ? Math.min(hp(14), 80)
      : 96;

    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor={colors.gray[50]} />
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={colors.gradient.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.loadingIconContainer,
              {
                width: loadingIconSize,
                height: loadingIconSize,
                borderRadius: loadingIconSize / 2,
              },
            ]}
          >
            <ActivityIndicator size="large" color={colors.white} />
          </LinearGradient>
          <Text
            style={[
              styles.loadingText,
              { fontSize: responsiveStyles.headerTitleSize },
            ]}
          >
            Loading Your Settings
          </Text>
          <Text
            style={[
              styles.loadingSubtext,
              { fontSize: responsiveStyles.bodyTextSize },
            ]}
          >
            Please wait a moment...
          </Text>
        </View>
      </View>
    );
  }

  // =============================================================================
  // RENDER MAIN SCREEN
  // =============================================================================

  const backButtonSize = responsiveStyles.touchTargetSize;
  const headerIconSize = responsiveStyles.isLandscape
    ? Math.min(hp(6), 44)
    : 48;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          opacity: fadeAnim,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* ===== RESPONSIVE HEADER ===== */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: responsiveStyles.screenMargin,
            paddingVertical: responsiveStyles.isLandscape
              ? Math.min(hp(2), spacing.m)
              : spacing.m,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              width: backButtonSize,
              height: backButtonSize,
              borderRadius: backButtonSize / 2,
            },
          ]}
          onPress={() => {
            triggerHaptic('light');
            onBack();
          }}
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel="Go back"
          accessibilityHint="Double tap to return to the previous screen"
          accessibilityRole="button"
        >
          <Feather
            name="arrow-left"
            size={responsiveStyles.iconSize}
            color={colors.gray[700]}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleSection}>
          <LinearGradient
            colors={colors.gradient.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.headerIconGradient,
              {
                width: headerIconSize,
                height: headerIconSize,
                borderRadius: headerIconSize / 2,
              },
            ]}
          >
            <Feather
              name="settings"
              size={responsiveStyles.isLandscape ? 20 : 24}
              color={colors.white}
            />
          </LinearGradient>
          <Text
            style={[
              styles.headerTitle,
              { fontSize: responsiveStyles.headerTitleSize },
            ]}
          >
            Settings
          </Text>
        </View>

        {/* Placeholder for header balance */}
        <View style={{ width: backButtonSize }} />
      </View>

      {/* ===== SCROLLABLE CONTENT ===== */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: responsiveStyles.screenMargin,
            paddingBottom: insets.bottom + (responsiveStyles.isLandscape ? 80 : 140),
            gap: responsiveStyles.sectionGap,
          },
          responsiveStyles.maxContentWidth && {
            alignSelf: 'center',
            width: '100%',
            maxWidth: responsiveStyles.maxContentWidth,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== ACCOUNT SETTINGS SECTION ===== */}
        <View style={styles.section}>
          <SectionHeader
            icon="user"
            title="Account Settings"
            subtitle={responsiveStyles.isLandscape ? "Manage account" : "Manage your account preferences"}
            responsiveStyles={responsiveStyles}
            gradientColors={colors.gradient.primaryButton}
          />
          <View style={styles.sectionContent}>
            <SettingItem
              icon="bell"
              iconBackgroundColor={colors.orange[50]}
              iconColor={colors.orange[500]}
              title="Notifications"
              subtitle={responsiveStyles.isLandscape ? "Alerts and reminders" : "Manage alerts and reminders"}
              onPress={() => handleNavigateToSubSetting('notifications')}
              accessibilityHint="Double tap to manage your notification preferences"
              responsiveStyles={responsiveStyles}
            />
            <SettingItem
              icon="shield"
              iconBackgroundColor={colors.teal[50]}
              iconColor={colors.teal[500]}
              title="Privacy"
              subtitle={responsiveStyles.isLandscape ? "Profile visibility" : "Control who can see your profile"}
              onPress={() => handleNavigateToSubSetting('privacy')}
              accessibilityHint="Double tap to manage your privacy settings"
              responsiveStyles={responsiveStyles}
            />
            <SettingItem
              icon="lock"
              iconBackgroundColor={colors.pink[50]}
              iconColor={colors.pink[500]}
              title="Security"
              subtitle={responsiveStyles.isLandscape ? "Password and login" : "Password and login options"}
              onPress={() => handleNavigateToSubSetting('security')}
              accessibilityHint="Double tap to manage your security settings"
              responsiveStyles={responsiveStyles}
            />
            <SettingItem
              icon="user-check"
              iconBackgroundColor="#E8F5E9"
              iconColor="#4CAF50"
              title="ID Verification"
              subtitle={responsiveStyles.isLandscape ? "Verify identity" : "Verify your identity for trust"}
              onPress={() => handleNavigateToSubSetting('idverification')}
              accessibilityHint="Double tap to manage your ID verification"
              responsiveStyles={responsiveStyles}
              badge="Verified"
              badgeColor="#4CAF50"
            />
            <SettingItem
              icon="phone"
              iconBackgroundColor={colors.teal[50]}
              iconColor={colors.teal[600]}
              title="Call History"
              subtitle={responsiveStyles.isLandscape ? "Past calls" : "View your past calls"}
              onPress={() => handleNavigateToSubSetting('callhistory')}
              accessibilityHint="Double tap to view your call history"
              responsiveStyles={responsiveStyles}
            />
            <SettingItem
              icon="sliders"
              iconBackgroundColor={colors.orange[50]}
              iconColor={colors.orange[600]}
              title="Call Settings"
              subtitle={responsiveStyles.isLandscape ? "Audio and video" : "Audio and video preferences"}
              onPress={() => handleNavigateToSubSetting('callsettings')}
              showBorder={false}
              accessibilityHint="Double tap to manage call settings"
              responsiveStyles={responsiveStyles}
            />
          </View>
        </View>

        {/* ===== DISCOVERY SETTINGS SECTION ===== */}
        <View style={styles.section}>
          <SectionHeader
            icon="compass"
            title="Discovery Settings"
            subtitle={responsiveStyles.isLandscape ? "Who you see" : "Control who you see and who sees you"}
            responsiveStyles={responsiveStyles}
            gradientColors={colors.gradient.likeButton}
          />
          <View style={styles.sectionContent}>
            <SettingItem
              icon="eye"
              iconBackgroundColor={colors.romantic.blush}
              iconColor={colors.romantic.pink}
              title="Show Me"
              subtitle={responsiveStyles.isLandscape ? "Who appears in feed" : "Choose who appears in your feed"}
              onPress={() => handleNavigateToSubSetting('showme')}
              accessibilityHint="Double tap to choose who you want to see"
              responsiveStyles={responsiveStyles}
            />
            <SettingItem
              icon="map-pin"
              iconBackgroundColor="#E3F2FD"
              iconColor="#2196F3"
              title="Location"
              subtitle={responsiveStyles.isLandscape ? "Search location" : "Set your search location"}
              onPress={() => handleNavigateToSubSetting('location')}
              showBorder={false}
              accessibilityHint="Double tap to set your location"
              responsiveStyles={responsiveStyles}
            />
          </View>
        </View>

        {/* ===== DISTANCE PREFERENCE SECTION ===== */}
        <View style={styles.section}>
          <SectionHeader
            icon="navigation"
            title="Distance Preference"
            subtitle={responsiveStyles.isLandscape ? "Search radius" : "How far to search for matches"}
            responsiveStyles={responsiveStyles}
            gradientColors={colors.gradient.primaryButton}
          />
          <View
            style={[
              styles.sliderSection,
              {
                paddingHorizontal: responsiveStyles.cardPadding,
                paddingVertical: responsiveStyles.isLandscape
                  ? Math.min(hp(2.5), spacing.m)
                  : spacing.l,
              },
            ]}
          >
            {/* Save Indicator */}
            <SaveIndicator
              visible={isSavingDistance || showDistanceSaved}
              saving={isSavingDistance}
              responsiveStyles={responsiveStyles}
            />

            <View style={styles.sliderValueContainer}>
              <SliderValueBadge
                value={`${distancePreference} km`}
                responsiveStyles={responsiveStyles}
                color="orange"
              />
            </View>

            <View
              style={[
                styles.sliderWrapper,
                { marginBottom: responsiveStyles.isLandscape ? spacing.s : spacing.m },
              ]}
              accessible={true}
              accessibilityLabel={`Distance preference slider. Current value: ${distancePreference} kilometers`}
              accessibilityHint="Drag left or right to change the search distance"
              accessibilityRole="adjustable"
              accessibilityValue={{
                min: MIN_DISTANCE,
                max: MAX_DISTANCE,
                now: distancePreference,
                text: `${distancePreference} kilometers`,
              }}
            >
              <Slider
                containerStyle={{
                  width: '100%',
                  height: responsiveStyles.sliderHeight,
                }}
                value={[distancePreference]}
                minimumValue={MIN_DISTANCE}
                maximumValue={MAX_DISTANCE}
                step={1}
                onValueChange={handleDistanceChange}
                minimumTrackTintColor={colors.orange[500]}
                maximumTrackTintColor={colors.gray[200]}
                thumbTintColor={colors.orange[500]}
                thumbStyle={sliderThumbStyle}
                trackStyle={sliderTrackStyle}
              />
            </View>

            <View style={styles.sliderLabelsRow}>
              <Text
                style={[
                  styles.sliderLabelText,
                  { fontSize: responsiveStyles.smallTextSize },
                ]}
              >
                {MIN_DISTANCE} km
              </Text>
              <Text
                style={[
                  styles.sliderLabelText,
                  { fontSize: responsiveStyles.smallTextSize },
                ]}
              >
                {MAX_DISTANCE} km
              </Text>
            </View>

            <Text
              style={[
                styles.sliderDescription,
                {
                  fontSize: responsiveStyles.smallTextSize,
                  lineHeight: responsiveStyles.smallTextSize * 1.5,
                },
              ]}
            >
              {responsiveStyles.isLandscape
                ? `Showing people within ${distancePreference}km`
                : `Show people within ${distancePreference} kilometers of your location`
              }
            </Text>
          </View>
        </View>

        {/* ===== AGE RANGE SECTION ===== */}
        <View style={styles.section}>
          <SectionHeader
            icon="calendar"
            title="Age Range"
            subtitle={responsiveStyles.isLandscape ? "Preferred ages" : "Set the age range you prefer"}
            responsiveStyles={responsiveStyles}
            gradientColors={colors.gradient.likeButton}
          />
          <View
            style={[
              styles.sliderSection,
              {
                paddingHorizontal: responsiveStyles.cardPadding,
                paddingVertical: responsiveStyles.isLandscape
                  ? Math.min(hp(2.5), spacing.m)
                  : spacing.l,
              },
            ]}
          >
            {/* Save Indicator */}
            <SaveIndicator
              visible={isSavingAge || showAgeSaved}
              saving={isSavingAge}
              responsiveStyles={responsiveStyles}
            />

            <View style={styles.sliderValueContainer}>
              <SliderValueBadge
                value={`${minAge} - ${maxAge} years`}
                responsiveStyles={responsiveStyles}
                color="teal"
              />
            </View>

            {/* Minimum Age Slider */}
            <View
              style={[
                styles.ageSliderGroup,
                { marginBottom: responsiveStyles.isLandscape ? spacing.m : spacing.l },
              ]}
            >
              <SliderLabel
                label="Minimum Age"
                value={minAge}
                color={colors.teal[600]}
                fontSize={responsiveStyles.bodyTextSize}
              />
              <View
                style={[
                  styles.sliderWrapper,
                  { marginBottom: spacing.xs },
                ]}
                accessible={true}
                accessibilityLabel={`Minimum age slider. Current value: ${minAge} years`}
                accessibilityHint="Drag left or right to change the minimum age"
                accessibilityRole="adjustable"
                accessibilityValue={{
                  min: MIN_AGE,
                  max: MAX_AGE,
                  now: minAge,
                  text: `${minAge} years`,
                }}
              >
                <Slider
                  containerStyle={{
                    width: '100%',
                    height: responsiveStyles.sliderHeight,
                  }}
                  value={[minAge]}
                  minimumValue={MIN_AGE}
                  maximumValue={MAX_AGE - 1}
                  step={1}
                  onValueChange={handleMinAgeChange}
                  minimumTrackTintColor={colors.teal[500]}
                  maximumTrackTintColor={colors.gray[200]}
                  thumbTintColor={colors.teal[500]}
                  thumbStyle={sliderThumbStyle}
                  trackStyle={sliderTrackStyle}
                />
              </View>
            </View>

            {/* Maximum Age Slider */}
            <View
              style={[
                styles.ageSliderGroup,
                { marginBottom: responsiveStyles.isLandscape ? spacing.m : spacing.l },
              ]}
            >
              <SliderLabel
                label="Maximum Age"
                value={maxAge}
                color={colors.teal[600]}
                fontSize={responsiveStyles.bodyTextSize}
              />
              <View
                style={[
                  styles.sliderWrapper,
                  { marginBottom: spacing.xs },
                ]}
                accessible={true}
                accessibilityLabel={`Maximum age slider. Current value: ${maxAge} years`}
                accessibilityHint="Drag left or right to change the maximum age"
                accessibilityRole="adjustable"
                accessibilityValue={{
                  min: MIN_AGE,
                  max: MAX_AGE,
                  now: maxAge,
                  text: `${maxAge} years`,
                }}
              >
                <Slider
                  containerStyle={{
                    width: '100%',
                    height: responsiveStyles.sliderHeight,
                  }}
                  value={[maxAge]}
                  minimumValue={MIN_AGE + 1}
                  maximumValue={MAX_AGE}
                  step={1}
                  onValueChange={handleMaxAgeChange}
                  minimumTrackTintColor={colors.teal[500]}
                  maximumTrackTintColor={colors.gray[200]}
                  thumbTintColor={colors.teal[500]}
                  thumbStyle={sliderThumbStyle}
                  trackStyle={sliderTrackStyle}
                />
              </View>
            </View>

            <View style={styles.sliderLabelsRow}>
              <Text
                style={[
                  styles.sliderLabelText,
                  { fontSize: responsiveStyles.smallTextSize },
                ]}
              >
                {MIN_AGE} years
              </Text>
              <Text
                style={[
                  styles.sliderLabelText,
                  { fontSize: responsiveStyles.smallTextSize },
                ]}
              >
                {MAX_AGE} years
              </Text>
            </View>

            <Text
              style={[
                styles.sliderDescription,
                {
                  fontSize: responsiveStyles.smallTextSize,
                  lineHeight: responsiveStyles.smallTextSize * 1.5,
                },
              ]}
            >
              {responsiveStyles.isLandscape
                ? `Showing ages ${minAge}-${maxAge}`
                : `Show people between ${minAge} and ${maxAge} years old`
              }
            </Text>
          </View>
        </View>

        {/* ===== SUPPORT & ABOUT SECTION ===== */}
        <View style={styles.section}>
          <SectionHeader
            icon="help-circle"
            title="Support & About"
            subtitle={responsiveStyles.isLandscape ? "Get help" : "Get help or learn more"}
            responsiveStyles={responsiveStyles}
            gradientColors={colors.gradient.ctaButton}
          />
          <View style={styles.sectionContent}>
            <SettingItem
              icon="headphones"
              iconBackgroundColor={colors.teal[50]}
              iconColor={colors.teal[500]}
              title="Help & Support"
              subtitle={responsiveStyles.isLandscape ? "Contact us" : "Get help or contact us"}
              onPress={() => handleNavigateToSubSetting('help')}
              accessibilityHint="Double tap to get help and support"
              responsiveStyles={responsiveStyles}
            />
            <SettingItem
              icon="info"
              iconBackgroundColor={colors.gray[100]}
              iconColor={colors.gray[600]}
              title="About TANDER"
              subtitle="Version 1.0.0"
              onPress={handleAboutPress}
              showBorder={false}
              accessibilityHint="Double tap to see app information"
              responsiveStyles={responsiveStyles}
            />
          </View>
        </View>

        {/* ===== LOG OUT BUTTON ===== */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                minHeight: responsiveStyles.touchTargetSize + 8,
              },
            ]}
            onPress={handleLogout}
            activeOpacity={0.8}
            accessible={true}
            accessibilityLabel="Log out of TANDER"
            accessibilityHint="Double tap to log out of your account"
            accessibilityRole="button"
          >
            <View style={styles.logoutButtonContent}>
              <View style={styles.logoutIconContainer}>
                <Feather
                  name="log-out"
                  size={responsiveStyles.iconSize}
                  color="#DC2626"
                />
              </View>
              <Text
                style={[
                  styles.logoutButtonText,
                  { fontSize: responsiveStyles.bodyTextSize },
                ]}
              >
                Log Out
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ===== DELETE ACCOUNT BUTTON ===== */}
        <TouchableOpacity
          style={[
            styles.deleteAccountButton,
            { minHeight: responsiveStyles.touchTargetSize },
          ]}
          onPress={handleDeleteAccountPress}
          accessible={true}
          accessibilityLabel="Delete your account"
          accessibilityHint="Double tap to start the account deletion process. This action is permanent."
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.deleteAccountButtonText,
              { fontSize: responsiveStyles.smallTextSize },
            ]}
          >
            Delete Account
          </Text>
        </TouchableOpacity>

        {/* Footer spacing */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ===== ABOUT MODAL ===== */}
      <AboutModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        responsiveStyles={responsiveStyles}
      />

      {/* ===== DELETE ACCOUNT CONFIRMATION MODAL ===== */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDeleteAccount}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={handleCancelDeleteAccount}
          />
          <View
            style={[
              styles.modalContent,
              {
                maxWidth: responsiveStyles.modalMaxWidth,
                padding: responsiveStyles.isLandscape
                  ? Math.min(hp(3.5), spacing.l)
                  : spacing.xl,
                marginHorizontal: responsiveStyles.screenMargin,
              },
            ]}
          >
            {/* Warning Icon */}
            <View style={styles.modalIconContainer}>
              <View
                style={[
                  styles.modalWarningIcon,
                  {
                    width: responsiveStyles.isLandscape ? 72 : 96,
                    height: responsiveStyles.isLandscape ? 72 : 96,
                    borderRadius: responsiveStyles.isLandscape ? 36 : 48,
                  },
                ]}
              >
                <Feather
                  name="alert-triangle"
                  size={responsiveStyles.isLandscape ? 36 : 48}
                  color="#DC2626"
                />
              </View>
            </View>

            {/* Modal Title */}
            <Text
              style={[
                styles.modalTitle,
                { fontSize: responsiveStyles.headerTitleSize - 2 },
              ]}
            >
              Delete Your Account?
            </Text>
            <Text
              style={[
                styles.modalDescription,
                {
                  fontSize: responsiveStyles.smallTextSize,
                  lineHeight: responsiveStyles.smallTextSize * 1.6,
                  marginBottom: responsiveStyles.isLandscape ? spacing.m : spacing.l,
                },
              ]}
            >
              {responsiveStyles.isLandscape
                ? 'This permanently deletes your profile, matches, and messages.'
                : 'This will permanently delete your profile, matches, messages, and all data. This action cannot be undone.'
              }
            </Text>

            {/* Password Input */}
            <View
              style={[
                styles.modalInputContainer,
                { marginBottom: responsiveStyles.isLandscape ? spacing.m : spacing.l },
              ]}
            >
              <Text
                style={[
                  styles.modalInputLabel,
                  { fontSize: responsiveStyles.smallTextSize },
                ]}
              >
                Enter your password to confirm
              </Text>
              <View style={styles.modalPasswordInputWrapper}>
                <TextInput
                  style={[
                    styles.modalPasswordInput,
                    {
                      height: responsiveStyles.inputHeight,
                      fontSize: responsiveStyles.bodyTextSize,
                    },
                  ]}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Your password"
                  placeholderTextColor={colors.gray[400]}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isDeletingAccount}
                  accessible={true}
                  accessibilityLabel="Password input"
                  accessibilityHint="Enter your password to confirm account deletion"
                />
                <TouchableOpacity
                  style={[
                    styles.passwordToggle,
                    {
                      width: touchTargets.standard,
                      height: touchTargets.standard,
                    },
                  ]}
                  onPress={() => setShowPassword(!showPassword)}
                  accessible={true}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color={colors.gray[500]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.modalCancelButton,
                  { height: responsiveStyles.touchTargetSize },
                ]}
                onPress={handleCancelDeleteAccount}
                disabled={isDeletingAccount}
                accessible={true}
                accessibilityLabel="Cancel"
                accessibilityHint="Double tap to cancel and keep your account"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.modalCancelButtonText,
                    { fontSize: responsiveStyles.bodyTextSize },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalDeleteButton,
                  { height: responsiveStyles.touchTargetSize },
                  isDeletingAccount && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirmDeleteAccount}
                disabled={isDeletingAccount}
                accessible={true}
                accessibilityLabel="Delete account"
                accessibilityHint="Double tap to permanently delete your account"
                accessibilityRole="button"
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.modalDeleteButtonText,
                      { fontSize: responsiveStyles.bodyTextSize },
                    ]}
                  >
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Animated.View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // ===== CONTAINER =====
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },

  // ===== LOADING STATE =====
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.l,
    ...shadows.large,
  },
  loadingText: {
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  loadingSubtext: {
    fontWeight: '400',
    color: colors.gray[500],
    textAlign: 'center',
  },

  // ===== HEADER =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    ...shadows.small,
  },
  backButton: {
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  headerIconGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.gray[900],
  },

  // ===== SCROLL VIEW =====
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.m,
  },

  // ===== SECTION =====
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...shadows.medium,
  },

  // ===== SECTION HEADER =====
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.orange[100],
    gap: spacing.m,
  },
  sectionHeaderIconWrapper: {
    ...shadows.small,
  },
  sectionHeaderIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderTextContainer: {
    flex: 1,
  },
  sectionHeaderTitle: {
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 2,
  },
  sectionHeaderSubtitle: {
    fontWeight: '400',
    color: colors.gray[600],
  },
  sectionContent: {
    backgroundColor: colors.white,
  },

  // ===== SETTING ITEM =====
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  settingItemPressed: {
    backgroundColor: colors.gray[50],
  },
  settingItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  settingItemIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItemTextContainer: {
    flex: 1,
    paddingRight: spacing.s,
  },
  settingItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: 4,
  },
  settingItemTitle: {
    fontWeight: '600',
    color: colors.gray[900],
  },
  settingItemBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
  },
  settingItemBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  settingItemSubtitle: {
    fontWeight: '400',
    color: colors.gray[500],
  },
  settingItemChevronContainer: {
    paddingLeft: spacing.s,
  },
  chevronBackground: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== SAVE INDICATOR =====
  saveIndicator: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.medium,
    ...shadows.small,
    zIndex: 1,
  },
  saveIndicatorText: {
    fontWeight: '500',
    color: colors.orange[500],
  },
  saveIndicatorTextSuccess: {
    fontWeight: '500',
    color: colors.teal[500],
  },

  // ===== SLIDER SECTION =====
  sliderSection: {
    backgroundColor: colors.white,
    position: 'relative',
  },
  sliderValueContainer: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  sliderValueBadge: {
    borderRadius: borderRadius.large,
    ...shadows.small,
  },
  sliderValueBadgeText: {
    fontWeight: '700',
    color: colors.white,
  },
  sliderWrapper: {},
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
    paddingHorizontal: spacing.xxs,
  },
  sliderLabelText: {
    fontWeight: '600',
    color: colors.gray[400],
  },
  sliderDescription: {
    fontWeight: '400',
    color: colors.gray[600],
    textAlign: 'center',
  },
  sliderLabelContainer: {
    marginBottom: spacing.xs,
  },
  sliderLabelValue: {
    fontWeight: '700',
  },

  // ===== AGE SLIDER GROUP =====
  ageSliderGroup: {},
  ageSliderLabel: {
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  ageSliderValue: {
    color: colors.teal[600],
    fontWeight: '700',
  },

  // ===== ACTION SECTION =====
  actionSection: {
    marginTop: spacing.xs,
  },

  // ===== LOG OUT BUTTON =====
  logoutButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m,
  },
  logoutIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontWeight: '700',
    color: '#DC2626',
  },

  // ===== DELETE ACCOUNT BUTTON =====
  deleteAccountButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.m,
    marginBottom: spacing.l,
  },
  deleteAccountButtonText: {
    fontWeight: '600',
    color: colors.gray[400],
    textDecorationLine: 'underline',
  },

  // ===== ABOUT MODAL =====
  aboutModalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge,
    alignItems: 'center',
    ...shadows.large,
  },
  aboutLogoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
    ...shadows.medium,
  },
  aboutTitle: {
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  aboutVersionBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.m,
  },
  aboutVersionText: {
    fontWeight: '600',
    color: colors.gray[600],
  },
  aboutDescription: {
    fontWeight: '400',
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.m,
  },
  aboutTagline: {
    fontWeight: '600',
    fontStyle: 'italic',
    color: colors.orange[500],
    textAlign: 'center',
    marginBottom: spacing.l,
  },
  aboutCloseButton: {
    width: '100%',
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },
  aboutCloseButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.m,
  },
  aboutCloseButtonText: {
    fontWeight: '700',
    color: colors.white,
  },

  // ===== MODAL =====
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge,
    width: '100%',
    ...shadows.large,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  modalWarningIcon: {
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  modalDescription: {
    fontWeight: '400',
    color: colors.gray[600],
    textAlign: 'center',
  },
  modalInputContainer: {},
  modalInputLabel: {
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  modalPasswordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  modalPasswordInput: {
    flex: 1,
    paddingHorizontal: spacing.m,
    fontWeight: '400',
    color: colors.gray[900],
  },
  passwordToggle: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  modalCancelButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.medium,
  },
  modalCancelButtonText: {
    fontWeight: '700',
    color: colors.gray[700],
  },
  modalDeleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: borderRadius.medium,
  },
  modalDeleteButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
});

export default SettingsScreen;
