import React, { useState } from 'react';
import { 
  X, ChevronLeft, Droplets, Sparkles, Plus, Calendar, MapPin, Sun, 
  Trash2, Edit3, Image as ImageIcon, BookOpen, Clock, AlertCircle, 
  CheckCircle2, Share2, Tag
} from 'lucide-react';
import { Plant, DiaryEntry } from '../types';
import { 
  getDaysSinceWatered, getDaysTogether, formatKoreanDate, 
  getUrgencyRatio, formatFullDate 
} from '../utils/dateUtils';
import { WaterIntervalChart } from './WaterIntervalChart';
import { AddDiaryModal } from './AddDiaryModal';
import { PhotoLightbox } from './PhotoLightbox';
import confetti from 'canvas-confetti';

interface Props {
  plant: Plant | null;
  diaries: DiaryEntry[];
  isOpen: boolean;
  onClose: () => void;
  onWater: (plantId: string) => void;
  onFertilize: (plantId: string) => void;
  onEditPlant: (plant: Plant) => void;
  onAddDiary: (entry: Omit<DiaryEntry, 'id'>) => void;
  onUpdateDiary: (entry: DiaryEntry) => void;
  onDeleteDiary: (diaryId: string) => void;
}

export const PlantDetailModal: React.FC<Props> = ({
  plant,
  diaries,
  isOpen,
  onClose,
  onWater,
  onFertilize,
  onEditPlant,
  onAddDiary,
  onUpdateDiary,
  onDeleteDiary,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'album' | 'info'>('timeline');
  const [isAddDiaryOpen, setIsAddDiaryOpen] = useState(false);
  const [editingDiary, setEditingDiary] = useState<DiaryEntry | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; caption?: string; date?: string } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !plant) return null;

  const daysSinceWater = getDaysSinceWatered(plant.lastWateredDate);
  const daysTogether = getDaysTogether(plant.adoptedDate);
  const urgency = getUrgencyRatio(plant.lastWateredDate, plant.wateringCycle);
  const plantDiaries = diaries
    .filter((d) => d.plantId === plant.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate days elapsed since last fertilization based on latest diary or plant field
  const fertilizerDiaries = plantDiaries.filter((d) => d.type === 'fertilizer');
  const latestFertilizeDate = fertilizerDiaries.length > 0
    ? fertilizerDiaries[0].date
    : plant.lastFertilizedDate || null;
  const daysSinceFertilize = latestFertilizeDate ? getDaysSinceWatered(latestFertilizeDate) : null;

  // Filter photos for Album tab (supports both single imageUrl and multiple imageUrls)
  const albumPhotos = plantDiaries.flatMap((d) => {
    const photos: string[] = d.imageUrls && d.imageUrls.length > 0
      ? d.imageUrls
      : d.imageUrl
      ? [d.imageUrl]
      : [];
    
    return photos.map((url, idx) => ({
      id: `${d.id}-${idx}`,
      url,
      title: d.title || d.content || `성장 사진 ${idx + 1}`,
      date: formatKoreanDate(d.date),
      daysSinceAdopted: d.daysSinceAdopted,
    }));
  });

  const handleWaterClick = () => {
    // Water drop celebratory confetti
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#38BDF8', '#0284C7', '#316E36', '#A7F3D0'],
    });
    onWater(plant.id);
  };

  const handleFertilizeClick = () => {
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#F59E0B', '#FBBF24', '#316E36'],
    });
    onFertilize(plant.id);
  };

  const getUrgencyColor = () => {
    if (urgency >= 1.0) return 'text-danger-primary bg-danger-bg border-danger-border';
    if (urgency >= 0.8) return 'text-amber-text bg-amber-bg border-amber-border';
    return 'text-plant-primary bg-plant-bg-subtle border-plant-border-subtle';
  };

  const getLogTypeBadge = (type: DiaryEntry['type']) => {
    switch (type) {
      case 'water':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-water-bg text-water-dark border border-water-border">💧 물주기</span>;
      case 'fertilizer':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-bg text-amber-text border border-amber-border">💊 영양제</span>;
      case 'repot':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-stone-100 text-stone-700 border border-stone-300">🪴 분갈이</span>;
      case 'prune':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">✂️ 가지치기</span>;
      case 'pest':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-danger-bg text-danger-dark border border-danger-border">🛡️ 해충·방제</span>;
      case 'growth':
      case 'photo':
      case 'memo':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-plant-bg-subtle text-plant-primary-dark border border-plant-border-subtle">🌱 성장 기록</span>;
    }
  };

  const getTimelineNodeDot = (type: DiaryEntry['type']) => {
    switch (type) {
      case 'water':
        return <div className="w-3 h-3 rounded-full bg-water-primary ring-4 ring-system-bg shrink-0" />;
      case 'fertilizer':
        return <div className="w-3 h-3 rounded-full bg-amber-primary ring-4 ring-system-bg shrink-0" />;
      case 'repot':
        return <div className="w-3 h-3 rounded-full bg-plant-primary ring-4 ring-system-bg shrink-0" />;
      case 'prune':
        return <div className="w-3 h-3 rounded-full bg-purple-500 ring-4 ring-system-bg shrink-0" />;
      case 'pest':
        return <div className="w-3 h-3 rounded-full bg-danger-primary ring-4 ring-system-bg shrink-0" />;
      case 'growth':
      case 'photo':
      case 'memo':
      default:
        return <div className="w-3 h-3 rounded-full bg-plant-primary ring-4 ring-system-bg shrink-0" />;
    }
  };

  return (
    <div id="plant-detail-modal" className="fixed inset-0 z-40 bg-system-bg flex justify-center overflow-y-auto">
      <div className="min-h-full w-full max-w-2xl bg-system-bg flex flex-col border-x border-border-default relative">
        {/* Navigation Bar */}
        <div className="sticky top-0 z-30 bg-surface-card border-b border-border-default px-4 py-3 flex items-center justify-between">
          <button
            id="back-to-dashboard-btn"
            onClick={onClose}
            className="flex items-center gap-1 text-plant-primary font-semibold text-sm hover:opacity-80 transition-opacity cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>식물 목록</span>
          </button>
          <span className="text-xs font-semibold text-text-primary truncate max-w-[180px]">
            {plant.name}
          </span>
          <div className="w-16" aria-hidden="true" />
        </div>

        {/* Hero Section */}
        <div className="relative bg-white px-5 pt-4 pb-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            {/* Plant Image Avatar */}
            <div 
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 cursor-pointer group"
              onClick={() => setSelectedPhoto({ url: plant.imageUrl, caption: plant.name, date: formatKoreanDate(plant.lastWateredDate) })}
            >
              <img
                src={plant.imageUrl}
                alt={plant.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <ImageIcon className="w-5 h-5" />
              </div>
            </div>

            {/* Title & Core Metrics */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    {plant.name}
                  </h2>
                  <span className="text-xs text-gray-400 italic">
                    {plant.species}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {plant.location}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    함께한 지 <strong>{daysTogether}일째</strong>
                  </span>
                </div>
              </div>

              {/* Status Chips Row with Unified Height and Format (No icons) */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                {/* 1. Water status chip */}
                <div className={`h-6.5 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 shrink-0 ${getUrgencyColor()}`}>
                  <span>물 <strong>D+{daysSinceWater}</strong></span>
                  {daysSinceWater > 0 && (
                    <span className="text-[10px] font-normal opacity-85">({daysSinceWater}일 전)</span>
                  )}
                </div>

                {/* 2. Fertilizer status chip */}
                {daysSinceFertilize !== null ? (
                  <div className="h-6.5 px-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-1 shrink-0 shadow-2xs">
                    <span>영양제 <strong>D+{daysSinceFertilize}</strong></span>
                    {daysSinceFertilize > 0 && (
                      <span className="text-[10px] text-amber-700/80 font-normal">({daysSinceFertilize}일 전)</span>
                    )}
                  </div>
                ) : (
                  <div className="h-6.5 px-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 text-[11px] font-medium flex items-center shrink-0">
                    <span>영양제 미기록</span>
                  </div>
                )}

                {/* 3. Watering cycle chip */}
                <div className="h-6.5 px-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-semibold flex items-center shrink-0">
                  <span>💧 {plant.wateringCycle}일 주기</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <button
              id="detail-water-btn"
              onClick={handleWaterClick}
              className="py-2.5 px-2 sm:px-4 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] border border-sky-600 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shadow-2xs"
              title="물 줬어요 (D+0)"
            >
              <Droplets className="w-4 h-4 text-white shrink-0 stroke-[2.2]" />
              <span className="hidden sm:inline">물 줬어요</span>
              <span className="sm:hidden">물주기</span>
            </button>

            <button
              id="detail-fertilize-btn"
              onClick={handleFertilizeClick}
              className="py-2.5 px-2 sm:px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] border border-amber-600 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shadow-2xs"
              title="영양제 줬어요"
            >
              <Sparkles className="w-4 h-4 text-white shrink-0 stroke-[2.2]" />
              <span className="hidden sm:inline">영양제 줬어요</span>
              <span className="sm:hidden">영양제</span>
            </button>

            <button
              id="detail-add-diary-btn"
              onClick={() => {
                setEditingDiary(null);
                setIsAddDiaryOpen(true);
              }}
              className="py-2.5 px-2 sm:px-4 bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98] text-gray-800 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shadow-2xs"
              title="성장 기록"
            >
              <Plus className="w-4 h-4 text-plant-primary shrink-0 stroke-[2.2]" />
              <span className="hidden sm:inline">성장 기록</span>
              <span className="sm:hidden">성장 기록</span>
            </button>
          </div>
        </div>

        {/* Data Insight Section (Watering Intervals Chart) */}
        <div className="p-4 bg-white mt-2 border-y border-gray-200">
          <WaterIntervalChart
            wateringHistory={plant.wateringHistory || [plant.lastWateredDate]}
            targetCycle={plant.wateringCycle}
          />
        </div>

        {/* Segmented Tab Navigation */}
        <div className="px-4 pt-4 pb-2">
          <div className="bg-gray-100 border border-gray-200 p-1 rounded-xl flex text-xs font-semibold text-gray-600">
            <button
              id="tab-timeline-btn"
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'timeline'
                  ? 'bg-white border border-gray-200 text-gray-900 font-bold'
                  : 'hover:text-gray-900 border border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">성장 기록</span>
              <span className="sm:hidden">기록</span>
              <span>({plantDiaries.length})</span>
            </button>
            <button
              id="tab-album-btn"
              onClick={() => setActiveTab('album')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'album'
                  ? 'bg-white border border-gray-200 text-gray-900 font-bold'
                  : 'hover:text-gray-900 border border-transparent'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">사진 앨범</span>
              <span className="sm:hidden">앨범</span>
              <span>({albumPhotos.length})</span>
            </button>
            <button
              id="tab-info-btn"
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'info'
                  ? 'bg-white border border-gray-200 text-gray-900 font-bold'
                  : 'hover:text-gray-900 border border-transparent'
              }`}
            >
              <Sun className="w-3.5 h-3.5 shrink-0" />
              <span>식물 정보</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 flex-1">
          {/* TAB 1: Growth Diary Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {plantDiaries.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white rounded-xl border border-gray-200">
                  <div className="w-12 h-12 rounded-xl bg-plant-bg-subtle border border-plant-border-subtle text-plant-primary flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 mb-1">첫 성장 기록을 남겨보세요</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
                    물 주기, 영양제 투여, 새 잎이 돋은 순간을 사진과 함께 아카이빙할 수 있습니다.
                  </p>
                  <button
                    onClick={() => setIsAddDiaryOpen(true)}
                    className="px-4 py-2 bg-plant-primary hover:bg-plant-primary-dark border border-plant-primary-dark text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    성장 기록 남기기
                  </button>
                </div>
              ) : (
                <div className="relative pl-7 sm:pl-8 space-y-3.5">
                  {/* Clean Timeline Spine Line */}
                  <div className="absolute left-[9px] top-4 bottom-4 w-[2px] bg-gray-200" />

                  {plantDiaries.map((entry) => {
                    return (
                      <div key={entry.id} className="relative group">
                        {/* Node Dot on Spine */}
                        <div className="absolute -left-[24px] sm:-left-[28px] top-4 z-10">
                          {getTimelineNodeDot(entry.type)}
                        </div>

                        {/* Clean Solid Card */}
                        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-gray-200 hover:border-gray-300 transition-all">
                          {/* Header: Badge, Date, D-day */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getLogTypeBadge(entry.type)}
                              <span className="text-xs font-bold text-gray-800">
                                {formatKoreanDate(entry.date)}
                              </span>
                              {entry.daysSinceAdopted !== undefined && (
                                <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-md font-medium">
                                  함께한 지 {entry.daysSinceAdopted}일째
                                </span>
                              )}
                            </div>

                            {/* Action buttons (Edit, Delete) */}
                            <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDiary(entry);
                                  setIsAddDiaryOpen(true);
                                }}
                                className="text-gray-400 hover:text-plant-primary hover:bg-plant-bg-subtle p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="기록 수정"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteDiary(entry.id)}
                                className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="기록 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          {entry.title && (
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 leading-snug">
                              {entry.title}
                            </h4>
                          )}

                          {/* Content text */}
                          {entry.content && (
                            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line break-keep mb-1.5">
                              {entry.content}
                            </p>
                          )}

                          {/* Attached Photos (Supports 1 to 3 photos) */}
                          {(() => {
                            const entryPhotos = entry.imageUrls && entry.imageUrls.length > 0
                              ? entry.imageUrls
                              : entry.imageUrl
                              ? [entry.imageUrl]
                              : [];

                            if (entryPhotos.length === 0) return null;

                            if (entryPhotos.length === 1) {
                              return (
                                <div
                                  className="mt-2 rounded-xl overflow-hidden max-h-56 bg-gray-100 border border-gray-200 cursor-pointer group/photo relative"
                                  onClick={() =>
                                    setSelectedPhoto({
                                      url: entryPhotos[0],
                                      caption: entry.title || entry.content,
                                      date: formatKoreanDate(entry.date),
                                    })
                                  }
                                >
                                  <img
                                    src={entryPhotos[0]}
                                    alt={entry.title || '성장 사진'}
                                    className="w-full h-44 sm:h-52 object-cover group-hover/photo:scale-102 transition-transform duration-200"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="bg-black/60 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                      <ImageIcon className="w-3.5 h-3.5" />
                                      <span>사진 확대</span>
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className={`mt-2 grid gap-1.5 ${entryPhotos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                {entryPhotos.map((photoUrl, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="relative rounded-xl overflow-hidden aspect-square bg-gray-100 border border-gray-200 cursor-pointer group/photo"
                                    onClick={() =>
                                      setSelectedPhoto({
                                        url: photoUrl,
                                        caption: `${entry.title || entry.content || '성장 기록'} (${pIdx + 1}/${entryPhotos.length})`,
                                        date: formatKoreanDate(entry.date),
                                      })
                                    }
                                  >
                                    <img
                                      src={photoUrl}
                                      alt={`성장 사진 ${pIdx + 1}`}
                                      className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-200"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="bg-black/70 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Photo Album Grid */}
          {activeTab === 'album' && (
            <div>
              {albumPhotos.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white rounded-xl border border-gray-200">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 mb-1">등록된 사진이 없습니다</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
                    성장 기록을 작성할 때 사진을 첨부하면 여기에 앨범으로 모아볼 수 있습니다.
                  </p>
                  <button
                    onClick={() => setIsAddDiaryOpen(true)}
                    className="px-4 py-2 bg-plant-primary hover:bg-plant-primary-dark border border-plant-primary-dark text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    성장 기록 남기기
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {albumPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhoto({ url: photo.url, caption: photo.title, date: photo.date })}
                      className="group relative rounded-xl overflow-hidden aspect-square bg-gray-100 border border-gray-200 cursor-pointer"
                    >
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 text-white">
                        <p className="text-xs font-semibold truncate">{photo.title}</p>
                        <p className="text-[10px] text-gray-300">{photo.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Plant Information & Specs */}
          {activeTab === 'info' && (
            <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">기본 관리 정보</h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block mb-1">설정 급수 주기</span>
                  <span className="font-bold text-gray-900 text-sm">💧 {plant.wateringCycle}일 주기</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block mb-1">햇빛 요구량</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {plant.sunlight === 'direct' ? '☀️ 양지 (직사광선)' : plant.sunlight === 'low' ? '☁️ 반음지 (그늘)' : '⛅ 반양지 (은은한 빛)'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block mb-1">바람·통풍 조건</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {plant.ventilation === 'high' ? '🌬️ 원활한 통풍 (환기 필수)' : plant.ventilation === 'low' ? '🍃 약한 통풍 (실내 안쪽)' : '🌿 보통 (일반 실내 환기)'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block mb-1">화분 위치</span>
                  <span className="font-bold text-gray-900 text-sm">📍 {plant.location}</span>
                </div>

                <div className="col-span-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block mb-1">처음 데려온 날</span>
                  <span className="font-bold text-gray-900 text-sm">{formatFullDate(plant.adoptedDate)}</span>
                </div>
              </div>

              {plant.notes && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 block mb-1.5">관리 팁 및 메모</span>
                  <p className="text-xs text-gray-700 bg-plant-bg-subtle/50 border border-plant-border-subtle p-3 rounded-xl leading-relaxed whitespace-pre-line">
                    {plant.notes}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => onEditPlant(plant)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-plant-primary bg-plant-primary/10 hover:bg-plant-primary/20 border border-plant-primary/20 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>정보 수정하기</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lightbox for Zooming Photos */}
        <PhotoLightbox
          isOpen={!!selectedPhoto}
          imageUrl={selectedPhoto?.url || null}
          caption={selectedPhoto?.caption}
          date={selectedPhoto?.date}
          onClose={() => setSelectedPhoto(null)}
        />

        {/* Add / Edit Diary Sheet Modal */}
        <AddDiaryModal
          isOpen={isAddDiaryOpen}
          plantId={plant.id}
          plantName={plant.name}
          initialEntry={editingDiary}
          onClose={() => {
            setIsAddDiaryOpen(false);
            setEditingDiary(null);
          }}
          onSave={onAddDiary}
          onUpdate={onUpdateDiary}
        />
      </div>
    </div>
  );
};
