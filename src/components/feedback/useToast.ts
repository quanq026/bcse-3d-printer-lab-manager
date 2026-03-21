import { useCallback, useState } from 'react';

export type ToastTone = 'success' | 'error';

export interface ToastState {
  id: number;
  tone: ToastTone;
  message: string;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback((tone: ToastTone, message: string) => {
    setToast({
      id: Date.now(),
      tone,
      message,
    });
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast('success', message);
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast('error', message);
  }, [showToast]);

  return {
    toast,
    dismissToast,
    showSuccess,
    showError,
  };
}
