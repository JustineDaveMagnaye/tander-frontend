/**
 * Presence API
 * REST API client for presence-related queries.
 * Provides a fallback mechanism when WebSocket timing issues occur.
 */

import { get } from './client';

// ============================================================================
// Types
// ============================================================================

export interface OnlineUsersResponse {
  userIds: number[];
  count: number;
  timestamp: number;
}

export interface UserPresenceResponse {
  userId: number;
  isOnline: boolean;
  isBackgrounded?: boolean;
  presenceStatus: 'online' | 'recently_active' | 'offline';
  lastSeen: number | null;
  lastActive: number | null;
  timestamp: number;
}

export interface BulkPresenceResponse {
  presence: Record<number, {
    isOnline: boolean;
    presenceStatus: string;
    lastSeen: number | null;
  }>;
  timestamp: number;
}

export interface OnlineCountResponse {
  onlineUsers: number;
  totalSessions: number;
  timestamp: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all currently online user IDs.
 * Used as a fallback when WebSocket online-users list isn't received.
 */
export async function getOnlineUsers(): Promise<OnlineUsersResponse> {
  return get<OnlineUsersResponse>('/api/presence/online-users');
}

/**
 * Check if a specific user is online.
 */
export async function checkUserOnline(userId: number): Promise<UserPresenceResponse> {
  return get<UserPresenceResponse>(`/api/presence/check/${userId}`);
}

/**
 * Bulk check presence for multiple users.
 */
export async function checkBulkUserOnline(userIds: number[]): Promise<BulkPresenceResponse> {
  const params: Record<string, string> = {
    userIds: userIds.join(','),
  };
  return get<BulkPresenceResponse>('/api/presence/check-bulk', { params });
}

/**
 * Get count of online users.
 */
export async function getOnlineCount(): Promise<OnlineCountResponse> {
  return get<OnlineCountResponse>('/api/presence/online-count');
}

export default {
  getOnlineUsers,
  checkUserOnline,
  checkBulkUserOnline,
  getOnlineCount,
};
