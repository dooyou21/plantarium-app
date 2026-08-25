import React, { useState, useEffect, useMemo } from 'react';
import { Plant, DiaryEntry, UserSettings, SortOption, FilterOption } from './types';
import { 
  loadPlants, savePlants, loadDiaries, saveDiaries, 
  loadUserSettings, saveUserSettings 
} from './services/storage';
import { 
  getDaysSinceWatered, getUrgencyRatio, getTodayString, 
  getDaysTogether, formatKoreanDate 
} from './utils/dateUtils';
import { Header } from './components/Header';
import { PlantCard } from './components/PlantCard';
import { PlantDetailModal } from './components/PlantDetailModal';
import { PlantFormSheet } from './components/PlantFormSheet';
import { SettingsModal } from './components/SettingsModal';
import { IntroPermissionModal } from './components/IntroPermissionModal';
import { registerServiceWorker, checkPlantsAndNotify } from './services/notificationService';
import { Droplets, Plus, Sparkles, Undo2, Leaf, Search, Filter, Check, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Application Data States
  const [plants, setPlants] = useState<Plant[]>(() => loadPlants());
  const [diaries, setDiaries] = useState<DiaryEntry[]>(() => loadDiaries());
  const [settings, setSettings] = useState<UserSettings>(() => loadUserSettings());

  // Navigation & View States
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [isPlantFormOpen, setIsPlantFormOpen] = useState(false);
  const [plantToEdit, setPlantToEdit] = useState<Plant | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(!settings.hasCompletedOnboarding);

  // Search, Filter, Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('days_elapsed');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Available Locations list from settings
  const locations = useMemo(() => {
    return settings.locations && settings.locations.length > 0
      ? settings.locations
      : ['거실', '베란다'];
  }, [settings.locations]);

  // Counts of plants per location
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    locations.forEach((loc) => {
      counts[loc] = plants.filter((p) => (p.location || '').includes(loc)).length;
    });
    return counts;
  }, [plants, locations]);

  const handleAddLocation = (newLocName: string) => {
    const trimmed = newLocName.trim();
    if (!trimmed) return;
    if (!locations.includes(trimmed)) {
      const updated = [...locations, trimmed];
      setSettings((prev) => ({ ...prev, locations: updated }));
    }
  };

  // Global Floating Toast notification (e.g. Backup data restoration)
  const [globalToast, setGlobalToast] = useState<{
    id: string;
    type: 'success' | 'info' | 'error';
    title?: string;
    message: string;
  } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success', title?: string) => {
    const id = `toast-${Date.now()}`;
    setGlobalToast({ id, type, title, message });
    setTimeout(() => {
      setGlobalToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  };

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    plantId: string;
    prevWateredDate: string;
    prevHistory: string[];
    createdDiaryId?: string;
    plantName: string;
  } | null>(null);

  // Sync to storage on state change
  useEffect(() => {
    savePlants(plants);
  }, [plants]);

  useEffect(() => {
    saveDiaries(diaries);
  }, [diaries]);

  useEffect(() => {
    saveUserSettings(settings);
  }, [settings]);

  // Service Worker Registration & Notification Handling
  useEffect(() => {
    // 1. Register Service Worker for PWA & Notifications
    registerServiceWorker();

    // 2. Handle URL Query Params (e.g. ?plant=xxx from notification click)
    const urlParams = new URLSearchParams(window.location.search);
    const plantParam = urlParams.get('plant');
    if (plantParam) {
      setSelectedPlantId(plantParam);
    }

    // 3. Listen for postMessage from Service Worker
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SELECT_PLANT' && event.data?.plantId) {
        setSelectedPlantId(event.data.plantId);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  // Check and trigger notifications for overdue plants
  useEffect(() => {
    if (plants.length > 0 && settings.enablePushNotifications !== false) {
      checkPlantsAndNotify(plants, settings);
    }
  }, [plants, settings]);

  // Selected Plant Object
  const selectedPlant = useMemo(() => {
    if (!selectedPlantId) return null;
    return plants.find((p) => p.id === selectedPlantId) || null;
  }, [plants, selectedPlantId]);

  // Calculations for Filter & Sort
  const filteredAndSortedPlants = useMemo(() => {
    let list = [...plants];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.species.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q)
      );
    }

    // 2. Status & Location Filters
    if (filterOption === 'need_water') {
      list = list.filter((p) => {
        const ratio = getUrgencyRatio(p.lastWateredDate, p.wateringCycle);
        return ratio >= 0.8;
      });
    }

    if (selectedLocation !== 'all') {
      list = list.filter((p) => (p.location || '').includes(selectedLocation));
    }

    // 3. Sorting (Priority: Urgency ratio descending by default)
    list.sort((a, b) => {
      if (sortOption === 'days_elapsed') {
        const daysA = getDaysSinceWatered(a.lastWateredDate);
        const daysB = getDaysSinceWatered(b.lastWateredDate);
        return daysB - daysA; // Most days since watered first
      }
      if (sortOption === 'created') {
        // 등록순: 최근 등록된 순서대로 정렬 (id에 timestamp 포함 또는 createdAt 기준)
        const timeA = new Date(a.createdAt || 0).getTime() || (a.id.startsWith('plant-') ? parseInt(a.id.replace('plant-', ''), 10) : 0);
        const timeB = new Date(b.createdAt || 0).getTime() || (b.id.startsWith('plant-') ? parseInt(b.id.replace('plant-', ''), 10) : 0);
        return timeB - timeA;
      }
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name, 'ko');
      }
      return 0;
    });

    return list;
  }, [plants, searchQuery, filterOption, selectedLocation, sortOption]);

  // Statistics
  const needWaterCount = useMemo(() => {
    return plants.filter((p) => getUrgencyRatio(p.lastWateredDate, p.wateringCycle) >= 0.8).length;
  }, [plants]);

  // Actions
  const handleQuickWater = (plantId: string) => {
    const target = plants.find((p) => p.id === plantId);
    if (!target) return;

    const todayStr = getTodayString();
    const prevWateredDate = target.lastWateredDate;
    const prevHistory = [...(target.wateringHistory || [target.lastWateredDate])];

    const newHistory = [...new Set([...prevHistory, todayStr])];

    // Create a diary record automatically
    const newDiaryId = `diary-${Date.now()}`;
    const newDiaryEntry: DiaryEntry = {
      id: newDiaryId,
      plantId: target.id,
      date: todayStr,
      type: 'water',
      title: '물주기 완료 (D+0)',
      content: '화분에 듬뿍 급수하였습니다.',
      daysSinceAdopted: getDaysTogether(target.adoptedDate),
      daysSinceLastWater: 0,
    };

    setPlants((prev) =>
      prev.map((p) =>
        p.id === plantId
          ? {
              ...p,
              lastWateredDate: todayStr,
              wateringHistory: newHistory,
            }
          : p
      )
    );

    setDiaries((prev) => [newDiaryEntry, ...prev]);

    // Show Undo Toast
    setUndoToast({
      plantId: target.id,
      prevWateredDate,
      prevHistory,
      createdDiaryId: newDiaryId,
      plantName: target.name,
    });

    // Auto dismiss toast after 6 seconds
    setTimeout(() => {
      setUndoToast((current) => (current?.createdDiaryId === newDiaryId ? null : current));
    }, 6000);
  };

  const handleUndoWater = () => {
    if (!undoToast) return;
    const { plantId, prevWateredDate, prevHistory, createdDiaryId } = undoToast;

    setPlants((prev) =>
      prev.map((p) =>
        p.id === plantId
          ? {
              ...p,
              lastWateredDate: prevWateredDate,
              wateringHistory: prevHistory,
            }
          : p
      )
    );

    if (createdDiaryId) {
      setDiaries((prev) => prev.filter((d) => d.id !== createdDiaryId));
    }

    setUndoToast(null);
  };

  const handleFertilize = (plantId: string) => {
    const todayStr = getTodayString();
    const target = plants.find((p) => p.id === plantId);
    if (!target) return;

    setPlants((prev) =>
      prev.map((p) =>
        p.id === plantId
          ? {
              ...p,
              lastFertilizedDate: todayStr,
            }
          : p
      )
    );

    const newDiaryEntry: DiaryEntry = {
      id: `diary-${Date.now()}`,
      plantId: target.id,
      date: todayStr,
      type: 'fertilizer',
      title: '영양제 급여 완료',
      content: '성장을 돕기 위해 영양제를 챙겨주었습니다.',
      daysSinceAdopted: getDaysTogether(target.adoptedDate),
      daysSinceLastWater: getDaysSinceWatered(target.lastWateredDate),
    };

    setDiaries((prev) => [newDiaryEntry, ...prev]);
  };

  const handleSavePlant = (
    plantData: Omit<Plant, 'id' | 'createdAt' | 'wateringHistory'>
  ) => {
    if (plantToEdit) {
      // Edit mode
      setPlants((prev) =>
        prev.map((p) =>
          p.id === plantToEdit.id
            ? {
                ...p,
                ...plantData,
                wateringHistory: p.wateringHistory.includes(plantData.lastWateredDate)
                  ? p.wateringHistory
                  : [...p.wateringHistory, plantData.lastWateredDate],
              }
            : p
        )
      );
      setPlantToEdit(null);
    } else {
      // Add new
      const newPlant: Plant = {
        ...plantData,
        id: `plant-${Date.now()}`,
        createdAt: getTodayString(),
        wateringHistory: [plantData.lastWateredDate],
      };
      setPlants((prev) => [newPlant, ...prev]);
    }
  };

  const handleDeletePlant = (plantId: string) => {
    setPlants((prev) => prev.filter((p) => p.id !== plantId));
    setDiaries((prev) => prev.filter((d) => d.plantId !== plantId));
    if (selectedPlantId === plantId) {
      setSelectedPlantId(null);
    }
  };

  const handleAddDiary = (entryData: Omit<DiaryEntry, 'id'>) => {
    const target = plants.find((p) => p.id === entryData.plantId);
    const newEntry: DiaryEntry = {
      ...entryData,
      id: `diary-${Date.now()}`,
      daysSinceAdopted: target ? getDaysTogether(target.adoptedDate) : undefined,
      daysSinceLastWater: target ? getDaysSinceWatered(target.lastWateredDate) : undefined,
    };

    // If type is water, update plant lastWateredDate as well
    if (entryData.type === 'water' && target) {
      const todayStr = entryData.date.slice(0, 10);
      const newHistory = [...new Set([...(target.wateringHistory || []), todayStr])];
      setPlants((prev) =>
        prev.map((p) =>
          p.id === target.id
            ? { ...p, lastWateredDate: todayStr, wateringHistory: newHistory }
            : p
        )
      );
    }

    // If type is fertilizer, update plant lastFertilizedDate as well
    if (entryData.type === 'fertilizer' && target) {
      const fertDate = entryData.date.slice(0, 10);
      setPlants((prev) =>
        prev.map((p) =>
          p.id === target.id
            ? { ...p, lastFertilizedDate: fertDate }
            : p
        )
      );
    }

    setDiaries((prev) => [newEntry, ...prev]);
  };

  const handleDeleteDiary = (diaryId: string) => {
    const deletedEntry = diaries.find((d) => d.id === diaryId);
    const remainingDiaries = diaries.filter((d) => d.id !== diaryId);
    setDiaries(remainingDiaries);

    if (deletedEntry) {
      const plantId = deletedEntry.plantId;
      const targetPlant = plants.find((p) => p.id === plantId);
      if (targetPlant) {
        if (deletedEntry.type === 'fertilizer') {
          const remainingFert = remainingDiaries
            .filter((d) => d.plantId === plantId && d.type === 'fertilizer')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setPlants((prev) =>
            prev.map((p) =>
              p.id === plantId
                ? {
                    ...p,
                    lastFertilizedDate: remainingFert.length > 0 ? remainingFert[0].date.slice(0, 10) : undefined,
                  }
                : p
            )
          );
        } else if (deletedEntry.type === 'water') {
          const remainingWater = remainingDiaries
            .filter((d) => d.plantId === plantId && d.type === 'water')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          const newWaterDate = remainingWater.length > 0 
            ? remainingWater[0].date.slice(0, 10) 
            : targetPlant.createdAt.slice(0, 10);

          setPlants((prev) =>
            prev.map((p) =>
              p.id === plantId
                ? {
                    ...p,
                    lastWateredDate: newWaterDate,
                    wateringHistory: remainingWater.map((d) => d.date.slice(0, 10)),
                  }
                : p
            )
          );
        }
      }
    }

    triggerToast('기록이 삭제되었습니다.', 'info');
  };

  const handleUpdateDiary = (updatedEntry: DiaryEntry) => {
    const newDiaries = diaries.map((d) => (d.id === updatedEntry.id ? updatedEntry : d));
    setDiaries(newDiaries);

    // If type is water or fertilizer, keep plant metadata in sync
    const plantId = updatedEntry.plantId;
    const targetPlant = plants.find((p) => p.id === plantId);
    if (targetPlant) {
      if (updatedEntry.type === 'fertilizer') {
        const remainingFert = newDiaries
          .filter((d) => d.plantId === plantId && d.type === 'fertilizer')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPlants((prev) =>
          prev.map((p) =>
            p.id === plantId
              ? { ...p, lastFertilizedDate: remainingFert.length > 0 ? remainingFert[0].date.slice(0, 10) : undefined }
              : p
          )
        );
      } else if (updatedEntry.type === 'water') {
        const remainingWater = newDiaries
          .filter((d) => d.plantId === plantId && d.type === 'water')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPlants((prev) =>
          prev.map((p) =>
            p.id === plantId
              ? {
                  ...p,
                  lastWateredDate: remainingWater.length > 0 ? remainingWater[0].date.slice(0, 10) : targetPlant.lastWateredDate,
                  wateringHistory: remainingWater.map((d) => d.date.slice(0, 10)),
                }
              : p
          )
        );
      }
    }

    triggerToast('성장 기록이 수정되었습니다.', 'success');
  };

  const handleDataReload = (feedbackMessage?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const loadedPlants = loadPlants();
    const loadedDiaries = loadDiaries();
    const loadedSettings = loadUserSettings();
    setPlants(loadedPlants);
    setDiaries(loadedDiaries);
    setSettings(loadedSettings);
    if (!loadedSettings.hasCompletedOnboarding) {
      setShowIntroModal(true);
      setIsSettingsOpen(false);
    }
    if (selectedPlantId && !loadedPlants.some((p) => p.id === selectedPlantId)) {
      setSelectedPlantId(null);
    }
    if (feedbackMessage) {
      triggerToast(
        feedbackMessage,
        type,
        type === 'success' ? '데이터 복원 완료' : type === 'error' ? '복원 실패' : '데이터 알림'
      );
    }
  };

  return (
    <div className="min-h-screen bg-system-bg flex flex-col justify-between max-w-3xl mx-auto border-x border-border-default selection:bg-plant-primary/20">
      <div className="w-full">
        {/* Screen 1: Dashboard Header */}
        <Header
          totalPlants={plants.length}
          needWaterCount={needWaterCount}
          settings={settings}
          locations={locations}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          locationCounts={locationCounts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          filterOption={filterOption}
          onFilterChange={setFilterOption}
          onOpenAddPlant={() => {
            setPlantToEdit(null);
            setIsPlantFormOpen(true);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Screen 1: Plant Cards List */}
        <main className="px-4 sm:px-6 py-3">
          {filteredAndSortedPlants.length === 0 ? (
            <div className="text-center py-16 px-4 bg-surface-card rounded-xl border border-border-default my-2">
              <div className="w-12 h-12 rounded-xl bg-plant-bg-subtle border border-plant-border-subtle text-plant-primary flex items-center justify-center mx-auto mb-3">
                <Leaf className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">
                {searchQuery ? '일치하는 식물이 없습니다' : '등록된 식물이 없습니다'}
              </h3>
              <p className="text-xs text-text-tertiary max-w-xs mx-auto mb-4">
                {searchQuery
                  ? '검색어를 변경하거나 필터를 초기화해보세요.'
                  : '새 식물을 추가하고 물주기 관리를 시작해보세요.'}
              </p>
              <button
                id="empty-add-plant-btn"
                onClick={() => {
                  setSearchQuery('');
                  setFilterOption('all');
                  setPlantToEdit(null);
                  setIsPlantFormOpen(true);
                }}
                className="px-4 py-2.5 bg-plant-primary text-white text-xs font-bold rounded-xl border border-plant-primary-dark hover:bg-plant-primary-dark active:scale-95 transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>새 식물 추가하기</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedPlants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  onClick={() => setSelectedPlantId(plant.id)}
                  onQuickWater={handleQuickWater}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Quick summary footer */}
      <footer className="px-4 sm:px-6 py-5 text-center text-xs text-gray-400 break-keep">
        <p className="inline-flex items-center justify-center gap-1.5 leading-relaxed max-w-sm mx-auto text-gray-500">
          <span>💡 💧 <strong>물주기</strong>를 누르면 D+0으로 리셋되며 이력이 기록됩니다.</span>
        </p>
      </footer>

      {/* Global Floating Toast Notification (Backup restoration, errors, info) */}
      <AnimatePresence>
        {globalToast && (
          <motion.div
            key={globalToast.id}
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-70 bg-gray-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-gray-700 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                globalToast.type === 'success'
                  ? 'bg-plant-primary/20 text-plant-primary-light border border-plant-primary/30'
                  : globalToast.type === 'error'
                  ? 'bg-danger-primary/20 text-danger-primary border border-danger-primary/30'
                  : 'bg-water-primary/20 text-water-primary border border-water-primary/30'
              }`}>
                {globalToast.type === 'success' ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : globalToast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                {globalToast.title && (
                  <h4 className="text-xs font-bold text-gray-100">{globalToast.title}</h4>
                )}
                <p className="text-xs text-gray-300 font-medium leading-snug break-keep">
                  {globalToast.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setGlobalToast(null)}
              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo Toast Notification */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-50 bg-gray-900 text-white p-3.5 rounded-xl flex items-center justify-between border border-gray-700"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4 fill-sky-400" />
              </div>
              <p className="text-xs font-medium truncate">
                <strong>{undoToast.plantName}</strong> 물주기 완료 (D+0)
              </p>
            </div>
            <button
              id="undo-water-btn"
              onClick={handleUndoWater}
              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 rounded-lg text-xs font-bold text-sky-300 flex items-center gap-1 transition-all shrink-0 ml-2"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>실행 취소</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen 2: Detail View & Growth Archive Modal */}
      <PlantDetailModal
        plant={selectedPlant}
        diaries={diaries}
        isOpen={!!selectedPlant}
        onClose={() => setSelectedPlantId(null)}
        onWater={handleQuickWater}
        onFertilize={handleFertilize}
        onEditPlant={(plant) => {
          setPlantToEdit(plant);
          setIsPlantFormOpen(true);
        }}
        onAddDiary={handleAddDiary}
        onUpdateDiary={handleUpdateDiary}
        onDeleteDiary={handleDeleteDiary}
      />

      {/* Screen 3: Plant Register & Edit Bottom Sheet */}
      <PlantFormSheet
        isOpen={isPlantFormOpen}
        plantToEdit={plantToEdit}
        locations={locations}
        onAddLocation={handleAddLocation}
        onClose={() => {
          setIsPlantFormOpen(false);
          setPlantToEdit(null);
        }}
        onSave={handleSavePlant}
        onDelete={(plantId) => {
          handleDeletePlant(plantId);
          setSelectedPlantId(null);
        }}
      />

      {/* Settings & Web Storage Data Backup Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        plants={plants}
        diaries={diaries}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={(newSettings) =>
          setSettings((prev) => ({ ...prev, ...newSettings }))
        }
        onDataReload={handleDataReload}
      />

      {/* Screen 0: Initial Launch & Permission Check */}
      <IntroPermissionModal
        isOpen={showIntroModal}
        settings={settings}
        onComplete={(newSettings) => {
          setSettings((prev) => ({ ...prev, ...newSettings }));
          setShowIntroModal(false);
        }}
      />
    </div>
  );
}
