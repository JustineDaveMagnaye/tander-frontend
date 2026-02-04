/**
 * TANDER OTP Input Component - Premium Edition
 * Senior-friendly 6-digit OTP input with individual boxes
 *
 * Design Philosophy:
 * - Large touch targets and clear visual feedback for older adults
 * - Premium styling with subtle shadows and borders
 * - Smooth animations on focus and fill
 * - WCAG AA compliant contrast
 * - 100% responsive across all devices (320px to 1280px+)
 * - Landscape-safe with Math.min constraints
 *
 * Features:
 * - Individual boxes for each digit
 * - Auto-focus next box on input
 * - Backspace navigation
 * - Paste support (distributes digits across boxes)
 * - Error state with red border
 * - Filled state with orange accent
 * - Focus state with teal accent
 * - Customizable box size and font size
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Text } from './Text';
import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import { FONT_SCALING } from '@shared/styles/fontScaling';

// Blinking Cursor Component
const BlinkingCursor: React.FC<{ height: number }> = ({ height }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.cursor,
        {
          height,
          opacity,
          backgroundColor: colors.teal[500],
        },
      ]}
    />
  );
};

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  boxSize?: number; // Optional: Override calculated box size
  fontSize?: number; // Optional: Override calculated font size
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  error = false,
  autoFocus = true,
  disabled = false,
  boxSize: boxSizeProp,
  fontSize: fontSizeProp,
}) => {
  const { isTablet, isLandscape, hp, moderateScale, isSmallScreen } = useResponsive();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Animation values for each box (for premium entrance animation)
  const boxAnims = useRef(
    Array.from({ length }).map(() => new Animated.Value(0))
  ).current;

  // Calculate responsive sizes - ENHANCED for all screen sizes
  const boxSize =
    boxSizeProp ??
    (isLandscape
      ? Math.min(hp(14), 54) // Landscape: constrained by height
      : isTablet
      ? moderateScale(68, 0.2) // Tablets: larger
      : isSmallScreen
      ? moderateScale(48, 0.3) // Small phones: compact
      : moderateScale(56, 0.3)); // Standard phones

  const fontSize =
    fontSizeProp ??
    (isLandscape
      ? Math.min(hp(7), 26)
      : isTablet
      ? moderateScale(34, 0.2)
      : isSmallScreen
      ? moderateScale(24, 0.3)
      : moderateScale(28, 0.3));

  // Responsive gap between boxes
  const gapSize = isLandscape
    ? 6
    : isTablet
    ? 12
    : isSmallScreen
    ? 6
    : 10;

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [autoFocus, disabled]);

  // Entrance animations for boxes
  useEffect(() => {
    const animations = boxAnims.map((anim, index) =>
      Animated.spring(anim, {
        toValue: 1,
        delay: index * 50,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();
  }, [boxAnims]);

  const handleChange = (text: string, index: number) => {
    if (disabled) return;

    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '');

    if (digit.length > 1) {
      // Handle paste - distribute digits across boxes
      const digits = digit.slice(0, length).split('');
      const newValue = value.split('');
      digits.forEach((d, i) => {
        if (index + i < length) {
          newValue[index + i] = d;
        }
      });
      onChange(newValue.join(''));

      // Focus the next empty input or last filled
      const nextIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    } else if (digit.length === 1) {
      // Single digit entry
      const newValue = value.split('');
      newValue[index] = digit;
      onChange(newValue.join(''));

      // Move to next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (disabled) return;

    if (e.nativeEvent.key === 'Backspace') {
      const newValue = value.split('');
      if (newValue[index]) {
        // Clear current digit
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // Move back and clear previous
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleBoxPress = (index: number) => {
    if (disabled) return;
    inputRefs.current[index]?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.boxContainer, { gap: gapSize }]}>
        {Array.from({ length }).map((_, index) => {
          const digit = value[index] || '';
          const isFocused = focusedIndex === index;
          const isFilled = !!digit;

          // Border color logic - premium states
          // Error only shows on filled boxes or focused box to avoid scaring users prematurely
          let borderColor: string;
          let borderWidth: number;
          let backgroundColor: string;

          if (disabled) {
            borderColor = colors.gray[300];
            borderWidth = 2;
            backgroundColor = colors.gray[100];
          } else if (isFocused) {
            // Focused always takes priority - show teal for good UX
            borderColor = error ? colors.semantic.error : colors.teal[500];
            borderWidth = 2.5;
            backgroundColor = error ? 'rgba(244, 67, 54, 0.04)' : 'rgba(20, 184, 166, 0.04)';
          } else if (error && isFilled) {
            // Only show error state on filled boxes
            borderColor = colors.semantic.error;
            borderWidth = 2.5;
            backgroundColor = 'rgba(244, 67, 54, 0.04)';
          } else if (isFilled) {
            // Filled with no error - show success orange
            borderColor = colors.orange[400];
            borderWidth = 2;
            backgroundColor = 'rgba(249, 115, 22, 0.06)';
          } else {
            // Empty unfocused box - neutral gray
            borderColor = colors.gray[300];
            borderWidth = 2;
            backgroundColor = colors.white;
          }

          // Animation interpolations
          const scale = boxAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
          });

          const opacity = boxAnims[index];

          return (
            <Animated.View
              key={index}
              style={{
                transform: [{ scale }],
                opacity,
              }}
            >
              <Pressable
                onPress={() => handleBoxPress(index)}
                style={[
                  styles.box,
                  {
                    width: boxSize,
                    height: boxSize,
                    borderWidth,
                    borderColor,
                    backgroundColor,
                    // Premium shadow on focus or filled
                    shadowColor: isFocused
                      ? colors.teal[500]
                      : isFilled
                      ? colors.orange[400]
                      : 'rgba(0, 0, 0, 0.1)',
                    shadowOffset: { width: 0, height: isFocused || isFilled ? 4 : 2 },
                    shadowOpacity: isFocused || isFilled ? 0.3 : 0.15,
                    shadowRadius: isFocused || isFilled ? 8 : 4,
                    elevation: isFocused || isFilled ? 6 : 3,
                  },
                ]}
                accessible
                accessibilityLabel={`Digit ${index + 1} of ${length}${
                  digit ? `, entered ${digit}` : ', empty'
                }`}
                accessibilityHint="Enter a single digit"
                accessibilityRole="none"
              >
                {/* Hidden input for actual keyboard interaction */}
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={styles.hiddenInput}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(-1)}
                  keyboardType="number-pad"
                  maxLength={length} // Allow paste of full OTP
                  selectTextOnFocus
                  textAlign="center"
                  editable={!disabled}
                  accessible={false}
                  caretHidden
                  selectionColor="transparent"
                  maxFontSizeMultiplier={FONT_SCALING.INPUT}
                />

                {/* Visual digit display - shows on top */}
                <View style={styles.digitDisplay} pointerEvents="none">
                  <Text
                    variant="h2"
                    color={
                      disabled
                        ? colors.gray[400]
                        : error
                        ? colors.semantic.error
                        : isFocused
                        ? colors.teal[700]
                        : isFilled
                        ? colors.orange[600]
                        : colors.gray[900]
                    }
                    style={{
                      fontSize,
                      fontWeight: '700',
                      letterSpacing: 0.5,
                    }}
                  >
                    {digit}
                  </Text>

                  {/* Blinking cursor for focused empty box */}
                  {isFocused && !digit && !disabled && (
                    <BlinkingCursor height={fontSize * 0.7} />
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  boxContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    color: 'transparent',
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontWeight: '700',
    zIndex: 1,
    // Ensure text is completely invisible
    ...(Platform.OS === 'web' ? { caretColor: 'transparent' } : {}),
  },
  digitDisplay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  cursor: {
    width: 3,
    borderRadius: 1.5,
  },
});

export default OTPInput;
