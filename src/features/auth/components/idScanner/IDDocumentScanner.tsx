/**
 * ID Document Scanner Component
 * Handles ID card capture, OCR processing, and backend verification
 *
 * Features:
 * - Animated scan line effect
 * - Corner guides for ID positioning
 * - On-device OCR via ML Kit
 * - Backend verification with fraud detection
 * - Age verification with rejection modals
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  ActivityIndicator,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Camera, PhotoFile } from 'react-native-vision-camera';

import { extractDOBFromID, OCRResult, toFrontendOcrData } from '@/services/ocr/idOcrService';
import { verifyIdPreRegister, PreRegisterIdVerificationResponse } from '@/services/api/authApi';
import { AgeRejectionModal, AgeRejectionData } from '../AgeRejectionModal';
import { FraudRejectionModal, FraudRejectionData } from '../FraudRejectionModal';

import {
  iOS,
  ID_FRAME_WIDTH,
  ID_FRAME_HEIGHT,
  SCREEN_WIDTH,
} from './idScannerDesignSystem';

// ============================================================================
// ID FRAME COMPONENT
// ============================================================================
export const IDFrame: React.FC = () => {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, ID_FRAME_HEIGHT - 4],
  });

  const scanOpacity = scanAnim.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={[styles.idFrame, { width: ID_FRAME_WIDTH, height: ID_FRAME_HEIGHT }]}>
      {/* Corner guides */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* Scan line animation */}
      <Animated.View
        style={[
          styles.scanLine,
          { transform: [{ translateY: scanTranslate }], opacity: scanOpacity },
        ]}
      >
        <LinearGradient
          colors={['transparent', iOS.colors.orange, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Center hint */}
      <View style={styles.idFrameCenter}>
        <Feather name="credit-card" size={32} color="rgba(255,255,255,0.5)" />
        <Text style={styles.idFrameHint}>Position ID here</Text>
      </View>
    </View>
  );
};

// ============================================================================
// ID DOCUMENT SCANNER HOOK
// ============================================================================
interface UseIDDocumentScannerProps {
  cameraRef: React.RefObject<Camera>;
  isCameraReady: boolean;
  isActive: boolean;
  minimumAge: number;
  onSuccess: (photo: PhotoFile, ocrResult: OCRResult) => void;
  onFeedback: (type: 'error' | 'success' | 'info' | 'warning', message: string, duration?: number) => void;
}

interface UseIDDocumentScannerResult {
  isCapturing: boolean;
  isOcrProcessing: boolean;
  isBackendVerifying: boolean;
  ocrResult: OCRResult | null;
  showAgeRejectionModal: boolean;
  ageRejectionData: AgeRejectionData | null;
  showFraudModal: boolean;
  fraudRejectionData: FraudRejectionData | null;
  handleCapture: () => Promise<void>;
  handleAgeRejectionRetake: () => void;
  handleAgeRejectionClose: () => void;
  handleFraudRetake: () => void;
  handleFraudClose: () => void;
  resetScanner: () => void;
}

export const useIDDocumentScanner = ({
  cameraRef,
  isCameraReady,
  isActive,
  minimumAge,
  onSuccess,
  onFeedback,
}: UseIDDocumentScannerProps): UseIDDocumentScannerResult => {
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = React.useState(false);
  const [isBackendVerifying, setIsBackendVerifying] = React.useState(false);
  const [ocrResult, setOcrResult] = React.useState<OCRResult | null>(null);
  const [frontPhoto, setFrontPhoto] = React.useState<PhotoFile | null>(null);

  const [showAgeRejectionModal, setShowAgeRejectionModal] = React.useState(false);
  const [ageRejectionData, setAgeRejectionData] = React.useState<AgeRejectionData | null>(null);
  const [showFraudModal, setShowFraudModal] = React.useState(false);
  const [fraudRejectionData, setFraudRejectionData] = React.useState<FraudRejectionData | null>(null);

  const lastHapticTime = useRef<number>(0);

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
    // Backend sends: { detected, flags, reasoning, riskLevel, confidenceScore, auditId }
    setFraudRejectionData({
      auditId: data?.auditId ?? null,
      riskLevel: data?.riskLevel ?? data?.fraudAnalysis?.riskLevel ?? null,
      recommendation: data?.recommendation ?? data?.fraudAnalysis?.recommendation ?? 'REJECT',
    });
    setShowFraudModal(true);
  }, []);

  const resetScanner = useCallback(() => {
    setFrontPhoto(null);
    setOcrResult(null);
    setAgeRejectionData(null);
    setFraudRejectionData(null);
    setIsOcrProcessing(false);
    setIsBackendVerifying(false);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing || !isCameraReady || !isActive) return;

    setIsCapturing(true);
    triggerHaptic('medium');

    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      if (!photo) {
        setIsCapturing(false);
        return;
      }

      setFrontPhoto(photo);
      setIsOcrProcessing(true);

      // Run OCR
      const ocrRes = await extractDOBFromID(`file://${photo.path}`, minimumAge);
      setIsOcrProcessing(false);
      setOcrResult(ocrRes);

      if (!ocrRes.success) {
        onFeedback('error', ocrRes.errorMessage || 'Could not read ID. Ensure good lighting and try again');
        setFrontPhoto(null);
        triggerHaptic('error');
        setIsCapturing(false);
        return;
      }

      // Frontend age check
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
        setIsCapturing(false);
        return;
      }

      // Backend verification
      setIsBackendVerifying(true);
      try {
        const photoFile = {
          uri: `file://${photo.path}`,
          type: 'image/jpeg',
          name: 'id_front.jpg',
        } as any;
        const frontendOcrData = toFrontendOcrData(ocrRes);
        const backendRes = await verifyIdPreRegister(photoFile, frontendOcrData);
        setIsBackendVerifying(false);

        // Handle retake recommendation
        if (backendRes.data?.recommendation === 'RETAKE_PHOTO') {
          onFeedback('warning', backendRes.data.retakeGuidance || 'For better results, take a clearer photo', 0);
        }

        // Handle fraud detection
        if (backendRes.code === 'FRAUD_DETECTED') {
          handleFraudDetected(backendRes.data);
          triggerHaptic('error');
          setIsCapturing(false);
          return;
        }

        // Handle review flag
        if (backendRes.data?.fraudAnalysis?.recommendation === 'REVIEW') {
          onFeedback('info', 'Your ID will undergo additional review. You may continue', 0);
        }

        // Handle age rejection from backend
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
          setIsCapturing(false);
          return;
        }

        // Success!
        triggerHaptic('success');
        AccessibilityInfo.announceForAccessibility('ID verified successfully');
        onFeedback('success', 'ID verified successfully!');
        onSuccess(photo, ocrRes);

      } catch (backendError: any) {
        setIsBackendVerifying(false);
        console.error('Backend verification error:', backendError);

        if (backendError?.code === 'FRAUD_DETECTED') {
          handleFraudDetected(backendError?.data);
          triggerHaptic('error');
          setIsCapturing(false);
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
          setIsCapturing(false);
          return;
        }

        onFeedback('error', backendError?.message || 'Verification failed. Please try again');
        triggerHaptic('error');
      }
    } catch (error) {
      console.error('Capture error:', error);
      onFeedback('error', 'Capture failed. Please try again');
      triggerHaptic('error');
      setIsOcrProcessing(false);
      setIsBackendVerifying(false);
    } finally {
      setIsCapturing(false);
    }
  }, [cameraRef, isCapturing, isCameraReady, isActive, minimumAge, triggerHaptic, onFeedback, onSuccess, handleFraudDetected]);

  const handleAgeRejectionRetake = useCallback(() => {
    setShowAgeRejectionModal(false);
    resetScanner();
  }, [resetScanner]);

  const handleAgeRejectionClose = useCallback(() => {
    setShowAgeRejectionModal(false);
    setAgeRejectionData(null);
  }, []);

  const handleFraudRetake = useCallback(() => {
    setShowFraudModal(false);
    resetScanner();
  }, [resetScanner]);

  const handleFraudClose = useCallback(() => {
    setShowFraudModal(false);
    setFraudRejectionData(null);
  }, []);

  return {
    isCapturing,
    isOcrProcessing,
    isBackendVerifying,
    ocrResult,
    showAgeRejectionModal,
    ageRejectionData,
    showFraudModal,
    fraudRejectionData,
    handleCapture,
    handleAgeRejectionRetake,
    handleAgeRejectionClose,
    handleFraudRetake,
    handleFraudClose,
    resetScanner,
  };
};

// ============================================================================
// CAPTURE BUTTON COMPONENT
// ============================================================================
interface CaptureButtonProps {
  onPress: () => void;
  disabled: boolean;
  isCapturing: boolean;
}

export const CaptureButton: React.FC<CaptureButtonProps> = ({
  onPress,
  disabled,
  isCapturing,
}) => (
  <View style={styles.captureSection}>
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.captureButton,
        pressed && styles.captureButtonPressed,
        disabled && styles.captureButtonDisabled,
      ]}
    >
      {isCapturing ? (
        <ActivityIndicator color={iOS.colors.orange} size="small" />
      ) : (
        <View style={styles.captureButtonInner} />
      )}
    </Pressable>
    <Text style={styles.captureHint}>Tap to capture</Text>
  </View>
);

// ============================================================================
// MODALS WRAPPER COMPONENT
// ============================================================================
interface IDScannerModalsProps {
  showAgeRejectionModal: boolean;
  ageRejectionData: AgeRejectionData | null;
  minimumAge: number;
  onAgeRejectionClose: () => void;
  onAgeRejectionRetake: () => void;
  showFraudModal: boolean;
  fraudRejectionData: FraudRejectionData | null;
  onFraudClose: () => void;
  onFraudRetake: () => void;
}

export const IDScannerModals: React.FC<IDScannerModalsProps> = ({
  showAgeRejectionModal,
  ageRejectionData,
  minimumAge,
  onAgeRejectionClose,
  onAgeRejectionRetake,
  showFraudModal,
  fraudRejectionData,
  onFraudClose,
  onFraudRetake,
}) => (
  <>
    <AgeRejectionModal
      visible={showAgeRejectionModal}
      data={ageRejectionData}
      minimumAge={minimumAge}
      onClose={onAgeRejectionClose}
      onRetake={onAgeRejectionRetake}
    />
    <FraudRejectionModal
      visible={showFraudModal}
      data={fraudRejectionData}
      onClose={onFraudClose}
      onRetake={onFraudRetake}
    />
  </>
);

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  idFrame: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: iOS.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: iOS.colors.orange,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: iOS.radius.xl,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: iOS.radius.xl,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: iOS.radius.xl,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: iOS.radius.xl,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 3,
    borderRadius: 2,
  },
  idFrameCenter: {
    alignItems: 'center',
  },
  idFrameHint: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: iOS.spacing.sm,
  },
  captureSection: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: iOS.spacing.md,
  },
  captureButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  captureHint: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default IDFrame;
