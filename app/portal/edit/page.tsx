import { currentOwner, supabaseServer } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import Editor from './Editor';

export default async function EditPage() {
  const me = await currentOwner();
  const sb = await supabaseServer();
  const { data: p } = await sb.from('portfolios').select('data').eq('owner_email', me!.ownerEmail).maybeSingle();
  if (!p) redirect('/portal/upload');
  return (<div><h1 className="mb-6 text-2xl font-semibold">Edit your portfolio</h1><Editor initial={p.data} /></div>);
}
