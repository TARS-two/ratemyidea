// Web research using Serper.dev Google Search API (2,500 free credits)
// Falls back gracefully if no API key or credits exhausted

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  provider?: "serper" | "perplexity" | "manual";
  query?: string;
  usedInPrompt?: boolean;
  qualityTier?: "trusted" | "acceptable" | "fallback";
  sourceQuality?: number;
}

// Trusted source domains (tier 1 & 2)
const TRUSTED_DOMAINS = new Set([
  // Market research & data
  "statista.com", "ibisworld.com", "grandviewresearch.com", "mordorintelligence.com",
  "precedenceresearch.com", "fortunebusinessinsights.com", "marketsandmarkets.com",
  "globenewswire.com", "prnewswire.com", "businesswire.com",
  // Business & tech press
  "forbes.com", "bloomberg.com", "techcrunch.com", "wired.com", "cnbc.com",
  "reuters.com", "bbc.com", "economist.com", "ft.com", "wsj.com",
  "hbr.org", "inc.com", "fastcompany.com", "businessinsider.com",
  "venturebeat.com", "thenextweb.com", "arstechnica.com",
  // Consulting & research
  "mckinsey.com", "deloitte.com", "pwc.com", "accenture.com",
  "bcg.com", "bain.com", "gartner.com", "forrester.com",
  // Startup & VC
  "crunchbase.com", "cbinsights.com", "pitchbook.com", "ycombinator.com",
  "producthunt.com", "g2.com", "capterra.com",
  // Government & institutions
  "census.gov", "bls.gov", "worldbank.org", "imf.org",
  "inegi.org.mx", "oecd.org", "un.org",
  // Wikipedia (useful for context)
  "en.wikipedia.org", "es.wikipedia.org",
]);

const SOURCE_SPAM_DOMAINS = new Set([
  "reddit.com", "quora.com", "medium.com", "pinterest.com", "youtube.com", "tiktok.com",
  "facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com", "substack.com",
]);

const SOURCE_FALLBACK_LIMIT = 4;
const SOURCE_CONTEXT_LIMIT = 6;
const MIN_SNIPPET_LENGTH = 45;

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parentDomain(hostname: string): string {
  const parts = hostname.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : hostname;
}

function isDomainTrusted(url: string): boolean {
  const hostname = extractDomain(url);
  if (TRUSTED_DOMAINS.has(hostname)) return true;
  return TRUSTED_DOMAINS.has(parentDomain(hostname));
}

function isSourceSpam(domain: string): boolean {
  return SOURCE_SPAM_DOMAINS.has(domain) || SOURCE_SPAM_DOMAINS.has(parentDomain(domain));
}

function scoreSourceQuality(result: SearchResult): number {
  let score = 0;
  if (isDomainTrusted(result.url)) score += 80;
  if (result.title.trim().length >= 12) score += 8;
  if (result.snippet.trim().length >= MIN_SNIPPET_LENGTH) score += 10;
  if (/\b(2024|2025|2026|market|industry|report|study|survey|data|trends|competitor|pricing)\b/i.test(`${result.title} ${result.snippet}`)) score += 8;
  if (isSourceSpam(result.domain)) score -= 80;
  if (!result.url || !result.domain) score -= 50;
  return score;
}

export function filterSourcesForQuality(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const enriched = results
    .map((result) => {
      const domain = result.domain || extractDomain(result.url);
      const normalized: SearchResult = { ...result, domain };
      const sourceQuality = scoreSourceQuality(normalized);
      const qualityTier: SearchResult["qualityTier"] = isDomainTrusted(normalized.url)
        ? "trusted"
        : sourceQuality >= 18
          ? "acceptable"
          : "fallback";
      return { ...normalized, sourceQuality, qualityTier };
    })
    .filter((result) => {
      if (!result.url || seen.has(result.url)) return false;
      seen.add(result.url);
      return !isSourceSpam(result.domain);
    })
    .sort((a, b) => b.sourceQuality - a.sourceQuality);

  const strong = enriched.filter((result) => result.qualityTier === "trusted" || result.qualityTier === "acceptable");
  if (strong.length > 0) return strong.slice(0, SOURCE_CONTEXT_LIMIT);

  return enriched.slice(0, SOURCE_FALLBACK_LIMIT);
}

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_TIMEOUT_MS = 8000;

export async function searchWeb(query: string, maxResults: number = 8): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    console.warn("No SERPER_API_KEY — skipping web research");
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: maxResults,
      }),
    });

    if (!res.ok) {
      console.error("Serper API error:", res.status);
      return [];
    }

    const data = await res.json();
    const organic = data.organic || [];

    return organic.map((r: { title?: string; link?: string; snippet?: string }) => ({
      title: r.title || "",
      url: r.link || "",
      snippet: r.snippet || "",
      domain: extractDomain(r.link || ""),
      provider: "serper",
      query,
    }));
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("Search timeout:", query);
      return [];
    }
    console.error("Search error:", err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export function markSourcesUsedInPrompt(results: SearchResult[]): SearchResult[] {
  return results.map((r) => ({ ...r, usedInPrompt: true }));
}

export function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const lines = results.map(
    (r, i) => `[${i + 1}] "${r.title}" — ${r.domain} (${r.qualityTier ?? "source"})\n    ${r.snippet}`
  );

  return `\n\nREAL-WORLD RESEARCH (use these quality-filtered sources to ground your analysis with facts; do not overstate weak/fallback sources):\n${lines.join("\n\n")}`;
}

export function formatSourcesForClient(results: SearchResult[]): { title: string; url: string; domain: string; sourceQuality?: number; qualityTier?: string; provider?: string; query?: string; usedInPrompt?: boolean }[] {
  return filterSourcesForQuality(results).slice(0, 6).map((r) => ({
    title: r.title.slice(0, 80),
    url: r.url,
    domain: r.domain,
    sourceQuality: r.sourceQuality,
    qualityTier: r.qualityTier,
    provider: r.provider,
    query: r.query,
    usedInPrompt: r.usedInPrompt,
  }));
}
