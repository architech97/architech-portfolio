/* HESA — page motion. One rAF loop, layout read once per resize (no per-frame layout reads),
   work done only for what is on screen. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const A = 'assets/';
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null, velocity = 0;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', e => { velocity = e.velocity || 0; if (hasGsap) ScrollTrigger.update(); });
    if (hasGsap) { gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { duration: 1.8 });
    }));
  }
  window.__lenis = lenis;

  /* ---------- layout cache ---------- */
  const L = {};
  const track = { hero: $('#hero'), words: $('[data-words]'), reel: $('#reel'), contact: $('#contact') };
  let docH = 1, vh = innerHeight, vw = innerWidth;
  function measure() {
    vh = innerHeight; vw = innerWidth; docH = document.documentElement.scrollHeight - vh;
    for (const k in track) { const el = track[k]; if (!el) continue; const r = el.getBoundingClientRect(); L[k] = { top: r.top + scrollY, h: el.offsetHeight }; }
    measureReel();
    themed = $$('[data-theme], #dwelling').map(el => { const r = el.getBoundingClientRect(); return { el, top: r.top + scrollY, bottom: r.bottom + scrollY, dark: el.dataset.theme === 'dark' }; });
    const lr = nav.getBoundingClientRect(); logoBox = { x: lr.left, y: lr.top, w: lr.width, h: lr.height };
    ['dwelling', 'plans', 'light', 'living', 'studio', 'contact'].forEach(id => { const el = document.getElementById(id); if (el) L['sec_' + id] = el.getBoundingClientRect().top + scrollY; });
    updateLens();
  }
  const progressOf = (k, y) => clamp((y - L[k].top) / (L[k].h - vh));
  const inView = (k, y, pad = 0) => y + vh > L[k].top - pad && y < L[k].top + L[k].h + pad;

  /* ---------- header: one Liquid Glass capsule (logo + navigation), adapts to the section below ---------- */
  const bar = $('.bar'), nav = $('#navglass'), glass = $('.glass', nav), toggle = $('.nav-toggle'), themeMeta = $('#theme-color');
  const secLinks = $$('[data-sec]', nav), lensImg = $('#lg-refract feImage');
  let themed = [], logoBox = { x: 0, y: 0, w: 1, h: 1 }, barDark = null, glassHover = false, sx = 1, sy = 1, current = null, menuOpen = false, lensKey = '';
  // SVG refraction inside backdrop-filter is a Chromium feature; Safari and Firefox get the frosted variant
  if (navigator.userAgentData?.brands?.some(b => /Chromium/.test(b.brand))) document.documentElement.classList.add('lg-svg');
  nav.addEventListener('pointerenter', () => glassHover = true);
  nav.addEventListener('pointerleave', () => glassHover = false);
  // the refraction map is drawn for the capsule's real size, so the lens edge is the same thickness all round
  function lensMap(w, h) {
    w = Math.round(w); h = Math.round(h); const r = h / 2, b = Math.min(12, h * 0.22);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><defs>` +
      `<linearGradient id='r' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' stop-color='#000'/><stop offset='100%' stop-color='#f00'/></linearGradient>` +
      `<linearGradient id='b' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stop-color='#000'/><stop offset='100%' stop-color='#00f'/></linearGradient>` +
      `<filter id='f'><feGaussianBlur stdDeviation='${(b * 0.55).toFixed(1)}'/></filter></defs>` +
      `<rect width='${w}' height='${h}' fill='#000'/><rect width='${w}' height='${h}' rx='${r}' fill='url(#r)'/>` +
      `<rect width='${w}' height='${h}' rx='${r}' fill='url(#b)' style='mix-blend-mode:difference'/>` +
      `<rect x='${b}' y='${b}' width='${w - 2 * b}' height='${h - 2 * b}' rx='${Math.max(0, r - b)}' fill='rgb(128,128,128)' fill-opacity='.94' filter='url(#f)'/></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  function updateLens() {
    if (!lensImg || menuOpen) return;
    const r = nav.getBoundingClientRect(), key = Math.round(r.width) + 'x' + Math.round(r.height);
    if (key === lensKey) return; lensKey = key;
    lensImg.setAttribute('href', lensMap(r.width, r.height));
  }
  function headerTheme(y) {
    const probe = y + 40;
    const hit = themed.find(t => probe >= t.top && probe < t.bottom);
    const dark = hit ? (hit.dark || (hit.el.id === 'dwelling' && document.body.classList.contains('scene-dusk'))) : false;
    if (dark !== barDark) {
      bar.classList.toggle('is-dark', dark); barDark = dark;
      themeMeta?.setAttribute('content', dark ? '#171311' : '#f3eee6');   // Safari tints its toolbars to match
    }
    // which section are we in? (drives the dot under the nav link)
    const mid = y + vh * 0.45;
    const sec = ['contact', 'studio', 'living', 'light', 'plans', 'dwelling'].find(id => L['sec_' + id] && mid >= L['sec_' + id]) || null;
    if (sec !== current) { current = sec; secLinks.forEach(a => a.setAttribute('aria-current', String(a.dataset.sec === sec))); }
  }
  function glassUpdate() {
    // the capsule leans with scroll speed and swells under the pointer, then springs back (CSS adds the overshoot)
    if (menuOpen) return;
    const v = Math.min(1, Math.abs(velocity) / 40);
    const tx = 1 + v * 0.025 + (glassHover ? 0.008 : 0), ty = 1 - v * 0.06 + (glassHover ? 0.04 : 0);
    if (Math.abs(tx - sx) > 0.001 || Math.abs(ty - sy) > 0.002) { sx = tx; sy = ty; glass.style.setProperty('--sx', sx.toFixed(4)); glass.style.setProperty('--sy', sy.toFixed(3)); }
  }
  if (fine && !reduce) addEventListener('pointermove', e => {
    const x = clamp((e.clientX - logoBox.x) / logoBox.w, -0.3, 1.3), y = clamp((e.clientY - logoBox.y) / logoBox.h, -1.5, 2.5);
    glass.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); glass.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  }, { passive: true });
  // the mobile menu: the capsule itself expands into a sheet
  function setMenu(open) {
    menuOpen = open; nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    glass.style.setProperty('--sx', 1); glass.style.setProperty('--sy', 1); sx = sy = 1;
    if (open) lenis?.stop(); else { lenis?.start(); lensKey = ''; setTimeout(updateLens, 650); }
  }
  toggle.addEventListener('click', () => setMenu(!menuOpen));
  $$('.nav-menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { setMenu(false); toggle.focus(); } });
  document.addEventListener('pointerdown', e => { if (menuOpen && !nav.contains(e.target)) setMenu(false); });

  /* ---------- loader: the ground-floor plan draws itself ---------- */
  const count = $('.loader-count'), t0 = performance.now();
  let pct = 0;
  const pctTick = () => { pct = Math.min(100, pct + (100 - pct) * 0.06 + 0.4); count.textContent = String(Math.round(pct)).padStart(3, '0'); if (!finished) requestAnimationFrame(pctTick); };
  requestAnimationFrame(pctTick);
  let finished = false, heroLoaded = false;
  ['img/hero-day.jpg', 'img/hero-dusk.jpg'].forEach(src => { const i = new Image(); i.onload = i.onerror = () => { if (i.complete) heroLoaded = true; }; i.src = src; });
  let seen = false; try { seen = sessionStorage.getItem('hesa-intro') === '1'; sessionStorage.setItem('hesa-intro', '1'); } catch (e) {}
  if (seen) document.documentElement.classList.add('intro-seen');
  const minTime = reduce || seen ? 350 : 2100;
  function tryFinish() {
    if (finished) return;
    if (performance.now() - t0 < minTime || (!heroLoaded && performance.now() - t0 < 7000)) return void setTimeout(tryFinish, 120);
    finished = true; count.textContent = '100';
    document.body.classList.remove('is-loading');
    dispatchEvent(new Event('hesa:ready'));
    intro();
  }
  setTimeout(tryFinish, 200);
  function intro() {
    if (!hasGsap || reduce) { $$('.hero .line-inner').forEach(l => l.style.transform = 'none'); return; }
    gsap.to('.hero .line-inner', { y: 0, duration: 1.5, ease: 'expo.out', stagger: .12, delay: .55 });
    gsap.from('.hero .kicker, .hero-foot > *', { opacity: 0, y: 18, duration: 1.2, ease: 'expo.out', stagger: .08, delay: .9 });
  }

  /* ---------- hero UI (clock + copy drift); the picture itself is hero.js ---------- */
  const sun = $('.clock .sun'), time = $('.clock-time'), heroCopy = $('.hero-copy'), heroImgs = $$('.hero-img'), night = $('.hero-night');
  let lastClock = '';
  function heroUpdate(y) {
    const p = progressOf('hero', y);
    const dusk = clamp((p - .08) / .52);
    if (!track.hero.classList.contains('has-gl')) { night.style.opacity = dusk; heroImgs.forEach(i => i.style.transform = `scale(${1.12 - .08 * p})`); }
    heroCopy.style.transform = `translate3d(0,${(-p * 90).toFixed(1)}px,0)`;
    heroCopy.style.opacity = 1 - clamp((p - .55) / .4);
    const a = Math.PI * (1 - (.55 + dusk * .45));
    const mins = 16 * 60 + 40 + Math.round(dusk * 205);
    const s = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    if (s !== lastClock) {
      lastClock = s; time.textContent = s;
      sun.setAttribute('cx', (60 + 54 * Math.cos(a)).toFixed(1)); sun.setAttribute('cy', (60 - 54 * Math.sin(a)).toFixed(1));
      sun.style.fill = dusk > .85 ? '#e8e2d6' : '#f2c98a';
    }
  }

  /* ---------- manifesto: words light up ---------- */
  const words = track.words;
  words.innerHTML = words.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  const wordEls = $$('.w', words);
  let lastN = -1;
  function wordsUpdate(y) {
    const r = L.words; const p = clamp((y + vh * .85 - r.top) / (r.h + vh * .4));
    const n = Math.round(p * wordEls.length);
    if (n === lastN) return;
    wordEls.forEach((w, i) => w.classList.toggle('on', i < n)); lastN = n;
  }

  /* ---------- counters, split headings, image reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target;
    if (el.dataset.count) {
      const to = +el.dataset.count, st = performance.now();
      const f = t => { const k = clamp((t - st) / 1400); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))).padStart(2, '0'); if (k < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    } else if (el.classList.contains('split') && hasGsap) {
      gsap.to($$('.line-inner', el), { y: 0, duration: 1.3, ease: 'expo.out', stagger: .1 });
    } else el.classList.add('in');
  }, { threshold: .3 }));
  $$('[data-count]').forEach(el => io.observe(el));
  $$('.rv').forEach(el => io.observe(el));
  $$('h2.split').forEach(h => {
    const parts = h.innerHTML.split(/(?=<em>)/);
    h.innerHTML = parts.map(p => `<span class="line"><span class="line-inner">${p.trim()}</span></span>`).join('');
    if (!hasGsap || reduce) $$('.line-inner', h).forEach(l => l.style.transform = 'none'); else io.observe(h);
  });

  /* ---------- marquees (drift + scroll velocity) ---------- */
  const marquees = $$('.marquee').map(m => ({ el: m, inner: $('.marquee-inner', m), x: 0, dir: +m.dataset.dir || 1, w: 0, vis: false }));
  const mio = new IntersectionObserver(es => es.forEach(e => { const m = marquees.find(q => q.el === e.target); if (m) m.vis = e.isIntersecting; }));
  marquees.forEach(m => mio.observe(m.el));
  function marqueeUpdate(dt) {
    if (reduce) return;
    for (const m of marquees) {
      if (!m.vis) continue;
      if (!m.w) m.w = m.inner.scrollWidth / 2;
      m.x -= m.dir * (40 + Math.min(900, Math.abs(velocity) * 60)) * dt;
      if (m.x < -m.w) m.x += m.w; if (m.x > 0) m.x -= m.w;
      m.inner.style.transform = `translate3d(${m.x.toFixed(1)}px,0,0) skewX(${clamp(-velocity * 0.4, -8, 8).toFixed(2)}deg)`;
    }
  }

  /* ---------- plan explorer ---------- */
  const FLOORS = [
    { name: 'Ground floor', slide: 'plan-render-0.jpg', drawing: 'drawing-0.jpg', rooms: [
      [1, 'Entry vestibule', '', 485, 200], [2, 'Living room', '23′ × 19′', 707, 160], [3, 'Dining area', '23′ × 15′3″', 727, 325],
      [4, 'Mandir', '', 485, 110], [5, 'Kitchen', '', 988, 155], [6, 'Master bedroom lounge', '11′5″ × 11′9″', 483, 357],
      [7, 'Master bedroom', '15′2″ × 18′7″', 330, 520], [8, 'Master toilet', '10′10″ × 8′11″', 527, 478], [9, 'Dresser', '10′2″ × 11′5″', 325, 358],
      [10, 'Bedroom', '13′7″ × 16′8″', 713, 505], [11, 'Toilet', '10′7″ × 8′11″', 527, 598], [12, 'Common toilet', '5′5″ × 9′7″', 807, 568]] },
    { name: 'First floor', slide: 'plan-render-1.jpg', drawing: 'asset-027.jpg', rooms: [
      [1, 'Family lounge', '19′5″ × 17′8″', 722, 310], [2, 'Vestibule', '', 570, 410], [3, 'Bedroom', '15′2″ × 13′9″', 415, 368],
      [3, 'Bedroom', '15′2″ × 16′8″', 360, 520], [3, 'Bedroom', '13′7″ × 16′8″', 698, 520], [4, 'Toilet', '6′6″ × 10′10″', 556, 300],
      [4, 'Toilet', '6′3″ × 10′7″', 535, 566], [4, 'Toilet', '5′5″ × 10′7″', 852, 566], [5, 'Terrace', '', 960, 124]] },
    { name: 'Second floor', slide: 'plan-render-2.jpg', drawing: 'asset-028.jpg', rooms: [
      [1, 'Terrace', '', 425, 445], [2, 'Home theatre', '', 702, 121], [3, 'Gaming zone', '', 767, 316],
      [4, 'Bedroom', '13′7″ × 16′8″', 681, 546], [5, 'Toilet', '5′5″ × 10′7″', 842, 604]] }
  ];
  const list = $('#room-list'), pins = $('#pins'), render = $('#plan-render'), drawing = $('#plan-drawing'), spot = $('#plan-spot'),
    card = $('#plan-card'), flip = $('#flip'), caption = $('#plan-caption'), tabs = $$('.floor-tabs [role=tab]'), ink = $('.tab-ink');
  let floor = 0;
  function moveInk() { const b = tabs[floor]; ink.style.width = b.offsetWidth + 'px'; ink.style.transform = `translateX(${b.offsetLeft}px)`; }
  function hot(i, on) {
    $$('li', list)[i]?.classList.toggle('hot', on); const pin = $$('.pin', pins)[i]; pin?.classList.toggle('hot', on);
    if (on && pin) { spot.style.setProperty('--sx', pin.style.left); spot.style.setProperty('--sy', pin.style.top); }
    spot.classList.toggle('on', on);
  }
  function showFloor(f, first) {
    floor = f; const F = FLOORS[f];
    tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === f))); moveInk();
    const apply = () => {
      render.src = F.slide; render.alt = `Rendered ${F.name.toLowerCase()} plan with numbered rooms`;
      drawing.src = F.drawing.startsWith('asset-') ? A + F.drawing : F.drawing; drawing.alt = `${F.name} technical drawing`;
      caption.textContent = `${F.name} · ${card.classList.contains('flipped') ? 'technical drawing' : 'rendered plan'}`;
      list.innerHTML = F.rooms.map(r => `<li tabindex="0"><i>${String(r[0]).padStart(2, '0')}</i><span>${r[1]}</span><em>${r[2]}</em></li>`).join('');
      pins.innerHTML = F.rooms.map(r => `<button class="pin" style="left:${((r[3] - 241) / 859 * 100).toFixed(2)}%;top:${(r[4] / 700 * 100).toFixed(2)}%" aria-label="${r[1]}" data-cursor="View">${r[0]}<span class="pin-tip">${r[1]}${r[2] ? ' · ' + r[2] : ''}</span></button>`).join('');
      const lis = $$('li', list), ps = $$('.pin', pins);
      [...lis, ...ps].forEach((el, k) => {
        const i = k % F.rooms.length;
        el.addEventListener('mouseenter', () => hot(i, true)); el.addEventListener('mouseleave', () => hot(i, false));
        el.addEventListener('focus', () => hot(i, true)); el.addEventListener('blur', () => hot(i, false));
      });
      lis.forEach((li, i) => setTimeout(() => li.classList.add('in'), 40 * i));
      ps.forEach((p, i) => setTimeout(() => p.classList.add('in'), 200 + 45 * i));
      render.classList.remove('swap');
    };
    if (first) return apply();
    render.classList.add('swap'); setTimeout(apply, 380);
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => i !== floor && showFloor(i)));
  flip.addEventListener('click', () => {
    const on = !card.classList.contains('flipped'); card.classList.toggle('flipped', on); flip.setAttribute('aria-pressed', String(on));
    flip.textContent = on ? 'Back to the render ↺' : 'Turn to the drawing ↻';
    caption.textContent = `${FLOORS[floor].name} · ${on ? 'technical drawing' : 'rendered plan'}`;
  });
  // the card tilts toward the pointer
  const wrap = $('.plan-card-wrap');
  if (fine && !reduce) {
    wrap.addEventListener('pointermove', e => {
      const r = wrap.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      wrap.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg'); wrap.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
    });
    wrap.addEventListener('pointerleave', () => { wrap.style.setProperty('--rx', '0deg'); wrap.style.setProperty('--ry', '0deg'); });
  }
  showFloor(0, true);

  /* ---------- light wipe ---------- */
  const wipe = $('#wipe'); let wipeDrag = false;
  const setWipe = x => { const r = wipe.getBoundingClientRect(); const v = clamp((x - r.left) / r.width) * 100; wipe.style.setProperty('--x', v + '%'); wipe.setAttribute('aria-valuenow', Math.round(v)); };
  wipe.addEventListener('pointerdown', e => { wipeDrag = true; wipe.setPointerCapture(e.pointerId); setWipe(e.clientX); });
  wipe.addEventListener('pointermove', e => { if (wipeDrag || e.pointerType === 'mouse') setWipe(e.clientX); });
  wipe.addEventListener('pointerup', () => wipeDrag = false);
  wipe.addEventListener('keydown', e => {
    const v = +wipe.getAttribute('aria-valuenow'); const d = e.key === 'ArrowLeft' ? -5 : e.key === 'ArrowRight' ? 5 : 0;
    if (!d) return; e.preventDefault(); const n = clamp(v + d, 0, 100); wipe.style.setProperty('--x', n + '%'); wipe.setAttribute('aria-valuenow', n);
  });
  new IntersectionObserver((es, o) => es.forEach(e => {
    if (!e.isIntersecting || reduce || !hasGsap) return; o.disconnect();
    const s = { v: 88 }; gsap.to(s, { v: 50, duration: 2, ease: 'expo.inOut', onUpdate: () => wipe.style.setProperty('--x', s.v + '%') });
  }), { threshold: .5 }).observe(wipe);

  /* ---------- horizontal reel (positions cached, velocity skew) ---------- */
  const reelTrack = $('#reel-track'), reelN = $('#reel-n'), reelItems = $$('.reel-item');
  const reelImgs = reelItems.map(it => $('img', it));
  let reelMax = 0, itemCenters = [], lastReelN = '';
  function measureReel() {
    reelTrack.style.transform = 'none';
    reelMax = reelTrack.scrollWidth - vw;
    itemCenters = reelItems.map(it => it.offsetLeft + it.offsetWidth / 2);
  }
  function reelUpdate(y) {
    const p = progressOf('reel', y), x = -p * reelMax;
    reelTrack.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${clamp(-velocity * 0.25, -6, 6).toFixed(2)}deg)`;
    const n = String(Math.min(5, 1 + Math.floor(p * 5))).padStart(2, '0');
    if (n !== lastReelN) { reelN.textContent = n; lastReelN = n; }
    reelImgs.forEach((img, i) => { if (!img) return; const c = (itemCenters[i] + x - vw / 2) / vw; img.style.transform = `scale(1.18) translate3d(${(c * -8).toFixed(2)}%,0,0)`; });
  }

  /* ---------- contact parallax ---------- */
  const cImg = $('.contact-media img');
  const contactUpdate = y => { const p = clamp((y + vh - L.contact.top) / vh, 0, 2); cImg.style.transform = `scale(1.15) translate3d(0,${((p - 1) * -6).toFixed(2)}%,0)`; };

  /* ---------- cursor (desktop) + services image ---------- */
  const cursor = $('.cursor'), cLabel = $('.cursor-label', cursor), float = $('.service-float'), fimg = $('img', float);
  let mx = vw / 2, my = vh / 2, cx = mx, cy = my, fx = mx, fy = my, cursorOn = false;
  if (fine && !reduce) {
    document.body.classList.add('has-cursor');
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; if (!cursorOn) { cursorOn = true; cursor.classList.add('on'); } }, { passive: true });
    document.addEventListener('pointerover', e => {
      if (e.target.closest('.navglass')) { cursor.classList.remove('big', 'labelled'); cLabel.textContent = ''; return; }   // the glass reacts instead
      const t = e.target.closest('a, button, [data-cursor], .wipe, #scene, .services li');
      cursor.classList.toggle('big', !!t);
      const label = t ? (t.dataset.cursor || (t.matches('.wipe') ? 'Drag' : t.matches('#scene') ? (document.querySelector('.drag-hint.on') ? 'Drag' : '') : t.matches('.services li') ? 'Explore' : '')) : '';
      cLabel.textContent = label; cursor.classList.toggle('labelled', !!label);
    });
    document.addEventListener('pointerleave', () => { cursorOn = false; cursor.classList.remove('on'); });
  }
  $$('#services li').forEach(li => {
    li.addEventListener('mouseenter', () => { fimg.src = li.dataset.img; float.classList.add('on'); });
    li.addEventListener('mouseleave', () => float.classList.remove('on'));
  });
  // magnetic buttons
  if (fine && !reduce) $$('.magnet').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * .25).toFixed(1)}px,${((e.clientY - r.top - r.height / 2) * .35).toFixed(1)}px)`; });
    b.addEventListener('pointerleave', () => b.style.transform = '');
  });
  function cursorUpdate(dt) {
    if (!cursorOn) return;
    const k = 1 - Math.exp(-dt * 22), k2 = 1 - Math.exp(-dt * 9);
    cx += (mx - cx) * k; cy += (my - cy) * k; fx += (mx + 30 - fx) * k2; fy += (my - 110 - fy) * k2;
    cursor.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
    if (float.classList.contains('on')) float.style.transform = `translate3d(${fx.toFixed(1)}px,${fy.toFixed(1)}px,0)`;
  }

  /* ---------- lightbox ---------- */
  // one list for the exterior reel and the living section, in the order they appear on the page
  const LB = $$('[data-lb]').sort((a, b) => a.dataset.lb - b.dataset.lb).map(b => { const im = $('img', b), cap = b.closest('figure')?.querySelector('figcaption'); const t = cap ? [...cap.childNodes].map(n => n.textContent.trim()).filter(Boolean).join(' · ').replace(/^\d+ · /, '') : im.alt; return [im.getAttribute('src'), t]; });
  const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('.lb-cap', lb); let lbi = 0;
  const lbShow = i => { lbi = (i + LB.length) % LB.length; lbImg.src = LB[lbi][0]; lbImg.alt = LB[lbi][1]; lbCap.textContent = `${String(lbi + 1).padStart(2, '0')} / ${String(LB.length).padStart(2, '0')} · ${LB[lbi][1]}`; };
  $$('[data-lb]').forEach(b => b.addEventListener('click', () => { lbShow(+b.dataset.lb); lb.showModal(); lenis?.stop(); }));
  $('.lb-close', lb).onclick = () => lb.close(); $('.lb-prev', lb).onclick = () => lbShow(lbi - 1); $('.lb-next', lb).onclick = () => lbShow(lbi + 1);
  lb.addEventListener('close', () => lenis?.start());
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') lbShow(lbi - 1); if (e.key === 'ArrowRight') lbShow(lbi + 1); });

  /* ---------- the loop ---------- */
  const prog = $('.bar-progress span');
  let lastY = -1, lastT = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    const y = scrollY;
    if (!lenis) velocity = (y - (lastY < 0 ? y : lastY)) / Math.max(dt * 60, 1);
    if (y !== lastY) {
      if (inView('hero', y)) heroUpdate(y);
      if (inView('words', y, vh)) wordsUpdate(y);
      if (inView('contact', y)) contactUpdate(y);
      prog.style.transform = `scaleX(${clamp(y / docH).toFixed(4)})`;
    }
    headerTheme(y);
    glassUpdate();
    if (inView('reel', y) && (y !== lastY || Math.abs(velocity) > 0.01)) reelUpdate(y);
    lastY = y;
    marqueeUpdate(dt);
    cursorUpdate(dt);
    if (lenis && Math.abs(velocity) > 0) velocity *= 0.9;
  }
  measure();
  addEventListener('resize', () => { measure(); moveInk(); lastY = -1; marquees.forEach(m => m.w = 0); });
  addEventListener('load', () => { measure(); lastY = -1; });
  new ResizeObserver(() => { measure(); lastY = -1; }).observe(document.body);
  requestAnimationFrame(frame);
})();
