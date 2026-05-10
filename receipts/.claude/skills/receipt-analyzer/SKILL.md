---
name: receipt-analyzer
description: Use this skill whenever the user wants to analyze, audit, parse, or verify a receipt - including extracting line items, subtotals, tax, tip, and totals from receipt PDFs (or images of receipts), rendering a screenshot of a receipt for visual review, checking that the math on a receipt actually adds up, generating mock receipts for testing, or anything that touches receipt-shaped documents. Trigger this skill even if the user does not say the word "skill" - phrases like "does this receipt add up", "extract the line items from this receipt", "audit my receipts", "make some test receipts", or attaching a receipt PDF and asking what it says all qualify.
license: Proprietary. See LICENSE.txt for terms.
---

# Receipt Analyzer

## Overview

This skill analyzes receipts end-to-end:

1. **Generate** - produce mock receipt PDFs (and PNG screenshots) for testing.
2. **Extract** - parse a receipt PDF into structured JSON (store, date, line items, subtotal, tax, tip, total).
3. **Screenshot** - rasterize the PDF page to PNG so the user (and you) can eyeball the layout next to the parsed numbers.
4. **Verify** - check that the math actually works: each `qty * unit_price == line_total`, `sum(line_totals) == subtotal`, and `subtotal + tax + tip == total`.

The four bundled scripts in `scripts/` are the workhorses. Prefer running them rather than reimplementing the logic inline - they have been tested against 10 generated receipts and a deliberately corrupted one. For deeper notes on the parsing strategy and known edge cases, see `reference.md`.

## When to use which step

| User intent | Run |
|---|---|
| "Make me some sample receipts to test against" | `generate_mock_receipts.py` |
| "What's on this receipt?" / "Extract the line items" | `extract_receipt.py` |
| "Show me what this receipt looks like" | `render_screenshot.py` |
| "Does this receipt add up?" / "Audit the math" | `extract_receipt.py` + `verify_receipt.py` |
| Full audit (the typical case) | All four, in order |

## Dependencies

```bash
pip install reportlab pdfplumber pypdfium2 pillow
```

`reportlab` is only needed for generation. `pdfplumber` + `pypdfium2` cover extraction and screenshots. None of these require native poppler - `pypdfium2` ships its own PDFium binary.

## Quick start: full audit of a receipt

```bash
# 1. Extract the structured data
python scripts/extract_receipt.py path/to/receipt.pdf --out /tmp/parsed.json

# 2. Render a PNG screenshot so the layout is reviewable alongside the JSON
python scripts/render_screenshot.py path/to/receipt.pdf --out /tmp/receipt.png

# 3. Verify the numbers
python scripts/verify_receipt.py /tmp/parsed.json
```

Exit code from `verify_receipt.py` is `0` on PASS and `1` on FAIL, so it composes into shell pipelines and CI checks.

## Step 1 - Generate mock receipts

Use `generate_mock_receipts.py` whenever you need test data. It is deterministic given a `--seed` so the same invocation always produces identical files - this matters for tests and for diffing parser output between runs.

```bash
python scripts/generate_mock_receipts.py \
  --out ./mock_receipts \
  --count 10 \
  --seed 42
```

For each receipt it writes three files:

- `receipt_NN.pdf` - the receipt itself, generated with ReportLab.
- `receipt_NN.png` - a 150 DPI screenshot of the first page (skip with `--no-png`).
- `receipt_NN.truth.json` - the ground-truth structure used to create the PDF. Diff your extractor's output against this to catch parser regressions.

The store catalog covers a deliberate spread: grocery, coffee shop, restaurant (with tip), gas station, electronics, hardware, pharmacy, books, taxi, and clothing. Tax rates vary (including 0%) and a couple of stores include a tip - that breadth surfaces tip-line and zero-tax bugs in extractors.

### Inline ReportLab pattern (when you need a one-off receipt)

If the user wants a single custom receipt rather than the full mock set, drop into ReportLab directly. The shape below mirrors what the generator produces and is what the extractor expects:

```python
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

c = canvas.Canvas("custom.pdf", pagesize=letter)
width, height = letter
x_left, x_right = 0.75 * inch, width - 0.75 * inch
y = height - 0.75 * inch

c.setFont("Helvetica-Bold", 16); c.drawString(x_left, y, "My Store"); y -= 18
c.setFont("Helvetica", 10);      c.drawString(x_left, y, "Date: 2026-05-09    Receipt: R0001-123"); y -= 18

c.setFont("Helvetica-Bold", 10)
c.drawString(x_left, y, "Item")
c.drawRightString(x_right - 1.6 * inch, y, "Qty")
c.drawRightString(x_right - 0.85 * inch, y, "Unit")
c.drawRightString(x_right, y, "Total")
y -= 14
c.setFont("Helvetica", 10)

items = [("Widget", 2, 4.50), ("Gizmo", 1, 9.99)]
for name, qty, unit in items:
    c.drawString(x_left, y, name)
    c.drawRightString(x_right - 1.6 * inch, y, str(qty))
    c.drawRightString(x_right - 0.85 * inch, y, f"${unit:,.2f}")
    c.drawRightString(x_right, y, f"${qty*unit:,.2f}")
    y -= 14

c.save()
```

Keep the column ordering `Item | Qty | Unit | Total`. The extractor's regex for line items (`name ... qty unit total`) anchors on the trailing two money tokens with the integer qty in front, so other orderings will silently produce wrong rows.

## Step 2 - Extract values from a receipt PDF

`extract_receipt.py` opens the PDF with pdfplumber and walks the text line by line. It returns a JSON document of this shape:

```json
{
  "store": "Trattoria Luna",
  "address": "88 Vine Ave, Brooklyn NY",
  "date": "2026-05-09",
  "receipt_id": "R1002-928",
  "items": [
    {"name": "Sparkling Water", "qty": 4, "unit_price": 4.00, "line_total": 16.00},
    {"name": "Caesar Salad",    "qty": 2, "unit_price": 12.50, "line_total": 25.00}
  ],
  "subtotal": 41.00,
  "tax_rate": 0.0888,
  "tax": 3.64,
  "tip": 7.38,
  "total": 52.02
}
```

`tip` defaults to `0.0` if absent. `tax_rate` is parsed only when the receipt prints it as `Tax (8.88%)`; if not, it is `null` and only the dollar amount is captured.

CLI:

```bash
python scripts/extract_receipt.py receipt.pdf              # prints JSON to stdout
python scripts/extract_receipt.py receipt.pdf --out r.json # writes file
```

Programmatic:

```python
from pathlib import Path
from scripts.extract_receipt import extract
data = extract(Path("receipt.pdf"))
print(data["total"])
```

### When extraction returns suspicious output

Read `reference.md` for the full troubleshooting list, but the high-frequency causes:

- **`items` is empty** - The PDF likely uses a different column order or doesn't have an `Item ... Qty ... Total` header row. Check the raw text via `pdfplumber` first.
- **`subtotal` is `null`** - The receipt may label it differently (e.g. `Net`, `Sub Total`). Add a regex variant in `extract_receipt.py`.
- **`total` and `subtotal` swap** - The `TOTAL` regex is case-sensitive on `TOTAL` because `Total` also appears in the column header. Don't loosen this without re-running the verification step on all 10 mock receipts.
- **A scanned/photographed receipt** - pdfplumber returns empty text. You need OCR first (`pytesseract` + `pdf2image`); see `reference.md`.

## Step 3 - Screenshot the receipt

`render_screenshot.py` uses `pypdfium2` to rasterize page 1 to PNG. This is what the user sees side-by-side with the parsed JSON during verification - layouts, alignment, tip lines that might have been missed in extraction all become obvious in the image.

```bash
python scripts/render_screenshot.py receipt.pdf                # writes receipt.png
python scripts/render_screenshot.py receipt.pdf --dpi 200      # higher resolution
python scripts/render_screenshot.py receipt.pdf --out shot.png
```

Programmatic:

```python
from pathlib import Path
from scripts.render_screenshot import render
render(Path("receipt.pdf"), Path("out.png"), dpi=150)
```

`pypdfium2` ships its own PDFium build so this works on a stock macOS or Linux box without installing poppler. If the user already has `pdf2image`/`poppler-utils` installed and prefers it, swapping the renderer is a 5-line change.

## Step 4 - Verify the math

`verify_receipt.py` runs three independent checks, each of which can fail on its own:

| Check | Rule |
|---|---|
| `line_check` | For each item: `qty * unit_price == line_total` |
| `subtotal_check` | `sum(line_totals) == subtotal` |
| `total_check` | `subtotal + tax + tip == total` |

Floating-point drift is tolerated within `--tol` (default `$0.01`). The verifier intentionally does **not** infer missing fields - if `subtotal` is `null` it reports the issue rather than silently substituting `sum(line_totals)`. That keeps extraction bugs visible.

```bash
python scripts/verify_receipt.py parsed.json
python scripts/verify_receipt.py parsed.json --tol 0.02   # looser tolerance
python scripts/verify_receipt.py parsed.json --quiet      # only the verdict line
python scripts/extract_receipt.py r.pdf | python scripts/verify_receipt.py -   # piped
```

A passing verdict prints something like:

```
[PASS] Trattoria Luna  total=52.02
```

A failure dumps a structured report. Each issue carries `expected`, `actual`, `delta`, and a human-readable `detail`:

```json
{
  "passed": false,
  "issues": [
    {"check": "line_check",      "expected": 16.0,  "actual": 99.99, "delta": 83.99,
     "detail": "item[0] 'Sparkling Water': 4 x 4.0 = 16.0, got 99.99"},
    {"check": "subtotal_check",  "expected": 124.99, "actual": 41.0, "delta": -83.99,
     "detail": "sum(line_totals)=124.99 vs subtotal=41.0"},
    {"check": "total_check",     "expected": 52.02, "actual": 200.0, "delta": 147.98,
     "detail": "subtotal(41.0) + tax(3.64) + tip(7.38) = 52.02, got total=200.0"}
  ]
}
```

Three issues from one corrupted line is normal: a wrong line total cascades into the subtotal and total checks. When triaging, **fix the smallest expected/actual delta first** - that's usually the root cause and the rest collapse out.

### Tolerance and rounding

- Use the default `0.01` for typical retail receipts. Many stores round per-line which can drift a cent over a long bill.
- Restaurants with tip-on-pre-tax math may need `--tol 0.02`.
- Don't go above `0.05` without a specific reason - bigger tolerances mask real errors.

### Why all three checks instead of just the total

The naive shortcut "does subtotal + tax + tip equal total?" misses the most useful failure mode: a receipt where the printed totals match each other but the underlying line items were transcribed wrong. Running `line_check` independently surfaces that. The cost of running all three is microseconds, so always run all three.

## End-to-end recipe (the typical request)

When the user attaches a receipt PDF and asks something like "does this add up?" or "extract this":

1. Render a screenshot so the user has a visual: `render_screenshot.py receipt.pdf --out /tmp/r.png`
2. Extract the JSON: `extract_receipt.py receipt.pdf --out /tmp/r.json`
3. Verify the math: `verify_receipt.py /tmp/r.json`
4. Show the user the parsed JSON, the verdict line, and (if it failed) the issues list.
5. If it failed, look at the screenshot - 90% of the time the failure is an extraction bug rather than a math bug, and the image makes it obvious which field was misread.

That ordering matters: the screenshot is cheap, and having it ready before the user asks "are you sure?" saves a round trip.

## Self-test

To confirm the skill is working in the user's environment, regenerate the mock set and run all 10 through extract+verify:

```bash
python scripts/generate_mock_receipts.py --out /tmp/recs --count 10 --seed 42
for i in $(seq -w 1 10); do
  python scripts/extract_receipt.py /tmp/recs/receipt_${i}.pdf --out /tmp/parsed.json >/dev/null
  python scripts/verify_receipt.py /tmp/parsed.json --quiet
done
```

Expected output: 10 lines, all `[PASS]`.

## Files in this skill

- `SKILL.md` - this file (workflow, code patterns, common pitfalls).
- `reference.md` - deeper notes on parser internals, OCR fallback, edge cases.
- `scripts/generate_mock_receipts.py` - ReportLab-based generator + truth JSON.
- `scripts/extract_receipt.py` - pdfplumber + regex extractor.
- `scripts/render_screenshot.py` - pypdfium2 PDF-to-PNG renderer.
- `scripts/verify_receipt.py` - three-check math verifier.
- `assets/mock_receipts/` - pre-generated 10-receipt corpus (regenerate any time with `generate_mock_receipts.py`).
