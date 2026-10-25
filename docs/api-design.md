# QuickNotes REST API Design

## Overview
Production API base URL: `https://api.quicknotes.example/v1` (illustrative). JSON over HTTPS. All endpoints except registration and login require `Authorization: Bearer <access_token>`. Users may access only their own notes. IDs are UUIDs. Dates use ISO 8601 UTC.

## Endpoints

| Method | Path | Description | Success |
|---|---|---|---|
| POST | `/auth/register` | Register user | 201 Created |
| POST | `/auth/login` | Issue access token | 200 OK |
| GET | `/notes` | List user's notes (pagination, optional tag filter) | 200 OK |
| POST | `/notes` | Create note | 201 Created |
| GET | `/notes/{id}` | Retrieve one owned note | 200 OK |
| PATCH | `/notes/{id}` | Edit title/body | 200 OK |
| DELETE | `/notes/{id}` | Delete owned note | 204 No Content |
| GET | `/tags` | List user's tags | 200 OK |
| POST | `/tags` | Create tag | 201 Created |
| POST | `/notes/{id}/tags/{tagId}` | Attach owned tag to owned note | 204 No Content |
| DELETE | `/notes/{id}/tags/{tagId}` | Detach tag | 204 No Content |

## Create note
`POST /v1/notes` with `Content-Type: application/json`:

```json
{"title":"Plan security review","body":"Review access logs and permissions.","tagIds":["7a90d65d-56f1-4d9b-ae17-81d85b0aef20"]}
```

**201 Created**; `Location: /v1/notes/79a6f450-728f-4dc8-9395-d45a8c8c89e1`:

```json
{"id":"79a6f450-728f-4dc8-9395-d45a8c8c89e1","title":"Plan security review","body":"Review access logs and permissions.","tagIds":["7a90d65d-56f1-4d9b-ae17-81d85b0aef20"],"createdAt":"2026-10-25T12:00:00Z","updatedAt":"2026-10-25T12:00:00Z"}
```

The authenticated user ID is derived from the token, never trusted from the request body. `title` must contain 1–100 non-whitespace characters after trimming; `body` may be empty. Duplicate tag IDs are deduplicated; tag ownership is checked.

## List notes
`GET /v1/notes?limit=20&cursor=eyJpZCI6IjEyMyJ9` (cursor illustrative). `limit` defaults to 20, maximum 100. Sort newest first by `(created_at, id)`; cursor is an opaque server-issued token.

**200 OK**:

```json
{"items":[{"id":"79a6f450-728f-4dc8-9395-d45a8c8c89e1","title":"Plan security review","body":"Review access logs and permissions.","tagIds":[],"createdAt":"2026-10-25T12:00:00Z","updatedAt":"2026-10-25T12:00:00Z"}],"nextCursor":null}
```

An empty collection returns `{"items":[],"nextCursor":null}` with 200. Deleted notes do not appear. All note lookups filter by authenticated `user_id`.

## Errors

| Code | Meaning | Example |
|---|---|---|
| 400 | Invalid JSON or validation failure | Empty or overlong title |
| 401 | Missing, expired or invalid authentication | Missing token |
| 403 | Authenticated but action not permitted | Account restricted |
| 404 | Resource absent or not owned by user | Unknown note ID |
| 409 | Conflict | Duplicate tag name |
| 429 | Too many requests | Rate limit exceeded |
| 500 | Unexpected server failure | Internal error |

**400 Bad Request**:

```json
{"error":{"code":"VALIDATION_ERROR","message":"Title must be between 1 and 100 characters.","details":{"title":"Invalid length"},"requestId":"req_abc123"}}
```

Return consistent error envelopes, never stack traces. `DELETE` returns no body on 204; repeat deletion returns 404. Validate input server-side, enforce per-user authorization, rate-limit abusive traffic, and log request IDs without sensitive note content.
