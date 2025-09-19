-- Supprimer la politique restrictive et créer une politique plus permissive
DROP POLICY IF EXISTS "Everyone can view available slots" ON public.specific_date_availability;

-- Permettre à tout le monde (authentifié et non authentifié) de voir les créneaux disponibles
CREATE POLICY "Public can view available slots" 
ON public.specific_date_availability 
FOR SELECT 
USING (is_available = true);

-- Permettre aux admins de voir tous les créneaux (disponibles et fermés)
DROP POLICY IF EXISTS "Admins can view all specific availability" ON public.specific_date_availability;
CREATE POLICY "Admins can view all availability" 
ON public.specific_date_availability 
FOR SELECT 
USING (get_current_user_role() = 'admin');