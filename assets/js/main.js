/* Otaku Pop Fes 2027 demo — shared page behaviour (menu, anchor bar, demo toasts). */
(function () {
  'use strict';

  /* ---------- toast ---------- */
  const toast = document.querySelector('.toast');
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }
  window.opfToast = showToast;

  // Links to pages that are outside the scope of this demo
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-soon]');
    if (!link) return;
    event.preventDefault();
    showToast(`${link.dataset.soon} — not part of the sample site yet.`);
  });

  /* ---------- mobile menu ---------- */
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');

  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 1081px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* ---------- timetables: label cells so they can restack as cards on phones ---------- */
  document.querySelectorAll('.timetable').forEach((table) => {
    // venue name only, without the "Discover / Connect / Celebrate" kicker
    const heads = [...table.tHead.rows[0].cells].map((th) => [...th.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(' ').trim());
    const venues = [...table.tHead.rows[0].cells].map((th) => th.className);
    const carry = []; // column index -> { cell, rowsLeft } for rowspan cells
    [...table.tBodies[0].rows].forEach((row) => {
      let col = 0;
      const cells = [...row.cells];
      const placed = [];
      for (let c = 0; c < heads.length; c++) {
        if (carry[c] && carry[c].rowsLeft > 0) {
          // repeat the spanning cell on this row for the stacked (mobile) layout only
          const dup = carry[c].cell.cloneNode(true);
          dup.removeAttribute('rowspan');
          dup.classList.add('tt-dup');
          dup.setAttribute('aria-hidden', 'true');
          placed.push([c, dup]);
          carry[c].rowsLeft -= 1;
        } else {
          const cell = cells[col++];
          if (!cell) continue;
          if (cell.rowSpan > 1) carry[c] = { cell, rowsLeft: cell.rowSpan - 1 };
          placed.push([c, cell]);
        }
      }
      placed.forEach(([c, cell]) => {
        cell.dataset.label = heads[c];
        cell.dataset.venue = venues[c];
        if (cell.classList.contains('tt-dup')) {
          const next = placed.find(([c2, el]) => c2 > c && !el.classList.contains('tt-dup'));
          row.insertBefore(cell, next ? next[1] : null);
        }
      });
    });
  });

  /* ---------- anchor bar: highlight the section in view ---------- */
  const subnav = document.querySelector('.subnav__inner');

  if (subnav) {
    const pairs = [...subnav.querySelectorAll('a[href^="#"]')]
      .map((link) => [link, document.querySelector(link.hash)])
      .filter(([, target]) => target);
    let current = null;
    let ticking = false;

    const update = () => {
      ticking = false;
      const headerH = document.querySelector('.site-header').offsetHeight;
      const offset = headerH + subnav.offsetHeight + 40;
      let active = pairs[0];
      for (const pair of pairs) {
        if (pair[1].getBoundingClientRect().top - offset <= 0) active = pair;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) active = pairs[pairs.length - 1];
      if (active === current) return;
      current = active;

      pairs.forEach(([link]) => {
        const isActive = link === active[0];
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });

      // keep the active link visible when the bar scrolls sideways (mobile)
      if (subnav.scrollWidth > subnav.clientWidth) {
        const link = active[0];
        subnav.scrollTo({ left: link.offsetLeft - (subnav.clientWidth - link.offsetWidth) / 2, behavior: 'smooth' });
      }
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
