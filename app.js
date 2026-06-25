/* ============================================================
   Mew Master Set — app logic (vanilla JS, no build step)
   Checkmarks persist in your browser via localStorage.
   ============================================================ */

const OWNED_KEY  = 'mew-master-owned-v1';
const FILTER_KEY = 'mew-master-filters-v1';

const CARDS = (window.MEW_CARDS || []).slice();

const TIER = {
  1: { label: 'Bulk',  cls: 't1' },
  2: { label: 'Mid',   cls: 't2' },
  3: { label: 'Grail', cls: 't3' },
};

let owned   = load(OWNED_KEY,  []);
let ownedSet = new Set(owned);
let filters = Object.assign({ q: '', tier: 'all', show: 'all', sort: 'asc' }, load(FILTER_KEY, {}));

/* ---------- helpers ---------- */
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

/* ---------- stats ---------- */
function renderStats() {
  const total      = CARDS.length;
  const ownedCount = CARDS.filter(c => ownedSet.has(c.id)).length;
  const totalVal   = CARDS.reduce((s, c) => s + c.price, 0);
  const ownedVal   = CARDS.filter(c => ownedSet.has(c.id)).reduce((s, c) => s + c.price, 0);
  const pct        = total ? Math.round((ownedCount / total) * 100) : 0;

  document.getElementById('count').innerHTML =
    `${ownedCount}<small> / ${total} cards</small>`;
  document.getElementById('value').innerHTML =
    `<span class="big">${money(ownedVal)}</span><small>of ${money(totalVal)} · ${money(totalVal - ownedVal)} to go</small>`;
  document.getElementById('bar-fill').style.width = pct + '%';
  document.getElementById('pct').textContent = pct + '% complete';
}

/* ---------- list ---------- */
const CHECK = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';

function passesFilter(c) {
  const f = filters;
  if (f.tier !== 'all' && String(c.tier) !== String(f.tier)) return false;
  if (f.show === 'owned'   && !ownedSet.has(c.id)) return false;
  if (f.show === 'unowned' &&  ownedSet.has(c.id)) return false;
  if (f.q) {
    const hay = `${c.name} ${c.variant} ${c.set} ${c.number} ${c.year} ${c.rarity}`.toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  return true;
}

function renderList() {
  const list = document.getElementById('list');
  const rows = CARDS.filter(passesFilter)
    .sort((a, b) => filters.sort === 'desc' ? b.price - a.price : a.price - b.price);

  if (!rows.length) {
    list.innerHTML = `<div class="empty">No Mew matches that filter. 🔍</div>`;
    return;
  }

  list.innerHTML = rows.map(c => {
    const on = ownedSet.has(c.id);
    const t  = TIER[c.tier] || TIER[2];
    const thumb = c.img
      ? `<span class="thumb" data-img="${c.img}" data-cap="${c.name} · ${c.set} ${c.number}"><img loading="lazy" src="${c.img}" alt="${c.name}" onerror="this.closest('.thumb').classList.add('noimg')"></span>`
      : `<span class="thumb noimg" title="No verified image yet"></span>`;
    return `
      <label class="row ${on ? 'owned' : ''}" data-id="${c.id}">
        <input type="checkbox" ${on ? 'checked' : ''}>
        <span class="box">${CHECK}</span>
        ${thumb}
        <span class="main">
          <span class="name">${c.name} <span class="variant">· ${c.variant}</span></span>
          <span class="meta">
            <span class="tag set">${c.set}</span>
            <span class="tag">${c.number}</span>
            <span class="tag">${c.year}</span>
            <span class="tag">${c.rarity}</span>
          </span>
        </span>
        <span class="right">
          <span class="price">${c.priceText}</span>
          <span class="tier ${t.cls}">${t.label}</span>
        </span>
      </label>`;
  }).join('');
}

/* ---------- events ---------- */
function toggle(id) {
  if (ownedSet.has(id)) ownedSet.delete(id);
  else ownedSet.add(id);
  save(OWNED_KEY, [...ownedSet]);
  renderStats();
  // if a show-filter is active, the row may need to disappear → re-render list
  if (filters.show !== 'all') renderList();
  else {
    const row = document.querySelector(`.row[data-id="${id}"]`);
    if (row) row.classList.toggle('owned', ownedSet.has(id));
  }
}

function wire() {
  document.getElementById('list').addEventListener('click', e => {
    const thumb = e.target.closest('.thumb');
    if (thumb && thumb.dataset.img) {       // tap the art → zoom, don't toggle
      e.preventDefault();
      openLightbox(thumb.dataset.img, thumb.dataset.cap || '');
      return;
    }
    const row = e.target.closest('.row');
    if (!row) return;
    e.preventDefault();            // we manage the checkbox state ourselves
    toggle(row.dataset.id);
  });

  const lb = document.getElementById('lightbox');
  lb.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  const search = document.getElementById('search');
  search.value = filters.q;
  search.addEventListener('input', () => {
    filters.q = search.value;
    save(FILTER_KEY, filters);
    renderList();
  });

  document.querySelectorAll('[data-tier]').forEach(btn => {
    btn.classList.toggle('active', String(filters.tier) === btn.dataset.tier);
    btn.addEventListener('click', () => {
      filters.tier = btn.dataset.tier;
      document.querySelectorAll('[data-tier]').forEach(b => b.classList.toggle('active', b === btn));
      save(FILTER_KEY, filters);
      renderList();
    });
  });

  document.querySelectorAll('[data-show]').forEach(btn => {
    btn.classList.toggle('active', filters.show === btn.dataset.show);
    btn.addEventListener('click', () => {
      filters.show = btn.dataset.show;
      document.querySelectorAll('[data-show]').forEach(b => b.classList.toggle('active', b === btn));
      save(FILTER_KEY, filters);
      renderList();
    });
  });

  const sort = document.getElementById('sort');
  sort.value = filters.sort;
  sort.addEventListener('change', () => {
    filters.sort = sort.value;
    save(FILTER_KEY, filters);
    renderList();
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Clear all your checkmarks? This cannot be undone.')) return;
    ownedSet = new Set();
    save(OWNED_KEY, []);
    renderStats(); renderList();
  });
}

/* ---------- lightbox ---------- */
function openLightbox(src, cap) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-cap').textContent = cap;
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add('show'));
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('show');
  setTimeout(() => { lb.hidden = true; document.getElementById('lightbox-img').src = ''; }, 180);
}

/* ---------- go ---------- */
renderStats();
renderList();
wire();
