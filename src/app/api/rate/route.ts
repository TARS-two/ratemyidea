import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { searchWeb, filterSourcesForQuality, formatSearchContext, formatSourcesForClient, markSourcesUsedInPrompt } from "./search";
import { createServiceClient } from "@/lib/supabase/server";
import { getBadge, detectCategory } from "@/lib/badges";
import { logAnthropicUsage } from "@/lib/anthropicUsage";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BASIC_EVALUATION_MODEL = process.env.BASIC_EVALUATION_MODEL || "claude-sonnet-4-6";
const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
const FREE_LIMIT = 1;
const ANTHROPIC_TIMEOUT_MS = 60000;
const FREE_DAILY_GLOBAL_LIMIT = parsePositiveIntegerEnv(process.env.FREE_DAILY_GLOBAL_LIMIT);
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_AFTER_FREE_EVALS = parsePositiveIntegerEnv(process.env.TURNSTILE_AFTER_FREE_EVALS) ?? 1;

type AnthropicMessageResponse = {
  content?: Array<{ text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

type EvaluationBenchmarkRow = {
  overall_score: number | null;
  result_json?: { benchmarkSignals?: BenchmarkSignals } | null;
  category?: string | null;
};

type BenchmarkSignals = {
  strengthTags: string[];
  weaknessTags: string[];
  riskTags: string[];
};

type CountedBenchmarkTags = {
  commonWeakness: string | null;
  commonStrength: string | null;
  signalSampleSize: number;
};

type BasicBenchmark = {
  category: string;
  categoryShare: number;
  categoryAverage: number | null;
  sampleSize: number;
  totalSampleSize: number;
  isAboveAverage: boolean | null;
  commonWeakness: string;
  commonStrength: string;
  signalSource: "normalized_tags" | "category_fallback";
  signalSampleSize: number;
  disclaimer: string;
};

async function fetchAnthropicWithTimeout(body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
  try {
    return await Promise.race([
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("Anthropic request timed out.")), ANTHROPIC_TIMEOUT_MS)
      ),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

const SYSTEM_PROMPT = `You are a senior business analyst and startup advisor. You rate business ideas on a scale of 1-10 with detailed, honest, actionable feedback.

You MUST respond with valid JSON only. No markdown, no code blocks, no explanation outside the JSON.

JSON schema:
{
  "ideaName": "<short catchy name for the idea, 2-5 words, like a product name>",
  "keywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>"],
  "overall": <number 1.0-10.0, one decimal>,
  "categories": [
    { "name": "Market Demand", "score": <1.0-10.0>, "emoji": "📊", "comment": "<1 sentence>" },
    { "name": "Competition", "score": <1.0-10.0>, "emoji": "⚔️", "comment": "<1 sentence>" },
    { "name": "Revenue Potential", "score": <1.0-10.0>, "emoji": "💰", "comment": "<1 sentence>" },
    { "name": "Feasibility", "score": <1.0-10.0>, "emoji": "🔧", "comment": "<1 sentence>" },
    { "name": "Scalability", "score": <1.0-10.0>, "emoji": "📈", "comment": "<1 sentence>" },
    { "name": "Differentiation", "score": <1.0-10.0>, "emoji": "✨", "comment": "<1 sentence>" }
  ],
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "nextSteps": ["<concrete action 1>", "<concrete action 2>", "<concrete action 3>"],
  "benchmarkSignals": {
    "strengthTags": ["<1-3 tags from allowed list>"],
    "weaknessTags": ["<1-3 tags from allowed list>"],
    "riskTags": ["<1-3 tags from allowed list>"]
  }
}

Additional field rules:
- ideaName: A short, catchy name that captures the essence of the idea (e.g. "AI Market Studies", "Smart Meal Planner", "Freelancer CRM"). Think product name, not description.
- keywords: Exactly 3 single-word or two-word tags that describe the idea's key attributes (e.g. ["AI-Powered", "B2B", "Scalable"] or ["SaaS", "Education", "Low-Cost"]).
- benchmarkSignals: classify the idea into normalized, non-identifying tags only. Do not include the idea name, company name, user identity, location finer than country/region, or free-text descriptions. Use only these allowed tags:
  strengthTags: ["specific customer", "clear pain", "repeat purchase", "strong niche", "low build complexity", "high willingness to pay", "timely trend", "clear distribution", "defensible insight"]
  weaknessTags: ["unclear customer", "weak differentiation", "unclear monetization", "crowded channel", "high build complexity", "low willingness to pay", "vague scope", "unclear acquisition", "location assumptions"]
  riskTags: ["market too small", "regulated market", "platform dependency", "long sales cycle", "trust barrier", "data dependency", "operational complexity", "copycat risk", "pricing sensitivity"]

Rules:
- Be honest and direct. Don't sugarcoat bad ideas.
- Be specific to the actual idea — no generic advice.
- Overall score should reflect a weighted assessment, not a simple average.
- Scores below 4 are terrible ideas. 4-6 are mediocre. 6-8 are promising. 8+ are excellent.
- Most ideas should score between 4-7. Don't inflate.
- Next steps should be concrete, actionable things the person can do THIS WEEK.
- If the idea is vague, score lower on feasibility and note they need more specificity.
- Respond in the same language the idea is written in (English or Spanish).
- If a preferred language is specified, always respond in that language regardless of the input language.
- When REAL-WORLD RESEARCH is provided, USE IT to back up your analysis. Reference specific data points, market sizes, competitor names, and trends from the research. This makes your analysis credible and grounded in reality, not just opinion.
- Weave the research findings naturally into your category comments, summary, strengths, and risks. Don't just list facts — analyze them in context of the idea.`;

function hashIP(ip: string): string {
  return createHash("sha256").update(ip + "ratemyidea_salt").digest("hex");
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function detectIdeaLanguage(text: string): "en" | "es" {
  const normalized = text.toLowerCase();
  const spanishSignals = [
    " que ", " para ", " con ", " una ", " un ", " los ", " las ", " negocio", " mercado",
    " clientes", " méxico", " mexico", " español", " años", " sería", " podría", " quiero", " tengo",
  ];
  const hasSpanishChars = /[áéíóúñ¿¡]/i.test(text);
  const padded = ` ${normalized} `;
  const signalCount = spanishSignals.filter((signal) => padded.includes(signal)).length;

  return hasSpanishChars || signalCount >= 2 ? "es" : "en";
}

function parsePositiveIntegerEnv(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

type MarketContext = {
  providedMarket: string;
  detectedMarket: string;
  searchMarket: string;
  promptNote: string;
};

function detectMarketContext(idea: string, market?: string): MarketContext {
  const cleanedMarket = typeof market === "string" ? market.trim().slice(0, 80) : "";
  const normalizedIdea = idea.toLowerCase();
  const locationSignals = [
    "méxico", "mexico", "latam", "latin america", "usa", "united states", "canada", "spain", "españa",
    "monterrey", "guadalajara", "cdmx", "mexico city", "online", "global", "remote", "local",
  ];
  const detected = locationSignals.find((signal) => normalizedIdea.includes(signal)) || "";
  const searchMarket = cleanedMarket || detected || "global market";
  return {
    providedMarket: cleanedMarket,
    detectedMarket: detected,
    searchMarket,
    promptNote: cleanedMarket
      ? `Market/location specified by user: ${cleanedMarket}. Use it explicitly when judging demand, competition, pricing, and go-to-market.`
      : detected
        ? `Market/location detected from the idea: ${detected}. Use it explicitly when judging demand, competition, pricing, and go-to-market.`
        : "If no market/location is specified, assume a general/global market and state that assumption clearly so the user understands location-sensitive claims may change.",
  };
}

function buildSearchQueries(idea: string, marketContext: MarketContext): string[] {
  const compactIdea = idea.trim().slice(0, 90);
  const market = marketContext.searchMarket;
  return [
    `${compactIdea} ${market} market size competitors`,
    `${compactIdea} ${market} industry trends pricing 2024 2025`,
  ];
}

function isSuspiciousIdea(idea: string): boolean {
  const trimmed = idea.trim();
  const normalized = trimmed.toLowerCase();
  const urls = normalized.match(/https?:\/\/|www\./g) ?? [];
  const repeatedCharacterRun = /(.)\1{14,}/.test(normalized);
  const words = normalized.match(/[a-záéíóúñ0-9]{3,}/gi) ?? [];
  const wordCounts = new Map<string, number>();

  for (const word of words) {
    const count = (wordCounts.get(word) ?? 0) + 1;
    if (count >= 18 && words.length <= 35) return true;
    wordCounts.set(word, count);
  }

  return urls.length >= 3 || repeatedCharacterRun || trimmed.length > 0 && words.length <= 2;
}

const ALLOWED_BENCHMARK_SIGNALS = {
  strengthTags: [
    "specific customer",
    "clear pain",
    "repeat purchase",
    "strong niche",
    "low build complexity",
    "high willingness to pay",
    "timely trend",
    "clear distribution",
    "defensible insight",
  ],
  weaknessTags: [
    "unclear customer",
    "weak differentiation",
    "unclear monetization",
    "crowded channel",
    "high build complexity",
    "low willingness to pay",
    "vague scope",
    "unclear acquisition",
    "location assumptions",
  ],
  riskTags: [
    "market too small",
    "regulated market",
    "platform dependency",
    "long sales cycle",
    "trust barrier",
    "data dependency",
    "operational complexity",
    "copycat risk",
    "pricing sensitivity",
  ],
} as const;

function normalizeSignalList(value: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const allowedSet = new Set(allowed);
  return Array.from(new Set(
    value
      .map((item) => typeof item === "string" ? item.trim().toLowerCase() : "")
      .filter((item) => allowedSet.has(item))
  )).slice(0, 3);
}

function normalizeBenchmarkSignals(value: unknown): BenchmarkSignals {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    strengthTags: normalizeSignalList(raw.strengthTags, ALLOWED_BENCHMARK_SIGNALS.strengthTags),
    weaknessTags: normalizeSignalList(raw.weaknessTags, ALLOWED_BENCHMARK_SIGNALS.weaknessTags),
    riskTags: normalizeSignalList(raw.riskTags, ALLOWED_BENCHMARK_SIGNALS.riskTags),
  };
}

function mostCommonTag(counts: Map<string, number>, minimumCount: number): string | null {
  let winner: string | null = null;
  let winnerCount = 0;
  for (const [tag, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = tag;
      winnerCount = count;
    }
  }
  return winnerCount >= minimumCount ? winner : null;
}

function countBenchmarkTags(rows: EvaluationBenchmarkRow[]): CountedBenchmarkTags {
  const weaknessCounts = new Map<string, number>();
  const strengthCounts = new Map<string, number>();
  let signalSampleSize = 0;

  for (const row of rows) {
    const signals = normalizeBenchmarkSignals(row.result_json?.benchmarkSignals);
    if (!signals.strengthTags.length && !signals.weaknessTags.length && !signals.riskTags.length) continue;
    signalSampleSize += 1;
    for (const tag of signals.weaknessTags) weaknessCounts.set(tag, (weaknessCounts.get(tag) ?? 0) + 1);
    for (const tag of signals.riskTags) weaknessCounts.set(tag, (weaknessCounts.get(tag) ?? 0) + 1);
    for (const tag of signals.strengthTags) strengthCounts.set(tag, (strengthCounts.get(tag) ?? 0) + 1);
  }

  const minimumCount = signalSampleSize >= 12 ? 3 : 2;
  return {
    commonWeakness: signalSampleSize >= 5 ? mostCommonTag(weaknessCounts, minimumCount) : null,
    commonStrength: signalSampleSize >= 5 ? mostCommonTag(strengthCounts, minimumCount) : null,
    signalSampleSize,
  };
}

function pickCategoryPattern(category: string): { commonWeakness: string; commonStrength: string } {
  const normalized = category.toLowerCase();
  if (normalized.includes("local") || normalized.includes("service")) {
    return {
      commonWeakness: "unclear monetization or service-area assumptions",
      commonStrength: "stronger niche demand when the location is specific",
    };
  }
  if (normalized.includes("saas") || normalized.includes("software") || normalized.includes("b2b")) {
    return {
      commonWeakness: "weak differentiation against existing tools",
      commonStrength: "clearer value when the buyer and workflow are narrow",
    };
  }
  if (normalized.includes("ecommerce") || normalized.includes("consumer")) {
    return {
      commonWeakness: "crowded channels and unclear acquisition cost",
      commonStrength: "stronger demand when the niche has repeat purchase behavior",
    };
  }
  if (normalized.includes("wellness") || normalized.includes("health")) {
    return {
      commonWeakness: "limited evidence of willingness to pay",
      commonStrength: "stronger traction when the customer segment is specific",
    };
  }
  return {
    commonWeakness: "unclear monetization or differentiation",
    commonStrength: "stronger signals when the target customer is specific",
  };
}

async function buildBasicBenchmark(
  supabase: ReturnType<typeof createServiceClient>,
  category: string,
  score: number
): Promise<BasicBenchmark | null> {
  if (!supabase) return null;

  const { data: rows, error } = await supabase
    .from("evaluations")
    .select("overall_score, result_json, category")
    .not("overall_score", "is", null)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error || !rows?.length) {
    if (error) console.error("Basic benchmark lookup error:", error.message);
    return null;
  }

  const benchmarkRows = rows as EvaluationBenchmarkRow[];
  const categoryRows = benchmarkRows.filter((row) => {
    const resultCategory = row.category ?? (row.result_json as { category?: string } | null)?.category;
    return resultCategory === category;
  });
  const { count: totalEvaluationCount } = await supabase
    .from("evaluations")
    .select("*", { count: "exact", head: true })
    .not("overall_score", "is", null);
  const { count: totalCategoryCount } = await supabase
    .from("evaluations")
    .select("*", { count: "exact", head: true })
    .eq("category", category)
    .not("overall_score", "is", null);
  const totalSampleSize = totalEvaluationCount ?? benchmarkRows.length;
  const categorySampleSize = totalCategoryCount ?? categoryRows.length;
  const scores = categoryRows
    .map((row) => Number(row.overall_score))
    .filter((value) => Number.isFinite(value));
  const categoryAverage = scores.length
    ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10
    : null;
  const countedTags = countBenchmarkTags(categoryRows);
  const fallbackPattern = pickCategoryPattern(category);
  const signalSource = countedTags.commonWeakness && countedTags.commonStrength
    ? "normalized_tags"
    : "category_fallback";

  return {
    category,
    categoryShare: Math.round((categorySampleSize / Math.max(totalSampleSize, 1)) * 100),
    categoryAverage,
    sampleSize: categorySampleSize,
    totalSampleSize,
    isAboveAverage: categoryAverage === null ? null : score >= categoryAverage,
    commonWeakness: countedTags.commonWeakness ?? fallbackPattern.commonWeakness,
    commonStrength: countedTags.commonStrength ?? fallbackPattern.commonStrength,
    signalSource,
    signalSampleSize: countedTags.signalSampleSize,
    disclaimer: "Based on the current sample of evaluated ideas. This benchmark is directional, not a scientific ranking.",
  };
}

async function verifyTurnstileToken(token: string | undefined, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) return true;
  if (!token || typeof token !== "string") return false;

  try {
    const formData = new FormData();
    formData.append("secret", TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    if (ip !== "unknown") formData.append("remoteip", ip);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => null) as { success?: boolean } | null;
    return data?.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea, email, lang, authToken, turnstileToken, market } = body;

    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      return NextResponse.json(
        { error: "Please describe your idea in at least a few sentences." },
        { status: 400 }
      );
    }

    if (idea.length > 1000) {
      return NextResponse.json(
        { error: "Idea description is too long (max 1000 characters)." },
        { status: 400 }
      );
    }

    if (isSuspiciousIdea(idea)) {
      return NextResponse.json(
        {
          error: "abuse_check_failed",
          message: "Please describe a real business idea before requesting an AI evaluation.",
        },
        { status: 400 }
      );
    }

    const responseLang = lang === "es" || lang === "en" ? lang : detectIdeaLanguage(idea);
    const marketContext = detectMarketContext(idea, market);

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Service not configured." }, { status: 500 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Rate limit service unavailable." }, { status: 503 });
    }

    const ip = getClientIP(request);
    const ipHash = hashIP(ip);
    let userId: string | null = null;
    let isPro = false;
    let freeEvaluationsUsed = 0;
    let freeEvaluationsLeft = FREE_LIMIT;
    let extraCreditConsumed = false;

    // Check auth + subscription if Supabase is available
    if (supabase && authToken) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authToken);
        if (user) {
          userId = user.id;
          const { data: sub } = await supabase
            .from("user_subscriptions")
            .select("plan, status, extra_credits")
            .eq("user_id", user.id)
            .single();
          if (sub?.plan === "pro" && (sub?.status === "active" || sub?.status === "trialing")) {
            isPro = true;
          }
        }
      } catch {
        // auth check failed — treat as anonymous
      }
    }

    // Rate limiting for non-pro users
    if (supabase && !isPro) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      if (FREE_DAILY_GLOBAL_LIMIT) {
        const { count: globalFreeCount, error: globalFreeError } = await supabase
          .from("evaluations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today.toISOString());

        if (globalFreeError) {
          console.error("Global free usage lookup error:", globalFreeError.message);
          return NextResponse.json(
            { error: "Rate limit service unavailable." },
            { status: 503 }
          );
        }

        if ((globalFreeCount ?? 0) >= FREE_DAILY_GLOBAL_LIMIT) {
          return NextResponse.json(
            {
              error: "cost_guardrail",
              message: "Free evaluations are temporarily limited today. Try again later or upgrade to Pro.",
            },
            { status: 429 }
          );
        }
      }

      const usageQuery = supabase
        .from("evaluations")
        .select("id")
        .gte("created_at", today.toISOString());

      const { data: usageRows, error: usageError } = userId
        ? await usageQuery.or(`user_id.eq.${userId},ip_hash.eq.${ipHash}`)
        : await usageQuery.eq("ip_hash", ipHash);

      if (usageError) {
        console.error("Rate limit usage lookup error:", usageError.message);
        return NextResponse.json(
          { error: "Rate limit service unavailable." },
          { status: 503 }
        );
      }

      const usedCount = usageRows?.length ?? 0;
      freeEvaluationsUsed = Math.min(usedCount, FREE_LIMIT);
      freeEvaluationsLeft = Math.max(FREE_LIMIT - usedCount, 0);

      if (!userId && TURNSTILE_SECRET_KEY && usedCount >= TURNSTILE_AFTER_FREE_EVALS) {
        const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
        if (!turnstileOk) {
          return NextResponse.json(
            {
              error: "turnstile_required",
              message: "Please complete the anti-abuse check before requesting another free evaluation.",
            },
            { status: 403 }
          );
        }
      }

      if (usedCount >= FREE_LIMIT) {
        if (!userId) {
          return NextResponse.json(
            {
              error: "limit_reached",
              message:
                "You have used your free evaluation today. Share your score, buy one more evaluation, or upgrade to Pro.",
            },
            { status: 429 }
          );
        }

        const { data: consumed, error: consumeError } = await supabase.rpc("consume_extra_credit", {
          target_user_id: userId,
        });

        if (consumeError) {
          console.error("Extra credit consume error:", consumeError.message);
          return NextResponse.json(
            { error: "Extra credit system unavailable. Please try again later." },
            { status: 503 }
          );
        }

        if (consumed === true) {
          extraCreditConsumed = true;
          freeEvaluationsUsed = FREE_LIMIT;
          const { data: updatedSub } = await supabase
            .from("user_subscriptions")
            .select("extra_credits")
            .eq("user_id", userId)
            .single();
          freeEvaluationsLeft = updatedSub?.extra_credits ?? 0;
        } else {
          return NextResponse.json(
            {
              error: "limit_reached",
              message:
                "You have used your free evaluation today. Share your score, buy one more evaluation, or upgrade to Pro.",
            },
            { status: 429 }
          );
        }
      }

      if (usedCount < FREE_LIMIT) {
        freeEvaluationsUsed = Math.min(usedCount + 1, FREE_LIMIT);
        freeEvaluationsLeft = Math.max(FREE_LIMIT - freeEvaluationsUsed, 0);
      }
    }

    // Step 1: Research the idea
    const searchQueries = buildSearchQueries(idea, marketContext);
    const searchResults = await Promise.all(
      searchQueries.map((q) => searchWeb(q, 5))
    );
    const allResults = searchResults.flat();
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
    const qualityResults = markSourcesUsedInPrompt(filterSourcesForQuality(uniqueResults));
    if (uniqueResults.length > 0 && qualityResults.length === 0) {
      console.warn("source_quality_empty", { totalResults: uniqueResults.length });
    }
    const searchContext = formatSearchContext(qualityResults);
    const sources = formatSourcesForClient(qualityResults);

    // Step 2: Call Claude
    const anthropicStartedAt = Date.now();
    const aiRes = await fetchAnthropicWithTimeout({
      model: BASIC_EVALUATION_MODEL,
      max_tokens: 2600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${responseLang === "es" ? "[Respond in Spanish]\n\n" : "[Respond in English]\n\n"}Rate this business idea:\n\n${idea.trim()}\n\nMARKET/LOCATION CONTEXT:\n${marketContext.promptNote}${searchContext}`,
        },
      ],
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Claude API error:", aiRes.status, errText);
      await logAnthropicUsage({
        supabase,
        endpoint: "/api/rate",
        model: BASIC_EVALUATION_MODEL,
        success: false,
        statusCode: aiRes.status,
        latencyMs: Date.now() - anthropicStartedAt,
        errorMessage: errText.slice(0, 500),
        userId,
      });
      return NextResponse.json(
        { error: "Analysis failed. Please try again." },
        { status: 500 }
      );
    }

    const aiData = await aiRes.json();
    const content = aiData.content?.[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: "No analysis generated. Please try again." },
        { status: 500 }
      );
    }

    let parsed;
    try {
      const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "Analysis format error. Please try again." },
        { status: 500 }
      );
    }

    // Attach badge + category + sources
    const badge = getBadge(parsed.overall);
    const category = detectCategory(idea);
    parsed.benchmarkSignals = normalizeBenchmarkSignals(parsed.benchmarkSignals);
    parsed.badge = badge;
    parsed.category = category;
    parsed.sources = sources;
    parsed.basicBenchmark = await buildBasicBenchmark(supabase, category, parsed.overall);
    parsed.isPro = isPro;
    parsed.freeEvaluationsUsed = freeEvaluationsUsed;
    parsed.freeEvaluationsLeft = freeEvaluationsLeft;
    parsed.extraCreditConsumed = extraCreditConsumed;

    // Save to DB before returning so free-limit counts and CTA metadata advance reliably.
    const { data: savedEvaluation, error: saveError } = await supabase
      .from("evaluations")
      .insert({
        user_id: userId,
        ip_hash: ipHash,
        idea_text: idea.trim(),
        idea_name: parsed.ideaName,
        overall_score: parsed.overall,
        category,
        lang: responseLang,
        badge: badge.label,
        result_json: parsed,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("DB save error:", saveError.message);
      return NextResponse.json(
        { error: "Could not save evaluation. Please try again." },
        { status: 503 }
      );
    }

    await logAnthropicUsage({
      supabase,
      endpoint: "/api/rate",
      model: BASIC_EVALUATION_MODEL,
      responseData: aiData,
      evaluationId: savedEvaluation?.id ?? null,
      userId,
      success: true,
      statusCode: aiRes.status,
      latencyMs: Date.now() - anthropicStartedAt,
    });

    // Subscribe email to Beehiiv
    if (email && BEEHIIV_API_KEY && BEEHIIV_PUBLICATION_ID) {
      fetch(
        `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${BEEHIIV_API_KEY}`,
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            send_welcome_email: false,
            utm_source: "ratemyidea",
            utm_medium: "tool",
          }),
        }
      ).catch((err) => console.error("Beehiiv error:", err));
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Rate API error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
