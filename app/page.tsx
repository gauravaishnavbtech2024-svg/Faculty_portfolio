import LoginButton from '@/components/LoginButton';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Top Simple Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#2b4cdd] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              FP
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight">Faculty Portfolio Designer</span>
              <p className="text-xs text-slate-500">Academic CV & Portfolio Platform</p>
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Institutional Access
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="mx-auto flex flex-1 max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200/80 px-4 py-1.5 text-xs font-semibold text-blue-800 mb-6">

        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-2xl">
          Your CV, transformed into a personal academic website.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
          Upload your curriculum vitae in seconds. We automatically structure your publications, research projects, teaching modules, and awards into a website.
        </p>

        <div className="mt-10">
          <LoginButton />
        </div>

        <p className="mt-5 text-xs text-slate-400">
          Access is strictly restricted to authorized university faculty accounts.
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Faculty Portfolio Portal. All rights reserved.</p>
      </footer>
    </main>
  );
}
