#!/usr/bin/env python3
"""SQLite storage for the Client Email Tracker.

Core tables: contacts (one per person you email with), threads (one per Gmail
conversation), and messages (one per email). Status is derived from the
direction of the most recent message in each thread — see sync.py.

Extras: meeting_notes (pasted call summaries), chat_messages (persistent AI
chat), contact_aliases (merged identities), message_contacts (CC attribution),
and an FTS5 index over message bodies for search.
"""
from __future__ import annotations  # keep `X | None` hints working on Python 3.7+

import logging
import sqlite3
import time
from pathlib import Path

import config

DB_PATH = config.DATA_DIR / "clients.db"

log = logging.getLogger("tracker.db")

STAGES = ["", "lead", "contacted", "call_booked", "proposal", "won", "lost"]
STAGE_LABELS = {
    "": "—", "lead": "Lead", "contacted": "Contacted",
    "call_booked": "Call booked", "proposal": "Proposal",
    "won": "Won", "lost": "Lost",
}

_fts_ok: bool | None = None  # whether this SQLite build has FTS5


def get_conn() -> sqlite3.Connection:
    """Open a connection with row access by column name + sane concurrency."""
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    # WAL lets the background sync thread write while requests read.
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def init_db() -> None:
    """Create tables if they don't exist and run column migrations."""
    global _fts_ok
    conn = get_conn()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS contacts (
            email           TEXT PRIMARY KEY,
            name            TEXT,
            company         TEXT,
            domain          TEXT,
            last_message_at INTEGER,         -- unix seconds
            last_direction  TEXT,            -- 'in' | 'out'
            status_override TEXT,            -- NULL | 'done' | 'needs_reply'
            archived        INTEGER DEFAULT 0,
            archived_at     INTEGER,            -- unix secs when archived (for auto-resurface)
            replied         INTEGER DEFAULT 0,  -- 1 if they ever replied to you
            next_call_at    INTEGER,            -- soonest upcoming calendar meeting (unix)
            last_call_at    INTEGER,            -- most recent past meeting (unix)
            call_hidden     INTEGER DEFAULT 0,  -- 1 = hide from the call sections (dup attendee)
            notes           TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS threads (
            thread_id      TEXT PRIMARY KEY,
            contact_email  TEXT,
            subject        TEXT,
            last_ts        INTEGER,
            last_direction TEXT
        );

        CREATE TABLE IF NOT EXISTS messages (
            id            TEXT PRIMARY KEY,    -- Gmail message id
            thread_id     TEXT,
            contact_email TEXT,
            from_email    TEXT,
            to_emails     TEXT,
            subject       TEXT,
            snippet       TEXT,
            body_text     TEXT,
            direction     TEXT,               -- 'in' | 'out'
            ts            INTEGER
        );

        CREATE TABLE IF NOT EXISTS meta (
            key   TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS meeting_notes (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_email TEXT,
            title         TEXT,
            subtitle      TEXT,            -- meeting time (line 2 of a Spark note)
            html          TEXT,            -- formatted note (bold, lists, headings)
            created_at    INTEGER
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            role       TEXT,               -- 'user' | 'model'
            text       TEXT,
            created_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS contact_aliases (
            alias_email   TEXT PRIMARY KEY,  -- merged-away address
            primary_email TEXT               -- the contact it now belongs to
        );

        CREATE TABLE IF NOT EXISTS message_contacts (
            message_id    TEXT,
            contact_email TEXT,
            PRIMARY KEY (message_id, contact_email)
        );

        CREATE INDEX IF NOT EXISTS idx_notes_contact ON meeting_notes(contact_email);
        CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_email);
        CREATE INDEX IF NOT EXISTS idx_messages_thread  ON messages(thread_id);
        CREATE INDEX IF NOT EXISTS idx_threads_contact  ON threads(contact_email);
        CREATE INDEX IF NOT EXISTS idx_mc_contact ON message_contacts(contact_email);
        """
    )
    # Migrations: add newer columns to pre-existing databases.
    cols = [r[1] for r in conn.execute("PRAGMA table_info(contacts)")]
    contact_adds = {
        "replied":       "INTEGER DEFAULT 0",
        "archived_at":   "INTEGER",
        "next_call_at":  "INTEGER",
        "last_call_at":  "INTEGER",
        "call_hidden":   "INTEGER DEFAULT 0",
        "follow_up_at":  "INTEGER",            # snooze / follow-up reminder
        "stage":         "TEXT DEFAULT ''",    # pipeline stage
        "priority":      "INTEGER DEFAULT 0",  # 1 = high priority
        "tags":          "TEXT DEFAULT ''",    # comma-separated
        "user_edited":   "INTEGER DEFAULT 0",  # 1 = name/company set by hand
        "ai_summary":    "TEXT DEFAULT ''",    # cached on-demand AI summary
        "ai_summary_at": "INTEGER",
        "call_owner":    "TEXT DEFAULT ''",    # profile email assigned to this call
    }
    for col, decl in contact_adds.items():
        if col not in cols:
            conn.execute(f"ALTER TABLE contacts ADD COLUMN {col} {decl}")
    if "archived_at" not in cols:
        # Baseline already-archived contacts so a future reply can resurface them.
        conn.execute(
            "UPDATE contacts SET archived_at = strftime('%s','now') "
            "WHERE archived = 1 AND archived_at IS NULL"
        )
    msg_cols = [r[1] for r in conn.execute("PRAGMA table_info(messages)")]
    if "attachments" not in msg_cols:
        conn.execute("ALTER TABLE messages ADD COLUMN attachments TEXT DEFAULT ''")
    if "is_bulk" not in msg_cols:
        conn.execute("ALTER TABLE messages ADD COLUMN is_bulk INTEGER DEFAULT 0")
    note_cols = [r[1] for r in conn.execute("PRAGMA table_info(meeting_notes)")]
    if note_cols and "subtitle" not in note_cols:
        conn.execute("ALTER TABLE meeting_notes ADD COLUMN subtitle TEXT")

    # Full-text search over message bodies (FTS5 ships with Python's SQLite).
    if _fts_ok is None:
        try:
            conn.execute(
                "CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5("
                "msg_id UNINDEXED, contact_email UNINDEXED, subject, body)"
            )
            globals()["_fts_ok"] = True
        except sqlite3.OperationalError:
            globals()["_fts_ok"] = False
            log.warning("FTS5 unavailable — message search falls back to LIKE")
    conn.commit()
    conn.close()


def has_fts() -> bool:
    return bool(_fts_ok)


# ── Meta (key/value, e.g. the incremental-sync history bookmark) ─────────────

def get_meta(key: str, default=None):
    conn = get_conn()
    r = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    conn.close()
    return r["value"] if r else default


def set_meta(key: str, value: str) -> None:
    conn = get_conn()
    conn.execute(
        "INSERT INTO meta (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, str(value)),
    )
    conn.commit()
    conn.close()


# ── Writes (used by sync) ────────────────────────────────────────────────────

def get_aliases() -> dict[str, str]:
    """alias_email → primary_email map (applied when filing synced messages)."""
    conn = get_conn()
    rows = conn.execute("SELECT alias_email, primary_email FROM contact_aliases").fetchall()
    conn.close()
    return {r["alias_email"]: r["primary_email"] for r in rows}


def upsert_message(conn: sqlite3.Connection, m: dict) -> None:
    """Insert or replace a message by Gmail id (idempotent re-sync)."""
    m.setdefault("attachments", "")
    m.setdefault("is_bulk", 0)
    conn.execute(
        """
        INSERT INTO messages
            (id, thread_id, contact_email, from_email, to_emails,
             subject, snippet, body_text, direction, ts, attachments, is_bulk)
        VALUES
            (:id, :thread_id, :contact_email, :from_email, :to_emails,
             :subject, :snippet, :body_text, :direction, :ts, :attachments, :is_bulk)
        ON CONFLICT(id) DO UPDATE SET
            thread_id=excluded.thread_id,
            contact_email=excluded.contact_email,
            from_email=excluded.from_email,
            to_emails=excluded.to_emails,
            subject=excluded.subject,
            snippet=excluded.snippet,
            body_text=excluded.body_text,
            direction=excluded.direction,
            ts=excluded.ts,
            attachments=excluded.attachments,
            is_bulk=excluded.is_bulk
        """,
        m,
    )


def link_message_contact(conn: sqlite3.Connection, message_id: str,
                         contact_email: str) -> None:
    """Record that a message also involves this contact (CC / extra To)."""
    conn.execute(
        "INSERT OR IGNORE INTO message_contacts (message_id, contact_email) "
        "VALUES (?, ?)",
        (message_id, contact_email),
    )


def upsert_contact(conn: sqlite3.Connection, email: str, name: str,
                   company: str, domain: str) -> None:
    """Insert a contact, or refresh name/company without clobbering notes,
    archived, status_override, or hand-edited fields (which are user-owned)."""
    conn.execute(
        """
        INSERT INTO contacts (email, name, company, domain)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
            name=CASE WHEN contacts.user_edited = 1 THEN contacts.name
                 ELSE COALESCE(NULLIF(excluded.name, ''), contacts.name) END,
            company=CASE WHEN contacts.user_edited = 1 THEN contacts.company
                    ELSE COALESCE(NULLIF(excluded.company, ''), contacts.company) END,
            domain=excluded.domain
        """,
        (email, name, company, domain),
    )


def recompute_rollups(conn: sqlite3.Connection) -> None:
    """Rebuild threads + contact last_message/last_direction from messages.

    Run once at the end of a sync. A thread's last_direction is the direction
    of its most recent message; a contact's is the direction of their most
    recent message across all threads. Also rebuilds the FTS index.
    """
    # threads: latest message per thread_id (single window-function pass)
    conn.execute("DELETE FROM threads")
    conn.execute(
        """
        INSERT INTO threads (thread_id, contact_email, subject, last_ts, last_direction)
        SELECT thread_id, contact_email, subject, ts, direction FROM (
            SELECT thread_id, contact_email, subject, ts, direction,
                   ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY ts DESC) AS rn
            FROM messages
        ) WHERE rn = 1
        """
    )
    # contacts: latest message per contact + whether they ever replied
    conn.execute(
        """
        UPDATE contacts SET
            last_message_at = s.last_ts,
            last_direction  = s.last_dir,
            replied         = s.any_in
        FROM (
            SELECT contact_email, ts AS last_ts, direction AS last_dir, any_in
            FROM (
                SELECT contact_email, ts, direction,
                       ROW_NUMBER() OVER (PARTITION BY contact_email ORDER BY ts DESC) AS rn,
                       MAX(CASE WHEN direction = 'in' THEN 1 ELSE 0 END)
                           OVER (PARTITION BY contact_email) AS any_in
                FROM messages
            ) WHERE rn = 1
        ) AS s
        WHERE contacts.email = s.contact_email
        """
    )
    if has_fts():
        conn.execute("DELETE FROM messages_fts")
        conn.execute(
            "INSERT INTO messages_fts (msg_id, contact_email, subject, body) "
            "SELECT id, contact_email, COALESCE(subject,''), COALESCE(body_text,'') "
            "FROM messages"
        )
    conn.commit()


# Senders that are automation, not people. Used for auto-archiving.
_BOT_PATTERNS = [
    "postmaster%", "mailer-daemon%", "mail-daemon%",
    "no-reply%", "noreply%", "no_reply%", "donotreply%", "do-not-reply%",
    "notifications@%", "notification@%", "newsletter%", "news@%",
    "alerts@%", "alert@%", "updates@%", "billing@%", "receipts@%",
]


def _bot_col(col: str = "email") -> str:
    """SQL fragment: col matches any bot pattern."""
    return " OR ".join(f"{col} LIKE '{p}'" for p in _BOT_PATTERNS)


def _bot_where(prefix: str = "") -> str:
    return _bot_col(f"{prefix}email")


def auto_archive_bounces(conn: sqlite3.Connection) -> int:
    """Archive automated senders: bounce daemons, no-reply addresses, and
    bulk-mail senders (newsletters) that you never wrote to.

    Returns the number archived.
    """
    cur = conn.execute(
        f"""
        UPDATE contacts SET archived = 1,
            archived_at = COALESCE(archived_at, strftime('%s','now'))
        WHERE archived = 0 AND ({_bot_where()})
        """
    )
    n = cur.rowcount
    # Bulk senders: every message is inbound bulk mail (List-Unsubscribe /
    # Precedence: bulk) and you never replied → newsletter, not a client.
    cur = conn.execute(
        """
        UPDATE contacts SET archived = 1,
            archived_at = COALESCE(archived_at, strftime('%s','now'))
        WHERE archived = 0
          AND NOT EXISTS (SELECT 1 FROM messages
                          WHERE contact_email = contacts.email AND direction = 'out')
          AND EXISTS (SELECT 1 FROM messages WHERE contact_email = contacts.email)
          AND NOT EXISTS (SELECT 1 FROM messages
                          WHERE contact_email = contacts.email AND is_bulk = 0)
        """
    )
    n += cur.rowcount
    conn.commit()
    return n


def resurface_archived(conn: sqlite3.Connection) -> int:
    """Un-archive a contact if they've emailed you SINCE you archived them.

    'Archive' means hide-unless-they-write-again: only an inbound message newer
    than archived_at brings them back. Bot/bulk addresses are never resurfaced.
    Returns the number resurfaced.
    """
    cur = conn.execute(
        f"""
        UPDATE contacts SET archived = 0, archived_at = NULL
        WHERE archived = 1
          AND archived_at IS NOT NULL
          AND NOT ({_bot_where()})
          AND EXISTS (
              SELECT 1 FROM messages
              WHERE contact_email = contacts.email
                AND direction = 'in'
                AND is_bulk = 0
                AND ts > contacts.archived_at
          )
        """
    )
    conn.commit()
    return cur.rowcount


def apply_calls(conn: sqlite3.Connection, calls: dict) -> None:
    """Store next/last meeting times from the calendar onto matching contacts.

    `calls` maps email → {'next': ts|None, 'last': ts|None}. Only contacts that
    already exist are updated; unknown calendar attendees are ignored.
    """
    conn.execute("UPDATE contacts SET next_call_at = NULL, last_call_at = NULL")
    for email, slot in calls.items():
        conn.execute(
            "UPDATE contacts SET next_call_at = ?, last_call_at = ? WHERE email = ?",
            (slot.get("next"), slot.get("last"), email.lower()),
        )
    conn.commit()


# ── Reads (used by app) ──────────────────────────────────────────────────────

def status_for(row) -> str:
    """Derive a contact's display status — always the most actionable bucket.

    Priority (highest first):
    1. 'needs_reply' → their message is the latest, so you owe a reply. This
       wins even over a booked call: a fresh email is the thing to act on, so a
       scheduled-call contact who emails you moves back here automatically.
    2. 'scheduled'   → an upcoming meeting is booked (and you don't owe a reply).
    3. 'called'      → your last meeting with them already happened.
    4. 'waiting'     → you replied last AND they've replied to you before.
    5. 'no_reply'    → you emailed last but they've NEVER replied (cold outreach).
    """
    # 1. You owe them a reply — most urgent, overrides a scheduled/past call.
    if row["last_direction"] == "in" or row["status_override"] == "needs_reply":
        return "needs_reply"

    now = int(time.time())
    nxt = row["next_call_at"]
    lst = row["last_call_at"]
    # 2. Upcoming call booked.
    if nxt and nxt >= now:
        return "scheduled"
    # 3. A call already happened.
    if lst or (nxt and nxt < now):
        return "called"

    # 4 / 5. Reply status for the rest.
    if row["replied"]:
        return "waiting"
    return "no_reply"


def _follow_up(row):
    try:
        return row["follow_up_at"]
    except (KeyError, IndexError):
        return None


def bucket_for(row) -> str:
    """The section a contact is shown in, accounting for archive + snooze.

    - Archived: a booked/held call surfaces them into the call sections (this
      wins even over an unanswered email); otherwise they stay Archived.
    - Active: most-actionable wins — a new email (needs_reply) beats a booked
      call, which beats snooze, which beats plain reply status.
    - Snoozed: a future follow_up_at hides them from waiting/no_reply until
      due — but a fresh inbound email un-hides them immediately.
    """
    now = int(time.time())
    nxt = row["next_call_at"]
    lst = row["last_call_at"]
    hidden = row["call_hidden"]  # a duplicate attendee the user hid from call lists
    has_upcoming = bool(nxt and nxt >= now) and not hidden
    has_past = bool(lst or (nxt and nxt < now)) and not hidden

    if row["archived"]:
        if has_upcoming:
            return "scheduled"
        if has_past:
            return "called"
        return "archived"

    # active contacts
    if row["last_direction"] == "in" or row["status_override"] == "needs_reply":
        return "needs_reply"
    if has_upcoming:
        return "scheduled"
    fup = _follow_up(row)
    if fup and fup > now:
        return "snoozed"
    if has_past:
        return "called"
    if row["replied"]:
        return "waiting"
    return "no_reply"


def is_due(row, bucket: str, now: int | None = None) -> bool:
    """Whether this contact belongs in the Due-today panel: a follow-up
    reminder that has come due, or a needs-reply older than OVERDUE_DAYS."""
    now = now or int(time.time())
    if bucket in ("archived",):
        return False
    fup = _follow_up(row)
    if fup and fup <= now:
        return True
    if bucket == "needs_reply" and row["last_message_at"]:
        return (now - row["last_message_at"]) >= config.OVERDUE_DAYS * 86400
    return False


_TAB_BUCKET = {
    "needs": "needs_reply",
    "waiting": "waiting",
    "no_reply": "no_reply",
    "scheduled": "scheduled",
    "called": "called",
    "snoozed": "snoozed",
    "archived": "archived",
}


def _match_query(d: dict, q: str) -> bool:
    q = q.lower()
    hay = " ".join(filter(None, (
        d.get("name"), d.get("email"), d.get("company"),
        d.get("tags"), d.get("domain"), STAGE_LABELS.get(d.get("stage") or ""),
    ))).lower()
    return q in hay


def _fts_contacts(conn, q: str) -> set[str]:
    """Contacts whose message bodies match q (FTS5, quoted to stay literal)."""
    if not has_fts() or len(q) < 3:
        return set()
    safe = '"' + q.replace('"', '""') + '"'
    try:
        rows = conn.execute(
            "SELECT DISTINCT contact_email FROM messages_fts WHERE messages_fts MATCH ?",
            (safe,),
        ).fetchall()
        return {r["contact_email"] for r in rows}
    except sqlite3.OperationalError:
        return set()


def overview(tab: str = "all", q: str = "") -> tuple[list[dict], dict, list[dict]]:
    """One pass over contacts → (contacts for this tab, counts, due list).

    `q` filters the tab list (name/email/company/tags + full-text over message
    bodies) but counts always reflect the unfiltered totals.
    """
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM contacts ORDER BY last_message_at DESC"
    ).fetchall()
    # latest message snippet per contact (for the list preview line)
    snippets = {r["contact_email"]: r["snippet"] for r in conn.execute(
        """
        SELECT contact_email, snippet FROM (
            SELECT contact_email, snippet,
                   ROW_NUMBER() OVER (PARTITION BY contact_email ORDER BY ts DESC) rn
            FROM messages
        ) WHERE rn = 1
        """
    )}
    fts_hits = _fts_contacts(conn, q) if q else set()
    conn.close()

    now = int(time.time())
    want = _TAB_BUCKET.get(tab)
    counts = {k: 0 for k in
              ("all", "needs", "waiting", "no_reply", "scheduled", "called",
               "snoozed", "archived", "due")}
    out: list[dict] = []
    due: list[dict] = []

    for r in rows:
        b = bucket_for(r)
        d = dict(r)
        d["status"] = b
        d["due"] = is_due(r, b, now)
        d["last_snippet"] = snippets.get(r["email"], "")
        # counts (unfiltered)
        for tab_key, bucket in _TAB_BUCKET.items():
            if b == bucket:
                counts[tab_key] += 1
        if b != "archived" and not any(
            r["email"].lower().startswith(p.rstrip('%'))
            for p in _BOT_PATTERNS if p.endswith('%')
        ):
            counts["all"] += 1
        if d["due"]:
            counts["due"] += 1
            due.append(d)
        # tab membership
        if tab == "all":
            if b == "archived":
                continue
        elif b != want:
            continue
        if q and not (_match_query(d, q) or d["email"] in fts_hits):
            continue
        out.append(d)

    # call tabs read most naturally ordered by the meeting time;
    # needs-reply reads oldest-owed-first so the worst offenders surface.
    if tab == "scheduled":
        out.sort(key=lambda c: c.get("next_call_at") or 0)               # soonest first
    elif tab == "called":
        out.sort(key=lambda c: c.get("last_call_at") or 0, reverse=True)  # most recent first
    elif tab == "needs":
        out.sort(key=lambda c: c.get("last_message_at") or 0)             # oldest debt first
    elif tab == "snoozed":
        out.sort(key=lambda c: c.get("follow_up_at") or 0)                # next due first
    due.sort(key=lambda c: c.get("follow_up_at") or c.get("last_message_at") or 0)
    return out, counts, due


def list_contacts(tab: str = "all") -> list[dict]:
    """Back-compat wrapper (used by ai.py): contacts for a tab."""
    out, _, _ = overview(tab)
    return out


def counts() -> dict:
    """Back-compat wrapper: counts for the dashboard tab badges."""
    _, c, _ = overview("all")
    return c


def get_contact(email: str) -> dict | None:
    conn = get_conn()
    r = conn.execute("SELECT * FROM contacts WHERE email = ?", (email,)).fetchone()
    conn.close()
    if not r:
        return None
    d = dict(r)
    d["status"] = bucket_for(r)
    d["due"] = is_due(r, d["status"])
    return d


def get_conversation(email: str) -> list[dict]:
    """All messages in any thread this contact is part of, oldest first.

    Thread-based (not just messages filed under the contact) so the full
    back-and-forth shows even when a thread involves several people or a
    reply's recipient was parsed under a colleague. The message_contacts
    junction also pulls in threads where they were only CC'd.
    """
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT * FROM messages
        WHERE thread_id IN (
            SELECT thread_id FROM messages WHERE contact_email = :em
            UNION
            SELECT m.thread_id FROM messages m
            JOIN message_contacts mc ON mc.message_id = m.id
            WHERE mc.contact_email = :em
        )
        ORDER BY ts ASC
        """,
        {"em": email},
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def search_messages(q: str, limit: int = 20) -> list[dict]:
    """Full-text search over message bodies (for AI retrieval)."""
    if not q:
        return []
    conn = get_conn()
    rows = []
    if has_fts():
        safe = '"' + q.replace('"', '""') + '"'
        try:
            rows = conn.execute(
                "SELECT m.* FROM messages_fts f JOIN messages m ON m.id = f.msg_id "
                "WHERE messages_fts MATCH ? ORDER BY m.ts DESC LIMIT ?",
                (safe, limit),
            ).fetchall()
        except sqlite3.OperationalError:
            rows = []
    if not rows:
        like = f"%{q}%"
        rows = conn.execute(
            "SELECT * FROM messages WHERE body_text LIKE ? OR subject LIKE ? "
            "ORDER BY ts DESC LIMIT ?",
            (like, like, limit),
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Contact updates (user-owned fields) ──────────────────────────────────────

def set_call_hidden(email: str, hidden: bool) -> None:
    """Hide/show a contact in the call sections (for duplicate attendees)."""
    conn = get_conn()
    conn.execute(
        "UPDATE contacts SET call_hidden = ? WHERE email = ?",
        (1 if hidden else 0, email),
    )
    conn.commit()
    conn.close()


def set_follow_up(email: str, ts: int | None) -> None:
    """Set (or clear) the snooze / follow-up reminder time."""
    conn = get_conn()
    conn.execute("UPDATE contacts SET follow_up_at = ? WHERE email = ?", (ts, email))
    conn.commit()
    conn.close()


def set_profile(email: str, *, name=None, company=None, stage=None,
                priority=None, tags=None) -> None:
    """Hand-edit contact fields. Name/company edits set user_edited so sync
    never overwrites them again."""
    conn = get_conn()
    if name is not None or company is not None:
        conn.execute(
            "UPDATE contacts SET name = COALESCE(?, name), "
            "company = COALESCE(?, company), user_edited = 1 WHERE email = ?",
            (name, company, email),
        )
    if stage is not None:
        conn.execute("UPDATE contacts SET stage = ? WHERE email = ?",
                     (stage if stage in STAGES else "", email))
    if priority is not None:
        conn.execute("UPDATE contacts SET priority = ? WHERE email = ?",
                     (1 if priority else 0, email))
    if tags is not None:
        clean = ", ".join(t.strip() for t in tags.split(",") if t.strip())
        conn.execute("UPDATE contacts SET tags = ? WHERE email = ?", (clean, email))
    conn.commit()
    conn.close()


def set_call_owner(email: str, owner: str) -> None:
    conn = get_conn()
    conn.execute("UPDATE contacts SET call_owner = ? WHERE email = ?", (owner, email))
    conn.commit()
    conn.close()


def set_ai_summary(email: str, summary: str) -> None:
    conn = get_conn()
    conn.execute(
        "UPDATE contacts SET ai_summary = ?, ai_summary_at = ? WHERE email = ?",
        (summary, int(time.time()), email),
    )
    conn.commit()
    conn.close()


def set_notes(email: str, notes: str) -> None:
    conn = get_conn()
    conn.execute("UPDATE contacts SET notes = ? WHERE email = ?", (notes, email))
    conn.commit()
    conn.close()


def set_status(email: str, *, status_override=..., archived=...) -> None:
    """Update user-owned status fields. Pass only what you want to change."""
    conn = get_conn()
    if status_override is not ...:
        conn.execute(
            "UPDATE contacts SET status_override = ? WHERE email = ?",
            (status_override, email),
        )
    if archived is not ...:
        if archived:
            # stamp the time so only newer inbound mail can resurface them
            conn.execute(
                "UPDATE contacts SET archived = 1, "
                "archived_at = strftime('%s','now') WHERE email = ?",
                (email,),
            )
        else:
            conn.execute(
                "UPDATE contacts SET archived = 0, archived_at = NULL "
                "WHERE email = ?",
                (email,),
            )
    conn.commit()
    conn.close()


def merge_contact(source: str, target: str) -> bool:
    """Fold `source` into `target`: move messages/notes, record the alias so
    future syncs file mail under the surviving contact. Returns success."""
    if source == target:
        return False
    conn = get_conn()
    tgt = conn.execute("SELECT email FROM contacts WHERE email = ?", (target,)).fetchone()
    src = conn.execute("SELECT * FROM contacts WHERE email = ?", (source,)).fetchone()
    if not tgt or not src:
        conn.close()
        return False
    conn.execute("UPDATE messages SET contact_email = ? WHERE contact_email = ?",
                 (target, source))
    conn.execute("UPDATE meeting_notes SET contact_email = ? WHERE contact_email = ?",
                 (target, source))
    conn.execute("UPDATE OR IGNORE message_contacts SET contact_email = ? "
                 "WHERE contact_email = ?", (target, source))
    conn.execute("DELETE FROM message_contacts WHERE contact_email = ?", (source,))
    if src["notes"]:
        conn.execute(
            "UPDATE contacts SET notes = TRIM(notes || char(10) || ?) WHERE email = ?",
            (f"[merged from {source}] {src['notes']}", target),
        )
    if src["tags"]:
        conn.execute(
            "UPDATE contacts SET tags = TRIM(TRIM(tags) || ', ' || ?, ', ') "
            "WHERE email = ?", (src["tags"], target),
        )
    conn.execute(
        "INSERT OR REPLACE INTO contact_aliases (alias_email, primary_email) "
        "VALUES (?, ?)", (source, target),
    )
    conn.execute("DELETE FROM contacts WHERE email = ?", (source,))
    recompute_rollups(conn)
    conn.commit()
    conn.close()
    return True


# ── Meeting notes ────────────────────────────────────────────────────────────

def add_meeting_note(email: str, title: str, html: str, subtitle: str = "") -> None:
    conn = get_conn()
    conn.execute(
        "INSERT INTO meeting_notes (contact_email, title, subtitle, html, created_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (email, title or "Untitled note", subtitle, html, int(time.time())),
    )
    conn.commit()
    conn.close()


def get_meeting_notes(email: str) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM meeting_notes WHERE contact_email = ? "
        "ORDER BY created_at DESC",
        (email,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_meeting_note(note_id: int) -> None:
    conn = get_conn()
    conn.execute("DELETE FROM meeting_notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()


# ── AI chat history ──────────────────────────────────────────────────────────

def add_chat_message(role: str, text: str) -> None:
    conn = get_conn()
    conn.execute(
        "INSERT INTO chat_messages (role, text, created_at) VALUES (?, ?, ?)",
        (role, text, int(time.time())),
    )
    conn.commit()
    conn.close()


def get_chat_history(limit: int = 100) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT role, text, created_at FROM chat_messages "
        "ORDER BY id DESC LIMIT ?", (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]


def clear_chat_history() -> None:
    conn = get_conn()
    conn.execute("DELETE FROM chat_messages")
    conn.commit()
    conn.close()


# ── Stats ────────────────────────────────────────────────────────────────────

def compute_stats() -> dict:
    """Aggregate response/outreach stats for the Stats page."""
    conn = get_conn()

    # Your average reply lag: inbound message → your next outbound in the thread.
    you = conn.execute(
        """
        SELECT AVG(lag) AS avg_lag, COUNT(*) AS n FROM (
            SELECT (SELECT MIN(o.ts) FROM messages o
                    WHERE o.thread_id = i.thread_id
                      AND o.direction = 'out' AND o.ts > i.ts) - i.ts AS lag
            FROM messages i WHERE i.direction = 'in'
        ) WHERE lag IS NOT NULL AND lag > 0
        """
    ).fetchone()
    # Their average reply lag: your outbound → their next inbound.
    them = conn.execute(
        """
        SELECT AVG(lag) AS avg_lag, COUNT(*) AS n FROM (
            SELECT (SELECT MIN(i.ts) FROM messages i
                    WHERE i.thread_id = o.thread_id
                      AND i.direction = 'in' AND i.ts > o.ts) - o.ts AS lag
            FROM messages o WHERE o.direction = 'out'
        ) WHERE lag IS NOT NULL AND lag > 0
        """
    ).fetchone()
    # Outreach conversion: contacts you wrote first → did they ever reply (email or call)?
    # Don't filter archived=0: contacts you reached out to then archived still count
    # toward the denominator, and archived contacts with calls count as converted.
    _bot_c = _bot_where()
    conv = conn.execute(
        f"""
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN replied=1 OR last_call_at IS NOT NULL THEN 1 ELSE 0 END)
                   AS converted
        FROM contacts c
        WHERE NOT ({_bot_c})
          AND EXISTS (
              SELECT 1 FROM messages m WHERE m.contact_email = c.email
          ) AND (
              SELECT direction FROM messages m WHERE m.contact_email = c.email
              ORDER BY ts ASC LIMIT 1
          ) = 'out'
        """
    ).fetchone()
    # Weekly volume, last 12 weeks — exclude bounce/bot senders from inbound count.
    _bot_msg = _bot_col("contact_email")
    weeks = conn.execute(
        f"""
        SELECT strftime('%Y-%W', ts, 'unixepoch') AS wk,
               SUM(CASE WHEN direction='in'  AND NOT ({_bot_msg}) THEN 1 ELSE 0 END) AS n_in,
               SUM(CASE WHEN direction='out' THEN 1 ELSE 0 END) AS n_out
        FROM messages
        WHERE ts >= strftime('%s','now','-84 days')
        GROUP BY wk ORDER BY wk
        """
    ).fetchall()
    # Busiest companies.
    companies = conn.execute(
        """
        SELECT c.company, COUNT(m.id) AS n
        FROM contacts c JOIN messages m ON m.contact_email = c.email
        WHERE c.company != '' AND c.archived = 0
        GROUP BY c.company ORDER BY n DESC LIMIT 8
        """
    ).fetchall()
    # Stage funnel.
    stages = conn.execute(
        "SELECT stage, COUNT(*) AS n FROM contacts "
        "WHERE archived = 0 AND stage != '' GROUP BY stage"
    ).fetchall()
    conn.close()

    def days(sec):
        return round(sec / 86400, 1) if sec else None

    return {
        "your_avg_reply_days": days(you["avg_lag"]),
        "your_replies_measured": you["n"],
        "their_avg_reply_days": days(them["avg_lag"]),
        "their_replies_measured": them["n"],
        "outreach_total": conv["total"] or 0,
        "outreach_converted": conv["converted"] or 0,
        "outreach_rate": (round(100 * (conv["converted"] or 0) / conv["total"])
                          if conv["total"] else None),
        "weeks": [dict(w) for w in weeks],
        "companies": [dict(c) for c in companies],
        "stages": {s["stage"]: s["n"] for s in stages},
    }


# ── Backups ──────────────────────────────────────────────────────────────────

def backup_db() -> Path | None:
    """Copy the DB to data/backups/clients-YYYY-MM-DD.db (once per day),
    pruning to the BACKUP_KEEP most recent. Returns the path written, or None
    if today's backup already exists."""
    config.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    target = config.BACKUP_DIR / f"clients-{time.strftime('%Y-%m-%d')}.db"
    if target.exists():
        return None
    src = get_conn()
    dst = sqlite3.connect(str(target))
    with dst:
        src.backup(dst)
    dst.close()
    src.close()
    backups = sorted(config.BACKUP_DIR.glob("clients-*.db"))
    for old in backups[:-config.BACKUP_KEEP]:
        old.unlink()
    log.info("Backed up DB to %s", target.name)
    return target
