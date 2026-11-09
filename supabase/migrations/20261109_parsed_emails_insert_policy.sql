-- Service role bypasses RLS, so inbound webhooks can still insert.
-- This replaces an insert policy that allowed any signed-in user to write any row.
DROP POLICY IF EXISTS "insert_parsed_emails" ON public.parsed_emails;

CREATE POLICY "insert_parsed_emails" ON public.parsed_emails
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
