'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import Toast from '../ui/Toast';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type BaseToastOptions = {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClear?: () => void;
};

type UndoToastOptions = BaseToastOptions & {
  actionLabel: string;
  onAction: () => void | Promise<void>;
};

type ToastState =
  | (BaseToastOptions & {
      actionLabel?: string;
      onAction?: () => void | Promise<void>;
    })
  | null;

type UndoToastContextValue = {
  showToast: (options: BaseToastOptions) => void;
  showUndoToast: (options: UndoToastOptions) => void;
  clearToast: () => void;
};

const UndoToastContext = createContext<UndoToastContextValue | null>(null);

export function UndoToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);

  const clearToast = useCallback(() => {
    setToast((prev) => {
      prev?.onClear?.();
      return null;
    });
  }, []);

  const showToast = useCallback((options: BaseToastOptions) => {
    setToast((prev) => {
      prev?.onClear?.();
      return options;
    });
  }, []);

  const showUndoToast = useCallback((options: UndoToastOptions) => {
    setToast((prev) => {
      prev?.onClear?.();
      return options;
    });
  }, []);

  const handleAction = useCallback(() => {
    if (!toast?.onAction) return;
    try {
      const result = toast.onAction();
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        void (result as Promise<unknown>).catch((error) => {
          console.error('Undo toast action failed', error);
        });
      }
    } catch (error) {
      console.error('Undo toast action failed', error);
    }
  }, [toast]);

  const contextValue = useMemo<UndoToastContextValue>(
    () => ({
      showToast,
      showUndoToast,
      clearToast,
    }),
    [showToast, showUndoToast, clearToast],
  );

  return (
    <UndoToastContext.Provider value={contextValue}>
      {children}
      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        actionLabel={toast?.actionLabel}
        onAction={toast?.onAction ? handleAction : undefined}
        onClear={clearToast}
        duration={toast?.duration}
      />
    </UndoToastContext.Provider>
  );
}

export function useUndoToast() {
  const context = useContext(UndoToastContext);
  if (!context) {
    throw new Error('useUndoToast must be used within an UndoToastProvider');
  }
  return context;
}
