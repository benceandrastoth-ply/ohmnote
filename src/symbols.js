// OhmNote symbol library.
// Every symbol is drawn in local coordinates around (0,0). Pins sit on the
// 10-unit grid so wires snap straight onto them. Classes: .ln = stroked line,
// .fl = filled shape, .tx = text.
// label: 'side'   -> ref + value drawn beside the part
//        'anchor' -> only the value, drawn at `anchor` (power symbols, net labels)
//        'none'   -> no text
'use strict';

const SYMBOLS = (() => {
  const S = {};
  const def = (id, o) => { S[id] = { id, label: 'side', bom: true, ...o }; };

  const p = (d) => `<path class="ln" d="${d}"/>`;
  const f = (d) => `<path class="fl" d="${d}"/>`;
  const c = (cx, cy, r, cls = 'ln') => `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}"/>`;
  const r = (x, y, w, h) => `<rect class="ln" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  const t = (x, y, s, size = 10, anchor = 'middle') =>
    `<text class="tx" x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${s}</text>`;
  const two = [[-40, 0, '1'], [40, 0, '2']];

  // ---------------- Passive ----------------
  const zig = 'M-40 0H-24L-20-8L-12 8L-4-8L4 8L12-8L20 8L24 0H40';
  def('resistor', { name: 'Resistor', cat: 'Passive', prefix: 'R', value: '10k', pins: two,
    body: p(zig), box: [-40, -12, 40, 12] });
  def('resistor_iec', { name: 'Resistor (IEC)', cat: 'Passive', prefix: 'R', value: '10k', pins: two,
    body: p('M-40 0H-22M22 0H40') + r(-22, -8, 44, 16), box: [-40, -10, 40, 10] });
  def('potentiometer', { name: 'Potentiometer', cat: 'Passive', prefix: 'RV', value: '10k',
    pins: [[-40, 0, '1'], [40, 0, '3'], [0, -40, 'W']],
    body: p(zig) + p('M0-40V-20') + f('M-5-20L0-11L5-20Z'), box: [-40, -40, 40, 12] });
  def('thermistor', { name: 'Thermistor', cat: 'Passive', prefix: 'TH', value: 'NTC 10k', pins: two,
    body: p('M-40 0H-22M22 0H40') + r(-22, -8, 44, 16) + p('M-26 14L-14 14L20-16'), box: [-40, -18, 40, 16] });
  def('capacitor', { name: 'Capacitor', cat: 'Passive', prefix: 'C', value: '100n', pins: two,
    body: p('M-40 0H-5M-5-14V14M5-14V14M5 0H40'), box: [-40, -16, 40, 16] });
  def('cap_pol', { name: 'Electrolytic cap', cat: 'Passive', prefix: 'C', value: '10u',
    pins: [[-40, 0, '+'], [40, 0, '-']],
    body: p('M-40 0H-5M-5-14V14M11-14Q3 0 11 14M7 0H40M-17-14H-10M-13.5-17.5V-10.5'), box: [-40, -18, 40, 16] });
  def('inductor', { name: 'Inductor', cat: 'Passive', prefix: 'L', value: '10u', pins: two,
    body: p('M-40 0H-24A6 6 0 0 1-12 0A6 6 0 0 1 0 0A6 6 0 0 1 12 0A6 6 0 0 1 24 0H40'), box: [-40, -10, 40, 6] });
  def('crystal', { name: 'Crystal', cat: 'Passive', prefix: 'Y', value: '16MHz', pins: two,
    body: p('M-40 0H-12M-12-10V10M12-10V10M12 0H40') + r(-7, -13, 14, 26), box: [-40, -15, 40, 15] });
  def('fuse', { name: 'Fuse', cat: 'Passive', prefix: 'F', value: '1A', pins: two,
    body: p('M-40 0H40') + r(-16, -7, 32, 14), box: [-40, -9, 40, 9] });
  def('transformer', { name: 'Transformer', cat: 'Passive', prefix: 'T', value: '1:1',
    pins: [[-40, -30, '1'], [-40, 30, '2'], [40, -30, '3'], [40, 30, '4']],
    body: p('M-40-30H-14V-24A6 6 0 0 1-14-12A6 6 0 0 1-14 0A6 6 0 0 1-14 12A6 6 0 0 1-14 24V30H-40') +
      p('M40-30H14V-24A6 6 0 0 0 14-12A6 6 0 0 0 14 0A6 6 0 0 0 14 12A6 6 0 0 0 14 24V30H40') +
      p('M-3-26V26M3-26V26'), box: [-40, -32, 40, 32] });

  // ---------------- Semiconductors ----------------
  const diode = 'M-40 0H-10M10 0H40';
  const tri = f('M-10-10L10 0L-10 10Z');
  const AK = [[-40, 0, 'A'], [40, 0, 'K']];
  def('diode', { name: 'Diode', cat: 'Semiconductor', prefix: 'D', value: '1N4148', pins: AK,
    body: p(diode + 'M10-11V11') + tri, box: [-40, -12, 40, 12] });
  def('zener', { name: 'Zener diode', cat: 'Semiconductor', prefix: 'D', value: '5V1', pins: AK,
    body: p(diode + 'M6-14L10-11V11L14 14') + tri, box: [-40, -15, 40, 15] });
  def('schottky', { name: 'Schottky diode', cat: 'Semiconductor', prefix: 'D', value: '1N5819', pins: AK,
    body: p(diode + 'M15-7V-11H10V11H5V7') + tri, box: [-40, -12, 40, 12] });
  def('led', { name: 'LED', cat: 'Semiconductor', prefix: 'D', value: 'Red', pins: AK,
    body: p(diode + 'M10-11V11M0-14L8-24M3-24H8V-19M9-12L17-22M12-22H17V-17') + tri, box: [-40, -26, 40, 12] });
  def('photodiode', { name: 'Photodiode', cat: 'Semiconductor', prefix: 'D', value: 'BPW34', pins: AK,
    body: p(diode + 'M10-11V11M8-26L0-16M0-21V-16H5M18-24L10-14M10-19V-14H15') + tri, box: [-40, -26, 40, 12] });
  def('npn', { name: 'NPN transistor', cat: 'Semiconductor', prefix: 'Q', value: '2N3904',
    pins: [[-40, 0, 'B'], [20, -40, 'C'], [20, 40, 'E']],
    body: p('M-40 0H-8M-8-16V16M-8-6L20-22V-40M-8 6L20 22V40') + f('M14.4 18.8L5.4 18.3L9.4 11.3Z') + c(6, 0, 26),
    box: [-40, -40, 32, 40] });
  def('pnp', { name: 'PNP transistor', cat: 'Semiconductor', prefix: 'Q', value: '2N3906',
    pins: [[-40, 0, 'B'], [20, -40, 'E'], [20, 40, 'C']],
    body: p('M-40 0H-8M-8-16V16M-8-6L20-22V-40M-8 6L20 22V40') + f('M-1-10L8-10.5L4-17.5Z') + c(6, 0, 26),
    box: [-40, -40, 32, 40] });
  const fet = 'M-40 0H-12M-12-14V14M-6-17V-7M-6-5V5M-6 7V17M-6-12H20V-40M-6 12H20V40';
  def('nmos', { name: 'N-MOSFET', cat: 'Semiconductor', prefix: 'Q', value: '2N7000',
    pins: [[-40, 0, 'G'], [20, -40, 'D'], [20, 40, 'S']],
    body: p(fet + 'M-6 0H20V12') + f('M-5 0L3-4L3 4Z') + c(4, 0, 26), box: [-40, -40, 30, 40] });
  def('pmos', { name: 'P-MOSFET', cat: 'Semiconductor', prefix: 'Q', value: 'BS250',
    pins: [[-40, 0, 'G'], [20, -40, 'S'], [20, 40, 'D']],
    body: p(fet + 'M-6 0H20V-12') + f('M11 0L3-4L3 4Z') + c(4, 0, 26), box: [-40, -40, 30, 40] });

  // ---------------- ICs & logic ----------------
  def('opamp', { name: 'Op-amp', cat: 'IC & Logic', prefix: 'U', value: 'LM358',
    pins: [[-40, -20, '-'], [-40, 20, '+'], [60, 0, 'OUT'], [0, -40, 'V+'], [0, 40, 'V-']],
    body: p('M-30-40L-30 40L40 0ZM-40-20H-30M-40 20H-30M40 0H60M0-40V-23M0 40V23') +
      p('M-25-20H-17M-25 20H-17M-21 16V24'), box: [-40, -40, 60, 40] });
  def('regulator', { name: 'Voltage regulator', cat: 'IC & Logic', prefix: 'U', value: '7805',
    pins: [[-60, 0, 'IN'], [60, 0, 'OUT'], [0, 40, 'GND']],
    body: p('M-60 0H-40M40 0H60M0 20V40') + r(-40, -20, 80, 40) +
      t(-35, 4, 'IN', 9, 'start') + t(35, 4, 'OUT', 9, 'end') + t(0, 16, 'GND', 9), box: [-60, -20, 60, 40] });

  const gateIn = 'M-40-20H-18M-40 20H-18';
  const andBody = 'M-20-30H10A30 30 0 0 1 10 30H-20Z';
  const orBody = 'M-24-30Q6-30 40 0Q6 30-24 30Q-10 0-24-30Z';
  const gpins = [[-40, -20, 'A'], [-40, 20, 'B'], [60, 0, 'Y']];
  def('and', { name: 'AND gate', cat: 'IC & Logic', prefix: 'U', value: '74HC08', pins: gpins,
    body: p(gateIn + andBody + 'M40 0H60'), box: [-40, -30, 60, 30] });
  def('nand', { name: 'NAND gate', cat: 'IC & Logic', prefix: 'U', value: '74HC00', pins: gpins,
    body: p(gateIn + andBody + 'M48 0H60') + c(44, 0, 4), box: [-40, -30, 60, 30] });
  def('or', { name: 'OR gate', cat: 'IC & Logic', prefix: 'U', value: '74HC32', pins: gpins,
    body: p('M-40-20H-15M-40 20H-15' + orBody + 'M40 0H60'), box: [-40, -30, 60, 30] });
  def('nor', { name: 'NOR gate', cat: 'IC & Logic', prefix: 'U', value: '74HC02', pins: gpins,
    body: p('M-40-20H-15M-40 20H-15' + orBody + 'M48 0H60') + c(44, 0, 4), box: [-40, -30, 60, 30] });
  def('xor', { name: 'XOR gate', cat: 'IC & Logic', prefix: 'U', value: '74HC86', pins: gpins,
    body: p('M-40-20H-15M-40 20H-15' + orBody + 'M-32-30Q-18 0-32 30M40 0H60'), box: [-40, -30, 60, 30] });
  def('not', { name: 'NOT gate', cat: 'IC & Logic', prefix: 'U', value: '74HC04',
    pins: [[-40, 0, 'A'], [40, 0, 'Y']],
    body: p('M-40 0H-20M-20-20L-20 20L22 0ZM30 0H40') + c(26, 0, 4), box: [-40, -20, 40, 20] });

  // Generic DIP ICs: pin 1 top-left, counting down the left and up the right.
  [8, 14, 16].forEach((n) => {
    const k = n / 2;
    const ys = Array.from({ length: k }, (_, i) => (i - (k - 1) / 2) * 20);
    const top = ys[0] - 20, bot = ys[k - 1] + 20;
    const pins = [];
    let body = r(-30, top, 60, bot - top) + p(`M-8 ${top}A8 8 0 0 0 8 ${top}`);
    ys.forEach((y, i) => {
      pins.push([-50, y, String(i + 1)]);
      body += p(`M-50 ${y}H-30`) + t(-26, y + 3.5, String(i + 1), 8, 'start');
    });
    [...ys].reverse().forEach((y, i) => {
      pins.push([50, y, String(k + i + 1)]);
      body += p(`M30 ${y}H50`) + t(26, y + 3.5, String(k + i + 1), 8, 'end');
    });
    def(`ic${n}`, { name: `IC (DIP-${n})`, cat: 'IC & Logic', prefix: 'U', value: n === 8 ? 'NE555' : 'IC',
      pins, body, box: [-50, top, 50, bot] });
  });

  // ---------------- Sources & power ----------------
  def('battery', { name: 'Battery', cat: 'Sources & Power', prefix: 'BT', value: '9V',
    pins: [[-40, 0, '+'], [40, 0, '-']],
    body: p('M-40 0H-4M-4-16V16M4-8V8M4 0H40M-15-19H-9M-12-22V-16'), box: [-40, -22, 40, 16] });
  def('vdc', { name: 'DC source', cat: 'Sources & Power', prefix: 'V', value: '5V',
    pins: [[-40, 0, '+'], [40, 0, '-']],
    body: p('M-40 0H-16M16 0H40M-12 0H-4M-8-4V4M4 0H12') + c(0, 0, 16), box: [-40, -16, 40, 16] });
  def('vac', { name: 'AC source', cat: 'Sources & Power', prefix: 'V', value: '230V AC', pins: two,
    body: p('M-40 0H-16M16 0H40M-9 0C-6-10-3-10 0 0C3 10 6 10 9 0') + c(0, 0, 16), box: [-40, -16, 40, 16] });
  def('isrc', { name: 'Current source', cat: 'Sources & Power', prefix: 'I', value: '1mA', pins: two,
    body: p('M-40 0H-16M16 0H40M-9 0H7') + f('M10 0L3-5L3 5Z') + c(0, 0, 16), box: [-40, -16, 40, 16] });
  def('vcc', { name: 'Power rail', cat: 'Sources & Power', prefix: '', value: 'VCC', bom: false,
    label: 'anchor', anchor: [0, -22], pins: [[0, 0, 'PWR']],
    body: p('M0 0V-14M-10-14H10'), box: [-10, -16, 10, 0] });
  def('gnd', { name: 'Ground', cat: 'Sources & Power', prefix: '', value: 'GND', bom: false,
    label: 'none', pins: [[0, 0, 'GND']],
    body: p('M0 0V10M-14 10H14M-9 15H9M-4 20H4'), box: [-14, 0, 14, 20] });
  def('chassis', { name: 'Chassis ground', cat: 'Sources & Power', prefix: '', value: 'CHASSIS', bom: false,
    label: 'none', pins: [[0, 0, 'GND']],
    body: p('M0 0V10M-14 10H14M-14 10L-20 18M-4 10L-10 18M6 10L0 18M14 10L8 18'), box: [-20, 0, 14, 18] });
  def('netlabel', { name: 'Net label', cat: 'Sources & Power', prefix: '', value: 'NET', bom: false,
    label: 'anchor', anchor: [14, 0], pins: [[0, 0, 'NET']],
    body: p('M0 0H10') + c(0, 0, 2.5, 'fl'), box: [-3, -6, 12, 6] });

  // ---------------- Connectors & switches ----------------
  [2, 3, 4, 6].forEach((n) => {
    const ys = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * 20);
    const top = ys[0] - 12, bot = ys[n - 1] + 12;
    let body = r(-10, top, 20, bot - top);
    const pins = ys.map((y, i) => {
      body += p(`M-40 ${y}H-10`) + c(0, y, 3, 'fl');
      return [-40, y, String(i + 1)];
    });
    def(`conn${n}`, { name: `Header 1×${n}`, cat: 'Connectors & Switches', prefix: 'J', value: `Conn_1x${n}`,
      pins, body, box: [-40, top, 10, bot] });
  });
  def('switch', { name: 'Switch (SPST)', cat: 'Connectors & Switches', prefix: 'SW', value: 'SPST', pins: two,
    body: p('M-40 0H-18M18 0H40M-14-2L15-16') + c(-16, 0, 2.5) + c(16, 0, 2.5), box: [-40, -18, 40, 4] });
  def('spdt', { name: 'Switch (SPDT)', cat: 'Connectors & Switches', prefix: 'SW', value: 'SPDT',
    pins: [[-40, 0, 'C'], [40, -20, '1'], [40, 20, '2']],
    body: p('M-40 0H-18M18-20H40M18 20H40M-14-2L15-17') + c(-16, 0, 2.5) + c(16, -20, 2.5) + c(16, 20, 2.5),
    box: [-40, -24, 40, 24] });
  def('button', { name: 'Push button', cat: 'Connectors & Switches', prefix: 'SW', value: 'Push', pins: two,
    body: p('M-40 0H-18M18 0H40M-18-10H18M0-10V-20M-6-20H6') + c(-16, 0, 2.5) + c(16, 0, 2.5), box: [-40, -22, 40, 4] });
  def('relay', { name: 'Relay', cat: 'Connectors & Switches', prefix: 'K', value: '5V',
    pins: [[-40, -20, 'A1'], [-40, 20, 'A2'], [40, -20, 'COM'], [40, 20, 'NO']],
    body: p('M-40-20H-20V-10M-40 20H-20V10M40-20H20V-10M40 20H20V16M20-10L28 12M-6 0H16') + r(-30, -10, 20, 20),
    box: [-40, -22, 40, 22] });

  // ---------------- Output & misc ----------------
  def('lamp', { name: 'Lamp', cat: 'Output & Misc', prefix: 'DS', value: 'Lamp', pins: two,
    body: p('M-40 0H-14M14 0H40M-10-10L10 10M10-10L-10 10') + c(0, 0, 14), box: [-40, -14, 40, 14] });
  def('motor', { name: 'DC motor', cat: 'Output & Misc', prefix: 'M', value: 'DC', pins: two,
    body: p('M-40 0H-16M16 0H40M-7 6V-6L0 2L7-6V6') + c(0, 0, 16), box: [-40, -16, 40, 16] });
  def('speaker', { name: 'Speaker', cat: 'Output & Misc', prefix: 'LS', value: '8Ω',
    pins: [[-40, -10, '1'], [-40, 10, '2']],
    body: p('M-40-10H-20M-40 10H-20M-2-8L14-22V22L-2 8') + r(-20, -8, 18, 16), box: [-40, -22, 14, 22] });
  def('buzzer', { name: 'Buzzer', cat: 'Output & Misc', prefix: 'BZ', value: 'Piezo',
    pins: [[-40, 0, '+'], [40, 0, '-']],
    body: p('M-40 0H-12M12 0H40M-12 0V-6A12 12 0 0 1 12-6V0ZM-6-22L-2-16M6-22L2-16M0-26V-20'), box: [-40, -26, 40, 2] });
  def('antenna', { name: 'Antenna', cat: 'Output & Misc', prefix: 'AE', value: 'ANT', pins: [[0, 0, '1']],
    body: p('M0 0V-30M0-18L-12-34H12L0-18'), box: [-12, -34, 12, 0] });
  def('testpoint', { name: 'Test point', cat: 'Output & Misc', prefix: 'TP', value: 'TP', pins: [[0, 0, '1']],
    body: p('M0 0V-10') + c(0, -15, 5), box: [-6, -21, 6, 0] });

  return S;
})();

const SYMBOL_CATEGORIES = ['Passive', 'Semiconductor', 'IC & Logic', 'Sources & Power', 'Connectors & Switches', 'Output & Misc'];
