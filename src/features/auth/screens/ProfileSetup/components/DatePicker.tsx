/**
 * DatePicker Component
 * Modern card-based date picker for senior-friendly birth date selection
 */

import React, { memo, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { MIN_AGE, MAX_AGE } from '../constants';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label: string;
  placeholder: string;
  hint?: string;
  height: number;
  fontSize: number;
  labelFontSize: number;
  captionFontSize: number;
  accessibilityLabel: string;
}

export const DatePicker = memo(function DatePicker({
  value,
  onChange,
  label,
  placeholder,
  hint,
  height,
  fontSize,
  labelFontSize,
  captionFontSize,
  accessibilityLabel,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Calculate date range based on age requirements
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate());
  const minDate = new Date(today.getFullYear() - MAX_AGE, today.getMonth(), today.getDate());

  // Default to a reasonable age for seniors (65 years old)
  const defaultDate = new Date(today.getFullYear() - 65, today.getMonth(), today.getDate());

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPicker(true);
  }, []);

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowPicker(false);
      }

      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [onChange]
  );

  const handleConfirm = useCallback(() => {
    setShowPicker(false);
  }, []);

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const hasValue = value !== null;

  return (
    <View style={styles.cardContainer}>
      {/* Card Header with Icon and Label */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, hasValue && styles.iconContainerActive]}>
          <Feather
            name="calendar"
            size={20}
            color={hasValue ? colors.orange.primary : colors.gray[400]}
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
            <Text
              variant="caption"
              color={colors.gray[400]}
              style={{ fontSize: captionFontSize - 1 }}
            >
              {hint}
            </Text>
          )}
        </View>
        {/* Age Badge */}
        {value && (
          <View style={styles.ageBadge}>
            <Text variant="caption" color={colors.white} style={styles.ageText}>
              {calculateAge(value)} yrs
            </Text>
          </View>
        )}
      </View>

      {/* Date Selector Button */}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.dateButton,
          { minHeight: height },
          hasValue && styles.dateButtonActive,
          pressed && styles.dateButtonPressed,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to open date picker"
      >
        <Text
          variant="body"
          color={hasValue ? colors.neutral.textPrimary : colors.gray[400]}
          style={[styles.dateText, { fontSize }]}
        >
          {value ? formatDate(value) : placeholder}
        </Text>
        <Feather
          name="chevron-right"
          size={22}
          color={hasValue ? colors.orange.primary : colors.gray[400]}
        />
      </Pressable>

      {/* Date Picker Modal for iOS */}
      {Platform.OS === 'ios' && showPicker && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleConfirm}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text variant="h3" color={colors.neutral.textPrimary}>
                    Select Birth Date
                  </Text>
                  <Text variant="caption" color={colors.gray[500]} style={styles.modalSubtitle}>
                    You must be {MIN_AGE}+ years old
                  </Text>
                </View>
                <Pressable
                  onPress={handleConfirm}
                  style={styles.doneButton}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <Text variant="body" color={colors.white} style={styles.doneText}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={value || defaultDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={maxDate}
                minimumDate={minDate}
                textColor={colors.neutral.textPrimary}
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker for Android */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={value || defaultDate}
          mode="date"
          display="spinner"
          onChange={handleChange}
          maximumDate={maxDate}
          minimumDate={minDate}
        />
      )}
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
    marginBottom: spacing.s,
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
    marginBottom: 2,
  },
  ageBadge: {
    backgroundColor: colors.orange.primary,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.large,
  },
  ageText: {
    fontWeight: '700',
    fontSize: 13,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.m,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateButtonActive: {
    borderColor: colors.orange[200],
    backgroundColor: colors.orange[50],
  },
  dateButtonPressed: {
    backgroundColor: colors.orange[100],
  },
  dateText: {
    fontWeight: '500',
    flex: 1,
    paddingVertical: spacing.m,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xlarge,
    borderTopRightRadius: borderRadius.xlarge,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalSubtitle: {
    marginTop: 4,
  },
  doneButton: {
    backgroundColor: colors.orange.primary,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
  },
  doneText: {
    fontWeight: '600',
    fontSize: 16,
  },
  picker: {
    height: 200,
  },
});
