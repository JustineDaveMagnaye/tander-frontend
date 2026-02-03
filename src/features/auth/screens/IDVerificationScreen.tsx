/**
 * TANDER ID Verification Screen - Premium Edition
 * Step 4 of 4: Final verification with celebratory feel
 *
 * Design Philosophy:
 * - Premium gradient backgrounds matching WelcomeScreen aesthetic
 * - Glassmorphism cards with floating hearts decoration
 * - CELEBRATORY feel - this is the final step!
 * - Senior-friendly with large touch targets (56-64px)
 * - Smooth entrance animations respecting reduce motion
 * - 100% responsive across all devices
 * - WCAG AA/AAA compliant contrast ratios
 *
 * Key Features:
 * - Premium coral-to-teal gradient background
 * - Floating hearts decoration with animations
 * - Decorative background circles
 * - Glassmorphic card containers
 * - Large, accessible photo upload areas
 * - Visual success feedback
 * - Celebration animation on completion
 * - Progress indicator (Step 4 of 4 - FINAL STEP)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  Image,
  Alert,
  AccessibilityInfo,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import { AuthStackParamList } from '@navigation/types';
import { useAuthStore, selectCurrentUsername } from '@store/authStore';
import { submitIdVerification } from '@/services/api/authApi';
import { Text } from '@shared/components';

type IDScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'IDVerification'>;
type IDScreenRouteProp = RouteProp<AuthStackParamList, 'IDVerification'>;

interface Props {
  navigation: IDScreenNavProp;
  route: IDScreenRouteProp;
}

// ============================================================================
// PREMIUM COLOR PALETTE - Matching WelcomeScreen and LoadingScreen
// ============================================================================
const PREMIUM_COLORS = {
  gradientTop: '#FF8A65',      // Warm coral-orange
  gradientMiddle: '#FF7043',   // Deeper coral
  gradientBottom: '#26A69A',   // Trust-inspiring teal

  glassWhite: 'rgba(255, 255, 255, 0.95)',
  glassTint: 'rgba(255, 255, 255, 0.12)',
  glassCard: 'rgba(255, 255, 255, 0.98)',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.92)',

  heartPink: 'rgba(255, 107, 138, 0.6)',
  warmGlow: 'rgba(255, 183, 77, 0.3)',
  successGreen: '#10B981',
} as const;

// ============================================================================
// ANIMATION TIMING
// ============================================================================
const ANIMATION_TIMING = {
  headerFade: 600,
  cardEntrance: 500,
  heartFloat: 3500,
  celebration: 1200,
} as const;

// ============================================================================
// FLOATING HEART DECORATION COMPONENT
// ============================================================================
interface FloatingHeartProps {
  size: number;
  positionX: number;
  positionY: number;
  delay: number;
  reduceMotion: boolean;
}

const FloatingHeart: React.FC<FloatingHeartProps> = ({
  size,
  positionX,
  positionY,
  delay,
  reduceMotion,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(0.3);
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: ANIMATION_TIMING.heartFloat,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: ANIMATION_TIMING.heartFloat,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const timer = setTimeout(() => floatLoop.start(), delay);

    return () => {
      clearTimeout(timer);
      floatLoop.stop();
    };
  }, [floatAnim, fadeAnim, delay, reduceMotion]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const opacity = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${positionX}%`,
        top: `${positionY}%`,
        opacity,
        transform: [{ translateY }],
      }}
      pointerEvents="none"
    >
      <View
        style={{
          width: size + 10,
          height: size + 10,
          borderRadius: (size + 10) / 2,
          backgroundColor: 'rgba(255, 107, 138, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255, 107, 138, 0.2)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Feather name="heart" size={size} color={PREMIUM_COLORS.heartPink} />
      </View>
    </Animated.View>
  );
};

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================
interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  isTablet: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, isTablet }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={{ marginBottom: spacing.l, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.s }}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <Animated.View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: isCompleted
                    ? colors.teal[500]
                    : isActive
                      ? colors.orange[500]
                      : colors.gray[300],
                  borderWidth: isActive ? 2 : 0,
                  borderColor: colors.orange[200],
                  transform: isActive ? [{ scale: pulseAnim }] : undefined,
                }}
              >
                {isCompleted && (
                  <Text style={{ color: colors.white, fontSize: 8, fontWeight: '700' }}>
                    ✓
                  </Text>
                )}
                {isActive && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.white,
                    }}
                  />
                )}
              </Animated.View>
              {stepNumber < totalSteps && (
                <View
                  style={{
                    width: 40,
                    height: 3,
                    backgroundColor: isCompleted ? colors.teal[500] : colors.gray[300],
                    marginHorizontal: spacing.xs,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <Text
        style={{
          color: colors.gray[700],
          fontWeight: '700',
          fontSize: isTablet ? 16 : 15,
        }}
      >
        Step {currentStep} of {totalSteps}: Final Verification
      </Text>
      <Text
        style={{
          color: colors.orange[600],
          fontWeight: '600',
          fontSize: isTablet ? 14 : 13,
          marginTop: 4,
        }}
      >
        Almost there!
      </Text>
    </View>
  );
};

// ============================================================================
// PRIMARY BUTTON COMPONENT
// ============================================================================
interface PrimaryButtonProps {
  title: string;
  loadingTitle: string;
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
  height: number;
  fontSize: number;
  icon?: keyof typeof Feather.glyphMap;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  loadingTitle,
  onPress,
  loading,
  disabled = false,
  height,
  fontSize,
  icon = 'arrow-right',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 150,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 10,
    }).start();
  };

  const isDisabled = loading || disabled;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={{
          borderRadius: 9999,
          overflow: 'hidden',
          ...shadows.large,
          opacity: isDisabled && !loading ? 0.5 : 1,
        }}
        accessibilityRole="button"
        accessibilityLabel={loading ? loadingTitle : title}
        accessibilityState={{ disabled: isDisabled }}
      >
        <LinearGradient
          colors={
            isDisabled && !loading
              ? ['#D1D5DB', '#C7CBD1']
              : colors.gradient.primaryButton
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            height,
            minHeight: 56,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: spacing.s,
            paddingHorizontal: spacing.xl,
          }}
        >
          {loading && (
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.3)',
                borderTopColor: colors.white,
              }}
            />
          )}
          <Text style={{ color: colors.white, fontWeight: '700', fontSize }}>
            {loading ? loadingTitle : title}
          </Text>
          {!loading && <Feather name={icon} size={fontSize + 2} color={colors.white} />}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

// ============================================================================
// PHOTO UPLOAD CARD COMPONENT
// ============================================================================
interface PhotoUploadCardProps {
  label: string;
  photo: ImagePicker.ImagePickerAsset | null;
  onPick: () => void;
  onRemove: () => void;
  required?: boolean;
  buttonHeight: number;
  fontSize: number;
  disabled?: boolean;
}

const PhotoUploadCard: React.FC<PhotoUploadCardProps> = ({
  label,
  photo,
  onPick,
  onRemove,
  required = false,
  buttonHeight,
  fontSize,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (photo) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [photo, scaleAnim]);

  return (
    <View style={{ marginBottom: spacing.l }}>
      <Text
        style={{
          color: colors.gray[700],
          fontWeight: '700',
          fontSize,
          marginBottom: spacing.s,
        }}
      >
        {label} {required && <Text style={{ color: colors.semantic.error }}>*</Text>}
      </Text>

      {photo ? (
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            position: 'relative',
            borderRadius: borderRadius.large,
            overflow: 'hidden',
            ...shadows.medium,
          }}
        >
          <Image
            source={{ uri: photo.uri }}
            style={{
              width: '100%',
              height: 200,
              borderRadius: borderRadius.large,
              backgroundColor: colors.gray[100],
            }}
            resizeMode="cover"
          />
          <Pressable
            onPress={onRemove}
            style={{
              position: 'absolute',
              top: spacing.s,
              right: spacing.s,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.semantic.error,
              justifyContent: 'center',
              alignItems: 'center',
              ...shadows.small,
            }}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label.toLowerCase()}`}
          >
            <Feather name="x" size={24} color={colors.white} />
          </Pressable>
          {/* Success checkmark */}
          <View
            style={{
              position: 'absolute',
              bottom: spacing.m,
              left: spacing.m,
              backgroundColor: PREMIUM_COLORS.successGreen,
              paddingHorizontal: spacing.m,
              paddingVertical: spacing.s,
              borderRadius: borderRadius.medium,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              ...shadows.small,
            }}
          >
            <Feather name="check-circle" size={16} color={colors.white} />
            <Text style={{ color: colors.white, fontWeight: '700', fontSize: 13 }}>
              Photo uploaded
            </Text>
          </View>
        </Animated.View>
      ) : (
        <Pressable
          onPress={onPick}
          disabled={disabled}
          style={{
            height: buttonHeight + 60,
            borderWidth: 2,
            borderColor: colors.gray[300],
            borderStyle: 'dashed',
            borderRadius: borderRadius.large,
            backgroundColor: colors.gray[50],
            justifyContent: 'center',
            alignItems: 'center',
            opacity: disabled ? 0.5 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Upload ${label.toLowerCase()}`}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.orange[100],
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.m,
            }}
          >
            <Feather name="camera" size={32} color={colors.orange[500]} />
          </View>
          <Text
            style={{
              color: colors.teal[600],
              fontWeight: '700',
              fontSize,
              marginBottom: spacing.xs,
            }}
          >
            Tap to Upload
          </Text>
          <Text style={{ color: colors.gray[500], fontSize: fontSize - 2 }}>
            Choose from gallery
          </Text>
        </Pressable>
      )}
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const IDVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    width,
    height,
    isLandscape,
    isTablet,
    isSmallScreen,
    wp,
    hp,
  } = useResponsive();

  // Get username from route or store
  const storeUsername = useAuthStore(selectCurrentUsername);
  const username = route.params?.username || storeUsername || '';

  // Auth store
  const scannedIdFront = useAuthStore((state) => state.scannedIdFront);
  const scannedIdBack = useAuthStore((state) => state.scannedIdBack);
  const clearScannedId = useAuthStore((state) => state.clearScannedId);

  // State - pre-populate with scanned ID photos if available
  const [frontPhoto, setFrontPhoto] = useState<ImagePicker.ImagePickerAsset | null>(
    scannedIdFront ? { uri: scannedIdFront, width: 0, height: 0 } as ImagePicker.ImagePickerAsset : null
  );
  const [backPhoto, setBackPhoto] = useState<ImagePicker.ImagePickerAsset | null>(
    scannedIdBack ? { uri: scannedIdBack, width: 0, height: 0 } as ImagePicker.ImagePickerAsset : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(40)).current;

  // Responsive sizes
  const titleSize = isLandscape
    ? Math.min(hp(10), wp(6), 38)
    : isTablet
      ? 48
      : 36;
  const subtitleSize = isLandscape
    ? Math.min(hp(4), wp(3), 20)
    : isTablet
      ? 22
      : 19;
  const fontSize = isTablet ? 18 : 16;
  const buttonHeight = isTablet ? 68 : 60;
  const buttonFontSize = isTablet ? 20 : 18;
  const maxFormWidth = isTablet ? 600 : 500;
  const heartSize = isTablet ? 28 : 22;

  // Decorative circle sizes
  const decorCircleLarge = isTablet ? 350 : isLandscape ? 200 : 280;
  const decorCircleMedium = isTablet ? 250 : isLandscape ? 140 : 200;
  const decorCircleSmall = isTablet ? 150 : isLandscape ? 90 : 130;

  const canVerify = !!frontPhoto && !loading;

  // Check for reduce motion preference
  useEffect(() => {
    const checkReduceMotion = async () => {
      const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReduceMotion(isEnabled);
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  // Entrance animations
  useEffect(() => {
    if (reduceMotion) {
      headerOpacity.setValue(1);
      cardOpacity.setValue(1);
      cardTranslateY.setValue(0);
      return;
    }

    Animated.stagger(150, [
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: ANIMATION_TIMING.headerFade,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: ANIMATION_TIMING.cardEntrance,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [reduceMotion, headerOpacity, cardOpacity, cardTranslateY]);

  // Request photo permissions
  const requestPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Needed',
        'We need access to your photos to upload your ID. Please enable it in Settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Pick front photo
  const pickFrontPhoto = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFrontPhoto(result.assets[0]);
        setError('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        AccessibilityInfo.announceForAccessibility('Front ID photo selected');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not select photo. Please try again.');
    }
  }, []);

  // Pick back photo
  const pickBackPhoto = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setBackPhoto(result.assets[0]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        AccessibilityInfo.announceForAccessibility('Back ID photo selected');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not select photo. Please try again.');
    }
  }, []);

  // Remove photos
  const removeFrontPhoto = useCallback(() => {
    setFrontPhoto(null);
    Haptics.selectionAsync();
    AccessibilityInfo.announceForAccessibility('Front ID photo removed');
  }, []);

  const removeBackPhoto = useCallback(() => {
    setBackPhoto(null);
    Haptics.selectionAsync();
    AccessibilityInfo.announceForAccessibility('Back ID photo removed');
  }, []);

  // Handle verification
  const handleVerify = useCallback(async () => {
    if (!frontPhoto) {
      setError('Please upload a photo of the front of your ID');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert photos to blobs for API
      const frontBlob = await fetch(frontPhoto.uri).then((r) => r.blob());
      let backBlob: Blob | undefined;
      if (backPhoto) {
        backBlob = await fetch(backPhoto.uri).then((r) => r.blob());
      }

      // Call the ID verification API (no selfie - liveness done on frontend)
      await submitIdVerification(frontBlob, backBlob);

      // Clear scanned ID photos from store after successful verification
      clearScannedId();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility('ID verification submitted successfully');

      // Show success and navigate
      Alert.alert(
        '🎉 Verification Submitted!',
        'Your ID verification is being reviewed. You can now log in and start exploring while we verify your identity.',
        [
          {
            text: 'Continue to Login',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login', params: { registrationComplete: true } }],
              });
            },
          },
        ],
      );
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || 'Verification failed. Please try again.';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [frontPhoto, backPhoto, clearScannedId, navigation]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // Form padding
  const formPadding = isLandscape
    ? isTablet
      ? wp(4)
      : wp(3)
    : isSmallScreen
      ? spacing.m
      : spacing.l;

  // Render form content
  const renderForm = () => (
    <Animated.View
      style={{
        opacity: cardOpacity,
        transform: [{ translateY: cardTranslateY }],
        maxWidth: maxFormWidth,
        alignSelf: 'center',
        width: '100%',
        backgroundColor: PREMIUM_COLORS.glassCard,
        borderRadius: isTablet ? 32 : 24,
        padding: isTablet ? spacing.xl : spacing.l,
        ...shadows.large,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
      }}
    >
      {/* Step Indicator */}
      <StepIndicator currentStep={4} totalSteps={4} isTablet={isTablet} />

      {/* Instructions */}
      <View
        style={{
          backgroundColor: colors.orange[50],
          borderRadius: borderRadius.large,
          padding: spacing.m,
          marginBottom: spacing.l,
          borderWidth: 1,
          borderColor: colors.orange[200],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          <Feather name="shield" size={20} color={colors.orange[600]} />
          <Text
            style={{
              color: colors.orange[700],
              fontWeight: '700',
              fontSize,
              marginLeft: spacing.s,
            }}
          >
            Why we need this
          </Text>
        </View>
        <Text
          style={{
            color: colors.gray[700],
            fontSize: fontSize - 1,
            lineHeight: (fontSize - 1) * 1.5,
          }}
        >
          To keep our community safe and verify you're 60+, we need a photo of your government-issued ID.
        </Text>
      </View>

      {/* Error */}
      {error && (
        <View
          style={{
            backgroundColor: 'rgba(244, 67, 54, 0.08)',
            borderRadius: borderRadius.large,
            padding: spacing.m,
            marginBottom: spacing.l,
            borderWidth: 1,
            borderColor: 'rgba(244, 67, 54, 0.25)',
          }}
          accessibilityRole="alert"
        >
          <Text
            style={{
              color: colors.semantic.error,
              fontWeight: '600',
              fontSize,
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        </View>
      )}

      {/* Front ID */}
      <PhotoUploadCard
        label="Front of ID"
        photo={frontPhoto}
        onPick={pickFrontPhoto}
        onRemove={removeFrontPhoto}
        required
        buttonHeight={buttonHeight}
        fontSize={fontSize}
        disabled={loading}
      />

      {/* Back ID */}
      <PhotoUploadCard
        label="Back of ID (Optional)"
        photo={backPhoto}
        onPick={pickBackPhoto}
        onRemove={removeBackPhoto}
        buttonHeight={buttonHeight}
        fontSize={fontSize}
        disabled={loading}
      />

      {/* Privacy Note */}
      <View
        style={{
          backgroundColor: colors.teal[50],
          borderRadius: borderRadius.medium,
          padding: spacing.m,
          marginBottom: spacing.l,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.s,
        }}
      >
        <Feather name="lock" size={18} color={colors.teal[600]} />
        <Text
          style={{
            flex: 1,
            color: colors.gray[700],
            fontSize: fontSize - 2,
            lineHeight: (fontSize - 2) * 1.4,
          }}
        >
          Your ID is encrypted and secure. We'll never share it with other members.
        </Text>
      </View>

      {/* Verify Button */}
      <PrimaryButton
        title="Complete Verification"
        loadingTitle="Verifying..."
        onPress={handleVerify}
        loading={loading}
        disabled={!canVerify}
        height={buttonHeight}
        fontSize={buttonFontSize}
        icon="check-circle"
      />
    </Animated.View>
  );

  // Landscape Layout
  if (isLandscape) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={Platform.OS === 'android'}
        />

        <LinearGradient
          colors={[
            PREMIUM_COLORS.gradientTop,
            PREMIUM_COLORS.gradientMiddle,
            PREMIUM_COLORS.gradientBottom,
          ]}
          locations={[0, 0.45, 1]}
          style={{ flex: 1 }}
        >
          {/* Decorative circles */}
          <View
            style={{
              position: 'absolute',
              width: decorCircleLarge,
              height: decorCircleLarge,
              borderRadius: decorCircleLarge / 2,
              backgroundColor: PREMIUM_COLORS.glassTint,
              top: -decorCircleLarge * 0.3,
              right: -decorCircleLarge * 0.2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: decorCircleMedium,
              height: decorCircleMedium,
              borderRadius: decorCircleMedium / 2,
              backgroundColor: PREMIUM_COLORS.glassTint,
              top: '40%',
              left: -decorCircleMedium * 0.35,
            }}
          />

          {/* Floating hearts */}
          {!reduceMotion && (
            <>
              <FloatingHeart size={heartSize} positionX={10} positionY={12} delay={0} reduceMotion={reduceMotion} />
              <FloatingHeart size={heartSize * 0.8} positionX={88} positionY={15} delay={300} reduceMotion={reduceMotion} />
              <FloatingHeart size={heartSize * 0.7} positionX={12} positionY={75} delay={600} reduceMotion={reduceMotion} />
            </>
          )}

          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              paddingTop: insets.top + hp(2),
              paddingBottom: insets.bottom + hp(2),
              paddingLeft: insets.left + wp(2),
              paddingRight: insets.right + wp(2),
            }}
          >
            {/* Left Panel - Header */}
            <View style={{ flex: 0.35, justifyContent: 'center', paddingHorizontal: spacing.l }}>
              {navigation.canGoBack() && (
                <Pressable
                  onPress={handleBack}
                  style={{
                    width: 56,
                    height: 56,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: spacing.l,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 2,
                      borderColor: 'rgba(255,255,255,0.3)',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Feather name="chevron-left" size={24} color={PREMIUM_COLORS.textPrimary} />
                  </View>
                </Pressable>
              )}

              <Animated.View style={{ opacity: headerOpacity }}>
                <Text
                  variant="h1"
                  color={PREMIUM_COLORS.textPrimary}
                  style={{
                    fontSize: titleSize,
                    fontWeight: '800',
                    marginBottom: spacing.s,
                    textShadowColor: 'rgba(0, 0, 0, 0.2)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 4,
                  }}
                >
                  Final Step
                </Text>
                <Text
                  variant="bodyLarge"
                  color={PREMIUM_COLORS.textSecondary}
                  style={{
                    fontSize: subtitleSize,
                    fontWeight: '500',
                    lineHeight: subtitleSize * 1.4,
                  }}
                >
                  Verify your identity and you're all set!
                </Text>
              </Animated.View>
            </View>

            {/* Right Panel - Form */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 0.65 }}
            >
              <ScrollView
                contentContainerStyle={{
                  paddingVertical: hp(2),
                  paddingHorizontal: formPadding,
                  flexGrow: 1,
                  justifyContent: 'center',
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {renderForm()}
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Portrait Layout
  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      <LinearGradient
        colors={[
          PREMIUM_COLORS.gradientTop,
          PREMIUM_COLORS.gradientMiddle,
          PREMIUM_COLORS.gradientBottom,
        ]}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {/* Decorative circles */}
        <View
          style={{
            position: 'absolute',
            width: decorCircleLarge,
            height: decorCircleLarge,
            borderRadius: decorCircleLarge / 2,
            backgroundColor: PREMIUM_COLORS.glassTint,
            top: -decorCircleLarge * 0.25,
            right: -decorCircleLarge * 0.2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: decorCircleMedium,
            height: decorCircleMedium,
            borderRadius: decorCircleMedium / 2,
            backgroundColor: PREMIUM_COLORS.glassTint,
            top: '30%',
            left: -decorCircleMedium * 0.3,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: decorCircleSmall,
            height: decorCircleSmall,
            borderRadius: decorCircleSmall / 2,
            backgroundColor: PREMIUM_COLORS.glassTint,
            bottom: '20%',
            right: -decorCircleSmall * 0.2,
          }}
        />

        {/* Floating hearts - extra celebratory for final step! */}
        {!reduceMotion && (
          <>
            <FloatingHeart size={heartSize} positionX={8} positionY={10} delay={0} reduceMotion={reduceMotion} />
            <FloatingHeart size={heartSize * 0.8} positionX={85} positionY={8} delay={400} reduceMotion={reduceMotion} />
            <FloatingHeart size={heartSize * 0.7} positionX={10} positionY={65} delay={700} reduceMotion={reduceMotion} />
            <FloatingHeart size={heartSize * 0.6} positionX={88} positionY={55} delay={500} reduceMotion={reduceMotion} />
            <FloatingHeart size={heartSize * 0.5} positionX={50} positionY={30} delay={900} reduceMotion={reduceMotion} />
          </>
        )}

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + spacing.m,
            paddingBottom: spacing.xl + 16,
            paddingHorizontal: spacing.l,
          }}
        >
          {navigation.canGoBack() && (
            <Pressable
              onPress={handleBack}
              style={{
                width: 56,
                height: 56,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: -spacing.xs,
              }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Feather name="chevron-left" size={24} color={PREMIUM_COLORS.textPrimary} />
              </View>
            </Pressable>
          )}

          <Animated.View style={{ opacity: headerOpacity }}>
            <Text
              variant="h1"
              color={PREMIUM_COLORS.textPrimary}
              style={{
                fontSize: titleSize,
                fontWeight: '800',
                marginTop: spacing.s,
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }}
            >
              Final Step
            </Text>
            <Text
              variant="bodyLarge"
              color={PREMIUM_COLORS.textSecondary}
              style={{
                fontSize: subtitleSize,
                marginTop: spacing.xs,
                fontWeight: '500',
                lineHeight: subtitleSize * 1.4,
              }}
            >
              Verify your identity and you're all set!
            </Text>
          </Animated.View>
        </View>

        {/* Form Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, marginTop: -spacing.m }}
        >
          <ScrollView
            contentContainerStyle={{
              paddingTop: spacing.l,
              paddingHorizontal: formPadding,
              paddingBottom: insets.bottom + spacing.xxl,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderForm()}
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

export default IDVerificationScreen;
