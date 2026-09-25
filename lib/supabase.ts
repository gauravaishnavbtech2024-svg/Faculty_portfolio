import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Acts as the logged-in user (Row Level Security applies).
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: Array<{ name: string; value: string; options?: any }>) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component */
        }
      },
    },
  });
}

// Bypasses RLS. Server-only. Never import into a client component.
export const supabaseAdmin = () =>
  createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

// The gate: returns the user only if their email is on the allowlist.
export async function currentOwner() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  console.log('[DEBUG AUTH] Google user email:', user?.email);
  if (!user?.email) return null;
  
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('allowed_emails').select('owner_email').eq('email', user.email.toLowerCase()).maybeSingle();
  
  console.log('[DEBUG AUTH] allowed_emails lookup result:', data, 'error:', error);
  return data ? { user, ownerEmail: String(data.owner_email).toLowerCase() } : null;
}
