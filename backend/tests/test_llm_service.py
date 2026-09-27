"""
Answer-generation unit tests.

These cover the parts of the LLM layer that are ours rather than the provider's:
citation hygiene, prompt assembly, history bounding and model fallback. The
network calls themselves are stubbed so the suite stays offline and fast.
"""
from __future__ import annotations

import pytest

from app.config import GROQ_MODEL_PREFERENCE, settings
from app.services import llm_service


# ----------------------------------------------------------------- citations


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Value is 12,480 USD\u30101\u3011.", "Value is 12,480 USD[1]."),
        ("See \u30162\u3017 and \u30103\u3011.", "See [2] and [3]."),
        ("Already fine [1].", "Already fine [1]."),
        ("", ""),
    ],
)
def test_normalize_citations_rewrites_full_width_markers(raw, expected):
    """gpt-oss models emit CJK brackets; the UI contract is plain [n]."""
    assert llm_service.normalize_citations(raw) == expected


def test_prune_dangling_citations_drops_markers_past_the_source_count():
    assert llm_service.finalize_answer("A [1] B [2] C [9].", 2) == "A [1] B [2] C."
    assert llm_service.finalize_answer("Wrong [5].", 2) == "Wrong."
    # Callers strip the answer, so a removed leading marker leaves only whitespace.
    assert llm_service.finalize_answer("[0] not a source.", 2).strip() == "not a source."


def test_prune_keeps_valid_markers_and_markdown_tables():
    text = "| Metric | Q3 |\n|---|---|\n| Spend | 12,480 [1] |\n| Split | 5,100 [2] |"
    assert llm_service.finalize_answer(text, 2) == text


def test_prune_keeps_markers_when_every_source_is_valid():
    text = "Both regions grew [1][2]."
    assert llm_service.finalize_answer(text, 5) == text


def test_finalize_answer_normalizes_then_prunes():
    # Full-width marker pointing at a missing source disappears entirely.
    assert llm_service.finalize_answer("Kept \u30101\u3011 dropped \u30107\u3011.", 1) == (
        "Kept [1] dropped."
    )


# ------------------------------------------------------------------ context


def test_build_context_numbers_blocks_with_document_and_page():
    context = llm_service.build_context(
        [
            {
                "document_name": "report.pdf",
                "page_number": 12,
                "location_unit": "page",
                "content": "North region value: 4,180 USD.",
            }
        ]
    )
    assert context.startswith("[1] report.pdf - Page 12")
    assert "4,180 USD" in context


def test_build_context_reports_missing_material_explicitly():
    assert "no matching content" in llm_service.build_context([]).lower()


def test_build_sources_aligns_index_with_context_numbering():
    sources = llm_service.build_sources(
        [
            {"chunk_id": "c1", "document_name": "a.pdf", "page_number": 3},
            {"chunk_id": "c2", "document_name": "b.pdf", "page_number": 7},
        ]
    )
    assert [item["index"] for item in sources] == [1, 2]
    assert sources[1]["document"] == "b.pdf"
    assert sources[1]["page"] == 7


def test_history_is_bounded_to_the_requested_number_of_turns():
    history = []
    for turn in range(10):
        history.append({"role": "user", "content": f"question {turn}"})
        history.append({"role": "assistant", "content": f"answer {turn}"})

    messages = llm_service.history_messages(history, max_turns=2)

    assert len(messages) == 4
    assert messages[0]["content"] == "question 8"
    assert messages[-1]["content"] == "answer 9"


def test_history_ignores_unknown_roles_and_blank_content():
    messages = llm_service.history_messages(
        [
            {"role": "system", "content": "ignore me"},
            {"role": "user", "content": "   "},
            {"role": "user", "content": "real question"},
        ],
        max_turns=4,
    )
    assert messages == [{"role": "user", "content": "real question"}]


def test_build_messages_puts_scope_and_question_last():
    messages = llm_service.build_messages(
        "What was the spend?", [], scope_label="Research Papers"
    )
    assert messages[0]["role"] == "system"
    assert messages[-1]["role"] == "user"
    assert "Retrieval scope: Research Papers" in messages[-1]["content"]
    assert "What was the spend?" in messages[-1]["content"]


# ------------------------------------------------------------ model fallback


def test_reasoning_models_receive_a_reasoning_effort(monkeypatch):
    monkeypatch.setattr(settings, "llm_reasoning_effort", "low")
    assert llm_service.is_reasoning_model("openai/gpt-oss-120b") is True
    assert llm_service._completion_options("openai/gpt-oss-120b") == {
        "reasoning_effort": "low"
    }
    assert llm_service._completion_options("llama-3.3-70b-versatile") == {}


def test_resolve_model_keeps_configured_model_when_it_is_available(monkeypatch):
    monkeypatch.setattr(settings, "groq_model", "openai/gpt-oss-120b")
    monkeypatch.setattr(
        llm_service, "available_models", lambda force=False: {"openai/gpt-oss-120b"}
    )
    llm_service._model_cache.update(model=None, available=None, checked_at=0.0)
    assert llm_service.resolve_model(force=True) == "openai/gpt-oss-120b"
    assert llm_service.model_status()["fallback_in_use"] is False


def test_resolve_model_falls_back_when_the_key_lacks_the_configured_model(monkeypatch):
    monkeypatch.setattr(settings, "groq_model", "llama-3.3-70b-versatile")
    monkeypatch.setattr(
        llm_service, "available_models", lambda force=False: {"openai/gpt-oss-120b"}
    )
    llm_service._model_cache.update(model=None, available=None, checked_at=0.0)

    resolved = llm_service.resolve_model(force=True)

    assert resolved == "openai/gpt-oss-120b"
    assert resolved == GROQ_MODEL_PREFERENCE[0]
    status = llm_service.model_status()
    assert status["requested_model"] == "llama-3.3-70b-versatile"
    assert status["fallback_in_use"] is True


def test_resolve_model_returns_configured_model_when_the_list_is_unavailable(monkeypatch):
    monkeypatch.setattr(settings, "groq_model", "some/retired-model")
    monkeypatch.setattr(llm_service, "available_models", lambda force=False: None)
    llm_service._model_cache.update(model=None, available=None, checked_at=0.0)

    # Nothing is silently swapped in: the real provider error is allowed to surface.
    assert llm_service.resolve_model(force=True) == "some/retired-model"


def test_health_does_not_probe_the_provider(monkeypatch):
    llm_service._model_cache.update(model=None, available=None, checked_at=0.0)

    def _explode(*_args, **_kwargs):
        raise AssertionError("health() must not call the provider")

    monkeypatch.setattr(llm_service, "available_models", _explode)

    payload = llm_service.health()

    assert payload["configured"] is True
    assert payload["model"] == settings.groq_model
    assert payload["status"] == "ready"


def test_health_reports_when_it_is_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "groq_api_key", "")
    monkeypatch.setattr(settings, "groq_model", "openai/gpt-oss-120b")
    payload = llm_service.health()
    assert payload["configured"] is False
    assert payload["status"] == "not_configured"


def test_health_never_leaks_the_api_key(monkeypatch):
    monkeypatch.setattr(settings, "groq_api_key", "gsk_super-secret-value")
    assert "gsk_super-secret-value" not in str(llm_service.health())


# ------------------------------------------------------------------ parsing


@pytest.mark.parametrize(
    "raw,limit,expected",
    [
        (
            '["What next?", "And then?", "Summary?"]',
            3,
            ["What next?", "And then?", "Summary?"],
        ),
        (
            "```json\n[\"What next?\", \"And then?\"]\n```",
            3,
            ["What next?", "And then?"],
        ),
        (
            '[{"question": "What next?"}, {"text": "And then?"}]',
            3,
            ["What next?", "And then?"],
        ),
        ('["only one"]', 3, ["only one"]),
    ],
)
def test_parse_followups_accepts_the_shapes_the_model_returns(raw, limit, expected):
    """A bare array, a fenced array and an object array all parse the same way."""
    assert llm_service._parse_followups(raw, limit) == expected


def test_parse_followups_returns_empty_on_junk():
    assert llm_service._parse_followups("I cannot help with that.", 3) == []
    assert llm_service._parse_followups('{"not": "a list"}', 3) == []


def test_parse_followups_respects_the_limit():
    raw = '["a", "b", "c", "d", "e"]'
    assert len(llm_service._parse_followups(raw, 2)) == 2
