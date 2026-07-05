
-- 1. Trigger BEFORE UPDATE: interdire modification de role sauf par service_role
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_setting('request.jwt.claims', true)::jsonb->>'role' <> 'service_role' THEN
    RAISE EXCEPTION 'Modification du champ role interdite';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_change();

-- 2. Forcer role='user' à l'INSERT (empêche auto-inscription en admin)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND (role IS NULL OR role = 'user'));

-- 3. Normaliser tout profil non-admin actuel dont le role ne serait pas 'user' (safety)
-- On ne touche pas aux admins existants
UPDATE public.profiles SET role = 'user' WHERE role IS NULL;
