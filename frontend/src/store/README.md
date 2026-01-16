# TANDER Store

This directory contains Zustand stores for state management in the TANDER app.

## Authentication Store

The `authStore.ts` manages all authentication-related state and actions.

### Usage Example

```typescript
import { useAuthStore, selectIsAuthenticated, selectUser } from '@store';

function MyComponent() {
  // Using selectors for optimal performance
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore(selectUser);

  // Accessing actions
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  const handleLogin = async () => {
    try {
      await login('username', 'password');
      // Login successful
    } catch (error) {
      // Handle error
    }
  };

  return (
    // Your component JSX
  );
}
```

### Registration Flow

The auth store supports a 3-phase registration flow:

1. **Phase 1 - Register**: User provides username, email, and password
   ```typescript
   await register('username', 'email@example.com', 'password');
   // registrationPhase: 'registered'
   // currentUsername: 'username'
   ```

2. **Phase 2 - Complete Profile**: User fills out profile information
   ```typescript
   await completeProfile({
     firstName: 'John',
     lastName: 'Doe',
     dateOfBirth: '1980-01-01',
     gender: 'male',
     bio: 'Hello!',
     // ... other profile data
   });
   // registrationPhase: 'profile_completed'
   ```

3. **Phase 3 - Verify ID**: User submits ID photos for verification
   ```typescript
   await verifyId(frontPhoto, backPhoto);
   // registrationPhase: 'verified'
   // isAuthenticated: true
   // User is now logged in
   ```

### State Properties

- `isAuthenticated`: Boolean indicating if user is logged in
- `isLoading`: Boolean indicating loading state
- `isInitialized`: Boolean indicating if auth status has been checked
- `user`: User object (null if not authenticated)
- `token`: JWT token (null if not authenticated)
- `registrationPhase`: Current phase of registration ('none', 'registered', 'profile_completed', 'verified')
- `currentUsername`: Username being used during registration flow
- `error`: Error message (null if no error)

### Actions

- `login(username, password)`: Authenticate user
- `register(username, email, password)`: Register new user (Phase 1)
- `completeProfile(profile)`: Complete user profile (Phase 2)
- `verifyId(frontPhoto, backPhoto?)`: Verify ID (Phase 3)
- `logout()`: Log out user
- `checkAuthStatus()`: Check and restore auth state from storage
- `setRegistrationPhase(phase)`: Manually set registration phase
- `clearError()`: Clear error message

### Persistence

The auth store automatically persists the following to AsyncStorage:
- Authentication token
- User data
- Registration phase
- Current username (during registration)

The `checkAuthStatus()` action is called on app start to restore auth state.

## Best Practices

1. **Use Selectors**: Always use the exported selectors for better performance
   ```typescript
   // Good
   const isAuth = useAuthStore(selectIsAuthenticated);

   // Avoid (causes unnecessary re-renders)
   const { isAuthenticated } = useAuthStore();
   ```

2. **Handle Errors**: All async actions can throw errors
   ```typescript
   try {
     await login(username, password);
   } catch (error) {
     // Handle error appropriately
   }
   ```

3. **Clear Errors**: Use `clearError()` to clear error messages after displaying them

4. **Check Initialization**: Wait for `isInitialized` before rendering content
   ```typescript
   if (!isInitialized) {
     return <LoadingScreen />;
   }
   ```
