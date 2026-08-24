import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface BottomSheetProps {
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

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'xl',
  id = 'bottom-sheet',
  closeOnBackdrop = true,
  showCloseButton = true,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background page from scrolling during open sheet
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

  const sheetContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          id={`${id}-backdrop`}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto overscroll-contain"
          onClick={closeOnBackdrop ? onClose : undefined}
        >
          <motion.div
            id={id}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={`w-full ${MAX_WIDTH_MAP[maxWidth]} bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden relative my-0 sm:my-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
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
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {children}
            </div>

            {/* Optional Fixed Footer */}
            {footer && (
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 shrink-0 sticky bottom-0 z-10">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(sheetContent, document.body);
};
