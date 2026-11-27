/* OPF 2027 sample site — behaviour added on top of the concept demo's main.js.
   Phase switcher, palette preview, filters, tabs, FAQ search, countdown, forms. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const toast = (m) => (window.opfToast ? window.opfToast(m) : alert(m));
  const root = document.documentElement;

  /* ---------- site phase (one CMS switch in the real build) ---------- */
  const PHASES = ['announce', 'onsale', 'event', 'post'];
  function setPhase(p) {
    if (!PHASES.includes(p)) p = 'announce';
    root.dataset.phase = p;
    store.set('opf-phase', p);
    $$('[data-set-phase]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setPhase === p)));
    markNow();
  }

  /* ---------- palette preview: proves a new KV is a token change ---------- */
  const PALETTES = {
    proposal: null, // tokens.css as shipped
    violet: { '--opf-brand-isekai-blue': '#4B1FB8', '--opf-brand-sakura-pink': '#FF5A8A', '--opf-brand-sakura-deep': '#D02A62', '--opf-brand-pop-yellow': '#FFE15A', '--opf-brand-portal-cyan': '#3ED6C5', '--opf-neutral-night': '#170B3B' },
    sunset: { '--opf-brand-isekai-blue': '#D9381E', '--opf-brand-sakura-pink': '#1D3FBF', '--opf-brand-sakura-deep': '#1A37A6', '--opf-brand-pop-yellow': '#FFE45C', '--opf-brand-portal-cyan': '#FF9A3C', '--opf-neutral-night': '#2A0E08' },
    forest: { '--opf-brand-isekai-blue': '#0E6B4F', '--opf-brand-sakura-pink': '#F2668B', '--opf-brand-sakura-deep': '#C93A62', '--opf-brand-pop-yellow': '#F4F06A', '--opf-brand-portal-cyan': '#58C7E8', '--opf-neutral-night': '#06261C' },
  };
  function setPalette(name) {
    if (!(name in PALETTES)) name = 'proposal';
    Object.values(PALETTES).forEach((p) => p && Object.keys(p).forEach((k) => root.style.removeProperty(k)));
    const p = PALETTES[name];
    if (p) Object.entries(p).forEach(([k, v]) => root.style.setProperty(k, v));
    store.set('opf-palette', name);
    $$('[data-set-palette]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setPalette === name)));
  }

  setPhase(store.get('opf-phase') || 'announce');
  setPalette(store.get('opf-palette') || 'proposal');

  document.addEventListener('click', (e) => {
    const ph = e.target.closest('[data-set-phase]');
    if (ph) { setPhase(ph.dataset.setPhase); toast(`Showing the site as it looks in the "${ph.textContent.trim().split('\n')[0]}" phase.`); }
    const pa = e.target.closest('[data-set-palette]');
    if (pa) setPalette(pa.dataset.setPalette);
  });

  const panel = $('.sample-panel');
  if (panel) {
    const btn = $('.sample-panel__toggle', panel);
    const body = $('.sample-panel__body', panel);
    btn.addEventListener('click', () => {
      const open = body.hidden;
      body.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !body.hidden) { body.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  }

  /* ---------- announcement bar ---------- */
  const annc = $('.annc');
  if (annc) {
    if (store.get('opf-annc-closed') === '1') annc.hidden = true;
    $('.annc__close', annc)?.addEventListener('click', () => { annc.hidden = true; store.set('opf-annc-closed', '1'); });
  }

  /* ---------- header dropdowns (tap support) ---------- */
  $$('.has-sub > button').forEach((b) => {
    b.addEventListener('click', () => {
      const li = b.parentElement;
      const open = !li.classList.contains('is-open');
      $$('.has-sub.is-open').forEach((x) => { x.classList.remove('is-open'); x.firstElementChild.setAttribute('aria-expanded', 'false'); });
      li.classList.toggle('is-open', open);
      b.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.has-sub')) $$('.has-sub.is-open').forEach((x) => { x.classList.remove('is-open'); x.firstElementChild.setAttribute('aria-expanded', 'false'); });
  });

  /* ---------- language toggle ---------- */
  $$('.lang button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.lang === 'jp') toast('Japanese version is an optional add-on (translation supplied by CA). The toggle is here to show where it sits.');
  }));

  /* ---------- generic filters: <div class="filters" data-filter-target="#grid"> <button data-filter="anime"> ---------- */
  $$('.filters[data-filter-target]').forEach((bar) => {
    const grid = $(bar.dataset.filterTarget);
    if (!grid) return;
    const key = bar.dataset.filterKey || 'cat';
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-filter]');
      if (!b) return;
      $$('button[data-filter]', bar).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const f = b.dataset.filter;
      let shown = 0;
      $$(`[data-${key}]`, grid).forEach((item) => {
        const hit = f === 'all' || item.dataset[key].split(' ').includes(f);
        item.classList.toggle('is-filtered-out', !hit);
        if (hit) shown++;
      });
      const empty = grid.parentElement.querySelector('.empty-note');
      if (empty) empty.hidden = shown > 0;
    });
  });

  /* ---------- tabs: [role=tablist] buttons with aria-controls ---------- */
  $$('[role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    const select = (t) => {
      tabs.forEach((x) => {
        const on = x === t;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        const panelEl = document.getElementById(x.getAttribute('aria-controls'));
        if (panelEl) panelEl.hidden = !on;
      });
    };
    list.addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) select(t); });
    list.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        n.focus(); select(n);
      }
    });
  });

  /* ---------- timetable venue filter ---------- */
  $$('[data-venue-filter]').forEach((bar) => {
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-venue]');
      if (!b) return;
      $$('button[data-venue]', bar).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const v = b.dataset.venue;
      $$('.timetable').forEach((t) => {
        ['discover', 'connect', 'celebrate'].forEach((c) => t.classList.toggle(`hide-col-${c}`, v !== 'all' && v !== c));
      });
    });
  });

  /* "Now" marker — during event week we pretend it is 14:00 on Day 1 */
  function markNow() {
    $$('.now-row').forEach((r) => r.classList.remove('now-row'));
    if (root.dataset.phase !== 'event') return;
    const t = $('#day1 .timetable');
    if (!t) return;
    const row = [...t.tBodies[0].rows].find((r) => r.cells[0].textContent.startsWith('13:30'));
    if (row) row.classList.add('now-row');
  }

  /* ---------- FAQ search ---------- */
  const q = $('#faq-q');
  if (q) {
    const items = $$('.faq details');
    const empty = $('#faq-empty');
    q.addEventListener('input', () => {
      const term = q.value.trim().toLowerCase();
      let shown = 0;
      items.forEach((d) => {
        const hit = !term || d.textContent.toLowerCase().includes(term);
        d.classList.toggle('is-filtered-out', !hit);
        if (hit) shown++;
        if (term && hit) d.open = true;
      });
      empty.hidden = shown > 0;
      if (term) $$('#faq-cats button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));
    });
  }

  /* ---------- countdown ---------- */
  $$('[data-countdown]').forEach((el) => {
    const end = new Date(el.dataset.countdown).getTime();
    const parts = $$('b', el);
    const tick = () => {
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      [d, h, m, s].forEach((v, i) => { if (parts[i]) parts[i].textContent = String(v).padStart(2, '0'); });
    };
    tick();
    setInterval(tick, 1000);
  });

  /* ---------- copy hashtags ---------- */
  $$('.copy-tag').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast(`Copied ${b.dataset.copy}`); } catch (e) { toast(b.dataset.copy); }
  }));
  $$('[data-share]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('Link copied.'); } catch (e) { toast(location.href); }
  }));

  /* ---------- demo forms: validate, then show a success state (nothing is sent) ---------- */
  $$('form[data-demo-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      $$('[required]', form).forEach((input) => {
        const field = input.closest('.field') || input.closest('.check');
        const bad = input.type === 'checkbox' ? !input.checked : !input.value.trim() || (input.type === 'email' && !/^\S+@\S+\.\S+$/.test(input.value));
        field?.classList.toggle('has-error', bad);
        if (bad && ok) { input.focus(); ok = false; }
      });
      if (!ok) return;
      const done = form.parentElement.querySelector('.form-done');
      if (done) { form.hidden = true; done.hidden = false; done.focus(); }
      else { toast('Thanks! (Sample site — nothing was sent.)'); form.reset(); }
    });
    form.addEventListener('input', (e) => {
      const field = e.target.closest('.field, .check');
      if (field?.classList.contains('has-error')) field.classList.remove('has-error');
    });
  });
  $$('form.signup').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const i = $('input', f);
    if (!/^\S+@\S+\.\S+$/.test(i.value)) { toast('Please enter a valid email address.'); i.focus(); return; }
    toast("You're on the list! (Sample site — nothing was sent.)");
    f.reset();
  }));
})();

/* 3D venue viewer: load the heavy WebGL scene only when asked */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.venue3d__play');
  if (!btn) return;
  const box = btn.closest('.venue3d');
  const f = document.createElement('iframe');
  f.src = box.dataset.src;
  f.title = box.dataset.title;
  f.allow = 'fullscreen';
  f.loading = 'eager';
  box.replaceChildren(f);
  box.classList.add('is-live');
  f.focus();
});
