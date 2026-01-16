/**
 * TANDER Matches Stack Navigator
 * Navigation stack for matches feature including:
 * - Matches list
 * - Profile detail view
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MatchesScreen } from '@features/matches/screens';
import { ProfileDetailScreen } from '@features/messaging/screens';
import type { MatchesStackParamList } from './types';
import { colors } from '@shared/styles/colors';

const Stack = createNativeStackNavigator<MatchesStackParamList>();

export const MatchesNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.neutral.background,
        },
      }}
    >
      <Stack.Screen
        name="MatchesList"
        component={MatchesScreen}
        options={{
          title: 'Matches',
        }}
      />
      <Stack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={{
          title: 'Profile',
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};

export default MatchesNavigator;
