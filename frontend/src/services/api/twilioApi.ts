/**
 * Twilio API Service
 *
 * Handles communication with backend Twilio endpoints for:
 * - Video/Audio calling
 * - OTP verification
 */

import apiClient from './client';

// ==================== Types ====================

export interface VideoTokenResponse {
  token: string;
  roomName: string;
  identity: string;
  expiresIn: number;
}

export interface RoomResponse {
  roomSid: string;
  roomName: string;
  status: string;
  callSessionId: number;
  callType: 'VIDEO' | 'AUDIO';
  maxParticipants: number;
}

export interface CallHistoryItem {
  callSessionId: number;
  roomName: string;
  callerId: number;
  receiverId: number;
  callType: 'VIDEO' | 'AUDIO';
  status: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  endReason: string | null;
  isOutgoing: boolean;
}

export interface OtpSendResponse {
  success: boolean;
  message: string;
  verificationSid?: string;
  channel?: string;
  status?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  valid: boolean;
  message: string;
  status?: string;
}

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export interface IceServerResponse {
  iceServers: IceServer[];
  ttl: number;
}

// REL-004: Call configuration response
export interface CallConfigResponse {
  ringingTimeoutSeconds: number;
  initiatedTimeoutSeconds: number;
  maxDurationSeconds: number;
  reconnectTimeoutSeconds: number;
}

// P0-05: Call status response
export interface CallStatusResponse {
  roomName: string;
  status: 'INITIATED' | 'RINGING' | 'CONNECTED' | 'ENDED' | 'DECLINED' | 'MISSED' | 'FAILED';
  callerId: number;
  receiverId: number;
  callType: 'VIDEO' | 'AUDIO';
  startTime: string;
  isActive: boolean;
}

// Backend expects uppercase: 'VIDEO' | 'AUDIO'
export type BackendCallType = 'VIDEO' | 'AUDIO';

// Frontend uses lowercase: 'voice' | 'video'
export type CallType = 'voice' | 'video' | 'VIDEO' | 'AUDIO';

/**
 * Map frontend call type to backend format
 */
const mapCallTypeToBackend = (callType: CallType): BackendCallType => {
  const normalizedType = callType.toLowerCase();
  if (normalizedType === 'voice' || normalizedType === 'audio') {
    return 'AUDIO';
  }
  return 'VIDEO';
};

// ==================== Video/Audio Calling API ====================

/**
 * Create a new call room
 */
export const createRoom = async (
  receiverId: number,
  callType: CallType
): Promise<RoomResponse> => {
  const backendCallType = mapCallTypeToBackend(callType);
  const response = await apiClient.post<RoomResponse>('/api/twilio/video/room', {
    receiverId,
    callType: backendCallType,
  });
  return response;
};

/**
 * Get access token for a room
 */
export const getVideoToken = async (roomName: string): Promise<VideoTokenResponse> => {
  const response = await apiClient.post<VideoTokenResponse>('/api/twilio/video/token', {
    roomName,
  });
  return response;
};

/**
 * Join an existing call
 */
export const joinCall = async (roomName: string): Promise<VideoTokenResponse> => {
  const response = await apiClient.post<VideoTokenResponse>('/api/twilio/video/join', {
    roomName,
  });
  return response;
};

/**
 * Accept an incoming call
 */
export const acceptCall = async (roomName: string): Promise<VideoTokenResponse> => {
  const response = await apiClient.post<VideoTokenResponse>('/api/twilio/video/accept', {
    roomName,
  });
  return response;
};

/**
 * Decline an incoming call
 */
export const declineCall = async (roomName: string): Promise<{ status: string; roomName: string }> => {
  const response = await apiClient.post<{ status: string; roomName: string }>('/api/twilio/video/decline', {
    roomName,
  });
  return response;
};

/**
 * End an active call
 */
export const endCall = async (
  roomName: string,
  reason: string = 'hangup'
): Promise<{ status: string; roomName: string }> => {
  const response = await apiClient.post<{ status: string; roomName: string }>('/api/twilio/video/end', {
    roomName,
    reason,
  });
  return response;
};

/**
 * Get ICE servers (STUN/TURN) for WebRTC
 */
export const getIceServers = async (): Promise<IceServerResponse> => {
  const response = await apiClient.get<IceServerResponse>('/api/twilio/video/ice-servers');
  return response;
};

/**
 * REL-004: Get call configuration (timeouts)
 * Returns server-configured timeout values for frontend synchronization
 */
export const getCallConfig = async (): Promise<CallConfigResponse> => {
  const response = await apiClient.get<CallConfigResponse>('/api/twilio/video/config');
  return response;
};

/**
 * Get call history
 */
export const getCallHistory = async (limit: number = 50): Promise<CallHistoryItem[]> => {
  const response = await apiClient.get<CallHistoryItem[]>(`/api/twilio/video/history?limit=${limit}`);
  return response;
};

/**
 * P0-05: Get call status
 * Used to verify a call is still valid before showing incoming call UI
 */
export const getCallStatus = async (roomName: string): Promise<CallStatusResponse | null> => {
  try {
    const response = await apiClient.get<CallStatusResponse>(`/api/twilio/video/status/${encodeURIComponent(roomName)}`);
    return response;
  } catch (error: any) {
    // 404 means call not found or already ended
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * P0-06: Cancel an outgoing call
 * Called when the caller hangs up before the receiver answers
 */
export const cancelCall = async (roomName: string): Promise<{ status: string; roomName: string }> => {
  const response = await apiClient.post<{ status: string; roomName: string }>('/api/twilio/video/cancel', {
    roomName,
  });
  return response;
};

// ==================== OTP Verification API ====================

/**
 * Send OTP to a phone number
 * Note: skipAuth=true because this is used during registration before user has token
 */
export const sendOtp = async (
  phoneNumber: string,
  channel: 'sms' | 'call' = 'sms'
): Promise<OtpSendResponse> => {
  const response = await apiClient.post<OtpSendResponse>(
    '/api/twilio/otp/send',
    { phoneNumber, channel },
    { skipAuth: true } // OTP endpoints don't require auth - used during registration
  );
  return response;
};

/**
 * Verify OTP code
 * Note: skipAuth=true because this is used during registration before user has token
 */
export const verifyOtp = async (
  phoneNumber: string,
  code: string
): Promise<OtpVerifyResponse> => {
  const response = await apiClient.post<OtpVerifyResponse>(
    '/api/twilio/otp/verify',
    { phoneNumber, code },
    { skipAuth: true } // OTP endpoints don't require auth - used during registration
  );
  return response;
};

/**
 * Send OTP to email
 * Note: skipAuth=true because this is used during registration before user has token
 */
export const sendOtpEmail = async (email: string): Promise<OtpSendResponse> => {
  console.log('[twilioApi] sendOtpEmail called with email:', email);
  try {
    const response = await apiClient.post<OtpSendResponse>(
      '/api/twilio/otp/send-email',
      { email },
      { skipAuth: true } // OTP endpoints don't require auth - used during registration
    );
    console.log('[twilioApi] sendOtpEmail response:', response);
    return response;
  } catch (error) {
    console.warn('[twilioApi] sendOtpEmail error:', error);
    throw error;
  }
};

/**
 * Verify email OTP
 * Note: skipAuth=true because this is used during registration before user has token
 */
export const verifyOtpEmail = async (
  email: string,
  code: string
): Promise<OtpVerifyResponse> => {
  console.log('[twilioApi] verifyOtpEmail called with email:', email, 'code:', code);
  try {
    const response = await apiClient.post<OtpVerifyResponse>(
      '/api/twilio/otp/verify-email',
      { email, code },
      { skipAuth: true } // OTP endpoints don't require auth - used during registration
    );
    console.log('[twilioApi] verifyOtpEmail response:', response);
    return response;
  } catch (error) {
    console.warn('[twilioApi] verifyOtpEmail error:', error);
    throw error;
  }
};

export const twilioApi = {
  // Video/Audio
  createRoom,
  getVideoToken,
  joinCall,
  acceptCall,
  declineCall,
  endCall,
  cancelCall, // P0-06: Cancel outgoing call
  getCallStatus, // P0-05: Check call validity
  getIceServers,
  getCallConfig,
  getCallHistory,
  // OTP
  sendOtp,
  verifyOtp,
  sendOtpEmail,
  verifyOtpEmail,
};

export default twilioApi;
