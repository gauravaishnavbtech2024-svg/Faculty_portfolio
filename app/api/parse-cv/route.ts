import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';
import { currentOwner, supabaseAdmin } from '@/lib/supabase';
import { PortfolioData } from '@/lib/schema';
import { generateUniqueSlug } from '@/lib/slug';
import { normalizeUrl } from '@/lib/normalizeUrl';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX = 4 * 1024 * 1024; // Vercel rejects request bodies above ~4.5 MB

const PROMPT = `You are an expert academic curriculum vitae (CV) parser. Extract exhaustive, complete, and structured information from this faculty CV.

CRITICAL EXTRACTION REQUIREMENTS (DO NOT SHORTEN OR OMIT):
- DO NOT SHORTEN, SUMMARIZE, TRUNCATE, OR LIMIT ANY SECTION.
- Extract EVERY SINGLE ITEM present in the CV without exception (e.g. all 100% of publications, every work experience, all degrees, all projects, all awards, all taught courses, all research interests).
- Preserve all details and column attributes present in the CV tables or lists (e.g., DOI, volume, issue, page numbers, publishers, supervisor, CGPA, funding amount, dates).
- If the CV contains additional sections not fitting the standard fields (e.g. Patents, Certifications, Ph.D. Guidance, Workshops/FDPs Attended/Conducted, Keynote Talks, Professional Memberships, Administrative Roles), extract each into "custom_sections".

Return ONLY valid JSON matching this structure:
{
  "name": "",
  "designation": "",
  "department": "",
  "institution": "",
  "affiliation_badge": "",
  "photo_url": "",
  "bio": "",
  "education": [
    { "degree": "", "institution": "", "year": "" }
  ],
  "experience": [
    { "role": "", "organization": "", "start": "", "end": "", "description": "" }
  ],
  "publications": [
    { "title": "", "authors": "", "venue": "", "year": "", "link": "" }
  ],
  "projects": [
    { "title": "", "description": "", "year": "", "link": "" }
  ],
  "awards": [
    { "title": "", "issuer": "", "year": "" }
  ],
  "courses": [
    ""
  ],
  "research_interests": [
    ""
  ],
  "custom_sections": [
    {
      "title": "",
      "items": [
        { "title": "", "description": "", "year": "" }
      ]
    }
  ],
  "links": {
    "scholar": "",
    "scopus": "",
    "vidwan": "",
    "orcid": "",
    "researchgate": "",
    "linkedin": "",
    "github": "",
    "dblp": "",
    "website": ""
  },
  "contact": {
    "email": "",
    "phone": "",
    "office": "",
    "address": ""
  }
}

Field extraction rules:
1. "name": Full name of the faculty member (e.g., "Dr. Mohamed-Lamine MESSAI").
2. "designation": Academic title (e.g., "Associate Professor", "Assistant Professor", "Professor", "Dean").
3. "department": Academic department / Faculty (e.g., "Department of Computer Science & Engineering").
4. "institution": University or institution name (e.g., "The ICFAI University, Jaipur").
5. "affiliation_badge": Notable professional memberships / designations (e.g. "Senior Member IEEE", "ACM Member", "Fellow").
6. "bio": A thorough, accurate academic biography covering background, research expertise, teaching philosophy, and achievements.
7. "courses": Complete list of ALL courses and subjects taught.
8. "research_interests": Complete list of ALL research areas and interest topics.
9. "publications": Exhaustive list of ALL research papers, journal articles, conference proceedings, book chapters, and books. For each publication, include title, authors, venue/journal name, year, link/DOI, and any additional fields present in the CV.
10. "education": Complete academic qualifications (Ph.D., Master's, Bachelor's, etc.) with degree, institution, year, plus any extra fields (e.g. specialization, grade, supervisor).
11. "experience": Complete employment and professional history.
12. "projects": Complete list of all research projects, funded grants, and industrial consultancy.
13. "awards": Complete list of all honors, awards, fellowships, and medals.
14. "custom_sections": Any other distinct sections from the CV (e.g., "Patents", "Certifications", "Workshops & Seminars", "PhD Guidance", "Memberships", "Keynote Addresses").
15. "links": Search the CV for all academic & profile links:
    - Scopus Author ID / URL (scopus.com or numeric author ID)
    - Vidwan Profile ID / URL (vidwan.inflibnet.ac.in or Vidwan ID)
    - Google Scholar profile URL
    - ORCID ID / URL
    - ResearchGate profile URL
    - LinkedIn profile URL
    - GitHub profile URL
    - DBLP profile URL
    - Personal / lab website URL
    IMPORTANT FOR HYPERLINKS: If the document has embedded hyperlinks or clickable icons/text, extract the underlying target URL.
16. "contact": Extract email, phone number, room/office number, and campus address.
17. Leave missing items as empty strings or empty lists. Do not fabricate fake data.`;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

function extractPdfHyperlinks(buf: Buffer): string[] {
  const content = buf.toString('latin1');
  const urls = new Set<string>();

  // Extract /URI (http...) or /URI <hex> annotations
  const uriRegex = /\/URI\s*\(([^)]+)\)/g;
  let m;
  while ((m = uriRegex.exec(content)) !== null) {
    const raw = m[1].replace(/\\([()\\])/g, '$1').trim();
    if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw)) {
      urls.add(raw);
    }
  }

  // Extract explicit http:// or https:// patterns in stream text
  const httpRegex = /https?:\/\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=%]+/g;
  while ((m = httpRegex.exec(content)) !== null) {
    const raw = m[0].replace(/[),;.]+$/, '').trim();
    if (raw.length > 8) {
      urls.add(raw);
    }
  }

  return Array.from(urls);
}

function autoFillLinksFromExtracted(linksObj: Record<string, string>, extractedList: string[]) {
  for (const url of extractedList) {
    const norm = normalizeUrl(url);
    if (!norm) continue;

    if (/scopus\.com/i.test(norm) && (!linksObj.scopus || linksObj.scopus === '')) {
      linksObj.scopus = norm;
    } else if (/vidwan(?:\.inflibnet\.ac\.in)?/i.test(norm) && (!linksObj.vidwan || linksObj.vidwan === '')) {
      linksObj.vidwan = norm;
    } else if (/linkedin\.com/i.test(norm) && (!linksObj.linkedin || linksObj.linkedin === '')) {
      linksObj.linkedin = norm;
    } else if (/github\.com/i.test(norm) && (!linksObj.github || linksObj.github === '')) {
      linksObj.github = norm;
    } else if (/scholar\.google/i.test(norm) && (!linksObj.scholar || linksObj.scholar === '')) {
      linksObj.scholar = norm;
    } else if (/orcid\.org/i.test(norm) && (!linksObj.orcid || linksObj.orcid === '')) {
      linksObj.orcid = norm;
    } else if (/researchgate\.net/i.test(norm) && (!linksObj.researchgate || linksObj.researchgate === '')) {
      linksObj.researchgate = norm;
    } else if (/dblp\.(?:org|uni)/i.test(norm) && (!linksObj.dblp || linksObj.dblp === '')) {
      linksObj.dblp = norm;
    }
  }
}

export async function POST(req: Request) {
  const me = await currentOwner();
  if (!me) return fail('Not authorized.', 401);

  const file = (await req.formData()).get('file');
  if (!(file instanceof File)) return fail('No file received.', 400);
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith('.pdf'), isDocx = name.endsWith('.docx');
  if (!isPdf && !isDocx) return fail('Only PDF or DOCX files are accepted.', 400);
  if (file.size > MAX) return fail('File is larger than 4 MB.', 400);

  const buf = Buffer.from(await file.arrayBuffer());
  let data: PortfolioData;
  const extractedPdfLinks: string[] = [];

  try {
    let parts: any[] = [];

    if (isPdf) {
      const pdfLinks = extractPdfHyperlinks(buf);
      extractedPdfLinks.push(...pdfLinks);
      const linksContext = pdfLinks.length > 0
        ? `\n\n[EMBEDDED HYPERLINKS & ANNOTATION URIS EXTRACTED FROM THIS PDF DOCUMENT]:\n${pdfLinks.map((l) => `- ${l}`).join('\n')}\n`
        : '';

      parts = [
        { text: PROMPT + linksContext },
        { inlineData: { mimeType: 'application/pdf', data: buf.toString('base64') } },
      ];
    } else {
      // For DOCX: convert to HTML which preserves all <a href="..."> hyperlinks
      const htmlRes = await mammoth.convertToHtml({ buffer: buf });
      const htmlContent = htmlRes.value;

      // Also extract any hrefs from the HTML
      const hrefRegex = /href="([^"]+)"/g;
      let match;
      while ((match = hrefRegex.exec(htmlContent)) !== null) {
        if (/^https?:\/\//i.test(match[1])) {
          extractedPdfLinks.push(match[1]);
        }
      }

      parts = [
        { text: `${PROMPT}\n\n[DOCUMENT CONTENT IN HTML WITH EMBEDDED HYPERLINKS]:\n${htmlContent}` },
      ];
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
    ].filter(Boolean) as string[];

    let rawText = '';
    let lastError: unknown = null;

    for (const model of Array.from(new Set(candidateModels))) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: { responseMimeType: 'application/json' },
        });
        if (res.text) {
          rawText = res.text;
          break;
        }
      } catch (e) {
        lastError = e;
        console.warn(`[PARSE CV] Model ${model} failed, trying fallback...`, e);
      }
    }

    if (!rawText) {
      throw lastError || new Error('No response received from AI model');
    }

    const cleanJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    data = PortfolioData.parse(JSON.parse(cleanJson));
  } catch (err) {
    console.error('[DEBUG PARSE CV ERROR]:', err);
    return fail('We could not read this CV. Try a text-based PDF or a DOCX file.', 422);
  }

  // Normalize all social media and profile links
  if (!data.links) {
    data.links = { scholar: '', scopus: '', vidwan: '', linkedin: '', orcid: '', github: '', researchgate: '', dblp: '', website: '' };
  }

  // Auto-fill any missing links from embedded document annotations
  if (extractedPdfLinks.length > 0) {
    autoFillLinksFromExtracted(data.links as Record<string, string>, extractedPdfLinks);
  }

  for (const key of Object.keys(data.links)) {
    const normalized = normalizeUrl(String(data.links[key] || ''), key);
    data.links[key] = normalized || '';
  }

  data.visible = { email: true, phone: false, office: true, address: true }; // phone hidden by default

  const admin = supabaseAdmin();
  const path = `${me.ownerEmail}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
  await admin.storage.from('cvs').upload(path, buf, { contentType: file.type });

  const slug = await generateUniqueSlug(data.name, me.ownerEmail);

  const { data: existing } = await admin.from('portfolios').select('id,slug').eq('owner_email', me.ownerEmail).maybeSingle();
  if (existing) {
    await admin.from('portfolios').update({ data, slug, cv_path: path, updated_at: new Date().toISOString() }).eq('id', existing.id);
    if (existing.slug && existing.slug !== slug) {
      revalidatePath(`/f/${existing.slug}`);
    }
    revalidatePath(`/f/${slug}`);
    revalidatePath('/portal');
    return NextResponse.json({ slug });
  }

  const { error } = await admin.from('portfolios').insert({ owner_email: me.ownerEmail, slug, data, cv_path: path });
  if (error) return fail('Could not save your portfolio. Try again.', 500);
  revalidatePath(`/f/${slug}`);
  revalidatePath('/portal');
  return NextResponse.json({ slug });
}
