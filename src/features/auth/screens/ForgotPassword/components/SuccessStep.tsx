/**
 * SuccessStep Component - Premium iOS Edition
 * Step 4: Password reset success confirmation
 */

import React, { memo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, AccessibilityInfo, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ResponsiveSizes } from '../types';
import { iOS, A11Y_LABELS, SUCCESS_MESSAGES } from '../constants';

interface SuccessStepProps {
  sizes: ResponsiveSizes;
  isTablet: boolean;
  isLandscape: boolean;
  reduceMotion: boolean;
  onSignIn: () => void;
}

export const SuccessStep = memo(function SuccessStep({
  sizes,
  isTablet,
  isLandscape,
  reduceMotion,
  onSignIn,
}: SuccessStepProps) {
  // Animation values
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  // Announce success to screen readers
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      'Password reset successful. You can now sign in with your new password.'
    );

    // Entrance animation
    if (!reduceMotion) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [reduceMotion, scaleAnim, opacityAnim]);

  // Responsive sizing
  const iconSize = isTablet ? 100 : 80;
  const checkSize = isTablet ? 48 : 40;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="alert"
      accessibilityLabel="Password reset successful"
    >
      {/* Success Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize / 2,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Feather name="check" size={checkSize} color={iOS.colors.white} />
      </Animated.View>

      {/* Title */}
      <Animated.View style={{ opacity: opacityAnim }}>
        <Text style={styles.title}>
          Password Reset!
        </Text>
      </Animated.View>

      {/* Message */}
      <Animated.View style={{ opacity: opacityAnim }}>
        <Text style={styles.message}>
          {SUCCESS_MESSAGES.password_reset}
          {'\n'}You can now sign in with your new password.
        </Text>
      </Animated.View>

      {/* Decorative Checkmarks */}
      <Animated.View style={[styles.decorativeRow, { opacity: opacityAnim }]}>
        <View style={styles.decorativeItem}>
          <Feather name="shield" size={20} color={iOS.colors.teal} />
          <Text style={styles.decorativeText}>Secure</Text>
        </View>
        <View style={styles.decorativeItem}>
          <Feather name="lock" size={20} color={iOS.colors.teal} />
          <Text style={styles.decorativeText}>Protected</Text>
        </View>
        <View style={styles.decorativeItem}>
          <Feather name="check-circle" size={20} color={iOS.colors.teal} />
          <Text style={styles.decorativeText}>Updated</Text>
        </View>
      </Animated.View>

      {/* Sign In Button */}
      <Pressable
        style={({ pressed }) => [
          styles.signInButton,
          pressed && styles.signInButtonPressed,
        ]}
        onPress={onSignIn}
        accessibilityLabel={A11Y_LABELS.buttons.sign_in}
      >
        <Text style={styles.signInText}>Sign In Now</Text>
        <Feather name="arrow-right" size={22} color={iOS.colors.white} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: iOS.spacing.xl,
  },

  // Success Icon - Teal background
  iconContainer: {
    backgroundColor: iOS.colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.xl,
    ...iOS.shadow.medium,
  },

  // Title
  title: {
    ...iOS.typography.title1,
    color: iOS.colors.label,
    textAlign: 'center',
    marginBottom: iOS.spacing.md,
  },

  // Message
  message: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: iOS.spacing.md,
    marginBottom: iOS.spacing.xl,
  },

  // Decorative Row
  decorativeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: iOS.spacing.xl,
    marginBottom: iOS.spacing.xl,
  },
  decorativeItem: {
    alignItems: 'center',
    gap: iOS.spacing.xs,
  },
  decorativeText: {
    ...iOS.typography.caption1,
    color: iOS.colors.teal,
    fontWeight: '600',
  },

  // Sign In Button - Orange primary action
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: iOS.colors.orange,
    height: 56,
    paddingHorizontal: iOS.spacing.xxl,
    borderRadius: iOS.radius.pill,
    gap: iOS.spacing.sm,
    ...iOS.shadow.medium,
    width: '100%',
    maxWidth: 300,
  },
  signInButtonPressed: {
    backgroundColor: iOS.colors.orangeDark,
    transform: [{ scale: 0.98 }],
  },
  signInText: {
    ...iOS.typography.headline,
    color: iOS.colors.white,
  },
});
