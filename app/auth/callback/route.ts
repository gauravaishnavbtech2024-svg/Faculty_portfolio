import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');

  if (code) {
    let response = NextResponse.redirect(`${origin}/portal`);
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet: Array<{ name: string; value: string; options?: any }>) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await sb.auth.getUser();
      if (user?.email) {
        const { data: allowed } = await supabaseAdmin()
          .from('allowed_emails')
          .select('owner_email')
          .eq('email', user.email.toLowerCase())
          .maybeSingle();

        if (allowed) {
          return response;
        }
      }
    }

    // Not authorized or invalid user
    await sb.auth.signOut();
    return NextResponse.redirect(`${origin}/not-authorized`);
  }

  return NextResponse.redirect(`${origin}/not-authorized`);
}
