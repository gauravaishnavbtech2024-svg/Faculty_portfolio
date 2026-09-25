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

const PROMPT = `You are an expert academic curriculum vitae (CV) parser. Extract comprehensive structured information from this faculty CV.
Return ONLY valid JSON matching this exact structure:
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
  "links": {
    "scholar": "",
    "linkedin": "",
    "orcid": "",
    "github": "",
    "researchgate": "",
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

Extraction guidelines:
1. "name": Full name of the faculty member (e.g., "Dr. Mohamed-Lamine MESSAI").
2. "designation": Academic title (e.g., "Associate Professor", "Assistant Professor", "Professor").
3. "department": Academic department (e.g., "Department of Computer Science").
4. "institution": University or institution name (e.g., "Université Lumière Lyon 2").
5. "affiliation_badge": Professional memberships or prominent honors if mentioned (e.g. "Senior Member of IEEE", "Member of the ACM", "Fellow of Royal Society").
6. "bio": A well-written 2-4 sentence academic biography summarizing their background, research areas, and focus.
7. "courses": List of courses taught (e.g., "Computer Security", "Relational Databases", "Internet of Things").
8. "publications": Include title, co-authors/authors string, conference/journal name in venue, publication year, and DOI/URL link if present.
9. "links": Search the CV for all profile URLs (LinkedIn, Google Scholar, GitHub, ORCID, ResearchGate, DBLP, personal website).
   IMPORTANT FOR HYPERLINKS: If the CV contains hyperlinked text (e.g. text that says "GitHub", "LinkedIn", "Google Scholar", "Profile", or a clickable icon with an embedded URL), you MUST extract the underlying target URL and place it in the appropriate field.
10. "contact": Extract email, phone number, room/office number, and university campus address.
11. Leave missing items as empty strings or empty lists. Do not fabricate information.`;

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

    if (/linkedin\.com/i.test(norm) && (!linksObj.linkedin || linksObj.linkedin === '')) {
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
    data.links = { scholar: '', linkedin: '', orcid: '', github: '', researchgate: '', dblp: '', website: '' };
  }

  // Auto-fill any missing links from embedded document annotations
  if (extractedPdfLinks.length > 0) {
    autoFillLinksFromExtracted(data.links as Record<string, string>, extractedPdfLinks);
  }

  for (const key of Object.keys(data.links) as (keyof typeof data.links)[]) {
    const normalized = normalizeUrl(data.links[key], key);
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
