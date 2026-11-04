// Keep only the four level nodes, then weld / simplify / compress for the web.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplify, meshopt, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const [src, out, ratio = '0.5', err = '0.0006'] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'meshopt.encoder': MeshoptEncoder,
});
const doc = await io.read(src);
const root = doc.getRoot();
const KEEP = new Set(['L0', 'L1', 'L2', 'ROOF']);
const scenes = root.listScenes();
console.log('scenes', scenes.map(s => s.getName() + ':' + s.listChildren().map(n => n.getName()).join('|')));
const target = scenes.find(s => s.listChildren().some(n => KEEP.has(n.getName()))) || scenes[0];
for (const s of scenes) if (s !== target) s.dispose();
for (const n of target.listChildren()) if (!KEEP.has(n.getName())) n.dispose();
root.setDefaultScene(target);
for (const e of root.listExtensionsUsed()) if (e.extensionName === 'KHR_draco_mesh_compression') e.dispose();
await doc.transform(prune(), dedup(), weld());
let tris = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
console.log('kept nodes', target.listChildren().map(n => n.getName()), 'tris', Math.round(tris));
await MeshoptSimplifier.ready;
await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +err, lockBorder: false }), prune());
tris = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? 0) / 3;
console.log('after simplify tris', Math.round(tris), 'materials', root.listMaterials().length, 'prims', root.listMeshes().reduce((a, m) => a + m.listPrimitives().length, 0));
await MeshoptEncoder.ready;
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(out, doc);
console.log('written', out);
