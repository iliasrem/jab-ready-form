-- Créer une vue publique des créneaux disponibles pour la réservation
CREATE OR REPLACE VIEW public.public_available_slots AS
SELECT 
    specific_date,
    start_time,
    end_time,
    created_at,
    updated_at
FROM public.specific_date_availability
WHERE is_available = true;

-- Permettre l'accès public à cette vue
GRANT SELECT ON public.public_available_slots TO anon, authenticated;