import sys, hashlib
from io import BytesIO
from pypdf import PdfReader
from backend.tests import test_review_summary_attachments as t
tag = sys.argv[1]; out = sys.argv[2]
C = t.ReviewSummaryAttachmentsTestCase
case = C('test_history_pdf_export_still_embeds_attachment_contents') if hasattr(C,'test_history_pdf_export_still_embeds_attachment_contents') else C('test_zip_export_empty_result_returns_404')
case.setUp()
try:
    sid = case.seed_staff(full_name="Inspect Staff")
    ups = [case.upload("mayurika","scan.pdf",t.make_pdf_bytes("Unique attached content marker"),"application/pdf"),
           case.upload("mayurika","meeting.mp3",b"fake","audio/mpeg"),
           case.upload("mayurika","photo.png",t.make_png_bytes(),"image/png")]
    case.create_summary("mayurika", sid, attachment_ids=[u.json()["id"] for u in ups])
    sid2 = case.seed_staff("staff-empty-002", full_name="Inspect Empty Staff")
    case.create_summary("mayurika", sid2)
    def get(path, staff):
        r = case.client.get("/api/staff-review-summaries/"+path, params={"reviewed_staff_id":staff,"reviewer_member_key":"mayurika"}, headers=t.bearer_header("mayurika"))
        return r
    for name,path,staff in [("history","export/pdf/history",sid),("pdf","export/pdf",sid),("pdf_noatt","export/pdf",sid2)]:
        r = get(path,staff)
        open(f"{out}/{tag}_{name}.pdf","wb").write(r.content)
        rd = PdfReader(BytesIO(r.content))
        txt = "".join(p.extract_text() or "" for p in rd.pages)
        print(tag,name,r.status_code,"pages",len(rd.pages),"cd",r.headers.get("content-disposition"))
        open(f"{out}/{tag}_{name}.txt","w",encoding="utf-8").write(txt)
finally:
    case.tearDown()
