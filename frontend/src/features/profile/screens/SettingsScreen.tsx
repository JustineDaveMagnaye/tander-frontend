/**
 * TANDER Settings Screen - Premium iOS Design
 *
 * Super premium iPhone-style UI/UX following Apple's Human Interface Guidelines.
 * Clean, minimal, elegant - inspired by iOS Settings and App Store design.
 *
 * Design Features:
 * - iOS System Settings-style grouped lists
 * - SF-style typography and spacing
 * - Subtle shadows and clean separators
 * - Premium glassmorphism effects
 * - Smooth animations
 * - Senior-friendly touch targets (56-64px)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
// iOS DESIGN SYSTEM
// =============================================================================

const iOS = {
  colors: {
    // Backgrounds
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',

    // Labels
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C4399',
    quaternaryLabel: '#3C3C432E',

    // Fills
    systemFill: '#78788033',
    secondarySystemFill: '#78788028',
    tertiarySystemFill: '#7676801F',
    quaternarySystemFill: '#74748014',

    // Separators
    separator: '#3C3C4336',
    opaqueSeparator: '#C6C6C8',

    // System Colors
    systemBlue: '#007AFF',
    systemGreen: '#34C759',
    systemOrange: '#FF9500',
    systemRed: '#FF3B30',
    systemTeal: '#5AC8FA',
    systemPink: '#FF2D55',
    systemPurple: '#AF52DE',
    systemYellow: '#FFCC00',
    systemGray: '#8E8E93',
    systemGray2: '#AEAEB2',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',

    // Brand
    tander: {
      orange: '#F97316',
      orangeLight: '#FFF7ED',
      teal: '#14B8A6',
      tealLight: '#F0FDFA',
    },
  },

  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24,
    section: 35,
  },

  radius: {
    small: 8,
    medium: 10,
    large: 12,
    xlarge: 16,
    round: 9999,
  },

  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
    subhead: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
    caption1: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
    caption2: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },
  },
};

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

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_AGE = 60;
const MAX_AGE = 100;
const MIN_DISTANCE = 1;
const MAX_DISTANCE = 100;
const DEBOUNCE_DELAY = 800;
const SAVE_INDICATOR_DURATION = 2000;

// Haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'warning' = 'light') => {
  if (Platform.OS === 'ios') {
    switch (type) {
      case 'light': Vibration.vibrate(10); break;
      case 'medium': Vibration.vibrate(20); break;
      case 'success': Vibration.vibrate([0, 30, 50, 30]); break;
      case 'warning': Vibration.vibrate([0, 50, 100, 50]); break;
    }
  } else if (Platform.OS === 'android') {
    Vibration.vibrate(type === 'success' ? 50 : type === 'warning' ? 100 : 20);
  }
};

// =============================================================================
// iOS STYLE COMPONENTS
// =============================================================================

/**
 * iOS-style Section Header - Uppercase, gray, small text
 */
const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
}> = React.memo(({ title, subtitle }) => (
  <View style={iosStyles.sectionHeader}>
    <Text style={iosStyles.sectionHeaderText}>{title.toUpperCase()}</Text>
    {subtitle && <Text style={iosStyles.sectionHeaderSubtext}>{subtitle}</Text>}
  </View>
));

SectionHeader.displayName = 'SectionHeader';

/**
 * iOS-style Section Footer - Small gray text
 */
const SectionFooter: React.FC<{ text: string }> = React.memo(({ text }) => (
  <View style={iosStyles.sectionFooter}>
    <Text style={iosStyles.sectionFooterText}>{text}</Text>
  </View>
));

SectionFooter.displayName = 'SectionFooter';

/**
 * iOS-style Settings Row - Clean, minimal
 */
const SettingsRow: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  value?: string;
  badge?: string;
  badgeColor?: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  destructive?: boolean;
}> = React.memo(({
  icon,
  iconColor,
  iconBgColor,
  title,
  value,
  badge,
  badgeColor = iOS.colors.systemGreen,
  onPress,
  isFirst = false,
  isLast = false,
  destructive = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    triggerHaptic('light');
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={({ pressed }) => [
          iosStyles.row,
          isFirst && iosStyles.rowFirst,
          isLast && iosStyles.rowLast,
          pressed && iosStyles.rowPressed,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${title}${value ? `, ${value}` : ''}`}
      >
        {/* Icon */}
        <View style={[iosStyles.rowIcon, { backgroundColor: iconBgColor }]}>
          <Feather name={icon} size={18} color={iconColor} />
        </View>

        {/* Content */}
        <View style={[iosStyles.rowContent, !isLast && iosStyles.rowContentBorder]}>
          <Text style={[
            iosStyles.rowTitle,
            destructive && { color: iOS.colors.systemRed },
          ]}>
            {title}
          </Text>

          <View style={iosStyles.rowRight}>
            {badge && (
              <View style={[iosStyles.badge, { backgroundColor: badgeColor }]}>
                <Text style={iosStyles.badgeText}>{badge}</Text>
              </View>
            )}
            {value && (
              <Text style={iosStyles.rowValue}>{value}</Text>
            )}
            <Feather name="chevron-right" size={20} color={iOS.colors.systemGray3} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

SettingsRow.displayName = 'SettingsRow';

/**
 * iOS-style Card Container
 */
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={iosStyles.card}>{children}</View>
);

/**
 * Premium Slider with iOS styling
 */
const PremiumSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  color: string;
  onChange: (value: number[]) => void;
  isSaving?: boolean;
  showSaved?: boolean;
}> = React.memo(({
  label,
  value,
  min,
  max,
  unit,
  color,
  onChange,
  isSaving,
  showSaved,
}) => (
  <View style={iosStyles.sliderContainer}>
    {/* Header with value */}
    <View style={iosStyles.sliderHeader}>
      <Text style={iosStyles.sliderLabel}>{label}</Text>
      <View style={iosStyles.sliderValueRow}>
        {(isSaving || showSaved) && (
          <View style={iosStyles.saveStatus}>
            {isSaving ? (
              <ActivityIndicator size="small" color={color} />
            ) : (
              <Feather name="check" size={14} color={iOS.colors.systemGreen} />
            )}
          </View>
        )}
        <View style={[iosStyles.sliderValueBadge, { backgroundColor: color }]}>
          <Text style={iosStyles.sliderValueText}>{value}{unit}</Text>
        </View>
      </View>
    </View>

    {/* Slider */}
    <Slider
      containerStyle={iosStyles.slider}
      value={[value]}
      minimumValue={min}
      maximumValue={max}
      step={1}
      onValueChange={onChange}
      minimumTrackTintColor={color}
      maximumTrackTintColor={iOS.colors.systemGray5}
      thumbTintColor={color}
      thumbStyle={iosStyles.sliderThumb}
      trackStyle={iosStyles.sliderTrack}
    />

    {/* Range labels */}
    <View style={iosStyles.sliderRange}>
      <Text style={iosStyles.sliderRangeText}>{min}{unit}</Text>
      <Text style={iosStyles.sliderRangeText}>{max}{unit}</Text>
    </View>
  </View>
));

PremiumSlider.displayName = 'PremiumSlider';

/**
 * Dual Slider for Age Range
 */
const AgeRangeSlider: React.FC<{
  minAge: number;
  maxAge: number;
  onMinChange: (value: number[]) => void;
  onMaxChange: (value: number[]) => void;
  isSaving?: boolean;
  showSaved?: boolean;
}> = React.memo(({
  minAge,
  maxAge,
  onMinChange,
  onMaxChange,
  isSaving,
  showSaved,
}) => (
  <View style={iosStyles.sliderContainer}>
    {/* Header with value */}
    <View style={iosStyles.sliderHeader}>
      <Text style={iosStyles.sliderLabel}>Age Range</Text>
      <View style={iosStyles.sliderValueRow}>
        {(isSaving || showSaved) && (
          <View style={iosStyles.saveStatus}>
            {isSaving ? (
              <ActivityIndicator size="small" color={iOS.colors.tander.teal} />
            ) : (
              <Feather name="check" size={14} color={iOS.colors.systemGreen} />
            )}
          </View>
        )}
        <View style={[iosStyles.sliderValueBadge, { backgroundColor: iOS.colors.tander.teal }]}>
          <Text style={iosStyles.sliderValueText}>{minAge} - {maxAge} years</Text>
        </View>
      </View>
    </View>

    {/* Min Age Slider */}
    <View style={iosStyles.dualSliderRow}>
      <Text style={iosStyles.dualSliderLabel}>Min</Text>
      <Slider
        containerStyle={iosStyles.dualSlider}
        value={[minAge]}
        minimumValue={MIN_AGE}
        maximumValue={MAX_AGE - 1}
        step={1}
        onValueChange={onMinChange}
        minimumTrackTintColor={iOS.colors.tander.teal}
        maximumTrackTintColor={iOS.colors.systemGray5}
        thumbTintColor={iOS.colors.tander.teal}
        thumbStyle={iosStyles.sliderThumb}
        trackStyle={iosStyles.sliderTrack}
      />
      <Text style={iosStyles.dualSliderValue}>{minAge}</Text>
    </View>

    {/* Max Age Slider */}
    <View style={iosStyles.dualSliderRow}>
      <Text style={iosStyles.dualSliderLabel}>Max</Text>
      <Slider
        containerStyle={iosStyles.dualSlider}
        value={[maxAge]}
        minimumValue={MIN_AGE + 1}
        maximumValue={MAX_AGE}
        step={1}
        onValueChange={onMaxChange}
        minimumTrackTintColor={iOS.colors.tander.teal}
        maximumTrackTintColor={iOS.colors.systemGray5}
        thumbTintColor={iOS.colors.tander.teal}
        thumbStyle={iosStyles.sliderThumb}
        trackStyle={iosStyles.sliderTrack}
      />
      <Text style={iosStyles.dualSliderValue}>{maxAge}</Text>
    </View>
  </View>
));

AgeRangeSlider.displayName = 'AgeRangeSlider';

/**
 * Premium About Modal - iOS Sheet Style
 */
const AboutModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = React.memo(({ visible, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <Pressable style={iosStyles.modalBackdrop} onPress={onClose}>
      <View style={iosStyles.aboutModal}>
        {/* App Icon */}
        <LinearGradient
          colors={[iOS.colors.tander.orange, iOS.colors.tander.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={iosStyles.aboutAppIcon}
        >
          <Feather name="heart" size={40} color="#FFF" />
        </LinearGradient>

        {/* App Name */}
        <Text style={iosStyles.aboutTitle}>TANDER</Text>

        {/* Version Badge */}
        <View style={iosStyles.aboutVersionBadge}>
          <Text style={iosStyles.aboutVersionText}>Version 1.0.0</Text>
        </View>

        {/* Description */}
        <Text style={iosStyles.aboutDescription}>
          {'TANDER is a senior-focused digital companion platform aimed at promoting social interaction, emotional well-being, and meaningful connections among elderly users. It provides a secure, intuitive, and senior-friendly mobile application where users can socialize, communicate, build friendships, and explore companionship opportunities.'}
        </Text>

        {/* Tagline */}
        <Text style={iosStyles.aboutTagline}>Where Meaningful Connections Begin</Text>

        {/* Close Button */}
        <Pressable
          style={({ pressed }) => [
            iosStyles.aboutCloseBtn,
            pressed && { opacity: 0.8 },
          ]}
          onPress={onClose}
        >
          <Text style={iosStyles.aboutCloseBtnText}>Done</Text>
        </Pressable>
      </View>
    </Pressable>
  </Modal>
));

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
  const { isTablet, isLandscape } = useResponsive();

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

  // Debounce refs
  const distanceDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const ageDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const distanceSavedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ageSavedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active sub-screen
  const [activeSubScreen, setActiveSubScreen] = useState<SubSettingType>(null);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Previous values for rollback
  const previousDistanceRef = useRef(distancePreference);
  const previousMinAgeRef = useRef(minAge);
  const previousMaxAgeRef = useRef(maxAge);

  // Reduced motion
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await getDiscoverySettings();
        setDistancePreference(settings.distancePreference);
        setMinAge(settings.minAge);
        setMaxAge(settings.maxAge);

        previousDistanceRef.current = settings.distancePreference;
        previousMinAgeRef.current = settings.minAge;
        previousMaxAgeRef.current = settings.maxAge;

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
        toast.error('Unable to Load Settings', 'Please check your connection.');
        fadeAnim.setValue(1);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();

    return () => {
      if (distanceDebounceRef.current) clearTimeout(distanceDebounceRef.current);
      if (ageDebounceRef.current) clearTimeout(ageDebounceRef.current);
      if (distanceSavedTimeoutRef.current) clearTimeout(distanceSavedTimeoutRef.current);
      if (ageSavedTimeoutRef.current) clearTimeout(ageSavedTimeoutRef.current);
    };
  }, [fadeAnim, reduceMotion]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleNavigateToSubSetting = useCallback((setting: SubSettingType) => {
    triggerHaptic('light');
    setActiveSubScreen(setting);
    onNavigateToSubSetting?.(setting);
  }, [onNavigateToSubSetting]);

  const handleBackFromSubScreen = useCallback(() => {
    setActiveSubScreen(null);
  }, []);

  const handleLogout = useCallback(() => {
    triggerHaptic('medium');
    setShowLogoutModal(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    setIsLoggingOut(true);
    triggerHaptic('success');
    try {
      await onLogout?.();
    } catch (error) {
      console.warn('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  }, [onLogout]);

  const handleDeleteAccountPress = useCallback(() => {
    triggerHaptic('warning');
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your profile, matches, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
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
      toast.warning('Password Required', 'Please enter your password to confirm.');
      return;
    }

    try {
      setIsDeletingAccount(true);
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
      setDeletePassword('');
      triggerHaptic('success');
      toast.success('Account Deleted', 'Your account has been permanently deleted.');
      setTimeout(() => onLogout?.(), 1500);
    } catch (err) {
      console.error('Failed to delete account:', err);
      triggerHaptic('warning');
      toast.error('Delete Failed', 'Please check your password and try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  }, [deletePassword, onLogout]);

  const handleCancelDeleteAccount = useCallback(() => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setShowPassword(false);
  }, []);

  // Distance slider handler
  const handleDistanceChange = useCallback((value: number[]) => {
    const newValue = Math.round(value[0]);
    setDistancePreference(newValue);
    setShowDistanceSaved(false);
    setIsSavingDistance(true);

    if (distanceDebounceRef.current) clearTimeout(distanceDebounceRef.current);
    if (distanceSavedTimeoutRef.current) clearTimeout(distanceSavedTimeoutRef.current);

    distanceDebounceRef.current = setTimeout(async () => {
      try {
        await updateDistancePreference(newValue);
        previousDistanceRef.current = newValue;
        setIsSavingDistance(false);
        setShowDistanceSaved(true);
        triggerHaptic('success');

        distanceSavedTimeoutRef.current = setTimeout(() => {
          setShowDistanceSaved(false);
        }, SAVE_INDICATOR_DURATION);
      } catch (err) {
        console.error('Failed to update distance:', err);
        setDistancePreference(previousDistanceRef.current);
        setIsSavingDistance(false);
        triggerHaptic('warning');
        toast.error('Update Failed', 'Could not save your distance preference.');
      }
    }, DEBOUNCE_DELAY);
  }, []);

  // Age slider handlers
  const handleMinAgeChange = useCallback((value: number[]) => {
    const newValue = Math.round(value[0]);
    if (newValue >= maxAge) return;

    setMinAge(newValue);
    setShowAgeSaved(false);
    setIsSavingAge(true);

    if (ageDebounceRef.current) clearTimeout(ageDebounceRef.current);
    if (ageSavedTimeoutRef.current) clearTimeout(ageSavedTimeoutRef.current);

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
        toast.error('Update Failed', 'Could not save your age preference.');
      }
    }, DEBOUNCE_DELAY);
  }, [maxAge]);

  const handleMaxAgeChange = useCallback((value: number[]) => {
    const newValue = Math.round(value[0]);
    if (newValue <= minAge) return;

    setMaxAge(newValue);
    setShowAgeSaved(false);
    setIsSavingAge(true);

    if (ageDebounceRef.current) clearTimeout(ageDebounceRef.current);
    if (ageSavedTimeoutRef.current) clearTimeout(ageSavedTimeoutRef.current);

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
        toast.error('Update Failed', 'Could not save your age preference.');
      }
    }, DEBOUNCE_DELAY);
  }, [minAge]);

  // =============================================================================
  // RENDER SUB-SCREENS
  // =============================================================================

  if (activeSubScreen === 'notifications') return <NotificationsScreen onBack={handleBackFromSubScreen} />;
  if (activeSubScreen === 'showme') return <ShowMeScreen onBack={handleBackFromSubScreen} />;
  if (activeSubScreen === 'location') return <LocationScreen onBack={handleBackFromSubScreen} />;
  if (activeSubScreen === 'help') return <HelpSupportScreen onBack={handleBackFromSubScreen} />;
  if (activeSubScreen === 'privacy') return <PrivacyScreen onBack={handleBackFromSubScreen} />;
  if (activeSubScreen === 'security') return <SecurityScreen onBack={handleBackFromSubScreen} />;
  if (activeSubScreen === 'idverification') return <IDVerificationSettingsScreen onBack={handleBackFromSubScreen} />;
  if (activeSubScreen === 'callhistory') return <CallHistoryScreen onBack={handleBackFromSubScreen} />;
  if (activeSubScreen === 'callsettings') return <CallSettingsScreen onBack={handleBackFromSubScreen} />;

  // =============================================================================
  // RENDER LOADING STATE
  // =============================================================================

  if (isLoading) {
    return (
      <View style={[iosStyles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={iOS.colors.secondarySystemBackground} />
        <View style={iosStyles.loadingContainer}>
          <ActivityIndicator size="large" color={iOS.colors.systemGray} />
          <Text style={iosStyles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // =============================================================================
  // RENDER MAIN SCREEN
  // =============================================================================

  return (
    <Animated.View
      style={[
        iosStyles.container,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          opacity: fadeAnim,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={iOS.colors.secondarySystemBackground} />

      {/* ===== iOS NAVIGATION BAR ===== */}
      <View style={iosStyles.navbar}>
        <Pressable
          style={({ pressed }) => [
            iosStyles.navBackBtn,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => {
            triggerHaptic('light');
            onBack();
          }}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <Feather name="chevron-left" size={28} color={iOS.colors.tander.orange} />
          <Text style={iosStyles.navBackText}>Profile</Text>
        </Pressable>

        <Text style={iosStyles.navTitle}>Settings</Text>

        <View style={{ width: 80 }} />
      </View>

      {/* ===== SCROLLABLE CONTENT ===== */}
      <ScrollView
        style={iosStyles.scrollView}
        contentContainerStyle={[
          iosStyles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
          isTablet && { maxWidth: isLandscape ? 800 : 600, alignSelf: 'center', width: '100%' },
          !isTablet && isLandscape && { maxWidth: 600, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== ACCOUNT SECTION ===== */}
        <SectionHeader title="Account" />
        <Card>
          <SettingsRow
            icon="bell"
            iconColor="#FFF"
            iconBgColor={iOS.colors.systemRed}
            title="Notifications"
            onPress={() => handleNavigateToSubSetting('notifications')}
            isFirst
          />
          <SettingsRow
            icon="shield"
            iconColor="#FFF"
            iconBgColor={iOS.colors.tander.teal}
            title="Privacy"
            onPress={() => handleNavigateToSubSetting('privacy')}
          />
          <SettingsRow
            icon="lock"
            iconColor="#FFF"
            iconBgColor={iOS.colors.systemGray}
            title="Security"
            onPress={() => handleNavigateToSubSetting('security')}
          />
          <SettingsRow
            icon="user-check"
            iconColor="#FFF"
            iconBgColor={iOS.colors.systemGreen}
            title="ID Verification"
            badge="Verified"
            badgeColor={iOS.colors.systemGreen}
            onPress={() => handleNavigateToSubSetting('idverification')}
            isLast
          />
        </Card>

        {/* ===== CALLS SECTION ===== */}
        <SectionHeader title="Calls" />
        <Card>
          <SettingsRow
            icon="phone"
            iconColor="#FFF"
            iconBgColor={iOS.colors.systemGreen}
            title="Call History"
            onPress={() => handleNavigateToSubSetting('callhistory')}
            isFirst
          />
          <SettingsRow
            icon="sliders"
            iconColor="#FFF"
            iconBgColor={iOS.colors.tander.orange}
            title="Call Settings"
            onPress={() => handleNavigateToSubSetting('callsettings')}
            isLast
          />
        </Card>

        {/* ===== DISCOVERY SECTION ===== */}
        <SectionHeader title="Discovery" />
        <Card>
          <SettingsRow
            icon="eye"
            iconColor="#FFF"
            iconBgColor={iOS.colors.systemPink}
            title="Show Me"
            onPress={() => handleNavigateToSubSetting('showme')}
            isFirst
          />
          <SettingsRow
            icon="map-pin"
            iconColor="#FFF"
            iconBgColor={iOS.colors.systemBlue}
            title="Location"
            onPress={() => handleNavigateToSubSetting('location')}
            isLast
          />
        </Card>

        {/* ===== DISTANCE PREFERENCE ===== */}
        <SectionHeader title="Distance Preference" />
        <Card>
          <PremiumSlider
            label="Maximum Distance"
            value={distancePreference}
            min={MIN_DISTANCE}
            max={MAX_DISTANCE}
            unit=" km"
            color={iOS.colors.tander.orange}
            onChange={handleDistanceChange}
            isSaving={isSavingDistance}
            showSaved={showDistanceSaved}
          />
        </Card>
        <SectionFooter text={`Show people within ${distancePreference} kilometers of your location.`} />

        {/* ===== AGE RANGE ===== */}
        <SectionHeader title="Age Range" />
        <Card>
          <AgeRangeSlider
            minAge={minAge}
            maxAge={maxAge}
            onMinChange={handleMinAgeChange}
            onMaxChange={handleMaxAgeChange}
            isSaving={isSavingAge}
            showSaved={showAgeSaved}
          />
        </Card>
        <SectionFooter text={`Show people between ${minAge} and ${maxAge} years old.`} />

        {/* ===== SUPPORT SECTION ===== */}
        <SectionHeader title="Support" />
        <Card>
          <SettingsRow
            icon="help-circle"
            iconColor="#FFF"
            iconBgColor={iOS.colors.systemPurple}
            title="Help & Support"
            onPress={() => handleNavigateToSubSetting('help')}
            isFirst
          />
          <SettingsRow
            icon="info"
            iconColor="#FFF"
            iconBgColor={iOS.colors.systemGray}
            title="About TANDER"
            value="1.0.0"
            onPress={() => setShowAboutModal(true)}
            isLast
          />
        </Card>

        {/* ===== LOG OUT ===== */}
        <View style={{ marginTop: iOS.spacing.section }}>
          <Card>
            <Pressable
              style={({ pressed }) => [
                iosStyles.logoutRow,
                pressed && iosStyles.rowPressed,
              ]}
              onPress={handleLogout}
              accessibilityLabel="Log out"
              accessibilityRole="button"
            >
              <Feather name="log-out" size={20} color={iOS.colors.systemRed} />
              <Text style={iosStyles.logoutText}>Log Out</Text>
            </Pressable>
          </Card>
        </View>

        {/* ===== DELETE ACCOUNT ===== */}
        <Pressable
          style={({ pressed }) => [
            iosStyles.deleteBtn,
            pressed && { opacity: 0.6 },
          ]}
          onPress={handleDeleteAccountPress}
          accessibilityLabel="Delete account"
          accessibilityRole="button"
        >
          <Text style={iosStyles.deleteBtnText}>Delete Account</Text>
        </Pressable>
      </ScrollView>

      {/* ===== ABOUT MODAL ===== */}
      <AboutModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDeleteAccount}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={iosStyles.modalContainer}
        >
          <Pressable style={iosStyles.modalBackdrop} onPress={handleCancelDeleteAccount} />
          <View style={iosStyles.deleteModal}>
            {/* Warning Icon */}
            <View style={iosStyles.deleteWarningIcon}>
              <Feather name="alert-triangle" size={40} color={iOS.colors.systemRed} />
            </View>

            <Text style={iosStyles.deleteModalTitle}>Delete Account?</Text>
            <Text style={iosStyles.deleteModalDesc}>
              This will permanently delete your profile, matches, and messages.
            </Text>

            {/* Password Input */}
            <View style={iosStyles.deleteInputContainer}>
              <Text style={iosStyles.deleteInputLabel}>Enter your password to confirm</Text>
              <View style={iosStyles.deleteInputWrapper}>
                <TextInput
                  style={iosStyles.deleteInput}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Password"
                  placeholderTextColor={iOS.colors.systemGray3}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isDeletingAccount}
                />
                <Pressable
                  style={iosStyles.deleteEyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={iOS.colors.systemGray}
                  />
                </Pressable>
              </View>
            </View>

            {/* Buttons */}
            <View style={iosStyles.deleteModalBtns}>
              <Pressable
                style={({ pressed }) => [
                  iosStyles.deleteCancelBtn,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleCancelDeleteAccount}
                disabled={isDeletingAccount}
              >
                <Text style={iosStyles.deleteCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  iosStyles.deleteConfirmBtn,
                  pressed && { opacity: 0.8 },
                  isDeletingAccount && { opacity: 0.6 },
                ]}
                onPress={handleConfirmDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={iosStyles.deleteConfirmBtnText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== LOGOUT CONFIRMATION MODAL ===== */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
        statusBarTranslucent
      >
        <View style={iosStyles.modalContainer}>
          <Pressable
            style={iosStyles.modalBackdrop}
            onPress={() => !isLoggingOut && setShowLogoutModal(false)}
          />
          <View style={iosStyles.logoutModal}>
            {/* Logout Icon */}
            <View style={iosStyles.logoutIconContainer}>
              <Feather name="log-out" size={32} color={iOS.colors.systemRed} />
            </View>

            <Text style={iosStyles.logoutModalTitle}>Log Out?</Text>
            <Text style={iosStyles.logoutModalDesc}>
              Are you sure you want to log out of your account?
            </Text>

            {/* Buttons */}
            <View style={iosStyles.logoutModalBtns}>
              <Pressable
                style={({ pressed }) => [
                  iosStyles.logoutCancelBtn,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                <Text style={iosStyles.logoutCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  iosStyles.logoutConfirmBtn,
                  pressed && { opacity: 0.8 },
                  isLoggingOut && { opacity: 0.6 },
                ]}
                onPress={confirmLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={iosStyles.logoutConfirmBtnText}>Log Out</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

// =============================================================================
// iOS STYLES
// =============================================================================

const iosStyles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    marginTop: iOS.spacing.m,
  },

  // Navigation Bar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  navBackText: {
    ...iOS.typography.body,
    color: iOS.colors.tander.orange,
  },
  navTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: iOS.spacing.l,
    paddingTop: iOS.spacing.s,
  },

  // Section Header
  sectionHeader: {
    paddingTop: iOS.spacing.section,
    paddingBottom: iOS.spacing.s,
    paddingHorizontal: iOS.spacing.l,
  },
  sectionHeaderText: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    letterSpacing: 0.5,
  },
  sectionHeaderSubtext: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
    marginTop: 2,
  },

  // Section Footer
  sectionFooter: {
    paddingHorizontal: iOS.spacing.l,
    paddingTop: iOS.spacing.s,
    paddingBottom: iOS.spacing.xs,
  },
  sectionFooterText: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
  },

  // Card
  card: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    overflow: 'hidden',
  },

  // Settings Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: iOS.spacing.l,
    minHeight: 56,
    backgroundColor: iOS.colors.systemBackground,
  },
  rowFirst: {
    borderTopLeftRadius: iOS.radius.large,
    borderTopRightRadius: iOS.radius.large,
  },
  rowLast: {
    borderBottomLeftRadius: iOS.radius.large,
    borderBottomRightRadius: iOS.radius.large,
  },
  rowPressed: {
    backgroundColor: iOS.colors.systemGray6,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: iOS.spacing.m,
    paddingRight: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
  },
  rowContentBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },
  rowTitle: {
    ...iOS.typography.body,
    color: iOS.colors.label,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    ...iOS.typography.caption2,
    color: '#FFF',
    fontWeight: '600',
  },

  // Slider
  sliderContainer: {
    padding: iOS.spacing.l,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: iOS.spacing.l,
  },
  sliderLabel: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  sliderValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveStatus: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderValueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sliderValueText: {
    ...iOS.typography.subhead,
    color: '#FFF',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 44,
  },
  sliderThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: iOS.spacing.s,
  },
  sliderRangeText: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
  },

  // Dual Slider (Age Range)
  dualSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: iOS.spacing.m,
  },
  dualSliderLabel: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    minWidth: 75,
    marginRight: iOS.spacing.s,
  },
  dualSlider: {
    flex: 1,
    height: 44,
  },
  dualSliderValue: {
    ...iOS.typography.subhead,
    color: iOS.colors.tander.teal,
    fontWeight: '600',
    minWidth: 36,
    marginLeft: iOS.spacing.s,
    textAlign: 'right',
  },

  // Logout
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: iOS.spacing.l,
    borderRadius: iOS.radius.large,
  },
  logoutText: {
    ...iOS.typography.body,
    color: iOS.colors.systemRed,
    fontWeight: '500',
  },

  // Delete Button
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: iOS.spacing.xl,
    marginTop: iOS.spacing.m,
  },
  deleteBtnText: {
    ...iOS.typography.footnote,
    color: iOS.colors.systemGray,
  },

  // Modal Backdrop
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // About Modal
  aboutModal: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.xlarge,
    padding: iOS.spacing.xxl,
    marginHorizontal: iOS.spacing.xl,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  aboutAppIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.l,
  },
  aboutTitle: {
    ...iOS.typography.title1,
    color: iOS.colors.label,
    marginBottom: iOS.spacing.s,
  },
  aboutVersionBadge: {
    backgroundColor: iOS.colors.systemGray6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: iOS.spacing.l,
  },
  aboutVersionText: {
    ...iOS.typography.caption1,
    color: iOS.colors.secondaryLabel,
    fontWeight: '500',
  },
  aboutDescription: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
    marginBottom: iOS.spacing.m,
    lineHeight: 22,
  },
  aboutTagline: {
    ...iOS.typography.footnote,
    color: iOS.colors.tander.orange,
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: iOS.spacing.xl,
  },
  aboutCloseBtn: {
    width: '100%',
    backgroundColor: iOS.colors.tander.orange,
    paddingVertical: iOS.spacing.m,
    borderRadius: iOS.radius.medium,
    alignItems: 'center',
  },
  aboutCloseBtnText: {
    ...iOS.typography.headline,
    color: '#FFF',
  },

  // Delete Modal
  deleteModal: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.xlarge,
    padding: iOS.spacing.xxl,
    marginHorizontal: iOS.spacing.xl,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  deleteWarningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.l,
  },
  deleteModalTitle: {
    ...iOS.typography.title2,
    color: iOS.colors.label,
    marginBottom: iOS.spacing.s,
  },
  deleteModalDesc: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
    marginBottom: iOS.spacing.xl,
    lineHeight: 22,
  },
  deleteInputContainer: {
    width: '100%',
    marginBottom: iOS.spacing.xl,
  },
  deleteInputLabel: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    marginBottom: iOS.spacing.s,
  },
  deleteInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iOS.colors.systemGray6,
    borderRadius: iOS.radius.medium,
    borderWidth: 1,
    borderColor: iOS.colors.systemGray5,
  },
  deleteInput: {
    flex: 1,
    paddingHorizontal: iOS.spacing.m,
    paddingVertical: iOS.spacing.m,
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  deleteEyeBtn: {
    padding: iOS.spacing.m,
  },
  deleteModalBtns: {
    flexDirection: 'row',
    gap: iOS.spacing.m,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    backgroundColor: iOS.colors.systemGray6,
    paddingVertical: iOS.spacing.m,
    borderRadius: iOS.radius.medium,
    alignItems: 'center',
  },
  deleteCancelBtnText: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: iOS.colors.systemRed,
    paddingVertical: iOS.spacing.m,
    borderRadius: iOS.radius.medium,
    alignItems: 'center',
  },
  deleteConfirmBtnText: {
    ...iOS.typography.headline,
    color: '#FFF',
  },

  // Logout Modal
  logoutModal: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.xlarge,
    padding: iOS.spacing.xxl,
    marginHorizontal: iOS.spacing.xl,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  logoutIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.l,
  },
  logoutModalTitle: {
    ...iOS.typography.title2,
    color: iOS.colors.label,
    marginBottom: iOS.spacing.s,
  },
  logoutModalDesc: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
    marginBottom: iOS.spacing.xl,
    lineHeight: 22,
  },
  logoutModalBtns: {
    flexDirection: 'row',
    gap: iOS.spacing.m,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    backgroundColor: iOS.colors.systemGray6,
    paddingVertical: iOS.spacing.m,
    borderRadius: iOS.radius.medium,
    alignItems: 'center',
  },
  logoutCancelBtnText: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  logoutConfirmBtn: {
    flex: 1,
    backgroundColor: iOS.colors.systemRed,
    paddingVertical: iOS.spacing.m,
    borderRadius: iOS.radius.medium,
    alignItems: 'center',
  },
  logoutConfirmBtnText: {
    ...iOS.typography.headline,
    color: '#FFF',
  },
});

export default SettingsScreen;
