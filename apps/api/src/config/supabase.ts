import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Cliente con service_role: ignora RLS. Solo se usa en el backend, nunca en el navegador.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
