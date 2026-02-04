/**
 * TANDER API Service
 * Backend API integration
 */

// Live API URL
const API_BASE_URL = 'https://api.tanderconnect.com';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    username: string;
    email?: string;
    profileCompleted: boolean;
    idVerified: boolean;
  };
  token: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface CompleteProfileRequest {
  username: string;
  firstName: string;
  lastName: string;
  nickName?: string;
  birthDate: string; // Format: MM/dd/yyyy or yyyy-MM-dd
  age?: number; // Calculated from birthDate
  city: string;
  country: string;
  civilStatus?: string;
  hobby?: string;
  // Dating preferences fields
  gender?: 'male' | 'female';
  interestedIn?: string; // JSON array string e.g., '["male"]' or '["female"]'
  religion?: string;
  numberOfChildren?: number;
  languages?: string; // JSON array string e.g., '["Tagalog", "English"]'
}

interface VerifyIdRequest {
  username: string;
  idPhotoFront: File | Blob;
  idPhotoBack?: File | Blob;
  verificationToken?: string;
}

interface ApiError {
  status: number;
  message: string;
  code?: string;
}

/**
 * Login user
 * @throws {ApiError} on failure
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    // Extract JWT token from header
    const jwtHeader = response.headers.get('Jwt-Token');
    let token = '';

    if (jwtHeader && jwtHeader.startsWith('Bearer ')) {
      token = jwtHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Handle different status codes
    if (!response.ok) {
      if (response.status === 401) {
        throw {
          status: 401,
          message: 'Incorrect username or password',
          code: 'INVALID_CREDENTIALS',
        } as ApiError;
      }

      if (response.status === 403) {
        // Parse response body for specific 403 errors
        const data = await response.json().catch(() => ({}));

        // Check if profile not completed
        if (data.profileCompleted === false) {
          throw {
            status: 403,
            message: 'Profile not completed',
            code: 'PROFILE_NOT_COMPLETED',
          } as ApiError;
        }

        // Check if ID not verified
        if (data.idVerified === false) {
          throw {
            status: 403,
            message: 'ID not verified',
            code: 'ID_NOT_VERIFIED',
          } as ApiError;
        }

        throw {
          status: 403,
          message: 'Access forbidden',
          code: 'FORBIDDEN',
        } as ApiError;
      }

      throw {
        status: response.status,
        message: 'Login failed',
        code: 'LOGIN_FAILED',
      } as ApiError;
    }

    const data = await response.json();

    return {
      user: {
        id: data.id || data.userId || '',
        username: credentials.username,
        email: data.email,
        profileCompleted: data.profileCompleted ?? true,
        idVerified: data.idVerified ?? true,
      },
      token,
    };
  } catch (error) {
    // Re-throw ApiErrors
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw {
        status: 0,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      } as ApiError;
    }

    // Unknown error
    throw {
      status: 500,
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    } as ApiError;
  }
}

/**
 * Register new user (Phase 1)
 * @throws {ApiError} on failure
 */
export async function register(credentials: RegisterRequest): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      if (response.status === 409) {
        // Username or email already exists
        const data = await response.json().catch(() => ({}));
        const message = data.message || '';

        if (message.toLowerCase().includes('username')) {
          throw {
            status: 409,
            message: 'Username already exists',
            code: 'USERNAME_EXISTS',
          } as ApiError;
        }

        if (message.toLowerCase().includes('email')) {
          throw {
            status: 409,
            message: 'Email already exists',
            code: 'EMAIL_EXISTS',
          } as ApiError;
        }

        throw {
          status: 409,
          message: 'User already exists',
          code: 'USER_EXISTS',
        } as ApiError;
      }

      throw {
        status: response.status,
        message: 'Registration failed',
        code: 'REGISTRATION_FAILED',
      } as ApiError;
    }

    return { success: true };
  } catch (error) {
    // Re-throw ApiErrors
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw {
        status: 0,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      } as ApiError;
    }

    // Unknown error
    throw {
      status: 500,
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    } as ApiError;
  }
}

/**
 * Complete user profile (Phase 2)
 * @throws {ApiError} on failure
 */
export async function completeProfile(
  data: CompleteProfileRequest,
  markAsComplete: boolean = true
): Promise<{ verificationToken?: string }> {
  try {
    const profileData = {
      firstName: data.firstName,
      lastName: data.lastName,
      nickName: data.nickName,
      birthDate: data.birthDate,
      city: data.city,
      country: data.country,
      civilStatus: data.civilStatus,
      hobby: data.hobby,
    };

    const response = await fetch(
      `${API_BASE_URL}/user/complete-profile?username=${encodeURIComponent(data.username)}&markAsComplete=${markAsComplete}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.message || 'Profile completion failed',
        code: 'PROFILE_FAILED',
      } as ApiError;
    }

    const responseData = await response.json().catch(() => ({}));

    return {
      verificationToken: responseData.verificationToken,
    };
  } catch (error) {
    // Re-throw ApiErrors
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw {
        status: 0,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      } as ApiError;
    }

    // Unknown error
    throw {
      status: 500,
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    } as ApiError;
  }
}

/**
 * Verify user ID with photo upload
 * @throws {ApiError} on failure
 */
export async function verifyId(data: VerifyIdRequest): Promise<{ success: boolean }> {
  try {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('idPhotoFront', data.idPhotoFront as any);

    if (data.idPhotoBack) {
      formData.append('idPhotoBack', data.idPhotoBack as any);
    }

    if (data.verificationToken) {
      formData.append('verificationToken', data.verificationToken);
    }

    const response = await fetch(`${API_BASE_URL}/user/verify-id`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary for multipart
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.message || 'ID verification failed',
        code: 'VERIFICATION_FAILED',
      } as ApiError;
    }

    return { success: true };
  } catch (error) {
    // Re-throw ApiErrors
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw {
        status: 0,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      } as ApiError;
    }

    // Unknown error
    throw {
      status: 500,
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    } as ApiError;
  }
}
