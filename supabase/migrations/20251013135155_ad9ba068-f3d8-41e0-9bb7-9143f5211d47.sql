-- Mettre à jour toutes les vaccinations avant le 13/10/2025 pour les lier à la boîte numéro 1
UPDATE vaccinations
SET 
  lot_number = (SELECT lot_number FROM vaccine_inventory WHERE order_number = 1 LIMIT 1),
  expiry_date = (SELECT expiry_date FROM vaccine_inventory WHERE order_number = 1 LIMIT 1)
WHERE vaccination_date < '2025-10-13'
  AND EXISTS (SELECT 1 FROM vaccine_inventory WHERE order_number = 1);