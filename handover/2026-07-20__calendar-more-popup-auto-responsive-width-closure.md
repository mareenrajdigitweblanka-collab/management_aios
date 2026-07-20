# Handover — Calendar "+N More" Popup: Auto-Responsive Width

**Date:** 2026-07-20
**Task type:** Frontend UI/UX correction only
**Starting commit:** `2119381` (main, clean working tree except this task's changes)

---

## 1. Files Changed

- `web-view/css/tokens.css` — replaced the `--more-popup-*` resize-bound tokens with
  automatic-width tokens (`--more-popup-width`, `--more-popup-min-width`,
  `--more-popup-max-width`, plus a `*-tablet` set).
- `web-view/css/calendar.css` — removed `resize: horizontal` and the decorative resize-grip
  (`.msc-more-popup::after`) from `.msc-more-popup`; added a `@media (max-width: 1024px)` tablet
  tier; simplified the existing mobile tier (dropped the now-redundant `resize: none`).

No JavaScript file was modified — `web-view/js/calendar/instance.js` and
`web-view/js/calendar/core.js` were inspected only, no edits required (see §2).

## 2. Ownership Map

| Concern | Owner | Changed? |
|---|---|---|
| Popup width values | `tokens.css` `--more-popup-*` custom properties | Yes |
| Popup width application (min/width/max, tiers) | `calendar.css` `.msc-more-popup` + 2 media queries | Yes |
| Popup viewport-safe positioning (`left`/`top` clamping) | `instance.js` `positionMorePopup()` | No — already reads `offsetWidth`/`offsetHeight` at call time and clamps against the viewport; worked correctly with zero changes once width became CSS-driven instead of user-driven |
| Row layout (time column / title ellipsis) | `calendar.css` `.msc-more-popup-item-time` / `.msc-more-popup-item-title` | No — already matched the required layout |
| Open/close/Escape/click-away logic | `instance.js` `openMorePopup()` / `closeMorePopup()` / `onDocClickForMorePopup()` / `onMorePopupKeydown()` | No |
| Resize removal | `calendar.css` (`resize: horizontal` + grip pseudo-element removed) | Yes |

## 3. Responsive Boundaries

| Tier | Breakpoint | Width formula |
|---|---|---|
| Desktop/laptop (default) | viewport > 1024px | `clamp(360px, 27vw, 480px)`, capped by `calc(100vw - 32px)` |
| Tablet | viewport ≤ 1024px | `clamp(300px, 46vw, 420px)`, capped by `calc(100vw - 40px)` |
| Mobile | viewport ≤ 480px | `calc(100vw - 16px)` (near-full width, 8px side margins) |

Computed values at the 7 required breakpoints are documented in
`validation/calendar-more-popup-auto-responsive-width-check-2026-07-20.md` §6.

## 4. Retained Functionality

Everything not explicitly listed as changed above is unmodified and was re-verified working in a
real browser: "+N more" open, task-only listing (no leave records), task-row click → shared Task
detail popup, more-popup closes before Task detail opens, Escape, click-away, Close button,
blank-cell creation, Month/Week/Day view switching, vertical scrolling, dialog/row accessibility
semantics, focus-return-to-anchor on Escape. Full checklist and results in the validation doc
§11–§12.

Week/Day Task-block vertical resize (`.msc-tg-resize-handle`, `attachResizeHandler()` in
`instance.js`) and the `.msc-form-grid textarea` vertical resize are unrelated resize behaviors
and were not touched.

## 5. Deployment

Standard existing Vercel deployment process for `web-view/` — no build step, static files served
as-is. No backend/database change means no separate backend deployment is needed for this change.

**Not yet done:** production verification against `https://management-aios.vercel.app/` (Step 18
of the task brief) — this closure covers local static-server + mocked-API browser validation only
(see validation doc §13, §17 "Known limitation"). Deploy and re-check in production before
treating this as fully closed.

## 6. Rollback

Revert the two changed files to their state at commit `2119381`:

```
git checkout 2119381 -- web-view/css/calendar.css web-view/css/tokens.css
```

This restores the prior manual-resize behavior with no other side effects, since no other file
was touched.

## 7. Commit Hashes

- Implementation: `07428f1` — "Replace resizable task popup with responsive automatic width"
- Evidence: recorded in the git log entry immediately following `07428f1` on `main` (this
  handover doc + the validation doc, committed together).

## 8. Known Limitations

- Real-browser validation used a local static file server with the FastAPI schedule/leave `GET`
  endpoints mocked via Playwright request interception, not a live PostgreSQL-backed backend (no
  local `DATABASE_URL` available in this environment). Functional behavior of the popup itself
  does not depend on live data content, only on the shape of the rows the API returns, which the
  mock matched exactly (`apiItemToFrontend()` field set).
- Production deployment verification (Step 18) is outstanding — see §5.

## 9. One Next Step

Deploy to Vercel and re-run the Step 13 real-browser checklist against
`https://management-aios.vercel.app/` with real backend data, to close out the outstanding
production-verification item noted above.
