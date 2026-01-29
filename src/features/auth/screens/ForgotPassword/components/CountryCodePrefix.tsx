/**
 * CountryCodePrefix Component
 * Phone input prefix showing +63 country code
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
      <Text
        variant="body"
        color={colors.neutral.textPrimary}
        style={[styles.text, { fontSize }]}
      >
        +63
      </Text>
      <View style={styles.divider} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.m,
    paddingRight: spacing.s,
    height: '100%',
    backgroundColor: colors.neutral.surface,
  },
  text: {
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: '50%',
    backgroundColor: colors.neutral.border,
    marginLeft: spacing.s,
  },
});
