// STORE v2.0 — localStorage + optional Firebase sync
import { FB } from './firebase-init.js';

const P = 'lifeos2_'; // v2 prefix

const get = (k, fb=null) => { try { const v=localStorage.getItem(P+k); return v?JSON.parse(v):fb; } catch { return fb; } };
const set = (k, v) => { try { localStorage.setItem(P+k, JSON.stringify(v)); } catch {} };

async function sync(col, id, data) {
  if (FB.isReady() && FB.getUser()) await FB.save(col, id, data).catch(()=>{});
}

export const Store = {
  // Profile
  getProfile: () => get('profile', { name:'위효연', asset:550000000, targetAsset:5000000000000000, saju:'병인년 계사월 갑인일 기사시' }),
  setProfile: (p) => { set('profile', p); sync('meta','profile',p); },

  // Gate (morning check-in)
  getGate: (dateKey) => get('gate_'+dateKey, { done:false }),
  setGate: (dateKey, data) => { set('gate_'+dateKey, data); sync('gates', dateKey, data); },

  // Habits
  getHabits: () => get('habits', defaultHabits()),
  setHabits: (h) => { set('habits', h); sync('meta','habits',{habits:h}); },

  // Completions
  getTodayKey: () => new Date().toISOString().slice(0,10),
  getCompletions: (dateKey) => get('comp_'+(dateKey||new Date().toISOString().slice(0,10)), {}),
  setCompletions: (data, dateKey) => {
    const k = dateKey || new Date().toISOString().slice(0,10);
    set('comp_'+k, data);
    sync('completions', k, data);
  },

  // Journal
  getJournal: (dateKey) => get('journal_'+(dateKey||new Date().toISOString().slice(0,10)), {}),
  setJournal: (data, dateKey) => {
    const k = dateKey || new Date().toISOString().slice(0,10);
    set('journal_'+k, data);
    sync('journal', k, data);
  },
  getJournalHistory: () => {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(P+'journal_'))
      .map(k => ({ date: k.replace(P+'journal_',''), ...JSON.parse(localStorage.getItem(k)||'{}') }))
      .sort((a,b) => b.date.localeCompare(a.date)).slice(0,30);
  },

  // Mandarat
  getMandarat: () => get('mandarat', defaultMandarat()),
  setMandarat: (m) => { set('mandarat', m); sync('meta','mandarat',m); },

  // Goals
  getGoals: () => get('goals', defaultGoals()),
  setGoals: (g) => { set('goals', g); sync('meta','goals',{goals:g}); },

  // Evolution
  getEvolutionState: () => get('evo_state', { lastRun:0, reports:[] }),
  setEvolutionState: (s) => { set('evo_state', s); sync('meta','evolution',s); },

  // Stats
  getStreak(habitId) {
    let s = 0;
    const t = new Date();
    for (let i=0; i<365; i++) {
      const d = new Date(t); d.setDate(d.getDate()-i);
      const c = this.getCompletions(d.toISOString().slice(0,10));
      if (c[habitId]) s++;
      else if (i>0) break;
    }
    return s;
  },
  getWeeklyRate(habitId) {
    let done=0;
    const t=new Date();
    for (let i=0;i<7;i++) {
      const d=new Date(t); d.setDate(d.getDate()-i);
      const c=this.getCompletions(d.toISOString().slice(0,10));
      if (c[habitId]) done++;
    }
    return Math.round(done/7*100);
  },

  isLoggedIn: () => !!FB.getUser(),
  async syncAll() {
    if (!FB.isReady()||!FB.getUser()) return;
    // Pull from Firestore if newer
    for (const k of ['habits','goals','mandarat','profile']) {
      const r = await FB.load('meta', k).catch(()=>null);
      if (r) set(k, r);
    }
  }
};

function defaultHabits() {
  return [
    { id:'swim',    icon:'🏊', name:'수영 · 운동',     target:'1.5시간', tiny:'운동복 입기 (2분)',    method:'TinyHabit', difficulty:3, yongshin:true,  cue:'기상 후 운동복 착용' },
    { id:'study',   icon:'📚', name:'CFA/AICPA 공부',  target:'2시간',   tiny:'책 펼치기 (2분)',     method:'의도적연습', difficulty:3, yongshin:true,  cue:'커피 후 책상 착석' },
    { id:'water',   icon:'💧', name:'수분 2L',         target:'2L',      tiny:'물 한 잔 (30초)',    method:'TinyHabit', difficulty:1, yongshin:true,  cue:'매 식사 + 운동 전' }
  ];
}

function defaultMandarat() {
  const cells = Array(81).fill('');
  cells[40]='THE\nONE';
  cells[13]='컬럼비아\n복학'; cells[22]='CFA\n취득'; cells[31]='AICPA\n취득';
  cells[39]='5.5억→\n10억'; cells[41]='건강\n75kg'; cells[49]='일본어\nN2';
  cells[58]='퀀트\n입문'; cells[67]='Legal-AI\n창업';
  return { cells, updatedAt:Date.now() };
}

function defaultGoals() {
  return [
    { id:'g1', icon:'🎓', name:'방통대 졸업', deadline:'2026.08', pct:85 },
    { id:'g2', icon:'✈',  name:'컬럼비아 복학', deadline:'2027.02', pct:20 },
    { id:'g3', icon:'📊', name:'CFA Level 1', deadline:'2027.12', pct:0 },
    { id:'g4', icon:'💰', name:'자산 10억', deadline:'2030.12', pct:55 }
  ];
}
