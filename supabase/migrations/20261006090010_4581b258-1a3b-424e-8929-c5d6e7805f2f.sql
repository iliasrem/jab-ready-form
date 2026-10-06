CREATE OR REPLACE FUNCTION public.merge_selected_patients(p_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_keep uuid; v_others uuid[]; v_deleted integer;
BEGIN
  IF public.get_current_user_role() <> 'admin' THEN RAISE EXCEPTION 'Acces reserve a l administrateur'; END IF;
  SELECT (array_agg(id ORDER BY created_at))[1] INTO v_keep FROM public.patients WHERE id = ANY(p_ids);
  IF v_keep IS NULL THEN RETURN jsonb_build_object('patients_deleted',0); END IF;
  v_others := array_remove(p_ids, v_keep);
  UPDATE public.patients k SET
    birth_date = COALESCE(k.birth_date, (SELECT birth_date FROM public.patients WHERE id = ANY(v_others) AND birth_date IS NOT NULL ORDER BY created_at LIMIT 1)),
    phone = COALESCE(NULLIF(k.phone,''), (SELECT phone FROM public.patients WHERE id = ANY(v_others) AND COALESCE(phone,'')<>'' ORDER BY created_at LIMIT 1)),
    email = COALESCE(NULLIF(k.email,''), (SELECT email FROM public.patients WHERE id = ANY(v_others) AND COALESCE(email,'')<>'' ORDER BY created_at LIMIT 1))
  WHERE k.id = v_keep;
  UPDATE public.appointments SET patient_id = v_keep WHERE patient_id = ANY(v_others);
  UPDATE public.vaccinations SET patient_id = v_keep WHERE patient_id = ANY(v_others);
  UPDATE public.vaccine_reservations SET patient_id = v_keep WHERE patient_id = ANY(v_others);
  UPDATE public.makeup_appointments SET patient_id = v_keep WHERE patient_id = ANY(v_others);
  DELETE FROM public.vaccine_holds h WHERE h.patient_id = ANY(v_others) AND h.status='reserved'
    AND EXISTS (SELECT 1 FROM public.vaccine_holds k WHERE k.status='reserved' AND k.id<>h.id AND (k.patient_id = v_keep OR (k.patient_id = ANY(v_others) AND k.created_at < h.created_at)));
  UPDATE public.vaccine_holds SET patient_id = v_keep WHERE patient_id = ANY(v_others);
  DELETE FROM public.patients WHERE id = ANY(v_others);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN jsonb_build_object('kept_id', v_keep, 'patients_deleted', v_deleted);
END; $$;
REVOKE EXECUTE ON FUNCTION public.merge_selected_patients(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_selected_patients(uuid[]) TO authenticated;