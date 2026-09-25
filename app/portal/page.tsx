import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { currentOwner, supabaseServer, supabaseAdmin } from '@/lib/supabase';
import { slugify, generateUniqueSlug } from '@/lib/slug';
import { setStatus } from './actions';
import CopyButton from '@/components/CopyButton';

export default async function Dashboard() {
  const me = await currentOwner();
  if (!me) redirect('/not-authorized');

  const sb = await supabaseServer();
  const { data: p } = await sb
    .from('portfolios')
    .select('slug,status,data,updated_at')
    .eq('owner_email', me.ownerEmail)
    .maybeSingle();

  if (!p) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2547d0] flex items-center justify-center mx-auto mb-5 shadow-inner">
          <svg className="w-8 h-8 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Create Your Faculty Portfolio</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Upload your curriculum vitae (PDF or DOCX). Our AI will instantly parse your academic achievements and construct your personal portfolio website.
        </p>
        <Link
          href="/portal/upload"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2547d0] hover:bg-[#1e3bb8] px-6 py-3 text-sm font-bold text-white shadow-md transition-all duration-150 hover:scale-[1.02]"
        >
          <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          Upload CV & Build Page
        </Link>
      </div>
    );
  }

  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;
  
  let currentSlug = p.slug;
  if (p.data?.name) {
    const expectedBase = slugify(p.data.name);
    if (expectedBase && !currentSlug.startsWith(expectedBase)) {
      const newSlug = await generateUniqueSlug(p.data.name, me.ownerEmail);
      const admin = supabaseAdmin();
      await admin.from('portfolios').update({ slug: newSlug, updated_at: new Date().toISOString() }).eq('owner_email', me.ownerEmail);
      currentSlug = newSlug;
    }
  }

  const url = `${origin}/f/${currentSlug}`;
  const live = p.status === 'published';

  return (
    <div className="space-y-8">
      {/* Top Welcome Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {p.data.name || 'Your Faculty Portfolio'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {[p.data.designation, p.data.department, p.data.institution].filter(Boolean).join(' • ') || 'Academic Portfolio'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portal/edit"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-500 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit Details
          </Link>
          <Link
            href="/portal/upload"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-500 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Replace CV
          </Link>
        </div>
      </div>

      {/* Main Status & URL Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                live
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {live ? 'Live & Published' : 'Private Draft Mode'}
            </span>
            {p.updated_at && (
              <span className="text-xs text-slate-400">
                Last updated: {new Date(p.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>

          <form action={setStatus.bind(null, live ? 'draft' : 'published')}>
            <button
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all duration-150 ${
                live
                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                  : 'bg-[#2547d0] text-white hover:bg-[#1e3bb8]'
              }`}
            >
              {live ? (
                <>
                  <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  Unpublish to Draft
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  Publish to World
                </>
              )}
            </button>
          </form>
        </div>

        {/* When LIVE: Show Public URL & Copy Button */}
        {live ? (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Your Live Public Portfolio URL
              </p>
              <p className="text-sm font-mono font-semibold text-slate-800 truncate">{url}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <CopyButton text={url} />
              <Link
                href={`/f/${currentSlug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#2547d0] transition-colors shadow-sm"
              >
                <span>Open Site</span>
                <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </Link>
            </div>
          </div>
        ) : (
          /* When DRAFT: Show Draft Preview & Guidance, NO Copy Link */
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div className="space-y-1 text-xs sm:text-sm text-amber-950">
                <p className="font-bold text-amber-900">Your portfolio is in Private Draft Mode</p>
                <p className="leading-relaxed text-amber-800">
                  Only you can view this page while signed in. Review your details, make any needed edits, and click <strong>&quot;Publish to World&quot;</strong> above to generate your public link and make it live for students, colleagues, and visitors.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-200/60">
              <Link
                href={`/f/${currentSlug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-amber-300 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100/50 transition-colors shadow-sm"
              >
                <span>Preview Draft</span>
                <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </Link>
              <Link
                href="/portal/edit"
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-amber-300 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100/50 transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Edit Details</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-[#2547d0]">{Array.isArray(p.data.publications) ? p.data.publications.length : 0}</p>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Publications</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-[#2547d0]">{Array.isArray(p.data.projects) ? p.data.projects.length : 0}</p>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Projects</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-[#2547d0]">{Array.isArray(p.data.courses) ? p.data.courses.length : 0}</p>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Courses</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-[#2547d0]">{Array.isArray(p.data.awards) ? p.data.awards.length : 0}</p>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Awards</p>
        </div>
      </div>
    </div>
  );
}
