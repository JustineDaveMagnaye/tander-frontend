/**
 * TANDER Tandy Navigator
 *
 * Stack navigator for Tandy wellness companion feature.
 * Pattern matches MessagesNavigator:
 * - TandyHome: Landing page with tab bar visible
 * - TandyChat: Full-screen chat (no tab bar)
 * - TandyBreathing: Full-screen breathing exercise (no tab bar)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TandyHomeScreen, TandyScreen, TandyBreathingScreen, TandyMeditationScreen, PsychiatristListScreen } from '@features/tandy/screens';
import type { TandyStackParamList } from './types';

// ============================================================================
// NAVIGATOR
// ============================================================================

const Stack = createNativeStackNavigator<TandyStackParamList>();

export const TandyNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="TandyHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Landing Page - Tab bar visible */}
      <Stack.Screen
        name="TandyHome"
        component={TandyHomeScreen}
      />

      {/* Chat Screen - Full screen, no tab bar */}
      <Stack.Screen
        name="TandyChat"
        component={TandyScreen}
      />

      {/* Breathing Exercise - Full screen, no tab bar */}
      <Stack.Screen
        name="TandyBreathing"
        component={TandyBreathingScreen}
        options={{
          animation: 'fade',
        }}
      />

      {/* Meditation - Full screen, no tab bar */}
      <Stack.Screen
        name="TandyMeditation"
        component={TandyMeditationScreen}
        options={{
          animation: 'fade',
        }}
      />

      {/* Psychiatrist List - Directory of mental health professionals */}
      <Stack.Screen
        name="PsychiatristList"
        component={PsychiatristListScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};

export default TandyNavigator;
