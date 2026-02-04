/**
 * ChipSelector Component
 * Modern card-based chip selection with icons for senior-friendly UI
 */

import React, { memo, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';

interface ChipSelectorProps {
  label: string;
  options: readonly string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  labelFontSize: number;
  chipPaddingH: number;
  chipPaddingV: number;
  accessibilityLabel: string;
  icon?: keyof typeof Feather.glyphMap;
  hint?: string;
}

// Icon mapping for common options
const OPTION_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  'Male': 'user',
  'Female': 'user',
  'Men': 'users',
  'Women': 'users',
  'Both': 'heart',
};

export const ChipSelector = memo(function ChipSelector({
  label,
  options,
  selectedValue,
  onSelect,
  labelFontSize,
  chipPaddingH,
  chipPaddingV,
  accessibilityLabel,
  icon = 'heart',
  hint,
}: ChipSelectorProps) {
  const handleSelect = useCallback(
    (option: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(option);
    },
    [onSelect]
  );

  const hasSelection = selectedValue !== '';

  return (
    <View style={styles.cardContainer}>
      {/* Card Header with Icon and Label */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, hasSelection && styles.iconContainerActive]}>
          <Feather
            name={icon}
            size={20}
            color={hasSelection ? colors.orange.primary : colors.gray[400]}
          />
        </View>
        <View style={styles.labelContainer}>
          <Text
            variant="bodySmall"
            color={colors.neutral.textPrimary}
            style={[styles.label, { fontSize: labelFontSize }]}
          >
            {label}
          </Text>
          {hint && (
            <Text variant="caption" color={colors.gray[400]} style={styles.hint}>
              {hint}
            </Text>
          )}
        </View>
      </View>

      {/* Chip Options */}
      <View
        style={styles.chipRow}
        accessible
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
      >
        {options.map((option) => {
          const isSelected = selectedValue === option;
          const optionIcon = OPTION_ICONS[option];

          return (
            <Pressable
              key={option}
              onPress={() => handleSelect(option)}
              style={({ pressed }) => [
                styles.chip,
                { paddingHorizontal: chipPaddingH, paddingVertical: chipPaddingV },
                isSelected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
              accessible
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option}
            >
              {optionIcon && (
                <Feather
                  name={optionIcon}
                  size={18}
                  color={isSelected ? colors.white : colors.gray[500]}
                  style={styles.chipIcon}
                />
              )}
              <Text
                variant="body"
                color={isSelected ? colors.white : colors.neutral.textPrimary}
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
              >
                {option}
              </Text>
              {isSelected && (
                <View style={styles.checkContainer}>
                  <Feather name="check" size={16} color={colors.white} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  iconContainerActive: {
    backgroundColor: colors.orange[50],
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontWeight: '600',
  },
  hint: {
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xlarge,
    backgroundColor: colors.gray[50],
    borderWidth: 2,
    borderColor: colors.gray[200],
    minWidth: 100,
    gap: spacing.xs,
  },
  chipSelected: {
    backgroundColor: colors.orange.primary,
    borderColor: colors.orange.primary,
  },
  chipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  chipIcon: {
    marginRight: 2,
  },
  chipText: {
    fontWeight: '500',
  },
  chipTextSelected: {
    fontWeight: '600',
  },
  checkContainer: {
    marginLeft: spacing.xs,
  },
});
