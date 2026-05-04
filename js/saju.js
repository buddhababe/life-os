// SAJU ENGINE — 갑인일주 甲木 日干 (水金 용신, 정유대운)

// 60 갑자 순서 (0-indexed)
const GANJIO_60 = [
  {g:'甲',j:'子',gk:'갑',jk:'자'},{g:'乙',j:'丑',gk:'을',jk:'축'},{g:'丙',j:'寅',gk:'병',jk:'인'},{g:'丁',j:'卯',gk:'정',jk:'묘'},
  {g:'戊',j:'辰',gk:'무',jk:'진'},{g:'己',j:'巳',gk:'기',jk:'사'},{g:'庚',j:'午',gk:'경',jk:'오'},{g:'辛',j:'未',gk:'신',jk:'미'},
  {g:'壬',j:'申',gk:'임',jk:'신'},{g:'癸',j:'酉',gk:'계',jk:'유'},{g:'甲',j:'戌',gk:'갑',jk:'술'},{g:'乙',j:'亥',gk:'을',jk:'해'},
  {g:'丙',j:'子',gk:'병',jk:'자'},{g:'丁',j:'丑',gk:'정',jk:'축'},{g:'戊',j:'寅',gk:'무',jk:'인'},{g:'己',j:'卯',gk:'기',jk:'묘'},
  {g:'庚',j:'辰',gk:'경',jk:'진'},{g:'辛',j:'巳',gk:'신',jk:'사'},{g:'壬',j:'午',gk:'임',jk:'오'},{g:'癸',j:'未',gk:'계',jk:'미'},
  {g:'甲',j:'申',gk:'갑',jk:'신'},{g:'乙',j:'酉',gk:'을',jk:'유'},{g:'丙',j:'戌',gk:'병',jk:'술'},{g:'丁',j:'亥',gk:'정',jk:'해'},
  {g:'戊',j:'子',gk:'무',jk:'자'},{g:'己',j:'丑',gk:'기',jk:'축'},{g:'庚',j:'寅',gk:'경',jk:'인'},{g:'辛',j:'卯',gk:'신',jk:'묘'},
  {g:'壬',j:'辰',gk:'임',jk:'진'},{g:'癸',j:'巳',gk:'계',jk:'사'},{g:'甲',j:'午',gk:'갑',jk:'오'},{g:'乙',j:'未',gk:'을',jk:'미'},
  {g:'丙',j:'申',gk:'병',jk:'신'},{g:'丁',j:'酉',gk:'정',jk:'유'},{g:'戊',j:'戌',gk:'무',jk:'술'},{g:'己',j:'亥',gk:'기',jk:'해'},
  {g:'庚',j:'子',gk:'경',jk:'자'},{g:'辛',j:'丑',gk:'신',jk:'축'},{g:'壬',j:'寅',gk:'임',jk:'인'},{g:'癸',j:'卯',gk:'계',jk:'묘'},
  {g:'甲',j:'辰',gk:'갑',jk:'진'},{g:'乙',j:'巳',gk:'을',jk:'사'},{g:'丙',j:'午',gk:'병',jk:'오'},{g:'丁',j:'未',gk:'정',jk:'미'},
  {g:'戊',j:'申',gk:'무',jk:'신'},{g:'己',j:'酉',gk:'기',jk:'유'},{g:'庚',j:'戌',gk:'경',jk:'술'},{g:'辛',j:'亥',gk:'신',jk:'해'},
  {g:'壬',j:'子',gk:'임',jk:'자'},{g:'癸',j:'丑',gk:'계',jk:'축'},{g:'甲',j:'寅',gk:'갑',jk:'인'},{g:'乙',j:'卯',gk:'을',jk:'묘'},
  {g:'丙',j:'辰',gk:'병',jk:'진'},{g:'丁',j:'巳',gk:'정',jk:'사'},{g:'戊',j:'午',gk:'무',jk:'오'},{g:'己',j:'未',gk:'기',jk:'미'},
  {g:'庚',j:'申',gk:'경',jk:'신'},{g:'辛',j:'酉',gk:'신',jk:'유'},{g:'壬',j:'戌',gk:'임',jk:'술'},{g:'癸',j:'亥',gk:'계',jk:'해'}
];

// Anchor: 2026-01-01 = 庚寅 = index 26
const ANCHOR_DATE = new Date(2026, 0, 1);
const ANCHOR_IDX = 26;

// 갑인일주 용신 채점 (水金 용신, 火木土 기신)
const GAN_SCORE = { '壬':3,'癸':3,'庚':2,'辛':2,'戊':0,'己':-1,'甲':-1,'乙':-1,'丙':-2,'丁':-2 };
const JI_SCORE  = { '亥':3,'子':3,'申':2,'酉':2,'丑':1,'辰':1,'戌':-1,'未':-1,'寅':-2,'卯':-2,'午':-2,'巳':-2 };

export function getDayGanjio(date) {
  const msPerDay = 86400000;
  const diff = Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - ANCHOR_DATE) / msPerDay);
  const idx = ((ANCHOR_IDX + diff) % 60 + 60) % 60;
  return { ...GANJIO_60[idx], idx };
}

export function getDayRating(date) {
  const gj = getDayGanjio(date);
  const score = (GAN_SCORE[gj.g] || 0) + (JI_SCORE[gj.j] || 0);
  if (score >= 4) return { rating:'최길', emoji:'🌊', class:'good', score, color:'#4fc3f7', tip:'용신 에너지 최강. 중요한 결정, 계약, 시작 최적일.' };
  if (score >= 2) return { rating:'길', emoji:'✨', class:'good', score, color:'#81d4fa', tip:'水金 기운 우세. 학습, 투자 검토, 운동 적합.' };
  if (score >= 0) return { rating:'평', emoji:'〰', class:'neutral', score, color:'#78909c', tip:'평일. 루틴 유지. 무리하지 말 것.' };
  if (score >= -2) return { rating:'흉', emoji:'🔥', class:'bad', score, color:'#ef5350', tip:'火기운 강함. 감정 조절, 충동 결정 삼가. 실내 조용히.' };
  return { rating:'대흉', emoji:'💀', class:'bad', score, color:'#b71c1c', tip:'극흉일. 큰 결정 절대 금지. 방어 모드. 수분 섭취.' };
}

export function getMonthCalendar(year, month) {
  const days = [];
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month, d));
  return days;
}

export function getMonthEnergyLevel(year, month) {
  // 월간 水金 에너지 종합 (병오년 기준 위험도)
  const dangerMonths = [4,5,6]; // 5월~7월 (0-indexed: 4,5,6)
  if (dangerMonths.includes(month)) return { level:'위험', color:'#ef5350', desc:'화기 극강 구간 (계사·갑오·을미월)' };
  if (month === 3 || month === 7) return { level:'주의', color:'#ff9800', desc:'화기 전후 구간' };
  return { level:'보통', color:'#78909c', desc:'일반 구간. 루틴 유지' };
}

// 대운 정보
export const DAEWOON = [
  { char:'갑오', han:'甲午', period:'~2026', element:'木火', rating:-2, desc:'설기 최대. 생존 우선', tip:'방어 극대화. 투자 보수적', color:'#ef5350' },
  { char:'정유', han:'丁酉', period:'~2036', element:'金', rating:3, desc:'金 공급. 현재 대운', tip:'서향 임수. 金水 활동', color:'#4fc3f7', active:true },
  { char:'무술', han:'戊戌', period:'~2046', element:'土', rating:-1, desc:'조토 위험. 방어기', tip:'서북향 전환', color:'#ff9800' },
  { char:'기해', han:'己亥', period:'~2056', element:'水', rating:3, desc:'水 극강. 도약기', tip:'북향 수기운 극대화', color:'#81d4fa' },
  { char:'경자', han:'庚子', period:'~2066', element:'金水', rating:3, desc:'金水 전성기', tip:'The One 완성 구간', color:'#ffd54f' },
  { char:'신축', han:'辛丑', period:'~2076', element:'金濕土', rating:2, desc:'完成期', tip:'유산 정리', color:'#66bb6a' }
];

// 용신 활동 추천
export function getYongshinActivities(rating) {
  const base = [
    { icon:'🏊', name:'수영', desc:'水기운 직접 흡수. 용신 운동 1위' },
    { icon:'📚', name:'공부·독서', desc:'癸水=인성(印星). 학습이 용신 활동' },
    { icon:'🥋', name:'요가·필라테스', desc:'코어 강화. 차가운 정적 운동' },
    { icon:'⚪', name:'실버·흰색 착용', desc:'金 오행. 갑옷 효과' },
    { icon:'🌊', name:'북·서향 바라보기', desc:'용신 방위 에너지 흡수' },
    { icon:'🍵', name:'차가운 물·녹차', desc:'수분 = 癸水 직접 보충' }
  ];
  if (rating.score >= 4) return [...base, { icon:'💼', name:'중요 결정·계약', desc:'용신일 최길. 서명·시작 최적' }];
  if (rating.score <= -2) return [
    { icon:'🏠', name:'실내 은둔', desc:'화기 극강일. 외출 최소화' },
    { icon:'💧', name:'수분 섭취 극대화', desc:'화기 억제 응급처방' },
    { icon:'🧊', name:'냉찜질·아이스팩', desc:'체온 유지. 火억제' },
    { icon:'🙏', name:'명상·호흡법', desc:'불교 팔정도 — 바른 마음챙김(正念)' }
  ];
  return base;
}

export { GANJIO_60 };
