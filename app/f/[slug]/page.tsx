import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseAdmin, currentOwner } from '@/lib/supabase';
import type { PortfolioData } from '@/lib/schema';
import PortfolioSidebar from '@/components/PortfolioSidebar';

type Props = { params: Promise<{ slug: string }> };

async function getRow(slug: string) {
  const admin = supabaseAdmin();
  const { data } = await admin.from('portfolios').select('owner_email,status,data').eq('slug', slug).maybeSingle();
  return data as { owner_email: string; status: string; data: PortfolioData } | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getRow(slug);
  return {
    title: row?.data.name ? `${row.data.name} | Faculty Portfolio` : 'Faculty Portfolio',
    robots: row?.status === 'published' ? undefined : { index: false },
  };
}

const safe = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : undefined);

export default async function Portfolio({ params }: Props) {
  const { slug } = await params;
  const row = await getRow(slug);
  if (!row) notFound();

  // If in draft mode, only allow the owner to preview
  if (row.status === 'draft') {
    const me = await currentOwner();
    if (!me || me.ownerEmail !== row.owner_email) {
      notFound();
    }
  }

  const d = row.data;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row-reverse justify-between items-start font-sans">
      {/* Sticky Right Sidebar */}
      <PortfolioSidebar data={d} slug={slug} />

      {/* Main Content Area (Left side) */}
      <main className="flex-1 w-full min-w-0 bg-white min-h-screen border-r border-slate-200">
        {/* Draft Notice if unpublished */}
        {row.status === 'draft' && (
          <div className="bg-amber-500/10 border-b border-amber-300 px-6 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-xs sm:text-sm">
              Draft Preview — Only you can see this page until you publish it from your dashboard.
            </span>
            <a href="/portal" className="text-amber-800 underline font-semibold text-xs">
              Back to Dashboard &rarr;
            </a>
          </div>
        )}

        {/* Hero Architectural Campus Banner */}
        <div className="relative h-60 sm:h-80 w-full overflow-hidden bg-slate-800 select-none">
          <img
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80"
            alt="Campus Architecture"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          <div className="absolute bottom-6 left-6 sm:left-10 text-white max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-md">
              {d.name || 'Faculty Portfolio'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium drop-shadow-sm">
              {[d.designation, d.department, d.institution].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>

        {/* Content Body Container */}
        <div className="px-6 sm:px-12 py-10 space-y-16 max-w-4xl">
          {/* Section: Short Bio */}
          {d.bio && (
            <section id="about" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-100 pb-3 tracking-tight">
                Short bio
              </h2>
              <div className="mt-5 text-slate-700 leading-relaxed text-base font-normal space-y-4">
                <p className="whitespace-pre-line">{d.bio}</p>
              </div>
            </section>
          )}

          {/* Section: Teaching */}
          {Array.isArray(d.courses) && d.courses.length > 0 && (
            <section id="teaching" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-100 pb-3 tracking-tight">
                Teaching
              </h2>
              <p className="mt-3 italic text-sm text-slate-500">
                &ldquo;Qui ne continue pas d&apos;apprendre est indigne d&apos;enseigner.&rdquo; — Gaston Bachelard
              </p>

              <div className="mt-6">
                <h3 className="text-base font-bold text-slate-800 mb-4">Current & Previous Courses</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {d.courses.map((course, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-300 transition-all duration-150 group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#2547d0] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                          <path d="M6 6h10" />
                          <path d="M6 10h10" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {typeof course === 'string' ? course : (course as any).name || 'Course Module'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">Faculty Course Module</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Section: Research & Development */}
          {((Array.isArray(d.research_interests) && d.research_interests.length > 0) || (Array.isArray(d.projects) && d.projects.length > 0)) && (
            <section id="research" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-100 pb-3 tracking-tight">
                Research & Development
              </h2>
              <p className="mt-3 italic text-sm text-slate-500">
                &ldquo;The Best for the Group comes when everyone in the group does what&apos;s best for himself AND the group.&rdquo; — John Nash
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Research Interests */}
                {Array.isArray(d.research_interests) && d.research_interests.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2547d0]" />
                      Research Interests
                    </h3>
                    <ul className="space-y-2.5 pl-1">
                      {d.research_interests.map((r, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                          <span className="text-[#2547d0] font-bold mt-0.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Projects */}
                {Array.isArray(d.projects) && d.projects.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2547d0]" />
                      Projects
                    </h3>
                    <div className="space-y-3.5">
                      {d.projects.map((p, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 transition-colors">
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="font-semibold text-slate-900 text-sm">
                              {safe(p.link) ? (
                                <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[#2547d0] hover:underline">
                                  {p.title}
                                </a>
                              ) : (
                                p.title
                              )}
                            </h4>
                            {p.year && <span className="text-xs font-semibold text-slate-500 shrink-0">{p.year}</span>}
                          </div>
                          {p.description && <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{p.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section: Experience & Education */}
          {((Array.isArray(d.experience) && d.experience.length > 0) || (Array.isArray(d.education) && d.education.length > 0)) && (
            <section id="experience" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-100 pb-3 tracking-tight">
                Experience & Education
              </h2>

              <div className="mt-8 space-y-10">
                {/* Work Experience */}
                {Array.isArray(d.experience) && d.experience.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-slate-800 mb-4">Academic & Professional Experience</h3>
                    <div className="relative pl-6 border-l-2 border-blue-200 space-y-6">
                      {d.experience.map((e, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#2547d0] border-2 border-white shadow-sm" />
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-bold text-slate-900 text-base">{e.role}</p>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2547d0] border border-blue-200">
                              {[e.start, e.end].filter(Boolean).join(' – ') || 'Present'}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[#2547d0] mt-0.5">{e.organization}</p>
                          {e.description && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{e.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {Array.isArray(d.education) && d.education.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-slate-800 mb-4">Education</h3>
                    <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                      {d.education.map((e, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white shadow-sm" />
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-bold text-slate-900 text-base">{e.degree}</p>
                            {e.year && <span className="text-xs text-slate-500 font-semibold">{e.year}</span>}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{e.institution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section: Publications */}
          {Array.isArray(d.publications) && d.publications.length > 0 && (
            <section id="publications" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-100 pb-3 tracking-tight">
                Publications
              </h2>
              <p className="mt-3 text-sm text-slate-500">
                Selected journal papers, conference proceedings, and book chapters.
              </p>

              <div className="mt-6 space-y-4">
                {d.publications.map((p, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-blue-300 transition-all duration-150"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-base leading-snug">
                          {safe(p.link) ? (
                            <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[#2547d0] hover:underline">
                              {p.title}
                            </a>
                          ) : (
                            p.title
                          )}
                        </h3>
                        {p.authors && (
                          <p className="text-xs text-slate-600 mt-1.5 font-medium">
                            {p.authors}
                          </p>
                        )}
                        {p.venue && (
                          <p className="text-xs text-slate-500 mt-1 italic">
                            {p.venue} {p.year ? `(${p.year})` : ''}
                          </p>
                        )}
                      </div>
                      {safe(p.link) && (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="self-start shrink-0 px-3 py-1.5 rounded-lg bg-blue-50 text-[#2547d0] hover:bg-[#2547d0] hover:text-white text-xs font-semibold border border-blue-200 transition-colors"
                        >
                          View Paper &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Awards */}
          {Array.isArray(d.awards) && d.awards.length > 0 && (
            <section id="awards" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-100 pb-3 tracking-tight">
                Honors & Awards
              </h2>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {d.awards.map((a, i) => (
                  <div key={i} className="p-4 rounded-xl border border-amber-200/90 bg-amber-50/50 flex items-start gap-3 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{a.title}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">{[a.issuer, a.year].filter(Boolean).join(' • ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Contact & Location */}
          <section id="contact" className="scroll-mt-6 pt-4 border-t border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5 tracking-tight">
              <svg className="w-6 h-6 text-[#2547d0] fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Contact Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Contact Info Details */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                {d.visible?.address && d.contact?.address && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campus Address</p>
                    <p className="text-sm font-medium text-slate-800 mt-1 whitespace-pre-line">{d.contact.address}</p>
                  </div>
                )}

                {d.visible?.office && d.contact?.office && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Office</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">{d.contact.office}</p>
                  </div>
                )}

                {d.visible?.email && d.contact?.email && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</p>
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(d.contact.email)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-[#2547d0] hover:underline mt-1 block"
                    >
                      {d.contact.email}
                    </a>
                  </div>
                )}

                {d.visible?.phone && d.contact?.phone && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">{d.contact.phone}</p>
                  </div>
                )}
              </div>

              {/* Interactive Campus Map Card */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 shadow-inner h-64 relative">
                <iframe
                  title="Campus Map"
                  className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-300"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(d.contact?.address || d.institution || 'University Campus')}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  loading="lazy"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Page Footer */}
        <footer className="mt-20 border-t border-slate-200 px-8 py-6 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} {d.name || 'Faculty'}. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
