# REQ-SIDEBAR-RESP-008 — Responsive Sidebar Without Internal Scrollbars

**Date:** 2026-08-11
**Project:** Mareenraj / LEDSone Management AIOS
**Scope:** `web-view/css/navigation.css` only. No HTML, JavaScript, backend, database, API, or auth-logic changes.

---

## 1. Requirement

Make the existing Management AIOS left sidebar (`web-view/index.html` →
`<nav class="app-sidebar" id="appSidebar">`) responsive to available
viewport/device **height**.

## 2. Strict User Requirements

1. The sidebar must never have a vertical scrollbar.
2. The sidebar must never have a horizontal scrollbar.
3. All sidebar navigation items must remain visible.
4. This includes locked, unauthenticated items (Data, Issues, Knowledge Management).
5. On shorter-height screens, adapt by reducing: vertical gaps, section
   spacing, nav-item vertical padding, icon/button container height,
   member-item spacing.
6. Keep all text visible.
7. Do not hide or collapse sections.
8. Do not solve the problem by reducing/removing navigation functionality.
9. Preserve all current auth/lock behavior.

## 3. Approved Height Strategy

**Strategy A** (user-approved): automatically reduce vertical
gaps/padding and icon/button heights while keeping all text visible.
No alternative strategy was substituted — no blocker was hit that would
have required deviating from Strategy A.

## 4. Protected Path

`member-aios/mayurika-hr/staff-data/` was not opened or modified.

## 5. Sidebar Owner

- **DOM:** `web-view/index.html`, `<nav class="app-sidebar" id="appSidebar">` (lines 103-255) — one persistent sidebar with four groups: OVERVIEW (Root AIOS, File Map), MEMBERS (Mayurika, Suman, Arun, Rajiv, Paraparan), STAFF (Data, Review Summaries, Issues), KNOWLEDGE (Knowledge Management).
- **CSS:** `web-view/css/navigation.css` — the sole stylesheet owning `.app-sidebar`, `.app-sidebar-group`, `.app-sidebar-title`, `.app-nav-btn`, `.app-nav-icon`, `.app-sidebar-collapse-toggle`.
- **JS:** `web-view/js/navigation.js` toggles `body.sidebar-open` / `body.sidebar-collapsed` classes only — it never sets or computes any sidebar dimension. No JavaScript changes were needed or made for this task.
- **Auth:** `web-view/js/auth-gate.js` toggles the `.app-nav-btn--locked` class and `aria-disabled` on Data/Issues/Knowledge Management — untouched by this task.

## 6. Full detail

See `validation/responsive-sidebar-height-check-2026-08-11.md` for the
measured original overflow cause, the exact CSS values changed, the
breakpoints chosen and why, and the test/verification results, and
`handover/2026-08-11__responsive-sidebar-height-closure.md` for the
closure summary.
