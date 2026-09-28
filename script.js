(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  const cssVar = n => getComputedStyle(root).getPropertyValue(n).trim();
  const hexRgb = h => {
    h = h.replace('#', '');
    if (h.length === 3) h = [...h].map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };

  /* ---------------- theme ---------------- */
  const themeBtn = $('#themeBtn');
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    const light = t === 'light';
    themeBtn.innerHTML = light ? '<i class="fa-solid fa-moon" aria-hidden="true"></i>' : '<i class="fa-solid fa-sun" aria-hidden="true"></i>';
    themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', light ? '#F5F3EE' : '#0A1224');
    window.dispatchEvent(new Event('themechange'));
  }
  setTheme(store.get('aidx-theme') === 'light' ? 'light' : 'dark');
  themeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    setTheme(next); store.set('aidx-theme', next);
  });

  /* ---------------- intro ---------------- */
  const intro = $('#intro');
  let started = false;
  function start() {
    if (started) return; started = true;
    intro.classList.add('done');
    document.body.classList.add('ready');
  }
  if (reduce) start();
  else { setTimeout(start, 1500); intro.addEventListener('click', start); }

  /* ---------------- nav / progress / menu ---------------- */
  const nav = $('#nav'), prog = $('#prog'), toTop = $('#toTop');
  addEventListener('scroll', () => {
    const d = root, max = d.scrollHeight - d.clientHeight;
    prog.style.width = (max > 0 ? d.scrollTop / max * 100 : 0) + '%';
    nav.classList.toggle('stuck', scrollY > 30);
    toTop.classList.toggle('show', scrollY > 800);
  }, { passive: true });
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  const menuBtn = $('#menuBtn'), links = $('#links');
  menuBtn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.innerHTML = open ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>' : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  });
  $$('a', links).forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  }));

  const navLinks = $$('a', links);
  const secObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => secObs.observe(s));
  secObs.observe($('#top')); // hero in view -> no link highlighted

  /* ---------------- reveal ---------------- */
  const rvObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); rvObs.unobserve(e.target); }
  }), { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  $$('.rv').forEach(el => rvObs.observe(el));

  /* ---------------- toast ---------------- */
  const toastEl = $('#toast'); let toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ================================================================
     HERO LATTICE — decision paths travel through a grid of choices
     ================================================================ */
  (function lattice() {
    const cv = $('#lattice'); if (!cv || reduce) return;
    const ctx = cv.getContext('2d');
    let W, H, SP, cols, rows, paths = [], raf = null, last = 0, spawnT = 0;
    let fg, gold, sky;
    const mouse = { x: -999, y: -999 };
    function colours() { fg = hexRgb(cssVar('--fg')); gold = hexRgb(cssVar('--gold')); sky = hexRgb(cssVar('--sky')); }
    function size() {
      const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      SP = W < 700 ? 38 : 46; cols = Math.ceil(W / SP) + 1; rows = Math.ceil(H / SP) + 1;
      paths = [];
    }
    function spawn() {
      let r = 1 + Math.floor(Math.random() * (rows - 2));
      const pts = [];
      for (let c = 0; c < cols; c++) {
        pts.push([c * SP, r * SP]);
        const step = Math.random();
        r = Math.max(1, Math.min(rows - 2, r + (step < .28 ? -1 : step > .72 ? 1 : 0)));
      }
      paths.push({ pts, head: 0, col: paths.length % 2 === 0 ? gold : sky, speed: 0.045 + Math.random() * 0.03 });
    }
    function frame(t) {
      const dt = Math.min(48, t - (last || t)); last = t;
      ctx.clearRect(0, 0, W, H);
      // grid nodes
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * SP, y = r * SP, d = Math.hypot(x - mouse.x, y - mouse.y);
        const a = 0.09 + (d < 140 ? (1 - d / 140) * 0.45 : 0);
        ctx.fillStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},${a})`;
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      // travelling decision paths
      spawnT += dt;
      if (spawnT > 1300 && paths.length < 4) { spawn(); spawnT = 0; }
      const TRAIL = 9;
      paths.forEach(p => {
        p.head += p.speed * dt / 16;
        const h = Math.floor(p.head), frac = p.head - h;
        for (let i = Math.max(0, h - TRAIL); i < Math.min(h, p.pts.length - 1); i++) {
          const a = 1 - (h - i) / TRAIL;
          const [x1, y1] = p.pts[i], [x2, y2] = p.pts[i + 1];
          const end = i === h - 1 && h < p.pts.length - 1 ? 1 : 1;
          ctx.strokeStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${a * 0.75})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * end, y1 + (y2 - y1) * end); ctx.stroke();
          ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${a * 0.8})`;
          ctx.beginPath(); ctx.arc(x1, y1, 2, 0, 7); ctx.fill();
        }
        if (h < p.pts.length - 1) {
          const [x1, y1] = p.pts[h], [x2, y2] = p.pts[h + 1];
          const hx = x1 + (x2 - x1) * frac, hy = y1 + (y2 - y1) * frac;
          ctx.strokeStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},.9)`;
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(hx, hy); ctx.stroke();
          const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14);
          g.addColorStop(0, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},.55)`); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 14, 0, 7); ctx.fill();
          ctx.fillStyle = `rgb(${p.col[0]},${p.col[1]},${p.col[2]})`;
          ctx.beginPath(); ctx.arc(hx, hy, 2.8, 0, 7); ctx.fill();
        }
      });
      paths = paths.filter(p => p.head < p.pts.length + TRAIL);
      raf = requestAnimationFrame(frame);
    }
    colours(); size();
    addEventListener('themechange', colours);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 200); });
    const hero = $('#top');
    hero.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
      else { cancelAnimationFrame(raf); raf = null; }
    })).observe(hero);
  })();

  /* ================================================================
     RESEARCH THEMES — detail sheet with the lab's own descriptions
     and the publications that relate to each theme
     ================================================================ */
  const pubItems = $$('.pub');
  const THEMES = [
    { t: 'Decision Intelligence & Human-AI Collaboration', d: 'Advancing AI systems that support better human decision-making.', rel: [10] },
    { t: 'Trustworthy AI & Governance', d: 'Building responsible, explainable, fair, and accountable AI.', rel: [9, 8] },
    { t: 'Agentic AI & Adaptive Systems', d: 'Developing intelligent agents that can reason, adapt, and collaborate safely.', rel: [3, 4, 7, 8] },
    { t: 'AI for Learning & Capability Development', d: 'Enhancing education, assessment, and personalised learning through AI.', rel: [2, 4, 6, 7, 8] },
    { t: 'AI for Organisations & Society', d: 'Applying AI to create measurable impact across business, education, government, and communities.', rel: [0, 1, 5] }
  ];
  const sheet = $('#sheet'), sheetBody = $('#sheetBody'), sheetX = $('#sheetX');
  let lastFocus = null;
  function openSheet(i, trigger) {
    const th = THEMES[i];
    const icon = trigger.querySelector('.t-ico').outerHTML;
    const rel = th.rel.map(k => {
      const p = pubItems[k]; const a = p.querySelector('.pub-links a');
      return `<li><a href="${a.href}" target="_blank" rel="noopener">${p.querySelector('h3').textContent}</a><br><span class="mono" style="color:var(--faint)">${[...p.querySelectorAll('.pub-meta span')].map(x => x.textContent).join(' · ')}</span></li>`;
    }).join('');
    sheetBody.innerHTML = `${icon}<p class="mono" style="color:var(--gold);margin:0">Theme ${String(i + 1).padStart(2, '0')}</p>
      <h3 id="sheetTitle">${th.t.replace('&', '&amp;')}</h3><p>${th.d}</p>
      <h4>Related publications</h4>${rel ? `<ul>${rel}</ul>` : '<p>Related publications will be listed here.</p>'}
      <p class="ph mono">Placeholder — a fuller description of this theme will be provided.</p>`;
    sheet.hidden = false; lastFocus = trigger; sheetX.focus(); document.body.style.overflow = 'hidden';
  }
  function closeSheet() { sheet.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  $$('.theme').forEach(b => b.addEventListener('click', () => openSheet(+b.dataset.t, b)));
  sheetX.addEventListener('click', closeSheet);
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  addEventListener('keydown', e => {
    if (sheet.hidden) return;
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Tab') {
      const f = $$('button, a[href]', sheet); if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  /* ================================================================
     PUBLICATIONS — filter by year and type, search, copy citation
     ================================================================ */
  (function pubs() {
    const yearChips = $$('#yearChips .chip'), typeChips = $$('#typeChips .chip');
    const q = $('#q'), count = $('#count'), empty = $('#empty');
    let year = 'all', kind = 'all';
    function apply() {
      const s = q.value.trim().toLowerCase(); let n = 0;
      pubItems.forEach(p => {
        const ok = (year === 'all' || p.dataset.y === year) && (kind === 'all' || p.dataset.k === kind) && (!s || p.textContent.toLowerCase().includes(s));
        p.classList.toggle('hide', !ok); if (ok) n++;
      });
      empty.hidden = n > 0;
      count.textContent = `${n} of ${pubItems.length} publications`;
    }
    function group(chips, key) {
      chips.forEach(c => c.addEventListener('click', () => {
        chips.forEach(x => { x.classList.toggle('active', x === c); x.setAttribute('aria-pressed', x === c); });
        if (key === 'y') year = c.dataset.y; else kind = c.dataset.k;
        apply();
      }));
    }
    group(yearChips, 'y'); group(typeChips, 'k');
    let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 120); });
    apply();

    function copy(text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove(); return Promise.resolve();
    }
    $$('.cite').forEach(btn => btn.addEventListener('click', () => {
      const p = btn.closest('.pub');
      const au = p.querySelector('.au').textContent.trim();
      const yr = p.dataset.y;
      const title = p.querySelector('h3').textContent.trim();
      const venue = p.querySelector('.venue').textContent.trim();
      const link = p.querySelector('.pub-links a').href;
      copy(`${au} (${yr}). ${title}. ${venue} ${link}`).then(() => toast('Citation copied'));
    }));
  })();
})();

/* ================================================================
   HIGHLIGHT TIMELINE
   One component: the photo, the story and the step rail always show the
   same item. It advances on a timer, the bar under the active step shows
   the time left, and any interaction restarts the timer.
   ================================================================ */
(function timeline() {
  var box = document.getElementById('tl');
  if (!box) return;
  var pics  = box.querySelectorAll('.st-item');
  var copy  = box.querySelectorAll('.tl-copy');
  var steps = box.querySelectorAll('.step');
  var n = steps.length, i = 0, timer = null;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HOLD = 7000;                      // must match the 7s bar animation in the CSS

  function show(k) {
    i = (k + n) % n;
    for (var d = 0; d < n; d++) {
      var on = d === i;
      pics[d].classList.toggle('on', on);
      copy[d].classList.toggle('on', on);
      steps[d].classList.toggle('on', on);
      steps[d].setAttribute('aria-pressed', on ? 'true' : 'false');
      pics[d].setAttribute('aria-hidden', on ? 'false' : 'true');
    }
  }
  function next() { show(i + 1); }
  function prev() { show(i - 1); }

  function start() {
    if (still) return;
    stop();
    box.classList.remove('paused');
    timer = setInterval(next, HOLD);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    box.classList.add('paused');
  }
  function go(k) { show(k); start(); }   // restart the clock after any click

  document.getElementById('tlNext').addEventListener('click', function () { go(i + 1); });
  document.getElementById('tlPrev').addEventListener('click', function () { go(i - 1); });

  document.getElementById('tlSteps').addEventListener('click', function (e) {
    var b = e.target.closest('.step');
    if (b) go(+b.dataset.i);
  });

  box.addEventListener('mouseenter', stop);
  box.addEventListener('mouseleave', start);
  box.addEventListener('focusin', stop);
  box.addEventListener('focusout', start);
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(i - 1); }
  });

  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (dx < -40) go(i + 1); else if (dx > 40) go(i - 1);
    x0 = null;
  });

  // only run while it is on screen
  new IntersectionObserver(function (es) {
    es.forEach(function (en) { en.isIntersecting ? start() : stop(); });
  }, { threshold: 0.3 }).observe(box);

  show(0);
})();

/* ================================================================
   YOUTUBE — click to play, and a playlist of several videos.
   The player loads only when clicked (faster page, fewer cookies).
   Opened as a local file, YouTube blocks playback, so the link opens
   YouTube in a new tab instead.
   ================================================================ */
(function video() {
  var served = /^https?:$/.test(location.protocol);

  function play(a) {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube.com/embed/' + a.dataset.yt + '?autoplay=1&rel=0&playsinline=1';
    f.title = a.dataset.title || 'YouTube video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.allowFullscreen = true;
    f.setAttribute('style', 'width:100%;height:100%;border:0;display:block');
    a.replaceWith(f);
    f.focus();
  }

  function facade(id, title) {
    var a = document.createElement('a');
    a.className = 'yt';
    a.id = 'mPlay';
    a.href = 'https://www.youtube.com/watch?v=' + id;
    a.target = '_blank';
    a.rel = 'noopener';
    a.dataset.yt = id;
    a.dataset.title = title;
    a.setAttribute('aria-label', 'Play video: ' + title);
    a.innerHTML = '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy">' +
      '<span class="yt-play" aria-hidden="true"><svg viewBox="0 0 68 48">' +
      '<path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.3.3 34 .3 34 .3s-21.3 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3z" fill="#E8B04B"/>' +
      '<path d="M45 24 27 14v20z" fill="#0A1224"/></svg></span>';
    return a;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('.yt[data-yt]');
    if (a && served) { e.preventDefault(); play(a); }
  });

  var list = document.getElementById('playlist');
  if (!list) return;
  list.addEventListener('click', function (e) {
    var b = e.target.closest('.pl[data-yt]');
    if (!b) return;
    var id = b.dataset.yt, title = b.dataset.title, tag = b.dataset.tag || '';
    document.getElementById('mFrame').replaceChildren(facade(id, title));
    document.getElementById('mTitle').textContent = title;
    document.getElementById('mTag').textContent = 'Featured' + (tag ? ' \u00b7 ' + tag : '');
    document.getElementById('mLink').href = 'https://www.youtube.com/watch?v=' + id;
    list.querySelectorAll('.pl').forEach(function (x) {
      x.classList.toggle('active', x === b);
      if (x.dataset.yt) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
  });
})();