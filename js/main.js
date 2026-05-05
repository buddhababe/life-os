// MAIN ENTRY — Life OS v2.0 (Top-Down V4)
import { getDayGanjio, getDayRating, getYongshinActivities, DAEWOON } from './saju.js';
import { Store } from './store.js';
import { engine } from './evolution.js';
import { Portfolio, calcPortfolioTotal, renderPortfolioSection, renderPortfolioEditor } from './portfolio.js';

const today = new Date();
const todayKey = today.toISOString().slice(0,10);
let currentTab = 'radar';
let isTinyMode = false;
let _pfData = null;

// Flow Timer state
let flowSeconds = 0;
let flowInterval = null;
let isFlowing = false;
let flowChallenge = 5;
let flowSkill = 5;

// Zoom Mandarat state
let mandaratZoomedId = -1; // -1 = center 3x3 view

// ─── BOOT ───
window.addEventListener('load', async () => {
  await sleep(1200);
  document.getElementById('splash').style.opacity = '0';
  await sleep(500);
  document.getElementById('splash').classList.add('hidden');
  const mode = localStorage.getItem('lifeos_mode');
  if (mode) { showApp(); } else {
    document.getElementById('auth').classList.remove('hidden');
    setupAuth();
  }
});

function setupAuth() {
  document.getElementById('btn-google').onclick = async () => {
    try {
      const { FB } = await import('./firebase-init.js');
      await FB.signInGoogle();
      localStorage.setItem('lifeos_mode', 'firebase');
      document.getElementById('auth').classList.add('hidden');
      showApp();
    } catch(e) { startLocal(); }
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
  const evoResult = await engine.autoCheck();
  window._evo = evoResult;
  
  const gate = Store.getGate(todayKey);
  currentTab = gate.done ? 'today' : 'radar';
  switchTab(currentTab);
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
  const habits = Store.getHabits();
  const maxStreak = habits.reduce((m,h) => Math.max(m, Store.getStreak(h.id)), 0);
  document.getElementById('streak-display').innerHTML = maxStreak > 0 ? `🔥 ${maxStreak}일` : '';
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
    case 'radar':    div.innerHTML = renderRadar(); break;
    case 'vision':   div.innerHTML = renderVision(); break;
    case 'strategy': div.innerHTML = renderStrategy(); break;
    case 'today':    div.innerHTML = renderToday(); break;
    case 'evolve':   div.innerHTML = renderEvolve(); break;
  }
  el.appendChild(div);
  bindEvents();
  if (currentTab === 'evolve') loadPortfolioUI();
}

// ─── 0. RADAR & BUSINESS (레이더) ───
function renderRadar() {
  const r = Store.getRadar();
  const s = Store.getSandbox();
  const f = Store.getForge();

  return `
  <div class="identity-bar" style="margin-bottom:16px">
    <div class="ib-vote">세상 감지 (World Radar)</div>
    <div class="ib-text">거시적 변화를 모니터링하여 생존 우위를 점하라.</div>
  </div>

  <div class="section-head mt16">📡 AI 및 시장 모니터링</div>
  ${r.map(item => `
    <div class="radar-item">
      <div class="radar-header"><span>${item.date}</span></div>
      <div style="font-weight:700;color:var(--water);font-size:13px;margin-bottom:4px">${item.title}</div>
      <div style="font-size:11px;color:var(--text2)">${item.desc}</div>
    </div>
  `).join('')}

  <div class="divider"></div>
  <div class="section-head">💡 아이디어 샌드박스 (비즈니스 필터)</div>
  ${s.map(item => `
    <div class="radar-item" style="border-color: ${item.status==='보류'?'rgba(255,255,255,0.05)':'var(--gold)'}">
      <div style="font-weight:700;font-size:13px;margin-bottom:6px">${item.title} <span style="font-size:10px;padding:2px 6px;background:rgba(255,255,255,0.1);border-radius:4px">${item.status}</span></div>
      <div style="font-size:11px;color:var(--text2);display:flex;justify-content:space-between">
        <span>AI 대체율: <b style="color:var(--fire)">${item.AI_replace}</b></span>
        <span>사주 상성: <b style="color:var(--water)">${item.Saju}</b></span>
      </div>
    </div>
  `).join('')}

  <div class="divider"></div>
  <div class="section-head">🔨 무기 제련소 (Skill Forge)</div>
  ${f.map(item => `
    <div class="radar-item">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-weight:700;font-size:12px">${item.skill}</span>
        <span style="font-size:10px;color:var(--text2)">${item.level}</span>
      </div>
      <div class="progress-track" style="height:4px;margin:0"><div class="progress-fill" style="width:${item.exp}%"></div></div>
    </div>
  `).join('')}
  <button class="btn btn-ghost btn-full mt16" onclick="alert('편집 기능 준비중')">✏️ 레이더/사업 항목 편집</button>
  `;
}

// ─── 1. VISION (비전) ───
function renderVision() {
  const i = Store.getIkigai();
  return `
  <div class="identity-bar" style="margin-bottom:16px">
    <div class="ib-vote">트랜서핑 목표 슬라이드 (The Slide)</div>
    <div class="ib-text" style="font-size:16px">"나는 이미<br><span style="color:var(--gold)">${i.ikigai}</span>이다."</div>
  </div>
  
  <div class="section-head">🌸 이키가이 (Ikigai)</div>
  <div class="ikigai-svg-wrap">
    <div class="ikigai-circle ikigai-top" onclick="alert('❤️ 좋아하는 것: ${i.love}')">LOVE</div>
    <div class="ikigai-circle ikigai-left" onclick="alert('💪 잘하는 것: ${i.goodAt}')">GOOD AT</div>
    <div class="ikigai-circle ikigai-right" onclick="alert('🌍 세상이 필요한 것: ${i.worldNeeds}')">WORLD<br>NEEDS</div>
    <div class="ikigai-circle ikigai-bottom" onclick="alert('💰 돈이 되는 것: ${i.paidFor}')">PAID FOR</div>
    <div class="ikigai-center" style="cursor:pointer" onclick="window.editIkigai()">IKIGAI</div>
  </div>
  <div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:16px">각 영역을 탭하여 상세 내용을 확인하세요. 중앙 탭시 수정.</div>

  <div class="saju-band sb-a" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1)">
    <div class="sb-icon">🕊️</div>
    <div class="sb-text">
      <div class="sb-label">중요도 낮추기 (Dropping Importance)</div>
      목표에 대한 과도한 집착을 버려라. 세상은 거울이다. 이미 이룬 자처럼 가볍게 선택하라.
    </div>
  </div>
  `;
}

// ─── 2. STRATEGY (전략) ───
function renderStrategy() {
  const w = Store.getWoop();
  return `
  <div class="section-head" style="display:flex;justify-content:space-between">
    <span>🎯 만다라트 (The Blueprint)</span>
    ${mandaratZoomedId !== -1 ? `<button class="btn" style="font-size:10px;padding:2px 8px" onclick="window.zoomOutMandarat()">🔙 뒤로가기</button>` : ''}
  </div>
  <div class="mandarat-zoom-wrap">
    <div class="mandarat-grid ${mandaratZoomedId !== -1 ? 'zoomed' : ''}" id="mg">
      ${renderMandaratCells()}
    </div>
  </div>
  <div style="font-size:11px;color:var(--text2);text-align:center;margin-top:16px">
    ${mandaratZoomedId === -1 ? '세부 목표 칸을 탭하여 줌인(Zoom-in) 하세요.' : '칸을 탭하여 내용을 수정하세요.'}
  </div>

  <div class="divider"></div>
  <div class="section-head">🛡️ WOOP 심적 대비 (Mental Contrasting)</div>
  <div class="card">
    <div style="font-size:11px;color:var(--text2)">WISH (소망)</div>
    <div style="font-weight:700;margin-bottom:8px;color:var(--water)">${w.wish}</div>
    <div style="font-size:11px;color:var(--text2)">OUTCOME (최상의 결과)</div>
    <div style="font-weight:700;margin-bottom:12px">${w.outcome}</div>
    <div style="font-size:11px;color:var(--fire)">OBSTACLE (장애물)</div>
    <div style="font-weight:700;margin-bottom:8px">${w.obstacle}</div>
    <div style="font-size:11px;color:var(--gold)">PLAN (If-Then 계획)</div>
    <div style="font-weight:700">${w.plan}</div>
  </div>
  <button class="btn btn-ghost btn-full mt8" onclick="window.editWoop()">✏️ WOOP 수정</button>
  `;
}

function renderMandaratCells() {
  const { cells } = Store.getMandarat();
  const MAINS = [13,22,31,39,41,49,58,67];
  let html = '';
  
  if (mandaratZoomedId === -1) {
    // Show only 9 main cells (index 40 and the 8 surrounding ones)
    // To make it look like a 3x3 grid, we just generate 9 cells
    const centers = [
      [cells[13], 13], [cells[22], 22], [cells[31], 31],
      [cells[39], 39], [cells[40]||'THE\nONE', 40], [cells[41], 41],
      [cells[49], 49], [cells[58], 58], [cells[67], 67]
    ];
    html = centers.map(c => `
      <div class="mc ${c[1]===40?'main-center':'sub-center'}" onclick="${c[1]===40 ? '' : `window.zoomInMandarat(${c[1]})`}">
        ${c[0]||'+'}
      </div>
    `).join('');
  } else {
    // Zoomed in: show the 9 cells of the selected sub-grid
    // Mapping main index to its 3x3 block
    const getBlockIndices = (centerIdx) => {
      const row = Math.floor(centerIdx/9); const col = centerIdx%9;
      const res = [];
      for(let r=row-1; r<=row+1; r++) for(let c=col-1; c<=col+1; c++) res.push(r*9+c);
      return res;
    };
    const indices = getBlockIndices(mandaratZoomedId);
    html = indices.map(idx => `
      <div class="mc ${idx===mandaratZoomedId?'sub-center':''}" onclick="window.editCell(${idx})">
        ${cells[idx]||'+'}
      </div>
    `).join('');
  }
  return html;
}

// ─── 3. TODAY (투데이) ───
function renderToday() {
  const gate = Store.getGate(todayKey);
  const hour = today.getHours();
  let html = '';

  // 3-1. GATE (아침)
  if (!gate.done) {
    const rating = getDayRating(today);
    const notifGranted = Notification.permission === 'granted';
    html += `
    ${!notifGranted ? renderNotifPrompt() : ''}
    <div class="gate-status">
      <div class="gate-icon">🌅</div>
      <div class="gate-title">나폴레온 힐 아침 암시</div>
      <div class="gate-sub">명확한 목표를 잠재의식에 각인하라.</div>
    </div>
    <div class="identity-bar" style="margin-bottom:16px">
      <div class="ib-vote">자기 암시 (Auto-Suggestion)</div>
      <div class="ib-text">"나는 이미 The One이다.<br>오늘의 이 선택이 그 증거가 될 것이다."</div>
    </div>
    <div class="card">
      <div class="card-title">① 오늘 에너지 레벨</div>
      <div class="energy-sel" id="energy-sel">
        ${[1,2,3,4,5].map(n=>`<button class="energy-opt" data-e="${n}">${['😴','😐','🙂','💪','⚡'][n-1]}<br><span style="font-size:10px">${n}</span></button>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-title">② 오늘의 #1 행동 (The One Thing)</div>
      <input class="mb-input" id="priority-input" placeholder="오늘 반드시 할 단 하나" style="text-align:left;padding:10px 12px">
    </div>
    <div class="card">
      <div class="card-title">③ 오늘의 의도 (한 단어)</div>
      <input class="mb-input" id="intention-input" placeholder="집중 / 인내 / 전진 / 수련...">
    </div>
    <button class="btn btn-gold btn-full" id="gate-submit" style="margin-top:4px">✓ 게이트 통과 — 잠재의식 각인</button>
    `;
    return html;
  }

  // 3-2. FLOW MATRIX (낮)
  const formatTime = (sec) => {
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = (sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  };

  // Calculate flow state
  let flowState = 'Apathy';
  let flowMsg = '과제를 변경하세요.';
  if (flowChallenge > 6 && flowSkill > 6) { flowState = 'Flow'; flowMsg = '🔥 완벽한 몰입 궤도입니다.'; }
  else if (flowChallenge > 6 && flowSkill <= 6) { flowState = 'Anxiety'; flowMsg = '난이도를 낮추거나 힌트를 찾으세요.'; }
  else if (flowChallenge <= 6 && flowSkill > 6) { flowState = 'Boredom'; flowMsg = '시간 제한을 두어 난이도를 높이세요.'; }

  const canStartFlow = flowState === 'Flow';

  html += `
  <div class="section-head">🔥 2D 몰입 (Flow) 매트릭스</div>
  <div class="card" style="text-align:center;">
    <div style="font-size:11px;color:var(--text2);margin-bottom:8px">오늘의 #1 행동: <b>${gate.priority}</b></div>
    
    <!-- Matrix Graphic -->
    <div class="flow-matrix-wrap">
      <div class="flow-quad flow-q-anxiety">불안 (Anxiety)</div>
      <div class="flow-quad flow-q-flow">몰입 (Flow)</div>
      <div class="flow-quad flow-q-apathy">무관심</div>
      <div class="flow-quad flow-q-boredom">지루함 (Boredom)</div>
      <div class="flow-axis-x"></div>
      <div class="flow-axis-y"></div>
      <div class="flow-label" style="bottom:4px;right:4px">실력 (Skill) →</div>
      <div class="flow-label" style="top:4px;left:4px;transform:rotate(-90deg);transform-origin:0 0;">난이도 (Challenge) →</div>
      
      <!-- Dot -->
      <div class="flow-dot" style="left:${flowSkill*10}%; bottom:${flowChallenge*10}%;"></div>
    </div>

    <!-- Sliders -->
    <div style="margin-top:16px;text-align:left">
      <label style="font-size:11px;color:var(--text2)">과제 난이도: <span style="color:#fff">${flowChallenge}</span></label>
      <input type="range" min="1" max="10" value="${flowChallenge}" class="mb-input" oninput="window.updateFlowGraph('C', this.value)" style="padding:0">
      <label style="font-size:11px;color:var(--text2);margin-top:8px;display:block">내 현재 실력: <span style="color:#fff">${flowSkill}</span></label>
      <input type="range" min="1" max="10" value="${flowSkill}" class="mb-input" oninput="window.updateFlowGraph('S', this.value)" style="padding:0">
    </div>

    <!-- State message -->
    <div style="margin-top:12px;font-size:12px;color:${canStartFlow?'var(--water)':'var(--fire)'};font-weight:700">${flowState}: ${flowMsg}</div>
    
    <div id="flow-display" style="font-size:42px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;margin-top:12px">${formatTime(flowSeconds)}</div>
    <button class="btn ${isFlowing ? 'btn-fire' : 'btn-water'} mt8" onclick="window.toggleFlow()" style="width:100%;font-weight:700" ${!canStartFlow && !isFlowing ? 'disabled' : ''}>
      ${isFlowing ? '■ 딥워크 정지' : '▶ 딥워크 타이머 시작'}
    </button>
  </div>
  `;

  // 3-3. HABITS (실행의도)
  const habits = Store.getHabits();
  const comps = Store.getCompletions();
  const rating = getDayRating(today);
  const doneCount = habits.filter(h => comps[h.id]).length;
  const autoTiny = rating.score <= -2;

  html += `
  <div class="section-head mt16" style="display:flex;justify-content:space-between;align-items:center">
    <div>⚡ 실행 의도 (If-Then Habits)</div>
    <div style="font-size:11px;font-weight:400;color:var(--text2)">${doneCount}/${habits.length} 완료</div>
  </div>
  
  <div class="tiny-toggle" style="margin-bottom:12px">
    <button class="tt-btn ${!isTinyMode && !autoTiny ? 'active' : ''}" id="btn-full-mode">💪 FULL 시스템</button>
    <button class="tt-btn ${isTinyMode || autoTiny ? 'active' : ''}" id="btn-tiny-mode">⚡ TINY 습관 (원자적)</button>
  </div>
  
  ${habits.map(h => {
    const done = !!comps[h.id];
    const streak = Store.getStreak(h.id);
    const showTiny = isTinyMode || autoTiny;
    return `
    <div class="habit-row ${done ? 'done' : ''}" data-hid="${h.id}">
      <div class="hr-check">${done ? '✓' : ''}</div>
      <div class="hr-body">
        <div class="hr-name">${h.icon} ${h.name}</div>
        <div class="hr-identity" style="color:var(--gold)">If: ${h.cue}</div>
        <div class="hr-tiny">Then: ${showTiny ? `⚡ ${h.tiny}` : `💪 ${h.target}`}</div>
      </div>
      <div class="hr-right">
        <div class="hr-streak">${streak > 0 ? `🔥${streak}` : '0'}</div>
      </div>
    </div>`;
  }).join('')}
  `;

  // 3-4. REFLECT (저녁)
  const saved = Store.getJournal(todayKey);
  const showReflect = hour >= 20 || saved.q1;
  
  if (showReflect) {
    html += `
    <div class="divider"></div>
    <div class="gate-status" style="margin-bottom:16px">
      <div class="gate-icon">🌙</div>
      <div class="gate-title">CBT 성찰 리프레이밍</div>
      <div class="gate-sub">하루의 감정과 인지 오류를 교정하다.</div>
    </div>
    <form id="reflect-form">
      ${[
        {id:'q1', icon:'🌊', label:'오늘 The One의 증거 1가지?', hint:'가장 작고 확실한 성공의 기록'},
        {id:'q2', icon:'🔥', label:'발견된 인지 오류나 재극인 감정?', hint:'조급함, 흑백논리, 충동적 판단을 객관화'},
        {id:'q3', icon:'⭐', label:'내일을 위한 개선점 (Plan)', hint:'구체적인 행동 레벨의 수정안'}
      ].map(q=>`
      <div class="reflect-q">
        <div class="rq-label">${q.icon} ${q.label}</div>
        <textarea class="rq-ta" id="rq_${q.id}" placeholder="${q.hint}">${saved[q.id]||''}</textarea>
      </div>`).join('')}
      <button type="submit" class="btn btn-water btn-full mt8">💾 인지 교정 및 저장</button>
    </form>
    `;
  } else {
    html += `
    <div class="card mt16" style="text-align:center;border:1px dashed rgba(255,255,255,0.1)">
      <div style="font-size:12px;color:var(--text3)">저녁 8시 이후 성찰 메뉴가 활성화됩니다.</div>
    </div>
    `;
  }

  return html;
}

// ─── 4. EVOLVE (진화) ───
function renderEvolve() {
  const evo = window._evo;
  const report = engine.getLatestReport();
  const daysLeft = engine.getDaysUntilNextEvolution();
  const profile = Store.getProfile();

  return `
  <div class="evo-score">
    <div class="es-num">${report?.score?.total || 0}</div>
    <div class="es-label">시스템 진화 점수 / 100</div>
  </div>
  
  <div class="section-head">💰 자산 인프라</div>
  <div class="the-one-bar">
    <div class="tob-label">자산 목표 달성도</div>
    <div class="tob-value">${formatAsset(profile.targetAsset - profile.asset)} 남음</div>
    <div class="tob-sub" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      현재 <b style="color:var(--water)">${formatAsset(profile.asset)}</b>
      <button class="btn" style="font-size:10px;padding:2px 8px" onclick="window.manualAsset()">✏️ 자산</button>
      · 목표 <b style="color:var(--gold)">${formatAsset(profile.targetAsset)}</b>
      <button class="btn" style="font-size:10px;padding:2px 8px" onclick="window.manualTargetAsset()">✏️ 목표</button>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${(profile.asset/profile.targetAsset*100).toFixed(5)}%"></div></div>
  </div>

  <div id="pf-container"><div class="card" style="color:var(--text2);text-align:center">📊 포트폴리오 로딩 중...</div></div>

  ${evo?.insights?.length ? `
  <div class="section-head mt16">⚡ AI 시스템 진단</div>
  ${evo.insights.slice(0,5).map(i=>`
  <div class="insight-row ir-${i.level}">
    <div class="ir-title" style="color:${i.level==='success'?'var(--success)':i.level==='warning'?'var(--gold)':'var(--fire)'}">${i.type.replace(/_/g,' ')}</div>
    <div class="ir-msg">${i.message}</div>
  </div>`).join('')}
  <div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center">자동 반영: ${evo.actions?.length||0}개 · 다음 분석: D-${daysLeft}</div>
  ` : `
  <div class="card mt16" style="text-align:center;padding:24px">
    <div style="font-size:32px;margin-bottom:8px">⏳</div>
    <div style="font-weight:700">데이터 수집 중</div>
    <div style="font-size:12px;color:var(--text2);margin-top:6px">3일 이상 기록하면 첫 AI 자가진단이 실행됩니다</div>
  </div>`}

  <div class="divider"></div>
  <div class="section-head">☯ 사주 대운 타임라인</div>
  <div class="dw-timeline">
    ${DAEWOON.map(d=>`
    <div class="dw-item ${d.active?'active':''}">
      <div class="dw-char" style="color:${d.color}">${d.han}</div>
      <div class="dw-period">${d.period}</div>
      <div class="dw-desc" style="color:${d.color}">${d.desc}</div>
    </div>`).join('')}
  </div>
  
  <div class="divider"></div>
  <button class="btn btn-gold btn-full mt8" onclick="window.forceEvolve()">🔄 자가진화 수동 실행</button>
  <div style="text-align:center;margin-top:20px;font-size:10px;color:var(--text3)">Life OS v2.0 - V4 Architecture</div>
  `;
}

// ─── BIND EVENTS ───
function bindEvents() {
  document.getElementById('gate-submit')?.addEventListener('click', submitGate);
  document.querySelectorAll('.energy-opt').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.energy-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });
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
  document.getElementById('reflect-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const data = { q1: document.getElementById('rq_q1').value, q2: document.getElementById('rq_q2').value, q3: document.getElementById('rq_q3').value };
    Store.setJournal(data);
    alert('✅ 인지 교정 및 성찰이 저장되었습니다.');
    render();
  });
}

function submitGate() {
  const energy = document.querySelector('.energy-opt.selected')?.dataset.e;
  const priority = document.getElementById('priority-input')?.value.trim();
  const intention = document.getElementById('intention-input')?.value.trim();
  if (!energy) { alert('에너지 레벨을 선택해주세요'); return; }
  if (!priority) { alert('오늘의 #1 행동을 입력해주세요'); return; }
  Store.setGate(todayKey, { done: true, energy, priority, intention, ts: Date.now() });
  render();
}

// ─── PORTFOLIO ───
async function loadPortfolioUI(force=false) {
  const el = document.getElementById('pf-container');
  if (!el) return;
  if (_pfData && !force) {
    el.innerHTML = renderPortfolioSection(_pfData.details, _pfData.total, _pfData.fxRates, false);
    return;
  }
  el.innerHTML = renderPortfolioSection([], 0, {}, true);
  try {
    _pfData = await calcPortfolioTotal();
    if (_pfData.total > 0) {
      const p = Store.getProfile(); p.asset = _pfData.total; Store.setProfile(p);
    }
    if (document.getElementById('pf-container')) {
      document.getElementById('pf-container').innerHTML = renderPortfolioSection(_pfData.details, _pfData.total, _pfData.fxRates, false);
    }
  } catch(e) {
    if (document.getElementById('pf-container'))
      document.getElementById('pf-container').innerHTML = '<div class="card" style="color:var(--text2)">포트폴리오 로드 실패</div>';
  }
}

// ─── GLOBALS ───
window.editIkigai = () => {
  const i = Store.getIkigai();
  const love = prompt('좋아하는 것', i.love) || i.love;
  const goodAt = prompt('잘하는 것', i.goodAt) || i.goodAt;
  const worldNeeds = prompt('세상이 필요로 하는 것', i.worldNeeds) || i.worldNeeds;
  const paidFor = prompt('돈이 되는 것', i.paidFor) || i.paidFor;
  const ikigai = prompt('이키가이 (The One)', i.ikigai) || i.ikigai;
  Store.setIkigai({ love, goodAt, worldNeeds, paidFor, ikigai });
  render();
};
window.editWoop = () => {
  const w = Store.getWoop();
  const wish = prompt('WISH (소망)', w.wish) || w.wish;
  const outcome = prompt('OUTCOME (최상의 결과)', w.outcome) || w.outcome;
  const obstacle = prompt('OBSTACLE (장애물)', w.obstacle) || w.obstacle;
  const plan = prompt('PLAN (If-Then 계획)', w.plan) || w.plan;
  Store.setWoop({ wish, outcome, obstacle, plan });
  render();
};
window.zoomInMandarat = (idx) => {
  mandaratZoomedId = idx;
  render();
};
window.zoomOutMandarat = () => {
  mandaratZoomedId = -1;
  render();
};
window.updateFlowGraph = (type, val) => {
  if (type==='C') flowChallenge = parseInt(val);
  if (type==='S') flowSkill = parseInt(val);
  render(); // Re-render to show dot moving
};
window.toggleFlow = () => {
  isFlowing = !isFlowing;
  if (isFlowing) {
    flowInterval = setInterval(() => {
      flowSeconds++;
      const el = document.getElementById('flow-display');
      if (el) {
        const m = Math.floor(flowSeconds/60).toString().padStart(2,'0');
        const s = (flowSeconds%60).toString().padStart(2,'0');
        el.textContent = `${m}:${s}`;
      }
    }, 1000);
  } else {
    clearInterval(flowInterval);
  }
  render();
};
window.manualAsset = () => {
  const asset = prompt('현재 자산 직접 입력 (원)', Store.getProfile().asset);
  if (asset) { const p = Store.getProfile(); p.asset = parseInt(asset); Store.setProfile(p); render(); }
};
window.manualTargetAsset = () => {
  const asset = prompt('목표 자산 직접 입력 (원)', Store.getProfile().targetAsset);
  if (asset) { const p = Store.getProfile(); p.targetAsset = parseInt(asset); Store.setProfile(p); render(); }
};
window.reqNotif = async () => {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    try {
      const { FB } = await import('./firebase-init.js');
      const token = await FB.registerFCM();
      if (token) console.log('[FCM] Push registered ✅');
    } catch(e) { console.warn('FCM register failed:', e); }
    scheduleNotifications();
  }
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
window.openPortfolioEditor = () => {
  const modal = document.createElement('div');
  modal.id = 'pf-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;overflow-y:auto;padding-bottom:40px';
  modal.innerHTML = renderPortfolioEditor();
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ 닫기';
  closeBtn.className = 'btn btn-ghost btn-full';
  closeBtn.style.margin = '0 16px 24px';
  closeBtn.onclick = () => modal.remove();
  modal.appendChild(closeBtn);
  document.body.appendChild(modal);
};
window.pfAddRow = () => {
  const h = Portfolio.getHoldings();
  h.push({ id: Date.now(), ticker:'', name:'', quantity:0, currency:'USD' });
  Portfolio.setHoldings(h);
  const m = document.getElementById('pf-modal');
  if (m) m.innerHTML = renderPortfolioEditor();
};
window.pfRemove = (i) => {
  const h = Portfolio.getHoldings(); h.splice(i,1); Portfolio.setHoldings(h);
  const m = document.getElementById('pf-modal');
  if (m) m.innerHTML = renderPortfolioEditor();
};
window.pfUpdateField = (i, field, val) => {
  const h = Portfolio.getHoldings();
  h[i][field] = field === 'quantity' ? parseFloat(val)||0 : val;
  Portfolio.setHoldings(h);
};
window.pfSave = async () => {
  const cash = parseFloat(document.getElementById('pf-cash')?.value)||0;
  Portfolio.setCash(cash);
  document.getElementById('pf-modal')?.remove();
  _pfData = null;
  await loadPortfolioUI(true);
};
window.saveFmpKey = () => {
  const k = document.getElementById('pf-fmp-key')?.value.trim();
  if (k) { localStorage.setItem('fmp_api_key', k); render(); }
};
window.refreshPortfolio = () => { _pfData = null; loadPortfolioUI(true); };

function renderNotifPrompt() {
  return `<div class="notif-prompt">
    <div class="np-icon">🔔</div>
    <div class="np-text"><b>알람 권한</b> 허용하면<br>아침·저녁 자동 알림을 받습니다</div>
    <button class="np-btn" onclick="window.reqNotif()">허용</button>
  </div>`;
}

// ─── NOTIFICATIONS ───
async function requestNotificationPermission() { /* user triggers manually */ }

function scheduleNotifications() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIF',
      notifications: [
        { hour: 6, min: 30, title: '☯ The One의 아침', body: '아침 암시를 시작하라. 현실은 거울이다.' },
        { hour: 22, min: 0, title: '🌙 저녁 성찰', body: 'CBT 리프레이밍. 오늘의 감정과 인지를 교정하라.' }
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
