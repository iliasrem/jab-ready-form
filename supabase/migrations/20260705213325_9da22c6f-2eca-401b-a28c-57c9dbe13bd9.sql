DROP POLICY IF EXISTS "Public can create appointments for booking" ON public.appointments;
DROP POLICY IF EXISTS "Secure public patient booking with required phone" ON public.patients;