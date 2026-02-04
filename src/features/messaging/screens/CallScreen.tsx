/**
 * TANDER CallScreen - Fully Responsive Cross-Platform Design
 * Senior-Friendly Calling Interface for 60+ Users
 *
 * Features:
 * - FULLY RESPONSIVE: Adapts to all screen sizes from 320px to 1280px+
 * - LANDSCAPE-FRIENDLY: Horizontal layout in landscape, vertical in portrait
 * - CROSS-PLATFORM: Android API 21+, iOS 11+ with platform-specific optimizations
 * - SENIOR-FRIENDLY: 56-64px touch targets, 18px+ text, high contrast
 * - ACCESSIBLE: WCAG AAA compliant, voice guidance, screen reader support
 *
 * Layout Modes:
 * - Portrait (phone): Vertical stack - avatar top, name, timer, controls bottom
 * - Portrait (tablet): Similar with more spacing and larger elements
 * - Landscape (phone): Side-by-side - avatar/info left (40%), controls right (60%)
 * - Landscape (tablet): Spacious side-by-side layout with optimal proportions
 *
 * Breakpoints:
 * - Small phones: 320px width (iPhone SE, small Android)
 * - Regular phones: 375-414px width (iPhone 8, standard Android)
 * - Large phones/phablets: 428px+ width (iPhone Pro Max)
 * - Tablets: 768px+ width (iPad Mini, Android tablets)
 * - Large tablets: 1024px+ (iPad Pro, large Android tablets)
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Animated,
  Text,
  Platform,
  PermissionsAndroid,
  Linking,
  TouchableWithoutFeedback,
  Pressable,
  BackHandler,
  AccessibilityInfo,
  Easing,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { Feather } from '@expo/vector-icons';
import { spacing, borderRadius, touchTargets } from '@shared/styles/spacing';
import { useResponsive, BREAKPOINTS } from '@shared/hooks/useResponsive';
import { useTwilioCall, CallEndReason } from '../hooks/useTwilioCall';
import { useChat, CallMessageType } from '../hooks/useChat';
import type { CallType } from '@services/api/twilioApi';

// ============================================================================
// PERMISSION IMPORTS - Graceful fallback for older platforms
// ============================================================================
let Audio: { requestPermissionsAsync?: () => Promise<{ status: string; canAskAgain?: boolean }> } | null = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  console.warn('[CallScreen] expo-av not available');
}

let Camera: { requestCameraPermissionsAsync?: () => Promise<{ status: string; canAskAgain?: boolean }> } | null = null;
try {
  Camera = require('expo-camera').Camera;
} catch (e) {
  console.warn('[CallScreen] expo-camera not available');
}

// ============================================================================
// TYPES
// ============================================================================
interface CallScreenParams {
  conversationId: string;
  userId: number | string;
  userName: string;
  userPhoto?: string;
  callType: CallType;
  isIncoming: boolean;
  roomName?: string;
}

type CallScreenRouteProp = RouteProp<{ Call: CallScreenParams }, 'Call'>;

interface PermissionResult {
  success: boolean;
  error?: {
    type: 'microphone' | 'camera';
    title: string;
    message: string;
  };
}

// Responsive sizing configuration
interface ResponsiveSizes {
  avatar: number;
  button: number;
  endCallButton: number;
  nameFont: number;
  statusFont: number;
  timerFont: number;
  labelFont: number;
  iconSize: number;
  buttonGap: number;
  sectionGap: number;
  pipWidth: number;
  pipHeight: number;
}

// ============================================================================
// CONSTANTS - Platform & Version Detection
// ============================================================================
const IS_IOS = Platform.OS === 'ios';
const IS_ANDROID = Platform.OS === 'android';
const PLATFORM_VERSION = typeof Platform.Version === 'string'
  ? parseFloat(Platform.Version)
  : Platform.Version;

const IOS_SHADOW_LARGE = IS_IOS ? {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.28,
  shadowRadius: 24,
} : {};

const IOS_SHADOW_MEDIUM = IS_IOS ? {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.22,
  shadowRadius: 16,
} : {};

const IOS_SHADOW_SMALL = IS_IOS ? {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.18,
  shadowRadius: 12,
} : {};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getStreamUrl = (stream: any): string | null => {
  try {
    if (!stream) return null;
    const tracks = stream.getTracks?.();
    if (!tracks || tracks.length === 0) return null;
    const hasLiveTrack = tracks.some((track: any) => track.readyState === 'live');
    if (!hasLiveTrack) return null;
    return stream.toURL();
  } catch (e) {
    console.warn('[CallScreen] Failed to get stream URL:', e);
    return null;
  }
};

const safeNavigateBack = (navigation: any): void => {
  try {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    const parent = navigation.getParent?.();
    if (parent?.canGoBack?.()) {
      parent.goBack();
      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'ConversationsList' }],
      })
    );
  } catch (e) {
    console.warn('[CallScreen] Navigation error:', e);
  }
};

async function checkCallPermissions(callType: CallType): Promise<PermissionResult> {
  try {
    // Normalize callType: frontend uses 'voice'/'video', backend uses 'AUDIO'/'VIDEO'
    const isAudioOnly = callType === 'AUDIO' || callType.toLowerCase() === 'voice';

    if (IS_ANDROID) {
      // Android permission handling with version-specific logic
      const audioAlreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      const cameraAlreadyGranted = isAudioOnly || await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );

      if (audioAlreadyGranted && cameraAlreadyGranted) {
        return { success: true };
      }

      const permissionsToRequest: string[] = [];
      if (!audioAlreadyGranted) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      }
      if (!isAudioOnly && !cameraAlreadyGranted) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.CAMERA);
      }

      if (permissionsToRequest.length > 0) {
        const results = await PermissionsAndroid.requestMultiple(
          permissionsToRequest as Array<typeof PermissionsAndroid.PERMISSIONS.RECORD_AUDIO>
        );

        const audioGranted = audioAlreadyGranted ||
          results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
        const videoGranted = isAudioOnly || cameraAlreadyGranted ||
          results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;

        if (!audioGranted) {
          return {
            success: false,
            error: {
              type: 'microphone',
              title: 'Microphone Access Needed',
              message: 'Please allow microphone access to make calls.',
            },
          };
        }

        if (!videoGranted) {
          return {
            success: false,
            error: {
              type: 'camera',
              title: 'Camera Access Needed',
              message: 'Please allow camera access for video calls.',
            },
          };
        }
      }

      return { success: true };
    } else {
      // iOS permission handling
      if (Audio && Audio.requestPermissionsAsync) {
        const audioPermission = await Audio.requestPermissionsAsync();
        if (audioPermission.status !== 'granted') {
          return {
            success: false,
            error: {
              type: 'microphone',
              title: 'Microphone Access Needed',
              message: 'Please allow microphone access to make calls.',
            },
          };
        }
      }

      if (!isAudioOnly && Camera && Camera.requestCameraPermissionsAsync) {
        const cameraPermission = await Camera.requestCameraPermissionsAsync();
        if (cameraPermission.status !== 'granted') {
          return {
            success: false,
            error: {
              type: 'camera',
              title: 'Camera Access Needed',
              message: 'Please allow camera access for video calls.',
            },
          };
        }
      }

      return { success: true };
    }
  } catch (error) {
    console.warn('[CallScreen] Permission check error:', error);
    return { success: false };
  }
}

const getFriendlyErrorMessage = (technicalMessage: string): string => {
  const message = technicalMessage.toLowerCase();
  if (message.includes('ended by remote') || message.includes('hangup')) return 'Call ended';
  if (message.includes('rejected') || message.includes('declined')) return 'Call was declined';
  if (message.includes('busy')) return 'User is busy';
  if (message.includes('no answer') || message.includes('timeout') || message.includes('unanswered')) return 'No answer';
  if (message.includes('cancelled')) return 'Call cancelled';
  if (message.includes('connection failed') || message.includes('unable to establish')) return 'Could not connect';
  if (message.includes('connection lost') || message.includes('unable to reconnect')) return 'Connection lost';
  if (message.includes('network') || message.includes('internet')) return 'Check your connection';
  if (message.includes('camera disconnected')) return 'Camera disconnected';
  if (message.includes('microphone disconnected')) return 'Microphone disconnected';
  if (message.includes('permission')) return 'Permission required';
  if (message.includes('failed') || message.includes('error')) return 'Call ended';
  if (technicalMessage.length < 25) return technicalMessage;
  return 'Call ended';
};

// ============================================================================
// RESPONSIVE SIZE CALCULATOR
// Calculates all UI element sizes based on screen dimensions and orientation
// Supports all screen sizes from 320px (small phones) to 1280px+ (large tablets)
// ============================================================================
const calculateResponsiveSizes = (
  width: number,
  height: number,
  isLandscape: boolean,
  isTablet: boolean,
  moderateScale: (size: number, factor?: number) => number,
  hp: (percentage: number) => number,
  wp: (percentage: number) => number
): ResponsiveSizes => {
  // Determine screen category for fine-grained control
  const isSmallPhone = width < BREAKPOINTS.phone; // < 375px (iPhone SE, small Android)
  const isLargePhone = width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet; // 414-767px
  const isLargeTablet = width >= BREAKPOINTS.largeTablet; // 1024px+ (iPad Pro)

  if (isLandscape) {
    // ============================================================================
    // LANDSCAPE SIZING - Height-constrained, horizontal layout
    // ============================================================================
    const availableHeight = height;
    const availableWidth = width;

    // Avatar: Constrained by height in landscape
    // Use smaller of: 30% of height, 18% of width, or max size for device class
    const maxAvatarForDevice = isLargeTablet ? 200 : isTablet ? 180 : isLargePhone ? 140 : isSmallPhone ? 100 : 120;
    const avatar = Math.min(
      Math.floor(availableHeight * 0.30),
      Math.floor(availableWidth * 0.18),
      maxAvatarForDevice
    );

    // Buttons: Fit vertically while maintaining senior-friendly sizes (min 56px)
    const maxButtonForDevice = isLargeTablet ? 80 : isTablet ? 72 : isLargePhone ? 68 : 64;
    const button = Math.max(
      touchTargets.comfortable, // 56px minimum for seniors
      Math.min(
        Math.floor(availableHeight * 0.14),
        Math.floor(availableWidth * 0.08),
        maxButtonForDevice
      )
    );

    // End call button: Slightly larger than control buttons
    const maxEndCallForDevice = isLargeTablet ? 96 : isTablet ? 88 : isLargePhone ? 80 : 76;
    const endCallButton = Math.max(
      touchTargets.large, // 64px minimum
      Math.min(
        Math.floor(availableHeight * 0.18),
        Math.floor(availableWidth * 0.10),
        maxEndCallForDevice
      )
    );

    // Typography: Scale down for landscape to fit content
    // Minimum 18px for senior readability
    const nameFontMax = isLargeTablet ? 36 : isTablet ? 32 : isLargePhone ? 28 : isSmallPhone ? 22 : 24;
    const nameFont = Math.max(20, Math.min(Math.floor(availableHeight * 0.07), nameFontMax));

    const statusFontMax = isTablet ? 20 : 18;
    const statusFont = Math.max(16, Math.min(Math.floor(availableHeight * 0.045), statusFontMax));

    const timerFontMax = isTablet ? 22 : 20;
    const timerFont = Math.max(18, Math.min(Math.floor(availableHeight * 0.05), timerFontMax));

    const labelFont = Math.max(14, Math.min(Math.floor(availableHeight * 0.035), 16));

    // Icon size relative to button
    const iconSize = Math.floor(button * 0.42);

    // Gaps: Tighter in landscape to fit content
    const buttonGap = Math.max(12, Math.min(Math.floor(availableWidth * 0.02), spacing.m));
    const sectionGap = Math.max(16, Math.min(Math.floor(availableWidth * 0.03), spacing.l));

    // PiP (Picture-in-Picture) for video calls - smaller in landscape
    const pipWidth = Math.min(Math.floor(availableWidth * 0.12), 120);
    const pipHeight = Math.min(Math.floor(availableHeight * 0.30), 160);

    return {
      avatar,
      button,
      endCallButton,
      nameFont,
      statusFont,
      timerFont,
      labelFont,
      iconSize,
      buttonGap,
      sectionGap,
      pipWidth,
      pipHeight,
    };
  } else {
    // ============================================================================
    // PORTRAIT SIZING - Width-constrained, vertical layout
    // ============================================================================

    // Avatar: Scale based on width for portrait
    const avatarBase = isLargeTablet ? 220 : isTablet ? 200 : isLargePhone ? 180 : isSmallPhone ? 130 : 160;
    const avatar = moderateScale(avatarBase, 0.4);

    // Buttons: Comfortable size for seniors (56-64px minimum)
    const buttonBase = isLargeTablet ? 80 : isTablet ? 76 : isLargePhone ? 72 : isSmallPhone ? 64 : 68;
    const button = Math.max(touchTargets.comfortable, moderateScale(buttonBase, 0.3));

    // End call button: Prominent for easy access
    const endCallBase = isLargeTablet ? 104 : isTablet ? 96 : isLargePhone ? 92 : isSmallPhone ? 80 : 88;
    const endCallButton = Math.max(touchTargets.large, moderateScale(endCallBase, 0.3));

    // Typography: Larger in portrait for readability
    // Senior-friendly: minimum 18px for body text
    const nameFontBase = isLargeTablet ? 44 : isTablet ? 40 : isLargePhone ? 36 : isSmallPhone ? 28 : 32;
    const nameFont = Math.max(24, moderateScale(nameFontBase, 0.3));

    const statusFontBase = isTablet ? 22 : 20;
    const statusFont = Math.max(18, moderateScale(statusFontBase, 0.3));

    const timerFontBase = isTablet ? 28 : 24;
    const timerFont = Math.max(20, moderateScale(timerFontBase, 0.3));

    const labelFontBase = isTablet ? 18 : 16;
    const labelFont = Math.max(14, moderateScale(labelFontBase, 0.3));

    // Icon size relative to button
    const iconSize = Math.floor(button * 0.42);

    // Gaps: More generous in portrait
    const buttonGap = isTablet ? spacing.xl : isSmallPhone ? spacing.m : spacing.l;
    const sectionGap = isTablet ? spacing.xxl : spacing.xl;

    // PiP for video calls
    const pipWidth = isTablet ? 140 : isSmallPhone ? 100 : 120;
    const pipHeight = isTablet ? 180 : isSmallPhone ? 130 : 160;

    return {
      avatar,
      button,
      endCallButton,
      nameFont,
      statusFont,
      timerFont,
      labelFont,
      iconSize,
      buttonGap,
      sectionGap,
      pipWidth,
      pipHeight,
    };
  }
};

// ============================================================================
// ANIMATED PULSE RINGS - Modern Wave Effect for Ringing State
// ============================================================================
const PulseRings: React.FC<{ isActive: boolean; size: number }> = React.memo(({ isActive, size }) => {
  const pulses = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  useEffect(() => {
    if (!isActive) return;

    const animations = pulses.map((pulse, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 600),
          Animated.timing(pulse, {
            toValue: 2.5,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    );

    animations.forEach(anim => anim.start());
    return () => animations.forEach(anim => anim.stop());
  }, [isActive]);

  if (!isActive) return null;

  return (
    <>
      {pulses.map((pulse, i) => {
        const opacity = pulse.interpolate({
          inputRange: [1, 2.5],
          outputRange: [0.7, 0],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.pulseRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                transform: [{ scale: pulse }],
                opacity,
              },
            ]}
          />
        );
      })}
    </>
  );
});

PulseRings.displayName = 'PulseRings';

// ============================================================================
// MODERN CONTROL BUTTON - Senior-Friendly with Responsive Sizing
// Minimum touch target: 56px (WCAG AAA + senior-friendly)
// ============================================================================
interface ModernControlButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  isActive?: boolean;
  variant?: 'primary' | 'danger' | 'success';
  size: number;
  iconSize: number;
  labelSize: number;
  compact?: boolean;
}

const ModernControlButton: React.FC<ModernControlButtonProps> = React.memo(({
  icon,
  label,
  onPress,
  isActive = false,
  variant = 'primary',
  size,
  iconSize,
  labelSize,
  compact = false,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  // Ensure minimum touch target (56px for seniors)
  const effectiveSize = Math.max(size, touchTargets.comfortable);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.85,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const getColors = (): [string, string] => {
    if (variant === 'danger') return ['#EF4444', '#DC2626'];
    if (variant === 'success') return ['#10B981', '#059669'];
    return isActive ? ['#F97316', '#EA580C'] : ['#475569', '#374151'];
  };

  const buttonStyle: ViewStyle = {
    width: effectiveSize,
    height: effectiveSize,
    borderRadius: effectiveSize / 2,
  };

  const labelStyle: TextStyle = {
    fontSize: Math.max(labelSize, 14), // Minimum 14px for readability
    marginTop: compact ? spacing.xxs : spacing.xs,
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible={true}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityHint={`${isActive ? 'Deactivate' : 'Activate'} ${label}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <LinearGradient
          colors={getColors()}
          style={[styles.modernButton, buttonStyle]}
        >
          <Feather name={icon as any} size={iconSize} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[styles.modernButtonLabel, labelStyle]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

ModernControlButton.displayName = 'ModernControlButton';

// ============================================================================
// PERMISSION ERROR MODAL - Responsive Design
// ============================================================================
interface PermissionErrorProps {
  error: { type: 'microphone' | 'camera'; title: string; message: string };
  onOpenSettings: () => void;
  onDismiss: () => void;
  isLandscape: boolean;
  isTablet: boolean;
}

const PermissionError: React.FC<PermissionErrorProps> = React.memo(({
  error,
  onOpenSettings,
  onDismiss,
  isLandscape,
  isTablet,
}) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Responsive card sizing
  const cardMaxWidth = isTablet ? 480 : isLandscape ? 400 : 380;
  const iconSize = isTablet ? 120 : isLandscape ? 90 : 100;
  const titleFontSize = isTablet ? 28 : isLandscape ? 22 : 24;
  const messageFontSize = isTablet ? 19 : isLandscape ? 16 : 17;
  const buttonFontSize = isTablet ? 19 : 17;
  const buttonHeight = isTablet ? 64 : 56;

  return (
    <Animated.View style={[styles.permissionOverlay, { opacity: fade }]}>
      <Animated.View
        style={[
          styles.permissionCard,
          {
            maxWidth: cardMaxWidth,
            transform: [{ translateY: slideUp }],
            padding: isTablet ? spacing.xxxl : spacing.xxl,
          }
        ]}
      >
        <LinearGradient
          colors={['#F97316', '#14B8A6']}
          style={[styles.permissionIcon, { width: iconSize, height: iconSize, borderRadius: iconSize / 2 }]}
        >
          <Feather
            name={error.type === 'microphone' ? 'mic-off' : 'camera-off'}
            size={iconSize * 0.48}
            color="#FFFFFF"
          />
        </LinearGradient>

        <Text style={[styles.permissionTitle, { fontSize: titleFontSize }]}>
          {error.title}
        </Text>
        <Text style={[styles.permissionMessage, { fontSize: messageFontSize }]}>
          {error.message}
        </Text>

        <View style={styles.permissionButtons}>
          <TouchableOpacity
            onPress={onDismiss}
            style={[styles.permissionButton, styles.permissionButtonSecondary, { minHeight: buttonHeight }]}
            accessible={true}
            accessibilityLabel="Cancel"
            accessibilityRole="button"
          >
            <Text style={[styles.permissionButtonTextSecondary, { fontSize: buttonFontSize }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenSettings}
            style={styles.permissionButton}
            accessible={true}
            accessibilityLabel="Open Settings"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#F97316', '#14B8A6']}
              style={[styles.permissionButtonPrimary, { minHeight: buttonHeight }]}
            >
              <Feather name="settings" size={buttonFontSize + 1} color="#FFFFFF" />
              <Text style={[styles.permissionButtonText, { fontSize: buttonFontSize }]}>
                Settings
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

PermissionError.displayName = 'PermissionError';

// ============================================================================
// ERROR TOAST - Responsive Design with Safe Area Support
// ============================================================================
interface ErrorToastProps {
  message: string;
  insetTop: number;
  isLandscape: boolean;
}

const ErrorToast: React.FC<ErrorToastProps> = React.memo(({ message, insetTop, isLandscape }) => {
  const slideDown = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.spring(slideDown, {
      toValue: 0,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const topPosition = insetTop + (isLandscape ? spacing.s : spacing.l);

  return (
    <Animated.View
      style={[
        styles.errorToast,
        {
          top: topPosition,
          transform: [{ translateY: slideDown }],
        }
      ]}
    >
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        style={styles.errorToastContent}
      >
        <Feather name="alert-circle" size={20} color="#FFFFFF" />
        <Text style={styles.errorToastText}>{getFriendlyErrorMessage(message)}</Text>
      </LinearGradient>
    </Animated.View>
  );
});

ErrorToast.displayName = 'ErrorToast';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const CallScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CallScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const {
    width,
    height,
    isLandscape,
    isTablet,
    moderateScale,
    hp,
    wp,
    isSmallScreen,
    getScreenMargin,
  } = useResponsive();

  const { userId, userName, userPhoto, callType, isIncoming, roomName } = route.params;
  const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  // Normalize callType check: frontend uses 'voice'/'video', backend uses 'AUDIO'/'VIDEO'
  const isAudioCall = callType === 'AUDIO' || callType.toLowerCase() === 'voice';

  // State
  const [showControls, setShowControls] = useState(true);
  const [permissionError, setPermissionError] = useState<{ type: 'microphone' | 'camera'; title: string; message: string } | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [isLocalFocused, setIsLocalFocused] = useState(false);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;

  // Refs
  const hasInitiatedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isNavigatingAwayRef = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingPermissionsRef = useRef(false);
  const isSendingCallMessageRef = useRef(false);
  const callStartedAtRef = useRef<number | null>(null);

  // Twilio hook
  const {
    callState,
    callInfo,
    duration,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    isSpeakerOn,
    isFrontCamera,
    callEndInfo,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    switchCamera,
    toggleSpeaker,
    error,
    clearError,
    clearCallEndInfo,
  } = useTwilioCall();

  const remoteStreamUrl = useMemo(() => getStreamUrl(remoteStream), [remoteStream]);
  const localStreamUrl = useMemo(() => getStreamUrl(localStream), [localStream]);

  const { sendCallMessage } = useChat({
    conversationId: route.params.conversationId,
    otherUserId: numericUserId,
  });

  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ============================================================================
  // RESPONSIVE SIZES - Recalculated on dimension/orientation change
  // ============================================================================
  const sizes = useMemo(() =>
    calculateResponsiveSizes(width, height, isLandscape, isTablet, moderateScale, hp, wp),
    [width, height, isLandscape, isTablet, moderateScale, hp, wp]
  );

  // ============================================================================
  // LAYOUT CALCULATIONS
  // ============================================================================
  const screenMargin = getScreenMargin();

  // Safe area padding with platform-specific adjustments
  const safePadding = useMemo(() => {
    const baseTop = insets.top || (IS_IOS ? 44 : 24);
    const baseBottom = insets.bottom || (IS_IOS ? 34 : 16);
    const baseLeft = insets.left || 0;
    const baseRight = insets.right || 0;

    if (isLandscape) {
      return {
        top: Math.max(baseTop, spacing.m),
        bottom: Math.max(baseBottom, spacing.m),
        left: Math.max(baseLeft, screenMargin),
        right: Math.max(baseRight, screenMargin),
      };
    }

    return {
      top: baseTop + spacing.xl,
      bottom: baseBottom + spacing.xl,
      left: screenMargin,
      right: screenMargin,
    };
  }, [insets, isLandscape, screenMargin]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    isNavigatingAwayRef.current = false;

    return () => {
      isMountedRef.current = false;
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

      const currentCallState = callStateRef.current;
      const timeSinceStart = callStartedAtRef.current ? Date.now() - callStartedAtRef.current : Infinity;

      if (currentCallState !== 'idle' && currentCallState !== 'ended' && currentCallState !== 'failed') {
        if (timeSinceStart >= 3000) {
          endCall();
        }
      }
    };
  }, [endCall]);

  // Back button handler (Android)
  useEffect(() => {
    const handleBackPress = () => {
      const currentState = callStateRef.current;

      if (isCheckingPermissionsRef.current) {
        isCheckingPermissionsRef.current = false;
      }

      if (currentState === 'initiating' || currentState === 'ringing') {
        if (!isNavigatingAwayRef.current) {
          isNavigatingAwayRef.current = true;
          endCall('cancelled');
          safeNavigateBack(navigation);
        }
        return true;
      }

      if (currentState === 'connected' || currentState === 'connecting' || currentState === 'reconnecting') {
        if (!isNavigatingAwayRef.current) {
          isNavigatingAwayRef.current = true;
          endCall();
          safeNavigateBack(navigation);
        }
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [endCall, navigation]);

  // Auto-hide controls for video calls
  useEffect(() => {
    if (!isAudioCall && callState === 'connected' && showControls) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

      controlsTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setShowControls(false);
        }
      }, 4000);
    }

    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isAudioCall, callState, showControls]);

  // Initialize call
  useEffect(() => {
    const initCall = async () => {
      if (hasInitiatedRef.current) return;

      if (!isIncoming && callState === 'idle') {
        hasInitiatedRef.current = true;
        callStartedAtRef.current = Date.now();

        isCheckingPermissionsRef.current = true;
        const permissionResult = await checkCallPermissions(callType);
        isCheckingPermissionsRef.current = false;

        if (!isMountedRef.current || isNavigatingAwayRef.current) {
          callStartedAtRef.current = null;
          return;
        }

        if (!permissionResult.success) {
          callStartedAtRef.current = null;
          if (permissionResult.error) {
            setPermissionError(permissionResult.error);
          } else {
            safeNavigateBack(navigation);
          }
          return;
        }

        if (isMountedRef.current) {
          initiateCall(numericUserId, userName, callType);
        }
      }

      if (isIncoming && roomName) {
        hasInitiatedRef.current = true;
        callStartedAtRef.current = Date.now();

        isCheckingPermissionsRef.current = true;
        const permissionResult = await checkCallPermissions(callType);
        isCheckingPermissionsRef.current = false;

        if (!isMountedRef.current || isNavigatingAwayRef.current) {
          callStartedAtRef.current = null;
          return;
        }

        if (!permissionResult.success) {
          callStartedAtRef.current = null;
          if (roomName) declineCall(roomName);
          if (permissionResult.error) {
            setPermissionError(permissionResult.error);
          } else {
            safeNavigateBack(navigation);
          }
          return;
        }

        if (isMountedRef.current && roomName) {
          await acceptCall(roomName, callType);
        }
      }
    };

    initCall();
  }, [isIncoming, callState, numericUserId, userName, callType, initiateCall, acceptCall, declineCall, roomName, navigation]);

  // Handle errors
  useEffect(() => {
    if (error && isMountedRef.current && !isNavigatingAwayRef.current) {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      isNavigatingAwayRef.current = true;
      setCallError(error);

      navigationTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setCallError(null);
          clearError();
          safeNavigateBack(navigation);
        }
      }, 2000);
    }
  }, [error, clearError, navigation]);

  // Navigate back on call end - use replace to remove CallScreen from stack
  useEffect(() => {
    if ((callState === 'ended' || callState === 'failed') && !isNavigatingAwayRef.current) {
      isNavigatingAwayRef.current = true;

      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          try {
            // Prefer going back to the previous screen to avoid stacking Chat
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }

            const parent = navigation.getParent?.();
            if (parent?.canGoBack?.()) {
              parent.goBack();
              return;
            }

            // Fallback: reset to a single Chat screen
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{
                  name: 'Chat',
                  params: {
                    conversationId: route.params.conversationId,
                    userName,
                    userPhoto,
                    userId,
                  },
                }],
              })
            );
          } catch (e) {
            console.warn('[CallScreen] Navigation to Chat failed:', e);
            try {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'ConversationsList' }],
                  })
                );
              }
            } catch (fallbackError) {
              console.warn('[CallScreen] Fallback navigation also failed:', fallbackError);
            }
          }
        }
      }, 1000);

      navigationTimeoutRef.current = timeoutId;
    }
  }, [callState, navigation, route.params.conversationId, userName, userPhoto, userId]);

  // Accessibility announcements
  useEffect(() => {
    let announcement = '';
    switch (callState) {
      case 'connected':
        announcement = 'Call connected';
        break;
      case 'reconnecting':
        announcement = 'Reconnecting';
        break;
      case 'ended':
        announcement = 'Call ended';
        break;
      case 'failed':
        announcement = 'Call failed';
        break;
    }
    if (announcement) {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [callState]);

  // Send call message on end
  useEffect(() => {
    if (callEndInfo && isMountedRef.current) {
      if (isSendingCallMessageRef.current) return;
      isSendingCallMessageRef.current = true;

      const mapReasonToStatus = (reason: CallEndReason): CallMessageType => {
        switch (reason) {
          case 'completed':
            return 'completed';
          case 'missed':
            return 'missed';
          case 'declined':
            return 'declined';
          case 'cancelled':
            return 'cancelled';
          case 'failed':
            return 'cancelled';
          default:
            return 'cancelled';
        }
      };

      const isOutgoingCall = callInfo?.isOutgoing ?? !isIncoming;

      // Convert frontend callType (voice/video) to backend format (AUDIO/VIDEO)
      const backendCallType = callType.toLowerCase() === 'voice' || callType === 'AUDIO' ? 'AUDIO' : 'VIDEO';

      sendCallMessage({
        callType: backendCallType,
        callStatus: mapReasonToStatus(callEndInfo.reason),
        duration: callEndInfo.wasConnected ? callEndInfo.duration : undefined,
        isOutgoing: isOutgoingCall,
      });

      clearCallEndInfo();

      setTimeout(() => {
        isSendingCallMessageRef.current = false;
      }, 1000);
    }
  }, [callEndInfo, callInfo, callType, isIncoming, sendCallMessage, clearCallEndInfo]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleScreenPress = useCallback(() => {
    if (!isAudioCall && callState === 'connected') {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      setShowControls(true);
    }
  }, [isAudioCall, callState]);

  const handleEndCall = useCallback(() => {
    endCall();
  }, [endCall]);

  const handleAcceptCall = useCallback(async () => {
    const permissionResult = await checkCallPermissions(callType);
    if (!permissionResult.success) {
      if (permissionResult.error) {
        setPermissionError(permissionResult.error);
      }
      if (roomName) {
        declineCall(roomName);
      }
      return;
    }
    if (roomName) {
      await acceptCall(roomName, callType);
    }
  }, [acceptCall, declineCall, callType, roomName]);

  const handleDismissPermissionError = useCallback(() => {
    setPermissionError(null);
    safeNavigateBack(navigation);
  }, [navigation]);

  const handleOpenSettings = useCallback(() => {
    setPermissionError(null);
    Linking.openSettings();
    safeNavigateBack(navigation);
  }, [navigation]);

  // ============================================================================
  // STATUS TEXT
  // ============================================================================
  const getStatusText = () => {
    switch (callState) {
      case 'initiating':
        return 'Calling...';
      case 'ringing':
        return isIncoming ? 'Incoming call' : 'Ringing...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(duration);
      case 'reconnecting':
        return 'Reconnecting...';
      case 'ended':
        return 'Call Ended';
      case 'failed':
        return 'Call Failed';
      default:
        return '';
    }
  };

  const isRinging = callState === 'ringing' || callState === 'initiating';
  const isConnected = callState === 'connected';

  // ============================================================================
  // RENDER: AUDIO CALL
  // ============================================================================
  if (isAudioCall) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeIn }]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        <LinearGradient
          colors={['#070A0F', '#0F172A', '#070A0F']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.audioGlowTop} pointerEvents="none" />
        <View style={styles.audioGlowBottom} pointerEvents="none" />

        {isLandscape ? (
          // ================================================================
          // LANDSCAPE LAYOUT: Side-by-side (avatar left 40%, controls right 60%)
          // ================================================================
          <View
            style={[
              styles.audioContentLandscape,
              {
                paddingTop: safePadding.top,
                paddingBottom: safePadding.bottom,
                paddingLeft: safePadding.left,
                paddingRight: safePadding.right,
              }
            ]}
          >
            {/* Left Side: Avatar and Info (40% width) */}
            <View style={styles.audioHeaderLandscape}>
              <View style={styles.audioAvatarContainerLandscape}>
                <PulseRings isActive={isRinging} size={sizes.avatar + 30} />

                <View
                  style={[
                    styles.audioAvatar,
                    {
                      width: sizes.avatar,
                      height: sizes.avatar,
                      borderRadius: sizes.avatar / 2,
                      borderWidth: isTablet ? 5 : 4,
                    }
                  ]}
                >
                  {userPhoto ? (
                    <Image source={{ uri: userPhoto }} style={styles.audioAvatarImage} />
                  ) : (
                    <View style={styles.audioAvatarPlaceholder}>
                      <Feather name="user" size={sizes.avatar * 0.5} color="#64748B" />
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.audioInfoLandscape}>
                <Text
                  style={[styles.audioNameLandscape, { fontSize: sizes.nameFont }]}
                  numberOfLines={1}
                  accessible={true}
                  accessibilityRole="text"
                >
                  {userName}
                </Text>

                <View style={styles.audioStatusContainerLandscape}>
                  {isConnected ? (
                    <View style={[styles.audioDurationLandscape, { paddingVertical: spacing.xs }]}>
                      <View style={styles.audioDurationDot} />
                      <Text style={[styles.audioDurationTextLandscape, { fontSize: sizes.timerFont }]}>
                        {formatDuration(duration)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.audioStatusLandscape, { fontSize: sizes.statusFont }]}>
                      {getStatusText()}
                    </Text>
                  )}
                </View>

                {/* Status Indicators */}
                {isConnected && (isAudioMuted || isSpeakerOn) && (
                  <View style={[styles.audioIndicatorsLandscape, { gap: spacing.s }]}>
                    {isAudioMuted && (
                      <View style={styles.audioIndicatorLandscape}>
                        <Feather name="mic-off" size={14} color="#EF4444" />
                        <Text style={[styles.audioIndicatorTextLandscape, { fontSize: sizes.labelFont - 2 }]}>
                          Muted
                        </Text>
                      </View>
                    )}
                    {isSpeakerOn && (
                      <View style={styles.audioIndicatorLandscape}>
                        <Feather name="volume-2" size={14} color="#10B981" />
                        <Text style={[styles.audioIndicatorTextLandscape, { fontSize: sizes.labelFont - 2 }]}>
                          Speaker
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Right Side: Controls (60% width) */}
            <View style={[styles.audioControlsLandscape, styles.controlsPanelLandscape, { gap: sizes.sectionGap }]}>
              {isConnected && (
                <View style={[styles.audioButtonRowLandscape, { gap: sizes.buttonGap }]}>
                  <ModernControlButton
                    icon={isAudioMuted ? 'mic-off' : 'mic'}
                    label={isAudioMuted ? 'Unmute' : 'Mute'}
                    onPress={toggleAudio}
                    isActive={isAudioMuted}
                    size={sizes.button}
                    iconSize={sizes.iconSize}
                    labelSize={sizes.labelFont}
                    compact={true}
                  />
                  <ModernControlButton
                    icon={isSpeakerOn ? 'volume-2' : 'volume-x'}
                    label="Speaker"
                    onPress={toggleSpeaker}
                    isActive={isSpeakerOn}
                    size={sizes.button}
                    iconSize={sizes.iconSize}
                    labelSize={sizes.labelFont}
                    compact={true}
                  />
                </View>
              )}

              {/* End/Accept Call Buttons */}
              <View style={[styles.audioEndCallContainerLandscape, { gap: sizes.buttonGap }]}>
                {isIncoming && isRinging && (
                  <ModernControlButton
                    icon="phone"
                    label="Answer"
                    onPress={handleAcceptCall}
                    variant="success"
                    size={sizes.endCallButton}
                    iconSize={Math.floor(sizes.endCallButton * 0.42)}
                    labelSize={sizes.labelFont}
                    compact={true}
                  />
                )}
                <ModernControlButton
                  icon="phone-off"
                  label={isRinging && isIncoming ? 'Decline' : 'End Call'}
                  onPress={handleEndCall}
                  variant="danger"
                  size={sizes.endCallButton}
                  iconSize={Math.floor(sizes.endCallButton * 0.42)}
                  labelSize={sizes.labelFont}
                  compact={true}
                />
              </View>
            </View>
          </View>
        ) : (
          // ================================================================
          // PORTRAIT LAYOUT: Traditional vertical stack
          // ================================================================
          <View
            style={[
              styles.audioContent,
              {
                paddingTop: safePadding.top,
                paddingBottom: safePadding.bottom,
                paddingHorizontal: safePadding.left,
              }
            ]}
          >
            {/* Avatar and Info */}
            <View style={styles.audioHeader}>
              <View style={[styles.audioAvatarContainer, { marginBottom: spacing.xl }]}>
                <PulseRings isActive={isRinging} size={sizes.avatar + 40} />

                <View
                  style={[
                    styles.audioAvatar,
                    {
                      width: sizes.avatar,
                      height: sizes.avatar,
                      borderRadius: sizes.avatar / 2,
                      borderWidth: isTablet ? 5 : 4,
                    }
                  ]}
                >
                  {userPhoto ? (
                    <Image source={{ uri: userPhoto }} style={styles.audioAvatarImage} />
                  ) : (
                    <View style={styles.audioAvatarPlaceholder}>
                      <Feather name="user" size={sizes.avatar * 0.5} color="#64748B" />
                    </View>
                  )}
                </View>
              </View>

              <Text
                style={[styles.audioName, { fontSize: sizes.nameFont, marginBottom: spacing.m }]}
                numberOfLines={1}
                accessible={true}
                accessibilityRole="text"
              >
                {userName}
              </Text>

              <View style={styles.audioStatusContainer}>
                {isConnected ? (
                  <View style={styles.audioDuration}>
                    <View style={styles.audioDurationDot} />
                    <Text style={[styles.audioDurationText, { fontSize: sizes.timerFont }]}>
                      {formatDuration(duration)}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.audioStatus, { fontSize: sizes.statusFont }]}>
                    {getStatusText()}
                  </Text>
                )}
              </View>

              {/* Status Indicators */}
              {isConnected && (
                <View style={[styles.audioIndicators, { marginTop: spacing.l }]}>
                  {isAudioMuted && (
                    <View style={styles.audioIndicator}>
                      <Feather name="mic-off" size={16} color="#EF4444" />
                      <Text style={[styles.audioIndicatorText, { fontSize: sizes.labelFont - 1 }]}>
                        Muted
                      </Text>
                    </View>
                  )}
                  {isSpeakerOn && (
                    <View style={styles.audioIndicator}>
                      <Feather name="volume-2" size={16} color="#10B981" />
                      <Text style={[styles.audioIndicatorText, { fontSize: sizes.labelFont - 1 }]}>
                        Speaker
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Controls */}
            <View style={[styles.audioControls, styles.controlsPanel, { gap: sizes.sectionGap }]}>
              {isConnected && (
                <View style={[styles.audioButtonRow, { gap: sizes.buttonGap }]}>
                  <ModernControlButton
                    icon={isAudioMuted ? 'mic-off' : 'mic'}
                    label={isAudioMuted ? 'Unmute' : 'Mute'}
                    onPress={toggleAudio}
                    isActive={isAudioMuted}
                    size={sizes.button}
                    iconSize={sizes.iconSize}
                    labelSize={sizes.labelFont}
                  />
                  <ModernControlButton
                    icon={isSpeakerOn ? 'volume-2' : 'volume-x'}
                    label="Speaker"
                    onPress={toggleSpeaker}
                    isActive={isSpeakerOn}
                    size={sizes.button}
                    iconSize={sizes.iconSize}
                    labelSize={sizes.labelFont}
                  />
                </View>
              )}

              {/* End Call Button */}
              <View style={[styles.audioEndCallContainer, { gap: sizes.buttonGap }]}>
                {isIncoming && isRinging && (
                  <ModernControlButton
                    icon="phone"
                    label="Answer"
                    onPress={handleAcceptCall}
                    variant="success"
                    size={sizes.endCallButton}
                    iconSize={Math.floor(sizes.endCallButton * 0.42)}
                    labelSize={sizes.labelFont}
                  />
                )}
                <ModernControlButton
                  icon="phone-off"
                  label={isRinging && isIncoming ? 'Decline' : 'End Call'}
                  onPress={handleEndCall}
                  variant="danger"
                  size={sizes.endCallButton}
                  iconSize={Math.floor(sizes.endCallButton * 0.42)}
                  labelSize={sizes.labelFont}
                />
              </View>
            </View>
          </View>
        )}

        {permissionError && (
          <PermissionError
            error={permissionError}
            onOpenSettings={handleOpenSettings}
            onDismiss={handleDismissPermissionError}
            isLandscape={isLandscape}
            isTablet={isTablet}
          />
        )}

        {callError && (
          <ErrorToast
            message={callError}
            insetTop={insets.top}
            isLandscape={isLandscape}
          />
        )}
      </Animated.View>
    );
  }

  // ============================================================================
  // RENDER: VIDEO CALL
  // ============================================================================
  const controlsOpacity = showControls ? 1 : 0;
  const hasLocalVideo = !!localStreamUrl && !isVideoMuted;
  const hasRemoteVideo = !!remoteStreamUrl && isConnected && !isVideoMuted;
  const mainIsLocal = isLocalFocused && hasLocalVideo;
  const mainStreamUrl = isLocalFocused ? (hasLocalVideo ? localStreamUrl : null) : (hasRemoteVideo ? remoteStreamUrl : null);
  const pipIsLocal = !isLocalFocused;
  const pipStreamUrl = pipIsLocal ? localStreamUrl : remoteStreamUrl;
  const shouldShowWaiting = !mainStreamUrl;

  return (
    <TouchableWithoutFeedback onPress={handleScreenPress}>
      <Animated.View style={[styles.container, { opacity: fadeIn }]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* Remote Video */}
        {mainStreamUrl ? (
          <RTCView
            streamURL={mainStreamUrl}
            style={styles.remoteVideo}
            objectFit="cover"
            mirror={mainIsLocal && isFrontCamera}
          />
        ) : (
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['rgba(7,10,15,0.65)', 'rgba(7,10,15,0)']}
          style={styles.videoTopFade}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(7,10,15,0)', 'rgba(7,10,15,0.75)']}
          style={styles.videoBottomFade}
          pointerEvents="none"
        />

        {/* Waiting State - Landscape Adaptive */}
        {shouldShowWaiting && (
          <View
            style={[
              styles.videoWaiting,
              isLandscape && styles.videoWaitingLandscape
            ]}
            pointerEvents="none"
          >
            <View style={[
              styles.videoAvatarContainer,
              isLandscape && { marginBottom: 0, marginRight: sizes.sectionGap }
            ]}>
              <PulseRings isActive={isRinging} size={sizes.avatar + (isLandscape ? 30 : 40)} />

              <View
                style={[
                  styles.videoAvatar,
                  {
                    width: sizes.avatar,
                    height: sizes.avatar,
                    borderRadius: sizes.avatar / 2,
                    borderWidth: isTablet ? 5 : 4,
                  }
                ]}
              >
                {userPhoto ? (
                  <Image source={{ uri: userPhoto }} style={styles.videoAvatarImage} />
                ) : (
                  <Feather name="user" size={sizes.avatar * 0.5} color="#64748B" />
                )}
              </View>
            </View>

            <View style={isLandscape ? styles.videoInfoLandscape : undefined}>
              <Text
                style={[
                  styles.videoName,
                  { fontSize: sizes.nameFont },
                  isLandscape && { marginTop: 0, textAlign: 'left' }
                ]}
                numberOfLines={1}
                accessible={true}
                accessibilityRole="text"
              >
                {userName}
              </Text>
              <Text
                style={[
                  styles.videoStatus,
                  { fontSize: sizes.statusFont },
                  isLandscape && { marginTop: spacing.xs }
                ]}
              >
                {getStatusText()}
              </Text>

              {isConnected && isVideoMuted && (
                <View style={[
                  styles.videoCameraOff,
                  isLandscape && {
                    paddingHorizontal: spacing.m,
                    paddingVertical: spacing.xs,
                    marginTop: spacing.s,
                  }
                ]}>
                  <Feather name="video-off" size={isLandscape ? 16 : 20} color="#FFFFFF" />
                  <Text style={[styles.videoCameraOffText, { fontSize: sizes.labelFont }]}>
                    Camera is off
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Local Video PiP */}
        {pipStreamUrl && (pipIsLocal ? hasLocalVideo : isConnected) && (
          <Pressable
            onPress={() => setIsLocalFocused((prev) => !prev)}
            style={[
              styles.pip,
              {
                top: safePadding.top,
                right: isLandscape ? safePadding.right : spacing.m,
                width: sizes.pipWidth,
                height: sizes.pipHeight,
                borderRadius: isTablet ? 20 : 16,
              }
            ]}
          >
            <RTCView
              key={`${pipIsLocal ? 'self' : 'remote'}-${isFrontCamera ? 'front' : 'back'}`}
              streamURL={pipStreamUrl}
              style={styles.pipVideo}
              objectFit="cover"
              mirror={pipIsLocal && isFrontCamera}
              zOrder={1}
            />
            <View style={styles.pipLabel}>
              <Text style={[styles.pipLabelText, { fontSize: sizes.labelFont - 2 }]}>
                {pipIsLocal ? 'You' : (userName?.split(' ')[0] || 'Them')}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Top Bar - Connected Duration */}
        {isConnected && (
          <Animated.View
            style={[
              styles.videoTopBar,
              {
                paddingTop: safePadding.top,
                paddingHorizontal: isLandscape ? safePadding.left : spacing.l,
                opacity: controlsOpacity,
              },
            ]}
            pointerEvents={showControls ? 'auto' : 'none'}
          >
            <View style={styles.videoTopInfo}>
              <View style={styles.videoDot} />
              <Text style={[styles.videoTopText, { fontSize: sizes.labelFont }]}>
                {formatDuration(duration)}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Bottom Controls */}
        <Animated.View
          style={[
            styles.videoBottomBar,
            styles.videoBottomBarShell,
            isLandscape && styles.videoBottomBarLandscape,
            {
              paddingBottom: safePadding.bottom,
              paddingHorizontal: isLandscape ? safePadding.left : spacing.xl,
              opacity: controlsOpacity,
              gap: isLandscape ? sizes.buttonGap : sizes.sectionGap,
            },
          ]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
          {isConnected && (
            <View style={[
              styles.videoButtonRow,
              isLandscape && { gap: sizes.buttonGap }
            ]}>
              <ModernControlButton
                icon={isAudioMuted ? 'mic-off' : 'mic'}
                label={isAudioMuted ? 'Unmute' : 'Mute'}
                onPress={toggleAudio}
                isActive={isAudioMuted}
                size={sizes.button}
                iconSize={sizes.iconSize}
                labelSize={sizes.labelFont}
                compact={isLandscape}
              />
              <ModernControlButton
                icon={isVideoMuted ? 'video-off' : 'video'}
                label="Camera"
                onPress={toggleVideo}
                isActive={isVideoMuted}
                size={sizes.button}
                iconSize={sizes.iconSize}
                labelSize={sizes.labelFont}
                compact={isLandscape}
              />
              {!isVideoMuted && (
                <ModernControlButton
                  icon="refresh-cw"
                  label="Flip"
                  onPress={switchCamera}
                  size={sizes.button}
                  iconSize={sizes.iconSize}
                  labelSize={sizes.labelFont}
                  compact={isLandscape}
                />
              )}
            </View>
          )}

          {/* End Call */}
          <View style={[
            styles.videoEndCallContainer,
            isLandscape && { gap: sizes.buttonGap }
          ]}>
            {isIncoming && isRinging && (
              <ModernControlButton
                icon="video"
                label="Answer"
                onPress={handleAcceptCall}
                variant="success"
                size={sizes.endCallButton}
                iconSize={Math.floor(sizes.endCallButton * 0.42)}
                labelSize={sizes.labelFont}
                compact={isLandscape}
              />
            )}
            <ModernControlButton
              icon="phone-off"
              label={isRinging && isIncoming ? 'Decline' : 'End Call'}
              onPress={handleEndCall}
              variant="danger"
              size={sizes.endCallButton}
              iconSize={Math.floor(sizes.endCallButton * 0.42)}
              labelSize={sizes.labelFont}
              compact={isLandscape}
            />
          </View>
        </Animated.View>

        {permissionError && (
          <PermissionError
            error={permissionError}
            onOpenSettings={handleOpenSettings}
            onDismiss={handleDismissPermissionError}
            isLandscape={isLandscape}
            isTablet={isTablet}
          />
        )}

        {callError && (
          <ErrorToast
            message={callError}
            insetTop={insets.top}
            isLandscape={isLandscape}
          />
        )}

        {!showControls && isConnected && (
          <View
            style={[
              styles.tapHint,
              { bottom: safePadding.bottom + spacing.m }
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.tapHintText, { fontSize: sizes.labelFont - 2 }]}>
              Tap to show controls
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

// ============================================================================
// STYLES - Base styles, orientation-specific styles applied dynamically
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A0F',
  },
  audioGlowTop: {
    position: 'absolute',
    top: -140,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(249,115,22,0.18)',
  },
  audioGlowBottom: {
    position: 'absolute',
    bottom: -160,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(20,184,166,0.18)',
  },

  // ============================================================================
  // AUDIO CALL STYLES - PORTRAIT
  // ============================================================================
  audioContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  audioHeader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  audioAvatar: {
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderColor: 'rgba(148,163,184,0.35)',
    ...IOS_SHADOW_LARGE,
  },
  audioAvatarImage: {
    width: '100%',
    height: '100%',
  },
  audioAvatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  audioName: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  audioStatusContainer: {
    alignItems: 'center',
  },
  audioDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s + 4,
    borderRadius: 24,
    gap: spacing.s,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  audioDurationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  audioDurationText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
  },
  audioStatus: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  audioIndicators: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  audioIndicatorText: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  audioControls: {
    alignItems: 'center',
  },
  audioButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  audioEndCallContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  // ============================================================================
  // AUDIO CALL STYLES - LANDSCAPE
  // ============================================================================
  audioContentLandscape: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioHeaderLandscape: {
    flex: 0.45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.l,
  },
  audioAvatarContainerLandscape: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioInfoLandscape: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  audioNameLandscape: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'left',
  },
  audioStatusContainerLandscape: {
    alignItems: 'flex-start',
  },
  audioDurationLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    paddingHorizontal: spacing.m,
    borderRadius: 20,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  audioDurationTextLandscape: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
  },
  audioStatusLandscape: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  audioIndicatorsLandscape: {
    flexDirection: 'row',
    marginTop: spacing.s,
  },
  audioIndicatorLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: 16,
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  audioIndicatorTextLandscape: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  audioControlsLandscape: {
    flex: 0.55,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioButtonRowLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  audioEndCallContainerLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  controlsPanel: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.l,
    borderRadius: 28,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  controlsPanelLandscape: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderRadius: 24,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },

  // ============================================================================
  // MODERN BUTTON STYLES
  // ============================================================================
  modernButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    ...IOS_SHADOW_MEDIUM,
  },
  modernButtonLabel: {
    color: '#E2E8F0',
    fontWeight: '600',
    textAlign: 'center',
  },

  // ============================================================================
  // VIDEO CALL STYLES
  // ============================================================================
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  videoTopFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 5,
  },
  videoBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
    zIndex: 5,
  },
  videoWaiting: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  videoWaitingLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  videoAvatar: {
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderColor: 'rgba(148,163,184,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    ...IOS_SHADOW_LARGE,
  },
  videoAvatarImage: {
    width: '100%',
    height: '100%',
  },
  videoInfoLandscape: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  videoName: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  videoStatus: {
    color: '#E2E8F0',
    fontWeight: '600',
    marginTop: spacing.s,
    textAlign: 'center',
  },
  videoCameraOff: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s + 2,
    borderRadius: 24,
    gap: spacing.s,
    marginTop: spacing.l,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  videoCameraOffText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pip: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 100,
    ...IOS_SHADOW_MEDIUM,
  },
  pipVideo: {
    flex: 1,
  },
  pipLabel: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: '#00000088',
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pipLabelText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  videoTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  videoTopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 2,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  videoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  videoTopText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  videoBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: 'center',
  },
  videoBottomBarShell: {
    marginHorizontal: spacing.l,
    marginBottom: spacing.m,
    borderRadius: 28,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    alignSelf: 'center',
  },
  videoBottomBarLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  videoEndCallContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },

  tapHint: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s + 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  tapHintText: {
    color: '#E2E8F0',
    fontWeight: '600',
  },

  // ============================================================================
  // PERMISSION ERROR STYLES
  // ============================================================================
  permissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000DD',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: spacing.xl,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xlarge,
    width: '100%',
    alignItems: 'center',
    ...IOS_SHADOW_LARGE,
  },
  permissionIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  permissionTitle: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  permissionMessage: {
    color: '#64748B',
    marginBottom: spacing.xxl,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: spacing.m,
    width: '100%',
  },
  permissionButton: {
    flex: 1,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
  },
  permissionButtonSecondary: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButtonTextSecondary: {
    fontWeight: '700',
    color: '#475569',
  },
  permissionButtonPrimary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
  },
  permissionButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ============================================================================
  // ERROR TOAST STYLES
  // ============================================================================
  errorToast: {
    position: 'absolute',
    left: spacing.l,
    right: spacing.l,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    zIndex: 1000,
    ...IOS_SHADOW_LARGE,
  },
  errorToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
  },
  errorToastText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
});

export default CallScreen;
