// OhmNote — handwriting font maker. You write each character on a pad; OhmNote turns the strokes
// into a real font (.otf, via opentype.js).
//  - Pens: round, tapered, brush (pressure / speed) and calligraphy (broad nib at an angle).
//  - Cursive (folyóírás): every letter gets joining strokes that leave and arrive along the pen's own
//    direction. Letters that finish high (o, v, w…) join at a second, higher line, and the next letter
//    switches to a matching high-entry form automatically (OpenType contextual alternates).
//  - Randomness: up to three versions of every letter (written by you, or generated from the first)
//    that the font rotates through as you type, so repeated letters never look stamped.
'use strict';

const FM_LINES = { asc: 780, cap: 700, x: 450, base: 0, desc: -250 };
const FM_VIEW = { x: -420, y: -1000, w: 1840, h: 1400 }; // pad viewBox (SVG y = -font y)
const FM_SETS = [
  ['lower', ['Lowercase', 'Kisbetűk'], 'abcdefghijklmnopqrstuvwxyz'],
  ['marks', ['Accent marks', 'Ékezetjelek'], '´¨˝'],
  ['upper', ['Capitals', 'Nagybetűk'], 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  ['digits', ['Digits', 'Számjegyek'], '0123456789'],
  ['punct', ['Punctuation', 'Írásjelek'], '.,:;!?\'"-–()/+=%&@#*'],
  ['elec', ['Electronics', 'Elektronika'], 'Ωµ°±→'],
  ['hun', ['Hungarian letters (automatic)', 'Magyar betűk (automatikus)'], 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ'],
];
const FM_COMPOSE = {
  á: ['a', '´'], é: ['e', '´'], í: ['i', '´'], ó: ['o', '´'], ö: ['o', '¨'], ő: ['o', '˝'], ú: ['u', '´'], ü: ['u', '¨'], ű: ['u', '˝'],
  Á: ['A', '´'], É: ['E', '´'], Í: ['I', '´'], Ó: ['O', '´'], Ö: ['O', '¨'], Ő: ['O', '˝'], Ú: ['U', '´'], Ü: ['U', '¨'], Ű: ['U', '˝'],
};
const FM_ORDER = FM_SETS.map((s) => s[2]).join('');
const FM_SAMPLE = 'Árvíztűrő tükörfúrógép\nhello, mennyi az ellenállás?\nThe quick brown fox jumps over the lazy dog\nannanna  owowow  vivavu\n10 kΩ ± 5%  3,3 V  12 mA';
const FM_DEF = {
  style: 'print', nib: 'round', width: 60, angle: 35, taper: 55, smooth: 2, slant: 0, size: 100,
  spacing: 60, word: 300, lineH: 100,
  joinY: 30, hiJoins: true, joinHi: 400, tension: 55, joinThin: 70, reach: 40,
  rand: true, wobble: 35, rSize: 4, rRot: 3, bounce: 18, rSpace: 15, seed: 1,
  ctx: 'n', auto: false,
};
const FT = {
  title: ['Handwriting font', 'Kézírásos betűtípus'], name: ['Font name', 'Betűtípus neve'], defName: ['My handwriting', 'Saját kézírás'],
  print: ['Print', 'Nyomtatott'], cursive: ['Cursive (folyóírás)', 'Folyóírás'],
  tabPen: ['Pen', 'Toll'], tabJoins: ['Joins', 'Kötések'], tabRand: ['Randomness', 'Véletlen'], tabSpace: ['Spacing', 'Térköz'],
  nib: ['Pen type', 'Tolltípus'], nRound: ['Round', 'Kerek'], nTaper: ['Tapered', 'Elvékonyodó'], nBrush: ['Brush', 'Ecset'], nBroad: ['Calligraphy', 'Kalligráfia'],
  nibHint: ['Brush follows stylus pressure, or your speed with a mouse. Calligraphy is a flat nib held at an angle.',
    'Az ecset követi az érintőtoll nyomását, egérrel a sebességet. A kalligráfia egy ferdén tartott lapos toll.'],
  width: ['Thickness', 'Vastagság'], angle: ['Nib angle', 'Tollszög'], taper: ['Taper', 'Elvékonyodás'], smooth: ['Smoothing', 'Simítás'],
  slant: ['Slant', 'Dőlés'], size: ['Letter size', 'Betűméret'],
  spacing: ['Letter spacing', 'Betűköz'], word: ['Word spacing', 'Szóköz'], lineH: ['Line height', 'Sormagasság'],
  joinY: ['Low join height', 'Alsó kötés magassága'], hiJoins: ['High joins after o, v, w and other letters that end high', 'Felső kötés az o, v, w és más magasan végződő betűk után'],
  joinHi: ['High join height', 'Felső kötés magassága'], tension: ['Join smoothness', 'Kötés íve'], joinThin: ['Join thickness', 'Kötés vastagsága'],
  reach: ['Join length', 'Kötés hossza'], ctx: ['Show next to', 'Mellette'],
  printJoins: ['Joins are for cursive. Switch the style at the top to Cursive (folyóírás).', 'A kötések a folyóíráshoz tartoznak. Fent válts Folyóírásra.'],
  thisLetter: ['This letter', 'Ez a betű'], entry: ['Joins from the letter before', 'Kapcsolódik az előző betűhöz'], exit: ['Joins to the next letter', 'Kapcsolódás a következőhöz'],
  eAuto: ['Auto', 'Auto'], eLow: ['Low', 'Alul'], eHigh: ['High', 'Felül'], eNone: ['No', 'Nem'],
  rand: ['Use three versions of every letter', 'Minden betű három változatban'],
  randHint: ['Write up to three versions of a letter with the 1 2 3 buttons above the pad. Versions you do not write are made from version 1 with the amounts below. The font rotates through them as you type.',
    'A rajzlap feletti 1 2 3 gombokkal egy betű legfeljebb három változatát írhatod meg. A meg nem írt változatokat az 1-esből készíti el az alábbi mértékekkel. Gépeléskor a betűtípus váltogatja őket.'],
  wobble: ['Shape wobble', 'Alak remegése'], rSize: ['Size changes', 'Méretváltozás'], rRot: ['Tilt changes', 'Dőlésváltozás'],
  bounce: ['Baseline bounce', 'Alapvonal ugrálása'], rSpace: ['Spacing changes', 'Térközváltozás'], reshuffle: ['Reshuffle', 'Újrakeverés'],
  version: ['Version', 'Változat'], generated: ['made automatically', 'automatikus'],
  auto: ['Go to the next letter after a pause', 'Szünet után ugrás a következő betűre'],
  preview: ['Try it', 'Próba'], missing: ['Not written yet:', 'Még nincs megírva:'],
  clear: ['Clear', 'Törlés'], undo: ['Undo stroke', 'Vonás visszavonása'], prev: ['Previous', 'Előző'], next: ['Next', 'Következő'],
  save: ['Save', 'Mentés'], saveUse: ['Save and use for text', 'Mentés és használat szöveghez'], exp: ['Export .otf…', '.otf exportálása…'],
  cancel: ['Close', 'Bezárás'], saved: ['Font saved', 'Betűtípus mentve'], exported: ['Font exported', 'Betűtípus exportálva'],
  failed: ['Could not save the font:', 'Nem sikerült menteni a betűtípust:'],
  discard: ['Close without saving your letters?', 'Bezárod mentés nélkül a megírt betűket?'],
  empty: ['Write at least one letter first', 'Előbb írj meg legalább egy betűt'], progress: ['written', 'megírva'],
  hintPrint: ['Write the character between the lines. Lift the pen between strokes as you normally would.',
    'Írd a betűt a vonalak közé. Vonások között emeld fel a tollat, ahogy szoktad.'],
  hintCursive: ['Write it joined-up: start where the letter begins and finish where it would run into the next one. The faint joins show how it connects to its neighbours.',
    'Írd folyóírással: ott kezdd, ahol a betű kezdődik, és ott fejezd be, ahol a következőbe futna. A halvány kötések mutatják, hogyan kapcsolódik a szomszédaihoz.'],
  hintAuto: ['Made automatically from', 'Automatikusan készül ebből:'], hintOverride: ['Write here to draw it yourself instead.', 'Ha ide írsz, a saját változatod lesz érvényes.'],
  hintGen: ['This version is made from version 1. Write here to make your own.', 'Ez a változat az 1-esből készül. Ha ide írsz, saját változat lesz.'],
  keys: ['Enter / → next · ← previous · 1 2 3 version · Backspace undo · Del clear', 'Enter / → következő · ← előző · 1 2 3 változat · Backspace visszavonás · Del törlés'],
};

const FM = { open: false, tab: 'pen', v: 0 };
const fmOpen = () => FM.open && !!$('#modal .card.fm');

// ---------------------------------------------------------------- small helpers
const fmBox = (pts) => {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const [x, y] of pts) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
  return { x1, y1, x2, y2 };
};
function fmSimplify(pts, eps) { // Ramer–Douglas–Peucker
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [a, b];
  return [...fmSimplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...fmSimplify(pts.slice(idx), eps)];
}
const fmHash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const fmRng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const fmNorm = (dx, dy) => { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const fmIsLower = (ch) => ch.toLowerCase() === ch && ch.toUpperCase() !== ch;
const fmIsUpper = (ch) => ch.toUpperCase() === ch && ch.toLowerCase() !== ch;
const fmG = (ch) => FM.glyphs[ch];
const fmHas = (ch) => !!(fmG(ch) && fmG(ch).vs[0] && fmG(ch).vs[0].length);
const fmHasV = (ch, k) => !!(fmG(ch) && fmG(ch).vs[k] && fmG(ch).vs[k].length);
const fmVariants = () => (FM.rand ? 3 : 1);

// Which sides of a letter join (cursive only). Per-letter settings win, then the base letter's (for á, é…).
function fmJoins(ch) {
  const base = FM_COMPOSE[ch] ? FM_COMPOSE[ch][0] : ch;
  const g = fmG(ch) || {}, gb = fmG(base) || {};
  const entryDef = fmIsLower(base), exitDef = fmIsLower(base) || fmIsUpper(base) ? 'auto' : 'none';
  return { entry: g.entry ?? gb.entry ?? entryDef, exit: g.exit ?? gb.exit ?? exitDef };
}

// ---------------------------------------------------------------- strokes → glyph forms
const fmPrep = (pts) => fmSimplify(smoothPts(pts, FM.smooth), 2.5);

// Generated versions: smooth wobble along each stroke, plus small size / tilt / baseline changes.
function fmJitter(items, ch, k) {
  const rnd = fmRng(fmHash(ch) ^ Math.imul(k + 1, 0x9e3779b1) ^ Math.imul(FM.seed, 0x85ebca6b));
  const all = items.flatMap((s) => s.pts);
  if (!all.length) return items;
  const b = fmBox(all), cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
  const s = 1 + (rnd() * 2 - 1) * (FM.rSize / 100);
  const rot = ((rnd() * 2 - 1) * FM.rRot * Math.PI) / 180;
  const by = (rnd() * 2 - 1) * FM.bounce;
  const A = (FM.wobble / 100) * 22;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  return items.map((it) => {
    const ph1 = rnd() * 6.28, ph2 = rnd() * 6.28, f1 = 70 + rnd() * 60, f2 = 80 + rnd() * 70;
    let len = 0;
    return {
      ...it,
      pts: it.pts.map((p, i) => {
        if (i) len += Math.hypot(p[0] - it.pts[i - 1][0], p[1] - it.pts[i - 1][1]);
        let x = p[0] + A * Math.sin(len / f1 + ph1), y = p[1] + A * Math.sin(len / f2 + ph2);
        x = cx + (x - cx) * s; y *= s;
        const rx = cx + (x - cx) * cos - (y - cy) * sin, ry = cy + (x - cx) * sin + (y - cy) * cos;
        return [Math.round(rx), Math.round(ry + by), p[2]];
      }),
    };
  });
}

// Strokes of version k as written (font units); Hungarian letters are composed from base + accent.
function fmRaw(ch, k = 0) {
  if (fmHas(ch)) {
    const g = fmG(ch);
    if (fmHasV(ch, k) || k === 0) return g.vs[fmHasV(ch, k) ? k : 0].map((pts) => ({ pts: fmPrep(pts) }));
    return fmJitter(g.vs[0].map((pts) => ({ pts: fmPrep(pts) })), ch, k);
  }
  const c = FM_COMPOSE[ch];
  if (!c || !fmHas(c[1])) return null;
  let base = fmRaw(c[0], k);
  if (!base) return null;
  if (c[0] === 'i' && base.length > 1) { // í: drop the dot of the i
    base = base.filter((s) => { const b = fmBox(s.pts); return !(b.y1 > FM_LINES.x * 0.85 && b.x2 - b.x1 < 250 && b.y2 - b.y1 < 250); });
  }
  const acc = fmRaw(c[1], k);
  const bb = fmBox(base.flatMap((s) => s.pts)), ab = fmBox(acc.flatMap((s) => s.pts));
  const dx = (bb.x1 + bb.x2) / 2 - (ab.x1 + ab.x2) / 2;
  const top = fmIsUpper(c[0]) ? Math.max(bb.y2, FM_LINES.cap) : Math.max(bb.y2, FM_LINES.x);
  const dy = top + 70 - ab.y1;
  return [...base, ...acc.map((s) => ({ pts: s.pts.map(([x, y, p]) => [x + dx, y + dy, p]), mark: true }))];
}

const fmIsDot = (pts) => { const b = fmBox(pts); return Math.hypot(b.x2 - b.x1, b.y2 - b.y1) < 90; };

// A finished glyph form: version k, with a low or high entry join.
function fmForm(ch, k = 0, hi = false) {
  const raw = fmRaw(ch, k);
  if (!raw || !raw.length) return null;
  const sc = FM.size / 100, t = Math.tan((FM.slant * Math.PI) / 180);
  const items = raw.map((s) => ({ pts: s.pts.map(([x, y, p]) => [x * sc + y * sc * t, y * sc, p]), mark: s.mark }));
  const b = fmBox(items.flatMap((s) => s.pts));
  const half = FM.width / 2;
  const side = FM.spacing / 2 + half;
  const cursive = FM.style === 'cursive';
  const { entry, exit } = cursive ? fmJoins(ch) : { entry: false, exit: 'none' };
  const lead = half + FM.reach;
  const left = entry ? lead : side;
  const dx = left - b.x1;
  for (const s of items) s.pts = s.pts.map(([x, y, p]) => [x + dx, y, p]);
  let adv = left + (b.x2 - b.x1) + (exit !== 'none' ? lead : side);
  if (FM.rand && k > 0) adv += (fmRng(fmHash(ch) + k * 31 + FM.seed)() * 2 - 1) * FM.rSpace;
  const conns = [];
  let exitHigh = false;
  const body = items.filter((s) => !s.mark && s.pts.length && !fmIsDot(s.pts));
  if (cursive && body.length) {
    const tens = FM.tension / 100;
    const cubic = (a, c1, c2, e) => {
      const out = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16, v = 1 - u;
        out.push([0, 1].map((j) => v * v * v * a[j] + 3 * v * v * u * c1[j] + 3 * v * u * u * c2[j] + u * u * u * e[j]));
      }
      return out;
    };
    // where the pen starts and ends, and which way it is moving there
    const first = body[0].pts, last = body[body.length - 1].pts;
    const startP = first[0], startDir = first.length > 1 ? fmNorm(first[1][0] - first[0][0], first[1][1] - first[0][1]) : [1, 0];
    const ends = body.flatMap((s) => {
      const P = s.pts, n = P.length;
      return [{ p: P[n - 1], dir: n > 1 ? fmNorm(P[n - 1][0] - P[n - 2][0], P[n - 1][1] - P[n - 2][1]) : [1, 0] },
        { p: P[0], dir: n > 1 ? fmNorm(P[0][0] - P[1][0], P[0][1] - P[1][1]) : [1, 0] }];
    });
    if (entry) {
      const E = [0, hi ? FM.joinHi : FM.joinY];
      const d = Math.hypot(startP[0] - E[0], startP[1] - E[1]) * tens * 0.55;
      conns.push(cubic(E, [E[0] + d, E[1]], [startP[0] - startDir[0] * d, startP[1] - startDir[1] * d], startP));
    }
    if (exit !== 'none') {
      let ex = { p: last[last.length - 1], dir: last.length > 1 ? fmNorm(last[last.length - 1][0] - last[last.length - 2][0], last[last.length - 1][1] - last[last.length - 2][1]) : [1, 0] };
      if (exit === 'low') ex = ends.reduce((a, e) => (e.p[0] - 2 * e.p[1] > a.p[0] - 2 * a.p[1] ? e : a));
      if (exit === 'high') ex = ends.reduce((a, e) => (e.p[0] + e.p[1] > a.p[0] + a.p[1] ? e : a));
      exitHigh = exit === 'high' || (exit === 'auto' && FM.hiJoins && ex.p[1] > (FM.joinY + FM.joinHi) / 2);
      const X = [adv, exitHigh ? FM.joinHi : FM.joinY];
      const d = Math.hypot(X[0] - ex.p[0], X[1] - ex.p[1]) * tens * 0.55;
      conns.push(cubic(ex.p, [ex.p[0] + ex.dir[0] * d, ex.p[1] + ex.dir[1] * d], [X[0] - d, X[1]], X));
    }
  }
  return { items, conns, adv, dx, sc, t, exitHigh, entry, exit };
}

// ---------------------------------------------------------------- outlines
// Every pen is drawn as a union of simple shapes (circles, bands, parallelograms), all wound the
// same way; font renderers fill the union. Returns a list of polygons.
function fmOutline(strokes) {
  const polys = [];
  const r0 = FM.width / 2;
  const ccw = (poly) => {
    let a = 0;
    for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; a += x1 * y2 - x2 * y1; }
    if (Math.abs(a) < 0.5) return;
    polys.push(a < 0 ? poly.reverse() : poly);
  };
  const circle = (x, y, r, n = 10) => { if (r > 0.4) ccw(Array.from({ length: n }, (_, i) => [x + r * Math.cos((i / n) * 6.283), y + r * Math.sin((i / n) * 6.283)])); };
  // Pieces always overlap (a round cap at every point, bands stretched a little past each end):
  // shapes that only touch edge to edge leave hairline seams when the text is anti-aliased.
  const roundLine = (q, rs) => {
    for (let i = 0; i < q.length; i++) {
      circle(q[i][0], q[i][1], rs[i], rs[i] > 30 ? 12 : 8);
      if (i === q.length - 1) break;
      const [ax0, ay0] = q[i], [bx0, by0] = q[i + 1];
      const len = Math.hypot(bx0 - ax0, by0 - ay0);
      if (len < 0.5) continue;
      const ux = (bx0 - ax0) / len, uy = (by0 - ay0) / len, ext = Math.min(len * 0.25, 3);
      const ax = ax0 - ux * ext, ay = ay0 - uy * ext, bx = bx0 + ux * ext, by = by0 + uy * ext;
      const nx = -uy, ny = ux;
      ccw([[ax + nx * rs[i], ay + ny * rs[i]], [bx + nx * rs[i + 1], by + ny * rs[i + 1]], [bx - nx * rs[i + 1], by - ny * rs[i + 1]], [ax - nx * rs[i], ay - ny * rs[i]]]);
    }
  };
  for (const st of strokes) {
    const q = st.pts.filter((p, i) => i === 0 || Math.hypot(p[0] - st.pts[i - 1][0], p[1] - st.pts[i - 1][1]) > 0.5);
    if (!q.length) continue;
    if (FM.nib === 'broad') {
      const a = (FM.angle * Math.PI) / 180, mx = Math.cos(a) * r0, my = Math.sin(a) * r0;
      const hair = Math.max(4, r0 * 0.12);
      roundLine(q, q.map(() => hair));
      for (let i = 0; i < q.length - 1; i++) {
        const [ax0, ay0] = q[i], [bx0, by0] = q[i + 1];
        const len = Math.hypot(bx0 - ax0, by0 - ay0) || 1, ext = Math.min(len * 0.25, 3);
        const ux = ((bx0 - ax0) / len) * ext, uy = ((by0 - ay0) / len) * ext;
        const ax = ax0 - ux, ay = ay0 - uy, bx = bx0 + ux, by = by0 + uy;
        ccw([[ax + mx, ay + my], [bx + mx, by + my], [bx - mx, by - my], [ax - mx, ay - my]]);
      }
      if (q.length === 1) ccw([[q[0][0] + mx + hair, q[0][1] + my], [q[0][0] - mx + hair, q[0][1] - my], [q[0][0] - mx - hair, q[0][1] - my], [q[0][0] + mx - hair, q[0][1] + my]]);
      continue;
    }
    let rs;
    if (st.conn) rs = q.map(() => r0 * (FM.joinThin / 100));
    else if (FM.nib === 'taper') {
      const cum = [0];
      for (let i = 1; i < q.length; i++) cum.push(cum[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
      const T = cum[cum.length - 1] || 1, tl = Math.max(1, Math.min(T * 0.35, r0 * 7)), k = FM.taper / 100;
      rs = cum.map((c) => r0 * ((1 - k) + k * Math.max(0.15, Math.sqrt(Math.min(1, c / tl, (T - c) / tl)))));
    } else if (FM.nib === 'brush') {
      rs = q.map((p) => r0 * (0.3 + 1.15 * (p[2] ?? 0.6)));
      for (let n = 0; n < 2; n++) for (let i = 1; i < rs.length - 1; i++) rs[i] = (rs[i - 1] + 2 * rs[i] + rs[i + 1]) / 4;
    } else rs = q.map(() => r0);
    roundLine(q, rs);
  }
  return fmUnion(polys);
}
// Merge the overlapping pieces into one clean outline (holes wound the other way). Font renderers
// do not reliably fill overlapping contours, which shows up as speckles inside the strokes.
function fmUnion(polys) {
  if (!polys.length || typeof ClipperLib === 'undefined') return polys;
  const S = 8;
  const c = new ClipperLib.Clipper();
  c.AddPaths(polys.map((p) => p.map(([x, y]) => ({ X: Math.round(x * S), Y: Math.round(y * S) }))), ClipperLib.PolyType.ptSubject, true);
  const out = new ClipperLib.Paths();
  c.Execute(ClipperLib.ClipType.ctUnion, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return ClipperLib.Clipper.CleanPolygons(out, S * 0.7).filter((p) => p.length > 2).map((p) => p.map((pt) => [pt.X / S, pt.Y / S]));
}
const fmFormStrokes = (f) => [...f.items.map((s) => ({ pts: s.pts })), ...f.conns.map((pts) => ({ pts, conn: true }))];
function fmSvgD(polys, map = (p) => [p[0], -p[1]]) {
  let d = '';
  for (const poly of polys) {
    d += poly.map((p, i) => { const [x, y] = map(p); return `${i ? 'L' : 'M'}${Math.round(x)} ${Math.round(y)}`; }).join('') + 'Z';
  }
  return d;
}

// ---------------------------------------------------------------- building the font file
function fmChars() {
  const extra = Object.keys(FM.glyphs).filter((c) => !FM_ORDER.includes(c));
  return [...FM_ORDER, ...extra];
}
function fmBuildFont(family) {
  const nV = fmVariants();
  const cursive = FM.style === 'cursive';
  const list = []; // { name, unicode, form }
  const add = (o) => { list.push(o); return list.length - 1; };
  add({ name: '.notdef', adv: 500 });
  const sp = FM.style === 'cursive' ? FM.word : FM.word + FM.spacing / 2;
  const space = add({ name: 'space', unicode: 32, adv: sp });
  add({ name: 'uni00A0', unicode: 0xa0, adv: sp });
  const forms = {}; // ch -> { low: [ids], hi: [ids] }
  const cpName = (ch) => `uni${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
  for (const ch of fmChars()) {
    const f = fmForm(ch, 0, false);
    if (!f) continue;
    forms[ch] = { low: [add({ name: cpName(ch), unicode: ch.codePointAt(0), form: f })], hi: [] };
  }
  for (const ch of Object.keys(forms)) for (let k = 1; k < nV; k++) forms[ch].low.push(add({ name: `${cpName(ch)}.v${k}`, form: fmForm(ch, k, false) }));
  const hiOn = cursive && FM.hiJoins;
  if (hiOn) {
    for (const ch of Object.keys(forms)) {
      if (!list[forms[ch].low[0]].form.entry) continue;
      for (let k = 0; k < nV; k++) forms[ch].hi.push(add({ name: `${cpName(ch)}.hi${k ? `.v${k}` : ''}`, form: fmForm(ch, k, true) }));
    }
  }
  const G = (o) => new opentype.Glyph(o);
  const glyphs = list.map((o) => G({
    name: o.name, unicode: o.unicode, advanceWidth: Math.round(o.form ? o.form.adv : o.adv),
    path: (() => {
      const path = new opentype.Path();
      if (o.form) for (const poly of fmOutline(fmFormStrokes(o.form))) poly.forEach(([x, y], i) => (i ? path.lineTo(Math.round(x), Math.round(y)) : path.moveTo(Math.round(x), Math.round(y)))), path.close();
      return path;
    })(),
  }));
  // The names inside the file must be plain ASCII (the browser's font checker rejects "kézírás");
  // the name you typed is what OhmNote shows.
  const ascii = String(family).normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim() || 'OhmNote Handwriting';
  const lh = FM.lineH / 100;
  const font = new opentype.Font({
    familyName: ascii, styleName: 'Regular', postScriptName: `${ascii.replace(/[^A-Za-z0-9]/g, '').slice(0, 50) || 'OhmNoteHand'}-Regular`,
    unitsPerEm: 1000, ascender: Math.round(900 * lh), descender: Math.round(-300 * lh), glyphs,
  });

  // ---- contextual alternates (calt): rotate versions, and pick high-entry forms after high exits
  const lookups = [];
  const single = (pairs) => {
    pairs.sort((a, b) => a[0] - b[0]);
    lookups.push({ lookupType: 1, lookupFlag: 0, subtables: [{ substFormat: 2, coverage: { format: 1, glyphs: pairs.map((p) => p[0]) }, substitute: pairs.map((p) => p[1]) }] });
    return lookups.length - 1;
  };
  const cov = (ids) => ({ format: 1, glyphs: [...new Set(ids)].sort((a, b) => a - b) });
  const calt = [];
  const varied = Object.keys(forms).filter((ch) => forms[ch].low.length > 1);
  if (nV > 1 && varied.length) {
    const toV = [1, 2].map((k) => single(varied.map((ch) => [forms[ch].low[0], forms[ch].low[k]])));
    // each glyph gets a class 0–2; the class of the previous glyph picks the next letter's version
    const cls = new Map();
    for (const ch of Object.keys(forms)) forms[ch].low.forEach((id, k) => cls.set(id, (fmHash(ch) + FM.seed + k + 1) % 3));
    cls.set(space, 0);
    const subtables = [1, 2].map((r) => {
      const back = [...cls].filter(([, c]) => c === r).map(([id]) => id);
      return back.length ? { substFormat: 3, backtrackCoverage: [cov(back)], inputCoverage: [cov(varied.map((ch) => forms[ch].low[0]))], lookaheadCoverage: [], lookupRecords: [{ sequenceIndex: 0, lookupListIndex: toV[r - 1] }] } : null;
    }).filter(Boolean);
    if (subtables.length) { lookups.push({ lookupType: 6, lookupFlag: 0, subtables }); calt.push(lookups.length - 1); }
  }
  const withHi = Object.keys(forms).filter((ch) => forms[ch].hi.length);
  if (hiOn && withHi.length) {
    const toHi = single(withHi.flatMap((ch) => forms[ch].low.map((id, k) => [id, forms[ch].hi[k]])));
    const highExit = list.map((o, id) => (o.form && o.form.exitHigh ? id : -1)).filter((id) => id >= 0);
    if (highExit.length) {
      lookups.push({ lookupType: 6, lookupFlag: 0, subtables: [{ substFormat: 3, backtrackCoverage: [cov(highExit)], inputCoverage: [cov(withHi.flatMap((ch) => forms[ch].low))], lookaheadCoverage: [], lookupRecords: [{ sequenceIndex: 0, lookupListIndex: toHi }] }] });
      calt.push(lookups.length - 1);
    }
  }
  if (calt.length) {
    const langSys = { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [0] };
    font.tables.gsub = {
      version: 1,
      scripts: [{ tag: 'DFLT', script: { defaultLangSys: langSys, langSysRecords: [] } }, { tag: 'latn', script: { defaultLangSys: langSys, langSysRecords: [] } }],
      features: [{ tag: 'calt', feature: { featureParams: 0, lookupListIndexes: calt } }],
      lookups,
    };
  }
  return new Uint8Array(font.toArrayBuffer());
}

// ---------------------------------------------------------------- window
async function openFontMaker(id = null) {
  endEdit();
  hideMenu();
  let src = null;
  if (id) src = await api.fontSource(id);
  const existing = id && USER_FONTS.find((f) => f.id === id);
  Object.assign(FM, FM_DEF, {
    open: true, id, dirty: false, drawing: null, prevN: FM.prevN || 0, prevFamily: null,
    name: existing ? existing.name : L2(FT.defName), glyphs: {}, cur: 'a', v: 0, tab: FM.tab || 'pen', sample: FM.sample || FM_SAMPLE,
  });
  if (src) {
    for (const k of Object.keys(FM_DEF)) if (src[k] !== undefined) FM[k] = src[k];
    for (const [ch, g] of Object.entries(src.glyphs || {})) { // older files: { s, jl, jr }
      const vs = g.vs || [g.s || []];
      const n = { vs };
      if (g.entry !== undefined) n.entry = g.entry; else if (g.jl !== undefined) n.entry = g.jl;
      if (g.exit !== undefined) n.exit = g.exit; else if (g.jr === false) n.exit = 'none';
      FM.glyphs[ch] = n;
    }
  }
  const m = $('#modal');
  m.innerHTML = `<div class="card fm">
    <div class="card-head">
      <svg class="gear" viewBox="0 0 20 20"><path d="M4 16l1-4 8.5-8.5a2.1 2.1 0 013 3L8 15z M12 5l3 3"/></svg>
      <h3>${L2(FT.title)}</h3>
      <input id="fm-name" class="fm-name" type="text" spellcheck="false" maxlength="60" value="${esc(FM.name)}" placeholder="${esc(L2(FT.name))}">
      <div class="seg" id="fm-style"></div>
      <button class="xbtn" data-fm="close" title="${esc(L2(FT.cancel))}">✕</button>
    </div>
    <div class="fm-main">
      <div class="fm-chars"></div>
      <div class="fm-center">
        <div class="fm-hint"></div>
        <div class="fm-vers"></div>
        <div class="fm-padwrap"><svg class="fm-pad" viewBox="${FM_VIEW.x} ${FM_VIEW.y} ${FM_VIEW.w} ${FM_VIEW.h}"></svg></div>
        <div class="fm-bar">
          <button class="btn" data-fm="prev">← ${L2(FT.prev)}</button>
          <button class="btn" data-fm="undo">${L2(FT.undo)}</button>
          <button class="btn" data-fm="clear">${L2(FT.clear)}</button>
          <button class="btn primary" data-fm="next">${L2(FT.next)} →</button>
        </div>
        <div class="muted small" style="text-align:center">${L2(FT.keys)}</div>
      </div>
      <div class="fm-side"><div class="fm-tabs seg"></div><div class="fm-opts"></div>
        <p class="insp-h" style="margin-top:16px">${L2(FT.preview)}</p>
        <textarea class="fm-try" spellcheck="false">${esc(FM.sample)}</textarea>
        <p class="muted small fm-missing"></p>
      </div>
    </div>
    <div class="card-foot">
      <span class="muted small fm-progress" style="margin-right:auto;align-self:center"></span>
      <button class="btn" data-fm="export">${L2(FT.exp)}</button>
      <button class="btn" data-fm="save">${L2(FT.save)}</button>
      <button class="btn primary" data-fm="saveUse">${L2(FT.saveUse)}</button>
    </div></div>`;
  m.classList.remove('hidden');
  m.onclick = fmClick;
  m.oninput = fmInput;
  m.onchange = fmChange;
  const pad = $('.fm-pad');
  pad.addEventListener('pointerdown', fmDown);
  pad.addEventListener('pointermove', fmMove);
  pad.addEventListener('pointerup', fmUp);
  pad.addEventListener('pointercancel', fmUp);
  fmRenderAll();
  fmPreviewSoon(0);
}

function fmRenderAll() {
  $('#fm-style').innerHTML = ['print', 'cursive'].map((s) => `<button data-fmstyle="${s}" class="${FM.style === s ? 'on' : ''}">${L2(FT[s])}</button>`).join('');
  fmRenderChars();
  fmRenderPad();
  fmRenderSide();
}

function fmThumb(ch) {
  const raw = fmRaw(ch, 0);
  if (!raw) return '';
  return `<svg viewBox="-100 -950 1200 1250"><path d="${fmSvgD(fmOutline(raw.map((s) => ({ pts: s.pts }))))}" fill="currentColor"/></svg>`;
}
function fmRenderChars() {
  const box = $('.fm-chars');
  if (!box) return;
  const extra = Object.keys(FM.glyphs).filter((c) => !FM_ORDER.includes(c));
  const sets = extra.length ? [...FM_SETS, ['extra', ['More', 'Egyéb'], extra.join('')]] : FM_SETS;
  const top = box.scrollTop;
  box.innerHTML = sets.map(([k, name, chars]) => `<div class="fm-grp"><h6>${L2(name)}</h6><div class="fm-tiles">${[...chars].map((ch) => {
    const own = fmHas(ch), auto = !own && !!fmRaw(ch);
    const nv = own ? [0, 1, 2].filter((v) => fmHasV(ch, v)).length : 0;
    return `<button class="fm-tile ${own ? 'done' : ''} ${auto ? 'auto' : ''} ${FM.cur === ch ? 'on' : ''}" data-ch="${esc(ch)}" title="${esc(ch)}">${own || auto ? fmThumb(ch) : `<span class="ch">${esc(ch)}</span>`}${FM.rand && nv > 1 ? `<i class="nv">${nv}</i>` : ''}</button>`;
  }).join('')}</div></div>`).join('');
  box.scrollTop = top;
  const n = [...FM_ORDER].filter((c) => !FM_COMPOSE[c] && fmHas(c)).length;
  const total = [...FM_ORDER].filter((c) => !FM_COMPOSE[c]).length;
  $('.fm-progress').textContent = `${n} / ${total} ${L2(FT.progress)}`;
  const on = box.querySelector('.fm-tile.on');
  if (on) on.scrollIntoView({ block: 'nearest' });
}

function fmRenderPad() {
  const pad = $('.fm-pad');
  if (!pad) return;
  const ch = FM.cur, k = FM.v;
  const cursive = FM.style === 'cursive';
  const L = FM_LINES;
  const X1 = FM_VIEW.x, X2 = FM_VIEW.x + FM_VIEW.w;
  const line = (y, cls, label = '') => `<path class="${cls}" d="M${X1} ${-y}H${X2}"/>${label ? `<text class="g-lbl" x="${X1 + 14}" y="${-y - 12}">${label}</text>` : ''}`;
  const tpl = cursive ? '"Segoe Script", "Ink Free", cursive' : '"Segoe UI", sans-serif';
  let h = `<rect class="g-bg" x="${X1}" y="${FM_VIEW.y}" width="${FM_VIEW.w}" height="${FM_VIEW.h}"/>
    <text class="g-tpl" x="120" y="0" font-family='${tpl}' font-size="1000">${esc(ch)}</text>
    ${line(L.asc, 'g-line')}${line(L.cap, 'g-line g-dash')}${line(L.x, 'g-x', 'x')}${line(L.base, 'g-base')}${line(L.desc, 'g-line')}`;
  if (cursive) {
    h += line(FM.joinY, 'g-join');
    if (FM.hiJoins) h += line(FM.joinHi, 'g-join g-join-hi');
  }
  const own = fmHasV(ch, k) || (k === 0 && fmHas(ch));
  // the neighbour shown before this letter decides whether this letter uses its high entry
  const ctx = cursive && FM.ctx && FM.ctx !== ch ? FM.ctx : null;
  const before = ctx ? fmForm(ctx, 0, false) : null;
  const geo = fmForm(ch, k, !!(before && before.exitHigh && FM.hiJoins));
  if (geo) {
    const back = ([x, y]) => { const yy = y / geo.sc; return [(x - geo.dx) / geo.sc - yy * geo.t, -yy]; };
    if (before) h += `<path class="g-ctx" d="${fmSvgD(fmOutline(fmFormStrokes(before)), ([x, y]) => back([x - before.adv, y]))}"/>`;
    if (ctx) {
      const after = fmForm(ctx, 0, geo.exitHigh && FM.hiJoins);
      if (after) h += `<path class="g-ctx" d="${fmSvgD(fmOutline(fmFormStrokes(after)), ([x, y]) => back([x + geo.adv, y]))}"/>`;
    }
    if (geo.conns.length) h += `<path class="g-conn" d="${fmSvgD(fmOutline(geo.conns.map((pts) => ({ pts, conn: true }))), back)}"/>`;
    h += `<path class="g-adv" d="M${-geo.dx / geo.sc} ${-L.asc}V${-L.desc}M${(geo.adv - geo.dx) / geo.sc} ${-L.asc}V${-L.desc}"/>`;
    if (!own) h += `<path class="g-auto" d="${fmSvgD(fmOutline(fmRaw(ch, k).map((s) => ({ pts: s.pts }))))}"/>`;
  }
  const mine = own ? fmG(ch).vs[fmHasV(ch, k) ? k : 0] : [];
  h += `<path class="g-ink" d="${own ? fmSvgD(fmOutline(mine.map((pts) => ({ pts: fmPrep(pts) })))) : ''}"/>
    <path class="g-live" stroke-width="${FM.width}" d=""/>`;
  pad.innerHTML = h;
  const comp = FM_COMPOSE[ch];
  let hint = L2(cursive ? FT.hintCursive : FT.hintPrint);
  if (!fmHas(ch) && comp && geo) hint = `${L2(FT.hintAuto)} <b>${esc(comp[0])}</b> + <b>${esc(comp[1])}</b>. ${L2(FT.hintOverride)}`;
  else if (k > 0 && !fmHasV(ch, k) && geo) hint = L2(FT.hintGen);
  $('.fm-hint').innerHTML = `<span class="fm-big">${esc(ch)}</span><span>${hint}</span>`;
  $('.fm-vers').innerHTML = FM.rand ? `<span class="muted small">${L2(FT.version)}</span><div class="seg">${[0, 1, 2].map((v) =>
    `<button data-fmv="${v}" class="${FM.v === v ? 'on' : ''}">${v + 1}${v && !fmHasV(ch, v) ? ' ·' : ''}</button>`).join('')}</div>
    ${k > 0 && !fmHasV(ch, k) ? `<span class="muted small">${L2(FT.generated)}</span>` : ''}` : '';
}

function fmRenderSide() {
  const box = $('.fm-opts');
  if (!box) return;
  const tabs = [['pen', FT.tabPen], ['joins', FT.tabJoins], ['rand', FT.tabRand], ['space', FT.tabSpace]];
  $('.fm-tabs').innerHTML = tabs.map(([k, l]) => `<button data-fmtab="${k}" class="${FM.tab === k ? 'on' : ''}">${L2(l)}</button>`).join('');
  const rng = (k, min, max, step, unit = '', off = false) => `<label class="fm-opt ${off ? 'off' : ''}"><span>${L2(FT[k])}</span><div class="rng"><input type="range" data-fmopt="${k}" min="${min}" max="${max}" step="${step}" value="${FM[k]}"><output>${FM[k]}${unit}</output></div></label>`;
  const chk = (k, attr) => `<label class="check"><input type="checkbox" ${attr} ${FM[k] ? 'checked' : ''}> ${L2(FT[k])}</label>`;
  let h = '';
  if (FM.tab === 'pen') {
    h += `<div class="fm-opt"><span>${L2(FT.nib)}</span><div class="seg wrap">${[['round', FT.nRound], ['taper', FT.nTaper], ['brush', FT.nBrush], ['broad', FT.nBroad]].map(([k, l]) =>
      `<button data-fmnib="${k}" class="${FM.nib === k ? 'on' : ''}">${L2(l)}</button>`).join('')}</div><p class="muted small" style="margin:6px 0 0">${L2(FT.nibHint)}</p></div>`;
    h += rng('width', 16, 150, 2);
    if (FM.nib === 'broad') h += rng('angle', -80, 80, 1, '°');
    if (FM.nib === 'taper') h += rng('taper', 0, 100, 5, '%');
    h += rng('smooth', 0, 6, 1) + rng('slant', -20, 30, 1, '°') + rng('size', 60, 140, 2, '%');
    h += chk('auto', 'data-fmauto');
  } else if (FM.tab === 'joins') {
    if (FM.style !== 'cursive') h += `<p class="muted" style="margin-top:12px">${L2(FT.printJoins)}</p>`;
    else {
      const { entry, exit } = fmJoins(FM.cur);
      h += rng('joinY', -20, 250, 5) + `<label class="check"><input type="checkbox" data-fmbool="hiJoins" ${FM.hiJoins ? 'checked' : ''}> ${L2(FT.hiJoins)}</label>`;
      h += rng('joinHi', 250, 650, 5, '', !FM.hiJoins) + rng('tension', 0, 100, 5, '%') + rng('joinThin', 25, 100, 5, '%') + rng('reach', 0, 160, 5);
      h += `<label class="fm-opt"><span>${L2(FT.ctx)}</span><input class="fm-ctx" type="text" maxlength="1" value="${esc(FM.ctx)}" spellcheck="false"></label>`;
      h += `<p class="insp-h" style="margin-top:16px">${L2(FT.thisLetter)}: ${esc(FM.cur)}</p>
        <label class="check"><input type="checkbox" data-fmentry ${entry ? 'checked' : ''}> ${L2(FT.entry)}</label>
        <div class="fm-opt"><span>${L2(FT.exit)}</span><div class="seg">${[['auto', FT.eAuto], ['low', FT.eLow], ['high', FT.eHigh], ['none', FT.eNone]].map(([k, l]) =>
          `<button data-fmexit="${k}" class="${exit === k ? 'on' : ''}">${L2(l)}</button>`).join('')}</div></div>`;
    }
  } else if (FM.tab === 'rand') {
    h += `<label class="check" style="margin-top:12px"><input type="checkbox" data-fmbool="rand" ${FM.rand ? 'checked' : ''}> ${L2(FT.rand)}</label>
      <p class="muted small">${L2(FT.randHint)}</p>`;
    h += rng('wobble', 0, 100, 5, '%', !FM.rand) + rng('rSize', 0, 15, 1, '%', !FM.rand) + rng('rRot', 0, 10, 1, '°', !FM.rand) + rng('bounce', 0, 60, 2, '', !FM.rand) + rng('rSpace', 0, 60, 2, '', !FM.rand);
    h += `<button class="btn" data-fm="reshuffle" ${FM.rand ? '' : 'disabled'}>${L2(FT.reshuffle)}</button>`;
  } else {
    h += rng('spacing', 0, 240, 5) + rng('word', 120, 700, 10) + rng('lineH', 70, 160, 5, '%');
  }
  box.innerHTML = h;
  const missing = [...FM_ORDER].filter((c) => !fmRaw(c));
  $('.fm-missing').innerHTML = missing.length ? `${L2(FT.missing)} <span class="mono">${esc(missing.join(' '))}</span>` : '';
  fmApplyPreviewFont();
}

// ---------------------------------------------------------------- live preview font
let fmPrevTimer = 0;
function fmPreviewSoon(ms = 350) {
  clearTimeout(fmPrevTimer);
  fmPrevTimer = setTimeout(fmPreview, ms);
}
async function fmPreview() {
  if (!fmOpen()) return;
  try {
    const fam = `ohm-fm-prev-${++FM.prevN}`;
    const face = new FontFace(fam, fmBuildFont(fam));
    await face.load();
    document.fonts.add(face);
    const old = FM.prevFamily;
    FM.prevFamily = fam;
    fmApplyPreviewFont();
    if (old) for (const f of [...document.fonts]) if (f.family.replace(/"/g, '') === old) document.fonts.delete(f);
  } catch (err) {
    console.warn('font preview failed', err);
  }
}
function fmApplyPreviewFont() {
  const ta = $('.fm-try');
  if (ta) ta.style.fontFamily = FM.prevFamily ? `"${FM.prevFamily}", "Ink Free", cursive` : '"Ink Free", cursive';
}

// ---------------------------------------------------------------- writing on the pad
function fmPoint(e, prev) {
  const pad = $('.fm-pad');
  const pt = pad.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const p = pt.matrixTransform(pad.getScreenCTM().inverse());
  const x = Math.round(p.x), y = Math.round(-p.y);
  let pr;
  if (e.pointerType === 'pen' && e.pressure > 0) pr = e.pressure;
  else if (prev) { // mouse / finger: slower = heavier, like a brush
    const dt = Math.max(1, e.timeStamp - prev.t);
    pr = clamp(1.1 - (Math.hypot(x - prev.p[0], y - prev.p[1]) / dt) * 0.3, 0.2, 1);
  } else pr = 0.7;
  return [x, y, Math.round(pr * 100) / 100];
}
function fmDown(e) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  e.preventDefault();
  $('.fm-pad').setPointerCapture(e.pointerId);
  clearTimeout(FM.autoTimer);
  const p = fmPoint(e);
  FM.drawing = [p];
  FM.last = { p, t: e.timeStamp };
  fmDrawLive();
}
function fmMove(e) {
  if (!FM.drawing) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  for (const ev of evs.length ? evs : [e]) {
    const p = fmPoint(ev, FM.last), l = FM.drawing[FM.drawing.length - 1];
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 4) { FM.drawing.push(p); FM.last = { p, t: ev.timeStamp }; }
  }
  fmDrawLive();
}
function fmDrawLive() {
  const live = $('.fm-pad .g-live');
  if (live && FM.drawing) live.setAttribute('d', strokePath(FM.drawing.map(([x, y]) => [x, -y])));
}
function fmUp() {
  if (!FM.drawing) return;
  let pts = FM.drawing;
  FM.drawing = null;
  if (pts.length === 1) pts = [pts[0], [pts[0][0] + 1, pts[0][1], pts[0][2]]];
  pts = fmSimplify(pts, 1.2);
  const g = (FM.glyphs[FM.cur] ||= { vs: [[]] });
  while (g.vs.length <= FM.v) g.vs.push([]);
  if (FM.v > 0 && !g.vs[0].length) FM.v = 0; // version 1 always comes first
  g.vs[FM.v].push(pts);
  FM.dirty = true;
  fmAfterChange();
  if (FM.auto) FM.autoTimer = setTimeout(() => fmGo(1), 1300);
}
function fmAfterChange() {
  fmRenderPad();
  fmRenderChars();
  fmRenderSide();
  fmPreviewSoon();
}
function fmGo(dir) {
  clearTimeout(FM.autoTimer);
  const list = fmChars();
  const i = list.indexOf(FM.cur);
  FM.cur = list[(i + dir + list.length) % list.length];
  FM.v = 0;
  fmRenderPad();
  fmRenderChars();
  fmRenderSide();
}
function fmUndo() {
  const g = fmG(FM.cur);
  if (!g || !g.vs[FM.v] || !g.vs[FM.v].length) return;
  g.vs[FM.v].pop();
  FM.dirty = true;
  fmAfterChange();
}
function fmClear() {
  const g = fmG(FM.cur);
  if (!g || !g.vs[FM.v] || !g.vs[FM.v].length) return;
  g.vs[FM.v] = [];
  FM.dirty = true;
  fmAfterChange();
}

function fmClose(force = false) {
  if (!force && FM.dirty && !confirm(L2(FT.discard))) return;
  clearTimeout(FM.autoTimer);
  clearTimeout(fmPrevTimer);
  if (FM.prevFamily) for (const f of [...document.fonts]) if (f.family.replace(/"/g, '') === FM.prevFamily) document.fonts.delete(f);
  FM.open = false;
  openSettings('fonts');
}

function fmSource() {
  const src = {};
  for (const k of Object.keys(FM_DEF)) src[k] = FM[k];
  src.glyphs = FM.glyphs;
  return src;
}
async function fmSave(use) {
  if (!Object.keys(FM.glyphs).some(fmHas)) { toast(L2(FT.empty), true); return; }
  const name = ($('#fm-name').value.trim() || L2(FT.defName)).slice(0, 60);
  const existing = FM.id && USER_FONTS.find((f) => f.id === FM.id);
  const meta = { id: FM.id || `h${uid()}`, name, kind: 'hand', ext: 'otf', created: existing ? existing.created : Date.now(), updated: Date.now(), source: fmSource() };
  try {
    const bytes = fmBuildFont(name);
    await registerFont(meta, bytes); // check the browser accepts it before writing it to disk
    await api.saveFont(meta, bytes);
  } catch (err) {
    toast(`${L2(FT.failed)} ${String(err.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')}`, true);
    return;
  }
  FM.id = meta.id;
  FM.dirty = false;
  if (use) { P.textFont = P.notesFont = fontKey(meta.id); savePrefsSoon(); }
  onPrefsChanged();
  toast(L2(FT.saved));
  if (use) fmClose(true);
}

function fmSet(k, v, side = true) {
  FM[k] = v;
  FM.dirty = true;
  fmRenderPad();
  if (side) fmRenderSide();
  fmRenderChars();
  fmPreviewSoon(150);
}
function fmClick(e) {
  const t = e.target;
  const tile = t.closest('[data-ch]');
  if (tile) { clearTimeout(FM.autoTimer); FM.cur = tile.dataset.ch; FM.v = 0; fmRenderPad(); fmRenderChars(); fmRenderSide(); return; }
  const st = t.closest('[data-fmstyle]');
  if (st) { FM.style = st.dataset.fmstyle; FM.dirty = true; fmRenderAll(); fmPreviewSoon(0); return; }
  const tab = t.closest('[data-fmtab]');
  if (tab) { FM.tab = tab.dataset.fmtab; fmRenderSide(); return; }
  const nib = t.closest('[data-fmnib]');
  if (nib) { fmSet('nib', nib.dataset.fmnib); return; }
  const v = t.closest('[data-fmv]');
  if (v) { FM.v = +v.dataset.fmv; fmRenderPad(); return; }
  const ex = t.closest('[data-fmexit]');
  if (ex) { const g = (FM.glyphs[FM.cur] ||= { vs: [[]] }); g.exit = ex.dataset.fmexit; fmSet('dirty', true); return; }
  const b = t.closest('[data-fm]');
  if (!b) return;
  switch (b.dataset.fm) {
    case 'close': fmClose(); break;
    case 'prev': fmGo(-1); break;
    case 'next': fmGo(1); break;
    case 'undo': fmUndo(); break;
    case 'clear': fmClear(); break;
    case 'reshuffle': fmSet('seed', (FM.seed % 997) + 1); break;
    case 'save': fmSave(false); break;
    case 'saveUse': fmSave(true); break;
    case 'export': {
      if (!Object.keys(FM.glyphs).some(fmHas)) { toast(L2(FT.empty), true); return; }
      const name = $('#fm-name').value.trim() || L2(FT.defName);
      api.exportBinary(fmBuildFont(name), name, 'otf', 'OpenType').then((ok) => ok && toast(L2(FT.exported)));
      break;
    }
    default:
  }
}
function fmInput(e) {
  const t = e.target;
  if (t.classList.contains('fm-try')) { FM.sample = t.value; return; }
  if (t.id === 'fm-name') { FM.dirty = true; return; }
  if (t.classList.contains('fm-ctx')) { FM.ctx = t.value; fmRenderPad(); return; }
  const k = t.dataset.fmopt;
  if (!k) return;
  t.nextElementSibling.textContent = `${t.value}${{ slant: '°', angle: '°', rRot: '°', taper: '%', size: '%', tension: '%', joinThin: '%', wobble: '%', rSize: '%', lineH: '%' }[k] || ''}`;
  fmSet(k, +t.value, false);
}
function fmChange(e) {
  const t = e.target;
  if (t.dataset.fmentry !== undefined) {
    const g = (FM.glyphs[FM.cur] ||= { vs: [[]] });
    g.entry = t.checked;
    fmSet('dirty', true);
  } else if (t.dataset.fmbool) {
    fmSet(t.dataset.fmbool, t.checked);
    if (t.dataset.fmbool === 'rand' && !FM.rand) FM.v = 0;
  } else if (t.dataset.fmauto !== undefined) {
    FM.auto = t.checked;
  }
}

// Keys while the maker is open (called from the app's key handler).
function fmKey(e) {
  const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  if (e.key === 'Escape') { if (typing) e.target.blur(); else fmClose(); e.preventDefault(); return; }
  if (typing) return;
  if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); fmGo(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); fmGo(-1); }
  else if (FM.rand && ['1', '2', '3'].includes(e.key)) { FM.v = +e.key - 1; fmRenderPad(); }
  else if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) { e.preventDefault(); fmUndo(); }
  else if (e.key === 'Delete') { e.preventDefault(); fmClear(); }
}
