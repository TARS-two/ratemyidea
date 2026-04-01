// Lightweight web research using DuckDuckGo HTML (no API key needed)

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
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    // Check both full hostname and parent domain
    return hostname;
  } catch {
    return "";
  }
}

function isDomainTrusted(url: string): boolean {
  const hostname = extractDomain(url);
  if (TRUSTED_DOMAINS.has(hostname)) return true;
  // Check parent domain (e.g., "news.bbc.com" → "bbc.com")
  const parts = hostname.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(-2).join(".");
    return TRUSTED_DOMAINS.has(parent);
  }
  return false;
}

export async function searchWeb(query: string, maxResults: number = 8): Promise<SearchResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RateMyIdea/1.0)",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const results: SearchResult[] = [];

    // Parse DDG HTML results
    const resultBlocks = html.split('class="result__body"');
    for (let i = 1; i < resultBlocks.length && results.length < maxResults * 2; i++) {
      const block = resultBlocks[i];

      // Extract URL
      const urlMatch = block.match(/href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/);
      const directUrlMatch = block.match(/class="result__url"[^>]*href="([^"]+)"/);
      let resultUrl = "";
      if (urlMatch) {
        resultUrl = decodeURIComponent(urlMatch[1]);
      } else if (directUrlMatch) {
        resultUrl = directUrlMatch[1];
        if (resultUrl.startsWith("//")) resultUrl = "https:" + resultUrl;
      }

      // Extract title
      const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</);
      const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim() : "";

      // Extract snippet
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      const snippet = snippetMatch
        ? snippetMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim()
        : "";

      if (resultUrl && title) {
        results.push({
          title,
          url: resultUrl,
          snippet,
          domain: extractDomain(resultUrl),
        });
      }
    }

    // Filter to trusted sources, then take top results
    const trusted = results.filter((r) => isDomainTrusted(r.url));

    // If we have enough trusted results, use them; otherwise mix in top results
    if (trusted.length >= 3) {
      return trusted.slice(0, maxResults);
    }

    // Fallback: return trusted + some non-trusted (but mark them)
    return [...trusted, ...results.filter((r) => !isDomainTrusted(r.url))].slice(0, maxResults);
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
  return results
    .filter((r) => isDomainTrusted(r.url))
    .slice(0, 6)
    .map((r) => ({
      title: r.title.slice(0, 80),
      url: r.url,
      domain: r.domain,
    }));
}
