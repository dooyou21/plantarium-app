import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  id?: string;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
}

const MAX_WIDTH_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
  id = 'center-modal',
  closeOnBackdrop = true,
  showCloseButton = true,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll-lock to prevent underlying view or modal from scrolling
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          id={`${id}-backdrop`}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain"
          onClick={closeOnBackdrop ? onClose : undefined}
          style={{ touchAction: 'pan-y' }}
        >
          <motion.div
            id={id}
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full max-w-full ${MAX_WIDTH_MAP[maxWidth]} bg-white rounded-2xl sm:rounded-2xl border border-gray-200 shadow-2xl flex flex-col max-h-[88dvh] sm:max-h-[88vh] overflow-hidden overflow-x-hidden relative my-auto touch-pan-y`}
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: 'pan-y' }}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="px-5 py-3.5 sm:py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
                <div className="min-w-0 pr-2">
                  {typeof title === 'string' ? (
                    <h3 className="text-base font-bold text-gray-900 whitespace-nowrap truncate">{title}</h3>
                  ) : (
                    title
                  )}
                  {subtitle && (
                    typeof subtitle === 'string' ? (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
                    ) : (
                      subtitle
                    )
                  )}
                </div>

                {showCloseButton && (
                  <button
                    id={`${id}-close-btn`}
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 transition-colors shrink-0 cursor-pointer"
                    title="닫기"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Content Body */}
            <div className="flex-1 min-h-0 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden overscroll-contain">
              {children}
            </div>

            {/* Optional Fixed Footer */}
            {footer && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 shrink-0 sticky bottom-0 z-10">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
