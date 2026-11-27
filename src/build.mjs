// OPF 2027 sample site builder.
// Usage: node src/build.mjs   → writes *.html into the site root.
// Each page is a fragment in src/pages/<file>.html whose first line is
//   <!--meta {"title": "...", "desc": "...", "nav": "event", "js": ["join-us.js"]} -->
// Fragments can pull sections from the concept demo with {{demo:index#concept}}
// (any <section class="section" id="concept">…</section>) or {{demo:join-us#main}}.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpMapBlock } from './cp-map.mjs';

const SRC = dirname(fileURLToPath(import.meta.url));
const OUT = join(SRC, '..');
const V = Date.now().toString(36); // cache-buster for CSS/JS
const demo = {
  index: readFileSync(join(SRC, 'demo/index.html'), 'utf8'),
  'join-us': readFileSync(join(SRC, 'demo/join-us.html'), 'utf8'),
};
const sprite = demo.index.match(/<svg width="0" height="0"[\s\S]*?<\/svg>/)[0]
  .replace('</svg>', `    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></symbol>
    <symbol id="i-link" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></symbol>
    <symbol id="i-mail" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></symbol>
    <symbol id="i-tiktok" viewBox="0 0 24 24"><path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9a7.4 7.4 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5Z"/></symbol>
  </svg>`);

function demoPart(page, id) {
  const html = demo[page];
  if (id === 'main') return html.match(/<main id="main">([\s\S]*?)<\/main>/)[1];
  const re = new RegExp(`<section class="section" id="${id}"[\\s\\S]*?\\n    </section>`);
  const m = html.match(re);
  if (!m) throw new Error(`demo section not found: ${page}#${id}`);
  return id === 'map' ? upgradeMap(m[0]) : m[0];
}

// Crystal Pavilion: swap the flat JPG + static legend for the interactive vector map
function upgradeMap(html) {
  const before = html;
  html = html.replace(/<div class="map-layout">\s*<div class="map-card">\s*<a href="assets\/img\/map-crystal-pavilion\.jpg"[\s\S]*?<\/ol>\s*<\/div>\s*<\/div>/, () => cpMapBlock());
  if (html === before) throw new Error('Crystal Pavilion map block not found in demo');
  html = html.replace(/<li( class="is-tba")?><b style="([^"]*)">([A-C]\d\d)<\/b>([^<]*)<\/li>/g,
    '<li$1><button type="button" class="ip-pick" data-booth="$3" aria-label="Show booth $3 on the map"><b style="$2">$3</b>$4</button></li>');
  html = html.replace('<h4>IP booth lineup <span>— 20 titles across three booth layouts</span></h4>', '<h4>IP booth lineup <span>— tap a title to find its booth on the map</span></h4>');
  // anchors so other pages / the map can open a specific hall
  html = html.replace('<details class="acc" open>', '<details class="acc" id="map-cp" open>');
  html = html.replace(/<details class="acc">(\s*<summary class="acc__head"><span class="container"><span class="acc__title">Grand Ballroom)/, '<details class="acc" id="map-gb">$1');
  html = html.replace(/<details class="acc">(\s*<summary class="acc__head"><span class="container"><span class="acc__title">Cove Manila)/, '<details class="acc" id="map-cove">$1');
  return html;
}

// links in the demo that pointed to "not in this demo yet" now go to real pages
function fixLinks(html) {
  return html
    .replace(/href="#tickets"/g, 'href="tickets.html"')
    .replace(/href="#" data-soon="Full news articles"/g, 'href="news-article.html"')
    .replace(/href="#" data-soon="The Exhibition page"/g, 'href="exhibition.html"')
    .replace(/href="#" data-soon="The Cosplay Cup page"/g, 'href="cosplay-cup.html"')
    .replace(/href="#" data-soon="The Music Live page"/g, 'href="music-live.html"')
    .replace(/href="#" data-soon="The Sponsors &amp; Partners page"/g, 'href="sponsors.html"')
    .replace(/href="index\.html#tickets"/g, 'href="tickets.html"')
    .replace(/href="schedule\.html#maps"/g, 'href="schedule.html#map"')
    .replace(/<a class="btn btn--blue btn--block btn-fb"[^>]*>Visit our official FB page<\/a>/, '<div class="more-row"><a class="btn btn--blue" href="news.html">All news <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a></div>');
}

const NAV = [
  { key: 'event', label: 'Event', sub: [['exhibition.html', 'Exhibition'], ['cosplay-cup.html', 'Cosplay Cup'], ['music-live.html', 'Music Live'], ['schedule.html', 'Schedule &amp; Map']] },
  { key: 'tickets', label: 'Tickets', href: 'tickets.html' },
  { key: 'merch', label: 'Merch', href: 'merch.html' },
  { key: 'news', label: 'News', href: 'news.html' },
  { key: 'visit', label: 'Visit', sub: [['access.html', 'Access &amp; Venue'], ['faq.html', 'FAQ &amp; House Rules']] },
  { key: 'join', label: 'Join Us', href: 'join-us.html' },
  { key: 'sponsors', label: 'Sponsors', href: 'sponsors.html' },
];

const social = `
        <li><a href="https://www.facebook.com/OtakuPopFes" target="_blank" rel="noopener" aria-label="Facebook"><svg class="icon--fill" aria-hidden="true"><use href="#i-facebook"/></svg></a></li>
        <li><a href="https://www.instagram.com/otakupopfes/" target="_blank" rel="noopener" aria-label="Instagram"><svg class="icon--fill" aria-hidden="true"><use href="#i-instagram"/></svg></a></li>
        <li><a href="https://x.com/OtakuPopFes" target="_blank" rel="noopener" aria-label="X (Twitter)"><svg class="icon--fill" aria-hidden="true"><use href="#i-x"/></svg></a></li>
        <li><a href="https://www.tiktok.com/@otakupopfes" target="_blank" rel="noopener" aria-label="TikTok"><svg class="icon--fill" aria-hidden="true"><use href="#i-tiktok"/></svg></a></li>`;

const lang = (cls) => `<div class="lang ${cls}" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="true">EN</button><button type="button" data-lang="jp" aria-pressed="false">JP</button></div>`;

function header(file, navKey) {
  const cur = (href) => (href === file ? ' aria-current="page"' : '');
  const desk = NAV.map((n) => n.sub
    ? `<li class="has-sub${n.key === navKey ? ' is-current' : ''}"><button type="button" aria-expanded="false">${n.label}<svg class="icon" aria-hidden="true"><use href="#i-chevron"/></svg></button>
            <ul class="subnav-menu">${n.sub.map(([h, l]) => `<li><a href="${h}"${cur(h)}>${l}</a></li>`).join('')}</ul></li>`
    : `<li><a href="${n.href}"${cur(n.href)}>${n.label}${n.badge ? ` <span class="nav-badge">${n.badge}</span>` : ''}</a></li>`).join('\n          ');
  const mob = NAV.map((n) => n.sub
    ? `<li class="mobile-menu__group">${n.label}</li>${n.sub.map(([h, l]) => `<li><a href="${h}"${cur(h)}>${l}</a></li>`).join('')}`
    : `<li><a href="${n.href}"${cur(n.href)}>${n.label}${n.badge ? ` <span class="nav-badge">${n.badge}</span>` : ''}</a></li>`).join('\n        ');
  return `
  <p class="sample-ribbon"><b>Sample site</b> · Proposal KV · Content, prices and schedules are placeholders · Not the live otakupopfes.com</p>
  <div class="annc">
    <p class="annc__inner">
      <span data-phase-only="announce">📣 Booth applications are open — early-bird rates until Dec 15, 2026. <a href="join-us.html">Apply now</a></span>
      <span data-phase-only="onsale">🎟️ Early-bird passes on sale now — <a href="tickets.html">get yours before they're gone</a></span>
      <span data-phase-only="event">🔴 OPF 2027 is happening now! <a href="schedule.html">Today's schedule &amp; map</a></span>
      <span data-phase-only="post">💙 Thank you for an amazing OPF 2027! <a href="archive.html">See the highlights</a></span>
      <button class="annc__close" type="button" aria-label="Dismiss announcement">×</button>
    </p>
  </div>
  <header class="site-header">
    <div class="site-header__inner">
      <a class="site-logo" href="index.html" aria-label="Otaku Pop Fes home">
        <img src="assets/img/logo.png" alt="Otaku Pop Fes" width="616" height="126">
      </a>
      <nav class="main-nav" aria-label="Main">
        <ul>
          ${desk}
        </ul>
      </nav>
      ${lang('lang--header')}
      <ul class="social" aria-label="Official social media">${social}
      </ul>
      <a class="btn btn--pink btn-tickets" href="tickets.html"><span data-phase-only="announce onsale event">Buy Tickets!</span><span data-phase-only="post">OPF 2028 Updates</span></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu">
        <span></span><span></span><span></span><span class="sr-only">Menu</span>
      </button>
    </div>
    <div class="mobile-menu" id="mobile-menu" hidden>
      <ul>
        ${mob}
        <li class="mobile-menu__group">More</li><li><a href="contact.html"${cur('contact.html')}>Contact</a></li><li><a href="archive.html"${cur('archive.html')}>Past Events</a></li>
      </ul>
      ${lang('')}
      <ul class="social" aria-label="Official social media">${social}
      </ul>
      <p class="mobile-menu__meta">June 5–6, 2027 · Okada Manila<br>Crystal Pavilion · Grand Ballroom · Cove Manila</p>
    </div>
  </header>`;
}

const footer = `
  <footer class="site-footer">
    <div class="footer-sns"><h2>Official SNS</h2></div>
    <div class="footer-icons">
      <a href="https://www.facebook.com/OtakuPopFes" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-facebook" fill="#1877F2"/></svg></a>
      <a href="https://www.instagram.com/otakupopfes/" target="_blank" rel="noopener" aria-label="Instagram">
        <svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset=".35" stop-color="#FA7E1E"/><stop offset=".6" stop-color="#D62976"/><stop offset=".85" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="url(#ig-grad)" stroke-width="2.2"/><circle cx="12" cy="12" r="4.3" fill="none" stroke="url(#ig-grad)" stroke-width="2.2"/><circle cx="17.6" cy="6.4" r="1.4" fill="#962FBF"/></svg>
      </a>
      <a href="https://x.com/OtakuPopFes" target="_blank" rel="noopener" aria-label="X (Twitter)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-x" fill="#000"/></svg></a>
      <a href="https://www.tiktok.com/@otakupopfes" target="_blank" rel="noopener" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-tiktok" fill="#000"/></svg></a>
    </div>
    <div class="footer-main">
      <div class="container">
        <div>
          <img src="assets/img/logo.png" alt="Otaku Pop Fes" width="616" height="126" loading="lazy">
          <p><strong>June 5–6, 2027 · 10:00–22:00</strong><br>Okada Manila — Crystal Pavilion, Grand Ballroom &amp; Cove Manila</p>
          <p>Brought from Japan by CyberE Inc. · Organized by Mineski Global</p>
        </div>
        <div><h2>Event</h2><ul><li><a href="exhibition.html">Exhibition</a></li><li><a href="cosplay-cup.html">Cosplay Cup</a></li><li><a href="music-live.html">Music Live</a></li><li><a href="schedule.html">Schedule &amp; Map</a></li><li><a href="tickets.html">Tickets</a></li><li><a href="merch.html">Merch</a></li></ul></div>
        <div><h2>Visit</h2><ul><li><a href="access.html">Access &amp; Venue</a></li><li><a href="faq.html">FAQ &amp; House Rules</a></li><li><a href="news.html">News</a></li><li><a href="archive.html">Past Events</a></li></ul></div>
        <div><h2>Work with us</h2><ul><li><a href="join-us.html">Join Us (Exhibitors)</a></li><li><a href="sponsors.html">Sponsors &amp; Partners</a></li><li><a href="contact.html">Contact</a></li></ul></div>
        <div>
          <h2>Get updates</h2>
          <p style="margin-top:0">Lineup reveals, ticket drops and early-bird deals — straight to your inbox.</p>
          <form class="signup" novalidate><label class="sr-only" for="signup-email">Email address</label><input id="signup-email" type="email" placeholder="you@email.com" autocomplete="email"><button type="submit">Sign up</button></form>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <p>© 2027 Otaku Pop Fes Executive Committee. All Rights Reserved.</p>
      <p><a href="legal.html#privacy">Privacy Policy</a></p><p><a href="legal.html#terms">Terms of Use</a></p><p><a href="legal.html#ticket-terms">Ticket Terms</a></p>
      <p class="demo-note">Sample site by Mineski Global for CyberE — content, schedules and prices are placeholders.</p>
    </div>
  </footer>`;

const samplePanel = `
  <div class="sample-panel">
    <div class="sample-panel__body" id="sample-panel" hidden>
      <h2>Sample site controls</h2>
      <p>Try the site the way visitors will see it through the year. In the real site this is one switch in the CMS.</p>
      <p class="sample-panel__label">Site phase</p>
      <div class="seg">
        <button type="button" data-set-phase="announce" aria-pressed="true">Announce<small>Dec – Jan</small></button>
        <button type="button" data-set-phase="onsale" aria-pressed="false">On sale<small>Feb – May</small></button>
        <button type="button" data-set-phase="event" aria-pressed="false">Event week<small>Jun 1 – 6</small></button>
        <button type="button" data-set-phase="post" aria-pressed="false">Post-event<small>Jun 7 →</small></button>
      </div>
      <p class="sample-panel__label">Palette preview (how a new KV drops in)</p>
      <div class="swatches">
        <button type="button" data-set-palette="proposal" aria-pressed="true" title="Proposal KV" style="background:linear-gradient(135deg,#0031DB 50%,#FC3D92 50%)"><span class="sr-only">Proposal KV</span></button>
        <button type="button" data-set-palette="violet" aria-pressed="false" title="Example: violet" style="background:linear-gradient(135deg,#4B1FB8 50%,#FF5A8A 50%)"><span class="sr-only">Example palette: violet</span></button>
        <button type="button" data-set-palette="sunset" aria-pressed="false" title="Example: sunset" style="background:linear-gradient(135deg,#D9381E 50%,#1D3FBF 50%)"><span class="sr-only">Example palette: sunset</span></button>
        <button type="button" data-set-palette="forest" aria-pressed="false" title="Example: forest" style="background:linear-gradient(135deg,#0E6B4F 50%,#F2668B 50%)"><span class="sr-only">Example palette: forest</span></button>
      </div>
      <p class="sample-panel__label">Pop-up, cookies &amp; analytics</p>
      <div class="sample-panel__row">
        <button type="button" class="btn btn--small btn--blue" data-sample="popup">Show home pop-up</button>
        <button type="button" class="btn btn--small sample-panel__line" data-sample="cookies">Reset cookie choice</button>
      </div>
      <p class="sample-panel__status" data-sample-status></p>
      <p class="sample-panel__label">Landing page samples</p>
      <div class="sample-panel__row">
        <a class="btn btn--small btn--pink" href="lp-ticket-drop.html">A · Ticket drop</a>
        <a class="btn btn--small sample-panel__line" href="lp-cosplay-cup.html">B · Cosplay Cup</a>
      </div>
    </div>
    <button class="sample-panel__toggle" type="button" aria-expanded="false" aria-controls="sample-panel"><i></i><span>Sample controls</span></button>
  </div>`;

// campaign landing pages: no main menu, one call to action, slim footer
function lpHeader(meta) {
  return `
  <p class="sample-ribbon"><b>Sample landing page</b> · Proposal KV · Placeholder content · <a href="index.html" style="color:inherit">Back to the sample site</a></p>
  <header class="lp-header">
    <div class="container lp-header__inner">
      <a class="lp-header__logo" href="index.html" aria-label="Otaku Pop Fes home"><img src="assets/img/logo.png" alt="Otaku Pop Fes" width="616" height="126"></a>
      ${meta.cta ? `<a class="btn btn--pink btn--small" href="${meta.cta[0]}" data-track="lp_header_cta">${meta.cta[1]}</a>` : ''}
    </div>
  </header>`;
}
const lpFooter = `
  <footer class="lp-footer">
    <div class="footer-bar">
      <p>© 2027 Otaku Pop Fes Executive Committee · June 5–6, 2027 · Okada Manila</p>
      <p><a href="legal.html#privacy">Privacy Policy</a></p><p><a href="legal.html#terms">Terms of Use</a></p>
      <p class="demo-note">Sample landing page by Mineski Global for CyberE — placeholder content.</p>
    </div>
  </footer>`;

function page(file, meta, body) {
  const js = (meta.js || []).map((s) => `\n  <script src="assets/js/${s}?v=${V}" defer></script>`).join('');
  const css = (meta.css || []).map((s) => `\n  <link rel="stylesheet" href="assets/css/${s}?v=${V}">`).join('');
  const isLP = meta.layout === 'landing';
  const ext = (meta.ext || []).map((u) => `
  <script src="${u}" defer></script>`).join('');
  return `<!doctype html>
<html lang="en" data-phase="announce">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${meta.title} – Otaku Pop Fes 2027 (sample)</title>
  <meta name="description" content="${meta.desc || 'Otaku Pop Fes 2027 — Get Isekaied! June 5–6, 2027 at Okada Manila.'}">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#0031DB">
  <link rel="icon" type="image/png" href="assets/img/favicon.png">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800..900&amp;family=Montserrat:wght@400;500;600;700;800;900&amp;display=swap">
  <link rel="stylesheet" href="assets/css/tokens.css?v=${V}">
  <link rel="stylesheet" href="assets/css/styles.css?v=${V}">
  <link rel="stylesheet" href="assets/css/pages.css?v=${V}">${css}
  <link rel="stylesheet" href="assets/css/motion.css?v=${V}">
  <script>try{var p=localStorage.getItem('opf-phase');if(p)document.documentElement.dataset.phase=p}catch(e){}</script>
  <script src="assets/js/consent.js?v=${V}" defer></script>
  <script src="assets/js/main.js?v=${V}" defer></script>
  <script src="assets/js/site.js?v=${V}" defer></script>
  <script src="assets/js/map.js?v=${V}" defer></script>${ext}${js}
  <script src="assets/js/motion.js?v=${V}" defer></script>
</head>
<body${meta.bodyClass ? ` class="${meta.bodyClass}"` : ''}>
  ${sprite}

  <a class="skip-link" href="#main">Skip to content</a>
${isLP ? lpHeader(meta) : header(file, meta.nav)}

  <main id="main">
${body}
  </main>
${isLP ? lpFooter : footer}
${samplePanel}
  <div class="toast" role="status" aria-live="polite"></div>
</body>
</html>
`;
}

// shared snippets usable in fragments as {{snip:name}}
const SNIP = {
  'ticket-band': `
      <div class="container mt-l">
        <div class="cta-box">
          <div>
            <p class="cta-box__title"><span data-phase-only="announce">Passes from ₱800</span><span data-phase-only="onsale event">Get your pass — from ₱800</span><span data-phase-only="post">See you at OPF 2028</span></p>
            <p class="cta-box__sub"><span data-phase-only="announce">Ticket sales open February 2027 · sign up to be first in line</span><span data-phase-only="onsale">Early-bird prices for a limited time</span><span data-phase-only="event">Walk-in passes available at Crystal Pavilion · Event Arc 1</span><span data-phase-only="post">Sign up to hear first when OPF 2028 is announced</span></p>
          </div>
          <a class="btn btn--white" href="tickets.html"><span data-phase-only="announce onsale event">See passes</span><span data-phase-only="post">Get notified</span></a>
        </div>
      </div>`,
};

function hero({ title, ghost, eyebrow, lead, crumbs, img = 'kv-main.jpg', mascot, chibi, mod = '', actions = '' }) {
  return `
    <section class="join-hero join-hero--short ${mod}">
      <img class="join-hero__bg" src="assets/img/${img}" alt="" width="1672" height="941" fetchpriority="high">
      <div class="container join-hero__inner">
        <ol class="crumbs"><li><a href="index.html">Home</a></li>${crumbs ? crumbs.map((c) => `<li>${c}</li>`).join('') : ''}<li aria-current="page">${title}${ghost ? ' ' + ghost : ''}</li></ol>
        ${eyebrow ? `<p class="join-hero__eyebrow">${eyebrow}</p>` : ''}
        <h1 class="join-hero__title display">${title}${ghost ? ` <span>${ghost}</span>` : ''}</h1>
        ${lead ? `<p class="join-hero__lead">${lead}</p>` : ''}
        ${actions ? `<div class="join-hero__actions">${actions}</div>` : ''}
      </div>
      ${chibi ? `<img class="join-hero__chibi" src="assets/img/${chibi}" alt="" width="295" height="420">` : ''}
      ${mascot ? `<img class="join-hero__mascot" src="assets/img/${mascot.src}" alt="${mascot.alt}" width="598" height="900">` : ''}
    </section>`;
}

function secTitle(id, word) {
  return `<div class="sec-title">
        <h2 class="sec-title__text display" id="${id}"><span class="sec-title__ghost" aria-hidden="true">${word}</span><span>${word}</span><span class="sec-title__ghost" aria-hidden="true">${word}</span></h2>
      </div>`;
}

const PAGES_DIR = join(SRC, 'pages');
const files = readdirSync(PAGES_DIR).filter((f) => f.endsWith('.html'));
for (const f of files) {
  const raw = readFileSync(join(PAGES_DIR, f), 'utf8');
  const m = raw.match(/^<!--meta (\{[\s\S]*?\}) -->\r?\n/);
  if (!m) throw new Error(`${f}: missing meta line`);
  const meta = JSON.parse(m[1]);
  let body = raw.slice(m[0].length)
    .replace(/\{\{demo:([\w-]+)#([\w-]+)\}\}/g, (_, p, id) => demoPart(p, id))
    .replace(/\{\{snip:([\w-]+)\}\}/g, (_, n) => SNIP[n])
    .replace(/\{\{demo-tt:(\d)\}\}/g, (_, n) => [...demo.index.matchAll(/<div class="tt-card">[\s\S]*?<p class="scroll-hint tt-hint">.*?<\/p>\s*<\/div>/g)][n - 1][0])
    .replace(/\{\{hero\}\}([\s\S]*?)\{\{\/hero\}\}/g, (_, j) => hero(JSON.parse(j)))
    .replace(/\{\{title ([\w-]+) ([^}]+)\}\}/g, (_, id, w) => secTitle(id, w));
  body = fixLinks(body);
  writeFileSync(join(OUT, f), page(f, meta, body));
  console.log('built', f);
}
