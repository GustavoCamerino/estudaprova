-- Add PDF content extraction for better AI processing
ALTER TABLE public.pdfs ADD COLUMN IF NOT EXISTS extracted_content TEXT;

-- Create index for better performance on session queries
CREATE INDEX IF NOT EXISTS idx_pdfs_session_id ON public.pdfs(session_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_session_id ON public.generated_content(session_id);

-- Create cleanup function for PDFs and messages older than 4 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete PDFs older than 4 hours
  DELETE FROM public.pdfs 
  WHERE created_at < NOW() - INTERVAL '4 hours';
  
  -- Delete chat sessions older than 4 hours that are inactive
  DELETE FROM public.chat_sessions 
  WHERE created_at < NOW() - INTERVAL '4 hours' 
  AND is_active = false;
  
  -- Delete generated content older than 4 hours
  DELETE FROM public.generated_content 
  WHERE created_at < NOW() - INTERVAL '4 hours';
  
  -- Delete chat messages for sessions that no longer exist
  DELETE FROM public.chat_messages 
  WHERE session_id NOT IN (SELECT id FROM public.chat_sessions);
END;
$$;

-- Create table for tracking active users
CREATE TABLE IF NOT EXISTS public.active_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS for active_users
ALTER TABLE public.active_users ENABLE ROW LEVEL SECURITY;

-- Create policies for active_users
CREATE POLICY "Users can update their own activity" 
ON public.active_users 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" 
ON public.active_users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Create function to update user activity
CREATE OR REPLACE FUNCTION public.update_user_activity(page_url TEXT DEFAULT NULL, user_agent TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.active_users (user_id, last_activity, page_url, user_agent)
  VALUES (auth.uid(), NOW(), page_url, user_agent)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    last_activity = NOW(),
    page_url = EXCLUDED.page_url,
    user_agent = EXCLUDED.user_agent;
END;
$$;

-- Create table for study planner goals
CREATE TABLE IF NOT EXISTS public.planner_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('short', 'long')),
  type TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  monthly_progress INTEGER NOT NULL DEFAULT 0 CHECK (monthly_progress >= 0 AND monthly_progress <= 100),
  annual_progress INTEGER NOT NULL DEFAULT 0 CHECK (annual_progress >= 0 AND annual_progress <= 100),
  deadline DATE,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS for planner_goals
ALTER TABLE public.planner_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for planner_goals
CREATE POLICY "Users can manage their own goals"
ON public.planner_goals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create table for study planner tasks
CREATE TABLE IF NOT EXISTS public.planner_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 60,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  task_date DATE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  task_type TEXT NOT NULL CHECK (task_type IN ('reading', 'practice', 'review', 'exam')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS for planner_tasks
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for planner_tasks
CREATE POLICY "Users can manage their own tasks"
ON public.planner_tasks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create table for important dates
CREATE TABLE IF NOT EXISTS public.important_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  category TEXT NOT NULL DEFAULT 'general',
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS for important_dates
ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;

-- Create policies for important_dates
CREATE POLICY "Users can manage their own important dates"
ON public.important_dates
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add session_id to generated_content if not exists
ALTER TABLE public.generated_content ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE;

-- Create trigger for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_planner_goals_updated_at
  BEFORE UPDATE ON public.planner_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planner_tasks_updated_at
  BEFORE UPDATE ON public.planner_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_important_dates_updated_at
  BEFORE UPDATE ON public.important_dates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();