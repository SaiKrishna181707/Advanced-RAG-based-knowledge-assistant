"""Authentication behaviour. Every assertion uses the real HTTP surface."""
from __future__ import annotations

from app.db.repositories import users as users_repo


def test_signup_returns_token_and_public_user(client):
    response = client.post(
        "/api/auth/signup",
        json={"name": "Ada Navigator", "email": "ADA@Example.com", "password": "Sup3rSecret"},
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["success"] is True and body["error"] is None

    data = body["data"]
    assert data["token"] and data["token_type"] == "Bearer"
    assert data["user"]["email"] == "ada@example.com", "email must be normalised"
    assert data["user"]["name"] == "Ada Navigator"
    assert data["user"]["subscription_plan"] == "free"
    assert data["user"]["subscription_status"] == "active"


def test_signup_never_exposes_password_material(client):
    response = client.post(
        "/api/auth/signup",
        json={"name": "Secret Keeper", "email": "secret@example.com", "password": "Sup3rSecret"},
    )
    serialised = response.get_data(as_text=True).lower()
    assert "password_hash" not in serialised
    assert "scrypt" not in serialised
    assert "sup3rsecret" not in serialised


def test_password_is_hashed_not_stored(db, client):
    client.post(
        "/api/auth/signup",
        json={"name": "Hash Check", "email": "hash@example.com", "password": "Sup3rSecret"},
    )
    user = users_repo.find_by_email(db, "hash@example.com")
    assert user is not None
    assert user["password_hash"] != "Sup3rSecret"
    assert user["password_hash"].startswith("scrypt:")


def test_signup_rejects_duplicate_email(client):
    payload = {"name": "Twice", "email": "dupe@example.com", "password": "Sup3rSecret"}
    assert client.post("/api/auth/signup", json=payload).status_code == 201
    second = client.post("/api/auth/signup", json=payload)
    assert second.status_code == 409
    assert second.get_json()["error"]["code"] == "email_taken"


def test_signup_rejects_weak_and_malformed_credentials(client):
    weak = client.post(
        "/api/auth/signup", json={"name": "Weak", "email": "weak@example.com", "password": "short"}
    )
    assert weak.status_code == 422

    no_digit = client.post(
        "/api/auth/signup",
        json={"name": "NoDigit", "email": "nodigit@example.com", "password": "onlyletters"},
    )
    assert no_digit.status_code == 422
    assert "letter and one number" in no_digit.get_json()["error"]["message"]

    bad_email = client.post(
        "/api/auth/signup",
        json={"name": "Bad Email", "email": "not-an-email", "password": "Sup3rSecret"},
    )
    assert bad_email.status_code == 422

    missing_name = client.post(
        "/api/auth/signup", json={"email": "noname@example.com", "password": "Sup3rSecret"}
    )
    assert missing_name.status_code == 422


def test_login_succeeds_and_records_last_login(client, make_user):
    _headers, user, credentials = make_user()

    response = client.post(
        "/api/auth/login", json={"email": credentials["email"].upper(), "password": credentials["password"]}
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["token"]
    assert data["user"]["last_login"] is not None
    assert data["user"]["id"] == user["id"]


def test_login_rejects_wrong_password_and_unknown_email(client, make_user):
    _headers, _user, credentials = make_user()

    wrong = client.post(
        "/api/auth/login", json={"email": credentials["email"], "password": "WrongPass123"}
    )
    assert wrong.status_code == 401

    unknown = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "Sup3rSecret"}
    )
    assert unknown.status_code == 401
    # The same message for both cases so the endpoint cannot be used to enumerate accounts.
    assert wrong.get_json()["error"]["message"] == unknown.get_json()["error"]["message"]


def test_me_requires_a_valid_token(client, make_user):
    headers, user, _credentials = make_user()

    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Basic abc"}).status_code == 401

    ok_response = client.get("/api/auth/me", headers=headers)
    assert ok_response.status_code == 200
    assert ok_response.get_json()["data"]["user"]["id"] == user["id"]


def test_token_signed_with_another_secret_is_rejected(client, app):
    import jwt

    forged = jwt.encode({"sub": "000000000000000000000000", "email": "x@example.com"}, "not-the-secret", algorithm="HS256")
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 401


def test_session_check(client, make_user):
    headers, _user, _credentials = make_user()
    response = client.get("/api/auth/session", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["data"]["valid"] is True


def test_profile_update_validates_colour(client, make_user):
    headers, _user, _credentials = make_user()

    good = client.patch("/api/auth/profile", json={"name": "Renamed Navigator"}, headers=headers)
    assert good.status_code == 200
    assert good.get_json()["data"]["user"]["name"] == "Renamed Navigator"

    bad = client.patch("/api/auth/profile", json={"avatar_color": "red"}, headers=headers)
    assert bad.status_code == 422

    empty = client.patch("/api/auth/profile", json={}, headers=headers)
    assert empty.status_code == 422


def test_change_password_requires_current_then_allows_new(client, make_user):
    headers, _user, credentials = make_user()

    wrong = client.post(
        "/api/auth/password",
        json={"current_password": "NotMyPassword1", "new_password": "BrandNewPass2"},
        headers=headers,
    )
    assert wrong.status_code == 401

    changed = client.post(
        "/api/auth/password",
        json={"current_password": credentials["password"], "new_password": "BrandNewPass2"},
        headers=headers,
    )
    assert changed.status_code == 200

    assert client.post(
        "/api/auth/login", json={"email": credentials["email"], "password": credentials["password"]}
    ).status_code == 401
    assert client.post(
        "/api/auth/login", json={"email": credentials["email"], "password": "BrandNewPass2"}
    ).status_code == 200


def test_delete_account_purges_owned_data(client, db, make_user):
    headers, user, credentials = make_user()
    client.post(
        "/api/documents/upload",
        data={"file": (__import__("io").BytesIO(b"Contents that should be removed."), "gone.txt")},
        headers=headers,
        content_type="multipart/form-data",
    )
    assert db.documents.count_documents({}) > 0

    wrong = client.delete(
        "/api/auth/account", json={"password": "WrongPassword1"}, headers=headers
    )
    assert wrong.status_code == 401

    deleted = client.delete(
        "/api/auth/account", json={"password": credentials["password"]}, headers=headers
    )
    assert deleted.status_code == 200
    assert users_repo.find_by_id(db, user["id"]) is None
    assert db.documents.count_documents({"user_id": __import__("bson").ObjectId(user["id"])}) == 0