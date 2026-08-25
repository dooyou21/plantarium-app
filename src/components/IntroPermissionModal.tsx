import React, { useState, useEffect } from 'react';
import { Leaf, User, Shield, ChevronRight, Sparkles } from 'lucide-react';
import { UserSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  settings: UserSettings;
  onComplete: (updatedSettings: Partial<UserSettings>) => void;
}

export const IntroPermissionModal: React.FC<Props> = ({
  isOpen,
  settings,
  onComplete,
}) => {
  const [userName, setUserName] = useState(settings.userName || '');

  useEffect(() => {
    if (isOpen) {
      setUserName(settings.userName || '');
    }
  }, [isOpen, settings.userName]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = userName.trim() || '초록집사';
    const now = new Date().toISOString();
    onComplete({
      userName: finalName,
      hasCompletedOnboarding: true,
      hasPhotoPermission: true,
      hasNotificationPermission: true,
      autoSaveEnabled: true,
      lastSavedAt: now,
      lastSyncedAt: now,
    });
  };

  return (
    <AnimatePresence>
      <div 
        id="intro-modal-backdrop"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white rounded-2xl border border-gray-200 overflow-hidden p-6 sm:p-8 flex flex-col text-center shadow-2xl"
        >
          {/* Logo & Brand Icon */}
          <div className="w-14 h-14 rounded-2xl bg-plant-primary border border-plant-primary-dark text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Leaf className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-black text-text-primary tracking-tight">
            반가워요, 식집사님!
          </h2>
          <p className="text-xs font-medium text-text-secondary mt-1">
            Plantarium과 함께 반려식물의 물주기와 성장을 기록해보세요.
          </p>

          {/* Nickname Input Form */}
          <form onSubmit={handleSubmit} className="my-5 text-left space-y-4">
            <div>
              <label 
                htmlFor="intro-nickname-input" 
                className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-plant-primary" />
                <span>사용하실 식집사 닉네임을 알려주세요</span>
              </label>
              <input
                id="intro-nickname-input"
                type="text"
                autoFocus
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="예: 초록집사, 베란다정원사"
                maxLength={20}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-50/80 focus:bg-white rounded-xl border border-gray-200 text-sm font-bold text-gray-900 focus:border-plant-primary focus:outline-none transition-all placeholder:font-normal placeholder:text-gray-400"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                닉네임은 언제든 상단 우측 <strong>설정(⚙️)</strong>에서 변경할 수 있습니다.
              </p>
            </div>

            {/* Feature Note */}
            <div className="p-3.5 bg-plant-bg-subtle/80 rounded-xl border border-plant-border-subtle/80 text-left">
              <div className="flex items-center gap-1.5 text-xs text-plant-primary font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>안전한 브라우저 자체 저장소</span>
              </div>
              <p className="text-[11px] text-plant-primary-dark leading-relaxed break-keep">
                별도 회원가입이나 로그인 없이 내 기기 브라우저에 실시간으로 안전하게 자동 보관됩니다.
              </p>
            </div>

            {/* Start CTA */}
            <button
              id="start-plantarium-btn"
              type="submit"
              className="w-full py-3.5 px-6 bg-plant-primary hover:bg-plant-primary-dark active:scale-[0.98] border border-plant-primary-dark text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <span>시작하기</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Privacy Note */}
          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400">
            <Shield className="w-3 h-3" />
            <span>오프라인 지원 · 로컬 데이터 완벽 보관</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

