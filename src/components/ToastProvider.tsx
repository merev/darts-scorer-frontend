// src/components/ToastProvider.tsx
import React, { createContext, useCallback, useContext, useState, PropsWithChildren } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

type ToastVariant = 'success' | 'danger' | 'warning' | 'info';

interface ToastState {
  show: boolean;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    variant: 'info',
  });

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    setToast({ show: true, message, variant });
  }, []);

  const handleClose = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* fixed to top of viewport regardless of scroll */}
      <ToastContainer
        style={{ position: 'fixed', top: 12, right: 12, zIndex: 2147483647 }}
        className="p-0"
      >
        <Toast
          bg={toast.variant}
          onClose={handleClose}
          show={toast.show}
          delay={4000}
          autohide
        >
          <Toast.Header closeButton>
            <strong className="me-auto">Darts</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
