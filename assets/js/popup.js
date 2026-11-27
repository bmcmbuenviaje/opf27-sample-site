/* OPF 2027 — homepage pop-up (sample).
   Shows once, after the cookie choice, on whichever comes first:
   7 seconds on the page · scrolling past half the page · desktop exit intent (mouse leaves the top).
   Frequency cap: once every 3 days (once per visit if the visitor declined preference cookies). */
(function () {
  'use strict';
  const pop = document.querySelector('[data-popup]');
  if (!pop) return;
  const ID = 'opf-popup-' + pop.dataset.popup;
  const CAP_DAYS = 3;
  const DELAY = 7000;
  let shown = false, armed = false, lastFocus = null, timer;

  const prefsOK = () => { const c = window.opfConsent && window.opfConsent.get(); return !!(c && c.preferences); };
  function seenRecently() {
    try {
      if (sessionStorage.getItem(ID)) return true;
      const t = +localStorage.getItem(ID);
      return t && Date.now() - t < CAP_DAYS * 864e5;
    } catch (e) { return false; }
  }
  function remember() {
    try { sessionStorage.setItem(ID, '1'); if (prefsOK()) localStorage.setItem(ID, String(Date.now())); } catch (e) { /* ignore */ }
  }

  function open(source) {
    if (shown) return;
    shown = true;
    clearTimeout(timer);
    lastFocus = document.activeElement;
    pop.hidden = false;
    requestAnimationFrame(() => pop.classList.add('is-open'));
    document.documentElement.classList.add('has-modal');
    (pop.querySelector('[data-autofocus]') || pop.querySelector('button')).focus();
    remember();
    window.opfTrack && window.opfTrack('popup_shown', { popup: pop.dataset.popup, trigger: source, phase: document.documentElement.dataset.phase });
  }
  function close(how) {
    pop.classList.remove('is-open');
    document.documentElement.classList.remove('has-modal');
    setTimeout(() => { pop.hidden = true; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    window.opfTrack && window.opfTrack('popup_closed', { popup: pop.dataset.popup, how });
  }

  pop.addEventListener('click', (e) => {
    if (e.target === pop || e.target.closest('[data-popup-close]')) close(e.target === pop ? 'backdrop' : 'button');
    const cta = e.target.closest('[data-popup-cta]');
    if (cta) { window.opfTrack && window.opfTrack('popup_cta', { popup: pop.dataset.popup, cta: cta.textContent.trim() }); close('cta'); }
  });
  pop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close('escape');
    if (e.key !== 'Tab') return;
    const f = [...pop.querySelectorAll('button, a[href], input')].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  pop.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const i = pop.querySelector('input[type=email]');
    if (!/^\S+@\S+\.\S+$/.test(i.value)) { i.focus(); i.closest('.popup__form').classList.add('has-error'); return; }
    window.opfTrack && window.opfTrack('popup_signup', { popup: pop.dataset.popup });
    pop.querySelector('.popup__content').hidden = true;
    pop.querySelector('.popup__done').hidden = false;
    pop.querySelector('.popup__done button').focus();
  });

  function arm() {
    if (armed || shown || seenRecently()) return;
    armed = true;
    timer = setTimeout(() => open('timer'), DELAY);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (max > 0 && scrollY / max > 0.5) { removeEventListener('scroll', onScroll); open('scroll'); }
    };
    addEventListener('scroll', onScroll, { passive: true });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.addEventListener('mouseout', (e) => { if (!e.relatedTarget && e.clientY <= 0) open('exit_intent'); });
    }
  }
  // wait for the cookie choice so the two never stack on top of each other
  const ready = () => window.opfConsent && window.opfConsent.get();
  if (ready()) arm();
  window.opfConsent && window.opfConsent.onChange((c) => { if (c) arm(); });

  // sample controls: show it on demand
  window.opfShowPopup = () => { shown = false; pop.querySelector('.popup__content').hidden = false; pop.querySelector('.popup__done').hidden = true; open('manual'); };
})();
