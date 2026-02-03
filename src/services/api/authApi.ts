/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

import { User, ProfileData } from '@shared/types';
import { VerificationStatus } from '@/types/api';
import { post } from './client';
import { setToken, setUserData, clearAllData } from '@/services/storage/tokenStorage';

// ============================================================================
// Type Definitions
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  refreshToken?: string;
  registrationPhase: 'email_verified' | 'profile_completed' | 'verified';
}

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
  phoneNumber?: string;
}

export interface RegisterResponse {
  message: string;
  username?: string;
  registrationToken?: string;
}

export interface CompleteProfileRequest extends ProfileData {
  username?: string;
}

export interface CompleteProfileResponse {
  message: string;
  verificationToken: string;
  username: string;
  user?: {
    idVerified?: boolean;
    profileCompleted?: boolean;
  };
}

export interface VerifyIdRequest {
  username: string;
  idPhotoFront: File | Blob;
  idPhotoBack?: File | Blob;
  verificationToken?: string;
}

export interface VerifyIdResponse {
  status: string;
  message: string;
  token?: string;
  user?: User;
}

export interface SendOtpResponse {
  message: string;
}

export interface VerifyOtpRequest {
  username: string;
  otp: string;
}

export interface VerifyOtpResponse {
  verified: boolean;
  message: string;
}

// Email Verification Types
export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    username: string;
    email: string;
    emailVerified: boolean;
    registrationPhase: string;
  };
  error?: boolean;
  code?: string;
  email?: string; // Masked email for display
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  data?: {
    username: string;
    emailVerified: boolean;
    registrationPhase: string;
  };
  error?: boolean;
  code?: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    nextResendAvailableAt: string;
  };
  error?: boolean;
  code?: string;
  nextResendAvailableAt?: string;
}

// ID Verification Status Types
export interface IdVerificationStatusResponse {
  success: boolean;
  data: {
    status: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
    submittedAt: string | null;
    lastSubmission: {
      id: string;
      status: string;
      submittedAt: string;
      reviewedAt: string | null;
      reviewerNotes: string | null;
    } | null;
    canResubmit: boolean;
    statusHistory: Array<{
      status: string;
      changedAt: string;
    }>;
  };
}

export interface IdVerificationSubmitResponse {
  success: boolean;
  message: string;
  data?: {
    submissionId: string;
    status: string;
    submittedAt: string;
    estimatedReviewTime: string;
  };
  error?: boolean;
  code?: string;
}

export interface AuthApiService {
  login: (data: LoginRequest) => Promise<LoginResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  sendOtp: (username: string) => Promise<SendOtpResponse>;
  verifyOtp: (username: string, otp: string) => Promise<VerifyOtpResponse>;
  completeProfile: (username: string, data: ProfileData, markAsComplete?: boolean) => Promise<CompleteProfileResponse>;
  verifyId: (data: VerifyIdRequest) => Promise<VerifyIdResponse>;
  logout: () => Promise<void>;
  refreshToken: (refreshToken: string) => Promise<{ token: string }>;
  validateToken: (token: string) => Promise<{ valid: boolean; user?: User }>;
  // Email Verification
  registerWithEmail: (data: RegisterRequest) => Promise<EmailVerificationResponse>;
  verifyEmail: (token: string) => Promise<VerifyEmailResponse>;
  resendVerification: (email: string) => Promise<ResendVerificationResponse>;
  loginWithEmailCheck: (data: LoginRequest) => Promise<LoginResponse>;
  // ID Verification (authenticated)
  getIdVerificationStatus: () => Promise<IdVerificationStatusResponse>;
  submitIdVerification: (idFront: File | Blob, idBack?: File | Blob) => Promise<IdVerificationSubmitResponse>;
  resubmitIdVerification: (idFront: File | Blob, idBack?: File | Blob) => Promise<IdVerificationSubmitResponse>;
}

// ============================================================================
// API Endpoints
// ============================================================================

const AUTH_ENDPOINTS = {
  REGISTER: '/user/register',
  SEND_OTP: (username: string) => `/user/send-otp?username=${username}`,
  VERIFY_OTP: (username: string) => `/user/verify-otp?username=${username}`,
  LOGIN: '/user/login',
  LOGOUT: '/user/logout',
  COMPLETE_PROFILE: (username: string) => `/user/complete-profile?username=${username}`,
  VERIFY_ID: (username: string) => `/user/verify-id?username=${username}`,
  REFRESH_TOKEN: '/user/refresh',
  VALIDATE_TOKEN: '/user/validate',
  // New Email Verification Endpoints
  AUTH_REGISTER: '/auth/register',
  AUTH_VERIFY_EMAIL: '/auth/verify-email',
  AUTH_RESEND_VERIFICATION: '/auth/resend-verification',
  AUTH_LOGIN: '/auth/login',
  AUTH_CHECK_EMAIL: '/auth/check-email',
  AUTH_CHECK_USERNAME: '/auth/check-username',
  // ID Verification (authenticated)
  IDV_STATUS: '/idv/status',
  IDV_SUBMIT: '/idv/submit',
  IDV_RESUBMIT: '/idv/resubmit',
} as const;

// Get base URL from environment or default
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.tanderconnect.com';

// ============================================================================
// Phase 1: Registration
// ============================================================================

/**
 * Register a new user account
 * @param data - Registration data (username, email, password)
 * @returns Promise resolving to registration response
 */
const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  try {
    const response = await post<RegisterResponse>(
      AUTH_ENDPOINTS.REGISTER,
      data,
      { skipAuth: true }
    );

    return response;
  } catch (error) {
    console.warn('Registration error:', error);
    throw error;
  }
};

// ============================================================================
// Phase 1.5: OTP Verification
// ============================================================================

/**
 * Send OTP to user's email
 * @param username - The username of the user
 * @returns Promise resolving to send OTP response
 */
const sendOtp = async (username: string): Promise<SendOtpResponse> => {
  try {
    const response = await post<SendOtpResponse>(
      AUTH_ENDPOINTS.SEND_OTP(username),
      {},
      { skipAuth: true }
    );

    return response;
  } catch (error) {
    console.warn('Send OTP error:', error);
    throw error;
  }
};

/**
 * Verify OTP code
 * @param username - The username of the user
 * @param otp - The OTP code to verify
 * @returns Promise resolving to verification result
 */
const verifyOtp = async (username: string, otp: string): Promise<VerifyOtpResponse> => {
  try {
    const response = await post<VerifyOtpResponse>(
      AUTH_ENDPOINTS.VERIFY_OTP(username),
      { otp },
      { skipAuth: true }
    );

    return response;
  } catch (error) {
    console.warn('Verify OTP error:', error);
    throw error;
  }
};

// ============================================================================
// Phase 2: Complete Profile
// ============================================================================

/**
 * Complete user profile after registration
 * @param username - The username of the user
 * @param data - Profile data to complete
 * @param markAsComplete - Whether to mark profile as complete (default: true)
 * @returns Promise resolving to profile completion response with verification token
 */
const completeProfile = async (
  username: string,
  data: ProfileData,
  markAsComplete: boolean = true
): Promise<CompleteProfileResponse> => {
  try {
    // Build the endpoint URL with query parameter if needed
    const endpoint = AUTH_ENDPOINTS.COMPLETE_PROFILE(username);
    const url = markAsComplete ? `${endpoint}?markAsComplete=true` : endpoint;

    const response = await post<CompleteProfileResponse>(
      url,
      data,
      { skipAuth: true }
    );

    return response;
  } catch (error) {
    console.warn('Complete profile error:', error);
    throw error;
  }
};

// ============================================================================
// Phase 3: ID Verification
// ============================================================================

/**
 * Submit ID verification photos
 * @param data - Verification request data
 * @returns Promise resolving to verification response
 */
const verifyId = async (data: VerifyIdRequest): Promise<VerifyIdResponse> => {
  try {
    const { username, idPhotoFront, idPhotoBack, verificationToken } = data;

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('idPhotoFront', idPhotoFront as any);

    if (idPhotoBack) {
      formData.append('idPhotoBack', idPhotoBack as any);
    }

    if (verificationToken) {
      formData.append('verificationToken', verificationToken);
    }

    // Make the request with FormData body
    const response = await fetch(
      `${BASE_URL}${AUTH_ENDPOINTS.VERIFY_ID(username)}`,
      {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData - browser will set it with boundary
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || `Verification failed with status ${response.status}`,
        statusCode: response.status,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.warn('ID verification error:', error);
    throw error;
  }
};

// ============================================================================
// Login
// ============================================================================

/**
 * Login user and retrieve JWT token
 * @param data - Login credentials (username, password)
 * @returns Promise resolving to login response with token
 */
const login = async (data: LoginRequest): Promise<LoginResponse> => {
  try {
    // Make login request
    const response = await fetch(`${BASE_URL}${AUTH_ENDPOINTS.LOGIN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || `Login failed with status ${response.status}`,
        statusCode: response.status,
      };
    }

    // Parse response body (contains registration phase and user data)
    const responseData = await response.json();

    // Extract JWT token from response header (Jwt-Token: Bearer xxx)
    const jwtHeader = response.headers.get('Jwt-Token');

    if (!jwtHeader) {
      throw {
        message: 'No JWT token received from server',
        statusCode: 401,
      };
    }

    // Remove 'Bearer ' prefix if present
    const token = jwtHeader.startsWith('Bearer ')
      ? jwtHeader.substring(7)
      : jwtHeader;

    // Store token first
    await setToken(token);

    // Get registration phase from response (backend now returns this)
    const registrationPhase = responseData.registrationPhase as 'email_verified' | 'profile_completed' | 'verified';

    // Build user object from response data
    let user: User = {
      id: '',
      username: responseData.username || data.username,
      email: responseData.email || '',
      profileComplete: responseData.profileCompleted || false,
      idVerified: responseData.idVerified || false,
    };

    // If fully verified, fetch detailed user data from /user/me
    if (registrationPhase === 'verified') {
      try {
        const meResponse = await fetch(
          `${BASE_URL}/user/me`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (meResponse.ok) {
          const userData = await meResponse.json();
          user = {
            id: userData.id?.toString() || '',
            username: userData.username || data.username,
            email: userData.email || '',
            firstName: userData.firstName,
            lastName: userData.lastName,
            nickName: userData.nickName,
            city: userData.city,
            country: userData.country,
            civilStatus: userData.civilStatus,
            bio: userData.bio,
            isVerified: userData.verified,
            profileComplete: userData.profileCompleted,
            idVerified: userData.verified,
          };

          // Store user data
          await setUserData({
            id: user.id,
            username: user.username,
            email: user.email,
            profileComplete: userData.profileCompleted || false,
            verificationStatus: userData.verified ? VerificationStatus.VERIFIED : VerificationStatus.NOT_SUBMITTED,
          });
        }
      } catch (meError) {
        console.warn('Failed to fetch user data after login:', meError);
        // Continue with basic user data from login response
      }
    }

    return {
      token,
      user,
      registrationPhase,
    };
  } catch (error) {
    console.warn('Login error:', error);
    throw error;
  }
};

// ============================================================================
// Logout
// ============================================================================

/**
 * Logout user and clear stored data
 * @returns Promise resolving when logout is complete
 */
const logout = async (): Promise<void> => {
  try {
    // Call logout endpoint (if server needs to invalidate token)
    await post(AUTH_ENDPOINTS.LOGOUT).catch(() => {
      // Ignore errors from logout endpoint
    });

    // Clear all stored data
    await clearAllData();
  } catch (error) {
    console.warn('Logout error:', error);
    // Still clear local data even if server call fails
    await clearAllData();
  }
};

// ============================================================================
// Token Management
// ============================================================================

/**
 * Refresh the authentication token
 * @param refreshToken - The refresh token
 * @returns Promise resolving to new token
 */
const refreshToken = async (refreshToken: string): Promise<{ token: string }> => {
  try {
    const response = await post<{ token: string }>(
      AUTH_ENDPOINTS.REFRESH_TOKEN,
      { refreshToken },
      { skipAuth: true }
    );

    // Store the new token
    if (response.token) {
      await setToken(response.token);
    }

    return response;
  } catch (error) {
    console.warn('Refresh token error:', error);
    throw error;
  }
};

/**
 * Validate the current token
 * @param token - The token to validate
 * @returns Promise resolving to validation result
 */
const validateToken = async (token: string): Promise<{ valid: boolean; user?: User }> => {
  try {
    const response = await post<{ valid: boolean; user?: User }>(
      AUTH_ENDPOINTS.VALIDATE_TOKEN,
      { token }
    );

    return response;
  } catch (error) {
    console.warn('Validate token error:', error);
    return { valid: false };
  }
};

// ============================================================================
// Email Verification Flow (New)
// ============================================================================

/**
 * Register a new user with email verification
 * @param data - Registration data (username, email, password)
 * @returns Promise resolving to registration response
 */
const registerWithEmail = async (data: RegisterRequest): Promise<EmailVerificationResponse> => {
  try {
    const response = await fetch(`${BASE_URL}${AUTH_ENDPOINTS.AUTH_REGISTER}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username: data.username,
        email: data.email,
        password: data.password,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw {
        message: result.message || 'Registration failed',
        code: result.code || 'REGISTRATION_ERROR',
        statusCode: response.status,
      };
    }

    return result;
  } catch (error) {
    console.warn('Registration with email error:', error);
    throw error;
  }
};

/**
 * Verify email using token from verification link
 * @param token - Verification token from email link
 * @returns Promise resolving to verification response
 */
const verifyEmail = async (token: string): Promise<VerifyEmailResponse> => {
  try {
    const response = await fetch(`${BASE_URL}${AUTH_ENDPOINTS.AUTH_VERIFY_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw {
        message: result.message || 'Email verification failed',
        code: result.code || 'VERIFICATION_ERROR',
        statusCode: response.status,
      };
    }

    return result;
  } catch (error) {
    console.warn('Email verification error:', error);
    throw error;
  }
};

/**
 * Resend verification email
 * @param email - Email address to resend verification to
 * @returns Promise resolving to resend response
 */
const resendVerification = async (email: string): Promise<ResendVerificationResponse> => {
  try {
    const response = await fetch(`${BASE_URL}${AUTH_ENDPOINTS.AUTH_RESEND_VERIFICATION}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw {
        message: result.message || 'Failed to resend verification email',
        code: result.code || 'RESEND_ERROR',
        statusCode: response.status,
        nextResendAvailableAt: result.nextResendAvailableAt,
      };
    }

    return result;
  } catch (error) {
    console.warn('Resend verification error:', error);
    throw error;
  }
};

/**
 * Login with email verification check
 * @param data - Login credentials (username, password)
 * @returns Promise resolving to login response with token
 */
const loginWithEmailCheck = async (data: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await fetch(`${BASE_URL}${AUTH_ENDPOINTS.AUTH_LOGIN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle EMAIL_NOT_VERIFIED specially
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        throw {
          message: result.message || 'Please verify your email before logging in',
          code: 'EMAIL_NOT_VERIFIED',
          email: result.email, // Masked email
          statusCode: response.status,
        };
      }
      throw {
        message: result.message || `Login failed with status ${response.status}`,
        code: result.code || 'LOGIN_ERROR',
        statusCode: response.status,
      };
    }

    // Extract JWT token from response header
    const jwtHeader = response.headers.get('Jwt-Token');
    if (!jwtHeader) {
      throw {
        message: 'No JWT token received from server',
        statusCode: 401,
      };
    }

    const token = jwtHeader.startsWith('Bearer ')
      ? jwtHeader.substring(7)
      : jwtHeader;

    await setToken(token);

    // Build user from response data
    const userData = result.data || {};
    const user: User = {
      id: userData.id?.toString() || '',
      username: userData.username || data.username,
      email: userData.email || '',
      emailVerified: userData.emailVerified,
      profileComplete: userData.profileCompleted,
      idVerified: userData.idVerified,
      idVerificationStatus: userData.idVerificationStatus,
    };

    // Store user data
    await setUserData({
      id: user.id,
      username: user.username,
      email: user.email,
      profileComplete: userData.profileCompleted || false,
      verificationStatus: userData.idVerified ? VerificationStatus.VERIFIED :
        (userData.idVerificationStatus === 'PENDING' ? VerificationStatus.PENDING : VerificationStatus.NOT_SUBMITTED),
    });

    return { token, user };
  } catch (error) {
    console.warn('Login with email check error:', error);
    throw error;
  }
};

// ============================================================================
// ID Verification (Authenticated Endpoints)
// ============================================================================

import { getToken } from '@/services/storage/tokenStorage';

/**
 * Get current ID verification status
 * @returns Promise resolving to ID verification status
 */
const getIdVerificationStatus = async (): Promise<IdVerificationStatusResponse> => {
  try {
    const token = await getToken();
    const response = await fetch(`${BASE_URL}${AUTH_ENDPOINTS.IDV_STATUS}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw {
        message: result.message || 'Failed to get ID verification status',
        code: result.code || 'STATUS_ERROR',
        statusCode: response.status,
      };
    }

    return result;
  } catch (error) {
    console.warn('Get ID verification status error:', error);
    throw error;
  }
};

/**
 * Submit ID verification documents
 * @param idFront - Front photo of ID
 * @param idBack - Optional back photo of ID
 * @returns Promise resolving to submission response
 * Note: Selfie/liveness check is done on frontend only - not sent to backend
 */
const submitIdVerification = async (
  idFront: File | Blob,
  idBack?: File | Blob
): Promise<IdVerificationSubmitResponse> => {
  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append('idFront', idFront as any);
    if (idBack) {
      formData.append('idBack', idBack as any);
    }

    const response = await fetch(`${BASE_URL}${AUTH_ENDPOINTS.IDV_SUBMIT}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw {
        message: result.message || 'ID verification submission failed',
        code: result.code || 'SUBMISSION_ERROR',
        statusCode: response.status,
      };
    }

    return result;
  } catch (error) {
    console.warn('Submit ID verification error:', error);
    throw error;
  }
};

/**
 * Resubmit ID verification documents after rejection
 * @param idFront - Front photo of ID
 * @param idBack - Optional back photo of ID
 * @returns Promise resolving to submission response
 * Note: Selfie/liveness check is done on frontend only - not sent to backend
 */
const resubmitIdVerification = async (
  idFront: File | Blob,
  idBack?: File | Blob
): Promise<IdVerificationSubmitResponse> => {
  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append('idFront', idFront as any);
    if (idBack) {
      formData.append('idBack', idBack as any);
    }

    const response = await fetch(`${BASE_URL}${AUTH_ENDPOINTS.IDV_RESUBMIT}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw {
        message: result.message || 'ID verification resubmission failed',
        code: result.code || 'RESUBMISSION_ERROR',
        statusCode: response.status,
      };
    }

    return result;
  } catch (error) {
    console.warn('Resubmit ID verification error:', error);
    throw error;
  }
};

// ============================================================================
// Export API Service
// ============================================================================

export const authApi: AuthApiService = {
  login,
  register,
  sendOtp,
  verifyOtp,
  completeProfile,
  verifyId,
  logout,
  refreshToken,
  validateToken,
  // Email Verification
  registerWithEmail,
  verifyEmail,
  resendVerification,
  loginWithEmailCheck,
  // ID Verification (authenticated)
  getIdVerificationStatus,
  submitIdVerification,
  resubmitIdVerification,
};

// Export individual functions for direct import
export {
  login,
  register,
  sendOtp,
  verifyOtp,
  completeProfile,
  verifyId,
  logout,
  refreshToken,
  validateToken,
  registerWithEmail,
  verifyEmail,
  resendVerification,
  loginWithEmailCheck,
  getIdVerificationStatus,
  submitIdVerification,
  resubmitIdVerification,
};
