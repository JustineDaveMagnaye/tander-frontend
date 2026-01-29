/**
 * Auth Interceptor
 * Handles 401 Unauthorized errors globally by logging out the user
 * and redirecting to the login screen.
 */

import { addResponseInterceptor } from './client';
import { storage, STORAGE_KEYS } from '../storage/asyncStorage';
import { useAuthStore } from '@/store/authStore';

let isLoggingOut = false;

/**
 * Clear all auth-related storage and reset auth state
 * This is called when a 401 error is received
 */
const handleUnauthorized = async (): Promise<void> => {
  // Prevent multiple simultaneous logout attempts
  if (isLoggingOut) {
    return;
  }

  isLoggingOut = true;

  try {
    console.log('[AuthInterceptor] Session expired, logging out user...');

    // Clear all stored auth data
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      storage.removeItem(STORAGE_KEYS.USER_DATA),
      storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      storage.removeItem(STORAGE_KEYS.REGISTRATION_PHASE),
      storage.removeItem(STORAGE_KEYS.CURRENT_USERNAME),
      storage.removeItem('CURRENT_EMAIL'),
    ]);

    // Reset auth store state - this will trigger navigation to auth flow
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      token: null,
      registrationPhase: 'none',
      currentUsername: null,
      currentEmail: null,
      maskedEmail: null,
      isLoading: false,
      error: null,
    });

    console.log('[AuthInterceptor] User logged out successfully');
  } catch (error) {
    console.warn('[AuthInterceptor] Error during logout:', error);
  } finally {
    isLoggingOut = false;
  }
};

/**
 * Setup the auth interceptor
 * Call this once during app initialization
 */
export const setupAuthInterceptor = (): void => {
  addResponseInterceptor({
    onResponseError: async (error) => {
      // Check if this is a 401 Unauthorized error
      if (error.statusCode === 401) {
        // Handle the unauthorized error by logging out
        await handleUnauthorized();
      }

      // Always return the error so the calling code can handle it too
      return error;
    },
  });

  console.log('[AuthInterceptor] Auth interceptor initialized');
};

export default setupAuthInterceptor;
