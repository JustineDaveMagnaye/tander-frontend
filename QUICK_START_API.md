# Quick Start Guide - API Service Layer

## Installation Complete

The API service layer has been successfully installed with all dependencies.

## What Was Created

### 1. Core Files
- `src/types/api.ts` - TypeScript type definitions
- `src/services/api/client.ts` - HTTP client with interceptors
- `src/services/api/authApi.ts` - Authentication API service
- `src/services/storage/tokenStorage.ts` - Token storage management

### 2. Documentation
- `src/services/api/README.md` - Comprehensive API documentation
- `src/services/api/EXAMPLES.tsx` - React component usage examples
- `API_IMPLEMENTATION_SUMMARY.md` - Complete implementation summary

### 3. Dependencies
- `@react-native-async-storage/async-storage@^2.2.0` - Installed

## Quick Start - 3 Simple Steps

### Step 1: Configure Environment
Create `.env` file in the frontend root:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080
```

### Step 2: Import and Use

```typescript
import { authApi } from '@services/api';

// Registration
await authApi.register({
  username: 'john',
  email: 'john@example.com',
  password: 'pass123'
});

// Login
const { token, user } = await authApi.login({
  username: 'john',
  password: 'pass123'
});
```

### Step 3: Handle Errors

```typescript
try {
  await authApi.login(credentials);
} catch (error) {
  console.error(error.message);
  // Handle based on error.statusCode
}
```

## Full Registration Flow Example

```typescript
import { authApi } from '@services/api';
import { useState } from 'react';

export const RegistrationFlow = () => {
  const [step, setStep] = useState(1);
  const [verificationToken, setVerificationToken] = useState('');

  // Step 1: Register
  const register = async () => {
    await authApi.register({
      username: 'johndoe',
      email: 'john@example.com',
      password: 'SecurePass123'
    });
    setStep(2);
  };

  // Step 2: Complete Profile
  const completeProfile = async () => {
    const response = await authApi.completeProfile(
      'johndoe',
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1970-01-01',
        gender: 'male',
        interestedIn: 'female',
        bio: 'Looking for companionship'
      },
      true
    );
    setVerificationToken(response.verificationToken);
    setStep(3);
  };

  // Step 3: Verify ID
  const verifyId = async (photoBlob: Blob) => {
    await authApi.verifyId({
      username: 'johndoe',
      idPhotoFront: photoBlob,
      verificationToken
    });
    setStep(4);
  };

  // Step 4: Login
  const login = async () => {
    const response = await authApi.login({
      username: 'johndoe',
      password: 'SecurePass123'
    });
    // Token automatically stored - navigate to home
  };
};
```

## Available API Methods

### Authentication
- `authApi.register(data)` - Register new user
- `authApi.completeProfile(username, data, markAsComplete)` - Complete profile
- `authApi.verifyId(data)` - Upload ID for verification
- `authApi.login(credentials)` - Login and get JWT token
- `authApi.logout()` - Logout and clear data
- `authApi.refreshToken(token)` - Refresh JWT token
- `authApi.validateToken(token)` - Validate JWT token

### HTTP Client
- `get(endpoint, config)` - GET request
- `post(endpoint, body, config)` - POST request
- `put(endpoint, body, config)` - PUT request
- `patch(endpoint, body, config)` - PATCH request
- `del(endpoint, config)` - DELETE request

### Token Storage
- `getToken()` - Get stored JWT token
- `setToken(token)` - Store JWT token
- `removeToken()` - Remove JWT token
- `getUserData()` - Get stored user data
- `setUserData(user)` - Store user data
- `removeUserData()` - Remove user data
- `clearAllData()` - Clear all stored data

## Common Patterns

### With React Navigation
```typescript
const handleLogin = async () => {
  try {
    await authApi.login(credentials);
    navigation.navigate('Home');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### With React Query
```typescript
import { useMutation } from '@tanstack/react-query';

const { mutate, isLoading } = useMutation({
  mutationFn: authApi.login,
  onSuccess: () => navigation.navigate('Home'),
  onError: (error) => Alert.alert('Error', error.message)
});
```

### With Zustand
```typescript
import { create } from 'zustand';
import { authApi } from '@services/api';

const useAuthStore = create((set) => ({
  user: null,
  login: async (credentials) => {
    const response = await authApi.login(credentials);
    set({ user: response.user });
  }
}));
```

## Error Codes Reference

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Network error | Check internet connection |
| 400 | Bad request | Check request data |
| 401 | Unauthorized | Re-login required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not found | Resource doesn't exist |
| 408 | Timeout | Retry request |
| 500 | Server error | Contact support |

## Environment Variables

```bash
# Development
EXPO_PUBLIC_API_URL=http://localhost:8080

# Staging
EXPO_PUBLIC_API_URL=https://staging-api.tander.app

# Production
EXPO_PUBLIC_API_URL=https://api.tander.app
```

## TypeScript Support

All methods are fully typed:

```typescript
import type {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ApiError
} from '@/types/api';

const handleLogin = async (credentials: LoginRequest) => {
  try {
    const response: LoginResponse = await authApi.login(credentials);
    const user: User = response.user;
  } catch (error) {
    const apiError = error as ApiError;
    console.error(apiError.message);
  }
};
```

## Next Steps

1. **Set up environment variables** - Create `.env` file with API URL
2. **Test the API** - Use the examples in `EXAMPLES.tsx`
3. **Integrate with your screens** - Import and use in your auth screens
4. **Add error handling** - Use try-catch with appropriate error messages
5. **Test the flow** - Register → Complete Profile → Verify ID → Login

## Need Help?

- Check `src/services/api/README.md` for detailed documentation
- See `src/services/api/EXAMPLES.tsx` for live code examples
- Review `API_IMPLEMENTATION_SUMMARY.md` for complete overview

## Backend Requirements

The backend must support these endpoints:

1. `POST /api/auth/register` - User registration
2. `POST /api/auth/complete-profile/:username` - Profile completion
3. `POST /api/auth/verify-id/:username` - ID verification
4. `POST /api/auth/login` - Login (returns JWT in `Jwt-Token` header)
5. `POST /api/auth/logout` - Logout

See `src/services/api/README.md` for detailed API contract.

---

**You're all set!** The API service layer is ready to use. Start by importing `authApi` in your authentication screens.
