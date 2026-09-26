'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useTransition, useRef } from 'react';
import { saveData } from '../actions';
import type { PortfolioData, CustomSection } from '@/lib/schema';
import ImageCropModal from '@/components/ImageCropModal';

const DEFAULT_SECTION_COLUMNS: Record<string, string[]> = {
  education: ['degree', 'institution', 'year'],
  experience: ['role', 'organization', 'start', 'end', 'description'],
  publications: ['title', 'authors', 'venue', 'year', 'link'],
  projects: ['title', 'description', 'year', 'link'],
  awards: ['title', 'issuer', 'year'],
};

const LINK_LABELS: Record<string, { label: string; placeholder: string }> = {
  scholar: { label: 'Google Scholar', placeholder: 'https://scholar.google.com/citations?user=... or User ID' },
  scopus: { label: 'Scopus Author ID', placeholder: 'https://www.scopus.com/authid/... or Author ID (e.g. 5719382109)' },
  vidwan: { label: 'Vidwan Profile (INFLIBNET)', placeholder: 'https://vidwan.inflibnet.ac.in/profile/... or Vidwan ID' },
  orcid: { label: 'ORCID iD', placeholder: 'https://orcid.org/0000-... or ORCID ID' },
  researchgate: { label: 'ResearchGate', placeholder: 'https://www.researchgate.net/profile/...' },
  linkedin: { label: 'LinkedIn', placeholder: 'https://linkedin.com/in/... or Username' },
  github: { label: 'GitHub', placeholder: 'https://github.com/... or Username' },
  dblp: { label: 'DBLP', placeholder: 'https://dblp.org/pid/... or DBLP ID' },
  website: { label: 'Personal / Lab Website', placeholder: 'https://...' },
};

const cls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors shadow-sm';

function Field({
  k,
  v,
  on,
  area,
  placeholder,
  label,
}: {
  k: string;
  v: string;
  on: (v: string) => void;
  area?: boolean;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold capitalize text-slate-700">
        {label || k.replace(/_/g, ' ')}
      </span>
      {area ? (
        <textarea
          rows={3}
          className={cls}
          value={v || ''}
          placeholder={placeholder}
          onChange={(e) => on(e.target.value)}
        />
      ) : (
        <input
          className={cls}
          value={v || ''}
          placeholder={placeholder}
          onChange={(e) => on(e.target.value)}
        />
      )}
    </label>
  );
}

export default function Editor({ initial }: { initial: PortfolioData }) {
  const [d, setD] = useState<any>(() => {
    const base = {
      name: '',
      designation: '',
      department: '',
      institution: '',
      photo_url: '',
      affiliation_badge: '',
      bio: '',
      education: [],
      experience: [],
      publications: [],
      projects: [],
      awards: [],
      courses: [],
      research_interests: [],
      custom_sections: [],
      section_columns: {},
      links: {
        scholar: '',
        scopus: '',
        vidwan: '',
        orcid: '',
        researchgate: '',
        linkedin: '',
        github: '',
        dblp: '',
        website: '',
      },
      contact: { email: '', phone: '', office: '', address: '' },
      visible: { email: true, phone: false, office: true, address: true },
    };

    // Calculate initial section columns by merging defaults with any custom keys found in initial data
    const computedSectionColumns: Record<string, string[]> = { ...(initial?.section_columns || {}) };
    for (const [sec, defCols] of Object.entries(DEFAULT_SECTION_COLUMNS)) {
      const items = (initial as any)?.[sec] || [];
      const itemKeys = new Set<string>(defCols);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item && typeof item === 'object') {
            for (const k of Object.keys(item)) {
              if (k) itemKeys.add(k);
            }
          }
        }
      }
      if (!computedSectionColumns[sec] || computedSectionColumns[sec].length === 0) {
        computedSectionColumns[sec] = Array.from(itemKeys);
      } else {
        const merged = new Set([...computedSectionColumns[sec], ...itemKeys]);
        computedSectionColumns[sec] = Array.from(merged);
      }
    }

    return {
      ...base,
      ...(initial || {}),
      section_columns: computedSectionColumns,
      links: { ...base.links, ...(initial?.links || {}) },
      contact: { ...base.contact, ...(initial?.contact || {}) },
      visible: { ...base.visible, ...(initial?.visible || {}) },
    };
  });

  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const [selectedCropFile, setSelectedCropFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal / prompt state for adding custom column
  const [activeAddColSec, setActiveAddColSec] = useState<string | null>(null);
  const [newColName, setNewColName] = useState('');

  // State for adding a brand new custom section
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const upd = (fn: (c: any) => void) => {
    setD((p: any) => {
      const c = structuredClone(p);
      fn(c);
      return c;
    });
    setMsg('');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCropFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setSelectedCropFile(null);
    setUploadingPhoto(true);
    setMsg('Uploading photo to storage...');

    const formData = new FormData();
    formData.append('file', croppedBlob, 'avatar.jpg');

    try {
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setPreviewError(false);
      upd((c) => {
        c.photo_url = data.url;
      });
      setMsg('Photo uploaded and applied successfully! Click "Save Changes" to persist.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Photo upload failed.');
    }
    setUploadingPhoto(false);
  };

  const handleAddColumn = (secKey: string) => {
    const colKey = newColName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!colKey) return;

    upd((c) => {
      c.section_columns = c.section_columns || {};
      const cur = c.section_columns[secKey] || DEFAULT_SECTION_COLUMNS[secKey] || ['title', 'description', 'year'];
      if (!cur.includes(colKey)) {
        c.section_columns[secKey] = [...cur, colKey];
      }
      // initialize empty value for this column on existing items
      if (Array.isArray(c[secKey])) {
        for (const it of c[secKey]) {
          if (it && typeof it === 'object' && it[colKey] === undefined) {
            it[colKey] = '';
          }
        }
      }
    });

    setNewColName('');
    setActiveAddColSec(null);
  };

  const handleRemoveColumn = (secKey: string, colKey: string) => {
    if (confirm(`Remove column "${colKey}" from ${secKey}?`)) {
      upd((c) => {
        c.section_columns = c.section_columns || {};
        const cur = c.section_columns[secKey] || DEFAULT_SECTION_COLUMNS[secKey] || [];
        c.section_columns[secKey] = cur.filter((k: string) => k !== colKey);
      });
    }
  };

  const handleAddCustomSection = () => {
    const title = newSectionTitle.trim();
    if (!title) return;

    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    upd((c) => {
      c.custom_sections = c.custom_sections || [];
      const newSec: CustomSection = {
        id,
        title,
        columns: ['title', 'description', 'year'],
        items: [{ title: '', description: '', year: '' }],
      };
      c.custom_sections.push(newSec);
    });

    setNewSectionTitle('');
    setShowAddSectionModal(false);
  };

  const handleAddColumnToCustomSection = (secIdx: number, colName: string) => {
    const colKey = colName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!colKey) return;

    upd((c) => {
      const sec = c.custom_sections[secIdx];
      if (sec) {
        sec.columns = sec.columns || ['title', 'description', 'year'];
        if (!sec.columns.includes(colKey)) {
          sec.columns.push(colKey);
        }
        if (Array.isArray(sec.items)) {
          for (const it of sec.items) {
            if (it && typeof it === 'object' && it[colKey] === undefined) {
              it[colKey] = '';
            }
          }
        }
      }
    });
  };

  const save = () =>
    start(async () => {
      const strip = (a: any[]) =>
        Array.isArray(a)
          ? a.map((x) => (typeof x === 'string' ? x.trim() : x)).filter(Boolean)
          : [];
      try {
        await saveData({
          ...d,
          courses: strip(d.courses),
          research_interests: strip(d.research_interests),
        });
        setMsg('All changes saved successfully!');
      } catch (e) {
        console.error(e);
        setMsg('Could not save changes. Please try again.');
      }
    });

  const initialLetter = d.name ? d.name.trim().charAt(0).toUpperCase() : 'P';

  return (
    <div className="space-y-10 pb-32">
      {/* Interactive Crop Modal */}
      {selectedCropFile && (
        <ImageCropModal
          file={selectedCropFile}
          onCropComplete={handleCropComplete}
          onCancel={() => setSelectedCropFile(null)}
        />
      )}

      {/* Profile Photo Uploader */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5">
          Profile Photo
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar Preview */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-full border-4 border-[#002147]/20 bg-slate-100 shadow-md overflow-hidden flex items-center justify-center">
              {d.photo_url && !previewError ? (
                <img
                  src={d.photo_url}
                  alt=""
                  onError={() => setPreviewError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#002147] to-[#0a356c] flex items-center justify-center text-3xl font-extrabold text-white">
                  {initialLetter}
                </div>
              )}
            </div>

            {uploadingPhoto && (
              <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-semibold gap-1">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Uploading</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-2 text-center sm:text-left flex-1">
            <p className="text-sm font-bold text-slate-900">Upload Headshot for Website Sidebar</p>
            <p className="text-xs text-slate-500 max-w-md">
              Upload any JPG or PNG. The cropper lets you zoom and center your face inside the circle.
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="inline-flex items-center gap-2 rounded-xl bg-[#002147] hover:bg-[#001633] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-150"
              >
                <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>{d.photo_url ? 'Change Photo & Crop' : 'Upload & Crop Photo'}</span>
              </button>

              {d.photo_url && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewError(false);
                    upd((c) => {
                      c.photo_url = '';
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700 px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* General Information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5">
          General Information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {['name', 'designation', 'department', 'institution', 'affiliation_badge'].map((k) => (
            <Field
              key={k}
              k={k}
              v={d[k]}
              on={(v) =>
                upd((c) => {
                  c[k] = v;
                })
              }
            />
          ))}
          <div className="sm:col-span-2">
            <Field
              k="bio"
              area
              v={d.bio}
              on={(v) =>
                upd((c) => {
                  c.bio = v;
                })
              }
              placeholder="Summary of your research background and academic focus..."
            />
          </div>
        </div>
      </section>

      {/* Dynamic Sections: Education, Experience, Publications, Projects, Awards */}
      {Object.keys(DEFAULT_SECTION_COLUMNS).map((sec) => {
        const activeCols: string[] =
          d.section_columns?.[sec] || DEFAULT_SECTION_COLUMNS[sec] || ['title', 'year'];

        return (
          <section key={sec} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-5 gap-3">
              <div>
                <h2 className="text-lg font-bold capitalize text-slate-900">{sec}</h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Columns:</span>
                  {activeCols.map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                    >
                      <span>{col.replace(/_/g, ' ')}</span>
                      {!DEFAULT_SECTION_COLUMNS[sec].includes(col) && (
                        <button
                          type="button"
                          title="Remove custom column"
                          onClick={() => handleRemoveColumn(sec, col)}
                          className="text-slate-400 hover:text-red-600 font-bold ml-0.5"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Add Custom Column Button */}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setActiveAddColSec(activeAddColSec === sec ? null : sec);
                    setNewColName('');
                  }}
                >
                  <svg className="w-3.5 h-3.5 text-blue-600 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>Add Custom Column</span>
                </button>

                {/* Add Item Button */}
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#002147] text-white hover:bg-[#001633] transition-colors shadow-xs"
                  onClick={() =>
                    upd((c) => {
                      c[sec] = c[sec] || [];
                      c[sec].push(Object.fromEntries(activeCols.map((f) => [f, ''])));
                    })
                  }
                >
                  <span>+ Add {sec.replace(/s$/, '')}</span>
                </button>
              </div>
            </div>

            {/* Inline Add Column Form */}
            {activeAddColSec === sec && (
              <div className="mb-5 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-blue-900">New Column Name:</span>
                <input
                  type="text"
                  placeholder="e.g. DOI, Supervisor, CGPA, Volume, Publisher"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn(sec)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 flex-1 min-w-[200px]"
                />
                <button
                  type="button"
                  onClick={() => handleAddColumn(sec)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-700 text-white hover:bg-blue-800"
                >
                  Add Column
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAddColSec(null)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:bg-slate-200/50"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Section Items */}
            <div className="space-y-4">
              {(d[sec] || []).map((item: any, i: number) => (
                <div
                  key={i}
                  className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 relative group"
                >
                  {activeCols.map((f) => (
                    <div
                      key={f}
                      className={
                        f === 'description' || f === 'title' || f === 'venue' || f === 'authors'
                          ? 'sm:col-span-2'
                          : ''
                      }
                    >
                      <Field
                        k={f}
                        v={item[f] || ''}
                        on={(v) =>
                          upd((c) => {
                            c[sec][i][f] = v;
                          })
                        }
                        area={f === 'description'}
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2 flex justify-end pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                      onClick={() =>
                        upd((c) => {
                          c[sec].splice(i, 1);
                        })
                      }
                    >
                      <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>Delete {sec.replace(/s$/, '')}</span>
                    </button>
                  </div>
                </div>
              ))}
              {(!d[sec] || d[sec].length === 0) && (
                <p className="text-xs text-slate-400 italic">No {sec} records added yet.</p>
              )}
            </div>
          </section>
        );
      })}

      {/* Additional Custom Sections (e.g., Patents, Certifications, PhD Guidance) */}
      {Array.isArray(d.custom_sections) &&
        d.custom_sections.map((cs: CustomSection, secIdx: number) => {
          const secCols: string[] =
            Array.isArray(cs.columns) && cs.columns.length > 0
              ? cs.columns
              : ['title', 'description', 'year'];

          return (
            <section
              key={secIdx}
              className="rounded-2xl border-2 border-blue-200/80 bg-white p-6 shadow-sm relative"
            >
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-5 gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cs.title}
                      onChange={(e) =>
                        upd((c) => {
                          c.custom_sections[secIdx].title = e.target.value;
                        })
                      }
                      className="text-lg font-bold text-slate-900 border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-600 focus:outline-none bg-transparent"
                      placeholder="Section Title"
                    />
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Custom Section
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] font-semibold text-slate-400">Columns:</span>
                    {secCols.map((col) => (
                      <span
                        key={col}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                      >
                        <span>{col.replace(/_/g, ' ')}</span>
                        <button
                          type="button"
                          onClick={() =>
                            upd((c) => {
                              c.custom_sections[secIdx].columns = secCols.filter((k) => k !== col);
                            })
                          }
                          className="text-slate-400 hover:text-red-600 font-bold ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Add Custom Column to this Custom Section */}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => {
                      const colName = prompt('Enter custom column name:');
                      if (colName) handleAddColumnToCustomSection(secIdx, colName);
                    }}
                  >
                    <svg className="w-3.5 h-3.5 text-blue-600 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span>Add Custom Column</span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#002147] text-white hover:bg-[#001633] transition-colors"
                    onClick={() =>
                      upd((c) => {
                        c.custom_sections[secIdx].items = c.custom_sections[secIdx].items || [];
                        c.custom_sections[secIdx].items.push(
                          Object.fromEntries(secCols.map((f) => [f, '']))
                        );
                      })
                    }
                  >
                    <span>+ Add Item</span>
                  </button>

                  <button
                    type="button"
                    title="Delete Custom Section"
                    onClick={() => {
                      if (confirm(`Delete section "${cs.title}"?`)) {
                        upd((c) => {
                          c.custom_sections.splice(secIdx, 1);
                        });
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Items in this custom section */}
              <div className="space-y-4">
                {(cs.items || []).map((item: any, i: number) => (
                  <div
                    key={i}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 relative group"
                  >
                    {secCols.map((f) => (
                      <div
                        key={f}
                        className={f === 'description' || f === 'title' ? 'sm:col-span-2' : ''}
                      >
                        <Field
                          k={f}
                          v={item[f] || ''}
                          on={(v) =>
                            upd((c) => {
                              c.custom_sections[secIdx].items[i][f] = v;
                            })
                          }
                          area={f === 'description'}
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2 flex justify-end pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                        onClick={() =>
                          upd((c) => {
                            c.custom_sections[secIdx].items.splice(i, 1);
                          })
                        }
                      >
                        <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete Item</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

      {/* Button to Add New Custom Section */}
      <div className="flex justify-center">
        {showAddSectionModal ? (
          <div className="w-full max-w-lg p-5 rounded-2xl border border-blue-300 bg-blue-50/60 shadow-md space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Add New Custom Section</h3>
            <p className="text-xs text-slate-600">
              e.g. Patents, Certifications, Workshops & Seminars, Ph.D. Guidance, Memberships
            </p>
            <input
              type="text"
              placeholder="Section Name (e.g. Patents)"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSection()}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomSection}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#002147] hover:bg-[#001633] rounded-lg shadow-sm"
              >
                Create Section
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddSectionModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#002147] hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all"
          >
            <svg className="w-4 h-4 text-[#002147] fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>+ Add Custom Section (Patents, Certifications, Guidance, etc.)</span>
          </button>
        )}
      </div>

      {/* Courses & Research Interests */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5">
          Research & Teaching Modules
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {['research_interests', 'courses'].map((k) => (
            <Field
              key={k}
              k={`${k.replace(/_/g, ' ')} (one per line)`}
              area
              v={(d[k] || [])
                .map((item: any) => (typeof item === 'string' ? item : item.name || ''))
                .join('\n')}
              on={(v) =>
                upd((c) => {
                  c[k] = v.split('\n');
                })
              }
            />
          ))}
        </div>
      </section>

      {/* Links & Contact */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5">
          Academic Links & Contact Details
        </h2>

        <h3 className="text-sm font-bold text-slate-800 mb-3">Academic & Research Profiles</h3>
        <p className="text-xs text-slate-500 mb-4">
          Add your profile links or identifiers. Active links will appear clickable in the sidebar; unprovided ones will be grayed out.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {Object.keys(LINK_LABELS).map((k) => (
            <Field
              key={k}
              k={k}
              label={LINK_LABELS[k].label}
              placeholder={LINK_LABELS[k].placeholder}
              v={d.links?.[k] || ''}
              on={(v) =>
                upd((c) => {
                  c.links[k] = v;
                })
              }
            />
          ))}
        </div>

        <h3 className="text-sm font-bold text-slate-800 mb-3 border-t border-slate-100 pt-5">
          Contact Details & Visibility Toggles
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.keys(d.contact).map((k) => (
            <div key={k} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
              <Field
                k={k}
                v={d.contact[k]}
                on={(v) =>
                  upd((c) => {
                    c.contact[k] = v;
                  })
                }
              />
              <label className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={d.visible[k] ?? true}
                  onChange={(e) =>
                    upd((c) => {
                      c.visible[k] = e.target.checked;
                    })
                  }
                  className="rounded border-slate-300 text-[#002147] focus:ring-[#002147]"
                />
                <span>Show on public page</span>
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Fixed Save Bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur-md p-4 shadow-2xl z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={save}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#002147] hover:bg-[#001633] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-150 disabled:opacity-50"
            >
              {pending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>Save Changes</span>
                </>
              )}
            </button>

            {msg && (
              <span
                className={`text-xs font-semibold ${
                  msg.includes('success') ? 'text-emerald-600' : 'text-slate-600'
                }`}
              >
                {msg}
              </span>
            )}
          </div>

          <a href="/portal" className="text-xs font-bold text-slate-600 hover:text-slate-900 underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
