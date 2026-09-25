'use server';
import { revalidatePath } from 'next/cache';
import { currentOwner, supabaseServer } from '@/lib/supabase';
import { PortfolioData } from '@/lib/schema';

async function mine(patch: Record<string, unknown>) {
  const me = await currentOwner();
  if (!me) throw new Error('Not authorized');
  const sb = await supabaseServer(); // runs as the user, so RLS also checks ownership
  const { data, error } = await sb.from('portfolios')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('owner_email', me.ownerEmail).select('slug').single();
  if (error) throw new Error('Save failed');
  revalidatePath(`/f/${data.slug}`);
  revalidatePath('/portal');
}

export async function setStatus(status: 'draft' | 'published') {
  await mine({ status });
}

export async function saveData(raw: unknown) {
  await mine({ data: PortfolioData.parse(raw) });
}
