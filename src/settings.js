// OhmNote — preferences: option definitions, colour palettes, presets, and the Settings window.
// Everything here is applied live; values are saved to settings.json under `prefs`.
'use strict';

const L2 = (o) => (Array.isArray(o) ? (LANG === 'hu' && o[1]) || o[0] : o);

// ---------------------------------------------------------------- fonts
const FONTS = {
  system: [['System (Segoe UI)', 'Rendszer (Segoe UI)'], '"Segoe UI Variable Text", "Segoe UI", Roboto, system-ui, sans-serif'],
  hand: [['Handwriting (Ink Free)', 'Kézírás (Ink Free)'], '"Ink Free", "Segoe Print", "Comic Sans MS", cursive'],
  marker: [['Marker (Segoe Print)', 'Filctoll (Segoe Print)'], '"Segoe Print", "Ink Free", "Comic Sans MS", cursive'],
  script: [['Script (Segoe Script)', 'Folyóírás (Segoe Script)'], '"Segoe Script", "Lucida Handwriting", cursive'],
  serif: [['Serif (Georgia)', 'Talpas (Georgia)'], 'Georgia, Cambria, "Times New Roman", serif'],
  round: [['Friendly (Trebuchet)', 'Barátságos (Trebuchet)'], '"Trebuchet MS", "Segoe UI", sans-serif'],
  mono: [['Monospace (Cascadia)', 'Fix szélességű (Cascadia)'], '"Cascadia Code", "Cascadia Mono", Consolas, monospace'],
  typewriter: [['Typewriter (Courier)', 'Írógép (Courier)'], '"Courier New", Courier, monospace'],
};
const FONT_OPTS = Object.entries(FONTS).map(([k, [l]]) => [k, l]);

// ---------------------------------------------------------------- colour palettes
// Order of the space-separated colours in each palette string.
const PAL_KEYS = ['bg', 'panel', 'panel-2', 'border', 'border-strong', 'text', 'muted', 'accent', 'accent-ink', 'canvas',
  'grid-dot', 'grid-major', 'sym', 'label', 'label-val', 'wire', 'ink', 'danger', 'margin'];
const PALETTES = {
  bench: { n: ['Bench', 'Műhely'], dark: true,
    c: '#101215 #16191e #1c2026 #262b33 #353b45 #d9dce2 #858c99 #e08a4f #1a1009 #0e1013 #2a2f37 rgba(255,255,255,.035) #e7e3d9 #f0c9a6 #9aa3b1 #3fcf8e #e7e3d9 #e5484d rgba(229,72,77,.5)' },
  paper: { n: ['Paper', 'Papír'], dark: false,
    c: '#ebe7dc #f4f1e8 #ebe7dc #d8d2c3 #c6bfae #2a2722 #7b7568 #c2611f #ffffff #faf8f2 #d6cfbe rgba(80,60,20,.06) #23211c #9a4a14 #6c6659 #0a7d4f #23211c #c9302c rgba(201,48,44,.5)' },
  notebook: { n: ['Notebook', 'Füzet'], dark: false,
    c: '#e6e1d3 #f6f3ea #ece7da #dad3c2 #c7bfab #26324f #7c7f8c #2f5fd0 #ffffff #fffdf6 #bcd3ec rgba(47,95,208,.10) #22305c #b23a2e #4a5680 #1f45b5 #1f3a93 #c9302c #ef9a9a' },
  sketch: { n: ['Sketchbook', 'Vázlatfüzet'], dark: false,
    c: '#e4e1da #f2f0eb #e8e5de #d6d2c9 #c2bdb2 #2b2b2b #7a776f #8a5a2b #ffffff #f7f5ef #dcd8cf rgba(0,0,0,.05) #3b3b3b #6b4a2b #6e6a62 #3b3b3b #3a3a3a #b33a3a rgba(180,60,60,.35)' },
  blueprint: { n: ['Blueprint', 'Tervrajz'], dark: true,
    c: '#0a1f3d #0f2a50 #13335f #1f4677 #2d5a91 #e6f0ff #8fb0d8 #ffd166 #1a1300 #123a6b rgba(173,206,255,.24) rgba(173,206,255,.16) #f2f7ff #ffd166 #b9d3f5 #ffffff #f2f7ff #ff6b6b rgba(255,209,102,.5)' },
  engpad: { n: ['Engineering pad', 'Mérnöki tömb'], dark: false,
    c: '#e3eadb #f1f5ea #e6ecdd #cfd9c2 #b9c6a9 #22301f #6d7a64 #2e7d32 #ffffff #f2f8e9 #b9d7a6 rgba(46,125,50,.16) #26301f #8b2f2f #5b6a52 #1b5e20 #333a30 #c62828 rgba(198,40,40,.4)' },
  chalk: { n: ['Chalkboard', 'Iskolai tábla'], dark: true,
    c: '#1d2621 #232e28 #2a3730 #34443b #43574b #e9efe9 #93a59a #8ecae6 #0d1b22 #2e3f36 rgba(255,255,255,.08) rgba(255,255,255,.04) #f3f3ea #f6bd60 #c8d5cd #f7e98e #f3f3ea #ff8a80 rgba(255,138,128,.4)' },
  cork: { n: ['Cork board', 'Parafatábla'], dark: true,
    c: '#4a3726 #5b4330 #664c37 #765a41 #8a6c4f #fbf3e6 #e0cdb2 #ffcc4d #2b1d00 #b98c5a rgba(0,0,0,.10) rgba(0,0,0,.06) #2a1d10 #7a1f1f #3b2a18 #1d3f8f #22180e #b00020 rgba(176,0,32,.4)' },
  terminal: { n: ['Terminal', 'Terminál'], dark: true,
    c: '#030603 #070c07 #0b130b #143014 #1f4a1f #9dffb0 #4f9a5f #39ff88 #001a08 #020402 #0f2a14 rgba(57,255,136,.06) #39ff88 #b6ff3b #3fbf6a #39ff88 #9dffb0 #ff4d4d rgba(57,255,136,.3)' },
  contrast: { n: ['High contrast', 'Nagy kontraszt'], dark: true,
    c: '#000000 #000000 #0d0d0d #5c5c5c #9a9a9a #ffffff #d0d0d0 #ffd400 #000000 #000000 #3a3a3a rgba(255,255,255,.12) #ffffff #ffd400 #ffffff #00ff9c #ffffff #ff3b3b #ff3b3b' },
  midnight: { n: ['Midnight', 'Éjfél'], dark: true,
    c: '#07070b #0c0c13 #12121c #1d1d2b #2b2b40 #dcdcf0 #7f7f9e #8b7cff #0b0820 #000000 #1b1b29 rgba(139,124,255,.05) #e5e3ff #c4b5fd #8f8fb0 #5eead4 #e5e3ff #f87171 rgba(248,113,113,.4)' },
};
const palColors = (key) => {
  const vals = (PALETTES[key] || PALETTES.bench).c.trim().split(/\s+/);
  return Object.fromEntries(PAL_KEYS.map((k, i) => [k, vals[i]]));
};

// Pen colour sets: the first swatch is always "ink" (follows the palette).
const INK_SETS = {
  classic: ['#e5484d', '#f5a524', '#30a46c', '#3e8ef7', '#8e4ec6'],
  ballpoint: ['#3b6fe0', '#111111', '#c0392b', '#1e7b45', '#6c3483'],
  pastel: ['#f4a6a6', '#f7d08a', '#a8d8b9', '#a6c8f4', '#cdb4f4'],
  neon: ['#ff2e63', '#ffd60a', '#39ff14', '#00e5ff', '#ff00ff'],
  pencil: ['#555555', '#8a8a8a', '#b5651d', '#2f6690', '#6a4c93'],
  highlight: ['#ffe066', '#9ef01a', '#ff8fab', '#7bdff2', '#ffb347'],
};
const inkColors = () => ['ink', ...(INK_SETS[P.inkPalette] || INK_SETS.classic)];

// ---------------------------------------------------------------- option definitions
const CATS = [
  ['presets', ['Presets', 'Előbeállítások'], '<path d="M10 2.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.8l5-.7z"/>'],
  ['look', ['Appearance', 'Megjelenés'], '<circle cx="10" cy="10" r="7"/><path d="M10 3a7 7 0 000 14z" class="dot"/>'],
  ['paper', ['Paper & canvas', 'Papír és vászon'], '<path d="M5 2.5h7l3.5 3.5v11.5H5z M12 2.5V6h3.5 M7.5 10h5 M7.5 13h5"/>'],
  ['schem', ['Schematic', 'Kapcsolási rajz'], '<path d="M2 10h3l1.5-3.5 2.5 7 2.5-7 2.5 7 1.5-3.5h2.5"/>'],
  ['pen', ['Pen & ink', 'Toll és tinta'], '<path d="M4 16l1-4 8.5-8.5a2.1 2.1 0 013 3L8 15z M12 5l3 3"/>'],
  ['text', ['Text & notes', 'Szöveg és jegyzetek'], '<path d="M4 5V3.5h12V5M10 3.5v13M7.5 16.5h5"/>'],
  ['fonts', ['Fonts', 'Betűtípusok'], '<path d="M3 16.5L8 3.5h1l5 13M5 12h7"/><path d="M13.5 16.5c1.5-3 3-1 4-3.5"/>'],
  ['anim', ['Animation', 'Animáció'], '<path d="M3 15c3 0 3-10 7-10s4 10 7 10"/><circle cx="10" cy="5" r="1.4" class="dot"/>'],
  ['edit', ['Mouse & editing', 'Egér és szerkesztés'], '<rect x="5.5" y="2.5" width="9" height="15" rx="4.5"/><path d="M10 2.5v5"/>'],
  ['general', ['General', 'Általános'], '<circle cx="10" cy="10" r="2.6"/><path d="M10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18M4.3 4.3l1.8 1.8M13.9 13.9l1.8 1.8M4.3 15.7l1.8-1.8M13.9 6.1l1.8-1.8"/>'],
];
const VISUAL_CATS = new Set(['look', 'paper', 'schem', 'pen', 'text', 'anim']);

const H = (cat, l) => ({ cat, type: 'head', l });
const T = (cat, id, def, l, h, x = {}) => ({ cat, id, type: 'toggle', def, l, h, ...x });
const R = (cat, id, def, min, max, step, unit, l, h, x = {}) => ({ cat, id, type: 'range', def, min, max, step, unit, l, h, ...x });
const C = (cat, id, l, h, x = {}) => ({ cat, id, type: 'color', def: null, l, h, ...x });
const O = (cat, id, def, opts, l, h, x = {}) => ({ cat, id, type: 'select', def, opts, l, h, ...x });

const DEFS = [
  // ---- Appearance
  H('look', ['Theme', 'Téma']),
  { cat: 'look', id: 'palette', type: 'palette', def: 'bench', l: ['Colour palette', 'Színpaletta'], h: ['The colours of the whole app.', 'Az egész alkalmazás színei.'] },
  C('look', 'accent', ['Accent colour', 'Kiemelőszín'], ['Selection, buttons and highlights. Auto follows the palette.', 'Kijelölés, gombok és kiemelések. Az Auto a palettát követi.']),
  H('look', ['Layout', 'Elrendezés']),
  R('look', 'uiZoom', 100, 70, 160, 5, '%', ['Interface size', 'Felület mérete'], ['Scales the whole window, like browser zoom.', 'Az egész ablakot nagyítja, mint a böngészőben.'], { keep: true }),
  O('look', 'density', 'cozy', [['compact', ['Compact', 'Tömör']], ['cozy', ['Normal', 'Normál']], ['comfy', ['Roomy', 'Tágas']]], ['Toolbar density', 'Eszköztár sűrűsége']),
  R('look', 'radius', 7, 0, 16, 1, 'px', ['Corner roundness', 'Sarkok kerekítése']),
  O('look', 'uiFont', 'system', FONT_OPTS, ['Interface font', 'Felület betűtípusa'], null, { dropdown: true }),
  R('look', 'leftWidth', 252, 160, 560, 4, 'px', ['Left panel width', 'Bal panel szélessége'], null, { keep: true }),
  R('look', 'rightWidth', 300, 220, 640, 4, 'px', ['Right panel width', 'Jobb panel szélessége'], null, { keep: true }),
  H('look', ['Show', 'Megjelenítés']),
  T('look', 'showBrand', true, ['App name in the top bar', 'Alkalmazásnév a felső sávban'], null, { keep: true }),
  T('look', 'toolbarLabels', true, ['Text on the BOM / Export buttons', 'Felirat a Lista / Exportálás gombokon'], null, { keep: true }),
  T('look', 'showHint', true, ['Tool hints at the bottom of the canvas', 'Eszköztippek a vászon alján'], null, { keep: true }),
  T('look', 'showStatus', true, ['Status bar', 'Állapotsor'], null, { keep: true }),
  T('look', 'showCoords', true, ['Cursor coordinates in the status bar', 'Kurzor koordinátái az állapotsorban'], null, { keep: true, when: () => P.showStatus }),

  // ---- Paper & canvas
  H('paper', ['Background', 'Háttér']),
  O('paper', 'pattern', 'dots', [['dots', ['Dots', 'Pöttyös']], ['grid', ['Grid', 'Rácsos']], ['graph', ['Graph', 'Milliméter']], ['ruled', ['Ruled', 'Vonalas']], ['squared', ['Squared', 'Kockás']], ['none', ['Blank', 'Üres']]],
    ['Paper pattern', 'Papírminta'], null, { wrap: true }),
  O('paper', 'gridSize', 20, [[10, ['Fine', 'Sűrű']], [20, ['Normal', 'Normál']], [40, ['Wide', 'Ritka']]], ['Grid spacing', 'Rácstávolság'],
    ['Only changes the look. Parts still snap to the same grid.', 'Csak a kinézetet változtatja, az alkatrészek ugyanúgy a rácsra illeszkednek.'], { when: () => !['ruled', 'squared', 'none'].includes(P.pattern) }),
  R('paper', 'ruleSpacing', 28, 12, 48, 1, 'px', ['Line / square size (ruled and squared paper)', 'Sor- és kockaméret (vonalas és kockás papír)'], null, { when: () => P.pattern === 'ruled' || P.pattern === 'squared' }),
  R('paper', 'gridOpacity', 100, 0, 200, 10, '%', ['Pattern strength', 'Minta erőssége'], null, { when: () => P.pattern !== 'none' }),
  C('paper', 'canvasColor', ['Paper colour', 'Papír színe']),
  H('paper', ['Notebook details', 'Füzet részletei']),
  T('paper', 'margin', false, ['Red margin line', 'Piros margóvonal']),
  O('paper', 'holes', 'none', [['none', ['None', 'Nincs']], ['punch', ['Punched holes', 'Lyukasztás']], ['spiral', ['Spiral', 'Spirál']]], ['Binding', 'Kötés']),
  T('paper', 'texture', false, ['Paper grain', 'Papírszemcse']),
  T('paper', 'vignette', false, ['Soft shadow at the edges', 'Lágy árnyék a széleken']),
  H('paper', ['PNG export', 'PNG exportálás']),
  T('paper', 'exportPaper', false, ['Include the paper pattern in PNGs', 'Papírminta a PNG képeken'], null, { keep: true }),
  R('paper', 'exportPad', 30, 10, 120, 5, 'px', ['Space around the drawing', 'Térköz a rajz körül'], null, { keep: true }),

  // ---- Schematic
  H('schem', ['Colours', 'Színek']),
  C('schem', 'symColor', ['Symbol colour', 'Szimbólumok színe']),
  C('schem', 'wireColor', ['Wire colour', 'Vezetékek színe']),
  C('schem', 'labelColor', ['Reference label colour', 'Azonosítók színe']),
  H('schem', ['Lines', 'Vonalak']),
  R('schem', 'symWidth', 2, 1, 4, 0.25, 'px', ['Symbol line width', 'Szimbólumok vonalvastagsága']),
  R('schem', 'wireWidth', 2, 1, 5, 0.25, 'px', ['Wire width', 'Vezetékvastagság']),
  O('schem', 'wireJoin', 'round', [['round', ['Round', 'Kerek']], ['miter', ['Sharp', 'Éles']], ['bevel', ['Cut', 'Levágott']]], ['Wire corners', 'Vezetéksarkok']),
  R('schem', 'juncSize', 3.6, 2, 7, 0.2, 'px', ['Junction dot size', 'Csomópontok mérete']),
  T('schem', 'wobble', false, ['Hand-drawn look', 'Kézzel rajzolt hatás'], ['Gives parts and wires a slight wobble, like a pen sketch.', 'Enyhe remegést ad az alkatrészeknek és vezetékeknek, mint egy tollvázlat.']),
  R('schem', 'wobbleAmt', 2.5, 1, 6, 0.5, '', ['Wobble amount', 'Remegés mértéke'], null, { when: () => P.wobble }),
  H('schem', ['Labels', 'Feliratok']),
  O('schem', 'labelFont', 'mono', FONT_OPTS, ['Label font', 'Feliratok betűtípusa'], null, { dropdown: true }),
  R('schem', 'labelSize', 11, 8, 18, 0.5, 'px', ['Label size', 'Feliratméret']),
  T('schem', 'showRefs', true, ['Show references (R1, C2…)', 'Azonosítók mutatása (R1, C2…)']),
  T('schem', 'showValues', true, ['Show values (10k, 100n…)', 'Értékek mutatása (10k, 100n…)']),
  O('schem', 'valueStyle', 'plain', [['plain', ['4.7k · 100nF · 3.3V', '4.7k · 100nF · 3.3V']], ['rkm', ['4k7 · 100n · 3V3', '4k7 · 100n · 3V3']], ['unit', ['4.7 kΩ · 100 nF · 3.3 V', '4.7 kΩ · 100 nF · 3.3 V']]],
    ['How values are written', 'Értékek írásmódja'], null, { wrap: true }),
  T('schem', 'valueExtra', false, ['Show ratings next to values (50V, 1/4 W, 5%…)', 'Névleges adatok az értékek mellett (50V, 1/4 W, 5%…)']),
  T('schem', 'showPins', false, ['Always show pin markers', 'Lábjelölők mindig látszanak'], ['Normally they only appear while wiring.', 'Alapesetben csak vezetékezés közben látszanak.']),
  T('schem', 'autoRef', true, ['Number new parts automatically', 'Új alkatrészek automatikus számozása'], ['Off: new parts get R?, C? … until you name them.', 'Ki: az új alkatrész R?, C? … nevet kap, amíg el nem nevezed.'], { keep: true }),

  // ---- Pen & ink
  H('pen', ['Pen', 'Toll']),
  O('pen', 'nib', 'round', [['round', ['Ballpoint', 'Golyóstoll']], ['fountain', ['Fountain pen', 'Töltőtoll']], ['marker', ['Marker', 'Filc']], ['pencil', ['Pencil', 'Ceruza']], ['highlighter', ['Highlighter', 'Szövegkiemelő']]],
    ['Nib', 'Hegy'], ['A fountain pen thins out on fast strokes and follows stylus pressure.', 'A töltőtoll gyors mozdulatnál elvékonyodik, és követi az érintőtoll nyomását.'], { wrap: true }),
  O('pen', 'penWidth', 2.5, [[1.5, ['Fine', 'Vékony']], [2.5, ['Medium', 'Közepes']], [4, ['Bold', 'Vastag']], [7, ['Heavy', 'Nagyon vastag']]], ['Default width', 'Alapvastagság']),
  { cat: 'pen', id: 'penColor', type: 'ink', def: 'ink', l: ['Default colour', 'Alapszín'] },
  O('pen', 'inkPalette', 'classic', [['classic', ['Classic', 'Klasszikus']], ['ballpoint', ['Ballpoint pens', 'Golyóstollak']], ['pastel', ['Pastel', 'Pasztell']],
    ['neon', ['Neon', 'Neon']], ['pencil', ['Coloured pencils', 'Színes ceruzák']], ['highlight', ['Highlighters', 'Szövegkiemelők']]], ['Colour set', 'Színkészlet'], null, { dropdown: true }),
  C('pen', 'inkColor', ['Ink colour (first swatch)', 'Tinta színe (első színminta)']),
  R('pen', 'smoothing', 1, 0, 6, 1, '', ['Stroke smoothing', 'Vonalsimítás'], ['Evens out shaky lines when you lift the pen.', 'Kisimítja a remegő vonalakat, amikor felemeled a tollat.']),
  R('pen', 'taper', 60, 0, 100, 5, '%', ['Fountain pen taper', 'Töltőtoll elvékonyodása'], null, { when: () => P.nib === 'fountain' }),
  T('pen', 'pressure', true, ['Use stylus pressure', 'Érintőtoll nyomásának használata'], null, { keep: true }),
  O('pen', 'penCursor', 'crosshair', [['crosshair', ['Crosshair', 'Célkereszt']], ['pen', ['Pen', 'Toll']], ['dot', ['Dot', 'Pont']]], ['Pen cursor', 'Toll kurzor']),
  T('pen', 'rememberPen', true, ['Remember the last pen you picked', 'Az utoljára választott toll megjegyzése'], null, { keep: true }),
  H('pen', ['Shapes', 'Alakzatok']),
  O('pen', 'shapeFill', 'none', [['none', ['None', 'Nincs']], ['tint', ['Light tint', 'Halvány']]], ['Fill boxes and ellipses', 'Téglalapok és ellipszisek kitöltése']),
  R('pen', 'shapeRadius', 4, 0, 24, 1, 'px', ['Box corner radius', 'Téglalapok sarkának kerekítése']),
  R('pen', 'arrowSize', 100, 50, 250, 10, '%', ['Arrowhead size', 'Nyílhegy mérete']),

  // ---- Text & notes
  H('text', ['Text boxes', 'Szövegdobozok']),
  O('text', 'textFont', 'system', FONT_OPTS, ['Font', 'Betűtípus'], null, { dropdown: true }),
  R('text', 'textSize', 15, 11, 30, 1, 'px', ['Size', 'Méret']),
  R('text', 'lineHeight', 150, 110, 200, 5, '%', ['Line height', 'Sormagasság']),
  O('text', 'textStyle', 'plain', [['plain', ['Plain', 'Egyszerű']], ['card', ['Card', 'Kártya']], ['sticky', ['Sticky note', 'Cetli']]], ['Box style', 'Doboz stílusa']),
  R('text', 'textWidth', 240, 120, 600, 10, 'px', ['Width of new boxes', 'Új dobozok szélessége'], null, { keep: true }),
  T('text', 'snapText', true, ['Snap new boxes to the grid', 'Új dobozok rácshoz igazítása'], null, { keep: true }),
  H('text', ['Page notes', 'Oldaljegyzetek']),
  O('text', 'notesFont', 'system', FONT_OPTS, ['Font', 'Betűtípus'], null, { dropdown: true }),
  R('text', 'notesSize', 14, 11, 24, 1, 'px', ['Size', 'Méret']),
  T('text', 'spellcheck', true, ['Spell checking', 'Helyesírás-ellenőrzés'], null, { keep: true }),

  // ---- Fonts
  H('fonts', ['My fonts', 'Saját betűtípusok']),
  { cat: 'fonts', id: 'fontlist', type: 'fontlist' },

  // ---- Animation
  H('anim', ['Pen writing', 'Tollírás']),
  O('anim', 'writeIn', 'off', [['off', ['Off', 'Ki']], ['ink', ['Sketches', 'Rajzok']], ['all', ['Everything', 'Minden']]],
    ['Write the page in when you open it', 'Oldal „megírása” megnyitáskor'], ['Strokes, wires and text appear as if a pen were writing them.', 'A vonalak, vezetékek és szövegek úgy jelennek meg, mintha most írná őket egy toll.']),
  R('anim', 'writeSpeed', 100, 25, 300, 25, '%', ['Writing speed', 'Írás sebessége'], null, { when: () => P.writeIn !== 'off' }),
  H('anim', ['Pages', 'Oldalak']),
  O('anim', 'pageTurn', 'none', [['none', ['None', 'Nincs']], ['fade', ['Fade', 'Áttűnés']], ['slide', ['Slide', 'Csúszás']], ['flip', ['Page flip', 'Lapozás']]], ['Page change effect', 'Oldalváltás effekt']),
  T('anim', 'reduceMotion', false, ['Reduce motion', 'Mozgás csökkentése'], ['Turns every animation off.', 'Minden animációt kikapcsol.'], { keep: true }),

  // ---- Mouse & editing
  H('edit', ['Mouse wheel', 'Egérgörgő']),
  O('edit', 'wheel', 'zoom', [['zoom', ['Zooms', 'Nagyít']], ['pan', ['Scrolls (Ctrl zooms)', 'Görget (Ctrl: nagyít)']]], ['Scroll wheel', 'Görgő']),
  R('edit', 'zoomSpeed', 100, 25, 300, 25, '%', ['Zoom speed', 'Nagyítás sebessége']),
  T('edit', 'invertZoom', false, ['Invert zoom direction', 'Fordított nagyítási irány']),
  R('edit', 'maxZoom', 8, 2, 16, 1, '×', ['Maximum zoom', 'Legnagyobb nagyítás']),
  H('edit', ['Editing', 'Szerkesztés']),
  O('edit', 'nudge', 10, [[10, ['1 grid', '1 rács']], [20, ['2 grid', '2 rács']], [50, ['5 grid', '5 rács']]], ['Arrow key step', 'Nyílbillentyű lépésköze'], ['Hold Shift for five times as far.', 'Shift-tel ötször akkora lépés.']),
  R('edit', 'pasteOffset', 20, 0, 60, 10, 'px', ['Paste / duplicate offset', 'Beillesztés / duplikálás eltolása']),
  T('edit', 'dblClickText', true, ['Double-click empty space to add text', 'Dupla kattintás az üres helyen: új szöveg']),
  R('edit', 'undoLimit', 250, 50, 1000, 50, '', ['Undo steps per page', 'Visszavonási lépések oldalanként']),

  // ---- General
  H('general', ['General', 'Általános']),
  { cat: 'general', id: 'lang', type: 'lang', l: ['Language', 'Nyelv'] },
  T('general', 'openLast', true, ['Reopen the last project on start', 'Indításkor az utolsó projekt megnyitása']),
  T('general', 'fitOnOpen', false, ['Fit the page to the screen when opening it', 'Oldal képernyőhöz igazítása megnyitáskor']),
  T('general', 'confirmDelete', true, ['Ask before deleting projects and pages', 'Rákérdezés projekt vagy oldal törlése előtt']),
  R('general', 'autosaveDelay', 450, 200, 5000, 50, 'ms', ['Autosave delay', 'Automatikus mentés késleltetése'], ['How long after a change OhmNote saves.', 'Mennyi idővel a változtatás után ment az OhmNote.']),
  T('general', 'toasts', true, ['Pop-up messages', 'Felugró üzenetek'], ['Errors are always shown.', 'A hibák mindig megjelennek.']),
  H('general', ['Settings file', 'Beállításfájl']),
  { cat: 'general', id: 'data', type: 'action' },
];
const PREF_DEFS = DEFS.filter((d) => d.id && d.def !== undefined);

// ---------------------------------------------------------------- presets
const PRESETS = {
  bench: { d: ['Dark slate with copper. The classic.', 'Sötét pala rézzel. A klasszikus.'], set: {} },
  paper: { d: ['Warm paper, crisp ink.', 'Meleg papír, éles tinta.'], set: {} },
  squared: {
    palette: 'notebook', n: ['Squared notebook', 'Kockás füzet'],
    d: ['Squared maths notebook, spiral binding, fountain pen. Text sits in the squares.', 'Kockás matekfüzet spirállal és töltőtollal. A szöveg a kockákba illeszkedik.'],
    set: { pattern: 'squared', ruleSpacing: 20, margin: true, holes: 'spiral', texture: true, textFont: 'hand', textSize: 16, lineHeight: 125,
      notesFont: 'hand', notesSize: 16, labelFont: 'hand', labelSize: 13, wobble: true, wobbleAmt: 2, symWidth: 1.75, wireWidth: 1.75,
      nib: 'fountain', inkPalette: 'ballpoint', penCursor: 'pen', writeIn: 'all', pageTurn: 'flip' },
  },
  notebook: {
    d: ['Ruled school notebook, spiral binding, fountain pen and handwriting.', 'Vonalas iskolai füzet spirállal, töltőtollal és kézírással.'],
    set: { pattern: 'ruled', ruleSpacing: 28, margin: true, holes: 'spiral', texture: true, textFont: 'hand', textSize: 18, lineHeight: 155,
      notesFont: 'hand', notesSize: 17, labelFont: 'hand', labelSize: 13, wobble: true, wobbleAmt: 2, symWidth: 1.75, wireWidth: 1.75,
      nib: 'fountain', inkPalette: 'ballpoint', penCursor: 'pen', writeIn: 'all', pageTurn: 'flip' },
  },
  sketch: {
    d: ['Blank sketchbook and a soft pencil.', 'Üres vázlatfüzet és puha ceruza.'],
    set: { pattern: 'none', texture: true, vignette: true, nib: 'pencil', inkPalette: 'pencil', wobble: true, wobbleAmt: 3,
      textFont: 'marker', labelFont: 'marker', notesFont: 'marker', penCursor: 'pen', writeIn: 'ink', pageTurn: 'fade' },
  },
  blueprint: {
    d: ['White lines on engineering blue.', 'Fehér vonalak mérnöki kéken.'],
    set: { pattern: 'graph', textFont: 'mono', symWidth: 1.5, wireWidth: 1.5, wireJoin: 'miter', inkPalette: 'pastel', radius: 2, juncSize: 3 },
  },
  engpad: {
    d: ['Green engineering pad, pencil and graph lines.', 'Zöld mérnöki tömb, ceruza és milliméterrács.'],
    set: { pattern: 'graph', gridSize: 10, textFont: 'hand', notesFont: 'hand', labelFont: 'typewriter', nib: 'pencil', inkPalette: 'pencil', holes: 'punch', penCursor: 'pen' },
  },
  chalk: {
    d: ['Chalk on a green school board.', 'Kréta zöld iskolai táblán.'],
    set: { pattern: 'none', texture: true, vignette: true, wobble: true, wobbleAmt: 3.5, textFont: 'marker', notesFont: 'marker', labelFont: 'marker',
      nib: 'marker', inkPalette: 'pastel', symWidth: 2.5, wireWidth: 2.5, labelSize: 13, penCursor: 'dot', writeIn: 'all' },
  },
  cork: {
    d: ['Cork board covered in sticky notes.', 'Parafatábla öntapadós cetlikkel.'],
    set: { pattern: 'none', texture: true, textStyle: 'sticky', textFont: 'marker', nib: 'marker', shapeFill: 'tint', vignette: true },
  },
  terminal: {
    d: ['Green phosphor screen. Everything monospace.', 'Zöld foszforos képernyő. Minden fix szélességű.'],
    set: { uiFont: 'mono', textFont: 'mono', notesFont: 'mono', pattern: 'grid', gridOpacity: 80, radius: 0, wireJoin: 'miter', inkPalette: 'neon', shapeRadius: 0, density: 'compact' },
  },
  contrast: {
    d: ['Maximum contrast and thicker lines.', 'Maximális kontraszt, vastagabb vonalak.'],
    set: { symWidth: 2.75, wireWidth: 2.75, labelSize: 13, gridOpacity: 150, textSize: 17, juncSize: 4.6, density: 'comfy' },
  },
  midnight: {
    d: ['Pure black for OLED screens, violet accents.', 'Tiszta fekete OLED kijelzőkhöz, lila kiemelés.'],
    set: { gridOpacity: 60, inkPalette: 'neon', radius: 10 },
  },
};
const presetValues = (key) => {
  const v = {};
  for (const d of PREF_DEFS) if (VISUAL_CATS.has(d.cat) && !d.keep) v[d.id] = d.def;
  return Object.assign(v, PRESETS[key].set, { palette: presetPal(key) });
};
const presetPal = (key) => PRESETS[key].palette || key;
const presetName = (key) => PRESETS[key].n || PALETTES[presetPal(key)].n;

// ---------------------------------------------------------------- the prefs object
let P = Object.fromEntries(PREF_DEFS.map((d) => [d.id, d.def]));

function validPref(d, v) {
  switch (d.type) {
    case 'toggle': return typeof v === 'boolean' ? v : d.def;
    case 'range': return Number.isFinite(+v) && v !== null && v !== '' ? clamp(+v, d.min, d.max) : d.def;
    case 'select': { const o = d.opts.find((x) => String(x[0]) === String(v)); return o ? o[0] : d.def; }
    case 'color': return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null;
    case 'palette': return PALETTES[v] ? v : d.def;
    case 'ink': return v === 'ink' || (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) ? v : d.def;
    default: return d.def;
  }
}
function sanitizePrefs(obj) {
  const out = {};
  for (const d of PREF_DEFS) out[d.id] = validPref(d, obj ? obj[d.id] : undefined);
  for (const k of ['lastLight', 'lastDark']) if (obj && PALETTES[obj[k]]) out[k] = obj[k];
  return out;
}
function loadPrefs(settings) {
  P = sanitizePrefs(settings.prefs || {});
  if (!settings.prefs && settings.theme === 'paper') P.palette = 'paper'; // older versions only had dark / paper
}
let prefsTimer = null;
function savePrefsSoon() {
  clearTimeout(prefsTimer);
  prefsTimer = setTimeout(() => {
    S.settings.prefsUpdated = Date.now();
    api.setSettings({ prefs: P, prefsUpdated: S.settings.prefsUpdated });
    if (typeof cloudSoon === 'function') cloudSoon();
  }, 300);
}

// ---------------------------------------------------------------- applying prefs to the page
const hex = (c) => {
  c = String(c || '').trim();
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (m) return '#' + m[1].split(',').slice(0, 3).map((n) => clamp(Math.round(+n), 0, 255).toString(16).padStart(2, '0')).join('');
  return '#000000';
};
const luminance = (c) => {
  const h = hex(c);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const COLOR_VARS = { accent: '--accent', canvasColor: '--canvas', inkColor: '--ink', symColor: '--sym', wireColor: '--wire', labelColor: '--label' };

function applyPrefs() {
  const b = document.body, st = b.style;
  const pal = PALETTES[P.palette] || PALETTES.bench;
  for (const [k, v] of Object.entries(palColors(P.palette))) st.setProperty(`--${k}`, v);
  for (const [k, v] of Object.entries(COLOR_VARS)) if (P[k]) st.setProperty(v, P[k]);
  if (P.accent) st.setProperty('--accent-ink', luminance(P.accent) > 0.55 ? '#16120c' : '#ffffff');
  st.setProperty('--accent-soft', 'color-mix(in srgb, var(--accent) 28%, transparent)');
  st.setProperty('--shadow', pal.dark ? '0 12px 40px rgba(0,0,0,.45)' : '0 12px 40px rgba(60,50,30,.2)');
  st.setProperty('--hl-blend', pal.dark ? 'screen' : 'multiply');
  st.colorScheme = pal.dark ? 'dark' : 'light';
  b.classList.toggle('theme-dark', pal.dark);
  b.classList.toggle('theme-paper', !pal.dark);

  // pattern strength: below 100% fades the lines out, above it pushes them towards the text colour
  const g = P.gridOpacity;
  st.setProperty('--gl', g <= 100 ? `color-mix(in srgb, var(--grid-dot) ${g}%, transparent)` : `color-mix(in srgb, var(--grid-dot), var(--text) ${Math.round((g - 100) * 0.35)}%)`);
  st.setProperty('--gm', g <= 100 ? `color-mix(in srgb, var(--grid-major) ${g}%, transparent)` : `color-mix(in srgb, var(--grid-major), var(--grid-dot) ${g - 100}%)`);

  const px = (v) => `${v}px`;
  const vars = {
    '--font': FONTS[P.uiFont][1], '--text-font': FONTS[P.textFont][1], '--notes-font': FONTS[P.notesFont][1], '--lbl-font': FONTS[P.labelFont][1],
    '--text-size': px(P.textSize), '--text-lh': P.lineHeight / 100, '--notes-size': px(P.notesSize), '--lbl-size': px(P.labelSize),
    '--sym-w': P.symWidth, '--wire-w': P.wireWidth, '--wire-join': P.wireJoin, '--r': px(P.radius),
    '--lw': px(P.leftWidth), '--rw': px(P.rightWidth),
    '--ctl': px({ compact: 26, cozy: 30, comfy: 34 }[P.density]), '--top-h': px({ compact: 42, cozy: 48, comfy: 56 }[P.density]),
  };
  for (const [k, v] of Object.entries(vars)) st.setProperty(k, String(v));

  const cls = {
    'no-brand': !P.showBrand, 'no-tblabels': !P.toolbarLabels, 'no-hint': !P.showHint, 'no-status': !P.showStatus, 'no-coords': !P.showCoords,
    wobble: P.wobble, 'hide-refs': !P.showRefs, 'hide-values': !P.showValues, 'reduce-motion': P.reduceMotion,
  };
  for (const [k, v] of Object.entries(cls)) b.classList.toggle(k, v);
  b.dataset.textStyle = P.textStyle;
  b.dataset.cursor = P.penCursor;
  const wob = document.getElementById('f-wobble-map');
  if (wob) wob.setAttribute('scale', P.wobbleAmt);
  const notes = document.getElementById('notes');
  if (notes) notes.spellcheck = P.spellcheck;
  paintDeco(pal.dark);
  applyPenCursor();
  api.setZoom(P.uiZoom / 100);
}

// Pen cursor: a little pen whose nib takes the current ink colour.
function applyPenCursor() {
  const ink = !S.pen || S.pen.color === 'ink' ? hex(getComputedStyle(document.body).getPropertyValue('--ink')) : S.pen.color;
  const pen = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><path d="M3 23l1.8-5.6L17.6 4.6a2.3 2.3 0 013.3 0l.5.5a2.3 2.3 0 010 3.3L8.6 21.2z" fill="#fff" stroke="#1b1b1b" stroke-width="1.4" stroke-linejoin="round"/><path d="M15.4 6.8l3.8 3.8" stroke="#1b1b1b" stroke-width="1.2"/><path d="M3 23l1.8-5.6 3.8 3.8z" fill="${ink}" stroke="#1b1b1b" stroke-width="1" stroke-linejoin="round"/></svg>`;
  const dot = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="4" fill="${ink}" stroke="#fff" stroke-width="1.5"/><circle cx="7" cy="7" r="5.6" fill="none" stroke="#000" stroke-opacity=".35"/></svg>`;
  const url = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  document.body.style.setProperty('--pen-cursor', `${url(pen)} 3 23, crosshair`);
  document.body.style.setProperty('--dot-cursor', `${url(dot)} 7 7, crosshair`);
}

// Screen-fixed paper details: margin line, binding, grain, vignette.
function paintDeco(dark) {
  const el = document.getElementById('paper-deco');
  if (!el) return;
  const L = [];
  if (P.vignette) L.push(['radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.22) 100%)', '100% 100%', '0 0', 'no-repeat']);
  if (P.holes === 'spiral') {
    L.push(['linear-gradient(transparent 11px, #858b93 11px, #e6e9ed 13px, #858b93 15.5px, transparent 15.5px)', '21px 28px', '0 0', 'repeat-y']);
    L.push(['radial-gradient(circle at 19px 13px, var(--bg) 0 5px, rgba(0,0,0,.3) 5.6px 6.6px, transparent 7.2px)', '36px 28px', '0 0', 'repeat-y']);
  } else if (P.holes === 'punch') {
    L.push(['radial-gradient(circle at 22px 50%, var(--bg) 0 8px, rgba(0,0,0,.3) 8.6px 9.6px, transparent 10.2px)', '44px 33.34%', '0 0', 'repeat-y']);
  }
  if (P.margin) {
    const x = P.holes === 'none' ? 52 : 70;
    L.push([`linear-gradient(90deg, transparent ${x}px, var(--margin) ${x}px ${x + 1.5}px, transparent ${x + 1.5}px ${x + 4}px, var(--margin) ${x + 4}px ${x + 5}px, transparent ${x + 5}px)`, '100% 100%', '0 0', 'no-repeat']);
  }
  if (P.texture) {
    const c = dark ? 1 : 0;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${c} 0 0 0 0 ${c} 0 0 0 0 ${c} ${dark ? 0.3 : 0.26} 0 0 0 ${dark ? -0.1 : -0.11}'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
    L.push([`url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E')}")`, '180px 180px', '0 0', 'repeat']);
  }
  el.style.backgroundImage = L.map((l) => l[0]).join(', ') || 'none';
  el.style.backgroundSize = L.map((l) => l[1]).join(', ');
  el.style.backgroundPosition = L.map((l) => l[2]).join(', ');
  el.style.backgroundRepeat = L.map((l) => l[3]).join(', ');
}

// World-attached paper pattern (moves and zooms with the page).
function paintBackground(view) {
  const vp = document.getElementById('viewport');
  const { x, y, z } = view;
  const L = [];
  const lineH = (c, w = 1) => `linear-gradient(${c} ${w}px, transparent ${w}px)`;
  const lineV = (c, w = 1) => `linear-gradient(90deg, ${c} ${w}px, transparent ${w}px)`;
  const s = P.gridSize * z, M = P.gridSize * 5 * z;
  const at = `${x}px ${y}px`;
  switch (P.pattern) {
    case 'dots': {
      const dots = s >= 9 ? s : M;
      L.push([lineH('var(--gm)'), `${M}px ${M}px`, at], [lineV('var(--gm)'), `${M}px ${M}px`, at],
        ['radial-gradient(circle, var(--gl) 1.1px, transparent 1.6px)', `${dots}px ${dots}px`, `${x - dots / 2}px ${y - dots / 2}px`]);
      break;
    }
    case 'grid':
      L.push([lineH('var(--gl)'), `${M}px ${M}px`, at], [lineV('var(--gl)'), `${M}px ${M}px`, at]);
      if (s >= 7) L.push([lineH('color-mix(in srgb, var(--gl) 55%, transparent)'), `${s}px ${s}px`, at], [lineV('color-mix(in srgb, var(--gl) 55%, transparent)'), `${s}px ${s}px`, at]);
      break;
    case 'graph': {
      const f = s / 2;
      L.push([lineH('var(--gl)', 1.4), `${M}px ${M}px`, at], [lineV('var(--gl)', 1.4), `${M}px ${M}px`, at]);
      L.push([lineH('color-mix(in srgb, var(--gl) 70%, transparent)'), `${s}px ${s}px`, at], [lineV('color-mix(in srgb, var(--gl) 70%, transparent)'), `${s}px ${s}px`, at]);
      if (f >= 6) L.push([lineH('color-mix(in srgb, var(--gl) 35%, transparent)'), `${f}px ${f}px`, at], [lineV('color-mix(in srgb, var(--gl) 35%, transparent)'), `${f}px ${f}px`, at]);
      break;
    }
    case 'ruled': {
      const r = P.ruleSpacing * z;
      if (r >= 4) L.push([`linear-gradient(transparent ${r - 1.2}px, var(--gl) ${r - 1.2}px)`, `100% ${r}px`, `0 ${y}px`]);
      break;
    }
    case 'squared': {
      const r = P.ruleSpacing * z;
      if (r >= 4) L.push([lineH('var(--gl)'), `${r}px ${r}px`, at], [lineV('var(--gl)'), `${r}px ${r}px`, at]);
      break;
    }
    default:
  }
  vp.style.backgroundImage = L.map((l) => l[0]).join(', ') || 'none';
  vp.style.backgroundSize = L.map((l) => l[1]).join(', ');
  vp.style.backgroundPosition = L.map((l) => l[2]).join(', ');
}

// SVG filters (hand-drawn wobble, pencil grain) use one region that covers the page and the screen.
function fxRegion() {
  if (!S.project || !(P.wobble || S.pen.nib === 'pencil' || page().strokes.some((s) => s.nib === 'pencil'))) return;
  const r = vp.getBoundingClientRect();
  const v = S.view;
  let b = { x1: -v.x / v.z, y1: -v.y / v.z, x2: (r.width - v.x) / v.z, y2: (r.height - v.y) / v.z };
  const cb = contentBounds(page());
  if (cb) b = { x1: Math.min(b.x1, cb.x1), y1: Math.min(b.y1, cb.y1), x2: Math.max(b.x2, cb.x2), y2: Math.max(b.y2, cb.y2) };
  const pad = 200;
  for (const id of ['f-wobble', 'f-pencil']) {
    const f = document.getElementById(id);
    if (!f) continue;
    f.setAttribute('x', Math.floor(b.x1 - pad)); f.setAttribute('y', Math.floor(b.y1 - pad));
    f.setAttribute('width', Math.ceil(b.x2 - b.x1 + pad * 2)); f.setAttribute('height', Math.ceil(b.y2 - b.y1 + pad * 2));
  }
}

// After any change: restyle, redraw.
function onPrefsChanged(keys = []) {
  if (keys.some((k) => ['nib', 'penWidth', 'penColor'].includes(k))) S.pen = { color: P.penColor, width: P.penWidth, nib: P.nib };
  if (keys.some((k) => k === 'valueStyle' || k === 'valueExtra')) refreshPartValues();
  applyPrefs();
  if (S.project) {
    applyView();
    render();
    S.inspSig = '';
    renderInspector(true);
  }
  renderToolOptions();
}

// ---------------------------------------------------------------- Settings window
const SUI = {
  title: ['Settings', 'Beállítások'], search: ['Search settings…', 'Beállítások keresése…'], auto: ['Auto', 'Auto'],
  reset: ['Reset section', 'Szakasz visszaállítása'], resetAll: ['Reset everything', 'Minden visszaállítása'],
  confirmReset: ['Reset every setting to its default?', 'Minden beállítást visszaállítasz az alapértékre?'],
  done: ['Done', 'Kész'], none: ['No settings match', 'Nincs ilyen beállítás'], close: ['Close (Esc)', 'Bezárás (Esc)'],
  intro: ['Pick a look to start from, then fine-tune anything in the other sections. Presets only change how things look and feel, never your projects.',
    'Válassz egy kiinduló kinézetet, aztán bármit finomhangolhatsz a többi részben. Az előbeállítások csak a kinézetet és az érzetet változtatják, a projekteket soha.'],
  current: ['In use', 'Használatban'], applied: ['applied', 'alkalmazva'],
  exportS: ['Export settings…', 'Beállítások exportálása…'], importS: ['Import settings…', 'Beállítások importálása…'], folder: ['Open data folder', 'Adatmappa megnyitása'],
  exported: ['Settings exported', 'Beállítások exportálva'], imported: ['Settings imported', 'Beállítások importálva'],
  badFile: ['That is not an OhmNote settings file', 'Ez nem OhmNote beállításfájl'], count: ['settings', 'beállítás'],
  file: ['OhmNote settings', 'OhmNote beállítások'], palettes: ['Palettes', 'Paletták'],
  off: ['Off', 'Ki'],
};
const SET = { cat: 'presets', q: '' };
const settingsOpen = () => !!$('#modal .card.settings');

function openSettings(cat) {
  endEdit();
  hideMenu();
  if (cat) { SET.cat = cat; SET.q = ''; }
  const m = $('#modal');
  const n = PREF_DEFS.length + 1;
  m.innerHTML = `<div class="card settings">
    <div class="card-head">
      <svg class="gear" viewBox="0 0 20 20">${CATS[CATS.length - 1][2]}</svg>
      <h3>${L2(SUI.title)}</h3>
      <div class="search-wrap set-search"><input id="set-q" type="search" spellcheck="false" placeholder="${esc(L2(SUI.search))}" value="${esc(SET.q)}"></div>
      <button class="xbtn" data-sact="close" title="${esc(L2(SUI.close))}">✕</button>
    </div>
    <div class="set-main"><nav class="set-nav"></nav><div class="set-pane"></div></div>
    <div class="card-foot">
      <button class="btn danger" data-sact="resetAll">${L2(SUI.resetAll)}</button>
      <span class="muted small" style="margin-right:auto;align-self:center;padding-left:6px">${n} ${L2(SUI.count)}</span>
      <button class="btn primary" data-sact="close">${L2(SUI.done)}</button>
    </div></div>`;
  m.classList.remove('hidden');
  m.onclick = settingsClick;
  m.oninput = settingsInput;
  m.onchange = settingsChange;
  renderSetNav();
  renderSetPane();
}

function renderSetNav() {
  const nav = $('.set-nav');
  if (!nav) return;
  nav.innerHTML = CATS.map(([k, name, icon]) =>
    `<button data-cat="${k}" class="${!SET.q && SET.cat === k ? 'on' : ''}"><svg viewBox="0 0 20 20">${icon}</svg><span>${L2(name)}</span></button>`).join('');
}

const fmtVal = (d, v) => {
  if (d.id === 'smoothing' && v === 0) return L2(SUI.off);
  const n = Number.isInteger(v) ? v : +v.toFixed(2);
  return `${n}${d.unit ? (d.unit === '%' || d.unit === '×' ? '' : ' ') + d.unit : ''}`;
};
const effColor = (d) => {
  const varName = COLOR_VARS[d.id];
  return hex(P[d.id] || getComputedStyle(document.body).getPropertyValue(varName));
};

function rowHTML(d) {
  const v = P[d.id];
  let ctl = '';
  switch (d.type) {
    case 'toggle':
      ctl = `<label class="tgl"><input type="checkbox" data-pref="${d.id}" ${v ? 'checked' : ''}><i></i></label>`;
      break;
    case 'range':
      ctl = `<div class="rng"><input type="range" data-pref="${d.id}" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}"><output>${fmtVal(d, v)}</output></div>`;
      break;
    case 'select':
      ctl = d.dropdown
        ? `<select class="sel" data-pref="${d.id}">${d.opts.map(([k, l]) => `<option value="${k}" ${String(k) === String(v) ? 'selected' : ''}${FONTS[k] ? ` style="font-family:${esc(FONTS[k][1])}"` : ''}>${esc(L2(l))}</option>`).join('')}</select>`
        : `<div class="seg ${d.wrap ? 'wrap' : ''}">${d.opts.map(([k, l]) => `<button data-seg="${d.id}" data-v="${k}" class="${String(k) === String(v) ? 'on' : ''}">${esc(L2(l))}</button>`).join('')}</div>`;
      break;
    case 'color':
      ctl = `<div class="clr"><input type="color" data-pref="${d.id}" value="${effColor(d)}"><button class="btn sm" data-reset="${d.id}" ${v ? '' : 'disabled'}>${L2(SUI.auto)}</button></div>`;
      break;
    case 'ink':
      ctl = `<div class="swatches" style="margin:0">${inkColors().map((c) =>
        `<button data-inkc="${c}" class="${v === c ? 'on' : ''}" style="background:${c === 'ink' ? 'var(--ink)' : c}" title="${c === 'ink' ? esc(tr('opt.ink')) : c}"></button>`).join('')}</div>`;
      break;
    case 'lang':
      ctl = `<select class="sel" data-lang>${Object.entries(LANGS).map(([k, l]) => `<option value="${k}" ${k === LANG ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      break;
    case 'palette':
      ctl = `<div class="pals">${Object.entries(PALETTES).map(([k, p]) => {
        const c = palColors(k);
        return `<button class="pal ${v === k ? 'on' : ''}" data-pal="${k}"><span class="chips"><i style="background:${c.canvas}"></i><i style="background:${c.panel}"></i><i style="background:${c.accent}"></i><i style="background:${c.wire}"></i><i style="background:${c.sym}"></i></span><span>${esc(L2(p.n))}</span></button>`;
      }).join('')}</div>`;
      break;
    case 'fontlist':
      return fontListHTML();
    case 'action':
      return `<div class="btn-row set-actions"><button class="btn" data-sact="export">${L2(SUI.exportS)}</button><button class="btn" data-sact="import">${L2(SUI.importS)}</button><button class="btn" data-sact="folder">${L2(SUI.folder)}</button></div>`;
    default:
  }
  const off = d.when && !d.when();
  return `<div class="srow ${d.type === 'palette' ? 'wide' : ''} ${off ? 'off' : ''}" data-row="${d.id}">
    <div class="sl"><div class="st">${esc(L2(d.l))}</div>${d.h ? `<div class="sh">${esc(L2(d.h))}</div>` : ''}</div>
    <div class="sc">${ctl}</div></div>`;
}

function presetSVG(key) {
  const v = presetValues(key);
  const c = palColors(v.palette);
  const W = 240, Hh = 120;
  let bg = '';
  if (v.pattern === 'ruled') for (let y = 22; y < Hh; y += 16) bg += `<path d="M0 ${y}H${W}" stroke="${c['grid-dot']}" stroke-width="1"/>`;
  else if (v.pattern === 'dots') for (let y = 10; y < Hh; y += 14) for (let x = 10; x < W; x += 14) bg += `<circle cx="${x}" cy="${y}" r="1" fill="${c['grid-dot']}"/>`;
  else if (v.pattern === 'squared') {
    for (let x = 0; x < W; x += 12) bg += `<path d="M${x} 0V${Hh}" stroke="${c['grid-dot']}" stroke-width=".8"/>`;
    for (let y = 0; y < Hh; y += 12) bg += `<path d="M0 ${y}H${W}" stroke="${c['grid-dot']}" stroke-width=".8"/>`;
  } else if (v.pattern === 'grid' || v.pattern === 'graph') {
    const step = v.pattern === 'graph' ? 8 : 14;
    for (let x = 0; x < W; x += step) bg += `<path d="M${x} 0V${Hh}" stroke="${c['grid-dot']}" stroke-width="${x % (step * 5) === 0 ? 1.2 : 0.6}"/>`;
    for (let y = 0; y < Hh; y += step) bg += `<path d="M0 ${y}H${W}" stroke="${c['grid-dot']}" stroke-width="${y % (step * 5) === 0 ? 1.2 : 0.6}"/>`;
  }
  if (v.holes !== 'none') for (let y = 10; y < Hh; y += v.holes === 'spiral' ? 14 : 40) bg += `<circle cx="12" cy="${y + (v.holes === 'spiral' ? 0 : 10)}" r="${v.holes === 'spiral' ? 3.5 : 5.5}" fill="${c.bg}"/>${v.holes === 'spiral' ? `<path d="M0 ${y}H12" stroke="#9aa0a7" stroke-width="2"/>` : ''}`;
  if (v.margin) bg += `<path d="M34 0V${Hh}M37 0V${Hh}" stroke="${c.margin}" stroke-width="1"/>`;
  const lf = esc(FONTS[v.labelFont][1]), tf = esc(FONTS[v.textFont][1]);
  const sw = v.symWidth, ww = v.wireWidth;
  const wob = v.wobble ? ' filter="url(#f-prev-wobble)"' : '';
  const note = v.textStyle === 'sticky'
    ? `<g transform="rotate(-3 180 30)"><rect x="150" y="10" width="72" height="44" fill="#fff3a6" rx="2"/><text x="157" y="36" font-family="${tf}" font-size="13" fill="#2d2a12">5V ok!</text></g>`
    : `<text x="160" y="34" font-family="${tf}" font-size="13" fill="${c.ink}">5V ok!</text>`;
  const nibW = { fountain: 2.6, marker: 4, pencil: 1.6, highlighter: 8, round: 2.2 }[v.nib];
  return `<svg viewBox="0 0 ${W} ${Hh}" aria-hidden="true">
    <rect width="${W}" height="${Hh}" fill="${c.canvas}"/>${bg}
    <g${wob} fill="none" stroke-linecap="round" stroke-linejoin="${v.wireJoin}">
      <path d="M48 64H74 M128 64H150V96H48V64" stroke="${c.wire}" stroke-width="${ww}"/>
      <path d="M74 64l4-8 6 16 6-16 6 16 6-16 6 16 6-16 6 16 4-8" stroke="${c.sym}" stroke-width="${sw}"/>
      <circle cx="48" cy="64" r="${v.juncSize}" fill="${c.wire}" stroke="none"/>
    </g>
    <text x="101" y="46" text-anchor="middle" font-family="${lf}" font-size="11" font-weight="600" fill="${c.label}">R1</text>
    <text x="101" y="88" text-anchor="middle" font-family="${lf}" font-size="10" fill="${c['label-val']}">10k</text>
    ${note}
    <path d="M168 104c8-14 16 8 24-4s14 6 26-8" fill="none" stroke="${c.ink}" stroke-width="${nibW}" stroke-linecap="round" ${v.nib === 'highlighter' ? 'opacity=".4"' : v.nib === 'pencil' ? 'opacity=".75"' : ''}/>
  </svg>`;
}
function presetActive(key) {
  const v = presetValues(key);
  return Object.entries(v).every(([k, x]) => String(P[k]) === String(x));
}
function presetCard(key) {
  return `<button class="preset ${presetActive(key) ? 'on' : ''}" data-preset="${key}">${presetSVG(key)}
    <span class="pn">${esc(L2(presetName(key)))}${presetActive(key) ? `<em>${L2(SUI.current)}</em>` : ''}</span>
    <span class="pd">${esc(L2(PRESETS[key].d))}</span></button>`;
}

function defText(d) {
  const all = [d.l, d.h, ...(d.opts || []).map((o) => o[1])].filter(Boolean).flatMap((x) => (Array.isArray(x) ? x : [x]));
  return all.join(' ').toLowerCase();
}

function renderSetPane(keepScroll = false) {
  const pane = $('.set-pane');
  if (!pane) return;
  const top = pane.scrollTop;
  const q = SET.q.trim().toLowerCase();
  let h = '';
  if (q) {
    for (const [cat, name] of CATS) {
      if (cat === 'presets') {
        const ks = Object.keys(PRESETS).filter((k) => `${presetName(k).join(' ')} ${PRESETS[k].d.join(' ')}`.toLowerCase().includes(q));
        if (ks.length) h += `<h4 class="set-cat">${L2(name)}</h4><div class="presets">${ks.map(presetCard).join('')}</div>`;
        continue;
      }
      const rows = DEFS.filter((d) => d.cat === cat && d.type !== 'head' && d.type !== 'action' && defText(d).includes(q));
      if (rows.length) h += `<h4 class="set-cat">${L2(name)}</h4>${rows.map(rowHTML).join('')}`;
    }
    if (!h) h = `<div class="empty">${L2(SUI.none)}</div>`;
  } else if (SET.cat === 'presets') {
    h = `<div class="set-title"><h4>${L2(CATS[0][1])}</h4></div><p class="set-intro">${L2(SUI.intro)}</p>
      <div class="presets">${Object.keys(PRESETS).map(presetCard).join('')}</div>`;
  } else {
    const cat = CATS.find((c) => c[0] === SET.cat);
    h = `<div class="set-title"><h4>${L2(cat[1])}</h4>${SET.cat === 'general' || SET.cat === 'fonts' ? '' : `<button class="btn sm" data-sact="resetCat">${L2(SUI.reset)}</button>`}</div>`;
    h += DEFS.filter((d) => d.cat === SET.cat).map((d) => (d.type === 'head' ? `<h5 class="set-h">${esc(L2(d.l))}</h5>` : rowHTML(d))).join('');
  }
  pane.innerHTML = h;
  if (keepScroll) pane.scrollTop = top;
}

const defOf = (id) => PREF_DEFS.find((d) => d.id === id);
let liveRaf = 0;
const liveKeys = new Set();
function setPref(id, v, live = false) {
  const d = defOf(id);
  P[id] = d ? validPref(d, v) : v;
  savePrefsSoon();
  if (!live) { onPrefsChanged([id]); return; }
  liveKeys.add(id);
  if (!liveRaf) liveRaf = requestAnimationFrame(() => { liveRaf = 0; const ks = [...liveKeys]; liveKeys.clear(); onPrefsChanged(ks); });
}

function applyPreset(key) {
  Object.assign(P, presetValues(key));
  if (PALETTES[P.palette].dark) P.lastDark = P.palette; else P.lastLight = P.palette;
  savePrefsSoon();
  onPrefsChanged(['nib', 'penWidth', 'penColor']);
  renderSetPane(true);
  toast(`${L2(presetName(key))} ${L2(SUI.applied)}`);
}

async function settingsClick(e) {
  const m = $('#modal');
  if (e.target === m) { closeModal(); return; }
  const t = e.target;
  const cat = t.closest('[data-cat]');
  if (cat) {
    SET.cat = cat.dataset.cat; SET.q = '';
    $('#set-q').value = '';
    renderSetNav(); renderSetPane();
    $('.set-pane').scrollTop = 0;
    return;
  }
  const pr = t.closest('[data-preset]');
  if (pr) { applyPreset(pr.dataset.preset); return; }
  const seg = t.closest('[data-seg]');
  if (seg) { setPref(seg.dataset.seg, seg.dataset.v); renderSetPane(true); return; }
  const pal = t.closest('[data-pal]');
  if (pal) {
    setPref('palette', pal.dataset.pal);
    if (PALETTES[P.palette].dark) P.lastDark = P.palette; else P.lastLight = P.palette;
    renderSetPane(true);
    return;
  }
  const fa = t.closest('[data-font]');
  if (fa) { fontAction(fa.dataset.font, fa.dataset.fid); return; }
  const ink = t.closest('[data-inkc]');
  if (ink) { setPref('penColor', ink.dataset.inkc); renderSetPane(true); return; }
  const rs = t.closest('[data-reset]');
  if (rs) { setPref(rs.dataset.reset, null); renderSetPane(true); return; }
  const a = t.closest('[data-sact]');
  if (!a) return;
  switch (a.dataset.sact) {
    case 'close': closeModal(); break;
    case 'resetCat':
      for (const d of PREF_DEFS) if (d.cat === SET.cat) P[d.id] = d.def;
      savePrefsSoon(); onPrefsChanged(['nib', 'penWidth', 'penColor']); renderSetPane(true);
      break;
    case 'resetAll':
      if (!confirm(L2(SUI.confirmReset))) return;
      P = sanitizePrefs({});
      savePrefsSoon(); onPrefsChanged(['nib', 'penWidth', 'penColor']); renderSetPane(true);
      break;
    case 'export':
      if (await api.exportText(JSON.stringify({ ohmnoteSettings: 1, prefs: P }, null, 2), L2(SUI.file), 'json', 'JSON')) toast(L2(SUI.exported));
      break;
    case 'import': importSettings(); break;
    case 'makeFont': openFontMaker(); break;
    case 'addFont': addFontFile(); break;
    case 'folder': api.openDataFolder(); break;
    default:
  }
}

function importSettings() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      if (!obj || typeof obj.prefs !== 'object') throw new Error('bad');
      P = sanitizePrefs(obj.prefs);
      savePrefsSoon();
      onPrefsChanged(['nib', 'penWidth', 'penColor']);
      renderSetPane(true);
      toast(L2(SUI.imported));
    } catch {
      toast(L2(SUI.badFile), true);
    }
  };
  inp.click();
}

function settingsInput(e) {
  const t = e.target;
  if (t.id === 'set-q') { SET.q = t.value; renderSetNav(); renderSetPane(); return; }
  const id = t.dataset.pref;
  if (!id) return;
  if (t.type === 'range') {
    const d = defOf(id);
    t.nextElementSibling.textContent = fmtVal(d, +t.value);
    setPref(id, +t.value, true);
  } else if (t.type === 'color') {
    setPref(id, t.value, true);
    const rb = t.parentElement.querySelector('[data-reset]');
    if (rb) rb.disabled = false;
  }
}

function settingsChange(e) {
  const t = e.target;
  if (t.dataset.lang !== undefined) { setLang(t.value); return; }
  const id = t.dataset.pref;
  if (!id) return;
  if (t.type === 'checkbox') setPref(id, t.checked);
  else if (t.tagName === 'SELECT') setPref(id, t.value);
  else return; // ranges and colours are already applied while dragging
  renderSetPane(true);
}

// ---------------------------------------------------------------- user fonts (added from a file or made by hand)
const USER_FONTS = []; // { id, name, kind: 'file' | 'hand', ext, created, bytes }
const FONT_TEXT = {
  none: ['No fonts of your own yet. Add a font file, or write your own handwriting font letter by letter.',
    'Még nincs saját betűtípusod. Adj hozzá egy betűtípusfájlt, vagy írd meg a saját kézírásodat betűről betűre.'],
  make: ['Create handwriting font…', 'Kézírásos betűtípus készítése…'], add: ['Add font file…', 'Betűtípusfájl hozzáadása…'],
  hand: ['Handwriting', 'Kézírás'], file: ['Font file', 'Fájl'], edit: ['Edit', 'Szerkesztés'], use: ['Use for text', 'Szöveghez'],
  exp: ['Export', 'Exportálás'], del: ['Delete', 'Törlés'], added: ['Font added', 'Betűtípus hozzáadva'],
  bad: ['That file is not a font this app can read (.ttf, .otf, .woff, .woff2)', 'Ezt a fájlt nem lehet betűtípusként betölteni (.ttf, .otf, .woff, .woff2)'],
  confirmDel: ['Delete this font? It is moved to the trash folder.', 'Törlöd ezt a betűtípust? A kukamappába kerül.'],
  used: ['Now used for text boxes and page notes', 'Mostantól ezt használják a szövegdobozok és az oldaljegyzetek'],
  hint: ['Your fonts also appear in every font list in Settings.', 'A saját betűtípusaid a Beállítások összes betűtípus-listájában is megjelennek.'],
  sample: 'Árvíztűrő tükörfúrógép · 10 kΩ ± 5%',
};
const fontKey = (id) => `u:${id}`;
const fontFamily = (id) => `ohm-${id}`;

async function registerFont(meta, bytes) {
  const family = fontFamily(meta.id);
  const face = new FontFace(family, bytes);
  await face.load(); // throws if the browser cannot read it
  for (const f of [...document.fonts]) if (f.family.replace(/"/g, '') === family) document.fonts.delete(f);
  document.fonts.add(face);
  const fallback = meta.kind === 'hand' ? '"Ink Free", "Segoe Print", cursive' : '"Segoe UI", system-ui, sans-serif';
  const key = fontKey(meta.id);
  FONTS[key] = [[meta.name, meta.name], `"${family}", ${fallback}`];
  const opt = [key, [meta.name, meta.name]];
  const i = FONT_OPTS.findIndex((o) => o[0] === key);
  if (i >= 0) FONT_OPTS[i] = opt; else FONT_OPTS.push(opt);
  const entry = { id: meta.id, name: meta.name, kind: meta.kind, ext: meta.ext, created: meta.created, updated: meta.updated || meta.created, bytes };
  const j = USER_FONTS.findIndex((f) => f.id === meta.id);
  if (j >= 0) USER_FONTS[j] = entry; else USER_FONTS.push(entry);
}
function unregisterFont(id) {
  const key = fontKey(id);
  delete FONTS[key];
  const i = FONT_OPTS.findIndex((o) => o[0] === key);
  if (i >= 0) FONT_OPTS.splice(i, 1);
  const j = USER_FONTS.findIndex((f) => f.id === id);
  if (j >= 0) USER_FONTS.splice(j, 1);
  for (const f of [...document.fonts]) if (f.family.replace(/"/g, '') === fontFamily(id)) document.fonts.delete(f);
  P = sanitizePrefs(P); // anything that used this font goes back to its default
}
async function loadUserFonts() {
  try {
    for (const m of await api.listFonts()) {
      try { await registerFont(m, m.bytes); } catch { /* unreadable font file: skip it */ }
    }
  } catch { /* no fonts folder yet */ }
}

function fontListHTML() {
  const rows = USER_FONTS.map((f) => `<div class="frow">
      <div class="fmeta"><div class="fname">${esc(f.name)} <span class="badge">${L2(FONT_TEXT[f.kind === 'hand' ? 'hand' : 'file'])}</span></div>
        <div class="fprev" style="font-family:${esc(FONTS[fontKey(f.id)][1])}">${esc(FONT_TEXT.sample)}</div></div>
      <div class="btn-row">
        ${f.kind === 'hand' ? `<button class="btn sm" data-font="edit" data-fid="${f.id}">${L2(FONT_TEXT.edit)}</button>` : ''}
        <button class="btn sm" data-font="use" data-fid="${f.id}">${L2(FONT_TEXT.use)}</button>
        <button class="btn sm" data-font="export" data-fid="${f.id}">${L2(FONT_TEXT.exp)}</button>
        <button class="btn sm danger" data-font="del" data-fid="${f.id}">${L2(FONT_TEXT.del)}</button>
      </div></div>`).join('');
  return `<div class="fontlist">${rows || `<p class="muted">${L2(FONT_TEXT.none)}</p>`}</div>
    <div class="btn-row set-actions"><button class="btn primary" data-sact="makeFont">${L2(FONT_TEXT.make)}</button>
      <button class="btn" data-sact="addFont">${L2(FONT_TEXT.add)}</button></div>
    <p class="muted small" style="margin-top:12px">${L2(FONT_TEXT.hint)}</p>`;
}

function addFontFile() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.ttf,.otf,.woff,.woff2';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const meta = { id: `f${uid()}`, name: f.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Font', kind: 'file', ext, created: Date.now(), updated: Date.now() };
    try {
      if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext)) throw new Error('ext');
      const bytes = new Uint8Array(await f.arrayBuffer());
      await registerFont(meta, bytes);
      await api.saveFont(meta, bytes);
      toast(L2(FONT_TEXT.added));
    } catch {
      unregisterFont(meta.id);
      toast(L2(FONT_TEXT.bad), true);
    }
    if (settingsOpen()) renderSetPane(true);
  };
  inp.click();
}

async function fontAction(act, id) {
  const f = USER_FONTS.find((x) => x.id === id);
  if (!f) return;
  if (act === 'edit') openFontMaker(id);
  if (act === 'use') {
    P.textFont = P.notesFont = fontKey(id);
    savePrefsSoon(); onPrefsChanged(); renderSetPane(true);
    toast(L2(FONT_TEXT.used));
  }
  if (act === 'export') {
    if (await api.exportBinary(f.bytes, f.name, f.ext, f.ext.toUpperCase())) toast(L2(FONT_TEXT.exp));
  }
  if (act === 'del') {
    if (P.confirmDelete && !confirm(L2(FONT_TEXT.confirmDel))) return;
    await api.deleteFont(id);
    unregisterFont(id);
    cloudForget('font', id);
    savePrefsSoon(); onPrefsChanged(); renderSetPane(true);
  }
}
