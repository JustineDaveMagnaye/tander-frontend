/**
 * TANDER Location Permission Gate
 * Blocks app access until location permission is properly granted
 *
 * Tinder-like behavior:
 * - "Only this time" / "Allow Once" → Keep requesting on every app open
 * - "While using the app" → Permission granted, no more prompts
 * - "Don't allow" → Show "Unable to Connect" screen with "Open Settings" button
 *
 * PERSISTENCE: Uses AsyncStorage to remember denial state across app restarts
 * - Tracks denial count and whether permission was permanently denied
 * - Clears denial state when permission is granted (user changed mind in settings)
 * - Shows "Unable to Connect" immediately on app open if previously permanently denied
 *
 * Works on both iOS and Android
 */

import React, { useEffect, useCallback, useState, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import { LocationPermissionModal } from './LocationPermissionModal';

// =============================================================================
// STORAGE KEYS & CONSTANTS
// =============================================================================

const STORAGE_KEYS = {
  DENIAL_COUNT: '@tander/location_denial_count',
  PERMANENTLY_DENIED: '@tander/location_permanently_denied',
  LAST_DENIAL_TIME: '@tander/location_last_denial_time',
  HAS_EVER_REQUESTED: '@tander/location_has_ever_requested',
} as const;

// After this many denials + canAskAgain=false, show "Unable to Connect" immediately
const DENIAL_THRESHOLD = 1;

// =============================================================================
// TYPES
// =============================================================================

interface LocationPermissionGateProps {
  children: React.ReactNode;
}

type GateStatus = 'checking' | 'prompt' | 'denied' | 'granted';

// =============================================================================
// UNABLE TO CONNECT SCREEN
// =============================================================================

interface UnableToConnectScreenProps {
  onOpenSettings: () => void;
  onRetry: () => void;
  isRetrying: boolean;
}

const UnableToConnectScreen = memo<UnableToConnectScreenProps>(({
  onOpenSettings,
  onRetry,
  isRetrying,
}) => {
  const insets = useSafeAreaInsets();
  const { moderateScale, isTablet, isLandscape, hp, wp } = useResponsive();

  // Animation
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle pulse animation for the icon
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  const handleOpenSettings = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onOpenSettings();
  }, [onOpenSettings]);

  const handleRetry = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Shake animation on retry
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    onRetry();
  }, [onRetry, shakeAnim]);

  // Responsive sizes
  const iconSize = isTablet ? 100 : isLandscape ? Math.min(hp(25), 80) : moderateScale(80);
  const titleSize = isTablet ? 32 : isLandscape ? Math.min(hp(6), 26) : moderateScale(28);
  const subtitleSize = isTablet ? 20 : isLandscape ? Math.min(hp(4), 17) : moderateScale(18);
  const buttonHeight = isTablet ? 68 : isLandscape ? Math.min(hp(14), 56) : 60;
  const buttonTextSize = isTablet ? 20 : isLandscape ? Math.min(hp(4), 17) : moderateScale(18);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.gray[50]} />

      {/* Background gradient */}
      <LinearGradient
        colors={[colors.gray[50], '#fff', colors.gray[50]]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: Math.max(insets.left, insets.right, 24),
          },
        ]}
      >
        {/* Icon with pulse animation */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              width: iconSize + 48,
              height: iconSize + 48,
              borderRadius: (iconSize + 48) / 2,
              transform: [
                { scale: pulseAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <View style={[styles.iconInner, { width: iconSize + 32, height: iconSize + 32, borderRadius: (iconSize + 32) / 2 }]}>
            <Feather name="map-pin" size={iconSize * 0.5} color={colors.gray[400]} />
            <View style={styles.iconSlash}>
              <View style={[styles.slashLine, { width: iconSize * 0.6 }]} />
            </View>
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={[styles.title, { fontSize: titleSize, marginTop: 32 }]}>
          Unable to Connect
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { fontSize: subtitleSize, marginTop: 12 }]}>
          Location access is required to find{'\n'}matches near you.
        </Text>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Feather name="info" size={20} color={colors.orange[500]} />
            </View>
            <Text style={styles.infoText}>
              Please enable location access in your device settings to continue using TANDER.
            </Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {/* Primary: Open Settings */}
          <TouchableOpacity
            style={[styles.primaryButton, { height: buttonHeight }]}
            onPress={handleOpenSettings}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
            accessibilityHint="Opens device settings to enable location access"
          >
            <LinearGradient
              colors={colors.gradient.ctaButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Feather name="settings" size={22} color="#fff" />
              <Text style={[styles.primaryButtonText, { fontSize: buttonTextSize }]}>
                Open Settings
              </Text>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary: Try Again */}
          <TouchableOpacity
            style={[styles.secondaryButton, { height: buttonHeight - 4 }]}
            onPress={handleRetry}
            disabled={isRetrying}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Try Again"
            accessibilityHint="Checks location permission again"
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color={colors.orange[500]} />
            ) : (
              <>
                <Feather name="refresh-cw" size={20} color={colors.orange[500]} />
                <Text style={[styles.secondaryButtonText, { fontSize: buttonTextSize - 1 }]}>
                  Try Again
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

UnableToConnectScreen.displayName = 'UnableToConnectScreen';

// =============================================================================
// LOADING SCREEN
// =============================================================================

const CheckingPermissionScreen = memo(() => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, styles.loadingContainer]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.gray[50]} />
      <LinearGradient
        colors={[colors.gray[50], '#fff', colors.gray[50]]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.orange[500]} />
        <Text style={styles.loadingText}>Checking location access...</Text>
      </View>
    </View>
  );
});

CheckingPermissionScreen.displayName = 'CheckingPermissionScreen';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LocationPermissionGate: React.FC<LocationPermissionGateProps> = ({ children }) => {
  const [gateStatus, setGateStatus] = useState<GateStatus>('checking');
  const [isRetrying, setIsRetrying] = useState(false);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Persisted state (loaded from AsyncStorage)
  const [denialCount, setDenialCount] = useState(0);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);
  const [hasEverRequested, setHasEverRequested] = useState(false);

  // Session state
  const [hasRequestedThisSession, setHasRequestedThisSession] = useState(false);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const periodicCheckRef = useRef<NodeJS.Timeout | null>(null);
  const autoPromptRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================================================
  // PERSISTENCE HELPERS
  // ==========================================================================

  /**
   * Load persisted permission state from AsyncStorage
   */
  const loadPersistedState = useCallback(async () => {
    try {
      const [denialCountStr, permanentlyDeniedStr, hasEverRequestedStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DENIAL_COUNT),
        AsyncStorage.getItem(STORAGE_KEYS.PERMANENTLY_DENIED),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_EVER_REQUESTED),
      ]);

      const loadedDenialCount = denialCountStr ? parseInt(denialCountStr, 10) : 0;
      const loadedPermanentlyDenied = permanentlyDeniedStr === 'true';
      const loadedHasEverRequested = hasEverRequestedStr === 'true';

      console.log(`[LocationGate] Loaded persisted state: denialCount=${loadedDenialCount}, permanentlyDenied=${loadedPermanentlyDenied}, hasEverRequested=${loadedHasEverRequested}`);

      setDenialCount(loadedDenialCount);
      setIsPermanentlyDenied(loadedPermanentlyDenied);
      setHasEverRequested(loadedHasEverRequested);
      setIsStorageLoaded(true);
    } catch (error) {
      console.warn('[LocationGate] Error loading persisted state:', error);
      setIsStorageLoaded(true); // Continue anyway with defaults
    }
  }, []);

  /**
   * Persist denial state to AsyncStorage
   */
  const persistDenialState = useCallback(async (count: number, permanent: boolean) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.DENIAL_COUNT, count.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.PERMANENTLY_DENIED, permanent.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_DENIAL_TIME, Date.now().toString()),
        AsyncStorage.setItem(STORAGE_KEYS.HAS_EVER_REQUESTED, 'true'),
      ]);
      console.log(`[LocationGate] Persisted denial state: count=${count}, permanent=${permanent}`);
    } catch (error) {
      console.warn('[LocationGate] Error persisting denial state:', error);
    }
  }, []);

  /**
   * Clear all denial state (called when permission is granted)
   */
  const clearDenialState = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.DENIAL_COUNT),
        AsyncStorage.removeItem(STORAGE_KEYS.PERMANENTLY_DENIED),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_DENIAL_TIME),
        // Keep HAS_EVER_REQUESTED - no need to clear this
      ]);
      setDenialCount(0);
      setIsPermanentlyDenied(false);
      console.log('[LocationGate] Cleared denial state (permission granted)');
    } catch (error) {
      console.warn('[LocationGate] Error clearing denial state:', error);
    }
  }, []);

  // ==========================================================================
  // PERMISSION LOGIC
  // ==========================================================================

  /**
   * Check permission and determine gate status
   *
   * SMART PERSISTENCE LOGIC:
   * 1. If permission is GRANTED → Clear denial state, show app
   * 2. If permission is DENIED + canAskAgain=false + (hasRequestedThisSession OR isPermanentlyDenied) → Show denied screen
   * 3. Otherwise → Show prompt modal
   *
   * This ensures:
   * - First app open: Always shows prompt (even if canAskAgain is false due to Android quirks)
   * - After explicit denial: Shows "Unable to Connect" on subsequent app opens
   * - After user grants from settings: Clears denial state and shows app
   */
  const checkPermissionStatus = useCallback(async () => {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      console.log(`[LocationGate] Check: status=${status}, canAskAgain=${canAskAgain}, hasRequestedThisSession=${hasRequestedThisSession}, isPermanentlyDenied=${isPermanentlyDenied}, denialCount=${denialCount}`);

      // GRANTED: Clear any denial state and show app
      if (status === Location.PermissionStatus.GRANTED) {
        await clearDenialState();
        setGateStatus('granted');
        if (periodicCheckRef.current) clearInterval(periodicCheckRef.current);
        if (autoPromptRef.current) clearTimeout(autoPromptRef.current);
        return;
      }

      // DENIED: Check if we should show "Unable to Connect" or prompt
      if (status === Location.PermissionStatus.DENIED && !canAskAgain) {
        // Show denied screen if EITHER:
        // 1. We've requested this session and got permanently denied, OR
        // 2. We have persisted state showing previous permanent denial
        const shouldShowDenied = hasRequestedThisSession || (isPermanentlyDenied && denialCount >= DENIAL_THRESHOLD);

        if (shouldShowDenied) {
          setGateStatus('denied');
          return;
        }
      }

      // For all other cases, show the prompt modal
      // This includes: UNDETERMINED, DENIED with canAskAgain=true,
      // or DENIED with canAskAgain=false but this is first launch (give user a chance)
      setGateStatus('prompt');
    } catch (error) {
      console.warn('[LocationGate] Error checking permission:', error);
      setGateStatus('prompt');
    }
  }, [hasRequestedThisSession, isPermanentlyDenied, denialCount, clearDenialState]);

  /**
   * Request permission from the OS
   * Persists denial state to AsyncStorage for future app launches
   */
  const handleRequestPermission = useCallback(async () => {
    try {
      console.log('[LocationGate] Requesting permission...');

      // Mark that we've tried to request permission this session
      setHasRequestedThisSession(true);
      setHasEverRequested(true);

      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      console.log(`[LocationGate] Request result: status=${status}, canAskAgain=${canAskAgain}`);

      if (status === Location.PermissionStatus.GRANTED) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await clearDenialState();
        setGateStatus('granted');
      } else if (!canAskAgain) {
        // Permanently denied - persist this state
        const newDenialCount = denialCount + 1;
        setDenialCount(newDenialCount);
        setIsPermanentlyDenied(true);
        await persistDenialState(newDenialCount, true);
        setGateStatus('denied');
      } else {
        // User dismissed or selected "Ask every time" - increment denial count but not permanent
        const newDenialCount = denialCount + 1;
        setDenialCount(newDenialCount);
        await persistDenialState(newDenialCount, false);

        // Keep showing prompt
        setGateStatus('prompt');

        // Auto re-prompt after short delay
        if (autoPromptRef.current) clearTimeout(autoPromptRef.current);
        autoPromptRef.current = setTimeout(() => {
          checkPermissionStatus();
        }, 1500);
      }
    } catch (error) {
      console.warn('[LocationGate] Error requesting permission:', error);
      setGateStatus('prompt');
    }
  }, [denialCount, checkPermissionStatus, clearDenialState, persistDenialState]);

  /**
   * Open device settings
   */
  const handleOpenSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.warn('[LocationGate] Error opening settings:', error);
    }
  }, []);

  /**
   * Retry checking permission (after user returns from settings)
   * This also temporarily allows showing granted state even if persisted as denied
   */
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);

    // Check the actual permission status
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status === Location.PermissionStatus.GRANTED) {
      // User granted permission in settings - clear denial state
      await clearDenialState();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setGateStatus('granted');
    } else {
      // Still denied - stay on denied screen
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    setIsRetrying(false);
  }, [clearDenialState]);

  /**
   * AGGRESSIVE: Handle app state changes
   * Re-check on EVERY foreground event
   */
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Check when coming back to foreground
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[LocationGate] App resumed - forcing permission check');
        // Small delay to ensure system has settled
        setTimeout(() => {
          checkPermissionStatus();
        }, 300);
      }

      // AGGRESSIVE: Also check when going to background (to prepare for return)
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[LocationGate] App going to background - will re-check on return');
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkPermissionStatus]);

  /**
   * Periodic check while app is active
   * Checks every 5 seconds if permission is still not granted
   * Only starts after storage is loaded
   */
  useEffect(() => {
    if (!isStorageLoaded) return;

    if (gateStatus !== 'granted') {
      periodicCheckRef.current = setInterval(() => {
        console.log('[LocationGate] Periodic check...');
        checkPermissionStatus();
      }, 5000);
    }

    return () => {
      if (periodicCheckRef.current) {
        clearInterval(periodicCheckRef.current);
      }
    };
  }, [gateStatus, checkPermissionStatus, isStorageLoaded]);

  /**
   * Load persisted state on mount
   */
  useEffect(() => {
    loadPersistedState();

    // Cleanup on unmount
    return () => {
      if (periodicCheckRef.current) clearInterval(periodicCheckRef.current);
      if (autoPromptRef.current) clearTimeout(autoPromptRef.current);
    };
  }, [loadPersistedState]);

  /**
   * Check permission after storage is loaded
   */
  useEffect(() => {
    if (isStorageLoaded) {
      checkPermissionStatus();
    }
  }, [isStorageLoaded, checkPermissionStatus]);

  // Show loading screen while storage is loading
  if (!isStorageLoaded) {
    return <CheckingPermissionScreen />;
  }

  // Render based on gate status
  switch (gateStatus) {
    case 'checking':
      return <CheckingPermissionScreen />;

    case 'prompt':
      return (
        <LocationPermissionModal
          visible={true}
          onRequestPermission={handleRequestPermission}
          onOpenSettings={handleOpenSettings}
        />
      );

    case 'denied':
      return (
        <UnableToConnectScreen
          onOpenSettings={handleOpenSettings}
          onRetry={handleRetry}
          isRetrying={isRetrying}
        />
      );

    case 'granted':
      return <>{children}</>;

    default:
      return <CheckingPermissionScreen />;
  }
};

LocationPermissionGate.displayName = 'LocationPermissionGate';

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },

  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // Icon
  iconContainer: {
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },

  iconInner: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  iconSlash: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  slashLine: {
    height: 4,
    backgroundColor: colors.gray[400],
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },

  // Text
  title: {
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
  },

  subtitle: {
    fontWeight: '400',
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 28,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.orange[50],
    borderRadius: 16,
    padding: 20,
    marginTop: 32,
    borderWidth: 1,
    borderColor: colors.orange[100],
    width: '100%',
    maxWidth: 400,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },

  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.orange[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.orange[800],
    lineHeight: 24,
  },

  // Spacer
  spacer: {
    flex: 1,
    minHeight: 40,
  },

  // Buttons
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },

  primaryButton: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  primaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },

  primaryButtonText: {
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },

  secondaryButton: {
    width: '100%',
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.orange[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  secondaryButtonText: {
    fontWeight: '600',
    color: colors.orange[500],
  },

  // Loading
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[600],
  },
});

export default LocationPermissionGate;
