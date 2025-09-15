-- Create vaccine inventory table for managing vaccine vials
CREATE TABLE public.vaccine_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_number TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  reception_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vials_count INTEGER NOT NULL DEFAULT 10,
  vials_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vaccine_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view all vaccine inventory" 
ON public.vaccine_inventory 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can create vaccine inventory" 
ON public.vaccine_inventory 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update vaccine inventory" 
ON public.vaccine_inventory 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete vaccine inventory" 
ON public.vaccine_inventory 
FOR DELETE 
USING (get_current_user_role() = 'admin');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vaccine_inventory_updated_at
BEFORE UPDATE ON public.vaccine_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_vaccine_inventory_lot_number ON public.vaccine_inventory(lot_number);
CREATE INDEX idx_vaccine_inventory_expiry_date ON public.vaccine_inventory(expiry_date);