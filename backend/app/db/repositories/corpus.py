"""
Corpus revision tracking.

Every change to a user's chunk corpus bumps a monotonically increasing revision.
The in-memory search index compares its cached revision against this value, so a
stale index is detected and rebuilt instead of quietly serving wrong results.
"""
from __future__ import annotations

import datetime as dt

from bson import ObjectId


def bump_revision(db, user_id) -> int:
    now = dt.datetime.now(dt.timezone.utc)
    result = db.corpus_state.find_one_and_update(
        {"user_id": ObjectId(str(user_id))},
        {
            "$inc": {"revision": 1},
            "$set": {"updated_at": now},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
        return_document=True,
    )
    return int((result or {}).get("revision", 1))


def get_revision(db, user_id) -> int:
    document = db.corpus_state.find_one({"user_id": ObjectId(str(user_id))})
    if not document:
        return 0
    return int(document.get("revision", 0))
