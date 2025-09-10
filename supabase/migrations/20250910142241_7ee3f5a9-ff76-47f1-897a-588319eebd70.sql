-- Make INSERT policies PERMISSIVE to avoid unintended AND combinations

-- Patients INSERT policies
DROP POLICY IF EXISTS "Admins can create patients" ON public.patients;
CREATE POLICY "Admins can create patients" ON public.patients
AS PERMISSIVE
FOR INSERT
WITH CHECK (get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Secure public patient booking" ON public.patients;
CREATE POLICY "Secure public patient booking" ON public.patients
AS PERMISSIVE
FOR INSERT
WITH CHECK (
  -- Required fields
  first_name IS NOT NULL AND
  last_name IS NOT NULL AND
  char_length(first_name) >= 1 AND char_length(first_name) <= 100 AND
  char_length(last_name) >= 1 AND char_length(last_name) <= 100 AND

  -- Optional but validated email if provided
  (email IS NULL OR (
    char_length(email) >= 5 AND 
    char_length(email) <= 255 AND
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )) AND

  -- Optional phone if provided
  (phone IS NULL OR (
    char_length(phone) >= 8 AND 
    char_length(phone) <= 20 AND
    phone ~ '^[+]?[0-9\s\-\(\)\.]+'
  )) AND

  -- Optional notes length
  (notes IS NULL OR char_length(notes) <= 500) AND

  -- Must be a public booking (not tied to an authenticated user)
  user_id IS NULL AND

  -- Default status
  (status IS NULL OR status = 'active'::patient_status)
);

-- Appointments INSERT policies
DROP POLICY IF EXISTS "Admins can create appointments" ON public.appointments;
CREATE POLICY "Admins can create appointments" ON public.appointments
AS PERMISSIVE
FOR INSERT
WITH CHECK (get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Public can create appointments for booking" ON public.appointments;
CREATE POLICY "Public can create appointments for booking" ON public.appointments
AS PERMISSIVE
FOR INSERT
WITH CHECK (true);
