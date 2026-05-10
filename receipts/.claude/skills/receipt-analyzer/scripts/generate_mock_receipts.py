"""Generate mock receipt PDFs (and PNG screenshots) for testing.

Produces a deterministic set of receipts so tests are reproducible. Each
receipt has a store header, dated metadata, line items (qty x unit price =
line total), a subtotal, tax, optional tip, and a final total. All numbers
are computed (not hand-typed) so they are guaranteed to add up.

Usage:
    python generate_mock_receipts.py --out ./mock_receipts --count 10
"""

from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


# ---------- Data model ----------

@dataclass
class LineItem:
    name: str
    qty: int
    unit_price: float

    @property
    def line_total(self) -> float:
        return round(self.qty * self.unit_price, 2)


@dataclass
class Receipt:
    store: str
    address: str
    date: str
    receipt_id: str
    items: List[LineItem]
    tax_rate: float
    tip: float = 0.0
    currency: str = "$"

    @property
    def subtotal(self) -> float:
        return round(sum(i.line_total for i in self.items), 2)

    @property
    def tax(self) -> float:
        return round(self.subtotal * self.tax_rate, 2)

    @property
    def total(self) -> float:
        return round(self.subtotal + self.tax + self.tip, 2)


# ---------- Catalog of plausible stores / items ----------

STORES = [
    ("Greenleaf Market", "421 Oak St, Portland OR", 0.0, [
        ("Organic Bananas (lb)", 0.69), ("Whole Milk 1gal", 4.29),
        ("Sourdough Loaf", 5.50), ("Cage-Free Eggs (dz)", 4.99),
        ("Avocado", 1.25), ("Cheddar 8oz", 5.49),
    ]),
    ("Brewpoint Coffee", "12 Main St, Seattle WA", 0.101, [
        ("Latte", 5.25), ("Cappuccino", 4.75), ("Drip Coffee", 3.50),
        ("Croissant", 3.95), ("Bagel + Cream Cheese", 4.50),
    ]),
    ("Trattoria Luna", "88 Vine Ave, Brooklyn NY", 0.08875, [
        ("Margherita Pizza", 16.00), ("Caesar Salad", 12.50),
        ("Spaghetti Carbonara", 18.50), ("Tiramisu", 9.00),
        ("Sparkling Water", 4.00), ("House Red Glass", 11.00),
    ]),
    ("ShellPoint Gas", "Hwy 1 Exit 12", 0.0, [
        ("Regular Unleaded (gal)", 4.299), ("Premium (gal)", 5.099),
        ("Snickers Bar", 1.99), ("Bottled Water", 2.49),
    ]),
    ("Volt Electronics", "200 Tech Pkwy, Austin TX", 0.0825, [
        ("USB-C Cable 6ft", 14.99), ("HDMI Cable 10ft", 19.99),
        ("Wireless Mouse", 29.99), ("Mechanical Keyboard", 89.99),
        ("Surge Protector", 24.99),
    ]),
    ("Hammer & Nail Hardware", "9 Industrial Rd, Denver CO", 0.0775, [
        ("2x4 Stud 8ft", 4.49), ("Box Drywall Screws", 8.99),
        ("Paint Roller", 6.49), ("Latex Paint Gallon", 32.99),
        ("Painters Tape", 5.49),
    ]),
    ("Wellbridge Pharmacy", "55 Health Way, Boston MA", 0.0625, [
        ("Ibuprofen 200mg 100ct", 9.99), ("Bandages 30ct", 4.49),
        ("Vitamin D3", 12.99), ("Toothpaste", 4.99),
        ("Hand Sanitizer 8oz", 3.99),
    ]),
    ("Chapter House Books", "17 Library Ln, Cambridge MA", 0.0625, [
        ("Hardcover Novel", 28.00), ("Paperback Mystery", 16.99),
        ("Cookbook", 34.99), ("Bookmark Set", 5.99),
    ]),
    ("Yellow Cab", "Receipt issued in vehicle", 0.0, [
        ("Base Fare", 3.50), ("Distance (mi)", 2.85), ("Wait Time (min)", 0.50),
    ]),
    ("Pacific Threads", "550 Ocean Blvd, San Diego CA", 0.0775, [
        ("Cotton T-Shirt", 22.00), ("Denim Jeans", 68.00),
        ("Wool Socks", 12.00), ("Canvas Tote", 18.00),
    ]),
]


def build_receipt(idx: int, rng: random.Random) -> Receipt:
    name, addr, tax_rate, catalog = STORES[idx % len(STORES)]
    n_items = rng.randint(2, min(5, len(catalog)))
    chosen = rng.sample(catalog, n_items)
    items = [
        LineItem(name=n, qty=rng.randint(1, 4), unit_price=p)
        for (n, p) in chosen
    ]
    tip = 0.0
    if "Trattoria" in name or "Brewpoint" in name:
        # restaurants often include a tip
        subtotal = round(sum(i.line_total for i in items), 2)
        tip = round(subtotal * rng.choice([0.15, 0.18, 0.20]), 2)
    date = f"2026-{rng.randint(1, 5):02d}-{rng.randint(1, 28):02d}"
    rid = f"R{1000 + idx:04d}-{rng.randint(100, 999)}"
    return Receipt(
        store=name, address=addr, date=date, receipt_id=rid,
        items=items, tax_rate=tax_rate, tip=tip,
    )


# ---------- PDF rendering ----------

def render_pdf(receipt: Receipt, out_path: Path) -> None:
    c = canvas.Canvas(str(out_path), pagesize=letter)
    width, height = letter
    x_left = 0.75 * inch
    x_right = width - 0.75 * inch
    y = height - 0.75 * inch

    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x_left, y, receipt.store)
    y -= 18
    c.setFont("Helvetica", 10)
    c.drawString(x_left, y, receipt.address)
    y -= 14
    c.drawString(x_left, y, f"Date: {receipt.date}    Receipt: {receipt.receipt_id}")
    y -= 18
    c.line(x_left, y, x_right, y)
    y -= 16

    # Column headers
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x_left, y, "Item")
    c.drawRightString(x_right - 1.6 * inch, y, "Qty")
    c.drawRightString(x_right - 0.85 * inch, y, "Unit")
    c.drawRightString(x_right, y, "Total")
    y -= 12
    c.setFont("Helvetica", 10)

    # Items
    for item in receipt.items:
        c.drawString(x_left, y, item.name)
        c.drawRightString(x_right - 1.6 * inch, y, str(item.qty))
        c.drawRightString(x_right - 0.85 * inch, y, f"{receipt.currency}{item.unit_price:,.2f}")
        c.drawRightString(x_right, y, f"{receipt.currency}{item.line_total:,.2f}")
        y -= 14

    y -= 4
    c.line(x_left, y, x_right, y)
    y -= 16

    # Totals block
    def totals_row(label: str, value: float, bold: bool = False) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 11 if bold else 10)
        c.drawRightString(x_right - 0.85 * inch, y, label)
        c.drawRightString(x_right, y, f"{receipt.currency}{value:,.2f}")
        y -= 14

    totals_row("Subtotal", receipt.subtotal)
    totals_row(f"Tax ({receipt.tax_rate*100:.2f}%)", receipt.tax)
    if receipt.tip:
        totals_row("Tip", receipt.tip)
    totals_row("TOTAL", receipt.total, bold=True)

    y -= 18
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(x_left, y, "Thank you for your business!")

    c.showPage()
    c.save()


# ---------- PNG screenshot ----------

def render_png(pdf_path: Path, png_path: Path, dpi: int = 150) -> None:
    """Render the first page of pdf_path to PNG via pypdfium2."""
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(str(pdf_path))
    page = pdf[0]
    scale = dpi / 72.0
    pil = page.render(scale=scale).to_pil()
    pil.save(str(png_path))


# ---------- Driver ----------

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", type=Path, default=Path("./mock_receipts"))
    p.add_argument("--count", type=int, default=10)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--no-png", action="store_true", help="Skip PNG rendering")
    args = p.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(args.seed)

    manifest = []
    for i in range(args.count):
        receipt = build_receipt(i, rng)
        slug = f"receipt_{i+1:02d}"
        pdf_path = args.out / f"{slug}.pdf"
        png_path = args.out / f"{slug}.png"
        json_path = args.out / f"{slug}.truth.json"

        render_pdf(receipt, pdf_path)
        if not args.no_png:
            render_png(pdf_path, png_path)

        truth = {
            "store": receipt.store,
            "date": receipt.date,
            "receipt_id": receipt.receipt_id,
            "items": [asdict(i) | {"line_total": i.line_total} for i in receipt.items],
            "subtotal": receipt.subtotal,
            "tax_rate": receipt.tax_rate,
            "tax": receipt.tax,
            "tip": receipt.tip,
            "total": receipt.total,
        }
        json_path.write_text(json.dumps(truth, indent=2))

        manifest.append({"slug": slug, "pdf": pdf_path.name,
                         "png": None if args.no_png else png_path.name,
                         "truth": json_path.name})
        print(f"Wrote {pdf_path.name}  total={receipt.total:.2f}")

    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\nGenerated {len(manifest)} receipts in {args.out}")


if __name__ == "__main__":
    main()
