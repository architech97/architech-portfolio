/* HESA — hero: the day render dissolves into dusk, then the lights come on one by one.
   A single full-screen shader over the matching day/night renders: louvre-blind intro reveal,
   a dusk front that darkens the sky first, lamps that switch on in a scattered sequence with bloom,
   pointer parallax and film grain. Falls back to the plain images if WebGL is unavailable. */
import * as THREE from 'three';

const A = '../hesa-residence/assets/';
const hero = document.getElementById('hero');
const canvas = document.getElementById('hero-gl');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tDay, tNight;
uniform vec2 uRes, uImg, uMouse;
uniform float uDusk, uLights, uReveal, uTime, uZoom;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
vec2 cover(vec2 uv){
  float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y;
  vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
  return (uv - 0.5) * s / uZoom + 0.5;
}
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
  vec2 uv = vUv;
  // louvre-blind reveal (staggered vertical slats)
  float slat = floor(uv.x * 14.0);
  float rv = smoothstep(slat / 14.0 * 0.55, slat / 14.0 * 0.55 + 0.45, uReveal);
  float slatEdge = step(fract(uv.x * 14.0), rv * 1.001);
  vec2 par = uMouse * vec2(0.012, 0.008) * (0.4 + uv.y);
  vec2 iuv = cover(uv) + par;
  vec3 day = texture2D(tDay, iuv).rgb;
  vec3 night = texture2D(tNight, iuv).rgb;
  // dusk front: the sky (top) goes first, a soft noisy edge sweeps down
  float n = noise(uv * 3.0 + uTime * 0.03);
  float k = clamp(uDusk * 1.7 - 0.35 + (uv.y - 0.5) * 0.7 + (n - 0.5) * 0.35, 0.0, 1.0);
  vec3 nightOff = night * vec3(0.42, 0.48, 0.66);                       // blue hour, lamps still off
  vec3 col = mix(day, nightOff, smoothstep(0.0, 1.0, k));
  // lamps: bright pixels of the night render switch on in a scattered order
  float hl = smoothstep(0.42, 0.85, lum(night)) * smoothstep(0.02, 0.25, lum(night) - lum(day) * 0.55);
  float cell = noise(iuv * vec2(7.0, 4.5)) * 0.75 + noise(iuv * 23.0) * 0.25;   // soft, organic switch-on order
  float on = smoothstep(cell * 0.75 - 0.05, cell * 0.75 + 0.2, uLights);
  vec3 lit = mix(col, night, hl * on);
  // bloom from the blurred mip of the night render
  vec3 blur = texture2D(tNight, iuv, 5.0).rgb;
  float bh = smoothstep(0.35, 0.8, lum(blur));
  lit += vec3(1.0, 0.72, 0.42) * bh * on * uLights * 0.35;
  col = mix(col, lit, step(0.001, uLights));
  // vignette + grain
  float v = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(1.2, 1.0)));
  col *= mix(0.78, 1.0, v);
  col += (hash(uv * uRes + fract(uTime) * 91.0) - 0.5) * 0.035;
  col = mix(vec3(0.09, 0.075, 0.066), col, slatEdge);
  gl_FragColor = vec4(col, 1.0);
}`;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
catch (e) { canvas.remove(); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.5));
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // the shader works in display space, like the JPEGs
const scene = new THREE.Scene(), cam = new THREE.Camera();
const uniforms = {
  tDay: { value: null }, tNight: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uImg: { value: new THREE.Vector2(1264, 848) },
  uMouse: { value: new THREE.Vector2() }, uDusk: { value: 0 }, uLights: { value: 0 }, uReveal: { value: reduce ? 1 : 0 }, uTime: { value: 0 }, uZoom: { value: 1.12 }
};
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, depthTest: false })));

const loader = new THREE.TextureLoader();
const load = src => new Promise((res, rej) => loader.load(src, t => { t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; res(t); }, undefined, rej));

let visible = true, top = 0, span = 1;
const mouse = new THREE.Vector2(), mouseT = new THREE.Vector2();
function measure() { top = hero.offsetTop; span = hero.offsetHeight - innerHeight; resize(); }
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); }
addEventListener('resize', measure);
new IntersectionObserver(es => visible = es[0].isIntersecting).observe(hero);
if (!coarse) addEventListener('pointermove', e => mouseT.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)));

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
let last = performance.now();
function loop(t) {
  requestAnimationFrame(loop);
  if (!visible) return;
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  const p = clamp((scrollY - top) / span);
  uniforms.uDusk.value = seg(p, 0.08, 0.6);
  uniforms.uLights.value = seg(p, 0.32, 0.82);
  uniforms.uZoom.value = 1.12 - 0.08 * p;
  uniforms.uTime.value += reduce ? 0 : dt;
  mouse.lerp(mouseT, 1 - Math.exp(-dt * 4));
  uniforms.uMouse.value.copy(mouse);
  window.__heroP = p;
  renderer.render(scene, cam);
}

(async () => {
  try {
    const [d, n] = await Promise.all([load(A + 'asset-025.jpg'), load(A + 'asset-022.jpg')]);
    uniforms.tDay.value = d; uniforms.tNight.value = n;
    measure();
    hero.classList.add('has-gl');
    requestAnimationFrame(loop);
    // intro reveal is triggered once the loader lifts
    const go = () => {
      if (reduce) return;
      const s = performance.now();
      const step = t => { const k = Math.min(1, (t - s) / 1600); uniforms.uReveal.value = 1 - Math.pow(1 - k, 3); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    if (document.body.classList.contains('is-loading')) addEventListener('hesa:ready', go, { once: true }); else go();
  } catch (e) { console.error(e); canvas.remove(); }
})();
