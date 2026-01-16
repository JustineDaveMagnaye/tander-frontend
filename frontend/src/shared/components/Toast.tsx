/**
 * Toast Component
 * Beautiful, animated toast notifications for TANDER
 * Senior-friendly with large text and clear icons
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { useToastStore, ToastConfig, ToastType } from '@store/toastStore';

// ============================================================================
// Constants
// ============================================================================

const ANIMATION_DURATION = 300;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Toast type configurations
const TOAST_CONFIGS: Record<ToastType, {
  backgroundColor: string;
  borderColor: string;
  iconName: keyof typeof Feather.glyphMap;
  iconColor: string;
}> = {
  success: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    iconName: 'check-circle',
    iconColor: '#059669',
  },
  error: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    iconName: 'alert-circle',
    iconColor: '#DC2626',
  },
  warning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    iconName: 'alert-triangle',
    iconColor: '#D97706',
  },
  info: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    iconName: 'info',
    iconColor: '#2563EB',
  },
};

// ============================================================================
// Single Toast Item Component
// ============================================================================

interface ToastItemProps {
  toast: ToastConfig;
  onDismiss: (id: string) => void;
  index: number;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, index }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const config = TOAST_CONFIGS[toast.type];

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback
    if (toast.type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (toast.type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleDismiss = () => {
    // Exit animation
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          backgroundColor: config.backgroundColor,
          borderLeftColor: config.borderColor,
          transform: [{ translateY }, { scale }],
          opacity,
          marginBottom: index > 0 ? 8 : 0,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={handleDismiss}
        activeOpacity={0.8}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: config.borderColor + '20' }]}>
          <Feather name={config.iconName} size={24} color={config.iconColor} />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
          )}
        </View>

        {/* Action Button or Dismiss */}
        {toast.action ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: config.borderColor }]}
            onPress={() => {
              toast.action?.onPress();
              handleDismiss();
            }}
          >
            <Text style={styles.actionText}>{toast.action.label}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <Feather name="x" size={20} color={colors.gray[400]} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && (
        <ProgressBar duration={toast.duration} color={config.borderColor} />
      )}
    </Animated.View>
  );
};

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  duration: number;
  color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ duration, color }) => {
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration,
      useNativeDriver: false, // Can't use native driver for width
    }).start();
  }, [duration]);

  return (
    <View style={styles.progressBarContainer}>
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: color,
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

// ============================================================================
// Toast Container Component (Provider)
// ============================================================================

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const { toasts, hideToast } = useToastStore();

  return (
    <View style={styles.root}>
      {children}

      {/* Toast Container - positioned at top */}
      <View
        style={[
          styles.toastsContainer,
          {
            top: insets.top + 10,
            left: 16,
            right: 16,
          },
        ]}
        pointerEvents="box-none"
      >
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={hideToast}
            index={index}
          />
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toastsContainer: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 9999,
  },
  toastContainer: {
    borderRadius: 16,
    borderLeftWidth: 4,
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
    overflow: 'hidden',
    maxWidth: SCREEN_WIDTH - 32,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  message: {
    fontSize: 15,
    color: colors.gray[600],
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  dismissButton: {
    padding: 8,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: colors.gray[100],
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default ToastProvider;
