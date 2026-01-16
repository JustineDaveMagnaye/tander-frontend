/**
 * TANDER ProfileDetailScreen
 * Displays another user's profile from chat/messages
 *
 * Features:
 * - Back navigation
 * - Profile photo with gradient border
 * - User info (name, age, location)
 * - Bio section
 * - Photos grid
 * - Action buttons (Message, Block, Report)
 */

import React, { useCallback, useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '@shared/styles/colors';
import { useResponsive } from '@shared/hooks/useResponsive';
import { blockUser, reportUser } from '@services/api/profileApi';
import { get } from '@services/api/client';
import type { MessagesStackParamList } from '@navigation/types';

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

/**
 * Transform API profile to display format
 */
const transformApiProfile = (
  apiProfile: ApiUserProfile,
  fallbackName?: string,
  fallbackPhoto?: string
): UserProfile => {
  const name = apiProfile.displayName ||
    apiProfile.nickName ||
    (apiProfile.firstName && apiProfile.lastName ? `${apiProfile.firstName} ${apiProfile.lastName}` : '') ||
    apiProfile.firstName ||
    fallbackName ||
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
      interests = apiProfile.interests.split(',').map(i => i.trim()).filter(Boolean);
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
    bio: apiProfile.bio || 'No bio yet',
    isVerified: apiProfile.verified || false,
    photos,
    interests,
    distance: apiProfile.distance ? `${apiProfile.distance} km away` : undefined,
  };
};

/**
 * Calculate age from birth date
 */
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

// ============================================================================
// INTEREST TAG COMPONENT
// ============================================================================
interface InterestTagProps {
  interest: string;
}

const InterestTag: React.FC<InterestTagProps> = ({ interest }) => (
  <View style={styles.interestTag}>
    <Text style={styles.interestText}>{interest}</Text>
  </View>
);

// ============================================================================
// INFO ROW COMPONENT
// ============================================================================
interface InfoRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconContainer}>
      <Feather name={icon} size={18} color={colors.orange[500]} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ProfileDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ProfileDetailNavigationProp>();
  const route = useRoute<ProfileDetailRouteProp>();
  const { isLandscape: _isLandscape, isTablet } = useResponsive();

  const { userId, userName, userPhoto } = route.params;

  // State for profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_isBlocking, setIsBlocking] = useState(false);
  const [_isReporting, setIsReporting] = useState(false);

  // Fetch profile data from API
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiProfile = await get<ApiUserProfile>(`/user/${userId}`);
        const transformedProfile = transformApiProfile(apiProfile, userName, userPhoto);
        setProfile(transformedProfile);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        // Create fallback profile from route params
        setProfile({
          id: String(userId),
          name: userName || 'User',
          age: 0,
          location: 'Location not available',
          bio: 'Unable to load profile details',
          isVerified: false,
          photos: userPhoto ? [userPhoto] : [],
          interests: [],
          distance: undefined,
        });
        setError('Could not load full profile details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, userName, userPhoto]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMessage = useCallback(() => {
    // Navigate back to chat
    navigation.goBack();
  }, [navigation]);

  const handleBlock = useCallback(() => {
    if (!profile) return;
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${profile.name}? They won't be able to contact you anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setIsBlocking(true);
            try {
              await blockUser(String(userId));
              Alert.alert('Blocked', `${profile.name} has been blocked.`);
              navigation.goBack();
            } catch (err) {
              console.error('Failed to block user:', err);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            } finally {
              setIsBlocking(false);
            }
          }
        },
      ]
    );
  }, [profile, userId, navigation]);

  const handleReport = useCallback(() => {
    if (!profile) return;
    const reportReasons = [
      'Inappropriate Content',
      'Spam or Scam',
      'Harassment or Bullying',
      'Fake Profile',
      'Offensive Behavior',
      'Other',
    ];

    Alert.alert(
      'Report User',
      `Why are you reporting ${profile.name}?`,
      [
        ...reportReasons.map(reason => ({
          text: reason,
          onPress: () => {
            // Confirmation step
            Alert.alert(
              'Confirm Report',
              `Are you sure you want to report ${profile.name} for "${reason}"?\n\nOur team will review this report within 24 hours.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Submit Report',
                  style: 'destructive',
                  onPress: async () => {
                    setIsReporting(true);
                    try {
                      await reportUser({
                        userId: String(userId),
                        reason,
                        details: `Reported from profile view`,
                      });
                      Alert.alert(
                        'Report Submitted',
                        'Thank you for helping keep our community safe. We will review your report and take appropriate action.',
                        [{ text: 'OK' }]
                      );
                    } catch (err) {
                      console.error('Failed to report user:', err);
                      Alert.alert('Error', 'Failed to submit report. Please try again.');
                    } finally {
                      setIsReporting(false);
                    }
                  }
                },
              ]
            );
          }
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [profile, userId]);

  const handleMoreOptions = useCallback(() => {
    Alert.alert(
      'More Options',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block User', style: 'destructive', onPress: handleBlock },
        { text: 'Report User', onPress: handleReport },
      ]
    );
  }, [handleBlock, handleReport]);

  // ============================================================================
  // RENDER
  // ============================================================================
  const { wp } = useResponsive();
  // Responsive max-width: 70% of screen width on tablets, capped at 600px
  const contentMaxWidth = isTablet ? Math.min(wp(70), 600) : undefined;

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <ActivityIndicator size="large" color={colors.orange[500]} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // No profile state (shouldn't happen but handle gracefully)
  if (!profile) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <Feather name="user-x" size={48} color={colors.gray[400]} />
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonAlt}>
          <Text style={styles.backButtonAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          style={styles.backButton}
          accessible={true}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={24} color={colors.gray[800]} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.headerTitle}>Profile</Text>

        {/* More Options */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleMoreOptions}
          style={styles.moreButton}
          accessible={true}
          accessibilityLabel="More options"
          accessibilityRole="button"
        >
          <Feather name="more-vertical" size={24} color={colors.gray[800]} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 100,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : undefined,
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture Section */}
        <View style={styles.avatarSection}>
          {/* Avatar with Gradient Border */}
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={[colors.orange[400], colors.orange[300], colors.teal[300]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatarInner}>
                {profile.photos.length > 0 ? (
                  <Image
                    source={{ uri: profile.photos[0] }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Feather name="user" size={64} color={colors.gray[300]} />
                )}
              </View>
            </LinearGradient>

            {/* Verified Badge */}
            {profile.isVerified && (
              <View
                style={styles.verifiedBadge}
                accessible={true}
                accessibilityLabel="Verified user"
                accessibilityRole="image"
              >
                <Feather name="check" size={16} color={colors.white} />
              </View>
            )}
          </View>

          {/* Name and Age */}
          <Text style={styles.profileName}>
            {profile.name}, {profile.age}
          </Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={16} color={colors.gray[500]} />
            <Text style={styles.locationText}>{profile.location}</Text>
          </View>

          {/* Distance */}
          {profile.distance && (
            <Text style={styles.distanceText}>{profile.distance}</Text>
          )}
        </View>

        {/* Quick Info Cards */}
        <View style={styles.quickInfoContainer}>
          <InfoRow icon="user" label="Age" value={`${profile.age} years old`} />
          <InfoRow icon="map-pin" label="Location" value={profile.location} />
          {profile.distance && (
            <InfoRow icon="navigation" label="Distance" value={profile.distance} />
          )}
        </View>

        {/* About Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>About</Text>
          </View>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>

        {/* Interests Section */}
        {profile.interests.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Interests</Text>
            </View>
            <View style={styles.interestsContainer}>
              {profile.interests.map((interest, index) => (
                <InterestTag key={index} interest={interest} />
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Message Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleMessage}
            accessible={true}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.orange[500], colors.teal[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Feather name="message-circle" size={20} color={colors.white} />
              <Text style={styles.primaryButtonText}>Message</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary Actions Row */}
          <View style={styles.secondaryActionsRow}>
            {/* Block Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBlock}
              style={styles.secondaryButton}
              accessible={true}
              accessibilityLabel="Block user"
              accessibilityRole="button"
            >
              <Feather name="slash" size={18} color={colors.gray[600]} />
              <Text style={styles.secondaryButtonText}>Block</Text>
            </TouchableOpacity>

            {/* Report Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleReport}
              style={styles.secondaryButton}
              accessible={true}
              accessibilityLabel="Report user"
              accessibilityRole="button"
            >
              <Feather name="flag" size={18} color={colors.gray[600]} />
              <Text style={styles.secondaryButtonText}>Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 76,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 76,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
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
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 4,
  },

  // Quick Info
  quickInfoContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.orange[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.gray[500],
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.gray[900],
    fontWeight: '500',
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  bioText: {
    fontSize: 16,
    color: colors.gray[700],
    lineHeight: 24,
  },

  // Interests
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.orange[50],
    borderWidth: 1,
    borderColor: colors.orange[200],
  },
  interestText: {
    fontSize: 16,
    color: colors.orange[700],
    fontWeight: '500',
  },

  // Actions
  actionsContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
  },
  secondaryButtonText: {
    fontSize: 16,
    color: colors.gray[600],
    fontWeight: '500',
  },

  // Loading & Error States
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray[600],
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    color: colors.gray[600],
    marginTop: 16,
    fontWeight: '500',
  },
  backButtonAlt: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.orange[500],
    borderRadius: 24,
  },
  backButtonAltText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  errorBanner: {
    backgroundColor: colors.orange[100],
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  errorBannerText: {
    fontSize: 16,
    color: colors.orange[700],
    textAlign: 'center',
  },
});

export default ProfileDetailScreen;
