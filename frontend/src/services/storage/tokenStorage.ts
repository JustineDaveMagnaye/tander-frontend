/**
 * Token Storage Service
 * Manages secure storage of JWT tokens and user data using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { incomingCallNativeModule } from '@/services/incomingCall/IncomingCallNativeModule';
import { StoredUserData } from '@/types/api';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  AUTH_TOKEN: '@tander:auth_token',
  USER_DATA: '@tander:user_data',
  REFRESH_TOKEN: '@tander:refresh_token',
} as const;

// ============================================================================
// Token Management
// ============================================================================

/**
 * Get the stored JWT token
 * @returns Promise resolving to the token string or null if not found
 */
export const getToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return token;
  } catch (error) {
    console.warn('Error getting token from storage:', error);
    return null;
  }
};

/**
 * Store JWT token
 * @param token - The JWT token to store
 * @returns Promise resolving when token is stored
 */
export const setToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

    // Also store in native SharedPreferences for native API calls (e.g., decline call when app killed)
    if (Platform.OS === 'android' && incomingCallNativeModule.isAvailable()) {
      incomingCallNativeModule.setAuthToken(token);
    }
  } catch (error) {
    console.warn('Error setting token in storage:', error);
    throw error;
  }
};

/**
 * Remove JWT token from storage
 * @returns Promise resolving when token is removed
 */
export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);

    // Also clear from native SharedPreferences
    if (Platform.OS === 'android' && incomingCallNativeModule.isAvailable()) {
      incomingCallNativeModule.clearAuthToken();
    }
  } catch (error) {
    console.warn('Error removing token from storage:', error);
    throw error;
  }
};

// ============================================================================
// User Data Management
// ============================================================================

/**
 * Get stored user data
 * @returns Promise resolving to user data object or null if not found
 */
export const getUserData = async (): Promise<StoredUserData | null> => {
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.warn('Error getting user data from storage:', error);
    return null;
  }
};

/**
 * Store user data
 * @param user - The user data to store
 * @returns Promise resolving when user data is stored
 */
export const setUserData = async (user: StoredUserData): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  } catch (error) {
    console.warn('Error setting user data in storage:', error);
    throw error;
  }
};

/**
 * Remove user data from storage
 * @returns Promise resolving when user data is removed
 */
export const removeUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
  } catch (error) {
    console.warn('Error removing user data from storage:', error);
    throw error;
  }
};

// ============================================================================
// Refresh Token Management (Optional)
// ============================================================================

/**
 * Get the stored refresh token
 * @returns Promise resolving to the refresh token string or null if not found
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    return refreshToken;
  } catch (error) {
    console.warn('Error getting refresh token from storage:', error);
    return null;
  }
};

/**
 * Store refresh token
 * @param token - The refresh token to store
 * @returns Promise resolving when refresh token is stored
 */
export const setRefreshToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  } catch (error) {
    console.warn('Error setting refresh token in storage:', error);
    throw error;
  }
};

/**
 * Remove refresh token from storage
 * @returns Promise resolving when refresh token is removed
 */
export const removeRefreshToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.warn('Error removing refresh token from storage:', error);
    throw error;
  }
};

// ============================================================================
// Clear All Data
// ============================================================================

/**
 * Clear all authentication and user data from storage
 * Useful for logout
 * @returns Promise resolving when all data is cleared
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.REFRESH_TOKEN,
    ]);

    // Also clear from native SharedPreferences
    if (Platform.OS === 'android' && incomingCallNativeModule.isAvailable()) {
      incomingCallNativeModule.clearAuthToken();
    }
  } catch (error) {
    console.warn('Error clearing all data from storage:', error);
    throw error;
  }
};

// ============================================================================
// Native Token Sync
// ============================================================================

/**
 * Sync existing token to native SharedPreferences
 * Call this on app startup to ensure native code has access to auth token
 * This is needed for native API calls (e.g., decline call when app killed)
 */
export const syncTokenToNative = async (): Promise<void> => {
  if (Platform.OS !== 'android' || !incomingCallNativeModule.isAvailable()) {
    return;
  }

  try {
    // Note: authStore uses '@tander/auth_token' key (from asyncStorage.ts)
    // We check both keys for compatibility
    let token = await AsyncStorage.getItem('@tander/auth_token');
    if (!token) {
      token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }
    if (token) {
      incomingCallNativeModule.setAuthToken(token);
      console.log('[TokenStorage] Auth token synced to native SharedPreferences');
    } else {
      console.log('[TokenStorage] No auth token found to sync');
    }
  } catch (error) {
    console.warn('[TokenStorage] Error syncing token to native:', error);
  }
};

// ============================================================================
// Exports
// ============================================================================

export default {
  getToken,
  setToken,
  removeToken,
  getUserData,
  setUserData,
  removeUserData,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  clearAllData,
  syncTokenToNative,
};
