/**
 * TANDER ProfileDetailScreen - Premium Photo-Focused Design
 * Super Premium iPhone UI/UX
 *
 * Features:
 * - Full-screen photo gallery with tap navigation
 * - Photo dots indicator for multiple photos
 * - Premium glassmorphism overlays
 * - Floating profile info over photos
 * - Smooth animations and haptic feedback
 * - Senior-friendly: 56-64px touch targets, 18px+ fonts
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import { blockUser, reportUser } from '@services/api/profileApi';
import { get } from '@services/api/client';
import type { MessagesStackParamList } from '@navigation/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// PREMIUM COLORS
// ============================================================================
const PREMIUM_COLORS = {
  overlay: 'rgba(0,0,0,0.4)',
  overlayLight: 'rgba(0,0,0,0.2)',
  glass: 'rgba(255,255,255,0.95)',
  glassDark: 'rgba(0,0,0,0.6)',
  verified: '#22C55E',
  like: '#00D26A',
  message: colors.orange[500],
};

// ============================================================================
// TYPES
// ============================================================================
type ProfileDetailRouteProp = RouteProp<MessagesStackParamList, 'ProfileDetail'>;
type ProfileDetailNavigationProp = NativeStackNavigationProp<MessagesStackParamList, 'ProfileDetail'>;

interface UserProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  bio: string;
  isVerified: boolean;
  photos: string[];
  interests: string[];
  distance?: string;
}

interface ApiUserProfile {
  id: number | string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  nickName?: string;
  age?: number;
  birthDate?: string;
  city?: string;
  country?: string;
  bio?: string;
  interests?: string | string[];
  profilePhotoUrl?: string;
  additionalPhotos?: string[];
  verified?: boolean;
  distance?: number;
}

// ============================================================================
// HELPERS
// ============================================================================
const transformApiProfile = (
  apiProfile: ApiUserProfile,
  fallbackName?: string,
  fallbackPhoto?: string
): UserProfile => {
  // Skip displayName/firstName if they equal username (indicates backend returning username as name)
  const username = apiProfile.username?.toLowerCase();
  const displayNameIsValid = apiProfile.displayName &&
    apiProfile.displayName.toLowerCase() !== username;
  const firstNameIsValid = apiProfile.firstName &&
    apiProfile.firstName.toLowerCase() !== username;

  // Priority: fallbackName (from matches) FIRST for consistency > valid displayName > nickName > firstName+lastName > valid firstName > 'User'
  // When navigating from matches, we should show the same name the user clicked on
  // fallbackName comes from matches data which has matchedUserDisplayName
  const name = fallbackName ||
    (displayNameIsValid ? apiProfile.displayName : null) ||
    apiProfile.nickName ||
    (firstNameIsValid && apiProfile.lastName ? `${apiProfile.firstName} ${apiProfile.lastName}` : '') ||
    (firstNameIsValid ? apiProfile.firstName : null) ||
    'User';

  const photos: string[] = [];
  if (apiProfile.profilePhotoUrl) {
    photos.push(apiProfile.profilePhotoUrl);
  } else if (fallbackPhoto) {
    photos.push(fallbackPhoto);
  }
  if (apiProfile.additionalPhotos) {
    photos.push(...apiProfile.additionalPhotos);
  }

  let interests: string[] = [];
  if (apiProfile.interests) {
    if (typeof apiProfile.interests === 'string') {
      const trimmed = apiProfile.interests.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          interests = Array.isArray(parsed) ? parsed : [];
        } catch {
          interests = trimmed.slice(1, -1).split(',').map(i => i.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
      } else {
        interests = trimmed.split(',').map(i => i.trim()).filter(Boolean);
      }
    } else {
      interests = apiProfile.interests;
    }
  }

  const location = apiProfile.city && apiProfile.country
    ? `${apiProfile.city}, ${apiProfile.country}`
    : apiProfile.city || apiProfile.country || 'Location not shared';

  return {
    id: String(apiProfile.id),
    name,
    age: apiProfile.age || calculateAge(apiProfile.birthDate),
    location,
    bio: apiProfile.bio || '',
    isVerified: apiProfile.verified || false,
    photos,
    interests,
    distance: apiProfile.distance ? `${apiProfile.distance} km away` : undefined,
  };
};

const calculateAge = (birthDate?: string): number => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const triggerHaptic = async (type: 'light' | 'medium' | 'success' = 'light') => {
  try {
    if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'medium') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {}
};

// ============================================================================
// PHOTO DOTS COMPONENT
// ============================================================================
interface PhotoDotsProps {
  total: number;
  current: number;
}

const PhotoDots: React.FC<PhotoDotsProps> = ({ total, current }) => {
  if (total <= 1) return null;

  return (
    <View style={styles.photoDotsContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.photoDot,
            index === current && styles.photoDotActive,
          ]}
        />
      ))}
    </View>
  );
};

// ============================================================================
// INTEREST TAG COMPONENT
// ============================================================================
const InterestTag: React.FC<{ interest: string }> = ({ interest }) => (
  <View style={styles.interestTag}>
    <Text style={styles.interestText}>{interest}</Text>
  </View>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ProfileDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ProfileDetailNavigationProp>();
  const route = useRoute<ProfileDetailRouteProp>();
  const { isLandscape, isTablet, hp, wp } = useResponsive();
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { userId, userName, userPhoto } = route.params;

  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiProfile = await get<ApiUserProfile>(`/user/${userId}`);
        const transformedProfile = transformApiProfile(apiProfile, userName, userPhoto);
        setProfile(transformedProfile);
        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } catch (err) {
        console.warn('Failed to fetch profile:', err);
        setProfile({
          id: String(userId),
          name: userName || 'User',
          age: 0,
          location: 'Location not available',
          bio: '',
          isVerified: false,
          photos: userPhoto ? [userPhoto] : [],
          interests: [],
          distance: undefined,
        });
        setError('Could not load full profile details');
        fadeAnim.setValue(1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, userName, userPhoto, fadeAnim]);

  // Photo navigation
  const handlePhotoTap = useCallback((direction: 'left' | 'right') => {
    if (!profile || profile.photos.length <= 1) return;

    triggerHaptic('light');
    const totalPhotos = profile.photos.length;

    if (direction === 'left' && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    } else if (direction === 'right' && currentPhotoIndex < totalPhotos - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  }, [profile, currentPhotoIndex]);

  // Handlers
  const handleBack = useCallback(() => {
    triggerHaptic('light');
    navigation.goBack();
  }, [navigation]);

  const handleMessage = useCallback(() => {
    triggerHaptic('medium');
    navigation.goBack();
  }, [navigation]);

  const handleBlock = useCallback(() => {
    if (!profile) return;
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${profile.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(String(userId));
              Alert.alert('Blocked', `${profile.name} has been blocked.`);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          }
        },
      ]
    );
  }, [profile, userId, navigation]);

  const handleReport = useCallback(() => {
    if (!profile) return;
    Alert.alert(
      'Report User',
      `Why are you reporting ${profile.name}?`,
      [
        { text: 'Inappropriate Content', onPress: () => submitReport('Inappropriate Content') },
        { text: 'Spam or Scam', onPress: () => submitReport('Spam or Scam') },
        { text: 'Fake Profile', onPress: () => submitReport('Fake Profile') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [profile]);

  const submitReport = async (reason: string) => {
    try {
      await reportUser({ userId: String(userId), reason, details: 'Reported from profile view' });
      Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report.');
    }
  };

  const handleMoreOptions = useCallback(() => {
    Alert.alert(
      'Options',
      undefined,
      [
        { text: 'Block User', style: 'destructive', onPress: handleBlock },
        { text: 'Report User', onPress: handleReport },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [handleBlock, handleReport]);

  // Calculate dimensions
  const photoHeight = isLandscape ? hp(100) : hp(65);
  const contentWidth = isTablet ? Math.min(wp(70), 600) : SCREEN_WIDTH;

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color={colors.orange[500]} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <Feather name="user-x" size={48} color={colors.gray[400]} />
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonAlt}>
          <Text style={styles.backButtonAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentPhoto = profile.photos[currentPhotoIndex] || profile.photos[0];
  const totalPhotos = profile.photos.length;

  // LANDSCAPE MODE
  if (isLandscape) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <View style={styles.landscapeContainer}>
          {/* LEFT - Photo Gallery (50%) */}
          <View style={styles.landscapePhotoSection}>
            {currentPhoto ? (
              <Image source={{ uri: currentPhoto }} style={styles.fullPhoto} resizeMode="cover" />
            ) : (
              <View style={[styles.fullPhoto, styles.noPhoto]}>
                <Feather name="user" size={80} color={colors.gray[300]} />
              </View>
            )}

            {/* Photo Navigation Touch Areas */}
            {totalPhotos > 1 && (
              <>
                <Pressable style={styles.photoTapLeft} onPress={() => handlePhotoTap('left')} />
                <Pressable style={styles.photoTapRight} onPress={() => handlePhotoTap('right')} />
              </>
            )}

            {/* Photo Dots */}
            <PhotoDots total={totalPhotos} current={currentPhotoIndex} />

            {/* Back Button */}
            <TouchableOpacity
              style={[styles.floatingBackBtn, { top: insets.top + 12 }]}
              onPress={handleBack}
              activeOpacity={0.9}
            >
              <BlurView intensity={80} tint="dark" style={styles.blurButton}>
                <Feather name="arrow-left" size={22} color="#FFFFFF" />
              </BlurView>
            </TouchableOpacity>

            {/* More Options */}
            <TouchableOpacity
              style={[styles.floatingMoreBtn, { top: insets.top + 12 }]}
              onPress={handleMoreOptions}
              activeOpacity={0.9}
            >
              <BlurView intensity={80} tint="dark" style={styles.blurButton}>
                <Feather name="more-horizontal" size={22} color="#FFFFFF" />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* RIGHT - Profile Info (50%) */}
          <ScrollView
            style={styles.landscapeInfoSection}
            contentContainerStyle={[styles.landscapeInfoContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Name & Verified */}
            <View style={styles.nameSection}>
              <Text style={styles.profileName}>
                {profile.name}{profile.age > 0 ? `, ${profile.age}` : ''}
              </Text>
              {profile.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Feather name="check" size={14} color="#FFFFFF" />
                </View>
              )}
            </View>

            {/* Location */}
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={16} color={colors.orange[500]} />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>

            {profile.distance && (
              <Text style={styles.distanceText}>{profile.distance}</Text>
            )}

            {/* Bio */}
            {profile.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </View>
            )}

            {/* Interests */}
            {profile.interests.length > 0 && (
              <View style={styles.interestsSection}>
                <Text style={styles.sectionTitle}>Interests</Text>
                <View style={styles.interestsContainer}>
                  {profile.interests.map((interest, i) => (
                    <InterestTag key={i} interest={interest} />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Floating Action Button */}
          <TouchableOpacity
            style={[styles.floatingMessageBtn, { bottom: insets.bottom + 20, right: 20 }]}
            onPress={handleMessage}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.orange[500], colors.orange[600]]}
              style={styles.messageButtonGradient}
            >
              <Feather name="message-circle" size={24} color="#FFFFFF" />
              <Text style={styles.messageButtonText}>Message</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // PORTRAIT MODE - Premium Photo-Focused Design
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Photo Gallery Section */}
        <View style={[styles.photoGallery, { height: photoHeight }]}>
          {currentPhoto ? (
            <Image source={{ uri: currentPhoto }} style={styles.fullPhoto} resizeMode="cover" />
          ) : (
            <View style={[styles.fullPhoto, styles.noPhoto]}>
              <Feather name="user" size={80} color={colors.gray[300]} />
            </View>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
            locations={[0, 0.2, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Photo Navigation Touch Areas */}
          {totalPhotos > 1 && (
            <>
              <Pressable style={styles.photoTapLeft} onPress={() => handlePhotoTap('left')} />
              <Pressable style={styles.photoTapRight} onPress={() => handlePhotoTap('right')} />
            </>
          )}

          {/* Photo Dots at Top */}
          <View style={[styles.photoDotsTop, { top: insets.top + 60 }]}>
            <PhotoDots total={totalPhotos} current={currentPhotoIndex} />
          </View>

          {/* Header Buttons */}
          <View style={[styles.headerButtons, { top: insets.top + 12 }]}>
            <TouchableOpacity onPress={handleBack} activeOpacity={0.9}>
              <BlurView intensity={80} tint="dark" style={styles.blurButton}>
                <Feather name="arrow-left" size={22} color="#FFFFFF" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleMoreOptions} activeOpacity={0.9}>
              <BlurView intensity={80} tint="dark" style={styles.blurButton}>
                <Feather name="more-horizontal" size={22} color="#FFFFFF" />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Profile Info Overlay */}
          <View style={styles.profileInfoOverlay}>
            <View style={styles.nameRow}>
              <Text style={styles.overlayName}>
                {profile.name}{profile.age > 0 ? `, ${profile.age}` : ''}
              </Text>
              {profile.isVerified && (
                <View style={styles.verifiedBadgeSmall}>
                  <Feather name="check" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.overlayLocationRow}>
              <Feather name="map-pin" size={14} color="#FFFFFF" />
              <Text style={styles.overlayLocation}>{profile.location}</Text>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={[styles.contentSection, { maxWidth: contentWidth, alignSelf: isTablet ? 'center' : undefined }]}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Bio */}
          {profile.bio && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>About</Text>
              <Text style={styles.cardText}>{profile.bio}</Text>
            </View>
          )}

          {/* Interests */}
          {profile.interests.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Interests</Text>
              <View style={styles.interestsContainer}>
                {profile.interests.map((interest, i) => (
                  <InterestTag key={i} interest={interest} />
                ))}
              </View>
            </View>
          )}

          {/* Distance */}
          {profile.distance && (
            <View style={styles.card}>
              <View style={styles.distanceRow}>
                <Feather name="navigation" size={18} color={colors.orange[500]} />
                <Text style={styles.cardText}>{profile.distance}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={handleMessage} activeOpacity={0.9} style={styles.messageButtonWrapper}>
          <LinearGradient
            colors={[colors.orange[500], colors.orange[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.messageButton}
          >
            <Feather name="message-circle" size={22} color="#FFFFFF" />
            <Text style={styles.messageText}>Send Message</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },

  // Photo Gallery
  photoGallery: {
    width: '100%',
    backgroundColor: colors.gray[200],
  },
  fullPhoto: {
    width: '100%',
    height: '100%',
  },
  noPhoto: {
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Photo Navigation
  photoTapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '40%',
  },
  photoTapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '40%',
  },

  // Photo Dots
  photoDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  photoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  photoDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  photoDotsTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // Header Buttons
  headerButtons: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  blurButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  floatingBackBtn: {
    position: 'absolute',
    left: 16,
  },
  floatingMoreBtn: {
    position: 'absolute',
    right: 16,
  },

  // Profile Info Overlay
  profileInfoOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  overlayName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overlayLocation: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Verified Badge
  verifiedBadgeSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PREMIUM_COLORS.verified,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  verifiedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PREMIUM_COLORS.verified,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  // Content Section
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 17,
    color: colors.gray[800],
    lineHeight: 26,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Interests
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: colors.orange[50],
    borderWidth: 1,
    borderColor: colors.orange[200],
  },
  interestText: {
    fontSize: 15,
    color: colors.orange[700],
    fontWeight: '500',
  },

  // Bottom Action Bar
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  messageButtonWrapper: {
    width: '100%',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 28,
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  messageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Landscape Mode
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapePhotoSection: {
    width: '50%',
    height: '100%',
  },
  landscapeInfoSection: {
    width: '50%',
    backgroundColor: '#FFFFFF',
  },
  landscapeInfoContent: {
    padding: 24,
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    color: colors.gray[600],
  },
  distanceText: {
    fontSize: 15,
    color: colors.gray[500],
    marginTop: 4,
    marginBottom: 20,
  },
  bioSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  interestsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: colors.gray[700],
    lineHeight: 24,
  },

  // Floating Message Button (Landscape)
  floatingMessageBtn: {
    position: 'absolute',
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: colors.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  messageButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Loading & Error States
  loadingText: {
    fontSize: 16,
    color: colors.gray[600],
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    color: colors.gray[600],
    marginTop: 16,
  },
  backButtonAlt: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.orange[500],
  },
  backButtonAltText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorBanner: {
    backgroundColor: colors.orange[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.orange[200],
  },
  errorBannerText: {
    fontSize: 14,
    color: colors.orange[700],
    textAlign: 'center',
  },
});

export default ProfileDetailScreen;
