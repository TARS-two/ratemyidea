"use client";

interface BenchmarkData {
  percentile: number;
  topPercent?: number;
  totalInCategory: number;
  category: string;
  distribution: { range: string; count: number }[];
  subscoreAverages?: { name: string; average: number | null }[];
  strongerThanSimilar?: string[];
  weakerThanSimilar?: string[];
  improvementLevers?: string[];
  disclaimer?: string;
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
  const userBucket = Math.min(Math.max(Math.floor(userScore) - 1, 0), 8);
  const topPercent = data.topPercent ?? Math.max(1, 100 - data.percentile);

  const label =
    lang === "es"
      ? `Tu idea está en el top ${topPercent}% de ideas en ${data.category}`
      : `Your idea ranks in the top ${topPercent}% of evaluated ${data.category} ideas`;

  const sub =
    lang === "es"
      ? `Comparado con ${data.totalInCategory} ideas evaluadas`
      : `Compared to ${data.totalInCategory} evaluated ideas`;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-lg mb-1">📊 {lang === "es" ? "Benchmark Pro" : "Pro benchmark"}</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-1">{label}</p>
          <p className="text-xs text-[var(--text-muted)]">{sub}</p>
        </div>
        {/* Percentile badge */}
        <div className="w-fit rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-center">
          <p className="text-2xl font-black text-amber-100">Top {topPercent}%</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80">Percentile</p>
        </div>
      </div>

      {/* Distribution histogram */}
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

      {/* sub-score comparison */}
      {data.subscoreAverages && data.subscoreAverages.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/10 bg-[var(--surface)]/60 p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            {lang === "es" ? "Comparación por sub-score" : "Sub-score comparison"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.subscoreAverages.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-3 py-2 text-xs">
                <span className="text-[var(--text-secondary)]">{item.name}</span>
                <span className="font-mono text-[var(--text-primary)]">{item.average?.toFixed(1) ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-green-400/15 bg-green-400/5 p-4">
          <p className="mb-2 text-sm font-semibold text-green-300">{lang === "es" ? "Más fuerte que similares" : "Stronger than similar ideas"}</p>
          <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
            {(data.strongerThanSimilar?.length ? data.strongerThanSimilar : [lang === "es" ? "Aún sin suficiente muestra" : "Not enough sample depth yet"]).map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-200">{lang === "es" ? "Más débil que similares" : "Weaker than similar ideas"}</p>
          <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
            {(data.weakerThanSimilar?.length ? data.weakerThanSimilar : [lang === "es" ? "Sin debilidad clara por muestra" : "No clear weakness from current sample"]).map((item) => (
              <li key={item}>⚠ {item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* improvement levers */}
      {data.improvementLevers && data.improvementLevers.length > 0 && (
        <div className="mt-4 rounded-xl border border-[var(--electric)]/20 bg-[var(--electric)]/5 p-4">
          <p className="mb-2 text-sm font-semibold text-[var(--electric-light)]">
            {lang === "es" ? "Qué mejoraría tu posición" : "What would improve your benchmark position"}
          </p>
          <ol className="space-y-1 text-xs text-[var(--text-secondary)]">
            {data.improvementLevers.map((lever, index) => (
              <li key={lever}>{index + 1}. {lever}</li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--text-muted)]">
        {lang === "es"
          ? "Este benchmark es direccional, no un ranking científico. Compara tu idea contra la muestra actual de ideas evaluadas."
          : (data.disclaimer ?? "This benchmark is directional, not a scientific ranking. It compares your idea against the current sample of evaluated ideas.")}
      </p>
    </div>
  );
}
