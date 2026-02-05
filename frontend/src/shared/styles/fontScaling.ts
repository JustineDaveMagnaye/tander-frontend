/**
 * TANDER Font Scaling Configuration
 *
 * These multipliers control how much system font scaling affects our app.
 * We respect user accessibility preferences while preventing UI breakage.
 *
 * Platform Scaling Ranges:
 * - iOS Dynamic Type: 0.77x to 3.2x (with Larger Accessibility Sizes)
 * - Android: 0.85x to 2.0x (Android 14+)
 * - Samsung/Xiaomi: varies by OEM
 *
 * Our Strategy:
 * - Allow meaningful scaling (35% increase) for accessibility
 * - Prevent extreme scaling (200-320%) that breaks layouts
 * - WCAG 2.0 allows capping if zoom is available as alternative
 */

export const FONT_SCALING = {
  /**
   * Global default - applied to all Text/TextInput via App.tsx
   * Allows 35% increase while preventing layout breakage
   */
  DEFAULT: 1.35,

  /**
   * Titles/Headers - more restrictive to prevent overflow
   * Large text (40px+) needs tighter control
   */
  TITLE: 1.2,

  /**
   * Body text - slightly more flexible
   * Main content that users need to read
   */
  BODY: 1.4,

  /**
   * Buttons - most restrictive to maintain tap targets
   * Button text must stay within bounds
   */
  BUTTON: 1.25,

  /**
   * Captions/Labels - can be most flexible
   * Small supporting text
   */
  CAPTION: 1.5,

  /**
   * Input fields - moderate restriction
   * Must remain readable but not break input containers
   */
  INPUT: 1.35,

  /**
   * Emojis/Icons - most restrictive (no scaling)
   * Emojis used as icons should remain fixed size to prevent
   * layout breakage when device font scaling is increased
   */
  EMOJI: 1.0,
} as const;

export type FontScalingKey = keyof typeof FONT_SCALING;

/**
 * Helper to get multiplier by key with fallback to DEFAULT
 */
export const getFontScaleMultiplier = (key?: FontScalingKey): number => {
  if (!key) return FONT_SCALING.DEFAULT;
  return FONT_SCALING[key] ?? FONT_SCALING.DEFAULT;
};
