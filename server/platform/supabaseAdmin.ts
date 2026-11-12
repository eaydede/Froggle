import { createClient } from '@supabase/supabase-js';

let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!adminClient) {
    const url = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!url) throw new Error('SUPABASE_URL environment variable is not set');
    if (!secretKey) throw new Error('SUPABASE_SECRET_KEY environment variable is not set');

    adminClient = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}
