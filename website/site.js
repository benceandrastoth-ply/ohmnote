// OhmNote website: language switch, "your system" detection, and download links from the newest
// GitHub release (so the page never needs editing when a new version comes out).
'use strict';

const REPO = 'benceandrastoth-ply/ohmnote';
const RELEASES = `https://github.com/${REPO}/releases`;

// ---- language
let lang = localStorage.getItem('ohm-lang') || ((navigator.language || '').toLowerCase().startsWith('hu') ? 'hu' : 'en');
function applyLang() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-en]')) el.textContent = el.dataset[lang] || el.dataset.en;
  const b = document.getElementById('lang');
  if (b) b.textContent = lang === 'hu' ? 'EN' : 'HU';
  markMine();
}
document.getElementById('lang')?.addEventListener('click', () => { lang = lang === 'hu' ? 'en' : 'hu'; localStorage.setItem('ohm-lang', lang); applyLang(); });

// ---- which system is this?
function detectOS() {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/windows/.test(ua)) return 'windows';
  if (/fedora|red hat|opensuse/.test(ua)) return 'fedora';
  if (/arch|manjaro|endeavour/.test(ua)) return 'arch';
  if (/ubuntu|debian|mint/.test(ua)) return 'debian';
  if (/linux|x11/.test(ua)) return 'linux';
  return null;
}
const OS_NAME = { windows: 'Windows', debian: 'Debian / Ubuntu', fedora: 'Fedora', arch: 'Arch', linux: 'Linux', android: 'Android' };
function markMine() {
  const os = detectOS();
  for (const el of document.querySelectorAll('.dl')) {
    el.classList.toggle('mine', el.dataset.os === os);
    el.dataset.mine = lang === 'hu' ? 'A te rendszered' : 'Your system';
  }
  const hero = document.getElementById('hero-os');
  if (hero) hero.textContent = os ? `· ${OS_NAME[os]}` : '';
}

// ---- links from the newest release
async function loadRelease() {
  const links = document.querySelectorAll('[data-asset]');
  for (const a of links) a.href = RELEASES;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(r.status);
    const rel = await r.json();
    const assets = rel.assets || [];
    for (const a of links) {
      const key = a.dataset.asset.toLowerCase();
      const hit = assets.find((x) => x.name.toLowerCase().includes(key));
      if (hit) { a.href = hit.browser_download_url; a.title = `${hit.name} · ${(hit.size / 1048576).toFixed(0)} MB`; }
    }
    const v = document.getElementById('version');
    if (v) v.textContent = `${rel.tag_name} · ${new Date(rel.published_at).toLocaleDateString(lang === 'hu' ? 'hu-HU' : 'en-GB')}`;
    const os = detectOS();
    const mine = os && document.querySelector(`.dl[data-os="${os}"] [data-asset]`);
    const hero = document.getElementById('hero-dl');
    if (mine && hero && mine.href !== RELEASES) hero.href = mine.href;
  } catch {
    // no release yet, offline, or rate-limited: the buttons go to the releases page instead
  }
}

applyLang();
loadRelease();
