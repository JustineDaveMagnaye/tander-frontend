/**
 * SignUp Screen Types
 * Following ForgotPassword pattern for consistency
 */

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@navigation/types';
import { SignUpStep, RegistrationMethod } from './constants';

// Navigation prop type
export type SignUpNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'SignUp'
>;

// Main screen props
export interface SignUpScreenProps {
  navigation: SignUpNavigationProp;
}

// Form state
export interface SignUpFormState {
  step: SignUpStep;
  method: RegistrationMethod;
  username: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
}

// UI state
export interface SignUpUIState {
  loading: boolean;
  error: string | null;
  reduceMotion: boolean;
  successMessage: string | null;
}

// Combined state
export interface SignUpState extends SignUpFormState, SignUpUIState {}

// Action types for reducer
export type SignUpAction =
  | { type: 'SET_STEP'; payload: SignUpStep }
  | { type: 'SET_METHOD'; payload: RegistrationMethod }
  | { type: 'SET_USERNAME'; payload: string }
  | { type: 'SET_PHONE'; payload: string }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_PASSWORD'; payload: string }
  | { type: 'SET_CONFIRM_PASSWORD'; payload: string }
  | { type: 'TOGGLE_PASSWORD_VISIBILITY' }
  | { type: 'TOGGLE_CONFIRM_PASSWORD_VISIBILITY' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUCCESS_MESSAGE'; payload: string | null }
  | { type: 'SET_REDUCE_MOTION'; payload: boolean }
  | { type: 'CLEAR_PASSWORDS' }
  | { type: 'RESET_FORM' };

// Responsive sizes
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
}

// Account step component props
export interface AccountStepProps {
  state: SignUpState;
  dispatch: React.Dispatch<SignUpAction>;
  sizes: ResponsiveSizes;
  isLandscape: boolean;
  isTablet: boolean;
  onContinue: () => Promise<void>;
  onBackToLogin: () => void;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}
