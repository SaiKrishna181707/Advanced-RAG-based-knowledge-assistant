"""
Rewrite the legacy accent colour on existing rows.

The brand accent moved from ``#7c5cff`` to the teal ``#0d7d70``. New accounts and
collections pick the new default up automatically, but rows created before the
change keep the old value and render off-brand in the app shell, the avatar and
the collection cards. This script brings them forward.

Idempotent: it only touches documents that still hold a legacy value, so it is
safe to run repeatedly and safe to run after the code has shipped.

    cd backend
    .\\venv\\Scripts\\python.exe scripts/rebrand_legacy_colors.py

Add ``--dry-run`` to see what would change without writing anything.
"""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.db import mongo  # noqa: E402  (import after the path is set up)
from app.db.repositories import collections as collections_repo  # noqa: E402
from app.db.repositories import users as users_repo  # noqa: E402

# The exact accent shipped before the change. Only this value is rewritten, so
# any other custom colour an account picked for itself is left alone.
LEGACY_COLORS = ["#7c5cff"]

TARGETS = [
    ("users", "avatar_color", users_repo.DEFAULT_AVATAR_COLOR),
    ("collections", "color", collections_repo.DEFAULT_COLLECTION_COLOR),
]


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    db = mongo.get_db()

    matched_total = 0
    changed_total = 0
    for collection, field, brand_color in TARGETS:
        matched = db[collection].count_documents({field: {"$in": LEGACY_COLORS}})
        matched_total += matched
        print(f"{collection}.{field}: {matched} legacy row(s)")
        if dry_run or not matched:
            continue
        for legacy in LEGACY_COLORS:
            result = db[collection].update_many(
                {field: legacy},
                {"$set": {field: brand_color}},
            )
            changed_total += result.modified_count

    if dry_run:
        print(f"Dry run: {matched_total} row(s) would be updated.")
    else:
        print(f"Updated {changed_total} row(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())