/**
 * TANDER Profile Setup Screen - Super Premium iOS Design
 * Step 3 of 3: Build Your Profile
 *
 * Design Principles:
 * - Clean, minimal iOS aesthetic with SF-style typography
 * - Generous white space and breathing room
 * - Subtle depth with refined shadows
 * - Smooth micro-interactions
 * - WCAG AA accessible
 * - Senior-friendly (56px+ touch targets, 18px+ fonts)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  TextInput,
  Image,
  Alert,
  Platform,
  Animated,
  Easing,
  KeyboardAvoidingView,
  ActivityIndicator,
  AccessibilityInfo,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useResponsive } from '@shared/hooks/useResponsive';
import { completeProfile } from '@services/api';
import { uploadProfilePhoto } from '@services/api/profileApi';
import { useAuthStore, selectCurrentUsername } from '@store/authStore';
import { storage, STORAGE_KEYS } from '@services/storage/asyncStorage';
import { ProfileSetupScreenProps } from './types';
import { FONT_SCALING } from '@shared/styles/fontScaling';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// PREMIUM iOS DESIGN SYSTEM
// ============================================================================
const iOS = {
  colors: {
    // Backgrounds
    background: '#F2F2F7',
    card: '#FFFFFF',

    // Text
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#8E8E93',
    placeholder: '#C7C7CC',

    // System colors
    teal: '#30D5C8',
    tealDark: '#20B2AA',
    tealLight: 'rgba(48, 213, 200, 0.1)',
    orange: '#F97316',
    orangeDark: '#EA580C',
    orangeLight: 'rgba(249, 115, 22, 0.1)',
    red: '#FF3B30',
    green: '#34C759',
    blue: '#007AFF',

    // Separators & borders
    separator: 'rgba(60, 60, 67, 0.12)',
    opaqueSeparator: '#C6C6C8',

    // Fills
    systemFill: 'rgba(120, 120, 128, 0.2)',
    secondaryFill: 'rgba(120, 120, 128, 0.16)',
    tertiaryFill: 'rgba(118, 118, 128, 0.12)',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 100,
  },

  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.4 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.4 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.4 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.3 },
    subhead: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.2 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.1 },
    caption1: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
  },
} as const;

// ============================================================================
// CONSTANTS
// ============================================================================
const GENDER_OPTIONS = [
  { label: 'Male', value: 'Male', icon: 'user' as const },
  { label: 'Female', value: 'Female', icon: 'user' as const },
];

const INTERESTED_OPTIONS = [
  { label: 'Men', value: 'Men', icon: 'users' as const },
  { label: 'Women', value: 'Women', icon: 'users' as const },
  { label: 'Both', value: 'Both', icon: 'heart' as const },
];

const PHILIPPINE_CITIES = [
  'Manila', 'Quezon City', 'Davao City', 'Caloocan', 'Cebu City',
  'Zamboanga City', 'Taguig', 'Antipolo', 'Pasig', 'Cagayan de Oro',
  'Paranaque', 'Dasmarinas', 'Valenzuela', 'Bacoor', 'General Santos',
  'Las Pinas', 'Makati', 'San Jose del Monte', 'Muntinlupa', 'Lapu-Lapu City',
];

// ============================================================================
// STEP INDICATOR COMPONENT - Matching SignUp screen design
// ============================================================================
const STEP_LABELS = ['Account', 'Verify', 'Profile'];

const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({
  currentStep,
  totalSteps
}) => {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          return (
            <React.Fragment key={stepNum}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  isActive && styles.stepCircleActive,
                ]}>
                  {isCompleted ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={[
                      styles.stepNumber,
                      (isCompleted || isActive) && styles.stepNumberActive,
                    ]}>
                      {stepNum}
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.stepLabel,
                  isCompleted && styles.stepLabelCompleted,
                  isActive && styles.stepLabelActive,
                ]}>
                  {STEP_LABELS[index]}
                </Text>
              </View>
              {stepNum < totalSteps && (
                <View style={[
                  styles.stepLine,
                  isCompleted && styles.stepLineCompleted,
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// PHOTO UPLOAD COMPONENT
// ============================================================================
interface PhotoUploadProps {
  photoUri: string | null;
  onPhotoChange: (uri: string | null) => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ photoUri, onPhotoChange }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.alert(
      'Add Photo',
      'Choose how to add your profile photo',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera access is required to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              onPhotoChange(result.assets[0].uri);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Photo library access is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              onPhotoChange(result.assets[0].uri);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [onPhotoChange, scaleAnim]);

  return (
    <View style={styles.photoSection}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable onPress={handlePress} style={styles.photoContainer}>
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
              <View style={styles.photoEditBadge}>
                <Feather name="camera" size={14} color="#FFFFFF" />
              </View>
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Feather name="camera" size={32} color={iOS.colors.tertiaryLabel} />
              <Text style={styles.photoPlaceholderText}>Add Photo</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
      <Text style={styles.photoHint}>Add a photo (optional)</Text>
    </View>
  );
};

// ============================================================================
// INPUT FIELD COMPONENT
// ============================================================================
interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  hint?: string;
  icon: keyof typeof Feather.glyphMap;
  autoFocus?: boolean;
}

const InputField = React.forwardRef<TextInput, InputFieldProps>(({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  icon,
  autoFocus,
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.length > 0;

  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHeader}>
        <View style={[
          styles.fieldIcon,
          (isFocused || hasValue) && styles.fieldIconActive,
        ]}>
          <Feather
            name={icon}
            size={18}
            color={(isFocused || hasValue) ? iOS.colors.orange : iOS.colors.tertiaryLabel}
          />
        </View>
        <View style={styles.fieldLabelContainer}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {hint && <Text style={styles.fieldHint}>{hint}</Text>}
        </View>
      </View>
      <View style={[
        styles.fieldInputContainer,
        isFocused && styles.fieldInputContainerFocused,
        hasValue && !isFocused && styles.fieldInputContainerFilled,
      ]}>
        <TextInput
          ref={ref}
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={iOS.colors.placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus={autoFocus}
          maxFontSizeMultiplier={FONT_SCALING.INPUT}
        />
      </View>
    </View>
  );
});

// ============================================================================
// CHIP SELECTOR COMPONENT
// ============================================================================
interface ChipOption {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
}

interface ChipSelectorProps {
  label: string;
  hint?: string;
  options: ChipOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  icon: keyof typeof Feather.glyphMap;
}

const ChipSelector: React.FC<ChipSelectorProps> = ({
  label,
  hint,
  options,
  selectedValue,
  onSelect,
  icon,
}) => {
  const hasSelection = selectedValue !== '';

  const handleSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(value);
  };

  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHeader}>
        <View style={[
          styles.fieldIcon,
          hasSelection && styles.fieldIconActive,
        ]}>
          <Feather
            name={icon}
            size={18}
            color={hasSelection ? iOS.colors.orange : iOS.colors.tertiaryLabel}
          />
        </View>
        <View style={styles.fieldLabelContainer}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {hint && <Text style={styles.fieldHint}>{hint}</Text>}
        </View>
      </View>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => handleSelect(option.value)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
            >
              <Feather
                name={option.icon}
                size={16}
                color={isSelected ? '#FFFFFF' : iOS.colors.secondaryLabel}
              />
              <Text style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
              ]}>
                {option.label}
              </Text>
              {isSelected && (
                <View style={styles.chipCheck}>
                  <Feather name="check" size={14} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// DATE PICKER COMPONENT
// ============================================================================
interface DatePickerFieldProps {
  label: string;
  hint?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  hint,
  value,
  onChange,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const hasValue = value !== null;

  // Calculate max date (must be 50+ years old)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 50);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPicker(true);
  };

  const handleChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHeader}>
        <View style={[
          styles.fieldIcon,
          hasValue && styles.fieldIconActive,
        ]}>
          <Feather
            name="calendar"
            size={18}
            color={hasValue ? iOS.colors.orange : iOS.colors.tertiaryLabel}
          />
        </View>
        <View style={styles.fieldLabelContainer}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {hint && <Text style={styles.fieldHint}>{hint}</Text>}
        </View>
      </View>

      <Pressable
        onPress={handlePress}
        style={[
          styles.dateButton,
          hasValue && styles.dateButtonFilled,
        ]}
      >
        <Text style={[
          styles.dateButtonText,
          hasValue && styles.dateButtonTextFilled,
        ]}>
          {value ? formatDate(value) : 'Select your birth date'}
        </Text>
        <Feather name="chevron-right" size={20} color={iOS.colors.tertiaryLabel} />
      </Pressable>

      {showPicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={value || maxDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            maximumDate={maxDate}
            minimumDate={new Date(1920, 0, 1)}
          />
          {Platform.OS === 'ios' && (
            <Pressable
              onPress={() => setShowPicker(false)}
              style={styles.datePickerDone}
            >
              <Text style={styles.datePickerDoneText}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

// ============================================================================
// CITY PICKER COMPONENT
// ============================================================================
interface CityPickerProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (city: string) => void;
}

const CityPicker: React.FC<CityPickerProps> = ({
  label,
  hint,
  value,
  onChange,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const hasValue = value !== '';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPicker(true);
  };

  const handleSelectCity = (city: string) => {
    onChange(city);
    setShowPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHeader}>
        <View style={[
          styles.fieldIcon,
          hasValue && styles.fieldIconActive,
        ]}>
          <Feather
            name="map-pin"
            size={18}
            color={hasValue ? iOS.colors.orange : iOS.colors.tertiaryLabel}
          />
        </View>
        <View style={styles.fieldLabelContainer}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {hint && <Text style={styles.fieldHint}>{hint}</Text>}
        </View>
      </View>

      <Pressable
        onPress={handlePress}
        style={[
          styles.dateButton,
          hasValue && styles.dateButtonFilled,
        ]}
      >
        <Text style={[
          styles.dateButtonText,
          hasValue && styles.dateButtonTextFilled,
        ]}>
          {value || 'Select your city'}
        </Text>
        <Feather name="chevron-right" size={20} color={iOS.colors.tertiaryLabel} />
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.cityPickerOverlay}>
          <Pressable style={styles.cityPickerBackdrop} onPress={() => setShowPicker(false)} />
          <View style={styles.cityPickerContainer}>
            <View style={styles.cityPickerHeader}>
              <Text style={styles.cityPickerTitle}>Select City</Text>
              <Pressable onPress={() => setShowPicker(false)} style={styles.cityPickerClose}>
                <Feather name="x" size={24} color={iOS.colors.label} />
              </Pressable>
            </View>
            <ScrollView style={styles.cityList} showsVerticalScrollIndicator={false}>
              {PHILIPPINE_CITIES.map((city) => (
                <Pressable
                  key={city}
                  onPress={() => handleSelectCity(city)}
                  style={[
                    styles.cityItem,
                    value === city && styles.cityItemSelected,
                  ]}
                >
                  <Text style={[
                    styles.cityItemText,
                    value === city && styles.cityItemTextSelected,
                  ]}>
                    {city}
                  </Text>
                  {value === city && (
                    <Feather name="check" size={20} color={iOS.colors.teal} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape } = useResponsive();

  // Get username
  const storeUsername = useAuthStore(selectCurrentUsername);
  const username = route.params?.username || storeUsername || '';

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  const [interestedIn, setInterestedIn] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  // Sizing
  const cardMaxWidth = isTablet ? 480 : SCREEN_WIDTH - 48;

  // Check reduce motion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove();
  }, []);

  // Entrance animation
  useEffect(() => {
    if (reduceMotion) {
      fadeIn.setValue(1);
      slideUp.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [reduceMotion]);

  // Format date for API
  const formatDateToString = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Calculate age from birth date
  const calculateAge = (birthDateValue: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDateValue.getFullYear();
    const monthDiff = today.getMonth() - birthDateValue.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateValue.getDate())) {
      age--;
    }
    return age;
  };

  // Handle continue
  const handleContinue = useCallback(async () => {
    setError(null);

    // Validation
    if (!displayName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please enter your display name');
      return;
    }
    if (!birthDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please select your birth date');
      return;
    }
    if (!gender) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please select your gender');
      return;
    }
    if (!interestedIn) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please select who you\'re interested in');
      return;
    }
    if (!city) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please select your city');
      return;
    }

    setLoading(true);

    try {
      // Convert interestedIn to JSON array format
      let interestedInJson = '["male"]';
      if (interestedIn === 'Women') interestedInJson = '["female"]';
      else if (interestedIn === 'Both') interestedInJson = '["male","female"]';

      const profileResult = await completeProfile(
        {
          username,
          nickName: displayName.trim(),
          firstName: displayName.trim(),
          lastName: '',
          birthDate: formatDateToString(birthDate),
          age: calculateAge(birthDate),
          city: city.trim(),
          country: 'Philippines',
          gender: gender.toLowerCase() as 'male' | 'female',
          interestedIn: interestedInJson,
        },
        true
      );

      // Upload photo if available
      if (photoUri) {
        try {
          await uploadProfilePhoto({
            uri: photoUri,
            type: 'image/jpeg',
            name: 'profile-photo.jpg',
          });
        } catch (photoErr) {
          console.warn('Photo upload failed:', photoErr);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(false);

      // Profile completed - update both store AND storage
      const { useAuthStore } = await import('@store/authStore');
      useAuthStore.setState({ registrationPhase: 'profile_completed', isAuthenticated: false });

      // CRITICAL: Persist to storage so the phase survives app reload
      await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'profile_completed');

      // Navigate to ID Verification (Step 4)
      // Pass username and verificationToken if available
      navigation.navigate('IDVerification', {
        username: username || '',
        verificationToken: profileResult?.verificationToken,
      });
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to save profile. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [displayName, birthDate, gender, interestedIn, city, photoUri, username, navigation]);

  const canContinue = displayName && birthDate && gender && interestedIn && city && !loading;

  // Render form content (shared between portrait and landscape)
  const renderFormContent = () => (
    <>
      {/* Step Indicator */}
      <StepIndicator currentStep={3} totalSteps={4} />

      {/* Photo Upload */}
      <PhotoUpload photoUri={photoUri} onPhotoChange={setPhotoUri} />

      {/* Display Name */}
      <InputField
        label="Display Name *"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="How should we call you?"
        hint="This is how other members will see you"
        icon="user"
      />

      {/* Birth Date */}
      <DatePickerField
        label="Birth Date *"
        hint="Must be 50 years or older"
        value={birthDate}
        onChange={setBirthDate}
      />

      {/* Gender */}
      <ChipSelector
        label="I am a *"
        hint="Select your gender"
        options={GENDER_OPTIONS}
        selectedValue={gender}
        onSelect={setGender}
        icon="user"
      />

      {/* Interested In */}
      <ChipSelector
        label="Looking for *"
        hint="Who would you like to meet?"
        options={INTERESTED_OPTIONS}
        selectedValue={interestedIn}
        onSelect={setInterestedIn}
        icon="heart"
      />

      {/* City */}
      <CityPicker
        label="City *"
        hint="Your location helps find nearby matches"
        value={city}
        onChange={setCity}
      />

      {/* Error Message */}
      {error && (
        <View style={styles.errorBadge}>
          <Feather name="alert-circle" size={16} color={iOS.colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Continue Button */}
      <Pressable
        onPress={handleContinue}
        disabled={!canContinue}
        style={({ pressed }) => [
          styles.continueButton,
          canContinue && styles.continueButtonEnabled,
          pressed && canContinue && styles.continueButtonPressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={[
              styles.continueButtonText,
              canContinue && styles.continueButtonTextEnabled,
            ]}>
              Complete Profile
            </Text>
            <Feather
              name="arrow-right"
              size={20}
              color={canContinue ? '#FFFFFF' : iOS.colors.tertiaryLabel}
            />
          </>
        )}
      </Pressable>

      {/* Trust Badge */}
      <View style={styles.trustBadge}>
        <Feather name="shield" size={14} color={iOS.colors.tertiaryLabel} />
        <Text style={styles.trustText}>Your information is secure</Text>
      </View>
    </>
  );

  // ============================================================================
  // LANDSCAPE LAYOUT - Matching SignUp screen design
  // ============================================================================
  if (isLandscape) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Gradient Background */}
        <LinearGradient
          colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.landscapeContainer, { paddingTop: insets.top }]}>
          {/* Left Panel - Branding */}
          <Animated.View
            style={[
              styles.landscapeLeftPanel,
              {
                paddingLeft: insets.left + iOS.spacing.xl,
                opacity: fadeIn,
              },
            ]}
          >
            <View style={styles.landscapeBranding}>
              {/* Icon */}
              <View style={styles.landscapeIconCircle}>
                <Feather name="user-plus" size={32} color="#FFFFFF" />
              </View>

              <Text style={styles.landscapeTitle} maxFontSizeMultiplier={FONT_SCALING.TITLE}>Let's Meet You</Text>
              <Text style={styles.landscapeSubtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>
                Share a few details so{'\n'}others can find you
              </Text>

              {/* Progress dots for landscape */}
              <View style={styles.landscapeProgress}>
                <View style={[styles.progressDot, styles.progressDotCompleted]} />
                <View style={[styles.progressDot, styles.progressDotCompleted]} />
                <View style={[styles.progressDot, styles.progressDotActive]} />
              </View>
            </View>
          </Animated.View>

          {/* Right Panel - Form */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.landscapeRightPanel, { paddingRight: insets.right + iOS.spacing.xl }]}
          >
            <Animated.View
              style={[
                styles.landscapeCard,
                {
                  opacity: fadeIn,
                  transform: [{ translateY: slideUp }],
                },
              ]}
            >
              <ScrollView
                contentContainerStyle={styles.landscapeScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {renderFormContent()}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </View>
    );
  }

  // ============================================================================
  // PORTRAIT LAYOUT
  // ============================================================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Gradient Background */}
      <LinearGradient
        colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeIn, transform: [{ translateY: slideUp }] },
            ]}
          >
            <Text style={styles.title} maxFontSizeMultiplier={FONT_SCALING.TITLE}>Let's Meet You</Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>
              Share a few details so others can find you
            </Text>
          </Animated.View>

          {/* Main Card */}
          <Animated.View
            style={[
              styles.card,
              { maxWidth: cardMaxWidth, opacity: fadeIn, transform: [{ translateY: slideUp }] },
            ]}
          >
            {renderFormContent()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // Decorative circles
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -80,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -60,
  },

  // Header
  header: {
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: iOS.spacing.xl,
  },
  title: {
    ...iOS.typography.largeTitle,
    color: '#FFFFFF',
    marginBottom: iOS.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    ...iOS.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: iOS.colors.card,
    borderRadius: iOS.radius.xxl,
    padding: iOS.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },

  // Step Indicator - Matching SignUp screen design
  stepContainer: {
    marginBottom: iOS.spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: iOS.colors.tertiaryFill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.xs,
  },
  stepCircleActive: {
    backgroundColor: iOS.colors.orange,
  },
  stepCircleCompleted: {
    backgroundColor: iOS.colors.teal,
  },
  stepNumber: {
    ...iOS.typography.footnote,
    fontWeight: '600',
    color: iOS.colors.tertiaryLabel,
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
  },
  stepLabelActive: {
    color: iOS.colors.orange,
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: iOS.colors.teal,
    fontWeight: '600',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: iOS.colors.separator,
    marginHorizontal: iOS.spacing.sm,
    marginBottom: iOS.spacing.lg,
  },
  stepLineCompleted: {
    backgroundColor: iOS.colors.teal,
  },

  // Photo Upload
  photoSection: {
    alignItems: 'center',
    marginBottom: iOS.spacing.xl,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: iOS.colors.teal,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: iOS.colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: iOS.colors.card,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: iOS.colors.tertiaryFill,
    borderWidth: 2,
    borderColor: iOS.colors.separator,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
    marginTop: iOS.spacing.xs,
  },
  photoHint: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
    marginTop: iOS.spacing.sm,
  },

  // Field Card - Matching SignUp screen InputCard design
  fieldCard: {
    backgroundColor: iOS.colors.card,
    borderRadius: iOS.radius.lg,
    padding: iOS.spacing.md,
    marginBottom: iOS.spacing.md,
    borderWidth: 1,
    borderColor: iOS.colors.separator,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: iOS.spacing.sm,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: iOS.colors.tertiaryFill,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.md,
  },
  fieldIconActive: {
    backgroundColor: iOS.colors.orangeLight,
  },
  fieldLabelContainer: {
    flex: 1,
  },
  fieldLabel: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  fieldHint: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
    marginTop: 2,
  },
  fieldInputContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: iOS.radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fieldInputContainerFocused: {
    borderColor: iOS.colors.orange,
    backgroundColor: iOS.colors.orangeLight,
  },
  fieldInputContainerFilled: {
    backgroundColor: iOS.colors.orangeLight,
  },
  fieldInput: {
    ...iOS.typography.body,
    color: iOS.colors.label,
    paddingHorizontal: iOS.spacing.md,
    paddingVertical: iOS.spacing.md,
    minHeight: 52,
  },

  // Chip Selector - Matching SignUp screen method toggle style
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: iOS.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.lg,
    paddingVertical: iOS.spacing.sm + 4,
    borderRadius: iOS.radius.sm,
    backgroundColor: '#F2F2F7',
    borderWidth: 0,
    gap: iOS.spacing.sm,
  },
  chipSelected: {
    backgroundColor: iOS.colors.orange,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  chipText: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipCheck: {
    marginLeft: iOS.spacing.xs,
  },

  // Date Button - Matching SignUp screen inputWrapper
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: iOS.radius.md,
    paddingHorizontal: iOS.spacing.md,
    paddingVertical: iOS.spacing.md,
    minHeight: 52,
  },
  dateButtonFilled: {
    backgroundColor: iOS.colors.orangeLight,
  },
  dateButtonText: {
    ...iOS.typography.body,
    color: iOS.colors.placeholder,
  },
  dateButtonTextFilled: {
    color: iOS.colors.label,
  },
  datePickerContainer: {
    marginTop: iOS.spacing.sm,
    backgroundColor: iOS.colors.tertiaryFill,
    borderRadius: iOS.radius.md,
    overflow: 'hidden',
  },
  datePickerDone: {
    alignItems: 'flex-end',
    padding: iOS.spacing.md,
    borderTopWidth: 1,
    borderTopColor: iOS.colors.separator,
  },
  datePickerDoneText: {
    ...iOS.typography.headline,
    color: iOS.colors.teal,
  },

  // City Picker
  cityPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cityPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cityPickerContainer: {
    backgroundColor: iOS.colors.card,
    borderTopLeftRadius: iOS.radius.xxl,
    borderTopRightRadius: iOS.radius.xxl,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  cityPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: iOS.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: iOS.colors.separator,
  },
  cityPickerTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  cityPickerClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: iOS.colors.tertiaryFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityList: {
    paddingHorizontal: iOS.spacing.md,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: iOS.spacing.md,
    paddingHorizontal: iOS.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: iOS.colors.separator,
  },
  cityItemSelected: {
    backgroundColor: iOS.colors.orangeLight,
    marginHorizontal: -iOS.spacing.sm,
    paddingHorizontal: iOS.spacing.md,
    borderRadius: iOS.radius.md,
    borderBottomWidth: 0,
  },
  cityItemText: {
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  cityItemTextSelected: {
    color: iOS.colors.orangeDark,
    fontWeight: '600',
  },

  // Error Badge
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iOS.spacing.sm,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingVertical: iOS.spacing.sm + 2,
    paddingHorizontal: iOS.spacing.md,
    borderRadius: iOS.radius.pill,
    marginBottom: iOS.spacing.lg,
  },
  errorText: {
    ...iOS.typography.subhead,
    color: iOS.colors.red,
    fontWeight: '500',
  },

  // Continue Button - Matching SignUp screen pill shape
  continueButton: {
    height: 56,
    borderRadius: iOS.radius.pill,
    backgroundColor: iOS.colors.tertiaryFill,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: iOS.spacing.sm,
    marginTop: iOS.spacing.lg,
    marginBottom: iOS.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  continueButtonEnabled: {
    backgroundColor: iOS.colors.orange,
    shadowColor: iOS.colors.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonPressed: {
    backgroundColor: iOS.colors.orangeDark,
    transform: [{ scale: 0.98 }],
  },
  continueButtonText: {
    ...iOS.typography.headline,
    color: iOS.colors.tertiaryLabel,
  },
  continueButtonTextEnabled: {
    color: '#FFFFFF',
  },

  // Trust Badge
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: iOS.spacing.xs,
  },
  trustText: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
  },

  // ============================================================================
  // LANDSCAPE STYLES - Matching SignUp screen design
  // ============================================================================
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeLeftPanel: {
    width: '35%',
    justifyContent: 'center',
    paddingVertical: iOS.spacing.xl,
  },
  landscapeBranding: {
    alignItems: 'flex-start',
  },
  landscapeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.lg,
  },
  landscapeTitle: {
    ...iOS.typography.title1,
    color: '#FFFFFF',
    marginBottom: iOS.spacing.sm,
  },
  landscapeSubtitle: {
    ...iOS.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
  },
  landscapeProgress: {
    flexDirection: 'row',
    marginTop: iOS.spacing.xxl,
    gap: iOS.spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotCompleted: {
    backgroundColor: iOS.colors.teal,
  },
  progressDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  landscapeRightPanel: {
    flex: 1,
    paddingVertical: iOS.spacing.lg,
  },
  landscapeScrollContent: {
    padding: iOS.spacing.xl,
  },
  landscapeCard: {
    flex: 1,
    backgroundColor: iOS.colors.card,
    borderRadius: iOS.radius.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
});

export default ProfileSetupScreen;
