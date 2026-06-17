-- Take Off package: fixed total €350 (not €250).
-- Internal component prices scaled proportionally to à-la-carte listino.

SET CONSTRAINTS ALL DEFERRED;

DO $$
DECLARE
  pkg_id       UUID;
  target_total NUMERIC := 350;
  listino_sum  NUMERIC;
  cur_sum      NUMERIC;
  diff         NUMERIC;
  comp         RECORD;
  anchor_id    UUID;
  anchor_qty   INTEGER;
BEGIN
  SELECT id INTO pkg_id
  FROM public.client_packages
  WHERE category = 'Take Off'
  ORDER BY sort_order
  LIMIT 1;

  IF pkg_id IS NULL THEN
    RAISE NOTICE 'Take Off package not found — skipping';
    RETURN;
  END IF;

  UPDATE public.client_packages
  SET price = target_total, updated_at = NOW()
  WHERE id = pkg_id;

  SELECT COALESCE(SUM(cs.price * cpc.quantity), 0)
  INTO listino_sum
  FROM public.client_package_components cpc
  JOIN public.client_services cs ON cs.id = cpc.service_id
  WHERE cpc.package_id = pkg_id
    AND cpc.is_addon = false;

  IF listino_sum > 0 THEN
    FOR comp IN
      SELECT cpc.id, cpc.quantity, cs.price AS list_price
      FROM public.client_package_components cpc
      JOIN public.client_services cs ON cs.id = cpc.service_id
      WHERE cpc.package_id = pkg_id
        AND cpc.is_addon = false
      ORDER BY cpc.sort_order
    LOOP
      UPDATE public.client_package_components
      SET internal_price = ROUND((comp.list_price * target_total / listino_sum)::numeric, 2)
      WHERE id = comp.id;
    END LOOP;
  ELSE
    UPDATE public.client_package_components cpc
    SET internal_price = CASE
      WHEN cpc.label ILIKE '%timeline%' THEN 131.26
      WHEN cpc.label ILIKE '%in-depth%' THEN 87.50
      WHEN cpc.label ILIKE '%office hour%' THEN 65.62
      ELSE cpc.internal_price
    END
    WHERE cpc.package_id = pkg_id AND cpc.is_addon = false;
  END IF;

  SELECT COALESCE(SUM(internal_price * quantity), 0)
  INTO cur_sum
  FROM public.client_package_components
  WHERE package_id = pkg_id AND is_addon = false;

  diff := target_total - cur_sum;

  SELECT id, quantity
  INTO anchor_id, anchor_qty
  FROM public.client_package_components
  WHERE package_id = pkg_id AND is_addon = false
  ORDER BY is_removable ASC, sort_order ASC
  LIMIT 1;

  IF anchor_id IS NOT NULL AND diff <> 0 THEN
    UPDATE public.client_package_components
    SET internal_price = internal_price + (diff / GREATEST(anchor_qty, 1))
    WHERE id = anchor_id;
  END IF;
END $$;

-- Idempotent RPC for re-applying the fix without re-running the whole migration.
CREATE OR REPLACE FUNCTION public.apply_takeoff_package_350()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pkg_id       UUID;
  target_total NUMERIC := 350;
  listino_sum  NUMERIC;
  cur_sum      NUMERIC;
  diff         NUMERIC;
  comp         RECORD;
  anchor_id    UUID;
  anchor_qty   INTEGER;
BEGIN
  SET CONSTRAINTS ALL DEFERRED;

  SELECT id INTO pkg_id
  FROM public.client_packages
  WHERE category = 'Take Off'
  ORDER BY sort_order
  LIMIT 1;

  IF pkg_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Take Off package not found');
  END IF;

  UPDATE public.client_packages
  SET price = target_total, updated_at = NOW()
  WHERE id = pkg_id;

  SELECT COALESCE(SUM(cs.price * cpc.quantity), 0)
  INTO listino_sum
  FROM public.client_package_components cpc
  JOIN public.client_services cs ON cs.id = cpc.service_id
  WHERE cpc.package_id = pkg_id
    AND cpc.is_addon = false;

  IF listino_sum > 0 THEN
    FOR comp IN
      SELECT cpc.id, cpc.quantity, cs.price AS list_price
      FROM public.client_package_components cpc
      JOIN public.client_services cs ON cs.id = cpc.service_id
      WHERE cpc.package_id = pkg_id
        AND cpc.is_addon = false
      ORDER BY cpc.sort_order
    LOOP
      UPDATE public.client_package_components
      SET internal_price = ROUND((comp.list_price * target_total / listino_sum)::numeric, 2)
      WHERE id = comp.id;
    END LOOP;
  ELSE
    UPDATE public.client_package_components cpc
    SET internal_price = CASE
      WHEN cpc.label ILIKE '%timeline%' THEN 131.26
      WHEN cpc.label ILIKE '%in-depth%' THEN 87.50
      WHEN cpc.label ILIKE '%office hour%' THEN 65.62
      ELSE cpc.internal_price
    END
    WHERE cpc.package_id = pkg_id AND cpc.is_addon = false;
  END IF;

  SELECT COALESCE(SUM(internal_price * quantity), 0)
  INTO cur_sum
  FROM public.client_package_components
  WHERE package_id = pkg_id AND is_addon = false;

  diff := target_total - cur_sum;

  SELECT id, quantity
  INTO anchor_id, anchor_qty
  FROM public.client_package_components
  WHERE package_id = pkg_id AND is_addon = false
  ORDER BY is_removable ASC, sort_order ASC
  LIMIT 1;

  IF anchor_id IS NOT NULL AND diff <> 0 THEN
    UPDATE public.client_package_components
    SET internal_price = internal_price + (diff / GREATEST(anchor_qty, 1))
    WHERE id = anchor_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'package_id', pkg_id,
    'price', target_total,
    'component_sum', cur_sum + diff
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_takeoff_package_350() TO anon, authenticated, service_role;
