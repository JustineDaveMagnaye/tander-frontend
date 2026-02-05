/**
 * TANDER ID Scanner Screen - Premium iOS Light Design
 *
 * Orchestrates the verification flow:
 * 1. Selfie (Liveness verification)
 * 2. ID Card scan (Document verification)
 * 3. Preview (Confirmation)
 *
 * Design matching OTPVerificationScreen:
 * - Warm gradient background (coral to teal)
 * - White cards with shadows
 * - Orange primary actions, Teal secondary
 * - Senior-friendly: 56px+ touch targets, 18px+ fonts
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
} from 'react-native-vision-camera';

import { AuthStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { FONT_SCALING } from '@shared/styles/fontScaling';

// Import reusable components
import {
  iOS,
  ScanStep,
  FaceFrame,
  useLivenessVerification,
  IDFrame,
  useIDDocumentScanner,
  CaptureButton,
  IDScannerModals,
} from '../components/idScanner';

// ============================================================================
// TYPES
// ============================================================================
type IDScannerScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'IDScanner'>;
type IDScannerScreenRouteProp = RouteProp<AuthStackParamList, 'IDScanner'>;

interface Props {
  navigation: IDScannerScreenNavProp;
  route: IDScannerScreenRouteProp;
}

// ============================================================================
// FEEDBACK BADGE COMPONENT
// ============================================================================
interface FeedbackBadgeProps {
  type: 'error' | 'success' | 'info' | 'warning';
  message: string;
}

const FeedbackBadge: React.FC<FeedbackBadgeProps> = ({ type, message }) => {
  const config = {
    error: { bg: iOS.colors.redLight, color: iOS.colors.red, icon: 'alert-circle' },
    success: { bg: iOS.colors.greenLight, color: iOS.colors.green, icon: 'check-circle' },
    info: { bg: iOS.colors.tealLight, color: iOS.colors.teal, icon: 'info' },
    warning: { bg: iOS.colors.orangeLight, color: iOS.colors.orange, icon: 'alert-triangle' },
  }[type];

  return (
    <Animated.View style={[styles.feedbackBadge, { backgroundColor: config.bg }]}>
      <Feather name={config.icon as any} size={16} color={config.color} />
      <Text style={[styles.feedbackText, { color: config.color }]} numberOfLines={2} maxFontSizeMultiplier={FONT_SCALING.BODY}>
        {message}
      </Text>
    </Animated.View>
  );
};

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================
const StepIndicator: React.FC<{ currentStep: ScanStep }> = ({ currentStep }) => {
  const steps = [
    { key: 'selfie', label: 'Selfie', icon: 'user' },
    { key: 'front', label: 'ID Card', icon: 'credit-card' },
  ];

  const currentIndex = currentStep === 'selfie' ? 0 : currentStep === 'front' ? 1 : 2;

  return (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => {
        const isComplete = index < currentIndex;
        const isActive = index === currentIndex;

        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  isComplete && styles.stepCircleComplete,
                  isActive && styles.stepCircleActive,
                ]}
              >
                {isComplete ? (
                  <Feather name="check" size={14} color="#FFF" />
                ) : (
                  <Feather
                    name={step.icon as any}
                    size={14}
                    color={isActive ? '#FFF' : iOS.colors.tertiaryLabel}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  (isActive || isComplete) && styles.stepLabelActive,
                ]}
                maxFontSizeMultiplier={FONT_SCALING.CAPTION}
              >
                {step.label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  isComplete && styles.stepLineComplete,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const IDScannerScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const minimumAge = route.params?.minimumAge ?? 60;

  // Camera
  const { hasPermission, requestPermission } = useCameraPermission();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  // Screen state
  const [step, setStep] = useState<ScanStep>('selfie');
  const [frontPhoto, setFrontPhoto] = useState<PhotoFile | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [livenessPassed, setLivenessPassed] = useState(false);

  // Feedback
  const [feedbackType, setFeedbackType] = useState<'error' | 'success' | 'info' | 'warning' | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Auth store
  const setScannedId = useAuthStore((state) => state.setScannedId);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  // Feedback helpers
  const showFeedback = useCallback((type: 'error' | 'success' | 'info' | 'warning', message: string, duration = 4000) => {
    setFeedbackType(type);
    setFeedbackMessage(message);
    if (duration > 0) {
      setTimeout(() => {
        setFeedbackType(null);
        setFeedbackMessage('');
      }, duration);
    }
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedbackType(null);
    setFeedbackMessage('');
  }, []);

  // Liveness verification hook
  const liveness = useLivenessVerification({
    cameraRef,
    isCameraReady,
    isActive: step === 'selfie' && !livenessPassed,
    onComplete: (photo) => {
      setLivenessPassed(true);
      showFeedback('success', 'Face verified! Now scan your ID');
      setTimeout(() => {
        setIsCameraReady(false);
        setStep('front');
        clearFeedback();
      }, 1200);
    },
    onError: (error) => {
      showFeedback('error', error);
    },
  });

  // ID scanner hook
  const idScanner = useIDDocumentScanner({
    cameraRef,
    isCameraReady,
    isActive: step === 'front',
    minimumAge,
    onSuccess: (photo, ocrResult) => {
      setFrontPhoto(photo);
      setStep('preview');
    },
    onFeedback: showFeedback,
  });

  // Navigation handlers
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'front') {
      setStep('selfie');
      setFrontPhoto(null);
      liveness.resetLiveness();
      clearFeedback();
    } else if (step === 'preview') {
      setStep('front');
      setFrontPhoto(null);
      clearFeedback();
    } else {
      navigation.goBack();
    }
  }, [navigation, step, liveness, clearFeedback]);

  const handleRetake = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFrontPhoto(null);
    setLivenessPassed(false);
    idScanner.resetScanner();
    liveness.resetLiveness();
    clearFeedback();
    setStep('selfie');
  }, [idScanner, liveness, clearFeedback]);

  const handleContinue = useCallback(() => {
    if (!frontPhoto || !livenessPassed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScannedId(`file://${frontPhoto.path}`);
    navigation.navigate('SignUp');
  }, [frontPhoto, livenessPassed, setScannedId, navigation]);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    if (!result) {
      showFeedback('error', 'Camera access is required. Please enable it in Settings');
    }
  }, [requestPermission, showFeedback]);

  // Modal close handlers that navigate back
  const handleAgeRejectionClose = useCallback(() => {
    idScanner.handleAgeRejectionClose();
    navigation.goBack();
  }, [idScanner, navigation]);

  const handleFraudClose = useCallback(() => {
    idScanner.handleFraudClose();
    navigation.goBack();
  }, [idScanner, navigation]);

  const currentDevice = step === 'selfie' ? frontDevice : backDevice;

  // ============================================================================
  // PERMISSION SCREEN
  // ============================================================================
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.permissionContent, { paddingTop: insets.top + 20, opacity: fadeIn }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="chevron-left" size={28} color="#FFFFFF" />
          </Pressable>
          <View style={styles.permissionIcon}>
            <Feather name="camera" size={40} color={iOS.colors.orange} />
          </View>
          <Text style={styles.permissionTitle} maxFontSizeMultiplier={FONT_SCALING.TITLE}>Camera Access</Text>
          <Text style={styles.permissionSubtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>
            We need camera permission to verify your identity with face detection
          </Text>
          <View style={styles.permissionCard}>
            {[
              { icon: 'cpu', text: 'On-device processing' },
              { icon: 'shield', text: 'Your data stays private' },
              { icon: 'zap', text: 'Fast verification' },
            ].map((item, i) => (
              <View key={i} style={styles.permissionFeature}>
                <View style={styles.permissionFeatureIcon}>
                  <Feather name={item.icon as any} size={18} color={iOS.colors.teal} />
                </View>
                <Text style={styles.permissionFeatureText} maxFontSizeMultiplier={FONT_SCALING.BODY}>{item.text}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={handleRequestPermission}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <Feather name="camera" size={20} color="#FFF" />
            <Text style={styles.primaryButtonText} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>Enable Camera</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // ============================================================================
  // NO DEVICE SCREEN
  // ============================================================================
  if (!currentDevice) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.centerContent}>
          <Feather name="camera-off" size={48} color="#FFF" />
          <Text style={styles.errorTextWhite} maxFontSizeMultiplier={FONT_SCALING.BODY}>Camera unavailable</Text>
        </View>
      </View>
    );
  }

  // ============================================================================
  // PREVIEW SCREEN
  // ============================================================================
  if (step === 'preview' && frontPhoto) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.previewContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32, opacity: fadeIn }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="chevron-left" size={28} color="#FFFFFF" />
          </Pressable>

          <View style={styles.previewHeader}>
            <View style={styles.successIcon}>
              <Feather name="check" size={36} color="#FFF" />
            </View>
            <Text style={styles.previewTitle} maxFontSizeMultiplier={FONT_SCALING.TITLE}>Identity Verified</Text>
            <Text style={styles.previewSubtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>Liveness check successful</Text>
          </View>

          <View style={styles.previewCard}>
            <Image source={{ uri: `file://${frontPhoto.path}` }} style={styles.previewImage} resizeMode="cover" />
            <View style={styles.previewBadge}>
              <Feather name="shield" size={12} color={iOS.colors.green} />
              <Text style={styles.previewBadgeText} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>Verified</Text>
            </View>
          </View>

          <View style={styles.verificationInfo}>
            <View style={styles.verificationItem}>
              <View style={[styles.verificationIcon, { backgroundColor: iOS.colors.greenLight }]}>
                <Feather name="user-check" size={18} color={iOS.colors.green} />
              </View>
              <View style={styles.verificationText}>
                <Text style={styles.verificationTitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>Liveness Confirmed</Text>
                <Text style={styles.verificationSubtitle} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>Real person detected</Text>
              </View>
            </View>
            <View style={styles.verificationItem}>
              <View style={[styles.verificationIcon, { backgroundColor: iOS.colors.greenLight }]}>
                <Feather name="lock" size={18} color={iOS.colors.green} />
              </View>
              <View style={styles.verificationText}>
                <Text style={styles.verificationTitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>Secure Capture</Text>
                <Text style={styles.verificationSubtitle} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>Data stays on device</Text>
              </View>
            </View>
          </View>

          <View style={styles.previewActions}>
            <Pressable
              onPress={handleRetake}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
            >
              <Feather name="refresh-cw" size={18} color={iOS.colors.label} />
              <Text style={styles.secondaryButtonText} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>Retake</Text>
            </Pressable>
            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [styles.primaryButton, styles.primaryButtonFlex, pressed && styles.primaryButtonPressed]}
            >
              <Text style={styles.primaryButtonText} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#FFF" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ============================================================================
  // CAMERA SCREEN (Selfie or ID Scan)
  // ============================================================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Camera */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={currentDevice}
        isActive={true}
        photo={true}
        onInitialized={() => setIsCameraReady(true)}
        frameProcessor={step === 'selfie' ? liveness.frameProcessor : undefined}
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(255, 138, 107, 0.85)', 'transparent', 'transparent', 'rgba(91, 191, 179, 0.85)']}
        locations={[0, 0.25, 0.75, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 12, opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>
        <StepIndicator currentStep={step} />
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* Main content */}
      <Animated.View style={[styles.main, { opacity: fadeIn }]}>
        <View style={styles.titleCard}>
          <Text style={styles.titleCardTitle} maxFontSizeMultiplier={FONT_SCALING.TITLE}>
            {step === 'selfie' ? 'Face Verification' : 'Scan Your ID'}
          </Text>
          <Text style={styles.titleCardSubtitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>
            {step === 'selfie' ? liveness.getStatusText() : 'Position your ID within the frame'}
          </Text>
        </View>

        {/* Frame component */}
        {step === 'selfie' ? (
          <FaceFrame faceState={liveness.faceState} progress={liveness.faceProgress} />
        ) : (
          <IDFrame />
        )}

        {/* Feedback */}
        {feedbackType && feedbackMessage && (
          <View style={styles.feedbackContainer}>
            <FeedbackBadge type={feedbackType} message={feedbackMessage} />
          </View>
        )}
      </Animated.View>

      {/* Bottom section */}
      <Animated.View style={[styles.bottom, { paddingBottom: insets.bottom + 24, opacity: fadeIn }]}>
        {step === 'front' && (
          <CaptureButton
            onPress={idScanner.handleCapture}
            disabled={!isCameraReady || idScanner.isCapturing}
            isCapturing={idScanner.isCapturing}
          />
        )}

        {step === 'selfie' && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <Feather name="shield" size={20} color={iOS.colors.teal} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle} maxFontSizeMultiplier={FONT_SCALING.BODY}>Why we verify</Text>
              <Text style={styles.infoCardText} maxFontSizeMultiplier={FONT_SCALING.BODY}>
                Face verification helps keep our community safe by ensuring every member is a real person
              </Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Loading overlay */}
      {(!isCameraReady || idScanner.isOcrProcessing || idScanner.isBackendVerifying) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={iOS.colors.orange} />
            <Text style={styles.loadingText} maxFontSizeMultiplier={FONT_SCALING.BODY}>
              {idScanner.isBackendVerifying
                ? 'Verifying with server...'
                : idScanner.isOcrProcessing
                ? 'Scanning your ID...'
                : 'Initializing camera...'}
            </Text>
          </View>
        </View>
      )}

      {/* Modals */}
      <IDScannerModals
        showAgeRejectionModal={idScanner.showAgeRejectionModal}
        ageRejectionData={idScanner.ageRejectionData}
        minimumAge={minimumAge}
        onAgeRejectionClose={handleAgeRejectionClose}
        onAgeRejectionRetake={idScanner.handleAgeRejectionRetake}
        showFraudModal={idScanner.showFraudModal}
        fraudRejectionData={idScanner.fraudRejectionData}
        onFraudClose={handleFraudClose}
        onFraudRetake={idScanner.handleFraudRetake}
      />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: iOS.colors.background },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.lg,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: iOS.radius.pill,
    paddingVertical: iOS.spacing.sm,
    paddingHorizontal: iOS.spacing.md,
    ...iOS.shadow.small,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: iOS.colors.tertiaryFill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: { backgroundColor: iOS.colors.orange },
  stepCircleComplete: { backgroundColor: iOS.colors.green },
  stepLabel: { ...iOS.typography.caption1, color: iOS.colors.tertiaryLabel },
  stepLabelActive: { color: iOS.colors.label, fontWeight: '600' },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: iOS.colors.separator,
    marginHorizontal: iOS.spacing.sm,
    marginBottom: 16,
  },
  stepLineComplete: { backgroundColor: iOS.colors.green },

  // Main
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.lg,
  },
  titleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: iOS.radius.xl,
    paddingVertical: iOS.spacing.md,
    paddingHorizontal: iOS.spacing.xl,
    marginBottom: iOS.spacing.xxl,
    alignItems: 'center',
    ...iOS.shadow.small,
  },
  titleCardTitle: {
    ...iOS.typography.title2,
    color: iOS.colors.label,
    textAlign: 'center',
    marginBottom: iOS.spacing.xs,
  },
  titleCardSubtitle: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
  },

  // Feedback
  feedbackContainer: { marginTop: iOS.spacing.xl, paddingHorizontal: iOS.spacing.md },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: iOS.radius.pill,
    maxWidth: 360,
  },
  feedbackText: { ...iOS.typography.subhead, fontWeight: '500', flex: 1 },

  // Bottom
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: iOS.radius.xl,
    padding: iOS.spacing.lg,
    maxWidth: 360,
    ...iOS.shadow.small,
  },
  infoCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: iOS.colors.tealLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.md,
  },
  infoCardContent: { flex: 1 },
  infoCardTitle: { ...iOS.typography.headline, color: iOS.colors.label, marginBottom: iOS.spacing.xs },
  infoCardText: { ...iOS.typography.subhead, color: iOS.colors.secondaryLabel, lineHeight: 20 },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: iOS.colors.card,
    borderRadius: iOS.radius.xxl,
    padding: iOS.spacing.xxl,
    alignItems: 'center',
    ...iOS.shadow.card,
  },
  loadingText: { ...iOS.typography.body, color: iOS.colors.secondaryLabel, marginTop: iOS.spacing.lg },

  // Permission screen
  permissionContent: { flex: 1, alignItems: 'center', paddingHorizontal: iOS.spacing.xl },
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: iOS.spacing.xxxl,
    marginBottom: iOS.spacing.xl,
    ...iOS.shadow.card,
  },
  permissionTitle: {
    ...iOS.typography.title1,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: iOS.spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  permissionSubtitle: {
    ...iOS.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: iOS.spacing.xxl,
    lineHeight: 24,
    paddingHorizontal: iOS.spacing.lg,
  },
  permissionCard: {
    width: '100%',
    backgroundColor: iOS.colors.card,
    borderRadius: iOS.radius.xxl,
    padding: iOS.spacing.lg,
    marginBottom: iOS.spacing.xxl,
    ...iOS.shadow.card,
  },
  permissionFeature: { flexDirection: 'row', alignItems: 'center', paddingVertical: iOS.spacing.md },
  permissionFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: iOS.colors.tealLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.md,
  },
  permissionFeatureText: { ...iOS.typography.body, color: iOS.colors.label, flex: 1 },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: iOS.spacing.sm,
    height: 56,
    borderRadius: iOS.radius.pill,
    backgroundColor: iOS.colors.orange,
    paddingHorizontal: iOS.spacing.xxl,
    ...iOS.shadow.button,
  },
  primaryButtonFlex: { flex: 1 },
  primaryButtonPressed: { backgroundColor: iOS.colors.orangeDark, transform: [{ scale: 0.98 }] },
  primaryButtonText: { ...iOS.typography.headline, color: '#FFFFFF' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: iOS.spacing.sm,
    height: 56,
    borderRadius: iOS.radius.pill,
    backgroundColor: iOS.colors.card,
    paddingHorizontal: iOS.spacing.xl,
    borderWidth: 1,
    borderColor: iOS.colors.separator,
  },
  secondaryButtonPressed: { backgroundColor: iOS.colors.tertiaryFill, transform: [{ scale: 0.98 }] },
  secondaryButtonText: { ...iOS.typography.headline, color: iOS.colors.label },

  // Preview screen
  previewContent: { flex: 1, paddingHorizontal: iOS.spacing.xl },
  previewHeader: { alignItems: 'center', marginTop: iOS.spacing.xxl, marginBottom: iOS.spacing.xl },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: iOS.colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.lg,
    ...iOS.shadow.small,
  },
  previewTitle: {
    ...iOS.typography.title1,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: iOS.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  previewSubtitle: { ...iOS.typography.body, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' },
  previewCard: {
    backgroundColor: iOS.colors.card,
    borderRadius: iOS.radius.xxl,
    overflow: 'hidden',
    marginBottom: iOS.spacing.lg,
    ...iOS.shadow.card,
  },
  previewImage: { width: '100%', height: 200, backgroundColor: iOS.colors.tertiaryFill },
  previewBadge: {
    position: 'absolute',
    bottom: iOS.spacing.md,
    right: iOS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: iOS.spacing.xs,
    paddingHorizontal: iOS.spacing.md,
    borderRadius: iOS.radius.pill,
  },
  previewBadgeText: { ...iOS.typography.caption1, color: iOS.colors.green, fontWeight: '600' },
  verificationInfo: {
    backgroundColor: iOS.colors.card,
    borderRadius: iOS.radius.xl,
    padding: iOS.spacing.lg,
    marginBottom: iOS.spacing.xxl,
    ...iOS.shadow.card,
  },
  verificationItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: iOS.spacing.sm },
  verificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.md,
  },
  verificationText: { flex: 1 },
  verificationTitle: { ...iOS.typography.headline, color: iOS.colors.label },
  verificationSubtitle: { ...iOS.typography.subhead, color: iOS.colors.secondaryLabel },
  previewActions: { flexDirection: 'row', gap: iOS.spacing.md },

  // Misc
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorTextWhite: { ...iOS.typography.body, color: 'rgba(255, 255, 255, 0.8)', marginTop: iOS.spacing.lg },
});

export default IDScannerScreen;
