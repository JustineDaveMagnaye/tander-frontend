/**
 * TANDER Location Settings Screen - iOS Premium Design
 * Location settings for discovering matches
 *
 * Design: iOS Human Interface Guidelines
 * - Clean system background (#F2F2F7)
 * - iOS-style grouped cards
 * - Senior-friendly touch targets
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getDiscoverySettings, updateLocation } from '@/services/api/profileApi';

// =============================================================================
// iOS DESIGN SYSTEM
// =============================================================================

const iOS = {
  colors: {
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C4399',
    separator: '#3C3C4336',
    systemRed: '#FF3B30',
    systemGreen: '#34C759',
    systemBlue: '#007AFF',
    systemOrange: '#FF9500',
    systemTeal: '#5AC8FA',
    systemIndigo: '#5856D6',
    systemGray: '#8E8E93',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',
    tander: { orange: '#F97316', teal: '#14B8A6' },
  },
  spacing: { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24 },
  radius: { small: 8, medium: 10, large: 12, xlarge: 16 },
  typography: {
    headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
    body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
    subhead: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
    footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
  },
};

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

interface LocationScreenProps {
  onBack: () => void;
}

interface LocationSuggestion {
  city: string;
  region: string;
}

const LOCATION_SUGGESTIONS: LocationSuggestion[] = [
  { city: 'Manila', region: 'Metro Manila' },
  { city: 'Quezon City', region: 'Metro Manila' },
  { city: 'Makati', region: 'Metro Manila' },
  { city: 'Pasig', region: 'Metro Manila' },
  { city: 'Taguig', region: 'Metro Manila' },
  { city: 'Cebu City', region: 'Cebu' },
  { city: 'Davao City', region: 'Davao del Sur' },
  { city: 'Baguio', region: 'Benguet' },
  { city: 'Iloilo City', region: 'Iloilo' },
  { city: 'Bacolod', region: 'Negros Occidental' },
  { city: 'Cagayan de Oro', region: 'Misamis Oriental' },
  { city: 'Zamboanga City', region: 'Zamboanga del Sur' },
  { city: 'Antipolo', region: 'Rizal' },
  { city: 'Calamba', region: 'Laguna' },
  { city: 'Angeles', region: 'Pampanga' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LocationScreen: React.FC<LocationScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getDiscoverySettings();
        setUseCurrentLocation(settings.useCurrentLocation);
        if (settings.city) setSelectedCity(settings.city);
        if (settings.latitude && settings.longitude) {
          setCurrentCoords({ latitude: settings.latitude, longitude: settings.longitude });
        }
      } catch (err) {
        console.warn('Failed to load location settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Handlers
  const handleBack = useCallback(() => {
    onBack();
  }, [onBack]);

  const handleUseCurrentLocation = useCallback(async () => {
    if (useCurrentLocation) {
      setUseCurrentLocation(false);
      return;
    }

    try {
      setIsLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCurrentCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setUseCurrentLocation(true);
      setSelectedCity(null);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to get location:', err);
      Alert.alert(
        'Location Unavailable',
        'Unable to get your location. Please try again or select a city manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  }, [useCurrentLocation]);

  const handleSelectCity = useCallback((city: string) => {
    setSelectedCity(city);
    setUseCurrentLocation(false);
    setSearchQuery('');
    setCurrentCoords(null);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      if (useCurrentLocation && currentCoords) {
        await updateLocation(true, currentCoords.latitude, currentCoords.longitude, undefined, undefined);
      } else if (selectedCity) {
        const suggestion = LOCATION_SUGGESTIONS.find((s) => s.city === selectedCity);
        await updateLocation(false, undefined, undefined, selectedCity, suggestion?.region || 'Philippines');
      }
      onBack();
    } catch (err) {
      console.error('Failed to save location:', err);
      Alert.alert('Error', 'Failed to save location. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [useCurrentLocation, currentCoords, selectedCity, onBack]);

  // Filter suggestions
  const filteredSuggestions = searchQuery.length > 0
    ? LOCATION_SUGGESTIONS.filter(
        (loc) =>
          loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.region.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const showSaveButton = useCurrentLocation || selectedCity;

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={iOS.colors.secondarySystemBackground} />
        <ActivityIndicator size="large" color={iOS.colors.tander.orange} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={iOS.colors.secondarySystemBackground}
        translucent={Platform.OS === 'android'}
      />

      {/* Navigation Bar */}
      <View style={[styles.navBar, (isTablet || isLandscape) && styles.navBarWide]}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={handleBack}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={28} color={iOS.colors.systemBlue} />
          <Text style={styles.backButtonText}>Settings</Text>
        </Pressable>
        <Text style={styles.navTitle} pointerEvents="none">Location</Text>
        <View style={styles.navBarSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, iOS.spacing.xxl) + (showSaveButton ? 80 : 0) },
            (isTablet || isLandscape) && styles.scrollContentWide,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* GPS Section */}
          <Text style={styles.sectionHeader}>AUTOMATIC LOCATION</Text>
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={handleUseCurrentLocation}
            disabled={isLoadingLocation}
          >
            <View style={[styles.iconBadge, { backgroundColor: iOS.colors.tander.orange }]}>
              <Feather name="navigation" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Use Current Location</Text>
              <Text style={styles.cardSubtitle}>
                {isLoadingLocation
                  ? 'Getting your location...'
                  : useCurrentLocation
                  ? 'Location enabled'
                  : 'Automatically detect your location'}
              </Text>
            </View>
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={iOS.colors.tander.orange} />
            ) : (
              <View style={[styles.radioOuter, useCurrentLocation && { borderColor: iOS.colors.tander.orange }]}>
                {useCurrentLocation && (
                  <View style={[styles.radioInner, { backgroundColor: iOS.colors.tander.orange }]} />
                )}
              </View>
            )}
          </Pressable>

          {/* Manual Section */}
          <Text style={styles.sectionHeader}>CHOOSE A CITY</Text>

          {/* Search Input */}
          <View style={styles.searchCard}>
            <Feather name="search" size={20} color={iOS.colors.systemGray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city or province..."
              placeholderTextColor={iOS.colors.systemGray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Feather name="x-circle" size={20} color={iOS.colors.systemGray3} />
              </Pressable>
            )}
          </View>

          {/* Search Results */}
          {filteredSuggestions.length > 0 && (
            <View style={styles.resultsCard}>
              {filteredSuggestions.map((location, index) => {
                const isSelected = selectedCity === location.city;
                const isLast = index === filteredSuggestions.length - 1;
                return (
                  <Pressable
                    key={location.city}
                    style={({ pressed }) => [
                      styles.resultRow,
                      pressed && styles.resultRowPressed,
                      !isLast && styles.resultRowBorder,
                    ]}
                    onPress={() => handleSelectCity(location.city)}
                  >
                    <View style={[styles.resultIconBadge, isSelected && { backgroundColor: iOS.colors.tander.teal }]}>
                      <Feather name="map-pin" size={16} color={isSelected ? '#FFFFFF' : iOS.colors.systemGray} />
                    </View>
                    <View style={styles.resultContent}>
                      <Text style={[styles.resultCity, isSelected && { color: iOS.colors.tander.teal }]}>
                        {location.city}
                      </Text>
                      <Text style={styles.resultRegion}>{location.region}</Text>
                    </View>
                    {isSelected && <Feather name="checkmark-circle" size={22} color={iOS.colors.tander.teal} />}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* No Results */}
          {searchQuery.length > 0 && filteredSuggestions.length === 0 && (
            <View style={styles.noResults}>
              <Feather name="map" size={32} color={iOS.colors.systemGray3} />
              <Text style={styles.noResultsText}>No cities found for "{searchQuery}"</Text>
            </View>
          )}

          {/* Selected City Badge */}
          {selectedCity && searchQuery.length === 0 && (
            <View style={styles.selectedBadge}>
              <View style={[styles.iconBadge, { backgroundColor: iOS.colors.tander.teal }]}>
                <Feather name="check" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.selectedBadgeText}>{selectedCity}</Text>
              <Pressable
                style={styles.selectedBadgeRemove}
                onPress={() => setSelectedCity(null)}
                hitSlop={8}
              >
                <Feather name="x" size={18} color={iOS.colors.secondaryLabel} />
              </Pressable>
            </View>
          )}

          {/* Privacy Info */}
          <Text style={styles.sectionHeader}>PRIVACY</Text>
          <View style={styles.infoCard}>
            <View style={[styles.iconBadge, { backgroundColor: iOS.colors.systemGreen }]}>
              <Feather name="shield" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Your Privacy is Protected</Text>
              <Text style={styles.infoDescription}>
                {'Your exact location is never shared with other users. They only see approximate distances like "5 km away".'}
              </Text>
            </View>
          </View>

          {/* Footer Note */}
          <Text style={styles.footerNote}>
            {'Location helps us show you profiles nearby. You can change this anytime.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      {showSaveButton && (
        <View style={[styles.saveButtonContainer, { paddingBottom: Math.max(insets.bottom, iOS.spacing.l) }]}>
          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Location</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
    marginTop: iOS.spacing.l,
  },
  keyboardAvoid: {
    flex: 1,
  },

  // Navigation Bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  navBarWide: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: iOS.spacing.xs,
    marginLeft: -iOS.spacing.s,
    zIndex: 1,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    ...iOS.typography.body,
    color: iOS.colors.systemBlue,
    marginLeft: -iOS.spacing.xs,
  },
  navTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  navBarSpacer: {
    width: 100,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: iOS.spacing.l,
  },
  scrollContentWide: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },

  // Section Header
  sectionHeader: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    marginTop: iOS.spacing.xl,
    marginBottom: iOS.spacing.s,
    marginLeft: iOS.spacing.l,
    textTransform: 'uppercase',
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    padding: iOS.spacing.l,
  },
  cardPressed: {
    backgroundColor: iOS.colors.systemGray5,
  },
  cardContent: {
    flex: 1,
    marginHorizontal: iOS.spacing.m,
  },
  cardTitle: {
    ...iOS.typography.body,
    fontWeight: '500',
    color: iOS.colors.label,
    marginBottom: 2,
  },
  cardSubtitle: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
  },

  // Icon Badge
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Radio Button
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: iOS.colors.systemGray3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Search
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    gap: iOS.spacing.s,
  },
  searchInput: {
    flex: 1,
    ...iOS.typography.body,
    color: iOS.colors.label,
    minHeight: 44,
  },

  // Results
  resultsCard: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    marginTop: iOS.spacing.s,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
  },
  resultRowPressed: {
    backgroundColor: iOS.colors.systemGray5,
  },
  resultRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },
  resultIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: iOS.colors.systemGray5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.m,
  },
  resultContent: {
    flex: 1,
  },
  resultCity: {
    ...iOS.typography.body,
    fontWeight: '500',
    color: iOS.colors.label,
  },
  resultRegion: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    marginTop: 2,
  },

  // No Results
  noResults: {
    alignItems: 'center',
    paddingVertical: iOS.spacing.xxl,
    gap: iOS.spacing.s,
  },
  noResultsText: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
  },

  // Selected Badge
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    padding: iOS.spacing.l,
    marginTop: iOS.spacing.s,
  },
  selectedBadgeText: {
    ...iOS.typography.body,
    fontWeight: '600',
    color: iOS.colors.tander.teal,
    flex: 1,
    marginLeft: iOS.spacing.m,
  },
  selectedBadgeRemove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: iOS.colors.systemGray5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    padding: iOS.spacing.l,
  },
  infoContent: {
    flex: 1,
    marginLeft: iOS.spacing.m,
  },
  infoTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
    marginBottom: iOS.spacing.xs,
  },
  infoDescription: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    lineHeight: 20,
  },

  // Footer Note
  footerNote: {
    ...iOS.typography.footnote,
    color: iOS.colors.tertiaryLabel,
    textAlign: 'center',
    marginTop: iOS.spacing.xl,
    marginHorizontal: iOS.spacing.xl,
  },

  // Save Button
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: iOS.spacing.l,
    paddingTop: iOS.spacing.m,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: iOS.colors.tander.orange,
    borderRadius: iOS.radius.large,
    paddingVertical: iOS.spacing.l,
    gap: iOS.spacing.s,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonText: {
    ...iOS.typography.headline,
    color: '#FFFFFF',
  },
});

export default LocationScreen;
