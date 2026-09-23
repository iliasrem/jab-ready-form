CREATE TABLE public.vaccine_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  reservation_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Brussels')::date),
  status text NOT NULL DEFAULT 'reserved',
  collected_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vaccine_holds_status_check CHECK (status IN ('reserved','collected'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccine_holds TO authenticated;
GRANT ALL ON public.vaccine_holds TO service_role;

ALTER TABLE public.vaccine_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view vaccine holds" ON public.vaccine_holds
  FOR SELECT TO authenticated USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Admins can create vaccine holds" ON public.vaccine_holds
  FOR INSERT TO authenticated WITH CHECK (public.get_current_user_role() = 'admin');
CREATE POLICY "Admins can update vaccine holds" ON public.vaccine_holds
  FOR UPDATE TO authenticated USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');
CREATE POLICY "Admins can delete vaccine holds" ON public.vaccine_holds
  FOR DELETE TO authenticated USING (public.get_current_user_role() = 'admin');

CREATE UNIQUE INDEX vaccine_holds_one_active_per_patient
  ON public.vaccine_holds (patient_id) WHERE status = 'reserved';
CREATE INDEX vaccine_holds_status_idx ON public.vaccine_holds (status);

CREATE TRIGGER update_vaccine_holds_updated_at
  BEFORE UPDATE ON public.vaccine_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.merge_duplicate_patients()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  groups_count integer := 0;
  deleted_count integer := 0;
BEGIN
  IF public.get_current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Acces reserve a l administrateur';
  END IF;

  CREATE TEMP TABLE dup_groups ON COMMIT DROP AS
  SELECT
    (array_agg(p.id ORDER BY p.created_at ASC))[1] AS keep_id,
    array_agg(p.id ORDER BY p.created_at ASC) AS all_ids
  FROM public.patients p
  GROUP BY lower(trim(p.first_name)), lower(trim(p.last_name)), p.birth_date
  HAVING count(*) > 1;

  GET DIAGNOSTICS groups_count = ROW_COUNT;

  UPDATE public.appointments a SET patient_id = g.keep_id
  FROM dup_groups g WHERE a.patient_id = ANY(g.all_ids) AND a.patient_id <> g.keep_id;

  UPDATE public.vaccinations v SET patient_id = g.keep_id
  FROM dup_groups g WHERE v.patient_id = ANY(g.all_ids) AND v.patient_id <> g.keep_id;

  UPDATE public.vaccine_reservations r SET patient_id = g.keep_id
  FROM dup_groups g WHERE r.patient_id = ANY(g.all_ids) AND r.patient_id <> g.keep_id;

  UPDATE public.makeup_appointments m SET patient_id = g.keep_id
  FROM dup_groups g WHERE m.patient_id = ANY(g.all_ids) AND m.patient_id <> g.keep_id;

  -- Reservations de vaccins (penurie) : eviter deux reservations actives pour le meme patient
  DELETE FROM public.vaccine_holds h
  USING dup_groups g
  WHERE h.patient_id = ANY(g.all_ids) AND h.patient_id <> g.keep_id
    AND h.status = 'reserved'
    AND EXISTS (
      SELECT 1 FROM public.vaccine_holds k
      WHERE k.status = 'reserved' AND k.id <> h.id
        AND (k.patient_id = g.keep_id OR (k.patient_id = ANY(g.all_ids) AND k.created_at < h.created_at))
    );

  UPDATE public.vaccine_holds h SET patient_id = g.keep_id
  FROM dup_groups g WHERE h.patient_id = ANY(g.all_ids) AND h.patient_id <> g.keep_id;

  DELETE FROM public.patients p
  USING dup_groups g
  WHERE p.id = ANY(g.all_ids) AND p.id <> g.keep_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN jsonb_build_object('duplicate_groups', groups_count, 'patients_deleted', deleted_count);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.merge_duplicate_patients() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_patients() TO authenticated;