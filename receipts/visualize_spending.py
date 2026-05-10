"""Visualize mock-receipt spending by category and by item.

Reads all `*.truth.json` files in a directory (defaults to the bundled mock
corpus), aggregates spending per store-category and per item, and writes a
PNG with three panels:

    1. Bar chart - total spend per category
    2. Pie chart - share of spend per category
    3. Bar chart - top N items by spend

Usage:
    python visualize_spending.py
    python visualize_spending.py --dir path/to/receipts --out spending.png --top 15
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import matplotlib.pyplot as plt

DEFAULT_DIR = Path(__file__).parent / ".claude/skills/receipt-analyzer/assets/mock_receipts"

# Map store name -> category. Mirrors the STORES catalog in
# generate_mock_receipts.py.
STORE_CATEGORY = {
    "Greenleaf Market": "Groceries",
    "Brewpoint Coffee": "Coffee",
    "Trattoria Luna": "Restaurant",
    "ShellPoint Gas": "Gas",
    "Volt Electronics": "Electronics",
    "Hammer & Nail Hardware": "Hardware",
    "Wellbridge Pharmacy": "Pharmacy",
    "Chapter House Books": "Books",
    "Yellow Cab": "Transit",
    "Pacific Threads": "Clothing",
}


def load_receipts(directory: Path) -> list[dict]:
    files = sorted(directory.glob("*.truth.json"))
    if not files:
        raise SystemExit(f"No *.truth.json files found in {directory}")
    return [json.loads(f.read_text()) for f in files]


def aggregate(receipts: list[dict]) -> tuple[dict[str, float], dict[str, float]]:
    by_category: dict[str, float] = defaultdict(float)
    by_item: dict[str, float] = defaultdict(float)
    for r in receipts:
        category = STORE_CATEGORY.get(r["store"], "Other")
        by_category[category] += float(r["total"])
        for item in r["items"]:
            by_item[item["name"]] += float(item["line_total"])
    return dict(by_category), dict(by_item)


def plot(by_category: dict[str, float], by_item: dict[str, float],
         out: Path, top: int) -> None:
    cats = sorted(by_category.items(), key=lambda kv: kv[1], reverse=True)
    cat_labels = [c for c, _ in cats]
    cat_values = [v for _, v in cats]

    items = sorted(by_item.items(), key=lambda kv: kv[1], reverse=True)[:top]
    item_labels = [i for i, _ in items]
    item_values = [v for _, v in items]

    fig = plt.figure(figsize=(14, 10))
    gs = fig.add_gridspec(2, 2, height_ratios=[1, 1.3], hspace=0.45, wspace=0.3)

    ax1 = fig.add_subplot(gs[0, 0])
    bars = ax1.bar(cat_labels, cat_values, color="#4C9AFF")
    ax1.set_title("Total spend by category")
    ax1.set_ylabel("USD")
    ax1.tick_params(axis="x", rotation=35)
    for label in ax1.get_xticklabels():
        label.set_horizontalalignment("right")
    for bar, value in zip(bars, cat_values):
        ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                 f"${value:,.2f}", ha="center", va="bottom", fontsize=8)

    ax2 = fig.add_subplot(gs[0, 1])
    ax2.pie(cat_values, labels=cat_labels, autopct="%1.1f%%", startangle=90,
            textprops={"fontsize": 9})
    ax2.set_title("Share of spend by category")

    ax3 = fig.add_subplot(gs[1, :])
    ax3.barh(item_labels[::-1], item_values[::-1], color="#36B37E")
    ax3.set_title(f"Top {len(item_labels)} items by spend")
    ax3.set_xlabel("USD")
    for i, v in enumerate(item_values[::-1]):
        ax3.text(v, i, f" ${v:,.2f}", va="center", fontsize=8)

    total = sum(cat_values)
    fig.suptitle(f"Receipt spending summary  -  total ${total:,.2f} "
                 f"across {len(cat_labels)} categories",
                 fontsize=13, fontweight="bold")

    fig.savefig(out, dpi=150, bbox_inches="tight")
    print(f"Wrote {out}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dir", type=Path, default=DEFAULT_DIR,
                   help="Directory containing *.truth.json receipt files")
    p.add_argument("--out", type=Path, default=Path("spending.png"),
                   help="Output PNG path")
    p.add_argument("--top", type=int, default=15,
                   help="How many top items to show in the item chart")
    args = p.parse_args()

    receipts = load_receipts(args.dir)
    by_category, by_item = aggregate(receipts)

    print(f"Loaded {len(receipts)} receipts from {args.dir}")
    print("\nBy category:")
    for cat, amt in sorted(by_category.items(), key=lambda kv: -kv[1]):
        print(f"  {cat:<14} ${amt:>9,.2f}")
    print(f"\n{len(by_item)} unique items, top 5:")
    for name, amt in sorted(by_item.items(), key=lambda kv: -kv[1])[:5]:
        print(f"  {name:<28} ${amt:>9,.2f}")

    plot(by_category, by_item, args.out, args.top)


if __name__ == "__main__":
    main()
