"""
Production configuration guards.

Serving traffic with a loopback database or a placeholder secret is not a
degraded mode, it is data loss or a forged-session risk, so the app refuses to
start. These tests pin that behaviour: without them the guard could be relaxed
back to a warning and nothing would notice until a deployment quietly wrote to
the wrong database.
"""
from __future__ import annotations

import pytest

from app.config import Settings

MANAGED_URI = "mongodb+srv://albatross:pw@cluster0.abcd.mongodb.net/?retryWrites=true&w=majority"

# Every variable Settings reads, so a value left in the ambient environment (or
# loaded from backend/.env) cannot leak into a case.
MANAGED_KEYS = (
    "APP_ENV",
    "FLASK_ENV",
    "FLASK_SECRET_KEY",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "JWT_EXPIRES_HOURS",
    "JWT_ACCESS_TTL_MINUTES",
    "JWT_REFRESH_TTL_DAYS",
    "MONGODB_URI",
    "MONGO_URI",
    "MONGODB_DB_NAME",
    "MONGODB_DATABASE",
    "CORS_ORIGINS",
)


def build_settings(monkeypatch, **overrides) -> Settings:
    for key in MANAGED_KEYS:
        monkeypatch.delenv(key, raising=False)
    env = {
        "APP_ENV": "production",
        "FLASK_SECRET_KEY": "a" * 48,
        "JWT_SECRET": "b" * 48,
        "JWT_REFRESH_SECRET": "c" * 48,
        "MONGODB_URI": MANAGED_URI,
        "MONGODB_DB_NAME": "albatross",
        "CORS_ORIGINS": "https://albatross.vercel.app",
    }
    env.update(overrides)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    return Settings()


def test_a_fully_configured_production_environment_has_no_fatal_errors(monkeypatch):
    assert build_settings(monkeypatch).production_config_errors() == []


@pytest.mark.parametrize(
    "uri",
    [
        "mongodb://localhost:27017",
        "mongodb://127.0.0.1:27017",
        "mongodb://host.docker.internal:27017",
        "mongodb://[::1]:27017",
    ],
)
def test_loopback_databases_are_refused_in_production(monkeypatch, uri):
    settings = build_settings(monkeypatch, MONGODB_URI=uri)
    errors = settings.production_config_errors()
    assert any("loopback" in error for error in errors), errors


def test_a_loopback_database_is_allowed_outside_production(monkeypatch):
    """Docker MongoDB stays usable for local development."""
    settings = build_settings(
        monkeypatch, APP_ENV="development", MONGODB_URI="mongodb://localhost:27017"
    )
    assert settings.production_config_errors() == []


def test_placeholder_flask_secret_is_refused_in_production(monkeypatch):
    settings = build_settings(
        monkeypatch, FLASK_SECRET_KEY="change-this-to-a-random-string-in-production"
    )
    assert any("FLASK_SECRET_KEY" in error for error in settings.production_config_errors())


def test_missing_jwt_secret_is_refused_in_production(monkeypatch):
    settings = build_settings(monkeypatch, JWT_SECRET="", FLASK_SECRET_KEY="")
    errors = settings.production_config_errors()
    assert any("JWT_SECRET" in error for error in errors), errors


def test_refresh_tokens_must_not_share_the_access_token_secret(monkeypatch):
    """An unset (or copied) refresh secret would let one leaked key mint long sessions."""
    shared = build_settings(monkeypatch, JWT_REFRESH_SECRET="b" * 48)
    assert any("JWT_REFRESH_SECRET" in error for error in shared.production_config_errors())

    unset = build_settings(monkeypatch, JWT_REFRESH_SECRET="")
    assert any("JWT_REFRESH_SECRET" in error for error in unset.production_config_errors())

    placeholder = build_settings(
        monkeypatch,
        JWT_REFRESH_SECRET="change-this-to-a-different-random-string-in-production",
    )
    assert any("JWT_REFRESH_SECRET" in error for error in placeholder.production_config_errors())


def test_wildcard_cors_is_refused_in_production(monkeypatch):
    settings = build_settings(monkeypatch, CORS_ORIGINS="*")
    assert any("CORS_ORIGINS" in error for error in settings.production_config_errors())


def test_shared_refresh_secret_is_reported_at_boot(monkeypatch):
    """It is fatal in production, and reported as a warning in the health/log output."""
    settings = build_settings(monkeypatch, JWT_REFRESH_SECRET="")
    assert any("JWT_REFRESH_SECRET" in problem for problem in settings.startup_problems())


def test_local_development_tolerates_the_single_secret_setup(monkeypatch):
    """A developer running against Docker MongoDB should not be blocked."""
    settings = build_settings(
        monkeypatch,
        APP_ENV="development",
        MONGODB_URI="mongodb://localhost:27017",
        JWT_REFRESH_SECRET="",
    )
    assert settings.production_config_errors() == []


def test_mongodb_database_prefers_db_name_and_still_accepts_the_legacy_alias(monkeypatch):
    assert build_settings(monkeypatch, MONGODB_DB_NAME="albatross").mongodb_database == "albatross"

    legacy = build_settings(monkeypatch, MONGODB_DB_NAME="", MONGODB_DATABASE="legacy-name")
    assert legacy.mongodb_database == "legacy-name"


def test_access_token_lifetime_defaults_to_minutes_and_honours_the_legacy_hours(monkeypatch):
    assert build_settings(monkeypatch).jwt_access_ttl_minutes == 30
    assert build_settings(monkeypatch, JWT_ACCESS_TTL_MINUTES="15").jwt_access_ttl_minutes == 15
    assert build_settings(monkeypatch, JWT_EXPIRES_HOURS="168").jwt_access_ttl_minutes == 168 * 60
