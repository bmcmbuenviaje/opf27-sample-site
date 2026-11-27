/* Pre-order landing page: featured products from the shared merch catalogue.
   "Pre-order" adds the item to the bag on the Merch page (merch.html?add=SKU&size=…). */
(function () {
  'use strict';
  const box = document.querySelector('[data-lp-products]');
  if (!box || !window.opfMerch) return;
  const { PRODUCTS, art, peso } = window.opfMerch;
  const picks = ['A-TEE', 'A-HOOD', 'C-PLUSH', 'C-SHIKI'].map((s) => PRODUCTS.find((p) => p.sku === s)).filter(Boolean);
  box.innerHTML = picks.map((p) => `
    <article class="c-prod">
      ${art(p)}
      <div class="c-prod__body">
        ${p.tag ? `<p class="c-prod__tag">${p.tag}</p>` : ''}
        <h3>${p.name}</h3>
        <p class="c-prod__price">${peso(p.price)}</p>
        ${p.sizes ? `<label class="sr-only" for="c-sz-${p.sku}">Size</label><select id="c-sz-${p.sku}" class="mp-size">${p.sizes.map((s) => `<option>${s}</option>`).join('')}</select>` : ''}
        <a class="btn btn--pink btn--block" href="merch.html?add=${p.sku}" data-c-add="${p.sku}" data-track="lp_c_preorder_item">Pre-order</a>
      </div>
    </article>`).join('');
  // carry the chosen size into the link
  box.addEventListener('click', (e) => {
    const a = e.target.closest('[data-c-add]');
    if (!a) return;
    const sz = box.querySelector(`#c-sz-${a.dataset.cAdd}`);
    if (sz) a.href = `merch.html?add=${a.dataset.cAdd}&size=${encodeURIComponent(sz.value)}`;
  });
})();
