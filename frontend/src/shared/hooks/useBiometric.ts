/**
 * TANDER useBiometric Hook
 * Manages biometric authentication state and operations for components
 *
 * Usage:
 * const { isAvailable, isEnabled, biometricLabel, enableBiometric, authenticateAndGetCredentials } = useBiometric();
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  BiometricStatus,
  BiometricType,
  getBiometricStatus,
  getBiometricLabel,
  authenticateAsync,
  storeCredentials,
  getStoredCredentials,
  clearCredentials,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
  isNativeModuleAvailable,
} from '@services/biometric/biometricService';

// =============================================================================
// TYPES
// =============================================================================

export interface UseBiometricState {
  // Native module availability (false in Expo Go)
  isNativeAvailable: boolean;
  // Device capability
  isAvailable: boolean;
  isEnrolled: boolean;
  hasHardware: boolean;
  biometricType: BiometricType;
  biometricLabel: string;
  // App settings
  isEnabled: boolean;
  hasStoredCredentials: boolean;
  // Loading states
  isLoading: boolean;
  isAuthenticating: boolean;
  // Error
  error: string | null;
}

export interface UseBiometricReturn extends UseBiometricState {
  // Actions
  checkStatus: () => Promise<void>;
  enableBiometric: (username: string, password: string) => Promise<boolean>;
  disableBiometric: () => Promise<boolean>;
  authenticateAndGetCredentials: () => Promise<{ username: string; password: string } | null>;
  clearError: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useBiometric(): UseBiometricReturn {
  // State
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check biometric status and stored settings
   */
  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [biometricStatus, enabled, credentials] = await Promise.all([
        getBiometricStatus(),
        isBiometricLoginEnabled(),
        getStoredCredentials(),
      ]);

      setStatus(biometricStatus);
      setIsEnabled(enabled);
      setHasStoredCredentials(credentials !== null);
    } catch (err) {
      console.warn('Failed to check biometric status:', err);
      setError('Failed to check biometric status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Enable biometric login - requires authentication first
   */
  const enableBiometric = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setIsAuthenticating(true);
      setError(null);

      try {
        // First, authenticate with biometrics to confirm user intent
        const biometricLabel = status ? getBiometricLabel(status.biometricType) : 'biometrics';
        const authResult = await authenticateAsync(
          `Confirm your identity to enable ${biometricLabel}`
        );

        if (!authResult.success) {
          if (authResult.errorCode === 'user_cancel') {
            setError(null); // User cancelled, not an error
          } else {
            setError(authResult.error || 'Authentication failed');
          }
          return false;
        }

        // Store credentials securely
        const stored = await storeCredentials(username, password);
        if (!stored) {
          setError('Failed to store credentials securely');
          return false;
        }

        // Enable biometric login
        const enabled = await setBiometricLoginEnabled(true);
        if (!enabled) {
          setError('Failed to enable biometric login');
          await clearCredentials();
          return false;
        }

        setIsEnabled(true);
        setHasStoredCredentials(true);
        return true;
      } catch (err) {
        console.warn('Failed to enable biometric:', err);
        setError('An unexpected error occurred');
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [status]
  );

  /**
   * Disable biometric login
   */
  const disableBiometric = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await setBiometricLoginEnabled(false);
      setIsEnabled(false);
      setHasStoredCredentials(false);
      return true;
    } catch (err) {
      console.warn('Failed to disable biometric:', err);
      setError('Failed to disable biometric login');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Authenticate and retrieve stored credentials for auto-login
   */
  const authenticateAndGetCredentials = useCallback(async (): Promise<{
    username: string;
    password: string;
  } | null> => {
    setIsAuthenticating(true);
    setError(null);

    try {
      // Authenticate user
      const authResult = await authenticateAsync('Sign in with biometrics');

      if (!authResult.success) {
        if (authResult.errorCode === 'user_cancel' || authResult.errorCode === 'user_fallback') {
          setError(null); // User wants to use password
        } else {
          setError(authResult.error || 'Authentication failed');
        }
        return null;
      }

      // Get stored credentials
      const credentials = await getStoredCredentials();

      if (!credentials) {
        setError('No stored credentials found. Please log in with your password.');
        // Disable biometric since credentials are missing
        await setBiometricLoginEnabled(false);
        setIsEnabled(false);
        setHasStoredCredentials(false);
        return null;
      }

      return credentials;
    } catch (err) {
      console.warn('Failed to authenticate and get credentials:', err);
      setError('An unexpected error occurred');
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Initial status check and app state listener
   */
  useEffect(() => {
    checkStatus();

    // Re-check when app comes to foreground (user might have changed biometric settings)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkStatus]);

  // Computed values
  const biometricType = status?.biometricType || 'none';
  const biometricLabel = getBiometricLabel(biometricType);

  return {
    // Native module availability (false in Expo Go)
    isNativeAvailable: isNativeModuleAvailable(),
    // Device capability
    isAvailable: status?.isAvailable || false,
    isEnrolled: status?.isEnrolled || false,
    hasHardware: status?.hasHardware || false,
    biometricType,
    biometricLabel,
    // App settings
    isEnabled,
    hasStoredCredentials,
    // Loading states
    isLoading,
    isAuthenticating,
    // Error
    error,
    // Actions
    checkStatus,
    enableBiometric,
    disableBiometric,
    authenticateAndGetCredentials,
    clearError,
  };
}

export default useBiometric;
