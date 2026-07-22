/* ui/form-feedback.js — shared inline field-validation feedback. Replaces
   blocking window.alert() calls used for form-field validation with a
   message attached directly to the invalid field (visible text, invalid
   styling, aria-invalid/aria-describedby), so the popup stays open, entered
   values are preserved, and screen-reader users get the error associated
   with the exact field it concerns.

   Leaf module: no imports, and must never import a calendar/staff/
   navigation module (dependency direction is domain -> ui, never the
   reverse). */

var fieldIdCounter = 0;

function ensureFieldId(field) {
  if (!field.id) {
    fieldIdCounter += 1;
    field.id = 'ui-field-' + fieldIdCounter;
  }
  return field.id;
}

function addDescribedBy(field, errorId) {
  var ids = (field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
  if (ids.indexOf(errorId) === -1) { ids.push(errorId); }
  field.setAttribute('aria-describedby', ids.join(' '));
}

function removeDescribedBy(field, errorId) {
  var ids = (field.getAttribute('aria-describedby') || '').split(' ').filter(function (id) {
    return id && id !== errorId;
  });
  if (ids.length) { field.setAttribute('aria-describedby', ids.join(' ')); }
  else { field.removeAttribute('aria-describedby'); }
}

/* Shows (or updates) one field-level error message. Safe to call
   repeatedly on the same field — it reuses the same error node/id rather
   than creating a duplicate on every call. */
export function setFieldError(field, message) {
  if (!field) { return; }
  var errorId = ensureFieldId(field) + '-error';
  var errorEl = document.getElementById(errorId);
  if (!errorEl || errorEl.previousElementSibling !== field) {
    errorEl = document.createElement('span');
    errorEl.className = 'ui-field-error';
    errorEl.id = errorId;
    errorEl.setAttribute('role', 'alert');
    field.insertAdjacentElement('afterend', errorEl);
  }
  errorEl.textContent = message || '';
  field.classList.add('ui-field-invalid');
  field.setAttribute('aria-invalid', 'true');
  addDescribedBy(field, errorId);
}

/* Clears one field's error message/state (values themselves are never
   touched — only the error presentation). */
export function clearFieldError(field) {
  if (!field) { return; }
  field.classList.remove('ui-field-invalid');
  field.removeAttribute('aria-invalid');
  if (!field.id) { return; }
  var errorId = field.id + '-error';
  removeDescribedBy(field, errorId);
  var errorEl = document.getElementById(errorId);
  if (errorEl && errorEl.parentNode) { errorEl.parentNode.removeChild(errorEl); }
}

/* Clears every field error currently shown within `form`. */
export function clearFormErrors(form) {
  if (!form) { return; }
  Array.prototype.slice.call(form.querySelectorAll('.ui-field-invalid')).forEach(clearFieldError);
}

/* Moves focus to the first invalid field in `form`, if any — call after
   setFieldError() so the user lands on the field that actually needs
   correcting rather than staying wherever they last clicked. */
export function focusFirstInvalid(form) {
  if (!form) { return; }
  var first = form.querySelector('.ui-field-invalid');
  if (first && typeof first.focus === 'function') { first.focus(); }
}
