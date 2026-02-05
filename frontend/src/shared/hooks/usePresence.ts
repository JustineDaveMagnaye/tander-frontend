/**
 * TANDER usePresence Hook
 *
 * Simple wrapper around the centralized presence store.
 * Provides a hook-based API for checking if users are online.
 *
 * The actual presence tracking is handled by:
 * - WebSocketProvider: Subscribes to STOMP presence events
 * - presenceStore: Zustand store that holds the single source of truth
 */

import { usePresenceStore, selectIsUserOnline, selectOnlineCount } from '@store/presenceStore';

export type PresenceStatus = 'online' | 'recently_active' | 'offline';

/**
 * Hook to access presence data
 * Call this in components that need to react to presence changes
 */
export function usePresence() {
  // Subscribe to the presence store - components will re-render when presence changes
  const { onlineUserIds, lastUpdated, initialized } = usePresenceStore();

  return {
    // Check if a specific user is online
    isUserOnline: (userId: number) => onlineUserIds.has(userId),

    // Get all online user IDs
    onlineUserIds,

    // Get count of online users
    onlineCount: onlineUserIds.size,

    // Timestamp of last update
    lastUpdated,

    // Whether initial online list has been received
    initialized,
  };
}

/**
 * Hook to check if a specific user is online
 * More efficient than usePresence() when you only need one user's status
 */
export function useIsUserOnline(userId: number): boolean {
  return usePresenceStore(selectIsUserOnline(userId));
}

/**
 * Hook to get the count of online users
 */
export function useOnlineCount(): number {
  return usePresenceStore(selectOnlineCount);
}

export default usePresence;
