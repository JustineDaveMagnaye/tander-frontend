/**
 * TANDER Main Tab Navigator
 *
 * Standard bottom tab navigation for the app.
 * Senior-friendly with large touch targets and clear labels.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainTabParamList } from './types';
import { TanderLogoIcon } from '@shared/components/icons';
import { MessagesNavigator } from './MessagesNavigator';
import { MatchesNavigator } from './MatchesNavigator';
import { DiscoveryScreen } from '@features/discovery/screens';
import { ProfileScreen } from '@features/profile/screens';
import { TandyNavigator } from './TandyNavigator';
import { useStoryCommentsStore, selectUnreadCount } from '@/store/storyCommentsStore';

import { colors } from '@shared/styles/colors';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Active tab color */
const ACTIVE_COLOR = colors.orange[500];

/** Inactive tab color */
const INACTIVE_COLOR = colors.gray[400];

/** Icon size - Senior-friendly larger icons */
const ICON_SIZE = 28;

/** Label font size - Senior-friendly larger text */
const LABEL_SIZE = 14;

/** Screens where the tab bar should be hidden */
const HIDE_TAB_BAR_SCREENS = ['Chat', 'Call', 'ProfileDetail', 'TandyChat', 'TandyBreathing', 'TandyMeditation'];

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

interface TabConfig {
  name: keyof MainTabParamList;
  label: string;
  icon: keyof typeof Feather.glyphMap | 'tander-logo';
  accessibilityLabel: string;
  customIcon?: boolean;
}

const TAB_CONFIG: TabConfig[] = [
  {
    name: 'MessagesTab',
    label: 'Messages',
    icon: 'message-circle',
    accessibilityLabel: 'Messages tab, view your conversations',
  },
  {
    name: 'MatchesTab',
    label: 'Matches',
    icon: 'heart',
    accessibilityLabel: 'Matches tab, view your matches',
  },
  {
    name: 'DiscoveryTab',
    label: 'Discover',
    icon: 'tander-logo',
    customIcon: true,
    accessibilityLabel: 'Discover tab, find new matches',
  },
  {
    name: 'ProfileTab',
    label: 'Profile',
    icon: 'user',
    accessibilityLabel: 'Profile tab, view and edit your profile',
  },
  {
    name: 'TandyTab',
    label: 'Tandy',
    icon: 'headphones',
    accessibilityLabel: 'Tandy tab, tech support assistant',
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determines if the tab bar should be visible based on the current route.
 */
const shouldShowTabBar = (route: any): boolean => {
  const routeName = getFocusedRouteNameFromRoute(route);
  if (routeName && HIDE_TAB_BAR_SCREENS.includes(routeName)) {
    return false;
  }
  return true;
};

/**
 * Gets the tab configuration for a given route name.
 */
const getTabConfig = (routeName: string): TabConfig | undefined => {
  return TAB_CONFIG.find((t) => t.name === routeName);
};

// =============================================================================
// MAIN TAB NAVIGATOR
// =============================================================================

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const storyResponsesUnreadCount = useStoryCommentsStore(selectUnreadCount);

  // Senior-friendly tab bar with larger touch targets
  const tabBarStyle = {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: 10,
    paddingBottom: Math.max(insets.bottom, 10),
    height: 68 + Math.max(insets.bottom, 10),
  };

  const hiddenTabBarStyle = {
    display: 'none' as const,
    height: 0,
  };

  return (
    <Tab.Navigator
      initialRouteName="DiscoveryTab"
      screenOptions={({ route }) => {
        const tabConfig = getTabConfig(route.name);

        return {
          headerShown: false,

          tabBarIcon: ({ focused }) => {
            if (tabConfig?.customIcon && tabConfig.icon === 'tander-logo') {
              return <TanderLogoIcon size={ICON_SIZE} focused={focused} />;
            }
            return (
              <Feather
                name={(tabConfig?.icon ?? 'circle') as keyof typeof Feather.glyphMap}
                size={ICON_SIZE}
                color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
            );
          },

          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR },
              ]}
            >
              {tabConfig?.label ?? ''}
            </Text>
          ),

          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,

          tabBarItemStyle: styles.tabItem,
          tabBarStyle: tabBarStyle,
          tabBarHideOnKeyboard: true,

          tabBarAccessibilityLabel: tabConfig?.accessibilityLabel,
        };
      }}
    >
      <Tab.Screen
        name="MessagesTab"
        component={MessagesNavigator}
        options={({ route }) => ({
          tabBarStyle: shouldShowTabBar(route) ? tabBarStyle : hiddenTabBarStyle,
        })}
      />

      <Tab.Screen
        name="MatchesTab"
        component={MatchesNavigator}
        options={({ route }) => ({
          tabBarStyle: shouldShowTabBar(route) ? tabBarStyle : hiddenTabBarStyle,
        })}
      />

      <Tab.Screen
        name="DiscoveryTab"
        component={DiscoveryScreen}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarBadge: storyResponsesUnreadCount > 0 ? storyResponsesUnreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.romantic.pink,
            color: colors.white,
            fontSize: 13,
            fontWeight: '700',
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: colors.white,
            top: -4,
            right: -4,
          },
        }}
      />

      <Tab.Screen
        name="TandyTab"
        component={TandyNavigator}
        options={({ route }) => ({
          tabBarStyle: shouldShowTabBar(route) ? tabBarStyle : hiddenTabBarStyle,
        })}
      />
    </Tab.Navigator>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  tabItem: {
    paddingTop: 6,
    paddingBottom: 6,
    minHeight: 56, // Senior-friendly minimum touch target
  },
  tabLabel: {
    fontSize: LABEL_SIZE,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default MainTabNavigator;
