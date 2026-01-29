/**
 * useNewMatches Hook
 * Fetches new matches that don't have conversations yet
 *
 * Uses centralized presence store for accurate online status
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getNewMatches, MatchDTO } from '@services/api/matchesApi';
import { useAuthStore } from '@store/authStore';
import { usePresenceStore } from '@store/presenceStore';

export interface NewMatch {
  id: string;
  matchId: number;
  userId: number;
  username: string;
  name: string;
  avatar: string;
  avatarUrl: string | null;
  online: boolean;
  hasNotification: boolean;
  matchedAt: Date;
  expiresAt: Date | null;
  hoursUntilExpiration: number | null;
}

interface UseNewMatchesReturn {
  newMatches: NewMatch[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Convert backend MatchDTO to frontend NewMatch format
 */
function convertDTOToNewMatch(dto: MatchDTO): NewMatch {
  return {
    id: dto.id.toString(),
    matchId: dto.id,
    userId: dto.matchedUserId,
    username: dto.matchedUsername,
    name: dto.matchedUserDisplayName || dto.matchedUsername,
    avatar: (dto.matchedUserDisplayName || dto.matchedUsername).charAt(0).toUpperCase(),
    avatarUrl: dto.matchedUserProfilePhotoUrl,
    online: false, // Will be set by presence store
    hasNotification: !dto.chatStarted, // New matches without chat are notifications
    matchedAt: new Date(dto.matchedAt),
    expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    hoursUntilExpiration: dto.hoursUntilExpiration,
  };
}

export function useNewMatches(): UseNewMatchesReturn {
  const user = useAuthStore((state) => state.user);
  const [newMatches, setNewMatches] = useState<NewMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use centralized presence store - this triggers re-renders when presence changes
  const { onlineUserIds, lastUpdated } = usePresenceStore();

  /**
   * Fetch new matches from API
   */
  const fetchNewMatches = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getNewMatches();

      const converted = data.map(convertDTOToNewMatch);

      // Sort by matchedAt (newest first)
      converted.sort((a, b) => b.matchedAt.getTime() - a.matchedAt.getTime());

      setNewMatches(converted);
    } catch (err) {
      console.warn('[useNewMatches] Error fetching:', err);
      setError(err instanceof Error ? err.message : 'Failed to load new matches');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    fetchNewMatches();
  }, [fetchNewMatches]);

  /**
   * Derive online status from centralized presence store
   * This effect runs whenever the presence store updates (lastUpdated changes)
   */
  useEffect(() => {
    if (newMatches.length === 0) return;

    // Update matches with current online status from store
    setNewMatches((prev) => {
      let hasChanges = false;
      const updated = prev.map((match) => {
        const isOnline = onlineUserIds.has(match.userId);
        if (match.online !== isOnline) {
          hasChanges = true;
          return { ...match, online: isOnline };
        }
        return match;
      });
      // Only return new array if there were changes
      return hasChanges ? updated : prev;
    });
  }, [onlineUserIds, lastUpdated]); // Re-run when presence store changes

  /**
   * Refresh when app comes to foreground
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchNewMatches();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [fetchNewMatches]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchNewMatches();
  }, [fetchNewMatches]);

  return {
    newMatches,
    isLoading,
    error,
    refresh,
  };
}

export default useNewMatches;
