import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/server";
import { getBadge } from "@/lib/badges";

interface DashboardEvaluation {
  id: string;
  idea_name: string | null;
  idea_text: string;
  overall_score: number | null;
  category: string | null;
  badge: string | null;
  lang: string | null;
  created_at: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTitle(evaluation?: DashboardEvaluation | null) {
  if (!evaluation) return "No idea selected";
  return evaluation.idea_name || evaluation.idea_text.slice(0, 72);
}

function buildBenchmarkBuckets(evaluations: DashboardEvaluation[], selectedEvaluation?: DashboardEvaluation | null) {
  const selectedCategory = selectedEvaluation?.category;
  const comparable = selectedCategory
    ? evaluations.filter((ev) => ev.category === selectedCategory)
    : evaluations;
  const buckets = Array.from({ length: 10 }, (_, index) => ({
    label: `${index + 1}`,
    count: 0,
    active: false,
  }));

  comparable.forEach((ev) => {
    const score = ev.overall_score ?? 0;
    const bucketIndex = Math.min(Math.max(Math.ceil(score) - 1, 0), 9);
    buckets[bucketIndex].count += 1;
  });

  if (selectedEvaluation?.overall_score) {
    const selectedBucket = Math.min(Math.max(Math.ceil(selectedEvaluation.overall_score) - 1, 0), 9);
    buckets[selectedBucket].active = true;
  }

  return buckets;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; evaluation?: string }>;
}) {
  const { token, evaluation } = await searchParams;

  const supabase = createAnonClient();
  if (!supabase) redirect("/");

  const { data: { user } } = await supabase.auth.getUser(token || "");
  if (!user) redirect("/?auth=required");

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("plan, status, strategic_plans_used")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscription?.plan !== "pro" || subscription?.status !== "active") {
    redirect("/?upgrade=required");
  }

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("id, idea_name, idea_text, overall_score, category, badge, lang, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const ideaHistory = (evaluations || []) as DashboardEvaluation[];
  const selectedEvaluation = ideaHistory.find((item) => item.id === evaluation) || ideaHistory[0] || null;
  const selectedBadge = getBadge(selectedEvaluation?.overall_score || 0);
  const benchmarkBuckets = buildBenchmarkBuckets(ideaHistory, selectedEvaluation);
  const maxBucket = Math.max(...benchmarkBuckets.map((bucket) => bucket.count), 1);
  const plansUsed = subscription?.strategic_plans_used || 0;
  const plansLeft = Math.max(5 - plansUsed, 0);
  const maxPlanCounterCopy = "5 next-step plans left this month";

  return (
    <div className="min-h-screen grid-bg">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--midnight)]/80 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <span className="font-bold text-lg tracking-tight">RateMyIdea</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-300/25 to-yellow-500/15 px-3 py-1 text-xs font-bold text-amber-100 shadow-lg shadow-amber-300/20">
              ✨ Pro member
            </span>
            <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              New evaluation
            </a>
          </div>
        </div>
      </nav>

      <main className="px-6 pb-16 pt-28">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[320px_1fr]">
          {/* left sidebar */}
          <aside className="rounded-3xl border border-white/10 bg-[var(--surface)]/80 p-5 shadow-xl shadow-black/10">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Dashboard Pro</p>
                <h1 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Pro ideas</h1>
              </div>
              <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs text-[var(--text-muted)]">
                {ideaHistory.length}
              </span>
            </div>

            {ideaHistory.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center text-sm text-[var(--text-muted)]">
                No saved evaluations yet.
              </div>
            ) : (
              <div className="space-y-2">
                {ideaHistory.map((item) => {
                  const itemBadge = getBadge(item.overall_score || 0);
                  const active = selectedEvaluation?.id === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`/dashboard?token=${encodeURIComponent(token || "")}&evaluation=${encodeURIComponent(item.id)}`}
                      className={`block rounded-2xl border p-4 transition-all ${active
                        ? "border-[var(--electric)]/60 bg-[var(--electric)]/10"
                        : "border-white/10 bg-black/20 hover:border-[var(--electric)]/30"}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {getTitle(item)}
                        </span>
                        <span className="text-sm font-bold" style={{ color: itemBadge.color }}>
                          {(item.overall_score || 0).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                        <span>{item.category || "Idea"}</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="space-y-6">
            <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/10 via-[var(--surface)] to-[var(--electric)]/10 p-6 shadow-2xl shadow-amber-300/10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-200">Selected evaluation</p>
                  <h2 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
                    {getTitle(selectedEvaluation)}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                    {selectedEvaluation?.idea_text || "Run a new evaluation to start building your Pro dashboard."}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-center min-w-36">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Score</p>
                  <p className="mt-1 text-4xl font-bold" style={{ color: selectedBadge.color }}>
                    {(selectedEvaluation?.overall_score || 0).toFixed(1)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">/ 10</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Plan credits</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)]" title={maxPlanCounterCopy}>
                  {plansLeft} next-step plans left this month
                </h3>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Monthly Pro quota resets automatically.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">History</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{ideaHistory.length} saved ideas</h3>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Click any idea in the sidebar to inspect it.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[var(--surface)] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Status</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">✨ Pro member</h3>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Unlimited evaluations enabled.</p>
              </div>
            </div>

            <section className="rounded-3xl border border-amber-300/20 bg-[var(--surface)] p-5 shadow-xl shadow-black/10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Benchmark chart</p>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Category distribution</h3>
                </div>
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                  Pro only
                </span>
              </div>
              <div className="flex h-32 items-end gap-2">
                {benchmarkBuckets.map((bucket) => {
                  const height = (bucket.count / maxBucket) * 100;
                  return (
                    <div key={bucket.label} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t ${bucket.active ? "bg-[var(--electric)]" : "bg-[var(--surface-light)]"}`}
                        style={{ height: `${Math.max(height, 6)}%` }}
                      />
                      <span className="text-[10px] text-[var(--text-muted)]">{bucket.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--electric)]/30 bg-gradient-to-br from-[var(--electric)]/20 via-[var(--surface)] to-amber-300/10 p-6 text-center shadow-xl shadow-[var(--electric)]/10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--electric-light)]">Next move</p>
              <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">Generate 10 next steps</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
                Turn the selected evaluation into a concrete action plan. Full generation stays on the evaluation result for now.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href="/"
                  className="rounded-xl bg-[var(--electric)] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--electric-dark)]"
                >
                  New evaluation
                </a>
                <a
                  href="/"
                  className="rounded-xl border border-white/10 bg-black/20 px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--electric)]/40"
                >
                  Generate 10 next steps
                </a>
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}
