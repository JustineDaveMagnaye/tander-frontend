/**
 * TANDER MatchesScreen - PREMIUM REDESIGN
 * A modern, premium dating app experience for Filipino seniors (50+)
 *
 * Design Inspiration: Bumble, Hinge, Tinder Premium
 *
 * Key Features:
 * - Romantic warm color palette (Orange/Teal/Pink)
 * - Glassmorphism effects and beautiful gradients
 * - Celebration animations for match counts
 * - Photo-forward card design with elegant overlays
 * - Senior-friendly touch targets (56-64px minimum)
 * - WCAG AA contrast compliance (4.5:1 minimum)
 * - Responsive across all devices (iPhone SE to iPad Pro)
 * - Reduce motion support for accessibility
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  Platform,
  AccessibilityInfo,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Network from 'expo-network';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@shared/styles/colors';
import { usePresenceStore } from '@store/presenceStore';
import type { MatchesStackParamList, MainTabParamList } from '@navigation/types';
import type { Match, FilterType } from '../types';
import { useFilteredMatches, useMatchesResponsive } from '../hooks';
import {
  MatchesHeader,
  FilterTabs,
  ProfileViewModal,
  QuickViewModal,
  MatchCardItem,
  MatchesLoadingState,
  MatchesErrorState,
  MatchesEmptyState,
} from '../components';

type MatchesNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MatchesStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

// Extended filter types for new filters
export type ExtendedFilterType = FilterType | 'compatible' | 'recent' | 'nearby';

export const MatchesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MatchesNavigationProp>();

  // Get all responsive values from the hook
  const {
    width,
    height,
    isTablet,
    isLandscape,
    isCompactMode,
    isVerySmallScreen,
    fontSizes,
    spacing,
    cardDimensions,
    buttonHeight,
    filterTabHeight,
    headerIconSize,
    headerIconContainerSize,
    safePaddingLeft,
    safePaddingRight,
  } = useMatchesResponsive();

  // State
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 120],
    outputRange: [1, 0.95, 0.9],
    extrapolate: 'clamp',
  });

  // Ref to track match for navigation
  const matchForActionRef = useRef<Match | null>(null);

  // Presence store for online status
  const { onlineUserIds } = usePresenceStore();

  // Check for reduced motion accessibility setting
  useEffect(() => {
    let isMounted = true;
    const checkReduceMotion = async () => {
      try {
        const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        if (isMounted) {
          setReduceMotion(isReduceMotionEnabled);
        }
      } catch {
        if (isMounted) setReduceMotion(false);
      }
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => {
        if (isMounted) setReduceMotion(isEnabled);
      }
    );

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  // Network check
  useEffect(() => {
    let isMounted = true;
    const checkNetwork = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (isMounted) {
          setIsOffline(!state.isConnected || !state.isInternetReachable);
        }
      } catch {
        if (isMounted) setIsOffline(false);
      }
    };
    checkNetwork();
    const interval = setInterval(checkNetwork, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Data from hook
  const { matches: filteredMatches, allMatches, counts, isLoading, error, refetch } =
    useFilteredMatches(activeFilter);

  // Real-time online count from presence store
  const realTimeOnlineCount = useMemo(
    () => allMatches.filter((m) => onlineUserIds.has(m.matchedUserId)).length,
    [allMatches, onlineUserIds]
  );

  // Display matches based on filter
  const displayMatches = useMemo(
    () =>
      activeFilter === 'online'
        ? allMatches.filter((m) => onlineUserIds.has(m.matchedUserId))
        : filteredMatches,
    [activeFilter, allMatches, filteredMatches, onlineUserIds]
  );

  // Handlers
  const handleFilterPress = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
  }, []);

  const handleMatchPress = useCallback((match: Match) => {
    setSelectedMatch(match);
    matchForActionRef.current = match;
    setShowQuickView(true);
  }, []);

  const handleCloseQuickView = useCallback(() => setShowQuickView(false), []);
  const handleCloseProfileView = useCallback(() => setShowProfileView(false), []);

  const handleViewProfile = useCallback(() => {
    setShowQuickView(false);
    setTimeout(() => setShowProfileView(true), 300);
  }, []);

  const handleSendMessage = useCallback(() => {
    const match = matchForActionRef.current;
    setShowQuickView(false);
    setShowProfileView(false);
    if (match) {
      const conversationId = match.conversationId
        ? String(match.conversationId)
        : `new_${match.matchedUserId}`;
      const isNewMatch = !match.hasFirstMessage;
      navigation.navigate('MessagesTab', {
        screen: 'Chat',
        params: {
          conversationId,
          userName: match.name,
          userPhoto: match.image,
          userId: match.matchedUserId,
          expiresAt: isNewMatch ? match.expiresAt?.toISOString() : undefined,
          isNewMatch,
        },
      });
    }
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleDiscoverPress = useCallback(() => {
    navigation.navigate('DiscoverTab' as never);
  }, [navigation]);

  // Render match card
  const renderMatchCard = useCallback(
    ({ item: match, index }: { item: Match; index: number }) => (
      <MatchCardItem
        match={match}
        cardWidth={cardDimensions.cardWidth}
        cardHeight={cardDimensions.cardHeight}
        onPress={() => handleMatchPress(match)}
        isOnline={onlineUserIds.has(match.matchedUserId)}
        fontSizes={fontSizes}
        spacing={spacing}
        isCompactMode={isCompactMode}
        isVerySmallScreen={isVerySmallScreen}
        reduceMotion={reduceMotion}
        index={index}
      />
    ),
    [cardDimensions, handleMatchPress, onlineUserIds, fontSizes, spacing, isCompactMode, isVerySmallScreen, reduceMotion]
  );

  const keyExtractor = useCallback((item: Match) => item.id, []);

  // Unique key for FlatList to force re-render on layout change
  const flatListKey = useMemo(
    () => `matches-${cardDimensions.numColumns}col-${isLandscape ? 'l' : 'p'}-${isTablet ? 't' : 'p'}-${width}`,
    [cardDimensions.numColumns, isLandscape, isTablet, width]
  );

  // Calculate content padding
  const contentPadding = useMemo(() => ({
    paddingBottom: Math.max(insets.bottom + 120, 140),
    paddingHorizontal: spacing.l,
    paddingLeft: (isLandscape ? spacing.m : insets.left) + spacing.l,
    paddingRight: (isLandscape ? spacing.m : insets.right) + spacing.l,
    paddingTop: spacing.listHeaderMargin,
  }), [insets, spacing, isLandscape]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      {/* Premium Background Gradient - Orange/Teal Theme */}
      <LinearGradient
        colors={[colors.orange[50], colors.white, colors.teal[50]]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Main Content Area */}
      <View
        style={[
          styles.contentContainer,
          {
            paddingTop: insets.top,
            paddingLeft: safePaddingLeft,
            paddingRight: safePaddingRight,
          },
        ]}
      >
        {/* Premium Header Section with Animated Opacity */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              paddingTop: spacing.headerPaddingTop,
              paddingBottom: spacing.headerPaddingBottom,
              paddingLeft: isLandscape ? spacing.m : 0,
              paddingRight: isLandscape ? spacing.m : 0,
              opacity: reduceMotion ? 1 : headerOpacity,
            },
          ]}
        >
          <MatchesHeader
            matchCount={counts.all}
            newMatchCount={counts.new}
            onlineCount={realTimeOnlineCount}
            fontSizes={fontSizes}
            spacing={spacing}
            isCompactMode={isCompactMode}
            isLandscape={isLandscape}
            isTablet={isTablet}
            headerIconSize={headerIconSize}
            headerIconContainerSize={headerIconContainerSize}
            isOffline={isOffline}
            reduceMotion={reduceMotion}
          />

          {/* Premium Filter Tabs */}
          <FilterTabs
            activeFilter={activeFilter}
            counts={{ all: counts.all, new: counts.new, online: realTimeOnlineCount }}
            onFilterPress={handleFilterPress}
            fontSizes={fontSizes}
            spacing={spacing}
            filterTabHeight={filterTabHeight}
            isCompactMode={isCompactMode}
            isVerySmallScreen={isVerySmallScreen}
            isTablet={isTablet}
            reduceMotion={reduceMotion}
            insets={{ left: insets.left, right: insets.right }}
          />
        </Animated.View>

        {/* Content Area */}
        {isLoading && !isRefreshing ? (
          <MatchesLoadingState
            fontSizes={fontSizes}
            spacing={spacing}
            isTablet={isTablet}
            reduceMotion={reduceMotion}
            cardDimensions={cardDimensions}
          />
        ) : error && !isLoading ? (
          <MatchesErrorState
            isOffline={isOffline}
            onRetry={handleRefresh}
            fontSizes={fontSizes}
            spacing={spacing}
            buttonHeight={buttonHeight}
            isLandscape={isLandscape}
            isTablet={isTablet}
          />
        ) : (
          <Animated.FlatList
            data={displayMatches}
            keyExtractor={keyExtractor}
            numColumns={cardDimensions.numColumns}
            key={flatListKey}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.listContent,
              contentPadding,
              {
                minHeight: displayMatches.length === 0 ? Math.max(height * 0.55, 300) : undefined,
              },
            ]}
            columnWrapperStyle={
              cardDimensions.numColumns > 1
                ? {
                    justifyContent: isVerySmallScreen ? 'center' : 'flex-start',
                    gap: cardDimensions.cardGap,
                    flexWrap: 'wrap',
                  }
                : undefined
            }
            ItemSeparatorComponent={() => <View style={{ height: cardDimensions.cardGap }} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.orange[500], colors.teal[500]]}
                tintColor={colors.orange[500]}
                progressBackgroundColor={colors.white}
              />
            }
            ListEmptyComponent={
              <MatchesEmptyState
                activeFilter={activeFilter}
                onFilterPress={handleFilterPress}
                onDiscoverPress={handleDiscoverPress}
                fontSizes={fontSizes}
                spacing={spacing}
                buttonHeight={buttonHeight}
                isLandscape={isLandscape}
                isTablet={isTablet}
                screenWidth={width}
                reduceMotion={reduceMotion}
              />
            }
            renderItem={renderMatchCard}
            initialNumToRender={cardDimensions.numColumns * 3}
            maxToRenderPerBatch={cardDimensions.numColumns * 4}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            getItemLayout={
              cardDimensions.numColumns === 1
                ? (_, index) => ({
                    length: cardDimensions.cardHeight + cardDimensions.cardGap,
                    offset: (cardDimensions.cardHeight + cardDimensions.cardGap) * index,
                    index,
                  })
                : undefined
            }
          />
        )}
      </View>

      {/* Quick View Modal */}
      <QuickViewModal
        match={selectedMatch}
        visible={showQuickView}
        isOnline={selectedMatch ? onlineUserIds.has(selectedMatch.matchedUserId) : false}
        onClose={handleCloseQuickView}
        onViewProfile={handleViewProfile}
        onSendMessage={handleSendMessage}
        reduceMotion={reduceMotion}
      />

      {/* Full Profile View Modal */}
      <ProfileViewModal
        match={selectedMatch}
        visible={showProfileView}
        isOnline={selectedMatch ? onlineUserIds.has(selectedMatch.matchedUserId) : false}
        onClose={handleCloseProfileView}
        onSendMessage={handleSendMessage}
        reduceMotion={reduceMotion}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.orange[50],
  },
  contentContainer: {
    flex: 1,
  },
  headerSection: {
    backgroundColor: 'transparent',
  },
  listContent: {
    flexGrow: 1,
  },
});

export default MatchesScreen;
