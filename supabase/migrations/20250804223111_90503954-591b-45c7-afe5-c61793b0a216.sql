-- Fix function search path issues for security
CREATE OR REPLACE FUNCTION public.auto_create_session_for_pdf()
RETURNS TRIGGER AS $$
DECLARE
    session_id UUID;
BEGIN
    -- Create a new session if none exists
    IF NEW.session_id IS NULL THEN
        INSERT INTO public.chat_sessions (user_id, name)
        VALUES (NEW.user_id, 'Sessão - ' || NEW.original_name)
        RETURNING id INTO session_id;
        
        NEW.session_id = session_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Also fix the existing user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_estuda_ai()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Create free subscription
  INSERT INTO public.subscriptions (user_id, type)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix the update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';