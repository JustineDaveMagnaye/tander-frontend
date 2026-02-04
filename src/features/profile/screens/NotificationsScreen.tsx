/**
 * TANDER Notifications Settings Screen
 * Premium iOS-style notification preferences
 *
 * Features:
 * - iOS Human Interface Guidelines design
 * - Push notification toggles (matches, messages, likes, etc.)
 * - Sound and vibration settings
 * - Email notification toggle
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
  getNotificationSettings,
  updateSingleNotificationSetting,
  NotificationSettings as ApiNotificationSettings,
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

interface NotificationsScreenProps {
  onBack: () => void;
}

interface NotificationSettings {
  newMatches: boolean;
  messages: boolean;
  likes: boolean;
  superLikes: boolean;
  tandyReminders: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
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

interface SimpleToggleRowProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showSeparator?: boolean;
  trackColor?: string;
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  iconColor,
  iconBgColor,
  label,
  subtitle,
  value,
  onValueChange,
  showSeparator = true,
  trackColor = iOS.colors.tander.orange,
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

const SimpleToggleRow: React.FC<SimpleToggleRowProps> = ({
  label,
  subtitle,
  value,
  onValueChange,
  showSeparator = true,
  trackColor = iOS.colors.tander.orange,
}) => {
  const handleToggle = useCallback((newValue: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(newValue);
  }, [onValueChange]);

  return (
    <Pressable
      style={({ pressed }) => [
        iosStyles.simpleToggleRow,
        pressed && iosStyles.rowPressed,
      ]}
      onPress={() => handleToggle(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${label}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <View style={iosStyles.simpleToggleContent}>
        <View style={iosStyles.simpleToggleTextContainer}>
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
      {showSeparator && <View style={iosStyles.simpleRowSeparator} />}
    </Pressable>
  );
};

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={iosStyles.card}>{children}</View>
);

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <View style={iosStyles.sectionHeader}>
    <Text style={iosStyles.sectionTitle}>{title.toUpperCase()}</Text>
    {subtitle && <Text style={iosStyles.sectionSubtitle}>{subtitle}</Text>}
  </View>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet } = useResponsive();

  const [settings, setSettings] = useState<NotificationSettings>({
    newMatches: true,
    messages: true,
    likes: true,
    superLikes: false,
    tandyReminders: true,
    emailNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  // Load notification settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const apiSettings = await getNotificationSettings();
        setSettings({
          newMatches: apiSettings.newMatches,
          messages: apiSettings.messages,
          likes: apiSettings.likes,
          superLikes: apiSettings.superLikes,
          tandyReminders: apiSettings.tandyReminders,
          emailNotifications: apiSettings.emailNotifications,
          soundEnabled: apiSettings.soundEnabled,
          vibrationEnabled: apiSettings.vibrationEnabled,
        });
      } catch (err) {
        console.warn('Failed to load notification settings:', err);
      }
    };
    loadSettings();
  }, []);

  const toggleSetting = useCallback(async (key: keyof NotificationSettings) => {
    const newValue = !settings[key];
    // Optimistic update
    setSettings((prev) => ({ ...prev, [key]: newValue }));
    try {
      await updateSingleNotificationSetting(key as keyof ApiNotificationSettings, newValue);
    } catch (err) {
      console.warn(`Failed to update ${key}:`, err);
      // Revert on error
      setSettings((prev) => ({ ...prev, [key]: !newValue }));
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
          Notifications
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
        {/* Push Notifications Section */}
        <SectionHeader
          title="Push Notifications"
          subtitle="Manage what notifications you receive"
        />
        <Card>
          <ToggleRow
            icon="heart"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.systemPink}
            label="New Matches"
            subtitle="When someone matches with you"
            value={settings.newMatches}
            onValueChange={() => toggleSetting('newMatches')}
          />
          <ToggleRow
            icon="message-circle"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.tander.teal}
            label="Messages"
            subtitle="New messages from matches"
            value={settings.messages}
            onValueChange={() => toggleSetting('messages')}
            trackColor={iOS.colors.tander.teal}
          />
          <ToggleRow
            icon="heart"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.tander.orange}
            label="Likes"
            subtitle="When someone likes you"
            value={settings.likes}
            onValueChange={() => toggleSetting('likes')}
          />
          <ToggleRow
            icon="star"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.systemPurple}
            label="Super Likes"
            subtitle="When someone super likes you"
            value={settings.superLikes}
            onValueChange={() => toggleSetting('superLikes')}
            trackColor={iOS.colors.systemPurple}
          />
          <ToggleRow
            icon="bell"
            iconColor="#FFFFFF"
            iconBgColor={iOS.colors.systemBlue}
            label="Tandy Reminders"
            subtitle="Daily wellness check-ins"
            value={settings.tandyReminders}
            onValueChange={() => toggleSetting('tandyReminders')}
            trackColor={iOS.colors.systemBlue}
            showSeparator={false}
          />
        </Card>

        {/* Sound & Vibration Section */}
        <SectionHeader title="Sound & Vibration" />
        <Card>
          <SimpleToggleRow
            label="Sound"
            subtitle="Play sound for notifications"
            value={settings.soundEnabled}
            onValueChange={() => toggleSetting('soundEnabled')}
          />
          <SimpleToggleRow
            label="Vibration"
            subtitle="Vibrate for notifications"
            value={settings.vibrationEnabled}
            onValueChange={() => toggleSetting('vibrationEnabled')}
            trackColor={iOS.colors.tander.teal}
            showSeparator={false}
          />
        </Card>

        {/* Email Section */}
        <SectionHeader title="Email" />
        <Card>
          <SimpleToggleRow
            label="Email Notifications"
            subtitle="Receive updates via email"
            value={settings.emailNotifications}
            onValueChange={() => toggleSetting('emailNotifications')}
            showSeparator={false}
          />
        </Card>

        {/* Footer Info */}
        <View style={iosStyles.footer}>
          <Text style={iosStyles.footerText}>
            Manage your notification preferences to stay updated on what matters most to you.
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

  // Toggle Row with Icon
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
    marginLeft: 62, // iconBadge width + margins
  },
  rowPressed: {
    backgroundColor: iOS.colors.systemGray5,
  },

  // Simple Toggle Row (no icon)
  simpleToggleRow: {
    backgroundColor: iOS.colors.systemBackground,
  },
  simpleToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    minHeight: 56,
  },
  simpleToggleTextContainer: {
    flex: 1,
    marginRight: iOS.spacing.m,
  },
  simpleRowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: iOS.colors.separator,
    marginLeft: iOS.spacing.l,
  },

  // Footer
  footer: {
    paddingHorizontal: iOS.spacing.l,
    paddingTop: iOS.spacing.xl,
    paddingBottom: iOS.spacing.xxl,
  },
  footerText: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default NotificationsScreen;
