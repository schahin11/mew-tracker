/* ============================================================
   THE VAULT — app logic (vanilla JS, no build step)
   Multi-collection · owned state in localStorage · holo + lightbox
   ============================================================ */

const COLS = window.TCG_COLLECTIONS || [];
const OWNED_KEY = 'tcg-owned-v1';

let owned = loadOwned();
migrateOld();
let filters = { q: '', tier: 'all', show: 'all', sort: 'asc', rarity: 'all' };
let currentView = 'home';

/* ---------- storage ---------- */
function loadOwned() { try { return new Set(JSON.parse(localStorage.getItem(OWNED_KEY) || '[]')); } catch { return new Set(); } }
function saveOwned() { localStorage.setItem(OWNED_KEY, JSON.stringify([...owned])); }
const k = (col, card) => `${col}/${card}`;
function migrateOld() { // bring over the old single-Mew tracker checkmarks
  try {
    const old = JSON.parse(localStorage.getItem('mew-master-owned-v1') || 'null');
    if (Array.isArray(old)) { old.forEach(id => owned.add(k('mew', id))); saveOwned(); localStorage.removeItem('mew-master-owned-v1'); }
  } catch {}
}

/* ---------- helpers ---------- */
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TIER = { 1: 'Bulk', 2: 'Mid', 3: 'Grail' };

/* ---------- buy links (pre-searched per card) ---------- */
function buyQuery(c) {
  const num = String(c.number || '').split('/')[0];
  return [c.name, c.set, (num && num !== '—') ? num : ''].filter(Boolean).join(' ');
}
const tcgUrl  = c => 'https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&view=grid&Condition=Near+Mint&q=' + encodeURIComponent(buyQuery(c));
const ebayUrl = c => 'https://www.ebay.com/sch/i.html?_sacat=183454&LH_Complete=1&LH_Sold=1&_nkw=' + encodeURIComponent(buyQuery(c));

/* ---------- price movement (▲/▼ 30-day) ---------- */
const deltaOf = c => { const d = (window.TCG_DELTAS || {})[c.id]; return typeof d === 'number' ? d : null; };
function deltaBadge(c, inline) {
  const d = deltaOf(c);
  if (d === null || Math.abs(d) < 8 || c.price < 2) return '';
  const up = d > 0, mag = Math.min(Math.abs(d), 99).toFixed(0);
  return `<span class="delta ${up ? 'up' : 'down'}${inline ? ' inline' : ''}" title="≈${d > 0 ? '+' : ''}${d}% vs 30-day average">${up ? '▲' : '▼'}${mag}%</span>`;
}

/* ---------- backup ---------- */
function exportOwned() {
  const blob = new Blob([JSON.stringify([...owned])], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'tcg-vault-backup.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importOwned(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const arr = JSON.parse(r.result);
      if (!Array.isArray(arr)) throw 0;
      arr.forEach(x => owned.add(x)); saveOwned(); render();
      alert(`Imported ${arr.length} cards into your vault.`);
    } catch { alert('That file is not a valid vault backup.'); }
  };
  r.readAsText(file);
}

function stats(col) {
  let o = 0, ov = 0, tv = 0;
  col.cards.forEach(c => { tv += c.price; if (owned.has(k(col.id, c.id))) { o++; ov += c.price; } });
  return { total: col.cards.length, owned: o, ownedVal: ov, totalVal: tv, pct: col.cards.length ? Math.round(o / col.cards.length * 100) : 0 };
}
function ring(pct, accent) {
  const p = pct / 100;
  return `<svg class="ring" viewBox="0 0 50 50" style="--p:${p}">
    <circle class="bg" cx="25" cy="25" r="22"/><circle class="fg" cx="25" cy="25" r="22" style="stroke:${accent}"/>
    <text x="25" y="29" text-anchor="middle">${pct}%</text></svg>`;
}

/* ---------- routing ---------- */
function render() {
  const h = location.hash;
  if (h === '#/owned') {
    renderOwned();
  } else {
    const m = h.match(/#\/c\/(.+)/);
    const col = m && COLS.find(c => c.id === decodeURIComponent(m[1]));
    if (col) renderCollection(col); else renderHome();
  }
  bindHolo();
  window.scrollTo(0, 0);
}
addEventListener('hashchange', render);

/* ---------- home ---------- */
function renderHome() {
  currentView = 'home';
  let gT = 0, gO = 0, gOV = 0, gTV = 0;
  COLS.forEach(c => { const s = stats(c); gT += s.total; gO += s.owned; gOV += s.ownedVal; gTV += s.totalVal; });

  const tiles = COLS.map(col => {
    const s = stats(col);
    return `<a class="tile" data-holo href="#/c/${encodeURIComponent(col.id)}" style="--accent:${col.accent};--accent2:${col.accent2 || col.accent}">
      <div class="holo-sheen"></div>
      <div class="tile-top">
        <span class="tile-name">${esc(col.name)}</span>
        ${ring(s.pct, col.accent)}
      </div>
      <div class="tile-tag">${esc(col.tagline || '')}</div>
      <div class="tile-foot"><b>${s.owned}<span style="color:var(--muted);font-weight:400"> / ${s.total}</span></b><span class="val">${money(s.ownedVal)} / ${money(s.totalVal)}</span></div>
    </a>`;
  }).join('');

  document.getElementById('app').innerHTML = `<div class="wrap">
    <header class="hero">
      <p class="kicker">Personal Collection</p>
      <h1>The Vault</h1>
      <p class="sub">Pokémon TCG — every set worth chasing, tracked in one place.</p>
      <div class="agg">
        <div class="pill"><b>${gO}<span style="color:var(--muted);font-weight:400"> / ${gT}</span></b><span>cards owned</span></div>
        <div class="pill"><b class="gold">${money(gOV)}</b><span>value owned</span></div>
        <div class="pill"><b>${money(gTV)}</b><span>collection value</span></div>
      </div>
      <div class="actions">
        <button class="action primary" id="scanBtn">📷 Scan a card</button>
        <a class="action" href="#/owned">🗂 My Collection · ${gO}</a>
      </div>
    </header>
    <div class="sec-head"><h2>Collections</h2><span class="hint">${COLS.length} active</span></div>
    <div class="tiles">
      ${tiles}
      <div class="tile add"><div><div class="plus">+</div><div style="margin-top:6px;font-size:13px">add a collection in <code>collections.js</code></div></div></div>
    </div>
    <footer>
      Progress saves in this browser. &nbsp;·&nbsp;
      <span class="lk" id="export">⭳ Export backup</span> &nbsp;·&nbsp;
      <span class="lk" id="import">⭱ Import</span> &nbsp;·&nbsp;
      <span class="reset" id="reset">Reset all</span>
      <input type="file" id="importfile" accept="application/json" hidden>
    </footer>
  </div>`;

  const reset = document.getElementById('reset');
  if (reset) reset.onclick = () => { if (confirm('Clear ALL checkmarks across every collection?')) { owned = new Set(); saveOwned(); render(); } };
  const exp = document.getElementById('export'), imp = document.getElementById('import'), impf = document.getElementById('importfile');
  if (exp) exp.onclick = exportOwned;
  if (imp && impf) { imp.onclick = () => impf.click(); impf.onchange = () => { if (impf.files[0]) importOwned(impf.files[0]); }; }
  const sb = document.getElementById('scanBtn'); if (sb) sb.onclick = openScanner;
}

/* ---------- collection ---------- */
let activeCol = null;
function renderCollection(col) {
  activeCol = col;
  currentView = 'collection';
  filters.rarity = 'all';
  const rarities = [...new Set(col.cards.map(c => c.rarity).filter(Boolean))].sort();
  const rarityOpts = ['all', ...rarities].map(r => `<option value="${esc(r)}">${r === 'all' ? 'All rarities' : esc(r)}</option>`).join('');
  document.getElementById('app').innerHTML = `<div class="wrap" style="--accent:${col.accent};--accent2:${col.accent2 || col.accent}">
    <div class="cv-head">
      <a class="back" href="#/" title="Back">←</a>
      <div><h1 class="cv-title">${esc(col.name)}<span class="dot">.</span></h1><p class="cv-sub">${esc(col.tagline || '')}</p></div>
    </div>
    <section class="stats">
      <div class="stat-row"><div class="count" id="count"></div><div class="value" id="value"></div></div>
      <div class="bar"><span id="barfill"></span></div>
      <div class="pct" id="pct"></div>
    </section>
    <div class="controls">
      <input id="search" class="search" type="search" placeholder="Search set, card, year…" autocomplete="off">
      <div class="chips">${['all','1','2','3'].map(t => `<button class="chip" data-tier="${t}">${t==='all'?'All':TIER[t]}</button>`).join('')}</div>
      <div class="chips">${[['all','All'],['owned','Have'],['unowned','Need']].map(([v,l]) => `<button class="chip" data-show="${v}">${l}</button>`).join('')}</div>
      <select id="rarity" class="sort">${rarityOpts}</select>
      <select id="sort" class="sort">
        <option value="asc">$ low → high</option>
        <option value="desc">$ high → low</option>
        <option value="num">Set number</option>
        <option value="movers">Biggest movers</option>
      </select>
    </div>
    <div id="grid" class="grid"></div>
    <footer>Tap a card to mark it owned · tap <b>⤢</b> to zoom · <span class="delta up inline">▲</span>/<span class="delta down inline">▼</span> = 30-day price move. &nbsp;·&nbsp; <span class="reset" id="reset">Reset ${esc(col.name)}</span></footer>
  </div>`;

  wireControls(col);
  renderStats(col); renderGrid(col);
}

function renderStats(col) {
  const s = stats(col);
  document.getElementById('count').innerHTML = `${s.owned}<small> / ${s.total} cards</small>`;
  document.getElementById('value').innerHTML = `<span class="big">${money(s.ownedVal)}</span><small>of ${money(s.totalVal)} · ${money(s.totalVal - s.ownedVal)} to go</small>`;
  document.getElementById('barfill').style.width = s.pct + '%';
  document.getElementById('pct').textContent = s.pct + '% complete';
}

function passes(col, c) {
  const f = filters, on = owned.has(k(col.id, c.id));
  if (f.tier !== 'all' && String(c.tier) !== f.tier) return false;
  if (f.rarity && f.rarity !== 'all' && c.rarity !== f.rarity) return false;
  if (f.show === 'owned' && !on) return false;
  if (f.show === 'unowned' && on) return false;
  if (f.q && !`${c.name} ${c.variant} ${c.set} ${c.number} ${c.year} ${c.rarity}`.toLowerCase().includes(f.q.toLowerCase())) return false;
  return true;
}

function cardTile(col, c) {
  const on = owned.has(k(col.id, c.id));
  const art = c.img
    ? `<img loading="lazy" src="${c.img}" alt="${esc(c.name)}" onerror="this.outerHTML='<div class=&quot;noimg&quot;></div>'">`
    : `<div class="noimg"></div>`;
  return `<div class="card ${on ? 'owned' : ''}" data-id="${c.id}" data-col="${col.id}">
    <div class="art" data-holo><div class="holo-sheen"></div>${art}
      <span class="check">✓</span>
      <button class="zoom" data-zoom title="Zoom">⤢</button>
      <a class="buy" data-ext href="${tcgUrl(c)}" target="_blank" rel="noopener" title="Find on TCGplayer">$</a>
      ${deltaBadge(c)}
    </div>
    <div class="card-meta">
      <span class="cn">${esc(c.name)}</span>
      <span class="cs">${esc(c.set)} · ${esc(c.number)}</span>
      <span><span class="tier-dot t${c.tier}"></span><span class="cp">${esc(c.priceText)}</span></span>
    </div>
  </div>`;
}

/* ---------- My Collection (everything owned, across sets) ---------- */
function renderOwned() {
  currentView = 'owned';
  document.getElementById('app').innerHTML = `<div class="wrap" style="--accent:#ecc46a;--accent2:#ff8fb8">
    <div class="cv-head">
      <a class="back" href="#/" title="Back">←</a>
      <div><h1 class="cv-title">My Collection<span class="dot">.</span></h1><p class="cv-sub">Every card you own, across all sets</p></div>
    </div>
    <section class="stats">
      <div class="stat-row"><div class="count" id="owncount"></div><div class="value" id="ownvalue"></div></div>
    </section>
    <div class="controls">
      <input id="search" class="search" type="search" placeholder="Search your cards…" autocomplete="off">
      <select id="sort" class="sort"><option value="desc">$ high → low</option><option value="asc">$ low → high</option></select>
    </div>
    <div id="grid" class="grid"></div>
    <footer>Tap a card to remove it · tap <b>⤢</b> to zoom.</footer>
  </div>`;
  const search = document.getElementById('search'); search.value = filters.q;
  search.oninput = () => { filters.q = search.value; paintOwned(); };
  const sort = document.getElementById('sort'); sort.value = filters.sort === 'asc' ? 'asc' : 'desc';
  sort.onchange = () => { filters.sort = sort.value; paintOwned(); };
  paintOwned();
}
function paintOwned() {
  const items = [];
  COLS.forEach(col => col.cards.forEach(c => { if (owned.has(k(col.id, c.id))) items.push({ col, c }); }));
  const totalVal = items.reduce((s, x) => s + x.c.price, 0);
  document.getElementById('owncount').innerHTML = `${items.length}<small> cards owned</small>`;
  document.getElementById('ownvalue').innerHTML = `<span class="big">${money(totalVal)}</span><small>total value</small>`;
  let rows = items;
  if (filters.q) rows = rows.filter(({ c }) => `${c.name} ${c.set} ${c.number} ${c.year} ${c.rarity}`.toLowerCase().includes(filters.q.toLowerCase()));
  rows.sort((a, b) => filters.sort === 'asc' ? a.c.price - b.c.price : b.c.price - a.c.price);
  const grid = document.getElementById('grid');
  grid.innerHTML = rows.length
    ? rows.map(({ col, c }) => cardTile(col, c)).join('')
    : `<div class="empty">No cards yet — scan a card or tap cards inside a collection to add them.</div>`;
  bindHolo();
}

function renderGrid(col) {
  const numOf = c => { const n = String(c.number).split('/')[0]; return /^\d+$/.test(n) ? +n : 99999; };
  const s = filters.sort;
  const rows = col.cards.filter(c => passes(col, c)).sort((a, b) => {
    if (s === 'num') return numOf(a) - numOf(b);
    if (s === 'movers') return Math.abs(deltaOf(b) || 0) - Math.abs(deltaOf(a) || 0);
    return s === 'desc' ? b.price - a.price : a.price - b.price;
  });
  const grid = document.getElementById('grid');
  if (!rows.length) { grid.innerHTML = `<div class="empty">No cards match that filter.</div>`; return; }
  grid.innerHTML = rows.map(c => cardTile(col, c)).join('');
  bindHolo();
}

function wireControls(col) {
  const search = document.getElementById('search'); search.value = filters.q;
  search.oninput = () => { filters.q = search.value; renderGrid(col); };
  document.querySelectorAll('[data-tier]').forEach(b => { b.classList.toggle('active', b.dataset.tier === filters.tier);
    b.onclick = () => { filters.tier = b.dataset.tier; document.querySelectorAll('[data-tier]').forEach(x => x.classList.toggle('active', x === b)); renderGrid(col); }; });
  document.querySelectorAll('[data-show]').forEach(b => { b.classList.toggle('active', b.dataset.show === filters.show);
    b.onclick = () => { filters.show = b.dataset.show; document.querySelectorAll('[data-show]').forEach(x => x.classList.toggle('active', x === b)); renderGrid(col); }; });
  const sort = document.getElementById('sort'); sort.value = filters.sort;
  sort.onchange = () => { filters.sort = sort.value; renderGrid(col); };
  const rar = document.getElementById('rarity'); if (rar) { rar.value = filters.rarity; rar.onchange = () => { filters.rarity = rar.value; renderGrid(col); }; }
  const reset = document.getElementById('reset');
  reset.onclick = () => { if (confirm(`Clear your ${col.name} checkmarks?`)) { col.cards.forEach(c => owned.delete(k(col.id, c.id))); saveOwned(); renderStats(col); renderGrid(col); } };
}

/* ---------- toggle / zoom (delegated) ---------- */
document.getElementById('app').addEventListener('click', e => {
  if (e.target.closest('.tile')) return;               // let tile links navigate
  if (e.target.closest('[data-ext]')) return;          // let buy links open in new tab
  const zoom = e.target.closest('[data-zoom]');
  const card = e.target.closest('.card');
  if (!card) return;
  const col = COLS.find(x => x.id === card.dataset.col);
  const c = col && col.cards.find(x => x.id === card.dataset.id);
  if (!col || !c) return;
  if (zoom) { openLightbox(col, c); return; }
  const key = k(col.id, c.id);
  owned.has(key) ? owned.delete(key) : owned.add(key);
  saveOwned();
  card.classList.toggle('owned', owned.has(key));
  if (currentView === 'owned') { renderOwned(); }
  else { renderStats(col); if (filters.show !== 'all') renderGrid(col); }
});

/* ---------- holographic tilt ---------- */
function bindHolo() {
  document.querySelectorAll('[data-holo]:not([data-bound])').forEach(el => {
    el.dataset.bound = '1';
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add('tilting');
      el.style.setProperty('--mx', (px * 100) + '%');
      el.style.setProperty('--my', (py * 100) + '%');
      el.style.setProperty('--rx', ((px - .5) * 16) + 'deg');
      el.style.setProperty('--ry', (-(py - .5) * 16) + 'deg');
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('tilting');
      el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
    });
  });
}

/* ---------- lightbox ---------- */
function openLightbox(col, c) {
  const lb = document.getElementById('lightbox');
  const on = owned.has(k(col.id, c.id));
  const art = c.img ? `<img src="${c.img}" alt="${esc(c.name)}">` : `<div class="noimg" style="height:100%"></div>`;
  lb.style.setProperty('--accent', col.accent); lb.style.setProperty('--accent2', col.accent2 || col.accent);
  lb.innerHTML = `<div class="lb-inner">
    <div class="lb-card" data-holo><div class="holo-sheen"></div>${art}</div>
    <div class="lb-info">
      <h3>${esc(c.name)}</h3><div class="v">${esc(c.variant)}</div>
      <div class="price">${esc(c.priceText)} ${deltaBadge(c, true)}</div>
      <dl>
        <dt>Set</dt><dd>${esc(c.set)}</dd>
        <dt>Number</dt><dd>${esc(c.number)}</dd>
        <dt>Year</dt><dd>${esc(c.year)}</dd>
        <dt>Rarity</dt><dd>${esc(c.rarity)}</dd>
        <dt>Tier</dt><dd>${TIER[c.tier]}</dd>
        <dt>Price conf.</dt><dd>${esc(c.confidence)}</dd>
      </dl>
      <button class="lb-toggle ${on ? 'on' : ''}" data-lb-toggle>${on ? '✓ In collection' : '+ Mark as owned'}</button>
      <div class="lb-buy">
        <span class="lb-buy-label">Find to buy</span>
        <a class="lb-buy-btn tcg" href="${tcgUrl(c)}" target="_blank" rel="noopener">TCGplayer listings ↗</a>
        <a class="lb-buy-btn ebay" href="${ebayUrl(c)}" target="_blank" rel="noopener">eBay sold comps ↗</a>
      </div>
    </div>
  </div>`;
  lb.hidden = false; requestAnimationFrame(() => lb.classList.add('show'));
  bindHolo();

  lb.querySelector('[data-lb-toggle]').onclick = ev => {
    ev.stopPropagation();
    const key = k(col.id, c.id);
    owned.has(key) ? owned.delete(key) : owned.add(key);
    saveOwned();
    const now = owned.has(key);
    ev.target.classList.toggle('on', now);
    ev.target.textContent = now ? '✓ In collection' : '+ Mark as owned';
    const card = document.querySelector(`.card[data-id="${CSS.escape(c.id)}"]`);
    if (card) card.classList.toggle('owned', now);
    if (activeCol) { renderStats(activeCol); if (filters.show !== 'all') renderGrid(activeCol); }
  };
}
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target.closest('.lb-info') || e.target.closest('.lb-card')) return;
  closeLightbox();
});
addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('show');
  setTimeout(() => { lb.hidden = true; lb.innerHTML = ''; }, 200);
}

/* ---------- scanner (camera + on-device OCR) ---------- */
let scanStream = null, _tess = null;

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (_tess) return _tess;
  _tess = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = () => res(window.Tesseract); s.onerror = rej;
    document.head.appendChild(s);
  });
  return _tess;
}

async function openScanner() {
  const el = document.getElementById('scanner');
  el.hidden = false; requestAnimationFrame(() => el.classList.add('show'));
  el.innerHTML = `<div class="scan-inner">
    <div class="scan-top"><span>Scan a card</span><button class="scan-x" id="scanclose">✕</button></div>
    <div class="scan-stage"><video id="scanvid" autoplay playsinline muted></video><div class="scan-frame"></div></div>
    <div class="scan-status" id="scanstatus">Fill the frame with one card, then capture.</div>
    <button class="scan-btn primary" id="scancap">Capture &amp; identify</button>
    <div class="scan-manual">…or type a card name / number <input id="scanmanual" placeholder="e.g. Mega Gengar 284  ·  Mew ex 232"></div>
    <div id="scanresult"></div>
  </div>`;
  document.getElementById('scanclose').onclick = closeScanner;
  document.getElementById('scancap').onclick = captureAndIdentify;
  const mi = document.getElementById('scanmanual');
  mi.onkeydown = e => { if (e.key === 'Enter' && mi.value.trim()) identifyFromText(mi.value); };
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    document.getElementById('scanvid').srcObject = scanStream;
  } catch {
    document.getElementById('scanstatus').textContent = 'Camera not available — type a name or number below instead.';
  }
}
function closeScanner() {
  const el = document.getElementById('scanner');
  el.classList.remove('show');
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 200);
}
async function captureAndIdentify() {
  const vid = document.getElementById('scanvid'), status = document.getElementById('scanstatus');
  if (!vid || !vid.videoWidth) { status.textContent = 'Camera not ready yet — give it a second.'; return; }
  status.textContent = 'Reading the card…';
  const canvas = document.createElement('canvas');
  canvas.width = vid.videoWidth; canvas.height = vid.videoHeight;
  canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height);
  try {
    const T = await loadTesseract();
    const { data } = await T.recognize(canvas, 'eng');
    identifyFromText(data.text);
  } catch {
    status.textContent = 'Could not read it. Try brighter light and fill the frame, or type it below.';
  }
}
function matchCard(text) {
  const T = (text || '').toUpperCase();
  const nums = new Set();
  (T.match(/\b[A-Z]{0,4}\s?\d{1,3}\s*\/\s*\d{1,3}\b/g) || []).forEach(m => nums.add(m.replace(/\s/g, '')));
  (T.match(/\b(?:SVP?|XY|SM|BW|GG|TG|HGSS|DP|RC)\d{1,3}\b/g) || []).forEach(m => nums.add(m));
  (T.match(/\b\d{1,3}\b/g) || []).forEach(m => nums.add(m));
  let best = null;
  COLS.forEach(col => col.cards.forEach(c => {
    const full = String(c.number).replace(/\s/g, '').toUpperCase();
    const lead = full.split('/')[0];
    let score = 0;
    if (nums.has(full)) score += 120;
    else if (nums.has(lead)) score += (lead.length >= 2 ? 70 : 32);
    c.name.toUpperCase().split(/[^A-Z]+/).filter(w => w.length >= 3).forEach(w => { if (T.includes(w)) score += 12; });
    String(c.set).toUpperCase().split(/[^A-Z0-9]+/).filter(w => w.length >= 3).forEach(w => { if (T.includes(w)) score += 4; });
    if (score > 0 && (!best || score > best.score)) best = { col, card: c, score };
  }));
  return (best && best.score >= 30) ? best : null;
}
function identifyFromText(text) {
  const status = document.getElementById('scanstatus');
  const m = matchCard(text);
  if (!m) { status.textContent = 'No match in your loaded collections. Try again, or add that set first.'; return; }
  status.textContent = 'Match found:';
  showScanResult(m.col, m.card);
}
let scanToken = 0;
async function livePrice(card) {
  const id = (window.TCG_TDX || {})[card.id];
  if (!id) return null;
  try {
    const r = await fetch(`https://api.tcgdex.net/v2/en/cards/${id}`);
    if (!r.ok) return null;
    const d = await r.json();
    const tp = (d.pricing && d.pricing.tcgplayer) || {};
    for (const key of ['holofoil', 'normal', 'reverse-holofoil', 'reverseHolofoil']) {
      const v = tp[key]; if (v && v.marketPrice) return +v.marketPrice;
    }
    for (const v of Object.values(tp)) { if (v && v.marketPrice) return +v.marketPrice; }
    const cm = (d.pricing && d.pricing.cardmarket) || {};
    if (cm.trend) return +(cm.trend * 1.08).toFixed(2);
  } catch {}
  return null;
}
function showScanResult(col, c) {
  const on = owned.has(k(col.id, c.id));
  const art = c.img ? `<img src="${c.img}" alt="">` : `<div class="noimg" style="height:100%"></div>`;
  const hasLive = !!(window.TCG_TDX || {})[c.id];
  document.getElementById('scanresult').innerHTML = `<div class="scan-card" style="--accent:${col.accent}">
    <div class="scan-thumb">${art}</div>
    <div class="scan-info">
      <strong>${esc(c.name)}</strong>
      <span class="sm">${esc(c.set)} · ${esc(c.number)}</span>
      <span class="scan-price" id="scanprice">${esc(c.priceText)} ${deltaBadge(c, true)}<small> ${hasLive ? '· refreshing…' : 'tracked'}</small></span>
      <button class="scan-add ${on ? 'on' : ''}" id="scanadd">${on ? `✓ Already in ${esc(col.name)}` : `+ Add to ${esc(col.name)}`}</button>
    </div></div>`;
  document.getElementById('scanadd').onclick = () => {
    owned.add(k(col.id, c.id)); saveOwned();
    const b = document.getElementById('scanadd'); b.classList.add('on'); b.textContent = `✓ Added to ${col.name}`;
  };
  const token = ++scanToken;
  if (hasLive) livePrice(c).then(p => {
    if (token !== scanToken) return;                 // a newer scan superseded this
    const el = document.getElementById('scanprice');
    if (!el) return;
    if (p == null) { el.innerHTML = `${esc(c.priceText)} <small>tracked</small>`; return; }
    const fmt = '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    el.innerHTML = `${fmt} <small class="live" title="Tracked: ${esc(c.priceText)}">● live</small>`;
  });
}

/* ---------- go ---------- */
render();
