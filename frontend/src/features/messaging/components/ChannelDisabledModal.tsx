/**
 * Channel Disabled Modal
 *
 * Shows when Android notification channels are misconfigured or disabled.
 * Guides users to fix notification settings for incoming calls and messages.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@shared/styles/colors';
import {
  channelMonitorService,
  type ChannelIssueInfo,
} from '@/services/incomingCall';

interface ChannelDisabledModalProps {
  visible: boolean;
  issues: ChannelIssueInfo[];
  onDismiss: () => void;
  onFixed: () => void;
}

const SEVERITY_CONFIG = {
  critical: {
    backgroundColor: colors.semantic.error + '15',
    borderColor: colors.semantic.error,
    iconColor: colors.semantic.error,
    icon: '!',
  },
  warning: {
    backgroundColor: colors.semantic.warning + '15',
    borderColor: colors.semantic.warning,
    iconColor: colors.semantic.warning,
    icon: '!',
  },
  info: {
    backgroundColor: colors.semantic.info + '15',
    borderColor: colors.semantic.info,
    iconColor: colors.semantic.info,
    icon: 'i',
  },
};

export const ChannelDisabledModal: React.FC<ChannelDisabledModalProps> = ({
  visible,
  issues,
  onDismiss,
  onFixed,
}) => {
  const insets = useSafeAreaInsets();

  // Only show on Android
  if (Platform.OS !== 'android') {
    return null;
  }

  // Sort issues by severity
  const sortedIssues = [...issues].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const criticalIssues = sortedIssues.filter((i) => i.severity === 'critical');
  const hasCriticalIssues = criticalIssues.length > 0;

  const handleFixIssue = (issue: ChannelIssueInfo) => {
    issue.action();
  };

  const handleCheckAgain = async () => {
    await channelMonitorService.checkAllChannels();
    const newIssues = await channelMonitorService.getIncomingCallsChannelIssues();
    if (newIssues.filter((i) => i.severity === 'critical').length === 0) {
      onFixed();
    }
  };

  const handleDismissWarning = async (issue: ChannelIssueInfo) => {
    await channelMonitorService.dismissWarning(issue.channelId);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                hasCriticalIssues && styles.iconContainerCritical,
              ]}
            >
              <Text
                style={[
                  styles.iconText,
                  hasCriticalIssues && styles.iconTextCritical,
                ]}
              >
                {hasCriticalIssues ? '!' : 'i'}
              </Text>
            </View>
            <Text style={styles.title}>
              {hasCriticalIssues
                ? 'Notification Settings Need Attention'
                : 'Notification Settings'}
            </Text>
            <Text style={styles.subtitle}>
              {hasCriticalIssues
                ? 'Some settings need to be fixed for you to receive incoming calls.'
                : 'Some notification settings could be improved.'}
            </Text>
          </View>

          {/* Issues List */}
          <View style={styles.issuesList}>
            {sortedIssues.map((issue, index) => {
              const config = SEVERITY_CONFIG[issue.severity];
              return (
                <View
                  key={`${issue.channelId}-${issue.issue}-${index}`}
                  style={[
                    styles.issueCard,
                    {
                      backgroundColor: config.backgroundColor,
                      borderLeftColor: config.borderColor,
                    },
                  ]}
                >
                  <View style={styles.issueContent}>
                    <Text style={styles.issueDescription}>
                      {issue.description}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.fixButton,
                      issue.severity === 'critical' && styles.fixButtonCritical,
                    ]}
                    onPress={() => handleFixIssue(issue)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.fixButtonText,
                        issue.severity === 'critical' &&
                          styles.fixButtonTextCritical,
                      ]}
                    >
                      Fix Now
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCheckAgain}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                I've Fixed the Settings
              </Text>
            </TouchableOpacity>

            {!hasCriticalIssues && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>
                  Dismiss for Now
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Help Text */}
          <Text style={styles.helpText}>
            These settings were changed by you or the system. Tap "Fix Now" to
            open the settings directly.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.semantic.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerCritical: {
    backgroundColor: colors.semantic.error + '20',
  },
  iconText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.semantic.warning,
  },
  iconTextCritical: {
    color: colors.semantic.error,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
  },
  issuesList: {
    marginBottom: 20,
    gap: 12,
  },
  issueCard: {
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
  },
  issueContent: {
    marginBottom: 12,
  },
  issueDescription: {
    fontSize: 16,
    color: colors.gray[800],
    lineHeight: 22,
  },
  fixButton: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  fixButtonCritical: {
    backgroundColor: colors.semantic.error,
    borderColor: colors.semantic.error,
  },
  fixButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
  },
  fixButtonTextCritical: {
    color: colors.white,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: colors.teal[500],
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[300],
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
  },
  helpText: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ChannelDisabledModal;
