/* OPF 2027 — motion layer: reveal on scroll, drifting titles, parallax, count-ups,
   tilt cards, click sparkles, scroll progress. Off entirely with prefers-reduced-motion. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // home: a marquee strip between the hero and the overview (shown even with reduced motion)
  const overview = document.querySelector('body:not(.lp) #overview');
  if (overview && document.querySelector('.hero')) {
    const text = 'GET ISEKAIED ✦ JUNE 5–6, 2027 ✦ OKADA MANILA ✦ 20+ IPs FROM JAPAN ✦ COSPLAY CUP ✦ COVE MUSIC LIVE ✦ ';
    overview.insertAdjacentHTML('beforebegin', `<div class="m-marquee" aria-hidden="true"><div>${text.repeat(4)}</div></div>`);
  }
  if (reduce) return;
  root.classList.add('m-on');

  /* ---------- reveal on scroll ---------- */
  const GROUPS = [
    '.zone-card', '.otrio-card', '.tile', '.card', '.pass', '.news-card', '.stat', '.flow li', '.steps li',
    '.highlight', '.ticket-row', '.info-row', '.person', '.desk', '.presented > div', '.logos > *', '.booth-card',
    '.shuttle-card', '.incl-card', '.b-prize', '.b-timeline li', '.a-pass', '.a-proof > div', '.b-judges li',
    '.imap__legend li', '.ip-grid li', '.house-rules li', '.grid-4 > .ph',
  ];
  const SINGLES = [
    '.cta-box', '.join-promo__box', '.imap__stage', '.imap__info', '.map-layout', '.tt-card', '.compare-wrap', '.form-card',
    '.venue3d', '.faq details', '.access-map', '.info-list', '.concept__lead', '.label-bar', '.lead', '.ticket-banner',
    '.a-quote', '.b-testimonial', '.b-h2', '.a-h2', '.filters', '.tabs', '.article', '.prose > *', '.legal-nav',
  ];
  const marked = new Set();
  GROUPS.forEach((sel) => {
    const byParent = new Map();
    $$(sel).forEach((el) => {
      if (marked.has(el) || el.closest('.site-header, .mobile-menu, .sample-panel, .popup, .cc, .cc-modal, .join-hero, .hero, [hidden]')) return;
      const list = byParent.get(el.parentElement) || [];
      list.push(el); byParent.set(el.parentElement, list);
    });
    byParent.forEach((list) => list.forEach((el, i) => { el.dataset.reveal = el.dataset.reveal || 'up'; el.style.setProperty('--i', Math.min(i, 7)); marked.add(el); }));
  });
  SINGLES.forEach((sel) => $$(sel).forEach((el) => {
    if (marked.has(el) || el.closest('.site-header, .mobile-menu, .sample-panel, .popup, .cc, .cc-modal, .join-hero, .hero')) return;
    el.dataset.reveal = el.dataset.reveal || 'up'; marked.add(el);
  }));
  $$('.stat, .a-proof > div').forEach((el) => { el.dataset.reveal = 'pop'; });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
      countUp(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  marked.forEach((el) => io.observe(el));
  const pending = new Set(marked);
  // anything already on screen (or jumped to by #hash) shows straight away
  requestAnimationFrame(() => marked.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) { el.classList.add('is-in'); countUp(el); } }));
  // content revealed later (tabs, filters, accordions) must never stay invisible
  document.addEventListener('click', () => setTimeout(() => marked.forEach((el) => { if (!el.classList.contains('is-in') && el.offsetParent && el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in'); }), 50));
  document.addEventListener('toggle', (e) => { if (e.target.tagName === 'DETAILS') $$('[data-reveal]', e.target).forEach((el) => el.classList.add('is-in')); }, true);

  /* ---------- count-up numbers ---------- */
  function countUp(scope) {
    const els = scope.matches('.stat__num, .a-proof b') ? [scope] : $$('.stat__num, .a-proof b', scope);
    els.forEach((el) => {
      if (el.dataset.counted) return;
      const m = el.textContent.trim().match(/^(\D*?)(\d[\d,]*)(\D*)$/);
      if (!m || /[–-]/.test(el.textContent)) return;
      el.dataset.counted = '1';
      const end = +m[2].replace(/,/g, ''), comma = m[2].includes(','), t0 = performance.now(), dur = 1200;
      el.style.minWidth = el.offsetWidth + 'px';
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        el.textContent = m[1] + (comma ? v.toLocaleString('en-US') : v) + m[3];
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- scroll-linked: title drift, parallax, header, progress ---------- */
  const titles = $$('.sec-title');
  const heroImgs = $$('.hero__kv, .join-hero__bg');
  const header = document.querySelector('.site-header');
  const bar = document.createElement('div');
  bar.className = 'm-progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  let ticking = false;
  function onScroll() {
    ticking = false;
    const vh = innerHeight;
    // safety net: anything that has reached (or been scrolled past) the screen is shown, even on fast flings
    if (pending.size) pending.forEach((el) => {
      if (el.classList.contains('is-in')) { pending.delete(el); return; }
      if (el.getBoundingClientRect().top < vh * 0.96) { el.classList.add('is-in'); countUp(el); pending.delete(el); io.unobserve(el); }
    });
    titles.forEach((t) => {
      const r = t.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const center = (r.top + r.height / 2) / vh;                  // 1 = bottom of screen, 0 = top
      t.style.setProperty('--drift', Math.max(0, Math.min(1.2, 1 - center)).toFixed(3));   // 0 at the bottom → words slide apart as it rises
      t.style.setProperty('--seen', Math.max(0, Math.min(1, (1 - center) * 4)).toFixed(3));
    });
    heroImgs.forEach((img) => { if (scrollY < vh * 1.2) img.style.setProperty('--para', (scrollY * 0.18).toFixed(1) + 'px'); });
    if (header) header.classList.toggle('is-scrolled', scrollY > 8);
    const max = document.documentElement.scrollHeight - vh;
    bar.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- 3D tilt (mouse / trackpad only) ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.tile, .zone-card, .otrio-card, .pass, .a-pass, .b-prize, .booth-card, .highlight').forEach((card) => {
      card.classList.add('m-tilt');
      if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
      const glare = document.createElement('span'); glare.className = 'm-glare'; card.appendChild(glare);
      card.addEventListener('pointermove', (e) => {
        if (card.classList.contains('is-live')) return;
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        card.classList.add('is-tilting');
      });
      card.addEventListener('pointerleave', () => { card.classList.remove('is-tilting'); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- sparkle burst on the main calls to action ---------- */
  const COLORS = ['var(--yellow)', 'var(--pink)', 'var(--cyan)', '#fff'];
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn--pink, .btn--yellow, .btn-tickets, .ip-pick');
    if (!b) return;
    const burst = document.createElement('span');
    burst.className = 'm-burst';
    burst.style.left = e.clientX + 'px'; burst.style.top = e.clientY + 'px';
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.4, d = 36 + Math.random() * 34;
      const s = document.createElement('i');
      s.style.setProperty('--x', (Math.cos(a) * d).toFixed(1) + 'px');
      s.style.setProperty('--y', (Math.sin(a) * d).toFixed(1) + 'px');
      s.style.setProperty('--c', COLORS[i % COLORS.length]);
      burst.appendChild(s);
    }
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 700);
  });
})();
