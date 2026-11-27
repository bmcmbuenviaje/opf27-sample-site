# Otaku Pop Fes 2027 — sample site

Clickable sample of the OPF 2027 website redesign (proposal KV), by Mineski Global for CyberE.
Content, prices and schedules are placeholders. All pages are `noindex`.

- Pages: Home, Exhibition, Cosplay Cup, Music Live, Schedule & Map, Tickets, News, Article, Access, FAQ, Join Us, Sponsors, Contact, Past Events, Legal.
- **Sample controls** (bottom-left on every page): switch the site phase (Announce / On sale / Event week / Post-event) and preview other palettes.
- **Interactive map** (Schedule & Map → Crystal Pavilion): tap a zone to zoom and see what's there; pinch / +/− to zoom; tap a title in the IP lineup to find its booth. Zones and booths live in `src/cp-map.mjs`.
- **Landing page samples:** `lp-ticket-drop.html` (A — dark, urgent, single action) and `lp-cosplay-cup.html` (B — light, editorial, long form). Minimal header, no main menu (`"layout": "landing"` in the page meta).
- **Home pop-up:** shows once after the cookie choice — 7 s, half-page scroll or exit intent; capped to once per 3 days (`assets/js/popup.js`).
- **Cookie consent + analytics:** Accept all / Accept necessary / Deny all, plus Cookie settings in every footer (`assets/js/consent.js`). Analytics (PostHog) loads only after consent — paste the project key at the top of `consent.js`. CTAs with `data-track="…"` send named events.
- **Motion layer** (`assets/css/motion.css`, `assets/js/motion.js`): scroll reveals, drifting section titles, hero parallax, count-up stats, 3D tilt cards, sparkle bursts on main buttons, floating mascots, scroll progress bar, home marquee and smooth page transitions. All off for visitors with reduced-motion turned on.
- **Merch** (`merch.html`, `assets/js/merch.js`): follows the site phase — preview (Announce) → pre-order shop (On sale) → Scan to Order web app (Event week) → thank-you (Post). Pay now with Slash (simulated hand-off) or reserve and pay at pickup. Paid pre-orders are held until June 6 closing, then get a June 7 delivery email (`merch-delivery.html`); unpaid reservations are held until June 5, 15:00. Shelf QR tags: `merch-tags.html` (each opens `merch.html?sku=…`).
- **Merch reminder pop-up** (`assets/js/merch-nudge.js`): pre-order phase only. After a visitor browses Merch and leaves without ordering, it shows once on another page — "Your bag is waiting" if the bag has items, otherwise "Didn't find what you're looking for? Shoot us a message…" with a request form.
- **Landing page C — merch pre-order:** `lp-merch-preorder.html`; "Pre-order" buttons open the Merch bag with the item added (`merch.html?add=SKU&size=…`).
- **Saved bag:** kept across visits when the visitor allowed preference cookies; otherwise for the current visit.
- **My orders** (`orders.html`, `assets/js/orders.js`): no-password sign-in — "Continue with Google" or a one-time email link (both simulated here). Shows orders matched by email (guest orders included), pickup passes, "Pay now with Slash" for reservations, delivery options for paid orders, and the saved bag. Checkout prefills for signed-in visitors and offers sign-in without forcing it.
- Swapping in the approved KV: see [KV-SWAP.md](KV-SWAP.md).

Build: `node src/build.mjs` (page fragments in `src/pages/`, shared header/footer in `src/build.mjs`).
