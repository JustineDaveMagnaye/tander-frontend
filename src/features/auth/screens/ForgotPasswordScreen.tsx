/**
 * ForgotPasswordScreen
 *
 * This file re-exports the refactored ForgotPasswordScreen from the modular structure.
 * The original 1500+ line component has been split into:
 *
 * ForgotPassword/
 * ├── index.tsx           - Main screen component with error boundary
 * ├── constants.ts        - Validation rules, timing, error messages
 * ├── types.ts            - TypeScript interfaces
 * ├── styles.ts           - StyleSheet definitions
 * ├── utils.ts            - Utility functions (haptics, formatting)
 * ├── hooks/
 * │   ├── useForgotPasswordForm.ts   - Form state with useReducer
 * │   ├── useForgotPasswordApi.ts    - API calls with proper cleanup
 * │   └── useResponsiveSizes.ts      - Memoized responsive calculations
 * ├── components/
 * │   ├── StepIndicator.tsx      - Progress dots
 * │   ├── MethodSelector.tsx     - Phone/Email tabs
 * │   ├── PrimaryButton.tsx      - Animated gradient button
 * │   ├── InputField.tsx         - Accessible text input
 * │   ├── CountryCodePrefix.tsx  - +63 prefix for phone
 * │   ├── PasswordRequirements.tsx - Password validation checklist
 * │   ├── MethodStep.tsx         - Step 1: Select method
 * │   ├── VerifyStep.tsx         - Step 2: Enter OTP
 * │   ├── PasswordStep.tsx       - Step 3: New password
 * │   └── SuccessStep.tsx        - Step 4: Success
 * └── __tests__/
 *     └── ForgotPasswordScreen.test.tsx - Comprehensive test suite
 *
 * Improvements made:
 * - Split 1500+ lines into modular components (~100-200 lines each)
 * - useReducer for form state management (was 12+ useState hooks)
 * - Memoized responsive calculations
 * - Proper API cleanup with AbortController
 * - Error boundary for graceful error handling
 * - Safe haptic feedback (won't crash on simulators)
 * - Improved input sanitization
 * - Better accessibility (ARIA labels, screen reader announcements)
 * - App state handling for timer accuracy
 * - Network connectivity checks
 * - Comprehensive test coverage
 */

export { ForgotPasswordScreen, default } from './ForgotPassword';
