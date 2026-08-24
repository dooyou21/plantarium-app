import { Plant, UserSettings } from '../types';
import { calculateWateringStats } from '../utils/dateUtils';

let swRegistration: ServiceWorkerRegistration | null = null;

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
        data: { plantId },
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
      data: { plantId },
    });
    return true;
  } catch (err) {
    console.error('Notification API invocation error:', err);
    return false;
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
      message: '브라우저 설정에서 알림 권한이 차단되어 있습니다. 브라우저 주소창 좌측 자물쇠 아이콘에서 알림을 허용해주세요.',
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
 * Check overdue plants and trigger notification if due today and not yet notified
 */
export function checkPlantsAndNotify(plants: Plant[], settings: UserSettings): void {
  if (!settings.hasNotificationPermission || getNotificationPermission() !== 'granted') {
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const lastCheckKey = 'plantarium_last_notification_check';
  const lastCheckDate = localStorage.getItem(lastCheckKey);

  // Avoid notifying multiple times on the same date unless forced
  if (lastCheckDate === todayStr) {
    return;
  }

  const urgentPlants = plants.filter((plant) => {
    const stats = calculateWateringStats(plant);
    return stats.urgency >= 1.0; // Needs water today or overdue
  });

  if (urgentPlants.length === 0) return;

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
