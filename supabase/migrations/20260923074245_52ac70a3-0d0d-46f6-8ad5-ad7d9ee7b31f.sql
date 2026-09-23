ALTER TABLE public.vaccine_holds
  ADD COLUMN IF NOT EXISTS vaccine_id uuid REFERENCES public.vaccines(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_vaccine_holds_vaccine_id ON public.vaccine_holds(vaccine_id);