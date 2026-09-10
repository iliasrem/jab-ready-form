-- Realtime
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.specific_date_availability REPLICA IDENTITY FULL;
ALTER TABLE public.blocked_dates REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.specific_date_availability; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_dates; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Créneaux publics : exclure jours bloqués et créneaux passés
CREATE OR REPLACE FUNCTION public.get_public_open_slots(p_start date, p_end date)
RETURNS TABLE(specific_date date, open_times time without time zone[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT sda.specific_date,
         array_agg(sda.start_time ORDER BY sda.start_time) AS open_times
  FROM public.specific_date_availability sda
  WHERE sda.is_available
    AND sda.specific_date BETWEEN p_start AND p_end
    AND (
      sda.specific_date > (now() AT TIME ZONE 'Europe/Brussels')::date
      OR (
        sda.specific_date = (now() AT TIME ZONE 'Europe/Brussels')::date
        AND sda.start_time >= (now() AT TIME ZONE 'Europe/Brussels')::time
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_dates bd
      WHERE bd.blocked_date = sda.specific_date
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments ap
      WHERE ap.appointment_date = sda.specific_date
        AND ap.appointment_time = sda.start_time
        AND ap.status IS DISTINCT FROM 'cancelled'::public.appointment_status
    )
  GROUP BY sda.specific_date;
$function$;

-- Sauvegarde : jours bloqués toujours fermés
CREATE OR REPLACE FUNCTION public.save_availability(p_days jsonb)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_day jsonb;
  v_date date;
  v_open time[];
  v_blocked boolean;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  FOR v_day IN SELECT value FROM jsonb_array_elements(COALESCE(p_days, '[]'::jsonb))
  LOOP
    v_date := (v_day->>'date')::date;

    SELECT EXISTS (
      SELECT 1 FROM public.blocked_dates bd
      WHERE bd.blocked_date = v_date AND bd.user_id = v_uid
    ) INTO v_blocked;

    SELECT COALESCE(array_agg(t::time), ARRAY[]::time[])
      INTO v_open
      FROM jsonb_array_elements_text(COALESCE(v_day->'open_times', '[]'::jsonb)) AS t;

    DELETE FROM public.specific_date_availability
    WHERE user_id = v_uid AND specific_date = v_date;

    INSERT INTO public.specific_date_availability
      (user_id, specific_date, start_time, end_time, is_available)
    SELECT v_uid, v_date, g, g + interval '15 minutes',
           CASE WHEN v_blocked THEN false ELSE (g = ANY (v_open)) END
    FROM unnest(public.day_grid_times(v_date)) AS g;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;