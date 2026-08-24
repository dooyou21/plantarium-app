import React, { useState, useRef, useEffect } from 'react';
import { 
  Database, Download, Upload, Trash2, RotateCcw, Check, 
  Thermometer, Droplets, User, AlertCircle, Bell, BellRing, Send, Sparkles, Smartphone,
  MapPin, Plus, X
} from 'lucide-react';
import { UserSettings } from '../types';
import { exportBackupData, importBackupData, clearAllData, resetToFactoryState, getStorageStats } from '../services/storage';
import { 
  isNotificationSupported, getNotificationPermission, requestNotificationPermission, 
  sendTestNotification 
} from '../services/notificationService';
import { Modal } from './ui/Modal';
import { ActionList, ActionListItem } from './ui/ActionList';

interface Props {
  isOpen: boolean;
  settings: UserSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onDataReload: (feedbackMessage?: string, type?: 'success' | 'info' | 'error') => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onDataReload,
}) => {
  const [userName, setUserName] = useState(settings.userName || '초록집사');
  const [locations, setLocations] = useState<string[]>(settings.locations || ['거실', '베란다']);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState(getStorageStats());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false);
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSendingTestNotif, setIsSendingTestNotif] = useState(false);
  const [notificationTime, setNotificationTime] = useState(settings.notificationTime || '09:00');
  const [enablePush, setEnablePush] = useState(settings.enablePushNotifications !== false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStorageStats(getStorageStats());
      setUserName(settings.userName || '초록집사');
      setLocations(settings.locations && settings.locations.length > 0 ? settings.locations : ['거실', '베란다']);
      setNewLocationInput('');
      setNotificationPerm(getNotificationPermission());
      setNotificationTime(settings.notificationTime || '09:00');
      setEnablePush(settings.enablePushNotifications !== false);
      setShowClearConfirm(false);
      setShowFactoryResetConfirm(false);
      setErrorMessage(null);
    }
  }, [isOpen, settings]);

  const handleAddLocation = () => {
    const trimmed = newLocationInput.trim();
    if (!trimmed) return;
    if (locations.includes(trimmed)) {
      setErrorMessage(`'${trimmed}'(은)는 이미 등록된 장소입니다.`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    const updated = [...locations, trimmed];
    setLocations(updated);
    onUpdateSettings({ locations: updated });
    setNewLocationInput('');
    setSyncFeedback(`새 장소 '${trimmed}'이(가) 추가되었습니다.`);
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleRemoveLocation = (locToRemove: string) => {
    if (locations.length <= 1) {
      setErrorMessage('최소 1개 이상의 화분 위치가 유지되어야 합니다.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    const updated = locations.filter((loc) => loc !== locToRemove);
    setLocations(updated);
    onUpdateSettings({ locations: updated });
    setSyncFeedback(`'${locToRemove}' 장소가 삭제되었습니다.`);
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleRequestNotification = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPerm(perm);
    const isGranted = perm === 'granted';
    onUpdateSettings({
      hasNotificationPermission: isGranted,
      enablePushNotifications: isGranted,
    });
    if (isGranted) {
      setSyncFeedback('서비스워커 알림 권한이 허용되었습니다! 물주기 시점에 안내해 드립니다.');
    } else if (perm === 'denied') {
      setErrorMessage('브라우저에서 알림 권한이 차단되었습니다. 주소창의 사이트 설정에서 알림을 허용해주세요.');
    }
    setTimeout(() => {
      setSyncFeedback(null);
      setErrorMessage(null);
    }, 4000);
  };

  const handleSendTestPush = async () => {
    setIsSendingTestNotif(true);
    const res = await sendTestNotification();
    setIsSendingTestNotif(false);
    setNotificationPerm(getNotificationPermission());
    if (res.success) {
      setSyncFeedback(res.message);
      onUpdateSettings({ hasNotificationPermission: true });
    } else {
      setErrorMessage(res.message);
    }
    setTimeout(() => {
      setSyncFeedback(null);
      setErrorMessage(null);
    }, 4500);
  };

  const handleTogglePush = (enabled: boolean) => {
    setEnablePush(enabled);
    onUpdateSettings({ enablePushNotifications: enabled });
  };

  const handleExport = () => {
    const dataStr = exportBackupData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantarium_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncFeedback('JSON 백업 파일이 다운로드되었습니다.');
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const res = importBackupData(content);
          if (res.success) {
            const feedbackMsg = res.message || '백업 파일로부터 식물 데이터가 성공적으로 복원되었습니다.';
            onDataReload(feedbackMsg, 'success');
            setStorageStats(getStorageStats());
            setSyncFeedback(feedbackMsg);
            setTimeout(() => setSyncFeedback(null), 4500);
          } else {
            setErrorMessage(res.message);
            onDataReload(res.message, 'error');
            setTimeout(() => setErrorMessage(null), 4500);
          }
        }
      };
      reader.readAsText(file);
      // Reset input value so same file can be selected again
      e.target.value = '';
    }
  };

  const handleExecuteClearAll = () => {
    clearAllData();
    onDataReload('모든 식물 데이터가 삭제되었습니다.', 'info');
    setStorageStats(getStorageStats());
    setShowClearConfirm(false);
    setSyncFeedback('모든 식물 데이터가 삭제되었습니다.');
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleExecuteFactoryReset = () => {
    resetToFactoryState();
    onDataReload('초기 샘플 데이터로 복원되었습니다.', 'success');
    setStorageStats(getStorageStats());
    setShowFactoryResetConfirm(false);
    onClose();
  };

  const handleSaveUserName = () => {
    onUpdateSettings({
      userName: userName.trim() || '초록집사',
    });
  };

  return (
    <Modal
      id="settings-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="설정 & 데이터 관리"
      subtitle="웹 브라우저 로컬 저장소 기반"
      maxWidth="lg"
    >
      <div className="bg-[#F2F2F7]">
        {/* Feedback banners */}
        {syncFeedback && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-[#316E36] shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Settings Body */}
        <div className="p-5 space-y-4 break-keep">
          {/* Section 1: User Profile */}
          <div>
            <span className="text-xs font-bold text-gray-500 px-1 tracking-wider block mb-2 break-keep">
              🌱 식집사 프로필
            </span>
            <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="whitespace-nowrap">식집사 닉네임</span>
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onBlur={handleSaveUserName}
                  placeholder="식집사 이름을 입력하세요"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-sm font-bold text-gray-800 focus:border-[#316E36] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Plant Location Options Management */}
          <div>
            <span className="text-xs font-bold text-gray-500 px-1 tracking-wider block mb-2 break-keep">
              🏡 화분 배치 장소 관리
            </span>
            <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                식물을 둘 공간을 등록해두면 홈 화면에서 장소별로 모아볼 수 있어요.
              </p>

              {/* Location Chips with Delete Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {locations.map((loc) => (
                  <div
                    key={loc}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 flex items-center gap-2 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#316E36] shrink-0" />
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(loc)}
                      className="text-gray-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                      title={`${loc} 삭제`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Location Input */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newLocationInput}
                  onChange={(e) => setNewLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLocation();
                    }
                  }}
                  placeholder="새 장소 이름 입력 (예: 침실, 서재, 주방)"
                  className="flex-1 px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:border-[#316E36] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddLocation}
                  disabled={!newLocationInput.trim()}
                  className="px-3.5 py-2 bg-[#316E36] hover:bg-[#27592b] active:scale-[0.98] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>장소 추가</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Water Alarm & Notifications */}
          <div>
            <span className="text-xs font-bold text-gray-500 px-1 tracking-wider block mb-2 break-keep">
              🔔 물주기 알림 설정
            </span>
            <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3.5">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                  notificationPerm === 'granted'
                    ? 'bg-sky-50 border-sky-200 text-sky-600'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}>
                  <BellRing className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-bold text-gray-900">물주기 D-Day 알림 받기</h4>
                    {notificationPerm === 'granted' ? (
                      <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-[#316E36] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                        알림 켜짐
                      </span>
                    ) : notificationPerm === 'denied' ? (
                      <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-600 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                        알림 차단됨
                      </span>
                    ) : (
                      <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md font-medium shrink-0">
                        알림 꺼짐
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 break-keep leading-relaxed">
                    물이 필요한 날 아침에 스마트폰 알림으로 잊지 않게 챙겨드립니다.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-gray-200 space-y-2">
                <div className="flex gap-2">
                  {notificationPerm !== 'granted' ? (
                    <button
                      id="request-notif-permission-btn"
                      type="button"
                      onClick={handleRequestNotification}
                      className="flex-1 py-2.5 px-3 bg-[#316E36] hover:bg-[#27592b] text-white text-xs font-bold rounded-xl border border-[#27592b] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Bell className="w-3.5 h-3.5 shrink-0" />
                      <span>알림 허용하기</span>
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-between px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs font-semibold text-[#316E36]">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>알림 수신 대기 중</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTogglePush(!enablePush)}
                        className={`text-[11px] px-2 py-0.5 rounded-md border font-bold transition-colors cursor-pointer ${
                          enablePush
                            ? 'bg-white text-[#316E36] border-emerald-300'
                            : 'bg-gray-200 text-gray-600 border-gray-300'
                        }`}
                      >
                        {enablePush ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  )}

                  <button
                    id="send-test-push-btn"
                    type="button"
                    onClick={handleSendTestPush}
                    disabled={isSendingTestNotif}
                    className="py-2.5 px-3 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50"
                    title="지금 바로 스마트폰/브라우저로 테스트 알림을 발송합니다"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>{isSendingTestNotif ? '발송 중...' : '알림 시험 발송'}</span>
                  </button>
                </div>

                {/* Smartphone PWA Tip */}
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-gray-600 break-keep leading-normal">
                    <strong className="text-gray-800">스마트폰 팁:</strong> 모바일 브라우저 메뉴에서 <em>[홈 화면에 추가]</em>를 누르면 앱처럼 잠금화면 알림을 더욱 편리하게 받으실 수 있습니다.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Local Storage Status */}
          <div>
            <span className="text-xs font-bold text-gray-500 px-1 tracking-wider block mb-2 break-keep">
              🔒 내 기기 데이터 보관 현황
            </span>
            <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#316E36] flex items-center justify-center shrink-0 mt-0.5">
                  <Database className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-bold text-gray-900">내 기기 안전 저장</h4>
                    <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-[#316E36] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                      실시간 자동 저장
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 break-keep leading-relaxed">
                    모든 식물 사진과 성장 기록은 외부 유출 없이 현재 기기에 안전하게 보관됩니다.
                  </p>
                </div>
              </div>

              {/* Storage Data Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 text-center">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-400 block whitespace-nowrap">함께하는 식물</span>
                  <span className="text-xs font-bold text-gray-800 whitespace-nowrap">{storageStats.plantCount}개</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-400 block whitespace-nowrap">성장 일기 기록</span>
                  <span className="text-xs font-bold text-gray-800 whitespace-nowrap">{storageStats.diaryCount}건</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-400 block whitespace-nowrap">사용 중인 용량</span>
                  <span className="text-xs font-bold text-gray-800 whitespace-nowrap">{storageStats.estimatedSizeKb} KB</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-400">
                <span className="whitespace-nowrap">마지막 저장 시각</span>
                <span className="font-medium text-gray-600 whitespace-nowrap">
                  {storageStats.lastSavedAt
                    ? new Date(storageStats.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '실시간 자동 저장됨'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Backup & Restore */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />

            <ActionList title="💾 내 데이터 백업 및 관리">
              <ActionListItem
                id="export-backup-btn"
                icon={<Download className="w-4 h-4" />}
                iconBgColor="bg-emerald-50 text-[#316E36]"
                title="내 식물 데이터 파일로 백업하기"
                badge="파일 다운로드"
                badgeColor="bg-emerald-50 text-[#316E36] border border-emerald-200"
                onClick={handleExport}
              />

              <ActionListItem
                id="import-backup-btn"
                icon={<Upload className="w-4 h-4" />}
                iconBgColor="bg-sky-50 text-sky-600"
                title="백업 파일 가져와서 복원하기"
                badge="파일 선택"
                badgeColor="bg-sky-50 text-sky-700 border border-sky-200"
                onClick={() => fileInputRef.current?.click()}
              />

              <ActionListItem
                id="clear-all-data-btn"
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                iconBgColor="bg-rose-50 text-rose-500"
                title="등록된 식물 모두 비우기"
                badge="식물 삭제"
                badgeColor="bg-rose-50 text-rose-600 border border-rose-200"
                onClick={() => {
                  setShowClearConfirm(!showClearConfirm);
                  setShowFactoryResetConfirm(false);
                }}
                expandedContent={
                  showClearConfirm ? (
                    <div className="p-3 my-1 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5">
                      <div className="flex items-start gap-2 text-xs font-semibold text-rose-900">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>등록된 모든 식물 및 성장 기록이 삭제됩니다. (닉네임/설정은 유지됩니다)</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap cursor-pointer"
                        >
                          취소
                        </button>
                        <button
                          id="confirm-clear-all-btn"
                          type="button"
                          onClick={handleExecuteClearAll}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-xs cursor-pointer"
                        >
                          모든 식물 삭제
                        </button>
                      </div>
                    </div>
                  ) : null
                }
              />

              <ActionListItem
                id="factory-reset-btn"
                variant="warning"
                icon={<RotateCcw className="w-4 h-4" />}
                iconBgColor="bg-amber-50 text-amber-600"
                title="초기 상태로 되돌리기 (샘플 데이터 다시 불러오기)"
                badge="초기화"
                badgeColor="bg-amber-100 text-amber-800"
                onClick={() => {
                  setShowFactoryResetConfirm(!showFactoryResetConfirm);
                  setShowClearConfirm(false);
                }}
                expandedContent={
                  showFactoryResetConfirm ? (
                    <div className="p-3 my-1 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
                      <div className="flex items-start gap-2 text-xs font-semibold text-amber-950">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>식집사 닉네임과 환경 설정이 초기화되며 기본 샘플 식물로 재구성됩니다.</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setShowFactoryResetConfirm(false)}
                          className="px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap cursor-pointer"
                        >
                          취소
                        </button>
                        <button
                          id="confirm-factory-reset-btn"
                          type="button"
                          onClick={handleExecuteFactoryReset}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-xs cursor-pointer"
                        >
                          처음 상태로 복원
                        </button>
                      </div>
                    </div>
                  ) : null
                }
              />
            </ActionList>
          </div>

          {/* App Info Footer */}
          <div className="text-center text-xs text-gray-400 pt-2 space-y-1 break-keep">
            <p className="font-semibold text-gray-500 whitespace-nowrap">Plantarium Web App v1.0</p>
            <p className="text-[11px] whitespace-nowrap">D+ 일수 중심 미니멀 식물 아카이브</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
