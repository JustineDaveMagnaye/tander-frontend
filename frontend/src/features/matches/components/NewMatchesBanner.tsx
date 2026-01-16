/**
 * TANDER New Matches Banner Component
 * Modern dating app horizontal scroll with clean vector icons
 *
 * Design System Compliance (design_system2.md):
 * - Clean vector icons (no emojis in UI elements)
 * - Horizontal scroll with circular profile photos
 * - Gradient borders for new/active matches
 * - Senior-friendly touch targets (64px minimum)
 * - Responsive sizing for all screen sizes and orientations
 *
 * Backward Compatibility:
 * - Uses FlatList for efficient rendering on older devices
 * - Avoids newer APIs not available on Android API 24 / iOS 13
 * - No native dependencies beyond Expo
 */

import React, { memo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import { Match } from '../types';
import { MatchCard } from './MatchCard';
import { useMultipleExpirationTimers } from '../hooks';

// ============================================================================
// CLEAN VECTOR ICON COMPONENTS (Following ProfileScreen pattern)
// ============================================================================
interface IconProps {
  size: number;
  color: string;
}

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

const ClockIcon: React.FC<IconProps> = ({ size, color }) => {
  const strokeWidth = Math.max(1.5, size * 0.12);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.75, height: size * 0.75, borderRadius: size * 0.375,
        borderWidth: strokeWidth, borderColor: color,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <View style={{
          position: 'absolute',
          width: strokeWidth, height: size * 0.22,
          backgroundColor: color, borderRadius: strokeWidth / 2,
          top: size * 0.12,
        }} />
        <View style={{
          position: 'absolute',
          width: size * 0.15, height: strokeWidth,
          backgroundColor: color, borderRadius: strokeWidth / 2,
          transform: [{ rotate: '45deg' }],
          left: size * 0.2, top: size * 0.24,
        }} />
      </View>
    </View>
  );
};

const PlusIcon: React.FC<IconProps> = ({ size, color }) => {
  const barThickness = Math.max(2, size * 0.15);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.5, height: barThickness,
        backgroundColor: color, borderRadius: barThickness / 2,
      }} />
      <View style={{
        position: 'absolute',
        width: barThickness, height: size * 0.5,
        backgroundColor: color, borderRadius: barThickness / 2,
      }} />
    </View>
  );
};

interface NewMatchesBannerProps {
  matches: Match[];
  onMatchPress: (match: Match) => void;
  onSeeAllPress?: () => void;
}

export const NewMatchesBanner: React.FC<NewMatchesBannerProps> = memo(({
  matches,
  onMatchPress,
  onSeeAllPress,
}) => {
  const { isLandscape, isTablet } = useResponsive();
  const flatListRef = useRef<FlatList>(null);

  // Get expiration times for all matches
  const expirationTimes = useMultipleExpirationTimers(matches, true);

  // Responsive sizing - minimum 16px for senior accessibility
  const sectionTitleSize = isLandscape ? 16 : isTablet ? 18 : 16;
  const seeAllSize = isLandscape ? 16 : isTablet ? 17 : 16;
  const itemSpacing = isLandscape ? 8 : isTablet ? 12 : 10;
  const containerHeight = isLandscape ? 100 : isTablet ? 115 : 105;

  // Get expiring matches (prioritize these)
  const expiringMatches = matches.filter(m => {
    const expTime = expirationTimes.get(m.id);
    return expTime && expTime.isExpiringSoon && !m.hasFirstMessage;
  });

  const newMatches = matches.filter(m => m.hasNewMessage && !expiringMatches.includes(m));
  const recentMatches = matches.filter(
    m => !m.hasNewMessage && !expiringMatches.includes(m)
  ).slice(0, 5);

  // Show expiring first, then new, then recent
  const displayMatches = [...expiringMatches, ...newMatches, ...recentMatches];

  const handleSeeAllPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }
    onSeeAllPress?.();
  };

  const renderItem: ListRenderItem<Match> = ({ item, index }) => {
    const expTime = expirationTimes.get(item.id);

    return (
      <View
        style={[
          styles.itemContainer,
          { marginLeft: index === 0 ? 0 : itemSpacing },
        ]}
      >
        <MatchCard
          match={item}
          onPress={onMatchPress}
          variant="circle"
          size={isLandscape ? 'small' : 'medium'}
          showName={true}
          showExpirationTimer={true}
          expirationTime={expTime}
        />
      </View>
    );
  };

  // Add Match CTA at the end with clean vector icons
  const renderAddMatchCTA = () => {
    const ctaSize = isLandscape ? 56 : isTablet ? 64 : 60;

    return (
      <TouchableOpacity
        onPress={handleSeeAllPress}
        activeOpacity={0.8}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Browse more profiles"
        accessibilityHint="Double tap to discover new people"
        style={[styles.addMatchContainer, { width: ctaSize + 8 }]}
      >
        <LinearGradient
          colors={[colors.romantic.blush, colors.romantic.pinkLight + '60']}
          style={[
            styles.addMatchCircle,
            { width: ctaSize, height: ctaSize, borderRadius: ctaSize / 2 },
          ]}
        >
          <PlusIcon size={ctaSize * 0.4} color={colors.romantic.pink} />
        </LinearGradient>
        <Text
          variant="caption"
          color={colors.romantic.pink}
          center
          numberOfLines={1}
          style={{ fontSize: Math.max(16, seeAllSize - 2), marginTop: 4, fontWeight: '600' }}
        >
          Discover
        </Text>
      </TouchableOpacity>
    );
  };

  if (displayMatches.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { minHeight: containerHeight }]}>
      {/* Header with clean vector icons */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.sparkleIconWrapper}>
            <SparkleIcon size={16} color={colors.orange.primary} />
          </View>
          <Text
            variant="h4"
            numberOfLines={1}
            style={{ fontSize: sectionTitleSize, fontWeight: '700' }}
          >
            New Matches
          </Text>
          {newMatches.length > 0 && (
            <LinearGradient
              colors={[colors.romantic.pink, colors.orange.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.countBadge}
            >
              <Text
                variant="caption"
                color={colors.white}
                style={{ fontSize: 16, fontWeight: '700' }} // Min 16px for senior accessibility
              >
                {newMatches.length}
              </Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.headerRight}>
          {expiringMatches.length > 0 && (
            <LinearGradient
              colors={[colors.romantic.heartRed, colors.romantic.rose]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.expiringBadge}
            >
              <View style={styles.clockIconWrapper}>
                <ClockIcon size={12} color={colors.white} />
              </View>
              <Text
                variant="caption"
                color={colors.white}
                style={{ fontSize: 16, fontWeight: '700' }} // Min 16px for senior accessibility
              >
                {expiringMatches.length} expiring
              </Text>
            </LinearGradient>
          )}
          {onSeeAllPress && displayMatches.length > 3 && (
            <TouchableOpacity
              onPress={handleSeeAllPress}
              activeOpacity={0.7}
              accessible
              accessibilityRole="button"
              accessibilityLabel="See all matches"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.seeAllButton}
            >
              <Text
                variant="bodySmall"
                color={colors.romantic.pink}
                numberOfLines={1}
                style={{ fontSize: seeAllSize, fontWeight: '700' }}
              >
                See All
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal List */}
      <FlatList
        ref={flatListRef}
        data={displayMatches}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={renderAddMatchCTA}
        ListFooterComponentStyle={{ marginLeft: itemSpacing }}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={6}
      />
    </View>
  );
});

NewMatchesBanner.displayName = 'NewMatchesBanner';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.m,
    paddingVertical: spacing.xs,
    overflow: 'visible', // Fix clipping of elevated items (badges, shadows)
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
    paddingRight: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkleIconWrapper: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockIconWrapper: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    minWidth: 22,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  listContent: {
    paddingRight: spacing.m,
    paddingVertical: spacing.s, // Extra vertical padding to prevent clipping of badges/shadows
    paddingLeft: spacing.xs, // Small left padding to prevent clipping of first item
  },
  itemContainer: {
    alignItems: 'center',
  },
  addMatchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMatchCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.romantic.pinkLight,
    borderStyle: 'dashed',
  },
});

export default NewMatchesBanner;
