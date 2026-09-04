# WNH — wnhdesign.io

Static site, no framework, no build step. Content lives in one JSON file and is
edited through a password-protected `/admin`.

**Read `SETUP.md` first** — it walks through GitHub, Cloudinary and Cloudflare
in order.

```
index.html              Studio homepage
work/index.html         Work index — discipline filters, list/grid
work/case.html          Case study template (?p=slug)
portfolio/index.html    Job-application page — noindex, sent by link only
admin/index.html        The editor
404.html

content.json            All copy + media references. The single source of truth.
assets/css/site.css     The whole design system
assets/js/site.js       Shared runtime: nav, footer, Cloudinary, Vimeo, reveals
assets/fonts/           Self-hosted woff2, 121KB, latin subsets

functions/_shared.js    Session signing, env guards
functions/api/          login · logout · session · save · upload-signature

_headers                noindex on /admin and /portfolio, caching, security
_routes.json            Only /api/* invokes a Function; everything else is static
robots.txt · sitemap.xml
```

## How content flows

`content.json` is fetched at runtime by every page. Add a project record and it
appears on the homepage index, the work index, the filter chips, the portfolio
wall and the related-project link, and gets its own case-study URL. No markup
changes, ever.

Media references are **Cloudinary public IDs**, never URLs — the site builds the
URL with `f_auto,q_auto` and a five-width `srcset`, so delivery strategy is one
line, not a thousand hand-written links. Anything moving is a **Vimeo link**.

## Local preview

The pages fetch `/content.json` from the site root, so opening the files
directly off disk won't work. Serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

`/admin` needs the Functions, so it only works on Cloudflare (or via
`npx wrangler pages dev .` with the environment variables set locally).

## Design system

Near-black `#08090A`, bone `#EDEBE6`, one signal red `#FF4326` used sparingly.
Archivo for display, IBM Plex Mono for all metadata, Instrument Serif italic
for the studio's own voice. Every ampersand is swapped to a plain one, which is why
`.amp` exists. All text pairs pass WCAG AA. Motion is disabled wholesale under
`prefers-reduced-motion`.
