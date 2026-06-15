# INTEGRATION GUIDE — Client Email Tracker → your dashboard

> **Audience:** an AI coding agent (or engineer) with access to the target
> dashboard's codebase, tasked with porting this tool in. Read this top to
> bottom before writing code. It tells you what the tool does, which parts are
> portable as-is, which parts to rewrite, and a concrete step-by-step plan.

---

## 1. What this tool is

A client-relationship tracker built on top of **Gmail + Google Calendar**. For
each person you email, it maintains a profile and auto-classifies them into a
**single actionable bucket**, then lets you act (schedule Google Meet calls,
keep formatted meeting notes, chat with an AI about your pipeline).

Core capabilities, each independently portable:

| Capability | Module | External dep |
|------------|--------|--------------|
| Pull Gmail → contacts/threads/messages | `sync.py`, `gmail_client.py` | Gmail API (read-only) |
| Classify each contact into a bucket | `db.py` (`status_for`, `bucket_for`) | none (pure logic) |
| Calendar call detection (scheduled/completed) | `gmail_client.fetch_calendar_calls`, `db.apply_calls` | Calendar API |
| Create Google Meet invites | `gmail_client.create_event` | Calendar API |
| AI chat over your emails | `ai.py` | Gemini API (free tier OK) |
| Rich meeting notes (paste from Spark/Granola) | `db` meeting_notes + `client.html` JS | none |
| Bulk actions, hide-duplicate-calls, archive/resurface | `db.py` + routes | none |

---

## 2. Architecture — the important part

**Only `app.py` imports Flask.** Everything else is framework-agnostic plain
Python. This is the key fact for porting:

```
config.py        env-overridable settings (no deps)
db.py            SQLite data layer + ALL business logic (status/bucket rules)   ← PORT THE LOGIC
gmail_client.py  Google API wrapper (Gmail fetch, Calendar, Meet)               ← REUSE ~AS-IS
sync.py          orchestration: fetch → upsert → recompute rollups              ← REUSE, swap storage calls
ai.py            Gemini client + email-context builder                          ← REUSE ~AS-IS
app.py           Flask routes + template glue                                   ← REWRITE in your stack
templates/*.html server-rendered UI (Tailwind+Alpine via CDN)                   ← REBUILD or embed
```

**Data flows one way:** `sync.run_sync()` calls `gmail_client` (network) →
writes rows via `db` → `db.recompute_rollups()` derives status fields. The UI
only ever *reads* via `db.list_contacts()` / `db.get_contact()` /
`db.get_conversation()`. There is no business logic in the templates or routes
beyond calling these functions.

---

## 3. Data model (map this to your DB)

Five tables (`db.py` `init_db()`). Types are SQLite; map to your column types.

**contacts** — one row per person (PK `email`)
- `name, company, domain` — display info (company derived from domain)
- `last_message_at` (unix), `last_direction` ('in'|'out') — latest message
- `replied` (0/1) — have they ever replied to you (distinguishes cold outreach)
- `archived` (0/1), `archived_at` (unix) — user hidden; timestamp enables auto-resurface
- `next_call_at`, `last_call_at` (unix) — soonest upcoming / most recent past calendar meeting
- `call_hidden` (0/1) — user hid a duplicate attendee from the call lists
- `status_override` (nullable), `notes` (plain text)

**messages** — one row per email (PK `id` = Gmail message id, idempotent upsert)
- `thread_id, contact_email, from_email, to_emails, subject, snippet, body_text, direction, ts`

**threads** — derived rollup, one row per Gmail thread (rebuilt each sync)

**meta** — key/value (stores `last_history_id` for incremental sync, `gemini_api_key`, `gemini_model`)

**meeting_notes** — `id, contact_email, title, subtitle (meeting time), html, created_at`

> All timestamps are **unix seconds**. All "current state" (status badges,
> tab counts) is **derived at read time** from these columns + `now()`, so it's
> always live without a write — see §4.

---

## 4. The classification logic (the heart — port this exactly)

Two pure functions in `db.py`. They take a contact row and return a string.
**Re-implement these verbatim in your stack** — they encode all the product
rules and have no dependencies.

`status_for(row)` — most-actionable reply/call state for an *active* contact:
1. `needs_reply` — their message is latest (you owe a reply). **Wins over calls.**
2. `scheduled` — an upcoming calendar call exists.
3. `called` — a past call exists.
4. `waiting` — you replied last and they've replied before.
5. `no_reply` — you emailed, they never replied (cold outreach).

`bucket_for(row)` — the actual section shown, layering in archive + hide:
- If `archived`: a call still surfaces them → `scheduled`/`called`; else `archived`.
- Else (active): `needs_reply` > `scheduled` > `called` > `waiting` > `no_reply`.
- `call_hidden` makes the call invisible (so duplicate attendees fall back to their reply bucket).

These rules were iterated heavily against real use — preserve them. Key
behaviors they produce:
- A new inbound email always pulls someone back to **Needs reply**, even if a call is booked.
- Booking/holding a call surfaces a contact even if archived.
- Archiving someone who later emails you auto-unarchives them (`resurface_archived`, gated on `archived_at`).
- Bounce addresses (`postmaster@`, `mailer-daemon@`) auto-archive and never resurface.

---

## 5. External services & credentials

**Gmail + Calendar (Google OAuth):**
- Scopes: `gmail.readonly`, `calendar.events` (see `gmail_client.SCOPES`). Read-only mail; the only writes are calendar events.
- Local/desktop: `InstalledAppFlow` + `credentials.json` (OAuth client) → `token.json`. For a **server**, switch to a web OAuth flow or a service account with domain-wide delegation, and store tokens **per user** in your DB/secrets manager instead of `token.json`. Paths are config-overridable (`CT_CREDENTIALS_FILE`, `CT_TOKEN_FILE`).
- **Incremental sync** uses Gmail's History API (`fetch_changes`) bookmarked by `last_history_id` in `meta`; falls back to a full fetch when the bookmark expires (HTTP 404). This keeps syncs cheap — preserve it.

**Gemini (AI chat):** API key stored in `meta` (`db.get_meta('gemini_api_key')`). Free tier (Flash) needs no billing. For multi-user, store a key per user/workspace, not one global key.

---

## 6. Config (12-factor ready)

All tunables are in `config.py`, each overridable by an env var (prefix `CT_`):

| Env var | Default | Meaning |
|---------|---------|---------|
| `CT_TIMEZONE` | `Europe/Rome` | timezone for created calendar events |
| `CT_ALWAYS_INVITE` | `aandreaa@mit.edu,fassio.leone@gmail.com` | teammates added to every invite |
| `CT_INTERNAL_EMAILS` | (3 addrs) | never treated as clients in call matching |
| `CT_AUTO_SYNC_INTERVAL` | `180` | background sync cadence (seconds) |
| `CT_SYNC_MAX_THREADS` | `200` | full-sync thread cap |
| `CT_GEMINI_MODEL` | `gemini-2.5-flash` | default AI model |
| `CT_PORT` | `5001` | dev server port |
| `CT_DATA_DIR`, `CT_CREDENTIALS_FILE`, `CT_TOKEN_FILE` | local paths | storage/secret locations |

No secrets are committed; `credentials.json`/`token.json`/`data/*.db` are gitignored.

---

## 7. Recommended integration paths

Pick based on how tightly you want to couple.

### Option A — "Service module" (recommended, lowest risk)
Treat `config.py + db.py + gmail_client.py + sync.py + ai.py` as a **self-contained package** you drop into the dashboard. Keep its own storage (SQLite or point `db.py` at your DB — see Option B). Your dashboard calls into it:
- `sync.start_sync()` / background scheduler for ingestion
- `db.list_contacts(tab)`, `db.get_contact(email)`, `db.get_conversation(email)`, `db.get_meeting_notes(email)` for reads
- `db.set_status`, `db.set_call_hidden`, `db.add_meeting_note`, `gmail_client.create_event`, `ai.chat` for actions
Then build the UI in your dashboard's frontend against those calls (or expose them as REST/GraphQL). **Throw away `app.py` and `templates/` and re-skin.**

### Option B — "Native tables" (tightest integration)
Map the 5 tables into your existing schema/ORM. Replace `db.py`'s `sqlite3`
calls with your ORM, but **keep `status_for`/`bucket_for`/`recompute_rollups`/
`apply_calls`/`resurface_archived`/`auto_archive_bounces` logic identical**.
Multi-tenant: add a `user_id`/`workspace_id` column to every table and scope
all queries. Move OAuth tokens + Gemini key into per-user secret storage.

### Option C — "Embedded app" (fastest, least native)
Run the Flask app as-is behind your dashboard (iframe or reverse-proxy a
subpath), sharing auth via a header/JWT. Quickest to ship, weakest UX
integration. Good for a pilot.

---

## 8. Step-by-step for the implementing agent

1. **Read** `config.py`, then `db.py` (esp. `status_for`, `bucket_for`,
   `recompute_rollups`, `apply_calls`). Confirm you understand the bucket rules
   (§4) — they are the product.
2. **Decide** Option A/B/C (§7) based on the dashboard's stack and whether it's
   multi-user. If multi-user → Option B with a tenant column is required.
3. **Storage:** create the 5 tables (or ORM models) from §3, adding a tenant key
   if needed. Port the derived-field logic unchanged.
4. **Ingestion:** wire Google OAuth in the dashboard's auth system (server flow,
   per-user tokens). Reuse `gmail_client.fetch_threads` / `fetch_changes` /
   `fetch_calendar_calls` and `sync.run_sync` (swap the `db.*` calls for your
   storage). Schedule `run_sync` per connected user (cron/worker, not a daemon
   thread, in production).
5. **Reads/Actions:** expose `list_contacts`, `get_contact`, `get_conversation`,
   `get_meeting_notes`, and the action functions through your API layer.
6. **UI:** rebuild the views in your dashboard's component system. The reference
   UI lives in `templates/` — copy the *behaviors*, not the markup:
   - tab buckets + counts (`dashboard.html`)
   - conversation thread view with quote-stripping (`client.html`, `gmail_client.strip_quoted`)
   - rich meeting-note paste cleaner + title/time auto-extract (`client.html` `<script>`) — this is non-obvious; reuse the JS logic
   - bulk select + context-aware bulk action
7. **AI:** reuse `ai.py` (`build_context` + `chat`). Store the Gemini key per
   user. Update the system prompt's bucket legend if you rename buckets.
8. **Verify** against the checklist in §9.

---

## 9. Verification checklist (behaviors to preserve)

- [ ] New inbound email → contact appears in **Needs reply** (even with a booked call).
- [ ] `replied=0` cold outreach lands in **No reply yet**, not Waiting.
- [ ] Booking a call → **Call scheduled**; after the start time passes → **Completed** (computed at read time, no write needed).
- [ ] Archiving someone with a call → still shown in the call section; archiving plain contact → hidden; their later email auto-resurfaces them.
- [ ] `postmaster@`/`mailer-daemon@` auto-archived, never resurfaced.
- [ ] Duplicate call attendee can be hidden without affecting the real event.
- [ ] Conversation view shows the full thread with quoted reply-chains stripped, per-sender labels, and correct address parsing for `"Last, First" <addr>` names (use `email.getaddresses`, not naive comma-split — this was a real bug).
- [ ] Pasting a Spark/Granola summary keeps bold/headings/lists/indent, stays snappy (junk styles stripped), and auto-fills title (line 1) + time (line 2).
- [ ] Calendar invites: add `ALWAYS_INVITE`, attach a Google Meet, exclude `INTERNAL_EMAILS` from client matching.

---

## 10. Known constraints / gotchas

- **Google Meet waiting room** can't be disabled via API for a *personal* Gmail host; only the meeting creator admits external guests. If your dashboard hosts from a Workspace account, this disappears. (Documented because it surprised the original user.)
- **Gemini free tier** = Flash models only; Pro 429s without billing. `ai.py` surfaces a friendly message for that.
- **`app.debug=True` + reloader**: the background scheduler is guarded by `WERKZEUG_RUN_MAIN` so it starts once. In production use a real worker/cron, not the in-process thread.
- **SQLite** is single-writer; fine for one user. For multi-user, move to your production DB (Option B).
- Timestamps are unix seconds throughout; render in the user's timezone.

## 12. Platform support

The code is **OS-independent** (Windows / macOS / Linux):
- All paths use `pathlib` relative to the module — no hardcoded OS paths.
- No shell-outs, `subprocess`, signals, or `fork`.
- Date formatting avoids the `%-d` strftime modifier (a *nix-only extension that
  raises `ValueError` on Windows — this was the original "Mac-only" breakage).
- `from __future__ import annotations` is set in every module, so the `X | None`
  type hints work on **Python 3.7+** (recommend 3.9+).

Requirements: Python 3.9+ and the packages in `requirements.txt`. The desktop
OAuth flow (`InstalledAppFlow.run_local_server`) opens the default browser and
works on all three OSes; on a **headless server** switch to a web OAuth flow
(see §5).

---

## 11. File map

```
config.py          settings (env-overridable)
db.py              storage + business logic  ← the brain
gmail_client.py    Gmail/Calendar/Meet wrapper, quote-stripping, address parsing
sync.py            ingestion orchestration + incremental (History API) + auto-sync loop
ai.py              Gemini chat + email-context builder
app.py             Flask routes (reference only — rewrite for your stack)
templates/         reference UI (Tailwind + Alpine via CDN)
README.md          local-run / first-time setup
INTEGRATION.md     this file
```
