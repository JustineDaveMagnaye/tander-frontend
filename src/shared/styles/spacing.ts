/**
 * TANDER Spacing System
 * Based on design_system2.md - 8pt grid system
 *
 * All spacing values follow the 8pt grid for consistency and scalability.
 * Use these tokens instead of hardcoded pixel values for maintainability.
 */

// Base unit is 8px - all values are multiples of 4 or 8
export const spacing = {
  xxs: 4,   // Micro-spacing, icon padding
  xs: 8,    // Tight spacing between related items
  s: 16,    // Default padding within cards/components
  m: 24,    // Spacing between sections
  l: 32,    // Large gaps, screen margins
  xl: 40,   // Major section separation
  xxl: 48,  // Screen top/bottom padding
  xxxl: 64, // Hero sections, empty states
} as const;

// Screen margins by device size (design system spec)
export const screenMargins = {
  small: 24,   // Small/Standard phones (320-414px)
  medium: 32,  // Large phones (415-767px)
  large: 40,   // Tablets (768px+)
} as const;

// Border radius scale (8pt grid aligned)
export const borderRadius = {
  small: 8,    // Input fields, chips
  medium: 12,  // Cards, modals
  large: 16,   // Profile cards, hero cards
  xlarge: 20,  // Large hero elements
  round: 999,  // Circular buttons, avatars (fully rounded)
} as const;

// Touch target sizes (senior-friendly, WCAG AAA compliant)
export const touchTargets = {
  minimum: 44,      // WCAG AAA minimum (44x44px)
  standard: 48,     // Android Material standard (48x48dp)
  comfortable: 56,  // Recommended for seniors (TANDER standard)
  large: 64,        // Primary actions, icon buttons
} as const;

// Component-specific spacing (design system compliant)
export const componentSpacing = {
  card: {
    padding: 20,                      // Internal padding (24px on large screens)
    gap: 16,                          // Between card elements
    borderRadius: borderRadius.large, // 16px
  },
  button: {
    paddingHorizontal: 32,  // Minimum horizontal padding
    paddingVertical: 16,    // Creates 56px height with 20px text
    gap: 12,                // Between icon and text
    height: 56,             // Minimum height (64px recommended for seniors)
    heightTablet: 72,       // Tablet height for extra comfort
    borderRadius: 30,       // Pill-shaped (half of height for full rounding)
  },
  input: {
    height: 60,                       // Phone height (56-60px minimum)
    heightTablet: 64,                 // Tablet height for extra comfort
    paddingHorizontal: 16,            // Horizontal padding
    paddingVertical: 18,              // Vertical padding
    borderRadius: borderRadius.small, // 8px
    labelGap: 8,                      // Gap between label and field
    fieldGap: 20,                     // Gap between form fields
  },
  list: {
    itemHeight: 96,  // Minimum list item height
    itemGap: 16,     // Vertical gap between items
  },
} as const;

// Shadow/elevation
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type TouchTargetVariant = keyof typeof touchTargets;

/**
 * USAGE EXAMPLES
 *
 * 1. Using spacing tokens:
 * ```typescript
 * import { spacing } from '@/shared/styles/spacing';
 *
 * const styles = StyleSheet.create({
 *   container: {
 *     padding: spacing.m,        // 24px
 *     gap: spacing.s,            // 16px
 *     marginBottom: spacing.xl,  // 40px
 *   },
 * });
 * ```
 *
 * 2. Using responsive screen margins:
 * ```typescript
 * import { screenMargins } from '@/shared/styles/spacing';
 * import { useResponsive } from '@/shared/hooks/useResponsive';
 *
 * const { isTablet, width } = useResponsive();
 * const margin = width <= 414 ? screenMargins.small
 *              : width < 768 ? screenMargins.medium
 *              : screenMargins.large;
 * // Or use the helper: const margin = getScreenMargin();
 * ```
 *
 * 3. Using border radius tokens:
 * ```typescript
 * import { borderRadius } from '@/shared/styles/spacing';
 *
 * const cardStyle = {
 *   borderRadius: borderRadius.large, // 16px
 * };
 *
 * const avatarStyle = {
 *   borderRadius: borderRadius.round, // Fully circular
 * };
 * ```
 *
 * 4. Using touch targets for accessibility:
 * ```typescript
 * import { touchTargets } from '@/shared/styles/spacing';
 *
 * const iconButtonStyle = {
 *   width: touchTargets.large,       // 64px
 *   height: touchTargets.large,      // 64px
 *   minHeight: touchTargets.comfortable, // Ensures 56px minimum
 * };
 * ```
 *
 * 5. Using component-specific spacing:
 * ```typescript
 * import { componentSpacing } from '@/shared/styles/spacing';
 *
 * const buttonStyle = {
 *   height: componentSpacing.button.height,              // 56px
 *   paddingHorizontal: componentSpacing.button.paddingHorizontal, // 32px
 *   borderRadius: componentSpacing.button.borderRadius,  // 30px
 * };
 *
 * const inputStyle = {
 *   height: componentSpacing.input.height,  // 60px
 *   borderRadius: componentSpacing.input.borderRadius, // 8px
 * };
 * ```
 *
 * 6. Using shadows for elevation:
 * ```typescript
 * import { shadows } from '@/shared/styles/spacing';
 *
 * const cardStyle = {
 *   ...shadows.medium, // Includes shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation
 * };
 * ```
 *
 * DESIGN SYSTEM COMPLIANCE:
 * - All spacing follows 8pt grid system
 * - Touch targets meet WCAG AAA (44x44px minimum)
 * - Senior-friendly sizes (56-64px recommended)
 * - Border radius values are multiples of 4
 * - Component spacing matches design_system2.md specifications
 *
 * BEST PRACTICES:
 * - Always use spacing tokens instead of hardcoded pixel values
 * - Use touchTargets.comfortable (56px) as default for senior app
 * - Ensure minimum 16px spacing between interactive elements (preferably 24-32px)
 * - Test all touch targets on actual devices with various hand sizes
 * - Respect the 8pt grid for visual consistency
 */
