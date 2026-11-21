/* ==========================================================================
   JunkR Tattoo — animations (GSAP + ScrollTrigger + Lenis) et formulaire de réservation
   Site statique : aucun serveur, aucun service tiers. La demande de rendez-vous
   génère un SMS pré-rempli (sms:), un message Instagram, un appel (tel:) ou un .ics.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.JUNKR || {};
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var lenis = null;
  var menuOpen = false;
  var lightboxOpen = false;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function bail() {
    var l = document.getElementById('loader');
    if (l) { l.style.display = 'none'; }
    window.__junkrReady = true;
  }

  function init() {
    buildRings();
    setupPrices();
    setupHours();
    setupBooking();
    setupLightbox();
    setupMenuAndAnchors();
    setupButtons();
    if (!hasGSAP) { bail(); return; }

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    if (reduce) { setupReducedMotion(); setupInkVideo(false); bail(); return; }
    setupInkVideo(true);

    initLenis();
    prepareHero();
    setupCursor();
    setupMagneticAndTilt();
    runLoader(function () {
      if (lenis) lenis.start();
      heroIntro();
    });
    setupScrollUI();
    setupHeroScroll();
    setupMarquee();
    setupSplitHeadings();
    setupMasks();
    setupParallax();
    setupStats();
    setupProcess();
    setupCtaWords();
    setupReviews();
    setupFooter();
    setupReveals();

    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () { storyPinned(); hscrollPinned(); });
    mm.add('(max-width: 899px), (prefers-reduced-motion: reduce)', function () { storyStatic(); hscrollStatic(); });

    ScrollTrigger.sort();
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  /* ------------------------------------------------------------------ */
  /*  Anneaux de suminagashi (fil rouge visuel)                          */
  /* ------------------------------------------------------------------ */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function buildRings() {
    $$('[data-rings]').forEach(function (svg) {
      var n = +svg.getAttribute('data-rings') || 12;
      var seed = +svg.getAttribute('data-seed') || 1;
      var rmin = +svg.getAttribute('data-rmin') || 20;
      var rmax = +svg.getAttribute('data-rmax') || 230;
      var rnd = mulberry32(seed * 9301 + 49297);
      svg.setAttribute('viewBox', '-250 -250 500 500');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      var html = '';
      for (var i = 0; i < n; i++) {
        var t = n === 1 ? 0 : i / (n - 1);
        var r = rmin + (rmax - rmin) * Math.pow(t, 0.85);
        var k1 = 2 + Math.floor(rnd() * 3), k2 = 3 + Math.floor(rnd() * 4);
        var a1 = 0.012 + rnd() * 0.03, a2 = 0.008 + rnd() * 0.02;
        var p1 = rnd() * 6.283, p2 = rnd() * 6.283;
        var d = '';
        for (var j = 0; j <= 140; j++) {
          var th = j / 140 * Math.PI * 2;
          var rr = r * (1 + a1 * Math.sin(k1 * th + p1) + a2 * Math.sin(k2 * th + p2));
          d += (j ? 'L' : 'M') + (rr * Math.cos(th)).toFixed(1) + ' ' + (rr * Math.sin(th)).toFixed(1);
        }
        var accent = (i % 4 === 0);
        html += '<path d="' + d + 'Z" pathLength="1" style="stroke-width:calc(var(--rw,1) * ' + (accent ? '1.5' : '0.8') + 'px);opacity:' + (0.4 + 0.6 * (1 - t * 0.55)).toFixed(2) + '"/>';
      }
      svg.innerHTML = html;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Prix (config.js) et horaires                                       */
  /* ------------------------------------------------------------------ */
  function setupPrices() {
    $$('[data-price]').forEach(function (el) {
      var v = CFG.prices && CFG.prices[el.getAttribute('data-price')];
      el.textContent = v ? v : 'Sur devis';
    });
  }

  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function parisNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  }
  function hLabel(h) { return (h % 1 ? Math.floor(h) + ' h ' + pad(Math.round((h % 1) * 60)) : h + ' h'); }
  function setupHours() {
    var hours = CFG.hours || {};
    var now = parisNow();
    var dow = now.getDay();
    var h = now.getHours() + now.getMinutes() / 60;
    var today = hours[dow];
    var txt, open = false;
    if (today && h >= today[0] && h < today[1]) {
      open = true; txt = 'Ouvert · jusqu’à ' + hLabel(today[1]);
    } else if (today && h < today[0]) {
      txt = 'Fermé · ouvre à ' + hLabel(today[0]);
    } else {
      var next = null;
      for (var i = 1; i <= 7; i++) {
        var d = (dow + i) % 7;
        if (hours[d]) { next = { d: d, t: hours[d][0], delta: i }; break; }
      }
      txt = next ? 'Fermé · rouvre ' + (next.delta === 1 ? 'demain' : DAYS[next.d]) + ' à ' + hLabel(next.t) : 'Fermé';
    }
    ['openStatus', 'openStatus2'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('is-open', open);
      $('span', el).textContent = txt;
    });
    $$('#hoursBody tr').forEach(function (tr) {
      tr.classList.toggle('is-today', +tr.getAttribute('data-d') === dow);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Texte découpé                                                      */
  /* ------------------------------------------------------------------ */
  function splitInto(el, mode) {
    if (!el) return [];
    if (el._split) return el._split;
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);
    var targets = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            if (mode === 'chars') {
              p.split('').forEach(function (ch) {
                var c = document.createElement('span');
                c.className = 'c'; c.textContent = ch; w.appendChild(c); targets.push(c);
              });
            } else {
              var i = document.createElement('span');
              i.className = 'wi'; i.textContent = p; w.appendChild(i); targets.push(i);
            }
            frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    })(el);
    el._split = targets;
    return targets;
  }

  /* ------------------------------------------------------------------ */
  /*  Lenis                                                              */
  /* ------------------------------------------------------------------ */
  function initLenis() {
    if (typeof Lenis === 'undefined') return;
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  function lockScroll(lock) {
    if (lenis) { lock ? lenis.stop() : lenis.start(); }
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  /* ------------------------------------------------------------------ */
  /*  Loader                                                             */
  /* ------------------------------------------------------------------ */
  function runLoader(onOpen) {
    var loader = $('#loader');
    if (!loader) { onOpen(); return; }
    var paths = $$('.loader__rings path', loader);
    var letters = $$('.loader__word span', loader).map(function (s) {
      var t = s.textContent; s.innerHTML = '<i style="display:inline-block;font-style:normal">' + t + '</i>'; return s.firstChild;
    });
    var countEl = $('#loaderCount');
    gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(letters, { yPercent: 115 });

    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var loaded = new Promise(function (res) {
      if (document.readyState === 'complete') res(); else window.addEventListener('load', function () { res(); });
    });
    var ready = Promise.race([Promise.all([fontsReady, loaded]), new Promise(function (r) { setTimeout(r, 4500); })]);

    var st = { p: 0 };
    var intro = new Promise(function (resolve) {
      var tl = gsap.timeline({ onComplete: resolve });
      tl.to(paths, { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut', stagger: { each: 0.09 } }, 0)
        .to(letters, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.07 }, 0.25)
        .to(st, { p: 100, duration: 1.9, ease: 'power1.inOut', onUpdate: function () { countEl.textContent = Math.round(st.p); } }, 0);
    });

    Promise.all([intro, ready]).then(function () {
      var out = gsap.timeline({
        onComplete: function () { loader.classList.add('is-done'); window.__junkrReady = true; ScrollTrigger.refresh(); }
      });
      out.to('.loader__center', { opacity: 0, y: -24, duration: 0.45, ease: 'power2.in' }, 0)
        .to('.loader__rings', { scale: 3.4, opacity: 0, duration: 1.3, ease: 'expo.in' }, 0)
        .to('.loader__curtain--top', { yPercent: -101, duration: 1.15, ease: 'expo.inOut' }, 0.3)
        .to('.loader__curtain--bottom', { yPercent: 101, duration: 1.15, ease: 'expo.inOut' }, 0.3)
        .add(onOpen, 0.55);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Hero                                                               */
  /* ------------------------------------------------------------------ */
  var heroChars = [];
  function prepareHero() {
    var v = $('.hero__video');
    if (v) {
      // Ordinateur : on passe à la version 1080p (la 720p, plus légère, reste la version mobile)
      var saveData = navigator.connection && navigator.connection.saveData;
      if (window.innerWidth >= 900 && !saveData) {
        var s = v.querySelector('source');
        if (s) {
          // si la version 1080p est absente, on retombe sur la 720p
          s.addEventListener('error', function () { s.src = 'media/hero-720.mp4'; v.load(); var q = v.play(); if (q && q.catch) q.catch(function () {}); }, { once: true });
          s.src = 'media/hero-1080.mp4'; v.load();
        }
      }
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    heroChars = splitInto($('.hero__word'), 'chars');
    gsap.set(heroChars, { yPercent: 150 });
    gsap.set(['.hero__eyebrow', '[data-hero-sub]', '[data-hero-lead]', '[data-hero-cta]', '.hero__foot'], { opacity: 0, y: 28 });
    gsap.set('[data-hero-bg]', { scale: 1.25 });
    gsap.set('[data-hero-float]', { opacity: 0, scale: 0.85 });
    gsap.set('[data-hero-kanji]', { opacity: 0 });
    gsap.set('.hero__ringswrap', { opacity: 0, scale: 0.8 });
  }
  function heroIntro() {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('[data-hero-bg]', { scale: 1, duration: 2.6 }, 0)
      .to('.hero__ringswrap', { opacity: 1, scale: 1, duration: 2.4 }, 0)
      .to(heroChars, { yPercent: 0, duration: 1.5, stagger: 0.08 }, 0.15)
      .to('.hero__eyebrow', { opacity: 1, y: 0, duration: 1.1 }, 0.3)
      .to('[data-hero-sub]', { opacity: 1, y: 0, duration: 1.2 }, 0.75)
      .to('[data-hero-lead]', { opacity: 1, y: 0, duration: 1.2 }, 0.9)
      .to('[data-hero-cta]', { opacity: 1, y: 0, duration: 1.2 }, 1.05)
      .to('[data-hero-float]', { opacity: 1, scale: 1, duration: 1.6, stagger: 0.15 }, 0.8)
      .to('[data-hero-kanji]', { opacity: 1, duration: 1.8 }, 1)
      .to('.hero__foot', { opacity: 1, y: 0, duration: 1.2 }, 1.2);
  }
  function setupHeroScroll() {
    var trig = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('[data-hero-bg]', { yPercent: 14, ease: 'none', scrollTrigger: trig });
    gsap.to('[data-hero-rings]', { y: -140, rotation: 12, ease: 'none', scrollTrigger: trig });
    gsap.to('[data-hero-kanji]', { y: 170, ease: 'none', scrollTrigger: trig });
    gsap.to('[data-hero-inner]', { y: -70, opacity: 0.15, ease: 'none', scrollTrigger: trig });
    $$('[data-hero-float]').forEach(function (el) {
      var f = parseFloat(el.getAttribute('data-hero-float')) || -0.2;
      gsap.to(el, { y: function () { return f * window.innerHeight * 1.1; }, ease: 'none', scrollTrigger: trig });
    });
    gsap.to('.hero__seal', { rotation: 160, ease: 'none', scrollTrigger: trig });
  }

  /* ------------------------------------------------------------------ */
  /*  Navigation, progression, curseur                                   */
  /* ------------------------------------------------------------------ */
  function setupScrollUI() {
    var nav = $('#nav');
    var bar = $('#progressBar');
    var hidden = false;
    var barSet = gsap.quickSetter(bar, 'scaleX');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = self.scroll();
        barSet(self.progress);
        nav.classList.toggle('is-solid', y > 80);
        if (menuOpen) return;
        if (self.direction === 1 && y > 420 && !hidden) { hidden = true; gsap.to(nav, { yPercent: -110, duration: 0.55, ease: 'power3.out', overwrite: true }); }
        else if ((self.direction === -1 || y <= 420) && hidden) { hidden = false; gsap.to(nav, { yPercent: 0, duration: 0.55, ease: 'power3.out', overwrite: true }); }
      }
    });
  }

  function setupCursor() {
    if (!finePointer) return;
    root.classList.add('has-cursor');
    var cur = $('#cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    var dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    var rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    window.addEventListener('mousemove', function (e) { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      var view = t.closest && t.closest('[data-lightbox]');
      var drag = t.closest && t.closest('.reviews__viewport');
      var link = t.closest && t.closest('a, button, summary, label.chip, .cal__day');
      cur.classList.toggle('is-view', !!view);
      cur.classList.toggle('is-drag', !!drag && !link);
      cur.classList.toggle('is-link', !!link && !view && !(drag && !link));
      label.textContent = view ? 'Voir' : (drag && !link ? 'Glisser' : '');
    });
    window.addEventListener('mousedown', function (e) {
      var r = document.createElement('i');
      r.className = 'ripple';
      document.body.appendChild(r);
      gsap.set(r, { x: e.clientX, y: e.clientY });
      gsap.fromTo(r, { scale: 0.3, opacity: 0.9 }, { scale: 7, opacity: 0, duration: 1.2, ease: 'expo.out', onComplete: function () { r.remove(); } });
    });
  }

  function setupButtons() {
    $$('.btn').forEach(function (b) {
      function setOrigin(e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--x', (e.clientX - r.left) + 'px');
        b.style.setProperty('--y', (e.clientY - r.top) + 'px');
      }
      b.addEventListener('mouseenter', setOrigin);
      b.addEventListener('mouseleave', setOrigin);
    });
  }

  function setupMagneticAndTilt() {
    if (!finePointer) return;
    $$('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1, 0.55)' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1, 0.55)' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.45);
      });
      el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
    $$('[data-tilt], .g-item[data-lightbox]').forEach(function (el) {
      gsap.set(el, { transformPerspective: 1000 });
      var rx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3' });
      var ry = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 11); rx(-(py - 0.5) * 11);
        el.style.setProperty('--mx', (px * 100) + '%');
        el.style.setProperty('--my', (py * 100) + '%');
      });
      el.addEventListener('mouseleave', function () { rx(0); ry(0); });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Menu mobile + ancres                                               */
  /* ------------------------------------------------------------------ */
  function setupMenuAndAnchors() {
    var burger = $('#burger'), menu = $('#menu');
    function setMenu(open) {
      if (open === menuOpen) return;
      menuOpen = open;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      lockScroll(open);
      if (!hasGSAP || reduce) { menu.classList.toggle('is-open', open); menu.style.transform = open ? 'none' : ''; return; }
      if (open) {
        menu.classList.add('is-open');
        gsap.to(menu, { y: 0, yPercent: 0, duration: 0.9, ease: 'expo.out' });
        gsap.fromTo($$('.menu__links a, .menu__foot a', menu), { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.05, delay: 0.15 });
      } else {
        gsap.to(menu, { yPercent: -100, duration: 0.7, ease: 'expo.inOut', onComplete: function () { menu.classList.remove('is-open'); } });
      }
    }
    if (hasGSAP) gsap.set(menu, { yPercent: -100 });
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      var go = function () {
        if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { duration: 1.7, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
        else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      };
      menuOpen ? setTimeout(go, 350) : go();
      if (history.replaceState) history.replaceState(null, '', id);

      var style = a.getAttribute('data-style');
      if (style) { window.__junkrPrefillStyle && window.__junkrPrefillStyle(style); }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Marquee : vitesse et sens liés au scroll                           */
  /* ------------------------------------------------------------------ */
  function cloneBands() {
    return $$('[data-band]').map(function (b) {
      var row = $('.band__row', b), set = $('[data-set]', row);
      var w = set.getBoundingClientRect().width || 1;
      var copies = Math.ceil((window.innerWidth * 1.4) / w) + 1;
      for (var i = 0; i < copies; i++) { var c = set.cloneNode(true); c.removeAttribute('data-set'); c.setAttribute('aria-hidden', 'true'); row.appendChild(c); }
      var dir = +b.getAttribute('data-band') || -1;
      return { row: row, set: set, dir: dir, w: w, x: dir > 0 ? -w / 2 : 0 };
    });
  }
  function setupMarquee() {
    var bands = cloneBands();
    var vel = 0, dirLerp = 1;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (self) { vel = self.getVelocity(); } });
    gsap.ticker.add(function (time, dt) {
      var s = dt / 1000;
      var boost = Math.min(Math.abs(vel) / 5, 1100);
      var target = vel > 40 ? 1 : (vel < -40 ? -1 : dirLerp >= 0 ? 1 : -1);
      dirLerp += (target - dirLerp) * 0.06;
      bands.forEach(function (b) {
        b.w = b.set.getBoundingClientRect().width || b.w;
        b.x += b.dir * (90 + boost) * s * dirLerp;
        b.x = gsap.utils.wrap(-b.w, 0, b.x);
        gsap.set(b.row, { x: b.x });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Titres, masques, parallax, révélations                             */
  /* ------------------------------------------------------------------ */
  function setupSplitHeadings() {
    $$('[data-split]').forEach(function (el) {
      if (el.closest('.story') || el.closest('.styles')) return;
      var targets = splitInto(el, el.getAttribute('data-split') === 'chars' ? 'chars' : 'words');
      gsap.set(targets, { yPercent: 150 });
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () { gsap.to(targets, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07 }); }
      });
    });
  }

  function setupMasks() {
    $$('[data-mask]').forEach(function (el) {
      if (el.closest('.story')) return;
      var circle = el.classList.contains('venir__map');
      gsap.set(el, { clipPath: circle ? 'circle(0% at 50% 50%)' : 'inset(100% 0% 0% 0%)' });
      var img = $('img', el);
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(el, { clipPath: circle ? 'circle(95% at 50% 50%)' : 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.out', clearProps: 'clipPath' });
        }
      });
    });
  }

  function setupParallax() {
    $$('[data-parallax]').forEach(function (img) {
      var amp = (parseFloat(img.getAttribute('data-parallax')) || 0.1) * 60;
      gsap.fromTo(img, { yPercent: -amp }, {
        yPercent: amp, ease: 'none',
        scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  function setupReveals() {
    $$('[data-reveal]').forEach(function (el) {
      gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Histoire : section pinnée (ordinateur)                             */
  /* ------------------------------------------------------------------ */
  function storyPinned() {
    var pin = $('.story__pin');
    if (!pin) return;
    var steps = $$('.story__step', pin);
    var N = steps.length;
    var figs = steps.map(function (s) { return $('.story__figin', s); });
    var imgs = figs.map(function (f) { return $('img, video', f); });
    var titles = steps.map(function (s) { return splitInto($('.title', s), 'words'); });
    var texts = steps.map(function (s) { return $$('.story__num, .story__text > p', s); });
    var ring = $('#storyRing'), num = $('#storyNum');
    var STEP = 1.25, HOLD = 0.45;

    steps.forEach(function (s, i) {
      gsap.set(s, { autoAlpha: i === 0 ? 1 : 0 });
      gsap.set(figs[i], { clipPath: i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)', opacity: i === 0 ? 1 : 0 });
      gsap.set(imgs[i], { scale: i === 0 ? 1 : 1.35 });
      gsap.set(titles[i], { yPercent: i === 0 ? 0 : 150 });
      gsap.set(texts[i], { y: i === 0 ? 0 : 36, opacity: i === 0 ? 1 : 0 });
    });
    gsap.set(ring, { strokeDashoffset: 1 - 1 / N });

    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: '.story', start: 'top top', end: '+=330%', pin: pin, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function () {
          var t = tl.time(), idx = 0;
          for (var i = 1; i < N; i++) { if (t >= HOLD + (i - 1) * STEP + 0.55) idx = i; }
          num.textContent = '0' + (idx + 1);
          if (window.__inkActive) window.__inkActive(idx === 0);
        }
      }
    });
    // léger zoom d'entrée sur la 1re image pendant le maintien initial
    tl.to(imgs[0], { scale: 1.06, duration: HOLD, ease: 'none' }, 0);
    for (var i = 1; i < N; i++) {
      var T = HOLD + (i - 1) * STEP;
      tl.set(steps[i], { autoAlpha: 1 }, T)
        .to(titles[i - 1], { yPercent: -118, duration: 0.5, ease: 'power3.in', stagger: 0.04 }, T)
        .to(texts[i - 1], { y: -30, opacity: 0, duration: 0.45, ease: 'power2.in' }, T)
        .to(figs[i - 1], { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.85, ease: 'power3.inOut' }, T)
        .to(imgs[i - 1], { scale: 1.2, duration: 0.85 }, T)
        .set(figs[i], { opacity: 1 }, T + 0.1)
        .to(figs[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.85, ease: 'power3.inOut' }, T + 0.1)
        .to(imgs[i], { scale: 1, duration: 1.1, ease: 'power2.out' }, T + 0.1)
        .to(titles[i], { yPercent: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, T + 0.5)
        .to(texts[i], { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.08 }, T + 0.62)
        .set(steps[i - 1], { autoAlpha: 0 }, T + 0.9)
        .to(ring, { strokeDashoffset: 1 - (i + 1) / N, duration: 0.85 }, T);
    }
    tl.to({}, { duration: HOLD });
  }

  /* Goutte d'encre (étape 01) : lecture seulement quand elle est visible et que l'étape est affichée */
  function setupInkVideo(play) {
    var v = $('.story__video');
    if (!v) return;
    v.muted = true;
    if (!play) { v.pause(); v.removeAttribute('autoplay'); return; }
    var vis = false, active = true;
    function sync() { if (vis && active) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else { v.pause(); } }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; sync(); }, { threshold: 0.2 }).observe(v);
    } else { vis = true; sync(); }
    window.__inkActive = function (a) { if (a !== active) { active = a; sync(); } };
  }
  function storyStatic() {
    $$('.story__step').forEach(function (s) {
      var t = splitInto($('.title', s), 'words');
      gsap.set(t, { yPercent: 150 });
      var fig = $('.story__figin', s);
      gsap.set(fig, { clipPath: 'inset(100% 0% 0% 0%)' });
      var txt = $$('.story__num, .story__text > p', s);
      gsap.set(txt, { y: 30, opacity: 0 });
      ScrollTrigger.create({
        trigger: s, start: 'top 80%', once: true,
        onEnter: function () {
          gsap.to(fig, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out' });
          gsap.to(t, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06, delay: 0.15 });
          gsap.to(txt, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.3 });
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Styles : défilement horizontal piloté par le scroll vertical       */
  /* ------------------------------------------------------------------ */
  function hscrollPinned() {
    var sec = $('.styles'), wrap = $('[data-hscroll]'), track = $('[data-track]');
    if (!sec || !wrap) return;
    var title = splitInto($('#styles-title'), 'words');
    gsap.set(title, { yPercent: 150 });
    ScrollTrigger.create({ trigger: sec, start: 'top 70%', once: true, onEnter: function () { gsap.to(title, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07 }); } });
    function dist() { return Math.max(0, wrap.scrollWidth - window.innerWidth); }
    var tween = gsap.to(wrap, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.9, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    $$('.card', track).forEach(function (card) {
      var img = $('.card__img img', card);
      if (!img) return;
      gsap.fromTo(img, { xPercent: -3.5 }, {
        xPercent: 3.5, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
      });
    });
  }
  function hscrollStatic() {
    var title = splitInto($('#styles-title'), 'words');
    gsap.set(title, { yPercent: 150 });
    ScrollTrigger.create({ trigger: '#styles-title', start: 'top 88%', once: true, onEnter: function () { gsap.to(title, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07 }); } });
  }

  /* ------------------------------------------------------------------ */
  /*  Chiffres                                                           */
  /* ------------------------------------------------------------------ */
  function fmtNum(v, dec, sep) {
    var s = dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v));
    if (sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
    return s;
  }
  var STAT_FILL = [1, 1, 0.82, 6 / 7];
  function setupStats() {
    $$('[data-stat]').forEach(function (st, i) {
      var num = $('[data-count]', st), ring = $('[data-ring]', st);
      var target = +num.getAttribute('data-count'), dec = +num.getAttribute('data-decimals') || 0, sep = !!num.getAttribute('data-sep');
      var o = { v: 0 };
      num.textContent = fmtNum(0, dec, sep);
      ScrollTrigger.create({
        trigger: st, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(o, { v: target, duration: 2.4, delay: i * 0.12, ease: 'power3.out', onUpdate: function () { num.textContent = fmtNum(o.v, dec, sep); } });
          gsap.to(ring, { strokeDashoffset: 1 - (STAT_FILL[i] || 1), duration: 2.4, delay: i * 0.12, ease: 'power3.out' });
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Déroulé (timeline qui se dessine)                                  */
  /* ------------------------------------------------------------------ */
  function setupProcess() {
    var body = $('[data-process]');
    if (!body) return;
    var draw = $('.process__draw', body);
    var len = draw.getTotalLength();
    gsap.set(draw, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(draw, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: body, start: 'top 60%', end: 'bottom 62%', scrub: 0.6 } });
    $$('[data-pstep]', body).forEach(function (step) {
      var card = $('.p-step__card', step);
      gsap.from(card, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: step, start: 'top 86%', once: true } });
      ScrollTrigger.create({
        trigger: step, start: 'top 62%',
        onEnter: function () { step.classList.add('is-on'); },
        onLeaveBack: function () { step.classList.remove('is-on'); }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Appel à l'action : mots qui s'allument au scroll                   */
  /* ------------------------------------------------------------------ */
  function setupCtaWords() {
    var el = $('[data-words]');
    if (!el) return;
    var words = [];
    el.setAttribute('aria-label', el.textContent.trim());
    var parts = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    parts.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'cw'; s.setAttribute('aria-hidden', 'true'); s.textContent = w;
      el.appendChild(s); words.push(s);
      if (i < parts.length - 1) el.appendChild(document.createTextNode(' '));
    });
    gsap.to(words, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 48%', scrub: true } });
    gsap.to('.cta__rings', { rotation: 70, scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.cta__phone', { y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.cta__phone', start: 'top 92%', once: true } });
  }

  /* ------------------------------------------------------------------ */
  /*  Avis : carrousel (glisser, flèches, défilement auto)               */
  /* ------------------------------------------------------------------ */
  function setupReviews() { initReviews(true); }
  function setupReducedMotion() {
    initReviews(false);
    cloneBands();
    $$('[data-count]').forEach(function (n) { n.textContent = n.textContent; });
    $$('[data-ring]').forEach(function (r) { r.style.strokeDashoffset = 1 - 1; });
    $$('.process__draw').forEach(function (p) { p.style.strokeDasharray = 'none'; p.style.strokeDashoffset = '0'; });
    $$('.p-step').forEach(function (s) { s.classList.add('is-on'); });
    $$('#storyRing').forEach(function (r) { r.style.strokeDashoffset = 0; });
    $$('[data-mask]').forEach(function (m) { m.style.clipPath = 'none'; });
    var nav = $('#nav'); if (nav) window.addEventListener('scroll', function () { nav.classList.toggle('is-solid', window.scrollY > 80); }, { passive: true });
    var menu = $('#menu'); if (menu) menu.style.transform = 'none';
  }

  function initReviews(animated) {
    var vp = $('[data-reviews]'), track = $('[data-rtrack]');
    if (!vp || !track) return;
    var cards = $$('.review', track);
    var idx = 0, x = 0, dragging = false, moved = false, startX = 0, startOff = 0, timer = null, lastX = 0, lastT = 0, vx = 0;
    var padL = function () { return parseFloat(getComputedStyle(vp).paddingLeft) || 0; };
    var maxX = function () { return Math.max(0, track.scrollWidth - (vp.clientWidth - padL())); };
    var offs = function (i) { return Math.min(maxX(), cards[i].offsetLeft); };
    function apply(v, instant) {
      x = v;
      if (animated) gsap.to(track, { x: -v, duration: instant ? 0 : 1, ease: 'power3.out', overwrite: true });
      else track.style.transform = 'translate3d(' + (-v) + 'px,0,0)';
    }
    function go(i) { idx = (i + cards.length) % cards.length; apply(offs(idx)); }
    function nearest(v) { var b = 0, d = 1e9; cards.forEach(function (c, i) { var dd = Math.abs(offs(i) - v); if (dd < d) { d = dd; b = i; } }); return b; }
    $('[data-prev]', vp).addEventListener('click', function () { go(Math.max(0, idx - 1)); stop(); });
    $('[data-next]', vp).addEventListener('click', function () { go(idx >= cards.length - 1 || offs(idx) >= maxX() - 2 ? 0 : idx + 1); stop(); });

    vp.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a,button')) return;
      dragging = true; moved = false; startX = e.clientX; startOff = x; lastX = e.clientX; lastT = performance.now(); vx = 0;
      vp.classList.add('is-drag'); stop();
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 5) moved = true;
      var now = performance.now(); vx = (e.clientX - lastX) / Math.max(1, now - lastT); lastX = e.clientX; lastT = now;
      var v = Math.max(-40, Math.min(maxX() + 40, startOff - dx));
      x = v;
      if (animated) gsap.set(track, { x: -v }); else track.style.transform = 'translate3d(' + (-v) + 'px,0,0)';
    });
    window.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false; vp.classList.remove('is-drag');
      var v = Math.max(0, Math.min(maxX(), x - vx * 320));
      idx = nearest(v); apply(offs(idx));
    });
    vp.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    vp.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { go(idx + 1); } if (e.key === 'ArrowLeft') { go(idx - 1); } });

    function start() { if (!animated || reduce) return; stop(); timer = setInterval(function () { if (document.hidden) return; go(offs(idx) >= maxX() - 2 ? 0 : idx + 1); }, 5600); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    if (animated) {
      ScrollTrigger.create({ trigger: vp, start: 'top 85%', end: 'bottom 15%', onToggle: function (self) { self.isActive ? start() : stop(); } });
      vp.addEventListener('mouseenter', stop); vp.addEventListener('mouseleave', start);
      gsap.from(cards, { x: 80, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: vp, start: 'top 85%', once: true } });
    }
    window.addEventListener('resize', function () { apply(offs(idx), true); });
  }

  /* ------------------------------------------------------------------ */
  /*  Footer                                                             */
  /* ------------------------------------------------------------------ */
  function setupFooter() {
    var letters = $$('[data-footer-giant] span');
    gsap.set(letters, { yPercent: 105 });
    ScrollTrigger.create({
      trigger: '.footer', start: 'top 85%', once: true,
      onEnter: function () { gsap.to(letters, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: 0.09 }); }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Lightbox                                                           */
  /* ------------------------------------------------------------------ */
  function setupLightbox() {
    var box = $('#lightbox'); if (!box) return;
    var items = $$('[data-lightbox]');
    var img = $('#lbImg'), cap = $('#lbCap');
    var cur = 0, opener = null;
    function show(i) {
      cur = (i + items.length) % items.length;
      var it = items[cur], im = $('img', it), c = $('.g-item__cap', it);
      img.src = im.currentSrc || im.src; img.alt = im.alt;
      cap.textContent = c ? $('b', c).textContent + ' — ' + $('small', c).textContent : '';
      if (hasGSAP && !reduce) gsap.fromTo(img, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'expo.out' });
    }
    function open(i, from) {
      opener = from; lightboxOpen = true;
      box.classList.add('is-open'); box.setAttribute('aria-hidden', 'false');
      lockScroll(true); show(i);
      if (hasGSAP && !reduce) gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
      $('[data-lb-close]', box).focus();
    }
    function close() {
      if (!lightboxOpen) return;
      lightboxOpen = false;
      var done = function () { box.classList.remove('is-open'); box.setAttribute('aria-hidden', 'true'); lockScroll(false); if (opener) opener.focus(); };
      if (hasGSAP && !reduce) gsap.to(box, { opacity: 0, duration: 0.35, onComplete: done }); else done();
    }
    items.forEach(function (it, i) { it.addEventListener('click', function () { open(i, it); }); });
    $('[data-lb-close]', box).addEventListener('click', close);
    $('[data-lb-prev]', box).addEventListener('click', function () { show(cur - 1); });
    $('[data-lb-next]', box).addEventListener('click', function () { show(cur + 1); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lightbox__fig')) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(cur + 1);
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'Tab') {
        var f = $$('button', box), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Réservation : formulaire en 4 étapes → SMS / Instagram / .ics      */
  /* ------------------------------------------------------------------ */
  function setupBooking() {
    var form = $('#bookingForm'); if (!form) return;
    var wiz = $('#wizard');
    var steps = $$('[data-wstep]', form);
    var dots = $$('[data-dot]', wiz);
    var bar = $('#wizBar'), live = $('#wizLive'), errEl = $('#wizErr');
    var nextBtn = $('#wizNext'), backBtn = $('#wizBack');
    var cur = 0, sel = null;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var min = new Date(today); min.setDate(min.getDate() + 1);
    var max = new Date(today); max.setDate(max.getDate() + 120);
    var cal = { y: today.getFullYear(), m: today.getMonth() };
    var periods = (CFG.periods || []).concat([{ id: 'any', label: 'Peu importe', hint: '' }]);

    var pw = $('#periodChips');
    periods.forEach(function (p) {
      pw.insertAdjacentHTML('beforeend', '<label class="chip"><input type="radio" name="period" value="' + p.id + '"' + (p.id === 'any' ? ' checked' : '') + '><span>' + p.label + (p.hint ? ' <small>' + p.hint + '</small>' : '') + '</span></label>');
    });

    function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function long(d) { return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }

    function renderCal() {
      var first = new Date(cal.y, cal.m, 1);
      $('#calTitle').textContent = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      var lead = (first.getDay() + 6) % 7, days = new Date(cal.y, cal.m + 1, 0).getDate(), html = '';
      for (var i = 0; i < lead; i++) html += '<span class="cal__blank"></span>';
      for (var d = 1; d <= days; d++) {
        var dt = new Date(cal.y, cal.m, d), key = iso(dt);
        var off = dt < min || dt > max || !(CFG.hours && CFG.hours[dt.getDay()]);
        var on = sel && key === iso(sel);
        html += '<button type="button" class="cal__day' + (on ? ' is-selected' : '') + (dt.getTime() === today.getTime() ? ' is-today' : '') + '" data-iso="' + key + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + long(dt) + '">' + d + '</button>';
      }
      $('#calDays').innerHTML = html;
      $('#calPrev').disabled = (cal.y === today.getFullYear() && cal.m <= today.getMonth());
      var lim = new Date(cal.y, cal.m + 1, 1);
      $('#calNext').disabled = lim > max;
    }
    $('#calPrev').addEventListener('click', function () { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y--; } renderCal(); });
    $('#calNext').addEventListener('click', function () { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++; } renderCal(); });
    $('#calDays').addEventListener('click', function (e) {
      var b = e.target.closest('.cal__day'); if (!b || b.disabled) return;
      var p = b.getAttribute('data-iso').split('-');
      sel = new Date(+p[0], +p[1] - 1, +p[2]);
      $('#calChosen').innerHTML = 'Jour choisi : <b>' + long(sel) + '</b>';
      renderCal(); setErr('');
    });
    renderCal();

    function val(name) { var e = form.querySelector('[name="' + name + '"]:checked'); return e ? e.value : ''; }
    function setErr(msg) { errEl.textContent = msg || ''; }
    function fieldErr(name, msg) {
      var e = form.querySelector('[data-err="' + name + '"]'); if (!e) return;
      e.textContent = msg || ''; e.closest('.field').classList.toggle('has-error', !!msg);
    }

    function validate(i) {
      setErr(''); fieldErr('prenom', ''); fieldErr('tel', '');
      if (i === 1) {
        if (!val('zone')) return 'Choisis une zone (ou « Pas encore décidé »).';
        if (!val('size')) return 'Choisis une taille approximative.';
      }
      if (i === 2) {
        var flex = form.querySelector('[name="flex"]').checked;
        if (!sel && !flex) return 'Choisis un jour, ou coche « Je suis flexible ».';
      }
      if (i === 3) {
        var p = form.prenom.value.trim(), t = form.tel.value.replace(/[^\d+]/g, '');
        var bad = false;
        if (p.length < 2) { fieldErr('prenom', 'Indique ton prénom.'); bad = true; }
        if (t.replace(/\D/g, '').length < 9) { fieldErr('tel', 'Indique un numéro valide pour que JunkR puisse te répondre.'); bad = true; }
        if (bad) return 'Il manque une information.';
      }
      return '';
    }

    function show(n, dir) {
      var from = steps[cur], to = steps[n];
      // L'état change tout de suite ; l'animation n'est qu'un habillage (elle ne peut pas bloquer le formulaire).
      from.classList.remove('is-active'); to.classList.add('is-active'); cur = n;
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === Math.min(n, 3)); d.classList.toggle('is-done', i < n); });
      bar.style.transform = 'scaleX(' + Math.min(1, (n + 1) / 4) + ')';
      backBtn.hidden = n === 0; nextBtn.firstChild.textContent = (n === 3 ? 'Préparer ma demande' : 'Continuer');
      live.textContent = n < 4 ? 'Étape ' + (n + 1) + ' sur 4 : ' + $('legend', to).textContent : 'Ta demande est prête.';
      if (hasGSAP && !reduce) gsap.fromTo(to, { opacity: 0, x: 40 * dir }, { opacity: 1, x: 0, duration: 0.7, ease: 'expo.out', clearProps: 'opacity,transform' });
      var top = wiz.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.4) { if (lenis) lenis.scrollTo(wiz, { offset: -90, duration: 1 }); else wiz.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    }

    nextBtn.addEventListener('click', function () {
      var msg = validate(cur);
      if (msg) { setErr(msg); return; }
      if (cur < 3) { show(cur + 1, 1); return; }
      buildResult();
      wiz.classList.add('is-result');
      show(4, 1);
    });
    backBtn.addEventListener('click', function () { setErr(''); if (cur > 0) show(cur - 1, -1); });
    $('#btnEdit').addEventListener('click', function () { wiz.classList.remove('is-result'); show(3, -1); });
    form.addEventListener('submit', function (e) { e.preventDefault(); nextBtn.click(); });
    form.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'radio') { e.preventDefault(); nextBtn.click(); } });

    function period() { var v = val('period'); var p = periods.filter(function (x) { return x.id === v; })[0]; return p || periods[periods.length - 1]; }
    function message() {
      var styles = $$('[name="style"]:checked', form).map(function (i) { return i.value; });
      var idea = form.idea.value.trim().replace(/\s+/g, ' ');
      var flex = form.querySelector('[name="flex"]').checked;
      var p = period();
      var when = sel ? long(sel) + (p.id !== 'any' ? ', ' + p.label.toLowerCase() + ' (' + p.hint + ')' : ', à l’heure qui t’arrange') : 'pas de date précise';
      var l = [];
      l.push('Bonjour JunkR, c’est ' + form.prenom.value.trim() + '. J’aimerais prendre rendez-vous pour un tatouage.');
      l.push('');
      l.push('• Projet : ' + val('type') + (styles.length ? ' (' + styles.join(', ') + ')' : ''));
      l.push('• Zone : ' + val('zone') + ' · Taille : ' + val('size'));
      if (idea) l.push('• Idée : ' + idea);
      l.push('• Créneau souhaité : ' + when + (flex ? ' — je suis flexible' : ''));
      l.push('• Me répondre par : ' + val('canal') + ' au ' + form.tel.value.trim());
      l.push('');
      l.push('Message envoyé depuis le site de JunkR Tattoo.');
      return l.join('\n');
    }

    var lastMsg = '';
    function buildResult() {
      lastMsg = message();
      $('#ticket').textContent = lastMsg;
      $('#btnSms').setAttribute('href', 'sms:' + (CFG.phone || '+33677418532') + '?&body=' + encodeURIComponent(lastMsg));
      $('#btnIcs').hidden = !sel;
      $('#copyNote').textContent = '';
    }

    function copy(text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      return new Promise(function (res, rej) {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } ta.remove();
      });
    }
    function note(t) { $('#copyNote').textContent = t; }
    $('#btnCopy').addEventListener('click', function () { copy(lastMsg).then(function () { note('Message copié. Tu peux le coller dans un SMS ou un message Instagram.'); }, function () { note('Copie impossible : sélectionne le texte ci-dessus.'); }); });
    $('#btnInsta').addEventListener('click', function () { copy(lastMsg).then(function () { note('Message copié : colle-le dans la discussion Instagram qui vient de s’ouvrir.'); }, function () { note('Ouvre Instagram, puis colle ou recopie le message.'); }); });

    $('#btnIcs').addEventListener('click', function () {
      if (!sel) return;
      var p = period(), startH = p.start || 14;
      var s = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate(), startH, 0, 0), e = new Date(s.getTime() + 3600000);
      var f = function (d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; };
      var u = new Date();
      var stamp = u.getUTCFullYear() + pad(u.getUTCMonth() + 1) + pad(u.getUTCDate()) + 'T' + pad(u.getUTCHours()) + pad(u.getUTCMinutes()) + pad(u.getUTCSeconds()) + 'Z';
      var esc = function (t) { return t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); };
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JunkR Tattoo//Demande de rendez-vous//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
        'UID:' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '@junkr-tattoo', 'DTSTAMP:' + stamp, 'DTSTART:' + f(s), 'DTEND:' + f(e),
        'SUMMARY:' + esc('Demande de RDV tatouage — JunkR Tattoo (à confirmer)'), 'LOCATION:' + esc((CFG.address || '15 Rue Saint-Julien, 54000 Nancy')),
        'DESCRIPTION:' + esc(lastMsg + '\n\nTéléphone : ' + (CFG.phoneDisplay || '06 77 41 85 32')), 'STATUS:TENTATIVE', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rdv-junkr-tattoo.ics';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      note('Fichier calendrier téléchargé. Pense à attendre la confirmation de JunkR.');
    });

    // Pré-remplissage depuis les cartes « Styles »
    window.__junkrPrefillStyle = function (style) {
      var chips = $$('[name="style"]', form);
      chips.forEach(function (c) { c.checked = (c.value === style); });
      if (wiz.classList.contains('is-result')) { wiz.classList.remove('is-result'); show(0, -1); }
      if (style === 'Flash') { var t = form.querySelector('[name="type"][value="Un flash"]'); if (t) t.checked = true; }
    };
  }

  // Démarrage (à la fin du fichier pour que toutes les variables du module soient initialisées)
  try { init(); } catch (err) { if (window.console) console.error(err); bail(); }

})();
