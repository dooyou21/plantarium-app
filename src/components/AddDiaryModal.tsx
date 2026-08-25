import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image, Droplets, Sparkles, Scissors, RefreshCw, ShieldCheck, Check, Plus, X } from 'lucide-react';
import { CareLogType, DiaryEntry } from '../types';
import { getTodayString } from '../utils/dateUtils';
import { compressImage } from '../utils/imageUtils';
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
  { type: 'growth', label: '성장 기록', icon: Camera, color: 'bg-plant-bg-subtle text-plant-primary-dark border-plant-border-subtle' },
  { type: 'water', label: '물주기', icon: Droplets, color: 'bg-water-bg text-water-dark border-water-border' },
  { type: 'fertilizer', label: '영양제', icon: Sparkles, color: 'bg-amber-bg text-amber-text border-amber-border' },
  { type: 'repot', label: '분갈이', icon: RefreshCw, color: 'bg-stone-100 text-stone-700 border-stone-300' },
  { type: 'prune', label: '가지치기', icon: Scissors, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { type: 'pest', label: '해충·방제', icon: ShieldCheck, color: 'bg-danger-bg text-danger-dark border-danger-border' },
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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or initialEntry changes
  useEffect(() => {
    if (isOpen) {
      if (initialEntry) {
        const mappedType =
          initialEntry.type === 'photo' || initialEntry.type === 'memo'
            ? 'growth'
            : initialEntry.type;
        setType(mappedType);
        setTitle(initialEntry.title || '');
        setContent(initialEntry.content || '');
        setDate(initialEntry.date.slice(0, 10));
        
        // Load multiple photos or fallback to single imageUrl
        if (initialEntry.imageUrls && initialEntry.imageUrls.length > 0) {
          setImageUrls(initialEntry.imageUrls.slice(0, 3));
        } else if (initialEntry.imageUrl) {
          setImageUrls([initialEntry.imageUrl]);
        } else {
          setImageUrls([]);
        }
      } else {
        setType('growth');
        setTitle('');
        setContent('');
        setDate(getTodayString());
        setImageUrls([]);
      }
    }
  }, [isOpen, initialEntry]);

  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const availableSlots = 3 - imageUrls.length;
    const filesToProcess = (Array.from(files) as File[]).slice(0, availableSlots);

    try {
      const compressedList: string[] = [];
      for (const file of filesToProcess) {
        const compressed = await compressImage(file, 900, 900, 0.78);
        compressedList.push(compressed);
      }
      setImageUrls((prev) => [...prev, ...compressedList].slice(0, 3));
    } catch (err) {
      console.error('Failed to compress diary images', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim() && imageUrls.length === 0) return;

    const primaryImage = imageUrls[0] || undefined;
    const finalImageUrls = imageUrls.length > 0 ? imageUrls : undefined;

    if (isEditing && initialEntry && onUpdate) {
      onUpdate({
        ...initialEntry,
        date,
        type,
        title: title.trim() || undefined,
        content: content.trim(),
        imageUrl: primaryImage,
        imageUrls: finalImageUrls,
      });
    } else {
      onSave({
        plantId,
        date,
        type,
        title: title.trim() || undefined,
        content: content.trim(),
        imageUrl: primaryImage,
        imageUrls: finalImageUrls,
      });
    }

    onClose();
  };

  const isSubmitDisabled = !content.trim() && !title.trim() && imageUrls.length === 0;

  const footer = (
    <button
      id="save-diary-submit-btn"
      type="button"
      onClick={handleSubmit}
      disabled={isSubmitDisabled}
      className="w-full py-3.5 px-4 bg-plant-primary hover:bg-plant-primary-dark active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm rounded-xl border border-plant-primary-dark transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-xs cursor-pointer"
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
          <div className="grid grid-cols-3 gap-1.5">
            {CARE_TYPES.map((item) => {
              const Icon = item.icon;
              const isSelected = type === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setType(item.type)}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-plant-primary bg-plant-primary/10 text-plant-primary shadow-2xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
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
            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
          />
        </div>

        {/* Photo Upload Area - Up to 3 photos */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">
              사진 첨부 (최대 3장)
            </label>
            {imageUrls.length > 0 && (
              <span className="text-[11px] font-semibold text-plant-primary-dark bg-plant-bg-subtle px-2 py-0.5 rounded-md border border-plant-border-subtle">
                {imageUrls.length}/3
              </span>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageFiles}
          />

          {imageUrls.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-square group">
                    <img
                      src={url}
                      alt={`기록 사진 ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/35 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer shadow-xs"
                      title="사진 삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {imageUrls.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="border-2 border-dashed border-gray-200 hover:border-plant-primary rounded-xl bg-gray-50/60 hover:bg-gray-100/80 flex items-center justify-center text-gray-400 hover:text-plant-primary transition-colors aspect-square cursor-pointer"
                    title="사진 추가"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-4 border-2 border-dashed border-gray-200 hover:border-plant-primary rounded-xl bg-gray-50/60 hover:bg-gray-50 flex items-center justify-center gap-2 text-gray-400 hover:text-plant-primary transition-colors cursor-pointer"
            >
              <Image className="w-5 h-5" />
              <span className="text-xs font-medium text-gray-600 hover:text-plant-primary">사진 추가</span>
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
            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
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
            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-gray-200 text-sm bg-white resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};
