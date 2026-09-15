// Service Worker for Plantarium PWA & Push Notifications
const CACHE_NAME = 'plantarium-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Incoming Web Push Notification (even when app is closed)
self.addEventListener('push', (event) => {
  let data = {
    title: '🌱 [물주기 알림] 플랜타리움',
    body: '식물에게 물을 줄 시간입니다. 잊지 말고 촉촉하게 챙겨주세요! 💧',
    plantId: undefined,
    tag: 'plantarium-watering',
    url: '/',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || 'plantarium-watering',
    data: {
      plantId: data.plantId,
      url: data.url || (data.plantId ? `/?plant=${data.plantId}` : '/'),
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const plantId = event.notification.data?.plantId;
  const targetUrl = event.notification.data?.url || (plantId ? `/?plant=${plantId}` : '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          if (plantId && client.postMessage) {
            client.postMessage({ type: 'SELECT_PLANT', plantId });
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Periodic Background Sync handler (Chromium/Android PWA)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'plantarium-water-check') {
    event.waitUntil(checkIndexedDBAndNotify());
  }
});

async function checkIndexedDBAndNotify() {
  try {
    const db = await openIDB();
    if (!db) return;

    const [plants, settings] = await Promise.all([
      getIdbKey(db, 'plants'),
      getIdbKey(db, 'settings'),
    ]);

    if (!settings || settings.enablePushNotifications === false) return;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const lastNotified = await getIdbKey(db, 'sw_last_notified_date');

    if (lastNotified === todayStr) return;

    // Check notification time
    const targetTime = settings.notificationTime || '09:00';
    const [targetHour, targetMin] = targetTime.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Only notify if current time is at or after target time
    if (currentHour < targetHour || (currentHour === targetHour && currentMin < targetMin)) {
      return;
    }

    if (!Array.isArray(plants) || plants.length === 0) return;

    // Filter plants needing water today or overdue
    const urgent = plants.filter((p) => {
      if (!p.lastWateredDate || !p.wateringCycle) return false;
      const last = new Date(p.lastWateredDate.slice(0, 10)).getTime();
      const today = new Date(todayStr).getTime();
      const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
      return diffDays >= p.wateringCycle;
    });

    if (urgent.length > 0) {
      let title = '';
      let body = '';
      let plantId = undefined;

      if (urgent.length === 1) {
        title = `🌱 [물주기 알림] ${urgent[0].name}`;
        body = `${urgent[0].name}에게 오늘 물을 줄 시간입니다. 💧`;
        plantId = urgent[0].id;
      } else {
        const names = urgent.slice(0, 2).map((p) => p.name).join(', ');
        title = `🌱 [물주기 알림] 총 ${urgent.length}개의 화분`;
        body = `${names} 등 ${urgent.length}개의 화분에 물주기가 필요합니다. 💧`;
      }

      await self.registration.showNotification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: `watering-${todayStr}`,
        data: { plantId, url: plantId ? `/?plant=${plantId}` : '/' },
      });

      await setIdbKey(db, 'sw_last_notified_date', todayStr);
    }
  } catch (err) {
    console.warn('[SW] Periodic sync check failed:', err);
  }
}

function openIDB() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open('plantarium_indexed_db', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function getIdbKey(db, key) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('app_data', 'readonly');
      const store = tx.objectStore('app_data');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function setIdbKey(db, key, val) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('app_data', 'readwrite');
      const store = tx.objectStore('app_data');
      const req = store.put(val, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// Listen for messages from client app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [200, 100, 200],
      ...options,
    });
  }
});
