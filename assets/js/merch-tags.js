/* Printable shelf tags: one QR per display sample, deep-linking to merch.html?sku=… */
(function () {
  'use strict';
  const wrap = document.querySelector('[data-merch-tags]');
  if (!wrap || !window.opfMerch) return;
  const base = new URL('merch.html', location.href).href;
  const qr = (t) => (window.opfQr ? window.opfQr(t) : `<div class="mpass__qr-fallback">${t}</div>`);
  const { PRODUCTS, SHELVES } = window.opfMerch;
  wrap.innerHTML = PRODUCTS.filter((p) => !p.preOnly).map((p) => `
    <article class="mtag">
      <p class="mtag__shelf">Shelf ${p.shelf} · ${SHELVES[p.shelf]}</p>
      <div class="mtag__qr">${qr(`${base}?sku=${p.sku}`)}</div>
      <h2>${p.name}</h2>
      <p class="mtag__price">₱${p.price.toLocaleString('en-PH')}${p.sizes ? ` · ${p.sizes.join(' ')}` : ''}</p>
      <p class="mtag__sku">SKU ${p.sku} · Sample — do not take</p>
    </article>`).join('');
  document.querySelectorAll('[data-qr]').forEach((el) => { el.innerHTML = qr(new URL(el.dataset.qr, location.href).href); });
})();
