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
  outcome_locked: {
    type: 'error',
    title: 'Outcome update closed',
    message: 'The deadline for updating this task has passed.',
    persistent: true
  },
  outcome_not_available_yet: {
    type: 'error',
    title: 'Outcome not available yet',
    message: 'You can update this task only on its scheduled date.',
    persistent: true
  },
  outcome_recorded_immutable: {
    type: 'error',
    title: 'This task can’t be changed',
    message: 'An outcome has already been recorded for this task, so its date can’t be changed and it can’t be deleted.',
    persistent: true
  },
  same_task_time_required: {
    type: 'error',
    title: 'Task time required',
    message: 'This task already exists on the selected date. Add separate non-overlapping times to create another occurrence.',
    persistent: true
  },
  exact_task_duplicate: {
    type: 'error',
    title: 'Duplicate task',
    message: 'This task already exists at the same date and time.',
    persistent: true
  },
  same_task_time_overlap: {
    type: 'error',
    title: 'Task time overlaps',
    message: 'This task already has another time period that overlaps the selected time.',
    persistent: true
  },
  /* MULTIPLE TIME FRAMES PER TASK (2026-07-27) — backend-returned
     equivalents of core.js TIME_FRAME_VALIDATION_COPY, used only when a
     request somehow reaches the server without already having passed the
     client-side classifyTimeFrameSet() mirror (defense in depth, not the
     primary UX path). */
  time_frame_incomplete: {
    type: 'error',
    title: 'Complete the task times',
    message: 'Enter both a start and end time for every time frame, or keep only one untimed task.',
    persistent: true
  },
  time_frame_invalid_range: {
    type: 'error',
    title: 'Check the task times',
    message: 'The end time must be later than the start time.',
    persistent: true
  },
  time_frame_duplicate: {
    type: 'error',
    title: 'Check the task times',
    message: 'Two time frames use the same start and end time. Change or remove one of them.',
    persistent: true
  },
  time_frame_overlap: {
    type: 'error',
    title: 'Check the task times',
    message: 'Two time frames overlap. Use separate, non-overlapping times.',
    persistent: true
  },
  contradictory_time_fields: {
    type: 'error',
    title: 'Check the task times',
    message: 'Enter times using either the start/end fields or time frames, not both.',
    persistent: true
  },
  /* APPROVED OCCURRENCE LIMIT (2026-07-27 owner approval): "Maximum 30
     total Task occurrences per submission after time-frame expansion."
     Single Task create and Task edit both route through this one
     KNOWN_ERRORS entry (their approved wording is identical); Bulk shows
     the backend's own message directly (applyBulkRowErrors, instance.js)
     since Bulk's approved wording differs ("across all Bulk Task rows") —
     this entry's message is kept word-for-word identical to the backend's
     Single/Edit wording so the two can never drift apart. Supersedes the
     retired too_many_time_frames code (backend/routers/
     member_schedules.py no longer produces it — the approved rule
     replaced that per-row check with this one shared, submission-wide
     validator). */
  too_many_task_occurrences: {
    type: 'error',
    title: 'Too many task times',
    message: 'You can add up to 30 task time frames in one submission. Remove some time frames and try again.',
    persistent: true
  },
  validation: {
    type: 'error',
    title: 'Check the highlighted fields',
    message: 'Some information is missing or not valid. Correct the highlighted fields and try again.',
    persistent: false
  },
  /* Calendar member-token authorization (2026-07-29; UX correction
     2026-07-31). auth_required: the saved token was rejected (missing/
     expired/rotated/revoked) — the fetch wrapper (instance.js) has
     already cleared localStorage and will show the "Authorize this
     browser" dialog again on the next mutation attempt, so this message
     only needs to explain what happened, not what to do next.
     cross_member_denied: this static entry is only the FALLBACK used
     when the thrown error carries no actingMemberLabel/targetMemberLabel
     (should not happen in practice — instance.js's apiRequest/
     leaveApiRequest always attach both from the backend's own
     actingMember/targetMember facts before throwing). The normal case is
     handled below, in mapApiError itself, with the same approved dynamic
     copy calendar/auth.js's crossMemberAlertCopy() renders for the
     client-side pre-block path — both must stay word-for-word identical.
     auth_cancelled: the user closed/escaped the authorize dialog without
     submitting a token — not a server error, so distinct wording. */
  auth_required: {
    type: 'error',
    title: 'Authorization needed',
    message: 'Your saved Calendar authorization has expired or changed. Enter your token again to continue.',
    persistent: true
  },
  cross_member_denied: {
    type: 'error',
    title: 'Not authorized for this member',
    message: 'You can only manage your own Tasks and Leave.',
    persistent: true
  },
  auth_cancelled: {
    type: 'error',
    title: 'Authorization needed',
    message: 'Enter your Calendar member token to complete this action.',
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
   error.message, error.status, or any other raw backend detail — the
   only exception is cross_member_denied below, which reads the two
   already-resolved DISPLAY LABEL strings the fetch wrapper attaches
   (never raw member keys, never anything backend-supplied verbatim), so
   this file never needs a calendar/DOM import of its own (this is a
   leaf ui/* module — see the file header). */
export function mapApiError(error, context) {
  context = context || {};
  var code = (error && error.code) || 'unknown';
  if (code === 'cross_member_denied' && error && error.actingMemberLabel && error.targetMemberLabel) {
    /* Same approved copy as calendar/auth.js's crossMemberAlertCopy() —
       keep both in sync if this wording ever changes. */
    return {
      type: 'error',
      title: "You can't manage " + error.targetMemberLabel + "'s Calendar",
      message: 'You are authorized as ' + error.actingMemberLabel + '. You can only create or change ' +
        error.actingMemberLabel + "'s Tasks and Leave.",
      field: context.field || null,
      persistent: true
    };
  }
  var base = KNOWN_ERRORS[code] || KNOWN_ERRORS.unknown;
  return {
    type: base.type,
    title: base.title,
    message: base.message,
    field: context.field || null,
    persistent: base.persistent
  };
}
