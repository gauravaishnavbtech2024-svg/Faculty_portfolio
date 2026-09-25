'use client';

import { useState, useEffect } from 'react';
import type { PortfolioData } from '@/lib/schema';
import { normalizeUrl } from '@/lib/normalizeUrl';

type Props = {
  data: PortfolioData;
  slug: string;
};

export default function PortfolioSidebar({ data }: Props) {
  const [activeSection, setActiveSection] = useState('about');
  const [imgError, setImgError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ScrollSpy to highlight active section in sidebar
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ['about', 'teaching', 'research', 'experience', 'publications', 'awards', 'contact'];

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.45) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'about', label: 'About me', show: !!data.bio },
    { id: 'teaching', label: 'Teaching', show: Array.isArray(data.courses) && data.courses.length > 0 },
    {
      id: 'research',
      label: 'Research & Development',
      show: (Array.isArray(data.research_interests) && data.research_interests.length > 0) || (Array.isArray(data.projects) && data.projects.length > 0),
    },
    {
      id: 'experience',
      label: 'Experience & Education',
      show: (Array.isArray(data.experience) && data.experience.length > 0) || (Array.isArray(data.education) && data.education.length > 0),
    },
    { id: 'publications', label: 'Publications', show: Array.isArray(data.publications) && data.publications.length > 0 },
    { id: 'awards', label: 'Honors & Awards', show: Array.isArray(data.awards) && data.awards.length > 0 },
    { id: 'contact', label: 'Contact', show: true },
  ].filter((item) => item.show);

  const initialLetter = data.name ? data.name.trim().charAt(0).toUpperCase() : 'P';

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -20;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const socialPlatforms = [
    {
      key: 'scholar',
      name: 'Google Scholar',
      url: normalizeUrl(data.links?.scholar, 'scholar'),
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.838 3.94A8 8 0 0 1 12 9a8 8 0 0 1 7.162 4.44L24 9.5z" />
        </svg>
      ),
    },
    {
      key: 'linkedin',
      name: 'LinkedIn',
      url: normalizeUrl(data.links?.linkedin, 'linkedin'),
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
    {
      key: 'github',
      name: 'GitHub',
      url: normalizeUrl(data.links?.github, 'github'),
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      ),
    },
    {
      key: 'orcid',
      name: 'ORCID iD',
      url: normalizeUrl(data.links?.orcid, 'orcid'),
      icon: <span className="text-[11px] font-extrabold tracking-tight">iD</span>,
    },
    {
      key: 'researchgate',
      name: 'ResearchGate',
      url: normalizeUrl(data.links?.researchgate, 'researchgate'),
      icon: <span className="text-[11px] font-extrabold tracking-tight">RG</span>,
    },
    {
      key: 'dblp',
      name: 'DBLP Bibliography',
      url: normalizeUrl(data.links?.dblp, 'dblp'),
      icon: <span className="text-[10px] font-extrabold tracking-tight">dblp</span>,
    },
    {
      key: 'website',
      name: 'Personal Website',
      url: normalizeUrl(data.links?.website, 'website'),
      icon: (
        <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      key: 'email',
      name: 'Gmail Faculty',
      url: data.visible?.email !== false && data.contact?.email
        ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(data.contact.email)}`
        : null,
      icon: (
        <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
  ];

  const renderSocialIcons = () => (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {socialPlatforms.map((p) => {
        if (p.url) {
          return (
            <a
              key={p.key}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${p.name} (Click to open)`}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#e31e34] text-white flex items-center justify-center transition-all duration-150 shadow-sm cursor-pointer hover:scale-110"
            >
              {p.icon}
            </a>
          );
        }
        return (
          <span
            key={p.key}
            title={`${p.name} (Not provided)`}
            className="w-8 h-8 rounded-full bg-white/5 text-white/30 flex items-center justify-center cursor-default shadow-sm select-none"
          >
            {p.icon}
          </span>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden w-full bg-[#002147] text-white p-4 sticky top-0 z-40 flex items-center justify-between shadow-md border-b-2 border-[#e31e34]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white/80 bg-[#001633] flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
            {data.photo_url && !imgError ? (
              <img
                src={data.photo_url}
                alt=""
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initialLetter}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{data.name || 'Faculty Member'}</p>
            <p className="text-xs text-blue-200 truncate">{data.designation || 'Faculty'}</p>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <svg className="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M4 12h16M4 6h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Dropdown Nav Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden w-full bg-[#001633] text-white py-3 px-4 border-b border-[#e31e34] sticky top-16 z-30 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <ul className="space-y-1 mb-4">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => scrollTo(item.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    activeSection === item.id ? 'bg-[#e31e34] text-white font-bold' : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="pt-3 border-t border-white/15">
            {renderSocialIcons()}
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:flex w-80 shrink-0 bg-[#002147] text-white shadow-2xl lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto flex-col justify-between custom-scrollbar z-30 select-none border-r border-[#001633]">
        {/* Top Profile Card */}
        <div className="p-8 text-center flex flex-col items-center">
          {/* Avatar Frame */}
          <div className="relative mb-5">
            <div className="w-32 h-32 rounded-full border-4 border-white/90 shadow-xl bg-[#001633] overflow-hidden flex items-center justify-center">
              {data.photo_url && !imgError ? (
                <img
                  src={data.photo_url}
                  alt=""
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#002147] to-[#0a356c] flex items-center justify-center text-4xl font-extrabold text-white tracking-wider">
                  {initialLetter}
                </div>
              )}
            </div>
          </div>

          {/* Name & Academic Title */}
          <h1 className="text-xl font-bold tracking-tight text-white leading-snug">
            {data.name || 'Faculty Member'}
          </h1>

          {data.designation && (
            <p className="mt-1.5 text-sm text-blue-100 font-medium leading-tight">
              {data.designation}
            </p>
          )}

          {data.department && (
            <p className="text-xs text-blue-200 mt-1">
              {data.department}
            </p>
          )}

          {data.institution && (
            <p className="text-xs font-semibold text-white/90 mt-1">
              @ {data.institution}
            </p>
          )}

          {data.affiliation_badge && (
            <div className="mt-3.5 inline-block rounded-full bg-white/15 backdrop-blur-sm px-3.5 py-1 text-xs font-medium text-white border border-white/25 shadow-sm">
              {data.affiliation_badge}
            </div>
          )}
        </div>

        {/* Vertical Navigation Links */}
        <nav className="my-2 flex-1">
          <ul className="flex flex-col">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => scrollTo(item.id)}
                    className={`w-full text-left px-8 py-3 text-sm font-semibold tracking-wide transition-all duration-150 flex items-center justify-between ${
                      isActive
                        ? 'bg-white/15 text-white font-bold pl-9 border-r-4 border-[#e31e34]'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#e31e34] animate-pulse" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Social / Academic Icons Bar */}
        <div className="p-5 border-t border-white/15 bg-[#001633] shrink-0">
          {renderSocialIcons()}
        </div>
      </aside>
    </>
  );
}
