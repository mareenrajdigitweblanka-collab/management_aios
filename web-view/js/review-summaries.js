/* review-summaries.js — Staff Review Summaries dedicated workspace
   (REQ-CAL-REV-TAB-002, 2026-08-06 — replaces REQ-CAL-REV-001's 5
   per-member-panel mounts with one independent workspace).

   Mounted exactly once, inside the new independent #tab-review-summaries
   panel (web-view/index.html) — never inside any Management Team member
   panel. There is no per-tab `memberKey` any more: the current reviewer is
   derived ONLY from the browser-wide Calendar token
   (calendar/auth.js's getStoredMemberKey()) — never from a reviewer
   filter selection, the selected reviewed employee, or the request body.

   Two access states (replacing the old 5-mount own/read_only/unauthorized
   trio, which existed to compare "this panel's member" against the
   authenticated member — a comparison that no longer applies once there is
   only one, member-independent panel):
     - 'unauthorized' — no token stored in this browser. Nothing is
       readable or writable until authorized.
     - 'authorized'   — a valid token is stored. Every authenticated
       Management Team member may search staff, read every reviewer's
       active summaries for a selected employee, and create their own
       summaries. Edit is decided PER RECORD (isOwnedRecord + the
       backend-derived record.can_edit below), not per panel — only the
       record's own reviewer_member_key/can_edit controls whether Edit
       renders for that one card. Delete does not exist anywhere in this
       UI any more (REQ-CAL-REV-LOCK-004, 2026-08-06 — no user may delete
       a Review Summary; see renderHistoryCard below).

   REQ-CAL-REV-LOCK-004 (2026-08-06) same-day edit lock: the backend is
   authoritative — every record returned by list/detail already carries a
   server-derived `can_edit` boolean (true only for the record's own
   creator, and only through 23:59:59 Asia/Colombo on its own created_at
   date). This module never recomputes that decision from a browser clock;
   it only reads record.can_edit to decide whether to show the Edit
   button, and every PUT still relies on the backend's own 409
   review_summary_edit_locked rejection as the real enforcement (see
   exitEditModeOnLockedResponse in the form submit handler below).

   REQ-CAL-REV-UX-005 (2026-08-06) professional UI/UX refresh — frontend
   presentation only, no functional/authorization/edit-lock/no-delete/PDF-
   content change of any kind:
     - Every card now shows exactly one status badge ("Editable today" /
       "Read-only") plus an explanatory message — reviewSummaryStatusInfo()
       below is the single source of truth for that badge/message pair,
       covering all three cases (owned+editable, owned+locked, other
       reviewer) so the badge and the message can never disagree. Reading
       every reviewer's own card (not just the authenticated reviewer's)
       is unchanged — only the read-only cards now ALSO get a badge/
       message, where before they got neither (REQ-CAL-REV-LOCK-004 had
       only ever shown status text on the owner's own card).
     - Card layout is now header (employee + badge) / metadata (Reviewed
       by, Reviewer role, Meeting date, each its own labeled row) /
       summary (labeled "Review summary") / status message / Edit action /
       footer (Created/Updated, from the created_at/updated_at fields the
       backend already returns — no new backend field).
     - The former ambiguous "Edited" pill is now a secondary "Updated"
       label with an aria-label explanation, never the primary state
       badge.
     - Reviewer/From/To/Download PDF now live in one
       .review-summaries-toolbar so Download PDF stays visually
       associated with the filters it applies to (desktop: one row;
       narrow: Reviewer full-width, From/To paired, Download PDF full-
       width — review-summaries.css).
     - downloadReviewSummariesPdf() reuses ui/loading.js's existing
       setButtonBusy() (same spinner/disabled/aria-busy convention every
       other busy button in this app already uses) for the button's own
       "Preparing PDF…" state, plus a small aria-live="polite" status
       paragraph next to the button for the longer explanatory sentence.
       The PDF endpoint, its query parameters, its response handling
       (401/404/blob), and the filename logic are all completely
       unchanged — only what the user sees while waiting/after finishing
       is new.

   Reviewer display name/role are resolved client-side via
   member-registry.js's MEMBER_REGISTRY, from each record's own
   reviewer_member_key — the API returns that key unchanged and nothing
   else; no reviewer_display_label field exists on the response (see
   backend/routers/staff_review_summaries.py/schemas.py, deliberately
   unmodified — REQ-CAL-REV-TAB-002 technical design §4/§6.3).

   Same fetch-wrapper rationale as REQ-CAL-REV-001: every Staff Review
   Summaries request — including GET — requires a token, so
   reviewSummariesApiRequest() below is its own wrapper, never a reuse of
   calendar/instance.js's apiRequest/leaveApiRequest (which attach the
   Authorization header only on non-GET requests).

   Built via createElement/appendChild with direct element references
   (never innerHTML for user-authored text) — same convention as
   calendar/auth.js — so this module stays testable with the existing
   hand-rolled DOM stand-in (review-summaries-test-dom.mjs).

   REQ-CAL-REV-MD-READ-006 (2026-08-06) — MD read-only access: MD
   authenticates through the exact same token flow as every other member
   (calendar/auth.js) and reaches 'authorized' access here unchanged — the
   two-state model above is NOT modified. isReadOnlyMember() (member-
   registry.js) is a purely presentational, ADDITIONAL check layered on
   top: it hides the create/edit form (showing a read-only notice instead)
   and adds one extra explanatory line per history card. It changes no
   fetch, no request payload, and no access-state transition. The real
   enforcement is always the backend's 403 on CREATE/UPDATE — this module
   never assumes otherwise. Since isOwnedRecord() already returns false for
   every record when the authenticated key is "md" (no summary is ever
   owned by "md"), Edit never renders for MD without any extra code here. */

import { STAFF_REVIEW_SUMMARIES_API_BASE } from './config.js';
import { STAFF_API_BASE } from './staff-data.js';
import { getColomboTodayStr, formatTaskTimestamp } from './calendar/core.js';
import {
  ensureAuthorized,
  handleUnauthorizedResponse,
  getStoredMemberKey,
  getStoredToken,
  CALENDAR_AUTH_CHANGED_EVENT
} from './calendar/auth.js';
import { resolveMember, isReadOnlyMember } from './member-registry.js';
import { classifyHttpStatus, mapApiError } from './ui/error-mapper.js';
import { setButtonBusy, showInlineLoading } from './ui/loading.js';
import { setFieldError, clearFieldError, clearFormErrors, focusFirstInvalid } from './ui/form-feedback.js';
import { showToast } from './ui/toast.js';

var SUMMARY_MAX_LENGTH = 10000;
var SUMMARY_PREVIEW_LENGTH = 400;
var mountCounter = 0; // unique DOM-id prefix per mounted workspace (staff combobox aria wiring)

/* Review Summary Attachments (REQ-CAL-REV-ATTACH-001, 2026-09-23) —
   client-side UX only. The single source of truth for every one of these
   numbers is backend/config.py (MAX_ATTACHMENT_FILE_SIZE_BYTES,
   MAX_ATTACHMENTS_PER_SUMMARY, ATTACHMENT_EXTENSION_TYPES) — the server
   re-validates everything here independently and is what is actually
   enforced; this module mirrors those same values purely so an invalid
   file is rejected instantly, before ever reaching the network, rather
   than only after a round trip. If the backend limits ever change, these
   must be updated to match — there is no shared/generated source between
   the two languages. */
export var MAX_ATTACHMENT_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export var MAX_ATTACHMENTS_PER_SUMMARY = 10;

export var ATTACHMENT_EXTENSION_TYPES = {
  '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio', '.ogg': 'audio',
  '.doc': 'word', '.docx': 'word',
  '.xls': 'excel', '.xlsx': 'excel',
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.webp': 'image',
  '.pdf': 'pdf'
};

var ATTACHMENT_TYPE_LABELS = {
  audio: 'Audio', word: 'Word document', excel: 'Excel spreadsheet', image: 'Image', pdf: 'PDF'
};

export function attachmentTypeLabel(attachmentType) {
  return ATTACHMENT_TYPE_LABELS[attachmentType] || 'File';
}

/* Extension -> attachment_type, or null for an unsupported file — mirrors
   backend/routers/staff_review_summaries.py _classify_attachment_extension
   exactly (same suffix-match approach). */
export function classifyAttachmentFilename(filename) {
  var lowered = String(filename || '').toLowerCase();
  var keys = Object.keys(ATTACHMENT_EXTENSION_TYPES);
  for (var i = 0; i < keys.length; i++) {
    var ext = keys[i];
    if (lowered.slice(-ext.length) === ext) {
      return ATTACHMENT_EXTENSION_TYPES[ext];
    }
  }
  return null;
}

/* Client-side pre-check for one File object, mirroring the server's own
   validation order (extension, then size, then non-empty) so the same
   file always fails for the same reason in both places. Returns
   {valid, attachmentType, error}. */
export function validateAttachmentFile(file) {
  var attachmentType = classifyAttachmentFilename(file && file.name);
  if (!attachmentType) {
    return {
      valid: false, attachmentType: null,
      error: 'Unsupported file type. Allowed: audio, Word, Excel, images, and PDF.'
    };
  }
  if (!file.size) {
    return { valid: false, attachmentType: attachmentType, error: 'File is empty.' };
  }
  if (file.size > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
    return {
      valid: false, attachmentType: attachmentType,
      error: 'File exceeds the maximum allowed size of '
        + Math.floor(MAX_ATTACHMENT_FILE_SIZE_BYTES / (1024 * 1024)) + ' MB.'
    };
  }
  return { valid: true, attachmentType: attachmentType, error: null };
}

/* "12.3 KB" / "4.1 MB" — never shows a raw byte count once it is large
   enough to be unreadable at a glance. */
export function formatAttachmentFileSize(bytes) {
  var value = Number(bytes) || 0;
  if (value < 1024) { return value + ' B'; }
  if (value < 1024 * 1024) { return (value / 1024).toFixed(1) + ' KB'; }
  return (value / (1024 * 1024)).toFixed(1) + ' MB';
}

/* REQ-CAL-REV-UX-005 — approved PDF-progress copy, exported as named
   constants (not inlined at each call site) so the exact wording is
   directly, deterministically testable on its own — independent of
   ui/toast.js's rendering pipeline, which this app's hand-rolled test DOM
   stand-in cannot reliably re-target across multiple tests in one run
   (its notification region is a module-level singleton bound to whichever
   fake document created it first). Behavior is unchanged either way —
   these are the literal strings already passed to showExportStatus()/
   showToast() below. */
export var PDF_PREPARING_MESSAGE = 'Preparing your PDF. The browser save window may take a few seconds to open.';
export var PDF_SUCCESS_MESSAGE = 'PDF ready. Your browser may ask where to save it or save it automatically.';
export var PDF_GENERIC_FAILURE_MESSAGE = 'The PDF could not be prepared. Please try again.';

/* REQ-CAL-REV-ATTACH-001 (2026-09-23) — "Download complete review" ZIP
   export copy, same constants-not-inlined rationale as the PDF messages
   above. Deliberately distinct wording from the PDF messages (not a
   shared template) so the two downloads' status text is never ambiguous
   about which one is in progress. */
export var ZIP_PREPARING_MESSAGE = 'Preparing your complete review (PDF plus every attachment, including audio). This can take longer than the PDF alone.';
export var ZIP_SUCCESS_MESSAGE = 'Complete review ready. Your browser may ask where to save it or save it automatically.';
export var ZIP_GENERIC_FAILURE_MESSAGE = 'The complete review could not be prepared. Please try again.';

/* "Download all reviews as one PDF" (REQ-CAL-REV-HISTORY-PDF-001,
   2026-09-23) — same constants-not-inlined rationale as the PDF/ZIP
   messages above. This can genuinely take much longer than either (every
   matching review, not just one page of them), so the preparing copy sets
   that expectation explicitly. */
export var ALL_REVIEWS_PREPARING_MESSAGE = 'Preparing the combined PDF for every matching review. This can take significantly longer than Download PDF, especially with many attachments.';
export var ALL_REVIEWS_SUCCESS_MESSAGE = 'All reviews ready as one PDF. Your browser may ask where to save it or save it automatically.';
export var ALL_REVIEWS_GENERIC_FAILURE_MESSAGE = 'The combined PDF could not be prepared. Please try again.';

/* Fixed display order for the reviewer filter dropdown — matches
   backend/config.py's VALID_MEMBER_KEYS order (the canonical Management
   Team member ordering used throughout this repo's sidebar/config).

   MD (REQ-CAL-REV-MD-READ-006, 2026-08-06) is deliberately NEVER added
   here — MD is an authenticated VIEWER, not a reviewer, and can never
   become one (the backend rejects MD on CREATE; the database's own CHECK
   constraint on reviewer_member_key doesn't permit "md" either). This is a
   separate list from member-registry.js's MEMBER_REGISTRY (which DOES
   include an "md" display-only entry for the "Authorized as" banner) by
   design — see that file's own comment for why the two registries serve
   different purposes and must not be merged. */
var REVIEWER_FILTER_ORDER = ['mayurika', 'suman', 'arun', 'rajiv', 'paraparan'];

// ── Pure helpers (exported for direct testing — no DOM involved) ───────

/* Builds the GET list query string. reviewerMemberKey and
   includeAllReviewers are mutually exclusive by construction here — if
   includeAllReviewers is truthy, reviewer_member_key is never appended,
   regardless of what reviewerMemberKey was also passed (callers below
   never pass both together, but this function enforces the rule itself
   rather than trusting every call site). */
export function buildListQuery(filters) {
  filters = filters || {};
  var params = [];
  if (filters.includeAllReviewers) {
    params.push('include_all_reviewers=true');
  } else if (filters.reviewerMemberKey) {
    params.push('reviewer_member_key=' + encodeURIComponent(filters.reviewerMemberKey));
  }
  if (filters.reviewedStaffId) { params.push('reviewed_staff_id=' + encodeURIComponent(filters.reviewedStaffId)); }
  if (filters.dateFrom) { params.push('date_from=' + encodeURIComponent(filters.dateFrom)); }
  if (filters.dateTo) { params.push('date_to=' + encodeURIComponent(filters.dateTo)); }
  params.push('limit=' + (filters.limit || 50));
  params.push('offset=' + (filters.offset || 0));
  return params.join('&');
}

/* PDF export query string (REQ-CAL-REV-PDF-003) — same reviewer-scope
   mutual-exclusivity rule as buildListQuery, but never appends limit/offset
   (the export is deliberately unpaginated — "the complete active Review
   Summary history," never one page of it). Never includes a token,
   reviewer display name, employee display name, or summary text — only
   reviewed_staff_id (an integer as of 2026-08-11 — was a UUID), an
   optional reviewer_member_key, and two optional dates. */
export function buildExportQuery(filters) {
  filters = filters || {};
  var params = [];
  if (filters.includeAllReviewers) {
    params.push('include_all_reviewers=true');
  } else if (filters.reviewerMemberKey) {
    params.push('reviewer_member_key=' + encodeURIComponent(filters.reviewerMemberKey));
  }
  if (filters.reviewedStaffId) { params.push('reviewed_staff_id=' + encodeURIComponent(filters.reviewedStaffId)); }
  if (filters.dateFrom) { params.push('date_from=' + encodeURIComponent(filters.dateFrom)); }
  if (filters.dateTo) { params.push('date_to=' + encodeURIComponent(filters.dateTo)); }
  return params.join('&');
}

/* True when both dates are set and dateFrom is after dateTo — the same
   invalid-range condition the backend itself rejects with 422 (date_from
   must not be after date_to). ISO YYYY-MM-DD strings compare correctly
   with a plain string comparison. */
export function isInvalidDateRange(dateFrom, dateTo) {
  return !!(dateFrom && dateTo && dateFrom > dateTo);
}

/* Trims and validates summary_text client-side, mirroring the backend's
   exact rule (StaffReviewSummaryCreate/Update in backend/schemas.py) so
   an invalid submission never reaches the network. Returns
   {valid, trimmed, error} — error is a plain-language message, or null. */
export var ATTACHMENT_ONLY_UNAVAILABLE_NOTE =
  'Attachment-only reviews are not available yet — a written summary is required.';

export function validateSummaryText(raw) {
  var trimmed = String(raw == null ? '' : raw).trim();
  if (!trimmed) {
    return { valid: false, trimmed: trimmed, error: 'Enter a summary before saving.' };
  }
  if (trimmed.length > SUMMARY_MAX_LENGTH) {
    return {
      valid: false, trimmed: trimmed,
      error: 'Summary must be ' + SUMMARY_MAX_LENGTH.toLocaleString() + ' characters or fewer.'
    };
  }
  return { valid: true, trimmed: trimmed, error: null };
}

/* "N / 10,000" character counter text, plus a boolean the caller uses to
   apply a warning style as the limit approaches. */
export function summaryCounterText(raw) {
  var length = String(raw == null ? '' : raw).length;
  return length.toLocaleString() + ' / ' + SUMMARY_MAX_LENGTH.toLocaleString();
}

export function isSummaryCounterWarning(raw) {
  var length = String(raw == null ? '' : raw).length;
  return length > SUMMARY_MAX_LENGTH * 0.95;
}

/* History-card long-summary truncation — word-boundary-aware so a preview
   never cuts a word in half — only backs off to the last space when doing
   so doesn't throw away more than 40% of the preview. Pure/exported for
   direct testing; the DOM-facing expand/collapse toggle lives in
   renderHistoryCard. */
export function summaryPreview(text, maxLength) {
  maxLength = maxLength || SUMMARY_PREVIEW_LENGTH;
  var full = String(text == null ? '' : text);
  if (full.length <= maxLength) {
    return { truncated: false, preview: full };
  }
  var cut = full.slice(0, maxLength);
  var lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.6) { cut = cut.slice(0, lastSpace); }
  return { truncated: true, preview: cut + '…' };
}

/* Reviewed-staff option label — reads a raw GET /api/staff search result
   (StaffRecordOut), which uses Ledsone's own `name` field (renamed from
   full_name 2026-08-11 — see backend/schemas.py StaffRecordOut
   docstring). Never staff_code/employee_number. */
export function staffOptionLabel(staff) {
  if (!staff) { return ''; }
  return staff.name || 'Unnamed staff record';
}

/* REQ-CAL-REV-ATTACH-001 (2026-09-23) — a disambiguating label for the
   staff-search RESULTS LIST only (never used for a history card's already-
   resolved reviewed_staff_full_name, which has no staff_code/designation
   available — see reviewedEmployeeLabel below). Two staff members sharing
   a name are only distinguishable by staff_code/designation, both of
   which GET /api/staff already returns on every search result
   (StaffRecordOut) — no backend change needed for this. Falls back to the
   bare name when neither disambiguator is present, byte-for-byte the same
   as staffOptionLabel's own output, so a caller that does not need
   disambiguation (e.g. the "selected employee" chip, which already reads
   staffOptionLabel directly) is unaffected. */
export function staffSearchResultLabel(staff) {
  var name = staffOptionLabel(staff);
  if (!staff) { return name; }
  var extras = [staff.staff_code, staff.designation].filter(function (v) { return !!v; });
  if (!extras.length) { return name; }
  return name + ' — ' + extras.join(' · ');
}

/* REQ-CAL-REV-PDF-003-FIX-02 — PDF export filename handling. The server
   (backend/review_summary_pdf_export.py) sends an already-sanitized
   filename in Content-Disposition; this client-side sanitization is a
   defense-in-depth basename/control-character guard, not a duplicate of
   the server's transliteration rules. */
var UNSAFE_FALLBACK_CHARS_RE = /[\\/:*?"<>|\r\n\t\x00-\x1f]/g;
var REPEATED_UNDERSCORE_RE = /_{2,}/g;
var PDF_SUFFIX_RE = /\.pdf$/i;

function sanitizeFallbackNameComponent(raw) {
  var text = String(raw == null ? '' : raw);
  text = text.replace(/\.\./g, '');
  text = text.replace(/\\/g, '_').replace(/\//g, '_');
  text = text.replace(UNSAFE_FALLBACK_CHARS_RE, '_');
  text = text.replace(/['"]/g, '');
  text = text.replace(/ /g, '_');
  text = text.replace(PDF_SUFFIX_RE, '');
  text = text.replace(REPEATED_UNDERSCORE_RE, '_');
  text = text.replace(/^[_.]+|[_.]+$/g, '');
  return text || 'Employee';
}

export function buildFallbackReviewSummaryPdfFilename(employeeDisplayName, dateStr) {
  return 'Review_Summary_' + sanitizeFallbackNameComponent(employeeDisplayName) + '_' + dateStr + '.pdf';
}

/* "Download complete review" (REQ-CAL-REV-ATTACH-001) — deliberately a
   different prefix/extension from the PDF-only filename above, mirroring
   backend/review_summary_pdf_export.py build_review_summary_zip_filename,
   so the two downloads' saved files are visually distinguishable in a
   downloads folder. */
export function buildFallbackReviewSummaryZipFilename(employeeDisplayName, dateStr) {
  return 'Complete_Review_' + sanitizeFallbackNameComponent(employeeDisplayName) + '_' + dateStr + '.zip';
}

/* "Download all reviews as one PDF" (REQ-CAL-REV-HISTORY-PDF-001,
   2026-09-23) — a THIRD distinct prefix ("All_Reviews_"), alongside
   "Review_Summary_..." (single-scope PDF) and "Complete_Review_..." (ZIP),
   mirroring backend/review_summary_pdf_export.py
   build_all_reviews_pdf_filename, so all three downloads' saved files stay
   visually distinguishable in a downloads folder. */
export function buildFallbackAllReviewsPdfFilename(employeeDisplayName, dateStr) {
  return 'All_Reviews_' + sanitizeFallbackNameComponent(employeeDisplayName) + '_' + dateStr + '.pdf';
}

function sanitizeDispositionFilenameValue(value) {
  if (!value) { return ''; }
  // Defends against a path-separator-bearing header value by taking only
  // the basename, then strips control characters and stray quotes.
  var text = String(value).split(/[\\/]/).pop();
  text = text.replace(/[\r\n\t\x00-\x1f"]/g, '');
  return text.trim();
}

function ensurePdfExtension(name) {
  return PDF_SUFFIX_RE.test(name) ? name : name + '.pdf';
}

var ZIP_SUFFIX_RE = /\.zip$/i;

function ensureZipExtension(name) {
  return ZIP_SUFFIX_RE.test(name) ? name : name + '.zip';
}

/* Prefers the RFC 5987/6266 filename*=UTF-8''<percent-encoded> form (set
   by build_content_disposition_header in backend/review_summary_pdf_
   export.py), falls back to the legacy filename="..." form, then to a
   generated fallback only when the header is genuinely unusable. */
export function parseReviewSummaryPdfFilename(dispositionHeader, fallbackEmployeeName, fallbackDateStr) {
  var fallback = buildFallbackReviewSummaryPdfFilename(fallbackEmployeeName, fallbackDateStr);
  var header = dispositionHeader || '';

  var starMatch = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (starMatch) {
    var rawStar = starMatch[1].trim().replace(/^["']|["']$/g, '');
    try {
      var decoded = decodeURIComponent(rawStar);
      var cleanedStar = sanitizeDispositionFilenameValue(decoded);
      if (cleanedStar) { return ensurePdfExtension(cleanedStar); }
    } catch (e) {
      // Malformed percent-encoding — fall through to filename= or fallback.
    }
  }

  var quotedMatch = /filename\s*=\s*"([^"]*)"/i.exec(header);
  if (quotedMatch) {
    var cleanedQuoted = sanitizeDispositionFilenameValue(quotedMatch[1]);
    if (cleanedQuoted) { return ensurePdfExtension(cleanedQuoted); }
  }

  var bareMatch = /filename\s*=\s*([^;]+)/i.exec(header);
  if (bareMatch) {
    var cleanedBare = sanitizeDispositionFilenameValue(bareMatch[1].trim());
    if (cleanedBare) { return ensurePdfExtension(cleanedBare); }
  }

  return fallback;
}

/* Same shape as parseReviewSummaryPdfFilename, for the "Download complete
   review" ZIP export (backend/review_summary_pdf_export.py
   build_review_summary_zip_filename). Kept as its own function (not a
   shared parameterized one) so neither download's parsing can accidentally
   regress the other. */
export function parseReviewSummaryZipFilename(dispositionHeader, fallbackEmployeeName, fallbackDateStr) {
  var fallback = buildFallbackReviewSummaryZipFilename(fallbackEmployeeName, fallbackDateStr);
  var header = dispositionHeader || '';

  var starMatch = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (starMatch) {
    var rawStar = starMatch[1].trim().replace(/^["']|["']$/g, '');
    try {
      var decoded = decodeURIComponent(rawStar);
      var cleanedStar = sanitizeDispositionFilenameValue(decoded);
      if (cleanedStar) { return ensureZipExtension(cleanedStar); }
    } catch (e) {
      // Malformed percent-encoding — fall through to filename= or fallback.
    }
  }

  var quotedMatch = /filename\s*=\s*"([^"]*)"/i.exec(header);
  if (quotedMatch) {
    var cleanedQuoted = sanitizeDispositionFilenameValue(quotedMatch[1]);
    if (cleanedQuoted) { return ensureZipExtension(cleanedQuoted); }
  }

  var bareMatch = /filename\s*=\s*([^;]+)/i.exec(header);
  if (bareMatch) {
    var cleanedBare = sanitizeDispositionFilenameValue(bareMatch[1].trim());
    if (cleanedBare) { return ensureZipExtension(cleanedBare); }
  }

  return fallback;
}

/* Same shape as parseReviewSummaryPdfFilename, for "Download all reviews
   as one PDF" (backend/review_summary_pdf_export.py
   build_all_reviews_pdf_filename). Kept as its own function (not a shared
   parameterized one), same "neither download can accidentally regress the
   other" reasoning as parseReviewSummaryZipFilename above. */
export function parseAllReviewsPdfFilename(dispositionHeader, fallbackEmployeeName, fallbackDateStr) {
  var fallback = buildFallbackAllReviewsPdfFilename(fallbackEmployeeName, fallbackDateStr);
  var header = dispositionHeader || '';

  var starMatch = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (starMatch) {
    var rawStar = starMatch[1].trim().replace(/^["']|["']$/g, '');
    try {
      var decoded = decodeURIComponent(rawStar);
      var cleanedStar = sanitizeDispositionFilenameValue(decoded);
      if (cleanedStar) { return ensurePdfExtension(cleanedStar); }
    } catch (e) {
      // Malformed percent-encoding — fall through to filename= or fallback.
    }
  }

  var quotedMatch = /filename\s*=\s*"([^"]*)"/i.exec(header);
  if (quotedMatch) {
    var cleanedQuoted = sanitizeDispositionFilenameValue(quotedMatch[1]);
    if (cleanedQuoted) { return ensurePdfExtension(cleanedQuoted); }
  }

  var bareMatch2 = /filename\s*=\s*([^;]+)/i.exec(header);
  if (bareMatch2) {
    var cleanedBare2 = sanitizeDispositionFilenameValue(bareMatch2[1].trim());
    if (cleanedBare2) { return ensurePdfExtension(cleanedBare2); }
  }

  return fallback;
}

/* Same shape as staffOptionLabel, but reading a history record's own
   reviewed_staff_full_name (live-joined by the backend at read time,
   backend/routers/staff_review_summaries.py _to_out()) rather than a
   staff-search result object — used for each card's "Reviewed employee"
   field. 2026-08-11: reviewed_staff_calling_name removed — see
   staffOptionLabel above. */
export function reviewedEmployeeLabel(record) {
  if (!record) { return ''; }
  return record.reviewed_staff_full_name || 'Unknown staff record';
}

/* Two access states only (corrects the old 5-mount own/read_only/
   unauthorized model — there is no more "selected reviewer panel" to
   compare against, since this workspace is not mounted per member). A
   valid token is either present ('authorized') or it is not
   ('unauthorized'); per-record ownership (isOwnedRecord below) decides
   Edit/Delete visibility separately, on every rendered card. */
export function workspaceAccessDecision(authenticatedMemberKey) {
  return authenticatedMemberKey ? 'authorized' : 'unauthorized';
}

/* Per-record ownership check — the reviewer identity source of truth
   (technical design §5.0): compares ONLY the record's own
   reviewer_member_key against the currently authenticated token's member
   key. Never derived from a reviewer filter selection, the selected
   employee, or any other signal. */
export function isOwnedRecord(record, authenticatedMemberKey) {
  return !!(record && authenticatedMemberKey && record.reviewer_member_key === authenticatedMemberKey);
}

/* REQ-CAL-REV-UX-005 — single source of truth for a card's status badge
   text/variant and its explanatory message, covering all three approved
   cases. Never recomputes eligibility itself — reads record.can_edit
   (backend-derived, REQ-CAL-REV-LOCK-004) and isOwnedRecord() only, so the
   displayed wording can never drift from what the backend actually
   enforces. Pure and exported so the exact approved copy is directly
   testable without mounting the full workspace. */
export function reviewSummaryStatusInfo(record, authenticatedMemberKey) {
  if (!isOwnedRecord(record, authenticatedMemberKey)) {
    return {
      owned: false,
      badgeText: 'Read-only',
      badgeVariant: 'readonly',
      message: 'Read-only — only the reviewer who created this summary can edit it.'
    };
  }
  if (record.can_edit) {
    return {
      owned: true,
      badgeText: 'Editable today',
      badgeVariant: 'editable',
      message: 'Editable today until 11:59 PM (Asia/Colombo).'
    };
  }
  return {
    owned: true,
    badgeText: 'Read-only',
    badgeVariant: 'readonly',
    message: 'Read-only — the same-day editing window has ended.'
  };
}

/* "Authorized as: Mayurika — HR" — entry is a resolveMember() result
   ({displayName, role}); null/undefined renders the not-yet-authorized
   copy so this function is always safe to call. */
export function authorizedAsLabelText(entry) {
  if (!entry) { return 'Not yet authorized on this browser.'; }
  return 'Authorized as: ' + entry.displayName + ' — ' + entry.role;
}

// ── Fetch wrapper — every request (including GET) is authenticated ─────

function reviewSummariesApiRequest(pathAndQuery, options) {
  options = options || {};
  return ensureAuthorized().then(function (token) {
    var headers = { 'Authorization': 'Bearer ' + token };
    if (options.body) { headers['Content-Type'] = 'application/json'; }
    return fetch(STAFF_REVIEW_SUMMARIES_API_BASE + pathAndQuery, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store'
    });
  }, function () {
    // ensureAuthorized() rejected (dialog cancelled) — surface as
    // auth_cancelled, never send the request at all.
    var e = new Error('Authorization required.');
    e.code = 'auth_cancelled';
    throw e;
  }).then(function (res) {
    if (res.status === 401) {
      handleUnauthorizedResponse();
      var err = new Error('Authorization expired.');
      err.code = 'auth_required';
      throw err;
    }
    if (!res.ok) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        var err;
        // REQ-CAL-REV-LOCK-004 (2026-08-06) — same convention
        // calendar/instance.js's apiRequest already uses for
        // outcome_locked/outcome_recorded_immutable: read the backend's
        // own typed `error` field when present, rather than only ever
        // falling back to a generic status-code classification. Two
        // response shapes are recognized: a flat {error, message} body
        // (the JSONResponse-based 409s) and FastAPI's own
        // {detail: {error, message}} shape (raise HTTPException(...,
        // detail={...}) — REQ-CAL-REV-ATTACH-001's
        // attachment_storage_not_ready 503, 2026-09-23).
        var typed = (body && body.error) ? body
          : (body && body.detail && typeof body.detail === 'object' && body.detail.error) ? body.detail
          : null;
        if (typed && (
          typed.error === 'review_summary_edit_locked' ||
          typed.error === 'review_summary_delete_disabled' ||
          typed.error === 'attachment_storage_not_ready'
        )) {
          err = new Error(typed.message || 'Request failed.');
          err.code = typed.error;
        } else {
          err = new Error('Request failed.');
          err.code = classifyHttpStatus(res.status);
        }
        err.status = res.status;
        throw err;
      });
    }
    return res.json();
  }).catch(function (err) {
    if (!err.code) { err.code = 'network'; }
    throw err;
  });
}

/* GET /api/staff requires the same Calendar member token this whole
   workspace already requires just to be visible (currentAccess() below
   hides staffPanel — and therefore this field — entirely while
   unauthorized, REQ-AUTH-MODULES-007, 2026-08-10), so a stored token is
   always expected to be present by the time this is ever called; the
   Authorization header is added for correctness/defense-in-depth.

   2026-09-24: the staff selector is now a searchable dropdown that loads
   the whole directory once and filters it client-side by name, so this
   pages through GET /api/staff (page size = the backend's MAX_LIMIT,
   backend/routers/staff.py) until every record is loaded — a failure on
   ANY page rejects the whole load; a partial list is never presented as
   the full one. A record without an id can never be a valid
   reviewed_staff_id, so it is dropped rather than offered as an option.
   (2026-08-11: the staff_status / include-inactive filter was removed —
   StaffDashboardRecord.staff_status no longer exists.) */
var STAFF_DIRECTORY_PAGE_SIZE = 500;
var STAFF_DIRECTORY_MAX_PAGES = 20;

function fetchStaffPage(offset) {
  var token = getStoredToken();
  var options = { headers: token ? { 'Authorization': 'Bearer ' + token } : undefined };
  var query = 'limit=' + STAFF_DIRECTORY_PAGE_SIZE + '&offset=' + offset;
  return fetch(STAFF_API_BASE + '?' + query, options).then(function (res) {
    if (res.status === 401) {
      handleUnauthorizedResponse();
      var authErr = new Error('Authorization expired.');
      authErr.code = 'auth_required';
      throw authErr;
    }
    if (!res.ok) {
      var err = new Error('Staff lookup failed.');
      err.code = classifyHttpStatus(res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  });
}

function fetchStaffDirectory() {
  var all = [];
  function nextPage(offset, pagesFetched) {
    return fetchStaffPage(offset).then(function (body) {
      var records = (body && body.records) || [];
      all = all.concat(records);
      var total = body && typeof body.total === 'number' ? body.total : all.length;
      if (records.length && all.length < total && pagesFetched + 1 < STAFF_DIRECTORY_MAX_PAGES) {
        return nextPage(offset + records.length, pagesFetched + 1);
      }
      return all.filter(function (staff) { return staff && staff.id != null; });
    });
  }
  return nextPage(0, 0);
}

// ── DOM building ─────────────────────────────────────────────────────

function el(tag, className) {
  var node = document.createElement(tag);
  if (className) { node.className = className; }
  return node;
}

/* Renders summary text as safe plain text — textContent only, never
   innerHTML, with white-space: pre-wrap (review-summaries.css) so real
   newline/paragraph characters are visually preserved without ever
   inserting <br> or any other markup. HTML/script-like text therefore
   always displays literally and can never execute. */
function renderSummaryText(text) {
  var node = el('div', 'review-summary-text');
  node.textContent = text;
  return node;
}

/* Mounted exactly once (initReviewSummaries below), inside the new
   independent #tab-review-summaries panel — never per member. */
export function mountReviewSummariesWorkspace(mountEl) {
  if (!mountEl) { return null; }

  var state = {
    selectedStaff: null,
    reviewerFilter: '', // '' = All reviewers (include_all_reviewers=true)
    dateFrom: '',
    dateTo: '',
    editingId: null,
    // REQ-CAL-REV-ATTACH-001 (2026-09-23) — files selected/uploaded for the
    // NEXT create (CREATE only — see toggleAttachmentsVisibility). Each
    // item: {clientId, file, status: 'uploading'|'uploaded'|'error', id,
    // error}. Cleared on successful save and on employee change; never
    // persisted across a resetWorkspaceState().
    pendingAttachments: [],
    // Stale-request guard — bumped on every new history fetch AND on
    // every reset, so a slow in-flight request that resolves after a
    // newer one has superseded it never overwrites the current view.
    historyRequestId: 0,
    // PDF export in-flight guard (REQ-CAL-REV-PDF-003) — a plain-boolean
    // duplicate-click guard, same pattern as calendar/instance.js's own
    // exportInFlight for the weekly-schedule .xlsx download.
    exportInFlight: false,
    // Same guard, separate flag, for the ZIP export (REQ-CAL-REV-ATTACH-001)
    // — the two downloads are independent requests and must be able to run
    // one at a time each without one blocking the other's own button.
    zipExportInFlight: false,
    // Same guard, separate flag again, for "Download all reviews as one
    // PDF" (REQ-CAL-REV-HISTORY-PDF-001, 2026-09-23) — a third independent
    // download, never blocking or blocked by the other two.
    allReviewsExportInFlight: false
  };

  mountEl.textContent = '';

  function currentAccess() {
    return workspaceAccessDecision(getStoredMemberKey());
  }

  /* The ONLY path any request (read or write) may travel — every fetch
     call site below goes through this wrapper, so nothing is ever sent
     while unauthorized, regardless of which code path triggers it.
     Per-record write ownership (Edit/Delete) is enforced by button
     visibility (renderHistoryCard) plus the backend's own non-disclosing
     404 (technical design §5.0/§8) — this wrapper only gates on "is a
     token present at all," matching the two-state access model above. */
  function guardedRequest(pathAndQuery, options) {
    if (currentAccess() === 'unauthorized') {
      var err = new Error('Authorization required.');
      err.code = 'unauthorized_blocked';
      return Promise.reject(err);
    }
    return reviewSummariesApiRequest(pathAndQuery, options);
  }

  // ── Header ─────────────────────────────────────────────────────
  var headerEl = el('div', 'review-summaries-header');

  var authorizedAsEl = el('p', 'review-summaries-authorized-as');
  authorizedAsEl.hidden = true;

  function updateAuthorizedAsLabel() {
    var memberKey = getStoredMemberKey();
    if (!memberKey) { authorizedAsEl.hidden = true; return; }
    authorizedAsEl.textContent = authorizedAsLabelText(resolveMember(memberKey));
    authorizedAsEl.hidden = false;
  }
  updateAuthorizedAsLabel();

  var subheading = el('p', 'review-summaries-subheading');
  subheading.textContent =
    'Readable by every authenticated Management Team member. Only the reviewer who ' +
    'created a summary can edit or delete it. The reviewed staff member has no access.';
  headerEl.appendChild(authorizedAsEl);
  headerEl.appendChild(subheading);

  // ── Unauthorized prompt — shown INSTEAD of the staff/form/history
  //    panels whenever currentAccess() returns 'unauthorized'. The nav
  //    item itself always stays visible/clickable (index.html); this is
  //    the in-panel gate. ──────────────────────────────────────────────
  var unauthorizedEl = el('div', 'review-summaries-unauthorized');
  unauthorizedEl.setAttribute('role', 'alert');
  unauthorizedEl.hidden = true;
  var unauthorizedMessageEl = el('p', 'review-summaries-unauthorized-message');
  unauthorizedMessageEl.textContent =
    'Authorization required to view Review Summaries. Enter a Management Team member token to continue.';
  var authorizeBtn = el('button', 'msc-btn msc-btn-primary review-summaries-authorize-btn');
  authorizeBtn.type = 'button';
  authorizeBtn.textContent = 'Authorize this browser';
  authorizeBtn.addEventListener('click', function () {
    ensureAuthorized().catch(function () { /* dialog cancelled — stays unauthorized */ });
  });
  unauthorizedEl.appendChild(unauthorizedMessageEl);
  unauthorizedEl.appendChild(authorizeBtn);
  headerEl.appendChild(unauthorizedEl);

  // ── Reviewed-staff selector — searchable dropdown ────────────────
  //    (2026-09-24) The whole staff directory is loaded once through the
  //    existing authorized GET /api/staff (fetchStaffDirectory) the first
  //    time the field is focused/typed in; typing then filters that list
  //    client-side by name. Only an option chosen from the list ever calls
  //    selectStaff() — typed text alone never selects anyone.
  var staffUid = 'review-summaries-staff-' + (++mountCounter);
  var staffPanel = el('div', 'review-summaries-panel review-summaries-staff-panel');
  var staffPanelTitle = el('h5', 'review-summaries-step-title');
  staffPanelTitle.id = staffUid + '-title';
  staffPanelTitle.textContent = '1. Select employee';
  var staffField = el('div', 'review-summaries-field');
  var staffSearchWrap = el('div', 'review-summaries-search-wrap');
  var staffSearchInput = el('input', 'review-summaries-staff-search');
  staffSearchInput.type = 'search';
  staffSearchInput.placeholder = 'Click to choose, or type to search by name…';
  staffSearchInput.setAttribute('aria-labelledby', staffPanelTitle.id);
  staffSearchInput.setAttribute('autocomplete', 'off');
  staffSearchInput.setAttribute('role', 'combobox');
  staffSearchInput.setAttribute('aria-expanded', 'false');
  staffSearchInput.setAttribute('aria-autocomplete', 'list');
  staffSearchInput.setAttribute('aria-haspopup', 'listbox');

  // staffResultsEl is the popup box; it holds exactly one of two children
  // at a time — the listbox of options, or a status/error message.
  var staffResultsEl = el('div', 'review-summaries-staff-results');
  staffResultsEl.hidden = true;
  var staffListEl = el('div', 'review-summaries-staff-list');
  staffListEl.id = staffUid + '-listbox';
  staffListEl.setAttribute('role', 'listbox');
  staffListEl.setAttribute('aria-label', 'Matching staff');
  staffListEl.hidden = true;
  var staffMessageEl = el('div', 'review-summaries-staff-result-empty');
  staffMessageEl.hidden = true;
  staffResultsEl.appendChild(staffListEl);
  staffResultsEl.appendChild(staffMessageEl);
  staffSearchInput.setAttribute('aria-controls', staffListEl.id);
  // Keeps focus in the input when the popup itself (an option, the
  // scrollbar, Retry) is pressed — otherwise the input's blur would close
  // the popup before the click lands.
  staffResultsEl.addEventListener('mousedown', function (e) { e.preventDefault(); });

  var staffResultHighlightIndex = -1;
  staffSearchWrap.appendChild(staffSearchInput);
  staffSearchWrap.appendChild(staffResultsEl);
  var selectedStaffEl = el('div', 'review-summaries-selected-staff');
  selectedStaffEl.hidden = true;

  staffField.appendChild(staffSearchWrap);
  staffField.appendChild(selectedStaffEl);
  staffPanel.appendChild(staffPanelTitle);
  staffPanel.appendChild(staffField);

  /* The loaded directory. status: 'idle' (not loaded) | 'loading' |
     'ready' | 'error'. loadId guards against a superseded/invalidated
     load repopulating it (same idea as state.historyRequestId). */
  var staffDirectory = { status: 'idle', records: [], errorText: '', loadId: 0 };
  var suppressStaffPopupOpen = false;

  function invalidateStaffDirectory() {
    staffDirectory.loadId += 1;
    staffDirectory.status = 'idle';
    staffDirectory.records = [];
    staffDirectory.errorText = '';
  }

  /* Name filter — case-insensitive substring match on `name` only. */
  function filterStaffByName(records, query) {
    var needle = String(query || '').trim().toLowerCase();
    if (!needle) { return records; }
    return records.filter(function (staff) {
      return String(staff.name || '').toLowerCase().indexOf(needle) !== -1;
    });
  }

  function staffResultButtons() {
    return Array.prototype.slice.call(staffListEl.querySelectorAll('.review-summaries-staff-result'));
  }

  /* Keyboard selection — ArrowDown/ArrowUp move a highlighted option
     (wrapping at either end), Enter selects the highlighted option, Escape
     closes the list without selecting. Enter with nothing highlighted does
     nothing: typed text alone never selects a staff member. Mouse hover
     keeps the highlight in sync with the pointer so the two input methods
     never disagree about which option is "current". */
  function setStaffResultHighlight(index) {
    var buttons = staffResultButtons();
    if (!buttons.length) { staffResultHighlightIndex = -1; return; }
    if (index < 0) { index = buttons.length - 1; }
    if (index >= buttons.length) { index = 0; }
    staffResultHighlightIndex = index;
    buttons.forEach(function (btn, i) {
      var active = i === index;
      btn.classList.toggle('review-summaries-staff-result--active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    staffSearchInput.setAttribute('aria-activedescendant', buttons[index].id);
    // Guarded — not every DOM stand-in (e.g. the hand-rolled test one)
    // implements scrollIntoView; keyboard selection must still work
    // without it, it just won't auto-scroll in that environment.
    if (typeof buttons[index].scrollIntoView === 'function') {
      buttons[index].scrollIntoView({ block: 'nearest' });
    }
  }

  function showStaffMessage(text, isError, withRetry) {
    staffListEl.hidden = true;
    staffListEl.textContent = '';
    staffResultHighlightIndex = -1;
    staffSearchInput.removeAttribute('aria-activedescendant');
    staffMessageEl.textContent = '';
    staffMessageEl.removeAttribute('aria-busy');
    staffMessageEl.setAttribute('role', isError ? 'alert' : 'status');
    staffMessageEl.classList.toggle('review-summaries-staff-result-empty--error', !!isError);
    staffMessageEl.appendChild(document.createTextNode(text));
    if (withRetry) {
      var retryBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-staff-retry-btn');
      retryBtn.type = 'button';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', function () {
        invalidateStaffDirectory();
        loadStaffDirectory();
        renderStaffPopup();
      });
      staffMessageEl.appendChild(retryBtn);
    }
    staffMessageEl.hidden = false;
  }

  /* Draws the popup's content from the directory status + current query.
     Never treats a failed load as an empty list — 'error' has its own
     message and a Retry button. */
  function renderStaffPopup() {
    if (staffResultsEl.hidden) { return; }
    if (staffDirectory.status === 'loading' || staffDirectory.status === 'idle') {
      staffListEl.hidden = true;
      staffResultHighlightIndex = -1;
      staffSearchInput.removeAttribute('aria-activedescendant');
      showInlineLoading(staffMessageEl, 'Loading staff…');
      staffMessageEl.setAttribute('role', 'status');
      staffMessageEl.classList.remove('review-summaries-staff-result-empty--error');
      staffMessageEl.hidden = false;
      return;
    }
    if (staffDirectory.status === 'error') {
      showStaffMessage(staffDirectory.errorText, true, true);
      return;
    }
    if (!staffDirectory.records.length) {
      showStaffMessage('No staff records are available.', false, false);
      return;
    }
    var matches = filterStaffByName(staffDirectory.records, staffSearchInput.value);
    if (!matches.length) {
      showStaffMessage('No matching staff', false, false);
      return;
    }
    staffMessageEl.hidden = true;
    staffMessageEl.textContent = '';
    staffMessageEl.removeAttribute('aria-busy');
    staffListEl.textContent = '';
    staffResultHighlightIndex = -1;
    staffSearchInput.removeAttribute('aria-activedescendant');
    matches.forEach(function (staff, index) {
      var btn = el('button', 'review-summaries-staff-result');
      btn.type = 'button';
      btn.id = staffUid + '-option-' + staff.id;
      btn.setAttribute('tabindex', '-1');
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', 'false');
      btn.textContent = staffSearchResultLabel(staff);
      btn.addEventListener('mouseenter', function () { setStaffResultHighlight(index); });
      btn.addEventListener('click', function () { selectStaff(staff); });
      staffListEl.appendChild(btn);
    });
    staffListEl.hidden = false;
  }

  function loadStaffDirectory() {
    if (staffDirectory.status === 'loading' || staffDirectory.status === 'ready') { return; }
    if (currentAccess() === 'unauthorized') { return; }
    staffDirectory.status = 'loading';
    var loadId = ++staffDirectory.loadId;
    fetchStaffDirectory().then(function (records) {
      if (loadId !== staffDirectory.loadId) { return; } // invalidated (auth change / tab leave / retry)
      staffDirectory.records = records;
      staffDirectory.status = 'ready';
      renderStaffPopup();
    }).catch(function (err) {
      if (loadId !== staffDirectory.loadId) { return; }
      // auth_required (401): handleUnauthorizedResponse() already fired
      // CALENDAR_AUTH_CHANGED_EVENT, so the access gate has taken over.
      if (err && err.code === 'auth_required') { return; }
      if (!err.code) { err.code = 'network'; }
      var mapped = mapApiError(err);
      staffDirectory.status = 'error';
      staffDirectory.errorText = 'Could not load the staff list. ' + mapped.message;
      renderStaffPopup();
    });
  }

  /* A failed load is retried automatically whenever the field is opened
     (focus / click / arrow key), but NOT on every keystroke while typing —
     otherwise a down API would be re-hit per character; Retry covers that. */
  function openStaffPopup(fromTyping) {
    staffResultsEl.hidden = false;
    staffSearchInput.setAttribute('aria-expanded', 'true');
    if (!(fromTyping === true && staffDirectory.status === 'error')) { loadStaffDirectory(); }
    renderStaffPopup();
  }

  function closeStaffPopup() {
    staffResultsEl.hidden = true;
    staffSearchInput.setAttribute('aria-expanded', 'false');
    staffSearchInput.removeAttribute('aria-activedescendant');
    staffResultHighlightIndex = -1;
  }

  staffSearchInput.addEventListener('focus', function () {
    if (suppressStaffPopupOpen) { return; }
    openStaffPopup();
  });
  staffSearchInput.addEventListener('click', function () {
    // Reopens after Escape / an accidental close while focus stayed here.
    if (staffResultsEl.hidden) { openStaffPopup(); }
  });
  staffSearchInput.addEventListener('blur', closeStaffPopup);
  staffSearchInput.addEventListener('input', function () { openStaffPopup(true); });

  staffSearchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!staffResultsEl.hidden) {
        e.preventDefault();
        closeStaffPopup();
      }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (staffResultsEl.hidden) { openStaffPopup(); return; }
      if (!staffResultButtons().length) { return; }
      setStaffResultHighlight(staffResultHighlightIndex + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter') {
      var buttons = staffResultButtons();
      if (!staffResultsEl.hidden && staffResultHighlightIndex >= 0 && buttons[staffResultHighlightIndex]) {
        e.preventDefault();
        buttons[staffResultHighlightIndex].click();
      }
    }
  });

  /* Shared by resetWorkspaceState() (the single central reset, defined
     below) — resets the staff-selector UI back to its pre-selection
     state. Never called on its own to "partially" clear state; every
     caller that needs to deselect goes through resetWorkspaceState(). */
  function deselectStaff() {
    state.selectedStaff = null;
    selectedStaffEl.hidden = true;
    selectedStaffEl.textContent = '';
    staffSearchInput.value = '';
    staffSearchInput.hidden = false;
    closeStaffPopup();
    staffListEl.textContent = '';
    staffListEl.hidden = true;
    staffMessageEl.textContent = '';
    staffMessageEl.hidden = true;
  }

  function selectStaff(staff) {
    // Only a real directory record (with an id) can ever become the
    // selected staff member.
    if (!staff || staff.id == null) { return; }
    var inputHadFocus = document.activeElement === staffSearchInput;
    // A fresh employee always starts from the exact same clean baseline —
    // reviewer filter back to "All reviewers", date filters cleared, no
    // inherited history/edit/draft state from whichever employee (if any)
    // was previously selected (Phase 3 correction, 2026-08-06).
    resetWorkspaceState();
    state.selectedStaff = staff;
    selectedStaffEl.textContent = '';
    var nameEl = el('span', 'review-summaries-selected-staff-name');
    nameEl.textContent = staffOptionLabel(staff);
    var changeBtn = el('button', 'review-summaries-change-staff');
    changeBtn.type = 'button';
    changeBtn.textContent = 'Change';
    changeBtn.setAttribute('aria-label', 'Change selected employee');
    changeBtn.addEventListener('click', function () {
      resetWorkspaceState();
      staffSearchInput.focus();
      openStaffPopup();
      renderHistory();
    });
    var clearBtn = el('button', 'review-summaries-change-staff review-summaries-clear-staff');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.setAttribute('aria-label', 'Clear selected employee');
    clearBtn.addEventListener('click', function () {
      resetWorkspaceState();
      // Back to an empty field, list closed — Change is the "pick another
      // now" path; Clear just deselects.
      suppressStaffPopupOpen = true;
      staffSearchInput.focus();
      suppressStaffPopupOpen = false;
      renderHistory();
    });
    selectedStaffEl.appendChild(nameEl);
    selectedStaffEl.appendChild(changeBtn);
    selectedStaffEl.appendChild(clearBtn);
    selectedStaffEl.hidden = false;
    staffSearchInput.hidden = true;
    // The input just became hidden — keep keyboard focus somewhere sensible
    // instead of dropping it to <body>.
    if (inputHadFocus) { changeBtn.focus(); }
    updateFormVisibility();
    updateExportButtonState();
    renderHistory();
  }

  // ── Create / edit form ───────────────────────────────────────────
  var formPanel = el('div', 'review-summaries-panel review-summaries-form-panel');
  var formPanelTitle = el('h5', 'review-summaries-step-title');
  formPanelTitle.textContent = '2. Add review summary';
  var formPlaceholder = el('p', 'review-summaries-form-placeholder');
  formPlaceholder.textContent = 'Select a staff member above to write a summary.';

  // MD (REQ-CAL-REV-MD-READ-006, 2026-08-06) — shown in place of the
  // creation form/placeholder for a read-only authenticated identity.
  // Purely presentational: the real enforcement is the backend's own 403
  // on CREATE/UPDATE (backend/routers/staff_review_summaries.py
  // _reject_md_write) — this notice only explains why the form never
  // appears, so a read-only viewer isn't left wondering.
  var readOnlyNoticeEl = el('p', 'review-summaries-readonly-notice');
  readOnlyNoticeEl.textContent = 'Read-only access — MD can view and download Review Summaries but cannot create or edit them.';
  readOnlyNoticeEl.hidden = true;

  var form = el('form', 'review-summaries-form');
  form.setAttribute('novalidate', 'novalidate');
  form.hidden = true;

  var dateFieldGroup = el('div', 'review-summaries-field-group');
  var dateLabel = el('label', 'review-summaries-label');
  dateLabel.textContent = 'Meeting date';
  var dateInput = el('input', 'review-summaries-date-input');
  dateInput.type = 'date';
  dateInput.value = getColomboTodayStr();
  dateFieldGroup.appendChild(dateLabel);
  dateFieldGroup.appendChild(dateInput);

  var summaryFieldGroup = el('div', 'review-summaries-field-group');
  var summaryLabelRow = el('div', 'review-summaries-summary-label-row');
  var summaryLabel = el('label', 'review-summaries-label');
  summaryLabel.textContent = 'Summary';
  var counterEl = el('span', 'review-summaries-counter');
  counterEl.textContent = summaryCounterText('');
  summaryLabelRow.appendChild(summaryLabel);
  summaryLabelRow.appendChild(counterEl);
  var summaryTextarea = el('textarea', 'review-summaries-textarea');
  summaryTextarea.setAttribute('maxlength', String(SUMMARY_MAX_LENGTH));
  summaryTextarea.setAttribute('placeholder', 'What was discussed? Preserve paragraphs and line breaks as needed.');
  summaryTextarea.rows = 6;
  summaryFieldGroup.appendChild(summaryLabelRow);
  summaryFieldGroup.appendChild(summaryTextarea);

  summaryTextarea.addEventListener('input', function () {
    counterEl.textContent = summaryCounterText(summaryTextarea.value);
    counterEl.classList.toggle('review-summaries-counter--warning', isSummaryCounterWarning(summaryTextarea.value));
    if (summaryTextarea.value.trim()) { clearFieldError(summaryTextarea); }
  });

  // ── Attachments (REQ-CAL-REV-ATTACH-001, 2026-09-23) — CREATE only; the
  //    same-day edit form (StaffReviewSummaryUpdate) has no attachment_ids
  //    field at all, so this whole section is hidden while editing an
  //    existing summary (see toggleAttachmentsVisibility below). Each
  //    selected file is uploaded IMMEDIATELY (POST .../attachments) rather
  //    than deferred to Save — this is what lets Save show real per-file
  //    upload state (uploading/uploaded/failed) instead of one opaque
  //    "Saving…" that could hide a mid-flight failure. Only files that
  //    finish with status 'uploaded' are ever included in attachment_ids
  //    on Save; the summary can never be created referencing a file that
  //    is not already durably stored (backend/routers/
  //    staff_review_summaries.py create_staff_review_summary). ──────────
  var attachmentsFieldGroup = el('div', 'review-summaries-field-group review-summaries-attachments-group');
  var attachmentsLabel = el('label', 'review-summaries-label');
  attachmentsLabel.textContent = 'Attachments (optional)';
  var attachmentsHint = el('p', 'review-summaries-attachments-hint');
  attachmentsHint.textContent =
    'Audio, Word, Excel, images, and PDF. Up to ' + MAX_ATTACHMENTS_PER_SUMMARY + ' files, '
    + Math.floor(MAX_ATTACHMENT_FILE_SIZE_BYTES / (1024 * 1024)) + ' MB each.';
  /* Always visible (2026-09-25): attachment-only reviews are a pending
     requirement, NOT a working feature — the database (summary_text NOT
     NULL + non-blank CHECK), the backend schema and validateSummaryText all
     still require written text. Say so instead of implying otherwise. */
  var attachmentsRequirementNoteEl = el('p', 'review-summaries-attachments-requirement-note');
  attachmentsRequirementNoteEl.textContent = ATTACHMENT_ONLY_UNAVAILABLE_NOTE;

  /* Local Prototype Attachment mode (REQ-CAL-REV-ATTACH-001-LOCAL-PROTO,
     2026-09-23) — GET .../attachments/storage-mode reports which
     attachment metadata backend the server is currently running with
     (backend/config.py LOCAL_PROTOTYPE_ATTACHMENTS). Purely a display
     label: every validation/authorization rule is identical either way,
     so this never changes any request this module sends — it only tells
     the reviewer, honestly, that attachment metadata for this session is
     local-only and will not transfer to another machine. */
  var attachmentsStorageModeNoteEl = el('p', 'review-summaries-attachments-storage-mode-note');
  attachmentsStorageModeNoteEl.hidden = true;
  var storageModeChecked = false;

  /* 2026-09-25: shows the TRUE active state instead of only ever warning.
       local_prototype -> the warning (metadata still on this computer's SQLite file);
       postgres        -> a neutral "shared database" status (the warning is gone
                          only because the backend itself reports postgres);
       anything else   -> nothing (never claim a state the backend did not report). */
  function applyAttachmentStorageMode(mode) {
    attachmentsStorageModeNoteEl.classList.remove(
      'review-summaries-attachments-storage-mode-note--local',
      'review-summaries-attachments-storage-mode-note--shared'
    );
    if (mode === 'local_prototype') {
      attachmentsStorageModeNoteEl.textContent =
        'Local prototype storage — original files are stored in Cloudinary; ' +
        'which files belong to which summary is tracked only on this computer ' +
        'and will not transfer to another machine or deployment.';
      attachmentsStorageModeNoteEl.classList.add('review-summaries-attachments-storage-mode-note--local');
      attachmentsStorageModeNoteEl.hidden = false;
    } else if (mode === 'postgres') {
      attachmentsStorageModeNoteEl.textContent =
        'Attachments are saved to the shared database; original files are stored in Cloudinary.';
      attachmentsStorageModeNoteEl.classList.add('review-summaries-attachments-storage-mode-note--shared');
      attachmentsStorageModeNoteEl.hidden = false;
    } else {
      attachmentsStorageModeNoteEl.hidden = true;
      attachmentsStorageModeNoteEl.textContent = '';
    }
  }

  function ensureAttachmentStorageModeLoaded() {
    if (storageModeChecked || currentAccess() === 'unauthorized') { return; }
    storageModeChecked = true;
    guardedRequest('/attachments/storage-mode').then(function (body) {
      applyAttachmentStorageMode(body && body.mode);
    }).catch(function () {
      storageModeChecked = false; // allow a retry on the next panel show
    });
  }

  var attachmentsFileInput = el('input', 'review-summaries-attachments-input');
  attachmentsFileInput.type = 'file';
  attachmentsFileInput.multiple = true;
  attachmentsFileInput.id = 'review-summaries-attachments-input';
  attachmentsFileInput.setAttribute(
    'accept',
    Object.keys(ATTACHMENT_EXTENSION_TYPES).join(',')
  );
  var attachmentsAddBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-attachments-add-btn');
  attachmentsAddBtn.type = 'button';
  attachmentsAddBtn.textContent = 'Add files';
  attachmentsAddBtn.addEventListener('click', function () {
    ensureAttachmentStorageModeLoaded();
    attachmentsFileInput.click();
  });
  var attachmentsListEl = el('ul', 'review-summaries-attachments-list');
  attachmentsListEl.setAttribute('aria-live', 'polite');

  attachmentsFieldGroup.appendChild(attachmentsLabel);
  attachmentsFieldGroup.appendChild(attachmentsHint);
  attachmentsFieldGroup.appendChild(attachmentsRequirementNoteEl);
  attachmentsFieldGroup.appendChild(attachmentsStorageModeNoteEl);
  attachmentsFieldGroup.appendChild(attachmentsAddBtn);
  attachmentsFieldGroup.appendChild(attachmentsFileInput);
  attachmentsFieldGroup.appendChild(attachmentsListEl);

  var attachmentClientIdCounter = 0;

  function toggleAttachmentsVisibility() {
    attachmentsFieldGroup.hidden = !!state.editingId;
  }

  function pendingAttachmentCount() {
    return state.pendingAttachments.filter(function (a) { return a.status !== 'removed'; }).length;
  }

  function renderPendingAttachments() {
    attachmentsListEl.textContent = '';
    state.pendingAttachments.forEach(function (item) {
      if (item.status === 'removed') { return; }
      var row = el('li', 'review-summaries-attachment-row review-summaries-attachment-row--' + item.status);
      var nameEl = el('span', 'review-summaries-attachment-name');
      nameEl.textContent = item.file.name;
      var sizeEl = el('span', 'review-summaries-attachment-size');
      sizeEl.textContent = formatAttachmentFileSize(item.file.size);
      var statusEl = el('span', 'review-summaries-attachment-status');
      if (item.status === 'uploading') { statusEl.textContent = 'Uploading…'; }
      else if (item.status === 'uploaded') { statusEl.textContent = 'Uploaded'; }
      else if (item.status === 'error') { statusEl.textContent = item.error || 'Upload failed'; }
      row.appendChild(nameEl);
      row.appendChild(sizeEl);
      row.appendChild(statusEl);

      if (item.status === 'error') {
        var retryBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-attachment-retry-btn');
        retryBtn.type = 'button';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', function () { uploadPendingAttachment(item); });
        row.appendChild(retryBtn);
      }

      var removeBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-attachment-remove-btn');
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', 'Remove ' + item.file.name);
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', function () { removePendingAttachment(item.clientId); });
      row.appendChild(removeBtn);

      attachmentsListEl.appendChild(row);
    });
  }

  function removePendingAttachment(clientId) {
    // A file already uploaded (status 'uploaded'/'error' with an
    // assigned server id) is simply never referenced in attachment_ids —
    // its already-uploaded bytes become an orphaned pending row, swept up
    // later by scripts/cleanup_pending_review_summary_attachments.py
    // (there is no delete-attachment route in this phase; see the
    // migration file's own docstring for the full two-phase rationale).
    state.pendingAttachments = state.pendingAttachments.filter(function (a) { return a.clientId !== clientId; });
    renderPendingAttachments();
  }

  function uploadPendingAttachment(item) {
    item.status = 'uploading';
    item.error = null;
    renderPendingAttachments();

    var formData = new FormData();
    formData.append('file', item.file, item.file.name);

    ensureAuthorized().then(function (token) {
      return fetch(STAFF_REVIEW_SUMMARIES_API_BASE + '/attachments', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });
    }, function () {
      var e = new Error('Authorization required.');
      e.code = 'auth_cancelled';
      throw e;
    }).then(function (res) {
      if (res.status === 401) {
        handleUnauthorizedResponse();
        var authErr = new Error('Authorization expired.');
        authErr.code = 'auth_required';
        throw authErr;
      }
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          // `detail` is either a plain string (every existing validation
          // failure — 422 unsupported type, 413 too large, 502 upload
          // failed, ...) or an object {error, message} (REQ-CAL-REV-
          // ATTACH-001's attachment_storage_not_ready 503, 2026-09-23).
          // Reading only the string form here (as this used to) would
          // stringify the object form to the useless literal
          // "[object Object]" instead of a real, actionable message.
          var detail = body && body.detail;
          var message = typeof detail === 'string' ? detail
            : (detail && typeof detail === 'object' && detail.message) ? detail.message
            : null;
          var err = new Error(message || 'Upload failed.');
          err.status = res.status;
          err.code = detail && typeof detail === 'object' ? detail.error : null;
          throw err;
        });
      }
      return res.json();
    }).then(function (body) {
      item.status = 'uploaded';
      item.id = body.id;
      renderPendingAttachments();
    }).catch(function (err) {
      if (err && (err.code === 'auth_cancelled' || err.code === 'auth_required')) {
        item.status = 'error';
        item.error = 'Authorization required. Choose Add files again after authorizing.';
      } else {
        item.status = 'error';
        item.error = (err && err.message) || 'Upload failed.';
      }
      renderPendingAttachments();
    });
  }

  function addFilesToPending(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    files.forEach(function (file) {
      if (pendingAttachmentCount() >= MAX_ATTACHMENTS_PER_SUMMARY) {
        showToast({
          type: 'error', title: 'Too many files',
          message: 'Up to ' + MAX_ATTACHMENTS_PER_SUMMARY + ' attachments per summary.', persistent: false
        });
        return;
      }
      var validation = validateAttachmentFile(file);
      attachmentClientIdCounter += 1;
      var item = {
        clientId: 'att-' + attachmentClientIdCounter,
        file: file,
        status: validation.valid ? 'uploading' : 'error',
        error: validation.valid ? null : validation.error,
        id: null
      };
      state.pendingAttachments.push(item);
      renderPendingAttachments();
      if (validation.valid) { uploadPendingAttachment(item); }
    });
  }

  attachmentsFileInput.addEventListener('change', function () {
    addFilesToPending(attachmentsFileInput.files);
    attachmentsFileInput.value = ''; // allow re-selecting the same file after removal
  });

  function resetPendingAttachments() {
    state.pendingAttachments = [];
    renderPendingAttachments();
  }

  var formActions = el('div', 'review-summaries-form-actions');
  var saveBtn = el('button', 'msc-btn msc-btn-primary review-summaries-save-btn');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save Summary';

  var cancelEditBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-cancel-edit-btn');
  cancelEditBtn.type = 'button';
  cancelEditBtn.textContent = 'Cancel edit';
  cancelEditBtn.hidden = true;
  cancelEditBtn.addEventListener('click', function () { exitEditMode(); });
  formActions.appendChild(saveBtn);
  formActions.appendChild(cancelEditBtn);

  form.appendChild(dateFieldGroup);
  form.appendChild(summaryFieldGroup);
  form.appendChild(attachmentsFieldGroup);
  form.appendChild(formActions);

  formPanel.appendChild(formPanelTitle);
  formPanel.appendChild(formPlaceholder);
  formPanel.appendChild(readOnlyNoticeEl);
  formPanel.appendChild(form);

  /* The form is only shown once a staff member is chosen. */
  function updateFormVisibility() {
    var readOnly = isReadOnlyMember(getStoredMemberKey());
    var hasStaff = !!state.selectedStaff;
    formPanelTitle.hidden = readOnly;
    readOnlyNoticeEl.hidden = !readOnly;
    form.hidden = readOnly || !hasStaff;
    formPlaceholder.hidden = readOnly || hasStaff;
  }
  updateFormVisibility();
  toggleAttachmentsVisibility();

  /* Edit mode / unsaved-draft clearing — called on: Cancel edit, employee
     change, reviewer-filter change, date-filter change, token change, and
     leaving the dedicated tab (technical design §7). Never silently
     merges a stale draft into a new context. */
  function exitEditMode() {
    state.editingId = null;
    saveBtn.textContent = 'Save Summary';
    cancelEditBtn.hidden = true;
    summaryTextarea.value = '';
    dateInput.value = getColomboTodayStr();
    counterEl.textContent = summaryCounterText('');
    clearFormErrors(form);
    resetPendingAttachments();
    toggleAttachmentsVisibility();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearFormErrors(form);

    if (!state.selectedStaff) {
      showToast({ type: 'error', title: 'Select a staff member', message: 'Choose a reviewed staff member before saving.', persistent: false });
      return;
    }
    if (!dateInput.value) {
      setFieldError(dateInput, 'Choose a meeting date.');
      focusFirstInvalid(form);
      return;
    }
    var validation = validateSummaryText(summaryTextarea.value);
    if (!validation.valid) {
      var hasUploadedAttachment = !state.editingId && state.pendingAttachments.some(function (a) {
        return a.status === 'uploaded';
      });
      setFieldError(
        summaryTextarea,
        hasUploadedAttachment && !validation.trimmed ? ATTACHMENT_ONLY_UNAVAILABLE_NOTE : validation.error
      );
      focusFirstInvalid(form);
      return;
    }

    // REQ-CAL-REV-ATTACH-001 — a failed/still-in-flight attachment upload
    // must block Save (client-side defense in depth; the backend's own
    // atomic attachment_ids validation is the real enforcement — see
    // create_staff_review_summary). CREATE only; attachmentsFieldGroup is
    // hidden while editing, so state.pendingAttachments is always empty on
    // an update submit.
    if (!state.editingId) {
      var hasUnresolvedAttachment = state.pendingAttachments.some(function (a) {
        return a.status === 'uploading' || a.status === 'error';
      });
      if (hasUnresolvedAttachment) {
        showToast({
          type: 'error', title: 'Attachments not ready',
          message: 'Wait for uploads to finish, or remove any failed attachment, before saving.',
          persistent: false
        });
        return;
      }
    }

    setButtonBusy(saveBtn, true, { busyLabel: 'Saving…' });

    // The staff member this submit was built for — if the reviewer changes
    // or clears the employee while the request is in flight, the response
    // must neither name the NEW employee in its toast nor clear/refresh
    // the new employee's (empty) form and history.
    var submittedStaff = state.selectedStaff;
    var request;
    if (state.editingId) {
      request = guardedRequest('/' + state.editingId, {
        method: 'PUT',
        body: { meeting_date: dateInput.value, summary_text: validation.trimmed }
      });
    } else {
      // reviewed_staff_id, meeting_date, summary_text, attachment_ids only
      // — the browser never sends reviewer_member_key (technical design
      // §5.3/§2.9); the create schema has no such field, so ownership is
      // always server-derived from the token regardless of request
      // contents. attachment_ids references only already-uploaded
      // ('uploaded' status) pending attachments.
      var attachmentIds = state.pendingAttachments
        .filter(function (a) { return a.status === 'uploaded' && a.id; })
        .map(function (a) { return a.id; });
      request = guardedRequest('', {
        method: 'POST',
        body: {
          reviewed_staff_id: state.selectedStaff.id,
          meeting_date: dateInput.value,
          summary_text: validation.trimmed,
          attachment_ids: attachmentIds
        }
      });
    }

    request.then(function () {
      setButtonBusy(saveBtn, false);
      showToast({
        type: 'success',
        title: state.editingId ? 'Summary updated' : 'Summary saved',
        message: staffOptionLabel(submittedStaff) + ' — ' + dateInput.value
      });
      if (state.selectedStaff !== submittedStaff) { return; }
      exitEditMode();
      renderHistory();
    }).catch(function (err) {
      setButtonBusy(saveBtn, false);
      // REQ-CAL-REV-LOCK-004 (2026-08-06) — the creation-day edit window
      // can close between when this card was last rendered and when the
      // user actually submits (e.g. the popup was left open across the
      // Colombo midnight boundary, same class of case
      // calendar/instance.js's Task Outcome flow already documents for
      // outcome_locked). Exit edit mode and re-fetch so the card
      // re-renders with its now-current, backend-authoritative can_edit
      // state — never leaves the form stuck open against a record that
      // can no longer be saved.
      if (err && err.code === 'review_summary_edit_locked' && state.selectedStaff === submittedStaff) {
        exitEditMode();
        renderHistory();
      }
      var mapped = mapApiError(err);
      showToast({ type: 'error', title: mapped.title, message: mapped.message, persistent: mapped.persistent });
    });
  });

  // ── Filters + history ────────────────────────────────────────────
  var historyPanel = el('div', 'review-summaries-panel review-summaries-history-panel');
  var historyPanelTitle = el('h5', 'review-summaries-step-title');
  historyPanelTitle.textContent = '3. Review history';

  /* REQ-CAL-REV-UX-005 — Reviewer/From/To/Download PDF now share one
     toolbar container (review-summaries.css) so Download PDF reads as
     visually associated with the filters it applies to, rather than as
     an unrelated block below them. Desktop: one row. Narrow: Reviewer
     full-width, From/To paired, Download PDF full-width. */
  var toolbarEl = el('div', 'review-summaries-toolbar');

  var reviewerFilterGroup = el('div', 'review-summaries-filter-field');
  var reviewerFilterLabel = el('label', 'review-summaries-label');
  reviewerFilterLabel.textContent = 'Reviewer';
  var reviewerFilterSelect = el('select', 'review-summaries-reviewer-select');
  var allReviewersOption = el('option');
  allReviewersOption.value = '';
  allReviewersOption.textContent = 'All reviewers';
  reviewerFilterSelect.appendChild(allReviewersOption);
  REVIEWER_FILTER_ORDER.forEach(function (memberKey) {
    var entry = resolveMember(memberKey);
    var option = el('option');
    option.value = memberKey;
    option.textContent = entry.displayName;
    reviewerFilterSelect.appendChild(option);
  });
  reviewerFilterGroup.appendChild(reviewerFilterLabel);
  reviewerFilterGroup.appendChild(reviewerFilterSelect);

  var dateFromGroup = el('div', 'review-summaries-filter-field');
  var dateFromLabel = el('label', 'review-summaries-label');
  dateFromLabel.textContent = 'From';
  var dateFromInput = el('input', 'review-summaries-date-from');
  dateFromInput.type = 'date';
  dateFromGroup.appendChild(dateFromLabel);
  dateFromGroup.appendChild(dateFromInput);

  var dateToGroup = el('div', 'review-summaries-filter-field');
  var dateToLabel = el('label', 'review-summaries-label');
  dateToLabel.textContent = 'To';
  var dateToInput = el('input', 'review-summaries-date-to');
  dateToInput.type = 'date';
  dateToGroup.appendChild(dateToLabel);
  dateToGroup.appendChild(dateToInput);

  toolbarEl.appendChild(reviewerFilterGroup);
  toolbarEl.appendChild(dateFromGroup);
  toolbarEl.appendChild(dateToGroup);

  /* Reviewer-filter / date-filter change (technical design §7) — clears
     stale detail/edit state (a card being edited under the old filter set
     may no longer even be in view) and re-fetches. */
  reviewerFilterSelect.addEventListener('change', function () {
    state.reviewerFilter = reviewerFilterSelect.value;
    exitEditMode();
    updateExportButtonState();
    renderHistory();
  });
  dateFromInput.addEventListener('change', function () {
    state.dateFrom = dateFromInput.value;
    exitEditMode();
    updateExportButtonState();
    renderHistory();
  });
  dateToInput.addEventListener('change', function () {
    state.dateTo = dateToInput.value;
    exitEditMode();
    updateExportButtonState();
    renderHistory();
  });

  // ── PDF export (REQ-CAL-REV-PDF-003) — one page-level button near the
  //    Review History filters, never one button per record. ──────────────
  var exportGroupEl = el('div', 'review-summaries-toolbar-export');
  var exportBtn = el('button', 'msc-btn msc-btn-secondary review-summaries-export-btn');
  exportBtn.type = 'button';
  exportBtn.textContent = 'Download PDF';
  exportBtn.title = 'Summary text and reviewer/employee/date details only — no attachment files.';

  /* "Download complete review" (REQ-CAL-REV-ATTACH-001, 2026-09-23) — a
     SEPARATE button/request/in-flight-flag from Download PDF, not a mode
     switch on the same one, so the two downloads' own distinct wording
     (title attribute here, toast/status text in
     downloadReviewSummariesZip below) is what makes the difference between
     them clear in the UI, per the approved requirement. Both apply the
     exact same employee/reviewer/date filters currently selected — see
     buildExportQuery, reused unchanged by both. */
  var zipExportBtn = el('button', 'msc-btn msc-btn-secondary review-summaries-zip-export-btn');
  zipExportBtn.type = 'button';
  zipExportBtn.textContent = 'Download complete review';
  zipExportBtn.title = 'One ZIP file: the same PDF plus every original attachment file, including audio.';

  /* "Download all reviews as one PDF" (REQ-CAL-REV-HISTORY-PDF-001,
     2026-09-23) — a THIRD separate button/request/in-flight-flag, same
     "one page-level button, never one per record" convention as Download
     PDF above. Combines EVERY review matching the current Reviewer/From/To
     filters (never just one page of results) into one chronologically
     ordered PDF, each with its attachments converted/embedded as pages. */
  var allReviewsExportBtn = el('button', 'msc-btn msc-btn-secondary review-summaries-all-reviews-export-btn');
  allReviewsExportBtn.type = 'button';
  allReviewsExportBtn.textContent = 'Download all reviews as one PDF';
  allReviewsExportBtn.title = 'Every matching review, oldest to newest, in one PDF with attachments embedded after each review.';

  /* REQ-CAL-REV-UX-005 — accessible in-flight/outcome status, distinct
     from the button's own busy label (which only ever shows short text).
     aria-live="polite" so assistive tech announces each state change
     without stealing focus; hidden (blank) when there is nothing to say,
     matching every other conditionally-shown element in this module. */
  var exportStatusEl = el('p', 'review-summaries-export-status');
  exportStatusEl.setAttribute('aria-live', 'polite');
  exportStatusEl.hidden = true;

  var zipExportStatusEl = el('p', 'review-summaries-export-status');
  zipExportStatusEl.setAttribute('aria-live', 'polite');
  zipExportStatusEl.hidden = true;

  var allReviewsExportStatusEl = el('p', 'review-summaries-export-status');
  allReviewsExportStatusEl.setAttribute('aria-live', 'polite');
  allReviewsExportStatusEl.hidden = true;

  function showExportStatus(text) {
    exportStatusEl.textContent = text;
    exportStatusEl.hidden = false;
  }
  function clearExportStatus() {
    exportStatusEl.textContent = '';
    exportStatusEl.hidden = true;
  }
  function showZipExportStatus(text) {
    zipExportStatusEl.textContent = text;
    zipExportStatusEl.hidden = false;
  }
  function clearZipExportStatus() {
    zipExportStatusEl.textContent = '';
    zipExportStatusEl.hidden = true;
  }
  function showAllReviewsExportStatus(text) {
    allReviewsExportStatusEl.textContent = text;
    allReviewsExportStatusEl.hidden = false;
  }
  function clearAllReviewsExportStatus() {
    allReviewsExportStatusEl.textContent = '';
    allReviewsExportStatusEl.hidden = true;
  }

  function updateExportButtonState() {
    var hasStaff = !!state.selectedStaff;
    var hasToken = currentAccess() !== 'unauthorized';
    var invalidRange = isInvalidDateRange(state.dateFrom, state.dateTo);
    exportBtn.disabled = !hasStaff || !hasToken || invalidRange || state.exportInFlight;
    zipExportBtn.disabled = !hasStaff || !hasToken || invalidRange || state.zipExportInFlight;
    allReviewsExportBtn.disabled = !hasStaff || !hasToken || invalidRange || state.allReviewsExportInFlight;
  }

  /* PDF Blob download — deliberately its own fetch, not
     reviewSummariesApiRequest() (which unconditionally calls res.json(),
     wrong for a binary PDF body). Reuses the same ensureAuthorized()/
     handleUnauthorizedResponse() authentication primitives so a missing/
     invalid/expired token behaves identically to every other request this
     workspace makes. Never sends the token, reviewer display name,
     employee display name, or summary text in the URL — only
     reviewed_staff_id, the current reviewer scope, and the current dates
     (buildExportQuery). Endpoint, query parameters, and response handling
     are byte-for-byte unchanged from REQ-CAL-REV-PDF-003 — REQ-CAL-REV-
     UX-005 only adds the setButtonBusy()/showExportStatus() presentation
     calls around this same request. */
  function downloadReviewSummariesPdf() {
    if (state.exportInFlight || !state.selectedStaff) { return; }
    if (currentAccess() === 'unauthorized') { return; }
    if (isInvalidDateRange(state.dateFrom, state.dateTo)) { return; }

    state.exportInFlight = true;
    updateExportButtonState();
    setButtonBusy(exportBtn, true, { busyLabel: 'Preparing PDF…' });
    showExportStatus(PDF_PREPARING_MESSAGE);

    var query = buildExportQuery({
      includeAllReviewers: !state.reviewerFilter,
      reviewerMemberKey: state.reviewerFilter || null,
      reviewedStaffId: state.selectedStaff.id,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo
    });

    return ensureAuthorized().then(function (token) {
      return fetch(STAFF_REVIEW_SUMMARIES_API_BASE + '/export/pdf?' + query, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token },
        cache: 'no-store'
      });
    }, function () {
      var e = new Error('Authorization required.');
      e.code = 'auth_cancelled';
      throw e;
    }).then(function (res) {
      if (res.status === 401) {
        handleUnauthorizedResponse();
        var authErr = new Error('Authorization expired.');
        authErr.code = 'auth_required';
        throw authErr;
      }
      if (res.status === 404) {
        // Empty-result 404 (requirement §5.10) — never a Blob/download for
        // this response; selected employee and filters are left exactly
        // as they were, so the user can adjust and retry.
        var emptyErr = new Error('No review summaries match the selected filters.');
        emptyErr.code = 'export_empty';
        throw emptyErr;
      }
      if (!res.ok) {
        var failErr = new Error('Export failed.');
        failErr.code = classifyHttpStatus(res.status);
        failErr.status = res.status;
        throw failErr;
      }
      var disposition = res.headers.get('Content-Disposition') || '';
      var filename = parseReviewSummaryPdfFilename(
        disposition,
        staffOptionLabel(state.selectedStaff),
        getColomboTodayStr()
      );
      return res.blob().then(function (blob) { return { blob: blob, filename: filename }; });
    }).then(function (result) {
      var blobUrl = URL.createObjectURL(result.blob);
      var link = document.createElement('a');
      link.href = blobUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      // Approved copy (REQ-CAL-REV-UX-005) — never claims this app
      // controls the browser's save location, only that the file itself
      // is ready.
      showToast({
        type: 'success', title: 'PDF ready',
        message: PDF_SUCCESS_MESSAGE
      });
    }).catch(function (err) {
      if (err && err.code === 'auth_cancelled') { return; }
      if (err && err.code === 'auth_required') { return; } // reactToAuthChange() already handles the gate
      if (err && err.code === 'export_empty') {
        showToast({ type: 'error', title: 'No matching records', message: 'No review summaries match the selected filters.', persistent: false });
        return;
      }
      // OTHER FAILURE (REQ-CAL-REV-UX-005) — one safe, generic message
      // regardless of underlying cause; never a backend detail/stack
      // trace, and deliberately not routed through mapApiError() (whose
      // generic wording differs from this feature's approved copy).
      showToast({
        type: 'error', title: 'PDF not prepared',
        message: PDF_GENERIC_FAILURE_MESSAGE, persistent: false
      });
    }).then(function () {
      state.exportInFlight = false;
      setButtonBusy(exportBtn, false);
      clearExportStatus();
      updateExportButtonState();
    });
  }

  /* ZIP Blob download (REQ-CAL-REV-ATTACH-001) — same shape as
     downloadReviewSummariesPdf above (own fetch, own auth handling, own
     404-empty/other-failure classification), hitting /export/zip instead
     of /export/pdf and using the ZIP-specific messages/filename parser.
     Kept as a fully separate function (not a shared parameterized one)
     so a change to either download can never silently affect the
     other. */
  function downloadReviewSummariesZip() {
    if (state.zipExportInFlight || !state.selectedStaff) { return; }
    if (currentAccess() === 'unauthorized') { return; }
    if (isInvalidDateRange(state.dateFrom, state.dateTo)) { return; }

    state.zipExportInFlight = true;
    updateExportButtonState();
    setButtonBusy(zipExportBtn, true, { busyLabel: 'Preparing…' });
    showZipExportStatus(ZIP_PREPARING_MESSAGE);

    var query = buildExportQuery({
      includeAllReviewers: !state.reviewerFilter,
      reviewerMemberKey: state.reviewerFilter || null,
      reviewedStaffId: state.selectedStaff.id,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo
    });

    return ensureAuthorized().then(function (token) {
      return fetch(STAFF_REVIEW_SUMMARIES_API_BASE + '/export/zip?' + query, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token },
        cache: 'no-store'
      });
    }, function () {
      var e = new Error('Authorization required.');
      e.code = 'auth_cancelled';
      throw e;
    }).then(function (res) {
      if (res.status === 401) {
        handleUnauthorizedResponse();
        var authErr = new Error('Authorization expired.');
        authErr.code = 'auth_required';
        throw authErr;
      }
      if (res.status === 404) {
        var emptyErr = new Error('No review summaries match the selected filters.');
        emptyErr.code = 'export_empty';
        throw emptyErr;
      }
      if (!res.ok) {
        var failErr = new Error('Export failed.');
        failErr.code = classifyHttpStatus(res.status);
        failErr.status = res.status;
        throw failErr;
      }
      var disposition = res.headers.get('Content-Disposition') || '';
      var filename = parseReviewSummaryZipFilename(
        disposition,
        staffOptionLabel(state.selectedStaff),
        getColomboTodayStr()
      );
      return res.blob().then(function (blob) { return { blob: blob, filename: filename }; });
    }).then(function (result) {
      var blobUrl = URL.createObjectURL(result.blob);
      var link = document.createElement('a');
      link.href = blobUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast({
        type: 'success', title: 'Complete review ready',
        message: ZIP_SUCCESS_MESSAGE
      });
    }).catch(function (err) {
      if (err && err.code === 'auth_cancelled') { return; }
      if (err && err.code === 'auth_required') { return; }
      if (err && err.code === 'export_empty') {
        showToast({ type: 'error', title: 'No matching records', message: 'No review summaries match the selected filters.', persistent: false });
        return;
      }
      showToast({
        type: 'error', title: 'Complete review not prepared',
        message: ZIP_GENERIC_FAILURE_MESSAGE, persistent: false
      });
    }).then(function () {
      state.zipExportInFlight = false;
      setButtonBusy(zipExportBtn, false);
      clearZipExportStatus();
      updateExportButtonState();
    });
  }

  /* "Download all reviews as one PDF" (REQ-CAL-REV-HISTORY-PDF-001,
     2026-09-23) — same shape as downloadReviewSummariesPdf above (own
     fetch, own auth handling, own 404-empty classification), hitting
     /export/pdf/history instead of /export/pdf and using this download's
     own filename parser. Kept as its own function (not a shared
     parameterized one), same "a change to one download can never
     accidentally affect another" reasoning as the ZIP export above.

     Additionally handles two response codes neither of the other two
     downloads can ever return: 413 (too many matching reviews, or their
     combined attachments, or the combined PDF's page count, over the
     practical limits in backend/config.py) and 504 (the combined export
     took too long to assemble within its own time budget). Both carry a
     fixed, safe, entirely backend-authored sentence (see backend/routers/
     staff_review_summaries.py export_all_reviews_pdf's own HTTPException
     detail strings — never a stack trace or raw exception text) that is
     shown directly, the same narrow "show the backend's own safe message
     verbatim" exception ui/error-mapper.js documents for
     attachment_storage_not_ready. */
  function downloadAllReviewsPdf() {
    if (state.allReviewsExportInFlight || !state.selectedStaff) { return; }
    if (currentAccess() === 'unauthorized') { return; }
    if (isInvalidDateRange(state.dateFrom, state.dateTo)) { return; }

    state.allReviewsExportInFlight = true;
    updateExportButtonState();
    setButtonBusy(allReviewsExportBtn, true, { busyLabel: 'Preparing…' });
    showAllReviewsExportStatus(ALL_REVIEWS_PREPARING_MESSAGE);

    var query = buildExportQuery({
      includeAllReviewers: !state.reviewerFilter,
      reviewerMemberKey: state.reviewerFilter || null,
      reviewedStaffId: state.selectedStaff.id,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo
    });

    return ensureAuthorized().then(function (token) {
      return fetch(STAFF_REVIEW_SUMMARIES_API_BASE + '/export/pdf/history?' + query, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token },
        cache: 'no-store'
      });
    }, function () {
      var e = new Error('Authorization required.');
      e.code = 'auth_cancelled';
      throw e;
    }).then(function (res) {
      if (res.status === 401) {
        handleUnauthorizedResponse();
        var authErr = new Error('Authorization expired.');
        authErr.code = 'auth_required';
        throw authErr;
      }
      if (res.status === 404) {
        // 2026-09-23 fix — a plain `res.status === 404` check alone
        // cannot tell "genuinely zero reviews match these filters" (this
        // route's own HTTPException(404, "No review summaries match the
        // selected filters.")) apart from a completely different 404 —
        // most notably Starlette's own generic {"detail":"Not Found"}
        // when the request reaches a server process that does not have
        // THIS route registered at all (e.g. an older backend process
        // still running from before this endpoint existed). A real
        // report of exactly that situation showed "No matching records"
        // for a staff member/reviewer/date combination that plainly DID
        // have one matching review in Review History, which sent the
        // investigation looking for a nonexistent date-filter bug. Now
        // the response body's own detail text must match this route's
        // own fixed "no records" sentence before it is ever shown to the
        // user as "no matching records" — any other 404 body (or an
        // unreadable one) falls through to the generic failure message
        // instead, which is honest about "something went wrong" rather
        // than confidently wrong about "no records."
        return res.json().then(function (body) {
          var detail = body && body.detail;
          if (detail === 'No review summaries match the selected filters.') {
            var emptyErr = new Error(detail);
            emptyErr.code = 'export_empty';
            throw emptyErr;
          }
          var routeErr = new Error('Export failed.');
          routeErr.code = classifyHttpStatus(res.status);
          routeErr.status = res.status;
          throw routeErr;
        }, function () {
          var unreadableErr = new Error('Export failed.');
          unreadableErr.code = classifyHttpStatus(res.status);
          unreadableErr.status = res.status;
          throw unreadableErr;
        });
      }
      if (res.status === 413 || res.status === 504) {
        return res.json().then(function (body) {
          var limitErr = new Error((body && body.detail) || ALL_REVIEWS_GENERIC_FAILURE_MESSAGE);
          limitErr.code = 'export_too_large';
          throw limitErr;
        }, function () {
          var limitErr = new Error(ALL_REVIEWS_GENERIC_FAILURE_MESSAGE);
          limitErr.code = 'export_too_large';
          throw limitErr;
        });
      }
      if (!res.ok) {
        var failErr = new Error('Export failed.');
        failErr.code = classifyHttpStatus(res.status);
        failErr.status = res.status;
        throw failErr;
      }
      var disposition = res.headers.get('Content-Disposition') || '';
      var filename = parseAllReviewsPdfFilename(
        disposition,
        staffOptionLabel(state.selectedStaff),
        getColomboTodayStr()
      );
      return res.blob().then(function (blob) { return { blob: blob, filename: filename }; });
    }).then(function (result) {
      var blobUrl = URL.createObjectURL(result.blob);
      var link = document.createElement('a');
      link.href = blobUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast({
        type: 'success', title: 'All reviews ready',
        message: ALL_REVIEWS_SUCCESS_MESSAGE
      });
    }).catch(function (err) {
      if (err && err.code === 'auth_cancelled') { return; }
      if (err && err.code === 'auth_required') { return; }
      if (err && err.code === 'export_empty') {
        showToast({ type: 'error', title: 'No matching records', message: 'No review summaries match the selected filters.', persistent: false });
        return;
      }
      if (err && err.code === 'export_too_large') {
        showToast({ type: 'error', title: 'Combined PDF too large', message: err.message, persistent: true });
        return;
      }
      showToast({
        type: 'error', title: 'PDF not prepared',
        message: ALL_REVIEWS_GENERIC_FAILURE_MESSAGE, persistent: false
      });
    }).then(function () {
      state.allReviewsExportInFlight = false;
      setButtonBusy(allReviewsExportBtn, false);
      clearAllReviewsExportStatus();
      updateExportButtonState();
    });
  }

  exportBtn.addEventListener('click', downloadReviewSummariesPdf);
  zipExportBtn.addEventListener('click', downloadReviewSummariesZip);
  allReviewsExportBtn.addEventListener('click', downloadAllReviewsPdf);
  exportGroupEl.appendChild(exportBtn);
  exportGroupEl.appendChild(exportStatusEl);
  exportGroupEl.appendChild(zipExportBtn);
  exportGroupEl.appendChild(zipExportStatusEl);
  exportGroupEl.appendChild(allReviewsExportBtn);
  exportGroupEl.appendChild(allReviewsExportStatusEl);
  toolbarEl.appendChild(exportGroupEl);
  updateExportButtonState();

  var historyEl = el('div', 'review-summaries-history');
  historyPanel.appendChild(historyPanelTitle);
  historyPanel.appendChild(toolbarEl);
  historyPanel.appendChild(historyEl);

  /* REQ-CAL-REV-UX-005 — one shared "label + value" row builder for the
     card metadata block, so Reviewed by / Reviewer role / Meeting date
     always read as distinct, clearly-labeled fields (never one combined
     sentence like the prior "Reviewed by: X" single-text-node form). */
  function metaRow(label, value, valueClassName) {
    var row = el('div', 'review-summaries-card-meta-row');
    var dt = el('dt', 'review-summaries-card-meta-label');
    dt.textContent = label;
    var dd = el('dd', valueClassName || 'review-summaries-card-meta-value');
    dd.textContent = value;
    row.appendChild(dt);
    row.appendChild(dd);
    return row;
  }

  /* Individual attachment download (REQ-CAL-REV-ATTACH-001) — same Blob-
     download pattern as downloadReviewSummariesPdf/Zip above (own fetch,
     not reviewSummariesApiRequest, since the response body is binary, not
     JSON), scoped to one attachment rather than the whole filtered
     history. A busy button (not the whole card) is disabled while this
     one download is in flight, so downloading one attachment never blocks
     interacting with any other card/attachment. */
  function downloadReviewSummaryAttachment(summaryId, attachmentId, filename, triggerBtn) {
    if (triggerBtn.disabled) { return; }
    setButtonBusy(triggerBtn, true, { busyLabel: 'Downloading…' });

    ensureAuthorized().then(function (token) {
      return fetch(
        STAFF_REVIEW_SUMMARIES_API_BASE + '/' + summaryId + '/attachments/' + attachmentId,
        { method: 'GET', headers: { 'Authorization': 'Bearer ' + token }, cache: 'no-store' }
      );
    }, function () {
      var e = new Error('Authorization required.');
      e.code = 'auth_cancelled';
      throw e;
    }).then(function (res) {
      if (res.status === 401) {
        handleUnauthorizedResponse();
        var authErr = new Error('Authorization expired.');
        authErr.code = 'auth_required';
        throw authErr;
      }
      if (!res.ok) {
        var failErr = new Error('Download failed.');
        failErr.code = classifyHttpStatus(res.status);
        failErr.status = res.status;
        throw failErr;
      }
      return res.blob();
    }).then(function (blob) {
      var blobUrl = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }).catch(function (err) {
      if (err && err.code === 'auth_cancelled') { return; }
      if (err && err.code === 'auth_required') { return; }
      showToast({
        type: 'error', title: 'Download failed',
        message: 'The attachment could not be downloaded. Please try again.', persistent: false
      });
    }).then(function () {
      setButtonBusy(triggerBtn, false);
    });
  }

  function renderHistoryCard(record) {
    var authenticatedMemberKey = getStoredMemberKey();
    var reviewerEntry = resolveMember(record.reviewer_member_key);
    var statusInfo = reviewSummaryStatusInfo(record, authenticatedMemberKey);
    var card = el('div', 'review-summaries-card');

    // ── Header: employee name + exactly one status badge, aligned
    //    separately (Phase 4 CARD HEADER) ──────────────────────────────
    var headerEl = el('div', 'review-summaries-card-header');
    var employeeEl = el('h6', 'review-summaries-card-employee');
    employeeEl.textContent = 'Reviewed employee: ' + reviewedEmployeeLabel(record);
    headerEl.appendChild(employeeEl);

    var badgeEl = el(
      'span',
      'review-summaries-card-status-badge review-summaries-card-status-badge--' + statusInfo.badgeVariant
    );
    var badgeIconEl = el('span', 'review-summaries-card-status-badge-icon');
    badgeIconEl.setAttribute('aria-hidden', 'true');
    // A shape, not only a color, distinguishes the two badge variants
    // (Phase 8 — "no information depends only on ... color") — on top of
    // the badge text itself already differing ("Editable today" vs
    // "Read-only").
    badgeIconEl.textContent = statusInfo.badgeVariant === 'editable' ? '●' : '○';
    badgeEl.appendChild(badgeIconEl);
    badgeEl.appendChild(document.createTextNode(statusInfo.badgeText));
    headerEl.appendChild(badgeEl);

    // Secondary "Updated" label (replaces the prior ambiguous "Edited"
    // pill) — never the primary state badge, carries its own accessible
    // explanation via aria-label so its meaning doesn't depend on the
    // adjacent "Updated" text alone.
    if (record.updated_at && record.created_at && record.updated_at !== record.created_at) {
      var updatedEl = el('span', 'review-summaries-card-updated-label');
      updatedEl.textContent = 'Updated';
      updatedEl.setAttribute('aria-label', 'Updated — this summary has been edited since it was created.');
      headerEl.appendChild(updatedEl);
    }
    card.appendChild(headerEl);

    // ── Metadata: Reviewed by / Reviewer role / Meeting date, each its
    //    own labeled row (Phase 4 REVIEW METADATA) ─────────────────────
    var metaEl = el('dl', 'review-summaries-card-meta');
    metaEl.appendChild(metaRow('Reviewed by', reviewerEntry.displayName));
    metaEl.appendChild(metaRow('Reviewer role', reviewerEntry.role));
    metaEl.appendChild(metaRow('Meeting date', record.meeting_date, 'review-summaries-card-meta-value review-summaries-card-date'));
    card.appendChild(metaEl);

    // ── Summary content: labeled, safe plain text (Phase 4 SUMMARY
    //    CONTENT) ───────────────────────────────────────────────────────
    var summaryEl = el('div', 'review-summaries-card-summary');
    var summaryLabelEl = el('p', 'review-summaries-card-summary-label');
    summaryLabelEl.textContent = 'Review summary';
    summaryEl.appendChild(summaryLabelEl);

    var preview = summaryPreview(record.summary_text);
    var textNode = renderSummaryText(preview.truncated ? preview.preview : record.summary_text);
    summaryEl.appendChild(textNode);

    if (preview.truncated) {
      var expanded = false;
      var toggleTextBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-toggle-text-btn');
      toggleTextBtn.type = 'button';
      toggleTextBtn.textContent = 'Show more';
      toggleTextBtn.setAttribute('aria-expanded', 'false');
      toggleTextBtn.addEventListener('click', function () {
        expanded = !expanded;
        // textContent only — never innerHTML — matching the module-wide
        // safe-text rule (renderSummaryText's own header note).
        textNode.textContent = expanded ? record.summary_text : preview.preview;
        toggleTextBtn.textContent = expanded ? 'Show less' : 'Show more';
        toggleTextBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
      summaryEl.appendChild(toggleTextBtn);
    }
    card.appendChild(summaryEl);

    // ── Attachments (REQ-CAL-REV-ATTACH-001, 2026-09-23) — filename + type
    //    for every attachment, each with its own individual download
    //    action. Read access mirrors the summary's own shared-read rule
    //    (any authenticated Management Team member or MD) — there is no
    //    separate, stricter per-attachment UI gate here because the
    //    backend itself has none (see download_review_summary_attachment's
    //    docstring). ─────────────────────────────────────────────────────
    if (record.attachments && record.attachments.length) {
      var attachmentsSectionEl = el('div', 'review-summaries-card-attachments');
      var attachmentsSectionLabelEl = el('p', 'review-summaries-card-attachments-label');
      attachmentsSectionLabelEl.textContent = 'Attachments (' + record.attachments.length + ')';
      attachmentsSectionEl.appendChild(attachmentsSectionLabelEl);

      var attachmentsSectionListEl = el('ul', 'review-summaries-card-attachments-list');
      record.attachments.forEach(function (attachment) {
        var itemEl = el('li', 'review-summaries-card-attachment-item');
        var nameEl = el('span', 'review-summaries-card-attachment-name');
        nameEl.textContent = attachment.original_filename;
        var typeEl = el('span', 'review-summaries-card-attachment-type');
        typeEl.textContent = attachmentTypeLabel(attachment.attachment_type);
        var downloadBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-card-attachment-download-btn');
        downloadBtn.type = 'button';
        downloadBtn.textContent = 'Download';
        downloadBtn.addEventListener('click', function () {
          downloadReviewSummaryAttachment(record.id, attachment.id, attachment.original_filename, downloadBtn);
        });
        itemEl.appendChild(nameEl);
        itemEl.appendChild(typeEl);
        itemEl.appendChild(downloadBtn);
        attachmentsSectionListEl.appendChild(itemEl);
      });
      attachmentsSectionEl.appendChild(attachmentsSectionListEl);
      card.appendChild(attachmentsSectionEl);
    }

    // ── Status message — shown only for the AUTHENTICATED REVIEWER'S OWN
    //    card (editable or locked), explaining the badge (a same-day
    //    deadline, or why the window closed). The other-reviewer/MD
    //    "read-only" explanation is deliberately NOT rendered any more —
    //    the badge above already says "Read-only" on its own, and a
    //    restated explanatory line under every non-owned card added no
    //    information (UI copy trim, requested 2026-08-06). Wording for the
    //    owned case still comes entirely from reviewSummaryStatusInfo()
    //    above — never recomputed here. ─────────────────────────────────
    if (statusInfo.owned) {
      var statusMessageEl = el('p', 'review-summaries-card-status-message');
      if (!record.can_edit) {
        statusMessageEl.classList.add('review-summaries-card-status-message--locked');
      }
      statusMessageEl.textContent = statusInfo.message;
      card.appendChild(statusMessageEl);
    }

    /* Edit button renders ONLY for a card owned by the currently
       authenticated reviewer AND still within its own edit window
       (technical design §5.3/§2.8 / REQ-CAL-REV-LOCK-004). A non-owned
       or locked card still renders fully (read-only) — it simply gets no
       mutation control, communicated above via the status badge/message.

       There is no Delete control anywhere in this workspace any more
       (REQ-CAL-REV-LOCK-004, 2026-08-06) — no user may delete a Review
       Summary; the backend's DELETE route only ever rejects with 409
       now, so no frontend code path is left that could still call it. */
    if (statusInfo.owned && record.can_edit) {
      var actions = el('div', 'review-summaries-card-actions');
      var editBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-edit-btn');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function () {
        state.editingId = record.id;
        dateInput.value = record.meeting_date;
        summaryTextarea.value = record.summary_text;
        counterEl.textContent = summaryCounterText(record.summary_text);
        saveBtn.textContent = 'Save Changes';
        cancelEditBtn.hidden = false;
        toggleAttachmentsVisibility();
        summaryTextarea.focus();
      });
      actions.appendChild(editBtn);
      card.appendChild(actions);
    }

    // ── Footer: Created/Updated timestamps (Phase 4 CARD FOOTER) — both
    //    fields are already returned by the existing API response (no
    //    backend change); reuses calendar/core.js's existing Asia/
    //    Colombo timestamp formatter rather than adding a second one. ──
    var footerEl = el('div', 'review-summaries-card-footer');
    var createdEl = el('span', 'review-summaries-card-footer-created');
    createdEl.textContent = 'Created: ' + formatTaskTimestamp(record.created_at);
    var updatedFooterEl = el('span', 'review-summaries-card-footer-updated');
    updatedFooterEl.textContent = 'Updated: ' + formatTaskTimestamp(record.updated_at);
    footerEl.appendChild(createdEl);
    footerEl.appendChild(updatedFooterEl);
    card.appendChild(footerEl);

    return card;
  }

  function renderHistory() {
    updateAuthorizedAsLabel();
    // 'unauthorized' never fetches — nothing is readable until authorized
    // (decision #16/#18-19). Returning here also avoids showing a stale
    // "Loading…" state that would never resolve into real data.
    if (currentAccess() === 'unauthorized') { return; }
    historyEl.textContent = '';
    if (!state.selectedStaff) {
      var promptEl = el('div', 'review-summaries-empty');
      promptEl.textContent = 'Select a staff member to see their review history.';
      historyEl.appendChild(promptEl);
      return;
    }
    showInlineLoading(historyEl, 'Loading review history…');
    var query = buildListQuery({
      includeAllReviewers: !state.reviewerFilter,
      reviewerMemberKey: state.reviewerFilter || null,
      reviewedStaffId: state.selectedStaff.id,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo
    });
    // Stale-request guard — this request's own id is captured now; if a
    // newer renderHistory() call has bumped state.historyRequestId by the
    // time this resolves, the result is discarded rather than rendered.
    state.historyRequestId += 1;
    var requestId = state.historyRequestId;
    guardedRequest('?' + query).then(function (body) {
      if (requestId !== state.historyRequestId) { return; }
      updateAuthorizedAsLabel(); // the ensureAuthorized() call inside the request above may have just resolved a first-time authorization — refresh the label now that it's current.
      historyEl.textContent = '';
      if (!body.records.length) {
        var empty = el('div', 'review-summaries-empty');
        empty.textContent = 'No review summaries yet for this staff member.';
        historyEl.appendChild(empty);
        return;
      }
      body.records.forEach(function (record) {
        historyEl.appendChild(renderHistoryCard(record));
      });
    }).catch(function (err) {
      if (requestId !== state.historyRequestId) { return; }
      // auth_required (401): handleUnauthorizedResponse() already fired
      // CALENDAR_AUTH_CHANGED_EVENT synchronously, which this module's own
      // listener (below) already used to update the access gate —
      // rendering the generic error box here on top of that would stomp
      // the just-recovered UI with a stale "Request failed" message.
      if (err && err.code === 'auth_required') { return; }
      historyEl.textContent = '';
      var mapped = mapApiError(err);
      var errorEl = el('div', 'review-summaries-error');
      errorEl.setAttribute('role', 'alert');
      errorEl.textContent = mapped.title + ' — ' + mapped.message;
      var retryBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-retry-btn');
      retryBtn.type = 'button';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', renderHistory);
      errorEl.appendChild(document.createElement('br'));
      errorEl.appendChild(retryBtn);
      historyEl.appendChild(errorEl);
    });
  }

  /* Shows/hides the unauthorized prompt vs. the staff/form/history panels
     per currentAccess(). Returns the resolved mode so callers can decide
     whether to fetch. Does not itself clear state. */
  function renderAccessGate() {
    var mode = currentAccess();
    if (mode === 'unauthorized') {
      unauthorizedEl.hidden = false;
      staffPanel.hidden = true;
      formPanel.hidden = true;
      historyPanel.hidden = true;
      return mode;
    }
    unauthorizedEl.hidden = true;
    staffPanel.hidden = false;
    formPanel.hidden = false;
    historyPanel.hidden = false;
    return mode;
  }

  /* THE single, reusable state reset (Phase 3 correction, 2026-08-06 —
     replaces the prior clearWorkspaceState()/clearEmployeeDependentState()/
     onLeaveOrPanelSwitch() split, which left two paths — a 401 and
     leaving the tab — only partially clearing state). Every trigger that
     must reset this workspace goes through this ONE function: a fresh
     employee selection, a genuine token change, a 401/authorization
     failure, and leaving the dedicated tab. Clears:
       - the selected employee (deselectStaff — UUID + display state);
       - loaded history (historyEl content);
       - edit/draft/delete-related state (exitEditMode — editingId, draft
         summary/date text, field errors; any card DOM holding expanded-
         summary/delete-confirmation state is itself destroyed the next
         time history re-renders, since cards are always rebuilt from
         scratch, never patched in place);
       - the reviewer filter, reset to '' ("All reviewers");
       - both date filters;
       - the stale-response guard (historyRequestId bumped), so a
         slower, already-in-flight request from before this reset can
         never repopulate the just-cleared state once it resolves.
     Deliberately never touches the stored Calendar token itself — token
     clearing is always handleUnauthorizedResponse()'s job (calendar/
     auth.js), invoked only by reviewSummariesApiRequest() on a real 401
     (never by this function, and never for a 404 or an owner-only
     mutation denial, which are unrelated error classes entirely). Does
     not itself decide what to render next — every call site below still
     calls renderHistory()/renderAccessGate() explicitly afterward, since
     that decision differs by context (e.g. an auth-change call site also
     needs to re-run the access gate; a plain employee-selection call site
     does not). */
  function resetWorkspaceState() {
    state.historyRequestId += 1;
    deselectStaff();
    state.reviewerFilter = '';
    reviewerFilterSelect.value = '';
    state.dateFrom = '';
    state.dateTo = '';
    dateFromInput.value = '';
    dateToInput.value = '';
    exitEditMode();
    updateFormVisibility();
    updateExportButtonState();
    historyEl.textContent = '';
  }

  /* CALENDAR_AUTH_CHANGED_EVENT fires for two situations — a 401 mid-
     session (handleUnauthorizedResponse clears the stored token to null
     BEFORE dispatching) and a successful first-time authorize/Change
     Token (a NEW valid token is stored BEFORE dispatching). Both are now
     treated identically (Phase 4/6 correction, 2026-08-06): a full
     resetWorkspaceState() every time, regardless of which situation this
     is — an authorization failure must clear the workspace exactly like a
     genuine identity change, not preserve the previous employee selection
     for later. */
  function reactToAuthChange() {
    invalidateStaffDirectory();
    resetWorkspaceState();
    updateAuthorizedAsLabel();
    var mode = renderAccessGate();
    if (mode !== 'unauthorized') { renderHistory(); ensureAttachmentStorageModeLoaded(); }
  }

  /* navigation.js's 'msc:close-toolbar-popovers' fires on every panel
     activation (including activating this one) — the "leaving the
     dedicated tab" signal (technical design §7, as corrected 2026-08-06).
     A full resetWorkspaceState() so returning to this tab later always
     starts from a clean baseline: no employee selected, no history
     visible, reviewer filter back to "All reviewers", date filters
     cleared — never the previous visit's stale selection. Does not touch
     the stored Calendar token — ordinary navigation is not an
     authorization event. */
  function onLeaveOrPanelSwitch() {
    invalidateStaffDirectory();
    resetWorkspaceState();
    renderHistory();
  }

  document.addEventListener('msc:close-toolbar-popovers', onLeaveOrPanelSwitch);
  document.addEventListener(CALENDAR_AUTH_CHANGED_EVENT, reactToAuthChange);

  mountEl.appendChild(headerEl);
  mountEl.appendChild(staffPanel);
  mountEl.appendChild(formPanel);
  mountEl.appendChild(historyPanel);

  renderAccessGate();
  renderHistory();
  ensureAttachmentStorageModeLoaded();

  return {
    selectStaff: selectStaff,
    renderHistory: renderHistory,
    updateAuthorizedAsLabel: updateAuthorizedAsLabel,
    reactToAuthChange: reactToAuthChange,
    onLeaveOrPanelSwitch: onLeaveOrPanelSwitch,
    resetWorkspaceState: resetWorkspaceState,
    accessDecision: currentAccess,
    setReviewerFilter: function (value) {
      state.reviewerFilter = value;
      reviewerFilterSelect.value = value;
      exitEditMode();
      updateExportButtonState();
      renderHistory();
    },
    downloadReviewSummariesPdf: downloadReviewSummariesPdf,
    exportButtonEl: exportBtn,
    updateExportButtonState: updateExportButtonState,
    // REQ-CAL-REV-ATTACH-001 (2026-09-23) — test-facing hooks, same
    // "expose the real function/element, never a duplicated test-only
    // implementation" convention as every entry above.
    downloadReviewSummariesZip: downloadReviewSummariesZip,
    zipExportButtonEl: zipExportBtn,
    // REQ-CAL-REV-HISTORY-PDF-001 (2026-09-23) — same test-facing-hook
    // convention, for "Download all reviews as one PDF".
    downloadAllReviewsPdf: downloadAllReviewsPdf,
    allReviewsExportButtonEl: allReviewsExportBtn,
    addFilesToPending: addFilesToPending,
    attachmentsListEl: attachmentsListEl,
    staffResultsEl: staffResultsEl,
    staffSearchInputEl: staffSearchInput,
    state: state
  };
}

/* Called once at app boot (web-view/js/app.js). Mounts exactly one
   instance into #reviewSummariesWorkspace (web-view/index.html, inside
   the independent #tab-review-summaries panel) — idempotent, safe to call
   once. Not itself unit tested (same documented coverage boundary as
   calendar/instance.js/initAllScheduleCalendars — see calendar/
   auth.test.mjs's header note); mountReviewSummariesWorkspace above is
   the exported, directly-testable unit. */
export function initReviewSummaries() {
  var mountEl = document.getElementById('reviewSummariesWorkspace');
  mountReviewSummariesWorkspace(mountEl);
}
