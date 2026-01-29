/**
 * TANDER Biometric Authentication Service
 * Manages device biometric capabilities, authentication, and secure credential storage
 *
 * Uses:
 * - expo-local-authentication: Native biometric prompts (Face ID/Fingerprint)
 * - expo-secure-store: Encrypted credential storage (Keychain/Keystore)
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dynamic imports to handle Expo Go (where native modules aren't available)
let LocalAuthentication: typeof import('expo-local-authentication') | null = null;
let SecureStore: typeof import('expo-secure-store') | null = null;

try {
  LocalAuthentication = require('expo-local-authentication');
} catch (e) {
  console.warn('[Biometric] expo-local-authentication not available - requires development build');
}

try {
  SecureStore = require('expo-secure-store');
} catch (e) {
  console.warn('[Biometric] expo-secure-store not available - requires development build');
}

/**
 * Check if native biometric modules are available
 * Returns false when running in Expo Go
 */
export const isNativeModuleAvailable = (): boolean => {
  return LocalAuthentication !== null && SecureStore !== null;
};

// =============================================================================
// TYPES
// =============================================================================

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricStatus {
  isAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;
  hasHardware: boolean;
  securityLevel: number; // 0=NONE, 1=SECRET, 2=BIOMETRIC
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

export interface StoredCredentials {
  username: string;
  password: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SECURE_STORE_KEYS = {
  BIOMETRIC_ENABLED: 'tander_biometric_enabled',
  CREDENTIALS: 'tander_biometric_credentials',
} as const;

const BIOMETRIC_PROMPT_OPTIONS = {
  promptMessage: 'Sign in with biometrics',
  cancelLabel: 'Cancel',
  fallbackLabel: 'Use Password',
  disableDeviceFallback: false,
};

// =============================================================================
// HARDWARE & AVAILABILITY CHECKS
// =============================================================================

/**
 * Check if device has biometric hardware
 */
export const hasHardwareAsync = async (): Promise<boolean> => {
  if (!LocalAuthentication) return false;
  try {
    return await LocalAuthentication.hasHardwareAsync();
  } catch {
    return false;
  }
};

/**
 * Check if user has enrolled biometrics on the device
 */
export const isEnrolledAsync = async (): Promise<boolean> => {
  if (!LocalAuthentication) return false;
  try {
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
};

/**
 * Get supported authentication types on the device
 */
export const getSupportedTypesAsync = async (): Promise<BiometricType[]> => {
  if (!LocalAuthentication) return [];
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.map((type) => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'facial';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'iris';
        default:
          return 'none';
      }
    });
  } catch {
    return [];
  }
};

/**
 * Get comprehensive biometric status
 */
export const getBiometricStatus = async (): Promise<BiometricStatus> => {
  if (!LocalAuthentication) {
    return {
      isAvailable: false,
      biometricType: 'none',
      isEnrolled: false,
      hasHardware: false,
      securityLevel: 0, // SecurityLevel.NONE
    };
  }
  try {
    const [hasHardware, isEnrolled, supportedTypes, securityLevel] = await Promise.all([
      hasHardwareAsync(),
      isEnrolledAsync(),
      getSupportedTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);

    const primaryType = supportedTypes[0] || 'none';

    return {
      isAvailable: hasHardware && isEnrolled,
      biometricType: primaryType,
      isEnrolled,
      hasHardware,
      securityLevel,
    };
  } catch {
    return {
      isAvailable: false,
      biometricType: 'none',
      isEnrolled: false,
      hasHardware: false,
      securityLevel: 0, // NONE
    };
  }
};

/**
 * Get user-friendly biometric type label
 */
export const getBiometricLabel = (type: BiometricType): string => {
  switch (type) {
    case 'facial':
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    case 'fingerprint':
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    case 'iris':
      return 'Iris Scanner';
    default:
      return 'Biometrics';
  }
};

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Authenticate user with biometrics
 */
export const authenticateAsync = async (
  promptMessage?: string
): Promise<BiometricAuthResult> => {
  if (!LocalAuthentication) {
    return {
      success: false,
      error: 'Biometric authentication not available',
      errorCode: 'not_available',
    };
  }
  try {
    const result = await LocalAuthentication.authenticateAsync({
      ...BIOMETRIC_PROMPT_OPTIONS,
      promptMessage: promptMessage || BIOMETRIC_PROMPT_OPTIONS.promptMessage,
    });

    if (result.success) {
      return { success: true };
    }

    // Handle specific error cases - cast to string to avoid TS strictness
    const errorStr = result.error as string;
    let errorMessage = 'Authentication failed';
    let errorCode = errorStr || 'unknown';

    switch (errorStr) {
      case 'user_cancel':
        errorMessage = 'Authentication cancelled';
        break;
      case 'user_fallback':
        errorMessage = 'User chose to use password';
        break;
      case 'system_cancel':
        errorMessage = 'System cancelled authentication';
        break;
      case 'lockout':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      case 'lockout_permanent':
        errorMessage = 'Biometrics locked. Please unlock device first.';
        break;
      case 'not_enrolled':
        errorMessage = 'No biometrics enrolled on this device';
        break;
      case 'not_available':
      case 'no_hardware':
        errorMessage = 'No biometric hardware available';
        break;
    }

    return { success: false, error: errorMessage, errorCode };
  } catch (error) {
    return {
      success: false,
      error: 'An unexpected error occurred',
      errorCode: 'exception',
    };
  }
};

// =============================================================================
// SECURE CREDENTIAL STORAGE
// =============================================================================

/**
 * Store credentials securely for biometric login
 * Falls back to AsyncStorage in Expo Go (less secure, for testing only)
 */
export const storeCredentials = async (
  username: string,
  password: string
): Promise<boolean> => {
  try {
    const credentials: StoredCredentials = { username, password };
    if (SecureStore) {
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.CREDENTIALS,
        JSON.stringify(credentials),
        {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );
    } else {
      // Fallback for Expo Go - NOT secure, for testing only
      await AsyncStorage.setItem(SECURE_STORE_KEYS.CREDENTIALS, JSON.stringify(credentials));
    }
    return true;
  } catch (error) {
    console.warn('Failed to store credentials:', error);
    return false;
  }
};

/**
 * Retrieve stored credentials
 */
export const getStoredCredentials = async (): Promise<StoredCredentials | null> => {
  try {
    let credentialsStr: string | null = null;
    if (SecureStore) {
      credentialsStr = await SecureStore.getItemAsync(SECURE_STORE_KEYS.CREDENTIALS);
    } else {
      credentialsStr = await AsyncStorage.getItem(SECURE_STORE_KEYS.CREDENTIALS);
    }
    if (!credentialsStr) return null;
    return JSON.parse(credentialsStr) as StoredCredentials;
  } catch (error) {
    console.warn('Failed to get stored credentials:', error);
    return null;
  }
};

/**
 * Clear stored credentials
 */
export const clearCredentials = async (): Promise<boolean> => {
  try {
    if (SecureStore) {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.CREDENTIALS);
    } else {
      await AsyncStorage.removeItem(SECURE_STORE_KEYS.CREDENTIALS);
    }
    return true;
  } catch (error) {
    console.warn('Failed to clear credentials:', error);
    return false;
  }
};

/**
 * Check if biometric login is enabled locally
 */
export const isBiometricLoginEnabled = async (): Promise<boolean> => {
  try {
    let enabled: string | null = null;
    if (SecureStore) {
      enabled = await SecureStore.getItemAsync(SECURE_STORE_KEYS.BIOMETRIC_ENABLED);
    } else {
      enabled = await AsyncStorage.getItem(SECURE_STORE_KEYS.BIOMETRIC_ENABLED);
    }
    return enabled === 'true';
  } catch {
    return false;
  }
};

/**
 * Set biometric login enabled state
 */
export const setBiometricLoginEnabled = async (enabled: boolean): Promise<boolean> => {
  try {
    if (enabled) {
      if (SecureStore) {
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.BIOMETRIC_ENABLED, 'true');
      } else {
        await AsyncStorage.setItem(SECURE_STORE_KEYS.BIOMETRIC_ENABLED, 'true');
      }
    } else {
      if (SecureStore) {
        await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.BIOMETRIC_ENABLED);
      } else {
        await AsyncStorage.removeItem(SECURE_STORE_KEYS.BIOMETRIC_ENABLED);
      }
      await clearCredentials();
    }
    return true;
  } catch (error) {
    console.warn('Failed to set biometric enabled state:', error);
    return false;
  }
};

// =============================================================================
// EXPORT SERVICE OBJECT
// =============================================================================

export const biometricService = {
  // Status checks
  hasHardwareAsync,
  isEnrolledAsync,
  getSupportedTypesAsync,
  getBiometricStatus,
  getBiometricLabel,
  // Authentication
  authenticateAsync,
  // Credential storage
  storeCredentials,
  getStoredCredentials,
  clearCredentials,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
};

export default biometricService;
