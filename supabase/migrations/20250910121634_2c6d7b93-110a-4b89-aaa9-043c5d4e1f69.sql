-- Fix booking failure due to restrictive RLS policies combining with AND
-- Make INSERT policies PERMISSIVE so that public booking OR admin creation both work

-- Patients table: adjust INSERT policies
DROP POLICY IF EXISTS "Admins can create patients" ON public.patients;
DROP POLICY IF EXISTS "Secure public patient booking" ON public.patients;

CREATE POLICY "Admins can create patients"
ON public.patients
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Secure public patient booking"
ON public.patients
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
  (first_name IS NOT NULL) AND
  (last_name IS NOT NULL) AND
  (email IS NOT NULL) AND
  ((char_length(first_name) >= 1) AND (char_length(first_name) <= 100)) AND
  ((char_length(last_name) >= 1) AND (char_length(last_name) <= 100)) AND
  ((char_length(email) >= 5) AND (char_length(email) <= 255)) AND
  (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') AND
  ((phone IS NULL) OR (((char_length(phone) >= 8) AND (char_length(phone) <= 20)) AND (phone ~ '^[+]?[0-9\s\-\(\)\.]+' ))) AND
  ((notes IS NULL) OR (char_length(notes) <= 500)) AND
  (user_id IS NULL) AND
  ((status IS NULL) OR (status = 'active'::patient_status))
);

-- Appointments table: adjust INSERT policies
DROP POLICY IF EXISTS "Admins can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments for booking" ON public.appointments;

CREATE POLICY "Admins can create appointments"
ON public.appointments
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Public can create appointments for booking"
ON public.appointments
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);
