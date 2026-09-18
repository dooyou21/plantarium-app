import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import webpush from 'web-push';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  setLogLevel,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  type Firestore,
} from 'firebase/firestore';

// Silence Firestore internal log warnings to prevent unhandled gRPC ECONNRESET messages in server logs
setLogLevel('silent');

const PORT = 3000;
const VAPID_KEYS_FILE = path.join(process.cwd(), '.vapid-keys.json');
const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'data', 'push_subscriptions.json');

// Ensure data directory exists for local disk backup
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 1. Initialize VAPID Keys: Priority to Environment Variables (Render & Cloud config)
let vapidKeys: { publicKey: string; privateKey: string };
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
  console.log('[VAPID] Successfully loaded VAPID keys from environment variables.');
} else {
  try {
    if (fs.existsSync(VAPID_KEYS_FILE)) {
      const raw = fs.readFileSync(VAPID_KEYS_FILE, 'utf-8');
      vapidKeys = JSON.parse(raw);
    } else {
      vapidKeys = webpush.generateVAPIDKeys();
      fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Failed to load vapid keys from file, generating in-memory keys:', err);
    vapidKeys = webpush.generateVAPIDKeys();
  }
}

const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@plantarium.app';
webpush.setVapidDetails(
  vapidSubject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// 2. Initialize Firebase Firestore for Persistent Cloud Storage
let firestoreDb: Firestore | null = null;
function initFirestore(): Firestore | null {
  try {
    const configFile = path.join(process.cwd(), 'firebase-applet-config.json');
    let fileConfig: any = {};
    if (fs.existsSync(configFile)) {
      try {
        fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      } catch {}
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || fileConfig.projectId || 'plantarium-506514';
    const apiKey = process.env.FIREBASE_API_KEY || fileConfig.apiKey || '';
    const authDomain = process.env.FIREBASE_AUTH_DOMAIN || fileConfig.authDomain || `${projectId}.firebaseapp.com`;
    const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || fileConfig.firestoreDatabaseId || 'ai-studio-plantarium-2ad6b567-2ea5-44ca-a6c2-7474b5e96896';

    if (projectId && apiKey) {
      const app = getApps().length === 0
        ? initializeApp({ projectId, apiKey, authDomain })
        : getApp();

      // Configure Firestore with experimentalForceLongPolling to eliminate persistent gRPC Listen stream resets in Node.js
      const db = initializeFirestore(
        app,
        { experimentalForceLongPolling: true },
        databaseId && databaseId !== '(default)' ? databaseId : undefined
      );

      console.log(`[Firebase] Initialized Cloud Firestore (HTTP long-polling) for project: ${projectId}, database: ${databaseId}`);
      return db;
    }
  } catch (err) {
    console.warn('[Firebase] Firestore initialization failed, falling back to local storage:', err);
  }
  return null;
}

firestoreDb = initFirestore();

export interface PlantReminderItem {
  id: string;
  name: string;
  species?: string;
  nextWaterDate: string; // YYYY-MM-DD
}

export interface PushSubscriptionRecord {
  endpoint: string;
  subscription: webpush.PushSubscription;
  clientTimezone: string;
  notificationTime: string; // "09:00"
  enabled: boolean;
  lastNotifiedDate: string; // YYYY-MM-DD
  plants: PlantReminderItem[];
  updatedAt: number;
}

let subscriptions: PushSubscriptionRecord[] = [];

function getDocIdForEndpoint(endpoint: string): string {
  return crypto.createHash('sha256').update(endpoint).digest('hex');
}

function saveSubscriptionsLocal() {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save subscriptions to local disk:', err);
  }
}

async function persistSubscription(sub: PushSubscriptionRecord) {
  saveSubscriptionsLocal();

  if (firestoreDb) {
    try {
      const docId = getDocIdForEndpoint(sub.endpoint);
      await setDoc(doc(firestoreDb, 'push_subscriptions', docId), sub);
    } catch (err) {
      console.warn('[Firebase] Failed to write push subscription to Firestore:', err);
    }
  }
}

async function removeSubscription(endpoint: string) {
  subscriptions = subscriptions.filter((s) => s.endpoint !== endpoint);
  saveSubscriptionsLocal();

  if (firestoreDb) {
    try {
      const docId = getDocIdForEndpoint(endpoint);
      await deleteDoc(doc(firestoreDb, 'push_subscriptions', docId));
    } catch (err) {
      console.warn('[Firebase] Failed to delete push subscription from Firestore:', err);
    }
  }
}

async function loadAllSubscriptions() {
  // 1. Initial baseline from local disk file
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      subscriptions = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load subscriptions file:', err);
    subscriptions = [];
  }

  // 2. Sync from Firebase Firestore if connected
  if (firestoreDb) {
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, 'push_subscriptions'));
      const remoteSubs: PushSubscriptionRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as PushSubscriptionRecord;
        if (data && data.endpoint && data.subscription) {
          remoteSubs.push(data);
        }
      });

      if (remoteSubs.length > 0) {
        const map = new Map<string, PushSubscriptionRecord>();
        for (const s of subscriptions) map.set(s.endpoint, s);
        for (const s of remoteSubs) map.set(s.endpoint, s);
        subscriptions = Array.from(map.values());
        saveSubscriptionsLocal();
        console.log(`[Firebase] Loaded & synchronized ${remoteSubs.length} subscriptions from Firestore`);
      }
    } catch (err: any) {
      console.warn('[Firebase] Firestore subscription sync notice (using local cache/disk):', err?.message || err);
    }
  }
}

// Helper to send a Web Push notification
async function sendPushToSubscription(
  sub: PushSubscriptionRecord,
  payload: { title: string; body: string; plantId?: string; tag?: string; url?: string }
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      sub.subscription,
      JSON.stringify(payload)
    );
    return true;
  } catch (err: any) {
    console.error('[Push Error]', err?.statusCode, err?.message);
    // If endpoint is no longer valid (404 / 410 Gone), remove subscription permanently
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await removeSubscription(sub.endpoint);
    }
    return false;
  }
}

interface DispatchDiagnostic {
  endpointMasked: string;
  timezone: string;
  localTime: string;
  targetTime: string;
  lastNotifiedDate: string;
  isTimeDue: boolean;
  notifiedToday: boolean;
  urgentPlantsCount: number;
  dispatched: boolean;
  reason: string;
}

// Background scheduler: checks every 30 seconds
async function checkAndDispatchPushNotifications(options: { force?: boolean; reloadFromDb?: boolean } = {}): Promise<{
  dispatchedCount: number;
  diagnostics: DispatchDiagnostic[];
}> {
  if (options.force || options.reloadFromDb || subscriptions.length === 0) {
    await loadAllSubscriptions();
  }

  const now = new Date();
  let dispatchedCount = 0;
  const diagnostics: DispatchDiagnostic[] = [];
  const force = !!options.force;

  for (const sub of subscriptions) {
    if (!sub.enabled && !force) {
      diagnostics.push({
        endpointMasked: sub.endpoint.slice(-12),
        timezone: sub.clientTimezone || 'Asia/Seoul',
        localTime: '',
        targetTime: sub.notificationTime || '09:00',
        lastNotifiedDate: sub.lastNotifiedDate || 'none',
        isTimeDue: false,
        notifiedToday: false,
        urgentPlantsCount: (sub.plants || []).length,
        dispatched: false,
        reason: '알림 설정이 비활성화(OFF) 상태입니다.',
      });
      continue;
    }

    const tz = sub.clientTimezone || 'Asia/Seoul';
    let localTimeStr = '';
    let localDateStr = '';

    try {
      const formatterTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      localTimeStr = formatterTime.format(now);

      const formatterDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      localDateStr = formatterDate.format(now);
    } catch {
      localTimeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
      localDateStr = now.toISOString().slice(0, 10);
    }

    const targetTime = sub.notificationTime || '09:00';
    // Has the scheduled notification time arrived or passed for today?
    const isTimeDue = localTimeStr >= targetTime;
    const notifiedToday = sub.lastNotifiedDate === localDateStr;

    const urgentPlants = (sub.plants || []).filter((p) => {
      return p.nextWaterDate <= localDateStr;
    });

    // Determine if we should dispatch
    if (force || (isTimeDue && !notifiedToday)) {
      if (urgentPlants.length > 0) {
        let title = '';
        let body = '';
        let plantId: string | undefined;

        if (urgentPlants.length === 1) {
          const plant = urgentPlants[0];
          title = `🌱 [물주기 알림] ${plant.name}`;
          body = `${plant.name}에게 오늘 물을 줄 시간입니다. 잊지 말고 촉촉하게 챙겨주세요! 💧`;
          plantId = plant.id;
        } else {
          const names = urgentPlants.slice(0, 2).map((p) => p.name).join(', ');
          const count = urgentPlants.length;
          title = `🌱 [물주기 알림] 총 ${count}개의 화분`;
          body = `${names} 등 ${count}개의 화분에 물주기가 필요합니다. 잊지 말고 촉촉하게 챙겨주세요! 💧`;
        }

        const sent = await sendPushToSubscription(sub, {
          title,
          body,
          plantId,
          tag: `watering-${localDateStr}`,
          url: plantId ? `/?plant=${plantId}` : '/',
        });

        if (sent) {
          dispatchedCount++;
          if (!force) sub.lastNotifiedDate = localDateStr;
          await persistSubscription(sub);
          diagnostics.push({
            endpointMasked: sub.endpoint.slice(-12),
            timezone: tz,
            localTime: localTimeStr,
            targetTime,
            lastNotifiedDate: sub.lastNotifiedDate,
            isTimeDue,
            notifiedToday,
            urgentPlantsCount: urgentPlants.length,
            dispatched: true,
            reason: `물줄 식물 ${urgentPlants.length}건에 대해 푸시 알림이 발송되었습니다.`,
          });
        } else {
          diagnostics.push({
            endpointMasked: sub.endpoint.slice(-12),
            timezone: tz,
            localTime: localTimeStr,
            targetTime,
            lastNotifiedDate: sub.lastNotifiedDate,
            isTimeDue,
            notifiedToday,
            urgentPlantsCount: urgentPlants.length,
            dispatched: false,
            reason: 'Web Push 전송 실패 (브라우저 푸시 서버 오류 또는 만료된 구독)',
          });
        }
      } else {
        // No urgent plants today
        if (force) {
          // In force test mode, send a confirmation push anyway
          const sent = await sendPushToSubscription(sub, {
            title: '🌱 [알림 테스트] 플랜타리움',
            body: '모든 식물이 촉촉하게 관리되고 있습니다! cron-job 및 푸시 연동이 완벽하게 정상 동작 중입니다. 💧',
            tag: 'cron-force-test',
            url: '/',
          });
          if (sent) dispatchedCount++;
          diagnostics.push({
            endpointMasked: sub.endpoint.slice(-12),
            timezone: tz,
            localTime: localTimeStr,
            targetTime,
            lastNotifiedDate: sub.lastNotifiedDate,
            isTimeDue,
            notifiedToday,
            urgentPlantsCount: 0,
            dispatched: sent,
            reason: '강제(Force) 모드: 오늘 물줄 식물이 없으나 테스트 푸시를 발송했습니다.',
          });
        } else {
          // Normal mode: mark as checked today so we don't re-check unnecessarily
          sub.lastNotifiedDate = localDateStr;
          await persistSubscription(sub);
          diagnostics.push({
            endpointMasked: sub.endpoint.slice(-12),
            timezone: tz,
            localTime: localTimeStr,
            targetTime,
            lastNotifiedDate: sub.lastNotifiedDate,
            isTimeDue,
            notifiedToday,
            urgentPlantsCount: 0,
            dispatched: false,
            reason: '설정 시간 도달했으나 오늘 물주기가 필요한 식물이 없습니다.',
          });
        }
      }
    } else {
      let skipReason = '';
      if (notifiedToday) {
        skipReason = `오늘(${localDateStr}) 이미 알림이 발송 완료되었습니다.`;
      } else if (!isTimeDue) {
        skipReason = `현재 시각(${localTimeStr})이 설정된 알림 시간(${targetTime}) 이전입니다.`;
      }
      diagnostics.push({
        endpointMasked: sub.endpoint.slice(-12),
        timezone: tz,
        localTime: localTimeStr,
        targetTime,
        lastNotifiedDate: sub.lastNotifiedDate,
        isTimeDue,
        notifiedToday,
        urgentPlantsCount: urgentPlants.length,
        dispatched: false,
        reason: skipReason,
      });
    }
  }

  return { dispatchedCount, diagnostics };
}

// Start background cron scheduler (runs every 30 seconds for 24/7 server)
setInterval(() => {
  checkAndDispatchPushNotifications().catch((err) => {
    console.error('Error during scheduled push check:', err);
  });
}, 30 * 1000);

async function startServer() {
  await loadAllSubscriptions();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'plantarium',
      subscriptionsCount: subscriptions.length,
      storage: firestoreDb ? 'firestore' : 'local_file_backup',
      serverTime: new Date().toISOString(),
    });
  });

  // 1. Get VAPID Public Key for client subscription
  app.get('/api/notifications/vapid-public-key', (_req, res) => {
    res.json({
      publicKey: vapidKeys.publicKey,
    });
  });

  // 2. Subscribe or update push notification settings
  app.post('/api/notifications/subscribe', async (req, res) => {
    const { subscription, clientTimezone, notificationTime, enabled, plants } = req.body;

    if (!subscription || !subscription.endpoint) {
      res.status(400).json({ error: 'Missing subscription endpoint' });
      return;
    }

    const endpoint = subscription.endpoint;
    const existingIndex = subscriptions.findIndex((s) => s.endpoint === endpoint);

    const record: PushSubscriptionRecord = {
      endpoint,
      subscription,
      clientTimezone: clientTimezone || 'Asia/Seoul',
      notificationTime: notificationTime || '09:00',
      enabled: enabled !== false,
      lastNotifiedDate: existingIndex >= 0 ? subscriptions[existingIndex].lastNotifiedDate : '',
      plants: Array.isArray(plants) ? plants : [],
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      subscriptions[existingIndex] = record;
    } else {
      subscriptions.push(record);
    }

    await persistSubscription(record);

    res.json({
      success: true,
      message: '푸시 알림 구독이 등록되었습니다.',
      storage: firestoreDb ? 'firestore' : 'local_file_backup',
      notificationTime: record.notificationTime,
    });
  });

  // 3. Sync schedule (plants changes, notificationTime update, or toggle)
  app.post('/api/notifications/sync-schedule', async (req, res) => {
    const { endpoint, subscription, clientTimezone, notificationTime, enabled, plants } = req.body;

    if (!endpoint) {
      res.status(400).json({ error: 'Missing endpoint' });
      return;
    }

    let sub = subscriptions.find((s) => s.endpoint === endpoint);
    if (!sub) {
      await loadAllSubscriptions();
      sub = subscriptions.find((s) => s.endpoint === endpoint);
    }

    if (sub) {
      if (subscription) sub.subscription = subscription;
      if (clientTimezone) sub.clientTimezone = clientTimezone;
      if (notificationTime) sub.notificationTime = notificationTime;
      if (typeof enabled === 'boolean') sub.enabled = enabled;
      if (Array.isArray(plants)) sub.plants = plants;
      sub.updatedAt = Date.now();
      await persistSubscription(sub);
    } else if (subscription && subscription.endpoint) {
      // Auto-upsert subscription if full object is passed
      const newRecord: PushSubscriptionRecord = {
        endpoint,
        subscription,
        clientTimezone: clientTimezone || 'Asia/Seoul',
        notificationTime: notificationTime || '09:00',
        enabled: enabled !== false,
        lastNotifiedDate: '',
        plants: Array.isArray(plants) ? plants : [],
        updatedAt: Date.now(),
      };
      subscriptions.push(newRecord);
      await persistSubscription(newRecord);
      sub = newRecord;
    }

    res.json({
      success: true,
      updated: !!sub,
      subscriptionsCount: subscriptions.length,
      storage: firestoreDb ? 'firestore' : 'local_file_backup',
    });
  });

  // 4. Send test push notification immediately
  app.post('/api/notifications/test-push', async (req, res) => {
    const { endpoint, subscription } = req.body;

    let targetSub: PushSubscriptionRecord | undefined;
    if (endpoint) {
      targetSub = subscriptions.find((s) => s.endpoint === endpoint);
      if (!targetSub) {
        await loadAllSubscriptions();
        targetSub = subscriptions.find((s) => s.endpoint === endpoint);
      }
    }
    
    if (!targetSub && subscription && subscription.endpoint) {
      targetSub = {
        endpoint: subscription.endpoint,
        subscription,
        clientTimezone: 'Asia/Seoul',
        notificationTime: '09:00',
        enabled: true,
        lastNotifiedDate: '',
        plants: [],
        updatedAt: Date.now(),
      };
      subscriptions.push(targetSub);
      await persistSubscription(targetSub);
    }

    if (!targetSub && subscriptions.length > 0) {
      targetSub = subscriptions[subscriptions.length - 1];
    }

    if (!targetSub) {
      res.status(400).json({
        success: false,
        message: '등록된 푸시 알림 구독이 없습니다. 브라우저에서 먼저 알림 권한을 허용해주세요.',
      });
      return;
    }

    const ok = await sendPushToSubscription(targetSub, {
      title: '🌱 플랜타리움 스마트 알림',
      body: '백그라운드 푸시 알림이 정상 연동되었습니다! 앱을 닫아두어도 설정하신 시간에 물주기 알림이 전송됩니다. 💧',
      tag: 'test-push',
      url: '/',
    });

    if (ok) {
      res.json({
        success: true,
        message: '테스트 푸시 알림이 성공적으로 전송되었습니다! 상단 알림창 또는 잠금화면을 확인해보세요.',
      });
    } else {
      res.status(500).json({
        success: false,
        message: '푸시 알림 전송 중 오류가 발생했습니다. 브라우저 알림 권한을 확인해주세요.',
      });
    }
  });

  // 5. Cron & Keep-Alive Ping endpoint (compatible with cron-job.org or external scheduler)
  app.all(['/api/cron', '/api/ping'], async (req, res) => {
    // Always refresh latest subscriptions from Firestore / disk before executing cron checks
    await loadAllSubscriptions();
    const force = req.query.force === 'true' || req.query.force === '1' || req.body?.force === true;
    const { dispatchedCount, diagnostics } = await checkAndDispatchPushNotifications({ force, reloadFromDb: true });

    res.json({
      status: 'ok',
      mode: force ? 'FORCE_TEST' : 'SCHEDULED_CHECK',
      message: force
        ? '강제 즉시 발송(Force) 모드로 실행되었습니다.'
        : '정기 스케줄 검사가 완료되었습니다.',
      serverTime: new Date().toISOString(),
      subscriptionsCount: subscriptions.length,
      dispatched: dispatchedCount,
      storage: firestoreDb ? 'firestore' : 'local_file_backup',
      hint:
        subscriptions.length === 0
          ? '⚠️ 현재 서버에 등록된 푸시 구독 기기가 0대입니다. 배포된 웹사이트(Render 도메인)에 접속하여 [설정] > [알림 허용/켜기]를 먼저 완료해주세요.'
          : '✅ 등록된 푸시 기기가 정상적으로 존재합니다.',
      details: diagnostics,
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Plantarium server running on port ${PORT}`);
  });
}

startServer();
