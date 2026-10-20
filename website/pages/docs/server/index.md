---
title: The server it speaks to
description: The routes this release calls on the SG/Send API, the two secrets, what the in-memory server in tests/server.mjs implements, and the field names it has not verified against production.
---

# The server it speaks to

The modules talk HTTP to an SG/Send API host. The hosted one is `https://send.sgraph.ai` (and `https://dev.send.sgraph.ai` for development); anyone can [run their own](https://sgit.ai/deploy/); and `tests/server.mjs` in every release is the same routes in memory, in one Node process, for the tests and for a page on a laptop.

## Transfers

| Call | Auth | What the client sends and expects |
|---|---|---|
| `POST /api/transfers/create` | token | `{ file_size_bytes, content_type_hint, max_downloads, auto_delete, expires_at, transfer_id?, delete_auth_hash? }` → `{ transfer_id }`. `expires_at` is milliseconds; 0 is never. `max_downloads` 0 is unlimited |
| `POST /api/transfers/upload/{id}` | token | raw bytes, `application/octet-stream` |
| `POST /api/transfers/complete/{id}` | token | nothing is downloadable before this |
| `GET /api/transfers/info/{id}` | none | metadata: status, size, content type hint, download count |
| `GET /api/transfers/download/{id}` | none | the bytes; 410 once expired or exhausted; 404 when it never existed or was deleted |
| `GET /api/transfers/download-base64/{id}` | none | the same bytes in JSON |
| `DELETE /api/transfers/delete/{id}` | token + `x-sgraph-transfer-delete-auth` | only if a `delete_auth_hash` was set at create |

## Vaults

`GET /api/vault/read/{vault}/{file}` (public), `PUT /api/vault/write/{vault}/{file}` and `POST /api/vault/batch/{vault}` (token and `x-sgraph-vault-write-key`), `DELETE /api/vault/delete/...`, `GET /api/vault/presigned/read-url/...` for files over 4 MB. The vendored library makes these calls; this release never does directly. [API: vault objects](https://sgit.ai/api/vault-objects.html).

## The two secrets

The **access token** is presented as `x-sgraph-access-token`. The API also accepts `?access_token=` as a query fallback; this release never uses it, because query strings land in logs. The **decryption key** is never presented to the server at all.

## What the in-memory server implements

Everything in the two tables, plus `GET /api/health` and `GET /api/presigned/capabilities` (reporting no presigned support), with CORS as measured on the real host: any origin, the sgraph headers allowed, `X-API-Key` refused on preflight. It records methods, paths and statuses in a log the tests read, and never a key or a token.

## What is not verified against production

Stated here rather than guessed at, per [the reality file](/about/reality/):

- The JSON field names of `download-base64` (`content_base64`, `size`) are this server's; the production names were not checked.
- `info`'s field set is this server's; the client reads `content_type_hint`, `download_count` and `status` and treats the rest as opaque.
- A client-chosen `transfer_id` on create is documented in the SG/Send code (`Schema__Transfer__Create.transfer_id`) and used by send.sgraph.ai's friendly tokens; the 409 on a taken id is this server's choice of status.
- The edge in front of `send.sgraph.ai` has rewritten some 403s to an HTML 404 page; the client reports `EEDGE` when a body starts with `<` and says the status cannot be trusted.
