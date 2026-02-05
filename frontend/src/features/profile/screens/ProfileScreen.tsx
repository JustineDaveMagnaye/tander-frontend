/**
 * TANDER Profile Screen - iOS Settings Style
 * Redesigned to match SettingsScreen for visual consistency
 *
 * Design: Flat iOS System Settings grouped lists
 * - No shadows, flat design
 * - SectionHeader → Card → SettingsRow pattern
 * - Senior-friendly touch targets (56px minimum)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Pressable,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import { useAuthStore } from '@/store/authStore';
import { useStoryCommentsStore, selectReceivedComments, selectUnreadCount } from '@/store/storyCommentsStore';
import { StoryComment } from '@shared/types';
import { SettingsScreen } from './SettingsScreen';
import { InterestsModal } from '../components/InterestsModal';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  uploadAdditionalPhotos,
  deletePhoto,
  deleteProfilePhoto,
} from '@/services/api/profileApi';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// =============================================================================
// iOS DESIGN SYSTEM - Flat, No Shadows
// =============================================================================

const iOS = {
  colors: {
    // Backgrounds
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',

    // Labels
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C4399',
    quaternaryLabel: '#3C3C432E',

    // Separators
    separator: '#3C3C4336',
    opaqueSeparator: '#C6C6C8',

    // System Colors
    systemBlue: '#007AFF',
    systemGreen: '#34C759',
    systemOrange: '#FF9500',
    systemRed: '#FF3B30',
    systemTeal: '#5AC8FA',
    systemPink: '#FF2D55',
    systemPurple: '#AF52DE',
    systemYellow: '#FFCC00',
    systemGray: '#8E8E93',
    systemGray6: '#F2F2F7',

    // Brand
    tander: {
      orange: '#F97316',
      orangeLight: '#FFF7ED',
      teal: '#14B8A6',
      tealLight: '#F0FDFA',
    },
  },

  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24,
    section: 35,
  },

  radius: {
    small: 8,
    medium: 10,
    large: 12,
    xlarge: 16,
    round: 9999,
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
    caption1: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
    caption2: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },
  },
};

// =============================================================================
// TYPES
// =============================================================================

interface ProfileData {
  name: string;
  age: string;
  location: string;
  bio: string;
  photos: string[];
  interests: string[];
  gender: string;
  lookingFor: string;
  job: string;
  education: string;
  height: string;
  religion: string;
  children: string;
  languages: string[];
  maritalStatus: string;
}

interface ProfileScreenProps {
  onNavigateToSettings?: () => void;
  onNavigateToStoryAdmirers?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const INITIAL_PROFILE: ProfileData = {
  name: '',
  age: '',
  location: '',
  bio: '',
  photos: [],
  interests: [],
  gender: '',
  lookingFor: '',
  job: '',
  education: '',
  height: '',
  religion: '',
  children: '',
  languages: [],
  maritalStatus: '',
};

const PHILIPPINES_LOCATIONS = [
  'Metro Manila', 'Cebu City', 'Davao City', 'Quezon City',
  'Makati', 'Pasig', 'Taguig', 'Baguio', 'Iloilo City',
  'Bacolod', 'Cagayan de Oro', 'Zamboanga City',
];

const INTERESTS_LIST = [
  'Reading', 'Travel', 'Cooking', 'Music', 'Gardening', 'Walking',
  'Dancing', 'Art', 'Movies', 'Photography', 'Yoga', 'Swimming',
  'Theater', 'Golf', 'Tennis', 'Fishing', 'Board Games', 'Cards',
  'Volunteering', 'Bird Watching', 'Crafts', 'Baking', 'Karaoke',
  'Church Activities', 'Mahjong', 'Sewing', 'Crossword Puzzles',
];

const LOOKING_FOR_OPTIONS = ['Men', 'Women', 'Both'];
const RELIGION_OPTIONS = [
  'Catholic', 'Christian', 'Iglesia ni Cristo', 'Islam',
  'Buddhist', 'Other', 'Prefer not to say',
];
const MARITAL_STATUS_OPTIONS = [
  'Single (never married)',
  'Married',
  'Widowed',
  'Separated',
  'Annulled',
  'Divorced',
  'Prefer not to say',
];
const LANGUAGE_OPTIONS = [
  'Tagalog', 'English', 'Cebuano', 'Ilocano', 'Bisaya',
  'Hiligaynon', 'Bicolano', 'Waray', 'Kapampangan', 'Pangasinan',
];

// =============================================================================
// iOS STYLE COMPONENTS
// =============================================================================

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = React.memo(({ title, subtitle }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
    {subtitle && <Text style={styles.sectionHeaderSubtext}>{subtitle}</Text>}
  </View>
));

SectionHeader.displayName = 'SectionHeader';

const SectionFooter: React.FC<{ text: string }> = React.memo(({ text }) => (
  <View style={styles.sectionFooter}>
    <Text style={styles.sectionFooterText}>{text}</Text>
  </View>
));

SectionFooter.displayName = 'SectionFooter';

const Card: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => (
  <View style={styles.card}>{children}</View>
));

Card.displayName = 'Card';

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  value?: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = React.memo(({
  icon,
  iconColor,
  iconBgColor,
  title,
  value,
  onPress,
  isFirst = false,
  isLast = false,
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
        pressed && styles.rowPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${title}${value ? `, ${value}` : ''}`}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBgColor }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={[styles.rowContent, !isLast && styles.rowContentBorder]}>
        <Text style={styles.rowTitle}>{title}</Text>
        <View style={styles.rowRight}>
          {value && <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>}
          <Feather name="chevron-right" size={20} color={iOS.colors.tertiaryLabel} />
        </View>
      </View>
    </Pressable>
  );
});

SettingsRow.displayName = 'SettingsRow';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigateToSettings,
  onNavigateToStoryAdmirers,
}) => {
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape } = useResponsive();
  const navigation = useNavigation<any>();
  const logout = useAuthStore((state) => state.logout);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Screen state
  const [showSettings, setShowSettings] = useState(false);

  // Profile data
  const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE);

  // Modal states
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showBasicModal, setShowBasicModal] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editGender, setEditGender] = useState('');
  const [editLookingFor, setEditLookingFor] = useState('');
  const [editJob, setEditJob] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editReligion, setEditReligion] = useState('');
  const [editChildren, setEditChildren] = useState('');
  const [editLanguages, setEditLanguages] = useState<string[]>([]);
  const [editMaritalStatus, setEditMaritalStatus] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    photoIndex: number;
    isMainPhoto: boolean;
  }>({ visible: false, photoIndex: -1, isMainPhoto: false });

  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Story comments
  const storyComments = useStoryCommentsStore(selectReceivedComments);
  const unreadCommentCount = useStoryCommentsStore(selectUnreadCount);
  const { markAsRead, likeBack, declineComment, fetchReceivedComments } = useStoryCommentsStore();

  // Reset to profile when tab is focused
  useFocusEffect(
    useCallback(() => {
      setShowSettings(false);
    }, [])
  );

  // Handle Android back button
  useEffect(() => {
    if (!showSettings) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowSettings(false);
      return true;
    });
    return () => backHandler.remove();
  }, [showSettings]);

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const calculateProfileCompletion = useCallback((): number => {
    let score = 0;
    if (profile.name) score += 10;
    if (profile.age && parseInt(profile.age) >= 50) score += 10;
    if (profile.location) score += 10;
    if (profile.bio && profile.bio.length > 50) score += 15;
    if (profile.photos.length >= 1) score += 15;
    if (profile.photos.length >= 3) score += 10;
    if (profile.interests.length >= 3) score += 15;
    if (profile.gender) score += 10;
    if (profile.lookingFor) score += 5;
    return Math.min(score, 100);
  }, [profile]);

  const profileCompletion = calculateProfileCompletion();

  // =============================================================================
  // API HANDLERS
  // =============================================================================

  useEffect(() => {
    loadProfile();
    fetchReceivedComments();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await getProfile();

      let lookingForDisplay = '';
      if (data.interestedIn) {
        try {
          const arr = JSON.parse(data.interestedIn);
          if (arr.includes('male') && arr.includes('female')) lookingForDisplay = 'Both';
          else if (arr.includes('male')) lookingForDisplay = 'Men';
          else if (arr.includes('female')) lookingForDisplay = 'Women';
        } catch { /* ignore */ }
      }

      let languagesArray: string[] = [];
      if (data.languages) {
        try { languagesArray = JSON.parse(data.languages); } catch { /* ignore */ }
      }

      const photosArray: string[] = [];
      if (data.profilePhotoUrl) photosArray.push(data.profilePhotoUrl);
      if (data.additionalPhotos) photosArray.push(...(data.additionalPhotos as string[]));

      setProfile({
        name: data.firstName || '',
        age: data.age?.toString() || '',
        location: data.city ? `${data.city}${data.country ? `, ${data.country}` : ''}` : '',
        bio: data.bio || '',
        photos: photosArray,
        interests: typeof data.interests === 'string' ? JSON.parse(data.interests || '[]') : (data.interests || []),
        gender: data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1) : '',
        lookingFor: lookingForDisplay,
        job: data.hobby || '',
        education: '',
        height: '',
        religion: data.religion || '',
        children: data.numberOfChildren?.toString() || '',
        languages: languagesArray,
        maritalStatus: data.maritalStatus || '',
      });

      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } catch (error) {
      console.warn('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Basic Info
  const openBasicInfoEditor = useCallback(() => {
    setEditName(profile.name);
    setEditAge(profile.age || '60');
    setEditLocation(profile.location);
    setShowBasicModal(true);
  }, [profile]);

  const saveBasicInfo = useCallback(async () => {
    if (!editName.trim()) return;
    const ageNumber = parseInt(editAge, 10);
    if (isNaN(ageNumber) || ageNumber < 50 || ageNumber > 120) return;

    try {
      setIsSaving(true);
      const locationParts = editLocation.split(',').map((s) => s.trim());
      await updateProfile({
        firstName: editName.trim(),
        age: ageNumber,
        city: locationParts[0] || '',
        country: locationParts[1] || '',
      });
      setProfile((prev) => ({ ...prev, name: editName.trim(), age: editAge, location: editLocation }));
      setShowBasicModal(false);
    } catch (error) {
      console.warn('Failed to save basic info:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editName, editAge, editLocation]);

  // Bio
  const openBioEditor = useCallback(() => {
    setEditBio(profile.bio);
    setShowBioModal(true);
  }, [profile.bio]);

  const saveBio = useCallback(async () => {
    try {
      setIsSaving(true);
      await updateProfile({ bio: editBio });
      setProfile((prev) => ({ ...prev, bio: editBio }));
      setShowBioModal(false);
    } catch (error) {
      console.warn('Failed to save bio:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editBio]);

  // Interests
  const openInterestsEditor = useCallback(() => {
    setEditInterests([...profile.interests]);
    setShowInterestsModal(true);
  }, [profile.interests]);

  const toggleInterest = useCallback((interest: string) => {
    setEditInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  }, []);

  const saveInterests = useCallback(async () => {
    if (editInterests.length < 3) return;
    try {
      setIsSaving(true);
      await updateProfile({ interests: JSON.stringify(editInterests) });
      setProfile((prev) => ({ ...prev, interests: editInterests }));
      setShowInterestsModal(false);
    } catch (error) {
      console.warn('Failed to save interests:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editInterests]);

  // Preferences
  const openPreferencesEditor = useCallback(() => {
    setEditGender(profile.gender);
    setEditLookingFor(profile.lookingFor);
    setShowPreferencesModal(true);
  }, [profile]);

  const savePreferences = useCallback(async () => {
    if (!editGender) return;
    try {
      setIsSaving(true);
      let interestedInJson = '["male"]';
      if (editLookingFor === 'Women') interestedInJson = '["female"]';
      else if (editLookingFor === 'Both') interestedInJson = '["male","female"]';
      await updateProfile({
        gender: editGender.toLowerCase() as 'male' | 'female',
        interestedIn: interestedInJson,
      });
      setProfile((prev) => ({ ...prev, gender: editGender, lookingFor: editLookingFor }));
      setShowPreferencesModal(false);
    } catch (error) {
      console.warn('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editGender, editLookingFor]);

  // Details
  const openDetailsEditor = useCallback(() => {
    setEditJob(profile.job);
    setEditEducation(profile.education);
    setEditHeight(profile.height);
    setEditReligion(profile.religion);
    setEditChildren(profile.children);
    setEditLanguages([...profile.languages]);
    setEditMaritalStatus(profile.maritalStatus);
    setShowDetailsModal(true);
  }, [profile]);

  const toggleLanguage = useCallback((language: string) => {
    setEditLanguages((prev) =>
      prev.includes(language) ? prev.filter((l) => l !== language) : [...prev, language]
    );
  }, []);

  const saveDetails = useCallback(async () => {
    try {
      setIsSaving(true);
      await updateProfile({
        hobby: editJob,
        education: editEducation,
        height: editHeight,
        religion: editReligion || undefined,
        numberOfChildren: editChildren ? parseInt(editChildren, 10) : undefined,
        languages: editLanguages.length > 0 ? JSON.stringify(editLanguages) : undefined,
        maritalStatus: editMaritalStatus || undefined,
      });
      setProfile((prev) => ({
        ...prev,
        job: editJob,
        education: editEducation,
        height: editHeight,
        religion: editReligion,
        children: editChildren,
        languages: editLanguages,
        maritalStatus: editMaritalStatus,
      }));
      setShowDetailsModal(false);
    } catch (error) {
      console.warn('Failed to save details:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editJob, editEducation, editHeight, editReligion, editChildren, editLanguages, editMaritalStatus]);

  // Photos
  const addPhoto = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const imageUri = result.assets[0].uri;
      setIsSaving(true);

      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      const fileName = `photo-${Date.now()}.${fileExtension}`;
      const imageFile = { uri: imageUri, type: mimeType, name: fileName };

      if (profile.photos.length === 0) {
        const uploadResult = await uploadProfilePhoto(imageFile);
        setProfile((prev) => ({ ...prev, photos: [uploadResult.profilePhotoUrl] }));
      } else {
        const uploadResult = await uploadAdditionalPhotos([imageFile]);
        if (uploadResult.additionalPhotoUrls?.[0]) {
          setProfile((prev) => ({ ...prev, photos: [...prev.photos, uploadResult.additionalPhotoUrls[0]] }));
        }
      }
    } catch (error) {
      console.warn('Failed to upload photo:', error);
    } finally {
      setIsSaving(false);
    }
  }, [profile.photos.length]);

  const handleDeletePhoto = useCallback((index: number) => {
    setDeleteConfirm({ visible: true, photoIndex: index, isMainPhoto: index === 0 });
  }, []);

  const confirmDeletePhoto = useCallback(async () => {
    const { photoIndex, isMainPhoto } = deleteConfirm;
    setDeleteConfirm({ visible: false, photoIndex: -1, isMainPhoto: false });

    try {
      setIsSaving(true);
      if (isMainPhoto) await deleteProfilePhoto();
      else await deletePhoto(photoIndex - 1);
      setProfile((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== photoIndex) }));
    } catch (error) {
      console.warn('Failed to delete photo:', error);
    } finally {
      setIsSaving(false);
    }
  }, [deleteConfirm]);

  // Logout confirmation handler
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.warn('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }, [logout]);

  // =============================================================================
  // RENDER: SETTINGS SCREEN
  // =============================================================================

  if (showSettings) {
    return (
      <SettingsScreen
        onBack={() => setShowSettings(false)}
        onLogout={() => {
          setShowSettings(false);
          setShowLogoutConfirm(true);
        }}
      />
    );
  }

  // =============================================================================
  // RENDER: LOADING STATE
  // =============================================================================

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={iOS.colors.secondarySystemBackground} />
        <ActivityIndicator size="large" color={iOS.colors.systemGray} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // =============================================================================
  // RENDER: MAIN CONTENT
  // =============================================================================

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={iOS.colors.secondarySystemBackground} />

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== MY PROFILE SECTION ===== */}
        <SectionHeader title="My Profile" />
        <Card>
          <Pressable
            style={({ pressed }) => [styles.profileHeader, pressed && styles.rowPressed]}
            onPress={openBasicInfoEditor}
          >
            {/* Photo */}
            <View style={styles.profilePhotoContainer}>
              {profile.photos[0] ? (
                <Image source={{ uri: profile.photos[0] }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <Feather name="user" size={32} color={iOS.colors.tertiaryLabel} />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile.name || 'Add your name'}{profile.age ? `, ${profile.age}` : ''}
              </Text>
              <View style={styles.profileLocationRow}>
                <Feather name="map-pin" size={12} color={iOS.colors.tertiaryLabel} />
                <Text style={styles.profileLocation}>{profile.location || 'Add location'}</Text>
              </View>
            </View>

            <Feather name="chevron-right" size={20} color={iOS.colors.tertiaryLabel} />
          </Pressable>
        </Card>

        {/* ===== PHOTOS SECTION ===== */}
        <SectionHeader title="Photos" />
        <Card>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosCarousel}
          >
            {profile.photos.map((photo, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [styles.photoThumbnail, pressed && { opacity: 0.8 }]}
                onPress={() => {
                  setCurrentPhotoIndex(index);
                  setShowPhotoGallery(true);
                }}
              >
                <Image source={{ uri: photo }} style={styles.photoImage} />
                {index === 0 && (
                  <View style={styles.mainPhotoBadge}>
                    <Feather name="star" size={10} color="#fff" />
                  </View>
                )}
              </Pressable>
            ))}
            {profile.photos.length < 6 && (
              <Pressable
                style={({ pressed }) => [styles.addPhotoButton, pressed && { opacity: 0.8 }]}
                onPress={addPhoto}
              >
                <Feather name="plus" size={24} color={iOS.colors.tander.orange} />
                <Text style={styles.addPhotoText}>Add</Text>
              </Pressable>
            )}
          </ScrollView>
        </Card>
        <SectionFooter text="Add up to 6 photos. Your first photo is your main profile photo." />

        {/* ===== ABOUT ME SECTION ===== */}
        <SectionHeader title="About Me" />
        <Card>
          <SettingsRow
            icon="edit-3"
            iconColor="#fff"
            iconBgColor={iOS.colors.tander.teal}
            title="My Story"
            value={profile.bio ? 'Edit' : 'Add your story'}
            onPress={openBioEditor}
            isFirst
          />
          <SettingsRow
            icon="heart"
            iconColor="#fff"
            iconBgColor={iOS.colors.systemPink}
            title="Interests"
            value={profile.interests.length > 0 ? `${profile.interests.length} selected` : 'Add interests'}
            onPress={openInterestsEditor}
            isLast
          />
        </Card>

        {/* ===== PERSONAL DETAILS SECTION ===== */}
        <SectionHeader title="Personal Details" />
        <Card>
          <SettingsRow
            icon="user"
            iconColor="#fff"
            iconBgColor={iOS.colors.systemBlue}
            title="Gender"
            value={profile.gender || 'Not set'}
            onPress={openPreferencesEditor}
            isFirst
          />
          <SettingsRow
            icon="briefcase"
            iconColor="#fff"
            iconBgColor={iOS.colors.systemOrange}
            title="Occupation"
            value={profile.job || 'Not set'}
            onPress={openDetailsEditor}
          />
          <SettingsRow
            icon="book-open"
            iconColor="#fff"
            iconBgColor={iOS.colors.systemYellow}
            title="Religion"
            value={profile.religion || 'Not set'}
            onPress={openDetailsEditor}
          />
          <SettingsRow
            icon="heart"
            iconColor="#fff"
            iconBgColor={iOS.colors.systemPink}
            title="Marital Status"
            value={profile.maritalStatus || 'Not set'}
            onPress={openDetailsEditor}
          />
          <SettingsRow
            icon="users"
            iconColor="#fff"
            iconBgColor={iOS.colors.systemTeal}
            title="Children"
            value={profile.children ? `${profile.children} children` : 'Not set'}
            onPress={openDetailsEditor}
          />
          <SettingsRow
            icon="globe"
            iconColor="#fff"
            iconBgColor={iOS.colors.systemPurple}
            title="Languages"
            value={profile.languages.length > 0 ? profile.languages.join(', ') : 'Not set'}
            onPress={openDetailsEditor}
            isLast
          />
        </Card>

        {/* ===== LOOKING FOR SECTION ===== */}
        <SectionHeader title="Looking For" />
        <Card>
          <SettingsRow
            icon="heart"
            iconColor="#fff"
            iconBgColor={iOS.colors.systemPink}
            title="Interested In"
            value={profile.lookingFor || 'Not set'}
            onPress={openPreferencesEditor}
            isFirst
            isLast
          />
        </Card>

        {/* ===== PROFILE STRENGTH SECTION ===== */}
        <SectionHeader title="Profile Strength" />
        <Card>
          <View style={styles.strengthCard}>
            <View style={styles.strengthHeader}>
              <Text style={styles.strengthLabel}>Completion</Text>
              <Text style={styles.strengthPercent}>{profileCompletion}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${profileCompletion}%` }]} />
            </View>
            <Text style={styles.strengthMessage}>
              {profileCompletion >= 100
                ? 'Your profile is complete!'
                : 'Complete your profile for more matches'}
            </Text>
            {profileCompletion < 100 && (
              <View style={styles.tipsList}>
                {!profile.bio && (
                  <Pressable style={styles.tipRow} onPress={openBioEditor}>
                    <Feather name="edit-3" size={16} color={iOS.colors.tander.teal} />
                    <Text style={styles.tipText}>Add your story</Text>
                  </Pressable>
                )}
                {profile.photos.length < 3 && (
                  <Pressable style={styles.tipRow} onPress={addPhoto}>
                    <Feather name="camera" size={16} color={iOS.colors.tander.orange} />
                    <Text style={styles.tipText}>Add more photos</Text>
                  </Pressable>
                )}
                {profile.interests.length < 3 && (
                  <Pressable style={styles.tipRow} onPress={openInterestsEditor}>
                    <Feather name="heart" size={16} color={iOS.colors.systemPink} />
                    <Text style={styles.tipText}>Add interests</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </Card>

        {/* ===== STORY RESPONSES SECTION ===== */}
        {storyComments.length > 0 && (
          <>
            <SectionHeader title="Story Responses" />
            <Card>
              <View style={styles.responsesContainer}>
                <View style={styles.responsesHeader}>
                  <Text style={styles.responsesTitle}>
                    {storyComments.length} {storyComments.length === 1 ? 'person' : 'people'} responded
                  </Text>
                  {unreadCommentCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCommentCount} new</Text>
                    </View>
                  )}
                </View>
                {onNavigateToStoryAdmirers && (
                  <Pressable style={styles.viewAllButton} onPress={onNavigateToStoryAdmirers}>
                    <Text style={styles.viewAllText}>View All</Text>
                    <Feather name="chevron-right" size={18} color={iOS.colors.tander.orange} />
                  </Pressable>
                )}
              </View>
            </Card>
          </>
        )}

        {/* ===== SETTINGS ROW ===== */}
        <SectionHeader title="Settings" />
        <Card>
          <SettingsRow
            icon="settings"
            iconColor="#fff"
            iconBgColor={iOS.colors.systemGray}
            title="Settings"
            onPress={() => setShowSettings(true)}
            isFirst
            isLast
          />
        </Card>

        {/* ===== LOGOUT ===== */}
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}
          onPress={() => setShowLogoutConfirm(true)}
        >
          <Feather name="log-out" size={18} color={iOS.colors.systemRed} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        {/* Bottom spacer: insets.bottom (home indicator) + tab bar height (~60px) + extra padding */}
        <View style={{ height: insets.bottom + 120 }} />
      </Animated.ScrollView>

      {/* ===== MODALS ===== */}

      {/* Photo Gallery Modal */}
      <Modal visible={showPhotoGallery} animationType="slide" onRequestClose={() => setShowPhotoGallery(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowPhotoGallery(false)} style={styles.modalBackButton}>
              <Feather name="x" size={24} color={iOS.colors.label} />
            </Pressable>
            <Text style={styles.modalTitle}>My Photos</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.photoGridContainer}>
            <View style={styles.photoGrid}>
              {profile.photos.map((photo, index) => (
                <View key={index} style={styles.photoGridItem}>
                  <Image source={{ uri: photo }} style={styles.photoGridImage} />
                  {index === 0 && (
                    <View style={styles.mainBadgeLarge}>
                      <Text style={styles.mainBadgeText}>Main</Text>
                    </View>
                  )}
                  <Pressable
                    style={styles.deletePhotoButton}
                    onPress={() => handleDeletePhoto(index)}
                  >
                    <Feather name="trash-2" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {profile.photos.length < 6 && (
                <Pressable style={styles.addPhotoLarge} onPress={addPhoto}>
                  <Feather name="plus" size={32} color={iOS.colors.tander.orange} />
                  <Text style={styles.addPhotoLargeText}>Add Photo</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete Photo Confirmation */}
      <Modal visible={deleteConfirm.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete Photo?</Text>
            <Text style={styles.confirmMessage}>
              {deleteConfirm.isMainPhoto
                ? 'This is your main profile photo. Are you sure you want to delete it?'
                : 'Are you sure you want to delete this photo?'}
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => setDeleteConfirm({ visible: false, photoIndex: -1, isMainPhoto: false })}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmDeleteButton} onPress={confirmDeletePhoto}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.logoutIconContainer}>
              <Feather name="log-out" size={32} color={iOS.colors.systemRed} />
            </View>
            <Text style={styles.confirmTitle}>Log Out?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to log out of your account?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmDeleteButton, isLoggingOut && { opacity: 0.7 }]}
                onPress={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Log Out</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Basic Info Modal */}
      <Modal visible={showBasicModal} animationType="slide" onRequestClose={() => setShowBasicModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { paddingTop: insets.top }]}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowBasicModal(false)} style={styles.modalBackButton}>
              <Feather name="x" size={24} color={iOS.colors.label} />
            </Pressable>
            <Text style={styles.modalTitle}>Basic Info</Text>
            <Pressable onPress={saveBasicInfo} disabled={isSaving} style={styles.modalSaveButton}>
              {isSaving ? (
                <ActivityIndicator size="small" color={iOS.colors.tander.orange} />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={iOS.colors.tertiaryLabel}
            />

            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.textInput}
              value={editAge}
              onChangeText={setEditAge}
              placeholder="Your age"
              placeholderTextColor={iOS.colors.tertiaryLabel}
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.textInput}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="City, Country"
              placeholderTextColor={iOS.colors.tertiaryLabel}
            />

            <Text style={styles.quickSelectLabel}>Quick Select</Text>
            <View style={styles.quickSelectGrid}>
              {PHILIPPINES_LOCATIONS.map((loc) => (
                <Pressable
                  key={loc}
                  style={[styles.quickSelectChip, editLocation.includes(loc) && styles.quickSelectChipActive]}
                  onPress={() => setEditLocation(loc)}
                >
                  <Text style={[styles.quickSelectText, editLocation.includes(loc) && styles.quickSelectTextActive]}>
                    {loc}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bio Modal */}
      <Modal visible={showBioModal} animationType="slide" onRequestClose={() => setShowBioModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { paddingTop: insets.top }]}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowBioModal(false)} style={styles.modalBackButton}>
              <Feather name="x" size={24} color={iOS.colors.label} />
            </Pressable>
            <Text style={styles.modalTitle}>My Story</Text>
            <Pressable onPress={saveBio} disabled={isSaving} style={styles.modalSaveButton}>
              {isSaving ? (
                <ActivityIndicator size="small" color={iOS.colors.tander.orange} />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.inputLabel}>Tell others about yourself</Text>
            <TextInput
              style={styles.textAreaInput}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Share what makes you unique, your hobbies, and what you're looking for..."
              placeholderTextColor={iOS.colors.tertiaryLabel}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{editBio.length} characters</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Interests Modal */}
      <InterestsModal
        visible={showInterestsModal}
        selectedInterests={editInterests}
        onToggleInterest={toggleInterest}
        onSave={saveInterests}
        onClose={() => setShowInterestsModal(false)}
        isSaving={isSaving}
      />

      {/* Preferences Modal */}
      <Modal visible={showPreferencesModal} animationType="slide" onRequestClose={() => setShowPreferencesModal(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowPreferencesModal(false)} style={styles.modalBackButton}>
              <Feather name="x" size={24} color={iOS.colors.label} />
            </Pressable>
            <Text style={styles.modalTitle}>Preferences</Text>
            <Pressable onPress={savePreferences} disabled={isSaving} style={styles.modalSaveButton}>
              {isSaving ? (
                <ActivityIndicator size="small" color={iOS.colors.tander.orange} />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.inputLabel}>I am</Text>
            <View style={styles.optionGrid}>
              {['Male', 'Female'].map((g) => (
                <Pressable
                  key={g}
                  style={[styles.optionButton, editGender === g && styles.optionButtonActive]}
                  onPress={() => setEditGender(g)}
                >
                  <Text style={[styles.optionText, editGender === g && styles.optionTextActive]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Looking for</Text>
            <View style={styles.optionGrid}>
              {LOOKING_FOR_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.optionButton, editLookingFor === opt && styles.optionButtonActive]}
                  onPress={() => setEditLookingFor(opt)}
                >
                  <Text style={[styles.optionText, editLookingFor === opt && styles.optionTextActive]}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" onRequestClose={() => setShowDetailsModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { paddingTop: insets.top }]}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowDetailsModal(false)} style={styles.modalBackButton}>
              <Feather name="x" size={24} color={iOS.colors.label} />
            </Pressable>
            <Text style={styles.modalTitle}>Personal Details</Text>
            <Pressable onPress={saveDetails} disabled={isSaving} style={styles.modalSaveButton}>
              {isSaving ? (
                <ActivityIndicator size="small" color={iOS.colors.tander.orange} />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.inputLabel}>Occupation</Text>
            <TextInput
              style={styles.textInput}
              value={editJob}
              onChangeText={setEditJob}
              placeholder="e.g., Retired Teacher"
              placeholderTextColor={iOS.colors.tertiaryLabel}
            />

            <Text style={styles.inputLabel}>Religion</Text>
            <View style={styles.quickSelectGrid}>
              {RELIGION_OPTIONS.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.quickSelectChip, editReligion === r && styles.quickSelectChipActive]}
                  onPress={() => setEditReligion(r)}
                >
                  <Text style={[styles.quickSelectText, editReligion === r && styles.quickSelectTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Marital Status</Text>
            <View style={styles.quickSelectGrid}>
              {MARITAL_STATUS_OPTIONS.map((status) => (
                <Pressable
                  key={status}
                  style={[styles.quickSelectChip, editMaritalStatus === status && styles.quickSelectChipActive]}
                  onPress={() => setEditMaritalStatus(status)}
                >
                  <Text style={[styles.quickSelectText, editMaritalStatus === status && styles.quickSelectTextActive]}>{status}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Number of Children</Text>
            <TextInput
              style={styles.textInput}
              value={editChildren}
              onChangeText={setEditChildren}
              placeholder="e.g., 2"
              placeholderTextColor={iOS.colors.tertiaryLabel}
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Languages</Text>
            <View style={styles.quickSelectGrid}>
              {LANGUAGE_OPTIONS.map((lang) => (
                <Pressable
                  key={lang}
                  style={[styles.quickSelectChip, editLanguages.includes(lang) && styles.quickSelectChipActive]}
                  onPress={() => toggleLanguage(lang)}
                >
                  <Text style={[styles.quickSelectText, editLanguages.includes(lang) && styles.quickSelectTextActive]}>
                    {lang}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Saving Indicator */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color={iOS.colors.tander.orange} />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// STYLES - Flat, No Shadows
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  scrollContent: {
    paddingHorizontal: iOS.spacing.l,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: iOS.colors.secondarySystemBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    marginTop: iOS.spacing.m,
  },

  // Section Header
  sectionHeader: {
    paddingTop: iOS.spacing.section,
    paddingBottom: iOS.spacing.s,
    paddingHorizontal: iOS.spacing.l,
  },
  sectionHeaderText: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    textTransform: 'uppercase',
  },
  sectionHeaderSubtext: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
    marginTop: 2,
  },

  // Section Footer
  sectionFooter: {
    paddingHorizontal: iOS.spacing.l,
    paddingTop: iOS.spacing.s,
    paddingBottom: iOS.spacing.xs,
  },
  sectionFooterText: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
  },

  // Card - FLAT, NO SHADOW
  card: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    overflow: 'hidden',
  },

  // Settings Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: iOS.colors.systemBackground,
    minHeight: 56,
    paddingLeft: iOS.spacing.l,
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
    backgroundColor: iOS.colors.systemGray6,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: iOS.spacing.m,
    paddingRight: iOS.spacing.l,
    marginLeft: iOS.spacing.m,
  },
  rowContentBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },
  rowTitle: {
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iOS.spacing.s,
  },
  rowValue: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
    maxWidth: 150,
  },

  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: iOS.spacing.l,
    borderRadius: iOS.radius.large,
  },
  profilePhotoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: iOS.colors.systemGray6,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: iOS.spacing.m,
  },
  profileName: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  profileLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  profileLocation: {
    ...iOS.typography.subhead,
    color: iOS.colors.tertiaryLabel,
  },

  // Photos Carousel
  photosCarousel: {
    padding: iOS.spacing.l,
    gap: iOS.spacing.m,
  },
  photoThumbnail: {
    width: 80,
    height: 100,
    borderRadius: iOS.radius.medium,
    overflow: 'hidden',
    backgroundColor: iOS.colors.systemGray6,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  mainPhotoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: iOS.colors.tander.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 80,
    height: 100,
    borderRadius: iOS.radius.medium,
    borderWidth: 2,
    borderColor: iOS.colors.tander.orange,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: iOS.colors.tander.orangeLight,
  },
  addPhotoText: {
    ...iOS.typography.caption1,
    color: iOS.colors.tander.orange,
    marginTop: 4,
  },

  // Profile Strength
  strengthCard: {
    padding: iOS.spacing.l,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: iOS.spacing.m,
  },
  strengthLabel: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  strengthPercent: {
    ...iOS.typography.title3,
    color: iOS.colors.tander.orange,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: iOS.colors.systemGray6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: iOS.colors.tander.orange,
    borderRadius: 4,
  },
  strengthMessage: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    marginTop: iOS.spacing.m,
  },
  tipsList: {
    marginTop: iOS.spacing.l,
    gap: iOS.spacing.s,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iOS.spacing.s,
    paddingVertical: iOS.spacing.s,
  },
  tipText: {
    ...iOS.typography.subhead,
    color: iOS.colors.label,
  },

  // Story Responses
  responsesContainer: {
    padding: iOS.spacing.l,
  },
  responsesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iOS.spacing.s,
  },
  responsesTitle: {
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  unreadBadge: {
    backgroundColor: iOS.colors.systemPink,
    paddingHorizontal: iOS.spacing.s,
    paddingVertical: 2,
    borderRadius: iOS.radius.small,
  },
  unreadBadgeText: {
    ...iOS.typography.caption2,
    color: '#fff',
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: iOS.spacing.m,
  },
  viewAllText: {
    ...iOS.typography.body,
    color: iOS.colors.tander.orange,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: iOS.colors.systemBackground,
    marginTop: iOS.spacing.section,
    marginHorizontal: iOS.spacing.l,
    padding: iOS.spacing.l,
    borderRadius: iOS.radius.large,
    gap: iOS.spacing.s,
  },
  logoutText: {
    ...iOS.typography.body,
    color: iOS.colors.systemRed,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.systemBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },
  modalBackButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  modalSaveButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveText: {
    ...iOS.typography.body,
    color: iOS.colors.tander.orange,
  },
  modalContent: {
    padding: iOS.spacing.xl,
  },

  // Inputs
  inputLabel: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    marginBottom: iOS.spacing.s,
    marginTop: iOS.spacing.l,
  },
  textInput: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.medium,
    padding: iOS.spacing.l,
    ...iOS.typography.body,
    color: iOS.colors.label,
    minHeight: 56,
  },
  textAreaInput: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.medium,
    padding: iOS.spacing.l,
    ...iOS.typography.body,
    color: iOS.colors.label,
    minHeight: 150,
  },
  charCount: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
    textAlign: 'right',
    marginTop: iOS.spacing.s,
  },

  // Quick Select
  quickSelectLabel: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    marginTop: iOS.spacing.xl,
    marginBottom: iOS.spacing.m,
  },
  quickSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: iOS.spacing.s,
  },
  quickSelectChip: {
    backgroundColor: iOS.colors.systemBackground,
    paddingHorizontal: iOS.spacing.m,
    paddingVertical: iOS.spacing.s,
    borderRadius: iOS.radius.small,
    borderWidth: 1,
    borderColor: iOS.colors.separator,
  },
  quickSelectChipActive: {
    backgroundColor: iOS.colors.tander.orangeLight,
    borderColor: iOS.colors.tander.orange,
  },
  quickSelectText: {
    ...iOS.typography.subhead,
    color: iOS.colors.label,
  },
  quickSelectTextActive: {
    color: iOS.colors.tander.orange,
  },

  // Option Grid
  optionGrid: {
    flexDirection: 'row',
    gap: iOS.spacing.m,
  },
  optionButton: {
    flex: 1,
    backgroundColor: iOS.colors.systemBackground,
    paddingVertical: iOS.spacing.l,
    borderRadius: iOS.radius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: iOS.colors.separator,
  },
  optionButtonActive: {
    backgroundColor: iOS.colors.tander.orangeLight,
    borderColor: iOS.colors.tander.orange,
  },
  optionText: {
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  optionTextActive: {
    color: iOS.colors.tander.orange,
    fontWeight: '600',
  },

  // Photo Gallery Modal
  photoGridContainer: {
    padding: iOS.spacing.l,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: iOS.spacing.m,
  },
  photoGridItem: {
    width: '30%',
    aspectRatio: 3 / 4,
    borderRadius: iOS.radius.medium,
    overflow: 'hidden',
    backgroundColor: iOS.colors.systemGray6,
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
  },
  mainBadgeLarge: {
    position: 'absolute',
    top: iOS.spacing.s,
    left: iOS.spacing.s,
    backgroundColor: iOS.colors.tander.orange,
    paddingHorizontal: iOS.spacing.s,
    paddingVertical: 4,
    borderRadius: iOS.radius.small,
  },
  mainBadgeText: {
    ...iOS.typography.caption2,
    color: '#fff',
    fontWeight: '600',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: iOS.spacing.s,
    right: iOS.spacing.s,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoLarge: {
    width: '30%',
    aspectRatio: 3 / 4,
    borderRadius: iOS.radius.medium,
    borderWidth: 2,
    borderColor: iOS.colors.tander.orange,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: iOS.colors.tander.orangeLight,
  },
  addPhotoLargeText: {
    ...iOS.typography.subhead,
    color: iOS.colors.tander.orange,
    marginTop: iOS.spacing.s,
  },

  // Delete Confirmation
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: iOS.spacing.xl,
  },
  confirmCard: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.xlarge,
    padding: iOS.spacing.xl,
    width: '100%',
    maxWidth: 320,
  },
  logoutIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: iOS.spacing.l,
  },
  confirmTitle: {
    ...iOS.typography.title3,
    color: iOS.colors.label,
    textAlign: 'center',
    marginBottom: iOS.spacing.m,
  },
  confirmMessage: {
    ...iOS.typography.body,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
    marginBottom: iOS.spacing.xl,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: iOS.spacing.m,
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: iOS.colors.systemGray6,
    paddingVertical: iOS.spacing.m,
    borderRadius: iOS.radius.medium,
    alignItems: 'center',
  },
  confirmCancelText: {
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: iOS.colors.systemRed,
    paddingVertical: iOS.spacing.m,
    borderRadius: iOS.radius.medium,
    alignItems: 'center',
  },
  confirmDeleteText: {
    ...iOS.typography.body,
    color: '#fff',
    fontWeight: '600',
  },

  // Saving Overlay
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingCard: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    padding: iOS.spacing.xl,
    alignItems: 'center',
  },
  savingText: {
    ...iOS.typography.body,
    color: iOS.colors.label,
    marginTop: iOS.spacing.m,
  },
});

export default ProfileScreen;
