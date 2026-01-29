/**
 * TANDER PremiumEmptyState - Empty State Component
 *
 * Displayed when there are no matches to show.
 * Features:
 * - Beautiful illustration
 * - Contextual messaging based on filter
 * - CTA button to discover
 * - Senior-friendly 56px+ touch targets
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import type { FilterType } from '../types';

interface PremiumEmptyStateProps {
  activeFilter: FilterType;
  onDiscoverPress: () => void;
}

export const PremiumEmptyState: React.FC<PremiumEmptyStateProps> = ({
  activeFilter,
  onDiscoverPress,
}) => {
  const getTitle = () => {
    switch (activeFilter) {
      case 'new':
        return 'No new matches';
      case 'online':
        return 'No one online';
      default:
        return 'No matches yet';
    }
  };

  const getMessage = () => {
    switch (activeFilter) {
      case 'new':
        return 'No new matches yet.\nKeep discovering to find your match!';
      case 'online':
        return 'No matches online right now.\nCheck back later!';
      default:
        return 'Start discovering amazing people near you.\nYour perfect match is waiting!';
    }
  };

  const getEmoji = () => {
    switch (activeFilter) {
      case 'new':
        return '✨';
      case 'online':
        return '🌙';
      default:
        return '💫';
    }
  };

  return (
    <View style={styles.container}>
      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        <LinearGradient
          colors={[colors.romantic.blush, colors.white]}
          style={styles.illustrationBg}
        >
          <Text style={styles.emoji}>{getEmoji()}</Text>
        </LinearGradient>
      </View>

      {/* Text Content */}
      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.message}>{getMessage()}</Text>

      {/* CTA Button */}
      <TouchableOpacity
        onPress={onDiscoverPress}
        activeOpacity={0.8}
        style={styles.ctaButton}
        accessibilityRole="button"
        accessibilityLabel="Start discovering matches"
      >
        <LinearGradient
          colors={[colors.orange[500], colors.orange[600]]}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>Start Discovering</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Tips to get more matches:</Text>
        <View style={styles.tip}>
          <Text style={styles.tipBullet}>1.</Text>
          <Text style={styles.tipText}>Add more photos to your profile</Text>
        </View>
        <View style={styles.tip}>
          <Text style={styles.tipBullet}>2.</Text>
          <Text style={styles.tipText}>Write an interesting bio</Text>
        </View>
        <View style={styles.tip}>
          <Text style={styles.tipBullet}>3.</Text>
          <Text style={styles.tipText}>Be active and swipe daily</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  illustrationContainer: {
    marginBottom: 24,
  },
  illustrationBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  ctaButton: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 40,
  },
  ctaGradient: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  tipsContainer: {
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 12,
  },
  tip: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: colors.orange[500],
    fontWeight: '600',
    marginRight: 8,
    width: 20,
  },
  tipText: {
    fontSize: 14,
    color: colors.gray[600],
    flex: 1,
  },
});

export default PremiumEmptyState;
