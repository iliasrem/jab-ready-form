ALTER TABLE public.vaccinations_archive ADD COLUMN IF NOT EXISTS inventory_id uuid, ADD COLUMN IF NOT EXISTS vial_number integer;
ALTER TABLE public.vaccine_inventory_archive ADD COLUMN IF NOT EXISTS opened_vials integer[] NOT NULL DEFAULT '{}', ADD COLUMN IF NOT EXISTS discarded_vials integer[] NOT NULL DEFAULT '{}', ADD COLUMN IF NOT EXISTS vial_opened_at jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.vaccinations_archive v SET inventory_id = (
  SELECT i.id FROM public.vaccine_inventory_archive i
  WHERE lower(i.lot_number) = lower(v.lot_number) AND i.reception_date <= v.vaccination_date
  ORDER BY i.reception_date DESC LIMIT 1)
WHERE v.inventory_id IS NULL;