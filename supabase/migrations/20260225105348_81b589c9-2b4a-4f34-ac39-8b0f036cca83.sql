
-- =============================================
-- SÉCURISATION : Supprimer tous les accès publics
-- Seul l'admin (via get_current_user_role()) peut accéder aux données
-- =============================================

-- 1. PATIENTS : Supprimer l'accès public et l'accès "authenticated"
DROP POLICY IF EXISTS "Authenticated users can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Secure public patient booking with required phone" ON public.patients;

-- 2. APPOINTMENTS : Supprimer l'accès public et "authenticated"
DROP POLICY IF EXISTS "Authenticated users can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments for booking" ON public.appointments;

-- 3. VACCINE_RESERVATIONS : Supprimer l'accès public
DROP POLICY IF EXISTS "Public can create vaccine reservations" ON public.vaccine_reservations;

-- 4. VACCINES : Supprimer l'accès public
DROP POLICY IF EXISTS "Vaccines are viewable by everyone" ON public.vaccines;

-- 5. SPECIFIC_DATE_AVAILABILITY : Supprimer l'accès public
DROP POLICY IF EXISTS "Public can view available slots" ON public.specific_date_availability;

-- 6. MAKEUP_AVAILABILITY : Supprimer l'accès public
DROP POLICY IF EXISTS "Public can view available makeup slots" ON public.makeup_availability;

-- 7. Ajouter politique admin SELECT pour vaccines (la politique ALL existe déjà)
-- La politique "Admins can manage vaccines" avec ALL couvre déjà SELECT/INSERT/UPDATE/DELETE

-- 8. Ajouter politique admin INSERT pour patients (manquante après suppression public)
-- "Admins can create patients" existe déjà

-- 9. Ajouter politique admin INSERT pour appointments (manquante après suppression public)
-- "Admins can create appointments" existe déjà

-- 10. Ajouter politique admin INSERT pour vaccine_reservations (manquante après suppression public)  
-- "Admins can manage vaccine reservations" avec ALL existe déjà

-- 11. Recréer la vue public_available_slots avec SECURITY INVOKER au lieu de SECURITY DEFINER
DROP VIEW IF EXISTS public.public_available_slots;
CREATE VIEW public.public_available_slots 
WITH (security_invoker = true) AS
SELECT specific_date, start_time, end_time, created_at, updated_at
FROM public.specific_date_availability
WHERE is_available = true;
