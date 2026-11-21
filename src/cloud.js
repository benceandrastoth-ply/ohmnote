// OhmNote — accounts and sync (Supabase).
// Sign in on any device (Windows, Linux, Android) and your projects, pictures, fonts and settings follow
// you. Sync is two-way and the newest change wins; deletions sync too. Without a configured server
// (cloud-config.js) the account button explains that accounts are not set up in this build.
'use strict';

const CL = { client: null, user: null, syncing: false, last: 0, status: 'off', error: '', timer: 0, again: false };
const CLT = {
  account: ['Account', 'Fiók'], signIn: ['Sign in', 'Bejelentkezés'], signUp: ['Create account', 'Fiók létrehozása'], signOut: ['Sign out', 'Kijelentkezés'],
  email: ['Email', 'E-mail'], password: ['Password', 'Jelszó'], forgot: ['Forgot your password?', 'Elfelejtetted a jelszavad?'],
  syncNow: ['Sync now', 'Szinkronizálás most'], synced: ['Synced', 'Szinkronizálva'], syncing: ['Syncing…', 'Szinkronizálás…'], offline: ['Not synced', 'Nincs szinkronizálva'],
  never: ['not yet', 'még nem'], ago: ['ago', 'ezelőtt'], justNow: ['just now', 'épp most'],
  intro: ['Sign in to keep your projects, scanned pages, handwriting fonts and settings in sync on all your devices: Windows, Linux and Android.',
    'Jelentkezz be, és a projektjeid, beszkennelt oldalaid, kézírásos betűtípusaid és beállításaid minden eszközödön szinkronban lesznek: Windows, Linux és Android.'],
  notSetUp: ['Accounts are not set up in this build of OhmNote yet. Everything still works and is saved on this device.',
    'Az OhmNote ezen változatában még nincsenek beállítva a fiókok. Minden működik, és erre az eszközre mentődik.'],
  checkMail: ['Almost there: open the link we emailed you, then sign in here.', 'Már majdnem kész: nyisd meg az e-mailben küldött linket, aztán jelentkezz be itt.'],
  resetSent: ['If that address has an account, a reset link is on its way.', 'Ha van ilyen fiók, elküldtük a jelszó-visszaállító linket.'],
  needEmail: ['Type your email address first.', 'Előbb add meg az e-mail-címed.'], short: ['Use at least 8 characters.', 'Legalább 8 karakter legyen.'],
  signedIn: ['Signed in as', 'Bejelentkezve:'], lastSync: ['Last sync', 'Utolsó szinkron'], keepLocal: ['Your projects stay on this device when you sign out.', 'Kijelentkezéskor a projektjeid ezen az eszközön maradnak.'],
  welcome: ['Signed in. Syncing your notebook…', 'Bejelentkezve. A füzeted szinkronizálása…'], failed: ['Sync failed:', 'A szinkron sikertelen:'],
  wipe: ['Delete my synced data…', 'Szinkronizált adataim törlése…'], wipeAsk: ['Delete everything stored in your account online? Projects on this device are kept.', 'Törlöd a fiókodban online tárolt összes adatot? Az eszközön lévő projektek megmaradnak.'],
  wiped: ['Online data deleted', 'Online adatok törölve'],
};
const cloudReady = () => !!CL.client;

// ---------------------------------------------------------------- start-up
async function cloudInit() {
  const cfg = window.OHM_CLOUD || {};
  if (!cfg.url || !cfg.anonKey || typeof supabase === 'undefined') { CL.status = 'off'; cloudBadge(); return; }
  CL.client = supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'ohm-auth' } });
  const { data } = await CL.client.auth.getSession();
  CL.user = data.session ? data.session.user : null;
  CL.client.auth.onAuthStateChange((ev, session) => {
    const was = CL.user && CL.user.id;
    CL.user = session ? session.user : null;
    cloudBadge();
    if (CL.user && CL.user.id !== was) cloudSync();
  });
  CL.status = CL.user ? 'idle' : 'out';
  cloudBadge();
  if (CL.user) cloudSync();
  setInterval(() => { if (CL.user) cloudSync(); }, 5 * 60 * 1000);
  window.addEventListener('online', () => { if (CL.user) cloudSync(); });
}
// call after local changes; syncs a little later so typing does not cause a flood
function cloudSoon() {
  if (!CL.user) return;
  clearTimeout(CL.timer);
  CL.timer = setTimeout(cloudSync, 12000);
}

// ---------------------------------------------------------------- helpers
const dataUrlToBlob = async (url) => (await fetch(url)).blob();
const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
const bucket = () => CL.client.storage.from('ohmnote');
async function remoteFiles(prefix) {
  const { data, error } = await bucket().list(prefix, { limit: 1000 });
  if (error) throw error;
  return new Set((data || []).map((f) => f.name));
}
const tombstones = () => (S.settings.cloudDeleted ||= {});
function cloudForget(kind, id) { // a local delete that the cloud should hear about
  if (!CL.user) return;
  tombstones()[`${kind}:${id}`] = Date.now();
  api.setSettings({ cloudDeleted: S.settings.cloudDeleted });
  cloudSoon();
}

// ---------------------------------------------------------------- sync
async function cloudSync() {
  if (!CL.user || !CL.client) return;
  if (CL.syncing) { CL.again = true; return; }
  CL.syncing = true;
  CL.status = 'syncing';
  cloudBadge();
  try {
    await flushSave();
    const uid = CL.user.id;
    await syncProjects(uid);
    await syncSettings();
    await syncFonts(uid);
    CL.last = Date.now();
    CL.status = 'idle';
    CL.error = '';
  } catch (err) {
    CL.status = 'error';
    CL.error = String(err.message || err);
    console.warn('sync failed', err);
  } finally {
    CL.syncing = false;
    cloudBadge();
    if (accountOpen()) renderAccount();
    if (CL.again) { CL.again = false; cloudSoon(); }
  }
}

async function syncProjects(uid) {
  const { data: remote, error } = await CL.client.from('projects').select('id,name,updated,deleted');
  if (error) throw error;
  const local = await api.listProjects();
  const rmap = new Map(remote.map((r) => [r.id, r]));
  const lmap = new Map(local.map((l) => [l.id, l]));
  const tomb = tombstones();
  let changedOpen = false, listChanged = false;
  for (const l of local) {
    const r = rmap.get(l.id);
    if (!r || (l.updated > r.updated)) await pushProject(uid, l.id);
    else if (r.deleted && r.updated >= l.updated) { await api.deleteProject(l.id); listChanged = true; if (S.project && S.project.id === l.id) changedOpen = 'gone'; }
    else if (r.updated > l.updated) { await pullProject(uid, l.id); listChanged = true; if (S.project && S.project.id === l.id) changedOpen = true; }
  }
  for (const r of remote) {
    if (lmap.has(r.id)) continue;
    const t = tomb[`project:${r.id}`];
    if (t && !r.deleted) {
      if (t >= r.updated) { await CL.client.from('projects').update({ deleted: true, data: null, updated: t }).eq('id', r.id); continue; }
    }
    if (!r.deleted) { await pullProject(uid, r.id); listChanged = true; }
  }
  // deletions made here that the cloud has not seen yet
  for (const [k, t] of Object.entries(tomb)) {
    if (!k.startsWith('project:')) continue;
    const id = k.slice(8), r = rmap.get(id);
    if (r && !r.deleted && t >= r.updated) await CL.client.from('projects').update({ deleted: true, data: null, updated: t }).eq('id', id);
    delete tomb[k];
  }
  api.setSettings({ cloudDeleted: tomb });
  if (listChanged) await refreshProjects();
  if (changedOpen === 'gone') { const first = S.projects[0]; if (first) await openProject(first.id); }
  else if (changedOpen && !S.dirty && !S.editing) await openProject(S.project.id);
}
async function pushProject(uid, id) {
  const p = await api.loadProject(id);
  if (!p) return;
  const names = api.listAssets ? await api.listAssets(id) : [];
  if (names.length) {
    const have = await remoteFiles(`${uid}/assets/${id}`);
    for (const n of names) {
      if (have.has(n)) continue;
      const url = await api.loadAsset(id, n);
      if (!url) continue;
      const { error } = await bucket().upload(`${uid}/assets/${id}/${n}`, await dataUrlToBlob(url), { upsert: true, contentType: url.slice(5, url.indexOf(';')) });
      if (error) throw error;
    }
  }
  const { error } = await CL.client.from('projects').upsert({ id, name: p.name || '', data: p, updated: p.updated || 0, deleted: false });
  if (error) throw error;
}
async function pullProject(uid, id) {
  const { data, error } = await CL.client.from('projects').select('data').eq('id', id).single();
  if (error) throw error;
  const p = data && data.data;
  if (!p || !Array.isArray(p.pages)) return;
  const want = new Set(p.pages.flatMap((pg) => (pg.images || []).map((i) => i.asset)));
  if (want.size) {
    const have = new Set(api.listAssets ? await api.listAssets(id) : []);
    for (const n of want) {
      if (have.has(n)) continue;
      const { data: blob, error: e2 } = await bucket().download(`${uid}/assets/${id}/${n}`);
      if (e2 || !blob) continue;
      await api.importAsset(id, n, await blobToDataUrl(blob));
    }
  }
  await api.saveProject(p);
}

async function syncSettings() {
  const { data, error } = await CL.client.from('user_settings').select('prefs,updated').maybeSingle();
  if (error) throw error;
  const localT = S.settings.prefsUpdated || 0;
  if (data && data.updated > localT && data.prefs) {
    P = sanitizePrefs({ ...P, ...data.prefs });
    S.settings.prefsUpdated = data.updated;
    api.setSettings({ prefs: P, prefsUpdated: data.updated });
    S.pen = { color: P.penColor, width: P.penWidth, nib: P.nib };
    onPrefsChanged(['nib', 'penWidth', 'penColor']);
  } else if (!data || localT > data.updated) {
    const { error: e2 } = await CL.client.from('user_settings').upsert({ prefs: P, updated: localT || Date.now() });
    if (e2) throw e2;
  }
}

async function syncFonts(uid) {
  const { data: remote, error } = await CL.client.from('fonts').select('id,meta,updated,deleted');
  if (error) throw error;
  const rmap = new Map(remote.map((r) => [r.id, r]));
  const tomb = tombstones();
  for (const f of USER_FONTS) {
    const r = rmap.get(f.id), lt = f.updated || f.created || 0;
    if (r && r.deleted && r.updated >= lt) { await api.deleteFont(f.id); unregisterFont(f.id); continue; }
    if (r && r.updated >= lt) continue;
    const { error: e1 } = await bucket().upload(`${uid}/fonts/${f.id}.${f.ext}`, new Blob([f.bytes]), { upsert: true, contentType: 'font/otf' });
    if (e1) throw e1;
    const source = f.kind === 'hand' ? await api.fontSource(f.id) : null;
    const { error: e2 } = await CL.client.from('fonts').upsert({ id: f.id, meta: { id: f.id, name: f.name, kind: f.kind, ext: f.ext, created: f.created, updated: lt, source }, updated: lt, deleted: false });
    if (e2) throw e2;
  }
  for (const r of remote) {
    if (r.deleted || USER_FONTS.some((f) => f.id === r.id)) continue;
    const t = tomb[`font:${r.id}`];
    if (t && t >= r.updated) { await CL.client.from('fonts').update({ deleted: true, updated: t }).eq('id', r.id); continue; }
    const { data: blob, error: e3 } = await bucket().download(`${uid}/fonts/${r.id}.${r.meta.ext}`);
    if (e3 || !blob) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    try { await registerFont(r.meta, bytes); await api.saveFont(r.meta, bytes); } catch { /* unreadable font: skip */ }
  }
  for (const k of Object.keys(tomb)) {
    if (!k.startsWith('font:')) continue;
    const id = k.slice(5), r = rmap.get(id);
    if (r && !r.deleted) await CL.client.from('fonts').update({ deleted: true, updated: tomb[k] }).eq('id', id);
    delete tomb[k];
  }
  api.setSettings({ cloudDeleted: tomb });
}

// Remove everything this account stored online (the account itself stays; projects here stay too).
async function cloudWipe() {
  const uid = CL.user.id;
  for (const t of ['projects', 'fonts', 'user_settings']) await CL.client.from(t).delete().eq('user_id', uid);
  const walk = async (prefix) => {
    const { data } = await bucket().list(prefix, { limit: 1000 });
    for (const f of data || []) {
      if (f.id) await bucket().remove([`${prefix}/${f.name}`]); else await walk(`${prefix}/${f.name}`);
    }
  };
  await walk(uid);
}

// ---------------------------------------------------------------- the account window and status
const accountOpen = () => !!$('#modal .card.account');
function cloudBadge() {
  const b = $('#btn-account');
  if (b) {
    const letter = CL.user && CL.user.email ? CL.user.email[0].toUpperCase() : '';
    b.innerHTML = letter ? `<span class="acct-dot ${CL.status}">${esc(letter)}</span>`
      : '<svg viewBox="0 0 20 20"><circle cx="10" cy="7" r="3.2"/><path d="M3.8 17c.8-3.3 3.3-5 6.2-5s5.4 1.7 6.2 5"/></svg>';
    b.title = CL.user ? `${L2(CLT.account)}: ${CL.user.email}` : L2(CLT.account);
  }
  const st = $('#st-cloud');
  if (st) {
    st.textContent = !CL.user ? '' : CL.status === 'syncing' ? `☁ ${L2(CLT.syncing)}` : CL.status === 'error' ? `☁ ${L2(CLT.offline)}` : `☁ ${L2(CLT.synced)}`;
    st.classList.toggle('err', CL.status === 'error');
    st.title = CL.error || '';
  }
}
function agoText(t) {
  if (!t) return L2(CLT.never);
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 30) return L2(CLT.justNow);
  const m = Math.round(s / 60);
  return LANG === 'hu' ? `${m < 60 ? `${m} perce` : `${Math.round(m / 60)} órája`}` : `${m < 60 ? `${m} min` : `${Math.round(m / 60)} h`} ${L2(CLT.ago)}`;
}
const ACC = { mode: 'in', msg: '', busy: false };
function openAccount() {
  endEdit();
  hideMenu();
  const m = $('#modal');
  m.innerHTML = '<div class="card account"></div>';
  m.classList.remove('hidden');
  m.onclick = accountClick;
  m.oninput = m.onchange = null;
  ACC.msg = '';
  renderAccount();
}
function renderAccount() {
  const card = $('#modal .card.account');
  if (!card) return;
  const head = `<div class="card-head"><svg class="gear" viewBox="0 0 20 20"><circle cx="10" cy="7" r="3.2"/><path d="M3.8 17c.8-3.3 3.3-5 6.2-5s5.4 1.7 6.2 5"/></svg><h3>${L2(CLT.account)}</h3><button class="xbtn" data-acc="close">✕</button></div>`;
  let body;
  if (!cloudReady()) body = `<p>${L2(CLT.notSetUp)}</p>`;
  else if (CL.user) {
    body = `<p class="muted">${L2(CLT.signedIn)}</p><p class="acct-email">${esc(CL.user.email)}</p>
      <div class="stat-grid"><div class="stat"><b>${S.projects.length}</b><span>${tr('left.projects')}</span></div>
        <div class="stat"><b>${esc(CL.status === 'syncing' ? '…' : agoText(CL.last))}</b><span>${L2(CLT.lastSync)}</span></div></div>
      ${CL.status === 'error' ? `<p class="calc-err">${L2(CLT.failed)} ${esc(CL.error)}</p>` : ''}
      <div class="btn-row"><button class="btn primary" data-acc="sync" ${CL.syncing ? 'disabled' : ''}>${L2(CL.syncing ? CLT.syncing : CLT.syncNow)}</button>
        <button class="btn" data-acc="out">${L2(CLT.signOut)}</button></div>
      <p class="muted small">${L2(CLT.keepLocal)}</p>
      <button class="btn danger sm" data-acc="wipe">${L2(CLT.wipe)}</button>`;
  } else {
    body = `<p class="muted">${L2(CLT.intro)}</p>
      <div class="seg acct-tabs"><button data-accmode="in" class="${ACC.mode === 'in' ? 'on' : ''}">${L2(CLT.signIn)}</button><button data-accmode="up" class="${ACC.mode === 'up' ? 'on' : ''}">${L2(CLT.signUp)}</button></div>
      <label class="field"><span>${L2(CLT.email)}</span><input type="text" id="acc-email" autocomplete="email" inputmode="email" spellcheck="false"></label>
      <label class="field"><span>${L2(CLT.password)}</span><input type="text" id="acc-pass" class="pw" autocomplete="${ACC.mode === 'up' ? 'new-password' : 'current-password'}" spellcheck="false"></label>
      <div class="btn-row"><button class="btn primary" data-acc="go" ${ACC.busy ? 'disabled' : ''}>${L2(ACC.mode === 'up' ? CLT.signUp : CLT.signIn)}</button>
        ${ACC.mode === 'in' ? `<button class="btn" data-acc="forgot">${L2(CLT.forgot)}</button>` : ''}</div>`;
  }
  card.innerHTML = `${head}<div class="card-body acct-body">${body}${ACC.msg ? `<p class="acct-msg">${esc(ACC.msg)}</p>` : ''}</div>`;
  const pw = $('#acc-pass');
  if (pw) pw.type = 'password';
  const em = $('#acc-email');
  if (em) { em.focus(); em.onkeydown = (e) => { if (e.key === 'Enter') pw.focus(); }; pw.onkeydown = (e) => { if (e.key === 'Enter') $('[data-acc="go"]').click(); }; }
}
async function accountClick(e) {
  const t = e.target;
  if (t === $('#modal')) { closeModal(); return; }
  const md = t.closest('[data-accmode]');
  if (md) { ACC.mode = md.dataset.accmode; ACC.msg = ''; renderAccount(); return; }
  const b = t.closest('[data-acc]');
  if (!b || ACC.busy) return;
  const email = ($('#acc-email')?.value || '').trim(), pass = $('#acc-pass')?.value || '';
  const run = async (fn) => {
    ACC.busy = true; ACC.msg = ''; renderAccount();
    try { await fn(); } catch (err) { ACC.msg = String(err.message || err); }
    ACC.busy = false; renderAccount();
  };
  switch (b.dataset.acc) {
    case 'close': closeModal(); break;
    case 'go':
      if (!email) { ACC.msg = L2(CLT.needEmail); renderAccount(); return; }
      if (ACC.mode === 'up' && pass.length < 8) { ACC.msg = L2(CLT.short); renderAccount(); return; }
      await run(async () => {
        if (ACC.mode === 'up') {
          const { data, error } = await CL.client.auth.signUp({ email, password: pass, options: { emailRedirectTo: window.OHM_CLOUD.accountPage } });
          if (error) throw error;
          if (!data.session) { ACC.msg = L2(CLT.checkMail); ACC.mode = 'in'; }
        } else {
          const { error } = await CL.client.auth.signInWithPassword({ email, password: pass });
          if (error) throw error;
          toast(L2(CLT.welcome));
        }
      });
      break;
    case 'forgot':
      if (!email) { ACC.msg = L2(CLT.needEmail); renderAccount(); return; }
      await run(async () => {
        const { error } = await CL.client.auth.resetPasswordForEmail(email, { redirectTo: window.OHM_CLOUD.accountPage });
        if (error) throw error;
        ACC.msg = L2(CLT.resetSent);
      });
      break;
    case 'sync': cloudSync(); setTimeout(renderAccount, 50); break;
    case 'out': await run(async () => { await CL.client.auth.signOut(); CL.status = 'out'; }); break;
    case 'wipe':
      if (!confirm(L2(CLT.wipeAsk))) return;
      await run(async () => { await cloudWipe(); toast(L2(CLT.wiped)); });
      break;
    default:
  }
}
