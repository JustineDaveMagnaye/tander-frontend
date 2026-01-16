/**
 * TANDER Location Permission Gate
 * Blocks app access until location permission is properly granted
 *
 * Tinder-like behavior:
 * - "Only this time" / "Allow Once" → Keep requesting on every app open
 * - "While using the app" → Permission granted, no more prompts
 * - "Don't allow" → Show "Unable to Connect" screen with "Open Settings" button
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import { LocationPermissionModal } from './LocationPermissionModal';

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
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Check permission and determine gate status
   * This is the core logic that implements Tinder-like behavior
   */
  const checkPermissionStatus = useCallback(async () => {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      console.log(`[LocationGate] Check: status=${status}, canAskAgain=${canAskAgain}, platform=${Platform.OS}`);

      if (status === Location.PermissionStatus.GRANTED) {
        // Permission is currently granted
        // Note: For "Allow Once" on iOS/Android, this will be true temporarily
        // On next app launch, it will reset to UNDETERMINED - handled by checking on mount
        setGateStatus('granted');
        return;
      }

      if (status === Location.PermissionStatus.DENIED) {
        if (canAskAgain) {
          // User denied but we can still ask again (soft deny)
          // Show the permission modal to request again
          setGateStatus('prompt');
        } else {
          // User permanently denied or selected "Don't ask again"
          // Show the "Unable to Connect" screen
          setGateStatus('denied');
        }
        return;
      }

      // UNDETERMINED - never asked or "Allow Once" expired
      setGateStatus('prompt');
    } catch (error) {
      console.error('[LocationGate] Error checking permission:', error);
      // On error, try to prompt
      setGateStatus('prompt');
    }
  }, []);

  /**
   * Request permission from the OS
   */
  const handleRequestPermission = useCallback(async () => {
    try {
      console.log('[LocationGate] Requesting permission...');
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      console.log(`[LocationGate] Request result: status=${status}, canAskAgain=${canAskAgain}`);

      if (status === Location.PermissionStatus.GRANTED) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setGateStatus('granted');
      } else if (!canAskAgain) {
        // Permanently denied
        setGateStatus('denied');
      } else {
        // User dismissed or denied but can ask again
        // Stay on prompt screen - they'll see it again when they return
        setGateStatus('prompt');
      }
    } catch (error) {
      console.error('[LocationGate] Error requesting permission:', error);
      setGateStatus('prompt');
    }
  }, []);

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
      console.error('[LocationGate] Error opening settings:', error);
    }
  }, []);

  /**
   * Retry checking permission (after user returns from settings)
   */
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    await checkPermissionStatus();
    setIsRetrying(false);
  }, [checkPermissionStatus]);

  /**
   * Handle app state changes - re-check permission when app comes to foreground
   * This is KEY for Tinder-like behavior:
   * - If user granted "Allow Once", it resets on app restart → will prompt again
   * - If user changed settings while app was in background → re-check
   */
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Only check when coming back to foreground from background/inactive
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[LocationGate] App came to foreground, re-checking permission...');
        await checkPermissionStatus();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkPermissionStatus]);

  /**
   * Initial permission check on mount
   */
  useEffect(() => {
    checkPermissionStatus();
  }, [checkPermissionStatus]);

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
