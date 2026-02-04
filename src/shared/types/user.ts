/**
 * User type definitions
 */

export interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  nickName?: string;
  dateOfBirth?: string;
  birthDate?: string; // MM/DD/YYYY format from profile
  gender?: 'male' | 'female';
  bio?: string;
  photos?: string[];
  city?: string;
  country?: string;
  civilStatus?: string;
  hobby?: string;
  // New fields for senior dating
  interestedIn?: string; // JSON array string e.g., '["male"]' or '["female"]' or '["male","female"]'
  religion?: string;
  numberOfChildren?: number;
  languages?: string; // JSON array string e.g., '["Tagalog", "English"]'
  location?: {
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  preferences?: {
    ageRange?: {
      min: number;
      max: number;
    };
    distance?: number;
    interestedIn?: ('male' | 'female')[];
  };
  isVerified?: boolean;
  emailVerified?: boolean;
  profileComplete?: boolean;
  idVerified?: boolean;
  idVerificationStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Profile data for profile completion (Phase 2)
 * Matches backend ProfileDTO structure
 */
export interface ProfileData {
  firstName: string;
  lastName: string;
  nickName?: string;
  birthDate: string; // MM/DD/YYYY format
  city: string;
  country: string;
  civilStatus?: string;
  hobby?: string;
  // New essential fields for senior dating
  gender: 'male' | 'female';
  interestedIn: string; // JSON array string e.g., '["male"]' or '["female"]'
  religion?: string;
  numberOfChildren?: number;
  languages?: string; // JSON array string e.g., '["Tagalog", "English"]'
  bio?: string;
  // Legacy fields for backwards compatibility
  dateOfBirth?: string;
  photos?: any[];
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  preferences?: {
    ageRange?: {
      min: number;
      max: number;
    };
    distance?: number;
    interestedIn?: ('male' | 'female')[];
  };
}
