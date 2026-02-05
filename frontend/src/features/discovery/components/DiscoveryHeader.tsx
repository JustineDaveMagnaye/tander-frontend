/**
 * TANDER Discovery Header Component
 * 100% Recoded following LoginScreen & ProfileScreen patterns
 *
 * Design Patterns:
 * - clamp() helper for responsive sizing
 * - useMemo for computed responsive values
 * - View-based icons using geometric shapes
 * - Design system colors and spacing
 *
 * Features:
 * - Gradient logo (design system primary)
 * - Clean action buttons with subtle shadows
 * - Responsive sizing for all devices
 */

import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, shadows } from '@shared/styles/spacing';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { useResponsive } from '@shared/hooks/useResponsive';

// ============================================================================
// RESPONSIVE HELPER - Clamps values for all screen sizes
// ============================================================================
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// ============================================================================
// TYPES
// ============================================================================
interface IconProps {
  size: number;
  color: string;
}

interface DiscoveryHeaderProps {
  onFilterPress?: () => void;
  onNotificationPress?: () => void;
  filterCount?: number;
}

// ============================================================================
// VIEW-BASED ICONS (matching ProfileScreen style)
// ============================================================================

// Bell Icon for Notifications
const BellIcon: React.FC<IconProps> = ({ size, color }) => {
  const bodyWidth = size * 0.6;
  const bodyHeight = size * 0.5;
  const borderW = clamp(size * 0.08, 2, 3);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Bell body */}
      <View style={{
        width: bodyWidth,
        height: bodyHeight,
        borderWidth: borderW,
        borderColor: color,
        borderTopLeftRadius: bodyWidth / 2,
        borderTopRightRadius: bodyWidth / 2,
        borderBottomLeftRadius: size * 0.08,
        borderBottomRightRadius: size * 0.08,
        marginTop: -size * 0.05,
      }} />
      {/* Bell clapper */}
      <View style={{
        width: size * 0.12,
        height: size * 0.12,
        borderRadius: size * 0.06,
        backgroundColor: color,
        marginTop: size * 0.02,
      }} />
      {/* Bell top handle */}
      <View style={{
        position: 'absolute',
        top: size * 0.12,
        width: size * 0.08,
        height: size * 0.12,
        backgroundColor: color,
        borderRadius: size * 0.04,
      }} />
    </View>
  );
};

// Gear Icon for Settings/Filters
const GearIcon: React.FC<IconProps> = ({ size, color }) => {
  const centerSize = size * 0.35;
  const toothSize = clamp(size * 0.12, 2, 6);
  const borderW = clamp(size * 0.08, 1.5, 3);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Center circle */}
      <View style={{
        width: centerSize,
        height: centerSize,
        borderRadius: centerSize / 2,
        borderWidth: borderW,
        borderColor: color,
      }} />
      {/* Gear teeth */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <View key={i} style={{
          position: 'absolute',
          width: toothSize,
          height: toothSize * 0.5,
          backgroundColor: color,
          borderRadius: toothSize * 0.15,
          transform: [{ rotate: `${angle}deg` }, { translateX: size * 0.3 }],
        }} />
      ))}
    </View>
  );
};

// ============================================================================
// DISCOVERY HEADER COMPONENT
// ============================================================================
export const DiscoveryHeader: React.FC<DiscoveryHeaderProps> = ({
  onFilterPress,
  onNotificationPress,
  filterCount = 0,
}) => {
  const { isLandscape, isTablet, hp, wp, width } = useResponsive();

  // ============================================================================
  // RESPONSIVE VALUES (using useMemo like ProfileScreen)
  // ============================================================================
  const sizes = useMemo(() => {
    const baseScale = Math.min(width / 375, 1.2);

    return {
      logo: clamp(
        isLandscape ? hp(8) : isTablet ? 48 * baseScale : 38 * baseScale,
        32,
        isLandscape ? 36 : isTablet ? 56 : 44
      ),
      title: clamp(
        isLandscape ? hp(5) : isTablet ? 28 * baseScale : 24 * baseScale,
        20,
        isLandscape ? 22 : isTablet ? 32 : 28
      ),
      button: clamp(
        isLandscape ? hp(9) : isTablet ? 56 * baseScale : 42 * baseScale,
        44,
        isLandscape ? 40 : isTablet ? 64 : 48
      ),
      badgeText: clamp(Math.round(10 * baseScale), 9, 12),
    };
  }, [width, isLandscape, isTablet, hp]);

  const iconSize = Math.round(sizes.button * 0.5);

  const headerPadding = useMemo(() => ({
    paddingHorizontal: isLandscape ? wp(2) : isTablet ? spacing.l : spacing.m,
    paddingVertical: isLandscape ? hp(0.5) : isTablet ? spacing.m : spacing.s,
  }), [isLandscape, isTablet, wp, hp]);

  return (
    <View style={[styles.container, headerPadding]}>
      {/* Logo section */}
      <View style={styles.logoSection}>
        <LinearGradient
          colors={colors.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.logoCircle,
            {
              width: sizes.logo,
              height: sizes.logo,
              borderRadius: sizes.logo / 2,
            },
          ]}
        >
          <Text style={[styles.logoText, { fontSize: sizes.logo * 0.5 }]} maxFontSizeMultiplier={FONT_SCALING.TITLE}>
            T
          </Text>
        </LinearGradient>

        <Text style={[styles.title, { fontSize: sizes.title }]} maxFontSizeMultiplier={FONT_SCALING.TITLE}>
          TANDER
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsSection}>
        {onNotificationPress && (
          <TouchableOpacity
            onPress={onNotificationPress}
            style={[
              styles.actionButton,
              {
                width: sizes.button,
                height: sizes.button,
                borderRadius: sizes.button / 2,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            activeOpacity={0.7}
          >
            <BellIcon size={iconSize} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
        )}

        {onFilterPress && (
          <TouchableOpacity
            onPress={onFilterPress}
            style={[
              styles.actionButton,
              {
                width: sizes.button,
                height: sizes.button,
                borderRadius: sizes.button / 2,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            activeOpacity={0.7}
          >
            <GearIcon size={iconSize} color={colors.neutral.textPrimary} />
            {filterCount > 0 && (
              <LinearGradient
                colors={colors.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.badge}
              >
                <Text style={[styles.badgeText, { fontSize: sizes.badgeText }]} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>
                  {filterCount}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral.border,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  logoCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  logoText: {
    color: colors.white,
    fontWeight: '700',
  },
  title: {
    color: colors.orange.primary,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    ...shadows.small,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    minHeight: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    paddingHorizontal: 4,
  },
  badgeText: {
    fontWeight: '700',
    color: colors.white,
  },
});

export default DiscoveryHeader;
