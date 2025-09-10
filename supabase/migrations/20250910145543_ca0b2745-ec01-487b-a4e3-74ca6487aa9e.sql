-- Allow authenticated users to view appointments (needed for admin portal)
DROP POLICY IF EXISTS "Authenticated users can view all appointments" ON public.appointments;
CREATE POLICY "Authenticated users can view all appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to view patients (to fetch patient info in lists)
DROP POLICY IF EXISTS "Authenticated users can view all patients" ON public.patients;
CREATE POLICY "Authenticated users can view all patients"
ON public.patients
FOR SELECT
TO authenticated
USING (true);