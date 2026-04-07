import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { searchWeb, formatSearchContext, formatSourcesForClient } from "../rate/search";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const STUDY_SYSTEM_PROMPT = `You are a senior business strategist and market research analyst. You produce comprehensive, data-backed market studies.

You MUST respond with valid JSON only. No markdown, no code blocks, no explanation outside the JSON.

JSON schema:
{
  "ideaName": "<product/business name>",
  "executiveSummary": "<3-4 paragraph executive summary>",
  "marketAnalysis": {
    "overview": "<2-3 paragraphs on market landscape>",
    "tam": "<Total Addressable Market estimate with reasoning>",
    "sam": "<Serviceable Available Market>",
    "som": "<Serviceable Obtainable Market (realistic year 1-2)>",
    "trends": ["<trend 1>", "<trend 2>", "<trend 3>", "<trend 4>"],
    "drivers": ["<growth driver 1>", "<growth driver 2>", "<growth driver 3>"]
  },
  "competitorAnalysis": {
    "overview": "<paragraph on competitive landscape>",
    "competitors": [
      {
        "name": "<competitor name>",
        "description": "<what they do>",
        "strengths": "<their strengths>",
        "weaknesses": "<their weaknesses>",
        "pricing": "<their pricing model if known>",
        "marketShare": "<estimated or qualitative>"
      }
    ],
    "gaps": ["<market gap 1>", "<market gap 2>", "<market gap 3>"]
  },
  "targetAudience": {
    "primaryPersona": {
      "name": "<persona name>",
      "demographics": "<age, income, location, etc>",
      "painPoints": ["<pain 1>", "<pain 2>", "<pain 3>"],
      "goals": ["<goal 1>", "<goal 2>"],
      "channels": ["<where to reach them 1>", "<channel 2>"]
    },
    "secondaryPersona": {
      "name": "<persona name>",
      "demographics": "<age, income, location, etc>",
      "painPoints": ["<pain 1>", "<pain 2>"],
      "goals": ["<goal 1>", "<goal 2>"],
      "channels": ["<channel 1>", "<channel 2>"]
    }
  },
  "goToMarket": {
    "positioning": "<1-2 sentence positioning statement>",
    "pricingStrategy": "<recommended pricing with reasoning>",
    "channels": [
      { "channel": "<channel name>", "priority": "high|medium|low", "rationale": "<why>" }
    ],
    "launchPlan": [
      { "phase": "<phase name>", "timeline": "<timeframe>", "actions": ["<action 1>", "<action 2>"] }
    ]
  },
  "financialProjections": {
    "assumptions": ["<assumption 1>", "<assumption 2>", "<assumption 3>"],
    "year1": { "revenue": "<estimate>", "costs": "<estimate>", "margin": "<estimate>" },
    "year2": { "revenue": "<estimate>", "costs": "<estimate>", "margin": "<estimate>" },
    "breakeven": "<estimated breakeven timeline>",
    "fundingNeeds": "<bootstrap vs funding recommendation>"
  },
  "riskAssessment": [
    { "risk": "<risk description>", "likelihood": "high|medium|low", "impact": "high|medium|low", "mitigation": "<strategy>" }
  ],
  "verdict": {
    "score": <1.0-10.0>,
    "recommendation": "<go|caution|pivot|pass>",
    "summary": "<2-3 sentence final verdict>",
    "keyInsight": "<the single most important thing to know>"
  }
}

Rules:
- Use REAL data from the research provided. Cite specific numbers, companies, and market data.
- Be thorough but practical. This should be immediately useful for decision-making.
- Financial projections should be conservative and clearly state assumptions.
- Identify at least 3-5 real competitors with actual details from research.
- Respond in the same language specified (en/es).
- TAM/SAM/SOM should include dollar amounts when possible.
- The verdict score should match the depth of analysis, not just the free score.`;

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    // Verify payment with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 403 });
    }

    const idea = session.metadata?.idea;
    const lang = session.metadata?.lang || "en";
    const freeScore = session.metadata?.freeScore ? parseFloat(session.metadata.freeScore) : null;

    if (!idea) {
      return NextResponse.json({ error: "No idea found in session" }, { status: 400 });
    }

    // Deep research: more queries, more results
    const searchQueries = [
      `${idea.slice(0, 80)} market size TAM 2024 2025`,
      `${idea.slice(0, 80)} competitors landscape analysis`,
      `${idea.slice(0, 80)} target audience demographics`,
      `${idea.slice(0, 80)} industry trends growth forecast`,
      `${idea.slice(0, 80)} pricing models revenue`,
    ];

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
    const searchContext = formatSearchContext(uniqueResults);
    const sources = formatSourcesForClient(uniqueResults);

    // Generate comprehensive study with Claude
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: STUDY_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${lang === "es" ? "[Respond in Spanish]\n\n" : "[Respond in English]\n\n"}Generate a comprehensive market study for this business idea:\n\n${idea}${freeScore !== null ? `\n\nNote: The initial quick screening scored this idea ${freeScore.toFixed(1)}/10. Your deep research should refine this score. Only deviate significantly if the research strongly justifies it — if so, explain why in the keyInsight field.` : ""}${searchContext}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Claude API error:", aiRes.status, errText);
      return NextResponse.json({ error: "Study generation failed" }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const content = aiData.content?.[0]?.text;

    if (!content) {
      return NextResponse.json({ error: "No study generated" }, { status: 500 });
    }

    let parsed;
    try {
      const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse study:", content.slice(0, 200));
      return NextResponse.json({ error: "Study format error" }, { status: 500 });
    }

    parsed.sources = sources;
    parsed._meta = { sessionId, generatedAt: new Date().toISOString() };

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Study API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
