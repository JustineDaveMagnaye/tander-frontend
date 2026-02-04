/**
 * TANDER Button Component
 * Elderly-friendly with large touch targets (py-5 = ~60px height)
 * Pill shape (rounded-full), gradient primary, supports multiple variants
 * Based on system_design.md patterns
 */

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { colors } from '@shared/styles/colors';
import { componentSpacing } from '@shared/styles/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'text' | 'filter' | 'filterInactive';
export type ButtonSize = 'default' | 'large' | 'filter';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  accessibilityLabel,
  accessibilityHint,
  style,
}) => {
  const handlePress = async () => {
    if (disabled || loading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Button heights based on design system (py-5 = 20px padding each side + content)
  const getButtonHeight = (): number => {
    switch (size) {
      case 'large':
        return 64; // Extra large for important CTAs
      case 'filter':
        return 48; // py-3 for filter/tab buttons
      default:
        return 60; // py-5 standard (text-xl + padding)
    }
  };

  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = {
    height: getButtonHeight(),
    minWidth: fullWidth ? '100%' : (size === 'filter' ? undefined : 200),
    borderRadius: 9999, // rounded-full (pill shape)
    overflow: 'hidden',
    ...(size === 'filter' && { paddingHorizontal: 24 }), // px-6 for filter buttons
  };

  const innerStyle: ViewStyle = {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: size === 'filter' ? 0 : componentSpacing.button.paddingHorizontal,
    gap: componentSpacing.button.gap,
  };

  const getTextColor = (): string => {
    if (isDisabled) return colors.gray[400];
    switch (variant) {
      case 'primary':
      case 'filter':
        return colors.white;
      case 'secondary':
        return colors.white;
      case 'outlined':
        return colors.orange[500];
      case 'filterInactive':
        return colors.gray[700];
      case 'text':
        return colors.orange[500];
      default:
        return colors.white;
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'filter':
        return 16; // text-base font-semibold
      default:
        return 20; // text-xl
    }
  };

  const renderContent = () => (
    <View style={innerStyle}>
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.buttonText,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                fontWeight: '600', // font-semibold
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  const renderButton = () => {
    switch (variant) {
      case 'primary':
        return (
          <LinearGradient
            colors={isDisabled ? [colors.gray[300], colors.gray[400]] : colors.gradient.primaryButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }} // Horizontal gradient (from-orange-500 to-orange-600)
            style={styles.gradient}
          >
            {renderContent()}
          </LinearGradient>
        );
      case 'filter':
        return (
          <LinearGradient
            colors={colors.gradient.primaryButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {renderContent()}
          </LinearGradient>
        );
      case 'secondary':
        // Secondary with transparent bg and white border (for use on gradients)
        return (
          <View style={[styles.secondaryBackground, isDisabled && styles.disabledBackground]}>
            {renderContent()}
          </View>
        );
      case 'outlined':
        // Outlined with orange border
        return (
          <View style={[styles.outlinedBackground, isDisabled && styles.disabledOutlined]}>
            {renderContent()}
          </View>
        );
      case 'filterInactive':
        return (
          <View style={styles.filterInactiveBackground}>
            {renderContent()}
          </View>
        );
      case 'text':
        return <View style={styles.textBackground}>{renderContent()}</View>;
      default:
        return renderContent();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      style={[containerStyle, style]}
    >
      {renderButton()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  secondaryBackground: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 9999,
  },
  disabledBackground: {
    borderColor: colors.gray[400],
    opacity: 0.5,
  },
  outlinedBackground: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.orange[500],
    backgroundColor: colors.transparent,
    borderRadius: 9999,
  },
  disabledOutlined: {
    borderColor: colors.gray[400],
  },
  filterInactiveBackground: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: 9999,
  },
  textBackground: {
    flex: 1,
    backgroundColor: colors.transparent,
  },
  buttonText: {
    textAlign: 'center',
  },
});

export default Button;
