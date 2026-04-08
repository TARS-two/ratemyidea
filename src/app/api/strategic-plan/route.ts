import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

    // Generate plan with Claude
    const prompt = lang === "es"
      ? `Genera un plan estratégico detallado de 30 días para esta idea de negocio: "${ideaName || ideaText.slice(0, 100)}"\n\nDescripción: ${ideaText}\n\nEstructura el plan en 4 semanas con tareas específicas y accionables para cada semana. Incluye actividades de validación, desarrollo inicial, marketing y ventas. Sé concreto y práctico.`
      : `Generate a detailed 30-day strategic action plan for this business idea: "${ideaName || ideaText.slice(0, 100)}"\n\nDescription: ${ideaText}\n\nStructure the plan into 4 weeks with specific, actionable tasks for each week. Include validation activities, initial development, marketing, and sales tasks. Be concrete and practical.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
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
