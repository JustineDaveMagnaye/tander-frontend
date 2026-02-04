/**
 * TANDER PremiumErrorState - Error State Component
 *
 * Displayed when there's an error loading matches.
 * Features:
 * - Friendly error message
 * - Offline detection
 * - Retry button
 * - Senior-friendly 56px+ touch targets
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';

interface PremiumErrorStateProps {
  isOffline: boolean;
  onRetry: () => void;
}

export const PremiumErrorState: React.FC<PremiumErrorStateProps> = ({
  isOffline,
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      {/* Emoji Icon */}
      <Text style={styles.emoji} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>{isOffline ? '📡' : '😔'}</Text>

      {/* Title */}
      <Text style={styles.title}>
        {isOffline ? 'No internet connection' : 'Something went wrong'}
      </Text>

      {/* Message */}
      <Text style={styles.message}>
        {isOffline
          ? 'Please check your internet connection and try again.'
          : 'We couldn\'t load your matches. Please try again.'}
      </Text>

      {/* Retry Button */}
      <TouchableOpacity
        onPress={onRetry}
        style={styles.retryButton}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>

      {/* Help Text */}
      <Text style={styles.helpText}>
        If this keeps happening, try closing and reopening the app.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
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
  retryButton: {
    backgroundColor: colors.orange[500],
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  retryText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  helpText: {
    fontSize: 14,
    color: colors.gray[400],
    textAlign: 'center',
  },
});

export default PremiumErrorState;
