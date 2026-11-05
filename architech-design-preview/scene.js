/* ArchiTECH — "From drawing to dwelling", using the supplied residence model.
   One continuous, scroll-driven shot:
   drawing → plan cut → ground floor opens → step inside the double-height living room →
   rise through the void onto the first floor → second floor and roof → the levels part around
   the stair/lift core → down to street level for a sun study → dusk, the house lights up. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const A = 'assets/';
const section = document.getElementById('dwelling');
const canvas = document.getElementById('scene');
const labelLayer = document.getElementById('labels');
const chapters = [...document.querySelectorAll('.chapter')];
const railBars = [...document.querySelectorAll('.rail li')];
const chNum = document.getElementById('ch-num');
const dragHint = document.querySelector('.drag-hint');
const loadNote = document.getElementById('model-load');
const sunTimeEl = document.getElementById('sun-time');

const mobile = matchMedia('(max-width: 860px)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const lowPower = mobile || coarse || (navigator.hardwareConcurrency || 8) <= 4;
const MODEL = lowPower ? 'residence-model-lite.glb' : 'residence-model.glb';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const sm = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const eo = t => 1 - Math.pow(1 - t, 3);

/* Ground drawing (asset-026) registered to the model: 62.12 px/m, outer wall corner at px (442, 292).
   World X = model "by", world Z = model "bx" (drawing columns/rows), Y up. North = −Z. */
const PXM = 62.12, ORIGIN = [442, 292];
const CENTER = new THREE.Vector3(9.45, 0, 8.03);
const LIFT = new THREE.Vector3(16.55, 0, 13.63);
const PAPER = new THREE.Color('#f3eee6'), DUSK = new THREE.Color('#1f1d26');
const LEVEL_KEYS = ['L0', 'L1', 'L2', 'ROOF'];
const FFL = [0.6, 3.95, 7.3];
const INTERIOR_CUT = [2.95, 6.3, 9.65, 1000];   // FFL + 2.35 m — below the ceilings, above the doors

const ROOM_TEXT = {
  G01: ['Vestibule'], G02_G03: ['Living + dining', '23′ × 19′ · 23′ × 15′3″'], G04: ['Kitchen'], G05: ['Mandir'],
  G06: ['Master bedroom', '15′2″ × 18′7″'], G07: ['Dresser', '10′2″ × 11′5″'], G08: ['Master lounge', '11′5″ × 11′9″'],
  G11: ['Bedroom', '13′7″ × 16′8″'], G13_LOBBY: ['Stair + lift'],
  F01: ['Bedroom', '15′2″ × 16′8″'], F02: ['Bedroom', '15′2″ × 13′9″'], F03: ['Bedroom', '13′7″ × 16′8″'],
  F07: ['Vestibule'], F08: ['Family lounge', '19′5″ × 17′8″'],
  S01: ['Bedroom', '13′7″ × 16′8″'], S03: ['Gaming zone'], S04: ['Home theatre']
};

/* ---------- renderer ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
} catch (e) { fail(); throw e; }
const DPR_MAX = Math.min(devicePixelRatio || 1, lowPower ? 1.5 : 1.75);
let dpr = DPR_MAX;
renderer.setPixelRatio(dpr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = lowPower ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
if (lowPower) renderer.shadowMap.autoUpdate = false;

const scene = new THREE.Scene();
scene.background = PAPER.clone();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();
const camera = new THREE.PerspectiveCamera(3, 1, 0.05, 4000);

const hemi = new THREE.HemisphereLight(0xfff4e6, 0xe2d6c4, 1.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2bd, 0);
sun.castShadow = true;
const SM = lowPower ? 1024 : 2048;
sun.shadow.mapSize.set(SM, SM);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 160 });
sun.shadow.bias = -0.0012; sun.shadow.normalBias = 0;   // flat-shaded model ships without normals
scene.add(sun, sun.target);
sun.target.position.copy(CENTER);

const planes = LEVEL_KEYS.map(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), -1));

/* ---------- the drawing sheet (pre-inked offline from asset-026, 1910 × 1541 px) ---------- */
const SHEET_PX = [1910, 1541];
let sheetMat, sheetMesh;
function loadTexture(src) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); res(t); }, undefined, rej));
}
function buildSheet(tex) {
  sheetMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  sheetMesh = new THREE.Mesh(new THREE.PlaneGeometry(SHEET_PX[0] / PXM, SHEET_PX[1] / PXM), sheetMat);
  sheetMesh.rotation.x = -Math.PI / 2;
  sheetMesh.position.set((SHEET_PX[0] / 2 - ORIGIN[0]) / PXM, 0.7, (SHEET_PX[1] / 2 - ORIGIN[1]) / PXM);   // on the ground-floor FFL: walls rise out of it
  scene.add(sheetMesh);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.ShadowMaterial({ opacity: 0.14 }));
  g.rotation.x = -Math.PI / 2; g.position.set(CENTER.x, -0.002, CENTER.z); g.receiveShadow = true;
  scene.add(g);
}

/* ---------- model trees (basswood-style), they grow in when the house is complete ---------- */
const trees = new THREE.Group();
function buildTrees() {
  const mats = [0xefe8dc, 0xe7dfd1, 0xf3eee6].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xd9cfbf, roughness: 1 });
  const crown = new THREE.IcosahedronGeometry(1, 2), trunk = new THREE.CylinderGeometry(0.07, 0.1, 1, 6);
  const spots = [[22.2, 1.5, 1.9], [24.2, 6.8, 2.3], [21.6, 11.8, 1.6], [24.6, 15.6, 2.1], [17.5, 21.5, 1.7],
                 [22.5, 20.8, 2.0], [-1.5, -3.2, 1.6], [8.5, -3.4, 2.0], [15.5, -3.0, 1.7], [27.5, 10.5, 1.8]];
  spots.forEach(([x, z, s], i) => {
    const t = new THREE.Group();
    const tr = new THREE.Mesh(trunk, trunkMat); tr.scale.y = 2.4 * s; tr.position.y = 1.2 * s;
    const cr = new THREE.Mesh(crown, mats[i % 3]); cr.scale.setScalar(s * 0.95); cr.position.y = 2.4 * s + s * 0.7;
    tr.castShadow = cr.castShadow = true; cr.receiveShadow = true;
    t.add(tr, cr); t.position.set(x, 0, z); t.userData.d = i / spots.length;
    t.scale.setScalar(0.001);
    trees.add(t);
  });
  trees.visible = false;
  scene.add(trees);
}

/* ---------- the stair/lift core, drawn as a line of light through the exploded levels ---------- */
const core = new THREE.Group();
function buildCore() {
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xd8a868, transparent: true, opacity: 0, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8, 1, true), beamMat);
  beam.geometry.translate(0, 0.5, 0);
  beam.position.set(LIFT.x, 0.6, LIFT.z); beam.renderOrder = 20;
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1, 16, 1, true), beamMat.clone());
  glow.geometry.translate(0, 0.5, 0); glow.position.copy(beam.position); glow.renderOrder = 19;
  core.add(beam, glow);
  core.userData = { beam, glow, rings: [] };
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 48), new THREE.MeshBasicMaterial({ color: 0xd8a868, transparent: true, opacity: 0, depthTest: false, side: THREE.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.renderOrder = 21;
    core.add(ring); core.userData.rings.push(ring);
  }
  scene.add(core);
}

/* ---------- the model ---------- */
const levels = {};
const glowMats = [], glassMats = [];
const POCHE = 'vec3(0.165, 0.141, 0.125)';
function prepareMaterial(m, plane) {
  const n = (m.name || '').toLowerCase();
  const glass = /glass|crystal|clearlens|water|lens/.test(n) && !/frame/.test(n);
  m.clippingPlanes = [plane]; m.clipShadows = true;
  m.envMapIntensity = 0.35;
  if (glass) {
    Object.assign(m, { transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.05, metalness: 0 });
    m.color.setRGB(0.5, 0.36, 0.2); m.emissive = new THREE.Color(1.0, 0.6, 0.28); m.emissiveIntensity = 0;   // windows glow at dusk
    m.userData.glass = true; glassMats.push(m); return;
  }
  const lamp = /lamp|lantern|filament|sconce|led|glow|emitter|opal|diffuser|lens/.test(n);
  if (lamp || (m.emissive && m.emissive.getHex() !== 0)) {
    if (lamp) m.emissive = new THREE.Color(1.0, 0.74, 0.44);
    m.userData.emi = lamp ? 2.2 : (m.emissiveIntensity || 1); glowMats.push(m); m.emissiveIntensity = 0;
  }
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
  return new Promise((res, rej) => loader.load(MODEL, res, e => {
    if (loadNote && e.total) loadNote.textContent = `Loading the residence model · ${Math.round(e.loaded / e.total * 100)}%`;
  }, rej));
}

/* ---------- labels ---------- */
const labels = [];
function addLabel(text, sub, pos, group, node, cls = '') {
  const el = document.createElement('div');
  el.className = 'lbl ' + cls;
  el.innerHTML = `<b>${text}${sub ? `<small>${sub}</small>` : ''}</b>`;
  labelLayer.appendChild(el);
  labels.push({ el, pos, group, node, op: 0, shown: -1 });
}

/* ---------- camera: an opening dolly-zoom rig, then keyframed poses ---------- */
let W = 1, H = 1;
const tmpT = new THREE.Vector3(), tmpP = new THREE.Vector3();
function orbit(theta, phi, view, ty, fov) {
  const aspect = W / H;
  const needH = Math.max(view, (view * (aspect < 1 ? 0.95 : 1.18)) / aspect);
  const r = (needH / 2) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const t = CENTER.clone(); t.y = ty;
  const p = new THREE.Vector3(t.x + r * Math.sin(theta) * Math.sin(phi), t.y + r * Math.cos(theta), t.z + r * Math.sin(theta) * Math.cos(phi));
  return { pos: p, tgt: t, fov };
}
const O = (theta, phi, view, ty, fov = 34) => ({ type: 'orbit', theta, phi, view, ty, fov });
const F = (pos, tgt, fov) => ({ type: 'free', pos: new THREE.Vector3(...pos), tgt: new THREE.Vector3(...tgt), fov });
const KEYS = [
  [0.25, O(0.9, -0.55, 25, 0.8)],
  [0.335, O(0.84, -0.8, 24, 1.0)],
  [0.375, F([11.0, 11.5, 15.5], [11.0, 1.2, 5.0], 40)],          // over the dining room, looking into the living room
  [0.415, F([11.0, 2.55, 10.6], [11.0, 2.7, 2.0], 58)],           // eye level in the dining room
  [0.45, F([11.0, 2.2, 4.8], [11.0, 8.0, 0.9], 66)],              // under the void, looking up two storeys
  [0.468, F([11.0, 3.2, 3.6], [11.0, 10.0, 0.6], 66)],
  [0.53, F([12.5, 22.0, 18.0], [10.0, 4.4, 6.6], 40)],            // risen through the void, over the first floor
  [0.575, O(0.84, -0.95, 27, 4.4)],
  [0.645, O(0.88, -1.1, 29, 6.2)],
  [0.705, O(1.0, -1.18, 31, 5.0)],
  [0.78, O(0.95, -1.38, 44, 11.5)],
  [0.825, O(0.98, -1.52, 44, 11.5)],
  [0.875, F([-29.0, 1.8, 33.0], [8.0, 5.2, 7.5], 30)],            // street level, south-west corner
  [0.95, F([-27.0, 1.8, 30.5], [8.0, 5.3, 7.5], 29.5)],
  [1.0, F([-25.5, 1.85, 29.0], [8.0, 5.4, 7.5], 29)]
];
// free (eye-level) shots are authored for landscape; on portrait screens widen the lens to keep the same width of view
function portraitFov(fov) { const a = W / H; if (a >= 1) return fov; return Math.min(84, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 0.82 / Math.max(a, 0.45)))); }
function resolve(k) { return k.type === 'orbit' ? orbit(k.theta, k.phi, k.view, k.ty, k.fov) : { pos: k.pos, tgt: k.tgt, fov: portraitFov(k.fov) }; }
function rigPose(p) {
  const fov = lerp(2.2, 34, ease(seg(p, 0.15, 0.25)));
  const theta = lerp(0.0001, 0.9, ease(seg(p, 0.16, 0.25)));
  const phi = lerp(0, -0.55, ease(seg(p, 0.16, 0.25)));
  const view = lerp(21, 25, ease(seg(p, 0.16, 0.25)));
  const ty = lerp(0, 0.8, ease(seg(p, 0.18, 0.25)));
  return orbit(theta, phi, view, ty, fov);
}
const drag = { phi: 0, theta: 0 };
function poseAt(p) {
  let pose;
  if (p <= KEYS[0][0]) pose = rigPose(p);
  else {
    let i = KEYS.length - 2;
    for (let k = 0; k < KEYS.length - 1; k++) if (p < KEYS[k + 1][0]) { i = k; break; }
    const [p0, a] = KEYS[i], [p1, b] = KEYS[i + 1];
    const t = sm(seg(p, p0, p1));
    if (a.type === 'orbit' && b.type === 'orbit') {
      pose = orbit(lerp(a.theta, b.theta, t), lerp(a.phi, b.phi, t), lerp(a.view, b.view, t), lerp(a.ty, b.ty, t), lerp(a.fov, b.fov, t));
    } else {
      const A1 = resolve(a), B1 = resolve(b);
      pose = { pos: A1.pos.clone().lerp(B1.pos, t), tgt: A1.tgt.clone().lerp(B1.tgt, t), fov: lerp(A1.fov, B1.fov, t) };
    }
  }
  if (drag.phi || drag.theta) {          // user orbit, applied around the current target
    const off = pose.pos.clone().sub(pose.tgt);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta += drag.phi; sph.phi = clamp(sph.phi + drag.theta, 0.15, 1.5);
    pose.pos = pose.tgt.clone().add(new THREE.Vector3().setFromSpherical(sph));
  }
  return pose;
}
function placeCamera(p) {
  const pose = poseAt(p);
  const aspect = W / H;
  camera.fov = pose.fov; camera.aspect = aspect;
  camera.position.copy(pose.pos);
  tmpP.copy(pose.tgt).sub(pose.pos).normalize();
  if (Math.abs(tmpP.y) > 0.995) camera.up.set(0, 0, -1); else camera.up.set(0, 1, 0);   // straight down: keep north up
  const dist = pose.pos.distanceTo(pose.tgt);
  camera.near = dist > 60 ? Math.max(0.5, dist - 90) : 0.05;
  camera.far = dist + 160;
  camera.lookAt(pose.tgt);
  if (!mobile && aspect > 1.1) camera.setViewOffset(W, H, -W * lerp(0.14, 0.07, seg(p, 0.84, 0.88)), 0, W, H);
  else if (aspect < 0.9) camera.setViewOffset(W, H, 0, H * 0.13, W, H); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

/* ---------- timeline ---------- */
const BOUNDS = [0, 0.06, 0.25, 0.34, 0.465, 0.58, 0.72, 0.84, 0.94, 1.01];
let lastCh = -1, interactive = false;
const sunDir = new THREE.Vector3();
function setSun(az, el) {
  sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  sun.position.copy(CENTER).addScaledVector(sunDir, 60);
}
function update(p) {
  // --- section planes ---
  let h = -0.2;
  h = lerp(h, 1.4, ease(seg(p, 0.06, 0.15)));
  h = lerp(h, INTERIOR_CUT[0], ease(seg(p, 0.17, 0.25)));
  h = lerp(h, 14, ease(seg(p, 0.405, 0.415)));                  // stepping inside: the house closes over you
  h = lerp(h, INTERIOR_CUT[1], ease(seg(p, 0.462, 0.476)));     // the roof opens as you rise through the void
  h = lerp(h, INTERIOR_CUT[2], ease(seg(p, 0.58, 0.62)));
  h = lerp(h, 14, ease(seg(p, 0.65, 0.69)));
  const gap = 4.6 * ease(seg(p, 0.72, 0.78)) * (1 - ease(seg(p, 0.82, 0.86)));
  const reopen = ease(seg(p, 0.72, 0.77)) * (1 - ease(seg(p, 0.82, 0.85)));
  planes.forEach((pl, i) => {
    const off = i * gap;
    pl.constant = p < 0.72 ? h : p > 0.86 ? 1000 : lerp(14 + off, INTERIOR_CUT[i] + off, reopen);
  });
  LEVEL_KEYS.forEach((k, i) => { const n = levels[k]; if (n) n.position.y = n.userData.y0 + i * gap; });

  // --- drawing sheet ---
  if (sheetMat) { const fade = ease(seg(p, 0.21, 0.29)); sheetMat.opacity = 1 - fade; sheetMesh.visible = fade < 0.999; }

  // --- trees grow in once the house is complete ---
  if (modelReady) {
    const tg = seg(p, 0.655, 0.73);
    trees.visible = tg > 0;
    trees.children.forEach(t => { const s = eo(seg(tg, t.userData.d * 0.5, t.userData.d * 0.5 + 0.5)); t.scale.setScalar(Math.max(0.001, s)); });

    // --- the core line ---
    const cv = seg(p, 0.745, 0.79) * (1 - seg(p, 0.815, 0.835));
    const { beam, glow, rings } = core.userData;
    core.visible = cv > 0;
    beam.scale.y = glow.scale.y = Math.max(0.001, (2 * FFL[2] + 2 * gap + 6) * eo(seg(p, 0.745, 0.79)));
    beam.material.opacity = cv * 0.95; glow.material.opacity = cv * 0.18;
    rings.forEach((r, i) => { r.position.set(LIFT.x, FFL[i] + i * gap + 0.05, LIFT.z); const s = eo(seg(p, 0.755 + i * 0.01, 0.78 + i * 0.01)); r.scale.setScalar(0.4 + s * 0.8); r.material.opacity = cv * s * 0.9; });
  }

  // --- light: drawing light → afternoon sun → sun study (morning→evening) → dusk ---
  const lit = ease(seg(p, 0.14, 0.26));
  const study = seg(p, 0.87, 0.95), toMorning = ease(seg(p, 0.84, 0.87));
  let az = -0.7, el = 0.72;
  if (p > 0.84) {
    const sAz = lerp(1.2, -1.35, study), sEl = 0.18 + Math.sin(study * Math.PI) * 0.95;
    az = lerp(az, sAz, toMorning); el = lerp(el, sEl, toMorning);
  }
  setSun(az, el);
  const dusk = ease(seg(p, 0.945, 0.99));
  const low = 1 - clamp(el / 0.9);
  sun.color.setRGB(1, lerp(0.93, 0.78, low), lerp(0.84, 0.58, low));
  sun.intensity = lerp(0, 2.3, lit) * (1 - dusk) * lerp(1, 0.75, low * toMorning);
  const inside = seg(p, 0.40, 0.415) * (1 - seg(p, 0.462, 0.48));
  hemi.intensity = (lerp(1.5, 1.05, lit) + inside * 0.55) * (1 - dusk * 0.78);
  hemi.color.setRGB(1, lerp(0.957, 0.85, dusk), lerp(0.9, 0.98, dusk));
  hemi.groundColor.setRGB(lerp(0.886, 0.95, inside), lerp(0.84, 0.92, inside), lerp(0.77, 0.86, inside));
  scene.background.copy(PAPER).lerp(DUSK, dusk);
  glowMats.forEach(m => m.emissiveIntensity = m.userData.emi * dusk * 3);
  glassMats.forEach(m => { m.emissiveIntensity = dusk * 0.95; m.opacity = lerp(0.2, 0.92, dusk); });
  document.body.classList.toggle('scene-dusk', dusk > 0.5);
  if (sunTimeEl) {
    const mins = p < 0.87 ? 7 * 60 : p < 0.95 ? 7 * 60 + Math.round(study * 690) : 18 * 60 + 30 + Math.round(seg(p, 0.95, 1) * 50);
    sunTimeEl.textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }

  // --- labels ---
  const show = {
    0: seg(p, 0.27, 0.285) * (1 - seg(p, 0.33, 0.345)),
    in: seg(p, 0.418, 0.428) * (1 - seg(p, 0.452, 0.462)),
    1: seg(p, 0.53, 0.545) * (1 - seg(p, 0.57, 0.585)),
    2: seg(p, 0.615, 0.625) * (1 - seg(p, 0.64, 0.652)),
    lvl: seg(p, 0.765, 0.785) * (1 - seg(p, 0.815, 0.83))
  };
  labels.forEach(l => l.op = show[l.group] || 0);

  // --- chapters ---
  const ch = Math.max(0, BOUNDS.findIndex(b => p < b) - 1);
  if (ch !== lastCh) {
    chapters.forEach((c, i) => c.classList.toggle('is-active', i === ch));
    chNum.textContent = String(ch + 1).padStart(2, '0'); lastCh = ch;
  }
  railBars.forEach((b, i) => b.style.setProperty('--f', clamp((p - BOUNDS[i]) / (BOUNDS[i + 1] - BOUNDS[i]))));
  interactive = !coarse && p > 0.955;
  dragHint.classList.toggle('on', interactive && p < 0.998);
  if (!interactive) { drag.phi *= 0.85; drag.theta *= 0.85; if (Math.abs(drag.phi) < 1e-4) drag.phi = 0; if (Math.abs(drag.theta) < 1e-4) drag.theta = 0; }
}
const v3 = new THREE.Vector3();
function placeLabels() {
  for (const l of labels) {
    if (!l.op) { if (l.shown !== 0) { l.el.style.opacity = 0; l.shown = 0; } continue; }
    v3.copy(l.pos);
    if (l.node) v3.y += l.node.position.y - l.node.userData.y0;
    v3.project(camera);
    const isLevel = l.group === 'lvl';
    const x = isLevel ? W - (mobile ? 16 : 150) : (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * H;
    l.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)${isLevel ? ' translateX(-100%)' : ''}`;
    const o = v3.z < 1 && v3.z > -1 ? l.op : 0;
    if (o !== l.shown) { l.el.style.opacity = o; l.shown = o; }
  }
}

/* ---------- drag to orbit (final chapter, desktop) ---------- */
let dragging = null;
canvas.addEventListener('pointerdown', e => { if (!interactive) return; dragging = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  drag.phi -= (e.clientX - dragging[0]) * 0.005;
  drag.theta = clamp(drag.theta - (e.clientY - dragging[1]) * 0.003, -0.6, 0.5);
  dragging = [e.clientX, e.clientY]; dirty = true;
});
canvas.addEventListener('pointerup', () => dragging = null);
canvas.addEventListener('pointercancel', () => dragging = null);

/* ---------- loop: render only when something changed; adapt resolution to the GPU ---------- */
let visible = false, ready = false, modelReady = false, smoothP = 0, lastKey = '', dirty = true, lastT = performance.now(), frameNo = 0;
const frameTimes = [];
new IntersectionObserver(es => { visible = es[0].isIntersecting; dirty = true; }, { rootMargin: '200px' }).observe(section);
function resize() { W = canvas.clientWidth; H = canvas.clientHeight; renderer.setSize(W, H, false); dirty = true; }
addEventListener('resize', resize);
let secTop = 0, secSpan = 1;
function measure() { const r = section.getBoundingClientRect(); secTop = r.top + scrollY; secSpan = section.offsetHeight - innerHeight; }
addEventListener('resize', measure); addEventListener('load', measure);
const cpuTimes = [];
function adapt(dt, cpu) {
  frameTimes.push(dt); cpuTimes.push(cpu); if (frameTimes.length < 40) return;
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const avgCpu = cpuTimes.reduce((a, b) => a + b, 0) / cpuTimes.length; frameTimes.length = cpuTimes.length = 0;
  let next = dpr;
  // only trade resolution when the GPU is the bottleneck (CPU-bound frames don't get faster at lower DPR)
  if (avg > 26 && avgCpu < avg * 0.5) next = Math.max(1, dpr - 0.25); else if (avg < 13 && dpr < DPR_MAX) next = Math.min(DPR_MAX, dpr + 0.25);
  if (next !== dpr) { dpr = next; renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); dirty = true; }
}
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(100, t - lastT); lastT = t;
  if (!visible || !ready) return;
  const target = window.__forceP != null ? window.__forceP : clamp((scrollY - secTop) / secSpan);
  smoothP += (target - smoothP) * (1 - Math.exp(-dt / 70));   // light easing on top of Lenis, without the lag
  if (Math.abs(target - smoothP) < 0.00005) smoothP = target;
  const key = smoothP.toFixed(5);
  if (key === lastKey && !dirty) return;
  const busy = key !== lastKey; lastKey = key; dirty = false;
  const c0 = performance.now();
  update(smoothP);
  placeCamera(smoothP);
  if (lowPower) { renderer.shadowMap.needsUpdate = (frameNo++ % 2 === 0) || !busy; }
  renderer.render(scene, camera);
  placeLabels();
  if (busy) adapt(dt, performance.now() - c0);
}
function fail() {
  document.querySelector('.scene-fallback').hidden = false;
  canvas.style.display = 'none';
  if (loadNote) loadNote.hidden = true;
}

/* ---------- boot ---------- */
(async () => {
  try {
    measure();
    buildSheet(await loadTexture(lowPower ? 'drawing-ground-lite.jpg' : 'drawing-ground.jpg'));
    resize(); ready = true;            // the drawing shows while the model streams in
    requestAnimationFrame(loop);
    const [gltf, rooms] = await Promise.all([loadModel(), fetch('rooms.json').then(r => r.json())]);
    const root = gltf.scene;
    root.rotation.y = -Math.PI / 2;    // model x/y → drawing rows/columns
    LEVEL_KEYS.forEach((n, i) => {
      const node = root.getObjectByName(n); if (!node) return;
      levels[n] = node; node.userData.y0 = node.position.y;
      node.traverse(o => {
        if (!o.isMesh) return;
        const mats = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const c = m.clone(); prepareMaterial(c, planes[i]); return c; });
        o.material = Array.isArray(o.material) ? mats : mats[0];
        const isGlass = mats.every(m => m.userData.glass);
        o.castShadow = !isGlass; o.receiveShadow = !isGlass;
      });
    });
    scene.add(root);
    buildTrees(); buildCore();
    rooms.forEach(r => {
      const t = ROOM_TEXT[r.id]; if (!t) return;
      const lv = r.id[0] === 'G' ? 0 : r.id[0] === 'F' ? 1 : 2;
      addLabel(t[0], t[1], new THREE.Vector3(r.by, r.bz + 0.4, r.bx), lv, levels[LEVEL_KEYS[lv]]);
    });
    addLabel('Double-height living', '23′ × 19′', new THREE.Vector3(11.2, 2.9, 2.6), 'in', levels.L0);
    addLabel('Dining', '23′ × 15′3″', new THREE.Vector3(9.3, 1.7, 7.9), 'in', levels.L0);
    FFL.forEach((y, i) => addLabel(`<span>Level 0${i}</span>${['Ground floor', 'First floor', 'Second floor'][i]}`, '', new THREE.Vector3(CENTER.x, y + 1.5, CENTER.z), 'lvl', levels[LEVEL_KEYS[i]], 'level'));
    // warm up every shader / shadow variant along the whole timeline so the first scroll never hitches
    modelReady = true;
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera).catch(() => {}); else renderer.compile(scene, camera);
    for (const wp of [0.3, 0.43, 0.6, 0.7, 0.75, 0.8, 0.87, 0.92, 0.99, 0]) {
      update(wp); placeCamera(wp); renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);
      await new Promise(r => setTimeout(r, 0));
    }
    if (loadNote) loadNote.hidden = true;
    modelReady = true; lastKey = ''; dirty = true;
    window.__architechScene = { update, renderer, camera, levels, scene, THREE, get dpr() { return dpr; } };
  } catch (err) {
    console.error(err);
    fail();
  }
})();

