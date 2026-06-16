-- ── Merge one contact into another (port of db.merge_contact) ───────────────
CREATE OR REPLACE FUNCTION public.crm_merge_contacts(_source text, _target text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE src public.crm_contacts; has_target boolean;
BEGIN
  IF NOT public.crm_is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  _source := lower(_source); _target := lower(_target);
  IF _source = _target THEN RETURN false; END IF;
  SELECT EXISTS(SELECT 1 FROM public.crm_contacts WHERE email = _target) INTO has_target;
  SELECT * INTO src FROM public.crm_contacts WHERE email = _source;
  IF NOT has_target OR src.email IS NULL THEN RETURN false; END IF;

  UPDATE public.crm_messages       SET contact_email = _target WHERE contact_email = _source;
  UPDATE public.crm_meeting_notes  SET contact_email = _target WHERE contact_email = _source;
  DELETE FROM public.crm_message_contacts mc WHERE mc.contact_email = _source
     AND EXISTS (SELECT 1 FROM public.crm_message_contacts t
                 WHERE t.message_id = mc.message_id AND t.contact_email = _target);
  UPDATE public.crm_message_contacts SET contact_email = _target WHERE contact_email = _source;

  IF coalesce(src.notes,'') <> '' THEN
    UPDATE public.crm_contacts
       SET notes = trim(coalesce(notes,'') || E'\n' || '[merged from ' || _source || '] ' || src.notes)
     WHERE email = _target;
  END IF;
  IF coalesce(src.tags,'') <> '' THEN
    UPDATE public.crm_contacts
       SET tags = trim(both ', ' FROM trim(coalesce(tags,'')) || ', ' || src.tags)
     WHERE email = _target;
  END IF;

  INSERT INTO public.crm_contact_aliases (alias_email, primary_email)
  VALUES (_source, _target)
  ON CONFLICT (alias_email) DO UPDATE SET primary_email = EXCLUDED.primary_email;

  DELETE FROM public.crm_contacts WHERE email = _source;
  PERFORM public.crm_recompute_rollups();
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.crm_merge_contacts(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_merge_contacts(text, text) TO authenticated;

-- ── Pipeline stats (port of db.compute_stats); SECURITY INVOKER = RLS-gated ──
CREATE OR REPLACE FUNCTION public.crm_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH you AS (
    SELECT avg(lag) AS avg_lag, count(*) AS n FROM (
      SELECT (SELECT min(o.ts) FROM crm_messages o
               WHERE o.thread_id = i.thread_id AND o.direction='out' AND o.ts > i.ts) - i.ts AS lag
      FROM crm_messages i WHERE i.direction='in'
    ) s WHERE lag IS NOT NULL AND lag > 0
  ),
  them AS (
    SELECT avg(lag) AS avg_lag, count(*) AS n FROM (
      SELECT (SELECT min(i.ts) FROM crm_messages i
               WHERE i.thread_id = o.thread_id AND i.direction='in' AND i.ts > o.ts) - o.ts AS lag
      FROM crm_messages o WHERE o.direction='out'
    ) s WHERE lag IS NOT NULL AND lag > 0
  ),
  conv AS (
    SELECT count(*) AS total,
           sum(CASE WHEN c.replied=1 OR c.last_call_at IS NOT NULL THEN 1 ELSE 0 END) AS converted
    FROM crm_contacts c
    WHERE NOT crm_is_bot(c.email)
      AND EXISTS (SELECT 1 FROM crm_messages m WHERE m.contact_email = c.email)
      AND (SELECT direction FROM crm_messages m WHERE m.contact_email=c.email ORDER BY ts ASC LIMIT 1) = 'out'
  ),
  weeks AS (
    SELECT to_char(to_timestamp(ts), 'IYYY-IW') AS wk,
           sum(CASE WHEN direction='in'  AND NOT crm_is_bot(contact_email) THEN 1 ELSE 0 END) AS n_in,
           sum(CASE WHEN direction='out' THEN 1 ELSE 0 END) AS n_out
    FROM crm_messages WHERE ts >= extract(epoch FROM now() - interval '84 days')::bigint
    GROUP BY wk ORDER BY wk
  ),
  companies AS (
    SELECT c.company, count(m.id) AS n
    FROM crm_contacts c JOIN crm_messages m ON m.contact_email = c.email
    WHERE coalesce(c.company,'') <> '' AND c.archived = 0
    GROUP BY c.company ORDER BY n DESC LIMIT 8
  ),
  stages AS (
    SELECT stage, count(*) AS n FROM crm_contacts
    WHERE archived = 0 AND coalesce(stage,'') <> '' GROUP BY stage
  )
  SELECT jsonb_build_object(
    'your_avg_reply_days',   round((SELECT avg_lag FROM you)/86400.0, 1),
    'your_replies_measured', (SELECT n FROM you),
    'their_avg_reply_days',  round((SELECT avg_lag FROM them)/86400.0, 1),
    'their_replies_measured',(SELECT n FROM them),
    'outreach_total',        (SELECT total FROM conv),
    'outreach_converted',    (SELECT converted FROM conv),
    'outreach_rate',         CASE WHEN (SELECT total FROM conv) > 0
                               THEN round(100.0*(SELECT converted FROM conv)/(SELECT total FROM conv)) ELSE NULL END,
    'weeks',     coalesce((SELECT jsonb_agg(jsonb_build_object('wk',wk,'n_in',n_in,'n_out',n_out)) FROM weeks), '[]'::jsonb),
    'companies', coalesce((SELECT jsonb_agg(jsonb_build_object('company',company,'n',n)) FROM companies), '[]'::jsonb),
    'stages',    coalesce((SELECT jsonb_object_agg(stage, n) FROM stages), '{}'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.crm_stats() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_stats() FROM anon;
