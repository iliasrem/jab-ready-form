-- Supprimer les données de test pour repartir à zéro
DELETE FROM specific_date_availability WHERE specific_date >= '2025-09-01' AND specific_date <= '2025-09-30';