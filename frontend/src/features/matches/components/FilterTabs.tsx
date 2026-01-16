/**
 * TANDER FilterTabs - PREMIUM REDESIGN
 * Modern, elegant filter pill system with smooth animations
 *
 * Design Inspiration: Bumble/Hinge premium filter chips
 *
 * Features:
 * - Smooth pill-style animated tabs
 * - Gradient active states with elegant transitions
 * - Badge counts with celebration animations
 * - Haptic feedback for premium feel
 * - Senior-friendly touch targets (56-64px)
 * - WCAG AA contrast compliance
 */

import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import type { FilterType } from '../types';
import type { MatchesFontSizes, MatchesSpacing } from '../hooks/useMatchesResponsive';

// Filter configuration with icons and colors - Orange/Teal Theme
const FILTER_CONFIG: Record<FilterType, {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  activeColors: readonly [string, string];
  badgeColor: string;
}> = {
  all: {
    icon: 'heart',
    label: 'All',
    activeColors: colors.gradient.ctaButton as unknown as [string, string], // Orange to Teal
    badgeColor: colors.white,
  },
  new: {
    icon: 'star',
    label: 'New',
    activeColors: colors.gradient.primaryButton as unknown as [string, string], // Orange gradient
    badgeColor: colors.white,
  },
  online: {
    icon: 'circle',
    label: 'Online',
    activeColors: [colors.teal[500], colors.teal[600]] as [string, string], // Teal gradient
    badgeColor: colors.white,
  },
};

interface FilterPillProps {
  filter: FilterType;
  count: number;
  isActive: boolean;
  onPress: () => void;
  fontSize: number;
  badgeFontSize: number;
  height: number;
  isCompact: boolean;
  isTablet: boolean;
  reduceMotion: boolean;
}

const FilterPill = React.memo<FilterPillProps>(
  ({
    filter,
    count,
    isActive,
    onPress,
    fontSize,
    badgeFontSize,
    height,
    isCompact,
    isTablet,
    reduceMotion,
  }) => {
    const config = FILTER_CONFIG[filter];
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const bgOpacityAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
    const iconRotateAnim = useRef(new Animated.Value(0)).current;

    // Animate active state changes
    useEffect(() => {
      if (reduceMotion) {
        bgOpacityAnim.setValue(isActive ? 1 : 0);
        return;
      }

      Animated.parallel([
        Animated.timing(bgOpacityAnim, {
          toValue: isActive ? 1 : 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        // Small icon rotation on activation
        isActive
          ? Animated.sequence([
              Animated.timing(iconRotateAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.timing(iconRotateAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
              }),
            ])
          : Animated.timing(iconRotateAnim, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
      ]).start();
    }, [isActive, bgOpacityAnim, iconRotateAnim, reduceMotion]);

    const handlePressIn = useCallback(() => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }).start();
    }, [scaleAnim, reduceMotion]);

    const handlePressOut = useCallback(() => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }).start();
    }, [scaleAnim, reduceMotion]);

    const handlePress = useCallback(async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics not available
      }
      onPress();
    }, [onPress]);

    // Ensure senior-friendly minimum touch target (56px)
    const pillHeight = Math.max(height, 56);
    const borderRadius = pillHeight / 2;

    // Calculate padding based on content
    const horizontalPadding = isCompact ? 16 : isTablet ? 24 : 20;

    // Font sizes with minimum for seniors
    const displayFontSize = Math.max(fontSize, 16);
    const displayBadgeFontSize = Math.max(badgeFontSize, 14);

    // Badge sizing
    const showBadge = count > 0;
    const badgeSize = Math.max(26, displayBadgeFontSize + 12);

    // Icon rotation interpolation
    const iconRotate = iconRotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '15deg'],
    });

    return (
      <Animated.View
        style={[
          styles.pillWrapper,
          {
            transform: [{ scale: scaleAnim }],
            flex: isCompact ? 0 : 1,
            minWidth: isCompact ? 90 : 100,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.pill,
            {
              height: pillHeight,
              paddingHorizontal: horizontalPadding,
              borderRadius,
            },
          ]}
          accessible
          accessibilityLabel={`${config.label} filter${count > 0 ? `, ${count} matches` : ''}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive }}
          accessibilityHint={`Double tap to ${isActive ? 'keep' : 'show'} ${config.label.toLowerCase()} matches`}
        >
          {/* Inactive Background */}
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.inactiveBg,
              { borderRadius },
            ]}
          />

          {/* Active Gradient Background */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: bgOpacityAnim, borderRadius },
            ]}
          >
            <LinearGradient
              colors={config.activeColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius }]}
            />
          </Animated.View>

          {/* Pill Content */}
          <View style={styles.pillContent}>
            {/* Icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : colors.gray[100],
                  transform: [{ rotate: iconRotate }],
                },
              ]}
            >
              <Feather
                name={config.icon}
                size={isCompact ? 14 : 16}
                color={isActive ? colors.white : colors.gray[600]}
              />
            </Animated.View>

            {/* Label */}
            <Text
              style={[
                styles.pillLabel,
                {
                  fontSize: displayFontSize,
                  color: isActive ? colors.white : colors.gray[700],
                  fontWeight: isActive ? '700' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {config.label}
            </Text>

            {/* Badge */}
            {showBadge && (
              <View
                style={[
                  styles.badge,
                  {
                    minWidth: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    backgroundColor: isActive ? 'rgba(255,255,255,0.95)' : config.activeColors[0],
                    paddingHorizontal: count > 99 ? 8 : 6,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      fontSize: displayBadgeFontSize,
                      color: isActive ? config.activeColors[0] : colors.white,
                    },
                  ]}
                >
                  {count > 999 ? '999+' : count}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

FilterPill.displayName = 'FilterPill';

interface FilterTabsProps {
  activeFilter: FilterType;
  counts: { all: number; new: number; online: number };
  onFilterPress: (filter: FilterType) => void;
  fontSizes: MatchesFontSizes;
  spacing: MatchesSpacing;
  filterTabHeight: number;
  isCompactMode: boolean;
  isVerySmallScreen: boolean;
  isTablet: boolean;
  reduceMotion: boolean;
  insets: { left: number; right: number };
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  activeFilter,
  counts,
  onFilterPress,
  fontSizes,
  spacing,
  filterTabHeight,
  isCompactMode,
  isVerySmallScreen,
  isTablet,
  reduceMotion,
  insets,
}) => {
  const filters: { key: FilterType; count: number }[] = [
    { key: 'all', count: counts.all },
    { key: 'new', count: counts.new },
    { key: 'online', count: counts.online },
  ];

  const containerPadding = Math.max(spacing.l, insets.left + spacing.m);
  const containerPaddingRight = Math.max(spacing.l, insets.right + spacing.m);

  // Horizontal scrollable for small screens and compact mode
  if (isVerySmallScreen || isCompactMode) {
    return (
      <View style={styles.scrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: containerPadding,
              paddingRight: containerPaddingRight,
              gap: spacing.filterTabGap,
            },
          ]}
          style={styles.scrollView}
        >
          {filters.map((filter) => (
            <FilterPill
              key={filter.key}
              filter={filter.key}
              count={filter.count}
              isActive={activeFilter === filter.key}
              onPress={() => onFilterPress(filter.key)}
              fontSize={isCompactMode ? fontSizes.caption : fontSizes.filterTab}
              badgeFontSize={fontSizes.badge}
              height={Math.max(filterTabHeight, 48)}
              isCompact
              isTablet={isTablet}
              reduceMotion={reduceMotion}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  // Full-width flex row for tablets and regular phones
  return (
    <View
      style={[
        styles.flexContainer,
        {
          paddingHorizontal: containerPadding,
          paddingRight: containerPaddingRight,
          gap: spacing.filterTabGap,
        },
      ]}
    >
      {filters.map((filter) => (
        <FilterPill
          key={filter.key}
          filter={filter.key}
          count={filter.count}
          isActive={activeFilter === filter.key}
          onPress={() => onFilterPress(filter.key)}
          fontSize={fontSizes.filterTab}
          badgeFontSize={fontSizes.badge}
          height={Math.max(filterTabHeight, 54)}
          isCompact={false}
          isTablet={isTablet}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Container styles
  scrollContainer: {
    marginBottom: 4,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  flexContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 4,
  },

  // Pill styles
  pillWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveBg: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillLabel: {
    letterSpacing: 0.2,
  },

  // Badge styles
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    fontWeight: '700',
    lineHeight: 16,
  },
});

export default FilterTabs;
