// Interactive Crystal Pavilion overview map (vector, redrawn from map-crystal-pavilion.jpg).
// Zones, booths and markers carry data-zone / data-booth so assets/js/map.js can wire them up.
// Colours come from the design tokens (CSS vars), so a new KV recolours the map too.

const C = { x: 810, y: 430 };            // centre of the fountain ring
const OUT = { rx: 650, ry: 400 };        // outer edge of the concourse
const IN = { rx: 545, ry: 290 };         // inner edge (fountain side)
const MID = { rx: (OUT.rx + IN.rx) / 2, ry: (OUT.ry + IN.ry) / 2 };
const rad = (d) => (d * Math.PI) / 180;
const pt = (e, a) => [+(C.x + e.rx * Math.cos(rad(a))).toFixed(1), +(C.y - e.ry * Math.sin(rad(a))).toFixed(1)];
const P = (p) => p.join(' ');

// ring segment from angle a0 (right) to a1 (left), degrees, 0 = east, 90 = north
function seg(a0, a1, o = OUT, i = IN) {
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${P(pt(o, a0))} A${o.rx} ${o.ry} 0 ${large} 0 ${P(pt(o, a1))} L${P(pt(i, a1))} A${i.rx} ${i.ry} 0 ${large} 1 ${P(pt(i, a0))}Z`;
}
// left-to-right arc along the middle of the ring, for curved labels
function midArc(a0, a1, e = MID) {
  return `M${P(pt(e, a1))} A${e.rx} ${e.ry} 0 0 1 ${P(pt(e, a0))}`;
}

export const ZONES = [
  { id: 'entrance', n: '01', name: 'Main Entrance &amp; Ticketing', k: 'var(--pink-dark)', a: [168, 176],
    text: 'Event Arc 1, next to the Fountain Foyer drop-off. Claim your wristband and OPF Companion here. Opens 09:30.',
    links: [['tickets.html', 'Tickets'], ['access.html', 'Getting here']] },
  { id: 'sponsors', n: '02', name: 'Sponsors Area', k: 'var(--pink)', a: [121, 166],
    text: 'Partner booths, product sampling and collab merch — the first world you walk into.',
    links: [['sponsors.html', 'Partners']] },
  { id: 'ip', n: '03', name: 'IP Experience Booths', k: 'var(--blue)', a: [70, 117],
    text: '20 IP booths in three layouts (A, B, C). Zoom in and tap a booth to see which IP it is.',
    links: [['exhibition.html#booths', 'All IP booths']] },
  { id: 'stage', n: '04', name: 'Crystal Stage', k: 'var(--night)', a: [44, 66],
    text: 'Cosplay Cup, Ani-Karaoke and stage shows, both days from 10:30.',
    links: [['#timetable', 'Timetable'], ['cosplay-cup.html', 'Cosplay Cup']] },
  { id: 'food', n: '05', name: 'Food Street', k: 'var(--cyan)', ink: true, a: [14, 40],
    text: 'Dotonbori-inspired stalls: takoyaki, yakisoba, onigiri, ramen and desserts.',
    links: [['join-us.html#booths', 'Food vendor booths']] },
  { id: 'exit', n: '06', name: 'Re-entry &amp; Exit', k: 'var(--ink)', a: [4, 12],
    text: 'Event Arc 2, Coral Wing side. Same-day re-entry with your wristband.',
    links: [['faq.html', 'Entry FAQ']] },
  { id: 'ballroom', n: '07', name: 'Way to Grand Ballroom', k: 'var(--yellow)', ink: true,
    text: 'Exit at Event Arc 2 and follow the signs along the Promenade — about a 5-minute walk to the Grand Ballroom (Connect).',
    links: [['#map-gb', 'Grand Ballroom map']] },
];

// booth slots across the IP band, left → right
const BOOTHS = [
  ...['Kagurabachi', 'Though I Am an Inept Villainess', 'Haikyu!!', 'One-Punch Man', "Frieren: Beyond Journey's End"].map((t, i) => [`A0${i + 1}`, t, 'A']),
  ...['DAN DA DAN', 'The Apothecary Diaries', 'Jujutsu Kaisen', 'Kaiju No. 8', 'Chainsaw Man', 'Blue Lock', 'Naruto', 'Demon Slayer', 'The Dangers in My Heart', 'To be announced'].map((t, i) => [`B${String(i + 1).padStart(2, '0')}`, t, 'B']),
  ...[1, 2, 3, 4, 5].map((i) => [`C0${i}`, 'To be announced', 'C']),
];
export { BOOTHS };

export function cpMapSVG() {
  const z = Object.fromEntries(ZONES.map((x) => [x.id, x]));
  const zoneSeg = (id, label, labelSize = 34) => {
    const { a, k, ink } = z[id];
    return `
      <g class="imap-zone" data-zone="${id}" tabindex="0" role="button" aria-label="${z[id].n} ${z[id].name.replace('&amp;', 'and')}" style="--zk:${k}">
        <path class="imap-zone__shape" d="${seg(a[0], a[1])}"/>
        <path id="lbl-${id}" d="${midArc(a[0], a[1])}" fill="none"/>
        ${label ? `<text class="imap-zone__label${ink ? ' is-ink' : ''}" font-size="${labelSize}" dy="${labelSize * 0.35}"><textPath href="#lbl-${id}" startOffset="50%" text-anchor="middle">${label}</textPath></text>` : ''}
      </g>`;
  };

  // IP booths
  const [ip0, ip1] = z.ip.a;
  const step = (ip1 - ip0) / BOOTHS.length;
  const booths = BOOTHS.map(([code, title, lay], i) => {
    const a1 = ip1 - i * step, a0 = a1 - step;
    const m = pt({ rx: OUT.rx - 26, ry: OUT.ry - 26 }, (a0 + a1) / 2);
    const mid = (a0 + a1) / 2;
    const rot = mid <= 90 ? -mid : 180 - mid;   // codes run along the radius, always readable
    return `<g class="imap-booth" data-booth="${code}" data-layout="${lay}" data-title="${title.replace(/"/g, '&quot;')}" tabindex="-1" role="button" aria-label="Booth ${code}: ${title.replace(/"/g, '&quot;')}">
          <path d="${seg(a0 + 0.12, a1 - 0.12, OUT, { rx: OUT.rx - 52, ry: OUT.ry - 52 })}"/>
          <text class="imap-fine" x="${m[0]}" y="${m[1]}" transform="rotate(${rot.toFixed(1)} ${m[0]} ${m[1]})">${code}</text>
        </g>`;
  }).join('');

  const marker = (id, x, y) => `<g class="imap-pin" data-zone="${id}" aria-hidden="true" transform="translate(${x} ${y})"><circle r="22" style="fill:${z[id].k}"/><text dy="7" class="${z[id].ink ? 'is-ink' : ''}">${z[id].n}</text></g>`;
  const mk = (id, ang) => { const p = pt(MID, ang); return marker(id, p[0], p[1]); };
  const e1 = pt(MID, 172), e2 = pt(MID, 8);

  return `
  <svg class="imap-svg" viewBox="0 0 1600 835" preserveAspectRatio="xMidYMid meet" role="group" aria-labelledby="cp-t cp-d">
    <title id="cp-t">Crystal Pavilion interactive floor map</title>
    <desc id="cp-d">The event concourse curves around The Fountain. From left to right: Main Entrance at Event Arc 1, Sponsors Area, IP Experience Booths, Crystal Stage, Food Street, and Re-entry and Exit at Event Arc 2. The way to the Grand Ballroom leaves from the bottom right.</desc>
    <defs>
      <pattern id="cp-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="currentColor" opacity=".08"/></pattern>
      <marker id="cp-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="var(--blue)"/></marker>
    </defs>
    <rect x="-300" y="-300" width="2200" height="1435" class="imap-bg"/>
    <rect x="-300" y="-300" width="2200" height="1435" fill="url(#cp-dots)"/>

    <!-- mall around the fountain (not part of the event) -->
    <path class="imap-mall" d="${seg(186, 354, { rx: 720, ry: 400 }, { rx: 520, ry: 250 })}"/>
    <text class="imap-muted" x="${C.x}" y="790" text-anchor="middle">CRYSTAL CORRIDOR · THE PROMENADE (mall shops open as usual)</text>

    <!-- fountain -->
    <ellipse class="imap-water" cx="${C.x - 10}" cy="${C.y - 10}" rx="${IN.rx - 40}" ry="${IN.ry - 45}"/>
    <text class="imap-water__t" x="${C.x - 10}" y="${C.y}" text-anchor="middle">THE FOUNTAIN</text>

    <!-- event concourse base + gaps -->
    <path class="imap-ring" d="${seg(2, 178)}"/>

    ${zoneSeg('sponsors', 'SPONSORS AREA')}
    <g class="imap-zone imap-zone--ip" data-zone="ip" tabindex="0" role="button" aria-label="03 IP Experience Booths" style="--zk:var(--blue)">
      <path class="imap-zone__shape" d="${seg(ip0, ip1)}"/>
      <path id="lbl-ip" d="${midArc(ip0, ip1, { rx: IN.rx + 26, ry: IN.ry + 26 })}" fill="none"/>
      <text class="imap-zone__label" font-size="30" dy="10"><textPath href="#lbl-ip" startOffset="50%" text-anchor="middle">IP BOOTHS</textPath></text>
      ${booths}
    </g>
    ${zoneSeg('stage', 'STAGE', 32)}
    ${zoneSeg('food', 'FOOD STREET', 28)}
    ${zoneSeg('entrance', '', 0)}
    ${zoneSeg('exit', '', 0)}

    <!-- visitor route -->
    <path class="imap-route" d="M60 520 C120 520 140 ${e1[1] + 40} ${e1[0] - 10} ${e1[1] + 10}" marker-end="url(#cp-arrow)"/>
    <path class="imap-route" d="M${e2[0] + 10} ${e2[1] + 20} C1500 520 1480 640 1500 760" marker-end="url(#cp-arrow)"/>

    <!-- facilities -->
    <g class="imap-fac" transform="translate(40 470)"><rect width="150" height="34" rx="8"/><text x="75" y="23" text-anchor="middle">Fountain Foyer drop-off</text></g>
    <g class="imap-fac imap-fac--p" transform="translate(200 470)"><rect width="34" height="34" rx="8"/><text x="17" y="24" text-anchor="middle">P</text></g>
    <g class="imap-fac imap-fac--p" transform="translate(1480 430)"><rect width="34" height="34" rx="8"/><text x="17" y="24" text-anchor="middle">P</text></g>

    <!-- Grand Ballroom pointer -->
    <g class="imap-zone imap-zone--sign" data-zone="ballroom" tabindex="0" role="button" aria-label="07 Way to Grand Ballroom" style="--zk:var(--yellow)">
      <rect class="imap-zone__shape" x="1380" y="770" width="210" height="52" rx="10"/>
      <text class="imap-zone__label is-ink" x="1485" y="804" text-anchor="middle" font-size="19">TO GRAND BALLROOM →</text>
    </g>

    <!-- numbered pins -->
    ${marker('entrance', e1[0] - 6, e1[1] - 4)}
    ${mk('sponsors', 143.5)}
    ${mk('ip', 112)}
    ${mk('stage', 55)}
    ${mk('food', 27)}
    ${marker('exit', e2[0] + 6, e2[1] - 4)}
    ${marker('ballroom', 1356, 796)}
    <text class="imap-tag" x="${e1[0] + 30}" y="${e1[1] + 64}">EVENT ARC 1</text>
    <text class="imap-tag" x="${e2[0] - 150}" y="${e2[1] + 64}">EVENT ARC 2</text>
  </svg>`;
}

export function cpMapBlock() {
  const legend = ZONES.map((x) => `<li><button type="button" data-zone="${x.id}" aria-pressed="false"><span class="legend__key${x.ink ? ' legend__key--ink' : ''}" style="--k: ${x.k}">${x.n}</span>${x.name}</button></li>`).join('\n                  ');
  const data = Object.fromEntries(ZONES.map((x) => [x.id, { n: x.n, name: x.name, text: x.text, links: x.links }]));
  return `
            <div class="imap" data-imap>
              <div class="imap__stage">
                ${cpMapSVG()}
                <div class="imap__controls" role="group" aria-label="Map zoom">
                  <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
                  <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
                  <button type="button" data-zoom="reset" aria-label="Show whole map">⤢</button>
                </div>
                <p class="imap__hint" aria-hidden="true"><span class="only-touch">Tap a zone · pinch or +/− to zoom</span><span class="only-mouse">Click a zone · drag to move · Ctrl + scroll to zoom</span></p>
              </div>
              <div class="imap__side">
                <div class="imap__info" aria-live="polite">
                  <p class="imap__kicker">Crystal Pavilion · Discover</p>
                  <h3 class="imap__title">Tap any zone on the map</h3>
                  <p class="imap__text">See what's there and how to get to it. Zoom into the IP Booths to find a specific booth.</p>
                  <p class="imap__links"></p>
                </div>
                <ol class="legend imap__legend">
                  ${legend}
                </ol>
              </div>
              <script type="application/json" class="imap-data">${JSON.stringify(data)}</script>
            </div>`;
}
