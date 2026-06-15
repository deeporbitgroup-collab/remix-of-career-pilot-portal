#!/usr/bin/env python3
"""Pull Gmail threads and rebuild the local database.

Runs in a background thread (kicked off from app.py) so the UI can poll a
status dict for a progress spinner.
"""
from __future__ import annotations  # keep `X | None` hints working on Python 3.7+

import logging
import threading
import time

import config
import db
import gmail_client

log = logging.getLogger("tracker.sync")

# How often the background auto-sync runs (seconds) — see config.py.
AUTO_SYNC_INTERVAL = config.AUTO_SYNC_INTERVAL
AUTO_SYNC_QUERY = "newer_than:14d"  # status changes happen in recent threads

# Shared status dict, polled by GET /sync/status. Mirrors the background-job
# pattern used in the VC Matcher webapp (webapp/app.py).
_lock = threading.Lock()
status: dict = {
    "running": False,
    "done": False,
    "error": None,
    "phase": "",
    "fetched": 0,
    "total": 0,
    "contacts": 0,
    "last_synced": None,   # unix seconds of last successful sync
    "auto": False,         # whether the current run is an auto-sync
    "last_error": None,    # most recent failure message (manual or auto)
    "last_error_at": None,
    "failures": 0,         # consecutive failures (auto-sync included)
    "needs_reconnect": False,  # Google token expired/revoked
}


def _reset() -> None:
    status.update(running=True, done=False, error=None, phase="Connecting…",
                  fetched=0, total=0, contacts=0)


def configured_max_threads() -> int:
    """Sync depth: the Settings value (meta) wins over the config default."""
    try:
        return int(db.get_meta("sync_max_threads", config.SYNC_MAX_THREADS))
    except (TypeError, ValueError):
        return config.SYNC_MAX_THREADS


def run_sync(max_threads: int | None = None, query: str | None = None,
             force_full: bool = False) -> None:
    """Sync Gmail into the local DB, then recompute rollups.

    Uses Gmail's History API for a fast incremental update (only changed
    threads) when a saved history bookmark exists. Falls back to a full fetch
    on first run, when forced, or if the bookmark expired.
    """
    with _lock:
        if status["running"]:
            return
        _reset()

    try:
        db.init_db()
        if max_threads is None:
            max_threads = configured_max_threads()
        service = gmail_client.gmail_service()
        my_addr = gmail_client.get_my_address(service)
        db.set_meta("my_addr", my_addr)  # used to deep-link the right Gmail account

        def progress(done, total):
            status["fetched"] = done
            status["total"] = total

        last_hist = db.get_meta("last_history_id")
        incremental = bool(last_hist) and not force_full
        new_hist = None

        if incremental:
            status["phase"] = "Checking for new mail…"
            rows, new_hist, expired = gmail_client.fetch_changes(
                service, my_addr, last_hist, progress=progress
            )
            if expired:
                incremental = False  # bookmark too old → full resync below

        if not incremental:
            status["phase"] = "Fetching all threads…"
            rows = gmail_client.fetch_threads(
                service, my_addr, max_threads=max_threads, query=query,
                progress=progress,
            )
            new_hist = gmail_client.get_history_id(service)

        status["phase"] = "Saving to database…"
        aliases = db.get_aliases()  # merged contacts: file mail under the survivor
        conn = db.get_conn()
        seen_contacts = set()
        for r in rows:
            contact = aliases.get(r["contact_email"], r["contact_email"])
            db.upsert_message(conn, {
                "id": r["id"],
                "thread_id": r["thread_id"],
                "contact_email": contact,
                "from_email": r["from_email"],
                "to_emails": r["to_emails"],
                "subject": r["subject"],
                "snippet": r["snippet"],
                "body_text": r["body_text"],
                "direction": r["direction"],
                "ts": r["ts"],
                "attachments": r.get("attachments", ""),
                "is_bulk": r.get("is_bulk", 0),
            })
            db.upsert_contact(
                conn, contact, r["contact_name"],
                r["contact_company"], r["contact_domain"],
            )
            seen_contacts.add(contact)
            # CC'd / extra-recipient people: link the message so the thread
            # shows on their page too (without stealing primary attribution).
            for _name, extra in r.get("extra_contacts", []):
                db.link_message_contact(conn, r["id"],
                                        aliases.get(extra, extra))
        conn.commit()

        status["phase"] = "Computing reply status…"
        db.recompute_rollups(conn)
        db.resurface_archived(conn)    # bring back contacts who emailed since archiving
        db.auto_archive_bounces(conn)  # hide bounce daemons / no-reply / newsletters

        # tag contacts with upcoming/past calls from the calendar
        try:
            calls = gmail_client.fetch_calendar_calls(
                exclude=[my_addr, *gmail_client.INTERNAL_EMAILS]
            )
            # make sure people you have calls with exist as contacts, even if
            # you've never exchanged email with them
            for email, slot in calls.items():
                email = aliases.get(email, email)
                domain = email.split("@")[-1] if "@" in email else ""
                db.upsert_contact(
                    conn, email, slot.get("name", ""),
                    gmail_client._company_from_domain(domain), domain,
                )
            conn.commit()
            db.apply_calls(conn, calls)
        except Exception:
            log.exception("Calendar fetch failed (non-critical)")

        conn.close()

        if new_hist:
            db.set_meta("last_history_id", str(new_hist))  # bookmark for next time

        # Daily safety net: notes and meeting summaries exist nowhere else.
        try:
            db.backup_db()
        except Exception:
            log.exception("Backup failed (non-critical)")

        status["contacts"] = len(seen_contacts)
        status["phase"] = "Done"
        status["last_synced"] = int(time.time())
        status["last_error"] = None
        status["last_error_at"] = None
        status["failures"] = 0
        status["needs_reconnect"] = False
        log.info("Sync OK: %d rows across %d contacts", len(rows), len(seen_contacts))
    except Exception as e:  # surface the error to the UI
        log.exception("Sync failed")
        status["error"] = str(e)
        status["phase"] = "Error"
        status["last_error"] = str(e)
        status["last_error_at"] = int(time.time())
        status["failures"] += 1
        if isinstance(e, gmail_client.TokenExpired):
            status["needs_reconnect"] = True
    finally:
        status["running"] = False
        status["done"] = True


def start_sync(max_threads: int | None = None, force_full: bool = False) -> bool:
    """Launch run_sync in a daemon thread. Returns False if already running.

    Defaults to an incremental sync; pass force_full=True for a full rebuild.
    """
    with _lock:
        if status["running"]:
            return False
    threading.Thread(
        target=run_sync,
        kwargs={"max_threads": max_threads, "force_full": force_full},
        daemon=True,
    ).start()
    return True


# ── Background auto-sync ─────────────────────────────────────────────────────

_auto_thread: threading.Thread | None = None


def _auto_loop(interval: int) -> None:
    """Wake every `interval` seconds and refresh recent mail, but only once the
    user is connected and no manual sync is mid-flight."""
    while True:
        time.sleep(interval)
        try:
            if not gmail_client.is_connected():
                continue
            if status["running"]:
                continue
            if status["needs_reconnect"]:
                continue  # pointless until the user re-grants access
            status["auto"] = True
            run_sync()  # incremental — only fetches threads that changed
        except Exception:
            log.exception("Auto-sync loop error")
        finally:
            status["auto"] = False


def start_auto_sync(interval: int = AUTO_SYNC_INTERVAL) -> None:
    """Start the background auto-sync loop (idempotent)."""
    global _auto_thread
    if _auto_thread and _auto_thread.is_alive():
        return
    _auto_thread = threading.Thread(
        target=_auto_loop, args=(interval,), daemon=True
    )
    _auto_thread.start()
