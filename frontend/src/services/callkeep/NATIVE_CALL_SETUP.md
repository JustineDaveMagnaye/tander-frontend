# Native Call Integration Setup Guide

This document explains how to complete the setup for native call UI integration (CallKit for iOS, ConnectionService for Android).

## Overview

Native call integration provides:
- **iOS**: CallKit UI on lock screen, integration with Phone app recent calls, DND bypass
- **Android**: Native call UI, lock screen integration, ConnectionService

## Prerequisites

1. Expo development build (`expo-dev-client` is already installed)
2. Apple Developer account with VoIP Push capability
3. Firebase project configured (already done)

## Step 1: Install Native Packages

```bash
cd frontend

# Install react-native-callkeep (provides CallKit for iOS and ConnectionService for Android)
npm install react-native-callkeep

# For iOS VoIP push notifications (PushKit)
npm install react-native-voip-push-notification

# Install uuid for generating call UUIDs
npm install uuid
npm install --save-dev @types/uuid
```

## Step 2: Configure Expo Config Plugin

Create `plugins/withCallKeep.js`:

```javascript
const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

const withCallKeep = (config) => {
  // Android configuration
  config = withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    // Add ConnectionService
    mainApplication.service = mainApplication.service || [];
    mainApplication.service.push({
      '$': {
        'android:name': 'io.wazo.callkeep.VoiceConnectionService',
        'android:label': 'TANDER',
        'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [{
        action: [{
          '$': { 'android:name': 'android.telecom.ConnectionService' }
        }]
      }]
    });

    return config;
  });

  // iOS configuration
  config = withInfoPlist(config, async (config) => {
    // Background modes are already added in app.json
    return config;
  });

  return config;
};

module.exports = withCallKeep;
```

Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      // ... existing plugins
      "./plugins/withCallKeep"
    ]
  }
}
```

## Step 3: iOS - Configure VoIP Push Certificate

1. Log in to [Apple Developer Portal](https://developer.apple.com)

2. Go to **Certificates, Identifiers & Profiles**

3. Create a new **VoIP Services Certificate**:
   - Click "+" to create a new certificate
   - Select "VoIP Services Certificate"
   - Choose your app's App ID (com.tander.app)
   - Upload a CSR (Certificate Signing Request)
   - Download the certificate

4. Export as .p12 file:
   - Open the certificate in Keychain Access
   - Export as .p12 with a password

5. Convert to .pem for backend:
   ```bash
   openssl pkcs12 -in voip_certificate.p12 -out voip_certificate.pem -nodes
   ```

6. Configure backend to use VoIP certificate for APNs calls

## Step 4: iOS - Enable Push Notifications Capability

In Xcode (after running `npx expo prebuild`):

1. Open `ios/tander.xcworkspace`
2. Select the project target
3. Go to **Signing & Capabilities**
4. Add **Push Notifications** capability
5. Add **Background Modes** capability and enable:
   - Voice over IP
   - Background fetch
   - Remote notifications
   - Audio, AirPlay, and Picture in Picture

## Step 5: Backend - Send VoIP Push for iOS

Update the backend to send VoIP pushes for incoming calls on iOS:

```java
// For iOS incoming calls, use VoIP push via APNs
public void sendVoIPPush(String voipToken, IncomingCallData callData) {
    ApnsPayloadBuilder payloadBuilder = new SimpleApnsPayloadBuilder()
        .setContentAvailable(true);

    // Add call data
    payloadBuilder.addCustomProperty("callerId", callData.getCallerId());
    payloadBuilder.addCustomProperty("callerName", callData.getCallerName());
    payloadBuilder.addCustomProperty("callerPhoto", callData.getCallerPhoto());
    payloadBuilder.addCustomProperty("callType", callData.getCallType());
    payloadBuilder.addCustomProperty("roomId", callData.getRoomId());
    payloadBuilder.addCustomProperty("uuid", UUID.randomUUID().toString());

    String payload = payloadBuilder.build();

    // Send via APNs with VoIP topic
    ApnsPushNotification notification = new SimpleApnsPushNotification(
        voipToken,
        "com.tander.app.voip",  // VoIP topic = bundleId + ".voip"
        payload,
        Instant.now().plus(Duration.ofSeconds(60)),
        DeliveryPriority.IMMEDIATE,
        PushType.VOIP
    );

    apnsClient.sendNotification(notification);
}
```

## Step 6: Frontend - Integrate Services

Update `WebSocketProvider.tsx` to use CallKeep:

```typescript
import { callKeepService } from '@services/callkeep';
import { voipPushService } from '@services/voip';

// In initialization
useEffect(() => {
  // Setup CallKeep
  callKeepService.setup();

  // Setup VoIP push (iOS only)
  voipPushService.register();

  // Handle VoIP push -> CallKit
  voipPushService.setOnVoIPPush((data) => {
    // Display CallKit UI
    callKeepService.displayIncomingCall({
      callerId: parseInt(data.callerId),
      callerName: data.callerName,
      callerPhoto: data.callerPhoto,
      callType: data.callType,
      roomId: data.roomId,
    });
  });

  // Handle CallKit answer
  callKeepService.setOnAnswerCall((callUUID, roomId) => {
    // Answer the call
    handleAnswerCall(roomId);
  });

  // Handle CallKit end
  callKeepService.setOnEndCall((callUUID, roomId) => {
    // End the call
    handleEndCall(roomId);
  });

  // Send VoIP token to backend
  voipPushService.setOnTokenReceived((token) => {
    registerVoIPToken(token);
  });
}, []);
```

## Step 7: Rebuild the App

```bash
# Clear build cache
npx expo prebuild --clean

# Build for iOS
npx expo run:ios

# Build for Android
npx expo run:android
```

## Testing

### iOS Testing
1. Build and run on a physical iOS device
2. Have another user call you
3. Verify CallKit UI appears on lock screen
4. Verify call appears in Phone app recent calls

### Android Testing
1. Build and run on a physical Android device
2. Have another user call you
3. Verify native call UI appears
4. Test on different OEMs (Samsung, Xiaomi, etc.)

## Troubleshooting

### iOS - VoIP push not received
- Verify VoIP certificate is valid and not expired
- Check bundle ID matches (com.tander.app)
- Ensure app has VoIP background mode enabled
- Check APNs topic is `com.tander.app.voip`

### Android - ConnectionService not working
- Verify phone account permission is granted
- Check BIND_TELECOM_CONNECTION_SERVICE permission
- Test `callKeepService.checkPhoneAccountPermission()`

### CallKit UI not showing
- Verify `displayIncomingCall` is called
- Check CallKit permissions in iOS Settings
- Ensure unique UUID for each call

## Backend API Changes Required

### New Endpoint: Register VoIP Token
```
POST /api/notifications/register-voip-token
{
  "voipToken": "...",
  "platform": "ios",
  "deviceId": "..."
}
```

### Modify Incoming Call Push
For iOS devices with VoIP tokens, send VoIP push instead of regular push.

## Files Created

- `src/services/callkeep/CallKeepService.ts` - CallKit/ConnectionService wrapper
- `src/services/callkeep/index.ts` - Exports
- `src/services/voip/VoIPPushService.ts` - iOS VoIP push handler
- `src/services/voip/index.ts` - Exports
- `src/services/callkeep/NATIVE_CALL_SETUP.md` - This guide

## Estimated Time

- Package installation & config: 2-4 hours
- iOS certificate setup: 1-2 hours
- Backend VoIP push integration: 1-2 days
- Testing & debugging: 2-3 days

**Total: 1-2 weeks** for full native call integration
