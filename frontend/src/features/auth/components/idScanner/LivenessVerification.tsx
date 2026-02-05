/**
 * Liveness Verification Component
 * Handles face detection and liveness check for identity verification
 *
 * Features:
 * - Real-time face detection using ML Kit
 * - Progressive ring animation during hold
 * - Automatic selfie capture on success
 * - Haptic feedback at progress milestones
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  PhotoFile,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {
  useFaceDetector,
  FaceDetectionOptions,
} from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';

import {
  iOS,
  FACE_FRAME_SIZE,
  RING_STROKE,
  RING_RADIUS,
  RING_CIRCUMFERENCE,
  FACE_HOLD_TIME,
  FaceState,
  LivenessStage,
  FaceDirection,
  FaceDetectionStatus,
  getDirectionFromYaw,
} from './idScannerDesignSystem';

// Face detection configuration
const faceDetectionOptions: FaceDetectionOptions = {
  performanceMode: 'fast',
  landmarkMode: 'none',
  contourMode: 'none',
  classificationMode: 'none',
  minFaceSize: 0.15,
  trackingEnabled: true,
};

// ============================================================================
// FACE FRAME COMPONENT
// ============================================================================
interface FaceFrameProps {
  faceState: FaceState;
  progress: number;
}

export const FaceFrame: React.FC<FaceFrameProps> = ({ faceState, progress }) => {
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
        {/* Base ring */}
        <Svg width={FACE_FRAME_SIZE} height={FACE_FRAME_SIZE} style={styles.frameSvg}>
          <Circle
            cx={FACE_FRAME_SIZE / 2}
            cy={FACE_FRAME_SIZE / 2}
            r={RING_RADIUS}
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth={2}
            fill="none"
          />
        </Svg>

        {/* Searching animation */}
        {faceState === 'searching' && (
          <Animated.View style={[styles.absoluteFrame, { transform: [{ rotate: rotateInterpolate }] }]}>
            <Svg width={FACE_FRAME_SIZE} height={FACE_FRAME_SIZE}>
              <Defs>
                <SvgLinearGradient id="searchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={stateColor} stopOpacity="0" />
                  <Stop offset="50%" stopColor={stateColor} stopOpacity="1" />
                  <Stop offset="100%" stopColor={stateColor} stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Circle
                cx={FACE_FRAME_SIZE / 2}
                cy={FACE_FRAME_SIZE / 2}
                r={RING_RADIUS}
                stroke="url(#searchGrad)"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        )}

        {/* Detected/Verifying background ring */}
        {(faceState === 'detected' || faceState === 'verifying') && (
          <Svg width={FACE_FRAME_SIZE} height={FACE_FRAME_SIZE} style={styles.frameSvg}>
            <Circle
              cx={FACE_FRAME_SIZE / 2}
              cy={FACE_FRAME_SIZE / 2}
              r={RING_RADIUS}
              stroke={stateColor}
              strokeWidth={RING_STROKE}
              strokeOpacity={0.3}
              fill="none"
            />
          </Svg>
        )}

        {/* Progress ring */}
        {faceState === 'verifying' && progress > 0 && (
          <View style={[styles.absoluteFrame, { transform: [{ rotate: '-90deg' }] }]}>
            <Svg width={FACE_FRAME_SIZE} height={FACE_FRAME_SIZE}>
              <Circle
                cx={FACE_FRAME_SIZE / 2}
                cy={FACE_FRAME_SIZE / 2}
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

        {/* Verified ring */}
        {faceState === 'verified' && (
          <Svg width={FACE_FRAME_SIZE} height={FACE_FRAME_SIZE} style={styles.frameSvg}>
            <Circle
              cx={FACE_FRAME_SIZE / 2}
              cy={FACE_FRAME_SIZE / 2}
              r={RING_RADIUS}
              stroke={iOS.colors.green}
              strokeWidth={RING_STROKE + 2}
              fill="none"
            />
          </Svg>
        )}

        {/* Center icon */}
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
// LIVENESS VERIFICATION HOOK
// ============================================================================
interface UseLivenessVerificationProps {
  cameraRef: React.RefObject<Camera>;
  isCameraReady: boolean;
  isActive: boolean;
  onComplete: (photo: PhotoFile) => void;
  onError: (error: string) => void;
}

interface UseLivenessVerificationResult {
  faceState: FaceState;
  faceProgress: number;
  livenessStage: LivenessStage;
  frameProcessor: ReturnType<typeof useFrameProcessor>;
  resetLiveness: () => void;
  getStatusText: () => string;
}

export const useLivenessVerification = ({
  cameraRef,
  isCameraReady,
  isActive,
  onComplete,
  onError,
}: UseLivenessVerificationProps): UseLivenessVerificationResult => {
  const { detectFaces } = useFaceDetector(faceDetectionOptions);

  const [faceState, setFaceState] = React.useState<FaceState>('searching');
  const [faceProgress, setFaceProgress] = React.useState(0);
  const [livenessStage, setLivenessStage] = React.useState<LivenessStage>('center');
  const [isCapturing, setIsCapturing] = React.useState(false);

  const faceStableStartTime = useRef<number | null>(null);
  const lastHapticTime = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        onComplete(photo);
      }
    } catch (error) {
      console.error('Liveness capture error:', error);
      onError('Capture failed. Please try again');
      triggerHaptic('error');
      resetLiveness();
    } finally {
      setIsCapturing(false);
    }
  }, [cameraRef, isCameraReady, isCapturing, triggerHaptic, onComplete, onError, resetLiveness]);

  const handleFaceDetectionResult = Worklets.createRunOnJS(
    (status: FaceDetectionStatus, faceDirection?: FaceDirection) => {
      if (!isActive || isCapturing) return;

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

              // Haptic feedback at milestones
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

  const getStatusText = useCallback(() => {
    if (faceState === 'verified') return 'Verified!';
    if (faceState === 'verifying') return `Hold still... ${Math.round(faceProgress)}%`;
    if (faceState === 'detected') return 'Face forward';
    if (faceState === 'searching') return 'Looking for your face...';
    return 'Position your face in the circle';
  }, [faceState, faceProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return {
    faceState,
    faceProgress,
    livenessStage,
    frameProcessor,
    resetLiveness,
    getStatusText,
  };
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  faceFrameContainer: {
    width: FACE_FRAME_SIZE,
    height: FACE_FRAME_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrameInner: {
    width: FACE_FRAME_SIZE,
    height: FACE_FRAME_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameSvg: {
    position: 'absolute',
  },
  absoluteFrame: {
    position: 'absolute',
  },
  frameCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FaceFrame;
