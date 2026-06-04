import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EvaluationRow = {
  overall_score: number | null;
  result_json?: {
    categories?: Array<{ name?: string; score?: number }>;
  } | null;
};

type UserSubscore = { name?: string; score?: number };

function parseUserSubscores(value: string | null): UserSubscore[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const BENCHMARK_DIMENSIONS = [
  "Market Demand",
  "Competition",
  "Revenue Potential",
  "Feasibility",
  "Scalability",
  "Differentiation",
];

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function getSubscore(row: EvaluationRow, name: string): number | null {
  const score = row.result_json?.categories?.find((category) => category.name === name)?.score;
  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

function getUserSubscore(subscores: UserSubscore[], name: string): number | null {
  const score = subscores.find((category) => category.name === name)?.score;
  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const score = parseFloat(searchParams.get("score") || "0");
    const category = searchParams.get("category") || "Consumer";
    const userSubscores = parseUserSubscores(searchParams.get("subscores"));

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    const { data: rows } = await supabase
      .from("evaluations")
      .select("overall_score, result_json")
      .eq("category", category)
      .not("overall_score", "is", null);

    if (!rows || rows.length < 5) {
      return NextResponse.json({ insufficient: true, totalInCategory: rows?.length || 0 });
    }

    const benchmarkRows = rows as EvaluationRow[];
    const scores = benchmarkRows.map((r) => Number(r.overall_score)).filter(Number.isFinite);
    const below = scores.filter((s) => s < score).length;
    const percentile = Math.round((below / scores.length) * 100);
    const topPercent = Math.max(1, 100 - percentile);

    // Build distribution buckets (1-2, 2-3, ..., 9-10)
    const distribution = Array.from({ length: 9 }, (_, i) => {
      const min = i + 1;
      const max = min + 1;
      return {
        range: `${min}-${max}`,
        count: scores.filter((s) => s >= min && s < max).length,
      };
    });

    const subscoreAverages = BENCHMARK_DIMENSIONS.map((name) => ({
      name,
      average: average(benchmarkRows.map((row) => getSubscore(row, name)).filter((value): value is number => value !== null)),
      userScore: getUserSubscore(userSubscores, name),
    }));
    const availableSubscores = subscoreAverages.filter((item) => item.average !== null && item.userScore !== null) as Array<{ name: string; average: number; userScore: number }>;
    const subscoreComparisons = availableSubscores.map((item) => ({
      ...item,
      difference: Math.round((item.userScore - item.average) * 10) / 10,
    }));
    const strongerThanSimilar = subscoreComparisons
      .filter((item) => item.difference >= 0)
      .sort((a, b) => b.difference - a.difference)
      .slice(0, 2)
      .map((item) => item.name);
    const weakerThanSimilar = subscoreComparisons
      .filter((item) => item.difference < 0)
      .sort((a, b) => a.difference - b.difference)
      .slice(0, 2)
      .map((item) => item.name);
    const improvementLevers = (weakerThanSimilar.length ? weakerThanSimilar : ["target customer", "pricing assumptions", "demand evidence"]).map(
      (name, index) => {
        const fallback = [
          "Define the exact customer segment.",
          "Add pricing and willingness-to-pay assumptions.",
          "Validate demand with 5 target buyers.",
        ];
        if (name === "Market Demand") return "Validate demand with 5 target buyers.";
        if (name === "Competition" || name === "Differentiation") return "Clarify why buyers would choose this over existing alternatives.";
        if (name === "Revenue Potential") return "Add concrete pricing and purchase-frequency assumptions.";
        if (name === "Feasibility") return "Reduce the first version to one deliverable you can test this week.";
        if (name === "Scalability") return "Identify the repeatable acquisition channel before building more features.";
        return fallback[index] ?? fallback[0];
      }
    ).slice(0, 3);

    return NextResponse.json({
      percentile,
      topPercent,
      totalInCategory: scores.length,
      category,
      distribution,
      subscoreAverages,
      strongerThanSimilar,
      weakerThanSimilar,
      improvementLevers,
      disclaimer: "This benchmark is directional, not a scientific ranking. It compares your idea against the current sample of evaluated ideas.",
    });
  } catch (err) {
    console.error("Benchmark error:", err);
    return NextResponse.json({ error: "Could not fetch benchmark." }, { status: 500 });
  }
}
