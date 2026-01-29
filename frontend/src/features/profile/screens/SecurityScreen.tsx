/**
 * TANDER Security Settings Screen
 * Manage password, authentication, and account security
 *
 * Features:
 * - Change password
 * - Two-factor authentication toggle
 * - Biometric security (Face ID / Fingerprint) with native authentication
 * - Active sessions management
 * - Security alerts
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
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
// TYPES
// =============================================================================

interface SecurityScreenProps {
  onBack: () => void;
}

interface SecurityToggleProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showBorder?: boolean;
  trackColor?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

interface SecurityItemProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  rightContent?: React.ReactNode;
  showBorder?: boolean;
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const SecurityToggle: React.FC<SecurityToggleProps> = ({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  value,
  onValueChange,
  showBorder = true,
  trackColor = colors.teal[500],
  disabled = false,
  isLoading = false,
}) => (
  <TouchableOpacity
    style={[styles.toggleItem, showBorder && styles.itemBorder, disabled && styles.itemDisabled]}
    onPress={() => !disabled && !isLoading && onValueChange(!value)}
    activeOpacity={disabled ? 1 : 0.7}
    accessibilityRole="switch"
    accessibilityState={{ checked: value, disabled }}
  >
    <View style={styles.itemLeft}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Feather name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.itemText}>
        <Text style={[styles.itemTitle, disabled && styles.itemTitleDisabled]}>{title}</Text>
        <Text style={[styles.itemSubtitle, disabled && styles.itemSubtitleDisabled]}>{subtitle}</Text>
      </View>
    </View>
    {isLoading ? (
      <ActivityIndicator size="small" color={trackColor} />
    ) : (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.gray[200], true: trackColor }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.gray[200]}
        disabled={disabled}
      />
    )}
  </TouchableOpacity>
);

const SecurityItem: React.FC<SecurityItemProps> = ({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  onPress,
  rightContent,
  showBorder = true,
}) => (
  <TouchableOpacity
    style={[styles.securityItem, showBorder && styles.itemBorder]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.itemLeft}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Feather name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
    </View>
    {rightContent || (
      <Feather name="chevron-right" size={20} color={colors.gray[400]} />
    )}
  </TouchableOpacity>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const SecurityScreen: React.FC<SecurityScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useResponsive();
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
      // Check if native modules are available
      if (!isNativeAvailable) {
        Alert.alert(
          'Development Build Required',
          'Biometric authentication requires a development build. Run "npx expo run:android" or "npx expo run:ios" to test this feature.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if device supports biometrics
      if (!hasHardware) {
        Alert.alert(
          'Not Supported',
          'Your device does not have biometric hardware (fingerprint sensor or face recognition).',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if biometrics are enrolled
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

      // Show password prompt to store credentials
      setBiometricPassword('');
      setShowBiometricModal(true);
    } else {
      // Disable biometric
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
        // Notify backend
        try {
          await enableBiometricApi();
        } catch (err) {
          console.warn('Failed to enable biometric on server:', err);
        }

        setShowBiometricModal(false);
        setBiometricPassword('');
        Alert.alert('Success', `${biometricLabel} login is now enabled! You can use it to sign in.`);
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
      const errorMessage = err?.message || 'Failed to change password. Please check your current password.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const handleActiveSessions = useCallback(() => {
    Alert.alert(
      'Active Sessions',
      'You are currently logged in on this device.\n\nSession management features are coming soon.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleSecurityAlerts = useCallback(() => {
    Alert.alert(
      'Security Alerts',
      'You will be notified of:\n\n- New device logins\n- Password changes\n- Unusual activity\n- Account recovery attempts',
      [{ text: 'OK' }]
    );
  }, []);

  // Determine biometric subtitle based on device capability
  const getBiometricSubtitle = () => {
    // Check if native modules are available (not in Expo Go)
    if (!isNativeAvailable) {
      return 'Requires development build to test';
    }
    // Check if device has biometric hardware
    if (!hasHardware) {
      return 'Not supported on this device';
    }
    // Check if biometrics are enrolled in device settings
    if (!isEnrolled) {
      return `Set up ${biometricLabel} in device Settings first`;
    }
    // Show current state
    if (biometricEnabled) {
      return `${biometricLabel} login enabled`;
    }
    return `Use ${biometricLabel} for quick sign in`;
  };

  // Check if biometrics can be enabled
  const canEnableBiometric = isNativeAvailable && hasHardware;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={Platform.OS === 'android'} />

      {/* Header */}
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <TouchableOpacity
          style={[styles.backButton, isLandscape && styles.backButtonLandscape]}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather
            name="arrow-left"
            size={isLandscape ? 18 : 22}
            color={colors.gray[600]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLandscape && styles.headerTitleLandscape]}>
          Security
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Password & Authentication Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Password & Authentication</Text>
          </View>

          <SecurityItem
            icon="lock"
            iconColor="#9333EA"
            iconBgColor="#F3E8FF"
            title="Change Password"
            subtitle="Update your password"
            onPress={handleChangePassword}
            rightContent={
              <Text style={styles.passwordDots}>*******</Text>
            }
          />

          <SecurityToggle
            icon="key"
            iconColor={colors.teal[500]}
            iconBgColor={colors.teal[100]}
            title="Two-Factor Authentication"
            subtitle="Extra layer of security"
            value={twoFactorEnabled}
            onValueChange={handleTwoFactorToggle}
            showBorder={false}
          />
        </View>

        {/* Biometric Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Biometric Security</Text>
          </View>

          <SecurityToggle
            icon="smartphone"
            iconColor={colors.orange[500]}
            iconBgColor={colors.orange[100]}
            title={biometricLabel}
            subtitle={getBiometricSubtitle()}
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            showBorder={false}
            trackColor={colors.orange[500]}
            disabled={!canEnableBiometric || biometricLoading}
            isLoading={biometricLoading || isAuthenticating}
          />
        </View>

        {/* Account Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Security</Text>
          </View>

          <SecurityItem
            icon="shield"
            iconColor="#3B82F6"
            iconBgColor="#DBEAFE"
            title="Active Sessions"
            subtitle="View and manage devices"
            onPress={handleActiveSessions}
            rightContent={
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>2 Active</Text>
              </View>
            }
          />

          <SecurityItem
            icon="alert-triangle"
            iconColor="#EAB308"
            iconBgColor="#FEF9C3"
            title="Security Alerts"
            subtitle="Get notified of unusual activity"
            onPress={handleSecurityAlerts}
            showBorder={false}
          />
        </View>

        {/* Security Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconContainer}>
            <Feather name="shield" size={24} color="#22C55E" />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Your Account is Secure</Text>
            <Text style={styles.infoDescription}>
              We use industry-standard encryption to protect your data. Enable
              two-factor authentication for additional security.
            </Text>
          </View>
        </View>

        {/* Last Password Change */}
        <View style={styles.lastPasswordChange}>
          <Text style={styles.lastPasswordText}>
            Last password change:{' '}
            <Text style={styles.lastPasswordDate}>November 15, 2025</Text>
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
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPasswordModal(false)}
              disabled={isChangingPassword}
            >
              <Feather name="x" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Change Password</Text>
            <View style={styles.modalCloseButton} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <Text style={styles.modalDescription}>
              Enter your current password and choose a new password that is at least 8 characters long.
            </Text>

            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.gray[400]}
                  secureTextEntry={!showCurrentPassword}
                  editable={!isChangingPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Feather
                    name={showCurrentPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.gray[500]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.gray[400]}
                  secureTextEntry={!showNewPassword}
                  editable={!isChangingPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Feather
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.gray[500]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.gray[400]}
                  secureTextEntry={!showNewPassword}
                  editable={!isChangingPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.changePasswordButton,
                isChangingPassword && styles.changePasswordButtonDisabled,
              ]}
              onPress={handleSubmitPasswordChange}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.changePasswordButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Biometric Enable Modal */}
      <Modal
        visible={showBiometricModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !isEnablingBiometric && setShowBiometricModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowBiometricModal(false)}
              disabled={isEnablingBiometric}
            >
              <Feather name="x" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Enable {biometricLabel}</Text>
            <View style={styles.modalCloseButton} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            {/* Biometric Icon */}
            <View style={styles.biometricIconContainer}>
              <View style={styles.biometricIconCircle}>
                <Feather name="smartphone" size={48} color={colors.orange[500]} />
              </View>
            </View>

            <Text style={styles.biometricModalTitle}>
              Sign in faster with {biometricLabel}
            </Text>

            <Text style={styles.modalDescription}>
              Enter your password to enable {biometricLabel} login. Your password will be stored securely on your device.
            </Text>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={biometricPassword}
                  onChangeText={setBiometricPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.gray[400]}
                  secureTextEntry={!showBiometricPassword}
                  editable={!isEnablingBiometric}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowBiometricPassword(!showBiometricPassword)}
                >
                  <Feather
                    name={showBiometricPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.gray[500]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Security Note */}
            <View style={styles.securityNote}>
              <Feather name="lock" size={16} color={colors.teal[600]} />
              <Text style={styles.securityNoteText}>
                Your password is encrypted and stored securely on your device only.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.enableBiometricButton,
                isEnablingBiometric && styles.enableBiometricButtonDisabled,
              ]}
              onPress={handleConfirmBiometricEnable}
              disabled={isEnablingBiometric}
            >
              {isEnablingBiometric ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Feather name="check" size={20} color={colors.white} />
                  <Text style={styles.enableBiometricButtonText}>Enable {biometricLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.s,
  },
  headerLandscape: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.xs,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonLandscape: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
  },
  headerTitleLandscape: {
    fontSize: 24,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.s,
  },

  // Section
  section: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.s,
    marginTop: spacing.s,
    borderRadius: borderRadius.large,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },

  // Item Shared Styles
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.s,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  itemTitleDisabled: {
    color: colors.gray[400],
  },
  itemSubtitle: {
    fontSize: 16,
    color: colors.gray[500],
  },
  itemSubtitleDisabled: {
    color: colors.gray[300],
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  itemDisabled: {
    opacity: 0.6,
  },

  // Toggle Item
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
  },

  // Security Item (Pressable)
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
  },

  // Password Dots
  passwordDots: {
    fontSize: 16,
    color: colors.gray[400],
    letterSpacing: 2,
  },

  // Active Sessions Badge
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#15803D',
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginHorizontal: spacing.s,
    marginTop: spacing.m,
    gap: spacing.s,
  },
  infoIconContainer: {
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14532D',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 16,
    color: '#15803D',
    lineHeight: 24,
  },

  // Last Password Change
  lastPasswordChange: {
    alignItems: 'center',
    marginTop: spacing.m,
    marginBottom: spacing.m,
  },
  lastPasswordText: {
    fontSize: 16,
    color: colors.gray[500],
  },
  lastPasswordDate: {
    fontWeight: '600',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.m,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.gray[600],
    lineHeight: 24,
    marginBottom: spacing.l,
  },
  inputGroup: {
    marginBottom: spacing.m,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.m,
  },
  passwordInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: colors.gray[900],
  },
  eyeButton: {
    padding: spacing.xs,
  },
  changePasswordButton: {
    backgroundColor: colors.orange[500],
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.m,
    height: 56,
  },
  changePasswordButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  changePasswordButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },

  // Biometric Modal Styles
  biometricIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  biometricIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.orange[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teal[50],
    padding: spacing.m,
    borderRadius: borderRadius.medium,
    gap: spacing.s,
    marginBottom: spacing.l,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 14,
    color: colors.teal[700],
    lineHeight: 20,
  },
  enableBiometricButton: {
    flexDirection: 'row',
    backgroundColor: colors.orange[500],
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    height: 56,
  },
  enableBiometricButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  enableBiometricButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
});

export default SecurityScreen;
