/**
 * SignUp Utility Functions
 * Following ForgotPassword pattern
 */

import * as Haptics from 'expo-haptics';

// Haptic types enum
export enum HapticType {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Selection = 'selection',
}

/**
 * Safe haptic feedback that won't crash on unsupported devices
 */
export function safeHaptic(type: HapticType): void {
  try {
    switch (type) {
      case HapticType.Light:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case HapticType.Medium:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case HapticType.Heavy:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case HapticType.Success:
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case HapticType.Warning:
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case HapticType.Error:
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case HapticType.Selection:
        Haptics.selectionAsync();
        break;
    }
  } catch {
    // Silently fail on unsupported devices/simulators
  }
}

/**
 * Format phone number for display (XXX XXX XXXX)
 */
export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  // Remove country code if present
  let phoneDigits = digits;
  if (phoneDigits.startsWith('63')) {
    phoneDigits = phoneDigits.substring(2);
  }
  if (phoneDigits.startsWith('0')) {
    phoneDigits = phoneDigits.substring(1);
  }

  if (phoneDigits.length <= 3) return phoneDigits;
  if (phoneDigits.length <= 6) return `${phoneDigits.slice(0, 3)} ${phoneDigits.slice(3)}`;
  return `${phoneDigits.slice(0, 3)} ${phoneDigits.slice(3, 6)} ${phoneDigits.slice(6, 10)}`;
}

/**
 * Normalize phone number for API (add +63 prefix)
 */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  let phoneDigits = digits;
  if (phoneDigits.startsWith('63')) {
    phoneDigits = phoneDigits.substring(2);
  }
  if (phoneDigits.startsWith('0')) {
    phoneDigits = phoneDigits.substring(1);
  }

  return `+63${phoneDigits}`;
}

/**
 * Get step number from step name
 */
export function getStepNumber(step: string): number {
  const steps = ['account', 'otp', 'profile', 'id'];
  return steps.indexOf(step) + 1;
}

/**
 * Create pressed style helper for Pressable components
 */
export const pressedStyle = (pressed: boolean, opacity = 0.7) =>
  pressed ? { opacity } : undefined;
