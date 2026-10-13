/* Iheb Ichi — portfolio interactions. No dependencies. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Header state ---------- */
  const header = $('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Active section in nav ---------- */
  const navLinks = $$('.nav__links a[href^="#"]');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = '#' + entry.target.id;
        navLinks.forEach((a) => {
          if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Mobile menu ---------- */
  const menu = $('#mobile-menu');
  const openBtn = $('.nav .nav__toggle');
  if (menu && openBtn) {
    const closeBtn = $('[data-close]', menu);
    let lastFocus = null;
    const focusables = () => $$('a[href], button:not([disabled])', menu);

    const open = () => {
      lastFocus = document.activeElement;
      menu.hidden = false;
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        menu.classList.add('is-open');
        closeBtn && closeBtn.focus();
      });
    };
    const close = (restoreFocus = true) => {
      menu.classList.remove('is-open');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      const done = () => { menu.hidden = true; };
      if (reduceMotion.matches) done(); else setTimeout(done, 260);
      if (restoreFocus && lastFocus) lastFocus.focus();
    };

    openBtn.addEventListener('click', open);
    closeBtn && closeBtn.addEventListener('click', () => close());
    $$('a[href^="#"]', menu).forEach((a) => a.addEventListener('click', () => close(false)));
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 900 && !menu.hidden) close(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealables = $$('.reveal');
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); ro.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealables.forEach((el) => ro.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Project filters ---------- */
  const filterBtns = $$('[data-filter]');
  const items = $$('.project-item');
  const empty = $('#projects-empty');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let shown = 0;
      items.forEach((item) => {
        const match = f === 'all' || item.dataset.cat.split(' ').includes(f);
        item.hidden = !match;
        if (match) shown += 1;
      });
      if (empty) empty.hidden = shown !== 0;
    });
  });

  /* ---------- Viewfinder: timecode + focus box ---------- */
  const vf = $('#viewfinder');
  if (vf) {
    const tc = $('#timecode');
    const box = $('#vf-focus');
    const status = $('#vf-status');
    const img = $('.viewfinder__img', vf);
    const FPS = 25;
    // Subjects the autofocus locks onto: centre in the source photo, as a fraction of its width and height.
    const SUBJECTS = [
      { x: 0.356, y: 0.215, label: 'Face detected' },
      { x: 0.794, y: 0.31, label: 'Subject: Sawarny' },
    ];
    const FACE = SUBJECTS[0];
    const pad = (n) => String(n).padStart(2, '0');

    // Timecode (HH:MM:SS:FF) since the page opened. Static when motion is reduced.
    const t0 = performance.now();
    const renderTimecode = (now) => {
      const totalFrames = Math.floor(((now - t0) / 1000) * FPS);
      const f = totalFrames % FPS;
      const s = Math.floor(totalFrames / FPS) % 60;
      const m = Math.floor(totalFrames / (FPS * 60)) % 60;
      const h = Math.floor(totalFrames / (FPS * 3600));
      tc.textContent = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
    };
    let rafId = 0;
    let visible = true;
    const loop = (now) => { renderTimecode(now); rafId = requestAnimationFrame(loop); };
    const startClock = () => { if (!reduceMotion.matches && visible && !rafId) rafId = requestAnimationFrame(loop); };
    const stopClock = () => { cancelAnimationFrame(rafId); rafId = 0; };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? startClock() : stopClock(); }).observe(vf);
    }
    startClock();

    // Where a subject sits inside the frame, accounting for object-fit: cover.
    const inFrame = (s) => {
      const w = vf.clientWidth, h = vf.clientHeight;
      const iw = img.naturalWidth || 1436, ih = img.naturalHeight || 2046;
      const scale = Math.max(w / iw, h / ih);
      const dw = iw * scale, dh = ih * scale;
      const [px, py] = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
      return { x: (w - dw) * (isNaN(px) ? 0.5 : px) + s.x * dw, y: (h - dh) * (isNaN(py) ? 0.5 : py) + s.y * dh };
    };
    const faceInFrame = () => inFrame(FACE);

    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };
    let animating = false;
    const setLocked = (subject) => {
      box.classList.toggle('is-locked', !!subject);
      status.classList.toggle('is-locked', !!subject);
      status.textContent = subject ? subject.label : 'Searching';
    };
    // The box and the sharp layer read the same variables, so whatever is under the box is in focus.
    const place = (p) => {
      vf.style.setProperty('--fx', `${p.x}px`);
      vf.style.setProperty('--fy', `${p.y}px`);
      vf.style.setProperty('--fw', `${box.offsetWidth}px`);
      vf.style.setProperty('--fh', `${box.offsetHeight}px`);
    };
    // While the box travels the sharp area goes soft, then snaps into focus once it settles.
    let huntTimer = 0;
    const hunt = () => {
      if (reduceMotion.matches) return;
      vf.classList.add('is-hunting');
      clearTimeout(huntTimer);
      huntTimer = setTimeout(() => vf.classList.remove('is-hunting'), 220);
    };
    // Keep the box inside the frame, clear of the corner marks.
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    const centreOn = (pt) => {
      const m = 18;
      return {
        x: clamp(pt.x - box.offsetWidth / 2, m, vf.clientWidth - box.offsetWidth - m),
        y: clamp(pt.y - box.offsetHeight / 2, m + 28, vf.clientHeight - box.offsetHeight - m - 28),
      };
    };

    const restOnFace = () => {
      target = centreOn(faceInFrame());
      if (reduceMotion.matches || !animating) { current = { ...target }; place(current); }
      setLocked(FACE);
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.18;
      current.y += (target.y - current.y) * 0.18;
      place(current);
      if (Math.abs(target.x - current.x) > 0.3 || Math.abs(target.y - current.y) > 0.3) requestAnimationFrame(tick);
      else animating = false;
    };
    const moveTo = (pt) => {
      target = pt;
      if (reduceMotion.matches) { current = { ...pt }; place(current); return; }
      if (!animating) { animating = true; requestAnimationFrame(tick); }
    };

    const onPoint = (clientX, clientY) => {
      const r = vf.getBoundingClientRect();
      const p = { x: clientX - r.left, y: clientY - r.top };
      const lockRadius = box.offsetWidth * 0.55;
      const subject = SUBJECTS.find((s) => { const q = inFrame(s); return Math.hypot(p.x - q.x, p.y - q.y) < lockRadius; });
      setLocked(subject);
      hunt();
      moveTo(centreOn(subject ? inFrame(subject) : p)); // snap to a subject when close, like autofocus
    };

    vf.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') onPoint(e.clientX, e.clientY); });
    vf.addEventListener('pointerdown', (e) => onPoint(e.clientX, e.clientY));
    vf.addEventListener('pointerleave', () => { hunt(); moveTo(centreOn(faceInFrame())); setLocked(FACE); });

    if (img.complete) restOnFace(); else img.addEventListener('load', restOnFace, { once: true });
    window.addEventListener('resize', restOnFace);
  }

  /* ---------- Copy to clipboard ---------- */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copied';
      } catch {
        btn.textContent = 'Press Ctrl+C';
      }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
    });
  });

  /* ---------- Contact form ---------- */
  const form = $('#contact-form');
  if (form) {
    const statusEl = $('#form-status');
    const submit = $('#f-submit');
    const started = $('#f-started');
    if (started) started.value = String(Date.now());

    const rules = {
      name: (v) => (v.trim().length < 2 ? 'Enter your name.' : ''),
      email: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'Enter an email address like name@example.com.' : ''),
      subject: (v) => (v.trim().length < 3 ? 'Add a short subject.' : ''),
      message: (v) => (v.trim().length < 10 ? 'Write at least 10 characters so I know how to help.' : ''),
    };

    const validateField = (input) => {
      const rule = rules[input.name];
      if (!rule) return true;
      const msg = rule(input.value);
      const err = $('#e-' + input.name);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg;
      return !msg;
    };

    Object.keys(rules).forEach((name) => {
      const input = form.elements.namedItem(name);
      input.addEventListener('blur', () => { if (input.value) validateField(input); });
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') validateField(input); });
    });

    const setStatus = (kind, html) => { statusEl.dataset.kind = kind; statusEl.innerHTML = html; };
    const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const mailtoFallback = (data) => {
      const body = `${data.message}\n\n${data.name}\n${data.email}`;
      return `mailto:iheb6410@gmail.com?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(body)}`;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputs = Object.keys(rules).map((n) => form.elements.namedItem(n));
      const results = inputs.map(validateField);
      if (results.includes(false)) {
        const firstBad = inputs[results.indexOf(false)];
        firstBad.focus();
        setStatus('error', 'Some fields need attention before this can be sent.');
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = 'Sending…';
      setStatus('', '');

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        });
        let payload = {};
        try { payload = await res.json(); } catch { /* non-JSON response, e.g. a static host with no API */ }

        if (res.ok && payload.ok) {
          form.reset();
          if (started) started.value = String(Date.now());
          inputs.forEach((i) => i.removeAttribute('aria-invalid'));
          setStatus('ok', 'Message sent. I usually reply within a few days.');
        } else if (res.status === 400 && payload.error) {
          setStatus('error', escapeHtml(payload.error));
        } else if (res.status === 429) {
          setStatus('error', 'Too many messages from this connection. Try again in a few minutes, or email me directly.');
        } else {
          throw new Error('unavailable');
        }
      } catch {
        // The sending service isn't reachable or isn't configured. Never pretend it worked.
        setStatus('fallback', `The form couldn't send your message right now, so nothing was delivered. You can send the same message from your email app instead.<br><a class="btn btn--small" href="${mailtoFallback(data)}">Open in email app</a>`);
      } finally {
        submit.removeAttribute('aria-busy');
        submit.textContent = 'Send message';
      }
    });
  }
})();

/* ---------- Light & motion layer ---------- */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Page-wide light that follows the pointer, and cards that catch it.
  const light = document.querySelector('.cursor-light');
  if (light && finePointer && !reduce) {
    let raf = 0, x = 0, y = 0;
    window.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => {
        light.style.setProperty('--cx', x + 'px');
        light.style.setProperty('--cy', y + 'px');
        light.classList.add('is-on');
        raf = 0;
      });
    }, { passive: true });
    document.addEventListener('pointerleave', () => light.classList.remove('is-on'));
  }
  if (finePointer) {
    document.querySelectorAll('[data-glow]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--gx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--gy', (e.clientY - r.top) + 'px');
      }, { passive: true });
    });
  }

  // A pulse of light along each section's edge as it enters the viewport.
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-lit'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.section, .cs-section').forEach((s) => io.observe(s));
  }

  // Floating light motes in the hero, drawn on a canvas, paused when off screen.
  const canvas = document.getElementById('fx-motes');
  if (canvas && !reduce && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, motes = [], running = false, last = 0;
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, (w * h) / 16000));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        vy: -(Math.random() * 12 + 4), vx: (Math.random() - 0.5) * 6,
        a: Math.random() * 0.5 + 0.15, tw: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.5 ? '74,107,255' : '44,201,255',
      }));
    };
    const draw = (t) => {
      if (!running) return;
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx * dt; m.y += m.vy * dt; m.tw += dt * 2;
        if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
        if (m.x < -10) m.x = w + 10; else if (m.x > w + 10) m.x = -10;
        const alpha = m.a * (0.6 + 0.4 * Math.sin(m.tw));
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 6);
        g.addColorStop(0, `rgba(${m.hue},${alpha})`);
        g.addColorStop(1, `rgba(${m.hue},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 6, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener('resize', resize);
    const start = () => { if (!running) { running = true; last = 0; requestAnimationFrame(draw); } };
    const stop = () => { running = false; };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(canvas);
    } else start();
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  // Photo wall: series filters and the collapsed "show all" state.
  const grid = document.getElementById('photo-grid');
  if (grid) {
    const photos = Array.from(grid.querySelectorAll('.photo'));
    const btns = Array.from(document.querySelectorAll('[data-series-filter]'));
    // The height limit sits on a wrapper: on the column list itself it would spill into extra columns.
    const view = document.getElementById('photo-viewport');
    const more = document.getElementById('photo-more');
    const moreWrap = more.parentElement;
    const wall = view.closest('.photo-wall');
    let open = false;
    // Collapse or expand the wall. The toggle only shows when the photos are taller than the collapsed height.
    const syncMore = () => {
      const limit = parseFloat(getComputedStyle(view).getPropertyValue('--collapsed-h')) || 720;
      const tall = grid.offsetHeight > limit + 40;
      view.classList.toggle('is-collapsed', tall && !open);
      wall.classList.toggle('is-open', tall && open);
      moreWrap.hidden = !tall;
      const n = photos.filter((p) => !p.hidden).length;
      more.textContent = open ? 'Show less' : `Show all ${n} photographs`;
      more.setAttribute('aria-expanded', String(open));
    };
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.seriesFilter;
        btns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        photos.forEach((p) => { p.hidden = f !== 'all' && p.dataset.series !== f; });
        open = false;
        syncMore();
      });
    });
    more.addEventListener('click', () => {
      open = !open;
      syncMore();
      // After collapsing, bring the top of the gallery back into view instead of leaving the reader far below it.
      if (!open) wall.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    syncMore();
    window.addEventListener('load', syncMore);
    window.addEventListener('resize', syncMore);
  }

  // Lightbox for app screenshots and photographs. Items inside a [data-shot-group] can be stepped through.
  const box = document.getElementById('lightbox');
  if (box) {
    const img = box.querySelector('img');
    const cap = box.querySelector('.lightbox__cap');
    const closeBtn = box.querySelector('.lightbox__close');
    const prevBtn = box.querySelector('.lightbox__nav--prev');
    const nextBtn = box.querySelector('.lightbox__nav--next');
    let opener = null;
    let group = [];
    let index = 0;
    const show = (btn) => {
      const thumb = btn.querySelector('img');
      img.src = btn.dataset.photo || thumb.src; img.alt = thumb.alt;
      const pos = group.length > 1 ? `${String(index + 1).padStart(2, '0')} / ${String(group.length).padStart(2, '0')}  ·  ` : '';
      cap.textContent = pos + btn.dataset.shot;
    };
    const step = (d) => {
      if (group.length < 2) return;
      index = (index + d + group.length) % group.length;
      opener = group[index];
      show(opener);
    };
    const close = () => { box.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); };
    document.querySelectorAll('[data-shot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        opener = btn;
        const g = btn.closest('[data-shot-group]');
        // Step only through what is currently visible (respects the active filter).
        group = g ? Array.from(g.querySelectorAll('[data-shot]')).filter((b) => !b.closest('[hidden]')) : [btn];
        index = Math.max(0, group.indexOf(btn));
        if (prevBtn) { prevBtn.hidden = nextBtn.hidden = group.length < 2; }
        show(btn);
        box.hidden = false; document.body.style.overflow = 'hidden';
        closeBtn.focus();
      });
    });
    if (prevBtn) {
      prevBtn.addEventListener('click', () => step(-1));
      nextBtn.addEventListener('click', () => step(1));
    }
    closeBtn.addEventListener('click', close);
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); return; }
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        // Keep focus inside the dialog.
        const f = [closeBtn, prevBtn, nextBtn].filter((b) => b && !b.hidden);
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    // Swipe between photos on touch screens.
    let x0 = null;
    box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }

  /* ---------- Ambient side life ---------- */
  // Random camera and code glyphs drift up the side margins, and focus boxes lock on now and then.
  const amb = document.getElementById('ambient');
  if (amb && !reduce) {
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const TEXT = ['</>', '{ }', '=>', 'f/1.8', 'ISO 400', '1/250s', '24 fps', '4K RAW', 'AF-C', 'npm run dev', 'git push', '200 OK', '[ REC ]', 'const', 'async', '+', '×', 'ƒ', '35mm', 'ATEM', 'λ', '0x1F', 'TC 01:00:00:00'];
    const COLORS = ['var(--quiet)', 'var(--quiet)', 'var(--muted)', 'var(--cyan)', 'var(--signal-ink)'];
    const CONTENT = 1200;

    // Where the free side space is. Wide screens use the real margins; narrow ones hug the outer edge, sparser and fainter.
    const lane = () => {
      const w = window.innerWidth;
      const side = (w - CONTENT) / 2;
      const left = Math.random() < 0.5;
      if (side >= 90) {
        const x = rand(44, side - 36);
        return { x: left ? x : w - x, faint: false };
      }
      const x = rand(4, Math.max(10, w * 0.05));
      return { x: left ? x : w - x - 20, faint: true };
    };
    const capacity = () => (window.innerWidth - CONTENT >= 180 ? 18 : window.innerWidth > 700 ? 7 : 4);

    let live = 0;
    const spawn = (warm) => {
      if (document.hidden || live >= capacity()) return;
      const { x, faint } = lane();
      const el = document.createElement('span');
      const roll = Math.random();
      if (roll < 0.62) { el.className = 'glyph'; el.textContent = pick(TEXT); el.style.setProperty('--s', `${rand(0.66, 0.92).toFixed(2)}rem`); }
      else if (roll < 0.8) { el.className = 'glyph glyph--box'; el.style.setProperty('--w', `${Math.round(rand(16, 34))}px`); }
      else if (roll < 0.95) { el.className = 'glyph glyph--ring'; el.style.setProperty('--w', `${Math.round(rand(14, 30))}px`); }
      else { el.className = 'glyph glyph--dot'; }
      const d = rand(22, 42);
      el.style.left = `${Math.round(x)}px`;
      el.style.setProperty('--c', pick(COLORS));
      el.style.setProperty('--d', `${d.toFixed(1)}s`);
      el.style.setProperty('--o', (faint ? rand(0.18, 0.32) : rand(0.35, 0.7)).toFixed(2));
      el.style.setProperty('--sway', `${Math.round(rand(-30, 30))}px`);
      el.style.setProperty('--r', `${Math.round(rand(-120, 120))}deg`);
      // On first load start glyphs part-way through their trip so the sides aren't empty.
      if (warm) el.style.animationDelay = `${(-Math.random() * d * 0.8).toFixed(1)}s`;
      el.addEventListener('animationend', () => { el.remove(); live--; }, { once: true });
      amb.appendChild(el);
      live++;
    };
    for (let i = 0; i < capacity(); i++) spawn(true);
    setInterval(() => spawn(false), 1600);

    const blip = () => {
      if (!document.hidden) {
        const { x } = lane();
        const b = document.createElement('span');
        b.className = 'blip';
        b.style.left = `${Math.round(x - 22)}px`;
        b.style.top = `${Math.round(rand(0.12, 0.85) * window.innerHeight)}px`;
        b.addEventListener('animationend', () => b.remove(), { once: true });
        amb.appendChild(b);
      }
      setTimeout(blip, rand(2600, 6000));
    };
    setTimeout(blip, 1800);

    // The film strips advance as you scroll, like film through a gate.
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { amb.style.setProperty('--scroll', `${Math.round(-window.scrollY * 0.4)}px`); ticking = false; });
    }, { passive: true });
  }
})();
