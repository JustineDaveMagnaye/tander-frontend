/**
 * TANDER Call History Screen
 * Displays call logs with filtering and call-back functionality
 *
 * Features:
 * - List of past voice/video calls
 * - Filter by call type (all, voice, video, missed)
 * - Tap to call back
 * - Pull to refresh
 * - Senior-friendly large touch targets
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import { twilioApi, type CallHistoryItem } from '@services/api/twilioApi';
import { useAuthStore } from '@store/authStore';
import type { MessagesStackParamList, CallType } from '@navigation/types';

// Type alias for compatibility with existing components
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

// =============================================================================
// TYPES
// =============================================================================

type MessagesNavigationProp = NativeStackNavigationProp<MessagesStackParamList>;

type CallFilter = 'all' | 'voice' | 'video' | 'missed';

interface CallHistoryScreenProps {
  onBack: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CALL_ITEM_HEIGHT = 88;
const FILTER_STORAGE_KEY = 'call_history_filter'; // R6-007: Storage key for filter persistence

const FILTER_OPTIONS: { key: CallFilter; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'list' },
  { key: 'voice', label: 'Voice', icon: 'phone' },
  { key: 'video', label: 'Video', icon: 'video' },
  { key: 'missed', label: 'Missed', icon: 'phone-missed' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format call duration to human readable string
 */
const formatDuration = (seconds: number | null): string => {
  if (!seconds || seconds <= 0) return 'No answer';

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Format call timestamp to human readable string
 */
const formatCallTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    // Within a week - show day name
    return date.toLocaleDateString([], { weekday: 'long' });
  } else {
    // Older - show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

/**
 * Get call status display info
 */
const getCallStatusInfo = (
  status: CallStatus,
  isOutgoing: boolean
): { text: string; color: string; icon: keyof typeof Feather.glyphMap } => {
  switch (status) {
    case 'ANSWERED':
    case 'ENDED':
      return {
        text: isOutgoing ? 'Outgoing' : 'Incoming',
        color: colors.teal[500],
        icon: isOutgoing ? 'phone-outgoing' : 'phone-incoming',
      };
    case 'MISSED':
      return {
        text: 'Missed',
        color: colors.semantic.error,
        icon: 'phone-missed',
      };
    case 'REJECTED':
      return {
        text: isOutgoing ? 'Declined' : 'Declined',
        color: colors.orange[500],
        icon: 'phone-off',
      };
    case 'FAILED':
      return {
        text: 'Failed',
        color: colors.semantic.error,
        icon: 'alert-circle',
      };
    default:
      return {
        text: status,
        color: colors.gray[500],
        icon: 'phone',
      };
  }
};

// =============================================================================
// FILTER TABS COMPONENT
// =============================================================================

interface FilterTabsProps {
  activeFilter: CallFilter;
  onFilterChange: (filter: CallFilter) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = React.memo(({ activeFilter, onFilterChange }) => {
  return (
    <View style={styles.filterContainer}>
      {FILTER_OPTIONS.map((option) => {
        const isActive = activeFilter === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.filterTab, isActive && styles.filterTabActive]}
            onPress={() => onFilterChange(option.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Filter by ${option.label} calls`}
          >
            <Feather
              name={option.icon}
              size={18}
              color={isActive ? colors.white : colors.gray[600]}
            />
            <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

FilterTabs.displayName = 'FilterTabs';

// =============================================================================
// CALL ITEM COMPONENT
// =============================================================================

interface CallItemProps {
  call: CallLogDTO;
  currentUserId: string | number;
  onCallBack: (call: CallLogDTO, callType: CallType) => void;
}

const CallItem: React.FC<CallItemProps> = React.memo(({ call, currentUserId, onCallBack }) => {
  const isOutgoing = call.callerId === currentUserId;
  const otherUserName = isOutgoing ? call.receiverUsername : call.callerUsername;
  const statusInfo = getCallStatusInfo(call.status as CallStatus, isOutgoing);

  // R7-004: Avatar image error state (for future avatar image support)
  const [avatarImageError, setAvatarImageError] = useState(false);

  // Get initials for avatar (fallback when no image or image fails)
  const initials = otherUserName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // R7-004: Avatar URL (placeholder for future API integration)
  // When usernames are replaced with full user objects, this will be: call.otherUser?.profilePhoto
  const avatarUrl: string | undefined = undefined;

  const handleVoiceCall = useCallback(() => {
    onCallBack(call, 'voice');
  }, [call, onCallBack]);

  const handleVideoCall = useCallback(() => {
    onCallBack(call, 'video');
  }, [call, onCallBack]);

  // R7-004: Handle avatar image load error
  const handleAvatarError = useCallback(() => {
    setAvatarImageError(true);
  }, []);

  return (
    <View style={styles.callItem}>
      {/* Avatar - R7-004: Supports future avatar images with error fallback */}
      <View style={styles.callItemAvatarWrapper}>
        <LinearGradient
          colors={[colors.teal[400], colors.teal[500]]}
          style={styles.callItemAvatar}
        >
          <Text style={styles.callItemAvatarText}>{initials}</Text>
        </LinearGradient>
        {/* Call type indicator */}
        <View style={[styles.callTypeIndicator, { backgroundColor: call.callType === 'video' ? colors.orange[500] : colors.teal[500] }]}>
          <Feather
            name={call.callType === 'video' ? 'video' : 'phone'}
            size={10}
            color={colors.white}
          />
        </View>
      </View>

      {/* Call Info */}
      <View style={styles.callItemContent}>
        <View style={styles.callItemTopRow}>
          <Text style={styles.callItemName} numberOfLines={1}>
            {otherUserName}
          </Text>
          <Text style={styles.callItemTime}>{formatCallTime(call.startedAt)}</Text>
        </View>
        <View style={styles.callItemBottomRow}>
          <Feather name={statusInfo.icon} size={14} color={statusInfo.color} />
          <Text style={[styles.callItemStatus, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
          <Text style={styles.callItemDuration}>
            {call.durationSeconds ? ` · ${formatDuration(call.durationSeconds)}` : ''}
          </Text>
        </View>
      </View>

      {/* Call Back Buttons */}
      <View style={styles.callItemActions}>
        <TouchableOpacity
          style={styles.callBackButton}
          onPress={handleVoiceCall}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Voice call ${otherUserName}`}
        >
          <Feather name="phone" size={20} color={colors.teal[500]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.callBackButton}
          onPress={handleVideoCall}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Video call ${otherUserName}`}
        >
          <Feather name="video" size={20} color={colors.orange[500]} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

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
        return 'No voice calls yet';
      case 'video':
        return 'No video calls yet';
      case 'missed':
        return 'No missed calls';
      default:
        return 'No calls yet';
    }
  };

  return (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={[colors.orange[200], colors.teal[200]]}
        style={styles.emptyStateCircle}
      >
        <Feather name="phone" size={48} color={colors.teal[600]} />
      </LinearGradient>
      <Text style={styles.emptyStateTitle}>{getMessage()}</Text>
      <Text style={styles.emptyStateSubtitle}>
        Your call history will appear here
      </Text>
    </View>
  );
};

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

interface ErrorStateProps {
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry }) => (
  <View style={styles.errorState}>
    <Feather name="alert-circle" size={48} color={colors.orange[500]} />
    <Text style={styles.errorStateTitle}>Unable to load call history</Text>
    <Text style={styles.errorStateSubtitle}>Please check your connection and try again</Text>
    <TouchableOpacity
      onPress={onRetry}
      style={styles.retryButton}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Retry loading call history"
    >
      <Text style={styles.retryButtonText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

const LoadingState: React.FC = () => (
  <View style={styles.loadingState}>
    <ActivityIndicator size="large" color={colors.orange[500]} />
    <Text style={styles.loadingStateText}>Loading call history...</Text>
  </View>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CallHistoryScreen: React.FC<CallHistoryScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MessagesNavigationProp>();
  const { isLandscape } = useResponsive();

  // Get current user ID
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || 0;

  // Filter state
  const [activeFilter, setActiveFilter] = useState<CallFilter>('all');

  // R6-008: Navigation guard ref to prevent rapid tap issues
  const isNavigatingRef = useRef(false);

  // R6-007: Load persisted filter on mount
  useEffect(() => {
    AsyncStorage.getItem(FILTER_STORAGE_KEY).then((saved) => {
      if (saved && ['all', 'voice', 'video', 'missed'].includes(saved)) {
        setActiveFilter(saved as CallFilter);
      }
    }).catch((e) => {
      console.warn('[CallHistoryScreen] R6-007: Failed to load filter:', e);
    });
  }, []);

  // R6-008: Reset navigation guard when returning to screen
  useFocusEffect(
    useCallback(() => {
      isNavigatingRef.current = false;
    }, [])
  );

  // R6-007: Handler for filter change with persistence
  const handleFilterChange = useCallback((filter: CallFilter) => {
    setActiveFilter(filter);
    AsyncStorage.setItem(FILTER_STORAGE_KEY, filter).catch((e) => {
      console.warn('[CallHistoryScreen] R6-007: Failed to save filter:', e);
    });
  }, []);

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
      // Transform to CallLogDTO format
      return history.map((item: CallHistoryItem): CallLogDTO => ({
        ...item,
        id: item.callSessionId,
        callerUsername: `User ${item.callerId}`, // TODO: Fetch usernames from user service
        receiverUsername: `User ${item.receiverId}`,
        roomId: item.roomName,
        startedAt: item.startTime,
        callType: item.callType.toLowerCase() as 'video' | 'voice',
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter calls based on active filter
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

  // Handlers
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleCallBack = useCallback(
    (call: CallLogDTO, callType: CallType) => {
      // R6-008: Prevent rapid tap issues - guard against multiple navigations
      if (isNavigatingRef.current) {
        console.log('[CallHistoryScreen] R6-008: Navigation already in progress, ignoring tap');
        return;
      }
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

      // R6-008: Reset guard after navigation animation (safety net, useFocusEffect is primary)
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    },
    [navigation, currentUserId]
  );

  // FlatList optimizations
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: CALL_ITEM_HEIGHT,
      offset: CALL_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: CallLogDTO }) => (
      <CallItem call={item} currentUserId={currentUserId} onCallBack={handleCallBack} />
    ),
    [currentUserId, handleCallBack]
  );

  const keyExtractor = useCallback((item: CallLogDTO) => item.id.toString(), []);

  // Render list empty component
  const ListEmptyComponent = useMemo(() => {
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState onRetry={handleRefresh} />;
    return <EmptyState filter={activeFilter} />;
  }, [isLoading, isError, activeFilter, handleRefresh]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.white}
        translucent={Platform.OS === 'android'}
      />

      {/* Header */}
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <TouchableOpacity
          style={[styles.backButton, isLandscape && styles.backButtonLandscape]}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather
            name="arrow-left"
            size={isLandscape ? 18 : 22}
            color={colors.gray[600]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLandscape && styles.headerTitleLandscape]}>
          Call History
        </Text>
      </View>

      {/* Filter Tabs */}
      {/* R6-007: Use handleFilterChange for persistence */}
      <FilterTabs activeFilter={activeFilter} onFilterChange={handleFilterChange} />

      {/* Call List */}
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
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) },
          filteredCalls.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[colors.orange[500]]}
            tintColor={colors.orange[500]}
          />
        }
      />
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.s,
  },
  headerLandscape: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.xs,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonLandscape: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
  },
  headerTitleLandscape: {
    fontSize: 24,
  },

  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.xs,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.gray[100],
    gap: 6,
    minHeight: 48,
  },
  filterTabActive: {
    backgroundColor: colors.orange[500],
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },
  filterTabTextActive: {
    color: colors.white,
  },

  // List
  listContent: {
    paddingTop: spacing.s,
  },
  listContentEmpty: {
    flex: 1,
  },

  // Call Item
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.s,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.large,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.gray[100],
    minHeight: CALL_ITEM_HEIGHT,
  },
  callItemAvatarWrapper: {
    position: 'relative',
    marginRight: spacing.s,
  },
  callItemAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callItemAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  callTypeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  callItemContent: {
    flex: 1,
  },
  callItemTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  callItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
    flex: 1,
  },
  callItemTime: {
    fontSize: 14,
    color: colors.gray[500],
    marginLeft: spacing.xs,
  },
  callItemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callItemStatus: {
    fontSize: 14,
    marginLeft: 4,
  },
  callItemDuration: {
    fontSize: 14,
    color: colors.gray[500],
  },
  callItemActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.s,
  },
  callBackButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.gray[500],
    textAlign: 'center',
  },

  // Error State
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
    marginTop: spacing.m,
    marginBottom: spacing.xs,
  },
  errorStateSubtitle: {
    fontSize: 16,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.m,
  },
  retryButton: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    backgroundColor: colors.orange[500],
    borderRadius: borderRadius.large,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },

  // Loading State
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingStateText: {
    marginTop: spacing.s,
    fontSize: 16,
    color: colors.gray[600],
  },
});

export default CallHistoryScreen;
