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
  // the scrolling strip opens the same theme panel
  $$('.strip-i').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const btn = $('.theme[data-t="' + a.dataset.t + '"]');
    $('#research').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => openSheet(+a.dataset.t, btn), reduce ? 0 : 600);
  }));
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
  var HOLD = 5000;                      // must match the 5s bar animation in the CSS

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

  // the playlist may be built later from data/media.json, so listen on the document
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.pl[data-yt]');
    if (!b) return;
    var list = b.closest('.playlist');
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

/* ================================================================
   SITE CONFIG — the only part the lab needs to change
   ================================================================
   SHEETS: paste the "Publish to web" CSV link for each tab.
           Leave a line empty to use the file in data/ instead.
   FORMS:  paste the Google Form links for the Join us buttons.
   ================================================================ */
window.AIDX_CONFIG = {
  // ---- Supabase (the lab's database) ----
  supabase: {
    url: 'https://qwvbiliewfkxpxiwlmri.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dmJpbGlld2ZreHB4aXdsbXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMDUwMTYsImV4cCI6MjEwNjc4MTAxNn0.T4EWTC2z4AKzyLOixJUapmYC1Ra8VnFl9t4fEGqqP6Y',
    bucket: 'cvs'
  },

  // ---- Google Sheets (used only if Supabase is unreachable) ----
  sheets: {
    people: '',
    news:   '',
    media:  ''
  },

  // ---- Google Forms (not used: the site has its own form) ----
  forms: { phd: '', assistant: '', internship: '', industry: '' }
};

/* ================================================================
   CONTENT FROM DATA FILES
   People, News and Media are built from data/*.json so they can be
   updated without touching the HTML. If a file is missing, unreadable
   or the page is opened straight from disk, the HTML already in the
   page is left exactly as it is — the site can never look broken.
   ================================================================ */
(function content() {
  var CFG = window.AIDX_CONFIG || { sheets: {}, forms: {} };
  var esc = function (s) { return String(s == null ? '' : s); };

  /* ---------- Join us buttons ---------- */
  document.querySelectorAll('[data-form]').forEach(function (a) {
    var url = (CFG.forms || {})[a.dataset.form];
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
  });

  /* ---------- tiny CSV parser (handles quotes and commas inside fields) ---------- */
  function parseCSV(text) {
    var rows = [], row = [], field = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    var head = rows.shift().map(function (h) { return h.trim().toLowerCase(); });
    return rows.filter(function (r) { return r.join('').trim(); }).map(function (r) {
      var o = {};
      head.forEach(function (h, k) { o[h] = (r[k] || '').trim(); });
      return o;
    });
  }

  var yes = function (v) { return /^(y|yes|true|1|✓|approved)$/i.test(String(v || '').trim()); };

  /* Google Drive share links don't work as image sources — convert them */
  function img(url) {
    url = esc(url).trim();
    if (!url) return '';
    var m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]{20,})/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1200';
    return url;
  }

  /* ---------- Supabase ---------- */
  var SB = CFG.supabase || {};
  function sbReady() { return !!(SB.url && SB.key); }
  function sbHeaders(extra) {
    var h = { apikey: SB.key, Authorization: 'Bearer ' + SB.key };
    for (var k in (extra || {})) h[k] = extra[k];
    return h;
  }
  function sbSelect(table, query) {
    if (!sbReady()) return Promise.resolve(null);
    return fetch(SB.url + '/rest/v1/' + table + '?' + query, { headers: sbHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* ---------- load: Supabase first, then a published Sheet, then the local file ---------- */
  function load(key, file) {
    var sheet = (CFG.sheets || {})[key];
    if (sheet) {
      return fetch(sheet, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (t) { return t ? { rows: parseCSV(t) } : null; })
        .catch(function () { return null; });
    }
    return fetch('data/' + file, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* ================= People ================= */
  function personCard(p) {
    var photo = img(p.photo);
    var avatar = photo ? '<img src="' + photo + '" alt="">'
      : '<span>' + esc(p.initials || (p.name || '').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 3)) + '</span>';
    var links = (p.links || []).filter(function (l) { return l && l.url; }).map(function (l) {
      return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + '</a>';
    }).join('');
    return '<article class="person rv in">' +
      '<div class="avatar" aria-hidden="true">' + avatar + '</div>' +
      '<div class="p-body"><h3>' + esc(p.name) + '</h3>' +
      '<p class="mono role">' + esc(p.role) + '</p>' +
      (p.affiliation ? '<p class="aff">' + esc(p.affiliation) + '</p>' : '') +
      (p.bio ? '<p class="bio">' + p.bio + '</p>' : '') +
      (links ? '<div class="p-links mono">' + links + '</div>' : '') +
      '</div></article>';
  }

  function personSlot(role) {
    return '<article class="person slot rv in">' +
      '<div class="avatar" aria-hidden="true"><i class="fa-solid fa-plus"></i></div>' +
      '<div class="p-body"><h3>Team member</h3><p class="mono role">' + esc(role) + '</p>' +
      '<p class="bio">Name, position, affiliation, projects, publications, awards and contact details.</p>' +
      '</div></article>';
  }

  function peopleFromRows(rows) {
    // Sheet columns: approved, show, order, group, name, role, affiliation, bio, photo, scholar, linkedin, profile
    var ok = rows.filter(function (r) { return yes(r.approved) && (r.show === undefined || r.show === '' || yes(r.show)); });
    ok.sort(function (a, b) { return (parseFloat(a.order) || 99) - (parseFloat(b.order) || 99); });
    var order = [], byGroup = {};
    ok.forEach(function (r) {
      var g = r.group || 'Team';
      if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
      byGroup[g].push({
        name: r.name, role: r.role, affiliation: r.affiliation, bio: r.bio, photo: r.photo,
        links: [
          { label: 'ACU profile', url: r.profile },
          { label: 'Google Scholar', url: r.scholar },
          { label: 'LinkedIn', url: r.linkedin }
        ]
      });
    });
    return order.map(function (g) { return { label: g, members: byGroup[g], emptyCards: 0 }; });
  }

  function peopleFromDb(rows) {
    var order = [], byGroup = {};
    rows.forEach(function (r) {
      var g = r.group_name || 'Team';
      if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
      byGroup[g].push({
        name: r.name, role: r.role, affiliation: r.affiliation, bio: r.bio, photo: r.photo_url,
        links: [
          { label: 'ACU profile', url: r.profile_url },
          { label: 'Google Scholar', url: r.scholar_url },
          { label: 'LinkedIn', url: r.linkedin_url }
        ]
      });
    });
    return order.map(function (g) { return { label: g, members: byGroup[g], emptyCards: 0 }; });
  }

  sbSelect('members', 'select=*&order=sort_order.asc').then(function (rows) {
    if (rows && rows.length) return { groups: peopleFromDb(rows) };
    return load('people', 'people.json');
  }).then(function (d) {
    if (!d) return;
    var groups = d.rows ? peopleFromRows(d.rows) : d.groups;
    if (!groups || !groups.length) return;
    var box = document.getElementById('peopleList');
    if (!box) return;
    box.innerHTML = groups.map(function (g) {
      var cards = (g.members || []).map(personCard).join('');
      for (var i = 0; i < (g.emptyCards || 0); i++) cards += personSlot(g.emptyRole || 'Team member');
      return '<p class="mono grp rv in">' + esc(g.label) + '</p><div class="people-grid">' + cards + '</div>';
    }).join('');
  });

  /* ================= News ================= */
  function newsLinks(list) {
    return (list || []).filter(function (l) { return l && l.url; }).map(function (l, i) {
      var style = i ? ' style="margin-left:18px"' : '';
      var ext = l.url.charAt(0) === '#' ? '' : ' target="_blank" rel="noopener"';
      return '<a class="mono n-link" href="' + esc(l.url) + '"' + ext + style + '>' + esc(l.label) +
        ' <i class="fa-solid ' + esc(l.icon || 'fa-arrow-up-right-from-square') + '" aria-hidden="true"></i></a>';
    }).join('');
  }

  function featureCard(f) {
    var stats = (f.stats || []).filter(function (s) { return s && s.value; }).map(function (s) {
      return '<div class="n-stat"><b>' + esc(s.value) + '</b><span class="mono">' + esc(s.label) + '</span></div>';
    }).join('');
    var photo = img(f.photo);
    return '<article class="news feature rv in">' +
      '<div class="news-img">' + (photo ? '<img src="' + photo + '" alt="' + esc(f.title) + '" loading="lazy">' : '') +
      '<div class="n-stats">' + stats + '</div></div>' +
      '<div class="news-b"><p class="mono n-meta"><span class="ntag">' + esc(f.tag) + '</span>' + esc(f.date) + '</p>' +
      '<h3>' + esc(f.title) + '</h3><p>' + esc(f.body) + '</p>' + newsLinks(f.links) + '</div></article>';
  }

  function newsCard(n) {
    var photo = img(n.photo);
    return '<article class="news rv in">' +
      (photo ? '<img class="n-photo" src="' + photo + '" alt="' + esc(n.title) + '" loading="lazy">'
             : '<div class="n-thumb" aria-hidden="true"><i class="fa-regular fa-image"></i></div>') +
      '<p class="mono n-meta"><span class="ntag">' + esc(n.tag) + '</span>' + esc(n.date) + '</p>' +
      '<h3>' + esc(n.title) + '</h3><p>' + esc(n.body || '') + '</p>' + newsLinks(n.links) + '</article>';
  }

  function newsSlot() {
    return '<article class="news slot rv in"><div class="n-thumb" aria-hidden="true"><i class="fa-regular fa-image"></i></div>' +
      '<p class="mono n-meta"><span class="ntag">News</span>Date</p><h3>Next item</h3>' +
      '<p>Description, photo and link.</p></article>';
  }

  function newsFromRows(rows) {
    // Sheet columns: show, feature, date, tag, title, body, photo, link label, link url, stat1, stat1 label, stat2, stat2 label
    var ok = rows.filter(function (r) { return r.show === undefined || r.show === '' || yes(r.show); });
    var feature = null, items = [];
    ok.forEach(function (r) {
      var o = {
        tag: r.tag, date: r.date, title: r.title, body: r.body, photo: r.photo,
        links: [{ label: r['link label'] || 'Read more', url: r['link url'], icon: 'fa-arrow-up-right-from-square' }],
        stats: [
          { value: r.stat1, label: r['stat1 label'] },
          { value: r.stat2, label: r['stat2 label'] }
        ]
      };
      if (!feature && yes(r.feature)) feature = o; else items.push(o);
    });
    return { feature: feature, items: items, emptyCards: 0 };
  }

  function newsFromDb(rows) {
    var feature = null, items = [];
    rows.forEach(function (r) {
      var o = {
        tag: r.tag, date: r.date_text, title: r.title, body: r.body, photo: r.photo_url,
        links: [{ label: r.link_label || 'Read more', url: r.link_url, icon: 'fa-arrow-up-right-from-square' }],
        stats: [{ value: r.stat1, label: r.stat1_label }, { value: r.stat2, label: r.stat2_label }]
      };
      if (!feature && r.is_feature) feature = o; else items.push(o);
    });
    return { feature: feature, items: items, emptyCards: 0 };
  }

  sbSelect('news', 'select=*&order=sort_order.asc').then(function (rows) {
    if (rows && rows.length) return newsFromDb(rows);
    return load('news', 'news.json');
  }).then(function (d) {
    if (!d) return;
    var data = d.rows ? newsFromRows(d.rows) : d;
    var box = document.getElementById('newsGrid');
    if (!box) return;
    var html = (data.feature ? featureCard(data.feature) : '') + (data.items || []).map(newsCard).join('');
    for (var i = 0; i < (data.emptyCards || 0); i++) html += newsSlot();
    if (html) box.innerHTML = html;
  });

  /* ================= Media ================= */
  function ytId(v) {
    v = esc(v).trim();
    var m = v.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
    return m ? m[1] : v;
  }

  function playBtn(id, title) {
    return '<a class="yt" id="mPlay" href="https://www.youtube.com/watch?v=' + esc(id) + '" target="_blank" rel="noopener"' +
      ' data-yt="' + esc(id) + '" data-title="' + esc(title) + '" aria-label="Play video: ' + esc(title) + '">' +
      '<img src="https://i.ytimg.com/vi/' + esc(id) + '/hqdefault.jpg" alt="" loading="lazy">' +
      '<span class="yt-play" aria-hidden="true"><svg viewBox="0 0 68 48">' +
      '<path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.3.3 34 .3 34 .3s-21.3 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3z" fill="#E8B04B"/>' +
      '<path d="M45 24 27 14v20z" fill="#0A1224"/></svg></span></a>';
  }

  sbSelect('videos', 'select=*&order=sort_order.asc').then(function (rows) {
    if (rows && rows.length) {
      return { videos: rows.map(function (r) { return { youtubeId: ytId(r.youtube_id), title: r.title, tag: r.tag }; }) };
    }
    return load('media', 'media.json');
  }).then(function (d) {
    if (!d) return;
    var videos;
    if (d.rows) {
      // Sheet columns: show, order, youtube, title, tag
      videos = d.rows.filter(function (r) { return (r.show === undefined || r.show === '' || yes(r.show)) && r.youtube; })
        .sort(function (a, b) { return (parseFloat(a.order) || 99) - (parseFloat(b.order) || 99); })
        .map(function (r) { return { youtubeId: ytId(r.youtube), title: r.title, tag: r.tag }; });
    } else {
      videos = d.videos;
    }
    if (!videos || !videos.length) return;
    var box = document.getElementById('mediaGrid');
    if (!box) return;
    var v = videos[0], many = videos.length > 1;

    var player = '<figure class="player rv in"><div class="frame" id="mFrame">' + playBtn(v.youtubeId, v.title) + '</div>' +
      '<figcaption><span class="mono" id="mTag">Featured' + (v.tag ? ' · ' + esc(v.tag) : '') + '</span>' +
      '<h3 id="mTitle">' + esc(v.title) + '</h3>' +
      '<p><a class="yt-link" id="mLink" href="https://www.youtube.com/watch?v=' + esc(v.youtubeId) + '" target="_blank" rel="noopener">' +
      'Watch on YouTube <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a></p></figcaption></figure>';

    var list = '';
    if (many) {
      list = '<ol class="playlist rv in" id="playlist" aria-label="Choose a video">' + videos.map(function (x, i) {
        return '<li><button class="pl' + (i ? '' : ' active') + '" type="button" data-yt="' + esc(x.youtubeId) + '"' +
          ' data-title="' + esc(x.title) + '" data-tag="' + esc(x.tag || '') + '" aria-pressed="' + (i ? 'false' : 'true') + '">' +
          '<span class="thumb"><img src="https://i.ytimg.com/vi/' + esc(x.youtubeId) + '/default.jpg" alt="" loading="lazy"></span>' +
          '<span class="pl-b"><span class="pl-t">' + esc(x.title) + '</span><span class="mono">' + esc(x.tag || '') + '</span></span>' +
          '</button></li>';
      }).join('') + '</ol>';
    }
    box.classList.toggle('one', !many);
    box.innerHTML = player + list;
  });
})();

/* ================================================================
   APPLICATION FORM
   Writes a row into Supabase "applications" and, if a CV is attached,
   uploads it to the private "cvs" bucket. Row Level Security means a
   visitor can submit but can never read anyone's application back.
   ================================================================ */
(function apply() {
  var CFG = (window.AIDX_CONFIG || {}).supabase || {};
  var form = document.getElementById('applyForm');
  if (!form) return;
  var note = document.getElementById('applyNote');
  var btn = document.getElementById('applySend');
  var kindSel = document.getElementById('applyKind');

  // the Join us cards preselect what the person is applying for
  document.querySelectorAll('[data-kind]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (kindSel) kindSel.value = a.dataset.kind;
      setTimeout(function () { var n = form.querySelector('[name="name"]'); if (n) n.focus(); }, 500);
    });
  });

  function headers(extra) {
    var h = { apikey: CFG.key, Authorization: 'Bearer ' + CFG.key };
    for (var k in (extra || {})) h[k] = extra[k];
    return h;
  }

  function say(msg, cls) {
    note.textContent = msg;
    note.className = 'mono f-note' + (cls ? ' ' + cls : '');
  }

  function safeName(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9.\-]+/g, '-').replace(/^-+|-+$/g, '').slice(-60);
  }

  // One uploader for both buckets.
  //   cvs    — private. Only the lab can open these, from the dashboard.
  //   photos — public, because a profile photo has to load in a browser.
  function upload(bucket, file, folder) {
    var path = folder + '/' + Date.now() + '-' + safeName(file.name);
    return fetch(CFG.url + '/storage/v1/object/' + bucket + '/' + path, {
      method: 'POST',
      headers: headers({ 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }),
      body: file
    }).then(function (r) {
      if (!r.ok) throw new Error(bucket + ' upload failed');
      return path;
    });
  }

  function publicUrl(bucket, path) {
    return CFG.url + '/storage/v1/object/public/' + bucket + '/' + path;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (!CFG.url || !CFG.key) { say('The form is not connected yet. Please email the lab instead.', 'bad'); return; }

    var data = new FormData(form);
    var kind = data.get('kind');
    var file = document.getElementById('applyCv').files[0];
    var pic  = document.getElementById('applyPhoto').files[0];
    if (file && file.size > 10 * 1024 * 1024) { say('That CV is larger than 10 MB. Please attach a smaller file.', 'bad'); return; }
    if (pic && pic.size > 5 * 1024 * 1024) { say('That photo is larger than 5 MB. Please attach a smaller one.', 'bad'); return; }

    btn.disabled = true;
    say(file || pic ? 'Uploading your files…' : 'Sending…');

    // Upload whatever was attached, then save the row. A failed photo
    // must not lose the application, so that one is allowed to fail quietly.
    var step = Promise.all([
      file ? upload(CFG.bucket || 'cvs', file, kind) : null,
      pic ? upload('photos', pic, kind).then(function (p) { return publicUrl('photos', p); }, function () { return null; }) : null
    ]);

    step.then(function (out) {
      var cvPath = out[0], photoUrl = out[1];
      say('Sending…');
      return fetch(CFG.url + '/rest/v1/applications', {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({
          kind:         data.get('kind'),
          name:         data.get('name'),
          email:        data.get('email'),
          organisation: data.get('organisation') || null,
          availability: data.get('availability') || null,
          interests:    data.get('interests') || null,
          skills:       data.get('skills') || null,
          motivation:   data.get('motivation'),
          links:        data.get('links') || null,
          cv_path:      cvPath,
          bio:          data.get('bio') || null,
          photo_url:    photoUrl
        })
      });
    }).then(function (r) {
      if (!r || !r.ok) throw new Error('save failed');
      form.classList.add('sent');
      say('Thank you. Your application has been sent to the lab, and we will be in touch by email.', 'ok');
    }).catch(function () {
      btn.disabled = false;
      say('Sorry, something went wrong. Please try again, or email the lab directly.', 'bad');
    });
  });
})();
