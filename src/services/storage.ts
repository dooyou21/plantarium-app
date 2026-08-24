import { Plant, DiaryEntry, UserSettings } from '../types';
import { INITIAL_PLANTS, INITIAL_DIARIES, DEFAULT_USER_SETTINGS } from '../data/initialData';

const PLANTS_STORAGE_KEY = 'plantarium_plants_v1';
const DIARIES_STORAGE_KEY = 'plantarium_diaries_v1';
const SETTINGS_STORAGE_KEY = 'plantarium_settings_v1';

export function loadPlants(): Plant[] {
  try {
    const raw = localStorage.getItem(PLANTS_STORAGE_KEY);
    if (raw === null) {
      savePlants(INITIAL_PLANTS);
      return INITIAL_PLANTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load plants from storage', err);
    return [];
  }
}

export function savePlants(plants: Plant[]): void {
  try {
    localStorage.setItem(PLANTS_STORAGE_KEY, JSON.stringify(plants));
  } catch (err) {
    console.error('Failed to save plants to storage', err);
  }
}

export function loadDiaries(): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(DIARIES_STORAGE_KEY);
    if (raw === null) {
      saveDiaries(INITIAL_DIARIES);
      return INITIAL_DIARIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load diaries from storage', err);
    return [];
  }
}

export function saveDiaries(diaries: DiaryEntry[]): void {
  try {
    localStorage.setItem(DIARIES_STORAGE_KEY, JSON.stringify(diaries));
  } catch (err) {
    console.error('Failed to save diaries to storage', err);
  }
}

export function loadUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      saveUserSettings(DEFAULT_USER_SETTINGS);
      return DEFAULT_USER_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
      locations: Array.isArray(parsed.locations) && parsed.locations.length > 0
        ? parsed.locations
        : ['거실', '베란다'],
    };
  } catch (err) {
    console.error('Failed to load settings', err);
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

export function exportBackupData(): string {
  const data = {
    version: '1.0',
    app: 'Plantarium Web App',
    exportedAt: new Date().toISOString(),
    plants: loadPlants(),
    diaries: loadDiaries(),
    settings: loadUserSettings(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonString: string): { 
  success: boolean; 
  message: string;
  plantCount?: number;
  diaryCount?: number;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.plants || !Array.isArray(parsed.plants)) {
      return { success: false, message: '올바른 백업 파일 형식이 아닙니다. (식물 데이터 누락)' };
    }
    savePlants(parsed.plants);
    const plantCount = parsed.plants.length;
    let diaryCount = 0;
    if (parsed.diaries && Array.isArray(parsed.diaries)) {
      saveDiaries(parsed.diaries);
      diaryCount = parsed.diaries.length;
    } else {
      saveDiaries([]);
    }
    if (parsed.settings) {
      saveUserSettings({
        ...DEFAULT_USER_SETTINGS,
        ...parsed.settings,
        lastSavedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
      });
    }
    return { 
      success: true, 
      message: `식물 ${plantCount}개와 기록 ${diaryCount}건을 성공적으로 불러왔습니다!`,
      plantCount,
      diaryCount,
    };
  } catch (err) {
    return { success: false, message: 'JSON 파일 형식이 잘못되었거나 손상된 파일입니다.' };
  }
}

export function getStorageStats(): {
  plantCount: number;
  diaryCount: number;
  estimatedSizeKb: number;
  lastSavedAt: string | null;
} {
  try {
    const pRaw = localStorage.getItem(PLANTS_STORAGE_KEY) || '';
    const dRaw = localStorage.getItem(DIARIES_STORAGE_KEY) || '';
    const sRaw = localStorage.getItem(SETTINGS_STORAGE_KEY) || '';
    const totalBytes = (pRaw.length + dRaw.length + sRaw.length) * 2; // UTF-16
    const plants = loadPlants();
    const diaries = loadDiaries();
    const settings = loadUserSettings();

    return {
      plantCount: plants.length,
      diaryCount: diaries.length,
      estimatedSizeKb: Math.round((totalBytes / 1024) * 10) / 10,
      lastSavedAt: settings.lastSavedAt || settings.lastSyncedAt || null,
    };
  } catch {
    return {
      plantCount: 0,
      diaryCount: 0,
      estimatedSizeKb: 0,
      lastSavedAt: null,
    };
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}

export function clearAllData(): void {
  savePlants([]);
  saveDiaries([]);
  const currentSettings = loadUserSettings();
  saveUserSettings({
    ...currentSettings,
    lastSavedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  });
}

export function resetToFactoryState(): void {
  savePlants([]);
  saveDiaries([]);
  saveUserSettings({
    ...DEFAULT_USER_SETTINGS,
    userName: '',
    hasCompletedOnboarding: false,
    lastSavedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  });
}

export function resetToSampleData(): void {
  savePlants(INITIAL_PLANTS);
  saveDiaries(INITIAL_DIARIES);
  saveUserSettings({
    ...DEFAULT_USER_SETTINGS,
    hasCompletedOnboarding: true,
    lastSavedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  });
}
