CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name text,
  phone text NOT NULL DEFAULT '',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  provider_message_id text,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view sms" ON public.sms_messages
  FOR SELECT TO authenticated USING (public.get_current_user_role() = 'admin');