import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '..');

function read(file) {
  return fs.readFileSync(path.join(site, file), 'utf8');
}

function fail(message) {
  throw new Error(message);
}

for (const file of ['index.html', 'styles.css', 'script.js', 'timeline.js', 'README.md']) {
  if (!fs.existsSync(path.join(site, file))) fail(`Missing required site file: ${file}`);
}

const html = read('index.html');
const css = read('styles.css');
const script = read('script.js');
const timeline = read('timeline.js');
const readme = read('README.md');
const liveSource = [html, css, script, timeline, readme].join('\n');

for (const name of ['Burj Khalifa', 'Fallingwater']) {
  if (liveSource.includes(name)) fail(`Named landmark remains in live source: ${name}`);
}

for (const token of ['solidPrism', 'SOLID_MATERIALS', 'MODEL.solids']) {
  if (!script.includes(token)) fail(`Missing solid model contract: ${token}`);
}

const htmlContracts = [
  ['LinkedIn', 'https://www.linkedin.com/in/architech-india/'],
  ['GitHub', 'https://github.com/architech97'],
  ['Instagram', 'https://www.instagram.com/ar.navneet.97/'],
  ['Email', 'mailto:Ar.navneet97@gmail.com'],
  ['Sound opt-in', 'Enable sound'],
  ['Skip link', 'Skip to content'],
  ['Hero canvas', 'id="signal-canvas"'],
  ['Twin canvas', 'id="twin-canvas"'],
  ['Gates section', 'id="gates"'],
  ['Mobile nav toggle', 'data-nav-toggle'],
  ['Hero build status', 'id="hero-build-status"'],
  ['Hero glyph reveal hook', 'data-char-reveal'],
  ['Timeline engine', 'src="timeline.js"'],
];
for (const [name, value] of htmlContracts) {
  if (!html.includes(value)) fail(`Missing HTML contract: ${name}`);
}

for (const id of ['signal', 'twin', 'gates']) {
  if (!new RegExp(`<section\\b[^>]*\\bid="${id}"`).test(html)) fail(`Missing exact section ID: ${id}`);
  if (!new RegExp(`id="${id}"[^>]*data-timeline`).test(html) &&
      !new RegExp(`data-timeline[^>]*id="${id}"`).test(html)) {
    fail(`Missing data-timeline on #${id}`);
  }
}

for (const id of ['twin-build-status', 'twin-level', 'twin-elev', 'twin-layer']) {
  if (!html.includes(`id="${id}"`)) fail(`Missing twin hook ID: ${id}`);
}

const twinStageCount = html.match(/class="twin-stage(?:\s|")/g)?.length || 0;
if (twinStageCount !== 5) fail(`Expected exactly five twin stages; found ${twinStageCount}`);

for (const value of ['GENERIC BIM MODEL', 'data-twin-stages']) {
  if (!html.includes(value)) fail(`Missing redesigned slide contract: ${value}`);
}

if (!css.includes('prefers-reduced-motion')) fail('Missing reduced-motion fallback');
if (!css.includes('--ease-out')) fail('Missing shared easing token --ease-out');

for (const selector of ['.brand-img', '.hero-inner', '.stat-grid', '.marquee', '.gates-grid', '.cards', '.vision', '.titleblock', '.stat-hero', '.case-cinema', '.nav-toggle', '.twin-stage', '.model-plate']) {
  if (!css.includes(selector)) fail(`Missing CSS contract: ${selector}`);
}

for (const api of ['AudioContext', 'IntersectionObserver', 'requestAnimationFrame']) {
  if (!script.includes(api)) fail(`Missing interaction contract: ${api}`);
}

for (const token of ['1000 / 30', 'mobileFill', 'document.documentElement.classList.toggle', "style.transform = 'scaleX('"]) {
  if (!script.includes(token)) fail(`Missing mobile performance contract: ${token}`);
}

for (const token of ['html.nav-lock', 'grid-template-columns: repeat(2, minmax(0, 1fr))', 'height: calc(100dvh - var(--topbar-h))']) {
  if (!css.includes(token)) fail(`Missing mobile layout contract: ${token}`);
}

if (/https?:\/\/(?!www\.linkedin\.com\/in\/architech-india\/|github\.com\/architech97|www\.instagram\.com\/ar\.navneet\.97\/|architech97\.github\.io\/architech-command-center\/|architech97\.github\.io\/architech-portfolio\/)/.test(html)) {
  fail('Unexpected remote dependency found in index.html');
}

for (const dep of ['three.js', 'cdn.jsdelivr', 'unpkg.com', 'skypack', 'jspm.io', 'vite']) {
  if (liveSource.includes(dep)) fail(`Phase 1 forbids runtime/build dependency: ${dep}`);
}

for (const api of ['sectionProgress', 'constructFromProgress', 'twinFromProgress', 'gatesFromProgress', 'qualityTier', 'dprCap']) {
  if (!timeline.includes(`function ${api}`)) fail(`Missing timeline API: ${api}`);
}

for (const hook of ['scrollConstruct', 'saveData', 'is-rollback', '1.75']) {
  if (!(script + timeline + css).includes(hook)) fail(`Missing Phase 1 craft hook: ${hook}`);
}

if (html.includes('type="module"')) fail('Phase 1 must stay classic scripts (no ES modules)');

console.log('Portfolio contract passed.');

const unit = spawnSync(process.execPath, [path.join(here, 'phase1-timeline.mjs')], { encoding: 'utf8' });
if (unit.status !== 0) {
  process.stderr.write(unit.stdout + unit.stderr);
  process.exit(unit.status || 1);
}
process.stdout.write(unit.stdout);
