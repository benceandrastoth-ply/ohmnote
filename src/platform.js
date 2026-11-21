// OhmNote — storage and file access when there is no Electron underneath (the Android app, or a browser).
// On Windows / Linux, preload.js provides window.ohm and this file does nothing.
// Here everything lives in IndexedDB; files you export are shared (Android) or downloaded (browser).
'use strict';

(() => {
  if (window.ohm) return; // desktop app: the real file system is used

  const Cap = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor : null;
  const native = (name) => (Cap ? Cap.registerPlugin(name) : null);
  const Filesystem = native('Filesystem');
  const Share = native('Share');

  // ---------------------------------------------------------------- IndexedDB
  let dbp = null;
  const db = () => (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('ohmnote', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const s of ['projects', 'assets', 'fonts', 'kv']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const s = t.objectStore(store);
      const out = fn(s);
      t.oncomplete = () => res(out && 'result' in out ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  };
  const get = (store, key) => tx(store, 'readonly', (s) => s.get(key));
  const put = (store, key, val) => tx(store, 'readwrite', (s) => { s.put(val, key); });
  const del = (store, key) => tx(store, 'readwrite', (s) => { s.delete(key); });
  const all = (store) => tx(store, 'readonly', (s) => s.getAll());
  const keys = (store) => tx(store, 'readonly', (s) => s.getAllKeys());
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------------------------------------------------------------- files out / in
  const toBase64 = (bytes) => {
    let s = '';
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const safeName = (n) => String(n || 'export').replace(/[\\/:*?"<>|]+/g, '_');
  async function saveFile(name, data, mime) {
    const fname = safeName(name);
    if (Cap && Filesystem && Share) { // Android: write to the cache, then open the share sheet (Drive, Files, mail…)
      const isText = typeof data === 'string' && !/^data:/.test(data);
      const b64 = typeof data === 'string' ? (isText ? null : data.split(',')[1]) : toBase64(data);
      const r = await Filesystem.writeFile({ path: fname, data: isText ? data : b64, directory: 'CACHE', ...(isText ? { encoding: 'utf8' } : {}) });
      await Share.share({ title: fname, url: r.uri, dialogTitle: fname });
      return true;
    }
    const blob = typeof data === 'string'
      ? (/^data:/.test(data) ? await (await fetch(data)).blob() : new Blob([data], { type: mime || 'text/plain' }))
      : new Blob([data], { type: mime || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return true;
  }
  const pickFile = (accept) => new Promise((res) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = accept;
    i.onchange = () => res(i.files[0] || null);
    i.click();
  });

  // A page as a PNG without Electron's screen capture: draw the page SVG into a canvas.
  async function pagePng(name) {
    const pg = typeof page === 'function' ? page() : null;
    if (!pg || typeof pageSVG !== 'function') return false;
    await loadAllAssets([pg]);
    let svg = pageSVG(pg).replace('<svg class="bk-svg"', '<svg class="bk-svg" width="1600" height="1200"');
    // resolve the CSS colour variables so the picture looks the same outside the app
    const cs = getComputedStyle(document.body);
    svg = svg.replace(/var\((--[a-z0-9-]+)\)/g, (m, v) => cs.getPropertyValue(v).trim() || '#000');
    const css = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } })
      .filter((t) => /^\.(ln|fl|tx|lbl|wire|junc|comp|tbox|tbody|rich)/.test(t)).join('\n')
      .replace(/var\((--[a-z0-9-]+)\)/g, (m, v) => cs.getPropertyValue(v).trim() || '#000');
    svg = svg.replace('>', `><style>${css}</style><rect x="-100000" y="-100000" width="200000" height="200000" fill="${cs.getPropertyValue('--canvas').trim()}"/>`);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 1600; c.height = 1200;
    c.getContext('2d').drawImage(img, 0, 0);
    let url;
    try { url = c.toDataURL('image/png'); } catch { return saveFile(`${name}.svg`, svg, 'image/svg+xml'); } // tainted: fall back to SVG
    return saveFile(`${name}.png`, url, 'image/png');
  }

  // ---------------------------------------------------------------- the same API preload.js offers
  window.ohm = {
    platform: Cap ? 'android' : 'web',
    async listProjects() {
      return (await all('projects')).filter((p) => p && p.id).map((p) => ({ id: p.id, name: p.name, updated: p.updated || 0, pages: (p.pages || []).length }))
        .sort((a, b) => b.updated - a.updated);
    },
    loadProject: async (id) => clone((await get('projects', id)) || null),
    saveProject: async (p) => { await put('projects', p.id, clone(p)); return true; },
    saveProjectSync: (p) => { put('projects', p.id, clone(p)); return true; }, // best effort while closing
    async deleteProject(id) {
      const p = await get('projects', id);
      if (p) await put('kv', `trash:${id}:${Date.now()}`, p);
      await del('projects', id);
      for (const k of await keys('assets')) if (String(k).startsWith(`${id}/`)) await del('assets', k);
      return true;
    },
    async exportProject(p) {
      const assets = {};
      for (const k of await keys('assets')) if (String(k).startsWith(`${p.id}/`)) assets[String(k).slice(p.id.length + 1)] = await get('assets', k);
      return saveFile(`${p.name || 'project'}.ohm`, JSON.stringify(Object.keys(assets).length ? { ...p, assets } : p), 'application/json');
    },
    async importProject() {
      const f = await pickFile('.ohm,.json,application/json');
      if (!f) return null;
      const p = JSON.parse(await f.text());
      if (!p || !Array.isArray(p.pages)) throw new Error('That file is not an OhmNote project.');
      return p;
    },
    exportPng: (_rect, name) => pagePng(name),
    exportText: (text, name, ext) => saveFile(`${name}.${ext}`, text, ext === 'csv' ? 'text/csv' : ext === 'json' ? 'application/json' : 'text/plain'),
    exportBinary: (bytes, name, ext) => saveFile(`${name}.${ext}`, bytes),
    async exportPdf() {
      if (Cap) throw new Error(document.documentElement.lang === 'hu' ? 'A PDF mentés Androidon még nem érhető el.' : 'Saving as PDF is not available on Android yet.');
      window.print();
      return false;
    },
    async saveAsset(pid, aid, dataUrl) {
      const m = /^data:image\/(webp|png|jpeg);base64,/.exec(String(dataUrl));
      if (!m) throw new Error('Invalid picture');
      const name = `${aid}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
      await put('assets', `${pid}/${name}`, dataUrl);
      return name;
    },
    loadAsset: async (pid, name) => (await get('assets', `${pid}/${name}`)) || null,
    importAsset: async (pid, name, dataUrl) => { await put('assets', `${pid}/${name}`, dataUrl); return name; },
    listAssets: async (pid) => (await keys('assets')).map(String).filter((k) => k.startsWith(`${pid}/`)).map((k) => k.slice(pid.length + 1)),
    async listFonts() {
      return (await all('fonts')).filter(Boolean).map(({ source, ...m }) => ({ ...m, bytes: new Uint8Array(m.bytes) })).sort((a, b) => (a.created || 0) - (b.created || 0));
    },
    fontSource: async (id) => ((await get('fonts', id)) || {}).source || null,
    saveFont: async (meta, bytes) => { await put('fonts', meta.id, { ...clone({ ...meta, bytes: undefined }), bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }); return true; },
    deleteFont: async (id) => { await del('fonts', id); return true; },
    getSettings: async () => (await get('kv', 'settings')) || {},
    async setSettings(patch) {
      const s = { ...((await get('kv', 'settings')) || {}), ...patch };
      await put('kv', 'settings', s);
      return s;
    },
    openDataFolder: () => { if (typeof toast === 'function') toast(document.documentElement.lang === 'hu' ? 'Itt a projektek az alkalmazáson belül vannak tárolva.' : 'Here your projects are stored inside the app.'); },
    setZoom: (f) => { document.documentElement.style.setProperty('--app-zoom', f); },
  };
})();
