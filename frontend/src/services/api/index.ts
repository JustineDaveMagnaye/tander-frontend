/**
 * API Services exports
 *
 * Central export for all API service objects.
 * Import types directly from specific API modules when needed.
 *
 * Usage:
 *   import { authApi, profileApi, matchesApi } from '@services/api';
 *   import { TandyConversationDTO } from '@services/api/tandyApi';
 */

// Re-export API service objects for convenient access
export { authApi } from './authApi';
export { profileApi } from './profileApi';
export { matchesApi } from './matchesApi';
export { discoveryApi } from './discoveryApi';
export { default as chatApi } from './chatApi';
export { twilioApi } from './twilioApi';
export { default as presenceApi } from './presenceApi';
export { storyCommentsApi } from './storyCommentsApi';

// Re-export tandy API as a namespace
import * as tandyApiModule from './tandyApi';
export const tandyApi = tandyApiModule;

// Re-export client
export { default as apiClient } from './client';
