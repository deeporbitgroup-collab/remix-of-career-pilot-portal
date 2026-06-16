-- ============================================================================
-- CRM (Client Email Tracker) — native Supabase schema + ported business logic
--
-- Port of client_tracker/db.py into Postgres. The classification rules
-- (status_for / bucket_for / is_due) and the rollup/archive logic are
-- reproduced VERBATIM as SQL functions so behavior matches the original tool.
--
-- Timestamps are stored as unix seconds (bigint) exactly as the Python tool
-- did, so the ported comparisons against now() are identical.
--
-- Access: every CRM table is restricted by RLS to approved ADMIN profiles.
-- OAuth refresh tokens live in a separate secrets table that NO client role
-- can read (service-role/edge-functions only).
-- ============================================================================

-- ── Admin guard ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
  );
$$;

-- ── Tables ──────────────────────────────────────────────────────────────────

-- Connected Google mailboxes (one row per admin who connects Gmail).
CREATE TABLE public.crm_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email        TEXT UNIQUE NOT NULL,
  history_id   TEXT,                 -- Gmail History API bookmark (incremental sync)
  last_sync_at BIGINT,
  last_error   TEXT,
  created_at   BIGINT DEFAULT EXTRACT(epoch FROM now())::bigint
);

-- OAuth secrets, isolated from the rest so RLS can deny ALL client access.
CREATE TABLE public.crm_account_secrets (
  account_id    UUID PRIMARY KEY REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  updated_at    BIGINT DEFAULT EXTRACT(epoch FROM now())::bigint
);

CREATE TABLE public.crm_contacts (
  email           TEXT PRIMARY KEY,
  name            TEXT,
  company         TEXT,
  domain          TEXT,
  last_message_at BIGINT,
  last_direction  TEXT,                 -- 'in' | 'out'
  status_override TEXT,                 -- NULL | 'done' | 'needs_reply'
  archived        INTEGER DEFAULT 0,
  archived_at     BIGINT,
  replied         INTEGER DEFAULT 0,
  next_call_at    BIGINT,
  last_call_at    BIGINT,
  call_hidden     INTEGER DEFAULT 0,
  notes           TEXT DEFAULT '',
  follow_up_at    BIGINT,
  stage           TEXT DEFAULT '',
  priority        INTEGER DEFAULT 0,
  tags            TEXT DEFAULT '',
  user_edited     INTEGER DEFAULT 0,
  ai_summary      TEXT DEFAULT '',
  ai_summary_at   BIGINT,
  call_owner      TEXT DEFAULT ''
);

CREATE TABLE public.crm_threads (
  thread_id      TEXT PRIMARY KEY,
  contact_email  TEXT,
  subject        TEXT,
  last_ts        BIGINT,
  last_direction TEXT
);

CREATE TABLE public.crm_messages (
  id            TEXT PRIMARY KEY,       -- Gmail message id
  thread_id     TEXT,
  contact_email TEXT,
  from_email    TEXT,
  to_emails     TEXT,
  subject       TEXT,
  snippet       TEXT,
  body_text     TEXT,
  direction     TEXT,                   -- 'in' | 'out'
  ts            BIGINT,
  attachments   TEXT DEFAULT '',
  is_bulk       INTEGER DEFAULT 0
);

CREATE TABLE public.crm_message_contacts (
  message_id    TEXT,
  contact_email TEXT,
  PRIMARY KEY (message_id, contact_email)
);

CREATE TABLE public.crm_contact_aliases (
  alias_email   TEXT PRIMARY KEY,
  primary_email TEXT
);

CREATE TABLE public.crm_meeting_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email TEXT,
  title         TEXT,
  subtitle      TEXT,
  html          TEXT,
  created_at    BIGINT DEFAULT EXTRACT(epoch FROM now())::bigint
);

CREATE TABLE public.crm_chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role       TEXT,                      -- 'user' | 'model'
  text       TEXT,
  created_at BIGINT DEFAULT EXTRACT(epoch FROM now())::bigint
);

CREATE INDEX idx_crm_notes_contact   ON public.crm_meeting_notes(contact_email);
CREATE INDEX idx_crm_messages_contact ON public.crm_messages(contact_email);
CREATE INDEX idx_crm_messages_thread  ON public.crm_messages(thread_id);
CREATE INDEX idx_crm_messages_body_fts ON public.crm_messages
  USING gin (to_tsvector('simple', coalesce(subject,'') || ' ' || coalesce(body_text,'')));
CREATE INDEX idx_crm_threads_contact  ON public.crm_threads(contact_email);
CREATE INDEX idx_crm_mc_contact       ON public.crm_message_contacts(contact_email);

-- ── Ported logic: bot detection ─────────────────────────────────────────────
-- Mirrors _BOT_PATTERNS in db.py.
CREATE OR REPLACE FUNCTION public.crm_is_bot(_email TEXT)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _email LIKE 'postmaster%'  OR _email LIKE 'mailer-daemon%'
      OR _email LIKE 'mail-daemon%' OR _email LIKE 'no-reply%'
      OR _email LIKE 'noreply%'     OR _email LIKE 'no_reply%'
      OR _email LIKE 'donotreply%'  OR _email LIKE 'do-not-reply%'
      OR _email LIKE 'notifications@%' OR _email LIKE 'notification@%'
      OR _email LIKE 'newsletter%'  OR _email LIKE 'news@%'
      OR _email LIKE 'alerts@%'     OR _email LIKE 'alert@%'
      OR _email LIKE 'updates@%'    OR _email LIKE 'billing@%'
      OR _email LIKE 'receipts@%';
$$;

-- ── Ported logic: status_for (db.py) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_status_for(c public.crm_contacts, _now BIGINT)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- 1. You owe them a reply — overrides a scheduled/past call.
  IF c.last_direction = 'in' OR c.status_override = 'needs_reply' THEN
    RETURN 'needs_reply';
  END IF;
  -- 2. Upcoming call booked.
  IF c.next_call_at IS NOT NULL AND c.next_call_at >= _now THEN
    RETURN 'scheduled';
  END IF;
  -- 3. A call already happened.
  IF c.last_call_at IS NOT NULL OR (c.next_call_at IS NOT NULL AND c.next_call_at < _now) THEN
    RETURN 'called';
  END IF;
  -- 4 / 5. Reply status.
  IF c.replied = 1 THEN
    RETURN 'waiting';
  END IF;
  RETURN 'no_reply';
END;
$$;

-- ── Ported logic: bucket_for (db.py) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_bucket_for(c public.crm_contacts, _now BIGINT)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  has_upcoming boolean;
  has_past     boolean;
BEGIN
  has_upcoming := (c.next_call_at IS NOT NULL AND c.next_call_at >= _now) AND c.call_hidden = 0;
  has_past     := (c.last_call_at IS NOT NULL OR (c.next_call_at IS NOT NULL AND c.next_call_at < _now)) AND c.call_hidden = 0;

  IF c.archived = 1 THEN
    IF has_upcoming THEN RETURN 'scheduled'; END IF;
    IF has_past     THEN RETURN 'called';    END IF;
    RETURN 'archived';
  END IF;

  IF c.last_direction = 'in' OR c.status_override = 'needs_reply' THEN
    RETURN 'needs_reply';
  END IF;
  IF has_upcoming THEN RETURN 'scheduled'; END IF;
  IF c.follow_up_at IS NOT NULL AND c.follow_up_at > _now THEN RETURN 'snoozed'; END IF;
  IF has_past THEN RETURN 'called'; END IF;
  IF c.replied = 1 THEN RETURN 'waiting'; END IF;
  RETURN 'no_reply';
END;
$$;

-- ── Ported logic: is_due (db.py) — OVERDUE_DAYS defaults to 3 ────────────────
CREATE OR REPLACE FUNCTION public.crm_is_due(c public.crm_contacts, _bucket TEXT, _now BIGINT)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF _bucket = 'archived' THEN RETURN false; END IF;
  IF c.follow_up_at IS NOT NULL AND c.follow_up_at <= _now THEN RETURN true; END IF;
  IF _bucket = 'needs_reply' AND c.last_message_at IS NOT NULL THEN
    RETURN (_now - c.last_message_at) >= 3 * 86400;
  END IF;
  RETURN false;
END;
$$;

-- ── Enriched read view (status/due/snippet derived at read time) ─────────────
CREATE VIEW public.crm_contacts_enriched
WITH (security_invoker = on) AS
SELECT
  c.*,
  b.bucket AS status,
  public.crm_is_due(c, b.bucket, b.now) AS due,
  (SELECT m.snippet FROM public.crm_messages m
    WHERE m.contact_email = c.email ORDER BY m.ts DESC LIMIT 1) AS last_snippet
FROM public.crm_contacts c
CROSS JOIN LATERAL (
  SELECT EXTRACT(epoch FROM now())::bigint AS now
) t
CROSS JOIN LATERAL (
  SELECT public.crm_bucket_for(c, t.now) AS bucket, t.now AS now
) b;

-- ── Tab-count summary (mirrors overview() counts in db.py) ───────────────────
CREATE OR REPLACE FUNCTION public.crm_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH n AS (SELECT EXTRACT(epoch FROM now())::bigint AS now),
  enriched AS (
    SELECT c AS contact, public.crm_bucket_for(c, n.now) AS bucket, n.now AS now
    FROM public.crm_contacts c CROSS JOIN n
  )
  SELECT jsonb_build_object(
    'all',       count(*) FILTER (WHERE bucket <> 'archived' AND NOT public.crm_is_bot((contact).email)),
    'needs',     count(*) FILTER (WHERE bucket = 'needs_reply'),
    'waiting',   count(*) FILTER (WHERE bucket = 'waiting'),
    'no_reply',  count(*) FILTER (WHERE bucket = 'no_reply'),
    'scheduled', count(*) FILTER (WHERE bucket = 'scheduled'),
    'called',    count(*) FILTER (WHERE bucket = 'called'),
    'snoozed',   count(*) FILTER (WHERE bucket = 'snoozed'),
    'archived',  count(*) FILTER (WHERE bucket = 'archived'),
    'due',       count(*) FILTER (WHERE public.crm_is_due((contact), bucket, now))
  )
  FROM enriched;
$$;

-- ── Ported logic: recompute_rollups (db.py) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_recompute_rollups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.crm_threads;
  INSERT INTO public.crm_threads (thread_id, contact_email, subject, last_ts, last_direction)
  SELECT thread_id, contact_email, subject, ts, direction FROM (
    SELECT thread_id, contact_email, subject, ts, direction,
           ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY ts DESC) AS rn
    FROM public.crm_messages
  ) s WHERE rn = 1;

  UPDATE public.crm_contacts c SET
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
      FROM public.crm_messages
    ) x WHERE rn = 1
  ) s
  WHERE c.email = s.contact_email;
END;
$$;

-- ── Ported logic: auto_archive_bounces (db.py) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_auto_archive_bounces()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer := 0; m integer := 0;
BEGIN
  UPDATE public.crm_contacts SET archived = 1,
    archived_at = COALESCE(archived_at, EXTRACT(epoch FROM now())::bigint)
  WHERE archived = 0 AND public.crm_is_bot(email);
  GET DIAGNOSTICS n = ROW_COUNT;

  -- Bulk senders: only ever inbound bulk mail, never replied to → newsletter.
  UPDATE public.crm_contacts c SET archived = 1,
    archived_at = COALESCE(archived_at, EXTRACT(epoch FROM now())::bigint)
  WHERE archived = 0
    AND NOT EXISTS (SELECT 1 FROM public.crm_messages WHERE contact_email = c.email AND direction = 'out')
    AND EXISTS     (SELECT 1 FROM public.crm_messages WHERE contact_email = c.email)
    AND NOT EXISTS (SELECT 1 FROM public.crm_messages WHERE contact_email = c.email AND is_bulk = 0);
  GET DIAGNOSTICS m = ROW_COUNT;
  RETURN n + m;
END;
$$;

-- ── Ported logic: resurface_archived (db.py) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_resurface_archived()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer := 0;
BEGIN
  UPDATE public.crm_contacts c SET archived = 0, archived_at = NULL
  WHERE archived = 1
    AND archived_at IS NOT NULL
    AND NOT public.crm_is_bot(email)
    AND EXISTS (
      SELECT 1 FROM public.crm_messages
      WHERE contact_email = c.email AND direction = 'in' AND is_bulk = 0
        AND ts > c.archived_at
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ── Ported logic: apply_calls (db.py) — _calls is jsonb {email:{next,last}} ──
CREATE OR REPLACE FUNCTION public.crm_apply_calls(_calls jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE k text; v jsonb;
BEGIN
  UPDATE public.crm_contacts SET next_call_at = NULL, last_call_at = NULL;
  FOR k, v IN SELECT key, value FROM jsonb_each(_calls) LOOP
    UPDATE public.crm_contacts SET
      next_call_at = NULLIF(v->>'next','')::bigint,
      last_call_at = NULLIF(v->>'last','')::bigint
    WHERE email = lower(k);
  END LOOP;
END;
$$;

-- ── Ported logic: upsert_contact (db.py) — bulk version for sync ────────────
-- Inserts contacts, refreshing name/company WITHOUT clobbering hand-edited
-- (user_edited=1) values or other user-owned fields (notes/archived/etc.).
CREATE OR REPLACE FUNCTION public.crm_upsert_contacts(_rows jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  FOR r IN SELECT value FROM jsonb_array_elements(_rows) LOOP
    INSERT INTO public.crm_contacts (email, name, company, domain)
    VALUES (
      lower(r->>'email'),
      NULLIF(r->>'name', ''),
      NULLIF(r->>'company', ''),
      NULLIF(r->>'domain', '')
    )
    ON CONFLICT (email) DO UPDATE SET
      name = CASE WHEN crm_contacts.user_edited = 1 THEN crm_contacts.name
                  ELSE COALESCE(NULLIF(EXCLUDED.name, ''), crm_contacts.name) END,
      company = CASE WHEN crm_contacts.user_edited = 1 THEN crm_contacts.company
                     ELSE COALESCE(NULLIF(EXCLUDED.company, ''), crm_contacts.company) END,
      domain = COALESCE(NULLIF(EXCLUDED.domain, ''), crm_contacts.domain);
  END LOOP;
END;
$$;

-- ── Row Level Security: approved ADMINs only on all CRM data ─────────────────
ALTER TABLE public.crm_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_account_secrets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_threads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_message_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contact_aliases  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_meeting_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_chat_messages    ENABLE ROW LEVEL SECURITY;

-- Admin full access (the service role used by edge functions bypasses RLS).
CREATE POLICY crm_admin_all ON public.crm_accounts
  FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY crm_admin_all ON public.crm_contacts
  FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY crm_admin_all ON public.crm_threads
  FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY crm_admin_all ON public.crm_messages
  FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY crm_admin_all ON public.crm_message_contacts
  FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY crm_admin_all ON public.crm_contact_aliases
  FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY crm_admin_all ON public.crm_meeting_notes
  FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
CREATE POLICY crm_admin_all ON public.crm_chat_messages
  FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());

-- Secrets: NO client policy → only the service role (edge functions) can touch.
-- (RLS enabled with zero policies denies all non-service access.)

GRANT EXECUTE ON FUNCTION public.crm_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_is_admin() TO authenticated;
