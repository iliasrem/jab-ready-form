-- Create table for flu vaccination earnings tracking
CREATE TABLE public.flu_vaccination_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  vaccine_count integer NOT NULL DEFAULT 0,
  price_per_vaccine numeric(10,2) NOT NULL DEFAULT 15.50,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flu_vaccination_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view flu earnings"
  ON public.flu_vaccination_earnings
  FOR SELECT
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert flu earnings"
  ON public.flu_vaccination_earnings
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update flu earnings"
  ON public.flu_vaccination_earnings
  FOR UPDATE
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete flu earnings"
  ON public.flu_vaccination_earnings
  FOR DELETE
  USING (get_current_user_role() = 'admin');

-- Trigger for updated_at
CREATE TRIGGER update_flu_vaccination_earnings_updated_at
  BEFORE UPDATE ON public.flu_vaccination_earnings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();