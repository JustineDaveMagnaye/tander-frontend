/**
 * TANDER Notifications Settings Screen
 * Manage notification preferences for the app
 *
 * Features:
 * - Push notification toggles (matches, messages, likes, etc.)
 * - Sound and vibration settings
 * - Email notification toggle
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import {
  getNotificationSettings,
  updateSingleNotificationSetting,
  NotificationSettings as ApiNotificationSettings,
} from '@/services/api/profileApi';

// =============================================================================
// TYPES
// =============================================================================

interface NotificationsScreenProps {
  onBack: () => void;
}

interface NotificationToggleProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showBorder?: boolean;
  trackColor?: string;
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

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  value,
  onValueChange,
  showBorder = true,
  trackColor = colors.orange[500],
}) => (
  <TouchableOpacity
    style={[styles.toggleItem, showBorder && styles.toggleItemBorder]}
    onPress={() => onValueChange(!value)}
    activeOpacity={0.7}
    accessibilityRole="switch"
    accessibilityState={{ checked: value }}
  >
    <View style={styles.toggleLeft}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Feather name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.gray[200], true: trackColor }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.gray[200]}
    />
  </TouchableOpacity>
);

const SimpleToggle: React.FC<{
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showBorder?: boolean;
  trackColor?: string;
}> = ({ title, subtitle, value, onValueChange, showBorder = true, trackColor = colors.orange[500] }) => (
  <TouchableOpacity
    style={[styles.simpleToggleItem, showBorder && styles.toggleItemBorder]}
    onPress={() => onValueChange(!value)}
    activeOpacity={0.7}
    accessibilityRole="switch"
    accessibilityState={{ checked: value }}
  >
    <View style={styles.simpleToggleText}>
      <Text style={styles.toggleTitle}>{title}</Text>
      <Text style={styles.toggleSubtitle}>{subtitle}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.gray[200], true: trackColor }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.gray[200]}
    />
  </TouchableOpacity>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useResponsive();

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
        // Keep defaults on error
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
          Notifications
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
        {/* Push Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Push Notifications</Text>
            <Text style={styles.sectionSubtitle}>Manage what notifications you receive</Text>
          </View>

          <NotificationToggle
            icon="heart"
            iconColor={colors.pink[500]}
            iconBgColor={colors.pink[100]}
            title="New Matches"
            subtitle="When someone matches with you"
            value={settings.newMatches}
            onValueChange={() => toggleSetting('newMatches')}
          />

          <NotificationToggle
            icon="message-circle"
            iconColor={colors.teal[500]}
            iconBgColor={colors.teal[100]}
            title="Messages"
            subtitle="New messages from matches"
            value={settings.messages}
            onValueChange={() => toggleSetting('messages')}
            trackColor={colors.teal[500]}
          />

          <NotificationToggle
            icon="heart"
            iconColor={colors.orange[500]}
            iconBgColor={colors.orange[100]}
            title="Likes"
            subtitle="When someone likes you"
            value={settings.likes}
            onValueChange={() => toggleSetting('likes')}
          />

          <NotificationToggle
            icon="star"
            iconColor="#9333EA"
            iconBgColor="#F3E8FF"
            title="Super Likes"
            subtitle="When someone super likes you"
            value={settings.superLikes}
            onValueChange={() => toggleSetting('superLikes')}
            trackColor="#9333EA"
          />

          <NotificationToggle
            icon="bell"
            iconColor="#3B82F6"
            iconBgColor="#DBEAFE"
            title="Tandy Reminders"
            subtitle="Daily wellness check-ins"
            value={settings.tandyReminders}
            onValueChange={() => toggleSetting('tandyReminders')}
            trackColor="#3B82F6"
            showBorder={false}
          />
        </View>

        {/* Notification Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notification Settings</Text>
          </View>

          <SimpleToggle
            title="Sound"
            subtitle="Play sound for notifications"
            value={settings.soundEnabled}
            onValueChange={() => toggleSetting('soundEnabled')}
          />

          <SimpleToggle
            title="Vibration"
            subtitle="Vibrate for notifications"
            value={settings.vibrationEnabled}
            onValueChange={() => toggleSetting('vibrationEnabled')}
            showBorder={false}
            trackColor={colors.teal[500]}
          />
        </View>

        {/* Email Notifications Section */}
        <View style={styles.section}>
          <SimpleToggle
            title="Email Notifications"
            subtitle="Receive updates via email"
            value={settings.emailNotifications}
            onValueChange={() => toggleSetting('emailNotifications')}
            showBorder={false}
          />
        </View>
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
  sectionSubtitle: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 4,
  },

  // Toggle Item with Icon
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
  },
  toggleItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  toggleLeft: {
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
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 16,
    color: colors.gray[500],
  },

  // Simple Toggle (no icon)
  simpleToggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
  },
  simpleToggleText: {
    flex: 1,
  },
});

export default NotificationsScreen;
