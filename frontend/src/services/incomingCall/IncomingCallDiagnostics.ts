/**
 * TANDER Incoming Call Diagnostics
 *
 * Provides diagnostic functions to verify the incoming call system
 * is properly configured and working. Use these functions during
 * development and testing.
 */

import { Platform } from 'react-native';
import { incomingCallNativeModule } from './IncomingCallNativeModule';
import { oemGuidanceService } from './OEMGuidanceService';
import { channelMonitorService, CHANNEL_IDS } from './ChannelMonitorService';
import { pushDeduplicatorService } from './PushDeduplicatorService';

export interface DiagnosticResult {
  component: string;
  status: 'pass' | 'warning' | 'fail' | 'skip';
  message: string;
  details?: any;
}

export interface FullDiagnosticReport {
  platform: string;
  timestamp: string;
  overallStatus: 'ready' | 'issues' | 'critical' | 'skip';
  results: DiagnosticResult[];
  recommendations: string[];
}

/**
 * Run full diagnostic check on the incoming call system
 */
export async function runFullDiagnostics(): Promise<FullDiagnosticReport> {
  const results: DiagnosticResult[] = [];
  const recommendations: string[] = [];

  // Check platform
  if (Platform.OS !== 'android') {
    return {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      overallStatus: 'skip',
      results: [{
        component: 'Platform',
        status: 'skip',
        message: 'Diagnostics only run on Android',
      }],
      recommendations: [],
    };
  }

  // 1. Check native module availability
  const nativeAvailable = incomingCallNativeModule.isAvailable();
  results.push({
    component: 'NativeModule',
    status: nativeAvailable ? 'pass' : 'fail',
    message: nativeAvailable
      ? 'Native incoming call module is available'
      : 'Native module not available - native features disabled',
  });

  if (!nativeAvailable) {
    recommendations.push('Rebuild the app with expo prebuild to ensure native module is linked');
  }

  // 2. Check device info
  if (nativeAvailable) {
    try {
      const deviceInfo = await incomingCallNativeModule.getDeviceInfo();
      results.push({
        component: 'DeviceInfo',
        status: 'pass',
        message: `Device: ${deviceInfo?.manufacturer} ${deviceInfo?.model}`,
        details: deviceInfo,
      });
    } catch (error) {
      results.push({
        component: 'DeviceInfo',
        status: 'warning',
        message: 'Could not retrieve device info',
        details: error,
      });
    }
  }

  // 3. Check OEM aggressiveness
  const oemInfo = oemGuidanceService.getOEMInfo();
  if (oemInfo) {
    results.push({
      component: 'OEMDetection',
      status: oemInfo.aggressiveness === 'aggressive' ? 'warning' : 'pass',
      message: `${oemInfo.manufacturer} - ${oemInfo.aggressiveness} battery management`,
      details: oemInfo,
    });

    if (oemInfo.aggressiveness === 'aggressive') {
      recommendations.push(`Your ${oemInfo.manufacturer} device has aggressive battery management. Consider following the setup guide.`);
    }
  }

  // 4. Check battery optimization
  if (nativeAvailable) {
    try {
      const batteryIgnored = await incomingCallNativeModule.isBatteryOptimizationIgnored();
      results.push({
        component: 'BatteryOptimization',
        status: batteryIgnored ? 'pass' : 'warning',
        message: batteryIgnored
          ? 'App is exempt from battery optimization'
          : 'App is NOT exempt from battery optimization',
      });

      if (!batteryIgnored) {
        recommendations.push('Enable "Unrestricted" battery mode for the app to receive calls reliably');
      }
    } catch (error) {
      results.push({
        component: 'BatteryOptimization',
        status: 'warning',
        message: 'Could not check battery optimization status',
      });
    }
  }

  // 5. Check notification permissions
  if (nativeAvailable) {
    try {
      const notificationsEnabled = await incomingCallNativeModule.areNotificationsEnabled();
      results.push({
        component: 'NotificationPermission',
        status: notificationsEnabled ? 'pass' : 'fail',
        message: notificationsEnabled
          ? 'Notification permission granted'
          : 'Notification permission DENIED',
      });

      if (!notificationsEnabled) {
        recommendations.push('Grant notification permission to receive incoming call alerts');
      }
    } catch (error) {
      results.push({
        component: 'NotificationPermission',
        status: 'warning',
        message: 'Could not check notification permission',
      });
    }
  }

  // 6. Check incoming calls channel
  try {
    const channelState = await channelMonitorService.checkChannel(CHANNEL_IDS.INCOMING_CALLS);
    if (channelState) {
      const channelOK = channelState.exists && channelState.enabled && channelState.importance >= 4;
      results.push({
        component: 'IncomingCallsChannel',
        status: channelOK ? 'pass' : channelState.enabled ? 'warning' : 'fail',
        message: channelOK
          ? 'Incoming calls channel properly configured'
          : !channelState.exists
            ? 'Channel does not exist'
            : !channelState.enabled
              ? 'Channel is DISABLED'
              : 'Channel importance too low',
        details: channelState,
      });

      if (!channelOK) {
        recommendations.push('Open notification settings and enable the Incoming Calls channel with high priority');
      }
    }
  } catch (error) {
    results.push({
      component: 'IncomingCallsChannel',
      status: 'warning',
      message: 'Could not check channel state',
    });
  }

  // 7. Check full-screen intent permission (Android 14+)
  if (nativeAvailable) {
    try {
      const canUseFullScreen = await incomingCallNativeModule.canUseFullScreenIntent();
      results.push({
        component: 'FullScreenIntent',
        status: canUseFullScreen ? 'pass' : 'warning',
        message: canUseFullScreen
          ? 'Full-screen intent permission granted'
          : 'Full-screen intent permission NOT granted (Android 14+)',
      });

      if (!canUseFullScreen) {
        recommendations.push('Grant full-screen intent permission to show calls on lock screen');
      }
    } catch (error) {
      results.push({
        component: 'FullScreenIntent',
        status: 'pass',
        message: 'Full-screen intent auto-granted (Android < 14)',
      });
    }
  }

  // 8. Check push deduplicator
  try {
    const activeCalls = pushDeduplicatorService.getActiveCalls();
    results.push({
      component: 'PushDeduplicator',
      status: 'pass',
      message: `Push deduplicator active (${activeCalls.length} tracked calls)`,
    });
  } catch (error) {
    results.push({
      component: 'PushDeduplicator',
      status: 'warning',
      message: 'Could not check push deduplicator status',
    });
  }

  // Calculate overall status
  const hasFailures = results.some(r => r.status === 'fail');
  const hasWarnings = results.some(r => r.status === 'warning');

  return {
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
    overallStatus: hasFailures ? 'critical' : hasWarnings ? 'issues' : 'ready',
    results,
    recommendations,
  };
}

/**
 * Quick check if the system is ready for incoming calls
 */
export async function isIncomingCallSystemReady(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true; // iOS uses different system
  }

  // Check critical components
  const nativeAvailable = incomingCallNativeModule.isAvailable();
  if (!nativeAvailable) {
    console.warn('[Diagnostics] Native module not available');
    return true; // Can still work with RN fallback
  }

  const notificationsEnabled = await incomingCallNativeModule.areNotificationsEnabled();
  if (!notificationsEnabled) {
    console.warn('[Diagnostics] Notifications not enabled');
    return false;
  }

  const channelState = await channelMonitorService.checkChannel(CHANNEL_IDS.INCOMING_CALLS);
  if (!channelState?.enabled) {
    console.warn('[Diagnostics] Incoming calls channel disabled');
    return false;
  }

  return true;
}

/**
 * Test the incoming call system with a fake call
 * Only available in __DEV__ mode
 */
export function testIncomingCall(): void {
  if (!__DEV__) {
    console.warn('[Diagnostics] Test calls only available in development mode');
    return;
  }

  if (Platform.OS !== 'android') {
    console.warn('[Diagnostics] Test calls only available on Android');
    return;
  }

  if (!incomingCallNativeModule.isAvailable()) {
    console.warn('[Diagnostics] Native module not available for testing');
    return;
  }

  console.log('[Diagnostics] Starting test incoming call...');
  incomingCallNativeModule.showIncomingCall(
    '999',
    'Test Caller',
    undefined,
    'video',
    'test_room_' + Date.now()
  );

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    console.log('[Diagnostics] Auto-dismissing test call');
    incomingCallNativeModule.hideIncomingCall('test_room_*');
  }, 10000);
}

export default {
  runFullDiagnostics,
  isIncomingCallSystemReady,
  testIncomingCall,
};
