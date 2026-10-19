/* ============================================================
   ArchiTECH Portfolio — interaction engine
   Web Audio (opt-in) · accessible navigation · restrained reveals
   Reveals · scrollspy. No runtime dependencies.
   ============================================================ */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => motionQuery.matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

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
  const HOVER_SEL = '.js-audio-hit, .project-links a, .tb-cell, .btn';
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll(HOVER_SEL).forEach((el) => {
    if (canHover) el.addEventListener('pointerenter', hoverTone);
    el.addEventListener('click', (event) => {
      const owner = event.target.closest(HOVER_SEL);
      if (owner !== el) return;
      if (el.matches('[data-sound-toggle], [data-nav-toggle]')) return;
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
      nav.inert = window.innerWidth <= 920 && !open;
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
      if (!document.body.classList.contains('nav-open')) return;
      if (e.key === 'Escape') { setOpen(false); toggle.focus(); }
      if (e.key === 'Tab') {
        const links = Array.from(nav.querySelectorAll('a'));
        const first = links[0], last = links[links.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); toggle.focus(); }
        else if (e.shiftKey && document.activeElement === toggle) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === toggle) { e.preventDefault(); first.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); toggle.focus(); }
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 920 && document.body.classList.contains('nav-open')) setOpen(false);
      nav.inert = window.innerWidth <= 920 && !document.body.classList.contains('nav-open');
    });
    nav.inert = window.innerWidth <= 920;
  }
  initMobileNav();

  const revealTargets = [...document.querySelectorAll('[data-reveal]')];
  const reveal = el => el.classList.add('is-revealed');
  if (reducedMotion() || !('IntersectionObserver' in window)) revealTargets.forEach(reveal);
  else {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
    }), { threshold: 0, rootMargin: '0px 0px 80px 0px' });
    revealTargets.forEach(el => observer.observe(el));
    document.addEventListener('focusin', event => {
      const target = event.target.closest('[data-reveal]');
      if (target) reveal(target);
    });
  }

  const title = document.getElementById('hero-title');
  if (title && !reducedMotion()) {
    title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());
    title.querySelectorAll(':scope > span').forEach(line => {
      line.setAttribute('aria-hidden', 'true');
      const text = line.textContent;
      line.textContent = '';
      [...text].forEach((char, index) => {
        const glyph = document.createElement('i');
        glyph.className = 'glyph';
        glyph.style.setProperty('--i', index);
        glyph.textContent = char === ' ' ? '\u00a0' : char;
        line.appendChild(glyph);
      });
    });
  }

  // Optional decoration; all content and links work without pointer interaction.
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (reducedMotion() || saveData || !matchMedia('(pointer: fine)').matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = 'perspective(1400px) rotateX(' + (-y * 1.2) + 'deg) rotateY(' + (x * 1.2) + 'deg)';
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  const links = [...document.querySelectorAll('.site-nav a')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
  let pending = false;
  const updateActive = () => {
    pending = false;
    let current = null;
    sections.forEach(section => { if (section.getBoundingClientRect().top <= 180) current = section.id; });
    links.forEach(link => {
      const active = link.hash === '#' + current;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  window.addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(updateActive); }
  }, { passive: true });
  window.addEventListener('resize', updateActive);
  updateActive();
  motionQuery.addEventListener('change', () => {
    revealTargets.forEach(reveal);
    document.querySelectorAll('[data-tilt]').forEach(card => { card.style.transform = ''; });
  });
})();
