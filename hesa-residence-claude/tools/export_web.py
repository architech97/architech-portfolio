# Export a web-ready, level-split GLB from VK_Residence_Interior_R04.blend.
# Read-only on the source: nothing is saved back to the .blend.
import bpy, bmesh, json, sys, math, time
OUT = sys.argv[-1]
T0 = time.time()
def log(*a): print(f"[{time.time()-T0:6.1f}s]", *a, flush=True)

EXCL_COLS = ['R02 | Detailed Planting', 'R04 Context | proposed distant world-axis belts',
             'SOURCE | Placeholder Environment - hidden', 'R02 | Proposed Underground Stormwater - QA',
             'R02 | Concealed Plumbing - Coordination', 'Lights', 'R04 Physical SW | RE',
             'R04 Interior | Cameras and mirrors']
CUTS = [3.80, 7.15, 10.50]          # slab undersides: each level carries its own slab
LEVELS = ['L0', 'L1', 'L2', 'ROOF']
SKIP_WORDS = ['washer', 'hex head', 'screw', 'fixing', 'gasket', 'seal', 'clip', 'grate', 'gully', 'pipe', 'rotor', 'drill', 'bolt', 'sump', 'r02 sw', 'anchor', 'nominalm8', 'stormwater', 'plumbing', 'marking']
scn = bpy.context.scene

# ---------- rooms ----------
rooms = []
for o in scn.objects:
    if o.type == 'EMPTY' and 'source_room_id' in o.keys():
        w = o.matrix_world.translation
        rooms.append({'id': o['source_room_id'], 'name': o.name.split('|', 1)[1].strip(),
                      'dims': o.get('source_printed_dimensions') or o.get('source_printed_dimension') or '',
                      'area': round(float(o.get('area_m2', 0)), 1),
                      'bx': round(w.x, 3), 'by': round(w.y, 3), 'bz': round(w.z, 3)})
json.dump(rooms, open(OUT + '/rooms.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
log('rooms', len(rooms))

# ---------- choose objects ----------
excl = set()
for n in EXCL_COLS:
    c = bpy.data.collections.get(n)
    if c: excl |= set(c.all_objects)
src = []
for o in scn.objects:
    if o in excl or o.hide_render or o.hide_get() and False: continue
    if o.type not in ('MESH', 'CURVE'): continue
    n = o.name
    if n == 'Lawn' or n.startswith('R04 Car') or 'Dense manicured lawn' in n or 'Lawn blade' in n: continue
    ln = n.lower()
    if any(k in ln for k in SKIP_WORDS): continue
    if max(o.dimensions) < 0.06 or max(o.dimensions) > 45: continue
    src.append(o)
log('source objects', len(src))

# ---------- bake each to a world-space mesh (modifiers, curves) ----------
dg = bpy.context.evaluated_depsgraph_get()
out_col = bpy.data.collections.new('WEB_EXPORT'); scn.collection.children.link(out_col)
baked = []
for o in src:
    try:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=False, depsgraph=dg)
    except Exception as e:
        continue
    if not me or len(me.polygons) == 0: continue
    me.transform(o.matrix_world)
    for uv in list(me.uv_layers): me.uv_layers.remove(uv)
    for at in [a.name for a in me.attributes if a.name.startswith('color') or a.domain == 'CORNER' and a.name not in ('.corner_vert', '.corner_edge')]:
        try: me.attributes.remove(me.attributes[at])
        except Exception: pass
    no = bpy.data.objects.new(o.name, me); out_col.objects.link(no)
    baked.append(no)
log('baked', len(baked))

# hide originals from the export entirely
for c in list(scn.collection.children):
    if c != out_col: scn.collection.children.unlink(c)
for o in list(scn.collection.objects): scn.collection.objects.unlink(o)

# ---------- decimate heavy decorative meshes ----------
def tris(me): return sum(len(p.vertices) - 2 for p in me.polygons)
KEEP_EXACT = {'Walls', 'Slab_Edges', 'Terrace_Floors', 'Window_Frames', 'Glazing', 'Plinth', 'Interior_Glow', 'Entry_Door'}
heavy = sorted(((tris(o.data), o.name) for o in baked), reverse=True)[:30]
log('heaviest', heavy)
log('tris before', sum(t for t, _ in ((tris(o.data), 0) for o in baked)))
for o in baked:
    base = o.name.rsplit('.', 1)[0] if o.name[-4:-3] == '.' else o.name
    if base in KEEP_EXACT: continue
    t = tris(o.data)
    if t < 300: continue
    d = o.modifiers.new('planar', 'DECIMATE'); d.decimate_type = 'DISSOLVE'; d.angle_limit = math.radians(3)
    if base == 'Mouldings': r = 0.25
    elif t > 500: r = max(0.1, 500 / t)
    else: continue
    m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = r; m.use_collapse_triangulate = True
dg = bpy.context.evaluated_depsgraph_get()
for o in baked:
    if o.modifiers:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); o.modifiers.clear(); o.data = me
log('decimated; tris now', sum(tris(o.data) for o in baked))

# ---------- split by level ----------
def level_of(z):
    for i, c in enumerate(CUTS):
        if z < c: return i
    return 3
parts = {i: [] for i in range(4)}
for o in baked:
    zs = [v.co.z for v in o.data.vertices]
    lo, hi = min(zs), max(zs)
    crosses = [c for c in CUTS if lo < c - 0.25 and hi > c + 0.25]
    if not crosses:
        parts[level_of((lo + hi) / 2)].append(o); continue
    bounds = [-1e9] + CUTS + [1e9]
    for li in range(4):
        a, b = bounds[li], bounds[li + 1]
        if hi <= a or lo >= b: continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        for z, keep_above in ((a, True), (b, False)):
            if -1e8 < z < 1e8 and lo < z < hi:
                geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
                r = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1),
                                           clear_inner=keep_above, clear_outer=not keep_above, dist=1e-5)
                cut = [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge) and e.is_valid and e.is_boundary]
                # no cap fill: a filled cut loop spans whole rooms (e.g. across the double-height void)
        if len(bm.faces) == 0: bm.free(); continue
        me = bpy.data.meshes.new(o.name + '_' + LEVELS[li]); bm.to_mesh(me); bm.free()
        for m in o.data.materials: me.materials.append(m)
        no = bpy.data.objects.new(me.name, me); out_col.objects.link(no)
        parts[li].append(no)
    out_col.objects.unlink(o)
log('split', {LEVELS[k]: len(v) for k, v in parts.items()})

# ---------- flatten materials to plain colours (no textures) ----------
def srgb_to_lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
for mat in bpy.data.materials:
    if not (mat.use_nodes and mat.node_tree): continue
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: continue
    sock = bsdf.inputs['Base Color']
    if sock.is_linked:
        # find any image upstream and average it
        stack, img = [sock.links[0].from_node], None
        while stack and not img:
            n = stack.pop()
            if n.type == 'TEX_IMAGE' and n.image: img = n.image; break
            for i in n.inputs:
                for l in i.links: stack.append(l.from_node)
        col = (0.6, 0.58, 0.54)
        if img and img.size[0] > 0:
            try:
                im = img.copy(); im.scale(8, 8)
                px = list(im.pixels); n = len(px) // 4
                col = tuple(sum(px[k::4][:n]) / n for k in range(3))
                if img.colorspace_settings.name.lower().startswith('srgb'): col = tuple(srgb_to_lin(c) for c in col)
                bpy.data.images.remove(im)
            except Exception: pass
        for l in list(sock.links): nt.links.remove(l)
        sock.default_value = (*col, 1)
    for name in ('Normal', 'Roughness', 'Metallic', 'Alpha'):
        s = bsdf.inputs.get(name)
        if s and s.is_linked:
            for l in list(s.links): nt.links.remove(l)
log('materials flattened')

# ---------- join per level ----------
finals = []
for li, objs in parts.items():
    objs = [o for o in objs if o.name in out_col.objects]
    if not objs: continue
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs, selected_objects=objs):
        bpy.ops.object.join()
    objs[0].name = LEVELS[li]; objs[0].data.name = LEVELS[li]
    finals.append(objs[0])
for o in list(out_col.objects):
    if o not in finals: out_col.objects.unlink(o)
log('levels', [(o.name, tris(o.data)) for o in finals])

# ---------- export ----------
bpy.ops.export_scene.gltf(filepath=OUT + '/hesa-model.glb', export_format='GLB', use_selection=False,
    export_yup=True, export_apply=False, export_texcoords=False, export_normals=True,
    export_draco_mesh_compression_enable=False, use_active_scene=True, export_draco_mesh_compression_level=7,
    export_draco_position_quantization=14, export_draco_normal_quantization=8,
    export_image_format='NONE', export_cameras=False, export_lights=False, export_extras=False)
log('exported')
