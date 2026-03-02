
-- Drop overly permissive policies and replace with service_role-only
DROP POLICY "Service role can insert jobs" ON public.jobs;
DROP POLICY "Service role can update jobs" ON public.jobs;

-- Only service_role can insert/update jobs (edge functions use service role)
CREATE POLICY "Service role inserts jobs"
  ON public.jobs FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role updates jobs"
  ON public.jobs FOR UPDATE TO service_role
  USING (true);
