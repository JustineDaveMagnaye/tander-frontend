/**
 * Premium iOS-Style Tab Bar
 *
 * Super premium bottom navigation with:
 * - Glassmorphism frosted glass effect
 * - Animated icon transitions with spring physics
 * - Elevated center discovery button
 * - Gradient active indicators
 * - Haptic feedback
 * - Premium shadows and visual polish
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { TanderLogoIcon } from '@shared/components/icons';

// Custom tab bar icons
const TabIcons = {
  messages: require('@/assets/icons/MessagesIcon.png'),
  matches: require('@/assets/icons/MatchesIcon.png'),
  profile: require('@/assets/icons/ProfileIcon.png'),
  tandy: require('@/assets/icons/TandyIcon.png'),
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const TAB_BAR_HEIGHT = 88;
const CENTER_BUTTON_SIZE = 56;
const ICON_SIZE = 26;
const ICON_SIZE_CENTER = 32;
const LABEL_SIZE = 11;

const ACTIVE_COLOR = colors.orange[500];
const INACTIVE_COLOR = colors.gray[400];

// Premium gradient colors
const GRADIENT_ACTIVE: string[] = [colors.orange[400], colors.orange[600]];

// Tab configuration
const TAB_CONFIG: Record<string, { icon: string; customIcon?: any; iconSize?: number; label: string; isCenter?: boolean }> = {
  MessagesTab: { icon: 'messages', customIcon: TabIcons.messages, iconSize: 120, label: 'Messages' },
  MatchesTab: { icon: 'matches', customIcon: TabIcons.matches, iconSize: 95, label: 'Matches' },
  DiscoveryTab: { icon: 'tander-logo', label: 'Discover', isCenter: true },
  ProfileTab: { icon: 'profile', customIcon: TabIcons.profile, iconSize: 120, label: 'Profile' },
  TandyTab: { icon: 'tandy', customIcon: TabIcons.tandy, iconSize: 95, label: 'Tandy' },
};

// =============================================================================
// ANIMATED TAB ITEM COMPONENT
// =============================================================================

interface TabItemProps {
  route: any;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  badge?: number | string;
  descriptors: BottomTabBarProps['descriptors'];
}

const AnimatedTabItem: React.FC<TabItemProps> = ({
  route,
  isFocused,
  onPress,
  onLongPress,
  badge,
  descriptors,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.6)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(isFocused ? 24 : 0)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;

  const config = TAB_CONFIG[route.name] || { icon: 'circle', label: route.name };
  const { options } = descriptors[route.key];

  // Animate on focus change
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.08 : 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isFocused ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: isFocused ? -2 : 0,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(indicatorWidth, {
        toValue: isFocused ? 24 : 0,
        friction: 8,
        tension: 100,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused]);

  // Badge pulse animation
  useEffect(() => {
    if (badge) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(badgeScale, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(badgeScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [badge]);

  const handlePress = () => {
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.08 : 1,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  const renderIcon = () => {
    if (config.icon === 'tander-logo') {
      return <TanderLogoIcon size={ICON_SIZE} focused={isFocused} />;
    }

    // Use custom PNG icons
    if (config.customIcon) {
      const size = config.iconSize || 120;
      return (
        <Image
          source={config.customIcon}
          style={[
            { width: size, height: size },
            { opacity: isFocused ? 1 : 0.5 },
          ]}
          resizeMode="contain"
        />
      );
    }

    return null;
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.tabItemContent,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          {renderIcon()}

          {/* Badge */}
          {badge !== undefined && (
            <Animated.View
              style={[
                styles.badge,
                { transform: [{ scale: badgeScale }] },
              ]}
            >
              <LinearGradient
                colors={[colors.romantic.pink, colors.romantic.pinkDark]}
                style={styles.badgeGradient}
              >
                <Animated.Text style={styles.badgeText} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>
                  {typeof badge === 'number' && badge > 99 ? '99+' : badge}
                </Animated.Text>
              </LinearGradient>
            </Animated.View>
          )}
        </View>

        <Animated.Text
          style={[
            styles.tabLabel,
            { color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={FONT_SCALING.BUTTON}
        >
          {config.label}
        </Animated.Text>

        {/* Active indicator dot */}
        <Animated.View
          style={[
            styles.activeIndicator,
            { width: indicatorWidth },
          ]}
        >
          <LinearGradient
            colors={GRADIENT_ACTIVE}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.indicatorGradient}
          />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// =============================================================================
// CENTER DISCOVERY BUTTON
// =============================================================================

interface CenterButtonProps {
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const CenterDiscoveryButton: React.FC<CenterButtonProps> = ({
  isFocused,
  onPress,
  onLongPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.05 : 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.05 : 1,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel="Discover tab, find new matches"
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.9}
      style={styles.centerButtonWrapper}
    >
      <Animated.View
        style={[
          styles.centerButton,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={isFocused ? GRADIENT_ACTIVE : [colors.gray[100], colors.gray[200]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerButtonGradient}
        >
          <View style={styles.centerButtonInner}>
            <TanderLogoIcon size={ICON_SIZE_CENTER} focused={isFocused} />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Label below */}
      <Animated.Text
        style={[
          styles.centerLabel,
          {
            color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR,
            opacity: isFocused ? 1 : 0.6,
          },
        ]}
        maxFontSizeMultiplier={FONT_SCALING.BUTTON}
      >
        Discover
      </Animated.Text>
    </TouchableOpacity>
  );
};

// =============================================================================
// MAIN PREMIUM TAB BAR COMPONENT
// =============================================================================

export const PremiumTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  // Split routes: left (0,1), center (2), right (3,4)
  const leftRoutes = state.routes.slice(0, 2);
  const centerRoute = state.routes[2];
  const rightRoutes = state.routes.slice(3);

  const handleTabPress = (route: any, index: number) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented && state.index !== index) {
      navigation.navigate(route.name);
    }
  };

  const handleTabLongPress = (route: any) => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  const getBadge = (routeName: string) => {
    const routeKey = state.routes.find(r => r.name === routeName)?.key;
    if (routeKey) {
      return descriptors[routeKey]?.options?.tabBarBadge;
    }
    return undefined;
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {/* Premium glass background */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 100}
        tint="light"
        style={styles.blurContainer}
      >
        {/* Subtle top border gradient */}
        <LinearGradient
          colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']}
          style={styles.topBorderGradient}
        />

        <View style={styles.tabBarContent}>
          {/* Left tabs */}
          <View style={styles.sideTabsContainer}>
            {leftRoutes.map((route, index) => (
              <AnimatedTabItem
                key={route.key}
                route={route}
                isFocused={state.index === index}
                onPress={() => handleTabPress(route, index)}
                onLongPress={() => handleTabLongPress(route)}
                badge={getBadge(route.name)}
                descriptors={descriptors}
              />
            ))}
          </View>

          {/* Center elevated button */}
          <CenterDiscoveryButton
            isFocused={state.index === 2}
            onPress={() => handleTabPress(centerRoute, 2)}
            onLongPress={() => handleTabLongPress(centerRoute)}
          />

          {/* Right tabs */}
          <View style={styles.sideTabsContainer}>
            {rightRoutes.map((route, index) => {
              const actualIndex = index + 3;
              return (
                <AnimatedTabItem
                  key={route.key}
                  route={route}
                  isFocused={state.index === actualIndex}
                  onPress={() => handleTabPress(route, actualIndex)}
                  onLongPress={() => handleTabLongPress(route)}
                  badge={getBadge(route.name)}
                  descriptors={descriptors}
                />
              );
            })}
          </View>
        </View>
      </BlurView>

      {/* Premium shadow layer */}
      <View style={styles.shadowLayer} pointerEvents="none" />
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  blurContainer: {
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  topBorderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  shadowLayer: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 8,
  },
  sideTabsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 60,
  },
  tabItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customIcon: {
    width: 120,
    height: 120,
  },
  tabLabel: {
    fontSize: LABEL_SIZE,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  activeIndicator: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  indicatorGradient: {
    flex: 1,
    borderRadius: 1.5,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  badgeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Center button styles - inline with other tabs
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  centerButton: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[500],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  centerButtonGradient: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    padding: 3,
  },
  centerButtonInner: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: CENTER_BUTTON_SIZE / 2 - 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: LABEL_SIZE,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
});

export default PremiumTabBar;
