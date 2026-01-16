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
          size={24}
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
          <Feather name="check" size={18} color={COLORS.orange} />
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
      <Feather name="x" size={20} color={COLORS.white} />
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
          {/* ============ HEADER - Orange Theme ============ */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <Feather name="heart" size={32} color={COLORS.white} />
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
          </View>

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

          {/* ============ PROGRESS INDICATOR ============ */}
          <View style={styles.progressContainer}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressCount}>{selected.length}</Text>
              <Text style={styles.progressLabel}>
                {selected.length < 3
                  ? `Select ${3 - selected.length} more to continue`
                  : 'Great! You can save now'}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (selected.length / 10) * 100)}%`,
                    backgroundColor: selected.length >= 3 ? COLORS.teal : COLORS.orange,
                  },
                ]}
              />
            </View>
          </View>

          {/* ============ SEARCH BAR - Large ============ */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={24} color={COLORS.gray500} />
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
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.searchClear}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Feather name="x-circle" size={28} color={COLORS.orange} />
              </TouchableOpacity>
            )}
          </View>

          {/* ============ CATEGORY TABS - Large ============ */}
          {searchQuery.length === 0 && (
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
                canSave ? styles.saveButtonEnabled : styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!canSave || isSaving}
              accessibilityLabel={`Save ${selected.length} interests`}
              accessibilityRole="button"
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.white} size="large" />
              ) : (
                <>
                  <Feather name="check" size={26} color={COLORS.white} />
                  <Text style={styles.saveText}>
                    Save ({selected.length})
                  </Text>
                </>
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

  // Header - Orange Theme
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: COLORS.orange,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
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
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selected Bar - Teal Accent
  selectedBar: {
    backgroundColor: COLORS.tealPale,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.tealLight,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  selectedLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.tealDark,
  },
  selectedScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.teal,
    paddingLeft: 18,
    paddingRight: 12,
    paddingVertical: 12,
    borderRadius: 28,
  },
  selectedTagText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    maxWidth: 120,
  },
  selectedTagRemove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  progressCount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.orange,
  },
  progressLabel: {
    fontSize: 18,
    color: COLORS.gray600,
    flex: 1,
  },
  progressBar: {
    height: 10,
    backgroundColor: COLORS.gray200,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },

  // Search - Large
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: COLORS.gray100,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 20,
    color: COLORS.gray800,
    padding: 0,
  },
  searchClear: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: COLORS.orangeLight,
  },

  // Categories - Large Tabs
  categoriesContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: COLORS.orangeLight,
    borderWidth: 2,
    borderColor: COLORS.orangePale,
    minHeight: 60,
  },
  categoryTabActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  categoryTabText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.orangeDark,
  },
  categoryTabTextActive: {
    color: COLORS.white,
  },
  categoryBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.orangePale,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  categoryBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  categoryBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.orangeDark,
  },
  categoryBadgeTextActive: {
    color: COLORS.white,
  },

  // Interests Grid
  interestsScroll: {
    flex: 1,
  },
  interestsContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 32,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },

  // Chip - Extra Large for Seniors
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 10,
    paddingRight: 20,
    paddingVertical: 14,
    borderRadius: 36,
    minHeight: 68,
  },
  chipSelected: {
    backgroundColor: COLORS.orange,
  },
  chipUnselected: {
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.gray200,
  },
  chipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  chipIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Footer - Extra Large Buttons
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: COLORS.gray200,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    minHeight: 68,
  },
  cancelText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    borderRadius: 20,
    minHeight: 68,
  },
  saveButtonEnabled: {
    backgroundColor: COLORS.teal,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  saveText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default InterestsModal;
