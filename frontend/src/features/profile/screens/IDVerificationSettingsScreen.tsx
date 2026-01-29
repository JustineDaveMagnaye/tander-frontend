/**
 * TANDER ID Verification Settings Screen
 * Allows users to view and manage their ID verification status
 * Located in Settings menu
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import {
  getIdVerificationStatus,
  submitIdVerification,
  resubmitIdVerification,
  IdVerificationStatusResponse,
} from '@/services/api/authApi';

interface IDVerificationSettingsScreenProps {
  onBack: () => void;
}

type VerificationStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_CONFIG: Record<VerificationStatus, { color: string; bgColor: string; icon: keyof typeof Feather.glyphMap; label: string }> = {
  NOT_SUBMITTED: {
    color: colors.gray[500],
    bgColor: colors.gray[100],
    icon: 'file-text',
    label: 'Not Submitted',
  },
  PENDING: {
    color: colors.orange[500],
    bgColor: colors.orange[100],
    icon: 'clock',
    label: 'Under Review',
  },
  APPROVED: {
    color: colors.semantic.success,
    bgColor: '#D1FAE5',
    icon: 'check-circle',
    label: 'Verified',
  },
  REJECTED: {
    color: colors.semantic.error,
    bgColor: '#FEE2E2',
    icon: 'x-circle',
    label: 'Rejected',
  },
};

export const IDVerificationSettingsScreen: React.FC<IDVerificationSettingsScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useResponsive();

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

  const pickImage = async (type: 'idFront' | 'idBack' | 'selfie') => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'selfie' ? [1, 1] : [16, 10],
      quality: 0.8,
    };

    let result: ImagePicker.ImagePickerResult;

    if (type === 'selfie') {
      // Request camera permission for selfie
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is required to take a selfie.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      // Use gallery for ID photos
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

      // Convert images to blobs
      const idFrontBlob = await fetch(idFrontPhoto.uri).then(r => r.blob());
      const selfieBlob = await fetch(selfiePhoto.uri).then(r => r.blob());
      const idBackBlob = idBackPhoto ? await fetch(idBackPhoto.uri).then(r => r.blob()) : undefined;

      // Submit based on current status
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

      // Reset photos
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
      <View style={styles.statusCard}>
        <View style={[styles.statusIconContainer, { backgroundColor: config.bgColor }]}>
          <Feather name={config.icon} size={32} color={config.color} />
        </View>
        <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
        {status === 'APPROVED' && (
          <Text style={styles.statusDescription}>
            Your identity has been verified. You now have full access to all TANDER features.
          </Text>
        )}
        {status === 'PENDING' && (
          <Text style={styles.statusDescription}>
            Your verification is being reviewed. This usually takes 24-48 hours.
          </Text>
        )}
        {status === 'REJECTED' && statusData?.lastSubmission?.reviewerNotes && (
          <View style={styles.rejectionContainer}>
            <Text style={styles.rejectionTitle}>Reason for Rejection:</Text>
            <Text style={styles.rejectionReason}>{statusData.lastSubmission.reviewerNotes}</Text>
            {statusData.canResubmit && (
              <Text style={styles.resubmitHint}>You can resubmit your documents below.</Text>
            )}
          </View>
        )}
        {status === 'NOT_SUBMITTED' && (
          <Text style={styles.statusDescription}>
            Verify your identity to unlock all features and build trust with other members.
          </Text>
        )}
      </View>
    );
  };

  const renderPhotoUploader = (
    title: string,
    description: string,
    photo: ImagePicker.ImagePickerAsset | null,
    type: 'idFront' | 'idBack' | 'selfie',
    required: boolean = false
  ) => (
    <View style={styles.photoUploaderContainer}>
      <View style={styles.photoUploaderHeader}>
        <Text style={styles.photoUploaderTitle}>
          {title}
          {required && <Text style={styles.requiredStar}> *</Text>}
        </Text>
        <Text style={styles.photoUploaderDescription}>{description}</Text>
      </View>
      <TouchableOpacity
        style={[styles.photoUploader, photo && styles.photoUploaderWithImage]}
        onPress={() => pickImage(type)}
        activeOpacity={0.7}
        disabled={isSubmitting}
      >
        {photo ? (
          <>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <View style={styles.photoOverlay}>
              <Feather name="edit-2" size={20} color={colors.white} />
              <Text style={styles.photoOverlayText}>Change</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.photoPlaceholder}>
              <Feather
                name={type === 'selfie' ? 'camera' : 'image'}
                size={32}
                color={colors.gray[400]}
              />
            </View>
            <Text style={styles.photoUploaderHint}>
              {type === 'selfie' ? 'Take a Selfie' : 'Select Photo'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSubmissionHistory = () => {
    if (!statusData?.statusHistory || statusData.statusHistory.length === 0) return null;

    return (
      <View style={styles.historyContainer}>
        <Text style={styles.sectionTitle}>Verification History</Text>
        {statusData.statusHistory.map((entry, index) => (
          <View key={index} style={styles.historyItem}>
            <View style={styles.historyDot} />
            <View style={styles.historyContent}>
              <Text style={styles.historyStatus}>{entry.status.replace('_', ' ')}</Text>
              <Text style={styles.historyDate}>
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
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.orange[500]} />
        <Text style={styles.loadingText}>Loading verification status...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={Platform.OS === 'android'} />

      {/* Header */}
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <TouchableOpacity
          style={[styles.backButton, isLandscape && styles.backButtonLandscape]}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={isLandscape ? 18 : 22} color={colors.gray[600]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLandscape && styles.headerTitleLandscape]}>
          ID Verification
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={24} color={colors.semantic.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchStatus}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Status Card */}
            {renderStatusCard()}

            {/* Upload Section (only if can submit) */}
            {canSubmit && (
              <View style={styles.uploadSection}>
                <Text style={styles.sectionTitle}>
                  {status === 'REJECTED' ? 'Resubmit Documents' : 'Submit Documents'}
                </Text>
                <Text style={styles.sectionDescription}>
                  Please provide clear photos of a valid government-issued ID and a selfie for verification.
                </Text>

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

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!idFrontPhoto || !selfiePhoto || isSubmitting) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!idFrontPhoto || !selfiePhoto || isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Feather name="send" size={20} color={colors.white} />
                      <Text style={styles.submitButtonText}>
                        {status === 'REJECTED' ? 'Resubmit for Verification' : 'Submit for Verification'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* History Section */}
            {renderSubmissionHistory()}

            {/* Info Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Why Verify Your ID?</Text>
              <View style={styles.infoItem}>
                <Feather name="shield" size={20} color={colors.teal[500]} />
                <Text style={styles.infoText}>Build trust with other members</Text>
              </View>
              <View style={styles.infoItem}>
                <Feather name="check-circle" size={20} color={colors.teal[500]} />
                <Text style={styles.infoText}>Get a verified badge on your profile</Text>
              </View>
              <View style={styles.infoItem}>
                <Feather name="users" size={20} color={colors.teal[500]} />
                <Text style={styles.infoText}>Access all matching features</Text>
              </View>
              <View style={styles.infoItem}>
                <Feather name="lock" size={20} color={colors.teal[500]} />
                <Text style={styles.infoText}>Your data is encrypted and secure</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.m,
    fontSize: 16,
    color: colors.gray[600],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.s,
  },
  headerLandscape: {
    paddingHorizontal: spacing.l,
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
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray[900],
  },
  headerTitleLandscape: {
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.m,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.l,
    alignItems: 'center',
    ...shadows.small,
    marginBottom: spacing.m,
  },
  statusIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  statusLabel: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  statusDescription: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
  },
  rejectionContainer: {
    backgroundColor: '#FEF2F2',
    padding: spacing.m,
    borderRadius: borderRadius.medium,
    marginTop: spacing.m,
    width: '100%',
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.semantic.error,
    marginBottom: spacing.xs,
  },
  rejectionReason: {
    fontSize: 15,
    color: colors.gray[700],
    lineHeight: 22,
  },
  resubmitHint: {
    fontSize: 14,
    color: colors.teal[600],
    marginTop: spacing.s,
    fontWeight: '500',
  },
  uploadSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.m,
    ...shadows.small,
    marginBottom: spacing.m,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 15,
    color: colors.gray[600],
    lineHeight: 22,
    marginBottom: spacing.m,
  },
  photoUploaderContainer: {
    marginBottom: spacing.m,
  },
  photoUploaderHeader: {
    marginBottom: spacing.s,
  },
  photoUploaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
  },
  requiredStar: {
    color: colors.semantic.error,
  },
  photoUploaderDescription: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 2,
  },
  photoUploader: {
    height: 160,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    overflow: 'hidden',
  },
  photoUploaderWithImage: {
    borderStyle: 'solid',
    borderColor: colors.teal[300],
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  photoUploaderHint: {
    fontSize: 16,
    color: colors.gray[500],
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
    paddingVertical: spacing.s,
    gap: spacing.xs,
  },
  photoOverlayText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange[500],
    borderRadius: borderRadius.large,
    paddingVertical: spacing.m,
    gap: spacing.s,
    marginTop: spacing.m,
    ...shadows.medium,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  historyContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.m,
    ...shadows.small,
    marginBottom: spacing.m,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.m,
    paddingLeft: spacing.xs,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal[500],
    marginTop: 6,
    marginRight: spacing.m,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[800],
    textTransform: 'capitalize',
  },
  historyDate: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 2,
  },
  infoSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.m,
    ...shadows.small,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.m,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginBottom: spacing.s,
  },
  infoText: {
    fontSize: 15,
    color: colors.gray[700],
    flex: 1,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.m,
  },
  errorText: {
    fontSize: 16,
    color: colors.semantic.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.orange[500],
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.medium,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default IDVerificationSettingsScreen;
