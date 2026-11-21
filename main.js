// OhmNote — Electron main process.
// Owns the window and all file access. Projects live as JSON files in
// %APPDATA%/OhmNote/projects/<id>.json; deleted projects move to ./trash.
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const dataDir = () => path.join(app.getPath('userData'), 'projects');
const trashDir = () => path.join(app.getPath('userData'), 'trash');
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

const ID_RE = /^[a-z0-9-]{4,64}$/i;
function projectPath(id) {
  if (!ID_RE.test(String(id))) throw new Error('Invalid project id');
  return path.join(dataDir(), `${id}.json`);
}

function ensureDirs() {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.mkdirSync(trashDir(), { recursive: true });
}

function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

// Dialog text follows the language chosen in the app (stored in settings.json).
const DIALOG_TEXT = {
  en: {
    exportProject: 'Export project', importProject: 'Import project', exportPng: 'Export page as PNG',
    ohm: 'OhmNote project', png: 'PNG image', notOhm: 'That file is not an OhmNote project.',
    exportX: (label) => `Export ${label}`,
  },
  hu: {
    exportProject: 'Projekt exportálása', importProject: 'Projekt importálása', exportPng: 'Oldal exportálása PNG képként',
    ohm: 'OhmNote projekt', png: 'PNG kép', notOhm: 'Ez a fájl nem OhmNote projekt.',
    exportX: (label) => `${label} exportálása`,
  },
};
const dt = () => DIALOG_TEXT[readJson(settingsFile(), {}).lang] || DIALOG_TEXT.en;

let win;

function createWindow() {
  const settings = readJson(settingsFile(), {});
  const bounds = settings.bounds || { width: 1440, height: 900 };
  win = new BrowserWindow({
    ...bounds,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#121418',
    title: 'OhmNote',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });
  if (settings.maximized) win.maximize();
  try {
    const ses = win.webContents.session;
    const want = ['en-US', 'hu'].filter((l) => ses.availableSpellCheckerLanguages.includes(l));
    if (want.length) ses.setSpellCheckerLanguages(want);
  } catch {}
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Links in notes open in the real browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  win.on('close', () => {
    const s = readJson(settingsFile(), {});
    s.maximized = win.isMaximized();
    if (!s.maximized) s.bounds = win.getBounds();
    try { writeAtomic(settingsFile(), JSON.stringify(s, null, 2)); } catch {}
  });
}

// ---------- IPC: projects ----------
ipcMain.handle('projects:list', () => {
  ensureDirs();
  return fs.readdirSync(dataDir())
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const p = readJson(path.join(dataDir(), f), null);
      if (!p || !p.id) return null;
      return { id: p.id, name: p.name, updated: p.updated || 0, pages: (p.pages || []).length };
    })
    .filter(Boolean)
    .sort((a, b) => b.updated - a.updated);
});

ipcMain.handle('project:load', (_e, id) => readJson(projectPath(id), null));

ipcMain.handle('project:save', (_e, project) => {
  ensureDirs();
  writeAtomic(projectPath(project.id), JSON.stringify(project));
  return true;
});

// Synchronous save used while the window is closing.
ipcMain.on('project:saveSync', (e, project) => {
  try {
    ensureDirs();
    writeAtomic(projectPath(project.id), JSON.stringify(project));
    e.returnValue = true;
  } catch { e.returnValue = false; }
});

ipcMain.handle('project:delete', (_e, id) => {
  ensureDirs();
  const src = projectPath(id);
  const stamp = Date.now();
  if (fs.existsSync(src)) fs.renameSync(src, path.join(trashDir(), `${id}-${stamp}.json`));
  const assets = assetDir(id);
  if (fs.existsSync(assets)) fs.renameSync(assets, path.join(trashDir(), `${id}-${stamp}.assets`));
  return true;
});

// ---------- IPC: project pictures (scanned pages) ----------
// Big images live next to the project as files, so the project JSON and the undo history stay small.
const assetDir = (pid) => path.join(dataDir(), `${projectPath(pid) && pid}.assets`);
const ASSET_RE = /^[a-z0-9-]{4,64}\.(webp|png|jpg)$/i;
function assetFile(pid, name) {
  if (!ASSET_RE.test(String(name))) throw new Error('Invalid picture name');
  return path.join(assetDir(pid), name);
}
const DATA_URL_RE = /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/;
function writeAssetDataUrl(pid, aid, dataUrl) {
  const m = DATA_URL_RE.exec(String(dataUrl));
  if (!m || !/^[a-z0-9-]{4,64}$/i.test(String(aid))) throw new Error('Invalid picture');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  fs.mkdirSync(assetDir(pid), { recursive: true });
  fs.writeFileSync(assetFile(pid, `${aid}.${ext}`), Buffer.from(m[2], 'base64'));
  return `${aid}.${ext}`;
}
function readAssetDataUrl(pid, name) {
  const file = assetFile(pid, name);
  if (!fs.existsSync(file)) return null;
  const ext = name.split('.').pop().toLowerCase();
  return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fs.readFileSync(file).toString('base64')}`;
}
ipcMain.handle('asset:save', (_e, pid, aid, dataUrl) => writeAssetDataUrl(pid, aid, dataUrl));
ipcMain.handle('asset:load', (_e, pid, name) => readAssetDataUrl(pid, name));
ipcMain.handle('asset:list', (_e, pid) => {
  const dir = assetDir(pid);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => ASSET_RE.test(f)) : [];
});

ipcMain.handle('project:export', async (_e, project) => {
  const safe = String(project.name || 'project').replace(/[\\/:*?"<>|]+/g, '_');
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: dt().exportProject,
    defaultPath: `${safe}.ohm`,
    filters: [{ name: dt().ohm, extensions: ['ohm'] }],
  });
  if (canceled || !filePath) return false;
  // pictures go inside the .ohm file so it can be opened anywhere
  const assets = {};
  const dir = assetDir(project.id);
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (ASSET_RE.test(f)) assets[f] = readAssetDataUrl(project.id, f);
  fs.writeFileSync(filePath, JSON.stringify(Object.keys(assets).length ? { ...project, assets } : project), 'utf8');
  return true;
});

ipcMain.handle('project:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: dt().importProject,
    properties: ['openFile'],
    filters: [{ name: dt().ohm, extensions: ['ohm', 'json'] }],
  });
  if (canceled || !filePaths.length) return null;
  const p = readJson(filePaths[0], null);
  if (!p || !Array.isArray(p.pages)) throw new Error(dt().notOhm);
  return p; // renderer assigns a fresh id, saves the pictures (p.assets) and the project
});
ipcMain.handle('asset:import', (_e, pid, name, dataUrl) => {
  const m = /^([a-z0-9-]{4,64})\.(webp|png|jpg)$/i.exec(String(name));
  if (!m) throw new Error('Invalid picture name');
  return writeAssetDataUrl(pid, m[1], dataUrl);
});

ipcMain.handle('export:pdf', async (_e, name) => {
  const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { marginType: 'none' }, preferCSSPageSize: true });
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: dt().exportX('PDF'),
    defaultPath: `${String(name || 'book').replace(/[\\/:*?"<>|]+/g, '_')}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, pdf);
  return true;
});

// ---------- IPC: exports ----------
ipcMain.handle('export:png', async (_e, rect, name) => {
  const image = await win.webContents.capturePage({
    x: Math.round(rect.x), y: Math.round(rect.y),
    width: Math.round(rect.width), height: Math.round(rect.height),
  });
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: dt().exportPng,
    defaultPath: `${String(name || 'page').replace(/[\\/:*?"<>|]+/g, '_')}.png`,
    filters: [{ name: dt().png, extensions: ['png'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, image.toPNG());
  return true;
});

ipcMain.handle('export:text', async (_e, text, name, ext, label) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: dt().exportX(label),
    defaultPath: `${String(name || 'export').replace(/[\\/:*?"<>|]+/g, '_')}.${ext}`,
    filters: [{ name: label, extensions: [ext] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, text, 'utf8');
  return true;
});

ipcMain.handle('export:binary', async (_e, bytes, name, ext, label) => {
  if (!/^[a-z0-9]{2,6}$/i.test(String(ext))) throw new Error('Invalid extension');
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: dt().exportX(label),
    defaultPath: `${String(name || 'export').replace(/[\\/:*?"<>|]+/g, '_')}.${ext}`,
    filters: [{ name: label, extensions: [ext] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, Buffer.from(bytes));
  return true;
});

// ---------- IPC: fonts ----------
// Each font is <id>.json (name, kind, and for handwriting fonts the strokes) plus <id>.<ext> (the font file).
const fontsDir = () => path.join(app.getPath('userData'), 'fonts');
const FONT_EXT = new Set(['ttf', 'otf', 'woff', 'woff2']);
function fontMetaPath(id) {
  if (!ID_RE.test(String(id))) throw new Error('Invalid font id');
  return path.join(fontsDir(), `${id}.json`);
}
ipcMain.handle('fonts:list', () => {
  fs.mkdirSync(fontsDir(), { recursive: true });
  return fs.readdirSync(fontsDir()).filter((f) => f.endsWith('.json')).map((f) => {
    const m = readJson(path.join(fontsDir(), f), null);
    if (!m || !ID_RE.test(String(m.id)) || !FONT_EXT.has(m.ext)) return null;
    const file = path.join(fontsDir(), `${m.id}.${m.ext}`);
    if (!fs.existsSync(file)) return null;
    const { source, ...meta } = m;
    return { ...meta, bytes: new Uint8Array(fs.readFileSync(file)) };
  }).filter(Boolean).sort((a, b) => (a.created || 0) - (b.created || 0));
});
ipcMain.handle('fonts:source', (_e, id) => (readJson(fontMetaPath(id), {}) || {}).source || null);
ipcMain.handle('fonts:save', (_e, meta, bytes) => {
  if (!FONT_EXT.has(meta.ext)) throw new Error('Unsupported font type');
  if (!bytes || bytes.byteLength > 30 * 1024 * 1024) throw new Error('Font file is too large');
  fs.mkdirSync(fontsDir(), { recursive: true });
  const metaFile = fontMetaPath(meta.id);
  const old = readJson(metaFile, null);
  if (old && old.ext !== meta.ext) fs.rmSync(path.join(fontsDir(), `${meta.id}.${old.ext}`), { force: true });
  fs.writeFileSync(path.join(fontsDir(), `${meta.id}.${meta.ext}`), Buffer.from(bytes));
  writeAtomic(metaFile, JSON.stringify({ ...meta, name: String(meta.name || 'Font').slice(0, 80) }));
  return true;
});
ipcMain.handle('fonts:delete', (_e, id) => {
  const metaFile = fontMetaPath(id);
  const m = readJson(metaFile, null);
  if (!m) return true;
  ensureDirs();
  const stamp = Date.now();
  fs.renameSync(metaFile, path.join(trashDir(), `font-${id}-${stamp}.json`));
  const file = path.join(fontsDir(), `${id}.${m.ext}`);
  if (FONT_EXT.has(m.ext) && fs.existsSync(file)) fs.renameSync(file, path.join(trashDir(), `font-${id}-${stamp}.${m.ext}`));
  return true;
});

ipcMain.handle('settings:get', () => readJson(settingsFile(), {}));
ipcMain.handle('settings:set', (_e, patch) => {
  const s = { ...readJson(settingsFile(), {}), ...patch };
  writeAtomic(settingsFile(), JSON.stringify(s, null, 2));
  return s;
});

ipcMain.handle('app:openDataFolder', () => shell.openPath(dataDir()));

app.whenReady().then(() => {
  ensureDirs();
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
