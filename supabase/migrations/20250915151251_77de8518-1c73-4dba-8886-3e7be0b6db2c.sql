-- Add doses_used column to vaccine_inventory table
ALTER TABLE public.vaccine_inventory 
ADD COLUMN doses_used INTEGER NOT NULL DEFAULT 0;

-- Update existing records to calculate doses_used from vials_used
UPDATE public.vaccine_inventory 
SET doses_used = vials_used * 7;

-- Add constraint to ensure doses_used doesn't exceed total doses available
ALTER TABLE public.vaccine_inventory 
ADD CONSTRAINT check_doses_used_valid 
CHECK (doses_used >= 0 AND doses_used <= (vials_count * 7));