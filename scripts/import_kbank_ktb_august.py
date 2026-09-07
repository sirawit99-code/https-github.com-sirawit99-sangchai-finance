import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent
DATA_PATH = ROOT / "public" / "dashboard-data.json"
MONEY_RE = re.compile(r"-?\d[\d,]*\.\d{2}")


def money(value):
    return float(value.replace(",", ""))


def read_pdf(path, password):
    reader = PdfReader(path)
    assert reader.decrypt(password)
    return "\n".join(page.extract_text() or "" for page in reader.pages), len(reader.pages)


def parse_kbank():
    text, page_count = read_pdf(SOURCE / "KBANK 0869 00023.pdf", "00023")
    lines = text.splitlines()
    starts = []
    for index, line in enumerate(lines):
        match = re.match(r"^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}:\d{2})\s+(.+)$", line.strip())
        if match:
            starts.append((index, match))
    opening, previous, rows = 12_639_570.23, 12_639_570.23, []
    for position, (index, match) in enumerate(starts):
        rest = match.group(5)
        balance_match = MONEY_RE.search(rest)
        assert balance_match
        balance = money(balance_match.group())
        continuation_end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        continuation = " ".join(lines[index + 1:continuation_end])
        description = f"{rest[:balance_match.start()]} {rest[balance_match.end():]} {continuation}"
        description = re.sub(r"KBPDF.*$|ออกโดย K BIZ.*$|ที่ DD\.048.*$", "", description)
        delta = round(balance - previous, 2)
        previous = balance
        rows.append({"bank": "KBANK", "date": f"2026-{match.group(2)}-{match.group(1)}", "time": match.group(4), "direction": "in" if delta > 0 else "out", "amount": round(abs(delta), 2), "description": re.sub(r"\s+", " ", description).strip()})
    incoming = round(sum(row["amount"] for row in rows if row["direction"] == "in"), 2)
    outgoing = round(sum(row["amount"] for row in rows if row["direction"] == "out"), 2)
    assert page_count == 20 and len(rows) == 793
    assert incoming == 29_547_885.65 and outgoing == 29_828_944.62 and previous == 12_358_511.26
    assert round(opening + incoming - outgoing, 2) == previous
    return rows, opening, previous, incoming, outgoing, page_count


def parse_ktb():
    text, page_count = read_pdf(SOURCE / "KTB 0869 0503508000023.pdf", "0503508000023")
    lines = text.splitlines()
    starts = []
    for index, line in enumerate(lines):
        match = re.match(r"^(\d{2})/(\d{2})/2026\s+(\d{2}:\d{2})\s+(.+)$", line.strip())
        if match:
            starts.append((index, match))
    opening, previous, rows = 3_164_263.90, 3_164_263.90, []
    for position, (index, match) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        block = " ".join(lines[index:end])
        amounts = MONEY_RE.findall(match.group(4))
        if len(amounts) >= 2:
            balance = money(amounts[1])
        else:
            block_amounts = MONEY_RE.findall(block)
            code = match.group(4).split()[0]
            balance = money(block_amounts[1] if code == "NMPSDP" else block_amounts[2])
        delta = round(balance - previous, 2)
        previous = balance
        description = re.sub(r"\s+", " ", block).strip()
        rows.append({"bank": "KTB", "date": f"2026-{match.group(2)}-{match.group(1)}", "time": match.group(3), "direction": "in" if delta > 0 else "out", "amount": round(abs(delta), 2), "description": description})
    incoming = round(sum(row["amount"] for row in rows if row["direction"] == "in"), 2)
    outgoing = round(sum(row["amount"] for row in rows if row["direction"] == "out"), 2)
    assert page_count == 62 and len(rows) == 684
    assert incoming == 2_812_255.55 and outgoing == 1_374_361.45 and previous == 4_602_158.00
    assert round(opening + incoming - outgoing, 2) == previous
    return rows, opening, previous, incoming, outgoing, page_count


def main():
    parsed = {"KBANK": parse_kbank(), "KTB": parse_ktb()}
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    data["transactions"] = [row for row in data["transactions"] if not (row["bank"] in parsed and row["date"].startswith("2026-08"))]
    for bank_name, (rows, opening, ending, incoming, outgoing, _) in parsed.items():
        data["transactions"].extend(rows)
        bank = next(item for item in data["banks"] if item["bank"] == bank_name)
        bank["months"] = [month for month in bank["months"] if month["label"] != "ส.ค."]
        bank["months"].append({"label": "ส.ค.", "incoming": incoming, "outgoing": outgoing, "ending": ending})
        bank["incoming"] = round(sum(month["incoming"] for month in bank["months"]), 2)
        bank["outgoing"] = round(sum(month["outgoing"] for month in bank["months"]), 2)
        bank["ending"] = ending
        bank["august_opening"] = opening
    data["transactions"].sort(key=lambda row: (row["date"], row["time"], row["bank"]))
    for bank in data["banks"]:
        bank["transactions"] = sum(row["bank"] == bank["bank"] for row in data["transactions"])

    august_rows = [row for row in data["transactions"] if row["date"].startswith("2026-08")]
    august_incoming = round(sum(row["amount"] for row in august_rows if row["direction"] == "in"), 2)
    august_outgoing = round(sum(row["amount"] for row in august_rows if row["direction"] == "out"), 2)
    data["combined"] = [month for month in data["combined"] if month["label"] != "ส.ค."]
    data["combined"].append({"label": "ส.ค.", "incoming": august_incoming, "outgoing": august_outgoing, "net": round(august_incoming - august_outgoing, 2), "ending": round(sum(bank["ending"] for bank in data["banks"]), 2)})
    data["totals"]["incoming"] = round(sum(bank["incoming"] for bank in data["banks"]), 2)
    data["totals"]["outgoing"] = round(sum(bank["outgoing"] for bank in data["banks"]), 2)
    data["totals"]["ending"] = round(sum(bank["ending"] for bank in data["banks"]), 2)
    data["meta"]["period"] = "1 ม.ค. - 31 ส.ค. 2569"
    data["meta"]["generated"] = datetime.now(timezone(timedelta(hours=7))).isoformat(timespec="seconds")
    assert round(data["totals"]["ending"] - (data["totals"]["opening"] + data["totals"]["incoming"] - data["totals"]["outgoing"]), 2) == 23_439.88
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({bank: {"pages": result[5], "transactions": len(result[0]), "opening": result[1], "incoming": result[3], "outgoing": result[4], "ending": result[2]} for bank, result in parsed.items()}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
