'use client';

import { useState, useMemo } from 'react';

interface PublicationItem extends Record<string, any> {
  title?: string;
  authors?: string;
  venue?: string;
  year?: string | number;
  link?: string;
  type?: string;
  category?: string;
}

interface Props {
  publications: PublicationItem[];
  renderCustomFields?: (item: Record<string, any>, standardKeys: string[]) => React.ReactNode;
}

const safe = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : undefined);

function normalizePublicationType(item: PublicationItem): string {
  const rawType = (item.type || item.category || item.publication_type || item.kind || '').trim();

  if (rawType) {
    const lower = rawType.toLowerCase();
    if (/journal/i.test(lower)) return 'Journal Papers';
    if (/conference|proceedings|symposium|workshop/i.test(lower)) return 'Conference Proceedings';
    if (/chapter/i.test(lower)) return 'Book Chapters';
    if (/^books?$|authored book|edited book|monograph/i.test(lower)) return 'Books';
    if (/patent/i.test(lower)) return 'Patents';
    if (/working paper|pre-print|preprint/i.test(lower)) return 'Preprints & Working Papers';
    // Preserve custom capitalized category from CV if specific
    return rawType.charAt(0).toUpperCase() + rawType.slice(1);
  }

  // Fallback intelligent classification based on venue / title text
  const venue = (item.venue || '').toLowerCase();
  const title = (item.title || '').toLowerCase();

  if (
    /journal|transactions|ieee trans|elsevier|springer|nature|mdpi|hindawi|wiley|acm trans|letters|review|frontiers|plos|periodical/i.test(
      venue
    )
  ) {
    return 'Journal Papers';
  }

  if (
    /conference|proceedings|symposium|workshop|iccv|cvpr|icml|neurips|nips|ieee conf|acm conf|congress|colloquium|annual meeting/i.test(
      venue
    )
  ) {
    return 'Conference Proceedings';
  }

  if (/chapter|handbook/i.test(venue) || /chapter/i.test(title)) {
    return 'Book Chapters';
  }

  if (/book|monograph|textbook/i.test(venue)) {
    return 'Books';
  }

  if (/patent/i.test(title) || /patent/i.test(venue)) {
    return 'Patents';
  }

  return 'Academic Publications';
}

function getCategoryBadgeColor(cat: string) {
  switch (cat) {
    case 'Journal Papers':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Conference Proceedings':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Book Chapters':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Books':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Patents':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export default function PublicationsSection({ publications, renderCustomFields }: Props) {
  const [activeTab, setActiveTab] = useState<string>('all');

  // Tag every publication with normalized category
  const taggedPublications = useMemo(() => {
    return (publications || []).map((p) => ({
      ...p,
      _category: normalizePublicationType(p),
    }));
  }, [publications]);

  // Aggregate category counts dynamically
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of taggedPublications) {
      const cat = p._category;
      counts[cat] = (counts[cat] || 0) + 1;
    }

    const priorityOrder = [
      'Journal Papers',
      'Conference Proceedings',
      'Book Chapters',
      'Books',
      'Patents',
      'Academic Publications',
      'Preprints & Working Papers',
    ];

    const sortedCats = Object.keys(counts).sort((a, b) => {
      const idxA = priorityOrder.indexOf(a);
      const idxB = priorityOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedCats.map((cat) => ({
      name: cat,
      count: counts[cat],
    }));
  }, [taggedPublications]);

  // Filter list by selected tab
  const filteredList = useMemo(() => {
    if (activeTab === 'all') return taggedPublications;
    return taggedPublications.filter((p) => p._category === activeTab);
  }, [taggedPublications, activeTab]);

  if (!publications || publications.length === 0) return null;

  return (
    <section id="publications" className="scroll-mt-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b-2 border-slate-100 pb-3">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Publications</h2>
        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredList.length} of {taggedPublications.length}{' '}
          {taggedPublications.length === 1 ? 'publication' : 'publications'}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        Journal papers, conference proceedings, book chapters, and academic publications.
      </p>

      {/* Segregation Filter Tabs */}
      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#002147] text-white shadow-sm ring-2 ring-[#002147]/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>All Publications</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {taggedPublications.length}
            </span>
          </button>

          {categories.map((cat) => {
            const isActive = activeTab === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveTab(cat.name)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#002147] text-white shadow-sm ring-2 ring-[#002147]/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Publications List */}
      <div className="mt-4 space-y-4">
        {filteredList.map((p, i) => (
          <div
            key={i}
            className="p-5 rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-[#002147]/40 transition-all duration-150"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                {/* Category Badge & Year */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryBadgeColor(
                      p._category
                    )}`}
                  >
                    {p._category}
                  </span>
                  {p.year && (
                    <span className="text-xs font-bold text-slate-400">
                      • {p.year}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-slate-900 text-base leading-snug">
                  {safe(p.link) ? (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#002147] hover:text-[#e31e34] hover:underline"
                    >
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}
                </h3>

                {/* Authors */}
                {p.authors && (
                  <p className="text-xs text-slate-600 mt-1.5 font-medium">{p.authors}</p>
                )}

                {/* Venue */}
                {p.venue && (
                  <p className="text-xs text-slate-500 mt-1 italic">
                    {p.venue}
                  </p>
                )}

                {/* Custom Fields */}
                {renderCustomFields &&
                  renderCustomFields(p, ['title', 'authors', 'venue', 'year', 'link', 'type', 'category', '_category'])}
              </div>

              {/* View Link */}
              {safe(p.link) && (
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start shrink-0 px-3 py-1.5 rounded-lg bg-[#eff4fa] text-[#002147] hover:bg-[#002147] hover:text-white text-xs font-semibold border border-[#dbe6f5] transition-colors"
                >
                  View Paper &rarr;
                </a>
              )}
            </div>
          </div>
        ))}

        {filteredList.length === 0 && (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-sm">
            No publications found in this category.
          </div>
        )}
      </div>
    </section>
  );
}
