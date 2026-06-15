#!/usr/bin/env python3
"""Client Email Tracker — Flask webapp.

Connects to your Gmail (read-only), groups correspondence into per-client
profiles, tracks who owes whom a reply, and creates Google Calendar invites.
Runs locally on port 5001 (bound to 127.0.0.1).
"""
from __future__ import annotations  # keep `X | None` hints working on Python 3.7+

import csv
import datetime as dt
import io
import logging
import os
import re
import secrets
from html import escape as html_escape
from html.parser import HTMLParser

from flask import (Flask, render_template, request, redirect, url_for,
                   jsonify, flash, session, abort, send_file, Response)
from markupsafe import Markup, escape
from googleapiclient.errors import HttpError

import config
import db
import sync
import gmail_client
import ai

# ── Logging (file + console; the app previously had none) ───────────────────
config.DATA_DIR.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    handlers=[logging.FileHandler(config.LOG_FILE, encoding="utf-8"),
              logging.StreamHandler()],
)
log = logging.getLogger("tracker.app")

app = Flask(__name__)
app.debug = config.DEBUG  # off by default; CT_DEBUG=1 to enable the reloader

db.init_db()

# Persistent random secret (was a hardcoded string) — sessions survive restarts.
_secret = db.get_meta("flask_secret_key")
if not _secret:
    _secret = secrets.token_hex(32)
    db.set_meta("flask_secret_key", _secret)
app.secret_key = _secret

# Background auto-sync. Guard against Flask's debug reloader starting it twice:
# in debug mode only the reloaded child process (WERKZEUG_RUN_MAIN=true) should
# run the scheduler.
if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
    sync.start_auto_sync()


# ── CSRF (any webpage could otherwise POST to localhost:5001) ────────────────

def _csrf_token() -> str:
    if "csrf" not in session:
        session["csrf"] = secrets.token_hex(16)
    return session["csrf"]


@app.before_request
def _csrf_protect():
    if request.method == "POST":
        sent = (request.form.get("csrf_token")
                or request.headers.get("X-CSRF-Token", ""))
        if not sent or sent != session.get("csrf"):
            abort(400, "CSRF token missing or invalid — reload the page.")


@app.context_processor
def _inject_globals():
    ctx = {
        "csrf": _csrf_token(),
        "stage_labels": db.STAGE_LABELS,
        "stages": db.STAGES,
        "always_invite": config.ALWAYS_INVITE,
        "default_timezone": config.TIMEZONE,
        "now_ts": int(dt.datetime.now().timestamp()),
        "profiles": config.PROFILES,
        "profile_names": {p["email"]: p["name"] for p in config.PROFILES},
    }
    import sys
    print(f"DEBUG: injecting {len(ctx)} context vars, profiles={ctx['profiles']}", file=sys.stderr)
    return ctx


# ── Template filters (format unix timestamps) ────────────────────────────────

@app.template_filter("ts_date")
def ts_date(ts):
    """e.g. 'Jun 4' — relative-ish short date for the list view."""
    if not ts:
        return ""
    d = dt.datetime.fromtimestamp(int(ts))
    now = dt.datetime.now()
    if d.date() == now.date():
        return d.strftime("%H:%M")
    # build the day without a leading zero portably ('%-d' breaks on Windows)
    if d.year == now.year:
        return f"{d.strftime('%b')} {d.day}"
    return f"{d.strftime('%b')} {d.day}, {d.year}"


@app.template_filter("ts_datetime")
def ts_datetime(ts):
    if not ts:
        return ""
    d = dt.datetime.fromtimestamp(int(ts))
    return f"{d.strftime('%b')} {d.day}, {d.year} · {d.strftime('%H:%M')}"


@app.template_filter("age_days")
def age_days(ts):
    """Whole days since a timestamp (for 'owed for Nd' chips)."""
    if not ts:
        return 0
    return max(0, int((dt.datetime.now().timestamp() - int(ts)) // 86400))


@app.template_filter("clean_body")
def clean_body(text):
    """Strip quoted reply-chains so each message bubble shows only new text."""
    return gmail_client.strip_quoted(text or "")


@app.template_filter("avatar_hue")
def avatar_hue(email):
    """Deterministic hue (0-359) per address so avatars are color-coded."""
    return sum(ord(c) for c in (email or "?")) * 37 % 360


_URL_RE = re.compile(r"(https?://\S+)")


@app.template_filter("autolink")
def autolink(text):
    """Render URLs in flash messages as clickable links (HTML-escaped)."""
    if not text:
        return ""
    parts = _URL_RE.split(str(text))
    out = []
    for i, part in enumerate(parts):
        if i % 2 == 1:  # a matched URL
            url = escape(part)
            out.append(
                f'<a href="{url}" target="_blank" rel="noopener" '
                f'style="text-decoration:underline;">View event ↗</a>'
            )
        else:
            out.append(str(escape(part)))
    return Markup("".join(out))


# ── HTML sanitizer for pasted rich notes ─────────────────────────────────────
# Whitelist parser (replaces the old regex sanitizer, which is bypassable):
# only known-safe tags survive, only http(s)/mailto hrefs, only layout-ish
# inline styles. Everything else is unwrapped or escaped.

_ALLOWED_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li",
                 "a", "br", "strong", "b", "em", "i", "u", "blockquote",
                 "span", "div"}
_VOID_TAGS = {"br"}
_DROP_CONTENT_TAGS = {"script", "style", "iframe", "object", "embed", "title"}
_ALLOWED_STYLE_PROPS = {"font-size", "font-weight", "font-style",
                        "text-decoration", "text-decoration-line",
                        "text-align", "margin-left", "padding-left",
                        "text-indent", "margin-top", "margin-bottom"}
_SAFE_HREF = re.compile(r"(?i)^\s*(https?:|mailto:)")
_STYLE_VALUE = re.compile(r"^[-#%.,'\"\w\s()]*$")  # no url(), no escapes needed


class _NoteSanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self._drop_depth = 0

    def _clean_attrs(self, tag, attrs) -> str:
        keep = []
        for k, v in attrs:
            k = (k or "").lower()
            v = v or ""
            if tag == "a" and k == "href" and _SAFE_HREF.match(v):
                keep.append(f'href="{html_escape(v, quote=True)}"')
            elif k == "style":
                props = []
                for decl in v.split(";"):
                    if ":" not in decl:
                        continue
                    prop, val = decl.split(":", 1)
                    prop, val = prop.strip().lower(), val.strip()
                    if prop in _ALLOWED_STYLE_PROPS and _STYLE_VALUE.match(val):
                        props.append(f"{prop}:{html_escape(val, quote=True)}")
                if props:
                    keep.append(f'style="{";".join(props)}"')
        return (" " + " ".join(keep)) if keep else ""

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in _DROP_CONTENT_TAGS:
            self._drop_depth += 1
            return
        if self._drop_depth or tag not in _ALLOWED_TAGS:
            return  # unwrap: keep children, drop the tag itself
        self.out.append(f"<{tag}{self._clean_attrs(tag, attrs)}>")

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        if tag in _ALLOWED_TAGS and not self._drop_depth:
            self.out.append(f"<{tag}{self._clean_attrs(tag, attrs)}>")

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in _DROP_CONTENT_TAGS:
            self._drop_depth = max(0, self._drop_depth - 1)
            return
        if self._drop_depth or tag not in _ALLOWED_TAGS or tag in _VOID_TAGS:
            return
        self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if not self._drop_depth:
            self.out.append(html_escape(data))


def sanitize_note_html(html: str) -> str:
    if not html:
        return ""
    p = _NoteSanitizer()
    p.feed(html)
    p.close()
    return "".join(p.out)


# ── Dashboard ────────────────────────────────────────────────────────────────

VALID_TABS = ("needs", "waiting", "no_reply", "scheduled", "called",
              "snoozed", "all", "archived")


@app.route("/")
def dashboard():
    if not gmail_client.is_connected():
        return redirect(url_for("connect"))
    tab = request.args.get("tab", "needs")
    if tab not in VALID_TABS:
        tab = "needs"
    q = request.args.get("q", "").strip()
    contacts, counts, due = db.overview(tab, q)
    return render_template(
        "dashboard.html",
        contacts=contacts, counts=counts, due=due, tab=tab, q=q,
        syncing=sync.status["running"],
        last_synced=sync.status["last_synced"],
        sync_error=sync.status["last_error"],
        needs_reconnect=sync.status["needs_reconnect"],
    )


@app.route("/partial/contacts")
def partial_contacts():
    """The contact list + due panel as an HTML fragment, with fresh counts —
    lets the page refresh after a sync without a full reload."""
    tab = request.args.get("tab", "needs")
    if tab not in VALID_TABS:
        tab = "needs"
    q = request.args.get("q", "").strip()
    contacts, counts, due = db.overview(tab, q)
    html = render_template("_contact_list.html",
                           contacts=contacts, due=due, tab=tab, q=q)
    return jsonify({"html": html, "counts": counts})


# ── Connect / OAuth / settings ───────────────────────────────────────────────

@app.route("/connect")
def connect():
    return render_template(
        "connect.html",
        has_credentials=gmail_client.has_credentials_file(),
        connected=gmail_client.is_connected(),
        has_compose=gmail_client.has_scope("gmail.compose"),
        sync_max_threads=sync.configured_max_threads(),
        needs_reconnect=sync.status["needs_reconnect"],
    )


@app.route("/auth", methods=["POST"])
def auth():
    """Run the OAuth consent flow (opens a browser window), then sync."""
    try:
        gmail_client.get_credentials()  # triggers run_local_server on first use
    except Exception as e:
        flash(f"Could not connect to Google: {e}")
        return redirect(url_for("connect"))
    sync.status["needs_reconnect"] = False
    sync.start_sync()
    return redirect(url_for("dashboard"))


@app.route("/connect/reset", methods=["POST"])
def connect_reset():
    """Forget the saved token so the next connect re-runs consent (used to
    grant newly added scopes like drafts)."""
    gmail_client.reset_token()
    flash("✓ Disconnected. Click Connect Gmail to sign in again.")
    return redirect(url_for("connect"))


@app.route("/settings", methods=["POST"])
def settings():
    try:
        n = max(10, min(2000, int(request.form.get("sync_max_threads", "200"))))
        db.set_meta("sync_max_threads", str(n))
        flash(f"✓ Sync depth set to {n} threads (used on full re-syncs).")
    except ValueError:
        flash("Sync depth must be a number.")
    return redirect(url_for("connect"))


# ── Sync ─────────────────────────────────────────────────────────────────────

@app.route("/sync", methods=["POST"])
def do_sync():
    force_full = request.form.get("full") == "1"
    started = sync.start_sync(force_full=force_full)
    if not started:
        flash("A sync is already running.")
    return redirect(url_for("dashboard"))


@app.route("/sync/status")
def sync_status():
    return jsonify(sync.status)


@app.route("/health")
def health():
    """Liveness/status endpoint."""
    try:
        db.get_meta("my_addr")
        db_ok = True
    except Exception:
        db_ok = False
    return jsonify({
        "ok": db_ok,
        "connected": gmail_client.is_connected(),
        "syncing": sync.status["running"],
        "last_synced": sync.status["last_synced"],
        "last_error": sync.status["last_error"],
    })


# ── AI chat ──────────────────────────────────────────────────────────────────

@app.route("/chat")
def chat_page():
    if not gmail_client.is_connected():
        return redirect(url_for("connect"))
    return render_template(
        "chat.html",
        configured=ai.is_configured(),
        model_choices=ai.MODEL_CHOICES,
        current_model=ai.get_model(),
        history=db.get_chat_history(),
    )


@app.route("/chat/key", methods=["POST"])
def chat_key():
    ai.set_key(request.form.get("key", ""))
    flash("✓ Gemini key saved." if ai.is_configured() else "Key was empty.")
    return redirect(url_for("chat_page"))


@app.route("/chat/model", methods=["POST"])
def chat_model():
    ai.set_model(request.form.get("model", ai.DEFAULT_MODEL))
    return redirect(url_for("chat_page"))


@app.route("/chat/send", methods=["POST"])
def chat_send():
    data = request.get_json(silent=True) or {}
    history = data.get("history", [])
    user_msg = next((m["text"] for m in reversed(history)
                     if m.get("role") == "user"), "")
    try:
        reply = ai.chat(history)
        if user_msg:
            db.add_chat_message("user", user_msg)
        db.add_chat_message("model", reply)
        return jsonify({"reply": reply})
    except Exception as e:
        log.exception("Chat failed")
        return jsonify({"error": str(e)}), 200


@app.route("/chat/clear", methods=["POST"])
def chat_clear():
    db.clear_chat_history()
    return redirect(url_for("chat_page"))


# ── Client profile ───────────────────────────────────────────────────────────

@app.route("/client/<path:email>")
def client(email):
    contact = db.get_contact(email)
    if not contact:
        flash("Unknown contact.")
        return redirect(url_for("dashboard"))
    _default = (dt.datetime.now() + dt.timedelta(days=1)).replace(
        hour=10, minute=0, second=0, microsecond=0)
    return render_template(
        "client.html",
        contact=contact,
        conversation=db.get_conversation(email),
        meeting_notes=db.get_meeting_notes(email),
        my_addr=db.get_meta("my_addr", ""),
        back_tab=request.args.get("tab", "needs"),
        has_compose=gmail_client.has_scope("gmail.compose"),
        ai_configured=ai.is_configured(),
        # sensible default for the schedule form: tomorrow at 10:00 local
        default_date=_default.strftime("%Y-%m-%d"),
        default_time=_default.strftime("%H:%M"),
    )


@app.route("/client/<path:email>/notes", methods=["POST"])
def save_notes(email):
    db.set_notes(email, request.form.get("notes", ""))
    return redirect(url_for("client", email=email))


@app.route("/client/<path:email>/profile", methods=["POST"])
def save_profile(email):
    db.set_profile(
        email,
        name=request.form.get("name", "").strip() or None,
        company=request.form.get("company", "").strip() or None,
        stage=request.form.get("stage", ""),
        priority=request.form.get("priority") == "1",
        tags=request.form.get("tags", ""),
    )
    owner = request.form.get("call_owner", "")
    if owner:
        db.set_call_owner(email, owner)
    flash("✓ Profile updated.")
    return redirect(url_for("client", email=email))


@app.route("/client/<path:email>/snooze", methods=["POST"])
def snooze(email):
    """Set / clear the follow-up reminder."""
    action = request.form.get("action", "")
    if action == "clear":
        db.set_follow_up(email, None)
        flash("✓ Follow-up cleared.")
    elif request.form.get("date"):
        d = dt.datetime.strptime(request.form["date"], "%Y-%m-%d").replace(hour=9)
        db.set_follow_up(email, int(d.timestamp()))
        flash(f"✓ Follow-up set for {d.strftime('%b')} {d.day}.")
    else:
        days = int(request.form.get("days", 3))
        ts = int((dt.datetime.now() + dt.timedelta(days=days))
                 .replace(hour=9, minute=0, second=0).timestamp())
        db.set_follow_up(email, ts)
        flash(f"✓ Snoozed — follow-up in {days} day(s) at 9:00.")
    return redirect(request.referrer or url_for("client", email=email))


@app.route("/client/<path:email>/merge", methods=["POST"])
def merge(email):
    target = request.form.get("target", "").strip().lower()
    if not target:
        flash("Enter the email address to merge into.")
        return redirect(url_for("client", email=email))
    if db.merge_contact(email, target):
        flash(f"✓ Merged {email} into {target}.")
        return redirect(url_for("client", email=target))
    flash(f"Could not merge: '{target}' is not an existing contact.")
    return redirect(url_for("client", email=email))


@app.route("/client/<path:email>/summarize", methods=["POST"])
def summarize(email):
    try:
        summary = ai.summarize_contact(email)
        db.set_ai_summary(email, summary)
        return jsonify({"summary": summary})
    except Exception as e:
        log.exception("Summarize failed")
        return jsonify({"error": str(e)}), 200


@app.route("/client/<path:email>/ai_draft", methods=["POST"])
def ai_draft(email):
    data = request.get_json(silent=True) or {}
    try:
        draft = ai.draft_reply(email, data.get("instructions", ""))
        return jsonify({"draft": draft})
    except Exception as e:
        log.exception("AI draft failed")
        return jsonify({"error": str(e)}), 200


@app.route("/client/<path:email>/gmail_draft", methods=["POST"])
def gmail_draft(email):
    """Save a reply as a Gmail draft (requires the compose scope)."""
    body = request.form.get("body", "").strip()
    if not body:
        flash("Draft is empty — nothing saved.")
        return redirect(url_for("client", email=email))
    conv = db.get_conversation(email)
    subject = request.form.get("subject", "").strip()
    thread_id = None
    if conv:
        thread_id = conv[-1]["thread_id"]
        if not subject:
            last_subj = conv[-1]["subject"] or ""
            subject = last_subj if last_subj.lower().startswith("re:") \
                else f"Re: {last_subj}" if last_subj else "Follow-up"
    try:
        gmail_client.create_draft(email, subject or "Follow-up", body, thread_id)
        flash(f"✓ Draft saved in your Gmail (to {email}) — open Gmail to review and send.")
    except HttpError as e:
        if e.resp.status == 403:
            flash("Drafts need a one-time permission upgrade: go to Connection → "
                  "Reconnect, and approve again (adds 'manage drafts').")
        else:
            flash(f"Could not save draft: {e}")
    except Exception as e:
        flash(f"Could not save draft: {e}")
    return redirect(url_for("client", email=email))


@app.route("/client/<path:email>/status", methods=["POST"])
def update_status(email):
    action = request.form.get("action")
    if action == "done":
        db.set_status(email, status_override="done")
        return redirect(request.referrer or url_for("client", email=email))
    if action == "reopen":
        db.set_status(email, status_override=None)
        return redirect(request.referrer or url_for("client", email=email))
    if action == "archive":
        db.set_status(email, archived=True)
        flash(f"✓ Archived {email}. Find it under the Archived tab.")
        return redirect(url_for("dashboard"))  # contact leaves the active list
    if action == "unarchive":
        db.set_status(email, archived=False)
        flash(f"✓ Restored {email}.")
        return redirect(url_for("client", email=email))
    if action == "hide_call":
        db.set_call_hidden(email, True)
        flash(f"✓ Hid {email} from the call lists.")
        return redirect(request.referrer or url_for("dashboard"))
    if action == "show_call":
        db.set_call_hidden(email, False)
        flash(f"✓ {email} will show in call lists again.")
        return redirect(request.referrer or url_for("client", email=email))
    return redirect(url_for("dashboard"))


@app.route("/bulk/action", methods=["POST"])
def bulk_action():
    emails = request.form.getlist("emails")
    action = request.form.get("action", "archive")
    for e in emails:
        if action == "unarchive":
            db.set_status(e, archived=False)
        elif action == "hide_call":
            db.set_call_hidden(e, True)
        elif action == "snooze":
            ts = int((dt.datetime.now() + dt.timedelta(days=3))
                     .replace(hour=9, minute=0, second=0).timestamp())
            db.set_follow_up(e, ts)
        else:
            db.set_status(e, archived=True)
    verb = {"unarchive": "Unarchived", "hide_call": "Hid",
            "snooze": "Snoozed"}.get(action, "Archived")
    flash(f"✓ {verb} {len(emails)} client(s).")
    return redirect(request.referrer or url_for("dashboard"))


@app.route("/client/<path:email>/note", methods=["POST"])
def add_note(email):
    html = sanitize_note_html(request.form.get("html", ""))
    if html.strip():
        db.add_meeting_note(
            email, request.form.get("title", "").strip(), html,
            subtitle=request.form.get("subtitle", "").strip(),
        )
        flash("✓ Note saved.")
    else:
        flash("Nothing to save — paste a note first.")
    return redirect(url_for("client", email=email))


@app.route("/client/<path:email>/note/<int:note_id>/delete", methods=["POST"])
def delete_note(email, note_id):
    db.delete_meeting_note(note_id)
    return redirect(url_for("client", email=email))


@app.route("/client/<path:email>/invite", methods=["POST"])
def invite(email):
    owner = request.form.get("owner", "")
    try:
        result = gmail_client.create_event(
            title=request.form["title"],
            start_iso=f"{request.form['date']}T{request.form['time']}",
            duration_min=int(request.form.get("duration", 30)),
            attendee_email=email,
            description=request.form.get("description", ""),
            timezone=request.form.get("timezone", config.TIMEZONE),
        )
        if owner:
            db.set_call_owner(email, owner)
        flash(
            f"✓ Google Meet invite sent to {email} + your team "
            f"for {result['start']}. {result['link']}"
        )
    except Exception as e:
        flash(f"Could not create event: {e}")
    return redirect(url_for("client", email=email))


# ── Export / stats / backups ─────────────────────────────────────────────────

@app.route("/export.csv")
def export_csv():
    tab = request.args.get("tab", "all")
    if tab not in VALID_TABS:
        tab = "all"
    contacts, _, _ = db.overview(tab)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["email", "name", "company", "status", "stage", "priority",
                "tags", "last_message", "next_call", "last_call", "follow_up",
                "notes"])
    for c in contacts:
        def iso(ts):
            return (dt.datetime.fromtimestamp(ts).isoformat(sep=" ")
                    if ts else "")
        w.writerow([c["email"], c.get("name") or "", c.get("company") or "",
                    c["status"], c.get("stage") or "",
                    "high" if c.get("priority") else "",
                    c.get("tags") or "", iso(c.get("last_message_at")),
                    iso(c.get("next_call_at")), iso(c.get("last_call_at")),
                    iso(c.get("follow_up_at")), c.get("notes") or ""])
    return Response(
        buf.getvalue(), mimetype="text/csv",
        headers={"Content-Disposition":
                 f"attachment; filename=clients-{tab}-{dt.date.today()}.csv"})


@app.route("/stats")
def stats():
    if not gmail_client.is_connected():
        return redirect(url_for("connect"))
    _, counts, due = db.overview("all")
    return render_template("stats.html", stats=db.compute_stats(),
                           counts=counts, due_count=counts["due"])


@app.route("/backup/now", methods=["POST"])
def backup_now():
    path = db.backup_db()
    flash(f"✓ Backup written: {path.name}" if path
          else "Today's backup already exists.")
    return redirect(url_for("connect"))


@app.route("/backup/download")
def backup_download():
    backups = sorted(config.BACKUP_DIR.glob("clients-*.db"))
    if not backups:
        db.backup_db()
        backups = sorted(config.BACKUP_DIR.glob("clients-*.db"))
    if not backups:
        flash("No backup available yet.")
        return redirect(url_for("connect"))
    return send_file(backups[-1], as_attachment=True)


if __name__ == "__main__":
    app.run(host=config.HOST, port=config.PORT)
