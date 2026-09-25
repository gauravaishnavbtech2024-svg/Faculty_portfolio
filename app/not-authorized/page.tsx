export default function NotAuthorized() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-[#fde8ea] text-[#c8102e] flex items-center justify-center mb-5 shadow-inner">
          <svg className="w-8 h-8 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Google Account Not Approved</h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Please sign in with the official university or personal email approved by the administrator. If you believe this is a mistake, contact your administrator to whitelist your email.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button className="rounded-xl bg-[#002147] hover:bg-[#001633] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-colors">
            Sign out and try another account
          </button>
        </form>
      </div>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-600">
          Developed by <span className="font-bold text-[#002147]">Gaurav Vaishnav</span> &amp; <span className="font-bold text-[#002147]">Krish Charan</span>
        </p>
      </footer>
    </div>
  );
}
