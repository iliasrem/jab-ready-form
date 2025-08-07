-- Fix exposed public data by updating RLS policies to require authentication

-- Drop existing overly permissive policies for appointments
DROP POLICY IF EXISTS "Users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view all appointments" ON public.appointments;

-- Drop existing overly permissive policies for patients
DROP POLICY IF EXISTS "Users can create patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update patients" ON public.patients;
DROP POLICY IF EXISTS "Users can view all patients" ON public.patients;

-- Create secure policies for appointments - require authentication
CREATE POLICY "Authenticated users can view appointments" 
ON public.appointments 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create appointments" 
ON public.appointments 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments" 
ON public.appointments 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete appointments" 
ON public.appointments 
FOR DELETE 
TO authenticated
USING (true);

-- Create secure policies for patients - require authentication
CREATE POLICY "Authenticated users can view patients" 
ON public.patients 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create patients" 
ON public.patients 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients" 
ON public.patients 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete patients" 
ON public.patients 
FOR DELETE 
TO authenticated
USING (true);

-- Allow public access to create appointments from the booking page
-- This is needed for the public /book route where patients can create appointments
CREATE POLICY "Public can create appointments via booking" 
ON public.appointments 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow public access to create patients from the booking page
-- This is needed when new patients book appointments
CREATE POLICY "Public can create patients via booking" 
ON public.patients 
FOR INSERT 
TO anon
WITH CHECK (true);