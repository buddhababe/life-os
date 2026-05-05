/**
 * portfolio.js — 주식 포트폴리오 + 자산 자동 계산
 * FMP API (localStorage fmp_api_key 재사용)
 * KRW/USD 환율 자동 변환
 */

const CACHE_TTL = 60 * 60 * 1000;       // 가격 캐시 1시간
const FX_TTL   = 24 * 60 * 60 * 1000;   // 환율 캐시 24시간
const FMP_BASE = 'https://financialmodelingprep.com/stable';

// ─── Storage helpers ──────────────────────────────────────────
function getKey(k)    { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function setKey(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ─── Portfolio store ──────────────────────────────────────────
export const Portfolio = {
  getHoldings() {
    return getKey('portfolio_holdings') || [];
    // [{id, ticker, name, quantity, currency:'KRW'|'USD', type:'stock'|'crypto'|'cash'}]
  },
  setHoldings(h) { setKey('portfolio_holdings', h); },
  getCash()      { return getKey('portfolio_cash_krw') || 0; },
  setCash(v)     { setKey('portfolio_cash_krw', Number(v)); },
};

// ─── Price fetching ───────────────────────────────────────────
function apiKey() { return localStorage.getItem('fmp_api_key') || ''; }

async function fetchQuote(ticker) {
  const cacheKey = `pf_q_${ticker}`;
  const cached = getKey(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const key = apiKey();
  if (!key) return null;
  try {
    const url = `${FMP_BASE}/quote?symbol=${encodeURIComponent(ticker)}&apikey=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const q = Array.isArray(data) ? data[0] : data;
    if (!q || !q.price) return null;
    setKey(cacheKey, { ts: Date.now(), data: q });
    return q;
  } catch { return null; }
}

async function getUsdKrw() {
  const cacheKey = 'pf_fx_usdkrw';
  const cached = getKey(cacheKey);
  if (cached && Date.now() - cached.ts < FX_TTL) return cached.rate;

  // FMP Forex or fallback
  const key = apiKey();
  if (key) {
    try {
      const res = await fetch(`${FMP_BASE}/quote?symbol=USDKRW&apikey=${key}`);
      if (res.ok) {
        const d = await res.json();
        const q = Array.isArray(d) ? d[0] : d;
        if (q?.price) {
          setKey(cacheKey, { ts: Date.now(), rate: q.price });
          return q.price;
        }
      }
    } catch {}
  }
  // Exchangerate fallback (free, no key needed)
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (res.ok) {
      const d = await res.json();
      const rate = d?.rates?.KRW || 1380;
      setKey(cacheKey, { ts: Date.now(), rate });
      return rate;
    }
  } catch {}
  return 1380; // static fallback
}

// ─── Calculate total ──────────────────────────────────────────
export async function calcPortfolioTotal(onProgress) {
  const holdings = Portfolio.getHoldings();
  const cash     = Portfolio.getCash();
  const fxRate   = await getUsdKrw();

  let total = cash;
  const details = [];

  for (const h of holdings) {
    if (onProgress) onProgress(h.ticker);
    const q = await fetchQuote(h.ticker);
    if (!q) {
      details.push({ ...h, price: null, valueKrw: 0, error: true });
      continue;
    }
    const priceLocal = q.price;
    const valueLocal = priceLocal * h.quantity;
    const valueKrw   = h.currency === 'USD' ? valueLocal * fxRate : valueLocal;
    total += valueKrw;
    details.push({ ...h, price: priceLocal, priceChange: q.changesPercentage, valueKrw, fxRate });
  }

  return { total: Math.round(total), details, fxRate, updatedAt: Date.now() };
}

// ─── UI helpers ───────────────────────────────────────────────
export function formatKrw(n) {
  if (n >= 1e12)  return `${(n/1e12).toFixed(2)}조`;
  if (n >= 1e8)   return `${(n/1e8).toFixed(2)}억`;
  if (n >= 1e4)   return `${(n/1e4).toFixed(0)}만`;
  return n.toLocaleString();
}

export function renderPortfolioSection(details, total, fxRate, loading) {
  if (loading) return `<div class="pf-loading">⏳ 시세 조회 중...</div>`;

  const hasFmpKey = !!apiKey();
  if (!hasFmpKey) {
    return `
    <div class="card" style="margin-top:12px">
      <div class="card-title">📊 포트폴리오 연동</div>
      <p style="color:var(--text2);font-size:13px;margin:8px 0">FMP API 키를 입력하면 실시간 시세 연동됩니다.</p>
      <input class="input" id="pf-fmp-key" placeholder="FMP API Key" style="margin-bottom:8px">
      <button class="btn btn-water btn-full" onclick="saveFmpKey()">연결</button>
      <p style="color:var(--text2);font-size:11px;margin-top:6px">
        무료 키: <a href="https://financialmodelingprep.com/register" target="_blank" style="color:var(--water)">financialmodelingprep.com</a>
      </p>
    </div>`;
  }

  const rows = details.map(d => `
    <div class="pf-row">
      <div class="pf-ticker">${d.ticker}</div>
      <div class="pf-name">${d.name || ''}</div>
      <div class="pf-qty">${d.quantity.toLocaleString()}주</div>
      <div class="pf-val ${d.error ? 'pf-err' : ''}">
        ${d.error ? '조회실패' : formatKrw(d.valueKrw)}
        ${d.priceChange != null ? `<span class="${d.priceChange >= 0 ? 'pf-up' : 'pf-dn'}">${d.priceChange >= 0 ? '▲' : '▼'}${Math.abs(d.priceChange).toFixed(1)}%</span>` : ''}
      </div>
    </div>`).join('');

  const cash = Portfolio.getCash();

  return `
  <div class="card" style="margin-top:12px" id="portfolio-card">
    <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
      📊 포트폴리오
      <button class="btn" style="font-size:11px;padding:4px 10px" onclick="openPortfolioEditor()">✏️ 편집</button>
    </div>
    <div class="pf-header">
      <div class="pf-total">${formatKrw(total)}</div>
      <div class="pf-sub">USD/KRW ${Math.round(fxRate).toLocaleString()} · 현금 ${formatKrw(cash)}</div>
    </div>
    <div class="pf-list">${rows}</div>
    <button class="btn btn-ghost btn-full" style="margin-top:8px;font-size:12px" onclick="refreshPortfolio()">🔄 새로고침</button>
  </div>`;
}

export function renderPortfolioEditor() {
  const holdings = Portfolio.getHoldings();
  const cash = Portfolio.getCash();

  const rows = holdings.map((h, i) => `
    <div class="pf-edit-row" data-i="${i}">
      <input class="input" style="width:90px" value="${h.ticker}" placeholder="티커 (AAPL)" onchange="pfUpdateField(${i},'ticker',this.value)">
      <input class="input" style="width:120px" value="${h.name||''}" placeholder="종목명" onchange="pfUpdateField(${i},'name',this.value)">
      <input class="input" style="width:80px;text-align:right" type="number" value="${h.quantity}" placeholder="수량" onchange="pfUpdateField(${i},'quantity',this.value)">
      <select class="input" style="width:70px" onchange="pfUpdateField(${i},'currency',this.value)">
        <option value="USD" ${h.currency==='USD'?'selected':''}>USD</option>
        <option value="KRW" ${h.currency==='KRW'?'selected':''}>KRW</option>
      </select>
      <button class="btn" style="padding:4px 8px;color:#f87171" onclick="pfRemove(${i})">✕</button>
    </div>`).join('');

  return `
  <div style="padding:16px;max-width:600px;margin:0 auto">
    <h3 style="margin:0 0 16px;color:var(--water)">📊 포트폴리오 편집</h3>
    <div id="pf-editor-rows">${rows}</div>
    <button class="btn btn-water" style="margin:8px 0;width:100%" onclick="pfAddRow()">+ 종목 추가</button>
    <div style="margin:12px 0">
      <label style="color:var(--text2);font-size:13px">현금 (KRW)</label>
      <input class="input" id="pf-cash" type="number" value="${cash}" placeholder="현금 (원)">
    </div>
    <button class="btn btn-water btn-full" onclick="pfSave()">💾 저장 & 계산</button>
  </div>`;
}
