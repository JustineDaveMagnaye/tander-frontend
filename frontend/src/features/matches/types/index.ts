/**
 * TANDER Matches Types
 * Type definitions for the matches feature
 * Fresh implementation based on Figma design
 */

export type FilterType = 'all' | 'new' | 'online';

export interface Match {
  id: string;
  name: string;
  age: number;
  location: string;
  status: 'online' | 'offline';
  matchedTime: string;
  matchedHours: number;
  image: string;
  images: string[];
  hasLike: boolean;
  isNew: boolean;
  bio: string;
  interests: string[];
  occupation: string;
  education: string;
  height: string;
  lookingFor: string;
  distance: string;
  // Additional fields for MatchCard component compatibility
  photoUrl: string;
  isOnline: boolean;
  hasNewMessage: boolean;
  matchedAt: Date;
  expiresAt: Date;
  hasFirstMessage: boolean;
  // Backend conversation reference
  conversationId: number | null;
  matchedUserId: number;
  // Verification status
  isVerified?: boolean;
}

export interface MatchesState {
  matches: Match[];
  newMatches: Match[];
  isLoading: boolean;
  error: string | null;
}

export interface ExpirationTime {
  hours: number;
  minutes: number;
  seconds: number;
  percentage: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isCritical: boolean;
  displayText: string;
}
