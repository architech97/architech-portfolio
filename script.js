/* ============================================================
   ArchiTECH Portfolio — interaction engine
   Boot cinematic · Web Audio (opt-in) · true-3D BIM scenes
   Reveals · counters · scrollspy. No dependencies, local-only.
   ============================================================ */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => motionQuery.matches;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  /* ------------------------------------------------------------
     Audio engine — nothing plays until the visitor opts in.
     All sound is synthesized; there are no audio files.
     ------------------------------------------------------------ */
  const audio = { ctx: null, master: null, sfx: null, ambience: null, enabled: false, lastHover: 0 };
  const AudioCtor = window.AudioContext || window.webkitAudioContext;

  function ensureAudio() {
    if (!AudioCtor) return null;
    if (!audio.ctx) {
      audio.ctx = new AudioCtor();
      // Master chain: pad bus + sfx bus → soft limiter feel
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.62;
      audio.sfx = audio.ctx.createGain();
      audio.sfx.gain.value = 0.72;
      const soft = audio.ctx.createDynamicsCompressor();
      soft.threshold.value = -18;
      soft.knee.value = 18;
      soft.ratio.value = 3.5;
      soft.attack.value = 0.008;
      soft.release.value = 0.22;
      audio.sfx.connect(soft);
      audio.master.connect(soft);
      soft.connect(audio.ctx.destination);
    }
    return audio.ctx;
  }

  function startAmbience() {
    const ctx = ensureAudio();
    if (!ctx || audio.ambience) return;
    const bed = ctx.createGain();
    bed.gain.value = 0;
    bed.connect(audio.master);

    // Warm cinematic pad — A-minor family, audible mid band
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 520;
    lowpass.Q.value = 0.7;
    lowpass.connect(bed);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 70;
    highpass.connect(lowpass);

    const nodes = [];
    const voices = [];
    const voice = (freq, gainVal) => {
      const pair = [];
      [0, 0.4, -0.35].forEach((detune, di) => {
        const osc = ctx.createOscillator();
        osc.type = di === 2 ? 'triangle' : 'sine';
        osc.frequency.value = freq + detune;
        const g = ctx.createGain();
        g.gain.value = gainVal * (di === 2 ? 0.16 : 1);
        osc.connect(g);
        g.connect(highpass);
        osc.start();
        nodes.push(osc);
        pair.push({ osc, detune, base: gainVal });
      });
      voices.push(pair);
    };
    voice(110, 0.028);     // root
    voice(164.81, 0.02);   // fifth
    voice(220, 0.011);     // octave
    voice(329.63, 0.006);  // airy third (E)

    // Am → F → C → G — felt as colour shifts, not steps
    const CHORDS = [
      [110.00, 164.81, 220.00, 329.63],
      [87.31, 174.61, 220.00, 349.23],
      [130.81, 196.00, 261.63, 329.63],
      [98.00, 146.83, 196.00, 293.66],
    ];
    let chordIdx = 0;
    const nextChord = () => {
      chordIdx = (chordIdx + 1) % CHORDS.length;
      const chord = CHORDS[chordIdx];
      voices.forEach((pair, i) => {
        pair.forEach(({ osc, detune }) => {
          osc.frequency.linearRampToValueAtTime(chord[i] + detune, ctx.currentTime + 3.5);
        });
      });
    };
    const chordTimer = window.setInterval(nextChord, 12000);

    // Slow filter breath
    const sweep = ctx.createOscillator();
    sweep.frequency.value = 0.028;
    const sweepGain = ctx.createGain();
    sweepGain.gain.value = 110;
    sweep.connect(sweepGain);
    sweepGain.connect(lowpass.frequency);
    sweep.start();
    nodes.push(sweep);

    // Soft noise bed
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 600;
    band.Q.value = 4;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.0035;
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(bed);
    noise.start();
    nodes.push(noise);

    // Rare, soft chimes — felt more than heard
    const sparkleTimer = window.setInterval(() => {
      if (!audio.enabled || !audio.ctx || Math.random() < 0.4) return;
      const f = 900 + Math.random() * 800;
      blip(f, 0.35 + Math.random() * 0.25, 0.0035 + Math.random() * 0.0025, 'sine', f * 1.25);
    }, 9000);

    bed.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 3.5);
    audio.ambience = {
      bed,
      stop: () => {
        window.clearInterval(chordTimer);
        window.clearInterval(sparkleTimer);
        nodes.forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } });
      },
    };
  }

  function stopAmbience() {
    if (!audio.ambience || !audio.ctx) return;
    const { bed, stop } = audio.ambience;
    bed.gain.linearRampToValueAtTime(0, audio.ctx.currentTime + 0.45);
    window.setTimeout(stop, 500);
    audio.ambience = null;
  }

  function blip(freq, dur, vol, type, glideTo) {
    if (!audio.enabled || !audio.ctx || !audio.sfx) return;
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(4200, freq * 3.2);
    osc.type = type || 'sine';
    osc.frequency.value = Math.max(40, freq);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, glideTo), ctx.currentTime + Math.max(0.02, dur));
    }
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.sfx);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.04);
  }

  function hoverTone() {
    const now = performance.now();
    if (now - audio.lastHover < 45) return; // throttle hover spam
    audio.lastHover = now;
    blip(720 + Math.random() * 80, 0.05, 0.02, 'sine', 480);
  }

  function clickTone() {
    blip(480, 0.08, 0.06, 'triangle', 240);
    blip(960, 0.06, 0.028, 'sine', 640);
  }

  function gateTone(i) {
    blip(520 + i * 55, 0.1, 0.045, 'sine', 780 + i * 40);
  }

  const soundToggles = Array.from(document.querySelectorAll('[data-sound-toggle]'));

  function setSound(on) {
    const ctx = ensureAudio();
    if (!ctx) return;
    audio.enabled = on;
    document.body.classList.toggle('sound-on', on);
    soundToggles.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Mute sound' : 'Enable sound');
      const label = btn.querySelector('[data-sound-label]');
      if (label) label.textContent = on ? 'Sound on' : 'Enable sound';
    });
    if (on) {
      if (ctx.state === 'suspended') ctx.resume();
      startAmbience();
      blip(440, 0.12, 0.06, 'sine', 880);
      blip(660, 0.16, 0.035, 'sine', 990);
    } else {
      stopAmbience();
    }
  }

  if (!AudioCtor) {
    soundToggles.forEach((btn) => { btn.hidden = true; });
  } else {
    soundToggles.forEach((btn) => {
      btn.addEventListener('click', () => setSound(!audio.enabled));
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (!audio.ctx || !audio.enabled) return;
    if (document.hidden) audio.ctx.suspend();
    else audio.ctx.resume();
  });

  // Layered interaction sounds — hover soft, click decisive
  const HOVER_SEL = '.js-audio-hit, .card, .stat, .stat.primary, .vision-points li, .gate, .pl-stage, .marquee-track span, .tb-cell, .proof-card, .case-cinema-main, .btn, .say-list li';
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll(HOVER_SEL).forEach((el) => {
    if (canHover) el.addEventListener('pointerenter', hoverTone);
    el.addEventListener('click', (event) => {
      const owner = event.target.closest(HOVER_SEL);
      if (owner !== el) return;
      if (el.matches('[data-sound-toggle], [data-nav-toggle], .gate, .say-list li')) return;
      clickTone();
    });
  });

  /* ------------------------------------------------------------
     Mobile navigation drawer
     ------------------------------------------------------------ */
  function initMobileNav() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const nav = document.getElementById('site-nav');
    const scrim = document.querySelector('[data-nav-scrim]');
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      document.documentElement.classList.toggle('nav-lock', open);
      document.body.classList.toggle('nav-open', open);
      document.body.classList.toggle('nav-lock', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      if (scrim) {
        if (open) scrim.removeAttribute('hidden');
        else scrim.setAttribute('hidden', '');
      }
    };

    toggle.addEventListener('click', () => {
      setOpen(!document.body.classList.contains('nav-open'));
    });
    if (scrim) scrim.addEventListener('click', () => setOpen(false));
    nav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setOpen(false));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) setOpen(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 920 && document.body.classList.contains('nav-open')) setOpen(false);
    });
  }
  initMobileNav();

  /* ------------------------------------------------------------
     3D scene engine — shared geometry and solid models.
     Lines live in model space (y up, ground at y=0); each frame
     they are rotated, perspective-projected, and depth-faded.
     ------------------------------------------------------------ */
  const LAYERS = {
    grid:      { rgb: '70,160,230',  alpha: 0.16, width: 0.6 },
    ring:      { rgb: '90,190,255',  alpha: 0.24, width: 0.75 },
    ghost:     { rgb: '100,185,240', alpha: 0.18, width: 0.8 },
    skin:      { rgb: '110,210,255', alpha: 0.38, width: 0.7 },
    floor:     { rgb: '60,175,255',  alpha: 0.58, width: 1.0 },
    structure: { rgb: '170,230,255', alpha: 0.92, width: 1.4 },
    accent:    { rgb: '255,180,84',  alpha: 0.7, width: 1.15 },
  };
  const SOLID_MATERIALS = {
    base:      { rgb: '22,42,64', alpha: 0.98, edge: '92,146,188' },
    structure: { rgb: '156,190,214', alpha: 0.92, edge: '208,232,246' },
    slab:      { rgb: '86,126,154', alpha: 0.96, edge: '174,214,238' },
    glass:     { rgb: '35,112,164', alpha: 0.66, edge: '92,190,236' },
    core:      { rgb: '190,108,48', alpha: 0.90, edge: '255,184,92' },
  };
  const FLOOR_H = 7.2;

  function solidPrism(solids, cx, cz, w, d, y0, y1, material) {
    solids.push({ cx, cz, w, d, y0, y1, material });
  }

  function box(lines, cx, cz, w, d, y0, y1, layer, floorsEvery) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    corners.forEach(([x, z]) => lines.push({ a: [x, y0, z], b: [x, y1, z], layer }));
    const rect = (y, ly) => {
      for (let i = 0; i < 4; i++) {
        const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
        lines.push({ a: [ax, y, az], b: [bx, y, bz], layer: ly });
      }
    };
    rect(y0, layer);
    rect(y1, layer);
    if (floorsEvery) {
      for (let y = y0 + floorsEvery; y < y1; y += floorsEvery) rect(y, 'floor');
    }
  }

  function groundGrid(lines, ext, step) {
    for (let i = -ext; i <= ext; i += step) {
      lines.push({ a: [i, 0, -ext], b: [i, 0, ext], layer: 'grid' });
      lines.push({ a: [-ext, 0, i], b: [ext, 0, i], layer: 'grid' });
    }
    // Concentric site rings — plaza / setout circles
    for (const r of [40, 70, 105, 140]) {
      const segs = 48;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        lines.push({
          a: [Math.cos(a0) * r, 0, Math.sin(a0) * r],
          b: [Math.cos(a1) * r, 0, Math.sin(a1) * r],
          layer: 'ring',
        });
      }
    }
  }

  function buildDemoTower() {
    const lines = [], solids = [], h = 176;
    groundGrid(lines, 150, 24);
    solidPrism(solids, 0, 0, 92, 70, 0, 8, 'base');
    solidPrism(solids, 0, 0, 18, 18, 8, 162, 'core');
    [
      [0, 0, 58, 44, 8, 54],
      [-4, 2, 50, 38, 54, 96],
      [4, -2, 42, 32, 96, 132],
      [0, 0, 30, 24, 132, 158],
    ].forEach((mass) => solidPrism(solids, ...mass, 'glass'));
    for (let y = 16; y <= 158; y += 8) {
      const scale = y < 54 ? 1 : y < 96 ? 0.86 : y < 132 ? 0.72 : 0.52;
      solidPrism(solids, 0, 0, 62 * scale, 48 * scale, y, y + 1.2, 'slab');
    }
    solidPrism(solids, 0, 0, 22, 18, 158, 170, 'structure');
    return { lines, solids, h, ring: 54 };
  }
  function buildDemoBuilding() {
    const lines = [], solids = [], h = 78;
    groundGrid(lines, 145, 24);
    solidPrism(solids, 0, 0, 108, 74, 0, 5, 'base');
    solidPrism(solids, -24, 0, 15, 17, 5, 70, 'core');
    solidPrism(solids, 27, 8, 13, 15, 5, 62, 'core');
    solidPrism(solids, -13, 0, 70, 28, 6, 62, 'glass');
    solidPrism(solids, 28, 13, 44, 24, 6, 54, 'glass');
    solidPrism(solids, 18, -19, 50, 22, 6, 46, 'glass');
    for (let level = 0; level < 7; level++) {
      const y = 6 + level * 8;
      solidPrism(solids, -8, 0, 88, 44, y, y + 1.3, 'slab');
    }
    solidPrism(solids, -12, 0, 58, 34, 62, 70, 'structure');
    solidPrism(solids, 18, 2, 20, 18, 54, 66, 'structure');
    return { lines, solids, h, ring: 62 };
  }
  // Parametric twist tower — diagrid + rotating elliptical plates (film scene)
  function buildTwist() {
    const lines = [];
    const h = 168;
    groundGrid(lines, 140, 24);

    // Plaza base
    box(lines, 0, 0, 70, 50, 0, 8, 'structure', 8);

    const NP = 16, FLOORS = 20, TWIST = Math.PI * 0.85;
    const A0 = 34, B0 = 20;
    let prev = null;
    for (let k = 0; k <= FLOORS; k++) {
      const y = 8 + k * FLOOR_H;
      const t = k / FLOORS;
      const rot = t * TWIST;
      // Soft belly then taper (more architectural than linear)
      const scale = 1 - 0.08 * Math.sin(t * Math.PI) - 0.32 * t * t;
      const a = A0 * scale, b = B0 * scale;
      const ring = [];
      for (let i = 0; i < NP; i++) {
        const ang = (i / NP) * Math.PI * 2;
        const x0 = Math.cos(ang) * a, z0 = Math.sin(ang) * b;
        ring.push([
          x0 * Math.cos(rot) - z0 * Math.sin(rot),
          y,
          x0 * Math.sin(rot) + z0 * Math.cos(rot),
        ]);
      }
      for (let i = 0; i < NP; i++) {
        lines.push({ a: ring[i], b: ring[(i + 1) % NP], layer: k % 2 === 0 ? 'floor' : 'skin' });
        if (prev) {
          // Verticals
          lines.push({ a: prev[i], b: ring[i], layer: 'structure' });
          // Diagrid diagonals
          lines.push({ a: prev[i], b: ring[(i + 1) % NP], layer: 'skin' });
        }
      }
      prev = ring;
    }
    // Crown spire
    const topY = 8 + FLOORS * FLOOR_H;
    lines.push({ a: [0, topY, 0], b: [0, h, 0], layer: 'structure' });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const r = 8;
      lines.push({
        a: [Math.cos(ang) * r, topY, Math.sin(ang) * r],
        b: [0, topY + 18, 0],
        layer: 'accent',
      });
    }

    box(lines, -98, -48, 28, 24, 0, FLOOR_H * 6, 'ghost', FLOOR_H * 2);
    box(lines, 90, 54, 24, 28, 0, FLOOR_H * 5, 'ghost', FLOOR_H * 2);
    box(lines, 70, -80, 20, 18, 0, FLOOR_H * 4, 'ghost', FLOOR_H * 2);

    return { lines, h, ring: 42 };
  }

  const DEMO_TOWER = buildDemoTower();
  const DEMO_BUILDING = buildDemoBuilding();
  const TWIST_TOWER = buildTwist();

  // Floating data motes
  function makeMotes(count, h) {
    const motes = [];
    for (let i = 0; i < count; i++) {
      motes.push({
        r: 30 + Math.random() * 110,
        th: Math.random() * Math.PI * 2,
        y: Math.random() * h,
        speed: 0.9 + Math.random() * 1.6,
      });
    }
    return motes;
  }

  function createScene(canvas, opts) {
    if (!canvas || !canvas.getContext) return null;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return null;

    const D = 430;                     // camera distance in model units
    const MODEL = opts.model;
    const LINES = MODEL.lines;
    const SOLIDS = MODEL.solids || [];
    const MH = MODEL.h;
    const motes = makeMotes(opts.motes || 0, MH);
    const state = {
      width: 1, height: 1, dpr: 1,
      yaw: opts.yaw ?? 0.7, pitch: opts.pitch ?? 0.3,
      yawDrift: opts.drift ?? 0.05,
      pointerX: 0, pointerY: 0,
      dragging: false, dragVel: 0,
      running: false, frame: 0, visible: true,
      lastT: 0, lastDraw: 0, scanY: 0,
    };

    function project(x, y, z, f, cx, cy) {
      const cy1 = Math.cos(state.yaw), sy1 = Math.sin(state.yaw);
      const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
      // rotate about Y
      const rx = x * cy1 - z * sy1;
      const rz = x * sy1 + z * cy1;
      // pivot vertical centre so the model tilts around its middle
      const my = y - MH * 0.46;
      // rotate about X (pitch)
      const ry = my * cp - rz * sp;
      const rz2 = my * sp + rz * cp;
      const depth = rz2 + D;
      if (depth < 40) return null;
      const s = f / depth;
      return { x: cx + rx * s, y: cy - ry * s, d: clamp(1.25 - depth / (D * 1.55), 0.08, 1) };
    }

    function drawSolids(f, cx, cy, buildCut) {
      const faces = [];
      for (const solid of SOLIDS) {
        if (solid.y0 >= buildCut) continue;
        const y1 = Math.min(solid.y1, buildCut);
        if (y1 <= solid.y0 + 0.1) continue;
        const x0 = solid.cx - solid.w / 2, x1 = solid.cx + solid.w / 2;
        const z0 = solid.cz - solid.d / 2, z1 = solid.cz + solid.d / 2;
        const vertices = [
          [x0, solid.y0, z0], [x1, solid.y0, z0], [x1, solid.y0, z1], [x0, solid.y0, z1],
          [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
        ];
        const definitions = [[4,5,6,7], [0,1,5,4], [1,2,6,5], [2,3,7,6], [3,0,4,7]];
        definitions.forEach((definition, faceIndex) => {
          const points = definition.map((index) => project(...vertices[index], f, cx, cy));
          if (points.some((point) => !point)) return;
          faces.push({
            points,
            depth: points.reduce((sum, point) => sum + point.d, 0) / points.length,
            material: SOLID_MATERIALS[solid.material] || SOLID_MATERIALS.glass,
            shade: [1.12, 0.82, 0.68, 0.92, 0.74][faceIndex],
          });
        });
      }
      faces.sort((a, b) => a.depth - b.depth);
      for (const face of faces) {
        ctx2d.beginPath();
        face.points.forEach((point, index) => index ? ctx2d.lineTo(point.x, point.y) : ctx2d.moveTo(point.x, point.y));
        ctx2d.closePath();
        ctx2d.fillStyle = `rgba(${face.material.rgb},${Math.min(1, face.material.alpha * face.shade)})`;
        ctx2d.fill();
        ctx2d.strokeStyle = `rgba(${face.material.edge},${Math.min(0.72, 0.32 + face.depth * 0.25)})`;
        ctx2d.lineWidth = 0.8;
        ctx2d.stroke();
      }
    }

    function drawStudioWorld(w, h, cx, cy, f) {
      ctx2d.fillStyle = '#05080d';
      ctx2d.fillRect(0, 0, w, h);
      const light = ctx2d.createRadialGradient(cx, cy * 0.72, 20, cx, cy, Math.max(w, h) * 0.58);
      light.addColorStop(0, 'rgba(28,70,104,.34)');
      light.addColorStop(0.42, 'rgba(13,35,56,.16)');
      light.addColorStop(1, 'rgba(5,8,13,0)');
      ctx2d.fillStyle = light;
      ctx2d.fillRect(0, 0, w, h);
      ctx2d.strokeStyle = 'rgba(82,148,190,.12)';
      ctx2d.lineWidth = 0.7;
      for (let grid = -144; grid <= 144; grid += 24) {
        for (const endpoints of [[[grid,0,-144],[grid,0,144]], [[-144,0,grid],[144,0,grid]]]) {
          const a = project(...endpoints[0], f, cx, cy);
          const b = project(...endpoints[1], f, cx, cy);
          if (!a || !b) continue;
          ctx2d.beginPath(); ctx2d.moveTo(a.x, a.y); ctx2d.lineTo(b.x, b.y); ctx2d.stroke();
        }
      }
      const origin = project(0, 0, 0, f, cx, cy);
      if (origin) {
        ctx2d.fillStyle = 'rgba(0,0,0,.34)';
        ctx2d.beginPath();
        ctx2d.ellipse(origin.x, origin.y + 10, Math.min(w, h) * .26, Math.min(w, h) * .07, 0, 0, Math.PI * 2);
        ctx2d.fill();
      }
    }

    function drawCinematicWorld(w, h, cx, cy, f, time) {
      // Opaque cinematic void — the 3D scene owns the background
      const sky = ctx2d.createLinearGradient(0, 0, 0, h);
      if (opts.film) {
        sky.addColorStop(0, '#040814');
        sky.addColorStop(0.45, '#071428');
        sky.addColorStop(1, '#03060f');
      } else if (opts.orbit) {
        sky.addColorStop(0, '#030712');
        sky.addColorStop(0.42, '#081830');
        sky.addColorStop(1, '#02050c');
      } else {
        sky.addColorStop(0, '#040916');
        sky.addColorStop(0.4, '#0a1a34');
        sky.addColorStop(1, '#03060e');
      }
      ctx2d.fillStyle = sky;
      ctx2d.fillRect(0, 0, w, h);

      // Volumetric bloom behind the tower (tracks yaw slightly)
      const bloomX = cx + Math.sin(state.yaw) * w * 0.04;
      const bloom = ctx2d.createRadialGradient(bloomX, cy * 0.72, 10, bloomX, cy, Math.max(w, h) * 0.55);
      bloom.addColorStop(0, 'rgba(40, 110, 210, 0.28)');
      bloom.addColorStop(0.35, 'rgba(20, 60, 130, 0.12)');
      bloom.addColorStop(1, 'rgba(4, 8, 18, 0)');
      ctx2d.fillStyle = bloom;
      ctx2d.fillRect(0, 0, w, h);

      // Star / data-dust field (parallax-lite)
      const seed = Math.floor(state.yaw * 12);
      for (let i = 0; i < 48; i++) {
        const px = ((i * 97 + seed * 13) % w + w) % w;
        const py = ((i * 53 + seed * 7) % Math.floor(h * 0.55) + h) % Math.floor(h * 0.55);
        const s = 0.6 + (i % 3) * 0.4;
        ctx2d.fillStyle = `rgba(160, 210, 255,${(0.12 + (i % 5) * 0.05).toFixed(3)})`;
        ctx2d.fillRect(px, py, s, s);
      }

      // Ground disc under the model
      const origin = project(0, 0, 0, f, cx, cy);
      if (origin) {
        const groundR = Math.min(w, h) * 0.55;
        const g = ctx2d.createRadialGradient(origin.x, origin.y, 2, origin.x, origin.y, groundR);
        g.addColorStop(0, 'rgba(47, 155, 255, 0.22)');
        g.addColorStop(0.25, 'rgba(30, 90, 180, 0.08)');
        g.addColorStop(0.7, 'rgba(8, 18, 40, 0.35)');
        g.addColorStop(1, 'rgba(2, 4, 12, 0)');
        ctx2d.fillStyle = g;
        ctx2d.beginPath();
        ctx2d.ellipse(origin.x, origin.y, groundR, groundR * 0.28, 0, 0, Math.PI * 2);
        ctx2d.fill();
      }

      // Horizon fog band
      const hzY = origin ? origin.y : h * 0.72;
      const hz = ctx2d.createLinearGradient(0, hzY - h * 0.15, 0, h);
      hz.addColorStop(0, 'rgba(4, 10, 22, 0)');
      hz.addColorStop(0.35, 'rgba(6, 16, 36, 0.45)');
      hz.addColorStop(1, 'rgba(2, 5, 12, 0.92)');
      ctx2d.fillStyle = hz;
      ctx2d.fillRect(0, Math.max(0, hzY - h * 0.12), w, h);

      // Ambient ground energy ring
      if (origin) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.0018);
        const pr = 40 + pulse * 90;
        const ring = [];
        for (let i = 0; i < 36; i++) {
          const ang = (i / 36) * Math.PI * 2;
          const p = project(Math.cos(ang) * pr, 0.2, Math.sin(ang) * pr, f, cx, cy);
          if (p) ring.push(p);
        }
        if (ring.length > 10) {
          ctx2d.beginPath();
          ring.forEach((p, i) => (i ? ctx2d.lineTo(p.x, p.y) : ctx2d.moveTo(p.x, p.y)));
          ctx2d.closePath();
          ctx2d.strokeStyle = `rgba(82, 188, 255,${(0.12 + pulse * 0.12).toFixed(3)})`;
          ctx2d.lineWidth = 1;
          ctx2d.stroke();
        }
      }
    }

    function draw(time) {
      const { width: w, height: h } = state;
      ctx2d.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      ctx2d.clearRect(0, 0, w, h);

      const phone = w < 760;
      const fill = phone ? (opts.mobileFill ?? opts.fill ?? 0.62) : (opts.fill ?? 0.62);
      const f = (h * fill * D) / MH;
      const cx = w * (phone ? (opts.mobileCx ?? 0.5) : (opts.cx ?? 0.64));
      const cy = h * (phone ? (opts.mobileCy ?? opts.cy ?? 0.52) : (opts.cy ?? 0.52));
      const animate = !reducedMotion();
      const isConstruct = !!(opts.construct || opts.film);

      if (animate) {
        const dt = state.lastT ? Math.min((time - state.lastT) / 1000, 0.05) : 0.016;
        state.lastT = time;
        if (!state.dragging && !isConstruct) {
          state.yaw += (state.yawDrift + state.dragVel) * dt;
          state.dragVel *= 0.95;
        } else if (!state.dragging && opts.construct) {
          // Slow idle drift while construction loops
          state.dragVel *= 0.95;
          state.yaw += (state.yawDrift * 0.35 + state.dragVel) * dt;
        } else if (state.dragging) {
          state.dragVel *= 0.95;
        }
        if (opts.parallax && !opts.film) {
          state.yaw += (state.pointerX * 0.18) * dt;
          state.pitch += ((0.28 + state.pointerY * 0.1) - state.pitch) * Math.min(dt * 3, 1);
        }
        if (!isConstruct) state.scanY = (time * 0.011) % (MH + 30);
      } else {
        state.scanY = MH * 0.42;
      }

      // Construction / film mode: hologram builds from the ground up, loops
      let buildP = 1;
      if (isConstruct) {
        const cycle = opts.constructCycle || 18000;
        const t = animate ? (time % cycle) / cycle : 0.78;
        state.filmT = t;
        // 0–70% assemble · 70–88% scan complete form · 88–100% soft reset
        if (t < 0.7) {
          const raw = t / 0.7;
          buildP = 1 - Math.pow(1 - raw, 2.4);
          state.scanY = buildP * MH;
        } else if (t < 0.88) {
          buildP = 1;
          state.scanY = ((t - 0.7) / 0.18) * MH;
        } else {
          buildP = 1;
          state.scanY = MH * 0.5;
        }
        if (opts.film) {
          state.yaw = (opts.yaw ?? 0.35) + t * 1.5;
          ctx2d.globalAlpha = t > 0.93 ? 0.25 + clamp((1 - t) / 0.07, 0, 1) * 0.75 : 1;
        }
        // construct scenes keep user orbit / parallax; no forced yaw override
      }

      const scan = state.scanY;
      const constructCut = buildP * MH + 3;
      if (opts.solid) drawStudioWorld(w, h, cx, cy, f);
      else drawCinematicWorld(w, h, cx, cy, f, time);

      state.buildP = buildP;
      if (opts.solid) drawSolids(f, cx, cy, isConstruct ? constructCut : MH + 1);

      if (!opts.solid) {
        // --- wireframe lines with depth fade + scan highlight + construct reveal
        for (let i = 0; i < LINES.length; i++) {
        const L = LINES[i];
        const cfg = LAYERS[L.layer] || LAYERS.skin;
        const a = project(L.a[0], L.a[1], L.a[2], f, cx, cy);
        const b = project(L.b[0], L.b[1], L.b[2], f, cx, cy);
        if (!a || !b) continue;
        const depthA = (a.d + b.d) / 2;
        const midY = (L.a[1] + L.b[1]) / 2;
        const isSite = L.layer === 'grid' || L.layer === 'ring' || L.layer === 'ghost';
        const unbuilt = isConstruct && !isSite && midY > constructCut;

        ctx2d.beginPath();
        ctx2d.moveTo(a.x, a.y);
        ctx2d.lineTo(b.x, b.y);

        if (unbuilt) {
          // Ghost preview of future form (holographic imagination)
          if (!opts.constructGhost) continue;
          ctx2d.strokeStyle = `rgba(${cfg.rgb},${(0.06 * depthA).toFixed(3)})`;
          ctx2d.lineWidth = Math.max(0.4, cfg.width * 0.55);
        } else {
          const near = Math.abs(midY - scan) < 6;
          if (near && !isSite) {
            const band = 1 - Math.min(1, Math.abs(midY - scan) / 6);
            ctx2d.strokeStyle = `rgba(255,186,96,${(0.55 + 0.4 * band) * depthA})`;
            ctx2d.lineWidth = cfg.width + 0.4 + band * 0.9;
          } else {
            // Freshly built edges glow slightly cyan
            const fresh = isConstruct && !isSite && midY > constructCut - 14;
            const alpha = cfg.alpha * depthA * (fresh ? 1.15 : 1);
            ctx2d.strokeStyle = `rgba(${cfg.rgb},${Math.min(1, alpha).toFixed(3)})`;
            ctx2d.lineWidth = cfg.width + (fresh ? 0.25 : 0);
          }
        }
        ctx2d.stroke();
        }

        // --- scan plane disc (filled + soft glow trail)
        if (scan < MH) {
        const S = (MODEL.ring || 46) * (1 - 0.55 * (scan / MH));
        const ringPts = [];
        for (let i = 0; i < 32; i++) {
          const ang = (i / 32) * Math.PI * 2;
          const p = project(Math.cos(ang) * S, scan, Math.sin(ang) * S * 0.82, f, cx, cy);
          if (p) ringPts.push(p);
        }
        if (ringPts.length > 8) {
          ctx2d.beginPath();
          ringPts.forEach((p, i) => (i ? ctx2d.lineTo(p.x, p.y) : ctx2d.moveTo(p.x, p.y)));
          ctx2d.closePath();
          ctx2d.fillStyle = 'rgba(255,180,84,0.06)';
          ctx2d.fill();
          ctx2d.strokeStyle = 'rgba(255,180,84,0.62)';
          ctx2d.lineWidth = 1.2;
          ctx2d.setLineDash([4, 5]);
          ctx2d.stroke();
          ctx2d.setLineDash([]);
          // faint secondary trail ring slightly below scan
          const trailY = Math.max(0, scan - 10);
          const trail = [];
          for (let i = 0; i < 24; i++) {
            const ang = (i / 24) * Math.PI * 2;
            const p = project(Math.cos(ang) * S * 0.92, trailY, Math.sin(ang) * S * 0.75, f, cx, cy);
            if (p) trail.push(p);
          }
          if (trail.length > 6) {
            ctx2d.beginPath();
            trail.forEach((p, i) => (i ? ctx2d.lineTo(p.x, p.y) : ctx2d.moveTo(p.x, p.y)));
            ctx2d.closePath();
            ctx2d.strokeStyle = 'rgba(255,180,84,0.18)';
            ctx2d.lineWidth = 1;
            ctx2d.stroke();
          }
        }
        }

        // --- spire beacon
        const tip = project(0, MH, 0, f, cx, cy);
        if (tip) {
        const pulse = 0.45 + 0.35 * Math.sin(time * 0.004);
        const r = 14 + pulse * 8;
        const bg = ctx2d.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, r);
        bg.addColorStop(0, `rgba(255,210,140,${(0.6 * pulse * tip.d).toFixed(3)})`);
        bg.addColorStop(0.45, `rgba(255,180,84,${(0.2 * pulse * tip.d).toFixed(3)})`);
        bg.addColorStop(1, 'rgba(255,180,84,0)');
        ctx2d.fillStyle = bg;
        ctx2d.beginPath();
        ctx2d.arc(tip.x, tip.y, r, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.fillStyle = `rgba(255,230,180,${(0.95 * tip.d).toFixed(3)})`;
        ctx2d.beginPath();
        ctx2d.arc(tip.x, tip.y, 1.6, 0, Math.PI * 2);
        ctx2d.fill();
        }

        // --- data motes (soft circles)
        const animT = time * 0.001;
        for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        const y = animate ? (m.y + animT * m.speed * 6) % (MH + 20) : m.y;
        const x = Math.cos(m.th + animT * 0.05) * m.r;
        const z = Math.sin(m.th + animT * 0.05) * m.r;
        const p = project(x, y, z, f, cx, cy);
        if (!p) continue;
        const mr = 1.1 + p.d * 1.2;
        ctx2d.fillStyle = `rgba(160,220,255,${(0.35 + 0.35 * p.d).toFixed(3)})`;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, mr, 0, Math.PI * 2);
        ctx2d.fill();
        }
      }

      // --- anchored data tags (desktop only)
      if (w > 760 && opts.tags) {
        ctx2d.font = '10px "Cascadia Code", Consolas, monospace';
        const tagPulse = 0.75 + 0.25 * Math.sin(time * 0.0025);
        for (const tag of opts.tags) {
          const p = project(tag.at[0], tag.at[1], tag.at[2], f, cx, cy);
          if (!p) continue;
          const alpha = (0.88 * p.d * tagPulse).toFixed(3);
          ctx2d.strokeStyle = `rgba(82,188,255,${alpha})`;
          ctx2d.beginPath();
          ctx2d.moveTo(p.x, p.y);
          ctx2d.lineTo(p.x + 16, p.y - 12);
          ctx2d.lineTo(p.x + 22, p.y - 12);
          ctx2d.stroke();
          ctx2d.fillStyle = `rgba(210,236,255,${alpha})`;
          ctx2d.fillText(tag.text, p.x + 26, p.y - 9);
          // tag anchor dot
          ctx2d.fillStyle = `rgba(82,188,255,${alpha})`;
          ctx2d.beginPath();
          ctx2d.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx2d.fill();
        }
      }

      if (opts.onFrame) opts.onFrame(state);
      ctx2d.globalAlpha = 1;
    }

    function render(time) {
      if (!state.running) return;
      const frameMs = state.width < 760 ? 1000 / 30 : 0;
      if (!frameMs || time - state.lastDraw >= frameMs) {
        state.lastDraw = time;
        draw(time);
      }
      state.frame = window.requestAnimationFrame(render);
    }

    function updateRunning() {
      const shouldRun = !reducedMotion() && !document.hidden && state.visible;
      if (shouldRun && !state.running) {
        state.running = true;
        state.lastT = 0;
        state.frame = window.requestAnimationFrame(render);
      } else if (!shouldRun && state.running) {
        state.running = false;
        window.cancelAnimationFrame(state.frame);
        draw(performance.now());
      }
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      state.width = Math.max(1, bounds.width);
      state.height = Math.max(1, bounds.height);
      const maxDpr = state.width < 760 ? 1.25 : 2;
      state.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      canvas.width = Math.round(state.width * state.dpr);
      canvas.height = Math.round(state.height * state.dpr);
      draw(performance.now());
    }

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        state.visible = entries[0].isIntersecting;
        updateRunning();
      }, { rootMargin: '80px' }).observe(canvas);
    }

    document.addEventListener('visibilitychange', updateRunning);
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', () => { updateRunning(); resize(); });
    }

    const host = opts.host || canvas;
    if (opts.parallax && !reducedMotion()) {
      host.addEventListener('pointermove', (e) => {
        const b = host.getBoundingClientRect();
        state.pointerX = clamp((e.clientX - b.left) / b.width - 0.5, -0.5, 0.5) * 2;
        state.pointerY = clamp((e.clientY - b.top) / b.height - 0.5, -0.5, 0.5) * 2;
      });
      host.addEventListener('pointerleave', () => { state.pointerX = 0; state.pointerY = 0; });
    }

    if (opts.orbit) {
      let lastX = 0;
      host.addEventListener('pointerdown', (e) => {
        if (e.target.closest('a, button')) return;
        state.dragging = true;
        lastX = e.clientX;
        if (host.setPointerCapture) host.setPointerCapture(e.pointerId);
      });
      host.addEventListener('pointermove', (e) => {
        if (!state.dragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        state.yaw += dx * 0.008;
        state.dragVel = dx * 0.4;
        if (reducedMotion()) draw(performance.now());
      });
      const release = () => { state.dragging = false; };
      host.addEventListener('pointerup', release);
      host.addEventListener('pointercancel', release);
    }

    resize();
    updateRunning();
    return state;
  }

  // Quiet construct status labels
  function bindStatusLine(el, labels) {
    if (!el) return function () {};
    let last = '';
    return function (state) {
      const t = state.filmT == null ? 0 : state.filmT;
      let label = labels[0][1];
      for (let i = 0; i < labels.length; i++) {
        if (t >= labels[i][0]) label = labels[i][1];
      }
      if (label !== last) {
        last = label;
        el.textContent = label;
      }
    };
  }

  // Hero — generic tower assembling as a solid BIM model
  const updateHeroStatus = bindStatusLine(document.getElementById('hero-build-status'), [
    [0.00, 'Assembling'],
    [0.18, 'Core rising'],
    [0.40, 'Floor plates'],
    [0.58, 'Envelope set'],
    [0.70, 'Scanning'],
    [0.88, 'Form locked'],
    [0.96, 'Reset'],
  ]);

  createScene(document.getElementById('signal-canvas'), {
    model: DEMO_TOWER,
    solid: true,
    yaw: 0.8, drift: 0.035, cx: 0.7, cy: 0.52, fill: 0.88,
    mobileCx: 0.66, mobileCy: 0.63, mobileFill: 0.70,
    parallax: true,
    construct: true,
    constructCycle: 20000,
    host: document.getElementById('signal'),
    tags: [
      { at: [0, 170, 0], text: 'ROOF' },
      { at: [-10, 112, 0], text: 'CORE' },
      { at: [24, 54, 16], text: 'ENVELOPE' },
      { at: [0, 8, -24], text: 'BASE' },
    ],
    onFrame(state) { updateHeroStatus(state); },
  });

  // Twin — generic building assembled through one shared stage path
  const TWIN_STAGES = ['STRUCTURE', 'FLOOR PLATES', 'ENVELOPE', 'SYSTEMS', 'VERIFIED'];
  let lastTwinIndex = -1;
  let lastTwinLevel = -1;

  function setTwinStage(state) {
    const progress = reducedMotion() ? 1 : clamp(state.buildP || 0, 0, 1);
    const index = clamp(Math.floor(progress * TWIN_STAGES.length), 0, TWIN_STAGES.length - 1);
    const level = clamp(Math.ceil(progress * 7), 1, 7);
    if (index === lastTwinIndex && level === lastTwinLevel) return;
    const label = TWIN_STAGES[index];
    const statusEl = document.getElementById('twin-build-status');
    const layerEl = document.getElementById('twin-layer');
    const levelEl = document.getElementById('twin-level');
    const elevEl = document.getElementById('twin-elev');
    lastTwinIndex = index;
    lastTwinLevel = level;
    if (statusEl) statusEl.textContent = label;
    if (layerEl) layerEl.textContent = label;
    if (levelEl) levelEl.textContent = 'L.' + String(level).padStart(2, '0');
    if (elevEl) elevEl.textContent = '+' + (level * 4.2).toFixed(2) + ' m';
    document.querySelectorAll('.twin-stage').forEach((item, itemIndex) => {
      item.classList.toggle('is-active', itemIndex === index);
    });
  }

  createScene(document.getElementById('twin-canvas'), {
    model: DEMO_BUILDING,
    solid: true,
    yaw: 0.52, drift: 0.03, cx: 0.69, cy: 0.54, fill: 0.74,
    mobileCx: 0.58, mobileCy: 0.62, mobileFill: 0.58,
    orbit: true,
    construct: true,
    constructCycle: 20000,
    host: document.getElementById('twin'),
    tags: [
      { at: [-8, 48, -18], text: 'FLOOR PLATE' },
      { at: [18, 34, 13], text: 'ENVELOPE' },
      { at: [-24, 58, 0], text: 'CORE' },
      { at: [0, 5, 0], text: 'BASE' },
    ],
    onFrame(state) { setTwinStage(state); },
  });

  // Vision film — the future-of-BIM sequence with chaptered captions
  const filmChapterEl = document.getElementById('film-chapter');
  const filmLineEl = document.getElementById('film-line');
  const filmProgressEl = document.getElementById('film-progress');
  const FILM_CHAPTERS = [
    ['CH.01', 'The model draws itself.'],
    ['CH.02', 'The audits never sleep.'],
    ['CH.03', 'The architect commands the fleet.'],
  ];
  let filmChapter = -1;

  createScene(document.getElementById('film-canvas'), {
    model: TWIST_TOWER,
    yaw: 0.35, drift: 0, cx: 0.5, cy: 0.54, fill: 0.72, motes: 60,
    film: true,
    onFrame(state) {
      if (!filmProgressEl || state.filmT === undefined) return;
      const t = state.filmT;
      filmProgressEl.style.transform = 'scaleX(' + t.toFixed(4) + ')';
      const idx = clamp(Math.floor(t * 3), 0, FILM_CHAPTERS.length - 1);
      if (idx !== filmChapter) {
        filmChapter = idx;
        filmChapterEl.textContent = FILM_CHAPTERS[idx][0];
        filmLineEl.textContent = FILM_CHAPTERS[idx][1];
        filmLineEl.classList.remove('flash');
        void filmLineEl.offsetWidth;
        filmLineEl.classList.add('flash');
      }
    },
  });

  /* ------------------------------------------------------------
     Liquid-glass tilt panels — pointer-driven 3D + glare tracking
     ------------------------------------------------------------ */
  if (!reducedMotion() && window.matchMedia('(pointer: fine)').matches) {
    const TILT_MAX = 7.5;
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      let raf = 0;
      let tx = 0, ty = 0, cx = 0, cy = 0;
      const tick = () => {
        raf = 0;
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        el.style.transform =
          'perspective(1000px) rotateX(' + ((0.5 - cy) * TILT_MAX).toFixed(2) +
          'deg) rotateY(' + ((cx - 0.5) * TILT_MAX).toFixed(2) + 'deg) translateY(-6px) scale(1.015)';
        el.style.setProperty('--gx', (cx * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (cy * 100).toFixed(1) + '%');
        if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) {
          raf = window.requestAnimationFrame(tick);
        }
      };
      el.addEventListener('pointermove', (e) => {
        const b = el.getBoundingClientRect();
        tx = clamp((e.clientX - b.left) / b.width, 0, 1);
        ty = clamp((e.clientY - b.top) / b.height, 0, 1);
        if (!raf) raf = window.requestAnimationFrame(tick);
      });
      el.addEventListener('pointerleave', () => {
        tx = 0.5; ty = 0.5;
        if (!raf) raf = window.requestAnimationFrame(tick);
        window.setTimeout(() => {
          if (Math.abs(cx - 0.5) < 0.03) el.style.transform = '';
        }, 220);
      });
    });
  }

  // Gate chips: sequential hover-light along the chain
  document.querySelectorAll('.pl-gates').forEach((row) => {
    const gates = Array.from(row.querySelectorAll('.gate'));
    gates.forEach((g, i) => {
      g.addEventListener('pointerenter', () => {
        gates.forEach((x, j) => x.classList.toggle('is-hot', j <= i));
      });
      g.addEventListener('pointerleave', () => {
        gates.forEach((x) => x.classList.remove('is-hot'));
      });
    });
  });


  /* ------------------------------------------------------------
     Reveals, counters, scrollspy
     ------------------------------------------------------------ */
  function runCounters(scope) {
    scope.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      if (!Number.isFinite(target)) return;
      if (reducedMotion()) { el.textContent = target.toLocaleString('en-US'); return; }
      const t0 = performance.now();
      const dur = 1200;
      const tick = (t) => {
        const p = clamp((t - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('en-US');
        if (p < 1) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
      // Guarantee the final value even where rAF never ticks (hidden tabs,
      // stalled embedded webviews).
      window.setTimeout(() => { el.textContent = target.toLocaleString('en-US'); }, dur + 500);
    });
  }

  /* Reveal engine — snap slides must force-reveal on enter or
     content stays opacity:0 and panels look "broken". */
  const revealSeen = new WeakSet();
  function revealEl(el) {
    if (!el || revealSeen.has(el)) return;
    revealSeen.add(el);
    el.classList.add('is-revealed');
    el.style.pointerEvents = '';
    runCounters(el);
  }
  function revealSlide(slideEl) {
    if (!slideEl) return;
    slideEl.querySelectorAll('[data-reveal]').forEach(revealEl);
  }
  window.__architechRevealSlide = revealSlide;

  function initReveals() {
    const targets = Array.from(document.querySelectorAll('[data-reveal]'));
    targets.forEach((el) => { el.style.pointerEvents = 'none'; });

    let stagger = 0;
    targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 1.05 && r.bottom > -40) {
        if (!reducedMotion()) el.style.transitionDelay = (stagger++ * 70) + 'ms';
        revealEl(el);
      }
    });

    if (!('IntersectionObserver' in window)) {
      targets.forEach(revealEl);
      return;
    }

    // Generous margins so snap-scrolling still trips reveals
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealEl(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: [0, 0.05, 0.12], rootMargin: '12% 0px 12% 0px' });

    targets.forEach((el) => {
      if (!revealSeen.has(el)) io.observe(el);
    });

    // Hard safety: never leave a panel invisible on a portfolio site
    window.setTimeout(() => {
      targets.forEach(revealEl);
      io.disconnect();
    }, 3200);

    // Re-check when user lands on a slide (snap / hash / rail)
    const slideIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          revealSlide(entry.target);
        }
      });
    }, { threshold: [0.35, 0.55, 0.75] });
    document.querySelectorAll('main .slide').forEach((s) => slideIo.observe(s));
  }

  function initScrollspy() {
    const links = Array.from(document.querySelectorAll('.site-nav a'));
    const dots = Array.from(document.querySelectorAll('.slide-dot'));
    const sections = Array.from(document.querySelectorAll('main .slide[id]'));
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const setActive = (id) => {
      links.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
      dots.forEach((d) => {
        d.classList.toggle('active', d.getAttribute('data-slide') === id);
      });
      const sec = document.getElementById(id);
      if (sec) revealSlide(sec);
    };

    const visible = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      let best = null, bestR = 0;
      visible.forEach((r, id) => {
        if (r > bestR) { bestR = r; best = id; }
      });
      if (best) setActive(best);
    }, { threshold: [0.25, 0.45, 0.6, 0.8] });

    sections.forEach((sec) => io.observe(sec));
    if (sections[0]) setActive(sections[0].id);

    // Rail / in-page anchors: force reveal target slide
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', () => {
        const id = (a.getAttribute('href') || '').slice(1);
        if (!id) return;
        window.setTimeout(() => {
          const sec = document.getElementById(id);
          if (sec) revealSlide(sec);
        }, 120);
      });
    });
  }

  function initGateIgnition() {
    document.querySelectorAll('.pipeline').forEach((pipeline) => {
      const gates = Array.from(pipeline.querySelectorAll('.gate'));
      gates.forEach((g, i) => {
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', 'Gate ' + g.textContent.trim());
        const ignite = () => {
          gates.forEach((x) => x.classList.remove('is-lit', 'is-hot'));
          gates.forEach((x, j) => {
            if (j > i) return;
            window.setTimeout(() => {
              x.classList.add('is-lit', 'is-hot');
              gateTone(j);
            }, j * 85);
          });
          pipeline.classList.add('is-ignited');
        };
        g.addEventListener('click', ignite);
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ignite(); }
        });
      });
    });
  }

  function initSayChips() {
    document.querySelectorAll('.say-list li').forEach((chip) => {
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.addEventListener('click', () => {
        chip.classList.add('is-fired');
        clickTone();
        window.setTimeout(() => chip.classList.remove('is-fired'), 700);
      });
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          chip.click();
        }
      });
    });
  }

  /* Pointer parallax on cinematic plate backgrounds (3D depth feel) */
  function initBgParallax() {
    if (reducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
    const plates = Array.from(document.querySelectorAll('.sec.slide, .vision.slide'));
    plates.forEach((sec) => {
      let raf = 0;
      let tx = 0, ty = 0, cx = 0, cy = 0;
      const tick = () => {
        raf = 0;
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        /* Keep parallax subtle so plates stay wide, not crop-in */
        sec.style.setProperty('--bg-px', (cx * 14).toFixed(2) + 'px');
        sec.style.setProperty('--bg-py', (cy * 9).toFixed(2) + 'px');
        if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) {
          raf = window.requestAnimationFrame(tick);
        }
      };
      sec.addEventListener('pointermove', (e) => {
        const b = sec.getBoundingClientRect();
        if (b.width < 1 || b.height < 1) return;
        tx = clamp((e.clientX - b.left) / b.width - 0.5, -0.5, 0.5) * 2;
        ty = clamp((e.clientY - b.top) / b.height - 0.5, -0.5, 0.5) * 2;
        if (!raf) raf = window.requestAnimationFrame(tick);
      });
      sec.addEventListener('pointerleave', () => {
        tx = 0; ty = 0;
        if (!raf) raf = window.requestAnimationFrame(tick);
      });
    });
  }

  /* ------------------------------------------------------------
     Boot cinematic — skipped on reduced motion and on revisit
     ------------------------------------------------------------ */
  const BOOT_LINES = [
    'agentic bim os .................... ONLINE',
    'memory vault · 6,991 notes ........ OK',
    'revit bridge ...................... LINKED',
    'voice core · EN + HI .............. OK',
    'render portfolio/3.0 .............. GO',
  ];

  function finishBoot(overlay) {
    if (overlay) {
      overlay.classList.add('done');
      window.setTimeout(() => overlay.remove(), 900);
    }
    document.body.classList.remove('boot-lock');
    initReveals();
    initScrollspy();
    initGateIgnition();
    initSayChips();
    initBgParallax();
    // Honour deep links whose anchor jump was swallowed by the boot overlay
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        if (window.scrollY < 10) target.scrollIntoView();
        window.setTimeout(() => revealSlide(target), 200);
      }
    }
  }

  function boot() {
    let seen = false;
    try { seen = window.sessionStorage.getItem('architechBooted') === '1'; } catch (e) { /* storage unavailable */ }
    if (reducedMotion() || seen) { finishBoot(null); return; }
    try { window.sessionStorage.setItem('architechBooted', '1'); } catch (e) { /* storage unavailable */ }

    const overlay = document.createElement('div');
    overlay.id = 'boot';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="boot-inner">' +
      '<p class="boot-mark">ARCHI<b>TECH</b></p>' +
      '<pre class="boot-log"></pre>' +
      '<div class="boot-bar"><i></i></div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('boot-lock');

    const log = overlay.querySelector('.boot-log');
    const bar = overlay.querySelector('.boot-bar i');
    let i = 0;
    const step = () => {
      if (i < BOOT_LINES.length) {
        const line = BOOT_LINES[i];
        const parts = line.split(/ (OK|LINKED|GO)$/);
        log.appendChild(document.createTextNode(parts[0] + ' '));
        if (parts[1]) {
          const em = document.createElement('em');
          em.textContent = parts[1];
          log.appendChild(em);
        }
        log.appendChild(document.createTextNode('\n'));
        i += 1;
        bar.style.width = (i / BOOT_LINES.length) * 100 + '%';
        blip(980 + i * 90, 0.03, 0.02);
        window.setTimeout(step, 210);
      } else {
        window.setTimeout(() => finishBoot(overlay), 420);
      }
    };
    window.setTimeout(step, 260);
  }

  boot();
})();
