# CRM (native) — deployment & wiring guide

The CRM is now a **native part of the dashboard** (Supabase tables + edge
functions + React UI), not the embedded Flask app. It syncs in the Supabase
cloud on a schedule, so nothing needs to run on your PC.

The code is all in the repo and type-checked. These are the one-time steps to
make it live. Do them in order.

---

## 1. Google Cloud — OAuth **Web** client

The old tool used a *Desktop* OAuth client; a server flow needs a **Web** one.

1. [console.cloud.google.com](https://console.cloud.google.com/) → your project
   (or a new one) → **APIs & Services**.
2. **Enable APIs**: Gmail API, Google Calendar API.
3. **OAuth consent screen**: External, add yourself as a Test user (Testing mode
   is fine).
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   - **Authorized redirect URI**:
     `https://gqmmgyoviwhgqvzqbbja.supabase.co/functions/v1/crm-google-auth-callback`
   - Save the **Client ID** and **Client secret**.

---

## 2. Supabase — function secrets

Set these (Dashboard → Project Settings → Edge Functions → Secrets, or
`supabase secrets set`):

| Secret | Value |
|--------|-------|
| `GOOGLE_OAUTH_CLIENT_ID` | from step 1 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | from step 1 |
| `CRM_OAUTH_REDIRECT` | `https://gqmmgyoviwhgqvzqbbja.supabase.co/functions/v1/crm-google-auth-callback` |
| `CRM_APP_REDIRECT` | your dashboard admin URL, e.g. `https://app.careerpilot.it/app/admin` (local: `http://localhost:8080/app/admin`) |
| `CRM_STATE_SECRET` | any long random string |
| `CRM_CRON_SECRET` | any long random string (reused in step 5) |
| `GEMINI_API_KEY` | your Google AI Studio key (free tier OK) |
| `CRM_ALWAYS_INVITE` | *(optional)* `aandreaa@mit.edu,fassio.leone@gmail.com` |
| `CRM_INTERNAL_EMAILS` | *(optional)* same defaults as the Flask config |
| `CRM_TIMEZONE` | *(optional)* `Europe/Rome` |

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are provided by
the platform automatically.

---

## 3. Apply the migrations

```bash
supabase db push
```

Creates the `crm_*` tables, the ported classification logic, RLS (approved
ADMINs only), and the pg_cron schedule.

---

## 4. Deploy the edge functions

```bash
supabase functions deploy crm-google-auth-start
supabase functions deploy crm-google-auth-callback
supabase functions deploy crm-sync
supabase functions deploy crm-create-invite
supabase functions deploy crm-chat
```

---

## 5. Wire up the scheduled sync

The cron job reads its target URL + secret from a private table. Run once (SQL
editor), using the **same** `CRM_CRON_SECRET` you set in step 2:

```sql
insert into public.crm_private_config (key, value) values
  ('sync_url',    'https://gqmmgyoviwhgqvzqbbja.supabase.co/functions/v1/crm-sync'),
  ('cron_secret', '<your CRM_CRON_SECRET>')
on conflict (key) do update set value = excluded.value;
```

The job (`crm-sync-every-3min`) then fires every 3 minutes automatically.

---

## 6. Connect & go

1. Open the dashboard → **Admin → CRM → Connection → Connect Gmail**.
2. Approve Google access (you'll see the "unverified app" screen for your own
   app — Advanced → continue).
3. The first sync runs automatically; thereafter the cloud cron keeps it fresh.
   The **Clients**, **Ask AI**, and contact/conversation views work natively.

---

## Notes

- **Multi-mailbox**: each admin can connect their own Gmail; all contacts share
  one pipeline. Direction (in/out) is computed per the connected account.
- **Reconnect**: if Google access is revoked, the Connection tab shows
  "Access expired" — click Connect again.
- The reference Flask app stays in `crm/` for documentation; it's no longer used
  by the dashboard.
- AI provider is Gemini (swap the model via `CRM_GEMINI_MODEL`). To move to
  Claude later, only `supabase/functions/crm-chat/index.ts` changes.
