/* HESA — "From drawing to dwelling".
   The opening plan is the real 3D model seen from straight above through a very long lens.
   Scrolling raises the traced walls, opens the lens (dolly-zoom), sweeps material across the
   floor, lands the upper floors on the shared stair/lift core and finally explodes the stack. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const A = '../hesa-residence/assets/';
const section = document.getElementById('dwelling');
const canvas = document.getElementById('scene');
const labelLayer = document.getElementById('labels');
const chapters = [...document.querySelectorAll('.chapter')];
const railBars = [...document.querySelectorAll('.rail li')];
const chNum = document.getElementById('ch-num');
const dragHint = document.querySelector('.drag-hint');
const mobile = matchMedia('(max-width: 860px)').matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eo = t => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

const STAIR_M = 4.65;      // real width of the stair enclosure used to register all floors (≈62 px/m on the ground sheet)
const FLOOR_H = 3.3, WALL_H = 3.0;
const PAPER = new THREE.Color('#f3eee6');

/* Room labels: [x, y] in each drawing's own pixels, read from the drawings */
const ROOMS = [
  [['Mandir', '', 780, 387], ['Vestibule', '', 786, 588], ['Living room', '23′ × 19′ · double height', 1156, 560], ['Kitchen', '', 1470, 387],
   ['Dining', '23′ × 15′3″', 1136, 790], ['Garden sit-out', '', 1402, 795], ['Master bedroom', '15′2″ × 18′7″', 610, 987],
   ['Master lounge', '11′5″ × 11′9″', 780, 793], ['Dresser', '', 536, 812], ['Bedroom', '13′7″ × 16′8″', 1092, 1037], ['Stair + lift', '', 1478, 1137]],
  [['Family lounge', '19′5″ × 17′8″', 1017, 803], ['Void over living', '', 1020, 237], ['Bedroom', '15′2″ × 13′9″', 355, 742],
   ['Bedroom', '15′2″ × 16′8″', 360, 944], ['Bedroom', '13′7″ × 16′8″', 975, 1182], ['Terrace', '', 607, 271], ['Terrace', '', 1420, 271]],
  [['Home theatre', '', 936, 256], ['Gaming zone', '', 931, 655], ['Terrace', '', 376, 865], ['Bedroom', '13′7″ × 16′8″', 852, 1202]]
];
const VOID_F1 = [896, 42, 1145, 431]; // double-height opening above the living room, first-floor pixels

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.querySelector('.scene-fallback').hidden = false; canvas.remove(); throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = PAPER.clone();
const camera = new THREE.PerspectiveCamera(3, 1, 1, 4000);

const hemi = new THREE.HemisphereLight(0xfffaf2, 0xe8dccb, 2.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6c4, 0.0);
sun.position.set(-26, 34, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 140 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);

/* ---------- textures: turn each drawing into "ink" and "material" versions ---------- */
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function makeTextures(img, f, data, bbox) {
  const max = mobile ? 1300 : 2048, s = Math.min(1, max / img.width);
  const w = Math.round(img.width * s), h = Math.round(img.height * s);
  const make = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const src = make(), sctx = src.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, w, h);
  const px = sctx.getImageData(0, 0, w, h), d = px.data;
  const inkC = make(), matC = make();
  const inkD = new ImageData(w, h), matD = new ImageData(w, h);
  const [bx0, by0, bx1, by1] = bbox.map(v => v * s);
  const v = f === 1 ? VOID_F1.map(v => v * s) : null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    const green = g - Math.max(r, b) > 38;
    const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    const ink = green ? 0 : clamp((0.9 - lum) / 0.62);
    const inside = x >= bx0 && x <= bx1 && y >= by0 && y <= by1 && !(v && x > v[0] + 4 && x < v[2] - 4 && y > v[1] + 4 && y < v[3] - 4);
    // ink version: warm paper + sepia ink, lawn as a faint sage wash
    let pr = 243, pg = 238, pb = 230;
    if (green) { pr = 228; pg = 232; pb = 216; }
    inkD.data[i] = lerp(pr, 42, ink); inkD.data[i + 1] = lerp(pg, 36, ink); inkD.data[i + 2] = lerp(pb, 32, ink);
    // material version: travertine inside, paving / garden outside, lines kept as soft grout
    let mr, mg, mb;
    if (inside) { const n = (Math.sin(x * .9 + y * .13) * .5 + .5) * 6; mr = 232 - n; mg = 218 - n; mb = 196 - n; }
    else if (green) { mr = 146; mg = 160; mb = 120; }
    else { mr = 236; mg = 230; mb = 220; }
    const k = ink * .78;
    matD.data[i] = lerp(mr, 70, k); matD.data[i + 1] = lerp(mg, 58, k); matD.data[i + 2] = lerp(mb, 48, k);
    // upper floors: only the slab and the drawn lines are solid
    const a = f === 0 || inside || ink > .35 ? 255 : 0;
    if (f === 0) { const e = clamp(Math.min(x, y, w - x, h - y) / (w * .09)); const fe = e * e * (3 - 2 * e);
      inkD.data[i] = lerp(243, inkD.data[i], fe); inkD.data[i + 1] = lerp(238, inkD.data[i + 1], fe); inkD.data[i + 2] = lerp(230, inkD.data[i + 2], fe);
      matD.data[i] = lerp(243, matD.data[i], fe); matD.data[i + 1] = lerp(238, matD.data[i + 1], fe); matD.data[i + 2] = lerp(230, matD.data[i + 2], fe); }
    inkD.data[i + 3] = a; matD.data[i + 3] = a;
  }
  inkC.getContext('2d').putImageData(inkD, 0, 0); matC.getContext('2d').putImageData(matD, 0, 0);
  const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  return [tex(inkC), tex(matC)];
}

function sweepMaterial(inkTex, matTex, aspect, alpha) {
  const m = new THREE.MeshStandardMaterial({ map: inkTex, roughness: 0.92, metalness: 0, alphaTest: alpha ? 0.5 : 0, side: THREE.DoubleSide });
  m.userData.u = { uMat: { value: matTex }, uSweep: { value: 0 }, uOrigin: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: aspect } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uMat; uniform float uSweep; uniform vec2 uOrigin; uniform float uAspect;')
      .replace('#include <map_fragment>', `
        vec4 tA = texture2D(map, vMapUv);
        vec4 tB = texture2D(uMat, vMapUv);
        float d = length((vMapUv - uOrigin) * vec2(uAspect, 1.0));
        float R = uSweep * 1.5;
        float mixv = 1.0 - smoothstep(R - 0.06, R, d);
        vec4 t = mix(tA, tB, mixv);
        float edge = (1.0 - smoothstep(0.0, 0.035, abs(d - R + 0.02))) * step(0.001, uSweep) * (1.0 - step(0.999, uSweep));
        t.rgb += edge * vec3(0.85, 0.55, 0.25) * 0.45;
        diffuseColor *= t;`);
  };
  return m;
}

/* ---------- build one floor ---------- */
function buildFloor(data, f, tex) {
  const k = STAIR_M / data.registrationSpanPx;
  const P = (x, y) => [(x - data.anchor[0]) * k, (y - data.anchor[1]) * k];
  const group = new THREE.Group();
  const W = data.width * k, H = data.height * k;
  const bbox = [
    Math.min(...data.walls.map(r => r[0])), Math.min(...data.walls.map(r => r[1])),
    Math.max(...data.walls.map(r => r[2])), Math.max(...data.walls.map(r => r[3]))];

  // the sheet itself (floor finish)
  const [inkTex, matTex] = makeTextures(tex, f, data, bbox);
  const sheetMat = sweepMaterial(inkTex, matTex, data.width / data.height, f > 0);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, H), sheetMat);
  sheet.rotation.x = -Math.PI / 2;
  const [cx, cz] = P(data.width / 2, data.height / 2);
  sheet.position.set(cx, 0.002, cz);
  sheet.receiveShadow = true;
  group.add(sheet);
  // sweep starts at the stair/lift core — the one thing every floor shares
  sheetMat.userData.u.uOrigin.value.set(data.anchor[0] / data.width, 1 - data.anchor[1] / data.height);

  // slab under upper floors (with the double-height void cut out on the first floor)
  if (f > 0) {
    const [x0, z0] = P(bbox[0], bbox[1]), [x1, z1] = P(bbox[2], bbox[3]);
    const shape = new THREE.Shape([new THREE.Vector2(x0, -z0), new THREE.Vector2(x1, -z0), new THREE.Vector2(x1, -z1), new THREE.Vector2(x0, -z1)]);
    if (f === 1) {
      const [vx0, vz0] = P(VOID_F1[0], VOID_F1[1]), [vx1, vz1] = P(VOID_F1[2], VOID_F1[3]);
      shape.holes.push(new THREE.Path([new THREE.Vector2(vx0, -vz0), new THREE.Vector2(vx0, -vz1), new THREE.Vector2(vx1, -vz1), new THREE.Vector2(vx1, -vz0)]));
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); g.translate(0, -0.302, 0);
    const slab = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xece5da, roughness: 1 }));
    slab.castShadow = slab.receiveShadow = true;
    group.add(slab);
    group.userData.slab = slab;
  }

  // walls traced from the drawing, unit height, scaled to rise
  const geos = data.walls.map(([x0, y0, x1, y1]) => {
    const [a, b] = P(x0, y0), [c, d] = P(x1, y1);
    const g = new THREE.BoxGeometry(Math.max(c - a, 0.02), 1, Math.max(d - b, 0.02));
    g.translate((a + c) / 2, 0.5, (b + d) / 2); return g;
  });
  (data.polygons || []).forEach(poly => {
    const shape = new THREE.Shape(poly.map(([x, y]) => { const [a, b] = P(x, y); return new THREE.Vector2(a, -b); }));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2); geos.push(g);
  });
  const merged = mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g));
  merged.computeVertexNormals();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.85 });
  const walls = new THREE.Mesh(merged, wallMat);
  walls.castShadow = walls.receiveShadow = true;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(merged, 30), new THREE.LineBasicMaterial({ color: 0x2a2420, transparent: true, opacity: 0 }));
  const wallGroup = new THREE.Group(); wallGroup.add(walls, edges); wallGroup.scale.y = 0.03;
  group.add(wallGroup);

  // labels
  const labels = ROOMS[f].map(([name, dims, x, y]) => {
    const [a, b] = P(x, y), el = document.createElement('div');
    el.className = 'lbl'; el.innerHTML = `<b>${name}${dims ? `<small>${dims}</small>` : ''}</b>`;
    labelLayer.appendChild(el);
    return { el, pos: new THREE.Vector3(a, 0.2, b) };
  });
  const lvl = document.createElement('div'); lvl.className = 'lbl level';
  lvl.innerHTML = `<b><span>Level 0${f}</span>${['Ground floor', 'First floor', 'Second floor'][f]}</b>`;
  labelLayer.appendChild(lvl);
  const [lx, lz] = P(bbox[0], bbox[3]);
  const level = { el: lvl, pos: new THREE.Vector3(lx - 1.5, 0.3, lz + 1) };

  return { group, sheetMat, wallGroup, wallMat, edges, labels, level };
}

/* ---------- camera rig ---------- */
const CENTER = new THREE.Vector3(-7.1, 0, -5.6);   // centre of the ground-floor walls
const rig = { fov: 3, theta: 0.0001, phi: 0, view: 19, ty: 0, dragPhi: 0, dragTheta: 0 };
let W = 1, H = 1;
function placeCamera() {
  const aspect = W / H;
  camera.fov = rig.fov; camera.aspect = aspect;
  const needH = Math.max(rig.view, (rig.view * (aspect < 1 ? 0.92 : 1.18)) / aspect);
  const r = (needH / 2) / Math.tan(THREE.MathUtils.degToRad(rig.fov) / 2);
  const th = clamp(rig.theta + rig.dragTheta, 0.0001, 1.35), ph = rig.phi + rig.dragPhi;
  const target = CENTER.clone(); target.y = rig.ty;
  camera.position.set(target.x + r * Math.sin(th) * Math.sin(ph), target.y + r * Math.cos(th), target.z + r * Math.sin(th) * Math.cos(ph));
  camera.up.set(-Math.sin(ph), 0, -Math.cos(ph));
  camera.near = Math.max(0.5, r - 80); camera.far = r + 120;
  camera.lookAt(target);
  // shift the picture right of the caption panel on wide screens
  if (!mobile && aspect > 1.1) camera.setViewOffset(W, H, -W * 0.14, 0, W, H);
  else if (aspect < 0.9) camera.setViewOffset(W, H, 0, H * 0.13, W, H); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

/* ---------- timeline ---------- */
let floors = [], lastCh = -1;
function update(p) {
  const [g, f1, f2] = floors;
  // 1. sheet -> walls rise, lens opens, view tilts
  const rise = ease(seg(p, 0.07, 0.26));
  const lens = ease(seg(p, 0.08, 0.30));
  const tilt = ease(seg(p, 0.12, 0.34));
  rig.fov = lerp(2.2, 36, lens);
  rig.theta = lerp(0.0001, 0.92, tilt);
  rig.phi = lerp(0, -0.5, ease(seg(p, 0.12, 0.40))) + lerp(0, -0.45, ease(seg(p, 0.46, 0.80))) + lerp(0, -0.9, ease(seg(p, 0.84, 1)));
  rig.view = lerp(21, 27, ease(seg(p, 0.16, 0.40))) + lerp(0, 8, ease(seg(p, 0.44, 0.56))) + lerp(0, 3, ease(seg(p, 0.64, 0.74))) + lerp(0, 8, ease(seg(p, 0.82, 0.94)));
  g.wallGroup.scale.y = lerp(0.03, WALL_H, rise);
  // walls: poché ink -> plaster
  const plaster = ease(seg(p, 0.20, 0.34));
  g.wallMat.color.setRGB(lerp(.165, .95, plaster), lerp(.141, .925, plaster), lerp(.125, .89, plaster));
  g.edges.material.opacity = Math.sin(Math.PI * seg(p, 0.14, 0.42)) * 0.55;
  sun.intensity = lerp(0.0, 1.5, ease(seg(p, 0.14, 0.32)));
  hemi.intensity = lerp(2.6, 1.25, ease(seg(p, 0.14, 0.32)));
  // 2. material sweep over the ground floor
  g.sheetMat.userData.u.uSweep.value = ease(seg(p, 0.30, 0.46));

  // 3. first floor lands, rises, sweeps
  const gap = lerp(0, 4.2, ease(seg(p, 0.84, 0.95)));
  const drop1 = eo(seg(p, 0.47, 0.58));
  f1.group.visible = p > 0.465;
  f1.group.position.y = lerp(40, FLOOR_H + gap, drop1);
  f1.wallGroup.scale.y = lerp(0.03, WALL_H, ease(seg(p, 0.55, 0.63)));
  const pl1 = ease(seg(p, 0.55, 0.63));
  f1.wallMat.color.setRGB(lerp(.165, .95, pl1), lerp(.141, .925, pl1), lerp(.125, .89, pl1));
  f1.edges.material.opacity = Math.sin(Math.PI * seg(p, 0.53, 0.68)) * 0.5;
  f1.sheetMat.userData.u.uSweep.value = ease(seg(p, 0.58, 0.68));

  // 4. second floor
  const drop2 = eo(seg(p, 0.65, 0.75));
  f2.group.visible = p > 0.645;
  f2.group.position.y = lerp(40, 2 * (FLOOR_H + gap), drop2);
  f2.wallGroup.scale.y = lerp(0.03, WALL_H, ease(seg(p, 0.72, 0.79)));
  const pl2 = ease(seg(p, 0.72, 0.79));
  f2.wallMat.color.setRGB(lerp(.165, .95, pl2), lerp(.141, .925, pl2), lerp(.125, .89, pl2));
  f2.edges.material.opacity = Math.sin(Math.PI * seg(p, 0.70, 0.84)) * 0.5;
  f2.sheetMat.userData.u.uSweep.value = ease(seg(p, 0.74, 0.84));

  rig.ty = lerp(0, 2.2, ease(seg(p, 0.48, 0.62))) + lerp(0, 2.2, ease(seg(p, 0.66, 0.78))) + lerp(0, 4.2, ease(seg(p, 0.84, 0.95)));
  rig.theta += lerp(0, 0.1, ease(seg(p, 0.5, 0.8)));

  // labels: which floor is "in focus"
  const show = [
    seg(p, 0.40, 0.44) * (1 - seg(p, 0.47, 0.50)),
    seg(p, 0.63, 0.66) * (1 - seg(p, 0.66, 0.69)) + 0 ,
    seg(p, 0.79, 0.81) * (1 - seg(p, 0.83, 0.85))
  ];
  // first floor labels stay until second floor arrives
  show[1] = seg(p, 0.62, 0.65) * (1 - seg(p, 0.645, 0.665));
  const lvlShow = seg(p, 0.90, 0.94);
  floors.forEach((fl, i) => { fl.labels.forEach(l => l.op = show[i]); fl.level.op = lvlShow; });

  // chapters + rail
  const bounds = [0, 0.08, 0.30, 0.47, 0.65, 0.84, 1.01];
  const ch = Math.max(0, bounds.findIndex(b => p < b) - 1);
  if (ch !== lastCh) {
    chapters.forEach((c, i) => c.classList.toggle('is-active', i === ch));
    chNum.textContent = String(ch + 1).padStart(2, '0'); lastCh = ch;
  }
  railBars.forEach((b, i) => b.style.setProperty('--f', clamp((p - bounds[i]) / (bounds[i + 1] - bounds[i]))));
  dragHint.classList.toggle('on', p > 0.9 && p < 0.995);
  interactive = p > 0.86;
  if (!interactive) { rig.dragPhi *= 0.9; rig.dragTheta *= 0.9; }
}

/* ---------- project labels to screen ---------- */
const v3 = new THREE.Vector3();
function placeLabels() {
  floors.forEach(fl => {
    [...fl.labels, fl.level].forEach(l => {
      if (!fl.group.visible || !l.op) { l.el.style.opacity = 0; return; }
      v3.copy(l.pos); v3.y += fl.group.position.y; v3.project(camera);
      const x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * H;
      const flipX = l.el.classList.contains('level') && x > W - 170;
      l.el.style.transform = `translate(${x}px,${y}px)${flipX ? ' translateX(-100%)' : ''}`;
      l.el.style.opacity = v3.z < 1 ? l.op : 0;
    });
  });
}

/* ---------- drag to orbit (final chapter) ---------- */
let interactive = false, drag = null;
canvas.addEventListener('pointerdown', e => { if (!interactive) return; drag = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  rig.dragPhi -= (e.clientX - drag[0]) * 0.006;
  rig.dragTheta = clamp(rig.dragTheta - (e.clientY - drag[1]) * 0.004, -0.8, 0.35);
  drag = [e.clientX, e.clientY];
});
canvas.addEventListener('pointerup', () => drag = null);
canvas.addEventListener('pointercancel', () => drag = null);

/* ---------- loop ---------- */
let visible = false, smoothP = 0, lastKey = '';
new IntersectionObserver(es => visible = es[0].isIntersecting, { rootMargin: '100px' }).observe(section);
function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  renderer.setSize(W, H, false);
}
addEventListener('resize', resize);

function loop() {
  requestAnimationFrame(loop);
  if (!visible || !floors.length) return;
  const r = section.getBoundingClientRect();
  const target = clamp(-r.top / (r.height - innerHeight));
  smoothP += (target - smoothP) * 0.12;
  if (Math.abs(target - smoothP) < 0.0002) smoothP = target;
  const key = smoothP.toFixed(5) + rig.dragPhi.toFixed(4) + rig.dragTheta.toFixed(4) + W + 'x' + H;
  if (key === lastKey) return;
  lastKey = key;
  update(smoothP);
  placeCamera();
  sun.target.position.copy(CENTER); sun.position.set(CENTER.x - 24, 34, CENTER.z + 22);
  renderer.render(scene, camera);
  placeLabels();
}

/* ---------- boot ---------- */
(async () => {
  try {
    const data = await (await fetch('plan-data.json')).json();
    const imgs = await Promise.all(data.floors.map(fl => loadImage(A + fl.source)));
    floors = data.floors.map((fl, i) => buildFloor(fl, i, imgs[i]));
    floors.forEach(fl => scene.add(fl.group));
    resize(); update(0); placeCamera(); renderer.render(scene, camera);
    window.__hesaScene = { update, renderer, camera, floors };
    requestAnimationFrame(loop);
  } catch (err) {
    console.error(err);
    document.querySelector('.scene-fallback').hidden = false;
    canvas.style.display = 'none';
  }
})();
