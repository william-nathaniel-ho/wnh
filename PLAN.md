# WNH — Design & Production
## Rebuild plan: architecture, flow, content model, design system

Replaces `wailapho.wixsite.com/mysite`.
Positioning: **studio front, director voice** — WNH presents as a production house; Will Ho is the credited director.
Stack: **static HTML on GitHub Pages + Cloudinary for all media + one `content.json` + a private `admin.html` editor.**
No frameworks, no build step, no runtime dependencies beyond Google Fonts.

---

## 1. The core idea

The Wix site was a grid of images with no words. That is a *gallery*. A production house site is a **catalogue**: every piece of work has a client, a year, a discipline, a role, a credit list and a result. That metadata is what makes a site read as professional — more than any animation.

So the whole build is organised around one object: **the project record**. Everything else — the home index, the filters, the case study page, the OG cards — is a different view of the same records.

That is why content lives in `content.json`, not in markup. Add a record, and it appears on the home index, the work index, the filters, the related-projects rail, and gets its own case-study URL. You never touch layout again.

---

## 2. Sitemap

```
/                        Home            index.html
/work/                   Work index      work/index.html          (filter by discipline / year / client)
/work/case.html?p=slug   Case study      work/case.html           (one template, all projects)
/studio/                 Studio          studio/index.html        (director voice, capabilities, process, credits, contact)
/contact/                Contact         contact/index.html       (brief form → Formspree or Apps Script)
/admin/                  Editor          admin/index.html         (private, noindex — form → exports content.json)

/content.json            All site copy + media references
/assets/                 Only fonts/favicon/logo. No project media — that all lives on Cloudinary.
```

Deliberately **five public pages**. A studio site loses to over-navigation, not under-navigation. Work is the product; everything else supports it.

### Optional later: static case-study URLs
`?p=slug` is shareable but weak for SEO. When you want `/work/acker-brand-film/` proper, run a 20-line Node script (`build.js`) locally that reads `content.json` and stamps a folder + `index.html` per project with correct `<title>` and OG tags. Same template, pre-rendered meta. Not needed for launch.

---

## 3. User flows

**Flow A — the client who was sent a link (80% of traffic).**
Lands on home → showreel plays muted, autoplay, 12s loop → scrolls → hits the numbered work index → hovers a row, sees the image → clicks one project → reads the case study → hits "Start a project" at the bottom of the case study. *The contact CTA sits at the end of every case study, not just on /contact. That is the conversion point.*

**Flow B — the recruiter / creative director.**
Home → Studio → wants three things fast: what disciplines, who you've worked with, who you are. The Studio page answers in that order, with the director byline and portrait at the bottom, not the top.

**Flow C — you, adding a project.**
Open `/admin/` locally → fill the form (drag order of blocks, paste Cloudinary public IDs) → **Export JSON** → paste into `content.json` in GitHub's web editor → commit. Live in ~40 seconds. No HTML touched, layout cannot break.

---

## 4. Content model — `content.json`

```jsonc
{
  "site": {
    "name": "WNH",
    "full": "WNH — Design & Production",
    "director": "Will Ho",
    "tagline": "Independent design and production studio.",
    "locations": ["Perth", "Hong Kong"],
    "email": "hello@wnh.design",
    "reel": { "video": "wnh/reel_2026", "poster": "wnh/reel_2026_poster" },
    "social": [{ "label": "Instagram", "url": "..." }]
  },

  "capabilities": [
    { "id": "brand",  "title": "Brand & Identity", "summary": "…", "items": ["Naming", "Identity systems", "Guidelines"] }
  ],

  "process": [
    { "step": "01", "title": "Brief", "body": "…" }
  ],

  "clients": ["Acker Merrall & Condit", "Compass Offices", "iMACE"],

  "projects": [
    {
      "slug": "acker-brand-film",
      "title": "The Cellar Sessions",
      "client": "Acker Merrall & Condit",
      "year": 2025,
      "disciplines": ["Film", "Motion", "Brand"],
      "role": "Director, Editor",
      "featured": true,
      "summary": "One line that says what the work was and why it worked.",
      "cover": { "src": "wnh/acker_cover", "alt": "…", "ratio": "4x5" },
      "credits": [{ "role": "Direction", "name": "Will Ho" }],
      "blocks": [
        { "type": "video",  "src": "wnh/acker_film", "poster": "wnh/acker_poster", "caption": "60s brand film" },
        { "type": "text",   "heading": "The problem", "body": "…" },
        { "type": "image",  "src": "wnh/acker_01", "alt": "…", "size": "full" },
        { "type": "images", "items": [{ "src": "…", "alt": "…" }, { "src": "…", "alt": "…" }] },
        { "type": "quote",  "text": "…", "attribution": "Name, Title" },
        { "type": "stats",  "items": [{ "value": "+180%", "label": "Watch-through" }] }
      ]
    }
  ]
}
```

**Rules that keep it clean**

- `src` is always a **Cloudinary public ID**, never a full URL. The site builds the URL, so you can change transformation strategy globally in one line.
- `slug` is the permanent ID. Never rename it once shared — it's the URL.
- `featured: true` promotes a project to the home index. Home shows featured only; `/work/` shows everything.
- `disciplines` drive the filter chips automatically. Add a new discipline, a new chip appears.
- Block types are a closed set. If you need a new layout, we add a block type once — not a new page.

---

## 5. Cloudinary convention

**Folder structure** — `wnh/<slug>/` per project, so the media library mirrors the site.
```
wnh/acker-brand-film/cover
wnh/acker-brand-film/01
wnh/acker-brand-film/film
```

**URLs are generated, never pasted.** The site includes a `cld()` helper:

```js
CLOUD = "your-cloud-name";
img(id, w)  → https://res.cloudinary.com/CLOUD/image/upload/f_auto,q_auto,c_limit,w_{w}/{id}
srcset(id)  → 640w, 960w, 1440w, 1920w, 2560w
video(id)   → .../video/upload/f_auto,q_auto,vc_auto/{id}.mp4
poster(id)  → .../video/upload/so_1,f_auto,q_auto,w_1600/{id}.jpg
```

Why this matters: `f_auto,q_auto` alone gives you AVIF/WebP and per-image quality tuning for free. With `srcset`, a phone never downloads a 2560px hero. That is most of your performance budget solved with a string.

**Upload settings**: images as originals (Cloudinary downsizes), video uploaded once at 1080p — request `vc_auto`. Set an unsigned upload preset if you later want `admin.html` to upload directly.

---

## 6. Hosting — Cloudflare Pages

GitHub Pages cannot check a password, so `/admin` moved the hosting to
**Cloudflare Pages**: same repo, same git workflow, still free and static, plus
server-side Functions for the login and the GitHub commit.

```
repo:    github.com/YOU/wnhdesign        (private is fine)
host:    Cloudflare Pages, build output "/", no build command
domain:  wnhdesign.io
secrets: ADMIN_PASSWORD · SESSION_SECRET · GITHUB_TOKEN · GITHUB_REPO
         GITHUB_BRANCH · CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET / _FOLDER
```

The browser never holds a credential. `/admin` posts a password to a Function,
gets back an HMAC-signed cookie, and every later call is checked against that
signature. Uploads are signed server-side and then go browser → Cloudinary
directly, so the file never passes through the worker.

Full click-by-click in **SETUP.md**.


---

## 7. Design system — "Editorial Brutal"

The reasoning: for a production house, the *work* has to be the loudest thing on screen. So the interface is near-monochrome, structural, and typographically severe — it frames the work rather than competing with it. The monospace metadata layer (indices, timecode, disciplines) is what signals "production", not decoration.

### Colour

| Token | Value | Use |
|---|---|---|
| `--ink` | `#08090A` | Page ground |
| `--ink-2` | `#101113` | Raised surfaces, cards |
| `--paper` | `#EDEBE6` | Primary text, inverted sections |
| `--muted` | `#9A9A94` | Metadata, captions — 5.6:1 on ink |
| `--accent` | `#FF4326` | Signal red. Index numerals, REC dot, links, hover — 5.7:1 on ink |
| `--line` | `rgba(237,235,230,.14)` | Hairlines, the grid made visible |

One accent. It appears maybe eight times per page. That restraint is what reads expensive.

### Type

- **Display — Archivo** (variable, 400–900). Set at 800–900, `letter-spacing: -0.04em`, `line-height: 0.85`. Headlines are set tight enough to become shapes.
- **Mono — IBM Plex Mono** 400/500. All metadata: indices, years, disciplines, timecode, labels. `0.6875rem`, `letter-spacing: .16em`, uppercase.
- **Editorial — Instrument Serif** italic. Used *only* for the director voice — the manifesto line, pull quotes, the byline. This is the "hybrid" made visible: the studio speaks in grotesk, Will speaks in serif.

Scale: `clamp(3.5rem, 11vw, 11rem)` display / `clamp(2rem, 5vw, 4rem)` section / `1.0625rem × 1.65` body, capped at 62ch.

### Grid & space

12 columns, 24px gutter, `max-width: 1680px`, page padding `clamp(20px, 4vw, 64px)`.
Spacing scale: `8 / 16 / 24 / 40 / 64 / 96 / 144 / 208`. Sections breathe at 144–208 on desktop.

### Motion

- Reveals: `IntersectionObserver`, `translateY(24px) + opacity`, 700ms, `cubic-bezier(.16,1,.3,1)`, staggered 60ms. Fires once.
- Work rows: cursor-following image preview on desktop, lerped at 0.14 — the single "wow" moment, and it's also useful.
- Timecode: `REC` counter driven by scroll position. A nod to your scroll-world work; costs nothing.
- Marquee: pure CSS translate, paused on hover.
- `prefers-reduced-motion: reduce` kills all of it and shows final states. Non-negotiable.

Only `transform` and `opacity` are ever animated.

### Accessibility floors

Contrast ≥ 4.5:1 for all text (checked, listed above) · focus rings visible and never removed · touch targets ≥ 44px · no hover-only information (mobile rows carry thumbnails) · `alt` on every image, sourced from `content.json` · video muted + `playsinline`, with a poster reserving aspect ratio so CLS stays ~0.

---

## 8. Page-by-page

**Home** — Nav / Hero showreel + oversized title + REC metadata / Manifesto in serif / **Selected Work index** (numbered rows, hover preview) / Capabilities / Process / Clients marquee / Studio strip / Contact CTA / Footer.

**Work index** — Same row system, all projects, filter chips generated from `disciplines`, plus a grid/list toggle. Filters update the URL (`?d=film`) so a filtered view is shareable.

**Case study** — Hero: title + client + year + role + disciplines in a metadata table. Then the `blocks` array renders in order. Then credits, then next-project link, then the contact CTA. One template, infinite projects.

**Studio** — Capabilities in full, process, client list, then the director section: portrait, serif bio in first person, availability line.

**Contact** — Short. Email as a huge type link, a three-field brief form, response-time expectation, locations and time zones.

**Admin** — Form for every field in the schema, block builder with reorder, live JSON preview, Copy / Download buttons.

---

## 9. Build order

1. ✅ `index.html` — homepage, working, JSON-driven *(this pass)*
2. `content.json` — seeded with real projects *(this pass)*
3. `work/index.html` — reuses the row + filter components
4. `work/case.html` — the block renderer
5. `studio/`, `contact/`
6. `admin/index.html`
7. Cloudinary upload of real assets + swap `CLOUD_NAME`
8. Domain, OG images, `sitemap.xml`, Plausible or GA

---

## 10. What you do next

1. Create the Cloudinary account, note the **cloud name**, upload the showreel to `wnh/reel_2026`.
2. Set `CLOUD_NAME` at the top of `index.html`.
3. Decide the real domain and studio name (WNH is the placeholder used throughout).
4. Send me your project list — client, title, year, discipline, one-line summary each — and I'll write `content.json` properly.
