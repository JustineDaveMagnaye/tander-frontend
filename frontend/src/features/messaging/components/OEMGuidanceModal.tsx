/**
 * OEM Guidance Modal
 *
 * Shows step-by-step guidance for users with aggressive OEM devices
 * (Xiaomi, Samsung, Oppo, Vivo, Huawei) to configure battery optimization
 * and auto-start settings for reliable incoming call notifications.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@shared/styles/colors';
import {
  oemGuidanceService,
  type OEMInfo,
  type GuidanceStep,
} from '@/services/incomingCall';

interface OEMGuidanceModalProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
  onRemindLater?: () => void;
}

export const OEMGuidanceModal: React.FC<OEMGuidanceModalProps> = ({
  visible,
  onDismiss,
  onComplete,
  onRemindLater,
}) => {
  const insets = useSafeAreaInsets();
  const [oemInfo, setOemInfo] = useState<OEMInfo | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (visible) {
      const info = oemGuidanceService.getOEMInfo();
      setOemInfo(info);
      setCurrentStep(0);
      setCompletedSteps(new Set());
    }
  }, [visible]);

  // Only show on Android
  if (Platform.OS !== 'android' || !oemInfo) {
    return null;
  }

  const steps = oemInfo.guidanceSteps;
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const allStepsCompleted = completedSteps.size === steps.length;

  const handleStepAction = () => {
    if (currentStepData.actionType) {
      oemGuidanceService.executeAction(currentStepData.actionType);
    }
    // Mark step as completed
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
  };

  const handleNextStep = () => {
    if (isLastStep) {
      // All steps shown, mark as completed
      oemGuidanceService.markGuidanceCompleted();
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    oemGuidanceService.markGuidanceDismissed();
    onDismiss();
  };

  const handleRemindLater = async () => {
    await oemGuidanceService.setReminder(24); // Remind in 24 hours
    onRemindLater?.();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              paddingBottom: Math.max(insets.bottom, 20),
              paddingTop: 20,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Important Setup</Text>
            <Text style={styles.subtitle}>
              Your {oemInfo.manufacturer} device needs extra settings to receive
              incoming call notifications reliably.
            </Text>
          </View>

          {/* Step Progress */}
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                  completedSteps.has(index) && styles.progressDotCompleted,
                ]}
              />
            ))}
          </View>

          {/* Current Step */}
          <ScrollView
            style={styles.stepContainer}
            contentContainerStyle={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>
                Step {currentStep + 1} of {steps.length}
              </Text>
            </View>

            <Text style={styles.stepTitle}>{currentStepData.title}</Text>
            <Text style={styles.stepDescription}>
              {currentStepData.description}
            </Text>

            {currentStepData.actionLabel && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleStepAction}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>
                  {currentStepData.actionLabel}
                </Text>
              </TouchableOpacity>
            )}

            {completedSteps.has(currentStep) && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>
                  Settings opened - Please follow the instructions above
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setCurrentStep((prev) => prev - 1)}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                currentStep === 0 && styles.primaryButtonFull,
              ]}
              onPress={handleNextStep}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {isLastStep ? "I've Completed All Steps" : 'Next Step'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer Actions */}
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={handleRemindLater} activeOpacity={0.7}>
              <Text style={styles.linkText}>Remind me later</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.linkTextMuted}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          {/* Warning */}
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              Without these settings, you may miss incoming calls when the app
              is closed or your phone is locked.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gray[200],
  },
  progressDotActive: {
    backgroundColor: colors.orange[500],
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: colors.teal[500],
  },
  stepContainer: {
    maxHeight: 280,
    marginBottom: 16,
  },
  stepContent: {
    paddingBottom: 8,
  },
  stepNumberBadge: {
    backgroundColor: colors.orange[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.orange[600],
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 18,
    color: colors.gray[700],
    lineHeight: 26,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: colors.orange[500],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  completedBadge: {
    backgroundColor: colors.teal[50],
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.teal[500],
  },
  completedBadgeText: {
    fontSize: 14,
    color: colors.teal[700],
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.teal[500],
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[700],
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  linkText: {
    fontSize: 16,
    color: colors.teal[600],
    fontWeight: '500',
  },
  linkTextMuted: {
    fontSize: 16,
    color: colors.gray[500],
  },
  warningContainer: {
    backgroundColor: colors.semantic.warning + '20',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.semantic.warning,
  },
  warningText: {
    fontSize: 14,
    color: colors.gray[700],
    lineHeight: 20,
  },
});

export default OEMGuidanceModal;
