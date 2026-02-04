/**
 * CountryCodePrefix Component
 * Shows +63 country code for Philippine phone numbers
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';

interface CountryCodePrefixProps {
  fontSize: number;
}

export const CountryCodePrefix = memo(function CountryCodePrefix({
  fontSize,
}: CountryCodePrefixProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { fontSize }]}>+63</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingLeft: spacing.m,
    paddingRight: spacing.s,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.neutral.border,
    height: '60%',
    marginRight: spacing.s,
  },
  text: {
    color: colors.neutral.textPrimary,
    fontWeight: '600',
  },
});
