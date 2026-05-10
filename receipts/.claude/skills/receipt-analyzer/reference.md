# Receipt Analyzer - Reference

Deeper notes for cases where SKILL.md isn't enough. Read this when:

- The extractor is returning empty or wrong data and you need to understand its assumptions.
- You're handling a scanned/photo receipt and need OCR.
- You're adapting the skill to a real-world receipt format that diverges from the generator's layout.
- You want to add new checks to the verifier.

## Parser internals (extract_receipt.py)

The extractor is intentionally regex-based rather than ML-based: receipts are short, the layout is flat, and a regex parser is easy to debug when it fails. The cost is fragility against layout changes.

### How it walks the document

1. Pull all text via `pdfplumber.extract_text()`, joining pages.
2. Strip blank lines.
3. Treat line 1 as the **store name**.
4. Scan the next 3-4 lines for an **address** (the first non-blank that isn't a `Date:` line and doesn't look like a line item or column header).
5. Find `Date: YYYY-MM-DD` and `Receipt: <id>` anywhere in the document.
6. Find the column header `Item ... Qty ... Total` to enter "items mode".
7. While in items mode, match each line against:
   ```
   ^(?P<name>.+?)\s+(?P<qty>\d+)\s+(?P<unit>$MONEY)\s+(?P<total>$MONEY)\s*$
   ```
   Stop when a `Subtotal` line matches.
8. After items, scan for `Subtotal`, `Tax (X%)`, `Tip`, `TOTAL`.

### Why `TOTAL` is case-sensitive

The column header line is `Item Qty Unit Total`. A loose `Total` regex would match the header and grab the qty count as the total. Keeping `TOTAL` uppercase-only is what disambiguates - the generator prints the final total in caps for exactly this reason. If you adapt the parser to a real receipt format, either preserve the casing convention or anchor `TOTAL` to its position (e.g., last money-bearing line of the document).

### The MONEY regex

```
[-+]?\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?
```

This matches `$1,234.56`, `1234.56`, `-$10`, `+5.00`, and bare integers. Negative values are accepted because some receipts encode discounts as negative line items.

### Common ways extraction breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| `items: []` | No `Item ... Qty ... Total` header line, or different ordering | Loosen the header detection or rewrite `LINE_ITEM_RE` for the new column order |
| Partial items list | A line item wrapped to 2 lines | Pre-process: join wrapped lines before regex match |
| `subtotal` is null | Receipt uses `Sub Total` / `Net` / `Net Sales` | Add an alternation to `SUBTOTAL_RE` |
| `tax_rate` is null but `tax` present | Receipt doesn't print the rate inline | Acceptable - downstream checks don't require it |
| `total` swaps with subtotal | Receipt uses `Total` for the column header AND the grand total | See "Why TOTAL is case-sensitive" above |
| All numeric fields off by 100 | Receipt is in cents (`5025` for `$50.25`) | Divide by 100 in a post-processing pass |
| Foreign currency symbol breaks parser | `MONEY` only matches `$` | Extend `MONEY` to `[\$€£]?` and similar |

## OCR fallback for scanned/photographed receipts

`pdfplumber.extract_text()` returns empty string for pure-image PDFs. Detect this and fall back to OCR:

```python
import pdfplumber, pytesseract
from pdf2image import convert_from_path

def extract_text_with_ocr_fallback(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join((p.extract_text() or "") for p in pdf.pages)
    if text.strip():
        return text
    # Fallback: rasterize and OCR
    images = convert_from_path(pdf_path, dpi=300)
    return "\n".join(pytesseract.image_to_string(img) for img in images)
```

Notes on OCR receipts:

- Use **at least 300 DPI**; receipts are small and 150 DPI mangles digits.
- Tesseract often misreads `0` as `O`, `1` as `l`, `5` as `S`, and a stray `.` between digits. The `MONEY` regex tolerates none of these. After OCR you usually need a normalization pass:
  ```python
  text = text.replace("O", "0").replace("l", "1")  # only inside numeric tokens!
  ```
  Be careful - blanket replacement corrupts product names. A safer pattern is to match `\b[\dOl]+\.\d+\b` and only normalize within those spans.
- Photo receipts often have warping. Run a deskew pass (`opencv` perspective correction) before OCR if the camera angle was bad.

## Image-only receipts (no PDF at all)

If the user attaches a JPEG/PNG of a receipt:

```python
from PIL import Image
import pytesseract

text = pytesseract.image_to_string(Image.open("receipt.jpg"))
```

Then feed `text` directly into `parse_receipt()` from `extract_receipt.py`. The parser doesn't care whether text came from PDF or OCR - same regex pipeline.

## Adding new verification checks

The verifier's structure is intentionally flat: each check appends to a list of `Issue` objects and the report is "passed iff issues empty". To add a check, follow the existing pattern. For example, "tax matches the printed rate":

```python
# inside verify(...)
if receipt.get("tax_rate") is not None and subtotal is not None:
    expected_tax = round(subtotal * receipt["tax_rate"], 2)
    if not _close(expected_tax, receipt.get("tax", 0.0), tol):
        issues.append(Issue(
            check="tax_rate_check",
            expected=expected_tax, actual=receipt["tax"],
            delta=round(receipt["tax"] - expected_tax, 2),
            detail=f"subtotal({subtotal}) * rate({receipt['tax_rate']}) = "
                   f"{expected_tax}, got tax={receipt['tax']}",
        ))
```

Don't add this as a default-on check unless you've confirmed all 10 mock receipts still pass - real-world tax computation has rounding rules that can disagree by a cent.

## Performance notes

- `pdfplumber` is the slowest piece (~100-300ms per receipt). For a batch of thousands, switch to `pypdfium2.PdfDocument(...)[0].get_textpage().get_text_range()` which is roughly 10x faster but loses the line-by-line layout that the regexes assume.
- `pypdfium2` rendering at 150 DPI is ~50ms/page on a modern laptop. Don't go above 200 DPI unless the user specifically wants a print-quality screenshot.
- Generation with ReportLab is ~30ms/PDF. The 10-receipt mock set generates in well under a second.

## Layout assumptions made by the generator

If you adapt the skill to a different real-world format, know what the bundled extractor expects:

- Store name on line 1, address on line 2.
- `Date: YYYY-MM-DD    Receipt: <id>` on one line.
- A header row reading exactly `Item ... Qty ... Unit ... Total`.
- Line items as `<name> <qty> $<unit> $<total>`.
- Totals block: `Subtotal`, `Tax (X.XX%)`, optional `Tip`, then `TOTAL` in all caps.
- Currency `$` (extend `MONEY` for others).

Diverge from any of these and the regexes need updating before extraction will produce useful output.
