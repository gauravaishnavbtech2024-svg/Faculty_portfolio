/**
 * Normalizes user-provided or AI-extracted social media links and URLs
 * into valid, absolute https:// URLs.
 */
export function normalizeUrl(raw?: string | null, type?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '#' || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'none') {
    return null;
  }

  // Already a full mailto or https/http link
  if (/^mailto:/i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // If starts with www. or known domain
  if (/^(?:www\.|[a-z0-9-]+\.(?:com|org|net|edu|in|io|ai|dev|me|fr|uk|ca|de|ac\.in|edu\.in))/i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }

  // Handle platform-specific handles/usernames
  const cleanHandle = trimmed.replace(/^[@/]+/, '').trim();
  if (!cleanHandle) return null;

  switch (type) {
    case 'linkedin':
      if (/linkedin\.com/i.test(cleanHandle)) return `https://${cleanHandle}`;
      return `https://www.linkedin.com/in/${cleanHandle}`;
    case 'github':
      if (/github\.com/i.test(cleanHandle)) return `https://${cleanHandle}`;
      return `https://github.com/${cleanHandle}`;
    case 'scholar':
      if (/scholar\.google/i.test(cleanHandle)) return `https://${cleanHandle}`;
      return `https://scholar.google.com/citations?user=${cleanHandle}`;
    case 'orcid':
      if (/orcid\.org/i.test(cleanHandle)) return `https://${cleanHandle}`;
      return `https://orcid.org/${cleanHandle}`;
    case 'researchgate':
      if (/researchgate\.net/i.test(cleanHandle)) return `https://${cleanHandle}`;
      return `https://www.researchgate.net/profile/${cleanHandle}`;
    case 'dblp':
      if (/dblp\.org|dblp\.uni/i.test(cleanHandle)) return `https://${cleanHandle}`;
      return `https://dblp.org/pid/${cleanHandle}`;
    default:
      return `https://${cleanHandle}`;
  }
}
