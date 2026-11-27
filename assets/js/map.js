/* OPF 2027 — interactive venue map.
   Mobile first: tap a zone to select + zoom to it; pinch, drag or +/− to zoom and pan.
   Page scrolling still works over the map until you zoom in. */
(function () {
  'use strict';
  const maps = document.querySelectorAll('[data-imap]');
  if (!maps.length) return;

  maps.forEach((root) => {
    const svg = root.querySelector('.imap-svg');
    const stage = root.querySelector('.imap__stage');
    const info = root.querySelector('.imap__info');
    const data = JSON.parse(root.querySelector('.imap-data').textContent);
    const full = { x: 0, y: 0, width: 1600, height: 835 };   // fixed map bounds (viewBox changes as you zoom)
    let HOME = { x: 20, y: 0, w: 1580, h: 835 };       // whole map; recomputed for tall (phone) screens
    function computeHome() {
      const r = svg.getBoundingClientRect();
      const ratio = r.width ? r.height / r.width : 835 / 1580;
      if (ratio <= 835 / 1580 + 0.01) HOME = { x: 20, y: 0, w: 1580, h: 835 };
      else { const w = 1310; const h = w * ratio; HOME = { x: 150, y: Math.max(-40, (835 - h) / 2 - 30), w, h }; }
    }
    computeHome();
    const MAX_ZOOM = 7;
    let vb = { ...HOME };
    let lastW = innerWidth;
    window.addEventListener('resize', () => {
      if (innerWidth === lastW) return;   // ignore mobile URL-bar height changes
      lastW = innerWidth;
      const wasHome = zoomLevel() <= 1.05;
      computeHome();
      if (wasHome) { vb = { ...HOME }; draw(); }
    });
    let selected = null;

    /* ---------- viewBox helpers ---------- */
    const zoomLevel = () => HOME.w / vb.w;
    function clamp(v) {
      if (v.w >= HOME.w * 0.98) return { ...HOME };   // fully zoomed out = whole map
      const w = Math.min(Math.max(v.w, HOME.w / MAX_ZOOM), HOME.w);
      const h = w * (HOME.h / HOME.w);
      const x = Math.min(Math.max(v.x, full.x - w * 0.15), full.x + full.width - w * 0.85);
      const y = Math.min(Math.max(v.y, full.y - h * 0.15), full.y + full.height - h * 0.85);
      return { x, y, w, h };
    }
    let animId = 0;
    function apply(v, animate) {
      const target = clamp(v);
      animId++;
      if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { vb = target; draw(); return; }
      const from = { ...vb };
      const t0 = performance.now();
      const run = ++animId;
      // background tabs may not run animation frames: make sure we land on the target
      setTimeout(() => { if (run === animId) { vb = target; draw(); } }, 380);
      const step = (t) => {
        if (run !== animId) return;
        const k = Math.min(1, (t - t0) / 320);
        const e = 1 - Math.pow(1 - k, 3);
        vb = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e };
        draw();
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    function draw() {
      svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
      const z = zoomLevel();
      root.classList.toggle('is-zoomed', z > 1.05);
      root.classList.toggle('is-fine', z >= 1.8);
      stage.style.touchAction = z > 1.05 ? 'none' : 'pan-y';
    }
    // svg units per screen pixel (preserveAspectRatio = meet)
    function unitsPerPx() {
      const r = svg.getBoundingClientRect();
      return Math.max(vb.w / r.width, vb.h / r.height);
    }
    function toSvg(clientX, clientY) {
      const r = svg.getBoundingClientRect();
      const s = unitsPerPx();
      const ox = (r.width * s - vb.w) / 2, oy = (r.height * s - vb.h) / 2;
      return { x: vb.x + (clientX - r.left) * s - ox, y: vb.y + (clientY - r.top) * s - oy };
    }
    function zoomAt(factor, cx, cy, animate) {
      const w = vb.w / factor, h = vb.h / factor;
      apply({ x: cx - (cx - vb.x) / factor, y: cy - (cy - vb.y) / factor, w, h }, animate);
    }
    function fitTo(el, pad = 60, maxZoom = 3.2) {
      const b = el.getBBox();
      let w = Math.max(b.width + pad * 2, HOME.w / maxZoom);
      let h = w * (HOME.h / HOME.w);
      if (b.height + pad * 2 > h) { h = b.height + pad * 2; w = h * (HOME.w / HOME.h); }
      apply({ x: b.x + b.width / 2 - w / 2, y: b.y + b.height / 2 - h / 2, w, h }, true);
    }

    /* ---------- selection ---------- */
    const zoneEls = (id) => svg.querySelectorAll(`[data-zone="${id}"]`);
    function select(id, opts = {}) {
      selected = id;
      root.classList.toggle('has-selection', !!id);
      svg.querySelectorAll('.is-active').forEach((el) => el.classList.remove('is-active'));
      root.querySelectorAll('.imap__legend button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.zone === id)));
      if (!id) { showInfo(null); return; }
      zoneEls(id).forEach((el) => el.classList.add('is-active'));
      showInfo(data[id]);
      if (opts.zoom !== false) {
        const shape = svg.querySelector(`.imap-zone[data-zone="${id}"] > .imap-zone__shape`);
        if (shape) fitTo(shape, id === 'entrance' || id === 'exit' ? 140 : 40, id === 'ip' ? 3.2 : 3);
      }
    }
    function showInfo(d, booth) {
      const k = info.querySelector('.imap__kicker');
      const t = info.querySelector('.imap__title');
      const p = info.querySelector('.imap__text');
      const l = info.querySelector('.imap__links');
      if (!d && !booth) {
        k.textContent = 'Crystal Pavilion · Discover';
        t.textContent = 'Tap any zone on the map';
        p.textContent = "See what's there and how to get to it. Zoom into the IP Booths to find a specific booth.";
        l.innerHTML = '';
        return;
      }
      if (booth) {
        k.textContent = `IP booth ${booth.dataset.booth} · Layout ${booth.dataset.layout}`;
        t.textContent = booth.dataset.title;
        p.textContent = booth.dataset.title === 'To be announced'
          ? 'This booth will be revealed soon. Follow our pages for the next IP announcement.'
          : 'Visit the booth for activities and a visitor benefit, and collect your Discover stamp.';
        l.innerHTML = '<a href="exhibition.html#booths">Booth details</a>';
        return;
      }
      k.textContent = `${d.n} · Crystal Pavilion`;
      t.innerHTML = d.name;
      p.textContent = d.text;
      l.innerHTML = d.links.map(([h, txt]) => `<a href="${h}">${txt}</a>`).join('');
    }
    function selectBooth(code, zoom = true) {
      const b = svg.querySelector(`.imap-booth[data-booth="${code}"]`);
      if (!b) return;
      select('ip', { zoom: false });
      b.classList.add('is-active');
      showInfo(null, b);
      if (zoom) fitTo(b, 90, 5.5);
    }

    /* ---------- pointer: tap, drag, pinch ---------- */
    const pts = new Map();
    let drag = null, pinch = null, moved = false;
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.imap__controls')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = false;
      animId++;
      if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, vb: { ...vb } };
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), vb: { ...vb }, mid: toSvg((a.x + b.x) / 2, (a.y + b.y) / 2) };
        drag = null;
      }
    });
    stage.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        const f = Math.hypot(a.x - b.x, a.y - b.y) / pinch.d;
        const w = pinch.vb.w / f, h = pinch.vb.h / f;
        vb = clamp({ x: pinch.mid.x - (pinch.mid.x - pinch.vb.x) / f, y: pinch.mid.y - (pinch.mid.y - pinch.vb.y) / f, w, h });
        draw(); moved = true; e.preventDefault();
      } else if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
        if (moved && zoomLevel() > 1.05) {
          if (!stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId);
          const s = unitsPerPx();
          vb = clamp({ ...drag.vb, x: drag.vb.x - dx * s, y: drag.vb.y - dy * s });
          draw();
        }
      }
    });
    const end = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!pts.size) drag = null;
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);

    svg.addEventListener('click', (e) => {
      if (moved) { moved = false; return; }
      const booth = e.target.closest('.imap-booth');
      if (booth && root.classList.contains('is-fine')) { selectBooth(booth.dataset.booth, false); return; }
      const z = e.target.closest('[data-zone]');
      if (z) select(z.dataset.zone);
      else { select(null); apply(HOME, true); }
    });
    svg.addEventListener('keydown', (e) => {
      const z = e.target.closest('[data-zone]');
      if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(z.dataset.zone); }
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && (selected || zoomLevel() > 1.05)) { select(null); apply(HOME, true); }
    });

    // desktop: Ctrl/⌘ + wheel zooms (plain wheel keeps scrolling the page)
    stage.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y, false);
    }, { passive: false });

    /* ---------- controls + legend + lineup ---------- */
    root.querySelector('.imap__controls').addEventListener('click', (e) => {
      const b = e.target.closest('[data-zoom]');
      if (!b) return;
      const c = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };
      if (b.dataset.zoom === 'in') zoomAt(1.6, c.x, c.y, true);
      if (b.dataset.zoom === 'out') zoomAt(1 / 1.6, c.x, c.y, true);
      if (b.dataset.zoom === 'reset') { select(null); apply(HOME, true); }
    });
    root.querySelector('.imap__legend').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-zone]');
      if (!b) return;
      if (selected === b.dataset.zone) { select(null); apply(HOME, true); return; }
      select(b.dataset.zone);
      if (matchMedia('(max-width: 900px)').matches) stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    info.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#map-"]');
      if (!a) return;
      const d = document.querySelector(a.getAttribute('href'));
      if (d && d.tagName === 'DETAILS') d.open = true;
    });
    const section = root.closest('section') || document;
    section.querySelectorAll('.ip-pick').forEach((b) => b.addEventListener('click', () => {
      selectBooth(b.dataset.booth);
      section.querySelectorAll('.ip-pick[aria-pressed]').forEach((x) => x.removeAttribute('aria-pressed'));
      b.setAttribute('aria-pressed', 'true');
      stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));

    // the IP band's own booths should not be tab stops until zoomed in
    draw();
  });

  // links like schedule.html#map-gb open that hall's accordion
  const openFromHash = () => {
    const d = location.hash && document.querySelector(location.hash);
    if (d && d.tagName === 'DETAILS') d.open = true;
  };
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
