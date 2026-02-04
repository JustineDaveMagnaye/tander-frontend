/**
 * StepIndicator Component
 * Shows onboarding progress for ProfileSetup
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';
import { STEP_CONFIG } from '../constants';

interface StepIndicatorProps {
  captionFontSize: number;
  isTablet: boolean;
}

export const StepIndicator = memo(function StepIndicator({
  captionFontSize,
  isTablet,
}: StepIndicatorProps) {
  const dotSize = isTablet ? 16 : 12;
  const lineWidth = isTablet ? 40 : 28;
  const { current, total, label } = STEP_CONFIG;
  const steps = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}: ${label}`}
      accessibilityValue={{ min: 1, max: total, now: current }}
    >
      <View style={styles.dotsContainer}>
        {steps.map((stepNumber, index) => {
          const isCompleted = stepNumber < current;
          const isActive = stepNumber === current;

          return (
            <React.Fragment key={stepNumber}>
              <View
                style={[
                  styles.dot,
                  { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
                  isCompleted ? styles.dotCompleted : isActive ? styles.dotActive : styles.dotInactive,
                ]}
              >
                {isCompleted && (
                  <Text style={[styles.checkmark, { fontSize: dotSize * 0.6 }]}>{'\u2713'}</Text>
                )}
                {isActive && !isCompleted && <View style={styles.dotInner} />}
              </View>

              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.line,
                    { width: lineWidth },
                    stepNumber < current && styles.lineActive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <Text
        variant="caption"
        color={colors.neutral.textSecondary}
        style={[styles.stepText, { fontSize: captionFontSize }]}
      >
        Step {current} of {total}: {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.l,
    paddingVertical: spacing.xs,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  dot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotCompleted: {
    backgroundColor: colors.teal.primary,
  },
  dotActive: {
    backgroundColor: colors.orange.primary,
  },
  dotInactive: {
    backgroundColor: colors.neutral.border,
  },
  dotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  checkmark: {
    color: colors.white,
    fontWeight: '700',
  },
  line: {
    height: 3,
    backgroundColor: colors.neutral.border,
    marginHorizontal: spacing.xxs,
    borderRadius: 1.5,
  },
  lineActive: {
    backgroundColor: colors.orange.primary,
  },
  stepText: {
    marginTop: spacing.xs,
  },
});
