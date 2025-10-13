-- Créer une séquence pour le numéro d'ordre si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'vaccine_inventory_order_seq') THEN
    CREATE SEQUENCE vaccine_inventory_order_seq START 1;
  END IF;
END $$;

-- Attribuer des numéros d'ordre aux boîtes existantes basés sur leur date de réception
WITH ordered_inventory AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY reception_date ASC, created_at ASC) as rn
  FROM vaccine_inventory
)
UPDATE vaccine_inventory
SET order_number = ordered_inventory.rn
FROM ordered_inventory
WHERE vaccine_inventory.id = ordered_inventory.id;

-- Créer une fonction pour attribuer automatiquement le prochain numéro d'ordre
CREATE OR REPLACE FUNCTION set_vaccine_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := nextval('vaccine_inventory_order_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger pour attribuer automatiquement le numéro d'ordre
DROP TRIGGER IF EXISTS set_vaccine_order_number_trigger ON vaccine_inventory;
CREATE TRIGGER set_vaccine_order_number_trigger
  BEFORE INSERT ON vaccine_inventory
  FOR EACH ROW
  EXECUTE FUNCTION set_vaccine_order_number();

-- Synchroniser la séquence avec le maximum actuel
SELECT setval('vaccine_inventory_order_seq', COALESCE((SELECT MAX(order_number) FROM vaccine_inventory), 0) + 1, false);