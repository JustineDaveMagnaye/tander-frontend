/**
 * useForgotPasswordApi Hook
 * Handles API calls with proper error handling, timeouts, and cleanup
 *
 * INTEGRATION STATUS:
 * ✅ sendOTP - Connected to twilioApi.sendOtp (phone) / twilioApi.sendOtpEmail (email)
 * ✅ verifyOTP - Connected to twilioApi.verifyOtp (phone) / twilioApi.verifyOtpEmail (email)
 * ✅ resendOTP - Connected to twilioApi (same as sendOTP)
 * ⚠️ resetPassword - TODO: Backend endpoint needed (POST /api/auth/reset-password)
 */

import { useCallback, useRef, useEffect } from 'react';
import { ForgotPasswordAction } from '../types';
import { TIMING, ERROR_MESSAGES, SUCCESS_MESSAGES, VALIDATION } from '../constants';
import { safeHaptic, HapticType } from '../utils';
import { twilioApi } from '@/services/api/twilioApi';

interface UseForgotPasswordApiProps {
  dispatch: React.Dispatch<ForgotPasswordAction>;
  method: 'phone' | 'email';
  phone: string;
  email: string;
  otp: string;
  newPassword: string;
  onOtpSent?: () => void;
  onOtpVerified?: () => void;
  onPasswordReset?: () => void;
}

interface UseForgotPasswordApiReturn {
  sendOTP: () => Promise<boolean>;
  verifyOTP: () => Promise<boolean>;
  resendOTP: () => Promise<boolean>;
  resetPassword: () => Promise<boolean>;
  isRequestInFlight: boolean;
}

// Promise with timeout wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    ),
  ]);
}

// Check network connectivity
// Note: NetInfo is optional - if not installed, we assume connected
async function checkNetwork(): Promise<boolean> {
  // Always return true for now - NetInfo integration is optional
  // When @react-native-community/netinfo is installed, this can be enhanced
  return true;
}

export function useForgotPasswordApi({
  dispatch,
  method,
  phone,
  email,
  otp,
  newPassword,
  onOtpSent,
  onOtpVerified,
  onPasswordReset,
}: UseForgotPasswordApiProps): UseForgotPasswordApiReturn {
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestInFlightRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Safe state update that checks if component is mounted
  const safeDispatch = useCallback((action: ForgotPasswordAction) => {
    if (isMountedRef.current) {
      dispatch(action);
    }
  }, [dispatch]);

  // Handle API error
  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    if (!isMountedRef.current) return;

    let errorMessage = defaultMessage;

    if (error instanceof Error) {
      if (error.message === 'TIMEOUT') {
        errorMessage = ERROR_MESSAGES.network.timeout;
      } else if (error.name === 'AbortError') {
        return; // Request was cancelled, don't show error
      }
    }

    safeHaptic(HapticType.Error);
    safeDispatch({ type: 'SET_ERROR', payload: errorMessage });
  }, [safeDispatch]);

  // Send OTP - Connected to Twilio API
  const sendOTP = useCallback(async (): Promise<boolean> => {
    // Prevent double-tap
    if (requestInFlightRef.current) return false;

    // Check network
    const isConnected = await checkNetwork();
    if (!isConnected) {
      safeHaptic(HapticType.Error);
      safeDispatch({ type: 'SET_ERROR', payload: ERROR_MESSAGES.network.offline });
      return false;
    }

    requestInFlightRef.current = true;
    abortControllerRef.current = new AbortController();

    safeDispatch({ type: 'SET_LOADING', payload: true });
    safeDispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Call actual Twilio API based on method
      if (method === 'phone') {
        // Format phone number: add +63 prefix for Philippine numbers
        const formattedPhone = `${VALIDATION.PH_COUNTRY_CODE}${phone}`;
        console.log('[ForgotPassword] Sending OTP to phone:', formattedPhone);

        const response = await withTimeout(
          twilioApi.sendOtp(formattedPhone, 'sms'),
          TIMING.API_TIMEOUT
        );

        console.log('[ForgotPassword] Phone OTP response:', response);

        if (!response.success) {
          throw new Error(response.message || 'Failed to send OTP');
        }
      } else {
        // Email OTP
        console.log('[ForgotPassword] Sending OTP to email:', email);

        const response = await withTimeout(
          twilioApi.sendOtpEmail(email),
          TIMING.API_TIMEOUT
        );

        console.log('[ForgotPassword] Email OTP response:', response);

        if (!response.success) {
          throw new Error(response.message || 'Failed to send OTP');
        }
      }

      if (!isMountedRef.current) return false;

      safeHaptic(HapticType.Success);
      safeDispatch({ type: 'SET_LOADING', payload: false });
      safeDispatch({ type: 'SET_SUCCESS_MESSAGE', payload: SUCCESS_MESSAGES.otp_sent });
      safeDispatch({ type: 'SET_STEP', payload: 'verify' });
      safeDispatch({ type: 'SET_RESEND_TIMER', payload: TIMING.RESEND_TIMER_SECONDS });

      onOtpSent?.();
      return true;
    } catch (error) {
      console.warn('[ForgotPassword] sendOTP error:', error);
      safeDispatch({ type: 'SET_LOADING', payload: false });
      handleError(error, ERROR_MESSAGES.network.send_failed);
      return false;
    } finally {
      requestInFlightRef.current = false;
      abortControllerRef.current = null;
    }
  }, [method, phone, email, safeDispatch, handleError, onOtpSent]);

  // Verify OTP - Connected to Twilio API
  const verifyOTP = useCallback(async (): Promise<boolean> => {
    if (requestInFlightRef.current) return false;

    const isConnected = await checkNetwork();
    if (!isConnected) {
      safeHaptic(HapticType.Error);
      safeDispatch({ type: 'SET_ERROR', payload: ERROR_MESSAGES.network.offline });
      return false;
    }

    requestInFlightRef.current = true;
    abortControllerRef.current = new AbortController();

    safeDispatch({ type: 'SET_LOADING', payload: true });
    safeDispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Call actual Twilio API based on method
      let response;

      if (method === 'phone') {
        // Format phone number: add +63 prefix for Philippine numbers
        const formattedPhone = `${VALIDATION.PH_COUNTRY_CODE}${phone}`;
        console.log('[ForgotPassword] Verifying phone OTP:', formattedPhone, 'code:', otp);

        response = await withTimeout(
          twilioApi.verifyOtp(formattedPhone, otp),
          TIMING.API_TIMEOUT
        );
      } else {
        // Email OTP verification
        console.log('[ForgotPassword] Verifying email OTP:', email, 'code:', otp);

        response = await withTimeout(
          twilioApi.verifyOtpEmail(email, otp),
          TIMING.API_TIMEOUT
        );
      }

      console.log('[ForgotPassword] OTP verification response:', response);

      // Check if verification succeeded
      if (!response.success || !response.valid) {
        // OTP is invalid
        safeHaptic(HapticType.Error);
        safeDispatch({ type: 'SET_LOADING', payload: false });
        safeDispatch({ type: 'SET_ERROR', payload: ERROR_MESSAGES.otp.invalid });
        return false;
      }

      if (!isMountedRef.current) return false;

      safeHaptic(HapticType.Success);
      safeDispatch({ type: 'SET_LOADING', payload: false });
      safeDispatch({ type: 'SET_STEP', payload: 'password' });

      // Clear OTP from state for security
      safeDispatch({ type: 'CLEAR_OTP' });

      onOtpVerified?.();
      return true;
    } catch (error) {
      console.warn('[ForgotPassword] verifyOTP error:', error);
      safeDispatch({ type: 'SET_LOADING', payload: false });
      handleError(error, ERROR_MESSAGES.network.verify_failed);
      return false;
    } finally {
      requestInFlightRef.current = false;
      abortControllerRef.current = null;
    }
  }, [method, phone, email, otp, safeDispatch, handleError, onOtpVerified]);

  // Resend OTP - Connected to Twilio API (same endpoints as sendOTP)
  const resendOTP = useCallback(async (): Promise<boolean> => {
    if (requestInFlightRef.current) return false;

    const isConnected = await checkNetwork();
    if (!isConnected) {
      safeHaptic(HapticType.Error);
      safeDispatch({ type: 'SET_ERROR', payload: ERROR_MESSAGES.network.offline });
      return false;
    }

    requestInFlightRef.current = true;

    safeDispatch({ type: 'CLEAR_OTP' });
    safeDispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Call actual Twilio API based on method (same as sendOTP)
      if (method === 'phone') {
        const formattedPhone = `${VALIDATION.PH_COUNTRY_CODE}${phone}`;
        console.log('[ForgotPassword] Resending OTP to phone:', formattedPhone);

        const response = await withTimeout(
          twilioApi.sendOtp(formattedPhone, 'sms'),
          TIMING.API_TIMEOUT
        );

        if (!response.success) {
          throw new Error(response.message || 'Failed to resend OTP');
        }
      } else {
        console.log('[ForgotPassword] Resending OTP to email:', email);

        const response = await withTimeout(
          twilioApi.sendOtpEmail(email),
          TIMING.API_TIMEOUT
        );

        if (!response.success) {
          throw new Error(response.message || 'Failed to resend OTP');
        }
      }

      if (!isMountedRef.current) return false;

      safeHaptic(HapticType.Success);
      safeDispatch({ type: 'SET_RESEND_TIMER', payload: TIMING.RESEND_TIMER_SECONDS });
      safeDispatch({ type: 'SET_SUCCESS_MESSAGE', payload: SUCCESS_MESSAGES.otp_resent });

      return true;
    } catch (error) {
      console.warn('[ForgotPassword] resendOTP error:', error);
      handleError(error, ERROR_MESSAGES.network.resend_failed);
      return false;
    } finally {
      requestInFlightRef.current = false;
    }
  }, [method, phone, email, safeDispatch, handleError]);

  // Reset Password
  // ⚠️ TODO: Backend endpoint needed!
  // Expected endpoint: POST /api/auth/reset-password
  // Expected payload: { email?: string, phoneNumber?: string, newPassword: string }
  // The OTP was already verified via Twilio - this just sets the new password
  const resetPassword = useCallback(async (): Promise<boolean> => {
    if (requestInFlightRef.current) return false;

    const isConnected = await checkNetwork();
    if (!isConnected) {
      safeHaptic(HapticType.Error);
      safeDispatch({ type: 'SET_ERROR', payload: ERROR_MESSAGES.network.offline });
      return false;
    }

    requestInFlightRef.current = true;
    abortControllerRef.current = new AbortController();

    safeDispatch({ type: 'SET_LOADING', payload: true });
    safeDispatch({ type: 'SET_ERROR', payload: null });

    try {
      // TODO: Implement when backend endpoint is available
      // Expected implementation:
      // const response = await apiClient.post('/api/auth/reset-password', {
      //   ...(method === 'phone'
      //     ? { phoneNumber: `${VALIDATION.PH_COUNTRY_CODE}${phone}` }
      //     : { email }
      //   ),
      //   newPassword,
      // }, { skipAuth: true });

      console.warn('[ForgotPassword] resetPassword: Backend endpoint not implemented yet!');
      console.log('[ForgotPassword] Would reset password for:', method === 'phone' ? phone : email);

      // Simulate API delay for now
      await withTimeout(
        new Promise(resolve => setTimeout(resolve, TIMING.RESET_PASSWORD_DELAY)),
        TIMING.API_TIMEOUT
      );

      if (!isMountedRef.current) return false;

      safeHaptic(HapticType.Success);
      safeDispatch({ type: 'SET_LOADING', payload: false });

      // Clear passwords from state for security
      safeDispatch({ type: 'CLEAR_PASSWORDS' });

      safeDispatch({ type: 'SET_STEP', payload: 'success' });

      onPasswordReset?.();
      return true;
    } catch (error) {
      console.warn('[ForgotPassword] resetPassword error:', error);
      safeDispatch({ type: 'SET_LOADING', payload: false });
      handleError(error, ERROR_MESSAGES.network.reset_failed);
      return false;
    } finally {
      requestInFlightRef.current = false;
      abortControllerRef.current = null;
    }
  }, [method, phone, email, newPassword, safeDispatch, handleError, onPasswordReset]);

  return {
    sendOTP,
    verifyOTP,
    resendOTP,
    resetPassword,
    isRequestInFlight: requestInFlightRef.current,
  };
}
