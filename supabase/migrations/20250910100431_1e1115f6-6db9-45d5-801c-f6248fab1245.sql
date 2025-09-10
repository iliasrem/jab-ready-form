-- Update the user role to admin so they can access the secured data
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'info@remili.be';