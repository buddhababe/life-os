import { getDayGanjio, getDayRating, getMonthCalendar, getMonthEnergyLevel, getYongshinActivities, DAEWOON } from './saju.js';
import { Store } from './store.js';
import { FB } from './firebase-init.js';

const today = new Date();
let currentPage = 'home';

// INIT
document.addEventListener('DOMContentLoaded', async () => {
  const useLocal = localStorage.getItem('lifeos_mode');
  if (useLocal) { initApp(); }
  else { document.getElementById('auth-overlay').classList.remove('hidden'); setupAuth(); }
});

function setupAuth() {
  document.getElementById('google-signin-btn').onclick = async () => {
    try {
      await FB.signInGoogle();
      localStorage.setItem('lifeos_mode', 'firebase');
      document.getElementById('auth-overlay').classList.add('hidden');
      initApp();
    } catch(e) { alert('로그인 실패. 기기 저장으로 시작합니다.'); startLocal(); }
  };
  document.getElementById('local-btn').onclick = startLocal;
}

function startLocal() {
  localStorage.setItem('lifeos_mode', 'local');
  document.getElementById('auth-overlay').classList.add('hidden');
  initApp();
}

async function initApp() {
  document.getElementById('app').classList.remove('hidden');
  updateHeader();
  setupNav();
  if (Store.isLoggedIn()) await Store.syncAll();
  renderPage('home');
  setInterval(updateHeader, 60000);
}

function updateHeader() {
  const gj = getDayGanjio(today);
  const rating = getDayRating(today);
  const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const days = ['일','월','화','수','목','금','토'];
  document.getElementById('header-date').textContent = `${today.getFullYear()}년 ${months[today.getMonth()]} ${today.getDate()}일 (${days[today.getDay()]})`;
  const badge = document.getElementById('header-ganjio');
  badge.textContent = `${gj.gk}${gj.jk}일 ${rating.rating}`;
  badge.className = `ganjio-badge ganjio-${rating.class}`;
  const ring = document.getElementById('energy-ring');
  ring.style.borderColor = rating.color;
  ring.querySelector(':scope::after') && (ring.style.background = rating.color + '22');
}

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPage(btn.dataset.page);
    };
  });
  document.getElementById('sync-btn').onclick = async () => {
    document.getElementById('sync-btn').textContent = '⟳';
    await Store.syncAll();
    renderPage(currentPage);
    document.getElementById('sync-btn').textContent = '✓';
    setTimeout(() => document.getElementById('sync-btn').textContent = '⟳', 2000);
  };
}

function renderPage(page) {
  currentPage = page;
  const content = document.getElementById('page-content');
  content.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'page-enter';
  switch(page) {
    case 'home': div.innerHTML = renderHome(); break;
    case 'habits': div.innerHTML = renderHabits(); break;
    case 'mandarat': div.innerHTML = renderMandarat(); break;
    case 'saju': div.innerHTML = renderSaju(); break;
    case 'journal': div.innerHTML = renderJournal(); break;
    case 'more': div.innerHTML = renderMore(); break;
  }
  content.appendChild(div);
  bindPageEvents(page);
}

// ═══ HOME ═══
function renderHome() {
  const rating = getDayRating(today);
  const habits = Store.getHabits();
  const completions = Store.getCompletions();
  const doneCount = habits.filter(h => completions[h.id]).length;
  const profile = Store.getProfile();
  const pct = Math.min(99.9, (profile.asset / profile.targetAsset) * 100);
  const goals = Store.getGoals();
  const activities = getYongshinActivities(rating).slice(0,3);

  return `
  <div class="the-one-display">
    <div class="the-one-label">The One까지</div>
    <div class="the-one-value">${formatAsset(profile.targetAsset - profile.asset)}</div>
    <div class="the-one-target">현재 ${formatAsset(profile.asset)} / 목표 5경원</div>
    <div style="margin-top:12px" class="progress-wrap"><div class="progress-bar" style="width:${pct.toFixed(4)}%"></div></div>
  </div>

  <div class="tip-box ${rating.class === 'bad' ? 'danger' : ''}">
    <div class="tip-title">${rating.emoji} 오늘의 일진 — ${rating.rating}</div>
    <div class="tip-text">${rating.tip}</div>
  </div>

  <div class="card card-sm">
    <div class="flex-between">
      <div class="card-title">오늘 습관</div>
      <span class="chip chip-water">${doneCount}/${habits.length}</span>
    </div>
    <div class="progress-wrap mt8"><div class="progress-bar" style="width:${Math.round(doneCount/habits.length*100)}%"></div></div>
  </div>

  <div class="section-title">🌊 오늘의 용신 활동</div>
  <div class="grid-3">
    ${activities.map(a => `<div class="stat-card"><div style="font-size:24px">${a.icon}</div><div style="font-size:11px;font-weight:600;margin-top:6px">${a.name}</div></div>`).join('')}
  </div>

  <div class="section-title mt16">🎯 주요 목표</div>
  ${goals.slice(0,3).map(g => `
  <div class="goal-item">
    <div class="goal-icon">${g.icon}</div>
    <div class="goal-info">
      <div class="goal-name">${g.name}</div>
      <div class="progress-wrap mt8" style="height:4px"><div class="progress-bar" style="width:${g.pct}%"></div></div>
    </div>
    <div class="goal-pct">${g.pct}%</div>
  </div>`).join('')}`;
}

// ═══ HABITS ═══
function renderHabits() {
  const habits = Store.getHabits();
  const completions = Store.getCompletions();
  return `
  <div class="section-title">✅ 오늘의 습관</div>
  <div class="card card-sm" style="margin-bottom:16px">
    <div class="card-title">원자습관 4법칙</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      ${['1.신호 만들기','2.갈망 강화','3.반응 쉽게','4.즉시 보상'].map(t=>`<div class="chip chip-water" style="justify-content:center">${t}</div>`).join('')}
    </div>
  </div>
  ${habits.map(h => `
  <div class="habit-item ${completions[h.id] ? 'done' : ''}" data-habit="${h.id}">
    <div class="habit-check">${completions[h.id] ? '✓' : ''}</div>
    <div class="habit-info">
      <div class="habit-name">${h.icon} ${h.name}</div>
      <div class="habit-meta">${h.target} · ${h.cue}</div>
      ${h.note ? `<div style="font-size:11px;color:var(--gold);margin-top:2px">${h.note}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="habit-streak">${Store.getStreak(h.id)}일🔥</div>
      <div style="font-size:10px;color:var(--text-dim)">${Store.getWeeklyRate(h.id)}%/주</div>
    </div>
  </div>`).join('')}
  <button class="btn btn-water btn-full" id="evolve-btn" style="margin-top:12px">⚡ 주간 자가수정 실행</button>`;
}

// ═══ MANDARAT ═══
function renderMandarat() {
  const { cells } = Store.getMandarat();
  const POSITIONS = {
    // center of each 3x3 block (row*9+col)
    centers: [10,13,16, 37,40,43, 64,67,70],
    mains: [13,22,31,39,41,49,58,67]
  };
  return `
  <div class="section-title">🎯 만다라트 — The One 목표 매트릭스</div>
  <div class="card card-sm" style="margin-bottom:12px">
    <div class="card-title">오타니 만다라트 방식 · 9×9 = 81칸</div>
    <div style="font-size:12px;color:var(--text-dim)">중앙 = The One. 8방향 = 핵심 목표. 각 목표 주변 = 세부 행동</div>
  </div>
  <div class="mandarat-container">
    <div class="mandarat-grid">
      ${cells.map((c,i) => `
      <div class="mandarat-cell ${i===40?'center-main':POSITIONS.mains.includes(i)?'center-goal':''}" 
           data-idx="${i}" onclick="editMandarat(${i})">
        ${c || (i===40?'THE ONE':'+')}
      </div>`).join('')}
    </div>
  </div>`;
}

// ═══ SAJU ═══
function renderSaju() {
  const calDays = getMonthCalendar(today.getFullYear(), today.getMonth());
  const monthEnergy = getMonthEnergyLevel(today.getFullYear(), today.getMonth());
  const gj = getDayGanjio(today);
  const rating = getDayRating(today);

  return `
  <div class="section-title">☯ 사주 개운 시스템</div>

  <div class="card card-sm">
    <div class="card-title">오행 에너지 현황 (甲寅일주 기준)</div>
    <div class="energy-bars">
      ${[['水','water',85],['金','gold',60],['木','wood',20],['火','fire',5]].map(([l,c,v])=>`
      <div class="energy-row">
        <div class="energy-label">${l}</div>
        <div class="energy-bar-wrap"><div class="energy-fill ${c}" style="width:${v}%"></div></div>
        <div class="energy-value">${v}%</div>
      </div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--text-dim);margin-top:8px">오늘 일진: ${gj.gk}${gj.jk}(${gj.g}${gj.j}) · ${rating.rating}</div>
  </div>

  <div class="section-title">대운 타임라인</div>
  <div class="daewoon-timeline">
    ${DAEWOON.map(d=>`
    <div class="daewoon-item ${d.active?'active':''}">
      <div class="daewoon-char" style="color:${d.color}">${d.han}</div>
      <div class="daewoon-period">${d.period}</div>
      <div class="daewoon-desc" style="color:${d.color}">${d.desc}</div>
      <div style="font-size:10px;color:var(--text-faint);margin-top:4px">${d.tip}</div>
    </div>`).join('')}
  </div>

  <div class="section-title">이번 달 일진 달력</div>
  <div class="tip-box ${monthEnergy.level==='위험'?'danger':''}">
    <div class="tip-title">${monthEnergy.level} 구간</div>
    <div class="tip-text">${monthEnergy.desc}</div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:8px;text-align:center">
    ${['일','월','화','수','목','금','토'].map(d=>`<div style="font-size:10px;color:var(--text-faint);padding:4px">${d}</div>`).join('')}
  </div>
  <div class="saju-calendar-grid">
    ${calDays.map(d => {
      if (!d) return `<div class="cal-day empty"></div>`;
      const r = getDayRating(d);
      const gj2 = getDayGanjio(d);
      const isToday = d.getDate()===today.getDate();
      return `<div class="cal-day ${r.class} ${isToday?'today':''}">
        <div>${d.getDate()}</div>
        <div class="cal-ganjio">${gj2.gk}${gj2.jk}</div>
      </div>`;
    }).join('')}
  </div>

  <div class="section-title mt16">🙏 불교 개운 수행</div>
  ${[
    {icon:'🧘',name:'바른 마음챙김 (正念)',desc:'팔정도 7번째. 호흡 관찰 10분. 화기 억제 최고'},
    {icon:'📿',name:'108배',desc:'신체 火기운 소진 + 土 다지기. 인사형살 물상대체'},
    {icon:'🕯',name:'자비 명상 (慈悲觀)',desc:'타인을 위한 마음 = 甲木의 확장성 강화'},
    {icon:'☯',name:'옴 마니 반메 훔',desc:'실버 링 착용 + 염송. 金 오행 활성화'}
  ].map(a=>`<div class="habit-item">
    <div style="font-size:22px">${a.icon}</div>
    <div class="habit-info"><div class="habit-name">${a.name}</div><div class="habit-meta">${a.desc}</div></div>
  </div>`).join('')}`;
}

// ═══ JOURNAL ═══
function renderJournal() {
  const dateKey = today.toISOString().slice(0,10);
  const saved = Store.getJournal(dateKey);
  const history = Store.getJournalHistory().filter(j=>j.date!==dateKey).slice(0,5);
  return `
  <div class="section-title">📓 야간 저널 — 3문항 반성</div>
  <div class="card card-sm" style="margin-bottom:16px">
    <div style="font-size:12px;color:var(--text-dim)">나폴레온 힐 "생각만으론 의미없다. 반드시 기록하라" · 소요시간 2분</div>
  </div>
  <form id="journal-form">
    ${[
      {id:'q1',icon:'🌊',label:'오늘 The One에 가까워진 행동 1가지?'},
      {id:'q2',icon:'🔥',label:'재극인(土/火) 행동을 했나? (土=돈걱정, 火=충동)'},
      {id:'q3',icon:'⭐',label:'내일 한 가지만 바꾼다면?'}
    ].map(q=>`
    <div class="journal-question">
      <label>${q.icon} ${q.label}</label>
      <textarea id="jq_${q.id}" placeholder="기록하지 않으면 존재하지 않는다...">${saved[q.id]||''}</textarea>
    </div>`).join('')}
    <button type="submit" class="btn btn-water btn-full">💾 저장</button>
  </form>
  ${history.length ? `
  <div class="section-title mt16">최근 저널</div>
  ${history.map(j=>`
  <div class="card card-sm">
    <div class="flex-between"><div class="card-title">${j.date}</div></div>
    <div style="font-size:13px;color:var(--text-dim)">${j.q1||'(없음)'}</div>
  </div>`).join('')}` : ''}`;
}

// ═══ MORE ═══
function renderMore() {
  const profile = Store.getProfile();
  return `
  <div class="section-title">⋯ 더보기</div>

  <div class="section-title" style="font-size:14px">이키가이 (Ikigai)</div>
  ${[
    {cls:'ikigai-love',label:'❤ 내가 사랑하는 것',text:'끊임없는 성장. 법과 기술의 융합. 지식 추구'},
    {cls:'ikigai-world',label:'🌍 세상이 필요한 것',text:'AI 윤리, 지속가능성, 다행성 사회 설계'},
    {cls:'ikigai-good',label:'⭐ 내가 잘하는 것',text:'법적 추론, 문제해결, 새 기술 적응, 사업 경험'},
    {cls:'ikigai-paid',label:'💰 보상받을 수 있는 것',text:'Legal-AI 자동화, 퀀트 헤지펀드, 국제 M&A'}
  ].map(i=>`<div class="ikigai-section ${i.cls}"><div class="ikigai-label">${i.label}</div><div class="ikigai-text">${i.text}</div></div>`).join('')}

  <div class="section-title mt16" style="font-size:14px">나폴레온 힐 — 욕망의 6단계</div>
  <ol class="napoleon-list">
    ${['정확한 금액을 결정하라 (5경원)','그것을 얻기 위해 무엇을 줄 것인지 결정하라 (법+AI+시간)','확실한 날짜를 정하라 (경자대운 완성)','계획을 세우고 즉시 행동하라','명확하고 구체적인 문장으로 쓰라','매일 2번 소리내어 읽어라'].map(s=>`<li class="napoleon-step">${s}</li>`).join('')}
  </ol>

  <div class="more-item" onclick="openSettings()" style="margin-top:16px">
    <div class="more-icon">⚙</div>
    <div class="more-info"><h3>설정 · Firebase 연동</h3><p>다기기 동기화 설정, 자산 업데이트</p></div>
  </div>
  <div class="more-item" onclick="openEvolution()">
    <div class="more-icon">⚡</div>
    <div class="more-info"><h3>자가수정 리포트</h3><p>주간 완료율 분석 · 자동 목표 조정</p></div>
  </div>
  <div class="more-item" onclick="openGoals()">
    <div class="more-icon">🎯</div>
    <div class="more-info"><h3>전체 목표 관리</h3><p>The One 로드맵 상세 편집</p></div>
  </div>
  <div style="text-align:center;margin-top:24px;font-size:11px;color:var(--text-faint)">
    Life OS v1.0 · ${profile.name} · ${profile.saju}<br>
    ${Store.isLoggedIn() ? '☁ Firebase 동기화 중' : '💾 로컬 저장'}
  </div>`;
}

// ═══ EVENT BINDING ═══
function bindPageEvents(page) {
  if (page === 'habits') {
    document.querySelectorAll('.habit-item[data-habit]').forEach(el => {
      el.onclick = () => {
        const id = el.dataset.habit;
        const c = Store.getCompletions();
        c[id] = !c[id];
        Store.setCompletions(c);
        renderPage('habits');
      };
    });
    document.getElementById('evolve-btn')?.addEventListener('click', () => {
      Store.evolveHabits();
      alert('✅ 자가수정 완료! 완료율 기반으로 목표가 조정됐습니다.');
      renderPage('habits');
    });
  }
  if (page === 'journal') {
    document.getElementById('journal-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const data = { q1: document.getElementById('jq_q1').value, q2: document.getElementById('jq_q2').value, q3: document.getElementById('jq_q3').value };
      Store.setJournal(data);
      alert('📓 저장 완료. 기록이 곧 현실이 됩니다.');
    });
  }
}

// ═══ GLOBAL HANDLERS ═══
window.editMandarat = function(idx) {
  const m = Store.getMandarat();
  const val = prompt('내용 입력 (줄바꿈: \\n)', m.cells[idx]);
  if (val !== null) { m.cells[idx] = val; Store.setMandarat(m); renderPage('mandarat'); }
};

window.openSettings = function() {
  const html = `
  <div class="modal-overlay" onclick="this.remove()">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div class="section-title">⚙ 설정</div>
      <div class="card card-sm">
        <div class="card-title">자산 업데이트</div>
        <input class="input" id="asset-input" type="number" placeholder="현재 자산 (원)" value="${Store.getProfile().asset}">
        <button class="btn btn-water btn-full" style="margin-top:8px" onclick="saveAsset()">저장</button>
      </div>
      <div class="card card-sm" style="margin-top:12px">
        <div class="card-title">Firebase 설정 (다기기 동기화)</div>
        <input class="input" id="fb-key" placeholder="apiKey" style="margin-bottom:6px">
        <input class="input" id="fb-domain" placeholder="authDomain" style="margin-bottom:6px">
        <input class="input" id="fb-project" placeholder="projectId" style="margin-bottom:6px">
        <button class="btn btn-gold btn-full" onclick="saveFirebase()">Firebase 연동</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.saveAsset = function() {
  const v = parseInt(document.getElementById('asset-input').value);
  if (v) { const p = Store.getProfile(); p.asset = v; Store.setProfile(p); alert('✅ 저장됨'); }
};

window.saveFirebase = function() {
  FB.setConfig({ apiKey: document.getElementById('fb-key').value, authDomain: document.getElementById('fb-domain').value, projectId: document.getElementById('fb-project').value });
  alert('Firebase 설정 저장. 페이지를 새로고침해주세요.');
};

window.openEvolution = function() {
  const habits = Store.getHabits();
  const rows = habits.map(h => `<div class="habit-item"><div class="habit-info"><div class="habit-name">${h.icon} ${h.name}</div><div class="habit-meta">완료율 ${Store.getWeeklyRate(h.id)}% · 스트릭 ${Store.getStreak(h.id)}일</div></div><div class="chip ${Store.getWeeklyRate(h.id)>70?'chip-water':'chip-danger'}">${Store.getWeeklyRate(h.id)}%</div></div>`).join('');
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay" onclick="this.remove()"><div class="modal" onclick="event.stopPropagation()"><div class="modal-handle"></div><div class="section-title">⚡ 주간 리포트</div>${rows}</div></div>`);
};

window.openGoals = function() {
  const goals = Store.getGoals();
  const rows = goals.map(g => `<div class="goal-item"><div class="goal-icon">${g.icon}</div><div class="goal-info"><div class="goal-name">${g.name}</div><div class="goal-deadline">${g.deadline}</div><div class="progress-wrap mt8" style="height:4px"><div class="progress-bar" style="width:${g.pct}%"></div></div></div><div class="goal-pct">${g.pct}%</div></div>`).join('');
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay" onclick="this.remove()"><div class="modal" onclick="event.stopPropagation()"><div class="modal-handle"></div><div class="section-title">🎯 전체 목표</div>${rows}</div></div>`);
};

function formatAsset(n) {
  if (n >= 1e16) return (n/1e16).toFixed(1) + '경원';
  if (n >= 1e12) return (n/1e12).toFixed(1) + '조원';
  if (n >= 1e8) return (n/1e8).toFixed(1) + '억원';
  if (n >= 1e4) return (n/1e4).toFixed(0) + '만원';
  return n.toLocaleString() + '원';
}
