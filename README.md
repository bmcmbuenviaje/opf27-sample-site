# Otaku Pop Fes 2027 — sample site

Clickable sample of the OPF 2027 website redesign (proposal KV), by Mineski Global for CyberE.
Content, prices and schedules are placeholders. All pages are `noindex`.

- Pages: Home, Exhibition, Cosplay Cup, Music Live, Schedule & Map, Tickets, News, Article, Access, FAQ, Join Us, Sponsors, Contact, Past Events, Legal.
- **Sample controls** (bottom-left on every page): switch the site phase (Announce / On sale / Event week / Post-event) and preview other palettes.
- **Interactive map** (Schedule & Map → Crystal Pavilion): tap a zone to zoom and see what's there; pinch / +/− to zoom; tap a title in the IP lineup to find its booth. Zones and booths live in `src/cp-map.mjs`.
- **Landing page samples:** `lp-ticket-drop.html` (A — dark, urgent, single action) and `lp-cosplay-cup.html` (B — light, editorial, long form). Minimal header, no main menu (`"layout": "landing"` in the page meta).
- **Home pop-up:** shows once after the cookie choice — 7 s, half-page scroll or exit intent; capped to once per 3 days (`assets/js/popup.js`).
- **Cookie consent + analytics:** Accept all / Accept necessary / Deny all, plus Cookie settings in every footer (`assets/js/consent.js`). Analytics (PostHog) loads only after consent — paste the project key at the top of `consent.js`. CTAs with `data-track="…"` send named events.
- Swapping in the approved KV: see [KV-SWAP.md](KV-SWAP.md).

Build: `node src/build.mjs` (page fragments in `src/pages/`, shared header/footer in `src/build.mjs`).
