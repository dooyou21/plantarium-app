import React from 'react';
import { Plant } from '../types';
import { getDaysSinceWatered, getUrgencyRatio } from '../utils/dateUtils';
import { Droplets, Sun } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  plant: Plant;
  onClick: () => void;
  onQuickWater: (plantId: string) => void;
}

export const PlantCard: React.FC<Props> = ({
  plant,
  onClick,
  onQuickWater,
}) => {
  const daysSinceWater = getDaysSinceWatered(plant.lastWateredDate);
  const urgency = getUrgencyRatio(plant.lastWateredDate, plant.wateringCycle);

  const handleWaterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.6 },
      colors: ['#0284C7', '#38BDF8', '#316E36', '#6EE7B7'],
    });
    onQuickWater(plant.id);
  };

  // Visual status and urgency styling
  const isOverdue = urgency >= 1.0;
  const isDueSoon = urgency >= 0.8 && urgency < 1.0;
  const isWateredToday = daysSinceWater === 0;

  const getDDayBadgeStyle = () => {
    if (isWateredToday) {
      return {
        badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
        textColor: 'text-sky-700',
        statusText: '오늘 완료',
        barColor: 'bg-sky-500',
      };
    }
    if (isOverdue) {
      return {
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        textColor: 'text-rose-600',
        statusText: '급수 필요',
        barColor: 'bg-rose-500',
      };
    }
    if (isDueSoon) {
      return {
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        textColor: 'text-amber-700',
        statusText: '급수 임박',
        barColor: 'bg-amber-500',
      };
    }
    return {
      badgeBg: 'bg-emerald-50 text-[#316E36] border-emerald-200',
      textColor: 'text-[#316E36]',
      statusText: '수분 충분',
      barColor: 'bg-[#316E36]',
    };
  };

  const badgeStyle = getDDayBadgeStyle();
  const progressPercent = Math.min(100, Math.round(urgency * 100));

  return (
    <div
      id={`plant-card-${plant.id}`}
      onClick={onClick}
      className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 sm:gap-4 cursor-pointer transition-colors group select-none"
    >
      {/* Left: Plant Photo */}
      <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
        <img
          src={plant.imageUrl}
          alt={plant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {plant.sunlight && (
          <div className="absolute bottom-1 right-1 bg-black/60 text-white rounded-md p-0.5">
            <Sun className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      {/* Center: Plant Details & Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-gray-900 truncate tracking-tight">
            {plant.name}
          </h3>
          {isOverdue && (
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 truncate">
          <span className="truncate">{plant.species}</span>
          <span className="text-gray-300">·</span>
          <span className="shrink-0 text-gray-400">{plant.location}</span>
        </div>

        {/* Progress Bar & Cycle Info */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500 font-medium">
              💧 {plant.wateringCycle}일 주기
            </span>
            <span className="text-gray-400 text-[10px]">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${badgeStyle.barColor}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right: D+ Counter & Quick Water Button */}
      <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
        <div className="text-right">
          <div className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${badgeStyle.textColor} whitespace-nowrap`}>
            D+{daysSinceWater}
          </div>
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-lg border mt-1 ${badgeStyle.badgeBg} whitespace-nowrap`}>
            {badgeStyle.statusText}
          </span>
        </div>

        {/* Quick Water Button */}
        <button
          id={`quick-water-btn-${plant.id}`}
          onClick={handleWaterClick}
          className="w-8 h-8 rounded-xl bg-white hover:bg-sky-50 active:scale-95 border border-gray-200 hover:border-sky-300 text-gray-500 hover:text-sky-600 flex items-center justify-center transition-colors shrink-0"
          title="오늘 물 줌 (D+0으로 리셋)"
        >
          <Droplets className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
