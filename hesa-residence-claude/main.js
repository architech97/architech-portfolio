/* HESA — page motion: loader, smooth scroll, scroll-scrubbed hero, reveals, plan explorer, light wipe, reel */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const A = '../hesa-residence/assets/';
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    if (hasGsap) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { duration: 1.6 });
    }));
  }
  window.__lenis = lenis;

  /* section progress helper: 0 when section top hits viewport top, 1 when bottom hits viewport bottom */
  const progressOf = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };

  /* ---------- loader ---------- */
  const imgs = [A + 'asset-025.jpg', A + 'asset-022.jpg', A + 'hesa-logo.png'];
  let loaded = 0; const count = $('.loader-count'), bar = $('.loader-line span'), t0 = performance.now();
  const tick = () => { loaded++; const p = Math.round(loaded / imgs.length * 100); count.textContent = String(p).padStart(3, '0'); bar.style.width = p + '%'; if (loaded === imgs.length) done(); };
  imgs.forEach(src => { const i = new Image(); i.onload = i.onerror = tick; i.src = src; });
  setTimeout(() => loaded < imgs.length && done(), 6000);
  let finished = false;
  function done() {
    if (finished) return; finished = true;
    setTimeout(() => { document.body.classList.remove('is-loading'); intro(); }, Math.max(0, 1500 - (performance.now() - t0)));
  }
  function intro() {
    if (!hasGsap) { $$('.hero .line-inner').forEach(l => l.style.transform = 'none'); return; }
    gsap.to('.hero .line-inner', { y: 0, duration: 1.4, ease: 'expo.out', stagger: .12, delay: .35 });
    gsap.from('.hero .kicker, .hero-foot > *', { opacity: 0, y: 18, duration: 1.2, ease: 'expo.out', stagger: .08, delay: .7 });
    gsap.fromTo('.hero-img', { scale: 1.25 }, { scale: 1.12, duration: 2.6, ease: 'expo.out' });
  }

  /* ---------- hero: day -> dusk, scrubbed ---------- */
  const hero = $('#hero'), night = $('.hero-night'), media = $('.hero-media'), heroImgs = $$('.hero-img'),
    sun = $('.clock .sun'), time = $('.clock-time'), heroCopy = $('.hero-copy');
  function heroUpdate() {
    const p = progressOf(hero);
    const dusk = clamp((p - .12) / .55);
    night.style.opacity = dusk;
    const zoom = 1.12 - .08 * p;
    heroImgs.forEach(i => i.style.transform = `scale(${zoom})`);
    const inset = clamp((p - .72) / .28) * 6;
    media.style.clipPath = `inset(${inset}% ${inset}% ${inset}% ${inset}% round ${inset * 4}px)`;
    heroCopy.style.transform = `translateY(${-p * 80}px)`;
    // sun travels along the arc and sets
    const a = Math.PI * (1 - (.55 + dusk * .45));
    sun.setAttribute('cx', 60 + 54 * Math.cos(a)); sun.setAttribute('cy', 60 - 54 * Math.sin(a));
    sun.style.fill = dusk > .85 ? '#e8e2d6' : '#f2c98a';
    const mins = 16 * 60 + 40 + Math.round(dusk * 205); // 16:40 -> 20:05
    time.textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }

  /* ---------- manifesto: words light up ---------- */
  const words = $('[data-words]');
  words.innerHTML = words.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  const wordEls = $$('.w', words);
  function wordsUpdate() {
    const r = words.getBoundingClientRect();
    const p = clamp((innerHeight * .85 - r.top) / (r.height + innerHeight * .4));
    const n = Math.round(p * wordEls.length);
    wordEls.forEach((w, i) => w.style.opacity = i < n ? 1 : .14);
  }

  /* ---------- counters + heading reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target;
    if (el.dataset.count) {
      const to = +el.dataset.count, st = performance.now();
      const f = t => { const k = clamp((t - st) / 1400); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))).padStart(2, '0'); if (k < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    } else if (el.classList.contains('split') && hasGsap) {
      gsap.to($$('.line-inner', el), { y: 0, duration: 1.3, ease: 'expo.out', stagger: .1 });
    }
  }, { threshold: .35 }));
  $$('[data-count]').forEach(el => io.observe(el));
  // wrap split headings into masked lines (split on <em> boundary)
  $$('h2.split').forEach(h => {
    const parts = h.innerHTML.split(/(?=<em>)/);
    h.innerHTML = parts.map(p => `<span class="line"><span class="line-inner">${p.trim()}</span></span>`).join('');
    if (!hasGsap || reduce) $$('.line-inner', h).forEach(l => l.style.transform = 'none'); else io.observe(h);
  });

  /* ---------- plan explorer ---------- */
  const FLOORS = [
    { name: 'Ground floor', slide: 'source-slide-05.png', drawing: 'asset-026.jpg', rooms: [
      [1, 'Entry vestibule', '', 485, 200], [2, 'Living room', '23′ × 19′', 707, 160], [3, 'Dining area', '23′ × 15′3″', 727, 325],
      [4, 'Mandir', '', 485, 110], [5, 'Kitchen', '', 988, 155], [6, 'Master bedroom lounge', '11′5″ × 11′9″', 483, 357],
      [7, 'Master bedroom', '15′2″ × 18′7″', 330, 520], [8, 'Master toilet', '10′10″ × 8′11″', 527, 478], [9, 'Dresser', '10′2″ × 11′5″', 325, 358],
      [10, 'Bedroom', '13′7″ × 16′8″', 713, 505], [11, 'Toilet', '10′7″ × 8′11″', 527, 598], [12, 'Common toilet', '5′5″ × 9′7″', 807, 568]] },
    { name: 'First floor', slide: 'source-slide-06.png', drawing: 'asset-027.jpg', rooms: [
      [1, 'Family lounge', '19′5″ × 17′8″', 722, 310], [2, 'Vestibule', '', 570, 410], [3, 'Bedroom', '15′2″ × 13′9″', 415, 368],
      [3, 'Bedroom', '15′2″ × 16′8″', 360, 520], [3, 'Bedroom', '13′7″ × 16′8″', 698, 520], [4, 'Toilet', '6′6″ × 10′10″', 556, 300],
      [4, 'Toilet', '6′3″ × 10′7″', 535, 566], [4, 'Toilet', '5′5″ × 10′7″', 852, 566], [5, 'Terrace', '', 960, 124]] },
    { name: 'Second floor', slide: 'source-slide-07.png', drawing: 'asset-028.jpg', rooms: [
      [1, 'Terrace', '', 425, 445], [2, 'Home theatre', '', 702, 121], [3, 'Gaming zone', '', 767, 316],
      [4, 'Bedroom', '13′7″ × 16′8″', 681, 546], [5, 'Toilet', '5′5″ × 10′7″', 842, 604]] }
  ];
  const list = $('#room-list'), pins = $('#pins'), render = $('#plan-render'), drawing = $('#plan-drawing'),
    card = $('#plan-card'), flip = $('#flip'), caption = $('#plan-caption'), tabs = $$('.floor-tabs [role=tab]'), ink = $('.tab-ink');
  let floor = 0;
  function moveInk() { const b = tabs[floor]; ink.style.width = (b.offsetWidth - 24) + 'px'; ink.style.transform = `translateX(${b.offsetLeft}px)`; }
  function hot(i, on) { $$('li', list)[i]?.classList.toggle('hot', on); $$('.pin', pins)[i]?.classList.toggle('hot', on); }
  function showFloor(f, first) {
    floor = f; const F = FLOORS[f];
    tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === f))); moveInk();
    const apply = () => {
      render.src = A + F.slide; render.alt = `Rendered ${F.name.toLowerCase()} plan with numbered rooms`;
      drawing.src = A + F.drawing; drawing.alt = `${F.name} technical drawing`;
      caption.textContent = `${F.name} · ${card.classList.contains('flipped') ? 'technical drawing' : 'rendered plan'}`;
      list.innerHTML = F.rooms.map(r => `<li tabindex="0"><i>${String(r[0]).padStart(2, '0')}</i><span>${r[1]}</span><em>${r[2]}</em></li>`).join('');
      pins.innerHTML = F.rooms.map(r => `<button class="pin" style="left:${(r[3] - 241) / 859 * 100}%;top:${r[4] / 700 * 100}%" aria-label="${r[1]}">${r[0]}<span class="pin-tip">${r[1]}${r[2] ? ' · ' + r[2] : ''}</span></button>`).join('');
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
  addEventListener('resize', moveInk);
  showFloor(0, true);

  /* ---------- light wipe ---------- */
  const wipe = $('#wipe'); let dragging = false;
  const setWipe = x => { const r = wipe.getBoundingClientRect(); const v = clamp((x - r.left) / r.width) * 100; wipe.style.setProperty('--x', v + '%'); wipe.setAttribute('aria-valuenow', Math.round(v)); };
  wipe.addEventListener('pointerdown', e => { dragging = true; wipe.setPointerCapture(e.pointerId); setWipe(e.clientX); });
  wipe.addEventListener('pointermove', e => { if (dragging || e.pointerType === 'mouse') setWipe(e.clientX); });
  wipe.addEventListener('pointerup', () => dragging = false);
  wipe.addEventListener('keydown', e => {
    const v = +wipe.getAttribute('aria-valuenow'); const d = e.key === 'ArrowLeft' ? -5 : e.key === 'ArrowRight' ? 5 : 0;
    if (!d) return; e.preventDefault(); const n = clamp(v + d, 0, 100); wipe.style.setProperty('--x', n + '%'); wipe.setAttribute('aria-valuenow', n);
  });
  // a little intro sweep when it first appears
  new IntersectionObserver((es, o) => es.forEach(e => {
    if (!e.isIntersecting || reduce || !hasGsap) return; o.disconnect();
    const s = { v: 85 }; gsap.to(s, { v: 50, duration: 1.8, ease: 'expo.inOut', onUpdate: () => wipe.style.setProperty('--x', s.v + '%') });
  }), { threshold: .5 }).observe(wipe);

  /* ---------- horizontal reel ---------- */
  const reel = $('#reel'), track = $('#reel-track'), reelN = $('#reel-n'), reelImgs = $$('.reel-item img');
  function reelUpdate() {
    const p = progressOf(reel);
    const max = track.scrollWidth - innerWidth;
    track.style.transform = `translate3d(${-p * max}px,0,0)`;
    reelN.textContent = String(Math.min(5, 1 + Math.floor(p * 5))).padStart(2, '0');
    reelImgs.forEach(img => { const r = img.parentElement.getBoundingClientRect(); const c = (r.left + r.width / 2 - innerWidth / 2) / innerWidth; img.style.transform = `scale(1.18) translateX(${c * -8}%)`; });
  }

  /* ---------- services image follows cursor ---------- */
  const float = $('.service-float'), fimg = $('img', float); let fx = 0, fy = 0, tx = 0, ty = 0;
  $$('#services li').forEach(li => {
    li.addEventListener('mouseenter', () => { fimg.src = li.dataset.img; float.classList.add('on'); });
    li.addEventListener('mouseleave', () => float.classList.remove('on'));
  });
  addEventListener('pointermove', e => { tx = e.clientX + 30; ty = e.clientY - 100; });
  const followLoop = () => { fx += (tx - fx) * .14; fy += (ty - fy) * .14; float.style.transform = `translate(${fx}px,${fy}px) ${float.classList.contains('on') ? 'scale(1)' : 'scale(.8)'}`; requestAnimationFrame(followLoop); };
  requestAnimationFrame(followLoop);

  /* ---------- contact parallax ---------- */
  const cImg = $('.contact-media img'), contact = $('#contact');
  const contactUpdate = () => { const r = contact.getBoundingClientRect(); const p = clamp(1 - r.top / innerHeight, 0, 2); cImg.style.transform = `scale(1.15) translateY(${(p - 1) * -6}%)`; };

  /* ---------- lightbox ---------- */
  const LB = [['asset-025.jpg', 'The arrival, by day'], ['asset-022.jpg', 'The arrival, after dark'], ['asset-024.jpg', 'The curved porch, by day'], ['asset-023.jpg', 'The curved porch, after dark']];
  const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('.lb-cap', lb); let lbi = 0;
  const lbShow = i => { lbi = (i + LB.length) % LB.length; lbImg.src = A + LB[lbi][0]; lbImg.alt = LB[lbi][1]; lbCap.textContent = `${String(lbi + 1).padStart(2, '0')} / 04 · ${LB[lbi][1]}`; };
  $$('[data-lb]').forEach(b => b.addEventListener('click', () => { lbShow(+b.dataset.lb); lb.showModal(); lenis?.stop(); }));
  $('.lb-close', lb).onclick = () => lb.close(); $('.lb-prev', lb).onclick = () => lbShow(lbi - 1); $('.lb-next', lb).onclick = () => lbShow(lbi + 1);
  lb.addEventListener('close', () => lenis?.start());
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') lbShow(lbi - 1); if (e.key === 'ArrowRight') lbShow(lbi + 1); });

  /* ---------- frame loop for scroll-linked pieces ---------- */
  const prog = $('.bar-progress span');
  function frame() {
    heroUpdate(); wordsUpdate(); reelUpdate(); contactUpdate();
    prog.style.transform = `scaleX(${clamp(scrollY / (document.documentElement.scrollHeight - innerHeight))})`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
