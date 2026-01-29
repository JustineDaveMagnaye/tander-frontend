/**
 * useTwilioCall Hook
 *
 * React hook for Twilio Video calling with full state management
 * Provides a clean interface for CallScreen component
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaStream } from 'react-native-webrtc';
import { twilioVideoService, TwilioCallState, TwilioCallInfo } from '@services/twilio';
import type { CallType } from '@services/api/twilioApi';

export type CallEndReason = 'completed' | 'missed' | 'declined' | 'cancelled' | 'failed';

export interface CallEndInfo {
  reason: CallEndReason;
  duration: number; // in seconds
  wasConnected: boolean;
}

export interface UseTwilioCallReturn {
  // Call state
  callState: TwilioCallState;
  callInfo: TwilioCallInfo | null;
  duration: number;
  error: string | null;
  callEndInfo: CallEndInfo | null;

  // Streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // Media state
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isSpeakerOn: boolean;
  isFrontCamera: boolean;

  // Actions
  initiateCall: (receiverId: number, receiverName: string, callType: CallType) => Promise<void>;
  acceptCall: (roomName: string, callType: CallType) => Promise<void>;
  declineCall: (roomName: string) => Promise<void>;
  endCall: (reason?: string) => Promise<void>;

  // Media controls
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => Promise<void>;

  // Utilities
  clearError: () => void;
  clearCallEndInfo: () => void;
}

export function useTwilioCall(): UseTwilioCallReturn {
  const [callState, setCallState] = useState<TwilioCallState>(() => twilioVideoService.getCallState());
  const [callInfo, setCallInfo] = useState<TwilioCallInfo | null>(() => twilioVideoService.getCurrentCall());
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [callEndInfo, setCallEndInfo] = useState<CallEndInfo | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<number | null>(null); // R6-005: Store connection start time for accurate duration

  // Track call state for determining end reason
  const wasConnectedRef = useRef<boolean>(false);
  const previousStateRef = useRef<TwilioCallState>('idle');
  const endReasonRef = useRef<CallEndReason | null>(null);

  // Subscribe to service events
  useEffect(() => {
    const unsubState = twilioVideoService.onStateChange((state) => {
      const currentCallInfo = twilioVideoService.getCurrentCall();
      const prevState = previousStateRef.current;

      setCallState(state);
      setCallInfo(currentCallInfo);

      // Track if call was ever connected
      if (state === 'connected') {
        wasConnectedRef.current = true;
        connectionStartTimeRef.current = Date.now(); // R6-005: Store connection start time
        startDurationTimer();
      } else if (state === 'ended' || state === 'failed') {
        stopDurationTimer();

        // Determine end reason based on state transition and context
        const finalDuration = twilioVideoService.getDuration();
        let reason: CallEndReason = endReasonRef.current || 'completed';

        if (!endReasonRef.current) {
          if (state === 'failed') {
            reason = 'failed';
          } else if (wasConnectedRef.current) {
            reason = 'completed';
          } else if (prevState === 'ringing') {
            // Call ended while ringing - could be missed (timeout) or cancelled
            reason = currentCallInfo?.isOutgoing ? 'cancelled' : 'missed';
          } else {
            reason = 'cancelled';
          }
        }

        // Set call end info
        setCallEndInfo({
          reason,
          duration: finalDuration,
          wasConnected: wasConnectedRef.current,
        });

        // Reset refs for next call
        endReasonRef.current = null;
      } else if (state === 'idle') {
        // Reset tracking refs when back to idle
        wasConnectedRef.current = false;
        connectionStartTimeRef.current = null; // R6-005: Reset connection start time
        stopDurationTimer();
      }

      previousStateRef.current = state;
    });

    const unsubError = twilioVideoService.onError((err) => {
      setError(err);
    });

    const unsubStream = twilioVideoService.onStream((stream, type) => {
      if (type === 'local') {
        setLocalStream(stream);
      } else {
        setRemoteStream(stream);
      }
    });

    return () => {
      unsubState();
      unsubError();
      unsubStream();
      stopDurationTimer();
    };
  }, []);

  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    setDuration(0);

    // R6-005: Use absolute time calculation to prevent drift
    durationIntervalRef.current = setInterval(() => {
      if (connectionStartTimeRef.current) {
        setDuration(Math.floor((Date.now() - connectionStartTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const initiateCall = useCallback(async (
    receiverId: number,
    receiverName: string,
    callType: CallType
  ) => {
    setError(null);
    try {
      await twilioVideoService.initiateCall(receiverId, receiverName, callType);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const acceptCall = useCallback(async (roomName: string, callType: CallType) => {
    setError(null);
    try {
      await twilioVideoService.acceptIncomingCall(roomName, callType);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const declineCall = useCallback(async (roomName: string) => {
    endReasonRef.current = 'declined';
    await twilioVideoService.declineIncomingCall(roomName);
  }, []);

  const endCall = useCallback(async (reason?: string) => {
    // Map reason string to CallEndReason if provided
    if (reason === 'cancelled' || reason === 'declined' || reason === 'missed') {
      endReasonRef.current = reason as CallEndReason;
    }
    await twilioVideoService.endCall(reason);
  }, []);

  const toggleAudio = useCallback(() => {
    try {
      const enabled = twilioVideoService.toggleAudio();
      setIsAudioMuted(!enabled);
    } catch (e: any) {
      console.warn('[useTwilioCall] Failed to toggle audio:', e);
      setError(e.message || 'Failed to toggle audio');
    }
  }, []);

  const toggleVideo = useCallback(() => {
    try {
      const enabled = twilioVideoService.toggleVideo();
      setIsVideoMuted(!enabled);
    } catch (e: any) {
      console.warn('[useTwilioCall] Failed to toggle video:', e);
      setError(e.message || 'Failed to toggle video');
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    try {
      const on = twilioVideoService.toggleSpeaker();
      setIsSpeakerOn(on);
    } catch (e: any) {
      console.warn('[useTwilioCall] Failed to toggle speaker:', e);
      setError(e.message || 'Failed to toggle speaker');
    }
  }, []);

  const switchCamera = useCallback(async () => {
    try {
      await twilioVideoService.switchCamera();
      setIsFrontCamera(twilioVideoService.isFrontCameraActive());
    } catch (e: any) {
      console.warn('[useTwilioCall] Failed to switch camera:', e);
      setError(e.message || 'Failed to switch camera');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearCallEndInfo = useCallback(() => setCallEndInfo(null), []);

  return {
    callState,
    callInfo,
    duration,
    error,
    callEndInfo,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    isSpeakerOn,
    isFrontCamera,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
    clearError,
    clearCallEndInfo,
  };
}

export default useTwilioCall;
