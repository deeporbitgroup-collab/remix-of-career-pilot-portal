# 📬 Client Email Tracker

A local tool that connects to your Gmail (read-only), turns your correspondence
into per-client profiles, tracks **who owes whom a reply**, lets you read each
conversation in one place, and creates **Google Calendar invites** in two clicks.

Everything runs on your machine. Your data never leaves it.

> **Integrating this into another app/dashboard?** See **[INTEGRATION.md](INTEGRATION.md)** —
> a step-by-step guide written for an AI agent or engineer with access to the
> target codebase. All settings are env-overridable in **[config.py](config.py)**.
> The business logic is framework-agnostic; only `app.py` touches Flask.

---

## What it does

- **Auto-detects clients** — everyone you email with becomes a profile.
- **Reply tracking** — a thread is *Needs reply* when their message is the last
  one, *Waiting on them* when yours is. No manual bookkeeping.
- **Conversation view** — the full back-and-forth with each person, in order.
- **Calendar invites** — pick a time, click once; the event lands in your Google
  Calendar and the client gets a proper invite to accept.
- **Notes & archive** — private notes per client; archive the noise.

---

## One-time setup (~5 minutes)

Because this reads your real mailbox, **you** create the Google credentials so
only you can access it. This is free.

### 1. Create a Google Cloud project
Go to <https://console.cloud.google.com/> → project picker → **New Project**
(any name, e.g. "Client Tracker").

### 2. Enable the APIs
In **APIs & Services → Library**, search for and **Enable**:
- **Gmail API**
- **Google Calendar API**

### 3. Configure the OAuth consent screen
**APIs & Services → OAuth consent screen**:
- User type: **External** → Create
- Fill in app name + your email where required
- **Test users**: add your own Gmail address
- Save (you can leave it in "Testing" mode — no Google verification needed for
  personal use)

### 4. Create the credentials
**APIs & Services → Credentials → Create Credentials → OAuth client ID**:
- Application type: **Desktop app**
- Create, then **Download JSON**
- Save the file as **`client_tracker/credentials.json`** (exact name, in this
  folder)

---

## Run it

```bash
cd client_tracker
pip3 install -r requirements.txt
python3 app.py
```

Open <http://localhost:5001>.

1. **Connect Gmail** → a browser window opens; sign in and grant access.
   (You'll see an "unverified app" warning because it's your own private app —
   click *Advanced → Go to … (unsafe)*; it's your own credentials.)
2. **Sync Gmail** → pulls your recent threads and builds the client list.
3. Browse the **Needs reply / Waiting / All** tabs, open a client, and schedule
   meetings.

Re-run **Sync** any time to pull new mail (it's incremental and safe to repeat).

---

## Privacy & scope

- **Read-only Gmail** (`gmail.readonly`) — the tool never sends email or modifies
  your mailbox.
- **Calendar** (`calendar.events`) — used only when *you* create an invite.
- `credentials.json` and `token.json` are your private keys — they stay local and
  are gitignored. Delete `token.json` to disconnect.
- Data lives in `data/clients.db` (SQLite) on your machine.

---

## Files

| File | Purpose |
|------|---------|
| `app.py` | Flask routes + server |
| `gmail_client.py` | Google OAuth, Gmail fetch, Calendar create |
| `sync.py` | Background sync job |
| `db.py` | SQLite schema + queries |
| `templates/` | UI (Tailwind + Alpine) |
