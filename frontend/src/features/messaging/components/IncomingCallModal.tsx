/**
 * TANDER IncomingCallModal - Complete Modern Redesign
 * Clean, Senior-Friendly Incoming Call Interface
 *
 * Features:
 * 🎨 Modern dark theme matching CallScreen
 * 📱 Large, clear buttons for easy interaction
 * ✨ Smooth animations without complexity
 * 🎯 Simple, intuitive layout
 * 💫 Clear visual hierarchy
 * ♿ WCAG AAA accessibility
 * 🔊 Vibration alerts
 * ⚡ Optimized performance
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Vibration,
  Platform,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, shadows, borderRadius } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

// Types
interface CallerInfo {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
}

export interface IncomingCallInfo {
  id: string;
  conversationId: string;
  caller: CallerInfo;
  type: 'voice' | 'video';
  timestamp: Date;
}

interface IncomingCallModalProps {
  visible?: boolean;
  call: IncomingCallInfo | null;
  onAccept: () => void;
  onDecline: () => void;
}

// Pulse Rings Component
const PulseRings: React.FC<{ size: number }> = ({ size }) => {
  const pulses = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  useEffect(() => {
    const animations = pulses.map((pulse, index) => 
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 600),
          Animated.timing(pulse, {
            toValue: 2.5,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    );

    animations.forEach(anim => anim.start());
    return () => animations.forEach(anim => anim.stop());
  }, []);

  return (
    <>
      {pulses.map((pulse, i) => {
        const opacity = pulse.interpolate({
          inputRange: [1, 2.5],
          outputRange: [0.6, 0],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.pulseRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                transform: [{ scale: pulse }],
                opacity,
              },
            ]}
          />
        );
      })}
    </>
  );
};

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  visible,
  call,
  onAccept,
  onDecline,
}) => {
  const insets = useSafeAreaInsets();
  const { isTablet, moderateScale } = useResponsive();

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;

  // Refs
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      Vibration.cancel();
    };
  }, []);

  // Handle visibility
  useEffect(() => {
    const isVisible = visible !== undefined ? visible : !!call;

    if (isVisible && call) {
      // Start vibration
      const pattern = Platform.OS === 'android'
        ? [0, 400, 200, 400, 200, 400]
        : [400, 200, 400, 200];

      Vibration.vibrate(pattern);

      vibrationIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          Vibration.vibrate(pattern);
        }
      }, 3000);

      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideUp, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Cleanup
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      Vibration.cancel();
      fadeIn.setValue(0);
      slideUp.setValue(50);
    }

    return () => {
      if (!isVisible) {
        if (vibrationIntervalRef.current) {
          clearInterval(vibrationIntervalRef.current);
          vibrationIntervalRef.current = null;
        }
        Vibration.cancel();
      }
    };
  }, [visible, call, fadeIn, slideUp]);

  // Dismiss handler
  const handleDismiss = useCallback((callback: () => void) => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    Vibration.cancel();

    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isMountedRef.current) {
        callback();
      }
    });
  }, [fadeIn, slideUp]);

  // Get display info
  const getCallerDisplayName = (): string => {
    if (!call) return 'Unknown';
    if (call.caller.firstName) {
      return call.caller.lastName
        ? `${call.caller.firstName} ${call.caller.lastName}`
        : call.caller.firstName;
    }
    return call.caller.name || 'Unknown';
  };

  const getCallerInitial = (): string => {
    if (!call) return 'U';
    if (call.caller.firstName) {
      return call.caller.firstName.charAt(0).toUpperCase();
    }
    return (call.caller.name || 'U').charAt(0).toUpperCase();
  };

  // Sizes
  const avatarSize = isTablet ? moderateScale(160) : moderateScale(140);
  const buttonSize = isTablet ? moderateScale(88) : moderateScale(80);
  const nameSize = isTablet ? moderateScale(36) : moderateScale(30);

  const isModalVisible = visible !== undefined ? visible : !!call;

  if (!call) return null;

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => handleDismiss(onDecline)}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeIn }]}>
        <LinearGradient
          colors={['#000000', '#1A1A1A']}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.container,
            {
              paddingTop: insets.top + spacing.xxl,
              paddingBottom: insets.bottom + spacing.xxl,
              transform: [{ translateY: slideUp }],
            },
          ]}
        >
          {/* Content Card */}
          <View style={styles.card}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <PulseRings size={avatarSize + 40} />

                <View
                  style={[
                    styles.avatar,
                    {
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: avatarSize / 2,
                    },
                  ]}
                >
                  {call.caller.profilePhoto ? (
                    <Image
                      source={{ uri: call.caller.profilePhoto }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Feather name="user" size={avatarSize * 0.5} color="#64748B" />
                    </View>
                  )}
                </View>

                {/* Call Type Badge */}
                <LinearGradient
                  colors={
                    call.type === 'video'
                      ? ['#8B5CF6', '#7C3AED']
                      : ['#10B981', '#059669']
                  }
                  style={styles.callTypeBadge}
                >
                  <Feather
                    name={call.type === 'video' ? 'video' : 'phone'}
                    size={18}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </View>

              {/* Caller Info */}
              <Text style={[styles.callerName, { fontSize: nameSize }]} numberOfLines={2}>
                {getCallerDisplayName()}
              </Text>

              <View style={styles.callTypeRow}>
                <Feather
                  name={call.type === 'video' ? 'video' : 'phone-call'}
                  size={18}
                  color="#94A3B8"
                />
                <Text style={styles.callTypeText}>
                  {call.type === 'video' ? 'Video Call' : 'Voice Call'}
                </Text>
              </View>

              {/* Ringing Indicator */}
              <View style={styles.ringingBadge}>
                <View style={styles.ringingDot} />
                <Text style={styles.ringingText}>Ringing...</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              {/* Decline Button */}
              <TouchableOpacity
                onPress={() => handleDismiss(onDecline)}
                accessible={true}
                accessibilityLabel="Decline call"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={[
                    styles.actionButton,
                    {
                      width: buttonSize,
                      height: buttonSize,
                      borderRadius: buttonSize / 2,
                    },
                  ]}
                >
                  <Feather name="phone-off" size={buttonSize * 0.4} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.actionLabel}>Decline</Text>
              </TouchableOpacity>

              {/* Accept Button */}
              <TouchableOpacity
                onPress={() => handleDismiss(onAccept)}
                accessible={true}
                accessibilityLabel="Accept call"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={[
                    styles.actionButton,
                    styles.acceptButton,
                    {
                      width: buttonSize,
                      height: buttonSize,
                      borderRadius: buttonSize / 2,
                    },
                  ]}
                >
                  <Feather
                    name={call.type === 'video' ? 'video' : 'phone'}
                    size={buttonSize * 0.4}
                    color="#FFFFFF"
                  />
                </LinearGradient>
                <Text style={styles.actionLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: borderRadius.xlarge + 4,
    padding: spacing.xxl,
    maxWidth: 400,
    width: '100%',
    borderWidth: 2,
    borderColor: '#334155',
    ...shadows.large,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#475569',
  },
  avatar: {
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 4,
    borderColor: '#475569',
    ...shadows.large,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  callTypeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1E293B',
    ...shadows.medium,
  },
  callerName: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.s,
    paddingHorizontal: spacing.m,
  },
  callTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.m,
  },
  callTypeText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '600',
  },
  ringingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s + 2,
    borderRadius: 20,
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: '#334155',
  },
  ringingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
  },
  ringingText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    marginTop: spacing.xxl,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF33',
    ...shadows.large,
  },
  acceptButton: {
    // Accept button can have additional styling if needed
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.s,
    textAlign: 'center',
  },
});

export default IncomingCallModal;
