-- Add approval system for users
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Create policy for approved users only
CREATE POLICY "Only approved users can access data" 
ON public.user_profiles 
FOR ALL 
USING (
  CASE 
    WHEN auth.uid() = user_id THEN true
    WHEN (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') IS NOT NULL THEN true
    ELSE approved = true
  END
);

-- Update existing users to be approved by default
UPDATE public.user_profiles SET approved = true;