-- Créer une politique pour permettre la lecture publique des disponibilités
CREATE POLICY "Public can view available slots" 
ON public.specific_date_availability 
FOR SELECT 
USING (is_available = true);