-- Create vaccines table
CREATE TABLE public.vaccines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vaccines table
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;

-- Vaccines can be viewed by everyone (public booking)
CREATE POLICY "Vaccines are viewable by everyone" 
ON public.vaccines 
FOR SELECT 
USING (is_available = true);

-- Only admins can manage vaccines
CREATE POLICY "Admins can manage vaccines" 
ON public.vaccines 
FOR ALL 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Create vaccine_reservations table
CREATE TABLE public.vaccine_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vaccine_id UUID NOT NULL REFERENCES public.vaccines(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_called BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vaccine_reservations table
ALTER TABLE public.vaccine_reservations ENABLE ROW LEVEL SECURITY;

-- Admins can view all vaccine reservations
CREATE POLICY "Admins can view all vaccine reservations" 
ON public.vaccine_reservations 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Admins can manage vaccine reservations
CREATE POLICY "Admins can manage vaccine reservations" 
ON public.vaccine_reservations 
FOR ALL 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Public can create vaccine reservations
CREATE POLICY "Public can create vaccine reservations" 
ON public.vaccine_reservations 
FOR INSERT 
WITH CHECK (true);

-- Add triggers for timestamp updates
CREATE TRIGGER update_vaccines_updated_at
BEFORE UPDATE ON public.vaccines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vaccine_reservations_updated_at
BEFORE UPDATE ON public.vaccine_reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample vaccines
INSERT INTO public.vaccines (name, description) VALUES 
('COVID-19', 'Vaccin contre la COVID-19'),
('Grippe saisonnière', 'Vaccin contre la grippe saisonnière'),
('Hépatite B', 'Vaccin contre l''hépatite B'),
('Tétanos', 'Vaccin contre le tétanos'),
('ROR', 'Vaccin Rougeole-Oreillons-Rubéole');