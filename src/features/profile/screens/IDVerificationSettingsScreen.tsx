/**
 * TANDER ID Verification Settings Screen
 * Premium iOS-style ID verification management
 *
 * Features:
 * - iOS Human Interface Guidelines design
 * - View and manage ID verification status
 * - Upload ID photos and selfie
 * - Submission history timeline
 * - Haptic feedback on interactions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useResponsive } from '@shared/hooks/useResponsive';
import {
  getIdVerificationStatus,
  submitIdVerification,
  resubmitIdVerification,
  IdVerificationStatusResponse,
} from '@/services/api/authApi';

// =============================================================================
// iOS DESIGN SYSTEM
// =============================================================================

const iOS = {
  colors: {
    // Backgrounds
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',

    // Labels
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C4399',
    quaternaryLabel: '#3C3C434D',

    // Separators
    separator: '#3C3C4336',
    opaqueSeparator: '#C6C6C8',

    // System Colors
    systemRed: '#FF3B30',
    systemOrange: '#FF9500',
    systemYellow: '#FFCC00',
    systemGreen: '#34C759',
    systemMint: '#00C7BE',
    systemTeal: '#30B0C7',
    systemCyan: '#32ADE6',
    systemBlue: '#007AFF',
    systemIndigo: '#5856D6',
    systemPurple: '#AF52DE',
    systemPink: '#FF2D55',
    systemBrown: '#A2845E',

    // Grays
    systemGray: '#8E8E93',
    systemGray2: '#AEAEB2',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',

    // Tander Brand
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
    section: 35,
  },

  radius: {
    small: 8,
    medium: 10,
    large: 12,
    xlarge: 16,
  },

  typography: {
    largeTitle: {
      fontSize: 34,
      fontWeight: '700' as const,
      letterSpacing: 0.37,
    },
    title1: {
      fontSize: 28,
      fontWeight: '700' as const,
      letterSpacing: 0.36,
    },
    title2: {
      fontSize: 22,
      fontWeight: '700' as const,
      letterSpacing: 0.35,
    },
    title3: {
      fontSize: 20,
      fontWeight: '600' as const,
      letterSpacing: 0.38,
    },
    headline: {
      fontSize: 17,
      fontWeight: '600' as const,
      letterSpacing: -0.41,
    },
    body: {
      fontSize: 17,
      fontWeight: '400' as const,
      letterSpacing: -0.41,
    },
    callout: {
      fontSize: 16,
      fontWeight: '400' as const,
      letterSpacing: -0.32,
    },
    subhead: {
      fontSize: 15,
      fontWeight: '400' as const,
      letterSpacing: -0.24,
    },
    footnote: {
      fontSize: 13,
      fontWeight: '400' as const,
      letterSpacing: -0.08,
    },
    caption1: {
      fontSize: 12,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    caption2: {
      fontSize: 11,
      fontWeight: '400' as const,
      letterSpacing: 0.07,
    },
  },
};

// =============================================================================
// TYPES
// =============================================================================

interface IDVerificationSettingsScreenProps {
  onBack: () => void;
}

type VerificationStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface StatusConfig {
  color: string;
  bgColor: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_CONFIG: Record<VerificationStatus, StatusConfig> = {
  NOT_SUBMITTED: {
    color: iOS.colors.systemGray,
    bgColor: iOS.colors.systemGray5,
    icon: 'file-text',
    label: 'Not Submitted',
  },
  PENDING: {
    color: iOS.colors.systemOrange,
    bgColor: '#FFF3E0',
    icon: 'clock',
    label: 'Under Review',
  },
  APPROVED: {
    color: iOS.colors.systemGreen,
    bgColor: '#E8F5E9',
    icon: 'check-circle',
    label: 'Verified',
  },
  REJECTED: {
    color: iOS.colors.systemRed,
    bgColor: '#FFEBEE',
    icon: 'x-circle',
    label: 'Rejected',
  },
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const Card: React.FC<{ children: React.ReactNode; style?: object }> = ({ children, style }) => (
  <View style={[iosStyles.card, style]}>{children}</View>
);

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <View style={iosStyles.sectionHeader}>
    <Text style={iosStyles.sectionTitle}>{title.toUpperCase()}</Text>
    {subtitle && <Text style={iosStyles.sectionSubtitle}>{subtitle}</Text>}
  </View>
);

const InfoRow: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  text: string;
  showSeparator?: boolean;
}> = ({ icon, text, showSeparator = true }) => (
  <View style={iosStyles.infoRow}>
    <View style={iosStyles.infoRowContent}>
      <View style={[iosStyles.iconBadge, { backgroundColor: iOS.colors.tander.teal }]}>
        <Feather name={icon} size={16} color="#FFFFFF" />
      </View>
      <Text style={iosStyles.infoRowText}>{text}</Text>
    </View>
    {showSeparator && <View style={iosStyles.rowSeparator} />}
  </View>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IDVerificationSettingsScreen: React.FC<IDVerificationSettingsScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet } = useResponsive();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<VerificationStatus>('NOT_SUBMITTED');
  const [statusData, setStatusData] = useState<IdVerificationStatusResponse['data'] | null>(null);
  const [error, setError] = useState('');

  // Photo states
  const [idFrontPhoto, setIdFrontPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [idBackPhoto, setIdBackPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Fetch current status
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await getIdVerificationStatus();
      setStatus(response.data.status);
      setStatusData(response.data);
    } catch (err: any) {
      console.warn('Failed to fetch ID verification status:', err);
      setError('Failed to load verification status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

  const pickImage = async (type: 'idFront' | 'idBack' | 'selfie') => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'selfie' ? [1, 1] : [16, 10],
      quality: 0.8,
    };

    let result: ImagePicker.ImagePickerResult;

    if (type === 'selfie') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is required to take a selfie.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is required to select ID photos.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      switch (type) {
        case 'idFront':
          setIdFrontPhoto(result.assets[0]);
          break;
        case 'idBack':
          setIdBackPhoto(result.assets[0]);
          break;
        case 'selfie':
          setSelfiePhoto(result.assets[0]);
          break;
      }
    }
  };

  const handleSubmit = async () => {
    if (!idFrontPhoto || !selfiePhoto) {
      Alert.alert('Missing Photos', 'Please provide your ID front photo and a selfie.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const idFrontBlob = await fetch(idFrontPhoto.uri).then(r => r.blob());
      const selfieBlob = await fetch(selfiePhoto.uri).then(r => r.blob());
      const idBackBlob = idBackPhoto ? await fetch(idBackPhoto.uri).then(r => r.blob()) : undefined;

      if (status === 'REJECTED' && statusData?.canResubmit) {
        await resubmitIdVerification(idFrontBlob, selfieBlob, idBackBlob);
      } else {
        await submitIdVerification(idFrontBlob, selfieBlob, idBackBlob);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Submitted Successfully',
        'Your ID verification has been submitted. We will review it within 24-48 hours.',
        [{ text: 'OK', onPress: fetchStatus }]
      );

      setIdFrontPhoto(null);
      setIdBackPhoto(null);
      setSelfiePhoto(null);
    } catch (err: any) {
      console.warn('Failed to submit ID verification:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Submission Failed', err?.message || 'Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = status === 'NOT_SUBMITTED' || (status === 'REJECTED' && statusData?.canResubmit);

  const renderStatusCard = () => {
    const config = STATUS_CONFIG[status];

    return (
      <Card style={iosStyles.statusCard}>
        <View style={[iosStyles.statusIconContainer, { backgroundColor: config.bgColor }]}>
          <Feather name={config.icon} size={32} color={config.color} />
        </View>
        <Text style={[iosStyles.statusLabel, { color: config.color }]}>{config.label}</Text>

        {status === 'APPROVED' && (
          <Text style={iosStyles.statusDescription}>
            Your identity has been verified. You now have full access to all TANDER features.
          </Text>
        )}
        {status === 'PENDING' && (
          <Text style={iosStyles.statusDescription}>
            Your verification is being reviewed. This usually takes 24-48 hours.
          </Text>
        )}
        {status === 'REJECTED' && statusData?.lastSubmission?.reviewerNotes && (
          <View style={iosStyles.rejectionContainer}>
            <Text style={iosStyles.rejectionTitle}>Reason for Rejection</Text>
            <Text style={iosStyles.rejectionReason}>{statusData.lastSubmission.reviewerNotes}</Text>
            {statusData.canResubmit && (
              <Text style={iosStyles.resubmitHint}>You can resubmit your documents below.</Text>
            )}
          </View>
        )}
        {status === 'NOT_SUBMITTED' && (
          <Text style={iosStyles.statusDescription}>
            Verify your identity to unlock all features and build trust with other members.
          </Text>
        )}
      </Card>
    );
  };

  const renderPhotoUploader = (
    title: string,
    description: string,
    photo: ImagePicker.ImagePickerAsset | null,
    type: 'idFront' | 'idBack' | 'selfie',
    required: boolean = false
  ) => (
    <View style={iosStyles.photoUploaderContainer}>
      <View style={iosStyles.photoUploaderHeader}>
        <Text style={iosStyles.photoUploaderTitle}>
          {title}
          {required && <Text style={iosStyles.requiredStar}> *</Text>}
        </Text>
        <Text style={iosStyles.photoUploaderDescription}>{description}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          iosStyles.photoUploader,
          photo && iosStyles.photoUploaderWithImage,
          pressed && iosStyles.photoUploaderPressed,
        ]}
        onPress={() => pickImage(type)}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${description}`}
      >
        {photo ? (
          <>
            <Image source={{ uri: photo.uri }} style={iosStyles.photoPreview} />
            <View style={iosStyles.photoOverlay}>
              <Feather name="edit-2" size={18} color="#FFFFFF" />
              <Text style={iosStyles.photoOverlayText}>Change</Text>
            </View>
          </>
        ) : (
          <>
            <View style={iosStyles.photoPlaceholder}>
              <Feather
                name={type === 'selfie' ? 'camera' : 'image'}
                size={28}
                color={iOS.colors.systemGray2}
              />
            </View>
            <Text style={iosStyles.photoUploaderHint}>
              {type === 'selfie' ? 'Take a Selfie' : 'Select Photo'}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );

  const renderSubmissionHistory = () => {
    if (!statusData?.statusHistory || statusData.statusHistory.length === 0) return null;

    return (
      <>
        <SectionHeader title="Verification History" />
        <Card>
          {statusData.statusHistory.map((entry, index) => (
            <View key={index} style={iosStyles.historyItem}>
              <View style={iosStyles.historyItemContent}>
                <View style={[iosStyles.historyDot, { backgroundColor: iOS.colors.tander.teal }]} />
                <View style={iosStyles.historyContent}>
                  <Text style={iosStyles.historyStatus}>{entry.status.replace('_', ' ')}</Text>
                  <Text style={iosStyles.historyDate}>
                    {new Date(entry.changedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
              {index < statusData.statusHistory.length - 1 && (
                <View style={iosStyles.historySeparator} />
              )}
            </View>
          ))}
        </Card>
      </>
    );
  };

  if (isLoading) {
    return (
      <View style={[iosStyles.container, iosStyles.centerContent, { paddingTop: insets.top }]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={iOS.colors.secondarySystemBackground}
          translucent={Platform.OS === 'android'}
        />
        <ActivityIndicator size="large" color={iOS.colors.tander.orange} />
        <Text style={iosStyles.loadingText}>Loading verification status...</Text>
      </View>
    );
  }

  return (
    <View style={[iosStyles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={iOS.colors.secondarySystemBackground}
        translucent={Platform.OS === 'android'}
      />

      {/* iOS-style Navigation Bar */}
      <View style={[iosStyles.navBar, isLandscape && iosStyles.navBarLandscape]}>
        <Pressable
          style={({ pressed }) => [
            iosStyles.backButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back to Settings"
        >
          <Feather name="chevron-left" size={28} color={iOS.colors.tander.orange} />
          <Text style={iosStyles.backText}>Settings</Text>
        </Pressable>
        <Text style={[iosStyles.navTitle, isLandscape && iosStyles.navTitleLandscape]}>
          ID Verification
        </Text>
        <View style={iosStyles.navSpacer} />
      </View>

      <ScrollView
        style={iosStyles.scrollView}
        contentContainerStyle={[
          iosStyles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
          isTablet && { maxWidth: isLandscape ? 800 : 600, alignSelf: 'center', width: '100%' },
          !isTablet && isLandscape && { maxWidth: 600, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Card style={iosStyles.errorCard}>
            <Feather name="alert-circle" size={32} color={iOS.colors.systemRed} />
            <Text style={iosStyles.errorText}>{error}</Text>
            <Pressable
              style={({ pressed }) => [
                iosStyles.retryButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={fetchStatus}
              accessibilityRole="button"
              accessibilityLabel="Retry loading"
            >
              <Text style={iosStyles.retryButtonText}>Retry</Text>
            </Pressable>
          </Card>
        ) : (
          <>
            {/* Status Section */}
            <SectionHeader title="Current Status" />
            {renderStatusCard()}

            {/* Upload Section */}
            {canSubmit && (
              <>
                <SectionHeader
                  title={status === 'REJECTED' ? 'Resubmit Documents' : 'Submit Documents'}
                  subtitle="Provide clear photos of a valid government-issued ID and a selfie"
                />
                <Card>
                  <View style={iosStyles.uploadContent}>
                    {renderPhotoUploader(
                      'ID Front',
                      'Clear photo of the front of your ID',
                      idFrontPhoto,
                      'idFront',
                      true
                    )}

                    {renderPhotoUploader(
                      'ID Back',
                      'Photo of the back (optional)',
                      idBackPhoto,
                      'idBack',
                      false
                    )}

                    {renderPhotoUploader(
                      'Selfie',
                      'Take a clear selfie of yourself',
                      selfiePhoto,
                      'selfie',
                      true
                    )}
                  </View>
                </Card>

                {/* Submit Button */}
                <View style={iosStyles.submitContainer}>
                  <Pressable
                    style={({ pressed }) => [
                      iosStyles.submitButton,
                      (!idFrontPhoto || !selfiePhoto || isSubmitting) && iosStyles.submitButtonDisabled,
                      pressed && !isSubmitting && idFrontPhoto && selfiePhoto && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={handleSubmit}
                    disabled={!idFrontPhoto || !selfiePhoto || isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel={status === 'REJECTED' ? 'Resubmit for Verification' : 'Submit for Verification'}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="send" size={18} color="#FFFFFF" />
                        <Text style={iosStyles.submitButtonText}>
                          {status === 'REJECTED' ? 'Resubmit for Verification' : 'Submit for Verification'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            )}

            {/* History Section */}
            {renderSubmissionHistory()}

            {/* Why Verify Section */}
            <SectionHeader title="Why Verify Your ID?" />
            <Card>
              <InfoRow icon="shield" text="Build trust with other members" />
              <InfoRow icon="check-circle" text="Get a verified badge on your profile" />
              <InfoRow icon="users" text="Access all matching features" />
              <InfoRow icon="lock" text="Your data is encrypted and secure" showSeparator={false} />
            </Card>

            {/* Footer */}
            <View style={iosStyles.footer}>
              <Text style={iosStyles.footerText}>
                Your documents are securely processed and deleted after verification.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

// =============================================================================
// iOS STYLES
// =============================================================================

const iosStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: iOS.colors.secondarySystemBackground,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    marginTop: iOS.spacing.m,
  },

  // Navigation Bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    backgroundColor: iOS.colors.secondarySystemBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: iOS.colors.separator,
  },
  navBarLandscape: {
    paddingVertical: iOS.spacing.s,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -iOS.spacing.s,
  },
  backText: {
    ...iOS.typography.body,
    color: iOS.colors.tander.orange,
    marginLeft: -2,
  },
  navTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  navTitleLandscape: {
    fontSize: 15,
  },
  navSpacer: {
    width: 80,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: iOS.spacing.l,
    paddingTop: iOS.spacing.xl,
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: iOS.spacing.l,
    paddingTop: iOS.spacing.xxl,
    paddingBottom: iOS.spacing.s,
  },
  sectionTitle: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    ...iOS.typography.footnote,
    color: iOS.colors.tertiaryLabel,
    marginTop: iOS.spacing.xs,
  },

  // Card
  card: {
    backgroundColor: iOS.colors.systemBackground,
    borderRadius: iOS.radius.large,
    overflow: 'hidden',
  },

  // Status Card
  statusCard: {
    alignItems: 'center',
    padding: iOS.spacing.xxl,
  },
  statusIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.m,
  },
  statusLabel: {
    ...iOS.typography.title2,
    marginBottom: iOS.spacing.s,
  },
  statusDescription: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
  },
  rejectionContainer: {
    backgroundColor: '#FFF5F5',
    padding: iOS.spacing.m,
    borderRadius: iOS.radius.medium,
    marginTop: iOS.spacing.m,
    width: '100%',
  },
  rejectionTitle: {
    ...iOS.typography.footnote,
    fontWeight: '600',
    color: iOS.colors.systemRed,
    marginBottom: iOS.spacing.xs,
  },
  rejectionReason: {
    ...iOS.typography.subhead,
    color: iOS.colors.label,
    lineHeight: 22,
  },
  resubmitHint: {
    ...iOS.typography.footnote,
    color: iOS.colors.tander.teal,
    marginTop: iOS.spacing.s,
    fontWeight: '500',
  },

  // Upload Section
  uploadContent: {
    padding: iOS.spacing.l,
  },
  photoUploaderContainer: {
    marginBottom: iOS.spacing.l,
  },
  photoUploaderHeader: {
    marginBottom: iOS.spacing.s,
  },
  photoUploaderTitle: {
    ...iOS.typography.headline,
    color: iOS.colors.label,
  },
  requiredStar: {
    color: iOS.colors.systemRed,
  },
  photoUploaderDescription: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    marginTop: 2,
  },
  photoUploader: {
    height: 140,
    borderRadius: iOS.radius.medium,
    borderWidth: 2,
    borderColor: iOS.colors.systemGray4,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: iOS.colors.systemGray6,
    overflow: 'hidden',
  },
  photoUploaderWithImage: {
    borderStyle: 'solid',
    borderColor: iOS.colors.tander.teal,
  },
  photoUploaderPressed: {
    opacity: 0.7,
  },
  photoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: iOS.colors.systemGray5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: iOS.spacing.s,
  },
  photoUploaderHint: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    fontWeight: '500',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: iOS.spacing.s,
    gap: iOS.spacing.xs,
  },
  photoOverlayText: {
    ...iOS.typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Submit Button
  submitContainer: {
    marginTop: iOS.spacing.l,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: iOS.colors.tander.orange,
    borderRadius: iOS.radius.large,
    paddingVertical: iOS.spacing.l,
    gap: iOS.spacing.s,
  },
  submitButtonDisabled: {
    backgroundColor: iOS.colors.systemGray3,
  },
  submitButtonText: {
    ...iOS.typography.headline,
    color: '#FFFFFF',
  },

  // History
  historyItem: {
    backgroundColor: iOS.colors.systemBackground,
  },
  historyItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: iOS.spacing.m,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    ...iOS.typography.body,
    color: iOS.colors.label,
    textTransform: 'capitalize',
  },
  historyDate: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    marginTop: 2,
  },
  historySeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: iOS.colors.separator,
    marginLeft: 42,
  },

  // Info Row
  infoRow: {
    backgroundColor: iOS.colors.systemBackground,
  },
  infoRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    minHeight: 52,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.m,
  },
  infoRowText: {
    ...iOS.typography.body,
    color: iOS.colors.label,
    flex: 1,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: iOS.colors.separator,
    marginLeft: 56,
  },

  // Error
  errorCard: {
    alignItems: 'center',
    padding: iOS.spacing.xxl,
    gap: iOS.spacing.m,
  },
  errorText: {
    ...iOS.typography.body,
    color: iOS.colors.systemRed,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: iOS.colors.tander.orange,
    paddingHorizontal: iOS.spacing.xxl,
    paddingVertical: iOS.spacing.m,
    borderRadius: iOS.radius.medium,
  },
  retryButtonText: {
    ...iOS.typography.headline,
    color: '#FFFFFF',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: iOS.spacing.xxl,
    paddingBottom: iOS.spacing.xl,
  },
  footerText: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default IDVerificationSettingsScreen;
