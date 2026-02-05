/**
 * Profile API Service
 * Handles all profile-related API calls including:
 * - Profile CRUD operations
 * - Photo management
 * - Settings (notifications, privacy, security, discovery)
 * - Account deletion
 */

import { get, put, post, del, request } from './client';
import { getToken } from '@/services/storage/tokenStorage';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ProfileData {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  nickName?: string;
  displayName?: string;
  age?: number;
  birthDate?: string;
  city?: string;
  country?: string;
  civilStatus?: string;
  hobby?: string;
  education?: string;
  height?: string;
  bio?: string;
  interests?: string | string[];
  lookingFor?: string | string[];
  profilePhotoUrl?: string;
  additionalPhotos?: string[];
  verified?: boolean;
  profileCompleted?: boolean;
  // Dating preferences fields
  gender?: 'male' | 'female';
  interestedIn?: string; // JSON array string e.g., '["male"]' or '["female"]'
  religion?: string;
  numberOfChildren?: number;
  languages?: string; // JSON array string e.g., '["Tagalog", "English"]'
  maritalStatus?: string; // e.g., 'Single', 'Married', 'Widowed', etc.
}

export interface NotificationSettings {
  newMatches: boolean;
  messages: boolean;
  likes: boolean;
  superLikes: boolean;
  tandyReminders: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface PrivacySettings {
  profileVisible: boolean;
  locationEnabled: boolean;
  showApproximateDistance: boolean;
  showOnlineStatus: boolean;
  showReadReceipts: boolean;
  showInSearch: boolean;
  allowDirectMessages: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod?: string;
  twoFactorPhone?: string;
  loginNotificationsEnabled: boolean;
  loginNotificationMethod?: string;
  newDeviceVerification: boolean;
  showActiveSessions: boolean;
  sessionTimeoutMinutes: number;
  idVerified: boolean;
  idVerificationStatus?: string;
}

export interface DiscoverySettings {
  distancePreference: number;
  minAge: number;
  maxAge: number;
  showMe: 'everyone' | 'men' | 'women';
  useCurrentLocation: boolean;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

export interface ApiResponse<T> {
  success?: boolean;
  error?: boolean;
  message?: string;
  settings?: T;
  [key: string]: unknown;
}

// ============================================================================
// API Endpoints
// ============================================================================

const PROFILE_ENDPOINTS = {
  // Profile
  ME: '/user/me',
  UPDATE_PROFILE: '/user/profile',
  UPLOAD_PROFILE_PHOTO: '/user/upload-profile-photo',
  UPLOAD_ADDITIONAL_PHOTOS: '/user/upload-additional-photos',
  DELETE_PHOTO: '/user/delete-photo',

  // Password & Security
  CHANGE_PASSWORD: '/user/change-password',
  ENABLE_BIOMETRIC: '/user/enable-biometric',
  DISABLE_BIOMETRIC: '/user/disable-biometric',
  BIOMETRIC_STATUS: '/user/biometric-status',

  // Account
  DELETE_ACCOUNT: '/user/delete-account',

  // Settings
  NOTIFICATION_SETTINGS: '/settings/notifications',
  PRIVACY_SETTINGS: '/settings/privacy',
  SECURITY_SETTINGS: '/settings/security',
  DISCOVERY_SETTINGS: '/settings/discovery',

  // Safety & Moderation
  BLOCK_USER: '/user/block',
  UNBLOCK_USER: '/user/unblock',
  REPORT_USER: '/user/report',
  BLOCKED_USERS: '/user/blocked',
} as const;

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.tanderconnect.com';

// ============================================================================
// Profile Operations
// ============================================================================

/**
 * Get current user's profile
 */
export const getProfile = async (): Promise<ProfileData> => {
  try {
    const response = await get<ProfileData>(PROFILE_ENDPOINTS.ME);
    return response;
  } catch (error) {
    console.warn('Get profile error:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (data: Partial<ProfileData>): Promise<ProfileData> => {
  try {
    const response = await put<ProfileData>(PROFILE_ENDPOINTS.UPDATE_PROFILE, data);
    return response;
  } catch (error) {
    console.warn('Update profile error:', error);
    throw error;
  }
};

/**
 * Image file info for React Native uploads
 */
export interface ImageFileInfo {
  uri: string;
  type?: string;
  name?: string;
}

/**
 * Upload profile photo
 * Accepts either a Blob (web) or ImageFileInfo (React Native)
 */
export const uploadProfilePhoto = async (photo: File | Blob | ImageFileInfo): Promise<{ profilePhotoUrl: string }> => {
  try {
    const formData = new FormData();

    // Handle React Native image upload format
    if ('uri' in photo && typeof photo.uri === 'string') {
      // React Native format - append as object with uri, type, name
      formData.append('profilePhoto', {
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.name || 'profile-photo.jpg',
      } as any);
    } else {
      // Web format - append Blob/File directly
      formData.append('profilePhoto', photo as Blob);
    }

    // Get auth token for authenticated upload
    const token = await getToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      // Note: Don't set Content-Type for FormData - let fetch set it with boundary
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log('Uploading profile photo to:', `${BASE_URL}${PROFILE_ENDPOINTS.UPLOAD_PROFILE_PHOTO}`);

    const response = await fetch(`${BASE_URL}${PROFILE_ENDPOINTS.UPLOAD_PROFILE_PHOTO}`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('Upload response error:', response.status, errorData);
      throw { message: errorData.message || 'Failed to upload photo', statusCode: response.status };
    }

    return response.json();
  } catch (error) {
    console.warn('Upload profile photo error:', error);
    throw error;
  }
};

/**
 * Upload additional photos
 * Accepts either Blobs (web) or ImageFileInfo array (React Native)
 */
export const uploadAdditionalPhotos = async (photos: (File | Blob | ImageFileInfo)[]): Promise<{ additionalPhotoUrls: string[] }> => {
  try {
    const formData = new FormData();
    photos.forEach((photo, index) => {
      // Handle React Native image upload format
      if ('uri' in photo && typeof photo.uri === 'string') {
        // React Native format - append as object with uri, type, name
        formData.append('additionalPhotos', {
          uri: photo.uri,
          type: photo.type || 'image/jpeg',
          name: photo.name || `additional-photo-${index}.jpg`,
        } as any);
      } else {
        // Web format - append Blob/File directly
        formData.append('additionalPhotos', photo as Blob);
      }
    });

    // Get auth token for authenticated upload
    const token = await getToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      // Note: Don't set Content-Type for FormData - let fetch set it with boundary
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log('Uploading additional photos to:', `${BASE_URL}${PROFILE_ENDPOINTS.UPLOAD_ADDITIONAL_PHOTOS}`);

    const response = await fetch(`${BASE_URL}${PROFILE_ENDPOINTS.UPLOAD_ADDITIONAL_PHOTOS}`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('Upload response error:', response.status, errorData);
      throw { message: errorData.message || 'Failed to upload photos', statusCode: response.status };
    }

    return response.json();
  } catch (error) {
    console.warn('Upload additional photos error:', error);
    throw error;
  }
};

/**
 * Delete an additional photo by index
 */
export const deletePhoto = async (photoIndex: number): Promise<{ remainingPhotos: number }> => {
  try {
    const response = await del<{ remainingPhotos: number }>(
      `${PROFILE_ENDPOINTS.DELETE_PHOTO}?photoIndex=${photoIndex}`
    );
    return response;
  } catch (error) {
    console.warn('Delete photo error:', error);
    throw error;
  }
};

/**
 * Delete the main profile photo
 */
export const deleteProfilePhoto = async (): Promise<{ status: string; message: string }> => {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/user/delete-profile-photo`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { message: errorData.message || 'Failed to delete profile photo', statusCode: response.status };
    }

    return response.json();
  } catch (error) {
    console.warn('Delete profile photo error:', error);
    throw error;
  }
};

// ============================================================================
// Password & Security
// ============================================================================

/**
 * Change user password
 */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await post<{ success: boolean; message: string }>(
      PROFILE_ENDPOINTS.CHANGE_PASSWORD,
      { currentPassword, newPassword }
    );
    return response;
  } catch (error) {
    console.warn('Change password error:', error);
    throw error;
  }
};

/**
 * Enable biometric authentication
 */
export const enableBiometric = async (): Promise<{ success: boolean; biometricEnabled: boolean }> => {
  try {
    const response = await post<{ success: boolean; biometricEnabled: boolean }>(
      PROFILE_ENDPOINTS.ENABLE_BIOMETRIC
    );
    return response;
  } catch (error) {
    console.warn('Enable biometric error:', error);
    throw error;
  }
};

/**
 * Disable biometric authentication
 */
export const disableBiometric = async (): Promise<{ success: boolean; biometricEnabled: boolean }> => {
  try {
    const response = await post<{ success: boolean; biometricEnabled: boolean }>(
      PROFILE_ENDPOINTS.DISABLE_BIOMETRIC
    );
    return response;
  } catch (error) {
    console.warn('Disable biometric error:', error);
    throw error;
  }
};

/**
 * Get biometric status
 */
export const getBiometricStatus = async (): Promise<{ biometricEnabled: boolean }> => {
  try {
    const response = await get<{ success: boolean; biometricEnabled: boolean }>(
      PROFILE_ENDPOINTS.BIOMETRIC_STATUS
    );
    return { biometricEnabled: response.biometricEnabled };
  } catch (error) {
    console.warn('Get biometric status error:', error);
    throw error;
  }
};

// ============================================================================
// Account Deletion
// ============================================================================

/**
 * Delete user account (soft delete)
 */
export const deleteAccount = async (password?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const body = password ? { password } : undefined;
    const response = await request<{ success: boolean; message: string }>(
      PROFILE_ENDPOINTS.DELETE_ACCOUNT,
      { method: 'DELETE', body }
    );
    return response;
  } catch (error) {
    console.warn('Delete account error:', error);
    throw error;
  }
};

// ============================================================================
// Notification Settings
// ============================================================================

/**
 * Get notification settings
 */
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const response = await get<ApiResponse<NotificationSettings>>(PROFILE_ENDPOINTS.NOTIFICATION_SETTINGS);
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Get notification settings error:', error);
    throw error;
  }
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
  try {
    const response = await put<ApiResponse<NotificationSettings>>(
      PROFILE_ENDPOINTS.NOTIFICATION_SETTINGS,
      settings
    );
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Update notification settings error:', error);
    throw error;
  }
};

/**
 * Update a single notification setting
 */
export const updateSingleNotificationSetting = async (
  settingName: keyof NotificationSettings,
  enabled: boolean
): Promise<NotificationSettings> => {
  try {
    const response = await put<ApiResponse<NotificationSettings>>(
      `${PROFILE_ENDPOINTS.NOTIFICATION_SETTINGS}/${settingName}`,
      { enabled }
    );
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn(`Update ${settingName} error:`, error);
    throw error;
  }
};

// ============================================================================
// Privacy Settings
// ============================================================================

/**
 * Get privacy settings
 */
export const getPrivacySettings = async (): Promise<PrivacySettings> => {
  try {
    const response = await get<ApiResponse<PrivacySettings>>(PROFILE_ENDPOINTS.PRIVACY_SETTINGS);
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Get privacy settings error:', error);
    throw error;
  }
};

/**
 * Update privacy settings
 */
export const updatePrivacySettings = async (settings: Partial<PrivacySettings>): Promise<PrivacySettings> => {
  try {
    const response = await put<ApiResponse<PrivacySettings>>(
      PROFILE_ENDPOINTS.PRIVACY_SETTINGS,
      settings
    );
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Update privacy settings error:', error);
    throw error;
  }
};

// ============================================================================
// Security Settings
// ============================================================================

/**
 * Get security settings
 */
export const getSecuritySettings = async (): Promise<SecuritySettings> => {
  try {
    const response = await get<ApiResponse<SecuritySettings>>(PROFILE_ENDPOINTS.SECURITY_SETTINGS);
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Get security settings error:', error);
    throw error;
  }
};

/**
 * Update two-factor authentication
 */
export const updateTwoFactor = async (enabled: boolean, method?: string, phone?: string): Promise<SecuritySettings> => {
  try {
    const response = await put<ApiResponse<SecuritySettings>>(
      `${PROFILE_ENDPOINTS.SECURITY_SETTINGS}/two-factor`,
      { enabled, method, phone }
    );
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Update two-factor error:', error);
    throw error;
  }
};

/**
 * Update login notifications
 */
export const updateLoginNotifications = async (enabled: boolean, method?: string): Promise<SecuritySettings> => {
  try {
    const response = await put<ApiResponse<SecuritySettings>>(
      `${PROFILE_ENDPOINTS.SECURITY_SETTINGS}/login-notifications`,
      { enabled, method }
    );
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Update login notifications error:', error);
    throw error;
  }
};

/**
 * Setup authenticator app for 2FA
 */
export const setupAuthenticator = async (): Promise<{ secret: string; otpAuthUrl: string }> => {
  try {
    const response = await post<{ success: boolean; secret: string; otpAuthUrl: string }>(
      `${PROFILE_ENDPOINTS.SECURITY_SETTINGS}/authenticator/setup`
    );
    return { secret: response.secret, otpAuthUrl: response.otpAuthUrl };
  } catch (error) {
    console.warn('Setup authenticator error:', error);
    throw error;
  }
};

/**
 * Verify authenticator code
 */
export const verifyAuthenticatorCode = async (code: string): Promise<{ verified: boolean }> => {
  try {
    const response = await post<{ success: boolean; verified: boolean }>(
      `${PROFILE_ENDPOINTS.SECURITY_SETTINGS}/authenticator/verify`,
      { code }
    );
    return { verified: response.verified };
  } catch (error) {
    console.warn('Verify authenticator error:', error);
    throw error;
  }
};

// ============================================================================
// Discovery Settings
// ============================================================================

/**
 * Get discovery settings
 */
export const getDiscoverySettings = async (): Promise<DiscoverySettings> => {
  try {
    const response = await get<ApiResponse<DiscoverySettings>>(PROFILE_ENDPOINTS.DISCOVERY_SETTINGS);
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Get discovery settings error:', error);
    throw error;
  }
};

/**
 * Update discovery settings
 */
export const updateDiscoverySettings = async (settings: Partial<DiscoverySettings>): Promise<DiscoverySettings> => {
  try {
    const response = await put<ApiResponse<DiscoverySettings>>(
      PROFILE_ENDPOINTS.DISCOVERY_SETTINGS,
      settings
    );
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Update discovery settings error:', error);
    throw error;
  }
};

/**
 * Update distance preference
 */
export const updateDistancePreference = async (distance: number): Promise<DiscoverySettings> => {
  try {
    const response = await put<ApiResponse<DiscoverySettings>>(
      `${PROFILE_ENDPOINTS.DISCOVERY_SETTINGS}/distance`,
      { distance }
    );
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Update distance error:', error);
    throw error;
  }
};

/**
 * Update age range
 */
export const updateAgeRange = async (minAge: number, maxAge: number): Promise<DiscoverySettings> => {
  try {
    const response = await put<ApiResponse<DiscoverySettings>>(
      `${PROFILE_ENDPOINTS.DISCOVERY_SETTINGS}/age-range`,
      { minAge, maxAge }
    );
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Update age range error:', error);
    throw error;
  }
};

/**
 * Update show me preference (gender)
 */
export const updateShowMe = async (showMe: 'everyone' | 'men' | 'women'): Promise<DiscoverySettings> => {
  try {
    const response = await put<ApiResponse<DiscoverySettings>>(
      `${PROFILE_ENDPOINTS.DISCOVERY_SETTINGS}/show-me`,
      { showMe }
    );
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Update show me error:', error);
    throw error;
  }
};

/**
 * Update location settings
 */
export const updateLocation = async (
  useCurrentLocation: boolean,
  latitude?: number,
  longitude?: number,
  city?: string,
  country?: string
): Promise<DiscoverySettings> => {
  try {
    const response = await put<ApiResponse<DiscoverySettings>>(
      `${PROFILE_ENDPOINTS.DISCOVERY_SETTINGS}/location`,
      { useCurrentLocation, latitude, longitude, city, country }
    );
    if (response.settings) {
      return response.settings;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.warn('Update location error:', error);
    throw error;
  }
};

// ============================================================================
// Safety & Moderation
// ============================================================================

export interface BlockedUser {
  userId: string;
  username: string;
  blockedAt: string;
}

export interface ReportRequest {
  userId: string;
  reason: string;
  details?: string;
}

/**
 * Block a user
 */
export const blockUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await post<{ success: boolean; message: string }>(
      PROFILE_ENDPOINTS.BLOCK_USER,
      { userId }
    );
    return response;
  } catch (error) {
    console.warn('Block user error:', error);
    throw error;
  }
};

/**
 * Unblock a user
 */
export const unblockUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await post<{ success: boolean; message: string }>(
      PROFILE_ENDPOINTS.UNBLOCK_USER,
      { userId }
    );
    return response;
  } catch (error) {
    console.warn('Unblock user error:', error);
    throw error;
  }
};

/**
 * Report a user
 */
export const reportUser = async (report: ReportRequest): Promise<{ success: boolean; reportId: string; message: string }> => {
  try {
    const response = await post<{ success: boolean; reportId: string; message: string }>(
      PROFILE_ENDPOINTS.REPORT_USER,
      report
    );
    return response;
  } catch (error) {
    console.warn('Report user error:', error);
    throw error;
  }
};

/**
 * Get list of blocked users
 * Backend returns array directly, not wrapped in object
 */
export const getBlockedUsers = async (): Promise<BlockedUser[]> => {
  try {
    const response = await get<BlockedUser[]>(PROFILE_ENDPOINTS.BLOCKED_USERS);
    // Handle both array response and wrapped response for backward compatibility
    if (Array.isArray(response)) {
      return response;
    }
    // Fallback for wrapped response format
    return (response as unknown as { blockedUsers: BlockedUser[] }).blockedUsers || [];
  } catch (error) {
    console.warn('Get blocked users error:', error);
    throw error;
  }
};

// ============================================================================
// Export API Service Object
// ============================================================================

export const profileApi = {
  // Profile
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  uploadAdditionalPhotos,
  deletePhoto,
  deleteProfilePhoto,

  // Password & Security
  changePassword,
  enableBiometric,
  disableBiometric,
  getBiometricStatus,

  // Account
  deleteAccount,

  // Notification Settings
  getNotificationSettings,
  updateNotificationSettings,
  updateSingleNotificationSetting,

  // Privacy Settings
  getPrivacySettings,
  updatePrivacySettings,

  // Security Settings
  getSecuritySettings,
  updateTwoFactor,
  updateLoginNotifications,
  setupAuthenticator,
  verifyAuthenticatorCode,

  // Discovery Settings
  getDiscoverySettings,
  updateDiscoverySettings,
  updateDistancePreference,
  updateAgeRange,
  updateShowMe,
  updateLocation,

  // Safety & Moderation
  blockUser,
  unblockUser,
  reportUser,
  getBlockedUsers,
};

export default profileApi;
