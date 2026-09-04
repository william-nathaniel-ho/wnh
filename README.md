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
assets/fonts/           Geist variable, self-hosted, 29KB
assets/logo.svg         The WNH mark

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

## Paths

Nothing is hard-coded to a domain. `assets/js/site.js` works out the site root
from its own `src`, and everything — `content.json`, internal links, the API —
is resolved against that. So the same files work at `wnhdesign.io/` and at
`user.github.io/wnh/` with no build flag. Font URLs inside `site.css` are
relative to the stylesheet, which resolves correctly at any depth.

`404.html` is deliberately self-contained (its own inline CSS, no JS dependency)
because a 404 is served for missing paths at any depth, where relative asset
links would resolve differently every time.

Keep `.nojekyll` in the repo root or GitHub Pages will run Jekyll and drop
underscore-prefixed files.

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

Warm paper `#F1F0EC`, white cards, near-black `#0B0D14` with a blue cast, one
red used sparingly — `#FF4326` for marks and fills, `#C4321B` where the same
red has to carry small text on a light ground and clear 4.5:1.

**One typeface: Geist.** No mono, no serif, no ampersand substitution. Micro
labels are the same family, uppercase and tracked. Tokens are semantic
(`--bg` / `--surface` / `--text`) so the editor inherits the theme rather than
carrying its own.

Layout devices: a paper panel riding over full-bleed hero media; a six-column
bento whose span pattern has period six so rows always fill; dark panels as
contrast breaks; pills for every control. All text pairs pass WCAG AA. Motion
is disabled wholesale under `prefers-reduced-motion`.
