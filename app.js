/* ============================================================
   THE VAULT — app logic (vanilla JS, no build step)
   Multi-collection · owned state in localStorage · holo + lightbox
   ============================================================ */

const COLS = window.TCG_COLLECTIONS || [];
const OWNED_KEY = 'tcg-owned-v1';

let owned = loadOwned();
migrateOld();
let filters = { q: '', tier: 'all', show: 'all', sort: 'asc' };

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
  const m = location.hash.match(/#\/c\/(.+)/);
  const col = m && COLS.find(c => c.id === decodeURIComponent(m[1]));
  if (col) renderCollection(col); else renderHome();
  bindHolo();
  window.scrollTo(0, 0);
}
addEventListener('hashchange', render);

/* ---------- home ---------- */
function renderHome() {
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
    </header>
    <div class="sec-head"><h2>Collections</h2><span class="hint">${COLS.length} active</span></div>
    <div class="tiles">
      ${tiles}
      <div class="tile add"><div><div class="plus">+</div><div style="margin-top:6px;font-size:13px">add a collection in <code>collections.js</code></div></div></div>
    </div>
    <footer>Progress saves automatically in this browser. &nbsp;·&nbsp; <span class="reset" id="reset">Reset everything</span></footer>
  </div>`;

  const reset = document.getElementById('reset');
  if (reset) reset.onclick = () => { if (confirm('Clear ALL checkmarks across every collection?')) { owned = new Set(); saveOwned(); render(); } };
}

/* ---------- collection ---------- */
let activeCol = null;
function renderCollection(col) {
  activeCol = col;
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
      <select id="sort" class="sort"><option value="asc">$ low → high</option><option value="desc">$ high → low</option></select>
    </div>
    <div id="grid" class="grid"></div>
    <footer>Tap a card to mark it owned · tap <b>⤢</b> to zoom. &nbsp;·&nbsp; <span class="reset" id="reset">Reset ${esc(col.name)}</span></footer>
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
  if (f.show === 'owned' && !on) return false;
  if (f.show === 'unowned' && on) return false;
  if (f.q && !`${c.name} ${c.variant} ${c.set} ${c.number} ${c.year} ${c.rarity}`.toLowerCase().includes(f.q.toLowerCase())) return false;
  return true;
}

function renderGrid(col) {
  const rows = col.cards.filter(c => passes(col, c)).sort((a, b) => filters.sort === 'desc' ? b.price - a.price : a.price - b.price);
  const grid = document.getElementById('grid');
  if (!rows.length) { grid.innerHTML = `<div class="empty">No cards match that filter.</div>`; return; }
  grid.innerHTML = rows.map(c => {
    const on = owned.has(k(col.id, c.id));
    const art = c.img
      ? `<img loading="lazy" src="${c.img}" alt="${esc(c.name)}" onerror="this.outerHTML='<div class=&quot;noimg&quot;></div>'">`
      : `<div class="noimg"></div>`;
    return `<div class="card ${on ? 'owned' : ''}" data-id="${c.id}">
      <div class="art" data-holo><div class="holo-sheen"></div>${art}
        <span class="check">✓</span>
        <button class="zoom" data-zoom title="Zoom">⤢</button>
      </div>
      <div class="card-meta">
        <span class="cn">${esc(c.name)}</span>
        <span class="cs">${esc(c.set)} · ${esc(c.number)}</span>
        <span><span class="tier-dot t${c.tier}"></span><span class="cp">${esc(c.priceText)}</span></span>
      </div>
    </div>`;
  }).join('');
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
  const reset = document.getElementById('reset');
  reset.onclick = () => { if (confirm(`Clear your ${col.name} checkmarks?`)) { col.cards.forEach(c => owned.delete(k(col.id, c.id))); saveOwned(); renderStats(col); renderGrid(col); } };
}

/* ---------- toggle / zoom (delegated) ---------- */
document.getElementById('app').addEventListener('click', e => {
  if (e.target.closest('.tile')) return;               // let tile links navigate
  const zoom = e.target.closest('[data-zoom]');
  const card = e.target.closest('.card');
  if (!card || !activeCol) return;
  const c = activeCol.cards.find(x => x.id === card.dataset.id);
  if (!c) return;
  if (zoom) { openLightbox(activeCol, c); return; }
  const key = k(activeCol.id, c.id);
  owned.has(key) ? owned.delete(key) : owned.add(key);
  saveOwned();
  card.classList.toggle('owned', owned.has(key));
  renderStats(activeCol);
  if (filters.show !== 'all') renderGrid(activeCol);
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
      <div class="price">${esc(c.priceText)}</div>
      <dl>
        <dt>Set</dt><dd>${esc(c.set)}</dd>
        <dt>Number</dt><dd>${esc(c.number)}</dd>
        <dt>Year</dt><dd>${esc(c.year)}</dd>
        <dt>Rarity</dt><dd>${esc(c.rarity)}</dd>
        <dt>Tier</dt><dd>${TIER[c.tier]}</dd>
        <dt>Price conf.</dt><dd>${esc(c.confidence)}</dd>
      </dl>
      <button class="lb-toggle ${on ? 'on' : ''}" data-lb-toggle>${on ? '✓ In collection' : '+ Mark as owned'}</button>
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

/* ---------- go ---------- */
render();
