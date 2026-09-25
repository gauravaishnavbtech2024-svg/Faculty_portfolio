import { redirect } from 'next/navigation';
import { currentOwner } from '@/lib/supabase';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const me = await currentOwner();
  if (!me) redirect('/not-authorized');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#2b4cdd] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              FP
            </div>
            <div>
              <a href="/portal" className="text-base font-bold text-slate-900 tracking-tight hover:text-[#2b4cdd] transition-colors">
                Faculty Portal
              </a>
              <p className="text-xs text-slate-500">Academic CV & Portfolio Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              {me.user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button className="rounded-lg px-3 py-1.5 font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
