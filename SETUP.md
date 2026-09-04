# WNH — setup, step by step

Three services. GitHub stores the code, Cloudflare serves it and runs the login,
Cloudinary stores the images. Roughly 30 minutes end to end.

You never touch HTML after this. Everything is edited at `wnhdesign.io/admin`.

---

## How it fits together

```
        you at /admin
              |
    password  |  (checked server-side, never in the browser)
              v
    Cloudflare Pages Function
       |                  \
       |  commits          \  signs the upload
       v                    v
   GitHub repo          Cloudinary
   (content.json)       (images + video files)
       |
       |  push triggers a rebuild
       v
   wnhdesign.io  ← live in ~60 seconds
```

Your GitHub token and Cloudinary secret live as Cloudflare environment variables.
The browser never receives them. That is the whole reason we are not on GitHub Pages.

---

## Step 1 — GitHub (5 min)

1. **github.com → New repository**
   - Name: `wnhdesign`
   - **Private** is fine — Cloudflare can read a private repo.
   - Do not add a README (the zip already has one).
2. Upload the contents of the zip to the repo root. Either drag the files into
   GitHub's web uploader, or:
   ```bash
   cd wnh
   git init && git add . && git commit -m "WNH site"
   git branch -M main
   git remote add origin https://github.com/YOURNAME/wnhdesign.git
   git push -u origin main
   ```
   The root of the repo must contain `index.html`, `content.json`, `functions/`, `assets/`.

3. **Create the token Cloudflare will use to commit your edits.**
   - github.com → your avatar → **Settings** → **Developer settings**
     → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
   - Token name: `wnh-admin`
   - Expiration: 1 year (put a reminder in your calendar — it will stop working silently otherwise)
   - **Repository access** → *Only select repositories* → `wnhdesign`
   - **Permissions** → *Repository permissions* → **Contents: Read and write**
     (Metadata read-only gets added automatically. Nothing else is needed.)
   - Generate, then **copy the token now** — GitHub shows it once.
   - Paste it somewhere temporary. It goes into Cloudflare in step 3 and then you can delete your copy.

---

## Step 2 — Cloudinary (5 min)

1. Sign up at cloudinary.com (the free tier is far more than this site needs).
2. On the dashboard, note three values:
   - **Cloud name**
   - **API Key**
   - **API Secret** (click to reveal)
3. That's it. **You do not need an upload preset** — uploads from `/admin` are
   signed server-side, which is more secure than the unsigned-preset approach.

**Folder convention.** The editor puts each project's files in
`wnh/<project-slug>/` automatically, so your Cloudinary media library ends up
mirroring your site. Don't rename folders by hand — the site stores the public
ID, and renaming breaks the link.

**What to upload where:**

| Asset | Where |
|---|---|
| Stills, screenshots, artwork | Cloudinary, via `/admin` |
| Anything moving | **Vimeo** — paste the link into a Vimeo block |
| The showreel | **Vimeo** — Site tab → Showreel |

Video on Cloudinary is supported, but Vimeo is the better home for it: better
player, better compression, no bandwidth billing surprises.

---

## Step 3 — Cloudflare Pages (10 min)

1. **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages**
   → **Connect to Git** → authorise GitHub → pick `wnhdesign`.
2. Build settings:
   - Framework preset: **None**
   - Build command: **leave empty**
   - Build output directory: **`/`**
   - Root directory: **leave empty**
3. **Save and Deploy.** You'll get a `something.pages.dev` URL. The site will
   load; `/admin` will say the backend isn't reachable, because the secrets
   aren't set yet.

4. **Settings → Environment variables → Production** — add these, and click
   **Encrypt** on every one of them:

   | Name | Value |
   |---|---|
   | `ADMIN_PASSWORD` | a password you choose — long, and not one you use elsewhere |
   | `SESSION_SECRET` | a long random string (see below) |
   | `GITHUB_TOKEN` | the fine-grained token from step 1 |
   | `GITHUB_REPO` | `YOURNAME/wnhdesign` |
   | `GITHUB_BRANCH` | `main` |
   | `CLOUDINARY_CLOUD_NAME` | your cloud name |
   | `CLOUDINARY_API_KEY` | your API key |
   | `CLOUDINARY_API_SECRET` | your API secret |
   | `CLOUDINARY_FOLDER` | `wnh` |

   For `SESSION_SECRET`, run this in a terminal and paste the output:
   ```bash
   openssl rand -base64 32
   ```
   It signs your login cookie. Changing it later just signs everyone out.

5. **Redeploy** — environment variables only apply to a new build.
   Deployments → the latest one → **Retry deployment**.

6. **Custom domain.** Buy `wnhdesign.io` through **Cloudflare Registrar** if you
   can — DNS then configures itself. Then:
   Your Pages project → **Custom domains** → **Set up a custom domain**
   → `wnhdesign.io`, and again for `www.wnhdesign.io`.
   If the domain is registered elsewhere, Cloudflare tells you the two
   nameservers to point at it. Propagation is usually under an hour.

---

## Step 4 — first publish (2 min)

1. Go to `wnhdesign.io/admin`, sign in with `ADMIN_PASSWORD`.
2. **Site** tab → paste your **Cloudinary cloud name**. This is the one value
   that makes every image on the site start working.
3. **Site** tab → paste your **showreel Vimeo URL**.
4. Hit **Publish**.
5. Watch Cloudflare → Deployments. A new build appears within seconds and goes
   live in about a minute.

If Publish fails:

| Message | Cause |
|---|---|
| `Not signed in` | Cookie expired. Reload and sign in again. |
| `Missing environment variable(s): …` | That variable isn't set, or you didn't redeploy after adding it. |
| `GitHub write failed (403)` | Token lacks **Contents: Read and write**, or has expired. |
| `GitHub write failed (404)` | `GITHUB_REPO` is wrong — it must be `owner/repo`, no URL. |
| `This file changed since you loaded it` | You have the editor open in two tabs, or edited the file on GitHub. Reload the editor. |

**Download JSON** is your escape hatch. If Cloudflare or GitHub is having a bad
day, export the file and paste it into `content.json` on GitHub by hand. You
never lose work to a broken service.

---

## Day-to-day: adding a project

1. `/admin` → **Projects** → **+ New project**
2. Fill in title, client, year, disciplines (one per line — these generate the
   filter chips automatically), role and a one-line summary.
3. Set the **URL slug**. This is permanent — it is the URL. Changing it later
   breaks any link you already sent someone.
4. Drop in a **cover image**. It uploads to Cloudinary and fills the field.
5. Add **case study blocks** in the order you want them down the page:

   | Block | Use it for |
   |---|---|
   | `text` | Heading plus paragraphs. Leave a blank line between paragraphs. |
   | `image` | One image, full-bleed or contained |
   | `images` | A row of two or three |
   | `vimeo` | Anything moving — paste the Vimeo link |
   | `video` | An MP4 on Cloudinary, if you'd rather not use Vimeo |
   | `quote` | A pull quote |
   | `stats` | A row of numbers and labels |

6. Tick **Homepage index** to show it on the front page, **/portfolio deep dive**
   to give it a full write-up on your job-application page.
7. **Publish.**

**The rolling client names** are their own tab — "Rolling names". One name per
line; the list is duplicated automatically so the loop is seamless.

---

## The pages you have

| URL | What it is |
|---|---|
| `/` | Studio homepage — reel, work index, capabilities, process, clients, contact |
| `/work/` | Every project, filterable by discipline, list or grid |
| `/work/case.html?p=slug` | One case study, built from the blocks |
| `/portfolio/` | **Your job-application page.** Not in the nav, not in search — you send this URL directly. Reel, statement, deep dives, a filterable wall of everything, capabilities and toolkit. |
| `/admin/` | The editor |

`/portfolio` and `/admin` both carry `noindex` and are excluded in `robots.txt`,
so neither turns up in a search for the studio.

---

## Two things worth knowing

**Case study URLs use a query string** (`?p=acker-social-system`) rather than
`/work/acker-social-system/`. That is the trade for having one template serve
infinite projects with no build step. Links work and share fine; it is only
slightly weaker for search. When it matters, a 20-line script can pre-render
one folder per project from `content.json` — worth doing once the work is real.

**Rotate the GitHub token when it expires.** Generate a new one, update
`GITHUB_TOKEN` in Cloudflare, redeploy. Nothing else changes. If a token ever
leaks, revoking it on GitHub immediately kills any access it had — which is the
main reason it lives on the server rather than in your browser.
