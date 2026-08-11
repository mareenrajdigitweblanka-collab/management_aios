/* entry-auth-css-structure.test.mjs — structural coverage for the
   REQ-AUTH-ENTRY-011 (2026-08-11) CSS fix: web-view/css/entry-auth.css.

   Root cause of the reported bug (unauthenticated visitor with no saved
   token stuck seeing "Checking authorization…" alongside the token
   form): .auth-gate-checking and .auth-gate-screen each carry their own
   unconditional `display: flex` rule. A native `hidden` attribute is
   implemented by the browser's UA stylesheet as `[hidden] { display:
   none }` — an attribute selector, the SAME specificity as this file's
   own single-class selectors. At equal specificity the LAST rule in
   cascade order wins, and an author stylesheet always comes after the UA
   default, so `.auth-gate-checking { display: flex }` always beat
   `[hidden]` — entry-auth.js's showGateForm() correctly set
   #authGateChecking.hidden = true (see entry-auth.test.mjs — the JS
   state/call-count side was already correct and unaffected by this bug),
   but the element never actually stopped rendering. Same class of bug
   web-view/README.md already documents for
   .msc-calendar-main/.msc-view-dropdown ("a same-specificity native
   [hidden] attribute cannot reliably beat the existing rule").

   This repo has no CSS engine available to it (no npm dependencies, no
   jsdom/browser) — computed `display` cannot be evaluated here, so this
   file proves the FIX is present in the stylesheet's own source text: a
   compound selector (class + [hidden], strictly higher specificity than
   the plain class alone) that sets `display: none`, guaranteeing it wins
   regardless of source order. Same line/regex-anchored, no-parser
   technique as sidebar-height-responsive.test.mjs / navigation-
   structure.test.mjs.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

var cssPath = fileURLToPath(new URL('../css/entry-auth.css', import.meta.url));
var css = readFileSync(cssPath, 'utf8');

['.auth-gate-checking', '.auth-gate-screen'].forEach(function (selector) {
  test(selector + ' has an unconditional display rule (the thing [hidden] must be able to beat)', () => {
    var baseRuleRe = new RegExp('\\' + selector + '\\s*\\{[^}]*display:\\s*flex', 's');
    assert.match(css, baseRuleRe, selector + ' should still declare its own layout display value');
  });

  test(selector + '[hidden] override exists and sets display: none, with higher specificity than the plain class alone', () => {
    // Compound selector: class immediately followed by [hidden], e.g.
    // ".auth-gate-checking[hidden]" — specificity (0,0,2,0), strictly
    // higher than ".auth-gate-checking" alone (0,0,1,0) or a bare
    // "[hidden]" alone (0,0,1,0), so this wins regardless of source order.
    var overrideRe = new RegExp(
      '\\' + selector + '\\[hidden\\][^{]*\\{[^}]*display:\\s*none',
      's'
    );
    assert.match(css, overrideRe, selector + '[hidden] { display: none } override must exist');
  });
});

test('.auth-gate-form has no unconditional display rule that would fight its own [hidden] attribute', () => {
  // .auth-gate-form was never broken by this bug (it has no author
  // `display` rule to conflict with the UA [hidden] default) — this
  // guards against a future edit accidentally reintroducing the same
  // class of bug for this element too.
  var formRuleRe = /\.auth-gate-form\s*\{[^}]*display:/s;
  assert.doesNotMatch(css, formRuleRe, '.auth-gate-form must not gain its own display rule without a matching [hidden] override');
});
