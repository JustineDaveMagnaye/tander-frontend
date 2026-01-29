/**
 * ConnectionStatusBar Component
 * Shows network connection status with retry option
 * Animates height to show/hide without covering header
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';

export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

interface ConnectionStatusBarProps {
  state: ConnectionState;
  onRetry?: () => void;
}

const BAR_HEIGHT = 48;

const getConfig = (state: ConnectionState) => {
  switch (state) {
    case 'connected':
      return {
        bg: colors.teal[500],
        icon: 'check-circle' as const,
        text: 'Connected',
        showRetry: false,
      };
    case 'connecting':
      return {
        bg: colors.orange[500],
        icon: 'loader' as const,
        text: 'Connecting...',
        showRetry: false,
      };
    case 'reconnecting':
      return {
        bg: colors.orange[500],
        icon: 'loader' as const,
        text: 'Reconnecting...',
        showRetry: false,
      };
    case 'disconnected':
      return {
        bg: colors.gray[600],
        icon: 'wifi-off' as const,
        text: 'No connection',
        showRetry: true,
      };
  }
};

export const ConnectionStatusBar: React.FC<ConnectionStatusBarProps> = ({ state, onRetry }) => {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const config = getConfig(state);

  useEffect(() => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (state === 'connected') {
      // Show briefly, then hide after 1.5 seconds
      setIsVisible(true);
      Animated.timing(heightAnim, {
        toValue: BAR_HEIGHT,
        duration: 300,
        useNativeDriver: false, // height animation can't use native driver
      }).start(() => {
        hideTimeoutRef.current = setTimeout(() => {
          Animated.timing(heightAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start(() => setIsVisible(false));
        }, 1500);
      });
    } else if (state === 'connecting' || state === 'reconnecting' || state === 'disconnected') {
      // Show and stay visible
      setIsVisible(true);
      Animated.timing(heightAnim, {
        toValue: BAR_HEIGHT,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }

    // Spin animation for connecting/reconnecting
    if (state === 'connecting' || state === 'reconnecting') {
      spinAnimRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimRef.current.start();
    } else {
      if (spinAnimRef.current) {
        spinAnimRef.current.stop();
        spinAnimRef.current = null;
      }
      spinAnim.setValue(0);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (spinAnimRef.current) {
        spinAnimRef.current.stop();
      }
    };
  }, [state, heightAnim, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isSpinning = state === 'connecting' || state === 'reconnecting';

  // Don't render anything if not visible (optimization)
  if (!isVisible && state === 'connected') {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { height: heightAnim },
      ]}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: config.bg },
        ]}
        accessible={true}
        accessibilityLabel={config.text}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <View style={styles.content}>
          <Animated.View style={isSpinning ? { transform: [{ rotate: spin }] } : undefined}>
            <Feather name={config.icon} size={18} color={colors.white} />
          </Animated.View>
          <Text style={styles.text}>{config.text}</Text>
        </View>
        {config.showRetry && onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            style={styles.retryButton}
            accessible={true}
            accessibilityLabel="Retry connection"
            accessibilityRole="button"
          >
            <Feather name="refresh-cw" size={16} color={colors.white} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: BAR_HEIGHT,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});

export default ConnectionStatusBar;
