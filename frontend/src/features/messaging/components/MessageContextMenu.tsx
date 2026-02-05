/**
 * MessageContextMenu Component
 * Premium iOS-style context menu for message actions
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
  ZoomIn,
  SlideInUp,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { colors } from '@/shared/styles/colors';
import { FONT_SCALING } from '@/shared/styles/fontScaling';
import {
  premiumColors,
  premiumTypography,
  premiumSpacing,
  premiumRadius,
  premiumShadows,
  premiumAnimations,
  EMOJI_REACTIONS,
} from '../styles/premiumStyles';
import type { Message } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface MenuAction {
  id: string;
  label: string;
  icon: string;
  destructive?: boolean;
  onPress: () => void;
}

interface MessageContextMenuProps {
  visible: boolean;
  message: Message | null;
  isOwn: boolean;
  onDismiss: () => void;
  onReply?: (message: Message) => void;
  onCopy?: (text: string) => void;
  onForward?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onEdit?: (message: Message) => void;
  onPin?: (message: Message) => void;
  onReport?: (message: Message) => void;
  position?: { x: number; y: number };
}

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Quick Reaction Bar
const QuickReactionBar = memo(({
  onReact,
}: {
  onReact: (emoji: string) => void;
}) => {
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(15)}
      style={styles.reactionBar}
    >
      {EMOJI_REACTIONS.map((emoji, index) => (
        <ReactionButton
          key={emoji}
          emoji={emoji}
          index={index}
          onPress={() => onReact(emoji)}
        />
      ))}
    </Animated.View>
  );
});

// Reaction Button
const ReactionButton = memo(({
  emoji,
  index,
  onPress,
}: {
  emoji: string;
  index: number;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(1.4, premiumAnimations.spring.bouncy);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, premiumAnimations.spring.gentle);
  }, [scale]);

  return (
    <Animated.View entering={ZoomIn.delay(index * 40).springify()}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.reactionButton, animatedStyle]}
      >
        <Text style={styles.reactionEmoji} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>{emoji}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
});

// Menu Item
const MenuItem = memo(({
  action,
  index,
  isLast,
}: {
  action: MenuAction;
  index: number;
  isLast: boolean;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: scale.value < 1 ? premiumColors.system.gray5 : 'transparent',
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, premiumAnimations.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, premiumAnimations.spring.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    action.onPress();
  }, [action]);

  return (
    <Animated.View entering={SlideInUp.delay(index * 30).springify()}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.menuItem,
          !isLast && styles.menuItemBorder,
          animatedStyle,
        ]}
      >
        <Text style={styles.menuItemIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>{action.icon}</Text>
        <Text
          style={[
            styles.menuItemLabel,
            action.destructive && styles.menuItemLabelDestructive,
          ]}
          maxFontSizeMultiplier={FONT_SCALING.BUTTON}
        >
          {action.label}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MessageContextMenu = memo(({
  visible,
  message,
  isOwn,
  onDismiss,
  onReply,
  onCopy,
  onForward,
  onDelete,
  onReact,
  onEdit,
  onPin,
  onReport,
}: MessageContextMenuProps) => {
  if (!visible || !message) return null;

  // Build menu actions
  const actions: MenuAction[] = [];

  if (onReply) {
    actions.push({
      id: 'reply',
      label: 'Reply',
      icon: '↩️',
      onPress: () => {
        onReply(message);
        onDismiss();
      },
    });
  }

  if (onCopy && message.type === 'text') {
    actions.push({
      id: 'copy',
      label: 'Copy',
      icon: '📋',
      onPress: () => {
        onCopy(message.content);
        onDismiss();
      },
    });
  }

  if (onForward) {
    actions.push({
      id: 'forward',
      label: 'Forward',
      icon: '↗️',
      onPress: () => {
        onForward(message);
        onDismiss();
      },
    });
  }

  if (onEdit && isOwn && message.type === 'text') {
    actions.push({
      id: 'edit',
      label: 'Edit',
      icon: '✏️',
      onPress: () => {
        onEdit(message);
        onDismiss();
      },
    });
  }

  if (onPin) {
    actions.push({
      id: 'pin',
      label: 'Pin',
      icon: '📌',
      onPress: () => {
        onPin(message);
        onDismiss();
      },
    });
  }

  if (onDelete && isOwn) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      destructive: true,
      onPress: () => {
        onDelete(message);
        onDismiss();
      },
    });
  }

  if (onReport && !isOwn) {
    actions.push({
      id: 'report',
      label: 'Report',
      icon: '⚠️',
      destructive: true,
      onPress: () => {
        onReport(message);
        onDismiss();
      },
    });
  }

  const handleReact = useCallback((emoji: string) => {
    onReact?.(message, emoji);
    onDismiss();
  }, [message, onReact, onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(100)}
        style={styles.container}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onDismiss}>
          {Platform.OS === 'ios' && (
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          )}
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          {/* Quick reactions */}
          {onReact && (
            <QuickReactionBar onReact={handleReact} />
          )}

          {/* Menu */}
          <Animated.View
            entering={ZoomIn.springify().damping(15)}
            style={[styles.menu, premiumShadows.large]}
          >
            {Platform.OS === 'ios' ? (
              <BlurView intensity={90} tint="light" style={styles.menuBlur}>
                {actions.map((action, index) => (
                  <MenuItem
                    key={action.id}
                    action={action}
                    index={index}
                    isLast={index === actions.length - 1}
                  />
                ))}
              </BlurView>
            ) : (
              <View style={styles.menuAndroid}>
                {actions.map((action, index) => (
                  <MenuItem
                    key={action.id}
                    action={action}
                    index={index}
                    isLast={index === actions.length - 1}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
});

MessageContextMenu.displayName = 'MessageContextMenu';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.4)',
  },

  content: {
    alignItems: 'center',
    gap: premiumSpacing.md,
  },

  // Reaction bar
  reactionBar: {
    flexDirection: 'row',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
    borderRadius: premiumRadius.xxl,
    paddingHorizontal: premiumSpacing.sm,
    paddingVertical: premiumSpacing.xs,
    gap: premiumSpacing.xxs,
    ...premiumShadows.large,
    overflow: 'hidden',
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 28,
  },

  // Menu
  menu: {
    borderRadius: premiumRadius.lg,
    overflow: 'hidden',
    minWidth: 240,
  },
  menuBlur: {
    borderRadius: premiumRadius.lg,
    overflow: 'hidden',
  },
  menuAndroid: {
    backgroundColor: colors.white,
    borderRadius: premiumRadius.lg,
  },

  // Menu item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: premiumSpacing.lg,
    paddingVertical: premiumSpacing.md,
    minHeight: 50,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premiumColors.system.separator,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: premiumSpacing.md,
  },
  menuItemLabel: {
    fontSize: premiumTypography.sizes.body,
    color: colors.gray[900],
    fontWeight: '400',
  },
  menuItemLabelDestructive: {
    color: premiumColors.system.error,
  },
});

export default MessageContextMenu;
