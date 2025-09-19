-- Supprimer tous les créneaux qui ne sont pas des vendredis
DELETE FROM specific_date_availability 
WHERE EXTRACT(dow FROM specific_date) != 5; -- 5 = vendredi