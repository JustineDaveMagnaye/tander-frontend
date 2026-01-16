/**
 * TANDER Empty Matches State Component
 * Clean, modern design with vector icons (no emojis)
 *
 * Design System Compliance (design_system2.md):
 * - Clean vector icons (no emojis in UI elements)
 * - Uses orange/teal gradient for visual appeal
 * - Large, readable text (18px+ for seniors)
 * - Clear CTA button following design_system2.md
 * - Responsive sizing for all devices
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

// ============================================================================
// CLEAN VECTOR ICON COMPONENTS (Following ProfileScreen pattern)
// ============================================================================
interface IconProps {
  size: number;
  color: string;
}

const HeartIcon: React.FC<IconProps> = ({ size, color }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.55, height: size * 0.55, backgroundColor: color,
      transform: [{ rotate: '-45deg' }], borderRadius: size * 0.1,
      marginTop: size * 0.08,
    }}>
      <View style={{
        position: 'absolute', width: size * 0.55, height: size * 0.275,
        backgroundColor: color, borderTopLeftRadius: size * 0.275, borderTopRightRadius: size * 0.275,
        top: -size * 0.14, left: 0,
      }} />
      <View style={{
        position: 'absolute', width: size * 0.275, height: size * 0.55,
        backgroundColor: color, borderTopLeftRadius: size * 0.275, borderBottomLeftRadius: size * 0.275,
        top: 0, left: -size * 0.14,
      }} />
    </View>
  </View>
);

const SparkleIcon: React.FC<IconProps> = ({ size, color }) => {
  const starSize = size * 0.6;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: starSize * 0.25, height: starSize,
        backgroundColor: color, borderRadius: starSize * 0.125,
      }} />
      <View style={{
        position: 'absolute',
        width: starSize, height: starSize * 0.25,
        backgroundColor: color, borderRadius: starSize * 0.125,
      }} />
      <View style={{
        position: 'absolute',
        width: starSize * 0.18, height: starSize * 0.7,
        backgroundColor: color, borderRadius: starSize * 0.09,
        transform: [{ rotate: '45deg' }],
      }} />
      <View style={{
        position: 'absolute',
        width: starSize * 0.18, height: starSize * 0.7,
        backgroundColor: color, borderRadius: starSize * 0.09,
        transform: [{ rotate: '-45deg' }],
      }} />
    </View>
  );
};

const SearchIcon: React.FC<IconProps> = ({ size, color }) => {
  const strokeWidth = Math.max(2, size * 0.12);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.55, height: size * 0.55, borderRadius: size * 0.275,
        borderWidth: strokeWidth, borderColor: color,
        marginRight: size * 0.1, marginTop: -size * 0.05,
      }} />
      <View style={{
        position: 'absolute',
        width: size * 0.25, height: strokeWidth,
        backgroundColor: color, borderRadius: strokeWidth / 2,
        transform: [{ rotate: '45deg' }],
        bottom: size * 0.15, right: size * 0.12,
      }} />
    </View>
  );
};

const CheckCircleIcon: React.FC<IconProps> = ({ size, color }) => {
  const strokeWidth = Math.max(2, size * 0.12);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.7, height: size * 0.7, borderRadius: size * 0.35,
        borderWidth: strokeWidth, borderColor: color,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <View style={{
          width: size * 0.22, height: strokeWidth,
          backgroundColor: color, borderRadius: strokeWidth / 2,
          transform: [{ rotate: '45deg' }],
          position: 'absolute',
          left: size * 0.1, top: size * 0.28,
        }} />
        <View style={{
          width: size * 0.35, height: strokeWidth,
          backgroundColor: color, borderRadius: strokeWidth / 2,
          transform: [{ rotate: '-45deg' }],
          position: 'absolute',
          left: size * 0.18, top: size * 0.22,
        }} />
      </View>
    </View>
  );
};

interface EmptyMatchesStateProps {
  onBrowseProfiles: () => void;
}

export const EmptyMatchesState: React.FC<EmptyMatchesStateProps> = ({
  onBrowseProfiles,
}) => {
  const { isLandscape, isTablet, hp, wp, moderateScale } = useResponsive();

  // Responsive sizing following design_system2.md
  const iconSize = isLandscape
    ? Math.min(hp(20), wp(12), 80)
    : isTablet
      ? moderateScale(100)
      : moderateScale(80);

  const titleSize = isLandscape
    ? Math.min(hp(6), wp(4), 26)
    : isTablet
      ? moderateScale(28)
      : moderateScale(24);

  // Minimum 16px for senior accessibility, prefer 18px on larger screens
  const bodySize = isLandscape
    ? Math.max(16, Math.min(hp(4), wp(2.5), 18))
    : isTablet
      ? Math.max(18, moderateScale(18))
      : Math.max(16, moderateScale(16));

  // Minimum 56px for senior-friendly touch targets
  const buttonHeight = isLandscape
    ? Math.max(56, Math.min(hp(12), 60))
    : isTablet
      ? Math.max(56, moderateScale(64))
      : Math.max(56, moderateScale(56));

  const cardPadding = isLandscape
    ? hp(6)
    : isTablet
      ? moderateScale(40)
      : moderateScale(32);

  // Responsive maxWidth for better layout on various screen sizes
  const maxWidth = isLandscape
    ? Math.min(wp(50), 600) // Cap at 600px for very wide screens
    : isTablet
      ? Math.min(wp(70), 550) // 70% of width, max 550px for tablets
      : '100%'; // Full width for phones

  return (
    <View style={[styles.container, { maxWidth }]}>
      {/* Clean background gradient */}
      <LinearGradient
        colors={[colors.romantic.blush, colors.neutral.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.card, { padding: cardPadding }]}
      >
        {/* Heart Icon with Gradient */}
        <View style={[styles.iconContainer, { width: iconSize, height: iconSize }]}>
          <LinearGradient
            colors={[colors.romantic.pink, colors.orange.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <HeartIcon size={iconSize * 0.55} color={colors.white} />
          </LinearGradient>
        </View>

        {/* Decorative sparkles with vector icons */}
        <View style={styles.sparkleContainer}>
          <View style={[styles.sparkle, styles.sparkleLeft]}>
            <SparkleIcon size={20} color={colors.orange.primary} />
          </View>
          <View style={[styles.sparkle, styles.sparkleRight]}>
            <SparkleIcon size={18} color={colors.romantic.pink} />
          </View>
        </View>

        {/* Title */}
        <Text
          variant="h3"
          center
          style={[styles.title, { fontSize: titleSize }]}
        >
          No Matches Yet
        </Text>

        {/* Description - using textPrimary for better contrast on gradient background */}
        <Text
          variant="body"
          center
          color={colors.neutral.textPrimary}
          style={[styles.description, { fontSize: bodySize, opacity: 0.85 }]}
        >
          {isLandscape
            ? 'Start browsing profiles to find your match!'
            : 'When you and someone else both like each other, you\'ll see them here. Start browsing to find your perfect match!'}
        </Text>

        {/* Tips Section with clean vector icons */}
        <LinearGradient
          colors={[colors.neutral.surface, colors.romantic.blush + '60']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tipsContainer}
        >
          <View style={styles.tipRow}>
            <View style={styles.tipIconContainer}>
              <SearchIcon size={bodySize * 1.1} color={colors.orange.primary} />
            </View>
            <Text
              variant="bodySmall"
              color={colors.neutral.textPrimary}
              style={{ fontSize: Math.max(16, bodySize * 0.9), flex: 1 }} // Minimum 16px for accessibility
            >
              Browse profiles in Discover
            </Text>
          </View>
          <View style={styles.tipRow}>
            <View style={[styles.tipIconContainer, { backgroundColor: colors.romantic.pinkLight + '40' }]}>
              <HeartIcon size={bodySize * 1.1} color={colors.romantic.pink} />
            </View>
            <Text
              variant="bodySmall"
              color={colors.neutral.textPrimary}
              style={{ fontSize: Math.max(16, bodySize * 0.9), flex: 1 }} // Minimum 16px for accessibility
            >
              Like someone you're interested in
            </Text>
          </View>
          <View style={styles.tipRow}>
            <View style={[styles.tipIconContainer, { backgroundColor: colors.teal.light + '30' }]}>
              <CheckCircleIcon size={bodySize * 1.1} color={colors.teal.primary} />
            </View>
            <Text
              variant="bodySmall"
              color={colors.neutral.textPrimary}
              style={{ fontSize: Math.max(16, bodySize * 0.9), flex: 1 }} // Minimum 16px for accessibility
            >
              Match when they like you back!
            </Text>
          </View>
        </LinearGradient>

        {/* CTA Button */}
        <Button
          title="Start Discovering"
          onPress={onBrowseProfiles}
          variant="primary"
          fullWidth
          style={{ height: buttonHeight, marginTop: spacing.l }}
          accessibilityLabel="Browse profiles"
          accessibilityHint="Double tap to go to the Discover screen"
        />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    alignItems: 'center',
    borderRadius: borderRadius.xlarge + 4,
    width: '100%',
    position: 'relative',
  },
  iconContainer: {
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    marginBottom: spacing.m,
    shadowColor: colors.romantic.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 100,
    pointerEvents: 'none',
  },
  sparkle: {
    position: 'absolute',
    opacity: 0.7,
  },
  sparkleLeft: {
    left: '15%',
    top: 10,
  },
  sparkleRight: {
    right: '15%',
    top: 30,
  },
  title: {
    marginBottom: spacing.m,
    color: colors.neutral.textPrimary,
  },
  description: {
    marginBottom: spacing.l,
    paddingHorizontal: spacing.m,
    lineHeight: 24,
  },
  tipsContainer: {
    width: '100%',
    borderRadius: borderRadius.large,
    padding: spacing.m,
    gap: spacing.m,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orange.light + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EmptyMatchesState;
