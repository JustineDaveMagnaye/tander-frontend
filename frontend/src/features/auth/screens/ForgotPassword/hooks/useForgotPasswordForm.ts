/**
 * useForgotPasswordForm Hook
 * Manages form state using useReducer for better state management
 */

import { useReducer, useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, AppState, AppStateStatus } from 'react-native';
import {
  ForgotPasswordState,
  ForgotPasswordAction,
  PasswordRequirements,
  ValidationResult,
} from '../types';
import {
  VALIDATION,
  ERROR_MESSAGES,
} from '../constants';

// Initial state
const initialState: ForgotPasswordState = {
  // Form state
  step: 'method',
  method: 'phone',
  phone: '',
  email: '',
  otp: '',
  newPassword: '',
  confirmPassword: '',
  showPassword: false,
  // UI state
  loading: false,
  error: null,
  resendTimer: 0,
  reduceMotion: false,
  successMessage: null,
};

// Reducer function
function forgotPasswordReducer(
  state: ForgotPasswordState,
  action: ForgotPasswordAction
): ForgotPasswordState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload, error: null, successMessage: null };

    case 'SET_METHOD':
      return {
        ...state,
        method: action.payload,
        phone: '',
        email: '',
        error: null,
      };

    case 'SET_PHONE':
      // Allow the raw input - only limit length, do minimal sanitization
      // Keep digits, spaces for formatting - user can type naturally
      const phoneInput = action.payload.slice(0, VALIDATION.MAX_INPUT_LENGTH.phone);
      return { ...state, phone: phoneInput, error: null };

    case 'SET_EMAIL':
      // Allow typing freely - only apply lowercase, no trim during typing
      // Trimming should happen during validation, not during input
      const emailInput = action.payload.toLowerCase().slice(0, VALIDATION.MAX_INPUT_LENGTH.email);
      return { ...state, email: emailInput, error: null };

    case 'SET_OTP':
      // Only allow digits
      const sanitizedOtp = action.payload.replace(/\D/g, '').slice(0, VALIDATION.OTP_LENGTH);
      return { ...state, otp: sanitizedOtp, error: null };

    case 'SET_NEW_PASSWORD':
      return {
        ...state,
        newPassword: action.payload.slice(0, VALIDATION.MAX_INPUT_LENGTH.password),
        error: null,
      };

    case 'SET_CONFIRM_PASSWORD':
      return {
        ...state,
        confirmPassword: action.payload.slice(0, VALIDATION.MAX_INPUT_LENGTH.password),
        error: null,
      };

    case 'TOGGLE_PASSWORD_VISIBILITY':
      return { ...state, showPassword: !state.showPassword };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, successMessage: null };

    case 'SET_SUCCESS_MESSAGE':
      return { ...state, successMessage: action.payload, error: null };

    case 'SET_RESEND_TIMER':
      return { ...state, resendTimer: action.payload };

    case 'DECREMENT_TIMER':
      return { ...state, resendTimer: Math.max(0, state.resendTimer - 1) };

    case 'SET_REDUCE_MOTION':
      return { ...state, reduceMotion: action.payload };

    case 'CLEAR_OTP':
      return { ...state, otp: '', error: null };

    case 'CLEAR_PASSWORDS':
      return { ...state, newPassword: '', confirmPassword: '', showPassword: false };

    case 'RESET_FORM':
      return { ...initialState, reduceMotion: state.reduceMotion };

    case 'GO_BACK':
      if (state.step === 'method') {
        return state; // Navigation handled externally
      } else if (state.step === 'verify') {
        return { ...state, step: 'method', otp: '', error: null };
      } else if (state.step === 'password') {
        return { ...state, step: 'verify', error: null };
      }
      return state;

    default:
      return state;
  }
}

// Hook return type
interface UseForgotPasswordFormReturn {
  state: ForgotPasswordState;
  dispatch: React.Dispatch<ForgotPasswordAction>;
  // Validation functions
  validatePhone: () => ValidationResult;
  validateEmail: () => ValidationResult;
  validateOTP: () => ValidationResult;
  validatePassword: () => ValidationResult;
  getPasswordRequirements: () => PasswordRequirements;
  // Utility functions
  getNormalizedPhone: () => string;
  getMaskedContact: () => string;
  canSubmit: () => boolean;
  // Derived state
  isPhoneMethod: boolean;
  currentStepNumber: number;
}

export function useForgotPasswordForm(): UseForgotPasswordFormReturn {
  const [state, dispatch] = useReducer(forgotPasswordReducer, initialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const timerPausedAtRef = useRef<number | null>(null);

  // Check for reduced motion preference
  useEffect(() => {
    const checkReduceMotion = async () => {
      try {
        const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        dispatch({ type: 'SET_REDUCE_MOTION', payload: isEnabled });
      } catch {
        // Ignore errors, default to false
      }
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => dispatch({ type: 'SET_REDUCE_MOTION', payload: isEnabled })
    );

    return () => subscription.remove();
  }, []);

  // Handle app state changes for timer accuracy
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background - pause timer
        if (state.resendTimer > 0) {
          timerPausedAtRef.current = Date.now();
        }
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground - adjust timer
        if (timerPausedAtRef.current && state.resendTimer > 0) {
          const elapsedSeconds = Math.floor((Date.now() - timerPausedAtRef.current) / 1000);
          const newTimer = Math.max(0, state.resendTimer - elapsedSeconds);
          dispatch({ type: 'SET_RESEND_TIMER', payload: newTimer });
          timerPausedAtRef.current = null;
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [state.resendTimer]);

  // Timer countdown
  useEffect(() => {
    if (state.resendTimer > 0) {
      timerRef.current = setTimeout(() => {
        dispatch({ type: 'DECREMENT_TIMER' });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
    return undefined;
  }, [state.resendTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Get normalized phone number (removes leading 0 and non-digits)
  const getNormalizedPhone = useCallback((): string => {
    const digits = state.phone.replace(/\D/g, '');
    return digits.startsWith('0') ? digits.substring(1) : digits;
  }, [state.phone]);

  // Validate phone number
  const validatePhone = useCallback((): ValidationResult => {
    const normalized = getNormalizedPhone();

    if (!normalized) {
      return { isValid: false, error: ERROR_MESSAGES.phone.empty };
    }

    if (normalized.length !== VALIDATION.PHONE_MIN_DIGITS) {
      return { isValid: false, error: ERROR_MESSAGES.phone.invalid_length };
    }

    if (!normalized.startsWith(VALIDATION.PH_MOBILE_PREFIX)) {
      return { isValid: false, error: ERROR_MESSAGES.phone.invalid_prefix };
    }

    return { isValid: true, error: null };
  }, [getNormalizedPhone]);

  // Validate email
  const validateEmail = useCallback((): ValidationResult => {
    const trimmedEmail = state.email.trim();

    if (!trimmedEmail) {
      return { isValid: false, error: ERROR_MESSAGES.email.empty };
    }

    if (!VALIDATION.EMAIL_REGEX.test(trimmedEmail)) {
      return { isValid: false, error: ERROR_MESSAGES.email.invalid };
    }

    return { isValid: true, error: null };
  }, [state.email]);

  // Validate OTP
  const validateOTP = useCallback((): ValidationResult => {
    if (!state.otp) {
      return { isValid: false, error: ERROR_MESSAGES.otp.empty };
    }

    if (state.otp.length !== VALIDATION.OTP_LENGTH) {
      return { isValid: false, error: ERROR_MESSAGES.otp.invalid_length };
    }

    return { isValid: true, error: null };
  }, [state.otp]);

  // Get password requirements status
  const getPasswordRequirements = useCallback((): PasswordRequirements => {
    const password = state.newPassword;
    const hasMinLength = password.length >= VALIDATION.PASSWORD_MIN_LENGTH;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const isValid = hasMinLength && hasUppercase && hasNumber && password.trim().length > 0;

    return { hasMinLength, hasUppercase, hasNumber, isValid };
  }, [state.newPassword]);

  // Validate password
  const validatePassword = useCallback((): ValidationResult => {
    const { newPassword, confirmPassword } = state;

    // Check for whitespace-only password
    if (newPassword.trim().length === 0) {
      return { isValid: false, error: ERROR_MESSAGES.password.whitespace_only };
    }

    const requirements = getPasswordRequirements();

    if (!requirements.hasMinLength) {
      return { isValid: false, error: ERROR_MESSAGES.password.too_short };
    }

    if (!requirements.hasUppercase) {
      return { isValid: false, error: ERROR_MESSAGES.password.no_uppercase };
    }

    if (!requirements.hasNumber) {
      return { isValid: false, error: ERROR_MESSAGES.password.no_number };
    }

    if (newPassword !== confirmPassword) {
      return { isValid: false, error: ERROR_MESSAGES.password.mismatch };
    }

    return { isValid: true, error: null };
  }, [state.newPassword, state.confirmPassword, getPasswordRequirements]);

  // Get masked contact for display
  const getMaskedContact = useCallback((): string => {
    if (state.method === 'phone') {
      const normalized = getNormalizedPhone();
      if (normalized.length >= 7) {
        return `${VALIDATION.PH_COUNTRY_CODE} ${normalized.substring(0, 3)}-XXX-${normalized.substring(7)}`;
      }
      return `${VALIDATION.PH_COUNTRY_CODE} ${normalized}`;
    } else {
      const parts = state.email.split('@');
      if (parts.length === 2 && parts[0].length > 2) {
        return `${parts[0].substring(0, 2)}***@${parts[1]}`;
      }
      return state.email;
    }
  }, [state.method, state.email, getNormalizedPhone]);

  // Check if current step can be submitted
  const canSubmit = useCallback((): boolean => {
    if (state.loading) return false;

    switch (state.step) {
      case 'method':
        if (state.method === 'phone') {
          return validatePhone().isValid;
        }
        return validateEmail().isValid;

      case 'verify':
        return validateOTP().isValid;

      case 'password':
        return validatePassword().isValid;

      default:
        return false;
    }
  }, [state.loading, state.step, state.method, validatePhone, validateEmail, validateOTP, validatePassword]);

  // Derived state
  const isPhoneMethod = state.method === 'phone';
  const currentStepNumber = ['method', 'verify', 'password', 'success'].indexOf(state.step) + 1;

  return {
    state,
    dispatch,
    validatePhone,
    validateEmail,
    validateOTP,
    validatePassword,
    getPasswordRequirements,
    getNormalizedPhone,
    getMaskedContact,
    canSubmit,
    isPhoneMethod,
    currentStepNumber,
  };
}
