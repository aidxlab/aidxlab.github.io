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
    // run the decision engine the first time it is actually on screen (matters on phones)
    const eo = new IntersectionObserver(es => {
      if (es[0].isIntersecting) { eo.disconnect(); setTimeout(() => engine.run(), reduce ? 0 : 550); }
    }, { threshold: 0.3 });
    eo.observe($('#engine'));
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
     DECISION ENGINE — weigh options, explain the recommendation,
     and leave the final call to a person (approve / override)
     ================================================================ */
  const CRIT = [
    { k: 'impact', label: 'Impact', cls: 'c-impact', inv: false, pos: 'expected impact', neg: 'lower expected impact' },
    { k: 'fair',   label: 'Fairness', cls: 'c-fair', inv: false, pos: 'fairness', neg: 'weaker fairness' },
    { k: 'risk',   label: 'Low risk', cls: 'c-risk', inv: true,  pos: 'lower risk', neg: 'higher risk' },
    { k: 'cost',   label: 'Low cost', cls: 'c-cost', inv: true,  pos: 'lower cost', neg: 'higher cost' }
  ];
  const SCEN = [
    { q: 'Which intervention should reach at-risk first-year students first?',
      w: { impact: 40, fair: 30, risk: 15, cost: 15 },
      o: [
        { n: 'Adaptive nudges', impact: .72, fair: .80, risk: .20, cost: .15 },
        { n: 'Tutor outreach',  impact: .86, fair: .78, risk: .15, cost: .70 },
        { n: 'Peer mentoring',  impact: .74, fair: .88, risk: .10, cost: .35 },
        { n: 'Workload review', impact: .55, fair: .70, risk: .12, cost: .25 }
      ] },
    { q: 'Is this student-risk prediction model ready to deploy?',
      w: { impact: 30, fair: 35, risk: 25, cost: 10 },
      o: [
        { n: 'Deploy now',             impact: .80, fair: .45, risk: .75, cost: .20 },
        { n: 'Monitored rollout',      impact: .74, fair: .66, risk: .40, cost: .35 },
        { n: 'Supervised pilot',       impact: .62, fair: .82, risk: .18, cost: .45 },
        { n: 'Fairness audit first',  impact: .30, fair: .90, risk: .08, cost: .30 }
      ] },
    { q: 'Where should a limited AI budget be invested this year?',
      w: { impact: 35, fair: 20, risk: 20, cost: 25 },
      o: [
        { n: 'Service chat agent',  impact: .70, fair: .55, risk: .50, cost: .40 },
        { n: 'Demand forecasting',  impact: .76, fair: .60, risk: .25, cost: .45 },
        { n: 'Document triage',     impact: .66, fair: .62, risk: .20, cost: .25 },
        { n: 'Staff AI upskilling', impact: .72, fair: .80, risk: .10, cost: .50 }
      ] }
  ];
  const weights = SCEN.map(s => ({ ...s.w }));

  const engine = (() => {
    const qEl = $('#engQ'), optsEl = $('#engOpts'), whyEl = $('#engWhy'), logEl = $('#engLog');
    const steps = $$('#engSteps li'), tabs = $$('.eng-tab'), wGrid = $('#wGrid');
    const approve = $('#engApprove'), override = $('#engOverride'), runBtn = $('#engRun');
    let cur = 0, token = 0, ranked = [], busy = false;

    const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
    function contrib(o, w) {
      const sum = CRIT.reduce((a, c) => a + w[c.k], 0) || 1;
      return CRIT.map(c => (w[c.k] / sum) * (c.inv ? 1 - o[c.k] : o[c.k]));
    }
    function score(o, w) { return contrib(o, w).reduce((a, b) => a + b, 0) * 100; }

    function setStep(i) {
      steps.forEach((s, j) => { s.classList.toggle('on', j < i || j === i); s.classList.toggle('now', j === i && i < 3); });
    }
    function buildRows() {
      const s = SCEN[cur];
      optsEl.innerHTML = s.o.map((o, i) => `
        <li class="opt" data-i="${i}">
          <span class="opt-n" title="${o.n}">${o.n}</span>
          <span class="opt-bar" aria-hidden="true">${CRIT.map(c => `<i class="${c.cls}"></i>`).join('')}</span>
          <span class="opt-s">–</span>
        </li>`).join('');
    }
    function fillBars(animateNums) {
      const s = SCEN[cur], w = weights[cur];
      $$('.opt', optsEl).forEach((row, i) => {
        const cs = contrib(s.o[i], w), total = cs.reduce((a, b) => a + b, 0) * 100;
        $$('.opt-bar i', row).forEach((seg, k) => { seg.style.width = (cs[k] * 100) + '%'; });
        const out = $('.opt-s', row);
        if (animateNums && !reduce) {
          const t0 = performance.now();
          (function tick(t) {
            const p = Math.min(1, (t - t0) / 850);
            out.textContent = Math.round(total * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
          })(t0);
        } else out.textContent = Math.round(total);
        row.setAttribute('aria-label', `${s.o[i].n}: score ${Math.round(total)} out of 100`);
      });
    }
    function rank() {
      const s = SCEN[cur], w = weights[cur];
      ranked = s.o.map((o, i) => ({ i, n: o.n, s: score(o, w), c: contrib(o, w) })).sort((a, b) => b.s - a.s);
      return ranked;
    }
    function explain() {
      const [W, R] = ranked;
      const diffs = CRIT.map((c, k) => ({ c, d: (W.c[k] - R.c[k]) * 100 }));
      const pos = diffs.filter(x => x.d > 0.4).sort((a, b) => b.d - a.d).slice(0, 2).map(x => x.c.pos);
      const negItem = diffs.filter(x => x.d < -0.4).sort((a, b) => a.d - b.d)[0];
      const margin = Math.round(W.s) - Math.round(R.s);
      const lead = pos.length ? `It leads on <b>${pos.join('</b> and <b>')}</b>` : 'It edges ahead across the criteria';
      const tradeoff = negItem ? `, which outweighs its ${negItem.c.neg}` : '';
      const verdict = margin <= 3
        ? ' This is a close call — the final judgement should rest with a person who can weigh context the model cannot see.'
        : ' The margin is clear, but a person still makes the final decision.';
      whyEl.style.opacity = 0;
      whyEl.innerHTML = `<span class="tag">Why this recommendation</span><br><b>${W.n}</b> scores ${Math.round(W.s)} against ${Math.round(R.s)} for ${R.n}. ${lead}${tradeoff}.${verdict}`;
      requestAnimationFrame(() => { whyEl.style.transition = 'opacity .5s'; whyEl.style.opacity = 1; });
    }
    function markWinner() {
      $$('.opt', optsEl).forEach(r => r.classList.remove('win', 'human'));
      const row = $(`.opt[data-i="${ranked[0].i}"]`, optsEl);
      if (row) row.classList.add('win');
    }
    function review(msg) {
      setStep(3);
      approve.disabled = false; override.disabled = false;
      logEl.innerHTML = msg || 'Recommendation ready · awaiting a human decision';
    }
    function buildWeights() {
      const w = weights[cur];
      wGrid.innerHTML = CRIT.map(c => `
        <div class="w">
          <label for="w-${c.k}">${c.label}<b id="wv-${c.k}">${w[c.k]}</b></label>
          <input type="range" id="w-${c.k}" min="0" max="100" step="5" value="${w[c.k]}" data-k="${c.k}">
        </div>`).join('');
      $$('input', wGrid).forEach(inp => inp.addEventListener('input', () => {
        weights[cur][inp.dataset.k] = +inp.value;
        $('#wv-' + inp.dataset.k).textContent = inp.value;
        if (busy) return;
        fillBars(false); rank(); markWinner(); explain();
        review('Weights changed · recommendation updated · awaiting a human decision');
      }));
    }

    async function run() {
      const my = ++token; busy = true;
      const s = SCEN[cur];
      approve.disabled = true; override.disabled = true; logEl.textContent = '';
      qEl.textContent = s.q;
      buildRows(); buildWeights();
      whyEl.innerHTML = '<span class="tag">Gathering evidence</span><br>Collecting the options and the criteria they will be judged on.';
      setStep(0);
      await wait(700); if (my !== token) return;
      setStep(1);
      whyEl.innerHTML = '<span class="tag">Weighing</span><br>Scoring each option against impact, fairness, risk and cost using the current weights.';
      fillBars(true);
      await wait(1100); if (my !== token) return;
      setStep(2);
      rank(); markWinner(); explain();
      await wait(900); if (my !== token) return;
      busy = false;
      review();
    }

    function stamp() { return new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }); }
    approve.addEventListener('click', () => {
      approve.disabled = true; override.disabled = true; setStep(4);
      logEl.innerHTML = `<span class="ok">✓ Approved by reviewer · ${ranked[0].n} · logged for audit ${stamp()}</span>`;
    });
    override.addEventListener('click', () => {
      approve.disabled = true; override.disabled = true; setStep(4);
      const alt = ranked[1];
      const row = $(`.opt[data-i="${alt.i}"]`, optsEl); if (row) row.classList.add('human');
      logEl.innerHTML = `<span class="ov">↺ Override recorded · reviewer chose ${alt.n} · reason logged for audit ${stamp()}</span>`;
    });
    runBtn.addEventListener('click', run);
    tabs.forEach(t => t.addEventListener('click', () => {
      if (+t.dataset.s === cur && busy) return;
      tabs.forEach(x => { x.classList.toggle('active', x === t); x.setAttribute('aria-selected', x === t); });
      cur = +t.dataset.s; run();
    }));
    // show the first scenario straight away so the panel is never empty
    qEl.textContent = SCEN[0].q; buildRows(); buildWeights(); setStep(-1);
    whyEl.innerHTML = '<span class="tag">Ready</span><br>Four options will be weighed against impact, fairness, risk and cost.';
    return { run };
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
   PHOTO SLIDER — arrows, dots, autoplay, swipe, keyboard
   ================================================================ */
(function slider() {
  var track = document.getElementById('track');
  if (!track) return;
  var slides = track.children;
  var n = slides.length;
  var dotsBox = document.getElementById('sDots');
  var i = 0, timer = null;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (var d = 0; d < n; d++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', 'Photo ' + (d + 1));
    b.dataset.i = d;
    dotsBox.appendChild(b);
  }
  var dots = dotsBox.children;

  function show(k) {
    i = (k + n) % n;
    track.style.transform = 'translateX(' + (-i * 100) + '%)';
    for (var d = 0; d < n; d++) {
      dots[d].setAttribute('aria-selected', d === i ? 'true' : 'false');
      slides[d].setAttribute('aria-hidden', d === i ? 'false' : 'true');
    }
  }
  function next() { show(i + 1); }
  function prev() { show(i - 1); }
  function play() { if (!still) { stop(); timer = setInterval(next, 5000); } }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  document.getElementById('sNext').addEventListener('click', function () { next(); play(); });
  document.getElementById('sPrev').addEventListener('click', function () { prev(); play(); });
  dotsBox.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) { show(+b.dataset.i); play(); }
  });

  var box = document.getElementById('slider');
  box.addEventListener('mouseenter', stop);
  box.addEventListener('mouseleave', play);
  box.addEventListener('focusin', stop);
  box.addEventListener('focusout', play);
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { next(); play(); }
    if (e.key === 'ArrowLeft') { prev(); play(); }
  });

  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (dx < -40) next(); else if (dx > 40) prev();
    x0 = null; play();
  });

  new IntersectionObserver(function (es) {
    es.forEach(function (en) { en.isIntersecting ? play() : stop(); });
  }, { threshold: 0.25 }).observe(box);

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