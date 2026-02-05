/**
 * API Types and Interfaces
 * Type definitions for all API requests and responses
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
  code?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

// ============================================================================
// User Types
// ============================================================================

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  OTHER = 'OTHER',
}

export enum InterestedIn {
  MEN = 'MEN',
  WOMEN = 'WOMEN',
  EVERYONE = 'EVERYONE',
}

export enum Ethnicity {
  ASIAN = 'ASIAN',
  BLACK = 'BLACK',
  HISPANIC = 'HISPANIC',
  WHITE = 'WHITE',
  MIDDLE_EASTERN = 'MIDDLE_EASTERN',
  MIXED = 'MIXED',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum BodyType {
  SLIM = 'SLIM',
  ATHLETIC = 'ATHLETIC',
  AVERAGE = 'AVERAGE',
  CURVY = 'CURVY',
  HEAVYSET = 'HEAVYSET',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum Religion {
  CHRISTIAN = 'CHRISTIAN',
  MUSLIM = 'MUSLIM',
  JEWISH = 'JEWISH',
  HINDU = 'HINDU',
  BUDDHIST = 'BUDDHIST',
  SPIRITUAL = 'SPIRITUAL',
  AGNOSTIC = 'AGNOSTIC',
  ATHEIST = 'ATHEIST',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum Education {
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  SOME_COLLEGE = 'SOME_COLLEGE',
  BACHELORS = 'BACHELORS',
  MASTERS = 'MASTERS',
  DOCTORATE = 'DOCTORATE',
  TRADE_SCHOOL = 'TRADE_SCHOOL',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum Smoking {
  NEVER = 'NEVER',
  SOCIALLY = 'SOCIALLY',
  REGULARLY = 'REGULARLY',
  TRYING_TO_QUIT = 'TRYING_TO_QUIT',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum Drinking {
  NEVER = 'NEVER',
  SOCIALLY = 'SOCIALLY',
  REGULARLY = 'REGULARLY',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  NOT_SUBMITTED = 'NOT_SUBMITTED',
}

export interface User {
  id: string;
  username: string;
  email: string;
  profileComplete: boolean;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile;
}

export interface UserProfile {
  firstName: string;
  lastName?: string;
  dateOfBirth: string; // ISO date string
  gender: Gender;
  interestedIn: InterestedIn;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  height?: number; // in cm
  ethnicity?: Ethnicity;
  bodyType?: BodyType;
  religion?: Religion;
  education?: Education;
  occupation?: string;
  smoking?: Smoking;
  drinking?: Drinking;
  interests?: string[];
  photos?: string[];
}

export interface StoredUserData {
  id: string;
  username: string;
  email: string;
  profileComplete: boolean;
  verificationStatus: VerificationStatus;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user?: User;
}

export interface CompleteProfileRequest {
  firstName: string;
  lastName?: string;
  dateOfBirth: string; // YYYY-MM-DD format
  age?: number; // Calculated from dateOfBirth
  gender: Gender;
  interestedIn: InterestedIn;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  height?: number;
  ethnicity?: Ethnicity;
  bodyType?: BodyType;
  religion?: Religion;
  education?: Education;
  occupation?: string;
  smoking?: Smoking;
  drinking?: Drinking;
  interests?: string[];
}

export interface CompleteProfileResponse {
  message: string;
  verificationToken: string;
  username: string;
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
}

// ============================================================================
// HTTP Client Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  skipAuth?: boolean;
}

export interface RequestInterceptor {
  onRequest?: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
  onRequestError?: (error: Error) => Promise<Error> | Error;
}

export interface ResponseInterceptor {
  onResponse?: <T>(response: T) => Promise<T> | T;
  onResponseError?: (error: ApiError) => Promise<ApiError> | ApiError;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface TokenData {
  token: string;
  expiresAt?: number;
}

export interface StorageKeys {
  AUTH_TOKEN: string;
  USER_DATA: string;
  REFRESH_TOKEN?: string;
}

// ============================================================================
// API Endpoint Types
// ============================================================================

export interface ApiEndpoints {
  auth: {
    register: string;
    login: string;
    logout: string;
    completeProfile: (username: string) => string;
    verifyId: (username: string) => string;
  };
  user: {
    profile: (username: string) => string;
    update: (username: string) => string;
  };
}
