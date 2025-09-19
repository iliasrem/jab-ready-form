-- Add doses_lost column to vaccine_inventory table to track lost/wasted doses
ALTER TABLE public.vaccine_inventory 
ADD COLUMN doses_lost integer NOT NULL DEFAULT 0;