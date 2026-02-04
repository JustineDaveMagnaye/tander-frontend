/**
 * TANDER MatchesScreen - Super Premium iPhone UI/UX
 *
 * A beautiful, elegant matches screen inspired by iOS design language.
 * Features:
 * - iOS-style segmented control with animated sliding background
 * - Premium gradient backgrounds
 * - Elegant card designs with subtle shadows
 * - Smooth animations and haptic feedback
 * - Senior-friendly with large touch targets
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
  Image,
  Pressable,
  Platform,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  AccessibilityInfo,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MatchesStackParamList, MainTabParamList } from '@navigation/types';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import { usePresenceStore } from '@store/presenceStore';
import type { Match, FilterType } from '../types';
import { useFilteredMatches } from '../hooks';
import { QuickViewModal } from '../components/QuickViewModal';

// ============================================================================
// iOS DESIGN TOKENS - Super Premium iPhone Style
// ============================================================================
const iOS = {
  colors: {
    // System colors
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',
    systemGroupedBackground: '#F2F2F7',

    // Labels
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C4399',
    quaternaryLabel: '#3C3C432E',

    // Fills
    systemFill: 'rgba(120, 120, 128, 0.2)',
    secondarySystemFill: 'rgba(120, 120, 128, 0.16)',
    tertiarySystemFill: 'rgba(118, 118, 128, 0.12)',

    // Separators
    separator: 'rgba(60, 60, 67, 0.29)',
    opaqueSeparator: '#C6C6C8',

    // Brand colors
    systemOrange: '#FF9500',
    systemTeal: '#30D5C8',
    systemGreen: '#34C759',
    systemRed: '#FF3B30',
    systemBlue: '#007AFF',
    systemPink: '#FF2D92',

    // Premium gradients
    orangeGradient: ['#FF9F0A', '#FF6B00'],
    tealGradient: ['#5AC8FA', '#30D5C8'],
    premiumGradient: ['#FF9500', '#FF6B00', '#30D5C8'],
    cardGradient: ['#FFFFFF', '#FAFAFA'],
    heroGradient: ['#FFF7ED', '#FFFFFF', '#F0FDFA'],
  },

  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 40,
  },

  radius: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    full: 9999,
  },

  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
    subhead: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
    caption1: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
    caption2: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },
  },

  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
  },
};

// ============================================================================
// NAVIGATION TYPES
// ============================================================================
type MatchesScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MatchesStackParamList, 'MatchesList'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// ============================================================================
// PREMIUM SEGMENTED CONTROL - iOS Style with Animated Sliding Background
// ============================================================================
interface SegmentedControlProps {
  segments: { key: FilterType; label: string; count?: number }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const PremiumSegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  selectedIndex,
  onSelect,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { width } = useResponsive();

  const segmentWidth = useMemo(() => {
    if (!segments || segments.length === 0) return 100;
    const totalPadding = iOS.spacing.l * 2 + iOS.spacing.xs * 2;
    return (width - totalPadding) / segments.length;
  }, [width, segments]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedIndex * segmentWidth,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, [selectedIndex, segmentWidth]);

  const handlePress = useCallback(async (index: number) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onSelect(index);
  }, [onSelect]);

  if (!segments || segments.length === 0) return null;

  return (
    <View style={styles.segmentedContainer}>
      {/* Sliding Background */}
      <Animated.View
        style={[
          styles.segmentedSlider,
          {
            width: segmentWidth - iOS.spacing.xs,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={iOS.colors.orangeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.segmentedSliderGradient}
        />
      </Animated.View>

      {/* Segments */}
      {segments.map((segment, index) => (
        <TouchableOpacity
          key={segment.key}
          onPress={() => handlePress(index)}
          style={[styles.segmentedItem, { width: segmentWidth }]}
          activeOpacity={0.7}
          accessible
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedIndex === index }}
          accessibilityLabel={`${segment.label}${segment.count ? `, ${segment.count} matches` : ''}`}
        >
          <Text style={[
            styles.segmentedText,
            selectedIndex === index && styles.segmentedTextActive,
          ]}>
            {segment.label}
          </Text>
          {segment.count !== undefined && segment.count > 0 && (
            <View style={[
              styles.segmentedBadge,
              selectedIndex === index && styles.segmentedBadgeActive,
            ]}>
              <Text style={[
                styles.segmentedBadgeText,
                selectedIndex === index && styles.segmentedBadgeTextActive,
              ]}>
                {segment.count > 99 ? '99+' : segment.count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================================
// SUPER PREMIUM HERO SECTION - Stunning Animated Design
// ============================================================================
interface HeroSectionProps {
  matchCount: number;
  isTablet: boolean;
}

const PremiumHeroSection: React.FC<HeroSectionProps> = ({ matchCount, isTablet }) => {
  const heartScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Heartbeat animation
    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse ring animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    heartbeat.start();
    pulse.start();

    return () => {
      heartbeat.stop();
      pulse.stop();
    };
  }, []);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const iconSize = isTablet ? 40 : 32;
  const containerSize = isTablet ? 76 : 64;

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [1, 1.5],
    outputRange: [0.6, 0],
  });

  return (
    <View style={styles.heroSection}>
      {/* Animated Heart Icon with Pulse Ring */}
      <View style={styles.heroIconWrapper}>
        {/* Pulse Ring */}
        <Animated.View
          style={[
            styles.heroPulseRing,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
              transform: [{ scale: pulseAnim }],
              opacity: pulseOpacity,
            },
          ]}
        />

        {/* Main Icon */}
        <Animated.View
          style={[
            styles.heroIconContainer,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
              transform: [{ scale: heartScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FF9F0A', '#FF6B00', '#FF5500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIconGradient}
          >
            <Feather name="heart" size={iconSize} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Title & Subtitle */}
      <View style={styles.heroTextContainer}>
        <Text style={styles.heroTitle}>Your Matches</Text>
        <Text style={styles.heroSubtitle}>
          {getGreeting()}!{' '}
          <Text style={styles.heroHighlight}>
            {matchCount > 0
              ? `${matchCount} ${matchCount === 1 ? 'person is' : 'people are'} waiting`
              : 'Discover new connections'}
          </Text>
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// SUPER PREMIUM MATCH CARD - Glass Morphism iOS 17+ Design
// ============================================================================
interface PremiumMatchCardProps {
  match: Match;
  isOnline: boolean;
  onPress: () => void;
  isTablet: boolean;
}

const PremiumMatchCard: React.FC<PremiumMatchCardProps> = ({
  match,
  isOnline,
  onPress,
  isTablet,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Subtle glow animation for online users
  useEffect(() => {
    if (isOnline) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ])
      );
      glow.start();
      return () => glow.stop();
    }
  }, [isOnline]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 400,
      friction: 25,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 25,
    }).start();
  }, []);

  const handlePress = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onPress();
  }, [onPress]);

  const cardWidth = isTablet ? 200 : 168;
  const cardHeight = isTablet ? 310 : 280;
  const imageHeight = isTablet ? 180 : 155;

  const borderGlow = isOnline ? glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(52, 199, 89, 0)', 'rgba(52, 199, 89, 0.4)'],
  }) : 'transparent';

  return (
    <Animated.View style={[
      styles.premiumCardWrapper,
      { transform: [{ scale: scaleAnim }] },
    ]}>
      {/* Outer glow for online users */}
      {isOnline && (
        <Animated.View style={[
          styles.premiumCardGlow,
          { shadowColor: borderGlow as any },
        ]} />
      )}

      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.premiumCard,
          {
            width: cardWidth,
            height: cardHeight,
          },
        ]}
        accessible
        accessibilityLabel={`${match.name}, ${match.age} years old, from ${match.location}. ${isOnline ? 'Currently online' : 'Offline'}. Matched ${match.matchedTime} ago.`}
        accessibilityRole="button"
        accessibilityHint="Tap to see details and send a message"
      >
        {/* Image Section with Gradient Overlay */}
        <View style={[styles.premiumCardImageContainer, { height: imageHeight }]}>
          {!imageError ? (
            <>
              <Image
                source={{ uri: match.image }}
                style={styles.premiumCardImage}
                resizeMode="cover"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => setImageError(true)}
              />
              {/* Subtle vignette overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.03)']}
                style={styles.premiumCardImageOverlay}
              />
            </>
          ) : (
            <LinearGradient
              colors={['#F8F8F8', '#EFEFEF']}
              style={styles.premiumCardImagePlaceholder}
            >
              <Feather name="user" size={48} color={iOS.colors.tertiaryLabel} />
            </LinearGradient>
          )}

          {imageLoading && !imageError && (
            <View style={styles.premiumCardImageLoading}>
              <ActivityIndicator color={iOS.colors.systemOrange} size="small" />
            </View>
          )}

          {/* Premium Online Badge with Glow */}
          {isOnline && (
            <View style={styles.premiumOnlineBadgeContainer}>
              <LinearGradient
                colors={['#34C759', '#30D158']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumOnlineBadge}
              >
                <View style={styles.premiumOnlineDot} />
                <Text style={styles.premiumOnlineText}>Online</Text>
              </LinearGradient>
            </View>
          )}

          {/* Premium New Badge */}
          {match.isNew && (
            <View style={styles.premiumNewBadgeContainer}>
              <LinearGradient
                colors={iOS.colors.orangeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumNewBadge}
              >
                <Text style={styles.premiumNewText}>NEW</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Premium Info Section with Glass Effect */}
        <View style={styles.premiumCardInfo}>
          <Text style={styles.premiumCardName} numberOfLines={1}>
            {match.name}, {match.age}
          </Text>
          <View style={styles.premiumCardLocationRow}>
            <View style={styles.premiumLocationIcon}>
              <Feather name="map-pin" size={10} color={iOS.colors.systemOrange} />
            </View>
            <Text style={styles.premiumCardLocation} numberOfLines={1}>
              {match.location}
            </Text>
          </View>
          <View style={styles.premiumCardTimeRow}>
            <Feather name="clock" size={10} color={iOS.colors.tertiaryLabel} />
            <Text style={styles.premiumCardTime} numberOfLines={1}>
              {match.matchedTime}
            </Text>
          </View>
        </View>

        {/* Subtle shine effect */}
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'transparent', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumCardShine}
        />
      </Pressable>
    </Animated.View>
  );
};

// ============================================================================
// PREMIUM EMPTY STATE
// ============================================================================
interface EmptyStateProps {
  activeFilter: FilterType;
  onFilterPress: (filter: FilterType) => void;
  onDiscoverPress: () => void;
}

const PremiumEmptyState: React.FC<EmptyStateProps> = ({
  activeFilter,
  onFilterPress,
  onDiscoverPress,
}) => {
  const getContent = () => {
    switch (activeFilter) {
      case 'new':
        return {
          icon: 'star' as const,
          title: 'No New Matches Yet',
          message: 'When someone new matches with you, they\'ll appear here.',
          buttonText: 'View All Matches',
          onPress: () => onFilterPress('all'),
        };
      case 'online':
        return {
          icon: 'wifi' as const,
          title: 'No One Online',
          message: 'Check back later to see who\'s available to chat.',
          buttonText: 'View All Matches',
          onPress: () => onFilterPress('all'),
        };
      default:
        return {
          icon: 'heart' as const,
          title: 'No Matches Yet',
          message: 'Start discovering people to find your perfect match!',
          buttonText: 'Start Discovering',
          onPress: onDiscoverPress,
        };
    }
  };

  const content = getContent();

  return (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <LinearGradient
          colors={iOS.colors.orangeGradient}
          style={styles.emptyStateIconGradient}
        >
          <Feather name={content.icon} size={48} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyStateTitle}>{content.title}</Text>
      <Text style={styles.emptyStateMessage}>{content.message}</Text>
      <Pressable
        onPress={content.onPress}
        style={({ pressed }) => [
          styles.emptyStateButton,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
      >
        <LinearGradient
          colors={iOS.colors.orangeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyStateButtonGradient}
        >
          <Text style={styles.emptyStateButtonText}>{content.buttonText}</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
};

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================
export const MatchesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MatchesScreenNavigationProp>();
  const { width, isTablet, isLandscape } = useResponsive();

  // State
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const matchForActionRef = useRef<Match | null>(null);

  // Data
  const { onlineUserIds } = usePresenceStore();
  const filterResult = useFilteredMatches(activeFilter);
  const displayMatches = filterResult?.matches ?? [];
  const counts = filterResult?.counts ?? { all: 0, new: 0, online: 0 };
  const isLoading = filterResult?.isLoading ?? false;
  const refetch = filterResult?.refetch ?? (() => Promise.resolve());

  // Calculate online count from presence store
  const realTimeOnlineCount = useMemo(() => {
    const allMatches = filterResult?.allMatches ?? [];
    return allMatches.filter(m => onlineUserIds.has(m.matchedUserId)).length;
  }, [filterResult?.allMatches, onlineUserIds]);

  // Segment data
  const segments = useMemo(() => [
    { key: 'all' as FilterType, label: 'All', count: counts?.all ?? 0 },
    { key: 'new' as FilterType, label: 'New', count: counts?.new ?? 0 },
    { key: 'online' as FilterType, label: 'Online', count: realTimeOnlineCount ?? 0 },
  ], [counts, realTimeOnlineCount]);

  const selectedIndex = useMemo(() => {
    return segments.findIndex(s => s.key === activeFilter);
  }, [activeFilter, segments]);

  // Handlers
  const handleFilterSelect = useCallback((index: number) => {
    setActiveFilter(segments[index].key);
  }, [segments]);

  const handleMatchPress = useCallback((match: Match) => {
    matchForActionRef.current = match;
    setSelectedMatch(match);
    setShowQuickView(true);
    AccessibilityInfo.announceForAccessibility(`Viewing ${match.name}'s profile`);
  }, []);

  const handleCloseQuickView = useCallback(() => {
    setShowQuickView(false);
  }, []);

  const handleViewProfile = useCallback(() => {
    const match = matchForActionRef.current;
    setShowQuickView(false);
    if (match) {
      navigation.navigate('ProfileDetail', {
        userId: String(match.matchedUserId),
        userName: match.name,
        userPhoto: match.image,
      });
    }
  }, [navigation]);

  const handleSendMessage = useCallback(() => {
    const match = matchForActionRef.current;
    setShowQuickView(false);
    if (match) {
      const conversationId = match.conversationId
        ? String(match.conversationId)
        : `new_${match.matchedUserId}`;

      navigation.navigate('MessagesTab', {
        screen: 'Chat',
        params: {
          conversationId,
          userName: match.name,
          userPhoto: match.image,
          userId: match.matchedUserId,
        },
      });
    }
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch {}
    setIsRefreshing(false);
  }, [refetch]);

  const handleDiscoverPress = useCallback(() => {
    navigation.navigate('DiscoverTab' as never);
  }, [navigation]);

  // Grid calculations
  const numColumns = isTablet ? 3 : 2;
  const cardWidth = isTablet ? 200 : 165;
  const cardGap = iOS.spacing.m;
  const horizontalPadding = iOS.spacing.l;

  const renderItem = useCallback(({ item }: { item: Match }) => (
    <PremiumMatchCard
      match={item}
      isOnline={onlineUserIds.has(item.matchedUserId)}
      onPress={() => handleMatchPress(item)}
      isTablet={isTablet}
    />
  ), [onlineUserIds, handleMatchPress, isTablet]);

  const keyExtractor = useCallback((item: Match) => item.id, []);

  // Header opacity based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Gradient Background */}
      <LinearGradient
        colors={iOS.colors.heroGradient}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Blur Header (shows on scroll) */}
      <Animated.View
        style={[styles.blurHeader, { opacity: headerOpacity, paddingTop: insets.top }]}
        pointerEvents="none"
      >
        <BlurView intensity={80} tint="light" style={styles.blurHeaderContent}>
          <Text style={styles.blurHeaderTitle}>Matches</Text>
        </BlurView>
      </Animated.View>

      {/* Main Content */}
      <Animated.FlatList
        data={displayMatches}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        key={`matches-${numColumns}`}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + iOS.spacing.l,
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: horizontalPadding,
          },
        ]}
        columnWrapperStyle={numColumns > 1 ? { gap: cardGap, marginBottom: cardGap } : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[iOS.colors.systemOrange]}
            tintColor={iOS.colors.systemOrange}
            progressViewOffset={insets.top + 60}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Hero Section */}
            <PremiumHeroSection matchCount={counts.all} isTablet={isTablet} />

            {/* Segmented Control */}
            <PremiumSegmentedControl
              segments={segments}
              selectedIndex={selectedIndex}
              onSelect={handleFilterSelect}
            />

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeFilter === 'all' ? 'All Your Matches' :
                 activeFilter === 'new' ? 'New Matches' : 'Online Now'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {displayMatches.length} {displayMatches.length === 1 ? 'person' : 'people'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <PremiumEmptyState
              activeFilter={activeFilter}
              onFilterPress={(filter) => setActiveFilter(filter)}
              onDiscoverPress={handleDiscoverPress}
            />
          ) : null
        }
        renderItem={renderItem}
      />

      {/* Loading Overlay */}
      {isLoading && !isRefreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={iOS.colors.systemOrange} />
        </View>
      )}

      {/* Quick View Modal */}
      <QuickViewModal
        match={selectedMatch}
        visible={showQuickView}
        isOnline={selectedMatch ? onlineUserIds.has(selectedMatch.matchedUserId) : false}
        onClose={handleCloseQuickView}
        onViewProfile={handleViewProfile}
        onSendMessage={handleSendMessage}
      />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: iOS.colors.systemBackground,
  },

  // Blur Header
  blurHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  blurHeaderContent: {
    paddingVertical: iOS.spacing.m,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },
  blurHeaderTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },

  // List
  listContent: {
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: iOS.spacing.xl,
  },

  // Hero Section
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: iOS.spacing.xxl,
    paddingVertical: iOS.spacing.s,
  },
  heroIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPulseRing: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 149, 0, 0.3)',
  },
  heroIconContainer: {
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  heroIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  heroCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: iOS.colors.systemRed,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: iOS.colors.systemRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  heroCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroTextContainer: {
    flex: 1,
    marginLeft: iOS.spacing.l,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: iOS.colors.label,
    marginBottom: iOS.spacing.xs,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: iOS.colors.secondaryLabel,
    lineHeight: 22,
  },
  heroHighlight: {
    fontWeight: '600',
    color: iOS.colors.systemOrange,
  },

  // Segmented Control
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: iOS.colors.tertiarySystemFill,
    borderRadius: iOS.radius.m,
    padding: iOS.spacing.xs,
    marginBottom: iOS.spacing.xxl,
    position: 'relative',
  },
  segmentedSlider: {
    position: 'absolute',
    top: iOS.spacing.xs,
    bottom: iOS.spacing.xs,
    left: iOS.spacing.xs,
    borderRadius: iOS.radius.s,
    overflow: 'hidden',
  },
  segmentedSliderGradient: {
    flex: 1,
    borderRadius: iOS.radius.s,
  },
  segmentedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: iOS.spacing.m,
    gap: iOS.spacing.xs,
    zIndex: 1,
  },
  segmentedText: {
    ...iOS.typography.subhead,
    fontWeight: '600',
    color: iOS.colors.secondaryLabel,
  },
  segmentedTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  segmentedBadge: {
    backgroundColor: iOS.colors.systemOrange,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  segmentedBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  segmentedBadgeText: {
    ...iOS.typography.caption2,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  segmentedBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Section Header
  sectionHeader: {
    marginBottom: iOS.spacing.l,
  },
  sectionTitle: {
    ...iOS.typography.title3,
    color: iOS.colors.label,
    marginBottom: iOS.spacing.xs,
  },
  sectionSubtitle: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
  },

  // Super Premium Card
  premiumCardWrapper: {
    position: 'relative',
  },
  premiumCardGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: iOS.radius.xxl + 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  premiumCard: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  premiumCardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    borderTopLeftRadius: iOS.radius.xxl,
    borderTopRightRadius: iOS.radius.xxl,
  },
  premiumCardImageContainer: {
    overflow: 'hidden',
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  premiumCardImage: {
    width: '100%',
    height: '100%',
  },
  premiumCardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  premiumCardImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumCardImageLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  premiumOnlineBadgeContainer: {
    position: 'absolute',
    top: iOS.spacing.m,
    left: iOS.spacing.m,
    borderRadius: iOS.radius.full,
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  premiumOnlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.s + 2,
    paddingVertical: iOS.spacing.xs + 1,
    gap: iOS.spacing.xs,
  },
  premiumOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  premiumOnlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  premiumNewBadgeContainer: {
    position: 'absolute',
    top: iOS.spacing.m,
    right: iOS.spacing.m,
    borderRadius: iOS.radius.s,
    overflow: 'hidden',
    shadowColor: iOS.colors.systemOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  premiumNewBadge: {
    paddingHorizontal: iOS.spacing.s + 2,
    paddingVertical: iOS.spacing.xs + 1,
  },
  premiumNewText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  premiumCardInfo: {
    padding: iOS.spacing.m + 2,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  premiumCardName: {
    fontSize: 17,
    fontWeight: '700',
    color: iOS.colors.label,
    marginBottom: iOS.spacing.xs + 2,
    letterSpacing: -0.4,
  },
  premiumCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iOS.spacing.xs,
    marginBottom: iOS.spacing.xs,
  },
  premiumLocationIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumCardLocation: {
    fontSize: 13,
    fontWeight: '500',
    color: iOS.colors.secondaryLabel,
    flex: 1,
    letterSpacing: -0.1,
  },
  premiumCardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iOS.spacing.xs,
    marginTop: 2,
  },
  premiumCardTime: {
    fontSize: 12,
    fontWeight: '500',
    color: iOS.colors.tertiaryLabel,
    letterSpacing: 0,
  },

  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: iOS.spacing.xxxxl,
    paddingHorizontal: iOS.spacing.xxl,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: iOS.spacing.xxl,
    ...iOS.shadow.medium,
  },
  emptyStateIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    ...iOS.typography.title2,
    color: iOS.colors.label,
    textAlign: 'center',
    marginBottom: iOS.spacing.s,
  },
  emptyStateMessage: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: iOS.spacing.xxl,
    maxWidth: 280,
  },
  emptyStateButton: {
    borderRadius: iOS.radius.full,
    overflow: 'hidden',
    ...iOS.shadow.medium,
  },
  emptyStateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: iOS.spacing.l,
    paddingHorizontal: iOS.spacing.xxl,
    gap: iOS.spacing.s,
  },
  emptyStateButtonText: {
    ...iOS.typography.headline,
    color: '#FFFFFF',
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: iOS.colors.systemBackground,
    borderTopLeftRadius: iOS.radius.xxxl,
    borderTopRightRadius: iOS.radius.xxxl,
    paddingTop: iOS.spacing.s,
    ...iOS.shadow.large,
  },
  modalHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: iOS.colors.systemFill,
    alignSelf: 'center',
    marginBottom: iOS.spacing.l,
  },
  modalCloseButton: {
    position: 'absolute',
    top: iOS.spacing.l,
    right: iOS.spacing.l,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: iOS.colors.tertiarySystemFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalImageContainer: {
    height: 240,
    marginHorizontal: iOS.spacing.l,
    borderRadius: iOS.radius.xl,
    overflow: 'hidden',
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOnlineBadge: {
    position: 'absolute',
    top: iOS.spacing.m,
    left: iOS.spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.95)',
    paddingHorizontal: iOS.spacing.m,
    paddingVertical: iOS.spacing.s,
    borderRadius: iOS.radius.full,
    gap: iOS.spacing.xs,
  },
  modalInfo: {
    padding: iOS.spacing.xl,
    alignItems: 'center',
  },
  modalName: {
    ...iOS.typography.title1,
    color: iOS.colors.label,
    marginBottom: iOS.spacing.s,
  },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iOS.spacing.xs,
    marginBottom: iOS.spacing.xs,
  },
  modalLocation: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
  },
  modalTime: {
    ...iOS.typography.subhead,
    color: iOS.colors.tertiaryLabel,
  },
  modalActions: {
    paddingHorizontal: iOS.spacing.l,
    gap: iOS.spacing.m,
  },
  modalPrimaryButton: {
    borderRadius: iOS.radius.full,
    overflow: 'hidden',
    ...iOS.shadow.medium,
  },
  modalPrimaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: iOS.spacing.l,
    gap: iOS.spacing.s,
  },
  modalPrimaryButtonText: {
    ...iOS.typography.headline,
    color: '#FFFFFF',
  },
  modalSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: iOS.spacing.l,
    gap: iOS.spacing.s,
    borderRadius: iOS.radius.full,
    borderWidth: 2,
    borderColor: iOS.colors.systemOrange,
  },
  modalSecondaryButtonText: {
    ...iOS.typography.headline,
    color: iOS.colors.systemOrange,
  },
});

export default MatchesScreen;
