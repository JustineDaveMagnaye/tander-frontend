/**
 * TANDER Push Deduplicator Service
 *
 * Prevents ghost calls and duplicate notifications by tracking
 * processed call IDs and implementing TTL-based cleanup.
 *
 * Ghost calls can occur when:
 * - Push notification arrives after caller has cancelled
 * - Duplicate pushes sent due to retry logic
 * - Network delays cause out-of-order delivery
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  PROCESSED_CALLS: '@tander_processed_calls',
  CANCELLED_CALLS: '@tander_cancelled_calls',
};

// TTL for processed calls (5 minutes)
const PROCESSED_CALL_TTL_MS = 5 * 60 * 1000;

// TTL for cancelled calls (2 minutes)
const CANCELLED_CALL_TTL_MS = 2 * 60 * 1000;

interface ProcessedCall {
  callId: string;
  roomId: string;
  timestamp: number;
  status: 'received' | 'shown' | 'accepted' | 'declined' | 'timeout' | 'cancelled';
}

interface CancelledCall {
  roomId: string;
  callId: string;
  timestamp: number;
}

/**
 * Push Deduplicator Service
 */
class PushDeduplicatorService {
  private processedCalls: Map<string, ProcessedCall> = new Map();
  private cancelledCalls: Map<string, CancelledCall> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.loadFromStorage();
    this.startCleanupInterval();
    console.log('[PushDeduplicator] Initialized with', this.processedCalls.size, 'processed calls');
  }

  /**
   * Load persisted state from storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const [processedJson, cancelledJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PROCESSED_CALLS),
        AsyncStorage.getItem(STORAGE_KEYS.CANCELLED_CALLS),
      ]);

      if (processedJson) {
        const processed: ProcessedCall[] = JSON.parse(processedJson);
        const now = Date.now();
        processed.forEach((call) => {
          if (now - call.timestamp < PROCESSED_CALL_TTL_MS) {
            this.processedCalls.set(call.callId, call);
          }
        });
      }

      if (cancelledJson) {
        const cancelled: CancelledCall[] = JSON.parse(cancelledJson);
        const now = Date.now();
        cancelled.forEach((call) => {
          if (now - call.timestamp < CANCELLED_CALL_TTL_MS) {
            this.cancelledCalls.set(call.roomId, call);
          }
        });
      }
    } catch (error) {
      console.warn('[PushDeduplicator] Failed to load from storage:', error);
    }
  }

  /**
   * Persist state to storage
   */
  private async persistToStorage(): Promise<void> {
    try {
      const processedArray = Array.from(this.processedCalls.values());
      const cancelledArray = Array.from(this.cancelledCalls.values());

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.PROCESSED_CALLS, JSON.stringify(processedArray)),
        AsyncStorage.setItem(STORAGE_KEYS.CANCELLED_CALLS, JSON.stringify(cancelledArray)),
      ]);
    } catch (error) {
      console.warn('[PushDeduplicator] Failed to persist to storage:', error);
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    this.stopCleanupInterval();
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop the cleanup interval
   */
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    // Cleanup processed calls
    for (const [callId, call] of this.processedCalls) {
      if (now - call.timestamp > PROCESSED_CALL_TTL_MS) {
        this.processedCalls.delete(callId);
        cleaned++;
      }
    }

    // Cleanup cancelled calls
    for (const [roomId, call] of this.cancelledCalls) {
      if (now - call.timestamp > CANCELLED_CALL_TTL_MS) {
        this.cancelledCalls.delete(roomId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log('[PushDeduplicator] Cleaned up', cleaned, 'expired entries');
      this.persistToStorage();
    }
  }

  /**
   * Check if a call push should be processed
   * Returns false if this is a duplicate or cancelled call
   */
  shouldProcessCall(callId: string, roomId: string): boolean {
    // Check if call was already processed
    if (this.processedCalls.has(callId)) {
      console.log('[PushDeduplicator] Ignoring duplicate call:', callId);
      return false;
    }

    // Check if call was cancelled before we received it
    if (this.cancelledCalls.has(roomId)) {
      console.log('[PushDeduplicator] Ignoring cancelled call:', roomId);
      return false;
    }

    return true;
  }

  /**
   * Mark a call as received (first step)
   */
  markCallReceived(callId: string, roomId: string): void {
    this.processedCalls.set(callId, {
      callId,
      roomId,
      timestamp: Date.now(),
      status: 'received',
    });
    this.persistToStorage();
    console.log('[PushDeduplicator] Call marked received:', callId);
  }

  /**
   * Mark a call as shown to user
   */
  markCallShown(callId: string): void {
    const call = this.processedCalls.get(callId);
    if (call) {
      call.status = 'shown';
      call.timestamp = Date.now();
      this.persistToStorage();
      console.log('[PushDeduplicator] Call marked shown:', callId);
    }
  }

  /**
   * Mark a call as accepted
   */
  markCallAccepted(callId: string): void {
    const call = this.processedCalls.get(callId);
    if (call) {
      call.status = 'accepted';
      call.timestamp = Date.now();
      this.persistToStorage();
      console.log('[PushDeduplicator] Call marked accepted:', callId);
    }
  }

  /**
   * Mark a call as declined
   */
  markCallDeclined(callId: string): void {
    const call = this.processedCalls.get(callId);
    if (call) {
      call.status = 'declined';
      call.timestamp = Date.now();
      this.persistToStorage();
      console.log('[PushDeduplicator] Call marked declined:', callId);
    }
  }

  /**
   * Mark a call as timed out
   */
  markCallTimeout(callId: string): void {
    const call = this.processedCalls.get(callId);
    if (call) {
      call.status = 'timeout';
      call.timestamp = Date.now();
      this.persistToStorage();
      console.log('[PushDeduplicator] Call marked timeout:', callId);
    }
  }

  /**
   * Mark a call as cancelled (caller hung up)
   * Called when we receive a call_cancelled push
   */
  markCallCancelled(roomId: string, callId?: string): void {
    // Add to cancelled calls set (by roomId for fast lookup)
    this.cancelledCalls.set(roomId, {
      roomId,
      callId: callId || '',
      timestamp: Date.now(),
    });

    // Also update processed call if exists
    if (callId) {
      const call = this.processedCalls.get(callId);
      if (call) {
        call.status = 'cancelled';
        call.timestamp = Date.now();
      }
    }

    this.persistToStorage();
    console.log('[PushDeduplicator] Call marked cancelled:', roomId);
  }

  /**
   * Check if a room's call was cancelled
   */
  isCallCancelled(roomId: string): boolean {
    return this.cancelledCalls.has(roomId);
  }

  /**
   * Get the status of a processed call
   */
  getCallStatus(callId: string): ProcessedCall['status'] | null {
    const call = this.processedCalls.get(callId);
    return call?.status || null;
  }

  /**
   * Get all active (non-ended) calls
   */
  getActiveCalls(): ProcessedCall[] {
    return Array.from(this.processedCalls.values()).filter(
      (call) =>
        call.status === 'received' ||
        call.status === 'shown'
    );
  }

  /**
   * Clear a specific call from tracking
   */
  clearCall(callId: string): void {
    this.processedCalls.delete(callId);
    this.persistToStorage();
  }

  /**
   * Clear all tracking data (for logout/debug)
   */
  async clearAll(): Promise<void> {
    this.processedCalls.clear();
    this.cancelledCalls.clear();
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.PROCESSED_CALLS),
      AsyncStorage.removeItem(STORAGE_KEYS.CANCELLED_CALLS),
    ]);
    console.log('[PushDeduplicator] Cleared all tracking data');
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopCleanupInterval();
  }
}

// Export singleton instance
export const pushDeduplicatorService = new PushDeduplicatorService();

export default pushDeduplicatorService;
