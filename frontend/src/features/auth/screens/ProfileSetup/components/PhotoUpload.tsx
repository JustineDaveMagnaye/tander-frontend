/**
 * PhotoUpload Component
 * Profile photo upload with camera/gallery options
 */

import React, { memo, useCallback } from 'react';
import { View, Pressable, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing, shadows } from '@shared/styles/spacing';

interface PhotoUploadProps {
  photoUri: string | null;
  onPhotoChange: (uri: string | null) => void;
  size: number;
  accessibilityLabel: string;
}

export const PhotoUpload = memo(function PhotoUpload({
  photoUri,
  onPhotoChange,
  size,
  accessibilityLabel,
}: PhotoUploadProps) {
  const pickFromGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photos to set your profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onPhotoChange(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  }, [onPhotoChange]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera access to take your profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onPhotoChange(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  }, [onPhotoChange]);

  const showOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Profile Photo',
      'Choose how you want to add your photo',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [takePhoto, pickFromGallery]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={showOptions}
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {photoUri ? (
          <View style={styles.photoWrapper}>
            <Image
              source={{ uri: photoUri }}
              style={[
                styles.photo,
                { width: size, height: size, borderRadius: size / 2 },
              ]}
            />
            <View style={styles.editBadge}>
              <Feather name="camera" size={16} color={colors.white} />
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.placeholder,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <Feather name="camera" size={36} color={colors.gray[400]} />
            <Text variant="bodySmall" color={colors.gray[500]} style={styles.placeholderText}>
              Add Photo
            </Text>
          </View>
        )}
      </Pressable>
      <Text variant="caption" color={colors.gray[500]} style={styles.hint}>
        {photoUri ? 'Tap to change your photo' : 'Add a photo (optional)'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  pressable: {
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    borderWidth: 3,
    borderColor: colors.orange.primary,
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orange.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.small,
  },
  placeholder: {
    backgroundColor: colors.gray[100],
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: spacing.xs,
  },
  hint: {
    marginTop: spacing.s,
    textAlign: 'center',
  },
});
