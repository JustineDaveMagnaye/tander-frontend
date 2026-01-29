/**
 * PasswordRequirements Component
 * Shows password validation requirements with visual feedback
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius } from '@shared/styles/spacing';
import { PasswordRequirements as PasswordRequirementsType } from '../types';

interface PasswordRequirementsProps {
  requirements: PasswordRequirementsType;
  captionFontSize: number;
}

interface RequirementItemProps {
  met: boolean;
  text: string;
  fontSize: number;
}

const RequirementItem = memo(function RequirementItem({
  met,
  text,
  fontSize,
}: RequirementItemProps) {
  return (
    <View style={styles.requirementRow}>
      <Text
        variant="caption"
        color={met ? colors.semantic.success : colors.neutral.textSecondary}
        style={{ fontSize }}
      >
        {met ? '✓' : '○'} {text}
      </Text>
    </View>
  );
});

export const PasswordRequirements = memo(function PasswordRequirements({
  requirements,
  captionFontSize,
}: PasswordRequirementsProps) {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="list"
      accessibilityLabel="Password requirements"
    >
      <Text
        variant="caption"
        color={colors.neutral.textSecondary}
        style={[styles.title, { fontSize: captionFontSize }]}
      >
        Your password must have:
      </Text>

      <RequirementItem
        met={requirements.hasMinLength}
        text="At least 8 characters"
        fontSize={captionFontSize}
      />

      <RequirementItem
        met={requirements.hasUppercase}
        text="One uppercase letter (A-Z)"
        fontSize={captionFontSize}
      />

      <RequirementItem
        met={requirements.hasNumber}
        text="One number (0-9)"
        fontSize={captionFontSize}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.background,
    padding: spacing.m,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.l,
    // Responsive padding ensures proper spacing on all devices
  },
  title: {
    marginBottom: spacing.xs,
    // Font size set dynamically via captionFontSize prop
  },
  requirementRow: {
    marginTop: spacing.xxs,
    // Adequate spacing between requirements for readability
    minHeight: 24,
    justifyContent: 'center',
  },
});
