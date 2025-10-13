-- Mettre à jour les 35 dernières vaccinations pour la boîte numéro 2
WITH box2_info AS (
  SELECT lot_number, expiry_date 
  FROM vaccine_inventory 
  WHERE order_number = 2 
  LIMIT 1
),
last_35_vaccinations AS (
  SELECT id
  FROM vaccinations
  ORDER BY vaccination_date DESC, vaccination_time DESC
  LIMIT 35
)
UPDATE vaccinations
SET 
  lot_number = (SELECT lot_number FROM box2_info),
  expiry_date = (SELECT expiry_date FROM box2_info)
WHERE id IN (SELECT id FROM last_35_vaccinations)
  AND EXISTS (SELECT 1 FROM box2_info);

-- Mettre à jour toutes les autres vaccinations pour la boîte numéro 1
WITH box1_info AS (
  SELECT lot_number, expiry_date 
  FROM vaccine_inventory 
  WHERE order_number = 1 
  LIMIT 1
),
last_35_vaccinations AS (
  SELECT id
  FROM vaccinations
  ORDER BY vaccination_date DESC, vaccination_time DESC
  LIMIT 35
)
UPDATE vaccinations
SET 
  lot_number = (SELECT lot_number FROM box1_info),
  expiry_date = (SELECT expiry_date FROM box1_info)
WHERE id NOT IN (SELECT id FROM last_35_vaccinations)
  AND EXISTS (SELECT 1 FROM box1_info);

-- Mettre à jour les doses utilisées dans l'inventaire
UPDATE vaccine_inventory vi
SET doses_used = COALESCE(
  (SELECT COUNT(*) 
   FROM vaccinations v 
   WHERE v.lot_number = vi.lot_number),
  0
);