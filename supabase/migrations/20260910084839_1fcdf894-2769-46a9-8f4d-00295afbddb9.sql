CREATE OR REPLACE VIEW public.public_booked_slots AS
SELECT appointment_date, appointment_time
FROM public.appointments
WHERE status <> 'cancelled';

GRANT SELECT ON public.public_booked_slots TO anon;
GRANT SELECT ON public.public_booked_slots TO authenticated;
GRANT ALL ON public.public_booked_slots TO service_role;