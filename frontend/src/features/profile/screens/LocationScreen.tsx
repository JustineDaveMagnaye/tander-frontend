/**
 * TANDER Location Settings Screen
 * Premium, senior-friendly location settings for discovering matches
 *
 * Design Principles:
 * - Premium visual design with subtle animations
 * - Large touch targets (56-64px minimum) for seniors
 * - High contrast text (WCAG AAA compliant)
 * - Clear, simple language for users 50+
 * - Beautiful animated illustrations
 * - Smooth entrance/exit animations
 * - Reduced motion support for accessibility
 *
 * Orange (#F97316) + Teal (#14B8A6) Design System
 */

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows, touchTargets } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import { getDiscoverySettings, updateLocation } from '@/services/api/profileApi';

// =============================================================================
// TYPES
// =============================================================================

interface LocationScreenProps {
  onBack: () => void;
}

interface LocationSuggestion {
  city: string;
  region: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LOCATION_SUGGESTIONS: LocationSuggestion[] = [
  // Metro Manila
  { city: 'Manila', region: 'Metro Manila' },
  { city: 'Quezon City', region: 'Metro Manila' },
  { city: 'Makati', region: 'Metro Manila' },
  { city: 'Pasig', region: 'Metro Manila' },
  { city: 'Taguig', region: 'Metro Manila' },
  { city: 'Mandaluyong', region: 'Metro Manila' },
  { city: 'Parañaque', region: 'Metro Manila' },
  { city: 'Las Piñas', region: 'Metro Manila' },
  { city: 'Muntinlupa', region: 'Metro Manila' },
  { city: 'Marikina', region: 'Metro Manila' },
  { city: 'Caloocan', region: 'Metro Manila' },
  { city: 'Valenzuela', region: 'Metro Manila' },
  { city: 'San Juan', region: 'Metro Manila' },
  // Central Luzon
  { city: 'Angeles', region: 'Pampanga' },
  { city: 'San Fernando', region: 'Pampanga' },
  { city: 'Olongapo', region: 'Zambales' },
  { city: 'Tarlac City', region: 'Tarlac' },
  { city: 'Cabanatuan', region: 'Nueva Ecija' },
  { city: 'Dagupan', region: 'Pangasinan' },
  // Calabarzon
  { city: 'Antipolo', region: 'Rizal' },
  { city: 'Bacoor', region: 'Cavite' },
  { city: 'Imus', region: 'Cavite' },
  { city: 'Dasmariñas', region: 'Cavite' },
  { city: 'Tagaytay', region: 'Cavite' },
  { city: 'Calamba', region: 'Laguna' },
  { city: 'San Pablo', region: 'Laguna' },
  { city: 'Santa Rosa', region: 'Laguna' },
  { city: 'Los Baños', region: 'Laguna' },
  { city: 'Batangas City', region: 'Batangas' },
  { city: 'Lipa', region: 'Batangas' },
  { city: 'Lucena', region: 'Quezon' },
  // Northern Luzon
  { city: 'Baguio', region: 'Benguet' },
  { city: 'Laoag', region: 'Ilocos Norte' },
  { city: 'Vigan', region: 'Ilocos Sur' },
  { city: 'Tuguegarao', region: 'Cagayan' },
  // Bicol
  { city: 'Legazpi', region: 'Albay' },
  { city: 'Naga', region: 'Camarines Sur' },
  // Visayas
  { city: 'Cebu City', region: 'Cebu' },
  { city: 'Mandaue', region: 'Cebu' },
  { city: 'Lapu-Lapu', region: 'Cebu' },
  { city: 'Iloilo City', region: 'Iloilo' },
  { city: 'Bacolod', region: 'Negros Occidental' },
  { city: 'Dumaguete', region: 'Negros Oriental' },
  { city: 'Tacloban', region: 'Leyte' },
  { city: 'Tagbilaran', region: 'Bohol' },
  { city: 'Boracay', region: 'Aklan' },
  // Mindanao
  { city: 'Davao City', region: 'Davao del Sur' },
  { city: 'General Santos', region: 'South Cotabato' },
  { city: 'Cagayan de Oro', region: 'Misamis Oriental' },
  { city: 'Zamboanga City', region: 'Zamboanga del Sur' },
  { city: 'Butuan', region: 'Agusan del Norte' },
  { city: 'Cotabato City', region: 'Maguindanao' },
  // Palawan
  { city: 'Puerto Princesa', region: 'Palawan' },
  { city: 'El Nido', region: 'Palawan' },
  { city: 'Coron', region: 'Palawan' },
];

// =============================================================================
// ANIMATED LOCATION ILLUSTRATION
// =============================================================================

interface LocationIllustrationProps {
  size: number;
  reduceMotion: boolean;
  isActive?: boolean;
  variant: 'gps' | 'manual';
}

const LocationIllustration: React.FC<LocationIllustrationProps> = memo(
  ({ size, reduceMotion, isActive = false, variant }) => {
    const iconSize = size * 0.4;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0.3)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (reduceMotion) return;

      // Gentle pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Floating animation
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -4,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Glow animation
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Rotation for GPS variant
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      pulseAnimation.start();
      floatAnimation.start();
      if (isActive) {
        glowAnimation.start();
      }
      if (variant === 'gps') {
        rotateAnimation.start();
      }

      return () => {
        pulseAnimation.stop();
        floatAnimation.stop();
        glowAnimation.stop();
        rotateAnimation.stop();
      };
    }, [reduceMotion, isActive, variant, pulseAnim, floatAnim, glowAnim, rotateAnim]);

    const rotateInterpolate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const primaryColor = variant === 'gps' ? colors.orange[500] : colors.teal[500];
    const gradientColors = variant === 'gps'
      ? colors.gradient.primaryButton
      : colors.gradient.likeButton;
    const bgColor = variant === 'gps' ? colors.orange[50] : colors.teal[50];
    const iconName = variant === 'gps' ? 'navigation' : 'map-pin';

    return (
      <View
        style={[styles.illustrationContainer, { width: size, height: size }]}
        accessibilityLabel={
          variant === 'gps'
            ? 'GPS location illustration'
            : 'Manual location illustration'
        }
        accessibilityRole="image"
      >
        {/* Outer glow ring */}
        {isActive && (
          <Animated.View
            style={[
              styles.outerGlow,
              {
                width: size * 1.15,
                height: size * 1.15,
                borderRadius: size * 0.575,
                opacity: reduceMotion ? 0.4 : glowAnim,
                backgroundColor: primaryColor,
              },
            ]}
          />
        )}

        {/* Background circle */}
        <View
          style={[
            styles.illustrationBackground,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bgColor,
            },
          ]}
        />

        {/* Rotating ring for GPS */}
        {variant === 'gps' && (
          <Animated.View
            style={[
              styles.rotatingRing,
              {
                width: size * 0.85,
                height: size * 0.85,
                borderRadius: size * 0.425,
                borderColor: isActive ? colors.orange[300] : colors.gray[200],
                transform: reduceMotion ? [] : [{ rotate: rotateInterpolate }],
              },
            ]}
          >
            {/* Ring dots */}
            {[0, 90, 180, 270].map((deg, i) => (
              <View
                key={i}
                style={[
                  styles.ringDot,
                  {
                    backgroundColor: isActive ? colors.orange[400] : colors.gray[300],
                    transform: [
                      { rotate: `${deg}deg` },
                      { translateY: -(size * 0.425) + 4 },
                    ],
                  },
                ]}
              />
            ))}
          </Animated.View>
        )}

        {/* Manual location decorative elements */}
        {variant === 'manual' && (
          <>
            <View
              style={[
                styles.decorativeDot,
                {
                  top: size * 0.15,
                  right: size * 0.2,
                  width: 8,
                  height: 8,
                  backgroundColor: isActive ? colors.teal[400] : colors.gray[300],
                },
              ]}
            />
            <View
              style={[
                styles.decorativeDot,
                {
                  bottom: size * 0.18,
                  left: size * 0.15,
                  width: 6,
                  height: 6,
                  backgroundColor: isActive ? colors.teal[300] : colors.gray[200],
                },
              ]}
            />
            <View
              style={[
                styles.decorativeDot,
                {
                  top: size * 0.25,
                  left: size * 0.18,
                  width: 5,
                  height: 5,
                  backgroundColor: isActive ? colors.teal[200] : colors.gray[200],
                },
              ]}
            />
          </>
        )}

        {/* Main icon */}
        <Animated.View
          style={[
            styles.illustrationIconContainer,
            {
              transform: [
                { translateY: reduceMotion ? 0 : floatAnim },
                { scale: reduceMotion ? 1 : pulseAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.iconGradient,
              {
                width: iconSize + 20,
                height: iconSize + 20,
                borderRadius: (iconSize + 20) / 2,
              },
            ]}
          >
            <Feather name={iconName} size={iconSize} color={colors.white} />
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }
);

LocationIllustration.displayName = 'LocationIllustration';

// =============================================================================
// LOCATION OPTION CARD
// =============================================================================

interface LocationOptionCardProps {
  title: string;
  subtitle: string;
  isSelected: boolean;
  variant: 'gps' | 'manual';
  onPress: () => void;
  reduceMotion: boolean;
  moderateScale: (size: number) => number;
  isLandscape: boolean;
  children?: React.ReactNode;
}

const LocationOptionCard: React.FC<LocationOptionCardProps> = memo(
  ({
    title,
    subtitle,
    isSelected,
    variant,
    onPress,
    reduceMotion,
    moderateScale,
    isLandscape,
    children,
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const borderColorAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (reduceMotion) return;
      Animated.timing(borderColorAnim, {
        toValue: isSelected ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [isSelected, reduceMotion, borderColorAnim]);

    const handlePressIn = useCallback(() => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }, [reduceMotion, scaleAnim]);

    const handlePressOut = useCallback(() => {
      if (reduceMotion) return;
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }, [reduceMotion, scaleAnim]);

    const primaryColor = variant === 'gps' ? colors.orange[500] : colors.teal[500];
    const bgColor = variant === 'gps' ? colors.orange[50] : colors.teal[50];
    const illustrationSize = isLandscape ? 56 : 72;

    const borderColor = borderColorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.gray[200], primaryColor],
    });

    const backgroundColor = borderColorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.white, bgColor],
    });

    return (
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityHint={subtitle}
          accessibilityState={{ selected: isSelected }}
        >
          <Animated.View
            style={[
              styles.optionCard,
              {
                borderColor: reduceMotion
                  ? isSelected
                    ? primaryColor
                    : colors.gray[200]
                  : borderColor,
                backgroundColor: reduceMotion
                  ? isSelected
                    ? bgColor
                    : colors.white
                  : backgroundColor,
              },
            ]}
          >
            <View style={styles.optionCardContent}>
              <LocationIllustration
                size={illustrationSize}
                reduceMotion={reduceMotion}
                isActive={isSelected}
                variant={variant}
              />
              <View style={styles.optionCardText}>
                <Text
                  style={[
                    styles.optionCardTitle,
                    { fontSize: isLandscape ? 17 : 20 },
                    isSelected && {
                      color: variant === 'gps' ? colors.orange[700] : colors.teal[700],
                    },
                  ]}
                >
                  {title}
                </Text>
                <Text
                  style={[
                    styles.optionCardSubtitle,
                    { fontSize: isLandscape ? 14 : 16 },
                    isSelected && {
                      color: variant === 'gps' ? colors.orange[600] : colors.teal[600],
                    },
                  ]}
                >
                  {subtitle}
                </Text>
              </View>
              {isSelected && (
                <View
                  style={[
                    styles.checkmarkContainer,
                    { backgroundColor: primaryColor },
                  ]}
                >
                  <Feather name="check" size={18} color={colors.white} />
                </View>
              )}
            </View>
            {children}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

LocationOptionCard.displayName = 'LocationOptionCard';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LocationScreen: React.FC<LocationScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const {
    isLandscape,
    isTablet,
    moderateScale,
    getScreenMargin,
    hp,
    wp,
  } = useResponsive();

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const saveButtonAnim = useRef(new Animated.Value(0)).current;

  // Check reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  // Entrance animation
  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [reduceMotion, fadeAnim]);

  // Save button animation
  useEffect(() => {
    const showButton = locationEnabled || selectedCity;
    if (reduceMotion) {
      saveButtonAnim.setValue(showButton ? 1 : 0);
    } else {
      Animated.spring(saveButtonAnim, {
        toValue: showButton ? 1 : 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start();
    }
  }, [locationEnabled, selectedCity, reduceMotion, saveButtonAnim]);

  // Load discovery settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getDiscoverySettings();
        setLocationEnabled(settings.useCurrentLocation);
        if (settings.city) {
          setSelectedCity(settings.city);
        }
        if (settings.latitude && settings.longitude) {
          setCurrentCoords({
            latitude: settings.latitude,
            longitude: settings.longitude,
          });
        }
      } catch (err) {
        console.error('Failed to load location settings:', err);
      }
    };
    loadSettings();
  }, []);

  // Handlers
  const handleUseCurrentLocation = useCallback(async () => {
    if (locationEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLocationEnabled(false);
      return;
    }

    try {
      setIsLoadingLocation(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions in your device settings to use this feature.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Try to get location with balanced accuracy first (faster)
      // If that fails, try with lower accuracy
      let location;
      try {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          mayShowUserSettingsDialog: true,
        });
      } catch {
        // Fallback to lower accuracy if balanced fails
        console.log('Balanced accuracy failed, trying low accuracy...');
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          timeInterval: 15000,
        });
      }

      if (!location || !location.coords) {
        throw new Error('No location data received');
      }

      setCurrentCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLocationEnabled(true);
      setSelectedCity(null);
      setCustomLocation('');

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Failed to get location:', err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Location Unavailable',
        'Unable to get your current location. This may happen if you are indoors or have weak GPS signal.\n\nPlease try again outside or select a city manually.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  }, [locationEnabled]);

  const handleSelectCity = useCallback(async (city: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCity(city);
    setLocationEnabled(false);
    setCustomLocation('');
    setCurrentCoords(null);
  }, []);

  const handleSaveLocation = useCallback(async () => {
    try {
      setIsSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (locationEnabled && currentCoords) {
        await updateLocation(
          true,
          currentCoords.latitude,
          currentCoords.longitude,
          undefined,
          undefined
        );
      } else if (selectedCity) {
        const suggestion = LOCATION_SUGGESTIONS.find((s) => s.city === selectedCity);
        await updateLocation(
          false,
          undefined,
          undefined,
          selectedCity,
          suggestion?.region?.split(',').pop()?.trim() || 'Philippines'
        );
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onBack();
    } catch (err) {
      console.error('Failed to save location:', err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save location. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [locationEnabled, currentCoords, selectedCity, onBack]);

  // Filter suggestions
  const filteredSuggestions =
    customLocation.length > 0
      ? LOCATION_SUGGESTIONS.filter(
          (loc) =>
            loc.city.toLowerCase().includes(customLocation.toLowerCase()) ||
            loc.region.toLowerCase().includes(customLocation.toLowerCase())
        )
      : [];

  const showSaveButton = locationEnabled || selectedCity;
  const screenMargin = getScreenMargin();

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top, opacity: fadeAnim },
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.white}
        translucent={Platform.OS === 'android'}
      />

      {/* Header */}
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <TouchableOpacity
          style={[styles.backButton, isLandscape && styles.backButtonLandscape]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather
            name="arrow-left"
            size={isLandscape ? 20 : 24}
            color={colors.gray[600]}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <LinearGradient
            colors={colors.gradient.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.headerIcon,
              { width: isLandscape ? 40 : 48, height: isLandscape ? 40 : 48 },
            ]}
          >
            <Feather
              name="map-pin"
              size={isLandscape ? 18 : 22}
              color={colors.white}
            />
          </LinearGradient>
          <Text style={[styles.headerTitle, isLandscape && styles.headerTitleLandscape]}>
            Location
          </Text>
        </View>
        <View style={[styles.backButton, { opacity: 0 }]} />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: screenMargin,
              paddingBottom: insets.bottom + (showSaveButton ? 120 : 40),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Description */}
          <Text style={[styles.description, isLandscape && styles.descriptionLandscape]}>
            Help us find matches near you
          </Text>

          {/* Use Current Location Option */}
          <LocationOptionCard
            title="Use Current Location"
            subtitle={
              isLoadingLocation
                ? 'Getting your location...'
                : locationEnabled
                ? 'Location enabled'
                : 'Automatically detect your location'
            }
            isSelected={locationEnabled}
            variant="gps"
            onPress={handleUseCurrentLocation}
            reduceMotion={reduceMotion}
            moderateScale={moderateScale}
            isLandscape={isLandscape}
          >
            {isLoadingLocation && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.orange[500]} />
              </View>
            )}
          </LocationOptionCard>

          {/* Manual Location Option */}
          <View style={styles.manualLocationSection}>
            <Text style={[styles.sectionTitle, isLandscape && styles.sectionTitleLandscape]}>
              Or choose a city
            </Text>

            {/* Search Input */}
            <View
              style={[
                styles.searchContainer,
                isSearchFocused && styles.searchContainerFocused,
              ]}
            >
              <Feather
                name="search"
                size={20}
                color={isSearchFocused ? colors.teal[500] : colors.gray[400]}
              />
              <TextInput
                style={[styles.searchInput, isLandscape && styles.searchInputLandscape]}
                placeholder="Search city or province..."
                placeholderTextColor={colors.gray[400]}
                value={customLocation}
                onChangeText={setCustomLocation}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {customLocation.length > 0 && (
                <TouchableOpacity
                  onPress={() => setCustomLocation('')}
                  style={styles.clearButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x-circle" size={20} color={colors.gray[400]} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Suggestions */}
            {filteredSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {filteredSuggestions.map((location, index) => {
                  const isSelected = selectedCity === location.city;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.suggestionItem,
                        isSelected && styles.suggestionItemSelected,
                      ]}
                      onPress={() => handleSelectCity(location.city)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.suggestionIconContainer}>
                        <Feather
                          name="map-pin"
                          size={18}
                          color={isSelected ? colors.teal[500] : colors.gray[400]}
                        />
                      </View>
                      <View style={styles.suggestionText}>
                        <Text
                          style={[
                            styles.suggestionCity,
                            isSelected && styles.suggestionCitySelected,
                          ]}
                        >
                          {location.city}
                        </Text>
                        <Text
                          style={[
                            styles.suggestionRegion,
                            isSelected && styles.suggestionRegionSelected,
                          ]}
                        >
                          {location.region}
                        </Text>
                      </View>
                      {isSelected && (
                        <Feather name="check-circle" size={22} color={colors.teal[500]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* No Results */}
            {customLocation.length > 0 && filteredSuggestions.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Feather name="map" size={32} color={colors.gray[300]} />
                <Text style={styles.noResultsText}>
                  No cities found for "{customLocation}"
                </Text>
              </View>
            )}

            {/* Selected City Badge */}
            {selectedCity && customLocation.length === 0 && (
              <View style={styles.selectedCityBadge}>
                <LinearGradient
                  colors={colors.gradient.likeButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.selectedCityBadgeGradient}
                >
                  <Feather name="check-circle" size={20} color={colors.white} />
                  <Text style={styles.selectedCityText}>
                    {selectedCity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCity(null);
                    }}
                    style={styles.selectedCityRemove}
                  >
                    <Feather name="x" size={18} color={colors.white} />
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Privacy Info Card */}
          <View style={styles.infoCard}>
            <LinearGradient
              colors={[colors.teal[50], 'rgba(20, 184, 166, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoCardGradient}
            >
              <View style={styles.infoCardHeader}>
                <View style={styles.infoCardIconContainer}>
                  <Feather name="shield" size={22} color={colors.teal[600]} />
                </View>
                <Text style={styles.infoCardTitle}>Your Privacy is Protected</Text>
              </View>
              <Text style={styles.infoCardDescription}>
                Your exact location is{' '}
                <Text style={styles.infoCardBold}>never shared</Text> with other
                users. They only see approximate distances like "5 km away".
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <Animated.View
        style={[
          styles.saveButtonContainer,
          {
            paddingBottom: insets.bottom + spacing.m,
            transform: [
              {
                translateY: saveButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: saveButtonAnim,
          },
        ]}
        pointerEvents={showSaveButton ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveLocation}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          <LinearGradient
            colors={colors.gradient.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather name="check" size={22} color={colors.white} />
                <Text style={styles.saveButtonText}>Save Location</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  keyboardAvoid: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    ...shadows.small,
  },
  headerLandscape: {
    paddingVertical: spacing.xs,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonLandscape: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  headerIcon: {
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.gray[900],
  },
  headerTitleLandscape: {
    fontSize: 22,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.m,
  },

  // Description
  description: {
    fontSize: 18,
    color: colors.gray[600],
    marginBottom: spacing.l,
    lineHeight: 26,
  },
  descriptionLandscape: {
    fontSize: 16,
    marginBottom: spacing.m,
  },

  // Option Card
  optionCard: {
    borderWidth: 2,
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.small,
  },
  optionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  optionCardText: {
    flex: 1,
  },
  optionCardTitle: {
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  optionCardSubtitle: {
    color: colors.gray[500],
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  loadingContainer: {
    marginTop: spacing.s,
    alignItems: 'center',
  },

  // Illustration
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerGlow: {
    position: 'absolute',
  },
  illustrationBackground: {
    position: 'absolute',
  },
  rotatingRing: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  decorativeDot: {
    position: 'absolute',
    borderRadius: 999,
  },
  illustrationIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },

  // Manual Location Section
  manualLocationSection: {
    marginTop: spacing.s,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: spacing.m,
  },
  sectionTitleLandscape: {
    fontSize: 16,
    marginBottom: spacing.s,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.large,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.m,
    gap: spacing.s,
    ...shadows.small,
  },
  searchContainerFocused: {
    borderColor: colors.teal[500],
    backgroundColor: colors.teal[50],
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: colors.gray[900],
    paddingVertical: spacing.m,
    minHeight: 60,
  },
  searchInputLandscape: {
    fontSize: 16,
    paddingVertical: spacing.s,
    minHeight: 52,
  },
  clearButton: {
    padding: spacing.xs,
  },

  // Suggestions
  suggestionsContainer: {
    marginTop: spacing.s,
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...shadows.small,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    gap: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  suggestionItemSelected: {
    backgroundColor: colors.teal[50],
  },
  suggestionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionCity: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray[900],
  },
  suggestionCitySelected: {
    color: colors.teal[700],
  },
  suggestionRegion: {
    fontSize: 15,
    color: colors.gray[500],
    marginTop: 2,
  },
  suggestionRegionSelected: {
    color: colors.teal[600],
  },

  // No Results
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.s,
  },
  noResultsText: {
    fontSize: 16,
    color: colors.gray[500],
    textAlign: 'center',
  },

  // Selected City Badge
  selectedCityBadge: {
    marginTop: spacing.m,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...shadows.small,
  },
  selectedCityBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    gap: spacing.s,
  },
  selectedCityText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  selectedCityRemove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info Card
  infoCard: {
    marginTop: spacing.xl,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...shadows.small,
  },
  infoCardGradient: {
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.teal[200],
    borderRadius: borderRadius.large,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  infoCardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.teal[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.teal[700],
    flex: 1,
  },
  infoCardDescription: {
    fontSize: 16,
    color: colors.teal[700],
    lineHeight: 24,
  },
  infoCardBold: {
    fontWeight: '700',
    color: colors.teal[800],
  },

  // Save Button
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    backgroundColor: colors.gray[50],
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  saveButton: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...shadows.large,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    paddingVertical: spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },
  saveButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
});

export default LocationScreen;
