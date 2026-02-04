/**
 * ConnectionStatusBar Component
 * Shows network connection status with retry option
 * Animates height to show/hide without covering header
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';

export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

interface ConnectionStatusBarProps {
  state: ConnectionState;
  onRetry?: () => void;
}

const BAR_HEIGHT = 48;
const SHOW_AFTER_MS = 3500;

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
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectedSinceRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleState, setVisibleState] = useState<ConnectionState>('connected');

  const config = getConfig(visibleState);

  useEffect(() => {
    // Clear any pending show timeout
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    if (state === 'connected') {
      disconnectedSinceRef.current = null;
      if (!isVisible) {
        return;
      }
      Animated.timing(heightAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start(() => setIsVisible(false));
      return;
    }

    if (!disconnectedSinceRef.current) {
      disconnectedSinceRef.current = Date.now();
    }

    const elapsed = Date.now() - disconnectedSinceRef.current;
    const delay = Math.max(SHOW_AFTER_MS - elapsed, 0);

    if (isVisible) {
      setVisibleState(state);
      return;
    }

    showTimeoutRef.current = setTimeout(() => {
      setVisibleState(state);
      setIsVisible(true);
      Animated.timing(heightAnim, {
        toValue: BAR_HEIGHT,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }, delay);
  }, [state, heightAnim, isVisible]);

  useEffect(() => {
    // Spin animation for connecting/reconnecting (only when visible)
    if (isVisible && (visibleState === 'connecting' || visibleState === 'reconnecting')) {
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
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
      if (spinAnimRef.current) {
        spinAnimRef.current.stop();
      }
    };
  }, [isVisible, visibleState, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isSpinning = visibleState === 'connecting' || visibleState === 'reconnecting';

  if (!isVisible) {
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
          <Text style={styles.text} maxFontSizeMultiplier={FONT_SCALING.BODY}>{config.text}</Text>
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
            <Text style={styles.retryText} maxFontSizeMultiplier={FONT_SCALING.BUTTON}>Retry</Text>
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
