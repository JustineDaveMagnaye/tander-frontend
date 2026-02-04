/**
 * TANDER Show Me Settings Screen - iOS Premium Design
 * Select who to see in discovery feed
 *
 * Design: iOS Human Interface Guidelines
 * - Clean system background (#F2F2F7)
 * - iOS-style selection cards
 * - Uppercase section headers
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
  Alert,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getDiscoverySettings, updateShowMe } from '@/services/api/profileApi';

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

interface ShowMeScreenProps {
  onBack: () => void;
}

type ShowMeOption = 'everyone' | 'men' | 'women';

interface OptionConfig {
  key: ShowMeOption;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const OPTIONS: OptionConfig[] = [
  {
    key: 'everyone',
    title: 'Everyone',
    subtitle: 'Show me both men and women',
    icon: 'users',
    color: iOS.colors.tander.orange,
  },
  {
    key: 'men',
    title: 'Men',
    subtitle: 'Show me only men',
    icon: 'user',
    color: iOS.colors.systemBlue,
  },
  {
    key: 'women',
    title: 'Women',
    subtitle: 'Show me only women',
    icon: 'user',
    color: iOS.colors.systemPink,
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ShowMeScreen: React.FC<ShowMeScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [selectedOption, setSelectedOption] = useState<ShowMeOption>('everyone');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load discovery settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getDiscoverySettings();
        setSelectedOption(settings.showMe);
      } catch (err) {
        console.warn('Failed to load show me setting:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleOptionSelect = useCallback(
    async (option: ShowMeOption) => {
      if (option === selectedOption) return;

      const previousOption = selectedOption;
      setSelectedOption(option);
      setIsSaving(true);

      try {
        await updateShowMe(option);
      } catch (err) {
        console.warn('Failed to update show me setting:', err);
        setSelectedOption(previousOption);
        Alert.alert('Error', 'Failed to update preference. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [selectedOption]
  );

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
        <Text style={styles.loadingText}>Loading preferences...</Text>
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
        <Text style={styles.navTitle} pointerEvents="none">Show Me</Text>
        <View style={styles.navBarSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, iOS.spacing.xxl) },
          (isTablet || isLandscape) && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={styles.sectionHeader}>PREFERENCE</Text>
        <Text style={styles.description}>
          {'Select who you\'d like to see in your discovery feed.'}
        </Text>

        {/* Options Card */}
        <View style={styles.card}>
          {OPTIONS.map((option, index) => {
            const isSelected = selectedOption === option.key;
            const isLast = index === OPTIONS.length - 1;

            return (
              <Pressable
                key={option.key}
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && styles.optionRowPressed,
                  !isLast && styles.optionRowBorder,
                ]}
                onPress={() => handleOptionSelect(option.key)}
                disabled={isSaving}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${option.title}: ${option.subtitle}`}
              >
                {/* Icon Badge */}
                <View style={[styles.iconBadge, { backgroundColor: option.color }]}>
                  <Feather name={option.icon} size={18} color="#FFFFFF" />
                </View>

                {/* Text Content */}
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>

                {/* Selection Indicator */}
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && { borderColor: option.color },
                  ]}
                >
                  {isSelected && (
                    <View style={[styles.radioInner, { backgroundColor: option.color }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Info Card */}
        <Text style={styles.sectionHeader}>ABOUT THIS SETTING</Text>
        <View style={styles.infoCard}>
          <View style={[styles.infoIconBadge, { backgroundColor: iOS.colors.systemPurple }]}>
            <Feather name="heart" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Find Your Match</Text>
            <Text style={styles.infoDescription}>
              {'You can change this preference at any time. We\'ll show you profiles that match your selection.'}
            </Text>
          </View>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          {'Your preference is saved automatically and helps us show you relevant profiles.'}
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

  // Description
  description: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    marginBottom: iOS.spacing.l,
    marginHorizontal: iOS.spacing.l,
  },

  // Card
  card: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    overflow: 'hidden',
  },

  // Option Row
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: iOS.spacing.l,
    paddingRight: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    minHeight: 72,
    backgroundColor: iOS.colors.systemBackground,
  },
  optionRowPressed: {
    backgroundColor: iOS.colors.systemGray5,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },

  // Icon Badge
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.m,
  },

  // Option Content
  optionContent: {
    flex: 1,
    marginRight: iOS.spacing.m,
  },
  optionTitle: {
    ...iOS.typography.body,
    fontWeight: '500',
    color: iOS.colors.label,
    marginBottom: 2,
  },
  optionSubtitle: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
  },

  // Radio Button
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: iOS.colors.systemGray3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Info Card
  infoCard: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    padding: iOS.spacing.l,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.m,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
    marginBottom: iOS.spacing.xs,
  },
  infoDescription: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    lineHeight: 20,
  },

  // Footer Note
  footerNote: {
    ...iOS.typography.footnote,
    color: iOS.colors.tertiaryLabel,
    textAlign: 'center',
    marginTop: iOS.spacing.xl,
    marginHorizontal: iOS.spacing.xl,
  },
});

export default ShowMeScreen;
