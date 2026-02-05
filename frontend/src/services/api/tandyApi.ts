/**
 * Tandy API Service
 *
 * Provides API endpoints for the Tandy wellness companion chatbot.
 * Connects to the Spring Boot backend at /api/tandy/*
 *
 * Endpoints:
 * - GET /api/tandy/conversation - Get or create conversation
 * - POST /api/tandy/send - Send message and get AI response
 * - POST /api/tandy/language - Set language preference
 * - DELETE /api/tandy/conversation - Clear conversation history
 * - GET /api/tandy/greeting - Get greeting message
 * - GET /api/tandy/health - Health check (no auth)
 */

import { get, post, del } from './client';

// ============================================================================
// TYPE DEFINITIONS (matching backend DTOs)
// ============================================================================

/**
 * Message DTO from backend
 */
export interface TandyMessageDTO {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO date string
}

/**
 * Quick action DTO from backend
 */
export interface QuickActionDTO {
  text: string;
  action: string;
}

/**
 * Conversation DTO from backend
 */
export interface TandyConversationDTO {
  id: number;
  language: string;
  messages: TandyMessageDTO[];
  createdAt: string;
  updatedAt: string;
  greeting: string;
  quickActions: QuickActionDTO[];
}

/**
 * Sponsor location DTO
 */
export interface SponsorLocationDTO {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  distanceText?: string;
  distanceMeters?: number;
}

/**
 * Sponsor product DTO
 */
export interface SponsorProductDTO {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
}

/**
 * Sponsor photo DTO
 */
export interface SponsorPhotoDTO {
  id: number;
  url: string;
  caption?: string;
  isPrimary?: boolean;
}

/**
 * Sponsor ad DTO from backend
 */
export interface SponsorAdDTO {
  sponsorId: number;
  sponsorName: string;
  sponsorType: string;
  logoUrl?: string;
  message?: string;
  queryCategory?: string;
  nearestLocation?: SponsorLocationDTO;
  recommendedProducts?: SponsorProductDTO[];
  photos?: SponsorPhotoDTO[];
  websiteUrl?: string;
  phoneNumber?: string;
}

/**
 * Send message request DTO
 */
export interface TandySendMessageRequest {
  message: string;
  language?: string;
  latitude?: number;
  longitude?: number;
  includeSponsorAds?: boolean;
}

/**
 * Send message response DTO
 */
export interface TandySendMessageResponse {
  success: boolean;
  userMessage: TandyMessageDTO;
  assistantMessage?: TandyMessageDTO;
  error?: string;
  suggestBreathing: boolean;
  redirectAction?: string;
  detectedEmotion?: string;
  sponsorAd?: SponsorAdDTO;
  hasSponsorAd: boolean;
  detectedLanguage?: string;
}

/**
 * Set language request DTO
 */
export interface TandySetLanguageRequest {
  language: string;
}

/**
 * Health check response
 */
export interface TandyHealthResponse {
  service: string;
  aiProvider: string;
  aiProviderAvailable: boolean;
  error?: string;
  hint?: string;
}

/**
 * Test connection response
 */
export interface TandyTestConnectionResponse {
  service: string;
  aiProvider: string;
  aiProviderConfigured: boolean;
  success: boolean;
  response?: string;
  tokensUsed?: number;
  model?: string;
  error?: string;
  errorType?: string;
  cause?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get or create the conversation for the authenticated user.
 * Creates a new conversation if one doesn't exist.
 *
 * @returns Promise<TandyConversationDTO> The conversation with messages
 */
export async function getConversation(): Promise<TandyConversationDTO> {
  return get<TandyConversationDTO>('/api/tandy/conversation');
}

/**
 * Send a message to Tandy and receive an AI response.
 *
 * @param request The message request with content and optional settings
 * @returns Promise<TandySendMessageResponse> The response with user message and AI reply
 */
export async function sendMessage(request: TandySendMessageRequest): Promise<TandySendMessageResponse> {
  return post<TandySendMessageResponse>('/api/tandy/send', request);
}

/**
 * Set the language preference for the conversation.
 * Supported languages: 'en' (English), 'tl' (Tagalog/Filipino)
 *
 * @param language The language code
 * @returns Promise<TandyConversationDTO> The updated conversation
 */
export async function setLanguage(language: string): Promise<TandyConversationDTO> {
  const request: TandySetLanguageRequest = { language };
  return post<TandyConversationDTO>('/api/tandy/language', request);
}

/**
 * Clear the conversation history.
 *
 * @returns Promise<TandyConversationDTO> A fresh conversation
 */
export async function clearConversation(): Promise<TandyConversationDTO> {
  return del<TandyConversationDTO>('/api/tandy/conversation');
}

/**
 * Get a greeting message based on language and time of day.
 *
 * @param language The language code (defaults to 'en')
 * @returns Promise<string> The greeting message
 */
export async function getGreeting(language: string = 'en'): Promise<string> {
  return get<string>(`/api/tandy/greeting?language=${language}`);
}

/**
 * Health check endpoint to verify Tandy/AI configuration.
 * Does NOT require authentication.
 *
 * @returns Promise<TandyHealthResponse> Health status information
 */
export async function healthCheck(): Promise<TandyHealthResponse> {
  return get<TandyHealthResponse>('/api/tandy/health', { skipAuth: true });
}

/**
 * Test connection to the AI provider.
 * Does NOT require authentication.
 *
 * @returns Promise<TandyTestConnectionResponse> Connection test results
 */
export async function testConnection(): Promise<TandyTestConnectionResponse> {
  return get<TandyTestConnectionResponse>('/api/tandy/test-connection', { skipAuth: true });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a backend timestamp to a display-friendly time string.
 *
 * @param timestamp ISO date string from backend
 * @returns Formatted time string like "10:30 AM"
 */
export function formatMessageTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Convert backend message role to frontend sender format.
 *
 * @param role Backend role ('user' or 'assistant')
 * @returns Frontend sender ('user' or 'tandy')
 */
export function roleToSender(role: 'user' | 'assistant'): 'user' | 'tandy' {
  return role === 'user' ? 'user' : 'tandy';
}

/**
 * Convert backend TandyMessageDTO to frontend ChatMessage format.
 *
 * @param dto Backend message DTO
 * @returns Frontend ChatMessage
 */
export function convertToFrontendMessage(dto: TandyMessageDTO): {
  id: string;
  content: string;
  sender: 'user' | 'tandy';
  time: string;
} {
  return {
    id: `msg_${dto.id}`,
    content: dto.content,
    sender: roleToSender(dto.role),
    time: formatMessageTime(dto.timestamp),
  };
}

/**
 * Parse redirect action to determine breathing exercise pattern.
 *
 * @param redirectAction Backend redirect action (e.g., "breathing:calm")
 * @returns Object with shouldRedirect flag and pattern name
 */
export function parseRedirectAction(redirectAction?: string): {
  shouldRedirect: boolean;
  pattern?: 'calm' | 'sleep' | 'anxiety';
} {
  if (!redirectAction) {
    return { shouldRedirect: false };
  }

  if (redirectAction.startsWith('breathing:')) {
    const pattern = redirectAction.replace('breathing:', '') as 'calm' | 'sleep' | 'anxiety';
    return { shouldRedirect: true, pattern };
  }

  return { shouldRedirect: false };
}
