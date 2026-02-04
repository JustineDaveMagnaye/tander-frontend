/**
 * TANDER Premium Messaging Styles
 * Ultra-premium iPhone-style design system for the messaging feature
 * Inspired by iMessage, WhatsApp, and Telegram with senior-friendly enhancements
 */

import { Platform, StyleSheet } from 'react-native';
import { colors } from '@/shared/styles/colors';

// ============================================================================
// PREMIUM COLOR PALETTE
// ============================================================================

export const premiumColors = {
  // Message bubbles - TANDER brand colors (Orange & Teal)
  bubbles: {
    sent: {
      background: colors.orange[500], // TANDER orange
      backgroundGradient: [colors.orange[500], colors.orange[600]] as [string, string],
      text: '#FFFFFF',
      timestamp: 'rgba(255, 255, 255, 0.8)',
    },
    received: {
      background: '#F3F4F6', // Clean light gray
      backgroundDark: '#374151', // Dark mode gray-700
      text: colors.gray[900],
      textDark: '#FFFFFF',
      timestamp: 'rgba(0, 0, 0, 0.5)',
    },
  },

  // Premium gradients
  gradients: {
    header: ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)'] as [string, string],
    headerBlur: ['rgba(249, 250, 251, 0.92)', 'rgba(249, 250, 251, 0.88)'] as [string, string],
    inputBar: ['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.95)'] as [string, string],
    messageList: ['#FFFFFF', '#F8F9FA'] as [string, string],
    premium: ['#FF6B8A', colors.orange[500]] as [string, string],
    romantic: ['#FF6B8A', '#FF8E9E'] as [string, string],
    gold: ['#FFD700', '#FFA500'] as [string, string],
    platinum: ['#E5E5E5', '#C0C0C0'] as [string, string],
  },

  // Glassmorphism
  glass: {
    light: 'rgba(255, 255, 255, 0.85)',
    medium: 'rgba(255, 255, 255, 0.72)',
    dark: 'rgba(0, 0, 0, 0.6)',
    blur: 'rgba(255, 255, 255, 0.4)',
    tint: 'rgba(255, 107, 138, 0.08)',
  },

  // Semantic colors - TANDER brand
  status: {
    online: colors.teal[500], // TANDER teal for online
    offline: '#8E8E93',
    typing: colors.orange[500], // TANDER orange for typing
    away: colors.orange[400],
  },

  // Message status - TANDER brand
  messageStatus: {
    sending: '#9CA3AF',
    sent: '#9CA3AF',
    delivered: colors.teal[500], // Teal for delivered
    read: colors.teal[600], // Darker teal for read
    failed: '#EF4444',
  },

  // Reactions
  reactions: {
    background: 'rgba(255, 255, 255, 0.95)',
    backgroundDark: 'rgba(44, 44, 46, 0.95)',
    selected: colors.orange[100],
    selectedBorder: colors.orange[400],
  },

  // TANDER brand colors (primary reference)
  brand: {
    orange: colors.orange[500],
    orangeLight: colors.orange[400],
    orangeDark: colors.orange[600],
    teal: colors.teal[500],
    tealLight: colors.teal[400],
    tealDark: colors.teal[600],
    pink: colors.romantic.pink,
  },

  // System colors (for semantic use)
  system: {
    success: colors.teal[500],
    error: '#EF4444',
    warning: colors.orange[400],
    info: colors.teal[400],
    gray: '#6B7280',
    gray2: '#9CA3AF',
    gray3: '#D1D5DB',
    gray4: '#E5E7EB',
    gray5: '#F3F4F6',
    gray6: '#F9FAFB',
    separator: 'rgba(60, 60, 67, 0.18)',
    separatorOpaque: '#E5E7EB',
  },

  // iOS Human Interface colors (for cross-platform compatibility)
  ios: {
    // Grays
    gray: '#8E8E93',
    gray2: '#AEAEB2',
    gray3: '#C7C7CC',
    gray4: '#D1D1D6',
    gray5: '#E5E5EA',
    gray6: '#F2F2F7',
    // Semantic colors
    red: '#FF3B30',
    orange: '#FF9500',
    yellow: '#FFCC00',
    green: '#34C759',
    blue: '#007AFF',
    purple: '#AF52DE',
    pink: '#FF2D55',
    // Separator
    separator: 'rgba(60, 60, 67, 0.18)',
  },
} as const;

// ============================================================================
// PREMIUM TYPOGRAPHY
// ============================================================================

export const premiumTypography = {
  // Font families (iOS system fonts)
  fonts: {
    regular: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    medium: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto-Medium',
    semibold: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto-Medium',
    bold: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto-Bold',
  },

  // Senior-friendly font sizes (minimum 16px for body)
  sizes: {
    caption2: 11,
    caption1: 12,
    footnote: 13,
    subheadline: 15,
    callout: 16,
    body: 17,    // iOS default body
    bodyLarge: 18, // Senior-friendly body
    headline: 17,
    title3: 20,
    title2: 22,
    title1: 28,
    largeTitle: 34,
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6, // Better for seniors
    loose: 1.8,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    extraWide: 1,
  },
} as const;

// ============================================================================
// PREMIUM SPACING
// ============================================================================

export const premiumSpacing = {
  // Base spacing scale (4px base)
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  // Specific use cases
  screenPadding: 16,
  screenPaddingLarge: 24,
  messagePadding: 12,
  messageGap: 2,
  messageGroupGap: 8,
  avatarGap: 8,
  inputPadding: 12,
  headerPadding: 16,

  // Touch targets (WCAG compliant for seniors)
  touchTarget: {
    minimum: 44,
    comfortable: 48,
    large: 56,
    extraLarge: 64,
  },
} as const;

// ============================================================================
// PREMIUM BORDER RADIUS
// ============================================================================

export const premiumRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,

  // Message-specific
  bubble: 18,
  bubbleTail: 4,
  bubbleSmall: 14,

  // Component-specific
  input: 22,
  button: 14,
  card: 16,
  avatar: 999,
  modal: 20,
  sheet: 32,
} as const;

// ============================================================================
// PREMIUM SHADOWS
// ============================================================================

export const premiumShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },

  glow: {
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  // Premium floating effects
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },

  // Soft inner shadow effect (simulated with borders)
  innerSoft: {
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },

  // Glass effect shadow
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

// ============================================================================
// PREMIUM ANIMATIONS
// ============================================================================

export const premiumAnimations = {
  // Timing
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },

  // Spring configurations (for react-native-reanimated)
  spring: {
    gentle: {
      damping: 15,
      stiffness: 100,
      mass: 1,
    },
    bouncy: {
      damping: 10,
      stiffness: 150,
      mass: 0.8,
    },
    snappy: {
      damping: 20,
      stiffness: 200,
      mass: 0.6,
    },
    smooth: {
      damping: 25,
      stiffness: 120,
      mass: 1,
    },
  },

  // Timing configurations
  timing: {
    easeIn: { duration: 300 },
    easeOut: { duration: 300 },
    easeInOut: { duration: 300 },
    linear: { duration: 300 },
  },
} as const;

// ============================================================================
// PREMIUM EMOJI REACTIONS
// ============================================================================

export const EMOJI_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'] as const;

export const EXTENDED_REACTIONS = [
  '❤️', '👍', '👎', '😂', '😮', '😢', '😡', '🙏',
  '🔥', '🎉', '💯', '👏', '🥰', '😍', '🤗', '😊',
] as const;

// ============================================================================
// PREMIUM MESSAGE TYPES
// ============================================================================

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VOICE: 'voice',
  VIDEO: 'video',
  GIF: 'gif',
  STICKER: 'sticker',
  LINK: 'link',
  SYSTEM: 'system',
  CALL: 'call',
} as const;

// ============================================================================
// BASE STYLES
// ============================================================================

export const premiumStyles = StyleSheet.create({
  // Containers
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Glass header
  glassHeader: {
    backgroundColor: premiumColors.glass.light,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premiumColors.system.separator,
  },

  // Message list
  messageList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  messageListContent: {
    paddingHorizontal: premiumSpacing.screenPadding,
    paddingTop: premiumSpacing.lg,
    paddingBottom: premiumSpacing.xl,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: premiumSpacing.md,
    paddingVertical: premiumSpacing.sm,
    backgroundColor: premiumColors.glass.light,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premiumColors.system.separator,
  },

  // Bubbles base
  messageBubbleBase: {
    maxWidth: '75%',
    paddingHorizontal: premiumSpacing.messagePadding,
    paddingVertical: premiumSpacing.sm + 2,
    borderRadius: premiumRadius.bubble,
  },

  // Avatar
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: premiumColors.system.gray5,
  },

  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  // Online indicator
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: premiumColors.status.online,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: premiumColors.system.separator,
  },

  // Center content
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Touch target (minimum size for accessibility)
  touchTarget: {
    minWidth: premiumSpacing.touchTarget.minimum,
    minHeight: premiumSpacing.touchTarget.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get bubble style based on position in message group
 */
export function getBubbleRadius(
  isOwn: boolean,
  isFirst: boolean,
  isLast: boolean,
): {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
} {
  const defaultRadius = premiumRadius.bubble;
  const tailRadius = premiumRadius.bubbleTail;

  if (isOwn) {
    return {
      borderTopLeftRadius: defaultRadius,
      borderTopRightRadius: isFirst ? defaultRadius : tailRadius,
      borderBottomLeftRadius: defaultRadius,
      borderBottomRightRadius: isLast ? defaultRadius : tailRadius,
    };
  }

  return {
    borderTopLeftRadius: isFirst ? defaultRadius : tailRadius,
    borderTopRightRadius: defaultRadius,
    borderBottomLeftRadius: isLast ? defaultRadius : tailRadius,
    borderBottomRightRadius: defaultRadius,
  };
}

/**
 * Format timestamp for messages
 */
export function formatMessageTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Get relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Get date separator text
 */
export function getDateSeparatorText(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(d, now)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';

  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default {
  colors: premiumColors,
  typography: premiumTypography,
  spacing: premiumSpacing,
  radius: premiumRadius,
  shadows: premiumShadows,
  animations: premiumAnimations,
  styles: premiumStyles,
  getBubbleRadius,
  formatMessageTime,
  getRelativeTime,
  getDateSeparatorText,
};
