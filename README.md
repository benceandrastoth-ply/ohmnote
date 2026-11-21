# OhmNote

A free, open-source notebook for electronics. Draw schematics, sketch by hand, write notes, scan your
paper notebook and read it all back like a real book, on Windows, Linux and Android.

**Website and downloads: https://benceandrastoth-ply.github.io/ohmnote/**

| System | Download |
| --- | --- |
| Windows 10/11 | `OhmNote-Setup-<version>.exe` (installer) or `OhmNote-<version>-portable.exe` |
| Debian, Ubuntu, Mint | `ohmnote_<version>_amd64.deb` → `sudo apt install ./ohmnote_*_amd64.deb` |
| Fedora, openSUSE | `ohmnote-<version>.x86_64.rpm` → `sudo dnf install ./ohmnote-*.rpm` |
| Arch, Manjaro | `ohmnote-<version>-x86_64.pkg.tar.zst` → `sudo pacman -U ./ohmnote-*.pkg.tar.zst` |
| Any Linux | `OhmNote-<version>-x86_64.AppImage` |
| Android 7+ | `OhmNote-<version>.apk` |

All files are on the [Releases](https://github.com/benceandrastoth-ply/ohmnote/releases) page.

## What it does

- **Projects → pages.** Each page is an infinite canvas with a separate *Page notes* document on the right.
- **Component library.** 45+ symbols: passives, diodes/LEDs, BJTs, MOSFETs, op-amp, regulator, logic gates, DIP ICs, headers, switches, relay, power rails, ground, net labels and more. Click a part or drag it in. `R` rotates, `X` mirrors.
- **Wires.** Wires snap to the grid, route at right angles, end automatically on a pin or wire, draw junction dots by themselves, and follow parts when you move them.
- **Part properties.** Resistance, tolerance, power and type for resistors (with a colour-band preview and − / + through standard E24 values); capacitance, voltage and dielectric for capacitors; colour, size, forward voltage and current for LEDs (with a series-resistor calculator); ratings and packages for everything else. Type values the way you write them (4.7k, 4k7, 100n, 3V3).
- **Resize anything.** Drag a corner handle of any selection; wires stay connected.
- **Freehand pen, shapes, text, pictures.** Ballpoint, fountain pen (pressure and speed), marker, pencil and highlighter.
- **Calculator, formulas and rules** (`K`): `4k7 || 10k`, `R1 + R2`, Ohm's law, dividers, RC, resonance, 555, op-amps, and a cheat sheet of the basic rules.
- **Your own handwriting as a font**, joined-up cursive (folyóírás) included, with three versions of every letter.
- **Notebook photos → digital book.** Pages are found, straightened and cleaned like a scanner, on your device.
- **Read as a book** with designed covers and curling page turns, and save it as a PDF.
- **Accounts and sync.** Sign in and your projects, scanned pages, fonts and settings follow you between Windows, Linux and Android.
- **80 settings and 12 presets** (notebook, squared paper, blueprint, chalkboard…), English and Hungarian.
- **Parts list (BOM)**, PNG and `.ohm` export.

On the desktop, data is saved in `%APPDATA%\OhmNote` (Windows) or `~/.config/OhmNote` (Linux). On Android it lives inside the app.

## Build it yourself

You need [Node.js](https://nodejs.org/) 20 or newer.

```
git clone https://github.com/benceandrastoth-ply/ohmnote.git
cd ohmnote
npm install
npm start              # run the desktop app
```

| Command | Builds |
| --- | --- |
| `npm run dist` | Windows installer and portable exe (`dist/`) |
| `npm run dist:linux` | .deb, .rpm, pacman package and AppImage (run on Linux; rpm needs `rpm`, pacman needs `libarchive-tools`) |
| `npm run android:debug` | Android APK (needs the Android SDK and JDK 21; set `ANDROID_HOME`) |
| `npm run android:release` | Signed Android APK (set `OHM_KEYSTORE`, `OHM_KEYSTORE_PASSWORD`, `OHM_KEY_ALIAS`, `OHM_KEY_PASSWORD`) |

Releases are built by GitHub Actions (`.github/workflows/release.yml`) whenever a tag like `v0.2.0` is pushed.
The website in `website/` is published to GitHub Pages by `.github/workflows/pages.yml`.

### Accounts (Supabase)

Accounts and sync use [Supabase](https://supabase.com/). To run your own:

1. Create a Supabase project and run `supabase/migrations/20261121000000_ohmnote_sync.sql` (tables, row level security and a private storage bucket).
2. Put the project URL and anon key in `src/cloud-config.js`. The anon key is meant to be public; every row and file is protected by row level security.
3. In Supabase → Authentication → URL configuration, add your website's `account.html` as a redirect URL (it handles email confirmation and password resets).

Leave `src/cloud-config.js` empty to build OhmNote without accounts.

### Project layout

| Path | What |
| --- | --- |
| `main.js`, `preload.js` | Electron (Windows / Linux): window, files, dialogs |
| `src/platform.js` | The same API on Android and in a browser (IndexedDB, share sheet) |
| `src/app.js` | Canvas, tools, parts, wires, projects, inspector |
| `src/settings.js`, `props.js`, `calc.js`, `fontmaker.js`, `scan.js`, `book.js`, `cloud.js` | Settings, part properties, calculator, handwriting fonts, notebook scans, book view, accounts |
| `android/` | Capacitor Android project |
| `website/` | The download site |

## Shortcuts

| Key | Action |
| --- | --- |
| `V` `H` `W` `P` `S` `T` `E` | Select, pan, wire, pen, shapes, text, eraser |
| `R` / `X` | Rotate / mirror |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |
| `Ctrl+C` `Ctrl+V` `Ctrl+D` | Copy, paste, duplicate |
| `Del` | Delete selection |
| Arrows (`Shift` = ×5) | Nudge |
| `Space`+drag, middle-drag | Pan |
| Scroll, `+` / `-`, `0` | Zoom, fit |
| `/` | Search parts |
| `B` | Parts list |
| `K` | Calculator |
| `[` / `]` | Hide side panels |
| `Ctrl+N` / `Ctrl+Shift+N` | New page / new project |
| `Ctrl+,` | Settings |

On touch screens: pinch to zoom, two fingers to pan. After you use a stylus, one finger pans so your palm never draws.

## Licence

MIT, see [LICENSE](LICENSE). Bundled libraries are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
