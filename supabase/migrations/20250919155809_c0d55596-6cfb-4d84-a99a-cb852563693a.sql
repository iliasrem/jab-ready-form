-- Créer tous les créneaux des vendredis de 09h15 à 12h00 jusqu'en décembre 2025

-- D'abord, créer une table temporaire avec les créneaux horaires
WITH fridays AS (
  SELECT date_trunc('day', d)::date as friday_date
  FROM generate_series(
    '2025-09-01'::date,
    '2025-12-31'::date,
    '1 day'::interval
  ) d
  WHERE EXTRACT(dow FROM d) = 5
),
time_slots (start_time, end_time) AS (
  VALUES 
    ('09:15:00'::time, '09:30:00'::time),
    ('09:30:00'::time, '09:45:00'::time),
    ('09:45:00'::time, '10:00:00'::time),
    ('10:00:00'::time, '10:15:00'::time),
    ('10:15:00'::time, '10:30:00'::time),
    ('10:30:00'::time, '10:45:00'::time),
    ('10:45:00'::time, '11:00:00'::time),
    ('11:00:00'::time, '11:15:00'::time),
    ('11:15:00'::time, '11:30:00'::time),
    ('11:30:00'::time, '11:45:00'::time),
    ('11:45:00'::time, '12:00:00'::time)
)

INSERT INTO specific_date_availability (user_id, specific_date, start_time, end_time, is_available)
SELECT 
  (SELECT user_id FROM specific_date_availability LIMIT 1),
  f.friday_date,
  t.start_time,
  t.end_time,
  true
FROM fridays f
CROSS JOIN time_slots t
ON CONFLICT (user_id, specific_date, start_time, end_time) 
DO UPDATE SET 
  is_available = true,
  updated_at = now();