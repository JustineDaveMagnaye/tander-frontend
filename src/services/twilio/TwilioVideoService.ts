/**
 * Twilio Video Service for React Native
 *
 * Uses react-native-webrtc for WebRTC peer connections with:
 * - Full peer-to-peer audio/video calling
 * - Proper ICE candidate exchange
 * - SDP offer/answer negotiation via WebSocket signaling
 *
 * This implementation provides:
 * - Full React Native compatibility
 * - Native WebRTC performance
 * - Real audio/video streaming between devices
 */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
  MediaStreamTrack,
} from 'react-native-webrtc';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import { twilioApi, CallType } from '../api/twilioApi';
import { stompService, WebRTCSignal } from '../websocket/StompService';

/**
 * Check if running on emulator/simulator
 */
const isEmulator = (): boolean => {
  return !Device.isDevice;
};

/**
 * Check if call type is video (handles both uppercase and lowercase)
 */
const isVideoCall = (callType: CallType): boolean => {
  return callType.toLowerCase() === 'video';
};

// Try to import InCallManager for audio routing
let InCallManager: {
  start: (options?: { media?: string; auto?: boolean; ringback?: string }) => void;
  stop: (options?: { busytone?: string }) => void;
  setSpeakerphoneOn: (on: boolean) => void;
  setKeepScreenOn: (on: boolean) => void;
  turnScreenOn: () => void;
  turnScreenOff: () => void;
} | null = null;

try {
  InCallManager = require('react-native-incall-manager').default;
} catch (e) {
  console.warn('[TwilioVideo] InCallManager not available');
}

// Default ICE Servers configuration (fallback)
// Will be replaced by Twilio NTS credentials when available
const DEFAULT_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceTransportPolicy: 'all',
};

// Cached ICE servers from Twilio NTS
let cachedIceServers: RTCConfiguration | null = null;
let iceServersCacheTime: number = 0;
const ICE_SERVERS_CACHE_TTL = 3000000; // 50 minutes (tokens last 60 min)
const ICE_SERVERS_REFRESH_THRESHOLD = 2700000; // 45 minutes - refresh before expiry (R1-006)

/**
 * Fetch ICE servers from backend (Twilio NTS)
 * Uses caching to avoid excessive API calls
 */
async function getIceServers(): Promise<RTCConfiguration> {
  const now = Date.now();
  
  // Return cached if still valid
  if (cachedIceServers && (now - iceServersCacheTime) < ICE_SERVERS_CACHE_TTL) {
    console.log('[TwilioVideo] Using cached ICE servers');
    return cachedIceServers;
  }
  
  try {
    console.log('[TwilioVideo] Fetching ICE servers from backend...');
    const response = await twilioApi.getIceServers();
    
    // Convert to RTCConfiguration format
    // Filter out STUN servers - react-native-webrtc throws "username == null"
    // when mixing servers with/without credentials. Only use TURN servers.
    const iceServers = response.iceServers
      .filter(server => {
        // Keep only TURN servers (they have credentials)
        const isTurn = server.urls.startsWith('turn:');
        if (!isTurn) {
          console.log('[TwilioVideo] 🔧 Skipping STUN server:', server.urls);
        }
        return isTurn;
      })
      .map(server => ({
        urls: server.urls,
        username: server.username,
        credential: server.credential,
      }));

    // If no TURN servers, fall back to STUN-only defaults
    if (iceServers.length === 0) {
      console.warn('[TwilioVideo] No TURN servers from Twilio NTS, using STUN fallback');
      return DEFAULT_ICE_SERVERS;
    }

    cachedIceServers = {
      iceServers,
      iceTransportPolicy: 'all',
    };
    iceServersCacheTime = now;

    // Log the ICE servers we got
    console.log('[TwilioVideo] 🔧 Got', iceServers.length, 'TURN servers from Twilio NTS');
    iceServers.forEach(s => {
      console.log('[TwilioVideo] 🔧 TURN Server:', s.urls, '(with credentials)');
    });
    
    return cachedIceServers;
  } catch (error: any) {
    console.warn('[TwilioVideo] Failed to fetch ICE servers, using defaults:', error.message);
    return DEFAULT_ICE_SERVERS;
  }
}

// ==================== Types ====================

export type TwilioCallState =
  | 'idle'
  | 'initiating'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'failed';

// Busy decline reason for when user is already in a call
export const BUSY_DECLINE_REASON = 'busy';

export interface TwilioCallInfo {
  roomName: string;
  roomSid: string;
  callSessionId: number;
  callType: CallType;
  callerId: number;
  receiverId: number;
  receiverName: string;
  isOutgoing: boolean;
}

export interface TwilioParticipant {
  identity: string;
  sid: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

type StateChangeCallback = (state: TwilioCallState) => void;
type ErrorCallback = (error: string) => void;
type StreamCallback = (stream: MediaStream | null, type: 'local' | 'remote') => void;

// ==================== Service ====================

class TwilioVideoService {
  private currentCall: TwilioCallInfo | null = null;
  private callState: TwilioCallState = 'idle';

  // WebRTC
  private peerConnection: RTCPeerConnection | null = null;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private hasRemoteDescription: boolean = false;

  // Queue for signals that arrive before peer connection is ready
  private pendingOffer: WebRTCSignal | null = null;
  private pendingSignals: WebRTCSignal[] = [];

  // Deduplication - prevent processing same signal twice (from queue and topic)
  private processedSignalIds: Set<string> = new Set();

  // R1-004: Deduplication for ICE candidates specifically (candidate string + mLineIndex)
  private processedCandidates: Set<string> = new Set();

  // R3-002: Track rooms that received hangup before offer (caller cancelled)
  private cancelledRooms: Set<string> = new Set();

  // Streams
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  // Audio/Video state
  private isAudioEnabled: boolean = true;
  private isVideoEnabled: boolean = true;
  private isSpeakerOn: boolean = false;
  private isFrontCamera: boolean = true;

  // Callbacks
  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private streamCallbacks: Set<StreamCallback> = new Set();

  // Timeouts (REL-004: can be synced from backend via fetchAndApplyConfig)
  private ringingTimeout: NodeJS.Timeout | null = null;
  private connectingTimeout: NodeJS.Timeout | null = null;
  private cleanupTimeout: NodeJS.Timeout | null = null;
  private RINGING_TIMEOUT_MS = 60000; // 60 seconds (default, synced from backend)
  private CONNECTING_TIMEOUT_MS = 30000; // 30 seconds for ICE negotiation
  private RECONNECT_TIMEOUT_MS = 30000; // 30 seconds for reconnection attempts
  private MAX_DURATION_MS = 7200000; // 2 hours max call duration
  private readonly ICE_RESTART_TIMEOUT_MS = 10000; // 10 seconds before ICE restart
  private readonly MAX_ICE_RESTART_ATTEMPTS = 3;
  private configFetched: boolean = false; // Track if config has been fetched

  // ICE restart tracking
  private iceRestartAttempts: number = 0;
  private iceRestartTimeout: NodeJS.Timeout | null = null;
  private isIceRestartInProgress: boolean = false; // R1-005: Lock to prevent concurrent ICE restarts

  // Prevent double-click race condition
  private isInitiatingCall: boolean = false;

  // ✅ FIX: Prevent multiple endCall invocations (duplicate hangup signals)
  private isEndingCall: boolean = false;

  // ✅ FIX: Prevent multiple cleanup invocations (duplicate re-subscriptions)
  private isCleaningUp: boolean = false;

  // ✅ FIX: Prevent multiple rapid camera switch calls
  private isSwitchingCamera: boolean = false;
  private lastCameraSwitchTime: number = 0;
  private readonly CAMERA_SWITCH_DEBOUNCE_MS = 500; // Minimum 500ms between switches

  // Current user ID for self-call prevention
  private currentUserId: number | null = null;

  // Duration tracking
  private callStartTime: number | null = null;
  private durationInterval: NodeJS.Timeout | null = null;
  private duration: number = 0;

  // R1-006: TURN credential refresh tracking
  private turnRefreshInterval: NodeJS.Timeout | null = null;
  private readonly TURN_REFRESH_INTERVAL_MS = 2400000; // Check every 40 minutes

  // WebRTC signaling unsubscribe
  private webrtcUnsubscribe: (() => void) | null = null;

  constructor() {
    console.log('[TwilioVideo] Service initialized');
    this.setupWebRTCSignaling();
    // REL-004: Fetch config on initialization
    this.fetchAndApplyConfig();
  }

  // ==================== Configuration ====================

  /**
   * REL-004: Fetch call configuration from backend and apply timeout values
   * This ensures frontend timers are synchronized with backend timeouts
   */
  async fetchAndApplyConfig(): Promise<void> {
    if (this.configFetched) {
      console.log('[TwilioVideo] REL-004: Config already fetched, skipping');
      return;
    }

    try {
      console.log('[TwilioVideo] REL-004: Fetching call config from backend...');
      const config = await twilioApi.getCallConfig();

      // Apply timeout values (convert seconds to milliseconds)
      this.RINGING_TIMEOUT_MS = config.ringingTimeoutSeconds * 1000;
      this.CONNECTING_TIMEOUT_MS = config.initiatedTimeoutSeconds * 1000;
      this.RECONNECT_TIMEOUT_MS = config.reconnectTimeoutSeconds * 1000;
      this.MAX_DURATION_MS = config.maxDurationSeconds * 1000;

      this.configFetched = true;
      console.log('[TwilioVideo] REL-004: Config applied successfully:', {
        ringingTimeout: this.RINGING_TIMEOUT_MS,
        connectingTimeout: this.CONNECTING_TIMEOUT_MS,
        reconnectTimeout: this.RECONNECT_TIMEOUT_MS,
        maxDuration: this.MAX_DURATION_MS,
      });
    } catch (error: any) {
      console.warn('[TwilioVideo] REL-004: Failed to fetch config, using defaults:', error.message);
      // Keep using default values
    }
  }

  // ==================== WebRTC Signaling ====================

  /**
   * Set up WebRTC signaling via STOMP WebSocket
   */
  private setupWebRTCSignaling(): void {
    // R6-003: Always unsubscribe existing callback first to prevent duplicates
    if (this.webrtcUnsubscribe) {
      this.webrtcUnsubscribe();
      this.webrtcUnsubscribe = null;
    }

    // ✅ FIX: Pass unique name to prevent duplicate callback registrations
    this.webrtcUnsubscribe = stompService.onWebRTCSignal((signal: WebRTCSignal) => {
      console.log('[TwilioVideo] 📡 WebRTC signal received:', signal.type);
      this.handleWebRTCSignal(signal);
    }, 'TwilioVideoService');
    console.log('[TwilioVideo] WebRTC signaling set up');
  }

  /**
   * R7-005: Validate required fields in WebRTC signal
   * Returns error message if invalid, null if valid
   */
  private validateSignal(signal: WebRTCSignal): string | null {
    if (!signal.type) {
      return 'Missing signal type';
    }
    if (!signal.roomName) {
      return 'Missing roomName';
    }
    if (signal.type === 'offer' || signal.type === 'answer') {
      if (!signal.sdp || !signal.sdp.type || !signal.sdp.sdp) {
        return `Missing or invalid SDP for ${signal.type}`;
      }
    }
    if (signal.type === 'ice-candidate' && signal.candidate) {
      // Validate ICE candidate has required fields
      if (typeof signal.candidate.candidate !== 'string') {
        return 'Invalid ICE candidate format';
      }
      // R1-003: Validate ICE candidate has sdpMLineIndex or sdpMid
      if (signal.candidate.sdpMLineIndex === undefined &&
          signal.candidate.sdpMid === undefined) {
        return 'R1-003: ICE candidate missing sdpMLineIndex and sdpMid';
      }
    }
    return null;
  }

  /**
   * Handle incoming WebRTC signaling message
   */
  private async handleWebRTCSignal(signal: WebRTCSignal): Promise<void> {
    // R7-005: Validate signal before processing
    const validationError = this.validateSignal(signal);
    if (validationError) {
      console.warn('[TwilioVideo] R7-005: Invalid signal received:', validationError, signal.type);
      return;
    }

    // Generate a unique ID for this signal to prevent duplicate processing
    // (signals arrive via both queue and topic subscriptions)
    const signalId = `${signal.type}_${signal.roomName}_${signal.fromUserId}_${signal.timestamp}`;

    // Check for duplicate
    if (this.processedSignalIds.has(signalId)) {
      console.log('[TwilioVideo] 📡 Ignoring duplicate signal:', signal.type);
      return;
    }

    // Mark as processed (keep only last 100 to prevent memory leak)
    this.processedSignalIds.add(signalId);
    if (this.processedSignalIds.size > 100) {
      const firstKey = this.processedSignalIds.values().next().value;
      if (firstKey) this.processedSignalIds.delete(firstKey);
    }

    // REL-008: Validate callSessionId for non-offer signals
    // Offers establish the session, but answer/ice/hangup should match our session
    if (signal.type !== 'offer' && signal.callSessionId && this.currentCall?.callSessionId) {
      if (signal.callSessionId !== this.currentCall.callSessionId) {
        console.log('[TwilioVideo] REL-008: Ignoring signal for different session:',
          signal.callSessionId, '!==', this.currentCall.callSessionId, 'type:', signal.type);
        return;
      }
    }

    try {
      switch (signal.type) {
        case 'offer':
          // R3-002: Check if caller already cancelled this call
          if (this.cancelledRooms.has(signal.roomName)) {
            console.log('[TwilioVideo] R3-002: Ignoring offer for cancelled room:', signal.roomName);
            this.cancelledRooms.delete(signal.roomName); // Clean up
            return;
          }
          // If no peer connection yet (receiver hasn't accepted), queue the offer
          if (!this.peerConnection) {
            // R2-008: Prevent pending offer from being overwritten by different call
            if (this.pendingOffer && this.pendingOffer.roomName !== signal.roomName) {
              console.warn('[TwilioVideo] R2-008: Already have pending offer for room:', this.pendingOffer.roomName, '- rejecting new offer for:', signal.roomName);
              return;
            }
            console.log('[TwilioVideo] 📡 Queueing offer - peer connection not ready yet');
            this.pendingOffer = signal;
            return;
          }
          await this.handleRemoteOffer(signal);
          break;
        case 'answer':
          await this.handleRemoteAnswer(signal);
          break;
        case 'ice-candidate':
          // If no peer connection yet, queue the ICE candidate
          if (!this.peerConnection) {
            console.log('[TwilioVideo] 📡 Queueing ICE candidate - peer connection not ready yet');
            this.pendingSignals.push(signal);
            return;
          }
          await this.handleRemoteIceCandidate(signal);
          break;
        case 'hangup':
          // R3-002: If hangup arrives before we have an active call for this room,
          // track it so we ignore the offer when it arrives
          if (!this.currentCall || this.currentCall.roomName !== signal.roomName) {
            console.log('[TwilioVideo] R3-002: Hangup received before offer for room:', signal.roomName);
            this.cancelledRooms.add(signal.roomName);
            // Limit size to prevent memory leak
            if (this.cancelledRooms.size > 20) {
              const firstRoom = this.cancelledRooms.values().next().value;
              if (firstRoom) this.cancelledRooms.delete(firstRoom);
            }
            return;
          }
          this.handleRemoteHangup(signal);
          break;
        case 'error':
          console.warn('[TwilioVideo] WebRTC signaling error:', signal.error);
          this.notifyError(signal.error || 'Signaling error');
          break;
      }
    } catch (error: any) {
      console.warn('[TwilioVideo] Error handling WebRTC signal:', error);
    }
  }

  /**
   * Handle remote SDP offer (we are the receiver)
   * R3-003: Includes offer collision handling using userId tie-breaking
   */
  private async handleRemoteOffer(signal: WebRTCSignal): Promise<void> {
    console.log('[TwilioVideo] 📡 Handling remote offer from', signal.fromUserId);

    if (!this.peerConnection || !signal.sdp) {
      console.warn('[TwilioVideo] No peer connection or SDP for offer');
      return;
    }

    // Validate signal is for current call (security check)
    if (this.currentCall && signal.roomName !== this.currentCall.roomName) {
      console.warn('[TwilioVideo] Ignoring offer for different room:', signal.roomName);
      return;
    }

    // R3-003: Handle offer collision (both peers sent offers simultaneously)
    // This can happen when both users tap "call" at the same time
    const signalingState = this.peerConnection.signalingState;
    if (signalingState === 'have-local-offer') {
      // We already sent an offer - this is a collision
      console.log('[TwilioVideo] R3-003: Offer collision detected, signalingState:', signalingState);

      // Tie-breaking: lower userId wins (keeps their offer)
      if (this.currentUserId && signal.fromUserId) {
        if (this.currentUserId < signal.fromUserId) {
          // We have lower userId - we win, ignore their offer
          console.log('[TwilioVideo] R3-003: We win collision (our userId:', this.currentUserId, '< their userId:', signal.fromUserId, ')');
          return;
        } else {
          // They have lower userId - they win, we need to rollback and accept their offer
          console.log('[TwilioVideo] R3-003: They win collision (their userId:', signal.fromUserId, '< our userId:', this.currentUserId, ')');
          // Rollback by setting remote description (this implicitly rolls back our offer)
        }
      }
    }

    try {
      // Update currentCall with the correct callerId from the signal
      // This is important because acceptIncomingCall may not have had the callerId
      if (this.currentCall && signal.fromUserId) {
        this.currentCall.callerId = signal.fromUserId;
        console.log('[TwilioVideo] Updated callerId from offer signal:', signal.fromUserId);
      }

      // Set remote description
      const remoteDesc = new RTCSessionDescription(signal.sdp);
      await this.peerConnection.setRemoteDescription(remoteDesc);
      this.hasRemoteDescription = true;
      console.log('[TwilioVideo] Remote description set (offer)');

      // Process any pending ICE candidates
      await this.processPendingIceCandidates();

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('[TwilioVideo] Local description set (answer)');

      // Send answer to remote peer (REL-008: include callSessionId)
      if (this.currentCall) {
        stompService.sendWebRTCAnswer(
          this.currentCall.roomName,
          signal.fromUserId,
          answer,
          this.currentCall.callSessionId || signal.callSessionId
        );
        console.log('[TwilioVideo] 📡 Sent WebRTC answer to', signal.fromUserId, 'session:', this.currentCall.callSessionId);
      }
    } catch (error) {
      console.warn('[TwilioVideo] Error handling remote offer:', error);
    }
  }

  /**
   * Handle remote SDP answer (we are the caller)
   */
  private async handleRemoteAnswer(signal: WebRTCSignal): Promise<void> {
    console.log('[TwilioVideo] 📡 Handling remote answer from', signal.fromUserId);

    if (!this.peerConnection || !signal.sdp) {
      console.warn('[TwilioVideo] No peer connection or SDP for answer');
      return;
    }

    // Validate signal is for current call (security check)
    if (this.currentCall && signal.roomName !== this.currentCall.roomName) {
      console.warn('[TwilioVideo] Ignoring answer for different room:', signal.roomName);
      return;
    }

    try {
      const remoteDesc = new RTCSessionDescription(signal.sdp);
      await this.peerConnection.setRemoteDescription(remoteDesc);
      this.hasRemoteDescription = true;
      console.log('[TwilioVideo] Remote description set (answer)');

      // Process any pending ICE candidates
      await this.processPendingIceCandidates();
    } catch (error) {
      console.warn('[TwilioVideo] Error handling remote answer:', error);
    }
  }

  /**
   * Handle remote ICE candidate
   * R1-001: Skip null candidates (end-of-gathering signal)
   * R1-002: Check connection state before adding candidates
   * R1-004: Deduplicate candidates by signature
   */
  private async handleRemoteIceCandidate(signal: WebRTCSignal): Promise<void> {
    if (!signal.candidate) {
      return;
    }

    // R1-001: Skip null/empty candidates (end-of-gathering signal)
    if (!signal.candidate.candidate) {
      console.log('[TwilioVideo] R1-001: Ignoring null ICE candidate (end of gathering)');
      return;
    }

    if (!this.peerConnection) {
      console.warn('[TwilioVideo] No peer connection for ICE candidate');
      return;
    }

    // Validate signal is for current call (security check)
    if (this.currentCall && signal.roomName !== this.currentCall.roomName) {
      console.warn('[TwilioVideo] Ignoring ICE candidate for different room:', signal.roomName);
      return;
    }

    // R1-002: Check if connection is in a state that accepts candidates
    const iceState = this.peerConnection.iceConnectionState;
    if (iceState === 'closed' || iceState === 'failed') {
      console.log('[TwilioVideo] R1-002: Ignoring late ICE candidate, state:', iceState);
      return;
    }

    // R1-004: Deduplicate candidates by signature (candidate string + mLineIndex)
    const candidateSig = `${signal.candidate.candidate}_${signal.candidate.sdpMLineIndex ?? 'null'}`;
    if (this.processedCandidates.has(candidateSig)) {
      console.log('[TwilioVideo] R1-004: Ignoring duplicate ICE candidate');
      return;
    }
    this.processedCandidates.add(candidateSig);
    // Limit size to prevent memory leak
    if (this.processedCandidates.size > 200) {
      const firstKey = this.processedCandidates.values().next().value;
      if (firstKey) this.processedCandidates.delete(firstKey);
    }

    // If we don't have remote description yet, queue the candidate
    if (!this.hasRemoteDescription) {
      console.log('[TwilioVideo] Queuing ICE candidate (no remote description yet)');
      this.pendingIceCandidates.push(signal.candidate);
      return;
    }

    try {
      const candidate = new RTCIceCandidate(signal.candidate);
      await this.peerConnection.addIceCandidate(candidate);
      console.log('[TwilioVideo] Added remote ICE candidate');
    } catch (error) {
      console.warn('[TwilioVideo] Error adding ICE candidate:', error);
    }
  }

  /**
   * Process queued ICE candidates after remote description is set
   */
  private async processPendingIceCandidates(): Promise<void> {
    if (this.pendingIceCandidates.length === 0 || !this.peerConnection) {
      return;
    }

    console.log(`[TwilioVideo] Processing ${this.pendingIceCandidates.length} pending ICE candidates`);

    for (const candidateInit of this.pendingIceCandidates) {
      try {
        const candidate = new RTCIceCandidate(candidateInit);
        await this.peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.warn('[TwilioVideo] Error adding pending ICE candidate:', error);
      }
    }

    this.pendingIceCandidates = [];
  }

  /**
   * Process queued WebRTC signals after peer connection is created (for receiver)
   * This handles the timing issue where offer/ICE candidates arrive before Accept is pressed
   */
  private async processPendingSignals(): Promise<void> {
    // Process pending offer first
    if (this.pendingOffer) {
      console.log('[TwilioVideo] 📡 Processing queued offer');
      await this.handleRemoteOffer(this.pendingOffer);
      this.pendingOffer = null;
    }

    // Process any pending ICE candidate signals
    if (this.pendingSignals.length > 0) {
      console.log(`[TwilioVideo] 📡 Processing ${this.pendingSignals.length} queued ICE candidates`);
      for (const signal of this.pendingSignals) {
        if (signal.type === 'ice-candidate') {
          await this.handleRemoteIceCandidate(signal);
        }
      }
      this.pendingSignals = [];
    }
  }

  /**
   * Handle remote hangup
   */
  private handleRemoteHangup(signal: WebRTCSignal): void {
    console.log('[TwilioVideo] Remote party hung up:', signal.reason);

    if (this.currentCall?.roomName === signal.roomName) {
      this.notifyError('Call ended by remote party');
      this.setCallState('ended');
      this.cleanup();
    }
  }

  // ==================== Peer Connection ====================

  /**
   * Create and configure RTCPeerConnection
   */
  private async createPeerConnection(targetUserId: number): Promise<void> {
    console.log('[TwilioVideo] Creating peer connection');

    // Close existing connection if any
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    // Fetch ICE servers from backend (Twilio NTS for TURN credentials)
    const iceConfig = await getIceServers();
    console.log('[TwilioVideo] Using ICE configuration with', iceConfig.iceServers?.length || 0, 'servers');

    this.peerConnection = new RTCPeerConnection(iceConfig);
    this.hasRemoteDescription = false;
    this.pendingIceCandidates = [];

    // Add local tracks to connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
        console.log('[TwilioVideo] Adding local track to peer connection:', track.kind);
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    // Note: We use this.currentCall instead of captured targetUserId
    // because callerId might be updated later (e.g., from pending offer)
    // @ts-ignore - react-native-webrtc types don't match standard WebRTC API
    this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate && this.currentCall) {
        // Log detailed candidate info for debugging
        const candidateStr = event.candidate.candidate;
        const candidateType = candidateStr.includes('typ relay') ? 'RELAY (TURN)' :
                              candidateStr.includes('typ srflx') ? 'SRFLX (STUN)' :
                              candidateStr.includes('typ host') ? 'HOST' : 'UNKNOWN';
        console.log('[TwilioVideo] 🧊 ICE candidate generated:', candidateType, candidateStr.substring(0, 80));

        // Dynamically get the target user ID - for outgoing calls it's receiverId,
        // for incoming calls it's callerId
        const target = this.currentCall.isOutgoing
          ? this.currentCall.receiverId
          : this.currentCall.callerId;

        if (target) {
          console.log('[TwilioVideo] 📡 Sending ICE candidate to user', target);
          // REL-008: include callSessionId for signal deduplication
          stompService.sendWebRTCIceCandidate(
            this.currentCall.roomName,
            target,
            event.candidate.toJSON(),
            this.currentCall.callSessionId
          );
        } else {
          console.warn('[TwilioVideo] Cannot send ICE candidate - no target user ID');
        }
      } else if (!event.candidate) {
        console.log('[TwilioVideo] 🧊 ICE gathering complete (null candidate)');
      }
    };

    // Handle ICE gathering state changes
    // @ts-ignore - react-native-webrtc types don't match standard WebRTC API
    this.peerConnection.onicegatheringstatechange = () => {
      const gatheringState = this.peerConnection?.iceGatheringState;
      console.log('[TwilioVideo] 🧊 ICE gathering state:', gatheringState);
    };

    // Handle ICE connection state changes
    // @ts-ignore - react-native-webrtc types don't match standard WebRTC API
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('[TwilioVideo] ICE connection state:', state);

      switch (state) {
        case 'connected':
        case 'completed':
          // Clear any pending ICE restart or connecting timeouts
          this.clearIceRestartTimeout();
          this.clearConnectingTimeout();
          this.iceRestartAttempts = 0; // Reset restart counter on successful connection

          if (this.callState === 'connecting' || this.callState === 'reconnecting') {
            this.setCallState('connected');
            if (!this.callStartTime) {
              this.startDurationTimer();
              this.startTurnRefreshTimer(); // R1-006: Start TURN credential refresh for long calls
            }
          }
          break;
        case 'disconnected':
          // Start ICE restart attempt after timeout
          this.setCallState('reconnecting');
          this.attemptIceRestart();
          break;
        case 'failed':
          // If we haven't exhausted ICE restart attempts, try again
          if (this.iceRestartAttempts < this.MAX_ICE_RESTART_ATTEMPTS) {
            console.log(`[TwilioVideo] ICE failed, attempting restart (attempt ${this.iceRestartAttempts + 1}/${this.MAX_ICE_RESTART_ATTEMPTS})`);
            this.setCallState('reconnecting');
            this.performIceRestart();
          } else {
            console.log('[TwilioVideo] ICE failed after max restart attempts');
            this.notifyError('Connection failed - unable to establish connection');
            this.setCallState('failed');
            this.cleanup();
          }
          break;
        case 'closed':
          // Connection was closed, likely intentionally
          break;
      }
    };

    // R1-010: Handle connectionState changes (catches DTLS failures that iceConnectionState misses)
    // @ts-ignore - react-native-webrtc types don't match standard WebRTC API
    this.peerConnection.onconnectionstatechange = () => {
      const connectionState = this.peerConnection?.connectionState;
      console.log('[TwilioVideo] Connection state:', connectionState);

      switch (connectionState) {
        case 'connected':
          // Connection fully established (ICE + DTLS)
          if (this.callState === 'connecting' || this.callState === 'reconnecting') {
            this.setCallState('connected');
            if (!this.callStartTime) {
              this.startDurationTimer();
              this.startTurnRefreshTimer();
            }
          }
          break;
        case 'disconnected':
          // Connection temporarily lost
          if (this.callState === 'connected') {
            this.setCallState('reconnecting');
          }
          break;
        case 'failed':
          // R1-010: DTLS or ICE failed - this catches cases iceConnectionState might miss
          console.log('[TwilioVideo] R1-010: Connection failed (DTLS/ICE)');
          if (this.iceRestartAttempts < this.MAX_ICE_RESTART_ATTEMPTS) {
            this.setCallState('reconnecting');
            this.performIceRestart();
          } else {
            this.notifyError('Connection failed - unable to establish secure connection');
            this.setCallState('failed');
            this.cleanup();
          }
          break;
        case 'closed':
          // Connection was closed
          break;
      }
    };

    // Handle remote tracks
    // @ts-ignore - react-native-webrtc types don't match standard WebRTC API
    this.peerConnection.ontrack = (event: any) => {
      console.log('[TwilioVideo] 🎥 Remote track received:', event.track.kind);

      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log('[TwilioVideo] 🎥 Remote stream set');
        this.notifyStream(this.remoteStream, 'remote');
      }
    };

    console.log('[TwilioVideo] Peer connection created');
  }

  // ==================== Public API ====================

  /**
   * Set the current user ID (call this after login)
   * Used for self-call prevention
   */
  setCurrentUserId(userId: number): void {
    this.currentUserId = userId;
    console.log('[TwilioVideo] Current user ID set:', userId);
  }

  /**
   * Initiate an outgoing call
   */
  async initiateCall(
    receiverId: number,
    receiverName: string,
    callType: CallType
  ): Promise<TwilioCallInfo> {
    console.log(`[TwilioVideo] Initiating ${callType} call to user ${receiverId}`);

    // Prevent self-call
    if (this.currentUserId && receiverId === this.currentUserId) {
      throw new Error('Cannot call yourself');
    }

    // Prevent double-click race condition
    if (this.isInitiatingCall) {
      throw new Error('Call already being initiated');
    }

    if (this.callState !== 'idle') {
      throw new Error('Already in a call');
    }

    // R6-001: Re-setup WebRTC signaling if it was unsubscribed
    if (!this.webrtcUnsubscribe) {
      this.setupWebRTCSignaling();
    }

    this.isInitiatingCall = true;
    this.setCallState('initiating');

    try {
      // Create room via backend (this also notifies the receiver)
      let roomResponse;
      try {
        roomResponse = await twilioApi.createRoom(receiverId, callType);
      } catch (apiError: any) {
        // Handle busy status (409 Conflict)
        if (apiError.statusCode === 409) {
          const errorCode = apiError.code || apiError.error;
          console.log('[TwilioVideo] Call blocked - busy status:', errorCode);

          this.isInitiatingCall = false;
          this.setCallState('idle');

          if (errorCode === 'CALLER_BUSY') {
            Alert.alert(
              'Already in a Call',
              'You are already in a call. Please end your current call first.',
              [{ text: 'OK' }]
            );
            return; // Don't throw, just return
          } else if (errorCode === 'RECEIVER_BUSY') {
            const message = apiError.message || `${receiverName} is currently on another call. Please try again later.`;
            Alert.alert(
              'User Busy',
              message,
              [{ text: 'OK' }]
            );
            return; // Don't throw, just return
          }
        }
        throw apiError;
      }
      console.log('[TwilioVideo] Room created:', roomResponse.roomName);

      // Store call info
      this.currentCall = {
        roomName: roomResponse.roomName,
        roomSid: roomResponse.roomSid,
        callSessionId: roomResponse.callSessionId,
        callType: callType,
        callerId: 0, // Set by backend
        receiverId: receiverId,
        receiverName: receiverName,
        isOutgoing: true,
      };

      // Start audio session
      this.startAudioSession(isVideoCall(callType));

      // Get local media stream
      await this.acquireLocalStream(isVideoCall(callType));

      // Create peer connection
      await this.createPeerConnection(receiverId);

      // Create and send offer
      if (this.peerConnection) {
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideoCall(callType),
        });
        await this.peerConnection.setLocalDescription(offer);
        console.log('[TwilioVideo] Local description set (offer)');

        // Send offer to receiver (REL-008: include callSessionId)
        stompService.sendWebRTCOffer(
          roomResponse.roomName,
          receiverId,
          offer,
          roomResponse.callSessionId
        );
        console.log('[TwilioVideo] 📡 Sent WebRTC offer to user', receiverId, 'session:', roomResponse.callSessionId);
      }

      this.setCallState('ringing');
      this.startRingingTimeout();
      this.isInitiatingCall = false; // Reset lock on success

      return this.currentCall;
    } catch (error: any) {
      console.warn('[TwilioVideo] Failed to initiate call:', error);
      this.isInitiatingCall = false; // Reset lock on failure
      this.setCallState('failed');
      this.notifyError(error.message || 'Failed to initiate call');
      this.cleanup();
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptIncomingCall(roomName: string, callType: CallType): Promise<void> {
    console.log(`[TwilioVideo] Accepting call in room ${roomName}`);

    if (this.callState !== 'idle' && this.callState !== 'ringing') {
      throw new Error('Cannot accept call in current state');
    }

    // R6-001: Re-setup WebRTC signaling if it was unsubscribed
    if (!this.webrtcUnsubscribe) {
      this.setupWebRTCSignaling();
    }

    this.setCallState('connecting');

    try {
      // Accept call via backend (this notifies the caller)
      await twilioApi.acceptCall(roomName);
      console.log('[TwilioVideo] Call accepted on backend');

      // Get callerId from pending offer if available (it arrives before Accept is pressed)
      // This is critical for knowing who to send ICE candidates to
      let callerId = 0;
      if (this.pendingOffer && this.pendingOffer.fromUserId) {
        callerId = this.pendingOffer.fromUserId;
        console.log('[TwilioVideo] Got callerId from pending offer:', callerId);
      }

      // Store call info if not already set
      if (!this.currentCall) {
        this.currentCall = {
          roomName: roomName,
          roomSid: '',
          callSessionId: 0,
          callType: callType,
          callerId: callerId,
          receiverId: 0,
          receiverName: '',
          isOutgoing: false,
        };
      } else if (callerId) {
        // Update callerId if we got it from the pending offer
        this.currentCall.callerId = callerId;
      }

      // Validate callerId is set before proceeding - prevents ICE candidates going to wrong destination
      if (!this.currentCall.callerId || this.currentCall.callerId === 0) {
        console.warn('[TwilioVideo] No valid callerId available - waiting for offer signal');
        // The callerId will be set when we process the pending offer
        // For now, we'll proceed and update it when the offer arrives
      }

      // Start audio session
      this.startAudioSession(isVideoCall(callType));

      // Get local media stream
      await this.acquireLocalStream(isVideoCall(callType));

      // Create peer connection with the caller's ID so ICE candidates go to the right place
      await this.createPeerConnection(this.currentCall.callerId);

      // Start connecting timeout - fail if ICE doesn't complete in time
      this.startConnectingTimeout();

      // Process any queued signals (offer and ICE candidates that arrived before Accept)
      // This is critical: the caller sends offer immediately, but receiver's peer connection
      // only gets created when they press Accept - so we need to process queued signals
      console.log('[TwilioVideo] Processing any queued WebRTC signals...');
      await this.processPendingSignals();

      // State will transition to 'connected' when ICE connection completes
      console.log('[TwilioVideo] Waiting for WebRTC connection...');
    } catch (error: any) {
      console.warn('[TwilioVideo] Failed to accept call:', error);
      this.setCallState('failed');
      this.notifyError(error.message || 'Failed to accept call');
      this.cleanup();
      throw error;
    }
  }

  /**
   * Decline an incoming call
   */
  async declineIncomingCall(roomName: string): Promise<void> {
    console.log(`[TwilioVideo] Declining call in room ${roomName}`);

    try {
      await twilioApi.declineCall(roomName);
      this.setCallState('ended');
      this.cleanup();
    } catch (error: any) {
      console.warn('[TwilioVideo] Failed to decline call:', error);
      this.notifyError(error.message || 'Failed to decline call');
    }
  }

  /**
   * Decline an incoming call with a specific reason (e.g., 'busy')
   * This sends the reason to the caller so they see appropriate feedback
   */
  async declineIncomingCallWithReason(roomName: string, reason: string): Promise<void> {
    console.log(`[TwilioVideo] Declining call in room ${roomName} with reason: ${reason}`);

    try {
      // Send hangup with reason to notify caller
      // Note: We don't have callerId here, so we rely on backend to route the message
      stompService.sendWebRTCHangup(roomName, 0, reason);
      await twilioApi.declineCall(roomName);
      // Don't change state or cleanup since we're not the active call
    } catch (error: any) {
      console.warn('[TwilioVideo] Failed to decline call with reason:', error);
    }
  }

  /**
   * End the current call
   * ✅ FIX: Uses lock to prevent multiple hangup signals when called multiple times
   */
  async endCall(reason: string = 'hangup'): Promise<void> {
    console.log(`[TwilioVideo] Ending call, reason: ${reason}`);

    // ✅ FIX: Prevent duplicate endCall invocations
    if (this.isEndingCall) {
      console.log('[TwilioVideo] endCall already in progress, skipping');
      return;
    }

    if (!this.currentCall) {
      console.warn('[TwilioVideo] No active call to end');
      return;
    }

    // ✅ FIX: Set lock to prevent duplicate calls
    this.isEndingCall = true;

    // Send hangup signal to remote peer
    const targetUserId = this.currentCall.isOutgoing
      ? this.currentCall.receiverId
      : this.currentCall.callerId;

    if (targetUserId) {
      // REL-008: include callSessionId for signal deduplication
      stompService.sendWebRTCHangup(
        this.currentCall.roomName,
        targetUserId,
        reason,
        this.currentCall.callSessionId
      );
    }

    try {
      await twilioApi.endCall(this.currentCall.roomName, reason);
    } catch (error) {
      console.warn('[TwilioVideo] Error ending call on backend:', error);
    }

    this.setCallState('ended');
    this.cleanup();
  }

  /**
   * Handle incoming call notification
   */
  handleIncomingCall(
    roomName: string,
    callerId: number,
    callerName: string,
    callType: CallType
  ): void {
    console.log(`[TwilioVideo] Incoming ${callType} call from ${callerName}`);

    if (this.callState !== 'idle') {
      console.warn('[TwilioVideo] Already in a call, sending busy signal');
      // Send busy decline so caller sees "User is busy" instead of timeout
      this.declineIncomingCallWithReason(roomName, BUSY_DECLINE_REASON);
      return;
    }

    // R6-001: Re-setup WebRTC signaling if it was unsubscribed
    if (!this.webrtcUnsubscribe) {
      this.setupWebRTCSignaling();
    }

    this.currentCall = {
      roomName: roomName,
      roomSid: '',
      callSessionId: 0,
      callType: callType,
      callerId: callerId,
      receiverId: 0,
      receiverName: callerName,
      isOutgoing: false,
    };

    this.setCallState('ringing');
  }

  /**
   * Handle when the remote party answers the call (for caller)
   * Called when WebSocket receives call_answered event
   */
  handleCallAnswered(roomName: string): void {
    console.log(`[TwilioVideo] Call answered in room ${roomName}`);

    // Only handle if we're the caller in ringing state
    if (this.callState !== 'ringing' || !this.currentCall?.isOutgoing) {
      console.log('[TwilioVideo] Ignoring call_answered - not caller or not ringing');
      return;
    }

    // Verify it's for our current call
    if (this.currentCall.roomName !== roomName) {
      console.log('[TwilioVideo] Ignoring call_answered - different room');
      return;
    }

    this.clearRingingTimeout();
    this.setCallState('connecting');

    // REL-007: Check if we need to resend offer
    // If we have localDescription but remoteDescription is missing after 2s,
    // the receiver may have missed our offer - resend it
    setTimeout(() => {
      if (this.peerConnection &&
          this.peerConnection.localDescription &&
          !this.peerConnection.remoteDescription &&
          this.callState === 'connecting' &&
          this.currentCall?.roomName === roomName) {
        console.log('[TwilioVideo] REL-007: No remote description after call_answered, resending offer');
        // REL-008: include callSessionId for signal deduplication
        stompService.sendWebRTCOffer(
          this.currentCall.roomName,
          this.currentCall.receiverId,
          this.peerConnection.localDescription,
          this.currentCall.callSessionId
        );
      }
    }, 2000);
    // State will transition to 'connected' when ICE connection completes
  }

  /**
   * Handle when the remote party rejects the call (for caller)
   * Called when WebSocket receives call_declined event
   */
  handleCallRejected(roomName: string, reason: string = 'declined'): void {
    console.log(`[TwilioVideo] Call rejected in room ${roomName}, reason: ${reason}`);

    // Only handle if we're the caller in ringing state
    if (this.callState !== 'ringing' || !this.currentCall?.isOutgoing) {
      console.log('[TwilioVideo] Ignoring call_rejected - not caller or not ringing');
      return;
    }

    // Verify it's for our current call
    if (this.currentCall.roomName !== roomName) {
      console.log('[TwilioVideo] Ignoring call_rejected - different room');
      return;
    }

    this.clearRingingTimeout();
    this.notifyError(`Call ${reason}`);
    this.setCallState('ended');
    this.cleanup();
  }

  /**
   * REL-006: Handle backend-initiated call_ended event
   * Called when backend ends call (timeout, other party disconnect, etc.)
   */
  handleCallEnded(roomName: string, reason?: string): void {
    console.log(`[TwilioVideo] REL-006: Backend call_ended for room ${roomName}, reason: ${reason}`);

    // Ignore if no active call or different room
    if (!this.currentCall || this.currentCall.roomName !== roomName) {
      console.log('[TwilioVideo] REL-006: Ignoring call_ended - no matching active call');
      return;
    }

    // Only handle if call is in active state
    const activeStates: TwilioCallState[] = ['ringing', 'connecting', 'connected', 'reconnecting'];
    if (!activeStates.includes(this.callState)) {
      console.log('[TwilioVideo] REL-006: Ignoring call_ended - call not in active state:', this.callState);
      return;
    }

    // Notify error with friendly message
    const friendlyReason = this.getFriendlyEndReason(reason);
    this.notifyError(friendlyReason);

    // Transition to ended and cleanup
    this.setCallState('ended');
    this.cleanup();
  }

  /**
   * REL-006: Convert backend reason to user-friendly message
   */
  private getFriendlyEndReason(reason?: string): string {
    if (!reason) return 'Call ended';
    const r = reason.toLowerCase();
    if (r.includes('timeout')) return 'No answer';
    if (r.includes('cancelled')) return 'Call cancelled';
    if (r.includes('declined')) return 'Call declined';
    if (r.includes('busy')) return 'User is busy';
    if (r.includes('failed') || r.includes('error')) return 'Call failed';
    if (r.includes('disconnect')) return 'Connection lost';
    if (r.includes('hangup')) return 'Call ended';
    return 'Call ended';
  }

  /**
   * Toggle audio (mute/unmute)
   */
  toggleAudio(): boolean {
    this.isAudioEnabled = !this.isAudioEnabled;
    console.log('[TwilioVideo] Audio toggled:', this.isAudioEnabled);

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
        track.enabled = this.isAudioEnabled;
      });
    }

    return this.isAudioEnabled;
  }

  /**
   * Set audio mute state explicitly
   * Used by CallKit/CallKeep for native mute control
   */
  setMuted(muted: boolean): void {
    this.isAudioEnabled = !muted;
    console.log('[TwilioVideo] Audio muted:', muted);

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
        track.enabled = this.isAudioEnabled;
      });
    }
  }

  /**
   * Toggle video (show/hide)
   */
  toggleVideo(): boolean {
    this.isVideoEnabled = !this.isVideoEnabled;
    console.log('[TwilioVideo] Video toggled:', this.isVideoEnabled);

    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track: MediaStreamTrack) => {
        track.enabled = this.isVideoEnabled;
      });
    }

    return this.isVideoEnabled;
  }

  /**
   * Toggle speaker
   */
  toggleSpeaker(): boolean {
    this.isSpeakerOn = !this.isSpeakerOn;
    console.log('[TwilioVideo] Speaker toggled:', this.isSpeakerOn);

    if (InCallManager) {
      try {
        InCallManager.setSpeakerphoneOn(this.isSpeakerOn);
      } catch (error) {
        console.warn('[TwilioVideo] Failed to toggle speaker:', error);
      }
    }

    return this.isSpeakerOn;
  }

  /**
   * R6-004: Check if peer connection is in a usable state for track operations
   */
  private isPeerConnectionUsable(): boolean {
    if (!this.peerConnection) {
      return false;
    }
    const state = this.peerConnection.connectionState;
    // Allow operations on new, connecting, or connected states
    // Block on failed, closed, or disconnected states
    return state === 'new' || state === 'connecting' || state === 'connected';
  }

  /**
   * Switch camera (front/back)
   * R1-009: Improved with proper fallback handling for replaceTrack failures
   */
  async switchCamera(): Promise<void> {
    // ✅ FIX: Debounce rapid camera switch calls
    const now = Date.now();
    if (now - this.lastCameraSwitchTime < this.CAMERA_SWITCH_DEBOUNCE_MS) {
      console.log('[TwilioVideo] Camera switch debounced - too soon after last switch');
      return;
    }

    // ✅ FIX: Prevent concurrent camera switch operations
    if (this.isSwitchingCamera) {
      console.log('[TwilioVideo] Camera switch already in progress, ignoring');
      return;
    }

    console.log('[TwilioVideo] Switching camera');
    this.isSwitchingCamera = true;
    this.lastCameraSwitchTime = now;

    if (!this.localStream) {
      console.warn('[TwilioVideo] No local stream to switch camera');
      this.isSwitchingCamera = false;
      return;
    }

    // R6-004: Check if connection is in a usable state
    if (this.peerConnection && !this.isPeerConnectionUsable()) {
      console.warn('[TwilioVideo] R6-004: Cannot switch camera - connection not in usable state');
      this.notifyError('Cannot switch camera - call is not connected');
      this.isSwitchingCamera = false;
      return;
    }

    // Store old tracks for potential recovery
    const oldVideoTracks = this.localStream.getVideoTracks();
    const targetCamera = !this.isFrontCamera;

    try {
      // Get new stream with switched camera BEFORE stopping old tracks
      const newStream = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: targetCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        throw new Error('No video track in new stream');
      }

      // R1-009: Try to replace track in peer connection first (before modifying local stream)
      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) {
          try {
            await videoSender.replaceTrack(newVideoTrack);
            console.log('[TwilioVideo] R1-009: replaceTrack succeeded');
          } catch (replaceError) {
            // R1-009: replaceTrack failed - stop new track and abort
            console.warn('[TwilioVideo] R1-009: replaceTrack failed, keeping old camera:', replaceError);
            newVideoTrack.stop();
            this.notifyError('Failed to switch camera - keeping current camera');
            this.isSwitchingCamera = false;
            return; // Don't change anything
          }
        }
      }

      // replaceTrack succeeded, now safe to update local stream
      this.isFrontCamera = targetCamera;

      // Stop old video tracks
      oldVideoTracks.forEach((track: MediaStreamTrack) => {
        track.stop();
        this.localStream?.removeTrack(track);
      });

      // Add new video track to local stream
      this.localStream.addTrack(newVideoTrack);

      // Notify stream change
      this.notifyStream(this.localStream, 'local');
      console.log('[TwilioVideo] Camera switched to:', targetCamera ? 'front' : 'back');

    } catch (error) {
      console.warn('[TwilioVideo] Failed to switch camera:', error);
      this.notifyError('Failed to switch camera');
      // Camera state wasn't changed, so no need to revert
    } finally {
      this.isSwitchingCamera = false;
    }
  }

  // ==================== Callbacks ====================

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  onStream(callback: StreamCallback): () => void {
    this.streamCallbacks.add(callback);
    return () => this.streamCallbacks.delete(callback);
  }

  // ==================== Getters ====================

  getCallState(): TwilioCallState {
    return this.callState;
  }

  getCurrentCall(): TwilioCallInfo | null {
    return this.currentCall;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getDuration(): number {
    return this.duration;
  }

  isAudioMuted(): boolean {
    return !this.isAudioEnabled;
  }

  isVideoMuted(): boolean {
    return !this.isVideoEnabled;
  }

  isSpeakerEnabled(): boolean {
    return this.isSpeakerOn;
  }

  isFrontCameraActive(): boolean {
    return this.isFrontCamera;
  }

  // ==================== Private Methods ====================

  private async acquireLocalStream(includeVideo: boolean): Promise<void> {
    console.log(`[TwilioVideo] Getting local stream, video: ${includeVideo}`);

    const runningOnEmulator = isEmulator();
    if (runningOnEmulator) {
      console.warn('[TwilioVideo] ⚠️ Running on EMULATOR - audio/video may not work properly');
    }

    try {
      // Build constraints - for audio-only calls, completely exclude video key
      // to prevent camera permission requests on some Android devices
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as MediaTrackConstraints,
      };

      // Only add video constraints for video calls
      if (includeVideo) {
        constraints.video = {
          facingMode: this.isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        } as MediaTrackConstraints;
      }

      console.log(`[TwilioVideo] Calling getUserMedia with constraints:`, JSON.stringify(constraints));

      // Timeout for getUserMedia - shorter on emulators since they often hang
      const MEDIA_TIMEOUT_MS = runningOnEmulator ? 5000 : 30000; // 5s on emulator, 30s on device
      const mediaPromise = mediaDevices.getUserMedia(constraints);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(runningOnEmulator
            ? 'Emulator audio not available - call will connect without audio for testing'
            : 'Unable to access microphone. Please check permissions.'));
        }, MEDIA_TIMEOUT_MS);
      });

      this.localStream = await Promise.race([mediaPromise, timeoutPromise]) as MediaStream;
      console.log(`[TwilioVideo] Local stream obtained (video: ${includeVideo})`);

      // R1-008: Add track.onended listeners for device unplugged detection
      this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
        // @ts-ignore - react-native-webrtc types don't match standard WebRTC API
        track.onended = () => {
          console.warn(`[TwilioVideo] R1-008: Local ${track.kind} track ended (device unplugged?)`);
          if (track.kind === 'video') {
            this.notifyError('Camera disconnected');
            // Video track ended - notify user but don't end call (audio may continue)
            this.isVideoEnabled = false;
          } else if (track.kind === 'audio') {
            this.notifyError('Microphone disconnected');
            // Audio track ended - this is more serious
            this.isAudioEnabled = false;
          }
          // Re-notify stream so UI can update
          this.notifyStream(this.localStream, 'local');
        };
      });

      // Notify stream
      this.notifyStream(this.localStream, 'local');
    } catch (error: any) {
      console.warn('[TwilioVideo] Failed to get local stream:', error);

      // On emulator, create empty stream so call flow can continue for testing
      if (runningOnEmulator) {
        console.warn('[TwilioVideo] ⚠️ Creating empty stream for emulator testing');
        this.localStream = new MediaStream();
        this.notifyStream(this.localStream, 'local');
        this.notifyError('Running on emulator - audio disabled');
        return; // Don't throw - let call continue without audio
      }

      throw new Error('Failed to access camera/microphone');
    }
  }

  private startAudioSession(isVideo: boolean): void {
    if (!InCallManager) return;

    try {
      InCallManager.start({ media: isVideo ? 'video' : 'audio' });
      InCallManager.setSpeakerphoneOn(isVideo); // Speaker on for video calls by default
      InCallManager.setKeepScreenOn(true);
      this.isSpeakerOn = isVideo;
    } catch (error) {
      console.warn('[TwilioVideo] Failed to start audio session:', error);
    }
  }

  private stopAudioSession(): void {
    if (!InCallManager) return;

    try {
      InCallManager.stop();
    } catch (error) {
      console.warn('[TwilioVideo] Failed to stop audio session:', error);
    }
  }

  private startRingingTimeout(): void {
    this.clearRingingTimeout();
    this.ringingTimeout = setTimeout(() => {
      console.log('[TwilioVideo] Ringing timeout');
      if (this.callState === 'ringing') {
        this.endCall('timeout');
      }
    }, this.RINGING_TIMEOUT_MS);
  }

  private clearRingingTimeout(): void {
    if (this.ringingTimeout) {
      clearTimeout(this.ringingTimeout);
      this.ringingTimeout = null;
    }
  }

  /**
   * Start timeout for connecting state - fail if ICE doesn't complete in time
   */
  private startConnectingTimeout(): void {
    this.clearConnectingTimeout();
    this.connectingTimeout = setTimeout(() => {
      console.log('[TwilioVideo] Connecting timeout - ICE negotiation took too long');
      if (this.callState === 'connecting') {
        this.notifyError('Connection timeout - unable to establish call');
        this.setCallState('failed');
        this.cleanup();
      }
    }, this.CONNECTING_TIMEOUT_MS);
  }

  private clearConnectingTimeout(): void {
    if (this.connectingTimeout) {
      clearTimeout(this.connectingTimeout);
      this.connectingTimeout = null;
    }
  }

  /**
   * Attempt ICE restart after a delay (for 'disconnected' state)
   * Gives network time to recover before triggering restart
   */
  private attemptIceRestart(): void {
    this.clearIceRestartTimeout();
    this.iceRestartTimeout = setTimeout(() => {
      if (this.callState === 'reconnecting' && this.peerConnection) {
        console.log('[TwilioVideo] Starting ICE restart after disconnection');
        this.performIceRestart();
      }
    }, this.ICE_RESTART_TIMEOUT_MS);
  }

  /**
   * Perform ICE restart to recover connection
   * R1-005: Uses lock to prevent concurrent ICE restarts
   */
  private async performIceRestart(): Promise<void> {
    // R1-005: Check lock to prevent concurrent restarts
    if (this.isIceRestartInProgress) {
      console.log('[TwilioVideo] ICE restart already in progress, skipping');
      return;
    }

    if (!this.peerConnection || !this.currentCall) {
      console.warn('[TwilioVideo] Cannot perform ICE restart - no peer connection or call');
      return;
    }

    // R1-005: Acquire lock
    this.isIceRestartInProgress = true;
    this.iceRestartAttempts++;
    console.log(`[TwilioVideo] Performing ICE restart (attempt ${this.iceRestartAttempts}/${this.MAX_ICE_RESTART_ATTEMPTS})`);

    try {
      // Create new offer with ICE restart flag
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);

      // Send the new offer to remote peer
      const targetUserId = this.currentCall.isOutgoing
        ? this.currentCall.receiverId
        : this.currentCall.callerId;

      if (targetUserId) {
        // REL-008: include callSessionId for signal deduplication
        stompService.sendWebRTCOffer(
          this.currentCall.roomName,
          targetUserId,
          offer,
          this.currentCall.callSessionId
        );
        console.log('[TwilioVideo] ICE restart offer sent to user', targetUserId, 'session:', this.currentCall.callSessionId);
      }
    } catch (error) {
      console.warn('[TwilioVideo] ICE restart failed:', error);
      // If restart fails, check if we should try again or give up
      if (this.iceRestartAttempts >= this.MAX_ICE_RESTART_ATTEMPTS) {
        this.notifyError('Connection lost - unable to reconnect');
        this.setCallState('failed');
        this.cleanup();
      }
    } finally {
      // R1-005: Release lock
      this.isIceRestartInProgress = false;
    }
  }

  private clearIceRestartTimeout(): void {
    if (this.iceRestartTimeout) {
      clearTimeout(this.iceRestartTimeout);
      this.iceRestartTimeout = null;
    }
  }

  private startDurationTimer(): void {
    this.callStartTime = Date.now();
    this.duration = 0;

    this.durationInterval = setInterval(() => {
      if (this.callStartTime) {
        this.duration = Math.floor((Date.now() - this.callStartTime) / 1000);
      }
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * R1-006: Start TURN credential refresh timer for long calls
   * Checks periodically if credentials need refreshing and updates ICE servers
   */
  private startTurnRefreshTimer(): void {
    this.stopTurnRefreshTimer();
    this.turnRefreshInterval = setInterval(async () => {
      await this.checkAndRefreshTurnCredentials();
    }, this.TURN_REFRESH_INTERVAL_MS);
    console.log('[TwilioVideo] TURN credential refresh timer started');
  }

  private stopTurnRefreshTimer(): void {
    if (this.turnRefreshInterval) {
      clearInterval(this.turnRefreshInterval);
      this.turnRefreshInterval = null;
    }
  }

  /**
   * R1-006: Check if TURN credentials need refreshing and update if necessary
   * This is called periodically during long calls to prevent credential expiry
   */
  private async checkAndRefreshTurnCredentials(): Promise<void> {
    const now = Date.now();
    const timeSinceCached = now - iceServersCacheTime;

    // Check if credentials are getting stale (older than refresh threshold)
    if (timeSinceCached >= ICE_SERVERS_REFRESH_THRESHOLD) {
      console.log('[TwilioVideo] R1-006: TURN credentials approaching expiry, refreshing...');

      try {
        // Force refresh by clearing cache
        cachedIceServers = null;
        iceServersCacheTime = 0;

        // Fetch fresh credentials
        const newIceConfig = await getIceServers();
        console.log('[TwilioVideo] R1-006: TURN credentials refreshed successfully');

        // If we have an active peer connection and need ICE restart,
        // the new credentials will be used automatically
        // Note: We don't update the existing PC's ICE servers as that's not
        // supported. Instead, if ICE restart is needed, it will use new config.
      } catch (error) {
        console.warn('[TwilioVideo] R1-006: Failed to refresh TURN credentials:', error);
      }
    } else {
      console.log(`[TwilioVideo] R1-006: TURN credentials still valid (${Math.round(timeSinceCached / 60000)}min old)`);
    }
  }

  private cleanup(): void {
    // ✅ FIX: Prevent multiple cleanup invocations
    if (this.isCleaningUp) {
      console.log('[TwilioVideo] Cleanup already in progress, skipping');
      return;
    }
    this.isCleaningUp = true;

    console.log('[TwilioVideo] Cleaning up');

    // Clear all timeouts first
    this.clearRingingTimeout();
    this.clearConnectingTimeout();
    this.clearIceRestartTimeout();
    this.stopDurationTimer();
    this.stopTurnRefreshTimer(); // R1-006: Stop TURN credential refresh
    this.stopAudioSession();

    // R6-001/R6-003: Unsubscribe from WebRTC signals to prevent stale callbacks
    if (this.webrtcUnsubscribe) {
      this.webrtcUnsubscribe();
      this.webrtcUnsubscribe = null;
      console.log('[TwilioVideo] WebRTC signaling unsubscribed');
      // R6-003: Immediately re-subscribe to capture offers for next call
      // This prevents missing offers that arrive before acceptIncomingCall
      this.setupWebRTCSignaling();
      console.log('[TwilioVideo] R6-003: Immediately re-subscribed to WebRTC signaling');
    }

    // Clear any pending cleanup timeout to prevent race conditions
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
      });
      this.localStream = null;
    }

    // Clear remote stream
    this.remoteStream = null;

    // Reset WebRTC state
    this.hasRemoteDescription = false;
    this.pendingIceCandidates = [];
    this.pendingOffer = null;
    this.pendingSignals = [];
    this.processedSignalIds.clear();
    this.processedCandidates.clear(); // R1-004: Clear candidate dedup set
    this.cancelledRooms.clear(); // R3-002: Clear cancelled rooms

    // Reset state
    this.currentCall = null;
    this.isAudioEnabled = true;
    this.isVideoEnabled = true;
    this.isSpeakerOn = false;
    this.isFrontCamera = true;
    this.duration = 0;
    this.callStartTime = null;

    // Reset ICE restart state
    this.iceRestartAttempts = 0;
    this.isIceRestartInProgress = false; // R1-005: Reset lock
    this.isInitiatingCall = false;
    this.isEndingCall = false; // ✅ FIX: Reset endCall lock
    this.isCleaningUp = false; // ✅ FIX: Reset cleanup lock

    // Notify null streams
    this.notifyStream(null, 'local');
    this.notifyStream(null, 'remote');

    // Store reference to current state for the delayed reset
    const currentState = this.callState;

    // Reset to idle after a brief delay
    // Track the timeout so we can cancel it if a new call starts
    this.cleanupTimeout = setTimeout(() => {
      // Only reset to idle if state hasn't changed (prevents race with new call)
      if (this.callState === currentState &&
          (this.callState === 'ended' || this.callState === 'failed')) {
        this.setCallState('idle');
      }
      this.cleanupTimeout = null;
    }, 2000);
  }

  private setCallState(state: TwilioCallState): void {
    console.log(`[TwilioVideo] State change: ${this.callState} -> ${state}`);
    this.callState = state;
    this.stateChangeCallbacks.forEach((cb) => cb(state));
  }

  private notifyError(error: string): void {
    this.errorCallbacks.forEach((cb) => cb(error));
  }

  private notifyStream(stream: MediaStream | null, type: 'local' | 'remote'): void {
    this.streamCallbacks.forEach((cb) => cb(stream, type));
  }
}

// Export singleton instance
export const twilioVideoService = new TwilioVideoService();
export default twilioVideoService;
