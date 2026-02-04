/**
 * TANDER ID Scanner Screen - Premium iOS Light Design
 *
 * Design matching OTPVerificationScreen:
 * - Warm gradient background (coral to teal)
 * - White cards with shadows
 * - Orange primary actions, Teal secondary
 * - Senior-friendly: 56px+ touch targets, 18px+ fonts
 * - Inline feedback (no alerts)
 * - Clean iOS aesthetic
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  ActivityIndicator,
  AccessibilityInfo,
  Image,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {
  useFaceDetector,
  FaceDetectionOptions,
} from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';

// OCR and age verification
import { extractDOBFromID, OCRResult, toFrontendOcrData } from '@/services/ocr/idOcrService';
import { AgeRejectionModal, AgeRejectionData } from '../components/AgeRejectionModal';
import { FraudRejectionModal, FraudRejectionData } from '../components/FraudRejectionModal';
import { verifyIdPreRegister, PreRegisterIdVerificationResponse } from '@/services/api/authApi';

import { AuthStackParamList } from '@navigation/types';
import { RouteProp } from '@react-navigation/native';
import { useAuthStore } from '@store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// iOS DESIGN SYSTEM (matching OTPVerificationScreen)
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
    tealLight: 'rgba(48, 213, 200, 0.12)',
    orange: '#F97316',
    orangeDark: '#EA580C',
    orangeLight: 'rgba(249, 115, 22, 0.12)',
    red: '#FF3B30',
    redLight: 'rgba(255, 59, 48, 0.1)',
    green: '#34C759',
    greenLight: 'rgba(52, 199, 89, 0.1)',
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

  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 12,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    button: {
      shadowColor: '#F97316',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },
} as const;

// Face detection types
type FaceDirection = 'left-skewed' | 'right-skewed' | 'frontal' | 'unknown';
type FaceDetectionStatus = 'success' | 'standby' | 'no_face' | 'error';

// Face detection configuration
const faceDetectionOptions: FaceDetectionOptions = {
  performanceMode: 'fast',
  landmarkMode: 'none',
  contourMode: 'none',
  classificationMode: 'none',
  minFaceSize: 0.15,
  trackingEnabled: true,
};

// Helper to convert yaw angle to face direction
const getDirectionFromYaw = (yaw: number): FaceDirection => {
  'worklet';
  if (yaw < -25) return 'left-skewed';
  if (yaw > 25) return 'right-skewed';
  return 'frontal';
};

// Frame dimensions
const FRAME_SIZE = Math.min(SCREEN_WIDTH * 0.65, 260);
const RING_STROKE = 4;
const RING_RADIUS = (FRAME_SIZE - RING_STROKE * 2) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Timing
const FACE_HOLD_TIME = 2000;

// ============================================================================
// TYPES
// ============================================================================
type IDScannerScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'IDScanner'>;
type IDScannerScreenRouteProp = RouteProp<AuthStackParamList, 'IDScanner'>;

interface Props {
  navigation: IDScannerScreenNavProp;
  route: IDScannerScreenRouteProp;
}

type ScanStep = 'selfie' | 'front' | 'preview';
type FaceState = 'idle' | 'searching' | 'detected' | 'verifying' | 'verified';
type LivenessStage = 'center' | 'hold';

// ============================================================================
// FEEDBACK BADGE COMPONENT (replaces alerts)
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
      <Text style={[styles.feedbackText, { color: config.color }]} numberOfLines={2}>
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
              <View style={[
                styles.stepCircle,
                isComplete && styles.stepCircleComplete,
                isActive && styles.stepCircleActive,
              ]}>
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
              <Text style={[
                styles.stepLabel,
                (isActive || isComplete) && styles.stepLabelActive,
              ]}>
                {step.label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                isComplete && styles.stepLineComplete,
              ]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

// ============================================================================
// FACE FRAME COMPONENT
// ============================================================================
const FaceFrame: React.FC<{
  faceState: FaceState;
  progress: number;
}> = ({ faceState, progress }) => {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const getStateColor = () => {
    switch (faceState) {
      case 'searching': return iOS.colors.teal;
      case 'detected': return iOS.colors.orange;
      case 'verifying': return iOS.colors.orange;
      case 'verified': return iOS.colors.green;
      default: return iOS.colors.tertiaryLabel;
    }
  };

  const stateColor = getStateColor();
  const progressOffset = RING_CIRCUMFERENCE * (1 - progress / 100);

  useEffect(() => {
    if (faceState === 'searching') {
      const rotation = Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotation.start();
      return () => rotation.stop();
    } else {
      rotationAnim.setValue(0);
    }
  }, [faceState]);

  useEffect(() => {
    if (faceState === 'detected') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [faceState]);

  const rotateInterpolate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.faceFrameContainer}>
      <Animated.View style={[styles.faceFrameInner, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={FRAME_SIZE} height={FRAME_SIZE} style={styles.frameSvg}>
          <Circle
            cx={FRAME_SIZE / 2}
            cy={FRAME_SIZE / 2}
            r={RING_RADIUS}
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth={2}
            fill="none"
          />
        </Svg>

        {faceState === 'searching' && (
          <Animated.View style={[styles.absoluteFrame, { transform: [{ rotate: rotateInterpolate }] }]}>
            <Svg width={FRAME_SIZE} height={FRAME_SIZE}>
              <Defs>
                <SvgLinearGradient id="searchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={stateColor} stopOpacity="0" />
                  <Stop offset="50%" stopColor={stateColor} stopOpacity="1" />
                  <Stop offset="100%" stopColor={stateColor} stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Circle
                cx={FRAME_SIZE / 2}
                cy={FRAME_SIZE / 2}
                r={RING_RADIUS}
                stroke="url(#searchGrad)"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        )}

        {(faceState === 'detected' || faceState === 'verifying') && (
          <Svg width={FRAME_SIZE} height={FRAME_SIZE} style={styles.frameSvg}>
            <Circle
              cx={FRAME_SIZE / 2}
              cy={FRAME_SIZE / 2}
              r={RING_RADIUS}
              stroke={stateColor}
              strokeWidth={RING_STROKE}
              strokeOpacity={0.3}
              fill="none"
            />
          </Svg>
        )}

        {faceState === 'verifying' && progress > 0 && (
          <View style={[styles.absoluteFrame, { transform: [{ rotate: '-90deg' }] }]}>
            <Svg width={FRAME_SIZE} height={FRAME_SIZE}>
              <Circle
                cx={FRAME_SIZE / 2}
                cy={FRAME_SIZE / 2}
                r={RING_RADIUS}
                stroke={stateColor}
                strokeWidth={RING_STROKE + 2}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={progressOffset}
                fill="none"
              />
            </Svg>
          </View>
        )}

        {faceState === 'verified' && (
          <Svg width={FRAME_SIZE} height={FRAME_SIZE} style={styles.frameSvg}>
            <Circle
              cx={FRAME_SIZE / 2}
              cy={FRAME_SIZE / 2}
              r={RING_RADIUS}
              stroke={iOS.colors.green}
              strokeWidth={RING_STROKE + 2}
              fill="none"
            />
          </Svg>
        )}

        <View style={styles.frameCenter}>
          {faceState === 'verified' ? (
            <View style={[styles.successBadge, { backgroundColor: iOS.colors.green }]}>
              <Feather name="check" size={40} color="#FFF" />
            </View>
          ) : (
            <Feather
              name="user"
              size={50}
              color={faceState === 'searching' ? 'rgba(255,255,255,0.5)' : stateColor}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
};

// ============================================================================
// ID FRAME COMPONENT
// ============================================================================
const IDFrame: React.FC = () => {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const frameWidth = SCREEN_WIDTH * 0.85;
  const frameHeight = frameWidth * 0.63;

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, frameHeight - 4],
  });

  const scanOpacity = scanAnim.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={[styles.idFrame, { width: frameWidth, height: frameHeight }]}>
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      <Animated.View style={[
        styles.scanLine,
        { transform: [{ translateY: scanTranslate }], opacity: scanOpacity }
      ]}>
        <LinearGradient
          colors={['transparent', iOS.colors.orange, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.idFrameCenter}>
        <Feather name="credit-card" size={32} color="rgba(255,255,255,0.5)" />
        <Text style={styles.idFrameHint}>Position ID here</Text>
      </View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const IDScannerScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const minimumAge = route.params?.minimumAge ?? 60;

  const { hasPermission, requestPermission } = useCameraPermission();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const { detectFaces } = useFaceDetector(faceDetectionOptions);

  const [step, setStep] = useState<ScanStep>('selfie');
  const [frontPhoto, setFrontPhoto] = useState<PhotoFile | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const [faceState, setFaceState] = useState<FaceState>('searching');
  const [faceProgress, setFaceProgress] = useState(0);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessStage, setLivenessStage] = useState<LivenessStage>('center');

  const [feedbackType, setFeedbackType] = useState<'error' | 'success' | 'info' | 'warning' | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showAgeRejectionModal, setShowAgeRejectionModal] = useState(false);
  const [ageRejectionData, setAgeRejectionData] = useState<AgeRejectionData | null>(null);
  const [showFraudModal, setShowFraudModal] = useState(false);
  const [fraudRejectionData, setFraudRejectionData] = useState<FraudRejectionData | null>(null);
  const [isBackendVerifying, setIsBackendVerifying] = useState(false);

  const faceStableStartTime = useRef<number | null>(null);
  const lastHapticTime = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const setScannedId = useAuthStore((state) => state.setScannedId);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

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

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success' | 'error') => {
    const now = Date.now();
    if (now - lastHapticTime.current < 100) return;
    lastHapticTime.current = now;
    switch (type) {
      case 'light': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
      case 'medium': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
      case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case 'error': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
    }
  }, []);

  const handleFraudDetected = useCallback((data: any) => {
    setFraudRejectionData({
      auditId: data?.auditId ?? null,
      riskLevel: data?.fraudAnalysis?.riskLevel ?? null,
      recommendation: data?.fraudAnalysis?.recommendation ?? null,
    });
    setShowFraudModal(true);
  }, []);

  const resetLiveness = useCallback(() => {
    setFaceState('searching');
    setFaceProgress(0);
    setLivenessStage('center');
    faceStableStartTime.current = null;
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const handleLivenessComplete = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) return;
    setIsCapturing(true);
    setFaceState('verified');
    triggerHaptic('success');
    AccessibilityInfo.announceForAccessibility('Face verified!');

    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      if (photo) {
        setLivenessPassed(true);
        showFeedback('success', 'Face verified! Now scan your ID');
        setTimeout(() => {
          setIsCameraReady(false);
          setStep('front');
          setFaceState('idle');
          setFaceProgress(0);
          clearFeedback();
        }, 1200);
      }
    } catch (error) {
      console.error('Capture error:', error);
      showFeedback('error', 'Capture failed. Please try again');
      triggerHaptic('error');
      resetLiveness();
    } finally {
      setIsCapturing(false);
    }
  }, [isCameraReady, isCapturing, triggerHaptic, showFeedback, clearFeedback, resetLiveness]);

  const handleFaceDetectionResult = Worklets.createRunOnJS(
    (status: FaceDetectionStatus, faceDirection?: FaceDirection) => {
      if (step !== 'selfie' || isCapturing || livenessPassed) return;
      const hasFace = status === 'standby' || status === 'success';
      if (!hasFace || faceDirection === 'unknown' || !faceDirection) {
        setFaceState('searching');
        setFaceProgress(0);
        faceStableStartTime.current = null;
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        return;
      }
      const isFrontal = faceDirection === 'frontal';
      if (livenessStage === 'center' || livenessStage === 'hold') {
        if (!isFrontal) {
          setFaceState('detected');
          setFaceProgress(0);
          faceStableStartTime.current = null;
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          return;
        }
        if (!faceStableStartTime.current) {
          faceStableStartTime.current = Date.now();
          setLivenessStage('hold');
          setFaceState('verifying');
          triggerHaptic('medium');
          progressIntervalRef.current = setInterval(() => {
            if (faceStableStartTime.current) {
              const elapsed = Date.now() - faceStableStartTime.current;
              const progress = Math.min((elapsed / FACE_HOLD_TIME) * 100, 100);
              setFaceProgress(progress);
              if (progress >= 25 && progress < 28) triggerHaptic('light');
              if (progress >= 50 && progress < 53) triggerHaptic('light');
              if (progress >= 75 && progress < 78) triggerHaptic('light');
              if (progress >= 100) {
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
                handleLivenessComplete();
              }
            }
          }, 50);
        }
      }
    }
  );

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const faces = detectFaces(frame);
    if (faces.length > 0) {
      const face = faces[0];
      const yaw = face.yawAngle ?? 0;
      const direction = getDirectionFromYaw(yaw);
      handleFaceDetectionResult('success', direction);
    } else {
      handleFaceDetectionResult('no_face', undefined);
    }
  }, [detectFaces, handleFaceDetectionResult]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing || !isCameraReady || step !== 'front') return;
    setIsCapturing(true);
    triggerHaptic('medium');
    clearFeedback();

    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      if (photo) {
        setFrontPhoto(photo);
        setIsOcrProcessing(true);
        const ocrRes = await extractDOBFromID(`file://${photo.path}`, minimumAge);
        setIsOcrProcessing(false);
        setOcrResult(ocrRes);

        if (!ocrRes.success) {
          showFeedback('error', ocrRes.errorMessage || 'Could not read ID. Ensure good lighting and try again');
          setFrontPhoto(null);
          triggerHaptic('error');
          return;
        }

        if (!ocrRes.meetsAgeRequirement) {
          setAgeRejectionData({
            frontendAge: ocrRes.age,
            backendAge: null,
            discrepancyNote: null,
            auditId: null,
            confidenceLevel: null,
          });
          setShowAgeRejectionModal(true);
          triggerHaptic('error');
          return;
        }

        setIsBackendVerifying(true);
        try {
          const photoFile = { uri: `file://${photo.path}`, type: 'image/jpeg', name: 'id_front.jpg' } as any;
          const frontendOcrData = toFrontendOcrData(ocrRes);
          const backendRes = await verifyIdPreRegister(photoFile, frontendOcrData);
          setIsBackendVerifying(false);

          if (backendRes.data?.recommendation === 'RETAKE_PHOTO') {
            showFeedback('warning', backendRes.data.retakeGuidance || 'For better results, take a clearer photo', 0);
          }

          if (backendRes.code === 'FRAUD_DETECTED') {
            handleFraudDetected(backendRes.data);
            triggerHaptic('error');
            return;
          }

          if (backendRes.data?.fraudAnalysis?.recommendation === 'REVIEW') {
            showFeedback('info', 'Your ID will undergo additional review. You may continue', 0);
          }

          if (!backendRes.verified) {
            setAgeRejectionData({
              frontendAge: ocrRes.age,
              backendAge: backendRes.data?.extractedAge ?? null,
              discrepancyNote: backendRes.data?.comparison?.discrepancyNote ?? null,
              auditId: backendRes.data?.auditId ?? null,
              confidenceLevel: backendRes.data?.confidenceLevel ?? null,
            });
            setShowAgeRejectionModal(true);
            triggerHaptic('error');
            return;
          }

          triggerHaptic('success');
          AccessibilityInfo.announceForAccessibility('ID verified successfully');
          showFeedback('success', 'ID verified successfully!');
          setStep('preview');
        } catch (backendError: any) {
          setIsBackendVerifying(false);
          console.error('Backend verification error:', backendError);

          if (backendError?.code === 'FRAUD_DETECTED') {
            handleFraudDetected(backendError?.data);
            triggerHaptic('error');
            return;
          }

          if (backendError?.code === 'AGE_REQUIREMENT_NOT_MET' || backendError?.data?.meetsAgeRequirement === false) {
            setAgeRejectionData({
              frontendAge: ocrRes.age,
              backendAge: backendError?.data?.extractedAge ?? null,
              discrepancyNote: backendError?.data?.comparison?.discrepancyNote ?? null,
              auditId: backendError?.data?.auditId ?? null,
              confidenceLevel: backendError?.data?.confidenceLevel ?? null,
            });
            setShowAgeRejectionModal(true);
            triggerHaptic('error');
            return;
          }

          showFeedback('error', backendError?.message || 'Verification failed. Please try again');
          triggerHaptic('error');
        }
      }
    } catch (error) {
      console.error('Capture error:', error);
      showFeedback('error', 'Capture failed. Please try again');
      triggerHaptic('error');
      setIsOcrProcessing(false);
      setIsBackendVerifying(false);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, isCameraReady, step, triggerHaptic, minimumAge, handleFraudDetected, showFeedback, clearFeedback]);

  const handleRetake = useCallback(() => {
    triggerHaptic('light');
    setFrontPhoto(null);
    setLivenessPassed(false);
    setLivenessStage('center');
    setOcrResult(null);
    resetLiveness();
    clearFeedback();
    setStep('selfie');
  }, [triggerHaptic, resetLiveness, clearFeedback]);

  const handleAgeRejectionRetake = useCallback(() => {
    setShowAgeRejectionModal(false);
    setFrontPhoto(null);
    setOcrResult(null);
    setAgeRejectionData(null);
  }, []);

  const handleAgeRejectionClose = useCallback(() => {
    setShowAgeRejectionModal(false);
    setAgeRejectionData(null);
    navigation.goBack();
  }, [navigation]);

  const handleFraudRetake = useCallback(() => {
    setShowFraudModal(false);
    setFrontPhoto(null);
    setOcrResult(null);
    setFraudRejectionData(null);
  }, []);

  const handleFraudClose = useCallback(() => {
    setShowFraudModal(false);
    setFraudRejectionData(null);
    navigation.goBack();
  }, [navigation]);

  const handleContinue = useCallback(() => {
    if (!frontPhoto || !livenessPassed) return;
    triggerHaptic('success');
    setScannedId(`file://${frontPhoto.path}`);
    navigation.navigate('SignUp');
  }, [frontPhoto, livenessPassed, setScannedId, navigation, triggerHaptic]);

  const handleBack = useCallback(() => {
    triggerHaptic('light');
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (step === 'front') {
      setStep('selfie');
      setFrontPhoto(null);
      resetLiveness();
      clearFeedback();
    } else if (step === 'preview') {
      setStep('front');
      setFrontPhoto(null);
      clearFeedback();
    } else {
      navigation.goBack();
    }
  }, [navigation, step, triggerHaptic, resetLiveness, clearFeedback]);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    if (!result) {
      showFeedback('error', 'Camera access is required. Please enable it in Settings');
    }
  }, [requestPermission, showFeedback]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const currentDevice = step === 'selfie' ? frontDevice : backDevice;

  const getStatusText = () => {
    if (faceState === 'verified') return 'Verified!';
    if (faceState === 'verifying') return `Hold still... ${Math.round(faceProgress)}%`;
    if (faceState === 'detected') return 'Face forward';
    if (faceState === 'searching') return 'Looking for your face...';
    return 'Position your face in the circle';
  };

  // PERMISSION SCREEN
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
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionSubtitle}>We need camera permission to verify your identity with face detection</Text>
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
                <Text style={styles.permissionFeatureText}>{item.text}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={handleRequestPermission} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}>
            <Feather name="camera" size={20} color="#FFF" />
            <Text style={styles.primaryButtonText}>Enable Camera</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // NO DEVICE
  if (!currentDevice) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={['#FF8A6B', '#FF7B5C', '#5BBFB3']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.centerContent}>
          <Feather name="camera-off" size={48} color="#FFF" />
          <Text style={styles.errorTextWhite}>Camera unavailable</Text>
        </View>
      </View>
    );
  }

  // PREVIEW SCREEN
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
            <Text style={styles.previewTitle}>Identity Verified</Text>
            <Text style={styles.previewSubtitle}>Liveness check successful</Text>
          </View>
          <View style={styles.previewCard}>
            <Image source={{ uri: `file://${frontPhoto.path}` }} style={styles.previewImage} resizeMode="cover" />
            <View style={styles.previewBadge}>
              <Feather name="shield" size={12} color={iOS.colors.green} />
              <Text style={styles.previewBadgeText}>Verified</Text>
            </View>
          </View>
          <View style={styles.verificationInfo}>
            <View style={styles.verificationItem}>
              <View style={[styles.verificationIcon, { backgroundColor: iOS.colors.greenLight }]}>
                <Feather name="user-check" size={18} color={iOS.colors.green} />
              </View>
              <View style={styles.verificationText}>
                <Text style={styles.verificationTitle}>Liveness Confirmed</Text>
                <Text style={styles.verificationSubtitle}>Real person detected</Text>
              </View>
            </View>
            <View style={styles.verificationItem}>
              <View style={[styles.verificationIcon, { backgroundColor: iOS.colors.greenLight }]}>
                <Feather name="lock" size={18} color={iOS.colors.green} />
              </View>
              <View style={styles.verificationText}>
                <Text style={styles.verificationTitle}>Secure Capture</Text>
                <Text style={styles.verificationSubtitle}>Data stays on device</Text>
              </View>
            </View>
          </View>
          <View style={styles.previewActions}>
            <Pressable onPress={handleRetake} style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}>
              <Feather name="refresh-cw" size={18} color={iOS.colors.label} />
              <Text style={styles.secondaryButtonText}>Retake</Text>
            </Pressable>
            <Pressable onPress={handleContinue} style={({ pressed }) => [styles.primaryButton, styles.primaryButtonFlex, pressed && styles.primaryButtonPressed]}>
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#FFF" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  // CAMERA SCREEN
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={currentDevice} isActive={true} photo={true} onInitialized={() => setIsCameraReady(true)} frameProcessor={step === 'selfie' ? frameProcessor : undefined} />
      <LinearGradient colors={['rgba(255, 138, 107, 0.85)', 'transparent', 'transparent', 'rgba(91, 191, 179, 0.85)']} locations={[0, 0.25, 0.75, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Animated.View style={[styles.header, { paddingTop: insets.top + 12, opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>
        <StepIndicator currentStep={step} />
        <View style={{ width: 44 }} />
      </Animated.View>
      <Animated.View style={[styles.main, { opacity: fadeIn }]}>
        <View style={styles.titleCard}>
          <Text style={styles.titleCardTitle}>{step === 'selfie' ? 'Face Verification' : 'Scan Your ID'}</Text>
          <Text style={styles.titleCardSubtitle}>{step === 'selfie' ? getStatusText() : 'Position your ID within the frame'}</Text>
        </View>
        {step === 'selfie' ? <FaceFrame faceState={faceState} progress={faceProgress} /> : <IDFrame />}
        {feedbackType && feedbackMessage && (
          <View style={styles.feedbackContainer}>
            <FeedbackBadge type={feedbackType} message={feedbackMessage} />
          </View>
        )}
      </Animated.View>
      <Animated.View style={[styles.bottom, { paddingBottom: insets.bottom + 24, opacity: fadeIn }]}>
        {step === 'front' && (
          <View style={styles.captureSection}>
            <Pressable onPress={handleCapture} disabled={!isCameraReady || isCapturing} style={({ pressed }) => [styles.captureButton, pressed && styles.captureButtonPressed, (!isCameraReady || isCapturing) && styles.captureButtonDisabled]}>
              {isCapturing ? <ActivityIndicator color={iOS.colors.orange} size="small" /> : <View style={styles.captureButtonInner} />}
            </Pressable>
            <Text style={styles.captureHint}>Tap to capture</Text>
          </View>
        )}
        {step === 'selfie' && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <Feather name="shield" size={20} color={iOS.colors.teal} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Why we verify</Text>
              <Text style={styles.infoCardText}>Face verification helps keep our community safe by ensuring every member is a real person</Text>
            </View>
          </View>
        )}
      </Animated.View>
      {(!isCameraReady || isOcrProcessing || isBackendVerifying) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={iOS.colors.orange} />
            <Text style={styles.loadingText}>{isBackendVerifying ? 'Verifying with server...' : isOcrProcessing ? 'Scanning your ID...' : 'Initializing camera...'}</Text>
          </View>
        </View>
      )}
      <AgeRejectionModal visible={showAgeRejectionModal} data={ageRejectionData} onClose={handleAgeRejectionClose} onRetake={handleAgeRejectionRetake} />
      <FraudRejectionModal visible={showFraudModal} data={fraudRejectionData} onClose={handleFraudClose} onRetake={handleFraudRetake} />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: iOS.colors.background },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: iOS.spacing.lg, zIndex: 10 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: iOS.radius.pill, paddingVertical: iOS.spacing.sm, paddingHorizontal: iOS.spacing.md, ...iOS.shadow.small },
  stepItem: { alignItems: 'center' },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: iOS.colors.tertiaryFill, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  stepCircleActive: { backgroundColor: iOS.colors.orange },
  stepCircleComplete: { backgroundColor: iOS.colors.green },
  stepLabel: { ...iOS.typography.caption1, color: iOS.colors.tertiaryLabel },
  stepLabelActive: { color: iOS.colors.label, fontWeight: '600' },
  stepLine: { width: 32, height: 2, backgroundColor: iOS.colors.separator, marginHorizontal: iOS.spacing.sm, marginBottom: 16 },
  stepLineComplete: { backgroundColor: iOS.colors.green },
  main: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: iOS.spacing.lg },
  titleCard: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: iOS.radius.xl, paddingVertical: iOS.spacing.md, paddingHorizontal: iOS.spacing.xl, marginBottom: iOS.spacing.xxl, alignItems: 'center', ...iOS.shadow.small },
  titleCardTitle: { ...iOS.typography.title2, color: iOS.colors.label, textAlign: 'center', marginBottom: iOS.spacing.xs },
  titleCardSubtitle: { ...iOS.typography.subhead, color: iOS.colors.secondaryLabel, textAlign: 'center' },
  faceFrameContainer: { width: FRAME_SIZE, height: FRAME_SIZE, justifyContent: 'center', alignItems: 'center' },
  faceFrameInner: { width: FRAME_SIZE, height: FRAME_SIZE, justifyContent: 'center', alignItems: 'center' },
  frameSvg: { position: 'absolute' },
  absoluteFrame: { position: 'absolute' },
  frameCenter: { justifyContent: 'center', alignItems: 'center' },
  successBadge: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  idFrame: { borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.5)', borderRadius: iOS.radius.xl, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: iOS.colors.orange },
  cornerTL: { top: -1, left: -1, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: iOS.radius.xl },
  cornerTR: { top: -1, right: -1, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: iOS.radius.xl },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: iOS.radius.xl },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: iOS.radius.xl },
  scanLine: { position: 'absolute', left: 12, right: 12, height: 3, borderRadius: 2 },
  idFrameCenter: { alignItems: 'center' },
  idFrameHint: { ...iOS.typography.subhead, color: 'rgba(255, 255, 255, 0.7)', marginTop: iOS.spacing.sm },
  feedbackContainer: { marginTop: iOS.spacing.xl, paddingHorizontal: iOS.spacing.md },
  feedbackBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: iOS.radius.pill, maxWidth: SCREEN_WIDTH - 48 },
  feedbackText: { ...iOS.typography.subhead, fontWeight: '500', flex: 1 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: iOS.spacing.xl },
  captureSection: { alignItems: 'center' },
  captureButton: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.6)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', marginBottom: iOS.spacing.md },
  captureButtonPressed: { transform: [{ scale: 0.95 }] },
  captureButtonDisabled: { opacity: 0.5 },
  captureButtonInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF' },
  captureHint: { ...iOS.typography.subhead, color: 'rgba(255, 255, 255, 0.8)' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: iOS.radius.xl, padding: iOS.spacing.lg, maxWidth: 360, ...iOS.shadow.small },
  infoCardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: iOS.colors.tealLight, justifyContent: 'center', alignItems: 'center', marginRight: iOS.spacing.md },
  infoCardContent: { flex: 1 },
  infoCardTitle: { ...iOS.typography.headline, color: iOS.colors.label, marginBottom: iOS.spacing.xs },
  infoCardText: { ...iOS.typography.subhead, color: iOS.colors.secondaryLabel, lineHeight: 20 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  loadingCard: { backgroundColor: iOS.colors.card, borderRadius: iOS.radius.xxl, padding: iOS.spacing.xxl, alignItems: 'center', ...iOS.shadow.card },
  loadingText: { ...iOS.typography.body, color: iOS.colors.secondaryLabel, marginTop: iOS.spacing.lg },
  permissionContent: { flex: 1, alignItems: 'center', paddingHorizontal: iOS.spacing.xl },
  permissionIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginTop: iOS.spacing.xxxl, marginBottom: iOS.spacing.xl, ...iOS.shadow.card },
  permissionTitle: { ...iOS.typography.title1, color: '#FFFFFF', textAlign: 'center', marginBottom: iOS.spacing.sm, textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  permissionSubtitle: { ...iOS.typography.body, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', marginBottom: iOS.spacing.xxl, lineHeight: 24, paddingHorizontal: iOS.spacing.lg },
  permissionCard: { width: '100%', backgroundColor: iOS.colors.card, borderRadius: iOS.radius.xxl, padding: iOS.spacing.lg, marginBottom: iOS.spacing.xxl, ...iOS.shadow.card },
  permissionFeature: { flexDirection: 'row', alignItems: 'center', paddingVertical: iOS.spacing.md },
  permissionFeatureIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: iOS.colors.tealLight, justifyContent: 'center', alignItems: 'center', marginRight: iOS.spacing.md },
  permissionFeatureText: { ...iOS.typography.body, color: iOS.colors.label, flex: 1 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: iOS.spacing.sm, height: 56, borderRadius: iOS.radius.pill, backgroundColor: iOS.colors.orange, paddingHorizontal: iOS.spacing.xxl, ...iOS.shadow.button },
  primaryButtonFlex: { flex: 1 },
  primaryButtonPressed: { backgroundColor: iOS.colors.orangeDark, transform: [{ scale: 0.98 }] },
  primaryButtonText: { ...iOS.typography.headline, color: '#FFFFFF' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: iOS.spacing.sm, height: 56, borderRadius: iOS.radius.pill, backgroundColor: iOS.colors.card, paddingHorizontal: iOS.spacing.xl, borderWidth: 1, borderColor: iOS.colors.separator },
  secondaryButtonPressed: { backgroundColor: iOS.colors.tertiaryFill, transform: [{ scale: 0.98 }] },
  secondaryButtonText: { ...iOS.typography.headline, color: iOS.colors.label },
  previewContent: { flex: 1, paddingHorizontal: iOS.spacing.xl },
  previewHeader: { alignItems: 'center', marginTop: iOS.spacing.xxl, marginBottom: iOS.spacing.xl },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: iOS.colors.green, justifyContent: 'center', alignItems: 'center', marginBottom: iOS.spacing.lg, ...iOS.shadow.small },
  previewTitle: { ...iOS.typography.title1, color: '#FFFFFF', textAlign: 'center', marginBottom: iOS.spacing.xs, textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  previewSubtitle: { ...iOS.typography.body, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' },
  previewCard: { backgroundColor: iOS.colors.card, borderRadius: iOS.radius.xxl, overflow: 'hidden', marginBottom: iOS.spacing.lg, ...iOS.shadow.card },
  previewImage: { width: '100%', height: 200, backgroundColor: iOS.colors.tertiaryFill },
  previewBadge: { position: 'absolute', bottom: iOS.spacing.md, right: iOS.spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingVertical: iOS.spacing.xs, paddingHorizontal: iOS.spacing.md, borderRadius: iOS.radius.pill },
  previewBadgeText: { ...iOS.typography.caption1, color: iOS.colors.green, fontWeight: '600' },
  verificationInfo: { backgroundColor: iOS.colors.card, borderRadius: iOS.radius.xl, padding: iOS.spacing.lg, marginBottom: iOS.spacing.xxl, ...iOS.shadow.card },
  verificationItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: iOS.spacing.sm },
  verificationIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: iOS.spacing.md },
  verificationText: { flex: 1 },
  verificationTitle: { ...iOS.typography.headline, color: iOS.colors.label },
  verificationSubtitle: { ...iOS.typography.subhead, color: iOS.colors.secondaryLabel },
  previewActions: { flexDirection: 'row', gap: iOS.spacing.md },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorTextWhite: { ...iOS.typography.body, color: 'rgba(255, 255, 255, 0.8)', marginTop: iOS.spacing.lg },
});

export default IDScannerScreen;
