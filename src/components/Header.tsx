import React, { useState } from 'react';
import { Plus, Settings, Search, Sparkles, Droplets, MapPin, Check, X, Lightbulb, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { SortOption, FilterOption, UserSettings, Plant } from '../types';
import { GardeningTip, getRandomTip, GARDENING_TIPS } from '../data/gardeningTips';

interface Props {
  totalPlants: number;
  needWaterCount: number;
  settings: UserSettings;
  locations: string[];
  selectedLocation: string;
  onSelectLocation: (loc: string) => void;
  locationCounts: Record<string, number>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterOption: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  onOpenAddPlant: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<Props> = ({
  totalPlants,
  needWaterCount,
  settings,
  locations,
  selectedLocation,
  onSelectLocation,
  locationCounts,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  filterOption,
  onFilterChange,
  onOpenAddPlant,
  onOpenSettings,
}) => {
  const [currentTip, setCurrentTip] = useState<GardeningTip>(() => getRandomTip());
  const [showBriefingCard, setShowBriefingCard] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));

  const handleNextTip = () => {
    const nextTips = GARDENING_TIPS.filter((t) => t.id !== currentTip.id);
    const randomNext = nextTips[Math.floor(Math.random() * nextTips.length)] || GARDENING_TIPS[0];
    setCurrentTip(randomNext);
  };

  const handleToggleSearch = () => {
    if (isSearchOpen && searchQuery) {
      onSearchChange('');
    }
    setIsSearchOpen((prev) => !prev);
  };

  return (
    <header className="w-full bg-[#F2F2F7] pt-4 pb-2 px-3.5 sm:px-6">
      {/* Top Header Row: Branding + Utility Actions (Tip, Search, Settings) */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">
              Plantarium
            </h1>
            <span className="text-[10px] font-bold text-[#316E36] bg-[#316E36]/10 border border-[#316E36]/20 px-1.5 py-0.5 rounded-md whitespace-nowrap">
              플랜타리움
            </span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium whitespace-nowrap mt-0.5 truncate">
            {settings.userName || '초록집사'}님의 반려식물 정원
          </p>
        </div>

        {/* Action buttons: Tip, Search, Settings */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Tip Toggle */}
          <button
            onClick={() => setShowBriefingCard(!showBriefingCard)}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              showBriefingCard
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
            }`}
            title={showBriefingCard ? '가든 팁 닫기' : '오늘의 가든 팁 보기'}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          </button>

          {/* Search Toggle */}
          <button
            id="toggle-search-btn"
            onClick={handleToggleSearch}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
              isSearchOpen || searchQuery
                ? 'bg-[#316E36]/10 text-[#316E36] border-[#316E36]/30 font-bold'
                : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
            }`}
            title={isSearchOpen ? '검색창 닫기' : '식물 검색하기'}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
          </button>

          {/* Settings */}
          <button
            id="open-settings-btn"
            onClick={onOpenSettings}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-gray-50 active:scale-95 flex items-center justify-center text-gray-600 border border-gray-200 transition-all shrink-0 cursor-pointer"
            title="설정 및 데이터/장소 관리"
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {/* Sub-bar: Status Pill + Primary Add Plant CTA */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all min-w-0 ${
            needWaterCount > 0
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {needWaterCount > 0 ? (
            <>
              <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
              <span className="font-bold whitespace-nowrap">오늘 물 줄 화분 {needWaterCount}개</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-[#316E36] shrink-0 stroke-[2.2]" />
              <span className="font-bold whitespace-nowrap">모든 식물 수분 충만 ✨</span>
            </>
          )}
        </div>

        {/* Primary Add Plant Button */}
        <button
          id="header-add-plant-btn"
          onClick={onOpenAddPlant}
          className="flex items-center justify-center gap-1 px-3 sm:px-3.5 h-8 sm:h-8.5 bg-[#316E36] hover:bg-[#27592b] active:scale-95 border border-[#27592b] text-white text-xs font-bold rounded-xl transition-all shrink-0 whitespace-nowrap shadow-xs cursor-pointer"
          title="식물 추가하기"
        >
          <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          <span>식물 추가</span>
        </button>
      </div>

      {/* Today's Garden Care Tip Banner */}
      {showBriefingCard && (
        <div className="mb-3 p-3.5 bg-white rounded-2xl border border-gray-200 shadow-2xs transition-all">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                <Lightbulb className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="text-xs font-bold text-gray-800">
                오늘의 식물 돌봄 팁: {currentTip.title}
              </span>
            </div>
            <button
              onClick={handleNextTip}
              className="text-gray-400 hover:text-[#316E36] p-1 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
              title="다른 팁 보기"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed pl-6 break-keep">
            {currentTip.description}
          </p>
        </div>
      )}

      {/* Location Filter Chips (장소별 필터) */}
      <div className="mb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {/* All Locations Chip */}
          <button
            onClick={() => onSelectLocation('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer border ${
              selectedLocation === 'all'
                ? 'bg-emerald-50/90 border-[#316E36]/40 text-[#27592b] font-bold shadow-2xs'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            전체 장소 ({totalPlants})
          </button>

          {/* Individual Location Chips */}
          {locations.map((loc) => {
            const count = locationCounts[loc] || 0;
            const isSelected = selectedLocation === loc;
            return (
              <button
                key={loc}
                onClick={() => onSelectLocation(loc)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-50/90 border-[#316E36]/40 text-[#27592b] font-bold shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {loc} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar (Expandable when toggled) */}
      {(isSearchOpen || searchQuery) && (
        <div className="mb-2.5">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
            <input
              id="plant-search-input"
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="식물 이름, 품종, 위치 검색..."
              className="w-full pl-9 pr-16 py-2.5 bg-white rounded-xl border border-emerald-300 ring-2 ring-emerald-50 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#316E36] transition-all shadow-2xs"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg w-5 h-5 flex items-center justify-center cursor-pointer transition-colors"
                  title="검색어 지우기"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => {
                  onSearchChange('');
                  setIsSearchOpen(false);
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-1.5 py-1 rounded-lg hover:bg-gray-100 cursor-pointer whitespace-nowrap transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Sort Bar */}
      <div className="space-y-2.5">
        {/* Filter & Sort Controls */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {/* Filter Segmented Control */}
          <div className="flex items-center gap-1 shrink-0 bg-gray-100 border border-gray-200 p-1 rounded-xl">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterOption === 'all'
                  ? 'bg-white border border-gray-200 text-gray-900 font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900 border border-transparent'
              }`}
            >
              전체 ({totalPlants})
            </button>
            <button
              onClick={() => onFilterChange('need_water')}
              className={`px-3 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterOption === 'need_water'
                  ? 'bg-white border border-rose-200 text-rose-600 font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900 border border-transparent'
              }`}
            >
              급수 필요 ({needWaterCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 shrink-0">
            <select
              id="sort-select"
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-[#316E36] cursor-pointer whitespace-nowrap"
            >
              <option value="days_elapsed">⏱️ 경과순</option>
              <option value="created">🆕 등록순</option>
              <option value="name">🔤 이름순</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

