"""Render a receipt PDF page to a PNG screenshot.

Uses pypdfium2 (pure-Python wrapper around PDFium) so no native poppler
install is needed. By default renders the first page at 150 DPI.

Usage:
    python render_screenshot.py receipt.pdf --out receipt.png
    python render_screenshot.py receipt.pdf --dpi 200 --page 1
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pypdfium2 as pdfium


def render(pdf_path: Path, out_path: Path, page: int = 0, dpi: int = 150) -> Path:
    pdf = pdfium.PdfDocument(str(pdf_path))
    if page < 0 or page >= len(pdf):
        raise IndexError(f"Page {page} out of range (PDF has {len(pdf)} pages)")
    scale = dpi / 72.0
    image = pdf[page].render(scale=scale).to_pil()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(str(out_path))
    return out_path


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("pdf", type=Path)
    p.add_argument("--out", type=Path, default=None,
                   help="Output PNG path (default: same name as pdf, .png)")
    p.add_argument("--page", type=int, default=0, help="0-indexed page number")
    p.add_argument("--dpi", type=int, default=150)
    args = p.parse_args()

    out = args.out or args.pdf.with_suffix(".png")
    final = render(args.pdf, out, page=args.page, dpi=args.dpi)
    print(f"Wrote {final}")


if __name__ == "__main__":
    main()
