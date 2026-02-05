/**
 * ImageGalleryModal Component
 * Premium full-screen image viewer with pinch-to-zoom and swipe navigation
 */

import React, { memo, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  FlatList,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  PinchGestureHandler,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { colors } from '@/shared/styles/colors';
import {
  premiumColors,
  premiumTypography,
  premiumSpacing,
  premiumRadius,
  premiumShadows,
  premiumAnimations,
} from '../styles/premiumStyles';
import { FONT_SCALING } from '@/shared/styles/fontScaling';

// ============================================================================
// TYPES
// ============================================================================

interface ImageItem {
  id: string;
  url: string;
  thumbnail?: string;
  caption?: string;
  timestamp?: string;
}

interface ImageGalleryModalProps {
  visible: boolean;
  images: ImageItem[];
  initialIndex?: number;
  onClose: () => void;
  onShare?: (image: ImageItem) => void;
  onSave?: (image: ImageItem) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 4;

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedImage = Animated.createAnimatedComponent(Image);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Header
const GalleryHeader = memo(({
  currentIndex,
  total,
  onClose,
}: {
  currentIndex: number;
  total: number;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.header, { paddingTop: insets.top + premiumSpacing.sm }]}
    >
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={styles.headerContent}>
        <Pressable
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>✕</Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          {currentIndex + 1} of {total}
        </Text>

        <View style={styles.headerSpacer} />
      </View>
    </Animated.View>
  );
});

// Footer with actions
const GalleryFooter = memo(({
  image,
  onShare,
  onSave,
}: {
  image: ImageItem;
  onShare?: (image: ImageItem) => void;
  onSave?: (image: ImageItem) => void;
}) => {
  const insets = useSafeAreaInsets();

  const handleShare = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onShare?.(image);
  }, [image, onShare]);

  const handleSave = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSave?.(image);
  }, [image, onSave]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.footer, { paddingBottom: insets.bottom + premiumSpacing.sm }]}
    >
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={styles.footerContent}>
        {image.caption && (
          <Text style={styles.caption} numberOfLines={2}>
            {image.caption}
          </Text>
        )}

        <View style={styles.actions}>
          {onShare && (
            <Pressable onPress={handleShare} style={styles.actionButton}>
              <Text style={styles.actionIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>↗️</Text>
              <Text style={styles.actionLabel}>Share</Text>
            </Pressable>
          )}
          {onSave && (
            <Pressable onPress={handleSave} style={styles.actionButton}>
              <Text style={styles.actionIcon} maxFontSizeMultiplier={FONT_SCALING.EMOJI}>💾</Text>
              <Text style={styles.actionLabel}>Save</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

// Zoomable Image
const ZoomableImage = memo(({
  uri,
  onSingleTap,
}: {
  uri: string;
  onSingleTap: () => void;
}) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [imageLoaded, setImageLoaded] = useState(false);

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(
        Math.max(savedScale.value * event.scale, MIN_SCALE),
        MAX_SCALE
      );
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE, premiumAnimations.spring.gentle);
        savedScale.value = MIN_SCALE;
      }
    });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart((event) => {
      'worklet';
      if (scale.value > 1) {
        // Zoom out
        scale.value = withSpring(1, premiumAnimations.spring.gentle);
        translateX.value = withSpring(0, premiumAnimations.spring.gentle);
        translateY.value = withSpring(0, premiumAnimations.spring.gentle);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom in to 2x at tap point
        scale.value = withSpring(2, premiumAnimations.spring.gentle);
        savedScale.value = 2;
      }
    });

  // Single tap gesture
  const singleTapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      runOnJS(onSingleTap)();
    });

  // Combine gestures
  const composedGestures = Gesture.Race(
    Gesture.Simultaneous(pinchGesture, panGesture),
    doubleTapGesture,
    singleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGestures}>
      <Animated.View style={styles.imageContainer}>
        <AnimatedImage
          source={{ uri }}
          style={[styles.image, animatedStyle]}
          resizeMode="contain"
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
});

// Thumbnail strip
const ThumbnailStrip = memo(({
  images,
  currentIndex,
  onSelect,
}: {
  images: ImageItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) => {
  if (images.length <= 1) return null;

  return (
    <View style={styles.thumbnailStrip}>
      {images.map((image, index) => (
        <Pressable
          key={image.id}
          onPress={() => onSelect(index)}
          style={[
            styles.thumbnail,
            index === currentIndex && styles.thumbnailActive,
          ]}
        >
          <Image
            source={{ uri: image.thumbnail || image.url }}
            style={styles.thumbnailImage}
          />
        </Pressable>
      ))}
    </View>
  );
});

// Page indicator dots
const PageIndicator = memo(({
  total,
  current,
}: {
  total: number;
  current: number;
}) => {
  if (total <= 1) return null;

  return (
    <View style={styles.pageIndicator}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === current && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ImageGalleryModal = memo(({
  visible,
  images,
  initialIndex = 0,
  onClose,
  onShare,
  onSave,
}: ImageGalleryModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  const handleThumbnailSelect = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  }, []);

  const renderImage = useCallback(({ item }: { item: ImageItem }) => (
    <ZoomableImage uri={item.url} onSingleTap={toggleControls} />
  ), [toggleControls]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);

  if (!visible || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Background */}
        <Animated.View
          entering={FadeIn}
          style={styles.background}
        />

        {/* Image viewer */}
        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderImage}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          bounces={false}
        />

        {/* Header */}
        {showControls && (
          <GalleryHeader
            currentIndex={currentIndex}
            total={images.length}
            onClose={onClose}
          />
        )}

        {/* Footer */}
        {showControls && currentImage && (
          <GalleryFooter
            image={currentImage}
            onShare={onShare}
            onSave={onSave}
          />
        )}

        {/* Page indicator */}
        {showControls && (
          <View style={styles.pageIndicatorContainer}>
            <PageIndicator total={images.length} current={currentIndex} />
          </View>
        )}
      </View>
    </Modal>
  );
});

ImageGalleryModal.displayName = 'ImageGalleryModal';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },

  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: premiumSpacing.lg,
    paddingVertical: premiumSpacing.md,
    backgroundColor: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: premiumTypography.sizes.body,
    fontWeight: '600',
    color: colors.white,
  },
  headerSpacer: {
    width: 36,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  footerContent: {
    paddingHorizontal: premiumSpacing.lg,
    paddingVertical: premiumSpacing.md,
    backgroundColor: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
  },
  caption: {
    fontSize: premiumTypography.sizes.subheadline,
    color: colors.white,
    marginBottom: premiumSpacing.md,
    lineHeight: premiumTypography.sizes.subheadline * 1.4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: premiumSpacing.xxl,
  },
  actionButton: {
    alignItems: 'center',
    padding: premiumSpacing.sm,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: premiumSpacing.xxs,
  },
  actionLabel: {
    fontSize: premiumTypography.sizes.footnote,
    color: colors.white,
    fontWeight: '500',
  },

  // Image
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: premiumTypography.sizes.body,
  },

  // Thumbnail strip
  thumbnailStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: premiumSpacing.sm,
    gap: premiumSpacing.xs,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: premiumRadius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.white,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },

  // Page indicator
  pageIndicatorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pageIndicator: {
    flexDirection: 'row',
    gap: premiumSpacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default ImageGalleryModal;
