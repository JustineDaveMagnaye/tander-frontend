/**
 * InterestsModal - iOS Settings Style Interest Selector
 *
 * Design: iOS System Settings grouped list style
 * - Flat design with no shadows
 * - Gray background (#F2F2F7) with white cards
 * - Large touch targets for seniors (56px+)
 * - Clean, readable typography
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  Pressable,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ============================================================================
// iOS DESIGN SYSTEM - Flat, No Shadows
// ============================================================================

const iOS = {
  colors: {
    // Backgrounds
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    // Labels
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: 'rgba(60, 60, 67, 0.6)',
    // System colors
    separator: 'rgba(60, 60, 67, 0.2)',
    systemGray: '#8E8E93',
    systemGray2: '#AEAEB2',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',
    systemRed: '#FF3B30',
    systemGreen: '#34C759',
    systemBlue: '#007AFF',
    // Tander brand
    tander: {
      orange: '#F97316',
      teal: '#14B8A6',
    },
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    small: 8,
    medium: 10,
    large: 12,
  },
  typography: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
    title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
    title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
    callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
    subhead: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
    caption: { fontSize: 12, fontWeight: '400' as const },
  },
};

// ============================================================================
// INTERESTS DATA
// ============================================================================

interface InterestItem {
  name: string;
  icon: keyof typeof Feather.glyphMap;
  iconBgColor: string;
}

const INTERESTS_DATA: Record<string, InterestItem[]> = {
  'Popular': [
    { name: 'Reading', icon: 'book-open', iconBgColor: '#FF9500' },
    { name: 'Travel', icon: 'map-pin', iconBgColor: '#007AFF' },
    { name: 'Music', icon: 'music', iconBgColor: '#FF2D55' },
    { name: 'Walking', icon: 'navigation', iconBgColor: '#34C759' },
    { name: 'Church', icon: 'heart', iconBgColor: '#AF52DE' },
    { name: 'Cooking', icon: 'coffee', iconBgColor: '#FF9500' },
  ],
  'Hobbies': [
    { name: 'Gardening', icon: 'sun', iconBgColor: '#FFCC00' },
    { name: 'Photography', icon: 'camera', iconBgColor: '#5856D6' },
    { name: 'Crafts', icon: 'scissors', iconBgColor: '#FF2D55' },
    { name: 'Baking', icon: 'award', iconBgColor: '#FF9500' },
    { name: 'Sewing', icon: 'edit-3', iconBgColor: '#AF52DE' },
    { name: 'Puzzles', icon: 'grid', iconBgColor: '#007AFF' },
    { name: 'Bird Watching', icon: 'feather', iconBgColor: '#34C759' },
  ],
  'Activities': [
    { name: 'Dancing', icon: 'activity', iconBgColor: '#FF2D55' },
    { name: 'Yoga', icon: 'target', iconBgColor: '#5AC8FA' },
    { name: 'Swimming', icon: 'droplet', iconBgColor: '#007AFF' },
    { name: 'Golf', icon: 'flag', iconBgColor: '#34C759' },
    { name: 'Tennis', icon: 'circle', iconBgColor: '#FFCC00' },
    { name: 'Fishing', icon: 'anchor', iconBgColor: '#5856D6' },
  ],
  'Social': [
    { name: 'Movies', icon: 'film', iconBgColor: '#FF9500' },
    { name: 'Theater', icon: 'tv', iconBgColor: '#AF52DE' },
    { name: 'Board Games', icon: 'box', iconBgColor: '#007AFF' },
    { name: 'Cards', icon: 'layers', iconBgColor: '#34C759' },
    { name: 'Karaoke', icon: 'mic', iconBgColor: '#FF2D55' },
    { name: 'Mahjong', icon: 'square', iconBgColor: '#FFCC00' },
    { name: 'Volunteering', icon: 'users', iconBgColor: '#5AC8FA' },
  ],
  'Creative': [
    { name: 'Art', icon: 'edit-2', iconBgColor: '#FF2D55' },
    { name: 'Writing', icon: 'pen-tool', iconBgColor: '#5856D6' },
    { name: 'Singing', icon: 'headphones', iconBgColor: '#FF9500' },
  ],
};

const ALL_INTERESTS = Object.values(INTERESTS_DATA).flat();
const CATEGORIES = Object.keys(INTERESTS_DATA);

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
  </View>
);

// ============================================================================
// CARD COMPONENT
// ============================================================================

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

// ============================================================================
// INTEREST ROW COMPONENT
// ============================================================================

interface InterestRowProps {
  interest: InterestItem;
  isSelected: boolean;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const InterestRow: React.FC<InterestRowProps> = ({
  interest,
  isSelected,
  onPress,
  isFirst = false,
  isLast = false,
}) => {
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
        styles.interestRow,
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
        pressed && styles.rowPressed,
      ]}
    >
      {/* Icon Badge */}
      <View style={[styles.iconBadge, { backgroundColor: interest.iconBgColor }]}>
        <Feather name={interest.icon} size={18} color="#fff" />
      </View>

      {/* Title */}
      <Text style={styles.rowTitle}>{interest.name}</Text>

      {/* Checkmark */}
      {isSelected && (
        <Feather name="check" size={22} color={iOS.colors.tander.teal} />
      )}

      {/* Separator */}
      {!isLast && <View style={styles.rowSeparator} />}
    </Pressable>
  );
};

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

  // State
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setSelected(initialSelected);
      setSearchQuery('');
    }
  }, [visible, initialSelected]);

  // Toggle interest selection
  const toggleInterest = useCallback((name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  }, []);

  // Filter interests by search
  const filteredCategories = useMemo(() => {
    if (searchQuery.length === 0) {
      return INTERESTS_DATA;
    }
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, InterestItem[]> = {};
    for (const [category, interests] of Object.entries(INTERESTS_DATA)) {
      const matches = interests.filter((i) =>
        i.name.toLowerCase().includes(query)
      );
      if (matches.length > 0) {
        filtered[category] = matches;
      }
    }
    return filtered;
  }, [searchQuery]);

  // Handle save
  const handleSave = async () => {
    await onSave(selected);
  };

  const canSave = selected.length >= 3;
  const filteredCategoryNames = Object.keys(filteredCategories);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ============ HEADER ============ */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>My Interests</Text>
          <Pressable
            onPress={handleSave}
            disabled={!canSave || isSaving}
            style={styles.headerButton}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={iOS.colors.tander.teal} />
            ) : (
              <Text
                style={[
                  styles.headerButtonText,
                  styles.headerSaveText,
                  !canSave && styles.headerButtonDisabled,
                ]}
              >
                Save
              </Text>
            )}
          </Pressable>
        </View>

        {/* ============ CONTENT ============ */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <View style={styles.progressIconContainer}>
                <Feather
                  name={selected.length >= 3 ? 'check-circle' : 'heart'}
                  size={24}
                  color={selected.length >= 3 ? iOS.colors.tander.teal : iOS.colors.tander.orange}
                />
              </View>
              <View style={styles.progressTextContainer}>
                <Text style={styles.progressTitle}>
                  {selected.length} interest{selected.length !== 1 ? 's' : ''} selected
                </Text>
                <Text style={styles.progressSubtitle}>
                  {selected.length < 3
                    ? `Select ${3 - selected.length} more to continue`
                    : 'You can save your interests'}
                </Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (selected.length / 3) * 100)}%`,
                    backgroundColor:
                      selected.length >= 3
                        ? iOS.colors.tander.teal
                        : iOS.colors.tander.orange,
                  },
                ]}
              />
            </View>
          </View>

          {/* Search Bar */}
          <SectionHeader title="Search" />
          <Card>
            <View style={styles.searchContainer}>
              <Feather name="search" size={20} color={iOS.colors.tertiaryLabel} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search interests..."
                placeholderTextColor={iOS.colors.tertiaryLabel}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Feather name="x-circle" size={20} color={iOS.colors.tertiaryLabel} />
                </Pressable>
              )}
            </View>
          </Card>

          {/* Selected Interests */}
          {selected.length > 0 && (
            <>
              <SectionHeader title={`Selected (${selected.length})`} />
              <Card>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectedScroll}
                >
                  {selected.map((name) => {
                    const interest = ALL_INTERESTS.find((i) => i.name === name);
                    return (
                      <Pressable
                        key={name}
                        style={styles.selectedChip}
                        onPress={() => toggleInterest(name)}
                      >
                        <Text style={styles.selectedChipText}>{name}</Text>
                        <View style={styles.selectedChipX}>
                          <Feather name="x" size={14} color="#fff" />
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Card>
            </>
          )}

          {/* Interest Categories */}
          {filteredCategoryNames.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="search" size={48} color={iOS.colors.systemGray3} />
              <Text style={styles.emptyTitle}>No interests found</Text>
              <Text style={styles.emptySubtitle}>Try a different search term</Text>
            </View>
          ) : (
            filteredCategoryNames.map((category) => {
              const interests = filteredCategories[category];
              return (
                <React.Fragment key={category}>
                  <SectionHeader title={category} />
                  <Card>
                    {interests.map((interest, index) => (
                      <InterestRow
                        key={interest.name}
                        interest={interest}
                        isSelected={selected.includes(interest.name)}
                        onPress={() => toggleInterest(interest.name)}
                        isFirst={index === 0}
                        isLast={index === interests.length - 1}
                      />
                    ))}
                  </Card>
                </React.Fragment>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES - iOS Settings Style, Flat Design
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.secondarySystemBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },
  headerButton: {
    minWidth: 60,
    paddingVertical: iOS.spacing.s,
  },
  headerButtonText: {
    ...iOS.typography.body,
    color: iOS.colors.systemBlue,
  },
  headerSaveText: {
    fontWeight: '600',
    color: iOS.colors.tander.teal,
    textAlign: 'right',
  },
  headerButtonDisabled: {
    color: iOS.colors.systemGray3,
  },
  headerTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: iOS.spacing.l,
  },

  // Progress Card
  progressCard: {
    backgroundColor: iOS.colors.systemBackground,
    marginHorizontal: iOS.spacing.l,
    borderRadius: iOS.radius.large,
    padding: iOS.spacing.l,
    marginBottom: iOS.spacing.xl,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: iOS.spacing.m,
  },
  progressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: iOS.colors.systemGray6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.m,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
    marginBottom: 2,
  },
  progressSubtitle: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
  },
  progressBar: {
    height: 8,
    backgroundColor: iOS.colors.systemGray5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: iOS.spacing.l + iOS.spacing.l,
    paddingTop: iOS.spacing.xl,
    paddingBottom: iOS.spacing.s,
  },
  sectionHeaderText: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: iOS.colors.systemBackground,
    marginHorizontal: iOS.spacing.l,
    borderRadius: iOS.radius.large,
    overflow: 'hidden',
  },

  // Interest Row
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: iOS.spacing.m,
    paddingHorizontal: iOS.spacing.l,
    minHeight: 56,
    backgroundColor: iOS.colors.systemBackground,
  },
  rowFirst: {
    borderTopLeftRadius: iOS.radius.large,
    borderTopRightRadius: iOS.radius.large,
  },
  rowLast: {
    borderBottomLeftRadius: iOS.radius.large,
    borderBottomRightRadius: iOS.radius.large,
  },
  rowPressed: {
    backgroundColor: iOS.colors.systemGray5,
  },
  rowSeparator: {
    position: 'absolute',
    bottom: 0,
    left: 60,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: iOS.colors.separator,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.m,
  },
  rowTitle: {
    ...iOS.typography.body,
    color: iOS.colors.label,
    flex: 1,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.m,
    paddingVertical: iOS.spacing.m,
    gap: iOS.spacing.s,
  },
  searchInput: {
    flex: 1,
    ...iOS.typography.body,
    color: iOS.colors.label,
    padding: 0,
  },

  // Selected Chips
  selectedScroll: {
    paddingHorizontal: iOS.spacing.m,
    paddingVertical: iOS.spacing.m,
    gap: iOS.spacing.s,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iOS.colors.tander.teal,
    paddingLeft: iOS.spacing.m,
    paddingRight: iOS.spacing.s,
    paddingVertical: iOS.spacing.s,
    borderRadius: 20,
    gap: iOS.spacing.s,
  },
  selectedChipText: {
    ...iOS.typography.subhead,
    color: '#fff',
    fontWeight: '600',
  },
  selectedChipX: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: iOS.spacing.xl,
  },
  emptyTitle: {
    ...iOS.typography.title3,
    color: iOS.colors.label,
    marginTop: iOS.spacing.l,
  },
  emptySubtitle: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
    marginTop: iOS.spacing.s,
  },
});

export default InterestsModal;
