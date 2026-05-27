import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type ScoreResult = {
  ideaName?: string;
  overall?: number;
  category?: string;
  badge?: { label?: string };
};

export async function POST(request: NextRequest) {
  try {
    const { authToken, ideaText, result, lang } = await request.json();

    if (!authToken || !ideaText || !result) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "History service unavailable." }, { status: 503 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const isPro = subscription?.plan === "pro" && (subscription?.status === "active" || subscription?.status === "trialing");
    if (!isPro) {
      return NextResponse.json({ error: "Pro subscription required." }, { status: 403 });
    }

    const typedResult = result as ScoreResult;
    const { data: existing } = await supabase
      .from("evaluations")
      .select("id")
      .eq("user_id", user.id)
      .eq("idea_text", String(ideaText).trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({ id: existing.id, saved: false });
    }

    const { data, error } = await supabase
      .from("evaluations")
      .insert({
        user_id: user.id,
        idea_text: String(ideaText).trim(),
        idea_name: typedResult.ideaName ?? null,
        overall_score: typeof typedResult.overall === "number" ? typedResult.overall : null,
        category: typedResult.category ?? null,
        lang: lang === "es" ? "es" : "en",
        badge: typedResult.badge?.label ?? null,
        result_json: result,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Save current history error:", error.message);
      return NextResponse.json({ error: "Could not save current result." }, { status: 503 });
    }

    return NextResponse.json({ id: data.id, saved: true });
  } catch (error) {
    console.error("Save current history route error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
