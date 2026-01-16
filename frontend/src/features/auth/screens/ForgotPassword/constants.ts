/**
 * ForgotPassword Screen Constants
 * Centralized constants for validation, timing, and configuration
 *
 * Responsive Testing Fixes Applied:
 * - G2-R-007: Added font scaling limits for accessibility
 */

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
  method: 'Choose reset method',
  verify: 'Verify your identity',
  password: 'Create new password',
  success: 'Password reset complete',
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
