// OhmNote — "Rewrite & redraw": turn a photographed notebook page into real page content.
// Writing that can be read with confidence becomes typed text boxes (Tesseract, running locally);
// everything else (drawings, schematics, writing it could not read) is traced into pen strokes:
// the ink is thinned to its centre line, followed into paths, and each path keeps the ink's
// thickness and colour. Nothing leaves the device.
'use strict';

const RD = { worker: null, lang: '', loading: null };

function rdScript(src) {
  return new Promise((res, rej) => {
    if (window.Tesseract) { res(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error('The text reader could not be loaded'));
    document.head.appendChild(s);
  });
}

// Never wait forever on the text reader: past the limit the page is traced instead.
function rdTimeout(p, ms, what) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${what} took too long`)), ms); })]).finally(() => clearTimeout(t));
}
async function rdDropWorker() {
  const w = RD.worker;
  RD.worker = null; RD.lang = '';
  if (w) try { await w.terminate(); } catch { /* already gone */ }
}

// One Tesseract worker, kept for the whole session (loading it takes a second or two).
async function rdWorker(lang) {
  if (RD.worker && RD.lang === lang) return RD.worker;
  if (RD.loading) await RD.loading.catch(() => {});
  if (RD.worker && RD.lang === lang) return RD.worker;
  if (RD.worker) { try { await RD.worker.terminate(); } catch { /* already gone */ } RD.worker = null; }
  RD.loading = (async () => {
    await rdScript('vendor/tesseract/tesseract.min.js');
    const base = new URL('vendor/tesseract/', location.href).href;
    let failed = null;
    const made = Tesseract.createWorker(lang.split('+'), 1, {
      workerPath: `${base}worker.min.js`, corePath: `${base}core`, langPath: `${base}lang`,
      workerBlobURL: false, cacheMethod: 'none', gzip: false,
      errorHandler: (err) => { failed = err; },
    });
    const w = await rdTimeout(Promise.race([made, new Promise((_, rej) => {
      const iv = setInterval(() => { if (failed) { clearInterval(iv); rej(failed instanceof Error ? failed : new Error(String(failed))); } }, 200);
      made.finally(() => clearInterval(iv));
    })]), 60000, 'Starting the text reader');
    await w.setParameters({ preserve_interword_spaces: '1' });
    RD.worker = w;
    RD.lang = lang;
  })();
  try { await RD.loading; } catch (err) { await rdDropWorker(); throw err; } finally { RD.loading = null; }
  return RD.worker;
}
const rdLang = () => (LANG === 'hu' ? 'hun+eng' : 'eng+hun'); // both: people often write in another language than the app's

// ---------------------------------------------------------------- image analysis
// mask: 1 where there is ink. Small holes are filled and lone specks dropped first.
function rdMask(ink) {
  const { width: W, height: H, data: d } = ink;
  const m = new Uint8Array(W * H);
  for (let i = 0, p = 3; i < m.length; i++, p += 4) m[i] = d[p] > 100 ? 1 : 0;
  const out = m.slice();
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += m[i + dy * W + dx];
      if (n >= 6) out[i] = 1; // pinholes and ragged edges
      else if (n <= 2) out[i] = 0; // single stray pixels
    }
  }
  return out;
}

// 8-connected components: label per pixel and a box + size per component.
function rdComponents(m, W, H) {
  const lab = new Int32Array(W * H).fill(-1);
  const comps = [];
  const stack = new Int32Array(W * H);
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || lab[s] >= 0) continue;
    const id = comps.length;
    const c = { n: 0, x0: W, y0: H, x1: 0, y1: 0 };
    let top = 0;
    stack[top++] = s;
    lab[s] = id;
    while (top) {
      const i = stack[--top], x = i % W, y = (i / W) | 0;
      c.n++;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (m[j] && lab[j] < 0) { lab[j] = id; stack[top++] = j; }
        }
      }
    }
    comps.push(c);
  }
  return { lab, comps };
}

// Distance from each ink pixel to the paper (chamfer 3-4, in pixels): half the line thickness.
function rdDistance(m, W, H) {
  const BIG = 1 << 20;
  const d = new Int32Array(W * H);
  for (let i = 0; i < d.length; i++) d[i] = m[i] ? BIG : 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - W] + 3);
        if (x > 0) v = Math.min(v, d[i - W - 1] + 4);
        if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4);
      }
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) v = Math.min(v, 3);
      d[i] = v;
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x < W - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < H - 1) {
        v = Math.min(v, d[i + W] + 3);
        if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + W - 1] + 4);
      }
      d[i] = v;
    }
  }
  return d; // ×3
}

// Zhang–Suen thinning: the ink shrinks to one-pixel centre lines (works on a copy).
function rdThin(m, W, H) {
  const s = m.slice();
  for (let x = 0; x < W; x++) { s[x] = 0; s[(H - 1) * W + x] = 0; }
  for (let y = 0; y < H; y++) { s[y * W] = 0; s[y * W + W - 1] = 0; }
  let todo = [];
  for (let i = 0; i < s.length; i++) if (s[i]) todo.push(i);
  const del = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      del.length = 0;
      for (const i of todo) {
        if (!s[i]) continue;
        const p2 = s[i - W], p3 = s[i - W + 1], p4 = s[i + 1], p5 = s[i + W + 1], p6 = s[i + W], p7 = s[i + W - 1], p8 = s[i - 1], p9 = s[i - W - 1];
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;
        const a = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
        if (a !== 1) continue;
        if (step === 0 ? (p2 && p4 && p6) || (p4 && p6 && p8) : (p2 && p4 && p8) || (p2 && p6 && p8)) continue;
        del.push(i);
      }
      for (const i of del) s[i] = 0;
      if (del.length) changed = true;
    }
    todo = todo.filter((i) => s[i]);
  }
  // drop staircase corners: a pixel whose 4-neighbours already join its other neighbours
  for (const i of todo) {
    if (!s[i]) continue;
    const n = s[i - W], e = s[i + 1], so = s[i + W], w = s[i - 1];
    if ((n && e && !s[i + W - 1] && !so && !w) || (e && so && !s[i - W - 1] && !n && !w) ||
        (so && w && !s[i - W + 1] && !n && !e) || (w && n && !s[i + W + 1] && !so && !e)) s[i] = 0;
  }
  return s;
}

const RD_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

// Follow the centre lines into paths. Endpoints first, so most strokes run from one end to the
// other; at a crossing the walk keeps going the straightest way.
function rdTrace(sk, W, H) {
  const seen = new Uint8Array(W * H);
  const deg = (i) => { let n = 0; const x = i % W, y = (i / W) | 0; for (const [dx, dy] of RD_DIRS) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && sk[yy * W + xx]) n++; } return n; };
  const paths = [];
  const walk = (start) => {
    const pts = [start];
    seen[start] = 1;
    let cur = start, dirx = 0, diry = 0;
    for (;;) {
      const x = cur % W, y = (cur / W) | 0;
      let best = -1, bestScore = -Infinity, joined = -1;
      for (const [dx, dy] of RD_DIRS) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (!sk[j]) continue;
        if (seen[j]) { if (pts.length > 1 && j !== pts[pts.length - 2] && joined < 0) joined = j; continue; }
        const len = Math.hypot(dx, dy);
        const score = (dirx || diry ? (dx * dirx + dy * diry) / len : 0) - (len > 1 ? 0.05 : 0);
        if (score > bestScore) { bestScore = score; best = j; }
      }
      if (best < 0) { if (joined >= 0) { pts.push(joined); pts.joined = true; } break; }
      seen[best] = 1;
      pts.push(best);
      // direction over the last few pixels, so one-pixel jitter does not steer the walk
      const back = pts[Math.max(0, pts.length - 5)];
      dirx = (best % W) - (back % W); diry = ((best / W) | 0) - ((back / W) | 0);
      const l = Math.hypot(dirx, diry) || 1;
      dirx /= l; diry /= l;
      cur = best;
    }
    paths.push(pts);
  };
  const ink = [];
  for (let i = 0; i < sk.length; i++) if (sk[i]) ink.push(i);
  for (const i of ink) if (!seen[i] && deg(i) === 1) walk(i);
  for (const i of ink) if (!seen[i]) walk(i); // loops and leftovers
  return paths;
}

// Ramer–Douglas–Peucker
function rdSimplify(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1, fd = eps;
    for (let i = a + 1; i < b; i++) {
      const dd = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
      if (dd > fd) { fd = dd; far = i; }
    }
    if (far >= 0) { keep[far] = 1; st.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// Ink colour of some pixels: dark and grey inks follow the theme ('ink'), coloured pens keep their colour.
function rdColor(ink, pixels) {
  const d = ink.data;
  let r = 0, g = 0, b = 0, n = 0;
  for (const i of pixels) {
    if (d[i * 4 + 3] < 140) continue;
    r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; n++;
  }
  if (!n) return 'ink';
  r /= n; g /= n; b /= n;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn < 46 || mx < 70) return 'ink';
  return rdNearestInk(r, g, b);
}
// Coloured ink becomes the pen colour of the same hue from your ink palette, so it reads on light
// and dark pages alike (and you can pick the same colour again for your own additions).
function rdHue(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return { h: 0, s: 0 };
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h: h < 0 ? h + 360 : h, s: d / mx };
}
function rdNearestInk(r, g, b) {
  const want = rdHue(r, g, b);
  let best = 'ink', bd = Infinity;
  for (const c of inkColors()) {
    if (c === 'ink') continue;
    const n = parseInt(c.slice(1), 16), cr = n >> 16, cg = (n >> 8) & 255, cb = n & 255;
    const h = rdHue(cr, cg, cb);
    if (h.s < 0.3) continue; // greys and black are 'ink' already
    const dh = Math.min(Math.abs(h.h - want.h), 360 - Math.abs(h.h - want.h));
    if (dh < bd) { bd = dh; best = c; }
  }
  return bd <= 50 ? best : 'ink';
}

// ---------------------------------------------------------------- reading the writing
async function rdRead(ink, mask, W, H) {
  // the reader gets clean black writing on white paper (printed notebook lines already gone)
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    const v = mask[i] ? Math.max(0, 255 - ink.data[p + 3] * 1.2) : 255;
    img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
    img.data[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const worker = await rdWorker(rdLang());
  let data;
  try {
    ({ data } = await rdTimeout(worker.recognize(c, {}, { blocks: true, text: false }), 120000, 'Reading the page'));
  } catch (err) {
    await rdDropWorker(); // a stuck reader is replaced next time
    throw err;
  }
  const lines = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) lines.push(l);
  return lines;
}

// Is this line real writing the reader is sure about?
function rdGoodLine(l, H) {
  const words = (l.words || []).filter((w) => w.text && w.text.trim());
  if (!words.length) return false;
  const text = words.map((w) => w.text).join(' ');
  const chars = text.replace(/\s/g, '');
  const letters = (chars.match(/[\p{L}\p{N}]/gu) || []).length;
  if (letters < 2 || letters / chars.length < 0.75) return false;
  const h = l.bbox.y1 - l.bbox.y0;
  if (h < H * 0.008 || h > H * 0.09) return false;
  const cs = words.map((w) => w.confidence).sort((x, y) => x - y);
  const median = cs[cs.length >> 1], mean = cs.reduce((s, c) => s + c, 0) / cs.length;
  const weak = cs.filter((c) => c < 50).length;
  return median >= 78 && mean >= 60 && weak <= Math.max(1, words.length * 0.25) && (words.length > 1 || median >= 85);
}

// ---------------------------------------------------------------- the whole page
// ink: ImageData from the "Ink only" clean-up. pageW: width of the page in OhmNote units.
// Returns strokes and text boxes in page units.
async function redrawPage(ink, pageW, { readText = true, onStep } = {}) {
  const W = ink.width, H = ink.height, k = pageW / W;
  const mask = rdMask(ink);
  const { lab, comps } = rdComponents(mask, W, H);
  const minArea = Math.max(5, Math.round((W / 900) ** 2 * 5));
  for (let id = 0; id < comps.length; id++) comps[id].drop = comps[id].n < minArea;

  const texts = [];
  let readFailed = '';
  if (readText) {
    onStep && onStep('read');
    let lines = [];
    try { lines = await rdRead(ink, mask, W, H); } catch (err) { console.warn('text reader', err); readFailed = String(err.message || err); }
    const textSize = parseFloat(getComputedStyle(document.body).getPropertyValue('--text-size')) || 15;
    const probe = document.createElement('canvas').getContext('2d');
    const fam = getComputedStyle(document.body).getPropertyValue('--text-font').trim() || 'sans-serif';
    const found = [];
    for (const l of lines) {
      if (!rdGoodLine(l, H)) continue;
      const { x0, y0, x1, y1 } = l.bbox, h = y1 - y0;
      // the ink of this line: components lying (mostly) inside its box
      const px = h * 0.25, bx0 = x0 - px, by0 = y0 - px, bx1 = x1 + px, by1 = y1 + px;
      const mine = [];
      for (let id = 0; id < comps.length; id++) {
        const c = comps[id];
        if (c.drop || c.text) continue;
        const ix = Math.max(0, Math.min(c.x1, bx1) - Math.max(c.x0, bx0)), iy = Math.max(0, Math.min(c.y1, by1) - Math.max(c.y0, by0));
        const area = (c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1);
        if ((ix + 1) * (iy + 1) >= area * 0.8) mine.push(c);
      }
      if (!mine.length) continue;
      const px2 = [];
      for (const c of mine) {
        c.text = true;
        const id = comps.indexOf(c);
        for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (lab[y * W + x] === id) px2.push(y * W + x);
      }
      const str = l.words.filter((w) => w.text && w.text.trim()).map((w) => w.text.trim()).join(' ');
      // writing size: Tesseract's row height without the descenders (≈ cap height)
      const ra = l.rowAttributes || {};
      const cap = ra.rowHeight ? ra.rowHeight - (ra.descenders || 0) : h * 0.7;
      found.push({ x0, y0, x1, str, size: cap * 1.2 * k, color: rdColor(ink, px2) });
    }
    // lines written the same size get the same size (within 7%), so the page looks even
    const sizes = found.map((f) => f.size).sort((x, y) => x - y);
    for (const f of found) {
      const near = sizes.filter((s) => Math.abs(s - f.size) <= f.size * 0.07);
      f.size = near[near.length >> 1];
    }
    for (const f of found) {
      const z = Math.max(0.6, Math.min(4, f.size / textSize));
      probe.font = `${textSize * z}px ${fam}`;
      const w = Math.max((f.x1 - f.x0) * k, probe.measureText(f.str).width) + 20;
      const html = f.color === 'ink' ? esc(f.str) : `<span style="color:${f.color}">${esc(f.str)}</span>`;
      // the text's capitals sit where the written ones were: line box is 1.5em, plus the box padding
      const y = f.y0 * k - textSize * z * 0.42 - 4;
      texts.push({ id: uid(), x: r1(f.x0 * k - 7), y: r1(y), w: Math.round(w), z: Math.round(z * 100) / 100, html });
    }
  }

  onStep && onStep('trace');
  await new Promise((r) => setTimeout(r, 0));
  // everything that did not become text is traced
  const rest = new Uint8Array(W * H);
  for (let i = 0; i < rest.length; i++) {
    const id = lab[i];
    if (id >= 0 && !comps[id].drop && !comps[id].text) rest[i] = 1;
  }
  const dist = rdDistance(rest, W, H);
  const sk = rdThin(rest, W, H);
  // a component that thinned away completely is a dot: keep its thickest pixel
  for (let id = 0; id < comps.length; id++) {
    const c = comps[id];
    if (c.drop || c.text) continue;
    let has = false, best = -1, bd = -1;
    for (let y = c.y0; y <= c.y1 && !has; y++) {
      for (let x = c.x0; x <= c.x1; x++) {
        const i = y * W + x;
        if (lab[i] !== id) continue;
        if (sk[i]) { has = true; break; }
        if (dist[i] > bd) { bd = dist[i]; best = i; }
      }
    }
    if (!has && best >= 0) sk[best] = 1;
  }
  const paths = rdTrace(sk, W, H);
  const strokes = [];
  for (const p of paths) {
    const xy = p.map((i) => [i % W, (i / W) | 0]);
    const ds = p.map((i) => dist[i] / 3).sort((a, b) => a - b);
    const half = ds[ds.length >> 1] || 1;
    const widthPx = Math.max(1, 2 * half - 0.6);
    let len = 0;
    for (let i = 1; i < xy.length; i++) len += Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]);
    if (p.joined && len < widthPx * 1.5) continue; // a little spur from thinning, hanging off another line
    let pts = rdSimplify(xy, Math.max(0.6, widthPx * 0.25)).map(([x, y]) => [r1(x * k), r1(y * k)]);
    if (pts.length === 1) pts = [pts[0], [r1(pts[0][0] + 0.1), pts[0][1]]];
    strokes.push({ id: uid(), pts, color: rdColor(ink, p), width: r1(Math.max(0.6, Math.min(9, widthPx * k))) });
  }
  return { strokes, texts, readFailed };
}

// Small picture of the result for the scan window: strokes in their colours, read text in blue.
function redrawPreview(canvas, res, pageW) {
  const g = canvas.getContext('2d');
  const s = canvas.width / pageW;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const st of res.strokes) {
    g.strokeStyle = st.color === 'ink' ? '#1d1d1f' : st.color;
    g.lineWidth = Math.max(0.6, st.width * s);
    g.beginPath();
    st.pts.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
    g.stroke();
  }
  const textSize = parseFloat(getComputedStyle(document.body).getPropertyValue('--text-size')) || 15;
  const fam = getComputedStyle(document.body).getPropertyValue('--text-font').trim() || 'sans-serif';
  g.textBaseline = 'top';
  for (const t of res.texts) {
    const fs = textSize * t.z;
    g.font = `${fs * s}px ${fam}`;
    const tmp = document.createElement('div');
    tmp.innerHTML = t.html;
    const span = tmp.querySelector('span');
    const tx = (t.x + 7) * s, ty = (t.y + 4 + fs * 0.25) * s;
    // a soft marker behind text that was read, so you can see what became typed text
    g.fillStyle = 'rgba(255, 214, 10, .28)';
    g.fillRect(tx - 2, ty - 1, g.measureText(tmp.textContent).width + 4, fs * 1.05 * s);
    g.fillStyle = span ? span.style.color : '#1d1d1f';
    g.fillText(tmp.textContent, tx, ty);
  }
}
