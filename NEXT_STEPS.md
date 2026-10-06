# Next steps

## Done
- **Step 1 – core tracker** (add, status, follow-up due badge, remove with undo, filters, localStorage with
  recovery from corrupt data).
  - `npm test` → 20 unit tests pass (dates, rules, storage).
  - `e2e/step1.mjs` → Playwright/Chromium smoke test at 375px: all checks pass.

- **Step 2 – follow-up dialog**: 3 free templates (friendly, short, thank-you), editable message, optional name
  (saved on device), Copy, "Mark as sent" (resets the 7-day timer). Interview cards suggest the thank-you template.
  - `npm test` → 26 unit tests pass. `e2e/step2.mjs` → 30 browser checks pass (keyboard, clipboard, persistence).
- **Step 3 – progress**: points (+10/+25/+50/+200/+5), levels every 100, streak, weekly goal bar, tip of the day
  (after 3 actions), Progress tab, 12 badges. Logic is pure and tested (`js/progress.js`).
  - `npm test` → 46 pass. `e2e/step3.mjs` → 49 browser checks pass.

## Next
- Step 4: self-host Source Serif 4 + Inter, design polish, Lighthouse accessibility run.
- Step 5: PWA (manifest + service worker), landing section, share meta tags, icons.
- Step 6: GitHub Pages workflow + README.
- Pro / Cloudflare Worker license check: **waiting for owner approval**, not started.

## Decisions made (change if you disagree)
- "Follow-up due" counts from the latest of: date applied, last follow-up sent, or the day the card moved to
  Interview. Only Applied and Interview cards can be due.
- Weekly goal defaults to 5 actions. Weeks run Monday–Sunday.

## Blocked
- `git push` returns 403: the Claude GitHub App is not installed on dario6666-bos/Idea-1 (or needs relinking).
  Commits exist locally only. Owner must fix access at https://claude.ai/connect-github.

## Rules I chose for progress (change if you disagree)
- Streak counts days with at least one action. Up to 2 days without an action are fine (actions 3 days apart
  continue the streak). After that it restarts with a gentle "fresh start" message; best streak is kept.
- Interview / offer / rejection points are awarded once per application (no farming by toggling status).
  Follow-up points: once per application per day. Points are never removed, even if you delete a card.
- Weekly goal counts every action, Monday to Sunday. The "Weekly goal met" badge is permanent.

## Not tested yet
- Real phone devices (only a 375px Chromium viewport so far).
- Screen readers (only labels/roles/focus order checked by script).
