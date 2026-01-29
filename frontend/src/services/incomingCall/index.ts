/**
 * TANDER Incoming Call Services
 *
 * This module provides comprehensive incoming call handling for Android:
 * - Native foreground service for reliable ringing
 * - Full-screen intent for lock screen display
 * - OEM-specific battery optimization guidance
 * - Notification channel monitoring
 * - Push deduplication for ghost call prevention
 */

// Native Module Interface
export {
  incomingCallNativeModule,
  ChannelImportance,
  type ChannelState,
  type DeviceInfo,
  type CallActionEvent,
  type PreflightCheckResult,
  type ActionableIssue,
} from './IncomingCallNativeModule';

// OEM Guidance Service
export {
  oemGuidanceService,
  type OEMAggressiveness,
  type OEMInfo,
  type GuidanceStep,
} from './OEMGuidanceService';

// Channel Monitor Service
export {
  channelMonitorService,
  CHANNEL_IDS,
  type ChannelId,
  type ChannelIssue,
  type ChannelIssueInfo,
} from './ChannelMonitorService';

// Push Deduplicator Service
export {
  pushDeduplicatorService,
} from './PushDeduplicatorService';

// Diagnostics (for development and testing)
export {
  runFullDiagnostics,
  isIncomingCallSystemReady,
  testIncomingCall,
  type DiagnosticResult,
  type FullDiagnosticReport,
} from './IncomingCallDiagnostics';

/**
 * Initialize all incoming call services
 * Call this once during app startup
 * Returns initialization result including any critical issues
 */
export async function initializeIncomingCallServices(): Promise<{
  success: boolean;
  criticalIssues: number;
  warnings: number;
}> {
  const { incomingCallNativeModule } = await import('./IncomingCallNativeModule');
  const { oemGuidanceService } = await import('./OEMGuidanceService');
  const { channelMonitorService } = await import('./ChannelMonitorService');
  const { pushDeduplicatorService } = await import('./PushDeduplicatorService');

  console.log('[IncomingCall] Initializing services...');

  // Initialize all services in parallel
  const [nativeResult] = await Promise.all([
    incomingCallNativeModule.initializeWithCheck(),
    oemGuidanceService.initialize(),
    channelMonitorService.initialize(),
    pushDeduplicatorService.initialize(),
  ]);

  // Count issues by severity
  const criticalIssues = nativeResult.issues.filter(i => i.severity === 'critical').length;
  const warnings = nativeResult.issues.filter(i => i.severity === 'warning').length;

  console.log('[IncomingCall] All services initialized', {
    success: nativeResult.success,
    criticalIssues,
    warnings,
    device: nativeResult.preflight
      ? `${nativeResult.preflight.manufacturer} ${nativeResult.preflight.model}`
      : 'unknown',
  });

  return {
    success: nativeResult.success,
    criticalIssues,
    warnings,
  };
}

/**
 * Cleanup all incoming call services
 * Call this on app unmount/logout
 */
export function cleanupIncomingCallServices(): void {
  const { incomingCallNativeModule } = require('./IncomingCallNativeModule');
  const { channelMonitorService } = require('./ChannelMonitorService');
  const { pushDeduplicatorService } = require('./PushDeduplicatorService');

  incomingCallNativeModule.cleanup();
  channelMonitorService.cleanup();
  pushDeduplicatorService.cleanup();

  console.log('[IncomingCall] All services cleaned up');
}
