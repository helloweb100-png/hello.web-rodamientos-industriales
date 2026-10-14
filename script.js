/* =====================================================================
   RODAMIENTOS INDUSTRIALES GEMINIS
   Interacciones: loader, scroll suave (Lenis), animaciones de scroll
   (GSAP + ScrollTrigger), canvas del rodamiento y particulas, decodificador
   de claves, acordeones y formulario hacia WhatsApp.
   Degradacion: sin GSAP/Lenis la pagina sigue siendo legible y funcional.
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);

  const WA_NUMBER = '525530454203';

  let lenis = null;
  let menuOpen = false;
  const fx = { boost: 1, intro: 0 }; // boost: velocidad del rodamiento ligada al scroll

  /* ------------------------------------------------------------------
     WhatsApp: arma cada enlace con su mensaje precargado
     ------------------------------------------------------------------ */
  function initWhatsApp() {
    $$('a[data-wa]').forEach((a) => {
      a.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(a.dataset.wa)}`;
    });
    const wa = $('.wa');
    if (wa && !reduce) {
      setTimeout(() => {
        wa.classList.add('is-peek');
        setTimeout(() => wa.classList.remove('is-peek'), 4200);
      }, 9000);
    }
  }

  /* Boton: el relleno entra y sale por el lado del cursor */
  function initButtons() {
    if (!fine) return;
    $$('.btn').forEach((b) => {
      const side = (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--o', e.clientX - r.left > r.width / 2 ? 'right' : 'left');
      };
      b.addEventListener('pointerenter', side);
      b.addEventListener('pointerleave', side);
    });
  }

  /* ------------------------------------------------------------------
     Scroll suave
     ------------------------------------------------------------------ */
  function initSmooth() {
    if (reduce || !window.Lenis) return;
    lenis = new window.Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    lenis.stop(); // detenido mientras corre el loader
    if (hasGSAP) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollToTarget(target, immediate) {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: immediate ? 0 : 1.6, immediate: Boolean(immediate) });
    else target.scrollIntoView({ behavior: reduce || immediate ? 'auto' : 'smooth', block: 'start' });
  }

  function initAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id.length < 2) return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        if (menuOpen) setMenu(false);
        scrollToTarget(id === '#inicio' ? document.body : target);
        history.replaceState(null, '', id);
      });
    });
  }

  /* ------------------------------------------------------------------
     Navegacion, menu movil y barra de progreso
     ------------------------------------------------------------------ */
  function setMenu(open) {
    const burger = $('#burger'), menu = $('#menu'), nav = $('#nav');
    if (!burger || !menu) return;
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if (open) nav.classList.remove('is-hidden');
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    else document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('a', menu).focus({ preventScroll: true });
  }

  function initNav() {
    const nav = $('#nav'), burger = $('#burger');
    if (!nav) return;
    if (burger) burger.addEventListener('click', () => setMenu(!menuOpen));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
    window.addEventListener('resize', () => { if (menuOpen && window.innerWidth >= 1100) setMenu(false); });

    const update = (y, dir) => {
      nav.classList.toggle('is-scrolled', y > 8);
      nav.classList.toggle('is-hidden', y > 480 && dir === 1 && !menuOpen);
    };
    if (hasGSAP) {
      window.ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => update(self.scroll(), self.direction) });
    } else {
      let last = 0;
      window.addEventListener('scroll', () => { const y = window.scrollY; update(y, y > last ? 1 : -1); last = y; }, { passive: true });
    }

    // Enlace activo segun la seccion visible
    if (hasGSAP) {
      $$('.nav__links a').forEach((link) => {
        const sec = $(link.getAttribute('href'));
        if (!sec) return;
        window.ScrollTrigger.create({
          trigger: sec, start: 'top 55%', end: 'bottom 55%',
          onToggle: (self) => link.classList.toggle('is-active', self.isActive),
        });
      });
    }
  }

  function initProgress() {
    if (!hasGSAP || reduce) return;
    window.gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.25 } });
  }

  /* ------------------------------------------------------------------
     Loader con progreso simulado y salida en cortina
     ------------------------------------------------------------------ */
  function runLoader() {
    return new Promise((resolve) => {
      const loader = $('#loader');
      if (!loader) { document.body.classList.remove('is-loading'); resolve(); return; }
      const countEl = $('#ldCount'), statusEl = $('#ldStatus');
      const msgs = ['Calibrando tolerancias', 'Verificando inventario', 'Alineando ejes', 'Lubricando el catálogo', 'Todo listo'];
      const minMs = reduce ? 400 : 2600;
      const start = performance.now();
      let ready = false, shown = 0, finished = false;

      const loaded = new Promise((r) => {
        if (document.readyState === 'complete') r();
        else window.addEventListener('load', r, { once: true });
      });
      const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.all([loaded, fonts]).then(() => { ready = true; });
      setTimeout(() => { ready = true; }, 7000); // salvavidas si algun recurso externo tarda

      const finish = () => {
        if (finished) return;
        finished = true;
        countEl.textContent = '100';
        statusEl.textContent = msgs[msgs.length - 1];
        loader.style.setProperty('--p', '1');
        setTimeout(() => {
          loader.classList.add('is-done');
          document.body.classList.remove('is-loading');
          resolve();
          setTimeout(() => loader.classList.add('is-gone'), 1500);
        }, 350);
      };

      const tick = (now) => {
        const t = clamp((now - start) / minMs, 0, 1);
        let target = easeOut(t) * 100;
        if (!ready) target = Math.min(target, 92);
        shown = lerp(shown, target, 0.14);
        const pct = Math.min(100, Math.round(shown));
        countEl.textContent = pct;
        loader.style.setProperty('--p', (shown / 100).toFixed(4));
        statusEl.textContent = msgs[Math.min(msgs.length - 2, Math.floor((shown / 100) * (msgs.length - 1)))];
        if (ready && t >= 1 && shown > 99.4) finish();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ------------------------------------------------------------------
     Utilidades de texto
     ------------------------------------------------------------------ */
  function splitWords(el) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'sw';
            const i = document.createElement('span'); i.className = 'sw__i'; i.textContent = tok;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  }

  /* ------------------------------------------------------------------
     HERO: canvas del rodamiento (rotacion real: la jaula gira al 40% del eje)
     y campo de particulas con red de lineas
     ------------------------------------------------------------------ */
  function prepareHero() {
    if (!hasGSAP || reduce) { fx.intro = 1; return; }
    const g = window.gsap;
    $('.hero').classList.add('hero-prep');
    g.set('.hl__i', { yPercent: 115 });
    g.set(['.kicker', '.hero__sub', '.hero__cta .btn'], { opacity: 0, y: 26 });
    g.set('#bearing', { opacity: 0, scale: 0.88 });
  }

  function playHero() {
    const stage = $('#stage');
    if (stage) stage.classList.add('is-in');
    if (!hasGSAP || reduce) { fx.intro = 1; return; }
    const g = window.gsap;
    const tl = g.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => $('.hero').classList.remove('hero-prep') });
    tl.to('.hl__i', { yPercent: 0, duration: 1.4, stagger: 0.14 }, 0)
      .to('.kicker', { opacity: 1, y: 0, duration: 1, clearProps: 'opacity,transform' }, 0.05)
      .to('.hero__sub', { opacity: 1, y: 0, duration: 1, clearProps: 'opacity,transform' }, 0.5)
      .to('.hero__cta .btn', { opacity: 1, y: 0, duration: 1, stagger: 0.1, clearProps: 'opacity,transform' }, 0.65)
      .to('#bearing', { opacity: 1, scale: 1, duration: 1.6 }, 0)
      .to(fx, { intro: 1, duration: 2.4, ease: 'power3.out' }, 0);
  }

  function initHero() {
    const hero = $('#inicio'), fxCv = $('#fx'), cv = $('#bearing'), stage = $('#stage');
    if (!hero || !fxCv || !cv || !stage) return;
    const fctx = fxCv.getContext('2d');
    const c = cv.getContext('2d');
    const conic = typeof c.createConicGradient === 'function';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0, H = 0, S = 0, particles = [];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: -999, py: -999, mx: 0, my: 0, dirty: false };
    const ang = { inner: 0, cage: 0, ticks: 0, glint: 0 };

    const makeParticle = () => {
      const r = Math.random();
      return {
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.3) * 0.22, vy: (Math.random() - 0.7) * 0.22,
        s: 1 + Math.random() * 1.8, k: r < 0.07 ? 2 : r < 0.5 ? 1 : 0, tw: Math.random() * TAU,
      };
    };

    function resize() {
      const hr = hero.getBoundingClientRect();
      W = hr.width; H = hr.height;
      fxCv.width = Math.round(W * dpr); fxCv.height = Math.round(H * dpr);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S = cv.offsetWidth;
      cv.width = Math.round(S * dpr); cv.height = Math.round(S * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((W * H) / 22000, 28, 90));
      particles = Array.from({ length: n }, makeParticle);
    }

    /* --- utilidades de dibujo --- */
    const withStops = (g, arr) => { arr.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    const annulus = (x, y, r0, r1) => { c.beginPath(); c.arc(x, y, r1, 0, TAU); c.arc(x, y, r0, 0, TAU, true); };
    const glint = (x, y, r0, r1, a, i1, i2) => {
      if (!conic) return;
      const g = c.createConicGradient(a, x, y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.03, `rgba(255,255,255,${i1})`);
      g.addColorStop(0.09, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.addColorStop(0.53, `rgba(255,255,255,${i2})`);
      g.addColorStop(0.6, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      annulus(x, y, r0, r1); c.fillStyle = g; c.fill();
    };

    function drawBearing(time) {
      const k = easeOut(clamp(fx.intro, 0, 1));
      const R = S * 0.31 * (0.8 + 0.2 * k);
      const cx = S / 2, cy = S / 2;
      const px = pointer.x, py = pointer.y;
      c.clearRect(0, 0, S, S);

      // ondas de radar
      for (let i = 0; i < 3; i++) {
        const p = (time * 0.2 + i / 3) % 1;
        c.beginPath(); c.arc(cx, cy, R * (1.12 + p * 0.34), 0, TAU);
        c.strokeStyle = `rgba(26,86,214,${((1 - p) * 0.3 * k).toFixed(3)})`; c.lineWidth = 1.2; c.stroke();
      }

      // plano tecnico: ejes, circulo primitivo y anillo de medicion
      c.save();
      c.translate(px * 10, py * 10);
      c.strokeStyle = `rgba(11,63,168,${(0.3 * k).toFixed(3)})`; c.lineWidth = 1; c.setLineDash([4, 7]);
      c.beginPath();
      c.moveTo(cx - R * 1.55, cy); c.lineTo(cx + R * 1.55, cy);
      c.moveTo(cx, cy - R * 1.55); c.lineTo(cx, cy + R * 1.55);
      c.stroke();
      c.beginPath(); c.arc(cx, cy, R * 0.715, 0, TAU); c.stroke();
      c.setLineDash([]);
      c.translate(cx, cy); c.rotate(ang.ticks);
      const tr = R * 1.12;
      c.strokeStyle = `rgba(11,63,168,${(0.55 * k).toFixed(3)})`; c.fillStyle = `rgba(11,63,168,${(0.75 * k).toFixed(3)})`;
      c.beginPath();
      for (let i = 0; i < 72; i++) {
        const a = (i * TAU) / 72, r1 = tr + R * (i % 6 === 0 ? 0.075 : 0.035);
        c.moveTo(Math.cos(a) * tr, Math.sin(a) * tr); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      }
      c.stroke();
      c.font = `500 ${Math.max(8, S * 0.0145)}px "JetBrains Mono", monospace`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < 12; i++) {
        c.save(); c.rotate((i * TAU) / 12); c.translate(tr + R * 0.17, 0); c.rotate(Math.PI / 2);
        c.fillText(String(i * 30), 0, 0); c.restore();
      }
      c.restore();

      // sombra proyectada
      const sh = c.createRadialGradient(cx + R * 0.05, cy + R * 0.08, R * 0.8, cx + R * 0.05, cy + R * 0.08, R * 1.1);
      sh.addColorStop(0, `rgba(6,26,74,${(0.2 * k).toFixed(3)})`); sh.addColorStop(1, 'rgba(6,26,74,0)');
      c.fillStyle = sh; c.beginPath(); c.arc(cx + R * 0.05, cy + R * 0.08, R * 1.1, 0, TAU); c.fill();

      // aro exterior (fijo)
      const ox = cx + px * 3, oy = cy + py * 3;
      annulus(ox, oy, R * 0.83, R);
      c.fillStyle = withStops(c.createRadialGradient(ox, oy, R * 0.83, ox, oy, R),
        [[0, '#8e9bb2'], [0.2, '#e6ecf5'], [0.5, '#ffffff'], [0.8, '#c6cfde'], [1, '#7f8ca4']]);
      c.fill();
      glint(ox, oy, R * 0.83, R, ang.glint, 0.95, 0.6);
      c.lineWidth = 1.2; c.strokeStyle = '#6a7791'; c.beginPath(); c.arc(ox, oy, R, 0, TAU); c.stroke();
      c.lineWidth = 1; c.strokeStyle = 'rgba(60,75,100,.55)'; c.beginPath(); c.arc(ox, oy, R * 0.83, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(60,75,100,.22)'; c.beginPath(); c.arc(ox, oy, R * 0.9, 0, TAU); c.stroke();

      // jaula y esferas
      const n = 9, pr = R * 0.715, br = R * 0.135 * k;
      c.lineWidth = Math.max(1.5, R * 0.014); c.strokeStyle = `rgba(11,63,168,${(0.9 * k).toFixed(3)})`;
      c.beginPath(); c.arc(cx, cy, pr, 0, TAU); c.stroke();
      for (let i = 0; i < n; i++) {
        const a = ang.cage + ((i + 0.5) * TAU) / n;
        c.beginPath(); c.arc(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr, R * 0.022 * k, 0, TAU);
        c.fillStyle = '#0b3fa8'; c.fill();
      }
      for (let i = 0; i < n; i++) {
        const a = ang.cage + (i * TAU) / n;
        const bx = cx + Math.cos(a) * pr, by = cy + Math.sin(a) * pr;
        const sg = c.createRadialGradient(bx + br * 0.2, by + br * 0.3, br * 0.2, bx + br * 0.2, by + br * 0.3, br * 1.35);
        sg.addColorStop(0, 'rgba(6,26,74,.3)'); sg.addColorStop(1, 'rgba(6,26,74,0)');
        c.fillStyle = sg; c.beginPath(); c.arc(bx + br * 0.2, by + br * 0.3, br * 1.35, 0, TAU); c.fill();
        c.fillStyle = withStops(c.createRadialGradient(bx - br * 0.38, by - br * 0.4, br * 0.08, bx, by, br),
          [[0, '#ffffff'], [0.3, '#eef2f8'], [0.7, '#b3bfd1'], [1, '#5d6b86']]);
        c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill();
        c.lineWidth = 1; c.strokeStyle = 'rgba(40,55,85,.5)'; c.stroke();
        c.beginPath(); c.arc(bx, by, br * 0.82, 0.15, 1.2);
        c.strokeStyle = 'rgba(26,86,214,.38)'; c.lineWidth = Math.max(1, br * 0.16); c.stroke();
      }

      // aro interior, eje y marca roja (giran juntos)
      const ix = cx - px * 5, iy = cy - py * 5;
      annulus(ix, iy, R * 0.48, R * 0.6);
      c.fillStyle = withStops(c.createRadialGradient(ix, iy, R * 0.48, ix, iy, R * 0.6),
        [[0, '#8e9bb2'], [0.25, '#dfe6f0'], [0.55, '#ffffff'], [1, '#98a5bc']]);
      c.fill();
      glint(ix, iy, R * 0.48, R * 0.6, -ang.glint * 1.7, 0.9, 0.5);
      c.lineWidth = 1; c.strokeStyle = 'rgba(60,75,100,.55)';
      c.beginPath(); c.arc(ix, iy, R * 0.6, 0, TAU); c.stroke();
      c.beginPath(); c.arc(ix, iy, R * 0.48, 0, TAU); c.stroke();

      c.save();
      c.translate(ix, iy); c.rotate(ang.inner);
      c.strokeStyle = 'rgba(60,75,100,.5)'; c.lineWidth = 1; c.beginPath();
      for (let i = 0; i < 36; i++) {
        const a = (i * TAU) / 36;
        c.moveTo(Math.cos(a) * R * 0.585, Math.sin(a) * R * 0.585); c.lineTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6);
      }
      c.stroke();
      c.beginPath(); c.arc(0, 0, R * 0.572, -0.25, 0.25);
      c.strokeStyle = '#c8101c'; c.lineWidth = R * 0.03; c.lineCap = 'butt'; c.stroke();
      c.restore();

      c.fillStyle = withStops(c.createRadialGradient(ix - R * 0.1, iy - R * 0.12, R * 0.02, ix, iy, R * 0.48),
        [[0, '#3b78f0'], [0.55, '#0b3fa8'], [1, '#061a4a']]);
      c.beginPath(); c.arc(ix, iy, R * 0.48, 0, TAU); c.fill();
      c.save();
      c.translate(ix, iy); c.rotate(ang.inner);
      c.fillStyle = '#061a4a'; c.fillRect(-R * 0.045, -R * 0.48, R * 0.09, R * 0.08);
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-R * 0.3, 0); c.lineTo(R * 0.3, 0); c.moveTo(0, -R * 0.3); c.lineTo(0, R * 0.3); c.stroke();
      c.beginPath(); c.arc(0, 0, R * 0.06, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
      c.restore();
    }

    function drawFx(dt, time) {
      fctx.clearRect(0, 0, W, H);
      const speed = dt * 60 * (1 + (fx.boost - 1) * 0.25);
      const PR = 120;
      for (const p of particles) {
        p.x += p.vx * speed; p.y += p.vy * speed;
        const dx = p.x - pointer.px, dy = p.y - pointer.py, d2 = dx * dx + dy * dy;
        if (d2 < PR * PR) { const d = Math.sqrt(d2) || 1, f = (1 - d / PR) * 1.6; p.x += (dx / d) * f; p.y += (dy / d) * f; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      }
      fctx.lineWidth = 1;
      const L = 110;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if (a.k === 2) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          if (b.k === 2) continue;
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < L * L) {
            fctx.strokeStyle = `rgba(11,63,168,${(0.16 * (1 - Math.sqrt(d2) / L)).toFixed(3)})`;
            fctx.beginPath(); fctx.moveTo(a.x, a.y); fctx.lineTo(b.x, b.y); fctx.stroke();
          }
        }
      }
      for (const p of particles) {
        const tw = 0.65 + 0.35 * Math.sin(time * 2 + p.tw);
        fctx.fillStyle = p.k === 2 ? `rgba(200,16,28,${(0.75 * tw).toFixed(3)})`
          : p.k === 1 ? `rgba(110,125,150,${(0.6 * tw).toFixed(3)})` : `rgba(11,63,168,${(0.5 * tw).toFixed(3)})`;
        fctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
    }

    let raf = 0, running = false, last = performance.now();
    const t0 = last;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const time = (now - t0) / 1000;
      pointer.x = lerp(pointer.x, pointer.tx, 0.06); pointer.y = lerp(pointer.y, pointer.ty, 0.06);
      stage.style.setProperty('--rx', (pointer.x * 7).toFixed(2));
      stage.style.setProperty('--ry', (pointer.y * 7).toFixed(2));
      if (pointer.dirty) { hero.style.setProperty('--mx', `${pointer.mx}px`); hero.style.setProperty('--my', `${pointer.my}px`); pointer.dirty = false; }
      ang.inner += dt * 0.9 * fx.boost;
      ang.cage += dt * 0.9 * 0.4 * fx.boost; // la jaula gira al ~40% de la velocidad del eje
      ang.ticks -= dt * 0.12;
      ang.glint += dt * 0.35;
      drawFx(dt, time);
      drawBearing(time);
      if (running) raf = requestAnimationFrame(frame);
    }
    const start = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (!running) frame(performance.now()); }, 150); });

    hero.addEventListener('pointermove', (e) => {
      const hr = hero.getBoundingClientRect();
      pointer.px = e.clientX - hr.left; pointer.py = e.clientY - hr.top;
      pointer.mx = pointer.px; pointer.my = pointer.py; pointer.dirty = true;
      const sr = stage.getBoundingClientRect();
      pointer.tx = clamp((e.clientX - (sr.left + sr.width / 2)) / (window.innerWidth * 0.5), -1, 1);
      pointer.ty = clamp((e.clientY - (sr.top + sr.height / 2)) / (window.innerHeight * 0.5), -1, 1);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; pointer.px = -999; pointer.py = -999; });

    if (reduce) { fx.intro = 1; drawBearing(1.4); drawFx(0, 0); return; }

    // El bucle solo corre mientras el hero es visible
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => entries[0].isIntersecting ? start() : stop(), { threshold: 0 }).observe(hero);
    } else start();

    if (hasGSAP) {
      window.gsap.to(fx, { boost: 5, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      window.gsap.to('.hero__copy', { yPercent: -10, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }
  }

  /* ------------------------------------------------------------------
     Reveals por scroll
     ------------------------------------------------------------------ */
  function initReveals() {
    $$('[data-split]').forEach((el) => splitWords(el));
    if (!hasGSAP || reduce) return;
    const g = window.gsap, ST = window.ScrollTrigger;

    $$('[data-split]').forEach((el) => {
      const words = $$('.sw__i', el);
      g.set(words, { yPercent: 115 });
      ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => g.to(words, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.05 }) });
    });

    ST.batch('[data-reveal]', {
      start: 'top 91%',
      once: true,
      onEnter: (batch) => g.to(batch, {
        opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, overwrite: true,
        onComplete: () => batch.forEach((el) => {
          el.classList.add('is-revealed');
          el.style.removeProperty('opacity');
          el.style.removeProperty('transform');
        }),
      }),
    });
  }

  function initCounters() {
    $$('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count);
      const fmt = (n) => Math.round(n).toLocaleString('es-MX');
      if (!hasGSAP || reduce) { el.textContent = fmt(end); return; }
      const o = { v: 0 };
      el.textContent = '0';
      window.ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: () => window.gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } }),
      });
    });
  }

  function initParallax() {
    if (!hasGSAP || reduce) return;
    $$('[data-parallax]').forEach((img) => {
      const m = clamp(parseFloat(img.dataset.parallax) || 0.1, -0.2, 0.2) * 0.6;
      window.gsap.fromTo(img, { yPercent: -m * 100 }, {
        yPercent: m * 100, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  /* ------------------------------------------------------------------
     Imagen que se abre en grande con el scroll (pin + scrub)
     ------------------------------------------------------------------ */
  function initExpand() {
    const sec = $('.expand');
    const heading = $('.expand__h');
    if (heading) splitWords(heading);
    if (!sec || !hasGSAP || reduce) return;
    const g = window.gsap;
    const mm = g.matchMedia();
    mm.add('(min-width: 0px)', () => {
      const wide = window.innerWidth >= 768;
      const words = $$('.sw__i', heading);
      g.set('.expand__img', { scale: 1.35 });
      g.set(words, { opacity: 0.16 });
      g.set('.expand__more', { opacity: 0, y: 30 });
      const tl = g.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: sec, start: 'top top', end: '+=170%', pin: '.expand__pin', scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
      });
      tl.fromTo('.expand__media',
        { clipPath: wide ? 'inset(22% 30% 22% 30%)' : 'inset(24% 8% 24% 8%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, 0)
        .to('.expand__img', { scale: 1, duration: 1, ease: 'power2.out' }, 0)
        .to(words, { opacity: 1, stagger: 0.09, duration: 0.4 }, 0.1)
        .to('.expand__more', { opacity: 1, y: 0, duration: 0.5 }, 1.05);
    });
  }

  /* ------------------------------------------------------------------
     Catalogo: pan horizontal fijado (escritorio) o carrusel nativo (movil)
     ------------------------------------------------------------------ */
  function initCatalog() {
    const sec = $('.cat');
    if (!sec) return;
    const track = $('.cat__track', sec), pin = $('.cat__pin', sec);
    const panels = $$('.panel', track);

    // Luz que sigue al cursor dentro de cada tarjeta
    panels.forEach((p) => p.addEventListener('pointermove', (e) => {
      const r = p.getBoundingClientRect();
      p.style.setProperty('--mx', `${e.clientX - r.left}px`);
      p.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true }));

    if (!hasGSAP || reduce) return;
    const g = window.gsap, ST = window.ScrollTrigger;
    const mm = g.matchMedia();

    mm.add('(min-width: 900px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = g.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      panels.forEach((p) => {
        const draws = $$('.draw', p);
        if (!draws.length) return;
        g.set(draws, { strokeDashoffset: 1 });
        const play = () => g.to(draws, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.1 });
        // Las tarjetas que ya estan a la vista al fijar la seccion se dibujan al acercarse;
        // las demas se dibujan cuando el pan horizontal las alcanza.
        const early = p.getBoundingClientRect().left < window.innerWidth * 0.9;
        ST.create(early
          ? { trigger: pin, start: 'top 65%', once: true, onEnter: play }
          : { trigger: p, containerAnimation: tween, start: 'left 88%', once: true, onEnter: play });
      });
    });

    mm.add('(max-width: 899px)', () => {
      ST.create({
        trigger: track, start: 'top 85%', once: true,
        onEnter: () => g.from($$('.draw', track), { strokeDashoffset: 1, duration: 1.6, ease: 'power2.inOut', stagger: 0.03 }),
      });
    });
  }

  /* ------------------------------------------------------------------
     Decodificador de claves de rodamiento
     ------------------------------------------------------------------ */
  const DECODER = [
    {
      spec: ['25 mm', '52 mm', '15 mm'],
      parts: [
        { t: '6', h: 'Rodamiento rígido de bolas', p: 'El tipo más común. Soporta carga radial y algo de carga axial, incluso a altas velocidades.' },
        { t: '2', h: 'Serie de dimensiones 02 (ligera)', p: 'Define el ancho y el diámetro exterior para un mismo diámetro interior.' },
        { t: '05', h: 'Diámetro interior de 25 mm', p: 'A partir de 04, la cifra se multiplica por 5. Aquí 05 x 5 = 25 mm.' },
        { dash: true },
        { t: '2RS', h: 'Dos sellos de hule', p: 'Protegen contra el polvo y retienen la grasa de fábrica. Si ves 2Z, los sellos son metálicos.' },
      ],
    },
    {
      spec: ['60 mm', '110 mm', '28 mm'],
      parts: [
        { t: '222', h: 'Rodamiento de rodillos esféricos', p: 'Soporta cargas radiales pesadas y tolera desalineación del eje. Es el tipo para aplicaciones exigentes.' },
        { t: '12', h: 'Diámetro interior de 60 mm', p: 'La cifra se multiplica por 5. Aquí 12 x 5 = 60 mm.' },
        { gap: true },
        { t: 'E', h: 'Diseño interno reforzado', p: 'El sufijo E indica un diseño optimizado con mayor capacidad de carga. Cada marca tiene sus propios sufijos.' },
      ],
    },
    {
      spec: ['30 mm', '55 mm', '17 mm'],
      parts: [
        { t: '3', h: 'Rodamiento de rodillos cónicos', p: 'Soporta cargas radiales y axiales combinadas. Suele montarse en pares, como en ruedas y reductores.' },
        { t: '20', h: 'Serie de dimensiones 20', p: 'Combina ancho y diámetro exterior. Cambiar de serie cambia el tamaño sin cambiar el interior.' },
        { t: '06', h: 'Diámetro interior de 30 mm', p: 'La cifra se multiplica por 5. Aquí 06 x 5 = 30 mm.' },
      ],
    },
  ];

  function initDecoder() {
    const tool = $('.dec__tool');
    if (!tool) return;
    const tabs = $$('[role="tab"]', tool);
    const code = $('#decCode'), title = $('#decTitle'), text = $('#decText');
    const dD = $('#decD'), dOD = $('#decOD'), dB = $('#decB');
    let cur = 0, seg = 0, touched = false, timer = null, visible = false;

    const segs = () => DECODER[cur].parts.filter((p) => p.t);

    function select(k, animate) {
      seg = k;
      $$('.seg', code).forEach((b, j) => b.classList.toggle('is-on', j === k));
      const p = segs()[k];
      if (hasGSAP && !reduce && animate) window.gsap.fromTo([title, text], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' });
      title.textContent = p.h; text.textContent = p.p;
    }

    function render(i) {
      cur = i;
      tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
      code.innerHTML = '';
      let n = 0;
      DECODER[i].parts.forEach((p) => {
        if (p.dash || p.gap) {
          const s = document.createElement('span'); s.className = 'dash'; s.setAttribute('aria-hidden', 'true');
          s.innerHTML = p.dash ? '-' : '&nbsp;'; code.appendChild(s); return;
        }
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'seg'; b.dataset.s = String(n++); b.textContent = p.t; code.appendChild(b);
      });
      [dD.textContent, dOD.textContent, dB.textContent] = DECODER[i].spec;
      select(0, false);
    }

    const stopAuto = () => { touched = true; clearInterval(timer); };
    const startAuto = () => {
      if (reduce || touched || timer) return;
      timer = setInterval(() => { if (visible && !touched) select((seg + 1) % segs().length, true); }, 3200);
    };

    code.addEventListener('click', (e) => {
      const b = e.target.closest('.seg');
      if (!b) return;
      stopAuto(); select(Number(b.dataset.s), true);
    });
    tabs.forEach((t) => t.addEventListener('click', () => { stopAuto(); render(Number(t.dataset.i)); }));

    render(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) startAuto(); }, { threshold: 0.35 }).observe(tool);
    }
  }

  /* ------------------------------------------------------------------
     Proceso: la linea se dibuja con el scroll y activa cada paso
     ------------------------------------------------------------------ */
  function initProcess() {
    const rail = $('#procRail');
    if (!rail) return;
    const steps = $$('.step', rail);
    if (!hasGSAP || reduce) { steps.forEach((s) => s.classList.add('is-on')); rail.style.setProperty('--p', '1'); return; }
    const g = window.gsap;
    g.set(rail, { '--p': 0 });
    g.to(rail, {
      '--p': 1, ease: 'none',
      scrollTrigger: {
        trigger: rail, start: 'top 72%', end: 'bottom 62%', scrub: 0.5,
        onUpdate: (self) => steps.forEach((s, i) => s.classList.toggle('is-on', self.progress >= i / steps.length + 0.03)),
      },
    });
  }

  /* ------------------------------------------------------------------
     Industrias (acordeon de imagenes) y preguntas frecuentes
     ------------------------------------------------------------------ */
  let refreshTimer;
  const softRefresh = (ms = 750) => {
    if (!hasGSAP) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => window.ScrollTrigger.refresh(), ms);
  };

  function initIndustries() {
    const list = $('#indList');
    if (!list) return;
    const items = $$('.ind__item', list);
    const activate = (el) => {
      if (el.classList.contains('is-active')) return;
      items.forEach((i) => i.classList.toggle('is-active', i === el));
      if (window.innerWidth < 900) softRefresh(900);
    };
    items.forEach((it) => {
      it.addEventListener('mouseenter', () => { if (fine) activate(it); });
      it.addEventListener('focus', () => activate(it));
      it.addEventListener('click', () => activate(it));
    });
  }

  function initFAQ() {
    const list = $$('.qa');
    list.forEach((qa, idx) => {
      const btn = $('.qa__q', qa);
      if (idx === 0) { qa.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
      btn.addEventListener('click', () => {
        const open = !qa.classList.contains('is-open');
        list.forEach((o) => {
          if (o !== qa) { o.classList.remove('is-open'); $('.qa__q', o).setAttribute('aria-expanded', 'false'); }
        });
        qa.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        softRefresh(750);
      });
    });
  }

  /* ------------------------------------------------------------------
     Formulario: valida y abre WhatsApp con la solicitud armada
     ------------------------------------------------------------------ */
  function initForm() {
    const form = $('#quoteForm');
    if (!form) return;
    const rules = {
      nombre: (v) => v.trim().length >= 3 || 'Escribe tu nombre completo.',
      linea: (v) => Boolean(v) || 'Elige qué línea necesitas.',
      clave: (v) => v.trim().length >= 2 || 'Indica la clave o las medidas.',
    };
    const check = (name) => {
      const el = form.elements[name];
      const res = rules[name](el.value);
      const field = el.closest('.field');
      const err = $('.err', field);
      if (res !== true) { field.classList.add('has-err'); err.textContent = res; el.setAttribute('aria-invalid', 'true'); return false; }
      field.classList.remove('has-err'); err.textContent = ''; el.removeAttribute('aria-invalid');
      return true;
    };
    Object.keys(rules).forEach((name) => {
      const el = form.elements[name];
      el.addEventListener('blur', () => { if (el.value) check(name); });
      el.addEventListener('input', () => { if (el.closest('.field').classList.contains('has-err')) check(name); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = Object.keys(rules).map(check).every(Boolean);
      if (!ok) { const bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
      const d = Object.fromEntries(new FormData(form).entries());
      const lines = [
        `Hola, soy ${d.nombre.trim()}${d.empresa && d.empresa.trim() ? ` de ${d.empresa.trim()}` : ''}.`,
        `Necesito cotizar: ${d.linea}.`,
        `Clave o medidas: ${d.clave.trim()}.`,
      ];
      if (d.cantidad && d.cantidad.trim()) lines.push(`Cantidad: ${d.cantidad.trim()}.`);
      if (d.mensaje && d.mensaje.trim()) lines.push(`Comentarios: ${d.mensaje.trim()}`);
      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      document.body.appendChild(a); a.click(); a.remove();
      $('#formOk').textContent = 'Abriendo WhatsApp con tu solicitud lista para enviar.';
    });
  }

  /* ------------------------------------------------------------------
     Botones magneticos
     ------------------------------------------------------------------ */
  function initMagnetic() {
    if (!fine || reduce || !hasGSAP) return;
    const g = window.gsap;
    $$('[data-magnetic]').forEach((el) => {
      const xTo = g.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      const yTo = g.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ------------------------------------------------------------------
     Footer tipo cortina (escritorio): se revela al terminar la pagina
     ------------------------------------------------------------------ */
  function initCurtain() {
    const foot = $('#foot');
    if (!foot) return;
    const apply = () => {
      root.classList.remove('has-curtain');
      const h = foot.offsetHeight;
      const can = window.innerWidth >= 900 && h < window.innerHeight * 0.95 && !reduce;
      if (can) { root.style.setProperty('--foot-h', `${h}px`); root.classList.add('has-curtain'); }
      else root.style.removeProperty('--foot-h');
      if (hasGSAP) window.ScrollTrigger.refresh();
    };
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(apply, 200); });
    apply();
  }

  /* ------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------ */
  function boot() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const initialHash = location.hash;

    try {
      initWhatsApp();
      initButtons();
      if (hasGSAP) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        // Los estados iniciales ocultos solo aplican si realmente se va a animar
        if (!reduce) root.classList.add('gsap-ready');
        window.ScrollTrigger.config({ ignoreMobileResize: true });
      }
      initSmooth();
      initAnchors();
      initNav();
      prepareHero();
      initHero();
      initCounters();
      initExpand();
      initReveals();
      initParallax();
      initCatalog();
      initDecoder();
      initProcess();
      initIndustries();
      initFAQ();
      initForm();
      initMagnetic();
      initCurtain();
      initProgress();
      if (hasGSAP) { window.ScrollTrigger.sort(); window.ScrollTrigger.refresh(); }
    } catch (err) {
      // Si algo falla, el contenido nunca queda oculto
      console.error('Error al iniciar animaciones:', err);
      root.classList.remove('gsap-ready');
      root.classList.add('reveal-all');
    }

    runLoader().then(() => {
      playHero();
      if (lenis) lenis.start();
      if (hasGSAP) window.ScrollTrigger.refresh();
      if (initialHash && $(initialHash)) setTimeout(() => scrollToTarget($(initialHash), true), 120);
    });

    window.addEventListener('load', () => { if (hasGSAP) window.ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (hasGSAP) window.ScrollTrigger.refresh(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
