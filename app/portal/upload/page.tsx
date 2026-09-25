'use client';

import { useState } from 'react';
import Link from 'next/link';

const MAX = 4 * 1024 * 1024;

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const pick = (f: File | null) => {
    setErr('');
    setFile(null);
    if (!f) return;
    if (!/\.(pdf|docx)$/i.test(f.name)) return setErr('Only PDF or DOCX files are accepted.');
    if (f.size > MAX) return setErr('File is larger than 4 MB. Please upload a smaller file.');
    setFile(f);
  };

  const go = async () => {
    if (!file) return;
    setBusy(true);
    setErr('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/parse-cv', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Parsing failed.');
      setSlug(j.slug);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    }
    setBusy(false);
  };

  if (slug) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm max-w-xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <svg className="w-8 h-8 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Your Portfolio is Ready!</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            We extracted your academic achievements and built your personal page. It is saved in <strong>Private Draft Mode</strong> so you can review and edit your information before publishing it live.
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4 text-xs text-amber-900 text-left flex items-start gap-2.5">
          <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <strong>Next Step:</strong> Review your draft preview or customize details. Once you are ready, click <strong>&quot;Publish to World&quot;</strong> in your dashboard to generate your public shareable link.
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={`/f/${slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span>Preview Draft</span>
            <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2547d0] hover:bg-[#1e3bb8] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all"
          >
            <span>Go to Dashboard</span>
            <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Upload Your CV</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload your curriculum vitae in PDF or Word format. Gemini AI will analyze your publications, research, teaching modules, and background.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.[0]) pick(e.dataTransfer.files[0]);
        }}
        className={`relative rounded-3xl border-2 border-dashed p-10 text-center transition-all ${
          dragActive
            ? 'border-blue-600 bg-blue-50/50'
            : file
            ? 'border-emerald-400 bg-emerald-50/30'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2547d0] flex items-center justify-center shadow-inner">
            {file ? (
              <svg className="w-8 h-8 text-emerald-600 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-[#2547d0] fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            )}
          </div>

          <div>
            {file ? (
              <div>
                <p className="font-bold text-slate-900 text-base">{file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(0)} KB • Ready to parse</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-slate-800 text-base">
                  Drag and drop your CV here, or <span className="text-[#2547d0] underline cursor-pointer">browse file</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Accepts PDF or DOCX (Max 4 MB)</p>
              </div>
            )}
          </div>

          <label className="absolute inset-0 cursor-pointer">
            <input
              type="file"
              accept=".pdf,.docx"
              className="sr-only"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {err && (
        <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm font-medium text-red-700 flex items-start gap-2.5">
          <svg className="w-5 h-5 text-red-600 shrink-0 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>{err}</div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          disabled={!file || busy}
          onClick={go}
          className="rounded-2xl bg-[#2547d0] hover:bg-[#1e3bb8] px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all duration-150 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
        >
          {busy ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Analyzing CV & Generating Website (takes ~15s)...</span>
            </>
          ) : (
            'Generate My Faculty Portfolio'
          )}
        </button>
      </div>
    </div>
  );
}
