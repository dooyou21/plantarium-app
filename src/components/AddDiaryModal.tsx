import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image, Droplets, Sparkles, Scissors, RefreshCw, ShieldCheck, Check } from 'lucide-react';
import { CareLogType, DiaryEntry } from '../types';
import { getTodayString } from '../utils/dateUtils';
import { Modal } from './ui/Modal';

interface Props {
  isOpen: boolean;
  plantId: string;
  plantName: string;
  initialEntry?: DiaryEntry | null;
  onClose: () => void;
  onSave: (entry: Omit<DiaryEntry, 'id'>) => void;
  onUpdate?: (entry: DiaryEntry) => void;
}

const CARE_TYPES: { type: CareLogType; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
  { type: 'growth', label: '성장 기록', icon: Camera, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { type: 'water', label: '물주기', icon: Droplets, color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { type: 'fertilizer', label: '영양제', icon: Sparkles, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'repot', label: '분갈이', icon: RefreshCw, color: 'bg-stone-100 text-stone-700 border-stone-300' },
  { type: 'prune', label: '가지치기', icon: Scissors, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { type: 'pest', label: '해충·방제', icon: ShieldCheck, color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const AddDiaryModal: React.FC<Props> = ({
  isOpen,
  plantId,
  plantName,
  initialEntry,
  onClose,
  onSave,
  onUpdate,
}) => {
  const isEditing = !!initialEntry;

  const [type, setType] = useState<CareLogType>('growth');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or initialEntry changes
  useEffect(() => {
    if (isOpen) {
      if (initialEntry) {
        // Map legacy 'photo' or 'memo' to 'growth' if needed
        const mappedType =
          initialEntry.type === 'photo' || initialEntry.type === 'memo'
            ? 'growth'
            : initialEntry.type;
        setType(mappedType);
        setTitle(initialEntry.title || '');
        setContent(initialEntry.content || '');
        setDate(initialEntry.date.slice(0, 10));
        setImageUrl(initialEntry.imageUrl || '');
      } else {
        setType('growth');
        setTitle('');
        setContent('');
        setDate(getTodayString());
        setImageUrl('');
      }
    }
  }, [isOpen, initialEntry]);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim() && !imageUrl) return;

    if (isEditing && initialEntry && onUpdate) {
      onUpdate({
        ...initialEntry,
        date,
        type,
        title: title.trim() || undefined,
        content: content.trim(),
        imageUrl: imageUrl || undefined,
      });
    } else {
      onSave({
        plantId,
        date,
        type,
        title: title.trim() || undefined,
        content: content.trim(),
        imageUrl: imageUrl || undefined,
      });
    }

    onClose();
  };

  const isSubmitDisabled = !content.trim() && !title.trim() && !imageUrl;

  const footer = (
    <button
      id="save-diary-submit-btn"
      type="button"
      onClick={handleSubmit}
      disabled={isSubmitDisabled}
      className="w-full py-3.5 px-4 bg-[#316E36] hover:bg-[#27592b] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm rounded-xl border border-[#27592b] transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-xs cursor-pointer"
    >
      <Check className="w-4 h-4 shrink-0" />
      <span>{isEditing ? '기록 수정 완료' : '기록 저장하기'}</span>
    </button>
  );

  return (
    <Modal
      id="add-diary-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '성장 기록 수정' : '성장 기록'}
      subtitle={plantName}
      maxWidth="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 break-keep">
        {/* Care Type Selection (3 items x 2 rows) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 whitespace-nowrap">기록 유형 선택</label>
          <div className="grid grid-cols-3 gap-2">
            {CARE_TYPES.map((item) => {
              const Icon = item.icon;
              const isSelected = type === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setType(item.type)}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#316E36] bg-[#316E36]/10 text-[#316E36] font-bold shadow-2xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 whitespace-nowrap">기록 날짜</label>
          <input
            id="diary-date-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white"
          />
        </div>

        {/* Photo Upload Area */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 whitespace-nowrap">사진 첨부 (선택)</label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />
          {imageUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 max-h-52">
              <img
                src={imageUrl}
                alt="기록 사진"
                className="w-full h-40 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  변경
                </button>
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 sm:py-4 border border-dashed border-gray-300 hover:border-[#316E36] rounded-xl bg-gray-50/60 hover:bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-[#316E36] transition-colors cursor-pointer"
            >
              <Image className="w-5 h-5 text-gray-400" />
              <span className="text-xs font-medium whitespace-nowrap">사진을 선택하거나 촬영하세요</span>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">JPG, PNG, WEBP 지원</span>
            </button>
          )}
        </div>

        {/* Title / Summary */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 whitespace-nowrap">제목 (선택)</label>
          <input
            id="diary-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 새 잎 돋음, 영양제 투여 완료"
            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white"
          />
        </div>

        {/* Content Memo */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 whitespace-nowrap">관찰 내용 및 메모</label>
          <textarea
            id="diary-content-input"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="식물의 상태, 물 준 양, 특이사항을 자유롭게 남겨보세요..."
            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};
