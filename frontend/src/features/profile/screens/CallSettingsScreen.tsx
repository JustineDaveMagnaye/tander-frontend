/**
 * TANDER Call Settings Screen
 * Settings for voice and video calls
 *
 * Features:
 * - Default speaker setting for calls
 * - Video call camera default (front/back)
 * - Do Not Disturb settings
 * - Call notifications toggle
 * - Senior-friendly large touch targets
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
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

// =============================================================================
// TYPES
// =============================================================================

interface CallSettingsScreenProps {
  onBack: () => void;
}

interface CallSettings {
  defaultSpeakerVoice: boolean;
  defaultSpeakerVideo: boolean;
  defaultFrontCamera: boolean;
  vibrationEnabled: boolean;
  callNotificationsEnabled: boolean;
  doNotDisturbEnabled: boolean;
  doNotDisturbStart: string;
  doNotDisturbEnd: string;
}

const DEFAULT_SETTINGS: CallSettings = {
  defaultSpeakerVoice: false,
  defaultSpeakerVideo: true,
  defaultFrontCamera: true,
  vibrationEnabled: true,
  callNotificationsEnabled: true,
  doNotDisturbEnabled: false,
  doNotDisturbStart: '22:00',
  doNotDisturbEnd: '07:00',
};

const STORAGE_KEY = '@tander_call_settings';

// =============================================================================
// COMPONENTS
// =============================================================================

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

interface ToggleSettingProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showBorder?: boolean;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  value,
  onValueChange,
  showBorder = true,
}) => (
  <View style={[styles.settingItem, showBorder && styles.settingItemBorder]}>
    <View style={styles.settingItemLeft}>
      <View style={[styles.settingItemIcon, { backgroundColor: iconBgColor }]}>
        <Feather name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.settingItemText}>
        <Text style={styles.settingItemTitle}>{title}</Text>
        <Text style={styles.settingItemSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.gray[300], true: colors.teal[400] }}
      thumbColor={value ? colors.teal[500] : colors.gray[100]}
      ios_backgroundColor={colors.gray[300]}
      style={styles.switch}
      accessible={true}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: value }}
    />
  </View>
);

interface InfoSettingProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  value: string;
  onPress: () => void;
  showBorder?: boolean;
}

const InfoSetting: React.FC<InfoSettingProps> = ({
  icon,
  iconColor,
  iconBgColor,
  title,
  value,
  onPress,
  showBorder = true,
}) => (
  <TouchableOpacity
    style={[styles.settingItem, showBorder && styles.settingItemBorder]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={`${title}, currently ${value}`}
  >
    <View style={styles.settingItemLeft}>
      <View style={[styles.settingItemIcon, { backgroundColor: iconBgColor }]}>
        <Feather name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.settingItemText}>
        <Text style={styles.settingItemTitle}>{title}</Text>
        <Text style={styles.settingItemSubtitle}>{value}</Text>
      </View>
    </View>
    <Feather name="chevron-right" size={20} color={colors.gray[400]} />
  </TouchableOpacity>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CallSettingsScreen: React.FC<CallSettingsScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useResponsive();

  const [settings, setSettings] = useState<CallSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
        }
      } catch (error) {
        console.error('Failed to load call settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Save settings to AsyncStorage
  const saveSettings = useCallback(async (newSettings: CallSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save call settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  }, []);

  // Update a specific setting
  const updateSetting = useCallback(<K extends keyof CallSettings>(
    key: K,
    value: CallSettings[K]
  ) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      return newSettings;
    });
  }, [saveSettings]);

  // Handle DND time selection
  const handleDNDTimePress = useCallback((type: 'start' | 'end') => {
    const currentValue = type === 'start' ? settings.doNotDisturbStart : settings.doNotDisturbEnd;
    Alert.alert(
      `Set ${type === 'start' ? 'Start' : 'End'} Time`,
      `Current: ${currentValue}\n\nTime picker would appear here in production.`,
      [{ text: 'OK' }]
    );
  }, [settings]);

  // Reset to defaults
  const handleResetDefaults = useCallback(() => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all call settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings(DEFAULT_SETTINGS);
            saveSettings(DEFAULT_SETTINGS);
          },
        },
      ]
    );
  }, [saveSettings]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.white}
        translucent={Platform.OS === 'android'}
      />

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
          Call Settings
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Audio Settings */}
        <SettingsSection title="Audio Settings">
          <ToggleSetting
            icon="volume-2"
            iconColor={colors.teal[500]}
            iconBgColor={colors.teal[100]}
            title="Speaker for Voice Calls"
            subtitle="Use speaker by default for voice calls"
            value={settings.defaultSpeakerVoice}
            onValueChange={(value) => updateSetting('defaultSpeakerVoice', value)}
          />
          <ToggleSetting
            icon="speaker"
            iconColor={colors.orange[500]}
            iconBgColor={colors.orange[100]}
            title="Speaker for Video Calls"
            subtitle="Use speaker by default for video calls"
            value={settings.defaultSpeakerVideo}
            onValueChange={(value) => updateSetting('defaultSpeakerVideo', value)}
            showBorder={false}
          />
        </SettingsSection>

        {/* Video Settings */}
        <SettingsSection title="Video Settings">
          <ToggleSetting
            icon="camera"
            iconColor="#9333EA"
            iconBgColor="#F3E8FF"
            title="Default Front Camera"
            subtitle="Use front camera when starting video calls"
            value={settings.defaultFrontCamera}
            onValueChange={(value) => updateSetting('defaultFrontCamera', value)}
            showBorder={false}
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <ToggleSetting
            icon="bell"
            iconColor={colors.orange[500]}
            iconBgColor={colors.orange[100]}
            title="Call Notifications"
            subtitle="Receive notifications for incoming calls"
            value={settings.callNotificationsEnabled}
            onValueChange={(value) => updateSetting('callNotificationsEnabled', value)}
          />
          <ToggleSetting
            icon="smartphone"
            iconColor={colors.teal[500]}
            iconBgColor={colors.teal[100]}
            title="Vibration"
            subtitle="Vibrate on incoming calls"
            value={settings.vibrationEnabled}
            onValueChange={(value) => updateSetting('vibrationEnabled', value)}
            showBorder={false}
          />
        </SettingsSection>

        {/* Do Not Disturb */}
        <SettingsSection title="Do Not Disturb">
          <ToggleSetting
            icon="moon"
            iconColor="#3B82F6"
            iconBgColor="#DBEAFE"
            title="Do Not Disturb"
            subtitle="Silence incoming calls during set hours"
            value={settings.doNotDisturbEnabled}
            onValueChange={(value) => updateSetting('doNotDisturbEnabled', value)}
          />
          {settings.doNotDisturbEnabled && (
            <>
              <InfoSetting
                icon="clock"
                iconColor={colors.gray[600]}
                iconBgColor={colors.gray[100]}
                title="Start Time"
                value={settings.doNotDisturbStart}
                onPress={() => handleDNDTimePress('start')}
              />
              <InfoSetting
                icon="clock"
                iconColor={colors.gray[600]}
                iconBgColor={colors.gray[100]}
                title="End Time"
                value={settings.doNotDisturbEnd}
                onPress={() => handleDNDTimePress('end')}
                showBorder={false}
              />
            </>
          )}
        </SettingsSection>

        {/* Reset */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetDefaults}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Reset to default settings"
        >
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray[600],
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

  // ScrollView
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

  // Setting Item
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    minHeight: 72,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.s,
  },
  settingItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItemText: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
  },
  switch: {
    transform: Platform.OS === 'ios' ? [{ scaleX: 1.1 }, { scaleY: 1.1 }] : [],
  },

  // Reset Button
  resetButton: {
    marginHorizontal: spacing.s,
    marginTop: spacing.l,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    color: colors.gray[500],
    fontWeight: '500',
  },
});

export default CallSettingsScreen;
