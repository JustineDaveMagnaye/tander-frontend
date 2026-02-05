/**
 * TANDER Presence Store
 * Centralized Zustand store for real-time online presence tracking
 *
 * This is the SINGLE SOURCE OF TRUTH for who is online.
 * All components should read from this store, not manage their own presence state.
 */

import { create } from 'zustand';

interface PresenceState {
  // Set of online user IDs
  onlineUserIds: Set<number>;

  // Last update timestamp
  lastUpdated: number;

  // Whether we've received the initial online users list
  initialized: boolean;
}

interface PresenceActions {
  // Set user as online
  setUserOnline: (userId: number) => void;

  // Set user as offline
  setUserOffline: (userId: number) => void;

  // Set the complete list of online users (from initial WebSocket message)
  setOnlineUsers: (userIds: number[]) => void;

  // Check if a specific user is online
  isUserOnline: (userId: number) => boolean;

  // Get all online user IDs as array
  getOnlineUserIds: () => number[];

  // Clear all presence data (on logout)
  clear: () => void;
}

type PresenceStore = PresenceState & PresenceActions;

export const usePresenceStore = create<PresenceStore>((set, get) => ({
  // Initial state
  onlineUserIds: new Set(),
  lastUpdated: 0,
  initialized: false,

  // Actions
  setUserOnline: (userId: number) => {
    set((state) => {
      const newSet = new Set(state.onlineUserIds);
      newSet.add(userId);
      console.log(`[PresenceStore] User ${userId} is now ONLINE (total: ${newSet.size})`);
      return {
        onlineUserIds: newSet,
        lastUpdated: Date.now(),
      };
    });
  },

  setUserOffline: (userId: number) => {
    set((state) => {
      const newSet = new Set(state.onlineUserIds);
      newSet.delete(userId);
      console.log(`[PresenceStore] User ${userId} is now OFFLINE (total: ${newSet.size})`);
      return {
        onlineUserIds: newSet,
        lastUpdated: Date.now(),
      };
    });
  },

  setOnlineUsers: (userIds: number[]) => {
    const newSet = new Set(userIds);
    console.log(`[PresenceStore] Initial online users list set: ${userIds.length} users online`);
    set({
      onlineUserIds: newSet,
      lastUpdated: Date.now(),
      initialized: true,
    });
  },

  isUserOnline: (userId: number) => {
    return get().onlineUserIds.has(userId);
  },

  getOnlineUserIds: () => {
    return Array.from(get().onlineUserIds);
  },

  clear: () => {
    console.log('[PresenceStore] Cleared all presence data');
    set({
      onlineUserIds: new Set(),
      lastUpdated: 0,
      initialized: false,
    });
  },
}));

// Selector hooks for optimized re-renders
export const selectIsUserOnline = (userId: number) => (state: PresenceStore) =>
  state.onlineUserIds.has(userId);

export const selectOnlineCount = (state: PresenceStore) =>
  state.onlineUserIds.size;

export const selectIsInitialized = (state: PresenceStore) =>
  state.initialized;

export const selectLastUpdated = (state: PresenceStore) =>
  state.lastUpdated;

export default usePresenceStore;
