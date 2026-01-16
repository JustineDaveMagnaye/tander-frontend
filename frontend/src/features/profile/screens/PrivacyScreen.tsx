/**
 * TANDER Privacy Settings Screen
 * Control profile visibility and privacy settings
 *
 * Features:
 * - Profile visibility toggles (age, distance, active status)
 * - Chat privacy (read receipts)
 * - Advanced privacy (incognito mode, location sharing)
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
  getPrivacySettings,
  updatePrivacySettings,
  PrivacySettings as ApiPrivacySettings,
} from '@/services/api/profileApi';

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

interface PrivacyToggleProps {
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

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  value,
  onValueChange,
  showBorder = true,
  trackColor = colors.teal[500],
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

// =============================================================================
// MAIN COMPONENT
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

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useResponsive();

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
          incognitoMode: !apiSettings.showInSearch, // Inverted: incognito = NOT show in search
          shareLocation: apiSettings.locationEnabled,
        });
      } catch (err) {
        console.error('Failed to load privacy settings:', err);
        // Keep defaults on error
      }
    };
    loadSettings();
  }, []);

  const toggleSetting = useCallback(async (key: keyof PrivacySettings) => {
    const newValue = !settings[key];
    // Optimistic update
    setSettings((prev) => ({ ...prev, [key]: newValue }));

    try {
      const apiKey = fieldMapping[key];
      // For incognitoMode, invert the value when sending to API
      const apiValue = key === 'incognitoMode' ? !newValue : newValue;
      await updatePrivacySettings({ [apiKey]: apiValue });
    } catch (err) {
      console.error(`Failed to update ${key}:`, err);
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
          Privacy
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
        {/* Profile Visibility Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Visibility</Text>
            <Text style={styles.sectionSubtitle}>Control what others can see</Text>
          </View>

          <PrivacyToggle
            icon="eye"
            iconColor="#9333EA"
            iconBgColor="#F3E8FF"
            title="Show Age"
            subtitle="Display your age on profile"
            value={settings.showAge}
            onValueChange={() => toggleSetting('showAge')}
          />

          <PrivacyToggle
            icon="map-pin"
            iconColor="#3B82F6"
            iconBgColor="#DBEAFE"
            title="Show Distance"
            subtitle="Display distance from you"
            value={settings.showDistance}
            onValueChange={() => toggleSetting('showDistance')}
          />

          <PrivacyToggle
            icon="users"
            iconColor="#22C55E"
            iconBgColor="#DCFCE7"
            title="Show Active Status"
            subtitle="Let others know you're online"
            value={settings.showActiveStatus}
            onValueChange={() => toggleSetting('showActiveStatus')}
            showBorder={false}
            trackColor="#22C55E"
          />
        </View>

        {/* Chat Privacy Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Chat Privacy</Text>
          </View>

          <PrivacyToggle
            icon="eye"
            iconColor={colors.teal[500]}
            iconBgColor={colors.teal[100]}
            title="Read Receipts"
            subtitle="Let people know you've read their messages"
            value={settings.showReadReceipts}
            onValueChange={() => toggleSetting('showReadReceipts')}
            showBorder={false}
          />
        </View>

        {/* Advanced Privacy Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Advanced Privacy</Text>
          </View>

          <PrivacyToggle
            icon="eye-off"
            iconColor={colors.gray[600]}
            iconBgColor={colors.gray[100]}
            title="Incognito Mode"
            subtitle="Browse profiles privately"
            value={settings.incognitoMode}
            onValueChange={() => toggleSetting('incognitoMode')}
            trackColor={colors.gray[600]}
          />

          <PrivacyToggle
            icon="map-pin"
            iconColor={colors.orange[500]}
            iconBgColor={colors.orange[100]}
            title="Share Location"
            subtitle="Allow location sharing for matches"
            value={settings.shareLocation}
            onValueChange={() => toggleSetting('shareLocation')}
            showBorder={false}
            trackColor={colors.orange[500]}
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconContainer}>
            <Feather name="shield" size={24} color="#3B82F6" />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Your Privacy Matters</Text>
            <Text style={styles.infoDescription}>
              We take your privacy seriously. You have full control over what
              information you share with others.
            </Text>
          </View>
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

  // Toggle Item
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

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 16,
    color: '#1D4ED8',
    lineHeight: 24,
  },
});

export default PrivacyScreen;
