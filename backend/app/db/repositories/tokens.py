"""
Refresh-token records.

Refresh tokens are stateless JWTs, so revocation needs server state. Only the
token's identity is stored here: the ``jti``, the session it belongs to, and when
it was revoked. The token value itself is never persisted, so a database leak
cannot be replayed as a session.

A *family* is one signed-in session (one browser or device). Every rotation
within a session keeps the same family id, which lets the API distinguish the
normal case (an old token was rotated away) from a stolen token being replayed
(an old token is presented after its family already moved on).
"""
from __future__ import annotations

import datetime as dt

from bson import ObjectId


def store(
    db,
    user_id,
    *,
    jti: str,
    family_id: str,
    expires_at: dt.datetime,
    user_agent: str | None = None,
    ip: str | None = None,
) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    document = {
        "_id": jti,
        "user_id": ObjectId(str(user_id)),
        "family_id": family_id,
        "issued_at": now,
        "expires_at": expires_at,
        "revoked_at": None,
        "replaced_by": None,
        "user_agent": (user_agent or "")[:256] or None,
        "ip": (ip or "")[:64] or None,
    }
    db.refresh_tokens.insert_one(document)
    return document


def find(db, jti: str) -> dict | None:
    if not jti:
        return None
    return db.refresh_tokens.find_one({"_id": jti})


def claim(db, jti: str, *, replaced_by: str) -> bool:
    """Atomically consume a refresh token. True only for the first caller.

    The ``revoked_at: None`` filter is what makes rotation single-use. Reading the
    record and then updating it would leave a window where two concurrent
    refreshes both see an unused token and both succeed, which is exactly the
    replay the reuse detection is supposed to catch.
    """
    result = db.refresh_tokens.update_one(
        {"_id": jti, "revoked_at": None},
        {"$set": {"revoked_at": dt.datetime.now(dt.timezone.utc), "replaced_by": replaced_by}},
    )
    return result.modified_count == 1


def revoke_family(db, family_id: str) -> int:
    """Revoke every token in a session, i.e. sign that session out."""
    if not family_id:
        return 0
    result = db.refresh_tokens.update_many(
        {"family_id": family_id, "revoked_at": None},
        {"$set": {"revoked_at": dt.datetime.now(dt.timezone.utc)}},
    )
    return int(result.modified_count)


def revoke_all_for_user(db, user_id) -> int:
    """Revoke every session a user has, e.g. after a password change."""
    try:
        oid = ObjectId(str(user_id))
    except Exception:
        return 0
    result = db.refresh_tokens.update_many(
        {"user_id": oid, "revoked_at": None},
        {"$set": {"revoked_at": dt.datetime.now(dt.timezone.utc)}},
    )
    return int(result.modified_count)


def active_sessions(db, user_id, *, limit: int = 20) -> list[dict]:
    """One row per live session, most recently used first."""
    try:
        oid = ObjectId(str(user_id))
    except Exception:
        return []
    now = dt.datetime.now(dt.timezone.utc)
    pipeline = [
        {"$match": {"user_id": oid, "revoked_at": None, "expires_at": {"$gt": now}}},
        {"$sort": {"issued_at": -1}},
        {
            "$group": {
                "_id": "$family_id",
                "created_at": {"$max": "$issued_at"},
                "expires_at": {"$max": "$expires_at"},
                "user_agent": {"$first": "$user_agent"},
                "ip": {"$first": "$ip"},
            }
        },
        {"$sort": {"created_at": -1}},
        {"$limit": limit},
    ]
    return list(db.refresh_tokens.aggregate(pipeline))
