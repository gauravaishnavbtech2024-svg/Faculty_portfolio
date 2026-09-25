import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  await (await supabaseServer()).auth.signOut();
  return NextResponse.redirect(new URL('/', req.url), 303);
}
