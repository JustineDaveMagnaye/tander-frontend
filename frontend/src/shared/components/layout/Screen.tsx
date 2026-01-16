/**
 * TANDER Screen Component
 * Base screen wrapper with safe area handling
 *
 * Follows design_system2.md:
 * - Full safe area support for all iOS/Android devices
 * - Responsive landscape/portrait layouts
 * - Pattern 3: Master-Detail for list screens
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

export interface ScreenProps {
  children: React.ReactNode;
  backgroundColor?: string;
  padding?: boolean;
  /** Apply safe area insets to these edges */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: ViewStyle;
  /** Status bar style - defaults to dark-content */
  statusBarStyle?: 'light-content' | 'dark-content';
  /** Max content width for tablets (centered) */
  maxContentWidth?: number;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  backgroundColor = colors.neutral.background,
  padding = true,
  edges = ['top', 'bottom', 'left', 'right'],
  style,
  statusBarStyle = 'dark-content',
  maxContentWidth,
}) => {
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet, wp, hp } = useResponsive();

  // Calculate safe area padding based on edges prop
  const safePadding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  // Responsive horizontal padding following design_system2.md
  const horizontalPadding = isLandscape
    ? wp(3) // 3% of width in landscape
    : isTablet
      ? spacing.xl
      : spacing.l;

  // Responsive vertical padding
  const verticalPadding = isLandscape
    ? hp(2) // 2% of height in landscape
    : spacing.m;

  // Calculate max width for tablet content centering
  const contentMaxWidth = maxContentWidth || (isTablet ? 800 : undefined);

  return (
    <View style={[styles.container, { backgroundColor }, safePadding, style]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />
      <View
        style={[
          styles.content,
          padding && {
            paddingHorizontal: horizontalPadding,
            paddingVertical: verticalPadding,
          },
          contentMaxWidth ? {
            maxWidth: contentMaxWidth,
            width: '100%' as const,
            alignSelf: 'center' as const,
          } : undefined,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default Screen;
