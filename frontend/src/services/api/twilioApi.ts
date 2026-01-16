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

// ==================== OTP Verification API ====================

/**
 * Send OTP to a phone number
 */
export const sendOtp = async (
  phoneNumber: string,
  channel: 'sms' | 'call' = 'sms'
): Promise<OtpSendResponse> => {
  const response = await apiClient.post<OtpSendResponse>('/api/twilio/otp/send', {
    phoneNumber,
    channel,
  });
  return response;
};

/**
 * Verify OTP code
 */
export const verifyOtp = async (
  phoneNumber: string,
  code: string
): Promise<OtpVerifyResponse> => {
  const response = await apiClient.post<OtpVerifyResponse>('/api/twilio/otp/verify', {
    phoneNumber,
    code,
  });
  return response;
};

/**
 * Send OTP to email
 */
export const sendOtpEmail = async (email: string): Promise<OtpSendResponse> => {
  console.log('[twilioApi] sendOtpEmail called with email:', email);
  try {
    const response = await apiClient.post<OtpSendResponse>('/api/twilio/otp/send-email', {
      email,
    });
    console.log('[twilioApi] sendOtpEmail response:', response);
    return response;
  } catch (error) {
    console.error('[twilioApi] sendOtpEmail error:', error);
    throw error;
  }
};

/**
 * Verify email OTP
 */
export const verifyOtpEmail = async (
  email: string,
  code: string
): Promise<OtpVerifyResponse> => {
  console.log('[twilioApi] verifyOtpEmail called with email:', email, 'code:', code);
  try {
    const response = await apiClient.post<OtpVerifyResponse>('/api/twilio/otp/verify-email', {
      email,
      code,
    });
    console.log('[twilioApi] verifyOtpEmail response:', response);
    return response;
  } catch (error) {
    console.error('[twilioApi] verifyOtpEmail error:', error);
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
