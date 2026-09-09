import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(here, '..', 'timeline.js');
assert.ok(fs.existsSync(srcPath), 'timeline.js must exist');

const sandbox = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(srcPath, 'utf8'), sandbox);
const T = sandbox.module.exports;

assert.equal(typeof T.sectionProgress, 'function');
assert.equal(typeof T.constructFromProgress, 'function');
assert.equal(typeof T.twinFromProgress, 'function');
assert.equal(typeof T.gatesFromProgress, 'function');
assert.equal(typeof T.qualityTier, 'function');
assert.equal(typeof T.dprCap, 'function');

// Sticky 1800px section in a 1000px viewport: start → mid → end.
assert.equal(T.sectionProgress({ top: 0, height: 1800 }, 1000), 0);
assert.ok(Math.abs(T.sectionProgress({ top: -400, height: 1800 }, 1000) - 0.5) < 1e-9);
assert.equal(T.sectionProgress({ top: -800, height: 1800 }, 1000), 1);
assert.ok(T.sectionProgress({ top: -100, height: 1800 }, 1000) < T.sectionProgress({ top: -200, height: 1800 }, 1000));

// Short snapped slide: parked ≈ 0.5, leaving raises progress, entering lowers it.
const parked = T.sectionProgress({ top: 0, height: 1000 }, 1000);
assert.ok(parked > 0.4 && parked < 0.6);
assert.ok(T.sectionProgress({ top: -400, height: 1000 }, 1000) > parked);
assert.ok(T.sectionProgress({ top: 400, height: 1000 }, 1000) < parked);

const early = T.constructFromProgress(0.2);
const late = T.constructFromProgress(0.7);
assert.ok(early.buildP < late.buildP);
assert.equal(T.constructFromProgress(0.95).buildP, 1);
assert.ok(T.constructFromProgress(0.4).yawBoost > 0);

const twin0 = T.twinFromProgress(0);
assert.equal(twin0.index, 0);
assert.equal(twin0.label, 'STRUCTURE');
assert.equal(T.twinFromProgress(0.25).index, 1);
assert.equal(T.twinFromProgress(0.45).index, 2);
assert.equal(T.twinFromProgress(0.65).index, 3);
assert.equal(T.twinFromProgress(1).index, 4);
assert.equal(T.twinFromProgress(1).label, 'VERIFIED');
assert.equal(T.twinFromProgress(1).level, 7);
assert.ok(T.twinFromProgress(0.5).elev > T.twinFromProgress(0.1).elev);

const ignite = T.gatesFromProgress(0.4);
assert.equal(ignite.rollback, false);
assert.ok(ignite.lit >= 0 && ignite.lit <= 6);

const fail = T.gatesFromProgress(0.86);
assert.equal(fail.rollback, true);
assert.equal(fail.lit, -1, 'rollback beat must not leave gates half-lit');

const commit = T.gatesFromProgress(0.97);
assert.equal(commit.rollback, false);
assert.equal(commit.lit, 6);

assert.equal(T.gatesFromProgress(0.86).lit, T.gatesFromProgress(0.88).lit);

assert.equal(T.qualityTier({ saveData: true }), 'low');
assert.equal(T.qualityTier({ reduced: true }), 'low');
assert.equal(T.qualityTier({ coarse: true }), 'medium');
assert.equal(T.qualityTier({}), 'high');

assert.ok(T.dprCap(3, 1440, 'high') <= 1.75);
assert.ok(T.dprCap(3, 400, 'high') <= 1.25);
assert.ok(T.dprCap(3, 1440, 'medium') <= 1.5);
assert.ok(T.dprCap(3, 1440, 'low') <= 1.25);

assert.equal(T.materialStage('glass'), 2);
assert.equal(T.materialStage('slab'), 1);
assert.equal(T.materialStage('core'), 0);
assert.equal(T.solidVisible('glass', 1), false);
assert.equal(T.solidVisible('glass', 2), true);

console.log('Phase 1 timeline unit tests passed.');
