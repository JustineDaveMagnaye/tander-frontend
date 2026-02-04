/**
 * useDiscovery Hook
 * Custom hook for managing the discovery/swipe flow
 *
 * Features:
 * - Fetches profiles from backend (preloads 50 at a time for smooth UX)
 * - Records swipes (like/pass)
 * - Handles match detection
 * - Manages loading/error states
 * - Pagination/infinite loading with smart preloading
 * - Image prefetching for instant profile transitions
 * - Request deduplication (prevents double swipes)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Image } from 'react-native';
import { discoveryApi, Profile, DiscoveryFilters } from '@services/api/discoveryApi';
import { matchesApi, SwipeResponse, SwipeDirection } from '@services/api/matchesApi';

// ============================================================================
// Types
// ============================================================================

export interface MatchInfo {
  matchId: number;
  matchedUserId: number;
  matchedUsername: string;
  matchedUserDisplayName: string;
  matchedUserProfilePhotoUrl: string;
  matchedAt: string;
  expiresAt: string | null;
}

export interface UseDiscoveryState {
  profiles: Profile[];
  currentIndex: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMoreProfiles: boolean;
  swipesRemaining: number | null;
  // Match popup state
  matchInfo: MatchInfo | null;
  showMatchPopup: boolean;
}

export interface UseDiscoveryActions {
  loadProfiles: (refresh?: boolean) => Promise<void>;
  swipeRight: (profileId: number) => Promise<SwipeResponse | null>;
  swipeLeft: (profileId: number) => Promise<SwipeResponse | null>;
  goToNext: () => void;
  goToPrevious: () => boolean;
  reset: () => void;
  dismissMatchPopup: () => void;
  clearError: () => void;
  setFilters: (filters: DiscoveryFilters) => void;
  clearFilters: () => void;
}

export interface UseDiscoveryReturn extends UseDiscoveryState, UseDiscoveryActions {
  currentProfile: Profile | null;
  hasProfiles: boolean;
  filters: DiscoveryFilters;
}

// ============================================================================
// Constants
// ============================================================================

const BATCH_SIZE = 50; // Preload 50 profiles at once for smooth UX
const PRELOAD_THRESHOLD = 15; // Start loading more when 15 profiles remaining
const IMAGE_PREFETCH_AHEAD = 5; // Prefetch images for next 5 profiles

// ============================================================================
// Hook Implementation
// ============================================================================

// Default filters for senior dating app
const DEFAULT_FILTERS: DiscoveryFilters = {
  minAge: 50,
  verifiedOnly: false, // Show all profiles by default, let users filter
};

export const useDiscovery = (): UseDiscoveryReturn => {
  // State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreProfiles, setHasMoreProfiles] = useState(true);
  const [swipesRemaining, setSwipesRemaining] = useState<number | null>(null);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [filters, setFiltersState] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(0);

  // Refs to track loading state
  const isLoadingRef = useRef(false);
  // Track pending swipes to prevent duplicate requests
  const pendingSwipesRef = useRef<Set<number>>(new Set());
  // Track prefetched image URLs to avoid duplicate prefetch calls
  const prefetchedImagesRef = useRef<Set<string>>(new Set());

  // ============================================================================
  // Computed Values
  // ============================================================================

  const currentProfile = profiles[currentIndex] || null;
  const hasProfiles = currentIndex < profiles.length;
  const remainingProfiles = profiles.length - currentIndex;

  // ============================================================================
  // Load Profiles
  // ============================================================================

  const loadProfiles = useCallback(async (refresh: boolean = false) => {
    // Prevent concurrent loads
    if (isLoadingRef.current && !refresh) return;

    try {
      isLoadingRef.current = true;

      if (refresh) {
        setIsLoading(true);
        setError(null);
        setCurrentPage(0);
      } else {
        setIsLoadingMore(true);
      }

      // Check if any non-default filters are applied
      const hasActiveFilters = filters.maxAge !== undefined ||
        filters.city !== undefined ||
        filters.country !== undefined ||
        (filters.interests !== undefined && filters.interests.length > 0) ||
        filters.verifiedOnly === true;

      let newProfiles: Profile[];

      if (hasActiveFilters) {
        // Use paginated endpoint with filters
        const page = refresh ? 0 : currentPage;
        const response = await discoveryApi.getDiscoveryProfiles(page, BATCH_SIZE, filters);
        newProfiles = response.content;
        if (!refresh) {
          setCurrentPage(prev => prev + 1);
        } else {
          setCurrentPage(1);
        }
        setHasMoreProfiles(!response.last);
      } else {
        // Use simple batch endpoint (faster, no filters)
        newProfiles = await discoveryApi.getProfileBatch(BATCH_SIZE);
        setHasMoreProfiles(newProfiles.length === BATCH_SIZE);
      }

      if (refresh) {
        setProfiles(newProfiles);
        setCurrentIndex(0);
      } else {
        // Append new profiles, avoiding duplicates
        setProfiles(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newProfiles.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profiles';
      setError(message);
      console.warn('[useDiscovery] Load profiles error:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [filters, currentPage]);

  // ============================================================================
  // Auto-load more profiles when running low
  // ============================================================================

  useEffect(() => {
    if (remainingProfiles <= PRELOAD_THRESHOLD && hasMoreProfiles && !isLoadingMore && !isLoading) {
      loadProfiles(false);
    }
  }, [remainingProfiles, hasMoreProfiles, isLoadingMore, isLoading, loadProfiles]);

  // ============================================================================
  // Image Prefetching - Preload images for upcoming profiles
  // ============================================================================

  useEffect(() => {
    const prefetchUpcomingImages = async () => {
      // Get the next N profiles to prefetch
      const startIdx = currentIndex;
      const endIdx = Math.min(currentIndex + IMAGE_PREFETCH_AHEAD, profiles.length);

      for (let i = startIdx; i < endIdx; i++) {
        const profile = profiles[i];
        if (profile?.image && !prefetchedImagesRef.current.has(profile.image)) {
          try {
            // Mark as prefetching to avoid duplicate calls
            prefetchedImagesRef.current.add(profile.image);
            await Image.prefetch(profile.image);
          } catch (err) {
            // Silently fail - prefetch is best-effort
            console.debug('[useDiscovery] Image prefetch failed:', profile.image);
          }
        }

        // Also prefetch additional photos if available
        if (profile?.additionalPhotos) {
          for (const photoUrl of profile.additionalPhotos.slice(0, 3)) {
            if (photoUrl && !prefetchedImagesRef.current.has(photoUrl)) {
              try {
                prefetchedImagesRef.current.add(photoUrl);
                await Image.prefetch(photoUrl);
              } catch {
                // Silently fail
              }
            }
          }
        }
      }
    };

    if (profiles.length > 0 && !isLoading) {
      prefetchUpcomingImages();
    }
  }, [currentIndex, profiles, isLoading]);

  // ============================================================================
  // Swipe Actions
  // ============================================================================

  const recordSwipe = useCallback(async (
    profileId: number,
    direction: SwipeDirection
  ): Promise<SwipeResponse | null> => {
    // Prevent duplicate requests for the same profile
    if (pendingSwipesRef.current.has(profileId)) {
      console.warn('[useDiscovery] Ignoring duplicate swipe for profile:', profileId);
      return null;
    }

    // Mark this profile as having a pending swipe
    pendingSwipesRef.current.add(profileId);

    try {
      const response = await matchesApi.recordSwipe({
        targetUserId: profileId,
        direction,
      });

      // Update swipes remaining
      if (response.swipesRemaining !== undefined) {
        setSwipesRemaining(response.swipesRemaining);
      }

      // Handle match
      if (response.isMatch && response.matchId) {
        setMatchInfo({
          matchId: response.matchId,
          matchedUserId: response.matchedUserId!,
          matchedUsername: response.matchedUsername || '',
          matchedUserDisplayName: response.matchedUserDisplayName || '',
          matchedUserProfilePhotoUrl: response.matchedUserProfilePhotoUrl || '',
          matchedAt: response.matchedAt || new Date().toISOString(),
          expiresAt: response.expiresAt || null,
        });
        setShowMatchPopup(true);
      }

      return response;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Swipe failed';
      console.warn('[useDiscovery] Swipe error:', err);

      // Handle specific errors
      if (typeof err === 'object' && err !== null && 'statusCode' in err) {
        const statusCode = (err as { statusCode: number }).statusCode;
        if (statusCode === 429) {
          setError('Daily swipe limit reached. Try again tomorrow!');
        } else if (statusCode === 401) {
          setError('Session expired. Please log in again.');
        } else {
          setError(message);
        }
      } else {
        setError(message);
      }

      return null;
    } finally {
      // Remove from pending set after request completes (success or failure)
      pendingSwipesRef.current.delete(profileId);
    }
  }, []);

  const swipeRight = useCallback(async (profileId: number): Promise<SwipeResponse | null> => {
    return recordSwipe(profileId, 'RIGHT');
  }, [recordSwipe]);

  const swipeLeft = useCallback(async (profileId: number): Promise<SwipeResponse | null> => {
    return recordSwipe(profileId, 'LEFT');
  }, [recordSwipe]);

  // ============================================================================
  // Navigation
  // ============================================================================

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
  }, []);

  /**
   * Go back to the previous profile (undo)
   * Returns true if successful, false if already at the beginning
   * Note: This only navigates back visually - the swipe action on the server cannot be undone
   */
  const goToPrevious = useCallback((): boolean => {
    if (currentIndex <= 0) {
      return false;
    }
    setCurrentIndex(prev => prev - 1);
    return true;
  }, [currentIndex]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setProfiles([]);
    setError(null);
    setHasMoreProfiles(true);
    // Clear prefetched images cache on reset
    prefetchedImagesRef.current.clear();
    loadProfiles(true);
  }, [loadProfiles]);

  // ============================================================================
  // Match Popup
  // ============================================================================

  const dismissMatchPopup = useCallback(() => {
    setShowMatchPopup(false);
    setMatchInfo(null);
  }, []);

  // ============================================================================
  // Error Handling
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // Filter Management
  // ============================================================================

  /**
   * Set discovery filters and refresh profiles
   */
  const setFilters = useCallback((newFilters: DiscoveryFilters) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    // Clear prefetched images cache when filters change
    prefetchedImagesRef.current.clear();
    // Reset pagination
    setCurrentPage(0);
  }, []);

  /**
   * Clear all filters and reset to defaults
   */
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    prefetchedImagesRef.current.clear();
    setCurrentPage(0);
  }, []);

  // Reload profiles when filters change
  useEffect(() => {
    loadProfiles(true);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    profiles,
    currentIndex,
    isLoading,
    isLoadingMore,
    error,
    hasMoreProfiles,
    swipesRemaining,
    matchInfo,
    showMatchPopup,
    filters,
    // Computed
    currentProfile,
    hasProfiles,
    // Actions
    loadProfiles,
    swipeRight,
    swipeLeft,
    goToNext,
    goToPrevious,
    reset,
    dismissMatchPopup,
    clearError,
    setFilters,
    clearFilters,
  };
};

export default useDiscovery;
