"""Extract structured data from a receipt PDF.

Reads the PDF with pdfplumber and parses store, date, line items, subtotal,
tax, tip, and total into a JSON object. The parser is tuned for the layout
produced by generate_mock_receipts.py but tries to be tolerant of common
variations: leading/trailing whitespace, multi-space columns, optional tip
line, optional currency symbol.

Usage:
    python extract_receipt.py path/to/receipt.pdf
    python extract_receipt.py path/to/receipt.pdf --out parsed.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

import pdfplumber


MONEY = r"[-+]?\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?"
MONEY_RE = re.compile(MONEY)


def _to_float(s: str) -> float:
    return float(s.replace("$", "").replace(",", "").strip())


# A line item line looks like:
#   "Latte                       2     $5.25       $10.50"
# We anchor on >=2 trailing money tokens. Qty is the integer just before them.
LINE_ITEM_RE = re.compile(
    rf"^(?P<name>.+?)\s+(?P<qty>\d+)\s+(?P<unit>{MONEY})\s+(?P<total>{MONEY})\s*$"
)

DATE_RE = re.compile(r"Date:\s*(\d{4}-\d{2}-\d{2})")
RID_RE = re.compile(r"Receipt:\s*(\S+)")
TAX_RE = re.compile(rf"^Tax(?:\s*\(([\d.]+)%\))?\s+(?P<amt>{MONEY})\s*$", re.IGNORECASE)
SUBTOTAL_RE = re.compile(rf"^Subtotal\s+(?P<amt>{MONEY})\s*$", re.IGNORECASE)
TIP_RE = re.compile(rf"^Tip\s+(?P<amt>{MONEY})\s*$", re.IGNORECASE)
TOTAL_RE = re.compile(rf"^TOTAL\s+(?P<amt>{MONEY})\s*$")


def extract_text(pdf_path: Path) -> str:
    with pdfplumber.open(str(pdf_path)) as pdf:
        return "\n".join((p.extract_text() or "") for p in pdf.pages)


def parse_receipt(text: str) -> Dict[str, Any]:
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        raise ValueError("Empty PDF text")

    result: Dict[str, Any] = {
        "store": lines[0].strip(),
        "address": None,
        "date": None,
        "receipt_id": None,
        "items": [],
        "subtotal": None,
        "tax_rate": None,
        "tax": None,
        "tip": 0.0,
        "total": None,
    }

    # Address is usually the line right after the store name (before "Date:").
    for ln in lines[1:5]:
        if "Date:" in ln:
            break
        if not LINE_ITEM_RE.match(ln) and "Item" not in ln:
            result["address"] = ln.strip()
            break

    for ln in lines:
        m = DATE_RE.search(ln)
        if m and result["date"] is None:
            result["date"] = m.group(1)
        m = RID_RE.search(ln)
        if m and result["receipt_id"] is None:
            result["receipt_id"] = m.group(1)

    # Skip header row "Item Qty Unit Total". Parse line items until we hit a
    # totals row.
    in_items = False
    for ln in lines:
        s = ln.strip()
        if s.startswith("Item") and "Qty" in s and "Total" in s:
            in_items = True
            continue
        if not in_items:
            continue
        if SUBTOTAL_RE.match(s):
            result["subtotal"] = _to_float(SUBTOTAL_RE.match(s).group("amt"))
            in_items = False
            continue
        m = LINE_ITEM_RE.match(s)
        if m:
            result["items"].append({
                "name": m.group("name").strip(),
                "qty": int(m.group("qty")),
                "unit_price": _to_float(m.group("unit")),
                "line_total": _to_float(m.group("total")),
            })

    for ln in lines:
        s = ln.strip()
        m = TAX_RE.match(s)
        if m:
            if m.group(1) is not None:
                result["tax_rate"] = float(m.group(1)) / 100.0
            result["tax"] = _to_float(m.group("amt"))
            continue
        m = TIP_RE.match(s)
        if m:
            result["tip"] = _to_float(m.group("amt"))
            continue
        m = TOTAL_RE.match(s)
        if m:
            result["total"] = _to_float(m.group("amt"))

    return result


def extract(pdf_path: Path) -> Dict[str, Any]:
    return parse_receipt(extract_text(pdf_path))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("pdf", type=Path)
    p.add_argument("--out", type=Path, default=None)
    args = p.parse_args()

    data = extract(args.pdf)
    payload = json.dumps(data, indent=2)
    if args.out:
        args.out.write_text(payload)
        print(f"Wrote {args.out}")
    else:
        print(payload)


if __name__ == "__main__":
    main()
