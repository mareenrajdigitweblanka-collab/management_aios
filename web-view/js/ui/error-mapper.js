/* ui/error-mapper.js — one shared mapping layer from a caught request
   error to a plain-language, non-technical message. Backend response
   contracts are never changed by this file — it only decides what the
   user is shown for a given already-thrown error. Callers (the Task, Leave,
   and Staff Data fetch wrappers) tag each thrown Error with a stable
   `.code` before it reaches here — see classifyHttpStatus() below, used by
   those wrappers for the cases that don't already carry one of the three
   known business-conflict identifiers.

   Leaf module: no imports, and must never import a calendar/staff/
   navigation module (dependency direction is domain -> ui, never the
   reverse). */

/* Known, stable outcomes. `persistent` matches the requirement that a
   warning/error the user must act on is never auto-dismissed — every
   mapped case here requires the user to notice and do something
   differently, so every one is persistent. */
var KNOWN_ERRORS = {
  leave_conflict: {
    type: 'error',
    title: 'This time is unavailable',
    message: 'A leave entry already covers this time. Choose a different time.',
    persistent: true
  },
  task_conflict: {
    type: 'error',
    title: 'This leave cannot be added',
    message: 'One or more tasks already use this time. Choose a different date or time.',
    persistent: true
  },
  leave_overlap: {
    type: 'error',
    title: 'This leave overlaps another leave',
    message: 'Choose a different date or time.',
    persistent: true
  },
  validation: {
    type: 'error',
    title: 'Check the highlighted fields',
    message: 'Some information is missing or not valid. Correct the highlighted fields and try again.',
    persistent: false
  },
  not_found: {
    type: 'error',
    title: 'This record is no longer available',
    message: 'It may have already been removed or changed. Refresh and try again.',
    persistent: false
  },
  network: {
    type: 'error',
    title: 'We couldn’t connect',
    message: 'Check your connection and try again.',
    persistent: true
  },
  server: {
    type: 'error',
    title: 'Something went wrong',
    message: 'Try again. If the problem continues, contact your system administrator.',
    persistent: true
  },
  unknown: {
    type: 'error',
    title: 'Something went wrong',
    message: 'Try again. If the problem continues, contact your system administrator.',
    persistent: true
  }
};

/* Shared HTTP-status classifier — used by the domain fetch wrappers
   (apiRequest/leaveApiRequest/staffApiRequest) so all three tag unknown
   (non-business-conflict) failures the same way instead of three
   independent guesses. Never returns a status code, HTTP reason phrase,
   or any other technical detail — only one of the safe, generic codes
   also known to KNOWN_ERRORS above. */
export function classifyHttpStatus(status) {
  if (status === 404) { return 'not_found'; }
  if (status === 400 || status === 422) { return 'validation'; }
  if (typeof status === 'number' && status >= 500) { return 'server'; }
  return 'unknown';
}

/* mapApiError(error, context) -> { type, title, message, field, persistent }.
   `error` is expected to carry a `.code` (set by the fetch wrapper that
   threw it) — an error without one is treated as 'unknown'. `context` is
   optional ({ field }) and only ever adds which field a validation error
   concerns; it never changes the message text itself, so nothing
   backend-specific can leak through it. Never reads or returns
   error.message, error.status, or any other raw backend detail. */
export function mapApiError(error, context) {
  context = context || {};
  var code = (error && error.code) || 'unknown';
  var base = KNOWN_ERRORS[code] || KNOWN_ERRORS.unknown;
  return {
    type: base.type,
    title: base.title,
    message: base.message,
    field: context.field || null,
    persistent: base.persistent
  };
}
