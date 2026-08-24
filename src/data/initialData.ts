import { Plant, DiaryEntry, UserSettings } from '../types';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  userName: '초록집사',
  autoSaveEnabled: true,
  hasCompletedOnboarding: false,
  hasPhotoPermission: true,
  hasNotificationPermission: false,
  enablePushNotifications: true,
  notificationTime: '09:00',
  lastSavedAt: new Date().toISOString(),
  lastSyncedAt: new Date().toISOString(),
  locations: ['거실', '베란다'],
  indoorTemp: 24.2,
  indoorHumidity: 58,
};

export const PLANT_PRESET_IMAGES = [
  {
    name: '몬스테라 (Monstera)',
    url: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    species: '몬스테라 델리시오사',
    defaultCycle: 10,
    location: '거실 창가',
  },
  {
    name: '올리브나무 (Olive Tree)',
    url: 'https://images.unsplash.com/photo-1598880940371-c756e015fea1?auto=format&fit=crop&w=800&q=80',
    species: '올리브 (Olea europaea)',
    defaultCycle: 7,
    location: '남향 베란다',
  },
  {
    name: '알로카시아 (Alocasia)',
    url: 'https://images.unsplash.com/photo-1597055181300-e3633a917c9c?auto=format&fit=crop&w=800&q=80',
    species: '알로카시아 오도라',
    defaultCycle: 12,
    location: '서재 테이블',
  },
  {
    name: '스킨답서스 (Pothos)',
    url: 'https://images.unsplash.com/photo-1572688484438-313a6e50c333?auto=format&fit=crop&w=800&q=80',
    species: '에피프레넘 아우레움',
    defaultCycle: 8,
    location: '주방 선반',
  },
  {
    name: '여인초 (Bird of Paradise)',
    url: 'https://images.unsplash.com/photo-1584589167171-541ce45f1eea?auto=format&fit=crop&w=800&q=80',
    species: '극락조화과 스트렐리치아',
    defaultCycle: 14,
    location: '침실 코너',
  },
  {
    name: '산세베리아 (Snake Plant)',
    url: 'https://images.unsplash.com/photo-1593482892290-f54927ae1bf6?auto=format&fit=crop&w=800&q=80',
    species: '산세베리아 트리파시아타',
    defaultCycle: 21,
    location: '현관 입구',
  },
  {
    name: '피커스 벤자민 (Ficus)',
    url: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=800&q=80',
    species: '벤자민 고무나무',
    defaultCycle: 9,
    location: '거실 TV 옆',
  },
];

// Reference date relative offsets for initial setup
function getDateAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const INITIAL_PLANTS: Plant[] = [
  {
    id: 'plant-1',
    name: '몬스테라 델리시오사',
    species: 'Monstera deliciosa',
    wateringCycle: 10,
    lastWateredDate: getDateAgo(12), // 12 days ago (Urgency: 120% - Overdue)
    adoptedDate: getDateAgo(186),
    location: '거실 창가',
    imageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=900&q=80',
    sunlight: 'indirect',
    ventilation: 'normal',
    notes: '겉흙이 마르면 듬뿍 주기. 공중 습도를 좋아해서 아침마다 분무해주면 새 잎이 잘 나와요.',
    lastFertilizedDate: getDateAgo(25),
    lastRepottedDate: getDateAgo(90),
    createdAt: getDateAgo(186),
    wateringHistory: [
      getDateAgo(56),
      getDateAgo(46),
      getDateAgo(35),
      getDateAgo(24),
      getDateAgo(12),
    ],
  },
  {
    id: 'plant-2',
    name: '올리브나무',
    species: 'Olea europaea',
    wateringCycle: 7,
    lastWateredDate: getDateAgo(7), // 7 days ago (Urgency: 100% - Due today)
    adoptedDate: getDateAgo(92),
    location: '남향 베란다',
    imageUrl: 'https://images.unsplash.com/photo-1598880940371-c756e015fea1?auto=format&fit=crop&w=900&q=80',
    sunlight: 'direct',
    ventilation: 'high',
    notes: '직사광선과 통풍이 필수. 과습에 약하므로 화분 밑으로 물이 빠져나갈 때까지 충분히 주기.',
    lastFertilizedDate: getDateAgo(14),
    createdAt: getDateAgo(92),
    wateringHistory: [
      getDateAgo(35),
      getDateAgo(28),
      getDateAgo(21),
      getDateAgo(14),
      getDateAgo(7),
    ],
  },
  {
    id: 'plant-3',
    name: '알로카시아 오도라',
    species: 'Alocasia odora',
    wateringCycle: 14,
    lastWateredDate: getDateAgo(9), // 9 days ago (Urgency: 64% - OK)
    adoptedDate: getDateAgo(310),
    location: '서재 테이블',
    imageUrl: 'https://images.unsplash.com/photo-1597055181300-e3633a917c9c?auto=format&fit=crop&w=900&q=80',
    sunlight: 'indirect',
    ventilation: 'high',
    notes: '무름병에 주의. 구근에 물이 닿지 않게 테두리 위주로 물주기.',
    lastFertilizedDate: getDateAgo(40),
    createdAt: getDateAgo(310),
    wateringHistory: [
      getDateAgo(65),
      getDateAgo(51),
      getDateAgo(37),
      getDateAgo(23),
      getDateAgo(9),
    ],
  },
  {
    id: 'plant-4',
    name: '스킨답서스 마블퀸',
    species: 'Epipremnum aureum',
    wateringCycle: 8,
    lastWateredDate: getDateAgo(1), // 1 day ago (Urgency: 12% - Fresh)
    adoptedDate: getDateAgo(420),
    location: '주방 선반',
    imageUrl: 'https://images.unsplash.com/photo-1572688484438-313a6e50c333?auto=format&fit=crop&w=900&q=80',
    sunlight: 'low',
    ventilation: 'normal',
    notes: '늘어지며 자라는 줄기가 매력적. 물꽂이로 번식이 매우 쉬움.',
    lastFertilizedDate: getDateAgo(8),
    createdAt: getDateAgo(420),
    wateringHistory: [
      getDateAgo(33),
      getDateAgo(25),
      getDateAgo(17),
      getDateAgo(9),
      getDateAgo(1),
    ],
  },
  {
    id: 'plant-5',
    name: '여인초',
    species: 'Strelitzia nicolai',
    wateringCycle: 15,
    lastWateredDate: getDateAgo(4), // 4 days ago (Urgency: 26% - Safe)
    adoptedDate: getDateAgo(140),
    location: '거실 소파 옆',
    imageUrl: 'https://images.unsplash.com/photo-1584589167171-541ce45f1eea?auto=format&fit=crop&w=900&q=80',
    sunlight: 'indirect',
    ventilation: 'high',
    notes: '시원하게 뻗은 대형 잎. 잎에 먼지가 쌓이지 않도록 젖은 수건으로 닦아주기.',
    createdAt: getDateAgo(140),
    wateringHistory: [
      getDateAgo(49),
      getDateAgo(34),
      getDateAgo(19),
      getDateAgo(4),
    ],
  },
];

export const INITIAL_DIARIES: DiaryEntry[] = [
  {
    id: 'diary-1',
    plantId: 'plant-1',
    date: getDateAgo(5),
    type: 'growth',
    title: '새 잎이 찢잎으로 건강하게 나왔어요!',
    content: '공중뿌리가 흙 속으로 자리를 잡더니 드디어 6번째 새 잎이 돋아났습니다. 구멍이 4개나 뚫린 완벽한 폼이에요.',
    imageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=900&q=80',
    daysSinceAdopted: 181,
    daysSinceLastWater: 7,
  },
  {
    id: 'diary-2',
    plantId: 'plant-1',
    date: getDateAgo(12),
    type: 'water',
    title: '화분 듬뿍 급수 완료',
    content: '겉흙 3cm까지 바싹 말라있어 욕실로 데려가 배수구로 물이 콸콸 나올 때까지 관수했습니다.',
    daysSinceAdopted: 174,
    daysSinceLastWater: 0,
  },
  {
    id: 'diary-3',
    plantId: 'plant-1',
    date: getDateAgo(25),
    type: 'fertilizer',
    title: '하이포넥스 액비 1000배 희석 급여',
    content: '성장기라 영양제를 챙겨주었습니다. 잎맥이 더 짙어지는 느낌입니다.',
    daysSinceAdopted: 161,
    daysSinceLastWater: 1,
  },
  {
    id: 'diary-4',
    plantId: 'plant-2',
    date: getDateAgo(14),
    type: 'fertilizer',
    title: '올리브 알비료 투여',
    content: '여름 햇빛을 듬뿍 받아 가지 끝에서 작은 곁가지들이 풍성하게 자라나고 있습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1598880940371-c756e015fea1?auto=format&fit=crop&w=900&q=80',
    daysSinceAdopted: 78,
    daysSinceLastWater: 0,
  },
  {
    id: 'diary-5',
    plantId: 'plant-3',
    date: getDateAgo(30),
    type: 'repot',
    title: '토분으로 분갈이 완료',
    content: '뿌리가 플라스틱 화분 밑으로 삐져나와 이태리 토분으로 이사시켜주었습니다. 펄라이트 비율을 40%로 통기성 강화.',
    imageUrl: 'https://images.unsplash.com/photo-1597055181300-e3633a917c9c?auto=format&fit=crop&w=900&q=80',
    daysSinceAdopted: 280,
    daysSinceLastWater: 7,
  },
  {
    id: 'diary-6',
    plantId: 'plant-4',
    date: getDateAgo(1),
    type: 'water',
    title: '샤워기로 저녁 물주기',
    content: '주방 선반에서 내려와 잎 샤워와 함께 흙을 적셔주었습니다. 싱그러운 초록빛.',
    daysSinceAdopted: 419,
    daysSinceLastWater: 0,
  },
];
