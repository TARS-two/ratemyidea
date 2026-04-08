"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { Lang, t } from "./i18n";
import AuthModal from "@/components/AuthModal";
import BenchmarkChart from "@/components/BenchmarkChart";

/* ---------- types ---------- */
interface Source {
  title: string;
  url: string;
  domain: string;
}

interface Badge {
  label: string;
  emoji: string;
  color: string;
  bg: string;
}

interface ScoreResult {
  ideaName: string;
  keywords: string[];
  overall: number;
  category: string;
  badge: Badge;
  categories: {
    name: string;
    score: number;
    emoji: string;
    comment: string;
  }[];
  summary: string;
  strengths: string[];
  risks: string[];
  nextSteps: string[];
  sources: Source[];
}

interface BenchmarkData {
  percentile: number;
  totalInCategory: number;
  category: string;
  distribution: { range: string; count: number }[];
  insufficient?: boolean;
}

interface UserSession {
  token: string;
  email: string;
  isPro: boolean;
}

/* ---------- score ring ---------- */
function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 10) * circumference;
  const color =
    score >= 7.5
      ? "var(--accent-green)"
      : score >= 5
        ? "var(--accent-yellow)"
        : "var(--accent-red)";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="var(--surface-light)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="animate-score-fill"
          style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-[var(--text-muted)]">/ 10</span>
      </div>
    </div>
  );
}

/* ---------- category bar ---------- */
function CategoryBar({
  category,
  delay,
}: {
  category: ScoreResult["categories"][0];
  delay: number;
}) {
  const pct = (category.score / 10) * 100;
  const color =
    category.score >= 7.5
      ? "bg-green-500"
      : category.score >= 5
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div
      className="animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {category.emoji} {category.name}
        </span>
        <span className="text-sm font-mono text-[var(--text-secondary)]">
          {category.score.toFixed(1)}
        </span>
      </div>
      <div className="h-2 bg-[var(--surface-light)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {category.comment}
      </p>
    </div>
  );
}

/* ---------- main page ---------- */
export default function HomeClient() {
  const [lang, setLang] = useState<Lang>("en");
  const [idea, setIdea] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);
  const [hideIdea, setHideIdea] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"limit" | "upgrade" | "default">("default");
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [strategicPlan, setStrategicPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const s = t[lang];

  // Load lang + session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "es") setLang(saved);
    const savedSession = localStorage.getItem("rmi_session");
    if (savedSession) {
      try { setUserSession(JSON.parse(savedSession)); } catch { /* ignore */ }
    }
  }, []);

  function toggleLang() {
    const next = lang === "en" ? "es" : "en";
    setLang(next);
    localStorage.setItem("lang", next);
  }

  function handleAuthSuccess(token: string, authEmail: string) {
    const session: UserSession = { token, email: authEmail, isPro: false };
    setUserSession(session);
    localStorage.setItem("rmi_session", JSON.stringify(session));
    setShowAuthModal(false);
  }

  function handleSignOut() {
    setUserSession(null);
    localStorage.removeItem("rmi_session");
  }

  async function fetchBenchmark(score: number, category: string) {
    try {
      const res = await fetch(`/api/benchmark?score=${score}&category=${encodeURIComponent(category)}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.insufficient) setBenchmark(data);
      }
    } catch { /* non-critical */ }
  }

  async function handleGeneratePlan() {
    if (!userSession) {
      setAuthModalMode("upgrade");
      setShowAuthModal(true);
      return;
    }
    if (!result) return;
    setPlanLoading(true);
    try {
      const res = await fetch("/api/strategic-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaText: idea.trim(),
          ideaName: result.ideaName,
          lang,
          authToken: userSession.token,
        }),
      });
      const data = await res.json();
      if (data.plan) setStrategicPlan(data.plan);
      else setError(data.error || "Could not generate plan.");
    } catch {
      setError("Could not generate plan. Try again.");
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);
    setBenchmark(null);
    setStrategicPlan(null);

    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          email: email.trim() || undefined,
          lang,
          authToken: userSession?.token,
        }),
      });

      if (res.status === 429) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === "limit_reached") {
          setAuthModalMode("limit");
          setShowAuthModal(true);
        } else {
          setError(errData.message || "Too many requests. Try again later.");
        }
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Something went wrong. Try again.");
      }

      const data = await res.json();
      setResult(data);

      // Fetch benchmark
      if (data.category) fetchBenchmark(data.overall, data.category);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function getOgImageUrl() {
    if (!result) return "/api/og";
    const params = new URLSearchParams({ score: result.overall.toFixed(1) });
    if (result.keywords?.length) params.set("keywords", result.keywords.join(","));
    if (hideIdea) {
      params.set("hidden", "1");
    } else if (result.ideaName) {
      params.set("name", result.ideaName);
    }
    return `/api/og?${params.toString()}`;
  }

  function getShareCardUrl() {
    if (!result) return "/api/share-card";
    const params = new URLSearchParams({ score: result.overall.toFixed(1) });
    if (result.keywords?.length) params.set("keywords", result.keywords.join(","));
    if (hideIdea) {
      params.set("hidden", "1");
    } else if (result.ideaName) {
      params.set("name", result.ideaName);
    }
    return `/api/share-card?${params.toString()}`;
  }

  function getShareText() {
    if (!result) return "";
    const scoreStr = result.overall.toFixed(1);
    return lang === "es"
      ? `Acabo de evaluar mi idea de negocio y obtuve ${scoreStr}/10 🧠\n\nEvalúa la tuya gratis → ratemyidea.ai`
      : `I just rated my business idea and got ${scoreStr}/10 🧠\n\nRate yours free → ratemyidea.ai`;
  }

  async function handleDownloadImage() {
    try {
      const res = await fetch(getShareCardUrl());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ratemyidea-${result?.overall.toFixed(1) || "score"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(getShareCardUrl(), "_blank");
    }
  }

  async function getShareImage(): Promise<File | null> {
    try {
      const res = await fetch(getShareCardUrl());
      const blob = await res.blob();
      return new File([blob], "ratemyidea.png", { type: "image/png" });
    } catch {
      return null;
    }
  }

  async function handleShareWithImage(target?: "whatsapp" | "twitter" | "linkedin") {
    const file = await getShareImage();
    const text = getShareText();
    
    // Try native share with image (works great on mobile)
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          text,
          files: [file],
        });
        return;
      } catch {
        // User cancelled or error — fall through to platform-specific
      }
    }

    // Fallback to platform-specific (text only, but better than nothing)
    const encodedText = encodeURIComponent(text);
    switch (target) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodedText}`, "_blank");
        break;
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, "_blank");
        break;
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://ratemyidea.ai")}`, "_blank");
        break;
      default:
        navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
    }
  }

  function handleCopyText() {
    navigator.clipboard.writeText(getShareText());
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  function handleReset() {
    setResult(null);
    setIdea("");
    setEmail("");
    setError("");
    setHideIdea(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen grid-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--midnight)]/80 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <span className="font-bold text-lg tracking-tight">
              {s.brand}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <span className={lang === "en" ? "text-[var(--text-primary)]" : ""}>EN</span>
              <span className="mx-1 text-[var(--text-muted)]">|</span>
              <span className={lang === "es" ? "text-[var(--text-primary)]" : ""}>ES</span>
            </button>

            {userSession ? (
              <div className="flex items-center gap-2">
                {userSession.isPro && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--electric)]/20 text-[var(--electric-light)]">Pro</span>
                )}
                <a href="/history" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors hidden sm:block">
                  History
                </a>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {userSession.email.split("@")[0]}
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthModalMode("default"); setShowAuthModal(true); }}
                className="text-xs font-medium px-3 py-1.5 bg-[var(--surface)] border border-white/10 rounded-lg text-[var(--text-secondary)] hover:border-[var(--electric)]/50 transition-all cursor-pointer"
              >
                {lang === "es" ? "Iniciar sesión" : "Sign in"}
              </button>
            )}

            <a
              href="https://ai-norte.com"
              className="items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--electric-light)] transition-colors hidden sm:flex"
              target="_blank" rel="noopener"
            >
              <span>by</span>
              <img src="/ainorte-logo.svg" alt="AI Norte" className="h-4 w-4" />
              <span className="text-[var(--electric-light)]">AI Norte</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero + Form */}
      <main className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-2xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              {s.heroTitle1}
              <span className="gradient-text">{s.heroTitle2}</span>
            </h1>
            <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-lg mx-auto">
              {s.heroSubtitle}
            </p>
          </div>

          {/* Form */}
          {!result && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="idea"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
                >
                  {s.labelIdea}
                </label>
                <textarea
                  id="idea"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder={s.placeholderIdea}
                  rows={4}
                  maxLength={1000}
                  required
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-white/10 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--electric)] focus:border-transparent resize-none transition-all"
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-[var(--text-muted)]">
                    {s.hintDetail}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {idea.length}/1000
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
                >
                  {s.labelEmail}{" "}
                  <span className="text-[var(--text-muted)]">{s.labelEmailHint}</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={s.placeholderEmail}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-white/10 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--electric)] focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !idea.trim()}
                className="w-full py-4 bg-[var(--electric)] hover:bg-[var(--electric-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all cursor-pointer text-lg glow-pulse"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    {s.analyzing}
                  </span>
                ) : (
                  s.submitButton
                )}
              </button>
            </form>
          )}

          {/* Results */}
          {result && (
            <div ref={resultRef} className="space-y-8 animate-fade-up">
              {/* Overall Score */}
              <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-8 text-center">
                <p className="text-sm text-[var(--text-muted)] uppercase tracking-wider mb-4">
                  {s.yourScore}
                </p>
                {result.badge && (
                  <div className="flex justify-center mb-4">
                    <span
                      className="text-sm font-bold px-4 py-1.5 rounded-full"
                      style={{ color: result.badge.color, backgroundColor: result.badge.bg, border: `1px solid ${result.badge.color}40` }}
                    >
                      {result.badge.emoji} {result.badge.label}
                    </span>
                  </div>
                )}
                <ScoreRing score={result.overall} />
                <p className="mt-4 text-[var(--text-secondary)] max-w-md mx-auto">
                  {result.summary}
                </p>
              </div>

              {/* Category Breakdown */}
              <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6 space-y-5">
                <h3 className="font-semibold text-lg">{s.breakdown}</h3>
                {result.categories.map((cat, i) => (
                  <CategoryBar key={cat.name} category={cat} delay={i * 100} />
                ))}
              </div>

              {/* Strengths & Risks */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold text-green-400 mb-3">
                    💪 {s.strengths}
                  </h3>
                  <ul className="space-y-2">
                    {result.strengths.map((str, i) => (
                      <li
                        key={i}
                        className="text-sm text-[var(--text-secondary)] flex gap-2"
                      >
                        <span className="text-green-500 shrink-0">✓</span>
                        {str}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold text-red-400 mb-3">
                    ⚠️ {s.risks}
                  </h3>
                  <ul className="space-y-2">
                    {result.risks.map((r, i) => (
                      <li
                        key={i}
                        className="text-sm text-[var(--text-secondary)] flex gap-2"
                      >
                        <span className="text-red-500 shrink-0">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold text-[var(--electric-light)] mb-3">
                  🚀 {s.nextSteps}
                </h3>
                <ol className="space-y-2">
                  {result.nextSteps.map((step, i) => (
                    <li
                      key={i}
                      className="text-sm text-[var(--text-secondary)] flex gap-3"
                    >
                      <span className="text-[var(--electric)] font-mono font-bold shrink-0">
                        {i + 1}.
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Sources */}
              {result.sources && result.sources.length > 0 && (
                <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold text-[var(--text-secondary)] mb-3">
                    📚 {s.sources}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-light)] border border-white/5 rounded-full text-xs text-[var(--text-secondary)] hover:border-[var(--electric)]/40 hover:text-[var(--electric-light)] transition-all"
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=16`}
                          alt=""
                          className="w-3.5 h-3.5 rounded-sm"
                        />
                        <span className="font-medium">{source.domain}</span>
                        <span className="text-[var(--text-muted)] max-w-[180px] truncate hidden sm:inline">
                          — {source.title}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Benchmark */}
              {benchmark && (
                <BenchmarkChart data={benchmark} userScore={result.overall} lang={lang} />
              )}

              {/* Strategic Plan */}
              {strategicPlan ? (
                <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold text-[var(--electric-light)] mb-3">
                    🗓️ {lang === "es" ? "Plan estratégico 30 días" : "30-Day Strategic Plan"}
                  </h3>
                  <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {strategicPlan}
                  </div>
                </div>
              ) : userSession?.isPro ? (
                <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6 text-center">
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    {lang === "es" ? "Genera un plan de acción de 30 días para esta idea" : "Generate a 30-day action plan for this idea"}
                  </p>
                  <button
                    onClick={handleGeneratePlan}
                    disabled={planLoading}
                    className="px-6 py-2.5 bg-[var(--electric)] hover:bg-[var(--electric-dark)] disabled:opacity-50 text-white font-medium rounded-xl transition-all cursor-pointer text-sm"
                  >
                    {planLoading ? "Generating..." : (lang === "es" ? "🗓️ Generar plan 30 días" : "🗓️ Generate 30-day plan")}
                  </button>
                </div>
              ) : null}

              {/* Pro CTA for free users */}
              {!userSession?.isPro && (
                <div className="bg-[var(--surface)] border border-[var(--electric)]/20 rounded-2xl p-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚡</span>
                    <div className="flex-1">
                      <h3 className="font-bold mb-1">
                        {lang === "es" ? "Upgrade a Pro — $9/mes" : "Upgrade to Pro — $9/mo"}
                      </h3>
                      <ul className="text-sm text-[var(--text-muted)] space-y-1 mb-4">
                        <li>✓ {lang === "es" ? "Evaluaciones ilimitadas" : "Unlimited evaluations"}</li>
                        <li>✓ {lang === "es" ? "Historial de ideas" : "Idea history"}</li>
                        <li>✓ {lang === "es" ? "5 planes estratégicos 30 días/mes" : "5 strategic plans/month"}</li>
                        <li>✓ {lang === "es" ? "Benchmark vs otras ideas" : "Benchmark vs other ideas"}</li>
                      </ul>
                      <button
                        onClick={async () => {
                          const res = await fetch("/api/stripe/subscribe", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: userSession?.email || email }),
                          });
                          const data = await res.json();
                          if (data.url) window.location.href = data.url;
                        }}
                        className="px-5 py-2.5 bg-[var(--electric)] hover:bg-[var(--electric-dark)] text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
                      >
                        {lang === "es" ? "Activar Pro" : "Get Pro"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Upsell — Market Study */}
              <div className="bg-gradient-to-r from-[var(--electric)]/20 to-purple-500/20 border border-[var(--electric)]/30 rounded-2xl p-6 text-center">
                <h3 className="font-bold text-lg mb-2">
                  {s.upsellTitle}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  {s.upsellDesc}
                </p>
                <button
                  disabled={checkoutLoading}
                  onClick={async () => {
                    setCheckoutLoading(true);
                    setError("");
                    try {
                      const res = await fetch("/api/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          idea: idea.trim(),
                          lang,
                          email: email.trim() || undefined,
                          freeResult: result ? { overall: result.overall, ideaName: result.ideaName } : undefined,
                        }),
                      });
                      const data = await res.json();
                      if (data.url) {
                        window.location.href = data.url;
                      } else {
                        setError(data.error || "Checkout failed. Please try again.");
                        setCheckoutLoading(false);
                      }
                    } catch {
                      setError("Could not start checkout. Please try again.");
                      setCheckoutLoading(false);
                    }
                  }}
                  className="px-8 py-4 bg-[var(--electric)] hover:bg-[var(--electric-dark)] disabled:opacity-60 text-white font-semibold rounded-xl transition-all cursor-pointer glow-pulse text-lg"
                >
                  {checkoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Redirecting to checkout...
                    </span>
                  ) : (
                    s.upsellButton
                  )}
                </button>
              </div>

              {/* Share + Try Again */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex-1 py-3 bg-[var(--surface)] border border-white/10 rounded-xl text-[var(--text-primary)] font-medium hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  📤 {s.shareScore}
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-[var(--surface)] border border-white/10 rounded-xl text-[var(--text-primary)] font-medium hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  🔄 {s.rateAnother}
                </button>
              </div>
            </div>
          )}

          {/* Social proof / stats */}
          {!result && (
            <div className="mt-16 grid grid-cols-3 gap-4 text-center">
              {[
                { num: s.statFree, label: s.statFreeLabel },
                { num: s.statSpeed, label: s.statSpeedLabel },
                { num: s.statAI, label: s.statAILabel },
              ].map((stat, i) => (
                <div key={i} className="p-4">
                  <p className="text-2xl font-bold gradient-text">{stat.num}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          mode={authModalMode}
          lang={lang}
        />
      )}

      {/* Share Modal */}
      {showShareModal && result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareModal(false);
          }}
        >
          <div className="bg-[var(--surface)] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="font-semibold text-lg">{s.shareScore}</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Share card preview — square, fills modal */}
            <div className="px-3 pb-4">
              <div className="rounded-2xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={hideIdea ? "hidden" : "visible"}
                  src={getShareCardUrl()}
                  alt="Share card preview"
                  width={1080}
                  height={1080}
                  className="w-full h-auto block"
                />
              </div>
            </div>

            {/* Hide idea toggle */}
            <div className="px-5 pb-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={hideIdea}
                    onChange={(e) => setHideIdea(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--surface-light)] border border-white/10 rounded-full peer-checked:bg-[var(--electric)] transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--electric-light)] transition-colors">
                  🔒 {s.hideIdea}
                </span>
              </label>
            </div>

            {/* Share + Save buttons */}
            <div className="px-4 pb-3 space-y-2">
              {/* Main share button with social logos */}
              <button
                onClick={() => handleShareWithImage()}
                className="w-full py-4 bg-[var(--electric)] hover:bg-[var(--electric-dark)] text-white font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-3 text-base"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {lang === "es" ? "Compartir imagen" : "Share image"}
                <span className="flex items-center gap-2 ml-1 opacity-70">
                  {/* X */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  {/* WhatsApp */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  {/* LinkedIn */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </span>
              </button>

              {/* Secondary row: Save + Copy */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadImage}
                  className="flex items-center justify-center gap-2 py-3 bg-[var(--surface-light)] border border-white/10 rounded-xl hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" /></svg>
                  <span className="text-sm text-[var(--text-secondary)]">{lang === "es" ? "Guardar" : "Save"}</span>
                </button>
                <button
                  onClick={handleCopyText}
                  className="flex items-center justify-center gap-2 py-3 bg-[var(--surface-light)] border border-white/10 rounded-xl hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  {shared ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  )}
                  <span className="text-sm text-[var(--text-secondary)]">{shared ? "✓" : (lang === "es" ? "Copiar texto" : "Copy text")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
          <a
            href="https://ai-norte.com"
            className="flex items-center gap-1.5 hover:text-[var(--electric-light)] transition-colors"
            target="_blank"
            rel="noopener"
          >
            <span>{s.footerCopy}</span>
            <img src="/ainorte-logo.svg" alt="AI Norte" className="h-4 w-4" />
            <span className="text-[var(--electric-light)]">AI Norte</span>
          </a>
          <span>{s.footerTagline}</span>
        </div>
      </footer>
    </div>
  );
}
