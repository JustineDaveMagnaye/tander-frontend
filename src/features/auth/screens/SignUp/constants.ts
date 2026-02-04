/**
 * SignUp Screen Constants
 * Centralized constants for validation, timing, and configuration
 * Following design_system2.md patterns
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
  // Emoji/Icons - no scaling to prevent layout breakage
  EMOJI: 1.0,
} as const;

// Validation constants
export const VALIDATION = {
  EMAIL_REGEX: /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/,
  USERNAME_REGEX: /^[a-zA-Z0-9_]{3,20}$/,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  PHONE_MIN_DIGITS: 10,
  PHONE_MAX_DIGITS: 10,
  PH_MOBILE_PREFIX: '9',
  PH_COUNTRY_CODE: '+63',
  PASSWORD_MIN_LENGTH: 8,
  MAX_INPUT_LENGTH: {
    username: 20,
    phone: 15,
    email: 254,
    password: 128,
  },
} as const;

// Timing constants (in milliseconds)
export const TIMING = {
  SIGNUP_DELAY: 1500,
  API_TIMEOUT: 30000,
  DEBOUNCE_MS: 300,
  ANIMATION_DURATION: {
    fast: 200,
    normal: 400,
    slow: 500,
  },
} as const;

// Step definitions for signup flow
export type SignUpStep = 'account' | 'otp' | 'profile' | 'id';

export const STEPS: SignUpStep[] = ['account', 'otp', 'profile', 'id'];

export const STEP_LABELS: Record<SignUpStep, string> = {
  account: 'Create account',
  otp: 'Verify contact',
  profile: 'Build profile',
  id: 'Verify identity',
};

// Registration method types
export type RegistrationMethod = 'phone' | 'email';

// Error messages
export const ERROR_MESSAGES = {
  username: {
    empty: 'Please choose a username',
    too_short: 'Username must be at least 3 characters',
    too_long: 'Username cannot exceed 20 characters',
    invalid: 'Username can only contain letters, numbers, and underscores',
    exists: 'This username is already taken',
  },
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
  password: {
    empty: 'Please enter a password',
    too_short: 'Password must be at least 8 characters',
    mismatch: 'Passwords do not match',
    whitespace_only: 'Password cannot be only spaces',
  },
  network: {
    offline: 'No internet connection. Please check your network.',
    timeout: 'Request timed out. Please try again.',
    server_error: 'Something went wrong. Please try again later.',
    signup_failed: 'Unable to create account. Please try again.',
    phone_exists: 'This phone number is already registered.',
    email_exists: 'This email is already registered.',
    username_exists: 'This username is already taken.',
  },
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  account_created: 'Account created successfully!',
  otp_sent: 'Verification code sent!',
} as const;

// Accessibility labels
export const A11Y_LABELS = {
  steps: {
    indicator: (current: number, total: number) => `Step ${current} of ${total}`,
    description: (step: SignUpStep) => STEP_LABELS[step],
  },
  inputs: {
    username: 'Username input',
    username_hint: 'Choose a unique username (3-20 characters, letters, numbers, and underscores only)',
    phone: 'Phone number input',
    phone_hint: 'Enter your 10-digit Philippine mobile number starting with 9',
    email: 'Email address input',
    email_hint: 'Enter your email address',
    password: 'Password input',
    password_hint: 'Create a password with at least 8 characters',
    confirm_password: 'Confirm password input',
    confirm_password_hint: 'Re-enter your password to confirm',
  },
  buttons: {
    back: 'Go back',
    continue: 'Continue to next step',
    toggle_password: (visible: boolean) => visible ? 'Hide password' : 'Show password',
  },
  tabs: {
    phone: 'Phone number - Recommended',
    email: 'Email address',
  },
} as const;
