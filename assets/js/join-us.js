/* Join Us — live booth estimate and application form.
   Demo only: the form is validated in the browser and never submitted anywhere. */
(function () {
  'use strict';

  const form = document.getElementById('apply-form');
  if (!form) return;

  const VAT_RATE = 0.12;
  const EARLY_BIRD_END = new Date('2026-12-15T23:59:59+08:00');
  const MAX_FILES = 5;
  const MAX_FILE_MB = 10;

  // Sample rates for the demo: pesos, VAT-exclusive, per booth for both show days.
  const BOOTHS = {
    merchant: {
      name: 'Merchant Booth', code: 'MB', zone: 'Crystal Pavilion', zoneClass: 'pavilion',
      spec: '3m × 2m shell booth · 3 exhibitor passes', img: 'assets/img/booth-merchant.jpg',
      early: 38000, regular: 45000, addons: ['pass', 'outlet', 'table', 'chair', 'corner'], needsReg: true,
    },
    artist: {
      name: 'Artist Alley Booth', code: 'AA', zone: 'Grand Ballroom', zoneClass: 'ballroom',
      spec: '2m × 2m shell booth · 2 exhibitor passes', img: 'assets/img/booth-artist-alley.jpg',
      early: 14000, regular: 16500, addons: ['pass', 'outlet', 'table', 'chair'],
    },
    doujin: {
      name: 'Doujin Table', code: 'DJ', zone: 'Doujin District', zoneClass: 'ballroom',
      img: 'assets/img/booth-doujin.jpg', addons: ['pass', 'chair'],
      sizes: {
        full: { label: 'Full', spec: '1.8m table · 2 exhibitor passes', early: 5500, regular: 6500 },
        half: { label: 'Half', spec: '0.9m table · 1 exhibitor pass', early: 3200, regular: 3800 },
      },
    },
    food: {
      name: 'Food Street Stall', code: 'FS', zone: 'Crystal Pavilion', zoneClass: 'pavilion',
      spec: '3m × 2m yatai stall · 3 exhibitor passes', img: 'assets/img/booth-food.jpg',
      early: 48000, regular: 55000, addons: ['pass', 'outlet', 'table', 'chair'], needsReg: true, corkage: true,
    },
    brand: {
      name: 'Brand Experience Space', code: 'BX', zone: 'Crystal Pavilion', zoneClass: 'pavilion',
      spec: 'Raw space · custom build by exhibitor', img: 'assets/img/booth-brand-space.jpg',
      addons: [], proposal: true,
    },
  };

  const ADDONS = {
    pass: { label: 'Extra exhibitor pass', price: 1200 },
    outlet: { label: 'Additional 500W outlet', price: 2500 },
    table: { label: 'Extra table', price: 800 },
    chair: { label: 'Extra chair', price: 300 },
    corner: { label: 'Corner booth upgrade', price: 5000 },
  };

  const $ = (selector) => document.querySelector(selector);
  const peso = (amount) => '₱' + Math.round(amount).toLocaleString('en-PH');
  const isEarlyBird = () => Date.now() <= EARLY_BIRD_END.getTime();
  const text = (data, key) => String(data.get(key) || '').trim();
  const toast = (message) => window.opfToast && window.opfToast(message);

  const els = {
    layout: $('#apply-layout'),
    success: $('#apply-success'),
    alert: $('#form-alert'),
    alertText: $('#form-alert-text'),
    summary: $('#summary-content'),
    summaryEb: $('#summary-eb'),
    live: $('#summary-live'),
    qtyField: $('#field-qty'),
    qtyLabel: $('label[for="qty"]'),
    tableField: $('#field-tablesize'),
    spaceField: $('#field-space'),
    addonsNone: $('#addons-none'),
    regReq: $('#reg-req'),
    fileList: $('#file-list'),
    dropzone: $('#dropzone'),
    count: $('#products-count'),
  };
  const emptySummary = els.summary.innerHTML;

  function clampInt(value, min, max) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  /* ---------- estimate ---------- */
  function readState() {
    const data = new FormData(form);
    const booth = BOOTHS[data.get('booth')];
    const state = { booth, qty: 1, size: null, lines: [], subtotal: 0, vat: 0, total: 0 };
    if (!booth) return state;

    if (booth.proposal) {
      state.space = data.get('space');
      return state;
    }

    state.qty = clampInt(data.get('qty'), 1, 3);
    let rates = booth;
    if (booth.sizes) {
      state.size = data.get('tablesize') === 'half' ? 'half' : 'full';
      rates = booth.sizes[state.size];
    }
    const unit = isEarlyBird() ? rates.early : rates.regular;
    state.lines.push({ label: `${boothLabel(state)} × ${state.qty}`, amount: unit * state.qty });

    booth.addons.forEach((key) => {
      const count = key === 'corner'
        ? (data.get('addon-corner') ? state.qty : 0)
        : clampInt(data.get(`addon-${key}`), 0, 99);
      if (count > 0) state.lines.push({ label: `${ADDONS[key].label} × ${count}`, amount: ADDONS[key].price * count });
    });

    state.subtotal = state.lines.reduce((sum, line) => sum + line.amount, 0);
    state.vat = state.subtotal * VAT_RATE;
    state.total = state.subtotal + state.vat;
    return state;
  }

  function boothLabel(state) {
    const { booth } = state;
    return booth.sizes ? `${booth.name} (${booth.sizes[state.size].label})` : booth.name;
  }

  let liveTimer;
  function announce(message) {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { els.live.textContent = message; }, 600);
  }

  function render() {
    const state = readState();
    const { booth } = state;
    const early = isEarlyBird();
    els.summaryEb.textContent = early ? 'Early bird' : 'Regular rate';

    // show only the inputs that apply to the chosen booth
    els.tableField.hidden = !booth || !booth.sizes;
    els.spaceField.hidden = !booth || !booth.proposal;
    els.qtyField.hidden = Boolean(booth && booth.proposal);
    els.qtyLabel.textContent = booth && booth.sizes ? 'Number of tables' : 'Number of booths';
    form.querySelectorAll('.addon').forEach((row) => {
      row.hidden = Boolean(booth) && !booth.addons.includes(row.dataset.addon);
    });
    els.addonsNone.hidden = !(booth && booth.addons.length === 0);
    els.regReq.hidden = !(booth && booth.needsReg);

    if (!booth) {
      els.summary.innerHTML = emptySummary;
      return;
    }

    const spec = booth.sizes ? booth.sizes[state.size].spec : booth.spec;
    let body;
    if (booth.proposal) {
      body = `
        <ul class="lines"><li><span>Preferred space</span><span>${state.space}</span></li></ul>
        <p class="summary__due">Our partnerships team will send you a <strong>custom proposal</strong> within 5 business days.</p>`;
    } else {
      const lines = state.lines.map((line) => `<li><span>${line.label}</span><span>${peso(line.amount)}</span></li>`).join('');
      body = `
        <ul class="lines">
          ${lines}
          ${booth.corkage ? '<li class="is-muted"><span>Venue corkage</span><span>Billed by venue</span></li>' : ''}
          <li class="is-muted"><span>Subtotal</span><span>${peso(state.subtotal)}</span></li>
          <li class="is-muted"><span>VAT (12%)</span><span>${peso(state.vat)}</span></li>
          <li class="is-total"><span>Estimated total</span><span>${peso(state.total)}</span></li>
        </ul>
        <p class="summary__due">50% reservation fee due within 5 business days of approval: <strong>${peso(state.total / 2)}</strong></p>`;
    }

    els.summary.innerHTML = `
      <div class="summary__media">
        <img src="${booth.img}" alt="">
        <span class="zone-tag zone-tag--${booth.zoneClass}">${booth.zone}</span>
      </div>
      <div class="summary__body">
        <h4 class="summary__name display">${booth.name}</h4>
        <p class="summary__spec">${spec}</p>
        ${body}
        <p class="summary__fine">${early && !booth.proposal ? 'Early-bird rate until December 15, 2026. ' : ''}Sample rates for this demo — your final invoice is issued after approval.</p>
      </div>`;

    announce(booth.proposal ? `${booth.name}: custom proposal` : `Estimated total ${peso(state.total)} including VAT`);
  }

  /* ---------- steppers ---------- */
  function syncSteppers() {
    form.querySelectorAll('[data-stepper]').forEach((stepper) => {
      const input = stepper.querySelector('input');
      const value = clampInt(input.value, Number(input.min), Number(input.max));
      stepper.querySelector('[data-step="-1"]').disabled = value <= Number(input.min);
      stepper.querySelector('[data-step="1"]').disabled = value >= Number(input.max);
    });
  }

  form.addEventListener('click', (event) => {
    const button = event.target.closest('[data-step]');
    if (!button) return;
    const input = button.parentElement.querySelector('input');
    input.value = clampInt((parseInt(input.value, 10) || 0) + Number(button.dataset.step), Number(input.min), Number(input.max));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  /* ---------- validation ---------- */
  const RULES = {
    booth: (d) => (d.get('booth') ? '' : 'Choose a booth type.'),
    brand: (d) => (text(d, 'brand') ? '' : 'Enter your brand, store or circle name.'),
    firstName: (d) => (text(d, 'firstName') ? '' : 'Enter your first name.'),
    lastName: (d) => (text(d, 'lastName') ? '' : 'Enter your last name.'),
    email: (d) => {
      const value = text(d, 'email');
      if (!value) return 'Enter your email address.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? '' : 'Enter a valid email address, like name@example.com.';
    },
    mobile: (d) => {
      const value = text(d, 'mobile').replace(/[\s().-]/g, '');
      if (!value) return 'Enter your mobile number.';
      return /^(\+?63|0)9\d{9}$/.test(value) ? '' : 'Use a PH mobile number, like 0917 123 4567 or +63 917 123 4567.';
    },
    link: (d) => {
      const value = text(d, 'link');
      if (!value) return 'Add a link or @handle so we can see your work.';
      const isHandle = /^@[\w.]{2,}$/.test(value);
      const isUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value);
      return isHandle || isUrl ? '' : 'Enter a valid link (https://instagram.com/yourpage) or @handle.';
    },
    category: (d) => (d.get('category') ? '' : 'Choose the category that best fits your booth.'),
    reg: (d) => {
      const booth = BOOTHS[d.get('booth')];
      return booth && booth.needsReg && !text(d, 'reg') ? `${booth.name} applicants need a DTI or SEC registration number.` : '';
    },
    products: (d) => (text(d, 'products').length >= 20 ? '' : 'Tell us a little more about what you’ll bring (at least 20 characters).'),
    licensing: (d) => (d.get('licensing') ? '' : 'Let us know what kind of goods you’ll sell.'),
    photos: () => photoError(),
    consent: (d) => (d.get('terms') && d.get('privacy') ? '' : 'Please agree to the exhibitor rules and the data privacy consent.'),
  };
  const RULE_FOR_NAME = { terms: 'consent', privacy: 'consent' };
  const INPUTS_FOR_RULE = { consent: '[name="terms"], [name="privacy"]' };
  const ESTIMATE_FIELDS = /^(booth|qty|tablesize|space|addon-.+)$/;

  const ruleFor = (name) => RULE_FOR_NAME[name] || (RULES[name] ? name : null);
  const touched = new Set();
  let submitted = false;

  function setError(key, message) {
    const field = document.getElementById(`field-${key}`);
    const error = document.getElementById(`err-${key}`);
    if (!field || !error) return;
    field.classList.toggle('has-error', Boolean(message));
    error.textContent = message;
    field.querySelectorAll(INPUTS_FOR_RULE[key] || 'input, select, textarea').forEach((input) => {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
  }

  function validate(keys = Object.keys(RULES)) {
    const data = new FormData(form);
    return keys.filter((key) => {
      const message = RULES[key](data);
      setError(key, message);
      return Boolean(message);
    });
  }

  function refreshAlert() {
    if (!submitted || els.alert.hidden) return;
    const remaining = validate();
    if (remaining.length) els.alertText.textContent = alertMessage(remaining.length);
    else els.alert.hidden = true;
  }

  const alertMessage = (count) => (count === 1 ? 'Please fix 1 field below.' : `Please fix the ${count} fields below.`);

  function handleFieldEvent(event) {
    const { name } = event.target;
    if (!name) return;
    if (ESTIMATE_FIELDS.test(name)) {
      render();
      syncSteppers();
      if (name === 'booth' && (submitted || touched.has('reg'))) validate(['reg']);
    }
    const key = ruleFor(name);
    if (key && (submitted || touched.has(key))) {
      validate([key]);
      refreshAlert();
    }
  }

  form.addEventListener('input', handleFieldEvent);
  form.addEventListener('change', (event) => {
    if (event.target.matches('[data-stepper] input')) {
      const input = event.target;
      input.value = clampInt(input.value, Number(input.min), Number(input.max));
    }
    handleFieldEvent(event);
  });
  form.addEventListener('focusout', (event) => {
    const { target } = event;
    const key = ruleFor(target.name);
    if (!key || target.type === 'radio' || target.type === 'checkbox' || target.type === 'file') return;
    if (target.value.trim()) touched.add(key);
    if (touched.has(key) || submitted) validate([key]);
  });

  /* ---------- character count & photos ---------- */
  const products = form.elements.products;
  products.addEventListener('input', () => { els.count.textContent = products.value.length; });

  const photos = form.elements.photos;
  function photoError() {
    const files = [...photos.files];
    if (files.length > MAX_FILES) return `Please choose up to ${MAX_FILES} files.`;
    const tooBig = files.find((file) => file.size > MAX_FILE_MB * 1024 * 1024);
    return tooBig ? `“${tooBig.name}” is larger than ${MAX_FILE_MB} MB.` : '';
  }
  const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

  photos.addEventListener('change', () => {
    els.fileList.replaceChildren(...[...photos.files].map((file) => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const size = document.createElement('span');
      name.textContent = file.name;
      size.textContent = formatSize(file.size);
      item.append(name, size);
      return item;
    }));
    validate(['photos']);
  });
  ['dragenter', 'dragover'].forEach((type) => els.dropzone.addEventListener(type, () => els.dropzone.classList.add('is-over')));
  ['dragleave', 'drop'].forEach((type) => els.dropzone.addEventListener(type, () => els.dropzone.classList.remove('is-over')));

  /* ---------- submit / success ---------- */
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted = true;
    const failed = validate();
    if (failed.length) {
      els.alertText.textContent = alertMessage(failed.length);
      els.alert.hidden = false;
      const field = document.getElementById(`field-${failed[0]}`);
      const input = field.querySelector(INPUTS_FOR_RULE[failed[0]] || 'input, select, textarea');
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (input) input.focus({ preventScroll: true });
      return;
    }
    els.alert.hidden = true;
    showSuccess();
  });

  function showSuccess() {
    const data = new FormData(form);
    const state = readState();
    const reference = `OPF27-${state.booth.code}-${Math.floor(1000 + Math.random() * 9000)}`;

    $('#s-name').textContent = text(data, 'firstName');
    $('#s-ref').textContent = reference;
    $('#s-booth').textContent = state.booth.proposal
      ? `${state.booth.name} · ${state.space}`
      : `${boothLabel(state)} × ${state.qty}`;
    $('#s-brand').textContent = text(data, 'brand');
    $('#s-email').textContent = text(data, 'email');
    $('#s-total').textContent = state.booth.proposal
      ? 'Custom proposal to follow'
      : `${peso(state.total)} incl. VAT · 50% reservation fee ${peso(state.total / 2)}`;

    els.layout.hidden = true;
    els.success.hidden = false;
    els.success.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.success.focus({ preventScroll: true });
    toast('Application received! (Demo — nothing was sent.)');
  }

  function resetForm() {
    form.reset();
    submitted = false;
    touched.clear();
    Object.keys(RULES).forEach((key) => setError(key, ''));
    els.fileList.replaceChildren();
    els.count.textContent = '0';
    els.alert.hidden = true;
    els.success.hidden = true;
    els.layout.hidden = false;
    render();
    syncSteppers();
  }

  $('#apply-again').addEventListener('click', () => {
    resetForm();
    document.getElementById('apply').scrollIntoView({ behavior: 'smooth' });
    form.querySelector('input[name="booth"]').focus({ preventScroll: true });
  });

  /* ---------- "Apply" buttons elsewhere on the page pre-select a booth ---------- */
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-booth]');
    if (!link) return;
    const radio = form.querySelector(`input[name="booth"][value="${link.dataset.booth}"]`);
    if (!radio) return;
    if (!els.success.hidden) resetForm();
    radio.checked = true;
    if (link.dataset.size) {
      const size = form.querySelector(`input[name="tablesize"][value="${link.dataset.size}"]`);
      if (size) size.checked = true;
    }
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    toast(`${BOOTHS[link.dataset.booth].name} selected — add your details below.`);
  });

  /* ---------- inclusions: one card per booth for phones (built from the table) ---------- */
  const table = document.querySelector('.incl');
  if (table) {
    const heads = [...table.tHead.rows[0].cells];
    const rows = [...table.tBodies[0].rows];
    const list = document.createElement('div');
    list.className = 'incl-cards';
    heads.slice(1).forEach((th, i) => {
      const card = document.createElement('article');
      card.className = 'incl-card';
      const img = th.querySelector('img').cloneNode();
      const title = document.createElement('h3');
      title.textContent = th.querySelector('span').textContent;
      const dl = document.createElement('dl');
      rows.forEach((row) => {
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = row.cells[0].textContent;
        dd.innerHTML = row.cells[i + 1].innerHTML;
        if (row.cells[i + 1].classList.contains('na')) dd.className = 'na';
        dl.append(dt, dd);
      });
      card.append(img, title, dl);
      list.append(card);
    });
    table.closest('.incl-scroll').after(list);
  }

  render();
  syncSteppers();
})();
