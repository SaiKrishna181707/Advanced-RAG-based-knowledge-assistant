"""
Refresh-token lifecycle: issuance, rotation, reuse detection and revocation.

These exercise the real HTTP surface against MongoDB, because the security
properties under test (single-use rotation, family revocation) depend on stored
state rather than on the token payload alone.
"""
from __future__ import annotations

import datetime as dt
import uuid

import jwt

from app.config import settings
from app.db.repositories import tokens as tokens_repo


def _decode(token: str) -> dict:
    return jwt.decode(
        token,
        settings.jwt_refresh_secret,
        algorithms=[settings.jwt_algorithm],
        issuer="albatross",
    )


def test_signup_issues_a_short_lived_access_token_and_a_refresh_token(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Token Owner",
            "email": f"tokens-{uuid.uuid4().hex[:10]}@example.com",
            "password": "Sup3rSecret",
        },
    )
    assert response.status_code == 201
    data = response.get_json()["data"]

    assert data["token"] and data["refresh_token"]
    assert data["token_type"] == "Bearer"
    # Access tokens are minutes; the refresh token carries the session length.
    assert 0 < data["expires_in"] <= settings.jwt_access_ttl_minutes * 60
    assert data["refresh_expires_in"] > data["expires_in"]


def test_refresh_rotates_the_token_and_returns_a_new_access_token(client, make_user):
    _headers, user, _credentials = make_user()
    session = client.post(
        "/api/auth/login",
        json={"email": user["email"], "password": "Sup3r-Secret-Pass"},
    ).get_json()["data"]

    refreshed = client.post(
        "/api/auth/refresh", json={"refresh_token": session["refresh_token"]}
    )
    assert refreshed.status_code == 200, refreshed.get_json()
    rotated = refreshed.get_json()["data"]

    assert rotated["refresh_token"] != session["refresh_token"], "rotation must change the token"
    assert rotated["token"] != session["token"]
    assert rotated["user"]["id"] == user["id"]

    # The rotated access token works.
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {rotated['token']}"})
    assert me.status_code == 200

    # The rotated refresh token works too.
    again = client.post("/api/auth/refresh", json={"refresh_token": rotated["refresh_token"]})
    assert again.status_code == 200


def test_replaying_a_rotated_refresh_token_revokes_the_whole_session(client, make_user):
    _headers, user, _credentials = make_user()
    session = client.post(
        "/api/auth/login", json={"email": user["email"], "password": "Sup3r-Secret-Pass"}
    ).get_json()["data"]

    first = client.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]})
    rotated = first.get_json()["data"]

    # Replaying the already-rotated token is treated as theft.
    replay = client.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert replay.status_code == 401
    assert replay.get_json()["error"]["code"] == "refresh_token_reused"

    # Because the family is now revoked, the legitimate newest token is dead too.
    after = client.post("/api/auth/refresh", json={"refresh_token": rotated["refresh_token"]})
    assert after.status_code == 401


def test_refresh_token_cannot_be_used_as_an_access_token(client, make_user):
    _headers, user, _credentials = make_user()
    session = client.post(
        "/api/auth/login", json={"email": user["email"], "password": "Sup3r-Secret-Pass"}
    ).get_json()["data"]

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {session['refresh_token']}"},
    )
    assert response.status_code == 401


def test_access_token_cannot_be_used_as_a_refresh_token(client, make_user):
    _headers, user, _credentials = make_user()
    session = client.post(
        "/api/auth/login", json={"email": user["email"], "password": "Sup3r-Secret-Pass"}
    ).get_json()["data"]

    response = client.post("/api/auth/refresh", json={"refresh_token": session["token"]})
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "invalid_refresh_token"


def test_logout_revokes_the_session(client, make_user):
    _headers, user, _credentials = make_user()
    session = client.post(
        "/api/auth/login", json={"email": user["email"], "password": "Sup3r-Secret-Pass"}
    ).get_json()["data"]

    out = client.post("/api/auth/logout", json={"refresh_token": session["refresh_token"]})
    assert out.status_code == 200

    after = client.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert after.status_code == 401


def test_logout_is_forgiving_about_unusable_tokens(client):
    for payload in ({}, {"refresh_token": "not-a-jwt"}, {"refresh_token": ""}):
        response = client.post("/api/auth/logout", json=payload)
        assert response.status_code == 200, payload


def test_logout_all_devices_requires_authentication(client, make_user):
    assert client.post("/api/auth/logout", json={"all_devices": True}).status_code == 401


def test_logout_all_devices_revokes_every_session(client, make_user):
    headers, user, password = make_user()
    device_one = client.post(
        "/api/auth/login", json={"email": user["email"], "password": password["password"]}
    ).get_json()["data"]
    device_two = client.post(
        "/api/auth/login", json={"email": user["email"], "password": password["password"]}
    ).get_json()["data"]

    response = client.post(
        "/api/auth/logout", json={"all_devices": True}, headers=headers
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["sessions_revoked"] >= 2

    for session in (device_one, device_two):
        assert (
            client.post(
                "/api/auth/refresh", json={"refresh_token": session["refresh_token"]}
            ).status_code
            == 401
        )


def test_password_change_revokes_every_refresh_token(client, make_user):
    headers, _user, credentials = make_user()
    session = client.post(
        "/api/auth/login",
        json={"email": credentials["email"], "password": credentials["password"]},
    ).get_json()["data"]

    changed = client.post(
        "/api/auth/password",
        json={"current_password": credentials["password"], "new_password": "BrandNewPass2"},
        headers=headers,
    )
    assert changed.status_code == 200

    after = client.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert after.status_code == 401


def test_refresh_rejects_missing_and_malformed_tokens(client):
    assert client.post("/api/auth/refresh", json={}).status_code == 422
    for token in ("", "garbage", "a.b.c"):
        response = client.post("/api/auth/refresh", json={"refresh_token": token})
        assert response.status_code in (401, 422), token


def test_expired_refresh_token_is_rejected(client, make_user):
    _headers, user, _credentials = make_user()
    past = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)
    expired = jwt.encode(
        {
            "sub": user["id"],
            "type": "refresh",
            "jti": "expired-jti",
            "fam": "expired-family",
            "iat": int((past - dt.timedelta(days=1)).timestamp()),
            "exp": int(past.timestamp()),
            "iss": "albatross",
        },
        settings.jwt_refresh_secret,
        algorithm=settings.jwt_algorithm,
    )
    response = client.post("/api/auth/refresh", json={"refresh_token": expired})
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "refresh_token_expired"


def test_refresh_token_signed_with_the_wrong_secret_is_rejected(client, make_user):
    _headers, user, _credentials = make_user()
    forged = jwt.encode(
        {"sub": user["id"], "type": "refresh", "jti": "x", "fam": "y"},
        "not-the-refresh-secret",
        algorithm="HS256",
    )
    response = client.post("/api/auth/refresh", json={"refresh_token": forged})
    assert response.status_code == 401


def test_deleting_an_account_purges_its_refresh_tokens(client, db, make_user):
    headers, user, credentials = make_user()
    session = client.post(
        "/api/auth/login",
        json={"email": credentials["email"], "password": credentials["password"]},
    ).get_json()["data"]

    deleted = client.delete(
        "/api/auth/account", json={"password": credentials["password"]}, headers=headers
    )
    assert deleted.status_code == 200

    assert db.refresh_tokens.count_documents({"user_id": __import__("bson").ObjectId(user["id"])}) == 0
    assert client.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]}).status_code == 401


def test_a_refresh_token_cannot_be_redeemed_by_another_account(client, db, make_user):
    """The stored record is the authority, not the token's own subject claim."""
    _headers_a, victim, _credentials_a = make_user(name="Victim")
    _headers_b, attacker, _credentials_b = make_user(name="Attacker")

    session = client.post(
        "/api/auth/login",
        json={"email": victim["email"], "password": "Sup3r-Secret-Pass"},
    ).get_json()["data"]

    # Rewrite the token so it claims to belong to the attacker, signed correctly.
    payload = _decode(session["refresh_token"])
    payload["sub"] = attacker["id"]
    forged = jwt.encode(payload, settings.jwt_refresh_secret, algorithm=settings.jwt_algorithm)

    response = client.post("/api/auth/refresh", json={"refresh_token": forged})
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "invalid_refresh_token"


def test_rotation_keeps_one_session_family(client, db, make_user):
    _headers, user, _credentials = make_user()
    session = client.post(
        "/api/auth/login", json={"email": user["email"], "password": "Sup3r-Secret-Pass"}
    ).get_json()["data"]

    family = _decode(session["refresh_token"])["fam"]
    rotated = client.post(
        "/api/auth/refresh", json={"refresh_token": session["refresh_token"]}
    ).get_json()["data"]
    assert _decode(rotated["refresh_token"])["fam"] == family

    records = list(db.refresh_tokens.find({"family_id": family}))
    assert len(records) == 2, "rotation keeps the retired token for reuse detection"
    assert sum(1 for record in records if record["revoked_at"] is None) == 1

    sessions = tokens_repo.active_sessions(db, user["id"])
    # Two rotations of the same session must still count as one active session.
    matching = [session for session in sessions if session["_id"] == family]
    assert len(matching) == 1


def test_a_refresh_token_can_only_be_claimed_once(client, db, make_user):
    """Rotation is single-use even under a concurrent race.

    The route reads the record and then claims it; if the claim were a plain
    update, two simultaneous refreshes with the same token would both see it
    unused and both mint a session. The conditional update is what closes that
    window, so it is asserted directly here.
    """
    _headers, user, _credentials = make_user()
    session = client.post(
        "/api/auth/login", json={"email": user["email"], "password": "Sup3r-Secret-Pass"}
    ).get_json()["data"]
    jti = _decode(session["refresh_token"])["jti"]

    assert tokens_repo.claim(db, jti, replaced_by="winner") is True
    assert tokens_repo.claim(db, jti, replaced_by="loser") is False
    assert tokens_repo.claim(db, jti, replaced_by="loser") is False

    record = db.refresh_tokens.find_one({"_id": jti})
    assert record["replaced_by"] == "winner", "the loser must not overwrite the winner"


def test_a_second_refresh_of_the_same_token_revokes_the_family(client, db, make_user):
    """A raced or replayed rotation fails closed: nobody keeps the session."""
    _headers, user, _credentials = make_user()
    session = client.post(
        "/api/auth/login", json={"email": user["email"], "password": "Sup3r-Secret-Pass"}
    ).get_json()["data"]

    first = client.post(
        "/api/auth/refresh", json={"refresh_token": session["refresh_token"]}
    )
    assert first.status_code == 200

    replay = client.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert replay.status_code == 401
    assert replay.get_json()["error"]["code"] == "refresh_token_reused"

    # The token the legitimate client received is dead too, so a thief who won
    # the race cannot keep using what they stole.
    rotated = first.get_json()["data"]["refresh_token"]
    assert client.post("/api/auth/refresh", json={"refresh_token": rotated}).status_code == 401
