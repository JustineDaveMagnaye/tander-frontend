/**
 * HTTP Client
 * Centralized API client with request/response interceptors
 * Handles authentication, error handling, and response parsing
 */

import { getToken } from '@/services/storage/tokenStorage';
import {
  ApiError,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from '@/types/api';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.tanderconnect.com';

// ============================================================================
// Interceptors
// ============================================================================

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

/**
 * Add a request interceptor
 */
export const addRequestInterceptor = (interceptor: RequestInterceptor): void => {
  requestInterceptors.push(interceptor);
};

/**
 * Add a response interceptor
 */
export const addResponseInterceptor = (interceptor: ResponseInterceptor): void => {
  responseInterceptors.push(interceptor);
};

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Create a standardized API error
 */
const createApiError = (
  message: string,
  statusCode?: number,
  errors?: Record<string, string[]>,
  code?: string
): ApiError => ({
  message,
  statusCode,
  errors,
  code,
});

/**
 * Handle fetch errors and create appropriate API errors
 */
const handleFetchError = (error: unknown): ApiError => {
  if (error instanceof TypeError) {
    // Network error (no internet, CORS, etc.)
    return createApiError('Network error. Please check your connection.', 0);
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return createApiError('Request timeout. Please try again.', 408);
    }
    return createApiError(error.message);
  }

  return createApiError('An unexpected error occurred');
};

/**
 * Parse error response from the API
 */
const parseErrorResponse = async (response: Response): Promise<ApiError> => {
  try {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return createApiError(
        data.message || data.error || `Request failed with status ${response.status}`,
        response.status,
        data.errors,
        data.code // Include error code if present
      );
    } catch {
      // If JSON parsing fails, use the raw text as the error message
      return createApiError(
        text || `Request failed with status ${response.status}`,
        response.status
      );
    }
  } catch {
    // If reading text fails, return a generic error
    return createApiError(
      `Request failed with status ${response.status}`,
      response.status
    );
  }
};

// ============================================================================
// Request Building
// ============================================================================

/**
 * Build query string from params object
 */
const buildQueryString = (params?: Record<string, string | number | boolean>): string => {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, String(value));
  });

  return `?${queryParams.toString()}`;
};

/**
 * Build request headers
 */
const buildHeaders = async (
  config: RequestConfig,
  customHeaders?: Record<string, string>
): Promise<HeadersInit> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
    ...config.headers,
  };

  // Add authentication token if not explicitly skipped
  if (!config.skipAuth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

/**
 * Build request body
 */
const buildBody = (body?: unknown): BodyInit | undefined => {
  if (!body) {
    return undefined;
  }

  // If body is FormData, don't stringify
  if (body instanceof FormData) {
    return body;
  }

  // If body is a Blob or File, return as is
  if (body instanceof Blob) {
    return body;
  }

  // Otherwise, stringify JSON
  return JSON.stringify(body);
};

// ============================================================================
// Core Request Function
// ============================================================================

/**
 * Make an HTTP request with error handling and interceptors
 */
export const request = async <T = unknown>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> => {
  // Apply request interceptors
  let modifiedConfig = config;
  for (const interceptor of requestInterceptors) {
    if (interceptor.onRequest) {
      modifiedConfig = await interceptor.onRequest(modifiedConfig);
    }
  }

  const {
    method = 'GET',
    params,
    body,
    timeout = DEFAULT_TIMEOUT,
  } = modifiedConfig;

  // Build URL
  const queryString = buildQueryString(params);
  const url = `${BASE_URL}${endpoint}${queryString}`;

  // Build headers
  const headers = await buildHeaders(modifiedConfig);

  // Build request body
  const requestBody = buildBody(body);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Make the request
    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      const error = await parseErrorResponse(response);

      // Apply response error interceptors
      let modifiedError = error;
      for (const interceptor of responseInterceptors) {
        if (interceptor.onResponseError) {
          modifiedError = await interceptor.onResponseError(modifiedError);
        }
      }

      throw modifiedError;
    }

    // Parse response
    let data: T;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      // Try to parse as JSON, but handle cases where backend sends plain text
      // with application/json content-type header
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        // Backend returned non-JSON with JSON content-type header
        // Wrap the text in a message object for consistency
        console.warn('[API Client] Received non-JSON response with JSON content-type:', text.substring(0, 100));
        data = { message: text, success: response.ok } as T;
      }
    } else {
      // For non-JSON responses, return the response text wrapped
      const text = await response.text();
      data = { message: text, success: response.ok } as T;
    }

    // Apply response interceptors
    let modifiedData = data;
    for (const interceptor of responseInterceptors) {
      if (interceptor.onResponse) {
        modifiedData = await interceptor.onResponse(modifiedData);
      }
    }

    return modifiedData;
  } catch (error) {
    clearTimeout(timeoutId);

    // If it's already an ApiError, rethrow it
    if (typeof error === 'object' && error !== null && 'message' in error && 'statusCode' in error) {
      throw error;
    }

    // Otherwise, handle the error
    const apiError = handleFetchError(error);

    // Apply response error interceptors
    let modifiedError = apiError;
    for (const interceptor of responseInterceptors) {
      if (interceptor.onResponseError) {
        modifiedError = await interceptor.onResponseError(modifiedError);
      }
    }

    throw modifiedError;
  }
};

// ============================================================================
// Convenience Methods
// ============================================================================

/**
 * Make a GET request
 */
export const get = <T = unknown>(
  endpoint: string,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<T> => {
  return request<T>(endpoint, { ...config, method: 'GET' });
};

/**
 * Make a POST request
 */
export const post = <T = unknown>(
  endpoint: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<T> => {
  return request<T>(endpoint, { ...config, method: 'POST', body });
};

/**
 * Make a PUT request
 */
export const put = <T = unknown>(
  endpoint: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<T> => {
  return request<T>(endpoint, { ...config, method: 'PUT', body });
};

/**
 * Make a PATCH request
 */
export const patch = <T = unknown>(
  endpoint: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<T> => {
  return request<T>(endpoint, { ...config, method: 'PATCH', body });
};

/**
 * Make a DELETE request
 */
export const del = <T = unknown>(
  endpoint: string,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<T> => {
  return request<T>(endpoint, { ...config, method: 'DELETE' });
};

// ============================================================================
// Exports
// ============================================================================

export default {
  request,
  get,
  post,
  put,
  patch,
  delete: del,
  addRequestInterceptor,
  addResponseInterceptor,
};
