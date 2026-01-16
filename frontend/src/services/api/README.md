# API Service Layer

This directory contains the HTTP client and API service implementations for the TANDER frontend application.

## Files

### `client.ts`
HTTP client built on top of the Fetch API with the following features:
- Automatic JWT token injection from AsyncStorage
- Request/response interceptor pattern
- Centralized error handling
- Timeout support (default: 30 seconds)
- TypeScript type safety
- Response parsing (JSON)

### `authApi.ts`
Authentication API service that handles all auth-related operations:
- User registration
- Profile completion
- ID verification
- Login/Logout
- Token management

### `index.ts`
Barrel export file for convenient imports

## Environment Configuration

Set the API base URL using an environment variable:

```bash
EXPO_PUBLIC_API_URL=http://your-api-url.com
```

If not set, it defaults to `http://localhost:8080`.

## Usage Examples

### 1. Registration (Phase 1)

```typescript
import { authApi } from '@services/api';

try {
  const response = await authApi.register({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'SecurePass123'
  });

  console.log(response.message); // "Registration successful"
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

### 2. Complete Profile (Phase 2)

```typescript
import { authApi } from '@services/api';

try {
  const response = await authApi.completeProfile(
    'johndoe',
    {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1970-01-01',
      gender: 'male',
      bio: 'Looking for companionship',
      // ... other profile fields
    },
    true // markAsComplete
  );

  // Save the verification token for Phase 3
  const verificationToken = response.verificationToken;
} catch (error) {
  console.error('Profile completion failed:', error.message);
}
```

### 3. ID Verification (Phase 3)

```typescript
import { authApi } from '@services/api';
import * as ImagePicker from 'expo-image-picker';

// Pick ID photo
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 1,
});

if (!result.canceled && result.assets[0]) {
  const uri = result.assets[0].uri;

  // Create file blob
  const response = await fetch(uri);
  const blob = await response.blob();

  try {
    const verificationResponse = await authApi.verifyId({
      username: 'johndoe',
      idPhotoFront: blob,
      verificationToken: 'token-from-phase-2', // Optional
    });

    console.log(verificationResponse.message);
  } catch (error) {
    console.error('ID verification failed:', error.message);
  }
}
```

### 4. Login

```typescript
import { authApi } from '@services/api';

try {
  const response = await authApi.login({
    username: 'johndoe',
    password: 'SecurePass123'
  });

  // Token is automatically stored in AsyncStorage
  console.log('Logged in:', response.user);
  console.log('Token:', response.token);
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### 5. Logout

```typescript
import { authApi } from '@services/api';

try {
  await authApi.logout();
  console.log('Logged out successfully');
} catch (error) {
  console.error('Logout failed:', error.message);
}
```

### 6. Using the HTTP Client Directly

```typescript
import { get, post } from '@services/api/client';

// GET request
const users = await get('/api/users');

// POST request
const newUser = await post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// With custom config
const data = await get('/api/users', {
  params: { page: 1, limit: 10 },
  timeout: 5000,
});
```

### 7. Using Request/Response Interceptors

```typescript
import { addRequestInterceptor, addResponseInterceptor } from '@services/api/client';

// Add request interceptor (e.g., for logging)
addRequestInterceptor({
  onRequest: async (config) => {
    console.log('Making request to:', config);
    return config;
  },
  onRequestError: async (error) => {
    console.error('Request error:', error);
    return error;
  }
});

// Add response interceptor (e.g., for global error handling)
addResponseInterceptor({
  onResponse: async (response) => {
    console.log('Response received:', response);
    return response;
  },
  onResponseError: async (error) => {
    if (error.statusCode === 401) {
      // Handle unauthorized - redirect to login
      console.log('Unauthorized - redirecting to login');
    }
    return error;
  }
});
```

## Error Handling

All API calls throw standardized `ApiError` objects with the following structure:

```typescript
interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}
```

Example error handling:

```typescript
import { authApi } from '@services/api';

try {
  await authApi.login({ username: 'test', password: 'test' });
} catch (error) {
  if (error.statusCode === 401) {
    console.error('Invalid credentials');
  } else if (error.statusCode === 0) {
    console.error('Network error - check your connection');
  } else {
    console.error('Error:', error.message);
  }

  // Field-specific errors
  if (error.errors) {
    console.error('Validation errors:', error.errors);
  }
}
```

## TypeScript Types

All request/response types are defined in:
- `src/types/api.ts` - Core API types
- `src/services/api/authApi.ts` - Auth-specific types
- `src/shared/types/user.ts` - User-related types

## Token Storage

JWT tokens are automatically:
- Injected into requests via the `Authorization: Bearer <token>` header
- Stored in AsyncStorage after successful login
- Retrieved from AsyncStorage on app startup
- Cleared on logout

To manually access token storage:

```typescript
import { getToken, setToken, removeToken } from '@services/storage/tokenStorage';

// Get current token
const token = await getToken();

// Manually set token
await setToken('new-token');

// Remove token
await removeToken();
```

## Best Practices

1. Always handle errors with try-catch blocks
2. Use TypeScript types for type safety
3. Store sensitive data (tokens, user info) using the tokenStorage service
4. Use the provided convenience methods (`get`, `post`, etc.) instead of `request` directly
5. Configure the base URL via environment variables for different environments (dev, staging, prod)
6. Use interceptors for cross-cutting concerns (logging, analytics, error tracking)

## Backend API Contract

The API expects the following:

### Registration
- **Endpoint**: `POST /api/auth/register`
- **Body**: `{ username, email, password }`
- **Response**: `{ message }`

### Complete Profile
- **Endpoint**: `POST /api/auth/complete-profile/:username?markAsComplete=true`
- **Body**: Profile data
- **Response**: `{ message, verificationToken, username }`

### Verify ID
- **Endpoint**: `POST /api/auth/verify-id/:username`
- **Body**: FormData with `idPhotoFront`, `idPhotoBack` (optional), `verificationToken` (optional)
- **Response**: `{ status, message }`

### Login
- **Endpoint**: `POST /api/auth/login`
- **Body**: `{ username, password }`
- **Response Header**: `Jwt-Token: Bearer <token>`
- **Response Body**: `{ user }` (optional)

### Logout
- **Endpoint**: `POST /api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Empty or `{ message }`
