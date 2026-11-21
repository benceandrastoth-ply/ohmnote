// Builds the Android app: copies the web app into the Android project, then runs Gradle.
//   node scripts/android-build.js debug     → android/app/build/outputs/apk/debug/app-debug.apk
//   node scripts/android-build.js release   → android/app/build/outputs/apk/release/ (signed when OHM_KEYSTORE is set)
// The finished APK is also copied to dist/OhmNote-<version>.apk.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const kind = process.argv[2] === 'release' ? 'release' : 'debug';
const root = path.join(__dirname, '..');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit', env: process.env });

run('npx cap sync android');
const gradlew = `"${path.join(root, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')}"`;
run(`${gradlew} ${kind === 'release' ? 'assembleRelease' : 'assembleDebug'} --no-daemon`, path.join(root, 'android'));

const outDir = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', kind);
const apk = fs.readdirSync(outDir).find((f) => f.endsWith('.apk'));
if (!apk) throw new Error(`No APK in ${outDir}`);
const { version } = require(path.join(root, 'package.json'));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const target = path.join(root, 'dist', `OhmNote-${version}${kind === 'debug' ? '-debug' : ''}.apk`);
fs.copyFileSync(path.join(outDir, apk), target);
console.log(`\nAndroid app: ${target}`);
