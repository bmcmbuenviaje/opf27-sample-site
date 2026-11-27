/* OPF 2027 — merch reminder pop-up (pre-order phase only).
   Shows on any OTHER page of the site after a visitor browsed the Merch page this visit
   and left without ordering:
     · items in the bag  → "Your bag is waiting" + a way to ask for something we don't have
     · empty bag         → "Didn't find what you're looking for? Shoot us a message…"
   Once per visit (once every 3 days with preference cookies). Never on top of another pop-up. */
(function () {
  'use strict';
  const root = document.documentElement;
  const page = location.pathname.split('/').pop() || 'index.html';
  if (/^merch|^lp-merch/.test(page)) return;

  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } } };
  const KEY = 'opf-merch-nudge';
  const CAP_DAYS = 3;
  const prefsOK = () => { const c = window.opfConsent && window.opfConsent.get(); return !!(c && c.preferences); };
  const recently = () => { try { const t = +localStorage.getItem(KEY); return t && Date.now() - t < CAP_DAYS * 864e5; } catch (e) { return false; } };
  const track = (e, p) => window.opfTrack && window.opfTrack(e, p || {});
  const bag = () => { try { return JSON.parse(localStorage.getItem('opf-merch-cart') || sessionStorage.getItem('opf-merch-cart')) || []; } catch (e) { return []; } };

  function eligible() {
    return root.dataset.phase === 'onsale' && ss.get('opf-merch-visit') && !ss.get('opf-merch-ordered') && !ss.get(KEY) && !recently()
      && window.opfConsent && window.opfConsent.get();
  }

  function build(items) {
    const n = items.reduce((a, l) => a + l.qty, 0);
    const hasBag = n > 0;
    const wrap = document.createElement('div');
    wrap.className = 'popup mnudge';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'mnudge-title');
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="popup__box mnudge__box">
        <button type="button" class="popup__x" data-nudge-close aria-label="Close">×</button>
        <div class="popup__art mnudge__art" aria-hidden="true"><img src="assets/img/chibi-fumi.webp" alt="" width="305" height="420"></div>
        <div class="popup__content">
          ${hasBag ? `
          <p class="popup__eyebrow">Your bag is waiting</p>
          <h2 class="popup__title display" id="mnudge-title">Still thinking it over?</h2>
          <p>You have <b>${n} item${n > 1 ? 's' : ''}</b> in your bag. Pre-orders close <b>May 15</b>, and pre-ordering means no shelf queue on event day.</p>
          <div class="mnudge__actions">
            <a class="btn btn--pink" href="merch.html?bag=1" data-nudge-bag>Back to my bag</a>
            <button type="button" class="mnudge__link" data-nudge-ask>Didn't find what you wanted?</button>
          </div>` : `
          <p class="popup__eyebrow">Merch pre-orders</p>
          <h2 class="popup__title display" id="mnudge-title">Didn't find what you're looking for?</h2>
          <p>Shoot us a message and we'll try to include it on event day.</p>`}
          <form class="mnudge__form" ${hasBag ? 'hidden' : ''} novalidate>
            <div class="field"><label for="mn-want">What would you like to see? *</label><textarea id="mn-want" required rows="3" placeholder="e.g. a Fumi plush, XXXL tees, a Frieren collab keychain…" data-private></textarea><p class="field__err">Tell us what you're looking for.</p></div>
            <div class="field"><label for="mn-email">Email <small>(optional — we'll tell you if it's coming)</small></label><input id="mn-email" type="email" autocomplete="email" placeholder="you@email.com" data-private><p class="field__err">That email doesn't look right.</p></div>
            <button type="submit" class="btn btn--pink btn--block">Send to the merch team</button>
          </form>
          <p class="popup__small"><button type="button" class="popup__skip" data-nudge-close>No thanks</button></p>
        </div>
        <div class="popup__done mnudge__done" hidden tabindex="-1">
          <p class="popup__eyebrow">Message received</p>
          <h2 class="popup__title display">Thanks — we're on it!</h2>
          <p>Our merch team reads every request. If enough fans ask, we'll try to bring it to the Merch Hub on June 5–6.<br><small>(Sample — nothing was sent.)</small></p>
          <button type="button" class="btn btn--blue" data-nudge-close>Close</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    return { wrap, variant: hasBag ? 'bag' : 'browse' };
  }

  let ui, lastFocus;
  function open() {
    if (!eligible() || document.querySelector('.popup.is-open, .cc-modal:not([hidden])')) return false;
    ui = build(bag());
    ss.set(KEY, '1');
    try { if (prefsOK()) localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ }
    lastFocus = document.activeElement;
    ui.wrap.hidden = false;
    requestAnimationFrame(() => ui.wrap.classList.add('is-open'));
    root.classList.add('has-modal');
    ui.wrap.querySelector('.btn, textarea').focus();
    track('merch_nudge_shown', { variant: ui.variant, page });
    wire();
    return true;
  }
  function close(how) {
    ui.wrap.classList.remove('is-open');
    root.classList.remove('has-modal');
    setTimeout(() => ui.wrap.remove(), 200);
    lastFocus?.focus?.();
    track('merch_nudge_closed', { variant: ui.variant, how });
  }
  function wire() {
    const w = ui.wrap;
    w.addEventListener('click', (e) => {
      if (e.target === w || e.target.closest('[data-nudge-close]')) close(e.target === w ? 'backdrop' : 'button');
      if (e.target.closest('[data-nudge-bag]')) track('merch_nudge_back_to_bag', { page });
      if (e.target.closest('[data-nudge-ask]')) { const f = w.querySelector('.mnudge__form'); f.hidden = false; e.target.closest('[data-nudge-ask]').hidden = true; f.querySelector('textarea').focus(); }
    });
    w.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close('escape');
      if (e.key !== 'Tab') return;
      const f = [...w.querySelectorAll('button, a[href], input, textarea')].filter((x) => x.offsetParent !== null);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    w.querySelector('.mnudge__form').addEventListener('submit', (e) => {
      e.preventDefault();
      const t = w.querySelector('#mn-want'), m = w.querySelector('#mn-email');
      const badT = !t.value.trim(), badM = m.value.trim() && !/^\S+@\S+\.\S+$/.test(m.value);
      t.closest('.field').classList.toggle('has-error', badT);
      m.closest('.field').classList.toggle('has-error', !!badM);
      if (badT) { t.focus(); return; }
      if (badM) { m.focus(); return; }
      // the request text itself goes to the merch team's inbox / sheet in the real build — not to analytics
      track('merch_request_sent', { variant: ui.variant, with_email: !!m.value.trim() });
      w.querySelector('.popup__content').hidden = true;
      const d = w.querySelector('.mnudge__done'); d.hidden = false; d.focus();
    });
  }

  // show it a few seconds after arriving on another page; retry once if something else is open
  function schedule(delay) {
    setTimeout(() => { if (!open() && eligible()) setTimeout(() => open(), 8000); }, delay);
  }
  if (eligible()) schedule(3500);
  else if (window.opfConsent) window.opfConsent.onChange(() => { if (eligible()) schedule(3500); });

  window.opfShowMerchNudge = () => { ss.set('opf-merch-visit', ss.get('opf-merch-visit') || String(Date.now())); try { sessionStorage.removeItem(KEY); sessionStorage.removeItem('opf-merch-ordered'); localStorage.removeItem(KEY); } catch (e) { /* ignore */ } if (root.dataset.phase !== 'onsale') { window.opfToast && window.opfToast('Switch Sample controls → Site phase to "On sale" to see this pop-up.'); return; } open(); };
})();
