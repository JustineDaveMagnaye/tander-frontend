/**
 * useSignUpForm Hook
 * Form state management with reducer pattern
 * Following ForgotPassword pattern for consistency
 */

import { useReducer, useCallback, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { SignUpState, SignUpAction } from '../types';
import { VALIDATION, ERROR_MESSAGES } from '../constants';
import { formatPhoneForDisplay, normalizePhoneNumber, safeHaptic, HapticType } from '../utils';

// Initial state - default to phone since Twilio OTP is now available
const initialState: SignUpState = {
  step: 'account',
  method: 'phone',
  username: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  showPassword: false,
  showConfirmPassword: false,
  loading: false,
  error: null,
  reduceMotion: false,
  successMessage: null,
};

// Reducer function
function signUpReducer(state: SignUpState, action: SignUpAction): SignUpState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload, error: null };
    case 'SET_METHOD':
      return { ...state, method: action.payload, error: null };
    case 'SET_USERNAME':
      return { ...state, username: action.payload.replace(/[^a-zA-Z0-9_]/g, ''), error: null };
    case 'SET_PHONE':
      return { ...state, phone: formatPhoneForDisplay(action.payload), error: null };
    case 'SET_EMAIL':
      return { ...state, email: action.payload, error: null };
    case 'SET_PASSWORD':
      return { ...state, password: action.payload, error: null };
    case 'SET_CONFIRM_PASSWORD':
      return { ...state, confirmPassword: action.payload, error: null };
    case 'TOGGLE_PASSWORD_VISIBILITY':
      return { ...state, showPassword: !state.showPassword };
    case 'TOGGLE_CONFIRM_PASSWORD_VISIBILITY':
      return { ...state, showConfirmPassword: !state.showConfirmPassword };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_SUCCESS_MESSAGE':
      return { ...state, successMessage: action.payload };
    case 'SET_REDUCE_MOTION':
      return { ...state, reduceMotion: action.payload };
    case 'CLEAR_PASSWORDS':
      return { ...state, password: '', confirmPassword: '' };
    case 'RESET_FORM':
      return { ...initialState, reduceMotion: state.reduceMotion };
    default:
      return state;
  }
}

// Validation functions
function validateUsername(username: string): string | null {
  if (!username.trim()) {
    return ERROR_MESSAGES.username.empty;
  }

  if (username.length < VALIDATION.USERNAME_MIN_LENGTH) {
    return ERROR_MESSAGES.username.too_short;
  }

  if (username.length > VALIDATION.USERNAME_MAX_LENGTH) {
    return ERROR_MESSAGES.username.too_long;
  }

  if (!VALIDATION.USERNAME_REGEX.test(username)) {
    return ERROR_MESSAGES.username.invalid;
  }

  return null;
}

function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  if (!digits) {
    return ERROR_MESSAGES.phone.empty;
  }

  if (digits.length !== VALIDATION.PHONE_MAX_DIGITS) {
    return ERROR_MESSAGES.phone.invalid_length;
  }

  if (!digits.startsWith(VALIDATION.PH_MOBILE_PREFIX)) {
    return ERROR_MESSAGES.phone.invalid_prefix;
  }

  return null;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return ERROR_MESSAGES.email.empty;
  }

  if (!VALIDATION.EMAIL_REGEX.test(email.trim())) {
    return ERROR_MESSAGES.email.invalid;
  }

  return null;
}

function validatePassword(password: string): string | null {
  if (!password) {
    return ERROR_MESSAGES.password.empty;
  }

  if (password.trim().length === 0) {
    return ERROR_MESSAGES.password.whitespace_only;
  }

  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return ERROR_MESSAGES.password.too_short;
  }

  return null;
}

function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) {
    return ERROR_MESSAGES.password.mismatch;
  }

  return null;
}

export function useSignUpForm() {
  const [state, dispatch] = useReducer(signUpReducer, initialState);

  // Check for reduced motion preference
  useEffect(() => {
    const checkReduceMotion = async () => {
      const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      dispatch({ type: 'SET_REDUCE_MOTION', payload: isEnabled });
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => dispatch({ type: 'SET_REDUCE_MOTION', payload: isEnabled })
    );

    return () => subscription.remove();
  }, []);

  // Validate form based on current method
  const validateForm = useCallback((): boolean => {
    let error: string | null = null;

    // Validate username first
    error = validateUsername(state.username);
    if (error) {
      safeHaptic(HapticType.Error);
      dispatch({ type: 'SET_ERROR', payload: error });
      return false;
    }

    if (state.method === 'phone') {
      error = validatePhone(state.phone);
      if (error) {
        safeHaptic(HapticType.Error);
        dispatch({ type: 'SET_ERROR', payload: error });
        return false;
      }
    } else {
      error = validateEmail(state.email);
      if (error) {
        safeHaptic(HapticType.Error);
        dispatch({ type: 'SET_ERROR', payload: error });
        return false;
      }
    }

    error = validatePassword(state.password);
    if (error) {
      safeHaptic(HapticType.Error);
      dispatch({ type: 'SET_ERROR', payload: error });
      return false;
    }

    error = validateConfirmPassword(state.password, state.confirmPassword);
    if (error) {
      safeHaptic(HapticType.Error);
      dispatch({ type: 'SET_ERROR', payload: error });
      return false;
    }

    return true;
  }, [state.username, state.method, state.phone, state.email, state.password, state.confirmPassword]);

  // Get normalized contact info for API
  const getContactInfo = useCallback(() => {
    if (state.method === 'phone') {
      const normalizedPhone = normalizePhoneNumber(state.phone);
      return {
        phoneNumber: normalizedPhone,
        username: state.username.trim(),
        email: undefined,
      };
    } else {
      return {
        email: state.email.trim(),
        username: state.username.trim(),
        phoneNumber: undefined,
      };
    }
  }, [state.method, state.phone, state.email, state.username]);

  return {
    state,
    dispatch,
    validateForm,
    getContactInfo,
  };
}
