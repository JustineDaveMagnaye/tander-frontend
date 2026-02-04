/**
 * TANDER Root Navigator
 * Premium iOS-Style Loading Screen with animations
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsInitialized,
} from '../store/authStore';
import { WebSocketProvider } from '@services/websocket';
import { LocationPermissionGate } from '@shared/components';
import { PremiumLoadingScreen } from '@shared/components/loading';

/** Duration to show loading splash (in milliseconds) */
const LOADING_SPLASH_DURATION = 3000;

const Stack = createNativeStackNavigator<RootStackParamList>();

// ============================================================================
// ROOT NAVIGATOR
// ============================================================================

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitialized = useAuthStore(selectIsInitialized);
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);

  const [showLoadingSplash, setShowLoadingSplash] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const timer = setTimeout(() => {
      setShowLoadingSplash(false);
    }, LOADING_SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [isInitialized, isAuthenticated]);

  if (!isInitialized) {
    return <PremiumLoadingScreen />;
  }

  if (isAuthenticated && showLoadingSplash) {
    return <PremiumLoadingScreen />;
  }

  return (
    <NavigationContainer>
      <WebSocketProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main">
              {() => (
                <LocationPermissionGate>
                  <MainTabNavigator />
                </LocationPermissionGate>
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      </WebSocketProvider>
    </NavigationContainer>
  );
};

export default RootNavigator;
