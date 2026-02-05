/**
 * TANDER Call Settings Screen - iOS Premium Design
 * Settings for voice and video calls
 *
 * Design: iOS Human Interface Guidelines
 * - Clean system background (#F2F2F7)
 * - iOS-style grouped cards
 * - Uppercase section headers
 * - Haptic feedback on interactions
 * - Senior-friendly touch targets
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
  Platform,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { testIncomingCall, runFullDiagnostics } from '@/services/incomingCall/IncomingCallDiagnostics';

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
    quaternaryLabel: '#3C3C4366',
    // Separators
    separator: '#3C3C4336',
    opaqueSeparator: '#C6C6C8',
    // System Colors
    systemRed: '#FF3B30',
    systemGreen: '#34C759',
    systemBlue: '#007AFF',
    systemOrange: '#FF9500',
    systemYellow: '#FFCC00',
    systemTeal: '#5AC8FA',
    systemIndigo: '#5856D6',
    systemPurple: '#AF52DE',
    systemPink: '#FF2D55',
    systemGray: '#8E8E93',
    systemGray2: '#AEAEB2',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',
    // TANDER Brand
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
  },
  radius: {
    small: 8,
    medium: 10,
    large: 12,
    xlarge: 16,
  },
  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
    subhead: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
    caption1: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
    caption2: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },
  },
};

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
// REUSABLE COMPONENTS
// =============================================================================

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

interface ToggleRowProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  iconColor,
  label,
  subtitle,
  value,
  onValueChange,
  isLast = false,
}) => {
  const handleChange = useCallback(
    (newValue: boolean) => {
      onValueChange(newValue);
    },
    [onValueChange]
  );

  return (
    <View style={styles.row}>
      <View style={[styles.iconBadge, { backgroundColor: iconColor }]}>
        <Feather name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={[styles.rowContent, !isLast && styles.rowBorder]}>
        <View style={styles.rowTextContainer}>
          <Text style={styles.rowLabel}>{label}</Text>
          {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={handleChange}
          trackColor={{
            false: iOS.colors.systemGray4,
            true: iOS.colors.systemGreen,
          }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={iOS.colors.systemGray4}
          style={styles.switch}
          accessibilityLabel={label}
          accessibilityState={{ checked: value }}
        />
      </View>
    </View>
  );
};

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  label: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconColor,
  label,
  value,
  onPress,
  isLast = false,
}) => {
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${value ? `, currently ${value}` : ''}`}
    >
      <View style={[styles.iconBadge, { backgroundColor: iconColor }]}>
        <Feather name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={[styles.rowContent, !isLast && styles.rowBorder]}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowRight}>
          {value && <Text style={styles.rowValue}>{value}</Text>}
          <Feather name="chevron-right" size={20} color={iOS.colors.systemGray3} />
        </View>
      </View>
    </Pressable>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CallSettingsScreen: React.FC<CallSettingsScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

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
        console.warn('Failed to load call settings:', error);
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
      console.warn('Failed to save call settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  }, []);

  // Update a specific setting
  const updateSetting = useCallback(
    <K extends keyof CallSettings>(key: K, value: CallSettings[K]) => {
      setSettings((prev) => {
        const newSettings = { ...prev, [key]: value };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    [saveSettings]
  );

  // Handle DND time selection
  const handleDNDTimePress = useCallback(
    (type: 'start' | 'end') => {
      const currentValue =
        type === 'start' ? settings.doNotDisturbStart : settings.doNotDisturbEnd;
      Alert.alert(
        `Set ${type === 'start' ? 'Start' : 'End'} Time`,
        `Current: ${currentValue}\n\nTime picker would appear here in production.`,
        [{ text: 'OK' }]
      );
    },
    [settings]
  );

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

  const handleBack = useCallback(() => {
    onBack();
  }, [onBack]);

  // Loading State
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={iOS.colors.secondarySystemBackground}
        />
        <ActivityIndicator size="large" color={iOS.colors.tander.orange} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={iOS.colors.secondarySystemBackground}
        translucent={Platform.OS === 'android'}
      />

      {/* iOS-Style Navigation Bar */}
      <View style={[styles.navBar, (isTablet || isLandscape) && styles.navBarWide]}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={handleBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back to Settings"
        >
          <Feather name="chevron-left" size={28} color={iOS.colors.systemBlue} />
          <Text style={styles.backButtonText}>Settings</Text>
        </Pressable>
        <Text style={styles.navTitle} pointerEvents="none">Calls</Text>
        <View style={styles.navBarSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, iOS.spacing.xxl) },
          (isTablet || isLandscape) && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Audio Settings */}
        <SectionHeader title="Audio" />
        <Card>
          <ToggleRow
            icon="volume-2"
            iconColor={iOS.colors.tander.teal}
            label="Speaker for Voice Calls"
            subtitle="Use speaker by default"
            value={settings.defaultSpeakerVoice}
            onValueChange={(value) => updateSetting('defaultSpeakerVoice', value)}
          />
          <ToggleRow
            icon="speaker"
            iconColor={iOS.colors.tander.orange}
            label="Speaker for Video Calls"
            subtitle="Use speaker by default"
            value={settings.defaultSpeakerVideo}
            onValueChange={(value) => updateSetting('defaultSpeakerVideo', value)}
            isLast
          />
        </Card>

        {/* Video Settings */}
        <SectionHeader title="Video" />
        <Card>
          <ToggleRow
            icon="camera"
            iconColor={iOS.colors.systemPurple}
            label="Default Front Camera"
            subtitle="Use front camera when starting calls"
            value={settings.defaultFrontCamera}
            onValueChange={(value) => updateSetting('defaultFrontCamera', value)}
            isLast
          />
        </Card>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <Card>
          <ToggleRow
            icon="bell"
            iconColor={iOS.colors.systemRed}
            label="Call Notifications"
            subtitle="Receive notifications for incoming calls"
            value={settings.callNotificationsEnabled}
            onValueChange={(value) => updateSetting('callNotificationsEnabled', value)}
          />
          <ToggleRow
            icon="smartphone"
            iconColor={iOS.colors.systemGray}
            label="Vibration"
            subtitle="Vibrate on incoming calls"
            value={settings.vibrationEnabled}
            onValueChange={(value) => updateSetting('vibrationEnabled', value)}
            isLast
          />
        </Card>

        {/* Do Not Disturb */}
        <SectionHeader title="Do Not Disturb" />
        <Card>
          <ToggleRow
            icon="moon"
            iconColor={iOS.colors.systemIndigo}
            label="Do Not Disturb"
            subtitle="Silence calls during set hours"
            value={settings.doNotDisturbEnabled}
            onValueChange={(value) => updateSetting('doNotDisturbEnabled', value)}
            isLast={!settings.doNotDisturbEnabled}
          />
          {settings.doNotDisturbEnabled && (
            <>
              <SettingsRow
                icon="clock"
                iconColor={iOS.colors.systemGray}
                label="Start Time"
                value={settings.doNotDisturbStart}
                onPress={() => handleDNDTimePress('start')}
              />
              <SettingsRow
                icon="clock"
                iconColor={iOS.colors.systemGray}
                label="End Time"
                value={settings.doNotDisturbEnd}
                onPress={() => handleDNDTimePress('end')}
                isLast
              />
            </>
          )}
        </Card>

        {/* Reset Button */}
        <Pressable
          style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
          onPress={handleResetDefaults}
          accessibilityRole="button"
          accessibilityLabel="Reset to default settings"
        >
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </Pressable>

        {/* Developer Testing - Only in DEV mode */}
        {__DEV__ && Platform.OS === 'android' && (
          <>
            <SectionHeader title="Developer Testing" />
            <Card>
              <SettingsRow
                icon="activity"
                iconColor={iOS.colors.tander.teal}
                label="Run Diagnostics"
                onPress={() => {
                  console.log('[DEV] Running full diagnostics...');
                  runFullDiagnostics().then((report) => {
                    console.log('[DEV] Diagnostic Report:', JSON.stringify(report, null, 2));
                    Alert.alert(
                      'Diagnostic Report',
                      `Status: ${report.overallStatus}\n\nResults:\n${report.results
                        .map((r) => `${r.component}: ${r.status}`)
                        .join('\n')}\n\nRecommendations:\n${
                        report.recommendations.join('\n') || 'None'
                      }`,
                      [{ text: 'OK' }]
                    );
                  });
                }}
              />
              <SettingsRow
                icon="phone-incoming"
                iconColor={iOS.colors.tander.orange}
                label="Test Incoming Call"
                onPress={() => {
                  console.log('[DEV] Triggering test incoming call...');
                  testIncomingCall();
                  Alert.alert(
                    'Test Call Started',
                    'A test incoming call has been triggered. You should see the incoming call UI with ringtone and vibration.',
                    [{ text: 'OK' }]
                  );
                }}
                isLast
              />
            </Card>
          </>
        )}

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          {'Call settings are saved automatically and sync across your devices.'}
        </Text>
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
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
    marginTop: iOS.spacing.l,
  },

  // Navigation Bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  navBarWide: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: iOS.spacing.xs,
    marginLeft: -iOS.spacing.s,
    zIndex: 1,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    ...iOS.typography.body,
    color: iOS.colors.systemBlue,
    marginLeft: -iOS.spacing.xs,
  },
  navTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  navBarSpacer: {
    width: 100,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: iOS.spacing.l,
  },
  scrollContentWide: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },

  // Section Header
  sectionHeader: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    marginTop: iOS.spacing.xl,
    marginBottom: iOS.spacing.s,
    marginLeft: iOS.spacing.l,
    textTransform: 'uppercase',
  },

  // Card
  card: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: iOS.spacing.l,
    minHeight: 58,
    backgroundColor: iOS.colors.systemBackground,
  },
  rowPressed: {
    backgroundColor: iOS.colors.systemGray5,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    minHeight: 58,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },
  rowTextContainer: {
    flex: 1,
    marginRight: iOS.spacing.m,
  },
  rowLabel: {
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  rowSubtitle: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
    marginRight: iOS.spacing.xs,
  },

  // Icon Badge
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.m,
  },

  // Switch
  switch: {
    transform: Platform.OS === 'ios' ? [] : [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },

  // Reset Button
  resetButton: {
    alignItems: 'center',
    paddingVertical: iOS.spacing.l,
    marginTop: iOS.spacing.xl,
  },
  resetButtonPressed: {
    opacity: 0.6,
  },
  resetButtonText: {
    ...iOS.typography.body,
    color: iOS.colors.systemRed,
  },

  // Footer Note
  footerNote: {
    ...iOS.typography.footnote,
    color: iOS.colors.tertiaryLabel,
    textAlign: 'center',
    marginTop: iOS.spacing.l,
    marginHorizontal: iOS.spacing.xl,
  },
});

export default CallSettingsScreen;
