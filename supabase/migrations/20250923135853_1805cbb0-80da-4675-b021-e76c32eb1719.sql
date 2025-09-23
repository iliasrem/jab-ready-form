-- Fix missing CREATE POLICY statement for blocked_dates update policy
CREATE POLICY "Users can update their own blocked dates" 
ON public.blocked_dates 
FOR UPDATE 
USING (auth.uid() = user_id);