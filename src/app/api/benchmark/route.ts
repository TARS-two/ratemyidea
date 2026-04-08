import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const score = parseFloat(searchParams.get("score") || "0");
    const category = searchParams.get("category") || "Consumer";

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    const { data: rows } = await supabase
      .from("evaluations")
      .select("overall_score")
      .eq("category", category)
      .not("overall_score", "is", null);

    if (!rows || rows.length < 5) {
      return NextResponse.json({ insufficient: true, totalInCategory: rows?.length || 0 });
    }

    const scores = rows.map((r) => r.overall_score as number);
    const below = scores.filter((s) => s < score).length;
    const percentile = Math.round((below / scores.length) * 100);

    // Build distribution buckets (1-2, 2-3, ..., 9-10)
    const distribution = Array.from({ length: 9 }, (_, i) => {
      const min = i + 1;
      const max = min + 1;
      return {
        range: `${min}-${max}`,
        count: scores.filter((s) => s >= min && s < max).length,
      };
    });

    return NextResponse.json({
      percentile,
      totalInCategory: scores.length,
      category,
      distribution,
    });
  } catch (err) {
    console.error("Benchmark error:", err);
    return NextResponse.json({ error: "Could not fetch benchmark." }, { status: 500 });
  }
}
