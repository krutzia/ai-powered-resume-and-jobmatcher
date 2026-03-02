
-- Create work type enum
CREATE TYPE public.work_type AS ENUM ('remote', 'onsite', 'hybrid');

-- Create experience level enum
CREATE TYPE public.experience_level AS ENUM ('entry', 'mid', 'senior', 'lead', 'executive');

-- Jobs table (aggregated from providers)
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  work_type public.work_type NOT NULL DEFAULT 'onsite',
  experience_level public.experience_level NOT NULL DEFAULT 'mid',
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT NOT NULL,
  apply_url TEXT NOT NULL,
  source_tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Saved jobs table
CREATE TABLE public.saved_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- Jobs are readable by all authenticated users
CREATE POLICY "Authenticated users can view jobs"
  ON public.jobs FOR SELECT TO authenticated USING (true);

-- Saved jobs policies
CREATE POLICY "Users can view own saved jobs"
  ON public.saved_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
  ON public.saved_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jobs"
  ON public.saved_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert jobs (from edge function)
CREATE POLICY "Service role can insert jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update jobs"
  ON public.jobs FOR UPDATE
  USING (true);

-- Timestamp trigger for jobs
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
