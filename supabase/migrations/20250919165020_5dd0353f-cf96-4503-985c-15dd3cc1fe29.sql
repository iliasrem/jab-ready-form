-- Ajouter une politique pour permettre aux admins de voir toutes les disponibilités
CREATE POLICY "Admins can view all specific availability" 
ON public.specific_date_availability 
FOR SELECT 
USING (get_current_user_role() = 'admin');