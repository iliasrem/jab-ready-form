DELETE FROM public.patients
WHERE birth_date > CURRENT_DATE - INTERVAL '40 years';