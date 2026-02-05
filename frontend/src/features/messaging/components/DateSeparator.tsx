/**
 * DateSeparator Component
 * Shows date labels between message groups (Today, Yesterday, Monday, Jan 20)
 * Premium UI polish for better message timeline awareness
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';

interface DateSeparatorProps {
  date: Date;
}

/**
 * Format date into user-friendly label
 * - Today
 * - Yesterday
 * - This week: "Monday", "Tuesday", etc.
 * - Older: "Mon, Jan 20"
 */
const formatDateLabel = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDay.getTime() === today.getTime()) {
    return 'Today';
  }

  if (messageDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  // Within last week: show day name
  const diffDays = Math.floor((today.getTime() - messageDay.getTime()) / 86400000);
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Same year: "Mon, Jan 20"
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  // Different year: "Mon, Jan 20, 2024"
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const label = useMemo(() => formatDateLabel(date), [date]);

  return (
    <View style={styles.container} accessible={true} accessibilityLabel={`Messages from ${label}`}>
      <View style={styles.line} />
      <View style={styles.labelContainer}>
        <Text style={styles.label} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>{label}</Text>
      </View>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[200],
  },
  labelContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.gray[100],
    borderRadius: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[500],
    letterSpacing: 0.3,
  },
});

export default DateSeparator;
