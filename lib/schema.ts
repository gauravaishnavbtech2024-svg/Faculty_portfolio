import { z } from 'zod';

const s = z.preprocess((v) => (v == null ? '' : String(v)), z.string());
const orElse = (fallback: unknown) => (v: unknown) => v ?? fallback;

export const PortfolioData = z.object({
  name: s,
  designation: s,
  department: s,
  institution: s,
  photo_url: s,
  bio: s,
  affiliation_badge: s,
  education: z.preprocess(orElse([]), z.array(z.object({ degree: s, institution: s, year: s }))),
  experience: z.preprocess(orElse([]), z.array(z.object({ role: s, organization: s, start: s, end: s, description: s }))),
  publications: z.preprocess(orElse([]), z.array(z.object({ title: s, authors: s, venue: s, year: s, link: s }))),
  projects: z.preprocess(orElse([]), z.array(z.object({ title: s, description: s, year: s, link: s }))),
  awards: z.preprocess(orElse([]), z.array(z.object({ title: s, issuer: s, year: s }))),
  courses: z.preprocess(orElse([]), z.array(s)),
  research_interests: z.preprocess(orElse([]), z.array(s)),
  links: z.preprocess(orElse({}), z.object({
    scholar: s,
    linkedin: s,
    orcid: s,
    github: s,
    researchgate: s,
    dblp: s,
    website: s,
  })),
  contact: z.preprocess(orElse({}), z.object({
    email: s,
    phone: s,
    office: s,
    address: s,
  })),
  visible: z.preprocess(orElse({}), z.object({
    email: z.boolean().catch(true),
    phone: z.boolean().catch(false),
    office: z.boolean().catch(true),
    address: z.boolean().catch(true),
  })),
});
export type PortfolioData = z.infer<typeof PortfolioData>;

