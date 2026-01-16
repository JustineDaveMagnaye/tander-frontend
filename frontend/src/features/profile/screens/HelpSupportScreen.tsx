/**
 * TANDER Help & Support Screen
 * Contact support and access help resources
 *
 * Features:
 * - Contact options (Live Chat, Email, Phone)
 * - FAQ section with expandable items
 * - Resources links (User Guide, Safety Tips, Terms)
 * - Report a Problem button
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { toast } from '@store/toastStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

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

const RESOURCES: (ResourceItem & { url: string })[] = [
  {
    icon: 'file-text',
    iconColor: '#22C55E',
    iconBgColor: '#DCFCE7',
    title: 'User Guide',
    subtitle: 'Learn how to use the app',
    url: 'https://tanderconnect.com/guide',
  },
  {
    icon: 'alert-circle',
    iconColor: '#EAB308',
    iconBgColor: '#FEF9C3',
    title: 'Safety Tips',
    subtitle: 'Stay safe while dating',
    url: 'https://tanderconnect.com/safety',
  },
  {
    icon: 'file-text',
    iconColor: '#3B82F6',
    iconBgColor: '#DBEAFE',
    title: 'Terms & Privacy',
    subtitle: 'Legal information',
    url: 'https://tanderconnect.com/privacy',
  },
];

// Support email address
const SUPPORT_EMAIL = 'support@tander.com';

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const FAQAccordion: React.FC<{ item: FAQItem; isLast: boolean }> = ({ item, isLast }) => {
  const [expanded, setExpanded] = useState(false);
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

    return () => {
      subscription?.remove();
    };
  }, []);

  // Use different icons when reduce motion is enabled
  const chevronIcon = reduceMotion
    ? (expanded ? 'chevron-down' : 'chevron-right')
    : 'chevron-right';

  const chevronStyle = reduceMotion
    ? {}
    : { transform: [{ rotate: expanded ? '90deg' : '0deg' }] };

  return (
    <View style={[styles.faqItem, !isLast && styles.faqItemBorder]}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.faqQuestionLeft}>
          <View style={styles.faqIconContainer}>
            <Feather name="help-circle" size={20} color="#9333EA" />
          </View>
          <Text style={styles.faqQuestionText}>{item.question}</Text>
        </View>
        <Feather
          name={chevronIcon}
          size={20}
          color={colors.gray[400]}
          style={chevronStyle}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useResponsive();

  const openEmailWithSubject = useCallback((subject: string, body?: string) => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = body ? encodeURIComponent(body) : '';
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}${encodedBody ? `&body=${encodedBody}` : ''}`;
    Linking.openURL(mailtoUrl).catch(() => {
      toast.error('Email Error', 'Unable to open email app. Please email support@tander.com');
    });
  }, []);

  const handleLiveChat = useCallback(() => {
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

  const contactOptions: ContactOption[] = [
    {
      icon: 'message-circle',
      iconColor: colors.teal[500],
      iconBgColor: colors.teal[100],
      title: 'Live Chat',
      subtitle: 'Chat with our support team',
      action: handleLiveChat,
    },
    {
      icon: 'mail',
      iconColor: colors.orange[500],
      iconBgColor: colors.orange[100],
      title: 'Email Support',
      subtitle: 'support@tander.com',
      action: handleEmailSupport,
    },
    {
      icon: 'phone',
      iconColor: '#3B82F6',
      iconBgColor: '#DBEAFE',
      title: 'Phone Support',
      subtitle: '+63 2 1234 5678',
      action: handlePhoneSupport,
    },
  ];

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
          <Feather
            name="arrow-left"
            size={isLandscape ? 18 : 22}
            color={colors.gray[600]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLandscape && styles.headerTitleLandscape]}>
          Help & Support
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Us Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <Text style={styles.sectionSubtitle}>We're here to help you</Text>
          </View>

          {contactOptions.map((option, index) => (
            <TouchableOpacity
              key={option.title}
              style={[
                styles.contactItem,
                index < contactOptions.length - 1 && styles.contactItemBorder,
              ]}
              onPress={option.action}
              activeOpacity={0.7}
            >
              <View style={styles.contactLeft}>
                <View style={[styles.iconContainer, { backgroundColor: option.iconBgColor }]}>
                  <Feather name={option.icon} size={24} color={option.iconColor} />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactTitle}>{option.title}</Text>
                  <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>

          {FAQ_ITEMS.map((item, index) => (
            <FAQAccordion
              key={index}
              item={item}
              isLast={index === FAQ_ITEMS.length - 1}
            />
          ))}
        </View>

        {/* Resources Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resources</Text>
          </View>

          {RESOURCES.map((resource, index) => (
            <TouchableOpacity
              key={resource.title}
              style={[
                styles.contactItem,
                index < RESOURCES.length - 1 && styles.contactItemBorder,
              ]}
              onPress={() => handleResourcePress(resource.url, resource.title)}
              activeOpacity={0.7}
            >
              <View style={styles.contactLeft}>
                <View style={[styles.iconContainer, { backgroundColor: resource.iconBgColor }]}>
                  <Feather name={resource.icon} size={24} color={resource.iconColor} />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactTitle}>{resource.title}</Text>
                  <Text style={styles.contactSubtitle}>{resource.subtitle}</Text>
                </View>
              </View>
              <Feather name="external-link" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Report Problem Button */}
        <View style={styles.reportContainer}>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={handleReportProblem}
            activeOpacity={0.8}
          >
            <Feather name="alert-circle" size={24} color={colors.white} />
            <Text style={styles.reportButtonText}>Report a Problem</Text>
          </TouchableOpacity>
        </View>

        {/* Support Hours */}
        <View style={styles.supportHours}>
          <Text style={styles.supportHoursText}>Support available 24/7</Text>
          <Text style={styles.responseTime}>Average response time: 2 hours</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },

  // Header
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

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.s,
  },

  // Section
  section: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.s,
    marginTop: spacing.s,
    borderRadius: borderRadius.large,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  sectionSubtitle: {
    fontSize: 16,
    color: colors.gray[500],
    marginTop: 4,
  },

  // Contact Item
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
  },
  contactItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.s,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 16,
    color: colors.gray[500],
  },

  // FAQ
  faqItem: {
    paddingHorizontal: spacing.m,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.m,
  },
  faqQuestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.s,
  },
  faqIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    flex: 1,
  },
  faqAnswer: {
    paddingBottom: spacing.m,
    paddingLeft: 56,
  },
  faqAnswerText: {
    fontSize: 16,
    color: colors.gray[600],
    lineHeight: 24,
  },

  // Report Button
  reportContainer: {
    marginHorizontal: spacing.s,
    marginTop: spacing.l,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.semantic.error,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.m,
    gap: spacing.s,
    ...shadows.medium,
  },
  reportButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },

  // Support Hours
  supportHours: {
    alignItems: 'center',
    marginTop: spacing.m,
    marginBottom: spacing.m,
  },
  supportHoursText: {
    fontSize: 16,
    color: colors.gray[500],
  },
  responseTime: {
    fontSize: 16,
    color: colors.gray[400],
    marginTop: 4,
  },
});

export default HelpSupportScreen;
