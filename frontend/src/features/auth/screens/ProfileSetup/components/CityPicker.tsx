/**
 * CityPicker Component
 * Modern card-based searchable city picker for senior-friendly UI
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { PHILIPPINE_CITIES } from '../constants';

interface CityPickerProps {
  value: string;
  onChange: (city: string) => void;
  label: string;
  placeholder: string;
  hint?: string;
  height: number;
  fontSize: number;
  labelFontSize: number;
  captionFontSize: number;
  accessibilityLabel: string;
}

export const CityPicker = memo(function CityPicker({
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
}: CityPickerProps) {
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) {
      return PHILIPPINE_CITIES;
    }
    const query = searchQuery.toLowerCase().trim();
    return PHILIPPINE_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        city.province.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Find selected city's province
  const selectedCityData = useMemo(() => {
    return PHILIPPINE_CITIES.find((city) => city.name === value);
  }, [value]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPicker(true);
    setSearchQuery('');
  }, []);

  const handleSelect = useCallback(
    (city: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onChange(city);
      setShowPicker(false);
    },
    [onChange]
  );

  const handleClose = useCallback(() => {
    setShowPicker(false);
  }, []);

  const renderCityItem = useCallback(
    ({ item }: { item: { name: string; province: string } }) => (
      <Pressable
        onPress={() => handleSelect(item.name)}
        style={({ pressed }) => [
          styles.cityItem,
          value === item.name && styles.cityItemSelected,
          pressed && styles.cityItemPressed,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityState={{ selected: value === item.name }}
        accessibilityLabel={`${item.name}, ${item.province}`}
      >
        <View style={styles.cityInfo}>
          <Text
            variant="body"
            color={value === item.name ? colors.orange.primary : colors.neutral.textPrimary}
            style={styles.cityName}
          >
            {item.name}
          </Text>
          <Text variant="caption" color={colors.gray[500]}>
            {item.province}
          </Text>
        </View>
        {value === item.name && (
          <View style={styles.checkCircle}>
            <Feather name="check" size={16} color={colors.white} />
          </View>
        )}
      </Pressable>
    ),
    [value, handleSelect]
  );

  const keyExtractor = useCallback(
    (item: { name: string; province: string }) => `${item.name}-${item.province}`,
    []
  );

  const hasValue = value !== '';

  return (
    <View style={styles.cardContainer}>
      {/* Card Header with Icon and Label */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, hasValue && styles.iconContainerActive]}>
          <Feather
            name="map-pin"
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
        {/* Province Badge */}
        {selectedCityData && (
          <View style={styles.provinceBadge}>
            <Text variant="caption" color={colors.teal[600]} style={styles.provinceText}>
              {selectedCityData.province}
            </Text>
          </View>
        )}
      </View>

      {/* City Selector Button */}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.cityButton,
          { minHeight: height },
          hasValue && styles.cityButtonActive,
          pressed && styles.cityButtonPressed,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to open city picker"
      >
        <Text
          variant="body"
          color={hasValue ? colors.neutral.textPrimary : colors.gray[400]}
          style={[styles.cityText, { fontSize }]}
        >
          {value || placeholder}
        </Text>
        <Feather
          name="chevron-right"
          size={22}
          color={hasValue ? colors.orange.primary : colors.gray[400]}
        />
      </Pressable>

      {/* City Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalContainer, { paddingTop: insets.top }]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text variant="h3" color={colors.neutral.textPrimary}>
                Select Your City
              </Text>
              <Text variant="caption" color={colors.gray[500]} style={styles.modalSubtitle}>
                Choose where you live in the Philippines
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={styles.closeButton}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={24} color={colors.neutral.textPrimary} />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Feather
              name="search"
              size={20}
              color={colors.gray[400]}
              style={styles.searchIcon}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search city or province..."
              placeholderTextColor={colors.gray[400]}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              maxFontSizeMultiplier={FONT_SCALING.INPUT}
              accessible
              accessibilityLabel="Search cities"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Feather name="x-circle" size={18} color={colors.gray[400]} />
              </Pressable>
            )}
          </View>

          {/* Results Count */}
          <View style={styles.resultsHeader}>
            <Text variant="caption" color={colors.gray[500]}>
              {filteredCities.length} {filteredCities.length === 1 ? 'city' : 'cities'} found
            </Text>
          </View>

          {/* City List */}
          <FlatList
            data={filteredCities}
            renderItem={renderCityItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + spacing.l },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Feather name="map" size={48} color={colors.gray[300]} />
                </View>
                <Text
                  variant="body"
                  color={colors.neutral.textSecondary}
                  style={styles.emptyText}
                >
                  No cities found
                </Text>
                <Text variant="caption" color={colors.gray[400]}>
                  Try a different search term
                </Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </Modal>
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
  provinceBadge: {
    backgroundColor: colors.teal[50],
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.large,
  },
  provinceText: {
    fontWeight: '600',
    fontSize: 12,
  },
  cityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.m,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cityButtonActive: {
    borderColor: colors.orange[200],
    backgroundColor: colors.orange[50],
  },
  cityButtonPressed: {
    backgroundColor: colors.orange[100],
  },
  cityText: {
    fontWeight: '500',
    flex: 1,
    paddingVertical: spacing.m,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalSubtitle: {
    marginTop: 4,
  },
  closeButton: {
    padding: spacing.xs,
    backgroundColor: colors.gray[100],
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.large,
    marginHorizontal: spacing.l,
    marginVertical: spacing.m,
    paddingHorizontal: spacing.m,
    height: 56,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  searchIcon: {
    marginRight: spacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: colors.neutral.textPrimary,
    paddingVertical: spacing.s,
  },
  clearButton: {
    padding: spacing.xs,
  },
  resultsHeader: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.s,
  },
  listContent: {
    paddingHorizontal: spacing.l,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.xs,
    minHeight: 64,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cityItemSelected: {
    backgroundColor: colors.orange[50],
    borderColor: colors.orange[200],
  },
  cityItemPressed: {
    backgroundColor: colors.gray[100],
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontWeight: '600',
    marginBottom: 2,
    fontSize: 16,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.orange.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  emptyText: {
    marginBottom: spacing.xs,
  },
});
