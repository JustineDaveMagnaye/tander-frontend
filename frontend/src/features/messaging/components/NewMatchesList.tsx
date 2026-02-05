/**
 * TANDER NewMatchesList Component - Clean Modern Design
 * Simplified horizontal matches carousel
 *
 * Design improvements:
 * - Cleaner circular avatars without cluttered badges
 * - Simple gradient ring for new matches
 * - Subtle online indicator
 * - Timer shown below avatar (not overlapping)
 * - Minimal, elegant design
 */

import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import type { ChatUser } from '../types';

// ============================================================================
// HELPERS
// ============================================================================
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

// ============================================================================
// TYPES
// ============================================================================
interface NewMatch {
  id: string;
  user: ChatUser;
  matchedAt: Date;
  expiresAt: Date;
  isYourTurn?: boolean;
  hasNewMessage?: boolean;
}

interface NewMatchesListProps {
  matches: NewMatch[];
  onMatchPress: (match: NewMatch) => void;
}

// ============================================================================
// MATCH ITEM COMPONENT - Clean circular avatar design
// ============================================================================
interface MatchItemProps {
  match: NewMatch;
  onPress: () => void;
  size: number;
  nameSize: number;
}

const MatchItem: React.FC<MatchItemProps> = ({ match, onPress, size, nameSize }) => {
  const { user, hasNewMessage } = match;
  const ringWidth = 3;
  const innerSize = size - ringWidth * 2;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.matchItem}
      accessible={true}
      accessibilityLabel={`Match with ${user.firstName}${hasNewMessage ? ', has new message' : ''}`}
      accessibilityRole="button"
    >
      {/* Avatar with gradient ring */}
      <View style={[styles.avatarOuter, { width: size, height: size, borderRadius: size / 2 }]}>
        {/* Gradient ring for new/active matches */}
        <LinearGradient
          colors={hasNewMessage ? [colors.romantic.pink, colors.orange.primary] : [colors.teal.primary, colors.teal.light]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientRing, { width: size, height: size, borderRadius: size / 2 }]}
        >
          {/* White spacer */}
          <View style={[styles.whiteSpacer, {
            width: innerSize + 4,
            height: innerSize + 4,
            borderRadius: (innerSize + 4) / 2
          }]}>
            {/* Avatar */}
            {user.profilePhoto ? (
              <Image
                source={{ uri: user.profilePhoto }}
                style={[styles.avatar, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
                <Text style={[styles.avatarInitial, { fontSize: innerSize * 0.4 }]}>
                  {user.firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Online indicator - small green dot */}
        {user.isOnline && (
          <View style={[styles.onlineDot, {
            width: size * 0.22,
            height: size * 0.22,
            borderRadius: size * 0.11,
            borderWidth: 2,
          }]} />
        )}

        {/* New message badge - small dot at top */}
        {hasNewMessage && (
          <View style={[styles.newBadge, {
            width: size * 0.24,
            height: size * 0.24,
            borderRadius: size * 0.12,
          }]}>
            <Text style={[styles.newBadgeText, { fontSize: size * 0.11 }]}>!</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text
        style={[styles.matchName, { fontSize: nameSize, marginTop: spacing.xs }]}
        numberOfLines={1}
      >
        {user.firstName}
      </Text>
    </TouchableOpacity>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const NewMatchesList: React.FC<NewMatchesListProps> = ({ matches, onMatchPress }) => {
  const { isLandscape, isTablet, hp, moderateScale } = useResponsive();

  if (matches.length === 0) return null;

  // Responsive sizes
  const avatarSize = useMemo(() => {
    if (isLandscape) return clamp(hp(16), 50, 68);
    if (isTablet) return clamp(moderateScale(72), 64, 84);
    return clamp(moderateScale(64), 56, 76);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const nameSize = useMemo(() => {
    if (isLandscape) return clamp(hp(3), 11, 14);
    if (isTablet) return clamp(moderateScale(14), 12, 16);
    return clamp(moderateScale(13), 11, 15);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const titleSize = useMemo(() => {
    if (isLandscape) return clamp(hp(3.2), 11, 14);
    if (isTablet) return clamp(moderateScale(14), 12, 16);
    return clamp(moderateScale(12), 11, 14);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const padding = useMemo(() => {
    if (isLandscape) return clamp(hp(2.5), 10, 16);
    if (isTablet) return clamp(moderateScale(18), 14, 22);
    return clamp(moderateScale(16), 12, 20);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const itemGap = useMemo(() => {
    if (isLandscape) return clamp(hp(2), 12, 20);
    if (isTablet) return clamp(moderateScale(20), 16, 26);
    return clamp(moderateScale(18), 14, 24);
  }, [isLandscape, isTablet, hp, moderateScale]);

  const badgeSize = useMemo(() => titleSize * 1.4, [titleSize]);

  return (
    <View style={[styles.container, { paddingVertical: padding }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: padding, marginBottom: padding * 0.6 }]}>
        <Text style={[styles.sectionTitle, { fontSize: titleSize }]}>NEW MATCHES</Text>
        <View style={[styles.countBadge, {
          minWidth: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          paddingHorizontal: badgeSize * 0.35,
        }]}>
          <Text style={[styles.countText, { fontSize: badgeSize * 0.55 }]}>{matches.length}</Text>
        </View>
      </View>

      {/* Matches scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: padding, gap: itemGap }]}
        decelerationRate="fast"
      >
        {matches.map((match) => (
          <MatchItem
            key={match.id}
            match={match}
            onPress={() => onMatchPress(match)}
            size={avatarSize}
            nameSize={nameSize}
          />
        ))}
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral.border,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.neutral.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: colors.romantic.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: colors.white,
    fontWeight: '700',
  },

  // Scroll
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: spacing.s,
  },

  // Match Item
  matchItem: {
    alignItems: 'center',
  },
  avatarOuter: {
    position: 'relative',
  },
  gradientRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteSpacer: {
    backgroundColor: colors.neutral.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.neutral.border,
  },
  avatarPlaceholder: {
    backgroundColor: colors.teal.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: colors.white,
    fontWeight: '600',
  },

  // Online indicator
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.semantic.success,
    borderColor: colors.neutral.surface,
  },

  // New message badge
  newBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.romantic.pink,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.surface,
  },
  newBadgeText: {
    color: colors.white,
    fontWeight: '700',
  },

  // Name
  matchName: {
    color: colors.neutral.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default NewMatchesList;
