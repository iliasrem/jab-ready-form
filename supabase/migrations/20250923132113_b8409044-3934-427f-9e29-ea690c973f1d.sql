-- Créer une table pour les jours bloqués avec activités
CREATE TABLE public.blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blocked_date DATE NOT NULL,
  activity TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, blocked_date)
);

-- Activer RLS
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs voient leurs propres jours bloqués
CREATE POLICY "Users can view their own blocked dates" 
ON public.blocked_dates 
FOR SELECT 
USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs créent leurs propres jours bloqués
CREATE POLICY "Users can create their own blocked dates" 
ON public.blocked_dates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Politique pour que les utilisateurs modifient leurs propres jours bloqués
CREATE POLICY "Users can update their own blocked dates" 
ON public.blocked_dates 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs suppriment leurs propres jours bloqués
CREATE POLICY "Users can delete their own blocked dates" 
ON public.blocked_dates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_blocked_dates_updated_at
BEFORE UPDATE ON public.blocked_dates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();