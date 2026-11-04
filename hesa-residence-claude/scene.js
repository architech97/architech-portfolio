/* HESA — "From drawing to dwelling", built on HESA's actual 3D model.
   The opening plan is the ground-floor drawing. A horizontal section plane then rises through the
   real model (exported from Blender, split into levels), so the drawing literally becomes the building:
   first a plan cut at 1.4 m, then each floor growing in turn. Finally the levels separate and dusk falls. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const A = '../hesa-residence/assets/';
const section = document.getElementById('dwelling');
const canvas = document.getElementById('scene');
const labelLayer = document.getElementById('labels');
const chapters = [...document.querySelectorAll('.chapter')];
const railBars = [...document.querySelectorAll('.rail li')];
const chNum = document.getElementById('ch-num');
const dragHint = document.querySelector('.drag-hint');
const loadNote = document.getElementById('model-load');
const mobile = matchMedia('(max-width: 860px)').matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;

/* Ground drawing (asset-026) registration to the model: 62.12 px per metre,
   outer wall corner at pixel (442, 292). World X = model "by", world Z = model "bx". */
const PXM = 62.12, ORIGIN = [442, 292];
const PAPER = new THREE.Color('#f3eee6'), DUSK = new THREE.Color('#2b2a33');

/* labels from the model's own room metadata (ids) */
const ROOM_TEXT = {
  G01: ['Vestibule'], G02_G03: ['Living + dining', '23′ × 19′ · 23′ × 15′3″'], G04: ['Kitchen'], G05: ['Mandir'],
  G06: ['Master bedroom', '15′2″ × 18′7″'], G07: ['Dresser', '10′2″ × 11′5″'], G08: ['Master lounge', '11′5″ × 11′9″'],
  G11: ['Bedroom', '13′7″ × 16′8″'], G13_LOBBY: ['Stair + lift'],
  F01: ['Bedroom', '15′2″ × 16′8″'], F02: ['Bedroom', '15′2″ × 13′9″'], F03: ['Bedroom', '13′7″ × 16′8″'],
  F07: ['Vestibule'], F08: ['Family lounge', '19′5″ × 17′8″'],
  S01: ['Bedroom', '13′7″ × 16′8″'], S03: ['Gaming zone'], S04: ['Home theatre']
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { fail(); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.background = PAPER.clone();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(3, 1, 1, 4000);

const hemi = new THREE.HemisphereLight(0xfff4e6, 0xcdb9a0, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2bd, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 140 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.09;
scene.add(sun, sun.target);

const CENTER = new THREE.Vector3(9.45, 0, 8.03);       // centre of the ground-floor footprint
// one section plane per level, so the exploded view can show every floor cut open
const LEVEL_KEYS = ['L0', 'L1', 'L2', 'ROOF'];
const planes = LEVEL_KEYS.map(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), -1));
const INTERIOR_CUT = [2.95, 6.3, 9.65, 1000];   // FFL + 2.35 m: below the ceilings, above the doors

/* ---------- the drawing sheet ---------- */
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function inkTexture(img) {
  const max = mobile ? 1300 : 2048, s = Math.min(1, max / img.width);
  const w = Math.round(img.width * s), h = Math.round(img.height * s);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h), d = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    const green = g - Math.max(r, b) > 38;
    const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    const ink = green ? 0 : clamp((0.9 - lum) / 0.62);
    let pr = 243, pg = 238, pb = 230; if (green) { pr = 226; pg = 231; pb = 213; }
    const e = clamp(Math.min(x, y, w - x, h - y) / (w * .09)), fe = e * e * (3 - 2 * e);
    d[i] = lerp(243, lerp(pr, 42, ink), fe); d[i + 1] = lerp(238, lerp(pg, 36, ink), fe); d[i + 2] = lerp(230, lerp(pb, 32, ink), fe); d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
let sheetMat, sheetMesh;
function buildSheet(img) {
  const W = img.width / PXM, H = img.height / PXM;
  sheetMat = new THREE.MeshBasicMaterial({ map: inkTexture(img), transparent: true, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), sheetMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set((img.width / 2 - ORIGIN[0]) / PXM, 0.7, (img.height / 2 - ORIGIN[1]) / PXM);   // lies on the ground-floor FFL, so walls rise out of it
  sheetMesh = m;
  scene.add(m);
  // soft contact shadows on the "table"
  const g = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.16 }));
  g.rotation.x = -Math.PI / 2; g.position.set(CENTER.x, -0.002, CENTER.z); g.receiveShadow = true;
  scene.add(g);
}

/* ---------- the model ---------- */
const levels = {};             // L0, L1, L2, ROOF -> Object3D
const glowMats = [];
const POCHE = 'vec3(0.165, 0.141, 0.125)';
function prepareMaterial(m, plane) {
  const n = (m.name || '').toLowerCase();
  const glass = /glass|crystal|clearlens|water|lens/.test(n) && !/frame/.test(n);
  m.clippingPlanes = [plane]; m.clipShadows = true;
  m.envMapIntensity = 0.35;
  if (glass) {
    Object.assign(m, { transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.05, metalness: 0 });
    return;
  }
  if (m.emissive && m.emissive.getHex() !== 0) { m.userData.emi = m.emissiveIntensity || 1; glowMats.push(m); m.emissiveIntensity = 0; }
  m.side = THREE.DoubleSide;
  // back faces = the inside of a cut wall: draw them as solid poché, like a section drawing
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>',
      `#include <dithering_fragment>
       if (!gl_FrontFacing) {
         vec3 fn = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
         vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
         if (abs(dot(fn, upV)) < 0.6) gl_FragColor = vec4(${POCHE}, 1.0);
       }`);
  };
}
function loadModel() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return new Promise((res, rej) => loader.load('hesa-model.glb', res, e => {
    if (loadNote && e.total) loadNote.textContent = `Loading HESA's model · ${Math.round(e.loaded / e.total * 100)}%`;
  }, rej));
}

/* ---------- labels ---------- */
const labels = [];
function addLabel(text, sub, pos, level, cls = '') {
  const el = document.createElement('div');
  el.className = 'lbl ' + cls;
  el.innerHTML = `<b>${text}${sub ? `<small>${sub}</small>` : ''}</b>`;
  labelLayer.appendChild(el);
  labels.push({ el, pos, level, op: 0 });
}

/* ---------- camera rig ---------- */
const rig = { fov: 2.2, theta: 0.0001, phi: 0, view: 21, ty: 0, dragPhi: 0, dragTheta: 0 };
let W = 1, H = 1;
function placeCamera() {
  const aspect = W / H;
  camera.fov = rig.fov; camera.aspect = aspect;
  const needH = Math.max(rig.view, (rig.view * (aspect < 1 ? 0.95 : 1.18)) / aspect);
  const r = (needH / 2) / Math.tan(THREE.MathUtils.degToRad(rig.fov) / 2);
  const th = clamp(rig.theta + rig.dragTheta, 0.0001, 1.38), ph = rig.phi + rig.dragPhi;
  const target = CENTER.clone(); target.y = rig.ty;
  camera.position.set(target.x + r * Math.sin(th) * Math.sin(ph), target.y + r * Math.cos(th), target.z + r * Math.sin(th) * Math.cos(ph));
  camera.up.set(-Math.sin(ph), 0, -Math.cos(ph));
  camera.near = Math.max(0.5, r - 90); camera.far = r + 140;
  camera.lookAt(target);
  if (!mobile && aspect > 1.1) camera.setViewOffset(W, H, -W * 0.14, 0, W, H);
  else if (aspect < 0.9) camera.setViewOffset(W, H, 0, H * 0.13, W, H); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

/* ---------- timeline ---------- */
const BOUNDS = [0, 0.07, 0.36, 0.48, 0.64, 0.80, 1.01];
let lastCh = -1, interactive = false;
function update(p) {
  // section plane height: plan cut at 1.4 m, then each floor grows
  let h = -0.2;
  h = lerp(h, 1.4, ease(seg(p, 0.07, 0.19)));
  h = lerp(h, INTERIOR_CUT[0], ease(seg(p, 0.22, 0.36)));
  h = lerp(h, INTERIOR_CUT[1], ease(seg(p, 0.49, 0.62)));
  h = lerp(h, INTERIOR_CUT[2], ease(seg(p, 0.65, 0.72)));
  h = lerp(h, 14, ease(seg(p, 0.745, 0.79)));
  const gap = lerp(0, 4.6, ease(seg(p, 0.81, 0.92)));
  const reopen = ease(seg(p, 0.81, 0.89));
  planes.forEach((pl, i) => {
    const off = i * gap;
    pl.constant = p < 0.8 ? h : lerp(14 + off, INTERIOR_CUT[i] + off, reopen);
  });
  ['L1', 'L2', 'ROOF'].forEach((k, i) => { const n = levels[k]; if (n) n.position.y = n.userData.y0 + (i + 1) * gap; });

  // lens and orbit
  rig.fov = lerp(2.2, 34, ease(seg(p, 0.18, 0.36)));
  rig.theta = lerp(0.0001, 0.9, ease(seg(p, 0.2, 0.38))) + lerp(0, 0.12, ease(seg(p, 0.5, 0.8)));
  rig.phi = lerp(0, -0.55, ease(seg(p, 0.2, 0.46))) + lerp(0, -0.45, ease(seg(p, 0.48, 0.80))) + lerp(0, -1.0, ease(seg(p, 0.82, 1)));
  rig.view = lerp(21, 25, ease(seg(p, 0.2, 0.4))) + lerp(0, 5, ease(seg(p, 0.48, 0.78))) + lerp(0, 11, ease(seg(p, 0.81, 0.92)));
  rig.ty = lerp(0, 1.6, ease(seg(p, 0.3, 0.4))) + lerp(0, 2.4, ease(seg(p, 0.5, 0.62))) + lerp(0, 2.4, ease(seg(p, 0.65, 0.78))) + lerp(0, 6, ease(seg(p, 0.81, 0.92)));

  // light: flat drawing light -> late-afternoon sun -> dusk
  const lit = ease(seg(p, 0.16, 0.34)), dusk = ease(seg(p, 0.92, 0.99));
  sun.intensity = lerp(0, 2.2, lit) * (1 - dusk * 0.92);
  hemi.intensity = lerp(1.5, 1.0, lit) * (1 - dusk * 0.62);
  hemi.color.setRGB(1, lerp(0.957, 0.86, dusk), lerp(0.9, 0.95, dusk));
  scene.background.copy(PAPER).lerp(DUSK, dusk);
  glowMats.forEach(m => m.emissiveIntensity = m.userData.emi * dusk * 6);
  if (sheetMat) { const fade = ease(seg(p, 0.30, 0.40)); sheetMat.opacity = 1 - fade; sheetMesh.visible = fade < 0.999; }
  document.body.classList.toggle('scene-dusk', dusk > 0.5);

  // labels
  const show = [seg(p, 0.40, 0.43) * (1 - seg(p, 0.47, 0.49)), seg(p, 0.60, 0.62) * (1 - seg(p, 0.645, 0.66)), seg(p, 0.70, 0.72) * (1 - seg(p, 0.735, 0.75))];
  labels.forEach(l => l.op = l.level === 'lvl' ? seg(p, 0.88, 0.92) : show[l.level]);

  // chapters
  const ch = Math.max(0, BOUNDS.findIndex(b => p < b) - 1);
  if (ch !== lastCh) { chapters.forEach((c, i) => c.classList.toggle('is-active', i === ch)); chNum.textContent = String(ch + 1).padStart(2, '0'); lastCh = ch; }
  railBars.forEach((b, i) => b.style.setProperty('--f', clamp((p - BOUNDS[i]) / (BOUNDS[i + 1] - BOUNDS[i]))));
  dragHint.classList.toggle('on', p > 0.88 && p < 0.995);
  interactive = p > 0.84;
  if (!interactive) { rig.dragPhi *= 0.9; rig.dragTheta *= 0.9; }
}

const v3 = new THREE.Vector3();
function placeLabels() {
  labels.forEach(l => {
    if (!l.op) { l.el.style.opacity = 0; return; }
    v3.copy(l.pos);
    if (l.levelNode) v3.y += l.levelNode.position.y - l.levelNode.userData.y0;
    v3.project(camera);
    const x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * H;
    const isLevel = l.el.classList.contains('level');
    const lx = isLevel ? W - (mobile ? 16 : 150) : x;          // level names sit in a right-hand column
    l.el.style.transform = `translate(${lx}px,${y}px)${isLevel ? ' translateX(-100%)' : ''}`;
    l.el.style.opacity = v3.z < 1 ? l.op : 0;
  });
}

/* ---------- drag to orbit (final chapter) ---------- */
let drag = null;
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
let visible = false, ready = false, smoothP = 0, lastKey = '';
new IntersectionObserver(es => visible = es[0].isIntersecting, { rootMargin: '200px' }).observe(section);
function resize() { W = canvas.clientWidth; H = canvas.clientHeight; renderer.setSize(W, H, false); lastKey = ''; }
addEventListener('resize', resize);
function loop() {
  requestAnimationFrame(loop);
  if (!visible || !ready) return;
  const r = section.getBoundingClientRect();
  const target = clamp(-r.top / (r.height - innerHeight));
  smoothP += (target - smoothP) * 0.12;
  if (window.__forceP != null) smoothP = window.__forceP;   // test hook
  if (Math.abs(target - smoothP) < 0.0002) smoothP = target;
  const key = smoothP.toFixed(5) + rig.dragPhi.toFixed(4) + rig.dragTheta.toFixed(4) + W + 'x' + H;
  if (key === lastKey) return;
  lastKey = key;
  update(smoothP);
  placeCamera();
  sun.target.position.set(CENTER.x, 3, CENTER.z);
  sun.position.set(CENTER.x - 22, 30 + rig.ty, CENTER.z + 26);
  renderer.render(scene, camera);
  placeLabels();
}
function fail() {
  document.querySelector('.scene-fallback').hidden = false;
  canvas.style.display = 'none';
  if (loadNote) loadNote.hidden = true;
}

/* ---------- boot ---------- */
(async () => {
  try {
    const img = await loadImage(A + 'asset-026.jpg');
    buildSheet(img);
    resize(); ready = true;            // the drawing can show while the model streams in
    requestAnimationFrame(loop);
    const [gltf, rooms] = await Promise.all([loadModel(), fetch('rooms.json').then(r => r.json())]);
    const root = gltf.scene;
    root.rotation.y = -Math.PI / 2;    // model x/y -> drawing rows/columns
    LEVEL_KEYS.forEach((n, i) => {
      const node = root.getObjectByName(n); if (!node) return;
      levels[n] = node; node.userData.y0 = node.position.y;
      node.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = o.receiveShadow = true;
        const mats = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const c = m.clone(); prepareMaterial(c, planes[i]); return c; });
        o.material = Array.isArray(o.material) ? mats : mats[0];
      });
    });
    scene.add(root);
    rooms.forEach(r => {
      const t = ROOM_TEXT[r.id]; if (!t) return;
      const lv = r.id[0] === 'G' ? 0 : r.id[0] === 'F' ? 1 : 2;
      addLabel(t[0], t[1], new THREE.Vector3(r.by, r.bz + 0.4, r.bx), lv);
      labels[labels.length - 1].levelNode = levels[['L0', 'L1', 'L2'][lv]];
    });
    [['Ground floor', 0.6, 'L0'], ['First floor', 3.95, 'L1'], ['Second floor', 7.3, 'L2']].forEach(([n, y, k], i) => {
      addLabel(`<span>Level 0${i}</span>${n}`, '', new THREE.Vector3(22.5, y, 16.5), 'lvl', 'level');
      labels[labels.length - 1].levelNode = levels[k];
    });
    if (loadNote) loadNote.hidden = true;
    lastKey = '';
    window.__hesaScene = { update, renderer, camera, levels, scene, THREE };
  } catch (err) {
    console.error(err);
    fail();
  }
})();
