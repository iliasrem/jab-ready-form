-- Add doses_per_vial column to vaccine_inventory table
ALTER TABLE public.vaccine_inventory 
ADD COLUMN doses_per_vial integer NOT NULL DEFAULT 7;

-- Update existing records to have the default value
UPDATE public.vaccine_inventory 
SET doses_per_vial = 7 
WHERE doses_per_vial IS NULL;