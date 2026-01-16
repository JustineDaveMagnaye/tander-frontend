/**
 * useForgotPasswordApi Hook
 * Handles API calls with proper error handling, timeouts, and cleanup
 */

import { useCallback, useRef, useEffect } from 'react';
import { ForgotPasswordAction } from '../types';
import { TIMING, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants';
import { safeHaptic, HapticType } from '../utils';

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

  // Send OTP
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
      // TODO: Replace with actual API call
      // const response = await api.sendOTP({
      //   method,
      //   contact: method === 'phone' ? phone : email,
      //   signal: abortControllerRef.current.signal,
      // });

      await withTimeout(
        new Promise(resolve => setTimeout(resolve, TIMING.SEND_OTP_DELAY)),
        TIMING.API_TIMEOUT
      );

      if (!isMountedRef.current) return false;

      safeHaptic(HapticType.Success);
      safeDispatch({ type: 'SET_LOADING', payload: false });
      safeDispatch({ type: 'SET_SUCCESS_MESSAGE', payload: SUCCESS_MESSAGES.otp_sent });
      safeDispatch({ type: 'SET_STEP', payload: 'verify' });
      safeDispatch({ type: 'SET_RESEND_TIMER', payload: TIMING.RESEND_TIMER_SECONDS });

      onOtpSent?.();
      return true;
    } catch (error) {
      safeDispatch({ type: 'SET_LOADING', payload: false });
      handleError(error, ERROR_MESSAGES.network.send_failed);
      return false;
    } finally {
      requestInFlightRef.current = false;
      abortControllerRef.current = null;
    }
  }, [method, phone, email, safeDispatch, handleError, onOtpSent]);

  // Verify OTP
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
      // TODO: Replace with actual API call
      // const response = await api.verifyOTP({
      //   method,
      //   contact: method === 'phone' ? phone : email,
      //   otp,
      //   signal: abortControllerRef.current.signal,
      // });

      await withTimeout(
        new Promise(resolve => setTimeout(resolve, TIMING.VERIFY_OTP_DELAY)),
        TIMING.API_TIMEOUT
      );

      // TODO: Validate OTP from server response
      // For now, simulate validation (REMOVE IN PRODUCTION)
      // In production, server should validate and return success/failure

      if (!isMountedRef.current) return false;

      safeHaptic(HapticType.Success);
      safeDispatch({ type: 'SET_LOADING', payload: false });
      safeDispatch({ type: 'SET_STEP', payload: 'password' });

      // Clear OTP from state for security
      safeDispatch({ type: 'CLEAR_OTP' });

      onOtpVerified?.();
      return true;
    } catch (error) {
      safeDispatch({ type: 'SET_LOADING', payload: false });
      handleError(error, ERROR_MESSAGES.network.verify_failed);
      return false;
    } finally {
      requestInFlightRef.current = false;
      abortControllerRef.current = null;
    }
  }, [method, phone, email, otp, safeDispatch, handleError, onOtpVerified]);

  // Resend OTP
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
      // TODO: Replace with actual API call
      await withTimeout(
        new Promise(resolve => setTimeout(resolve, TIMING.RESEND_OTP_DELAY)),
        TIMING.API_TIMEOUT
      );

      if (!isMountedRef.current) return false;

      safeHaptic(HapticType.Success);
      safeDispatch({ type: 'SET_RESEND_TIMER', payload: TIMING.RESEND_TIMER_SECONDS });
      safeDispatch({ type: 'SET_SUCCESS_MESSAGE', payload: SUCCESS_MESSAGES.otp_resent });

      return true;
    } catch (error) {
      handleError(error, ERROR_MESSAGES.network.resend_failed);
      return false;
    } finally {
      requestInFlightRef.current = false;
    }
  }, [safeDispatch, handleError]);

  // Reset Password
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
      // TODO: Replace with actual API call
      // const response = await api.resetPassword({
      //   method,
      //   contact: method === 'phone' ? phone : email,
      //   newPassword,
      //   signal: abortControllerRef.current.signal,
      // });

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
