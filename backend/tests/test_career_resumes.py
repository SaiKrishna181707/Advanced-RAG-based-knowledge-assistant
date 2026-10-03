"""Tests for the career resume pipeline (Phase 2).

These tests cover:
- unauthenticated resume access
- user isolation
- upload validation (file type, empty file)
- resume CRUD
- process / extraction endpoint
- import into career profile
- repository operations
"""
from __future__ import annotations

import io
import json

import pytest


# ------------------------------------------------------------------- helpers

def _make_txt_upload(content: str = "Test Resume Content", filename: str = "resume.txt"):
    return {
        "file": (io.BytesIO(content.encode("utf-8")), filename, "text/plain"),
    }


# -------------------------------------------------- unauthenticated access

class TestResumeAuth:
    """Unauthenticated and cross-user resume access must be rejected."""

    def test_list_resumes_unauthenticated(self, client):
        response = client.get("/api/career/resumes")
        assert response.status_code == 401

    def test_upload_resume_unauthenticated(self, client):
        response = client.post("/api/career/resumes", data=_make_txt_upload(), content_type="multipart/form-data")
        assert response.status_code == 401

    def test_get_resume_unauthenticated(self, client):
        response = client.get("/api/career/resumes/000000000000000000000000")
        assert response.status_code == 401

    def test_delete_resume_unauthenticated(self, client):
        response = client.delete("/api/career/resumes/000000000000000000000000")
        assert response.status_code == 401

    def test_process_resume_unauthenticated(self, client):
        response = client.post("/api/career/resumes/000000000000000000000000/process")
        assert response.status_code == 401

    def test_import_resume_unauthenticated(self, client):
        response = client.post(
            "/api/career/resumes/000000000000000000000000/import",
            json={"sections": ["skills"]},
        )
        assert response.status_code == 401


# ---------------------------------------------------- upload validation

class TestResumeUploadValidation:
    """File type and content validation for resume uploads."""

    def test_upload_no_file(self, client, make_user):
        headers, _, _ = make_user()
        response = client.post("/api/career/resumes", headers=headers)
        assert response.status_code in (400, 422)

    def test_upload_unsupported_type(self, client, make_user):
        headers, _, _ = make_user()
        data = {"file": (io.BytesIO(b"binary garbage"), "resume.exe", "application/octet-stream")}
        response = client.post(
            "/api/career/resumes",
            data=data,
            headers=headers,
            content_type="multipart/form-data",
        )
        assert response.status_code in (400, 415, 422)

    def test_upload_txt_succeeds(self, client, make_user):
        headers, _, _ = make_user()
        response = client.post(
            "/api/career/resumes",
            data=_make_txt_upload("John Doe\nSoftware Engineer\nPython, Flask, React"),
            headers=headers,
            content_type="multipart/form-data",
        )
        assert response.status_code == 201
        body = response.get_json()
        assert body["success"] is True
        assert body["data"]["status"] == "uploaded"
        assert body["data"]["file_type"] == "txt"


# ----------------------------------------------- user isolation

class TestResumeUserIsolation:
    """Users must not be able to access each other's resumes."""

    def test_cannot_read_other_users_resume(self, client, make_user):
        # User A uploads a resume
        headers_a, _, _ = make_user()
        upload_resp = client.post(
            "/api/career/resumes",
            data=_make_txt_upload("User A resume"),
            headers=headers_a,
            content_type="multipart/form-data",
        )
        resume_id = upload_resp.get_json()["data"]["id"]

        # User B tries to read it
        headers_b, _, _ = make_user()
        response = client.get(f"/api/career/resumes/{resume_id}", headers=headers_b)
        assert response.status_code == 404

    def test_cannot_delete_other_users_resume(self, client, make_user):
        headers_a, _, _ = make_user()
        upload_resp = client.post(
            "/api/career/resumes",
            data=_make_txt_upload("User A resume for delete test"),
            headers=headers_a,
            content_type="multipart/form-data",
        )
        resume_id = upload_resp.get_json()["data"]["id"]

        headers_b, _, _ = make_user()
        response = client.delete(f"/api/career/resumes/{resume_id}", headers=headers_b)
        assert response.status_code == 404


# ----------------------------------------------- CRUD operations

class TestResumeCRUD:
    """Basic resume list, get, delete."""

    def test_list_resumes_empty(self, client, make_user):
        headers, _, _ = make_user()
        response = client.get("/api/career/resumes", headers=headers)
        assert response.status_code == 200
        assert response.get_json()["data"] == []

    def test_upload_and_list(self, client, make_user):
        headers, _, _ = make_user()
        client.post(
            "/api/career/resumes",
            data=_make_txt_upload("Resume 1"),
            headers=headers,
            content_type="multipart/form-data",
        )
        client.post(
            "/api/career/resumes",
            data=_make_txt_upload("Resume 2", filename="resume2.txt"),
            headers=headers,
            content_type="multipart/form-data",
        )
        response = client.get("/api/career/resumes", headers=headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert len(data) == 2

    def test_get_resume(self, client, make_user):
        headers, _, _ = make_user()
        upload_resp = client.post(
            "/api/career/resumes",
            data=_make_txt_upload("Resume for GET"),
            headers=headers,
            content_type="multipart/form-data",
        )
        resume_id = upload_resp.get_json()["data"]["id"]
        response = client.get(f"/api/career/resumes/{resume_id}", headers=headers)
        assert response.status_code == 200
        assert response.get_json()["data"]["id"] == resume_id

    def test_delete_resume(self, client, make_user):
        headers, _, _ = make_user()
        upload_resp = client.post(
            "/api/career/resumes",
            data=_make_txt_upload("Resume to delete"),
            headers=headers,
            content_type="multipart/form-data",
        )
        resume_id = upload_resp.get_json()["data"]["id"]
        response = client.delete(f"/api/career/resumes/{resume_id}", headers=headers)
        assert response.status_code == 200
        # Confirm it's gone
        response = client.get(f"/api/career/resumes/{resume_id}", headers=headers)
        assert response.status_code == 404

    def test_extracted_text_not_in_list(self, client, make_user):
        """List responses should never contain the full extracted text."""
        headers, _, _ = make_user()
        client.post(
            "/api/career/resumes",
            data=_make_txt_upload("Some content"),
            headers=headers,
            content_type="multipart/form-data",
        )
        response = client.get("/api/career/resumes", headers=headers)
        for item in response.get_json()["data"]:
            assert "extracted_text" not in item


# ----------------------------------------------- extraction endpoint

class TestResumeExtraction:
    """GET extraction endpoint returns draft data."""

    def test_extraction_before_processing(self, client, make_user):
        headers, _, _ = make_user()
        upload_resp = client.post(
            "/api/career/resumes",
            data=_make_txt_upload("Resume for extraction test"),
            headers=headers,
            content_type="multipart/form-data",
        )
        resume_id = upload_resp.get_json()["data"]["id"]
        response = client.get(f"/api/career/resumes/{resume_id}/extraction", headers=headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert data["structured_draft"] is None
        assert data["extraction_status"] == "pending"


# ----------------------------------------------- career profile API

class TestCareerProfileAPI:
    """Career profile GET and PUT."""

    def test_get_empty_profile(self, client, make_user):
        headers, _, _ = make_user()
        response = client.get("/api/career/profile", headers=headers)
        assert response.status_code == 200
        assert response.get_json()["data"] is None

    def test_put_and_get_profile(self, client, make_user):
        headers, _, _ = make_user()
        profile = {
            "personal": {"name": "Jane Doe", "email": "jane@example.com"},
            "skills": ["Python", "Flask"],
            "education": [{"institution": "MIT", "degree": "BS", "field": "CS"}],
        }
        put_resp = client.put("/api/career/profile", json=profile, headers=headers)
        assert put_resp.status_code == 200

        get_resp = client.get("/api/career/profile", headers=headers)
        assert get_resp.status_code == 200
        data = get_resp.get_json()["data"]
        assert data["personal"]["name"] == "Jane Doe"
        assert "Python" in data["skills"]

    def test_profile_unauthenticated(self, client):
        response = client.get("/api/career/profile")
        assert response.status_code == 401
