/**
 * Matches API Service
 * Handles all match-related API calls including:
 * - Fetching matches (all, categorized, filtered)
 * - Recording swipes
 * - Unmatching
 * - Match statistics
 */

import { get, post, del } from './client';

// ============================================================================
// Type Definitions - Backend DTOs
// ============================================================================

/**
 * Match status enum matching backend MatchStatus
 */
export type MatchStatus = 'ACTIVE' | 'PENDING_REPLY' | 'CHAT_STARTED' | 'EXPIRED' | 'UNMATCHED';

/**
 * Swipe direction enum matching backend SwipeDirection
 */
export type SwipeDirection = 'LEFT' | 'RIGHT';

/**
 * Backend MatchDTO structure
 */
export interface MatchDTO {
  id: number;
  matchedUserId: number;
  matchedUsername: string;
  matchedUserDisplayName: string | null;
  matchedUserProfilePhotoUrl: string | null;
  matchedUserAge: number | null;
  matchedUserLocation: string | null;
  matchedUserBio: string | null;
  status: MatchStatus;
  matchedAt: string; // ISO date string
  expiresAt: string | null;
  hoursUntilExpiration: number | null;
  chatStarted: boolean;
  chatStartedAt: string | null;
  conversationId: number | null;
  // Bumble-style fields
  firstMessageSenderId: number | null;
  firstMessageAt: string | null;
  currentUserSentFirst: boolean;
  waitingForUserReply: boolean;
  waitingForOtherReply: boolean;
  // Online status
  isOnline: boolean;
}

/**
 * Categorized matches response (Bumble-style)
 */
export interface CategorizedMatchesDTO {
  chatStarted: MatchDTO[];
  waitingForUserReply: MatchDTO[];
  waitingForOtherReply: MatchDTO[];
  newMatches: MatchDTO[];
}

/**
 * Swipe request
 */
export interface SwipeRequest {
  targetUserId: number;
  direction: SwipeDirection;
}

/**
 * Swipe response
 */
export interface SwipeResponse {
  success: boolean;
  message: string;
  isMatch: boolean;
  matchId?: number;
  matchedUserId?: number;
  matchedUsername?: string;
  matchedUserDisplayName?: string;
  matchedUserProfilePhotoUrl?: string;
  matchedAt?: string;
  expiresAt?: string;
  swipesRemaining?: number;
}

/**
 * Match statistics
 */
export interface MatchStats {
  activeMatches: number;
  dailySwipesUsed: number;
  dailySwipesRemaining: number;
  dailySwipeLimit: number;
}

/**
 * Paginated response
 */
export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// ============================================================================
// API Endpoints
// ============================================================================

const MATCHES_ENDPOINTS = {
  BASE: '/api/matches',
  LIST: '/api/matches/list',
  CATEGORIZED: '/api/matches/categorized',
  INBOX: '/api/matches/inbox',
  WAITING_FOR_ME: '/api/matches/waiting-for-me',
  WAITING_FOR_THEM: '/api/matches/waiting-for-them',
  NEW: '/api/matches/new',
  SWIPE: '/api/matches/swipe',
  STATS: '/api/matches/stats',
  USER_IDS: '/api/matches/user-ids',
  CHECK: '/api/matches/check',
} as const;

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all matches (paginated)
 */
export const getMatches = async (
  page: number = 0,
  size: number = 20
): Promise<PagedResponse<MatchDTO>> => {
  try {
    const response = await get<PagedResponse<MatchDTO>>(
      MATCHES_ENDPOINTS.BASE,
      { params: { page, size } }
    );
    return response;
  } catch (error) {
    console.warn('Get matches error:', error);
    throw error;
  }
};

/**
 * Get all matches as a list (non-paginated)
 */
export const getMatchesList = async (): Promise<MatchDTO[]> => {
  try {
    const response = await get<MatchDTO[]>(MATCHES_ENDPOINTS.LIST);
    return response;
  } catch (error) {
    console.warn('Get matches list error:', error);
    throw error;
  }
};

/**
 * Get categorized matches (Bumble-style)
 */
export const getCategorizedMatches = async (): Promise<CategorizedMatchesDTO> => {
  try {
    const response = await get<CategorizedMatchesDTO>(MATCHES_ENDPOINTS.CATEGORIZED);
    return response;
  } catch (error) {
    console.warn('Get categorized matches error:', error);
    throw error;
  }
};

/**
 * Get inbox matches (fully started chats)
 */
export const getInboxMatches = async (): Promise<MatchDTO[]> => {
  try {
    const response = await get<MatchDTO[]>(MATCHES_ENDPOINTS.INBOX);
    return response;
  } catch (error) {
    console.warn('Get inbox matches error:', error);
    throw error;
  }
};

/**
 * Get matches waiting for user's reply
 */
export const getMatchesWaitingForMe = async (): Promise<MatchDTO[]> => {
  try {
    const response = await get<MatchDTO[]>(MATCHES_ENDPOINTS.WAITING_FOR_ME);
    return response;
  } catch (error) {
    console.warn('Get waiting for me matches error:', error);
    throw error;
  }
};

/**
 * Get matches waiting for other's reply
 */
export const getMatchesWaitingForThem = async (): Promise<MatchDTO[]> => {
  try {
    const response = await get<MatchDTO[]>(MATCHES_ENDPOINTS.WAITING_FOR_THEM);
    return response;
  } catch (error) {
    console.warn('Get waiting for them matches error:', error);
    throw error;
  }
};

/**
 * Get new matches (no messages yet)
 */
export const getNewMatches = async (): Promise<MatchDTO[]> => {
  try {
    const response = await get<MatchDTO[]>(MATCHES_ENDPOINTS.NEW);
    return response;
  } catch (error) {
    console.warn('Get new matches error:', error);
    throw error;
  }
};

/**
 * Get a specific match by ID
 */
export const getMatchById = async (matchId: number): Promise<MatchDTO> => {
  try {
    const response = await get<MatchDTO>(`${MATCHES_ENDPOINTS.BASE}/${matchId}`);
    return response;
  } catch (error) {
    console.warn('Get match by ID error:', error);
    throw error;
  }
};

/**
 * Record a swipe action
 */
export const recordSwipe = async (request: SwipeRequest): Promise<SwipeResponse> => {
  try {
    const response = await post<SwipeResponse>(MATCHES_ENDPOINTS.SWIPE, request);
    return response;
  } catch (error) {
    console.warn('Record swipe error:', error);
    throw error;
  }
};

/**
 * Unmatch from a user
 */
export const unmatch = async (matchId: number): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await del<{ success: boolean; message: string }>(
      `${MATCHES_ENDPOINTS.BASE}/${matchId}`
    );
    return response;
  } catch (error) {
    console.warn('Unmatch error:', error);
    throw error;
  }
};

/**
 * Check if matched with a specific user
 */
export const checkMatch = async (userId: number): Promise<{ isMatched: boolean; userId: number }> => {
  try {
    const response = await get<{ isMatched: boolean; userId: number }>(
      `${MATCHES_ENDPOINTS.CHECK}/${userId}`
    );
    return response;
  } catch (error) {
    console.warn('Check match error:', error);
    throw error;
  }
};

/**
 * Get match statistics
 */
export const getMatchStats = async (): Promise<MatchStats> => {
  try {
    const response = await get<MatchStats>(MATCHES_ENDPOINTS.STATS);
    return response;
  } catch (error) {
    console.warn('Get match stats error:', error);
    throw error;
  }
};

/**
 * Get IDs of all matched users
 */
export const getMatchedUserIds = async (): Promise<number[]> => {
  try {
    const response = await get<number[]>(MATCHES_ENDPOINTS.USER_IDS);
    return response;
  } catch (error) {
    console.warn('Get matched user IDs error:', error);
    throw error;
  }
};

// ============================================================================
// Export API Service Object
// ============================================================================

export const matchesApi = {
  getMatches,
  getMatchesList,
  getCategorizedMatches,
  getInboxMatches,
  getMatchesWaitingForMe,
  getMatchesWaitingForThem,
  getNewMatches,
  getMatchById,
  recordSwipe,
  unmatch,
  checkMatch,
  getMatchStats,
  getMatchedUserIds,
};

export default matchesApi;
