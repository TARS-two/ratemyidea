// Web research using Serper.dev Google Search API (2,500 free credits)
// Falls back gracefully if no API key or credits exhausted

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
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

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isDomainTrusted(url: string): boolean {
  const hostname = extractDomain(url);
  if (TRUSTED_DOMAINS.has(hostname)) return true;
  const parts = hostname.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(-2).join(".");
    return TRUSTED_DOMAINS.has(parent);
  }
  return false;
}

const SERPER_API_KEY = process.env.SERPER_API_KEY;

export async function searchWeb(query: string, maxResults: number = 8): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    console.warn("No SERPER_API_KEY — skipping web research");
    return [];
  }

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
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
    }));
  } catch (err) {
    console.error("Search error:", err);
    return [];
  }
}

export function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const lines = results.map(
    (r, i) => `[${i + 1}] "${r.title}" — ${r.domain}\n    ${r.snippet}`
  );

  return `\n\nREAL-WORLD RESEARCH (use these to ground your analysis with facts):\n${lines.join("\n\n")}`;
}

export function formatSourcesForClient(results: SearchResult[]): { title: string; url: string; domain: string }[] {
  // Prioritize trusted sources, then fill with others (excluding spam)
  const SPAM_DOMAINS = new Set(["reddit.com", "quora.com", "medium.com", "pinterest.com", "youtube.com"]);
  const trusted = results.filter((r) => isDomainTrusted(r.url));
  const other = results.filter((r) => !isDomainTrusted(r.url) && !SPAM_DOMAINS.has(r.domain));
  const combined = [...trusted, ...other].slice(0, 6);
  return combined.map((r) => ({
    title: r.title.slice(0, 80),
    url: r.url,
    domain: r.domain,
  }));
}
