import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(site, 'script.js'), 'utf8');
const css = ['styles.css', 'refresh.css'].map(file => fs.readFileSync(path.join(site, file), 'utf8')).join('\n');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
for (const target of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target[1]), `Missing anchor: ${target[1]}`);
for (const media of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(https?:|mailto:)/.test(media[1])) continue;
  assert.ok(fs.existsSync(path.join(site, media[1])), `Missing local file: ${media[1]}`);
}
const projects = [...html.matchAll(/<article class="project-card"[^>]*id="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(projects, ['architech-i3d', 'architech-mcp', 'architech-assistant']);
for (const title of ['ArchiTECH-I3D', 'ArchiTECH-MCP', 'ArchiTECH-Assistant']) assert.ok(html.includes(title));
for (const removed of ['toolkit', 'proof', 'vision', 'twin', 'gates', 'system']) assert.ok(!ids.includes(removed), `Retired showcase remains: ${removed}`);
for (const text of ['JARVIS', 'PYREVIT RIBBON', 'KNOWLEDGE BRAIN', 'C# PLUGIN SUITE', 'COMMAND CENTER', '34,510', '48/48']) assert.ok(!html.includes(text), `Unrelated or stale claim: ${text}`);
assert.equal((html.match(/<h4>Strengths<\/h4>/g) || []).length, 3);
assert.equal((html.match(/<h4>How it works<\/h4>/g) || []).length, 3);
assert.ok(html.includes('standalone Windows desktop app'));
assert.ok(html.includes('local or server model'));
for (const href of html.matchAll(/href="(https?:[^\"]+)"/g)) {
  const url = new URL(href[1]);
  assert.ok(['architech97.github.io', 'github.com', 'www.linkedin.com', 'www.instagram.com'].includes(url.hostname), `Unexpected remote origin: ${url.hostname}`);
  if (url.hostname === 'github.com') assert.equal(url.pathname, '/architech97', 'No private repository or download links');
}
for (const forbidden of ['127.0.0.1', 'localhost:', 'api_key', 'API_KEY', 'ghp_', 'github_pat_', 'Armani', 'WOS', 'INSTALL.cmd']) assert.ok(!html.includes(forbidden), `Private detail in public page: ${forbidden}`);
for (const token of ['Skip to content', 'data-nav-toggle', 'data-sound-toggle']) assert.ok(html.includes(token));
assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(css.includes(':focus-visible'));
assert.ok(script.includes('nav.inert'));
assert.ok(!html.includes('src="timeline.js"'), 'Removed demo engine should not load');
assert.ok(!script.includes('createScene'), 'Removed 3D demo engine should not run');
console.log('Focused portfolio contract passed.');
