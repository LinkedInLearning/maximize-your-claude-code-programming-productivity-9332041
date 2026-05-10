"""Verify that the numbers on a parsed receipt add up.

Three checks per receipt:
  1. line_check:    qty * unit_price == line_total       (every line item)
  2. subtotal_check: sum(line_totals) == subtotal
  3. total_check:   subtotal + tax + tip == total

Floating-point drift is tolerated within --tol (default $0.01).

Input is the JSON produced by extract_receipt.py. Outputs a structured
verification report and exits non-zero if any check fails.

Usage:
    python verify_receipt.py parsed.json
    python extract_receipt.py r.pdf | python verify_receipt.py -    # piped
    python verify_receipt.py parsed.json --tol 0.02
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import List, Dict, Any


@dataclass
class Issue:
    check: str
    expected: float
    actual: float
    delta: float
    detail: str = ""


@dataclass
class Report:
    passed: bool
    issues: List[Issue] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)


def _close(a: float, b: float, tol: float) -> bool:
    return abs(round(a, 2) - round(b, 2)) <= tol


def verify(receipt: Dict[str, Any], tol: float = 0.01) -> Report:
    issues: List[Issue] = []
    items = receipt.get("items") or []

    # 1. Each line item: qty * unit_price == line_total
    for idx, item in enumerate(items):
        expected = round(item["qty"] * item["unit_price"], 2)
        actual = round(item["line_total"], 2)
        if not _close(expected, actual, tol):
            issues.append(Issue(
                check="line_check",
                expected=expected, actual=actual,
                delta=round(actual - expected, 2),
                detail=f"item[{idx}] {item.get('name','?')!r}: "
                       f"{item['qty']} x {item['unit_price']} = {expected}, got {actual}",
            ))

    # 2. sum(line_totals) == subtotal
    sum_lines = round(sum(i["line_total"] for i in items), 2)
    subtotal = receipt.get("subtotal")
    if subtotal is None:
        issues.append(Issue("subtotal_check", sum_lines, float("nan"), float("nan"),
                            "subtotal missing"))
    elif not _close(sum_lines, subtotal, tol):
        issues.append(Issue(
            check="subtotal_check",
            expected=sum_lines, actual=subtotal,
            delta=round(subtotal - sum_lines, 2),
            detail=f"sum(line_totals)={sum_lines} vs subtotal={subtotal}",
        ))

    # 3. subtotal + tax + tip == total
    tax = receipt.get("tax") or 0.0
    tip = receipt.get("tip") or 0.0
    total = receipt.get("total")
    if subtotal is not None and total is not None:
        expected_total = round((subtotal or 0.0) + tax + tip, 2)
        if not _close(expected_total, total, tol):
            issues.append(Issue(
                check="total_check",
                expected=expected_total, actual=total,
                delta=round(total - expected_total, 2),
                detail=f"subtotal({subtotal}) + tax({tax}) + tip({tip}) = "
                       f"{expected_total}, got total={total}",
            ))
    elif total is None:
        issues.append(Issue("total_check", float("nan"), float("nan"), float("nan"),
                            "total missing"))

    return Report(
        passed=not issues,
        issues=issues,
        summary={
            "store": receipt.get("store"),
            "date": receipt.get("date"),
            "line_count": len(items),
            "subtotal": subtotal,
            "tax": tax,
            "tip": tip,
            "total": total,
        },
    )


def report_to_dict(r: Report) -> Dict[str, Any]:
    return {"passed": r.passed,
            "issues": [asdict(i) for i in r.issues],
            "summary": r.summary}


def _read_input(arg: str) -> Dict[str, Any]:
    if arg == "-":
        return json.load(sys.stdin)
    return json.loads(Path(arg).read_text())


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("json_path", help="Parsed-receipt JSON file, or '-' for stdin")
    p.add_argument("--tol", type=float, default=0.01,
                   help="Allowed absolute discrepancy in dollars (default 0.01)")
    p.add_argument("--quiet", action="store_true",
                   help="Only print the verdict line")
    args = p.parse_args()

    receipt = _read_input(args.json_path)
    rpt = verify(receipt, tol=args.tol)

    if not args.quiet:
        print(json.dumps(report_to_dict(rpt), indent=2))
    verdict = "PASS" if rpt.passed else f"FAIL ({len(rpt.issues)} issue(s))"
    store = rpt.summary.get("store") or "?"
    print(f"[{verdict}] {store}  total={rpt.summary.get('total')}")

    sys.exit(0 if rpt.passed else 1)


if __name__ == "__main__":
    main()
