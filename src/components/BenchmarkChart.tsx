"use client";

interface BenchmarkData {
  percentile: number;
  totalInCategory: number;
  category: string;
  distribution: { range: string; count: number }[];
}

export default function BenchmarkChart({
  data,
  userScore,
  lang = "en",
}: {
  data: BenchmarkData;
  userScore: number;
  lang?: string;
}) {
  const max = Math.max(...data.distribution.map((d) => d.count), 1);
  const userBucket = Math.min(Math.floor(userScore) - 1, 8);

  const label =
    lang === "es"
      ? `Tu idea está en el top ${100 - data.percentile}% de ideas en ${data.category}`
      : `Your idea is in the top ${100 - data.percentile}% of ${data.category} ideas`;

  const sub =
    lang === "es"
      ? `Comparado con ${data.totalInCategory} ideas evaluadas`
      : `Compared to ${data.totalInCategory} ideas evaluated`;

  return (
    <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6">
      <h3 className="font-semibold text-lg mb-1">📊 {lang === "es" ? "Benchmark" : "Benchmark"}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="text-xs text-[var(--text-muted)] mb-5">{sub}</p>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-24">
        {data.distribution.map((bucket, i) => {
          const height = max > 0 ? (bucket.count / max) * 100 : 0;
          const isUser = i === userBucket;
          return (
            <div key={bucket.range} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t transition-all duration-700"
                style={{
                  height: `${Math.max(height, 4)}%`,
                  backgroundColor: isUser ? "var(--electric)" : "var(--surface-light)",
                  border: isUser ? "1px solid var(--electric)" : "1px solid transparent",
                }}
              />
              <span className="text-[9px] text-[var(--text-muted)] leading-none">
                {bucket.range}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="w-3 h-3 rounded-sm bg-[var(--electric)]" />
        <span className="text-xs text-[var(--text-muted)]">
          {lang === "es" ? "Tu puntuación" : "Your score"}
        </span>
      </div>
    </div>
  );
}
