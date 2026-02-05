/**
 * TANDER Data Privacy and Data Protection Modal
 * Full-screen scrollable modal with Data Privacy Policy content
 *
 * Features:
 * - Responsive for phones, tablets, iPads
 * - Portrait and landscape support
 * - Senior-friendly large text and touch targets
 * - Accessible with screen reader support
 * - Compliant with Data Privacy Act of 2012 (RA 10173)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors } from '@shared/styles/colors';
import { spacing, borderRadius, shadows } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';

interface DataPrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DataPrivacyModal: React.FC<DataPrivacyModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape, hp } = useResponsive();

  // Responsive sizes
  const titleSize = isLandscape ? Math.min(hp(5), 24) : isTablet ? 28 : 24;
  const headingSize = isTablet ? 18 : 16;
  const bodySize = isTablet ? 16 : 15;
  const maxContentWidth = isTablet ? 700 : 600;

  const Section = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontSize: headingSize }]}>
        {number}. {title}
      </Text>
      {children}
    </View>
  );

  const BulletPoint = ({ text }: { text: string }) => (
    <View style={styles.bulletRow}>
      <View style={styles.bullet} />
      <Text style={[styles.bulletText, { fontSize: bodySize }]}>{text}</Text>
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
        <StatusBar barStyle="light-content" backgroundColor={colors.orange[600]} />

        {/* Header */}
        <LinearGradient
          colors={[colors.orange[500], colors.orange[600]]}
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
              <View style={styles.headerTitleRow}>
                <Feather name="shield" size={24} color={colors.white} style={styles.headerIcon} />
                <Text style={[styles.headerTitle, { fontSize: titleSize }]}>
                  Data Privacy Policy
                </Text>
              </View>
              <Text style={styles.headerSubtitle}>Version 1.0 • RA 10173 Compliant</Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close Data Privacy Policy"
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
            {/* Introduction */}
            <View style={styles.introBox}>
              <Feather name="lock" size={20} color={colors.orange[600]} />
              <Text style={[styles.introText, { fontSize: bodySize }]}>
                Tander is committed to protecting the privacy, security, and confidentiality of all
                personal data entrusted to us. We uphold the principles of transparency,
                accountability, and lawful processing of personal information in full compliance with
                the <Text style={styles.boldText}>Data Privacy Act of 2012 (Republic Act No. 10173)</Text> and
                its Implementing Rules and Regulations.
              </Text>
            </View>

            {/* Section 1 */}
            <Section number="1" title="Collection of Personal Data">
              <Text style={[styles.sectionContent, { fontSize: bodySize }]}>
                Tander collects only personal data that is necessary, relevant, and lawful for
                legitimate business purposes, including but not limited to:
              </Text>
              <View style={styles.bulletList}>
                <BulletPoint text="Account registration and user identification" />
                <BulletPoint text="Service delivery and application functionality" />
                <BulletPoint text="Customer support and official communication" />
                <BulletPoint text="System security, analytics, and continuous improvement" />
              </View>
              <Text style={[styles.sectionContent, { fontSize: bodySize, marginTop: spacing.m }]}>
                Personal data collected may include, but is not limited to, the individual’s name contact number, 
                username, marital status, and a valid Government-issued ID or OSCA ID. Government-issued IDs and OSCA 
                IDs are collected solely for verification purposes to validate the accuracy of the information provided and to 
                ensure that only legitimate senior citizens are permitted to register for and access the TANDER Platform. This 
                verification process also serves to prevent unauthorized, fraudulent, or misrepresented accounts. 
              </Text>
            </Section>

            {/* Section 2 */}
            <Section number="2" title="Use and Processing of Data">
              <Text style={[styles.sectionContent, { fontSize: bodySize }]}>
                Collected personal data is processed fairly, lawfully, and securely and is used
                solely for the following purposes:
              </Text>
              <View style={styles.bulletList}>
                <BulletPoint text="Providing, maintaining, and improving Tander's digital services, including verifying that registered subscribers are eligible senior citizens" />
                <BulletPoint text="Ensuring system integrity, security, and fraud prevention" />
                <BulletPoint text="Compliance with applicable legal, regulatory, and contractual obligations" />
              </View>
              <Text style={[styles.sectionContent, { fontSize: bodySize, marginTop: spacing.m }]}>
                Personal data shall not be used for purposes beyond those stated without the
                explicit consent of the data subject, unless otherwise permitted by law.
              </Text>
            </Section>

            {/* Section 3 */}
            <Section number="3" title="Data Sharing and Disclosure">
              <View style={styles.highlightBox}>
                <Feather name="check-circle" size={18} color={colors.teal[600]} />
                <Text style={[styles.highlightText, { fontSize: bodySize }]}>
                  Tander does not sell, trade, or commercially exploit personal data.
                </Text>
              </View>
              <Text style={[styles.sectionContent, { fontSize: bodySize, marginTop: spacing.m }]}>
                Personal data may only be shared with:
              </Text>
              <View style={styles.bulletList}>
                <BulletPoint text="Authorized service providers and business partners bound by confidentiality and data protection agreements" />
                <BulletPoint text="Government authorities or regulators when required by law or lawful order" />
              </View>
              <Text style={[styles.sectionContent, { fontSize: bodySize, marginTop: spacing.m }]}>
                All third parties are required to comply with applicable data privacy and security standards.
              </Text>
            </Section>

            {/* Section 4 */}
            <Section number="4" title="Data Security Measures">
              <Text style={[styles.sectionContent, { fontSize: bodySize }]}>
                Tander implements appropriate organizational, physical, and technical security
                measures, including but not limited to:
              </Text>
              <View style={styles.bulletList}>
                <BulletPoint text="Secure servers and encrypted data transmission" />
                <BulletPoint text="Role-based access controls and authentication protocols" />
                <BulletPoint text="Regular system monitoring, audits, and security updates" />
              </View>
              <Text style={[styles.sectionContent, { fontSize: bodySize, marginTop: spacing.m }]}>
                These measures are designed to protect personal data against unauthorized access,
                loss, misuse, alteration, or disclosure.
              </Text>
            </Section>

            {/* Section 5 */}
            <Section number="5" title="Data Retention">
              <Text style={[styles.sectionContent, { fontSize: bodySize }]}>
                Personal data is retained only for as long as necessary to fulfill its stated
                purpose or as required by applicable laws and regulations. Once no longer required,
                personal data is <Text style={styles.boldText}>securely deleted, disposed of, or anonymized</Text>.
              </Text>
            </Section>

            {/* Section 6 */}
            <Section number="6" title="Data Subject Rights">
              <Text style={[styles.sectionContent, { fontSize: bodySize }]}>
                In accordance with the Data Privacy Act of 2012, users have the right to:
              </Text>
              <View style={styles.bulletList}>
                <BulletPoint text="Be informed of data processing activities" />
                <BulletPoint text="Access their personal data" />
                <BulletPoint text="Request correction or updating of inaccurate data" />
                <BulletPoint text="Object to the processing of their data" />
                <BulletPoint text="Request deletion of personal data or withdrawal of consent, subject to legal limitations" />
                <BulletPoint text="File a complaint with the National Privacy Commission (NPC)" />
              </View>
            </Section>

            {/* Section 7 */}
            <Section number="7" title="User Consent and Acceptance">
              <View style={styles.consentBox}>
                <Text style={[styles.consentText, { fontSize: bodySize }]}>
                  By creating an account, subscribing, or using Tander's services, the user confirms
                  that they have <Text style={styles.boldText}>read, understood, and agreed</Text> to
                  this Data Privacy and Data Protection Conditions and <Text style={styles.boldText}>consents
                  to the collection, use, and processing</Text> of their personal data in accordance
                  with applicable laws.
                </Text>
              </View>
            </Section>

            {/* Section 8 */}
            <Section number="8" title="Updates to This Policy">
              <Text style={[styles.sectionContent, { fontSize: bodySize }]}>
                Tander may update this policy from time to time to reflect legal, regulatory, or
                operational changes. Users will be notified of significant updates through official
                channels.
              </Text>
            </Section>

            {/* Section 9 */}
            <Section number="9" title="Contact Information">
              <Text style={[styles.sectionContent, { fontSize: bodySize }]}>
                For questions, concerns, or data privacy requests, users may contact Tander's
                Data Protection Officer (DPO) through official support channels:
              </Text>
              <View style={styles.contactBox}>
                <Feather name="mail" size={18} color={colors.orange[600]} />
                <Text style={[styles.contactEmail, { fontSize: bodySize }]}>
                  edge@cvmfinance.com
                </Text>
              </View>
            </Section>

            {/* Acknowledgement */}
            <View style={styles.acknowledgementBox}>
              <Text style={[styles.acknowledgementTitle, { fontSize: headingSize }]}>
                Your Privacy Matters
              </Text>
              <Text style={[styles.acknowledgementText, { fontSize: bodySize }]}>
                By using Tander, you acknowledge that you have read and understood this Data Privacy
                and Data Protection Policy. Your personal information is protected under Philippine
                law (RA 10173).
              </Text>
            </View>

            {/* Close button at bottom */}
            <Pressable
              onPress={onClose}
              style={styles.bottomCloseButton}
              accessibilityRole="button"
              accessibilityLabel="I understand, close Data Privacy Policy"
            >
              <LinearGradient
                colors={[colors.orange[500], colors.orange[600]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bottomCloseGradient}
              >
                <Feather name="check" size={20} color={colors.white} />
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: spacing.s,
  },
  headerTitle: {
    color: colors.white,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: spacing.xxs,
    marginLeft: 32,
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

  // Intro box
  introBox: {
    flexDirection: 'row',
    backgroundColor: colors.orange[50],
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginBottom: spacing.l,
    borderWidth: 1,
    borderColor: colors.orange[200],
    gap: spacing.m,
  },
  introText: {
    flex: 1,
    color: colors.gray[700],
    lineHeight: 24,
  },
  boldText: {
    fontWeight: '700',
    color: colors.gray[900],
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

  // Bullet list
  bulletList: {
    marginTop: spacing.s,
    marginLeft: spacing.s,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingRight: spacing.m,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange[500],
    marginTop: 8,
    marginRight: spacing.s,
  },
  bulletText: {
    flex: 1,
    color: colors.gray[700],
    lineHeight: 22,
  },

  // Highlight box
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teal[50],
    borderRadius: borderRadius.medium,
    padding: spacing.m,
    gap: spacing.s,
    borderWidth: 1,
    borderColor: colors.teal[200],
  },
  highlightText: {
    flex: 1,
    color: colors.teal[800],
    fontWeight: '600',
    lineHeight: 22,
  },

  // Consent box
  consentBox: {
    backgroundColor: colors.orange[50],
    borderRadius: borderRadius.medium,
    padding: spacing.m,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange[500],
  },
  consentText: {
    color: colors.gray[700],
    lineHeight: 24,
  },

  // Contact box
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.medium,
    padding: spacing.m,
    marginTop: spacing.m,
    gap: spacing.s,
  },
  contactEmail: {
    color: colors.orange[600],
    fontWeight: '600',
  },

  // Acknowledgement
  acknowledgementBox: {
    backgroundColor: colors.orange[50],
    borderRadius: borderRadius.large,
    padding: spacing.m,
    marginTop: spacing.m,
    marginBottom: spacing.l,
    borderWidth: 1,
    borderColor: colors.orange[200],
  },
  acknowledgementTitle: {
    color: colors.orange[700],
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  acknowledgementText: {
    color: colors.orange[800],
    lineHeight: 24,
  },

  // Bottom close button
  bottomCloseButton: {
    borderRadius: 9999,
    overflow: 'hidden',
    ...shadows.medium,
  },
  bottomCloseGradient: {
    flexDirection: 'row',
    paddingVertical: spacing.m,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 56,
    gap: spacing.s,
  },
  bottomCloseText: {
    color: colors.white,
    fontWeight: '700',
  },
});

export default DataPrivacyModal;
