/**
 * TANDER Expiration Ring Component
 * Bumble-inspired circular countdown timer ring around profile photos
 *
 * Design System Compliance (design_system2.md):
 * - Uses orange/yellow gradient for urgency
 * - Smooth animation for countdown
 * - Accessible with screen reader support
 * - Responsive sizing for all screen sizes
 *
 * Visual Design:
 * - Green ring (>6h remaining) - calm, no rush
 * - Yellow ring (1-6h remaining) - expiring soon
 * - Orange/Red ring (<1h remaining) - critical, act now
 */

import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import { ExpirationTime } from '../types';

interface ExpirationRingProps {
  /** Size of the ring (diameter) */
  size: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Expiration time data from useExpirationTimer */
  expirationTime: ExpirationTime | null;
  /** Children to render inside the ring (usually an image) */
  children: React.ReactNode;
  /** Whether to show the time text below the ring */
  showTimeText?: boolean;
  /** Additional styles */
  style?: ViewStyle;
}

export const ExpirationRing: React.FC<ExpirationRingProps> = memo(({
  size,
  strokeWidth = 3,
  expirationTime,
  children,
  showTimeText = false,
  style,
}) => {
  const { isLandscape } = useResponsive();

  // Calculate ring dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate stroke offset based on percentage remaining
  const percentage = expirationTime?.percentage ?? 100;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  // Determine ring color based on urgency
  const getRingColors = (): { start: string; end: string } => {
    if (!expirationTime || expirationTime.isExpired) {
      return { start: colors.neutral.disabled, end: colors.neutral.disabled };
    }
    if (expirationTime.isCritical) {
      // Red/orange gradient - critical
      return { start: '#FF4444', end: colors.orange.primary };
    }
    if (expirationTime.isExpiringSoon) {
      // Yellow/orange gradient - expiring soon (Bumble style)
      return { start: '#FFD700', end: colors.orange.primary };
    }
    // Green/teal gradient - plenty of time
    return { start: colors.teal.primary, end: colors.teal.light };
  };

  const ringColors = getRingColors();

  // Responsive text size
  const textSize = isLandscape
    ? Math.min(size * 0.14, 11)
    : Math.min(size * 0.16, 12);

  // Don't show ring if no expiration data or already messaged
  if (!expirationTime) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* SVG Ring */}
      <Svg
        width={size}
        height={size}
        style={styles.svg}
      >
        <Defs>
          <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={ringColors.start} />
            <Stop offset="100%" stopColor={ringColors.end} />
          </SvgGradient>
        </Defs>

        {/* Background circle (gray track) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.neutral.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle (colored) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Content inside ring */}
      <View style={[styles.content, { width: size - strokeWidth * 2, height: size - strokeWidth * 2 }]}>
        {children}
      </View>

      {/* Time text (optional) */}
      {showTimeText && !expirationTime.isExpired && (
        <View
          style={[
            styles.timeContainer,
            {
              bottom: -spacing.xs - textSize,
            },
          ]}
          accessible
          accessibilityLabel={`Expires in ${expirationTime.displayText}`}
        >
          <Text
            variant="caption"
            color={expirationTime.isCritical ? colors.semantic.error : colors.neutral.textSecondary}
            style={[
              styles.timeText,
              {
                fontSize: textSize,
                fontWeight: expirationTime.isCritical ? '700' : '600',
              },
            ]}
          >
            {expirationTime.displayText}
          </Text>
        </View>
      )}
    </View>
  );
});

ExpirationRing.displayName = 'ExpirationRing';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 999,
  },
  timeContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeText: {
    textAlign: 'center',
  },
});

export default ExpirationRing;
