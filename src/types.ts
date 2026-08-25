export type CareLogType = 'growth' | 'water' | 'fertilizer' | 'repot' | 'prune' | 'pest' | 'memo' | 'photo';

export interface DiaryEntry {
  id: string;
  plantId: string;
  date: string; // ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DD)
  type: CareLogType;
  title?: string;
  content: string;
  imageUrl?: string; // Legacy or primary photo
  imageUrls?: string[]; // Up to 3 photos
  daysSinceAdopted?: number;
  daysSinceLastWater?: number;
}

export interface Plant {
  id: string;
  name: string;
  species: string;
  wateringCycle: number; // in days
  lastWateredDate: string; // YYYY-MM-DD
  adoptedDate: string; // YYYY-MM-DD
  location: string;
  imageUrl: string;
  sunlight?: 'direct' | 'indirect' | 'low';
  ventilation?: 'high' | 'normal' | 'low'; // 통풍/바람 조건
  notes?: string;
  lastFertilizedDate?: string;
  lastRepottedDate?: string;
  createdAt: string;
  wateringHistory: string[]; // List of YYYY-MM-DD dates when watered
}

export interface WaterIntervalStat {
  date: string;
  intervalDays: number;
}

export interface UserSettings {
  userName: string;
  autoSaveEnabled: boolean;
  hasCompletedOnboarding: boolean;
  hasPhotoPermission: boolean;
  hasNotificationPermission: boolean;
  enablePushNotifications?: boolean;
  notificationTime?: string;
  lastSavedAt: string | null;
  lastSyncedAt?: string | null;
  locations?: string[]; // e.g. ['거실', '베란다']
  indoorTemp?: number; // e.g. 23.5
  indoorHumidity?: number; // e.g. 55
}

export type SortOption = 'days_elapsed' | 'created' | 'name';
export type FilterOption = 'all' | 'need_water';
