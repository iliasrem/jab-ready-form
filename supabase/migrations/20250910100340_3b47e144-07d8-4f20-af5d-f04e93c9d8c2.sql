-- Fix critical security issues with patients and appointments tables
-- Create proper role-based access control (with proper cleanup)

-- First, create a security definer function to get the current user's role
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(role, 'user') FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop ALL existing policies for patients table to start fresh
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can delete patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can create patients" ON public.patients;
DROP POLICY IF EXISTS "Public can create patients via booking" ON public.patients;
DROP POLICY IF EXISTS "Admins can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can update patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can delete patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can create patients" ON public.patients;
DROP POLICY IF EXISTS "Public can create patients for booking" ON public.patients;

-- Create NEW secure policies for patients table
CREATE POLICY "Admins can view all patients" 
ON public.patients 
FOR SELECT 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update patients" 
ON public.patients 
FOR UPDATE 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete patients" 
ON public.patients 
FOR DELETE 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can create patients" 
ON public.patients 
FOR INSERT 
TO authenticated
WITH CHECK (public.get_current_user_role() = 'admin');

-- Keep public booking functionality
CREATE POLICY "Public can create patients for booking" 
ON public.patients 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Drop ALL existing policies for appointments table to start fresh  
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments via booking" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments for booking" ON public.appointments;

-- Create NEW secure policies for appointments table
CREATE POLICY "Admins can view all appointments" 
ON public.appointments 
FOR SELECT 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update appointments" 
ON public.appointments 
FOR UPDATE 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete appointments" 
ON public.appointments 
FOR DELETE 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can create appointments" 
ON public.appointments 
FOR INSERT 
TO authenticated
WITH CHECK (public.get_current_user_role() = 'admin');

-- Keep public booking functionality for appointments
CREATE POLICY "Public can create appointments for booking" 
ON public.appointments 
FOR INSERT 
TO anon
WITH CHECK (true);