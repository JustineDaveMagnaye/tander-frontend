/**
 * useStompConnection Hook
 * Manages STOMP WebSocket connection lifecycle
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { stompService } from '@services/websocket';
import { useAuthStore } from '@store/authStore';

interface UseStompConnectionReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<boolean>;
  disconnect: () => void;
}

export function useStompConnection(): UseStompConnectionReturn {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize STOMP service with API URL
   */
  useEffect(() => {
    // Get API URL from environment
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

    stompService.initialize({
      baseUrl: apiUrl,
      debug: __DEV__,
    });
  }, []);

  /**
   * Connect to STOMP server
   */
  const connect = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !user?.username) {
      setError('User not authenticated');
      return false;
    }

    if (isConnecting || isConnected) {
      return isConnected;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      const success = await stompService.connect(userId, user.username);
      setIsConnected(success);

      if (!success) {
        setError('Failed to connect to server');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setIsConnected(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [user?.id, user?.username, isConnecting, isConnected]);

  /**
   * Disconnect from STOMP server
   */
  const disconnect = useCallback(() => {
    stompService.disconnect();
    setIsConnected(false);
  }, []);

  /**
   * Auto-connect when authenticated
   */
  useEffect(() => {
    if (isAuthenticated && user?.id && !isConnected && !isConnecting) {
      connect();
    }

    if (!isAuthenticated && isConnected) {
      disconnect();
    }
  }, [isAuthenticated, user?.id, isConnected, isConnecting, connect, disconnect]);

  /**
   * Handle app state changes (reconnect when app comes to foreground)
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && !isConnected && !isConnecting) {
        console.log('[STOMP] App active, reconnecting...');
        connect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, isConnected, isConnecting, connect]);

  /**
   * Listen for connection status changes from service
   */
  useEffect(() => {
    const unsubscribe = stompService.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (!connected && isAuthenticated) {
        setError('Connection lost');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Don't disconnect on unmount if other components might need the connection
      // The connection will be managed by the auth state
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  };
}

export default useStompConnection;
