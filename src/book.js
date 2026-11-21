// OhmNote — read a project as a real book: a designed cover, endpapers, two-page spreads, pages that
// bend as they turn (click, keys, or grab and drag), and "Save as PDF" with the covers included.
// Pages are drawn from the same building blocks as the canvas (parts, wires, sketches, pictures, text).
'use strict';

const BK = { open: false, t: 0, svgs: [], turn: null, editing: false };
const BKT = {
  read: ['Read as book', 'Olvasás könyvként'], pdf: ['Save as PDF…', 'Mentés PDF-be…'], close: ['Close (Esc)', 'Bezárás (Esc)'],
  hint: ['← → · click or drag a page to turn it · Esc to close', '← → · kattints vagy húzd a lapot a lapozáshoz · Esc: bezárás'],
  saved: ['PDF saved', 'PDF mentve'], making: ['Making the PDF…', 'PDF készül…'], scan: ['Notebook photos → book…', 'Füzetfotókból könyv…'],
  cover: ['Cover…', 'Borító…'], coverTitle: ['Book cover', 'Könyvborító'], style: ['Style', 'Stílus'], color: ['Colour', 'Szín'],
  title: ['Title', 'Cím'], sub: ['Subtitle', 'Alcím'], author: ['Author', 'Szerző'], blurb: ['Back cover text', 'Hátsó borító szövege'],
  emblem: ['Emblem', 'Embléma'], ribbon: ['Bookmark ribbon', 'Könyvjelző szalag'], done: ['Done', 'Kész'],
  sLeather: ['Leather', 'Bőr'], sCloth: ['Cloth', 'Vászon'], sKraft: ['Kraft', 'Kraft'], sSchool: ['School book', 'Iskolai füzet'], sPcb: ['Circuit board', 'Nyák'], sMinimal: ['Minimal', 'Egyszerű'],
  eNone: ['None', 'Nincs'], eLogo: ['OhmNote', 'OhmNote'], eRes: ['Resistor', 'Ellenállás'], eChip: ['Chip', 'Chip'], eBolt: ['Lightning', 'Villám'], ePhoto: ['First picture', 'Első kép'],
  name: ['Name', 'Név'], subject: ['Subject', 'Tantárgy'], pages: ['pages', 'oldal'], madeWith: ['made with OhmNote', 'OhmNote-tal készült'],
};
const bookOpen = () => BK.open && !!document.getElementById('book');

// ---------------------------------------------------------------- page drawing (shared with the PDF)
// Height of a text box when it is not on screen.
function bkMeasure(t) {
  let m = document.getElementById('bk-measure');
  if (!m) { m = document.createElement('div'); m.id = 'bk-measure'; document.body.appendChild(m); }
  m.innerHTML = `<div class="tbox" style="position:static;width:${t.w}px"><div class="tbody"${t.z && t.z !== 1 ? ` style="font-size:calc(var(--text-size) * ${t.z})"` : ''}>${t.html}</div></div>`;
  return m.firstChild.offsetHeight;
}
function bkBounds(pg, heights) {
  let b = null;
  const add = (x1, y1, x2, y2) => { b = b ? { x1: Math.min(b.x1, x1), y1: Math.min(b.y1, y1), x2: Math.max(b.x2, x2), y2: Math.max(b.y2, y2) } : { x1, y1, x2, y2 }; };
  for (const k of ['comps', 'wires', 'strokes', 'shapes', 'images']) for (const it of pg[k]) { const ib = itemBox(k, it); add(ib.x1, ib.y1, ib.x2, ib.y2); }
  pg.texts.forEach((t, i) => add(t.x, t.y, t.x + t.w, t.y + heights[i]));
  return b;
}
function pageSVG(pg) {
  const sel = S.sel, wi = S.writeIn;
  S.sel = new Set(); S.writeIn = false;
  try {
    const heights = pg.texts.map(bkMeasure);
    const b = bkBounds(pg, heights) || { x1: 0, y1: 0, x2: 560, y2: 800 };
    const pad = 24;
    const vb = [b.x1 - pad, b.y1 - pad, b.x2 - b.x1 + pad * 2, b.y2 - b.y1 + pad * 2].map((v) => Math.round(v)).join(' ');
    const texts = pg.texts.map((t, i) => `<foreignObject x="${t.x}" y="${t.y}" width="${t.w}" height="${heights[i] + 4}"><div xmlns="http://www.w3.org/1999/xhtml" class="tbox" style="position:static;width:${t.w}px"><div class="tbody"${t.z && t.z !== 1 ? ` style="font-size:calc(var(--text-size) * ${t.z})"` : ''}>${t.html}</div></div></foreignObject>`).join('');
    return `<svg class="bk-svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <g>${pg.images.map((it) => imageSVG(it)).join('')}</g><g>${pg.shapes.map((s) => shapeSVG(s)).join('')}</g>
      <g>${pg.wires.map((w) => wireSVG(w)).join('')}</g><g>${pg.comps.map((c) => compSVG(c)).join('')}</g>
      <g>${junctions(pg).map((p) => `<circle class="junc" cx="${p[0]}" cy="${p[1]}" r="${P.juncSize}"/>`).join('')}</g>
      <g>${pg.strokes.map((s) => strokeSVG(s)).join('')}</g>${texts}</svg>`;
  } finally {
    S.sel = sel; S.writeIn = wi;
  }
}
// pencil / hand-drawn filters must cover every page, not just the one on the canvas
function bkFxRegion() {
  let b = null;
  for (const pg of S.project.pages) {
    const pb = bkBounds(pg, pg.texts.map(() => 200));
    if (pb) b = b ? { x1: Math.min(b.x1, pb.x1), y1: Math.min(b.y1, pb.y1), x2: Math.max(b.x2, pb.x2), y2: Math.max(b.y2, pb.y2) } : pb;
  }
  if (!b) return;
  for (const id of ['f-wobble', 'f-pencil']) {
    const f = document.getElementById(id);
    if (!f) continue;
    f.setAttribute('x', Math.floor(b.x1 - 300)); f.setAttribute('y', Math.floor(b.y1 - 300));
    f.setAttribute('width', Math.ceil(b.x2 - b.x1 + 600)); f.setAttribute('height', Math.ceil(b.y2 - b.y1 + 600));
  }
}
const bkSvg = (i) => (i >= 0 && i < S.project.pages.length ? (BK.svgs[i] ||= pageSVG(S.project.pages[i])) : '');
// a page that is mostly one scanned picture gets plain paper-white around it instead of the theme's paper
const bkIsScan = (pg) => { const im = pg.images.reduce((a, it) => (a && a.w * a.h > it.w * it.h ? a : it), null); const b = im && bkBounds(pg, pg.texts.map(() => 0)); return !!(im && b && im.w * im.h >= (b.x2 - b.x1) * (b.y2 - b.y1) * 0.8); };
const bkPaperClass = (i) => (bkIsScan(S.project.pages[i]) ? 'scanpage' : `pat-${P.pattern}`);

// ---------------------------------------------------------------- covers
const COVER_STYLES = [['leather', BKT.sLeather], ['cloth', BKT.sCloth], ['kraft', BKT.sKraft], ['school', BKT.sSchool], ['pcb', BKT.sPcb], ['minimal', BKT.sMinimal]];
const COVER_COLORS = ['#6b1e1e', '#7a3b12', '#1f3d2b', '#173a5e', '#2b2d6e', '#4a1f5c', '#2a2a2a', '#c8a46e', '#d9534f', '#e9b52f', '#3e8e7e', '#4a90d9'];
const EMBLEMS = {
  none: '',
  logo: '<svg viewBox="0 0 28 28"><rect x="1.5" y="1.5" width="25" height="25" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 14h4l2-5 3 10 3-10 3 10 2-5h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  res: '<svg viewBox="0 0 60 20"><path d="M0 10h14l3-7 6 14 6-14 6 14 6-14 3 7h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  chip: '<svg viewBox="0 0 40 40"><rect x="10" y="10" width="20" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 10V4M20 10V4M26 10V4M14 30v6M20 30v6M26 30v6M10 14H4M10 20H4M10 26H4M30 14h6M30 20h6M30 26h6" stroke="currentColor" stroke-width="1.8"/><circle cx="14" cy="14" r="1.6" fill="currentColor"/></svg>',
  bolt: '<svg viewBox="0 0 24 34"><path d="M14 1L2 19h9l-2 14 13-20h-9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
};
const coverOf = () => {
  const c = S.project.cover || {};
  return {
    style: c.style || 'leather', color: c.color || '#6b1e1e', title: c.title ?? S.project.name, sub: c.sub ?? '', author: c.author ?? '',
    blurb: c.blurb ?? '', emblem: c.emblem || 'logo', ribbon: c.ribbon !== false,
  };
};
const cvInk = (color) => (luminance(color) > 0.55 ? '#2a2117' : '#f6efe2');
function coverEmblem(cv) {
  if (cv.emblem === 'photo') {
    const im = S.project.pages.flatMap((p) => p.images)[0];
    const url = im && assetUrl(im.asset);
    return url ? `<div class="cv-photo"><img src="${url}" alt=""></div>` : '';
  }
  return EMBLEMS[cv.emblem] ? `<div class="cv-emblem">${EMBLEMS[cv.emblem]}</div>` : '';
}
// Front or back of the cover, as HTML.
function coverHTML(side, cv = coverOf()) {
  const vars = `--cv:${cv.color};--cv-ink:${cvInk(cv.color)}`;
  if (side === 'back') {
    const n = S.project.pages.length;
    return `<div class="cv cv-${cv.style} cv-back" style="${vars}"><div class="cv-frame">
      ${cv.blurb ? `<p class="cv-blurb">${esc(cv.blurb)}</p>` : ''}
      <div class="cv-meta">${esc(cv.title)} · ${n} ${L2(BKT.pages)}</div>
      <div class="cv-made">${EMBLEMS.logo}<span>${L2(BKT.madeWith)}</span></div></div></div>`;
  }
  if (cv.style === 'school') {
    return `<div class="cv cv-school" style="${vars}"><div class="cv-label">
      <div class="cv-label-title">${esc(cv.title)}</div>
      <div class="cv-line"><span>${L2(BKT.name)}:</span><b>${esc(cv.author)}</b></div>
      <div class="cv-line"><span>${L2(BKT.subject)}:</span><b>${esc(cv.sub)}</b></div></div>
      ${coverEmblem(cv)}</div>`;
  }
  return `<div class="cv cv-${cv.style}" style="${vars}"><div class="cv-frame">
    ${coverEmblem(cv)}<h1 class="cv-title">${esc(cv.title)}</h1>
    ${cv.sub ? `<div class="cv-sub">${esc(cv.sub)}</div>` : ''}${cv.author ? `<div class="cv-author">${esc(cv.author)}</div>` : ''}</div></div>`;
}
const endpaperHTML = (cv = coverOf()) => `<div class="cv-end" style="--cv:${cv.color}"></div>`;

// ---------------------------------------------------------------- leaves
// A book is a stack of leaves, each with a front and a back: the cover, the paper leaves (two pages
// each) and the back cover. After t turns, the left side shows leaf t-1's back, the right leaf t's front.
function bkLeaves() {
  const n = S.project.pages.length;
  const leaves = [{ front: { cover: 'front' }, back: { end: 1 } }];
  for (let i = 0; i < n; i += 2) leaves.push({ front: { page: i }, back: i + 1 < n ? { page: i + 1 } : { blank: 1 } });
  leaves.push({ front: { end: 1 }, back: { cover: 'back' } });
  return leaves;
}
function faceHTML(f) {
  if (!f) return '';
  if (f.cover) return coverHTML(f.cover);
  if (f.end) return endpaperHTML();
  if (f.blank) return '<div class="bk-paper blank"></div>';
  return `<div class="bk-paper ${bkPaperClass(f.page)}">${bkSvg(f.page)}</div><span class="bk-pn">${f.page + 1}</span>`;
}

// ---------------------------------------------------------------- viewer
async function openBook(startIndex) {
  if (!S.project) return;
  endEdit();
  await flushSave();
  await loadAllAssets();
  BK.svgs = [];
  BK.open = true;
  BK.turn = null;
  BK.leaves = bkLeaves();
  // start closed on the cover, or open at the page asked for
  BK.t = startIndex == null ? 0 : Math.min(BK.leaves.length - 1, 1 + Math.floor(startIndex / 2));
  bkFxRegion();
  let el = document.getElementById('book');
  if (!el) { el = document.createElement('div'); el.id = 'book'; document.body.appendChild(el); }
  el.innerHTML = `<div class="bk-top"><b>${esc(S.project.name)}</b><span class="bk-num"></span><span class="spacer"></span>
      <button class="btn" data-bk="cover">${L2(BKT.cover)}</button><button class="btn" data-bk="pdf">${L2(BKT.pdf)}</button>
      <button class="xbtn" data-bk="close" title="${esc(L2(BKT.close))}">✕</button></div>
    <div class="bk-stage"><button class="bk-nav" data-bk="prev">‹</button>
      <div class="bk-book intro"><div class="bk-boards"></div>
        <div class="bk-side bk-left"></div><div class="bk-side bk-right"></div>
        <div class="bk-shadow"></div><div class="bk-ribbon"></div></div>
      <button class="bk-nav" data-bk="next">›</button></div>
    <div class="bk-hint">${L2(BKT.hint)}</div><div class="bk-editor"></div>`;
  el.onclick = (e) => {
    const b = e.target.closest('[data-bk]');
    if (!b || BK.turn) return;
    if (b.dataset.bk === 'close') closeBook();
    if (b.dataset.bk === 'next') bkTurn(1);
    if (b.dataset.bk === 'prev') bkTurn(-1);
    if (b.dataset.bk === 'pdf') bookPdf();
    if (b.dataset.bk === 'cover') bkEditor(!BK.editing);
  };
  el.addEventListener('pointerdown', bkGrab);
  bkSize();
  bkRender();
  setTimeout(() => el.querySelector('.bk-book')?.classList.remove('intro'), 700);
}
function bkSize() {
  const el = document.getElementById('book');
  if (!el) return;
  const room = BK.editing ? 360 : 0;
  const ph = Math.max(200, Math.min(window.innerHeight - 150, ((window.innerWidth - 190 - room) / 2) * 1.414));
  el.style.setProperty('--ph', `${Math.round(ph)}px`);
  el.style.setProperty('--pw', `${Math.round(ph / 1.414)}px`);
}
window.addEventListener('resize', () => { if (bookOpen()) bkSize(); });

function bkRender() {
  const el = document.getElementById('book');
  if (!el) return;
  const L = BK.leaves.length, t = BK.t;
  const book = el.querySelector('.bk-book');
  const left = el.querySelector('.bk-left'), right = el.querySelector('.bk-right');
  left.innerHTML = t > 0 ? faceHTML(BK.leaves[t - 1].back) : '';
  right.innerHTML = t < L ? faceHTML(BK.leaves[t].front) : '';
  book.classList.toggle('closed-front', t === 0);
  book.classList.toggle('closed-back', t === L);
  // the page block: thicker on the side that holds more leaves
  const thick = (k) => Math.min(7, Math.ceil(k / 2));
  book.style.setProperty('--stack-l', thick(Math.max(0, t - 1)));
  book.style.setProperty('--stack-r', thick(Math.max(0, L - t - 1)));
  left.classList.toggle('stacked', t > 1);
  right.classList.toggle('stacked', t < L - 1);
  const cv = coverOf();
  book.style.setProperty('--cv', cv.color);
  el.querySelector('.bk-ribbon').style.display = cv.ribbon && t > 0 && t < L ? '' : 'none';
  const shown = [];
  if (t > 0 && BK.leaves[t - 1].back.page != null) shown.push(BK.leaves[t - 1].back.page + 1);
  if (t < L && BK.leaves[t].front.page != null) shown.push(BK.leaves[t].front.page + 1);
  el.querySelector('.bk-num').textContent = shown.length ? `${shown.join('–')} / ${S.project.pages.length}` : '';
  right.classList.toggle('can-peel', t < L);
}

// ---- turning: a leaf made of thin strips, each bent a little more than the last, so the paper curls
const BK_STRIPS = 10;
function bkLeafEl(front, back) {
  const pw = parseFloat(getComputedStyle(document.getElementById('book')).getPropertyValue('--pw'));
  const sw = pw / BK_STRIPS;
  let html = '';
  for (let i = BK_STRIPS - 1; i >= 0; i--) {
    html = `<div class="bk-strip" style="width:${sw}px;${i ? `left:${sw}px` : 'left:0'}">
      <div class="bk-face bk-front"><div class="bk-slice" style="left:${-i * sw}px">${front}</div><i class="bk-light"></i></div>
      <div class="bk-face bk-back"><div class="bk-slice" style="left:${-(BK_STRIPS - 1 - i) * sw}px">${back}</div><i class="bk-light"></i></div>
      ${html}</div>`;
  }
  const leaf = document.createElement('div');
  leaf.className = 'bk-leaf';
  leaf.innerHTML = html;
  return leaf;
}
// Pose the leaf for progress p (0 = lying on the right, 1 = lying on the left).
function bkPose(turn, p) {
  const e = Math.max(0, Math.min(1, p));
  const base = -180 * e;
  const lift = Math.sin(Math.PI * e);
  const bend = (turn.dir > 0 ? 1 : -1) * 9 * lift * (turn.stiff ? 0.35 : 1);
  const strips = turn.leaf.querySelectorAll('.bk-strip');
  strips.forEach((s, i) => {
    const a = i === 0 ? base + bend * 0.4 : bend;
    s.style.transform = `rotateY(${a}deg)`;
  });
  // light: a smooth gradient across the whole leaf (each strip shows its own slice of it), darker
  // towards the free edge on the front and towards the spine on the back while the page is lifted
  const shade = (x, back) => (back ? 0.22 * lift * (1 - x) : 0.04 * lift + 0.26 * lift * x * x);
  const grad = (i, back) => `linear-gradient(90deg, rgba(0,0,0,${shade(i / BK_STRIPS, back).toFixed(3)}), rgba(0,0,0,${shade((i + 1) / BK_STRIPS, back).toFixed(3)}))`;
  turn.leaf.querySelectorAll('.bk-front .bk-light').forEach((l, i) => { l.style.background = grad(i, false); });
  turn.leaf.querySelectorAll('.bk-back .bk-light').forEach((l, i) => { l.style.background = grad(BK_STRIPS - 1 - i, true); });
  const sh = document.querySelector('#book .bk-shadow');
  if (sh) { sh.style.opacity = (0.55 * lift).toFixed(3); sh.style.setProperty('--sx', `${(1 - e) * 100}%`); }
  turn.p = p;
}
function bkStartTurn(dir) {
  const L = BK.leaves.length;
  const t = BK.t;
  if (BK.turn || (dir > 0 && t >= L) || (dir < 0 && t <= 0)) return null;
  const leafIdx = dir > 0 ? t : t - 1;
  const leaf = BK.leaves[leafIdx];
  const el = document.getElementById('book');
  const book = el.querySelector('.bk-book');
  // underneath: the faces that will show once this leaf has moved
  if (dir > 0) el.querySelector('.bk-right').innerHTML = t + 1 < L ? faceHTML(BK.leaves[t + 1].front) : '';
  else el.querySelector('.bk-left').innerHTML = t - 2 >= 0 ? faceHTML(BK.leaves[t - 2].back) : '';
  const node = bkLeafEl(faceHTML(leaf.front), faceHTML(leaf.back));
  book.appendChild(node);
  const turn = { dir, leaf: node, leafIdx, p: dir > 0 ? 0 : 1, stiff: !!(leaf.front.cover || leaf.back.cover) };
  BK.turn = turn;
  bkPose(turn, turn.p);
  // the closed book sits centred; opening / closing slides it
  const next = t + dir;
  book.classList.toggle('closed-front', next === 0);
  book.classList.toggle('closed-back', next === L);
  el.querySelector('.bk-right').classList.remove('can-peel');
  return turn;
}
function bkAnimate(turn, to, ms, done) {
  const from = turn.p, t0 = performance.now();
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    bkPose(turn, from + (to - from) * ease(k));
    if (k < 1) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
}
function bkFinish(turn, completed) {
  turn.leaf.remove();
  const sh = document.querySelector('#book .bk-shadow');
  if (sh) sh.style.opacity = 0;
  if (completed) BK.t += turn.dir;
  BK.turn = null;
  bkRender();
}
function bkTurn(dir) {
  if (P.reduceMotion) {
    const L = BK.leaves.length;
    if (BK.turn || BK.t + dir < 0 || BK.t + dir > L) return;
    BK.t += dir;
    bkRender();
    return;
  }
  const turn = bkStartTurn(dir);
  if (!turn) return;
  bkAnimate(turn, dir > 0 ? 1 : 0, turn.stiff ? 1000 : 850, () => bkFinish(turn, true));
}
// grab a page and drag it over (or let go early to drop it back)
function bkGrab(e) {
  if (e.button !== 0 || BK.turn || P.reduceMotion) return;
  const side = e.target.closest('.bk-side');
  if (!side) return;
  const dir = side.classList.contains('bk-right') ? 1 : -1;
  const pw = parseFloat(getComputedStyle(document.getElementById('book')).getPropertyValue('--pw'));
  const x0 = e.clientX, t0 = performance.now();
  let turn = null;
  const move = (ev) => {
    const dx = ev.clientX - x0;
    if (!turn) {
      if (Math.abs(dx) < 6) return;
      turn = bkStartTurn(dir);
      if (!turn) { cleanup(); return; }
    }
    const p = dir > 0 ? -dx / (pw * 1.7) : 1 - dx / (pw * 1.7);
    bkPose(turn, Math.max(0, Math.min(1, p)));
  };
  const up = (ev) => {
    cleanup();
    if (!turn) { bkTurn(dir); return; } // a click turns the page
    const fast = Math.abs(ev.clientX - x0) / Math.max(1, performance.now() - t0) > 0.6;
    const progress = dir > 0 ? turn.p : 1 - turn.p;
    const complete = progress > 0.35 || fast;
    const target = complete ? (dir > 0 ? 1 : 0) : (dir > 0 ? 0 : 1);
    bkAnimate(turn, target, 420, () => bkFinish(turn, complete));
  };
  const cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function closeBook() {
  const el = document.getElementById('book');
  BK.open = false;
  BK.editing = false;
  if (!el) return;
  if (P.reduceMotion) { el.remove(); fxRegion(); return; }
  el.classList.add('outro');
  setTimeout(() => { el.remove(); fxRegion(); }, 280);
}
function bookKey(e) {
  const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  if (typing) { if (e.key === 'Escape') e.target.blur(); return; }
  if (e.key === 'Escape') { if (BK.editing) bkEditor(false); else closeBook(); }
  else if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); bkTurn(1); }
  else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); bkTurn(-1); }
  else if (e.key === 'Home' && !BK.turn) { BK.t = 0; bkRender(); }
  else if (e.key === 'End' && !BK.turn) { BK.t = BK.leaves.length; bkRender(); }
}

// ---------------------------------------------------------------- cover editor
function bkEditor(on) {
  BK.editing = on;
  const el = document.getElementById('book');
  el.classList.toggle('editing', on);
  bkSize();
  if (!on) return;
  if (BK.t !== 0 && !BK.turn) { BK.t = 0; bkRender(); } // show the cover while designing it
  const cv = coverOf();
  const box = el.querySelector('.bk-editor');
  box.innerHTML = `<h3>${L2(BKT.coverTitle)}</h3>
    <p class="insp-h">${L2(BKT.style)}</p>
    <div class="cv-styles">${COVER_STYLES.map(([k, l]) => `<button data-cvstyle="${k}" class="${cv.style === k ? 'on' : ''}"><div class="cv-mini">${coverHTML('front', { ...cv, style: k })}</div><span>${L2(l)}</span></button>`).join('')}</div>
    <p class="insp-h">${L2(BKT.color)}</p>
    <div class="swatches">${COVER_COLORS.map((c) => `<button data-cvcolor="${c}" class="${cv.color === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}
      <input type="color" data-cvf="color" value="${cv.color}" title="${esc(L2(BKT.color))}"></div>
    <label class="field"><span>${L2(BKT.title)}</span><input type="text" data-cvf="title" value="${esc(cv.title)}"></label>
    <label class="field"><span>${L2(cv.style === 'school' ? BKT.subject : BKT.sub)}</span><input type="text" data-cvf="sub" value="${esc(cv.sub)}"></label>
    <label class="field"><span>${L2(cv.style === 'school' ? BKT.name : BKT.author)}</span><input type="text" data-cvf="author" value="${esc(cv.author)}"></label>
    <label class="field"><span>${L2(BKT.emblem)}</span><select class="sel" data-cvf="emblem">${[['none', BKT.eNone], ['logo', BKT.eLogo], ['res', BKT.eRes], ['chip', BKT.eChip], ['bolt', BKT.eBolt], ['photo', BKT.ePhoto]].map(([k, l]) =>
      `<option value="${k}" ${cv.emblem === k ? 'selected' : ''}>${L2(l)}</option>`).join('')}</select></label>
    <label class="field"><span>${L2(BKT.blurb)}</span><textarea data-cvf="blurb">${esc(cv.blurb)}</textarea></label>
    <label class="check"><input type="checkbox" data-cvf="ribbon" ${cv.ribbon ? 'checked' : ''}> ${L2(BKT.ribbon)}</label>
    <button class="btn primary" data-bk="cover">${L2(BKT.done)}</button>`;
  box.oninput = box.onchange = (e) => {
    const k = e.target.dataset.cvf;
    if (!k) return;
    bkSetCover({ [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }, e.type === 'change' && (k === 'emblem' || k === 'color'));
  };
  box.onclick = (e) => {
    const s = e.target.closest('[data-cvstyle]');
    if (s) bkSetCover({ style: s.dataset.cvstyle }, true);
    const c = e.target.closest('[data-cvcolor]');
    if (c) bkSetCover({ color: c.dataset.cvcolor }, true);
  };
}
function bkSetCover(patch, redrawEditor) {
  S.project.cover = { ...coverOf(), ...(S.project.cover || {}), ...patch };
  scheduleSave();
  if (!BK.turn) bkRender();
  if (redrawEditor) bkEditor(true);
}

// ---------------------------------------------------------------- PDF
// Cover, every page and the back cover, each on its own A4 sheet, printed by Chromium.
async function bookPdf() {
  if (!S.project) return;
  if (!bookOpen()) BK.svgs = [];
  endEdit();
  await flushSave();
  await loadAllAssets();
  bkFxRegion();
  toast(L2(BKT.making));
  const pb = document.createElement('div');
  pb.id = 'print-book';
  pb.innerHTML = `<section class="pb-page">${coverHTML('front')}</section>`
    + S.project.pages.map((_, i) => `<section class="pb-page"><div class="bk-paper ${bkPaperClass(i)}">${bkSvg(i)}</div></section>`).join('')
    + `<section class="pb-page">${coverHTML('back')}</section>`;
  document.body.appendChild(pb);
  document.body.classList.add('printing');
  await frames(3);
  try {
    if (await api.exportPdf(S.project.name)) toast(L2(BKT.saved));
  } catch (err) {
    toast(String(err.message || err), true);
  } finally {
    document.body.classList.remove('printing');
    pb.remove();
    if (!bookOpen()) { BK.svgs = []; fxRegion(); }
  }
}
