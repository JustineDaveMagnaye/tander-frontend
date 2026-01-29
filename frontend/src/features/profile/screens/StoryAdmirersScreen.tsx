/**
 * TANDER Story Admirers Screen
 * Full-screen view of all received story comments with Like Back functionality
 *
 * Features:
 * - All received comments (pending and matched)
 * - Filter tabs: All | Pending | Matched
 * - Large cards with sender photo, name, age, location
 * - Full message text
 * - Like Back / Pass actions for pending comments
 * - Senior-friendly design (56-64px touch targets)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows, touchTargets } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import {
  useStoryCommentsStore,
  selectReceivedComments,
  selectIsLoading,
  selectPendingComments,
} from '@/store/storyCommentsStore';
import { StoryComment, StoryCommentStatus, LikeBackResponse } from '@shared/types';

// =============================================================================
// TYPES
// =============================================================================

type FilterTab = 'all' | 'pending' | 'matched';

interface StoryAdmirersScreenProps {
  onBack: () => void;
  onNavigateToChat?: (matchId: number, userName: string, userPhoto?: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const StoryAdmirersScreen: React.FC<StoryAdmirersScreenProps> = ({
  onBack,
  onNavigateToChat,
}) => {
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape, wp, hp } = useResponsive();

  // Store
  const comments = useStoryCommentsStore(selectReceivedComments);
  const isLoading = useStoryCommentsStore(selectIsLoading);
  const { fetchReceivedComments, likeBack, declineComment, markAsRead } = useStoryCommentsStore();

  // State
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [likingBackId, setLikingBackId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{
    name: string;
    photo?: string;
    matchId?: number;
  } | null>(null);

  // Filtered comments based on active tab
  const filteredComments = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return comments.filter((c) => c.status === 'PENDING');
      case 'matched':
        return comments.filter((c) => c.status === 'LIKED_BACK');
      default:
        return comments;
    }
  }, [comments, activeTab]);

  // Counts for tabs
  const pendingCount = useMemo(
    () => comments.filter((c) => c.status === 'PENDING').length,
    [comments]
  );
  const matchedCount = useMemo(
    () => comments.filter((c) => c.status === 'LIKED_BACK').length,
    [comments]
  );

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReceivedComments();
    setRefreshing(false);
  }, [fetchReceivedComments]);

  // Fetch on mount
  useEffect(() => {
    fetchReceivedComments();
  }, [fetchReceivedComments]);

  // Format time ago
  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  }, []);

  // Like back handler
  const handleLikeBack = useCallback(
    async (comment: StoryComment) => {
      if (likingBackId) return;

      setLikingBackId(comment.id);
      try {
        const response = await likeBack(comment.id);

        if (response.success && response.isMatch) {
          setMatchedUser({
            name: comment.senderName,
            photo: comment.senderPhoto,
            matchId: response.match?.id,
          });
          setShowMatchModal(true);
        }
      } catch (error) {
        console.warn('Failed to like back:', error);
      } finally {
        setLikingBackId(null);
      }
    },
    [likeBack, likingBackId]
  );

  // Decline handler
  const handleDecline = useCallback(
    async (comment: StoryComment) => {
      if (decliningId) return;

      setDecliningId(comment.id);
      try {
        await declineComment(comment.id);
      } catch (error) {
        console.warn('Failed to decline:', error);
      } finally {
        setDecliningId(null);
      }
    },
    [declineComment, decliningId]
  );

  // Mark as read when viewing
  const handleViewComment = useCallback(
    (comment: StoryComment) => {
      if (!comment.isRead) {
        markAsRead(comment.id);
      }
    },
    [markAsRead]
  );

  // Responsive values
  const screenPadding = isTablet ? spacing.xl : spacing.m;
  const cardPadding = isTablet ? spacing.l : spacing.m;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: screenPadding }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={28} color={colors.gray[800]} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Story Admirers</Text>
          <Text style={styles.headerSubtitle}>
            {comments.length} {comments.length === 1 ? 'person' : 'people'} admire your story
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabsContainer, { paddingHorizontal: screenPadding }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
          accessibilityLabel={`All ${comments.length} admirers`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'all' }}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({comments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.7}
          accessibilityLabel={`${pendingCount} pending admirers`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'pending' }}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matched' && styles.tabActive]}
          onPress={() => setActiveTab('matched')}
          activeOpacity={0.7}
          accessibilityLabel={`${matchedCount} matched admirers`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'matched' }}
        >
          <Text style={[styles.tabText, activeTab === 'matched' && styles.tabTextActive]}>
            Matched ({matchedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: screenPadding, paddingBottom: insets.bottom + spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.orange[500]}
            colors={[colors.orange[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && comments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.orange[500]} />
            <Text style={styles.loadingText}>Loading admirers...</Text>
          </View>
        ) : filteredComments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather
              name={activeTab === 'matched' ? 'heart' : 'inbox'}
              size={64}
              color={colors.gray[300]}
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'matched'
                ? 'No matches yet'
                : activeTab === 'pending'
                ? 'No pending admirers'
                : 'No admirers yet'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'matched'
                ? "When you like someone back, they'll appear here"
                : activeTab === 'pending'
                ? 'New admirers will appear here'
                : 'When someone loves your story, their message will appear here'}
            </Text>
          </View>
        ) : (
          filteredComments.map((comment) => (
            <View
              key={comment.id}
              style={[
                styles.commentCard,
                { padding: cardPadding },
                !comment.isRead && styles.commentCardUnread,
              ]}
              onLayout={() => handleViewComment(comment)}
            >
              {/* Header with photo and info */}
              <View style={styles.commentHeader}>
                {comment.senderPhoto ? (
                  <Image
                    source={{ uri: comment.senderPhoto }}
                    style={styles.senderPhoto}
                    accessibilityLabel={`Photo of ${comment.senderName}`}
                  />
                ) : (
                  <View style={styles.senderPhotoPlaceholder}>
                    <Feather name="user" size={32} color={colors.romantic.pink} />
                  </View>
                )}
                <View style={styles.senderInfo}>
                  <Text style={styles.senderName}>
                    {comment.senderName}
                    {comment.senderAge ? `, ${comment.senderAge}` : ''}
                  </Text>
                  {comment.senderLocation && (
                    <View style={styles.locationRow}>
                      <Feather name="map-pin" size={14} color={colors.gray[500]} />
                      <Text style={styles.senderLocation}>{comment.senderLocation}</Text>
                    </View>
                  )}
                  <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
                </View>

                {/* Status badge */}
                {comment.status === 'LIKED_BACK' && (
                  <View style={styles.matchedBadge}>
                    <Feather name="heart" size={14} color={colors.white} />
                    <Text style={styles.matchedBadgeText}>Matched</Text>
                  </View>
                )}
                {!comment.isRead && comment.status === 'PENDING' && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </View>

              {/* Message */}
              <View style={styles.messageContainer}>
                <Text style={styles.messageText}>{comment.message}</Text>
              </View>

              {/* Actions for pending comments */}
              {comment.status === 'PENDING' && (
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.declineButton, decliningId === comment.id && styles.buttonDisabled]}
                    onPress={() => handleDecline(comment)}
                    disabled={decliningId === comment.id || likingBackId === comment.id}
                    activeOpacity={0.7}
                    accessibilityLabel={`Pass on ${comment.senderName}`}
                    accessibilityRole="button"
                  >
                    {decliningId === comment.id ? (
                      <ActivityIndicator size="small" color={colors.gray[500]} />
                    ) : (
                      <>
                        <Feather name="x" size={20} color={colors.gray[600]} />
                        <Text style={styles.declineButtonText}>Pass</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.likeBackButton, likingBackId === comment.id && styles.buttonDisabled]}
                    onPress={() => handleLikeBack(comment)}
                    disabled={likingBackId === comment.id || decliningId === comment.id}
                    activeOpacity={0.7}
                    accessibilityLabel={`Like back ${comment.senderName} to match instantly`}
                    accessibilityRole="button"
                  >
                    {likingBackId === comment.id ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Feather name="heart" size={20} color={colors.white} />
                        <Text style={styles.likeBackButtonText}>Like Back</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Chat button for matched comments */}
              {comment.status === 'LIKED_BACK' && comment.linkedMatchId && onNavigateToChat && (
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() =>
                    onNavigateToChat(comment.linkedMatchId!, comment.senderName, comment.senderPhoto)
                  }
                  activeOpacity={0.7}
                  accessibilityLabel={`Start chatting with ${comment.senderName}`}
                  accessibilityRole="button"
                >
                  <Feather name="message-circle" size={20} color={colors.white} />
                  <Text style={styles.chatButtonText}>Send Message</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Match Celebration Modal */}
      <Modal
        visible={showMatchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMatchModal(false)}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={styles.matchModalBackdrop}>
          <View style={[styles.matchModalContainer, isTablet && styles.matchModalContainerTablet]}>
            <LinearGradient
              colors={[colors.orange[500], colors.teal[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.matchModalGradient}
            >
              <View style={styles.matchModalIcon}>
                <Feather name="heart" size={48} color={colors.white} />
              </View>

              {matchedUser?.photo ? (
                <Image source={{ uri: matchedUser.photo }} style={styles.matchModalPhoto} />
              ) : (
                <View style={styles.matchModalPhotoPlaceholder}>
                  <Feather name="user" size={40} color={colors.white} />
                </View>
              )}

              <Text style={styles.matchModalTitle}>It's a Match!</Text>
              <Text style={styles.matchModalSubtitle}>
                You and {matchedUser?.name || 'your admirer'} liked each other
              </Text>

              <View style={styles.matchModalActions}>
                <TouchableOpacity
                  style={styles.matchModalButtonPrimary}
                  onPress={() => {
                    setShowMatchModal(false);
                    if (matchedUser?.matchId && onNavigateToChat) {
                      onNavigateToChat(matchedUser.matchId, matchedUser.name, matchedUser.photo);
                    }
                    setMatchedUser(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="message-circle" size={22} color={colors.orange[600]} />
                  <Text style={styles.matchModalButtonPrimaryText}>Send Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.matchModalButtonSecondary}
                  onPress={() => {
                    setShowMatchModal(false);
                    setMatchedUser(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.matchModalButtonSecondaryText}>Keep Browsing</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.gray[600],
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingVertical: spacing.m,
    backgroundColor: colors.white,
    gap: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.s,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTargets.medium,
  },
  tabActive: {
    backgroundColor: colors.orange[500],
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
  },
  tabTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.m,
    gap: spacing.m,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: 18,
    color: colors.gray[500],
    marginTop: spacing.m,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[700],
    marginTop: spacing.l,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 17,
    color: colors.gray[500],
    marginTop: spacing.s,
    textAlign: 'center',
    lineHeight: 26,
  },
  commentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge,
    ...shadows.medium,
    borderWidth: 2,
    borderColor: colors.gray[100],
  },
  commentCardUnread: {
    borderColor: colors.orange[300],
    backgroundColor: colors.romantic.warmWhite,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
  },
  senderPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.orange[200],
  },
  senderPhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.romantic.blush,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.romantic.pinkLight,
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  senderLocation: {
    fontSize: 15,
    color: colors.gray[600],
  },
  commentTime: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 4,
  },
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.teal[500],
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.round,
  },
  matchedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  newBadge: {
    backgroundColor: colors.orange[500],
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.round,
  },
  newBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  messageContainer: {
    marginTop: spacing.m,
    padding: spacing.m,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  messageText: {
    fontSize: 17,
    color: colors.gray[800],
    lineHeight: 26,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.m,
    marginTop: spacing.l,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.large,
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[200],
    minHeight: touchTargets.comfortable,
  },
  declineButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray[600],
  },
  likeBackButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.large,
    backgroundColor: colors.orange[500],
    minHeight: touchTargets.comfortable,
  },
  likeBackButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    marginTop: spacing.l,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.large,
    backgroundColor: colors.teal[500],
    minHeight: touchTargets.comfortable,
  },
  chatButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  // Match modal styles
  matchModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  matchModalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: borderRadius.xlarge,
    overflow: 'hidden',
    ...shadows.large,
  },
  matchModalContainerTablet: {
    maxWidth: 420,
  },
  matchModalGradient: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  matchModalIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  matchModalPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.white,
    marginBottom: spacing.l,
  },
  matchModalPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  matchModalTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  matchModalSubtitle: {
    fontSize: 17,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  matchModalActions: {
    width: '100%',
    gap: spacing.m,
  },
  matchModalButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    backgroundColor: colors.white,
    paddingVertical: spacing.m + 2,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.large,
    minHeight: touchTargets.comfortable,
  },
  matchModalButtonPrimaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.orange[600],
  },
  matchModalButtonSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
    minHeight: touchTargets.medium,
  },
  matchModalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    opacity: 0.9,
  },
});

export default StoryAdmirersScreen;
