# Next steps

## Done
- **Step 1 – core tracker** (add, status, follow-up due badge, remove with undo, filters, localStorage with
  recovery from corrupt data).
  - `npm test` → 20 unit tests pass (dates, rules, storage).
  - `e2e/step1.mjs` → Playwright/Chromium smoke test at 375px: all checks pass.

## Next
- Step 2: follow-up dialog (3 templates, Copy, "Mark as sent").
- Step 3: points, levels, streak, weekly goal, tip of the day, Progress tab + badges.
- Step 4: self-host Source Serif 4 + Inter, design polish, Lighthouse accessibility run.
- Step 5: PWA (manifest + service worker), landing section, share meta tags, icons.
- Step 6: GitHub Pages workflow + README.
- Pro / Cloudflare Worker license check: **waiting for owner approval**, not started.

## Decisions made (change if you disagree)
- "Follow-up due" counts from the latest of: date applied, last follow-up sent, or the day the card moved to
  Interview. Only Applied and Interview cards can be due.
- Weekly goal defaults to 5 actions. Weeks run Monday–Sunday.

## Not tested yet
- Real phone devices (only a 375px Chromium viewport so far).
- Screen readers (only labels/roles/focus order checked by script).
