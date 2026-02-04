/**
 * TANDER FilterTabs - ULTRA PREMIUM REDESIGN v2
 * Modern, elegant filter pill system with premium animations
 *
 * Design Inspiration: Bumble/Hinge/Tinder premium filter chips
 *
 * Features:
 * - Smooth pill-style animated tabs with depth
 * - Beautiful gradient active states
 * - Pulsing online indicator animation
 * - Badge counts with subtle glow effects
 * - Haptic feedback for premium feel
 * - Senior-friendly touch targets (56-64px)
 * - WCAG AA contrast compliance
 * - Consistent styling across all device sizes
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

// Filter configuration with icons and colors - Premium Orange/Teal Theme
const FILTER_CONFIG: Record<FilterType, {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  activeColors: readonly [string, string];
  inactiveIconColor: string;
  badgeActiveColor: string;
  badgeInactiveColors: readonly [string, string];
}> = {
  all: {
    icon: 'heart',
    label: 'All',
    activeColors: [colors.orange[500], colors.teal[500]] as [string, string], // Orange to Teal - consistent everywhere
    inactiveIconColor: colors.orange[400],
    badgeActiveColor: colors.orange[500],
    badgeInactiveColors: [colors.orange[500], colors.orange[600]] as [string, string],
  },
  new: {
    icon: 'zap',
    label: 'New',
    activeColors: [colors.orange[500], colors.orange[600]] as [string, string], // Orange gradient
    inactiveIconColor: colors.orange[400],
    badgeActiveColor: colors.orange[500],
    badgeInactiveColors: [colors.orange[500], colors.orange[600]] as [string, string],
  },
  online: {
    icon: 'wifi',
    label: 'Online',
    activeColors: [colors.teal[500], colors.teal[600]] as [string, string], // Teal gradient
    inactiveIconColor: colors.teal[500],
    badgeActiveColor: colors.teal[500],
    badgeInactiveColors: [colors.teal[500], colors.teal[600]] as [string, string],
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

// Pulsing Online Indicator Component
const PulsingDot: React.FC<{ isActive: boolean; reduceMotion: boolean; size: number }> = ({
  isActive,
  reduceMotion,
  size,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [reduceMotion, pulseAnim, opacityAnim]);

  const dotColor = isActive ? colors.white : colors.teal[500];
  const pulseColor = isActive ? 'rgba(255,255,255,0.4)' : colors.teal[300];

  return (
    <View style={[styles.pulsingDotContainer, { width: size, height: size }]}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: pulseColor,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      {/* Solid dot */}
      <View
        style={[
          styles.solidDot,
          {
            width: size * 0.6,
            height: size * 0.6,
            borderRadius: size * 0.3,
            backgroundColor: dotColor,
          },
        ]}
      />
    </View>
  );
};

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
    const iconBounceAnim = useRef(new Animated.Value(1)).current;
    const shadowAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

    // Animate active state changes
    useEffect(() => {
      if (reduceMotion) {
        bgOpacityAnim.setValue(isActive ? 1 : 0);
        shadowAnim.setValue(isActive ? 1 : 0);
        return;
      }

      Animated.parallel([
        Animated.timing(bgOpacityAnim, {
          toValue: isActive ? 1 : 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(shadowAnim, {
          toValue: isActive ? 1 : 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        // Bounce effect on activation
        isActive
          ? Animated.sequence([
              Animated.spring(iconBounceAnim, {
                toValue: 1.2,
                useNativeDriver: true,
                friction: 3,
                tension: 400,
              }),
              Animated.spring(iconBounceAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 5,
                tension: 300,
              }),
            ])
          : Animated.timing(iconBounceAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
      ]).start();
    }, [isActive, bgOpacityAnim, iconBounceAnim, shadowAnim, reduceMotion]);

    const handlePressIn = useCallback(() => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        friction: 8,
        tension: 400,
      }).start();
    }, [scaleAnim, reduceMotion]);

    const handlePressOut = useCallback(() => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
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

    // Ensure senior-friendly minimum touch target (56px for tablet, 48px for mobile)
    const pillHeight = Math.max(height, isTablet ? 56 : 48);
    const borderRadius = pillHeight / 2;

    // Calculate padding based on content - more compact on mobile
    const horizontalPadding = isCompact ? 12 : isTablet ? 24 : 14;

    // Font sizes with minimum for seniors
    const displayFontSize = Math.max(fontSize, isTablet ? 16 : 14);
    const displayBadgeFontSize = Math.max(badgeFontSize, 12);

    // Badge sizing - more compact and elegant
    const showBadge = count > 0;
    const badgeSize = Math.max(isTablet ? 24 : 22, displayBadgeFontSize + 8);

    // Icon size - appropriate for device
    const iconSize = isCompact ? 14 : isTablet ? 18 : 15;

    // Animated shadow for active state
    const animatedShadowOpacity = shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.15],
    });

    const animatedElevation = shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 6],
    });

    // Check if this is the online filter for special treatment
    const isOnlineFilter = filter === 'online';

    // Icon container size - compact on mobile
    const iconContainerSize = iconSize + (isTablet ? 14 : 10);

    return (
      <Animated.View
        style={[
          styles.pillWrapper,
          {
            transform: [{ scale: scaleAnim }],
            flex: isCompact ? 0 : 1,
            minWidth: isCompact ? 85 : isTablet ? 110 : 90,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.pillShadow,
            {
              borderRadius,
              shadowOpacity: animatedShadowOpacity,
              elevation: Platform.OS === 'android' ? animatedElevation : 0,
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
            {/* Inactive Background with subtle gradient */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius, overflow: 'hidden' },
              ]}
            >
              <LinearGradient
                colors={[colors.white, colors.gray[50]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.inactiveBorder,
                  { borderRadius },
                ]}
              />
            </View>

            {/* Active Gradient Background */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { opacity: bgOpacityAnim, borderRadius, overflow: 'hidden' },
              ]}
            >
              <LinearGradient
                colors={config.activeColors as unknown as string[]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Subtle inner glow */}
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'transparent', 'rgba(0,0,0,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* Pill Content */}
            <View style={styles.pillContent}>
              {/* Icon with animation */}
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isActive
                      ? 'rgba(255,255,255,0.25)'
                      : `${config.inactiveIconColor}15`,
                    width: iconContainerSize,
                    height: iconContainerSize,
                    borderRadius: iconContainerSize / 2,
                    transform: [{ scale: iconBounceAnim }],
                  },
                ]}
              >
                {isOnlineFilter ? (
                  <PulsingDot
                    isActive={isActive}
                    reduceMotion={reduceMotion}
                    size={iconSize - 2}
                  />
                ) : (
                  <Feather
                    name={config.icon}
                    size={iconSize}
                    color={isActive ? colors.white : config.inactiveIconColor}
                  />
                )}
              </Animated.View>

              {/* Label */}
              <Text
                style={[
                  styles.pillLabel,
                  {
                    fontSize: displayFontSize,
                    color: isActive ? colors.white : colors.gray[800],
                    fontWeight: isActive ? '700' : '600',
                    textShadowColor: isActive ? 'rgba(0,0,0,0.1)' : 'transparent',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: isActive ? 2 : 0,
                  },
                ]}
                numberOfLines={1}
              >
                {config.label}
              </Text>

              {/* Badge with gradient when inactive */}
              {showBadge && (
                <View
                  style={[
                    styles.badge,
                    {
                      minWidth: badgeSize,
                      height: badgeSize,
                      borderRadius: badgeSize / 2,
                      paddingHorizontal: count > 99 ? 7 : 5,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {isActive ? (
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          borderRadius: badgeSize / 2,
                        },
                      ]}
                    />
                  ) : (
                    <LinearGradient
                      colors={config.badgeInactiveColors as unknown as string[]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: badgeSize / 2 }]}
                    />
                  )}
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        fontSize: displayBadgeFontSize,
                        color: isActive ? config.badgeActiveColor : colors.white,
                        fontWeight: '700',
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
    marginBottom: 8,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  flexContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 6,
  },

  // Pill styles
  pillWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillShadow: {
    width: '100%',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  pill: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveBorder: {
    borderWidth: 1.5,
    borderColor: colors.gray[200],
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillLabel: {
    letterSpacing: 0.3,
  },

  // Pulsing dot styles
  pulsingDotContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
  },
  solidDot: {
    // Solid center dot
  },

  // Badge styles
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  badgeText: {
    fontWeight: '700',
    lineHeight: 15,
    textAlign: 'center',
  },
});

export default FilterTabs;
