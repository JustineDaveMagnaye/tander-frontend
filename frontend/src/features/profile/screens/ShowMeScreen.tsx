/**
 * TANDER Show Me Settings Screen
 * Select who to see in discovery feed
 *
 * Features:
 * - Gender preference selection (Everyone, Men, Women)
 * - Visual selection cards
 * - Info box about changing preferences
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import { getDiscoverySettings, updateShowMe } from '@/services/api/profileApi';

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
  activeColor: string;
  activeBg: string;
  activeBorder: string;
  activeIconBg: string;
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
    activeColor: colors.orange[700],  // Using 700 as max shade
    activeBg: colors.orange[50],
    activeBorder: colors.orange[500],
    activeIconBg: colors.orange[100],
  },
  {
    key: 'men',
    title: 'Men',
    subtitle: 'Show me only men',
    icon: 'user',
    activeColor: colors.teal[700],  // Using 700 as max shade
    activeBg: colors.teal[50],
    activeBorder: colors.teal[500],
    activeIconBg: colors.teal[100],
  },
  {
    key: 'women',
    title: 'Women',
    subtitle: 'Show me only women',
    icon: 'user',
    activeColor: colors.pink[700],  // Using 700 as max shade
    activeBg: colors.pink[50],
    activeBorder: colors.pink[500],
    activeIconBg: colors.pink[100],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ShowMeScreen: React.FC<ShowMeScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useResponsive();

  const [selectedOption, setSelectedOption] = useState<ShowMeOption>('everyone');

  // Load discovery settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getDiscoverySettings();
        setSelectedOption(settings.showMe);
      } catch (err) {
        console.warn('Failed to load show me setting:', err);
        // Keep default on error
      }
    };
    loadSettings();
  }, []);

  const handleOptionSelect = useCallback(async (option: ShowMeOption) => {
    const previousOption = selectedOption;
    setSelectedOption(option); // Optimistic update
    try {
      await updateShowMe(option);
    } catch (err) {
      console.warn('Failed to update show me setting:', err);
      setSelectedOption(previousOption); // Revert on error
      Alert.alert('Error', 'Failed to update preference. Please try again.');
    }
  }, [selectedOption]);

  const getOptionStyle = (option: OptionConfig, isSelected: boolean) => {
    if (isSelected) {
      return {
        borderColor: option.activeBorder,
        backgroundColor: option.activeBg,
      };
    }
    return {
      borderColor: colors.gray[200],
      backgroundColor: colors.white,
    };
  };

  const getIconBgColor = (option: OptionConfig, isSelected: boolean) => {
    if (isSelected) {
      return option.activeIconBg;
    }
    return colors.gray[100];
  };

  const getIconColor = (option: OptionConfig, isSelected: boolean) => {
    if (isSelected) {
      return option.activeBorder;
    }
    return colors.gray[500];
  };

  const getTextColor = (option: OptionConfig, isSelected: boolean) => {
    if (isSelected) {
      return option.activeColor;
    }
    return colors.gray[900];
  };

  const getSubtitleColor = (option: OptionConfig, isSelected: boolean) => {
    if (isSelected) {
      // Use a lighter version of the active color
      if (option.key === 'everyone') return colors.orange[700];
      if (option.key === 'men') return colors.teal[700];
      if (option.key === 'women') return colors.pink[700];
    }
    return colors.gray[500];
  };

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
          Show Me
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
        {/* Description */}
        <Text style={styles.description}>
          Select who you'd like to see in your discovery feed
        </Text>

        {/* Options */}
        {OPTIONS.map((option) => {
          const isSelected = selectedOption === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.optionCard, getOptionStyle(option, isSelected)]}
              onPress={() => handleOptionSelect(option.key)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.title}
            >
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.optionIconContainer,
                    { backgroundColor: getIconBgColor(option, isSelected) },
                  ]}
                >
                  <Feather
                    name={option.icon}
                    size={32}
                    color={getIconColor(option, isSelected)}
                  />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: getTextColor(option, isSelected) },
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={[
                      styles.optionSubtitle,
                      { color: getSubtitleColor(option, isSelected) },
                    ]}
                  >
                    {option.subtitle}
                  </Text>
                </View>
                {isSelected && (
                  <View
                    style={[
                      styles.checkmark,
                      { backgroundColor: option.activeBorder },
                    ]}
                  >
                    <Feather name="check" size={16} color={colors.white} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconContainer}>
            <Feather name="heart" size={24} color="#9333EA" />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Find Your Match</Text>
            <Text style={styles.infoDescription}>
              You can change this preference at any time. We'll show you profiles
              that match your selection.
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
    paddingTop: spacing.m,
    paddingHorizontal: spacing.s,
  },

  // Description
  description: {
    fontSize: 18,
    color: colors.gray[600],
    marginBottom: spacing.l,
    paddingHorizontal: spacing.xs,
  },

  // Option Card
  optionCard: {
    borderWidth: 2,
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginBottom: spacing.s,
    ...shadows.small,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 16,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: borderRadius.large,
    padding: spacing.m,
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
    color: '#581C87',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 16,
    color: '#7E22CE',
    lineHeight: 24,
  },
});

export default ShowMeScreen;
