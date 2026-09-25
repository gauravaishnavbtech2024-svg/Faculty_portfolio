import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';
import { currentOwner, supabaseAdmin } from '@/lib/supabase';
import { PortfolioData } from '@/lib/schema';

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
9. "links": Search the CV for Google Scholar, LinkedIn, GitHub, ORCID, ResearchGate, DBLP, or personal homepage URLs.
10. "contact": Extract email, phone number, room/office number, and university campus address.
11. Leave missing items as empty strings or empty lists. Do not fabricate information.`;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

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
  try {
    const part = isPdf
      ? { inlineData: { mimeType: 'application/pdf', data: buf.toString('base64') } }
      : { text: (await mammoth.extractRawText({ buffer: buf })).value };
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
          contents: [{ role: 'user', parts: [{ text: PROMPT }, part] }],
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
  data.visible = { email: true, phone: false, office: true, address: true }; // phone hidden by default

  const admin = supabaseAdmin();
  const path = `${me.ownerEmail}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
  await admin.storage.from('cvs').upload(path, buf, { contentType: file.type });

  const { data: existing } = await admin.from('portfolios').select('id,slug').eq('owner_email', me.ownerEmail).maybeSingle();
  if (existing) {
    await admin.from('portfolios').update({ data, cv_path: path, updated_at: new Date().toISOString() }).eq('id', existing.id);
    revalidatePath(`/f/${existing.slug}`);
    return NextResponse.json({ slug: existing.slug });
  }

  const base = (data.name || me.ownerEmail.split('@')[0]).toLowerCase()
    .replace(/^(dr|prof|mr|mrs|ms)\.?\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'faculty';
  let slug = base;
  for (let i = 2; ; i++) {
    const { data: taken } = await admin.from('portfolios').select('id').eq('slug', slug).maybeSingle();
    if (!taken) break;
    slug = `${base}-${i}`;
  }
  const { error } = await admin.from('portfolios').insert({ owner_email: me.ownerEmail, slug, data, cv_path: path });
  if (error) return fail('Could not save your portfolio. Try again.', 500);
  return NextResponse.json({ slug });
}
