// Build web LODs from the level-split Blender export.
// usage: node optimize_lod.mjs <src.glb> <out.glb> <ratio> <error> [dropSmall(m)]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplify, meshopt } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const [src, out, ratio = '0.5', err = '0.001'] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'meshopt.encoder': MeshoptEncoder,
});
const doc = await io.read(src);
const root = doc.getRoot();
const KEEP = new Set(['L0', 'L1', 'L2', 'ROOF']);
const scenes = root.listScenes();
const target = scenes.find(s => s.listChildren().some(n => KEEP.has(n.getName()))) || scenes[0];
for (const s of scenes) if (s !== target) s.dispose();
for (const n of target.listChildren()) if (!KEEP.has(n.getName())) n.dispose();
root.setDefaultScene(target);
// unused PBR extras cost bytes and shader variants on the web
for (const m of root.listMaterials()) {
  for (const ext of m.listExtensions()) {
    const name = ext.extensionName;
    if (['KHR_materials_sheen', 'KHR_materials_anisotropy', 'KHR_materials_clearcoat', 'KHR_materials_specular'].includes(name)) m.setExtension(name, null);
  }
}
if (process.env.NO_NORMALS) for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const n = p.getAttribute('NORMAL'); if (n) { p.setAttribute('NORMAL', null); } }
await doc.transform(prune(), dedup(), weld());
const count = () => root.listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);
console.log('tris before', Math.round(count()));
await MeshoptSimplifier.ready;
await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +err, lockBorder: false }), prune());
console.log('tris after', Math.round(count()));
await MeshoptEncoder.ready;
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(out, doc);
console.log('written', out);
