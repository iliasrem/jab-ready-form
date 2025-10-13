-- Corriger le comptage des doses utilisées en utilisant lot_number ET expiry_date
UPDATE vaccine_inventory vi
SET doses_used = COALESCE(
  (SELECT COUNT(*) 
   FROM vaccinations v 
   WHERE v.lot_number = vi.lot_number 
   AND v.expiry_date = vi.expiry_date),
  0
);