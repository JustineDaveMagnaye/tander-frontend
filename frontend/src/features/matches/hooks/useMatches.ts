/**
 * TANDER useMatches Hook
 * TanStack Query hooks for matches feature
 *
 * Provides:
 * - useMatches: Fetch all matches
 * - useCategorizedMatches: Fetch Bumble-style categorized matches
 * - useNewMatches: Fetch new matches only
 * - useMatchStats: Fetch match statistics
 * - useSwipe: Mutation for recording swipes
 * - useUnmatch: Mutation for unmatching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  matchesApi,
  type MatchDTO,
  type SwipeRequest,
  type SwipeResponse,
} from '@services/api/matchesApi';
import type { Match, FilterType } from '../types';

// ============================================================================
// Query Keys
// ============================================================================

export const matchesQueryKeys = {
  all: ['matches'] as const,
  list: () => [...matchesQueryKeys.all, 'list'] as const,
  categorized: () => [...matchesQueryKeys.all, 'categorized'] as const,
  new: () => [...matchesQueryKeys.all, 'new'] as const,
  inbox: () => [...matchesQueryKeys.all, 'inbox'] as const,
  waitingForMe: () => [...matchesQueryKeys.all, 'waitingForMe'] as const,
  waitingForThem: () => [...matchesQueryKeys.all, 'waitingForThem'] as const,
  stats: () => [...matchesQueryKeys.all, 'stats'] as const,
  detail: (id: number) => [...matchesQueryKeys.all, 'detail', id] as const,
};

// ============================================================================
// Transform Functions - Backend DTO to Frontend Type
// ============================================================================

/**
 * Calculate time string from hours ago (e.g., "5h 20m")
 */
const formatMatchedTime = (matchedAt: string): string => {
  const matchDate = new Date(matchedAt);
  const now = new Date();
  const diffMs = now.getTime() - matchDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const minutes = Math.floor(diffMs / (1000 * 60));
    return `${minutes}m`;
  } else if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    const minutes = Math.floor((diffHours - hours) * 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(diffHours / 24);
    return `${days}d`;
  }
};

/**
 * Transform backend MatchDTO to frontend Match type
 */
export const transformMatchDTO = (dto: MatchDTO): Match => {
  const matchedAt = new Date(dto.matchedAt);
  const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Calculate hours since match
  const now = new Date();
  const matchedHours = (now.getTime() - matchedAt.getTime()) / (1000 * 60 * 60);

  // Determine if this is a "new" match (no messages sent yet, matched within 24h)
  const isNew = !dto.chatStarted && dto.firstMessageSenderId === null && matchedHours < 24;

  return {
    id: String(dto.id),
    name: dto.matchedUserDisplayName || dto.matchedUsername || 'Unknown',
    age: dto.matchedUserAge ?? 0, // Use nullish coalescing for better 0 handling
    location: dto.matchedUserLocation || '',
    status: dto.isOnline ? 'online' : 'offline',
    matchedTime: formatMatchedTime(dto.matchedAt),
    matchedHours: matchedHours,
    image: dto.matchedUserProfilePhotoUrl || '',
    images: dto.matchedUserProfilePhotoUrl ? [dto.matchedUserProfilePhotoUrl] : [],
    hasLike: false, // Backend doesn't track "super likes" yet
    isNew: isNew,
    bio: dto.matchedUserBio || '',
    interests: [], // Backend doesn't include interests in MatchDTO
    occupation: '', // Backend doesn't include occupation
    education: '', // Backend doesn't include education
    height: '', // Backend doesn't include height
    lookingFor: '', // Backend doesn't include lookingFor
    distance: '', // Backend doesn't include distance calculation
    // Additional fields
    photoUrl: dto.matchedUserProfilePhotoUrl || '',
    isOnline: dto.isOnline,
    hasNewMessage: dto.waitingForUserReply,
    matchedAt: matchedAt,
    expiresAt: expiresAt,
    hasFirstMessage: dto.firstMessageSenderId !== null,
    // Backend references for navigation
    conversationId: dto.conversationId,
    matchedUserId: dto.matchedUserId,
  };
};

/**
 * Transform array of MatchDTOs with deduplication
 */
export const transformMatchDTOs = (dtos: MatchDTO[]): Match[] => {
  // Deduplicate by ID to prevent React key warnings
  const seen = new Set<number>();
  const uniqueDtos = dtos.filter((dto) => {
    if (seen.has(dto.id)) {
      return false;
    }
    seen.add(dto.id);
    return true;
  });
  return uniqueDtos.map(transformMatchDTO);
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all matches as a list
 */
export const useMatches = () => {
  return useQuery({
    queryKey: matchesQueryKeys.list(),
    queryFn: async () => {
      const data = await matchesApi.getMatchesList();
      return transformMatchDTOs(data);
    },
    staleTime: 15 * 1000, // 15 seconds (reduced for more frequent expiration checks)
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    refetchInterval: 60 * 1000, // Refetch every minute to catch expired matches
  });
};

/**
 * Fetch categorized matches (Bumble-style)
 */
export const useCategorizedMatches = () => {
  return useQuery({
    queryKey: matchesQueryKeys.categorized(),
    queryFn: async () => {
      const data = await matchesApi.getCategorizedMatches();
      return {
        chatStarted: transformMatchDTOs(data.chatStarted),
        waitingForUserReply: transformMatchDTOs(data.waitingForUserReply),
        waitingForOtherReply: transformMatchDTOs(data.waitingForOtherReply),
        newMatches: transformMatchDTOs(data.newMatches),
        // Computed properties
        all: [
          ...transformMatchDTOs(data.chatStarted),
          ...transformMatchDTOs(data.waitingForUserReply),
          ...transformMatchDTOs(data.waitingForOtherReply),
          ...transformMatchDTOs(data.newMatches),
        ],
        totalCount: data.chatStarted.length + data.waitingForUserReply.length +
          data.waitingForOtherReply.length + data.newMatches.length,
      };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch new matches only
 */
export const useNewMatches = () => {
  return useQuery({
    queryKey: matchesQueryKeys.new(),
    queryFn: async () => {
      const data = await matchesApi.getNewMatches();
      return transformMatchDTOs(data);
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch inbox matches (fully started chats)
 */
export const useInboxMatches = () => {
  return useQuery({
    queryKey: matchesQueryKeys.inbox(),
    queryFn: async () => {
      const data = await matchesApi.getInboxMatches();
      return transformMatchDTOs(data);
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch match statistics
 */
export const useMatchStats = () => {
  return useQuery({
    queryKey: matchesQueryKeys.stats(),
    queryFn: matchesApi.getMatchStats,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Record a swipe mutation
 */
export const useSwipe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SwipeRequest) => matchesApi.recordSwipe(request),
    onSuccess: (data: SwipeResponse) => {
      // If it's a match, invalidate matches queries
      if (data.isMatch) {
        queryClient.invalidateQueries({ queryKey: matchesQueryKeys.all });
      }
    },
  });
};

/**
 * Unmatch mutation
 */
export const useUnmatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: number) => matchesApi.unmatch(matchId),
    onSuccess: () => {
      // Invalidate all matches queries
      queryClient.invalidateQueries({ queryKey: matchesQueryKeys.all });
    },
  });
};

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Filter out expired matches (no first message and past expiration)
 */
const filterExpiredMatches = (matches: Match[]): Match[] => {
  const now = Date.now();
  return matches.filter((match) => {
    // Keep if first message was sent (timer stopped)
    if (match.hasFirstMessage) return true;

    // Filter out if expired
    const expiresAt = new Date(match.expiresAt).getTime();
    return now < expiresAt;
  });
};

/**
 * Hook to get filtered matches
 * Automatically filters out expired matches (24-hour rule)
 */
export const useFilteredMatches = (filter: FilterType) => {
  const { data: matches, isLoading, error, refetch } = useMatches();

  // First filter out expired matches
  const activeMatches = matches ? filterExpiredMatches(matches) : [];

  // Then apply the selected filter
  const filteredMatches = activeMatches.filter((match) => {
    switch (filter) {
      case 'new':
        return match.isNew;
      case 'online':
        return match.isOnline;
      default:
        return true;
    }
  });

  // Counts based on active (non-expired) matches only
  const counts = {
    all: activeMatches.length,
    new: activeMatches.filter((m) => m.isNew).length,
    online: activeMatches.filter((m) => m.isOnline).length,
  };

  return {
    matches: filteredMatches,
    allMatches: activeMatches,
    counts,
    isLoading,
    error,
    refetch,
  };
};

export default {
  useMatches,
  useCategorizedMatches,
  useNewMatches,
  useInboxMatches,
  useMatchStats,
  useSwipe,
  useUnmatch,
  useFilteredMatches,
};
