/**
 * useDiscovery Hook Tests
 * Tests for the discovery/swipe flow hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useDiscovery } from '../hooks/useDiscovery';
import { discoveryApi } from '@services/api/discoveryApi';
import { matchesApi } from '@services/api/matchesApi';

// Mock the API modules
jest.mock('@services/api/discoveryApi');
jest.mock('@services/api/matchesApi');

const mockDiscoveryApi = discoveryApi as jest.Mocked<typeof discoveryApi>;
const mockMatchesApi = matchesApi as jest.Mocked<typeof matchesApi>;

// Mock profile data
const mockProfiles = [
  {
    id: 1,
    name: 'Maria',
    age: 55,
    location: 'Manila, Philippines',
    distance: '5 km',
    bio: 'Looking for companionship',
    interests: ['Reading', 'Cooking'],
    verified: true,
    online: true,
    image: 'https://example.com/photo1.jpg',
  },
  {
    id: 2,
    name: 'Jose',
    age: 60,
    location: 'Cebu, Philippines',
    distance: '10 km',
    bio: 'Active senior seeking friends',
    interests: ['Gardening', 'Walking'],
    verified: false,
    online: false,
    image: 'https://example.com/photo2.jpg',
  },
  {
    id: 3,
    name: 'Ana',
    age: 58,
    location: 'Davao, Philippines',
    distance: '15 km',
    bio: 'Retired teacher',
    interests: ['Music', 'Dancing'],
    verified: true,
    online: true,
    image: 'https://example.com/photo3.jpg',
  },
];

describe('useDiscovery Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for getProfileBatch
    mockDiscoveryApi.getProfileBatch.mockResolvedValue(mockProfiles);
  });

  describe('Initial Loading', () => {
    it('should start in loading state', async () => {
      const { result } = renderHook(() => useDiscovery());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.profiles).toEqual([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should load profiles on mount', async () => {
      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockDiscoveryApi.getProfileBatch).toHaveBeenCalledWith(10);
      expect(result.current.profiles).toEqual(mockProfiles);
      expect(result.current.currentProfile).toEqual(mockProfiles[0]);
      expect(result.current.hasProfiles).toBe(true);
    });

    it('should handle loading error', async () => {
      mockDiscoveryApi.getProfileBatch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.hasProfiles).toBe(false);
    });
  });

  describe('Swipe Actions', () => {
    it('should record swipe right (like)', async () => {
      mockMatchesApi.recordSwipe.mockResolvedValue({
        success: true,
        message: 'Liked',
        isMatch: false,
        swipesRemaining: 99,
      });

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.swipeRight(1);
      });

      expect(mockMatchesApi.recordSwipe).toHaveBeenCalledWith({
        targetUserId: 1,
        direction: 'RIGHT',
      });
      expect(result.current.swipesRemaining).toBe(99);
    });

    it('should record swipe left (pass)', async () => {
      mockMatchesApi.recordSwipe.mockResolvedValue({
        success: true,
        message: 'Passed',
        isMatch: false,
      });

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.swipeLeft(1);
      });

      expect(mockMatchesApi.recordSwipe).toHaveBeenCalledWith({
        targetUserId: 1,
        direction: 'LEFT',
      });
    });

    it('should prevent duplicate swipes for the same profile', async () => {
      // Create a slow-resolving promise
      let resolveSwipe: (value: any) => void;
      mockMatchesApi.recordSwipe.mockImplementation(() =>
        new Promise(resolve => {
          resolveSwipe = resolve;
        })
      );

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start first swipe (won't complete immediately)
      act(() => {
        result.current.swipeRight(1);
      });

      // Try to swipe same profile again while first is pending
      await act(async () => {
        const secondResult = await result.current.swipeRight(1);
        expect(secondResult).toBeNull(); // Should be blocked
      });

      // Verify only one API call was made
      expect(mockMatchesApi.recordSwipe).toHaveBeenCalledTimes(1);

      // Complete the first request
      await act(async () => {
        resolveSwipe!({ success: true, message: 'Liked', isMatch: false });
      });
    });
  });

  describe('Match Detection', () => {
    it('should show match popup when a match occurs', async () => {
      mockMatchesApi.recordSwipe.mockResolvedValue({
        success: true,
        message: 'Matched!',
        isMatch: true,
        matchId: 123,
        matchedUserId: 2,
        matchedUsername: 'maria_55',
        matchedUserDisplayName: 'Maria',
        matchedUserProfilePhotoUrl: 'https://example.com/maria.jpg',
        matchedAt: '2026-01-06T10:00:00Z',
        expiresAt: '2026-01-09T10:00:00Z',
      });

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.swipeRight(1);
      });

      expect(result.current.showMatchPopup).toBe(true);
      expect(result.current.matchInfo).toEqual({
        matchId: 123,
        matchedUserId: 2,
        matchedUsername: 'maria_55',
        matchedUserDisplayName: 'Maria',
        matchedUserProfilePhotoUrl: 'https://example.com/maria.jpg',
        matchedAt: '2026-01-06T10:00:00Z',
        expiresAt: '2026-01-09T10:00:00Z',
      });
    });

    it('should dismiss match popup correctly', async () => {
      mockMatchesApi.recordSwipe.mockResolvedValue({
        success: true,
        message: 'Matched!',
        isMatch: true,
        matchId: 123,
        matchedUserId: 2,
      });

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.swipeRight(1);
      });

      expect(result.current.showMatchPopup).toBe(true);

      act(() => {
        result.current.dismissMatchPopup();
      });

      expect(result.current.showMatchPopup).toBe(false);
      expect(result.current.matchInfo).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('should advance to next profile with goToNext', async () => {
      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.currentProfile?.id).toBe(1);

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.currentProfile?.id).toBe(2);
    });

    it('should reset state and reload profiles', async () => {
      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Advance a few profiles
      act(() => {
        result.current.goToNext();
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(2);

      // Reset
      await act(async () => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(result.current.currentIndex).toBe(0);
      });

      // Should have called loadProfiles again
      expect(mockDiscoveryApi.getProfileBatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle 429 rate limit error', async () => {
      mockMatchesApi.recordSwipe.mockRejectedValue({
        statusCode: 429,
        message: 'Rate limit exceeded',
      });

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.swipeRight(1);
      });

      expect(result.current.error).toBe('Daily swipe limit reached. Try again tomorrow!');
    });

    it('should handle 401 auth error', async () => {
      mockMatchesApi.recordSwipe.mockRejectedValue({
        statusCode: 401,
        message: 'Unauthorized',
      });

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.swipeRight(1);
      });

      expect(result.current.error).toBe('Session expired. Please log in again.');
    });

    it('should clear error when requested', async () => {
      mockDiscoveryApi.getProfileBatch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Pagination', () => {
    it('should load more profiles when running low', async () => {
      // Start with 3 profiles
      mockDiscoveryApi.getProfileBatch.mockResolvedValue(mockProfiles);

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Advance past preload threshold (3 profiles, threshold is 3)
      act(() => {
        result.current.goToNext(); // Index 1, remaining 2
      });

      // Should trigger auto-load when 3 or fewer remaining
      await waitFor(() => {
        // Second call to getProfileBatch for pagination
        expect(mockDiscoveryApi.getProfileBatch.mock.calls.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should not duplicate profiles when loading more', async () => {
      const initialProfiles = mockProfiles.slice(0, 2);
      const moreProfiles = [
        ...mockProfiles.slice(1), // Include one duplicate (id: 2)
        { ...mockProfiles[0], id: 4, name: 'New Profile' },
      ];

      mockDiscoveryApi.getProfileBatch
        .mockResolvedValueOnce(initialProfiles)
        .mockResolvedValueOnce(moreProfiles);

      const { result } = renderHook(() => useDiscovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Manually trigger load more
      await act(async () => {
        await result.current.loadProfiles(false);
      });

      // Should have 3 unique profiles (not 5 with duplicates)
      const uniqueIds = new Set(result.current.profiles.map(p => p.id));
      expect(uniqueIds.size).toBe(result.current.profiles.length);
    });
  });
});
