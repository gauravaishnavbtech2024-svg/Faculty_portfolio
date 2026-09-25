'use server';
import { revalidatePath } from 'next/cache';
import { currentOwner, supabaseServer, supabaseAdmin } from '@/lib/supabase';
import { PortfolioData } from '@/lib/schema';
import { generateUniqueSlug } from '@/lib/slug';

async function mine(patch: Record<string, unknown>) {
  const me = await currentOwner();
  if (!me) throw new Error('Not authorized');
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('portfolios')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('owner_email', me.ownerEmail)
    .select('slug')
    .single();
  if (error) throw new Error('Save failed');
  revalidatePath(`/f/${data.slug}`);
  revalidatePath('/portal');
}

export async function setStatus(status: 'draft' | 'published') {
  await mine({ status });
}

export async function saveData(raw: unknown) {
  const me = await currentOwner();
  if (!me) throw new Error('Not authorized');
  const data = PortfolioData.parse(raw);

  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from('portfolios')
    .select('id,slug')
    .eq('owner_email', me.ownerEmail)
    .maybeSingle();

  const newSlug = await generateUniqueSlug(data.name, me.ownerEmail);

  const { error } = await admin
    .from('portfolios')
    .update({
      data,
      slug: newSlug,
      updated_at: new Date().toISOString(),
    })
    .eq('owner_email', me.ownerEmail);

  if (error) throw new Error('Save failed');

  if (existing?.slug && existing.slug !== newSlug) {
    revalidatePath(`/f/${existing.slug}`);
  }
  revalidatePath(`/f/${newSlug}`);
  revalidatePath('/portal');
}
