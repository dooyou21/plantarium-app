export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getDaysDifference(fromStr: string, toStr: string = getTodayString()): number {
  if (!fromStr) return 0;
  const from = parseDate(fromStr);
  const to = parseDate(toStr);
  
  // Set both to midnight UTC for pure calendar day comparison
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  
  const diffMs = utcTo - utcFrom;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function getDaysSinceWatered(lastWateredDate: string): number {
  return getDaysDifference(lastWateredDate);
}

export function getDaysTogether(adoptedDate: string): number {
  return getDaysDifference(adoptedDate) + 1;
}

export function getUrgencyRatio(lastWateredDate: string, cycle: number): number {
  if (cycle <= 0) return 0;
  const elapsed = getDaysSinceWatered(lastWateredDate);
  return elapsed / cycle;
}

export interface WateringStats {
  daysSinceWatered: number;
  daysRemaining: number;
  urgency: number;
  isOverdue: boolean;
}

export function calculateWateringStats(plant: { lastWateredDate: string; wateringCycle: number }): WateringStats {
  const daysSinceWatered = getDaysSinceWatered(plant.lastWateredDate);
  const daysRemaining = plant.wateringCycle - daysSinceWatered;
  const urgency = getUrgencyRatio(plant.lastWateredDate, plant.wateringCycle);
  return {
    daysSinceWatered,
    daysRemaining,
    urgency,
    isOverdue: daysRemaining <= 0,
  };
}

export function formatKoreanDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = weekdays[d.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

export function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function getRelativeTimeLabel(dateStr: string): string {
  const diff = getDaysDifference(dateStr);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff === 2) return '그저께';
  if (diff < 7) return `${diff}일 전`;
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`;
  return `${Math.floor(diff / 30)}달 전`;
}

/**
 * Computes consecutive interval days between watering history records.
 * Returns sorted list of recent intervals.
 */
export function calculateWateringIntervals(history: string[]): { date: string; interval: number }[] {
  if (!history || history.length < 2) return [];

  // Sort ascending by date
  const sorted = [...new Set(history)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const intervals: { date: string; interval: number }[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const diff = getDaysDifference(prev, curr);
    intervals.push({
      date: curr,
      interval: diff,
    });
  }

  // Return last 6 intervals
  return intervals.slice(-6);
}
