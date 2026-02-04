/**
 * TANDER Call History Screen - iOS Premium Design
 * Displays call logs with filtering and call-back functionality
 *
 * Design: iOS Human Interface Guidelines
 * - Clean system background (#F2F2F7)
 * - iOS-style segmented control for filters
 * - Card-based call items with icon badges
 * - Haptic feedback on interactions
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  StatusBar,
  RefreshControl,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { twilioApi, type CallHistoryItem } from '@services/api/twilioApi';
import { useAuthStore } from '@store/authStore';
import type { MessagesStackParamList, CallType } from '@navigation/types';

// =============================================================================
// iOS DESIGN SYSTEM
// =============================================================================

const iOS = {
  colors: {
    // Backgrounds
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',
    // Labels
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C4399',
    quaternaryLabel: '#3C3C4366',
    // Separators
    separator: '#3C3C4336',
    opaqueSeparator: '#C6C6C8',
    // System Colors
    systemRed: '#FF3B30',
    systemGreen: '#34C759',
    systemBlue: '#007AFF',
    systemOrange: '#FF9500',
    systemTeal: '#5AC8FA',
    systemPurple: '#AF52DE',
    systemGray: '#8E8E93',
    systemGray2: '#AEAEB2',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',
    // TANDER Brand
    tander: {
      orange: '#F97316',
      teal: '#14B8A6',
    },
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    small: 8,
    medium: 10,
    large: 12,
    xlarge: 16,
    pill: 999,
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
};

// =============================================================================
// TYPES
// =============================================================================

interface CallLogDTO {
  id: number;
  callSessionId: number;
  roomName: string;
  callerId: number;
  receiverId: number;
  callerUsername: string;
  receiverUsername: string;
  roomId: string;
  startedAt: string;
  callType: 'video' | 'voice';
  status: string;
  durationSeconds: number | null;
  isOutgoing: boolean;
}

type CallStatus = 'INITIATED' | 'RINGING' | 'CONNECTED' | 'ENDED' | 'MISSED' | 'DECLINED' | 'FAILED' | 'ANSWERED' | 'REJECTED';
type MessagesNavigationProp = NativeStackNavigationProp<MessagesStackParamList>;
type CallFilter = 'all' | 'voice' | 'video' | 'missed';

interface CallHistoryScreenProps {
  onBack: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CALL_ITEM_HEIGHT = 76;
const FILTER_STORAGE_KEY = 'call_history_filter';

const FILTER_OPTIONS: { key: CallFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'voice', label: 'Voice' },
  { key: 'video', label: 'Video' },
  { key: 'missed', label: 'Missed' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDuration = (seconds: number | null): string => {
  if (!seconds || seconds <= 0) return 'No answer';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const formatCallTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getCallStatusInfo = (
  status: CallStatus,
  isOutgoing: boolean
): { text: string; color: string; icon: keyof typeof Feather.glyphMap } => {
  switch (status) {
    case 'ANSWERED':
    case 'ENDED':
      return {
        text: isOutgoing ? 'Outgoing' : 'Incoming',
        color: iOS.colors.systemGreen,
        icon: isOutgoing ? 'phone-outgoing' : 'phone-incoming',
      };
    case 'MISSED':
      return {
        text: 'Missed',
        color: iOS.colors.systemRed,
        icon: 'phone-missed',
      };
    case 'REJECTED':
      return {
        text: 'Declined',
        color: iOS.colors.systemOrange,
        icon: 'phone-off',
      };
    case 'FAILED':
      return {
        text: 'Failed',
        color: iOS.colors.systemRed,
        icon: 'alert-circle',
      };
    default:
      return {
        text: status,
        color: iOS.colors.systemGray,
        icon: 'phone',
      };
  }
};

// =============================================================================
// SEGMENTED CONTROL COMPONENT
// =============================================================================

interface SegmentedControlProps {
  options: { key: CallFilter; label: string }[];
  selectedKey: CallFilter;
  onChange: (key: CallFilter) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = React.memo(
  ({ options, selectedKey, onChange }) => {
    const handlePress = useCallback(
      (key: CallFilter) => {
        Haptics.selectionAsync();
        onChange(key);
      },
      [onChange]
    );

    return (
      <View style={styles.segmentedControl}>
        {options.map((option, index) => {
          const isSelected = selectedKey === option.key;
          const isFirst = index === 0;
          const isLast = index === options.length - 1;

          return (
            <Pressable
              key={option.key}
              style={({ pressed }) => [
                styles.segmentedOption,
                isFirst && styles.segmentedOptionFirst,
                isLast && styles.segmentedOptionLast,
                isSelected && styles.segmentedOptionSelected,
                pressed && !isSelected && styles.segmentedOptionPressed,
              ]}
              onPress={() => handlePress(option.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Filter by ${option.label}`}
            >
              <Text
                style={[
                  styles.segmentedOptionText,
                  isSelected && styles.segmentedOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
);

SegmentedControl.displayName = 'SegmentedControl';

// =============================================================================
// CALL ITEM COMPONENT
// =============================================================================

interface CallItemProps {
  call: CallLogDTO;
  currentUserId: string | number;
  onCallBack: (call: CallLogDTO, callType: CallType) => void;
  isFirst: boolean;
  isLast: boolean;
}

const CallItem: React.FC<CallItemProps> = React.memo(
  ({ call, currentUserId, onCallBack, isFirst, isLast }) => {
    const isOutgoing = call.callerId === currentUserId;
    const otherUserName = isOutgoing ? call.receiverUsername : call.callerUsername;
    const statusInfo = getCallStatusInfo(call.status as CallStatus, isOutgoing);

    const initials = otherUserName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const handleVoiceCall = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onCallBack(call, 'voice');
    }, [call, onCallBack]);

    const handleVideoCall = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onCallBack(call, 'video');
    }, [call, onCallBack]);

    const isMissed = call.status === 'MISSED';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.callItem,
          isFirst && styles.callItemFirst,
          isLast && styles.callItemLast,
          pressed && styles.callItemPressed,
        ]}
        onPress={handleVoiceCall}
        accessibilityRole="button"
        accessibilityLabel={`${otherUserName}, ${statusInfo.text} ${call.callType} call`}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: call.callType === 'video' ? iOS.colors.tander.orange : iOS.colors.tander.teal },
            ]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {/* Call Type Badge */}
          <View
            style={[
              styles.callTypeBadge,
              { backgroundColor: call.callType === 'video' ? iOS.colors.tander.orange : iOS.colors.tander.teal },
            ]}
          >
            <Feather
              name={call.callType === 'video' ? 'video' : 'phone'}
              size={10}
              color="#FFFFFF"
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.callItemContent}>
          <View style={styles.callItemHeader}>
            <Text
              style={[styles.callItemName, isMissed && styles.callItemNameMissed]}
              numberOfLines={1}
            >
              {otherUserName}
            </Text>
            <Text style={styles.callItemTime}>{formatCallTime(call.startedAt)}</Text>
          </View>
          <View style={styles.callItemSubtitle}>
            <Feather
              name={statusInfo.icon}
              size={14}
              color={statusInfo.color}
              style={styles.statusIcon}
            />
            <Text style={[styles.callItemStatus, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
            {call.durationSeconds && call.durationSeconds > 0 && (
              <Text style={styles.callItemDuration}>
                {' · '}{formatDuration(call.durationSeconds)}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.callItemActions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleVoiceCall}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Voice call ${otherUserName}`}
          >
            <Feather name="phone" size={20} color={iOS.colors.tander.teal} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleVideoCall}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Video call ${otherUserName}`}
          >
            <Feather name="video" size={20} color={iOS.colors.tander.orange} />
          </Pressable>
        </View>

        {/* Separator */}
        {!isLast && <View style={styles.itemSeparator} />}
      </Pressable>
    );
  }
);

CallItem.displayName = 'CallItem';

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

interface EmptyStateProps {
  filter: CallFilter;
}

const EmptyState: React.FC<EmptyStateProps> = ({ filter }) => {
  const getMessage = () => {
    switch (filter) {
      case 'voice':
        return { title: 'No Voice Calls', subtitle: 'Your voice call history will appear here' };
      case 'video':
        return { title: 'No Video Calls', subtitle: 'Your video call history will appear here' };
      case 'missed':
        return { title: 'No Missed Calls', subtitle: "You haven't missed any calls" };
      default:
        return { title: 'No Calls Yet', subtitle: 'Start a call to see your history here' };
    }
  };

  const { title, subtitle } = getMessage();

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Feather name="phone" size={48} color={iOS.colors.systemGray3} />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>
    </View>
  );
};

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

interface ErrorStateProps {
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry }) => {
  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRetry();
  }, [onRetry]);

  return (
    <View style={styles.errorState}>
      <View style={styles.errorStateIcon}>
        <Feather name="wifi-off" size={48} color={iOS.colors.systemGray3} />
      </View>
      <Text style={styles.errorStateTitle}>Unable to Load</Text>
      <Text style={styles.errorStateSubtitle}>
        Check your connection and try again
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.retryButton,
          pressed && styles.retryButtonPressed,
        ]}
        onPress={handleRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading call history"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );
};

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

const LoadingState: React.FC = () => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, [bounceAnim]);

  return (
    <View style={styles.loadingState}>
      <Animated.View
        style={[
          styles.loadingIcon,
          { transform: [{ translateY: bounceAnim }] },
        ]}
      >
        <Feather name="phone" size={32} color={iOS.colors.tander.orange} />
      </Animated.View>
      <Text style={styles.loadingStateText}>Loading calls...</Text>
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CallHistoryScreen: React.FC<CallHistoryScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MessagesNavigationProp>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || 0;

  const [activeFilter, setActiveFilter] = useState<CallFilter>('all');
  const isNavigatingRef = useRef(false);

  // Load persisted filter
  useEffect(() => {
    AsyncStorage.getItem(FILTER_STORAGE_KEY)
      .then((saved) => {
        if (saved && ['all', 'voice', 'video', 'missed'].includes(saved)) {
          setActiveFilter(saved as CallFilter);
        }
      })
      .catch(() => {});
  }, []);

  // Reset navigation guard on focus
  useFocusEffect(
    useCallback(() => {
      isNavigatingRef.current = false;
    }, [])
  );

  const handleFilterChange = useCallback((filter: CallFilter) => {
    setActiveFilter(filter);
    AsyncStorage.setItem(FILTER_STORAGE_KEY, filter).catch(() => {});
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onBack();
  }, [onBack]);

  // Fetch call history
  const {
    data: calls = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['callHistory'],
    queryFn: async () => {
      const history = await twilioApi.getCallHistory(100);
      return history.map((item: CallHistoryItem): CallLogDTO => ({
        ...item,
        id: item.callSessionId,
        callerUsername: `User ${item.callerId}`,
        receiverUsername: `User ${item.receiverId}`,
        roomId: item.roomName,
        startedAt: item.startTime,
        callType: item.callType.toLowerCase() as 'video' | 'voice',
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  // Filter calls
  const filteredCalls = useMemo(() => {
    if (activeFilter === 'all') return calls;
    return calls.filter((call) => {
      switch (activeFilter) {
        case 'voice':
          return call.callType === 'voice';
        case 'video':
          return call.callType === 'video';
        case 'missed':
          return call.status === 'MISSED' || call.status === 'REJECTED';
        default:
          return true;
      }
    });
  }, [calls, activeFilter]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleCallBack = useCallback(
    (call: CallLogDTO, callType: CallType) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      const isOutgoing = call.callerId === currentUserId;
      const otherUserId = isOutgoing ? call.receiverId : call.callerId;
      const otherUserName = isOutgoing ? call.receiverUsername : call.callerUsername;

      navigation.navigate('Call', {
        conversationId: call.roomId,
        userId: otherUserId,
        userName: otherUserName,
        callType,
        isIncoming: false,
      });

      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    },
    [navigation, currentUserId]
  );

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: CALL_ITEM_HEIGHT,
      offset: CALL_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CallLogDTO; index: number }) => (
      <CallItem
        call={item}
        currentUserId={currentUserId}
        onCallBack={handleCallBack}
        isFirst={index === 0}
        isLast={index === filteredCalls.length - 1}
      />
    ),
    [currentUserId, handleCallBack, filteredCalls.length]
  );

  const keyExtractor = useCallback((item: CallLogDTO) => item.id.toString(), []);

  const ListEmptyComponent = useMemo(() => {
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState onRetry={handleRefresh} />;
    return <EmptyState filter={activeFilter} />;
  }, [isLoading, isError, activeFilter, handleRefresh]);

  const contentContainerStyle = useMemo(
    () => [
      styles.listContent,
      { paddingBottom: Math.max(insets.bottom, iOS.spacing.xxl) },
      filteredCalls.length === 0 && styles.listContentEmpty,
      (isTablet || isLandscape) && styles.listContentWide,
    ],
    [insets.bottom, filteredCalls.length, isTablet, isLandscape]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={iOS.colors.secondarySystemBackground}
        translucent={Platform.OS === 'android'}
      />

      {/* iOS-Style Navigation Bar */}
      <View style={[styles.navBar, (isTablet || isLandscape) && styles.navBarWide]}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={handleBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back to Settings"
        >
          <Feather name="chevron-left" size={28} color={iOS.colors.systemBlue} />
          <Text style={styles.backButtonText}>Settings</Text>
        </Pressable>
        <Text style={styles.navTitle} pointerEvents="none">Calls</Text>
        <View style={styles.navBarSpacer} />
      </View>

      {/* Content Container */}
      <View style={[styles.content, (isTablet || isLandscape) && styles.contentWide]}>
        {/* Segmented Control */}
        <View style={styles.filterSection}>
          <SegmentedControl
            options={FILTER_OPTIONS}
            selectedKey={activeFilter}
            onChange={handleFilterChange}
          />
        </View>

        {/* Call List */}
        {filteredCalls.length > 0 && (
          <View style={styles.listCard}>
            <FlatList
              data={filteredCalls}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={contentContainerStyle}
              ListEmptyComponent={ListEmptyComponent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={handleRefresh}
                  tintColor={iOS.colors.tander.orange}
                />
              }
            />
          </View>
        )}

        {filteredCalls.length === 0 && ListEmptyComponent}
      </View>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },

  // Navigation Bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  navBarWide: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: iOS.spacing.xs,
    marginLeft: -iOS.spacing.s,
    zIndex: 1,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    ...iOS.typography.body,
    color: iOS.colors.systemBlue,
    marginLeft: -iOS.spacing.xs,
  },
  navTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  navBarSpacer: {
    width: 100,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: iOS.spacing.l,
  },
  contentWide: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },

  // Filter Section
  filterSection: {
    marginBottom: iOS.spacing.l,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: iOS.colors.systemGray5,
    borderRadius: iOS.radius.small,
    padding: 2,
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: iOS.spacing.s,
    paddingHorizontal: iOS.spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: iOS.radius.small - 2,
  },
  segmentedOptionFirst: {},
  segmentedOptionLast: {},
  segmentedOptionSelected: {
    backgroundColor: iOS.colors.systemBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  segmentedOptionPressed: {
    backgroundColor: iOS.colors.systemGray4,
  },
  segmentedOptionText: {
    ...iOS.typography.subhead,
    fontWeight: '500',
    color: iOS.colors.secondaryLabel,
  },
  segmentedOptionTextSelected: {
    color: iOS.colors.label,
    fontWeight: '600',
  },

  // List Card
  listCard: {
    flex: 1,
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    overflow: 'hidden',
  },

  // List Content
  listContent: {
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  listContentWide: {},

  // Call Item
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.systemBackground,
    minHeight: CALL_ITEM_HEIGHT,
  },
  callItemFirst: {
    borderTopLeftRadius: iOS.radius.large,
    borderTopRightRadius: iOS.radius.large,
  },
  callItemLast: {
    borderBottomLeftRadius: iOS.radius.large,
    borderBottomRightRadius: iOS.radius.large,
  },
  callItemPressed: {
    backgroundColor: iOS.colors.systemGray5,
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
    marginRight: iOS.spacing.m,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  callTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: iOS.colors.systemBackground,
  },

  // Call Item Content
  callItemContent: {
    flex: 1,
    marginRight: iOS.spacing.s,
  },
  callItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  callItemName: {
    ...iOS.typography.body,
    fontWeight: '500',
    color: iOS.colors.label,
    flex: 1,
  },
  callItemNameMissed: {
    color: iOS.colors.systemRed,
  },
  callItemTime: {
    ...iOS.typography.footnote,
    color: iOS.colors.tertiaryLabel,
    marginLeft: iOS.spacing.s,
  },
  callItemSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 4,
  },
  callItemStatus: {
    ...iOS.typography.subhead,
  },
  callItemDuration: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
  },

  // Call Item Actions
  callItemActions: {
    flexDirection: 'row',
    gap: iOS.spacing.s,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: iOS.colors.systemGray6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPressed: {
    backgroundColor: iOS.colors.systemGray4,
  },

  // Item Separator
  itemSeparator: {
    position: 'absolute',
    bottom: 0,
    left: 82,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: iOS.colors.separator,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.xxl,
    paddingVertical: iOS.spacing.xxl * 2,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: iOS.colors.systemGray6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.l,
  },
  emptyStateTitle: {
    ...iOS.typography.title3,
    color: iOS.colors.label,
    marginBottom: iOS.spacing.s,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
  },

  // Error State
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.xxl,
    paddingVertical: iOS.spacing.xxl * 2,
  },
  errorStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: iOS.colors.systemGray6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.l,
  },
  errorStateTitle: {
    ...iOS.typography.title3,
    color: iOS.colors.label,
    marginBottom: iOS.spacing.s,
    textAlign: 'center',
  },
  errorStateSubtitle: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
    marginBottom: iOS.spacing.xl,
  },
  retryButton: {
    paddingHorizontal: iOS.spacing.xl,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.tander.orange,
    borderRadius: iOS.radius.large,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    ...iOS.typography.headline,
    color: '#FFFFFF',
  },

  // Loading State
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: iOS.spacing.xxl * 2,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: iOS.colors.systemGray6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.l,
  },
  loadingStateText: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
  },
});

export default CallHistoryScreen;
