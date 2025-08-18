-- Fix function search path security warnings
ALTER FUNCTION public.cleanup_old_data() SET search_path = 'public';
ALTER FUNCTION public.update_user_activity(text, text) SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';