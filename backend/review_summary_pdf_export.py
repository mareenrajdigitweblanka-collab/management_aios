"""Employee Review Summary PDF export (REQ-CAL-REV-PDF-003, redesigned for
REQ-CAL-REV-PDF-003-FIX-02).

Builds the in-memory PDF for GET /api/staff-review-summaries/export/pdf
(backend/routers/staff_review_summaries.py). Mirrors backend/xlsx_export.py's
existing convention exactly: a pure, DB-session-free, bytes-in/bytes-out
builder. This module never queries the database and never accepts a
Session — the router does 100% of the querying and passes already-resolved
Python values in.

This is a point-in-time export only. Nothing here writes to the database,
and the generated file has no macros, external links, or upload/sync
affordance — opening it never reaches back into Management AIOS.

Reviewer identity source (corrected, Gate B verification, 2026-08-06):
reviewer display name and role are resolved server-side from
record.reviewer_member_key via resolve_reviewer(), which reads
backend/config.py's one structured MEMBER_DIRECTORY registry — not a
second, independently-invented reviewer registry, and not an isolated
per-member-key conditional living in this module. The browser never
supplies reviewer display name or role for this export; only
reviewer_member_key (an internal join key, never a display value) ever
reaches this module, and only via the already-queried StaffReviewSummary
rows the router passes in — never from a request parameter. This module
reads only backend/config.py at import time; it never opens, parses, or
otherwise depends on any frontend source file (web-view/js/member-
registry.js) at runtime — the two are kept consistent only via a test-time
check (backend/tests/test_review_summary_pdf_export.py).

Filename/Content-Disposition (REQ-CAL-REV-PDF-003-FIX-02): the root cause of
the production "review-summaries.pdf" filename defect was CORS, not this
module or the filename logic itself — backend/main.py's CORSMiddleware did
not expose_headers=["Content-Disposition"], so the browser's own CORS
header-visibility rules hid the header from JavaScript entirely on this
frontend/backend cross-origin deployment, and the frontend's fallback
literal string was shown instead. That is fixed separately in
backend/main.py. This module's own contribution to that fix is emitting a
correctly-formed Content-Disposition value (both filename= and
filename*=UTF-8'') so it is usable once actually exposed.
"""

import re
import unicodedata
import urllib.parse
from datetime import date as date_type, datetime
from io import BytesIO
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from backend.config import MEMBER_DIRECTORY

PDF_TITLE = "Management AIOS Employee Review Summary"

UNKNOWN_REVIEWER = {"displayName": "Unknown", "role": "Unknown"}

_PAGE_WIDTH, _PAGE_HEIGHT = A4
_LEFT_MARGIN = _RIGHT_MARGIN = 2 * cm
_TOP_MARGIN = _BOTTOM_MARGIN = 2 * cm
_CONTENT_WIDTH = _PAGE_WIDTH - _LEFT_MARGIN - _RIGHT_MARGIN

_HEADER_TEXT_COLOR = colors.HexColor("#1f2d3d")
_ACCENT_COLOR = colors.HexColor("#2f5d8a")
_MUTED_COLOR = colors.HexColor("#6b7280")
_BOX_BG_COLOR = colors.HexColor("#f2f5f8")
_BOX_BORDER_COLOR = colors.HexColor("#c7d2dd")
_RECORD_BORDER_COLOR = colors.HexColor("#d8dee5")


def _resolve_member_label(member_key: str):
    """Reads backend/config.py's MEMBER_DIRECTORY[key] directly —
    {displayName, role} is already the registry's own shape, so no
    string-splitting or per-key special case is needed here. Returns
    UNKNOWN_REVIEWER for any key not in MEMBER_DIRECTORY, never a
    fabricated value, never a raised exception — mirrors
    member-registry.js's resolveMember() fallback exactly."""
    entry = MEMBER_DIRECTORY.get(member_key)
    if entry is None:
        return dict(UNKNOWN_REVIEWER)
    return {"displayName": entry["displayName"], "role": entry["role"]}


def resolve_reviewer(member_key: Optional[str]) -> dict:
    """Public entry point — returns {displayName, role}, never None, never
    raises. member_key=None (defensive, not reachable via the database
    NOT NULL constraint on reviewer_member_key) resolves to Unknown/Unknown
    exactly like any other unrecognized key."""
    if not member_key:
        return dict(UNKNOWN_REVIEWER)
    return _resolve_member_label(member_key)


def reviewer_scope_label_for(member_key: Optional[str]) -> str:
    """'<displayName> — <role>' for a specific-reviewer export scope line
    (Phase 7 — "Mayurika — HR"), reusing resolve_reviewer() unchanged. Not
    used for the 'All reviewers' scope, which the router sets directly."""
    entry = resolve_reviewer(member_key)
    return entry["displayName"] + " — " + entry["role"]


# ── Filename / Content-Disposition (REQ-CAL-REV-PDF-003-FIX-02) ─────────

_UNSAFE_FILENAME_CHARS_RE = re.compile(r'[\\/:*?"<>|\r\n\t\x00-\x1f]')
_REPEATED_UNDERSCORE_RE = re.compile(r"_{2,}")
_PDF_SUFFIX_RE = re.compile(r"(?i)\.pdf")
_FILENAME_FALLBACK = "Employee"


def _sanitize_filename_component(raw: str, ascii_only: bool) -> str:
    """Employee display name -> filesystem/HTTP-header-safe filename
    component. The employee name is intentionally identifiable and its
    inclusion is approved (requirement Sec 5.8) -- this function only
    removes characters that are unsafe for a filename or a
    Content-Disposition header, never anything that would defeat that
    approved identifiability. Never raises; a name that sanitizes to empty
    (e.g. all-unsafe input) falls back to a safe generic value rather than
    producing an empty or malformed filename.

    ascii_only=True (used for the plain filename= form): transliterates to
    ASCII first, for maximum client compatibility.
    ascii_only=False (used for the filename*=UTF-8'' form): keeps genuine
    non-ASCII characters, which are then percent-encoded by the caller —
    RFC 5987/6266's own mechanism for a fully accurate, UTF-8-aware
    filename, rather than every client silently receiving only a
    transliterated approximation."""
    if not raw:
        return _FILENAME_FALLBACK
    text = raw
    if ascii_only:
        normalized = unicodedata.normalize("NFKD", text)
        text = normalized.encode("ascii", "ignore").decode("ascii")
    text = text.replace("..", "")  # path traversal
    text = text.replace("/", "_").replace("\\", "_")
    text = _UNSAFE_FILENAME_CHARS_RE.sub("_", text)
    text = text.replace("'", "").replace('"', "")
    text = text.replace(" ", "_")
    text = _PDF_SUFFIX_RE.sub("", text)  # never let the name itself smuggle a second ".pdf"
    text = _REPEATED_UNDERSCORE_RE.sub("_", text)
    text = text.strip("_.")
    return text or _FILENAME_FALLBACK


def build_review_summary_pdf_filename(employee_display_name: str, generated_date: date_type) -> str:
    """Review_Summary_<Sanitized_Employee_Name>_<YYYY-MM-DD>.pdf (requirement
    FIX-02) — the ASCII-safe form, used both as the plain filename= value
    and as the frontend's anchor.download name. Never includes token,
    summary text, reviewer name/role, NIC, contact information, staff/
    summary UUID, or any other database ID — only the sanitized employee
    name and the generation date."""
    safe_name = _sanitize_filename_component(employee_display_name, ascii_only=True)
    return "Review_Summary_" + safe_name + "_" + generated_date.isoformat() + ".pdf"


def build_content_disposition_header(employee_display_name: str, generated_date: date_type) -> str:
    """Builds the full Content-Disposition value — both the ASCII-safe
    filename= (for older/conventional clients) and a UTF-8-preserving
    filename*=UTF-8'' (RFC 5987/6266, for UTF-8-aware clients), so a
    non-ASCII employee name downloads with its real characters wherever the
    client supports it, and with a safe transliterated approximation
    everywhere else. urllib.parse.quote(..., safe='') percent-encodes any
    control character (including CR/LF) by construction, so this value can
    never be used for HTTP header injection regardless of input."""
    ascii_filename = build_review_summary_pdf_filename(employee_display_name, generated_date)
    utf8_name = _sanitize_filename_component(employee_display_name, ascii_only=False)
    utf8_filename = "Review_Summary_" + utf8_name + "_" + generated_date.isoformat() + ".pdf"
    encoded = urllib.parse.quote(utf8_filename, safe="")
    return (
        'attachment; filename="' + ascii_filename + '"; '
        "filename*=UTF-8''" + encoded
    )


# ── PDF body (Phase 7 — management-report redesign) ─────────────────────

def _styles():
    base = getSampleStyleSheet()
    title = ParagraphStyle(
        "ReviewSummaryTitle", parent=base["Title"], textColor=_HEADER_TEXT_COLOR,
        fontSize=22, leading=26, spaceAfter=2,
    )
    subtitle = ParagraphStyle(
        "ReviewSummarySubtitle", parent=base["Heading2"], textColor=_ACCENT_COLOR,
        fontSize=13, leading=16, spaceAfter=10, spaceBefore=0,
    )
    section_label = ParagraphStyle(
        "ReviewSummarySectionLabel", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=9, textColor=_MUTED_COLOR, spaceAfter=1,
    )
    section_value = ParagraphStyle(
        "ReviewSummarySectionValue", parent=base["Normal"], fontSize=11,
        textColor=_HEADER_TEXT_COLOR, spaceAfter=6,
    )
    record_heading = ParagraphStyle(
        "ReviewSummaryRecordHeading", parent=base["Heading3"], textColor=colors.white,
        fontSize=12, leading=15, spaceAfter=0, spaceBefore=0,
    )
    meeting_date = ParagraphStyle(
        "ReviewSummaryMeetingDate", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=11, textColor=_HEADER_TEXT_COLOR, spaceAfter=3,
    )
    reviewer_line = ParagraphStyle(
        "ReviewSummaryReviewerLine", parent=base["Normal"], fontSize=10,
        textColor=_HEADER_TEXT_COLOR, spaceAfter=2,
    )
    summary_label = ParagraphStyle(
        "ReviewSummarySummaryLabel", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=10, textColor=_HEADER_TEXT_COLOR, spaceBefore=6, spaceAfter=3,
    )
    summary_body = ParagraphStyle(
        "ReviewSummarySummaryBody", parent=base["Normal"], fontSize=11, leading=15.5,
        textColor=_HEADER_TEXT_COLOR, alignment=TA_LEFT, spaceAfter=6,
    )
    record_info = ParagraphStyle(
        "ReviewSummaryRecordInfo", parent=base["Normal"], fontSize=8,
        textColor=_MUTED_COLOR, spaceBefore=4,
    )
    return {
        "title": title, "subtitle": subtitle,
        "section_label": section_label, "section_value": section_value,
        "record_heading": record_heading, "meeting_date": meeting_date,
        "reviewer_line": reviewer_line, "summary_label": summary_label,
        "summary_body": summary_body, "record_info": record_info,
    }


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


def _date_scope_text(date_from: Optional[date_type], date_to: Optional[date_type]) -> str:
    """The four approved date-scope phrasings (Phase 7) — never omitted,
    never invents a default range when both are empty."""
    if date_from is not None and date_to is not None:
        return "From " + date_from.isoformat() + " to " + date_to.isoformat()
    if date_from is not None:
        return "From " + date_from.isoformat() + " onward"
    if date_to is not None:
        return "Up to " + date_to.isoformat()
    return "All available dates"


def _boxed_section(flowables, bg_color, border_color):
    """A single-cell Table used purely as a bordered/shaded box around a
    group of flowables — the lightweight 'light borders or shaded
    sections' this design calls for. ONLY safe for content that is always
    short and bounded (the employee-details and export-scope sections,
    a handful of fixed lines each) — Platypus Tables do not split a row's
    content across a page boundary, so this must never wrap a record's
    (potentially very long) summary text; see _record_heading_band for the
    record-level equivalent that stays safe for arbitrarily long content."""
    table = Table([[flowables]], colWidths=[_CONTENT_WIDTH])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_color),
        ("BOX", (0, 0), (-1, -1), 0.75, border_color),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return table


def _record_heading_band(text, style):
    """A short, bounded, shaded 'Review N' banner — safe as a Table (it is
    always one short line, never long enough to risk a LayoutError) — used
    ONLY for the record number heading, never for summary body text, which
    must remain free to split across pages as plain Paragraph flowables."""
    table = Table([[Paragraph(text, style)]], colWidths=[_CONTENT_WIDTH])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _ACCENT_COLOR),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


class _NumberedCanvas(Canvas):
    """Standard ReportLab 'Page X of Y' recipe — showPage() is deferred
    (each page's drawn state is captured, not flushed) until save(), at
    which point the true total page count is known and can be stamped onto
    every already-built page. Also draws the compact repeated header on
    every page after the first, and the confidentiality footer on every
    page. Nothing here touches the database or the filesystem — this is a
    pure in-memory rendering detail."""

    def __init__(self, *args, **kwargs):
        Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_page_decorations(total_pages)
            Canvas.showPage(self)
        Canvas.save(self)

    def _draw_page_decorations(self, total_pages):
        self.saveState()
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 9)
            self.setFillColor(_ACCENT_COLOR)
            self.drawString(_LEFT_MARGIN, _PAGE_HEIGHT - 1.3 * cm, "Management AIOS — Employee Review Summary")
        self.setFont("Helvetica", 8)
        self.setFillColor(_MUTED_COLOR)
        self.drawString(_LEFT_MARGIN, 1.2 * cm, "Confidential — Management Team Use")
        self.drawRightString(_PAGE_WIDTH - _RIGHT_MARGIN, 1.2 * cm, "Page " + str(self._pageNumber) + " of " + str(total_pages))
        self.restoreState()


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

    Nothing here touches a database session, a temp file, or any storage —
    this is a pure bytes-in, bytes-out builder, mirroring
    backend/xlsx_export.py's own convention."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=_LEFT_MARGIN, rightMargin=_RIGHT_MARGIN,
        topMargin=_TOP_MARGIN, bottomMargin=_BOTTOM_MARGIN,
        title=PDF_TITLE,
    )
    styles = _styles()

    story = []

    # ── Document header ───────────────────────────────────────────────
    story.append(Paragraph("Management AIOS", styles["title"]))
    story.append(Paragraph("Employee Review Summary", styles["subtitle"]))
    story.append(Spacer(1, 0.3 * cm))

    # ── Employee details section (boxed) ────────────────────────────────
    employee_box = [
        Paragraph("Reviewed employee", styles["section_label"]),
        Paragraph(_paragraph_text(reviewed_staff_label), styles["section_value"]),
        Paragraph("Total review records", styles["section_label"]),
        Paragraph(str(len(records)), styles["section_value"]),
        Paragraph("Generated", styles["section_label"]),
        Paragraph(_format_timestamp(generated_at_local), styles["section_value"]),
    ]
    story.append(_boxed_section(employee_box, _BOX_BG_COLOR, _BOX_BORDER_COLOR))
    story.append(Spacer(1, 0.35 * cm))

    # ── Export scope section (boxed) ────────────────────────────────────
    scope_box = [
        Paragraph("Reviewer scope", styles["section_label"]),
        Paragraph(_paragraph_text(reviewer_scope_label), styles["section_value"]),
        Paragraph("Date scope", styles["section_label"]),
        Paragraph(_date_scope_text(date_from, date_to), styles["section_value"]),
    ]
    story.append(_boxed_section(scope_box, _BOX_BG_COLOR, _BOX_BORDER_COLOR))
    story.append(Spacer(1, 0.5 * cm))

    # ── Review records ───────────────────────────────────────────────
    # Each record's heading (number + meeting date + reviewer line) is kept
    # together and given a short, bounded, shaded banner (safe as a Table —
    # always one line). The summary body is deliberately plain Paragraph
    # flowables, never wrapped in a Table, so a long summary can split
    # across a page boundary instead of raising a LayoutError — this is
    # what "allow one record to continue safely onto another page" (Phase
    # 7) requires; only the heading itself is protected from being
    # stranded alone at a page bottom.
    for index, record in enumerate(records, start=1):
        reviewer = resolve_reviewer(record.get("reviewer_member_key"))
        meeting_date = record.get("meeting_date")
        meeting_date_str = meeting_date.isoformat() if meeting_date else ""

        if index > 1:
            story.append(HRFlowable(width="100%", thickness=0.6, color=_RECORD_BORDER_COLOR, spaceAfter=8))

        heading_block = KeepTogether([
            _record_heading_band("Review " + str(index), styles["record_heading"]),
            Spacer(1, 0.15 * cm),
            Paragraph("Meeting date: " + meeting_date_str, styles["meeting_date"]),
            Paragraph(
                "Reviewed by: " + _paragraph_text(reviewer["displayName"])
                + " &nbsp;&middot;&nbsp; Reviewer role: " + _paragraph_text(reviewer["role"]),
                styles["reviewer_line"],
            ),
            Paragraph("Review Summary:", styles["summary_label"]),
        ])

        story.append(heading_block)
        story.append(Paragraph(_paragraph_text(record.get("summary_text") or ""), styles["summary_body"]))
        story.append(Paragraph(
            "Record information: Created " + _format_timestamp(record.get("created_at"))
            + " &middot; Updated " + _format_timestamp(record.get("updated_at")),
            styles["record_info"],
        ))
        story.append(Spacer(1, 0.45 * cm))

    doc.build(story, canvasmaker=_NumberedCanvas)
    return buffer.getvalue()
