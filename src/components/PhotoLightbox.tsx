import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  imageUrl: string | null;
  caption?: string;
  date?: string;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<Props> = ({
  isOpen,
  imageUrl,
  caption,
  date,
  onClose,
}) => {
  // Prevent background scrolling while lightbox is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && imageUrl && (
        <motion.div
          key="photo-lightbox-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          id="photo-lightbox-backdrop"
          className="fixed inset-0 z-[9999] w-screen h-[100dvh] bg-black/95 flex flex-col justify-between p-4 sm:p-6 select-none touch-none overscroll-none"
          onClick={onClose}
        >
          {/* Top Bar */}
          <div
            className="w-full max-w-3xl mx-auto flex items-center justify-between text-white/90 shrink-0 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-xs font-medium min-w-0">
              {date && (
                <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg border border-white/10 truncate">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{date}</span>
                </span>
              )}
            </div>
            <button
              id="close-lightbox-btn"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white border border-white/15 transition-all ml-2"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered Image Viewport */}
          <div
            className="flex-1 w-full min-h-0 flex items-center justify-center my-2 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
            >
              <img
                src={imageUrl}
                alt={caption || '식물 사진'}
                className="max-h-[calc(100dvh-140px)] max-w-[95vw] sm:max-w-2xl w-auto h-auto object-contain rounded-xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>

          {/* Bottom Caption Bar */}
          <div
            className="w-full max-w-3xl mx-auto text-center shrink-0 z-10 min-h-[36px] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {caption && (
              <p className="bg-black/60 border border-white/15 text-white/90 text-xs sm:text-sm font-medium px-4 py-2 rounded-xl backdrop-blur-md max-w-[90vw] truncate">
                {caption}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

