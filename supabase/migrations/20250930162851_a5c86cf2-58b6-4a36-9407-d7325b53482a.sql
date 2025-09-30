-- Table pour les rendez-vous maquillage
CREATE TABLE public.makeup_appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table pour les disponibilités maquillage (créneaux de 20 minutes)
CREATE TABLE public.makeup_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  specific_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.makeup_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makeup_availability ENABLE ROW LEVEL SECURITY;

-- Policies pour makeup_appointments
CREATE POLICY "Admins can view all makeup appointments"
  ON public.makeup_appointments FOR SELECT
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can create makeup appointments"
  ON public.makeup_appointments FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update makeup appointments"
  ON public.makeup_appointments FOR UPDATE
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete makeup appointments"
  ON public.makeup_appointments FOR DELETE
  USING (get_current_user_role() = 'admin');

-- Policies pour makeup_availability
CREATE POLICY "Users can view their own makeup availability"
  ON public.makeup_availability FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own makeup availability"
  ON public.makeup_availability FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own makeup availability"
  ON public.makeup_availability FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own makeup availability"
  ON public.makeup_availability FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view available makeup slots"
  ON public.makeup_availability FOR SELECT
  USING (is_available = true);

-- Trigger pour updated_at
CREATE TRIGGER update_makeup_appointments_updated_at
  BEFORE UPDATE ON public.makeup_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_makeup_availability_updated_at
  BEFORE UPDATE ON public.makeup_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();