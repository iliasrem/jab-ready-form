ALTER TABLE public.vaccine_inventory
  ADD COLUMN IF NOT EXISTS opened_vials integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS discarded_vials integer[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.vaccine_inventory.opened_vials IS 'Numéros des flacons (1..vials_count) actuellement ouverts';
COMMENT ON COLUMN public.vaccine_inventory.discarded_vials IS 'Numéros des flacons éliminés (jetés)';