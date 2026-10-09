# Ghosted

A calm, private job application tracker. Add applications, see when it's time to follow up, send a
ready-made message, and keep your momentum with gentle progress tracking.

- **Private by design.** No account, no server, no tracking. Everything is saved in your browser (`localStorage`).
- **Plain HTML, CSS and JavaScript.** No framework, no runtime dependencies, no build step needed to run it.
- **Works offline** and can be installed to the home screen (PWA).
- **Free to host** on GitHub Pages or Cloudflare Pages.

## What it does

| Area | Details |
| --- | --- |
| Applications | Company, role, date applied. Statuses: Applied, Interview, Offer, Rejected. Filter by status, remove with Undo. |
| Follow-up | A card shows **Follow-up due** when 7+ days have passed with no follow-up. The **Follow up** button opens a dialog with 3 templates, an editable message, **Copy**, and **Mark as sent**. Nothing is sent for you. |
| Progress | Points (add +10, follow-up +25, interview +50, offer +200, rejection logged +5), a level every 100 points, a forgiving streak, a weekly goal bar, a tip of the day (unlocked after 3 actions), and 12 badges. |
| Tone | Encouraging only. No penalties, no shame copy. Points and badges are never taken away. |

### Rules worth knowing

- **Follow-up due** counts from the latest of: the date applied, the last follow-up marked as sent, or the day the card moved to Interview. Only Applied and Interview cards can be due.
- **Streak.** A streak counts days with at least one action. Up to 2 days without an action are fine (actions 3 days apart keep it going). After that it starts fresh, and your best streak is kept.
- **No farming.** Interview, offer and rejection points are awarded once per application. Follow-up points are awarded once per application per day.
- **Weekly goal** counts every action, Monday to Sunday. The default is 5 and you can change it on the Progress tab.

## Run it locally

You need Node 20+ (only for tests and the build; the app itself needs nothing).

```bash
npm run serve        # http://localhost:8080  (needs: npm i -g http-server, or use any static server)
npm test             # unit tests (Node's built-in test runner, no dependencies)
npm run build        # copies the site to dist/ and stamps the offline cache id
```

Browser tests (optional) use Playwright and Chromium, which are not project dependencies:

```bash
NODE_PATH=$(npm root -g) npm run e2e
# test the production build under a GitHub Pages style sub-path:
npm run build && SITE_ROOT=dist BASE_PATH=/Idea-1/ NODE_PATH=$(npm root -g) npm run e2e
```

Service workers only run on `https://` or `http://localhost`, so open the app through a server, not as a `file://` page.

## Deploy

All paths in the app are relative, so it works at a domain root or under a sub-path such as `/Idea-1/`.

> **Important:** always deploy the output of `node tools/build.mjs` (the `dist/` folder), not the raw
> repository. The build stamps `sw.js` with the commit id. Without it the offline cache never refreshes,
> and visitors could keep seeing an old version.

### Option A: GitHub Pages (workflow included)

1. Merge this work into your default branch (the workflow runs on pushes to `main`).
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow from the **Actions** tab). `.github/workflows/pages.yml` runs the tests, builds, and deploys.
4. Your site appears at `https://<user>.github.io/<repo>/`.

### Option B: Cloudflare Pages

1. In Cloudflare, go to **Workers & Pages → Create → Pages → Connect to Git** and choose the repository.
2. Build command: `node tools/build.mjs`. Build output directory: `dist`.
3. Add an environment variable `SITE_URL` with your final address, for example `https://ghosted.pages.dev/`.
   This rewrites the share-link and canonical URLs in the page.

### Before you share the link

The page's share tags (`og:url`, `og:image`, `canonical`) point to `https://dario6666-bos.github.io/Idea-1/`.
If your site lives somewhere else, either set `SITE_URL` when building (see above) or search and replace that
address in `index.html`. Social networks need the absolute address to show the preview image.

## Project layout

```
index.html, styles.css      page and styles (light/dark, reduced motion)
js/core.js                  application model and follow-up rules
js/progress.js, tips.js     points, levels, streak, goal, badges, tips (pure logic)
js/templates.js             free follow-up message templates
js/store.js                 localStorage with validation and recovery
js/app.js, progress-view.js interface
sw.js, manifest.webmanifest offline support and install
fonts/                      Inter and Source Serif 4, self-hosted (SIL Open Font License)
icons/                      app icons and share image (original artwork)
tools/build.mjs             build for deployment
tools/make-assets.mjs       regenerates PNG icons and share image from the SVGs
test/, e2e/                 unit tests and browser tests
```

## Your data

Data lives only in your browser under the key `ghosted:v1`. Clearing site data deletes it, and it does not
sync between devices. If saved data ever can't be read, Ghosted starts fresh and keeps the unreadable copy
aside under `ghosted:v1:corrupt` instead of deleting it. (CSV export/import is planned as a Pro feature;
see `NEXT_STEPS.md`.)

## Credits

Fonts: [Inter](https://github.com/rsms/inter) and Source Serif 4, both under the SIL Open Font License 1.1
(licence texts in `fonts/`). Icons, share image, tips and message templates are original.
