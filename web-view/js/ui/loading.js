/* ui/loading.js — shared busy-state and loading-placeholder helpers.
   Generalizes the skeleton-row pattern that used to exist only in
   staff-data.js so Calendar (Schedule Summary) can use the same visual
   language, and gives every save/update/delete button in the app one
   consistent busy/disabled/spinner treatment.

   Leaf module: no imports, and must never import a calendar/staff/
   navigation module (dependency direction is domain -> ui, never the
   reverse). */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Marks a button busy (disabled, spinner shown, original label preserved)
   or restores it. Idempotent — calling setButtonBusy(btn, true) twice in a
   row does not double-wrap the label, and setButtonBusy(btn, false) on a
   button that was never marked busy is a no-op. options.busyLabel lets a
   caller show different text while the request is in flight (defaults to
   the button's current label). */
export function setButtonBusy(button, isBusy, options) {
  if (!button) { return; }
  options = options || {};
  if (isBusy) {
    if (button.getAttribute('data-ui-busy') === 'true') { return; }
    button.setAttribute('data-ui-busy', 'true');
    button.setAttribute('data-ui-original-label', button.textContent);
    button.setAttribute('aria-busy', 'true');
    button.disabled = true;
    button.classList.add('ui-btn-busy');
    var busyLabel = options.busyLabel || button.textContent;
    button.innerHTML = '<span class="ui-btn-spinner" aria-hidden="true"></span>' +
      '<span class="ui-btn-busy-label">' + escapeHtml(busyLabel) + '</span>';
  } else {
    if (button.getAttribute('data-ui-busy') !== 'true') { return; }
    var original = button.getAttribute('data-ui-original-label');
    button.removeAttribute('data-ui-busy');
    button.removeAttribute('data-ui-original-label');
    button.removeAttribute('aria-busy');
    button.disabled = false;
    button.classList.remove('ui-btn-busy');
    if (original !== null) { button.textContent = original; }
  }
}

/* Toggles aria-busy + a dimmed/disabled-pointer visual state on a larger
   region (e.g. a Schedule Summary block) without replacing its content —
   used while a request is in flight but the region already shows a
   previous result that should stay visible until the new one arrives. */
export function setRegionBusy(region, isBusy) {
  if (!region) { return; }
  region.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  region.classList.toggle('ui-region-busy', !!isBusy);
}

/* Replaces `container`'s content with `count` animated skeleton
   placeholder rows (same visual pattern Staff Data's table loading state
   already used, now shared so any other region can reuse it instead of
   re-implementing its own). */
export function renderSkeletonRows(container, count) {
  if (!container) { return; }
  var n = count || 4;
  var html = '';
  for (var i = 0; i < n; i++) { html += '<div class="ui-skeleton-row"></div>'; }
  container.innerHTML = html;
}

/* Replaces `element`'s content with a small inline spinner + text — for a
   compact loading message inside a card/panel (e.g. Schedule Summary)
   rather than a full skeleton block. */
export function showInlineLoading(element, text) {
  if (!element) { return; }
  element.setAttribute('aria-busy', 'true');
  element.innerHTML = '<span class="ui-inline-loading">' +
    '<span class="ui-inline-spinner" aria-hidden="true"></span>' +
    escapeHtml(text || 'Loading…') + '</span>';
}
