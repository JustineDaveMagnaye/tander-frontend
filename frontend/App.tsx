/**
 * TANDER - Dating App for Older Adults
 * Main Application Entry Point
 */

import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useOrientationLock } from './src/shared/hooks/useOrientationLock';
import { pushNotificationService } from './src/services/notifications/PushNotificationService';
import { ToastProvider } from './src/shared/components';
import { setupAuthInterceptor } from './src/services/api/authInterceptor';

// =============================================================================
// GLOBAL FONT SCALING PROTECTION
// =============================================================================
// Senior users often increase system font size for readability.
// We allow scaling up to 35% while preventing extreme scaling (200-320%)
// that would break the UI layout. This respects accessibility preferences
// while maintaining usability.
// =============================================================================

const MAX_FONT_SCALE_MULTIPLIER = 1.35;

// Apply to all Text components globally
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE_MULTIPLIER;
(Text as any).defaultProps.allowFontScaling = true;

// Apply to all TextInput components globally
if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE_MULTIPLIER;
(TextInput as any).defaultProps.allowFontScaling = true;

// Setup global auth interceptor to handle 401 errors
setupAuthInterceptor();

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function App() {
  // Lock orientation: portrait only on phones, all orientations on tablets
  useOrientationLock();

  // Request push notification permissions when app starts
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await pushNotificationService.initialize();
        console.log('Push notifications initialized');
      } catch (error) {
        console.log('Push notifications initialization skipped:', error);
      }
    };

    initNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
