/**
 * TANDER Empty State Component
 * Displayed when no profiles are available
 * Senior-friendly: Clear messaging, large CTA, encouraging tone
 *
 * Follows design_system2.md:
 * - Illustration: 200x200dp, orange/teal colors
 * - Headline: 24px
 * - Description: 18px
 * - CTA button
 */

import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

type EmptyStateVariant =
  | 'no-profiles'
  | 'end-of-list'
  | 'no-matches'
  | 'loading-error';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  onAction?: () => void;
  onSecondaryAction?: () => void;
}

const EMPTY_STATE_CONTENT: Record<EmptyStateVariant, {
  icon: string;
  headline: string;
  description: string;
  actionLabel: string;
  secondaryLabel?: string;
}> = {
  'no-profiles': {
    icon: '🔍',
    headline: 'No Profiles Yet',
    description: 'We\'re finding the best matches for you. Check back soon or adjust your preferences.',
    actionLabel: 'Adjust Filters',
    secondaryLabel: 'Refresh',
  },
  'end-of-list': {
    icon: '✨',
    headline: 'You\'ve Seen Everyone!',
    description: 'Great job exploring! Expand your distance or check back later for new members.',
    actionLabel: 'Expand Distance',
    secondaryLabel: 'Check Matches',
  },
  'no-matches': {
    icon: '💝',
    headline: 'No Matches Yet',
    description: 'Keep discovering! Your perfect match could be just around the corner.',
    actionLabel: 'Browse Profiles',
  },
  'loading-error': {
    icon: '😔',
    headline: 'Something Went Wrong',
    description: 'We couldn\'t load profiles. Please check your connection and try again.',
    actionLabel: 'Try Again',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'no-profiles',
  onAction,
  onSecondaryAction,
}) => {
  const { isLandscape, isTablet, hp, wp, width, moderateScale } = useResponsive();

  const content = EMPTY_STATE_CONTENT[variant];

  // Small screen detection (320-375px width)
  const isSmallPhone = width < 360;

  // Responsive sizing - adjusted for small screens
  const iconSize = isLandscape
    ? Math.min(hp(20), wp(12), 100)
    : isTablet
      ? moderateScale(120)
      : isSmallPhone
        ? Math.min(width * 0.22, 80) // Smaller on tiny screens
        : moderateScale(100);

  const headlineSize = isLandscape
    ? Math.min(hp(5), wp(3.5), 24)
    : isTablet
      ? moderateScale(28)
      : isSmallPhone
        ? 22 // Smaller but still readable
        : moderateScale(24);

  const descriptionSize = isLandscape
    ? Math.min(hp(3.5), wp(2.5), 18)
    : isTablet
      ? moderateScale(20)
      : Math.max(16, moderateScale(18)); // Never below 16px for seniors

  // Button width - responsive to screen width on small screens
  const buttonWidth = isLandscape
    ? Math.min(wp(30), 280)
    : isTablet
      ? moderateScale(320)
      : isSmallPhone
        ? Math.min(width - 48, 280) // Leave 24px padding each side
        : Math.min(moderateScale(280), width - 48);

  return (
    <View style={styles.container}>
      {/* Illustration circle with gradient */}
      <View style={[styles.iconCircle, { width: iconSize, height: iconSize }]}>
        <LinearGradient
          colors={colors.gradient.subtle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <Text style={{ fontSize: iconSize * 0.5 }}>{content.icon}</Text>
        </LinearGradient>
      </View>

      {/* Headline */}
      <Text
        variant="h2"
        center
        color={colors.neutral.textPrimary}
        style={[styles.headline, { fontSize: headlineSize }]}
      >
        {content.headline}
      </Text>

      {/* Description */}
      <Text
        variant="body"
        center
        color={colors.neutral.textSecondary}
        style={[
          styles.description,
          {
            fontSize: descriptionSize,
            maxWidth: isSmallPhone ? width - 48 : 320,
            lineHeight: descriptionSize * 1.5, // Proper line height for seniors
          }
        ]}
      >
        {content.description}
      </Text>

      {/* Action buttons */}
      <View style={[styles.buttonContainer, { width: buttonWidth }]}>
        {onAction && (
          <Button
            title={content.actionLabel}
            onPress={onAction}
            variant="primary"
            fullWidth
            accessibilityLabel={content.actionLabel}
            accessibilityHint={`Double tap to ${content.actionLabel.toLowerCase()}`}
          />
        )}

        {onSecondaryAction && content.secondaryLabel && (
          <Button
            title={content.secondaryLabel}
            onPress={onSecondaryAction}
            variant="outlined"
            fullWidth
            accessibilityLabel={content.secondaryLabel}
            style={styles.secondaryButton}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
  },
  iconCircle: {
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    marginBottom: spacing.l,
  },
  iconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    marginBottom: spacing.s,
    fontWeight: '700',
  },
  description: {
    marginBottom: spacing.xl,
    lineHeight: 26,
    maxWidth: 320,
  },
  buttonContainer: {
    gap: spacing.s,
  },
  secondaryButton: {
    marginTop: spacing.xs,
  },
});

export default EmptyState;
