import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "BBL 0869.pdf"
DATA_PATH = ROOT / "public" / "dashboard-data.json"
MONEY_RE = re.compile(r"-?\d[\d,]*\.\d{2}")


def money(value):
    return float(value.replace(",", ""))


def parse_statement():
    raw_rows = []
    with pdfplumber.open(SOURCE) as pdf:
        page_count = len(pdf.pages)
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
                    time_match = re.search(r"(\d{2}:\d{2}:\d{2})", text)
                    description = match.group(4)
                    description = re.sub(r"\d{2}:\d{2}:\d{2}", "", description)
                    description = MONEY_RE.sub("", description)
                    description = re.sub(r"Mobile Phone\s+Banking|Cash\s+Management|Automatic|eSaving|HEAD OFFICE|Metro\s+Branch", "", description, flags=re.I)
                    raw_rows.append({"date": f"2026-{match.group(2)}-{match.group(1)}", "time": time_match.group(1)[:5] if time_match else "00:00", "balance": money(amounts[-1]), "description": re.sub(r"\s+", " ", description).strip()})

    opening, expected_incoming, expected_outgoing = 6_838_541.85, 6_642_551.75, 5_751_280.21
    rows = []
    for index, row in enumerate(raw_rows):
        older_balance = raw_rows[index + 1]["balance"] if index + 1 < len(raw_rows) else opening
        delta = round(row["balance"] - older_balance, 2)
        if delta:
            rows.append({"bank": "BBL", "date": row["date"], "time": row["time"], "direction": "in" if delta > 0 else "out", "amount": round(abs(delta), 2), "description": row["description"]})
    rows.sort(key=lambda row: (row["date"], row["time"]))
    incoming = round(sum(row["amount"] for row in rows if row["direction"] == "in"), 2)
    outgoing = round(sum(row["amount"] for row in rows if row["direction"] == "out"), 2)
    ending = raw_rows[0]["balance"]
    assert page_count == 20 and len(rows) == 676
    assert rows[0]["date"] == "2026-08-01" and rows[-1]["date"] == "2026-08-31"
    assert incoming == expected_incoming and outgoing == expected_outgoing
    assert round(opening + incoming - outgoing, 2) == ending
    return rows, opening, ending, incoming, outgoing, page_count


def main():
    rows, opening, ending, incoming, outgoing, page_count = parse_statement()
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    data["transactions"] = [row for row in data["transactions"] if not (row["bank"] == "BBL" and row["date"].startswith("2026-08"))]
    data["transactions"].extend(rows)
    data["transactions"].sort(key=lambda row: (row["date"], row["time"], row["bank"]))

    bbl = next(bank for bank in data["banks"] if bank["bank"] == "BBL")
    bbl["months"] = [month for month in bbl["months"] if month["label"] != "ส.ค."]
    bbl["months"].append({"label": "ส.ค.", "incoming": incoming, "outgoing": outgoing, "ending": ending})
    bbl["incoming"] = round(sum(month["incoming"] for month in bbl["months"]), 2)
    bbl["outgoing"] = round(sum(month["outgoing"] for month in bbl["months"]), 2)
    bbl["ending"], bbl["transactions"], bbl["august_opening"] = ending, sum(row["bank"] == "BBL" for row in data["transactions"]), opening

    august_rows = [row for row in data["transactions"] if row["date"].startswith("2026-08")]
    august_incoming = round(sum(row["amount"] for row in august_rows if row["direction"] == "in"), 2)
    august_outgoing = round(sum(row["amount"] for row in august_rows if row["direction"] == "out"), 2)
    data["combined"] = [month for month in data["combined"] if month["label"] != "ส.ค."]
    data["combined"].append({"label": "ส.ค.", "incoming": august_incoming, "outgoing": august_outgoing, "net": round(august_incoming - august_outgoing, 2), "ending": round(sum(bank["ending"] for bank in data["banks"]), 2)})
    data["totals"]["incoming"] = round(sum(bank["incoming"] for bank in data["banks"]), 2)
    data["totals"]["outgoing"] = round(sum(bank["outgoing"] for bank in data["banks"]), 2)
    data["totals"]["ending"] = round(sum(bank["ending"] for bank in data["banks"]), 2)
    data["meta"]["period"] = "1 ม.ค. - 31 ส.ค. 2569 (BBL ถึง ส.ค.; KBANK/KTB ถึง ก.ค.)"
    data["meta"]["generated"] = datetime.now(timezone(timedelta(hours=7))).isoformat(timespec="seconds")
    # The previously disclosed BBL June-to-July continuity difference remains 23,479 baht.
    # August itself reconciles exactly to the July closing balance.
    assert round(bbl["ending"] - (bbl["opening"] + bbl["incoming"] - bbl["outgoing"]), 2) == 23_479.00
    # Combined difference is BBL 23,479.00 less KTB withholding tax 39.12.
    assert round(data["totals"]["ending"] - (data["totals"]["opening"] + data["totals"]["incoming"] - data["totals"]["outgoing"]), 2) == 23_439.88
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"source": SOURCE.name, "period": [rows[0]["date"], rows[-1]["date"]], "pages": page_count, "transactions": len(rows), "opening": opening, "incoming": incoming, "outgoing": outgoing, "ending": ending}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
