/**
 * TANDER TandyScreen - Wellness Companion Chat Interface
 *
 * PREMIUM IPHONE-LEVEL UI/UX DESIGN
 *
 * Features:
 * - Glassmorphic header with premium gradient
 * - Premium message bubbles with glow effects
 * - Ambient floating orbs background
 * - Spring physics animations throughout
 * - Premium input area with glassmorphism
 * - Enhanced thinking indicator with premium styling
 * - Comprehensive accessibility support
 * - Senior-friendly design (56-64px touch targets, 18px+ fonts)
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
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
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { FONT_SCALING } from '@shared/styles/fontScaling';
import { TanderLogoIcon } from '@shared/components/icons/TanderLogoIcon';
import { useResponsive } from '@shared/hooks/useResponsive';
import {
  PREMIUM_COLORS,
  GlassCard,
  AnimatedSpringButton,
  PremiumBadge,
  AnimatedEntrance,
  FloatingOrb,
} from '../components/PremiumComponents';
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
// LOADING MESSAGES - Rotating messages for seniors to keep them engaged
// ============================================================================

const LOADING_MESSAGES = [
  { title: 'Connecting to Tandy...', subtitle: 'Your wellness companion is warming up' },
  { title: 'Almost ready...', subtitle: 'Preparing a friendly conversation' },
  { title: 'Just a moment...', subtitle: 'Tandy is excited to chat with you' },
];

// ============================================================================
// PREMIUM ANIMATED LOADING DOTS COMPONENT
// ============================================================================

interface LoadingDotsProps {
  reduceMotion: boolean;
  color?: string;
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ reduceMotion, color = colors.teal[500] }) => {
  const dot1Scale = useRef(new Animated.Value(0.6)).current;
  const dot2Scale = useRef(new Animated.Value(0.6)).current;
  const dot3Scale = useRef(new Animated.Value(0.6)).current;
  const dot1Opacity = useRef(new Animated.Value(0.4)).current;
  const dot2Opacity = useRef(new Animated.Value(0.4)).current;
  const dot3Opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reduceMotion) {
      dot1Scale.setValue(1);
      dot2Scale.setValue(1);
      dot3Scale.setValue(1);
      dot1Opacity.setValue(1);
      dot2Opacity.setValue(1);
      dot3Opacity.setValue(1);
      return;
    }

    const animateDot = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, tension: 200, friction: 4 }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.spring(scale, { toValue: 0.6, useNativeDriver: true, tension: 100, friction: 8 }),
            Animated.timing(opacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
          ]),
        ])
      );

    const animation = Animated.parallel([
      animateDot(dot1Scale, dot1Opacity, 0),
      animateDot(dot2Scale, dot2Opacity, 150),
      animateDot(dot3Scale, dot3Opacity, 300),
    ]);

    animation.start();
    return () => animation.stop();
  }, [dot1Scale, dot2Scale, dot3Scale, dot1Opacity, dot2Opacity, dot3Opacity, reduceMotion]);

  return (
    <View style={loadingStyles.dotsRow}>
      <Animated.View
        style={[
          loadingStyles.loadingDot,
          {
            backgroundColor: color,
            opacity: dot1Opacity,
            transform: [{ scale: dot1Scale }],
          }
        ]}
      />
      <Animated.View
        style={[
          loadingStyles.loadingDot,
          {
            backgroundColor: color,
            opacity: dot2Opacity,
            transform: [{ scale: dot2Scale }],
          }
        ]}
      />
      <Animated.View
        style={[
          loadingStyles.loadingDot,
          {
            backgroundColor: color,
            opacity: dot3Opacity,
            transform: [{ scale: dot3Scale }],
          }
        ]}
      />
    </View>
  );
};

// ============================================================================
// PREMIUM LOADING STATE COMPONENT
// ============================================================================

interface EnhancedLoadingStateProps {
  reduceMotion: boolean;
}

const EnhancedLoadingState: React.FC<EnhancedLoadingStateProps> = ({ reduceMotion }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Rotate loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (reduceMotion) {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        return;
      }

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fadeAnim, reduceMotion]);

  // Pulse animation for the icon container
  useEffect(() => {
    if (reduceMotion) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, reduceMotion]);

  // Bounce animation for the icon
  useEffect(() => {
    if (reduceMotion) return;

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.spring(iconBounce, { toValue: -10, useNativeDriver: true, tension: 40, friction: 7 }),
        Animated.spring(iconBounce, { toValue: 0, useNativeDriver: true, tension: 40, friction: 7 }),
      ])
    );

    bounce.start();
    return () => bounce.stop();
  }, [iconBounce, reduceMotion]);

  // Rotating ring animation
  useEffect(() => {
    if (reduceMotion) return;

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    );

    rotate.start();
    return () => rotate.stop();
  }, [rotateAnim, reduceMotion]);

  // Glow animation
  useEffect(() => {
    if (reduceMotion) return;

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: false }),
      ])
    );

    glow.start();
    return () => glow.stop();
  }, [glowAnim, reduceMotion]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentMessage = LOADING_MESSAGES[messageIndex];

  return (
    <View style={loadingStyles.container}>
      {/* Ambient floating orbs */}
      {!reduceMotion && (
        <View style={loadingStyles.orbsContainer}>
          <FloatingOrb size={120} color={PREMIUM_COLORS.glass.teal} x={10} y={20} delay={0} opacity={0.3} />
          <FloatingOrb size={100} color={PREMIUM_COLORS.glass.orange} x={70} y={15} delay={500} opacity={0.25} />
          <FloatingOrb size={80} color={PREMIUM_COLORS.glass.pink} x={80} y={60} delay={1000} opacity={0.3} />
        </View>
      )}

      {/* Premium animated avatar */}
      <Animated.View
        style={[
          loadingStyles.iconContainer,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        {/* Rotating gradient ring */}
        <Animated.View
          style={[
            loadingStyles.rotatingRing,
            { transform: [{ rotate: rotateInterpolate }] }
          ]}
        >
          <LinearGradient
            colors={[colors.teal[400], colors.orange[400], colors.teal[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={loadingStyles.ringGradient}
          />
        </Animated.View>

        {/* Glassmorphic icon container */}
        <View style={loadingStyles.iconGlassWrapper}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="light" style={loadingStyles.iconGradient}>
              <Animated.View style={{ transform: [{ translateY: iconBounce }] }}>
                <TanderLogoIcon size={60} focused />
              </Animated.View>
            </BlurView>
          ) : (
            <LinearGradient
              colors={[colors.teal[50], colors.white]}
              style={loadingStyles.iconGradient}
            >
              <Animated.View style={{ transform: [{ translateY: iconBounce }] }}>
                <TanderLogoIcon size={60} focused />
              </Animated.View>
            </LinearGradient>
          )}
        </View>
      </Animated.View>

      {/* Text content */}
      <Animated.View style={[loadingStyles.textContainer, { opacity: fadeAnim }]}>
        <Text style={loadingStyles.title}>{currentMessage.title}</Text>
        <Text style={loadingStyles.subtitle}>{currentMessage.subtitle}</Text>
      </Animated.View>

      <LoadingDots reduceMotion={reduceMotion} color={colors.teal[500]} />

      {/* Premium encouragement badge */}
      <View style={loadingStyles.encouragementBadge}>
        <View style={loadingStyles.encouragementIcon}>
          <Feather name="heart" size={16} color={colors.romantic.pink} />
        </View>
        <Text style={loadingStyles.encouragementText}>
          Take a deep breath while you wait
        </Text>
      </View>
    </View>
  );
};

// Premium loading state styles
const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  orbsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  iconContainer: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 3,
  },
  ringGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    opacity: 0.5,
  },
  iconGlassWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.teal[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[500],
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
    }),
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.glass.white,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 17,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 4,
    height: 24,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal[500],
  },
  encouragementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PREMIUM_COLORS.glass.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,138,0.3)',
    ...Platform.select({
      ios: {
        shadowColor: colors.romantic.pink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  encouragementIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,107,138,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  encouragementText: {
    fontSize: 16,
    color: colors.gray[700],
    fontWeight: '600',
  },
});

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
// PREMIUM THINKING INDICATOR COMPONENT
// Glassmorphic design with premium animations
// ============================================================================

interface ThinkingIndicatorProps {
  reduceMotion?: boolean;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ reduceMotion = false }) => {
  const dot1 = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const dot2 = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const dot3 = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const containerOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const containerSlide = useRef(new Animated.Value(reduceMotion ? 0 : 30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    if (reduceMotion) {
      containerOpacity.setValue(1);
      containerSlide.setValue(0);
      dot1.setValue(1);
      dot2.setValue(1);
      dot3.setValue(1);
      return;
    }

    // Premium entrance animation with spring physics
    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(containerSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }),
    ]).start();

    // Subtle pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.2,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    glowAnimation.start();

    // Dot animations with spring physics
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.spring(dot, {
            toValue: 1,
            useNativeDriver: true,
            tension: 150,
            friction: 5,
          }),
          Animated.spring(dot, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 180),
      animateDot(dot3, 360),
    ]);

    animation.start();

    return () => {
      animation.stop();
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [dot1, dot2, dot3, containerOpacity, containerSlide, pulseAnim, glowAnim, reduceMotion]);

  const getDotStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
    transform: [
      {
        scale: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.6],
        }),
      },
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
  });

  const ThinkingBubbleContent = () => (
    <>
      <View style={styles.thinkingHeader}>
        <View style={styles.thinkingAvatarRing}>
          <TanderLogoIcon size={20} focused />
        </View>
        <Text style={styles.thinkingLabel}>Tandy</Text>
        <View style={styles.thinkingOnlineDot} />
      </View>
      <View style={styles.thinkingContent}>
        <Text style={styles.thinkingText}>Thinking</Text>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
          <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
          <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
        </View>
      </View>
    </>
  );

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
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="light" style={styles.thinkingBubble}>
          <ThinkingBubbleContent />
        </BlurView>
      ) : (
        <View style={styles.thinkingBubble}>
          <ThinkingBubbleContent />
        </View>
      )}
    </Animated.View>
  );
};

// ============================================================================
// PREMIUM MESSAGE BUBBLE COMPONENT
// Premium styling with gradients, glow effects, and spring animations
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
  const slideAnim = useRef(new Animated.Value(reduceMotion ? 0 : (isOwn ? 40 : -40))).current;
  const scaleAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0.9)).current;

  // Responsive message bubble width
  const messageBubbleMaxWidth = useMemo(() => {
    if (isLandscape) {
      return isTablet ? wp(45) : wp(50);
    }
    return isTablet ? wp(60) : wp(75);
  }, [isLandscape, isTablet, wp]);

  // Premium entrance animation with spring physics
  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
      return;
    }

    const delay = Math.min(index * 60, 250);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        tension: 70,
        friction: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim, index, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isOwn && styles.messageRowOwn,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.messageContent, { maxWidth: messageBubbleMaxWidth }]}>
        {isOwn ? (
          <View style={styles.bubbleOwnWrapper}>
            <LinearGradient
              colors={PREMIUM_COLORS.gradient.orangePremium as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bubbleOwn}
            >
              <Text style={styles.bubbleTextOwn}>{message.text}</Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.bubbleOtherWrapper}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={60} tint="light" style={styles.bubbleOther}>
                <View style={styles.tandyLabel}>
                  <View style={styles.tandyAvatarMini}>
                    <TanderLogoIcon size={14} focused />
                  </View>
                  <Text style={styles.tandyLabelText}>Tandy</Text>
                </View>
                <Text style={styles.bubbleTextOther}>{message.text}</Text>
              </BlurView>
            ) : (
              <View style={styles.bubbleOther}>
                <View style={styles.tandyLabel}>
                  <View style={styles.tandyAvatarMini}>
                    <TanderLogoIcon size={14} focused />
                  </View>
                  <Text style={styles.tandyLabelText}>Tandy</Text>
                </View>
                <Text style={styles.bubbleTextOther}>{message.text}</Text>
              </View>
            )}
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
// PREMIUM QUICK REPLY BUTTON COMPONENT
// Glassmorphic design with spring animations
// ============================================================================

interface QuickReplyButtonProps {
  text: string;
  onPress: () => void;
  index: number;
  reduceMotion?: boolean;
}

const QuickReplyButton: React.FC<QuickReplyButtonProps> = ({ text, onPress, index, reduceMotion = false }) => {
  const scaleAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0.85)).current;
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(reduceMotion ? 0 : 30)).current;
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }

    // Premium staggered entrance with spring physics
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim, index, reduceMotion]);

  const handlePressIn = () => {
    setIsPressed(true);
    if (reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    if (reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  const ButtonContent = () => (
    <>
      <View style={[
        styles.quickReplyIconContainer,
        isPressed && styles.quickReplyIconContainerPressed,
      ]}>
        <Feather
          name="message-circle"
          size={18}
          color={isPressed ? colors.white : colors.teal[600]}
        />
      </View>
      <Text style={[
        styles.quickReplyText,
        isPressed && styles.quickReplyTextPressed,
      ]}>
        {text}
      </Text>
      <Feather
        name="chevron-right"
        size={16}
        color={isPressed ? colors.white : colors.gray[400]}
        style={{ marginLeft: 'auto' }}
      />
    </>
  );

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }, { translateY: slideAnim }]
    }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Quick reply: ${text}`}
        accessibilityHint="Double tap to send this message to Tandy"
        accessibilityRole="button"
      >
        {Platform.OS === 'ios' && !isPressed ? (
          <BlurView intensity={60} tint="light" style={styles.quickReplyBtn}>
            <ButtonContent />
          </BlurView>
        ) : (
          <View style={[
            styles.quickReplyBtn,
            isPressed && styles.quickReplyBtnPressed,
          ]}>
            <ButtonContent />
          </View>
        )}
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

  const loadConversation = async (retryCount = 0) => {
    setIsLoading(true);
    if (retryCount === 0) setError(null);

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
      setError(null);
    } catch (err: any) {
      // Retry up to 2 times with delay
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadConversation(retryCount + 1);
      }

      // After retries failed, just show the greeting and work offline
      setMessages([FALLBACK_GREETING]);
      // Don't show error - just work in offline mode silently
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
        {/* Enhanced icon with gradient background */}
        <View style={styles.welcomeIconContainer}>
          <LinearGradient
            colors={[colors.teal[100], colors.teal[50]]}
            style={styles.welcomeIconGradient}
          >
            <TanderLogoIcon size={64} focused />
          </LinearGradient>
          {/* Online status indicator */}
          <View style={styles.welcomeOnlineIndicator}>
            <View style={styles.welcomeOnlineDot} />
            <Text style={styles.welcomeOnlineText}>Online</Text>
          </View>
        </View>

        <Text style={styles.welcomeTitle}>Hello! I'm Tandy</Text>
        <Text style={styles.welcomeSubtitle}>
          Your friendly wellness companion. I'm here to chat, help you relax, and brighten your day.
        </Text>

        {/* Feature highlights for seniors */}
        <View style={styles.featureHighlights}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.teal[50] }]}>
              <Feather name="message-circle" size={18} color={colors.teal[600]} />
            </View>
            <Text style={styles.featureText}>Friendly Chat</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.orange[50] }]}>
              <Feather name="wind" size={18} color={colors.orange[600]} />
            </View>
            <Text style={styles.featureText}>Breathing</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.romantic.pink + '20' }]}>
              <Feather name="heart" size={18} color={colors.romantic.pink} />
            </View>
            <Text style={styles.featureText}>Wellness</Text>
          </View>
        </View>

        {/* Quick suggestion buttons - Enhanced with clearer labels */}
        <View style={styles.quickSuggestionsContainer}>
          <View style={styles.quickSuggestionsHeader}>
            <Feather name="zap" size={16} color={colors.orange[500]} />
            <Text style={styles.quickSuggestionsLabel}>Quick ways to start:</Text>
          </View>
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
            <QuickReplyButton
              text="I'm feeling lonely"
              onPress={() => handleSendMessage("I'm feeling lonely")}
              index={3}
              reduceMotion={reduceMotion}
            />
          </View>
        </View>

        {/* Helpful tip for seniors */}
        <View style={styles.welcomeTip}>
          <Feather name="info" size={16} color={colors.teal[600]} />
          <Text style={styles.welcomeTipText}>
            Tip: You can also type your own message below
          </Text>
        </View>
      </View>
    );
  }, [showQuickReplies, reduceMotion, handleSendMessage]);

  // ============================================================================
  // RENDER - PREMIUM IPHONE-LEVEL UI
  // ============================================================================
  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.orange[500]} />

      {/* Premium ambient background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={PREMIUM_COLORS.gradient.warmBg as [string, string, string]}
          style={StyleSheet.absoluteFill}
        />
        {!reduceMotion && (
          <>
            <FloatingOrb size={150} color={PREMIUM_COLORS.glass.teal} x={-5} y={5} delay={0} opacity={0.15} />
            <FloatingOrb size={120} color={PREMIUM_COLORS.glass.orange} x={75} y={8} delay={500} opacity={0.12} />
            <FloatingOrb size={100} color={PREMIUM_COLORS.glass.pink} x={85} y={75} delay={1000} opacity={0.15} />
            <FloatingOrb size={80} color={PREMIUM_COLORS.glass.teal} x={5} y={80} delay={750} opacity={0.12} />
          </>
        )}
      </View>

      <View style={styles.container}>
        <View style={[styles.mainContent, { paddingTop: insets.top }]}>
          {/* Premium Glassmorphic Header */}
          <View style={styles.headerShadowContainer}>
            <LinearGradient
              colors={[colors.orange[500], colors.orange[400], colors.teal[500]]}
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
                {/* Premium Back Button with glass effect */}
                <AnimatedSpringButton
                  onPress={handleBack}
                  style={styles.headerBackButton}
                  accessibilityLabel="Go back"
                  accessibilityHint="Returns to previous screen"
                >
                  <View style={styles.headerButtonInner}>
                    <Feather name="arrow-left" size={22} color={colors.white} />
                  </View>
                </AnimatedSpringButton>

                {/* Premium Avatar & Info */}
                <View style={styles.headerUserInfo}>
                  <View style={styles.headerAvatarWrapper}>
                    <View style={styles.headerAvatarRing}>
                      <View style={styles.headerAvatar}>
                        <TanderLogoIcon size={26} focused />
                      </View>
                    </View>
                    <View style={styles.headerOnlineDot}>
                      <View style={styles.headerOnlineDotInner} />
                    </View>
                  </View>
                  <View style={styles.headerNameContainer}>
                    <Text style={styles.headerName}>Tandy</Text>
                    <View style={styles.headerStatusRow}>
                      <View style={styles.headerStatusDot} />
                      <Text style={styles.headerStatus}>Online</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Premium Action Buttons */}
              <View style={styles.headerActions}>
                <AnimatedSpringButton
                  onPress={handleOpenBreathing}
                  style={styles.headerActionButton}
                  accessibilityLabel="Start breathing exercise"
                  accessibilityHint="Opens breathing exercise screen"
                >
                  <View style={styles.headerButtonInner}>
                    <Feather name="wind" size={20} color={colors.white} />
                  </View>
                </AnimatedSpringButton>
                <AnimatedSpringButton
                  onPress={handleOpenMeditation}
                  style={styles.headerActionButton}
                  accessibilityLabel="Start meditation"
                  accessibilityHint="Opens meditation screen"
                >
                  <View style={styles.headerButtonInner}>
                    <Feather name="moon" size={20} color={colors.white} />
                  </View>
                </AnimatedSpringButton>
              </View>
            </LinearGradient>
          </View>

          {/* Enhanced Error Banner - More encouraging for seniors */}
          {error && (
            <TouchableOpacity
              style={styles.errorBanner}
              onPress={loadConversation}
              accessibilityRole="alert"
              accessibilityLabel={`${error}. Tap to retry.`}
              accessibilityHint="Double tap to try connecting again"
            >
              <View style={styles.errorIconContainer}>
                <Feather name="wifi-off" size={18} color={colors.orange[600]} />
              </View>
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.errorHelpText}>
                  Don't worry - Tandy can still chat with you!
                </Text>
              </View>
              <View style={styles.errorRetryBadge}>
                <Feather name="refresh-cw" size={14} color={colors.teal[600]} />
                <Text style={styles.errorRetryText}>Retry</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Messages Area - Scrollable */}
          <View style={styles.messagesContainer}>
            {isLoading ? (
              <EnhancedLoadingState reduceMotion={reduceMotion} />
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

          {/* Premium Bottom Fixed Area */}
          <Animated.View style={[styles.bottomFixedContainer, { marginBottom: keyboardHeight }]}>
            {/* Premium Input Area with glassmorphism */}
            <View style={[
              styles.inputContainer,
              isSmallDevice && styles.inputContainerSmall,
              isPhoneLandscape && styles.inputContainerLandscape,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                paddingLeft: Math.max(insets.left + 16, horizontalPadding),
                paddingRight: Math.max(insets.right + 16, horizontalPadding),
              }
            ]}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={80} tint="light" style={styles.inputBlurWrapper}>
                  <View style={styles.inputInnerContent}>
                    <AnimatedSpringButton
                      onPress={() => {}}
                      style={styles.emojiButton}
                      accessibilityLabel="Add emoji"
                      accessibilityHint="Opens emoji picker"
                    >
                      <LinearGradient
                        colors={[colors.teal[50], colors.teal[100]]}
                        style={styles.emojiButtonGradient}
                      >
                        <Feather name="smile" size={22} color={colors.teal[600]} />
                      </LinearGradient>
                    </AnimatedSpringButton>

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
                        maxFontSizeMultiplier={FONT_SCALING.INPUT}
                      />
                    </View>

                    {inputText.trim() ? (
                      <AnimatedSpringButton
                        onPress={() => handleSendMessage()}
                        disabled={isSending}
                        accessibilityLabel="Send message"
                        accessibilityHint="Sends your message to Tandy"
                      >
                        <LinearGradient
                          colors={isSending
                            ? [colors.gray[400], colors.gray[500]]
                            : PREMIUM_COLORS.gradient.orangePremium as [string, string, string]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.sendButton}
                        >
                          <Feather name="send" size={20} color={colors.white} />
                        </LinearGradient>
                      </AnimatedSpringButton>
                    ) : (
                      <AnimatedSpringButton
                        onPress={() => handleSendMessage('👍')}
                        disabled={isSending}
                        accessibilityLabel="Send thumbs up"
                        accessibilityHint="Sends a thumbs up reaction"
                      >
                        <LinearGradient
                          colors={[colors.teal[50], colors.teal[100]]}
                          style={styles.likeButton}
                        >
                          <Feather name="thumbs-up" size={22} color={colors.teal[600]} />
                        </LinearGradient>
                      </AnimatedSpringButton>
                    )}
                  </View>
                </BlurView>
              ) : (
                <View style={styles.inputAndroidWrapper}>
                  <AnimatedSpringButton
                    onPress={() => {}}
                    style={styles.emojiButton}
                    accessibilityLabel="Add emoji"
                    accessibilityHint="Opens emoji picker"
                  >
                    <LinearGradient
                      colors={[colors.teal[50], colors.teal[100]]}
                      style={styles.emojiButtonGradient}
                    >
                      <Feather name="smile" size={22} color={colors.teal[600]} />
                    </LinearGradient>
                  </AnimatedSpringButton>

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
                      maxFontSizeMultiplier={FONT_SCALING.INPUT}
                    />
                  </View>

                  {inputText.trim() ? (
                    <AnimatedSpringButton
                      onPress={() => handleSendMessage()}
                      disabled={isSending}
                      accessibilityLabel="Send message"
                      accessibilityHint="Sends your message to Tandy"
                    >
                      <LinearGradient
                        colors={isSending
                          ? [colors.gray[400], colors.gray[500]]
                          : PREMIUM_COLORS.gradient.orangePremium as [string, string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.sendButton}
                      >
                        <Feather name="send" size={20} color={colors.white} />
                      </LinearGradient>
                    </AnimatedSpringButton>
                  ) : (
                    <AnimatedSpringButton
                      onPress={() => handleSendMessage('👍')}
                      disabled={isSending}
                      accessibilityLabel="Send thumbs up"
                      accessibilityHint="Sends a thumbs up reaction"
                    >
                      <LinearGradient
                        colors={[colors.teal[50], colors.teal[100]]}
                        style={styles.likeButton}
                      >
                        <Feather name="thumbs-up" size={22} color={colors.teal[600]} />
                      </LinearGradient>
                    </AnimatedSpringButton>
                  )}
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// PREMIUM STYLES - iPhone-level UI/UX
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

  // Premium Header with glassmorphic effects
  headerShadowContainer: {
    backgroundColor: colors.orange[500],
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[600],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
    }),
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerSmall: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerLandscape: {
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  headerBackButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  headerButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  headerNameContainer: {
    flex: 1,
    flexShrink: 1,
  },
  headerAvatarWrapper: {
    position: 'relative',
  },
  headerAvatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.white,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
    }),
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.orange[500],
  },
  headerOnlineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00D26A',
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D26A',
  },
  headerStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.95)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },

  // Premium Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: PREMIUM_COLORS.glass.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    minHeight: 72,
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  errorIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orange[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.orange[100],
  },
  errorTextContainer: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.orange[700],
  },
  errorHelpText: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: 4,
  },
  errorRetryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.teal[50],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.teal[200],
  },
  errorRetryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.teal[600],
  },

  // Premium Messages Container
  messagesContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flatList: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
  },
  // Premium bottom container
  bottomFixedContainer: {
    backgroundColor: 'transparent',
  },
  emptyMessagesList: {
    flex: 1,
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 4,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageContent: {
    maxWidth: '75%',
  },
  // Premium message bubbles with glow effects
  bubbleOwnWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
    }),
  },
  bubbleOwn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    borderBottomRightRadius: 8,
  },
  bubbleTextOwn: {
    fontSize: 18,
    lineHeight: 26,
    color: colors.white,
    fontWeight: '500',
  },
  bubbleOtherWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  bubbleOther: {
    backgroundColor: PREMIUM_COLORS.glass.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  tandyLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tandyAvatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  tandyLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.teal[700],
  },
  bubbleTextOther: {
    fontSize: 18,
    lineHeight: 26,
    color: colors.gray[900],
    fontWeight: '400',
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

  // Premium Welcome Header with glassmorphism
  welcomeHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  welcomeIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeIconGradient: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(20,184,166,0.3)',
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[500],
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    }),
  },
  welcomeOnlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PREMIUM_COLORS.glass.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,210,106,0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#00D26A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  welcomeOnlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00D26A',
  },
  welcomeOnlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 340,
  },
  // Premium Feature highlights
  featureHighlights: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 28,
    marginBottom: 12,
  },
  featureItem: {
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[400],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  quickSuggestionsContainer: {
    marginTop: 32,
    width: '100%',
  },
  quickSuggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  quickSuggestionsLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[800],
  },
  // Premium helpful tip
  welcomeTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PREMIUM_COLORS.glass.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.teal[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  welcomeTipText: {
    fontSize: 15,
    color: colors.teal[700],
    fontWeight: '600',
    flex: 1,
  },
  quickSuggestionsGrid: {
    flexDirection: 'column',
    gap: 12,
    paddingHorizontal: 8,
  },

  // Premium Quick Replies with glassmorphism
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
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: PREMIUM_COLORS.glass.white,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.3)',
    borderRadius: 20,
    minHeight: 60,
    minWidth: 160,
    gap: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  quickReplyBtnPressed: {
    backgroundColor: colors.teal[500],
    borderColor: colors.teal[600],
  },
  quickReplyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  quickReplyIconContainerPressed: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'transparent',
  },
  quickReplyText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray[800],
    flex: 1,
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
    borderColor: colors.gray[300],
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
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

  // Premium Input Area with glassmorphism
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  inputContainerSmall: {
    paddingHorizontal: 12,
  },
  inputContainerLandscape: {
    paddingTop: 10,
  },
  inputBlurWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 32,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  inputAndroidWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.glass.white,
    borderRadius: 32,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  inputInnerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  emojiButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 10,
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    color: colors.gray[900],
    paddingVertical: 12,
    maxHeight: 120,
    lineHeight: 24,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.orange[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  likeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
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
  // Premium Thinking Indicator with glassmorphism
  thinkingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  thinkingBubble: {
    backgroundColor: PREMIUM_COLORS.glass.white,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 28,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: colors.teal[200],
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.teal[500],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
    }),
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  thinkingAvatarRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.teal[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.teal[100],
  },
  thinkingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.teal[700],
  },
  thinkingOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D26A',
    marginLeft: 4,
  },
  thinkingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  thinkingText: {
    fontSize: 18,
    color: colors.gray[700],
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 24,
  },
  dot: {
    width: 10,
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
