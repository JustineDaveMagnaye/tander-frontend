/**
 * TANDER Navigation Types
 * Type-safe navigation parameters
 */

import { NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: { registrationComplete?: boolean } | undefined;
  IDScanner: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Verification: { phoneOrEmail: string };
  Onboarding: undefined;
  OTPVerification: {
    username: string;
    /** Phone number for SMS OTP verification (required for phone method) */
    phoneNumber?: string;
    /** Email for email OTP verification (required for email method) */
    email?: string;
    /** JSON-stringified pending registration data - account created after OTP verification */
    pendingRegistration?: string;
  };
  ProfileSetup: { username: string };
  IDVerification: {
    username: string;
    verificationToken?: string;
  };
  EmailVerificationPending: { email: string; maskedEmail?: string };
};

// Discovery Stack
export type DiscoveryStackParamList = {
  Discovery: undefined;
  ProfileDetail: { userId: string };
  Filter: undefined;
};

// Matches Stack
export type MatchesStackParamList = {
  MatchesList: undefined;
  ProfileDetail: {
    userId: string;
    userName?: string;
    userPhoto?: string;
  };
};

// Call types for navigation
export type CallType = 'voice' | 'video';

// BUG-013: Call screen params with flexible userId type
export interface CallScreenParams {
  conversationId: string;
  userId: string | number;
  userName: string;
  userPhoto?: string;
  callType: CallType;
  isIncoming: boolean;
  callId?: string;
}

// Messages Stack
export type MessagesStackParamList = {
  ConversationsList: undefined;
  Chat: {
    conversationId: string;
    userName: string;
    userPhoto?: string;
    userId?: string | number;
    /** Optional expiration date for 24-hour match timer */
    expiresAt?: string;
    /** Whether this is a new match (no messages yet) */
    isNewMatch?: boolean;
  };
  Call: CallScreenParams;
  ProfileDetail: {
    userId: string | number;
    userName?: string;
    userPhoto?: string;
  };
};

// Profile Stack
export type ProfileStackParamList = {
  MyProfile: undefined;
  EditProfile: undefined;
  PrivacySettings: undefined;
  StoryAdmirers: undefined;
};

// Settings Stack
export type SettingsStackParamList = {
  Settings: undefined;
  SafetyCenter: undefined;
  HelpSupport: undefined;
  About: undefined;
  IDVerificationSettings: undefined;
};

// Tandy Stack
export type TandyStackParamList = {
  TandyHome: undefined;
  TandyChat: undefined;
  TandyBreathing: undefined;
  TandyMeditation: undefined;
  PsychiatristList: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  DiscoveryTab: NavigatorScreenParams<DiscoveryStackParamList>;
  MatchesTab: NavigatorScreenParams<MatchesStackParamList>;
  MessagesTab: NavigatorScreenParams<MessagesStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
  TandyTab: NavigatorScreenParams<TandyStackParamList>;
};

// Root Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Utility type for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
