// OhmNote — notebook photos → digital book.
// For every photo: find the sheet of paper, straighten it (perspective correction), clean it up like a
// scanner (even out shadows and yellow light, crisp ink, white paper — or keep only the ink), and make
// it a page of a project. Everything runs locally.
'use strict';

const SC = { photos: [], cur: 0, mode: 'scan', strength: 50, target: 'new', name: '', busy: false, content: 'photo', readText: true };
const SCT = {
  title: ['Notebook photos → book', 'Füzetfotókból könyv'], name: ['Book name', 'Könyv neve'],
  choose: ['Choose photos…', 'Fotók kiválasztása…'], drop: ['or drop photos of your notebook pages here', 'vagy húzd ide a füzetoldalakról készült fotókat'],
  tips: ['Tips: lay the page flat, fill most of the photo with it, avoid your own shadow. Photos are put in the order you pick them; change it below.',
    'Tippek: fektesd le az oldalt, töltse ki a fotó nagy részét, kerüld a saját árnyékodat. A fotók a kiválasztás sorrendjében kerülnek be; lent átrendezheted.'],
  add: ['+ Add photos', '+ Fotók hozzáadása'], up: ['Move earlier', 'Előrébb'], down: ['Move later', 'Hátrébb'],
  rotL: ['Rotate left', 'Forgatás balra'], rotR: ['Rotate right', 'Forgatás jobbra'], del: ['Remove photo', 'Fotó eltávolítása'],
  find: ['Find the page', 'Oldal keresése'], whole: ['Use whole photo', 'Teljes fotó'],
  corners: ['Drag the four corners onto the corners of the page.', 'Húzd a négy sarkot az oldal sarkaira.'],
  result: ['Result', 'Eredmény'], cleanup: ['Clean-up', 'Tisztítás'],
  mScan: ['Scan', 'Szkennelt'], mInk: ['Ink only', 'Csak tinta'], mBw: ['Black & white', 'Fekete-fehér'], mColor: ['Colour', 'Színes'], mOrig: ['Original', 'Eredeti'],
  modeHint: {
    scan: ['White paper, no shadows, ink keeps its colour.', 'Fehér papír, árnyék nélkül, a tinta megtartja a színét.'],
    ink: ['Only your writing is kept; OhmNote’s own paper shows through. Printed notebook lines fade out.', 'Csak az írásod marad meg, alatta az OhmNote saját papírja látszik. A füzet nyomtatott vonalai eltűnnek.'],
    bw: ['Pure black and white, the smallest files.', 'Tiszta fekete-fehér, a legkisebb fájlok.'],
    color: ['Gentle clean-up for pages with colour drawings or photos.', 'Kíméletes tisztítás színes rajzokhoz, fotókhoz.'],
    orig: ['Straightened only, colours untouched.', 'Csak kiegyenesítve, a színek változatlanok.'],
  },
  strength: ['Strength', 'Erősség'], into: ['Put the pages into', 'Az oldalak helye'], newBook: ['A new book', 'Új könyv'], addTo: ['This project', 'Ez a projekt'],
  create: ['Create book', 'Könyv készítése'], addPages: ['Add pages', 'Oldalak hozzáadása'], cancel: ['Cancel', 'Mégse'],
  pages: ['pages', 'oldal'], working: ['Working on page', 'Oldal feldolgozása:'], done: ['Book ready', 'Kész a könyv'], added: ['Pages added', 'Oldalak hozzáadva'],
  bad: ['Could not read', 'Nem sikerült beolvasni:'], page: ['Page', 'Oldal'], defName: ['Notebook', 'Füzet'],
  discard: ['Close and drop these photos?', 'Bezárod, és elveted ezeket a fotókat?'],
  content: ['Each page becomes', 'Az oldalakból ez lesz'],
  cPhoto: ['The photo', 'A fotó'], cRedraw: ['Rewritten & redrawn', 'Újraírva, újrarajzolva'], cBoth: ['Both', 'Mindkettő'],
  contentHint: {
    photo: ['The cleaned-up photo of the page.', 'Az oldal megtisztított fotója.'],
    redraw: ['OhmNote tries to rewrite the page: writing it can read becomes typed text, everything else (drawings, circuits, writing it can’t read) is traced into pen strokes you can edit. Check the result: it’s a best try.',
      'Az OhmNote megpróbálja újraírni az oldalt: amit el tud olvasni, gépelt szöveg lesz, minden mást (rajzok, kapcsolások, olvashatatlan írás) szerkeszthető tollvonásokká rajzol át. Nézd át az eredményt: ez csak egy próbálkozás.'],
    both: ['The rewritten and redrawn page on top of the photo, so you can compare, then delete either.', 'Az újraírt, újrarajzolt oldal a fotó fölött: összehasonlíthatod, aztán bármelyiket törölheted.'],
  },
  readText: ['Turn writing into text', 'Az írás szöveggé alakítása'],
  readOff: ['Off: everything is redrawn as pen strokes, nothing is read.', 'Kikapcsolva minden tollvonás lesz, semmit sem olvas el.'],
  sens: ['Ink sensitivity', 'Tintaérzékenység'],
  reading: ['Reading the page…', 'Az oldal olvasása…'], tracing: ['Tracing the drawings…', 'A rajzok átrajzolása…'],
  legend: ['Highlighted = read as text', 'Kiemelve = szövegként olvasva'],
  readingN: ['Reading page', 'Oldal olvasása:'],
  readFail: ['The writing could not be read this time, so everything was redrawn as pen strokes.', 'Az írást most nem sikerült elolvasni, ezért minden tollvonásként lett újrarajzolva.'],
};

// ---------------------------------------------------------------- image helpers
async function scLoad(file, maxSide) {
  const probe = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, maxSide / Math.max(probe.width, probe.height));
  if (k === 1) return probe;
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image', resizeWidth: Math.max(1, Math.round(probe.width * k)), resizeHeight: Math.max(1, Math.round(probe.height * k)), resizeQuality: 'high' });
  probe.close();
  return bmp;
}
function scRotated(bmp, rot) { // canvas with the photo turned by rot quarter turns
  const q = ((rot % 4) + 4) % 4;
  const c = document.createElement('canvas');
  c.width = q % 2 ? bmp.height : bmp.width;
  c.height = q % 2 ? bmp.width : bmp.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.translate(c.width / 2, c.height / 2);
  g.rotate((q * Math.PI) / 2);
  g.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  return c;
}
const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true });

// Find the sheet: bright, low-saturation pixels; largest connected blob; its four extreme corners.
function scDetect(canvas) {
  const s = Math.min(1, 360 / Math.max(canvas.width, canvas.height));
  const w = Math.max(2, Math.round(canvas.width * s)), h = Math.max(2, Math.round(canvas.height * s));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = ctx2d(c);
  g.drawImage(canvas, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const L = new Uint8Array(w * h);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    const v = Math.max(0, Math.min(255, Math.round((r + gg + b) / 3 - (mx - mn) * 0.7)));
    L[j] = v; hist[v]++;
  }
  // Otsu threshold
  const total = w * h;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, th = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; th = i; }
  }
  // largest bright blob (4-neighbour flood fill)
  const lab = new Int32Array(total);
  let bestId = 0, bestArea = 0, id = 0;
  const stack = new Int32Array(total);
  for (let p = 0; p < total; p++) {
    if (lab[p] || L[p] <= th) continue;
    id++;
    let sp = 0, area = 0;
    stack[sp++] = p; lab[p] = id;
    while (sp) {
      const q = stack[--sp]; area++;
      const x = q % w, y = (q / w) | 0;
      if (x > 0 && !lab[q - 1] && L[q - 1] > th) { lab[q - 1] = id; stack[sp++] = q - 1; }
      if (x < w - 1 && !lab[q + 1] && L[q + 1] > th) { lab[q + 1] = id; stack[sp++] = q + 1; }
      if (y > 0 && !lab[q - w] && L[q - w] > th) { lab[q - w] = id; stack[sp++] = q - w; }
      if (y < h - 1 && !lab[q + w] && L[q + w] > th) { lab[q + w] = id; stack[sp++] = q + w; }
    }
    if (area > bestArea) { bestArea = area; bestId = id; }
  }
  const whole = [[0, 0], [1, 0], [1, 1], [0, 1]];
  if (bestArea < total * 0.12) return whole;
  let tl = [0, 0, Infinity], tr = [0, 0, -Infinity], br = [0, 0, -Infinity], bl = [0, 0, Infinity];
  for (let p = 0; p < total; p++) {
    if (lab[p] !== bestId) continue;
    const x = p % w, y = (p / w) | 0;
    if (x + y < tl[2]) tl = [x, y, x + y];
    if (x - y > tr[2]) tr = [x, y, x - y];
    if (x + y > br[2]) br = [x, y, x + y];
    if (x - y < bl[2]) bl = [x, y, x - y];
  }
  return [tl, tr, br, bl].map(([x, y]) => [clamp((x + 0.5) / w, 0, 1), clamp((y + 0.5) / h, 0, 1)]);
}

// Homography that maps the four `from` points onto the four `to` points.
function scHomography(from, to) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i], [X, Y] = to[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
  }
  for (let c = 0; c < 8; c++) { // Gaussian elimination with partial pivoting
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    const piv = A[c][c] || 1e-12;
    for (let r = c + 1; r < 8; r++) {
      const f = A[r][c] / piv;
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = new Array(8);
  for (let r = 7; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < 8; k++) s -= A[r][k] * h[k];
    h[r] = s / (A[r][r] || 1e-12);
  }
  return h;
}

// Straighten the page: corners (normalized, TL TR BR BL) → upright image, long side ≤ maxOut.
function scWarp(src, corners, maxOut) {
  const sw = src.width, sh = src.height;
  const pts = corners.map(([x, y]) => [x * sw, y * sh]);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let W = Math.max(dist(pts[0], pts[1]), dist(pts[3], pts[2]));
  let H = Math.max(dist(pts[0], pts[3]), dist(pts[1], pts[2]));
  const k = Math.min(1.5, maxOut / Math.max(W, H));
  W = Math.max(8, Math.round(W * k)); H = Math.max(8, Math.round(H * k));
  const h = scHomography([[0, 0], [W, 0], [W, H], [0, H]], pts);
  const sd = ctx2d(src).getImageData(0, 0, sw, sh).data;
  const out = new ImageData(W, H);
  const od = out.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x + 0.5, v = y + 0.5;
      const den = h[6] * u + h[7] * v + 1;
      let fx = (h[0] * u + h[1] * v + h[2]) / den - 0.5, fy = (h[3] * u + h[4] * v + h[5]) / den - 0.5;
      fx = Math.min(Math.max(fx, 0), sw - 1.001); fy = Math.min(Math.max(fy, 0), sh - 1.001);
      const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      const o = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        od[o + c] = (sd[i00 + c] * (1 - ax) + sd[i10 + c] * ax) * (1 - ay) + (sd[i01 + c] * (1 - ax) + sd[i11 + c] * ax) * ay;
      }
      od[o + 3] = 255;
    }
  }
  return out;
}

// Scanner-style clean-up. The paper colour is estimated block by block (bright pixels only), smoothed,
// and divided out: that removes shadows and coloured light. Then the chosen look is applied.
function scClean(img, mode, strength) {
  if (mode === 'orig') return img;
  const { width: W, height: H, data: d } = img;
  const s = strength / 100;
  const B = Math.max(12, Math.round(Math.max(W, H) / 36));
  const gw = Math.ceil(W / B), gh = Math.ceil(H / B);
  const bg = new Float32Array(gw * gh * 3);
  const hist = new Uint32Array(64);
  for (let by = 0; by < gh; by++) {
    for (let bx = 0; bx < gw; bx++) {
      hist.fill(0);
      let n = 0;
      const x0 = bx * B, y0 = by * B, x1 = Math.min(W, x0 + B), y1 = Math.min(H, y0 + B);
      for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = (y * W + x) * 4; hist[(d[i] + d[i + 1] + d[i + 2]) / 12 | 0]++; n++; }
      let acc = 0, cut = 63;
      for (let k = 63; k >= 0; k--) { acc += hist[k]; if (acc >= n * 0.12) { cut = k; break; } }
      let r = 0, g = 0, b = 0, m = 0;
      for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
        const i = (y * W + x) * 4;
        if (((d[i] + d[i + 1] + d[i + 2]) / 12 | 0) >= cut) { r += d[i]; g += d[i + 1]; b += d[i + 2]; m++; }
      }
      const o = (by * gw + bx) * 3;
      bg[o] = m ? r / m : 255; bg[o + 1] = m ? g / m : 255; bg[o + 2] = m ? b / m : 255;
    }
  }
  // smooth the paper estimate, and never let a block that is all ink pull the paper dark
  for (let pass = 0; pass < 3; pass++) {
    const nb = new Float32Array(bg.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) for (let c = 0; c < 3; c++) {
      let sum = 0, cnt = 0, mx = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
        const v = bg[(yy * gw + xx) * 3 + c];
        sum += v; cnt++; mx = Math.max(mx, v);
      }
      nb[(y * gw + x) * 3 + c] = pass === 0 ? Math.max(sum / cnt, mx * 0.92) : sum / cnt;
    }
    bg.set(nb);
  }
  const t0 = 0.04 + 0.16 * s; // darkness treated as paper grain / printed lines
  // "Ink only": find the notebook's printed lines (rows / columns where faint ink runs across most of
  // the page) so they can be dropped while darker handwriting crossing them is kept.
  let lineRow = null, lineCol = null;
  if (mode === 'ink') {
    const dark = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const gy = Math.min(gh - 1, Math.max(0, Math.round((y + 0.5) / B - 0.5)));
      for (let x = 0; x < W; x++) {
        const gx = Math.min(gw - 1, Math.max(0, Math.round((x + 0.5) / B - 0.5)));
        const i = (y * W + x) * 4, o = (gy * gw + gx) * 3;
        const L = (Math.min(1, d[i] / Math.max(40, bg[o])) + Math.min(1, d[i + 1] / Math.max(40, bg[o + 1])) + Math.min(1, d[i + 2] / Math.max(40, bg[o + 2]))) / 3;
        dark[y * W + x] = 1 - L > 0.06 ? 1 : 0;
      }
    }
    const rows = new Uint8Array(H), cols = new Uint8Array(W);
    for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) n += dark[y * W + x]; if (n > W * 0.45) rows[y] = 1; }
    for (let x = 0; x < W; x++) { let n = 0; for (let y = 0; y < H; y++) n += dark[y * W + x]; if (n > H * 0.45) cols[x] = 1; }
    const grow = (a) => { const b = a.slice(); const r = Math.max(1, Math.round(Math.max(W, H) / 900)); for (let i = 0; i < a.length; i++) if (a[i]) for (let k = -r; k <= r; k++) if (a[i + k] !== undefined) b[i + k] = 1; return b; };
    lineRow = grow(rows); lineCol = grow(cols);
  }
  for (let y = 0; y < H; y++) {
    const gy = Math.min(gh - 1.001, Math.max(0, (y + 0.5) / B - 0.5)), y0 = gy | 0, ay = gy - y0;
    for (let x = 0; x < W; x++) {
      const gx = Math.min(gw - 1.001, Math.max(0, (x + 0.5) / B - 0.5)), x0 = gx | 0, ax = gx - x0;
      const i = (y * W + x) * 4;
      const n = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        const p00 = bg[(y0 * gw + x0) * 3 + c], p10 = bg[(y0 * gw + Math.min(gw - 1, x0 + 1)) * 3 + c];
        const p01 = bg[(Math.min(gh - 1, y0 + 1) * gw + x0) * 3 + c], p11 = bg[(Math.min(gh - 1, y0 + 1) * gw + Math.min(gw - 1, x0 + 1)) * 3 + c];
        const paper = Math.max(40, (p00 * (1 - ax) + p10 * ax) * (1 - ay) + (p01 * (1 - ax) + p11 * ax) * ay);
        n[c] = Math.min(1, d[i + c] / paper);
      }
      const L = (n[0] + n[1] + n[2]) / 3;
      if (mode === 'bw') {
        const v = L < 0.62 + 0.22 * s ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = v;
      } else if (mode === 'ink') {
        const k = 1 - L;
        let a = Math.min(1, Math.max(0, (k - t0) / 0.28));
        if ((lineRow[y] || lineCol[x]) && k < 0.5 + 0.1 * s) a = 0; // printed line, not handwriting
        const div = Math.max(a, 0.35);
        for (let c = 0; c < 3; c++) d[i + c] = Math.round(255 * Math.min(1, Math.max(0, 1 - (1 - n[c]) / div)));
        d[i + 3] = Math.round(a * 255);
      } else {
        const gain = mode === 'color' ? 1 + 0.35 * s : 1.15 + 0.9 * s;
        const floor = mode === 'color' ? t0 * 0.4 : t0;
        const out = n.map((v) => 1 - Math.min(1, Math.max(0, ((1 - v) - floor) * gain / (1 - floor))));
        const grey = (out[0] + out[1] + out[2]) / 3, sat = mode === 'color' ? 1.1 : 1.25;
        for (let c = 0; c < 3; c++) d[i + c] = Math.round(255 * Math.min(1, Math.max(0, grey + (out[c] - grey) * sat)));
      }
    }
  }
  return img;
}

function scProcess(srcCanvas, ph, maxOut) {
  const img = scClean(scWarp(srcCanvas, ph.corners, maxOut), SC.mode, SC.strength);
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------- the window
const scOpen = () => !!$('#modal .card.scan');
function openScan() {
  endEdit();
  hideMenu();
  Object.assign(SC, { photos: [], cur: 0, busy: false, name: `${L2(SCT.defName)} ${new Date().toLocaleDateString(LANG === 'hu' ? 'hu-HU' : 'en-GB')}` });
  const m = $('#modal');
  m.innerHTML = `<div class="card scan">
    <div class="card-head">
      <svg class="gear" viewBox="0 0 20 20"><path d="M3 6.5h3l1.5-2h5L14 6.5h3v9H3z"/><circle cx="10" cy="11" r="3"/></svg>
      <h3>${L2(SCT.title)}</h3>
      <input id="sc-name" class="fm-name" type="text" maxlength="80" value="${esc(SC.name)}" placeholder="${esc(L2(SCT.name))}">
      <button class="xbtn" data-sc="close">✕</button>
    </div>
    <div class="sc-main"></div>
    <div class="card-foot">
      <span class="muted small sc-status" style="margin-right:auto;align-self:center"></span>
      <button class="btn" data-sc="close">${L2(SCT.cancel)}</button>
      <button class="btn primary" data-sc="create" disabled>${L2(SCT.create)}</button>
    </div></div>
    <input type="file" id="sc-file" accept="image/*" multiple hidden>`;
  m.classList.remove('hidden');
  m.onclick = scClick;
  m.oninput = (e) => { if (e.target.id === 'sc-name') SC.name = e.target.value; if (e.target.dataset.scstr !== undefined) { SC.strength = +e.target.value; scPreviewSoon(SC.content === 'photo' ? 150 : 600); } };
  m.onchange = (e) => {
    if (e.target.id === 'sc-file') { scAdd([...e.target.files]); e.target.value = ''; }
    if (e.target.dataset.sctext !== undefined) { SC.readText = e.target.checked; scRender(); }
  };
  m.ondragover = (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); };
  m.ondrop = (e) => { e.preventDefault(); scAdd([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))); };
  scRender();
}

async function scAdd(files) {
  for (const file of files) {
    try {
      const bmp = await scLoad(file, 1400);
      const ph = { file, name: file.name, rot: 0, bmp };
      scPrepare(ph);
      SC.photos.push(ph);
      SC.cur = SC.photos.length - 1;
      scRender();
    } catch {
      toast(`${L2(SCT.bad)} ${file.name}`, true);
    }
  }
}
function scPrepare(ph) { // after loading or rotating: preview canvas, thumbnail, page corners
  ph.view = scRotated(ph.bmp, ph.rot);
  ph.corners = scDetect(ph.view);
  const t = document.createElement('canvas');
  const k = 160 / Math.max(ph.view.width, ph.view.height);
  t.width = Math.round(ph.view.width * k); t.height = Math.round(ph.view.height * k);
  t.getContext('2d').drawImage(ph.view, 0, 0, t.width, t.height);
  ph.thumb = t.toDataURL('image/jpeg', 0.8);
}

function scRender() {
  const main = $('.sc-main');
  if (!main) return;
  const n = SC.photos.length;
  const create = $('[data-sc="create"]');
  create.disabled = !n || SC.busy;
  create.textContent = `${L2(SC.target === 'new' ? SCT.create : SCT.addPages)}${n ? ` (${n})` : ''}`;
  if (!n) {
    main.innerHTML = `<div class="sc-empty"><svg viewBox="0 0 20 20"><path d="M3 6.5h3l1.5-2h5L14 6.5h3v9H3z"/><circle cx="10" cy="11" r="3"/></svg>
      <button class="btn primary" data-sc="pick">${L2(SCT.choose)}</button><p>${L2(SCT.drop)}</p><p class="muted small">${L2(SCT.tips)}</p></div>`;
    return;
  }
  const ph = SC.photos[SC.cur];
  const modes = [['scan', SCT.mScan], ['ink', SCT.mInk], ['bw', SCT.mBw], ['color', SCT.mColor], ['orig', SCT.mOrig]];
  const contents = [['photo', SCT.cPhoto], ['redraw', SCT.cRedraw], ['both', SCT.cBoth]];
  main.innerHTML = `
    <div class="sc-strip">
      ${SC.photos.map((p, i) => `<button class="sc-thumb ${i === SC.cur ? 'on' : ''}" data-scpick="${i}"><img src="${p.thumb}" alt=""><span>${i + 1}</span></button>`).join('')}
      <button class="btn sc-addbtn" data-sc="pick">${L2(SCT.add)}</button>
    </div>
    <div class="sc-edit">
      <div class="sc-canvas"><canvas id="sc-photo"></canvas><svg id="sc-quad"></svg></div>
      <p class="muted small" style="text-align:center;margin:6px 0">${L2(SCT.corners)}</p>
      <div class="btn-row" style="justify-content:center">
        <button class="btn icon" data-sc="up" title="${esc(L2(SCT.up))}">↑</button><button class="btn icon" data-sc="down" title="${esc(L2(SCT.down))}">↓</button>
        <button class="btn icon" data-sc="rotl" title="${esc(L2(SCT.rotL))}">⟲</button><button class="btn icon" data-sc="rotr" title="${esc(L2(SCT.rotR))}">⟳</button>
        <button class="btn" data-sc="find">${L2(SCT.find)}</button><button class="btn" data-sc="whole">${L2(SCT.whole)}</button>
        <button class="btn danger icon" data-sc="del" title="${esc(L2(SCT.del))}">✕</button>
      </div>
    </div>
    <div class="sc-side">
      <p class="insp-h">${L2(SCT.result)} · ${SC.cur + 1} / ${n}</p>
      <div class="sc-result"><canvas id="sc-out"></canvas></div>
      <p class="sc-note muted small"></p>
      <p class="insp-h" style="margin-top:14px">${L2(SCT.content)}</p>
      <div class="seg wrap">${contents.map(([k, l]) => `<button data-sccontent="${k}" class="${SC.content === k ? 'on' : ''}">${L2(l)}</button>`).join('')}</div>
      <p class="muted small">${L2(SCT.contentHint[SC.content])}</p>
      ${SC.content === 'photo' ? '' : `<label class="sc-check"><input type="checkbox" data-sctext ${SC.readText ? 'checked' : ''}> ${L2(SCT.readText)}</label>
      ${SC.readText ? '' : `<p class="muted small">${L2(SCT.readOff)}</p>`}`}
      ${SC.content === 'redraw' ? '' : `<p class="insp-h" style="margin-top:14px">${L2(SCT.cleanup)}</p>
      <div class="seg wrap">${modes.map(([k, l]) => `<button data-scmode="${k}" class="${SC.mode === k ? 'on' : ''}">${L2(l)}</button>`).join('')}</div>
      <p class="muted small">${L2(SCT.modeHint[SC.mode])}</p>`}
      ${SC.mode === 'orig' && SC.content !== 'redraw' ? '' : `<label class="fm-opt"><span>${L2(SC.content === 'redraw' ? SCT.sens : SCT.strength)}</span><div class="rng"><input type="range" min="0" max="100" step="5" value="${SC.strength}" data-scstr></div></label>`}
      <p class="insp-h" style="margin-top:14px">${L2(SCT.into)}</p>
      <div class="seg"><button data-sctarget="new" class="${SC.target === 'new' ? 'on' : ''}">${L2(SCT.newBook)}</button><button data-sctarget="here" class="${SC.target === 'here' ? 'on' : ''}">${L2(SCT.addTo)}</button></div>
    </div>`;
  scDrawPhoto();
  scPreviewSoon(0);
}

function scDrawPhoto() {
  const ph = SC.photos[SC.cur];
  const cv = $('#sc-photo'), box = $('.sc-canvas');
  if (!ph || !cv) return;
  const r = box.getBoundingClientRect();
  const k = Math.min((r.width || 500) / ph.view.width, (r.height || 500) / ph.view.height);
  cv.width = Math.round(ph.view.width * k); cv.height = Math.round(ph.view.height * k);
  cv.getContext('2d').drawImage(ph.view, 0, 0, cv.width, cv.height);
  const svg = $('#sc-quad');
  svg.setAttribute('viewBox', `0 0 ${cv.width} ${cv.height}`);
  svg.style.width = `${cv.width}px`; svg.style.height = `${cv.height}px`;
  scDrawQuad();
}
function scDrawQuad() {
  const ph = SC.photos[SC.cur], cv = $('#sc-photo'), svg = $('#sc-quad');
  if (!ph || !cv || !svg) return;
  const P2 = ph.corners.map(([x, y]) => [x * cv.width, y * cv.height]);
  svg.innerHTML = `<path class="sc-shade" fill-rule="evenodd" d="M0 0H${cv.width}V${cv.height}H0Z M${P2.map((p) => p.join(' ')).join('L')}Z"/>
    <polygon class="sc-poly" points="${P2.map((p) => p.join(',')).join(' ')}"/>
    ${P2.map(([x, y], i) => `<circle class="sc-h" data-corner="${i}" cx="${x}" cy="${y}" r="9"/>`).join('')}`;
}
// dragging a corner
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest && e.target.closest('.sc-h');
  if (!h || !scOpen()) return;
  e.preventDefault();
  const i = +h.dataset.corner, svg = $('#sc-quad');
  const move = (ev) => {
    const r = svg.getBoundingClientRect();
    SC.photos[SC.cur].corners[i] = [clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)];
    scDrawQuad();
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); scPreviewSoon(0); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

let scPrevTimer = 0;
function scPreviewSoon(ms = 150) {
  clearTimeout(scPrevTimer);
  scPrevTimer = setTimeout(() => {
    const ph = SC.photos[SC.cur], out = $('#sc-out');
    if (!ph || !out) return;
    if (SC.content !== 'photo') { scPreviewRedraw(ph, out); return; }
    $('.sc-note').textContent = '';
    const c = scProcess(ph.view, ph, 900);
    const box = $('.sc-result').getBoundingClientRect();
    const k = Math.min((box.width || 280) / c.width, 420 / c.height);
    out.width = Math.round(c.width * k); out.height = Math.round(c.height * k);
    const g = out.getContext('2d');
    g.clearRect(0, 0, out.width, out.height);
    g.drawImage(c, 0, 0, out.width, out.height);
    out.classList.toggle('ink', SC.mode === 'ink');
  }, ms);
}

// The redraw preview reads the page (a second or two), so only the latest request draws.
let scPrevToken = 0;
async function scPreviewRedraw(ph, out) {
  const token = ++scPrevToken;
  const note = $('.sc-note');
  note.textContent = SC.readText ? L2(SCT.reading) : L2(SCT.tracing);
  out.classList.add('busy');
  try {
    const ink = scClean(scWarp(ph.view, ph.corners, 1100), 'ink', SC.strength);
    const res = await redrawPage(ink, 800, { readText: SC.readText });
    if (token !== scPrevToken || !$('#sc-out')) return;
    const box = $('.sc-result').getBoundingClientRect();
    const k = Math.min((box.width || 280) / ink.width, 420 / ink.height);
    out.width = Math.round(ink.width * k); out.height = Math.round(ink.height * k);
    out.classList.remove('ink');
    redrawPreview(out, res, 800);
    note.textContent = res.readFailed ? L2(SCT.readFail) : SC.readText && res.texts.length ? L2(SCT.legend) : '';
  } catch (err) {
    if (token === scPrevToken && $('.sc-note')) $('.sc-note').textContent = String(err.message || err);
  } finally {
    if (token === scPrevToken && $('#sc-out')) $('#sc-out').classList.remove('busy');
  }
}

async function scClick(e) {
  const t = e.target;
  const pk = t.closest('[data-scpick]');
  if (pk) { SC.cur = +pk.dataset.scpick; scRender(); return; }
  const ct = t.closest('[data-sccontent]');
  if (ct) { SC.content = ct.dataset.sccontent; scRender(); return; }
  const md = t.closest('[data-scmode]');
  if (md) { SC.mode = md.dataset.scmode; scRender(); return; }
  const tg = t.closest('[data-sctarget]');
  if (tg) { SC.target = tg.dataset.sctarget; scRender(); return; }
  const b = t.closest('[data-sc]');
  if (!b || SC.busy) return;
  const ph = SC.photos[SC.cur];
  const swap = (j) => { if (j < 0 || j >= SC.photos.length) return; [SC.photos[SC.cur], SC.photos[j]] = [SC.photos[j], SC.photos[SC.cur]]; SC.cur = j; scRender(); };
  switch (b.dataset.sc) {
    case 'close': if (!SC.photos.length || confirm(L2(SCT.discard))) scClose(); break;
    case 'pick': $('#sc-file').click(); break;
    case 'up': swap(SC.cur - 1); break;
    case 'down': swap(SC.cur + 1); break;
    case 'rotl': case 'rotr': ph.rot += b.dataset.sc === 'rotl' ? -1 : 1; scPrepare(ph); scRender(); break;
    case 'find': ph.corners = scDetect(ph.view); scDrawQuad(); scPreviewSoon(0); break;
    case 'whole': ph.corners = [[0, 0], [1, 0], [1, 1], [0, 1]]; scDrawQuad(); scPreviewSoon(0); break;
    case 'del': ph.bmp.close(); SC.photos.splice(SC.cur, 1); SC.cur = Math.max(0, Math.min(SC.cur, SC.photos.length - 1)); scRender(); break;
    case 'create': scCreate(); break;
    default:
  }
}
function scClose() {
  for (const p of SC.photos) try { p.bmp.close(); } catch { /* already closed */ }
  SC.photos = [];
  closeModal();
}

// Build the pages: full-resolution processing, one photo at a time.
async function scCreate() {
  if (!SC.photos.length) return;
  SC.busy = true;
  scRender();
  const status = $('.sc-status');
  const isNew = SC.target === 'new';
  await flushSave();
  const proj = isNew ? newProject((SC.name || '').trim() || L2(SCT.defName)) : S.project;
  if (isNew) proj.pages = [];
  const first = proj.pages.length;
  let readFailed = false;
  const r = vp.getBoundingClientRect();
  try {
    for (let i = 0; i < SC.photos.length; i++) {
      const ph = SC.photos[i];
      status.textContent = `${L2(SCT.working)} ${i + 1} / ${SC.photos.length}…`;
      await frames(1);
      const full = await scLoad(ph.file, 2800);
      const src = scRotated(full, ph.rot);
      full.close();
      const pg = newPage(`${L2(SCT.page)} ${first + i + 1}`);
      const w = 800;
      let h = 0;
      if (SC.content !== 'redraw') {
        const c = scProcess(src, ph, 2000);
        const url = c.toDataURL('image/webp', 0.86);
        const name = await api.saveAsset(proj.id, uid(), url);
        ASSETS.set(`${proj.id}/${name}`, url);
        h = Math.round((800 * c.height) / c.width);
        pg.images.push({ id: uid(), asset: name, x: 0, y: 0, w, h });
      }
      if (SC.content !== 'photo') {
        status.textContent = `${L2(SC.readText ? SCT.readingN : SCT.working)} ${i + 1} / ${SC.photos.length}…`;
        await frames(1);
        const ink = scClean(scWarp(src, ph.corners, 1600), 'ink', SC.strength);
        const res = await redrawPage(ink, w, { readText: SC.readText });
        if (res.readFailed) readFailed = true;
        pg.strokes.push(...res.strokes);
        pg.texts.push(...res.texts);
        h = h || Math.round((w * ink.height) / ink.width);
      }
      const z = Math.min((r.width - 60) / w, (r.height - 60) / h, 1.5);
      pg.view = { x: (r.width - w * z) / 2, y: 30, z };
      proj.pages.push(pg);
    }
  } catch (err) {
    SC.busy = false;
    toast(String(err.message || err), true);
    scRender();
    return;
  }
  const firstId = proj.pages[first].id;
  scClose();
  if (isNew) {
    proj.updated = Date.now();
    await api.saveProject(proj);
    await refreshProjects();
    await openProject(proj.id);
    toast(L2(SCT.done));
    if (readFailed) toast(L2(SCT.readFail), true);
    openBook(); // starts closed, on the cover
  } else {
    scheduleSave();
    renderProjects();
    switchPage(firstId);
    toast(L2(SCT.added));
    if (readFailed) toast(L2(SCT.readFail), true);
  }
}
