/**
 * TANDER PremiumFilterChips - Modern Filter Chip Component
 *
 * Features:
 * - Horizontal scrolling filter chips
 * - Gradient active states (Orange to Teal)
 * - Count badges
 * - Haptic feedback
 * - Senior-friendly 48px+ touch targets
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import type { FilterType } from '../types';

interface FilterChipsProps {
  activeFilter: FilterType;
  counts: { all: number; new: number; online: number };
  onSelect: (filter: FilterType) => void;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'online', label: 'Online' },
];

export const PremiumFilterChips: React.FC<FilterChipsProps> = ({
  activeFilter,
  counts,
  onSelect,
}) => {
  const handlePress = useCallback(async (filter: FilterType) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }
    onSelect(filter);
  }, [onSelect]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        bounces={false}
      >
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          const count = counts[filter.key];

          return (
            <TouchableOpacity
              key={filter.key}
              onPress={() => handlePress(filter.key)}
              activeOpacity={0.8}
              style={styles.chipTouchable}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${filter.label} filter, ${count} matches`}
            >
              {isActive ? (
                <LinearGradient
                  colors={[colors.orange[500], colors.teal[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.chipActive}
                >
                  <Text style={styles.chipTextActive}>{filter.label}</Text>
                  {count > 0 && (
                    <View style={styles.countBadgeActive}>
                      <Text style={styles.countTextActive}>{count}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View style={styles.chipInactive}>
                  <Text style={styles.chipTextInactive}>{filter.label}</Text>
                  {count > 0 && (
                    <View style={styles.countBadgeInactive}>
                      <Text style={styles.countTextInactive}>{count}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    flexDirection: 'row',
  },
  chipTouchable: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  chipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
    gap: 8,
    borderRadius: 24,
  },
  chipTextActive: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  chipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 48,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: 24,
    gap: 8,
  },
  chipTextInactive: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[700],
  },
  countBadgeInactive: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countTextInactive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[600],
  },
});

export default PremiumFilterChips;
