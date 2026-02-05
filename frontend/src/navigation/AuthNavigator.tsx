/**
 * TANDER Auth Navigator
 * Handles authentication flow: Welcome, Login, SignUp, Verification, Onboarding
 * Dynamically routes users to their current registration step
 */

import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import {
  WelcomeScreen,
  LoginScreen,
  IDScannerScreen,
  SignUpScreen,
  ForgotPasswordScreen,
  OTPVerificationScreen,
  ProfileSetupScreen,
  IDVerificationScreen,
} from '@features/auth/screens';
import { colors } from '@shared/styles/colors';
import { useAuthStore, selectRegistrationPhase } from '../store/authStore';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Determines the initial route based on registration phase
 * This enables progress resumption when users return to incomplete registration
 */
const getInitialRoute = (registrationPhase: string): keyof AuthStackParamList => {
  switch (registrationPhase) {
    case 'email_verified':
    case 'otp_verified':
      // Email/OTP verified, need to complete profile
      return 'ProfileSetup';
    case 'profile_completed':
      // Profile done, need ID verification
      return 'IDVerification';
    case 'verified':
      // Fully verified - go to login
      return 'Login';
    case 'email_pending':
    case 'otp_pending':
      // Waiting for verification, go to OTP screen
      return 'OTPVerification';
    case 'registered':
      // Legacy: registered but not verified
      return 'OTPVerification';
    case 'id_pending':
      // ID verification in progress
      return 'IDVerification';
    default:
      // No registration in progress, show welcome
      return 'Welcome';
  }
};

export const AuthNavigator: React.FC = () => {
  const registrationPhase = useAuthStore(selectRegistrationPhase);

  // Memoize initial route to prevent unnecessary recalculations
  const initialRouteName = useMemo(
    () => getInitialRoute(registrationPhase),
    [registrationPhase]
  );

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.neutral.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="IDScanner"
        component={IDScannerScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="IDVerification"
        component={IDVerificationScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
