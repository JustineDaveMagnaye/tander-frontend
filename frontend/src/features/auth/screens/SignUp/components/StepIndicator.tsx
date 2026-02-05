/**
 * StepIndicator Component
 * Shows progress through the signup flow
 * Following ForgotPassword pattern
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';
import { STEPS, A11Y_LABELS, STEP_LABELS, SignUpStep } from '../constants';

interface StepIndicatorProps {
  currentStep: SignUpStep;
  captionFontSize: number;
  isTablet: boolean;
}

export const StepIndicator = memo(function StepIndicator({
  currentStep,
  captionFontSize,
  isTablet,
}: StepIndicatorProps) {
  const currentStepIndex = STEPS.indexOf(currentStep);
  const currentStepNumber = currentStepIndex + 1;
  const totalSteps = STEPS.length;

  // Responsive sizing for dots and lines
  const dotSize = isTablet ? 16 : 12;
  const lineWidth = isTablet ? 40 : 28;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={A11Y_LABELS.steps.indicator(currentStepNumber, totalSteps)}
      accessibilityHint={A11Y_LABELS.steps.description(currentStep)}
      accessibilityValue={{
        min: 1,
        max: totalSteps,
        now: currentStepNumber,
        text: STEP_LABELS[currentStep],
      }}
    >
      <View style={styles.dotsContainer}>
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStepNumber;
          const isActive = stepNumber === currentStepNumber;

          return (
            <React.Fragment key={step}>
              <View
                style={[
                  styles.dot,
                  { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
                  isCompleted ? styles.dotCompleted : isActive ? styles.dotActive : styles.dotInactive,
                ]}
              >
                {isCompleted && (
                  <Text style={[styles.checkmark, { fontSize: dotSize * 0.6 }]}>
                    {'\u2713'}
                  </Text>
                )}
                {isActive && !isCompleted && <View style={styles.dotInner} />}
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.line,
                    { width: lineWidth },
                    stepNumber < currentStepNumber && styles.lineActive,
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
        Step {currentStepNumber} of {totalSteps}
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
  dotActive: {
    backgroundColor: colors.orange.primary,
  },
  dotCompleted: {
    backgroundColor: colors.teal.primary,
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
