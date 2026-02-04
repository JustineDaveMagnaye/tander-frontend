/**
 * TANDER Messages Stack Navigator
 * Navigation stack for messaging feature including:
 * - Conversations list
 * - Individual chat
 * - Voice/Video calls
 * - Profile details
 *
 * Follows design_system2.md Section 14: Navigation Architecture
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  MessagesScreen,
  ChatScreen,
  CallScreen,
  ProfileDetailScreen,
} from '@features/messaging/screens';
import type { MessagesStackParamList } from './types';
import { colors } from '@shared/styles/colors';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export const MessagesNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.white,
        },
      }}
    >
      <Stack.Screen
        name="ConversationsList"
        component={MessagesScreen}
        options={{
          title: 'Messages',
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Chat',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Call"
        component={CallScreen}
        options={{
          title: 'Call',
          animation: 'fade',
          presentation: 'fullScreenModal',
          gestureEnabled: false, // Prevent accidental dismissal during call
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

export default MessagesNavigator;
