import { createClient } from '@supabase/supabase-js';

/**
 * Get a Supabase client with service role (admin) access.
 * Use this for server-side operations that need to bypass RLS,
 * such as webhook handling or background jobs.
 */
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    return null;
  }
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
