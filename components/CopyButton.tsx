'use client';

import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 shadow-sm ${
        ok
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400'
      }`}
    >
      {ok ? (
        <>
          <svg className="w-3.5 h-3.5 text-emerald-600 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 text-slate-500 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span>Copy Link</span>
        </>
      )}
    </button>
  );
}
