import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const NEXT_STEPS_MODEL = process.env.NEXT_STEPS_MODEL || "claude-sonnet-4-20250514";

export async function POST(request: NextRequest) {
  try {
    const { ideaText, ideaName, lang, authToken } = await request.json();
    if (!ideaText || !authToken) return NextResponse.json({ error: "Missing params." }, { status: 400 });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    const { data: { user } } = await supabase.auth.getUser(authToken);
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    // Check pro plan
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("plan, status, strategic_plans_used, strategic_plans_reset_at")
      .eq("user_id", user.id)
      .single();

    if (!sub || sub.plan !== "pro" || sub.status !== "active") {
      return NextResponse.json({ error: "Pro plan required." }, { status: 403 });
    }

    // Reset monthly counter if needed
    const today = new Date().toISOString().split("T")[0];
    const resetDate = sub.strategic_plans_reset_at;
    const resetMonth = resetDate ? resetDate.slice(0, 7) : null;
    const currentMonth = today.slice(0, 7);

    let plansUsed = sub.strategic_plans_used || 0;
    if (resetMonth !== currentMonth) {
      plansUsed = 0;
      await supabase.from("user_subscriptions").update({
        strategic_plans_used: 0,
        strategic_plans_reset_at: today,
      }).eq("user_id", user.id);
    }

    if (plansUsed >= 5) {
      return NextResponse.json({
        error: "Monthly limit reached. You have used your 5 strategic plans for this month.",
      }, { status: 429 });
    }

    // Generate 10 practical next steps with a cheaper configurable model
    const prompt = lang === "es"
      ? `Genera exactamente 10 siguientes pasos concretos para esta idea de negocio: "${ideaName || ideaText.slice(0, 100)}"\n\nDescripción: ${ideaText}\n\nReglas:\n- No hagas un plan de 30 días.\n- Lista pasos numerados del 1 al 10.\n- Cada paso debe ser accionable, específico y ejecutable por una persona o equipo pequeño.\n- Ordena los pasos para que escalen la misma idea sin repetir acciones.\n- Incluye validación, oferta, primer canal comercial y una métrica de éxito.\n- Sé breve: máximo 2 frases por paso.`
      : `Generate exactly 10 concrete next steps for this business idea: "${ideaName || ideaText.slice(0, 100)}"\n\nDescription: ${ideaText}\n\nRules:\n- Do not create a 30-day plan.\n- List numbered steps from 1 to 10.\n- Each step must be actionable, specific, and doable by one person or a small team.\n- Order the steps so they scale the same idea without repeating actions.\n- Include validation, offer, first sales channel, and one success metric.\n- Be concise: max 2 sentences per step.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: NEXT_STEPS_MODEL,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) throw new Error("Claude API failed");
    const aiData = await aiRes.json();
    const plan = aiData.content?.[0]?.text;

    // Increment counter
    await supabase.from("user_subscriptions").update({
      strategic_plans_used: plansUsed + 1,
    }).eq("user_id", user.id);

    return NextResponse.json({ plan, plansRemaining: 5 - (plansUsed + 1) });
  } catch (err) {
    console.error("Strategic plan error:", err);
    return NextResponse.json({ error: "Could not generate plan." }, { status: 500 });
  }
}
