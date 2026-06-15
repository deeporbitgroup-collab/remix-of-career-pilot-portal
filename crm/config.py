#!/usr/bin/env python3
"""Central configuration — all environment-overridable.

Every tunable lives here so the tool can be deployed/embedded without editing
source. Defaults reproduce the original local behavior. Override via env vars
(prefix CT_) in production.
"""
from __future__ import annotations  # keep `X | None` hints working on Python 3.7+

import os
from pathlib import Path


def _csv(name: str, default: list[str]) -> list[str]:
    v = os.environ.get(name)
    return [x.strip() for x in v.split(",") if x.strip()] if v else default


def _bool(name: str, default: bool) -> bool:
    v = os.environ.get(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


# ── Identity / teammates ─────────────────────────────────────────────────────
# Added to every calendar invite the tool creates:
ALWAYS_INVITE = _csv("CT_ALWAYS_INVITE",
                     ["aandreaa@mit.edu", "fassio.leone@gmail.com"])

# Profiles available for assigning scheduled calls.
PROFILES: list[dict] = [
    {"name": "Me (Andrea)",       "email": "aandreaa@mit.edu"},
    {"name": "Elisabetta Fabris", "email": "elisabettafabris.work@gmail.com"},
]
# Never treated as clients (excluded from call-section matching). Your own
# address is added on top of this at runtime.
INTERNAL_EMAILS = _csv("CT_INTERNAL_EMAILS",
                       ["aandreaa@mit.edu", "fassio.leone@gmail.com",
                        "elisabettafabris.work@gmail.com"])

# ── Calendar ─────────────────────────────────────────────────────────────────
TIMEZONE = os.environ.get("CT_TIMEZONE", "Europe/Rome")

# ── Sync ─────────────────────────────────────────────────────────────────────
AUTO_SYNC_INTERVAL = int(os.environ.get("CT_AUTO_SYNC_INTERVAL", "180"))  # seconds
SYNC_MAX_THREADS = int(os.environ.get("CT_SYNC_MAX_THREADS", "200"))

# A "needs reply" older than this many days counts as overdue (Due-today panel).
OVERDUE_DAYS = int(os.environ.get("CT_OVERDUE_DAYS", "3"))

# ── AI ───────────────────────────────────────────────────────────────────────
GEMINI_MODEL = os.environ.get("CT_GEMINI_MODEL", "gemini-2.5-flash")
# Optional: provide the key via env instead of the in-app settings form.
GEMINI_API_KEY = os.environ.get("CT_GEMINI_API_KEY", "")

# ── Server / storage ─────────────────────────────────────────────────────────
PORT = int(os.environ.get("CT_PORT", "5001"))
HOST = os.environ.get("CT_HOST", "127.0.0.1")   # never expose beyond localhost by default
DEBUG = _bool("CT_DEBUG", False)                # Werkzeug debugger off unless asked
BASE_DIR = Path(__file__).parent
DATA_DIR = Path(os.environ.get("CT_DATA_DIR", str(BASE_DIR / "data")))
LOG_FILE = Path(os.environ.get("CT_LOG_FILE", str(DATA_DIR / "tracker.log")))

# ── Backups ──────────────────────────────────────────────────────────────────
BACKUP_DIR = Path(os.environ.get("CT_BACKUP_DIR", str(DATA_DIR / "backups")))
BACKUP_KEEP = int(os.environ.get("CT_BACKUP_KEEP", "7"))  # daily copies to retain

# OAuth client secret + saved token (override paths for a server deployment):
CREDENTIALS_FILE = Path(os.environ.get("CT_CREDENTIALS_FILE",
                                       str(BASE_DIR / "credentials.json")))
TOKEN_FILE = Path(os.environ.get("CT_TOKEN_FILE", str(BASE_DIR / "token.json")))
