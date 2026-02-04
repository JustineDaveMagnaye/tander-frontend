/**
 * SignUpScreen Test Suite
 * Comprehensive tests for the TANDER SignUp Screen
 *
 * Coverage includes:
 * - State management
 * - Input validation (phone/email)
 * - Navigation flows
 * - Accessibility
 * - Error handling
 * - UI interactions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { SignUpScreen } from '../SignUpScreen';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Error: 'error', Success: 'success' },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, style }: { children: React.ReactNode; style?: object }) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@shared/hooks/useResponsive', () => ({
  useResponsive: () => ({
    isTablet: false,
    isLandscape: false,
    wp: (p: number) => p * 4,
    hp: (p: number) => p * 8,
    moderateScale: (s: number) => s,
  }),
}));

// Mock AccessibilityInfo methods
jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
} as any;

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('Rendering', () => {
    it('should render correctly', () => {
      const { getByText, getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      expect(getByText('Create Account')).toBeTruthy();
      expect(getByTestId('signup-step-indicator')).toBeTruthy();
      expect(getByTestId('signup-type-selector')).toBeTruthy();
      expect(getByTestId('signup-input')).toBeTruthy();
      expect(getByTestId('signup-continue-button')).toBeTruthy();
    });

    it('should render step indicator with correct text', () => {
      const { getByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      expect(getByText('Step 1 of 3: Verify Your Identity')).toBeTruthy();
    });

    it('should render phone tab selected by default', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const phoneTab = getByTestId('signup-tab-phone');
      expect(phoneTab.props.accessibilityState.selected).toBe(true);
    });

    it('should render back button', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      expect(getByTestId('signup-back-button')).toBeTruthy();
    });

    it('should render login link', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      expect(getByTestId('signup-login-link')).toBeTruthy();
    });
  });

  // ============================================
  // STATE MANAGEMENT TESTS
  // ============================================
  describe('State Management', () => {
    it('should toggle between phone and email tabs', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const emailTab = getByTestId('signup-tab-email');
      fireEvent.press(emailTab);

      expect(emailTab.props.accessibilityState.selected).toBe(true);
    });

    it('should clear input when switching tabs', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      fireEvent.changeText(input, '9123456789');

      const emailTab = getByTestId('signup-tab-email');
      fireEvent.press(emailTab);

      expect(input.props.value).toBe('');
    });

    it('should update input value on text change', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      fireEvent.changeText(input, '9123456789');

      expect(input.props.value).toBe('9123456789');
    });
  });

  // ============================================
  // PHONE VALIDATION TESTS
  // ============================================
  describe('Phone Validation', () => {
    it('should show error for empty phone number', async () => {
      const { getByTestId, getByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(getByText('Please enter your phone number')).toBeTruthy();
      });
    });

    it('should show error for phone with less than 10 digits', async () => {
      const { getByTestId, getByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      fireEvent.changeText(input, '912345');

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(getByText(/Please enter all 10 digits/)).toBeTruthy();
      });
    });

    it('should show error for phone not starting with 9', async () => {
      const { getByTestId, getByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      fireEvent.changeText(input, '1234567890');

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(getByText(/Philippine mobile numbers start with 9/)).toBeTruthy();
      });
    });

    it('should handle leading zero in phone number', async () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      // With leading zero, should strip it and validate as valid
      fireEvent.changeText(input, '09123456789');

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      // Wait for the 1s API delay + navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Verification', expect.any(Object));
      }, { timeout: 3000 });
    });

    it('should accept valid Philippine phone number', async () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      fireEvent.changeText(input, '9123456789');

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      // Wait for the 1s API delay + navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Verification', {
          phoneOrEmail: '9123456789',
        });
      }, { timeout: 3000 });
    });
  });

  // ============================================
  // EMAIL VALIDATION TESTS
  // ============================================
  describe('Email Validation', () => {
    it('should show error for empty email', async () => {
      const { getByTestId, getByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      // Switch to email tab
      fireEvent.press(getByTestId('signup-tab-email'));

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(getByText('Please enter your email address')).toBeTruthy();
      });
    });

    it('should show error for invalid email format', async () => {
      const { getByTestId, getByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      // Switch to email tab
      fireEvent.press(getByTestId('signup-tab-email'));

      const input = getByTestId('signup-input');
      fireEvent.changeText(input, 'not-an-email');

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(getByText(/email should look like this/)).toBeTruthy();
      });
    });

    it('should reject email without proper domain', async () => {
      const { getByTestId, getByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('signup-tab-email'));
      const input = getByTestId('signup-input');
      fireEvent.changeText(input, 'test@test');

      fireEvent.press(getByTestId('signup-continue-button'));

      await waitFor(() => {
        expect(getByText(/email should look like this/)).toBeTruthy();
      });
    });

    it('should accept valid email', async () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      // Switch to email tab
      fireEvent.press(getByTestId('signup-tab-email'));

      const input = getByTestId('signup-input');
      fireEvent.changeText(input, 'test@example.com');

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      // Wait for the 1s API delay + navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Verification', {
          phoneOrEmail: 'test@example.com',
        });
      }, { timeout: 3000 });
    });

    it('should accept email with subdomain', async () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('signup-tab-email'));
      const input = getByTestId('signup-input');
      fireEvent.changeText(input, 'user@mail.example.com');

      fireEvent.press(getByTestId('signup-continue-button'));

      // Wait for the 1s API delay + navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Verification', expect.any(Object));
      }, { timeout: 3000 });
    });

    it('should accept email with plus sign', async () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('signup-tab-email'));
      const input = getByTestId('signup-input');
      fireEvent.changeText(input, 'user+tag@example.com');

      fireEvent.press(getByTestId('signup-continue-button'));

      // Wait for the 1s API delay + navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Verification', expect.any(Object));
      }, { timeout: 3000 });
    });
  });

  // ============================================
  // NAVIGATION TESTS
  // ============================================
  describe('Navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const backButton = getByTestId('signup-back-button');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should navigate to Login when Sign In is pressed', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const loginLink = getByTestId('signup-login-link');
      fireEvent.press(loginLink);

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });

    it('should navigate to Verification with valid phone', async () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      fireEvent.changeText(input, '9123456789');

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      // Wait for the 1s API delay + navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Verification', {
          phoneOrEmail: '9123456789',
        });
      }, { timeout: 3000 });
    });
  });

  // ============================================
  // LOADING STATE TESTS
  // ============================================
  describe('Loading State', () => {
    it('should show loading text when submitting', async () => {
      const { getByTestId, getByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      fireEvent.changeText(input, '9123456789');

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      // During loading, button should show "Sending Code..."
      expect(getByText('Sending Code...')).toBeTruthy();
    });

    it('should disable button during loading', async () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      fireEvent.changeText(input, '9123456789');

      const continueButton = getByTestId('signup-continue-button');
      fireEvent.press(continueButton);

      expect(continueButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('Accessibility', () => {
    it('should have accessible step indicator', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const stepIndicator = getByTestId('signup-step-indicator');
      expect(stepIndicator.props.accessibilityRole).toBe('progressbar');
      expect(stepIndicator.props.accessibilityLabel).toBe('Step 1 of 3: Verify Your Identity');
    });

    it('should have accessible tab selector', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const typeSelector = getByTestId('signup-type-selector');
      expect(typeSelector.props.accessibilityRole).toBe('tablist');
    });

    it('should have accessible tabs', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const phoneTab = getByTestId('signup-tab-phone');
      const emailTab = getByTestId('signup-tab-email');

      expect(phoneTab.props.accessibilityRole).toBe('tab');
      expect(emailTab.props.accessibilityRole).toBe('tab');
    });

    it('should have accessible input with hints', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      expect(input.props.accessibilityLabel).toBe('Phone Number input');
      expect(input.props.accessibilityHint).toBe('Enter your Philippine mobile number');
    });

    it('should have accessible continue button with dynamic label', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const continueButton = getByTestId('signup-continue-button');
      expect(continueButton.props.accessibilityRole).toBe('button');
      expect(continueButton.props.accessibilityLabel).toBe('Continue to next step');
    });

    it('should have accessible back button', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const backButton = getByTestId('signup-back-button');
      expect(backButton.props.accessibilityRole).toBe('button');
      expect(backButton.props.accessibilityLabel).toBe('Go back');
    });

    it('should have live region for feedback', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const feedback = getByTestId('signup-feedback');
      expect(feedback.props.accessibilityLiveRegion).toBe('polite');
    });
  });

  // ============================================
  // INPUT CONSTRAINTS TESTS
  // ============================================
  describe('Input Constraints', () => {
    it('should have maxLength for phone input', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      expect(input.props.maxLength).toBe(14); // PHONE_MAX_LENGTH
    });

    it('should have maxLength for email input', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('signup-tab-email'));
      const input = getByTestId('signup-input');
      expect(input.props.maxLength).toBe(50); // EMAIL_MAX_LENGTH
    });

    it('should have correct keyboard type for phone', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const input = getByTestId('signup-input');
      expect(input.props.keyboardType).toBe('phone-pad');
    });

    it('should have correct keyboard type for email', () => {
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('signup-tab-email'));
      const input = getByTestId('signup-input');
      expect(input.props.keyboardType).toBe('email-address');
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('Error Handling', () => {
    it('should clear error when switching tabs', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      // Trigger an error
      fireEvent.press(getByTestId('signup-continue-button'));
      await waitFor(() => {
        expect(getByText('Please enter your phone number')).toBeTruthy();
      });

      // Switch tabs
      fireEvent.press(getByTestId('signup-tab-email'));

      // Error should be cleared
      expect(queryByText('Please enter your phone number')).toBeNull();
    });

    it('should show hint text when no error', () => {
      const { getByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      expect(getByText("We'll send you a verification code")).toBeTruthy();
    });

    it('should replace hint with error when validation fails', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('signup-continue-button'));

      await waitFor(() => {
        expect(getByText('Please enter your phone number')).toBeTruthy();
        expect(queryByText("We'll send you a verification code")).toBeNull();
      });
    });
  });

  // ============================================
  // HAPTIC FEEDBACK TESTS
  // ============================================
  describe('Haptic Feedback', () => {
    it('should trigger haptic on tab switch', () => {
      const Haptics = require('expo-haptics');
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('signup-tab-email'));
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it('should trigger haptic on validation error', async () => {
      const Haptics = require('expo-haptics');
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('signup-continue-button'));

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Error
        );
      });
    });

    it('should trigger haptic on button press', () => {
      const Haptics = require('expo-haptics');
      const { getByTestId } = render(
        <SignUpScreen navigation={mockNavigation} />
      );

      const continueButton = getByTestId('signup-continue-button');
      fireEvent(continueButton, 'pressIn');

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });
  });
});
