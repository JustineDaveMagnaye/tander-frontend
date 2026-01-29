/**
 * Discovery API Service
 * Handles all discovery-related API calls including:
 * - Fetching profiles for swiping
 * - Getting discovery statistics
 * - Getting "who liked me" profiles
 */

import { get } from './client';

// ============================================================================
// Type Definitions - Backend DTOs
// ============================================================================

/**
 * Backend DiscoveryProfileDTO structure
 */
export interface DiscoveryProfileDTO {
  userId: number;
  username: string;
  displayName: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  location: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  additionalPhotos: string[] | null;
  interests: string[] | null;
  lookingFor: string[] | null;
  verified: boolean;
  online: boolean;
  hasBeenSwiped: boolean;
  hasLikedMe: boolean;
  isMatched: boolean;
  compatibilityScore: number | null;
  distanceKm: number | null;
}

/**
 * Frontend Profile type - mapped from DiscoveryProfileDTO
 * This is the shape used by the UI components
 */
export interface Profile {
  id: number;
  name: string;
  age: number;
  location: string;
  distance: string;
  bio: string;
  interests: string[];
  verified: boolean;
  online: boolean;
  image: string;
  // Extended fields from backend
  additionalPhotos?: string[];
  hasLikedMe?: boolean;
  compatibilityScore?: number;
}

/**
 * Discovery filter parameters
 */
export interface DiscoveryFilters {
  minAge?: number;
  maxAge?: number;
  city?: string;
  country?: string;
  interests?: string[];
  verifiedOnly?: boolean;
}

/**
 * Discovery statistics
 */
export interface DiscoveryStats {
  availableProfiles: number;
  likesReceived: number;
  message: string;
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

const DISCOVERY_ENDPOINTS = {
  PROFILES: '/api/discovery/profiles',
  BATCH: '/api/discovery/batch',
  PROFILE: '/api/discovery/profile',
  LIKES_ME: '/api/discovery/likes-me',
  LIKES_ME_COUNT: '/api/discovery/likes-me/count',
  STATS: '/api/discovery/stats',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps a backend DiscoveryProfileDTO to the frontend Profile type
 */
export const mapProfileDTOToProfile = (dto: DiscoveryProfileDTO): Profile => {
  // Format distance string
  let distanceStr = '';
  if (dto.distanceKm !== null && dto.distanceKm !== undefined) {
    if (dto.distanceKm < 1) {
      distanceStr = '< 1 km';
    } else {
      distanceStr = `${Math.round(dto.distanceKm)} km`;
    }
  }

  return {
    id: dto.userId,
    name: dto.displayName || dto.username || 'Unknown',
    age: dto.age || 0,
    location: dto.location || [dto.city, dto.country].filter(Boolean).join(', ') || 'Unknown Location',
    distance: distanceStr,
    bio: dto.bio || '',
    interests: dto.interests || [],
    verified: dto.verified,
    online: dto.online,
    image: dto.profilePhotoUrl || '',
    // Extended fields
    additionalPhotos: dto.additionalPhotos || [],
    hasLikedMe: dto.hasLikedMe,
    compatibilityScore: dto.compatibilityScore || undefined,
  };
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get a batch of profiles for swiping (simple endpoint for mobile)
 * @param count Number of profiles to fetch (default 10, max 50)
 */
export const getProfileBatch = async (count: number = 10): Promise<Profile[]> => {
  try {
    const response = await get<DiscoveryProfileDTO[]>(
      DISCOVERY_ENDPOINTS.BATCH,
      { params: { count: Math.min(count, 50) } }
    );
    return response.map(mapProfileDTOToProfile);
  } catch (error) {
    console.warn('Get profile batch error:', error);
    throw error;
  }
};

/**
 * Get profiles for swiping with filters (paginated)
 * @param page Page number (default 0)
 * @param size Page size (default 10)
 * @param filters Optional filter criteria
 */
export const getDiscoveryProfiles = async (
  page: number = 0,
  size: number = 10,
  filters?: DiscoveryFilters
): Promise<PagedResponse<Profile>> => {
  try {
    const params: Record<string, string | number | boolean> = { page, size };

    if (filters) {
      if (filters.minAge !== undefined) params.minAge = filters.minAge;
      if (filters.maxAge !== undefined) params.maxAge = filters.maxAge;
      if (filters.city) params.city = filters.city;
      if (filters.country) params.country = filters.country;
      if (filters.verifiedOnly !== undefined) params.verifiedOnly = filters.verifiedOnly;
      // Note: interests array would need to be handled separately
    }

    const response = await get<PagedResponse<DiscoveryProfileDTO>>(
      DISCOVERY_ENDPOINTS.PROFILES,
      { params }
    );

    return {
      ...response,
      content: response.content.map(mapProfileDTOToProfile),
    };
  } catch (error) {
    console.warn('Get discovery profiles error:', error);
    throw error;
  }
};

/**
 * Get a specific profile by user ID
 * @param userId The user ID to fetch
 */
export const getProfileById = async (userId: number): Promise<Profile | null> => {
  try {
    const response = await get<DiscoveryProfileDTO>(
      `${DISCOVERY_ENDPOINTS.PROFILE}/${userId}`
    );
    return mapProfileDTOToProfile(response);
  } catch (error) {
    console.warn('Get profile by ID error:', error);
    // Return null for 404s
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      if ((error as { statusCode: number }).statusCode === 404) {
        return null;
      }
    }
    throw error;
  }
};

/**
 * Get profiles who have liked the current user (premium feature)
 * @param page Page number (default 0)
 * @param size Page size (default 20)
 */
export const getProfilesWhoLikedMe = async (
  page: number = 0,
  size: number = 20
): Promise<PagedResponse<Profile>> => {
  try {
    const response = await get<PagedResponse<DiscoveryProfileDTO>>(
      DISCOVERY_ENDPOINTS.LIKES_ME,
      { params: { page, size } }
    );

    return {
      ...response,
      content: response.content.map(mapProfileDTOToProfile),
    };
  } catch (error) {
    console.warn('Get profiles who liked me error:', error);
    throw error;
  }
};

/**
 * Get the count of users who have liked the current user
 */
export const getLikesReceivedCount = async (): Promise<{ count: number; message: string }> => {
  try {
    const response = await get<{ count: number; message: string }>(
      DISCOVERY_ENDPOINTS.LIKES_ME_COUNT
    );
    return response;
  } catch (error) {
    console.warn('Get likes received count error:', error);
    throw error;
  }
};

/**
 * Get discovery statistics for the current user
 */
export const getDiscoveryStats = async (): Promise<DiscoveryStats> => {
  try {
    const response = await get<DiscoveryStats>(DISCOVERY_ENDPOINTS.STATS);
    return response;
  } catch (error) {
    console.warn('Get discovery stats error:', error);
    throw error;
  }
};

// ============================================================================
// Export API Service Object
// ============================================================================

export const discoveryApi = {
  getProfileBatch,
  getDiscoveryProfiles,
  getProfileById,
  getProfilesWhoLikedMe,
  getLikesReceivedCount,
  getDiscoveryStats,
  // Expose mapper for external use
  mapProfileDTOToProfile,
};

export default discoveryApi;
