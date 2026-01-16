/**
 * SuccessStep Component
 * Step 4: Password reset success confirmation
 */

import React, { memo, useEffect } from 'react';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';
import { PrimaryButton } from './PrimaryButton';
import { ResponsiveSizes } from '../types';
import { A11Y_LABELS, SUCCESS_MESSAGES } from '../constants';

interface SuccessStepProps {
  sizes: ResponsiveSizes;
  isTablet: boolean;
  isLandscape: boolean;
  reduceMotion: boolean;
  onSignIn: () => void;
}

export const SuccessStep = memo(function SuccessStep({
  sizes,
  isTablet,
  isLandscape,
  reduceMotion,
  onSignIn,
}: SuccessStepProps) {
  // Announce success to screen readers
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      'Password reset successful. You can now sign in with your new password.'
    );
  }, []);

  // Responsive sizing for title and icon
  const titleSize = isLandscape ? Math.min(sizes.titleSize, 22) : (isTablet ? 28 : 24);
  const iconSize = isTablet ? 120 : 100;
  const checkmarkSize = isTablet ? 56 : 48;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="alert"
      accessibilityLabel="Password reset successful"
    >
      {/* Success Icon - Responsive sizing */}
      <View style={[
        styles.iconContainer,
        {
          width: iconSize,
          height: iconSize,
          borderRadius: iconSize / 2,
        },
      ]}>
        <Text style={[styles.checkmark, { fontSize: checkmarkSize }]}>{'✓'}</Text>
      </View>

      {/* Title */}
      <Text
        variant="h3"
        color={colors.neutral.textPrimary}
        style={[styles.title, { fontSize: titleSize }]}
      >
        Password Reset!
      </Text>

      {/* Message */}
      <Text
        variant="body"
        color={colors.neutral.textSecondary}
        style={[
          styles.message,
          {
            fontSize: sizes.bodyFontSize,
            // G2-R-001: Responsive line height
            lineHeight: Math.round(sizes.bodyFontSize * 1.6),
          },
        ]}
      >
        {SUCCESS_MESSAGES.password_reset}
        {'\n'}You can now sign in with your new password.
      </Text>

      {/* Sign In Button */}
      <PrimaryButton
        title="Sign In Now"
        onPress={onSignIn}
        height={sizes.buttonHeight}
        fontSize={isLandscape ? Math.min(sizes.bodyFontSize, 15) : (isTablet ? 20 : 18)}
        reduceMotion={reduceMotion}
        accessibilityLabel={A11Y_LABELS.buttons.sign_in}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.l,
    // Ensures proper spacing on all devices
  },
  iconContainer: {
    // Width, height, and borderRadius are set dynamically based on isTablet
    // Tablets: 120x120px, Phones: 100x100px
    backgroundColor: colors.semantic.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  checkmark: {
    color: colors.white,
    fontWeight: '700',
    // Font size is set dynamically (tablets: 56px, phones: 48px)
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.m,
    fontWeight: '700',
    // Font size is set dynamically via titleSize calculation
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    // lineHeight is set dynamically based on font size (1.6x)
    // Provides comfortable reading experience on all devices
    paddingHorizontal: spacing.m,
  },
});
