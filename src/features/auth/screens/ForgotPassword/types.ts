/**
 * ForgotPassword Screen Types
 */

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@navigation/types';
import { ResetStep, ResetMethod } from './constants';

// Navigation prop type
export type ForgotPasswordNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPassword'
>;

// Main screen props
export interface ForgotPasswordScreenProps {
  navigation: ForgotPasswordNavigationProp;
}

// Form state
export interface ForgotPasswordFormState {
  step: ResetStep;
  method: ResetMethod;
  phone: string;
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
  showPassword: boolean;
}

// UI state
export interface ForgotPasswordUIState {
  loading: boolean;
  error: string | null;
  resendTimer: number;
  reduceMotion: boolean;
  successMessage: string | null;
}

// Combined state
export interface ForgotPasswordState extends ForgotPasswordFormState, ForgotPasswordUIState {}

// Action types for reducer
export type ForgotPasswordAction =
  | { type: 'SET_STEP'; payload: ResetStep }
  | { type: 'SET_METHOD'; payload: ResetMethod }
  | { type: 'SET_PHONE'; payload: string }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_OTP'; payload: string }
  | { type: 'SET_NEW_PASSWORD'; payload: string }
  | { type: 'SET_CONFIRM_PASSWORD'; payload: string }
  | { type: 'TOGGLE_PASSWORD_VISIBILITY' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUCCESS_MESSAGE'; payload: string | null }
  | { type: 'SET_RESEND_TIMER'; payload: number }
  | { type: 'DECREMENT_TIMER' }
  | { type: 'SET_REDUCE_MOTION'; payload: boolean }
  | { type: 'CLEAR_OTP' }
  | { type: 'CLEAR_PASSWORDS' }
  | { type: 'RESET_FORM' }
  | { type: 'GO_BACK' };

// Responsive sizes - Enhanced for full device coverage
export interface ResponsiveSizes {
  titleSize: number;
  subtitleSize: number;
  inputHeight: number;
  buttonHeight: number;
  inputFontSize: number;
  labelFontSize: number;
  captionFontSize: number;
  linkFontSize: number;
  bodyFontSize: number;
  tabSelectorHeight: number;
  maxFormWidth: number;
  otpBoxSize: number;    // OTP input box size
  otpFontSize: number;   // OTP digit font size
}

// Step component props
export interface StepProps {
  state: ForgotPasswordState;
  dispatch: React.Dispatch<ForgotPasswordAction>;
  sizes: ResponsiveSizes;
  isLandscape: boolean;
  isTablet: boolean;
  onSendOTP: () => Promise<void>;
  onVerifyOTP: () => Promise<void>;
  onResendOTP: () => Promise<void>;
  onResetPassword: () => Promise<void>;
  onBackToLogin: () => void;
}

// Password requirements check result
export interface PasswordRequirements {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  isValid: boolean;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}
