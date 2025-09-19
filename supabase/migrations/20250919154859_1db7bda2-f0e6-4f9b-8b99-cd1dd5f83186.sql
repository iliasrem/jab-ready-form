-- Recréer les créneaux de la matinée du 26/09/2025
-- Créneaux de 9h00 à 12h00 par tranches de 15 minutes

INSERT INTO specific_date_availability (user_id, specific_date, start_time, end_time, is_available) VALUES
-- Utiliser l'ID utilisateur existant dans la base
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '09:00:00', '09:15:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '09:15:00', '09:30:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '09:30:00', '09:45:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '09:45:00', '10:00:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '10:00:00', '10:15:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '10:15:00', '10:30:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '10:30:00', '10:45:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '10:45:00', '11:00:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '11:00:00', '11:15:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '11:15:00', '11:30:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '11:30:00', '11:45:00', true),
((SELECT user_id FROM specific_date_availability LIMIT 1), '2025-09-26', '11:45:00', '12:00:00', true);