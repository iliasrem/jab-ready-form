-- Mise à jour de la validation pour rendre le téléphone obligatoire dans les réservations publiques
-- Pour les patients créés par le public (user_id IS NULL), le téléphone devient obligatoire

-- Supprimer l'ancienne politique de création publique pour les patients
DROP POLICY IF EXISTS "Secure public patient booking" ON public.patients;

-- Créer une nouvelle politique avec téléphone obligatoire
CREATE POLICY "Secure public patient booking with required phone" 
ON public.patients 
FOR INSERT 
WITH CHECK (
    -- Prénom et nom obligatoires
    (first_name IS NOT NULL) AND 
    (last_name IS NOT NULL) AND 
    (char_length(first_name) >= 1) AND 
    (char_length(first_name) <= 100) AND 
    (char_length(last_name) >= 1) AND 
    (char_length(last_name) <= 100) AND 
    
    -- Email optionnel mais valide si fourni
    ((email IS NULL) OR 
     ((char_length(email) >= 5) AND 
      (char_length(email) <= 255) AND 
      (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))) AND 
    
    -- Téléphone obligatoire pour les réservations publiques
    (phone IS NOT NULL) AND 
    (char_length(phone) >= 8) AND 
    (char_length(phone) <= 20) AND 
    (phone ~ '^[+]?[0-9\s\-\(\)\.]+'::text) AND 
    
    -- Notes optionnelles
    ((notes IS NULL) OR (char_length(notes) <= 500)) AND 
    
    -- Réservation publique (pas d'utilisateur connecté)
    (user_id IS NULL) AND 
    
    -- Statut par défaut actif
    ((status IS NULL) OR (status = 'active'::patient_status))
);