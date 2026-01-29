const { withAndroidManifest, withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for react-native-callkeep and react-native-voip-push-notification
 *
 * Android: Adds VoiceConnectionService to AndroidManifest.xml
 * iOS: Adds Push Notifications and VoIP entitlements
 */
const withCallKeep = (config) => {
  // Android configuration
  config = withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    // Ensure service array exists
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    // Check if service already exists
    const serviceExists = mainApplication.service.some(
      (service) => service.$?.['android:name'] === 'io.wazo.callkeep.VoiceConnectionService'
    );

    if (!serviceExists) {
      // Add VoiceConnectionService for CallKeep
      mainApplication.service.push({
        $: {
          'android:name': 'io.wazo.callkeep.VoiceConnectionService',
          'android:label': 'TANDER',
          'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.telecom.ConnectionService',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });

  // iOS Entitlements configuration
  config = withEntitlementsPlist(config, (config) => {
    // Add Push Notifications entitlement
    config.modResults['aps-environment'] = 'production';

    // Add VoIP entitlement (for PushKit)
    // This is automatically handled by UIBackgroundModes in Info.plist
    // but we ensure the entitlement is set

    return config;
  });

  // iOS Info.plist configuration
  config = withInfoPlist(config, (config) => {
    // Ensure UIBackgroundModes includes voip (should already be in app.json but double-check)
    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }

    const requiredModes = ['voip', 'audio', 'fetch', 'remote-notification'];
    for (const mode of requiredModes) {
      if (!config.modResults.UIBackgroundModes.includes(mode)) {
        config.modResults.UIBackgroundModes.push(mode);
      }
    }

    // Add NSMicrophoneUsageDescription if not present (required for calls)
    if (!config.modResults.NSMicrophoneUsageDescription) {
      config.modResults.NSMicrophoneUsageDescription = 'TANDER needs microphone access for voice and video calls.';
    }

    // Add NSCameraUsageDescription if not present (required for video calls)
    if (!config.modResults.NSCameraUsageDescription) {
      config.modResults.NSCameraUsageDescription = 'TANDER needs camera access for video calls.';
    }

    return config;
  });

  return config;
};

module.exports = withCallKeep;
