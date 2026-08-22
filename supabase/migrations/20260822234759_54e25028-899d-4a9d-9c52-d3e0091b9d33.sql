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
  -- Réservé à l'administrateur
  IF public.get_current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Acces reserve a l administrateur';
  END IF;

  -- Groupes de doublons : meme nom, prenom (insensibles a la casse, espaces ignores) et meme date de naissance
  -- Les patients sans date de naissance sont exclus pour eviter de fusionner des homonymes
  CREATE TEMP TABLE dup_groups ON COMMIT DROP AS
  SELECT
    (array_agg(p.id ORDER BY p.created_at ASC))[1] AS keep_id,
    array_agg(p.id ORDER BY p.created_at ASC) AS all_ids
  FROM public.patients p
  WHERE p.birth_date IS NOT NULL
  GROUP BY lower(trim(p.first_name)), lower(trim(p.last_name)), p.birth_date
  HAVING count(*) > 1;

  GET DIAGNOSTICS groups_count = ROW_COUNT;

  -- Rattacher les rendez-vous des doublons au dossier conserve
  UPDATE public.appointments a
  SET patient_id = g.keep_id
  FROM dup_groups g
  WHERE a.patient_id = ANY(g.all_ids) AND a.patient_id <> g.keep_id;

  -- Rattacher les vaccinations
  UPDATE public.vaccinations v
  SET patient_id = g.keep_id
  FROM dup_groups g
  WHERE v.patient_id = ANY(g.all_ids) AND v.patient_id <> g.keep_id;

  -- Rattacher les reservations de vaccins
  UPDATE public.vaccine_reservations r
  SET patient_id = g.keep_id
  FROM dup_groups g
  WHERE r.patient_id = ANY(g.all_ids) AND r.patient_id <> g.keep_id;

  -- Rattacher les rendez-vous de rattrapage
  UPDATE public.makeup_appointments m
  SET patient_id = g.keep_id
  FROM dup_groups g
  WHERE m.patient_id = ANY(g.all_ids) AND m.patient_id <> g.keep_id;

  -- Supprimer les fiches en double (le dossier conserve est exclu)
  DELETE FROM public.patients p
  USING dup_groups g
  WHERE p.id = ANY(g.all_ids) AND p.id <> g.keep_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'duplicate_groups', groups_count,
    'patients_deleted', deleted_count
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.merge_duplicate_patients() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_patients() TO authenticated;