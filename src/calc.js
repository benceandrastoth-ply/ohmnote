// OhmNote — built-in calculator, electronics formulas and a quick reference of the basic rules.
// The calculator understands how electronics people write numbers (4k7, 100n, 3V3, 20mA), the
// parallel operator (R1 || R2), and the values of parts on the page by their reference (R1, C2…).
'use strict';

// ---------------------------------------------------------------- expression evaluator (no eval)
const CALC_FN = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10, log10: Math.log10, log2: Math.log2,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  round: Math.round, floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max,
  db: (x) => 20 * Math.log10(x), dbp: (x) => 10 * Math.log10(x), rad: (x) => (x * Math.PI) / 180, deg: (x) => (x * 180) / Math.PI,
};
const CALC_CONST = { pi: Math.PI, π: Math.PI, e: Math.E };
const CALC_UNIT = /^(Ω|ohms?|Hz|VA|Ah|F|H|V|A|W|s)(?![A-Za-z0-9])/;

function calcTokens(src) {
  const s = String(src).replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/²/g, '^2').replace(/∥/g, '||');
  const out = [];
  const parens = []; // 'fn' inside f(…), where a comma separates arguments; elsewhere "3,3" is 3.3
  let i = 0;
  const skipUnit = () => { const u = CALC_UNIT.exec(s.slice(i)); if (u) i += u[0].length; };
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (s.startsWith('||', i)) { out.push({ op: '||' }); i += 2; continue; }
    if (ch === '(') { const prev = out[out.length - 1]; parens.push(prev && prev.id && CALC_FN[prev.id.toLowerCase()] ? 'fn' : 'grp'); }
    if (ch === ')') parens.pop();
    if ('+-*/^(),%'.includes(ch)) { out.push({ op: ch }); i++; continue; }
    const inFn = parens[parens.length - 1] === 'fn';
    const rest = s.slice(i);
    let m = /^(\d+)([pnuµmkKMGRVAFHW])(\d+)/.exec(rest); // 4k7, 4R7, 3V3
    if (m) {
      out.push({ num: parseFloat(`${m[1]}.${m[3]}`) * (SI_MUL[m[2]] ?? 1) });
      i += m[0].length;
      skipUnit();
      continue;
    }
    m = (inFn ? /^(\d+(?:\.\d+)?|\.\d+)(e[-+]?\d+)?/ : /^(\d+(?:[.,]\d+)?|[.,]\d+)(e[-+]?\d+)?/).exec(rest);
    if (m) {
      let v = parseFloat(m[0].replace(',', '.'));
      i += m[0].length;
      // "20m", "20 mA", "4.7 kΩ": an SI prefix and/or unit may follow, with or without one space
      const p = /^ ?([pnuµmkKMG])(?=(Ω|ohms?|Hz|VA|Ah|F|H|V|A|W|s)?(?![A-Za-z0-9(]))/.exec(s.slice(i));
      if (p) { v *= SI_MUL[p[1]]; i += p[0].length; }
      else if (/^ (Ω|ohms?|Hz|VA|Ah|F|H|V|A|W|s)(?![A-Za-z0-9])/.test(s.slice(i))) i += 1;
      skipUnit();
      out.push({ num: v });
      continue;
    }
    m = /^[A-Za-zπ_][A-Za-z0-9_]*/.exec(rest);
    if (m) { out.push({ id: m[0] }); i += m[0].length; continue; }
    throw new Error(L2(['Unexpected', 'Váratlan']) + ` “${ch}”`);
  }
  return out;
}

function calcPartValue(name) {
  if (!S.project) return null;
  const want = name.toLowerCase();
  const pages = [page(), ...S.project.pages.filter((p) => p !== page())];
  for (const pg of pages) {
    const c = pg.comps.find((x) => (x.ref || '').toLowerCase() === want);
    if (!c) continue;
    const prim = propDefs(c).find((d) => d.primary && d.type === 'qty');
    const v = prim ? propVal(c, prim.k) : parseQty(c.value);
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    throw new Error(`${c.ref}: ${L2(['has no number value', 'értéke nem szám'])}`);
  }
  return null;
}

function calcEval(src, vars = {}) {
  const t = calcTokens(src);
  if (!t.length) return null;
  let p = 0;
  const peek = () => t[p];
  const isOp = (o) => t[p] && t[p].op === o;
  const fail = (msg) => { throw new Error(msg); };
  const expect = (o) => { if (!isOp(o)) fail(L2(['Missing', 'Hiányzik']) + ` “${o}”`); p++; };
  function add() {
    let v = mul();
    while (isOp('+') || isOp('-')) { const o = t[p++].op; const r = mul(); v = o === '+' ? v + r : v - r; }
    return v;
  }
  function mul() {
    let v = unary();
    for (;;) {
      if (isOp('*')) { p++; v *= unary(); }
      else if (isOp('/')) { p++; v /= unary(); }
      else if (isOp('||')) { p++; const r = unary(); v = (v * r) / (v + r); }
      else if (peek() && (peek().num !== undefined || peek().id || isOp('('))) v *= unary(); // 2pi, 2(3+4), 2 R1
      else return v;
    }
  }
  function unary() {
    if (isOp('-')) { p++; return -unary(); }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power() {
    const b = postfix();
    if (isOp('^')) { p++; return b ** unary(); }
    return b;
  }
  function postfix() {
    let v = primary();
    while (isOp('%')) { p++; v /= 100; }
    return v;
  }
  function primary() {
    const tk = t[p];
    if (!tk) fail(L2(['Unfinished expression', 'Befejezetlen kifejezés']));
    if (tk.num !== undefined) { p++; return tk.num; }
    if (isOp('(')) { p++; const v = add(); expect(')'); return v; }
    if (tk.id) {
      p++;
      const id = tk.id, low = id.toLowerCase();
      if (CALC_FN[low] && isOp('(')) {
        p++;
        const args = [];
        if (!isOp(')')) { args.push(add()); while (isOp(',')) { p++; args.push(add()); } }
        expect(')');
        return CALC_FN[low](...args);
      }
      if (vars[id] !== undefined) return vars[id];
      if (vars[low] !== undefined) return vars[low];
      if (CALC_CONST[low] !== undefined) return CALC_CONST[low];
      const pv = calcPartValue(id);
      if (pv != null) return pv;
      fail(`${L2(['Unknown name', 'Ismeretlen név'])} “${id}”`);
    }
    fail(L2(['Unexpected', 'Váratlan']) + ` “${tk.op}”`);
  }
  const v = add();
  if (p < t.length) fail(L2(['Unexpected', 'Váratlan']) + ` “${t[p].op || t[p].id || t[p].num}”`);
  return v;
}

// 4700 → "4.7k  (4700)"
function calcShow(v, unit = '') {
  if (typeof v !== 'number') return '';
  if (Number.isNaN(v)) return L2(['not a number', 'nem szám']);
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  const plain = Math.abs(v) >= 1e-4 && Math.abs(v) < 1e7 ? String(+v.toPrecision(10)) : v.toExponential(6).replace(/\.?0+e/, 'e');
  if (['%', '×', 'dB', 'h', '°', ''].includes(unit) && unit !== '') return `${+v.toPrecision(4)} ${unit}`;
  if (v === 0 || (Math.abs(v) >= 1 && Math.abs(v) < 1000 && !unit)) return plain;
  const si = unit ? fmtQty(v, unit, 'unit') : fmtNum(v);
  return unit ? si : `${si}  (${plain})`;
}

// ---------------------------------------------------------------- formulas
const CU = { V: ['Voltage', 'Feszültség'], I: ['Current', 'Áram'], R: ['Resistance', 'Ellenállás'], P: ['Power', 'Teljesítmény'], C: ['Capacitance', 'Kapacitás'], L: ['Inductance', 'Induktivitás'], f: ['Frequency', 'Frekvencia'] };
const TAU = 2 * Math.PI;
const FORMULA_GROUPS = [['basic', ['Basics', 'Alapok']], ['ac', ['Time & frequency', 'Idő és frekvencia']], ['circ', ['Circuits', 'Áramkörök']], ['other', ['Other', 'Egyéb']]];
const FORMULAS = [
  { id: 'ohm', g: 'basic', n: ['Ohm’s law and power', 'Ohm-törvény és teljesítmény'], eq: 'V = I·R    P = V·I = I²·R = V²/R',
    vars: [['V', CU.V, 'V'], ['I', CU.I, 'A'], ['R', CU.R, 'Ω'], ['P', CU.P, 'W']], hint: ['Fill in any two, the other two are worked out.', 'Bármelyik kettőt add meg, a másik kettőt kiszámolja.'],
    rules: [['V', ['I', 'R'], (I, R) => I * R], ['I', ['V', 'R'], (V, R) => V / R], ['R', ['V', 'I'], (V, I) => V / I], ['P', ['V', 'I'], (V, I) => V * I],
      ['V', ['P', 'I'], (P, I) => P / I], ['I', ['P', 'V'], (P, V) => P / V], ['I', ['P', 'R'], (P, R) => Math.sqrt(P / R)], ['V', ['P', 'R'], (P, R) => Math.sqrt(P * R)],
      ['R', ['V', 'P'], (V, P) => (V * V) / P], ['R', ['P', 'I'], (P, I) => P / (I * I)]] },
  { id: 'rser', g: 'basic', type: 'list', unit: 'Ω', n: ['Resistors in series', 'Soros ellenállások'], eq: 'R = R1 + R2 + …', fn: (xs) => xs.reduce((a, b) => a + b, 0) },
  { id: 'rpar', g: 'basic', type: 'list', unit: 'Ω', n: ['Resistors in parallel', 'Párhuzamos ellenállások'], eq: '1/R = 1/R1 + 1/R2 + …', fn: (xs) => 1 / xs.reduce((a, b) => a + 1 / b, 0) },
  { id: 'cpar', g: 'basic', type: 'list', unit: 'F', n: ['Capacitors in parallel', 'Párhuzamos kondenzátorok'], eq: 'C = C1 + C2 + …', fn: (xs) => xs.reduce((a, b) => a + b, 0) },
  { id: 'cser', g: 'basic', type: 'list', unit: 'F', n: ['Capacitors in series', 'Soros kondenzátorok'], eq: '1/C = 1/C1 + 1/C2 + …', fn: (xs) => 1 / xs.reduce((a, b) => a + 1 / b, 0) },
  { id: 'div', g: 'circ', n: ['Voltage divider', 'Feszültségosztó'], eq: 'Vout = Vin · R2 / (R1 + R2)',
    vars: [['Vin', ['Input voltage', 'Bemeneti feszültség'], 'V'], ['R1', ['Top resistor R1', 'Felső ellenállás R1'], 'Ω'], ['R2', ['Bottom resistor R2', 'Alsó ellenállás R2'], 'Ω'], ['Vout', ['Output voltage', 'Kimeneti feszültség'], 'V'], ['I', ['Current through the divider', 'Az osztón átfolyó áram'], 'A', true]],
    hint: ['Fill in three, the fourth is worked out.', 'Hármat adj meg, a negyediket kiszámolja.'],
    rules: [['Vout', ['Vin', 'R1', 'R2'], (a, r1, r2) => (a * r2) / (r1 + r2)], ['Vin', ['Vout', 'R1', 'R2'], (o, r1, r2) => (o * (r1 + r2)) / r2],
      ['R2', ['Vin', 'Vout', 'R1'], (a, o, r1) => (r1 * o) / (a - o)], ['R1', ['Vin', 'Vout', 'R2'], (a, o, r2) => (r2 * (a - o)) / o], ['I', ['Vin', 'R1', 'R2'], (a, r1, r2) => a / (r1 + r2)]],
    extra: (v) => (v.R2 && !v.__given.R2 ? [`E24: R2 ≈ ${fmtQty(eNearest(v.R2, 'E24'), 'Ω', 'unit')}`] : v.R1 && !v.__given.R1 ? [`E24: R1 ≈ ${fmtQty(eNearest(v.R1, 'E24'), 'Ω', 'unit')}`] : []) },
  { id: 'led', g: 'circ', n: ['LED series resistor', 'LED előtét-ellenállás'], eq: 'R = (Vs − Vf) / I',
    vars: [['Vs', ['Supply voltage', 'Tápfeszültség'], 'V'], ['Vf', ['LED forward voltage', 'LED nyitófeszültség'], 'V'], ['I', ['LED current', 'LED áram'], 'A'], ['R', CU.R, 'Ω'], ['P', ['Power in the resistor', 'Az ellenálláson eső teljesítmény'], 'W', true]],
    defaults: { Vf: '2', I: '20m' }, hint: ['Red ≈ 2 V, green ≈ 2.2 V, blue / white ≈ 3.1 V. Most LEDs like 5–20 mA.', 'Piros ≈ 2 V, zöld ≈ 2,2 V, kék / fehér ≈ 3,1 V. A legtöbb LED-nek 5–20 mA jó.'],
    rules: [['R', ['Vs', 'Vf', 'I'], (s, f, i) => (s - f) / i], ['I', ['Vs', 'Vf', 'R'], (s, f, r) => (s - f) / r], ['Vs', ['Vf', 'I', 'R'], (f, i, r) => f + i * r], ['P', ['Vs', 'Vf', 'I'], (s, f, i) => (s - f) * i]],
    extra: (v) => (v.R > 0 ? [`E12: ${fmtQty(eNearest(v.R, 'E12'), 'Ω', 'unit')} → ${fmtQty((v.Vs - v.Vf) / eNearest(v.R, 'E12'), 'A', 'unit')}`, v.P > 0.2 ? L2(['Use at least a 1/2 W resistor.', 'Legalább 1/2 W-os ellenállás kell.']) : L2(['A 1/4 W resistor is fine.', 'Egy 1/4 W-os ellenállás elég.'])] : []) },
  { id: 'rc', g: 'ac', n: ['RC time constant and cut-off', 'RC időállandó és határfrekvencia'], eq: 'τ = R·C    fc = 1 / (2π·R·C)',
    vars: [['R', CU.R, 'Ω'], ['C', CU.C, 'F'], ['tau', ['Time constant τ', 'Időállandó τ'], 's'], ['fc', ['Cut-off frequency', 'Határfrekvencia'], 'Hz']],
    hint: ['After 1τ a capacitor is 63% charged, after 5τ it is practically full.', '1τ után a kondenzátor 63%-ig töltődik, 5τ után gyakorlatilag teljesen.'],
    rules: [['tau', ['R', 'C'], (r, c) => r * c], ['tau', ['fc'], (f) => 1 / (TAU * f)], ['fc', ['tau'], (t) => 1 / (TAU * t)], ['R', ['tau', 'C'], (t, c) => t / c], ['C', ['tau', 'R'], (t, r) => t / r]],
    extra: (v) => (v.tau ? [`5τ = ${fmtQty(5 * v.tau, 's', 'unit')}`] : []) },
  { id: 'rl', g: 'ac', n: ['RL time constant', 'RL időállandó'], eq: 'τ = L / R',
    vars: [['L', CU.L, 'H'], ['R', CU.R, 'Ω'], ['tau', ['Time constant τ', 'Időállandó τ'], 's']],
    rules: [['tau', ['L', 'R'], (l, r) => l / r], ['L', ['tau', 'R'], (t, r) => t * r], ['R', ['L', 'tau'], (l, t) => l / t]] },
  { id: 'xc', g: 'ac', n: ['Capacitive reactance', 'Kapacitív reaktancia'], eq: 'Xc = 1 / (2π·f·C)',
    vars: [['f', CU.f, 'Hz'], ['C', CU.C, 'F'], ['X', ['Reactance Xc', 'Reaktancia Xc'], 'Ω']],
    rules: [['X', ['f', 'C'], (f, c) => 1 / (TAU * f * c)], ['C', ['f', 'X'], (f, x) => 1 / (TAU * f * x)], ['f', ['C', 'X'], (c, x) => 1 / (TAU * c * x)]] },
  { id: 'xl', g: 'ac', n: ['Inductive reactance', 'Induktív reaktancia'], eq: 'XL = 2π·f·L',
    vars: [['f', CU.f, 'Hz'], ['L', CU.L, 'H'], ['X', ['Reactance XL', 'Reaktancia XL'], 'Ω']],
    rules: [['X', ['f', 'L'], (f, l) => TAU * f * l], ['L', ['f', 'X'], (f, x) => x / (TAU * f)], ['f', ['L', 'X'], (l, x) => x / (TAU * l)]] },
  { id: 'lc', g: 'ac', n: ['LC resonance', 'LC rezonancia'], eq: 'f₀ = 1 / (2π·√(L·C))',
    vars: [['L', CU.L, 'H'], ['C', CU.C, 'F'], ['f', ['Resonant frequency', 'Rezonanciafrekvencia'], 'Hz']],
    rules: [['f', ['L', 'C'], (l, c) => 1 / (TAU * Math.sqrt(l * c))], ['L', ['f', 'C'], (f, c) => 1 / ((TAU * f) ** 2 * c)], ['C', ['f', 'L'], (f, l) => 1 / ((TAU * f) ** 2 * l)]] },
  { id: 'ne555', g: 'circ', n: ['555 timer (astable)', '555 időzítő (astabil)'], eq: 'f = 1.44 / ((R1 + 2·R2)·C)',
    vars: [['R1', ['R1', 'R1'], 'Ω'], ['R2', ['R2', 'R2'], 'Ω'], ['C', CU.C, 'F'], ['f', CU.f, 'Hz', true], ['duty', ['Duty cycle', 'Kitöltési tényező'], '%', true], ['th', ['Time high', 'Magas idő'], 's', true], ['tl', ['Time low', 'Alacsony idő'], 's', true]],
    rules: [['f', ['R1', 'R2', 'C'], (a, b, c) => 1.44 / ((a + 2 * b) * c)], ['duty', ['R1', 'R2'], (a, b) => (100 * (a + b)) / (a + 2 * b)],
      ['th', ['R1', 'R2', 'C'], (a, b, c) => 0.693 * (a + b) * c], ['tl', ['R2', 'C'], (b, c) => 0.693 * b * c]] },
  { id: 'opni', g: 'circ', n: ['Op-amp gain (non-inverting)', 'Műveleti erősítő (nem invertáló)'], eq: 'G = 1 + Rf / Rg',
    vars: [['Rf', ['Feedback resistor Rf', 'Visszacsatoló Rf'], 'Ω'], ['Rg', ['Resistor to ground Rg', 'Földre menő Rg'], 'Ω'], ['G', ['Gain', 'Erősítés'], '×'], ['dB', ['Gain in dB', 'Erősítés dB-ben'], 'dB', true]],
    rules: [['G', ['Rf', 'Rg'], (f, g) => 1 + f / g], ['Rf', ['G', 'Rg'], (G, g) => (G - 1) * g], ['Rg', ['G', 'Rf'], (G, f) => f / (G - 1)], ['dB', ['G'], (G) => 20 * Math.log10(Math.abs(G))]] },
  { id: 'opinv', g: 'circ', n: ['Op-amp gain (inverting)', 'Műveleti erősítő (invertáló)'], eq: 'G = −Rf / Rin',
    vars: [['Rf', ['Feedback resistor Rf', 'Visszacsatoló Rf'], 'Ω'], ['Rin', ['Input resistor Rin', 'Bemeneti Rin'], 'Ω'], ['G', ['Gain', 'Erősítés'], '×'], ['dB', ['Gain in dB', 'Erősítés dB-ben'], 'dB', true]],
    rules: [['G', ['Rf', 'Rin'], (f, i) => -f / i], ['Rf', ['G', 'Rin'], (G, i) => -G * i], ['Rin', ['G', 'Rf'], (G, f) => -f / G], ['dB', ['G'], (G) => 20 * Math.log10(Math.abs(G))]] },
  { id: 'tr', g: 'circ', n: ['Transformer', 'Transzformátor'], eq: 'Vs / Vp = Ns / Np',
    vars: [['Vp', ['Primary voltage', 'Primer feszültség'], 'V'], ['Vs', ['Secondary voltage', 'Szekunder feszültség'], 'V'], ['Np', ['Primary turns', 'Primer menetszám'], ''], ['Ns', ['Secondary turns', 'Szekunder menetszám'], '']],
    rules: [['Vs', ['Vp', 'Np', 'Ns'], (v, a, b) => (v * b) / a], ['Vp', ['Vs', 'Np', 'Ns'], (v, a, b) => (v * a) / b], ['Ns', ['Vp', 'Vs', 'Np'], (p, s, a) => (a * s) / p], ['Np', ['Vp', 'Vs', 'Ns'], (p, s, b) => (b * p) / s]] },
  { id: 'db', g: 'other', n: ['Decibels', 'Decibel'], eq: 'dB = 20·log(V2/V1) = 10·log(P2/P1)',
    vars: [['V1', ['Voltage 1 (or power 1)', '1. feszültség (vagy teljesítmény)'], ''], ['V2', ['Voltage 2 (or power 2)', '2. feszültség (vagy teljesítmény)'], ''], ['dBv', ['dB for voltages', 'dB feszültségre'], 'dB', true], ['dBp', ['dB for powers', 'dB teljesítményre'], 'dB', true]],
    rules: [['dBv', ['V1', 'V2'], (a, b) => 20 * Math.log10(b / a)], ['dBp', ['V1', 'V2'], (a, b) => 10 * Math.log10(b / a)]] },
  { id: 'bat', g: 'other', n: ['Battery life', 'Akkumulátor-üzemidő'], eq: 't = capacity / current',
    vars: [['Q', ['Capacity', 'Kapacitás'], 'Ah'], ['I', ['Average current', 'Átlagos áram'], 'A'], ['t', ['Run time', 'Üzemidő'], 'h']],
    hint: ['Real batteries give roughly 70–80% of this.', 'A valóságban ennek nagyjából 70–80%-a.'],
    rules: [['t', ['Q', 'I'], (q, i) => q / i], ['I', ['Q', 't'], (q, t) => q / t], ['Q', ['I', 't'], (i, t) => i * t]] },
  { id: 'capE', g: 'other', n: ['Capacitor charge and energy', 'Kondenzátor töltése és energiája'], eq: 'Q = C·V    E = ½·C·V²',
    vars: [['C', CU.C, 'F'], ['V', CU.V, 'V'], ['Q', ['Charge', 'Töltés'], 'C', true], ['E', ['Energy', 'Energia'], 'J', true]],
    rules: [['Q', ['C', 'V'], (c, v) => c * v], ['E', ['C', 'V'], (c, v) => 0.5 * c * v * v]] },
];

// ---------------------------------------------------------------- the basic rules
const RULES = [
  { t: ['Ohm’s law', 'Ohm-törvény'], f: ['V = I · R', 'I = V / R', 'R = V / I'],
    d: ['The voltage across a resistor is its current times its resistance.', 'Az ellenálláson eső feszültség az áram és az ellenállás szorzata.'] },
  { t: ['Power', 'Teljesítmény'], f: ['P = V · I', 'P = I² · R', 'P = V² / R'],
    d: ['Pick a resistor rated at least twice the power it really dissipates.', 'Olyan ellenállást válassz, amely legalább kétszer akkora teljesítményt bír, mint amit ténylegesen disszipál.'] },
  { t: ['Kirchhoff’s current law (KCL)', 'Kirchhoff csomóponti törvénye'], f: ['Σ I in = Σ I out'],
    d: ['All current flowing into a node flows out of it again.', 'Ami áram befolyik egy csomópontba, az ki is folyik belőle.'] },
  { t: ['Kirchhoff’s voltage law (KVL)', 'Kirchhoff huroktörvénye'], f: ['Σ V around a loop = 0'],
    d: ['Going round any closed loop, the voltage rises and drops add up to zero.', 'Bármely zárt hurok mentén a feszültségek előjeles összege nulla.'] },
  { t: ['Series', 'Soros kapcsolás'], f: ['R = R1 + R2 + …', 'I is the same everywhere', 'V = V1 + V2 + …'],
    d: ['One path: the same current flows through everything, the voltages add up.', 'Egyetlen út: mindenen ugyanaz az áram folyik, a feszültségek összeadódnak.'] },
  { t: ['Parallel', 'Párhuzamos kapcsolás'], f: ['1/R = 1/R1 + 1/R2 + …', 'R1 ∥ R2 = R1·R2 / (R1 + R2)', 'V is the same on each branch', 'I = I1 + I2 + …'],
    d: ['Same voltage on every branch, the currents add up. The total is always smaller than the smallest resistor.', 'Minden ágon ugyanaz a feszültség, az áramok összeadódnak. Az eredő mindig kisebb a legkisebb ellenállásnál.'] },
  { t: ['Capacitors and inductors', 'Kondenzátorok és tekercsek'], f: ['C parallel: C = C1 + C2', 'C series: 1/C = 1/C1 + 1/C2', 'L adds like R'],
    d: ['Capacitors combine the opposite way to resistors; inductors combine like resistors.', 'A kondenzátorok fordítva kombinálódnak, mint az ellenállások; a tekercsek úgy, mint az ellenállások.'] },
  { t: ['Voltage and current divider', 'Feszültség- és áramosztó'], f: ['Vout = Vin · R2 / (R1 + R2)', 'I1 = I · R2 / (R1 + R2)'],
    d: ['A loaded divider sags: keep the load at least 10× bigger than R2.', 'A terhelt osztó feszültsége leesik: a terhelés legyen legalább 10× nagyobb R2-nél.'] },
  { t: ['RC and RL timing', 'RC és RL időzítés'], f: ['τ = R · C', 'τ = L / R', '1τ → 63%, 5τ → ~99%', 'fc = 1 / (2π·R·C)'],
    d: ['Charging and discharging follow e-curves set by the time constant.', 'A töltés és kisütés az időállandó szerinti exponenciális görbét követi.'] },
  { t: ['Reactance and impedance', 'Reaktancia és impedancia'], f: ['Xc = 1 / (2π·f·C)', 'XL = 2π·f·L', 'Z = √(R² + (XL − Xc)²)', 'f₀ = 1 / (2π·√(L·C))'],
    d: ['Capacitors block DC and pass high frequencies; inductors do the opposite.', 'A kondenzátor a DC-t zárja, a magas frekvenciát átengedi; a tekercs fordítva.'] },
  { t: ['Diodes and LEDs', 'Diódák és LED-ek'], f: ['Silicon Vf ≈ 0.6–0.7 V', 'Schottky Vf ≈ 0.2–0.4 V', 'LED Vf ≈ 1.8–3.3 V', 'R = (Vs − Vf) / I'],
    d: ['Current flows from anode to cathode (the bar). Always limit LED current with a resistor.', 'Az áram az anódtól a katód (a vonal) felé folyik. A LED áramát mindig korlátozd ellenállással.'] },
  { t: ['Transistors', 'Tranzisztorok'], f: ['Vbe ≈ 0.7 V', 'Ic = β · Ib', 'Ie = Ic + Ib', 'Saturation: Ib ≈ Ic / 10'],
    d: ['To use a BJT as a switch, give it about a tenth of the load current as base current. MOSFETs switch on with Vgs above their threshold.', 'Kapcsolóként a BJT bázisáramát a terhelőáram tizedére állítsd. A MOSFET a küszöb feletti Vgs-re kapcsol be.'] },
  { t: ['AC values', 'Váltakozó mennyiségek'], f: ['Vrms = Vpeak / √2 ≈ 0.707 · Vpeak', 'Vpeak-to-peak = 2 · Vpeak', '230 V AC → 325 V peak'],
    d: ['Mains voltage is quoted as RMS.', 'A hálózati feszültséget effektív értékben adják meg.'] },
  { t: ['Prefixes', 'Prefixumok'], f: ['p = 10⁻¹²   n = 10⁻⁹   µ = 10⁻⁶   m = 10⁻³', 'k = 10³   M = 10⁶   G = 10⁹', '4k7 = 4.7 kΩ    3V3 = 3.3 V    4n7 = 4.7 nF'],
    d: ['The letter can stand in for the decimal point (RKM code).', 'A betű a tizedesvessző helyére is kerülhet (RKM-kód).'] },
  { t: ['Resistor colour code', 'Ellenállás színkód'], f: ['0 black  1 brown  2 red  3 orange  4 yellow', '5 green  6 blue  7 violet  8 grey  9 white', 'gold ×0.1 / ±5%   silver ×0.01 / ±10%'],
    d: ['4 bands: digit, digit, multiplier, tolerance. 5 bands: three digits first.', '4 gyűrű: számjegy, számjegy, szorzó, tűrés. 5 gyűrűnél három számjegy van elöl.'] },
  { t: ['Standard values (E12)', 'Szabványos értékek (E12)'], f: ['10 12 15 18 22 27 33 39 47 56 68 82'],
    d: ['Then ×10, ×100… E24 adds 11 13 16 20 24 30 36 43 51 62 75 91.', 'Utána ×10, ×100… Az E24 ezekkel bővül: 11 13 16 20 24 30 36 43 51 62 75 91.'] },
  { t: ['Safety', 'Biztonság'], f: ['> 50 V AC or > 120 V DC can be dangerous', 'Discharge big capacitors before touching'],
    d: ['Never work on mains circuits while they are plugged in.', 'Hálózati áramkörön soha ne dolgozz bedugott állapotban.'] },
];

// ---------------------------------------------------------------- the Calc tab
const CT = {
  calc: ['Calculator', 'Számológép'], formulas: ['Formulas', 'Képletek'], rules: ['Rules', 'Szabályok'],
  ph: ['e.g. 4k7 || 10k  ·  (9 − 2) / 15m  ·  R1 + R2', 'pl. 4k7 || 10k  ·  (9 − 2) / 15m  ·  R1 + R2'],
  help: ['Write 4k7, 100n, 3V3, 20mA. || = parallel, ^ = power, % = percent, ans = last answer. Part names like R1 use their value. Functions: sqrt, log, ln, sin, cos, db, min, max…',
    'Írhatsz így: 4k7, 100n, 3V3, 20mA. || = párhuzamos, ^ = hatvány, % = százalék, ans = előző eredmény. Az alkatrésznevek (pl. R1) az értéküket adják. Függvények: sqrt, log, ln, sin, cos, db, min, max…'],
  history: ['History', 'Előzmények'], clear: ['Clear', 'Törlés'], toPage: ['Add to page', 'Oldalra'], copy: ['Copy', 'Másolás'],
  values: ['Values (separate with commas or new lines)', 'Értékek (vesszővel vagy új sorral elválasztva)'], result: ['Result', 'Eredmény'],
  added: ['Added to the page', 'Hozzáadva az oldalhoz'], copied: ['Copied', 'Másolva'], empty: ['Nothing to add yet', 'Még nincs mit hozzáadni'],
};
const CALC = { tab: 'calc', expr: '', hist: [], ans: 0, formula: 'ohm', inputs: {} };
try { const s = JSON.parse(localStorage.getItem('ohm-calc') || '{}'); if (Array.isArray(s.hist)) CALC.hist = s.hist.slice(0, 30); if (s.inputs) CALC.inputs = s.inputs; if (s.formula) CALC.formula = s.formula; } catch { /* fresh start */ }
const calcSave = () => { try { localStorage.setItem('ohm-calc', JSON.stringify({ hist: CALC.hist, inputs: CALC.inputs, formula: CALC.formula })); } catch { /* ignore */ } };

function renderCalc() {
  const box = $('#calc-pane');
  if (!box) return;
  const tabs = ['calc', 'formulas', 'rules'].map((k) => `<button data-ctab="${k}" class="${CALC.tab === k ? 'on' : ''}">${L2(CT[k])}</button>`).join('');
  let h = `<div class="seg calc-tabs">${tabs}</div>`;
  if (CALC.tab === 'calc') {
    h += `<div class="calc-in"><input id="calc-expr" type="text" spellcheck="false" autocomplete="off" placeholder="${esc(L2(CT.ph))}" value="${esc(CALC.expr)}"></div>
      <div class="calc-out" id="calc-out"></div>
      <p class="muted small">${esc(L2(CT.help))}</p>
      ${CALC.hist.length ? `<div class="calc-hh"><span class="insp-h">${L2(CT.history)}</span><button class="btn sm" data-cact="clearhist">${L2(CT.clear)}</button></div>
      <div class="calc-hist">${CALC.hist.map((x, i) => `<button data-hist="${i}"><span class="mono">${esc(x.e)}</span><b class="mono">= ${esc(calcShow(x.v))}</b></button>`).join('')}</div>` : ''}`;
  } else if (CALC.tab === 'formulas') {
    const f = FORMULAS.find((x) => x.id === CALC.formula) || FORMULAS[0];
    h += `<select class="sel calc-pick" data-cpick>${FORMULA_GROUPS.map(([g, gl]) => `<optgroup label="${esc(L2(gl))}">${FORMULAS.filter((x) => x.g === g).map((x) =>
      `<option value="${x.id}" ${x.id === f.id ? 'selected' : ''}>${esc(L2(x.n))}</option>`).join('')}</optgroup>`).join('')}</select>
      <div class="calc-eq mono">${esc(f.eq)}</div>${f.hint ? `<p class="muted small">${esc(L2(f.hint))}</p>` : ''}
      <div class="calc-form" data-formula="${f.id}">${formulaFieldsHTML(f)}</div>
      <div class="calc-res" id="calc-res"></div>
      <div class="btn-row"><button class="btn" data-cact="fclear">${L2(CT.clear)}</button><button class="btn" data-cact="ftopage">${L2(CT.toPage)}</button></div>`;
  } else {
    h += RULES.map((r, i) => `<details class="rule" ${i < 2 ? 'open' : ''}><summary>${esc(L2(r.t))}</summary>
      <div class="rule-f mono">${r.f.map((x) => `<div>${esc(x)}</div>`).join('')}</div><p class="muted small">${esc(L2(r.d))}</p></details>`).join('');
  }
  box.innerHTML = h;
  if (CALC.tab === 'calc') calcLive();
  if (CALC.tab === 'formulas') formulaCompute();
}

function formulaFieldsHTML(f) {
  const inp = (CALC.inputs[f.id] ||= { ...(f.defaults || {}) });
  if (f.type === 'list') {
    return `<label class="field"><span>${L2(CT.values)}</span><textarea data-fv="list" class="mono" spellcheck="false" placeholder="4k7, 10k, 2.2k">${esc(inp.list || '')}</textarea></label>`;
  }
  return f.vars.map(([k, l, unit, out]) => `<label class="field"><span>${esc(L2(l))}</span><div class="qty">
    <input type="text" class="mono" data-fv="${k}" value="${out ? '' : esc(inp[k] || '')}" ${out ? 'readonly tabindex="-1"' : ''} spellcheck="false" autocomplete="off"><em>${esc(unit)}</em></div></label>`).join('');
}

// Work out every field that can be worked out from the ones filled in.
function formulaCompute() {
  const f = FORMULAS.find((x) => x.id === CALC.formula);
  const res = $('#calc-res');
  if (!f || !res) return;
  const inp = CALC.inputs[f.id] || {};
  const errs = [];
  if (f.type === 'list') {
    const parts = String(inp.list || '').split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    try {
      const xs = parts.map((s) => calcEval(s));
      res.innerHTML = xs.length ? `<b>${L2(CT.result)}:</b> <span class="mono">${esc(fmtQty(f.fn(xs), f.unit, 'unit'))}</span>` : '';
      CALC.lastFormula = xs.length ? `${L2(f.n)}: ${parts.join(f.id.endsWith('par') ? ' ∥ ' : ' + ')} = ${fmtQty(f.fn(xs), f.unit, 'unit')}` : '';
    } catch (err) { res.innerHTML = `<span class="calc-err">${esc(err.message)}</span>`; }
    return;
  }
  const v = { __given: {} };
  for (const [k, , , out] of f.vars) {
    const raw = out ? '' : String(inp[k] || '').trim();
    if (!raw) continue;
    try { const x = calcEval(raw); if (typeof x === 'number' && Number.isFinite(x)) { v[k] = x; v.__given[k] = true; } }
    catch (err) { errs.push(`${k}: ${err.message}`); }
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const [target, deps, fn] of f.rules) {
      if (v[target] !== undefined || !deps.every((d) => v[d] !== undefined)) continue;
      const x = fn(...deps.map((d) => v[d]));
      if (Number.isFinite(x)) { v[target] = x; changed = true; }
    }
  }
  const lines = [];
  for (const [k, l, unit] of f.vars) {
    const el = $(`#calc-pane [data-fv="${k}"]`);
    if (!el) continue;
    const computed = v[k] !== undefined && !v.__given[k];
    el.classList.toggle('computed', computed);
    el.placeholder = computed ? `= ${calcShow(v[k], unit)}` : '';
    if (el.readOnly) el.value = computed ? calcShow(v[k], unit) : '';
    if (v[k] !== undefined) lines.push(`${k} = ${calcShow(v[k], unit)}`);
  }
  const extra = f.extra && Object.keys(v.__given).length ? f.extra(v) : [];
  res.innerHTML = errs.map((e) => `<div class="calc-err">${esc(e)}</div>`).join('') + extra.map((e) => `<div>${esc(e)}</div>`).join('');
  CALC.lastFormula = lines.length ? `${L2(f.n)}\n${f.eq}\n${lines.join('\n')}${extra.length ? `\n${extra.join('\n')}` : ''}` : '';
}

function calcLive() {
  const out = $('#calc-out');
  if (!out) return;
  try {
    const v = calcEval(CALC.expr, { ans: CALC.ans });
    out.className = 'calc-out';
    out.textContent = v == null ? '' : `= ${calcShow(v)}`;
  } catch (err) {
    out.className = 'calc-out calc-err';
    out.textContent = CALC.expr.trim() ? err.message : '';
  }
}
function calcEnter() {
  const e = CALC.expr.trim();
  if (!e) return;
  try {
    const v = calcEval(e, { ans: CALC.ans });
    if (typeof v !== 'number') return;
    CALC.ans = v;
    CALC.hist.unshift({ e, v });
    CALC.hist = CALC.hist.slice(0, 30);
    calcSave();
    CALC.expr = '';
    renderCalc();
    $('#calc-expr').focus();
  } catch { /* the error is already showing under the box */ }
}

function openCalc(tab) {
  if (tab) CALC.tab = tab;
  showRight('calc');
  renderCalc();
  if (CALC.tab === 'calc') setTimeout(() => $('#calc-expr')?.focus(), 0);
}

// events
$('#calc-pane').addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'calc-expr') { CALC.expr = t.value; calcLive(); return; }
  if (t.dataset.fv) {
    const f = CALC.formula;
    (CALC.inputs[f] ||= {})[t.dataset.fv] = t.value;
    formulaCompute();
    calcSave();
  }
});
$('#calc-pane').addEventListener('change', (e) => {
  if (e.target.dataset.cpick !== undefined) { CALC.formula = e.target.value; calcSave(); renderCalc(); }
});
$('#calc-pane').addEventListener('keydown', (e) => {
  if (e.target.id === 'calc-expr') {
    if (e.key === 'Enter') { e.preventDefault(); calcEnter(); }
    if (e.key === 'ArrowUp' && CALC.hist.length) { e.preventDefault(); CALC.expr = CALC.hist[0].e; e.target.value = CALC.expr; calcLive(); }
  }
});
$('#calc-pane').addEventListener('click', async (e) => {
  const t = e.target;
  const ct = t.closest('[data-ctab]');
  if (ct) { openCalc(ct.dataset.ctab); return; }
  const hb = t.closest('[data-hist]');
  if (hb) { const x = CALC.hist[+hb.dataset.hist]; CALC.expr = x.e; renderCalc(); $('#calc-expr').focus(); return; }
  const a = t.closest('[data-cact]');
  if (!a) return;
  if (a.dataset.cact === 'clearhist') { CALC.hist = []; calcSave(); renderCalc(); }
  if (a.dataset.cact === 'fclear') { CALC.inputs[CALC.formula] = {}; calcSave(); renderCalc(); }
  if (a.dataset.cact === 'ftopage') {
    if (!CALC.lastFormula) { toast(L2(CT.empty)); return; }
    const [title, ...rest] = CALC.lastFormula.split('\n');
    const c = centerWorld();
    addText(c.x - 120, c.y - 40, `<p><b>${esc(title)}</b></p><pre>${esc(rest.join('\n'))}</pre>`, 280);
    toast(L2(CT.added));
  }
});
