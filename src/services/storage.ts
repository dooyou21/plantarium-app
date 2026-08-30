import { Plant, DiaryEntry, UserSettings } from '../types';
import { INITIAL_PLANTS, INITIAL_DIARIES, DEFAULT_USER_SETTINGS } from '../data/initialData';

const DB_NAME = 'plantarium_indexed_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

// Storage Keys within IndexedDB Object Store
const KEY_PLANTS = 'plants';
const KEY_DIARIES = 'diaries';
const KEY_SETTINGS = 'settings';
const KEY_INITIALIZED = 'storage_initialized_v1';

// Legacy LocalStorage Keys for One-Time Migration
const LEGACY_PLANTS_KEY = 'plantarium_plants_v1';
const LEGACY_DIARIES_KEY = 'plantarium_diaries_v1';
const LEGACY_SETTINGS_KEY = 'plantarium_settings_v1';

/**
 * Open or upgrade the IndexedDB database instance
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser/environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Generic getter from IndexedDB
 */
export async function getFromDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result !== undefined ? (request.result as T) : null);
      };

      request.onerror = () => {
        console.error(`IndexedDB read error for key "${key}":`, request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    console.error(`Failed to get "${key}" from IndexedDB:`, err);
    return null;
  }
}

/**
 * Generic setter to IndexedDB
 */
export async function setToDB<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`IndexedDB write error for key "${key}":`, request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    console.error(`Failed to save "${key}" to IndexedDB:`, err);
  }
}

/**
 * One-time check and migration from legacy LocalStorage to IndexedDB
 */
async function ensureMigrated(): Promise<void> {
  try {
    const isInit = await getFromDB<boolean>(KEY_INITIALIZED);
    if (isInit) return;

    // Check if user had existing data in localStorage
    let migratedPlants: Plant[] | null = null;
    let migratedDiaries: DiaryEntry[] | null = null;
    let migratedSettings: UserSettings | null = null;

    try {
      const rawPlants = localStorage.getItem(LEGACY_PLANTS_KEY);
      if (rawPlants) {
        const parsed = JSON.parse(rawPlants);
        if (Array.isArray(parsed) && parsed.length > 0) {
          migratedPlants = parsed;
        }
      }

      const rawDiaries = localStorage.getItem(LEGACY_DIARIES_KEY);
      if (rawDiaries) {
        const parsed = JSON.parse(rawDiaries);
        if (Array.isArray(parsed) && parsed.length > 0) {
          migratedDiaries = parsed;
        }
      }

      const rawSettings = localStorage.getItem(LEGACY_SETTINGS_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed && typeof parsed === 'object') {
          migratedSettings = parsed;
        }
      }
    } catch (parseErr) {
      console.warn('Legacy localStorage parsing error, starting fresh in IndexedDB', parseErr);
    }

    // Save initial or migrated data into IndexedDB
    await setToDB(KEY_PLANTS, migratedPlants || INITIAL_PLANTS);
    await setToDB(KEY_DIARIES, migratedDiaries || INITIAL_DIARIES);
    await setToDB(KEY_SETTINGS, migratedSettings || DEFAULT_USER_SETTINGS);
    await setToDB(KEY_INITIALIZED, true);

    console.info('IndexedDB initialization and migration completed successfully.');
  } catch (err) {
    console.error('Migration to IndexedDB failed:', err);
  }
}

/**
 * Load Plants from IndexedDB (with migration & fallback)
 */
export async function loadPlants(): Promise<Plant[]> {
  try {
    await ensureMigrated();
    const data = await getFromDB<Plant[]>(KEY_PLANTS);
    if (Array.isArray(data)) {
      return data;
    }
    // If not found, save initial
    await setToDB(KEY_PLANTS, INITIAL_PLANTS);
    return INITIAL_PLANTS;
  } catch (err) {
    console.error('Failed to load plants from IndexedDB', err);
    return INITIAL_PLANTS;
  }
}

/**
 * Save Plants to IndexedDB
 */
export async function savePlants(plants: Plant[]): Promise<void> {
  try {
    await setToDB(KEY_PLANTS, plants);
  } catch (err) {
    console.error('Failed to save plants to IndexedDB', err);
  }
}

/**
 * Load Diaries from IndexedDB
 */
export async function loadDiaries(): Promise<DiaryEntry[]> {
  try {
    await ensureMigrated();
    const data = await getFromDB<DiaryEntry[]>(KEY_DIARIES);
    if (Array.isArray(data)) {
      return data;
    }
    await setToDB(KEY_DIARIES, INITIAL_DIARIES);
    return INITIAL_DIARIES;
  } catch (err) {
    console.error('Failed to load diaries from IndexedDB', err);
    return INITIAL_DIARIES;
  }
}

/**
 * Save Diaries to IndexedDB
 */
export async function saveDiaries(diaries: DiaryEntry[]): Promise<void> {
  try {
    await setToDB(KEY_DIARIES, diaries);
  } catch (err) {
    console.error('Failed to save diaries to IndexedDB', err);
  }
}

/**
 * Load User Settings from IndexedDB
 */
export async function loadUserSettings(): Promise<UserSettings> {
  try {
    await ensureMigrated();
    const data = await getFromDB<UserSettings>(KEY_SETTINGS);
    if (data && typeof data === 'object') {
      return {
        ...DEFAULT_USER_SETTINGS,
        ...data,
        locations: Array.isArray(data.locations) && data.locations.length > 0
          ? data.locations
          : ['거실', '베란다'],
      };
    }
    await setToDB(KEY_SETTINGS, DEFAULT_USER_SETTINGS);
    return DEFAULT_USER_SETTINGS;
  } catch (err) {
    console.error('Failed to load settings from IndexedDB', err);
    return DEFAULT_USER_SETTINGS;
  }
}

/**
 * Save User Settings to IndexedDB
 */
export async function saveUserSettings(settings: UserSettings): Promise<void> {
  try {
    await setToDB(KEY_SETTINGS, settings);
  } catch (err) {
    console.error('Failed to save settings to IndexedDB', err);
  }
}

/**
 * Export full backup as JSON string
 */
export async function exportBackupData(
  currentPlants?: Plant[],
  currentDiaries?: DiaryEntry[],
  currentSettings?: UserSettings
): Promise<string> {
  const plantsToExport = currentPlants && Array.isArray(currentPlants) ? currentPlants : await loadPlants();
  const diariesToExport = currentDiaries && Array.isArray(currentDiaries) ? currentDiaries : await loadDiaries();
  const settingsToExport = currentSettings ? currentSettings : await loadUserSettings();

  // Ensure persistent state is flushed
  await savePlants(plantsToExport);
  await saveDiaries(diariesToExport);
  await saveUserSettings(settingsToExport);

  const data = {
    version: '2.0',
    app: 'Plantarium Web App (IndexedDB)',
    exportedAt: new Date().toISOString(),
    plants: plantsToExport,
    diaries: diariesToExport,
    settings: settingsToExport,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import backup data from JSON string into IndexedDB
 */
export async function importBackupData(jsonString: string): Promise<{ 
  success: boolean; 
  message: string;
  plantCount?: number;
  diaryCount?: number;
}> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.plants || !Array.isArray(parsed.plants)) {
      return { success: false, message: '올바른 백업 파일 형식이 아닙니다. (식물 데이터 누락)' };
    }
    
    await savePlants(parsed.plants);
    const plantCount = parsed.plants.length;
    let diaryCount = 0;
    
    if (parsed.diaries && Array.isArray(parsed.diaries)) {
      await saveDiaries(parsed.diaries);
      diaryCount = parsed.diaries.length;
    } else {
      await saveDiaries([]);
    }

    if (parsed.settings) {
      await saveUserSettings({
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

/**
 * Get storage statistics (counts, estimated size, timestamp) from IndexedDB
 */
export async function getStorageStats(): Promise<{
  plantCount: number;
  diaryCount: number;
  estimatedSizeKb: number;
  lastSavedAt: string | null;
}> {
  try {
    const plants = await loadPlants();
    const diaries = await loadDiaries();
    const settings = await loadUserSettings();

    const pStr = JSON.stringify(plants);
    const dStr = JSON.stringify(diaries);
    const sStr = JSON.stringify(settings);
    const totalBytes = (pStr.length + dStr.length + sStr.length) * 2; // Approximate UTF-16 in memory

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

/**
 * Request persistent browser storage permission
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Clear all plant and diary data
 */
export async function clearAllData(): Promise<void> {
  await savePlants([]);
  await saveDiaries([]);
  const currentSettings = await loadUserSettings();
  await saveUserSettings({
    ...currentSettings,
    lastSavedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  });
}

/**
 * Reset to default factory state with rich sample plants
 */
export async function resetToFactoryState(): Promise<void> {
  await savePlants(INITIAL_PLANTS);
  await saveDiaries(INITIAL_DIARIES);
  await saveUserSettings({
    ...DEFAULT_USER_SETTINGS,
    userName: '초록집사',
    hasCompletedOnboarding: true,
    lastSavedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  });
}

/**
 * Completely wipe all user data and reset onboarding
 */
export async function wipeAllUserData(): Promise<void> {
  await savePlants([]);
  await saveDiaries([]);
  await saveUserSettings({
    ...DEFAULT_USER_SETTINGS,
    userName: '초록집사',
    locations: ['거실', '베란다'],
    hasCompletedOnboarding: false,
    lastSavedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  });
}
