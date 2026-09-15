import { Plant, UserSettings } from '../types';
import { calculateWateringStats } from '../utils/dateUtils';

let swRegistration: ServiceWorkerRegistration | null = null;
let scheduledTimerId: ReturnType<typeof setTimeout> | null = null;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function calculateNextWaterDate(plant: { lastWateredDate: string; wateringCycle: number }): string {
  if (!plant.lastWateredDate) return new Date().toISOString().slice(0, 10);
  const d = new Date(plant.lastWateredDate.slice(0, 10));
  d.setDate(d.getDate() + (plant.wateringCycle || 7));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Register the Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[Notification] Service Worker not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    swRegistration = registration;
    console.log('[Notification] Service Worker registered successfully:', registration.scope);
    return registration;
  } catch (error) {
    console.warn('[Notification] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Check if Web Notifications are supported
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

/**
 * Get current notification permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return Notification.permission;
  }
}

interface PushNotificationOptions {
  title: string;
  body: string;
  plantId?: string;
  tag?: string;
  badge?: string;
}

/**
 * Send a notification through Service Worker or standard Notification API
 */
export async function sendPushNotification({
  title,
  body,
  plantId,
  tag = 'plantarium-notice',
}: PushNotificationOptions): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  if (Notification.permission !== 'granted') {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return false;
  }

  // 1. Try sending through Service Worker
  try {
    let reg = swRegistration;
    if (!reg && 'serviceWorker' in navigator) {
      reg = await navigator.serviceWorker.ready;
    }

    if (reg && 'showNotification' in reg) {
      await reg.showNotification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag,
        data: { plantId, url: plantId ? `/?plant=${plantId}` : '/' },
      });
      return true;
    }
  } catch (err) {
    console.warn('Service Worker notification failed, falling back to window.Notification:', err);
  }

  // 2. Fallback to standard Window Notification
  try {
    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag,
      data: { plantId, url: plantId ? `/?plant=${plantId}` : '/' },
    });
    return true;
  } catch (err) {
    console.error('Notification API invocation error:', err);
    return false;
  }
}

/**
 * Subscribe to Web Push Service on the server for background delivery even when app is closed
 */
export async function subscribeToPushService(
  settings: UserSettings,
  plants: Plant[]
): Promise<{ success: boolean; subscription?: PushSubscription; message?: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, message: '푸시 알림을 지원하지 않는 브라우저 환경입니다.' };
  }

  let reg = swRegistration;
  if (!reg) {
    reg = await registerServiceWorker();
  }
  if (!reg) {
    return { success: false, message: '서비스 워커 등록에 실패했습니다.' };
  }

  // Register Periodic Background Sync if supported (Chromium / Android PWA)
  if ('periodicSync' in reg) {
    try {
      await (reg as any).periodicSync.register('plantarium-water-check', {
        minInterval: 60 * 60 * 1000,
      });
    } catch {
      // Silent catch
    }
  }

  try {
    const res = await fetch('/api/notifications/vapid-public-key');
    if (!res.ok) throw new Error('VAPID 키 발급에 실패했습니다.');
    const { publicKey } = await res.json();

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const plantReminders = plants.map((p) => ({
      id: p.id,
      name: p.name,
      species: p.species,
      nextWaterDate: calculateNextWaterDate(p),
    }));

    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';

    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub,
        clientTimezone,
        notificationTime: settings.notificationTime || '09:00',
        enabled: settings.enablePushNotifications !== false,
        plants: plantReminders,
      }),
    });

    return { success: true, subscription: sub };
  } catch (err: any) {
    console.warn('Push subscription failed:', err);
    return { success: false, message: err?.message || '푸시 서버 등록에 실패했습니다.' };
  }
}

/**
 * Sync push schedule (plants, notificationTime, enabled status) with backend
 */
export async function syncPushSchedule(settings: UserSettings, plants: Plant[]): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();

    if (!sub) {
      if (settings.hasNotificationPermission && settings.enablePushNotifications !== false) {
        await subscribeToPushService(settings, plants);
      }
      return;
    }

    const plantReminders = plants.map((p) => ({
      id: p.id,
      name: p.name,
      species: p.species,
      nextWaterDate: calculateNextWaterDate(p),
    }));

    await fetch('/api/notifications/sync-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
        notificationTime: settings.notificationTime || '09:00',
        enabled: settings.enablePushNotifications !== false,
        plants: plantReminders,
      }),
    });
  } catch (err) {
    console.warn('Failed to sync push schedule:', err);
  }
}

/**
 * Send an immediate test notification to verify Service Worker & Push functionality
 */
export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  if (!isNotificationSupported()) {
    return {
      success: false,
      message: '현재 브라우저 환경에서는 웹 알림(Notification API)을 지원하지 않습니다.',
    };
  }

  if (Notification.permission === 'denied') {
    return {
      success: false,
      message: '브라우저 설정에서 알림 권한이 차단되어 있습니다. 브라우저 주소창 좌측 사이트 설정에서 알림을 허용해주세요.',
    };
  }

  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      return {
        success: false,
        message: '알림 권한이 허용되지 않았습니다.',
      };
    }
  }

  // First attempt: Real server-side Web Push
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const resp = await fetch('/api/notifications/test-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        const result = await resp.json();
        if (result.success) {
          return {
            success: true,
            message: result.message || '테스트 푸시 알림이 발송되었습니다! 알림창을 확인해보세요.',
          };
        }
      }
    }
  } catch (err) {
    console.warn('Server test push failed, falling back to local notification:', err);
  }

  // Fallback: Local push notification via Service Worker
  const ok = await sendPushNotification({
    title: '🌱 플랜타리움 스마트 물주기 알림',
    body: '알림이 정상적으로 연동되었습니다! 물주기 타이밍이 되면 스마트폰으로 안내해 드릴게요. 💧',
    tag: 'test-notification',
  });

  if (ok) {
    return {
      success: true,
      message: '테스트 알림이 성공적으로 전송되었습니다! 상단 알림창을 확인해보세요.',
    };
  } else {
    return {
      success: false,
      message: '알림 전송 중 오류가 발생했습니다.',
    };
  }
}

/**
 * Check overdue plants according to user's configured notificationTime
 * - Avoids annoying popups immediately on entering the app if it's before notificationTime
 * - If before notificationTime, schedules a timer for the exact target time today
 * - If at or after notificationTime, dispatches if not yet notified today
 */
export function checkPlantsAndNotify(plants: Plant[], settings: UserSettings, forceExactTime = false): void {
  if (!settings.hasNotificationPermission || getNotificationPermission() !== 'granted' || settings.enablePushNotifications === false) {
    return;
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const lastCheckKey = 'plantarium_last_notification_check';
  const lastCheckDate = localStorage.getItem(lastCheckKey);

  // Avoid notifying multiple times on the same date
  if (lastCheckDate === todayStr) {
    return;
  }

  const targetTime = settings.notificationTime || '09:00';
  const [targetHour, targetMin] = targetTime.split(':').map(Number);
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const isTimeArrived = currentHour > targetHour || (currentHour === targetHour && currentMin >= targetMin);

  // If entering the app before the user-configured notification time (e.g. 08:30 < 09:00):
  // DO NOT show immediate notification! Instead, schedule for the target time today.
  if (!isTimeArrived && !forceExactTime) {
    if (scheduledTimerId) {
      clearTimeout(scheduledTimerId);
      scheduledTimerId = null;
    }

    const targetDate = new Date();
    targetDate.setHours(targetHour, targetMin, 0, 0);
    const msUntilTarget = targetDate.getTime() - now.getTime();

    if (msUntilTarget > 0 && msUntilTarget < 24 * 60 * 60 * 1000) {
      scheduledTimerId = setTimeout(() => {
        checkPlantsAndNotify(plants, settings, true);
      }, msUntilTarget);
    }
    return;
  }

  const urgentPlants = plants.filter((plant) => {
    const stats = calculateWateringStats(plant);
    return stats.urgency >= 1.0; // Needs water today or overdue
  });

  if (urgentPlants.length === 0) {
    // Record today as checked so we don't repeat checks today
    localStorage.setItem(lastCheckKey, todayStr);
    return;
  }

  if (urgentPlants.length === 1) {
    const plant = urgentPlants[0];
    const stats = calculateWateringStats(plant);
    const message = stats.daysRemaining <= 0
      ? `${plant.name}의 물주기 시기입니다! (${Math.abs(stats.daysRemaining)}일 지남)`
      : `${plant.name}에게 오늘 물을 줄 시간입니다. 💧`;

    sendPushNotification({
      title: `🌱 [물주기 알림] ${plant.name}`,
      body: message,
      plantId: plant.id,
      tag: `watering-${plant.id}`,
    });
  } else {
    const plantNames = urgentPlants.slice(0, 2).map((p) => p.name).join(', ');
    const count = urgentPlants.length;
    sendPushNotification({
      title: `🌱 [물주기 알림] 총 ${count}개의 화분`,
      body: `${plantNames} 등 ${count}개의 화분에 물주기가 필요합니다. 잊지 말고 촉촉하게 챙겨주세요! 💧`,
      tag: 'watering-multiple',
    });
  }

  localStorage.setItem(lastCheckKey, todayStr);
}
