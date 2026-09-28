'use strict';
// Keep Windows batch syntax out of the startup and readiness checks.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const base = 'http://127.0.0.1:4174';
const page = base + '/tools/tex2html/';
const root = path.resolve(__dirname, '../..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function probe() {
  try {
    const response = await fetch(page, {signal: AbortSignal.timeout(2000)});
    if (!response.ok) return false;
    const html = await response.text();
    if (!html.includes('lecture-tex-select')) throw Error('Port 4174 is used by a different website.');
    return true;
  } catch (error) {
    if (error.message.includes('different website')) throw error;
    return false;
  }
}

async function main() {
  let child;
  let startupError;
  let logFile;
  if (!await probe()) {
    const logDir = path.join(os.tmpdir(), 'tex2html-launch');
    fs.mkdirSync(logDir, {recursive: true});
    logFile = path.join(logDir, 'server-' + Date.now() + '.log');
    const log = fs.openSync(logFile, 'a');
    try {
      child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
        cwd: root, detached: true, windowsHide: true,
        stdio: ['ignore', log, log], env: {...process.env, TEX2HTML_PORT: '4174'}
      });
      child.on('error', error => {startupError = error;});
      child.unref();
    } finally { fs.closeSync(log); }
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (startupError) break;
      if (await probe()) {ready = true; break;}
      if (child.exitCode !== null) break;
      await delay(500);
    }
    if (!ready) {
      throw Error('Server startup failed. Log: ' + logFile + '\n' +
        (startupError?.message || fs.readFileSync(logFile, 'utf8')));
    }
  }
  // The page can open even if LaTeX is not installed; report that separately.
  const response = await fetch(base + '/health', {signal: AbortSignal.timeout(15000)});
  const health = await response.json();
  if (!response.ok || !health.token || !health.engine) throw Error('The running server is not the TeX compiler service.');
  console.log('Ready: ' + page);
  console.log('Local LaTeX: ' + (health.ok ? 'available' : 'unavailable; check xelatex and dvisvgm in PATH'));
  if (logFile) console.log('Server log: ' + logFile);
  if (process.argv.includes('--no-browser')) return;
  await new Promise((resolve, reject) => {
    const browser = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      "Start-Process 'http://127.0.0.1:4174/tools/tex2html/'"], {windowsHide: true, stdio: 'inherit'});
    browser.on('error', reject);
    browser.on('exit', code => code === 0 ? resolve() : reject(Error('Could not open the browser. Open ' + page)));
  });
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});
