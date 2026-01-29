/**
 * ForgotPassword Screen Constants
 * Centralized constants for validation, timing, and configuration
 *
 * Updated with iOS Premium Design System - Orange + Teal Theme
 */

// ============================================================================
// iOS PREMIUM DESIGN SYSTEM
// ============================================================================
export const iOS = {
  colors: {
    background: '#F2F2F7',
    secondaryBackground: '#FFFFFF',
    tertiaryBackground: '#F2F2F7',
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#8E8E93',
    quaternaryLabel: '#C7C7CC',
    // Primary: Orange for actions
    orange: '#F97316',
    orangeDark: '#EA580C',
    orangeLight: 'rgba(249, 115, 22, 0.1)',
    // Secondary: Teal for completed/secondary actions
    teal: '#30D5C8',
    tealDark: '#20B2AA',
    tealLight: 'rgba(48, 213, 200, 0.1)',
    separator: 'rgba(60, 60, 67, 0.12)',
    opaqueSeparator: '#C6C6C8',
    systemFill: 'rgba(120, 120, 128, 0.2)',
    secondaryFill: 'rgba(120, 120, 128, 0.16)',
    tertiaryFill: 'rgba(120, 120, 128, 0.12)',
    success: '#34C759',
    green: '#34C759',
    error: '#FF3B30',
    red: '#FF3B30',
    warning: '#FF9500',
    white: '#FFFFFF',
    black: '#000000',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 20, xl: 24, xxl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 100 },
  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
    subhead: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
    caption1: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
    caption2: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },
  },
  shadow: {
    small: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
    large: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  },
} as const;

// Font scaling limits for accessibility (G2-R-007)
// Limits maximum font scaling to prevent layout breaking while still supporting accessibility
export const FONT_SCALING = {
  // Maximum multiplier for system font scaling
  MAX_FONT_MULTIPLIER: 1.5,
  // Title elements can scale less to prevent overflow
  TITLE_MAX_MULTIPLIER: 1.3,
  // Input elements need more controlled scaling
  INPUT_MAX_MULTIPLIER: 1.4,
  // Caption elements can scale more
  CAPTION_MAX_MULTIPLIER: 1.6,
} as const;

// Validation constants
export const VALIDATION = {
  // Improved email regex that handles more edge cases
  EMAIL_REGEX: /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/,
  PHONE_MIN_DIGITS: 10,
  PHONE_MAX_DIGITS: 10,
  PH_MOBILE_PREFIX: '9',
  PH_COUNTRY_CODE: '+63',
  OTP_LENGTH: 6,
  PASSWORD_MIN_LENGTH: 8,
  MAX_INPUT_LENGTH: {
    phone: 15,
    email: 254,
    password: 128,
  },
} as const;

// Timing constants (in milliseconds)
export const TIMING = {
  SEND_OTP_DELAY: 1500,
  VERIFY_OTP_DELAY: 1000,
  RESEND_OTP_DELAY: 500,
  RESET_PASSWORD_DELAY: 1500,
  RESEND_TIMER_SECONDS: 60,
  API_TIMEOUT: 30000,
  DEBOUNCE_MS: 300,
  ANIMATION_DURATION: {
    fast: 200,
    normal: 400,
    slow: 500,
  },
} as const;

// Step definitions
export type ResetStep = 'method' | 'verify' | 'password' | 'success';

export const STEPS: ResetStep[] = ['method', 'verify', 'password', 'success'];

export const STEP_LABELS: Record<ResetStep, string> = {
  method: 'Method',
  verify: 'Verify',
  password: 'Reset',
  success: 'Done',
};

// Reset method types
export type ResetMethod = 'phone' | 'email';

// Error messages
export const ERROR_MESSAGES = {
  phone: {
    empty: 'Please enter your mobile number',
    invalid_length: 'Please enter all 10 digits (like 912 345 6789)',
    invalid_prefix: 'Philippine mobile numbers start with 9',
    invalid_format: 'Please enter a valid Philippine mobile number',
  },
  email: {
    empty: 'Please enter your email address',
    invalid: 'Please enter a valid email (like juan@example.com)',
  },
  otp: {
    empty: 'Please enter the verification code',
    invalid_length: 'Please enter all 6 digits',
    invalid: 'Invalid code. Please try again.',
    expired: 'Code expired. Please request a new one.',
  },
  password: {
    too_short: 'Password must be at least 8 characters',
    no_uppercase: 'Password must contain at least one uppercase letter',
    no_number: 'Password must contain at least one number',
    mismatch: 'Passwords do not match',
    whitespace_only: 'Password cannot be only spaces',
  },
  network: {
    offline: 'No internet connection. Please check your network.',
    timeout: 'Request timed out. Please try again.',
    server_error: 'Something went wrong. Please try again later.',
    send_failed: 'Unable to send code. Please try again.',
    verify_failed: 'Unable to verify code. Please try again.',
    reset_failed: 'Unable to reset password. Please try again.',
    resend_failed: 'Unable to resend code. Please try again.',
  },
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  otp_sent: 'Verification code sent!',
  otp_resent: 'New code sent!',
  password_reset: 'Your password has been successfully reset.',
} as const;

// Accessibility labels
export const A11Y_LABELS = {
  steps: {
    indicator: (current: number, total: number) => `Step ${current} of ${total}`,
    description: (step: ResetStep) => STEP_LABELS[step],
  },
  inputs: {
    phone: 'Phone number input',
    phone_hint: 'Enter your 10-digit Philippine mobile number starting with 9',
    email: 'Email address input',
    email_hint: 'Enter your registered email address',
    otp: 'Verification code input',
    otp_hint: 'Enter the 6-digit code sent to your phone or email',
    new_password: 'New password input',
    new_password_hint: 'Create a password with at least 8 characters, one uppercase letter, and one number',
    confirm_password: 'Confirm password input',
    confirm_password_hint: 'Re-enter your new password to confirm',
  },
  buttons: {
    back: 'Go back',
    send_code: 'Send verification code',
    verify: 'Verify code',
    resend: 'Resend verification code',
    reset_password: 'Reset password',
    sign_in: 'Sign in with new password',
    toggle_password: (visible: boolean) => visible ? 'Hide password' : 'Show password',
  },
  tabs: {
    phone: 'Phone number - Recommended',
    email: 'Email address',
  },
  timer: {
    resend_available: 'Resend code',
    resend_wait: (seconds: number) => `Resend available in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`,
  },
} as const;
