/**
 * PasswordStrengthIndicator Component
 * Visual feedback for password strength to help seniors create secure passwords
 *
 * Features:
 * - Color-coded strength levels (weak, fair, good, strong)
 * - Clear textual guidance
 * - High contrast for visibility
 * - Accessible descriptions
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius } from '@shared/styles/spacing';

interface PasswordStrengthIndicatorProps {
  password: string;
  fontSize?: number;
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthResult {
  level: StrengthLevel;
  score: number;
  label: string;
  color: string;
  tips: string[];
}

const getPasswordStrength = (password: string): StrengthResult => {
  if (!password) {
    return {
      level: 'weak',
      score: 0,
      label: '',
      color: colors.gray[300],
      tips: [],
    };
  }

  let score = 0;
  const tips: string[] = [];

  // Length checks
  if (password.length >= 8) score += 1;
  else tips.push('Use at least 8 characters');

  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else tips.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else tips.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else tips.push('Add numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else tips.push('Add special characters (!@#$%)');

  // Determine level based on score
  let level: StrengthLevel;
  let label: string;
  let color: string;

  if (score <= 2) {
    level = 'weak';
    label = 'Weak';
    color = colors.semantic.error;
  } else if (score <= 3) {
    level = 'fair';
    label = 'Fair';
    color = colors.semantic.warning;
  } else if (score <= 4) {
    level = 'good';
    label = 'Good';
    color = colors.teal.primary;
  } else {
    level = 'strong';
    label = 'Strong';
    color = colors.semantic.success;
  }

  return {
    level,
    score,
    label,
    color,
    tips: tips.slice(0, 2), // Show max 2 tips
  };
};

export const PasswordStrengthIndicator = memo(function PasswordStrengthIndicator({
  password,
  fontSize = 14,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) {
    return null;
  }

  const barWidthPercentage = Math.min(100, (strength.score / 6) * 100);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Password strength: ${strength.label}`}
      accessibilityHint={strength.tips.length > 0 ? `Tips: ${strength.tips.join(', ')}` : 'Your password is strong'}
    >
      {/* Strength bar */}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View
            style={[
              styles.barFill,
              {
                width: `${barWidthPercentage}%`,
                backgroundColor: strength.color,
              },
            ]}
          />
        </View>
        {strength.label && (
          <Text
            variant="caption"
            style={[styles.label, { fontSize, color: strength.color }]}
          >
            {strength.label}
          </Text>
        )}
      </View>

      {/* Tips for improvement */}
      {strength.tips.length > 0 && (
        <View style={styles.tipsContainer}>
          {strength.tips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <Text style={styles.tipBullet}>-</Text>
              <Text
                variant="caption"
                color={colors.neutral.textSecondary}
                style={[styles.tipText, { fontSize: fontSize - 1 }]}
              >
                {tip}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: -spacing.xs,
    marginBottom: spacing.m,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  barBackground: {
    flex: 1,
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontWeight: '700',
    minWidth: 50,
  },
  tipsContainer: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xxs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: 2,
  },
  tipBullet: {
    color: colors.neutral.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    lineHeight: 18,
  },
});
