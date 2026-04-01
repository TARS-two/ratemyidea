import { NextRequest, NextResponse } from "next/server";
import { searchWeb, formatSearchContext, formatSourcesForClient } from "./search";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

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
  "nextSteps": ["<concrete action 1>", "<concrete action 2>", "<concrete action 3>"]
}

Additional field rules:
- ideaName: A short, catchy name that captures the essence of the idea (e.g. "AI Market Studies", "Smart Meal Planner", "Freelancer CRM"). Think product name, not description.
- keywords: Exactly 3 single-word or two-word tags that describe the idea's key attributes (e.g. ["AI-Powered", "B2B", "Scalable"] or ["SaaS", "Education", "Low-Cost"]).

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea, email, lang } = body;

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

    if (!ANTHROPIC_API_KEY) {
      console.error("Missing ANTHROPIC_API_KEY");
      return NextResponse.json(
        { error: "Service not configured." },
        { status: 500 }
      );
    }

    // Step 1: Research the idea with web search
    const searchQueries = [
      `${idea.trim().slice(0, 100)} market size competitors`,
      `${idea.trim().slice(0, 100)} industry trends 2024 2025`,
    ];
    const searchResults = await Promise.all(
      searchQueries.map((q) => searchWeb(q, 5))
    );
    const allResults = searchResults.flat();
    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
    const searchContext = formatSearchContext(uniqueResults);
    const sources = formatSourcesForClient(uniqueResults);

    // Step 2: Call Claude API with research context
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${lang === "es" ? "[Respond in Spanish]\n\n" : "[Respond in English]\n\n"}Rate this business idea:\n\n${idea.trim()}${searchContext}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Claude API error:", aiRes.status, errText);
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

    // Parse JSON from response (handle potential markdown wrapping)
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

    // Subscribe email to Beehiiv if provided
    if (email && BEEHIIV_API_KEY && BEEHIIV_PUBLICATION_ID) {
      try {
        await fetch(
          `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${BEEHIIV_API_KEY}`,
            },
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              send_welcome_email: true,
              utm_source: "ratemyidea",
              utm_medium: "tool",
            }),
          }
        );
      } catch (err) {
        // Non-blocking — don't fail the rating if email sub fails
        console.error("Beehiiv subscription error:", err);
      }
    }

    // Attach sources to the response
    parsed.sources = sources;

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Rate API error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
