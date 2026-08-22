CREATE TABLE public.season_archives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_label text NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.season_archives TO authenticated;
GRANT ALL ON public.season_archives TO service_role;
ALTER TABLE public.season_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view season archives" ON public.season_archives FOR SELECT TO authenticated USING (get_current_user_role() = 'admin'::text);

CREATE TABLE public.appointments_archive (
  id uuid NOT NULL,
  patient_id uuid,
  user_id uuid,
  appointment_date date,
  appointment_time time without time zone,
  services text[],
  status text,
  notes text,
  google_event_id text,
  confirmation_sent_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  season_label text NOT NULL,
  archived_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.appointments_archive TO authenticated;
GRANT ALL ON public.appointments_archive TO service_role;
ALTER TABLE public.appointments_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view appointments archive" ON public.appointments_archive FOR SELECT TO authenticated USING (get_current_user_role() = 'admin'::text);

CREATE TABLE public.vaccinations_archive (
  id uuid NOT NULL,
  patient_id uuid,
  vaccination_date date,
  vaccination_time time without time zone,
  lot_number text,
  expiry_date text,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  season_label text NOT NULL,
  archived_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vaccinations_archive TO authenticated;
GRANT ALL ON public.vaccinations_archive TO service_role;
ALTER TABLE public.vaccinations_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view vaccinations archive" ON public.vaccinations_archive FOR SELECT TO authenticated USING (get_current_user_role() = 'admin'::text);

CREATE TABLE public.makeup_appointments_archive (
  id uuid NOT NULL,
  patient_id uuid,
  appointment_date date,
  appointment_time time without time zone,
  status text,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  season_label text NOT NULL,
  archived_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.makeup_appointments_archive TO authenticated;
GRANT ALL ON public.makeup_appointments_archive TO service_role;
ALTER TABLE public.makeup_appointments_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view makeup appointments archive" ON public.makeup_appointments_archive FOR SELECT TO authenticated USING (get_current_user_role() = 'admin'::text);

CREATE TABLE public.vaccine_reservations_archive (
  id uuid NOT NULL,
  patient_id uuid,
  vaccine_id uuid,
  reservation_date date,
  is_called boolean,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  season_label text NOT NULL,
  archived_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vaccine_reservations_archive TO authenticated;
GRANT ALL ON public.vaccine_reservations_archive TO service_role;
ALTER TABLE public.vaccine_reservations_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view vaccine reservations archive" ON public.vaccine_reservations_archive FOR SELECT TO authenticated USING (get_current_user_role() = 'admin'::text);

CREATE TABLE public.vaccine_inventory_archive (
  id uuid NOT NULL,
  lot_number text,
  expiry_date text,
  reception_date date,
  vials_count integer,
  vials_used integer,
  doses_used integer,
  doses_per_vial integer,
  doses_lost integer,
  status text,
  order_number integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  season_label text NOT NULL,
  archived_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vaccine_inventory_archive TO authenticated;
GRANT ALL ON public.vaccine_inventory_archive TO service_role;
ALTER TABLE public.vaccine_inventory_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view vaccine inventory archive" ON public.vaccine_inventory_archive FOR SELECT TO authenticated USING (get_current_user_role() = 'admin'::text);

CREATE TABLE public.flu_vaccination_earnings_archive (
  id uuid NOT NULL,
  user_id uuid,
  vaccine_count integer,
  price_per_vaccine numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  season_label text NOT NULL,
  archived_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flu_vaccination_earnings_archive TO authenticated;
GRANT ALL ON public.flu_vaccination_earnings_archive TO service_role;
ALTER TABLE public.flu_vaccination_earnings_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view flu earnings archive" ON public.flu_vaccination_earnings_archive FOR SELECT TO authenticated USING (get_current_user_role() = 'admin'::text);