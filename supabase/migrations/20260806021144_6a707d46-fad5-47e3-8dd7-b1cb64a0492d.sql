-- 1. Disable GraphQL exposure (app uses PostgREST only)
REVOKE USAGE ON SCHEMA graphql FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA graphql FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql FROM anon, authenticated;
REVOKE USAGE ON SCHEMA graphql_public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql_public FROM anon, authenticated;

-- 2. Remove anonymous access to every public table, then re-grant only public read surfaces
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.specific_date_availability TO anon;
GRANT SELECT ON public.makeup_availability TO anon;
GRANT SELECT ON public.vaccines TO anon;

-- Ensure admin/user access via PostgREST stays intact
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 3. Lock down SECURITY DEFINER functions: only get_current_user_role stays callable
--    (it is required by RLS policies evaluated as the authenticated role)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_role_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_vaccine_order_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_public_patient_data() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_valid_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- 4. Prevent privilege escalation through profile self-update
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role IS NOT DISTINCT FROM (
    SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);