import { z } from 'zod';

const s = z.preprocess((v) => (v == null ? '' : String(v)), z.string());
const orElse = (fallback: unknown) => (v: unknown) => v ?? fallback;

const dynamicItem = z.record(z.string(), z.any());

export const CustomSection = z.object({
  id: s.optional(),
  title: s,
  columns: z.preprocess(orElse([]), z.array(s)).optional(),
  items: z.preprocess(orElse([]), z.array(dynamicItem)),
});
export type CustomSection = z.infer<typeof CustomSection>;

export const PortfolioData = z.object({
  name: s,
  designation: s,
  department: s,
  institution: s,
  photo_url: s,
  bio: s,
  affiliation_badge: s,
  education: z.preprocess(orElse([]), z.array(dynamicItem)),
  experience: z.preprocess(orElse([]), z.array(dynamicItem)),
  publications: z.preprocess(orElse([]), z.array(dynamicItem)),
  projects: z.preprocess(orElse([]), z.array(dynamicItem)),
  awards: z.preprocess(orElse([]), z.array(dynamicItem)),
  courses: z.preprocess(orElse([]), z.array(z.any())),
  research_interests: z.preprocess(orElse([]), z.array(s)),
  custom_sections: z.preprocess(orElse([]), z.array(CustomSection)),
  section_columns: z.preprocess(orElse({}), z.record(z.string(), z.array(s))).optional(),
  links: z.preprocess(orElse({}), z.object({
    scholar: s,
    scopus: s,
    vidwan: s,
    linkedin: s,
    orcid: s,
    github: s,
    researchgate: s,
    dblp: s,
    website: s,
  }).passthrough()),
  contact: z.preprocess(orElse({}), z.object({
    email: s,
    phone: s,
    office: s,
    address: s,
  }).passthrough()),
  visible: z.preprocess(orElse({}), z.object({
    email: z.boolean().catch(true),
    phone: z.boolean().catch(false),
    office: z.boolean().catch(true),
    address: z.boolean().catch(true),
  }).passthrough()),
}).passthrough();

export type PortfolioData = z.infer<typeof PortfolioData>;

