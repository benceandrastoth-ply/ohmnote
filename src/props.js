// OhmNote — part properties: what each kind of part can be set to (resistance, tolerance, voltage…),
// how values are typed and shown (4.7k, 4k7, 4.7 kΩ), standard E-series values and resistor colour bands.
'use strict';

// ---------------------------------------------------------------- quantities
const SI_STEPS = [['p', 1e-12], ['n', 1e-9], ['µ', 1e-6], ['m', 1e-3], ['', 1], ['k', 1e3], ['M', 1e6], ['G', 1e9]];
const SI_MUL = { p: 1e-12, n: 1e-9, 'µ': 1e-6, u: 1e-6, m: 1e-3, '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };

// "4.7k", "4k7", "4,7 kΩ", "100n", "0.1uF", "2M2", "4R7", "15 mA", "16MHz" → number (or null)
function parseQty(str) {
  let s = String(str ?? '').trim().replace(/\s+/g, '').replace(',', '.');
  if (!s) return null;
  let m = /^(\d+)([pnuµmkKMGRVAFHW])(\d+)$/.exec(s); // 4k7, 4R7, 3V3, 4n7
  if (m) return parseFloat(`${m[1]}.${m[3]}`) * (SI_MUL[m[2]] ?? 1);
  s = s.replace(/(ohms?|Ω|Hz|VA|Ah|°C|F|H|V|A|W)$/i, '');
  m = /^(\d*\.?\d+(?:e[-+]?\d+)?)([pnuµmkKMG]?)$/.exec(s);
  if (m) return parseFloat(m[1]) * SI_MUL[m[2]];
  return null;
}
function siSplit(v) {
  let step = SI_STEPS[4];
  for (const s of SI_STEPS) if (Math.abs(v) >= s[1] * 0.9995) step = s;
  let n = +(v / step[1]).toPrecision(3);
  if (Math.abs(n) >= 1000) { const i = SI_STEPS.indexOf(step); if (i < SI_STEPS.length - 1) { step = SI_STEPS[i + 1]; n = +(v / step[1]).toPrecision(3); } }
  return [String(n), step[0]];
}
// Value as shown on the schematic, in the chosen style.
function fmtQty(v, unit, style = P.valueStyle) {
  if (v == null || !Number.isFinite(v)) return '';
  const [num, p] = v === 0 ? ['0', ''] : siSplit(v);
  if (style === 'unit') return `${num} ${p}${unit}`;
  const quiet = unit === 'Ω' || (unit === 'F' && style === 'rkm');
  if (style === 'rkm' && num.includes('.')) {
    const sep = p || (unit === 'Ω' ? 'R' : unit);
    return num.replace('.', sep) + (p && !quiet ? unit : '');
  }
  return `${num}${p}${quiet ? '' : unit}`;
}
// For editing: number and prefix only ("4.7k"), the unit is shown next to the box.
const fmtNum = (v) => { if (v == null || !Number.isFinite(v)) return ''; const [n, p] = v === 0 ? ['0', ''] : siSplit(v); return `${n}${p}`; };

// ---------------------------------------------------------------- standard values
const E_SERIES = {
  E6: [10, 15, 22, 33, 47, 68],
  E12: [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82],
  E24: [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91],
};
function eValues(series, lo, hi) {
  const out = [];
  for (let dec = Math.floor(Math.log10(lo)) - 1; dec <= Math.ceil(Math.log10(hi)); dec++) {
    for (const b of E_SERIES[series]) { const v = +(b * 10 ** (dec - 1)).toPrecision(3); if (v >= lo && v <= hi) out.push(v); }
  }
  return out;
}
function eNearest(v, series) {
  const all = eValues(series, v / 20, v * 20);
  return all.reduce((a, b) => (Math.abs(Math.log(b / v)) < Math.abs(Math.log(a / v)) ? b : a), all[0]);
}
function eStep(v, dir, series) {
  const all = eValues(series, (v || 1) / 20, (v || 1) * 20);
  if (dir > 0) return all.find((x) => x > v * 1.0001) ?? v;
  return [...all].reverse().find((x) => x < v * 0.9999) ?? v;
}

// ---------------------------------------------------------------- what each part can be set to
const pQ = (k, l, unit, def, x = {}) => ({ k, l, type: 'qty', unit, def, ...x });
const pS = (k, l, opts, def, x = {}) => ({ k, l, type: 'sel', opts: opts.map((o) => (Array.isArray(o) ? o : [o, o])), def, ...x });
const pT = (k, l, def = '', x = {}) => ({ k, l, type: 'text', def, ...x });
const pN = (k, l, unit, def, x = {}) => ({ k, l, type: 'num', unit, def, ...x });
const PL = {
  r: ['Resistance', 'Ellenállás'], tol: ['Tolerance', 'Tűrés'], pw: ['Power rating', 'Terhelhetőség'], tech: ['Type', 'Típus'], bands: ['Colour bands', 'Színgyűrűk'],
  c: ['Capacitance', 'Kapacitás'], v: ['Voltage', 'Feszültség'], vmax: ['Voltage rating', 'Feszültségtűrés'], diel: ['Dielectric', 'Dielektrikum'], temp: ['Temperature rating', 'Hőmérséklet-tűrés'],
  l: ['Inductance', 'Induktivitás'], i: ['Current', 'Áram'], imax: ['Current rating', 'Áramterhelhetőség'], dcr: ['DC resistance', 'DC ellenállás'],
  f: ['Frequency', 'Frekvencia'], cl: ['Load capacitance', 'Terhelő kapacitás'], kind: ['Kind', 'Fajta'], speed: ['Speed', 'Kioldás'],
  ratio: ['Turns ratio', 'Áttétel'], vp: ['Primary voltage', 'Primer feszültség'], vs2: ['Secondary voltage', 'Szekunder feszültség'], va: ['Power', 'Teljesítmény'],
  vf: ['Forward voltage', 'Nyitófeszültség'], vr: ['Reverse voltage', 'Záróirányú feszültség'], vz: ['Zener voltage', 'Zener-feszültség'],
  color: ['Colour', 'Szín'], size: ['Size / package', 'Méret / tokozás'], ifw: ['Forward current', 'Nyitóáram'], supply: ['Supply voltage (for the resistor calculator)', 'Tápfeszültség (az ellenállás-kalkulátorhoz)'],
  pkg: ['Package', 'Tokozás'], ic: ['Max. collector current', 'Max. kollektoráram'], vce: ['Max. C–E voltage', 'Max. C–E feszültség'], hfe: ['Gain (hFE)', 'Erősítés (hFE)'],
  id: ['Max. drain current', 'Max. drain-áram'], vds: ['Max. D–S voltage', 'Max. D–S feszültség'], rds: ['On-resistance', 'Bekapcsolt ellenállás'],
  sup: ['Supply', 'Táplálás'], gbw: ['Gain–bandwidth', 'Erősítés–sávszélesség'], vo: ['Output voltage', 'Kimeneti feszültség'], io: ['Output current', 'Kimeneti áram'],
  fam: ['Logic family', 'Logikai család'], vcc: ['Supply voltage', 'Tápfeszültség'], fn: ['Function', 'Funkció'], chem: ['Chemistry', 'Kémia'], cap: ['Capacity', 'Kapacitás'],
  ilim: ['Current limit', 'Áramkorlát'], pitch: ['Pitch', 'Raszter'], gender: ['Kind', 'Fajta'], act: ['Action', 'Működés'], vcoil: ['Coil voltage', 'Tekercsfeszültség'],
  cont: ['Contacts', 'Érintkezők'], rpm: ['Speed', 'Fordulatszám'], z: ['Impedance', 'Impedancia'], beta: ['B value', 'B-érték'], taper: ['Taper', 'Karakterisztika'], r25: ['Resistance at 25 °C', 'Ellenállás 25 °C-on'],
};
const TOL = ['0.1%', '0.25%', '0.5%', '1%', '2%', '5%', '10%', '20%'];
const RPW = ['1/8 W', '1/4 W', '1/2 W', '1 W', '2 W', '5 W', '10 W'];
const PK_T = ['TO-92', 'SOT-23', 'TO-126', 'TO-220', 'TO-247', 'DPAK', 'SO-8'];
const RES = [
  pQ('r', PL.r, 'Ω', 10000, { primary: true, series: 'E24' }),
  pS('tol', PL.tol, TOL, '5%', { extra: true }),
  pS('pw', PL.pw, RPW, '1/4 W', { extra: true }),
  pS('tech', PL.tech, [['cf', ['Carbon film', 'Szénréteg']], ['mf', ['Metal film', 'Fémréteg']], ['ww', ['Wirewound', 'Huzal']], ['smd', ['SMD chip', 'SMD chip']]], 'cf'),
  pS('bands', PL.bands, [['4', ['4 bands', '4 gyűrű']], ['5', ['5 bands', '5 gyűrű']]], '4'),
];
const GATE = [pS('fam', PL.fam, ['74HC', '74HCT', '74LS', '74AC', 'CD4000'], '74HC'), pQ('vcc', PL.vcc, 'V', 5)];
const CONN = [pS('pitch', PL.pitch, ['2.54 mm', '2.0 mm', '1.27 mm', '3.5 mm', '5.08 mm'], '2.54 mm'),
  pS('gender', PL.gender, [['m', ['Pin header', 'Tüskesor']], ['f', ['Socket', 'Hüvelysor']], ['screw', ['Screw terminal', 'Sorkapocs']], ['jst', ['JST', 'JST']]], 'm')];
const PART_PROPS = {
  resistor: RES, resistor_iec: RES,
  potentiometer: [pQ('r', PL.r, 'Ω', 10000, { primary: true, series: 'E6' }),
    pS('taper', PL.taper, [['B', ['Linear (B)', 'Lineáris (B)']], ['A', ['Logarithmic (A)', 'Logaritmikus (A)']]], 'B', { extra: true }),
    pS('kind', PL.kind, [['rot', ['Rotary', 'Forgó']], ['trim', ['Trimmer', 'Trimmer']], ['slide', ['Slider', 'Toló']]], 'rot'), pS('pw', PL.pw, RPW, '1/4 W')],
  thermistor: [pS('kind', PL.kind, ['NTC', 'PTC'], 'NTC', { primary: true }), pQ('r', PL.r25, 'Ω', 10000, { primary: true, series: 'E6' }), pN('beta', PL.beta, 'K', 3950)],
  capacitor: [pQ('c', PL.c, 'F', 1e-7, { primary: true, series: 'E12' }), pQ('v', PL.vmax, 'V', 50, { extra: true }),
    pS('diel', PL.diel, ['C0G / NP0', 'X7R', 'X5R', 'Y5V', ['film', ['Film', 'Fólia']], ['mica', ['Mica', 'Csillám']]], 'X7R'), pS('tol', PL.tol, TOL, '10%')],
  cap_pol: [pQ('c', PL.c, 'F', 1e-5, { primary: true, series: 'E6' }), pQ('v', PL.vmax, 'V', 25, { extra: true }),
    pS('kind', PL.kind, [['al', ['Aluminium electrolytic', 'Alumínium elektrolit']], ['ta', ['Tantalum', 'Tantál']], ['poly', ['Polymer', 'Polimer']]], 'al'),
    pS('temp', PL.temp, ['85 °C', '105 °C', '125 °C'], '105 °C')],
  inductor: [pQ('l', PL.l, 'H', 1e-5, { primary: true, series: 'E12' }), pQ('i', PL.imax, 'A', 1, { extra: true }), pQ('dcr', PL.dcr, 'Ω', 0.1),
    pS('kind', PL.kind, [['ax', ['Axial', 'Axiális']], ['rad', ['Radial', 'Radiális']], ['smd', ['SMD power', 'SMD teljesítmény']], ['tor', ['Toroid', 'Toroid']]], 'rad')],
  crystal: [pQ('f', PL.f, 'Hz', 16e6, { primary: true }), pQ('cl', PL.cl, 'F', 18e-12), pS('kind', PL.kind, [['xtal', ['Crystal', 'Kvarc']], ['res', ['Ceramic resonator', 'Kerámia rezonátor']]], 'xtal')],
  fuse: [pQ('i', PL.i, 'A', 1, { primary: true }), pS('speed', PL.speed, [['F', ['Fast', 'Gyors']], ['T', ['Slow-blow', 'Lomha']]], 'F', { extra: true }), pQ('v', PL.vmax, 'V', 250)],
  transformer: [pT('ratio', PL.ratio, '1:1', { primary: true }), pQ('vp', PL.vp, 'V', 230), pQ('vs2', PL.vs2, 'V', 12), pQ('va', PL.va, 'VA', 10, { extra: true })],
  diode: [pQ('i', PL.imax, 'A', 0.2), pQ('vr', PL.vr, 'V', 75)],
  zener: [pQ('vz', PL.vz, 'V', 5.1, { primary: true }), pS('pw', PL.pw, ['0.5 W', '1 W', '1.3 W', '5 W'], '0.5 W', { extra: true })],
  schottky: [pQ('i', PL.imax, 'A', 1), pQ('vr', PL.vr, 'V', 40), pQ('vf', PL.vf, 'V', 0.45)],
  led: [pS('color', PL.color, [['Red', ['Red', 'Piros']], ['Orange', ['Orange', 'Narancs']], ['Yellow', ['Yellow', 'Sárga']], ['Green', ['Green', 'Zöld']],
    ['Blue', ['Blue', 'Kék']], ['White', ['White', 'Fehér']], ['Warm white', ['Warm white', 'Melegfehér']], ['RGB', ['RGB', 'RGB']], ['IR', ['Infrared', 'Infravörös']], ['UV', ['UV', 'UV']]], 'Red', { primary: true }),
    pS('size', PL.size, ['3 mm', '5 mm', '10 mm', '0603', '0805', '1206'], '5 mm'), pQ('vf', PL.vf, 'V', 2), pQ('if', PL.ifw, 'A', 0.02), pQ('supply', PL.supply, 'V', 5)],
  photodiode: [pQ('vr', PL.vr, 'V', 32)],
  npn: [pS('pkg', PL.pkg, PK_T, 'TO-92'), pQ('ic', PL.ic, 'A', 0.2), pQ('vce', PL.vce, 'V', 40), pN('hfe', PL.hfe, '', 100)],
  pnp: [pS('pkg', PL.pkg, PK_T, 'TO-92'), pQ('ic', PL.ic, 'A', 0.2), pQ('vce', PL.vce, 'V', 40), pN('hfe', PL.hfe, '', 100)],
  nmos: [pS('pkg', PL.pkg, PK_T, 'TO-92'), pQ('id', PL.id, 'A', 0.2), pQ('vds', PL.vds, 'V', 60), pQ('rds', PL.rds, 'Ω', 5)],
  pmos: [pS('pkg', PL.pkg, PK_T, 'TO-92'), pQ('id', PL.id, 'A', 0.2), pQ('vds', PL.vds, 'V', 45), pQ('rds', PL.rds, 'Ω', 10)],
  opamp: [pS('sup', PL.sup, [['single', ['Single supply', 'Egytápos']], ['dual', ['Dual supply (±)', 'Kéttápos (±)']]], 'single'), pQ('gbw', PL.gbw, 'Hz', 1e6), pS('pkg', PL.pkg, ['DIP-8', 'SO-8', 'SOT-23-5'], 'DIP-8')],
  regulator: [pQ('vo', PL.vo, 'V', 5, { extra: true }), pQ('io', PL.io, 'A', 1),
    pS('kind', PL.kind, [['lin', ['Linear', 'Lineáris']], ['ldo', ['LDO', 'LDO']], ['buck', ['Switching (buck)', 'Kapcsolóüzemű (buck)']], ['boost', ['Switching (boost)', 'Kapcsolóüzemű (boost)']]], 'lin'),
    pS('pkg', PL.pkg, ['TO-220', 'TO-92', 'SOT-223', 'DPAK'], 'TO-220')],
  and: GATE, nand: GATE, or: GATE, nor: GATE, xor: GATE, not: GATE,
  ic8: [pT('fn', PL.fn), pS('pkg', PL.pkg, ['DIP', 'SOIC', 'TSSOP'], 'DIP')],
  ic14: [pT('fn', PL.fn), pS('pkg', PL.pkg, ['DIP', 'SOIC', 'TSSOP'], 'DIP')],
  ic16: [pT('fn', PL.fn), pS('pkg', PL.pkg, ['DIP', 'SOIC', 'TSSOP'], 'DIP')],
  battery: [pQ('v', PL.v, 'V', 9, { primary: true }),
    pS('chem', PL.chem, [['alk', ['Alkaline', 'Alkáli']], ['liion', ['Li-ion', 'Li-ion']], ['lipo', ['LiPo', 'LiPo']], ['nimh', ['NiMH', 'NiMH']], ['pb', ['Lead-acid', 'Ólom-savas']], ['coin', ['Lithium coin', 'Lítium gombelem']]], 'alk'),
    pQ('cap', PL.cap, 'Ah', 0.5, { extra: true })],
  vdc: [pQ('v', PL.v, 'V', 5, { primary: true }), pQ('ilim', PL.ilim, 'A', 1, { extra: true })],
  vac: [pQ('v', PL.v, 'V', 230, { primary: true }), pQ('f', PL.f, 'Hz', 50, { extra: true })],
  isrc: [pQ('i', PL.i, 'A', 1e-3, { primary: true })],
  conn2: CONN, conn3: CONN, conn4: CONN, conn6: CONN,
  switch: [pS('kind', PL.kind, [['tog', ['Toggle', 'Billenő']], ['slide', ['Slide', 'Toló']], ['rock', ['Rocker', 'Billenő (rocker)']], ['dip', ['DIP', 'DIP']]], 'tog'), pQ('i', PL.imax, 'A', 0.5), pQ('v', PL.vmax, 'V', 50)],
  spdt: [pS('kind', PL.kind, [['tog', ['Toggle', 'Billenő']], ['slide', ['Slide', 'Toló']], ['rock', ['Rocker', 'Billenő (rocker)']]], 'tog'), pQ('i', PL.imax, 'A', 0.5), pQ('v', PL.vmax, 'V', 50)],
  button: [pS('kind', PL.kind, [['t6', ['Tactile 6×6', 'Mikrokapcsoló 6×6']], ['t12', ['Tactile 12×12', 'Mikrokapcsoló 12×12']], ['panel', ['Panel mount', 'Panelbe szerelhető']]], 't6'),
    pS('act', PL.act, [['no', ['Momentary (NO)', 'Nyomó (záró)']], ['nc', ['Momentary (NC)', 'Nyomó (bontó)']], ['latch', ['Latching', 'Reteszelő']]], 'no')],
  relay: [pQ('vcoil', PL.vcoil, 'V', 5, { primary: true }), pQ('i', PL.imax, 'A', 10, { extra: true }), pS('cont', PL.cont, ['SPDT', 'DPDT', 'SPST-NO'], 'SPDT')],
  lamp: [pQ('v', PL.v, 'V', 12, { primary: true }), pQ('pw', PL.va, 'W', 5, { extra: true })],
  motor: [pQ('v', PL.v, 'V', 6, { primary: true }), pQ('i', PL.i, 'A', 0.3), pN('rpm', PL.rpm, 'rpm', 10000)],
  speaker: [pQ('z', PL.z, 'Ω', 8, { primary: true, unitShown: true }), pQ('pw', PL.va, 'W', 0.5, { extra: true })],
  buzzer: [pS('kind', PL.kind, [['act', ['Active', 'Aktív']], ['pas', ['Passive', 'Passzív']]], 'act', { primary: true }), pQ('v', PL.v, 'V', 5, { extra: true })],
  antenna: [pQ('f', PL.f, 'Hz', 433e6, { primary: true })],
};
const LED_VF = { Red: 2, Orange: 2.1, Yellow: 2.1, Green: 2.2, Blue: 3.1, White: 3.1, 'Warm white': 3.1, RGB: 2, IR: 1.3, UV: 3.3 };

// ---------------------------------------------------------------- reading / writing a part's properties
const propDefs = (c) => PART_PROPS[c.type] || [];
function propVal(c, k) {
  const f = propDefs(c).find((d) => d.k === k);
  if (!f) return undefined;
  if (c.props && c.props[k] !== undefined) return c.props[k];
  if (f.primary) { // older parts: read it back from the value text
    const prim = propDefs(c).filter((d) => d.primary);
    if (prim.length === 1) {
      if (f.type === 'qty') { const v = parseQty(c.value); if (v != null) return v; }
      if (f.type === 'sel') { const o = f.opts.find((x) => String(c.value || '').toLowerCase().includes(String(x[0]).toLowerCase())); if (o) return o[0]; }
      if (f.type === 'text' && c.value) return c.value;
    }
  }
  return f.def;
}
function propText(f, v, style) {
  if (v === undefined || v === null || v === '') return '';
  if (f.type === 'qty') return fmtQty(v, f.unit, f.unitShown && style !== 'unit' ? 'plain' : style).replace(/^(\d.*?)$/, (m) => (f.unitShown && !m.endsWith(f.unit) ? m + f.unit : m));
  if (f.type === 'sel') { const o = f.opts.find((x) => String(x[0]) === String(v)); return o ? L2(o[1]) : String(v); }
  if (f.type === 'num') return `${v}${f.unit ? ` ${f.unit}` : ''}`;
  return String(v);
}
// The value text on the schematic, built from the properties.
function partSummary(c) {
  const defs = propDefs(c);
  const prim = defs.filter((d) => d.primary);
  if (!prim.length) return null;
  let s = prim.map((f) => propText(f, propVal(c, f.k), P.valueStyle)).filter(Boolean).join(' ');
  if (c.type === 'vac') s += ' AC';
  if (P.valueExtra) {
    const ex = defs.filter((d) => d.extra).map((f) => propText(f, propVal(c, f.k), P.valueStyle)).filter(Boolean);
    if (ex.length) s += ` ${ex.join(' ')}`;
  }
  return s;
}
// Everything except the main value, for the parts list.
function partDetails(c) {
  return propDefs(c).filter((d) => !d.primary && d.k !== 'bands' && d.k !== 'supply').map((f) => propText(f, propVal(c, f.k), 'unit')).filter(Boolean).join(', ');
}
function initProps(c) {
  c.props = {};
  for (const f of propDefs(c)) c.props[f.k] = f.def;
  const s = partSummary(c);
  if (s) c.value = s;
}
// Recompute value labels (after the value style changes). Parts whose value you typed by hand keep it.
function refreshPartValues() {
  if (!S.project) return;
  let changed = false;
  for (const pg of S.project.pages) for (const c of pg.comps) {
    if (c.valueLock || !c.props) continue;
    const s = partSummary(c);
    if (s && s !== c.value) { c.value = s; changed = true; }
  }
  if (changed) scheduleSave();
}

// ---------------------------------------------------------------- resistor colour bands
const BAND_COLORS = ['#111', '#7b4a21', '#d62d20', '#f08a1c', '#f4d03f', '#2e9d4a', '#2c63d6', '#7d3cc8', '#8a8a8a', '#f5f5f5'];
const BAND_NAMES = [['black', 'fekete'], ['brown', 'barna'], ['red', 'piros'], ['orange', 'narancs'], ['yellow', 'sárga'], ['green', 'zöld'], ['blue', 'kék'], ['violet', 'lila'], ['grey', 'szürke'], ['white', 'fehér']];
const TOL_BAND = { '1%': [1], '2%': [2], '0.5%': [5], '0.25%': [6], '0.1%': [7], '5%': ['gold'], '10%': ['silver'], '20%': [] };
function resistorBands(r, tol, n) {
  if (!(r > 0)) return null;
  const digits = n === 5 ? 3 : 2;
  let exp = Math.floor(Math.log10(r)) - (digits - 1);
  let sig = Math.round(r / 10 ** exp);
  if (sig >= 10 ** digits) { sig = Math.round(sig / 10); exp++; }
  if (exp < -2 || exp > 9) return null;
  const ds = String(sig).padStart(digits, '0').split('').map(Number);
  const mult = exp === -1 ? 'gold' : exp === -2 ? 'silver' : exp;
  return [...ds, mult, ...(TOL_BAND[tol] || [])];
}
function bandsSVG(r, tol, n) {
  const b = resistorBands(r, tol, n);
  if (!b) return '';
  const col = (x) => (x === 'gold' ? '#c9a227' : x === 'silver' ? '#b8bcc2' : BAND_COLORS[x]);
  const name = (x) => (x === 'gold' ? L2(['gold', 'arany']) : x === 'silver' ? L2(['silver', 'ezüst']) : L2(BAND_NAMES[x]));
  const nMain = (n === 5 ? 3 : 2) + 1; // digits + multiplier; the tolerance band sits apart on the right
  const pos = b.map((_, i) => (i < nMain ? 52 + i * 17 : 130));
  return `<div class="bands"><svg viewBox="0 0 190 44"><path d="M0 22H40M150 22H190" stroke="#9aa0a6" stroke-width="3"/>
    <rect x="36" y="8" width="118" height="28" rx="12" fill="#d9c49a" stroke="#00000033"/>
    ${b.map((x, i) => `<rect x="${pos[i]}" y="8" width="9" height="28" fill="${col(x)}"/>`).join('')}</svg>
    <span>${b.map(name).join(' · ')}</span></div>`;
}
