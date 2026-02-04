/**
 * InterestsModal - Senior-Friendly Interest Selector
 *
 * DESIGN FOR SENIORS (60+):
 * - Extra large touch targets (64px+)
 * - Large, readable text (18px+ body, 24px+ headers)
 * - High contrast colors (Orange & Teal theme)
 * - Clear visual feedback
 * - Simple, intuitive layout
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Pressable,
  ActivityIndicator,
  Vibration,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT_SCALING } from '@shared/styles/fontScaling';

// ============================================================================
// COLORS - Orange & Teal Theme
// ============================================================================

const COLORS = {
  // Primary - Orange
  orange: '#F97316',
  orangeDark: '#EA580C',
  orangeLight: '#FFF7ED',
  orangePale: '#FFEDD5',

  // Secondary - Teal
  teal: '#14B8A6',
  tealDark: '#0D9488',
  tealLight: '#CCFBF1',
  tealPale: '#F0FDFA',

  // Neutrals
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};

// ============================================================================
// INTERESTS DATA
// ============================================================================

interface InterestItem {
  name: string;
  icon: string;
}

const INTERESTS_DATA: Record<string, InterestItem[]> = {
  'Popular': [
    { name: 'Reading', icon: 'book-open' },
    { name: 'Travel', icon: 'map-pin' },
    { name: 'Music', icon: 'music' },
    { name: 'Walking', icon: 'navigation' },
    { name: 'Church', icon: 'heart' },
    { name: 'Cooking', icon: 'coffee' },
  ],
  'Hobbies': [
    { name: 'Gardening', icon: 'sun' },
    { name: 'Photography', icon: 'camera' },
    { name: 'Crafts', icon: 'scissors' },
    { name: 'Baking', icon: 'award' },
    { name: 'Sewing', icon: 'edit-3' },
    { name: 'Puzzles', icon: 'grid' },
    { name: 'Bird Watching', icon: 'feather' },
  ],
  'Activities': [
    { name: 'Dancing', icon: 'activity' },
    { name: 'Yoga', icon: 'target' },
    { name: 'Swimming', icon: 'droplet' },
    { name: 'Golf', icon: 'flag' },
    { name: 'Tennis', icon: 'circle' },
    { name: 'Fishing', icon: 'anchor' },
  ],
  'Social': [
    { name: 'Movies', icon: 'film' },
    { name: 'Theater', icon: 'tv' },
    { name: 'Board Games', icon: 'box' },
    { name: 'Cards', icon: 'layers' },
    { name: 'Karaoke', icon: 'mic' },
    { name: 'Mahjong', icon: 'square' },
    { name: 'Volunteering', icon: 'users' },
  ],
  'Creative': [
    { name: 'Art', icon: 'edit-2' },
    { name: 'Writing', icon: 'pen-tool' },
    { name: 'Singing', icon: 'headphones' },
  ],
};

const ALL_INTERESTS = Object.values(INTERESTS_DATA).flat();
const CATEGORIES = Object.keys(INTERESTS_DATA);

// ============================================================================
// INTEREST CHIP - Large, Easy to Tap
// ============================================================================

interface ChipProps {
  interest: InterestItem;
  isSelected: boolean;
  onPress: () => void;
}

const InterestChip: React.FC<ChipProps> = ({ interest, isSelected, onPress }) => {
  const handlePress = () => {
    Vibration.vibrate(15);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={`${interest.name}, ${isSelected ? 'selected' : 'not selected'}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      style={({ pressed }) => [
        styles.chip,
        isSelected ? styles.chipSelected : styles.chipUnselected,
        pressed && styles.chipPressed,
      ]}
    >
      <View
        style={[
          styles.chipIcon,
          isSelected ? styles.chipIconSelected : styles.chipIconUnselected,
        ]}
      >
        <Feather
          name={interest.icon as React.ComponentProps<typeof Feather>['name']}
          size={20}
          color={isSelected ? COLORS.white : COLORS.orange}
        />
      </View>
      <Text
        style={[
          styles.chipText,
          isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
        ]}
        numberOfLines={1}
      >
        {interest.name}
      </Text>
      {isSelected && (
        <View style={styles.chipCheck}>
          <Feather name="check" size={14} color={COLORS.orange} />
        </View>
      )}
    </Pressable>
  );
};

// ============================================================================
// SELECTED TAG - Removable Pills
// ============================================================================

interface SelectedTagProps {
  name: string;
  onRemove: () => void;
}

const SelectedTag: React.FC<SelectedTagProps> = ({ name, onRemove }) => (
  <View style={styles.selectedTag}>
    <Text style={styles.selectedTagText} numberOfLines={1}>
      {name}
    </Text>
    <TouchableOpacity
      onPress={onRemove}
      style={styles.selectedTagRemove}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityLabel={`Remove ${name}`}
    >
      <Feather name="x" size={16} color={COLORS.white} />
    </TouchableOpacity>
  </View>
);

// ============================================================================
// CATEGORY TAB - Large Touch Target
// ============================================================================

interface CategoryTabProps {
  name: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}

const CategoryTab: React.FC<CategoryTabProps> = ({ name, count, isActive, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.categoryTab, isActive && styles.categoryTabActive]}
    accessibilityLabel={`${name} category, ${count} selected`}
    accessibilityState={{ selected: isActive }}
  >
    <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
      {name}
    </Text>
    {count > 0 && (
      <View style={[styles.categoryBadge, isActive && styles.categoryBadgeActive]}>
        <Text style={[styles.categoryBadgeText, isActive && styles.categoryBadgeTextActive]}>
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

interface InterestsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedInterests: string[];
  onSave: (interests: string[]) => Promise<void>;
  isSaving?: boolean;
}

export const InterestsModal: React.FC<InterestsModalProps> = ({
  visible,
  onClose,
  selectedInterests: initialSelected,
  onSave,
  isSaving = false,
}) => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');

  // State
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [activeCategory, setActiveCategory] = useState('Popular');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setSelected(initialSelected);
      setActiveCategory('Popular');
      setSearchQuery('');
    }
  }, [visible, initialSelected]);

  // Toggle interest selection
  const toggleInterest = useCallback((name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  }, []);

  // Get displayed interests
  const displayedInterests = useMemo(() => {
    if (searchQuery.length > 0) {
      return ALL_INTERESTS.filter((i) =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return INTERESTS_DATA[activeCategory] || [];
  }, [activeCategory, searchQuery]);

  // Count selected per category
  const getCountForCategory = useCallback(
    (category: string) => {
      const items = INTERESTS_DATA[category] || [];
      return items.filter((i) => selected.includes(i.name)).length;
    },
    [selected]
  );

  // Handle save
  const handleSave = async () => {
    await onSave(selected);
  };

  const canSave = selected.length >= 3;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              maxHeight: screenHeight * 0.95,
              paddingBottom: Math.max(24, insets.bottom + 8),
            },
          ]}
        >
          {/* ============ HEADER - Premium Gradient ============ */}
          <LinearGradient
            colors={['#F97316', '#EA580C', '#DC4E08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {/* Decorative circles for premium look */}
            <View style={styles.headerDecorCircle1} />
            <View style={styles.headerDecorCircle2} />
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']}
                  style={styles.headerIconGradient}
                >
                  <Feather name="heart" size={32} color={COLORS.white} />
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.headerTitle}>My Interests</Text>
                <Text style={styles.headerSubtitle}>Choose what you enjoy</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
            >
              <Feather name="x" size={28} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>

          {/* ============ SELECTED BAR ============ */}
          {selected.length > 0 && (
            <View style={styles.selectedBar}>
              <View style={styles.selectedHeader}>
                <Feather name="check-circle" size={24} color={COLORS.teal} />
                <Text style={styles.selectedLabel}>
                  {selected.length} Selected
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedScroll}
              >
                {selected.map((name) => (
                  <SelectedTag
                    key={name}
                    name={name}
                    onRemove={() => toggleInterest(name)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ============ PROGRESS INDICATOR - Premium ============ */}
          <View style={styles.progressContainer}>
            <View style={styles.progressInfo}>
              <View style={styles.progressCountWrapper}>
                <Text style={[styles.progressCount, selected.length >= 3 && styles.progressCountComplete]}>
                  {selected.length}
                </Text>
                {selected.length >= 3 && (
                  <View style={styles.progressCheckBadge}>
                    <Feather name="check" size={12} color={COLORS.white} />
                  </View>
                )}
              </View>
              <Text style={[styles.progressLabel, selected.length >= 3 && styles.progressLabelComplete]}>
                {selected.length < 3
                  ? `Select ${3 - selected.length} more to continue`
                  : 'Great! You can save now'}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={selected.length >= 3 ? ['#14B8A6', '#0D9488'] : ['#F97316', '#EA580C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (selected.length / 10) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* ============ SEARCH BAR ============ */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color={COLORS.gray500} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search interests..."
              placeholderTextColor={COLORS.gray500}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search interests"
              accessibilityHint="Type to filter interests by name"
              maxFontSizeMultiplier={FONT_SCALING.INPUT}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.searchClear}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Feather name="x-circle" size={22} color={COLORS.orange} />
              </TouchableOpacity>
            )}
          </View>

          {/* ============ CATEGORY TABS ============ */}
          {searchQuery.length === 0 && (
            <View style={styles.categoriesWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                {CATEGORIES.map((category) => (
                  <CategoryTab
                    key={category}
                    name={category}
                    count={getCountForCategory(category)}
                    isActive={activeCategory === category}
                    onPress={() => setActiveCategory(category)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ============ INTERESTS GRID - Large Chips ============ */}
          <ScrollView
            style={styles.interestsScroll}
            contentContainerStyle={styles.interestsContent}
            showsVerticalScrollIndicator={false}
          >
            {displayedInterests.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="search" size={56} color={COLORS.gray300} />
                <Text style={styles.emptyTitle}>No interests found</Text>
                <Text style={styles.emptyHint}>Try a different search</Text>
              </View>
            ) : (
              <View style={styles.interestsGrid}>
                {displayedInterests.map((interest) => (
                  <InterestChip
                    key={interest.name}
                    interest={interest}
                    isSelected={selected.includes(interest.name)}
                    onPress={() => toggleInterest(interest.name)}
                  />
                ))}
              </View>
            )}
          </ScrollView>

          {/* ============ FOOTER BUTTONS - Extra Large ============ */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                !canSave && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!canSave || isSaving}
              accessibilityLabel={`Save ${selected.length} interests`}
              accessibilityRole="button"
            >
              {canSave ? (
                <LinearGradient
                  colors={['#14B8A6', '#0D9488', '#0F766E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  {isSaving ? (
                    <ActivityIndicator color={COLORS.white} size="large" />
                  ) : (
                    <>
                      <View style={styles.saveButtonIcon}>
                        <Feather name="check" size={24} color={COLORS.white} />
                      </View>
                      <Text style={styles.saveText}>
                        Save ({selected.length})
                      </Text>
                    </>
                  )}
                </LinearGradient>
              ) : (
                <View style={styles.saveButtonGradient}>
                  <Feather name="check" size={26} color={COLORS.white} />
                  <Text style={styles.saveText}>
                    Save ({selected.length})
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES - Large & Senior-Friendly
// ============================================================================

const styles = StyleSheet.create({
  // Backdrop & Container
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 32,
      },
    }),
  },

  // Header - Premium Gradient
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    // Premium shadow
    ...Platform.select({
      ios: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerDecorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerDecorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: '30%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 1,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    // Glow effect
    ...Platform.select({
      ios: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  closeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    // Subtle glow
    ...Platform.select({
      ios: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // Selected Bar - Teal Accent Dense
  selectedBar: {
    backgroundColor: COLORS.tealPale,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.tealLight,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  selectedLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.tealDark,
  },
  selectedScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.teal,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: 22,
    // Premium glow
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectedTagText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    maxWidth: 100,
  },
  selectedTagRemove: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress - Premium Dense
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 0,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressCountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressCount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.orange,
  },
  progressCountComplete: {
    color: COLORS.teal,
  },
  progressCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    // Glow
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  progressLabel: {
    fontSize: 18,
    color: COLORS.gray600,
    flex: 1,
  },
  progressLabelComplete: {
    color: COLORS.tealDark,
    fontWeight: '600',
  },
  progressBar: {
    height: 12,
    backgroundColor: COLORS.gray200,
    borderRadius: 6,
    overflow: 'hidden',
    // Inner shadow effect
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },

  // Search - Compact & Premium
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    // Subtle inset shadow effect
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gray400,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.gray800,
    padding: 0,
  },
  searchClear: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: COLORS.orangeLight,
  },

  // Categories Wrapper
  categoriesWrapper: {
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  // Categories - Compact Pill Tabs
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.orangeLight,
    borderWidth: 1.5,
    borderColor: COLORS.orangePale,
    // Subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gray400,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  categoryTabActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orangeDark,
    // Active glow
    ...Platform.select({
      ios: {
        shadowColor: COLORS.orange,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  categoryTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.orangeDark,
  },
  categoryTabTextActive: {
    color: COLORS.white,
  },
  categoryBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.orangePale,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  categoryBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.orangeDark,
  },
  categoryBadgeTextActive: {
    color: COLORS.white,
  },

  // Interests Grid - Dense Layout
  interestsScroll: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  interestsContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Chip - Clean & Readable for Seniors
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 10,
    borderRadius: 28,
    minHeight: 56,
  },
  chipSelected: {
    backgroundColor: COLORS.orange,
    // Glow for selected
    ...Platform.select({
      ios: {
        shadowColor: COLORS.orange,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
    borderWidth: 2,
    borderColor: COLORS.orangeDark,
  },
  chipUnselected: {
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.gray200,
    // Subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gray400,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  chipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  chipIconUnselected: {
    backgroundColor: COLORS.orangeLight,
  },
  chipText: {
    fontSize: 18,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  chipTextUnselected: {
    color: COLORS.gray800,
  },
  chipCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    // Inner glow effect
    ...Platform.select({
      ios: {
        shadowColor: COLORS.orange,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
    borderWidth: 2,
    borderColor: 'rgba(249,115,22,0.3)',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.gray600,
    marginTop: 20,
  },
  emptyHint: {
    fontSize: 18,
    color: COLORS.gray400,
    marginTop: 8,
  },

  // Footer - Compact Buttons
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    minHeight: 54,
    // Subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gray400,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cancelText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  saveButton: {
    flex: 2,
    borderRadius: 16,
    minHeight: 54,
    overflow: 'hidden',
    // Premium shadow when enabled
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.gray300,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
        shadowColor: COLORS.gray400,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  saveButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  saveButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});

export default InterestsModal;
