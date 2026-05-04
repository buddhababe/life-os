// STORAGE — localStorage + Firebase 추상화
import { FB } from './firebase-init.js';

const PREFIX = 'lifeos_';

function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem(PREFIX + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch {}
}

export const Store = {
  // Habits
  getHabits: () => lsGet('habits', getDefaultHabits()),
  setHabits: (h) => { lsSet('habits', h); syncToFB('habits', 'main', h); },
  
  // Today's completions
  getTodayKey: () => new Date().toISOString().slice(0,10),
  getCompletions: (dateKey) => lsGet('completions_' + (dateKey || Store.getTodayKey()), {}),
  setCompletions: (data, dateKey) => {
    const key = 'completions_' + (dateKey || Store.getTodayKey());
    lsSet(key, data);
    syncToFB('completions', dateKey || Store.getTodayKey(), data);
  },
  
  // Mandarat
  getMandarat: () => lsGet('mandarat', getDefaultMandarat()),
  setMandarat: (m) => { lsSet('mandarat', m); syncToFB('mandarat', 'main', m); },
  
  // Journal
  getJournal: (dateKey) => lsGet('journal_' + (dateKey || Store.getTodayKey()), {}),
  setJournal: (data, dateKey) => {
    const key = 'journal_' + (dateKey || Store.getTodayKey());
    lsSet(key, data);
    syncToFB('journal', dateKey || Store.getTodayKey(), data);
  },
  getJournalHistory: () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX + 'journal_'));
    return keys.map(k => ({ date: k.replace(PREFIX + 'journal_', ''), ...JSON.parse(localStorage.getItem(k)) }))
      .sort((a,b) => b.date.localeCompare(a.date)).slice(0,30);
  },
  
  // Goals
  getGoals: () => lsGet('goals', getDefaultGoals()),
  setGoals: (g) => { lsSet('goals', g); syncToFB('goals', 'main', g); },
  
  // Profile
  getProfile: () => lsGet('profile', getDefaultProfile()),
  setProfile: (p) => { lsSet('profile', p); syncToFB('profile', 'main', p); },
  
  // Stats: streak calculation
  getStreak: (habitId) => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);
      const c = lsGet('completions_' + key, {});
      if (c[habitId]) streak++;
      else if (i > 0) break;
    }
    return streak;
  },
  
  // Weekly completion rate
  getWeeklyRate: (habitId) => {
    let done = 0;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);
      const c = lsGet('completions_' + key, {});
      if (c[habitId]) done++;
    }
    return Math.round((done / 7) * 100);
  },
  
  // Evolution: self-correct habits based on completion rate
  evolveHabits: () => {
    const habits = Store.getHabits();
    const evolved = habits.map(h => {
      const rate = Store.getWeeklyRate(h.id);
      let note = h.note || '';
      if (rate < 40) { note = '⬇ 목표 하향 조정됨 (완료율 ' + rate + '%)'; h.difficulty = Math.max(1, (h.difficulty||3) - 1); }
      else if (rate > 85) { note = '⬆ 목표 상향 조정됨 (완료율 ' + rate + '%)'; h.difficulty = Math.min(5, (h.difficulty||3) + 1); }
      return { ...h, note, lastEvolved: new Date().toISOString().slice(0,10) };
    });
    Store.setHabits(evolved);
    return evolved;
  },
  
  // Auth state
  isLoggedIn: () => !!FB.getUser(),
  
  // Evolution state
  getEvolutionState: () => lsGet('evolution_state', { lastRun: 0, reports: [] }),
  setEvolutionState: (s) => { lsSet('evolution_state', s); syncToFB('meta', 'evolution', s); },
  
  // Full cloud sync
  async syncAll() {
    if (!FB.isReady() || !FB.getUser()) return false;
    const keys = ['habits','mandarat','goals','profile'];
    for (const k of keys) {
      const remote = await FB.load(k, 'main');
      if (remote && remote.updatedAt > (lsGet(k+'_synctime', 0))) {
        lsSet(k, remote); lsSet(k+'_synctime', remote.updatedAt);
      }
    }
    return true;
  }
};

async function syncToFB(collection, docId, data) {
  if (FB.isReady() && FB.getUser()) {
    await FB.save(collection, docId, data);
  }
}

function getDefaultHabits() {
  return [
    { id:'swim', name:'수영 / 운동', icon:'🏊', target:'1.5시간', unit:'시간', method:'원자습관', difficulty:3,
      cue:'기상 후 운동복 착용', reward:'운동 후 차가운 물 한잔', yongshin:true, streak:0 },
    { id:'study', name:'CFA/AICPA 공부', icon:'📚', target:'2시간', unit:'시간', method:'의도적연습', difficulty:3,
      cue:'커피 한잔 후 책상 앉기', reward:'25분 집중 후 5분 휴식', yongshin:true, streak:0 },
    { id:'meal', name:'2끼 식사 (절식)', icon:'🍽', target:'2끼', unit:'회', method:'타이니해빗', difficulty:2,
      cue:'기상 2시간 후 첫 식사', reward:'균형잡힌 식사 체크', yongshin:false, streak:0 },
    { id:'water', name:'수분 섭취 2L', icon:'💧', target:'2L', unit:'L', method:'타이니해빗', difficulty:2,
      cue:'매 식사 + 운동 전후', reward:'수분 충족 = 癸水 직접 보충', yongshin:true, streak:0 },
    { id:'journal', name:'야간 저널 3Q', icon:'📓', target:'3문항', unit:'회', method:'자기성찰', difficulty:2,
      cue:'취침 30분 전', reward:'완료 후 조용한 명상 5분', yongshin:false, streak:0 },
    { id:'japanese', name:'일본어 학습', icon:'🇯🇵', target:'30분', unit:'분', method:'습관스택', difficulty:2,
      cue:'저녁 식사 후', reward:'일본 유튜브 10분 시청', yongshin:false, streak:0 }
  ];
}

function getDefaultMandarat() {
  // 9x9 = 81 cells. Center cell (index 40) = The One
  // 8 main goals at positions: 13,22,31,39,41,49,58,67 (cross from center of each 3x3)
  const cells = Array(81).fill('');
  cells[40] = 'THE ONE\n5경원';
  // Main 8 goals
  cells[13] = '컬럼비아\n복학';
  cells[22] = 'CFA\n취득';
  cells[31] = 'AICPA\n취득';
  cells[39] = '5.5억→\n10억';
  cells[41] = '건강\n75kg';
  cells[49] = '일본어\nN2';
  cells[58] = '퀀트\n입문';
  cells[67] = 'Legal-AI\n창업';
  return { cells, updatedAt: Date.now() };
}

function getDefaultGoals() {
  return [
    { id:'g1', icon:'🎓', name:'방통대 졸업', deadline:'2026.08', pct:85, category:'학습' },
    { id:'g2', icon:'✈', name:'컬럼비아 복학', deadline:'2027.02', pct:20, category:'커리어' },
    { id:'g3', icon:'📊', name:'AICPA FAR 합격', deadline:'2027.06', pct:5, category:'자격증' },
    { id:'g4', icon:'💹', name:'CFA Level 1', deadline:'2027.12', pct:0, category:'자격증' },
    { id:'g5', icon:'💰', name:'자산 10억', deadline:'2030.12', pct:55, category:'재무' },
    { id:'g6', icon:'🏊', name:'수영 주 3회 정착', deadline:'2026.08', pct:30, category:'건강' },
    { id:'g7', icon:'⚖', name:'체중 75kg', deadline:'2026.12', pct:40, category:'건강' }
  ];
}

function getDefaultProfile() {
  return {
    name:'위효연', asset: 550000000, targetAsset: 5000000000000000,
    saju: '병인년 계사월 갑인일 기사시', daewoon:'정유대운(~2036)', birth:'1986-05-10'
  };
}
