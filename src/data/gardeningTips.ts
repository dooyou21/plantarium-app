export interface GardeningTip {
  id: string;
  category: 'water' | 'sunlight' | 'soil' | 'leaf' | 'season';
  title: string;
  description: string;
}

export const GARDENING_TIPS: GardeningTip[] = [
  {
    id: 'tip-1',
    category: 'water',
    title: '미온수로 아침에 급수하기',
    description: '수돗물을 하루 전 미리 받아두어 염소를 날리고 실온과 비슷한 미온수로 주면 뿌리 냉해와 몸살을 예방할 수 있어요.',
  },
  {
    id: 'tip-2',
    category: 'leaf',
    title: '잎 먼지 부드럽게 닦아주기',
    description: '먼지가 쌓인 잎을 미온수에 적신 부드러운 천으로 닦아주면 광합성 효율과 증산 작용이 크게 활발해집니다.',
  },
  {
    id: 'tip-3',
    category: 'soil',
    title: '나무젓가락으로 속흙 확인',
    description: '겉흙만 보고 물을 주면 과습 위험이 있어요. 나무젓가락을 5cm 깊이로 찔러 흙이 묻어나오지 않을 때 물을 주세요.',
  },
  {
    id: 'tip-4',
    category: 'sunlight',
    title: '주기적인 화분 회전',
    description: '식물은 빛을 향해 자라는 굴광성이 있어요. 1~2주마다 화분을 90도씩 돌려주면 수형이 고르고 균형 있게 자랍니다.',
  },
  {
    id: 'tip-5',
    category: 'season',
    title: '환기와 서큘레이터 활용',
    description: '물주기만큼 중요한 것이 통풍입니다. 창문을 열어 자연 바람을 쐬어주거나 서큘레이터로 공기를 순환시켜 곰팡이와 벌레를 막아주세요.',
  },
  {
    id: 'tip-6',
    category: 'water',
    title: '영양제는 흙이 촉촉할 때',
    description: '바짝 마른 흙에 농축 영양제를 바로 투여하면 뿌리가 탈 수 있어요. 물을 충분히 준 후 촉촉한 상태에서 투여해주세요.',
  },
  {
    id: 'tip-7',
    category: 'leaf',
    title: '건조한 날에는 잎 공중분무',
    description: '습도가 낮은 계절에는 잎 주변 공기에 부드럽게 분무해주면 열대 잎식물들의 잎마름과 갈변을 방지할 수 있습니다.',
  },
];

export function getRandomTip(): GardeningTip {
  const index = Math.floor(Math.random() * GARDENING_TIPS.length);
  return GARDENING_TIPS[index];
}
