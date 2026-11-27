# OPF 2027 sample site — how to swap in the approved KV

The sample site uses the **proposal KV** (concept demo). When CyberE approves the final KV, update three things. The page HTML stays the same.

## 1. Colours and fonts — one file

Edit `assets/css/tokens.css`. Every colour on every page comes from these values:

| Token | Now | Used for |
|---|---|---|
| `--opf-brand-isekai-blue` | `#0031DB` | Header bands, buttons, halftone frames, headings |
| `--opf-brand-pop-yellow` | `#FCFD40` | Highlights on blue, countdown numbers |
| `--opf-brand-sakura-pink` | `#FC3D92` | Accent fills, Buy Tickets, badges |
| `--opf-brand-sakura-deep` | `#D6246F` | Pink with white text (accessible) |
| `--opf-brand-portal-cyan` | `#22B7FD` | Cove Manila, accents |
| `--opf-neutral-night` | `#07103F` | Footer, VIP cards, dark heroes |
| `--opf-font-display` | Akira Expanded → Archivo | Big outlined titles |
| `--opf-font-body` | Montserrat | All other text |

New font? Add its Google Fonts link (or `@font-face` for a licensed font) in `src/build.mjs`, in the `<head>` part of `page()`.

**Preview without editing:** open any page → **Sample controls** (bottom left) → palette swatches. They swap these same tokens live.

## 2. Images — same file names

Replace the files in `assets/img/`, keeping the names:

| File | Where it shows |
|---|---|
| `kv-main.jpg` | Home hero, default inner-page hero |
| `logo.png`, `logo-stacked.webp`, `favicon.png`, `apple-touch-icon.png` | Header, footer, browser tab |
| `kv-crowd.jpg`, `join-hero.jpg` | Ticket, news, FAQ, contact, Join Us heroes |
| `mascot-*.webp`, `chibi-*.webp` | Mascots on heroes and promo boxes |
| `stamp-*-white.webp` | Zone card stamps |
| `zone-*.jpg`, `stage-*.jpg`, `news-*.jpg`, `booth-*.jpg` | Photos (replace as real ones arrive) |

## 3. Hero layout (only if the new KV is composed differently)

If the new key art puts the character on the other side, or needs a different crop, adjust `.hero` / `.join-hero__mascot` in `assets/css/styles.css`. Expect about half a day.

## Rebuild and publish

```
node src/build.mjs
git add -A && git commit -m "Apply approved KV" && git push
```

GitHub Pages updates in 1–2 minutes (hard-refresh to skip the cache).
