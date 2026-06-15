#!/usr/bin/env python3
"""Google API wrapper: OAuth, Gmail thread fetching, Calendar event creation.

Read-only Gmail access — the tool never sends email or modifies your mailbox.
The only outbound action is creating a calendar event (which emails the invite).
"""
from __future__ import annotations  # keep `X | None` hints working on Python 3.7+

import base64
import datetime as dt
import email.utils
import logging
import re
import uuid
from email.mime.text import MIMEText
from pathlib import Path

import config
from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

BASE = Path(__file__).parent
CREDENTIALS_FILE = config.CREDENTIALS_FILE
TOKEN_FILE = config.TOKEN_FILE

log = logging.getLogger("tracker.gmail")

# gmail.compose lets the tool save AI-written replies as DRAFTS in your Gmail.
# It still cannot send mail. Tokens created before this scope was added keep
# working for sync; the drafts feature asks you to reconnect once.
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/calendar.events",
]


# ── Auth ─────────────────────────────────────────────────────────────────────

def has_credentials_file() -> bool:
    """Whether the user has dropped in their OAuth client secret."""
    return CREDENTIALS_FILE.exists()


def is_connected() -> bool:
    """Whether we have a usable (or refreshable) token."""
    if not TOKEN_FILE.exists():
        return False
    # No scopes arg: keep whatever the token was actually granted, so refresh
    # keeps working even after we add new scopes to SCOPES.
    creds = Credentials.from_authorized_user_file(str(TOKEN_FILE))
    return bool(creds and (creds.valid or (creds.expired and creds.refresh_token)))


def has_scope(scope_suffix: str) -> bool:
    """Whether the saved token was granted a scope (e.g. 'gmail.compose')."""
    if not TOKEN_FILE.exists():
        return False
    creds = Credentials.from_authorized_user_file(str(TOKEN_FILE))
    return any(scope_suffix in s for s in (creds.scopes or []))


def reset_token() -> None:
    """Disconnect: delete the saved token (e.g. to re-grant with new scopes)."""
    if TOKEN_FILE.exists():
        TOKEN_FILE.unlink()


class TokenExpired(RuntimeError):
    """The refresh token was revoked/expired — the user must reconnect."""


def get_credentials() -> Credentials:
    """Load saved token, refreshing or running the consent flow as needed.

    The consent flow (`run_local_server`) opens the browser and blocks until you
    approve — fine for a local single-user tool.
    """
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE))

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except RefreshError as e:
                raise TokenExpired(
                    "Google access expired or was revoked — reconnect Gmail "
                    "from the Connection page."
                ) from e
        else:
            if not CREDENTIALS_FILE.exists():
                raise FileNotFoundError(
                    "credentials.json not found — see README for Google Cloud setup."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_FILE), SCOPES
            )
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json())

    return creds


def gmail_service():
    return build("gmail", "v1", credentials=get_credentials())


def calendar_service():
    return build("calendar", "v3", credentials=get_credentials())


def get_my_address(service) -> str:
    """The authenticated user's email address."""
    return service.users().getProfile(userId="me").execute()["emailAddress"]


# ── Gmail parsing ────────────────────────────────────────────────────────────

def _header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def _decode_body(payload: dict) -> str:
    """Best-effort plain-text extraction from a Gmail message payload."""
    def walk(part) -> str:
        mime = part.get("mimeType", "")
        body = part.get("body", {})
        data = body.get("data")
        if mime == "text/plain" and data:
            return base64.urlsafe_b64decode(data).decode("utf-8", "replace")
        text = ""
        for sub in part.get("parts", []) or []:
            text += walk(sub)
        if not text and mime == "text/html" and data:
            html = base64.urlsafe_b64decode(data).decode("utf-8", "replace")
            text = re.sub(r"<[^>]+>", " ", html)  # crude HTML strip as fallback
        return text

    return walk(payload).strip()


def _parse_addr(value: str) -> tuple[str, str]:
    """('Jane Doe', 'jane@acme.com') from a raw header value."""
    name, addr = email.utils.parseaddr(value)
    return name.strip(), addr.strip().lower()


def _attachment_names(payload: dict) -> list[str]:
    """Filenames of real attachments in a message payload (recursive)."""
    names: list[str] = []

    def walk(part):
        fn = part.get("filename")
        if fn:
            names.append(fn)
        for sub in part.get("parts", []) or []:
            walk(sub)

    walk(payload)
    return names


def _is_bulk(headers: list[dict]) -> bool:
    """Newsletter / automated mail: List-Unsubscribe or Precedence bulk/list."""
    if _header(headers, "List-Unsubscribe"):
        return True
    prec = _header(headers, "Precedence").lower()
    return prec in ("bulk", "list", "junk")


# Detecting the start of a quoted previous message. Gmail's "On … wrote:" /
# "Il giorno … ha scritto:" attribution often WRAPS across 2–3 lines, so we
# match the lead-in word and confirm the closing verb appears within a small
# window. Covers EN/IT/FR/ES/DE.
_QUOTE_START = re.compile(r"^\s*(On|Il giorno|Le|El|Am|El día)\b", re.I)
_QUOTE_VERB = re.compile(
    r"(wrote:|ha scritto:|a écrit\s*:|escribió:|schrieb:)", re.I
)
# Single-line markers (Outlook-style headers and dividers).
_QUOTE_MARKERS = [
    re.compile(r"^\s*-{2,}\s*(Original Message|Messaggio originale)\s*-{2,}", re.I),
    re.compile(r"^\s*_{5,}\s*$"),                       # Outlook divider
    re.compile(r"^\s*(From|Da|De|Von):\s.+@.+", re.I),  # Outlook header block
]


def strip_quoted(text: str) -> str:
    """Return only the new content of a message, dropping the quoted reply chain.

    Cuts at the first quote marker, wrapped attribution line, or run of '>'
    quoted lines, then tidies up excess blank lines. Used both at fetch time and
    as a display filter so older already-stored messages clean up too.
    """
    if not text:
        return ""
    lines = text.splitlines()
    cut = len(lines)
    for i, line in enumerate(lines):
        if line.lstrip().startswith(">"):
            cut = i
            break
        if _QUOTE_START.match(line):
            window = " ".join(lines[i:i + 3])  # allow the verb to wrap onto later lines
            if _QUOTE_VERB.search(window):
                cut = i
                break
        if any(p.match(line) for p in _QUOTE_MARKERS):
            cut = i
            break
    kept = "\n".join(lines[:cut]).strip()
    return re.sub(r"\n{3,}", "\n\n", kept)


_FREE_DOMAINS = {
    "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com",
    "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "live.com",
}


def _company_from_domain(domain: str) -> str:
    if not domain or domain in _FREE_DOMAINS:
        return ""
    return domain.split(".")[0].capitalize()


def _thread_to_rows(full: dict, thread_id: str, my_addr: str) -> list[dict]:
    """Flatten one full thread payload into normalized message dicts.

    Each dict matches db.upsert_message's keys, plus contact metadata for
    upsert_contact. Direction is 'out' when From is you; the contact is the
    other party.
    """
    internal = {a.lower() for a in INTERNAL_EMAILS} | {my_addr}
    rows = []
    for msg in full.get("messages", []):
        payload = msg.get("payload", {})
        headers = payload.get("headers", [])
        from_name, from_addr = _parse_addr(_header(headers, "From"))
        to_raw = _header(headers, "To")
        cc_raw = _header(headers, "Cc")
        # getaddresses correctly handles commas inside quoted display names,
        # e.g.  "Bonizzi, Rosangela" <rosangela.bonizzi@cbreim.com>
        to_pairs = email.utils.getaddresses([to_raw]) if to_raw else []
        cc_pairs = email.utils.getaddresses([cc_raw]) if cc_raw else []
        to_addrs = [addr.strip().lower() for _, addr in to_pairs if addr.strip()]

        direction = "out" if from_addr == my_addr else "in"

        if direction == "out":
            contact_addr = to_addrs[0] if to_addrs else ""
            contact_name = to_pairs[0][0].strip() if to_pairs else ""
        else:
            contact_name, contact_addr = from_name, from_addr

        if not contact_addr or contact_addr == my_addr:
            continue  # skip notes-to-self / unparseable

        # Other external people on the message (extra To recipients + CC) get
        # linked via message_contacts so the thread shows on their page too.
        extras = []
        for nm, addr in (*to_pairs, *cc_pairs):
            a = addr.strip().lower()
            if a and a not in internal and a != contact_addr and "@" in a:
                extras.append((nm.strip(), a))

        ts = int(int(msg.get("internalDate", "0")) / 1000)  # Gmail uses epoch ms
        domain = contact_addr.split("@")[-1] if "@" in contact_addr else ""

        rows.append({
            "id": msg["id"],
            "thread_id": thread_id,
            "contact_email": contact_addr,
            "from_email": from_addr,
            "to_emails": ", ".join(to_addrs),
            "subject": _header(headers, "Subject"),
            "snippet": msg.get("snippet", ""),
            "body_text": strip_quoted(_decode_body(payload)),
            "direction": direction,
            "ts": ts,
            "attachments": ", ".join(_attachment_names(payload)),
            "is_bulk": 1 if _is_bulk(headers) else 0,
            "contact_name": contact_name,
            "contact_company": _company_from_domain(domain),
            "contact_domain": domain,
            "extra_contacts": extras,
        })
    return rows


def get_history_id(service) -> str:
    """The mailbox's current historyId — the bookmark for incremental sync."""
    return service.users().getProfile(userId="me").execute()["historyId"]


def _fetch_full_threads(service, ids: list[str], my_addr: str,
                        progress=None) -> list[dict]:
    """Fetch full thread payloads in batched API calls (~40 per round-trip
    instead of one each), falling back to serial fetches on batch failure."""
    rows: list[dict] = []
    done = 0
    total = len(ids)
    BATCH = 40

    def consume(tid: str, full: dict | None):
        nonlocal done
        done += 1
        if progress:
            progress(done, total)
        if full:
            rows.extend(_thread_to_rows(full, tid, my_addr))

    for start in range(0, total, BATCH):
        chunk = ids[start:start + BATCH]
        results: dict[str, dict | None] = {}

        def cb(req_id, resp, exc):
            results[req_id] = None if exc else resp

        try:
            batch = service.new_batch_http_request(callback=cb)
            for tid in chunk:
                batch.add(
                    service.users().threads().get(userId="me", id=tid, format="full"),
                    request_id=tid,
                )
            batch.execute()
            for tid in chunk:
                consume(tid, results.get(tid))
        except Exception:
            log.exception("Batch fetch failed — falling back to serial for %d threads",
                          len(chunk))
            for tid in chunk:
                try:
                    full = service.users().threads().get(
                        userId="me", id=tid, format="full"
                    ).execute()
                except HttpError as e:
                    if e.resp.status == 404:  # thread deleted meanwhile
                        consume(tid, None)
                        continue
                    raise
                consume(tid, full)
    return rows


def fetch_threads(service, my_addr: str, max_threads: int = 200,
                  query: str | None = None, progress=None) -> list[dict]:
    """Full fetch: pull recent threads and flatten them into message dicts.

    `query` is an optional Gmail search string (e.g. 'newer_than:14d').
    """
    list_kwargs = {"userId": "me", "maxResults": min(max_threads, 500)}
    if query:
        list_kwargs["q"] = query
    ids: list[str] = []
    page = None
    while len(ids) < max_threads:
        if page:
            list_kwargs["pageToken"] = page
        resp = service.users().threads().list(**list_kwargs).execute()
        ids.extend(t["id"] for t in resp.get("threads", []))
        page = resp.get("nextPageToken")
        if not page:
            break
    return _fetch_full_threads(service, ids[:max_threads], my_addr, progress)


def fetch_changes(service, my_addr: str, start_history_id: str,
                  progress=None) -> tuple[list[dict], str | None, bool]:
    """Incremental fetch: only the threads that changed since start_history_id.

    Returns (rows, new_history_id, expired). When `expired` is True the saved
    history bookmark was too old (Gmail prunes history after ~a week of
    inactivity) and the caller must fall back to a full sync.
    """
    changed_threads: set[str] = set()
    new_history_id = start_history_id
    page_token = None

    try:
        while True:
            resp = service.users().history().list(
                userId="me", startHistoryId=start_history_id,
                historyTypes=["messageAdded"], pageToken=page_token,
            ).execute()
            for h in resp.get("history", []):
                for ma in h.get("messagesAdded", []):
                    tid = ma.get("message", {}).get("threadId")
                    if tid:
                        changed_threads.add(tid)
            new_history_id = resp.get("historyId", new_history_id)
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
    except HttpError as e:
        if e.resp.status == 404:        # history bookmark expired
            return [], None, True
        raise

    rows = _fetch_full_threads(service, list(changed_threads), my_addr, progress)
    return rows, new_history_id, False


# ── Drafts ───────────────────────────────────────────────────────────────────

def create_draft(to: str, subject: str, body_text: str,
                 thread_id: str | None = None) -> str:
    """Save a draft in the user's Gmail (never sends). Returns the draft id.

    Requires the gmail.compose scope — tokens granted before that scope was
    added raise HttpError 403, which the app turns into a 'reconnect' prompt.
    """
    service = gmail_service()
    mime = MIMEText(body_text, "plain", "utf-8")
    mime["To"] = to
    mime["Subject"] = subject
    raw = base64.urlsafe_b64encode(mime.as_bytes()).decode("ascii")
    message: dict = {"raw": raw}
    if thread_id:
        message["threadId"] = thread_id
    draft = service.users().drafts().create(
        userId="me", body={"message": message}
    ).execute()
    return draft.get("id", "")


# ── Calendar ─────────────────────────────────────────────────────────────────

# Teammates / internal addresses — see config.py (env-overridable).
ALWAYS_INVITE = config.ALWAYS_INVITE        # added to every invite the tool creates
INTERNAL_EMAILS = config.INTERNAL_EMAILS    # never treated as clients


def _event_start_ts(event: dict) -> int | None:
    """Unix seconds for an event's start (handles timed + all-day events)."""
    start = event.get("start", {})
    raw = start.get("dateTime") or start.get("date")
    if not raw:
        return None
    try:
        if "T" in raw:  # timed event, has tz offset (or Z)
            return int(dt.datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp())
        return int(dt.datetime.fromisoformat(raw).timestamp())  # all-day
    except ValueError:
        return None


def fetch_calendar_calls(exclude=None, past_days: int = 120,
                         future_days: int = 400) -> dict:
    """Map attendee email → {'next': ts|None, 'last': ts|None} from your calendar.

    'next' is the soonest upcoming meeting with that person; 'last' is their most
    recent past meeting. `exclude` skips your own / teammate addresses so only
    real clients get tagged.
    """
    svc = calendar_service()
    exclude = {e.lower() for e in (exclude or [])}
    now = dt.datetime.now(dt.timezone.utc)
    now_ts = int(now.timestamp())
    tmin = (now - dt.timedelta(days=past_days)).isoformat()
    tmax = (now + dt.timedelta(days=future_days)).isoformat()

    out: dict[str, dict] = {}
    page = None
    while True:
        resp = svc.events().list(
            calendarId="primary", timeMin=tmin, timeMax=tmax,
            singleEvents=True, orderBy="startTime", maxResults=250,
            pageToken=page,
        ).execute()
        for e in resp.get("items", []):
            ts = _event_start_ts(e)
            if ts is None:
                continue
            for a in e.get("attendees", []) or []:
                em = (a.get("email") or "").lower()
                if not em or em in exclude:
                    continue
                slot = out.setdefault(em, {"next": None, "last": None, "name": ""})
                if a.get("displayName") and not slot["name"]:
                    slot["name"] = a["displayName"]
                if ts >= now_ts:
                    if slot["next"] is None or ts < slot["next"]:
                        slot["next"] = ts
                else:
                    if slot["last"] is None or ts > slot["last"]:
                        slot["last"] = ts
        page = resp.get("nextPageToken")
        if not page:
            break
    return out


def create_event(title: str, start_iso: str, duration_min: int,
                 attendee_email: str, description: str = "",
                 timezone: str = config.TIMEZONE) -> dict:
    """Create a Google Meet event and email invites to everyone.

    Attendees = the client + your standing teammates (ALWAYS_INVITE). A Google
    Meet link is generated and attached automatically.

    start_iso: 'YYYY-MM-DDTHH:MM' (local). Returns a dict with the event link,
    Meet link, start time, and who was emailed.
    """
    service = calendar_service()
    start = dt.datetime.fromisoformat(start_iso)
    end = start + dt.timedelta(minutes=duration_min)

    # client first, then teammates, de-duplicated (case-insensitive)
    attendees, seen = [], set()
    for addr in [attendee_email, *ALWAYS_INVITE]:
        key = addr.lower()
        if key and key not in seen:
            attendees.append({"email": addr})
            seen.add(key)

    body = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start.isoformat(), "timeZone": timezone},
        "end": {"dateTime": end.isoformat(), "timeZone": timezone},
        "attendees": attendees,
        "reminders": {"useDefault": True},
        # request a Google Meet conference for this event
        "conferenceData": {
            "createRequest": {
                "requestId": uuid.uuid4().hex,
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
    }
    event = service.events().insert(
        calendarId="primary", body=body,
        sendUpdates="all", conferenceDataVersion=1,  # needed to create the Meet
    ).execute()
    return {
        "link": event.get("htmlLink", ""),
        "meet": event.get("hangoutLink", ""),
        "attendee": attendee_email,
        # day without leading zero, portably ('%-d' breaks on Windows)
        "start": f"{start.strftime('%a %b')} {start.day}, {start.year} · {start.strftime('%H:%M')}",
    }
