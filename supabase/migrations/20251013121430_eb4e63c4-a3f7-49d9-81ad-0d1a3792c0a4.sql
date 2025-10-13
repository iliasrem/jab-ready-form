-- Modifier la table vaccine_inventory pour utiliser un statut au lieu d'un boolean
ALTER TABLE vaccine_inventory DROP COLUMN IF EXISTS is_open;
ALTER TABLE vaccine_inventory ADD COLUMN status text NOT NULL DEFAULT 'closed';

-- Ajouter une contrainte pour limiter les valeurs possibles
ALTER TABLE vaccine_inventory ADD CONSTRAINT vaccine_inventory_status_check 
  CHECK (status IN ('open', 'empty', 'closed'));

-- Mettre à jour les enregistrements existants pour avoir le statut 'open'
UPDATE vaccine_inventory SET status = 'open' WHERE status = 'closed';