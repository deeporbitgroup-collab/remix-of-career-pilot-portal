#!/usr/bin/env python3
"""Gemini Flash chat with awareness of your client emails.

Uses Google's free Gemini API (no billing). The API key is stored locally in
the SQLite meta table. Each question is answered with a CONTEXT block built from
your local database: a compact list of all active clients, plus the full
conversation for any client mentioned in the question.
"""
from __future__ import annotations  # keep `X | None` hints working on Python 3.7+

import datetime as dt
import json
import re
import urllib.error
import urllib.request

import config
import db
import gmail_client

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
DEFAULT_MODEL = config.GEMINI_MODEL

# Models offered in the UI. 'free' ones work on the free tier; 'pro' ones need
# billing enabled on the API project (they 429 on the free tier).
MODEL_CHOICES = [
    ("gemini-2.5-flash", "Flash 2.5 — free, recommended", "free"),
    ("gemini-3.5-flash", "Flash 3.5 — free, newer", "free"),
    ("gemini-2.5-pro", "Pro 2.5 — needs billing", "pro"),
    ("gemini-3.1-pro-preview", "Pro 3.1 — needs billing", "pro"),
]

SYSTEM = (
    "You are an assistant embedded in a personal client-email tracker. You help "
    "the user understand and act on their email correspondence with clients. A "
    "snapshot of their contacts and conversations is provided below as CONTEXT. "
    "Statuses mean: 'needs_reply' = the client wrote last and the user owes a "
    "reply; 'waiting' = the user replied last and is waiting on the client; "
    "'no_reply' = cold outreach the client never answered. Answer concisely and "
    "practically. When asked to draft a reply, write it ready to send, matching "
    "the language of the thread (often Italian). If something isn't in the "
    "CONTEXT, say so rather than inventing it."
)


# ── API key ──────────────────────────────────────────────────────────────────

def get_key() -> str | None:
    # Env var wins (keeps the key out of the DB entirely if you prefer).
    return config.GEMINI_API_KEY or db.get_meta("gemini_api_key")


def is_configured() -> bool:
    return bool(get_key())


def set_key(key: str) -> None:
    db.set_meta("gemini_api_key", (key or "").strip())


def get_model() -> str:
    return db.get_meta("gemini_model", DEFAULT_MODEL)


def set_model(model: str) -> None:
    valid = {m for m, _, _ in MODEL_CHOICES}
    db.set_meta("gemini_model", model if model in valid else DEFAULT_MODEL)


# ── Context building ─────────────────────────────────────────────────────────

def _contact_tokens(contact: dict) -> set[str]:
    """Searchable tokens for a contact: full email, email local-part words,
    name words, and company. Used to detect mentions in a question."""
    toks: set[str] = set()
    email = (contact.get("email") or "").lower()
    if email:
        toks.add(email)
        for w in re.split(r"[^a-z0-9]+", email.split("@")[0]):
            if len(w) >= 3:
                toks.add(w)
    for w in re.split(r"[^a-z0-9]+", (contact.get("name") or "").lower()):
        if len(w) >= 3:
            toks.add(w)
    company = (contact.get("company") or "").lower()
    if len(company) >= 3:
        toks.add(company)
    return toks


def _mentioned(contact: dict, msg_lower: str) -> bool:
    """Whether the user's message references this contact (by name word, email
    local-part, or company)."""
    return any(t in msg_lower for t in _contact_tokens(contact))


def _conversation_block(email: str, label: str = "FULL CONVERSATION WITH") -> list[str]:
    conv = db.get_conversation(email)
    lines = ["", f"=== {label} {email} ({len(conv)} messages) ==="]
    for m in conv:
        who = "You" if m["direction"] == "out" else email
        body = gmail_client.strip_quoted(m["body_text"] or "") or m["snippet"]
        when = (dt.datetime.fromtimestamp(m["ts"]).strftime("%Y-%m-%d %H:%M")
                if m["ts"] else "")
        lines.append(f"[{when}] {who}: {body}")
    return lines


def build_context(user_msg: str, max_threads: int = 5) -> str:
    """A compact snapshot of active clients + relevant full conversations.

    Conversations are chosen by (1) contacts mentioned in the question,
    (2) full-text search of message bodies for the question's keywords, and
    (3) when nothing matches, the most urgent contacts (due follow-ups and
    oldest unanswered emails) — so questions like 'who should I chase?' get
    real thread content instead of just the one-line list.
    """
    contacts, _, due = db.overview("all")
    lines = [
        f"Today: {dt.date.today().isoformat()}",
        f"Active clients: {len(contacts)}",
        "",
        "CLIENT LIST  — [status] last_activity | name <email> | company | stage | tags:",
    ]
    msg_lower = (user_msg or "").lower()
    mentioned: list[str] = []
    for c in contacts:
        last = (dt.datetime.fromtimestamp(c["last_message_at"]).strftime("%Y-%m-%d")
                if c["last_message_at"] else "—")
        extra = " | ".join(filter(None, (c.get("stage") or "", c.get("tags") or "")))
        flag = " DUE-FOLLOW-UP" if c.get("due") else ""
        lines.append(
            f"- [{c['status']}{flag}] {last} | {c.get('name') or ''} "
            f"<{c['email']}> | {c.get('company') or ''}"
            + (f" | {extra}" if extra else "")
        )
        if _mentioned(c, msg_lower):
            mentioned.append(c["email"])

    # 2. Full-text hits: words from the question found inside message bodies.
    if len(mentioned) < max_threads:
        words = [w for w in re.split(r"[^a-zA-Z0-9]+", msg_lower) if len(w) >= 4]
        for w in words[:6]:
            for m in db.search_messages(w, limit=5):
                em = m["contact_email"]
                if em not in mentioned:
                    mentioned.append(em)
                if len(mentioned) >= max_threads:
                    break
            if len(mentioned) >= max_threads:
                break

    # 3. Fallback: most urgent contacts so generic questions have substance.
    if not mentioned:
        urgent = [c["email"] for c in due]
        urgent += [c["email"] for c in contacts if c["status"] == "needs_reply"]
        seen: set[str] = set()
        for em in urgent:
            if em not in seen:
                mentioned.append(em)
                seen.add(em)
            if len(mentioned) >= 3:
                break

    for email in mentioned[:max_threads]:
        lines.extend(_conversation_block(email))

    return "\n".join(lines)


# ── Chat ─────────────────────────────────────────────────────────────────────

def _generate(system: str, contents: list[dict], temperature: float = 0.4) -> str:
    """Low-level Gemini call. The key travels in a header (never in the URL,
    where it could end up in logs)."""
    key = get_key()
    if not key:
        raise RuntimeError("No Gemini API key set.")

    body = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }

    model = get_model()
    req = urllib.request.Request(
        f"{API_BASE}/{model}:generateContent",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        try:
            msg = json.loads(detail).get("error", {}).get("message", detail)
        except Exception:
            msg = detail
        if e.code == 429 and "pro" in model.lower():
            raise RuntimeError(
                f"The {model} model has no free-tier quota — it needs billing "
                "enabled. Switch the model back to Flash (free) in the selector above."
            )
        raise RuntimeError(f"Gemini API error {e.code}: {msg[:300]}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Could not reach Gemini: {e.reason}")

    candidates = data.get("candidates", [])
    if not candidates:
        fb = data.get("promptFeedback", {})
        raise RuntimeError(f"No reply returned. {json.dumps(fb)[:200]}")
    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts).strip()
    return text or "(empty response)"


def chat(history: list[dict]) -> str:
    """Send the conversation to Gemini and return the model's reply text.

    `history` is a list of {role: 'user'|'model', text: str}. Context is built
    from the latest user message.
    """
    last_user = next((m["text"] for m in reversed(history) if m["role"] == "user"), "")
    context = build_context(last_user)
    contents = [
        {"role": ("user" if m["role"] == "user" else "model"),
         "parts": [{"text": m["text"]}]}
        for m in history if m.get("text")
    ]
    return _generate(SYSTEM + "\n\nCONTEXT:\n" + context, contents)


def summarize_contact(email: str) -> str:
    """On-demand relationship summary for one contact (cached by the caller).

    Returns a compact markdown blurb: who they are, where things stand, open
    action items / promised dates.
    """
    contact = db.get_contact(email)
    if not contact:
        raise RuntimeError("Unknown contact.")
    ctx = "\n".join([
        f"Today: {dt.date.today().isoformat()}",
        f"Contact: {contact.get('name') or ''} <{email}> "
        f"| company: {contact.get('company') or '—'} | status: {contact['status']}",
        *_conversation_block(email),
    ])
    system = (
        "You summarize one client relationship from email history. Reply in "
        "the language most used in the thread. Output exactly:\n"
        "1. Two sentences: who this is and where things stand.\n"
        "2. 'Action items:' — bullet list of open commitments WITH dates if "
        "mentioned (who owes what). If none, write 'Action items: none'.\n"
        "Be concrete; never invent facts not in the conversation."
    )
    return _generate(system, [{"role": "user",
                               "parts": [{"text": ctx}]}], temperature=0.2)


def draft_reply(email: str, instructions: str = "") -> str:
    """Draft a ready-to-send reply to this contact's latest thread."""
    contact = db.get_contact(email)
    if not contact:
        raise RuntimeError("Unknown contact.")
    ctx = "\n".join([
        f"Today: {dt.date.today().isoformat()}",
        f"Contact: {contact.get('name') or ''} <{email}>",
        *_conversation_block(email),
    ])
    system = (
        "Draft a reply email from the user to this contact, continuing the "
        "conversation naturally. Match the thread's language and tone. Output "
        "ONLY the email body — no subject line, no commentary, no placeholders "
        "like [Name] (use the real names from the thread)."
        + (f"\nUser's instructions: {instructions}" if instructions else "")
    )
    return _generate(system, [{"role": "user",
                               "parts": [{"text": ctx}]}], temperature=0.5)
