"""End-to-end receipt batch processor.

Drop receipt PDFs into ``inbox/``, run ``python process_batch.py``, and get:

  * ``out/<YYYY>/<MM>/items.csv``       - one row per line item
  * ``out/<YYYY>/<MM>/spending.png``    - cumulative monthly visualization
  * ``out/<YYYY>/<MM>/receipts/*.json`` - parsed receipt JSON
  * ``out/<YYYY>/<MM>/receipts/*.png``  - per-receipt page screenshot
  * ``out/batches/<run-ts>/spending.png`` - viz for just this batch
  * ``out/batches/<run-ts>/batch_report.json`` - PASS/FAIL + uncategorized list

Source PDFs are moved to ``processed/`` after successful extraction; pass
``--keep`` to leave them in the inbox.
"""
from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).parent
SKILL_SCRIPTS = ROOT / ".claude/skills/receipt-analyzer/scripts"
sys.path.insert(0, str(SKILL_SCRIPTS))

import extract_receipt  # noqa: E402
import render_screenshot  # noqa: E402
import verify_receipt  # noqa: E402

from categorize import categorize, UNCATEGORIZED  # noqa: E402
from visualize_spending import plot_receipts  # noqa: E402

CSV_HEADER = [
    "date", "year_month", "store", "category", "receipt_id",
    "item", "qty", "unit_price", "line_total",
    "tax", "tip", "total", "source_pdf",
]


def receipt_to_rows(parsed: dict, source_pdf: Path) -> list[dict]:
    date = parsed.get("date") or ""
    year_month = date[:7] if len(date) >= 7 else ""
    store = parsed.get("store") or ""
    category = categorize(store)
    receipt_id = parsed.get("receipt_id") or source_pdf.stem
    rows = []
    for item in parsed.get("items", []):
        rows.append({
            "date": date,
            "year_month": year_month,
            "store": store,
            "category": category,
            "receipt_id": receipt_id,
            "item": item.get("name", ""),
            "qty": item.get("qty", ""),
            "unit_price": f"{item.get('unit_price', 0):.2f}",
            "line_total": f"{item.get('line_total', 0):.2f}",
            "tax": f"{parsed.get('tax') or 0:.2f}",
            "tip": f"{parsed.get('tip') or 0:.2f}",
            "total": f"{parsed.get('total') or 0:.2f}",
            "source_pdf": source_pdf.name,
        })
    return rows


def date_parts(parsed: dict) -> tuple[str, str]:
    """Return ('YYYY', 'MM'). Falls back to 'unknown' if date is missing."""
    date = parsed.get("date") or ""
    if len(date) >= 7 and date[4] == "-":
        return date[:4], date[5:7]
    return "unknown", "unknown"


def append_csv_dedup(csv_path: Path, rows: list[dict]) -> int:
    """Append rows to csv_path, skipping any whose (receipt_id, item) already
    exists in the file. Returns count actually written."""
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    existing_keys: set[tuple[str, str]] = set()
    if csv_path.exists():
        with csv_path.open() as f:
            for r in csv.DictReader(f):
                existing_keys.add((r.get("receipt_id", ""), r.get("item", "")))

    new_rows = [r for r in rows
                if (r["receipt_id"], r["item"]) not in existing_keys]
    if not new_rows:
        return 0

    write_header = not csv_path.exists()
    with csv_path.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CSV_HEADER)
        if write_header:
            w.writeheader()
        w.writerows(new_rows)
    return len(new_rows)


def load_month_receipts(month_dir: Path) -> list[dict]:
    """Load all parsed-receipt JSONs accumulated in a month's receipts/ dir."""
    receipts_dir = month_dir / "receipts"
    if not receipts_dir.exists():
        return []
    out = []
    for jp in sorted(receipts_dir.glob("*.json")):
        try:
            out.append(json.loads(jp.read_text()))
        except json.JSONDecodeError:
            continue
    return out


def process_one(pdf: Path, out_root: Path, do_screenshot: bool
                ) -> tuple[dict | None, dict, str | None]:
    """Returns (parsed, batch_record, error_or_none)."""
    try:
        parsed = extract_receipt.extract(pdf)
    except Exception as e:  # noqa: BLE001 - surface anything pdfplumber throws
        return None, {
            "source_pdf": pdf.name, "passed": False,
            "error": f"extraction failed: {e}",
        }, str(e)

    rpt = verify_receipt.verify(parsed)
    year, month = date_parts(parsed)
    month_dir = out_root / year / month
    receipts_dir = month_dir / "receipts"
    receipts_dir.mkdir(parents=True, exist_ok=True)

    rid = parsed.get("receipt_id") or pdf.stem
    safe_rid = "".join(c if c.isalnum() or c in "-_" else "_" for c in rid)
    json_path = receipts_dir / f"{safe_rid}.json"
    json_path.write_text(json.dumps(parsed, indent=2))

    if do_screenshot:
        try:
            render_screenshot.render(pdf, receipts_dir / f"{safe_rid}.png")
        except Exception as e:  # noqa: BLE001
            print(f"  warn: screenshot failed for {pdf.name}: {e}")

    record = {
        "source_pdf": pdf.name,
        "store": parsed.get("store"),
        "date": parsed.get("date"),
        "category": categorize(parsed.get("store")),
        "total": parsed.get("total"),
        "passed": rpt.passed,
        "issues": [asdict(i) for i in rpt.issues],
        "year_month": f"{year}-{month}",
    }
    return parsed, record, None


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--inbox", type=Path, default=ROOT / "inbox")
    p.add_argument("--out",   type=Path, default=ROOT / "out")
    p.add_argument("--processed", type=Path, default=ROOT / "processed")
    p.add_argument("--keep", action="store_true",
                   help="Leave PDFs in inbox/ instead of moving to processed/")
    p.add_argument("--no-screenshots", action="store_true",
                   help="Skip per-receipt PNG rendering")
    args = p.parse_args()

    args.inbox.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)
    if not args.keep:
        args.processed.mkdir(parents=True, exist_ok=True)

    pdfs = sorted(args.inbox.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {args.inbox}. Drop receipt PDFs there and re-run.")
        return

    run_ts = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    batch_dir = args.out / "batches" / run_ts
    batch_dir.mkdir(parents=True, exist_ok=True)

    batch_records: list[dict[str, Any]] = []
    batch_parsed: list[dict] = []
    months_touched: set[tuple[str, str]] = set()
    uncategorized_stores: set[str] = set()
    rows_written_total = 0

    print(f"Processing {len(pdfs)} receipts from {args.inbox}")
    for pdf in pdfs:
        parsed, record, err = process_one(pdf, args.out, not args.no_screenshots)
        batch_records.append(record)
        verdict = "PASS" if record["passed"] else "FAIL"
        store = record.get("store") or "?"
        print(f"  [{verdict}] {pdf.name}  store={store!r}  total={record.get('total')}")

        if err is not None or parsed is None:
            continue

        batch_parsed.append(parsed)
        if record["category"] == UNCATEGORIZED and record.get("store"):
            uncategorized_stores.add(record["store"])

        year, month = date_parts(parsed)
        months_touched.add((year, month))
        month_dir = args.out / year / month
        rows = receipt_to_rows(parsed, pdf)
        rows_written_total += append_csv_dedup(month_dir / "items.csv", rows)

        if not args.keep:
            shutil.move(str(pdf), str(args.processed / pdf.name))

    # Per-month visualizations: regenerate from full accumulated month state.
    for year, month in sorted(months_touched):
        month_dir = args.out / year / month
        receipts = load_month_receipts(month_dir)
        if receipts:
            plot_receipts(receipts, categorize,
                          month_dir / "spending.png",
                          title_suffix=f"{year}-{month}")

    # Batch-only visualization.
    if batch_parsed:
        plot_receipts(batch_parsed, categorize,
                      batch_dir / "spending.png",
                      title_suffix=f"batch {run_ts}")

    report = {
        "run_timestamp": run_ts,
        "inbox": str(args.inbox),
        "out": str(args.out),
        "received": len(pdfs),
        "passed": sum(1 for r in batch_records if r["passed"]),
        "failed": sum(1 for r in batch_records if not r["passed"]),
        "rows_appended_to_csv": rows_written_total,
        "months_touched": [f"{y}-{m}" for y, m in sorted(months_touched)],
        "uncategorized_stores": sorted(uncategorized_stores),
        "results": batch_records,
    }
    (batch_dir / "batch_report.json").write_text(json.dumps(report, indent=2))

    print()
    print(f"Done. {report['passed']}/{report['received']} passed verification.")
    print(f"Rows appended to month CSVs: {rows_written_total}")
    if uncategorized_stores:
        print(f"Uncategorized stores (extend categorize.py): "
              f"{sorted(uncategorized_stores)}")
    print(f"Batch report: {batch_dir / 'batch_report.json'}")


if __name__ == "__main__":
    main()
