# ALBATROSS - Architecture

Companion to [../README.md](../README.md). The README describes what ALBATROSS
does; this document describes how it is put together, which invariants the code
depends on, and where a new feature plugs in.

---

## 1. Layer responsibilities

```
routes/        HTTP only: parse, validate, authorise, delegate, serialise
services/      Orchestration and policy: plans, usage, storage, scope, LLM, jobs
rag/           Retrieval mechanics: extract, chunk, embed, index, search
db/            Persistence mechanics: client, indexes, repositories
```

The dependency direction is strictly downward. A repository never imports a
route, and `rag/` never imports Flask. This is what makes the retrieval core
testable without an HTTP server (see `tests/test_retrieval.py`).

| Module | Owns | Must not |
|--------|------|----------|
| `routes/*` | Status codes, request shape, envelope | Write a Mongo query directly |
| `services/*` | Policy decisions (is this allowed? what scope?) | Know about Flask request objects |
| `rag/*` | Retrieval quality | Know about users' HTTP sessions |
| `db/repositories/*` | Query construction, index usage | Make policy decisions |

---

## 2. Request lifecycle

```
request
  -> request_id + structured log context        (logging_config.py)
  -> CORS                                        (create_app)
  -> rate limit                                  (ratelimit.py)
  -> @require_auth -> user document              (deps.py)
  -> payload validation                          (validators.py)
  -> repository / service call                   (db, services, rag)
  -> ok(data) | raise AppError                   (serializers.py, errors.py)
  -> error handler -> envelope                   (errors.py)
  -> response
```

### Error contract

Every failure class is one exception type carrying an HTTP status, a stable
machine `code`, and a message that is safe to show a user. The handler
converts it into the envelope; anything unexpected becomes a generic 500 and the
traceback is logged, never returned.

| Exception | Status | Code |
|-----------|--------|------|
| `ValidationError` | 422 | `validation_error` |
| `AuthError` | 401 | `unauthenticated` / `invalid_token` |
| `NotFoundError` | 404 | `not_found` |
| `ConflictError` | 409 | `conflict` |
| `UsageLimitError` | 402 | `usage_limit_reached` |
| `RateLimitError` | 429 | `rate_limit_exceeded` |
| `PayloadTooLargeError` | 413 | `payload_too_large` |
| `UnsupportedMediaTypeError` | 415 | `unsupported_media_type` |
| `UpstreamError` | 502 | `llm_unavailable` / `upstream_error` |

A resource owned by another user raises `NotFoundError`, not a 403. Refusing
with 404 means an attacker cannot use the API as an existence oracle for other
accounts' IDs.

---

## 3. Multi-tenancy invariants

These are the rules the codebase relies on. Breaking any one of them is a
cross-tenant data leak.

1. **`user_id` is a required repository argument.** There is no repository
   function that reads tenant data without it. An unscoped query is not
   expressible, which is why this is an invariant rather than a review checklist.
2. **Ownership is re-checked on write, not assumed from a read.** A `PATCH` or
   `DELETE` re-filters by `user_id` in the update/delete predicate itself, so a
   race between the check and the write cannot cross tenants.
3. **Every index that serves a tenant query leads with `user_id`.** See
   `db/mongo.py:ensure_indexes()`. A query that cannot use a user-prefixed index
   is a bug, not just a slow path.
4. **The retrieval index is keyed by owner.** `index_store` holds one index per
   `user_id` and applies the scope filter as a position mask *inside* that
   index, so a filtered search can never reach another tenant's chunks.
5. **Serialisation goes through the public projection.** `public_user()` strips
   `password_hash` and `billing_customer_id`; routes return projections, not raw
   documents.

`tests/test_authorization.py` exercises 1-5 with a second account.

---

## 4. Data model

### users

```
_id, name, email (unique), password_hash, avatar_url,
subscription_plan, subscription_status, billing_customer_id (reserved),
preferences { theme, response_style, retrieval_count, default_collection_id },
created_at, updated_at, last_login
```

`preferences` is embedded rather than a separate collection: it is always read
with the user, never queried independently, and is small.

### documents

```
_id, user_id, name, original_filename, stored_name, extension, mime_type,
size_bytes, sha256, page_count,
status,            # uploading | processing | indexing | ready | failed
extraction_status, # pending | extracted | failed
indexing_status,   # pending | indexed | failed
chunk_count, processing_ms, error, collection_id,
created_at, updated_at
```

`sha256` is the deduplication key. Its index is **partial**
(`sha256: {$type: "string"}`) so documents without a checksum do not collide on
`null`.

### chunks

```
_id, user_id, document_id, collection_id, chunk_index, page_number,
location_unit, content, embedding [1024 floats], created_at
```

Chunks carry `collection_id` denormalised from their document so a
collection-scoped retrieval does not need a join. The trade-off is that moving a
document between collections must update its chunks, which
`PATCH /api/documents/<id>` does in the same operation.

`location_unit` records what the number means (`page`, `section`, `row`), so a
DOCX citation does not claim to be a page number.

### conversations / messages

```
conversations: _id, user_id, title, message_count, last_message_preview,
               created_at, updated_at
messages:      _id, conversation_id, user_id, role, content, sources[],
               model, retrieval_ms, llm_ms, created_at
```

`sources` is a snapshot taken at answer time. It is deliberately not a
reference: if a document is later deleted, the citation it produced must still
resolve to the text that was actually used.

### usage / corpus_state

```
usage:        user_id, period ("2026-09"), documents, storage_bytes, questions
corpus_state: user_id, revision, updated_at
```

`usage` is keyed by period so the monthly reset is a new document rather than a
mutation, and history is never lost. `corpus_state.revision` is incremented on
every chunk insert or delete; `index_store` compares the revision it built
against the current one to decide whether a rebuild is needed. This is what
keeps a rebuild from happening on every query.

---

