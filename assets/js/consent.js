/* OPF 2027 — cookie consent + consent-gated behaviour analytics.
   Nothing that tracks visitors loads until they choose "Accept all" (or tick Analytics).
   Philippine Data Privacy Act (RA 10173) approach: opt-in, easy to change, easy to withdraw.

   ANALYTICS SETUP — paste the PostHog project key below (Project settings → Project API key).
   Leave it empty and the site behaves exactly the same but records nothing. */
window.OPF_ANALYTICS = window.OPF_ANALYTICS || {
  provider: 'posthog',
  key: '',                                   // e.g. 'phc_xxxxxxxxxxxxxxxxxxxxxxxx'
  host: 'https://us.i.posthog.com',          // or https://eu.i.posthog.com, or your self-hosted URL
};

(function () {
  'use strict';
  const KEY = 'opf-consent';
  const VERSION = 1;
  const MAX_AGE_DAYS = 180;                  // ask again after 6 months
  const listeners = [];

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  function current() {
    const c = store.get();
    if (!c || c.v !== VERSION) return null;
    if (Date.now() - c.ts > MAX_AGE_DAYS * 864e5) return null;
    return c;
  }

  function save(choice, how) {
    const c = { v: VERSION, ts: Date.now(), how, necessary: true, preferences: !!choice.preferences, analytics: !!choice.analytics };
    store.set(c);
    apply(c);
    listeners.forEach((fn) => fn(c));
    return c;
  }

  /* ---------- analytics (PostHog: session replay, heatmaps, funnels, A/B tests, surveys) ---------- */
  let loaded = false;
  function startAnalytics() {
    const cfg = window.OPF_ANALYTICS;
    if (!cfg || !cfg.key) { console.info('[OPF] Analytics consent given — no project key set, so nothing is recorded.'); return; }
    if (loaded) { window.posthog && window.posthog.opt_in_capturing && window.posthog.opt_in_capturing(); return; }
    loaded = true;
    // queue-stub so calls made before the library arrives are kept (same pattern as PostHog's snippet)
    const ph = (window.posthog = window.posthog || []);
    ph._i = ph._i || [];
    ph.init = function (k, o, n) { ph._i.push([k, o, n]); };
    ['capture', 'identify', 'register', 'opt_in_capturing', 'opt_out_capturing', 'reset', 'startSessionRecording', 'stopSessionRecording', 'getFeatureFlag', 'isFeatureEnabled', 'onFeatureFlags']
      .forEach((m) => { ph[m] = function () { ph.push([m].concat([].slice.call(arguments))); }; });
    const s = document.createElement('script');
    s.async = true;
    s.src = cfg.host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
    document.head.appendChild(s);
    ph.init(cfg.key, {
      api_host: cfg.host,
      person_profiles: 'identified_only',   // anonymous visitors are not turned into profiles
      capture_pageview: true,
      autocapture: true,                     // clicks, form submits, rage clicks → heatmaps
      session_recording: { maskAllInputs: true, maskTextSelector: '[data-private]' },
      respect_dnt: true,
    });
  }
  function stopAnalytics() {
    if (window.posthog && window.posthog.opt_out_capturing) window.posthog.opt_out_capturing();
    // remove analytics cookies/storage left from an earlier "Accept all"
    document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^ph_|posthog/i.test(n))
      .forEach((n) => { document.cookie = `${n}=; Max-Age=0; path=/`; });
    try { Object.keys(localStorage).filter((k) => /^ph_|posthog/i.test(k)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
  }
  function apply(c) {
    if (c && c.analytics) startAnalytics(); else stopAnalytics();
    document.documentElement.dataset.consent = c ? (c.analytics ? 'all' : c.preferences ? 'necessary' : 'denied') : 'unset';
  }

  /* track(): custom events for landing pages, only sent with consent */
  window.opfTrack = function (event, props) {
    const c = current();
    if (c && c.analytics && window.posthog && window.posthog.capture) window.posthog.capture(event, props || {});
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) window.opfTrack(el.dataset.track, { page: location.pathname.split('/').pop() || 'index.html', label: el.textContent.trim().slice(0, 60) });
  });

  /* ---------- UI ---------- */
  const BANNER = `
    <div class="cc" role="region" aria-label="Cookie consent">
      <div class="cc__inner">
        <div class="cc__text">
          <p class="cc__title">🍪 Cookies on Otaku Pop Fes</p>
          <p>We use necessary cookies to run the site. With your OK we also use analytics that record how visitors use the pages (clicks, scrolling, anonymised session replays) so we can make the site better. <button type="button" class="cc__link" data-cc="customize">Customize</button> · <a class="cc__link" href="legal.html#privacy">Privacy Policy</a></p>
        </div>
        <div class="cc__actions">
          <button type="button" class="btn btn--pink" data-cc="all">Accept all cookies</button>
          <button type="button" class="btn cc__btn-line" data-cc="necessary">Accept necessary cookies</button>
          <button type="button" class="btn cc__btn-ghost" data-cc="deny">Deny all</button>
        </div>
      </div>
    </div>`;
  const PANEL = `
    <div class="cc-modal" role="dialog" aria-modal="true" aria-labelledby="cc-m-title" hidden>
      <div class="cc-modal__box">
        <button type="button" class="cc-modal__x" data-cc="close" aria-label="Close">×</button>
        <h2 id="cc-m-title">Cookie settings</h2>
        <p class="cc-modal__lead">Choose what Otaku Pop Fes may use. You can change this any time from "Cookie settings" at the bottom of every page.</p>
        <div class="cc-cat"><div><h3>Strictly necessary</h3><p>Keeps the site working and remembers this choice. Always on.</p></div><span class="cc-always">Always on</span></div>
        <label class="cc-cat"><div><h3>Preferences</h3><p>Remembers things like a closed announcement or pop-up so we don't show them again.</p></div><input type="checkbox" class="cc-switch" data-cat="preferences"></label>
        <label class="cc-cat"><div><h3>Analytics &amp; behaviour</h3><p>Page views, clicks, scroll depth, heatmaps and anonymised session replays (form fields are hidden). Used only to improve the site. Provider: PostHog.</p></div><input type="checkbox" class="cc-switch" data-cat="analytics"></label>
        <div class="cc-modal__actions">
          <button type="button" class="btn btn--blue" data-cc="save">Save my choices</button>
          <button type="button" class="btn btn--pink" data-cc="all">Accept all</button>
        </div>
      </div>
    </div>`;

  let banner, modal, lastFocus;
  function mount() {
    document.body.insertAdjacentHTML('beforeend', BANNER + PANEL);
    banner = document.querySelector('.cc');
    modal = document.querySelector('.cc-modal');
    banner.hidden = !!current();
    document.addEventListener('click', onClick);
    modal.addEventListener('keydown', trap);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    // "Cookie settings" link in every footer
    const bar = document.querySelector('.footer-bar');
    if (bar) {
      const p = document.createElement('p');
      p.innerHTML = '<button type="button" class="cc__link cc__link--footer" data-cc="customize">Cookie settings</button>';
      const note = bar.querySelector('.demo-note');
      bar.insertBefore(p, note);
    }
  }
  function onClick(e) {
    const b = e.target.closest('[data-cc]');
    if (!b) return;
    const a = b.dataset.cc;
    if (a === 'all') finish(save({ preferences: true, analytics: true }, 'accept_all'));
    if (a === 'necessary') finish(save({ preferences: true, analytics: false }, 'accept_necessary'));
    if (a === 'deny') finish(save({ preferences: false, analytics: false }, 'deny_all'));
    if (a === 'customize') openModal();
    if (a === 'close') closeModal();
    if (a === 'save') {
      const pick = {};
      modal.querySelectorAll('.cc-switch').forEach((s) => { pick[s.dataset.cat] = s.checked; });
      finish(save(pick, 'custom'));
    }
  }
  function finish(c) {
    banner.hidden = true;
    closeModal();
    const msg = c.analytics ? 'Thanks! Analytics is on — it helps us improve the site.' : c.preferences ? 'Saved: necessary and preference cookies only.' : 'Saved: only strictly necessary cookies.';
    window.opfToast ? window.opfToast(msg) : null;
  }
  function openModal() {
    const c = current() || { preferences: false, analytics: false };
    modal.querySelectorAll('.cc-switch').forEach((s) => { s.checked = !!c[s.dataset.cat]; });
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('has-modal');
    modal.querySelector('.cc-switch').focus();
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.documentElement.classList.remove('has-modal');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function trap(e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    const f = [...modal.querySelectorAll('button, input, a[href]')].filter((x) => !x.disabled && x.offsetParent !== null);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  window.opfConsent = {
    get: current,
    onChange(fn) { listeners.push(fn); },
    open: openModal,
    reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } stopAnalytics(); apply(null); if (banner) banner.hidden = false; listeners.forEach((fn) => fn(null)); },
  };

  apply(current());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
