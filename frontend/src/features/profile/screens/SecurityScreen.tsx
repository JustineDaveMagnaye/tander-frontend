/**
 * TANDER Security Settings Screen
 * Premium iOS-style security management
 *
 * Features:
 * - iOS Human Interface Guidelines design
 * - Change password with modal
 * - Two-factor authentication toggle
 * - Biometric security (Face ID / Fingerprint)
 * - Active sessions management
 * - Security alerts
 * - Haptic feedback on interactions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Switch,
  Alert,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { useResponsive } from '@shared/hooks/useResponsive';
import { useBiometric } from '@shared/hooks/useBiometric';
import { useAuthStore, selectUser } from '@store/authStore';
import {
  getSecuritySettings,
  updateTwoFactor,
  enableBiometric as enableBiometricApi,
  disableBiometric as disableBiometricApi,
  changePassword,
} from '@/services/api/profileApi';

// =============================================================================
// iOS DESIGN SYSTEM
// =============================================================================

const iOS = {
  colors: {
    // Backgrounds
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',

    // Labels
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C4399',
    quaternaryLabel: '#3C3C434D',

    // Separators
    separator: '#3C3C4336',
    opaqueSeparator: '#C6C6C8',

    // System Colors
    systemRed: '#FF3B30',
    systemOrange: '#FF9500',
    systemYellow: '#FFCC00',
    systemGreen: '#34C759',
    systemMint: '#00C7BE',
    systemTeal: '#30B0C7',
    systemCyan: '#32ADE6',
    systemBlue: '#007AFF',
    systemIndigo: '#5856D6',
    systemPurple: '#AF52DE',
    systemPink: '#FF2D55',
    systemBrown: '#A2845E',

    // Grays
    systemGray: '#8E8E93',
    systemGray2: '#AEAEB2',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',

    // Tander Brand
    tander: {
      orange: '#F97316',
      teal: '#14B8A6',
    },
  },

  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24,
    section: 35,
  },

  radius: {
    small: 8,
    medium: 10,
    large: 12,
    xlarge: 16,
  },

  typography: {
    largeTitle: {
      fontSize: 34,
      fontWeight: '700' as const,
      letterSpacing: 0.37,
    },
    title1: {
      fontSize: 28,
      fontWeight: '700' as const,
      letterSpacing: 0.36,
    },
    title2: {
      fontSize: 22,
      fontWeight: '700' as const,
      letterSpacing: 0.35,
    },
    title3: {
      fontSize: 20,
      fontWeight: '600' as const,
      letterSpacing: 0.38,
    },
    headline: {
      fontSize: 17,
      fontWeight: '600' as const,
      letterSpacing: -0.41,
    },
    body: {
      fontSize: 17,
      fontWeight: '400' as const,
      letterSpacing: -0.41,
    },
    callout: {
      fontSize: 16,
      fontWeight: '400' as const,
      letterSpacing: -0.32,
    },
    subhead: {
      fontSize: 15,
      fontWeight: '400' as const,
      letterSpacing: -0.24,
    },
    footnote: {
      fontSize: 13,
      fontWeight: '400' as const,
      letterSpacing: -0.08,
    },
    caption1: {
      fontSize: 12,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    caption2: {
      fontSize: 11,
      fontWeight: '400' as const,
      letterSpacing: 0.07,
    },
  },
};

// =============================================================================
// TYPES
// =============================================================================

interface SecurityScreenProps {
  onBack: () => void;
}

interface ToggleRowProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showSeparator?: boolean;
  trackColor?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  rightContent?: React.ReactNode;
  showSeparator?: boolean;
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={iosStyles.card}>{children}</View>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <View style={iosStyles.sectionHeader}>
    <Text style={iosStyles.sectionTitle}>{title.toUpperCase()}</Text>
  </View>
);

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  iconColor,
  iconBgColor,
  label,
  subtitle,
  value,
  onValueChange,
  showSeparator = true,
  trackColor = iOS.colors.tander.teal,
  disabled = false,
  isLoading = false,
}) => {
  const handleToggle = useCallback((newValue: boolean) => {
    if (!disabled && !isLoading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onValueChange(newValue);
    }
  }, [disabled, isLoading, onValueChange]);

  return (
    <Pressable
      style={({ pressed }) => [
        iosStyles.toggleRow,
        pressed && !disabled && iosStyles.rowPressed,
        disabled && iosStyles.rowDisabled,
      ]}
      onPress={() => handleToggle(!value)}
      disabled={disabled || isLoading}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={`${label}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <View style={iosStyles.rowContent}>
        <View style={[iosStyles.iconBadge, { backgroundColor: iconBgColor }]}>
          <Feather name={icon} size={18} color={iconColor} />
        </View>
        <View style={iosStyles.rowTextContainer}>
          <Text style={[iosStyles.rowLabel, disabled && iosStyles.rowLabelDisabled]}>{label}</Text>
          {subtitle && (
            <Text style={[iosStyles.rowSubtitle, disabled && iosStyles.rowSubtitleDisabled]}>
              {subtitle}
            </Text>
          )}
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={trackColor} />
        ) : (
          <Switch
            value={value}
            onValueChange={handleToggle}
            trackColor={{ false: iOS.colors.systemGray4, true: trackColor }}
            thumbColor={iOS.colors.systemBackground}
            ios_backgroundColor={iOS.colors.systemGray4}
            disabled={disabled}
            style={iosStyles.switch}
          />
        )}
      </View>
      {showSeparator && <View style={iosStyles.rowSeparator} />}
    </Pressable>
  );
};

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconColor,
  iconBgColor,
  label,
  subtitle,
  onPress,
  rightContent,
  showSeparator = true,
}) => {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      style={({ pressed }) => [
        iosStyles.settingsRow,
        pressed && iosStyles.rowPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <View style={iosStyles.rowContent}>
        <View style={[iosStyles.iconBadge, { backgroundColor: iconBgColor }]}>
          <Feather name={icon} size={18} color={iconColor} />
        </View>
        <View style={iosStyles.rowTextContainer}>
          <Text style={iosStyles.rowLabel}>{label}</Text>
          {subtitle && <Text style={iosStyles.rowSubtitle}>{subtitle}</Text>}
        </View>
        {rightContent || (
          <Feather name="chevron-right" size={18} color={iOS.colors.systemGray3} />
        )}
      </View>
      {showSeparator && <View style={iosStyles.rowSeparator} />}
    </Pressable>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const SecurityScreen: React.FC<SecurityScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet } = useResponsive();
  const user = useAuthStore(selectUser);

  // Biometric hook
  const {
    isNativeAvailable,
    hasHardware,
    isEnrolled,
    biometricLabel,
    isEnabled: biometricEnabled,
    isLoading: biometricLoading,
    isAuthenticating,
    enableBiometric,
    disableBiometric,
    error: biometricError,
    clearError: clearBiometricError,
  } = useBiometric();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Biometric enable modal state
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [showBiometricPassword, setShowBiometricPassword] = useState(false);
  const [isEnablingBiometric, setIsEnablingBiometric] = useState(false);

  // Load security settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const securitySettings = await getSecuritySettings();
        setTwoFactorEnabled(securitySettings.twoFactorEnabled);
      } catch (err) {
        console.warn('Failed to load security settings:', err);
      }
    };
    loadSettings();
  }, []);

  // Show biometric error
  useEffect(() => {
    if (biometricError) {
      Alert.alert('Biometric Error', biometricError, [
        { text: 'OK', onPress: clearBiometricError },
      ]);
    }
  }, [biometricError, clearBiometricError]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

  const handleTwoFactorToggle = useCallback(async (value: boolean) => {
    const previousValue = twoFactorEnabled;
    setTwoFactorEnabled(value);
    try {
      await updateTwoFactor(value);
    } catch (err) {
      console.warn('Failed to update two-factor:', err);
      setTwoFactorEnabled(previousValue);
      Alert.alert('Error', 'Failed to update two-factor authentication.');
    }
  }, [twoFactorEnabled]);

  const handleBiometricToggle = useCallback(async (value: boolean) => {
    if (value) {
      if (!isNativeAvailable) {
        Alert.alert(
          'Development Build Required',
          'Biometric authentication requires a development build. Run "npx expo run:android" or "npx expo run:ios" to test this feature.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (!hasHardware) {
        Alert.alert(
          'Not Supported',
          'Your device does not have biometric hardware.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (!isEnrolled) {
        Alert.alert(
          'Setup Required',
          `Please set up ${biometricLabel} in your device settings first.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }

      setBiometricPassword('');
      setShowBiometricModal(true);
    } else {
      const success = await disableBiometric();
      if (success) {
        try {
          await disableBiometricApi();
        } catch (err) {
          console.warn('Failed to disable biometric on server:', err);
        }
        Alert.alert('Success', `${biometricLabel} login has been disabled.`);
      }
    }
  }, [isNativeAvailable, hasHardware, isEnrolled, biometricLabel, disableBiometric]);

  const handleConfirmBiometricEnable = useCallback(async () => {
    if (!biometricPassword.trim()) {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }

    if (!user?.username) {
      Alert.alert('Error', 'Unable to get your username. Please try again.');
      return;
    }

    setIsEnablingBiometric(true);

    try {
      const success = await enableBiometric(user.username, biometricPassword);

      if (success) {
        try {
          await enableBiometricApi();
        } catch (err) {
          console.warn('Failed to enable biometric on server:', err);
        }

        setShowBiometricModal(false);
        setBiometricPassword('');
        Alert.alert('Success', `${biometricLabel} login is now enabled!`);
      }
    } catch (err) {
      console.warn('Failed to enable biometric:', err);
      Alert.alert('Error', 'Failed to enable biometric login. Please try again.');
    } finally {
      setIsEnablingBiometric(false);
    }
  }, [biometricPassword, user?.username, enableBiometric, biometricLabel]);

  const handleChangePassword = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  }, []);

  const handleSubmitPasswordChange = useCallback(async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password.');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      Alert.alert('Success', result.message || 'Password changed successfully.');
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to change password.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const handleActiveSessions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Active Sessions',
      'You are currently logged in on this device.\n\nSession management features are coming soon.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleSecurityAlerts = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Security Alerts',
      'You will be notified of:\n\n• New device logins\n• Password changes\n• Unusual activity\n• Account recovery attempts',
      [{ text: 'OK' }]
    );
  }, []);

  const getBiometricSubtitle = () => {
    if (!isNativeAvailable) return 'Requires development build';
    if (!hasHardware) return 'Not supported on this device';
    if (!isEnrolled) return `Set up ${biometricLabel} in Settings first`;
    if (biometricEnabled) return `${biometricLabel} login enabled`;
    return `Use ${biometricLabel} for quick sign in`;
  };

  const canEnableBiometric = isNativeAvailable && hasHardware;

  return (
    <View style={[iosStyles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={iOS.colors.secondarySystemBackground}
        translucent={Platform.OS === 'android'}
      />

      {/* iOS-style Navigation Bar */}
      <View style={[iosStyles.navBar, isLandscape && iosStyles.navBarLandscape]}>
        <Pressable
          style={({ pressed }) => [
            iosStyles.backButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back to Settings"
        >
          <Feather name="chevron-left" size={28} color={iOS.colors.tander.orange} />
          <Text style={iosStyles.backText}>Settings</Text>
        </Pressable>
        <Text style={[iosStyles.navTitle, isLandscape && iosStyles.navTitleLandscape]}>
          Security
        </Text>
        <View style={iosStyles.navSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={iosStyles.scrollView}
        contentContainerStyle={[
          iosStyles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
          isTablet && { maxWidth: isLandscape ? 800 : 600, alignSelf: 'center', width: '100%' },
          !isTablet && isLandscape && { maxWidth: 600, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Password & Authentication Section */}
        <SectionHeader title="Password & Authentication" />
        <Card>
          <SettingsRow
            icon="lock"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.systemPurple}
            label="Change Password"
            subtitle="Update your password"
            onPress={handleChangePassword}
            rightContent={
              <Text style={iosStyles.passwordDots}>••••••••</Text>
            }
          />
          <ToggleRow
            icon="key"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.tander.teal}
            label="Two-Factor Authentication"
            subtitle="Extra layer of security"
            value={twoFactorEnabled}
            onValueChange={handleTwoFactorToggle}
            trackColor={iOS.colors.tander.teal}
            showSeparator={false}
          />
        </Card>

        {/* Biometric Security Section */}
        <SectionHeader title="Biometric Security" />
        <Card>
          <ToggleRow
            icon="smartphone"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.tander.orange}
            label={biometricLabel}
            subtitle={getBiometricSubtitle()}
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={iOS.colors.tander.orange}
            disabled={!canEnableBiometric || biometricLoading}
            isLoading={biometricLoading || isAuthenticating}
            showSeparator={false}
          />
        </Card>

        {/* Account Security Section */}
        <SectionHeader title="Account Security" />
        <Card>
          <SettingsRow
            icon="shield"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.systemBlue}
            label="Active Sessions"
            subtitle="View and manage devices"
            onPress={handleActiveSessions}
            rightContent={
              <View style={iosStyles.activeBadge}>
                <Text style={iosStyles.activeBadgeText}>2</Text>
              </View>
            }
          />
          <SettingsRow
            icon="alert-triangle"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.systemYellow}
            label="Security Alerts"
            subtitle="Get notified of unusual activity"
            onPress={handleSecurityAlerts}
            showSeparator={false}
          />
        </Card>

        {/* Security Info Box */}
        <View style={iosStyles.infoBox}>
          <View style={[iosStyles.infoIconBadge, { backgroundColor: iOS.colors.systemGreen }]}>
            <Feather name="shield" size={18} color="#FFFFFF" />
          </View>
          <View style={iosStyles.infoTextContainer}>
            <Text style={iosStyles.infoTitle}>Your Account is Secure</Text>
            <Text style={iosStyles.infoDescription}>
              We use industry-standard encryption to protect your data.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={iosStyles.footer}>
          <Text style={iosStyles.footerText}>
            Last password change: November 15, 2025
          </Text>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          style={[iosStyles.modalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={iosStyles.modalHeader}>
            <Pressable
              style={({ pressed }) => [
                iosStyles.modalCloseButton,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => setShowPasswordModal(false)}
              disabled={isChangingPassword}
            >
              <Text style={iosStyles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Text style={iosStyles.modalTitle}>Change Password</Text>
            <View style={iosStyles.modalCloseButton} />
          </View>

          <ScrollView
            style={iosStyles.modalContent}
            contentContainerStyle={iosStyles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={iosStyles.modalDescription}>
              Enter your current password and choose a new password that is at least 8 characters long.
            </Text>

            {/* Current Password */}
            <View style={iosStyles.inputGroup}>
              <Text style={iosStyles.inputLabel}>Current Password</Text>
              <View style={iosStyles.inputContainer}>
                <TextInput
                  style={iosStyles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={iOS.colors.tertiaryLabel}
                  secureTextEntry={!showCurrentPassword}
                  editable={!isChangingPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  maxFontSizeMultiplier={FONT_SCALING.INPUT}
                />
                <Pressable
                  style={iosStyles.eyeButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Feather
                    name={showCurrentPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={iOS.colors.systemGray}
                  />
                </Pressable>
              </View>
            </View>

            {/* New Password */}
            <View style={iosStyles.inputGroup}>
              <Text style={iosStyles.inputLabel}>New Password</Text>
              <View style={iosStyles.inputContainer}>
                <TextInput
                  style={iosStyles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={iOS.colors.tertiaryLabel}
                  secureTextEntry={!showNewPassword}
                  editable={!isChangingPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  maxFontSizeMultiplier={FONT_SCALING.INPUT}
                />
                <Pressable
                  style={iosStyles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Feather
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={iOS.colors.systemGray}
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={iosStyles.inputGroup}>
              <Text style={iosStyles.inputLabel}>Confirm New Password</Text>
              <View style={iosStyles.inputContainer}>
                <TextInput
                  style={iosStyles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={iOS.colors.tertiaryLabel}
                  secureTextEntry={!showNewPassword}
                  editable={!isChangingPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  maxFontSizeMultiplier={FONT_SCALING.INPUT}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                iosStyles.primaryButton,
                isChangingPassword && iosStyles.primaryButtonDisabled,
                pressed && !isChangingPassword && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleSubmitPasswordChange}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={iosStyles.primaryButtonText}>Change Password</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Biometric Enable Modal */}
      <Modal
        visible={showBiometricModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !isEnablingBiometric && setShowBiometricModal(false)}
      >
        <KeyboardAvoidingView
          style={[iosStyles.modalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={iosStyles.modalHeader}>
            <Pressable
              style={({ pressed }) => [
                iosStyles.modalCloseButton,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => setShowBiometricModal(false)}
              disabled={isEnablingBiometric}
            >
              <Text style={iosStyles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Text style={iosStyles.modalTitle}>Enable {biometricLabel}</Text>
            <View style={iosStyles.modalCloseButton} />
          </View>

          <ScrollView
            style={iosStyles.modalContent}
            contentContainerStyle={iosStyles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Biometric Icon */}
            <View style={iosStyles.biometricIconContainer}>
              <View style={iosStyles.biometricIconCircle}>
                <Feather name="smartphone" size={48} color={iOS.colors.tander.orange} />
              </View>
            </View>

            <Text style={iosStyles.biometricModalTitle}>
              Sign in faster with {biometricLabel}
            </Text>

            <Text style={iosStyles.modalDescription}>
              Enter your password to enable {biometricLabel} login. Your password will be stored securely on your device.
            </Text>

            {/* Password Input */}
            <View style={iosStyles.inputGroup}>
              <Text style={iosStyles.inputLabel}>Your Password</Text>
              <View style={iosStyles.inputContainer}>
                <TextInput
                  style={iosStyles.input}
                  value={biometricPassword}
                  onChangeText={setBiometricPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={iOS.colors.tertiaryLabel}
                  secureTextEntry={!showBiometricPassword}
                  editable={!isEnablingBiometric}
                  autoCapitalize="none"
                  autoComplete="password"
                  maxFontSizeMultiplier={FONT_SCALING.INPUT}
                />
                <Pressable
                  style={iosStyles.eyeButton}
                  onPress={() => setShowBiometricPassword(!showBiometricPassword)}
                >
                  <Feather
                    name={showBiometricPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={iOS.colors.systemGray}
                  />
                </Pressable>
              </View>
            </View>

            {/* Security Note */}
            <View style={iosStyles.securityNote}>
              <Feather name="lock" size={16} color={iOS.colors.tander.teal} />
              <Text style={iosStyles.securityNoteText}>
                Your password is encrypted and stored securely on your device only.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                iosStyles.primaryButton,
                { backgroundColor: iOS.colors.tander.orange },
                isEnablingBiometric && iosStyles.primaryButtonDisabled,
                pressed && !isEnablingBiometric && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleConfirmBiometricEnable}
              disabled={isEnablingBiometric}
            >
              {isEnablingBiometric ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check" size={20} color="#FFFFFF" />
                  <Text style={iosStyles.primaryButtonText}>Enable {biometricLabel}</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// =============================================================================
// iOS STYLES
// =============================================================================

const iosStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },

  // Navigation Bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.secondarySystemBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },
  navBarLandscape: {
    paddingVertical: iOS.spacing.s,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -iOS.spacing.s,
  },
  backText: {
    ...iOS.typography.body,
    color: iOS.colors.tander.orange,
    marginLeft: -2,
  },
  navTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  navTitleLandscape: {
    fontSize: 15,
  },
  navSpacer: {
    width: 80,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: iOS.spacing.l,
    paddingTop: iOS.spacing.xl,
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: iOS.spacing.l,
    paddingTop: iOS.spacing.xxl,
    paddingBottom: iOS.spacing.s,
  },
  sectionTitle: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    overflow: 'hidden',
  },

  // Row Styles
  toggleRow: {
    backgroundColor: iOS.colors.systemBackground,
  },
  settingsRow: {
    backgroundColor: iOS.colors.systemBackground,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    minHeight: 60,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.m,
  },
  rowTextContainer: {
    flex: 1,
    marginRight: iOS.spacing.m,
  },
  rowLabel: {
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  rowLabelDisabled: {
    color: iOS.colors.tertiaryLabel,
  },
  rowSubtitle: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    marginTop: 2,
  },
  rowSubtitleDisabled: {
    color: iOS.colors.quaternaryLabel,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: iOS.colors.separator,
    marginLeft: 62,
  },
  rowPressed: {
    backgroundColor: iOS.colors.systemGray5,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  switch: {
    transform: Platform.OS === 'ios' ? [] : [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },

  // Password Dots
  passwordDots: {
    ...iOS.typography.body,
    color: iOS.colors.systemGray3,
    letterSpacing: 2,
  },

  // Active Sessions Badge
  activeBadge: {
    backgroundColor: '#E8F5E9',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBadgeText: {
    ...iOS.typography.footnote,
    fontWeight: '600',
    color: iOS.colors.systemGreen,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: iOS.radius.large,
    padding: iOS.spacing.l,
    marginTop: iOS.spacing.xxl,
    gap: iOS.spacing.m,
  },
  infoIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    ...iOS.typography.headline,
    color: '#14532D',
    marginBottom: iOS.spacing.xs,
  },
  infoDescription: {
    ...iOS.typography.subhead,
    color: '#15803D',
    lineHeight: 20,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: iOS.spacing.xxl,
    paddingBottom: iOS.spacing.xl,
  },
  footerText: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.secondarySystemBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },
  modalCloseButton: {
    minWidth: 60,
  },
  modalCancelText: {
    ...iOS.typography.body,
    color: iOS.colors.tander.orange,
  },
  modalTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: iOS.spacing.l,
  },
  modalDescription: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    lineHeight: 22,
    marginBottom: iOS.spacing.xl,
  },

  // Input Styles
  inputGroup: {
    marginBottom: iOS.spacing.l,
  },
  inputLabel: {
    ...iOS.typography.footnote,
    fontWeight: '500',
    color: iOS.colors.secondaryLabel,
    marginBottom: iOS.spacing.s,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.medium,
    paddingHorizontal: iOS.spacing.l,
  },
  input: {
    flex: 1,
    height: 52,
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  eyeButton: {
    padding: iOS.spacing.s,
  },

  // Primary Button
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: iOS.colors.tander.teal,
    borderRadius: iOS.radius.large,
    paddingVertical: iOS.spacing.l,
    gap: iOS.spacing.s,
    marginTop: iOS.spacing.m,
  },
  primaryButtonDisabled: {
    backgroundColor: iOS.colors.systemGray3,
  },
  primaryButtonText: {
    ...iOS.typography.headline,
    color: '#FFFFFF',
  },

  // Biometric Modal
  biometricIconContainer: {
    alignItems: 'center',
    marginBottom: iOS.spacing.xl,
  },
  biometricIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricModalTitle: {
    ...iOS.typography.title2,
    color: iOS.colors.label,
    textAlign: 'center',
    marginBottom: iOS.spacing.m,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6FFFA',
    padding: iOS.spacing.m,
    borderRadius: iOS.radius.medium,
    gap: iOS.spacing.s,
    marginBottom: iOS.spacing.xl,
  },
  securityNoteText: {
    flex: 1,
    ...iOS.typography.footnote,
    color: iOS.colors.tander.teal,
    lineHeight: 18,
  },
});

export default SecurityScreen;
