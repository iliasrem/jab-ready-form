-- Fix security issue: Restrict public patient creation and add validation
-- This maintains booking functionality while preventing abuse

-- Drop the current overly permissive public policy
DROP POLICY IF EXISTS "Public can create patients for booking" ON public.patients;

-- Create a more restrictive policy for public patient creation during booking
-- This policy ensures public users can only create basic patient records with essential fields
CREATE POLICY "Public can create patients for booking only" 
ON public.patients 
FOR INSERT 
TO anon
WITH CHECK (
  -- Ensure required fields are provided
  first_name IS NOT NULL AND 
  last_name IS NOT NULL AND 
  email IS NOT NULL AND
  -- Prevent abuse by limiting field content
  char_length(first_name) BETWEEN 1 AND 100 AND
  char_length(last_name) BETWEEN 1 AND 100 AND
  char_length(email) BETWEEN 5 AND 255 AND
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  -- Restrict phone format if provided
  (phone IS NULL OR (char_length(phone) BETWEEN 8 AND 20 AND phone ~ '^[+]?[0-9\s\-\(\)\.]+$')) AND
  -- Prevent notes abuse - only allow short notes for booking purposes
  (notes IS NULL OR char_length(notes) <= 500) AND
  -- Ensure user_id is not set by public users (should be null for booking)
  user_id IS NULL AND
  -- Only allow active status for public bookings
  (status IS NULL OR status = 'active')
);

-- Create a function to validate email format more strictly
CREATE OR REPLACE FUNCTION public.is_valid_email(email_address text)
RETURNS boolean AS $$
BEGIN
  -- Basic email validation
  RETURN email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
    AND char_length(email_address) <= 255 
    AND char_length(email_address) >= 5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to sanitize and validate patient data for public booking
CREATE OR REPLACE FUNCTION public.validate_public_patient_data()
RETURNS trigger AS $$
BEGIN
  -- Additional validation for public patient creation
  IF NEW.user_id IS NULL THEN -- This is a public booking
    -- Sanitize names (remove excessive whitespace, limit special characters)
    NEW.first_name := trim(regexp_replace(NEW.first_name, '\s+', ' ', 'g'));
    NEW.last_name := trim(regexp_replace(NEW.last_name, '\s+', ' ', 'g'));
    
    -- Validate names contain mostly letters
    IF NEW.first_name !~ '^[A-Za-zÀ-ÿ\s\-\.'']+$' OR NEW.last_name !~ '^[A-Za-zÀ-ÿ\s\-\.'']+$' THEN
      RAISE EXCEPTION 'Names must contain only letters, spaces, hyphens, periods, and apostrophes';
    END IF;
    
    -- Sanitize email
    NEW.email := lower(trim(NEW.email));
    
    -- Additional email validation
    IF NOT public.is_valid_email(NEW.email) THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Sanitize phone if provided
    IF NEW.phone IS NOT NULL THEN
      NEW.phone := trim(NEW.phone);
    END IF;
    
    -- Sanitize notes if provided
    IF NEW.notes IS NOT NULL THEN
      NEW.notes := trim(NEW.notes);
      -- Remove potentially harmful content
      IF NEW.notes ~* '(script|javascript|<|>|&lt;|&gt;)' THEN
        RAISE EXCEPTION 'Notes contain invalid content';
      END IF;
    END IF;
    
    -- Ensure status is appropriate for public booking
    IF NEW.status IS NULL THEN
      NEW.status := 'active';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate patient data on insert
CREATE TRIGGER validate_patient_data_before_insert
  BEFORE INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_public_patient_data();