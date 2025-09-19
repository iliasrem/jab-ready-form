-- Créer tous les créneaux des vendredis de 09h15 à 12h00 jusqu'en décembre 2025

WITH fridays AS (
  -- Générer toutes les dates de vendredis entre septembre et décembre 2025
  SELECT date_trunc('day', d)::date as friday_date
  FROM generate_series(
    '2025-09-01'::date,
    '2025-12-31'::date,
    '1 day'::interval
  ) d
  WHERE EXTRACT(dow FROM d) = 5 -- Vendredi = 5
),
time_slots AS (
  -- Créer les créneaux de 15 minutes de 09:15 à 12:00
  SELECT 
    slot_time::time as start_time,
    (slot_time + interval '15 minutes')::time as end_time
  FROM generate_series(
    '09:15:00'::time,
    '11:45:00'::time,
    '15 minutes'::interval
  ) slot_time
)

-- Insérer tous les créneaux (utiliser upsert pour éviter les doublons)
INSERT INTO specific_date_availability (user_id, specific_date, start_time, end_time, is_available)
SELECT 
  (SELECT user_id FROM specific_date_availability LIMIT 1) as user_id,
  f.friday_date,
  t.start_time,
  t.end_time,
  true as is_available
FROM fridays f
CROSS JOIN time_slots t
ON CONFLICT (user_id, specific_date, start_time, end_time) 
DO UPDATE SET 
  is_available = true,
  updated_at = now();