-- Supprimer l'ancienne politique publique restrictive
DROP POLICY IF EXISTS "Public can view available slots" ON specific_date_availability;

-- Créer une nouvelle politique pour permettre à tous de voir tous les créneaux disponibles
CREATE POLICY "Everyone can view available slots" 
ON specific_date_availability 
FOR SELECT 
USING (is_available = true);

-- S'assurer que la politique pour les utilisateurs connectés reste pour leurs propres créneaux
-- (elle existe déjà mais on peut la recréer pour être sûr)
DROP POLICY IF EXISTS "Users can view their own specific availability" ON specific_date_availability;
CREATE POLICY "Users can view their own specific availability" 
ON specific_date_availability 
FOR SELECT 
USING (auth.uid() = user_id);