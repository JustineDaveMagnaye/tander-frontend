/**
 * ForgotPassword Utility Functions
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
 * Debounce function for preventing rapid calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

/**
 * Get step number from step name
 */
export function getStepNumber(step: string): number {
  const steps = ['method', 'verify', 'password', 'success'];
  return steps.indexOf(step) + 1;
}

/**
 * Create pressed style helper for Pressable components
 */
export const pressedStyle = (pressed: boolean, opacity = 0.7) =>
  pressed ? { opacity } : undefined;
