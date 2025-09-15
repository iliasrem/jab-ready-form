-- Create vaccinations table for tracking administered vaccines
CREATE TABLE public.vaccinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vaccination_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vaccination_time TIME NOT NULL DEFAULT CURRENT_TIME,
  lot_number TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view all vaccinations" 
ON public.vaccinations 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can create vaccinations" 
ON public.vaccinations 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update vaccinations" 
ON public.vaccinations 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete vaccinations" 
ON public.vaccinations 
FOR DELETE 
USING (get_current_user_role() = 'admin');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vaccinations_updated_at
BEFORE UPDATE ON public.vaccinations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_vaccinations_patient_id ON public.vaccinations(patient_id);
CREATE INDEX idx_vaccinations_date ON public.vaccinations(vaccination_date);
CREATE INDEX idx_vaccinations_lot_number ON public.vaccinations(lot_number);