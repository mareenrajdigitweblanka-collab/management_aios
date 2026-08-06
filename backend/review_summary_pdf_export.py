"""Employee Review Summary PDF export (REQ-CAL-REV-PDF-003).

Builds the in-memory PDF for GET /api/staff-review-summaries/export/pdf
(backend/routers/staff_review_summaries.py). Mirrors backend/xlsx_export.py's
existing convention exactly: a pure, DB-session-free, bytes-in/bytes-out
builder. This module never queries the database and never accepts a
Session — the router does 100% of the querying and passes already-resolved
Python values in.

This is a point-in-time export only. Nothing here writes to the database,
and the generated file has no macros, external links, or upload/sync
affordance — opening it never reaches back into Management AIOS.

Reviewer identity source (approved technical design §6/§5.6 "Reviewer
Identity Source Gate"): reviewer display name and role are resolved
server-side from record.reviewer_member_key via resolve_reviewer(), which
is built FROM backend/config.py's one existing MEMBER_LABELS registry — not
a second, independently-invented reviewer registry. The browser never
supplies reviewer display name or role for this export; only
reviewer_member_key (an internal join key, never a display value) ever
reaches this module, and only via the already-queried StaffReviewSummary
rows the router passes in — never from a request parameter.
"""

import re
import unicodedata
from datetime import date as date_type, datetime
from io import BytesIO
from typing import List, Optional

from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

from backend.config import MEMBER_LABELS

PDF_TITLE = "Management AIOS Employee Review Summary"

UNKNOWN_REVIEWER = {"displayName": "Unknown", "role": "Unknown"}

# Paraparan's role is a deliberate exception, mirroring
# web-view/js/member-registry.js's own documented decision exactly (never
# independently re-derived here) — sourced from index.html's pre-existing
# sidebar sub-label / tab header, not from MEMBER_LABELS["paraparan"] (which
# still carries no role, per the still-open External Auditor vs. Accountant
# designation dispute — config.py:95-98). This is a display-terminology
# decision, not a resolution of that dispute, and does not touch config.py.
_PARAPARAN_ROLE_OVERRIDE = "Auditor"


def _resolve_member_label(member_key: str):
    """Splits backend/config.py's MEMBER_LABELS[key] ("Name — Role") into
    {displayName, role} — the same source-of-truth value already used
    everywhere reviewer text is shown server-side (e.g.
    /api/calendar-auth/verify's displayLabel). Returns UNKNOWN_REVIEWER for
    any key not in MEMBER_LABELS, never a fabricated value, never a raised
    exception — mirrors member-registry.js's resolveMember() fallback
    exactly."""
    label = MEMBER_LABELS.get(member_key)
    if label is None:
        return dict(UNKNOWN_REVIEWER)
    if member_key == "paraparan":
        return {"displayName": label, "role": _PARAPARAN_ROLE_OVERRIDE}
    if " — " in label:
        display_name, role = label.split(" — ", 1)
        return {"displayName": display_name, "role": role}
    return {"displayName": label, "role": UNKNOWN_REVIEWER["role"]}


def resolve_reviewer(member_key: Optional[str]) -> dict:
    """Public entry point — returns {displayName, role}, never None, never
    raises. member_key=None (defensive, not reachable via the database
    NOT NULL constraint on reviewer_member_key) resolves to Unknown/Unknown
    exactly like any other unrecognized key."""
    if not member_key:
        return dict(UNKNOWN_REVIEWER)
    return _resolve_member_label(member_key)


# ── Filename (Phase 10) ──────────────────────────────────────────────────

_UNSAFE_FILENAME_CHARS_RE = re.compile(r'[\\/:*?"<>|\r\n\t\x00-\x1f]')
_REPEATED_SEPARATOR_RE = re.compile(r"[-_ ]{2,}")
_FILENAME_FALLBACK = "employee"


def _sanitize_filename_component(raw: str) -> str:
    """Employee display name → filesystem/HTTP-header-safe filename
    component. The employee name is intentionally identifiable and its
    inclusion is approved (requirement §5.8) — this function only removes
    characters that are unsafe for a filename or a Content-Disposition
    header, never anything that would defeat that approved identifiability.
    Never raises; a name that sanitizes to empty (e.g. all-unsafe input)
    falls back to a safe generic value rather than producing an empty or
    malformed filename."""
    if not raw:
        return _FILENAME_FALLBACK
    # NFKD + strip combining marks only for the filename's own safety
    # check, not for the PDF body — the body always shows the original
    # name; this transliteration only prevents non-ASCII bytes from
    # producing an ambiguous Content-Disposition header across HTTP
    # clients.
    normalized = unicodedata.normalize("NFKD", raw)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    no_traversal = ascii_only.replace("..", "").replace("/", "-").replace("\\", "-")
    no_unsafe = _UNSAFE_FILENAME_CHARS_RE.sub("-", no_traversal)
    no_unsafe = no_unsafe.replace("'", "").replace('"', "")
    collapsed = _REPEATED_SEPARATOR_RE.sub("-", no_unsafe)
    trimmed = collapsed.strip(" -_")
    return trimmed or _FILENAME_FALLBACK


def build_review_summary_pdf_filename(employee_display_name: str, generated_date: date_type) -> str:
    """review-summaries_<sanitized-employee-name>_<YYYY-MM-DD>.pdf — the one
    place this filename is assembled (requirement §5.8 decision 22), so the
    Content-Disposition header (staff_review_summaries.py) can never
    disagree with what a caller re-derives from the same inputs. Never
    includes token, summary text, reviewer name/role, NIC, contact
    information, staff/summary UUID, or any other database ID — only the
    sanitized employee name and the generation date."""
    safe_name = _sanitize_filename_component(employee_display_name)
    return "review-summaries_" + safe_name + "_" + generated_date.isoformat() + ".pdf"


# ── PDF body (Phase 8) ───────────────────────────────────────────────────

def _styles():
    base = getSampleStyleSheet()
    body = ParagraphStyle(
        "ReviewSummaryBody", parent=base["Normal"], alignment=TA_LEFT, spaceAfter=6,
    )
    return base, body


def _paragraph_text(raw_text: str) -> str:
    """Converts real newlines to <br/> (the only markup this module ever
    emits) so reportlab's Paragraph preserves paragraph/line-break
    structure from plain-text-sourced content — never any other HTML
    interpretation of user-authored summary text. Never uses innerHTML-
    equivalent unescaped insertion: Paragraph's own XML-subset parser still
    requires &, <, > to be escaped first, so untrusted summary text can
    never inject markup here."""
    escaped = (
        raw_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    )
    return escaped.replace("\r\n", "\n").replace("\n\n", "<br/><br/>").replace("\n", "<br/>")


def _format_timestamp(dt: Optional[datetime]) -> str:
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d %H:%M")


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, "Page " + str(doc.page))
    canvas.restoreState()


def build_review_summary_pdf(
    reviewed_staff_label: str,
    reviewer_scope_label: str,
    date_from: Optional[date_type],
    date_to: Optional[date_type],
    generated_at_local: datetime,
    records: List[dict],
) -> bytes:
    """Builds the full PDF and returns its bytes. `records` is a list of
    plain dicts (not ORM rows, not Pydantic models — the router is
    responsible for extracting exactly the fields this function reads,
    keeping this module free of any database/schema dependency), each with
    keys: reviewer_member_key, meeting_date, summary_text, created_at,
    updated_at. Ordering is the router's responsibility (meeting_date DESC,
    created_at DESC, matching the UI and LIST route) — this function never
    re-sorts.

    Nothing here touches a database session; this is a pure bytes-in,
    bytes-out builder, mirroring backend/xlsx_export.py's own convention."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
        title=PDF_TITLE,
    )
    base_styles, body_style = _styles()

    story = []
    story.append(Paragraph("Management AIOS", base_styles["Title"]))
    story.append(Paragraph("Employee Review Summary", base_styles["Heading2"]))
    story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph("Reviewed employee: " + _paragraph_text(reviewed_staff_label), body_style))
    story.append(Paragraph("Reviewer scope: " + _paragraph_text(reviewer_scope_label), body_style))
    if date_from is not None:
        story.append(Paragraph("From: " + date_from.isoformat(), body_style))
    if date_to is not None:
        story.append(Paragraph("To: " + date_to.isoformat(), body_style))
    story.append(Paragraph("Generated: " + _format_timestamp(generated_at_local), body_style))
    story.append(Paragraph("Total matching records: " + str(len(records)), body_style))
    story.append(Spacer(1, 0.5 * cm))

    for record in records:
        story.append(HRFlowable(width="100%", color="#999999"))
        story.append(Spacer(1, 0.15 * cm))
        reviewer = resolve_reviewer(record.get("reviewer_member_key"))
        meeting_date = record.get("meeting_date")
        meeting_date_str = meeting_date.isoformat() if meeting_date else ""
        story.append(Paragraph("Meeting date: " + meeting_date_str, body_style))
        story.append(Paragraph("Reviewed by: " + _paragraph_text(reviewer["displayName"]), body_style))
        story.append(Paragraph("Reviewer role: " + _paragraph_text(reviewer["role"]), body_style))
        story.append(Paragraph("Created: " + _format_timestamp(record.get("created_at")), body_style))
        story.append(Paragraph("Updated: " + _format_timestamp(record.get("updated_at")), body_style))
        story.append(Spacer(1, 0.15 * cm))
        story.append(Paragraph(_paragraph_text(record.get("summary_text") or ""), body_style))
        story.append(Spacer(1, 0.35 * cm))

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buffer.getvalue()
