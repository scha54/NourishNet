---
name: API Contract Guard
description: Verifies Lambda handlers conform to the NourishNet API response envelope format after any edit to backend handler files.
eventType: fileEdited
filePatterns: backend/src/handlers/**/*.ts
hookAction: askAgent
---

# API Contract Guard

When a file matching `backend/src/handlers/**/*.ts` is edited, review the changed handler and verify:

1. **Success responses** — all non-error return paths call `successResponse(data, statusCode)` from `backend/src/domain/response.ts` and produce a JSON body with a top-level `data` field.

2. **Error responses** — all error return paths call `errorResponse(statusCode, code, message)` and produce a JSON body with a top-level `error` field containing `code` (SCREAMING_SNAKE_CASE string) and `message` (human-readable string).

3. **Top-level try/catch** — the handler has a try/catch at the outermost level that catches unexpected errors and returns a 500 `INTERNAL_ERROR` response without exposing stack traces.

4. **No raw returns** — the handler never returns a plain string, an unstructured object, or an empty body for a 2xx response.

5. **Status code correctness** — 200 for successful reads, 201 for successful creates, 400 for validation errors, 401 for auth errors, 403 for authorisation errors, 404 for not found, 500 for internal errors.

If any of these are violated, report the specific violation with the line number and suggest the corrected code. If all checks pass, confirm compliance in one line.
