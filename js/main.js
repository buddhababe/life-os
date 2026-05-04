// MAIN ENTRY — Life OS v2.0
import { getDayGanjio, getDayRating, getYongshinActivities, DAEWOON, getMonthCalendar } from './saju.js';
import { Store } from './store.js';
import { engine } from './evolution.js';

const today = new Date();
let currentTab = 'gate';
let isTinyMode = false;

// ─── BOOT ───
window.addEventListener('load', async () => {
  await sleep(1200); // splash
  document.getElementById('splash').style.opacity = '0';
  await sleep(500);
  document.getElementById('splash').classList.add('hidden');

  const mode = localStorage.getItem('lifeos_mode');
  if (mode) {
    showApp();
  } else {
    document.getElementById('auth').classList.remove('hidden');
    setupAuth();
  }
});

function setupAuth() {
  document.getElementById('btn-google').onclick = async () => {
    // Firebase Google sign-in (requires Firebase config)
    try {
      const { FB } = await import('./firebase-init.js');
      await FB.signInGoogle();
      localStorage.setItem('lifeos_mode', 'firebase');
      document.getElementById('auth').classList.add('hidden');
      showApp();
    } catch(e) {
      console.warn('Google sign-in failed, falling back to local:', e);
      startLocal();
    }
  };
  document.getElementById('btn-local').onclick = startLocal;
}

function startLocal() {
  localStorage.setItem('lifeos_mode', 'local');
  document.getElementById('auth').classList.add('hidden');
  showApp();
}

async function showApp() {
  document.getElementById('app').classList.remove('hidden');
  updateHeader();
  setupNav();
  requestNotificationPermission();

  // Auto-run evolution engine
  const evoResult = await engine.autoCheck();
  window._evo = evoResult;

  // Determine best starting tab
  const todayKey = today.toISOString().slice(0,10);
  const gate = Store.getGate(todayKey);
  if (!gate.done) {
    switchTab('gate');
  } else {
    const hour = today.getHours();
    switchTab(hour >= 20 ? 'reflect' : 'core');
  }

  setInterval(updateHeader, 60000);
}

// ─── HEADER ───
function updateHeader() {
  const gj = getDayGanjio(today);
  const rating = getDayRating(today);
  const DAYS = ['일','월','화','수','목','금','토'];
  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  document.getElementById('hdr-date').textContent =
    `${today.getFullYear()}년 ${MONTHS[today.getMonth()]} ${today.getDate()}일(${DAYS[today.getDay()]})`;

  const badge = document.getElementById('hdr-ganjio');
  badge.textContent = `${gj.gk}${gj.jk} ${rating.rating}`;
  badge.className = `hdr-badge badge-${rating.class}`;

  // Best streak
  const habits = Store.getHabits();
  const maxStreak = habits.reduce((m,h) => Math.max(m, Store.getStreak(h.id)), 0);
  document.getElementById('streak-display').innerHTML = maxStreak > 0
    ? `🔥 ${maxStreak}일` : '';
}

// ─── NAV ───
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  render();
}

function render() {
  const el = document.getElementById('page');
  el.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'page-enter';
  switch(currentTab) {
    case 'gate':    div.innerHTML = renderGate(); break;
    case 'core':    div.innerHTML = renderCore(); break;
    case 'reflect': div.innerHTML = renderReflect(); break;
    case 'evolve':  div.innerHTML = renderEvolve(); break;
  }
  el.appendChild(div);
  bindEvents();
}

// ─── GATE (Morning Check-in) ───
function renderGate() {
  const todayKey = today.toISOString().slice(0,10);
  const gate = Store.getGate(todayKey);
  const rating = getDayRating(today);
  const activities = getYongshinActivities(rating).slice(0,3);
  const profile = Store.getProfile();
  const pct = (profile.asset / profile.targetAsset * 100).toFixed(5);
  const notifGranted = Notification.permission === 'granted';

  if (gate.done) {
    return `
    <div class="the-one-bar">
      <div class="tob-label">The One까지</div>
      <div class="tob-value">${formatAsset(profile.targetAsset - profile.asset)}</div>
      <div class="tob-sub">현재 ${formatAsset(profile.asset)} / 목표 5경원</div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="identity-bar">
      <div class="ib-vote">오늘의 정체성 투표</div>
      <div class="ib-text">아침 게이트 완료 ✓<br>The One에 한 표 투표했습니다</div>
      <div class="ib-count">에너지 ${gate.energy || '?'}/5 · 오늘의 #1: ${gate.priority || '?'}</div>
    </div>
    ${!notifGranted ? renderNotifPrompt() : ''}
    <div class="saju-band sb-${rating.class}">
      <div class="sb-icon">${rating.emoji}</div>
      <div class="sb-text"><div class="sb-label">${rating.rating} · 오늘의 사주 조언</div>${rating.tip}</div>
    </div>
    <div class="section-head mt16">🌊 용신 활동 추천</div>
    ${activities.map(a=>`
    <div class="card card-sm" style="display:flex;align-items:center;gap:12px">
      <div style="font-size:22px">${a.icon}</div>
      <div><div style="font-size:14px;font-weight:700">${a.name}</div><div style="font-size:11px;color:var(--text2);margin-top:2px">${a.desc}</div></div>
    </div>`).join('')}
    <button class="btn btn-water btn-full mt16" onclick="window.switchToCore()">핵심 습관으로 →</button>`;
  }

  return `
  ${!notifGranted ? renderNotifPrompt() : ''}
  <div class="gate-status">
    <div class="gate-icon">🌅</div>
    <div class="gate-title">아침 게이트</div>
    <div class="gate-sub">60초. 하루를 설계하는 시간.</div>
  </div>

  <div class="identity-bar" style="margin-bottom:16px">
    <div class="ib-vote">정체성 선언</div>
    <div class="ib-text">"나는 위효연.<br>오늘의 행동이 The One을 만든다."</div>
  </div>

  <div class="card">
    <div class="card-title">① 오늘 에너지 레벨</div>
    <div class="energy-sel" id="energy-sel">
      ${[1,2,3,4,5].map(n=>`<button class="energy-opt" data-e="${n}">${['😴','😐','🙂','💪','⚡'][n-1]}<br><span style="font-size:10px">${n}</span></button>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title">② 오늘의 #1 행동 (The One을 위해)</div>
    <input class="mb-input" id="priority-input" placeholder="오늘 반드시 할 단 하나" style="text-align:left;padding:10px 12px">
    <div class="rq-hint mt8">CFA 공부 2시간 / 수영 / 이력서 작성 등</div>
  </div>

  <div class="card">
    <div class="card-title">③ 오늘의 의도 (한 단어)</div>
    <input class="mb-input" id="intention-input" placeholder="집중 / 인내 / 전진 / 수련...">
  </div>

  <button class="btn btn-gold btn-full" id="gate-submit" style="margin-top:4px">
    ✓ 게이트 통과 — The One으로
  </button>`;
}

function renderNotifPrompt() {
  return `<div class="notif-prompt">
    <div class="np-icon">🔔</div>
    <div class="np-text"><b>알람 권한</b> 허용하면<br>아침·저녁 자동 알림을 받습니다</div>
    <button class="np-btn" onclick="window.reqNotif()">허용</button>
  </div>`;
}

// ─── CORE (Habits) ───
function renderCore() {
  const habits = Store.getHabits();
  const comps = Store.getCompletions();
  const rating = getDayRating(today);
  const doneCount = habits.filter(h => comps[h.id]).length;
  const allDone = doneCount === habits.length;

  // Auto tiny mode on bad days
  const autoTiny = rating.score <= -2;

  return `
  <div class="identity-bar">
    <div class="ib-vote">정체성 투표 현황</div>
    <div class="ib-text">오늘 <b style="color:var(--water)">${doneCount}/${habits.length}</b>개 완료 — ${allDone ? '✅ The One답게 살았다' : '계속 투표하라'}</div>
  </div>

  <div class="saju-band sb-${rating.class}" style="margin-bottom:12px">
    <div class="sb-icon">${rating.emoji}</div>
    <div class="sb-text">
      <div class="sb-label">${rating.rating} — ${autoTiny ? '오늘은 TINY 버전으로 충분하다' : '오늘은 FULL 버전을 목표로'}</div>
      ${autoTiny ? '기신일: 30초 TINY라도 완료하면 The One 투표 성공' : rating.tip}
    </div>
  </div>

  <div class="tiny-toggle">
    <button class="tt-btn ${!isTinyMode && !autoTiny ? 'active' : ''}" id="btn-full-mode">💪 FULL 버전</button>
    <button class="tt-btn ${isTinyMode || autoTiny ? 'active' : ''}" id="btn-tiny-mode">⚡ TINY 버전 (2분)</button>
  </div>

  ${habits.map(h => {
    const done = !!comps[h.id];
    const streak = Store.getStreak(h.id);
    const rate = Store.getWeeklyRate(h.id);
    const showTiny = isTinyMode || autoTiny;
    return `
    <div class="habit-row ${done ? 'done' : ''}" data-hid="${h.id}">
      <div class="hr-check">${done ? '✓' : ''}</div>
      <div class="hr-body">
        <div class="hr-name">${h.icon} ${h.name}</div>
        <div class="hr-identity">↳ The One은 이것을 한다</div>
        <div class="hr-tiny">${showTiny ? `⚡ TINY: ${h.tiny}` : `💪 FULL: ${h.target}`}</div>
      </div>
      <div class="hr-right">
        <div class="hr-streak">${streak > 0 ? `🔥${streak}` : '0'}</div>
        <div class="hr-rate">${rate}%/주</div>
      </div>
    </div>`;
  }).join('')}

  ${allDone ? `
  <div class="card" style="border-color:var(--success);text-align:center;margin-top:4px">
    <div style="font-size:28px;margin-bottom:6px">🏆</div>
    <div style="font-weight:800;color:var(--success)">오늘 모든 투표 완료</div>
    <div style="font-size:12px;color:var(--text2);margin-top:4px">The One이 되는 길을 걷고 있다</div>
  </div>` : ''}

  <div class="divider"></div>
  <div class="section-head">🎯 만다라트</div>
  <div class="mandarat-wrap"><div class="mandarat-grid" id="mg">${renderMandaratGrid()}</div></div>`;
}

// ─── REFLECT (Evening) ───
function renderReflect() {
  const todayKey = today.toISOString().slice(0,10);
  const saved = Store.getJournal(todayKey);
  const habits = Store.getHabits();
  const comps = Store.getCompletions();
  const doneCount = habits.filter(h => comps[h.id]).length;

  return `
  <div class="identity-bar">
    <div class="ib-vote">저녁 성찰</div>
    <div class="ib-text">오늘 ${doneCount}/${habits.length}개 완료<br>"기록하지 않으면 존재하지 않는다"</div>
  </div>

  <form id="reflect-form">
    ${[
      {id:'q1', icon:'🌊', label:'오늘 The One에 가까워진 행동 1가지?', hint:'작은 것도 좋다. 수영 완료, 공부 2시간, 물 2L...'},
      {id:'q2', icon:'🔥', label:'재극인(土/火) 행동을 했나?', hint:'충동 구매, 감정적 결정, 과식, 무의미한 SNS...'},
      {id:'q3', icon:'⭐', label:'내일 #1 행동?', hint:'구체적으로. "CFA 2시간" ○ / "열심히" ✗'}
    ].map(q=>`
    <div class="reflect-q">
      <div class="rq-label">${q.icon} ${q.label}</div>
      <textarea class="rq-ta" id="rq_${q.id}" placeholder="${q.hint}">${saved[q.id]||''}</textarea>
    </div>`).join('')}
    <button type="submit" class="btn btn-water btn-full">💾 저장 · 내일을 설계하다</button>
  </form>

  <div class="divider"></div>
  <div class="section-head">🙏 불교 수행 · 오늘의 수련</div>
  ${[
    {icon:'🧘',name:'마음챙김 명상 10분',desc:'팔정도 正念. 화기 억제 최강'},
    {icon:'🌊',name:'수분 2L 확인',desc:'癸水 직접 보충. 용신 물상'},
    {icon:'⚪',name:'내일 운동복 꺼내두기',desc:'Fogg 환경설계. 마찰 제거'}
  ].map(a=>`<div class="card card-sm" style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    <div style="font-size:20px">${a.icon}</div>
    <div><div style="font-weight:700;font-size:14px">${a.name}</div><div style="font-size:11px;color:var(--text2);margin-top:1px">${a.desc}</div></div>
  </div>`).join('')}`;
}

// ─── EVOLVE ───
function renderEvolve() {
  const evo = window._evo;
  const report = engine.getLatestReport();
  const daysLeft = engine.getDaysUntilNextEvolution();
  const profile = Store.getProfile();

  return `
  <div class="evo-score">
    <div class="es-num">${report?.score?.total || 0}</div>
    <div class="es-label">진화 점수 / 100</div>
  </div>

  <div class="the-one-bar">
    <div class="tob-label">The One까지</div>
    <div class="tob-value">${formatAsset(profile.targetAsset - profile.asset)}</div>
    <div class="tob-sub">현재 ${formatAsset(profile.asset)} · 목표 5경원</div>
    <div class="progress-track"><div class="progress-fill" style="width:${(profile.asset/profile.targetAsset*100).toFixed(5)}%"></div></div>
  </div>

  ${evo?.insights?.length ? `
  <div class="section-head">⚡ 이번 주 인사이트</div>
  ${evo.insights.slice(0,5).map(i=>`
  <div class="insight-row ir-${i.level}">
    <div class="ir-title" style="color:${i.level==='success'?'var(--success)':i.level==='warning'?'var(--gold)':'var(--fire)'}">${i.type.replace(/_/g,' ')}</div>
    <div class="ir-msg">${i.message}</div>
  </div>`).join('')}
  <div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center">자동 적용: ${evo.actions?.length||0}개 · 다음 분석: D-${daysLeft}</div>
  ` : `
  <div class="card" style="text-align:center;padding:24px">
    <div style="font-size:32px;margin-bottom:8px">⏳</div>
    <div style="font-weight:700">데이터 수집 중</div>
    <div style="font-size:12px;color:var(--text2);margin-top:6px">3일 이상 기록하면 첫 자가분석이 실행됩니다</div>
  </div>`}

  <div class="divider"></div>
  <div class="section-head">☯ 대운 타임라인</div>
  <div class="dw-timeline">
    ${DAEWOON.map(d=>`
    <div class="dw-item ${d.active?'active':''}">
      <div class="dw-char" style="color:${d.color}">${d.han}</div>
      <div class="dw-period">${d.period}</div>
      <div class="dw-desc" style="color:${d.color}">${d.desc}</div>
    </div>`).join('')}
  </div>

  <div class="divider"></div>
  <div class="section-head">⚙ 설정</div>
  <button class="btn btn-water btn-full" onclick="window.openSettings()">자산 업데이트 · Firebase 설정</button>
  <button class="btn btn-gold btn-full mt8" onclick="window.forceEvolve()">🔄 자가진화 지금 실행</button>`;
}

// ─── MANDARAT ───
function renderMandaratGrid() {
  const { cells } = Store.getMandarat();
  const MAINS = [13,22,31,39,41,49,58,67];
  return cells.map((c,i)=>`
  <div class="mc ${i===40?'main-center':MAINS.includes(i)?'sub-center':''}" data-idx="${i}" onclick="editCell(${i})">
    ${c||(i===40?'THE\nONE':'+')}
  </div>`).join('');
}

// ─── BIND EVENTS ───
function bindEvents() {
  // Gate
  document.getElementById('gate-submit')?.addEventListener('click', submitGate);
  document.querySelectorAll('.energy-opt').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.energy-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });

  // Habits
  document.querySelectorAll('.habit-row[data-hid]').forEach(row => {
    row.onclick = () => {
      const id = row.dataset.hid;
      const c = Store.getCompletions();
      c[id] = !c[id];
      Store.setCompletions(c);
      render();
    };
  });

  document.getElementById('btn-full-mode')?.addEventListener('click', () => { isTinyMode = false; render(); });
  document.getElementById('btn-tiny-mode')?.addEventListener('click', () => { isTinyMode = true; render(); });

  // Reflect
  document.getElementById('reflect-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const data = { q1: document.getElementById('rq_q1').value, q2: document.getElementById('rq_q2').value, q3: document.getElementById('rq_q3').value };
    Store.setJournal(data);
    alert('✅ 저장됐습니다. 내일을 설계했습니다.');
  });
}

function submitGate() {
  const energy = document.querySelector('.energy-opt.selected')?.dataset.e;
  const priority = document.getElementById('priority-input')?.value.trim();
  const intention = document.getElementById('intention-input')?.value.trim();
  if (!energy) { alert('에너지 레벨을 선택해주세요'); return; }
  if (!priority) { alert('오늘의 #1 행동을 입력해주세요'); return; }
  const todayKey = today.toISOString().slice(0,10);
  Store.setGate(todayKey, { done: true, energy, priority, intention, ts: Date.now() });
  render();
}

// ─── GLOBALS ───
window.switchToCore = () => switchTab('core');
window.reqNotif = async () => {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') scheduleNotifications();
  render();
};
window.editCell = (idx) => {
  const m = Store.getMandarat();
  const val = prompt('내용 입력', m.cells[idx]);
  if (val !== null) { m.cells[idx] = val; Store.setMandarat(m); render(); }
};
window.forceEvolve = async () => {
  window._evo = await engine.runFullEvolution();
  render();
  alert('✅ 자가진화 완료');
};
window.openSettings = () => {
  const asset = prompt('현재 자산 (원)', Store.getProfile().asset);
  if (asset) { const p = Store.getProfile(); p.asset = parseInt(asset); Store.setProfile(p); render(); }
};

// ─── NOTIFICATIONS ───
async function requestNotificationPermission() {
  if (Notification.permission === 'default') {
    // Don't auto-request — let user tap the prompt
  }
}

function scheduleNotifications() {
  // Schedule via Service Worker (basic)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIF',
      notifications: [
        { hour: 6, min: 30, title: '☯ The One의 아침', body: '아침 게이트를 통과하라. 지금 시작하라.' },
        { hour: 22, min: 0, title: '🌙 저녁 성찰', body: '오늘 The One에 가까워졌나? 기록하라.' }
      ]
    });
  }
}

// ─── UTILS ───
function formatAsset(n) {
  if (n >= 1e16) return (n/1e16).toFixed(2) + '경원';
  if (n >= 1e12) return (n/1e12).toFixed(1) + '조원';
  if (n >= 1e8)  return (n/1e8).toFixed(1) + '억원';
  return n.toLocaleString() + '원';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
