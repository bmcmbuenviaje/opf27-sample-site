/* OPF 2027 — My orders (sample).
   Sign-in: "Continue with Google" or a one-time email link — no passwords.
   Real build: Google Identity Services (OAuth client owned by CyberE) and a signed, 15-minute
   email link; orders are looked up on the server by the verified email, guest orders included.
   Here: simulated, and orders come from this browser plus two sample orders. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const M = window.opfMerch;
  if (!M || !$('[data-signed-out]')) return;
  const track = (e, p) => window.opfTrack && window.opfTrack(e, p || {});
  const toast = (m) => window.opfToast && window.opfToast(m);
  const peso = M.peso;
  const USER_KEY = 'opf-user';
  const next = new URLSearchParams(location.search).get('next');

  const getUser = () => M.currentUser();
  function setUser(u) { try { if (u) sessionStorage.setItem(USER_KEY, JSON.stringify(u)); else sessionStorage.removeItem(USER_KEY); } catch (e) { /* ignore */ } }

  /* ---------- sign in ---------- */
  function signIn(user, via) {
    setUser({ ...user, via, ts: Date.now() });
    track('account_signed_in', { via });
    if (next === 'merch') { location.href = 'merch.html?bag=1'; return; }
    render();
    toast(`Signed in with ${via === 'google' ? 'Google' : 'your email link'}.`);
  }
  $('[data-google]').addEventListener('click', () => {
    // real build: google.accounts.id / OAuth popup → verified email from Google
    const btn = $('[data-google]');
    btn.disabled = true; $('span', btn).textContent = 'Connecting to Google…';
    setTimeout(() => { btn.disabled = false; $('span', btn).textContent = 'Continue with Google'; signIn({ email: 'fan.sample@gmail.com', name: 'Sample Fan' }, 'google'); }, 900);
  });
  const form = $('[data-email-form]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const i = $('#acct-email');
    const bad = !/^\S+@\S+\.\S+$/.test(i.value.trim());
    i.closest('.field').classList.toggle('has-error', bad);
    if (bad) { i.focus(); return; }
    track('account_link_requested');
    form.hidden = true;
    const sent = $('[data-link-sent]');
    $('[data-sent-to]').textContent = i.value.trim();
    sent.hidden = false; sent.focus();
  });
  $('[data-open-link]').addEventListener('click', () => signIn({ email: $('#acct-email').value.trim(), name: '' }, 'email'));
  $('[data-change-email]').addEventListener('click', () => { $('[data-link-sent]').hidden = true; form.hidden = false; $('#acct-email').focus(); });
  $('[data-sign-out]').addEventListener('click', () => { setUser(null); track('account_signed_out'); render(); toast('Signed out.'); });

  /* ---------- orders ---------- */
  // two sample orders so the page is never empty in the demo
  const SAMPLES = [
    { ref: 'OPF-P1012', paid: true, mode: 'preorder', bin: 'Pink', total: 3870, ts: Date.parse('2027-02-03T11:20:00+08:00'), sample: true,
      items: [{ name: 'O-Trio Hoodie', size: 'L', qty: 1, price: 2490 }, { name: 'Signed-print Shikishi', size: '', qty: 1, price: 1800 }].map((x) => x) },
    { ref: 'OPF-P1027', paid: false, mode: 'preorder', bin: 'Cyan', total: 850, ts: Date.parse('2027-03-18T20:05:00+08:00'), sample: true,
      items: [{ name: 'Luminous Blue Tote', size: '', qty: 1, price: 850 }] },
  ];
  SAMPLES[0].total = SAMPLES[0].items.reduce((n, i) => n + i.price * i.qty, 0);
  const phase = () => document.documentElement.dataset.phase;

  function statusOf(o) {
    if (o.status === 'delivery') return ['Delivery requested', 'var(--cyan)', 'var(--ink)'];
    if (phase() === 'post') return o.paid ? ['Not collected — delivery available', 'var(--yellow)', 'var(--blue)'] : ['Released (not collected)', 'var(--line)', 'var(--ink)'];
    if (o.mode === 'event') return o.paid ? ['Paid · Express counter', 'var(--opf-feedback-success)', '#fff'] : ['Pay at counter', 'var(--pink-dark)', '#fff'];
    return o.paid ? ['Paid · Ready for pickup Jun 5–6', 'var(--opf-feedback-success)', '#fff'] : ['Reserved · Pay at pickup', 'var(--pink-dark)', '#fff'];
  }
  function holdText(o) {
    if (o.mode === 'event') return 'Collect at your counter today.';
    if (o.paid) return 'Held until <b>June 6 closing</b>. Not collected? We email you on <b>June 7</b> to arrange delivery (shipping fee applies).';
    return 'Held until <b>June 5, 15:00</b>, then released for sale. Pay now to keep it until the end of the event.';
  }

  function render() {
    const user = getUser();
    $('[data-signed-out]').hidden = !!user;
    $('[data-signed-in]').hidden = !user;
    if (!user) return;
    $('[data-who]').textContent = `${user.name ? user.name + ' · ' : ''}${user.email} · signed in with ${user.via === 'google' ? 'Google' : 'email link'}`;
    $('[data-avatar]').textContent = (user.name || user.email || 'O').trim()[0].toUpperCase();

    // saved bag
    let bag = [];
    try { bag = JSON.parse(localStorage.getItem(M.CART_KEY) || sessionStorage.getItem(M.CART_KEY)) || []; } catch (e) { bag = []; }
    const bagBox = $('[data-saved-bag]');
    const n = bag.reduce((a, l) => a + l.qty, 0);
    bagBox.hidden = !n || !['onsale', 'event'].includes(phase());
    bagBox.innerHTML = n ? `<div><b>Your saved bag · ${n} item${n > 1 ? 's' : ''}</b><span>${bag.map((l) => (M.PRODUCTS.find((p) => p.sku === l.sku) || {}).name).filter(Boolean).join(', ')}</span></div><a class="btn btn--pink btn--small" href="merch.html?bag=1">Continue to checkout</a>` : '';

    const mine = M.readOrders();
    const list = [...mine, ...SAMPLES];
    $('[data-orders]').innerHTML = list.map((o, i) => {
      const [label, bg, fg] = statusOf(o);
      const isMine = i < mine.length;
      const canPay = !o.paid && o.mode !== 'event' && phase() !== 'post';
      const canDeliver = o.paid && o.mode !== 'event' && o.status !== 'delivery';
      return `
        <article class="acct-order" data-i="${i}">
          <div class="acct-order__top">
            <div><p class="acct-order__ref">${o.ref}</p><p class="acct-order__date">${new Date(o.ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}${o.sample ? ' · sample order' : ' · placed in this browser'}</p></div>
            <span class="pill" style="--k:${bg};--kc:${fg}">${label}</span>
          </div>
          <ul class="acct-order__items">${o.items.map((it) => `<li><span>${it.qty} × ${it.name}${it.size ? ' · ' + it.size : ''}</span><b>${peso(it.price * it.qty)}</b></li>`).join('')}</ul>
          <p class="acct-order__total">${o.paid ? 'Paid' : 'To pay'} <b>${peso(o.total)}</b></p>
          <p class="acct-order__hold">${holdText(o)}</p>
          <div class="acct-order__actions">
            ${phase() !== 'post' ? `<button type="button" class="btn btn--blue btn--small" data-pass="${i}">Show pickup pass</button>` : ''}
            ${canPay ? `<button type="button" class="btn btn--pink btn--small" data-pay="${i}">Pay now with Slash</button>` : ''}
            ${canDeliver ? `<a class="btn btn--small sample-panel__line" href="merch-delivery.html" data-track="orders_arrange_delivery">${phase() === 'post' ? 'Arrange delivery' : 'Delivery options'}</a>` : ''}
          </div>
        </article>`;
    }).join('') || '<p class="empty-note">No orders yet. <a href="merch.html">Visit the shop</a>.</p>';

    $('[data-orders]').onclick = (e) => {
      const p = e.target.closest('[data-pass]');
      if (p) showPass(list[+p.dataset.pass]);
      const pay = e.target.closest('[data-pay]');
      if (pay) {
        const o = list[+pay.dataset.pay];
        pay.disabled = true; pay.textContent = 'Opening Slash… (simulated)';
        track('orders_pay_reservation', { ref: o.ref });
        setTimeout(() => {
          o.paid = true;
          if (!o.sample) M.writeOrders(mine);
          render();
          toast(`${o.ref} is paid — held until June 6 closing.`);
        }, 1200);
      }
    };
  }

  /* pickup pass */
  const pass = $('.mpass');
  function showPass(o) {
    $('.mpass__body', pass).innerHTML = `
      <p class="mpass__kicker">${o.paid ? 'Paid pre-order · Pickup pass' : 'Reservation · Pay at pickup'}</p>
      <p class="mpass__ref">${o.ref}</p>
      <p class="mpass__bin"><i style="background:var(--${({ Pink: 'pink', Yellow: 'yellow', Cyan: 'cyan', Blue: 'blue' })[o.bin] || 'blue'})"></i>${o.bin || 'Blue'} bin · Counter 4 · Pre-order express lane</p>
      <div class="mpass__qr">${window.opfQr ? window.opfQr(o.ref) : o.ref}</div>
      <ul class="mpass__items">${o.items.map((it) => `<li>${it.qty} × ${it.name}${it.size ? ' · ' + it.size : ''}</li>`).join('')}</ul>
      <p class="mpass__rule">${holdText(o)}</p>`;
    pass.hidden = false;
    requestAnimationFrame(() => pass.classList.add('is-open'));
    $('.mpass__close', pass).focus();
  }
  pass.addEventListener('click', (e) => { if (e.target === pass || e.target.closest('.mpass__close')) { pass.classList.remove('is-open'); setTimeout(() => { pass.hidden = true; }, 200); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pass.hidden) pass.querySelector('.mpass__close').click(); });

  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['data-phase'] });
  render();
})();
