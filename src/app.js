// OhmNote — renderer. One page = an infinite canvas holding components, wires,
// freehand strokes, shapes and rich-text boxes, plus a page-notes document.
'use strict';

const api = window.ohm;
const GRID = 10;
const KINDS = ['comps', 'wires', 'strokes', 'shapes', 'texts', 'images'];
const WIDTHS = [1.5, 2.5, 4, 7];
const NIBS = [
  ['round', ['Ballpoint', 'Golyóstoll'], '<path d="M3.5 15c3-7 6 1 13-9"/>'],
  ['fountain', ['Fountain pen', 'Töltőtoll'], '<path d="M10 2.5l4 6.5-4 8.5-4-8.5z M10 9v4"/>'],
  ['marker', ['Marker', 'Filc'], '<rect x="7" y="2.5" width="6" height="10" rx="1.2"/><path d="M8 12.5l-.8 4.5h5.6l-.8-4.5"/>'],
  ['pencil', ['Pencil', 'Ceruza'], '<path d="M4.5 15.5l1-3.8 8-8 2.8 2.8-8 8z M12.3 4.9l2.8 2.8 M4.5 15.5l2-.6"/>'],
  ['highlighter', ['Highlighter', 'Szövegkiemelő'], '<path d="M5 17.5h10 M7 13.5l5.5-9 3 1.8-5.5 9z M7 13.5l-.5 2.5 3-.7"/>'],
];
const SHAPE_KINDS = [
  ['rect', 'shape.rect', '<rect x="3" y="4.5" width="14" height="11" rx="1.5"/>'],
  ['ellipse', 'shape.ellipse', '<ellipse cx="10" cy="10" rx="7" ry="5.5"/>'],
  ['line', 'shape.line', '<path d="M4 16L16 4"/>'],
  ['arrow', 'shape.arrow', '<path d="M4 16L16 4M9 4h7v7"/>'],
];
const CHARS = ['Ω', 'kΩ', 'MΩ', 'µ', '±', '°', 'Δ', '≈', '≤', '≥', '≠', '→', '←', '↔', '√', 'π', '∞', 'τ', 'φ', 'λ', '∠', '²', '³', '½', '×', '÷', '·', '‰'];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const snap = (v) => Math.round(v / GRID) * GRID;
const clone = (o) => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
const key = (p) => `${p[0]},${p[1]}`;
const frames = (n = 2) => new Promise((res) => { const f = () => (--n <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const colorVal = (c) => (c === 'ink' || !c ? 'var(--ink)' : c);

// ---------------------------------------------------------------- state
const S = {
  settings: {},
  projects: [],
  project: null,
  pageId: null,
  tool: 'select',
  placing: null, placeRot: 0, placeFlip: false,
  sel: new Set(),
  view: { x: 0, y: 0, z: 1 },
  pen: { color: 'ink', width: 2.5, nib: 'round' },
  writeIn: false, wi: null,
  shapeKind: 'rect',
  hist: {},
  editing: null, editBefore: null,
  drag: null,
  draft: null,
  cursor: { x: 0, y: 0 }, cursorScreen: null,
  clipboard: null, pasteN: 0,
  dirty: false,
  space: false,
  inspSig: '',
  saveKey: 'saved',
};

const vp = $('#viewport');
const world = $('#world');
const G = {};
['images', 'shapes', 'wires', 'comps', 'junc', 'strokes', 'sel', 'preview'].forEach((k) => { G[k] = $(`#g-${k}`); });

// ---------------------------------------------------------------- model helpers
function newPage(name) {
  return { id: uid(), name, notes: '', view: { x: 120, y: 120, z: 1 }, comps: [], wires: [], strokes: [], shapes: [], texts: [], images: [] };
}
function newProject(name) {
  const now = Date.now();
  return { id: uid(), name, created: now, updated: now, pages: [newPage(tr('name.page', { n: 1 }))] };
}
function normalizeProject(p) {
  p.pages = (p.pages || []).filter(Boolean);
  if (!p.pages.length) p.pages.push(newPage(tr('name.page', { n: 1 })));
  for (const pg of p.pages) {
    pg.id ||= uid();
    pg.name ||= tr('name.untitledPage');
    for (const k of KINDS) pg[k] = Array.isArray(pg[k]) ? pg[k] : [];
    pg.comps = pg.comps.filter((c) => SYMBOLS[c.type]);
    pg.view ||= { x: 120, y: 120, z: 1 };
    pg.notes = sanitize(pg.notes || '');
    for (const t of pg.texts) t.html = sanitize(t.html || '');
  }
  return p;
}
const page = () => S.project.pages.find((p) => p.id === S.pageId) || S.project.pages[0];

function find(id) {
  const pg = page();
  for (const k of KINDS) {
    const i = pg[k].findIndex((o) => o.id === id);
    if (i >= 0) return { k, item: pg[k][i], i };
  }
  return null;
}

function nextRef(prefix) {
  if (!prefix) return '';
  const re = new RegExp(`^${prefix.replace(/[^A-Za-z]/g, '')}(\\d+)$`);
  let max = 0;
  for (const pg of S.project.pages) for (const c of pg.comps) {
    const m = re.exec(c.ref || '');
    if (m) max = Math.max(max, +m[1]);
  }
  return `${prefix}${max + 1}`;
}

// Strip anything executable from stored/pasted rich text.
function sanitize(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html || '');
  const bad = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'FORM', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'SVG', 'MATH', 'TEMPLATE']);
  const walk = (node) => {
    for (const el of [...node.children]) {
      if (bad.has(el.tagName.toUpperCase())) { el.remove(); continue; }
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase();
        const v = a.value.trim().toLowerCase();
        if (n.startsWith('on') || n === 'srcdoc' || n === 'contenteditable') el.removeAttribute(a.name);
        else if ((n === 'href' || n === 'src' || n === 'xlink:href') && !(v.startsWith('http') || v.startsWith('data:image/') || v.startsWith('#'))) el.removeAttribute(a.name);
      }
      walk(el);
    }
  };
  walk(t.content);
  return t.innerHTML;
}

// ---------------------------------------------------------------- geometry
// Part-local point → page point (mirror, size, rotation). Rounded so pins and wire ends compare exactly.
function xf(c, px, py) {
  const s = c.s || 1;
  let x = (c.flip ? -px : px) * s, y = py * s;
  for (let i = 0; i < (c.rot || 0); i++) [x, y] = [-y, x];
  return [r1(c.x + x), r1(c.y + y)];
}
function pinsOf(c) {
  const d = SYMBOLS[c.type];
  return d ? d.pins.map((p) => { const [x, y] = xf(c, p[0], p[1]); return { x, y, name: p[2] }; }) : [];
}
function compBox(c) {
  const [a, b, cc, dd] = SYMBOLS[c.type].box;
  const pts = [xf(c, a, b), xf(c, cc, b), xf(c, a, dd), xf(c, cc, dd)];
  return {
    x1: Math.min(...pts.map((p) => p[0])), y1: Math.min(...pts.map((p) => p[1])),
    x2: Math.max(...pts.map((p) => p[0])), y2: Math.max(...pts.map((p) => p[1])),
  };
}
function ptsBox(pts) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}
function itemBox(k, it) {
  if (k === 'comps') return compBox(it);
  if (k === 'wires' || k === 'strokes') return ptsBox(it.pts);
  if (k === 'shapes') return { x1: Math.min(it.x1, it.x2), y1: Math.min(it.y1, it.y2), x2: Math.max(it.x1, it.x2), y2: Math.max(it.y1, it.y2) };
  if (k === 'images') return { x1: it.x, y1: it.y, x2: it.x + it.w, y2: it.y + it.h };
  if (k === 'texts') {
    const el = tboxEl(it.id);
    return { x1: it.x, y1: it.y, x2: it.x + it.w, y2: it.y + (el ? el.offsetHeight : 30) };
  }
  return null;
}
function contentBounds(pg) {
  let b = null;
  for (const k of KINDS) for (const it of pg[k]) {
    const ib = itemBox(k, it);
    if (!ib) continue;
    b = b ? { x1: Math.min(b.x1, ib.x1), y1: Math.min(b.y1, ib.y1), x2: Math.max(b.x2, ib.x2), y2: Math.max(b.y2, ib.y2) } : { ...ib };
  }
  return b;
}
const between = (v, a, b) => v >= Math.min(a, b) && v <= Math.max(a, b);
function onSeg(p, a, b) {
  if (a[0] === b[0]) return p[0] === a[0] && between(p[1], a[1], b[1]);
  if (a[1] === b[1]) return p[1] === a[1] && between(p[0], a[0], b[0]);
  return false;
}
function wireTouches(w, p) {
  for (let i = 0; i < w.pts.length - 1; i++) if (onSeg(p, w.pts[i], w.pts[i + 1])) return true;
  return false;
}
function simplify(pts) {
  const out = [];
  for (const p of pts) {
    const l = out[out.length - 1];
    if (l && l[0] === p[0] && l[1] === p[1]) continue;
    out.push([p[0], p[1]]);
  }
  for (let i = 1; i < out.length - 1;) {
    const [a, b, c] = [out[i - 1], out[i], out[i + 1]];
    if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) out.splice(i, 1); else i++;
  }
  return out;
}
// Orthogonal route between two grid points: one elbow, or a Z when `z` is set.
function route(a, b, hFirst, z = false) {
  if (a[0] === b[0] || a[1] === b[1]) return [];
  if (z) {
    if (hFirst) { const mx = snap((a[0] + b[0]) / 2); return [[mx, a[1]], [mx, b[1]]]; }
    const my = snap((a[1] + b[1]) / 2); return [[a[0], my], [b[0], my]];
  }
  return hFirst ? [[b[0], a[1]]] : [[a[0], b[1]]];
}

function junctions(pg) {
  const pinCount = new Map();
  for (const c of pg.comps) for (const p of pinsOf(c)) { const k = key([p.x, p.y]); pinCount.set(k, (pinCount.get(k) || 0) + 1); }
  const ends = new Map();
  for (const w of pg.wires) {
    if (w.pts.length < 2) continue;
    for (const p of [w.pts[0], w.pts[w.pts.length - 1]]) { const k = key(p); ends.set(k, (ends.get(k) || 0) + 1); }
  }
  const out = [];
  for (const [k, n] of ends) {
    const p = k.split(',').map(Number);
    let total = n + (pinCount.get(k) || 0);
    for (const w of pg.wires) {
      const first = w.pts[0], last = w.pts[w.pts.length - 1];
      if ((first[0] === p[0] && first[1] === p[1]) || (last[0] === p[0] && last[1] === p[1])) continue;
      if (wireTouches(w, p)) total += 2;
    }
    if (total >= 3) out.push(p);
  }
  return out;
}

function connectionAt(p, pg = page()) {
  for (const c of pg.comps) for (const q of pinsOf(c)) if (q.x === p[0] && q.y === p[1]) return 'pin';
  for (const w of pg.wires) if (wireTouches(w, p)) return 'wire';
  return null;
}

// ---------------------------------------------------------------- view
function applyView() {
  const { x, y, z } = S.view;
  world.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
  paintBackground(S.view);
  fxRegion();
  $('#btn-zoom-label').textContent = `${Math.round(z * 100)}%`;
  if (S.project) page().view = { x, y, z };
}
function zoomAt(cx, cy, factor) {
  const z = clamp(S.view.z * factor, 0.1, Math.max(P.maxZoom, S.view.z));
  const k = z / S.view.z;
  S.view.x = cx - (cx - S.view.x) * k;
  S.view.y = cy - (cy - S.view.y) * k;
  S.view.z = z;
  applyView();
  renderPreview();
  if (S.project && S.sel.size) renderSelection(); // keep the resize handles the same size on screen
}
function zoomCenter(factor) { const r = vp.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, factor); }
function toWorld(e) {
  const r = vp.getBoundingClientRect();
  return { x: (e.clientX - r.left - S.view.x) / S.view.z, y: (e.clientY - r.top - S.view.y) / S.view.z };
}
function fitView(maxZ = 1.6, pad = 60) {
  const b = contentBounds(page());
  const r = vp.getBoundingClientRect();
  if (!b) { S.view = { x: r.width / 2, y: r.height / 2, z: 1 }; applyView(); return; }
  const w = b.x2 - b.x1 + pad * 2, h = b.y2 - b.y1 + pad * 2;
  const z = clamp(Math.min(r.width / w, r.height / h), 0.1, maxZ);
  S.view = { z, x: r.width / 2 - ((b.x1 + b.x2) / 2) * z, y: r.height / 2 - ((b.y1 + b.y2) / 2) * z };
  applyView();
}

// ---------------------------------------------------------------- SVG builders
function compSVG(c, extraCls = '') {
  const d = SYMBOLS[c.type];
  if (!d) return '';
  const s = c.s || 1;
  const tf = `translate(${c.x} ${c.y}) rotate(${(c.rot || 0) * 90})${s !== 1 ? ` scale(${s})` : ''}${c.flip ? ' scale(-1 1)' : ''}`;
  const [x1, y1, x2, y2] = d.box;
  const cls = `comp ${S.sel.has(c.id) ? 'sel' : ''} ${extraCls}`;
  return `<g class="${cls}" data-id="${c.id || ''}"${c.id ? wiDelay() : ''}><g transform="${tf}"${s !== 1 ? ` style="--cs:${s}"` : ''}>` +
    `<rect class="hit" x="${x1 - 4}" y="${y1 - 4}" width="${x2 - x1 + 8}" height="${y2 - y1 + 8}"/>${d.body}</g>` +
    `${labelsSVG(c, d)}</g>`;
}
function labelsSVG(c, d) {
  if (d.label === 'none') return '';
  // labels grow with the part, gently (a 2× part gets about 1.4× labels)
  const k = Math.sqrt(c.s || 1);
  const fs = k !== 1 ? ` style="font-size:calc(var(--lbl-size) * ${Math.round(k * 100) / 100})"` : '';
  if (d.label === 'anchor') {
    const [ax, ay] = xf(c, d.anchor[0], d.anchor[1]);
    const dx = ax - c.x, dy = ay - c.y;
    let anchor = 'middle', ty = ay + 4 * k;
    if (Math.abs(dx) > Math.abs(dy)) anchor = dx > 0 ? 'start' : 'end';
    else ty = dy < 0 ? ay + 2 * k : ay + 10 * k;
    const cls = d.id === 'netlabel' ? 'lbl net' : 'lbl';
    return `<text class="${cls}" x="${ax}" y="${ty}" text-anchor="${anchor}"${fs}>${esc(c.value)}</text>`;
  }
  const b = compBox(c);
  const cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
  const w = b.x2 - b.x1, h = b.y2 - b.y1;
  if (w > h * 1.4) {
    return `<text class="lbl" x="${cx}" y="${b.y1 - 6 * k}" text-anchor="middle"${fs}>${esc(c.ref)}</text>` +
      `<text class="lbl val" x="${cx}" y="${b.y2 + 14 * k}" text-anchor="middle"${fs}>${esc(c.value)}</text>`;
  }
  return `<text class="lbl" x="${b.x2 + 6 * k}" y="${cy - 3 * k}"${fs}>${esc(c.ref)}</text>` +
    `<text class="lbl val" x="${b.x2 + 6 * k}" y="${cy + 11 * k}"${fs}>${esc(c.value)}</text>`;
}
const ptsAttr = (pts) => pts.map((p) => `${p[0]},${p[1]}`).join(' ');
function wireSVG(w) {
  const pts = ptsAttr(w.pts);
  return `<g class="wire ${S.sel.has(w.id) ? 'sel' : ''}" data-id="${w.id}"${wiDelay()}><polyline class="hitw" points="${pts}"/><polyline class="w" pathLength="1" points="${pts}"/></g>`;
}
// Write-in animation: each item starts a little after the previous one.
function wiDelay() {
  if (!S.writeIn) return '';
  return ` style="--d:${(S.wi.n++ * S.wi.step).toFixed(3)}s"`;
}
function strokePath(pts) {
  if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}l0.01 0`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    d += `Q${x1} ${y1} ${r1((x1 + x2) / 2)} ${r1((y1 + y2) / 2)}`;
  }
  const l = pts[pts.length - 1];
  return d + `L${l[0]} ${l[1]}`;
}
// Fountain pen: a filled outline whose width follows pressure (stylus) or speed (mouse), tapered at both ends.
function nibOutline(pts, width) {
  const n = pts.length;
  if (n < 2) {
    const [x, y] = pts[0], r = width * 0.6;
    return `M${x - r} ${y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const T = cum[n - 1] || 1, avg = T / (n - 1) || 1;
  const taper = P.taper / 100, tl = Math.max(1, Math.min(T * 0.3, width * 8));
  const hasP = pts.some((p) => p[2] != null);
  const ease = (t) => Math.sqrt(clamp(t, 0, 1));
  const ws = pts.map((p, i) => {
    let f;
    if (hasP) f = 0.35 + 1.3 * (p[2] ?? 0.5);
    else f = clamp(1.35 - 0.45 * ((i ? cum[i] - cum[i - 1] : cum[1]) / avg), 0.55, 1.35);
    f *= (1 - taper) + taper * Math.max(Math.min(ease(cum[i] / tl), ease((T - cum[i]) / tl)), 0.12);
    return Math.max(0.3, width * 0.62 * f);
  });
  for (let k = 0; k < 2; k++) for (let i = 1; i < n - 1; i++) ws[i] = (ws[i - 1] + 2 * ws[i] + ws[i + 1]) / 4;
  const Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * ws[i], ny = (dx / len) * ws[i];
    Lp.push([r1(pts[i][0] + nx), r1(pts[i][1] + ny)]);
    Rp.push([r1(pts[i][0] - nx), r1(pts[i][1] - ny)]);
  }
  const side = (arr) => {
    let d = '';
    for (let i = 1; i < arr.length - 1; i++) {
      const [x1, y1] = arr[i], [x2, y2] = arr[i + 1];
      d += `Q${x1} ${y1} ${r1((x1 + x2) / 2)} ${r1((y1 + y2) / 2)}`;
    }
    const l = arr[arr.length - 1];
    return `${d}L${l[0]} ${l[1]}`;
  };
  Rp.reverse();
  const we = r1(ws[n - 1]), w0 = r1(ws[0]);
  return `M${Lp[0][0]} ${Lp[0][1]}${side(Lp)}A${we} ${we} 0 0 1 ${Rp[0][0]} ${Rp[0][1]}${side(Rp)}A${w0} ${w0} 0 0 1 ${Lp[0][0]} ${Lp[0][1]}Z`;
}
function inkPath(pts, color, width, nib = 'round') {
  const c = colorVal(color);
  if (nib === 'fountain') return `<path class="ink fill" d="${nibOutline(pts, width)}" fill="${c}"/>`;
  let w = width, extra = '', cls = 'ink', cap = 'round';
  if (nib === 'marker') { w = width * 1.7; extra = ' opacity=".9"'; }
  else if (nib === 'pencil') { w = Math.max(1, width * 0.85); extra = ' opacity=".85" filter="url(#f-pencil)"'; }
  else if (nib === 'highlighter') { w = width * 4.5; extra = ' opacity=".38"'; cls += ' hl'; cap = 'square'; }
  return `<path class="${cls}" pathLength="1" d="${strokePath(pts)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}/>`;
}
function strokeSVG(s) {
  return `<g class="stroke ${S.sel.has(s.id) ? 'sel' : ''}" data-id="${s.id}"${wiDelay()}><path class="hitw" d="${strokePath(s.pts)}"/>` +
    `${inkPath(s.pts, s.color, s.width, s.nib)}</g>`;
}
function shapeGeom(s) {
  const x = Math.min(s.x1, s.x2), y = Math.min(s.y1, s.y2), w = Math.abs(s.x2 - s.x1), h = Math.abs(s.y2 - s.y1);
  if (s.kind === 'rect') return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(P.shapeRadius, w / 2, h / 2)}"/>`;
  if (s.kind === 'ellipse') return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
  let d = `M${s.x1} ${s.y1}L${s.x2} ${s.y2}`;
  if (s.kind === 'arrow') {
    const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1), L = (9 + s.width * 2.2) * (P.arrowSize / 100);
    d += `M${r1(s.x2 - L * Math.cos(a - 0.45))} ${r1(s.y2 - L * Math.sin(a - 0.45))}L${s.x2} ${s.y2}L${r1(s.x2 - L * Math.cos(a + 0.45))} ${r1(s.y2 - L * Math.sin(a + 0.45))}`;
  }
  return `<path d="${d}"/>`;
}
function shapeSVG(s) {
  const g = shapeGeom(s);
  const c = colorVal(s.color);
  const fill = P.shapeFill === 'tint' && (s.kind === 'rect' || s.kind === 'ellipse') ? `fill="${c}" fill-opacity=".14"` : 'fill="none"';
  return `<g class="shape ${S.sel.has(s.id) ? 'sel' : ''}" data-id="${s.id || ''}"${s.id ? wiDelay() : ''}>${g.replace(/^<(\w+)/, '<$1 class="hitw"')}` +
    `<g ${fill} stroke="${c}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round">${g.replace(/^<(\w+)/, '<$1 pathLength="1"')}</g></g>`;
}
function symbolPreview(d, pad = 6) {
  const [x1, y1, x2, y2] = d.box;
  return `<svg viewBox="${x1 - pad} ${y1 - pad} ${x2 - x1 + pad * 2} ${y2 - y1 + pad * 2}">${d.body}</svg>`;
}

// ---------------------------------------------------------------- render
function render() {
  if (!S.project) return; // nothing loaded yet (first setTool during boot)
  const pg = page();
  if (S.writeIn) S.wi.n = 0;
  G.images.innerHTML = pg.images.map((it) => imageSVG(it)).join('');
  G.comps.innerHTML = pg.comps.map((c) => compSVG(c)).join('');
  G.wires.innerHTML = pg.wires.map((w) => wireSVG(w)).join('');
  G.shapes.innerHTML = pg.shapes.map((s) => shapeSVG(s)).join('');
  G.strokes.innerHTML = pg.strokes.map((s) => strokeSVG(s)).join('');
  G.junc.innerHTML = junctions(pg).map((p) => `<circle class="junc" cx="${p[0]}" cy="${p[1]}" r="${P.juncSize}"/>`).join('');
  fxRegion();
  renderSelection();
  renderTexts();
  renderPreview();
  renderInspector();
  renderStatus();
}

function renderSelection() {
  const pg = page();
  let h = '';
  for (const c of pg.comps) {
    if (!S.sel.has(c.id)) continue;
    const b = compBox(c);
    h += `<rect class="sel-box" x="${b.x1 - 5}" y="${b.y1 - 5}" width="${b.x2 - b.x1 + 10}" height="${b.y2 - b.y1 + 10}" rx="3"/>`;
  }
  if (S.tool === 'wire' || P.showPins) {
    for (const c of pg.comps) for (const p of pinsOf(c)) h += `<circle class="pin-mark" cx="${p.x}" cy="${p.y}" r="3"/>`;
  }
  // resize handles around the whole selection
  const b = S.tool === 'select' && !S.editing && S.sel.size ? selBox() : null;
  if (b) {
    const z = S.view.z, pad = 8 / z, hs = 10 / z;
    const x1 = b.x1 - pad, y1 = b.y1 - pad, x2 = b.x2 + pad, y2 = b.y2 + pad;
    if (S.sel.size > 1 || !selectedComps().length) h += `<rect class="sel-box rs-box" x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}"/>`;
    for (const [k, x, y] of [['nw', x1, y1], ['ne', x2, y1], ['sw', x1, y2], ['se', x2, y2]]) {
      h += `<rect class="rs-h" data-h="${k}" x="${x - hs / 2}" y="${y - hs / 2}" width="${hs}" height="${hs}" rx="${2 / z}"><title>${esc(tr('hint.resize'))}</title></rect>`;
    }
  }
  G.sel.innerHTML = h;
}
function selBox() {
  let b = null;
  for (const id of S.sel) {
    const f = find(id);
    const ib = f && itemBox(f.k, f.item);
    if (ib) b = b ? { x1: Math.min(b.x1, ib.x1), y1: Math.min(b.y1, ib.y1), x2: Math.max(b.x2, ib.x2), y2: Math.max(b.y2, ib.y2) } : { ...ib };
  }
  return b;
}

function tboxEl(id) { return $(`#texts > [data-id="${id}"]`); }
function renderTexts() {
  const layer = $('#texts');
  const seen = new Set();
  for (const t of page().texts) {
    seen.add(t.id);
    let el = tboxEl(t.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'tbox';
      el.dataset.id = t.id;
      el.innerHTML = `<div class="tbody"></div><div class="tres" title="${esc(tr('text.resize'))}"></div>`;
      layer.appendChild(el);
    }
    el.style.left = `${t.x}px`;
    el.style.top = `${t.y}px`;
    el.style.width = `${t.w}px`;
    if (S.writeIn) el.style.setProperty('--d', `${(S.wi.n++ * S.wi.step).toFixed(3)}s`);
    else el.style.removeProperty('--d');
    el.classList.toggle('sel', S.sel.has(t.id) && S.editing !== t.id);
    const body = el.firstChild;
    if (S.editing !== t.id) body.style.fontSize = t.z && t.z !== 1 ? `calc(var(--text-size) * ${t.z})` : ''; // never touch the box being typed in
    if (S.editing !== t.id && body.innerHTML !== t.html) body.innerHTML = t.html;
  }
  for (const el of [...layer.children]) if (!seen.has(el.dataset.id)) el.remove();
}

function renderPreview() {
  let h = '';
  const c = S.cursor;
  if (S.tool === 'place' && S.placing && S.cursorScreen) {
    const d = SYMBOLS[S.placing];
    h += compSVG({ id: '', type: d.id, x: snap(c.x), y: snap(c.y), rot: S.placeRot, flip: S.placeFlip, ref: d.prefix ? `${d.prefix}?` : '', value: d.value }, 'ghost');
  }
  if (S.tool === 'wire' && S.cursorScreen) {
    const p = wirePoint(c);
    if (S.draft) {
      const pts = S.draft.pts;
      const last = pts[pts.length - 1];
      if (pts.length > 1) h += `<polyline class="draft" points="${ptsAttr(pts)}"/>`;
      const hf = Math.abs(p[0] - last[0]) >= Math.abs(p[1] - last[1]);
      h += `<polyline class="draft next" points="${ptsAttr([last, ...route(last, p, hf), p])}"/>`;
    }
    const hot = connectionAt(p);
    h += hot ? `<circle class="pin-hot" cx="${p[0]}" cy="${p[1]}" r="5"/>` : `<circle class="cursor-dot" cx="${p[0]}" cy="${p[1]}" r="2.2"/>`;
  }
  const d = S.drag;
  if (d && d.type === 'pen' && d.pts.length) h += inkPath(d.pts, S.pen.color, S.pen.width, S.pen.nib);
  if (d && d.type === 'shape' && d.shape) h += shapeSVG(d.shape);
  G.preview.innerHTML = h;
}

function renderStatus() {
  const pg = page();
  $('#st-page').textContent = `${S.project.name} › ${pg.name}`;
  const n = pg.comps.filter((c) => SYMBOLS[c.type].bom).length;
  $('#st-count').textContent = tr('status.counts', { parts: n, wires: pg.wires.length, sketch: pg.strokes.length + pg.shapes.length, text: pg.texts.length });
}

// ---------------------------------------------------------------- history & saving
function stacks() { return (S.hist[S.pageId] ||= { u: [], r: [] }); }
function snapshot() { const pg = page(); return JSON.stringify(KINDS.map((k) => pg[k])); }
function restore(snap) { const arr = JSON.parse(snap); const pg = page(); KINDS.forEach((k, i) => { pg[k] = arr[i]; }); }
function pushUndo(before) {
  const h = stacks();
  h.u.push(before);
  while (h.u.length > P.undoLimit) h.u.shift();
  h.r.length = 0;
}
function mutate(fn) {
  const before = snapshot();
  fn(page());
  if (snapshot() !== before) { pushUndo(before); scheduleSave(); }
  render();
}
function undo() {
  endEdit();
  const h = stacks();
  if (!h.u.length) return toast(tr('toast.noUndo'));
  h.r.push(snapshot());
  restore(h.u.pop());
  S.sel.clear();
  scheduleSave();
  render();
}
function redo() {
  endEdit();
  const h = stacks();
  if (!h.r.length) return toast(tr('toast.noRedo'));
  h.u.push(snapshot());
  restore(h.r.pop());
  S.sel.clear();
  scheduleSave();
  render();
}

let saveTimer = null;
function setSaveState(k) {
  S.saveKey = k;
  const el = $('#st-save');
  el.textContent = tr(`save.${k}`);
  el.classList.toggle('saving', k !== 'saved');
}
function scheduleSave(bump = true) {
  if (!S.project) return;
  if (bump) S.project.updated = Date.now();
  S.dirty = true;
  setSaveState('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, P.autosaveDelay);
}
async function flushSave() {
  clearTimeout(saveTimer);
  if (!S.dirty || !S.project) return;
  S.dirty = false;
  page().view = { ...S.view };
  try {
    await api.saveProject(S.project);
    setSaveState('saved');
    if (typeof cloudSoon === 'function') cloudSoon();
  } catch (err) {
    S.dirty = true;
    setSaveState('failed');
    saveTimer = setTimeout(flushSave, 2000);
  }
}

// ---------------------------------------------------------------- tools

function setTool(t, sym = null) {
  if (S.draft) finishWire();
  endEdit();
  S.tool = t;
  S.placing = t === 'place' ? sym : null;
  if (t === 'place') { S.placeRot = 0; S.placeFlip = false; }
  document.body.dataset.tool = t;
  $$('#tools [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
  $$('.tile').forEach((el) => el.classList.toggle('on', el.dataset.sym === S.placing));
  renderHint();
  renderToolOptions();
  render();
}
function renderHint() {
  let hint = tr(`hint.${S.tool}`);
  if (S.tool === 'place' && S.placing) hint = tr('hint.placing', { name: esc(symName(SYMBOLS[S.placing])) }) + hint;
  $('#hint').innerHTML = hint;
}

function renderToolOptions() {
  const box = $('#tool-options');
  const editing = !!activeEditable();
  $('#fmt').classList.toggle('hidden', !(editing || S.tool === 'text'));
  let h = '';
  const set = (html) => { // only touch the DOM when something changed, so a button is never swapped mid-click
    if (box.dataset.sig === html) return;
    box.dataset.sig = html;
    box.innerHTML = html;
  };
  if (editing || S.tool === 'text' || !(S.tool === 'pen' || S.tool === 'shape')) { set(''); return; }
  if (S.tool === 'shape') {
    h += SHAPE_KINDS.map(([k, label, svg]) =>
      `<button data-shape="${k}" class="${S.shapeKind === k ? 'on' : ''}" title="${tr(label)}"><svg viewBox="0 0 20 20">${svg}</svg></button>`).join('');
    h += '<span class="sep"></span>';
  }
  if (S.tool === 'pen') {
    h += NIBS.map(([k, l, svg]) =>
      `<button data-nib="${k}" class="${S.pen.nib === k ? 'on' : ''}" title="${esc(L2(l))}"><svg viewBox="0 0 20 20">${svg}</svg></button>`).join('');
    h += '<span class="sep"></span>';
  }
  h += inkColors().map((c) =>
    `<button class="sw ${S.pen.color === c ? 'on' : ''}" data-color="${c}" title="${c === 'ink' ? tr('opt.ink') : c}"><i style="background:${c === 'ink' ? 'var(--ink)' : c}"></i></button>`).join('');
  h += '<span class="sep"></span>';
  h += WIDTHS.map((w) =>
    `<button data-width="${w}" class="${S.pen.width === w ? 'on' : ''}" title="${tr('opt.width', { w })}"><span class="wline" style="height:${Math.min(w, 6)}px"></span></button>`).join('');
  set(h);
}

// ---------------------------------------------------------------- wires
// Where a wire click lands: on a nearby pin if there is one (resized parts can have pins off the grid),
// otherwise on the grid.
function wirePoint(w) {
  const reach = 9 / S.view.z;
  let best = null, bd = reach;
  for (const c of page().comps) for (const p of pinsOf(c)) {
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if (d < bd) { bd = d; best = [p.x, p.y]; }
  }
  return best || [snap(w.x), snap(w.y)];
}
function wireClick(w) {
  const p = wirePoint(w);
  if (!S.draft) {
    S.draft = { pts: [p] };
    renderPreview();
    return;
  }
  const pts = S.draft.pts;
  const last = pts[pts.length - 1];
  if (p[0] === last[0] && p[1] === last[1]) { finishWire(); return; }
  const hf = Math.abs(p[0] - last[0]) >= Math.abs(p[1] - last[1]);
  pts.push(...route(last, p, hf), p);
  if (connectionAt(p)) finishWire(); else renderPreview();
}
function finishWire() {
  const d = S.draft;
  S.draft = null;
  if (d) {
    const pts = simplify(d.pts);
    if (pts.length >= 2) mutate((pg) => pg.wires.push({ id: uid(), pts }));
  }
  renderPreview();
}

// Move one wire end to follow a pin while keeping every segment orthogonal.
function dragEnd(pts, atStart, atEnd, dx, dy) {
  if (atStart && atEnd) return pts.map((p) => [p[0] + dx, p[1] + dy]);
  const q = clone(pts);
  if (atEnd) q.reverse();
  const [p0, p1] = q;
  const horiz = p0[1] === p1[1];
  const n0 = [p0[0] + dx, p0[1] + dy];
  if (q.length >= 3) {
    q[0] = n0;
    q[1] = horiz ? [p1[0], p1[1] + dy] : [p1[0] + dx, p1[1]];
  } else {
    q[0] = n0;
    q.splice(1, 0, ...route(n0, p1, horiz, true));
  }
  if (atEnd) q.reverse();
  return q;
}
// After a rotate/mirror, pull wire ends that sat on old pins onto the new pins.
function reconnect(pg, oldPins, newPins, skip) {
  for (const w of pg.wires) {
    if (skip.has(w.id)) continue;
    for (const end of [w.pts.length - 1, 0]) { // tail first so index 0 stays valid
      const p = w.pts[end];
      const i = oldPins.findIndex((o) => o.x === p[0] && o.y === p[1]);
      if (i < 0) continue;
      const np = [newPins[i].x, newPins[i].y];
      if (end === 0) {
        const nb = w.pts[1];
        w.pts.splice(0, 1, np, ...route(np, nb, Math.abs(np[0] - nb[0]) >= Math.abs(np[1] - nb[1]), true));
      } else {
        const nb = w.pts[w.pts.length - 2];
        w.pts.splice(w.pts.length - 1, 1, ...route(nb, np, Math.abs(np[0] - nb[0]) < Math.abs(np[1] - nb[1]), true), np);
      }
    }
    w.pts = simplify(w.pts);
  }
}

// ---------------------------------------------------------------- selection ops
function selectedComps() { return page().comps.filter((c) => S.sel.has(c.id)); }

function rotateSel(flip = false) {
  if (S.tool === 'place') {
    if (flip) S.placeFlip = !S.placeFlip; else S.placeRot = (S.placeRot + 1) % 4;
    renderPreview();
    return;
  }
  const comps = selectedComps();
  if (!comps.length) return;
  mutate((pg) => {
    for (const c of comps) {
      const old = pinsOf(c);
      if (flip) c.flip = !c.flip; else c.rot = ((c.rot || 0) + 1) % 4;
      reconnect(pg, old, pinsOf(c), S.sel);
    }
  });
}

function deleteSel() {
  if (!S.sel.size) return;
  mutate((pg) => { for (const k of KINDS) pg[k] = pg[k].filter((o) => !S.sel.has(o.id)); });
  S.sel.clear();
  render();
}

// ---------------------------------------------------------------- pictures (scanned pages)
// Picture items point at a file stored next to the project ({ asset: "id.webp" }); loaded on demand.
const ASSETS = new Map(); // "projectId/name" → data URL
const assetsLoading = new Set();
function assetUrl(name, pid = S.project && S.project.id) {
  const k = `${pid}/${name}`;
  if (ASSETS.has(k)) return ASSETS.get(k);
  if (pid && !assetsLoading.has(k)) {
    assetsLoading.add(k);
    api.loadAsset(pid, name).then((url) => { ASSETS.set(k, url || ''); assetsLoading.delete(k); if (S.project && S.project.id === pid) render(); })
      .catch(() => { ASSETS.set(k, ''); assetsLoading.delete(k); });
  }
  return null;
}
async function loadAllAssets(pages = S.project.pages) {
  const names = new Set(pages.flatMap((pg) => (pg.images || []).map((i) => i.asset)));
  await Promise.all([...names].map(async (n) => { const k = `${S.project.id}/${n}`; if (!ASSETS.has(k)) ASSETS.set(k, (await api.loadAsset(S.project.id, n).catch(() => null)) || ''); }));
}
function copyAssetFrom(pid, name) {
  const url = ASSETS.get(`${pid}/${name}`);
  if (!url) return;
  ASSETS.set(`${S.project.id}/${name}`, url);
  api.saveAsset(S.project.id, name.replace(/\.[a-z]+$/i, ''), url).catch(() => {});
}
function imageSVG(it) {
  const src = assetUrl(it.asset);
  const sel = S.sel.has(it.id) ? 'sel' : '';
  if (!src) return `<g class="pic ${sel}" data-id="${it.id}"><rect class="pic-ph" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"/></g>`;
  return `<g class="pic ${sel}" data-id="${it.id}"${wiDelay()}><image href="${src}" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" preserveAspectRatio="none"/></g>`;
}

function copySel() {
  if (!S.sel.size) return false;
  const items = [];
  for (const id of S.sel) { const f = find(id); if (f) items.push({ k: f.k, item: clone(f.item) }); }
  S.clipboard = items;
  S.clipPid = S.project.id;
  S.pasteN = 0;
  return true;
}
function translateItem(k, it, dx, dy) {
  if (k === 'comps' || k === 'texts' || k === 'images') { it.x += dx; it.y += dy; }
  else if (k === 'wires' || k === 'strokes') it.pts = it.pts.map((p) => [r1(p[0] + dx), r1(p[1] + dy), ...p.slice(2)]);
  else if (k === 'shapes') { it.x1 += dx; it.x2 += dx; it.y1 += dy; it.y2 += dy; }
}
function pasteInternal() {
  if (!S.clipboard) return;
  S.pasteN++;
  const off = P.pasteOffset * S.pasteN;
  const ids = new Set();
  mutate((pg) => {
    for (const { k, item } of S.clipboard) {
      const it = clone(item);
      it.id = uid();
      translateItem(k, it, off, off);
      if (k === 'comps') it.ref = nextRef(SYMBOLS[it.type].prefix);
      if (k === 'images' && S.clipPid !== S.project.id) copyAssetFrom(S.clipPid, it.asset);
      pg[k].push(it);
      ids.add(it.id);
    }
  });
  S.sel = ids;
  render();
}

// ---------------------------------------------------------------- text editing
function activeEditable() {
  const a = document.activeElement;
  return a && a.isContentEditable ? a : null;
}
function startEdit(id, atPoint = null) {
  if (S.editing === id) return;
  endEdit();
  const el = tboxEl(id);
  if (!el) return;
  S.editing = id;
  S.editBefore = snapshot();
  S.sel = new Set([id]);
  el.classList.add('editing');
  el.classList.remove('sel');
  const body = el.firstChild;
  body.contentEditable = 'true';
  body.spellcheck = P.spellcheck;
  body.focus();
  const range = (atPoint && document.caretRangeFromPoint(atPoint.x, atPoint.y)) || null;
  const sel = window.getSelection();
  if (range && body.contains(range.startContainer)) { sel.removeAllRanges(); sel.addRange(range); }
  else { const r = document.createRange(); r.selectNodeContents(body); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }
  renderSelection();
  renderInspector();
  renderToolOptions();
}
function endEdit() {
  if (!S.editing) return;
  const id = S.editing;
  S.editing = null;
  const el = tboxEl(id);
  const f = find(id);
  if (el && f) {
    const body = el.firstChild;
    body.contentEditable = 'false';
    el.classList.remove('editing');
    const empty = !body.textContent.trim() && !body.querySelector('img');
    if (empty) page().texts.splice(f.i, 1);
    else f.item.html = sanitize(body.innerHTML);
    if (snapshot() !== S.editBefore) { pushUndo(S.editBefore); scheduleSave(); }
    else if (!S.dirty) setSaveState('saved');
  }
  window.getSelection().removeAllRanges();
  render();
  renderToolOptions();
}
function addText(x, y, html = '', w = P.textWidth) {
  const t = { id: uid(), x: P.snapText ? snap(x) : r1(x), y: P.snapText ? snap(y) : r1(y), w, html };
  const before = snapshot();
  page().texts.push(t);
  render();
  if (html) { pushUndo(before); scheduleSave(); S.sel = new Set([t.id]); render(); }
  else { startEdit(t.id); S.editBefore = before; }
  return t;
}

// Images: shrink big photos so project files stay reasonable.
async function imageToDataUrl(file) {
  const bmp = await createImageBitmap(file);
  const max = 1600;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (k === 1 && file.size < 400_000) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
  }
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * k);
  cv.height = Math.round(bmp.height * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.86);
}
function imageFromClipboard(cd) {
  for (const it of cd.items || []) if (it.kind === 'file' && it.type.startsWith('image/')) return it.getAsFile();
  return null;
}

// ---------------------------------------------------------------- pointer input
function hitId(e) {
  const g = e.target.closest('[data-id]');
  return g && g.dataset.id ? g.dataset.id : null;
}

const penPoint = (e, w) => {
  const p = [r1(w.x), r1(w.y)];
  if (P.pressure && e.pointerType === 'pen' && e.pressure > 0) p.push(Math.round(e.pressure * 100) / 100);
  return p;
};
function smoothPts(pts, times) {
  for (let t = 0; t < times; t++) {
    const q = pts.map((p) => p.slice());
    for (let i = 1; i < pts.length - 1; i++) {
      for (let j = 0; j < pts[i].length; j++) {
        if (pts[i - 1][j] == null || pts[i + 1][j] == null) continue;
        const v = (pts[i - 1][j] + 2 * pts[i][j] + pts[i + 1][j]) / 4;
        q[i][j] = j === 2 ? Math.round(v * 100) / 100 : r1(v);
      }
    }
    pts = q;
  }
  return pts;
}

// ---------------------------------------------------------------- touch
// Two fingers pinch-zoom and pan. Once a stylus has been used, fingers only move the page (so a
// resting palm never draws); otherwise one finger draws with the current tool.
const isPhone = () => window.matchMedia('(max-width: 820px)').matches;
const touches = new Map();
let pinch = null;
function touchPoint(e) { const r = vp.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function cancelDrag() {
  const d = S.drag;
  if (!d) return;
  if ((d.type === 'move' || d.type === 'scale' || d.type === 'erase' || d.type === 'tres') && d.before) restore(d.before);
  S.drag = null;
  $('#marquee').classList.add('hidden');
  document.body.classList.remove('panning');
  render();
}
function touchDown(e) {
  if (e.pointerType === 'pen') S.stylus = true;
  if (e.pointerType !== 'touch') return false;
  // A first finger means no other finger is down. Forget any finger whose lift we never heard
  // (e.g. a pinch that ended over the tool bar); otherwise every new touch looks like a pinch and
  // nothing gets drawn.
  if (e.isPrimary) { touches.clear(); pinch = null; }
  touches.set(e.pointerId, touchPoint(e));
  try { vp.setPointerCapture(e.pointerId); } catch { /* finger already gone */ }
  if (touches.size === 2) {
    cancelDrag();
    if (S.draft) { S.draft = null; renderPreview(); }
    const [a, b] = [...touches.values()];
    pinch = { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, dist: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
    return true;
  }
  if (touches.size > 2) return true;
  // with a stylus around, one finger pans instead of drawing
  if (S.stylus && ['pen', 'shape', 'eraser', 'wire', 'text'].includes(S.tool)) {
    S.drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: S.view.x, vy: S.view.y };
    vp.setPointerCapture(e.pointerId);
    return true;
  }
  return false;
}
function touchMove(e) {
  if (e.pointerType !== 'touch' || !touches.has(e.pointerId)) return false;
  touches.set(e.pointerId, touchPoint(e));
  if (!pinch || touches.size < 2) return false;
  const [a, b] = [...touches.values()];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
  S.view.x += mid.x - pinch.mid.x;
  S.view.y += mid.y - pinch.mid.y;
  zoomAt(mid.x, mid.y, dist / pinch.dist);
  pinch = { mid, dist };
  return true;
}
function touchUp(e) {
  if (e.pointerType !== 'touch') return false;
  touches.delete(e.pointerId);
  if (pinch) { if (touches.size < 2) { pinch = null; scheduleSave(false); } return true; }
  return false;
}

vp.addEventListener('pointerdown', (e) => {
  hideMenu();
  closeDrawers();
  if (touchDown(e)) return;
  stopWriteIn();
  const w = toWorld(e);
  S.cursor = w;
  const tbox = e.target.closest('.tbox');
  if (tbox && tbox.classList.contains('editing')) return; // native caret handling

  if (S.editing) endEdit();
  if (document.activeElement && document.activeElement !== document.body && !vp.contains(document.activeElement)) document.activeElement.blur();

  if (e.button === 1 || (e.button === 0 && (S.space || S.tool === 'hand'))) {
    e.preventDefault();
    S.drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: S.view.x, vy: S.view.y };
    document.body.classList.add('panning');
    vp.setPointerCapture(e.pointerId);
    return;
  }
  if (e.button === 2) {
    if (S.draft) { finishWire(); return; }
    if (S.tool === 'place') { setTool('select'); return; }
    return; // context menu handled separately
  }
  if (e.button !== 0) return;
  vp.setPointerCapture(e.pointerId);

  // text box resize handle
  if (e.target.classList.contains('tres')) {
    const id = e.target.parentElement.dataset.id;
    const t = find(id).item;
    S.drag = { type: 'tres', id, sx: e.clientX, w0: t.w, before: snapshot() };
    return;
  }

  if (S.tool === 'select' && e.target.classList && e.target.classList.contains('rs-h')) {
    startScale(e.target.dataset.h);
    return;
  }

  const id = hitId(e);
  switch (S.tool) {
    case 'select': {
      if (id) {
        if (e.shiftKey) { if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); }
        else if (!S.sel.has(id)) S.sel = new Set([id]);
        render();
        if (S.sel.has(id)) startMove(w);
      } else {
        if (!e.shiftKey) S.sel.clear();
        S.drag = { type: 'marquee', a: w, sa: { x: e.clientX, y: e.clientY }, base: new Set(S.sel) };
        render();
      }
      break;
    }
    case 'place':
      placeAt(w);
      break;
    case 'wire':
      wireClick(w);
      break;
    case 'pen': {
      const p0 = penPoint(e, w);
      S.drag = { type: 'pen', pts: [p0], start: p0 };
      break;
    }
    case 'shape':
      S.drag = { type: 'shape', a: w, shape: null };
      break;
    case 'eraser':
      S.drag = { type: 'erase', before: snapshot(), hit: false };
      eraseAt(e);
      break;
    case 'text':
      if (tbox) { e.preventDefault(); startEdit(tbox.dataset.id, { x: e.clientX, y: e.clientY }); }
      else { e.preventDefault(); addText(w.x, w.y - 12); }
      break;
    default:
  }
});

// Keep focus under our control: clicks on the canvas never steal focus from an
// editor we just opened, and never start a native text selection.
vp.addEventListener('mousedown', (e) => {
  const tbox = e.target.closest('.tbox');
  if (!(tbox && tbox.classList.contains('editing'))) e.preventDefault();
});

vp.addEventListener('pointermove', (e) => {
  if (touchMove(e)) return;
  const w = toWorld(e);
  S.cursor = w;
  S.cursorScreen = { x: e.clientX, y: e.clientY };
  $('#st-pos').textContent = `x ${snap(w.x)}  y ${snap(w.y)}`;
  const d = S.drag;
  if (!d) {
    if (S.tool === 'wire' || S.tool === 'place') renderPreview();
    return;
  }
  switch (d.type) {
    case 'pan':
      S.view.x = d.vx + (e.clientX - d.sx);
      S.view.y = d.vy + (e.clientY - d.sy);
      applyView();
      break;
    case 'move': doMove(w); break;
    case 'scale': doScale(w, e); break;
    case 'marquee': {
      const r = vp.getBoundingClientRect();
      const m = $('#marquee');
      m.classList.remove('hidden');
      Object.assign(m.style, {
        left: `${Math.min(d.sa.x, e.clientX) - r.left}px`, top: `${Math.min(d.sa.y, e.clientY) - r.top}px`,
        width: `${Math.abs(e.clientX - d.sa.x)}px`, height: `${Math.abs(e.clientY - d.sa.y)}px`,
      });
      const box = { x1: Math.min(d.a.x, w.x), y1: Math.min(d.a.y, w.y), x2: Math.max(d.a.x, w.x), y2: Math.max(d.a.y, w.y) };
      const sel = new Set(d.base);
      const pg = page();
      for (const k of KINDS) for (const it of pg[k]) {
        const b = itemBox(k, it);
        if (b && b.x1 <= box.x2 && b.x2 >= box.x1 && b.y1 <= box.y2 && b.y2 >= box.y1) sel.add(it.id);
      }
      S.sel = sel;
      render();
      break;
    }
    case 'pen': {
      if (e.shiftKey) { d.pts = [d.start, penPoint(e, w)]; }
      else {
        if (d.pts.length === 2 && d.straight) d.pts = [d.start];
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        for (const ev of evs.length ? evs : [e]) {
          const p = penPoint(ev, toWorld(ev));
          const l = d.pts[d.pts.length - 1];
          if (Math.hypot(p[0] - l[0], p[1] - l[1]) * S.view.z < 2) continue;
          d.pts.push(p);
        }
      }
      d.straight = e.shiftKey;
      renderPreview();
      break;
    }
    case 'shape': {
      let x2 = w.x, y2 = w.y;
      if (e.shiftKey) {
        const dx = x2 - d.a.x, dy = y2 - d.a.y;
        if (S.shapeKind === 'rect' || S.shapeKind === 'ellipse') {
          const s = Math.max(Math.abs(dx), Math.abs(dy));
          x2 = d.a.x + Math.sign(dx || 1) * s; y2 = d.a.y + Math.sign(dy || 1) * s;
        } else {
          const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(dx, dy);
          x2 = d.a.x + Math.cos(ang) * len; y2 = d.a.y + Math.sin(ang) * len;
        }
      }
      d.shape = { id: '', kind: S.shapeKind, x1: r1(d.a.x), y1: r1(d.a.y), x2: r1(x2), y2: r1(y2), color: S.pen.color, width: S.pen.width };
      renderPreview();
      break;
    }
    case 'erase': eraseAt(e); break;
    case 'tres': {
      const t = find(d.id).item;
      t.w = Math.max(80, Math.round(d.w0 + (e.clientX - d.sx) / S.view.z));
      renderTexts();
      break;
    }
    default:
  }
});

function endDrag() {
  const d = S.drag;
  S.drag = null;
  document.body.classList.remove('panning');
  $('#marquee').classList.add('hidden');
  if (!d) return;
  switch (d.type) {
    case 'pan': scheduleSave(false); break;
    case 'move':
      if (d.moved) {
        const pg = page();
        for (const w of pg.wires) if (S.sel.has(w.id) || d.attach.some((a) => a.id === w.id)) w.pts = simplify(w.pts);
        pushUndo(d.before);
        scheduleSave();
        render();
      }
      break;
    case 'pen':
      if (d.pts.length) {
        const pts = d.pts.length === 1 ? [d.pts[0], [d.pts[0][0] + 0.1, d.pts[0][1]]] : smoothPts(d.pts, d.straight ? 0 : P.smoothing);
        const s = { id: uid(), pts, color: S.pen.color, width: S.pen.width };
        if (S.pen.nib !== 'round') s.nib = S.pen.nib;
        mutate((pg) => pg.strokes.push(s));
      }
      renderPreview();
      break;
    case 'shape':
      if (d.shape && Math.hypot(d.shape.x2 - d.shape.x1, d.shape.y2 - d.shape.y1) > 4) {
        mutate((pg) => pg.shapes.push({ ...d.shape, id: uid() }));
      }
      renderPreview();
      break;
    case 'erase':
      if (d.hit) { pushUndo(d.before); scheduleSave(); }
      break;
    case 'tres':
      if (snapshot() !== d.before) { pushUndo(d.before); scheduleSave(); }
      break;
    case 'scale':
      if (d.moved) {
        for (const w of page().wires) w.pts = simplify(w.pts);
        pushUndo(d.before);
        scheduleSave();
        render();
      }
      break;
    default:
  }
}
vp.addEventListener('pointerup', (e) => { if (!touchUp(e)) endDrag(); });
vp.addEventListener('pointercancel', (e) => { touchUp(e); endDrag(); });
// a finger lifted anywhere in the app (tool bar, panels) still counts as lifted
for (const t of ['pointerup', 'pointercancel']) {
  window.addEventListener(t, (e) => { if (e.pointerType === 'touch' && touches.has(e.pointerId) && !vp.contains(e.target)) touchUp(e); }, true);
}
vp.addEventListener('pointerleave', () => { S.cursorScreen = null; if (!S.drag) renderPreview(); });

vp.addEventListener('dblclick', (e) => {
  const tbox = e.target.closest('.tbox');
  if (tbox && S.tool === 'select') { startEdit(tbox.dataset.id, { x: e.clientX, y: e.clientY }); return; }
  const id = hitId(e);
  if (id && S.tool === 'select') {
    const f = find(id);
    if (f && f.k === 'comps') {
      showRight('inspector');
      const inp = $('#inspector [data-f="value"]');
      if (inp) { inp.focus(); inp.select(); }
    }
  } else if (!id && S.tool === 'select' && P.dblClickText) {
    const w = toWorld(e);
    addText(w.x, w.y - 12);
  }
});

vp.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = vp.getBoundingClientRect();
  const touchpadPan = !e.ctrlKey && e.deltaMode === 0 && (Math.abs(e.deltaX) > 0.5 || (Math.abs(e.deltaY) < 40 && !Number.isInteger(e.deltaY)));
  if (e.shiftKey && !e.ctrlKey) { S.view.x -= e.deltaY || e.deltaX; applyView(); return; }
  if (touchpadPan || (P.wheel === 'pan' && !e.ctrlKey)) { S.view.x -= e.deltaX; S.view.y -= e.deltaY; applyView(); scheduleSave(false); return; }
  const k = (e.ctrlKey ? 0.01 : 0.0015) * (P.zoomSpeed / 100) * (P.invertZoom ? -1 : 1);
  const factor = Math.exp(-e.deltaY * k);
  zoomAt(e.clientX - r.left, e.clientY - r.top, factor);
  scheduleSave(false);
}, { passive: false });

vp.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (S.tool !== 'select') return;
  const id = hitId(e);
  const w = toWorld(e);
  if (id) {
    if (!S.sel.has(id)) { S.sel = new Set([id]); render(); }
    const hasComp = selectedComps().length > 0;
    showMenu(e.clientX, e.clientY, [
      hasComp && { label: tr('menu.rotate'), kb: 'R', action: () => rotateSel() },
      hasComp && { label: tr('menu.mirror'), kb: 'X', action: () => rotateSel(true) },
      { label: tr('menu.duplicate'), kb: 'Ctrl+D', action: () => { copySel(); pasteInternal(); } },
      { label: tr('menu.copy'), kb: 'Ctrl+C', action: () => copySel() },
      '-',
      { label: tr('menu.delete'), kb: 'Del', danger: true, action: deleteSel },
    ]);
  } else {
    showMenu(e.clientX, e.clientY, [
      { label: tr('menu.addText'), kb: 'T', action: () => addText(w.x, w.y - 12) },
      S.clipboard && { label: tr('menu.paste'), kb: 'Ctrl+V', action: pasteInternal },
      { label: tr('menu.selectAll'), kb: 'Ctrl+A', action: selectAll },
      { label: tr('menu.fit'), kb: '0', action: () => fitView() },
    ]);
  }
});

// drag a part from the library onto the canvas
vp.addEventListener('dragover', (e) => {
  const t = e.dataTransfer.types;
  if (t.includes('text/ohm-symbol') || t.includes('Files')) e.preventDefault();
});
vp.addEventListener('drop', async (e) => {
  const img = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
  if (img) {
    e.preventDefault();
    const w = toWorld(e);
    addText(w.x, w.y, `<img src="${await imageToDataUrl(img)}" alt="">`, 320);
    return;
  }
  const sym = e.dataTransfer.getData('text/ohm-symbol');
  if (!sym || !SYMBOLS[sym]) return;
  e.preventDefault();
  setTool('select');
  S.placing = sym; S.placeRot = 0; S.placeFlip = false;
  placeAt(toWorld(e));
  S.placing = null;
});

function placeAt(w) {
  const d = SYMBOLS[S.placing];
  if (!d) return;
  mutate((pg) => {
    const c = {
      id: uid(), type: d.id, x: snap(w.x), y: snap(w.y), rot: S.placeRot, flip: S.placeFlip,
      ref: P.autoRef ? nextRef(d.prefix) : (d.prefix ? `${d.prefix}?` : ''), value: d.value, part: '', footprint: '', note: '', bom: d.bom,
    };
    initProps(c);
    pg.comps.push(c);
    S.sel = new Set([c.id]);
  });
}

function startMove(w) {
  const pg = page();
  const orig = {};
  const pinKeys = new Set();
  let gridded = false;
  for (const id of S.sel) {
    const f = find(id);
    if (!f) continue;
    orig[id] = { k: f.k, item: clone(f.item) };
    if (f.k === 'comps') { gridded = true; for (const p of pinsOf(f.item)) pinKeys.add(key([p.x, p.y])); }
    if (f.k === 'wires') gridded = true;
  }
  const attach = [];
  for (const wr of pg.wires) {
    if (S.sel.has(wr.id) || wr.pts.length < 2) continue;
    const a = pinKeys.has(key(wr.pts[0])), b = pinKeys.has(key(wr.pts[wr.pts.length - 1]));
    if (a || b) attach.push({ id: wr.id, pts: clone(wr.pts), a, b });
  }
  S.drag = { type: 'move', start: w, before: snapshot(), orig, attach, gridded, dx: 0, dy: 0, moved: false };
}
function doMove(w) {
  const d = S.drag;
  let dx = w.x - d.start.x, dy = w.y - d.start.y;
  if (d.gridded) { dx = snap(dx); dy = snap(dy); } else { dx = r1(dx); dy = r1(dy); }
  if (dx === d.dx && dy === d.dy) return;
  d.dx = dx; d.dy = dy; d.moved = true;
  for (const [id, o] of Object.entries(d.orig)) {
    const f = find(id);
    if (!f) continue;
    const it = clone(o.item);
    translateItem(o.k, it, dx, dy);
    Object.assign(f.item, it);
  }
  for (const a of d.attach) {
    const f = find(a.id);
    if (f) f.item.pts = dragEnd(a.pts, a.a, a.b, dx, dy);
  }
  render();
}

// ---------------------------------------------------------------- resizing
// Everything selected scales around an anchor point: parts get bigger (their pins move and attached
// wires follow), wires/sketches/shapes scale with them, text boxes grow their text and images.
function scaleState(anchor) {
  const pg = page();
  const orig = {};
  const pinKeys = new Set();
  for (const id of S.sel) {
    const f = find(id);
    if (!f) continue;
    orig[id] = { k: f.k, item: clone(f.item) };
    if (f.k === 'comps') for (const p of pinsOf(f.item)) pinKeys.add(key([p.x, p.y]));
  }
  const attach = pg.wires.filter((w) => !S.sel.has(w.id) && w.pts.length > 1 && (pinKeys.has(key(w.pts[0])) || pinKeys.has(key(w.pts[w.pts.length - 1]))))
    .map((w) => ({ id: w.id, pts: clone(w.pts) }));
  return { A: anchor, orig, attach, before: snapshot(), k: 1 };
}
function applyScale(d, k) {
  const pg = page();
  const sc = (p) => [r1(d.A[0] + (p[0] - d.A[0]) * k), r1(d.A[1] + (p[1] - d.A[1]) * k)];
  const oldPins = [], newPins = [];
  for (const [id, o] of Object.entries(d.orig)) {
    const f = find(id);
    if (!f) continue;
    const it = clone(o.item);
    if (o.k === 'comps') {
      [it.x, it.y] = sc([it.x, it.y]);
      it.s = Math.round(clamp((o.item.s || 1) * k, 0.2, 10) * 1000) / 1000;
      oldPins.push(...pinsOf(o.item));
      newPins.push(...pinsOf(it));
    } else if (o.k === 'wires') it.pts = it.pts.map(sc);
    else if (o.k === 'strokes') { it.pts = it.pts.map((p) => [...sc(p), ...p.slice(2)]); it.width = r1(Math.max(0.3, o.item.width * k)); }
    else if (o.k === 'shapes') { [it.x1, it.y1] = sc([it.x1, it.y1]); [it.x2, it.y2] = sc([it.x2, it.y2]); it.width = r1(Math.max(0.3, o.item.width * k)); }
    else if (o.k === 'images') { [it.x, it.y] = sc([it.x, it.y]); it.w = r1(o.item.w * k); it.h = r1(o.item.h * k); }
    else if (o.k === 'texts') { [it.x, it.y] = sc([it.x, it.y]); it.w = Math.max(30, Math.round(o.item.w * k)); it.z = Math.round((o.item.z || 1) * k * 1000) / 1000; }
    Object.assign(f.item, it);
  }
  // wires that were selected too: put their ends exactly onto the moved pins
  const pins = newPins.map((p) => [p.x, p.y]);
  for (const id of Object.keys(d.orig)) {
    const f = find(id);
    if (!f || f.k !== 'wires') continue;
    for (const e of [0, f.item.pts.length - 1]) {
      const q = f.item.pts[e];
      const m = pins.find((p) => Math.abs(p[0] - q[0]) < 0.6 && Math.abs(p[1] - q[1]) < 0.6);
      if (m) f.item.pts[e] = [m[0], m[1]];
    }
  }
  // wires outside the selection that were plugged into a resized part follow its pins
  for (const a of d.attach) { const f = find(a.id); if (f) f.item.pts = clone(a.pts); }
  if (oldPins.length) reconnect(pg, oldPins, newPins, S.sel);
}
function startScale(h) {
  const b = selBox();
  if (!b) return;
  const c = { nw: [b.x1, b.y1], ne: [b.x2, b.y1], sw: [b.x1, b.y2], se: [b.x2, b.y2] };
  const opp = { nw: 'se', ne: 'sw', sw: 'ne', se: 'nw' };
  S.drag = { type: 'scale', ...scaleState(c[opp[h]]), H0: c[h] };
}
function doScale(w, e) {
  const d = S.drag;
  const v = [d.H0[0] - d.A[0], d.H0[1] - d.A[1]];
  const len2 = v[0] * v[0] + v[1] * v[1] || 1;
  let k = ((w.x - d.A[0]) * v[0] + (w.y - d.A[1]) * v[1]) / len2;
  k = e.shiftKey ? Math.max(0.25, Math.round(k * 4) / 4) : Math.max(0.05, Math.round(k * 20) / 20);
  if (k === d.k) return;
  d.k = k;
  d.moved = true;
  applyScale(d, k);
  render();
  $('#st-pos').textContent = `${Math.round(k * 100)}%`;
}
// Size buttons / field: scale the selection around its centre.
function scaleSelection(k) {
  const b = selBox();
  if (!b || !(k > 0) || k === 1) return;
  const d = scaleState([r1((b.x1 + b.x2) / 2), r1((b.y1 + b.y2) / 2)]);
  mutate(() => applyScale(d, k));
}

// The eraser covers the whole path since the last pointer event, with a small radius: a quick swipe
// gives samples several pixels apart, which would otherwise jump right over a thin pen line.
const ERASE_R = 6;
const ERASE_RING = [[0, 0], [ERASE_R, 0], [-ERASE_R, 0], [0, ERASE_R], [0, -ERASE_R]];
function eraseAt(e) {
  const ids = new Set();
  const d = S.drag;
  const to = { x: e.clientX, y: e.clientY };
  const from = d && d.last ? d.last : to;
  if (d) d.last = to;
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 3));
  for (let i = 0; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    for (const [ox, oy] of ERASE_RING) {
      for (const el of document.elementsFromPoint(x + ox, y + oy)) {
        const g = el.closest('.stroke, .shape');
        if (g && g.dataset.id) ids.add(g.dataset.id);
      }
    }
  }
  if (!ids.size) return;
  const pg = page();
  pg.strokes = pg.strokes.filter((s) => !ids.has(s.id));
  pg.shapes = pg.shapes.filter((s) => !ids.has(s.id));
  S.drag.hit = true;
  render();
}

function selectAll() {
  const pg = page();
  S.sel = new Set(KINDS.flatMap((k) => pg[k].map((o) => o.id)));
  render();
}

// ---------------------------------------------------------------- keyboard
function isTyping() {
  const a = document.activeElement;
  return a && (a.isContentEditable || a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
}
document.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (ctrl && k === 's') { e.preventDefault(); flushSave(); toast(tr('save.saved')); return; }
  if (bookOpen()) { bookKey(e); return; }
  if (fmOpen()) { fmKey(e); return; }
  if (scOpen() && e.key === 'Escape' && !isTyping()) { $('[data-sc="close"]').click(); return; }
  if (ctrl && e.key === ',') { e.preventDefault(); if (settingsOpen()) closeModal(); else openSettings(); return; }
  if (ctrl && k === 'n') {
    e.preventDefault();
    if (S.editing) endEdit();
    closeModal();
    if (e.shiftKey) createProject(); else addPage();
    return;
  }
  stopWriteIn();
  if (isTyping()) {
    if (e.key === 'Escape') {
      if (S.editing) endEdit(); else document.activeElement.blur();
    }
    return;
  }
  if (!$('#modal').classList.contains('hidden')) { if (e.key === 'Escape') closeModal(); return; }

  if (ctrl) {
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    else if (k === 'c') { if (copySel()) { e.preventDefault(); toast(tr('toast.copied', { n: S.clipboard.length })); } }
    else if (k === 'x') { if (copySel()) { e.preventDefault(); deleteSel(); } }
    else if (k === 'd') { e.preventDefault(); if (copySel()) pasteInternal(); }
    else if (k === 'a') { e.preventDefault(); selectAll(); }
    return;
  }
  if (e.key === ' ') {
    if (!S.space) { S.space = true; document.body.classList.add('space-pan'); }
    e.preventDefault();
    return;
  }
  switch (e.key) {
    case 'Escape':
      hideMenu();
      if (S.draft) finishWire();
      else if (S.tool !== 'select') setTool('select');
      else if (S.sel.size) { S.sel.clear(); render(); }
      return;
    case 'Delete': case 'Backspace': deleteSel(); return;
    case '+': case '=': zoomCenter(1.2); return;
    case '-': case '_': zoomCenter(1 / 1.2); return;
    case '0': case 'Home': fitView(); return;
    case '/': e.preventDefault(); $('#lib-search').focus(); return;
    case '[': document.body.classList.toggle('left-collapsed'); return;
    case ']': toggleRight(); return;
    default:
  }
  const map = { v: 'select', h: 'hand', w: 'wire', p: 'pen', s: 'shape', t: 'text', e: 'eraser' };
  if (map[k]) { setTool(map[k]); return; }
  if (k === 'r') rotateSel();
  else if (k === 'x') rotateSel(true);
  else if (k === 'b') openBom();
  else if (k === 'k') { e.preventDefault(); openCalc(); }
  else if (e.key.startsWith('Arrow') && S.sel.size) {
    e.preventDefault();
    const step = e.shiftKey ? P.nudge * 5 : P.nudge;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    startMove({ x: 0, y: 0 });
    S.drag.gridded = true;
    doMove({ x: dx, y: dy });
    endDrag();
  }
});
document.addEventListener('keyup', (e) => {
  if (e.key === ' ') { S.space = false; document.body.classList.remove('space-pan'); }
});

// ---------------------------------------------------------------- paste
document.addEventListener('paste', async (e) => {
  const target = activeEditable();
  const file = imageFromClipboard(e.clipboardData);
  if (target) {
    e.preventDefault();
    if (file) {
      const url = await imageToDataUrl(file);
      document.execCommand('insertHTML', false, `<img src="${url}" alt="">`);
    } else {
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    }
    return;
  }
  if (isTyping()) return; // plain inputs handle their own paste
  e.preventDefault();
  if (file) {
    const url = await imageToDataUrl(file);
    const c = S.cursorScreen ? S.cursor : centerWorld();
    addText(c.x, c.y, `<img src="${url}" alt="">`, 320);
  } else if (S.clipboard) {
    pasteInternal();
  } else {
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      const c = S.cursorScreen ? S.cursor : centerWorld();
      addText(c.x, c.y, `<p>${esc(text).replace(/\n/g, '<br>')}</p>`);
    }
  }
});
function centerWorld() {
  const r = vp.getBoundingClientRect();
  return { x: (r.width / 2 - S.view.x) / S.view.z, y: (r.height / 2 - S.view.y) / S.view.z };
}

// ---------------------------------------------------------------- rich-text toolbar
document.execCommand('styleWithCSS', false, true);
$('#fmt').addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
$('#fmt').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-cmd]');
  if (!b) return;
  const ed = activeEditable();
  if (!ed) { toast(tr('toast.clickText')); return; }
  const { cmd, val } = b.dataset;
  if (cmd === 'chars') {
    const r = b.getBoundingClientRect();
    showMenu(r.left, r.bottom + 6, CHARS.map((ch) => ({ label: ch, action: () => document.execCommand('insertText', false, ch) })), 'chars');
    return;
  }
  if (cmd === 'code') {
    const text = window.getSelection().toString() || 'code';
    document.execCommand('insertHTML', false, `<code>${esc(text)}</code>&#8203;`);
    return;
  }
  document.execCommand(cmd, false, val || null);
});
document.addEventListener('focusin', () => renderToolOptions());
document.addEventListener('focusout', (e) => {
  if (S.editing && e.target.closest && e.target.closest('.tbox')) {
    setTimeout(() => { if (S.editing && !activeEditable()) endEdit(); }, 0);
  }
  setTimeout(renderToolOptions, 0);
});
$('#texts').addEventListener('input', () => { if (S.editing) setSaveState('editing'); });

// tool options (pen/shape color, width, kind). Pressing a button must not take focus: a focus change
// redraws this bar, which used to replace the button under the mouse and swallow the click.
$('#tool-options').addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
$('#tool-options').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.color) S.pen.color = b.dataset.color;
  if (b.dataset.width) S.pen.width = +b.dataset.width;
  if (b.dataset.nib) S.pen.nib = b.dataset.nib;
  if (b.dataset.shape) S.shapeKind = b.dataset.shape;
  if (P.rememberPen && (b.dataset.color || b.dataset.width || b.dataset.nib)) {
    Object.assign(P, { penColor: S.pen.color, penWidth: S.pen.width, nib: S.pen.nib });
    savePrefsSoon();
  }
  applyPenCursor();
  fxRegion();
  renderToolOptions();
});

// ---------------------------------------------------------------- inspector
function renderInspector(force = false) {
  const box = $('#inspector');
  const pg = page();
  const ids = [...S.sel];
  const single = ids.length === 1 ? find(ids[0]) : null;
  const sig = ids.join('|') + (single ? JSON.stringify(single.item) : '') + `|${pg.id}|${pg.comps.length}|${pg.wires.length}|${pg.strokes.length}|${pg.texts.length}`;
  if (!force && sig === S.inspSig) return;
  if (!force && box.contains(document.activeElement)) return;
  S.inspSig = sig;

  if (single && single.k === 'comps') {
    const c = single.item, d = SYMBOLS[c.type];
    const pins = pinsOf(c).map((p) => `<code>${esc(p.name)}</code>`).join('');
    const isNet = !d.bom;
    box.innerHTML = `
      <div class="insp-head"><div class="prev">${symbolPreview(d)}</div>
        <div><div class="insp-title">${esc(c.ref || c.value)}</div><div class="muted">${esc(symName(d))}</div></div></div>
      ${isNet ? '' : `<label class="field"><span>${tr('insp.ref')}</span><input type="text" class="mono" data-f="ref" value="${esc(c.ref)}"></label>`}
      <label class="field"><span>${tr(isNet ? 'insp.net' : 'insp.value')}</span><input type="text" class="mono" data-f="value" value="${esc(c.value)}"></label>
      ${propsHTML(c)}
      <div class="field"><span>${tr('insp.size')}</span><div class="qty">
        <button class="btn sm" data-act="smaller" title="${esc(tr('insp.smaller'))}">−</button>
        <input type="text" class="mono" data-size value="${Math.round((c.s || 1) * 100)}%">
        <button class="btn sm" data-act="bigger" title="${esc(tr('insp.bigger'))}">+</button></div></div>
      ${isNet ? '' : `
      <label class="field"><span>${tr('insp.part')}</span><input type="text" data-f="part" value="${esc(c.part)}" placeholder="${esc(tr('insp.partPh'))}"></label>
      <label class="field"><span>${tr('insp.footprint')}</span><input type="text" data-f="footprint" value="${esc(c.footprint)}" placeholder="${esc(tr('insp.footprintPh'))}"></label>
      <label class="field"><span>${tr('insp.notes')}</span><textarea data-f="note" placeholder="${esc(tr('insp.notesPh'))}">${esc(c.note)}</textarea></label>
      <label class="check"><input type="checkbox" data-f="bom" ${c.bom !== false ? 'checked' : ''}> ${tr('insp.inBom')}</label>`}
      <div class="btn-row">
        <button class="btn" data-act="rot">${tr('insp.rotate')} <kbd class="k">R</kbd></button>
        <button class="btn" data-act="flip">${tr('insp.mirror')} <kbd class="k">X</kbd></button>
        <button class="btn danger" data-act="del">${tr('insp.delete')}</button>
      </div>
      <div class="pinlist">${tr('insp.pins')}<br>${pins}</div>`;
    return;
  }

  const kinds = ids.map((id) => find(id)).filter(Boolean);
  const drawn = kinds.filter((f) => f.k === 'strokes' || f.k === 'shapes');
  if (kinds.length) {
    const counts = {};
    for (const f of kinds) counts[f.k] = (counts[f.k] || 0) + 1;
    let h = `<p class="insp-h">${tr('insp.selection')}</p><div class="stat-grid">${Object.entries(counts).map(([k, n]) =>
      `<div class="stat"><b>${n}</b><span>${tr(`k.${k}`)}</span></div>`).join('')}</div>`;
    if (drawn.length) {
      const cur = drawn[0].item;
      h += `<p class="insp-h">${tr('insp.color')}</p><div class="swatches">${inkColors().map((c) =>
        `<button data-scolor="${c}" class="${cur.color === c ? 'on' : ''}" style="background:${c === 'ink' ? 'var(--ink)' : c}" title="${c}"></button>`).join('')}</div>`;
      h += `<p class="insp-h">${tr('insp.width')}</p><div class="btn-row" style="margin-bottom:14px">${WIDTHS.map((w) =>
        `<button class="btn ${cur.width === w ? 'primary' : ''}" data-swidth="${w}">${w}</button>`).join('')}</div>`;
      const st = drawn.find((f) => f.k === 'strokes');
      if (st) {
        h += `<p class="insp-h">${tr('insp.nib')}</p><div class="btn-row" style="margin-bottom:14px">${NIBS.map(([k, l, svg]) =>
          `<button class="btn icon ${(st.item.nib || 'round') === k ? 'primary' : ''}" data-snib="${k}" title="${esc(L2(l))}"><svg viewBox="0 0 20 20">${svg}</svg></button>`).join('')}</div>`;
      }
    }
    const z1 = kinds.length === 1 && kinds[0].k === 'texts' ? Math.round((kinds[0].item.z || 1) * 100) : null;
    h += `<p class="insp-h">${tr('insp.size')}</p><div class="btn-row" style="margin-bottom:14px;align-items:center">
      <button class="btn" data-act="smaller">− ${tr('insp.smaller')}</button><button class="btn" data-act="bigger">+ ${tr('insp.bigger')}</button>
      ${z1 ? `<span class="muted mono small">${z1}%</span>` : ''}</div>
      <p class="muted small" style="margin:-6px 0 14px">${tr('hint.resize')}</p>`;
    h += `<div class="btn-row">${kinds.some((f) => f.k === 'comps') ? `<button class="btn" data-act="rot">${tr('insp.rotate')}</button>` : ''}
      <button class="btn" data-act="dup">${tr('insp.duplicate')}</button><button class="btn danger" data-act="del">${tr('insp.delete')}</button></div>`;
    box.innerHTML = h;
    return;
  }

  const parts = pg.comps.filter((c) => SYMBOLS[c.type].bom).length;
  box.innerHTML = `
    <p class="insp-h">${tr('insp.thisPage')}</p>
    <div class="stat-grid">
      <div class="stat"><b>${parts}</b><span>${tr('k.comps')}</span></div>
      <div class="stat"><b>${pg.wires.length}</b><span>${tr('k.wires')}</span></div>
      <div class="stat"><b>${pg.strokes.length + pg.shapes.length}</b><span>${tr('k.sketches')}</span></div>
      <div class="stat"><b>${pg.texts.length}</b><span>${tr('k.texts')}</span></div>
    </div>
    <p class="insp-h">${tr('insp.shortcuts')}</p>
    <table class="keys">
      <tr><td>${tr('sc.select')}</td><td><kbd class="k">V</kbd></td></tr>
      <tr><td>${tr('sc.wire')}</td><td><kbd class="k">W</kbd></td></tr>
      <tr><td>${tr('sc.draw')}</td><td><kbd class="k">P</kbd> <kbd class="k">S</kbd> <kbd class="k">T</kbd></td></tr>
      <tr><td>${tr('sc.eraser')}</td><td><kbd class="k">E</kbd> <kbd class="k">H</kbd></td></tr>
      <tr><td>${tr('sc.rotate')}</td><td><kbd class="k">R</kbd> <kbd class="k">X</kbd></td></tr>
      <tr><td>${tr('sc.dup')}</td><td><kbd class="k">Ctrl</kbd>+<kbd class="k">D</kbd></td></tr>
      <tr><td>${tr('sc.search')}</td><td><kbd class="k">/</kbd></td></tr>
      <tr><td>${tr('sc.bom')}</td><td><kbd class="k">B</kbd></td></tr>
      <tr><td>${tr('sc.calc')}</td><td><kbd class="k">K</kbd></td></tr>
      <tr><td>${tr('sc.pan')}</td><td><kbd class="k">${tr('sc.space')}</kbd>${tr('sc.drag')}</td></tr>
      <tr><td>${tr('sc.fit')}</td><td><kbd class="k">0</kbd></td></tr>
      <tr><td>${tr('sc.panels')}</td><td><kbd class="k">[</kbd> <kbd class="k">]</kbd></td></tr>
      <tr><td>${tr('sc.newPage')}</td><td><kbd class="k">Ctrl</kbd>+<kbd class="k">N</kbd></td></tr>
      <tr><td>${tr('sc.newProject')}</td><td><kbd class="k">Ctrl</kbd>+<kbd class="k">Shift</kbd>+<kbd class="k">N</kbd></td></tr>
      <tr><td>${tr('sc.settings')}</td><td><kbd class="k">Ctrl</kbd>+<kbd class="k">,</kbd></td></tr>
    </table>
    <p class="muted small" style="margin-top:14px">${tr('insp.tip')}</p>`;
}

// ---- part properties (resistance, tolerance, voltage…)
const DL_RANGE = { 'Ω': [1, 1e7], F: [1e-12, 1e-2], H: [1e-9, 1] };
function ensureDatalist(series, unit) {
  const id = `dl-${series}-${unit === 'Ω' ? 'ohm' : unit}`;
  if (!document.getElementById(id) && DL_RANGE[unit]) {
    const dl = document.createElement('datalist');
    dl.id = id;
    dl.innerHTML = eValues(series, ...DL_RANGE[unit]).map((v) => `<option value="${fmtNum(v)}">`).join('');
    document.body.appendChild(dl);
  }
  return id;
}
function propsHTML(c) {
  const defs = propDefs(c);
  if (!defs.length) return '';
  let h = `<p class="insp-h" style="margin-top:14px">${tr('insp.props')}</p>`;
  for (const f of defs) {
    const v = propVal(c, f.k);
    let ctl;
    if (f.type === 'qty') {
      const list = f.series && DL_RANGE[f.unit] ? ` list="${ensureDatalist(f.series, f.unit)}"` : '';
      ctl = `<div class="qty"><input type="text" class="mono" data-prop="${f.k}" value="${esc(fmtNum(v))}"${list} spellcheck="false"><em>${esc(f.unit)}</em>
        ${f.series ? `<button class="btn sm" data-pstep="${f.k}" data-dir="-1" title="${esc(tr('insp.stepDown'))}">−</button><button class="btn sm" data-pstep="${f.k}" data-dir="1" title="${esc(tr('insp.stepUp'))}">+</button>` : ''}</div>`;
    } else if (f.type === 'sel') {
      ctl = `<select class="sel" data-prop="${f.k}">${f.opts.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? 'selected' : ''}>${esc(L2(l))}</option>`).join('')}</select>`;
    } else if (f.type === 'num') {
      ctl = `<div class="qty"><input type="number" data-prop="${f.k}" value="${esc(v)}"><em>${esc(f.unit || '')}</em></div>`;
    } else ctl = `<input type="text" data-prop="${f.k}" value="${esc(v)}">`;
    h += `<label class="field"><span>${esc(L2(f.l))}</span>${ctl}</label>`;
  }
  if (c.type === 'resistor' || c.type === 'resistor_iec') h += bandsSVG(propVal(c, 'r'), propVal(c, 'tol'), +propVal(c, 'bands'));
  if (c.type === 'led') {
    const vs = propVal(c, 'supply'), vf = propVal(c, 'vf'), i = propVal(c, 'if');
    const r = (vs - vf) / i;
    if (r > 0 && Number.isFinite(r)) {
      h += `<div class="calc"><b>${tr('insp.ledR')}</b><br>(${fmtQty(vs, 'V', 'unit')} − ${fmtQty(vf, 'V', 'unit')}) ÷ ${fmtQty(i, 'A', 'unit')} = ${fmtQty(r, 'Ω', 'unit')}
        <br>${tr('insp.ledNearest')}: <b>${fmtQty(eNearest(r, 'E12'), 'Ω', 'unit')}</b> · ${fmtQty((vs - vf) * i, 'W', 'unit')}</div>`;
    }
  }
  return h;
}
function setPartProp(id, k, raw) {
  const c = find(id)?.item;
  if (!c) return;
  const f = propDefs(c).find((d) => d.k === k);
  if (!f) return;
  let v = typeof raw === 'string' ? raw.trim() : raw;
  if (f.type === 'qty' && typeof v === 'string') {
    v = parseQty(v);
    if (v == null) { toast(tr('toast.badValue'), true); renderInspector(true); return; }
  }
  if (f.type === 'num') v = Number(v) || 0;
  mutate(() => {
    c.props ||= {};
    for (const d of propDefs(c)) if (c.props[d.k] === undefined) c.props[d.k] = propVal(c, d.k);
    c.props[k] = v;
    if (c.type === 'led' && k === 'color' && LED_VF[v]) c.props.vf = LED_VF[v];
    if (!c.valueLock) { const s = partSummary(c); if (s) c.value = s; }
  });
  renderInspector(true);
}

$('#inspector').addEventListener('change', (e) => {
  if (S.sel.size !== 1) return;
  const id = [...S.sel][0];
  if (e.target.dataset.prop) { setPartProp(id, e.target.dataset.prop, e.target.value); return; }
  if (e.target.dataset.size !== undefined) {
    const n = parseFloat(e.target.value);
    const c = find(id)?.item;
    if (c && n > 0) scaleSelection(clamp(n / 100, 0.2, 10) / (c.s || 1));
    renderInspector(true);
    return;
  }
  const f = e.target.dataset.f;
  if (!f) return;
  mutate(() => {
    const it = find(id)?.item;
    if (!it) return;
    it[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value.trim();
    if (f === 'value' && find(id).k === 'comps') {
      // typing a value updates the matching property (e.g. "4k7" → 4.7 kΩ); anything else is kept as typed
      const prim = propDefs(it).filter((d) => d.primary);
      it.valueLock = false;
      if (!it.value) { const s = partSummary(it); if (s) it.value = s; }
      else if (prim.length === 1) {
        const p = prim[0];
        let v = null;
        if (p.type === 'qty') v = parseQty(it.value);
        else if (p.type === 'sel') { const o = p.opts.find((x) => [x[0], ...[].concat(x[1])].some((l) => String(l).toLowerCase() === it.value.toLowerCase())); v = o ? o[0] : null; }
        else v = it.value;
        if (v != null) {
          it.props ||= {};
          for (const d of propDefs(it)) if (it.props[d.k] === undefined) it.props[d.k] = propVal(it, d.k);
          it.props[p.k] = v;
          it.value = partSummary(it);
        } else it.valueLock = true;
      } else if (prim.length) it.valueLock = it.value !== partSummary(it);
    }
  });
  renderInspector(true);
});
$('#inspector').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur();
});
$('#inspector').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.act === 'rot') rotateSel();
  if (b.dataset.act === 'flip') rotateSel(true);
  if (b.dataset.act === 'del') deleteSel();
  if (b.dataset.act === 'dup') { copySel(); pasteInternal(); }
  if (b.dataset.act === 'smaller') { scaleSelection(0.8); renderInspector(true); }
  if (b.dataset.act === 'bigger') { scaleSelection(1.25); renderInspector(true); }
  if (b.dataset.pstep && S.sel.size === 1) {
    const id = [...S.sel][0];
    const c = find(id)?.item;
    const f = c && propDefs(c).find((d) => d.k === b.dataset.pstep);
    if (f) setPartProp(id, f.k, eStep(propVal(c, f.k), +b.dataset.dir, f.series));
  }
  if (b.dataset.snib) {
    mutate((pg) => {
      for (const s of pg.strokes) {
        if (!S.sel.has(s.id)) continue;
        if (b.dataset.snib === 'round') delete s.nib; else s.nib = b.dataset.snib;
      }
    });
    fxRegion();
    renderInspector(true);
  }
  if (b.dataset.scolor || b.dataset.swidth) {
    mutate((pg) => {
      for (const k of ['strokes', 'shapes']) for (const it of pg[k]) {
        if (!S.sel.has(it.id)) continue;
        if (b.dataset.scolor) it.color = b.dataset.scolor;
        if (b.dataset.swidth) it.width = +b.dataset.swidth;
      }
    });
    renderInspector(true);
  }
});

// ---------------------------------------------------------------- right panel / notes
function showRight(tab) {
  if (isPhone()) { document.body.classList.remove('drawer-left'); document.body.classList.add('drawer-right'); }
  document.body.classList.remove('right-collapsed');
  $$('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#inspector').classList.toggle('on', tab === 'inspector');
  $('#notes-pane').classList.toggle('on', tab === 'notes');
  $('#calc-pane').classList.toggle('on', tab === 'calc');
  if (tab === 'calc' && typeof renderCalc === 'function' && !$('#calc-pane').childElementCount) renderCalc();
}
// phones: the side panels are drawers that slide over the page
function closeDrawers() { document.body.classList.remove('drawer-left', 'drawer-right'); }
function toggleDrawer(side) {
  const cls = `drawer-${side}`, open = !document.body.classList.contains(cls);
  closeDrawers();
  document.body.classList.toggle(cls, open);
}
function toggleRight() {
  if (isPhone()) { toggleDrawer('right'); return; }
  document.body.classList.toggle('right-collapsed');
  api.setSettings({ rightCollapsed: document.body.classList.contains('right-collapsed') });
}
$$('.tabs button').forEach((b) => b.addEventListener('click', () => showRight(b.dataset.tab)));

let notesTimer = null;
$('#notes').addEventListener('input', () => {
  const pg = page();
  clearTimeout(notesTimer);
  setSaveState('saving');
  notesTimer = setTimeout(() => {
    const el = $('#notes');
    if (!el.textContent.trim() && !el.querySelector('img')) el.innerHTML = '';
    pg.notes = sanitize(el.innerHTML);
    scheduleSave();
  }, 350);
});

// ---------------------------------------------------------------- library
function buildLibrary() {
  const q = $('#lib-search').value.trim().toLowerCase();
  const list = Object.values(SYMBOLS).filter((d) =>
    !q || `${d.name} ${symName(d)} ${d.id} ${d.prefix} ${d.cat} ${catName(d.cat)} ${d.value}`.toLowerCase().includes(q));
  let h = '';
  for (const cat of SYMBOL_CATEGORIES) {
    const items = list.filter((d) => d.cat === cat);
    if (!items.length) continue;
    h += `<div class="lib-cat">${esc(catName(cat))}</div><div class="lib-grid">${items.map((d) =>
      `<div class="tile ${S.placing === d.id ? 'on' : ''}" data-sym="${d.id}" draggable="true" title="${esc(symName(d))}">${symbolPreview(d, 4)}<span>${esc(symName(d))}</span></div>`).join('')}</div>`;
  }
  $('#lib').innerHTML = h || `<div class="empty">${tr('lib.none')}</div>`;
}
$('#lib-search').addEventListener('input', buildLibrary);
$('#lib-search').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.target.value = ''; buildLibrary(); e.target.blur(); }
  if (e.key === 'Enter') { const t = $('.tile'); if (t) { setTool('place', t.dataset.sym); e.target.blur(); } }
});
$('#lib').addEventListener('click', (e) => {
  const t = e.target.closest('.tile');
  if (!t) return;
  if (S.tool === 'place' && S.placing === t.dataset.sym) setTool('select');
  else { setTool('place', t.dataset.sym); if (isPhone()) closeDrawers(); }
});
$('#lib').addEventListener('dragstart', (e) => {
  const t = e.target.closest('.tile');
  if (t) e.dataTransfer.setData('text/ohm-symbol', t.dataset.sym);
});

// ---------------------------------------------------------------- projects sidebar
async function refreshProjects() {
  S.projects = await api.listProjects();
  renderProjects();
}
function renderProjects() {
  const list = $('#project-list');
  const cur = S.project;
  const entries = S.projects.map((p) => (cur && p.id === cur.id ? { id: cur.id, name: cur.name } : p));
  if (cur && !entries.some((p) => p.id === cur.id)) entries.unshift({ id: cur.id, name: cur.name });
  list.innerHTML = entries.map((p) => {
    const active = cur && p.id === cur.id;
    let h = `<div class="proj ${active ? 'active' : ''}" data-proj="${p.id}">
      <span class="chev">${active ? '▾' : '▸'}</span><span class="name">${esc(p.name)}</span>
      <button class="more" data-more-proj="${p.id}" title="${tr('proj.actions')}">⋯</button></div>`;
    if (active) {
      h += cur.pages.map((pg) => `<div class="pg ${pg.id === S.pageId ? 'active' : ''}" data-page="${pg.id}">
        <span class="pdot"></span><span class="name">${esc(pg.name)}</span>
        <button class="more" data-more-page="${pg.id}" title="${tr('page.actions')}">⋯</button></div>`).join('');
      h += `<div class="add-page" data-add-page>${tr('page.add')}</div>`;
    }
    return h;
  }).join('');
}

$('#project-list').addEventListener('click', async (e) => {
  const morePg = e.target.closest('[data-more-page]');
  const morePj = e.target.closest('[data-more-proj]');
  if (morePg) { e.stopPropagation(); pageMenu(morePg.dataset.morePage, morePg); return; }
  if (morePj) { e.stopPropagation(); projectMenu(morePj.dataset.moreProj, morePj); return; }
  if (e.target.closest('[data-add-page]')) { addPage(); return; }
  const pg = e.target.closest('[data-page]');
  if (pg) { switchPage(pg.dataset.page); return; }
  const pj = e.target.closest('[data-proj]');
  if (pj && pj.dataset.proj !== S.project?.id) openProject(pj.dataset.proj);
});
$('#project-list').addEventListener('dblclick', (e) => {
  const pg = e.target.closest('[data-page]');
  if (pg) { renameInline(pg, page().name, (n) => renamePage(pg.dataset.page, n)); return; }
  const pj = e.target.closest('[data-proj]');
  if (pj && pj.dataset.proj === S.project.id) renameInline(pj, S.project.name, renameProject);
});
$('#project-list').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const pg = e.target.closest('[data-page]');
  const pj = e.target.closest('[data-proj]');
  if (pg) pageMenu(pg.dataset.page, null, e);
  else if (pj) projectMenu(pj.dataset.proj, null, e);
});

function renameInline(row, current, commit) {
  const nameEl = row.querySelector('.name');
  const inp = document.createElement('input');
  inp.className = 'rename-input';
  inp.value = current;
  nameEl.replaceWith(inp);
  inp.focus();
  inp.select();
  let done = false;
  const finish = (ok) => {
    if (done) return;
    done = true;
    const v = inp.value.trim();
    if (ok && v && v !== current) commit(v); else renderProjects();
  };
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
    e.stopPropagation();
  });
  inp.addEventListener('blur', () => finish(true));
}
function renameProject(name) {
  S.project.name = name;
  scheduleSave();
  renderProjects();
  renderStatus();
}
function renamePage(id, name) {
  const pg = S.project.pages.find((p) => p.id === id);
  if (pg) pg.name = name;
  scheduleSave();
  renderProjects();
  renderStatus();
}

function projectMenu(id, anchor, ev) {
  const pos = anchor ? anchor.getBoundingClientRect() : { left: ev.clientX, bottom: ev.clientY };
  const isCur = id === S.project.id;
  showMenu(pos.left, pos.bottom + 4, [
    !isCur && { label: tr('menu.open'), action: () => openProject(id) },
    isCur && { label: tr('menu.rename'), action: () => renameInline($(`[data-proj="${id}"]`), S.project.name, renameProject) },
    isCur && { label: tr('menu.addPage'), action: addPage },
    isCur && { label: tr('menu.exportProject'), action: exportProject },
    isCur && { label: L2(BKT.read), action: () => openBook() },
    isCur && { label: L2(BKT.scan), action: openScan },
    '-',
    { label: tr('menu.deleteProject'), danger: true, action: () => deleteProject(id) },
  ]);
}
function pageMenu(id, anchor, ev) {
  const pos = anchor ? anchor.getBoundingClientRect() : { left: ev.clientX, bottom: ev.clientY };
  showMenu(pos.left, pos.bottom + 4, [
    { label: tr('menu.rename'), action: () => { const row = $(`[data-page="${id}"]`); renameInline(row, S.project.pages.find((p) => p.id === id).name, (n) => renamePage(id, n)); } },
    { label: tr('menu.dupPage'), action: () => duplicatePage(id) },
    { label: tr('menu.up'), action: () => movePage(id, -1) },
    { label: tr('menu.down'), action: () => movePage(id, 1) },
    '-',
    { label: tr('menu.deletePage'), danger: true, action: () => deletePage(id) },
  ]);
}

async function createProject() {
  await flushSave();
  const p = newProject(tr('name.project', { n: S.projects.length + 1 }));
  await api.saveProject(p);
  await refreshProjects();
  await openProject(p.id);
  setTimeout(() => renameInline($(`[data-proj="${p.id}"]`), p.name, renameProject), 50);
}
async function openProject(id) {
  endEdit();
  if (S.draft) finishWire();
  await flushSave();
  const p = await api.loadProject(id);
  if (!p) { toast(tr('toast.cantOpen')); await refreshProjects(); return; }
  S.project = normalizeProject(p);
  S.hist = {};
  api.setSettings({ lastProject: id });
  loadPage(p.lastPage && p.pages.some((x) => x.id === p.lastPage) ? p.lastPage : p.pages[0].id);
  renderProjects();
}

// "Write the page in": items appear one after another as if a pen were drawing them.
let writeInTimer = null;
function startWriteIn() {
  stopWriteIn();
  if (P.writeIn === 'off' || P.reduceMotion) return;
  const pg = page();
  const items = P.writeIn === 'all' ? KINDS.reduce((n, k) => n + pg[k].length, 0) : pg.strokes.length + pg.shapes.length;
  if (!items) return;
  const speed = P.writeSpeed / 100;
  const dur = 0.55 / speed;
  const step = Math.min(0.12 / speed, (2.6 / speed) / items);
  S.writeIn = true;
  S.wi = { n: 0, step };
  world.style.setProperty('--wd', `${dur}s`);
  world.style.setProperty('--wend', `${(items * step + dur * 0.6).toFixed(2)}s`);
  world.classList.add('writein');
  world.classList.toggle('wi-all', P.writeIn === 'all');
  writeInTimer = setTimeout(stopWriteIn, (items * step + dur * 1.7) * 1000 + 100);
}
function stopWriteIn() {
  clearTimeout(writeInTimer);
  if (!S.writeIn) return;
  S.writeIn = false;
  world.classList.remove('writein', 'wi-all');
}
function pageTurn(dir) {
  vp.classList.remove('turn-fade', 'turn-slide', 'turn-flip');
  if (P.pageTurn === 'none' || P.reduceMotion) return;
  void vp.offsetWidth; // restart the animation
  vp.style.setProperty('--turn-dir', dir < 0 ? -1 : 1);
  vp.classList.add(`turn-${P.pageTurn}`);
  setTimeout(() => vp.classList.remove(`turn-${P.pageTurn}`), 700);
}
async function deleteProject(id) {
  const entry = S.projects.find((p) => p.id === id);
  const name = id === S.project.id ? S.project.name : entry?.name;
  if (P.confirmDelete && !confirm(tr('confirm.deleteProject', { name }))) return;
  if (id === S.project.id) { clearTimeout(saveTimer); S.dirty = false; }
  await api.deleteProject(id);
  cloudForget('project', id);
  await refreshProjects();
  if (id === S.project.id) {
    if (!S.projects.length) {
      const p = newProject(tr('name.myProject'));
      await api.saveProject(p);
      await refreshProjects();
    }
    S.project = null;
    await openProject(S.projects[0].id);
  }
}
async function exportProject() {
  await flushSave();
  if (await api.exportProject(S.project)) toast(tr('toast.projExported'));
}
async function importProject() {
  try {
    const p = await api.importProject();
    if (!p) return;
    p.id = uid();
    p.name = p.name ? `${p.name}` : tr('name.imported');
    p.updated = Date.now();
    for (const [name, url] of Object.entries(p.assets || {})) await api.importAsset(p.id, name, url);
    delete p.assets;
    normalizeProject(p);
    await api.saveProject(p);
    await refreshProjects();
    await openProject(p.id);
    toast(tr('toast.projImported'));
  } catch (err) {
    toast(String(err.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
  }
}

function loadPage(id) {
  S.pageId = id;
  S.project.lastPage = id;
  S.sel.clear();
  S.inspSig = '';
  const pg = page();
  S.view = { ...pg.view };
  applyView();
  $('#notes').innerHTML = pg.notes || '';
  $('#texts').innerHTML = '';
  startWriteIn();
  render();
  if (P.fitOnOpen) frames(1).then(() => { if (S.pageId === id) fitView(); });
}
function switchPage(id) {
  if (id === S.pageId) return;
  endEdit();
  if (S.draft) finishWire();
  page().view = { ...S.view };
  const order = S.project.pages.map((p) => p.id);
  pageTurn(order.indexOf(id) - order.indexOf(S.pageId));
  loadPage(id);
  renderProjects();
  scheduleSave(false);
}
function addPage() {
  const pg = newPage(tr('name.page', { n: S.project.pages.length + 1 }));
  const r = vp.getBoundingClientRect();
  pg.view = { x: r.width / 2, y: r.height / 3, z: 1 };
  S.project.pages.push(pg);
  scheduleSave();
  switchPage(pg.id);
  setTimeout(() => renameInline($(`[data-page="${pg.id}"]`), pg.name, (n) => renamePage(pg.id, n)), 30);
}
function duplicatePage(id) {
  const src = S.project.pages.find((p) => p.id === id);
  const cp = clone(src);
  cp.id = uid();
  cp.name = tr('name.copy', { name: src.name });
  S.project.pages.splice(S.project.pages.indexOf(src) + 1, 0, cp);
  scheduleSave();
  switchPage(cp.id);
}
function movePage(id, dir) {
  const arr = S.project.pages;
  const i = arr.findIndex((p) => p.id === id);
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  scheduleSave();
  renderProjects();
}
function deletePage(id) {
  const pg = S.project.pages.find((p) => p.id === id);
  if (P.confirmDelete && !confirm(tr('confirm.deletePage', { name: pg.name }))) return;
  if (S.project.pages.length === 1) {
    const fresh = newPage(tr('name.page', { n: 1 }));
    S.project.pages = [fresh];
    loadPage(fresh.id);
  } else {
    const idx = S.project.pages.indexOf(pg);
    S.project.pages.splice(idx, 1);
    if (id === S.pageId) loadPage(S.project.pages[Math.max(0, idx - 1)].id);
  }
  delete S.hist[id];
  scheduleSave();
  renderProjects();
}

$('#btn-new-project').addEventListener('click', createProject);
$('#btn-import').addEventListener('click', importProject);

// ---------------------------------------------------------------- BOM
function bomRows(scope) {
  const pages = scope === 'project' ? S.project.pages : [page()];
  const groups = new Map();
  for (const pg of pages) for (const c of pg.comps) {
    const d = SYMBOLS[c.type];
    if (!d.bom || c.bom === false) continue;
    const details = partDetails(c);
    const k = [d.id, c.value, c.part, c.footprint, details].join('\u0001');
    if (!groups.has(k)) groups.set(k, { name: symName(d), value: c.value || '', details, part: c.part || '', footprint: c.footprint || '', refs: [], notes: new Set() });
    const g = groups.get(k);
    g.refs.push(c.ref || '?');
    if (c.note) g.notes.add(c.note);
  }
  const cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true });
  const rows = [...groups.values()];
  rows.forEach((r) => r.refs.sort(cmp));
  rows.sort((a, b) => cmp(a.refs[0], b.refs[0]));
  return rows;
}
function bomCsv(rows) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [['bom.qty', 'bom.refs', 'bom.comp', 'bom.value', 'bom.details', 'bom.part', 'bom.footprint', 'bom.notes'].map((k) => q(tr(k))).join(',')];
  for (const r of rows) lines.push([r.refs.length, r.refs.join(' '), r.name, r.value, r.details, r.part, r.footprint, [...r.notes].join('; ')].map(q).join(','));
  return lines.join('\r\n');
}
let bomScope = 'project';
function openBom() {
  endEdit();
  const rows = bomRows(bomScope);
  const total = rows.reduce((n, r) => n + r.refs.length, 0);
  const m = $('#modal');
  m.innerHTML = `<div class="card">
    <div class="card-head"><h3>${esc(tr('bom.title', { name: bomScope === 'project' ? S.project.name : page().name }))}</h3>
      <div class="seg"><button data-scope="page" class="${bomScope === 'page' ? 'on' : ''}">${tr('bom.thisPage')}</button>
      <button data-scope="project" class="${bomScope === 'project' ? 'on' : ''}">${tr('bom.project')}</button></div></div>
    <div class="card-body">${rows.length ? `<table class="bom"><thead><tr>${['bom.qty', 'bom.refs', 'bom.comp', 'bom.value', 'bom.details', 'bom.part', 'bom.footprint', 'bom.notes'].map((k) => `<th>${tr(k)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((r) => `<tr><td class="qty">${r.refs.length}</td><td class="mono">${esc(r.refs.join(', '))}</td><td>${esc(r.name)}</td>
        <td class="mono">${esc(r.value)}</td><td class="small">${esc(r.details) || '<span class="muted">—</span>'}</td><td class="mono">${esc(r.part) || '<span class="muted">—</span>'}</td>
        <td>${esc(r.footprint) || '<span class="muted">—</span>'}</td><td class="muted">${esc([...r.notes].join('; '))}</td></tr>`).join('')}
      </tbody></table>` : `<div class="empty">${tr('bom.empty')}</div>`}</div>
    <div class="card-foot"><span class="muted" style="margin-right:auto;align-self:center">${tr('bom.foot', { rows: rows.length, total })}</span>
      <button class="btn" data-bom="copy">${tr('bom.copy')}</button>
      <button class="btn" data-bom="csv" ${rows.length ? '' : 'disabled'}>${tr('bom.csv')}</button>
      <button class="btn primary" data-bom="close">${tr('bom.done')}</button></div></div>`;
  m.classList.remove('hidden');
  m.onclick = async (e) => {
    if (e.target === m) return closeModal();
    const s = e.target.closest('[data-scope]');
    if (s) { bomScope = s.dataset.scope; openBom(); return; }
    const b = e.target.closest('[data-bom]');
    if (!b) return;
    if (b.dataset.bom === 'close') closeModal();
    if (b.dataset.bom === 'csv' && await api.exportText(bomCsv(rows), `${S.project.name} ${tr('bom.file')}`, 'csv', tr('bom.csvLabel'))) toast(tr('toast.bomExported'));
    if (b.dataset.bom === 'copy') {
      await copyText(rows.map((r) => `${r.refs.length}\t${r.refs.join(' ')}\t${r.name}\t${r.value}\t${r.details}\t${r.part}\t${r.footprint}`).join('\n'));
      toast(tr('toast.bomCopied'));
    }
  };
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}
function closeModal() {
  const m = $('#modal');
  m.classList.add('hidden');
  m.innerHTML = '';
  m.onclick = m.oninput = m.onchange = null;
}
$('#btn-bom').addEventListener('click', openBom);

// ---------------------------------------------------------------- export
async function exportPng() {
  endEdit();
  const pg = page();
  const b = contentBounds(pg);
  if (!b) return toast(tr('toast.pageEmpty'));
  const prev = { ...S.view };
  const prevSel = S.sel;
  const prevTool = S.tool;
  S.sel = new Set();
  S.tool = 'select';
  stopWriteIn();
  document.body.classList.add('exporting');
  document.body.classList.toggle('export-paper', P.exportPaper);
  fitView(2, P.exportPad + 10);
  render();
  G.preview.innerHTML = '';
  await frames(3);
  const r = vp.getBoundingClientRect();
  const pad = P.exportPad * S.view.z;
  const x1 = Math.max(r.left, r.left + S.view.x + b.x1 * S.view.z - pad);
  const y1 = Math.max(r.top, r.top + S.view.y + b.y1 * S.view.z - pad);
  const x2 = Math.min(r.right, r.left + S.view.x + b.x2 * S.view.z + pad);
  const y2 = Math.min(r.bottom, r.top + S.view.y + b.y2 * S.view.z + pad);
  const zf = P.uiZoom / 100; // capturePage works in window pixels, the page in zoomed CSS pixels
  try {
    if (await api.exportPng({ x: x1 * zf, y: y1 * zf, width: (x2 - x1) * zf, height: (y2 - y1) * zf }, `${S.project.name} - ${pg.name}`)) toast(tr('toast.imgExported'));
  } finally {
    document.body.classList.remove('exporting', 'export-paper');
    S.view = prev;
    S.sel = prevSel;
    S.tool = prevTool;
    applyView();
    render();
  }
}
$('#btn-export').addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  showMenu(r.right - 230, r.bottom + 6, [
    { label: tr('menu.exportPng'), action: exportPng },
    { label: tr('menu.bom'), kb: 'B', action: openBom },
    { label: tr('menu.projectFile'), action: exportProject },
    '-',
    { label: L2(BKT.read), action: () => openBook() },
    { label: L2(BKT.pdf), action: bookPdf },
    { label: L2(BKT.scan), action: openScan },
    '-',
    { label: tr('menu.import'), action: importProject },
    { label: tr('menu.dataFolder'), action: () => api.openDataFolder() },
  ]);
});

// ---------------------------------------------------------------- menus, toast, theme
function showMenu(x, y, items, cls = '') {
  const m = $('#menu');
  m.className = `menu ${cls}`;
  m.innerHTML = items.filter(Boolean).map((it, i) => (it === '-' ? '<div class="msep"></div>'
    : `<div class="mi ${it.danger ? 'danger' : ''}" data-i="${i}"><span>${esc(it.label)}</span>${it.kb ? `<span class="kb">${esc(it.kb)}</span>` : ''}</div>`)).join('');
  const real = items.filter(Boolean);
  m.onmousedown = (e) => e.preventDefault();
  m.onclick = (e) => {
    const el = e.target.closest('.mi');
    if (!el) return;
    hideMenu();
    real[+el.dataset.i].action();
  };
  m.classList.remove('hidden');
  const r = m.getBoundingClientRect();
  m.style.left = `${clamp(x, 6, window.innerWidth - r.width - 6)}px`;
  m.style.top = `${clamp(y, 6, window.innerHeight - r.height - 6)}px`;
}
function hideMenu() { $('#menu').classList.add('hidden'); }
document.addEventListener('mousedown', (e) => { if (!e.target.closest('#menu')) hideMenu(); });
// Clicked buttons drop focus so Space / Enter go to the canvas, not the button.
document.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) b.blur(); });

let toastTimer = null;
function toast(msg, force = false) {
  if (!P.toasts && !force) return;
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

// Quick light / dark switch: goes back to the last light or dark palette you used.
$('#btn-theme').addEventListener('click', () => {
  const dark = PALETTES[P.palette].dark;
  if (dark) P.lastDark = P.palette; else P.lastLight = P.palette;
  P.palette = dark ? (P.lastLight || 'paper') : (P.lastDark || 'bench');
  savePrefsSoon();
  onPrefsChanged();
  if (settingsOpen()) renderSetPane(true);
});
$('#btn-settings').addEventListener('click', () => {
  if (fmOpen()) fmClose();
  else if (settingsOpen()) closeModal();
  else openSettings();
});
$('#btn-right').addEventListener('click', toggleRight);
$('#btn-menu').addEventListener('click', () => toggleDrawer('left'));
// phones: buttons that do not fit in the top bar live in this menu
$('#btn-more').addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  showMenu(r.right - 240, r.bottom + 6, [
    { label: tr('top.bomTitle').replace(/\s*\([^)]*\)$/, ''), action: openBom },
    { label: L2(BKT.read), action: () => openBook() },
    '-',
    { label: tr('menu.exportPng'), action: exportPng },
    { label: L2(BKT.pdf), action: bookPdf },
    { label: tr('menu.projectFile'), action: exportProject },
    { label: L2(BKT.scan), action: openScan },
    { label: tr('menu.import'), action: importProject },
    '-',
    { label: tr('top.theme'), action: () => $('#btn-theme').click() },
    ...Object.entries(LANGS).map(([code, label]) => ({ label: `${code === LANG ? '✓ ' : '\u2003'}${label}`, action: () => setLang(code) })),
  ]);
});
$('#btn-calc').addEventListener('click', () => openCalc());
$('#btn-account').addEventListener('click', () => openAccount());
$('#btn-book').addEventListener('click', () => openBook());
$('#btn-scan').addEventListener('click', () => openScan());

// ---------------------------------------------------------------- language
function setLang(lang, persist = true) {
  LANG = LANGS[lang] ? lang : 'en';
  if (persist) api.setSettings({ lang: LANG });
  applyStaticI18n();
  $('#btn-lang').textContent = LANG.toUpperCase();
  buildLibrary();
  renderHint();
  renderToolOptions();
  $$('.tres').forEach((el) => { el.title = tr('text.resize'); });
  setSaveState(S.saveKey);
  if (S.project) {
    S.inspSig = '';
    renderInspector(true);
    renderProjects();
    renderStatus();
  }
  if (typeof renderCalc === 'function' && $('#calc-pane').childElementCount) renderCalc();
  if (typeof cloudBadge === 'function') { cloudBadge(); if (accountOpen()) renderAccount(); }
  if (settingsOpen()) {
    const top = $('.set-pane').scrollTop;
    openSettings();
    $('.set-pane').scrollTop = top;
  }
}
$('#btn-lang').addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  showMenu(r.left, r.bottom + 6, Object.entries(LANGS).map(([code, label]) => ({
    label: `${code === LANG ? '✓ ' : ' '}${label}`, kb: code.toUpperCase(), action: () => setLang(code),
  })));
});

// side panels: drag the inner edge to resize, double-click it to reset
for (const sp of $$('.splitter')) {
  const side = sp.dataset.split;
  const key = side === 'left' ? 'leftWidth' : 'rightWidth';
  const def = PREF_DEFS.find((d) => d.id === key);
  sp.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    sp.setPointerCapture(e.pointerId);
    sp.classList.add('drag');
    document.body.classList.add('splitting');
    const move = (ev) => {
      const r = $(side === 'left' ? '#left' : '#right').getBoundingClientRect();
      P[key] = Math.round(clamp(side === 'left' ? ev.clientX - r.left : r.right - ev.clientX, def.min, def.max));
      document.body.style.setProperty(side === 'left' ? '--lw' : '--rw', `${P[key]}px`);
    };
    const up = () => {
      sp.classList.remove('drag');
      document.body.classList.remove('splitting');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      savePrefsSoon();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  sp.addEventListener('dblclick', () => { P[key] = def.def; savePrefsSoon(); onPrefsChanged(); });
}

// toolbar wiring
$$('#tools [data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
$('#btn-undo').addEventListener('click', undo);
$('#btn-redo').addEventListener('click', redo);
$('#btn-zoom-in').addEventListener('click', () => zoomCenter(1.2));
$('#btn-zoom-out').addEventListener('click', () => zoomCenter(1 / 1.2));
$('#btn-zoom-label').addEventListener('click', () => {
  const r = vp.getBoundingClientRect();
  zoomAt(r.width / 2, r.height / 2, 1 / S.view.z);
});
$('#btn-fit').addEventListener('click', () => fitView());
window.addEventListener('resize', () => applyView());

// phones close apps in the background without warning: save whenever the app is hidden
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' || !S.project) return;
  if (S.editing) endEdit();
  page().notes = sanitize($('#notes').innerHTML);
  page().view = { ...S.view };
  S.dirty = true;
  flushSave();
});

window.addEventListener('beforeunload', () => {
  if (!S.project) return;
  if (S.editing) endEdit();
  clearTimeout(notesTimer);
  const n = $('#notes');
  page().notes = sanitize(n.innerHTML);
  page().view = { ...S.view };
  api.saveProjectSync(S.project);
});

// ---------------------------------------------------------------- first-run sample
function sampleProject() {
  const p = newProject(tr('sample.project'));
  const pg = p.pages[0];
  pg.name = tr('sample.page');
  pg.view = { x: 260, y: 220, z: 1.25 };
  const C = (type, x, y, rot, ref, value, extra = {}) =>
    ({ id: uid(), type, x, y, rot, flip: false, ref, value, part: '', footprint: '', note: '', bom: SYMBOLS[type].bom, ...extra });
  pg.comps = [
    C('battery', 0, 0, 1, 'BT1', '9V'),
    C('resistor', 100, -80, 0, 'R1', '470', { footprint: tr('sample.axial'), note: '(9 − 2) V / 15 mA ≈ 470 Ω' }),
    C('led', 220, 0, 1, 'D1', tr('sample.red'), { footprint: '5 mm' }),
    C('gnd', 0, 80, 0, '', 'GND'),
  ];
  pg.wires = [
    { id: uid(), pts: [[0, -40], [0, -80], [60, -80]] },
    { id: uid(), pts: [[140, -80], [220, -80], [220, -40]] },
    { id: uid(), pts: [[220, 40], [220, 80], [0, 80], [0, 40]] },
  ];
  pg.shapes = [{ id: uid(), kind: 'arrow', x1: 330, y1: 70, x2: 245, y2: 20, color: '#f5a524', width: 2.5 }];
  pg.texts = [
    { id: uid(), x: 300, y: 70, w: 210, html: tr('sample.polarity') },
    { id: uid(), x: -170, y: 150, w: 520, html: tr('sample.welcome') },
  ];
  pg.notes = tr('sample.notes');
  return p;
}

// ---------------------------------------------------------------- boot
async function init() {
  // the scripts after this one (calculator, scanner, book, accounts) must be loaded first
  if (document.readyState !== 'complete') await new Promise((r) => window.addEventListener('load', r, { once: true }));
  S.settings = await api.getSettings();
  await loadUserFonts(); // before the prefs, so a saved custom font choice is recognised
  loadPrefs(S.settings);
  S.pen = { color: P.penColor, width: P.penWidth, nib: P.nib };
  applyPrefs();
  setLang(detectLang(S.settings.lang), S.settings.lang !== detectLang(S.settings.lang));
  if (S.settings.rightCollapsed) document.body.classList.add('right-collapsed');
  buildLibrary();
  setTool('select');
  await refreshProjects();
  let firstRun = false;
  if (!S.projects.length) {
    const p = sampleProject();
    await api.saveProject(p);
    await refreshProjects();
    firstRun = true;
  }
  const last = P.openLast && S.projects.find((p) => p.id === S.settings.lastProject);
  await openProject((last || S.projects[0]).id);
  if (firstRun) { await frames(2); fitView(1.4); }
  cloudInit();
}

init();
