/**
 * TANDER Auth Store
 * Zustand store for authentication state management
 */

import { create } from 'zustand';
import { User, ProfileData } from '@shared/types';
import { authApi } from '../services/api/authApi';
import { storage, STORAGE_KEYS } from '../services/storage/asyncStorage';
import { syncTokenToNative } from '../services/storage/tokenStorage';

type RegistrationPhase = 'none' | 'registered' | 'email_pending' | 'email_verified' | 'otp_pending' | 'otp_verified' | 'profile_completed' | 'verified';

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  user: User | null;
  token: string | null;
  registrationPhase: RegistrationPhase;
  currentUsername: string | null;
  currentEmail: string | null; // For email verification flow
  maskedEmail: string | null; // For display during email verification
  scannedIdFront: string | null; // URI of scanned ID front photo
  scannedIdBack: string | null; // URI of scanned ID back photo (optional)
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  registerWithEmail: (username: string, email: string, password: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ nextResendAvailableAt: string }>;
  verifyEmailToken: (token: string) => Promise<void>;
  sendOtp: (username: string) => Promise<void>;
  verifyOtp: (username: string, otp: string) => Promise<void>;
  completeProfile: (profile: ProfileData) => Promise<void>;
  verifyId: (idPhotoFront: any, idPhotoBack?: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  setRegistrationPhase: (phase: RegistrationPhase) => void;
  setCurrentEmail: (email: string, maskedEmail?: string) => void;
  setScannedId: (front: string, back: string | null) => void;
  clearScannedId: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  user: null,
  token: null,
  registrationPhase: 'none',
  currentUsername: null,
  currentEmail: null,
  maskedEmail: null,
  scannedIdFront: null,
  scannedIdBack: null,
  error: null,

  // Login action
  login: async (username: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await authApi.login({ username, password });

      // Check if registration is complete
      const isFullyVerified = response.registrationPhase === 'verified';

      if (isFullyVerified) {
        // Full login - store token and user data
        await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
        await storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
        if (response.refreshToken) {
          await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
        }
        // Clear any leftover registration data
        await storage.removeItem(STORAGE_KEYS.REGISTRATION_PHASE);
        await storage.removeItem(STORAGE_KEYS.CURRENT_USERNAME);
        await storage.removeItem('CURRENT_EMAIL');

        set({
          isAuthenticated: true,
          user: response.user,
          token: response.token,
          registrationPhase: 'verified',
          currentUsername: null,
          currentEmail: null,
          isLoading: false,
          error: null,
        });
      } else {
        // Incomplete registration - store phase and redirect to continue
        await storage.setItem(STORAGE_KEYS.CURRENT_USERNAME, username);
        await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, response.registrationPhase);
        // Store token temporarily for authenticated registration steps
        await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);

        set({
          isAuthenticated: false, // Not fully authenticated yet
          user: response.user,
          token: response.token,
          registrationPhase: response.registrationPhase,
          currentUsername: username,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // Register action (Phase 1) - Legacy OTP flow
  register: async (username: string, email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      await authApi.register({ username, email, password });

      // Store current username for next phases
      await storage.setItem(STORAGE_KEYS.CURRENT_USERNAME, username);
      await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'otp_pending');

      set({
        registrationPhase: 'otp_pending',
        currentUsername: username,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      set({
        registrationPhase: 'none',
        currentUsername: null,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // Register with Email Verification (New flow)
  registerWithEmail: async (username: string, email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const result = await authApi.registerWithEmail({ username, email, password });

      // Store current username and email for verification flow
      await storage.setItem(STORAGE_KEYS.CURRENT_USERNAME, username);
      await storage.setItem('CURRENT_EMAIL', email);
      await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'email_pending');

      set({
        registrationPhase: 'email_pending',
        currentUsername: username,
        currentEmail: email,
        maskedEmail: result.data?.email || email,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Registration failed';
      set({
        registrationPhase: 'none',
        currentUsername: null,
        currentEmail: null,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // Resend verification email
  resendVerificationEmail: async (email: string) => {
    try {
      set({ isLoading: true, error: null });

      const result = await authApi.resendVerification(email);

      set({ isLoading: false, error: null });

      return {
        nextResendAvailableAt: result.data?.nextResendAvailableAt || result.nextResendAvailableAt || '',
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to resend verification email';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  // Verify email token (from deep link)
  verifyEmailToken: async (token: string) => {
    try {
      set({ isLoading: true, error: null });

      const result = await authApi.verifyEmail(token);

      if (!result.success) {
        throw new Error(result.message || 'Email verification failed');
      }

      // Update registration phase
      await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'email_verified');

      set({
        registrationPhase: 'email_verified',
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Email verification failed';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  // Set current email (for navigation between screens)
  setCurrentEmail: (email: string, maskedEmail?: string) => {
    set({ currentEmail: email, maskedEmail: maskedEmail || email });
    storage.setItem('CURRENT_EMAIL', email);
  },

  // Set scanned ID photos (from IDScannerScreen)
  setScannedId: (front: string, back: string | null) => {
    set({ scannedIdFront: front, scannedIdBack: back });
  },

  // Clear scanned ID photos
  clearScannedId: () => {
    set({ scannedIdFront: null, scannedIdBack: null });
  },

  // Send OTP action (Phase 1.5)
  sendOtp: async (username: string) => {
    try {
      set({ isLoading: true, error: null });

      await authApi.sendOtp(username);

      set({
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // Verify OTP action (Phase 1.5)
  verifyOtp: async (username: string, otp: string) => {
    try {
      set({ isLoading: true, error: null });

      const result = await authApi.verifyOtp(username, otp);

      if (!result.verified) {
        throw new Error(result.message || 'Invalid OTP code');
      }

      // Update storage to mark OTP as verified
      await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'otp_verified');

      set({
        registrationPhase: 'otp_verified',
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OTP verification failed';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // Complete profile action (Phase 2)
  completeProfile: async (profile: ProfileData) => {
    try {
      set({ isLoading: true, error: null });

      const { currentUsername } = get();
      if (!currentUsername) {
        throw new Error('No username found. Please register first.');
      }

      await authApi.completeProfile(currentUsername, profile, true);

      // Update storage
      await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'profile_completed');

      set({
        registrationPhase: 'profile_completed',
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile completion failed';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // Verify ID action (Phase 3)
  // Note: After ID verification, user must login separately
  verifyId: async (idPhotoFront: any, idPhotoBack?: any) => {
    try {
      set({ isLoading: true, error: null });

      const { currentUsername } = get();
      if (!currentUsername) {
        throw new Error('No username found. Please complete registration first.');
      }

      await authApi.verifyId({
        username: currentUsername,
        idPhotoFront,
        idPhotoBack,
      });

      // Mark registration as verified - user needs to login
      await storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, 'verified');

      // Clear temporary registration data
      await storage.removeItem(STORAGE_KEYS.CURRENT_USERNAME);

      set({
        isAuthenticated: false, // User needs to login after verification
        registrationPhase: 'verified',
        currentUsername: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ID verification failed';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // Logout action
  logout: async () => {
    try {
      set({ isLoading: true, error: null });

      // Call logout API
      await authApi.logout();

      // Clear all stored data
      await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await storage.removeItem(STORAGE_KEYS.USER_DATA);
      await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await storage.removeItem(STORAGE_KEYS.REGISTRATION_PHASE);
      await storage.removeItem(STORAGE_KEYS.CURRENT_USERNAME);
      await storage.removeItem('CURRENT_EMAIL');

      set({
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // Check authentication status on app start
  checkAuthStatus: async () => {
    try {
      set({ isLoading: true });

      // Get stored token and user data
      const token = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userDataStr = await storage.getItem(STORAGE_KEYS.USER_DATA);
      const registrationPhaseStr = await storage.getItem(STORAGE_KEYS.REGISTRATION_PHASE);
      const currentUsername = await storage.getItem(STORAGE_KEYS.CURRENT_USERNAME);

      if (token && userDataStr) {
        // Use stored user data directly without network validation
        // Network validation on startup causes issues with React Native fetch
        try {
          const userData = JSON.parse(userDataStr);

          // Sync token to native SharedPreferences for native API calls (e.g., decline call)
          syncTokenToNative();

          set({
            isAuthenticated: true,
            user: userData,
            token,
            registrationPhase: 'verified',
            isLoading: false,
            isInitialized: true,
          });
          return;
        } catch (parseError) {
          console.warn('[AUTH] Failed to parse stored user data:', parseError);
          await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          await storage.removeItem(STORAGE_KEYS.USER_DATA);
        }
      }

      // Check if user is in registration flow
      // Require token for phases that need authentication (ProfileSetup, IDVerification)
      const phasesRequiringToken = ['email_verified', 'otp_verified', 'profile_completed'];
      const needsToken = phasesRequiringToken.includes(registrationPhaseStr || '');

      if (registrationPhaseStr && currentUsername && (!needsToken || token)) {
        // Also restore email for email verification flow
        const currentEmail = await storage.getItem('CURRENT_EMAIL');
        set({
          isAuthenticated: false,
          registrationPhase: registrationPhaseStr as RegistrationPhase,
          currentUsername,
          currentEmail: currentEmail || null,
          token: token || null,
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      // Clear stale registration data if token is missing but required
      if (registrationPhaseStr && needsToken && !token) {
        await storage.removeItem(STORAGE_KEYS.REGISTRATION_PHASE);
        await storage.removeItem(STORAGE_KEYS.CURRENT_USERNAME);
        await storage.removeItem('CURRENT_EMAIL');
      }

      // No valid auth or registration state
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        registrationPhase: 'none',
        currentUsername: null,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      console.warn('Error checking auth status:', error);
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        registrationPhase: 'none',
        currentUsername: null,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  // Set registration phase manually
  setRegistrationPhase: (phase: RegistrationPhase) => {
    set({ registrationPhase: phase });
    storage.setItem(STORAGE_KEYS.REGISTRATION_PHASE, phase);
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

// Export selectors for better performance
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectIsInitialized = (state: AuthState) => state.isInitialized;
export const selectUser = (state: AuthState) => state.user;
export const selectToken = (state: AuthState) => state.token;
export const selectRegistrationPhase = (state: AuthState) => state.registrationPhase;
export const selectCurrentUsername = (state: AuthState) => state.currentUsername;
export const selectCurrentEmail = (state: AuthState) => state.currentEmail;
export const selectMaskedEmail = (state: AuthState) => state.maskedEmail;
export const selectError = (state: AuthState) => state.error;
