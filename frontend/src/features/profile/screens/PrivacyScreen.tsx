/**
 * TANDER Privacy Settings Screen
 * Premium iOS-style privacy controls
 *
 * Features:
 * - iOS Human Interface Guidelines design
 * - Profile visibility toggles (age, distance, active status)
 * - Chat privacy (read receipts)
 * - Advanced privacy (incognito mode, location sharing)
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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useResponsive } from '@shared/hooks/useResponsive';
import {
  getPrivacySettings,
  updatePrivacySettings,
  PrivacySettings as ApiPrivacySettings,
} from '@/services/api/profileApi';
import { toast } from '@/store/toastStore';

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

interface PrivacyScreenProps {
  onBack: () => void;
}

interface PrivacySettings {
  showAge: boolean;
  showDistance: boolean;
  showActiveStatus: boolean;
  showReadReceipts: boolean;
  incognitoMode: boolean;
  shareLocation: boolean;
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
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Map frontend keys to backend API keys
const fieldMapping: Record<keyof PrivacySettings, keyof ApiPrivacySettings> = {
  showAge: 'profileVisible',
  showDistance: 'showApproximateDistance',
  showActiveStatus: 'showOnlineStatus',
  showReadReceipts: 'showReadReceipts',
  incognitoMode: 'showInSearch', // Note: inverted logic
  shareLocation: 'locationEnabled',
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={iosStyles.card}>{children}</View>
);

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <View style={iosStyles.sectionHeader}>
    <Text style={iosStyles.sectionTitle}>{title.toUpperCase()}</Text>
    {subtitle && <Text style={iosStyles.sectionSubtitle}>{subtitle}</Text>}
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
}) => {
  const handleToggle = useCallback((newValue: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(newValue);
  }, [onValueChange]);

  return (
    <Pressable
      style={({ pressed }) => [
        iosStyles.toggleRow,
        pressed && iosStyles.rowPressed,
      ]}
      onPress={() => handleToggle(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${label}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <View style={iosStyles.toggleRowContent}>
        <View style={[iosStyles.iconBadge, { backgroundColor: iconBgColor }]}>
          <Feather name={icon} size={18} color={iconColor} />
        </View>
        <View style={iosStyles.toggleTextContainer}>
          <Text style={iosStyles.toggleLabel}>{label}</Text>
          {subtitle && <Text style={iosStyles.toggleSubtitle}>{subtitle}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={handleToggle}
          trackColor={{ false: iOS.colors.systemGray4, true: trackColor }}
          thumbColor={iOS.colors.systemBackground}
          ios_backgroundColor={iOS.colors.systemGray4}
          style={iosStyles.switch}
        />
      </View>
      {showSeparator && <View style={iosStyles.rowSeparator} />}
    </Pressable>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet } = useResponsive();

  const [settings, setSettings] = useState<PrivacySettings>({
    showAge: true,
    showDistance: true,
    showActiveStatus: true,
    showReadReceipts: true,
    incognitoMode: false,
    shareLocation: true,
  });

  // Load privacy settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const apiSettings = await getPrivacySettings();
        setSettings({
          showAge: apiSettings.profileVisible,
          showDistance: apiSettings.showApproximateDistance,
          showActiveStatus: apiSettings.showOnlineStatus,
          showReadReceipts: apiSettings.showReadReceipts,
          incognitoMode: !apiSettings.showInSearch,
          shareLocation: apiSettings.locationEnabled,
        });
      } catch (err) {
        console.warn('Failed to load privacy settings:', err);
        toast.error(
          'Unable to Load Privacy Settings',
          'Please check your internet connection and try again.'
        );
      }
    };
    loadSettings();
  }, []);

  const toggleSetting = useCallback(async (key: keyof PrivacySettings) => {
    const newValue = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newValue }));

    try {
      const apiKey = fieldMapping[key];
      const apiValue = key === 'incognitoMode' ? !newValue : newValue;
      await updatePrivacySettings({ [apiKey]: apiValue });
    } catch (err) {
      console.warn(`Failed to update ${key}:`, err);
      setSettings((prev) => ({ ...prev, [key]: !newValue }));
      toast.error(
        'Unable to Update Setting',
        'Please check your internet connection and try again.'
      );
    }
  }, [settings]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

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
          Privacy
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
        {/* Profile Visibility Section */}
        <SectionHeader
          title="Profile Visibility"
          subtitle="Control what others can see"
        />
        <Card>
          <ToggleRow
            icon="eye"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.systemPurple}
            label="Show Age"
            subtitle="Display your age on profile"
            value={settings.showAge}
            onValueChange={() => toggleSetting('showAge')}
            trackColor={iOS.colors.systemPurple}
          />
          <ToggleRow
            icon="map-pin"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.systemBlue}
            label="Show Distance"
            subtitle="Display distance from you"
            value={settings.showDistance}
            onValueChange={() => toggleSetting('showDistance')}
            trackColor={iOS.colors.systemBlue}
          />
          <ToggleRow
            icon="activity"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.systemGreen}
            label="Show Active Status"
            subtitle="Let others know you're online"
            value={settings.showActiveStatus}
            onValueChange={() => toggleSetting('showActiveStatus')}
            trackColor={iOS.colors.systemGreen}
            showSeparator={false}
          />
        </Card>

        {/* Chat Privacy Section */}
        <SectionHeader title="Chat Privacy" />
        <Card>
          <ToggleRow
            icon="check-circle"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.tander.teal}
            label="Read Receipts"
            subtitle="Let people know you've read their messages"
            value={settings.showReadReceipts}
            onValueChange={() => toggleSetting('showReadReceipts')}
            trackColor={iOS.colors.tander.teal}
            showSeparator={false}
          />
        </Card>

        {/* Advanced Privacy Section */}
        <SectionHeader title="Advanced Privacy" />
        <Card>
          <ToggleRow
            icon="eye-off"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.systemGray}
            label="Incognito Mode"
            subtitle="Browse profiles privately"
            value={settings.incognitoMode}
            onValueChange={() => toggleSetting('incognitoMode')}
            trackColor={iOS.colors.systemGray}
          />
          <ToggleRow
            icon="navigation"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.tander.orange}
            label="Share Location"
            subtitle="Allow location sharing for matches"
            value={settings.shareLocation}
            onValueChange={() => toggleSetting('shareLocation')}
            trackColor={iOS.colors.tander.orange}
            showSeparator={false}
          />
        </Card>

        {/* Info Box */}
        <View style={iosStyles.infoBox}>
          <View style={[iosStyles.infoIconBadge, { backgroundColor: iOS.colors.systemBlue }]}>
            <Feather name="shield" size={18} color="#FFFFFF" />
          </View>
          <View style={iosStyles.infoTextContainer}>
            <Text style={iosStyles.infoTitle}>Your Privacy Matters</Text>
            <Text style={iosStyles.infoDescription}>
              We take your privacy seriously. You have full control over what information you share with others.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={iosStyles.footer}>
          <Text style={iosStyles.footerText}>
            Privacy settings are synced across all your devices.
          </Text>
        </View>
      </ScrollView>
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
  sectionSubtitle: {
    ...iOS.typography.footnote,
    color: iOS.colors.tertiaryLabel,
    marginTop: iOS.spacing.xs,
  },

  // Card
  card: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    overflow: 'hidden',
  },

  // Toggle Row
  toggleRow: {
    backgroundColor: iOS.colors.systemBackground,
  },
  toggleRowContent: {
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
  toggleTextContainer: {
    flex: 1,
    marginRight: iOS.spacing.m,
  },
  toggleLabel: {
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  toggleSubtitle: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    marginTop: 2,
  },
  switch: {
    transform: Platform.OS === 'ios' ? [] : [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: iOS.colors.separator,
    marginLeft: 62,
  },
  rowPressed: {
    backgroundColor: iOS.colors.systemGray5,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF5FF',
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
    color: iOS.colors.systemBlue,
    marginBottom: iOS.spacing.xs,
  },
  infoDescription: {
    ...iOS.typography.subhead,
    color: '#1D4ED8',
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
    lineHeight: 18,
  },
});

export default PrivacyScreen;
