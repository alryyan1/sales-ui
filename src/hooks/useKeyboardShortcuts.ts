// src/hooks/useKeyboardShortcuts.ts
import { useEffect, useState } from 'react';

interface UseKeyboardShortcutsProps {
  onOpenPaymentDialog: () => void;
  paymentDialogOpen: boolean;
}

export const useKeyboardShortcuts = ({
  onOpenPaymentDialog,
  paymentDialogOpen,
}: UseKeyboardShortcutsProps) => {
  const [paymentSubmitTrigger, setPaymentSubmitTrigger] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const inFormField = ['input', 'textarea', 'select'].includes(activeTag);

      if (e.key === 'Enter') {
        if (!paymentDialogOpen) {
          if (!inFormField) {
            onOpenPaymentDialog();
            e.preventDefault();
          }
        } else {
          setPaymentSubmitTrigger((v) => v + 1);
          e.preventDefault();
        }
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paymentDialogOpen, onOpenPaymentDialog]);

  return { paymentSubmitTrigger };
};


