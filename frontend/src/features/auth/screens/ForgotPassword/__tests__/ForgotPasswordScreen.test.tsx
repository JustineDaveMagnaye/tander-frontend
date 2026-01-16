/**
 * ForgotPasswordScreen Test Suite
 * Comprehensive tests for the forgot password flow
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

// Note: NetInfo is no longer used directly - network checks are handled internally
// The mock is no longer needed since useForgotPasswordApi.ts handles connectivity checks

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));


jest.mock('@shared/hooks/useResponsive', () => ({
  useResponsive: () => ({
    isTablet: false,
    isLandscape: false,
    width: 390,
    height: 844,
    wp: (n: number) => n * 3.9,
    hp: (n: number) => n * 8.4,
    moderateScale: (n: number) => n,
  }),
}));

jest.mock('@shared/components', () => ({
  Text: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
  OTPInput: ({ value, onChange, autoFocus, disabled }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        testID="otp-input"
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        autoFocus={autoFocus}
        accessibilityState={{ disabled }}
      />
    );
  },
}));

// Import component after mocks
import { ForgotPasswordScreen } from '../index';
import { VALIDATION, ERROR_MESSAGES } from '../constants';

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider>
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </SafeAreaProvider>
);

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
};

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders method selection step by default', () => {
      const { getByText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      expect(getByText('Forgot Password?')).toBeTruthy();
      expect(getByText(/Phone/)).toBeTruthy();
      expect(getByText(/Email/)).toBeTruthy();
    });

    it('shows phone input by default', () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      expect(getByText('Mobile Number')).toBeTruthy();
      expect(getByPlaceholderText('912 345 6789')).toBeTruthy();
    });

    it('shows recommended badge for phone method', () => {
      const { getByText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      expect(getByText(/Recommended/)).toBeTruthy();
    });

    it('shows step indicator with correct step', () => {
      const { getByText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      expect(getByText('Step 1 of 4')).toBeTruthy();
    });
  });

  describe('Method Selection', () => {
    it('switches to email input when email tab is selected', () => {
      const { getByText, getByPlaceholderText, queryByText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.press(getByText(/Email/));

      expect(getByText('Email Address')).toBeTruthy();
      expect(getByPlaceholderText('juan@example.com')).toBeTruthy();
      expect(queryByText(/Recommended/)).toBeNull();
    });

    it('clears input when switching methods', () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      // Enter phone number
      const phoneInput = getByPlaceholderText('912 345 6789');
      fireEvent.changeText(phoneInput, '9123456789');

      // Switch to email
      fireEvent.press(getByText(/Email/));

      // Switch back to phone
      fireEvent.press(getByText(/Phone/));

      // Phone input should be empty
      const newPhoneInput = getByPlaceholderText('912 345 6789');
      expect(newPhoneInput.props.value).toBe('');
    });
  });

  describe('Phone Validation', () => {
    it('shows error for empty phone number', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.press(getByText('Send Code'));

      await waitFor(() => {
        expect(getByText(ERROR_MESSAGES.phone.empty)).toBeTruthy();
      });
    });

    it('shows error for invalid phone length', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.changeText(getByPlaceholderText('912 345 6789'), '91234');
      fireEvent.press(getByText('Send Code'));

      await waitFor(() => {
        expect(getByText(ERROR_MESSAGES.phone.invalid_length)).toBeTruthy();
      });
    });

    it('shows error for phone not starting with 9', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.changeText(getByPlaceholderText('912 345 6789'), '1234567890');
      fireEvent.press(getByText('Send Code'));

      await waitFor(() => {
        expect(getByText(ERROR_MESSAGES.phone.invalid_prefix)).toBeTruthy();
      });
    });

    it('accepts valid phone number with leading 0', async () => {
      const { getByText, getByPlaceholderText, queryByText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.changeText(getByPlaceholderText('912 345 6789'), '09123456789');
      fireEvent.press(getByText('Send Code'));

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should not show phone validation error
      expect(queryByText(ERROR_MESSAGES.phone.invalid_length)).toBeNull();
      expect(queryByText(ERROR_MESSAGES.phone.invalid_prefix)).toBeNull();
    });
  });

  describe('Email Validation', () => {
    it('shows error for empty email', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.press(getByText(/Email/));
      fireEvent.press(getByText('Send Code'));

      await waitFor(() => {
        expect(getByText(ERROR_MESSAGES.email.empty)).toBeTruthy();
      });
    });

    it('shows error for invalid email format', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.press(getByText(/Email/));
      fireEvent.changeText(getByPlaceholderText('juan@example.com'), 'invalid-email');
      fireEvent.press(getByText('Send Code'));

      await waitFor(() => {
        expect(getByText(ERROR_MESSAGES.email.invalid)).toBeTruthy();
      });
    });

    it('accepts valid email', async () => {
      const { getByText, getByPlaceholderText, queryByText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.press(getByText(/Email/));
      fireEvent.changeText(getByPlaceholderText('juan@example.com'), 'test@example.com');
      fireEvent.press(getByText('Send Code'));

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(queryByText(ERROR_MESSAGES.email.invalid)).toBeNull();
    });
  });

  describe('OTP Verification Step', () => {
    const setupVerifyStep = async () => {
      const utils = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      // Enter valid phone and submit
      fireEvent.changeText(utils.getByPlaceholderText('912 345 6789'), '9123456789');
      fireEvent.press(utils.getByText('Send Code'));

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      return utils;
    };

    it('shows verify step after sending OTP', async () => {
      const { getByText } = await setupVerifyStep();

      expect(getByText('Enter Code')).toBeTruthy();
      expect(getByText('Step 2 of 4')).toBeTruthy();
    });

    it('shows masked contact info', async () => {
      const { getByText } = await setupVerifyStep();

      expect(getByText(/\+63 912-XXX-/)).toBeTruthy();
    });

    it('shows resend timer', async () => {
      const { getByText } = await setupVerifyStep();

      expect(getByText(/Resend in 60/)).toBeTruthy();
    });

    it('decrements resend timer', async () => {
      const { getByText } = await setupVerifyStep();

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(getByText(/Resend in 55/)).toBeTruthy();
    });

    it('enables resend button after timer expires', async () => {
      const { getByText } = await setupVerifyStep();

      await act(async () => {
        jest.advanceTimersByTime(61000);
      });

      expect(getByText('🔄 Resend Code')).toBeTruthy();
    });
  });

  describe('Password Step', () => {
    const setupPasswordStep = async () => {
      const utils = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      // Navigate to password step
      fireEvent.changeText(utils.getByPlaceholderText('912 345 6789'), '9123456789');
      fireEvent.press(utils.getByText('Send Code'));

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Enter OTP
      const otpInput = utils.getByTestId('otp-input');
      fireEvent.changeText(otpInput, '123456');

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      return utils;
    };

    it('shows password requirements', async () => {
      const { getByText } = await setupPasswordStep();

      expect(getByText('Your password must have:')).toBeTruthy();
      expect(getByText(/At least 8 characters/)).toBeTruthy();
      expect(getByText(/One uppercase letter/)).toBeTruthy();
      expect(getByText(/One number/)).toBeTruthy();
    });

    it('updates requirements as user types', async () => {
      const { getByPlaceholderText, getByText } = await setupPasswordStep();

      const passwordInput = getByPlaceholderText('Enter new password');

      // Type password meeting all requirements
      fireEvent.changeText(passwordInput, 'Password1');

      expect(getByText(/✓ At least 8 characters/)).toBeTruthy();
      expect(getByText(/✓ One uppercase letter/)).toBeTruthy();
      expect(getByText(/✓ One number/)).toBeTruthy();
    });

    it('shows error for password mismatch', async () => {
      const { getByPlaceholderText, getByText } = await setupPasswordStep();

      fireEvent.changeText(getByPlaceholderText('Enter new password'), 'Password1');
      fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'Password2');
      fireEvent.press(getByText('Reset Password'));

      await waitFor(() => {
        expect(getByText(ERROR_MESSAGES.password.mismatch)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back on back button press from method step', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.press(getByLabelText('Go back'));

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('navigates to login on "Sign In" press', () => {
      const { getByText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.press(getByText('Sign In'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('Accessibility', () => {
    it('has accessible back button', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('has accessible send code button', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      expect(getByLabelText('Send verification code')).toBeTruthy();
    });

    it('has accessible step indicator', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      expect(getByLabelText(/Step 1 of 4/)).toBeTruthy();
    });
  });

  describe('Input Sanitization', () => {
    it('strips non-digit characters from phone input', () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      const input = getByPlaceholderText('912 345 6789');
      fireEvent.changeText(input, '+63-912-345-6789');

      // Should only keep digits and spaces
      expect(input.props.value).toMatch(/^[\d\s]+$/);
    });

    it('converts email to lowercase', () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      fireEvent.press(getByText(/Email/));
      const input = getByPlaceholderText('juan@example.com');
      fireEvent.changeText(input, 'TEST@EXAMPLE.COM');

      expect(input.props.value).toBe('test@example.com');
    });

    it('limits input length', () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ForgotPasswordScreen navigation={mockNavigation as any} />
        </TestWrapper>
      );

      const input = getByPlaceholderText('912 345 6789');
      const longInput = '9'.repeat(50);
      fireEvent.changeText(input, longInput);

      expect(input.props.value.length).toBeLessThanOrEqual(VALIDATION.MAX_INPUT_LENGTH.phone);
    });
  });
});

describe('Validation Functions', () => {
  describe('Email Regex', () => {
    const { EMAIL_REGEX } = VALIDATION;

    it('accepts valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.com',
        'user123@test.co.uk',
        'a@b.cc',
      ];

      validEmails.forEach(email => {
        expect(EMAIL_REGEX.test(email)).toBe(true);
      });
    });

    it('rejects invalid emails', () => {
      const invalidEmails = [
        'invalid',
        '@domain.com',
        'user@',
        'user@.com',
        'user@domain.',
        '',
      ];

      invalidEmails.forEach(email => {
        expect(EMAIL_REGEX.test(email)).toBe(false);
      });
    });
  });
});
