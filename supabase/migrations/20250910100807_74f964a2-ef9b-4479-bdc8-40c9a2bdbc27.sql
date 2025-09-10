-- Fix function search path security warnings
-- Set proper search paths for security functions

-- Update the email validation function with proper search path
CREATE OR REPLACE FUNCTION public.is_valid_email(email_address text)
RETURNS boolean AS $$
BEGIN
  RETURN email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
    AND char_length(email_address) <= 255 
    AND char_length(email_address) >= 5;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Update the validation trigger function with proper search path
CREATE OR REPLACE FUNCTION public.validate_public_patient_data()
RETURNS trigger AS $$
BEGIN
  -- Additional validation for public patient creation
  IF NEW.user_id IS NULL THEN -- This is a public booking
    -- Sanitize names (remove excessive whitespace)
    NEW.first_name := trim(regexp_replace(NEW.first_name, '\s+', ' ', 'g'));
    NEW.last_name := trim(regexp_replace(NEW.last_name, '\s+', ' ', 'g'));
    
    -- Validate names contain appropriate characters
    IF NEW.first_name !~ '^[A-Za-zÀ-ÿ\s\-\.'']+$' OR NEW.last_name !~ '^[A-Za-zÀ-ÿ\s\-\.'']+$' THEN
      RAISE EXCEPTION 'Names must contain only letters, spaces, hyphens, periods, and apostrophes';
    END IF;
    
    -- Sanitize and validate email
    NEW.email := lower(trim(NEW.email));
    IF NOT public.is_valid_email(NEW.email) THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Sanitize phone if provided
    IF NEW.phone IS NOT NULL THEN
      NEW.phone := trim(NEW.phone);
    END IF;
    
    -- Sanitize notes and prevent malicious content
    IF NEW.notes IS NOT NULL THEN
      NEW.notes := trim(NEW.notes);
      IF NEW.notes ~* '(script|javascript|<|>|&lt;|&gt;)' THEN
        RAISE EXCEPTION 'Notes contain invalid content';
      END IF;
    END IF;
    
    -- Set default status
    IF NEW.status IS NULL THEN
      NEW.status := 'active';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;