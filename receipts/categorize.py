"""Assign a spending category to a receipt based on the store name.

Two-tier lookup, no API calls:
  1. Exact match against KNOWN_STORES (covers the 10 mock-corpus stores).
  2. Keyword match against KEYWORD_RULES (lowercased substring match).
  3. Fallback: "Uncategorized".

Extend KNOWN_STORES or KEYWORD_RULES as new stores show up.
"""
from __future__ import annotations

UNCATEGORIZED = "Uncategorized"

KNOWN_STORES: dict[str, str] = {
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

# Order matters: first match wins. Put more specific rules above broader ones.
KEYWORD_RULES: list[tuple[str, list[str]]] = [
    ("Coffee",      ["coffee", "cafe", "espresso", "brew"]),
    ("Groceries",   ["market", "grocery", "grocer", "foods", "supermarket"]),
    ("Gas",         ["gas", "fuel", "shell", "chevron", "exxon", "bp ", "mobil"]),
    ("Pharmacy",    ["pharmacy", "drug", " rx", "cvs", "walgreens"]),
    ("Transit",     ["taxi", "cab", "uber", "lyft", "transit", "metro"]),
    ("Books",       ["book", "books"]),
    ("Restaurant",  ["restaurant", "grill", "trattoria", "bistro", "kitchen",
                     "diner", "pizzeria", "sushi", "ramen"]),
    ("Electronics", ["electronics", "tech", "computer", "best buy"]),
    ("Hardware",    ["hardware", "tools", "lumber"]),
    ("Clothing",    ["clothing", "threads", "apparel", "outfitters", "fashion"]),
]


def categorize(store_name: str | None) -> str:
    if not store_name:
        return UNCATEGORIZED
    if store_name in KNOWN_STORES:
        return KNOWN_STORES[store_name]
    needle = store_name.lower()
    for category, keywords in KEYWORD_RULES:
        if any(kw in needle for kw in keywords):
            return category
    return UNCATEGORIZED
