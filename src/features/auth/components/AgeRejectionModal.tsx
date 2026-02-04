/**
 * TANDER Age Rejection Modal
 * Displayed when user fails age verification (under minimum age)
 *
 * Design: iOS Light Design System matching IDScannerScreen
 * Features:
 * - Senior-friendly large text and touch targets
 * - Empathetic messaging
 * - Clear call-to-action
 * - Accessibility support
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  AccessibilityInfo,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Data from frontend-backend comparison
export interface AgeRejectionData {
  frontendAge: number | null;
  backendAge: number | null;
  discrepancyNote: string | null;
  auditId: string | null;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | null;
}

interface AgeRejectionModalProps {
  visible: boolean;
  data?: AgeRejectionData | null;
  minimumAge?: number;
  onClose: () => void;
  onRetake: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 400);

// iOS Light Design System (matching IDScannerScreen)
const iOS = {
  colors: {
    background: '#F2F2F7',
    overlay: 'rgba(0, 0, 0, 0.4)',
    card: '#FFFFFF',
    teal: '#30D5C8',
    tealLight: 'rgba(48, 213, 200, 0.12)',
    orange: '#F97316',
    orangeLight: 'rgba(249, 115, 22, 0.12)',
    red: '#FF3B30',
    redLight: 'rgba(255, 59, 48, 0.12)',
    green: '#34C759',
    greenLight: 'rgba(52, 199, 89, 0.12)',
    text: {
      primary: '#1C1C1E',
      secondary: '#636366',
      tertiary: '#8E8E93',
    },
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
    },
    button: {
      shadowColor: '#F97316',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

export const AgeRejectionModal: React.FC<AgeRejectionModalProps> = ({
  visible,
  data,
  minimumAge = 60,
  onClose,
  onRetake,
}) => {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Extract age - prefer frontend age (more reliable for display)
  const frontendAge = data?.frontendAge;
  const backendAge = data?.backendAge;
  const displayAge = (frontendAge && frontendAge > 0) ? frontendAge :
                     (backendAge && backendAge > 0) ? backendAge : null;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      AccessibilityInfo.announceForAccessibility(
        `Age verification failed. You must be ${minimumAge} or older to use Tander.`
      );

      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, minimumAge, scaleAnim, opacityAnim]);

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRetake();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              width: CARD_WIDTH,
              marginTop: insets.top,
              marginBottom: insets.bottom,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Feather
                name="alert-circle"
                size={40}
                color={iOS.colors.red}
              />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Age Requirement Not Met</Text>

          {/* Message */}
          <Text style={styles.message}>
            {displayAge !== null ? (
              <>You are {displayAge} years old.{'\n\n'}</>
            ) : null}
            Tander is exclusively for Filipino seniors aged {minimumAge} and above.
          </Text>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Feather
                name="info"
                size={18}
                color={iOS.colors.orange}
              />
            </View>
            <Text style={styles.infoText}>
              If your ID was scanned incorrectly, you can try again with better
              lighting or a clearer image.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleRetake}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Try scanning ID again"
            >
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Feather name="refresh-cw" size={20} color="#FFF" />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close and exit"
            >
              <Text style={styles.secondaryButtonText}>Exit</Text>
            </Pressable>
          </View>

          {/* Support text */}
          <Text style={styles.supportText}>
            Questions? Contact our support team for assistance.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: iOS.colors.overlay,
  },
  card: {
    backgroundColor: iOS.colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...iOS.shadow.card,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: iOS.colors.redLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: iOS.colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 17,
    lineHeight: 24,
    color: iOS.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: iOS.colors.orangeLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 12,
    width: '100%',
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: iOS.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: iOS.colors.text.secondary,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    ...iOS.shadow.button,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: iOS.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: iOS.colors.text.primary,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  supportText: {
    fontSize: 14,
    color: iOS.colors.text.tertiary,
    textAlign: 'center',
  },
});

export default AgeRejectionModal;
