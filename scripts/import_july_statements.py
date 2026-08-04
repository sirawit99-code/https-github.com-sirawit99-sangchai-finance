import io
import json
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import msoffcrypto
import pandas as pd
import pdfplumber
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent
DATA_PATH = ROOT / "public" / "dashboard-data.json"
MONEY_RE = re.compile(r"-?\d[\d,]*\.\d{2}")


def money(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return 0.0
    return float(str(value).replace(",", "").strip())


def txn(bank, date, time, delta, description):
    return {
        "bank": bank,
        "date": date,
        "time": time,
        "direction": "in" if delta > 0 else "out",
        "amount": round(abs(delta), 2),
        "description": re.sub(r"\s+", " ", description).strip(),
    }


def parse_kbank():
    reader = PdfReader(SOURCE / "KBNAK 0769 00023.pdf", password="00023")
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    starts = []
    lines = text.splitlines()
    for index, line in enumerate(lines):
        match = re.match(r"^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}:\d{2})\s+(.+)$", line.strip())
        if match:
            starts.append((index, match))
    opening = 12_843_485.14
    previous = opening
    rows = []
    for position, (index, match) in enumerate(starts):
        rest = match.group(5)
        balance_match = MONEY_RE.search(rest)
        if not balance_match:
            continue
        balance = money(balance_match.group())
        continuation_end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        continuation = " ".join(lines[index + 1:continuation_end])
        description = f"{rest[:balance_match.start()]} {rest[balance_match.end():]} {continuation}"
        description = re.sub(r"KBPDF.*$|ออกโดย K BIZ.*$|ที่ DD\.048.*$", "", description)
        delta = round(balance - previous, 2)
        previous = balance
        if delta:
            rows.append(txn("KBANK", f"2026-{match.group(2)}-{match.group(1)}", match.group(4), delta, description))
    incoming = round(sum(row["amount"] for row in rows if row["direction"] == "in"), 2)
    outgoing = round(sum(row["amount"] for row in rows if row["direction"] == "out"), 2)
    assert len(rows) == 836, len(rows)
    assert incoming == 30_579_169.35, incoming
    assert outgoing == 30_783_084.26, outgoing
    return rows, opening, previous


def parse_bbl():
    raw_rows = []
    with pdfplumber.open(SOURCE / "BBL0769.pdf") as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for cells in table:
                    text = " ".join(cell or "" for cell in cells).strip()
                    match = re.match(r"^(\d{2})/(\d{2})/(2026)\s+\1/\2/2026\s+(.+)$", text, re.S)
                    if not match:
                        continue
                    amounts = MONEY_RE.findall(text)
                    if len(amounts) < 2:
                        continue
                    balance = money(amounts[-1])
                    time_match = re.search(r"(\d{2}:\d{2}:\d{2})", text)
                    description = match.group(4)
                    description = re.sub(r"\d{2}:\d{2}:\d{2}", "", description)
                    description = MONEY_RE.sub("", description)
                    description = re.sub(r"Mobile Phone\s+Banking|Automatic|eSaving|HEAD OFFICE|Metro Branch", "", description, flags=re.I)
                    raw_rows.append({
                        "date": f"2026-{match.group(2)}-{match.group(1)}",
                        "time": time_match.group(1)[:5] if time_match else "00:00",
                        "balance": balance,
                        "description": description,
                    })
    # The report is newest-to-oldest. The next row is the balance immediately before the current row.
    ending = raw_rows[0]["balance"]
    total_in = 6_023_626.39
    total_out = 5_955_502.48
    opening = round(ending - total_in + total_out, 2)
    rows = []
    for index, row in enumerate(raw_rows):
        older_balance = raw_rows[index + 1]["balance"] if index + 1 < len(raw_rows) else opening
        delta = round(row["balance"] - older_balance, 2)
        if delta:
            rows.append(txn("BBL", row["date"], row["time"], delta, row["description"]))
    rows.sort(key=lambda row: (row["date"], row["time"]))
    incoming = round(sum(row["amount"] for row in rows if row["direction"] == "in"), 2)
    outgoing = round(sum(row["amount"] for row in rows if row["direction"] == "out"), 2)
    assert incoming == total_in, incoming
    assert outgoing == total_out, outgoing
    return rows, opening, ending


def parse_ktb():
    encrypted = msoffcrypto.OfficeFile(open(SOURCE / "KTB 0769 0503508000023.xls", "rb"))
    encrypted.load_key(password="0503508000023")
    decrypted = io.BytesIO()
    encrypted.decrypt(decrypted)
    decrypted.seek(0)
    frame = pd.read_excel(decrypted, header=None, engine="xlrd")
    opening = money(frame.iloc[11, 6])
    previous = opening
    rows = []
    for _, record in frame.iloc[12:].iterrows():
        stamp = str(record.iloc[0]) if not pd.isna(record.iloc[0]) else ""
        match = re.match(r"(\d{2})/(\d{2})/2026\s+(\d{2}:\d{2})", stamp)
        if not match:
            continue
        balance = money(record.iloc[6])
        delta = round(balance - previous, 2)
        previous = balance
        description = " ".join(str(value) for value in (record.iloc[1], record.iloc[2], record.iloc[7]) if not pd.isna(value))
        if delta:
            rows.append(txn("KTB", f"2026-{match.group(2)}-{match.group(1)}", match.group(3), delta, description))
    incoming = round(sum(row["amount"] for row in rows if row["direction"] == "in"), 2)
    outgoing = round(sum(row["amount"] for row in rows if row["direction"] == "out"), 2)
    assert len(rows) == 701, len(rows)
    assert incoming == 2_661_737.86, incoming
    assert outgoing == 1_994_382.49, outgoing
    return rows, opening, previous


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    parsed = {"KBANK": parse_kbank(), "BBL": parse_bbl(), "KTB": parse_ktb()}
    data["transactions"] = [row for row in data["transactions"] if not row["date"].startswith("2026-07")]
    july_rows = []
    for bank in data["banks"]:
        rows, july_opening, july_ending = parsed[bank["bank"]]
        incoming = round(sum(row["amount"] for row in rows if row["direction"] == "in"), 2)
        outgoing = round(sum(row["amount"] for row in rows if row["direction"] == "out"), 2)
        bank["incoming"] = round(sum(month["incoming"] for month in bank["months"] if month["label"] != "ก.ค.") + incoming, 2)
        bank["outgoing"] = round(sum(month["outgoing"] for month in bank["months"] if month["label"] != "ก.ค.") + outgoing, 2)
        bank["ending"] = round(july_ending, 2)
        bank["transactions"] = sum(1 for row in data["transactions"] if row["bank"] == bank["bank"]) + len(rows)
        bank["months"] = [month for month in bank["months"] if month["label"] != "ก.ค."]
        bank["months"].append({"label": "ก.ค.", "incoming": incoming, "outgoing": outgoing, "ending": round(july_ending, 2)})
        july_rows.extend(rows)
        bank["july_opening"] = round(july_opening, 2)
    data["transactions"].extend(sorted(july_rows, key=lambda row: (row["date"], row["time"], row["bank"])))
    july_in = round(sum(row["amount"] for row in july_rows if row["direction"] == "in"), 2)
    july_out = round(sum(row["amount"] for row in july_rows if row["direction"] == "out"), 2)
    july_end = round(sum(bank["ending"] for bank in data["banks"]), 2)
    data["combined"] = [month for month in data["combined"] if month["label"] != "ก.ค."]
    data["combined"].append({"label": "ก.ค.", "incoming": july_in, "outgoing": july_out, "net": round(july_in - july_out, 2), "ending": july_end})
    data["totals"]["incoming"] = round(sum(bank["incoming"] for bank in data["banks"]), 2)
    data["totals"]["outgoing"] = round(sum(bank["outgoing"] for bank in data["banks"]), 2)
    data["totals"]["ending"] = july_end
    data["meta"]["period"] = "1 ม.ค. - 31 ก.ค. 2569"
    data["meta"]["generated"] = datetime.now(timezone(timedelta(hours=7))).isoformat(timespec="seconds")
    for item in data.get("quality", []):
        if item["label"] == "สมการยอดคงเหลือ":
            item.update({"status": "warn", "detail": "KBANK และ KTB กระทบยอดครบ; BBL ยอดต้นเดือน ก.ค. ต่างจากยอดปลายเดือน มิ.ย. 23,479.00 บาท ต้องขอรายการคาบเกี่ยว"})
        elif item["label"] == "ช่วงข้อมูล":
            item.update({"status": "pass", "detail": "KBANK, BBL และ KTB ครบ ม.ค.–ก.ค. 2569"})
    for item in data.get("alerts", []):
        if item["title"] == "เมษายนเงินออกสูงกว่าเงินเข้า":
            item["detail"] = "เงินออกมากกว่าเงินเข้า 7.51 ล้านบาท สูงที่สุดในรอบ 7 เดือน"
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({
        "july_transactions": len(july_rows),
        "july_incoming": july_in,
        "july_outgoing": july_out,
        "july_ending": july_end,
        "all_transactions": len(data["transactions"]),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Import failed: {exc}", file=sys.stderr)
        raise
