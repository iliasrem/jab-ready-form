
-- Réactiver l'accès public pour la réservation de RDV par les patients

-- 1. Patients : permettre l'insertion publique avec validation
CREATE POLICY "Secure public patient booking with required phone"
ON public.patients FOR INSERT
TO anon, authenticated
WITH CHECK (
  first_name IS NOT NULL AND last_name IS NOT NULL
  AND char_length(first_name) >= 1 AND char_length(first_name) <= 100
  AND char_length(last_name) >= 1 AND char_length(last_name) <= 100
  AND (email IS NULL OR (char_length(email) >= 5 AND char_length(email) <= 255 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'))
  AND phone IS NOT NULL AND char_length(phone) >= 8 AND char_length(phone) <= 20
  AND phone ~ '^[+]?[0-9\s\-\(\)\.]+'
  AND (notes IS NULL OR char_length(notes) <= 500)
  AND user_id IS NULL
  AND (status IS NULL OR status = 'active'::patient_status)
);

-- 2. Appointments : permettre la création publique
CREATE POLICY "Public can create appointments for booking"
ON public.appointments FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL);

-- 3. Vaccines : permettre la lecture des vaccins disponibles (pour le formulaire)
CREATE POLICY "Public can view available vaccines"
ON public.vaccines FOR SELECT
TO anon, authenticated
USING (is_available = true);

-- 4. Specific_date_availability : permettre la lecture des créneaux disponibles
CREATE POLICY "Public can view available slots"
ON public.specific_date_availability FOR SELECT
TO anon, authenticated
USING (is_available = true);

-- 5. Vaccine_reservations : permettre la création publique
CREATE POLICY "Public can create vaccine reservations"
ON public.vaccine_reservations FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 6. Makeup_availability : permettre la lecture des créneaux maquillage disponibles
CREATE POLICY "Public can view available makeup slots"
ON public.makeup_availability FOR SELECT
TO anon, authenticated
USING (is_available = true);
