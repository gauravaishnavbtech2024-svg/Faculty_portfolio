import { supabaseAdmin } from './supabase';

export function slugify(name: string, fallback: string = 'faculty'): string {
  const cleaned = (name || '')
    .trim()
    .toLowerCase()
    .replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

export async function generateUniqueSlug(name: string, ownerEmail: string): Promise<string> {
  const admin = supabaseAdmin();
  const fallback = ownerEmail.split('@')[0].replace(/[^a-z0-9]+/g, '-') || 'faculty';
  const base = slugify(name, fallback);
  let slug = base;

  for (let i = 2; ; i++) {
    const { data: taken } = await admin
      .from('portfolios')
      .select('id')
      .eq('slug', slug)
      .neq('owner_email', ownerEmail)
      .maybeSingle();
    if (!taken) break;
    slug = `${base}-${i}`;
  }
  return slug;
}
