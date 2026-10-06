# Next steps

## Done (all steps of the approved plan, except Pro)
1. **Core tracker**: add, statuses, "Follow-up due" at 7+ days, filters, remove with Undo, localStorage with
   recovery from corrupt data.
2. **Follow-up dialog**: 3 templates, editable message, optional name, Copy, "Mark as sent".
3. **Progress**: points, levels, forgiving streak, weekly goal bar, tip of the day, 12 badges, Progress tab.
4. **Design**: Inter + Source Serif 4 self-hosted (OFL), warm off-white + deep teal, light/dark, reduced motion.
5. **PWA + landing**: manifest, offline service worker, one-page landing section, share meta tags, original icons
   and share image.
6. **Deploy**: `tools/build.mjs`, GitHub Pages workflow, README with GitHub Pages and Cloudflare Pages steps.

## Test results (run in this session)
- `npm test`: 51 unit tests pass.
- Browser tests (Playwright + Chromium, 375px phone viewport): ~125 checks pass, both on the source tree and on the
  built `dist/` served under a `/Idea-1/` sub-path (includes offline reload, add while offline, cache update).
- Lighthouse (mobile, built site): Performance 99, Accessibility 100, Best Practices 100, SEO 100.
- axe-core: 0 violations in light and dark, on the empty page, with cards, with the dialog open, and on the Progress tab,
  apart from "page has no h1" before the landing was added (fixed, h1 now present).

## You need to do
1. **Merge the branch into `main`** (the remote only has `claude/working-rules-aecs1o`). Say the word and I can open a PR.
2. Enable GitHub Pages: Settings, Pages, Source = **GitHub Actions**. Then check the Actions tab.
3. Check the share address in `index.html` (`https://dario6666-bos.github.io/Idea-1/`) matches where you deploy.
4. Decide whether to add a LICENSE file (I did not choose one for you).

## Waiting for your approval (not started)
- **Pro ($4-5, Gumroad license key)**: CSV export/import, extra themes, 20+ templates. Proposed check: one tiny
  Cloudflare Worker that calls Gumroad's license verify API (free tier). Needs: a Gumroad product with license keys,
  and a free Cloudflare account. Known limit: a determined user can fake the flag in localStorage; acceptable for a
  $4-5 product without a backend. Reply "go Pro" to start.

## Not tested (be aware)
- The GitHub Actions workflow has never run (YAML parses, the same commands pass locally).
- Real phones: only a 375px Chromium viewport. Not tried on iOS Safari (dialog, install to home screen, clipboard).
- Screen readers (VoiceOver, TalkBack, NVDA): only automated checks (axe, Lighthouse) and keyboard checks by script.
- The Copy fallback for browsers that deny clipboard access.
- Cloudflare Pages deploy instructions (written from documentation, not run).
- Browsers other than Chromium (Firefox, Safari).

## Ideas for later
- Optional notes field on cards, edit an application, simple backup/restore (free, no Pro needed?) , reminders
  via the browser's notification permission, Latin-extended font subset for non-English names.

## Rules I chose (change if you disagree)
- Follow-up clock: latest of date applied, last follow-up sent, or the day it moved to Interview.
- Streak: up to 2 quiet days allowed; best streak kept; "fresh start" copy instead of "lost".
- Points: one-time per application for interview/offer/rejection; follow-up once per application per day.
- Weekly goal default 5, Monday to Sunday; the weekly goal badge is permanent.
