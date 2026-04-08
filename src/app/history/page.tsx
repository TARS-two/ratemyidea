import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/server";
import { getBadge } from "@/lib/badges";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const supabase = createAnonClient();
  if (!supabase) redirect("/");

  // Verify session
  const { data: { user } } = await supabase.auth.getUser(token || "");
  if (!user) redirect("/?auth=required");

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("id, idea_name, idea_text, overall_score, category, badge, lang, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen grid-bg">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--midnight)]/80 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <span className="font-bold text-lg tracking-tight">RateMyIdea</span>
          </a>
          <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            ← Back
          </a>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold mb-2">Your Ideas</h1>
          <p className="text-[var(--text-muted)] mb-8">
            {evaluations?.length || 0} idea{evaluations?.length !== 1 ? "s" : ""} evaluated
          </p>

          {!evaluations || evaluations.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <p className="text-4xl mb-4">💭</p>
              <p className="text-lg">No ideas yet.</p>
              <a href="/" className="mt-4 inline-block text-[var(--electric)] hover:underline">
                Rate your first idea →
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {evaluations.map((ev) => {
                const badge = getBadge(ev.overall_score || 0);
                const date = new Date(ev.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <div
                    key={ev.id}
                    className="bg-[var(--surface)] border border-white/10 rounded-xl p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: badge.color, backgroundColor: badge.bg }}
                        >
                          {badge.emoji} {badge.label}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">{ev.category}</span>
                      </div>
                      <p className="font-medium text-[var(--text-primary)] truncate">
                        {ev.idea_name || ev.idea_text.slice(0, 60)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-2xl font-bold"
                        style={{ color: badge.color }}
                      >
                        {(ev.overall_score || 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">/ 10</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
