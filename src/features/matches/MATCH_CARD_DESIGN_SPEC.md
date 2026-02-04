# TANDER Match Card Design Specification

## Overview

Premium match card design for TANDER dating app targeting Filipino seniors (50+).
Designed for 2-column grid layout on phones with full responsiveness.

---

## Design Philosophy

### 1. Photo Supremacy
- Photos are 100% unobstructed - NO gradients, NO overlays, NO badges on photos
- The only exception: Online status dot (subtle, bottom-right corner)
- Photos are the hero element that users see first

### 2. Clear Information Hierarchy
- Info section BELOW the photo (never overlaid)
- Three-row layout with decreasing visual weight
- Most important info (name, age) most prominent

### 3. No Clipping/Overflow
- Fixed info section height (80px)
- All text uses `numberOfLines={1}` + `ellipsizeMode="tail"`
- Badge strip uses `flexShrink` to prevent overflow
- `minWidth: 0` on text containers for proper truncation

### 4. Senior-Friendly
- Minimum font size: 11px (time) to 15px (name)
- High contrast: Gray-900 on white (#1F2937 on #FFFFFF = 15.4:1)
- Touch targets: Entire card is tappable (minimum 56px)
- Clear visual hierarchy

---

## Visual Structure

```
+-------------------------------+
|                               |
|                               |
|     PRISTINE PHOTO AREA       |  <- Photo height: width x 1.25
|     (100% clean)              |      (4:5 aspect ratio)
|                               |
|                           [*] |  <- Online dot only (14px)
+-------------------------------+
+-------------------------------+
|  Maria, 58      [NEW] [checkmark]  |  <- Row 1: 24px height
|  * Makati City                |  <- Row 2: 20px height
|  Matched 2h ago               |  <- Row 3: 16px height
+-------------------------------+
        Info Section: 80px fixed
```

---

## Exact Dimensions

### Card Container
| Property | Value |
|----------|-------|
| Border Radius | 16px |
| Background | #FFFFFF (white) |
| Shadow (iOS) | 0 4px 12px rgba(0,0,0,0.08) |
| Elevation (Android) | 4 |
| Overflow | hidden |

### Photo Section
| Property | Value |
|----------|-------|
| Aspect Ratio | 4:5 (width:height = 1:1.25) |
| Min Height | 160px |
| Background (loading) | #F3F4F6 (gray-100) |
| Border Radius | 16px top only |

### Info Section
| Property | Value |
|----------|-------|
| Height | 80px (FIXED) |
| Padding Horizontal | 12px |
| Padding Top | 10px |
| Padding Bottom | 8px |
| Background | #FFFFFF |
| Border Top | hairlineWidth, #E5E7EB |

### Row Heights (within Info Section)
| Row | Height | Content |
|-----|--------|---------|
| Row 1 | 24px | Name, Age + Badges |
| Row 2 | 20px | Location |
| Row 3 | 16px | Match Time |

---

## Typography

| Element | Size | Weight | Color | Line Height |
|---------|------|--------|-------|-------------|
| Name | 15px | 700 (Bold) | #1F2937 (gray-900) | 20px |
| Age | 15px | 700 (Bold) | #1F2937 (gray-900) | 20px |
| Location | 13px | 400 (Regular) | #6B7280 (gray-500) | 18px |
| Match Time | 11px | 400 (Regular) | #9CA3AF (gray-400) | 14px |
| NEW Badge | 9px | 800 (Extra Bold) | #FFFFFF | 12px |
| Location Pin | 12px | - | emoji | - |

---

## Status Badges

### NEW Badge
```
Position: Row 1, after name
Background: Gradient #F97316 -> #EA580C (orange)
Text: "NEW" in white, 9px, weight 800
Padding: 7px horizontal, 3px vertical
Border Radius: 5px
```

### Verified Badge
```
Position: Row 1, after NEW badge (if present)
Shape: Circle, 20px diameter
Background: #14B8A6 (teal-500)
Icon: Checkmark "checkmark", 11px, white, weight 800
```

### Online Indicator
```
Position: Bottom-right of PHOTO section
Offset: 10px from bottom, 10px from right
Shape: Circle, 14px diameter
Background: #10B981 (green-500)
Border: 2.5px solid white
Shadow: 0 2px 3px rgba(0,0,0,0.25)
```

---

## Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Orange-500 | #F97316 | NEW badge, primary actions |
| Orange-600 | #EA580C | NEW badge gradient end |
| Teal-500 | #14B8A6 | Verified badge |
| Green-500 | #10B981 | Online indicator |

### Text Colors
| Name | Hex | Contrast on White | Usage |
|------|-----|-------------------|-------|
| Gray-900 | #1F2937 | 15.4:1 | Name, primary text |
| Gray-500 | #6B7280 | 5.7:1 | Location, secondary |
| Gray-400 | #9CA3AF | 3.9:1 | Time (decorative) |

### Background Colors
| Name | Hex | Usage |
|------|-----|-------|
| White | #FFFFFF | Card background |
| Gray-100 | #F3F4F6 | Photo placeholder |
| Gray-200 | #E5E7EB | Border, skeleton |

---

## Overflow Prevention Rules

### Critical Implementation Details

1. **Text Containers Must Have `minWidth: 0`**
   ```typescript
   nameWrapper: {
     flex: 1,
     minWidth: 0,  // CRITICAL for truncation
     marginRight: 6,
   }
   ```

2. **All Text Must Use Truncation**
   ```tsx
   <Text
     numberOfLines={1}
     ellipsizeMode="tail"
   >
     {text}
   </Text>
   ```

3. **Badge Strip Uses flexShrink: 0**
   ```typescript
   statusBadges: {
     flexDirection: 'row',
     flexShrink: 0,  // Badges keep size
     gap: 5,
   }
   ```

4. **Fixed Heights, Not Percentages**
   ```typescript
   // GOOD - Fixed height
   infoSection: { height: 80 }

   // BAD - Percentage can cause issues
   infoSection: { height: '25%' }
   ```

---

## Responsive Behavior

### Card Width Calculation (2-column grid)
```typescript
const margin = 24;  // Screen edge margin
const gap = 16;     // Gap between cards
const availableWidth = screenWidth - (margin * 2);
const cardWidth = (availableWidth - gap) / 2;
```

### Example Widths
| Screen Width | Card Width | Photo Height |
|--------------|------------|--------------|
| 375px (iPhone SE) | 155px | 194px |
| 390px (iPhone 14) | 163px | 204px |
| 414px (iPhone Plus) | 175px | 219px |
| 430px (iPhone Max) | 183px | 229px |

### Card Height Formula
```
cardHeight = photoHeight + 80
photoHeight = cardWidth * 1.25 (minimum 160px)
```

---

## Animation Specifications

### Entrance Animation
```typescript
duration: 300ms
delay: index * 50ms (max 200ms)
easing: timing (linear)
property: opacity (0 -> 1)
```

### Press Animation
```typescript
type: spring
toValue: 0.97 (scale down)
friction: 8
useNativeDriver: true
```

### Accessibility
- Respects `reduceMotion` setting
- When enabled: Instant transitions, no animations

---

## Accessibility

### Labels
```typescript
accessibilityLabel={[
  `${name}, ${age} years old`,
  location && `from ${location}`,
  isOnline && 'online now',
  isNew && 'new match',
  isVerified && 'verified profile',
].filter(Boolean).join(', ')}

accessibilityHint="Double tap to view profile and start chatting"
accessibilityRole="button"
```

### Touch Targets
- Entire card is tappable
- Minimum card height: 240px (160 photo + 80 info)
- Meets 48x48dp Android / 44x44pt iOS guidelines

### Contrast Ratios
- Name text: 15.4:1 (exceeds AAA)
- Location text: 5.7:1 (meets AA)
- Time text: 3.9:1 (decorative, not critical)

---

## Component Files

| File | Description |
|------|-------------|
| `EliteMatchCard.tsx` | Production-ready card component |
| `EliteMatchCardSkeleton.tsx` | Loading skeleton |
| `PremiumMatchCardV2.tsx` | Alternative implementation |

### Usage Example
```tsx
import { EliteMatchCard, EliteMatchCardSkeleton } from '../components';

// In grid
<FlatList
  data={matches}
  numColumns={2}
  renderItem={({ item, index }) => (
    <EliteMatchCard
      match={item}
      cardWidth={cardWidth}
      onPress={handleMatchPress}
      isOnline={onlineUserIds.has(item.matchedUserId)}
      index={index}
      reduceMotion={reduceMotion}
    />
  )}
/>

// Loading state
{isLoading && (
  <EliteMatchCardSkeleton
    width={cardWidth}
    reduceMotion={reduceMotion}
  />
)}
```

---

## Testing Checklist

### Visual Tests
- [ ] Photo fills photo section without distortion
- [ ] No text overflow or clipping
- [ ] Badges fit without wrapping
- [ ] Online dot visible on photo (when online)
- [ ] Shadow renders correctly

### Responsive Tests
- [ ] iPhone SE (375px) - Cards fit, readable
- [ ] iPhone 14 (390px) - Standard layout
- [ ] iPhone Pro Max (430px) - Larger cards
- [ ] 1-column fallback (< 380px width)

### Accessibility Tests
- [ ] VoiceOver reads all info correctly
- [ ] TalkBack announces labels
- [ ] Touch target meets minimums
- [ ] Reduce motion respected

### State Tests
- [ ] Loading skeleton animates
- [ ] Image error shows placeholder
- [ ] Online/offline indicator correct
- [ ] NEW badge shows for new matches
- [ ] Verified badge shows when verified

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | PremiumMatchCard with overlays |
| 2.0 | Current | EliteMatchCard - clean photo design |

---

## Design Inspiration

- **Hinge**: Clean card design, info below photo
- **Bumble**: Warm colors, premium feel
- **Instagram**: Photo-first, minimal UI

---

*Last Updated: January 2025*
*Designer: Claude Code AI Assistant*
