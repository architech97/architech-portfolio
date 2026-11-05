// Collapse ~60 flat materials into three shared ones (solid / glass / lamp) by baking each
// material's base colour into a per-vertex COLOR_0, then join primitives per level node.
// Result: a handful of draw calls per level instead of ~35 — the main CPU cost on phones.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { join, prune, dedup, meshopt, unweld, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [src, out] = process.argv.slice(2);
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src);
const root = doc.getRoot(), buffer = root.listBuffers()[0];
const GLASS = /glass|crystal|clearlens|water/i, LAMP = /lantern|filament|sconce|led\b|leds|glow|emitter|opal|diffuser|lens/i;
const shared = {
  Solid: doc.createMaterial('Solid').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.88).setMetallicFactor(0).setDoubleSided(true),
  Glass: doc.createMaterial('Glass').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.05).setMetallicFactor(0).setAlphaMode('BLEND'),
  Lamp: doc.createMaterial('Lamp').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.6).setMetallicFactor(0).setEmissiveFactor([1, 0.74, 0.44]).setDoubleSided(true)
};
const counts = { Solid: 0, Glass: 0, Lamp: 0 };
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
  const m = prim.getMaterial(); const name = m ? m.getName() : '';
  const group = GLASS.test(name) && !/frame/i.test(name) ? 'Glass' : LAMP.test(name) ? 'Lamp' : 'Solid';
  const c = m ? m.getBaseColorFactor() : [0.8, 0.8, 0.8, 1];
  const n = prim.getAttribute('POSITION').getCount();
  const col = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) { col[i * 4] = Math.round(c[0] * 255); col[i * 4 + 1] = Math.round(c[1] * 255); col[i * 4 + 2] = Math.round(c[2] * 255); col[i * 4 + 3] = 255; }
  prim.setAttribute('COLOR_0', doc.createAccessor().setType('VEC4').setArray(col).setNormalized(true).setBuffer(buffer));
  prim.setMaterial(shared[group]); counts[group]++;
}
await doc.transform(join({ keepNamed: true }), prune(), dedup());
const prims = root.listMeshes().reduce((a, m) => a + m.listPrimitives().length, 0);
console.log('groups', JSON.stringify(counts), '-> prims', prims, 'materials', root.listMaterials().map(m => m.getName()).join(','));
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(out, doc);
console.log('written', out);
