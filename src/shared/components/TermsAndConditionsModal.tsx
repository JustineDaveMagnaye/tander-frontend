/**
 * TANDER Terms and Conditions Modal
 * Full-screen scrollable modal with all T&C content
 *
 * Features:
 * - Responsive for phones, tablets, iPads
 * - Portrait and landscape support
 * - Senior-friendly large text and touch targets
 * - Accessible with screen reader support
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

interface TermsAndConditionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape, wp, hp } = useResponsive();

  // Responsive sizes
  const titleSize = isLandscape ? Math.min(hp(5), 24) : isTablet ? 28 : 24;
  const headingSize = isTablet ? 18 : 16;
  const bodySize = isTablet ? 16 : 15;
  const maxContentWidth = isTablet ? 700 : 600;

  const Section = ({ number, title, content }: { number: string; title: string; content: string }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontSize: headingSize }]}>
        {number}. {title}
      </Text>
      <Text style={[styles.sectionContent, { fontSize: bodySize }]}>{content}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.teal[600]} />

        {/* Header */}
        <LinearGradient
          colors={[colors.teal[500], colors.teal[600]]}
          style={[
            styles.header,
            {
              paddingTop: insets.top + spacing.m,
              paddingHorizontal: isTablet ? spacing.xl : spacing.l,
            },
          ]}
        >
          <View style={[styles.headerRow, { maxWidth: maxContentWidth }]}>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { fontSize: titleSize }]}>
                Terms and Conditions
              </Text>
              <Text style={styles.headerSubtitle}>Version 1.0</Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close Terms and Conditions"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: isTablet ? spacing.xl : spacing.l,
              paddingBottom: insets.bottom + spacing.xxl,
            },
          ]}
          showsVerticalScrollIndicator={true}
        >
          <View style={[styles.contentCard, { maxWidth: maxContentWidth }]}>
            {/* Welcome */}
            <Text style={[styles.welcomeText, { fontSize: bodySize }]}>
              Welcome to Tander, a senior-focused digital companion and dating platform designed to
              promote social interaction, emotional wellbeing, and meaningful connections among
              senior citizens.
            </Text>

            <Text style={[styles.agreementText, { fontSize: bodySize }]}>
              By accessing, downloading, or using the Tander mobile application, website, or related
              services ("Tander," "the App," "we," "us," or "our"), you agree to be bound by these
              Terms and Conditions ("Terms"). If you do not agree, please discontinue use of the App.
            </Text>

            {/* Sections */}
            <Section
              number="1"
              title="Eligibility and User Acceptance"
              content="Tander is intended exclusively for senior citizens generally 60 years old and above, or as defined by applicable Philippine laws. Tander reserves the right to verify age and identity, including the use of Senior citizen IDs, and to suspend or terminate accounts that provide false or misleading information."
            />

            <Section
              number="2"
              title="Purpose of the Platform"
              content="Tander is designed to reduce social isolation, encourage friendship and companionship, support emotional well-being, and provide a safe, guided, and senior-friendly digital experience. The App is not intended to replace professional medical, psychological, or emergency services."
            />

            <Section
              number="3"
              title="Account Registration and Security"
              content="Users are responsible for maintaining the confidentiality of their login credentials, including biometric authentication where available. Users must not share accounts, impersonate others, or use the App for unlawful purposes."
            />

            <Section
              number="4"
              title="Acceptable Use and Community Conduct"
              content="Users must not harass, abuse, exploit, scam, coerce, or upload offensive, misleading, or illegal content. Tander enforces a zero-tolerance policy for abuse, exploitation, and fraud involving senior users."
            />

            <Section
              number="5"
              title="Communication, Chat, and Video Features"
              content="Tander provides messaging, chat, and video call features to foster connection. Conversations are user-generated, and Tander does not guarantee compatibility, outcomes, or relationships. Users should exercise caution when sharing personal or financial information."
            />

            <Section
              number="6"
              title="Tandy - Digital Companion & Support"
              content={`Tandy is Tander's built-in digital companion designed to provide guidance, motivation, emotional encouragement, simple inhale-exhale breathing exercise, and in-app navigation assistance.

Tandy provides information based solely on user-provided input and general knowledge. Tandy does not provide medical, psychological, diagnostic, or treatment advice and must not be relied upon as a substitute for professional medical care. Users should always consult a qualified physician or healthcare professional regarding any medical condition, illness, or serious health concern. Tander and Tandy shall not be liable for actions taken based on information provided by Tandy.`}
            />

            <Section
              number="7"
              title="Wellness & Third-Party Redirection"
              content="Tander may provide optional redirection to third-party services such as pharmacies, drugstores, wellness merchants, or other service providers. These services are not owned or controlled by Tander and operate under their own terms and privacy policies. Tander is not responsible for third-party products, services, transactions, deliveries, medical outcomes, or damages arising from third-party interactions."
            />

            <Section
              number="8"
              title="Privacy and Data Protection"
              content="Tander respects user privacy and processes personal data in accordance with applicable data protection laws. Information collected may include profile details, uploaded photos, communication data, usage, and device information. Full details are outlined in Tander's Privacy Policy, which forms part of these Terms."
            />

            <Section
              number="9"
              title="Safety Disclaimer"
              content="While Tander implements reasonable safety measures, online interactions involve inherent risks. Users agree to exercise good judgement, avoid sharing sensitive personal or financial information, and report suspicious or inappropriate behavior promptly. Tander shall not be liable for the actions or conduct of other users."
            />

            <Section
              number="10"
              title="Intellectual Property"
              content="All content, branding, designs, logos, and software related to Tander are the exclusive property of Tander and its licensors. Unauthorized use is prohibited."
            />

            <Section
              number="11"
              title="Account Suspension and Termination"
              content="Tander may suspend or terminate accounts that violate these Terms, engage in harmful or unlawful conduct, or pose safety risks to the community. Users may request account deletion subject to applicable data retention laws."
            />

            <Section
              number="12"
              title="Limitation of Liability"
              content='To the maximum extent permitted by law, Tander is provided "as is" and "as available". Tander is not liable for emotional distress, relationship outcomes, or third-party interactions. Total liability shall not exceed amounts paid by the user, if any.'
            />

            <Section
              number="13"
              title="Modification to Terms"
              content="Tander reserves the right to update these Terms at any time. Continued use of the App after updates constitutes acceptance of the revised Terms."
            />

            <Section
              number="14"
              title="Governing Law"
              content="These Terms shall be governed by and interpreted in accordance with the laws of the Republic of the Philippines unless otherwise required by applicable law."
            />

            <Section
              number="15"
              title="Contact and Support"
              content="Users may contact Tander Support through the App Help Center or via Tandy, the digital companion assistant."
            />

            {/* Acknowledgement */}
            <View style={styles.acknowledgementBox}>
              <Text style={[styles.acknowledgementTitle, { fontSize: headingSize }]}>
                Acknowledgement
              </Text>
              <Text style={[styles.acknowledgementText, { fontSize: bodySize }]}>
                By creating an account or using the Tander App, you acknowledge that you have read,
                understood, and agreed to these Terms and Conditions.
              </Text>
            </View>

            {/* Close button at bottom */}
            <Pressable
              onPress={onClose}
              style={styles.bottomCloseButton}
              accessibilityRole="button"
              accessibilityLabel="I understand, close Terms and Conditions"
            >
              <LinearGradient
                colors={colors.gradient.ctaButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bottomCloseGradient}
              >
                <Text style={[styles.bottomCloseText, { fontSize: headingSize }]}>
                  I Understand
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },

  // Header
  header: {
    paddingBottom: spacing.l,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: colors.white,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: spacing.xxs,
  },
  closeButton: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.medium,
    minHeight: 44,
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.l,
  },

  // Content card
  contentCard: {
    alignSelf: 'center',
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xlarge,
    padding: spacing.l,
    ...shadows.medium,
  },

  // Welcome text
  welcomeText: {
    color: colors.gray[700],
    lineHeight: 24,
    marginBottom: spacing.m,
  },
  agreementText: {
    color: colors.gray[600],
    lineHeight: 24,
    marginBottom: spacing.l,
    fontStyle: 'italic',
  },

  // Sections
  section: {
    marginBottom: spacing.l,
  },
  sectionTitle: {
    color: colors.gray[900],
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  sectionContent: {
    color: colors.gray[700],
    lineHeight: 24,
  },

  // Acknowledgement
  acknowledgementBox: {
    backgroundColor: colors.teal[50],
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginTop: spacing.m,
    marginBottom: spacing.l,
    borderWidth: 1,
    borderColor: colors.teal[200],
  },
  acknowledgementTitle: {
    color: colors.teal[700],
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  acknowledgementText: {
    color: colors.teal[800],
    lineHeight: 24,
  },

  // Bottom close button
  bottomCloseButton: {
    borderRadius: 9999,
    overflow: 'hidden',
    ...shadows.medium,
  },
  bottomCloseGradient: {
    paddingVertical: spacing.m,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 56,
  },
  bottomCloseText: {
    color: colors.white,
    fontWeight: '700',
  },
});

export default TermsAndConditionsModal;
