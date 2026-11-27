/* OPF 2027 — Merch: pre-order shop (On sale) → Scan to Order web app (Event days).
   One catalogue, one stock count for both. Payments: Slash (slashevent.com) — simulated here.
   Hold rules:
     · Paid pre-orders: held until the last event day closes. Unclaimed → June 7 email offering
       delivery (address form + shipping fee).
     · Unpaid reservations: held until the cut-off (Day 1, 15:00), then released for sale. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const app = $('[data-merch]');

  const RULES = {
    preorderClose: '2027-05-15T23:59:00+08:00',
    reserveCutoff: 'June 5, 15:00',
    paidHoldUntil: 'June 6 closing (22:00)',
    deliveryEmail: 'June 7',
    preorderCounter: 'Counter 4 · Pre-order express lane',
  };
  const SHELVES = { A: 'Apparel', B: 'Accessories', C: 'Collectibles' };

  // sample catalogue — the real build reads this from the shared merch inventory
  const PRODUCTS = [
    { sku: 'A-TEE', shelf: 'A', name: 'OPF 2027 Event Tee', price: 990, sizes: ['S', 'M', 'L', 'XL', 'XXL'], stock: 240, art: 'tee', k: 'var(--blue)' },
    { sku: 'A-HOOD', shelf: 'A', name: 'O-Trio Hoodie', price: 2490, sizes: ['S', 'M', 'L', 'XL'], stock: 36, art: 'hoodie', k: 'var(--pink-dark)', tag: 'Low stock' },
    { sku: 'A-HAORI', shelf: 'A', name: 'Festival Haori', price: 1890, sizes: ['Free size'], stock: 80, art: 'haori', k: 'var(--night)' },
    { sku: 'B-TOTE', shelf: 'B', name: 'Luminous Blue Tote', price: 850, stock: 150, img: 'assets/img/news-luminous-blue.jpg' },
    { sku: 'B-LANY', shelf: 'B', name: 'Lanyard + Pass Holder', price: 450, stock: 300, art: 'lanyard', k: 'var(--cyan)' },
    { sku: 'B-KEY', shelf: 'B', name: 'Wristband Keychain', price: 300, stock: 200, img: 'assets/img/wristband.webp', contain: true, k: 'var(--yellow)' },
    { sku: 'C-ACRY', shelf: 'C', name: 'O-Trio Acrylic Stand Set', price: 1200, stock: 60, img: 'assets/img/chibi-popi.webp', contain: true, k: 'var(--pink)' },
    { sku: 'C-PLUSH', shelf: 'C', name: 'Popi Plush', price: 1490, stock: 12, img: 'assets/img/chibi-otori.webp', contain: true, k: 'var(--yellow)', tag: 'Only 12 left' },
    { sku: 'C-STICK', shelf: 'C', name: 'Sticker Sheet', price: 250, stock: 400, img: 'assets/img/chibi-fumi.webp', contain: true, k: 'var(--cyan)' },
    { sku: 'C-SHIKI', shelf: 'C', name: 'Signed-print Shikishi', price: 1800, stock: 0, img: 'assets/img/mascot-fumi.webp', contain: true, k: 'var(--night)', tag: 'Pre-order exclusive', preOnly: true },
  ];
  const bySku = Object.fromEntries(PRODUCTS.map((p) => [p.sku, p]));
  const peso = (n) => '₱' + n.toLocaleString('en-PH');
  const track = (e, p) => window.opfTrack && window.opfTrack(e, p || {});
  const toast = (m) => window.opfToast && window.opfToast(m);

  // shared with the shelf-tag page
  window.opfMerch = { PRODUCTS, SHELVES };
  window.opfQr = qrSvg;
  if (!app) return;

  /* simple product art so the sample needs no photos */
  function art(p) {
    if (p.img) return `<div class="mp-art${p.contain ? ' mp-art--contain' : ''}" style="--k:${p.k || 'var(--mist)'}"><img src="${p.img}" alt="" loading="lazy"></div>`;
    const shapes = {
      tee: '<path d="M60 20 40 30 20 50l14 16 14-8v72h64V58l14 8 14-16-20-20-20-10c-4 10-14 16-30 16S64 30 60 20Z"/>',
      hoodie: '<path d="M62 14c6 18 30 18 36 0l24 12 22 28-14 16-12-8v76H42V62l-12 8-14-16 22-28Z"/><path d="M66 16c2 22 26 22 28 0" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="4"/>',
      haori: '<path d="M50 18h60l40 36-14 22-20-12v76H44V64L24 76 10 54Z"/><path d="M70 18l10 120 10-120" fill="none" stroke="var(--yellow)" stroke-width="6"/>',
      lanyard: '<path d="M54 10c0 50 8 70 26 86M106 10c0 50-8 70-26 86" fill="none" stroke="currentColor" stroke-width="10"/><rect x="52" y="92" width="56" height="58" rx="8"/>',
    };
    return `<div class="mp-art" style="--k:${p.k}"><svg viewBox="0 0 160 160" aria-hidden="true" fill="currentColor">${shapes[p.art]}</svg><img class="mp-art__logo" src="assets/img/logo.png" alt=""></div>`;
  }

  /* ---------- cart (kept for this visit only) ---------- */
  const CART_KEY = 'opf-merch-cart';
  let cart = [];
  try { cart = JSON.parse(sessionStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }
  const saveCart = () => { try { sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ } renderCart(); };
  const cartCount = () => cart.reduce((n, l) => n + l.qty, 0);
  const cartTotal = () => cart.reduce((n, l) => n + bySku[l.sku].price * l.qty, 0);
  function addToCart(sku, size, qty = 1) {
    const p = bySku[sku];
    const line = cart.find((l) => l.sku === sku && l.size === size);
    if (line) line.qty = Math.min(line.qty + qty, 5); else cart.push({ sku, size, qty });
    saveCart();
    toast(`Added ${p.name}${size ? ' · ' + size : ''}`);
    track('merch_add_to_cart', { sku, size, mode: mode(), price: p.price });
    bump();
  }
  function bump() { const b = $('.mcart-fab'); if (b) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); } }

  const mode = () => (root.dataset.phase === 'event' ? 'event' : root.dataset.phase === 'onsale' ? 'preorder' : root.dataset.phase);

  /* ---------- catalogue ---------- */
  function renderCatalog() {
    const grid = $('#merch-grid', app);
    const m = mode();
    const shop = m === 'preorder' || m === 'event';
    grid.innerHTML = PRODUCTS.filter((p) => !(m === 'event' && p.preOnly)).map((p) => {
      const sold = shop && p.stock <= 0 && !(m === 'preorder' && p.preOnly);
      const sizes = p.sizes ? `<label class="sr-only" for="sz-${p.sku}">Size</label><select id="sz-${p.sku}" class="mp-size">${p.sizes.map((s) => `<option>${s}</option>`).join('')}</select>` : '';
      return `
        <article class="mp" data-cat="${p.shelf}" id="item-${p.sku}">
          ${art(p)}
          <div class="mp__body">
            <div class="mp__meta"><span class="mp__shelf">Shelf ${p.shelf}</span>${p.tag ? `<span class="pill" style="--k:var(--pink-dark)">${p.tag}</span>` : ''}</div>
            <h3>${p.name}</h3>
            <p class="mp__price">${peso(p.price)}</p>
            ${shop ? `<div class="mp__buy">${sizes}<button type="button" class="btn btn--pink btn--small" data-add="${p.sku}" ${sold ? 'disabled' : ''}>${sold ? 'Sold out' : m === 'event' ? 'Add to order' : 'Pre-order'}</button></div>` : '<p class="mp__soon">Pre-orders open Feb 1</p>'}
          </div>
        </article>`;
    }).join('');
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const card = b.closest('.mp, .msheet');
    const size = card.querySelector('.mp-size')?.value || '';
    addToCart(b.dataset.add, size);
    if (b.closest('.msheet')) closeSheet();
  });

  /* ---------- cart drawer + checkout ---------- */
  const drawer = $('.mcart');
  function renderCart() {
    $$('[data-cart-count]').forEach((el) => { el.textContent = cartCount(); el.hidden = !cartCount(); });
    const list = $('.mcart__lines', drawer);
    if (!cart.length) { list.innerHTML = '<p class="mcart__empty">Your bag is empty.</p>'; }
    else list.innerHTML = cart.map((l, i) => {
      const p = bySku[l.sku];
      return `<div class="mline"><div><b>${p.name}</b><span>${l.size ? l.size + ' · ' : ''}Shelf ${p.shelf}</span></div>
        <div class="mline__qty"><button type="button" data-q="${i}" data-d="-1" aria-label="One less">−</button><span>${l.qty}</span><button type="button" data-q="${i}" data-d="1" aria-label="One more">+</button></div>
        <b class="mline__sum">${peso(p.price * l.qty)}</b></div>`;
    }).join('');
    $('.mcart__total b', drawer).textContent = peso(cartTotal());
    $$('.mcart__go', drawer).forEach((b) => { b.disabled = !cart.length; });
  }
  drawer.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]');
    if (q) { const l = cart[+q.dataset.q]; l.qty += +q.dataset.d; if (l.qty <= 0) cart.splice(+q.dataset.q, 1); saveCart(); }
    if (e.target.closest('[data-close-cart]') || e.target === drawer) closeCart();
    const go = e.target.closest('.mcart__go');
    if (go) startCheckout(go.dataset.pay);
  });
  let lastFocus;
  function openCart() { lastFocus = document.activeElement; drawer.hidden = false; requestAnimationFrame(() => drawer.classList.add('is-open')); root.classList.add('has-modal'); $('.mcart__panel', drawer).focus(); }
  function closeCart() { drawer.classList.remove('is-open'); root.classList.remove('has-modal'); setTimeout(() => { drawer.hidden = true; }, 220); lastFocus?.focus?.(); }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-cart]')) openCart(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!drawer.hidden) closeCart(); if (!sheet.hidden) closeSheet(); } });

  /* checkout: details → Slash (paid) or straight to pass (reserve / pay at counter) */
  const checkout = $('.mcheck');
  let payChoice = 'slash';
  function startCheckout(pay) {
    payChoice = pay;
    track('merch_checkout_started', { mode: mode(), pay, items: cartCount(), total: cartTotal() });
    const m = mode();
    $('.mcart__view--bag', drawer).hidden = true;
    checkout.hidden = false;
    $('.mcheck__summary', checkout).textContent = `${cartCount()} item${cartCount() > 1 ? 's' : ''} · ${peso(cartTotal())}`;
    $('.mcheck__rule', checkout).innerHTML = pay === 'slash'
      ? (m === 'event' ? 'Paid orders go to the <b>express counter</b> — just show your reference number.' : `Paid pre-orders are held for you until <b>${RULES.paidHoldUntil}</b>. Can't make it? On ${RULES.deliveryEmail} we'll email you to arrange <b>delivery</b> (shipping fee applies).`)
      : (m === 'event' ? 'Pay at the counter when your number is called.' : `Reservations are held until <b>${RULES.reserveCutoff}</b>. Unclaimed items are released for sale after that. Pay at the counter.`);
    $('.mcheck__submit', checkout).textContent = pay === 'slash' ? 'Continue to Slash payment' : (m === 'event' ? 'Get my reference number' : 'Reserve my items');
    $('.mcheck__fields', checkout).hidden = m === 'event' && pay !== 'slash';
    $('#mc-name').focus();
  }
  checkout.addEventListener('submit', (e) => {
    e.preventDefault();
    const needDetails = !$('.mcheck__fields', checkout).hidden;
    let ok = true;
    if (needDetails) $$('[required]', checkout).forEach((i) => {
      const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value));
      i.closest('.field').classList.toggle('has-error', bad);
      if (bad && ok) { i.focus(); ok = false; }
    });
    if (!ok) return;
    if (payChoice === 'slash') openSlash(); else finishOrder(false);
  });
  $('[data-back-to-bag]', checkout).addEventListener('click', () => { checkout.hidden = true; $('.mcart__view--bag', drawer).hidden = false; });

  /* ---------- Slash hand-off (SIMULATED) ----------
     Real build: our server asks Slash for a checkout for this order, then we open Slash's
     hosted payment page (redirect, embedded window or payment link — whichever Slash provides).
     Slash confirms the payment to our server; only then is the order marked PAID. */
  const slash = $('.mslash');
  function openSlash() {
    $('.mslash__amount', slash).textContent = peso(cartTotal());
    slash.hidden = false;
    requestAnimationFrame(() => slash.classList.add('is-open'));
    $('.mslash__pay', slash).focus();
    track('merch_payment_opened', { provider: 'slash', mode: mode(), total: cartTotal() });
  }
  slash.addEventListener('click', (e) => {
    if (e.target.closest('[data-slash-cancel]')) { slash.classList.remove('is-open'); setTimeout(() => { slash.hidden = true; }, 200); }
    const m = e.target.closest('.mslash__method');
    if (m) { $$('.mslash__method', slash).forEach((x) => x.setAttribute('aria-pressed', String(x === m))); }
    if (e.target.closest('.mslash__pay')) {
      const btn = $('.mslash__pay', slash);
      btn.disabled = true; btn.textContent = 'Processing…';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Pay now'; slash.classList.remove('is-open'); slash.hidden = true; finishOrder(true); }, 1300);
    }
  });

  /* ---------- order result: pickup pass (pre-order) or reference screen (event) ---------- */
  const pass = $('.mpass');
  const BINS = [['Pink', 'var(--pink)'], ['Yellow', 'var(--yellow)'], ['Cyan', 'var(--cyan)'], ['Blue', 'var(--blue)']];
  let seq = 1040 + Math.floor(Math.random() * 50);
  function finishOrder(paid) {
    const m = mode();
    const ref = m === 'event' ? `M-${String(seq++ % 1000).padStart(3, '0')}` : `OPF-P${seq++}`;
    const bin = BINS[seq % BINS.length];
    const counter = paid || m !== 'event' ? 4 : 1 + (seq % 3);
    const lines = cart.map((l) => `<li>${l.qty} × ${bySku[l.sku].name}${l.size ? ' · ' + l.size : ''}</li>`).join('');
    const total = cartTotal();
    track('merch_order_placed', { mode: m, paid, total, items: cartCount() });
    cart = []; saveCart(); closeCart();
    checkout.hidden = true; $('.mcart__view--bag', drawer).hidden = false;

    const status = m === 'event'
      ? `<ol class="mstatus" data-ref="${ref}"><li class="is-done">Order sent</li><li>Being packed</li><li>Ready at Counter ${counter}</li></ol>`
      : '';
    $('.mpass__body', pass).innerHTML = `
      <p class="mpass__kicker">${m === 'event' ? (paid ? 'Paid · Express counter' : 'Show this at the counter') : paid ? 'Paid pre-order · Pickup pass' : 'Reservation · Pay at pickup'}</p>
      <p class="mpass__ref" style="--bin:${bin[1]}">${ref}</p>
      <p class="mpass__bin"><i style="background:${bin[1]}"></i>${bin[0]} bin · ${m === 'event' ? `Counter ${counter}` : RULES.preorderCounter}</p>
      <div class="mpass__qr" aria-label="QR code for ${ref}">${qrSvg(ref)}</div>
      ${status}
      <ul class="mpass__items">${lines}</ul>
      <p class="mpass__total">${paid ? 'Paid' : 'To pay at counter'}: <b>${peso(total)}</b></p>
      <p class="mpass__rule">${m === 'event'
        ? 'Keep this screen open. When it says <b>Ready</b>, go to your counter, show the number, collect your bag' + (paid ? '.' : ' and pay.')
        : paid ? `Pick up any time on June 5–6. Held until <b>${RULES.paidHoldUntil}</b>. Not collected? We'll email you on <b>${RULES.deliveryEmail}</b> to arrange delivery — shipping fee applies.`
          : `Held until <b>${RULES.reserveCutoff}</b> on Day 1, then released for sale. Pay at ${RULES.preorderCounter}.`}</p>
      <p class="mpass__note">Sample only — ${paid ? 'no payment was taken' : 'nothing was reserved'}. A copy is emailed in the real build.</p>`;
    pass.hidden = false;
    requestAnimationFrame(() => pass.classList.add('is-open'));
    $('.mpass__close', pass).focus();
    if (m === 'event') simulateStatus();
  }
  function simulateStatus() {
    const steps = $$('.mstatus li', pass);
    setTimeout(() => steps[1]?.classList.add('is-done'), 2500);
    setTimeout(() => { steps[2]?.classList.add('is-done', 'is-ready'); toast('Your order is ready — head to your counter!'); }, 5500);
  }
  pass.addEventListener('click', (e) => { if (e.target.closest('.mpass__close') || e.target === pass) { pass.classList.remove('is-open'); setTimeout(() => { pass.hidden = true; }, 200); } });

  /* QR codes (qrcode-generator from cdnjs); falls back to a plain box if it didn't load */
  function qrSvg(text) {
    if (typeof window.qrcode !== 'function') return `<div class="mpass__qr-fallback">${text}</div>`;
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }

  /* ---------- event day: shelf QR deep link → item sheet ---------- */
  const sheet = $('.msheet');
  function openSheet(sku) {
    const p = bySku[sku];
    if (!p) return;
    $('.msheet__body', sheet).innerHTML = `${art(p)}
      <div class="mp__meta"><span class="mp__shelf">Shelf ${p.shelf} · ${SHELVES[p.shelf]}</span></div>
      <h3>${p.name}</h3><p class="mp__price">${peso(p.price)}</p>
      <p class="msheet__tip">You scanned the sample on Shelf ${p.shelf}. Add it to your order — we'll pack a fresh one from the stockroom.</p>
      <div class="mp__buy">${p.sizes ? `<label class="sr-only" for="sh-size">Size</label><select id="sh-size" class="mp-size">${p.sizes.map((s) => `<option>${s}</option>`).join('')}</select>` : ''}<button type="button" class="btn btn--pink" data-add="${p.sku}" ${p.stock <= 0 ? 'disabled' : ''}>${p.stock <= 0 ? 'Sold out' : 'Add to order'}</button></div>`;
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    track('merch_shelf_scan', { sku });
  }
  function closeSheet() { sheet.classList.remove('is-open'); setTimeout(() => { sheet.hidden = true; }, 200); }
  sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('[data-close-sheet]')) closeSheet(); });

  /* ---------- countdown to pre-order close ---------- */


  /* ---------- re-render when the site phase changes ---------- */
  function refresh() { renderCatalog(); renderCart(); }
  new MutationObserver(refresh).observe(root, { attributes: true, attributeFilter: ['data-phase'] });
  refresh();

  const sku = new URLSearchParams(location.search).get('sku');
  if (sku) {
    // a shelf QR always means "we're at the venue": show the event-day ordering view
    if (root.dataset.phase !== 'event') { root.dataset.phase = 'event'; }
    setTimeout(() => openSheet(sku.toUpperCase()), 400);
  }
})();
