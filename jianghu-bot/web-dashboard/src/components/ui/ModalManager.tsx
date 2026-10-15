'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface ModalStackEntry {
  id: string;
  onClose?: () => void;
}

interface ModalStackContextValue {
  register: (id: string, onClose?: () => void) => void;
  unregister: (id: string) => void;
  isTopModal: (id: string) => boolean;
  getZIndex: (id: string) => number;
  getBackdropZIndex: (id: string) => number;
  stackSize: number;
}

const ModalStackContext = createContext<ModalStackContextValue>({
  register: () => {},
  unregister: () => {},
  isTopModal: () => false,
  getZIndex: () => 60,
  getBackdropZIndex: () => 50,
  stackSize: 0,
});

export function ModalStackProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<ModalStackEntry[]>([]);
  const stackRef = useRef<ModalStackEntry[]>([]);
  stackRef.current = stack;

  const register = useCallback((id: string, onClose?: () => void) => {
    setStack((prev) => {
      const filtered = prev.filter((entry) => entry.id !== id);
      return [...filtered, { id, onClose }];
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setStack((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const isTopModal = useCallback((id: string) => {
    const current = stackRef.current;
    if (current.length === 0) return false;
    return current[current.length - 1].id === id;
  }, []);

  const getZIndex = useCallback((id: string) => {
    const current = stackRef.current;
    const index = current.findIndex((entry) => entry.id === id);
    if (index === -1) return 60; // base --z-modal
    return 60 + index * 2;
  }, []);

  const getBackdropZIndex = useCallback((id: string) => {
    const current = stackRef.current;
    const index = current.findIndex((entry) => entry.id === id);
    if (index === -1) return 50; // base --z-modal-backdrop
    return 50 + index * 2;
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (stack.length > 0) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [stack.length]);

  // Escape key handler: only closes topmost modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stackRef.current.length > 0) {
        const top = stackRef.current[stackRef.current.length - 1];
        if (top && typeof top.onClose === 'function') {
          e.preventDefault();
          e.stopPropagation();
          top.onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ModalStackContext.Provider
      value={{
        register,
        unregister,
        isTopModal,
        getZIndex,
        getBackdropZIndex,
        stackSize: stack.length,
      }}
    >
      {children}
    </ModalStackContext.Provider>
  );
}

export function useModalStack(modalId: string, isOpen: boolean, onClose?: () => void) {
  const ctx = useContext(ModalStackContext);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      ctx.register(modalId, () => {
        if (onCloseRef.current) onCloseRef.current();
      });
    } else {
      ctx.unregister(modalId);
    }
    return () => {
      ctx.unregister(modalId);
    };
  }, [isOpen, modalId, ctx]);

  return {
    isTopModal: ctx.isTopModal(modalId),
    zIndex: ctx.getZIndex(modalId),
    backdropZIndex: ctx.getBackdropZIndex(modalId),
    stackSize: ctx.stackSize,
  };
}
