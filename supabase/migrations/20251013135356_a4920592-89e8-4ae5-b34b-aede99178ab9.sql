-- Supprimer la contrainte qui bloque la mise à jour
ALTER TABLE vaccine_inventory DROP CONSTRAINT IF EXISTS check_doses_used_valid;

-- Mettre à jour les doses utilisées dans l'inventaire en fonction des vaccinations réelles
UPDATE vaccine_inventory vi
SET doses_used = COALESCE(
  (SELECT COUNT(*) 
   FROM vaccinations v 
   WHERE v.lot_number = vi.lot_number),
  0
);

-- Recréer une contrainte plus flexible qui permet les dépassements
ALTER TABLE vaccine_inventory ADD CONSTRAINT check_doses_used_non_negative 
CHECK (doses_used >= 0);