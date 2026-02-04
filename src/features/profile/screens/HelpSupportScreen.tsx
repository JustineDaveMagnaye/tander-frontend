/**
 * TANDER Help & Support Screen
 * Premium iOS-style help and support interface
 *
 * Features:
 * - iOS Human Interface Guidelines design
 * - Contact options (Live Chat, Email, Phone)
 * - FAQ section with expandable items
 * - Resources links (User Guide, Safety Tips, Terms)
 * - Report a Problem button
 * - Haptic feedback on interactions
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
  Alert,
  Platform,
  AccessibilityInfo,
  Animated,
} from 'react-native';
import { toast } from '@store/toastStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useResponsive } from '@shared/hooks/useResponsive';

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

interface HelpSupportScreenProps {
  onBack: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ContactOption {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  action: () => void;
}

interface ResourceItem {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  url: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I update my profile?',
    answer: 'Go to Profile > Edit Profile to update your photos and information.',
  },
  {
    question: 'How does matching work?',
    answer: "When two people both like each other, it's a match! You can then start chatting.",
  },
  {
    question: 'How do I unmatch someone?',
    answer: "Go to your conversation, tap the menu button, and select 'Unmatch'.",
  },
  {
    question: 'Is my information private?',
    answer: 'Yes, we take your privacy seriously. You control what information is visible on your profile.',
  },
];

const RESOURCES: ResourceItem[] = [
  {
    icon: 'book-open',
    iconColor: '#FFFFFF',
    iconBgColor: iOS.colors.systemGreen,
    title: 'User Guide',
    subtitle: 'Learn how to use the app',
    url: 'https://tanderconnect.com/guide',
  },
  {
    icon: 'shield',
    iconColor: '#FFFFFF',
    iconBgColor: iOS.colors.systemYellow,
    title: 'Safety Tips',
    subtitle: 'Stay safe while dating',
    url: 'https://tanderconnect.com/safety',
  },
  {
    icon: 'file-text',
    iconColor: '#FFFFFF',
    iconBgColor: iOS.colors.systemBlue,
    title: 'Terms & Privacy',
    subtitle: 'Legal information',
    url: 'https://tanderconnect.com/privacy',
  },
];

const SUPPORT_EMAIL = 'support@tander.com';

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={iosStyles.card}>{children}</View>
);

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <View style={iosStyles.sectionHeader}>
    <Text style={iosStyles.sectionTitle}>{title.toUpperCase()}</Text>
    {subtitle && <Text style={iosStyles.sectionSubtitle}>{subtitle}</Text>}
  </View>
);

const SettingsRow: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  showSeparator?: boolean;
  rightIcon?: keyof typeof Feather.glyphMap;
}> = ({
  icon,
  iconColor,
  iconBgColor,
  label,
  subtitle,
  onPress,
  showSeparator = true,
  rightIcon = 'chevron-right',
}) => {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      style={({ pressed }) => [
        iosStyles.settingsRow,
        pressed && iosStyles.rowPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <View style={iosStyles.rowContent}>
        <View style={[iosStyles.iconBadge, { backgroundColor: iconBgColor }]}>
          <Feather name={icon} size={18} color={iconColor} />
        </View>
        <View style={iosStyles.rowTextContainer}>
          <Text style={iosStyles.rowLabel}>{label}</Text>
          {subtitle && <Text style={iosStyles.rowSubtitle}>{subtitle}</Text>}
        </View>
        <Feather name={rightIcon} size={18} color={iOS.colors.systemGray3} />
      </View>
      {showSeparator && <View style={iosStyles.rowSeparator} />}
    </Pressable>
  );
};

const FAQAccordion: React.FC<{ item: FAQItem; isLast: boolean }> = ({ item, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

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

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!reduceMotion) {
      Animated.timing(rotateAnim, {
        toValue: expanded ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [expanded, reduceMotion, rotateAnim]);

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  }, [expanded]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={iosStyles.faqItem}>
      <Pressable
        style={({ pressed }) => [
          iosStyles.faqQuestion,
          pressed && iosStyles.rowPressed,
        ]}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={item.question}
      >
        <View style={iosStyles.faqQuestionContent}>
          <View style={[iosStyles.iconBadge, { backgroundColor: iOS.colors.systemPurple }]}>
            <Feather name="help-circle" size={18} color="#FFFFFF" />
          </View>
          <Text style={iosStyles.faqQuestionText}>{item.question}</Text>
          {reduceMotion ? (
            <Feather
              name={expanded ? 'chevron-down' : 'chevron-right'}
              size={18}
              color={iOS.colors.systemGray3}
            />
          ) : (
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Feather name="chevron-right" size={18} color={iOS.colors.systemGray3} />
            </Animated.View>
          )}
        </View>
      </Pressable>
      {expanded && (
        <View style={iosStyles.faqAnswer}>
          <Text style={iosStyles.faqAnswerText}>{item.answer}</Text>
        </View>
      )}
      {!isLast && <View style={iosStyles.faqSeparator} />}
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet } = useResponsive();

  const openEmailWithSubject = useCallback((subject: string, body?: string) => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = body ? encodeURIComponent(body) : '';
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}${encodedBody ? `&body=${encodedBody}` : ''}`;
    Linking.openURL(mailtoUrl).catch(() => {
      toast.error('Email Error', 'Unable to open email app. Please email support@tander.com');
    });
  }, []);

  const handleLiveChat = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Contact Support',
      'Our support team is available via email. Would you like to send us a message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: () => openEmailWithSubject('Support Request', 'Hello, I need help with:\n\n'),
        },
      ]
    );
  }, [openEmailWithSubject]);

  const handleEmailSupport = useCallback(() => {
    openEmailWithSubject('Support Request');
  }, [openEmailWithSubject]);

  const handlePhoneSupport = useCallback(() => {
    Linking.openURL('tel:+6321234567').catch(() => {
      toast.error('Phone Error', 'Unable to open phone app. Please call +63 2 1234 5678');
    });
  }, []);

  const handleResourcePress = useCallback((url: string, title: string) => {
    Linking.openURL(url).catch(() => {
      toast.error('Link Error', `Unable to open ${title}. Please visit the link in your browser.`);
    });
  }, []);

  const handleReportProblem = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Report a Problem',
      'What would you like to report?',
      [
        {
          text: 'Technical Issue',
          onPress: () => openEmailWithSubject(
            'Technical Issue Report',
            'Please describe the technical issue you are experiencing:\n\nDevice: \nApp Version: \n\nDescription:\n'
          ),
        },
        {
          text: 'Safety Concern',
          onPress: () => openEmailWithSubject(
            'Safety Concern Report',
            'Please describe your safety concern:\n\n[Your report will be handled with priority]\n\nDescription:\n'
          ),
        },
        {
          text: 'Other',
          onPress: () => openEmailWithSubject(
            'Feedback/Report',
            'Please describe your feedback or issue:\n\n'
          ),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [openEmailWithSubject]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

  const contactOptions: ContactOption[] = [
    {
      icon: 'message-circle',
      iconColor: '#FFFFFF',
      iconBgColor: iOS.colors.tander.teal,
      title: 'Live Chat',
      subtitle: 'Chat with our support team',
      action: handleLiveChat,
    },
    {
      icon: 'mail',
      iconColor: '#FFFFFF',
      iconBgColor: iOS.colors.tander.orange,
      title: 'Email Support',
      subtitle: 'support@tander.com',
      action: handleEmailSupport,
    },
    {
      icon: 'phone',
      iconColor: '#FFFFFF',
      iconBgColor: iOS.colors.systemBlue,
      title: 'Phone Support',
      subtitle: '+63 2 1234 5678',
      action: handlePhoneSupport,
    },
  ];

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
          Help & Support
        </Text>
        <View style={iosStyles.navSpacer} />
      </View>

      {/* Content */}
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
        {/* Contact Us Section */}
        <SectionHeader title="Contact Us" subtitle="We're here to help you" />
        <Card>
          {contactOptions.map((option, index) => (
            <SettingsRow
              key={option.title}
              icon={option.icon}
              iconColor={option.iconColor}
              iconBgColor={option.iconBgColor}
              label={option.title}
              subtitle={option.subtitle}
              onPress={option.action}
              showSeparator={index < contactOptions.length - 1}
            />
          ))}
        </Card>

        {/* FAQ Section */}
        <SectionHeader title="Frequently Asked Questions" />
        <Card>
          {FAQ_ITEMS.map((item, index) => (
            <FAQAccordion
              key={index}
              item={item}
              isLast={index === FAQ_ITEMS.length - 1}
            />
          ))}
        </Card>

        {/* Resources Section */}
        <SectionHeader title="Resources" />
        <Card>
          {RESOURCES.map((resource, index) => (
            <SettingsRow
              key={resource.title}
              icon={resource.icon}
              iconColor={resource.iconColor}
              iconBgColor={resource.iconBgColor}
              label={resource.title}
              subtitle={resource.subtitle}
              onPress={() => handleResourcePress(resource.url, resource.title)}
              showSeparator={index < RESOURCES.length - 1}
              rightIcon="external-link"
            />
          ))}
        </Card>

        {/* Report Problem Button */}
        <View style={iosStyles.reportContainer}>
          <Pressable
            style={({ pressed }) => [
              iosStyles.reportButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleReportProblem}
            accessibilityRole="button"
            accessibilityLabel="Report a problem"
          >
            <Feather name="alert-triangle" size={20} color="#FFFFFF" />
            <Text style={iosStyles.reportButtonText}>Report a Problem</Text>
          </Pressable>
        </View>

        {/* Support Hours Footer */}
        <View style={iosStyles.footer}>
          <Text style={iosStyles.footerTitle}>Support available 24/7</Text>
          <Text style={iosStyles.footerSubtitle}>Average response time: 2 hours</Text>
        </View>
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

  // Settings Row
  settingsRow: {
    backgroundColor: iOS.colors.systemBackground,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    minHeight: 56,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: iOS.spacing.m,
  },
  rowTextContainer: {
    flex: 1,
    marginRight: iOS.spacing.m,
  },
  rowLabel: {
    ...iOS.typography.body,
    color: iOS.colors.label,
  },
  rowSubtitle: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    marginTop: 2,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: iOS.colors.separator,
    marginLeft: 62,
  },
  rowPressed: {
    backgroundColor: iOS.colors.systemGray5,
  },

  // FAQ
  faqItem: {
    backgroundColor: iOS.colors.systemBackground,
  },
  faqQuestion: {
    backgroundColor: iOS.colors.systemBackground,
  },
  faqQuestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: iOS.spacing.l,
    paddingVertical: iOS.spacing.m,
    minHeight: 56,
  },
  faqQuestionText: {
    ...iOS.typography.body,
    color: iOS.colors.label,
    flex: 1,
    marginRight: iOS.spacing.m,
  },
  faqAnswer: {
    paddingHorizontal: iOS.spacing.l,
    paddingBottom: iOS.spacing.m,
    paddingLeft: 62,
  },
  faqAnswerText: {
    ...iOS.typography.subhead,
    color: iOS.colors.secondaryLabel,
    lineHeight: 22,
  },
  faqSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: iOS.colors.separator,
    marginLeft: 62,
  },

  // Report Button
  reportContainer: {
    marginTop: iOS.spacing.xxl,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: iOS.colors.systemRed,
    borderRadius: iOS.radius.large,
    paddingVertical: iOS.spacing.l,
    gap: iOS.spacing.s,
  },
  reportButtonText: {
    ...iOS.typography.headline,
    color: '#FFFFFF',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: iOS.spacing.xxl,
    paddingBottom: iOS.spacing.xl,
  },
  footerTitle: {
    ...iOS.typography.footnote,
    color: iOS.colors.secondaryLabel,
    fontWeight: '500',
  },
  footerSubtitle: {
    ...iOS.typography.caption1,
    color: iOS.colors.tertiaryLabel,
    marginTop: iOS.spacing.xs,
  },
});

export default HelpSupportScreen;
