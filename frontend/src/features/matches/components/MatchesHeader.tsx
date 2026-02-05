/**
 * TANDER MatchesHeader - PREMIUM REDESIGN
 * A stunning, modern header with animated stats and romantic aesthetics
 *
 * Design Inspiration: Bumble/Hinge premium headers with celebration animations
 *
 * Features:
 * - Animated match count with celebration effect
 * - User avatar with online status glow
 * - Romantic gradient backgrounds
 * - Premium glassmorphism cards for stats
 * - Senior-friendly touch targets (56-64px)
 * - WCAG AA contrast compliance
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import type { MatchesFontSizes, MatchesSpacing } from '../hooks/useMatchesResponsive';

interface MatchesHeaderProps {
  matchCount: number;
  newMatchCount: number;
  onlineCount: number;
  fontSizes: MatchesFontSizes;
  spacing: MatchesSpacing;
  isCompactMode: boolean;
  isLandscape: boolean;
  isTablet: boolean;
  headerIconSize: number;
  headerIconContainerSize: number;
  isOffline: boolean;
  reduceMotion: boolean;
}

/**
 * Animated Heart Icon with Pulse Effect
 */
const AnimatedHeartIcon: React.FC<{
  size: number;
  containerSize: number;
  reduceMotion: boolean;
}> = ({ size, containerSize, reduceMotion }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (reduceMotion) {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.5);
      return;
    }

    // Heartbeat animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [pulseAnim, glowAnim, reduceMotion]);

  return (
    <View style={[styles.heartIconContainer, { width: containerSize, height: containerSize }]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.heartGlow,
          {
            width: containerSize * 1.4,
            height: containerSize * 1.4,
            borderRadius: containerSize * 0.7,
            opacity: glowAnim,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.orange[400], colors.teal[400]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Main heart container */}
      <Animated.View
        style={[
          styles.heartIconInner,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={colors.gradient.primaryButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: containerSize / 2 }]}
        />
        <Feather name="heart" size={size} color={colors.white} />
      </Animated.View>
    </View>
  );
};

/**
 * Stats Badge Component with Glassmorphism
 */
const StatsBadge: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  count: number;
  label: string;
  color: string;
  fontSize: number;
  isCompact: boolean;
  reduceMotion: boolean;
}> = ({ icon, count, label, color, fontSize, isCompact, reduceMotion }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current && !reduceMotion) {
      // Celebration animation when count increases
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 200,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevCount.current = count;
  }, [count, scaleAnim, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.statsBadge,
        {
          transform: [{ scale: scaleAnim }],
          paddingHorizontal: isCompact ? 10 : 14,
          paddingVertical: isCompact ? 6 : 8,
        },
      ]}
    >
      <View style={[styles.statsBadgeIconWrap, { backgroundColor: `${color}15` }]}>
        <Feather name={icon} size={isCompact ? 14 : 16} color={color} />
      </View>
      <Text
        style={[
          styles.statsBadgeCount,
          { fontSize: Math.max(fontSize, 16), color },
        ]}
        maxFontSizeMultiplier={FONT_SCALING.BODY}
      >
        {count}
      </Text>
      {!isCompact && (
        <Text style={[styles.statsBadgeLabel, { fontSize: Math.max(fontSize - 2, 14) }]} maxFontSizeMultiplier={FONT_SCALING.CAPTION}>
          {label}
        </Text>
      )}
    </Animated.View>
  );
};

/**
 * Offline Banner Component
 */
const OfflineBanner: React.FC<{
  fontSize: number;
  spacing: MatchesSpacing;
}> = ({ fontSize, spacing }) => (
  <View
    style={[
      styles.offlineBanner,
      {
        paddingVertical: spacing.s,
        paddingHorizontal: spacing.m,
        marginTop: spacing.s,
      },
    ]}
  >
    <Feather name="wifi-off" size={Math.max(fontSize, 16)} color={colors.white} />
    <Text style={[styles.offlineBannerText, { fontSize: Math.max(fontSize, 16) }]} maxFontSizeMultiplier={FONT_SCALING.BODY}>
      You're offline - Showing saved matches
    </Text>
  </View>
);

export const MatchesHeader: React.FC<MatchesHeaderProps> = ({
  matchCount,
  newMatchCount,
  onlineCount,
  fontSizes,
  spacing,
  isCompactMode,
  isLandscape,
  isTablet,
  headerIconSize,
  headerIconContainerSize,
  isOffline,
  reduceMotion,
}) => {
  // Responsive adjustments
  const showStats = !isCompactMode || isTablet;
  const showSubtitle = !isCompactMode;

  // On mobile portrait (not tablet, not landscape), show stats below title
  const showStatsInline = isTablet || isLandscape;

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const renderStatsBadges = () => (
    <View style={[styles.statsRow, { gap: spacing.s }]}>
      {newMatchCount > 0 && (
        <StatsBadge
          icon="star"
          count={newMatchCount}
          label="new"
          color={colors.orange[500]}
          fontSize={fontSizes.badge}
          isCompact={isCompactMode}
          reduceMotion={reduceMotion}
        />
      )}
      {onlineCount > 0 && (
        <StatsBadge
          icon="circle"
          count={onlineCount}
          label="online"
          color={colors.teal[500]}
          fontSize={fontSizes.badge}
          isCompact={isCompactMode}
          reduceMotion={reduceMotion}
        />
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingHorizontal: Math.max(spacing.l, isLandscape ? 8 : spacing.l),
          marginBottom: isCompactMode ? spacing.s : spacing.m,
        },
      ]}
    >
      {/* Main Header Row */}
      <View style={[styles.headerMainRow, !showStatsInline && styles.headerMainRowStacked]}>
        {/* Left: Heart Icon + Title */}
        <View style={[
          styles.headerLeft,
          { gap: isCompactMode ? spacing.s : spacing.m },
          !showStatsInline && styles.headerLeftFullWidth,
        ]}>
          <AnimatedHeartIcon
            size={headerIconSize}
            containerSize={headerIconContainerSize}
            reduceMotion={reduceMotion}
          />

          <View style={[styles.headerTextContainer, !showStatsInline && styles.headerTextContainerFullWidth]}>
            {/* Main Title */}
            <Text
              style={[
                styles.headerTitle,
                {
                  fontSize: Math.max(fontSizes.headerTitle, 24),
                  lineHeight: Math.max(fontSizes.headerTitle, 24) * 1.2,
                },
              ]}
              accessible
              accessibilityRole="header"
              numberOfLines={1}
              maxFontSizeMultiplier={FONT_SCALING.TITLE}
            >
              Your Matches
            </Text>

            {/* Subtitle with greeting */}
            {showSubtitle && (
              <Text
                style={[
                  styles.headerSubtitle,
                  {
                    fontSize: Math.max(fontSizes.headerSubtitle, 16),
                    lineHeight: Math.max(fontSizes.headerSubtitle, 16) * 1.4,
                  },
                ]}
                numberOfLines={2}
                maxFontSizeMultiplier={FONT_SCALING.BODY}
              >
                {greeting}! {matchCount > 0 ? `${matchCount} ${matchCount === 1 ? 'person is' : 'people are'} waiting` : 'Find your match'}
              </Text>
            )}
          </View>

          {/* Stats Badges - Inline on tablet/landscape */}
          {showStats && showStatsInline && renderStatsBadges()}
        </View>
      </View>

      {/* Stats Badges Row - Below title on mobile portrait */}
      {showStats && !showStatsInline && (
        <View style={[styles.statsBelowRow, { marginTop: spacing.m }]}>
          {renderStatsBadges()}
        </View>
      )}

      {/* Offline Banner */}
      {isOffline && <OfflineBanner fontSize={fontSizes.body} spacing={spacing} />}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerMainRowStacked: {
    // For mobile portrait, no space-between needed
    justifyContent: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  headerLeftFullWidth: {
    flexShrink: 0,
    flex: 0,
  },
  headerTextContainer: {
    flexShrink: 1,
  },
  headerTextContainerFullWidth: {
    flexShrink: 0,
    flex: 1,
  },
  headerTitle: {
    fontWeight: '800',
    color: colors.gray[900],
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: colors.gray[500],
    marginTop: 2,
    fontWeight: '500',
  },
  statsBelowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  // Heart Icon
  heartIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartGlow: {
    position: 'absolute',
    overflow: 'hidden',
  },
  heartIconInner: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  // Stats Badges
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statsBadgeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBadgeCount: {
    fontWeight: '700',
  },
  statsBadgeLabel: {
    color: colors.gray[500],
    fontWeight: '500',
  },

  // Offline Banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.gray[700],
    borderRadius: 16,
  },
  offlineBannerText: {
    fontWeight: '600',
    color: colors.white,
  },
});

export default MatchesHeader;
