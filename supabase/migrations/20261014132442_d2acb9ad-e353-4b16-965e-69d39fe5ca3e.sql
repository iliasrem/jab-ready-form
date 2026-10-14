ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS inventory_id uuid REFERENCES public.vaccine_inventory(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS vial_number integer;
UPDATE public.vaccinations SET inventory_id='c6544c9f-4567-4aa9-879f-e7b140e783f1' WHERE lot_number='RL9727/01' AND vaccination_date BETWEEN '2026-10-01' AND '2026-10-12';
UPDATE public.vaccinations SET inventory_id='00c3febc-cdc2-4be6-b9c0-64ba7658127e', vial_number=1 WHERE lot_number='RL9727/01' AND vaccination_date='2026-10-13';
UPDATE public.vaccinations SET inventory_id='00c3febc-cdc2-4be6-b9c0-64ba7658127e', vial_number=2 WHERE lot_number='RL9727/01' AND vaccination_date='2026-10-14';
UPDATE public.vaccine_inventory SET doses_used=34 WHERE id='c6544c9f-4567-4aa9-879f-e7b140e783f1';
UPDATE public.vaccine_inventory SET doses_used=8 WHERE id='00c3febc-cdc2-4be6-b9c0-64ba7658127e';