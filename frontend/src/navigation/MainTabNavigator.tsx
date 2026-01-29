/**
 * TANDER Main Tab Navigator
 *
 * Premium iOS-style bottom tab navigation with:
 * - Glassmorphism frosted glass effect
 * - Animated icon transitions with spring physics
 * - Elevated center discovery button
 * - Gradient active indicators
 * - Haptic feedback
 * - Senior-friendly with large touch targets
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

import type { MainTabParamList } from './types';
import { PremiumTabBar } from '@shared/components/navigation';
import { MessagesNavigator } from './MessagesNavigator';
import { MatchesNavigator } from './MatchesNavigator';
import { DiscoveryScreen } from '@features/discovery/screens';
import { ProfileScreen } from '@features/profile/screens';
import { TandyNavigator } from './TandyNavigator';
import { useStoryCommentsStore, selectUnreadCount } from '@/store/storyCommentsStore';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Screens where the tab bar should be hidden */
const HIDE_TAB_BAR_SCREENS = [
  'Chat',
  'Call',
  'ProfileDetail',
  'TandyChat',
  'TandyBreathing',
  'TandyMeditation',
  'PsychiatristList',
];

// =============================================================================
// MAIN TAB NAVIGATOR
// =============================================================================

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const storyResponsesUnreadCount = useStoryCommentsStore(selectUnreadCount);

  return (
    <Tab.Navigator
      initialRouteName="DiscoveryTab"
      tabBar={(props) => {
        // Check if we should hide the tab bar on current screen
        const currentRoute = props.state.routes[props.state.index];
        const routeName = getFocusedRouteNameFromRoute(currentRoute);
        if (routeName && HIDE_TAB_BAR_SCREENS.includes(routeName)) {
          return null;
        }
        return <PremiumTabBar {...props} />;
      }}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="MessagesTab"
        component={MessagesNavigator}
        options={{
          tabBarAccessibilityLabel: 'Messages tab, view your conversations',
        }}
      />

      <Tab.Screen
        name="MatchesTab"
        component={MatchesNavigator}
        options={{
          tabBarAccessibilityLabel: 'Matches tab, view your matches',
        }}
      />

      <Tab.Screen
        name="DiscoveryTab"
        component={DiscoveryScreen}
        options={{
          tabBarAccessibilityLabel: 'Discover tab, find new matches',
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarAccessibilityLabel: 'Profile tab, view and edit your profile',
          tabBarBadge: storyResponsesUnreadCount > 0 ? storyResponsesUnreadCount : undefined,
        }}
      />

      <Tab.Screen
        name="TandyTab"
        component={TandyNavigator}
        options={{
          tabBarAccessibilityLabel: 'Tandy tab, tech support assistant',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
