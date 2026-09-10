-- 1) Normaliser les fins de créneaux
UPDATE public.specific_date_availability
SET end_time = start_time + interval '15 minutes'
WHERE end_time = start_time;

-- 2) Supprimer les doublons (garder la ligne la plus récente)
DELETE FROM public.specific_date_availability a
USING public.specific_date_availability b
WHERE a.user_id = b.user_id
  AND a.specific_date = b.specific_date
  AND a.start_time = b.start_time
  AND (a.updated_at, a.created_at, a.id) < (b.updated_at, b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS specific_date_availability_unique_slot
  ON public.specific_date_availability (user_id, specific_date, start_time);

CREATE INDEX IF NOT EXISTS specific_date_availability_date_idx
  ON public.specific_date_availability (specific_date);

-- 3) Grille horaire officielle d'une journée
CREATE OR REPLACE FUNCTION public.day_grid_times(p_date date)
RETURNS time[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN EXTRACT(DOW FROM p_date) = 0 THEN ARRAY[]::time[]
    WHEN EXTRACT(DOW FROM p_date) = 6 THEN ARRAY[
      '09:00','09:15','09:30','09:45','10:00','10:15','10:30','10:45',
      '11:00','11:15','11:30','11:45']::time[]
    ELSE ARRAY[
      '09:00','09:15','09:30','09:45','10:00','10:15','10:30','10:45',
      '11:00','11:15','11:30','11:45','12:00','12:15',
      '14:00','14:15','14:30','14:45',
      '15:00','15:15','15:30','15:45','16:00','16:15','16:30','16:45','17:00']::time[]
  END;
$$;

-- 4) Lecture d'une plage complète (admin)
CREATE OR REPLACE FUNCTION public.get_availability_range(p_start date, p_end date)
RETURNS TABLE (
  specific_date date,
  open_times time[],
  reserved_times time[],
  is_blocked boolean,
  block_activity text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    d::date AS specific_date,
    COALESCE(av.times, ARRAY[]::time[]) AS open_times,
    COALESCE(rv.times, ARRAY[]::time[]) AS reserved_times,
    (bd.blocked_date IS NOT NULL) AS is_blocked,
    bd.activity AS block_activity
  FROM generate_series(p_start::timestamp, p_end::timestamp, interval '1 day') d
  LEFT JOIN (
    SELECT sda.specific_date AS dt,
           array_agg(sda.start_time ORDER BY sda.start_time) AS times
    FROM public.specific_date_availability sda
    WHERE sda.user_id = auth.uid()
      AND sda.is_available
      AND sda.specific_date BETWEEN p_start AND p_end
    GROUP BY sda.specific_date
  ) av ON av.dt = d::date
  LEFT JOIN (
    SELECT ap.appointment_date AS dt,
           array_agg(ap.appointment_time ORDER BY ap.appointment_time) AS times
    FROM public.appointments ap
    WHERE ap.appointment_date BETWEEN p_start AND p_end
      AND ap.status IS DISTINCT FROM 'cancelled'::public.appointment_status
    GROUP BY ap.appointment_date
  ) rv ON rv.dt = d::date
  LEFT JOIN public.blocked_dates bd
    ON bd.blocked_date = d::date AND bd.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_availability_range(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_availability_range(date, date) TO authenticated, service_role;

-- 5) Enregistrement des journées modifiées
CREATE OR REPLACE FUNCTION public.save_availability(p_days jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_day jsonb;
  v_date date;
  v_open time[];
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  FOR v_day IN SELECT value FROM jsonb_array_elements(COALESCE(p_days, '[]'::jsonb))
  LOOP
    v_date := (v_day->>'date')::date;

    SELECT COALESCE(array_agg(t::time), ARRAY[]::time[])
      INTO v_open
      FROM jsonb_array_elements_text(COALESCE(v_day->'open_times', '[]'::jsonb)) AS t;

    DELETE FROM public.specific_date_availability
    WHERE user_id = v_uid AND specific_date = v_date;

    INSERT INTO public.specific_date_availability
      (user_id, specific_date, start_time, end_time, is_available)
    SELECT v_uid, v_date, g, g + interval '15 minutes', (g = ANY (v_open))
    FROM unnest(public.day_grid_times(v_date)) AS g;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.save_availability(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_availability(jsonb) TO authenticated, service_role;

-- 6) Lecture publique des créneaux réellement libres (aucune donnée patient)
CREATE OR REPLACE FUNCTION public.get_public_open_slots(p_start date, p_end date)
RETURNS TABLE (
  specific_date date,
  open_times time[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sda.specific_date,
         array_agg(sda.start_time ORDER BY sda.start_time) AS open_times
  FROM public.specific_date_availability sda
  WHERE sda.is_available
    AND sda.specific_date BETWEEN p_start AND p_end
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments ap
      WHERE ap.appointment_date = sda.specific_date
        AND ap.appointment_time = sda.start_time
        AND ap.status IS DISTINCT FROM 'cancelled'::public.appointment_status
    )
  GROUP BY sda.specific_date;
$$;

REVOKE ALL ON FUNCTION public.get_public_open_slots(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_open_slots(date, date) TO anon, authenticated, service_role;