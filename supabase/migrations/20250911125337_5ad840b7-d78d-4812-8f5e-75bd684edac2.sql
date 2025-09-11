-- Update user role to admin for vaccine management
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = 'e264bfe3-b5f3-4f73-a4b1-c7cedc4a414b';