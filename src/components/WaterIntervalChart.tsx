import React from 'react';
import { calculateWateringIntervals } from '../utils/dateUtils';
import { BarChart3, TrendingUp, Info } from 'lucide-react';

interface Props {
  wateringHistory: string[];
  targetCycle: number;
}

export const WaterIntervalChart: React.FC<Props> = ({ wateringHistory, targetCycle }) => {
  const intervals = calculateWateringIntervals(wateringHistory);

  if (intervals.length === 0) {
    return (
      <div id="water-chart-empty" className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
          <BarChart3 className="w-3.5 h-3.5 text-[#316E36]" />
          <span>급수 간격 데이터 축적 중</span>
        </div>
        <p className="text-xs text-gray-400">
          물을 2회 이상 기록하면 최근 급수 주기 분석 그래프가 나타납니다.
        </p>
      </div>
    );
  }

  const values = intervals.map((i) => i.interval);
  const maxInterval = Math.max(...values, targetCycle, 1);
  const avgInterval = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  const diffFromTarget = (Number(avgInterval) - targetCycle).toFixed(1);

  return (
    <div id="water-interval-chart-card" className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-[#316E36]/10 border border-[#316E36]/20 flex items-center justify-center text-[#316E36]">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-900">최근 {intervals.length}회 급수 간격</h4>
            <p className="text-[11px] text-gray-500">설정 주기: {targetCycle}일 기준</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-gray-900">평균 {avgInterval}일</span>
          <span className="text-[10px] block text-gray-400">
            {Number(diffFromTarget) > 0 ? `+${diffFromTarget}일 길음` : Number(diffFromTarget) < 0 ? `${diffFromTarget}일 짧음` : '설정 주기와 일치'}
          </span>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="relative pt-4 pb-2">
        {/* Bars Container */}
        <div className="relative h-32 flex items-end justify-between gap-3">
          {/* Target cycle guide dashed line & floating badge */}
          <div
            className="absolute left-0 right-0 border-b border-dashed border-[#316E36]/40 flex items-center justify-end pointer-events-none z-10"
            style={{
              bottom: `${Math.min(90, Math.max(15, (targetCycle / (maxInterval * 1.3)) * 100))}%`,
            }}
          >
            <div className="absolute right-0 -top-3.5 flex items-center">
              <span className="text-[10px] font-bold text-[#316E36] bg-white border border-[#316E36]/30 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                기준 {targetCycle}일
              </span>
            </div>
          </div>

          {intervals.map((item, idx) => {
            const heightPercent = Math.min(90, Math.max(15, (item.interval / (maxInterval * 1.3)) * 100));
            const isOverTarget = item.interval > targetCycle;
            const isMatch = Math.abs(item.interval - targetCycle) <= 1;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group z-0">
                <span className="text-[11px] font-bold text-gray-700 mb-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
                  {item.interval}일
                </span>
                <div className="w-full bg-gray-100 rounded-t-lg relative overflow-hidden flex items-end" style={{ height: '70px' }}>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isMatch
                        ? 'bg-[#316E36]'
                        : isOverTarget
                        ? 'bg-amber-600'
                        : 'bg-sky-600'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-medium mt-1.5 truncate w-full text-center">
                  {item.date.slice(5).replace('-', '/')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight summary */}
      <div className="mt-3 pt-2.5 border-t border-gray-200 flex items-start gap-1.5 text-[11px] text-gray-600 break-keep">
        <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed break-keep">
          {Math.abs(Number(diffFromTarget)) <= 1.5 ? (
            <span>설정된 <strong>{targetCycle}일 주기</strong>와 실제 급수 패턴이 조화롭게 유지되고 있습니다.</span>
          ) : Number(diffFromTarget) > 0 ? (
            <span>실제 급수 간격(평균 {avgInterval}일)이 설정보다 길어요. 식물이 건조에 잘 버틴다면 주기를 늘려도 좋습니다.</span>
          ) : (
            <span>실제 급수 간격(평균 {avgInterval}일)이 설정보다 짧아요. 흙 상태를 점검하여 과습에 주의해주세요.</span>
          )}
        </p>
      </div>
    </div>
  );
};
