// Generates the Android launcher icons and splash screens from build/icon.png.
// Run with Electron (it provides a canvas):  npx electron scripts/android-icons.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const BG = '#16191e';
const pngSize = (file) => { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<canvas></canvas>');
  const icon = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, 'build', 'icon.png')).toString('base64')}`;
  // draw(w, h, scale, round, background) → PNG bytes
  const draw = async (w, h, scale, round, bg) => {
    const url = await win.webContents.executeJavaScript(`(async () => {
      const img = new Image(); img.src = ${JSON.stringify(icon)}; await img.decode();
      const c = document.createElement('canvas'); c.width = ${w}; c.height = ${h};
      const g = c.getContext('2d');
      ${round ? `g.beginPath(); g.arc(${w / 2}, ${h / 2}, ${Math.min(w, h) / 2}, 0, Math.PI * 2); g.clip();` : ''}
      ${bg ? `g.fillStyle = '${bg}'; g.fillRect(0, 0, ${w}, ${h});` : ''}
      const s = Math.min(${w}, ${h}) * ${scale};
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (${w} - s) / 2, (${h} - s) / 2, s, s);
      return c.toDataURL('image/png');
    })()`);
    return Buffer.from(url.split(',')[1], 'base64');
  };
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const dir = path.join(RES, `mipmap-${d}`);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), await draw(48 * k, 48 * k, 0.92, false, null));
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), await draw(48 * k, 48 * k, 0.78, true, BG));
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), await draw(108 * k, 108 * k, 0.6, false, null)); // adaptive: keep inside the safe zone
  }
  // splash screens: same sizes as the ones Capacitor created
  for (const dir of fs.readdirSync(RES).filter((d) => d.startsWith('drawable'))) {
    const f = path.join(RES, dir, 'splash.png');
    if (!fs.existsSync(f)) continue;
    const [w, h] = pngSize(f);
    fs.writeFileSync(f, await draw(w, h, 0.28, false, BG));
  }
  const colors = path.join(RES, 'values', 'ic_launcher_background.xml');
  fs.writeFileSync(colors, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
  console.log('icons and splash screens written');
  app.exit(0);
});
