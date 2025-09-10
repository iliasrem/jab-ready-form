-- Link appointments to patients so nested selects work
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public.patients(id)
ON DELETE CASCADE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);

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