import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "public/dashboard-data.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / "public/sangchai-finance-dashboard.pdf"

pdfmetrics.registerFont(TTFont("Tahoma", "/System/Library/Fonts/Supplemental/Tahoma.ttf"))
pdfmetrics.registerFont(TTFont("Tahoma-Bold", "/System/Library/Fonts/Supplemental/Tahoma Bold.ttf"))

NAVY = colors.HexColor("#172361")
BLUE = colors.HexColor("#293E9A")
RED = colors.HexColor("#D9272E")
LIGHT = colors.HexColor("#F3F5F9")
MUTED = colors.HexColor("#68748C")

styles = getSampleStyleSheet()
title = ParagraphStyle("title", parent=styles["Title"], fontName="Tahoma-Bold", fontSize=22, leading=29, textColor=NAVY, alignment=0)
subtitle = ParagraphStyle("subtitle", parent=styles["Normal"], fontName="Tahoma", fontSize=10, leading=15, textColor=MUTED)
section = ParagraphStyle("section", parent=styles["Heading2"], fontName="Tahoma-Bold", fontSize=15, leading=20, textColor=NAVY, spaceBefore=7, spaceAfter=7)
body = ParagraphStyle("body", parent=styles["Normal"], fontName="Tahoma", fontSize=9, leading=13, textColor=colors.HexColor("#18233F"))
small = ParagraphStyle("small", parent=body, fontSize=7.5, leading=11, textColor=MUTED)

def money(value):
    return f"{value:,.2f} บาท"

def short(value):
    return f"{value / 1_000_000:,.2f} ล้านบาท"

doc = SimpleDocTemplate(str(OUTPUT), pagesize=landscape(A4), rightMargin=15*mm, leftMargin=15*mm, topMargin=12*mm, bottomMargin=12*mm,
    title="รายงาน Dashboard การเงิน 3 ธนาคาร", author="ห้างหุ้นส่วนจำกัด แสงชัยพาณิชย์")
story = [Paragraph("รายงานสรุปการเงิน 3 ธนาคาร", title), Paragraph(f"ห้างหุ้นส่วนจำกัด แสงชัยพาณิชย์ | {DATA['meta']['period']} | สร้างจากข้อมูล Dashboard", subtitle), Spacer(1, 3*mm)]

t = DATA["totals"]
kpis = [["ยอดต้นงวด", "เงินเข้ารวม", "เงินออกรวม", "ยอดปลายงวด"], [money(t["opening"]), money(t["incoming"]), money(t["outgoing"]), money(t["ending"])]]
kpi_table = Table(kpis, colWidths=[63*mm]*4, rowHeights=[9*mm, 14*mm])
kpi_table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),NAVY),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,0),"Tahoma-Bold"),("FONTNAME",(0,1),(-1,1),"Tahoma-Bold"),("FONTSIZE",(0,0),(-1,0),10),("FONTSIZE",(0,1),(-1,1),15),("TEXTCOLOR",(2,1),(2,1),RED),("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("BOX",(0,0),(-1,-1),0.7,colors.HexColor("#DDE2EC")),("INNERGRID",(0,0),(-1,-1),0.5,colors.HexColor("#DDE2EC"))]))
story += [kpi_table, Spacer(1, 3*mm), Paragraph("สรุปแยกธนาคาร", section)]

bank_rows = [["ธนาคาร", "บัญชี", "ต้นงวด", "เงินเข้า", "เงินออก", "ปลายงวด", "จำนวนรายการ"]]
for b in DATA["banks"]:
    bank_rows.append([b["bank"], b["account"], money(b["opening"]), money(b["incoming"]), money(b["outgoing"]), money(b["ending"]), f"{b['transactions']:,}"])
bank_table = Table(bank_rows, colWidths=[22*mm,43*mm,38*mm,42*mm,42*mm,38*mm,25*mm], repeatRows=1)
bank_table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),BLUE),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,0),"Tahoma-Bold"),("FONTNAME",(0,1),(-1,-1),"Tahoma"),("FONTSIZE",(0,0),(-1,-1),8.5),("ALIGN",(2,1),(-1,-1),"RIGHT"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,LIGHT]),("GRID",(0,0),(-1,-1),0.4,colors.HexColor("#DDE2EC")),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
story += [bank_table, Spacer(1, 3*mm), Paragraph("เงินเข้า-ออก รายเดือน", section)]

month_rows = [["เดือน", "เงินเข้า", "เงินออก", "สุทธิ", "ยอดคงเหลือ"]]
for m in DATA["combined"]:
    month_rows.append([m["label"], money(m["incoming"]), money(m["outgoing"]), money(m["net"]), money(m["ending"])])
month_table = Table(month_rows, colWidths=[30*mm,50*mm,50*mm,50*mm,50*mm], repeatRows=1)
month_table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),NAVY),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,0),"Tahoma-Bold"),("FONTNAME",(0,1),(-1,-1),"Tahoma"),("FONTSIZE",(0,0),(-1,-1),8.5),("ALIGN",(1,1),(-1,-1),"RIGHT"),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,LIGHT]),("GRID",(0,0),(-1,-1),0.4,colors.HexColor("#DDE2EC")),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
story += [month_table, Spacer(1, 2*mm), Paragraph("หมายเหตุ: รายงานนี้จัดทำจาก Statement KBANK, BBL และ KTB เพื่อการบริหารและตรวจสอบภายใน รายชื่อคู่โอนบางรายการอาจถูกตัดหรือไม่ปรากฏใน Statement จึงควรตรวจเอกสารต้นทางก่อนอนุมัติหรือใช้เป็นหลักฐานทางบัญชี", small)]

def footer(canvas, document):
    canvas.saveState(); canvas.setFont("Tahoma", 7); canvas.setFillColor(MUTED)
    canvas.drawString(15*mm, 7*mm, "Sangchai Finance Control Center")
    canvas.drawRightString(landscape(A4)[0]-15*mm, 7*mm, f"หน้า {document.page}")
    canvas.restoreState()

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
