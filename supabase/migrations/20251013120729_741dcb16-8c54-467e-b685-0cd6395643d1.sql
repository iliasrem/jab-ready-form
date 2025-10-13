-- Ajouter un champ pour gérer l'état ouvert/fermé des boîtes
ALTER TABLE vaccine_inventory 
ADD COLUMN is_open boolean NOT NULL DEFAULT false;

-- Mettre à jour les boîtes existantes qui ont des doses utilisées comme ouvertes
UPDATE vaccine_inventory 
SET is_open = true 
WHERE doses_used > 0;