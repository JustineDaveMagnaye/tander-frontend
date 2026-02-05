/**
 * iOS Design System for ID Scanner
 * Shared design tokens used across LivenessVerification and IDDocumentScanner
 */

import { Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;

// Frame dimensions
export const FACE_FRAME_SIZE = Math.min(SCREEN_WIDTH * 0.65, 260);
export const RING_STROKE = 4;
export const RING_RADIUS = (FACE_FRAME_SIZE - RING_STROKE * 2) / 2;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ID Frame dimensions
export const ID_FRAME_WIDTH = SCREEN_WIDTH * 0.85;
export const ID_FRAME_HEIGHT = ID_FRAME_WIDTH * 0.63;

// Timing
export const FACE_HOLD_TIME = 2000;

// iOS Design System (matching OTPVerificationScreen)
export const iOS = {
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

// Types
export type FaceDirection = 'left-skewed' | 'right-skewed' | 'frontal' | 'unknown';
export type FaceDetectionStatus = 'success' | 'standby' | 'no_face' | 'error';
export type FaceState = 'idle' | 'searching' | 'detected' | 'verifying' | 'verified';
export type LivenessStage = 'center' | 'hold';
export type ScanStep = 'selfie' | 'front' | 'preview';

// Helper to convert yaw angle to face direction
export const getDirectionFromYaw = (yaw: number): FaceDirection => {
  'worklet';
  if (yaw < -25) return 'left-skewed';
  if (yaw > 25) return 'right-skewed';
  return 'frontal';
};
