/**
 * TANDER OEM Guidance Service
 *
 * Provides OEM-specific guidance for battery optimization and auto-start settings.
 * Different Android manufacturers have different approaches to battery management
 * that can prevent apps from receiving notifications when backgrounded/terminated.
 *
 * Supported OEMs:
 * - Xiaomi (MIUI)
 * - Samsung (One UI)
 * - Oppo (ColorOS)
 * - Vivo (Funtouch OS)
 * - Huawei/Honor (EMUI/Magic UI)
 * - OnePlus (OxygenOS)
 * - Realme (Realme UI)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { incomingCallNativeModule, DeviceInfo } from './IncomingCallNativeModule';

// Storage keys
const STORAGE_KEYS = {
  GUIDANCE_SHOWN: '@tander_oem_guidance_shown',
  GUIDANCE_COMPLETED: '@tander_oem_guidance_completed',
  GUIDANCE_DISMISSED: '@tander_oem_guidance_dismissed',
  GUIDANCE_REMIND_AT: '@tander_oem_guidance_remind_at',
  MISSED_CALL_COUNT: '@tander_oem_missed_call_count',
};

// OEM classification
export type OEMAggressiveness = 'aggressive' | 'moderate' | 'standard';

export interface OEMInfo {
  manufacturer: string;
  aggressiveness: OEMAggressiveness;
  needsAutoStart: boolean;
  needsBatteryWhitelist: boolean;
  guidanceSteps: GuidanceStep[];
}

export interface GuidanceStep {
  title: string;
  description: string;
  actionLabel?: string;
  actionType?: 'auto_start' | 'battery' | 'notification' | 'full_screen';
}

// OEM configurations - Comprehensive list covering 95%+ of Android devices
const OEM_CONFIGS: Record<string, Omit<OEMInfo, 'manufacturer'>> = {
  xiaomi: {
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Enable Auto-start',
        description: 'Go to Security app → Permissions → Auto-start → Enable for TANDER',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Disable Battery Saver',
        description: 'Go to Settings → Apps → TANDER → Battery saver → No restrictions',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
      {
        title: 'Lock App in Recent Tasks',
        description: 'Open TANDER → Open recent apps → Long press TANDER → Tap the lock icon',
      },
    ],
  },
  redmi: {
    // Redmi is a sub-brand of Xiaomi with same MIUI
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Enable Auto-start',
        description: 'Go to Security app → Permissions → Auto-start → Enable for TANDER',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Disable Battery Saver',
        description: 'Go to Settings → Apps → TANDER → Battery saver → No restrictions',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  poco: {
    // POCO is a sub-brand of Xiaomi with same MIUI
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Enable Auto-start',
        description: 'Go to Security app → Permissions → Auto-start → Enable for TANDER',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Disable Battery Saver',
        description: 'Go to Settings → Apps → TANDER → Battery saver → No restrictions',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  samsung: {
    aggressiveness: 'moderate',
    needsAutoStart: false,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Remove Battery Restrictions',
        description: 'Go to Settings → Apps → TANDER → Battery → Unrestricted',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
      {
        title: 'Remove from Sleeping Apps',
        description: 'Go to Settings → Device Care → Battery → Background usage limits → Remove TANDER from sleeping apps',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  oppo: {
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Enable Auto-launch',
        description: 'Go to Settings → App Management → App List → TANDER → Enable Auto-launch',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Allow Background Activity',
        description: 'Go to Settings → Battery → TANDER → Allow background activity',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  vivo: {
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Enable Auto-start',
        description: 'Go to Settings → More Settings → Applications → Auto-start → Enable TANDER',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Allow High Power Usage',
        description: 'Go to Settings → Battery → High background power consumption → Add TANDER',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  iqoo: {
    // iQOO is a sub-brand of Vivo
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Enable Auto-start',
        description: 'Go to Settings → More Settings → Applications → Auto-start → Enable TANDER',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Allow High Power Usage',
        description: 'Go to Settings → Battery → High background power consumption → Add TANDER',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  huawei: {
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Configure App Launch',
        description: 'Go to Settings → Battery → App launch → TANDER → Manage manually → Enable all toggles',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Ignore Battery Optimization',
        description: 'Go to Settings → Apps → TANDER → Battery → Enable "Don\'t optimize"',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  honor: {
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Configure App Launch',
        description: 'Go to Settings → Battery → App launch → TANDER → Manage manually → Enable all toggles',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Ignore Battery Optimization',
        description: 'Go to Settings → Apps → TANDER → Battery → Enable "Don\'t optimize"',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  oneplus: {
    aggressiveness: 'moderate',
    needsAutoStart: false,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Disable Battery Optimization',
        description: 'Go to Settings → Apps → TANDER → Battery → Don\'t optimize',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  realme: {
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Enable Auto-launch',
        description: 'Go to Settings → App Management → Auto-launch → Enable TANDER',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Allow Background Activity',
        description: 'Go to Settings → Battery → TANDER → Allow background activity',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  asus: {
    aggressiveness: 'moderate',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Enable Auto-start',
        description: 'Go to Settings → Power Management → Auto-start Manager → Enable TANDER',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Disable Battery Optimization',
        description: 'Go to Settings → Apps → TANDER → Battery → Don\'t optimize',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  lenovo: {
    aggressiveness: 'moderate',
    needsAutoStart: false,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Disable Battery Optimization',
        description: 'Go to Settings → Apps → TANDER → Battery → Don\'t optimize',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  nokia: {
    // Nokia uses mostly stock Android but with some battery optimizations
    aggressiveness: 'moderate',
    needsAutoStart: false,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Disable Adaptive Battery',
        description: 'Go to Settings → Battery → Adaptive Battery → Turn off or add TANDER exception',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  motorola: {
    // Motorola uses near-stock Android
    aggressiveness: 'standard',
    needsAutoStart: false,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Disable Battery Optimization',
        description: 'Go to Settings → Apps → TANDER → Battery → Don\'t optimize',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  google: {
    // Google Pixel - near-stock Android, least aggressive
    aggressiveness: 'standard',
    needsAutoStart: false,
    needsBatteryWhitelist: false,
    guidanceSteps: [
      {
        title: 'Check Battery Settings',
        description: 'Go to Settings → Apps → TANDER → Battery → Unrestricted',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  pixel: {
    // Google Pixel alternative brand detection
    aggressiveness: 'standard',
    needsAutoStart: false,
    needsBatteryWhitelist: false,
    guidanceSteps: [
      {
        title: 'Check Battery Settings',
        description: 'Go to Settings → Apps → TANDER → Battery → Unrestricted',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  sony: {
    aggressiveness: 'moderate',
    needsAutoStart: false,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Disable Stamina Mode Restriction',
        description: 'Go to Settings → Battery → STAMINA mode → Add TANDER to exceptions',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  lg: {
    aggressiveness: 'moderate',
    needsAutoStart: false,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Disable Battery Optimization',
        description: 'Go to Settings → Apps → TANDER → Battery → Don\'t optimize',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  tecno: {
    // Tecno is popular in Philippines and uses aggressive battery management
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Enable Auto-start',
        description: 'Go to Phone Master → Permission Manager → Auto-start → Enable TANDER',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Disable Battery Optimization',
        description: 'Go to Settings → Apps → TANDER → Battery → Don\'t optimize',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  infinix: {
    // Infinix is popular in Philippines, similar to Tecno
    aggressiveness: 'aggressive',
    needsAutoStart: true,
    needsBatteryWhitelist: true,
    guidanceSteps: [
      {
        title: 'Enable Auto-start',
        description: 'Go to Phone Master → Permission Manager → Auto-start → Enable TANDER',
        actionLabel: 'Open Auto-start Settings',
        actionType: 'auto_start',
      },
      {
        title: 'Disable Battery Optimization',
        description: 'Go to Settings → Apps → TANDER → Battery → Don\'t optimize',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
  default: {
    aggressiveness: 'standard',
    needsAutoStart: false,
    needsBatteryWhitelist: false,
    guidanceSteps: [
      {
        title: 'Check Battery Settings',
        description: 'Go to Settings → Apps → TANDER → Battery → Select "Unrestricted" or "Don\'t optimize"',
        actionLabel: 'Open Battery Settings',
        actionType: 'battery',
      },
    ],
  },
};

/**
 * OEM Guidance Service
 */
class OEMGuidanceService {
  private deviceInfo: DeviceInfo | null = null;
  private oemInfo: OEMInfo | null = null;

  /**
   * Initialize the service by detecting the device
   */
  async initialize(): Promise<void> {
    if (!incomingCallNativeModule.isAvailable()) {
      console.log('[OEMGuidance] Native module not available');
      return;
    }

    try {
      this.deviceInfo = await incomingCallNativeModule.getDeviceInfo();
      if (this.deviceInfo) {
        this.oemInfo = this.detectOEM(this.deviceInfo);
        console.log('[OEMGuidance] Detected OEM:', this.oemInfo);
      }
    } catch (error) {
      console.warn('[OEMGuidance] Failed to detect device:', error);
    }
  }

  /**
   * Detect OEM from device info
   */
  private detectOEM(deviceInfo: DeviceInfo): OEMInfo {
    const manufacturer = deviceInfo.manufacturer.toLowerCase();
    const brand = deviceInfo.brand.toLowerCase();

    // Check manufacturer and brand
    const oemKey = Object.keys(OEM_CONFIGS).find((key) => {
      if (key === 'default') return false;
      return manufacturer.includes(key) || brand.includes(key);
    });

    const config = oemKey ? OEM_CONFIGS[oemKey] : OEM_CONFIGS.default;

    return {
      manufacturer: deviceInfo.manufacturer,
      ...config,
    };
  }

  /**
   * Get OEM information
   */
  getOEMInfo(): OEMInfo | null {
    return this.oemInfo;
  }

  /**
   * Check if the device is from an aggressive OEM
   */
  isAggressiveOEM(): boolean {
    return this.oemInfo?.aggressiveness === 'aggressive';
  }

  /**
   * Check if guidance should be shown
   */
  async shouldShowGuidance(): Promise<boolean> {
    // Only show for aggressive/moderate OEMs
    if (!this.oemInfo || this.oemInfo.aggressiveness === 'standard') {
      return false;
    }

    // Check if user dismissed permanently
    const dismissed = await AsyncStorage.getItem(STORAGE_KEYS.GUIDANCE_DISMISSED);
    if (dismissed === 'true') {
      return false;
    }

    // Check if user completed guidance
    const completed = await AsyncStorage.getItem(STORAGE_KEYS.GUIDANCE_COMPLETED);
    if (completed === 'true') {
      return false;
    }

    // Check if it's time for a reminder
    const remindAt = await AsyncStorage.getItem(STORAGE_KEYS.GUIDANCE_REMIND_AT);
    if (remindAt) {
      const remindTime = parseInt(remindAt, 10);
      if (Date.now() < remindTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if guidance should be shown due to missed calls
   */
  async shouldShowGuidanceDueToMissedCalls(): Promise<boolean> {
    if (!this.isAggressiveOEM()) {
      return false;
    }

    const completed = await AsyncStorage.getItem(STORAGE_KEYS.GUIDANCE_COMPLETED);
    if (completed === 'true') {
      return false;
    }

    const missedCountStr = await AsyncStorage.getItem(STORAGE_KEYS.MISSED_CALL_COUNT);
    const missedCount = missedCountStr ? parseInt(missedCountStr, 10) : 0;

    // Show after 2 missed calls
    return missedCount >= 2;
  }

  /**
   * Record a missed call
   */
  async recordMissedCall(): Promise<void> {
    const missedCountStr = await AsyncStorage.getItem(STORAGE_KEYS.MISSED_CALL_COUNT);
    const missedCount = missedCountStr ? parseInt(missedCountStr, 10) : 0;
    await AsyncStorage.setItem(STORAGE_KEYS.MISSED_CALL_COUNT, String(missedCount + 1));
  }

  /**
   * Reset missed call count
   */
  async resetMissedCallCount(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.MISSED_CALL_COUNT, '0');
  }

  /**
   * Mark guidance as shown
   */
  async markGuidanceShown(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GUIDANCE_SHOWN, 'true');
  }

  /**
   * Mark guidance as completed
   */
  async markGuidanceCompleted(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GUIDANCE_COMPLETED, 'true');
    await this.resetMissedCallCount();
  }

  /**
   * Mark guidance as dismissed permanently
   */
  async markGuidanceDismissed(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GUIDANCE_DISMISSED, 'true');
  }

  /**
   * Set reminder for later
   */
  async setReminder(hoursFromNow: number = 24): Promise<void> {
    const remindAt = Date.now() + hoursFromNow * 60 * 60 * 1000;
    await AsyncStorage.setItem(STORAGE_KEYS.GUIDANCE_REMIND_AT, String(remindAt));
  }

  /**
   * Execute a guidance action
   */
  executeAction(actionType: GuidanceStep['actionType']): void {
    switch (actionType) {
      case 'auto_start':
        incomingCallNativeModule.openAutoStartSettings();
        break;
      case 'battery':
        incomingCallNativeModule.requestIgnoreBatteryOptimization();
        break;
      case 'notification':
        incomingCallNativeModule.openNotificationSettings();
        break;
      case 'full_screen':
        incomingCallNativeModule.openFullScreenIntentSettings();
        break;
    }
  }

  /**
   * Check if battery optimization is properly configured
   */
  async checkBatteryOptimization(): Promise<boolean> {
    return incomingCallNativeModule.isBatteryOptimizationIgnored();
  }

  /**
   * Get full diagnostic info
   */
  async getDiagnostics(): Promise<{
    deviceInfo: DeviceInfo | null;
    oemInfo: OEMInfo | null;
    batteryOptimizationIgnored: boolean;
    notificationsEnabled: boolean;
    channelEnabled: boolean;
    fullScreenIntentAllowed: boolean;
  }> {
    const [batteryOptimizationIgnored, notificationsEnabled, channelState, fullScreenIntentAllowed] =
      await Promise.all([
        incomingCallNativeModule.isBatteryOptimizationIgnored(),
        incomingCallNativeModule.areNotificationsEnabled(),
        incomingCallNativeModule.getChannelState('tander_incoming_calls'),
        incomingCallNativeModule.canUseFullScreenIntent(),
      ]);

    return {
      deviceInfo: this.deviceInfo,
      oemInfo: this.oemInfo,
      batteryOptimizationIgnored,
      notificationsEnabled,
      channelEnabled: channelState.enabled && channelState.importance >= 4,
      fullScreenIntentAllowed,
    };
  }
}

// Export singleton instance
export const oemGuidanceService = new OEMGuidanceService();

export default oemGuidanceService;
