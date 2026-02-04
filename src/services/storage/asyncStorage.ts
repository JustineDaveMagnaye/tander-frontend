/**
 * AsyncStorage Service
 * Wrapper around React Native AsyncStorage for persistent storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageInterface {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

// Storage wrapper using AsyncStorage
const asyncStorageWrapper: StorageInterface = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('AsyncStorage getItem error:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('AsyncStorage setItem error:', error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('AsyncStorage removeItem error:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.warn('AsyncStorage clear error:', error);
      throw error;
    }
  },
};

// Export the storage instance
export const storage: StorageInterface = asyncStorageWrapper;

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@tander/auth_token',
  USER_DATA: '@tander/user_data',
  REFRESH_TOKEN: '@tander/refresh_token',
  REGISTRATION_PHASE: '@tander/registration_phase',
  CURRENT_USERNAME: '@tander/current_username',
  SCANNED_ID_FRONT: '@tander/scanned_id_front',
} as const;
