-- Supprimer l'ancienne politique qui exige un email
DROP POLICY IF EXISTS "Secure public patient booking" ON public.patients;

-- Créer une nouvelle politique qui permet les emails optionnels
CREATE POLICY "Secure public patient booking" ON public.patients
FOR INSERT 
WITH CHECK (
  -- Validation des champs obligatoires
  first_name IS NOT NULL AND
  last_name IS NOT NULL AND
  char_length(first_name) >= 1 AND char_length(first_name) <= 100 AND
  char_length(last_name) >= 1 AND char_length(last_name) <= 100 AND
  
  -- Validation de l'email (optionnel mais doit être valide si fourni)
  (email IS NULL OR (
    char_length(email) >= 5 AND 
    char_length(email) <= 255 AND
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )) AND
  
  -- Validation du téléphone (optionnel)
  (phone IS NULL OR (
    char_length(phone) >= 8 AND 
    char_length(phone) <= 20 AND
    phone ~ '^[+]?[0-9\s\-\(\)\.]+'
  )) AND
  
  -- Validation des notes (optionnel)
  (notes IS NULL OR char_length(notes) <= 500) AND
  
  -- Doit être une réservation publique (pas liée à un utilisateur connecté)
  user_id IS NULL AND
  
  -- Status par défaut
  (status IS NULL OR status = 'active'::patient_status)
);