const { withAppDelegate, withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for react-native-voip-push-notification
 *
 * Adds the necessary PushKit imports and delegate methods to AppDelegate
 * for iOS VoIP push notifications to work properly.
 */
const withVoipPushNotification = (config) => {
  // Add entitlements
  config = withEntitlementsPlist(config, (config) => {
    // Ensure push notifications entitlement
    config.modResults['aps-environment'] = 'production';
    return config;
  });

  // Modify AppDelegate for PushKit
  config = withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;

    // Check if already modified
    if (contents.includes('RNVoipPushNotificationManager')) {
      return config;
    }

    // Add import for RNVoipPushNotificationManager
    const importStatement = '#import "RNVoipPushNotificationManager.h"';
    const pushKitImport = '#import <PushKit/PushKit.h>';

    // Find the import section and add our imports
    let modifiedContents = contents;

    // Add imports after the first #import statement
    const importRegex = /(#import\s+<[^>]+>|#import\s+"[^"]+")/;
    const match = modifiedContents.match(importRegex);
    if (match) {
      const insertPosition = match.index + match[0].length;
      modifiedContents =
        modifiedContents.slice(0, insertPosition) +
        '\n' + pushKitImport +
        '\n' + importStatement +
        modifiedContents.slice(insertPosition);
    }

    // Add PKPushRegistryDelegate to the interface declaration
    // Look for @interface AppDelegate
    const interfaceRegex = /@interface\s+AppDelegate\s*:\s*([^\s<]+)\s*(<[^>]+>)?/;
    modifiedContents = modifiedContents.replace(interfaceRegex, (match, parent, protocols) => {
      if (protocols && protocols.includes('PKPushRegistryDelegate')) {
        return match; // Already has it
      }
      if (protocols) {
        // Add to existing protocols
        return match.replace(protocols, protocols.slice(0, -1) + ', PKPushRegistryDelegate>');
      } else {
        // Add new protocol list
        return `@interface AppDelegate : ${parent} <PKPushRegistryDelegate>`;
      }
    });

    // Add PushKit delegate methods before @end
    const delegateMethods = `
// --- react-native-voip-push-notification delegate methods ---

// Handle updated push credentials
- (void)pushRegistry:(PKPushRegistry *)registry didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type {
  [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:(NSString *)type];
}

// Handle incoming pushes (iOS 10 and earlier)
- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type {
  [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:(NSString *)type];
}

// Handle incoming pushes (iOS 11+)
- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type withCompletionHandler:(void (^)(void))completion {
  // Process the push notification
  [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:(NSString *)type];

  // IMPORTANT: Must report new incoming call to CallKit immediately
  // This is handled by the JavaScript side through RNVoipPushNotification event

  // Complete the callback
  if (completion) {
    completion();
  }
}

// Handle invalidation
- (void)pushRegistry:(PKPushRegistry *)registry didInvalidatePushTokenForType:(PKPushType)type {
  // Optional: Handle token invalidation
}

// --- End of react-native-voip-push-notification delegate methods ---
`;

    // Insert delegate methods before @end
    const endRegex = /(@end\s*)$/;
    modifiedContents = modifiedContents.replace(endRegex, delegateMethods + '\n$1');

    config.modResults.contents = modifiedContents;
    return config;
  });

  return config;
};

module.exports = withVoipPushNotification;
