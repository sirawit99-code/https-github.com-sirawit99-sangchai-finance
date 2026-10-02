import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT_DIR = ROOT / "tmp" / "pdfs" / "september"
DATA_PATH = ROOT / "public" / "dashboard-data.json"
MONEY_RE = re.compile(r"-?\d[\d,]*\.\d{2}")

def money(value): return float(value.replace(",", ""))
def compact(value): return re.sub(r"\s+", " ", value).strip()

def parse_kbank():
    text = (TEXT_DIR / "KBANK.txt").read_text(encoding="utf-8")
    lines = text.splitlines(); starts = []
    for index, line in enumerate(lines):
        match = re.match(r"^(\d{2})-(\d{2})-26\s+(\d{2}:\d{2})\s+(.+)$", line.strip())
        if match: starts.append((index, match))
    opening = previous = 12_358_511.26; rows = []
    for position, (index, match) in enumerate(starts):
        rest = match.group(4); balance_match = MONEY_RE.search(rest)
        if not balance_match: continue
        balance = money(balance_match.group()); end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        description = compact(f"{rest[:balance_match.start()]} {rest[balance_match.end():]} {' '.join(lines[index + 1:end])}")
        description = re.sub(r"KBPDF.*$|ออกโดย K BIZ.*$|ที่ DD\.048.*$", "", description).strip()
        delta = round(balance - previous, 2); previous = balance
        rows.append({"bank":"KBANK","date":f"2026-{match.group(2)}-{match.group(1)}","time":match.group(3),"direction":"in" if delta > 0 else "out","amount":round(abs(delta),2),"description":description})
    incoming = round(sum(r["amount"] for r in rows if r["direction"] == "in"),2); outgoing = round(sum(r["amount"] for r in rows if r["direction"] == "out"),2)
    assert (len(rows),incoming,outgoing,previous) == (681,22_912_582.66,22_594_463.34,12_676_630.58), (len(rows),incoming,outgoing,previous)
    return rows, opening, previous, incoming, outgoing, 17

def parse_ktb():
    text = (TEXT_DIR / "KTB.txt").read_text(encoding="utf-8")
    lines = text.splitlines(); starts = []
    for index, line in enumerate(lines):
        match = re.match(r"^(\d{2})/(\d{2})/2026\s+(\d{2}:\d{2})\s+(.+)$", line.strip())
        if match: starts.append((index, match))
    opening = previous = 4_602_158.00; rows = []
    for position, (index, match) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines); block = compact(" ".join(lines[index:end]))
        balance_match = re.search(r"(-?\d[\d,]*\.\d{2})\s+(?:Interbank|KTB netbank|Krungthai|Krung)", block)
        if balance_match: balance = money(balance_match.group(1))
        else:
            candidates = [money(value) for value in MONEY_RE.findall(block) if 2_000_000 <= money(value) <= 10_000_000]
            assert candidates, block[:220]
            balance = candidates[0]
        delta = round(balance - previous,2); previous = balance
        description = re.sub(r"Krung Thai Bank Public Company Limited.*$", "", block).strip()
        rows.append({"bank":"KTB","date":f"2026-{match.group(2)}-{match.group(1)}","time":match.group(3),"direction":"in" if delta > 0 else "out","amount":round(abs(delta),2),"description":description})
    incoming = round(sum(r["amount"] for r in rows if r["direction"] == "in"),2); outgoing = round(sum(r["amount"] for r in rows if r["direction"] == "out"),2)
    assert (len(rows),incoming,outgoing,previous) == (680,2_746_036.04,2_653_635.69,4_694_558.35), (len(rows),incoming,outgoing,previous)
    return rows, opening, previous, incoming, outgoing, 62

def parse_bbl():
    text = (TEXT_DIR / "BBL.txt").read_text(encoding="utf-8")
    pattern = re.compile(r"(?m)^(-?[\d,]+\.\d{2})\s+(Mobile Phone|Automatic|Cash Management|Branch|Internet Banking|Business iBanking|ATM|Counter|BAHTNET|eSaving)(.*)$")
    matches = list(pattern.finditer(text)); opening = 7_729_813.39; raw = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text); block = compact(text[match.start():end]); stamp = re.search(r"(\d{2})/(\d{2})/2026\s+(\d{2}:\d{2}):\d{2}", block)
        assert stamp, block[:180]
        description = re.sub(r"Transaction Report.*$", "", block).strip()
        raw.append({"date":f"2026-{stamp.group(2)}-{stamp.group(1)}","time":stamp.group(3),"balance":money(match.group(1)),"description":description})
    rows = []
    for index, row in enumerate(raw):
        older = raw[index + 1]["balance"] if index + 1 < len(raw) else opening; delta = round(row["balance"] - older,2)
        rows.append({"bank":"BBL","date":row["date"],"time":row["time"],"direction":"in" if delta > 0 else "out","amount":round(abs(delta),2),"description":row["description"]})
    rows.sort(key=lambda r:(r["date"],r["time"])); row_incoming = round(sum(r["amount"] for r in rows if r["direction"] == "in"),2); row_outgoing = round(sum(r["amount"] for r in rows if r["direction"] == "out"),2); ending = raw[0]["balance"]
    # The September BBL footer discloses debit and credit totals that are each
    # 55,331.97 above the movements reconstructed from the printed ledger balances.
    # Preserve the statement totals in the monthly summary and retain the 683
    # traceable ledger rows for drill-down; the difference is surfaced in quality notes.
    incoming, outgoing = 5_836_262.92, 6_035_003.10
    assert (len(rows),row_incoming,row_outgoing,ending) == (683,5_780_930.95,5_979_671.13,7_531_073.21), (len(rows),row_incoming,row_outgoing,ending)
    assert round(opening + incoming - outgoing,2) == ending
    return rows, opening, ending, incoming, outgoing, 21

def main():
    parsed = {"KBANK":parse_kbank(),"BBL":parse_bbl(),"KTB":parse_ktb()}; data = json.loads(DATA_PATH.read_text(encoding="utf-8")); data["transactions"] = [r for r in data["transactions"] if not r["date"].startswith("2026-09")]
    for bank_name,(rows,opening,ending,incoming,outgoing,_) in parsed.items():
        data["transactions"].extend(rows); bank = next(b for b in data["banks"] if b["bank"] == bank_name)
        bank["months"] = [m for m in bank["months"] if m["label"] != "ก.ย."]; assert round(bank["months"][-1]["ending"],2) == opening, (bank_name,bank["months"][-1]["ending"],opening)
        bank["months"].append({"label":"ก.ย.","incoming":incoming,"outgoing":outgoing,"ending":ending}); bank["incoming"] = round(sum(m["incoming"] for m in bank["months"]),2); bank["outgoing"] = round(sum(m["outgoing"] for m in bank["months"]),2); bank["ending"] = ending; bank["september_opening"] = opening
    data["transactions"].sort(key=lambda r:(r["date"],r["time"],r["bank"]))
    for bank in data["banks"]: bank["transactions"] = sum(r["bank"] == bank["bank"] for r in data["transactions"])
    rows = [r for r in data["transactions"] if r["date"].startswith("2026-09")]
    # Monthly management totals follow each statement footer. BBL's traceable
    # transaction rows are lower by 55,331.97 on both sides; that exception is
    # retained separately in the data-quality warning.
    incoming = round(sum(result[3] for result in parsed.values()), 2)
    outgoing = round(sum(result[4] for result in parsed.values()), 2)
    data["combined"] = [m for m in data["combined"] if m["label"] != "ก.ย."]; data["combined"].append({"label":"ก.ย.","incoming":incoming,"outgoing":outgoing,"net":round(incoming-outgoing,2),"ending":round(sum(b["ending"] for b in data["banks"]),2)})
    data["totals"]["incoming"] = round(sum(b["incoming"] for b in data["banks"]),2); data["totals"]["outgoing"] = round(sum(b["outgoing"] for b in data["banks"]),2); data["totals"]["ending"] = round(sum(b["ending"] for b in data["banks"]),2); data["meta"]["period"] = "1 ม.ค. - 30 ก.ย. 2569"; data["meta"]["generated"] = datetime.now(timezone(timedelta(hours=7))).isoformat(timespec="seconds")
    for item in data.get("quality",[]):
        if item["label"] == "ช่วงข้อมูล": item.update({"status":"pass","detail":"KBANK, BBL และ KTB ครบ ม.ค.–ก.ย. 2569"})
        if item["label"] == "รายละเอียดคู่โอน BBL": item.update({"status":"warn","detail":"Statement ก.ย. แสดงยอด Debit/Credit สูงกว่ายอดที่ไล่จาก Ledger Balance ฝั่งละ 55,331.97 บาท และหลายรายการไม่แสดงชื่อคู่โอน ต้องตรวจเอกสารธนาคาร"})
    related = [r for r in data["transactions"] if re.search(r"X1654|X9397", r["description"], re.I)]
    related_out = round(sum(r["amount"] for r in related if r["direction"] == "out"), 2)
    related_in = round(sum(r["amount"] for r in related if r["direction"] == "in"), 2)
    for alert in data.get("alerts", []):
        if alert.get("title") == "พบบัญชีชื่อกิจการที่ยังไม่มี Statement":
            alert["detail"] = f"KBANK โอนไป X1654 และ X9397 รวม {related_out / 1_000_000:.2f} ล้านบาท และรับจาก X9397 {related_in / 1_000_000:.2f} ล้านบาท"
        if "สูงที่สุดในรอบ 7 เดือน" in alert.get("detail", ""):
            alert["detail"] = alert["detail"].replace("สูงที่สุดในรอบ 7 เดือน", "สูงที่สุดในรอบ 9 เดือน")
    assert round(data["totals"]["ending"]-(data["totals"]["opening"]+data["totals"]["incoming"]-data["totals"]["outgoing"]),2) == 23_439.88
    DATA_PATH.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf-8"); print(json.dumps({bank:{"pages":r[5],"transactions":len(r[0]),"opening":r[1],"incoming":r[3],"outgoing":r[4],"ending":r[2]} for bank,r in parsed.items()},ensure_ascii=False,indent=2))

if __name__ == "__main__": main()
