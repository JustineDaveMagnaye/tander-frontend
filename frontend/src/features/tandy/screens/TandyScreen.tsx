/**
 * TANDER TandyScreen - Wellness Companion Chat Interface
 *
 * Design Pattern: Matches ChatScreen.tsx exactly
 * - Regular View container (NOT a Modal)
 * - Header with back button, avatar, title, action buttons
 * - Messages list with FlatList
 * - Input area with emoji, text input, send button
 * - Breathing exercise as a separate modal
 *
 * UI/UX Enhancements:
 * - Header shadow for visual depth
 * - Smooth thinking indicator with bounce animation
 * - Message entrance animations
 * - Quick reply press feedback with scale animation
 * - Message status indicators
 * - Enhanced sponsor card with better visual hierarchy
 * - Comprehensive accessibility labels and hints
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  ActivityIndicator,
  Animated,
  Keyboard,
  Image,
  ScrollView,
  Linking,
  Pressable,
  AccessibilityInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TandyStackParamList } from '@navigation/types';

type TandyChatNavigationProp = NativeStackNavigationProp<TandyStackParamList, 'TandyChat'>;
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { TanderLogoIcon } from '@shared/components/icons/TanderLogoIcon';
import { useResponsive } from '@shared/hooks/useResponsive';
import {
  getConversation,
  sendMessage as sendTandyMessage,
  TandyConversationDTO,
  TandySendMessageResponse,
  TandyMessageDTO,
  SponsorAdDTO,
  formatMessageTime,
} from '@services/api/tandyApi';

// ============================================================================
// RESPONSIVE PHOTO DIMENSIONS HOOK
// ============================================================================

const usePhotoWidth = () => {
  const { isLandscape, isTablet, wp } = useResponsive();

  return React.useMemo(() => {
    if (isLandscape) return Math.min(wp(30), 200);
    if (isTablet) return Math.min(wp(40), 280);
    return Math.min(wp(60), 280);
  }, [isLandscape, isTablet, wp]);
};

// ============================================================================
// TYPES
// ============================================================================

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'error';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'tandy';
  timestamp: string;
  sponsorAd?: SponsorAdDTO;
  status?: MessageStatus;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FALLBACK_GREETING: Message = {
  id: 'fallback_1',
  text: "Hello! I'm Tandy, your wellness companion. I'm here to chat, listen, and help you relax. How are you feeling today?",
  sender: 'tandy',
  timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  status: 'delivered',
};

const QUICK_REPLIES = [
  "I'm feeling good",
  "I need to relax",
  "Tell me a joke",
  "I'm feeling lonely",
];

const FALLBACK_RESPONSES: { [key: string]: string } = {
  "i'm feeling good": "That's wonderful to hear! A positive mindset is so important. What's making you happy today?",
  "i need to relax": "I understand. Would you like to try a guided breathing exercise? It can help calm your mind and body.",
  "tell me a joke": "Here's one for you: Why don't scientists trust atoms? Because they make up everything!",
  "i'm feeling lonely": "I'm sorry you're feeling that way. Remember, it's okay to feel lonely sometimes. I'm here with you. Would you like to chat about what's on your mind?",
  "default": "Thank you for sharing that with me. I'm here to listen and support you. How can I help you feel better today?",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const convertToMessage = (dto: TandyMessageDTO): Message => ({
  id: `msg_${dto.id}`,
  text: dto.content,
  sender: dto.role === 'user' ? 'user' : 'tandy',
  timestamp: formatMessageTime(dto.timestamp),
  status: 'delivered',
});

const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get icon for sponsor type
const getSponsorIcon = (type: string): keyof typeof Feather.glyphMap => {
  switch (type?.toUpperCase()) {
    case 'FINANCIAL': return 'dollar-sign';
    case 'HEALTH': return 'heart';
    case 'INSURANCE': return 'shield';
    case 'RETAIL': return 'shopping-bag';
    case 'FOOD': return 'coffee';
    default: return 'gift';
  }
};

// Get color for sponsor type
const getSponsorColor = (type: string): string => {
  switch (type?.toUpperCase()) {
    case 'FINANCIAL': return '#10B981'; // green
    case 'HEALTH': return colors.teal[500];
    case 'INSURANCE': return '#8B5CF6'; // purple
    case 'RETAIL': return colors.orange[500];
    case 'FOOD': return '#F59E0B'; // amber
    default: return colors.teal[500];
  }
};

// ============================================================================
// MESSAGE STATUS INDICATOR COMPONENT
// ============================================================================

interface MessageStatusIndicatorProps {
  status: MessageStatus;
}

const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({ status }) => {
  const getStatusIcon = (): keyof typeof Feather.glyphMap => {
    switch (status) {
      case 'sending': return 'clock';
      case 'sent': return 'check';
      case 'delivered': return 'check-circle';
      case 'error': return 'alert-circle';
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'sending': return colors.gray[400];
      case 'sent': return colors.gray[400];
      case 'delivered': return colors.teal[500];
      case 'error': return colors.semantic.error;
    }
  };

  return (
    <View style={styles.statusIndicator}>
      <Feather name={getStatusIcon()} size={12} color={getStatusColor()} />
    </View>
  );
};

// ============================================================================
// ANIMATED PRESSABLE BUTTON COMPONENT
// ============================================================================

interface AnimatedPressableProps {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  onPress,
  style,
  children,
  accessibilityLabel,
  accessibilityHint,
  disabled,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    // TODO: Add haptic feedback - Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 100,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// ============================================================================
// SPONSOR CARD BUBBLE COMPONENT
// ============================================================================

interface SponsorCardBubbleProps {
  sponsor: SponsorAdDTO;
}

const PHOTO_HEIGHT = 160;

const SponsorCardBubble: React.FC<SponsorCardBubbleProps> = ({ sponsor }) => {
  const PHOTO_WIDTH = usePhotoWidth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(1)).current;

  const iconName = getSponsorIcon(sponsor.sponsorType);
  const iconColor = getSponsorColor(sponsor.sponsorType);

  const handlePressIn = () => {
    Animated.spring(cardScaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handlePress = () => {
    const toValue = isExpanded ? 0 : 1;

    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setIsExpanded(!isExpanded);
  };

  const handlePhotoScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (PHOTO_WIDTH + 12));
    setActivePhotoIndex(index);
  };

  const handleLearnMore = () => {
    if (sponsor.websiteUrl) {
      Linking.openURL(sponsor.websiteUrl).catch(() => {});
    }
  };

  const handleCall = () => {
    if (sponsor.phoneNumber) {
      Linking.openURL(`tel:${sponsor.phoneNumber}`).catch(() => {});
    }
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const hasPhotos = sponsor.photos && sponsor.photos.length > 0;
  const hasProducts = sponsor.recommendedProducts && sponsor.recommendedProducts.length > 0;
  const hasLocation = sponsor.nearestLocation;

  return (
    <View style={styles.sponsorCardContainer}>
      <View style={styles.sponsorCardHeader}>
        <TanderLogoIcon size={14} focused />
        <Text style={styles.sponsorCardLabel}>Tandy Recommends</Text>
      </View>

      <Animated.View style={[styles.sponsorCard, { transform: [{ scale: cardScaleAnim }] }]}>
        {/* Clickable Header */}
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityLabel={`Sponsor: ${sponsor.sponsorName}. Tap to ${isExpanded ? 'collapse' : 'expand'}`}
          accessibilityHint={`Shows ${isExpanded ? 'less' : 'more'} information about ${sponsor.sponsorName}`}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[`${iconColor}15`, `${iconColor}08`]}
            style={styles.sponsorCardGradient}
          >
            {/* Sponsor Icon/Logo */}
            <View style={[styles.sponsorIconWrapper, { backgroundColor: `${iconColor}20` }]}>
              {sponsor.logoUrl ? (
                <Image
                  source={{ uri: sponsor.logoUrl }}
                  style={styles.sponsorLogo}
                  resizeMode="contain"
                  accessibilityLabel={`${sponsor.sponsorName} logo`}
                />
              ) : (
                <Feather name={iconName} size={28} color={iconColor} />
              )}
            </View>

            {/* Sponsor Info */}
            <View style={styles.sponsorInfo}>
              <Text style={styles.sponsorName}>{sponsor.sponsorName}</Text>
              <Text style={styles.sponsorType}>{sponsor.sponsorType}</Text>
              {!isExpanded && sponsor.message && (
                <Text style={styles.sponsorMessage} numberOfLines={1}>
                  {sponsor.message}
                </Text>
              )}
            </View>

            {/* Expand Arrow */}
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Feather name="chevron-right" size={24} color={colors.gray[400]} />
            </Animated.View>
          </LinearGradient>
        </Pressable>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.sponsorExpanded}>
            {/* Full Message */}
            {sponsor.message && (
              <View style={styles.sponsorSection}>
                <Text style={styles.sponsorFullMessage}>{sponsor.message}</Text>
              </View>
            )}

            {/* Photo Gallery */}
            {hasPhotos && (
              <View style={styles.photoGallerySection}>
                <View style={styles.sponsorSectionHeader}>
                  <Feather name="image" size={16} color={iconColor} />
                  <Text style={styles.sponsorSectionTitle}>Photos</Text>
                  <Text style={styles.photoCounter}>
                    {activePhotoIndex + 1}/{sponsor.photos!.length}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled={false}
                  decelerationRate="fast"
                  snapToInterval={PHOTO_WIDTH + 12}
                  snapToAlignment="start"
                  contentContainerStyle={styles.photoScrollContent}
                  onScroll={handlePhotoScroll}
                  scrollEventThrottle={16}
                  accessibilityLabel="Sponsor photo gallery"
                >
                  {sponsor.photos!.map((photo, index) => (
                    <View key={photo.id || index} style={[styles.photoCard, { width: PHOTO_WIDTH }]}>
                      <Image
                        source={{ uri: photo.url }}
                        style={styles.sponsorPhoto}
                        resizeMode="cover"
                        accessibilityLabel={photo.caption || `Photo ${index + 1}`}
                      />
                      {photo.caption && (
                        <View style={styles.photoCaptionContainer}>
                          <Text style={styles.photoCaption} numberOfLines={2}>
                            {photo.caption}
                          </Text>
                        </View>
                      )}
                      {photo.isPrimary && (
                        <View style={[styles.primaryBadge, { backgroundColor: iconColor }]}>
                          <Feather name="star" size={10} color={colors.white} />
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
                {/* Photo Dots Indicator */}
                {sponsor.photos!.length > 1 && (
                  <View style={styles.photoDots}>
                    {sponsor.photos!.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.photoDot,
                          index === activePhotoIndex && { backgroundColor: iconColor, width: 16 },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Large Logo/Banner if no photos */}
            {!hasPhotos && sponsor.logoUrl && (
              <View style={styles.sponsorBannerContainer}>
                <Image
                  source={{ uri: sponsor.logoUrl }}
                  style={styles.sponsorBanner}
                  resizeMode="cover"
                  accessibilityLabel={`${sponsor.sponsorName} banner`}
                />
              </View>
            )}

            {/* Products */}
            {hasProducts && (
              <View style={styles.sponsorSection}>
                <View style={styles.sponsorSectionHeader}>
                  <Feather name="package" size={16} color={iconColor} />
                  <Text style={styles.sponsorSectionTitle}>Products & Services</Text>
                </View>
                {sponsor.recommendedProducts!.map((product, index) => (
                  <View key={product.id || index} style={styles.productCard}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productDescription} numberOfLines={2}>
                        {product.description}
                      </Text>
                      {product.category && (
                        <View style={[styles.productCategory, { backgroundColor: `${iconColor}15` }]}>
                          <Text style={[styles.productCategoryText, { color: iconColor }]}>
                            {product.category}
                          </Text>
                        </View>
                      )}
                    </View>
                    {product.price > 0 && (
                      <Text style={[styles.productPrice, { color: iconColor }]}>
                        P{product.price.toLocaleString()}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Location */}
            {hasLocation && (
              <View style={styles.sponsorSection}>
                <View style={styles.sponsorSectionHeader}>
                  <Feather name="map-pin" size={16} color={iconColor} />
                  <Text style={styles.sponsorSectionTitle}>Nearest Location</Text>
                </View>
                <View style={styles.locationCard}>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{sponsor.nearestLocation!.name}</Text>
                    <Text style={styles.locationAddress}>{sponsor.nearestLocation!.address}</Text>
                    {sponsor.nearestLocation!.city && (
                      <Text style={styles.locationCity}>{sponsor.nearestLocation!.city}</Text>
                    )}
                  </View>
                  {sponsor.nearestLocation!.distanceText && (
                    <View style={[styles.distanceBadge, { backgroundColor: `${iconColor}15` }]}>
                      <Feather name="navigation" size={12} color={iconColor} />
                      <Text style={[styles.distanceText, { color: iconColor }]}>
                        {sponsor.nearestLocation!.distanceText}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.sponsorActions}>
              {sponsor.phoneNumber && (
                <AnimatedPressable
                  onPress={handleCall}
                  style={[styles.sponsorCallBtn, { borderColor: iconColor }]}
                  accessibilityLabel={`Call ${sponsor.sponsorName}`}
                  accessibilityHint="Opens phone dialer"
                >
                  <Feather name="phone" size={18} color={iconColor} />
                  <Text style={[styles.sponsorCallBtnText, { color: iconColor }]}>Call</Text>
                </AnimatedPressable>
              )}
              <AnimatedPressable
                onPress={handleLearnMore}
                style={[styles.sponsorActionBtn, { backgroundColor: iconColor, flex: sponsor.phoneNumber ? 1 : undefined }]}
                accessibilityLabel={`Learn more about ${sponsor.sponsorName}`}
                accessibilityHint="Opens website in browser"
              >
                <Text style={styles.sponsorActionBtnText}>Learn More</Text>
                <Feather name="external-link" size={16} color={colors.white} />
              </AnimatedPressable>
            </View>
          </View>
        )}

        {/* Collapsed Location Preview */}
        {!isExpanded && hasLocation && (
          <View style={styles.sponsorLocationPreview}>
            <Feather name="map-pin" size={14} color={colors.gray[500]} />
            <Text style={styles.sponsorLocationText}>
              {sponsor.nearestLocation!.name}
              {sponsor.nearestLocation!.distanceText && ` - ${sponsor.nearestLocation!.distanceText}`}
            </Text>
          </View>
        )}

        {/* Tap hint when collapsed - Enhanced for seniors with icon and better contrast */}
        {!isExpanded && (
          <View style={[styles.tapHint, { borderTopColor: `${iconColor}20` }]}>
            <Feather name="chevron-down" size={16} color={iconColor} />
            <Text style={[styles.tapHintText, { color: iconColor }]}>Tap to see more details</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

// ============================================================================
// ENHANCED THINKING INDICATOR COMPONENT
// Improved for seniors: Larger dots (10px), stronger contrast, clearer text
// ============================================================================

interface ThinkingIndicatorProps {
  reduceMotion?: boolean;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ reduceMotion = false }) => {
  const dot1 = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const dot2 = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const dot3 = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const containerOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const containerSlide = useRef(new Animated.Value(reduceMotion ? 0 : 20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Skip animations if user prefers reduced motion
    if (reduceMotion) {
      containerOpacity.setValue(1);
      containerSlide.setValue(0);
      dot1.setValue(1);
      dot2.setValue(1);
      dot3.setValue(1);
      return;
    }

    // Entrance animation
    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(containerSlide, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }),
    ]).start();

    // Subtle pulse animation for the entire bubble
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Dot animations with smooth bounce effect
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.spring(dot, {
            toValue: 1,
            useNativeDriver: true,
            friction: 3,
            tension: 80,
          }),
          Animated.spring(dot, {
            toValue: 0,
            useNativeDriver: true,
            friction: 3,
            tension: 80,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400),
    ]);

    animation.start();

    return () => {
      animation.stop();
      pulseAnimation.stop();
    };
  }, [dot1, dot2, dot3, containerOpacity, containerSlide, pulseAnim, reduceMotion]);

  const getDotStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    }),
    transform: [
      {
        scale: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.5],
        }),
      },
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
    ],
  });

  return (
    <Animated.View
      style={[
        styles.thinkingContainer,
        {
          opacity: containerOpacity,
          transform: [{ translateY: containerSlide }, { scale: pulseAnim }],
        },
      ]}
      accessibilityLabel="Tandy is thinking about your message. Please wait."
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      <View style={styles.thinkingBubble}>
        <View style={styles.thinkingHeader}>
          <TanderLogoIcon size={18} focused />
          <Text style={styles.thinkingLabel}>Tandy</Text>
        </View>
        <View style={styles.thinkingContent}>
          <Text style={styles.thinkingText}>Thinking</Text>
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
            <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
            <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// MESSAGE BUBBLE COMPONENT (with entrance animation)
// ============================================================================

interface MessageBubbleProps {
  message: Message;
  index: number;
  reduceMotion?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, index, reduceMotion = false }) => {
  const isOwn = message.sender === 'user';
  const { isTablet, isLandscape, wp } = useResponsive();
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(reduceMotion ? 0 : (isOwn ? 30 : -30))).current;

  // Responsive message bubble width
  const messageBubbleMaxWidth = React.useMemo(() => {
    if (isLandscape) {
      return isTablet ? wp(45) : wp(50);
    }
    return isTablet ? wp(60) : wp(75);
  }, [isLandscape, isTablet, wp]);

  // Entrance animation (respects reduced motion preference)
  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }

    const delay = Math.min(index * 50, 200); // Stagger animation

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isOwn && styles.messageRowOwn,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={[styles.messageContent, { maxWidth: messageBubbleMaxWidth }]}>
        {isOwn ? (
          <LinearGradient
            colors={[colors.orange[500], colors.orange[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bubbleOwn}
          >
            <Text style={styles.bubbleTextOwn}>{message.text}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.bubbleOther}>
            <View style={styles.tandyLabel}>
              <TanderLogoIcon size={16} focused />
              <Text style={styles.tandyLabelText}>Tandy</Text>
            </View>
            <Text style={styles.bubbleTextOther}>{message.text}</Text>
          </View>
        )}
        <View style={[styles.timeRow, isOwn && styles.timeRowOwn]}>
          <Text style={[styles.timeText, isOwn && styles.timeTextOwn]}>
            {message.timestamp}
          </Text>
          {isOwn && message.status && (
            <MessageStatusIndicator status={message.status} />
          )}
        </View>

        {/* Sponsor Card (only for Tandy messages with sponsor ads) */}
        {!isOwn && message.sponsorAd && (
          <SponsorCardBubble sponsor={message.sponsorAd} />
        )}
      </View>
    </Animated.View>
  );
};

// ============================================================================
// QUICK REPLY BUTTON COMPONENT
// Enhanced for seniors: Larger touch targets (56px min), bigger text (17px),
// visual feedback with color change, icon for affordance
// ============================================================================

interface QuickReplyButtonProps {
  text: string;
  onPress: () => void;
  index: number;
  reduceMotion?: boolean;
}

const QuickReplyButton: React.FC<QuickReplyButtonProps> = ({ text, onPress, index, reduceMotion = false }) => {
  const scaleAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0.9)).current;
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    // Skip entrance animation if user prefers reduced motion
    if (reduceMotion) {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      return;
    }

    // Staggered entrance animation with bounce for visual delight
    Animated.sequence([
      Animated.delay(index * 80),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, scaleAnim, index, reduceMotion]);

  const handlePressIn = () => {
    setIsPressed(true);
    // Skip press animation if user prefers reduced motion
    if (reduceMotion) return;
    // TODO: Add haptic feedback - Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    // Skip press animation if user prefers reduced motion
    if (reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 100,
    }).start();
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Quick reply: ${text}`}
        accessibilityHint="Double tap to send this message to Tandy"
        accessibilityRole="button"
      >
        <View style={[
          styles.quickReplyBtn,
          isPressed && styles.quickReplyBtnPressed,
        ]}>
          <View style={[
            styles.quickReplyIconContainer,
            isPressed && styles.quickReplyIconContainerPressed,
          ]}>
            <Feather
              name="message-circle"
              size={18}
              color={isPressed ? colors.white : colors.teal[500]}
            />
          </View>
          <Text style={[
            styles.quickReplyText,
            isPressed && styles.quickReplyTextPressed,
          ]}>
            {text}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT (Matches ChatScreen pattern exactly)
// ============================================================================

export const TandyScreen: React.FC = () => {
  const navigation = useNavigation<TandyChatNavigationProp>();
  const insets = useSafeAreaInsets();
  const { width, isLandscape, isTablet, getScreenMargin } = useResponsive();
  const flatListRef = useRef<FlatList>(null);
  const isSmallDevice = width <= 375;
  const isPhoneLandscape = isLandscape && !isTablet;

  // Responsive horizontal padding
  const horizontalPadding = React.useMemo(() => {
    if (isPhoneLandscape) return Math.max(insets.left + 12, 16);
    return getScreenMargin();
  }, [isPhoneLandscape, insets.left, getScreenMargin]);

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accessibility: Reduced motion preference
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const checkReduceMotion = async () => {
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReduceMotion(isReduceMotionEnabled);
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => setReduceMotion(isEnabled)
    );

    return () => subscription?.remove();
  }, []);

  // Navigate to breathing screen
  const handleOpenBreathing = useCallback(() => {
    navigation.navigate('TandyBreathing');
  }, [navigation]);

  // Navigate to meditation screen
  const handleOpenMeditation = useCallback(() => {
    navigation.navigate('TandyMeditation');
  }, [navigation]);

  // Keyboard handling
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    const hideListener = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [keyboardHeight]);

  // Load conversation on mount
  useEffect(() => {
    loadConversation();
  }, []);

  const loadConversation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const conversation: TandyConversationDTO = await getConversation();

      if (conversation.messages && conversation.messages.length > 0) {
        setMessages(conversation.messages.map(convertToMessage));
      } else {
        setMessages([{
          id: 'greeting_1',
          text: conversation.greeting || FALLBACK_GREETING.text,
          sender: 'tandy',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          status: 'delivered',
        }]);
      }
    } catch (err) {
      console.warn('Failed to load conversation:', err);
      setError('Unable to connect. Using offline mode.');
      setMessages([FALLBACK_GREETING]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Handlers
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText || isSending) return;

    const tempUserMessage: Message = {
      id: generateTempId(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      status: 'sending',
    };

    setMessages(prev => [...prev, tempUserMessage]);
    setInputText('');
    setIsSending(true);
    setError(null);

    try {
      const response: TandySendMessageResponse = await sendTandyMessage({ message: messageText });

      if (response.success && response.assistantMessage) {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMessage.id);

          // Convert assistant message and attach sponsor ad if present
          const assistantMsg = convertToMessage(response.assistantMessage!);
          if (response.hasSponsorAd && response.sponsorAd) {
            assistantMsg.sponsorAd = response.sponsorAd;
          }

          const userMsg = convertToMessage(response.userMessage);
          userMsg.status = 'delivered';

          return [...filtered, userMsg, assistantMsg];
        });

        if (response.suggestBreathing) {
          setTimeout(() => handleOpenBreathing(), 1500);
        }
      } else {
        throw new Error(response.error || 'Failed to get response');
      }
    } catch (err) {
      console.warn('Failed to send message:', err);

      // Update message status to error
      setMessages(prev => prev.map(m =>
        m.id === tempUserMessage.id ? { ...m, status: 'error' as MessageStatus } : m
      ));

      const lowerText = messageText.toLowerCase();
      let fallbackResponse = FALLBACK_RESPONSES.default;
      for (const key in FALLBACK_RESPONSES) {
        if (lowerText.includes(key)) {
          fallbackResponse = FALLBACK_RESPONSES[key];
          break;
        }
      }

      setMessages(prev => [...prev, {
        id: generateTempId(),
        text: fallbackResponse,
        sender: 'tandy',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        status: 'delivered',
      }]);
      setError('Offline mode - responses may be limited');
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, handleOpenBreathing]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => (
    <MessageBubble message={item} index={index} reduceMotion={reduceMotion} />
  ), [reduceMotion]);

  const showQuickReplies = messages.length === 1 && messages[0].sender === 'tandy';

  // Welcome header component for new conversations
  const WelcomeHeader = useCallback(() => {
    if (!showQuickReplies) return null;

    return (
      <View style={styles.welcomeHeader}>
        <View style={styles.welcomeIconContainer}>
          <TanderLogoIcon size={64} focused />
        </View>
        <Text style={styles.welcomeTitle}>Chat with Tandy</Text>
        <Text style={styles.welcomeSubtitle}>
          Your wellness companion is here to help with relaxation, breathing exercises, and friendly conversation.
        </Text>

        {/* Quick suggestion buttons */}
        <View style={styles.quickSuggestionsContainer}>
          <Text style={styles.quickSuggestionsLabel}>Try asking:</Text>
          <View style={styles.quickSuggestionsGrid}>
            <QuickReplyButton
              text="How are you today?"
              onPress={() => handleSendMessage("How are you today?")}
              index={0}
              reduceMotion={reduceMotion}
            />
            <QuickReplyButton
              text="I need to relax"
              onPress={() => handleSendMessage("I need to relax")}
              index={1}
              reduceMotion={reduceMotion}
            />
            <QuickReplyButton
              text="Tell me something nice"
              onPress={() => handleSendMessage("Tell me something nice")}
              index={2}
              reduceMotion={reduceMotion}
            />
          </View>
        </View>
      </View>
    );
  }, [showQuickReplies, reduceMotion, handleSendMessage]);

  // ============================================================================
  // RENDER (Matches ChatScreen pattern exactly)
  // ============================================================================
  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.orange[500]} />

      <View style={styles.container}>
        <View style={[styles.mainContent, { paddingTop: insets.top }]}>
          {/* Header with shadow */}
          <View style={styles.headerShadowContainer}>
            <LinearGradient
              colors={[colors.orange[500], colors.teal[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.header,
                isSmallDevice && styles.headerSmall,
                isPhoneLandscape && styles.headerLandscape,
                { paddingLeft: Math.max(insets.left + 16, 16), paddingRight: Math.max(insets.right + 16, 16) }
              ]}
            >
              <View style={styles.headerLeft}>
                {/* Back Button */}
                <AnimatedPressable
                  onPress={handleBack}
                  style={styles.headerBackButton}
                  accessibilityLabel="Go back"
                  accessibilityHint="Returns to previous screen"
                >
                  <Feather name="arrow-left" size={24} color={colors.white} />
                </AnimatedPressable>

                {/* Avatar & Info */}
                <View style={styles.headerUserInfo}>
                  <View style={styles.headerAvatarWrapper}>
                    <View style={styles.headerAvatar}>
                      <TanderLogoIcon size={24} focused />
                    </View>
                    <View style={styles.headerOnlineDot} />
                  </View>
                  <View style={styles.headerNameContainer}>
                    <Text style={styles.headerName}>Tandy</Text>
                    <Text style={styles.headerStatus}>Your Wellness Companion</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.headerActions}>
                <AnimatedPressable
                  onPress={handleOpenBreathing}
                  style={styles.headerActionButton}
                  accessibilityLabel="Start breathing exercise"
                  accessibilityHint="Opens breathing exercise screen"
                >
                  <Feather name="wind" size={20} color={colors.white} />
                </AnimatedPressable>
              </View>
            </LinearGradient>
          </View>

          {/* Error Banner */}
          {error && (
            <View
              style={styles.errorBanner}
              accessibilityRole="alert"
              accessibilityLabel={error}
            >
              <Feather name="wifi-off" size={16} color={colors.orange[600]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Messages Area - Scrollable */}
          <View style={styles.messagesContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.orange[500]} />
                <Text style={styles.loadingText}>Connecting to Tandy...</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                style={styles.flatList}
                contentContainerStyle={[
                  styles.messagesList,
                  messages.length === 0 && styles.emptyMessagesList,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListHeaderComponent={<WelcomeHeader />}
                ListFooterComponent={isSending ? <ThinkingIndicator reduceMotion={reduceMotion} /> : null}
                accessibilityLabel="Chat messages"
                contentInset={{ top: 0 }}
                automaticallyAdjustContentInsets={false}
              />
            )}
          </View>

          {/* Bottom Fixed Area */}
          <Animated.View style={[styles.bottomFixedContainer, { marginBottom: keyboardHeight }]}>
            {/* Input Area */}
            <View style={[
              styles.inputContainer,
              isSmallDevice && styles.inputContainerSmall,
              isPhoneLandscape && styles.inputContainerLandscape,
              {
                paddingBottom: Math.max(insets.bottom, 12),
                paddingLeft: Math.max(insets.left + 16, horizontalPadding),
                paddingRight: Math.max(insets.right + 16, horizontalPadding),
              }
            ]}>
              <TouchableOpacity
                style={styles.emojiButton}
                accessibilityLabel="Add emoji"
                accessibilityHint="Opens emoji picker"
                accessibilityRole="button"
              >
                <Feather name="smile" size={20} color={colors.teal[500]} />
              </TouchableOpacity>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your message..."
                  placeholderTextColor={colors.gray[400]}
                  multiline
                  maxLength={1000}
                  onSubmitEditing={() => handleSendMessage()}
                  accessibilityLabel="Message input"
                  accessibilityHint="Type your message to Tandy"
                />
              </View>

              {inputText.trim() ? (
                <AnimatedPressable
                  onPress={() => handleSendMessage()}
                  disabled={isSending}
                  accessibilityLabel="Send message"
                  accessibilityHint="Sends your message to Tandy"
                >
                  <LinearGradient
                    colors={isSending ? [colors.gray[400], colors.gray[500]] : [colors.orange[500], colors.teal[500]]}
                    style={styles.sendButton}
                  >
                    <Feather name="send" size={20} color={colors.white} />
                  </LinearGradient>
                </AnimatedPressable>
              ) : (
                <AnimatedPressable
                  onPress={() => handleSendMessage('👍')}
                  disabled={isSending}
                  accessibilityLabel="Send thumbs up"
                  accessibilityHint="Sends a thumbs up reaction"
                >
                  <View style={styles.likeButton}>
                    <Feather name="thumbs-up" size={20} color={colors.teal[500]} />
                  </View>
                </AnimatedPressable>
              )}
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// STYLES (Matches ChatScreen pattern exactly)
// ============================================================================

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },

  // Header with shadow
  headerShadowContainer: {
    backgroundColor: colors.orange[500],
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSmall: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLandscape: {
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerBackButton: {
    width: 48, // Increased from 44px for better touch target
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerNameContainer: {
    flex: 1,
    flexShrink: 1,
  },
  headerAvatarWrapper: {
    position: 'relative',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.teal[500],
    borderWidth: 2,
    borderColor: colors.white,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.3,
  },
  headerStatus: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 48, // Increased from 44px for better touch target
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.orange[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.orange[100],
  },
  errorText: {
    fontSize: 14,
    color: colors.orange[700],
  },

  // Messages
  messagesContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flatList: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  // Bottom fixed container for wellness buttons and input
  bottomFixedContainer: {
    backgroundColor: colors.white,
  },
  emptyMessagesList: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray[500],
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageContent: {
    maxWidth: '75%',
  },
  // Message bubbles - Enhanced for seniors with larger text and better padding
  bubbleOwn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
  },
  bubbleTextOwn: {
    fontSize: 18, // Increased from 16px for better readability
    lineHeight: 26,
    color: colors.white,
  },
  bubbleOther: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
  },
  tandyLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tandyLabelText: {
    fontSize: 13, // Increased from 12px
    fontWeight: '700',
    color: colors.teal[600],
  },
  bubbleTextOther: {
    fontSize: 18, // Increased from 16px for better readability
    lineHeight: 26,
    color: colors.gray[900],
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    gap: 6,
  },
  timeRowOwn: {
    justifyContent: 'flex-end',
  },
  timeText: {
    fontSize: 14, // Senior-friendly minimum (increased from 12)
    color: colors.gray[500], // Slightly darker for better contrast
  },
  timeTextOwn: {
    textAlign: 'right',
  },
  statusIndicator: {
    marginLeft: 2,
  },

  // Welcome Header - Shown for new conversations
  welcomeHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  welcomeIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.teal[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  quickSuggestionsContainer: {
    marginTop: 24,
    width: '100%',
  },
  quickSuggestionsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
    marginBottom: 12,
    textAlign: 'center',
  },
  quickSuggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },

  // Quick Replies - Enhanced for seniors with larger targets and better visual feedback
  quickRepliesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  quickRepliesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
    marginBottom: 12,
  },
  quickRepliesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickReplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.teal[200],
    borderRadius: 16,
    minHeight: 56, // Senior-friendly touch target (56px)
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[500],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  quickReplyBtnPressed: {
    backgroundColor: colors.teal[500],
    borderColor: colors.teal[600],
  },
  quickReplyIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.teal[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickReplyIconContainerPressed: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  quickReplyText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray[800],
  },
  quickReplyTextPressed: {
    color: colors.white,
  },

  // Wellness - Enhanced for seniors with larger buttons and clearer text
  wellnessContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  wellnessBtn: {
    flex: 1,
    minHeight: 80, // Increased from 70px for better touch target
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  wellnessBtnGradient: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  wellnessBtnText: {
    fontSize: 16, // Increased from 14px for better readability
    fontWeight: '700',
  },
  // Landscape wellness styles
  wellnessContainerLandscape: {
    paddingBottom: 10,
  },
  wellnessBtnLandscape: {
    minHeight: 56, // Increased from 52px
  },
  wellnessBtnGradientLandscape: {
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
  },
  wellnessBtnTextLandscape: {
    fontSize: 15, // Increased from 13px
  },

  // Input - Enhanced for seniors with larger touch targets and better spacing
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  inputContainerSmall: {
    paddingHorizontal: 12,
    gap: 8,
  },
  inputContainerLandscape: {
    paddingVertical: 10,
    paddingTop: 10,
  },
  emojiButton: {
    width: 48, // Increased from 44px
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.teal[50],
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 10,
    minHeight: 56, // Increased from 48px for senior-friendly touch target
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  textInput: {
    flex: 1,
    fontSize: 18, // Increased from 16px for better readability
    color: colors.gray[900],
    paddingVertical: 12,
    maxHeight: 120,
    lineHeight: 24,
  },
  sendButton: {
    width: 52, // Increased from 48px
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButton: {
    width: 52, // Increased from 48px
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.teal[50],
  },

  // Sponsor Card in Chat
  sponsorCardContainer: {
    marginTop: 12,
  },
  sponsorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sponsorCardLabel: {
    fontSize: 14, // Senior-friendly minimum (increased from 12)
    fontWeight: '600',
    color: colors.orange[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sponsorCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sponsorCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  sponsorIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsorLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  sponsorInfo: {
    flex: 1,
  },
  sponsorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  sponsorType: {
    fontSize: 14, // Senior-friendly minimum (increased from 12)
    fontWeight: '500',
    color: colors.gray[500],
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sponsorMessage: {
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
  },
  sponsorLocationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.gray[50],
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  sponsorLocationText: {
    fontSize: 13,
    color: colors.gray[600],
    flex: 1,
  },
  // Tap hint - Enhanced for seniors with better visibility and icon
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.gray[50],
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    minHeight: 48, // Minimum touch target for seniors
  },
  tapHintText: {
    fontSize: 14, // Increased from 12px
    fontWeight: '500',
  },

  // Expanded Sponsor Content
  sponsorExpanded: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  sponsorSection: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  sponsorFullMessage: {
    fontSize: 15,
    color: colors.gray[700],
    lineHeight: 22,
  },
  sponsorBannerContainer: {
    padding: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  sponsorBanner: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.gray[100],
  },
  sponsorSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sponsorSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },

  // Product Card
  productCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.gray[50],
    borderRadius: 10,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: colors.gray[600],
    lineHeight: 18,
    marginBottom: 6,
  },
  productCategory: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  productCategoryText: {
    fontSize: 14, // Senior-friendly minimum (increased from 11)
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Location Card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.gray[50],
    borderRadius: 10,
  },
  locationInfo: {
    flex: 1,
    marginRight: 12,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
    color: colors.gray[600],
    lineHeight: 18,
  },
  locationCity: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 2,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 14, // Senior-friendly minimum (increased from 12)
    fontWeight: '600',
  },

  // Photo Gallery
  photoGallerySection: {
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  photoScrollContent: {
    paddingHorizontal: 14,
    gap: 12,
  },
  photoCard: {
    // width is set dynamically via inline style using usePhotoWidth() hook
    height: PHOTO_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
  },
  sponsorPhoto: {
    width: '100%',
    height: '100%',
  },
  photoCaptionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  photoCaption: {
    fontSize: 14, // Senior-friendly minimum (increased from 12)
    color: colors.white,
    lineHeight: 18,
  },
  primaryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCounter: {
    marginLeft: 'auto',
    fontSize: 14, // Senior-friendly minimum (increased from 12)
    color: colors.gray[500],
  },
  photoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gray[300],
  },

  // Action Buttons
  sponsorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  sponsorCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: colors.white,
    minHeight: 52, // Senior-friendly touch target
  },
  sponsorCallBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sponsorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 52, // Senior-friendly touch target
  },
  // Thinking Indicator - Enhanced for seniors with larger dots and better visibility
  thinkingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thinkingBubble: {
    backgroundColor: colors.teal[50],
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: colors.teal[100],
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[400],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  thinkingLabel: {
    fontSize: 14, // Increased from 12px
    fontWeight: '700',
    color: colors.teal[700],
  },
  thinkingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thinkingText: {
    fontSize: 17, // Increased from 15px
    color: colors.gray[700],
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Increased from 5px for better visibility
  },
  dot: {
    width: 10, // Increased from 7px for better visibility
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal[500],
  },

  sponsorActionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default TandyScreen;
