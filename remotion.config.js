// Herkunft: eigen (V-Video), mit Claude geschrieben, ohne fremde Vorlage.
// Settings for `npx remotion render|still|studio` run from this folder, without fixed personal paths.
// Order: real environment variable > `.env` in this folder > default (see `.env.example`).
//   CHROME_PATH  browser (default: usual Chrome install paths; none found = Remotion's own headless browser)
//   GL           WebGL backend (default: angle, needed by the 3D template; the 2D template is not affected)
// Command-line flags (e.g. --browser-executable, --gl) still override these.
import fs from 'node:fs';
import path from 'node:path';
import {Config} from '@remotion/cli/config';

const env = {};
const dotEnv = path.join(process.cwd(), '.env');
if (fs.existsSync(dotEnv)) {
  for (const line of fs.readFileSync(dotEnv, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const get = (k) => process.env[k] ?? env[k];

const candidates = [
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
  process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe'),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = get('CHROME_PATH') ? path.resolve(get('CHROME_PATH')) : candidates.find((p) => fs.existsSync(p));
if (chrome) Config.setBrowserExecutable(chrome);
Config.setChromiumOpenGlRenderer(get('GL') ?? 'angle');
