// EVOLUTION ENGINE — 자가진화 핵심 엔진
// 앱 실행 시 자동 체크. 7일마다 전체 분석 실행.
import { Store } from './store.js';
import { getDayRating, getDayGanjio } from './saju.js';

const EVOLUTION_INTERVAL_DAYS = 7;
const MIN_DATA_DAYS = 3; // 최소 3일치 데이터 필요

export class EvolutionEngine {
  constructor() {
    this.lastRun = Store.getEvolutionState().lastRun || 0;
    this.reports = Store.getEvolutionState().reports || [];
  }

  // ── 앱 시작 시 자동 호출 ──
  async autoCheck() {
    const daysSince = (Date.now() - this.lastRun) / (1000 * 60 * 60 * 24);
    const hasEnoughData = this._getDataDaysCount() >= MIN_DATA_DAYS;
    
    if (daysSince >= EVOLUTION_INTERVAL_DAYS && hasEnoughData) {
      return await this.runFullEvolution();
    }
    
    // 매일 실행: 오늘 일진 기반 당일 조언만
    return this.getDailyNudge();
  }

  // ── 전체 자가진화 사이클 ──
  async runFullEvolution() {
    console.log('[Evolution] 주간 자가진화 시작...');
    
    const data = this._collectAllData();
    const insights = this._analyzePatterns(data);
    const actions = this._generateActions(insights);
    const applied = this._applyActions(actions);
    
    const report = {
      date: new Date().toISOString().slice(0, 10),
      insights,
      actions: applied,
      score: this._calcEvolutionScore(data)
    };
    
    this.reports.unshift(report);
    if (this.reports.length > 12) this.reports = this.reports.slice(0, 12); // 최근 12주만 보관
    
    Store.setEvolutionState({ lastRun: Date.now(), reports: this.reports });
    console.log('[Evolution] 완료:', report);
    return report;
  }

  // ── 데이터 수집 ──
  _collectAllData() {
    const habits = Store.getHabits();
    const today = new Date();
    const days = [];
    
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const completions = Store.getCompletions(key);
      const journal = Store.getJournal(key);
      const gj = getDayGanjio(d);
      const rating = getDayRating(d);
      
      days.push({
        date: key,
        dayOfWeek: d.getDay(),
        sajuScore: rating.score,
        sajuClass: rating.class,
        completions,
        journal,
        completionRate: habits.length > 0 
          ? Object.values(completions).filter(Boolean).length / habits.length 
          : 0
      });
    }
    
    return { habits, days, journals: Store.getJournalHistory() };
  }

  // ── 패턴 분석 (핵심) ──
  _analyzePatterns(data) {
    const { habits, days } = data;
    const insights = [];

    // 1. 요일별 완료율 분석
    const byDayOfWeek = Array(7).fill(null).map(() => ({ total: 0, done: 0 }));
    days.forEach(d => {
      byDayOfWeek[d.dayOfWeek].total++;
      byDayOfWeek[d.dayOfWeek].done += d.completionRate;
    });
    const dayRates = byDayOfWeek.map((d, i) => ({ day: i, rate: d.total > 0 ? d.done / d.total : 0 }));
    const bestDayIdx = dayRates.reduce((a, b) => a.rate >= b.rate ? a : b).day;
    const worstDayIdx = dayRates.reduce((a, b) => a.rate <= b.rate ? a : b).day;
    const dayNames = ['일','월','화','수','목','금','토'];
    
    if (dayRates[bestDayIdx].rate - dayRates[worstDayIdx].rate > 0.2) {
      insights.push({
        type: 'WEEKDAY_PATTERN',
        level: 'info',
        message: `${dayNames[bestDayIdx]}요일 완료율(${Math.round(dayRates[bestDayIdx].rate*100)}%)이 ${dayNames[worstDayIdx]}요일(${Math.round(dayRates[worstDayIdx].rate*100)}%)보다 훨씬 높습니다.`,
        data: { bestDay: bestDayIdx, worstDay: worstDayIdx, rates: dayRates }
      });
    }

    // 2. 사주 일진별 완료율 분석
    const bySaju = { good: { total: 0, done: 0 }, bad: { total: 0, done: 0 }, neutral: { total: 0, done: 0 } };
    days.forEach(d => {
      const g = bySaju[d.sajuClass];
      if (g) { g.total++; g.done += d.completionRate; }
    });
    const sajuGoodRate = bySaju.good.total > 0 ? bySaju.good.done / bySaju.good.total : 0;
    const sajuBadRate = bySaju.bad.total > 0 ? bySaju.bad.done / bySaju.bad.total : 0;
    
    if (sajuGoodRate - sajuBadRate > 0.15) {
      insights.push({
        type: 'SAJU_CORRELATION',
        level: 'success',
        message: `사주 분석 확인: 용신일(吉) 완료율 ${Math.round(sajuGoodRate*100)}% vs 기신일(凶) ${Math.round(sajuBadRate*100)}%. 일진이 실제 행동에 영향을 줍니다.`,
        data: { goodRate: sajuGoodRate, badRate: sajuBadRate }
      });
    }

    // 3. 습관별 약점 분석
    habits.forEach(h => {
      const rates = days.map(d => d.completions[h.id] ? 1 : 0);
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      if (avg < 0.3) {
        insights.push({
          type: 'WEAK_HABIT',
          level: 'warning',
          habitId: h.id,
          message: `'${h.name}' 완료율이 ${Math.round(avg*100)}%로 매우 낮습니다. 신호(Cue)나 목표량 조정이 필요합니다.`,
          currentRate: avg
        });
      } else if (avg > 0.85) {
        insights.push({
          type: 'STRONG_HABIT',
          level: 'success',
          habitId: h.id,
          message: `'${h.name}' 완료율 ${Math.round(avg*100)}%! 난이도를 높일 시기입니다.`,
          currentRate: avg
        });
      }
    });

    // 4. 연속 기록 분석
    let currentStreak = 0;
    for (const d of days) {
      if (d.completionRate >= 0.5) currentStreak++;
      else break;
    }
    if (currentStreak >= 7) {
      insights.push({ type: 'STREAK', level: 'success', message: `${currentStreak}일 연속으로 50% 이상 달성! 모멘텀이 최고입니다.`, streak: currentStreak });
    } else if (currentStreak === 0 && days[0]?.completionRate < 0.3) {
      insights.push({ type: 'SLUMP', level: 'danger', message: '최근 완료율이 급격히 낮아졌습니다. 습관 수를 줄이거나 목표량을 조정하세요.', streak: 0 });
    }

    // 5. 저널 키워드 분석 (간단 NLP)
    const recentJournals = Store.getJournalHistory().slice(0, 14);
    const allText = recentJournals.map(j => `${j.q1||''} ${j.q2||''} ${j.q3||''}`).join(' ').toLowerCase();
    const negativeWords = ['힘들','지쳐','못했','실패','포기','피곤','우울','걱정','불안'];
    const positiveWords = ['잘했','성공','완료','기쁘','좋았','달성','뿌듯','행복','집중'];
    const negScore = negativeWords.filter(w => allText.includes(w)).length;
    const posScore = positiveWords.filter(w => allText.includes(w)).length;
    
    if (negScore > posScore + 2) {
      insights.push({ type: 'JOURNAL_SENTIMENT', level: 'warning', message: `최근 2주 저널에서 부정적 키워드가 많습니다(${negScore}회). 번아웃 징조. 습관 수를 줄이고 회복에 집중하세요.`, sentiment: 'negative' });
    } else if (posScore > negScore + 2) {
      insights.push({ type: 'JOURNAL_SENTIMENT', level: 'success', message: `저널 분석 결과 긍정적 흐름(${posScore}회). 에너지 좋음. 목표 난이도를 올릴 시기.`, sentiment: 'positive' });
    }

    return insights;
  }

  // ── 자동 행동 생성 ──
  _generateActions(insights) {
    const actions = [];
    
    insights.forEach(insight => {
      switch (insight.type) {
        case 'WEAK_HABIT':
          actions.push({ type: 'REDUCE_DIFFICULTY', habitId: insight.habitId, reason: insight.message, delta: -1 });
          actions.push({ type: 'UPDATE_CUE', habitId: insight.habitId, reason: '더 구체적인 신호로 교체 필요' });
          break;
        case 'STRONG_HABIT':
          actions.push({ type: 'INCREASE_DIFFICULTY', habitId: insight.habitId, reason: insight.message, delta: 1 });
          break;
        case 'SLUMP':
          actions.push({ type: 'REDUCE_HABIT_COUNT', reason: '번아웃 방지. 핵심 3개만 유지' });
          break;
        case 'SAJU_CORRELATION':
          actions.push({ type: 'OPTIMIZE_SAJU_SCHEDULING', reason: '용신일에 중요 습관 집중 배치' });
          break;
        case 'JOURNAL_SENTIMENT':
          if (insight.sentiment === 'negative') {
            actions.push({ type: 'RECOVERY_MODE', reason: '번아웃 모드 진입. 습관 목표 20% 감소' });
          } else if (insight.sentiment === 'positive') {
            actions.push({ type: 'GROWTH_MODE', reason: '성장 모드. 도전적 목표 추가' });
          }
          break;
      }
    });
    
    return actions;
  }

  // ── 자동 적용 ──
  _applyActions(actions) {
    const habits = Store.getHabits();
    const applied = [];
    let habitsChanged = false;

    actions.forEach(action => {
      switch (action.type) {
        case 'REDUCE_DIFFICULTY': {
          const h = habits.find(h => h.id === action.habitId);
          if (h) { h.difficulty = Math.max(1, (h.difficulty || 3) + action.delta); h.note = `⬇ 자동조정: ${action.reason}`; habitsChanged = true; applied.push(action); }
          break;
        }
        case 'INCREASE_DIFFICULTY': {
          const h = habits.find(h => h.id === action.habitId);
          if (h) { h.difficulty = Math.min(5, (h.difficulty || 3) + action.delta); h.note = `⬆ 자동조정: ${action.reason}`; habitsChanged = true; applied.push(action); }
          break;
        }
        case 'RECOVERY_MODE': {
          habits.forEach(h => { h.difficulty = Math.max(1, (h.difficulty || 3) - 1); });
          habitsChanged = true;
          applied.push({ ...action, description: '전체 습관 난이도 1단계 하향' });
          break;
        }
        case 'GROWTH_MODE': {
          habits.forEach(h => { if ((h.difficulty || 3) < 5) h.difficulty = (h.difficulty || 3) + 1; });
          habitsChanged = true;
          applied.push({ ...action, description: '전체 습관 난이도 1단계 상향' });
          break;
        }
        default:
          applied.push({ ...action, description: '권장사항 (수동 적용 필요)' });
      }
    });

    if (habitsChanged) Store.setHabits(habits);
    return applied;
  }

  // ── 매일 실행: 당일 일진 기반 넛지 ──
  getDailyNudge() {
    const today = new Date();
    const rating = getDayRating(today);
    const habits = Store.getHabits();
    const completions = Store.getCompletions();
    const doneToday = Object.values(completions).filter(Boolean).length;
    
    const nudges = [];
    
    if (rating.score >= 4 && doneToday === 0) {
      nudges.push({ level: 'success', message: `오늘은 용신 최강일(${rating.rating})입니다. 지금 당장 가장 중요한 습관을 시작하세요.` });
    }
    if (rating.score <= -2) {
      nudges.push({ level: 'danger', message: `오늘은 기신일(${rating.rating}). 완벽주의 내려두고 최소 1개만 달성하면 성공.` });
    }
    if (today.getHours() >= 21 && !completions['journal']) {
      nudges.push({ level: 'warning', message: '야간 저널 미작성. 2분이면 됩니다. 기록하지 않으면 존재하지 않습니다.' });
    }
    
    return { type: 'DAILY_NUDGE', nudges, needsFullEvolution: false };
  }

  // ── 진화 점수 계산 ──
  _calcEvolutionScore(data) {
    const recentDays = data.days.slice(0, 7);
    const avgCompletion = recentDays.reduce((a, b) => a + b.completionRate, 0) / recentDays.length;
    const journalCount = recentDays.filter(d => Object.keys(Store.getJournal(d.date)).length > 0).length;
    const streak = Store.getHabits().reduce((max, h) => Math.max(max, Store.getStreak(h.id)), 0);
    
    return {
      completion: Math.round(avgCompletion * 100),
      journalConsistency: Math.round((journalCount / 7) * 100),
      maxStreak: streak,
      total: Math.round((avgCompletion * 50) + (journalCount / 7 * 30) + Math.min(streak / 30, 1) * 20)
    };
  }

  _getDataDaysCount() {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const c = Store.getCompletions(key);
      if (Object.keys(c).length > 0) count++;
    }
    return count;
  }

  getLatestReport() { return this.reports[0] || null; }
  getAllReports() { return this.reports; }
  getDaysUntilNextEvolution() {
    const daysSince = (Date.now() - this.lastRun) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(EVOLUTION_INTERVAL_DAYS - daysSince));
  }
}

export const engine = new EvolutionEngine();
