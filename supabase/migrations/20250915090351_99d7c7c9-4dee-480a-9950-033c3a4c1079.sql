-- Nettoyer toutes les anciennes données de disponibilités pour permettre un nouveau départ
DELETE FROM specific_date_availability 
WHERE specific_date >= '2025-09-01' AND specific_date <= '2025-09-30';