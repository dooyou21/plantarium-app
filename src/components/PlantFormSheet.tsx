import React, { useState, useEffect, useRef } from 'react';
import { Image, Sparkles, Sun, Wind, Check, Trash2, AlertCircle, Plus, MapPin, Search } from 'lucide-react';
import { Plant } from '../types';
import { getTodayString } from '../utils/dateUtils';
import { PLANT_PRESET_IMAGES } from '../data/initialData';
import { POPULAR_PLANTS_PRESETS, PlantPreset } from '../data/plantPresets';
import { BottomSheet } from './ui/BottomSheet';

interface Props {
  isOpen: boolean;
  plantToEdit?: Plant | null;
  locations?: string[];
  onAddLocation?: (locationName: string) => void;
  onClose: () => void;
  onSave: (plantData: Omit<Plant, 'id' | 'createdAt' | 'wateringHistory'>) => void;
  onDelete?: (plantId: string) => void;
}

export const PlantFormSheet: React.FC<Props> = ({
  isOpen,
  plantToEdit,
  locations = ['거실', '베란다'],
  onAddLocation,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [wateringCycle, setWateringCycle] = useState<number>(10);
  const [lastWateredDate, setLastWateredDate] = useState(getTodayString());
  const [lastFertilizedDate, setLastFertilizedDate] = useState('');
  const [adoptedDate, setAdoptedDate] = useState(getTodayString());
  const [location, setLocation] = useState(locations[0] || '거실');
  const [imageUrl, setImageUrl] = useState(PLANT_PRESET_IMAGES[0].url);
  const [sunlight, setSunlight] = useState<'direct' | 'indirect' | 'low'>('indirect');
  const [ventilation, setVentilation] = useState<'high' | 'normal' | 'low'>('normal');
  const [notes, setNotes] = useState('');
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAddingCustomLoc, setIsAddingCustomLoc] = useState(false);
  const [newLocInput, setNewLocInput] = useState('');

  // Autocomplete state for Species
  const [isSpeciesFocused, setIsSpeciesFocused] = useState(false);
  const [appliedPresetMessage, setAppliedPresetMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowDeleteConfirm(false);
    setIsAddingCustomLoc(false);
    setNewLocInput('');
    setAppliedPresetMessage(null);
    if (plantToEdit) {
      setName(plantToEdit.name);
      setSpecies(plantToEdit.species || '');
      setWateringCycle(plantToEdit.wateringCycle || 10);
      setLastWateredDate(plantToEdit.lastWateredDate || getTodayString());
      setLastFertilizedDate(plantToEdit.lastFertilizedDate || '');
      setAdoptedDate(plantToEdit.adoptedDate || getTodayString());
      setLocation(plantToEdit.location || locations[0] || '거실');
      setImageUrl(plantToEdit.imageUrl || PLANT_PRESET_IMAGES[0].url);
      setSunlight(plantToEdit.sunlight || 'indirect');
      setVentilation(plantToEdit.ventilation || 'normal');
      setNotes(plantToEdit.notes || '');
    } else {
      // Default reset
      setName('');
      setSpecies('');
      setWateringCycle(10);
      setLastWateredDate(getTodayString());
      setLastFertilizedDate('');
      setAdoptedDate(getTodayString());
      setLocation(locations[0] || '거실');
      setImageUrl(PLANT_PRESET_IMAGES[0].url);
      setSunlight('indirect');
      setVentilation('normal');
      setNotes('');
    }
  }, [plantToEdit, isOpen, locations]);

  // Click outside autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setIsSpeciesFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSelectPreset = (preset: typeof PLANT_PRESET_IMAGES[0]) => {
    setImageUrl(preset.url);
    if (!name) setName(preset.name.split(' (')[0]);
    if (!species) setSpecies(preset.species);
    if (!plantToEdit) setWateringCycle(preset.defaultCycle);
    if (!plantToEdit) {
      const matchingLoc = locations.find((l) => preset.location.includes(l)) || locations[0] || '거실';
      setLocation(matchingLoc);
    }
    setShowPresetPicker(false);
  };

  // Filter popular plant presets by typing query (or show all 50 if empty query)
  const filteredPopularPresets = species.trim()
    ? POPULAR_PLANTS_PRESETS.filter(
        (p) =>
          p.name.toLowerCase().includes(species.toLowerCase()) ||
          p.englishName.toLowerCase().includes(species.toLowerCase())
      )
    : POPULAR_PLANTS_PRESETS;

  // Apply preset when user selects from popular 50 plants list
  const handleSelectPopularPreset = (preset: PlantPreset) => {
    setSpecies(preset.name);
    if (!name.trim()) {
      setName(preset.name);
    }
    setWateringCycle(preset.wateringCycle);
    setSunlight(preset.sunlight);
    setVentilation(preset.ventilation);
    if (!notes.trim() && preset.summary) {
      setNotes(preset.summary);
    }
    setIsSpeciesFocused(false);
    setAppliedPresetMessage(
      `'${preset.name}' 추천 정보 적용됨: 물주기 ${preset.wateringCycle}일, ${
        preset.sunlight === 'direct' ? '양지' : preset.sunlight === 'low' ? '음지' : '반양지'
      }, 통풍 ${preset.ventilation === 'high' ? '원활' : preset.ventilation === 'low' ? '약함' : '보통'}`
    );
  };

  const handleCreateNewLocation = () => {
    const trimmed = newLocInput.trim();
    if (!trimmed) return;
    if (onAddLocation) {
      onAddLocation(trimmed);
    }
    setLocation(trimmed);
    setNewLocInput('');
    setIsAddingCustomLoc(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      species: species.trim() || name.trim(),
      wateringCycle: Math.max(1, wateringCycle),
      lastWateredDate,
      lastFertilizedDate: lastFertilizedDate ? lastFertilizedDate : undefined,
      adoptedDate,
      location: location.trim() || '거실',
      imageUrl: imageUrl || PLANT_PRESET_IMAGES[0].url,
      sunlight,
      ventilation,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const footer = (
    <div className="space-y-2.5">
      <button
        id="save-plant-submit-btn"
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="w-full py-3.5 px-4 bg-[#316E36] hover:bg-[#27592b] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm rounded-xl border border-[#27592b] transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-xs cursor-pointer"
      >
        <Check className="w-4 h-4 shrink-0" />
        <span>{plantToEdit ? '수정 완료' : '식물 등록하기'}</span>
      </button>

      {/* Delete Section in Edit Mode */}
      {plantToEdit && onDelete && (
        <div>
          {!showDeleteConfirm ? (
            <button
              id="plant-form-delete-btn"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-dashed border-rose-200 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>이 식물 삭제하기</span>
            </button>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-900 break-keep">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>정말 이 식물과 모든 성장 기록을 삭제하시겠습니까?</span>
              </div>
              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap cursor-pointer"
                >
                  취소
                </button>
                <button
                  id="confirm-delete-plant-form-btn"
                  type="button"
                  onClick={() => {
                    onDelete(plantToEdit.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                >
                  삭제 확인
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <BottomSheet
      id="plant-form-sheet"
      isOpen={isOpen}
      onClose={onClose}
      title={plantToEdit ? '식물 정보 편집' : '새 식물 등록'}
      subtitle={plantToEdit ? '설정 주기 및 생육 조건을 업데이트합니다' : '화분을 등록하고 D+일수 기록을 시작하세요'}
      maxWidth="xl"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 break-keep">
        {/* Representative Image Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 whitespace-nowrap">대표 사진</label>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              <img
                src={imageUrl}
                alt="미리보기"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Image className="w-3.5 h-3.5 shrink-0" />
                  <span>사진 업로드</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPresetPicker(!showPresetPicker)}
                  className="px-3 py-2 bg-[#316E36]/10 hover:bg-[#316E36]/20 border border-[#316E36]/20 text-[#316E36] text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>추천 프리셋</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400 break-keep leading-tight">내 앨범의 사진을 올리거나 프리셋 중에서 선택할 수 있습니다.</p>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />

          {/* Preset Gallery Accordion */}
          {showPresetPicker && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center justify-between">
                <span className="whitespace-nowrap">식물 사진 프리셋 선택</span>
                <button
                  type="button"
                  onClick={() => setShowPresetPicker(false)}
                  className="text-[11px] text-gray-400 hover:text-gray-600 whitespace-nowrap cursor-pointer"
                >
                  닫기
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {PLANT_PRESET_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all text-center group cursor-pointer"
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-12 h-12 rounded-lg object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[10px] text-gray-600 truncate w-full group-hover:text-[#316E36] font-medium">
                      {preset.name.split(' (')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 whitespace-nowrap">
              식물 이름 / 애칭 <span className="text-rose-500">*</span>
            </label>
            <input
              id="plant-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 초록이, 거실 몬스테라"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white"
            />
          </div>

          {/* Species with Auto-complete Presets */}
          <div className="relative" ref={autocompleteRef}>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 whitespace-nowrap">
              식물 품종
            </label>
            <div className="relative">
              <input
                id="plant-species-input"
                type="text"
                value={species}
                onChange={(e) => {
                  setSpecies(e.target.value);
                  setIsSpeciesFocused(true);
                }}
                onFocus={() => setIsSpeciesFocused(true)}
                placeholder="예: 몬스테라, 올리브, 여인초..."
                className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Autocomplete dropdown */}
            {isSpeciesFocused && filteredPopularPresets.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-gray-100">
                <div className="px-3.5 py-2 bg-gray-50 text-[11px] font-semibold text-gray-500 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
                  <span>추천 식물 목록 ({filteredPopularPresets.length}종)</span>
                  <span className="text-[10px] text-gray-400 font-normal">선택 시 관리 조건 자동 입력</span>
                </div>
                {filteredPopularPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPopularPreset(preset)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/70 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-[#316E36]">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate">
                          {preset.englishName}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {preset.summary}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/60 px-2 py-1 rounded-lg">
                      <span>💧 {preset.wateringCycle}일</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Notification message when preset applied */}
            {appliedPresetMessage && (
              <p className="text-[11px] text-[#316E36] font-medium mt-1.5 flex items-center gap-1 bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200/60">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{appliedPresetMessage}</span>
              </p>
            )}
          </div>
        </div>

        {/* Watering Cycle */}
        <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-sky-950 flex items-center gap-1.5 whitespace-nowrap">
              <span>💧 물주기 주기</span>
            </label>
            <span className="text-sm font-bold text-sky-700 bg-white px-2.5 py-0.5 rounded-lg border border-sky-200 whitespace-nowrap">
              {wateringCycle}일마다
            </span>
          </div>
          <input
            id="plant-watering-cycle-range"
            type="range"
            min="1"
            max="60"
            value={wateringCycle}
            onChange={(e) => setWateringCycle(parseInt(e.target.value, 10))}
            className="w-full accent-[#316E36] cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-sky-700/80 mt-1 font-medium whitespace-nowrap">
            <span>자주 (1일)</span>
            <span>일주일 (7일)</span>
            <span>2주 (14일)</span>
            <span>한달 (30일)</span>
          </div>
        </div>

        {/* Sunlight & Ventilation (Wind) Conditions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 whitespace-nowrap flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>햇빛 조건</span>
            </label>
            <select
              id="plant-sunlight-select"
              value={sunlight}
              onChange={(e) => setSunlight(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white cursor-pointer"
            >
              <option value="direct">☀️ 직사광선 (양지 - 베란다, 창가 앞)</option>
              <option value="indirect">⛅ 은은한 햇빛 (반양지 - 거실, 밝은 실내)</option>
              <option value="low">☁️ 그늘 (반음지 - 방 안, 북향, 욕실)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 whitespace-nowrap flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-sky-500" />
              <span>바람·통풍 조건</span>
            </label>
            <select
              id="plant-ventilation-select"
              value={ventilation}
              onChange={(e) => setVentilation(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white cursor-pointer"
            >
              <option value="high">🌬️ 원활한 통풍 (환기 필수, 창문가)</option>
              <option value="normal">🌿 보통 (일반적인 실내 환기)</option>
              <option value="low">🍃 약한 통풍 (실내 안쪽, 밀폐 공간)</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 whitespace-nowrap">
              마지막 물준 날
            </label>
            <input
              id="plant-last-watered-input"
              type="date"
              value={lastWateredDate}
              onChange={(e) => setLastWateredDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 whitespace-nowrap">
              마지막 영양제 준 날 (선택)
            </label>
            <input
              id="plant-last-fertilized-input"
              type="date"
              value={lastFertilizedDate}
              onChange={(e) => setLastFertilizedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 whitespace-nowrap">
              처음 데려온 날 (입양일)
            </label>
            <input
              id="plant-adopted-date-input"
              type="date"
              value={adoptedDate}
              onChange={(e) => setAdoptedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1 whitespace-nowrap">
              <MapPin className="w-3.5 h-3.5 text-[#316E36]" />
              <span>화분 위치 (장소)</span>
            </label>
            {!isAddingCustomLoc && (
              <button
                type="button"
                onClick={() => setIsAddingCustomLoc(true)}
                className="text-xs font-semibold text-[#316E36] hover:text-[#27592b] flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>새 장소 추가</span>
              </button>
            )}
          </div>

          {/* Location Options Chips */}
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => {
              const isSelected = location === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-50 border-[#316E36] text-[#316E36] shadow-2xs'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#316E36] stroke-[2.5]" />}
                  <span>{loc}</span>
                </button>
              );
            })}

            {/* If user selected a location not in preset list */}
            {location && !locations.includes(location) && (
              <button
                type="button"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 border border-[#316E36] text-[#316E36] flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-[#316E36] stroke-[2.5]" />
                <span>{location}</span>
              </button>
            )}
          </div>

          {/* Inline Add Custom Location Form */}
          {isAddingCustomLoc && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <input
                type="text"
                value={newLocInput}
                onChange={(e) => setNewLocInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateNewLocation();
                  }
                }}
                placeholder="새 장소 이름 (예: 침실, 서재, 주방 선반)"
                className="flex-1 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#316E36]"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateNewLocation}
                disabled={!newLocInput.trim()}
                className="px-3 py-1.5 bg-[#316E36] hover:bg-[#27592b] disabled:opacity-50 text-white rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                추가
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCustomLoc(false);
                  setNewLocInput('');
                }}
                className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap cursor-pointer"
              >
                취소
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 whitespace-nowrap">키우는 팁 및 메모 (선택)</label>
          <textarea
            id="plant-notes-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="예: 통풍에 신경 쓰기, 공중분무 자주 해주기"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#316E36] bg-white resize-none"
          />
        </div>
      </form>
    </BottomSheet>
  );
};
