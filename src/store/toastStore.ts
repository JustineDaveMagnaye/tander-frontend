/**
 * Toast Store
 * Zustand store for managing toast notifications throughout the app
 * Replaces Alert.alert with a more user-friendly toast system
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastState {
  toasts: ToastConfig[];
  showToast: (config: Omit<ToastConfig, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

// ============================================================================
// Store
// ============================================================================

let toastIdCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: (config) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    const newToast: ToastConfig = {
      ...config,
      id,
      duration: config.duration ?? 3500, // Default 3.5 seconds
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, newToast.duration);
    }
  },

  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },
}));

// ============================================================================
// Convenience Functions (can be used without hooks)
// ============================================================================

export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().showToast({ type: 'success', title, message, duration });
  },
  error: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().showToast({ type: 'error', title, message, duration });
  },
  warning: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().showToast({ type: 'warning', title, message, duration });
  },
  info: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().showToast({ type: 'info', title, message, duration });
  },
  show: (config: Omit<ToastConfig, 'id'>) => {
    useToastStore.getState().showToast(config);
  },
  hide: (id: string) => {
    useToastStore.getState().hideToast(id);
  },
  clearAll: () => {
    useToastStore.getState().clearAllToasts();
  },
};

export default useToastStore;
